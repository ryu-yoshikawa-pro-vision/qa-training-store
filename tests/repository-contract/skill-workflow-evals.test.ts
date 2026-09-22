import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  deriveNativeFirstAnomaly,
  parseWorkflowEvalCliArguments,
  redactNativeDeviceSerial,
} from "../../scripts/evals/run-skill-workflow-evals";

const repositoryRoot = resolve(__dirname, "../..");

describe("Workflow E2E Eval repository contract", () => {
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
