import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_RULES_PATH,
  TextQualityConfigurationError,
  ensureTextlintConfiguration,
  loadRules,
  scanTextQuality,
} from "../../scripts/lint-text-quality.mjs";
import {
  STATE_SCHEMA_VERSION,
  STATE_STATUS,
  StateValidationError,
  diagnosticCauseFor,
  isValidUnavailableCode,
  rootIdForPath,
  sessionIdHashFor,
  stateFileName,
  validateState,
} from "../../scripts/lib/codex-text-quality-state.mjs";

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
const GENERIC_STOP_BLOCK_REASON = "Text quality check unavailable; completion cannot be confirmed.";
const STOP_DIAGNOSTIC_ACTION = "Run pnpm run diagnose:hooks before completion.";
const STATE_FAILURE_CODES = new Set([
  "baseline_state_missing",
  "baseline_state_read",
  "baseline_state_json",
  "baseline_state_schema",
  "baseline_state_identity",
  "baseline_state_manifest",
]);
const OTHER_SAFE_DIAGNOSTIC_CODES = new Set([
  "baseline_blob",
  "baseline_cleanup",
  "baseline_manifest",
  "baseline_state",
  "baseline_unavailable",
  "baseline_write",
  "current_content",
  "event_mismatch",
  "git_changed_path",
  "git_rename_mapping",
  "git_unavailable",
  "input_json",
  "input_shape",
  "repository_root",
  "session_id",
  "session_rename_mapping",
  "start_head",
  "stop_hook_active",
  "unsafe_path",
  "internal",
]);
let stdoutJsonWritten = false;
class QualityUnavailable extends Error {
  constructor(code, diagnosticCause) {
    super(code);
    this.name = "QualityUnavailable";
    this.code = code;
    this.diagnosticCause = diagnosticCause;
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

function startHeadPathExists(root, startHead, filePath) {
  try {
    execFileSync("git", ["cat-file", "-e", `${startHead}^{commit}`], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    throw new QualityUnavailable("baseline_blob");
  }

  try {
    execFileSync("git", ["cat-file", "-e", `${startHead}:${filePath}`], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch (error) {
    if (error?.status === 128) return false;
    throw new QualityUnavailable("baseline_blob");
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

function baselineHash(root, startHead, entry, filePath = entry?.path) {
  if (entry?.source === "head_blob") {
    return sha256(readBlob(root, startHead, entry.path));
  }
  if (entry?.source === "worktree") {
    if (typeof entry.content_sha256 !== "string") {
      throw new QualityUnavailable("baseline_manifest");
    }
    return entry.content_sha256;
  }
  if (typeof filePath === "string" && startHeadPathExists(root, startHead, filePath)) {
    return sha256(readBlob(root, startHead, filePath));
  }
  throw new QualityUnavailable("baseline_blob");
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
    if (candidates.length === 0) continue;
    const expectedHash = baselineHash(root, startHead, entry, deletedPath);
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

async function getBaselineViolations({ root, startHead, entry, filePath, rules }) {
  if (entry?.source === "head_blob") {
    return scanTextQuality(readBlob(root, startHead, entry.path), { path: filePath, rules });
  }
  if (entry?.source === "worktree") {
    if (!Array.isArray(entry.violations)) throw new QualityUnavailable("baseline_manifest");
    return countsAsViolations(entry.violations, filePath);
  }
  if (entry?.source === "worktree_missing") return [];
  if (!entry && startHeadPathExists(root, startHead, filePath)) {
    return scanTextQuality(readBlob(root, startHead, filePath), { path: filePath, rules });
  }
  if (!entry) return [];
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

async function buildPairs({ root, state, rules, targetPaths }) {
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
  let pathsToScan = changedPaths;
  if (targetPaths && targetPaths.size > 0) {
    const targeted = new Set([...changedPaths].filter((filePath) => targetPaths.has(filePath)));
    if (targeted.size > 0) {
      pathsToScan = targeted;
    }
  }
  if (pathsToScan.size === 0) return { records, pairs: [] };
  await ensureTextlintConfiguration();
  return {
    records,
    pairs: await makePairs(root, state, rules, mappings, entryByPath, pathsToScan),
  };
}

async function makePairs(root, state, rules, mappings, entryByPath, changedPaths) {
  const pairs = [];
  for (const currentPath of [...changedPaths].sort()) {
    const currentStartEntry = entryByPath.get(currentPath);
    const hasWorktreeBaseline = currentStartEntry?.source === "worktree";
    const baselinePath = hasWorktreeBaseline
      ? currentPath
      : (mappings.get(currentPath) ?? currentPath);
    const entry = hasWorktreeBaseline ? currentStartEntry : entryByPath.get(baselinePath);
    const currentContent = readRegularFile(root, currentPath);
    const currentViolations = await scanTextQuality(currentContent, {
      path: currentPath,
      rules,
    });
    const baselineViolations = await getBaselineViolations({
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
  const rootId = rootIdForPath(root);
  const sessionIdHash = sessionIdHashFor(sessionId);
  return {
    rootId,
    sessionIdHash,
    path: path.join(
      root,
      ".artifacts",
      "codex-text-quality",
      stateFileName(rootId, sessionIdHash),
    ),
  };
}

function readState(statePath, stateInfo) {
  let stateText;
  try {
    stateText = fs.readFileSync(statePath, "utf8");
  } catch (error) {
    throw new QualityUnavailable(error?.code === "ENOENT" ? "baseline_state_missing" : "baseline_state_read");
  }

  let state;
  try {
    state = JSON.parse(stateText);
  } catch {
    throw new QualityUnavailable("baseline_state_json");
  }

  try {
    return validateState(state, {
      expectedRootId: stateInfo?.rootId,
      expectedSessionIdHash: stateInfo?.sessionIdHash,
    });
  } catch (error) {
    if (error instanceof StateValidationError) {
      throw new QualityUnavailable(error.code);
    }
    throw new QualityUnavailable("baseline_state_schema");
  }
}

function writeUnavailableState(stateInfo, startHead, error) {
  const errorCode =
    error instanceof QualityUnavailable || error instanceof TextQualityConfigurationError
      ? error.code
      : "baseline_creation";
  const code = isValidUnavailableCode(errorCode) ? errorCode : "baseline_creation";
  const state = {
    schema_version: STATE_SCHEMA_VERSION,
    root_id: stateInfo.rootId,
    session_id_hash: stateInfo.sessionIdHash,
    ...(typeof startHead === "string" && /^[0-9a-f]{40}$/iu.test(startHead)
      ? { start_head: startHead }
      : {}),
    status: STATE_STATUS.UNAVAILABLE,
    code,
  };
  try {
    writeState(stateInfo.path, state);
  } catch {
    // The root and state path are known, but a filesystem error can still prevent persistence.
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
    fs.unlinkSync(statePath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw new QualityUnavailable("baseline_cleanup");
  }
}

async function createWorktreeEntry(root, filePath, rules) {
  const content = readRegularFile(root, filePath);
  return {
    path: filePath,
    source: "worktree",
    content_sha256: sha256(content),
    violations: persistCounts(await scanTextQuality(content, { path: filePath, rules })),
  };
}

async function createBaseline({ root, rules, stateInfo, startHead }) {
  const dirtyPaths = getStartDirtyPaths(root);
  const files = [];

  for (const filePath of [...dirtyPaths].sort()) {
    const existsInStartHead = startHeadPathExists(root, startHead, filePath);
    const existsInCurrentWorktree = currentPathExists(root, filePath);
    if (existsInStartHead && !existsInCurrentWorktree) {
      files.push({ path: filePath, source: "worktree_missing", violations: [] });
      continue;
    }
    if (existsInCurrentWorktree) files.push(await createWorktreeEntry(root, filePath, rules));
  }

  writeState(stateInfo.path, {
    schema_version: STATE_SCHEMA_VERSION,
    root_id: stateInfo.rootId,
    session_id_hash: stateInfo.sessionIdHash,
    status: STATE_STATUS.READY,
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

function safeDiagnosticCode(code) {
  if (STATE_FAILURE_CODES.has(code) || OTHER_SAFE_DIAGNOSTIC_CODES.has(code)) return code;
  if (diagnosticCauseFor(code)) return code;
  return "internal";
}

function safeDiagnosticLabel(code, diagnosticCause) {
  const safeCode = safeDiagnosticCode(code);
  const safeCause = safeCode === "baseline_unavailable" ? diagnosticCauseFor(diagnosticCause) : undefined;
  return safeCause ? `${safeCode}; cause=${safeCause}` : safeCode;
}

function safeDiagnosticLogDirectory(root) {
  let current = path.resolve(root);
  for (const segment of [".artifacts", "codex-hooks"]) {
    current = path.join(current, segment);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (error) {
      if (error?.code !== "ENOENT") return null;
      try {
        fs.mkdirSync(current);
        stats = fs.lstatSync(current);
      } catch {
        return null;
      }
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) return null;
  }
  return current;
}

function appendSafeDiagnosticRecord(root, event, code, stopHookActive, diagnosticCause) {
  try {
    const directory = safeDiagnosticLogDirectory(root);
    if (!directory) return;
    const logPath = path.join(directory, "text-quality-diagnostics.jsonl");
    try {
      const stats = fs.lstatSync(logPath);
      if (!stats.isFile() || stats.isSymbolicLink()) return;
    } catch (error) {
      if (error?.code !== "ENOENT") return;
    }
    const safeCode = safeDiagnosticCode(code);
    const safeCause = safeCode === "baseline_unavailable" ? diagnosticCauseFor(diagnosticCause) : undefined;
    const record = {
      schema_version: 1,
      timestamp: new Date().toISOString(),
      event,
      code: safeCode,
      stop_hook_active: stopHookActive === true,
      ...(safeCause ? { cause: safeCause } : {}),
    };
    fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Diagnostic logging is best-effort and must not change the Hook outcome.
  }
}

function writeJsonOnce(value) {
  if (stdoutJsonWritten) return;
  stdoutJsonWritten = true;
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function outputBlock(reason, systemMessage) {
  const output = { decision: "block", reason };
  if (typeof systemMessage === "string") output.systemMessage = systemMessage;
  writeJsonOnce(output);
}

function formatViolation(violation) {
  return `${violation.path}:${violation.line} [${violation.rule_id}] ${violation.message}`;
}

function formatViolations(violations) {
  return violations.map(formatViolation).join("; ");
}

function diagnostics(code, diagnosticCause) {
  writeJsonOnce({
    continue: true,
    systemMessage: formatDiagnosticMessage(code, diagnosticCause),
  });
}

function formatDiagnosticMessage(code, diagnosticCause) {
  return `Codex text quality hook: quality check unavailable (${safeDiagnosticLabel(code, diagnosticCause)})`;
}

function formatStopBlockReason(code, diagnosticCause) {
  return `${GENERIC_STOP_BLOCK_REASON} Diagnostic: ${safeDiagnosticLabel(code, diagnosticCause)}. ${STOP_DIAGNOSTIC_ACTION}`;
}

function outputAllow() {
  writeJsonOnce({ continue: true });
}

async function processUserPrompt(payload) {
  const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
  const stateInfo = makeStatePath(root, payload.session_id);
  if (fs.existsSync(stateInfo.path)) {
    readState(stateInfo.path, stateInfo);
    return;
  }
  let startHead;
  try {
    startHead = getHead(root);
    await ensureTextlintConfiguration();
    const { rules } = loadRules(process.env.CODEX_TEXT_QUALITY_RULES ?? DEFAULT_RULES_PATH);
    await createBaseline({ root, rules, stateInfo, startHead });
  } catch (error) {
    writeUnavailableState(stateInfo, startHead, error);
    throw error;
  }
}

async function processPostToolUse(payload) {
  const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
  if (READ_ONLY_TOOLS.has(payload.tool_name)) return;
  const stateInfo = makeStatePath(root, payload.session_id);
  const state = readState(stateInfo.path, stateInfo);
  if (state.status !== STATE_STATUS.READY) {
    throw new QualityUnavailable("baseline_unavailable", state.code);
  }
  const { rules } = loadRules(process.env.CODEX_TEXT_QUALITY_RULES ?? DEFAULT_RULES_PATH);
  const explicitPaths = extractMarkdownPaths(payload.tool_input, root);
  const { pairs } = await buildPairs({ root, state, rules, targetPaths: explicitPaths });
  const newViolations = pairs.flatMap((pair) => getNewViolations(pair.baselineViolations, pair.currentViolations));
  if (newViolations.length > 0) {
    outputBlock(`Text quality violation detected: ${formatViolation(newViolations[0])}`);
  }
}

async function processStop(payload) {
  const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
  const stateInfo = makeStatePath(root, payload.session_id);
  let state;
  try {
    state = readState(stateInfo.path, stateInfo);
  } catch (error) {
    if (
      payload.stop_hook_active === true &&
      error instanceof QualityUnavailable &&
      error.code === "baseline_state_missing"
    ) {
      outputAllow();
      return;
    }
    throw error;
  }
  if (state.status !== STATE_STATUS.READY) {
    throw new QualityUnavailable("baseline_unavailable", state.code);
  }
  await ensureTextlintConfiguration();
  const { rules } = loadRules(process.env.CODEX_TEXT_QUALITY_RULES ?? DEFAULT_RULES_PATH);
  const { pairs } = await buildPairs({ root, state, rules });
  const newViolations = pairs.flatMap((pair) => getNewViolations(pair.baselineViolations, pair.currentViolations));
  if (newViolations.length > 0 && payload.stop_hook_active === false) {
    outputBlock(`Text quality violation detected: ${formatViolations(newViolations)}`);
    return;
  }
  if (newViolations.length > 0 && payload.stop_hook_active === true) {
    deleteState(stateInfo.path);
    diagnostics("stop_hook_active");
    return;
  }
  deleteState(stateInfo.path);
}

function cleanupAllowedStop(payload) {
  if (payload?.stop_hook_active !== true || typeof payload.session_id !== "string") return;
  try {
    const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
    const stateInfo = makeStatePath(root, payload.session_id);
    deleteState(stateInfo.path);
  } catch {
    // The Stop hook must remain fail-open when Codex has already activated the stop hook.
  }
}

async function main() {
  const expectedEvent = process.argv[2];
  if (!EXPECTED_EVENTS.has(expectedEvent)) {
    process.stderr.write("Codex text quality hook: unknown event\n");
    return 2;
  }

  let payload;
  try {
    payload = readPayload(expectedEvent);
    if (expectedEvent === "UserPromptSubmit") {
      await processUserPrompt(payload);
    } else if (expectedEvent === "PostToolUse") {
      await processPostToolUse(payload);
    } else {
      await processStop(payload);
    }
    return 0;
  } catch (error) {
    const code =
      error instanceof QualityUnavailable || error instanceof TextQualityConfigurationError
        ? error.code
        : "internal";
    const safeCode = safeDiagnosticCode(code);
    if (payload) {
      try {
        const root = getRoot(typeof payload.cwd === "string" ? payload.cwd : process.cwd());
        appendSafeDiagnosticRecord(
          root,
          expectedEvent,
          safeCode,
          payload.stop_hook_active,
          error?.diagnosticCause,
        );
      } catch {
        // Resolving the diagnostic log root is best-effort and must not change the Hook outcome.
      }
    }
    if (expectedEvent === "Stop" && payload?.stop_hook_active !== true) {
      outputBlock(
        formatStopBlockReason(safeCode, error?.diagnosticCause),
        formatDiagnosticMessage(safeCode, error?.diagnosticCause),
      );
    } else {
      diagnostics(safeCode, error?.diagnosticCause);
      cleanupAllowedStop(payload);
    }
    return 0;
  }
}

process.exitCode = await main();
