import fs from "node:fs";
import path from "node:path";

import {
  learnerSafeInputManifestSchema,
  outputContractSchema,
  parseJsonWithSchema,
  runnerInputSchema,
  type Challenge,
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
import type { LearnerBundle } from "./build-learner-bundle";
import { compareCodeUnits } from "./contracts";
import { copyDirectoryWithoutSymlinks } from "./canonical-artifact-manifest";

const DEFAULT_SKILL_PATH = "training/agentic-qa/skills/scored-v1.md";

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
  return `.artifacts/agentic-qa/${runId}/runner/evidence/`;
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
};

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
}): RunnerInputPackage {
  const skillRelativePath = input.skillPath ?? DEFAULT_SKILL_PATH;
  const skillSourcePath = repoPath(input.rootDir, skillRelativePath);
  const runbookSourcePath = repoPath(
    input.rootDir,
    `training/agentic-qa/challenges/${input.challenge.challenge_id}/runbook.md`,
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
  fs.copyFileSync(skillSourcePath, skillSnapshotPath);
  fs.copyFileSync(runbookSourcePath, runbookSnapshotPath);
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
  assertLearnerSafeInputRoot(input.inputRoot);
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
