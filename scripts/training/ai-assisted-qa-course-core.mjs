import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COURSE_MANIFEST_PATH = "training/course-sync/manifest.json";
export const DISTRIBUTION_MANIFEST_PATH = ".course/distribution-manifest.json";
const MODULE_IDS = Array.from({ length: 11 }, (_, index) => `M${String(index).padStart(2, "0")}`);
const MODULE_ID_PATTERN = /^M(?:0[0-9]|10)$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const FORBIDDEN_PATH =
  /(?:^|\/)(?:\.git|\.codex|node_modules|output|evals|secrets?|private|answer-keys?|model-answers?)(?:\/|$)|(?:^|\/)\.env(?:\.|$)/i;

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlobSha(value) {
  return createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${value.length}\0`), value]))
    .digest("hex");
}

function normalizeRelativePath(value, description = "path") {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\"))
    fail(`${description} must be a nonempty POSIX relative path`);
  if (
    value.startsWith("/") ||
    /^[a-zA-Z]:/.test(value) ||
    value.split("/").some((part) => part === ".." || part === "." || part === "")
  )
    fail(`${description} escapes its root: ${value}`);
  if (FORBIDDEN_PATH.test(value)) fail(`${description} is prohibited: ${value}`);
  return value;
}

function assertNoSymlinkPath(root, relativePath, includeLeaf = true) {
  const normalized = normalizeRelativePath(relativePath);
  const parts = normalized.split("/");
  const limit = includeLeaf ? parts.length : parts.length - 1;
  let current = path.resolve(root);
  for (const part of parts.slice(0, limit)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) fail(`symlink path is prohibited: ${relativePath}`);
  }
  const absolute = path.resolve(root, ...parts);
  const rel = path.relative(path.resolve(root), absolute);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel))
    fail(`path escapes its root: ${relativePath}`);
  return absolute;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(
      `${label} cannot be read as JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function validateCourseManifest(manifest) {
  if (manifest?.schema_version !== 1) fail("Unsupported course manifest schema_version");
  if (manifest.state_contract_revision !== "ai-assisted-qa-course-v1")
    fail("The state contract revision must match the implemented read-only checker");
  if (
    !Array.isArray(manifest.local_files) ||
    !Array.isArray(manifest.external_skill_files) ||
    !Array.isArray(manifest.load_files)
  )
    fail("Course manifest must contain local_files, external_skill_files, and load_files");
  if (
    manifest.external_skill_source?.repository !== "ryu-yoshikawa-pro-vision/qa-workflow-skills" ||
    manifest.external_skill_source?.commit !== "7cc6cba7772de549841a39d71694cbafbc783324"
  )
    fail("The external Skill source must remain pinned to the Plan revision");
  const destinations = new Set();
  for (const entry of [...manifest.local_files, ...manifest.external_skill_files]) {
    const source = normalizeRelativePath(entry.source_path, "source_path");
    const target = normalizeRelativePath(entry.target_path, "target_path");
    if (destinations.has(target)) fail(`duplicate distribution target: ${target}`);
    destinations.add(target);
    if (
      entry.module_id !== null &&
      entry.module_id !== undefined &&
      !MODULE_ID_PATTERN.test(entry.module_id)
    )
      fail(`invalid module_id in distribution manifest: ${entry.module_id}`);
    if (entry.source_path.startsWith("skills/") && /(?:^|\/)evals(?:\/|$)/.test(source))
      fail(`Skill eval files must never be distributed: ${source}`);
    if (
      manifest.external_skill_files.includes(entry) &&
      !/^[a-f0-9]{40}$/.test(entry.blob_sha ?? "")
    )
      fail(`external Skill entry has no Git blob SHA: ${source}`);
  }
  const skillModules = new Set(manifest.external_skill_files.map((entry) => entry.skill));
  const requiredSkills = [
    "qa-workflow",
    "spec-analysis",
    "test-analysis",
    "test-condition-design",
    "test-case-design",
    "adversarial-review",
    "e2e-test-implementation",
    "e2e-test-execution",
    "e2e-test-inspection",
    "e2e-test-result-analysis",
    "e2e-test-reporting",
  ];
  if (requiredSkills.some((skill) => !skillModules.has(skill)))
    fail("A Plan-required external Skill package is missing");
  const loadedModuleIds = new Set(manifest.load_files.map((entry) => entry.module_id));
  if (MODULE_IDS.some((moduleId) => !loadedModuleIds.has(moduleId)))
    fail("Each of M00-M10 must have explicit load entries");
  for (const entry of manifest.load_files) {
    if (!MODULE_ID_PATTERN.test(entry.module_id))
      fail(`invalid load module_id: ${entry.module_id}`);
    normalizeRelativePath(entry.source_path, "load source_path");
    normalizeRelativePath(entry.target_path, "load target_path");
  }
  return {
    modules: MODULE_IDS.length,
    externalSkillFiles: manifest.external_skill_files.length,
    loadFiles: manifest.load_files.length,
  };
}

function git(root, args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: options.encoding ?? "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function verifySourceCheckout(root, sourceSha) {
  if (!SHA_PATTERN.test(sourceSha)) fail("--source-sha must be a full 40-character commit SHA");
  const head = git(root, ["rev-parse", "HEAD"]);
  if (head !== sourceSha) fail(`source SHA does not equal checked-out HEAD (${head})`);
  const status = git(root, ["status", "--porcelain", "--untracked-files=all"]);
  if (status)
    fail("course:sync requires a clean source worktree; no working-tree changes were copied");
  git(root, ["cat-file", "-e", `${sourceSha}^{commit}`]);
}

function readCommittedFile(root, sourceSha, sourcePath) {
  normalizeRelativePath(sourcePath, "source_path");
  const workingPath = assertNoSymlinkPath(root, sourcePath);
  if (!fs.existsSync(workingPath) || !fs.statSync(workingPath).isFile())
    fail(`allowlisted source file is missing: ${sourcePath}`);
  const committed = execFileSync("git", ["show", `${sourceSha}:${sourcePath}`], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const working = fs.readFileSync(workingPath);
  if (!working.equals(committed)) fail(`worktree differs from pinned source SHA: ${sourcePath}`);
  return committed;
}

function bindStateSourceSha(bytes, sourcePath, sourceSha) {
  if (
    !/training\/ai-assisted-qa-course\/states\/M(?:0[0-9]|10)\/(?:start|end)\.json$/.test(
      sourcePath,
    )
  )
    return bytes;
  const state = JSON.parse(bytes.toString("utf8"));
  state.source_sha = sourceSha;
  return Buffer.from(`${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function expandBuildOutput(root, manifest) {
  const config = manifest.generated?.shop_build;
  if (!config) fail("manifest has no generated Scenario Shop build contract");
  const targetPrefix = config.target.replace(/\/?\*\*\/?$/, "").replace(/\/$/, "");
  const sourceRoot = assertNoSymlinkPath(root, "dist", false);
  const files = [];
  const walk = (directory, relativeDirectory = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink())
        fail(`generated web build contains a symlink: dist/${relativePath}`);
      if (entry.isDirectory()) walk(absolutePath, relativePath);
      else if (entry.isFile()) {
        const targetPath = `${targetPrefix}/${relativePath}`;
        normalizeRelativePath(targetPath, "generated target_path");
        files.push({
          source_path: `dist/${relativePath}`,
          target_path: targetPath,
          bytes: fs.readFileSync(absolutePath),
          origin: "generated-shop",
        });
      } else fail(`unsupported generated build entry: dist/${relativePath}`);
    }
  };
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory())
    fail("Shop build is missing; course:sync must build the pinned source before staging");
  if (!fs.existsSync(path.join(sourceRoot, "index.html")))
    fail("Shop build does not contain dist/index.html");
  walk(sourceRoot);
  return files;
}

function atomicWriteNewFile(root, relativePath, bytes) {
  const absolute = assertNoSymlinkPath(root, relativePath, false);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  assertNoSymlinkPath(root, relativePath, false);
  const temporary = `${absolute}.course-tmp-${randomUUID()}`;
  try {
    fs.writeFileSync(temporary, bytes, { flag: "wx" });
    fs.copyFileSync(temporary, absolute, fs.constants.COPYFILE_EXCL);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

async function externalSkillBytes(entry, commit, fetchImpl) {
  const url = `https://raw.githubusercontent.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/${commit}/${entry.source_path}`;
  const response = await fetchImpl(url);
  if (!response.ok)
    fail(`fixed-revision Skill download failed (${response.status}): ${entry.source_path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== entry.size || gitBlobSha(bytes) !== entry.blob_sha)
    fail(`fixed-revision Skill content does not match its manifest blob: ${entry.source_path}`);
  return bytes;
}

function preflightWrites(targetRoot, files) {
  const conflicts = [];
  const writes = [];
  for (const file of files) {
    const absolute = assertNoSymlinkPath(targetRoot, file.target_path, false);
    if (!fs.existsSync(absolute)) {
      writes.push(file);
      continue;
    }
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      conflicts.push(file.target_path);
      continue;
    }
    const existing = fs.readFileSync(absolute);
    if (existing.equals(file.bytes)) continue;
    conflicts.push(file.target_path);
  }
  if (conflicts.length)
    fail(
      `existing destination content differs; no files were overwritten: ${conflicts.join(", ")}`,
    );
  return writes;
}

export async function syncCourse({
  root,
  target,
  sourceSha,
  fetchImpl = fetch,
  buildShop = true,
  shopBuildRoot,
  allowUncommittedFixture = false,
}) {
  const sourceRoot = path.resolve(root);
  const manifest = readJson(path.resolve(sourceRoot, COURSE_MANIFEST_PATH), "course allowlist");
  validateCourseManifest(manifest);
  if (!allowUncommittedFixture) verifySourceCheckout(sourceRoot, sourceSha);
  else if (!SHA_PATTERN.test(sourceSha)) fail("fixture source SHA must still be a full commit SHA");
  if (!manifest.source_sha.startsWith("${"))
    fail("manifest source_sha must remain a runtime-bound placeholder");
  const targetRoot = path.resolve(target);
  if (targetRoot === sourceRoot) fail("sync target must not be the source repository");
  if (
    !fs.existsSync(targetRoot) ||
    !fs.lstatSync(targetRoot).isDirectory() ||
    fs.lstatSync(targetRoot).isSymbolicLink()
  )
    fail("sync target must be an existing, non-symlink directory");
  if (buildShop)
    execFileSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["run", "build:web"], {
      cwd: sourceRoot,
      stdio: "inherit",
    });

  const files = [];
  for (const entry of manifest.local_files) {
    const raw = allowUncommittedFixture
      ? fs.readFileSync(assertNoSymlinkPath(sourceRoot, entry.source_path))
      : readCommittedFile(sourceRoot, sourceSha, entry.source_path);
    const bytes = bindStateSourceSha(raw, entry.source_path, sourceSha);
    files.push({
      source_path: entry.source_path,
      target_path: entry.target_path,
      bytes,
      origin: "local",
    });
  }
  for (const entry of manifest.external_skill_files) {
    files.push({
      source_path: entry.source_path,
      target_path: entry.target_path,
      bytes: await externalSkillBytes(entry, manifest.external_skill_source.commit, fetchImpl),
      origin: "external-skill",
      blob_sha: entry.blob_sha,
      module_id: entry.module_ids,
    });
  }
  const buildRoot = shopBuildRoot ? path.resolve(shopBuildRoot) : sourceRoot;
  if (buildShop || fs.existsSync(path.join(buildRoot, "dist")))
    files.push(...expandBuildOutput(buildRoot, manifest));
  else if (manifest.generated?.shop_build?.required && !allowUncommittedFixture)
    fail("Shop build is required by the distribution contract");

  const filesForDistribution = files.map((file) => ({
    source_path: file.source_path,
    target_path: file.target_path,
    sha256: sha256(file.bytes),
    bytes: file.bytes.length,
    origin: file.origin,
    ...(file.blob_sha ? { blob_sha: file.blob_sha } : {}),
  }));
  const distribution = {
    schema_version: 1,
    source_sha: sourceSha,
    state_contract_revision: manifest.state_contract_revision,
    external_skill_source: { ...manifest.external_skill_source },
    created_by_sync: "course:sync",
    files: filesForDistribution,
    load_files: manifest.load_files,
    confidentiality: {
      contains_model_answers: false,
      contains_private_assessment_tests: false,
      contains_secrets: false,
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(distribution, null, 2)}\n`, "utf8");
  files.push({
    source_path: COURSE_MANIFEST_PATH,
    target_path: DISTRIBUTION_MANIFEST_PATH,
    bytes: manifestBytes,
    origin: "distribution-manifest",
  });
  const writes = preflightWrites(targetRoot, files);
  const copied = [];
  try {
    for (const file of writes) {
      atomicWriteNewFile(targetRoot, file.target_path, file.bytes);
      copied.push(file.target_path);
    }
  } catch (error) {
    throw new Error(
      `sync stopped after ${copied.length} file(s); existing files were not overwritten. copied=${copied.join(",")}; remaining files can be safely retried. cause=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return {
    sourceSha,
    target: targetRoot,
    copied,
    unchanged: files.length - copied.length,
    fileCount: files.length,
  };
}

function resolveWithin(root, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return assertNoSymlinkPath(root, normalized);
}

function readDistribution(root) {
  const absoluteRoot = path.resolve(root);
  if (
    !fs.existsSync(absoluteRoot) ||
    !fs.lstatSync(absoluteRoot).isDirectory() ||
    fs.lstatSync(absoluteRoot).isSymbolicLink()
  )
    fail("course root must be an existing, non-symlink directory");
  const manifestPath = resolveWithin(absoluteRoot, DISTRIBUTION_MANIFEST_PATH);
  if (!fs.existsSync(manifestPath))
    fail("course has not been synchronized; distribution manifest is missing");
  const distribution = readJson(manifestPath, "course distribution manifest");
  if (distribution.schema_version !== 1 || !SHA_PATTERN.test(distribution.source_sha))
    fail("course distribution manifest has an invalid source SHA");
  if (
    typeof distribution.state_contract_revision !== "string" ||
    !distribution.state_contract_revision
  )
    fail("course distribution manifest has no state contract revision");
  if (!Array.isArray(distribution.files) || !Array.isArray(distribution.load_files))
    fail("course distribution manifest is incomplete");
  return distribution;
}

function verifiedCourseSource(root, distribution, sourcePath) {
  const entry = distribution.files.find((file) => file.target_path === sourcePath);
  if (!entry) fail(`file is not included in the pinned course distribution: ${sourcePath}`);
  const absolute = resolveWithin(root, sourcePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile())
    fail(`distributed input is missing: ${sourcePath}`);
  const bytes = fs.readFileSync(absolute);
  if (sha256(bytes) !== entry.sha256) fail(`distributed input changed after sync: ${sourcePath}`);
  return bytes;
}

function detectPreviousInput(root, moduleId, state, distribution) {
  const input = state.inputs?.find((item) => item.from_module && item.optional);
  if (!input)
    return {
      source: "module-public-sample",
      artifact_id: state.inputs?.[0]?.artifact_id ?? "course-environment",
    };
  const priorModule = input.from_module;
  let previousPaths = state.expected?.previous_artifact_paths;
  if (!Array.isArray(previousPaths)) {
    const previousStatePath = resolveWithin(root, `course/states/${priorModule}/end.json`);
    if (fs.existsSync(previousStatePath)) {
      const previousState = readJson(previousStatePath, `${priorModule} end state`);
      previousPaths = previousState.expected?.required_paths;
    }
  }
  const previousEnd =
    state.expected?.previous_artifact_path ??
    previousPaths?.[0] ??
    `workspace/${priorModule}/submission.md`;
  let candidates;
  try {
    candidates = (
      Array.isArray(previousPaths) && previousPaths.length ? previousPaths : [previousEnd]
    ).map((item) => resolveWithin(root, item));
  } catch (error) {
    return {
      source: "invalid-previous-artifact-reference",
      artifact_id: input.artifact_id,
      reasons: [error instanceof Error ? error.message : String(error)],
    };
  }
  const isLearnerArtifact = (candidate) => {
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return false;
    const current = fs.readFileSync(candidate);
    if (!current.length) return false;
    const targetPath = path.relative(root, candidate).split(path.sep).join("/");
    const template = distribution?.load_files.find(
      (entry) => entry.kind === "submission-template" && entry.target_path === targetPath,
    );
    if (template) {
      const templateBytes = verifiedCourseSource(root, distribution, template.source_path);
      if (current.equals(templateBytes)) return false;
    }
    return true;
  };
  if (candidates.length > 0 && candidates.every(isLearnerArtifact))
    return {
      source: "learner-previous-artifact",
      artifact_id: input.artifact_id,
      paths: Array.isArray(previousPaths) ? previousPaths : [previousEnd],
    };
  const fallback = input.public_fallback;
  const mapped = fallback?.startsWith("inputs/") ? `course/${fallback}` : fallback;
  let publicPath = null;
  try {
    publicPath = mapped ? resolveWithin(root, mapped) : null;
  } catch (error) {
    return {
      source: "invalid-previous-artifact-reference",
      artifact_id: input.artifact_id,
      reasons: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (publicPath && fs.existsSync(publicPath))
    return { source: "module-public-sample", artifact_id: input.artifact_id, path: mapped };
  return { source: "missing", artifact_id: input.artifact_id, path: mapped ?? null };
}

export function loadModule({ root, moduleId, now = new Date() }) {
  if (!MODULE_ID_PATTERN.test(moduleId))
    fail("course:load accepts exactly one module ID from M00 through M10");
  const targetRoot = path.resolve(root);
  const distribution = readDistribution(targetRoot);
  const files = distribution.load_files.filter((entry) => entry.module_id === moduleId);
  if (!files.length) fail(`distribution has no load entries for ${moduleId}`);
  const inputs = files.map((entry) => {
    const bytes = verifiedCourseSource(targetRoot, distribution, entry.source_path);
    return { source_path: entry.source_path, target_path: entry.target_path, bytes };
  });
  const receiptTime = now.toISOString();
  const receiptPath = `.course-load/${moduleId}-${receiptTime.replace(/[:.]/g, "-")}.json`;
  const receiptDestination = assertNoSymlinkPath(targetRoot, receiptPath, false);
  if (fs.existsSync(receiptDestination)) fail(`load receipt already exists: ${receiptPath}`);
  const conflicts = [];
  for (const file of inputs) {
    const destination = assertNoSymlinkPath(targetRoot, file.target_path, false);
    if (!fs.existsSync(destination)) continue;
    const stat = fs.lstatSync(destination);
    if (stat.isSymbolicLink() || !stat.isFile() || !fs.readFileSync(destination).equals(file.bytes))
      conflicts.push(file.target_path);
  }
  if (conflicts.length)
    fail(`existing learner files differ; nothing was overwritten: ${conflicts.join(", ")}`);
  const copied = [];
  try {
    for (const file of inputs) {
      const destination = assertNoSymlinkPath(targetRoot, file.target_path, false);
      if (fs.existsSync(destination)) continue;
      atomicWriteNewFile(targetRoot, file.target_path, file.bytes);
      copied.push(file.target_path);
    }
  } catch (error) {
    throw new Error(
      `module load stopped after ${copied.length} new file(s); no existing learner file was overwritten. copied=${copied.join(",")}; retry the same module after resolving the cause. cause=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const startBytes = verifiedCourseSource(
    targetRoot,
    distribution,
    `course/states/${moduleId}/start.json`,
  );
  const startState = JSON.parse(startBytes.toString("utf8"));
  const selectedInput = detectPreviousInput(targetRoot, moduleId, startState, distribution);
  const receipt = {
    schema_version: 1,
    module_id: moduleId,
    source_sha: distribution.source_sha,
    loaded_at: receiptTime,
    files: inputs.map((file) => ({ path: file.target_path, sha256: sha256(file.bytes) })),
    selected_input: selectedInput,
    learner_completion_inferred: false,
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  atomicWriteNewFile(targetRoot, receiptPath, receiptBytes);
  return {
    moduleId,
    sourceSha: distribution.source_sha,
    copied,
    unchanged: inputs.length - copied.length,
    selectedInput,
    receipt: receiptPath,
  };
}

function statePathAliases(relativePath, moduleId) {
  if (relativePath === `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`)
    return [`course/modules/${moduleId}/README.md`];
  if (relativePath === `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`)
    return [`course/quizzes/${moduleId}.json`];
  if (/^inputs\/M(?:0[0-9]|10)\/start\.md$/.test(relativePath)) return [`course/${relativePath}`];
  return [];
}

function stateReferenceExists(root, moduleId, reference) {
  if (typeof reference !== "string" || !reference.trim()) return false;
  const sourcePath = reference.split("#", 1)[0];
  if (path.isAbsolute(sourcePath) || sourcePath.includes("..")) return false;
  const candidates = [sourcePath, ...statePathAliases(sourcePath, moduleId)];
  return candidates.some((candidate) => {
    try {
      const absolute = resolveWithin(root, candidate);
      return fs.existsSync(absolute) && fs.statSync(absolute).isFile();
    } catch {
      return false;
    }
  });
}

export function checkState({ root, moduleId, stateName }) {
  if (!MODULE_ID_PATTERN.test(moduleId))
    fail("course:check requires one module ID from M00 through M10");
  if (!new Set(["start", "end"]).has(stateName)) fail("course:check state must be start or end");
  const targetRoot = path.resolve(root);
  const distribution = readDistribution(targetRoot);
  const sourcePath = `course/states/${moduleId}/${stateName}.json`;
  let state;
  try {
    state = JSON.parse(verifiedCourseSource(targetRoot, distribution, sourcePath).toString("utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /changed after sync|not included|invalid|JSON/.test(message)
      ? "mismatch"
      : "unverifiable";
    return { status, moduleId, state: stateName, reasons: [message] };
  }
  const reasons = [];
  if (state.module_id !== moduleId || state.state !== stateName)
    reasons.push("状態IDが一致しません");
  if (state.revision !== distribution.state_contract_revision)
    reasons.push("状態revisionと配布契約revisionが一致しません");
  if (!state.public_contract || !state.read_only) reasons.push("公開・読取専用契約がありません");
  if (state.source_sha !== distribution.source_sha)
    reasons.push("状態source_shaと配布source_shaが一致しません");
  if (
    state.confidentiality?.contains_model_answers !== false ||
    state.confidentiality?.contains_private_assessment_tests !== false
  )
    reasons.push("公開状態に非公開資料が混入する可能性があります");
  for (const reference of state.references ?? []) {
    if (!stateReferenceExists(targetRoot, moduleId, reference))
      reasons.push(`参照先がありません: ${reference}`);
  }
  if (!Array.isArray(state.references) || state.references.length === 0)
    reasons.push("状態参照がありません");
  const missing = [];
  if (!Array.isArray(state.expected?.required_paths) || state.expected.required_paths.length === 0)
    reasons.push("必須成果物の参照がありません");
  for (const requiredPath of state.expected?.required_paths ?? []) {
    try {
      if (typeof requiredPath !== "string") fail("required_path must be a string");
      const mapped = requiredPath.startsWith("inputs/") ? `course/${requiredPath}` : requiredPath;
      const absolute = resolveWithin(targetRoot, mapped);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) missing.push(mapped);
    } catch (error) {
      reasons.push(
        `必須成果物参照が不正です: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const input =
    stateName === "start" ? detectPreviousInput(targetRoot, moduleId, state, distribution) : null;
  if (input?.source === "invalid-previous-artifact-reference")
    reasons.push(...input.reasons.map((reason) => `先行成果物参照が不正です: ${reason}`));
  if (input?.source === "missing") missing.push(input.path ?? "公開開始サンプル");
  if (reasons.length)
    return {
      status: "mismatch",
      moduleId,
      state: stateName,
      sourceSha: distribution.source_sha,
      reasons,
      missing,
      input,
    };
  if (missing.length)
    return {
      status: "insufficient",
      moduleId,
      state: stateName,
      sourceSha: distribution.source_sha,
      reasons: [],
      missing,
      input,
    };
  if (stateName === "end") {
    for (const file of distribution.load_files.filter(
      (entry) => entry.module_id === moduleId && entry.kind === "submission-template",
    )) {
      const destination = resolveWithin(targetRoot, file.target_path);
      if (!fs.existsSync(destination)) continue;
      const current = fs.readFileSync(destination);
      const source = verifiedCourseSource(targetRoot, distribution, file.source_path);
      if (current.equals(source))
        return {
          status: "insufficient",
          moduleId,
          state: stateName,
          sourceSha: distribution.source_sha,
          reasons: ["提出ファイルは配布時の空テンプレートと同一です"],
          missing: [],
          input: null,
          assessment: "構造照合のみ。Level 2は人が別途評価します",
        };
    }
    return {
      status: "ready",
      moduleId,
      state: stateName,
      sourceSha: distribution.source_sha,
      reasons: [],
      missing: [],
      input: null,
      assessment: "構造照合のみ。Level 2は人が別途評価します",
    };
  }
  return {
    status: "ready",
    moduleId,
    state: stateName,
    sourceSha: distribution.source_sha,
    reasons: [],
    missing: [],
    input,
    assessment: "開始条件を確認しました。先行モジュールの修了を認定しません",
  };
}

export function loadCourseManifest(
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
) {
  return readJson(path.resolve(root, COURSE_MANIFEST_PATH), "course allowlist");
}
