import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COURSE_MANIFEST_PATH = "training/course-sync/manifest.json";
export const DISTRIBUTION_MANIFEST_PATH = ".course/distribution-manifest.json";
const STATE_CONTRACT_REVISION = "ai-assisted-qa-course-v3";
const REMAPPED_MARKDOWN_ROLES = new Set(["lesson", "guide"]);
const MODULE_IDS = Array.from({ length: 11 }, (_, index) => `M${String(index).padStart(2, "0")}`);
const MODULE_ID_PATTERN = /^M(?:0[0-9]|10)$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const FORBIDDEN_PATH =
  /(?:^|\/)(?:\.git|\.codex|node_modules|output|evals|secrets?|private|answer-keys?|model-answers?)(?:\/|$)|(?:^|\/)assessment\/(?:reference-solutions|scoring-tests|completed-states)(?:\/|$)|(?:^|\/)\.env(?:\.|$)/i;
const GITHUB_WORKFLOW_PATH = /(?:^|\/)\.github\/workflows(?:\/|$)/i;
const REQUIRED_ASSESSMENT_EXCLUSIONS = [
  "training/ai-assisted-qa-course/assessment/reference-solutions/**",
  "training/ai-assisted-qa-course/assessment/scoring-tests/**",
  "training/ai-assisted-qa-course/assessment/completed-states/**",
];
const ASSESSMENT_MAX_BYTES = 1024 * 1024;
const PHASE_TERMINALS = Object.freeze({ P1: "M04", P2: "M07", P3: "M10" });
const ASSESSMENT_ASSET_PATH_PATTERN =
  /^(?:training\/ai-assisted-qa-course\/assessment\/(?:scoring-tests\/M(?:0[0-9]|10)\.json|phase-[1-3]-rubric\.md)|docs\/curriculum\/ai-assisted-qa\/knowledge-graph\.json|docs\/spec\/README\.md|training\/workbook\/01_target-risk\.csv)$/;
const FORMAL_SOURCE_ASSET_PHASES = Object.freeze({
  "docs/curriculum/ai-assisted-qa/knowledge-graph.json": ["P1", "P2", "P3"],
  "docs/spec/README.md": ["P1", "P2"],
  "training/workbook/01_target-risk.csv": ["P1"],
});

function assessmentPhaseForModule(moduleId) {
  const number = Number(moduleId.slice(1));
  return number <= 4 ? "P1" : number <= 7 ? "P2" : "P3";
}

function validateAssessmentAssetEntry(entry, sourceSha, label = "assessment asset") {
  if (
    !entry ||
    typeof entry !== "object" ||
    !ASSESSMENT_ASSET_PATH_PATTERN.test(entry.source_path ?? "")
  )
    fail(`${label} path is not in the fixed assessment allowlist`);
  const scoringMatch = entry.source_path.match(/scoring-tests\/(M(?:0[0-9]|10))\.json$/);
  const rubricMatch = entry.source_path.match(/phase-([1-3])-rubric\.md$/);
  const formalSourcePhases = FORMAL_SOURCE_ASSET_PHASES[entry.source_path];
  const expectedModule = scoringMatch?.[1] ?? null;
  const expectedPhase = expectedModule
    ? assessmentPhaseForModule(expectedModule)
    : rubricMatch
      ? `P${rubricMatch[1]}`
      : undefined;
  if (formalSourcePhases) {
    if (
      entry.asset_type !== "formal_source" ||
      entry.module_id !== null ||
      JSON.stringify(entry.phase_ids) !== JSON.stringify(formalSourcePhases)
    )
      fail(
        `${label} formal source metadata does not match its allowlisted path: ${entry.source_path}`,
      );
  } else if (
    entry.module_id !== expectedModule ||
    entry.phase_id !== expectedPhase ||
    entry.asset_type !== (expectedModule ? "scoring" : "rubric")
  )
    fail(`${label} metadata does not match its allowlisted path: ${entry.source_path}`);
  if (sourceSha && entry.source_sha !== sourceSha)
    fail(`${label} source SHA does not match the course pin: ${entry.source_path}`);
  if (entry.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(entry.sha256))
    fail(`${label} has no valid SHA-256: ${entry.source_path}`);
  if (entry.git_blob_sha !== undefined && !/^[a-f0-9]{40}$/.test(entry.git_blob_sha))
    fail(`${label} has no valid Git blob SHA: ${entry.source_path}`);
  if (
    entry.bytes !== undefined &&
    (!Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > ASSESSMENT_MAX_BYTES)
  )
    fail(`${label} size is invalid: ${entry.source_path}`);
}

function validateAssessmentAssetSet(assets, sourceSha, label = "assessment assets") {
  if (!Array.isArray(assets) || assets.length !== 17)
    fail(`${label} must contain 11 scoring files, 3 phase rubrics, and 3 formal source references`);
  const paths = new Set();
  for (const asset of assets) {
    validateAssessmentAssetEntry(asset, sourceSha, label);
    if (paths.has(asset.source_path))
      fail(`${label} contains a duplicate path: ${asset.source_path}`);
    paths.add(asset.source_path);
  }
  const expected = [
    ...MODULE_IDS.map(
      (moduleId) => `training/ai-assisted-qa-course/assessment/scoring-tests/${moduleId}.json`,
    ),
    ...[1, 2, 3].map(
      (phase) => `training/ai-assisted-qa-course/assessment/phase-${phase}-rubric.md`,
    ),
    ...Object.keys(FORMAL_SOURCE_ASSET_PHASES),
  ];
  if (expected.some((sourcePath) => !paths.has(sourcePath)))
    fail(`${label} does not match the complete fixed-path allowlist`);
}

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

function assertNotWorkflowPath(value, description) {
  if (GITHUB_WORKFLOW_PATH.test(value))
    fail(`${description} is prohibited by the course distribution contract: ${value}`);
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
  if (manifest.state_contract_revision !== STATE_CONTRACT_REVISION)
    fail("The state contract revision must match the implemented read-only checker");
  if (
    !Array.isArray(manifest.local_files) ||
    !Array.isArray(manifest.external_skill_files) ||
    !Array.isArray(manifest.load_files) ||
    !Array.isArray(manifest.assessment_asset_allowlist) ||
    !Array.isArray(manifest.forbidden_paths) ||
    !manifest.forbidden_paths.includes(".github/workflows/**") ||
    REQUIRED_ASSESSMENT_EXCLUSIONS.some((item) => !manifest.forbidden_paths.includes(item))
  )
    fail(
      "Course manifest must include local_files, external_skill_files, load_files, workflow prohibition, and all assessment distribution exclusions",
    );
  validateAssessmentAssetSet(manifest.assessment_asset_allowlist);
  if (
    manifest.external_skill_source?.repository !== "ryu-yoshikawa-pro-vision/qa-workflow-skills" ||
    manifest.external_skill_source?.commit !== "7cc6cba7772de549841a39d71694cbafbc783324"
  )
    fail("The external Skill source must remain pinned to the Plan revision");
  const destinations = new Set();
  for (const entry of [...manifest.local_files, ...manifest.external_skill_files]) {
    const source = assertNotWorkflowPath(
      normalizeRelativePath(entry.source_path, "source_path"),
      "source_path",
    );
    const target = assertNotWorkflowPath(
      normalizeRelativePath(entry.target_path, "target_path"),
      "target_path",
    );
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
    "test-requirement-design",
    "test-condition-design",
    "test-case-design",
    "coverage-analysis",
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
  for (const moduleId of MODULE_IDS) {
    const inputTarget = `course/modules/${moduleId}/inputs/start.md`;
    if (
      !manifest.local_files.some(
        (entry) =>
          entry.module_id === moduleId &&
          entry.role === "input" &&
          entry.target_path === inputTarget,
      ) ||
      !manifest.load_files.some(
        (entry) =>
          entry.module_id === moduleId &&
          entry.source_path === inputTarget &&
          entry.target_path === inputTarget,
      )
    )
      fail(
        `${moduleId} public start input must be allowlisted under course/modules/${moduleId}/inputs/`,
      );
  }
  for (const entry of manifest.load_files) {
    if (!MODULE_ID_PATTERN.test(entry.module_id))
      fail(`invalid load module_id: ${entry.module_id}`);
    assertNotWorkflowPath(
      normalizeRelativePath(entry.source_path, "load source_path"),
      "load source_path",
    );
    assertNotWorkflowPath(
      normalizeRelativePath(entry.target_path, "load target_path"),
      "load target_path",
    );
  }
  for (const asset of manifest.assessment_asset_allowlist) {
    if (asset.asset_type === "rubric") continue;
    if (
      manifest.local_files.some((file) => file.source_path === asset.source_path) ||
      manifest.load_files.some((file) => file.source_path === asset.source_path)
    )
      fail(
        `assessment source is reference-only and must not be copied or loaded: ${asset.source_path}`,
      );
  }
  return {
    modules: MODULE_IDS.length,
    externalSkillFiles: manifest.external_skill_files.length,
    loadFiles: manifest.load_files.length,
    assessmentAssetReferences: manifest.assessment_asset_allowlist.length,
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

function assessmentSourceAbsolute(root, sourcePath) {
  if (!ASSESSMENT_ASSET_PATH_PATTERN.test(sourcePath))
    fail(`assessment source path is not allowlisted: ${sourcePath}`);
  const absolute = path.resolve(root, ...sourcePath.split("/"));
  const relative = path.relative(path.resolve(root), absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    fail(`assessment source path escapes the repository: ${sourcePath}`);
  let current = path.resolve(root);
  for (const part of sourcePath.split("/")) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    if (fs.lstatSync(current).isSymbolicLink())
      fail(`assessment source must not use a symbolic link: ${sourcePath}`);
  }
  if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile())
    fail(`assessment source must be a regular file: ${sourcePath}`);
  return absolute;
}

function readPinnedAssessmentSource(root, sourceSha, entry, allowUncommittedFixture) {
  const absolute = assessmentSourceAbsolute(root, entry.source_path);
  let bytes;
  let blobSha;
  if (allowUncommittedFixture) {
    bytes = fs.readFileSync(absolute);
    blobSha = gitBlobSha(bytes);
  } else {
    const treeEntry = git(root, ["ls-tree", sourceSha, "--", entry.source_path]);
    const match = treeEntry.match(/^100644 blob ([a-f0-9]{40})\t(.+)$/);
    if (!match || match[2] !== entry.source_path)
      fail(`assessment source must be a regular pinned Git blob: ${entry.source_path}`);
    blobSha = match[1];
    bytes = execFileSync("git", ["show", `${sourceSha}:${entry.source_path}`], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (!fs.readFileSync(absolute).equals(bytes))
      fail(`assessment worktree differs from pinned source SHA: ${entry.source_path}`);
  }
  if (bytes.length === 0 || bytes.length > ASSESSMENT_MAX_BYTES)
    fail(`assessment source size is invalid: ${entry.source_path}`);
  if (entry.asset_type === "scoring") {
    let scoring;
    try {
      scoring = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      fail(`pinned scoring JSON is invalid: ${entry.source_path}: ${error.message}`);
    }
    if (
      scoring.schema_version !== 1 ||
      scoring.module_id !== entry.module_id ||
      scoring.revision !== "assessment-reference-v1"
    )
      fail(`pinned scoring JSON has an invalid schema/module/revision: ${entry.source_path}`);
  } else if (bytes.includes(Buffer.from("<html", "ascii"))) {
    fail(`pinned phase rubric unexpectedly contains HTML: ${entry.source_path}`);
  }
  return {
    ...entry,
    source_sha: sourceSha,
    sha256: sha256(bytes),
    git_blob_sha: blobSha,
    bytes: bytes.length,
  };
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

function remapMarkdownLinks(bytes, entry, manifest) {
  if (!REMAPPED_MARKDOWN_ROLES.has(entry.role)) return bytes;
  const targetBySource = new Map(
    manifest.local_files.map((file) => [path.posix.normalize(file.source_path), file.target_path]),
  );
  const sourceDirectory = path.posix.dirname(entry.source_path);
  const targetDirectory = path.posix.dirname(entry.target_path);
  const content = bytes
    .toString("utf8")
    .replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g, (whole, prefix, href, suffix) => {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return whole;
      const match = href.match(/^([^?#]*)([?#].*)?$/);
      const sourceHref = match?.[1];
      if (!sourceHref) return whole;
      const sourceTarget = targetBySource.get(
        path.posix.normalize(path.posix.join(sourceDirectory, sourceHref)),
      );
      if (!sourceTarget) return whole;
      const targetHref =
        path.posix.relative(targetDirectory, sourceTarget) || path.posix.basename(sourceTarget);
      return `${prefix}${targetHref}${match?.[2] ?? ""}${suffix}`;
    });
  return Buffer.from(content, "utf8");
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
    const boundBytes = bindStateSourceSha(raw, entry.source_path, sourceSha);
    const bytes = remapMarkdownLinks(boundBytes, entry, manifest);
    files.push({
      source_path: entry.source_path,
      target_path: entry.target_path,
      bytes,
      origin: "local",
      module_id: entry.module_id,
      role: entry.role,
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
  const assessmentAssets = manifest.assessment_asset_allowlist.map((entry) =>
    readPinnedAssessmentSource(sourceRoot, sourceSha, entry, allowUncommittedFixture),
  );
  validateAssessmentAssetSet(assessmentAssets, sourceSha);
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
    ...(file.module_id ? { module_id: file.module_id } : {}),
    ...(file.role ? { role: file.role } : {}),
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
    assessment_assets: assessmentAssets,
    distribution: {
      public_source: true,
      includes_reference_solutions: false,
      includes_scoring_tests: false,
      includes_completed_states: false,
      includes_secrets: false,
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
  validateAssessmentAssetSet(distribution.assessment_assets, distribution.source_sha);
  if (
    distribution.distribution?.public_source !== true ||
    distribution.distribution?.includes_reference_solutions !== false ||
    distribution.distribution?.includes_scoring_tests !== false ||
    distribution.distribution?.includes_completed_states !== false ||
    distribution.distribution?.includes_secrets !== false
  )
    fail("course distribution manifest violates the public-source and learner-package boundary");
  for (const entry of distribution.files) {
    assertNotWorkflowPath(
      normalizeRelativePath(entry.source_path, "distribution source_path"),
      "distribution source_path",
    );
    assertNotWorkflowPath(
      normalizeRelativePath(entry.target_path, "distribution target_path"),
      "distribution target_path",
    );
  }
  for (const entry of distribution.load_files) {
    if (!MODULE_ID_PATTERN.test(entry.module_id))
      fail(`invalid load module_id: ${entry.module_id}`);
    assertNotWorkflowPath(
      normalizeRelativePath(entry.source_path, "load source_path"),
      "load source_path",
    );
    assertNotWorkflowPath(
      normalizeRelativePath(entry.target_path, "load target_path"),
      "load target_path",
    );
  }
  for (const asset of distribution.assessment_assets) {
    if (
      Object.hasOwn(asset, "content") ||
      Object.hasOwn(asset, "body") ||
      Object.hasOwn(asset, "bytes_base64")
    )
      fail(`assessment distribution metadata must not contain asset content: ${asset.source_path}`);
    if (
      asset.asset_type !== "rubric" &&
      (distribution.files.some((file) => file.source_path === asset.source_path) ||
        distribution.load_files.some((file) => file.source_path === asset.source_path))
    )
      fail(`assessment source must not be copied or loaded: ${asset.source_path}`);
  }
  return distribution;
}

export function assessmentAssetsForPhase({ root, phaseId }) {
  if (!Object.hasOwn(PHASE_TERMINALS, phaseId)) fail("assessment phase must be P1, P2, or P3");
  const distribution = readDistribution(path.resolve(root));
  return distribution.assessment_assets.filter(
    (asset) => asset.phase_id === phaseId || asset.phase_ids?.includes(phaseId),
  );
}

async function readResponseLimited(response, maxBytes) {
  const contentLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes)
    fail("assessment response exceeds the allowed size");
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          fail("assessment response exceeds the allowed size");
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock?.();
    }
    return Buffer.concat(chunks, size);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) fail("assessment response exceeds the allowed size");
  return bytes;
}

export async function fetchPinnedAssessmentAsset({ asset, sourceSha, fetchImpl = fetch }) {
  validateAssessmentAssetEntry(asset, sourceSha);
  if (!SHA_PATTERN.test(sourceSha) || !/^[a-f0-9]{64}$/.test(asset.sha256 ?? ""))
    fail("assessment source SHA and expected content hash must be fixed");
  const expectedUrl = `https://raw.githubusercontent.com/ryu-yoshikawa-pro-vision/qa-training-store/${sourceSha}/${asset.source_path}`;
  let response;
  try {
    response = await fetchImpl(expectedUrl, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json, text/plain", "User-Agent": "qa-training-course" },
    });
  } catch (error) {
    fail(
      `pinned assessment fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    response.status !== 200 ||
    response.redirected === true ||
    (response.url && response.url !== expectedUrl)
  )
    fail(`pinned assessment fetch returned a redirect or non-200 response: ${asset.source_path}`);
  const contentType = response.headers?.get?.("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html") || contentType.includes("xhtml"))
    fail(`pinned assessment fetch returned HTML: ${asset.source_path}`);
  const bytes = await readResponseLimited(response, ASSESSMENT_MAX_BYTES);
  if (bytes.length !== asset.bytes || sha256(bytes) !== asset.sha256)
    fail(`pinned assessment content hash or size does not match metadata: ${asset.source_path}`);
  if (asset.asset_type === "scoring") {
    let scoring;
    try {
      scoring = JSON.parse(bytes.toString("utf8"));
    } catch {
      fail(`pinned scoring asset is not valid JSON: ${asset.source_path}`);
    }
    if (
      scoring.schema_version !== 1 ||
      scoring.module_id !== asset.module_id ||
      scoring.revision !== "assessment-reference-v1"
    )
      fail(`pinned scoring asset schema/module/revision mismatch: ${asset.source_path}`);
  }
  return bytes;
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

export function readVerifiedCourseSource({ root, sourcePath }) {
  const targetRoot = path.resolve(root);
  const distribution = readDistribution(targetRoot);
  const entry = distribution.files.find((file) => file.source_path === sourcePath);
  if (!entry) fail(`source is not part of the verified course package: ${sourcePath}`);
  const bytes = verifiedCourseSource(targetRoot, distribution, entry.target_path);
  if (entry.blob_sha && gitBlobSha(bytes) !== entry.blob_sha)
    fail(`external Skill blob SHA mismatch: ${sourcePath}`);
  return { bytes, targetPath: entry.target_path, metadata: entry };
}

export function verifySyncedCourseDistribution({ root }) {
  const targetRoot = path.resolve(root);
  const distribution = readDistribution(targetRoot);
  const filesByTarget = new Map();
  for (const entry of distribution.files) {
    const targetPath = normalizeRelativePath(entry.target_path, "distribution target_path");
    if (filesByTarget.has(targetPath)) fail(`duplicate distribution target: ${targetPath}`);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? ""))
      fail(`distributed file has no valid SHA-256: ${targetPath}`);
    const absolute = assertNoSymlinkPath(targetRoot, targetPath, true);
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile())
      fail(`distributed file is missing or not a regular file: ${targetPath}`);
    const bytes = fs.readFileSync(absolute);
    if (sha256(bytes) !== entry.sha256) fail(`distributed file changed after sync: ${targetPath}`);
    filesByTarget.set(targetPath, { entry, bytes });
  }

  for (const moduleId of MODULE_IDS) {
    for (const stateName of ["start", "end"]) {
      const statePath = `course/states/${moduleId}/${stateName}.json`;
      const stateFile = filesByTarget.get(statePath);
      if (!stateFile) fail(`pinned module state is missing from the distribution: ${statePath}`);
      let state;
      try {
        state = JSON.parse(stateFile.bytes.toString("utf8"));
      } catch (error) {
        fail(`pinned module state is invalid JSON: ${statePath}: ${error.message}`);
      }
      if (
        state.module_id !== moduleId ||
        state.state !== stateName ||
        state.source_sha !== distribution.source_sha ||
        state.revision !== distribution.state_contract_revision
      )
        fail(`pinned module state SHA or revision does not match the distribution: ${statePath}`);
    }
  }

  const shopFiles = new Set(
    [...filesByTarget.keys()].filter((targetPath) => targetPath.startsWith("course/shop/")),
  );
  if (!shopFiles.has("course/shop/index.html"))
    fail("pinned Scenario Shop distribution has no course/shop/index.html");
  const shopRoot = assertNoSymlinkPath(targetRoot, "course/shop", true);
  if (!fs.existsSync(shopRoot) || !fs.lstatSync(shopRoot).isDirectory())
    fail("pinned Scenario Shop distribution directory is missing");

  const observedShopFiles = new Set();
  const visitShop = (directory, relativeDirectory = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const targetPath = `course/shop/${relativePath}`;
      const absolute = assertNoSymlinkPath(targetRoot, targetPath, true);
      if (entry.isSymbolicLink()) fail(`symlink is prohibited in the pinned Shop: ${targetPath}`);
      if (entry.isDirectory()) {
        visitShop(absolute, relativePath);
        continue;
      }
      if (!entry.isFile()) fail(`unsupported filesystem entry in the pinned Shop: ${targetPath}`);
      if (!shopFiles.has(targetPath)) fail(`unmanifested file in the pinned Shop: ${targetPath}`);
      observedShopFiles.add(targetPath);
    }
  };
  visitShop(shopRoot);
  for (const targetPath of shopFiles) {
    if (!observedShopFiles.has(targetPath))
      fail(`manifested Shop file is missing from course/shop: ${targetPath}`);
  }

  return {
    source_sha: distribution.source_sha,
    state_contract_revision: distribution.state_contract_revision,
    distribution_files_verified: filesByTarget.size,
    shop_files_verified: shopFiles.size,
    state_files_verified: MODULE_IDS.length * 2,
    assessment_asset_references: distribution.assessment_assets.length,
  };
}

function latestLoadReceipt(root, moduleId) {
  const receiptRoot = assertNoSymlinkPath(root, ".course-load", true);
  if (!fs.existsSync(receiptRoot)) return { status: "missing" };
  if (!fs.lstatSync(receiptRoot).isDirectory())
    return { status: "invalid", reasons: ["load receipt path is not a directory"] };
  const names = fs
    .readdirSync(receiptRoot)
    .filter((name) => name.startsWith(`${moduleId}-`) && name.endsWith(".json"));
  if (!names.length) return { status: "missing" };
  const receipts = [];
  for (const name of names) {
    const filePath = path.join(receiptRoot, name);
    if (fs.lstatSync(filePath).isSymbolicLink())
      return { status: "invalid", reasons: [`load receipt must not be a symlink: ${name}`] };
    try {
      receipts.push(readJson(filePath, `${moduleId} load receipt`));
    } catch (error) {
      return {
        status: "invalid",
        reasons: [error instanceof Error ? error.message : String(error)],
      };
    }
  }
  receipts.sort((left, right) => String(left.loaded_at).localeCompare(String(right.loaded_at)));
  return { status: "found", receipt: receipts.at(-1) };
}

function mapModuleInputPath(moduleId, inputPath) {
  const prefix = `inputs/${moduleId}/`;
  if (!inputPath.startsWith(prefix)) return null;
  const fileName = inputPath.slice(prefix.length);
  if (!fileName || fileName === "." || fileName === ".." || /[\\/]/.test(fileName)) return null;
  return `course/modules/${moduleId}/inputs/${fileName}`;
}

function validateLoadReceipt(root, moduleId, distribution) {
  let latest;
  try {
    latest = latestLoadReceipt(root, moduleId);
  } catch (error) {
    return {
      status: "invalid",
      reasons: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (latest.status !== "found") return latest;
  const receipt = latest.receipt;
  if (
    receipt?.schema_version !== 1 ||
    receipt.module_id !== moduleId ||
    receipt.source_sha !== distribution.source_sha ||
    !Array.isArray(receipt.files) ||
    typeof receipt.loaded_at !== "string" ||
    !Number.isFinite(Date.parse(receipt.loaded_at)) ||
    receipt.learner_completion_inferred !== false
  )
    return {
      status: "revision-mismatch",
      reasons: [`${moduleId} load receipt does not match the pinned course source SHA`],
      receipt,
    };
  const expected = distribution.load_files.filter((entry) => entry.module_id === moduleId);
  if (receipt.files.length !== expected.length)
    return {
      status: "invalid",
      reasons: [`${moduleId} load receipt has an incomplete file list`],
      receipt,
    };
  if (
    !receipt.files.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        typeof entry.path === "string" &&
        /^[a-f0-9]{64}$/.test(entry.sha256 ?? ""),
    )
  )
    return {
      status: "invalid",
      reasons: [`${moduleId} load receipt contains an invalid file entry`],
      receipt,
    };
  const recorded = new Map(receipt.files.map((entry) => [entry.path, entry.sha256]));
  if (recorded.size !== receipt.files.length)
    return {
      status: "invalid",
      reasons: [`${moduleId} load receipt contains duplicate paths`],
      receipt,
    };
  for (const entry of expected) {
    let bytes;
    try {
      bytes = verifiedCourseSource(root, distribution, entry.source_path);
    } catch (error) {
      return {
        status: "invalid",
        reasons: [error instanceof Error ? error.message : String(error)],
        receipt,
      };
    }
    if (recorded.get(entry.target_path) !== sha256(bytes))
      return {
        status: "invalid",
        reasons: [
          `${moduleId} load receipt does not match the allowlisted input: ${entry.target_path}`,
        ],
        receipt,
      };
  }
  return { status: "valid", receipt };
}

function publicInputSelection(root, moduleId, state, distribution, ignoredPrevious = []) {
  const fallback = state.public_fallback;
  const refs = state.inputs ?? [];
  if (
    !fallback ||
    fallback.public !== true ||
    typeof fallback.artifact_id !== "string" ||
    typeof fallback.revision !== "string" ||
    !fallback.revision.trim() ||
    typeof fallback.contract_id !== "string" ||
    typeof fallback.path !== "string"
  )
    return { source: "invalid-public-fallback", artifact_id: fallback?.artifact_id ?? null };
  if (refs.some((input) => input.artifact_id === fallback.artifact_id))
    return {
      source: "invalid-public-fallback",
      artifact_id: fallback.artifact_id,
      reasons: ["fallback artifact ID must differ from learner artifact IDs"],
    };
  if (
    refs.length > 0 &&
    refs.some(
      (input) => input.revision === fallback.revision || input.contract_id !== fallback.contract_id,
    )
  )
    return {
      source: "invalid-public-fallback",
      artifact_id: fallback.artifact_id,
      reasons: ["fallback must use a distinct revision with the predecessor input contract"],
    };
  const mapped = fallback.path.startsWith("inputs/")
    ? mapModuleInputPath(moduleId, fallback.path)
    : fallback.path;
  if (!mapped)
    return {
      source: "invalid-public-fallback",
      artifact_id: fallback.artifact_id,
      reasons: ["public fallback path must stay under this module's inputs directory"],
    };
  if (!state.expected?.required_paths?.includes(fallback.path))
    return {
      source: "invalid-public-fallback",
      artifact_id: fallback.artifact_id,
      reasons: ["public fallback is not listed as a required start path"],
    };
  const entry = distribution.files.find(
    (file) => file.target_path === mapped && file.module_id === moduleId && file.role === "input",
  );
  if (!entry)
    return {
      source: "invalid-public-fallback",
      artifact_id: fallback.artifact_id,
      path: mapped,
      reasons: ["public fallback is not an allowlisted input for this module"],
    };
  try {
    verifiedCourseSource(root, distribution, mapped);
  } catch (error) {
    return {
      source: "missing",
      artifact_id: fallback.artifact_id,
      path: mapped,
      reasons: [error instanceof Error ? error.message : String(error)],
    };
  }
  return {
    source: "module-public-sample",
    artifact_id: fallback.artifact_id,
    revision: fallback.revision,
    contract_id: fallback.contract_id,
    path: mapped,
    ...(ignoredPrevious.length ? { ignored_previous_artifacts: ignoredPrevious } : {}),
  };
}

function detectPreviousInput(root, moduleId, state, distribution) {
  const refs = state.inputs;
  if (!Array.isArray(refs))
    return {
      source: "invalid-previous-artifact-reference",
      reasons: ["start state inputs must be an array"],
    };
  if (refs.length === 0) return publicInputSelection(root, moduleId, state, distribution);
  const priorModules = new Set(refs.map((input) => input.from_module));
  if (
    priorModules.size !== 1 ||
    !MODULE_ID_PATTERN.test(refs[0]?.from_module ?? "") ||
    refs.some((input) => input.optional !== true || input.same_input_contract !== true)
  )
    return {
      source: "invalid-previous-artifact-reference",
      reasons: ["predecessor inputs must reference one optional module contract"],
    };
  const priorModule = refs[0].from_module;
  const priorStatePath = `course/states/${priorModule}/end.json`;
  let priorState;
  try {
    priorState = JSON.parse(
      verifiedCourseSource(root, distribution, priorStatePath).toString("utf8"),
    );
  } catch (error) {
    return {
      source: "invalid-previous-artifact-reference",
      reasons: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    priorState.module_id !== priorModule ||
    priorState.state !== "end" ||
    priorState.revision !== distribution.state_contract_revision ||
    priorState.source_sha !== distribution.source_sha ||
    !Array.isArray(priorState.outputs)
  )
    return {
      source: "revision-mismatch",
      artifact_id: refs.map((item) => item.artifact_id),
      reasons: ["predecessor end state does not match the pinned revision"],
    };
  const fallback = state.public_fallback;
  if (
    !fallback ||
    refs.some(
      (input) => input.contract_id !== fallback.contract_id || input.revision === fallback.revision,
    )
  )
    return {
      source: "revision-mismatch",
      artifact_id: refs.map((item) => item.artifact_id),
      reasons: [
        "predecessor and public fallback revisions must differ and share an input contract",
      ],
    };
  const outputs = new Map(priorState.outputs.map((item) => [item.artifact_id, item]));
  const ignored = [];
  const candidatePaths = [];
  for (const input of refs) {
    const output = outputs.get(input.artifact_id);
    if (!output)
      return {
        source: "invalid-previous-artifact-reference",
        artifact_id: input.artifact_id,
        reasons: [`artifact ID is absent from ${priorModule} end state`],
      };
    if (input.path !== output.path)
      return {
        source: "invalid-previous-artifact-reference",
        artifact_id: input.artifact_id,
        reasons: [`artifact path does not match ${priorModule} end state`],
      };
    if (input.revision !== output.revision || input.contract_id !== output.contract_id)
      return {
        source: "revision-mismatch",
        artifact_id: input.artifact_id,
        reasons: [`artifact revision or contract does not match ${priorModule} end state`],
      };
    let absolute;
    try {
      absolute = assertNoSymlinkPath(root, input.path, true);
    } catch (error) {
      return {
        source: "invalid-previous-artifact-reference",
        artifact_id: input.artifact_id,
        reasons: [error instanceof Error ? error.message : String(error)],
      };
    }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      ignored.push(input.path);
      continue;
    }
    const current = fs.readFileSync(absolute);
    if (!current.length) {
      ignored.push(input.path);
      continue;
    }
    const loadEntry = distribution.load_files.find(
      (entry) => entry.module_id === priorModule && entry.target_path === input.path,
    );
    if (!loadEntry)
      return {
        source: "invalid-previous-artifact-reference",
        artifact_id: input.artifact_id,
        reasons: [`artifact path is not a loadable predecessor file: ${input.path}`],
      };
    const templateBytes = verifiedCourseSource(root, distribution, loadEntry.source_path);
    if (current.equals(templateBytes)) ignored.push(input.path);
    else candidatePaths.push(input.path);
  }
  if (ignored.length) return publicInputSelection(root, moduleId, state, distribution, ignored);
  if (candidatePaths.length !== refs.length)
    return publicInputSelection(root, moduleId, state, distribution, candidatePaths);
  const priorReceipt = validateLoadReceipt(root, priorModule, distribution);
  if (priorReceipt.status !== "valid")
    return {
      source: "revision-mismatch",
      artifact_id: refs.map((item) => item.artifact_id),
      paths: candidatePaths,
      reasons: priorReceipt.reasons ?? [
        `${priorModule} has no verified load receipt for this source revision`,
      ],
    };
  return {
    source: "learner-previous-artifact",
    artifact_id: refs.map((item) => item.artifact_id),
    revision: refs[0].revision,
    contract_id: refs[0].contract_id,
    paths: candidatePaths,
  };
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

function stateReferenceExists(root, moduleId, reference, distribution) {
  if (typeof reference !== "string" || !reference.trim()) return false;
  const sourcePath = reference.split("#", 1)[0];
  const skillReference = /^([^/]+\/[^@]+)@([a-f0-9]{40})$/.exec(sourcePath);
  if (skillReference) {
    const pinnedSource = distribution.external_skill_source;
    if (
      skillReference[1] !== pinnedSource?.repository ||
      skillReference[2] !== pinnedSource?.commit
    )
      return false;
    const moduleSkillEntries = distribution.files.filter((file) => {
      const skillPath = /^skills\/([^/]+)\/SKILL\.md$/.exec(file.source_path ?? "");
      const moduleUsesSkill = Array.isArray(file.module_id)
        ? file.module_id.includes(moduleId)
        : file.module_id === moduleId;
      return (
        file.origin === "external-skill" &&
        moduleUsesSkill &&
        skillPath &&
        file.target_path === `.agents/skills/${skillPath[1]}/SKILL.md`
      );
    });
    if (moduleSkillEntries.length === 0) return false;
    return moduleSkillEntries.every((entry) => {
      try {
        verifiedCourseSource(root, distribution, entry.target_path);
        return true;
      } catch {
        return false;
      }
    });
  }
  if (path.isAbsolute(sourcePath) || sourcePath.includes("..")) return false;
  const mappedTargets = distribution.files
    .filter((file) => file.source_path === sourcePath)
    .map((file) => file.target_path);
  const candidates = [
    ...new Set([sourcePath, ...statePathAliases(sourcePath, moduleId), ...mappedTargets]),
  ];
  return candidates.some((candidate) => {
    try {
      verifiedCourseSource(root, distribution, candidate);
      return true;
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
    return {
      status,
      moduleId,
      state: stateName,
      reasons: [message],
      execution: {
        status: "unverified",
        required: [],
        note: "course:check does not execute or verify runtime requirements",
      },
    };
  }
  const execution = {
    status: "unverified",
    required: Array.isArray(state.environment) ? state.environment : [],
    note: "course:check checks files, revisions, and references only; it does not execute runtime requirements",
  };
  const reasons = [];
  const missing = [];
  const unchanged = [];
  if (state.module_id !== moduleId || state.state !== stateName)
    reasons.push("状態のmodule_idまたはstateが一致しません");
  if (state.revision !== distribution.state_contract_revision)
    reasons.push("状態revisionと配布revisionが一致しません");
  if (!state.public_contract || !state.read_only)
    reasons.push("公開・読み取り専用の状態契約がありません");
  if (state.source_sha !== distribution.source_sha)
    reasons.push("状態source_shaと配布source_shaが一致しません");
  const phaseAssessment =
    stateName === "end" && state.phase_assessment
      ? {
          phaseId: state.phase_assessment.phase_id,
          terminalModuleId: state.phase_assessment.terminal_module_id,
          requiredAtTerminalModule: state.phase_assessment.required_at_terminal_module,
          availableHere: moduleId === state.phase_assessment.terminal_module_id,
          status: "not_evaluated_by_course_check",
          command:
            moduleId === state.phase_assessment.terminal_module_id
              ? state.phase_assessment.entry_command
              : undefined,
        }
      : undefined;
  if (stateName === "end") {
    const phaseId = assessmentPhaseForModule(moduleId);
    const terminalModuleId = PHASE_TERMINALS[phaseId];
    if (
      state.phase_assessment?.phase_id !== phaseId ||
      state.phase_assessment?.terminal_module_id !== terminalModuleId ||
      state.phase_assessment?.required_at_terminal_module !== terminalModuleId ||
      state.phase_assessment?.assessment_is_terminal_only !== true ||
      state.phase_assessment?.mastery_status !== "not_evaluated_by_course_check"
    )
      reasons.push("Phase正式評価の終端・状態参照契約が不正です");
    const hasTerminalCheck = state.checks?.some(
      (check) => check.mode === "phase-assessment-reference",
    );
    if (hasTerminalCheck !== (moduleId === terminalModuleId))
      reasons.push("正式評価の入口はPhase終端moduleだけに設定できます");
  }
  if (
    !Array.isArray(state.checks) ||
    state.checks.some(
      (check) =>
        typeof check.id !== "string" ||
        !check.id ||
        !["read-only", "phase-assessment-reference"].includes(check.mode) ||
        typeof check.condition !== "string" ||
        !check.condition,
    )
  )
    reasons.push("状態照合条件のID/mode/conditionが不正です");
  if (
    state.distribution?.public_source !== true ||
    state.distribution?.includes_reference_solutions !== false ||
    state.distribution?.includes_scoring_tests !== false ||
    state.distribution?.includes_completed_states !== false
  )
    reasons.push("状態契約の公開範囲または評価資料の分離設定が不正です");
  for (const reference of state.references ?? []) {
    if (!stateReferenceExists(targetRoot, moduleId, reference, distribution))
      reasons.push(`状態の参照先がありません: ${reference}`);
  }
  if (!Array.isArray(state.references) || state.references.length === 0)
    reasons.push("状態の参照先がありません");
  if (!Array.isArray(state.expected?.required_paths) || state.expected.required_paths.length === 0)
    reasons.push("必須pathがありません");
  for (const requiredPath of state.expected?.required_paths ?? []) {
    try {
      if (typeof requiredPath !== "string") fail("required_path must be a string");
      const mapped = requiredPath.startsWith("inputs/")
        ? mapModuleInputPath(moduleId, requiredPath)
        : requiredPath;
      if (!mapped) fail("input required_path must stay under this module's inputs directory");
      const absolute = assertNoSymlinkPath(targetRoot, mapped, true);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) missing.push(mapped);
    } catch (error) {
      reasons.push(`必須pathが不正です: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const input =
    stateName === "start" ? detectPreviousInput(targetRoot, moduleId, state, distribution) : null;
  if (
    input?.source === "invalid-previous-artifact-reference" ||
    input?.source === "invalid-public-fallback" ||
    input?.source === "revision-mismatch"
  )
    reasons.push(...(input.reasons ?? ["開始入力の参照またはrevisionが一致しません"]));
  if (input?.source === "missing") missing.push(input.path ?? "公開開始サンプル");

  const receiptState = validateLoadReceipt(targetRoot, moduleId, distribution);
  if (receiptState.status === "missing") {
    missing.push(`.course-load/${moduleId}-<load receipt>`);
  } else if (receiptState.status !== "valid") {
    reasons.push(...(receiptState.reasons ?? [`${moduleId} load receipt is invalid`]));
  } else if (
    stateName === "start" &&
    JSON.stringify(receiptState.receipt.selected_input) !== JSON.stringify(input)
  ) {
    reasons.push(
      "ロード時に選択した入力と現在の前提状態が異なります。確認後、同じモジュールを明示的に再ロードしてください",
    );
  }

  if (stateName === "end") {
    if (!Array.isArray(state.outputs) || state.outputs.length === 0)
      reasons.push("終了状態にartifact IDとpathの一覧がありません");
    const ids = new Set();
    const paths = new Set();
    for (const output of state.outputs ?? []) {
      if (
        typeof output.artifact_id !== "string" ||
        !output.artifact_id ||
        typeof output.path !== "string" ||
        typeof output.revision !== "string" ||
        !output.revision.trim() ||
        typeof output.contract_id !== "string" ||
        !output.contract_id
      ) {
        reasons.push("終了artifactのID・path・revision・contract_idが不完全です");
        continue;
      }
      if (ids.has(output.artifact_id) || paths.has(output.path))
        reasons.push("終了artifactのIDまたはpathが重複しています");
      ids.add(output.artifact_id);
      paths.add(output.path);
      if (!state.expected?.required_paths?.includes(output.path))
        reasons.push(`artifact pathがrequired_pathsにありません: ${output.path}`);
      const loadEntry = distribution.load_files.find(
        (entry) => entry.module_id === moduleId && entry.target_path === output.path,
      );
      if (!loadEntry) {
        reasons.push(`artifact pathが単一モジュールのload allowlistにありません: ${output.path}`);
        continue;
      }
      let absolute;
      try {
        absolute = assertNoSymlinkPath(targetRoot, output.path, true);
      } catch (error) {
        reasons.push(
          `artifact path is unsafe: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
      const current = fs.readFileSync(absolute);
      const template = verifiedCourseSource(targetRoot, distribution, loadEntry.source_path);
      if (current.equals(template)) unchanged.push(output.path);
      else if (current.length === 0) unchanged.push(output.path);
    }
  }

  if (reasons.length)
    return {
      status: "mismatch",
      moduleId,
      state: stateName,
      sourceSha: distribution.source_sha,
      reasons,
      missing,
      input,
      execution,
    };
  if (missing.length || unchanged.length)
    return {
      status: "insufficient",
      moduleId,
      state: stateName,
      sourceSha: distribution.source_sha,
      reasons: unchanged.map((item) => `artifact is still the loaded starter: ${item}`),
      missing,
      unchanged,
      input,
      phaseAssessment,
      assessment: "構造照合のみです。正式評価はPhase終端のcourse:assessで行います",
      execution,
    };
  return {
    status: "ready",
    moduleId,
    state: stateName,
    sourceSha: distribution.source_sha,
    reasons: [],
    missing: [],
    input,
    phaseAssessment,
    execution,
    assessment:
      stateName === "end"
        ? "構造照合のみです。Phase末の正式AI評価は別にcourse:assessで起動します"
        : "開始前提を照合しました。本人の先行モジュール修了は認定しません",
  };
}
export function loadCourseManifest(
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
) {
  return readJson(path.resolve(root, COURSE_MANIFEST_PATH), "course allowlist");
}
