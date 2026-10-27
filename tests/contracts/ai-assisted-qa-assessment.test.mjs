import { Buffer } from "node:buffer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  assertAssessmentPath,
  atomicWriteJson,
  buildAssessmentAgentConfig,
  buildOpenCodeRunArgs,
  buildOpenCodeEnvironment,
  createLiveChallenge,
  createAttemptDirectory,
  finalizeAssessment,
  assertNoSecretText,
  parseAssessmentArgs,
  parseOpenCodeJsonEvents,
  parseStrictJsonResponse,
  sha256,
  validateCandidate,
} from "../../scripts/training/ai-assisted-qa-assessment-core.mjs";
import {
  runAiAssistedQaSpecCli,
  verifyM03SkillRuntimeEvidence,
  verifyModuleRunEvidence,
} from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-qa-assessment-contract-"));

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

it("requires a verified distribution SHA before course:run can access learner files", () => {
  expect(() =>
    runAiAssistedQaSpecCli(["M05", "product-link.spec.ts", "--label", "main"], {
      root: path.join(tempRoot, "missing-source-sha"),
    }),
  ).toThrow("course:run requires the verified distribution source SHA");
});

function expected() {
  return {
    assessmentId: "123e4567-e89b-42d3-a456-426614174000",
    phaseId: "P1",
    objectiveIds: ["M00-01", "M00-02"],
    criteriaByObjective: { "M00-01": ["C-M00-01"], "M00-02": ["C-M00-02"] },
    evidenceIds: new Set(["E-M00-001", "E-M00-002"]),
    evidenceIdsByObjective: {
      "M00-01": ["E-M00-001"],
      "M00-02": ["E-M00-002"],
    },
    reviewPathsByObjective: {
      "M00-01": ["course/modules/M00/README.md", "workspace/M00/submission.md"],
      "M00-02": ["course/modules/M00/README.md", "workspace/M00/submission.md"],
    },
  };
}

function candidate(overrides = {}) {
  const context = expected();
  return {
    schema_version: 1,
    assessment_id: context.assessmentId,
    phase_id: context.phaseId,
    completed: true,
    pass: true,
    objectives: context.objectiveIds.map((objective_id, index) => ({
      objective_id,
      status: "assessed",
      level: 2,
      criterion_ids: [context.criteriaByObjective[objective_id][0]],
      evidence_ids: [context.evidenceIdsByObjective[objective_id][0]],
      rationale: "The submitted explanation cites the verified source and observed result.",
      gaps: [],
      review_paths: context.reviewPathsByObjective[objective_id],
      ...(overrides.objective?.[index] ?? {}),
    })),
  };
}

function writeM05RunEvidence(
  root,
  sourceSha = "a".repeat(40),
  runIds = ["123e4567-e89b-42d3-a456-426614174000", "123e4567-e89b-42d3-a456-426614174001"],
) {
  const workspaceRoot = path.join(root, "workspace");
  const moduleRoot = path.join(workspaceRoot, "M05");
  const specPath = path.join(moduleRoot, "product-link.spec.ts");
  const relative = (filePath) => path.relative(root, filePath).split(path.sep).join("/");
  const command = [
    "pnpm",
    "exec",
    "playwright",
    "test",
    "product-link.spec.ts",
    "--config=playwright.ai-assisted-qa.config.ts",
    "--project=ai-assisted-qa-chromium",
    "--retries=0",
  ].join(" ");
  const run = ({ label, code, outcome, exitCode, time, runId, withTrace = false }) => {
    const runRoot = path.join(moduleRoot, "evidence", "runs", runId);
    fs.mkdirSync(runRoot, { recursive: true });
    const spec = Buffer.from(code);
    fs.writeFileSync(specPath, spec);
    const snapshotPath = path.join(runRoot, "spec-snapshot.ts");
    const reportPath = path.join(runRoot, "playwright-result.json");
    const receiptPath = path.join(runRoot, "run-evidence.json");
    fs.writeFileSync(snapshotPath, spec);
    const tracePath = path.join(runRoot, "test-results", "trace.zip");
    const attachments = [];
    if (withTrace) {
      fs.mkdirSync(path.dirname(tracePath), { recursive: true });
      fs.writeFileSync(tracePath, "trace fixture");
      attachments.push({
        name: "trace",
        contentType: "application/zip",
        path: tracePath,
      });
    }
    const report = {
      suites: [
        {
          specs: [
            {
              file: specPath,
              title: "product link",
              tests: [
                {
                  expectedStatus: "passed",
                  results: [
                    {
                      status: outcome === "passed" ? "passed" : "failed",
                      attachments,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const reportBytes = Buffer.from(JSON.stringify(report));
    fs.writeFileSync(reportPath, reportBytes);
    fs.writeFileSync(
      receiptPath,
      JSON.stringify({
        schema_version: 1,
        kind: "ai-assisted-qa-playwright-run",
        producer: "course:run",
        run_id: runId,
        module_id: "M05",
        source_sha: sourceSha,
        spec_path: "workspace/M05/product-link.spec.ts",
        spec_sha256: sha256(spec),
        source_snapshot_path: relative(snapshotPath),
        source_snapshot_sha256: sha256(spec),
        label,
        project: "ai-assisted-qa-chromium",
        command,
        started_at: time,
        finished_at: new Date(Date.parse(time) + 1000).toISOString(),
        exit_code: exitCode,
        outcome,
        report_path: relative(reportPath),
        report_sha256: sha256(reportBytes),
        tests: [
          {
            title: "product link",
            status: outcome === "passed" ? "passed" : "failed",
            expected_status: "passed",
          },
        ],
        attachments: withTrace
          ? [
              {
                path: "test-results/trace.zip",
                size: fs.statSync(tracePath).size,
                name: "trace",
                content_type: "application/zip",
              },
            ]
          : [],
        spec_unchanged_during_run: true,
        environment_error: null,
      }),
    );
    return reportPath;
  };
  const before = run({
    label: "before",
    code: 'test("broken product link", async () => expect(true).toBe(false));\n',
    outcome: "failed",
    exitCode: 1,
    time: "2026-10-27T00:00:00.000Z",
    runId: runIds[0],
    withTrace: true,
  });
  const after = run({
    label: "after",
    code: 'test("fixed product link", async () => expect(true).toBe(true));\n',
    outcome: "passed",
    exitCode: 0,
    time: "2026-10-27T00:00:02.000Z",
    runId: runIds[1],
  });
  return { workspaceRoot, reportPath: after, beforeReportPath: before };
}

describe("AI-assisted QA formal assessment contracts", () => {
  it("does not pass GitHub or provider credentials to OpenCode child processes", () => {
    const environment = buildOpenCodeEnvironment({
      source: {
        PATH: "safe-path",
        HOME: "safe-home",
        GH_TOKEN: "github-secret",
        GITHUB_TOKEN: "github-token-secret",
        OPENCODE_API_KEY: "provider-secret",
        OPENAI_API_KEY: "paid-provider-secret",
      },
      platform: "linux",
      extra: { OPENCODE_CONFIG_CONTENT: "read-only" },
    });
    expect(environment).toEqual({
      PATH: "safe-path",
      HOME: "safe-home",
      OPENCODE_CONFIG_CONTENT: "read-only",
    });
    expect(environment.GH_TOKEN).toBeUndefined();
    expect(environment.GITHUB_TOKEN).toBeUndefined();
    expect(environment.OPENCODE_API_KEY).toBeUndefined();
    expect(environment.OPENAI_API_KEY).toBeUndefined();
  });

  it("blocks common provider secrets in learner evidence and answers before model submission", () => {
    for (const secretLike of [
      `sk-proj-${"A".repeat(24)}`,
      `sk-ant-api03-${"B".repeat(24)}`,
      `AIza${"C".repeat(35)}`,
      `xoxb-${"D".repeat(24)}`,
      `OPENROUTER_API_KEY=${"E".repeat(24)}`,
    ])
      expect(() => assertNoSecretText(`learner text ${secretLike}`)).toThrow(
        /may contain a Secret/,
      );
    expect(() => assertNoSecretText("ordinary answer with no credential")).not.toThrow();
  });

  it("uses documented OpenCode v2 run flags and keeps project instructions out of evaluator sessions", () => {
    const promptPath = path.join(tempRoot, "attempt with spaces", "assessment-prompt.md");
    const args = buildOpenCodeRunArgs({
      modelId: "opencode/free-model",
      agentId: "qa-course-assessment",
      promptPath,
    });
    expect(args).toEqual([
      "run",
      "--standalone",
      "--pure",
      "--model",
      "opencode/free-model",
      "--agent",
      "qa-course-assessment",
      "--format",
      "json",
      "--file",
      promptPath,
      "Return only the exact JSON object required by your system prompt.",
    ]);
    expect(args).not.toContain("--dir");
    expect(
      buildOpenCodeEnvironment({
        source: { PATH: "safe-path" },
        platform: "linux",
        extra: { OPENCODE_DISABLE_PROJECT_CONFIG: "true" },
      }),
    ).toEqual({ PATH: "safe-path", OPENCODE_DISABLE_PROJECT_CONFIG: "true" });
  });

  it("configures a dedicated assessor with no permitted tools", () => {
    const config = buildAssessmentAgentConfig({
      modelId: "opencode/free-model",
      agentId: "qa-course-assessment",
      systemPrompt: "Read evidence only.",
    });
    expect(config.autoupdate).toBe(false);
    expect(config.agents["qa-course-assessment"].mode).toBe("primary");
    expect(config.agents["qa-course-assessment"].permissions).toEqual([
      { action: "*", resource: "*", effect: "deny" },
    ]);
    expect(() =>
      buildAssessmentAgentConfig({
        modelId: "opencode/free-model",
        agentId: "qa-course-assessment",
        systemPrompt: "",
      }),
    ).toThrow(/system prompt/);
  });

  it("generates a bounded live question only from the terminal module and its pinned source", () => {
    for (const [phaseId, moduleId, objectiveId] of [
      ["P1", "M04", "M04-01"],
      ["P2", "M07", "M07-01"],
      ["P3", "M10", "M10-01"],
    ]) {
      const challenge = createLiveChallenge({
        phaseId,
        sourceSha: "a".repeat(40),
        id: "123e4567-e89b-42d3-a456-426614174000",
        randomIndex: () => 0,
        scoring: {
          module_id: moduleId,
          objective_ids: [objectiveId],
          sources: ["course/modules/" + moduleId + "/README.md"],
          criteria: [
            {
              id: moduleId + "-CR-01",
              objective_ids: [objectiveId],
              required_evidence: ["source-backed independent decision"],
            },
          ],
        },
        sourceMaterials: [
          { path: "course/modules/" + moduleId + "/README.md", sha256: "b".repeat(64) },
        ],
      });
      expect(challenge.objective_ids).toEqual([objectiveId]);
      expect(challenge.source_sha).toBe("a".repeat(40));
      expect(challenge.source_sha256).toBe("b".repeat(64));
      expect(challenge.variation_dimension).toBeTruthy();
      expect(challenge.condition).toContain(objectiveId);
      expect(challenge.condition_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(() =>
        createLiveChallenge({
          phaseId,
          sourceSha: "a".repeat(40),
          id: "123e4567-e89b-42d3-a456-426614174000",
          randomIndex: () => 0,
          scoring: { module_id: "M00", objective_ids: ["M00-01"], sources: [], criteria: [] },
          sourceMaterials: [],
        }),
      ).toThrow(/terminal module/);
    }
  });

  it("accepts only terminal modules with one explicit model and safe read actions", () => {
    expect(parseAssessmentArgs(["M04", "--model", "opencode/gpt-free"])).toEqual({
      action: "run",
      moduleId: "M04",
      phase: "P1",
      modelId: "opencode/gpt-free",
      resumeId: undefined,
    });
    expect(parseAssessmentArgs(["M07", "--history"])).toMatchObject({
      action: "history",
      phase: "P2",
    });
    expect(() => parseAssessmentArgs(["M03", "--model", "opencode/gpt-free"])).toThrow(
      /M04\|M07\|M10/,
    );
    expect(() => parseAssessmentArgs(["M10", "--model", "auto"])).toThrow(
      /explicit provider\/model-id/,
    );
    expect(() =>
      parseAssessmentArgs(["M04", "--model", "opencode/gpt-free", "--model", "other/model"]),
    ).toThrow(/duplicate/);
  });

  it("rejects malformed, mixed-session, tool-using, and incomplete OpenCode output", () => {
    expect(() => parseOpenCodeJsonEvents("not-json", 0)).toThrow(/malformed JSON/);
    expect(() => parseOpenCodeJsonEvents('{"type":"tool_use"}\n', 0)).toThrow(/tool\/error event/);
    expect(() =>
      parseOpenCodeJsonEvents(
        '{"type":"text","part":{"type":"text","text":"{}"},"sessionID":"a"}\n{"type":"step_finish","reason":"stop","sessionID":"b"}',
        0,
      ),
    ).toThrow(/multiple sessions/);
    expect(() =>
      parseOpenCodeJsonEvents('{"type":"text","part":{"type":"text","text":"{}"}}', 0),
    ).toThrow(/terminal step_finish/);
    expect(
      parseOpenCodeJsonEvents(
        '{"type":"text","part":{"type":"text","text":"{}"}}\n{"type":"step_finish","reason":"stop"}',
        0,
      ).response,
    ).toBe("{}");
    expect(() => parseStrictJsonResponse("```json\n{}\n```")).toThrow(/single JSON document/);
  });

  it("validates every objective against its assigned evidence and review paths", () => {
    const context = expected();
    const valid = validateCandidate(candidate(), context);
    expect(valid).not.toHaveProperty("completed");
    expect(valid).not.toHaveProperty("pass");
    expect(valid.objectives).toHaveLength(2);
    const foreignEvidence = candidate({ objective: [{ evidence_ids: ["E-M00-002"] }] });
    expect(() => validateCandidate(foreignEvidence, context)).toThrow(/not assigned/);
    const foreignReview = candidate({ objective: [{ review_paths: ["workspace/M01/other.md"] }] });
    expect(() => validateCandidate(foreignReview, context)).toThrow(/review path/);
    const duplicateObjective = candidate();
    duplicateObjective.objectives[1].objective_id = "M00-01";
    expect(() => validateCandidate(duplicateObjective, context)).toThrow(/duplicate/);
    const injectedFlag = candidate();
    injectedFlag.objectives[0].completed = true;
    expect(() => validateCandidate(injectedFlag, context)).toThrow(/unsupported fields/);
  });

  it("requires an assessed live-challenge objective to cite the learner answer evidence", () => {
    const context = expected();
    const liveEvidenceId = "E-M00-01-LIVE";
    context.evidenceIds.add(liveEvidenceId);
    context.evidenceIdsByObjective["M00-01"].push(liveEvidenceId);
    context.requiredEvidenceIdsByObjective = { "M00-01": [liveEvidenceId] };

    expect(() => validateCandidate(candidate(), context)).toThrow(
      /required live challenge evidence/,
    );
    expect(
      validateCandidate(
        candidate({ objective: [{ evidence_ids: ["E-M00-001", liveEvidenceId] }] }),
        context,
      ).objectives[0].evidence_ids,
    ).toEqual(["E-M00-001", liveEvidenceId]);
  });

  it("lets only Node.js combine verified AI levels, calibration, and deterministic checks", () => {
    const context = expected();
    const normalized = validateCandidate(candidate(), context);
    const args = {
      candidate: normalized,
      calibration: { id: "cal-1", status: "passed", critical_false_passes: 0 },
      sourceSha: "a".repeat(40),
      versions: {
        attempt: 1,
        terminalModuleId: "M04",
        modelId: "opencode/gpt-free",
        openCodeVersion: "2.0.22",
      },
      inputSnapshot: [
        { evidence_id: "E-M00-001", path: "workspace/M00/submission.md", sha256: "b".repeat(64) },
      ],
      deterministicChecks: [{ id: "M00-END", status: "passed" }],
      challenge: {
        id: "CH-P1-1",
        objective_ids: ["M00-01"],
        condition_sha256: "c".repeat(64),
        answer_sha256: "d".repeat(64),
      },
    };
    expect(finalizeAssessment(args).completed).toBe(true);
    expect(
      finalizeAssessment({ ...args, calibration: { ...args.calibration, status: "failed" } }),
    ).toMatchObject({ status: "blocked", completed: false });
    expect(
      finalizeAssessment({ ...args, deterministicChecks: [{ id: "M00-END", status: "blocked" }] }),
    ).toMatchObject({ status: "blocked", completed: false });
    expect(finalizeAssessment({ ...args, deterministicChecks: [] })).toMatchObject({
      status: "ungradable",
      completed: false,
    });
    expect(
      finalizeAssessment({
        ...args,
        deterministicChecks: [
          { id: "M00-END", status: "passed" },
          { id: "M00-END", status: "passed" },
        ],
      }),
    ).toMatchObject({ status: "ungradable", completed: false });
    const belowLevel = structuredClone(normalized);
    belowLevel.objectives[1].level = 1;
    expect(finalizeAssessment({ ...args, candidate: belowLevel })).toMatchObject({
      status: "incomplete",
      completed: false,
    });
  });

  it("requires same-run Playwright reports and source snapshots for Phase 2 evidence", () => {
    const { workspaceRoot, reportPath } = writeM05RunEvidence(
      path.join(tempRoot, "playwright-proof"),
    );
    const scoring = {
      evaluation_policy: {
        execution_evidence: {
          schema_version: 1,
          kind: "playwright-run-record",
          required_runs: [
            {
              spec: "product-link.spec.ts",
              label: "before",
              minimum_tests: 1,
              expected_outcome: "failed",
              require_trace: true,
            },
            {
              spec: "product-link.spec.ts",
              label: "after",
              minimum_tests: 1,
              expected_outcome: "passed",
            },
          ],
        },
      },
    };
    const verified = verifyModuleRunEvidence({
      workspaceRoot,
      moduleId: "M05",
      scoring,
      sourceSha: "a".repeat(40),
    });
    expect(verified.status).toBe("passed");
    expect(verified.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "passed", outcome: "failed", test_count: 1 }),
        expect.objectContaining({ status: "passed", outcome: "passed", test_count: 1 }),
      ]),
    );
    fs.appendFileSync(reportPath, " ");
    expect(
      verifyModuleRunEvidence({
        workspaceRoot,
        moduleId: "M05",
        scoring,
        sourceSha: "a".repeat(40),
      }),
    ).toMatchObject({ status: "ungradable" });
  });

  it("rejects Playwright receipts from a different course distribution revision", () => {
    const { workspaceRoot } = writeM05RunEvidence(path.join(tempRoot, "stale-playwright-proof"));
    const scoring = {
      evaluation_policy: {
        execution_evidence: {
          schema_version: 1,
          kind: "playwright-run-record",
          required_runs: [
            {
              spec: "product-link.spec.ts",
              label: "before",
              minimum_tests: 1,
              expected_outcome: "failed",
              require_trace: true,
            },
          ],
        },
      },
    };
    expect(
      verifyModuleRunEvidence({
        workspaceRoot,
        moduleId: "M05",
        scoring,
        sourceSha: "b".repeat(40),
      }),
    ).toMatchObject({ status: "ungradable" });
  });

  it("ignores historical receipts when current-revision Playwright runs are present", () => {
    const root = path.join(tempRoot, "mixed-revision-playwright-proof");
    const { workspaceRoot } = writeM05RunEvidence(root, "a".repeat(40));
    writeM05RunEvidence(root, "b".repeat(40), [
      "223e4567-e89b-42d3-a456-426614174000",
      "223e4567-e89b-42d3-a456-426614174001",
    ]);
    const scoring = {
      evaluation_policy: {
        execution_evidence: {
          schema_version: 1,
          kind: "playwright-run-record",
          required_runs: [
            {
              spec: "product-link.spec.ts",
              label: "before",
              minimum_tests: 1,
              expected_outcome: "failed",
              require_trace: true,
            },
            {
              spec: "product-link.spec.ts",
              label: "after",
              minimum_tests: 1,
              expected_outcome: "passed",
            },
          ],
        },
      },
    };
    expect(
      verifyModuleRunEvidence({
        workspaceRoot,
        moduleId: "M05",
        scoring,
        sourceSha: "b".repeat(40),
      }).status,
    ).toBe("passed");
  });

  it("does not accept Phase 2 completion when required execution receipts are absent", () => {
    const workspaceRoot = path.join(tempRoot, "missing-playwright-proof", "workspace");
    fs.mkdirSync(path.join(workspaceRoot, "M06"), { recursive: true });
    const scoring = {
      evaluation_policy: {
        execution_evidence: {
          schema_version: 1,
          kind: "playwright-run-record",
          required_runs: [
            {
              spec: "cart-cases.spec.ts",
              label: "main",
              minimum_tests: 3,
              expected_outcome: "passed",
            },
          ],
        },
      },
    };
    expect(
      verifyModuleRunEvidence({
        workspaceRoot,
        moduleId: "M06",
        scoring,
        sourceSha: "a".repeat(40),
      }),
    ).toMatchObject({ status: "ungradable" });
  });

  it("reruns both pinned M03 Skill verifiers against the current learner artifacts", () => {
    const root = path.join(tempRoot, "m03-runtime-proof");
    const workspaceRoot = path.join(root, "workspace");
    const moduleRoot = path.join(workspaceRoot, "M03");
    const helperPath = path.join(
      root,
      ".agents",
      "skills",
      "test-condition-design",
      "scripts",
      "runtime_contract.py",
    );
    fs.mkdirSync(moduleRoot, { recursive: true });
    fs.mkdirSync(path.dirname(helperPath), { recursive: true });
    fs.writeFileSync(helperPath, "pinned helper fixture\n");
    const artifacts = new Map([
      ["condition-design.md", "condition design artifact\n"],
      ["cases.md", "case design artifact\n"],
    ]);
    for (const [name, content] of artifacts) fs.writeFileSync(path.join(moduleRoot, name), content);
    const requests = [
      {
        skill: "test-condition-design",
        evidence: "condition-runtime-evidence.json",
        artifact: "condition-design.md",
      },
      { skill: "test-case-design", evidence: "case-runtime-evidence.json", artifact: "cases.md" },
    ];
    for (const request of requests) {
      fs.writeFileSync(
        path.join(moduleRoot, request.evidence),
        JSON.stringify({
          operation: "verify_runtime_evidence",
          skill: request.skill,
          normalized_skill_input: {},
          artifact_markdown: artifacts.get(request.artifact),
          previous_artifact_markdown: null,
          partial_rerun: false,
        }),
      );
    }
    const scoring = {
      evaluation_policy: {
        execution_evidence: {
          schema_version: 1,
          kind: "pinned-skill-runtime-contract",
          source_path: "skills/test-condition-design/scripts/runtime_contract.py",
          required_verifications: requests.map((request) => ({
            skill: request.skill,
            evidence_path: "workspace/M03/" + request.evidence,
            artifact_path: "workspace/M03/" + request.artifact,
          })),
        },
      },
    };
    const executedSkills = [];
    const spawn = (_command, args, options) => {
      if (args.at(-1) === "--version") return { status: 0, stdout: "Python 3.11.9\n", stderr: "" };
      const request = JSON.parse(options.input.toString("utf8"));
      executedSkills.push(request.skill);
      return {
        status: 0,
        stdout: JSON.stringify({
          valid: true,
          issues: [],
          missing: [],
          extra: [],
          incomplete_pairs: [],
          duplicates: [],
          missing_entities: [],
          extra_entities: [],
          duplicate_entities: [],
          expected_runtime_units: ["unit"],
          actual_runtime_units: ["unit"],
        }),
        stderr: "",
      };
    };
    const verify = () =>
      verifyM03SkillRuntimeEvidence({
        workspaceRoot,
        scoring,
        runtimeContractPath: helperPath,
        runtimeContractSha256: sha256(fs.readFileSync(helperPath)),
        externalSkillSource: [
          "ryu-yoshikawa-pro-vision/qa-workflow-skills",
          "7cc6cba7772de549841a39d71694cbafbc783324",
        ],
        spawn,
      });
    expect(verify()).toMatchObject({
      status: "passed",
      checks: [{ status: "passed" }, { status: "passed" }],
    });
    expect(executedSkills).toEqual(["test-condition-design", "test-case-design"]);
    fs.appendFileSync(path.join(moduleRoot, "condition-design.md"), " changed after runtime\n");
    expect(verify()).toMatchObject({ status: "ungradable" });
  });

  it("keeps assessment attempt paths contained and result files immutable", () => {
    const root = path.join(tempRoot, "workspace");
    fs.mkdirSync(root, { recursive: true });
    expect(() => assertAssessmentPath(root, "../outside.json")).toThrow(/normalized POSIX/);
    const attempt = createAttemptDirectory(root, "P1", "123e4567-e89b-42d3-a456-426614174000");
    const resultPath = path.join(attempt, "result.json");
    atomicWriteJson(resultPath, { completed: false });
    expect(() => atomicWriteJson(resultPath, { completed: true })).toThrow(/immutable/);
    atomicWriteJson(resultPath, { completed: true }, { replace: true });
    expect(JSON.parse(fs.readFileSync(resultPath, "utf8"))).toEqual({ completed: true });
  });
});
