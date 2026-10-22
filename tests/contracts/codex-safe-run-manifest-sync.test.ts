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
const bashRunsInWsl =
  process.platform === "win32" &&
  spawnSync("bash", ["-c", "uname -s"], { encoding: "utf8" }).stdout.trim().startsWith("Linux");

function toBashPath(value: string) {
  const normalized = value.replaceAll("\\", "/");
  const drivePath = /^([A-Za-z]):\/(.*)$/.exec(normalized);
  if (!bashRunsInWsl || !drivePath) {
    return normalized;
  }
  return `/mnt/${drivePath[1]?.toLowerCase()}/${drivePath[2]}`;
}

function quoteBashArgument(value: string) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

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

function runBash(
  wrapperPath: string,
  args: string[],
  cwd = repoRoot,
  codexPath?: string,
  envOverrides: Record<string, string> = {},
) {
  const relativeWrapperPath = path.relative(cwd, wrapperPath).replaceAll("\\", "/");
  const bashWrapperPath = relativeWrapperPath.startsWith(".")
    ? relativeWrapperPath
    : `./${relativeWrapperPath}`;
  const shellEnvironment = {
    ...(codexPath ? { CODEX_BIN: toBashPath(codexPath) } : {}),
    ...envOverrides,
  };
  if (bashRunsInWsl && Object.keys(shellEnvironment).length > 0) {
    const launcherPath = path.join(cwd, ".codex-safe-test-launcher.sh");
    const environmentExports = Object.entries(shellEnvironment)
      .map(([name, value]) => `export ${name}=${quoteBashArgument(value)}`)
      .join("\n");
    fs.writeFileSync(
      launcherPath,
      `#!/usr/bin/env bash\nexport PATH=${quoteBashArgument(toBashPath(path.dirname(wrapperPath)))}:"$PATH"\n${environmentExports}\nexec bash ${quoteBashArgument(bashWrapperPath)} "$@"\n`,
      "utf8",
    );
    fs.chmodSync(launcherPath, 0o755);
    const relativeLauncherPath = path.relative(cwd, launcherPath).replaceAll("\\", "/");
    return spawnSync("bash", [relativeLauncherPath, ...args], { cwd, encoding: "utf8" });
  }
  return spawnSync("bash", [bashWrapperPath, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...shellEnvironment,
    },
  });
}

function createFakeCodex(root: string): string {
  const fakeCodexPath = path.join(root, "fake-codex");
  fs.writeFileSync(
    fakeCodexPath,
    `#!/usr/bin/env bash
set -u

args=("$@")
command_start=-1
for index in "\${!args[@]}"; do
  if [[ "\${args[$index]}" == "--" ]]; then
    command_start=$((index + 1))
  fi
done
if (( command_start < 0 )); then
  echo "Missing execpolicy command separator" >&2
  exit 64
fi
command=("\${args[@]:command_start}")
command_text="\${command[*]}"

previous_calls=0
if [[ -f "$CODEX_FAKE_CALLS" ]]; then
  while IFS= read -r _; do
    previous_calls=$((previous_calls + 1))
  done < "$CODEX_FAKE_CALLS"
fi
{
  printf '['
  separator=""
  for argument in "\${command[@]}"; do
    printf '%s"%s"' "$separator" "$argument"
    separator=,
  done
  printf ']\\n'
} >> "$CODEX_FAKE_CALLS"

mode="\${CODEX_FAKE_MODE:-success}"
if [[ "$mode" == "mismatch-second" && "$previous_calls" == 1 ]]; then
  printf '{"decision":"prompt"}'
  exit 0
fi
if [[ "$mode" == "fixed-response" ]]; then
  printf '%s' "\${CODEX_FAKE_RESPONSE:-}"
  exit 0
fi

case "$command_text" in
  "git status"|"rg --files docs"|"git switch feature/safe"|"gh pr create --title test"|"gh pr edit 123"|"gh pr checks 123"|"git add ."|"python -c print(1)"|"python -") decision="allow" ;;
  "git checkout feature/safe"|"git merge main"|"git merge --abort"|"git rebase --abort"|"git branch -d old-feature"|"git branch --delete old-feature"|"git branch -vd old-feature"|"git branch -dv old-feature"|"git branch -v -d old-feature"|"gh api /repos/example/repo/issues"|"gh pr merge 123"|"gh pr close 123"|"gh issue close 123"|"gh release create v1"|"gh release delete v1"|"gh repo delete example/repo"|"docker ps") decision="prompt" ;;
  "git reset --hard HEAD~1"|"terraform destroy -auto-approve"|"rm file.txt"|"Remove-Item file.txt"|"git rm file.txt") decision="forbidden" ;;
  *)
    echo "Unmapped synthetic execpolicy command" >&2
    exit 64
    ;;
esac

if [[ "$command_text" == "git switch feature/safe" ]]; then
  printf '{"matchedRules":[]}'
elif [[ "$command_text" == "git status" ]]; then
  printf '{"matchedRules":[],"decision":"%s"}' "$decision"
elif [[ "$command_text" == "rg --files docs" ]]; then
  printf '{\\n  "matchedRules": [],\\n  "decision": "%s"\\n}' "$decision"
else
  printf '{"matchedRules":[{}],"decision":"%s"}' "$decision"
fi
`,
    "utf8",
  );
  fs.chmodSync(fakeCodexPath, 0o755);
  return fakeCodexPath;
}

function hasPowerShellRuntime() {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", "exit 0"], {
    encoding: "utf8",
    timeout: 5_000,
  });
  return result.status === 0 && !result.error;
}

function hasBashRuntime() {
  const result = spawnSync("bash", ["-c", "exit 0"], {
    encoding: "utf8",
    timeout: 5_000,
  });
  return result.status === 0 && !result.error;
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
      timeout: 5_000,
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
  if (bashRunsInWsl) {
    const nodeShimPath = path.join(root, "scripts", "node");
    fs.writeFileSync(nodeShimPath, '#!/usr/bin/env bash\nexec node.exe "$@"\n', "utf8");
    fs.chmodSync(nodeShimPath, 0o755);
  }
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
  // Windows and WSL can briefly keep the fixture directory busy after Bash exits.
  const waitBuffer = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  for (let retry = 0; ; retry += 1) {
    try {
      fs.rmSync(fixture.root, { recursive: true, force: true });
      return;
    } catch (error) {
      if (
        !new Set(["EPERM", "EBUSY"]).has((error as NodeJS.ErrnoException).code ?? "") ||
        retry >= 2
      ) {
        throw error;
      }
      Atomics.wait(waitBuffer, 0, 0, 2_500);
    }
  }
}

function fixtureBashPath(fixture: Fixture, filePath: string) {
  return path.relative(fixture.root, filePath).replaceAll("\\", "/");
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

const powerShellRuntimeAvailable = hasPowerShellRuntime();
const bashRuntimeAvailable = hasBashRuntime();
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

  it.skipIf(!powerShellRuntimeAvailable)(
    "PowerShell: fails before creating logs or a directory for an unknown RunId",
    () => {
      const runId = missingRunId();
      const runPath = path.join(repoRoot, ".codex", "runs", runId);
      const powerShell = runPowerShell(powerShellWrapperPath, [
        "-SkipPreflight",
        "-NoLog",
        "-RunId",
        runId,
        "--version",
      ]);

      expect(powerShell.status).not.toBe(0);
      expect(`${powerShell.stdout ?? ""}${powerShell.stderr ?? ""}`).toContain(
        "Run directory not found",
      );
      expect(fs.existsSync(runPath)).toBe(false);
    },
    runtimeTestTimeout,
  );

  it.skipIf(!bashRuntimeAvailable)(
    "Bash: fails before creating logs or a directory for an unknown RunId",
    () => {
      const runId = missingRunId();
      const runPath = path.join(repoRoot, ".codex", "runs", runId);
      const bash = runBash(bashWrapperPath, [
        "--skip-preflight",
        "--no-log",
        "--run-id",
        runId,
        "--version",
      ]);

      expect(bash.status).not.toBe(0);
      expect(`${bash.stdout ?? ""}${bash.stderr ?? ""}`).toContain("Run directory not found");
      expect(fs.existsSync(runPath)).toBe(false);
    },
    runtimeTestTimeout,
  );

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

describe("Bash codex-safe execpolicy preflight contract", () => {
  it.each(["safe", "readonly"] as const)(
    "%s validates compact, whitespace, and implicit-allow JSON before printing success",
    (preset) => {
      const fixture = createFixture({ git: false, manifest: false });
      const fakeCodexPath = createFakeCodex(fixture.root);
      const callsPath = path.join(fixture.root, "execpolicy-calls.jsonl");
      const logPath = path.join(fixture.root, "codex-safe-events.jsonl");
      const callsArgument = fixtureBashPath(fixture, callsPath);
      const logArgument = fixtureBashPath(fixture, logPath);

      try {
        const result = runBash(
          path.join(fixture.root, "scripts", "codex-safe.sh"),
          ["--preset", preset, "--preflight-only", "--log-path", logArgument],
          fixture.root,
          fakeCodexPath,
          { CODEX_FAKE_CALLS: callsArgument },
        );
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
        const calls = fs
          .readFileSync(callsPath, "utf8")
          .trim()
          .split(/\r?\n/)
          .map((line) => JSON.parse(line) as string[]);
        const events = fs
          .readFileSync(logPath, "utf8")
          .trim()
          .split(/\r?\n/)
          .map((line) => (JSON.parse(line) as { event: string }).event);

        expect(result.stdout).toContain("Preflight OK. Rules validated against smoke tests.");
        expect(calls).toContainEqual(["git", "switch", "feature/safe"]);
        expect(events).toContain("preflight_ok");
        expect(events).not.toContain("preflight_failed");
      } finally {
        removeFixture(fixture);
      }
    },
  );

  it("fails immediately on an intermediate mismatch and records failure without success", () => {
    const fixture = createFixture({ git: false, manifest: false });
    const fakeCodexPath = createFakeCodex(fixture.root);
    const callsPath = path.join(fixture.root, "execpolicy-calls.jsonl");
    const logPath = path.join(fixture.root, "codex-safe-events.jsonl");
    const callsArgument = fixtureBashPath(fixture, callsPath);
    const logArgument = fixtureBashPath(fixture, logPath);

    try {
      const result = runBash(
        path.join(fixture.root, "scripts", "codex-safe.sh"),
        ["--preset", "readonly", "--preflight-only", "--log-path", logArgument],
        fixture.root,
        fakeCodexPath,
        { CODEX_FAKE_CALLS: callsArgument, CODEX_FAKE_MODE: "mismatch-second" },
      );
      const calls = fs
        .readFileSync(callsPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => JSON.parse(line) as string[]);
      const events = fs
        .readFileSync(logPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => (JSON.parse(line) as { event: string }).event);

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain("Preflight OK");
      expect(calls).toHaveLength(2);
      expect(events).toContain("preflight_failed");
      expect(events).not.toContain("preflight_ok");
    } finally {
      removeFixture(fixture);
    }
  });

  it.each([
    ["invalid JSON", "not-json"],
    ["missing decision with matched rules", '{"matchedRules":[{}]}'],
    ["missing decision and matchedRules", '{"other":[]}'],
    ["unknown decision", '{"decision":"unknown","matchedRules":[]}'],
    ["empty decision", '{"decision":"","matchedRules":[]}'],
  ])("fails closed for %s", (_label, response) => {
    const fixture = createFixture({ git: false, manifest: false });
    const fakeCodexPath = createFakeCodex(fixture.root);
    const callsPath = path.join(fixture.root, "execpolicy-calls.jsonl");
    const logPath = path.join(fixture.root, "codex-safe-events.jsonl");
    const callsArgument = fixtureBashPath(fixture, callsPath);
    const logArgument = fixtureBashPath(fixture, logPath);

    try {
      const result = runBash(
        path.join(fixture.root, "scripts", "codex-safe.sh"),
        ["--preset", "readonly", "--preflight-only", "--log-path", logArgument],
        fixture.root,
        fakeCodexPath,
        {
          CODEX_FAKE_CALLS: callsArgument,
          CODEX_FAKE_MODE: "fixed-response",
          CODEX_FAKE_RESPONSE: response,
        },
      );
      const calls = fs.readFileSync(callsPath, "utf8").trim().split(/\r?\n/);
      const events = fs
        .readFileSync(logPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => (JSON.parse(line) as { event: string }).event);

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain("Preflight OK");
      expect(calls).toHaveLength(1);
      expect(events).toContain("preflight_failed");
      expect(events).not.toContain("preflight_ok");
    } finally {
      removeFixture(fixture);
    }
  });
});
