import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import { sha256 } from "../../scripts/training/ai-assisted-qa-assessment-core.mjs";
import {
  assertReusableDeterministicChecks,
  assertReusableFinalizedAnswer,
  assertReusablePreparedInputs,
  withAssessmentProviderRetentionPolicy,
} from "../../scripts/training/ai-assisted-qa-assessment.mjs";

it("blocks the injected Provider executor before access or result publication", async () => {
  const attemptDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-retention-test-"));
  const resultPath = path.join(attemptDirectory, "result.json");
  const providerExecutor = vi.fn(() => {
    fs.writeFileSync(resultPath, JSON.stringify({ status: "complete", completed: true }));
  });
  try {
    await expect(withAssessmentProviderRetentionPolicy(providerExecutor)).rejects.toThrow(
      /BLOCKED: primary evidence.*retention and deletion terms.*not been verified/i,
    );
    expect(providerExecutor).not.toHaveBeenCalled();
    expect(fs.existsSync(resultPath)).toBe(false);
  } finally {
    fs.rmSync(attemptDirectory, { recursive: true, force: true });
  }

  const source = fs.readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../scripts/training/ai-assisted-qa-assessment.mjs",
    ),
    "utf8",
  );
  const start = source.indexOf("async function resumeAttemptUnlocked(request)");
  const end = source.indexOf("export function exportAssessment(", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const gateStart = source.indexOf(
    "export async function withAssessmentProviderRetentionPolicy(invoke)",
  );
  const guard = source.indexOf("assertAssessmentProviderRetentionPolicy();", gateStart);
  const invoke = source.indexOf("return invoke();", guard);
  expect(gateStart).toBeGreaterThanOrEqual(0);
  expect(guard).toBeGreaterThan(gateStart);
  expect(invoke).toBeGreaterThan(guard);

  const resume = source.slice(start, end);
  const reconciliation = resume.indexOf("const reconciled = reconcileFinalizedAssessment(");
  const recoveredResult = resume.indexOf("restored_saved_result: true");
  const gate = resume.indexOf("withAssessmentProviderRetentionPolicy(async () => {");
  const providerEffects = [
    "verifyCurrentFreeModelPrice(request.modelId)",
    "verifyOpenCodeModelAvailable(request.modelId)",
    "confirmExternalSend(request.modelId, request.phase, inputs)",
    "getOpenCodeVersion()",
    "obtainCalibration({",
    "runOpenCode({",
  ].map((marker) => resume.indexOf(marker));
  expect(gate).toBeGreaterThanOrEqual(0);
  expect(reconciliation).toBeGreaterThanOrEqual(0);
  expect(recoveredResult).toBeGreaterThan(reconciliation);
  expect(recoveredResult).toBeLessThan(gate);
  expect(providerEffects.every((index) => index > gate)).toBe(true);

  const blockedCatch = resume.indexOf("} catch (error) {", gate);
  const blockedReturn = resume.indexOf("return;", blockedCatch);
  const blockedFlow = resume.slice(gate, blockedReturn);
  const publishResult = resume.indexOf("atomicWriteJson(resultPath, fallback)", gate);
  const publishPointer = resume.indexOf("updateCurrentPointer(resultPath, fallback)", gate);
  expect(blockedCatch).toBeGreaterThan(gate);
  expect(blockedReturn).toBeGreaterThan(blockedCatch);
  expect(blockedFlow).not.toMatch(
    /atomicWriteJson|updateCurrentPointer|result\.json|completed:\s*true|status:\s*["']complete["']/,
  );
  expect(publishResult).toBeGreaterThan(blockedReturn);
  expect(publishPointer).toBeGreaterThan(blockedReturn);
});

function fixture() {
  const inputs = {
    phaseId: "P1",
    terminalModuleId: "M04",
    sourceSha: "a".repeat(40),
    stateContractRevision: "ai-assisted-qa-course-v3",
    assetHashes: [{ source_path: "assessment/scoring-tests/M04.json", sha256: "b".repeat(64) }],
    objectiveIds: ["M04-01"],
    criteriaByObjective: { "M04-01": ["M04-CR-01"] },
    evidence: [
      {
        evidence_id: "E-M04-001",
        module_id: "M04",
        path: "workspace/M04/analysis.md",
        sha256: "c".repeat(64),
        size: 320,
      },
    ],
  };
  const inputSnapshot = inputs.evidence.map(({ evidence_id, module_id, path, sha256, size }) => ({
    evidence_id,
    module_id,
    path,
    sha256,
    size,
  }));
  const fingerprint = sha256(
    JSON.stringify({
      phaseId: inputs.phaseId,
      terminalModuleId: inputs.terminalModuleId,
      sourceSha: inputs.sourceSha,
      stateContractRevision: inputs.stateContractRevision,
      assetHashes: inputs.assetHashes,
      objectiveIds: inputs.objectiveIds,
      evidence: inputs.evidence.map(({ evidence_id, path, sha256 }) => ({
        evidence_id,
        path,
        sha256,
      })),
    }),
  );
  const challenge = { id: "CH-P1-fixture", objective_ids: ["M04-01"] };
  const answer = {
    answer_sha256: sha256("independent response"),
    file_sha256: sha256("## M04-01\n\n### Your answer\n\nindependent response"),
  };
  const receipt = {
    challenge_id: challenge.id,
    objective_id: "M04-01",
    answer_sha256: answer.answer_sha256,
    file_sha256: answer.file_sha256,
  };
  const result = {
    assessment_id: "123e4567-e89b-42d3-a456-426614174001",
    challenge: { id: challenge.id, answer_sha256: answer.answer_sha256 },
    completed: true,
    status: "complete",
  };
  const inputManifest = {
    schema_version: 1,
    phase_id: inputs.phaseId,
    terminal_module_id: inputs.terminalModuleId,
    source_sha: inputs.sourceSha,
    state_contract_revision: inputs.stateContractRevision,
    asset_hashes: inputs.assetHashes,
    objective_ids: inputs.objectiveIds,
    criteria_by_objective: inputs.criteriaByObjective,
    input_snapshot: inputSnapshot,
    fingerprint,
    challenge_sha256: sha256(JSON.stringify(challenge)),
  };
  return { inputManifest, inputs, savedChallenge: challenge, answer, receipt, result };
}

it("reuses only an identical prepared source and evidence snapshot", () => {
  const { inputManifest, inputs } = fixture();
  expect(() => assertReusablePreparedInputs(inputManifest, inputs)).not.toThrow();
  const revisions = [
    { sourceSha: "0".repeat(40) },
    { stateContractRevision: "new-revision" },
    { assetHashes: [{ ...inputs.assetHashes[0], sha256: "d".repeat(64) }] },
    { evidence: [{ ...inputs.evidence[0], sha256: "e".repeat(64) }] },
    { evidence: [{ ...inputs.evidence[0], path: "workspace/M04/old.md" }] },
    { objectiveIds: ["M04-02"] },
    { criteriaByObjective: { "M04-01": ["M04-CR-02"] } },
  ];
  for (const revision of revisions) {
    expect(() => assertReusablePreparedInputs(inputManifest, { ...inputs, ...revision })).toThrow(
      /create a new assessment/,
    );
  }
  const tampered = { ...inputManifest, input_snapshot: [] };
  expect(() => assertReusablePreparedInputs(tampered, inputs)).toThrow(/create a new assessment/);
  const invalidFingerprint = { ...inputManifest, fingerprint: "0".repeat(64) };
  expect(() => assertReusablePreparedInputs(invalidFingerprint, inputs)).toThrow(
    /create a new assessment/,
  );
});

it("rejects altered answers and receipts without rewriting history", () => {
  const saved = fixture();
  const verify = (overrides = {}) => assertReusableFinalizedAnswer({ ...saved, ...overrides });
  expect(verify).not.toThrow();
  const changedResult = {
    ...saved.result,
    challenge: { ...saved.result.challenge, answer_sha256: "3".repeat(64) },
  };
  const cases = [
    { answer: { ...saved.answer, answer_sha256: "0".repeat(64) } },
    { answer: { ...saved.answer, file_sha256: "1".repeat(64) } },
    { receipt: { ...saved.receipt, answer_sha256: "2".repeat(64) } },
    { receipt: { ...saved.receipt, challenge_id: "other" } },
    { result: changedResult },
    { inputManifest: { ...saved.inputManifest, challenge_sha256: "4".repeat(64) } },
    { savedChallenge: { ...saved.savedChallenge, id: "unrelated" } },
  ];
  const originalHistory = JSON.stringify(saved.result);
  for (const changed of cases) expect(() => verify(changed)).toThrow(/create a new assessment/);
  expect(JSON.stringify(saved.result)).toBe(originalHistory);
});

it("rejects republishing a completed PASS after live deterministic evidence becomes invalid", () => {
  const checks = [
    { id: "M04-END-STRUCTURE", status: "passed" },
    { id: "M10-GITHUB-RUN-EVIDENCE", status: "passed" },
  ];
  const result = {
    completed: true,
    deterministic_checks: [...checks, { id: "CALIBRATION", status: "passed" }],
  };
  const verify = (nextChecks, nextResult = result) =>
    assertReusableDeterministicChecks(nextResult, nextChecks);
  expect(() => verify(checks)).not.toThrow();

  const invalid = [
    [{ ...checks[0], status: "ungradable" }, checks[1]],
    [checks[0], { ...checks[1], status: "blocked" }],
    [checks[0]],
    [checks[0], checks[0]],
    [{ ...checks[0], run_id: "another-run" }, checks[1]],
    [checks[0], { ...checks[1], target_sha: "a".repeat(40) }],
    [...checks, { id: "M07-PLAYWRIGHT-RUN-EVIDENCE", status: "passed" }],
    [{ ...checks[0], id: "OTHER-END-STRUCTURE" }, checks[1]],
  ];
  for (const changed of invalid) {
    expect(() => verify(changed)).toThrow(/create a new assessment/);
  }
  expect(() =>
    verify(checks, {
      ...result,
      deterministic_checks: [checks[0], checks[0], result.deterministic_checks[2]],
    }),
  ).toThrow(/create a new assessment/);
  expect(() => verify([], result)).toThrow(/create a new assessment/);

  // An incomplete historical result may retain its blocked state, but must
  // still describe the same current checks before it can be republished.
  const blocked = [
    { id: "M04-END-STRUCTURE", status: "passed" },
    { id: "M10-GITHUB-RUN-EVIDENCE", status: "blocked" },
  ];
  const incomplete = { completed: false, deterministic_checks: blocked };
  expect(() => verify(blocked, incomplete)).not.toThrow();
  expect(() => verify(checks, incomplete)).toThrow(/create a new assessment/);
});

it("requires exact evidence values even when live verification remains passed", () => {
  const oldChecks = [
    {
      id: "M10-GITHUB-RUN-EVIDENCE",
      status: "passed",
      checks: [
        { id: "M10-RUN", status: "passed", run_id: 123, workflow_run_head_sha: "a".repeat(40) },
        { id: "M10-ARTIFACT", status: "passed", digest: "sha256:" + "b".repeat(64) },
      ],
    },
  ];
  const result = {
    completed: true,
    deterministic_checks: [...oldChecks, { id: "CALIBRATION", status: "passed" }],
  };
  expect(() => assertReusableDeterministicChecks(result, oldChecks)).not.toThrow();

  for (const check of [
    {
      id: "M10-RUN",
      status: "passed",
      run_id: 124,
      workflow_run_head_sha: "a".repeat(40),
    },
    { id: "M10-ARTIFACT", status: "passed", digest: "sha256:" + "c".repeat(64) },
  ]) {
    const modified = oldChecks.map((entry) => ({
      ...entry,
      checks: entry.checks.map((item) => (item.id === check.id ? check : item)),
    }));
    expect(() => assertReusableDeterministicChecks(result, modified)).toThrow(
      /create a new assessment/,
    );
  }
});
