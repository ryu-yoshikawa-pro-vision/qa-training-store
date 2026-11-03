import { Buffer } from "node:buffer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  assertAssessmentPath,
  assertModelInputSize,
  atomicWriteJson,
  buildAssessmentAgentConfig,
  buildOpenCodeRunArgs,
  buildOpenCodeEnvironment,
  createLiveChallenge,
  createAttemptDirectory,
  finalizeAssessment,
  isPassingCalibration,
  assertNoSecretText,
  parseAssessmentArgs,
  parseOpenCodeJsonEvents,
  parseStrictJsonResponse,
  sha256,
  validateCandidate,
  validateSavedChallenge,
} from "../../scripts/training/ai-assisted-qa-assessment-core.mjs";
import {
  exportAssessment,
  filterPhaseKnowledgeGraph,
  obtainAssessmentCandidate,
  persistValidatedCandidate,
  persistCalibration,
  readAttemptCalibration,
  readChallengeAnswer,
  reconcileFinalizedAssessment,
  writeImmutableOpenCodePrompt,
} from "../../scripts/training/ai-assisted-qa-assessment.mjs";
import {
  runAiAssistedQaSpecCli,
  verifyM03SkillRuntimeEvidence,
  verifyModuleRunEvidence,
} from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-qa-assessment-contract-"));

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

it("never permits a failed or inconsistent calibration to be reused", () => {
  const passed = {
    status: "passed",
    critical_false_passes: 0,
    mismatches: [],
  };
  expect(isPassingCalibration(passed)).toBe(true);
  for (const calibration of [
    { ...passed, status: "failed" },
    { ...passed, critical_false_passes: 1 },
    { ...passed, mismatches: [{ case_id: "FALSE-PASS" }] },
    { ...passed, mismatches: null },
  ]) {
    expect(isPassingCalibration(calibration)).toBe(false);
  }
});

it("keeps failed calibrations per attempt and only caches successful calibrations", () => {
  const root = path.join(tempRoot, "calibration-cache");
  const cache = path.join(root, "shared.json");
  const makeAttempt = (name) => {
    const directory = path.join(root, name);
    fs.mkdirSync(directory, { recursive: true });
    return directory;
  };
  const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const failed = { status: "failed", critical_false_passes: 1, mismatches: ["case-1"] };
  const passed = { status: "passed", critical_false_passes: 0, mismatches: [] };
  const candidate = [{ case_id: "case-1", decision: "fail" }];

  const first = makeAttempt("first");
  persistCalibration({
    calibration: failed,
    calibrationPath: cache,
    attemptDirectory: first,
    caseResults: candidate,
  });
  expect(fs.existsSync(cache)).toBe(false);
  expect(read(path.join(first, "calibration-result.json"))).toEqual(failed);
  expect(read(path.join(first, "calibration-candidate.json"))).toEqual({
    case_results: candidate,
  });

  const second = makeAttempt("second");
  persistCalibration({
    calibration: passed,
    calibrationPath: cache,
    attemptDirectory: second,
    caseResults: candidate,
  });
  expect(read(cache)).toEqual(passed);

  const legacy = path.join(root, "legacy-failed.json");
  fs.writeFileSync(legacy, JSON.stringify(failed));
  const third = makeAttempt("third");
  persistCalibration({
    calibration: passed,
    calibrationPath: legacy,
    attemptDirectory: third,
    caseResults: candidate,
    existingCalibration: failed,
  });
  expect(read(legacy)).toEqual(failed);
  expect(read(path.join(third, "calibration-result.json"))).toEqual(passed);

  const concurrent = {
    ...passed,
    id: "same-id",
    identity: { model_id: "provider/model" },
    case_count: 1,
  };
  fs.writeFileSync(cache, JSON.stringify(concurrent));
  const fourth = makeAttempt("concurrent-match");
  expect(() =>
    persistCalibration({
      calibration: concurrent,
      calibrationPath: cache,
      attemptDirectory: fourth,
      caseResults: candidate,
    }),
  ).not.toThrow();
  expect(read(cache)).toEqual(concurrent);
  expect(read(path.join(fourth, "calibration-result.json"))).toEqual(concurrent);

  const fifth = makeAttempt("concurrent-mismatch");
  expect(() =>
    persistCalibration({
      calibration: { ...concurrent, identity: { model_id: "another/model" } },
      calibrationPath: cache,
      attemptDirectory: fifth,
      caseResults: candidate,
    }),
  ).toThrow(/concurrent model calibration differs/);
  expect(read(cache)).toEqual(concurrent);
});

it("reuses a pinned model candidate after interruption without another model call", async () => {
  const attemptDirectory = path.join(tempRoot, "resumed-ai-candidate");
  fs.mkdirSync(attemptDirectory, { recursive: true });
  const prompt = "Pinned learner evidence and live answer";
  const modelId = "provider/model";
  const version = "2.0.22";
  const result = { schema_version: 1, objectives: [] };
  let runs = 0;
  const evaluate = () =>
    obtainAssessmentCandidate({
      attemptDirectory,
      prompt,
      modelId,
      version,
      run: async () => {
        runs += 1;
        return { value: result, sessionId: "session-one" };
      },
    });
  expect(await evaluate()).toEqual({ value: result, sessionId: "session-one" });
  expect(await evaluate()).toEqual({ value: result, sessionId: "session-one" });
  expect(runs).toBe(1);
  await expect(
    obtainAssessmentCandidate({
      attemptDirectory,
      prompt: "Different learner answer",
      modelId,
      version,
      run: async () => {
        throw new Error("model must not run");
      },
    }),
  ).rejects.toThrow(/differs from the resumed assessment input/);
  const savedPath = path.join(attemptDirectory, "ai-candidate.json");
  const saved = JSON.parse(fs.readFileSync(savedPath, "utf8"));
  fs.writeFileSync(savedPath, JSON.stringify({ ...saved, model_id: "another/model" }));
  await expect(evaluate()).rejects.toThrow(/differs from the pinned evaluator input/);
  expect(runs).toBe(1);
});

it("reuses identical validated candidates but never silently replaces changed results", () => {
  const attemptDirectory = path.join(tempRoot, "resumed-validated-candidate");
  fs.mkdirSync(attemptDirectory, { recursive: true });
  const candidate = { schema_version: 1, objectives: [{ objective_id: "M04-01" }] };
  persistValidatedCandidate(attemptDirectory, candidate);
  expect(() =>
    persistValidatedCandidate(attemptDirectory, structuredClone(candidate)),
  ).not.toThrow();
  expect(() =>
    persistValidatedCandidate(attemptDirectory, {
      schema_version: 1,
      objectives: [{ objective_id: "M04-02" }],
    }),
  ).toThrow(/differs from the resumed input/);
});

it("resumes a verified attempt calibration without trusting missing or altered records", () => {
  const root = path.join(tempRoot, "saved-attempt-calibration");
  const cache = path.join(root, "cache.json");
  const attemptDirectory = path.join(root, "attempt");
  fs.mkdirSync(attemptDirectory, { recursive: true });
  const identity = { model_id: "provider/model", source_sha: "pinned" };
  const calibrationId = "calibration-identity";
  const expected = new Map([
    ["positive", ["pass"]],
    ["negative", ["fail"]],
  ]);
  const caseResults = [
    { case_id: "positive", decision: "pass", rationale: "supported" },
    { case_id: "negative", decision: "fail", rationale: "missing evidence" },
  ];
  const calibration = {
    id: calibrationId,
    identity,
    status: "passed",
    case_count: 2,
    mismatches: [],
    critical_false_passes: 0,
  };
  const read = () =>
    readAttemptCalibration({ attemptDirectory, calibrationId, identity, expected });
  expect(read()).toBeNull();
  persistCalibration({ calibration, calibrationPath: cache, attemptDirectory, caseResults });
  expect(read()).toEqual(calibration);
  expect(() =>
    persistCalibration({ calibration, calibrationPath: cache, attemptDirectory, caseResults }),
  ).toThrow(/immutable/);

  const resultPath = path.join(attemptDirectory, "calibration-result.json");
  const candidatePath = path.join(attemptDirectory, "calibration-candidate.json");
  fs.writeFileSync(resultPath, JSON.stringify({ ...calibration, status: "failed" }));
  expect(read).toThrow(/does not match its candidate/);
  fs.writeFileSync(resultPath, JSON.stringify(calibration));
  fs.writeFileSync(candidatePath, JSON.stringify({ case_results: [] }));
  expect(read).toThrow(/omitted one or more cases/);
  fs.unlinkSync(candidatePath);
  expect(read).toThrow(/incomplete or unsafe saved calibration/);
});

it("recovers an immutable result after summary and pointer publication were interrupted", () => {
  const workspaceRoot = path.join(tempRoot, "result-recovery");
  const phaseId = "P1";
  const assessmentId = "123e4567-e89b-42d3-a456-426614174000";
  const sourceSha = "pinned-source";
  const modelId = "provider/model";
  const phaseRoot = path.join(workspaceRoot, ".course-assessments", phaseId);
  const attempt = path.join(phaseRoot, "attempts", assessmentId);
  fs.mkdirSync(attempt, { recursive: true });
  const resultPath = path.join(attempt, "result.json");
  const result = {
    schema_version: 1,
    phase_id: phaseId,
    assessment_id: assessmentId,
    terminal_module_id: "M04",
    evaluator: { model_id: modelId },
    source_sha: sourceSha,
    status: "incomplete",
    completed: false,
    objectives: [],
    created_at: "2026-11-02T00:00:00.000Z",
  };
  atomicWriteJson(resultPath, result);
  fs.writeFileSync(path.join(attempt, "summary.md"), "awaiting_answer");
  const recover = () =>
    reconcileFinalizedAssessment({ workspaceRoot, phaseId, assessmentId, modelId, sourceSha });
  expect(recover()).toEqual(result);
  expect(fs.readFileSync(path.join(attempt, "summary.md"), "utf8")).toContain("未修了");
  const pointerPath = path.join(phaseRoot, "current.json");
  const pointer = JSON.parse(fs.readFileSync(pointerPath, "utf8"));
  expect(pointer.assessment_id).toBe(assessmentId);
  expect(pointer.result_sha256).toBe(sha256(fs.readFileSync(resultPath)));
  expect(recover()).toEqual(result);
  expect(JSON.parse(fs.readFileSync(pointerPath, "utf8"))).toEqual(pointer);

  const newerId = "123e4567-e89b-42d3-a456-426614174001";
  const newerPointer = {
    ...pointer,
    assessment_id: newerId,
    updated_at: "2026-11-03T00:00:00.000Z",
  };
  fs.writeFileSync(pointerPath, JSON.stringify(newerPointer));
  expect(recover()).toEqual(result);
  expect(JSON.parse(fs.readFileSync(pointerPath, "utf8"))).toEqual(newerPointer);

  const equalTimestampPointer = {
    ...newerPointer,
    updated_at: result.created_at,
  };
  fs.writeFileSync(pointerPath, JSON.stringify(equalTimestampPointer));
  expect(recover()).toEqual(result);
  expect(JSON.parse(fs.readFileSync(pointerPath, "utf8"))).toEqual(equalTimestampPointer);

  const lockPath = path.join(phaseRoot, ".current-publish.lock");
  fs.mkdirSync(lockPath);
  expect(recover).toThrow(/pointer publication is locked/);
  expect(JSON.parse(fs.readFileSync(pointerPath, "utf8"))).toEqual(equalTimestampPointer);
  fs.rmdirSync(lockPath);

  fs.writeFileSync(pointerPath, JSON.stringify({ ...newerPointer, updated_at: "not-a-date" }));
  expect(recover).toThrow(/current assessment pointer is invalid/);

  fs.writeFileSync(pointerPath, JSON.stringify(pointer));
  fs.writeFileSync(
    resultPath,
    JSON.stringify({ ...result, created_at: "2026-11-02T00:01:00.000Z" }),
  );
  expect(recover).toThrow(/does not match immutable result bytes/);
  expect(() =>
    reconcileFinalizedAssessment({
      workspaceRoot,
      phaseId,
      assessmentId,
      modelId: "other/model",
      sourceSha,
    }),
  ).toThrow(/differs from the prepared attempt/);
});

it("does not restore a fabricated completed result without verified evidence", () => {
  const workspaceRoot = path.join(tempRoot, "forged-completion");
  const phaseId = "P1";
  const assessmentId = "123e4567-e89b-42d3-a456-426614174002";
  const sourceSha = "pinned-source";
  const modelId = "provider/model";
  const attempt = path.join(
    workspaceRoot,
    ".course-assessments",
    phaseId,
    "attempts",
    assessmentId,
  );
  fs.mkdirSync(attempt, { recursive: true });
  const resultPath = path.join(attempt, "result.json");
  const result = {
    schema_version: 1,
    assessment_id: assessmentId,
    phase_id: phaseId,
    terminal_module_id: "M04",
    evaluator: { model_id: modelId },
    source_sha: sourceSha,
    status: "complete",
    completed: true,
    objectives: [],
    created_at: "2026-11-02T00:00:00.000Z",
  };
  const recover = () =>
    reconcileFinalizedAssessment({ workspaceRoot, phaseId, assessmentId, modelId, sourceSha });
  fs.writeFileSync(resultPath, JSON.stringify(result));
  expect(recover).toThrow(/saved assessment input manifest/);
  fs.writeFileSync(
    path.join(attempt, "input-manifest.json"),
    JSON.stringify({
      assessment_id: assessmentId,
      phase_id: phaseId,
      source_sha: sourceSha,
      evaluator_model_id: modelId,
      objective_ids: ["M04-01"],
    }),
  );
  expect(recover).toThrow(/saved validated assessment candidate/);
  fs.writeFileSync(resultPath, JSON.stringify({ ...result, completed: false }));
  expect(recover).toThrow(/completion status is inconsistent/);
});

it("restores a completed result only with the matching candidate and passing calibration", () => {
  const workspaceRoot = path.join(tempRoot, "completed-result-recovery");
  const phaseId = "P1";
  const assessmentId = "123e4567-e89b-42d3-a456-426614174003";
  const sourceSha = "pinned-source";
  const modelId = "provider/model";
  const assetHashes = { curriculum: "pinned-hash" };
  const calibrationIdentity = {
    model_id: modelId,
    opencode_version: "2.0.22",
    calibration_prompt_sha256: "calibration-prompt",
    evaluator_prompt_sha256: "evaluator-prompt",
    asset_hashes: assetHashes,
  };
  const calibrationId = sha256(JSON.stringify(calibrationIdentity));
  const candidate = {
    schema_version: 1,
    assessment_id: assessmentId,
    phase_id: phaseId,
    objectives: [
      {
        objective_id: "M04-01",
        status: "assessed",
        level: 2,
        criterion_ids: ["M04-CR-01"],
        evidence_ids: ["E-M04-01-LIVE"],
        rationale: "Verified independent explanation",
        gaps: [],
        review_paths: ["course/modules/M04/README.md"],
        unmet_knowledge_nodes: [],
      },
    ],
  };
  const calibration = {
    id: calibrationId,
    status: "passed",
    critical_false_passes: 0,
    mismatches: [],
    identity: calibrationIdentity,
    case_count: 1,
  };
  const result = finalizeAssessment({
    candidate,
    calibration,
    sourceSha,
    versions: {
      attempt: 1,
      terminalModuleId: "M04",
      modelId,
      openCodeVersion: "2.0.22",
      asset_hashes: assetHashes,
      calibration_prompt_sha256: calibrationIdentity.calibration_prompt_sha256,
      evaluator_prompt_sha256: calibrationIdentity.evaluator_prompt_sha256,
    },
    inputSnapshot: [{ evidence_id: "E-M04-01-LIVE", path: "workspace/M04/answers.md" }],
    deterministicChecks: [{ id: "M04-END", status: "passed" }],
    challenge: { id: "CH-P1-1", objective_ids: ["M04-01"] },
    now: "2026-11-02T00:00:00.000Z",
  });
  expect(result.completed).toBe(true);
  const phaseRoot = path.join(workspaceRoot, ".course-assessments", phaseId);
  const attempt = path.join(phaseRoot, "attempts", assessmentId);
  const calibrationDir = path.join(workspaceRoot, ".course-assessments", "calibrations");
  fs.mkdirSync(attempt, { recursive: true });
  fs.mkdirSync(calibrationDir, { recursive: true });
  const candidatePath = path.join(attempt, "validated-candidate.json");
  const calibrationPath = path.join(calibrationDir, `${calibrationId}.json`);
  fs.writeFileSync(path.join(attempt, "result.json"), JSON.stringify(result));
  fs.writeFileSync(
    path.join(attempt, "input-manifest.json"),
    JSON.stringify({
      assessment_id: assessmentId,
      phase_id: phaseId,
      source_sha: sourceSha,
      evaluator_model_id: modelId,
      objective_ids: ["M04-01"],
    }),
  );
  fs.writeFileSync(candidatePath, JSON.stringify(candidate));
  fs.writeFileSync(calibrationPath, JSON.stringify({ ...calibration, status: "failed" }));
  fs.writeFileSync(path.join(attempt, "calibration-result.json"), JSON.stringify(calibration));
  fs.writeFileSync(
    path.join(attempt, "calibration-candidate.json"),
    JSON.stringify({ case_results: [{ case_id: "positive", decision: "pass" }] }),
  );
  const recover = () =>
    reconcileFinalizedAssessment({ workspaceRoot, phaseId, assessmentId, modelId, sourceSha });
  // A successful attempt must remain recoverable despite a legacy failed cache.
  expect(recover().completed).toBe(true);
  expect(JSON.parse(fs.readFileSync(path.join(phaseRoot, "current.json"), "utf8"))).toMatchObject({
    assessment_id: assessmentId,
  });
  const attemptCalibrationPath = path.join(attempt, "calibration-result.json");
  const attemptCandidatePath = path.join(attempt, "calibration-candidate.json");
  fs.unlinkSync(attemptCandidatePath);
  expect(recover).toThrow(/incomplete attempt calibration/);
  fs.unlinkSync(attemptCalibrationPath);
  expect(recover).toThrow(/lacks consistent verified mastery evidence/);
  // A prior passing shared cache is valid when no per-attempt calibration was run.
  fs.writeFileSync(calibrationPath, JSON.stringify(calibration));
  expect(recover().completed).toBe(true);

  fs.writeFileSync(candidatePath, JSON.stringify({ ...candidate, objectives: [] }));
  expect(recover).toThrow(/lacks consistent verified mastery evidence/);
  fs.writeFileSync(candidatePath, JSON.stringify(candidate));
  fs.writeFileSync(calibrationPath, JSON.stringify({ ...calibration, status: "failed" }));
  expect(recover).toThrow(/lacks consistent verified mastery evidence/);
});

it("bounds calibration and assessment prompts by UTF-8 byte length", () => {
  const atLimit = "a".repeat(4 * 1024 * 1024);
  expect(() => assertModelInputSize(atLimit, "calibration prompt")).not.toThrow();
  expect(() => assertModelInputSize(atLimit + "あ", "calibration prompt")).toThrow(
    "calibration prompt exceeds the size limit",
  );
  expect(() => assertModelInputSize(null, "assessment prompt")).toThrow(
    "assessment prompt exceeds the size limit",
  );
});

it("reads only a nonempty learner answer after the explicit answer heading", () => {
  const directory = path.join(tempRoot, "live-answer-section");
  fs.mkdirSync(directory, { recursive: true });
  const answerPath = path.join(directory, "answers.md");
  const challenge = { objective_ids: ["M04-01"] };
  const preamble = "# Phase assessment answer\n\n## M04-01\n\nQuestion text only\n\n";
  const put = (content) => fs.writeFileSync(answerPath, content, "utf8");

  put(`${preamble}### Your answer\n\n`);
  expect(() => readChallengeAnswer(answerPath, challenge)).toThrow(/nonempty answer/);
  put(`${preamble}### Your answer\n\n[Write your independent decision]`);
  expect(() => readChallengeAnswer(answerPath, challenge)).toThrow(/nonempty answer/);
  put(`${preamble}A learner reply without a dedicated answer section`);
  expect(() => readChallengeAnswer(answerPath, challenge)).toThrow(/answer section/);
  put(`${preamble}### Your answer\n\nIndependent reasoning\n`);
  const parsed = readChallengeAnswer(answerPath, challenge);
  expect(parsed.answer).toBe("Independent reasoning");
  expect(parsed.answer).not.toContain("Question text only");
  expect(parsed.answer_sha256).toBe(sha256("Independent reasoning"));

  put(
    "# Phase assessment answer\r\n\r\n## M04-01\r\n\r\nQuestion\r\n\r\n" +
      "### Your answer\r\n\r\nRevised answer\r\n",
  );
  expect(readChallengeAnswer(answerPath, challenge).answer).toBe("Revised answer");
});

it("reuses only byte-identical OpenCode prompts after an interrupted assessment", () => {
  const directory = path.join(tempRoot, "interrupted-opencode");
  fs.mkdirSync(directory, { recursive: true });
  for (const fileName of ["calibration-prompt.md", "assessment-prompt.md"]) {
    const promptPath = path.join(directory, fileName);
    const prompt = "検証対象と入力SHAを固定する";
    writeImmutableOpenCodePrompt(promptPath, prompt);
    expect(fs.readFileSync(promptPath, "utf8")).toBe(prompt);
    expect(() => writeImmutableOpenCodePrompt(promptPath, prompt)).not.toThrow();
    expect(() => writeImmutableOpenCodePrompt(promptPath, prompt + "変更")).toThrow(
      "saved OpenCode prompt differs from the resumed assessment input",
    );
    expect(fs.readFileSync(promptPath, "utf8")).toBe(prompt);
  }
  const directoryPath = path.join(directory, "not-a-file.md");
  fs.mkdirSync(directoryPath);
  expect(() => writeImmutableOpenCodePrompt(directoryPath, "prompt")).toThrow(
    "saved OpenCode prompt differs from the resumed assessment input",
  );
});

it("accepts the M07 diagnostic failure spec with a supported main label", () => {
  const root = path.join(tempRoot, "missing-source-sha");
  expect(() =>
    runAiAssistedQaSpecCli(["M07", "failure-assertion.spec.ts", "--label", "main"], { root }),
  ).toThrow("course:run requires the verified distribution source SHA");
  expect(() =>
    runAiAssistedQaSpecCli(["M07", "failure-assertion.spec.ts", "--label", "diagnostic"], { root }),
  ).toThrow(/Usage: pnpm course:run/);
});

it("keeps the selected Phase assessment node and its objective links in evaluator sources", () => {
  const graph = {
    schema_version: 1,
    nodes: [
      { id: "P1", type: "phase" },
      { id: "ASSESS-P1", type: "assessment", phase: "P1" },
      { id: "M00-01", type: "learning_objective", module: "M00" },
      { id: "P2", type: "phase" },
      { id: "ASSESS-P2", type: "assessment", phase: "P2" },
      { id: "M05-01", type: "learning_objective", module: "M05" },
      { id: "P3", type: "phase" },
      { id: "ASSESS-P3", type: "assessment", phase: "P3" },
      { id: "M08-01", type: "learning_objective", module: "M08" },
    ],
    edges: [
      { from: "ASSESS-P1", to: "M00-01", relation: "evaluates" },
      { from: "ASSESS-P1", to: "P1", relation: "part_of" },
      { from: "ASSESS-P2", to: "M05-01", relation: "evaluates" },
      { from: "ASSESS-P2", to: "P2", relation: "part_of" },
      { from: "ASSESS-P3", to: "M08-01", relation: "evaluates" },
      { from: "ASSESS-P3", to: "P3", relation: "part_of" },
    ],
  };
  for (const [phaseId, moduleId] of [
    ["P1", "M00"],
    ["P2", "M05"],
    ["P3", "M08"],
  ]) {
    const phase = JSON.parse(filterPhaseKnowledgeGraph(JSON.stringify(graph), [moduleId], phaseId));
    expect(phase.nodes.map((node) => node.id)).toEqual([
      phaseId,
      `ASSESS-${phaseId}`,
      `${moduleId}-01`,
    ]);
    expect(phase.edges).toEqual([
      { from: `ASSESS-${phaseId}`, to: `${moduleId}-01`, relation: "evaluates" },
      { from: `ASSESS-${phaseId}`, to: phaseId, relation: "part_of" },
    ]);
  }
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
      "M00-01": [
        "course/modules/M00/README.md",
        "workspace/M00/submission.md",
        "course/modules/M00/README.md#k-m00-01",
      ],
      "M00-02": [
        "course/modules/M00/README.md",
        "workspace/M00/submission.md",
        "course/modules/M00/README.md#k-m00-03",
      ],
    },
    knowledgeNodeIdsByObjective: { "M00-01": ["K-M00-01"], "M00-02": ["K-M00-03"] },
    knowledgeReviewPathsByNode: {
      "K-M00-01": "course/modules/M00/README.md#k-m00-01",
      "K-M00-03": "course/modules/M00/README.md#k-m00-03",
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

  it("blocks provider secrets in learner evidence and answers", () => {
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

  it("isolates evaluator sessions with documented OpenCode v2 flags", () => {
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

  it("generates live questions from pinned terminal module sources", () => {
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
          sources: ["docs/curriculum/ai-assisted-qa/modules/" + moduleId + "/README.md"],
          criteria: [
            {
              id: moduleId + "-CR-01",
              objective_ids: [objectiveId],
              required_evidence: ["source-backed independent decision"],
            },
          ],
        },
        sourceMaterials: [
          {
            path: "docs/curriculum/ai-assisted-qa/modules/" + moduleId + "/README.md",
            sha256: "b".repeat(64),
          },
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

  it("rejects changed live challenges and unrelated source selections on resume", () => {
    const uuid = "123e4567-e89b-42d3-a456-426614174000";
    const source = "docs/curriculum/ai-assisted-qa/modules/M07/README.md";
    const graphSource = "docs/curriculum/ai-assisted-qa/knowledge-graph.json";
    const scoring = {
      module_id: "M07",
      objective_ids: ["M07-01"],
      sources: [source, graphSource],
      criteria: [
        { id: "M07-CR-01", objective_ids: ["M07-01"], required_evidence: ["Diagnose failed test"] },
      ],
    };
    const sourceMaterials = [
      { path: source, sha256: "b".repeat(64) },
      { path: graphSource, sha256: "c".repeat(64) },
    ];
    const context = {
      phaseId: "P2",
      scoring,
      sourceMaterials,
      sourceSha: "a".repeat(40),
      assessmentId: uuid,
    };
    const challenge = createLiveChallenge({
      ...context,
      id: uuid,
      randomIndex: () => 0,
    });
    expect(validateSavedChallenge(challenge, context)).toEqual(challenge);
    expect(validateSavedChallenge(JSON.parse(JSON.stringify(challenge)), context)).toEqual(
      challenge,
    );

    const changedChallenges = [
      [{ ...challenge, condition: `${challenge.condition} altered` }, /differs/],
      [{ ...challenge, condition_sha256: "f".repeat(64) }, /differs/],
      [{ ...challenge, source_sha: "f".repeat(40) }, /differs/],
      [{ ...challenge, source_sha256: "f".repeat(64) }, /differs/],
      [{ ...challenge, objective_ids: ["M07-02"] }, /invalid objective, source, or condition/],
      [{ ...challenge, criterion_ids: ["M07-CR-02"] }, /differs/],
      [{ ...challenge, source_path: graphSource }, /invalid objective, source, or condition/],
      [{ ...challenge, objective_ids: "M07-01" }, /identity does not match/],
      [{ ...challenge, objective_ids: ["M07-01", "M07-02"] }, /identity does not match/],
      [
        Object.fromEntries(Object.entries(challenge).filter(([key]) => key !== "condition")),
        /differs/,
      ],
      [{ ...challenge, extra: true }, /differs/],
    ];
    for (const [changedChallenge, error] of changedChallenges) {
      expect(() => validateSavedChallenge(changedChallenge, context)).toThrow(error);
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

  it("requires a concrete failure reason and maps only allowed knowledge nodes", () => {
    const context = expected();
    expect(() =>
      validateCandidate(candidate({ objective: [{ level: 1, gaps: [] }] }), context),
    ).toThrow(/explain unmet criteria/);
    expect(() =>
      validateCandidate(
        candidate({
          objective: [
            { level: 1, gaps: ["insufficient explanation"], unmet_knowledge_nodes: ["K-M05-14"] },
          ],
        }),
        context,
      ),
    ).toThrow(/unrelated knowledge node/);
    const partial = validateCandidate(
      candidate({
        objective: [
          { level: 1, gaps: ["No independent explanation"], unmet_knowledge_nodes: ["K-M00-01"] },
        ],
      }),
      context,
    );
    expect(partial.objectives[0].review_paths).toContain("course/modules/M00/README.md#k-m00-01");
    expect(partial.objectives[0].unmet_knowledge_nodes).toEqual(["K-M00-01"]);
    expect(() =>
      validateCandidate(
        candidate({
          objective: [{ review_paths: ["course/modules/M00/README.md#unknown"] }],
        }),
        context,
      ),
    ).toThrow(/review path/);
    expect(() =>
      validateCandidate(
        candidate({
          objective: [{ unmet_knowledge_nodes: ["K-M00-01"] }],
        }),
        context,
      ),
    ).toThrow(/passing objective/);
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
      calibration: { id: "cal-1", status: "passed", critical_false_passes: 0, mismatches: [] },
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
      finalizeAssessment({
        ...args,
        calibration: { ...args.calibration, critical_false_passes: 1 },
      }),
    ).toMatchObject({ status: "blocked", completed: false });
    expect(
      finalizeAssessment({
        ...args,
        calibration: { ...args.calibration, mismatches: [{ case_id: "FALSE-PASS" }] },
      }),
    ).toMatchObject({ status: "blocked", completed: false });
    expect(
      finalizeAssessment({
        ...args,
        calibration: { ...args.calibration, mismatches: null },
      }),
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

it("does not overwrite an immutable assessment result created during publication", () => {
  const directory = path.join(tempRoot, "concurrent-assessment-result");
  fs.mkdirSync(directory, { recursive: true });
  const resultPath = path.join(directory, "result.json");
  const originalLink = fs.linkSync.bind(fs);
  const intercepted = vi.spyOn(fs, "linkSync").mockImplementationOnce((source, destination) => {
    // Another resume process wins the race after existsSync, before publication.
    fs.writeFileSync(destination, '{"completed":false}', { flag: "wx" });
    return originalLink(source, destination);
  });
  try {
    expect(() => atomicWriteJson(resultPath, { completed: true })).toThrow(/immutable/);
  } finally {
    intercepted.mockRestore();
  }
  expect(JSON.parse(fs.readFileSync(resultPath, "utf8"))).toEqual({ completed: false });
  expect(fs.readdirSync(directory)).toEqual(["result.json"]);
});

it("exports a finalized assessment once without copying unexpected files", () => {
  const root = path.join(tempRoot, "assessment-export");
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const attempt = path.join(root, ".course-assessments", "P1", "attempts", id);
  fs.mkdirSync(attempt, { recursive: true });
  fs.writeFileSync(path.join(attempt, "result.json"), '{"completed":false}');
  fs.writeFileSync(path.join(attempt, "answers.md"), "private learner answer");
  fs.writeFileSync(path.join(attempt, "unrelated-secret.txt"), "must stay private");
  exportAssessment("P1", id, root);
  const target = path.join(root, "course-assessment-exports", id);
  expect(fs.readdirSync(target).sort()).toEqual(["answers.md", "result.json"]);
  expect(fs.readFileSync(path.join(target, "answers.md"), "utf8")).toBe("private learner answer");
  expect(() => exportAssessment("P1", id, root)).toThrow(/already exists/);
});

it.skipIf(process.platform === "win32")("rejects unsafe export symlinks", () => {
  const root = path.join(tempRoot, "assessment-export-symlinks");
  const outside = path.join(tempRoot, "export-outside");
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const phaseRoot = path.join(root, ".course-assessments", "P1");
  const attempt = path.join(phaseRoot, "attempts", id);
  fs.mkdirSync(attempt, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(attempt, "result.json"), '{"completed":false}');

  fs.symlinkSync(outside, path.join(root, "course-assessment-exports"), "dir");
  expect(() => exportAssessment("P1", id, root)).toThrow(/symlink/);
  expect(fs.readdirSync(outside)).toEqual([]);
  fs.unlinkSync(path.join(root, "course-assessment-exports"));

  fs.renameSync(path.join(root, ".course-assessments"), path.join(root, "moved-attempts"));
  fs.symlinkSync(path.join(root, "moved-attempts"), path.join(root, ".course-assessments"), "dir");
  expect(() => exportAssessment("P1", id, root)).toThrow(/symlink/);
});
