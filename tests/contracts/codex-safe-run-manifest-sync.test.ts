import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const powerShellWrapperPath = path.join(repoRoot, "scripts", "codex-safe.ps1");
const bashWrapperPath = path.join(repoRoot, "scripts", "codex-safe.sh");
const collectorPowerShellPath = path.join(repoRoot, "scripts", "collect-run-artifacts.ps1");
const collectorPythonPath = path.join(repoRoot, "scripts", "collect-run-artifacts.py");

type FixtureOptions = {
  git: boolean;
  manifest: boolean;
  runDirectory?: boolean;
};

type Fixture = {
  root: string;
  runId: string;
  runRoot: string;
  manifestPath: string;
};

let fixtureCounter = 0;

function runGit(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr ?? result.stdout}`);
  }
}

function runPowerShell(wrapperPath: string, args: string[], cwd = repoRoot, codexPath?: string) {
  return spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", wrapperPath, ...args],
    {
      cwd,
      encoding: "utf8",
      env: codexPath ? { ...process.env, CODEX_BIN: codexPath } : process.env,
    },
  );
}

function runBash(wrapperPath: string, args: string[], cwd = repoRoot, codexPath?: string) {
  const relativeWrapperPath = path.relative(cwd, wrapperPath).replaceAll("\\", "/");
  const bashWrapperPath = relativeWrapperPath.startsWith(".")
    ? relativeWrapperPath
    : `./${relativeWrapperPath}`;
  return spawnSync("bash", [bashWrapperPath, ...args], {
    cwd,
    encoding: "utf8",
    env: codexPath ? { ...process.env, CODEX_BIN: codexPath } : process.env,
  });
}

function hasPowerShellCodex() {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "if (Get-Command codex -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }",
    ],
    { encoding: "utf8" },
  );
  return result.status === 0 && !result.error;
}

function getPowerShellCodexPath() {
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", "$command = Get-Command codex -ErrorAction Stop; $command.Source"],
    { encoding: "utf8" },
  );
  const codexPath = result.stdout.trim();
  if (result.status !== 0 || result.error || codexPath.length === 0) {
    throw new Error(
      `Unable to resolve PowerShell Codex command: ${result.stderr ?? result.stdout}`,
    );
  }
  return codexPath;
}

function hasBashCodex() {
  const result = spawnSync(
    "bash",
    ["-lc", "command -v codex >/dev/null 2>&1 && codex --version >/dev/null 2>&1"],
    {
      encoding: "utf8",
    },
  );
  return result.status === 0 && !result.error;
}

function nextRunId() {
  fixtureCounter += 1;
  return `20990101-${String(fixtureCounter).padStart(6, "0")}-JST`;
}

function createFixture(options: FixtureOptions): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-safe-manifest-contract-"));
  const runId = nextRunId();
  const runRoot = path.join(root, ".codex", "runs", runId);
  const manifestPath = path.join(runRoot, "run.json");

  fs.mkdirSync(path.join(root, ".codex", "rules"), { recursive: true });
  fs.cpSync(path.join(repoRoot, ".codex", "rules"), path.join(root, ".codex", "rules"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(powerShellWrapperPath, path.join(root, "scripts", "codex-safe.ps1"));
  fs.copyFileSync(bashWrapperPath, path.join(root, "scripts", "codex-safe.sh"));
  fs.copyFileSync(collectorPowerShellPath, path.join(root, "scripts", "collect-run-artifacts.ps1"));
  fs.copyFileSync(collectorPythonPath, path.join(root, "scripts", "collect-run-artifacts.py"));
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "collect-run-artifacts.sh"),
    path.join(root, "scripts", "collect-run-artifacts.sh"),
  );
  fs.writeFileSync(path.join(root, "tracked.txt"), "initial\n", "utf8");

  if (options.git) {
    runGit(root, ["init", "--quiet"]);
    runGit(root, ["add", "."]);
    runGit(root, [
      "-c",
      "user.name=Codex Contract",
      "-c",
      "user.email=codex-contract@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "initial",
    ]);
    fs.writeFileSync(path.join(root, "tracked.txt"), "changed\n", "utf8");
  }

  if (options.manifest || options.runDirectory) {
    fs.mkdirSync(runRoot, { recursive: true });
  }

  if (options.manifest) {
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify({
        schema_version: 2,
        run_id: runId,
        status: "running",
        changed_files: ["existing.txt"],
        validation: { status: "not_run", commands: [], warnings: [] },
      })}\n`,
      "utf8",
    );
  }

  return { root, runId, runRoot, manifestPath };
}

function removeFixture(fixture: Fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
}

function missingRunId() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `20991231-${String(900000 + attempt).padStart(6, "0")}-JST`;
    if (!fs.existsSync(path.join(repoRoot, ".codex", "runs", candidate))) {
      return candidate;
    }
  }
  throw new Error("Could not allocate a missing RunId for the contract test");
}

const powerShellCodexAvailable = hasPowerShellCodex();
const bashCodexAvailable = hasBashCodex();
const runtimeTestTimeout = 30_000;

describe("codex-safe run manifest sync contract", () => {
  it("exposes the same precondition, sync, and exit boundaries in both wrappers", () => {
    const powerShell = fs.readFileSync(powerShellWrapperPath, "utf8");
    const bash = fs.readFileSync(bashWrapperPath, "utf8");

    for (const source of [powerShell, bash]) {
      expect(source).toContain("Run directory not found");
      expect(source).toContain("manifest_sync_start");
      expect(source).toContain("manifest_sync_success");
      expect(source).toContain("manifest_sync_failed");
      expect(source).toContain("manifest_sync_skipped");
      expect(source).toContain("manifest_not_found");
      expect(source).toContain("run_id_not_provided");
    }

    expect(powerShell).toContain("-RefreshGitChangedFiles");
    expect(bash).toContain("--refresh-git-changed-files");
    expect(powerShell).toContain('Join-Path $repoRoot "scripts\\collect-run-artifacts.ps1"');
    expect(powerShell).toContain("$collectorExit = 1");
    expect(powerShell).toContain("catch");
    expect(bash).toContain('bash "$repo_root/scripts/collect-run-artifacts.sh"');
    expect(bash).toContain('if bash "$repo_root/scripts/collect-run-artifacts.sh"');
    expect(bash).toContain("collector_exit=$?");
    expect(powerShell).not.toContain("Stop Hook");
    expect(bash).not.toContain("Stop Hook");
  });

  it("fails before creating logs or a directory for an unknown RunId", () => {
    const runId = missingRunId();
    const runPath = path.join(repoRoot, ".codex", "runs", runId);
    const powerShell = runPowerShell(powerShellWrapperPath, [
      "-SkipPreflight",
      "-NoLog",
      "-RunId",
      runId,
      "--version",
    ]);
    const bash = runBash(bashWrapperPath, [
      "--skip-preflight",
      "--no-log",
      "--run-id",
      runId,
      "--version",
    ]);

    expect(powerShell.status).not.toBe(0);
    expect(`${powerShell.stdout}${powerShell.stderr}`).toContain("Run directory not found");
    expect(bash.status).not.toBe(0);
    expect(`${bash.stdout}${bash.stderr}`).toContain("Run directory not found");
    expect(fs.existsSync(runPath)).toBe(false);
  });

  it.skip("SKIP: collector child-process launch failure requires a dedicated runtime alteration", () => {
    throw new Error("This case is intentionally skipped per the Plan stop condition.");
  });

  it.skipIf(!powerShellCodexAvailable)(
    "runs a manifest-less PowerShell Run without generating a manifest",
    () => {
      const fixture = createFixture({ git: true, manifest: false, runDirectory: true });
      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-NoLog", "-RunId", fixture.runId, "--version"],
          fixture.root,
          getPowerShellCodexPath(),
        );

        expect(result.status).toBe(0);
        expect(fs.existsSync(fixture.manifestPath)).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellCodexAvailable)(
    "syncs an existing manifest from a repository subdirectory with NoLog",
    () => {
      const fixture = createFixture({ git: true, manifest: true });
      const nested = path.join(fixture.root, "nested");
      fs.mkdirSync(nested);
      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-NoLog", "-RunId", fixture.runId, "--version"],
          nested,
          getPowerShellCodexPath(),
        );
        const manifest = JSON.parse(fs.readFileSync(fixture.manifestPath, "utf8")) as {
          changed_files: string[];
          status: string;
        };

        expect(result.status).toBe(0);
        expect(manifest.changed_files).toEqual(
          expect.arrayContaining(["existing.txt", "tracked.txt"]),
        );
        expect(manifest.status).toBe("running");
        expect(fs.existsSync(path.join(fixture.runRoot, "logs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellCodexAvailable)(
    "records sync events when logging is enabled",
    () => {
      const fixture = createFixture({ git: true, manifest: true });
      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-RunId", fixture.runId, "--version"],
          fixture.root,
          getPowerShellCodexPath(),
        );
        const logFiles = fs.readdirSync(path.join(fixture.runRoot, "logs"));
        const logPath = path.join(fixture.runRoot, "logs", logFiles[0] ?? "");
        const log = fs.readFileSync(logPath, "utf8");

        expect(result.status).toBe(0);
        expect(log).toContain('"event":"manifest_sync_start"');
        expect(log).toContain('"event":"manifest_sync_success"');
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellCodexAvailable)(
    "continues after collector failure and returns its failure for a successful Codex process",
    () => {
      const fixture = createFixture({ git: false, manifest: true });
      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-RunId", fixture.runId, "--version"],
          fixture.root,
          getPowerShellCodexPath(),
        );
        const logPath = path.join(
          fixture.runRoot,
          "logs",
          fs.readdirSync(path.join(fixture.runRoot, "logs"))[0] ?? "",
        );
        const log = fs.readFileSync(logPath, "utf8");

        expect(result.status).toBe(1);
        expect(`${result.stdout}${result.stderr}`).toMatch(/Manifest sync failed/i);
        expect(log).toContain('"event":"manifest_sync_failed"');
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellCodexAvailable)(
    "does not sync for PreflightOnly or PrintCommand",
    () => {
      for (const mode of ["-PreflightOnly", "-PrintCommand"]) {
        const fixture = createFixture({ git: true, manifest: true });
        try {
          const result = runPowerShell(
            path.join(fixture.root, "scripts", "codex-safe.ps1"),
            ["-SkipPreflight", mode, "-RunId", fixture.runId],
            fixture.root,
            getPowerShellCodexPath(),
          );
          const manifest = fs.readFileSync(fixture.manifestPath, "utf8");
          const logPath = path.join(
            fixture.runRoot,
            "logs",
            fs.readdirSync(path.join(fixture.runRoot, "logs"))[0] ?? "",
          );
          const log = fs.readFileSync(logPath, "utf8");

          expect(result.status).toBe(0);
          expect(manifest).toContain('"changed_files":["existing.txt"]');
          expect(log).not.toContain("manifest_sync_");
        } finally {
          removeFixture(fixture);
        }
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellCodexAvailable)(
    "keeps RunId-less ad-hoc execution without manifest sync",
    () => {
      const fixture = createFixture({ git: true, manifest: false });
      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-NoLog", "--version"],
          fixture.root,
          getPowerShellCodexPath(),
        );

        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(fixture.root, ".codex", "runs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!bashCodexAvailable)(
    "syncs an existing manifest through the Bash wrapper when Bash Codex is available",
    () => {
      const fixture = createFixture({ git: true, manifest: true });
      try {
        const result = runBash(
          path.join(fixture.root, "scripts", "codex-safe.sh"),
          ["--skip-preflight", "--no-log", "--run-id", fixture.runId, "--version"],
          fixture.root,
          "codex",
        );
        const manifest = JSON.parse(fs.readFileSync(fixture.manifestPath, "utf8")) as {
          changed_files: string[];
          status: string;
        };

        expect(result.status).toBe(0);
        expect(manifest.changed_files).toEqual(
          expect.arrayContaining(["existing.txt", "tracked.txt"]),
        );
        expect(manifest.status).toBe("running");
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );
});
