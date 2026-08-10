import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  benchmarkManifestSchema,
  challengeIdSchema,
  compareCodeUnits,
  parseJsonWithSchema,
  type AnswerKey,
  type BenchmarkManifest,
  type Challenge,
  type RunnerProfile,
} from "./contracts";
import type { LearnerBundle } from "./build-learner-bundle";

export type WorkingTreeEntry = {
  status: "A" | "M" | "D";
  path: string;
  sha256: string | null;
};

export type { BenchmarkManifest } from "./contracts";

export type BenchmarkRevision = {
  revision: `git:${string}` | `sha256:${string}`;
  manifest: BenchmarkManifest;
  serialized_manifest: string;
};

export type BenchmarkIdentity = {
  challenge_id: string;
  benchmark_revision: string;
  runtime_variant_id: string | null;
};

const EXCLUDED_PREFIXES = [
  ".git/",
  "node_modules/",
  "output/",
  ".artifacts/",
  ".codex/runs/",
  "dist/",
];

function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function isExcludedPath(relativePath: string): boolean {
  const normalized = normalizeRepoPath(relativePath);
  return EXCLUDED_PREFIXES.some(
    (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
  );
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function git(rootDir: string, args: string[]): string {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
}

function sourceHeadSha(rootDir: string): string | null {
  const value = git(rootDir, ["rev-parse", "HEAD"]).toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error("Git HEAD is not a valid commit SHA");
  return value;
}

function entryFor(
  rootDir: string,
  status: "A" | "M" | "D",
  relativePath: string,
): WorkingTreeEntry {
  const normalized = normalizeRepoPath(relativePath);
  const absolutePath = path.join(rootDir, normalized);
  return {
    status,
    path: normalized,
    sha256: status === "D" || !fs.existsSync(absolutePath) ? null : sha256File(absolutePath),
  };
}

function parseStatusRecord(
  rootDir: string,
  record: string,
  renameSource?: string,
): WorkingTreeEntry[] {
  const statusCode = record.slice(0, 2);
  const rawPath = record.slice(3);
  if (rawPath === "") return [];
  if (statusCode.startsWith("R") || statusCode.startsWith("C")) {
    if (renameSource === undefined || renameSource === "")
      throw new Error("Git status rename/copy record is missing its source path");
    return [entryFor(rootDir, "D", renameSource), entryFor(rootDir, "A", rawPath)];
  }
  if (statusCode === "??" || statusCode.includes("A")) return [entryFor(rootDir, "A", rawPath)];
  if (statusCode.includes("D")) return [entryFor(rootDir, "D", rawPath)];
  return [entryFor(rootDir, "M", rawPath)];
}

export function parsePorcelainStatusRecords(rootDir: string, output: string): WorkingTreeEntry[] {
  const records = output.split("\0").filter((record) => record !== "");
  const parsedEntries: WorkingTreeEntry[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    const statusCode = record.slice(0, 2);
    if (statusCode.startsWith("R") || statusCode.startsWith("C")) {
      parsedEntries.push(...parseStatusRecord(rootDir, record, records[index + 1]));
      index += 1;
    } else {
      parsedEntries.push(...parseStatusRecord(rootDir, record));
    }
  }
  const entries = parsedEntries.filter((entry) => !isExcludedPath(entry.path));
  const unique = new Map<string, WorkingTreeEntry>();
  for (const entry of entries) unique.set(`${entry.status}:${entry.path}`, entry);
  return [...unique.values()].sort(
    (a, b) => compareCodeUnits(a.path, b.path) || compareCodeUnits(a.status, b.status),
  );
}

export function collectWorkingTreeEntries(rootDir: string): WorkingTreeEntry[] {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return parsePorcelainStatusRecords(rootDir, output);
}

function manifestFile(rootDir: string, relativePath: string): { path: string; sha256: string } {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath))
    throw new Error(`Benchmark input file is missing: ${relativePath}`);
  return { path: relativePath, sha256: sha256File(absolutePath) };
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function benchmarkRevisionFromManifest(
  manifestFilePath: string,
  manifest: BenchmarkManifest,
): BenchmarkRevision["revision"] {
  const serialized = canonicalJson(manifest);
  const raw = fs.readFileSync(manifestFilePath, "utf8");
  if (raw !== serialized)
    throw new Error(`Benchmark manifest is not in canonical JSON form: ${manifestFilePath}`);
  if (manifest.working_tree_entries.length === 0 && manifest.source_head_sha !== null)
    return `git:${manifest.source_head_sha}`;
  const digest = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  return `sha256:${digest}`;
}

export function createBenchmarkRevision(input: {
  rootDir: string;
  challenge: Challenge;
  answerKey: AnswerKey;
  learnerBundle: LearnerBundle;
  runtimeVariantId: string | null;
  patchPath: string | null;
  runnerProfile?: RunnerProfile;
}): BenchmarkRevision {
  const challengePath = `training/agentic-qa/challenges/${input.challenge.challenge_id}/challenge.json`;
  const answerKeyPath = `training/agentic-qa/instructor/answer-key/${input.challenge.challenge_id}.json`;
  const patch = input.patchPath === null ? null : manifestFile(input.rootDir, input.patchPath);
  const manifest = parseJsonWithSchema(
    {
      schema_version: 1,
      source_head_sha: sourceHeadSha(input.rootDir),
      working_tree_entries: collectWorkingTreeEntries(input.rootDir),
      learner_spec_entries: [...input.learnerBundle.entries].sort((a, b) =>
        compareCodeUnits(a.path, b.path),
      ),
      challenge: manifestFile(input.rootDir, challengePath),
      answer_key: manifestFile(input.rootDir, answerKeyPath),
      challenge_patch: patch,
      runtime_variant_id: input.runtimeVariantId,
      ...(input.runnerProfile === undefined ? {} : { runner_profile: input.runnerProfile }),
    },
    benchmarkManifestSchema,
    "benchmark manifest",
  );
  const serialized_manifest = canonicalJson(manifest);
  const digest = crypto.createHash("sha256").update(serialized_manifest, "utf8").digest("hex");
  let revision: BenchmarkRevision["revision"] = `sha256:${digest}`;
  const entries = manifest.working_tree_entries;
  const tracked = (relativePath: string): boolean => {
    try {
      git(input.rootDir, ["ls-files", "--error-unmatch", "--", relativePath]);
      return true;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status?: unknown }).status === 1
      )
        return false;
      throw new Error(`Git tracked-file inspection failed for ${relativePath}`, { cause: error });
    }
  };
  const clean =
    entries.length === 0 &&
    tracked(challengePath) &&
    tracked(answerKeyPath) &&
    (input.patchPath === null || tracked(input.patchPath));
  if (clean && manifest.source_head_sha !== null) revision = `git:${manifest.source_head_sha}`;
  // Keep the parsed key in the function signature so callers cannot accidentally
  // create a revision without validating the Answer Key first.
  void input.answerKey;
  return { revision, manifest, serialized_manifest };
}

export function benchmarkIdentity(
  challengeId: string,
  revision: string,
  runtimeVariantId: string | null,
): BenchmarkIdentity {
  const validatedChallengeId = challengeIdSchema.parse(challengeId);
  if (!/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/.test(revision))
    throw new Error(`Invalid benchmark revision: ${revision}`);
  return {
    challenge_id: validatedChallengeId,
    benchmark_revision: revision,
    runtime_variant_id: runtimeVariantId,
  };
}

export function sameBenchmarkIdentity(left: BenchmarkIdentity, right: BenchmarkIdentity): boolean {
  return (
    left.challenge_id === right.challenge_id &&
    left.benchmark_revision === right.benchmark_revision &&
    left.runtime_variant_id === right.runtime_variant_id
  );
}

export function sameRunnerCondition(
  leftIdentity: BenchmarkIdentity,
  leftRunnerProfile: unknown,
  rightIdentity: BenchmarkIdentity,
  rightRunnerProfile: unknown,
): boolean {
  return (
    sameBenchmarkIdentity(leftIdentity, rightIdentity) &&
    JSON.stringify(leftRunnerProfile) === JSON.stringify(rightRunnerProfile)
  );
}
