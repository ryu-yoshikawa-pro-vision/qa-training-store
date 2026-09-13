import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_RULES_PATH, loadRules, publicViolation, scanText } from "./lint-text-quality.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const repositoryRoot = path.resolve(scriptDirectory, "..");

export class ComparisonError extends Error {
  constructor(message) {
    super(message);
    this.name = "ComparisonError";
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeGitPath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new ComparisonError("Git returned a path outside the repository");
  }
  return normalized.replace(/^\.\//, "");
}

function isMarkdownPath(value) {
  return /\.md$/iu.test(value);
}

function runGit(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new ComparisonError(`Git comparison command failed: git ${args.join(" ")}`);
  }
}

function parseNameStatusZ(output) {
  const fields = output.split("\0");
  const records = [];
  let index = 0;
  while (index < fields.length && fields[index] !== "") {
    const status = fields[index++];
    if (status.startsWith("R") || status.startsWith("C")) {
      const oldPath = fields[index++];
      const newPath = fields[index++];
      if (oldPath === undefined || newPath === undefined) {
        throw new ComparisonError("Git rename mapping was truncated");
      }
      records.push({
        status: status[0],
        oldPath: normalizeGitPath(oldPath),
        newPath: normalizeGitPath(newPath),
      });
    } else {
      const filePath = fields[index++];
      if (filePath === undefined) {
        throw new ComparisonError("Git changed path was truncated");
      }
      records.push({ status: status[0], path: normalizeGitPath(filePath) });
    }
  }
  return records;
}

function getDiffRecords(root, { baseRef, workingTree }) {
  const output = workingTree
    ? runGit(["diff", "--name-status", "-z", "--find-renames", baseRef, "--"], root)
    : runGit(["diff", "--name-status", "-z", "--find-renames", baseRef, "HEAD", "--"], root);
  const records = parseNameStatusZ(output);

  if (workingTree) {
    const untrackedOutput = runGit(
      ["ls-files", "--others", "--exclude-standard", "-z", "--", "*.md"],
      root,
    );
    for (const filePath of untrackedOutput.split("\0")) {
      if (filePath !== "") {
        records.push({ status: "A", path: normalizeGitPath(filePath) });
      }
    }
  }
  return records;
}

function getCommitMarkdownPaths(root, ref) {
  const output = runGit(["ls-tree", "-r", "-z", "--name-only", ref, "--"], root);
  return output.split("\0").filter(Boolean).map(normalizeGitPath).filter(isMarkdownPath);
}

function getWorkingTreeMarkdownPaths(root) {
  const output = runGit(
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.md"],
    root,
  );
  return output
    .split("\0")
    .filter(Boolean)
    .map(normalizeGitPath)
    .filter(isMarkdownPath)
    .filter((filePath) => currentPathExists(root, filePath));
}

function ensureRepositoryFile(root, filePath) {
  const absolutePath = path.resolve(root, filePath);
  const relativePath = path.relative(root, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new ComparisonError("Current Markdown path is outside the repository");
  }
  return absolutePath;
}

function currentPathExists(root, filePath) {
  const absolutePath = ensureRepositoryFile(root, filePath);
  try {
    fs.lstatSync(absolutePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw new ComparisonError(`Current Markdown path could not be inspected: ${filePath}`);
  }
}

function readCurrentContent(root, filePath) {
  const absolutePath = ensureRepositoryFile(root, filePath);
  let stats;
  try {
    stats = fs.lstatSync(absolutePath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error("not a regular file");
    }
    return fs.readFileSync(absolutePath, "utf8");
  } catch {
    throw new ComparisonError(`Current Markdown content could not be read: ${filePath}`);
  }
}

function readBlobContent(root, ref, filePath) {
  try {
    return runGit(["show", `${ref}:${filePath}`], root);
  } catch {
    throw new ComparisonError(`Baseline Markdown blob could not be read: ${filePath}`);
  }
}

function unique(values) {
  return [...new Set(values)];
}

function addRecordPath(paths, value) {
  if (value !== undefined && isMarkdownPath(value)) {
    paths.add(value);
  }
}

function getGitRenameMappings(records) {
  const mappings = new Map();
  for (const record of records) {
    if (record.status !== "R" || record.oldPath === undefined || record.newPath === undefined) {
      continue;
    }
    if (!isMarkdownPath(record.newPath) || !isMarkdownPath(record.oldPath)) {
      continue;
    }
    if (mappings.has(record.newPath) || [...mappings.values()].includes(record.oldPath)) {
      throw new ComparisonError("Git rename mapping was not one-to-one");
    }
    mappings.set(record.newPath, record.oldPath);
  }
  return mappings;
}

function getChangedCurrentPaths(records) {
  const paths = new Set();
  for (const record of records) {
    if (record.status === "D") {
      continue;
    }
    if (record.newPath !== undefined) {
      addRecordPath(paths, record.newPath);
    } else {
      addRecordPath(paths, record.path);
    }
  }
  return paths;
}

function getDeletedBaselinePaths(records, renameMappings) {
  const paths = new Set();
  for (const record of records) {
    if (record.status === "D") {
      addRecordPath(paths, record.path);
    } else if (
      record.status === "R" &&
      record.oldPath !== undefined &&
      isMarkdownPath(record.oldPath)
    ) {
      if (![...renameMappings.values()].includes(record.oldPath)) {
        paths.add(record.oldPath);
      }
    }
  }
  return paths;
}

function resolveExactMoveMappings({
  root,
  baselineRef,
  baselinePaths,
  currentPaths,
  records,
  gitRenameMappings,
}) {
  const mappings = new Map(gitRenameMappings);
  const deletedPaths = getDeletedBaselinePaths(records, gitRenameMappings);
  const baselinePathSet = new Set(baselinePaths);
  const currentCandidates = unique(
    [...currentPaths].filter(
      (filePath) => !mappings.has(filePath) && !baselinePathSet.has(filePath),
    ),
  );
  if (deletedPaths.size === 0 || currentCandidates.length === 0) {
    return mappings;
  }

  const candidateHashes = new Map();
  for (const candidate of currentCandidates) {
    candidateHashes.set(candidate, sha256(readCurrentContent(root, candidate)));
  }

  const matchedCandidates = new Map();
  for (const deletedPath of deletedPaths) {
    if (!baselinePathSet.has(deletedPath)) {
      throw new ComparisonError(
        "Deleted Markdown baseline path was not present in the comparison tree",
      );
    }
    const baselineHash = sha256(readBlobContent(root, baselineRef, deletedPath));
    const matches = currentCandidates.filter(
      (candidate) => candidateHashes.get(candidate) === baselineHash,
    );
    if (matches.length !== 1) {
      throw new ComparisonError("Deleted Markdown path has no unique exact-content mapping");
    }
    const candidate = matches[0];
    if (matchedCandidates.has(candidate)) {
      throw new ComparisonError("Multiple deleted Markdown paths map to one current file");
    }
    matchedCandidates.set(candidate, deletedPath);
    mappings.set(candidate, deletedPath);
  }
  return mappings;
}

function countFingerprints(violations) {
  const counts = new Map();
  for (const violation of violations) {
    counts.set(violation.fingerprint, (counts.get(violation.fingerprint) ?? 0) + 1);
  }
  return counts;
}

function getNewViolations(baselineViolations, currentViolations) {
  const baselineCounts = countFingerprints(baselineViolations);
  const currentCounts = countFingerprints(currentViolations);
  const remaining = new Map();
  for (const [fingerprint, currentCount] of currentCounts) {
    remaining.set(fingerprint, Math.max(currentCount - (baselineCounts.get(fingerprint) ?? 0), 0));
  }

  return currentViolations.filter((violation) => {
    const count = remaining.get(violation.fingerprint) ?? 0;
    if (count === 0) return false;
    remaining.set(violation.fingerprint, count - 1);
    return true;
  });
}

function buildChangedFilePairs({ root, baseRef, workingTree, rules }) {
  const baselineRef = workingTree ? baseRef : runGit(["merge-base", baseRef, "HEAD"], root).trim();
  if (baselineRef.length === 0) {
    throw new ComparisonError("Git merge-base did not return a comparison base");
  }

  const records = getDiffRecords(root, {
    baseRef: workingTree ? baseRef : baselineRef,
    workingTree,
  });
  const baselinePaths = getCommitMarkdownPaths(root, baselineRef);
  const currentPaths = workingTree
    ? getWorkingTreeMarkdownPaths(root)
    : getCommitMarkdownPaths(root, "HEAD");
  const gitRenameMappings = getGitRenameMappings(records);
  const identityMappings = resolveExactMoveMappings({
    root,
    baselineRef,
    baselinePaths,
    currentPaths,
    records,
    gitRenameMappings,
  });
  const changedCurrentPaths = getChangedCurrentPaths(records);
  for (const currentPath of identityMappings.keys()) {
    changedCurrentPaths.add(currentPath);
  }

  const baselinePathSet = new Set(baselinePaths);
  const pairs = [];
  for (const currentPath of [...changedCurrentPaths].sort()) {
    if (!isMarkdownPath(currentPath)) continue;
    const baselinePath =
      identityMappings.get(currentPath) ?? (baselinePathSet.has(currentPath) ? currentPath : null);
    const currentContent = workingTree
      ? readCurrentContent(root, currentPath)
      : readBlobContent(root, "HEAD", currentPath);
    const baselineContent =
      baselinePath === null ? null : readBlobContent(root, baselineRef, baselinePath);
    const baselineViolations =
      baselineContent === null ? [] : scanText(baselineContent, { path: baselinePath, rules });
    const currentViolations = scanText(currentContent, { path: currentPath, rules });
    pairs.push({ currentPath, baselinePath, baselineViolations, currentViolations });
  }

  return { baselineRef, pairs };
}

export function compareTextQualityChanges({
  root = repositoryRoot,
  baseRef,
  workingTree = false,
  rules,
}) {
  if (typeof baseRef !== "string" || baseRef.trim() === "") {
    throw new ComparisonError("--base-ref requires a Git ref");
  }
  const { baselineRef, pairs } = buildChangedFilePairs({
    root,
    baseRef: baseRef.trim(),
    workingTree,
    rules,
  });
  const violations = [];
  for (const pair of pairs) {
    violations.push(...getNewViolations(pair.baselineViolations, pair.currentViolations));
  }
  return {
    status: violations.length === 0 ? "pass" : "violations",
    mode: workingTree ? "working-tree" : "commit",
    comparison_base: baselineRef,
    changed_files: pairs.length,
    violations: violations.map(publicViolation),
  };
}

function parseArguments(argv) {
  const options = {
    baseRef: null,
    workingTree: false,
    rulesPath: process.env.CODEX_TEXT_QUALITY_RULES ?? DEFAULT_RULES_PATH,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base-ref") {
      options.baseRef = argv[++index];
    } else if (argument === "--working-tree") {
      options.workingTree = true;
    } else if (argument === "--rules") {
      options.rulesPath = argv[++index];
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  if (options.help) return options;
  if (options.baseRef === null || options.baseRef === undefined || options.baseRef === "") {
    throw new Error("--base-ref is required");
  }
  return options;
}

function printUsage() {
  process.stderr.write(
    "Usage: node scripts/check-text-quality-changes.mjs --base-ref <ref> [--working-tree] [--rules path] [--json]\n",
  );
}

function runCli() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    if (options.help) {
      printUsage();
      return 0;
    }
    const { rules } = loadRules(options.rulesPath);
    const result = compareTextQualityChanges({
      root: repositoryRoot,
      baseRef: options.baseRef,
      workingTree: options.workingTree,
      rules,
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } else if (result.status === "pass") {
      process.stdout.write(
        `PASS: text quality comparison (${result.mode}, changed Markdown files=${result.changed_files})\n`,
      );
    } else {
      process.stdout.write(`FAIL: ${result.violations.length} new text quality violation(s)\n`);
      for (const violation of result.violations) {
        const replacement =
          violation.replacement === undefined
            ? ""
            : ` replacement=${JSON.stringify(violation.replacement)}`;
        process.stdout.write(
          `${violation.path}:${violation.line} [${violation.rule_id}] ${violation.message}${replacement}\n`,
        );
      }
    }
    return result.status === "pass" ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`ERROR: text quality comparison unavailable: ${message}\n`);
    if (options?.json) {
      process.stdout.write(
        `${JSON.stringify({ status: "comparison-error", error: "comparison unavailable" })}\n`,
      );
    } else {
      printUsage();
    }
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  process.exitCode = runCli();
}
