import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  compareCodeUnits,
  parseJsonWithSchema,
  workingTreeSnapshotComparisonSchema,
  workingTreeSnapshotSchema,
  type WorkingTreeSnapshot,
  type WorkingTreeSnapshotComparison,
} from "./contracts";
import { collectWorkingTreeEntries } from "./benchmark-revision";
import { optionValue, requiredOptionValue } from "./cli";

type SnapshotMode = WorkingTreeSnapshot["mode"];
type SnapshotPhase = WorkingTreeSnapshot["phase"];

type CaptureInput = {
  rootDir: string;
  runId: string;
  mode: SnapshotMode;
  phase: SnapshotPhase;
  capturedAt?: string;
};

function sourceHeadSha(rootDir: string): string {
  const value = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  })
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error("Working tree snapshot requires a Git HEAD");
  return value;
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function repoRelativePath(rootDir: string, filePath: string): string {
  const relative = path.relative(rootDir, filePath).replace(/\\/g, "/");
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  )
    throw new Error(`Path is outside the repository root: ${filePath}`);
  return relative;
}

export function captureWorkingTreeSnapshot(input: CaptureInput): WorkingTreeSnapshot {
  const snapshot = {
    schema_version: 1 as const,
    run_id: input.runId,
    mode: input.mode,
    phase: input.phase,
    captured_at: input.capturedAt ?? new Date().toISOString(),
    source_head_sha: sourceHeadSha(input.rootDir),
    working_tree_entries: collectWorkingTreeEntries(input.rootDir),
  };
  return parseJsonWithSchema(snapshot, workingTreeSnapshotSchema, "working tree snapshot");
}

function entryMap(snapshot: WorkingTreeSnapshot) {
  return new Map(snapshot.working_tree_entries.map((entry) => [entry.path, entry]));
}

export function compareWorkingTreeSnapshots(
  before: WorkingTreeSnapshot,
  after: WorkingTreeSnapshot,
  refs: { before: string; after: string },
): WorkingTreeSnapshotComparison {
  if (before.run_id !== after.run_id) throw new Error("Working tree snapshots must share run_id");
  if (before.mode !== after.mode) throw new Error("Working tree snapshots must share mode");
  if (before.phase !== "before" || after.phase !== "after")
    throw new Error("Working tree snapshots must be before/after phases");

  const beforeEntries = entryMap(before);
  const afterEntries = entryMap(after);
  const paths = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].sort(
    compareCodeUnits,
  );
  const sourceDiff = paths.flatMap((entryPath) => {
    const beforeEntry = beforeEntries.get(entryPath) ?? null;
    const afterEntry = afterEntries.get(entryPath) ?? null;
    return JSON.stringify(beforeEntry) === JSON.stringify(afterEntry)
      ? []
      : [{ path: entryPath, before: beforeEntry, after: afterEntry }];
  });
  const sourceHeadChanged = before.source_head_sha !== after.source_head_sha;
  return parseJsonWithSchema(
    {
      schema_version: 1 as const,
      run_id: before.run_id,
      mode: before.mode,
      before_snapshot: refs.before,
      after_snapshot: refs.after,
      before_source_head_sha: before.source_head_sha,
      after_source_head_sha: after.source_head_sha,
      source_head_changed: sourceHeadChanged,
      source_diff: sourceDiff,
      additional_source_diff_count: sourceDiff.length + (sourceHeadChanged ? 1 : 0),
      passed: !sourceHeadChanged && sourceDiff.length === 0,
    },
    workingTreeSnapshotComparisonSchema,
    "working tree snapshot comparison",
  );
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, canonicalJson(value), "utf8");
}

function readSnapshot(rootDir: string, filePath: string): WorkingTreeSnapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid JSON at ${repoRelativePath(rootDir, filePath)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
  return parseJsonWithSchema(raw, workingTreeSnapshotSchema, repoRelativePath(rootDir, filePath));
}

function runCli(args: string[]): number {
  const rootDir = path.resolve(optionValue(args, "--root-dir") ?? process.cwd());
  const runDir = path.resolve(rootDir, requiredOptionValue(args, "--run-dir"));
  const runId = optionValue(args, "--run-id") ?? path.basename(runDir);
  const mode = requiredOptionValue(args, "--mode") as SnapshotMode;
  if (mode !== "normal" && mode !== "gray-box") throw new Error(`Unsupported mode: ${mode}`);

  const phase = optionValue(args, "--phase") as SnapshotPhase | undefined;
  if (phase === "before" || phase === "after") {
    const output = path.resolve(
      rootDir,
      optionValue(args, "--output") ??
        path.join(path.relative(rootDir, runDir), `working-tree-snapshot-${mode}-${phase}.json`),
    );
    const snapshot = captureWorkingTreeSnapshot({ rootDir, runId, mode, phase });
    writeJson(output, snapshot);
    console.log(
      `Captured ${mode} ${phase} working tree snapshot: ${repoRelativePath(rootDir, output)}`,
    );
    return 0;
  }
  if (phase !== undefined) throw new Error(`Unsupported phase: ${phase}`);

  const beforeFile = path.resolve(rootDir, requiredOptionValue(args, "--before"));
  const afterFile = path.resolve(rootDir, requiredOptionValue(args, "--after"));
  const output = path.resolve(
    rootDir,
    optionValue(args, "--output") ??
      path.join(path.relative(rootDir, runDir), `working-tree-snapshot-${mode}-comparison.json`),
  );
  const comparison = compareWorkingTreeSnapshots(
    readSnapshot(rootDir, beforeFile),
    readSnapshot(rootDir, afterFile),
    {
      before: repoRelativePath(rootDir, beforeFile),
      after: repoRelativePath(rootDir, afterFile),
    },
  );
  writeJson(output, comparison);
  console.log(
    JSON.stringify(
      {
        comparison: repoRelativePath(rootDir, output),
        passed: comparison.passed,
        additional_source_diff_count: comparison.additional_source_diff_count,
        source_head_changed: comparison.source_head_changed,
      },
      null,
      2,
    ),
  );
  return comparison.passed ? 0 : 1;
}

if (process.argv[1]?.endsWith("working-tree-snapshot.ts")) {
  try {
    process.exitCode = runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
