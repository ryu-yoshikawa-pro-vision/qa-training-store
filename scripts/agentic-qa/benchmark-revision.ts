import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  benchmarkManifestSchema,
  parseJsonWithSchema,
  type AnswerKey,
  type BenchmarkManifest,
  type Challenge,
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
  return value.replace(/^\s+/, "").replace(/\\/g, "/");
}

function isExcludedPath(relativePath: string): boolean {
  const normalized = normalizeRepoPath(relativePath);
  return EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function git(rootDir: string, args: string[]): string {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
}

function sourceHeadSha(rootDir: string): string | null {
  try {
    const value = git(rootDir, ["rev-parse", "HEAD"]).toLowerCase();
    return /^[0-9a-f]{40}$/.test(value) ? value : null;
  } catch {
    return null;
  }
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

function parseStatusLine(rootDir: string, line: string): WorkingTreeEntry[] {
  const statusCode = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  if (rawPath === "") return [];
  if (statusCode.startsWith("R") || statusCode.startsWith("C")) {
    const separator = rawPath.indexOf(" -> ");
    if (separator >= 0) {
      const oldPath = rawPath.slice(0, separator);
      const newPath = rawPath.slice(separator + 4);
      return [entryFor(rootDir, "D", oldPath), entryFor(rootDir, "A", newPath)];
    }
  }
  if (statusCode === "??" || statusCode.includes("A")) return [entryFor(rootDir, "A", rawPath)];
  if (statusCode.includes("D")) return [entryFor(rootDir, "D", rawPath)];
  return [entryFor(rootDir, "M", rawPath)];
}

export function collectWorkingTreeEntries(rootDir: string): WorkingTreeEntry[] {
  let output = "";
  try {
    output = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
      cwd: rootDir,
      encoding: "utf8",
    });
  } catch {
    return [];
  }
  const entries = output
    .split(/\r?\n/)
    .flatMap((line) => parseStatusLine(rootDir, line))
    .filter((entry) => !isExcludedPath(entry.path));
  const unique = new Map<string, WorkingTreeEntry>();
  for (const entry of entries) unique.set(`${entry.status}:${entry.path}`, entry);
  return [...unique.values()].sort(
    (a, b) => a.path.localeCompare(b.path) || a.status.localeCompare(b.status),
  );
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
        a.path.localeCompare(b.path),
      ),
      challenge: manifestFile(input.rootDir, challengePath),
      answer_key: manifestFile(input.rootDir, answerKeyPath),
      challenge_patch: patch,
      runtime_variant_id: input.runtimeVariantId,
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
    } catch {
      return false;
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
  if (!/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/.test(revision))
    throw new Error(`Invalid benchmark revision: ${revision}`);
  return {
    challenge_id: challengeId,
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
