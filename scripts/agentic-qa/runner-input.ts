import fs from "node:fs";
import path from "node:path";

import {
  learnerSafeInputManifestSchema,
  outputContractSchema,
  parseJsonWithSchema,
  runnerInputSchema,
  type Challenge,
  type ArtifactManifest,
  type InitialStateGroup,
  type LearnerSafeInputManifest,
  type OutputContract,
  type RunnerInput,
  type RuntimeVariant,
} from "./contracts";
import {
  canonicalJson,
  readCanonicalJsonFile,
  sha256Canonical,
  sha256File,
  writeCanonicalJsonFile,
} from "./canonical-json";
import type { LearnerBundle, LearnerBundleEntry } from "./build-learner-bundle";
import { compareCodeUnits } from "./contracts";
import {
  copyDirectoryWithoutSymlinks,
  createArtifactManifest,
  writeArtifactManifest,
} from "./canonical-artifact-manifest";
import { agenticQaRef } from "./artifact-layout";

const DEFAULT_SKILL_PATH = "training/agentic-qa/skills/scored-v1.md";
const LEARNER_SAFE_INPUT_FILES = [
  "runner-input.json",
  "learner-safe-input-manifest.json",
  "output-contract.json",
  "scored-skill.md",
  "runbook.md",
  "challenge/challenge.json",
] as const;

function repoPath(rootDir: string, relativePath: string): string {
  if (
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath.split("/").includes("..")
  )
    throw new Error(`Learner-safe input path is unsafe: ${relativePath}`);
  const absolute = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolute))
    throw new Error(`Learner-safe input file is missing: ${relativePath}`);
  return absolute;
}

function outputPrefix(runId: string): string {
  return `${agenticQaRef(runId, "runner", "evidence")}/`;
}

function outputContractValue(input: {
  runId: string;
  maxFinalOutputBytes?: number;
}): OutputContract {
  const unsigned = {
    schema_version: 1 as const,
    max_final_output_bytes: input.maxFinalOutputBytes ?? 256 * 1024,
    finalization_timeout_seconds: 30,
    max_final_output_writes: 1 as const,
    final_evidence_ref_prefix: outputPrefix(input.runId),
  };
  return outputContractSchema.parse({ ...unsigned, revision: sha256Canonical(unsigned) });
}

function runnerInputDigestInput(value: RunnerInput): Omit<RunnerInput, "runner_input_sha256"> {
  const { runner_input_sha256: ignored, ...unsigned } = value;
  void ignored;
  return unsigned;
}

function learnerManifestInput(
  value: RunnerInput,
): Omit<LearnerSafeInputManifest, "runner_input_sha256"> {
  return {
    schema_version: 1,
    run_id: value.run_id,
    challenge_id: value.challenge_id,
    spec_bundle_sha256: value.spec_bundle_sha256,
    challenge_sha256: value.challenge_sha256,
    runbook_sha256: value.runbook_sha256,
    skill_revision: value.skill_revision,
    output_contract_revision: value.output_contract_revision,
  };
}

export type RunnerInputPackage = {
  runnerInput: RunnerInput;
  learnerSafeManifest: LearnerSafeInputManifest;
  outputContract: OutputContract;
  inputRoot: string;
  runnerInputPath: string;
  learnerSafeManifestPath: string;
  outputContractPath: string;
  skillSnapshotPath: string;
  runbookSnapshotPath: string;
  specificationRoot: string;
  learnerSafeInputArtifactManifest: ArtifactManifest;
  learnerSafeInputArtifactManifestPath?: string;
};

export function createLearnerSafeInputArtifactManifest(inputRoot: string): ArtifactManifest {
  return createArtifactManifest(inputRoot, "learner_safe_input", true);
}

export function learnerBundleEntriesFromInputRoot(inputRoot: string): LearnerBundleEntry[] {
  const specificationRoot = path.join(inputRoot, "specification");
  const specificationStat = fs.lstatSync(specificationRoot);
  if (!specificationStat.isDirectory() || specificationStat.isSymbolicLink())
    throw new Error("Learner-safe specification snapshot must be a real directory");
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink())
        throw new Error(`Learner specification contains a symlink: ${entry.name}`);
      if (stat.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (!stat.isFile())
        throw new Error(`Learner specification contains a non-file: ${entry.name}`);
      files.push(absolutePath);
    }
  };
  visit(specificationRoot);
  const entries = files.map((absolutePath) => {
    const relativePath = path.relative(specificationRoot, absolutePath).split(path.sep).join("/");
    if (!relativePath.startsWith("docs/spec/") || relativePath.split("/").includes(".."))
      throw new Error(`Learner specification snapshot contains an unsafe path: ${relativePath}`);
    return {
      path: relativePath,
      sha256: sha256File(absolutePath).slice("sha256:".length),
    };
  });
  return entries.sort((left, right) => compareCodeUnits(left.path, right.path));
}

function relativeRegularFiles(rootDir: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink())
        throw new Error(`Learner-safe input contains a symlink: ${absolute}`);
      if (stat.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!stat.isFile()) throw new Error(`Learner-safe input contains a non-file: ${absolute}`);
      files.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
    }
  };
  visit(rootDir);
  return files.sort(compareCodeUnits);
}

function assertExpectedContainerLayout(rootDir: string, expectedFiles: readonly string[]): void {
  const expected = new Set(expectedFiles);
  const expectedDirectories = new Set<string>();
  for (const file of expectedFiles) {
    const segments = file.split("/");
    for (let index = 1; index < segments.length; index += 1)
      expectedDirectories.add(segments.slice(0, index).join("/"));
  }
  const expectedTopLevel = new Set([
    ...expectedFiles.filter((file) => !file.includes("/")),
    ...expectedFiles.filter((file) => file.includes("/")).map((file) => file.split("/")[0]),
  ]);
  const actualTopLevel = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .map((entry) => entry.name);
  if (
    actualTopLevel.length !== expectedTopLevel.size ||
    actualTopLevel.some((name) => !expectedTopLevel.has(name))
  )
    throw new Error("Learner-safe input canonical file set mismatch: unexpected top-level entry");
  for (const file of relativeRegularFiles(rootDir))
    if (!expected.has(file))
      throw new Error(`Learner-safe input canonical file set mismatch: unexpected file ${file}`);
  for (const file of expectedFiles)
    if (!fs.lstatSync(path.join(rootDir, file)).isFile())
      throw new Error(`Learner-safe input canonical file set mismatch: missing file ${file}`);
  const visitDirectories = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(rootDir, absolute).split(path.sep).join("/");
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink())
        throw new Error(`Learner-safe input canonical file set mismatch: symlink ${relative}`);
      if (stat.isDirectory()) {
        if (!expectedDirectories.has(relative))
          throw new Error(
            `Learner-safe input canonical file set mismatch: unexpected directory ${relative}`,
          );
        visitDirectories(absolute);
      }
    }
  };
  visitDirectories(rootDir);
  const challengeEntries = fs.readdirSync(path.join(rootDir, "challenge"), { withFileTypes: true });
  if (challengeEntries.length !== 1 || challengeEntries[0]?.name !== "challenge.json")
    throw new Error("Learner-safe input canonical file set mismatch: challenge/ is not exact");
}

export function assertLearnerSafeInputFileSet(
  inputRoot: string,
  specificationEntries: readonly LearnerBundleEntry[],
): void {
  const expectedFiles = [
    ...LEARNER_SAFE_INPUT_FILES,
    ...specificationEntries.map((entry) => `specification/${entry.path}`),
  ];
  assertExpectedContainerLayout(inputRoot, expectedFiles);
}

export function createRunnerInput(input: {
  runId: string;
  challenge: Challenge;
  learnerBundle: LearnerBundle;
  runtimeUrl: string;
  runtimeVariant: RuntimeVariant;
  initialState: InitialStateGroup;
  allowedOrigins?: readonly string[];
  skillRevision: string;
  runbookSha256: string;
  challengeSha256: string;
  outputContract: OutputContract;
}): RunnerInput {
  const runtimeOrigin = new URL(input.runtimeUrl).origin;
  const allowedOrigins = [...new Set([runtimeOrigin, ...(input.allowedOrigins ?? [])])].sort(
    compareCodeUnits,
  );
  const controls = [...input.challenge.allowed_runtime_controls].sort(compareCodeUnits);
  const unsigned = {
    schema_version: 1 as const,
    run_id: input.runId,
    challenge_id: input.challenge.challenge_id,
    spec_bundle_sha256: sha256Canonical(input.learnerBundle.entries),
    challenge_sha256: input.challengeSha256,
    runbook_sha256: input.runbookSha256,
    skill_revision: input.skillRevision,
    output_contract_revision: input.outputContract.revision,
    runtime_url: input.runtimeUrl,
    runtime_variant_id: input.runtimeVariant.runtime_variant_id,
    allowed_origins: allowedOrigins,
    initial_state: input.initialState,
    coverage_ids: input.challenge.required_coverage.map((item) => item.coverage_id),
    allowed_runtime_controls: controls,
    exploration_budget: input.challenge.exploration_budget,
    stop_condition: input.challenge.stop_condition,
    evidence_ref_prefix: outputPrefix(input.runId),
  };
  return runnerInputSchema.parse({
    ...unsigned,
    runner_input_sha256: sha256Canonical(unsigned),
  });
}

export function createLearnerSafeInputManifest(input: RunnerInput): LearnerSafeInputManifest {
  const unsigned = learnerManifestInput(input);
  return learnerSafeInputManifestSchema.parse({
    ...unsigned,
    runner_input_sha256: input.runner_input_sha256,
  });
}

export function writeRunnerInputPackage(input: {
  rootDir: string;
  inputRoot: string;
  challenge: Challenge;
  learnerBundle: LearnerBundle;
  runnerInput: RunnerInput;
  outputContract?: OutputContract;
  skillPath?: string;
  learnerSafeInputArtifactManifestPath?: string;
}): RunnerInputPackage {
  const skillRelativePath = input.skillPath ?? DEFAULT_SKILL_PATH;
  const skillSourcePath = repoPath(input.rootDir, skillRelativePath);
  const runbookSourcePath = repoPath(
    input.rootDir,
    `training/agentic-qa/challenges/${input.challenge.challenge_id}/runbook.md`,
  );
  const challengeSourcePath = repoPath(
    input.rootDir,
    `training/agentic-qa/challenges/${input.challenge.challenge_id}/challenge.json`,
  );
  const outputContract = outputContractSchema.parse(
    input.outputContract ?? outputContractValue({ runId: input.runnerInput.run_id }),
  );
  if (outputContract.revision !== input.runnerInput.output_contract_revision)
    throw new Error("Output Contract revision differs from the Runner Input");
  fs.mkdirSync(input.inputRoot, { recursive: true });
  const specificationRoot = path.join(input.inputRoot, "specification");
  copyDirectoryWithoutSymlinks(input.learnerBundle.root, specificationRoot);
  const skillSnapshotPath = path.join(input.inputRoot, "scored-skill.md");
  const runbookSnapshotPath = path.join(input.inputRoot, "runbook.md");
  const challengeSnapshotPath = path.join(input.inputRoot, "challenge", "challenge.json");
  fs.copyFileSync(skillSourcePath, skillSnapshotPath);
  fs.copyFileSync(runbookSourcePath, runbookSnapshotPath);
  fs.mkdirSync(path.dirname(challengeSnapshotPath), { recursive: true });
  fs.copyFileSync(challengeSourcePath, challengeSnapshotPath);
  const manifest = createLearnerSafeInputManifest(input.runnerInput);
  const runnerInputPath = path.join(input.inputRoot, "runner-input.json");
  const learnerSafeManifestPath = path.join(input.inputRoot, "learner-safe-input-manifest.json");
  const outputContractPath = path.join(input.inputRoot, "output-contract.json");
  writeCanonicalJsonFile(runnerInputPath, input.runnerInput);
  writeCanonicalJsonFile(learnerSafeManifestPath, manifest);
  writeCanonicalJsonFile(outputContractPath, outputContract);

  if (runnerInputRevision(input.runnerInput) !== input.runnerInput.runner_input_sha256)
    throw new Error("Serialized runner-input.json hash differs from its contract");
  if (sha256File(skillSnapshotPath) !== input.runnerInput.skill_revision)
    throw new Error("Scored Skill snapshot hash differs from the Runner Input");
  if (sha256File(runbookSnapshotPath) !== input.runnerInput.runbook_sha256)
    throw new Error("Runbook snapshot hash differs from the Runner Input");
  if (sha256File(challengeSnapshotPath) !== input.runnerInput.challenge_sha256)
    throw new Error("Challenge snapshot hash differs from the Runner Input");
  if (
    sha256Canonical(learnerBundleEntriesFromInputRoot(input.inputRoot)) !==
    input.runnerInput.spec_bundle_sha256
  )
    throw new Error("Specification snapshot hash differs from the Runner Input");
  assertLearnerSafeInputRoot(input.inputRoot);
  assertLearnerSafeInputFileSet(input.inputRoot, input.learnerBundle.entries);
  const learnerSafeInputArtifactManifest = createLearnerSafeInputArtifactManifest(input.inputRoot);
  if (input.learnerSafeInputArtifactManifestPath !== undefined)
    writeArtifactManifest(
      input.learnerSafeInputArtifactManifestPath,
      learnerSafeInputArtifactManifest,
    );
  return {
    runnerInput: input.runnerInput,
    learnerSafeManifest: manifest,
    outputContract,
    inputRoot: input.inputRoot,
    runnerInputPath,
    learnerSafeManifestPath,
    outputContractPath,
    skillSnapshotPath,
    runbookSnapshotPath,
    specificationRoot,
    learnerSafeInputArtifactManifest,
    ...(input.learnerSafeInputArtifactManifestPath === undefined
      ? {}
      : { learnerSafeInputArtifactManifestPath: input.learnerSafeInputArtifactManifestPath }),
  };
}

export function readRunnerInput(filePath: string): RunnerInput {
  const value = readCanonicalJsonFile(filePath);
  const parsed = parseJsonWithSchema(value, runnerInputSchema, path.basename(filePath));
  if (runnerInputRevision(parsed) !== parsed.runner_input_sha256)
    throw new Error(`Runner Input file hash mismatch: ${filePath}`);
  return parsed;
}

export function assertLearnerSafeInputRoot(inputRoot: string): void {
  const forbidden = [
    ".agents",
    ".git",
    "answer-key",
    "challenge-patch",
    "instructor",
    "node_modules",
    "scripts",
    "src",
    "tests",
  ];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (forbidden.includes(entry.name) || entry.name.endsWith(".map"))
        throw new Error(`Learner-safe input contains instructor/source material: ${entry.name}`);
      const child = path.join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(`Learner-safe input contains a symlink: ${child}`);
      if (entry.isDirectory()) visit(child);
    }
  };
  visit(inputRoot);
}

export function runnerInputCanonicalBytes(value: RunnerInput): string {
  return canonicalJson(value);
}

export function runnerInputRevision(value: RunnerInput): `sha256:${string}` {
  return sha256Canonical(runnerInputDigestInput(value));
}

export function learnerSafeManifestRevision(value: LearnerSafeInputManifest): `sha256:${string}` {
  return sha256Canonical(value);
}

export function createDefaultOutputContract(runId: string): OutputContract {
  return outputContractValue({ runId });
}
