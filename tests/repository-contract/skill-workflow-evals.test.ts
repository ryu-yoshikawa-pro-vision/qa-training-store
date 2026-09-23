import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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
  buildWorkflowCodexArguments,
  captureStageScopeSnapshot,
  changedStageScopeFiles,
  deriveNativeFirstAnomaly,
  isCaseBOfficialEvidenceFile,
  parseWorkflowEvalCliArguments,
  redactNativeDeviceSerial,
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
      const newUntracked = "notes/new-during-turn.txt";
      writeFileSync(join(root, newUntracked), "created during turn\n");
      const after = captureStageScopeSnapshot(root);

      expect(changedStageScopeFiles(before, after)).toEqual([existingUntracked, newUntracked]);
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

  it("fixes the canonical Codex controls and same-thread resume shape", () => {
    const args = buildWorkflowCodexArguments({
      cwd: "C:/case",
      model: "gpt-5.6-luna",
      otelEndpoint: "http://127.0.0.1:4318/v1/metrics",
      resumeThreadId: "thread-1",
      outputSchemaPath: "C:/case/schema.json",
      outputLastMessagePath: "C:/case/last.json",
    });
    expect(args).toEqual(
      expect.arrayContaining([
        "--ignore-user-config",
        "--ignore-rules",
        "--json",
        "features.hooks=false",
        "shell_environment_policy.inherit=core",
        "web_search=disabled",
        "resume",
        "thread-1",
      ]),
    );
    expect(args).not.toContain("--ephemeral");
    expect(args.at(-1)).toBe("-");
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
