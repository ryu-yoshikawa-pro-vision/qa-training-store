import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const ASSESSMENT_PHASES = Object.freeze({
  P1: { terminal: "M04", modules: ["M00", "M01", "M02", "M03", "M04"] },
  P2: { terminal: "M07", modules: ["M05", "M06", "M07"] },
  P3: { terminal: "M10", modules: ["M08", "M09", "M10"] },
});

export const ASSESSMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._#-]*$/i;
export const MAX_EVIDENCE_FILE_BYTES = 256 * 1024;
export const MAX_EVIDENCE_TOTAL_BYTES = 2 * 1024 * 1024;
export const LIVE_CHALLENGE_DIMENSIONS = Object.freeze({
  P1: ["対象データ", "操作順序", "期待結果", "仕様未決の前提"],
  P2: ["初期状態", "LocatorまたはAssertionの原因", "再実行条件", "実行証拠"],
  P3: ["対象SHA", "workflowの起動条件", "権限または費用", "Artifactの照合"],
});

const SAFE_REVIEW_PATH =
  /^(?:course\/modules\/M(?:0[0-9]|10)\/README\.md|course\/exercises\/M(?:0[0-9]|10)\/exercise\.md|workspace\/M(?:0[0-9]|10)\/[A-Za-z0-9._/-]+)$/;
const SECRET_PATTERN =
  /(?:\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bsk-proj-[A-Za-z0-9_-]{20,}\b|\bsk-ant-api\d+-[A-Za-z0-9_-]{20,}\b|\bsk-[A-Za-z0-9]{48,}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}\b|\bglpat-[A-Za-z0-9_-]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\b[A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|SECRET_ACCESS_KEY|CLIENT_SECRET|PASSWORD)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const SAFE_STATUS = new Set(["assessed", "not_run", "ungradable", "blocked"]);
const OBJECTIVE_FIELDS = new Set([
  "objective_id",
  "status",
  "level",
  "criterion_ids",
  "evidence_ids",
  "rationale",
  "gaps",
  "review_paths",
]);

function fail(message) {
  throw new Error(message);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildOpenCodeEnvironment({
  source = process.env,
  platform = process.platform,
  extra = {},
} = {}) {
  const allowed =
    platform === "win32"
      ? [
          "PATH",
          "PATHEXT",
          "SystemRoot",
          "WINDIR",
          "ComSpec",
          "USERPROFILE",
          "APPDATA",
          "LOCALAPPDATA",
          "HOMEDRIVE",
          "HOMEPATH",
          "TEMP",
          "TMP",
        ]
      : [
          "PATH",
          "HOME",
          "XDG_CONFIG_HOME",
          "XDG_DATA_HOME",
          "XDG_CACHE_HOME",
          "TMPDIR",
          "LANG",
          "LC_ALL",
          "TERM",
        ];
  const environment = Object.fromEntries(
    allowed.filter((name) => source[name] !== undefined).map((name) => [name, source[name]]),
  );
  return { ...environment, ...extra };
}

export function buildOpenCodeRunArgs({ modelId, agentId, promptPath }) {
  if (!MODEL_ID_PATTERN.test(modelId ?? "")) fail("OpenCode model ID is invalid");
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(agentId ?? "")) fail("OpenCode agent ID is invalid");
  if (typeof promptPath !== "string" || !path.isAbsolute(promptPath))
    fail("OpenCode prompt path must be absolute");
  return [
    "run",
    "--standalone",
    "--pure",
    "--model",
    modelId,
    "--agent",
    agentId,
    "--format",
    "json",
    "--file",
    promptPath,
    "Return only the exact JSON object required by your system prompt.",
  ];
}

export function buildAssessmentAgentConfig({ modelId, agentId, systemPrompt }) {
  if (!MODEL_ID_PATTERN.test(modelId ?? "")) fail("OpenCode model ID is invalid");
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(agentId ?? "")) fail("OpenCode agent ID is invalid");
  if (typeof systemPrompt !== "string" || !systemPrompt.trim())
    fail("OpenCode assessment system prompt is required");
  return {
    $schema: "https://opencode.ai/config.json",
    model: modelId,
    autoupdate: false,
    agents: {
      [agentId]: {
        mode: "primary",
        model: modelId,
        description: "Read-only QA course assessment candidate evaluator",
        system: systemPrompt,
        permissions: [{ action: "*", resource: "*", effect: "deny" }],
      },
    },
  };
}

export function createLiveChallenge({
  phaseId,
  scoring,
  sourceMaterials,
  sourceSha,
  id,
  randomIndex,
}) {
  const phase = ASSESSMENT_PHASES[phaseId];
  if (
    !phase ||
    !scoring ||
    scoring.module_id !== phase.terminal ||
    !Array.isArray(scoring.objective_ids)
  )
    fail("live challenge must use the terminal module's pinned scoring asset");
  if (typeof randomIndex !== "function" || !ASSESSMENT_ID_PATTERN.test(id ?? ""))
    fail("live challenge requires a bounded random selector and UUID");
  const objectiveId = scoring.objective_ids[randomIndex(scoring.objective_ids.length)];
  if (typeof objectiveId !== "string" || !objectiveId.startsWith(`${phase.terminal}-`))
    fail("terminal scoring asset contains an invalid live objective ID");
  const criterion = scoring.criteria?.find((item) => item.objective_ids?.includes(objectiveId));
  const dimensions = LIVE_CHALLENGE_DIMENSIONS[phaseId];
  const sourceCandidates = (scoring.sources ?? [])
    .map((sourcePath) => sourceMaterials.find((item) => item.path === sourcePath))
    .filter(Boolean);
  if (
    !criterion ||
    !Array.isArray(criterion.required_evidence) ||
    !criterion.required_evidence.length ||
    !sourceCandidates.length
  )
    fail(`could not build a source-bounded live challenge for ${objectiveId}`);
  const source = sourceCandidates[randomIndex(sourceCandidates.length)];
  const dimension = dimensions[randomIndex(dimensions.length)];
  const targetRequirement =
    criterion.required_evidence[randomIndex(criterion.required_evidence.length)];
  const condition = [
    `対象目標: ${objectiveId}`,
    `評価基準: ${criterion.id}`,
    `適用する基準の一部: ${targetRequirement}`,
    `今回変える観点: ${dimension}`,
    `固定された参照元: ${source.path}`,
    "課題: 公開の完成例と異なる小さな条件を自分で一つ作り、参照元のどの規則を使うか、期待する結果、確認に必要な証拠、まだ決められない点を説明してください。参照元が結果を定めていない場合は推測せず、未決として示してください。",
  ].join("\n");
  return {
    id: `CH-${phaseId}-${id}`,
    objective_ids: [objectiveId],
    criterion_ids: [criterion.id],
    source_path: source.path,
    source_sha: sourceSha,
    source_sha256: source.sha256,
    variation_dimension: dimension,
    target_requirement: targetRequirement,
    condition,
    condition_sha256: sha256(condition),
  };
}

export function parseAssessmentArgs(args) {
  const [moduleId, ...options] = args;
  const phase = Object.entries(ASSESSMENT_PHASES).find(
    ([, value]) => value.terminal === moduleId,
  )?.[0];
  if (!phase) fail("Usage: course:assess M04|M07|M10 --model provider/model-id");
  const values = new Map();
  for (let index = 0; index < options.length; index += 1) {
    const flag = options[index];
    if (!["--model", "--resume", "--history", "--export"].includes(flag))
      fail(`unsupported course:assess option: ${flag}`);
    if (values.has(flag)) fail(`duplicate course:assess option: ${flag}`);
    if (flag === "--history") {
      values.set(flag, true);
      continue;
    }
    const value = options[index + 1];
    if (!value || value.startsWith("--")) fail(`${flag} requires a value`);
    values.set(flag, value);
    index += 1;
  }
  const actionCount = Number(values.has("--history")) + Number(values.has("--export"));
  if (actionCount > 1) fail("--history and --export cannot be combined");
  if (values.has("--history")) {
    if (values.has("--model") || values.has("--resume"))
      fail("--history does not accept --model or --resume");
    return { action: "history", moduleId, phase };
  }
  if (values.has("--export")) {
    if (values.has("--model") || values.has("--resume"))
      fail("--export does not accept --model or --resume");
    if (phase === "P3") fail("Git-free export is available for Phase 1 and Phase 2 only");
    if (!ASSESSMENT_ID_PATTERN.test(values.get("--export")))
      fail("--export requires an assessment UUID");
    return { action: "export", moduleId, phase, assessmentId: values.get("--export") };
  }
  const modelId = values.get("--model");
  if (!modelId || !MODEL_ID_PATTERN.test(modelId))
    fail("--model must be one explicit provider/model-id; automatic model fallback is disabled");
  const resumeId = values.get("--resume");
  if (resumeId && !ASSESSMENT_ID_PATTERN.test(resumeId))
    fail("--resume requires an assessment UUID");
  return { action: "run", moduleId, phase, modelId, resumeId };
}

export function assertNoSecretText(text, label = "assessment input") {
  if (typeof text !== "string") fail(`${label} must be text`);
  if (SECRET_PATTERN.test(text))
    fail(`${label} may contain a Secret; nothing was sent to the model`);
}

export function parseOpenCodeJsonEvents(stdout, exitCode = 0) {
  if (exitCode !== 0) fail(`OpenCode exited with code ${exitCode}`);
  if (typeof stdout !== "string" || !stdout.trim()) fail("OpenCode returned no JSON event stream");
  const textParts = [];
  let terminalStop = false;
  let sessionId;
  for (const [index, line] of stdout.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      fail(`OpenCode emitted malformed JSON on event line ${index + 1}`);
    }
    if (!event || typeof event !== "object" || typeof event.type !== "string")
      fail(`OpenCode emitted an invalid event on line ${index + 1}`);
    if (event.type === "error" || event.type === "tool_use" || event.type === "tool")
      fail(`OpenCode emitted a tool/error event (${event.type}); evaluation stops`);
    if (
      event.part?.type === "tool" ||
      event.part?.type === "tool_use" ||
      event.part?.type === "tool_result"
    )
      fail("OpenCode attempted a tool call; evaluation stops");
    if (event.type === "text" && event.part?.type === "text") {
      if (typeof event.part.text !== "string") fail("OpenCode text event has no text payload");
      textParts.push(event.part.text);
    }
    if (event.type === "step_finish") {
      const reason = event.reason ?? event.part?.reason;
      if (reason === "tool-calls" || reason === "length" || reason === "error")
        fail(`OpenCode did not finish a clean text response (${reason})`);
      terminalStop = true;
    }
    const candidateSession = event.sessionID ?? event.sessionId;
    if (typeof candidateSession === "string") {
      if (sessionId && sessionId !== candidateSession)
        fail("OpenCode stream contains multiple sessions");
      sessionId = candidateSession;
    }
  }
  if (!terminalStop) fail("OpenCode event stream has no terminal step_finish event");
  if (!textParts.length) fail("OpenCode event stream contains no text response");
  const response = textParts.join("").trim();
  if (!response) fail("OpenCode returned an empty text response");
  assertNoSecretText(response, "OpenCode response");
  return { response, sessionId };
}

export function parseStrictJsonResponse(response) {
  try {
    return JSON.parse(response);
  } catch {
    fail("OpenCode response is not a single JSON document");
  }
}

export function validateCandidate(candidate, expected) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
    fail("AI candidate must be a JSON object");
  const allowedTopLevel = new Set([
    "schema_version",
    "assessment_id",
    "phase_id",
    "objectives",
    "completed",
    "pass",
  ]);
  if (Object.keys(candidate).some((key) => !allowedTopLevel.has(key)))
    fail("AI candidate has unsupported top-level fields");
  if (
    candidate.schema_version !== 1 ||
    candidate.assessment_id !== expected.assessmentId ||
    candidate.phase_id !== expected.phaseId
  )
    fail("AI candidate schema, assessment ID, or Phase ID does not match the active attempt");
  if (!Array.isArray(candidate.objectives)) fail("AI candidate has no objective array");
  const byId = new Map();
  for (const objective of candidate.objectives) {
    if (!objective || typeof objective !== "object" || Array.isArray(objective))
      fail("AI candidate contains a malformed objective");
    if (Object.keys(objective).some((key) => !OBJECTIVE_FIELDS.has(key)))
      fail("AI candidate objective has unsupported fields");
    if (typeof objective.objective_id !== "string" || byId.has(objective.objective_id))
      fail("AI candidate contains a missing or duplicate objective ID");
    if (!expected.objectiveIds.includes(objective.objective_id))
      fail(`AI candidate introduced an objective outside this Phase: ${objective.objective_id}`);
    if (!SAFE_STATUS.has(objective.status))
      fail(`AI candidate has an invalid status for ${objective.objective_id}`);
    if (objective.status === "assessed") {
      if (!Number.isInteger(objective.level) || objective.level < 0 || objective.level > 3)
        fail(`AI candidate Level is outside 0-3 for ${objective.objective_id}`);
    } else if (objective.level !== null) {
      fail(`unassessed objective must have a null Level: ${objective.objective_id}`);
    }
    if (!Array.isArray(objective.criterion_ids) || !objective.criterion_ids.length)
      fail(`AI candidate has no criterion reference for ${objective.objective_id}`);
    if (
      objective.criterion_ids.some(
        (id) => !expected.criteriaByObjective[objective.objective_id]?.includes(id),
      )
    )
      fail(`AI candidate references an unrelated criterion for ${objective.objective_id}`);
    if (!Array.isArray(objective.evidence_ids))
      fail(`AI candidate evidence IDs are malformed for ${objective.objective_id}`);
    if (objective.evidence_ids.some((id) => !expected.evidenceIds.has(id)))
      fail(
        `AI candidate references evidence outside the verified snapshot for ${objective.objective_id}`,
      );
    const allowedEvidenceIds = expected.evidenceIdsByObjective?.[objective.objective_id];
    if (
      !Array.isArray(allowedEvidenceIds) ||
      objective.evidence_ids.some((id) => !allowedEvidenceIds.includes(id))
    )
      fail(`AI candidate references evidence not assigned to ${objective.objective_id}`);
    if (objective.status === "assessed" && objective.evidence_ids.length === 0)
      fail(
        `AI candidate cannot assess an objective without verified evidence: ${objective.objective_id}`,
      );
    const requiredEvidenceIds =
      expected.requiredEvidenceIdsByObjective?.[objective.objective_id] ?? [];
    if (
      objective.status === "assessed" &&
      requiredEvidenceIds.some((id) => !objective.evidence_ids.includes(id))
    )
      fail(`AI candidate omitted required live challenge evidence for ${objective.objective_id}`);
    if (typeof objective.rationale !== "string" || !objective.rationale.trim())
      fail(`AI candidate has no rationale for ${objective.objective_id}`);
    assertNoSecretText(objective.rationale, `AI rationale for ${objective.objective_id}`);
    if (!Array.isArray(objective.gaps) || objective.gaps.some((gap) => typeof gap !== "string"))
      fail(`AI candidate gaps are malformed for ${objective.objective_id}`);
    if (!Array.isArray(objective.review_paths) || objective.review_paths.length === 0)
      fail(`AI candidate has no review path for ${objective.objective_id}`);
    const moduleId = objective.objective_id.slice(0, 3);
    const allowedReviewPaths = expected.reviewPathsByObjective?.[objective.objective_id];
    if (
      !Array.isArray(allowedReviewPaths) ||
      objective.review_paths.some(
        (reviewPath) =>
          !SAFE_REVIEW_PATH.test(reviewPath) ||
          !allowedReviewPaths.includes(reviewPath) ||
          (!reviewPath.startsWith(`course/modules/${moduleId}/`) &&
            !reviewPath.startsWith(`course/exercises/${moduleId}/`) &&
            !reviewPath.startsWith(`workspace/${moduleId}/`)),
      )
    )
      fail(`AI candidate review path is outside the objective module: ${objective.objective_id}`);
    for (const gap of objective.gaps)
      assertNoSecretText(gap, `AI gap for ${objective.objective_id}`);
    byId.set(objective.objective_id, objective);
  }
  if (
    byId.size !== expected.objectiveIds.length ||
    expected.objectiveIds.some((id) => !byId.has(id))
  )
    fail("AI candidate must include every required Phase objective exactly once");
  return {
    schema_version: 1,
    assessment_id: expected.assessmentId,
    phase_id: expected.phaseId,
    objectives: expected.objectiveIds.map((id) => byId.get(id)),
  };
}

export function finalizeAssessment({
  candidate,
  calibration,
  sourceSha,
  versions,
  inputSnapshot,
  deterministicChecks,
  challenge,
  previousAssessmentId = null,
  now = new Date().toISOString(),
}) {
  const objectives = candidate.objectives.map((item) => ({ ...item }));
  const completed =
    calibration?.status === "passed" &&
    deterministicChecks.every((check) => check.status === "passed") &&
    objectives.every((item) => item.status === "assessed" && item.level >= 2);
  const hasBlocked =
    objectives.some((item) => item.status === "blocked") ||
    deterministicChecks.some((check) => check.status === "blocked");
  const hasUngradable =
    objectives.some((item) => item.status === "ungradable") ||
    deterministicChecks.some((check) => check.status === "ungradable");
  const status = completed
    ? "complete"
    : hasBlocked || calibration?.status !== "passed"
      ? "blocked"
      : hasUngradable
        ? "ungradable"
        : "incomplete";
  return {
    schema_version: 1,
    assessment_id: candidate.assessment_id,
    attempt: versions.attempt,
    phase_id: candidate.phase_id,
    terminal_module_id: versions.terminalModuleId,
    status,
    completed,
    source_sha: sourceSha,
    versions: { ...versions },
    evaluator: {
      model_id: versions.modelId,
      opencode_version: versions.openCodeVersion,
      calibration_id: calibration?.id ?? null,
    },
    input_snapshot: inputSnapshot.map(({ evidence_id, path: evidencePath, sha256: digest }) => ({
      evidence_id,
      path: evidencePath,
      sha256: digest,
    })),
    deterministic_checks: deterministicChecks,
    challenge: {
      id: challenge.id,
      objective_ids: challenge.objective_ids,
      criterion_ids: challenge.criterion_ids,
      source_path: challenge.source_path,
      source_sha: challenge.source_sha,
      source_sha256: challenge.source_sha256,
      variation_dimension: challenge.variation_dimension,
      condition_sha256: challenge.condition_sha256,
      answer_sha256: challenge.answer_sha256,
    },
    objectives,
    previous_assessment_id: previousAssessmentId,
    created_at: now,
  };
}

function ensureSafeParents(root, relativePath) {
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, relativePath);
  const rel = path.relative(absoluteRoot, absolute);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel))
    fail(`assessment path escapes its private root: ${relativePath}`);
  let current = absoluteRoot;
  for (const part of rel.split(path.sep)) {
    if (!part) continue;
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      fail(`assessment path must not include a symlink: ${relativePath}`);
  }
  return absolute;
}

export function atomicWriteJson(filePath, value, { replace = false } = {}) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(directory).isSymbolicLink())
    fail("assessment result directory must not be a symlink");
  if (fs.existsSync(filePath) && !replace)
    fail(`assessment result already exists and is immutable: ${filePath}`);
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temporaryPath, "wx", 0o600);
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    try {
      fs.unlinkSync(temporaryPath);
    } catch {}
    throw error;
  }
}

export function createAttemptDirectory(workspaceRoot, phaseId, assessmentId = randomUUID()) {
  if (!Object.hasOwn(ASSESSMENT_PHASES, phaseId) || !ASSESSMENT_ID_PATTERN.test(assessmentId))
    fail("invalid assessment Phase or ID");
  const attemptDirectory = ensureSafeParents(
    workspaceRoot,
    `.course-assessments/${phaseId}/attempts/${assessmentId}`,
  );
  const parentDirectory = path.dirname(attemptDirectory);
  fs.mkdirSync(parentDirectory, { recursive: true, mode: 0o700 });
  ensureSafeParents(workspaceRoot, `.course-assessments/${phaseId}/attempts/${assessmentId}`);
  fs.mkdirSync(attemptDirectory, { recursive: false, mode: 0o700 });
  if (fs.lstatSync(attemptDirectory).isSymbolicLink())
    fail("assessment attempt must not be a symlink");
  return attemptDirectory;
}

export function assertAssessmentPath(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.includes("\\") ||
    relativePath.split("/").some((part) => !part || part === "." || part === "..")
  )
    fail("assessment path must be a normalized POSIX relative path");
  return ensureSafeParents(workspaceRoot, relativePath);
}
