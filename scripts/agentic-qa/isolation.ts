import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  compareCodeUnits,
  actualToolScopeSchema,
  forbiddenCapabilitySchema,
  forbiddenProbeResultsSchema,
  toolProfileSchema,
  type Challenge,
  type ActualToolScope,
  type ExposedCapability,
  type ForbiddenCapability,
  type ToolProfile,
} from "./contracts";
import type { LearnerBundle } from "./build-learner-bundle";

export type ForbiddenProbeResult = {
  capability: ForbiddenCapability;
  available: boolean;
  evidence: string;
};

export type IsolatedRunnerRoot = {
  root: string;
  session_id: string;
  learner_spec_dir: string;
  runbook_dir: string;
  challenge_dir: string;
};

const ALLOWED_ROOTS = new Set(["learner-spec", "runbook", "challenge"]);
const REQUIRED_POSITIVE_CAPABILITIES = [
  "learner_safe_file_read",
  "runtime_navigate",
  "runtime_interact",
  "runtime_observe",
  "screenshot",
  "narrow_console_or_log",
  "approved_test_control",
] as const;

const FORBIDDEN_CAPABILITY_DESCRIPTIONS = {
  source_repository: "isolated root has no application or repository source path",
  parent_traversal: "positive file reader exposes no parent traversal capability",
  git_repository_search: "runner tool scope exposes no git/repository search",
  web_search: "runner tool scope exposes no web search",
  arbitrary_external_fetch: "runner tool scope exposes no arbitrary HTTP fetch",
  generic_shell: "runner tool scope exposes no generic shell",
  web_bundle: "isolated root has no JavaScript bundle",
  source_map: "isolated root has no source map",
  network_response_body: "runner tool scope exposes no network response body",
  browser_evaluate: "runner tool scope exposes no arbitrary browser evaluate",
  native_apk_ipa: "isolated root has no APK or IPA",
  arbitrary_adb_shell: "runner tool scope exposes no arbitrary ADB shell",
  existing_test: "isolated root has no test file",
  hidden_test: "isolated root has no hidden test",
  challenge_patch: "isolated root has no instructor patch",
  answer_key: "isolated root has no answer key",
  prior_scored_session: "isolated root has no prior scored session artifact",
} satisfies Record<ForbiddenCapability, string>;

function copyDirectoryContents(sourceDir: string, destinationDir: string): void {
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const destination = path.join(destinationDir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Isolated root copy rejected symlink: ${source}`);
    if (entry.isDirectory()) {
      copyDirectoryContents(source, destination);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(source, destination);
      continue;
    }
    throw new Error(`Isolated root copy rejected non-regular entry: ${source}`);
  }
}

function listFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(`Isolated runner root contains a symlink: ${absolute}`);
      if (entry.isDirectory()) {
        files.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
        visit(absolute);
      } else if (entry.isFile())
        files.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
      else throw new Error(`Isolated runner root contains a non-regular entry: ${absolute}`);
    }
  };
  visit(rootDir);
  return files.sort(compareCodeUnits);
}

function expectedFilesFromFrozenInput(frozenInputRoot: string): string[] {
  const specificationRoot = path.join(frozenInputRoot, "specification");
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink())
        throw new Error(`Frozen learner input contains a symlink: ${absolute}`);
      if (stat.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!stat.isFile()) throw new Error(`Frozen learner input contains a non-file: ${absolute}`);
      files.push(
        `learner-spec/${path.relative(specificationRoot, absolute).split(path.sep).join("/")}`,
      );
    }
  };
  visit(specificationRoot);
  return ["runbook/runbook.md", "challenge/challenge.json", ...files].sort(compareCodeUnits);
}

const forbiddenPathComponents = new Set([
  ".git",
  "src",
  "app",
  "tests",
  "e2e",
  "maestro",
  "instructor",
  "answer-key",
  "patches",
  "node_modules",
  "dist",
  "output",
  ".artifacts",
  ".codex",
]);

function pathComponents(file: string): string[] {
  return file.split("/").filter((component) => component !== "");
}

function forbiddenPaths(files: string[], capability: ForbiddenCapability): string[] {
  return files.filter((file) => {
    const components = pathComponents(file);
    const finalComponent = components.at(-1) ?? "";
    if (capability === "source_repository")
      return components.some((component) => forbiddenPathComponents.has(component));
    if (capability === "web_bundle") return /\.(?:js|mjs|cjs)$/i.test(finalComponent);
    if (capability === "source_map") return finalComponent.endsWith(".map");
    if (capability === "native_apk_ipa") return /\.(?:apk|ipa)$/i.test(finalComponent);
    if (capability === "existing_test")
      return (
        components.includes("tests") ||
        components.includes("e2e") ||
        components.includes("maestro") ||
        /(?:\.test|\.spec)\.[^/]+$/i.test(finalComponent)
      );
    if (capability === "hidden_test")
      return components.some((component) =>
        ["hidden-tests", "__tests__", ".hidden"].includes(component),
      );
    if (capability === "challenge_patch")
      return components.includes("patches") || finalComponent.endsWith(".patch");
    if (capability === "answer_key") return components.includes("answer-key");
    if (capability === "prior_scored_session")
      return components.includes(".artifacts") || components.includes(".codex");
    return false;
  });
}

const runtimeCapabilityToForbidden: Partial<Record<ExposedCapability, ForbiddenCapability>> = {
  shell: "generic_shell",
  repository_search: "git_repository_search",
  git_search: "git_repository_search",
  http_fetch: "arbitrary_external_fetch",
  arbitrary_http_fetch: "arbitrary_external_fetch",
  browser_js_evaluation: "browser_evaluate",
  browser_javascript_evaluation: "browser_evaluate",
  adb_shell: "arbitrary_adb_shell",
};

function forbiddenCapabilityForExposedCapability(
  exposedCapability: ExposedCapability,
): ForbiddenCapability | null {
  const direct = forbiddenCapabilitySchema.safeParse(exposedCapability);
  if (direct.success) return direct.data;
  return runtimeCapabilityToForbidden[exposedCapability] ?? null;
}

function exposedCapabilitiesForForbiddenCapability(
  capability: ForbiddenCapability,
  actualToolScope: ActualToolScope,
): ExposedCapability[] {
  return actualToolScope.exposed_capabilities.filter(
    (exposedCapability) =>
      forbiddenCapabilityForExposedCapability(exposedCapability) === capability,
  );
}

function toolCapabilityAvailable(
  capability: ForbiddenCapability,
  actualToolScope: ActualToolScope,
): boolean {
  return (
    actualToolScope.measured &&
    exposedCapabilitiesForForbiddenCapability(capability, actualToolScope).length > 0
  );
}

export function createIsolatedRunnerRoot(input: {
  outputRoot: string;
  learnerBundle: LearnerBundle;
  challengeDirectory?: string;
  challenge: Challenge;
  frozenInputRoot?: string;
}): IsolatedRunnerRoot {
  const sessionId = crypto.randomUUID();
  const learnerSpecDir = path.join(input.outputRoot, "learner-spec");
  const runbookDir = path.join(input.outputRoot, "runbook");
  const challengeDir = path.join(input.outputRoot, "challenge");
  fs.mkdirSync(input.outputRoot, { recursive: true });
  if (input.frozenInputRoot !== undefined) {
    copyDirectoryContents(path.join(input.frozenInputRoot, "specification"), learnerSpecDir);
  } else {
    copyDirectoryContents(input.learnerBundle.root, learnerSpecDir);
  }
  fs.mkdirSync(runbookDir, { recursive: true });
  if (input.frozenInputRoot !== undefined) {
    fs.copyFileSync(
      path.join(input.frozenInputRoot, "runbook.md"),
      path.join(runbookDir, "runbook.md"),
    );
  } else if (input.challengeDirectory !== undefined) {
    fs.copyFileSync(
      path.join(input.challengeDirectory, "runbook.md"),
      path.join(runbookDir, "runbook.md"),
    );
  } else throw new Error("Isolated Runner Root requires a frozen input or challenge directory");
  fs.mkdirSync(challengeDir, { recursive: true });
  if (input.frozenInputRoot !== undefined) {
    fs.copyFileSync(
      path.join(input.frozenInputRoot, "challenge", "challenge.json"),
      path.join(challengeDir, "challenge.json"),
    );
  } else if (input.challengeDirectory !== undefined) {
    fs.copyFileSync(
      path.join(input.challengeDirectory, "challenge.json"),
      path.join(challengeDir, "challenge.json"),
    );
  } else throw new Error("Isolated Runner Root requires a frozen input or challenge directory");
  assertIsolatedRunnerRoot(
    input.outputRoot,
    input.frozenInputRoot === undefined
      ? undefined
      : expectedFilesFromFrozenInput(input.frozenInputRoot),
  );
  return {
    root: input.outputRoot,
    session_id: sessionId,
    learner_spec_dir: learnerSpecDir,
    runbook_dir: runbookDir,
    challenge_dir: challengeDir,
  };
}

export function assertIsolatedRunnerRoot(rootDir: string, expectedFiles?: readonly string[]): void {
  const rootStat = fs.lstatSync(rootDir);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
    throw new Error(`Isolated runner root must be a real directory: ${rootDir}`);
  const topLevel = fs.readdirSync(rootDir, { withFileTypes: true });
  const invalidTopLevel = topLevel.filter(
    (entry) => !entry.isDirectory() || !ALLOWED_ROOTS.has(entry.name),
  );
  if (invalidTopLevel.length > 0)
    throw new Error(
      `Isolated runner root exposes non-learner input: ${invalidTopLevel.map((entry) => entry.name).join(", ")}`,
    );
  const files = listFiles(rootDir);
  if (expectedFiles !== undefined) {
    const expected = new Set(expectedFiles);
    const expectedEntries = new Set<string>();
    for (const file of expectedFiles) {
      const segments = file.split("/");
      for (let index = 1; index < segments.length; index += 1)
        expectedEntries.add(segments.slice(0, index).join("/"));
      expectedEntries.add(file);
    }
    const actualEntries = files.sort(compareCodeUnits);
    if (
      actualEntries.length !== expectedEntries.size ||
      actualEntries.some((entry) => !expectedEntries.has(entry))
    )
      throw new Error("Isolated runner root canonical file set mismatch");
    for (const file of expected) {
      if (!fs.lstatSync(path.join(rootDir, file)).isFile())
        throw new Error("Isolated runner root canonical file set mismatch");
    }
  }
  const forbidden = [
    ...forbiddenPaths(files, "source_repository"),
    ...forbiddenPaths(files, "challenge_patch"),
    ...forbiddenPaths(files, "answer_key"),
    ...forbiddenPaths(files, "web_bundle"),
    ...forbiddenPaths(files, "source_map"),
    ...forbiddenPaths(files, "native_apk_ipa"),
    ...forbiddenPaths(files, "existing_test"),
    ...forbiddenPaths(files, "hidden_test"),
  ];
  if (forbidden.length > 0) {
    throw new Error(
      `Isolated runner root contains forbidden paths: ${[...new Set(forbidden)].sort(compareCodeUnits).join(", ")}`,
    );
  }
}

export function probeForbiddenCapabilities(
  rootDir: string,
  profile: ToolProfile,
  actualToolScope: ActualToolScope,
): ForbiddenProbeResult[] {
  assertIsolatedRunnerRoot(rootDir);
  const validatedProfile = toolProfileSchema.parse(profile);
  assertPositiveToolAllowlist(validatedProfile);
  actualToolScopeSchema.parse(actualToolScope);
  const files = listFiles(rootDir);
  return validatedProfile.forbidden_capabilities.map((capability) => {
    const description = FORBIDDEN_CAPABILITY_DESCRIPTIONS[capability];
    const matches = forbiddenPaths(files, capability);
    const exposedCapabilities = exposedCapabilitiesForForbiddenCapability(
      capability,
      actualToolScope,
    );
    const toolAvailable = toolCapabilityAvailable(capability, actualToolScope);
    const available = matches.length > 0 || toolAvailable;
    const observed = [
      ...matches,
      ...exposedCapabilities.map((exposedCapability) => `tool-scope:${exposedCapability}`),
    ].sort(compareCodeUnits);
    const evidence = available
      ? `forbidden capability ${capability} is reachable; observed=${observed.join(",")}`
      : `${description}; observed=none; files_checked=${files.length}; tool_scope_measured=${actualToolScope.measured}; tools_checked=${actualToolScope.exposed_capabilities.length}`;
    return { capability, available, evidence };
  });
}

export function assertPositiveToolAllowlist(profile: ToolProfile): void {
  const missing = REQUIRED_POSITIVE_CAPABILITIES.filter(
    (capability) => !profile.allowed_capabilities.includes(capability),
  );
  if (missing.length > 0)
    throw new Error(`Tool profile is missing required positive capability: ${missing.join(", ")}`);
}

export function assertForbiddenProbePasses(
  profile: ToolProfile,
  results: ForbiddenProbeResult[],
): void {
  const validatedProfile = toolProfileSchema.parse(profile);
  const parsed = forbiddenProbeResultsSchema.safeParse(results);
  if (!parsed.success)
    throw new Error(
      `Forbidden capability probe is invalid: ${parsed.error.issues
        .map((issue) => issue.message)
        .join(", ")}`,
    );
  const required = new Set(validatedProfile.forbidden_capabilities);
  const actual = new Set(parsed.data.map((result) => result.capability));
  const missing = validatedProfile.forbidden_capabilities.filter(
    (capability) => !actual.has(capability),
  );
  const unexpected = parsed.data
    .map((result) => result.capability)
    .filter((capability) => !required.has(capability));
  if (missing.length > 0 || unexpected.length > 0 || actual.size !== parsed.data.length)
    throw new Error(
      `Forbidden capability probe is incomplete: missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}`,
    );
  const available = parsed.data.filter((result) => result.available);
  if (available.length > 0)
    throw new Error(
      `Forbidden capability probe failed: ${available.map((result) => result.capability).join(", ")}`,
    );
}
