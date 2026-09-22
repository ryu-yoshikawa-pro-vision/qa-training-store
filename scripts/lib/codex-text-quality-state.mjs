import crypto from "node:crypto";
import path from "node:path";

export const STATE_SCHEMA_VERSION = 2;
export const STATE_STATUS = Object.freeze({
  READY: "ready",
  UNAVAILABLE: "baseline_unavailable",
});

const MARKDOWN_PATH_PATTERN = /\.md$/iu;
const STATE_ID_PATTERN = /^[0-9a-f]{64}$/iu;
const START_HEAD_PATTERN = /^[0-9a-f]{40}$/iu;
const UNAVAILABLE_CODE_PATTERN = /^[a-z0-9_]{1,64}$/u;
const STATE_FILE_PATTERN = /^([0-9a-f]{64})-([0-9a-f]{64})\.json$/iu;

const SAFE_UNAVAILABLE_DIAGNOSTIC_CODES = Object.freeze([
  "git_unavailable",
  "start_head",
  "unsafe_path",
  "baseline_blob",
  "current_content",
  "baseline_write",
  "textlint_config_unavailable",
  "textlint_config_invalid",
  "textlint_rule_set_invalid",
  "textlint_config_load",
  "textlint_rule_load",
  "textlint_message_range",
  "textlint_message_shape",
  "textlint_message_match",
  "textlint_scan",
  "textlint_result",
  "rule_id_collision",
  "baseline_creation",
]);
const SAFE_UNAVAILABLE_DIAGNOSTIC_CODE_SET = new Set(SAFE_UNAVAILABLE_DIAGNOSTIC_CODES);

export class StateValidationError extends Error {
  constructor(code) {
    super(code);
    this.name = "StateValidationError";
    this.code = code;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function fail(code) {
  throw new StateValidationError(code);
}

function normalizeStatePath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) return null;
  return normalized.replace(/^\.\//, "");
}

function isMarkdownPath(value) {
  return MARKDOWN_PATH_PATTERN.test(value);
}

export function rootIdForPath(root) {
  return sha256(path.resolve(root));
}

export function sessionIdHashFor(sessionId) {
  return sha256(sessionId);
}

export function stateFileName(rootId, sessionIdHash) {
  return `${rootId}-${sessionIdHash}.json`;
}

export function parseStateFileName(fileName) {
  const match = STATE_FILE_PATTERN.exec(fileName);
  if (!match) return null;
  return { rootId: match[1], sessionIdHash: match[2] };
}

export function isValidUnavailableCode(code) {
  return typeof code === "string" && UNAVAILABLE_CODE_PATTERN.test(code);
}

export function diagnosticCauseFor(code) {
  return isValidUnavailableCode(code) && SAFE_UNAVAILABLE_DIAGNOSTIC_CODE_SET.has(code)
    ? code
    : undefined;
}

export function validateState(state, { expectedRootId, expectedSessionIdHash } = {}) {
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state) ||
    state.schema_version !== STATE_SCHEMA_VERSION ||
    typeof state.root_id !== "string" ||
    typeof state.session_id_hash !== "string" ||
    typeof state.status !== "string"
  ) {
    fail("baseline_state_schema");
  }

  if (
    state.start_head !== undefined &&
    (typeof state.start_head !== "string" || !START_HEAD_PATTERN.test(state.start_head))
  ) {
    fail("baseline_state_schema");
  }

  if (
    !STATE_ID_PATTERN.test(state.root_id) ||
    !STATE_ID_PATTERN.test(state.session_id_hash) ||
    (expectedRootId !== undefined && state.root_id !== expectedRootId) ||
    (expectedSessionIdHash !== undefined && state.session_id_hash !== expectedSessionIdHash)
  ) {
    fail("baseline_state_identity");
  }

  if (state.status === STATE_STATUS.UNAVAILABLE) {
    const allowedKeys = new Set([
      "schema_version",
      "root_id",
      "session_id_hash",
      "start_head",
      "status",
      "code",
    ]);
    if (
      Object.keys(state).some((key) => !allowedKeys.has(key)) ||
      (state.code !== undefined && !isValidUnavailableCode(state.code))
    ) {
      fail("baseline_state_schema");
    }
    return state;
  }

  if (
    state.status !== STATE_STATUS.READY ||
    typeof state.start_head !== "string" ||
    !START_HEAD_PATTERN.test(state.start_head) ||
    !Array.isArray(state.files)
  ) {
    fail("baseline_state_schema");
  }

  const readyKeys = new Set([
    "schema_version",
    "root_id",
    "session_id_hash",
    "status",
    "start_head",
    "files",
  ]);
  if (Object.keys(state).some((key) => !readyKeys.has(key))) {
    fail("baseline_state_schema");
  }

  const paths = new Set();
  for (const entry of state.files) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      !isMarkdownPath(entry.path) ||
      normalizeStatePath(entry.path) !== entry.path ||
      typeof entry.source !== "string" ||
      !["head_blob", "worktree", "worktree_missing"].includes(entry.source) ||
      paths.has(entry.path)
    ) {
      fail("baseline_state_manifest");
    }
    paths.add(entry.path);

    if (entry.source === "worktree") {
      if (
        typeof entry.content_sha256 !== "string" ||
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
        fail("baseline_state_manifest");
      }
    } else if (
      entry.source === "worktree_missing" &&
      (!Array.isArray(entry.violations) || entry.violations.length !== 0)
    ) {
      fail("baseline_state_manifest");
    }
  }

  return state;
}
