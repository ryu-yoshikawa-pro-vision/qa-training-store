import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const FULL_SHA = /^[0-9a-f]{40}$/;

function readOption(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing required option: ${name}`);
  return value;
}

function runGit(args: string[], cwd = process.cwd()): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const sourceSha = readOption("--source-sha");
const target = resolve(readOption("--target"));
if (!FULL_SHA.test(sourceSha))
  throw new Error("--source-sha must be a 40-character lowercase commit SHA.");
if (existsSync(target)) throw new Error(`Target already exists; refusing to overwrite: ${target}`);

const sourceRoot = resolve(".");
const resolvedCommit = runGit(["rev-parse", "--verify", `${sourceSha}^{commit}`]);
if (resolvedCommit !== sourceSha)
  throw new Error(`Source SHA did not resolve exactly: ${sourceSha}`);

mkdirSync(resolve(target, ".."), { recursive: true });
runGit(["clone", "--no-local", "--no-checkout", sourceRoot, target]);
runGit(["checkout", "--detach", sourceSha], target);

const workflowDirectory = join(target, ".github", "workflows");
const archiveDirectory = join(target, ".github", "training-copy-source-workflows");
mkdirSync(archiveDirectory, { recursive: true });
for (const workflowName of ["ci.yml", "native-ci.yml", "native-ios-ci.yml"]) {
  const sourcePath = join(workflowDirectory, workflowName);
  if (existsSync(sourcePath)) renameSync(sourcePath, join(archiveDirectory, workflowName));
}

const activeWorkflowDirectory = workflowDirectory;
mkdirSync(activeWorkflowDirectory, { recursive: true });
for (const workflowName of ["training-ci.yml", "training-native-ci.yml"]) {
  const sourcePath = join(target, "training", "github-actions", workflowName);
  if (!existsSync(sourcePath))
    throw new Error(`Training workflow template is missing: ${sourcePath}`);
  writeFileSync(join(activeWorkflowDirectory, workflowName), readFileSync(sourcePath));
}

writeFileSync(
  join(target, "training-copy-source.json"),
  `${JSON.stringify({ sourceRepository: basename(sourceRoot), sourceSha, resolvedSourceSha: resolvedCommit }, null, 2)}\n`,
);

console.log(JSON.stringify({ target, sourceSha, resolvedSourceSha: resolvedCommit }, null, 2));
