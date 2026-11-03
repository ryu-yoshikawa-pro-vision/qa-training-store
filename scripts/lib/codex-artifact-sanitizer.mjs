import { Buffer } from "node:buffer";
import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  realpathSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { TextDecoder } from "node:util";

const TOKEN_PRIORITIES = Object.freeze([
  ["<REPO_ROOT>", 10],
  ["<ANDROID_SDK_ROOT>", 20],
  ["<JAVA_HOME>", 30],
  ["<PNPM_VIRTUAL_STORE>", 40],
  ["<MAESTRO_HOME>", 50],
  ["<TEMP_ROOT>", 60],
  ["<USER_HOME>", 70],
]);
const TEXT_EXTENSIONS = new Set([".md", ".json", ".jsonl", ".txt"]);
const ARTIFACT_PREFIXES = Object.freeze([
  ".codex/runs/",
  ".codex/artifacts/",
  ".codex/reports/",
  ".codex/logs/",
]);
const RESIDUAL_PATTERNS = Object.freeze([
  {
    type: "Windows file URI",
    regex: /(?<![A-Za-z0-9])file:\/\/\/[A-Z]:[\\/](?:[^\\/\s"<>?#]+[\\/])*[^\\/\s"<>?#]+/gi,
  },
  { type: "WSL user path", regex: /(?<![A-Za-z0-9])\/mnt\/[a-z]\/Users\/[^/\s"<>]+/gi },
  {
    type: "Windows user path",
    regex: /\b[A-Z]:[\\/](?:Users|Documents and Settings)[\\/][^\\/\s"<>]+/gi,
  },
  {
    type: "Windows absolute path",
    regex: /(?<![A-Za-z0-9])[A-Z]:[\\/](?:[^\\/\s"<>?#]+[\\/])*[^\\/\s"<>?#]+/gi,
  },
  {
    type: "Windows UNC path",
    regex: /(?<![A-Za-z0-9])\\\\[^\\/\s"<>?#]+(?:[\\/][^\\/\s"<>?#]+)+/g,
  },
  { type: "macOS user path", regex: /\/Users\/[^/\s"<>]+/g },
  { type: "Linux user path", regex: /\/home\/[^/\s"<>]+/g },
]);

const windowsPathPattern = /^(?:[A-Za-z]:[\\/]|\\\\)/;
const windowsFilePath = (value) => windowsPathPattern.test(value);
const textDecoder = new TextDecoder("utf-8", { fatal: true });

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
}

function runGit(args, cwd, encoding = null) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      timeout: 5000,
    });
  } catch {
    throw new Error("Git metadata could not be read safely.");
  }
}

function repositoryRoot(cwd, requestedRoot) {
  if (requestedRoot) {
    const candidate = path.resolve(cwd, requestedRoot);
    try {
      return path.resolve(candidate);
    } catch {
      throw new Error("Repository root could not be resolved.");
    }
  }
  const result = runGit(["rev-parse", "--show-toplevel"], cwd, "utf8").trim();
  if (!result) throw new Error("Repository root could not be resolved from Git.");
  return path.resolve(result);
}

function normalizeRegisteredPath(value, cwd) {
  if (typeof value !== "string" || !value.trim()) return null;
  let candidate = value.trim();
  if (/^file:\/\//i.test(candidate)) {
    candidate = candidate.replace(/^file:\/\//i, "");
    if (/^\/[A-Za-z]:\//.test(candidate)) candidate = candidate.slice(1);
    candidate = candidate.replace(/%20/gi, " ");
  }
  if (windowsFilePath(candidate)) {
    return process.platform === "win32" ? path.win32.resolve(candidate) : candidate;
  }
  return path.resolve(cwd, candidate);
}

function trimSeparators(value) {
  if (value === "/" || value === "\\") return value;
  if (/^[A-Za-z]:[\\/]$/.test(value)) return value;
  return value.replace(/[\\/]+$/, "");
}

function pathVariants(value, token, priority) {
  const base = trimSeparators(value);
  if (!base) return [];
  const isWindows = windowsFilePath(base);
  const native = isWindows ? base.replaceAll("/", "\\") : base.replaceAll("\\", "/");
  const slash = native.replaceAll("\\", "/");
  const escapedNative = native.replaceAll("\\", "\\\\");
  const fileUri = (isWindows ? "file:///" : "file://") + slash;
  const sources = [
    [native, token],
    [native + "\\", token + "/"],
    [slash, token],
    [slash + "/", token + "/"],
    [escapedNative, token],
    [escapedNative + "\\\\", token + "/"],
    [fileUri, token],
    [fileUri + "/", token + "/"],
  ];
  const seen = new Set();
  return sources.flatMap(([source, replacement]) => {
    const key = source + "\0" + replacement;
    if (!source || seen.has(key)) return [];
    seen.add(key);
    return [{ source, replacement, token, priority, caseInsensitive: isWindows }];
  });
}

function executablePath(name) {
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const entry of (process.env.PATH ?? "").split(path.delimiter)) {
    for (const extension of extensions) {
      const candidate = path.join(entry, name + extension);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function createContext(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const root = repositoryRoot(cwd, options.repositoryRoot);
  const replacements = new Map();
  const resolvedPaths = new Map(TOKEN_PRIORITIES.map(([token]) => [token, []]));
  const add = (rawValue, token) => {
    const value = normalizeRegisteredPath(rawValue, cwd);
    if (!value) return;
    const current = resolvedPaths.get(token);
    const comparisonValue = windowsFilePath(value) ? value.toLowerCase() : value;
    if (
      current.some(
        (item) => (windowsFilePath(item) ? item.toLowerCase() : item) === comparisonValue,
      )
    )
      return;
    current.push(value);
    const priority = TOKEN_PRIORITIES.find(([candidate]) => candidate === token)?.[1] ?? 100;
    for (const variant of pathVariants(value, token, priority)) {
      replacements.set(variant.source + "\0" + variant.token + "\0" + variant.replacement, variant);
    }
  };

  add(root, "<REPO_ROOT>");
  try {
    const canonicalRoot = realpathSync.native(root);
    const canonicalCwd = realpathSync.native(cwd);
    const normalizeIdentity = (value) =>
      process.platform === "win32" ? value.toLowerCase() : value;
    if (normalizeIdentity(canonicalCwd) === normalizeIdentity(canonicalRoot))
      add(cwd, "<REPO_ROOT>");
  } catch {
    // The Git root remains the registered repository path.
  }
  for (const alias of options.repositoryAliases ?? []) add(alias, "<REPO_ROOT>");
  add(process.env.USERPROFILE, "<USER_HOME>");
  add(process.env.HOME, "<USER_HOME>");
  add(process.env.ANDROID_SDK_ROOT, "<ANDROID_SDK_ROOT>");
  add(process.env.ANDROID_HOME, "<ANDROID_SDK_ROOT>");
  add(options.androidSdkRoot, "<ANDROID_SDK_ROOT>");
  add(process.env.JAVA_HOME, "<JAVA_HOME>");
  add(options.javaHome, "<JAVA_HOME>");
  add(process.env.npm_config_virtual_store_dir, "<PNPM_VIRTUAL_STORE>");
  add(options.virtualStoreDir, "<PNPM_VIRTUAL_STORE>");
  const projectVirtualStore = path.join(root, "node_modules", ".pnpm");
  if (existsSync(projectVirtualStore)) add(projectVirtualStore, "<PNPM_VIRTUAL_STORE>");
  add(process.env.MAESTRO_HOME, "<MAESTRO_HOME>");
  add(options.maestroHome, "<MAESTRO_HOME>");
  const maestro = executablePath("maestro");
  if (maestro) {
    const normalized = maestro.replaceAll("\\", "/");
    const marker = normalized.toLowerCase().lastIndexOf("/bin/");
    const suffix = marker >= 0 ? normalized.slice(marker + 5) : "";
    if (marker >= 0 && suffix && !suffix.includes("/"))
      add(normalized.slice(0, marker), "<MAESTRO_HOME>");
  }
  add(process.env.TEMP, "<TEMP_ROOT>");
  add(process.env.TMP, "<TEMP_ROOT>");
  add(process.env.TMPDIR, "<TEMP_ROOT>");
  add(os.tmpdir(), "<TEMP_ROOT>");

  return { repositoryRoot: root, replacements: [...replacements.values()] };
}

function orderedReplacements(context) {
  return [...context.replacements].sort(
    (left, right) =>
      right.source.length - left.source.length ||
      left.priority - right.priority ||
      left.token.localeCompare(right.token),
  );
}

function createStats() {
  return {
    files_scanned: 0,
    files_changed: 0,
    replacements_total: 0,
    replacements_by_token: Object.fromEntries(TOKEN_PRIORITIES.map(([token]) => [token, 0])),
    residual_findings: 0,
  };
}

function sanitizeText(text, context, stats = null) {
  let result = text;
  for (const replacement of orderedReplacements(context)) {
    const hasTrailingSeparator = /[\\/]+$/.test(replacement.source);
    const boundary = hasTrailingSeparator ? "" : "(?=$|[\\\\/\\s\"'<>\\x60),;:?#|\\]])";
    const pattern = new RegExp(
      escapeRegExp(replacement.source) + boundary,
      replacement.caseInsensitive ? "gi" : "g",
    );
    let matchCount = 0;
    result = result.replace(pattern, () => {
      matchCount += 1;
      return replacement.replacement;
    });
    if (stats && matchCount > 0) {
      stats.replacements_total += matchCount;
      stats.replacements_by_token[replacement.token] += matchCount;
    }
  }
  return result;
}

function splitLines(text) {
  return text.split(/\r\n|\n|\r/);
}

function maskResidualMatch(match, type) {
  switch (type) {
    case "Windows file URI": {
      const masked = match.replace(
        /^(file:\/\/\/[A-Z]:[\\/](?:Users|Documents%20and%20Settings)[\\/])[^\\/\s"<>?#]+/i,
        "$1<redacted>",
      );
      return masked === match ? "<local-path-redacted>" : masked;
    }
    case "WSL user path":
      return match.replace(/(\/mnt\/[a-z]\/Users\/)[^/\s"<>]+/i, "$1<redacted>");
    case "Windows user path":
      return match.replace(
        /([A-Z]:[\\/](?:Users|Documents and Settings)[\\/])[^\\/\s"<>]+/i,
        "$1<redacted>",
      );
    case "macOS user path":
      return match.replace(/(\/Users\/)[^/\s"<>]+/, "$1<redacted>");
    case "Linux user path":
      return match.replace(/(\/home\/)[^/\s"<>]+/, "$1<redacted>");
    default:
      return "<local-path-redacted>";
  }
}

function matchingResiduals(line) {
  const matches = [];
  for (const item of RESIDUAL_PATTERNS) {
    item.regex.lastIndex = 0;
    for (const match of line.matchAll(item.regex)) {
      matches.push({
        index: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length,
        value: match[0],
        type: item.type,
      });
    }
  }
  return matches;
}

function hasResidualPath(line) {
  return matchingResiduals(line).length > 0;
}

function maskResidualLine(line) {
  let masked = line;
  for (const item of RESIDUAL_PATTERNS) {
    item.regex.lastIndex = 0;
    const matches = [...masked.matchAll(item.regex)];
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const match = matches[index];
      const start = match.index ?? 0;
      masked =
        masked.slice(0, start) +
        maskResidualMatch(match[0], item.type) +
        masked.slice(start + match[0].length);
    }
  }
  return masked;
}

function boundedFindingContext(line, context, maximumLength = 160) {
  if (!line.trim()) return "<empty-line>";
  const sanitized = sanitizeText(line, context);
  if (hasResidualPath(sanitized)) return "<local-path-redacted>";
  let masked = maskResidualLine(sanitized).replace(/\s+/g, " ").trim();
  if (!masked) return "<empty-line>";
  if (masked.length > maximumLength) {
    return maximumLength <= 3
      ? masked.slice(0, maximumLength)
      : masked.slice(0, maximumLength - 3) + "...";
  }
  return masked;
}

function relativeArtifactPath(filePath, repositoryRoot) {
  if (!filePath) return "<unknown-file>";
  if (windowsFilePath(filePath) !== windowsFilePath(repositoryRoot))
    return "<outside-repository>/" + path.basename(filePath);
  const implementation = windowsFilePath(filePath) ? path.win32 : path;
  const relative = implementation.relative(repositoryRoot, filePath);
  if (relative === "") return ".";
  if (
    implementation.isAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith(".." + implementation.sep)
  ) {
    return "<outside-repository>/" + implementation.basename(filePath);
  }
  return relative.replaceAll("\\", "/");
}

function addKnownPathFindings(filePath, currentText, sanitizedText, context, findings) {
  if (currentText === sanitizedText) return;
  const currentLines = splitLines(currentText);
  const sanitizedLines = splitLines(sanitizedText);
  const count = Math.max(currentLines.length, sanitizedLines.length);
  for (let index = 0; index < count; index += 1) {
    const currentLine = (currentLines[index] ?? "").replace(/\r$/, "");
    const sanitizedLine = (sanitizedLines[index] ?? "").replace(/\r$/, "");
    if (currentLine !== sanitizedLine) {
      findings.push({
        file_path: filePath,
        line_number: index + 1,
        pattern_type: "known registered path",
        content: "<local-path-redacted>",
        context: boundedFindingContext(sanitizedLine, context),
      });
    }
  }
}

function residualFindings(text, filePath, context) {
  const findings = [];
  const lines = splitLines(text);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].replace(/\r$/, "");
    const occupied = [];
    for (const match of matchingResiduals(line)) {
      if (occupied.some((item) => match.index < item.end && item.index < match.end)) continue;
      occupied.push({ index: match.index, end: match.end });
      findings.push({
        file_path: filePath,
        line_number: lineIndex + 1,
        pattern_type: match.type,
        content: "<local-path-redacted>",
        context: boundedFindingContext(line, context),
      });
    }
  }
  return findings;
}

function hasSymlinkComponent(fullPath) {
  const implementation = windowsFilePath(fullPath) ? path.win32 : path;
  const parsed = implementation.parse(fullPath);
  let cursor = parsed.root;
  for (const segment of fullPath
    .slice(parsed.root.length)
    .split(/[\\/]+/)
    .filter(Boolean)) {
    cursor = implementation.join(cursor, segment);
    try {
      if (lstatSync(cursor).isSymbolicLink()) return true;
    } catch {
      return false;
    }
  }
  return false;
}

function collectTextFiles(paths, cwd, changedOnly, root) {
  const files = new Map();
  const addFile = (fullPath) => {
    if (!TEXT_EXTENSIONS.has(path.extname(fullPath).toLowerCase())) return;
    if (hasSymlinkComponent(fullPath))
      throw new Error("Artifact symlinks cannot be followed safely.");
    const key = process.platform === "win32" ? fullPath.toLowerCase() : fullPath;
    files.set(key, fullPath);
  };
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
          throw new Error("Artifact symlinks cannot be followed safely.");
        continue;
      }
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile()) addFile(fullPath);
    }
  };

  for (const rawPath of paths) {
    if (!rawPath?.trim()) continue;
    const fullPath =
      path.isAbsolute(rawPath) || windowsFilePath(rawPath)
        ? path.resolve(rawPath)
        : path.resolve(cwd, rawPath);
    if (!existsSync(fullPath)) continue;
    const item = lstatSync(fullPath);
    if (item.isSymbolicLink()) throw new Error("Artifact symlinks cannot be followed safely.");
    if (item.isDirectory()) walk(fullPath);
    else if (item.isFile()) addFile(fullPath);
  }
  let selected = [...files.values()];
  if (changedOnly) {
    const changed = new Set();
    for (const args of [
      ["diff", "--name-only", "-z", "HEAD"],
      ["ls-files", "--others", "--exclude-standard", "-z"],
      ["diff", "--name-only", "-z", "--cached"],
    ]) {
      const output = runGit(args, root).toString("utf8");
      for (const relative of output.split("\0").filter(Boolean)) {
        const fullPath = path.resolve(root, relative);
        changed.add(process.platform === "win32" ? fullPath.toLowerCase() : fullPath);
      }
    }
    selected = selected.filter((filePath) =>
      changed.has(process.platform === "win32" ? filePath.toLowerCase() : filePath),
    );
  }
  return selected.sort();
}

function readArtifactText(bytes) {
  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const text = textDecoder.decode(hasBom ? bytes.subarray(3) : bytes);
  return { text, hasBom };
}

function atomicWrite(filePath, text) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(directory, ".codex-artifact-sanitizer-" + randomUUID());
  const backupPath = path.join(directory, ".codex-artifact-sanitizer-backup-" + randomUUID());
  const displacedPath = path.join(directory, ".codex-artifact-sanitizer-original-" + randomUUID());
  let descriptor;
  let originalMustRemainInRecoveryFile = false;
  try {
    descriptor = openSync(temporaryPath, "wx", statSync(filePath).mode);
    writeFileSync(descriptor, Buffer.from(text, "utf8"));
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    try {
      renameSync(temporaryPath, filePath);
    } catch {
      let originalMoved = false;
      try {
        copyFileSync(filePath, backupPath, constants.COPYFILE_EXCL);
        renameSync(filePath, displacedPath);
        originalMoved = true;
        renameSync(temporaryPath, filePath);
        originalMoved = false;
      } catch {
        if (originalMoved && !existsSync(filePath)) {
          try {
            renameSync(displacedPath, filePath);
            originalMoved = false;
          } catch {
            try {
              copyFileSync(backupPath, filePath, constants.COPYFILE_EXCL);
              originalMoved = false;
            } catch {
              originalMustRemainInRecoveryFile = true;
            }
          }
        }
        throw new Error(
          originalMustRemainInRecoveryFile
            ? "Atomic artifact replacement failed; an original-content recovery copy was retained."
            : "Atomic artifact replacement failed; the original content was preserved.",
        );
      }
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    if (!originalMustRemainInRecoveryFile) {
      if (existsSync(displacedPath)) unlinkSync(displacedPath);
      if (existsSync(backupPath)) unlinkSync(backupPath);
    }
  }
}

function normalizeGitPath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function isArtifactTextPath(value) {
  const normalized = normalizeGitPath(value);
  return (
    ARTIFACT_PREFIXES.some((prefix) => normalized.startsWith(prefix)) &&
    TEXT_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())
  );
}

function nulSeparated(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

function parseIndexEntries(buffer) {
  const entries = new Map();
  for (const record of nulSeparated(buffer)) {
    const separator = record.indexOf("\t");
    if (separator < 0) throw new Error("Git index entries could not be parsed safely.");
    const metadata = /^(\d{6}) ([0-9a-f]{40,64}) ([0-3])$/i.exec(record.slice(0, separator));
    if (!metadata) throw new Error("Git index entries could not be parsed safely.");
    const filePath = normalizeGitPath(record.slice(separator + 1));
    const current = entries.get(filePath) ?? [];
    current.push({ mode: metadata[1], objectId: metadata[2], stage: Number(metadata[3]) });
    entries.set(filePath, current);
  }
  return entries;
}

function assertBlobEntry(entry) {
  if (!entry) return { error: "missing Git object" };
  if (entry.mode !== "100644" && entry.mode !== "100755")
    return { error: "unsupported Git object mode" };
  return null;
}

function inspectBlob(bytes, filePath, context, stats, findings) {
  stats.files_scanned += 1;
  let read;
  try {
    read = readArtifactText(bytes);
  } catch {
    findings.push({
      file_path: filePath,
      line_number: 1,
      pattern_type: "invalid UTF-8",
      content: "<invalid-utf8-redacted>",
    });
    return;
  }
  if (read.hasBom) {
    findings.push({
      file_path: filePath,
      line_number: 1,
      pattern_type: "UTF-8 BOM",
      content: "<BOM><redacted>",
    });
  }
  const expected = sanitizeText(read.text, context, stats);
  addKnownPathFindings(filePath, read.text, expected, context, findings);
  findings.push(...residualFindings(read.text, filePath, context));
}

function gitArtifactPaths(root, args) {
  const output = runGit(args, root);
  return nulSeparated(output).map(normalizeGitPath).filter(isArtifactTextPath);
}

function inspectStaged(root, context, stats, findings) {
  const paths = gitArtifactPaths(root, [
    "diff",
    "--cached",
    "--name-only",
    "-z",
    "--diff-filter=ACMRTUXB",
    "--no-renames",
    "--",
    ".codex/runs",
    ".codex/artifacts",
    ".codex/reports",
    ".codex/logs",
  ]);
  const entries = parseIndexEntries(runGit(["ls-files", "--stage", "-z"], root));
  for (const filePath of paths) {
    const records = entries.get(filePath) ?? [];
    if (records.some((entry) => entry.stage !== 0)) {
      findings.push({
        file_path: path.resolve(root, filePath),
        line_number: 1,
        pattern_type: "unmerged Git index entry",
        content: "<index-entry-redacted>",
      });
      continue;
    }
    const entry = records.find((candidate) => candidate.stage === 0);
    const error = assertBlobEntry(entry);
    if (error) {
      findings.push({
        file_path: path.resolve(root, filePath),
        line_number: 1,
        pattern_type: error.error,
        content: "<git-object-redacted>",
      });
      continue;
    }
    inspectBlob(
      runGit(["cat-file", "blob", entry.objectId], root),
      path.resolve(root, filePath),
      context,
      stats,
      findings,
    );
  }
}

function parseTreeEntry(record) {
  const separator = record.indexOf("\t");
  if (separator < 0) throw new Error("Git tree entries could not be parsed safely.");
  const metadata = /^(\d{6}) (blob|commit) ([0-9a-f]{40,64})$/i.exec(record.slice(0, separator));
  if (!metadata) throw new Error("Git tree entries could not be parsed safely.");
  return {
    mode: metadata[1],
    type: metadata[2],
    objectId: metadata[3],
    filePath: normalizeGitPath(record.slice(separator + 1)),
  };
}

function inspectCommitted(root, baseRef, context, stats, findings) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(baseRef))
    throw new Error("A safe base ref is required.");
  const paths = gitArtifactPaths(root, [
    "diff",
    "--name-only",
    "-z",
    "--diff-filter=ACMRTUXB",
    "--no-renames",
    baseRef + "...HEAD",
    "--",
    ".codex/runs",
    ".codex/artifacts",
    ".codex/reports",
    ".codex/logs",
  ]);
  for (const filePath of paths) {
    const records = nulSeparated(runGit(["ls-tree", "-z", "HEAD", "--", filePath], root));
    if (records.length === 0) continue;
    if (records.length !== 1) throw new Error("Git tree path was ambiguous.");
    const entry = parseTreeEntry(records[0]);
    const error =
      entry.filePath !== filePath ? "ambiguous Git tree path" : assertBlobEntry(entry)?.error;
    if (error || entry.type !== "blob") {
      findings.push({
        file_path: path.resolve(root, filePath),
        line_number: 1,
        pattern_type: error ?? "unsupported Git tree object",
        content: "<git-object-redacted>",
      });
      continue;
    }
    inspectBlob(
      runGit(["cat-file", "blob", entry.objectId], root),
      path.resolve(root, filePath),
      context,
      stats,
      findings,
    );
  }
}

function collectFilesystem(paths, cwd, root, context, options, stats, findings) {
  const files = collectTextFiles(paths, cwd, options.changedOnly, root);
  for (const filePath of files) {
    stats.files_scanned += 1;
    const bytes = readFileSync(filePath);
    let read;
    try {
      read = readArtifactText(bytes);
    } catch {
      findings.push({
        file_path: filePath,
        line_number: 1,
        pattern_type: "invalid UTF-8",
        content: "<invalid-utf8-redacted>",
      });
      continue;
    }
    let scanText = read.text;
    if (options.write) {
      const sanitized = sanitizeText(read.text, context, stats);
      if (read.hasBom || sanitized !== read.text) {
        atomicWrite(filePath, sanitized);
        stats.files_changed += 1;
      }
      scanText = sanitized;
    }
    if (!options.check) continue;
    if (read.hasBom && !options.write) {
      findings.push({
        file_path: filePath,
        line_number: 1,
        pattern_type: "UTF-8 BOM",
        content: "<BOM><redacted>",
      });
    }
    const expected = sanitizeText(scanText, context, options.write ? null : stats);
    addKnownPathFindings(filePath, scanText, expected, context, findings);
    findings.push(...residualFindings(scanText, filePath, context));
  }
}

function renderStats(stats, mode) {
  const lines = [
    "Codex artifact sanitization:",
    "  mode: " + mode.join(", "),
    "  files_scanned: " + stats.files_scanned,
    "  files_changed: " + stats.files_changed,
    "  replacements_total: " + stats.replacements_total,
    "  replacements_by_token:",
  ];
  for (const [token] of TOKEN_PRIORITIES)
    lines.push("    " + token + ": " + stats.replacements_by_token[token]);
  lines.push("  residual_findings: " + stats.residual_findings);
  return lines;
}

function parseArguments(argv) {
  const options = {
    paths: [],
    repositoryAliases: [],
    write: false,
    check: false,
    changedOnly: false,
    staged: false,
    committed: false,
  };
  const namedValues = new Map([
    ["--path", options.paths],
    ["--repository-alias", options.repositoryAliases],
  ]);
  const singleValues = new Set([
    "--repository-root",
    "--virtual-store-dir",
    "--android-sdk-root",
    "--java-home",
    "--maestro-home",
    "--base-ref",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--write") options.write = true;
    else if (argument === "--check") options.check = true;
    else if (argument === "--changed-only") options.changedOnly = true;
    else if (argument === "--staged") options.staged = true;
    else if (argument === "--committed") options.committed = true;
    else if (namedValues.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(argument + " requires a value.");
      namedValues.get(argument).push(value);
      index += 1;
    } else if (singleValues.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(argument + " requires a value.");
      options[
        {
          "--repository-root": "repositoryRoot",
          "--virtual-store-dir": "virtualStoreDir",
          "--android-sdk-root": "androidSdkRoot",
          "--java-home": "javaHome",
          "--maestro-home": "maestroHome",
          "--base-ref": "baseRef",
        }[argument]
      ] = value;
      index += 1;
    } else {
      throw new Error("Unsupported sanitizer option.");
    }
  }
  if (!options.write && !options.check)
    throw new Error("Specify at least one of --write or --check.");
  if (options.write && (options.staged || options.committed))
    throw new Error("Git blob checks are read-only.");
  if (options.staged && options.committed) throw new Error("Choose one Git blob source.");
  if (options.staged && !options.check) throw new Error("--staged requires --check.");
  if (options.committed && (!options.check || !options.baseRef))
    throw new Error("--committed requires --check and --base-ref.");
  if (options.changedOnly && (options.staged || options.committed))
    throw new Error("--changed-only cannot be combined with Git blob checks.");
  if (!options.staged && !options.committed && options.paths.length === 0)
    throw new Error("Specify at least one --path.");
  return options;
}

export function runSanitizer(argv, cwd = process.cwd()) {
  const options = parseArguments(argv);
  const root = repositoryRoot(path.resolve(cwd), options.repositoryRoot);
  const context = createContext({ ...options, cwd, repositoryRoot: root });
  const stats = createStats();
  const findings = [];
  if (options.staged) inspectStaged(root, context, stats, findings);
  else if (options.committed) inspectCommitted(root, options.baseRef, context, stats, findings);
  else collectFilesystem(options.paths, path.resolve(cwd), root, context, options, stats, findings);
  stats.residual_findings = findings.length;
  const mode = [];
  if (options.write) mode.push("Write");
  if (options.check) mode.push("Check");
  if (options.staged) mode.push("Staged");
  if (options.committed) mode.push("Committed");
  const output = renderStats(stats, mode);
  for (const finding of findings) {
    const displayPath = relativeArtifactPath(finding.file_path, root);
    const contextText = finding.context ?? finding.content ?? "<redacted>";
    output.push(
      displayPath + ":" + finding.line_number,
      "pattern: " + finding.pattern_type,
      "context: " + boundedFindingContext(contextText, context),
    );
  }
  return {
    exitCode: findings.length > 0 ? 1 : 0,
    output: output.join("\n") + "\n",
    stats,
    findings,
  };
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  try {
    const result = runSanitizer(argv, cwd);
    process.stdout.write(result.output);
    return result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sanitization failed safely.";
    process.stderr.write("Codex artifact sanitization failed safely: " + message + "\n");
    return 1;
  }
}
