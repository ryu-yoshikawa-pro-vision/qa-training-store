#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function git(...args) {
  return execFileSync("git", args, { cwd: sourceRoot, encoding: "utf8" }).trim();
}

export function validateTemplateTarget(target, source = sourceRoot) {
  const resolved = path.resolve(target);
  const sourceDirectory = path.resolve(source);
  const isWithin = (parent, candidate) => {
    const relative = path.relative(parent, candidate);
    return (
      relative === "" ||
      (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    );
  };
  if (isWithin(sourceDirectory, resolved) || isWithin(resolved, sourceDirectory)) {
    throw new Error("Template destination must be outside the source checkout");
  }
  let candidate = resolved;
  while (true) {
    try {
      if (fs.lstatSync(candidate).isSymbolicLink()) {
        throw new Error("Template destination must not have symlink ancestors: " + candidate);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = path.dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }
  return resolved;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== "--target" || !args[1])) {
    throw new Error("Usage: prepare-learner-template.mjs [--target <empty-dir>]");
  }
  if (git("branch", "--show-current") !== "main") {
    throw new Error("Template preparation must run from the merged main branch");
  }
  if (git("status", "--porcelain", "--untracked-files=all")) {
    throw new Error("Template preparation requires a clean source checkout");
  }
  const sourceSha = git("rev-parse", "HEAD");
  const target = validateTemplateTarget(
    path.resolve(sourceRoot, args[1] ?? "../ai-assisted-qa-learner"),
  );
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error("Template destination must be an ordinary directory: " + target);
    }
    if (fs.readdirSync(target).length > 0) {
      throw new Error("Template destination is not empty: " + target);
    }
  } else {
    fs.mkdirSync(target, { recursive: true });
  }
  const courseCli = path.join(sourceRoot, "scripts/training/ai-assisted-qa-course.mjs");
  const syncArgs = [courseCli, "sync", "--source-sha", sourceSha, "--target", target];
  execFileSync(process.execPath, syncArgs, { cwd: sourceRoot, stdio: "inherit" });
  execFileSync(process.execPath, [courseCli, "verify-distribution"], {
    cwd: target,
    stdio: "inherit",
  });
  const result = { status: "ready-to-copy", source_sha: sourceSha, target };
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Template preparation failed: " + message);
    process.exitCode = 1;
  }
}
