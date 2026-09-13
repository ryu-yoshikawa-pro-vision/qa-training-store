import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { DEFAULT_RULES_PATH, loadRules, scanText } from "../../scripts/lint-text-quality.mjs";

const EXPECTED_EVENTS = new Set(["UserPromptSubmit", "PostToolUse", "Stop"]);
const READ_ONLY_TOOLS = new Set([
  "Cat",
  "Glob",
  "Grep",
  "ListDirectory",
  "Read",
  "Search",
  "cat",
  "find",
  "glob",
  "grep",
  "list_dir",
  "read_file",
  "view_image",
]);
const MARKDOWN_PATH_PATTERN = /\.md$/iu;
const STATE_SCHEMA_VERSION = 1;

class QualityUnavailable extends Error {
  constructor(code) {
    super(code);
    this.name = "QualityUnavailable";
    this.code = code;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeGitPath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new QualityUnavailable("unsafe_path");
  }
  return normalized.replace(/^\.\//, "");
}

function isMarkdownPath(value) {
  return MARKDOWN_PATH_PATTERN.test(value);
}

function runGit(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new QualityUnavailable("git_unavailable");
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
        throw new QualityUnavailable("git_rename_mapping");
      }
      records.push({
        status: status[0],
        oldPath: normalizeGitPath(oldPath),
        newPath: normalizeGitPath(newPath),
      });
    } else {
      const filePath = fields[index++];
      if (filePath === undefined) {
        throw new QualityUnavailable("git_changed_path");
      }
      records.push({ status: status[0], path: normalizeGitPath(filePath) });
    }
  }
  return records;
}

function readBlob(root, ref, filePath) {
  try {
    return runGit(["show", `${ref}:${filePath}`], root);
  } catch {
    throw new QualityUnavailable("baseline_blob");
  }
}

function readRegularFile(root, filePath) {
  const absolutePath = path.resolve(root, filePath);
  const relativePath = path.relative(root, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new QualityUnavailable("unsafe_path");
  }
  try {
    const stats = fs.lstatSync(absolutePath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error("not a regular file");
    }
    return fs.readFileSync(absolutePath, "utf8");
  } catch {
    throw new QualityUnavailable("current_content");
  }
}

function getRoot(cwd) {
  const output = runGit(["rev-parse", "--show-toplevel"], cwd).trim();
  if (output.length === 0) {
    throw new QualityUnavailable("repository_root");
  }
  return path.resolve(output);
}

function getHead(root) {
  const head = runGit(["rev-parse", "HEAD"], root).trim();
  if (!/^[0-9a-f]{40}$/iu.test(head)) {
    throw new QualityUnavailable("start_head");
  }
  return head;
}

function listTreeMarkdownPaths(root, ref) {
  return runGit(["ls-tree", "-r", "-z", "--name-only", ref, "--"], root)
    .split("\0")
    .filter(Boolean)
    .map(normalizeGitPath)
    .filter(isMarkdownPath);
}

function currentPathExists(root, filePath) {
  const absolutePath = path.resolve(root, filePath);
  const relativePath = path.relative(root, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new QualityUnavailable("unsafe_path");
  }
  try {
    fs.lstatSync(absolutePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw new QualityUnavailable("current_content");
  }
}

function listCurrentMarkdownPaths(root) {
  return runGit(["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.md"], root)
    .split("\0")
    .filter(Boolean)
    .map(normalizeGitPath)
    .filter(isMarkdownPath)
    .filter((filePath) => currentPathExists(root, filePath));
}

function getWorkingTreeRecords(root, startHead) {
  const records = parseNameStatusZ(runGit(["diff", "--name-status", "-z", "--find-renames", startHead, "--"], root));
  for (const filePath of runGit(["ls-files", "--others", "--exclude-standard", "-z", "--", "*.md"], root).split("\0")) {
    if (filePath !== "") {
      records.push({ status: "A", path: normalizeGitPath(filePath) });
    }
  }
  return records;
}

function getStartDirtyPaths(root) {
  const paths = new Set(
    runGit(["diff", "--name-only", "-z", "HEAD", "--"], root)
      .split("\0")
      .filter(Boolean)
      .map(normalizeGitPath)
      .filter(isMarkdownPath),
  );
  for (const filePath of runGit(["ls-files", "--others", "--exclude-standard", "-z", "--", "*.md"], root).split("\0")) {
    if (filePath !== "") {
      paths.add(normalizeGitPath(filePath));
    }
  }
  return paths;
}

function countFingerprints(violations) {
  const counts = new Map();
  for (const violation of violations) {
    counts.set(violation.fingerprint, (counts.get(violation.fingerprint) ?? 0) + 1);
  }
  return counts;
}

function persistCounts(violations) {
  return [...countFingerprints(violations)]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([fingerprint, count]) => ({ fingerprint, count }));
}

function countsAsViolations(counts, filePath) {
  const violations = [];
  for (const item of counts) {
    for (let index = 0; index < item.count; index += 1) {
      violations.push({ fingerprint: item.fingerprint, path: filePath, line: 0, rule_id: item.fingerprint.split(":", 1)[0], message: "" });
    }
  }
  return violations;
}

function getNewViolations(baselineViolations, currentViolations) {
  const baselineCounts = countFingerprints(baselineViolations);
  const remaining = new Map();
  for (const [fingerprint, count] of countFingerprints(currentViolations)) {
    remaining.set(fingerprint, Math.max(count - (baselineCounts.get(fingerprint) ?? 0), 0));
  }
  return currentViolations.filter((violation) => {
    const remainingCount = remaining.get(violation.fingerprint) ?? 0;
    if (remainingCount === 0) return false;
    remaining.set(violation.fingerprint, remainingCount - 1);
    return true;
  });
}

function getGitRenameMappings(records) {
  const mappings = new Map();
  for (const record of records) {
    if (record.status !== "R" || record.oldPath === undefined || record.newPath === undefined) continue;
    if (!isMarkdownPath(record.oldPath) || !isMarkdownPath(record.newPath)) continue;
    if (mappings.has(record.newPath) || [...mappings.values()].includes(record.oldPath)) {
      throw new QualityUnavailable("git_rename_mapping");
    }
    mappings.set(record.newPath, record.oldPath);
  }
  return mappings;
}

function baselineHash(root, startHead, entry) {
  if (entry.source === "head_blob") {
    return sha256(readBlob(root, startHead, entry.path));
  }
  if (entry.source === "worktree") {
    if (typeof entry.content_sha256 !== "string") {
      throw new QualityUnavailable("baseline_manifest");
    }
    return entry.content_sha256;
  }
  throw new QualityUnavailable("baseline_manifest");
}

function resolveIdentity({ root, startHead, records, startEntries, currentPaths }) {
  const entryByPath = new Map(startEntries.map((entry) => [entry.path, entry]));
  const gitRenameMappings = getGitRenameMappings(records);
  const mappings = new Map(gitRenameMappings);
  const deletedPaths = new Set();
  for (const record of records) {
    if (record.status === "D" && record.path !== undefined && isMarkdownPath(record.path)) {
      deletedPaths.add(record.path);
    } else if (record.status === "R" && record.oldPath !== undefined && isMarkdownPath(record.oldPath)) {
      if (! [...gitRenameMappings.values()].includes(record.oldPath)) {
        deletedPaths.add(record.oldPath);
      }
    }
  }
  for (const entry of startEntries) {
    if (entry.source !== "worktree_missing" && isMarkdownPath(entry.path) && !currentPaths.includes(entry.path)) {
      deletedPaths.add(entry.path);
    }
  }

  const candidateOwners = new Map();
  const startPathSet = new Set(entryByPath.keys());
  const candidates = currentPaths.filter(
    (filePath) => !mappings.has(filePath) && !startPathSet.has(filePath),
  );
  const candidateHashes = new Map();
  if (deletedPaths.size > 0) {
    for (const candidate of candidates) {
      candidateHashes.set(candidate, sha256(readRegularFile(root, candidate)));
    }
  }
  for (const deletedPath of deletedPaths) {
    const entry = entryByPath.get(deletedPath);
    if (!entry) {
      throw new QualityUnavailable("baseline_manifest");
    }
    if (candidates.length === 0) continue;
    const expectedHash = baselineHash(root, startHead, entry);
    const matches = candidates.filter((candidate) => candidateHashes.get(candidate) === expectedHash);
    if (matches.length !== 1) {
      throw new QualityUnavailable("session_rename_mapping");
    }
    const candidate = matches[0];
    if (candidateOwners.has(candidate)) {
      throw new QualityUnavailable("session_rename_mapping");
    }
    candidateOwners.set(candidate, deletedPath);
    mappings.set(candidate, deletedPath);
  }

  return { mappings, entryByPath };
}

function getChangedCurrentPaths(records, mappings, currentPaths) {
  const paths = new Set();
  for (const record of records) {
    if (record.status === "D") continue;
    const filePath = record.newPath ?? record.path;
    if (filePath !== undefined && isMarkdownPath(filePath)) paths.add(filePath);
  }
  for (const filePath of mappings.keys()) paths.add(filePath);
  const currentPathSet = new Set(currentPaths);
  const mappedBaselinePaths = new Set(mappings.values());
  for (const filePath of paths) {
    if (!currentPathSet.has(filePath) && mappedBaselinePaths.has(filePath)) {
      paths.delete(filePath);
    }
  }
  return paths;
}

function getBaselineViolations({ root, startHead, entry, filePath, rules }) {
  if (!entry) return [];
  if (entry.source === "head_blob") {
    return scanText(readBlob(root, startHead, entry.path), { path: filePath, rules });
  }
  if (entry.source === "worktree") {
    if (!Array.isArray(entry.violations)) throw new QualityUnavailable("baseline_manifest");
    return countsAsViolations(entry.violations, filePath);
  }
  if (entry.source === "worktree_missing") return [];
  throw new QualityUnavailable("baseline_manifest");
}

function extractMarkdownPaths(value, root, paths = new Set(), key = "") {
  if (typeof value === "string") {
    if (!/(?:path|file|filename)/iu.test(key) || !isMarkdownPath(value)) return paths;
    const absolute = path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
    const relative = path.relative(root, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return paths;
    paths.add(normalizeGitPath(relative));
    return paths;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractMarkdownPaths(item, root, paths, key);
    return paths;
  }
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      extractMarkdownPaths(childValue, root, paths, childKey);
    }
  }
  return paths;
}

function buildPairs({ root, state, rules, targetPaths }) {
  const records = getWorkingTreeRecords(root, state.start_head);
  const currentPaths = listCurrentMarkdownPaths(root);
  const { mappings, entryByPath } = resolveIdentity({
    root,
    startHead: state.start_head,
    records,
    startEntries: state.files,
    currentPaths,
  });
  const changedPaths = getChangedCurrentPaths(records, mappings, currentPaths);
  if (targetPaths && targetPaths.size > 0) {
    const targeted = new Set([...changedPaths].filter((filePath) => targetPaths.has(filePath)));
    if (targeted.size > 0) {
      return { records, pairs: makePairs(root, state, rules, mappings, entryByPath, targeted) };
    }
  }
  return { records, pairs: makePairs(root, state, rules, mappings, entryByPath, changedPaths) };
}

function makePairs(root, state, rules, mappings, entryByPath, changedPaths) {
  const pairs = [];
  for (const currentPath of [...changedPaths].sort()) {
    const baselinePath = mappings.get(currentPath) ?? currentPath;
    const entry = entryByPath.get(baselinePath);
    if (mappings.has(currentPath) && !entry) {
      throw new QualityUnavailable("baseline_manifest");
    }
    const currentContent = readRegularFile(root, currentPath);
    const currentViolations = scanText(currentContent, { path: currentPath, rules });
    const baselineViolations = getBaselineViolations({
      root,
      startHead: state.start_head,
      entry,
      filePath: baselinePath,
      rules,
    });
    pairs.push({ currentPath, baselinePath, baselineViolations, currentViolations });
  }
  return pairs;
}

function makeStatePath(root, sessionId) {
  const rootId = sha256(path.resolve(root));
  const sessionIdHash = sha256(sessionId);
  return {
    rootId,
    sessionIdHash,
    path: path.join(root, ".artifacts", "codex-text-quality", `${rootId}-${sessionIdHash}.json`),
  };
}

function readState(statePath, stateInfo) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (
      !state ||
      typeof state !== "object" ||
      state.schema_version !== STATE_SCHEMA_VERSION ||
      typeof state.start_head !== "string" ||
      typeof state.root_id !== "string" ||
      typeof state.session_id_hash !== "string" ||
      !Array.isArray(state.files)
    ) {
      throw new Error("invalid state");
    }
    if (
      !/^[0-9a-f]{40}$/iu.test(state.start_head) ||
      !/^[0-9a-f]{64}$/iu.test(state.root_id) ||
      !/^[0-9a-f]{64}$/iu.test(state.session_id_hash) ||
      (stateInfo &&
        (state.root_id !== stateInfo.rootId || state.session_id_hash !== stateInfo.sessionIdHash))
    ) {
      throw new Error("invalid state identity");
    }
    const paths = new Set();
    for (const entry of state.files) {
      if (
        !entry ||
        typeof entry.path !== "string" ||
        !isMarkdownPath(entry.path) ||
        normalizeGitPath(entry.path) !== entry.path ||
        typeof entry.source !== "string" ||
        !["head_blob", "worktree", "worktree_missing"].includes(entry.source) ||
        paths.has(entry.path)
      ) {
        throw new Error("invalid state entry");
      }
      paths.add(entry.path);
      if (entry.source === "worktree") {
        if (
          !/^[0-9a-f]{64}$/iu.test(entry.content_sha256) ||
          !Array.isArray(entry.violations) ||
          entry.violations.some(
            (violation) =>
              !violation ||
              typeof violation.fingerprint !== "string" ||
              !/^[A-Za-z0-9._:-]+:[0-9a-f]{64}$/iu.test(violation.fingerprint) ||
              !Number.isInteger(violation.count) ||
              violation.count < 1,
          )
        ) {
          throw new Error("invalid worktree state entry");
        }
      } else if (entry.source === "worktree_missing") {
        if (!Array.isArray(entry.violations) || entry.violations.length !== 0) {
          throw new Error("invalid missing state entry");
        }
      }
    }
    return state;
  } catch {
    throw new QualityUnavailable("baseline_state");
  }
}

function writeState(statePath, state) {
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(state)}\n`, { encoding: "utf8", flag: "w" });
    fs.renameSync(temporaryPath, statePath);
  } catch {
    throw new QualityUnavailable("baseline_write");
  }
}

function deleteState(statePath) {
  try {
    fs.rmSync(statePath, { force: true });
  } catch {
    throw new QualityUnavailable("baseline_cleanup");
  }
}

function createBaseline({ root, rules, stateInfo }) {
  const startHead = getHead(root);
  const headPaths = listTreeMarkdownPaths(root, startHead);
  const dirtyPaths = getStartDirtyPaths(root);
  const currentPaths = new Set(listCurrentMarkdownPaths(root));
  const files = [];

  for (const filePath of headPaths) {
    if (!dirtyPaths.has(filePath)) {
      files.push({ path: filePath, source: "head_blob" });
      continue;
    }
    if (!currentPaths.has(filePath)) {
      files.push({ path: filePath, source: "worktree_missing", violations: [] });
      continue;
    }
    const content = readRegularFile(root, filePath);
    files.push({
      path: filePath,
      source: "worktree",
      content_sha256: sha256(content),
      violations: persistCounts(scanText(content, { path: filePath, rules })),
    });
  }

  const headPathSet = new Set(headPaths);
  for (const filePath of currentPaths) {
    if (headPathSet.has(filePath)) continue;
    const content = readRegularFile(root, filePath);
    files.push({
      path: filePath,
      source: "worktree",
      content_sha256: sha256(content),
      violations: persistCounts(scanText(content, { path: filePath, rules })),
    });
  }

  writeState(stateInfo.path, {
    schema_version: STATE_SCHEMA_VERSION,
    root_id: stateInfo.rootId,
    session_id_hash: stateInfo.sessionIdHash,
    start_head: startHead,
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
  });
}

function readPayload(expectedEvent) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    throw new QualityUnavailable("input_json");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new QualityUnavailable("input_shape");
  }
  if (payload.hook_event_name !== expectedEvent) {
    throw new QualityUnavailable("event_mismatch");
  }
  if (typeof payload.session_id !== "string" || payload.session_id.length === 0) {
    throw new QualityUnavailable("session_id");
  }
  if (expectedEvent === "Stop" && typeof payload.stop_hook_active !== "boolean") {
    throw new QualityUnavailable("stop_hook_active");
  }
  return payload;
}

function outputBlock(reason) {
  process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
}

function formatViolation(violation) {
  return `${violation.path}:${violation.line} [${violation.rule_id}] ${violation.message}`;
}

function diagnostics(code) {
  process.stderr.write(`Codex text quality hook: quality check unavailable (${code})\n`);
}

function processUserPrompt(payload) {
  const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
  const stateInfo = makeStatePath(root, payload.session_id);
  if (fs.existsSync(stateInfo.path)) {
    readState(stateInfo.path, stateInfo);
    return;
  }
  const { rules } = loadRules(process.env.CODEX_TEXT_QUALITY_RULES ?? DEFAULT_RULES_PATH);
  createBaseline({ root, rules, stateInfo });
}

function processPostToolUse(payload) {
  const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
  if (READ_ONLY_TOOLS.has(payload.tool_name)) return;
  const stateInfo = makeStatePath(root, payload.session_id);
  const state = readState(stateInfo.path, stateInfo);
  const { rules } = loadRules(process.env.CODEX_TEXT_QUALITY_RULES ?? DEFAULT_RULES_PATH);
  const explicitPaths = extractMarkdownPaths(payload.tool_input, root);
  const { pairs } = buildPairs({ root, state, rules, targetPaths: explicitPaths });
  const newViolations = pairs.flatMap((pair) => getNewViolations(pair.baselineViolations, pair.currentViolations));
  if (newViolations.length > 0) {
    outputBlock(`Text quality violation detected: ${formatViolation(newViolations[0])}`);
  }
}

function processStop(payload) {
  const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
  const stateInfo = makeStatePath(root, payload.session_id);
  const state = readState(stateInfo.path);
  const { rules } = loadRules(process.env.CODEX_TEXT_QUALITY_RULES ?? DEFAULT_RULES_PATH);
  const { pairs } = buildPairs({ root, state, rules });
  const newViolations = pairs.flatMap((pair) => getNewViolations(pair.baselineViolations, pair.currentViolations));
  if (newViolations.length > 0 && payload.stop_hook_active === false) {
    outputBlock(`Text quality violation detected: ${formatViolation(newViolations[0])}`);
    return;
  }
  if (newViolations.length > 0 && payload.stop_hook_active === true) {
    diagnostics("stop_hook_active");
  }
  deleteState(stateInfo.path);
}

function cleanupAllowedStop(payload) {
  if (payload?.stop_hook_active !== true || typeof payload.session_id !== "string") return;
  try {
    const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
    deleteState(makeStatePath(root, payload.session_id).path);
  } catch {
    // The Stop hook must remain fail-open when Codex has already activated the stop hook.
  }
}

function main() {
  const expectedEvent = process.argv[2];
  if (!EXPECTED_EVENTS.has(expectedEvent)) {
    process.stderr.write("Codex text quality hook: unknown event\n");
    return 2;
  }

  let payload;
  try {
    payload = readPayload(expectedEvent);
    if (expectedEvent === "UserPromptSubmit") {
      processUserPrompt(payload);
    } else if (expectedEvent === "PostToolUse") {
      processPostToolUse(payload);
    } else {
      processStop(payload);
    }
    return 0;
  } catch (error) {
    const code = error instanceof QualityUnavailable ? error.code : "internal";
    if (expectedEvent === "Stop" && payload?.stop_hook_active !== true) {
      outputBlock("Text quality check unavailable; completion cannot be confirmed.");
    } else {
      diagnostics(code);
      cleanupAllowedStop(payload);
    }
    return 0;
  }
}

process.exitCode = main();
