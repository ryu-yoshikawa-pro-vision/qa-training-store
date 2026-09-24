import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

import { ESLint } from "eslint";

const CONFIG_PATHS = Object.freeze([
  ".prettierignore",
  ".prettierrc.json",
  ".editorconfig",
  "eslint.config.js",
]);

function runGit(args, root, encoding = null) {
  const options = {
    cwd: root,
    stdio: ["ignore", "pipe", "ignore"],
  };
  if (encoding === "utf8") return execFileSync("git", args, { ...options, encoding });
  return execFileSync("git", args, options);
}

function getRoot() {
  const root = runGit(["rev-parse", "--show-toplevel"], process.cwd(), "utf8").trim();
  if (!root) throw new Error("repository root unavailable");
  return path.resolve(root);
}

function parseIndexEntries(output) {
  const entries = new Map();
  for (const record of output.toString("utf8").split("\0")) {
    if (!record) continue;
    const tab = record.indexOf("\t");
    if (tab < 0) throw new Error("malformed index entry");
    const match = /^(\d{6}) ([0-9a-f]{40,64}) ([0-3])$/u.exec(record.slice(0, tab));
    if (!match) throw new Error("malformed index entry");
    const filePath = record.slice(tab + 1);
    const current = entries.get(filePath) ?? [];
    current.push({ mode: match[1], objectId: match[2], stage: Number(match[3]) });
    entries.set(filePath, current);
  }
  return entries;
}

function assertNoUnmergedEntries(entries) {
  for (const records of entries.values()) {
    if (records.some((record) => record.stage !== 0)) {
      throw new Error("unmerged index entry");
    }
  }
}

function assertConfigurationMatchesIndex(root, entries) {
  for (const filePath of CONFIG_PATHS) {
    const records = entries.get(filePath) ?? [];
    if (records.length !== 1 || records[0]?.stage !== 0) {
      throw new Error("quality configuration is missing from stage 0");
    }
    const result = spawnSync("git", ["diff", "--quiet", "--", filePath], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    });
    if (result.error || result.status !== 0) {
      throw new Error("quality configuration differs from the index");
    }
  }
}

function stagedPaths(root) {
  return runGit(
    ["diff", "--cached", "--name-only", "-z", "--find-renames", "--diff-filter=ACMR"],
    root,
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function readStageZero(entries, filePath, root) {
  const records = entries.get(filePath) ?? [];
  const entry = records.find((record) => record.stage === 0);
  if (!entry) throw new Error("staged path has no stage 0 entry");
  return runGit(["cat-file", "blob", entry.objectId], root).toString("utf8");
}

async function checkPrettier(root, filePath, source) {
  const { check, getFileInfo, resolveConfig } = await import("prettier");
  const absolutePath = path.resolve(root, filePath);
  const info = await getFileInfo(absolutePath, {
    ignorePath: path.join(root, ".prettierignore"),
  });
  if (info.ignored || !info.inferredParser) return true;

  const config = await resolveConfig(absolutePath, { editorconfig: true });
  return check(source, {
    ...(config ?? {}),
    filepath: absolutePath,
  });
}

async function checkEslint(eslint, root, filePath, source) {
  const absolutePath = path.resolve(root, filePath);
  if (await eslint.isPathIgnored(absolutePath)) return true;
  const results = await eslint.lintText(source, { filePath: absolutePath });
  return results.every((result) => result.errorCount === 0 && result.fatalErrorCount === 0);
}

async function main() {
  let root;
  let entries;
  try {
    root = getRoot();
    entries = parseIndexEntries(runGit(["ls-files", "--stage", "-z"], root));
    assertNoUnmergedEntries(entries);
    assertConfigurationMatchesIndex(root, entries);
  } catch {
    process.stderr.write(
      "ERROR: staged quality check requires a resolved index and matching quality configuration; stage or restore quality configuration files before committing\n",
    );
    return 1;
  }

  let paths;
  try {
    paths = stagedPaths(root);
  } catch {
    process.stderr.write("ERROR: staged quality check could not enumerate the Git index\n");
    return 1;
  }

  if (paths.length === 0) {
    process.stdout.write("PASS: no staged Prettier or ESLint targets\n");
    return 0;
  }

  let eslint;
  try {
    eslint = new ESLint({ cwd: root });
  } catch {
    process.stderr.write("ERROR: staged quality check could not load ESLint configuration\n");
    return 1;
  }

  try {
    for (const filePath of paths) {
      const source = readStageZero(entries, filePath, root);
      if (!(await checkPrettier(root, filePath, source))) {
        process.stderr.write("FAIL: staged Prettier check failed\n");
        return 1;
      }
      if (!(await checkEslint(eslint, root, filePath, source))) {
        process.stderr.write("FAIL: staged ESLint check failed\n");
        return 1;
      }
    }
  } catch {
    process.stderr.write("ERROR: staged quality check could not inspect index content\n");
    return 1;
  }

  process.stdout.write("PASS: staged Prettier and ESLint checks\n");
  return 0;
}

process.exitCode = await main();
