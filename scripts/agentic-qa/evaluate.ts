import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { benchmarkRevisionFromManifest } from "./benchmark-revision";
import {
  answerKeySchema,
  benchmarkManifestSchema,
  challengeIdSchema,
  challengeSchema,
  compareCodeUnits,
  evidenceRefSyntaxError,
  evidenceMappingSchema,
  evaluationSchema,
  parseJsonWithSchema,
  qaFindingsSchema,
  runnerSessionSchema,
  runIdSchema,
  toolProfileSchema,
  forbiddenProbeResultsSchema,
  officialRunnerProfileSchema,
  type AnswerItem,
  type AnswerKey,
  type Challenge,
  type Evaluation,
  type Finding,
  type QaFindings,
  type RunnerProfile,
  type ToolProfile,
} from "./contracts";
import { assertCoverageIntegrity } from "./coverage";
import { assertForbiddenProbePasses, type ForbiddenProbeResult } from "./isolation";
import { createRunnerProfile } from "./runner";
import { canonicalJson, readCanonicalJsonFile, writeCanonicalJsonFile } from "./canonical-json";
import { optionValue } from "./cli";
import { validateOfficialArtifacts, type OfficialArtifactLocations } from "./official-verification";
import { agenticQaRef, agenticQaRunRoot } from "./artifact-layout";

type ActiveAnswerItem = Extract<AnswerItem, { kind: "defect" | "non-defect" }>;

export type EvaluationOptions = {
  rootDir?: string;
  sourceHeadSha?: string | null;
  /** Backward-compatible alias for expectedRuntimeVariantId. */
  runtimeVariantId?: string | null;
  expectedRuntimeVariantId?: string | null;
  expectedBenchmarkRevision?: string;
  expectedRunnerProfile?: RunnerProfile;
  expectedToolProfileRevision?: RunnerProfile["tool_profile_revision"];
  expectedToolProfile?: ToolProfile;
  runnerSessionArtifactPath?: string;
  forbiddenProbeArtifactPath?: string;
  evaluatorSessionArtifactPath?: string;
  isolationFailure?: boolean;
  toolScopeFailure?: boolean;
  preparationFailure?: boolean;
  environmentBlocker?: boolean;
  benchmarkGroundTruthChanged?: boolean;
  evaluatorSessionId?: string;
  officialArtifactLocations?: OfficialArtifactLocations;
};

function coverageComplete(findings: QaFindings, coverageId: string): boolean {
  return findings.coverage.items.some(
    (item) => item.coverage_id === coverageId && item.status === "completed",
  );
}

const MACHINE_EVIDENCE_TYPES = new Set(["dom", "accessibility", "console", "narrow_log", "trace"]);

export function safeArtifactPath(rootDir: string, runId: string, ref: string): string | null {
  if (
    !runIdSchema.safeParse(runId).success ||
    runId.includes("/") ||
    runId.includes("\\") ||
    runId.includes("..") ||
    path.isAbsolute(runId)
  )
    return null;
  const runPrefix = `${agenticQaRef(runId, "input").slice(0, -"input".length)}`;
  if (
    !ref.startsWith(runPrefix) ||
    ref.includes("\\") ||
    ref.split("/").includes("..") ||
    path.isAbsolute(ref)
  )
    return null;
  const root = path.resolve(rootDir);
  const candidate = path.resolve(root, ...ref.split("/"));
  const rootRelative = path.relative(root, candidate);
  const currentRunRoot = agenticQaRunRoot(root, runId);
  const relative = path.relative(currentRunRoot, candidate);
  if (
    rootRelative === ".." ||
    rootRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(rootRelative) ||
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    return null;
  return candidate;
}

function configuredRunArtifactPath(
  rootDir: string,
  runId: string,
  configuredPath: string | undefined,
  defaultRef: string,
): string | null {
  const root = path.resolve(rootDir);
  const ref =
    configuredPath === undefined
      ? defaultRef
      : path.relative(root, path.resolve(root, configuredPath)).split(path.sep).join("/");
  return safeArtifactPath(root, runId, ref);
}

function artifactText(
  rootDir: string,
  runId: string,
  ref: string,
  requireExisting: boolean,
): string | null {
  const filePath = safeArtifactPath(rootDir, runId, ref);
  if (filePath === null || !fs.existsSync(filePath)) return requireExisting ? null : "";
  try {
    if (!fs.statSync(filePath).isFile()) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function evidenceSupportsObservation(
  rootDir: string,
  runId: string,
  evidence: Finding["evidence"][number],
  expectedObservation: string,
  requireExisting: boolean,
): boolean {
  if (!MACHINE_EVIDENCE_TYPES.has(evidence.type)) return false;
  const content = artifactText(rootDir, runId, evidence.ref, requireExisting);
  if (content === null) return false;
  return normalizeText(content).includes(normalizeText(expectedObservation));
}

function evidenceSatisfies(
  finding: Finding,
  item: ActiveAnswerItem,
  rootDir: string,
  runId: string,
  requireExisting: boolean,
): boolean {
  const expectation = normalizeText(item.evidence_expectation);
  const actualDeviation = normalizeText(item.required_observation);
  return finding.evidence.some((evidence) => {
    return (
      evidenceSupportsObservation(rootDir, runId, evidence, expectation, requireExisting) ||
      evidenceSupportsObservation(rootDir, runId, evidence, actualDeviation, requireExisting)
    );
  });
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function expectedBehaviorMatches(finding: Finding, item: ActiveAnswerItem): boolean {
  return normalizeText(finding.expected) === normalizeText(item.expected_behavior);
}

function reproductionMatches(finding: Finding, item: ActiveAnswerItem): boolean {
  return (
    normalizeText(finding.reproduction_condition) ===
    normalizeText(item.minimum_reproduction_condition)
  );
}

function actualDeviationMatches(finding: Finding, item: ActiveAnswerItem): boolean {
  return normalizeText(finding.actual).includes(normalizeText(item.required_observation));
}

function oracleMatches(finding: Finding, item: ActiveAnswerItem): boolean {
  return finding.oracle_refs.some((reference) => item.oracle_refs.includes(reference));
}

function coverageMatches(finding: Finding, item: ActiveAnswerItem): boolean {
  return (
    finding.evidence.some((evidence) => evidence.ref.includes(item.related_coverage_id)) ||
    finding.seed_scenario === item.related_coverage_id ||
    finding.steps.some((step) => step.includes(item.related_coverage_id))
  );
}

function findingCanBeMatched(finding: Finding, item: ActiveAnswerItem): boolean {
  return (
    oracleMatches(finding, item) &&
    coverageMatches(finding, item) &&
    reproductionMatches(finding, item) &&
    expectedBehaviorMatches(finding, item) &&
    finding.evidence.length > 0
  );
}

function findingMatchesWithoutVerifiableEvidence(
  finding: Finding,
  item: ActiveAnswerItem,
): boolean {
  return (
    findingCanBeMatched(finding, item) &&
    actualDeviationMatches(finding, item) &&
    normalizeText(finding.expected) !== normalizeText(finding.actual)
  );
}

function activeFinding(finding: Finding): boolean {
  return finding.status !== "discarded" && finding.status !== "duplicate";
}

function coverageEvidenceSupportsObservation(
  findings: QaFindings,
  item: ActiveAnswerItem,
  rootDir: string,
  requireExisting: boolean,
): boolean {
  const coverageItem = findings.coverage.items.find(
    (coverage) => coverage.coverage_id === item.related_coverage_id,
  );
  if (coverageItem === undefined || coverageItem.status !== "completed") return false;
  return coverageItem.evidence_refs.some((ref, index) => {
    const type = coverageItem.evidence_types[index];
    if (type === undefined) return false;
    return evidenceSupportsObservation(
      rootDir,
      findings.run_id,
      { type, ref, description: "" },
      item.evidence_expectation,
      requireExisting,
    );
  });
}

function itemObservationSeen(
  findings: QaFindings,
  item: ActiveAnswerItem,
  rootDir: string,
  requireExisting: boolean,
): boolean {
  return (
    coverageEvidenceSupportsObservation(findings, item, rootDir, requireExisting) ||
    findings.findings.some(
      (finding) =>
        activeFinding(finding) &&
        coverageComplete(findings, item.related_coverage_id) &&
        expectedBehaviorMatches(finding, item) &&
        actualDeviationMatches(finding, item) &&
        evidenceSatisfies(finding, item, rootDir, findings.run_id, requireExisting),
    )
  );
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function allNullMetrics(): Evaluation["metrics"] {
  return {
    recall: null,
    precision: null,
    false_positive_rate: null,
    evidence_quality: null,
    reproducibility: null,
    severity_accuracy: null,
    coverage: null,
    duplicate_rate: null,
  };
}

function evidenceIntegrityIsValid(
  findings: Extract<QaFindings, { mode: "black-box-scored" }>,
  rootDir: string,
): boolean {
  const runRoot = agenticQaRunRoot(rootDir, findings.run_id);
  const evidenceMappingPath = path.join(runRoot, "runner", "evidence-mapping.json");
  let evidenceMapping: ReturnType<typeof evidenceMappingSchema.parse>;
  try {
    evidenceMapping = parseJsonWithSchema(
      readCanonicalJsonFile(evidenceMappingPath),
      evidenceMappingSchema,
      "frozen evidence mapping",
    );
  } catch {
    return false;
  }
  const physicalByCanonicalRef = new Map(
    evidenceMapping.mappings.map((mapping) => [
      mapping.canonical_ref,
      mapping.physical_output_path,
    ]),
  );
  const validate = (ref: string, type: Parameters<typeof evidenceRefSyntaxError>[1]): boolean => {
    if (evidenceRefSyntaxError(ref, type) !== null) return false;
    if (type === "url") return true;
    const physicalOutputPath = physicalByCanonicalRef.get(ref);
    if (physicalOutputPath === undefined) return false;
    const runnerRoot = path.join(runRoot, "runner");
    const filePath = path.resolve(runnerRoot, ...physicalOutputPath.split("/"));
    const relative = path.relative(runnerRoot, filePath);
    if (
      relative === "" ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative) ||
      !fs.existsSync(filePath)
    )
      return false;
    try {
      return fs.lstatSync(filePath).isFile();
    } catch {
      return false;
    }
  };
  for (const coverage of findings.coverage.items) {
    if (coverage.evidence_refs.length !== coverage.evidence_types.length) return false;
    for (let index = 0; index < coverage.evidence_refs.length; index += 1) {
      const ref = coverage.evidence_refs[index];
      const type = coverage.evidence_types[index];
      if (ref === undefined || type === undefined || !validate(ref, type)) return false;
    }
  }
  return findings.findings.every((finding) =>
    finding.evidence.every((evidence) => validate(evidence.ref, evidence.type)),
  );
}

function officialVerificationFailures(
  options: EvaluationOptions,
  findings: Extract<QaFindings, { mode: "black-box-scored" }>,
): string[] {
  const failures: string[] = [];
  const expectedToolProfile = options.expectedToolProfile;
  if (
    options.expectedBenchmarkRevision !== undefined &&
    options.expectedBenchmarkRevision !== findings.benchmark_revision
  )
    failures.push("benchmark identity differs from the evaluator expectation");
  if (
    options.expectedRunnerProfile !== undefined &&
    canonicalJson(options.expectedRunnerProfile) !== canonicalJson(findings.runner_profile)
  )
    failures.push("runner profile differs from the evaluator expectation");
  if (
    options.expectedToolProfileRevision !== undefined &&
    options.expectedToolProfileRevision !== findings.runner_profile.tool_profile_revision
  )
    failures.push("tool profile revision differs from the evaluator's profile file bytes");
  const expectedRuntimeVariantId =
    options.expectedRuntimeVariantId !== undefined
      ? options.expectedRuntimeVariantId
      : options.runtimeVariantId;
  if (
    expectedRuntimeVariantId !== undefined &&
    expectedRuntimeVariantId !== findings.runtime_variant_id
  )
    failures.push("runtime variant differs from the evaluator expectation");

  const rootDir = options.rootDir ?? process.cwd();
  let embeddedForbiddenProbe: ForbiddenProbeResult[] | undefined;
  const runnerSessionFile = configuredRunArtifactPath(
    rootDir,
    findings.run_id,
    options.runnerSessionArtifactPath,
    agenticQaRef(findings.run_id, "runner", "runner-session.json"),
  );
  let runnerSession: ReturnType<typeof runnerSessionSchema.parse> | undefined;
  if (runnerSessionFile === null) {
    failures.push("runner session artifact path is unsafe");
  } else {
    try {
      runnerSession = parseJsonWithSchema(
        readJson(runnerSessionFile),
        runnerSessionSchema,
        "runner session artifact",
      );
    } catch {
      runnerSession = undefined;
    }
  }
  if (runnerSession === undefined && runnerSessionFile !== null) {
    failures.push("runner session artifact is missing or invalid");
  }
  if (runnerSession !== undefined) {
    if (runnerSession.execution_kind !== "official_model_backed")
      failures.push("runner session is not official model-backed");
    if (runnerSession.runner_session_id !== findings.runner_session_id)
      failures.push("runner session identity differs from findings");
    if (runnerSession.run_id !== findings.run_id)
      failures.push("runner session run_id differs from findings");
    if (runnerSession.model_identifier !== findings.runner_profile.model)
      failures.push("model identifier was not independently observed");
    if (runnerSession.benchmark_revision !== findings.benchmark_revision)
      failures.push("runner session benchmark revision differs");
    if (runnerSession.runtime_variant_id !== findings.runtime_variant_id)
      failures.push("runner session runtime variant differs");
    if (
      !runnerSession.fresh_session ||
      !runnerSession.session_artifact_new ||
      !findings.fresh_session
    )
      failures.push("fresh session was not proven by the runner artifact");
    if (!runnerSession.actual_tool_scope.measured || !runnerSession.tool_scope_probe_passed)
      failures.push("actual runner tool scope was not measured");
    if (runnerSession.forbidden_probe.some((result) => result.available))
      failures.push("embedded forbidden probe reports a reachable capability");
    embeddedForbiddenProbe = runnerSession.forbidden_probe;
    if (expectedToolProfile !== undefined) {
      try {
        assertForbiddenProbePasses(expectedToolProfile, runnerSession.forbidden_probe);
      } catch {
        failures.push("embedded forbidden probe does not exactly match the tool profile");
      }
    }

    const forbiddenProbeFile = configuredRunArtifactPath(
      rootDir,
      findings.run_id,
      options.forbiddenProbeArtifactPath,
      runnerSession.forbidden_probe_artifact,
    );
    let externalForbiddenProbe: ForbiddenProbeResult[] | undefined;
    if (forbiddenProbeFile === null || !fs.existsSync(forbiddenProbeFile)) {
      failures.push("forbidden probe artifact is missing");
    } else {
      try {
        const probe = parseJsonWithSchema(
          readJson(forbiddenProbeFile),
          forbiddenProbeResultsSchema,
          "forbidden probe artifact",
        );
        if (probe.some((result) => result.available))
          failures.push("forbidden probe artifact reports a reachable capability");
        externalForbiddenProbe = probe;
        if (expectedToolProfile !== undefined) {
          try {
            assertForbiddenProbePasses(expectedToolProfile, probe);
          } catch {
            failures.push("forbidden probe artifact does not exactly match the tool profile");
          }
        }
      } catch {
        failures.push("forbidden probe artifact is invalid");
      }
    }
    if (
      embeddedForbiddenProbe !== undefined &&
      externalForbiddenProbe !== undefined &&
      JSON.stringify(
        embeddedForbiddenProbe
          .map((result) => `${result.capability}:${result.available}`)
          .sort(compareCodeUnits),
      ) !==
        JSON.stringify(
          externalForbiddenProbe
            .map((result) => `${result.capability}:${result.available}`)
            .sort(compareCodeUnits),
        )
    )
      failures.push("embedded and external forbidden probes disagree");
  }

  const evaluatorSessionFile = configuredRunArtifactPath(
    rootDir,
    findings.run_id,
    options.evaluatorSessionArtifactPath,
    agenticQaRef(findings.run_id, "evaluation", "evaluator-session.json"),
  );
  if (evaluatorSessionFile === null || !fs.existsSync(evaluatorSessionFile)) {
    failures.push("evaluator session artifact is missing");
  } else {
    try {
      const value = readJson(evaluatorSessionFile);
      if (typeof value !== "object" || value === null) throw new Error("not an object");
      const record = value as Record<string, unknown>;
      if (record.runner_session_id !== findings.runner_session_id)
        failures.push("evaluator artifact runner identity differs");
      if (record.evaluator_session_id !== options.evaluatorSessionId)
        failures.push("evaluator artifact identity differs");
      if (record.runner_session_reused !== false)
        failures.push("evaluator session reuse was not ruled out");
    } catch {
      failures.push("evaluator session artifact is invalid");
    }
  }
  if (findings.execution_kind === "official_model_backed") {
    const artifactVerification = validateOfficialArtifacts(
      options.officialArtifactLocations ?? {
        rootDir,
        runRoot: agenticQaRunRoot(rootDir, findings.run_id),
      },
    );
    failures.push(
      ...artifactVerification.failures.map((failure) => `official artifact: ${failure}`),
    );
  }
  return failures;
}

function invalidReasonSet(
  options: EvaluationOptions,
  findings: Extract<QaFindings, { mode: "black-box-scored" }>,
): string[] {
  const reasons = new Set<string>();
  if (
    options.environmentBlocker === true ||
    findings.coverage.items.some((item) => item.status === "blocked_environment")
  )
    reasons.add("environment_blocker");
  if (options.isolationFailure === true) reasons.add("isolation_failure");
  if (options.toolScopeFailure === true) reasons.add("tool_scope_failure");
  if (options.preparationFailure === true) reasons.add("preparation_failure");
  if (findings.execution_kind === "contract_fixture") reasons.add("fixture_not_official");
  if (!findings.fresh_session) reasons.add("isolation_failure");
  if (!findings.tool_scope_validated) reasons.add("tool_scope_failure");
  if (
    options.evaluatorSessionId !== undefined &&
    options.evaluatorSessionId === findings.runner_session_id
  )
    reasons.add("isolation_failure");
  if (findings.coverage.items.some((item) => item.status === "not_completed"))
    reasons.add("coverage_integrity_failure");
  if (
    options.benchmarkGroundTruthChanged === true ||
    findings.findings.some((finding) => finding.status === "unexpected_valid_finding")
  )
    reasons.add("benchmark_ground_truth_changed");
  if (
    options.expectedBenchmarkRevision !== undefined &&
    options.expectedBenchmarkRevision !== findings.benchmark_revision
  )
    reasons.add("benchmark_identity_mismatch");
  if (
    options.expectedRunnerProfile !== undefined &&
    canonicalJson(options.expectedRunnerProfile) !== canonicalJson(findings.runner_profile)
  )
    reasons.add("runner_profile_mismatch");
  const hasExpectedRuntimeVariant =
    options.expectedRuntimeVariantId !== undefined || options.runtimeVariantId !== undefined;
  const expectedRuntimeVariantId =
    options.expectedRuntimeVariantId !== undefined
      ? options.expectedRuntimeVariantId
      : options.runtimeVariantId;
  if (hasExpectedRuntimeVariant && expectedRuntimeVariantId !== findings.runtime_variant_id)
    reasons.add("benchmark_identity_mismatch");
  if (findings.execution_kind === "official_model_backed") {
    if (officialVerificationFailures(options, findings).length > 0)
      reasons.add("official_verification_failure");
    if (!evidenceIntegrityIsValid(findings, options.rootDir ?? process.cwd()))
      reasons.add("evidence_integrity_failure");
  }
  return [...reasons].sort(compareCodeUnits);
}

function matchDefectFinding(
  finding: Finding,
  item: ActiveAnswerItem,
  rootDir: string,
  runId: string,
  requireExisting: boolean,
): boolean {
  return (
    item.kind === "defect" &&
    findingCanBeMatched(finding, item) &&
    actualDeviationMatches(finding, item) &&
    evidenceSatisfies(finding, item, rootDir, runId, requireExisting) &&
    normalizeText(finding.expected) !== normalizeText(finding.actual)
  );
}

function evidenceQuality(
  finding: Finding,
  item: ActiveAnswerItem,
  rootDir: string,
  runId: string,
  requireExisting: boolean,
): number {
  const checks = [
    oracleMatches(finding, item),
    finding.steps.length > 0 && finding.reproduction_count > 0,
    finding.evidence.length > 0,
    actualDeviationMatches(finding, item) &&
      evidenceSatisfies(finding, item, rootDir, runId, requireExisting),
    finding.expected.trim() !== "" &&
      finding.actual.trim() !== "" &&
      normalizeText(finding.expected) !== normalizeText(finding.actual),
  ];
  return checks.filter(Boolean).length / checks.length;
}

function reproducibility(finding: Finding): number {
  if (finding.reproduction_count >= 2) return 1;
  if (finding.reproduction_count === 1 && finding.evidence.length >= 2) return 0.5;
  return 0;
}

function severityAccuracy(finding: Finding, item: Extract<AnswerItem, { kind: "defect" }>): number {
  const order = ["low", "medium", "high", "critical"];
  const actual = order.indexOf(finding.severity);
  const expected = order.indexOf(item.expected_severity);
  return Math.abs(actual - expected) <= item.allowed_severity_delta ? 1 : 0;
}

function assertScoredInputs(
  challenge: Challenge,
  answerKey: AnswerKey,
  findings: QaFindings,
): asserts findings is Extract<QaFindings, { mode: "black-box-scored" }> {
  if (findings.mode !== "black-box-scored")
    throw new Error("Evaluator accepts black-box-scored qa-findings only");
  if (
    findings.challenge_id !== challenge.challenge_id ||
    answerKey.challenge_id !== challenge.challenge_id
  )
    throw new Error("Challenge / Answer Key / qa-findings IDs do not match");
  assertCoverageIntegrity(challenge, findings.coverage);
}

export function evaluateBlackBox(
  challenge: Challenge,
  answerKey: AnswerKey,
  rawFindings: QaFindings,
  options: EvaluationOptions = {},
): Evaluation {
  assertScoredInputs(challenge, answerKey, rawFindings);
  const findings = rawFindings;
  const evaluatorSessionId = options.evaluatorSessionId ?? crypto.randomUUID();
  const effectiveOptions: EvaluationOptions = { ...options, evaluatorSessionId };
  const evidenceRootDir = effectiveOptions.rootDir ?? process.cwd();
  const requireEvidenceArtifacts = findings.execution_kind === "official_model_backed";
  const matches: Evaluation["matches"] = [];
  const matchedDefectItems = new Set<string>();
  const countedFindingIds = new Set<string>();
  const evidenceScores: number[] = [];
  const reproducibilityScores: number[] = [];
  const severityScores: number[] = [];
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let fpNonDefect = 0;
  let notEvaluatedNonDefect = 0;
  let duplicates = 0;
  let invalidNonAtomic = 0;

  const defectItems = answerKey.items.filter(
    (item): item is Extract<AnswerItem, { kind: "defect" }> => item.kind === "defect",
  );
  const nonDefectItems = answerKey.items.filter(
    (item): item is Extract<AnswerItem, { kind: "non-defect" }> => item.kind === "non-defect",
  );

  for (const finding of findings.findings) {
    if (finding.status === "discarded") continue;
    if (finding.status === "candidate") {
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: null,
        coverage_id: null,
        classification: "review_needed",
        required_observation_satisfied: null,
        adjudication: "human",
      });
      continue;
    }
    if (finding.status === "duplicate" || finding.duplicate_of !== null) {
      duplicates += 1;
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: null,
        coverage_id: null,
        classification: "duplicate",
        required_observation_satisfied: null,
        adjudication: "automatic",
      });
      continue;
    }
    if (finding.status === "invalid_non_atomic") {
      invalidNonAtomic += 1;
      fp += 1;
      countedFindingIds.add(finding.finding_id);
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: null,
        coverage_id: null,
        classification: "invalid_non_atomic",
        required_observation_satisfied: null,
        adjudication: "automatic",
      });
      continue;
    }
    if (finding.status === "unexpected_valid_finding") {
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: null,
        coverage_id: null,
        classification: "unexpected_valid_finding",
        required_observation_satisfied: null,
        adjudication: "human",
      });
      continue;
    }

    const matchedDefect = defectItems.find(
      (item) =>
        !matchedDefectItems.has(item.item_id) &&
        matchDefectFinding(
          finding,
          item,
          evidenceRootDir,
          findings.run_id,
          requireEvidenceArtifacts,
        ),
    );
    if (matchedDefect !== undefined) {
      matchedDefectItems.add(matchedDefect.item_id);
      countedFindingIds.add(finding.finding_id);
      tp += 1;
      evidenceScores.push(
        evidenceQuality(
          finding,
          matchedDefect,
          evidenceRootDir,
          findings.run_id,
          requireEvidenceArtifacts,
        ),
      );
      reproducibilityScores.push(reproducibility(finding));
      severityScores.push(severityAccuracy(finding, matchedDefect));
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: matchedDefect.item_id,
        coverage_id: matchedDefect.related_coverage_id,
        classification: "tp",
        required_observation_satisfied: evidenceSatisfies(
          finding,
          matchedDefect,
          evidenceRootDir,
          findings.run_id,
          requireEvidenceArtifacts,
        ),
        adjudication: "automatic",
      });
      continue;
    }

    const unverifiableDefect = defectItems.find(
      (item) =>
        !matchedDefectItems.has(item.item_id) &&
        findingMatchesWithoutVerifiableEvidence(finding, item),
    );
    if (unverifiableDefect !== undefined) {
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: unverifiableDefect.item_id,
        coverage_id: unverifiableDefect.related_coverage_id,
        classification: "review_needed",
        required_observation_satisfied: false,
        adjudication: "human",
      });
      continue;
    }

    const matchedNonDefect = nonDefectItems.find((item) => findingCanBeMatched(finding, item));
    if (
      matchedNonDefect !== undefined &&
      coverageComplete(findings, matchedNonDefect.related_coverage_id) &&
      evidenceSatisfies(
        finding,
        matchedNonDefect,
        evidenceRootDir,
        findings.run_id,
        requireEvidenceArtifacts,
      )
    ) {
      fp += 1;
      fpNonDefect += 1;
      countedFindingIds.add(finding.finding_id);
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: matchedNonDefect.item_id,
        coverage_id: matchedNonDefect.related_coverage_id,
        classification: "fp_non_defect",
        required_observation_satisfied: true,
        adjudication: "automatic",
      });
      continue;
    }

    if (
      matchedNonDefect !== undefined &&
      coverageComplete(findings, matchedNonDefect.related_coverage_id)
    ) {
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: matchedNonDefect.item_id,
        coverage_id: matchedNonDefect.related_coverage_id,
        classification: "review_needed",
        required_observation_satisfied: false,
        adjudication: "human",
      });
      continue;
    }

    fp += 1;
    countedFindingIds.add(finding.finding_id);
    matches.push({
      finding_id: finding.finding_id,
      answer_item_id: null,
      coverage_id: null,
      classification: "fp",
      required_observation_satisfied: null,
      adjudication: "automatic",
    });
  }

  for (const item of defectItems) {
    if (!matchedDefectItems.has(item.item_id)) {
      fn += 1;
      matches.push({
        finding_id: null,
        answer_item_id: item.item_id,
        coverage_id: item.related_coverage_id,
        classification: "fn",
        required_observation_satisfied: false,
        adjudication: "automatic",
      });
    }
  }

  for (const item of nonDefectItems) {
    if (
      matches.some(
        (match) =>
          match.answer_item_id === item.item_id && match.classification === "fp_non_defect",
      )
    )
      continue;
    const observed =
      coverageComplete(findings, item.related_coverage_id) &&
      itemObservationSeen(findings, item, evidenceRootDir, requireEvidenceArtifacts);
    if (observed) {
      tn += 1;
      matches.push({
        finding_id: null,
        answer_item_id: item.item_id,
        coverage_id: item.related_coverage_id,
        classification: "tn",
        required_observation_satisfied: true,
        adjudication: "automatic",
      });
    } else {
      notEvaluatedNonDefect += 1;
      matches.push({
        finding_id: null,
        answer_item_id: item.item_id,
        coverage_id: item.related_coverage_id,
        classification: "ne",
        required_observation_satisfied: false,
        adjudication: "automatic",
      });
    }
  }

  const invalidReasons = invalidReasonSet(effectiveOptions, findings);
  if (matches.some((match) => match.classification === "review_needed"))
    invalidReasons.push("preparation_failure");
  const uniqueReasons = [...new Set(invalidReasons)].sort(compareCodeUnits);
  const validForScoring = uniqueReasons.length === 0;
  const requiredCoverage = challenge.required_coverage.length;
  const completedCoverage = findings.coverage.items.filter(
    (item) => item.status === "completed",
  ).length;
  const metricValues = {
    recall: ratio(tp, tp + fn),
    precision: ratio(tp, tp + fp),
    false_positive_rate: ratio(fpNonDefect, fpNonDefect + tn),
    evidence_quality: ratio(
      evidenceScores.reduce((sum, value) => sum + value, 0),
      evidenceScores.length,
    ),
    reproducibility: ratio(
      reproducibilityScores.reduce((sum, value) => sum + value, 0),
      reproducibilityScores.length,
    ),
    severity_accuracy: ratio(
      severityScores.reduce((sum, value) => sum + value, 0),
      severityScores.length,
    ),
    coverage: ratio(completedCoverage, requiredCoverage),
    duplicate_rate: ratio(
      duplicates,
      findings.findings.filter((finding) => finding.status !== "discarded").length,
    ),
  };
  const counts: Evaluation["counts"] = {
    tp,
    fp,
    fn,
    tn,
    fp_non_defect: fpNonDefect,
    not_evaluated_non_defect: notEvaluatedNonDefect,
    duplicates,
    invalid_non_atomic: invalidNonAtomic,
    blocked_environment_coverage: findings.coverage.items.filter(
      (item) => item.status === "blocked_environment",
    ).length,
  };
  const evaluation: Evaluation = {
    schema_version: 1,
    run_id: findings.run_id,
    challenge_id: findings.challenge_id,
    benchmark_revision: findings.benchmark_revision,
    source_head_sha:
      options.sourceHeadSha === undefined ? findings.source_head_sha : options.sourceHeadSha,
    runtime_variant_id: findings.runtime_variant_id,
    runner_profile: findings.runner_profile,
    mode: "black-box-scored",
    execution_kind: findings.execution_kind,
    runner_session_id: findings.runner_session_id,
    evaluator_session_id: evaluatorSessionId,
    fresh_session: findings.fresh_session,
    tool_scope_validated: findings.tool_scope_validated,
    valid_for_scoring: validForScoring,
    invalid_reasons: uniqueReasons as Evaluation["invalid_reasons"],
    matches,
    counts,
    metrics: validForScoring ? metricValues : allNullMetrics(),
  };
  return parseJsonWithSchema(evaluation, evaluationSchema, "evaluation");
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid JSON at ${path.relative(process.cwd(), filePath).replace(/\\/g, "/")}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

export function selectBenchmarkManifestFile(runDir: string, challengeId: string): string {
  const rootDir = path.resolve(runDir, "..", "..", "..");
  const runRoot = agenticQaRunRoot(rootDir, path.basename(runDir));
  const manifestFile = path.join(runRoot, "trusted", "benchmark-manifest.json");
  if (!fs.existsSync(manifestFile))
    throw new Error(
      `Canonical benchmark manifest is missing for ${challengeId}: ${path.relative(rootDir, manifestFile)}`,
    );
  return manifestFile;
}

if (isMainModule()) {
  const cliArgs = process.argv.slice(2);
  const runDir = optionValue(cliArgs, "--run-dir");
  const challengeId = optionValue(cliArgs, "--challenge");
  if (runDir === undefined || challengeId === undefined)
    throw new Error("Usage: evaluate.ts --run-dir <run-dir> --challenge <challenge-id>");
  challengeIdSchema.parse(challengeId);
  const rootDir = process.cwd();
  const challenge = parseJsonWithSchema(
    readJson(
      path.join(rootDir, "training", "agentic-qa", "challenges", challengeId, "challenge.json"),
    ),
    challengeSchema,
    challengeId,
  );
  const answerKey = parseJsonWithSchema(
    readJson(
      path.join(
        rootDir,
        "training",
        "agentic-qa",
        "instructor",
        "answer-key",
        `${challengeId}.json`,
      ),
    ),
    answerKeySchema,
    challengeId,
  );
  const findings = parseJsonWithSchema(
    readCanonicalJsonFile(
      path.join(
        agenticQaRunRoot(rootDir, path.basename(runDir)),
        "runner",
        "output",
        "qa-findings.json",
      ),
    ),
    qaFindingsSchema,
    "qa-findings.json",
  );
  const selectedManifestFile = selectBenchmarkManifestFile(runDir, challengeId);
  const manifest = parseJsonWithSchema(
    readJson(selectedManifestFile),
    benchmarkManifestSchema,
    path.relative(rootDir, selectedManifestFile),
  );
  const expectedChallengePath = `training/agentic-qa/challenges/${challengeId}/challenge.json`;
  const expectedAnswerKeyPath = `training/agentic-qa/instructor/answer-key/${challengeId}.json`;
  if (
    manifest.challenge.path !== expectedChallengePath ||
    manifest.answer_key.path !== expectedAnswerKeyPath
  )
    throw new Error(
      "Benchmark manifest challenge / Answer Key path does not match the CLI challenge",
    );
  const profileFile = path.join(rootDir, "training/agentic-qa/tool-profiles/scored-v1.json");
  const profile = parseJsonWithSchema(readJson(profileFile), toolProfileSchema, "scored-v1.json");
  const expectedToolProfileRevision = `sha256:${sha256File(profileFile)}` as `sha256:${string}`;
  if (findings.mode !== "black-box-scored")
    throw new Error("Evaluator accepts scored findings only");
  const trustedRunnerProfilePath = path.join(
    agenticQaRunRoot(rootDir, path.basename(runDir)),
    "trusted",
    "runner-profile.json",
  );
  const runnerProfile: RunnerProfile | undefined =
    findings.execution_kind === "official_model_backed"
      ? fs.existsSync(trustedRunnerProfilePath)
        ? parseJsonWithSchema(
            readCanonicalJsonFile(trustedRunnerProfilePath),
            officialRunnerProfileSchema,
            "trusted runner profile",
          )
        : undefined
      : // Contract fixtures may reconstruct a local profile because they are
        // intentionally outside the Official scoring path. The branch above
        // has no fallback: a missing trusted profile makes Official invalid.
        (manifest.runner_profile ??
        createRunnerProfile({
          model: optionValue(cliArgs, "--model") ?? "local-deterministic-runner",
          toolProfileRevision: expectedToolProfileRevision,
          challenge,
        }));
  const expectedBenchmarkRevision = benchmarkRevisionFromManifest(selectedManifestFile, manifest);
  const evaluatorSessionId = crypto.randomUUID();
  if (findings.runner_session_id === evaluatorSessionId)
    throw new Error("Evaluator session must differ from runner session");
  const evaluatorEvidenceDirectory = path.join(
    agenticQaRunRoot(rootDir, path.basename(runDir)),
    "evaluation",
  );
  fs.mkdirSync(evaluatorEvidenceDirectory, { recursive: true });
  writeCanonicalJsonFile(path.join(evaluatorEvidenceDirectory, "evaluator-session.json"), {
    runner_session_id: findings.runner_session_id,
    evaluator_session_id: evaluatorSessionId,
    answer_key_read: true,
    runner_session_reused: findings.runner_session_id === evaluatorSessionId,
  });
  const evaluation = evaluateBlackBox(challenge, answerKey, findings, {
    sourceHeadSha: manifest.source_head_sha,
    expectedBenchmarkRevision,
    expectedRuntimeVariantId: manifest.runtime_variant_id,
    ...(runnerProfile === undefined ? {} : { expectedRunnerProfile: runnerProfile }),
    expectedToolProfileRevision,
    expectedToolProfile: profile,
    evaluatorSessionId,
    officialArtifactLocations: {
      rootDir,
      runRoot: agenticQaRunRoot(rootDir, findings.run_id),
    },
  });
  const evaluationPath = path.join(
    agenticQaRunRoot(rootDir, findings.run_id),
    "evaluation",
    "evaluation.json",
  );
  writeCanonicalJsonFile(evaluationPath, evaluation);
  console.log(`Evaluation written: ${evaluationPath}`);
}
