import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  WORKFLOW_CASES,
  caseStatusFromStages,
  classifySkillObservation,
  codeReviewOutputSchema,
  isAllowedNotExecuted,
  isWorkflowRunSuccessful,
  repairOutputSchema,
  workflowEvalResultSchema,
} from "../../scripts/evals/skill-workflow-evals";
import {
  blockedResult,
  buildCommonSmokePrompt,
  buildWorkflowCodexArguments,
  captureStageScopeSnapshot,
  changedStageScopeFiles,
  collectCodexEvents,
  commandRan,
  commonSmokeValidationCommand,
  createWorkflowAgentWorkspace,
  deriveNativeFirstAnomaly,
  isCaseBOfficialEvidenceFile,
  parseWorkflowEvalCliArguments,
  redactNativeDeviceSerial,
  summarizeCommonSmokeProbe,
  summarizeSmokeTurnDiagnostics,
  type WorkflowEvalCliOptions,
} from "../../scripts/evals/run-skill-workflow-evals";

const repositoryRoot = resolve(__dirname, "../..");
const scopeFixtureFiles = {
  plan: "docs/plans/case-a-status-plan.md",
  status: "workflow-e2e-fixtures/case-a/status.mjs",
  clean: "src/clean-file.txt",
} as const;

function createScopeWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), "skill-workflow-scope-"));
  execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "ignore" });
  writeFileSync(join(root, ".gitignore"), ".codex/runs/\n.artifacts/\n");
  for (const relativePath of Object.values(scopeFixtureFiles)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, `baseline:${relativePath}\n`);
  }
  execFileSync("git", ["add", "--all"], { cwd: root, stdio: "ignore" });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Workflow Eval Test",
      "-c",
      "user.email=workflow-eval-test@example.invalid",
      "commit",
      "--no-gpg-sign",
      "-m",
      "baseline",
    ],
    { cwd: root, stdio: "ignore" },
  );
  return root;
}

function withScopeWorkspace(run: (root: string) => void): void {
  const root = createScopeWorkspace();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("Workflow E2E Eval repository contract", () => {
  it("creates fresh nested Codex workspaces beside the sanitized Target", () => {
    const parent = mkdtempSync(join(tmpdir(), "workflow-agent-workspace-parent-"));
    const evaluatorRoot = join(parent, "qa-training-store");
    const targetRoot = join(parent, "qa-training-store-target");
    mkdirSync(evaluatorRoot);
    mkdirSync(targetRoot);
    try {
      const first = createWorkflowAgentWorkspace(targetRoot, "workflow-e2e-smoke-");
      const second = createWorkflowAgentWorkspace(targetRoot, "workflow-e2e-case-a-");
      const realParent = realpathSync(parent);

      expect(dirname(realpathSync(evaluatorRoot))).toBe(realParent);
      expect(dirname(realpathSync(targetRoot))).toBe(realParent);
      expect(dirname(realpathSync(first))).toBe(realParent);
      expect(dirname(realpathSync(second))).toBe(realParent);
      expect(first).not.toBe(second);
      expect(realpathSync(first)).not.toBe(realpathSync(targetRoot));
      expect(realpathSync(second)).not.toBe(realpathSync(evaluatorRoot));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("routes each workspace-write Agent context through the shared Target-parent helper", () => {
    const runner = readFileSync(
      resolve(repositoryRoot, "scripts/evals/run-skill-workflow-evals.ts"),
      "utf8",
    );
    expect(runner).toMatch(
      /function createSmokeRepository\(targetRoot: string\): string \{[\s\S]*?createWorkflowAgentWorkspace\(targetRoot, "workflow-e2e-smoke-"\)/u,
    );
    expect(runner).toMatch(
      /function createCaseContext\([\s\S]*?createWorkflowAgentWorkspace\(\s*options\.target_root,[\s\S]*?`workflow-e2e-\$\{caseId\.toLowerCase\(\)\}-`/u,
    );
    expect(runner).toMatch(
      /async function runCaseAArtifactReuse\([\s\S]*?createWorkflowAgentWorkspace\(options\.target_root, "workflow-e2e-artifact-reuse-"\)/u,
    );
    expect(runner).toMatch(
      /async function runCaseB\(options: ResolvedOptions\): Promise<CaseExecutionResult> \{\s*const contextRoot = createWorkflowAgentWorkspace\(options\.target_root, "workflow-e2e-b-"\)/u,
    );
    expect(runner).toContain('path.join(os.tmpdir(), "workflow-e2e-skill-probe-")');
    expect(runner).toContain('path.join(os.tmpdir(), "workflow-e2e-b-baseline-")');
    expect(runner).toContain('path.join(os.tmpdir(), "workflow-e2e-b-independent-")');
  });

  it("reports every required common smoke predicate independently and fails closed", () => {
    const passingTurn = {
      lifecycle: "completed" as const,
      thread_present: true,
      otel_reliable: true,
      schema_valid: true,
      write_observed: true,
      command_execution_observed: true,
    };
    const passingInput = {
      initial: { ...passingTurn },
      resumed_attempted: true,
      resumed: { ...passingTurn },
      same_thread: true,
    };
    expect(summarizeCommonSmokeProbe(passingInput)).toMatchObject({ status: "pass" });

    expect(
      summarizeCommonSmokeProbe({
        ...passingInput,
        initial: { ...passingTurn, command_execution_observed: false },
      }),
    ).toMatchObject({
      status: "fail",
      initial_write_observed: true,
      initial_command_execution_observed: false,
    });
    expect(
      summarizeCommonSmokeProbe({
        ...passingInput,
        initial: { ...passingTurn, write_observed: false },
      }),
    ).toMatchObject({
      status: "fail",
      initial_write_observed: false,
      initial_command_execution_observed: true,
    });

    const failures = [
      { field: "initial_process_completed", initial: { lifecycle: "turn_failed" as const } },
      { field: "resumed_process_completed", resumed: { lifecycle: "turn_failed" as const } },
      { field: "initial_thread_present", initial: { thread_present: false } },
      { field: "same_thread", same_thread: false },
      { field: "initial_otel_reliable", initial: { otel_reliable: false } },
      { field: "resumed_otel_reliable", resumed: { otel_reliable: false } },
      { field: "initial_schema_valid", initial: { schema_valid: false } },
      { field: "resumed_schema_valid", resumed: { schema_valid: false } },
      { field: "initial_write_observed", initial: { write_observed: false } },
      { field: "resumed_write_observed", resumed: { write_observed: false } },
      {
        field: "initial_command_execution_observed",
        initial: { command_execution_observed: false },
      },
      {
        field: "resumed_command_execution_observed",
        resumed: { command_execution_observed: false },
      },
    ] as const;
    for (const failure of failures) {
      const input = {
        initial: { ...passingInput.initial, ...("initial" in failure ? failure.initial : {}) },
        resumed_attempted: true,
        resumed: { ...passingInput.resumed, ...("resumed" in failure ? failure.resumed : {}) },
        same_thread: "same_thread" in failure ? failure.same_thread : true,
      };
      const result = summarizeCommonSmokeProbe(input);
      expect(result.status).toBe("fail");
      expect(result[failure.field]).toBe(false);
    }

    const missingThread = summarizeCommonSmokeProbe({
      initial: { ...passingTurn, thread_present: false },
      resumed_attempted: false,
      resumed: null,
      same_thread: false,
    });
    expect(missingThread).toMatchObject({
      status: "fail",
      initial_thread_present: false,
      resumed_attempted: false,
      resumed_lifecycle: "not_attempted",
      same_thread: false,
      resumed_process_completed: false,
      resumed_otel_reliable: false,
      resumed_schema_valid: false,
      resumed_write_observed: false,
      resumed_command_execution_observed: false,
    });
  });

  it("preserves common smoke diagnostics in a schema-valid blocked result", () => {
    const options: WorkflowEvalCliOptions = {
      target_root: "target",
      source_revision_git_sha: "a".repeat(40),
      routing_source_git_sha: "b".repeat(40),
      model: "gpt-5.6-luna",
      output: ".codex/runs/result.json",
    };
    const smokeProbe = {
      ...summarizeCommonSmokeProbe({
        initial: {
          lifecycle: "completed",
          thread_present: true,
          otel_reliable: true,
          schema_valid: true,
          write_observed: false,
          command_execution_observed: true,
        },
        resumed_attempted: true,
        resumed: {
          lifecycle: "completed",
          thread_present: true,
          otel_reliable: true,
          schema_valid: true,
          write_observed: true,
          command_execution_observed: true,
        },
        same_thread: true,
      }),
      diagnostics: {
        initial: { command_execution_count: 1, event_types: ["command_execution"] },
        resumed: { command_execution_count: 0, event_types: ["agent_message"] },
        probe_exception_reason: "resume error at <SMOKE_ROOT>",
      },
    };
    const result = workflowEvalResultSchema.parse(
      blockedResult(
        options,
        repositoryRoot,
        "installed Codex smoke probe did not prove actual write, resume, OTel, schema, and command_execution",
        "codex-cli 0.155.1",
        smokeProbe,
      ),
    );
    expect(result).toMatchObject({
      schema_version: 1,
      run_status: "blocked",
      cases: [],
      smoke_probe: {
        status: "fail",
        initial_write_observed: false,
        resumed_write_observed: true,
        diagnostics: {
          initial: { command_execution_count: 1, event_types: ["command_execution"] },
          resumed: { command_execution_count: 0, event_types: ["agent_message"] },
          probe_exception_reason: "resume error at <SMOKE_ROOT>",
        },
      },
    });
  });

  it("separates file-editing writes from the fixed read-only smoke command", () => {
    expect(commonSmokeValidationCommand()).toBe("git status --short");
    const initialPrompt = buildCommonSmokePrompt("initial");
    const resumedPrompt = buildCommonSmokePrompt("resumed");
    expect(initialPrompt).toContain("Use the file-editing tool, not a shell command");
    expect(initialPrompt).toContain("append exactly this line");
    expect(initialPrompt).toContain("Do not use a shell command to edit `smoke.txt`");
    expect(initialPrompt).toContain("Preserve all existing contents of `smoke.txt`");
    expect(initialPrompt).toContain("initial-write");
    expect(initialPrompt).toContain(commonSmokeValidationCommand());
    expect(initialPrompt.split(commonSmokeValidationCommand())).toHaveLength(2);
    expect(initialPrompt).toContain('{"status":"initial-write"}');
    expect(initialPrompt).not.toMatch(/node -e|appendFileSync/u);
    expect(resumedPrompt).toContain("Use the file-editing tool, not a shell command");
    expect(resumedPrompt).toContain("append exactly this line");
    expect(resumedPrompt).toContain("Do not use a shell command to edit `smoke.txt`");
    expect(resumedPrompt).toContain("Preserve all existing contents of `smoke.txt`");
    expect(resumedPrompt).toContain("resumed-write");
    expect(resumedPrompt).toContain(commonSmokeValidationCommand());
    expect(resumedPrompt.split(commonSmokeValidationCommand())).toHaveLength(2);
    expect(resumedPrompt).toContain('{"status":"resumed-write"}');
    expect(resumedPrompt).not.toMatch(/node -e|appendFileSync/u);
  });

  it("requires the expected common smoke command to exit successfully", () => {
    const validationCommand = commonSmokeValidationCommand();
    const execution = (commands: readonly { command: string; exit_code: number | null }[]) => ({
      command_executions: commands.map((command) => ({
        ...command,
        status: "completed",
        output: "",
      })),
    });

    expect(commandRan(execution([]), validationCommand, 0)).toBe(false);
    expect(
      commandRan(execution([{ command: "git status", exit_code: 0 }]), validationCommand, 0),
    ).toBe(false);
    expect(
      commandRan(execution([{ command: validationCommand, exit_code: 1 }]), validationCommand, 0),
    ).toBe(false);
    expect(
      commandRan(execution([{ command: validationCommand, exit_code: 0 }]), validationCommand, 0),
    ).toBe(true);
  });

  it("captures bounded smoke diagnostics and recursive JSONL event types", () => {
    const smokeRoot = join(tmpdir(), "workflow-e2e-smoke-diagnostic-fixture");
    const events = collectCodexEvents(
      [
        JSON.stringify({ type: "turn.completed", item: { type: "file_change" } }),
        JSON.stringify({
          type: "item.completed",
          event: {
            type: "command_execution",
            command: commonSmokeValidationCommand(),
            exit_code: 0,
            status: "completed",
            aggregated_output: `wrote ${smokeRoot}`,
          },
        }),
      ].join("\n"),
    );
    expect(events.eventTypes).toEqual([
      "command_execution",
      "file_change",
      "item.completed",
      "turn.completed",
    ]);

    const longFinalText = `{"status":"initial-write"} ${smokeRoot} ${"f".repeat(1_000)}`;
    const syntheticExecution = {
      exit_code: 0,
      trusted_terminal: "turn.completed" as const,
      final_text: longFinalText,
      stderr: `diagnostic ${smokeRoot} ${"e".repeat(1_000)}`,
      event_types: events.eventTypes,
      command_executions: Array.from({ length: 6 }, (_, index) => ({
        command: `${commonSmokeValidationCommand()} # ${index} ${smokeRoot}`,
        exit_code: 0,
        status: "completed",
        output: `wrote ${smokeRoot} ${"o".repeat(1_000)}`,
      })),
      stdout: "raw stdout must not be copied to the result",
    };
    const diagnostics = summarizeSmokeTurnDiagnostics(syntheticExecution, {
      root: smokeRoot,
      lastMessageFilePresent: true,
    });
    const serialized = JSON.stringify(diagnostics);
    expect(diagnostics).toMatchObject({
      exit_code: 0,
      trusted_terminal: "turn.completed",
      final_text_present: true,
      final_text_length: longFinalText.length,
      last_message_file_present: true,
      command_execution_count: 6,
      event_types: events.eventTypes,
      file_change_event_observed: true,
      stderr_present: true,
    });
    expect((diagnostics.stderr_preview as string).length).toBeLessThanOrEqual(800);
    expect((diagnostics.final_text_preview as string).length).toBeLessThanOrEqual(800);
    expect(diagnostics.stderr_preview).toContain("<SMOKE_ROOT>");
    expect(diagnostics.final_text_preview).toContain("<SMOKE_ROOT>");
    expect(diagnostics.command_execution_summary).toHaveLength(5);
    expect(diagnostics.command_execution_summary).toContainEqual(
      expect.objectContaining({ command: expect.stringContaining("<SMOKE_ROOT>") }),
    );
    expect(serialized).not.toContain(smokeRoot);
    expect(serialized).not.toContain("raw stdout must not be copied");
  });

  it("excludes a pre-existing dirty file that remains unchanged during a stage", () => {
    withScopeWorkspace((root) => {
      writeFileSync(join(root, scopeFixtureFiles.plan), "plan was dirty before the turn\n");
      const before = captureStageScopeSnapshot(root);
      const after = captureStageScopeSnapshot(root);
      expect(changedStageScopeFiles(before, after)).toEqual([]);
    });
  });

  it("reports only status.mjs for a Case A implementation turn with a dirty Plan", () => {
    withScopeWorkspace((root) => {
      writeFileSync(join(root, scopeFixtureFiles.plan), "Plan turn output\n");
      const before = captureStageScopeSnapshot(root);
      writeFileSync(join(root, scopeFixtureFiles.status), "implementation turn output\n");
      const after = captureStageScopeSnapshot(root);
      expect(changedStageScopeFiles(before, after)).toEqual([scopeFixtureFiles.status]);
    });
  });

  it("detects a further edit to a file that was already dirty at stage start", () => {
    withScopeWorkspace((root) => {
      writeFileSync(join(root, scopeFixtureFiles.status), "first edit\n");
      const before = captureStageScopeSnapshot(root);
      writeFileSync(join(root, scopeFixtureFiles.status), "second edit\n");
      const after = captureStageScopeSnapshot(root);
      expect(changedStageScopeFiles(before, after)).toEqual([scopeFixtureFiles.status]);
    });
  });

  it("detects a clean tracked file changed during a stage", () => {
    withScopeWorkspace((root) => {
      const before = captureStageScopeSnapshot(root);
      writeFileSync(join(root, scopeFixtureFiles.clean), "changed during turn\n");
      const after = captureStageScopeSnapshot(root);
      expect(changedStageScopeFiles(before, after)).toEqual([scopeFixtureFiles.clean]);
    });
  });

  it("detects new and pre-existing untracked files changed during a stage", () => {
    withScopeWorkspace((root) => {
      const existingUntracked = "notes/already-untracked.txt";
      const existingPath = join(root, existingUntracked);
      mkdirSync(join(existingPath, ".."), { recursive: true });
      writeFileSync(existingPath, "before turn\n");
      const before = captureStageScopeSnapshot(root);

      writeFileSync(existingPath, "changed during turn\n");
      const prototypeNamedUntracked = "__proto__";
      writeFileSync(join(root, prototypeNamedUntracked), "created during turn\n");
      const newUntracked = "notes/new-during-turn.txt";
      writeFileSync(join(root, newUntracked), "created during turn\n");
      const after = captureStageScopeSnapshot(root);

      expect(changedStageScopeFiles(before, after)).toEqual([
        prototypeNamedUntracked,
        existingUntracked,
        newUntracked,
      ]);
    });
  });

  it("detects deleted Git-visible files and retains ignored-prefix inventory diffs", () => {
    withScopeWorkspace((root) => {
      const deletedPath = join(root, scopeFixtureFiles.clean);
      const runArtifact = ".codex/runs/case-run/stage.json";
      const officialArtifact = ".artifacts/agentic-qa/case-run/evidence.png";
      mkdirSync(join(root, runArtifact, ".."), { recursive: true });
      mkdirSync(join(root, officialArtifact, ".."), { recursive: true });
      writeFileSync(join(root, runArtifact), "before");
      writeFileSync(join(root, officialArtifact), "before");
      const before = captureStageScopeSnapshot(root);

      rmSync(deletedPath);
      writeFileSync(join(root, runArtifact), "change");
      writeFileSync(join(root, officialArtifact), "change");
      const after = captureStageScopeSnapshot(root);

      expect(changedStageScopeFiles(before, after)).toEqual([
        officialArtifact,
        runArtifact,
        scopeFixtureFiles.clean,
      ]);
    });
  });

  it("accepts only regular Case B Evidence files inside the current run prefix", () => {
    const caseRoot = mkdtempSync(join(tmpdir(), "skill-workflow-case-b-evidence-"));
    const runId = "current-run";
    const evidencePrefix = `.artifacts/agentic-qa/${runId}/runner/output/evidence/`;
    const makeFile = (relativePath: string): void => {
      const absolutePath = join(caseRoot, ...relativePath.split("/"));
      mkdirSync(join(absolutePath, ".."), { recursive: true });
      writeFileSync(absolutePath, "evidence\n");
    };
    try {
      const currentEvidence = `${evidencePrefix}screen.png`;
      const otherRunEvidence = ".artifacts/agentic-qa/other-run/runner/output/evidence/screen.png";
      const runRootFile = `.artifacts/agentic-qa/${runId}/root.txt`;
      const outsideEvidence = `.artifacts/agentic-qa/${runId}/runner/output/response.json`;
      const broadOldRoot = ".artifacts/agentic-qa/legacy-evidence.png";
      const directoryEvidence = `${evidencePrefix}directory`;
      makeFile(currentEvidence);
      makeFile(otherRunEvidence);
      makeFile(runRootFile);
      makeFile(outsideEvidence);
      makeFile(broadOldRoot);
      mkdirSync(join(caseRoot, ...directoryEvidence.split("/")), { recursive: true });

      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, currentEvidence)).toBe(true);
      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, otherRunEvidence)).toBe(false);
      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, runRootFile)).toBe(false);
      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, outsideEvidence)).toBe(false);
      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, broadOldRoot)).toBe(false);
      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, `${evidencePrefix}missing.png`)).toBe(
        false,
      );
      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, evidencePrefix)).toBe(false);
      expect(isCaseBOfficialEvidenceFile(caseRoot, runId, directoryEvidence)).toBe(false);
      expect(
        isCaseBOfficialEvidenceFile(
          caseRoot,
          runId,
          `${evidencePrefix}../../../../../../outside.png`,
        ),
      ).toBe(false);
    } finally {
      rmSync(caseRoot, { recursive: true, force: true });
    }
  });

  it("keeps the fixed five cases and stage handoff order", () => {
    expect(WORKFLOW_CASES.map((workflowCase) => workflowCase.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(
      WORKFLOW_CASES.find((workflowCase) => workflowCase.id === "A")?.stages.map(
        (stage) => stage.id,
      ),
    ).toEqual(["plan", "implementation", "review", "repair"]);
    expect(
      WORKFLOW_CASES.find((workflowCase) => workflowCase.id === "B")?.stages.map(
        (stage) => stage.id,
      ),
    ).toEqual(["qa", "repair"]);
    expect(
      WORKFLOW_CASES.find((workflowCase) => workflowCase.id === "D")?.stages.map(
        (stage) => stage.id,
      ),
    ).toEqual(["repair", "harness-improvement"]);
  });

  it("treats a single wrong Skill as fail and multiple Skills as unobservable", () => {
    expect(
      classifySkillObservation("feature-plan", {
        reliable: true,
        initial_skill: "code-review",
        observed_skills: ["code-review"],
        unobservable_reason: null,
      }),
    ).toMatchObject({ status: "fail", observed_skill: "code-review" });
    expect(
      classifySkillObservation("feature-plan", {
        reliable: false,
        initial_skill: null,
        observed_skills: null,
        unobservable_reason: "multiple_skills",
      }),
    ).toMatchObject({ status: "unobservable", reason: "multiple_skills" });
    expect(
      classifySkillObservation(null, {
        reliable: true,
        initial_skill: null,
        observed_skills: [],
        unobservable_reason: null,
      }),
    ).toMatchObject({ status: "pass", observed_skill: null });
  });

  it("keeps not_executed limited to Case B browser capability and Case E host capability", () => {
    expect(isAllowedNotExecuted("B", "browser_capability_unavailable_under_canonical_config")).toBe(
      true,
    );
    expect(isAllowedNotExecuted("E", "host_capability_unavailable")).toBe(true);
    expect(isAllowedNotExecuted("A", "browser_capability_unavailable_under_canonical_config")).toBe(
      false,
    );
    expect(isAllowedNotExecuted("B", "fixture_invalid")).toBe(false);
    expect(caseStatusFromStages("A", [{ status: "not_executed" }])).toBe("not_executed");
    expect(caseStatusFromStages("A", [{ status: "unobservable" }])).toBe("unobservable");
    expect(caseStatusFromStages("A", [{ status: "fail" }])).toBe("fail");
  });

  it("uses strict repair, review, native and result schemas", () => {
    expect(
      repairOutputSchema.safeParse({
        iterations: [
          {
            iteration_number: 1,
            input_findings: ["finding"],
            repair_plan: "fix",
            allowed_files: ["status.mjs"],
            changed_files: ["status.mjs"],
            validation_commands: ["node --test fixture.mjs"],
            validation_result: "passed",
            remaining_delta: [],
            decision: "stop_success",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      repairOutputSchema.safeParse({ iterations: [], expected_decision: "stop_success" }).success,
    ).toBe(false);
    expect(
      codeReviewOutputSchema.safeParse({ findings: [], residual_risks: [], unvalidated_areas: [] })
        .success,
    ).toBe(true);

    const result = {
      schema_version: 1,
      run_status: "completed",
      provenance: {
        evaluator_git_sha: "a".repeat(40),
        source_revision_git_sha: "a".repeat(40),
        routing_source_git_sha: "b".repeat(40),
        codex_version: "codex-cli 0.153.4",
        model: "gpt-5.6-luna",
        executed_at: "2026-09-22T00:00:00.000Z",
      },
      smoke_probe: { status: "pass" },
      cases: [
        {
          id: "A",
          case_baseline_git_sha: "c".repeat(40),
          status: "pass",
          stages: [],
          artifact_reuse: { status: "pass" },
        },
        {
          id: "B",
          case_baseline_git_sha: "d".repeat(40),
          status: "not_executed",
          reason: "browser_capability_unavailable_under_canonical_config",
          stages: [],
        },
        { id: "C", case_baseline_git_sha: "e".repeat(40), status: "pass", stages: [] },
        { id: "D", case_baseline_git_sha: "f".repeat(40), status: "pass", stages: [] },
        {
          id: "E",
          case_baseline_git_sha: "0".repeat(40),
          status: "not_executed",
          reason: "host_capability_unavailable",
          stages: [],
        },
      ],
    } as const;
    expect(workflowEvalResultSchema.safeParse(result).success).toBe(true);
    expect(isWorkflowRunSuccessful(result)).toBe(true);
    expect(
      isWorkflowRunSuccessful({
        ...result,
        cases: result.cases.map((candidate) =>
          candidate.id === "B" ? { ...candidate, reason: "fixture_invalid" } : candidate,
        ),
      }),
    ).toBe(false);
  });

  it("keeps canonical Codex controls before resume and the prompt positional last", () => {
    const resumeArgs = buildWorkflowCodexArguments({
      cwd: "C:/case",
      model: "gpt-5.6-luna",
      otelEndpoint: "http://127.0.0.1:4318/v1/metrics",
      resumeThreadId: "thread-1",
      outputSchemaPath: "C:/case/schema.json",
      outputLastMessagePath: "C:/case/last.json",
    });
    const resumeIndex = resumeArgs.indexOf("resume");
    expect(resumeArgs.slice(0, 3)).toEqual(["--ask-for-approval", "never", "exec"]);
    for (const option of [
      "--sandbox",
      "-C",
      "--model",
      "--json",
      "--output-schema",
      "--output-last-message",
    ]) {
      expect(resumeArgs.indexOf(option)).toBeGreaterThanOrEqual(0);
      expect(resumeArgs.indexOf(option)).toBeLessThan(resumeIndex);
    }
    for (const option of [
      "--ignore-user-config",
      "--ignore-rules",
      "features.hooks=false",
      "shell_environment_policy.inherit=core",
      "web_search=disabled",
    ]) {
      const index = resumeArgs.indexOf(option);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(resumeIndex);
    }
    const otelIndex = resumeArgs.findIndex((argument) =>
      argument.startsWith("otel.metrics_exporter="),
    );
    expect(otelIndex).toBeGreaterThanOrEqual(0);
    expect(otelIndex).toBeLessThan(resumeIndex);
    expect(resumeArgs.slice(resumeIndex, resumeIndex + 3)).toEqual(["resume", "thread-1", "-"]);
    expect(resumeArgs).not.toContain("--ephemeral");
    expect(resumeArgs).not.toContain("danger-full-access");
    expect(resumeArgs.at(-1)).toBe("-");

    const initialArgs = buildWorkflowCodexArguments({
      cwd: "C:/case",
      model: "gpt-5.6-luna",
      otelEndpoint: "http://127.0.0.1:4318/v1/metrics",
      outputSchemaPath: "C:/case/schema.json",
      outputLastMessagePath: "C:/case/initial.json",
    });
    expect(initialArgs).not.toContain("resume");
    expect(initialArgs).toContain("--sandbox");
    expect(initialArgs).toContain("-C");
    expect(initialArgs).toContain("--model");
    expect(initialArgs).toContain("--json");
    expect(initialArgs).toContain("--output-schema");
    expect(initialArgs).toContain("--output-last-message");
    expect(initialArgs).toContain("features.hooks=false");
    expect(initialArgs).toContain("shell_environment_policy.inherit=core");
    expect(initialArgs).toContain("web_search=disabled");
    expect(initialArgs.at(-1)).toBe("-");
  });

  it("requires provenance inputs and derives Native first anomaly from the Doctor marker", () => {
    expect(() => parseWorkflowEvalCliArguments(["--target-root", "target"])).toThrow(
      "--source-revision-git-sha is required",
    );
    const parsed = parseWorkflowEvalCliArguments([
      "--target-root",
      "target",
      "--source-revision-git-sha",
      "a".repeat(40),
      "--routing-source-git-sha",
      "b".repeat(40),
      "--output",
      ".codex/runs/result.json",
    ]);
    expect(parsed.model).toBe("gpt-5.6-luna");
    expect(deriveNativeFirstAnomaly("==> Validate toolchain\nPASS: node\nmissing adb\n")).toBe(
      "missing adb",
    );
    expect(deriveNativeFirstAnomaly("helper failed before marker\n")).toBeUndefined();
    expect(deriveNativeFirstAnomaly("==> Validate toolchain\nPASS: node\nPASS: adb\n")).toBeNull();
    expect(redactNativeDeviceSerial("adb -s emulator-5554 failed", "emulator-5554")).toBe(
      "adb -s <DEVICE_SERIAL> failed",
    );
  });

  it("accepts the standard package-script argument separator", () => {
    const parsed = parseWorkflowEvalCliArguments([
      "--",
      "--target-root",
      "target",
      "--source-revision-git-sha",
      "a".repeat(40),
      "--routing-source-git-sha",
      "b".repeat(40),
      "--output",
      "result.json",
    ]);
    expect(parsed.target_root).toBe("target");
    expect(parsed.output).toBe("result.json");
  });

  it("does not add a PR6 workflow script to CI and reuses the existing native helper", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.["eval:skills:workflow"]).toBe(
      "tsx scripts/evals/run-skill-workflow-evals.ts",
    );
    const runner = readFileSync(
      resolve(repositoryRoot, "scripts/evals/run-skill-workflow-evals.ts"),
      "utf8",
    );
    expect(runner).toContain("android-local.ps1");
    expect(runner).toContain("createOtelSkillObserver");
    expect(runner).toContain("runActualSemanticOutputEval");
    expect(runner).not.toContain("matchDefectFinding");
  });
});
