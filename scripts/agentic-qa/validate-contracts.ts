import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  answerKeySchema,
  benchmarkManifestSchema,
  challengeSchema,
  charterSchema,
  compareCodeUnits,
  evaluationSchema,
  parseJsonWithSchema,
  qaFindingsSchema,
  toolProfileSchema,
  workingTreeSnapshotComparisonSchema,
  workingTreeSnapshotSchema,
  type Challenge,
  type QaFindings,
} from "./contracts";
import { assertCoverageIntegrity } from "./coverage";
import { assertLearnerBundleHasOwners, buildLearnerBundle } from "./build-learner-bundle";
import { resolveSpecReferences } from "./spec-refs";
import { compareWorkingTreeSnapshots } from "./working-tree-snapshot";

export type ContractValidationSummary = {
  challenges: string[];
  validated_findings: string[];
  validated_charters: string[];
  validated_manifests: string[];
  validated_evaluations: string[];
};

export type SpecDriftSummary = {
  changed_br_ac: string[];
  changed_normative_files: string[];
  affected_challenge_ids: string[];
};

function readJson(filePath: string, rootDir = process.cwd()): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    const displayPath = relativeFromRoot(rootDir, filePath);
    throw new Error(
      `Invalid JSON at ${displayPath}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function challengeDirectory(rootDir: string): string {
  return path.join(rootDir, "training", "agentic-qa", "challenges");
}

function answerKeyPath(rootDir: string, challengeId: string): string {
  return path.join(
    rootDir,
    "training",
    "agentic-qa",
    "instructor",
    "answer-key",
    `${challengeId}.json`,
  );
}

function patchPath(rootDir: string, challengeId: string): string {
  return path.join(
    rootDir,
    "training",
    "agentic-qa",
    "instructor",
    "challenge-patches",
    `${challengeId}.patch`,
  );
}

function relativeFromRoot(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).split(path.sep).join("/");
}

function assertUnifiedDiff(filePath: string): void {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const oldHeader = lines.find((line) => line.startsWith("--- a/"));
  const newHeader = lines.find((line) => line.startsWith("+++ b/"));
  if (oldHeader === undefined || newHeader === undefined)
    throw new Error(`Challenge patch is not a Unified Diff: ${filePath}`);
  if (
    lines.some(
      (line) =>
        line.startsWith("+") &&
        !line.startsWith("+++") &&
        /^(?:#!|powershell|pwsh|bash|node|npm|pnpm|tsx)\b/i.test(line.slice(1).trim()),
    )
  ) {
    throw new Error(`Challenge patch contains a setup command: ${filePath}`);
  }
}

function validateChallenge(rootDir: string, challengeDirectoryPath: string): string {
  const challengeFile = path.join(challengeDirectoryPath, "challenge.json");
  const challenge = parseJsonWithSchema(
    readJson(challengeFile, rootDir),
    challengeSchema,
    relativeFromRoot(rootDir, challengeFile),
  );
  const directoryName = path.basename(challengeDirectoryPath);
  if (directoryName !== challenge.challenge_id)
    throw new Error(`Challenge directory and challenge_id differ: ${directoryName}`);

  const keyFile = answerKeyPath(rootDir, challenge.challenge_id);
  if (!fs.existsSync(keyFile))
    throw new Error(`Answer Key is missing: ${relativeFromRoot(rootDir, keyFile)}`);
  const answerKey = parseJsonWithSchema(
    readJson(keyFile, rootDir),
    answerKeySchema,
    relativeFromRoot(rootDir, keyFile),
  );
  if (
    path.basename(keyFile, ".json") !== answerKey.challenge_id ||
    answerKey.challenge_id !== challenge.challenge_id
  ) {
    throw new Error(`Answer Key filename/challenge_id mismatch: ${challenge.challenge_id}`);
  }

  const requiredCoverageIds = new Set(challenge.required_coverage.map((item) => item.coverage_id));
  for (const item of answerKey.items) {
    if (!requiredCoverageIds.has(item.related_coverage_id))
      throw new Error(
        `Answer item ${item.item_id} references unknown coverage: ${item.related_coverage_id}`,
      );
  }
  const challengeRefs = resolveSpecReferences(rootDir, challenge.spec_refs);
  const answerRefs = resolveSpecReferences(
    rootDir,
    answerKey.items.flatMap((item) => item.oracle_refs),
  );
  const temporaryBundle = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-qa-bundle-"));
  try {
    const bundle = buildLearnerBundle(rootDir, challenge, temporaryBundle);
    assertLearnerBundleHasOwners(
      bundle,
      answerRefs.map((item) => item.ownerPath),
    );
    assertLearnerBundleHasOwners(
      bundle,
      challengeRefs.map((item) => item.ownerPath),
    );
  } finally {
    fs.rmSync(temporaryBundle, { recursive: true, force: true });
  }

  const hasDefect = answerKey.items.some((item) => item.kind === "defect");
  const challengePatch = patchPath(rootDir, challenge.challenge_id);
  if (hasDefect && !fs.existsSync(challengePatch))
    throw new Error(
      `Defect Challenge Patch is missing: ${relativeFromRoot(rootDir, challengePatch)}`,
    );
  if (fs.existsSync(challengePatch)) assertUnifiedDiff(challengePatch);
  return challenge.challenge_id;
}

function validateFindings(
  rootDir: string,
  findingsFile: string,
  charter?: ReturnType<typeof charterSchema.parse>,
  challenge?: Challenge,
): QaFindings {
  const findings = parseJsonWithSchema(
    readJson(findingsFile, rootDir),
    qaFindingsSchema,
    relativeFromRoot(rootDir, findingsFile),
  );
  if (findings.mode === "normal" || findings.mode === "gray-box") {
    if (charter === undefined || findings.charter_id !== charter.charter_id)
      throw new Error("Normal / Gray-box findings must match qa-charter.json");
    assertCoverageIntegrity(charter, findings.coverage);
    validateWorkingTreeSnapshots(rootDir, findings);
  } else {
    if (challenge === undefined || findings.challenge_id !== challenge.challenge_id)
      throw new Error("Scored findings must match challenge.json");
    assertCoverageIntegrity(challenge, findings.coverage);
  }
  const findingIds = findings.findings.map((finding) => finding.finding_id);
  if (new Set(findingIds).size !== findingIds.length)
    throw new Error("qa-findings.finding_id must be unique within a run");
  return findings;
}

function snapshotPath(rootDir: string, reference: string): string {
  const absolute = path.resolve(rootDir, reference);
  const relative = path.relative(rootDir, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`))
    throw new Error(`Working tree snapshot reference escapes repository root: ${reference}`);
  if (!fs.existsSync(absolute)) throw new Error(`Working tree snapshot is missing: ${reference}`);
  return absolute;
}

export function validateWorkingTreeSnapshots(
  rootDir: string,
  findings: Extract<QaFindings, { mode: "normal" | "gray-box" }>,
): void {
  const beforePath = snapshotPath(rootDir, findings.working_tree_snapshot.before);
  const afterPath = snapshotPath(rootDir, findings.working_tree_snapshot.after);
  const comparisonPath = snapshotPath(rootDir, findings.working_tree_snapshot.comparison);
  const before = parseJsonWithSchema(
    readJson(beforePath, rootDir),
    workingTreeSnapshotSchema,
    relativeFromRoot(rootDir, beforePath),
  );
  const after = parseJsonWithSchema(
    readJson(afterPath, rootDir),
    workingTreeSnapshotSchema,
    relativeFromRoot(rootDir, afterPath),
  );
  const comparison = parseJsonWithSchema(
    readJson(comparisonPath, rootDir),
    workingTreeSnapshotComparisonSchema,
    relativeFromRoot(rootDir, comparisonPath),
  );
  if (
    before.run_id !== findings.run_id ||
    after.run_id !== findings.run_id ||
    comparison.run_id !== findings.run_id ||
    before.mode !== findings.mode ||
    after.mode !== findings.mode ||
    comparison.mode !== findings.mode ||
    before.phase !== "before" ||
    after.phase !== "after"
  )
    throw new Error("Working tree snapshots do not match Normal / Gray-box findings identity");
  if (
    comparison.before_snapshot !== findings.working_tree_snapshot.before ||
    comparison.after_snapshot !== findings.working_tree_snapshot.after
  )
    throw new Error("Working tree snapshot comparison references do not match findings");
  const expected = compareWorkingTreeSnapshots(before, after, {
    before: findings.working_tree_snapshot.before,
    after: findings.working_tree_snapshot.after,
  });
  if (
    comparison.before_source_head_sha !== expected.before_source_head_sha ||
    comparison.after_source_head_sha !== expected.after_source_head_sha ||
    comparison.source_head_changed !== expected.source_head_changed ||
    JSON.stringify(comparison.source_diff) !== JSON.stringify(expected.source_diff) ||
    comparison.additional_source_diff_count !== expected.additional_source_diff_count ||
    comparison.passed !== expected.passed
  )
    throw new Error("Working tree snapshot comparison does not match re-derived comparison");
  if (!comparison.passed)
    throw new Error("Normal / Gray-box QA has an additional Source Working Tree diff");
}

const FINDINGS_ARTIFACT_NAMES = ["qa-findings.json", "qa-findings-normal.json"] as const;

function isAgenticEvaluationArtifact(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    ("mode" in value || ("challenge_id" in value && "benchmark_revision" in value))
  );
}

export function validateTrainingContracts(rootDir = process.cwd()): ContractValidationSummary {
  const profileFile = path.join(
    rootDir,
    "training",
    "agentic-qa",
    "tool-profiles",
    "scored-v1.json",
  );
  const profile = parseJsonWithSchema(
    readJson(profileFile, rootDir),
    toolProfileSchema,
    relativeFromRoot(rootDir, profileFile),
  );
  const overlap = profile.allowed_capabilities.filter((capability) =>
    (profile.forbidden_capabilities as readonly string[]).includes(capability),
  );
  if (overlap.length > 0)
    throw new Error(`Tool profile allows and forbids the same capability: ${overlap.join(", ")}`);

  const challengesRoot = challengeDirectory(rootDir);
  const challenges = fs
    .readdirSync(challengesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => validateChallenge(rootDir, path.join(challengesRoot, entry.name)))
    .sort(compareCodeUnits);

  const runDirectories = [path.join(rootDir, ".codex", "runs")]
    .filter((directory) => fs.existsSync(directory))
    .flatMap((directory) =>
      fs
        .readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(directory, entry.name)),
    );
  const validatedManifests: string[] = [];
  const validatedEvaluations: string[] = [];
  for (const directory of runDirectories) {
    let hasAgenticManifest = false;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (
        !entry.isFile() ||
        !entry.name.startsWith("benchmark-manifest") ||
        !entry.name.endsWith(".json")
      )
        continue;
      const file = path.join(directory, entry.name);
      parseJsonWithSchema(
        readJson(file, rootDir),
        benchmarkManifestSchema,
        relativeFromRoot(rootDir, file),
      );
      hasAgenticManifest = true;
      validatedManifests.push(relativeFromRoot(rootDir, file));
    }
    const evaluationFile = path.join(directory, "evaluation.json");
    if (fs.existsSync(evaluationFile)) {
      const rawEvaluation = readJson(evaluationFile, rootDir);
      // Older run directories use evaluation.json for general run assessment,
      // not for the Agentic QA machine contract. Every Agentic QA-shaped
      // evaluation is schema-validated even when its manifest is absent.
      if (!hasAgenticManifest && !isAgenticEvaluationArtifact(rawEvaluation)) continue;
      const evaluation = parseJsonWithSchema(
        rawEvaluation,
        evaluationSchema,
        relativeFromRoot(rootDir, evaluationFile),
      );
      validatedEvaluations.push(relativeFromRoot(rootDir, evaluationFile));
      const findingsFile = path.join(directory, "qa-findings.json");
      if (hasAgenticManifest && fs.existsSync(findingsFile)) {
        const findings = parseJsonWithSchema(
          readJson(findingsFile, rootDir),
          qaFindingsSchema,
          relativeFromRoot(rootDir, findingsFile),
        );
        if (
          findings.mode === "black-box-scored" &&
          (evaluation.run_id !== findings.run_id ||
            evaluation.challenge_id !== findings.challenge_id ||
            evaluation.benchmark_revision !== findings.benchmark_revision ||
            evaluation.runtime_variant_id !== findings.runtime_variant_id ||
            JSON.stringify(evaluation.runner_profile) !== JSON.stringify(findings.runner_profile) ||
            evaluation.execution_kind !== findings.execution_kind ||
            evaluation.runner_session_id !== findings.runner_session_id ||
            evaluation.evaluator_session_id === findings.runner_session_id ||
            evaluation.fresh_session !== findings.fresh_session ||
            evaluation.tool_scope_validated !== findings.tool_scope_validated)
        )
          throw new Error(
            `Evaluation identity does not match Frozen Findings: ${relativeFromRoot(rootDir, evaluationFile)}`,
          );
      }
    }
  }

  const charterFiles = runDirectories.flatMap((directory) => {
    const results: string[] = [];
    const file = path.join(directory, "qa-charter.json");
    if (fs.existsSync(file)) results.push(file);
    return results;
  });
  const validatedCharters: string[] = [];
  for (const file of charterFiles) {
    const charter = parseJsonWithSchema(
      readJson(file, rootDir),
      charterSchema,
      relativeFromRoot(rootDir, file),
    );
    validatedCharters.push(relativeFromRoot(rootDir, file));
  }

  const findingsFiles = runDirectories.flatMap((directory) => {
    const results: string[] = [];
    for (const findingsName of FINDINGS_ARTIFACT_NAMES) {
      const file = path.join(directory, findingsName);
      if (fs.existsSync(file)) results.push(file);
    }
    return results;
  });
  const validatedFindings: string[] = [];
  for (const file of findingsFiles) {
    if (validatedFindings.includes(relativeFromRoot(rootDir, file))) continue;
    const findings = parseJsonWithSchema(
      readJson(file, rootDir),
      qaFindingsSchema,
      relativeFromRoot(rootDir, file),
    );
    if (findings.mode === "normal" || findings.mode === "gray-box") {
      const charterFile = path.join(path.dirname(file), "qa-charter.json");
      if (!fs.existsSync(charterFile))
        throw new Error(
          `Normal / Gray-box findings require qa-charter.json: ${relativeFromRoot(rootDir, file)}`,
        );
      const charter = parseJsonWithSchema(
        readJson(charterFile, rootDir),
        charterSchema,
        relativeFromRoot(rootDir, charterFile),
      );
      validateFindings(rootDir, file, charter);
    } else if (findings.mode === "black-box-scored") {
      const challengeFile = path.join(challengesRoot, findings.challenge_id, "challenge.json");
      if (!fs.existsSync(challengeFile))
        throw new Error(`Scored findings challenge is missing: ${findings.challenge_id}`);
      validateFindings(
        rootDir,
        file,
        undefined,
        parseJsonWithSchema(
          readJson(challengeFile, rootDir),
          challengeSchema,
          relativeFromRoot(rootDir, challengeFile),
        ),
      );
    }
    validatedFindings.push(relativeFromRoot(rootDir, file));
  }
  return {
    challenges,
    validated_findings: validatedFindings.sort(compareCodeUnits),
    validated_charters: validatedCharters.sort(compareCodeUnits),
    validated_manifests: validatedManifests.sort(compareCodeUnits),
    validated_evaluations: validatedEvaluations.sort(compareCodeUnits),
  };
}

/**
 * Summarize potential Challenge impact without turning every referenced-file
 * content change into an automatic failure. Reviewers decide whether the
 * changed behavior requires a Challenge/Answer update.
 */
export function summarizeSpecDrift(
  rootDir = process.cwd(),
  changedNormativeFiles: string[] = [],
  changedBrAc: string[] = [],
): SpecDriftSummary {
  const normalizedFiles = [
    ...new Set(changedNormativeFiles.map((value) => value.replace(/\\/g, "/"))),
  ].sort(compareCodeUnits);
  const normalizedIds = [...new Set(changedBrAc)].sort(compareCodeUnits);
  const affected = new Set<string>();
  const root = challengeDirectory(rootDir);
  if (fs.existsSync(root)) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(root, entry.name, "challenge.json");
      if (!fs.existsSync(file)) continue;
      const challenge = parseJsonWithSchema(
        readJson(file, rootDir),
        challengeSchema,
        relativeFromRoot(rootDir, file),
      );
      const resolved = resolveSpecReferences(rootDir, challenge.spec_refs);
      if (
        challenge.spec_refs.some((reference) => normalizedIds.includes(reference)) ||
        resolved.some((item) => normalizedFiles.includes(item.ownerPath))
      )
        affected.add(challenge.challenge_id);
    }
  }
  return {
    changed_br_ac: normalizedIds,
    changed_normative_files: normalizedFiles,
    affected_challenge_ids: [...affected].sort(compareCodeUnits),
  };
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const summary = validateTrainingContracts();
  console.log(
    `Agentic QA contracts passed: ${summary.challenges.length} challenge(s), ${summary.validated_charters.length} charter(s), ${summary.validated_findings.length} findings file(s), ${summary.validated_manifests.length} manifest(s), ${summary.validated_evaluations.length} evaluation(s)`,
  );
}
