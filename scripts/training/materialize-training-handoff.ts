import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseCsv } from "../validate-curriculum";
import { WORKBOOK_HEADERS, type WorkbookFilename } from "./workbook-schema";

const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve("tsx/cli");

const FULL_SHA = /^[0-9a-f]{40}$/;
const LEARNER_CODE_PREFIX = "training/playwright/";
const PROVIDED_TRAINING_CODE_PATHS = new Set(["training/playwright/support/reset-scenario.ts"]);
const CSV_HEADERS = WORKBOOK_HEADERS;
const WORKBOOK_FILENAMES = Object.keys(CSV_HEADERS) as WorkbookFilename[];

type HandoffOptions = {
  root: string;
  target: string;
  sourceSha?: string;
  remote?: string;
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

function isProvidedTrainingCodePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return (
    PROVIDED_TRAINING_CODE_PATHS.has(normalized) ||
    normalized === "training/playwright/exercises/training-exercise-starter.spec.ts" ||
    normalized.startsWith("training/playwright/baseline/") ||
    normalized.startsWith("training/playwright/diagnostic-exercises/") ||
    normalized.startsWith("training/playwright/failure-exercises/") ||
    normalized.startsWith("training/playwright/maintenance-exercises/")
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

function readHandoffCsv(root: string, filename: WorkbookFilename): string {
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
  const pathIndex = header.indexOf("implementation_path");
  const result = new Set<string>();
  for (const row of rows.slice(1)) {
    const implementationPath = row[pathIndex] ?? "";
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
      if (isProvidedTrainingCodePath(repositoryRelative))
        throw new Error(
          repositoryRelative === "training/playwright/support/reset-scenario.ts"
            ? `Provided Training harness must not be copied into handoff-root/code: ${repositoryRelative}`
            : `Provided Training code must not be copied into handoff-root/code: ${repositoryRelative}`,
        );
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

function listTrainingCopyLearnerFiles(source: string): string[] {
  const trainingRoot = path.resolve(source, "training", "playwright");
  if (!isWithin(source, trainingRoot) || !fs.existsSync(trainingRoot))
    throw new Error("Training Copy training/playwright directory is missing");
  if (!fs.statSync(trainingRoot).isDirectory())
    throw new Error("Training Copy training/playwright is not a directory");
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      const relative = path.relative(source, candidate).replace(/\\/g, "/");
      if (!safeRelative(relative) || !relative.startsWith(LEARNER_CODE_PREFIX))
        throw new Error(`Training Copy learner code path is not allowed: ${relative}`);
      if (entry.isSymbolicLink())
        throw new Error(`Training Copy learner code must not use a symlink: ${relative}`);
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile() && isAllowedLearnerCodePath(relative)) {
        if (!isProvidedTrainingCodePath(relative)) files.push(relative);
      } else if (!entry.isDirectory()) {
        throw new Error(`Unsupported Training Copy learner code file type: ${relative}`);
      }
    }
  };
  visit(trainingRoot);
  return files.sort();
}

export function syncTrainingCopyToHandoff(options: { root: string; source: string }): {
  root: string;
  source: string;
  files: string[];
} {
  const root = realRoot(options.root);
  ensureDirectory(root, "code");
  const source = realRoot(options.source);
  if (isWithin(root, source) || isWithin(source, root))
    throw new Error("Training Copy source and handoff root must be separate directories");
  const files = listTrainingCopyLearnerFiles(source);
  const sourceFiles = new Set(files);
  // The handoff's code/ tree is learner-owned. Remove files that disappeared
  // or were renamed in the current Training Copy before copying the current
  // source list. Other handoff directories and provided Training assets are
  // outside this sync contract and are never touched here.
  for (const relativePath of listCodeFiles(root)) {
    if (sourceFiles.has(relativePath)) continue;
    const stalePath = path.resolve(root, "code", relativePath);
    if (!isWithin(root, stalePath))
      throw new Error(`Stale learner code path escaped handoff root: ${relativePath}`);
    const stat = fs.lstatSync(stalePath);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error(`Stale learner code is not a regular file: ${relativePath}`);
    if (!isWithin(root, fs.realpathSync(stalePath)))
      throw new Error(`Stale learner code symlink escaped handoff root: ${relativePath}`);
    fs.unlinkSync(stalePath);
  }
  const synced: string[] = [];
  for (const relativePath of files) {
    const sourceFile = path.resolve(source, relativePath);
    const sourceReal = fs.realpathSync(sourceFile);
    if (!isWithin(source, sourceReal) || !fs.statSync(sourceReal).isFile())
      throw new Error(`Training Copy learner code file is unsafe: ${relativePath}`);
    const destination = path.resolve(root, "code", relativePath);
    if (!isWithin(root, destination))
      throw new Error(`Handoff destination escaped root: ${relativePath}`);
    ensureTargetParent(root, destination);
    if (pathEntryExists(destination)) {
      const stat = fs.lstatSync(destination);
      if (stat.isSymbolicLink() || !stat.isFile())
        throw new Error(`Handoff learner code destination is not a regular file: ${relativePath}`);
    }
    fs.copyFileSync(sourceReal, destination);
    synced.push(relativePath);
  }
  console.log(JSON.stringify({ root, source, synced }, null, 2));
  return { root, source, files: synced };
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
  for (const filename of WORKBOOK_FILENAMES) readHandoffCsv(root, filename);
  const mappedPaths = implementationPaths(root);
  const codeFiles = listCodeFiles(root);
  for (const mapped of mappedPaths) {
    const source = path.resolve(root, "code", mapped);
    if (!isWithin(root, source) || !fs.existsSync(source) || !fs.statSync(source).isFile())
      throw new Error(`Mapped learner code is missing: ${mapped}`);
  }

  const target = path.resolve(options.target);
  const sourceSha = readSourceSha(root, options.sourceSha);
  const remote = options.remote ?? process.env.TRAINING_COPY_REMOTE;
  if (remote !== undefined && (!remote.trim() || remote.includes("\0") || /[\r\n]/.test(remote)))
    throw new Error("--remote must be a non-empty remote URL without control characters");
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
  if (remote !== undefined) {
    execFileSync("git", ["remote", "set-url", "origin", remote], {
      cwd: targetReal,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const configuredRemote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: targetReal,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (configuredRemote !== remote)
      throw new Error("Training Copy origin remote was not configured as requested");
  }
  runValidate(targetReal);

  for (const filename of WORKBOOK_FILENAMES) {
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
  for (const relative of codeFiles) {
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
  if (!root) throw new Error("--root is required");
  if (process.argv.includes("--sync")) {
    const source = option("--source");
    if (!source) throw new Error("--source is required with --sync");
    syncTrainingCopyToHandoff({ root, source });
  } else {
    const target = option("--target");
    if (!target) throw new Error("--target is required");
    const sourceSha = option("--source-sha");
    const remote = option("--remote") ?? process.env.TRAINING_COPY_REMOTE;
    materializeTrainingHandoff({
      root,
      target,
      ...(sourceSha ? { sourceSha } : {}),
      ...(remote ? { remote } : {}),
    });
  }
}
