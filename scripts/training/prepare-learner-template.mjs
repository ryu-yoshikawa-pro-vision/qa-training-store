#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function git(...args) {
  return execFileSync("git", args, { cwd: sourceRoot, encoding: "utf8" }).trim();
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== "--target" || !args[1])) {
    throw new Error("Usage: node scripts/training/prepare-learner-template.mjs [--target <empty-dir>]");
  }
  if (git("branch", "--show-current") !== "main") {
    throw new Error("Template preparation must run from the merged main branch");
  }
  if (git("status", "--porcelain", "--untracked-files=all")) {
    throw new Error("Template preparation requires a clean source checkout");
  }
  const sourceSha = git("rev-parse", "HEAD");
  const target = path.resolve(sourceRoot, args[1] ?? "../ai-assisted-qa-learner");
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isSymbolicLink() || !fs.lstatSync(target).isDirectory()) {
      throw new Error("Template destination must be a directory, not a symlink: " + target);
    }
    if (fs.readdirSync(target).length > 0) {
      throw new Error("Template destination must be empty; existing files were not changed: " + target);
    }
  } else {
    fs.mkdirSync(target, { recursive: true });
  }
  const courseCli = path.join(sourceRoot, "scripts/training/ai-assisted-qa-course.mjs");
  execFileSync(process.execPath, [courseCli, "sync", "--source-sha", sourceSha, "--target", target], {
    cwd: sourceRoot,
    stdio: "inherit",
  });
  execFileSync(process.execPath, [courseCli, "verify-distribution"], {
    cwd: target,
    stdio: "inherit",
  });
  console.log(JSON.stringify({ status: "ready-to-copy", source_sha: sourceSha, target }, null, 2));
}

try {
  main();
} catch (error) {
  console.error("Template preparation failed: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
}
