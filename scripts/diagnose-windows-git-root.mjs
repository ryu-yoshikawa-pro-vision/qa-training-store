import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const tempRoot = fs.realpathSync.native(os.tmpdir());
const versions = [
  {
    label: "2.55.0.windows.5",
    executable: process.env.QTS_PORTABLE_GIT_255,
  },
  {
    label: "2.56.0.windows.2",
    executable: process.env.QTS_PORTABLE_GIT_256,
  },
];

function isWithin(base, target) {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function canonicalize(value, basePath = process.cwd()) {
  try {
    return { path: fs.realpathSync.native(path.resolve(basePath, value)), succeeded: true };
  } catch (error) {
    return { code: error?.code ?? "unknown", succeeded: false };
  }
}

function normalizedCanonical(value) {
  if (process.platform !== "win32") return value;
  const withoutExtendedPrefix = value.replace(/^\\\\\?\\UNC\\/iu, "\\\\").replace(/^\\\\\?\\/u, "");
  return path.win32
    .normalize(withoutExtendedPrefix)
    .replace(/[\\/]+$/u, "")
    .toLowerCase();
}

function pathShape(value) {
  if (!value) return "empty";
  if (/^\\\\\?\\UNC\\/iu.test(value)) return "extended-unc";
  if (/^\\\\\?\\[A-Za-z]:[\\/]/u.test(value)) return "extended-drive";
  if (/^[A-Za-z]:[\\/]/u.test(value)) return "drive-absolute";
  if (/^(?:\\\\|\/\/)/u.test(value)) return "unc";
  if (path.isAbsolute(value)) return "absolute";
  return "relative";
}

function pathResult(value, fixtureRoot, basePath = fixtureRoot) {
  const canonicalReported = value ? canonicalize(value, basePath) : { succeeded: false };
  const canonicalFixture = canonicalize(fixtureRoot);
  return {
    present: Boolean(value),
    format: pathShape(value),
    hasSpace: Boolean(value?.includes(" ")),
    hasNonAscii: Boolean(value && /[^\x00-\x7f]/u.test(value)),
    separatorStyle: value
      ? value.includes("\\") && value.includes("/")
        ? "mixed"
        : value.includes("\\")
          ? "backslash"
          : value.includes("/")
            ? "slash"
            : "none"
      : "none",
    realpathSucceeded: canonicalReported.succeeded,
    fixtureRealpathSucceeded: canonicalFixture.succeeded,
    matchesFixture:
      canonicalReported.succeeded &&
      canonicalFixture.succeeded &&
      normalizedCanonical(canonicalReported.path) === normalizedCanonical(canonicalFixture.path),
  };
}

function runGit(executable, args, cwd) {
  const result = spawnSync(executable, args, {
    cwd,
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
  });
  return {
    exitCode: result.status,
    signal: result.signal,
    errorCode: result.error?.code ?? null,
    stdout: result.status === 0 ? result.stdout.trim() : "",
  };
}

function inspectPath(executable, args, cwd, fixtureRoot) {
  const result = runGit(executable, args, cwd);
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    errorCode: result.errorCode,
    path: pathResult(result.stdout, fixtureRoot),
  };
}

function configPresence(executable, configPath, key, expectedRoot) {
  const result = runGit(executable, ["config", "--file", configPath, "--get", key], repoRoot);
  return {
    configured: result.exitCode === 0,
    matchesFixture:
      expectedRoot !== undefined &&
      result.exitCode === 0 &&
      pathResult(result.stdout, expectedRoot, path.dirname(configPath)).matchesFixture,
    enabled: key === "extensions.worktreeConfig" && result.stdout === "true",
  };
}

function executableEvidence(executable) {
  const pathForEvidence = executable.resolvedExecutable ?? executable.executable;
  const resolved = canonicalize(pathForEvidence);
  const version = runGit(executable.executable, ["--version"], repoRoot);
  const execPathResult = runGit(executable.executable, ["--exec-path"], repoRoot);
  const execPath = execPathResult.exitCode === 0 ? canonicalize(execPathResult.stdout) : null;
  const coreExecutable =
    execPath?.succeeded === true ? path.resolve(execPath.path, "..", "..", "bin", "git.exe") : null;
  const canonicalCoreExecutable = coreExecutable ? canonicalize(coreExecutable) : null;
  const execPathInsidePackage =
    resolved.succeeded &&
    execPath?.succeeded === true &&
    isWithin(path.resolve(resolved.path, "..", ".."), execPath.path);
  const executableSha256 = resolved.succeeded ? fileSha256(resolved.path) : null;

  return {
    executableResolved: resolved.succeeded,
    executableFileName: resolved.succeeded ? path.basename(resolved.path) : null,
    executableSha256,
    version: version.exitCode === 0 ? version.stdout : null,
    execPathResolved: execPath?.succeeded === true,
    execPathInsidePackage,
    coreExecutableResolved: canonicalCoreExecutable?.succeeded === true,
    coreExecutableSha256: canonicalCoreExecutable?.succeeded
      ? fileSha256(canonicalCoreExecutable.path)
      : null,
  };
}

function fileSha256(filePath) {
  try {
    return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

function fixtureGitDirectory(fixtureRoot) {
  const entry = path.join(fixtureRoot, ".git");
  const stat = fs.existsSync(entry) ? fs.lstatSync(entry) : null;
  if (!stat?.isFile()) {
    return {
      path: entry,
      pointerIsRelative: null,
      pointerTargetExists: stat?.isDirectory() ?? false,
    };
  }

  const pointer = fs.readFileSync(entry, "utf8").match(/^gitdir:\s*(.+)\s*$/imu)?.[1];
  if (!pointer) {
    return { path: entry, pointerIsRelative: null, pointerTargetExists: false };
  }
  const resolvedPointer = path.resolve(fixtureRoot, pointer);
  return {
    path: resolvedPointer,
    pointerIsRelative: !path.isAbsolute(pointer),
    pointerTargetExists: fs.existsSync(resolvedPointer),
  };
}

function rootResolution(executable, fixtureRoot, gitDir) {
  const methods = {
    cwdOnly: { prefix: [], cwd: fixtureRoot },
    gitC: { prefix: ["-C", fixtureRoot], cwd: repoRoot },
    explicitGitDirWorktree: {
      prefix: ["--git-dir", gitDir, "--work-tree", fixtureRoot],
      cwd: repoRoot,
    },
  };
  return Object.fromEntries(
    Object.entries(methods).map(([name, method]) => [
      name,
      {
        showToplevel: inspectPath(
          executable,
          [...method.prefix, "rev-parse", "--show-toplevel"],
          method.cwd,
          fixtureRoot,
        ),
        absoluteGitDir: inspectPath(
          executable,
          [...method.prefix, "rev-parse", "--absolute-git-dir"],
          method.cwd,
          gitDir,
        ),
      },
    ]),
  );
}

function inspectFixture(executable, version, fixtureKind, fixtureRoot) {
  const gitEntry = path.join(fixtureRoot, ".git");
  const init = runGit(executable.executable, ["init", "--quiet", fixtureRoot], repoRoot);
  const gitEntryStat = fs.existsSync(gitEntry) ? fs.lstatSync(gitEntry) : null;
  const gitDirectory = fixtureGitDirectory(fixtureRoot);
  const gitDir = gitDirectory.path;
  const immediate = {
    showToplevel: inspectPath(
      executable.executable,
      ["rev-parse", "--show-toplevel"],
      fixtureRoot,
      fixtureRoot,
    ),
    absoluteGitDir: inspectPath(
      executable.executable,
      ["rev-parse", "--absolute-git-dir"],
      fixtureRoot,
      gitDir,
    ),
  };
  const configPath = path.join(gitDir, "config");

  return {
    gitExecutableCase: version,
    fixtureKind,
    fixturePathFormat: pathShape(fixtureRoot),
    fixtureSeparatorStyle:
      fixtureRoot.includes("\\") && fixtureRoot.includes("/")
        ? "mixed"
        : fixtureRoot.includes("\\")
          ? "backslash"
          : fixtureRoot.includes("/")
            ? "slash"
            : "none",
    fixtureHasSpace: fixtureRoot.includes(" "),
    fixtureHasNonAscii: /[^\x00-\x7f]/u.test(fixtureRoot),
    tempBaseHasNonAscii: /[^\x00-\x7f]/u.test(tempRoot),
    initExitCode: init.exitCode,
    initErrorCode: init.errorCode,
    gitEntryKind: gitEntryStat
      ? gitEntryStat.isDirectory()
        ? "directory"
        : gitEntryStat.isFile()
          ? "file"
          : "other"
      : "missing",
    gitFilePointerRelative: gitDirectory.pointerIsRelative,
    gitFilePointerTargetExists: gitDirectory.pointerTargetExists,
    gitDirectoryExists: fs.existsSync(gitDir),
    configExists: fs.existsSync(configPath),
    coreWorktree: configPresence(executable.executable, configPath, "core.worktree", fixtureRoot),
    worktreeConfig: configPresence(executable.executable, configPath, "extensions.worktreeConfig"),
    immediatelyAfterInit: immediate,
    resolutions: rootResolution(executable.executable, fixtureRoot, gitDir),
  };
}

function validateExecutables() {
  return versions.map((entry) => {
    if (!entry.executable) throw new Error(`Missing pinned executable for ${entry.label}`);
    const prepared = { ...entry, resolvedExecutable: entry.executable };
    const evidence = executableEvidence(prepared);
    if (evidence.version !== `git version ${entry.label}`) {
      throw new Error(`Pinned Git version did not match ${entry.label}`);
    }
    return { ...prepared, evidence };
  });
}

function resolveRunnerGit() {
  const result = spawnSync("where.exe", ["git.exe"], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const candidates =
    result.status === 0
      ? result.stdout
          .split(/\r?\n/u)
          .map((candidate) => candidate.trim())
          .filter((candidate) => /(?:^|[\\/])git\.exe$/iu.test(candidate))
      : [];
  if (candidates.length === 0) throw new Error("Runner Git executable could not be resolved");
  return { candidateCount: candidates.length, executable: path.resolve(candidates[0]) };
}

function createFixture(fixtureKind) {
  const prefix = fixtureKind === "ascii-with-space" ? "codex hook ascii-" : "codex hook 空白-";
  const root = fs.mkdtempSync(path.join(tempRoot, prefix));
  fs.mkdirSync(path.join(root, ".codex", "hooks"), { recursive: true });
  return root;
}

function compareFixture(fixtureKind, preparedVersions) {
  const fixtureRoot = createFixture(fixtureKind);
  const results = [];
  try {
    for (const entry of preparedVersions) {
      const gitEntry = path.join(fixtureRoot, ".git");
      if (fs.existsSync(gitEntry)) fs.rmSync(gitEntry, { force: true, recursive: true });
      results.push(inspectFixture(entry, entry.label, fixtureKind, fixtureRoot));
    }
  } finally {
    const canonicalRoot = canonicalize(fixtureRoot);
    if (canonicalRoot.succeeded && isWithin(tempRoot, canonicalRoot.path)) {
      fs.rmSync(canonicalRoot.path, { force: true, recursive: true });
    }
  }
  return results;
}

try {
  const preparedVersions = validateExecutables();
  const runnerGit = resolveRunnerGit();
  const executables = [
    ...preparedVersions,
    {
      label: "runner-PATH",
      executable: "git",
      resolvedExecutable: runnerGit.executable,
    },
    {
      label: "runner-absolute",
      executable: runnerGit.executable,
      resolvedExecutable: runnerGit.executable,
    },
  ];
  const executableResults = executables.map((entry) => ({
    label: entry.label,
    evidence: executableEvidence(entry),
  }));
  const runnerPathEvidence = executableResults.find(
    (entry) => entry.label === "runner-PATH",
  ).evidence;
  const runnerAbsoluteEvidence = executableResults.find(
    (entry) => entry.label === "runner-absolute",
  ).evidence;
  const comparison = {
    platform: process.platform,
    sameProcessEnvironment: true,
    gitExecutables: executableResults.map(({ label, evidence }) => ({ label, ...evidence })),
    runnerLaunchComparison: {
      whereResultCount: runnerGit.candidateCount,
      selectedExecutablePathFormat: pathShape(runnerGit.executable),
      executableSha256Matches:
        runnerPathEvidence.executableSha256 === runnerAbsoluteEvidence.executableSha256,
      coreExecutableSha256Matches:
        runnerPathEvidence.coreExecutableSha256 === runnerAbsoluteEvidence.coreExecutableSha256,
      versionMatches: runnerPathEvidence.version === runnerAbsoluteEvidence.version,
      bothExecPathsInsidePackage:
        runnerPathEvidence.execPathInsidePackage && runnerAbsoluteEvidence.execPathInsidePackage,
    },
    fixtures: [
      ...compareFixture("ascii-with-space", executables),
      ...compareFixture("japanese-with-space", executables),
    ],
  };
  process.stdout.write(`[windows-git-root-comparison] ${JSON.stringify(comparison)}\n`);
} catch (error) {
  process.stderr.write(
    `[windows-git-root-comparison] failed: ${error?.code ?? "diagnostic-error"}\n`,
  );
  process.exitCode = 1;
}
