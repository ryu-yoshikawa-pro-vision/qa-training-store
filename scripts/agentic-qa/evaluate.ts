import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { benchmarkRevisionFromManifest } from "./benchmark-revision";
import {
  answerKeySchema,
  benchmarkManifestSchema,
  challengeSchema,
  evaluationSchema,
  parseJsonWithSchema,
  qaFindingsSchema,
  toolProfileSchema,
  type AnswerItem,
  type AnswerKey,
  type Challenge,
  type Evaluation,
  type Finding,
  type QaFindings,
  type RunnerProfile,
} from "./contracts";
import { assertCoverageIntegrity } from "./coverage";
import { createRunnerProfile } from "./runner";

type ActiveAnswerItem = Extract<AnswerItem, { kind: "defect" | "non-defect" }>;

export type EvaluationOptions = {
  rootDir?: string;
  sourceHeadSha?: string | null;
  /** Backward-compatible alias for expectedRuntimeVariantId. */
  runtimeVariantId?: string | null;
  expectedRuntimeVariantId?: string | null;
  expectedBenchmarkRevision?: string;
  expectedRunnerProfile?: RunnerProfile;
  isolationFailure?: boolean;
  toolScopeFailure?: boolean;
  preparationFailure?: boolean;
  environmentBlocker?: boolean;
  benchmarkGroundTruthChanged?: boolean;
};

function coverageComplete(findings: QaFindings, coverageId: string): boolean {
  return findings.coverage.items.some(
    (item) => item.coverage_id === coverageId && item.status === "completed",
  );
}

function evidenceSatisfies(finding: Finding, item: ActiveAnswerItem): boolean {
  const expectation = item.evidence_expectation.trim().toLocaleLowerCase("en-US");
  return finding.evidence.some((evidence) =>
    evidence.description.toLocaleLowerCase("en-US").includes(expectation),
  );
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
    oracleMatches(finding, item) && coverageMatches(finding, item) && finding.evidence.length > 0
  );
}

function activeFinding(finding: Finding): boolean {
  return finding.status !== "discarded" && finding.status !== "duplicate";
}

function itemObservationSeen(findings: QaFindings, item: ActiveAnswerItem): boolean {
  const coverageItem = findings.coverage.items.find(
    (coverage) => coverage.coverage_id === item.related_coverage_id,
  );
  const coverageNotes = coverageItem?.notes.toLocaleLowerCase("en-US") ?? "";
  const expectation = item.evidence_expectation.toLocaleLowerCase("en-US");
  const notesConfirmObservation =
    coverageItem?.status === "completed" && coverageNotes.includes(expectation);
  return (
    notesConfirmObservation ||
    findings.findings.some(
      (finding) =>
        activeFinding(finding) &&
        coverageComplete(findings, item.related_coverage_id) &&
        evidenceSatisfies(finding, item),
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

function invalidReasonSet(options: EvaluationOptions, findings: QaFindings): string[] {
  const reasons = new Set<string>();
  if (
    options.environmentBlocker === true ||
    findings.coverage.items.some((item) => item.status === "blocked_environment")
  )
    reasons.add("environment_blocker");
  if (options.isolationFailure === true) reasons.add("isolation_failure");
  if (options.toolScopeFailure === true) reasons.add("tool_scope_failure");
  if (options.preparationFailure === true) reasons.add("preparation_failure");
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
    JSON.stringify(options.expectedRunnerProfile) !== JSON.stringify(findings.runner_profile)
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
  return [...reasons].sort((a, b) => a.localeCompare(b));
}

function matchDefectFinding(finding: Finding, item: ActiveAnswerItem): boolean {
  return (
    item.kind === "defect" &&
    findingCanBeMatched(finding, item) &&
    evidenceSatisfies(finding, item) &&
    finding.expected !== finding.actual
  );
}

function evidenceQuality(finding: Finding, item: ActiveAnswerItem): number {
  const checks = [
    oracleMatches(finding, item),
    finding.steps.length > 0 && finding.reproduction_count > 0,
    finding.evidence.length > 0,
    finding.expected.trim() !== "" &&
      finding.actual.trim() !== "" &&
      finding.expected !== finding.actual,
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
      (item) => !matchedDefectItems.has(item.item_id) && matchDefectFinding(finding, item),
    );
    if (matchedDefect !== undefined) {
      matchedDefectItems.add(matchedDefect.item_id);
      countedFindingIds.add(finding.finding_id);
      tp += 1;
      evidenceScores.push(evidenceQuality(finding, matchedDefect));
      reproducibilityScores.push(reproducibility(finding));
      severityScores.push(severityAccuracy(finding, matchedDefect));
      matches.push({
        finding_id: finding.finding_id,
        answer_item_id: matchedDefect.item_id,
        coverage_id: matchedDefect.related_coverage_id,
        classification: "tp",
        required_observation_satisfied: evidenceSatisfies(finding, matchedDefect),
        adjudication: "automatic",
      });
      continue;
    }

    const matchedNonDefect = nonDefectItems.find((item) => findingCanBeMatched(finding, item));
    if (
      matchedNonDefect !== undefined &&
      coverageComplete(findings, matchedNonDefect.related_coverage_id) &&
      evidenceSatisfies(finding, matchedNonDefect)
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
      coverageComplete(findings, item.related_coverage_id) && itemObservationSeen(findings, item);
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

  const invalidReasons = invalidReasonSet(options, findings);
  if (matches.some((match) => match.classification === "review_needed"))
    invalidReasons.push("preparation_failure");
  const uniqueReasons = [...new Set(invalidReasons)].sort((a, b) => a.localeCompare(b));
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
    fresh_session: true,
    tool_scope_validated: true,
    valid_for_scoring: validForScoring,
    invalid_reasons: uniqueReasons as Evaluation["invalid_reasons"],
    matches,
    counts,
    metrics: validForScoring ? metricValues : allNullMetrics(),
  };
  return parseJsonWithSchema(evaluation, evaluationSchema, "evaluation");
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function optionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const runDir = optionValue("--run-dir");
  const challengeId = optionValue("--challenge");
  if (runDir === undefined || challengeId === undefined)
    throw new Error("Usage: evaluate.ts --run-dir <run-dir> --challenge <challenge-id>");
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
    readJson(path.join(runDir, "qa-findings.json")),
    qaFindingsSchema,
    "qa-findings.json",
  );
  const manifestFile = path.join(runDir, `benchmark-manifest-${challengeId}.json`);
  const fallbackManifestFile = path.join(runDir, "benchmark-manifest.json");
  const selectedManifestFile = fs.existsSync(manifestFile) ? manifestFile : fallbackManifestFile;
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
  parseJsonWithSchema(readJson(profileFile), toolProfileSchema, "scored-v1.json");
  const runnerProfile = createRunnerProfile({
    model: optionValue("--model") ?? "local-deterministic-runner",
    toolProfileRevision: `sha256:${sha256File(profileFile)}`,
    challenge,
  });
  const expectedBenchmarkRevision = benchmarkRevisionFromManifest(selectedManifestFile, manifest);
  const evaluatorSessionId = crypto.randomUUID();
  const evaluatorEvidenceDirectory = path.join(
    rootDir,
    ".artifacts",
    "agentic-qa",
    path.basename(runDir),
  );
  fs.mkdirSync(evaluatorEvidenceDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(evaluatorEvidenceDirectory, "evaluator-session.json"),
    `${JSON.stringify(
      {
        evaluator_session_id: evaluatorSessionId,
        answer_key_read: true,
        runner_session_reused: false,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const evaluation = evaluateBlackBox(challenge, answerKey, findings, {
    sourceHeadSha: manifest.source_head_sha,
    expectedBenchmarkRevision,
    expectedRuntimeVariantId: manifest.runtime_variant_id,
    expectedRunnerProfile: runnerProfile,
  });
  fs.writeFileSync(
    path.join(runDir, "evaluation.json"),
    `${JSON.stringify(evaluation, null, 2)}\n`,
    "utf8",
  );
  console.log(`Evaluation written: ${path.join(runDir, "evaluation.json")}`);
}
