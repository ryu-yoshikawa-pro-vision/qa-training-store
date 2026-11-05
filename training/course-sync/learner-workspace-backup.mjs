#!/usr/bin/env node
import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import { assertNoSecretText } from "../../scripts/training/ai-assisted-qa-assessment-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const MAX_FILES = 10000;
const MAX_ARCHIVE_BYTES = 384 * 1024 * 1024;
const MODULES = Array.from({ length: 8 }, (_, i) => "M" + String(i).padStart(2, "0"));
const PERSONAL_EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@(?:gmail\.com|yahoo\.(?:co\.jp|com)|icloud\.com|outlook\.(?:com|jp)|hotmail\.com)\b/i;
const TEXT_FILE = /\.(?:md|txt|json|jsonl|log|ts|tsx|js|mjs|yaml|yml|csv|html|xml|ini|config)$/i;

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function lstatIfExists(absolute) {
  try {
    return fs.lstatSync(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function safeRelative(relative) {
  if (
    typeof relative !== "string" ||
    relative.includes("\\") ||
    relative.startsWith("/") ||
    relative.split("/").some((part) => part === "" || part === "." || part === "..") ||
    !(
      /^workspace\/M0[0-7]\/.+$/.test(relative) ||
      /^workspace\/\.course-assessments\/P[12]\/.+$/.test(relative) ||
      /^\.course-load\/M0[0-7]-[^/]+\.json$/.test(relative)
    )
  )
    fail("backup path is outside Phase 1/2 learner data: " + relative);
  return relative;
}

function excluded(relative) {
  return relative
    .split("/")
    .some(
      (name) =>
        /^\.env(?:\.|$)/i.test(name) ||
        /^(?:\.git|\.ssh|node_modules|\.npmrc|\.course-assessment-tmp)$/i.test(name) ||
        /(?:secret|credential|private-key|access-token)/i.test(name) ||
        /\.(?:pem|key|p12|pfx)$/i.test(name),
    );
}

function safePath(root, relative) {
  const parts = relative.split("/");
  const resolvedRoot = path.resolve(root);
  let current = resolvedRoot;
  const rootStat = lstatIfExists(current);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) fail("unsafe learner root");
  for (const part of parts) {
    current = path.join(current, part);
    const stat = lstatIfExists(current);
    if (stat?.isSymbolicLink()) fail("symlink is prohibited: " + relative);
    if (stat && current !== path.join(resolvedRoot, ...parts) && !stat.isDirectory())
      fail("non-directory ancestor: " + relative);
  }
  return current;
}

function courseIdentity(root) {
  const location = safePath(root, ".course/distribution-manifest.json");
  const stat = lstatIfExists(location);
  if (!stat?.isFile()) fail("verified learner distribution manifest is required");
  const value = JSON.parse(fs.readFileSync(location, "utf8"));
  if (!/^[a-f0-9]{40}$/.test(value.source_sha ?? "") || !value.state_contract_revision)
    fail("learner source SHA or revision is invalid");
  return { source_sha: value.source_sha, revision: value.state_contract_revision };
}

function outsideRepository(root, location, mustExist) {
  if (typeof location !== "string" || !path.isAbsolute(location))
    fail("backup location must be an absolute path outside the learner repository");
  const absolute = path.resolve(location);
  const relative = path.relative(path.resolve(root), absolute);
  if (
    relative === "" ||
    (relative !== ".." && !relative.startsWith("../") && !path.isAbsolute(relative))
  )
    fail("backup location must be outside the learner repository");
  let current = path.parse(absolute).root;
  for (const component of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const stat = lstatIfExists(current);
    if (stat?.isSymbolicLink()) fail("backup path contains a symlink");
  }
  const parent = lstatIfExists(path.dirname(absolute));
  if (!parent?.isDirectory()) fail("backup parent directory must already exist");
  const stat = lstatIfExists(absolute);
  if (mustExist ? !stat?.isFile() : stat !== null)
    fail(mustExist ? "backup archive does not exist" : "backup archive already exists");
  return absolute;
}

function collectLearnerFiles(root) {
  const files = [];
  let totalBytes = 0;
  let excludedCount = 0;
  const excludedPaths = [];
  const visit = (relative) => {
    const absolute = safePath(root, relative);
    const stat = lstatIfExists(absolute);
    if (!stat) return;
    if (excluded(relative)) {
      excludedCount += 1;
      excludedPaths.push(relative);
      return;
    }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) {
        if (relative === ".course-load" && !/^M0[0-7]-[^/]+\.json$/.test(entry)) continue;
        visit(relative + "/" + entry);
      }
      return;
    }
    if (!stat.isFile() || !safeRelative(relative)) fail("unsafe learner entry: " + relative);
    if (stat.size > MAX_FILE_BYTES || files.length >= MAX_FILES)
      fail("backup file size or count limit exceeded");
    const noFollow = fs.constants.O_NOFOLLOW;
    if (!Number.isInteger(noFollow) || noFollow === 0)
      fail("safe no-follow file access is unsupported on this platform");
    const descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    let bytes;
    try {
      const opened = fs.fstatSync(descriptor);
      if (
        !opened.isFile() ||
        opened.size !== stat.size ||
        opened.dev !== stat.dev ||
        opened.ino !== stat.ino
      )
        fail("learner file changed while being read");
      bytes = fs.readFileSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    if (bytes.length !== stat.size) fail("learner file changed while being read");
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail("backup total size limit exceeded");
    if (TEXT_FILE.test(relative)) {
      const content = bytes.toString("utf8");
      assertNoSecretText(content, relative);
      if (PERSONAL_EMAIL_PATTERN.test(content))
        fail("potential personal email in learner file; backup aborted: " + relative);
    }
    files.push({
      path: relative,
      bytes: bytes.length,
      sha256: sha256(bytes),
      data: bytes.toString("base64"),
    });
  };
  for (const moduleId of MODULES) visit("workspace/" + moduleId);
  for (const phase of ["P1", "P2"]) visit("workspace/.course-assessments/" + phase);
  visit(".course-load");
  files.sort((a, b) => a.path.localeCompare(b.path));
  excludedPaths.sort();
  return { files, totalBytes, excludedCount, excludedPaths };
}

export function exportLearnerWorkspace({ root = ROOT, target }) {
  const identity = courseIdentity(root);
  const destination = outsideRepository(root, target, false);
  const { files, totalBytes, excludedCount, excludedPaths } = collectLearnerFiles(root);
  const archive = {
    schema_version: 1,
    ...identity,
    files,
    total_bytes: totalBytes,
  };
  const compressed = gzipSync(Buffer.from(JSON.stringify(archive)), { level: 6 });
  if (compressed.length > MAX_ARCHIVE_BYTES) fail("backup archive is too large");
  const temporary = path.join(
    path.dirname(destination),
    "." + path.basename(destination) + "." + randomUUID() + ".partial",
  );
  try {
    fs.writeFileSync(temporary, compressed, { flag: "wx", mode: 0o600 });
    // A hard link makes publication create-only, even if another process races us.
    fs.linkSync(temporary, destination);
  } finally {
    if (lstatIfExists(temporary)) fs.unlinkSync(temporary);
  }
  return {
    status: "exported",
    path: destination,
    files: files.length,
    total_bytes: totalBytes,
    excluded: excludedCount,
    excluded_paths: excludedPaths,
    ...identity,
  };
}

function unpack(root, archivePath) {
  const source = outsideRepository(root, archivePath, true);
  const stat = fs.lstatSync(source);
  if (stat.size > MAX_ARCHIVE_BYTES) fail("backup archive exceeds allowed size");
  const bytes = gunzipSync(fs.readFileSync(source), {
    maxOutputLength: Math.ceil((MAX_TOTAL_BYTES * 4) / 3) + MAX_FILES * 500,
  });
  const archive = JSON.parse(bytes.toString("utf8"));
  const identity = courseIdentity(root);
  if (
    archive.schema_version !== 1 ||
    archive.source_sha !== identity.source_sha ||
    archive.revision !== identity.revision ||
    !Array.isArray(archive.files) ||
    archive.files.length > MAX_FILES
  )
    fail("backup source SHA, revision or schema mismatch (BLOCKED)");
  const files = [];
  const targets = new Set();
  let totalBytes = 0;
  for (const entry of archive.files) {
    const relative = safeRelative(entry?.path);
    if (excluded(relative) || targets.has(relative)) fail("unsafe or duplicate backup entry");
    targets.add(relative);
    if (
      typeof entry.data !== "string" ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.data)
    )
      fail("invalid encoded backup data");
    const data = Buffer.from(entry.data, "base64");
    if (
      data.toString("base64") !== entry.data ||
      data.length !== entry.bytes ||
      data.length > MAX_FILE_BYTES ||
      sha256(data) !== entry.sha256
    )
      fail("backup file digest or size mismatch: " + relative);
    totalBytes += data.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail("backup total size limit exceeded");
    if (TEXT_FILE.test(relative)) {
      const content = data.toString("utf8");
      assertNoSecretText(content, relative);
      if (PERSONAL_EMAIL_PATTERN.test(content))
        fail("potential personal email in archived learner file");
    }
    files.push({ relative, data });
  }
  if (totalBytes !== archive.total_bytes) fail("backup total bytes mismatch");
  return files;
}

export function restoreLearnerWorkspace({ root = ROOT, source }) {
  const files = unpack(root, source);
  // Check all targets before any writes. Existing files are never replaced.
  for (const { relative, data } of files) {
    const absolute = safePath(root, relative);
    const stat = lstatIfExists(absolute);
    if (stat && (!stat.isFile() || !fs.readFileSync(absolute).equals(data)))
      fail("restore conflict; existing learner file was not overwritten: " + relative);
  }
  let restored = 0;
  for (const { relative, data } of files) {
    const absolute = safePath(root, relative);
    if (lstatIfExists(absolute)) continue;
    fs.mkdirSync(path.dirname(absolute), { recursive: true, mode: 0o700 });
    safePath(root, relative);
    fs.writeFileSync(absolute, data, { flag: "wx", mode: 0o600 });
    restored += 1;
  }
  return {
    status: "restored",
    files_verified: files.length,
    newly_restored: restored,
    existing_files_overwritten: 0,
    git_required: false,
  };
}

function main() {
  const [command, flag, value] = process.argv.slice(2);
  if (process.argv.length !== 5)
    fail(
      "Usage: node scripts/training/learner-workspace-backup.mjs export --target /outside/backup.json.gz | restore --source /outside/backup.json.gz",
    );
  const result =
    command === "export" && flag === "--target"
      ? exportLearnerWorkspace({ target: value })
      : command === "restore" && flag === "--source"
        ? restoreLearnerWorkspace({ source: value })
        : fail("Unsupported backup command or argument");
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(
      "Learner backup BLOCKED: " + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  }
}
