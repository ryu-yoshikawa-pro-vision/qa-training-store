import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { validateTrainingWorkflow } from "./workflow-contract";

const FULL_SHA = /^[0-9a-f]{40}$/;
const activeWorkflowAllowlist = new Set(["training-ci.yml", "training-native-ci.yml"]);

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? ".";
}

function fail(message: string): never {
  throw new Error(`Training Copy validation failed: ${message}`);
}

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseManifest(text: string): { sourceSha: string; resolvedSourceSha: string } {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) fail("manifest must be an object");
  const record = value;
  if (typeof record.sourceSha !== "string") fail("manifest sourceSha must be a string");
  if (typeof record.resolvedSourceSha !== "string")
    fail("manifest resolvedSourceSha must be a string");
  return { sourceSha: record.sourceSha, resolvedSourceSha: record.resolvedSourceSha };
}

const root = resolve(option("--root"));
const workflowDirectory = join(root, ".github", "workflows");
if (!existsSync(workflowDirectory)) fail(".github/workflows is missing");

const activeWorkflows = readdirSync(workflowDirectory).filter(
  (name) => name.endsWith(".yml") || name.endsWith(".yaml"),
);
if (
  activeWorkflows.length !== activeWorkflowAllowlist.size ||
  activeWorkflows.some((name) => !activeWorkflowAllowlist.has(name))
) {
  fail(
    `active workflow allowlist must be exactly ${[...activeWorkflowAllowlist].join(", ")}; found ${activeWorkflows.join(", ")}`,
  );
}

const manifestPath = join(root, "training-copy-source.json");
if (!existsSync(manifestPath)) fail("training-copy-source.json is missing");
const manifest = parseManifest(readFileSync(manifestPath, "utf8"));
if (!FULL_SHA.test(manifest.sourceSha)) fail("manifest sourceSha is not a full lowercase SHA");
if (manifest.resolvedSourceSha !== manifest.sourceSha)
  fail("manifest source SHA was not resolved exactly");
if (git(["rev-parse", "HEAD"], root) !== manifest.sourceSha)
  fail("copy HEAD does not match resolved source SHA");

for (const workflowName of activeWorkflowAllowlist) {
  const templatePath = join(root, "training", "github-actions", workflowName);
  const activePath = join(workflowDirectory, workflowName);
  if (!existsSync(templatePath)) fail(`template is missing: ${templatePath}`);
  if (readFileSync(templatePath, "utf8") !== readFileSync(activePath, "utf8"))
    fail(`${workflowName} does not match its repository-owned Training template`);
}

for (const workflowName of activeWorkflowAllowlist) {
  const workflowPath = join(workflowDirectory, workflowName);
  const text = readFileSync(workflowPath, "utf8");
  try {
    validateTrainingWorkflow(workflowName, text);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (workflowName === "training-native-ci.yml") {
    for (const required of [
      "ubuntu-24.04",
      'java-version: "17"',
      'MAESTRO_VERSION: "2.8.0"',
      "maestro/bin/maestro",
      "--version",
      'ANDROID_API_LEVEL: "34"',
      "google_apis",
      "x86_64",
      "KVM",
      "sys.boot_completed",
      "timeout",
      "adb devices",
      "if: always()",
      "-avd",
    ]) {
      if (!text.includes(required))
        fail(`${workflowName} is missing Android runtime contract token: ${required}`);
    }
  }
}

console.log(`Training Copy validation passed for ${manifest.sourceSha}`);
