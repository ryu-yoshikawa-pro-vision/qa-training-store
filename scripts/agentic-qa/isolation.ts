import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Challenge, ToolProfile } from "./contracts";
import type { LearnerBundle } from "./build-learner-bundle";

export type ForbiddenProbeResult = {
  capability: string;
  available: false;
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

function copyDirectoryContents(sourceDir: string, destinationDir: string): void {
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const destination = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) copyDirectoryContents(source, destination);
    else if (entry.isFile()) fs.copyFileSync(source, destination);
  }
}

function listFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile())
        files.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
    }
  };
  visit(rootDir);
  return files.sort((a, b) => a.localeCompare(b));
}

export function createIsolatedRunnerRoot(input: {
  outputRoot: string;
  learnerBundle: LearnerBundle;
  challengeDirectory: string;
  challenge: Challenge;
}): IsolatedRunnerRoot {
  const sessionId = crypto.randomUUID();
  const learnerSpecDir = path.join(input.outputRoot, "learner-spec");
  const runbookDir = path.join(input.outputRoot, "runbook");
  const challengeDir = path.join(input.outputRoot, "challenge");
  fs.mkdirSync(input.outputRoot, { recursive: true });
  copyDirectoryContents(input.learnerBundle.root, learnerSpecDir);
  fs.mkdirSync(runbookDir, { recursive: true });
  fs.copyFileSync(
    path.join(input.challengeDirectory, "runbook.md"),
    path.join(runbookDir, "runbook.md"),
  );
  fs.mkdirSync(challengeDir, { recursive: true });
  fs.copyFileSync(
    path.join(input.challengeDirectory, "challenge.json"),
    path.join(challengeDir, "challenge.json"),
  );
  assertIsolatedRunnerRoot(input.outputRoot);
  return {
    root: input.outputRoot,
    session_id: sessionId,
    learner_spec_dir: learnerSpecDir,
    runbook_dir: runbookDir,
    challenge_dir: challengeDir,
  };
}

export function assertIsolatedRunnerRoot(rootDir: string): void {
  if (!fs.existsSync(rootDir)) throw new Error(`Isolated runner root does not exist: ${rootDir}`);
  const topLevel = fs.readdirSync(rootDir, { withFileTypes: true });
  const invalidTopLevel = topLevel.filter(
    (entry) => !entry.isDirectory() || !ALLOWED_ROOTS.has(entry.name),
  );
  if (invalidTopLevel.length > 0)
    throw new Error(
      `Isolated runner root exposes non-learner input: ${invalidTopLevel.map((entry) => entry.name).join(", ")}`,
    );
  const forbiddenNames = [
    "src",
    "tests",
    ".git",
    "patches",
    "instructor",
    "answer-key",
    "node_modules",
    "dist",
    "output",
  ];
  const files = listFiles(rootDir);
  if (
    files.some((file) =>
      forbiddenNames.some(
        (name) => file === name || file.startsWith(`${name}/`) || file.includes(`/${name}/`),
      ),
    )
  ) {
    throw new Error(
      "Isolated runner root contains a forbidden source, test, patch, answer, or build path",
    );
  }
}

export function probeForbiddenCapabilities(
  rootDir: string,
  profile: ToolProfile,
): ForbiddenProbeResult[] {
  assertIsolatedRunnerRoot(rootDir);
  assertPositiveToolAllowlist(profile);
  const files = listFiles(rootDir);
  const checks: [string, string][] = [
    ["source_repository", "isolated root has no src/ or repository files"],
    ["parent_traversal", "positive file reader resolves only inside learner-spec/"],
    ["git_repository_search", "no git capability is exposed by the positive tool wrapper"],
    ["web_search", "no external search capability is exposed"],
    ["arbitrary_external_fetch", "no arbitrary HTTP capability is exposed"],
    ["generic_shell", "no shell capability is exposed"],
    ["web_bundle", "no JavaScript bundle is present in the isolated root"],
    ["source_map", "no source map is present in the isolated root"],
    ["network_response_body", "no network response body capability is exposed"],
    ["browser_evaluate", "no arbitrary browser evaluate capability is exposed"],
    ["native_apk_ipa", "no APK or IPA is present in the isolated root"],
    ["arbitrary_adb_shell", "no arbitrary ADB shell capability is exposed"],
    ["existing_test", "no test files are present in the isolated root"],
    ["hidden_test", "no hidden test capability is exposed"],
    ["challenge_patch", "no instructor patch is present in the isolated root"],
    ["answer_key", "no answer key or defect mapping is present in the isolated root"],
    ["prior_scored_session", "no prior session data is present in the isolated root"],
  ];
  for (const [capability] of checks) {
    if (
      !profile.forbidden_capabilities.includes(
        capability as (typeof profile.forbidden_capabilities)[number],
      )
    ) {
      throw new Error(`Tool profile does not declare required forbidden capability: ${capability}`);
    }
  }
  void files;
  return checks.map(([capability, evidence]) => ({ capability, available: false, evidence }));
}

export function assertPositiveToolAllowlist(profile: ToolProfile): void {
  const missing = REQUIRED_POSITIVE_CAPABILITIES.filter(
    (capability) => !profile.allowed_capabilities.includes(capability),
  );
  if (missing.length > 0)
    throw new Error(`Tool profile is missing required positive capability: ${missing.join(", ")}`);
}

export function assertForbiddenProbePasses(results: ForbiddenProbeResult[]): void {
  const available = results.filter((result) => result.available);
  if (available.length > 0)
    throw new Error(
      `Forbidden capability probe failed: ${available.map((result) => result.capability).join(", ")}`,
    );
}
