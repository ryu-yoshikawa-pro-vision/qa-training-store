import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseCsv } from "../validate-curriculum";

const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve("tsx/cli");

const FULL_SHA = /^[0-9a-f]{40}$/;
const LEARNER_CODE_PREFIX = "training/playwright/";
const CSV_HEADERS: Record<string, readonly string[]> = {
  "01_target-risk.csv": [
    "target_id",
    "spec_ref",
    "br_ids",
    "ac_ids",
    "risk_id",
    "risk_description",
    "impact",
    "likelihood",
    "priority",
  ],
  "02_test-cases.csv": [
    "test_case_id",
    "risk_id",
    "spec_ref",
    "br_ids",
    "ac_ids",
    "test_condition",
    "precondition",
    "expected_result",
    "design_technique",
  ],
  "03_automation-mapping.csv": [
    "test_case_id",
    "automation_decision",
    "test_layer",
    "tool",
    "implementation_path",
    "execution_timing",
    "reason",
  ],
  "04_execution-improvement.csv": [
    "test_case_id",
    "run_context",
    "result",
    "evidence",
    "failure_category",
    "cause",
    "action",
    "improvement",
  ],
};

type HandoffOptions = {
  root: string;
  target: string;
  sourceSha?: string;
};

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function safeRelative(value: string): boolean {
  if (!value || value.includes("\0")) return false;
  if (/^(?:[A-Za-z]:[\\/]|[\\/]|\\\\)/.test(value)) return false;
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").some((part) => part === "" || part === ".." || part === ".");
}

function isAllowedLearnerCodePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return (
    normalized.startsWith(LEARNER_CODE_PREFIX) && /\.(?:[cm]?tsx?|[cm]?jsx?)$/i.test(normalized)
  );
}

function isAllowedLearnerCodeDirectory(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return (
    normalized === "training" ||
    normalized === "training/playwright" ||
    normalized.startsWith(LEARNER_CODE_PREFIX)
  );
}

function realRoot(rootOption: string): string {
  const root = path.resolve(rootOption);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
    throw new Error(`Handoff root is not a directory: ${root}`);
  return fs.realpathSync(root);
}

function ensureDirectory(root: string, relative: string): string {
  const directory = path.resolve(root, relative);
  if (!isWithin(root, directory)) throw new Error(`Directory escaped handoff root: ${relative}`);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory())
    throw new Error(`Required handoff directory is missing: ${relative}`);
  const real = fs.realpathSync(directory);
  if (!isWithin(root, real)) throw new Error(`Handoff directory symlink escaped root: ${relative}`);
  return real;
}

function pathEntryExists(target: string): boolean {
  try {
    fs.lstatSync(target);
    return true;
  } catch {
    return false;
  }
}

function readHandoffCsv(root: string, filename: string): string {
  const file = path.resolve(root, "workbook", filename);
  if (!isWithin(root, file) || !fs.existsSync(file) || !fs.lstatSync(file).isFile())
    throw new Error(`Handoff Workbook file is missing: ${filename}`);
  const real = fs.realpathSync(file);
  if (!isWithin(root, real)) throw new Error(`Handoff Workbook symlink escaped root: ${filename}`);
  const text = fs.readFileSync(file, "utf8");
  const rows = parseCsv(text, filename);
  const expected = CSV_HEADERS[filename];
  const header = rows[0] ?? [];
  if (
    !expected ||
    header.length !== expected.length ||
    header.some((value, index) => value !== expected[index])
  )
    throw new Error(`Handoff Workbook schema is invalid: ${filename}`);
  if (rows.length < 2) throw new Error(`Handoff Workbook has no data row: ${filename}`);
  return text;
}

function implementationPaths(root: string): string[] {
  const rows = parseCsv(
    readHandoffCsv(root, "03_automation-mapping.csv"),
    "03_automation-mapping.csv",
  );
  const header = rows[0] ?? [];
  const decisionIndex = header.indexOf("automation_decision");
  const pathIndex = header.indexOf("implementation_path");
  const result = new Set<string>();
  for (const row of rows.slice(1)) {
    const decision = row[decisionIndex] ?? "";
    const implementationPath = row[pathIndex] ?? "";
    if (decision === "Automate" && !implementationPath)
      throw new Error("Automate mapping has an empty implementation_path");
    if (implementationPath) {
      if (!safeRelative(implementationPath))
        throw new Error(`Unsafe implementation_path: ${implementationPath}`);
      if (!isAllowedLearnerCodePath(implementationPath))
        throw new Error(`Learner code path is outside training/playwright: ${implementationPath}`);
      result.add(implementationPath.replace(/\\/g, "/"));
    }
  }
  return [...result];
}

function listCodeFiles(root: string): string[] {
  const codeRoot = ensureDirectory(root, "code");
  const files: string[] = [];
  const visitedDirectories = new Set<string>();
  const visit = (directory: string): void => {
    const realDirectory = fs.realpathSync(directory);
    if (!isWithin(root, realDirectory))
      throw new Error(`Code directory symlink escaped handoff root: ${directory}`);
    if (visitedDirectories.has(realDirectory)) return;
    visitedDirectories.add(realDirectory);
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      const relative = path.relative(root, file);
      if (!safeRelative(relative)) throw new Error(`Unsafe code path: ${relative}`);
      const repositoryRelative = relative.replace(/^code[\\/]/, "").replace(/\\/g, "/");
      if (entry.isSymbolicLink()) {
        const real = fs.realpathSync(file);
        if (!isWithin(root, real))
          throw new Error(`Code symlink escaped handoff root: ${relative}`);
        if (fs.statSync(real).isDirectory()) {
          if (!isAllowedLearnerCodeDirectory(repositoryRelative))
            throw new Error(`Learner code path is not allowed: ${repositoryRelative}`);
          visit(file);
        } else {
          if (!isAllowedLearnerCodePath(repositoryRelative))
            throw new Error(`Learner code path is not allowed: ${repositoryRelative}`);
          files.push(repositoryRelative);
        }
      } else if (entry.isDirectory()) {
        if (!isAllowedLearnerCodeDirectory(repositoryRelative))
          throw new Error(`Learner code path is not allowed: ${repositoryRelative}`);
        visit(file);
      } else if (entry.isFile()) {
        if (!isAllowedLearnerCodePath(repositoryRelative))
          throw new Error(`Learner code path is not allowed: ${repositoryRelative}`);
        files.push(repositoryRelative);
      } else throw new Error(`Unsupported code file type: ${relative}`);
    }
  };
  visit(codeRoot);
  return files;
}

function readSourceSha(root: string, explicit?: string): string {
  if (explicit) {
    if (!FULL_SHA.test(explicit))
      throw new Error("--source-sha must be a 40-character lowercase SHA");
    return explicit;
  }
  const environmentSha = process.env.TRAINING_COPY_SOURCE_SHA;
  if (environmentSha && FULL_SHA.test(environmentSha)) return environmentSha;
  const receiptRoot = ensureDirectory(root, "receipts");
  const visit = (directory: string): string | undefined => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Receipt source reference cannot use a symlink: ${path.relative(root, file)}`,
        );
      }
      if (entry.isDirectory()) {
        const found = visit(file);
        if (found) return found;
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
          if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
          const run = (value as Record<string, unknown>).run;
          if (typeof run !== "object" || run === null || Array.isArray(run)) continue;
          const sha = (run as Record<string, unknown>).training_copy_source_sha;
          if (typeof sha === "string" && FULL_SHA.test(sha)) return sha;
        } catch {
          // Invalid receipts are checked by training:completion:check; they are not a source of truth here.
        }
      }
    }
    return undefined;
  };
  const found = visit(receiptRoot);
  if (found) return found;
  throw new Error(
    "Training Copy source SHA is unavailable; pass --source-sha or provide a Receipt source reference",
  );
}

function runPrepare(sourceSha: string, target: string): void {
  const result = spawnSync(
    process.execPath,
    [
      TSX_CLI,
      "scripts/training/prepare-training-copy.ts",
      "--source-sha",
      sourceSha,
      "--target",
      target,
    ],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `training:copy:prepare failed: ${result.stderr || result.stdout || result.status}`,
    );
}

function copyFile(root: string, target: string, relativePath: string): void {
  if (!isAllowedLearnerCodePath(relativePath))
    throw new Error(`Learner code path is not allowed: ${relativePath}`);
  const source = path.resolve(root, "code", relativePath);
  if (!isWithin(root, source) || !fs.existsSync(source) || !fs.statSync(source).isFile())
    throw new Error(`Handoff code file is missing: ${relativePath}`);
  const sourceReal = fs.realpathSync(source);
  if (!isWithin(root, sourceReal))
    throw new Error(`Handoff code symlink escaped root: ${relativePath}`);
  const destination = path.resolve(target, relativePath);
  if (!isWithin(target, destination))
    throw new Error(`Materialize destination escaped Training Copy: ${relativePath}`);
  ensureTargetParent(target, destination);
  if (pathEntryExists(destination))
    throw new Error(
      `Learner code destination already exists; refusing to overwrite: ${relativePath}`,
    );
  fs.copyFileSync(sourceReal, destination);
}

function ensureTargetParent(target: string, destination: string): void {
  const parent = path.dirname(destination);
  if (!isWithin(target, parent))
    throw new Error(`Materialize parent escaped Training Copy: ${parent}`);
  fs.mkdirSync(parent, { recursive: true });
  if (!isWithin(target, fs.realpathSync(parent)))
    throw new Error(`Materialize parent symlink escaped Training Copy: ${parent}`);
}

export function materializeTrainingHandoff(options: HandoffOptions): {
  target: string;
  sourceSha: string;
  files: string[];
} {
  const root = realRoot(options.root);
  ensureDirectory(root, "workbook");
  ensureDirectory(root, "code");
  ensureDirectory(root, "evidence");
  ensureDirectory(root, "receipts");
  ensureDirectory(root, "self-check");
  for (const filename of Object.keys(CSV_HEADERS)) readHandoffCsv(root, filename);
  const mappedPaths = implementationPaths(root);
  const codeFiles = listCodeFiles(root);
  const mappedSet = new Set(mappedPaths.map((file) => file.split(path.sep).join("/")));
  for (const file of codeFiles) {
    const normalized = file.split(path.sep).join("/");
    if (!mappedSet.has(normalized))
      throw new Error(`Code file is not referenced by Workbook implementation_path: ${normalized}`);
  }
  for (const mapped of mappedPaths) {
    const source = path.resolve(root, "code", mapped);
    if (!isWithin(root, source) || !fs.existsSync(source) || !fs.statSync(source).isFile())
      throw new Error(`Mapped learner code is missing: ${mapped}`);
  }

  const target = path.resolve(options.target);
  const sourceSha = readSourceSha(root, options.sourceSha);
  if (pathEntryExists(target))
    throw new Error(`Target already exists; refusing to overwrite: ${target}`);
  if (isWithin(root, target)) throw new Error(`Target must be outside handoff root: ${target}`);
  const targetParent = path.dirname(target);
  fs.mkdirSync(targetParent, { recursive: true });
  if (fs.existsSync(targetParent) && isWithin(root, fs.realpathSync(targetParent))) {
    throw new Error(`Target parent resolves inside handoff root: ${targetParent}`);
  }
  runPrepare(sourceSha, target);
  const targetReal = fs.realpathSync(target);
  if (!fs.statSync(targetReal).isDirectory())
    throw new Error(`Prepared Training Copy is not a directory: ${target}`);
  runValidate(targetReal);

  for (const filename of Object.keys(CSV_HEADERS)) {
    const destination = path.resolve(targetReal, "training", "workbook", filename);
    if (!isWithin(targetReal, destination))
      throw new Error(`Workbook destination escaped Training Copy: ${filename}`);
    ensureTargetParent(targetReal, destination);
    if (!pathEntryExists(destination))
      throw new Error(`Training Copy Workbook destination is missing: ${filename}`);
    if (!fs.lstatSync(destination).isFile() || !isWithin(targetReal, fs.realpathSync(destination)))
      throw new Error(`Training Copy Workbook destination is not a safe regular file: ${filename}`);
    fs.copyFileSync(path.resolve(root, "workbook", filename), destination);
  }
  const materialized: string[] = [];
  for (const relative of mappedPaths) {
    copyFile(root, targetReal, relative);
    materialized.push(relative);
  }
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: targetReal,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (head !== sourceSha) throw new Error(`Training Copy HEAD changed during materialize: ${head}`);
  runValidate(targetReal);
  console.log(JSON.stringify({ target: targetReal, sourceSha, materialized }, null, 2));
  return { target: targetReal, sourceSha, files: materialized };
}

function runValidate(target: string): void {
  const result = spawnSync(
    process.execPath,
    [TSX_CLI, "scripts/training/validate-training-copy.ts", "--root", target],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `training:copy:validate failed: ${result.stderr || result.stdout || result.status}`,
    );
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const root = option("--root");
  const target = option("--target");
  if (!root) throw new Error("--root is required");
  if (!target) throw new Error("--target is required");
  const sourceSha = option("--source-sha");
  materializeTrainingHandoff({ root, target, ...(sourceSha ? { sourceSha } : {}) });
}
