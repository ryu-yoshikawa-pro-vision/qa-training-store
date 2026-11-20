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

function runPowerShell(
  wrapperPath: string,
  args: string[],
  cwd = repoRoot,
  codexPath?: string,
  envOverrides: Record<string, string> = {},
) {
  return spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", wrapperPath, ...args],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        ...(codexPath ? { CODEX_BIN: codexPath } : {}),
        ...envOverrides,
      },
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

if [[ "$command_text" == "git status" && -n "\${CODEX_FAKE_STDERR_WARNING:-}" ]]; then
  printf '%s\n' "\${CODEX_FAKE_STDERR_WARNING}" >&2
fi

mode="\${CODEX_FAKE_MODE:-success}"
if [[ "$mode" == "mismatch-second" && "$previous_calls" == 1 ]]; then
  printf '{"decision":"prompt"}'
  exit 0
fi
if [[ "$mode" == "fixed-response" ]]; then
  printf '%s' "\${CODEX_FAKE_RESPONSE:-}"
  exit 0
fi
if [[ "$mode" == "failure-with-stdout" ]]; then
  printf '%s' "\${CODEX_FAKE_RESPONSE:-Synthetic execpolicy stdout diagnostic}"
  exit 23
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

function createCodexInvocationProbe(root: string) {
  const markerPath = path.join(root, "codex-invoked.txt");
  const bashPath = path.join(root, "codex-probe.sh");
  fs.writeFileSync(
    bashPath,
    '#!/usr/bin/env bash\nprintf called > "$CODEX_INVOCATION_MARKER"\n',
    "utf8",
  );
  fs.chmodSync(bashPath, 0o755);

  const powerShellPath = path.join(root, "codex-probe.cmd");
  fs.writeFileSync(
    powerShellPath,
    '@echo off\r\necho called> "%CODEX_INVOCATION_MARKER%"\r\nexit /b 0\r\n',
    "utf8",
  );

  return { markerPath, bashPath, powerShellPath };
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
  const runRoot = path.join(root, "runs", runId);
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
  // WSL can briefly keep a Windows-mounted working directory busy after Bash exits.
  const waitBuffer = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  for (let retry = 0; ; retry += 1) {
    try {
      fs.rmSync(fixture.root, { recursive: true, force: true });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EPERM" || retry >= 2) {
        throw error;
      }
      Atomics.wait(waitBuffer, 0, 0, 2_500);
    }
  }
}

function fixtureBashPath(fixture: Fixture, filePath: string) {
  return path.relative(fixture.root, filePath).replaceAll("\\", "/");
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
      expect(source).toContain("Ambiguous Run ID exists in both runs/");
      expect(source).toContain("manifest_sync_start");
      expect(source).toContain("manifest_sync_success");
      expect(source).toContain("manifest_sync_failed");
      expect(source).toContain("manifest_sync_skipped");
      expect(source).toContain("manifest_not_found");
      expect(source).toContain("run_id_not_provided");
    }

    expect(powerShell).toContain("-RefreshGitChangedFiles");
    expect(powerShell).toContain('-RunsRoot (Join-Path $repoRoot "runs")');
    expect(powerShell).toContain('foreach ($name in @("run.json", "evaluation.json"))');
    expect(bash).toContain("--refresh-git-changed-files");
    expect(bash).toContain('--runs-root "$repo_root/runs"');
    expect(bash).toContain('"$run_root/evaluation.json"');
    expect(powerShell).toContain('Join-Path $repoRoot "scripts\\collect-run-artifacts.ps1"');
    expect(powerShell).toContain("$collectorExit = 1");
    expect(powerShell).toContain("catch");
    expect(bash).toContain('bash "$repo_root/scripts/collect-run-artifacts.sh"');
    expect(bash).toContain('if bash "$repo_root/scripts/collect-run-artifacts.sh"');
    expect(bash).toContain("collector_exit=$?");
    expect(powerShell).not.toContain("Stop Hook");
    expect(bash).not.toContain("Stop Hook");
    expect(powerShell).toContain('Join-Path $RepoRoot "logs"');
    expect(powerShell).toContain('Join-Path $RepoRoot (Join-Path "runs"');
    expect(bash).toContain('local logs_dir="$repo_root/logs"');
    expect(bash).toContain('logs_dir="$repo_root/runs/$run_id/logs"');
  });

  it.skipIf(!bashRuntimeAvailable)(
    "Bash: defaults to root logs without a Run ID and Run-local logs with one",
    () => {
      const noRun = createFixture({ git: false, manifest: false });
      const noRunFakeCodex = createFakeCodex(noRun.root);
      const noRunCallsPath = path.join(noRun.root, "execpolicy-calls.jsonl");
      try {
        const noRunResult = runBash(
          path.join(noRun.root, "scripts", "codex-safe.sh"),
          ["--preflight-only"],
          noRun.root,
          noRunFakeCodex,
          {
            CODEX_FAKE_CALLS: fixtureBashPath(noRun, noRunCallsPath),
            CODEX_FAKE_STDERR_WARNING: "Codex PATH alias warning",
          },
        );
        const rootLogs = path.join(noRun.root, "logs");
        const rootLogName = fs
          .readdirSync(rootLogs)
          .find((name) => /^codex-safe-\d{8}\.jsonl$/.test(name));

        expect(noRunResult.status, `${noRunResult.stdout}\n${noRunResult.stderr}`).toBe(0);
        expect(noRunResult.stderr).toContain("Codex PATH alias warning");
        expect(rootLogName).toBeDefined();
        expect(fs.existsSync(path.join(noRun.root, ".codex", "logs"))).toBe(false);
        expect(fs.readFileSync(path.join(rootLogs, rootLogName!), "utf8")).toContain(
          "preflight_ok",
        );
      } finally {
        removeFixture(noRun);
      }

      const withRun = createFixture({ git: false, manifest: false, runDirectory: true });
      const withRunFakeCodex = createFakeCodex(withRun.root);
      const withRunCallsPath = path.join(withRun.root, "execpolicy-calls.jsonl");
      try {
        const result = runBash(
          path.join(withRun.root, "scripts", "codex-safe.sh"),
          ["--preflight-only", "--run-id", withRun.runId],
          withRun.root,
          withRunFakeCodex,
          { CODEX_FAKE_CALLS: fixtureBashPath(withRun, withRunCallsPath) },
        );
        const runLogs = path.join(withRun.runRoot, "logs");
        const runLogName = fs
          .readdirSync(runLogs)
          .find((name) => /^codex-safe-\d{8}\.jsonl$/.test(name));

        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
        expect(runLogName).toBeDefined();
        expect(fs.existsSync(path.join(withRun.root, "logs"))).toBe(false);
      } finally {
        removeFixture(withRun);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellRuntimeAvailable)(
    "PowerShell: defaults to root logs without a Run ID and Run-local logs with one",
    () => {
      const noRun = createFixture({ git: false, manifest: false });
      const noRunProbe = createCodexInvocationProbe(noRun.root);
      try {
        const result = runPowerShell(
          path.join(noRun.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-PreflightOnly"],
          noRun.root,
          noRunProbe.powerShellPath,
          { CODEX_INVOCATION_MARKER: noRunProbe.markerPath },
        );
        const logs = path.join(noRun.root, "logs");
        const logName = fs.readdirSync(logs).find((name) => /^codex-safe-\d{8}\.jsonl$/.test(name));

        expect(result.status, `${result.stdout ?? ""}\n${result.stderr ?? ""}`).toBe(0);
        expect(logName).toBeDefined();
        expect(fs.readFileSync(path.join(logs, logName!), "utf8")).toContain("preflight_only_exit");
        expect(fs.existsSync(path.join(noRun.root, ".codex", "logs"))).toBe(false);
        expect(fs.existsSync(noRunProbe.markerPath)).toBe(false);
      } finally {
        removeFixture(noRun);
      }

      const withRun = createFixture({ git: false, manifest: false, runDirectory: true });
      const withRunProbe = createCodexInvocationProbe(withRun.root);
      try {
        const result = runPowerShell(
          path.join(withRun.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-PreflightOnly", "-RunId", withRun.runId],
          withRun.root,
          withRunProbe.powerShellPath,
          { CODEX_INVOCATION_MARKER: withRunProbe.markerPath },
        );
        const logs = path.join(withRun.runRoot, "logs");
        const logName = fs.readdirSync(logs).find((name) => /^codex-safe-\d{8}\.jsonl$/.test(name));

        expect(result.status, `${result.stdout ?? ""}\n${result.stderr ?? ""}`).toBe(0);
        expect(logName).toBeDefined();
        expect(fs.readFileSync(path.join(logs, logName!), "utf8")).toContain("preflight_only_exit");
        expect(fs.existsSync(path.join(withRun.root, "logs"))).toBe(false);
        expect(fs.existsSync(withRunProbe.markerPath)).toBe(false);
      } finally {
        removeFixture(withRun);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellRuntimeAvailable)(
    "PowerShell: fails before creating logs or a directory for an unknown RunId",
    () => {
      const fixture = createFixture({ git: false, manifest: false });
      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-RunId", fixture.runId, "--version"],
          fixture.root,
        );

        expect(result.status).not.toBe(0);
        expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toMatch(
          /Run directory not found|Run root is missing/,
        );
        expect(fs.existsSync(fixture.runRoot)).toBe(false);
        expect(fs.existsSync(path.join(fixture.root, ".codex", "logs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!bashRuntimeAvailable)(
    "Bash: fails before creating logs or a directory for an unknown RunId",
    () => {
      const fixture = createFixture({ git: false, manifest: false });
      try {
        const result = runBash(
          path.join(fixture.root, "scripts", "codex-safe.sh"),
          ["--skip-preflight", "--run-id", fixture.runId, "--version"],
          fixture.root,
        );

        expect(result.status).not.toBe(0);
        expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toMatch(
          /Run directory not found|Run root is missing/,
        );
        expect(fs.existsSync(fixture.runRoot)).toBe(false);
        expect(fs.existsSync(path.join(fixture.root, ".codex", "logs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellRuntimeAvailable)(
    "PowerShell: does not fall back to or update a matching legacy Run",
    () => {
      const fixture = createFixture({ git: false, manifest: false });
      const legacyRunRoot = path.join(fixture.root, ".codex", "runs", fixture.runId);
      const manifestPath = path.join(legacyRunRoot, "run.json");
      const manifestContents = '{"run_id":"legacy","status":"preserve"}\n';
      fs.mkdirSync(legacyRunRoot, { recursive: true });
      fs.writeFileSync(manifestPath, manifestContents, "utf8");

      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-RunId", fixture.runId, "--version"],
          fixture.root,
        );

        expect(result.status).not.toBe(0);
        expect(fs.existsSync(fixture.runRoot)).toBe(false);
        expect(fs.readFileSync(manifestPath, "utf8")).toBe(manifestContents);
        expect(fs.existsSync(path.join(fixture.root, ".codex", "logs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!bashRuntimeAvailable)(
    "Bash: does not fall back to or update a matching legacy Run",
    () => {
      const fixture = createFixture({ git: false, manifest: false });
      const legacyRunRoot = path.join(fixture.root, ".codex", "runs", fixture.runId);
      const manifestPath = path.join(legacyRunRoot, "run.json");
      const manifestContents = '{"run_id":"legacy","status":"preserve"}\n';
      fs.mkdirSync(legacyRunRoot, { recursive: true });
      fs.writeFileSync(manifestPath, manifestContents, "utf8");

      try {
        const result = runBash(
          path.join(fixture.root, "scripts", "codex-safe.sh"),
          ["--skip-preflight", "--run-id", fixture.runId, "--version"],
          fixture.root,
        );

        expect(result.status).not.toBe(0);
        expect(fs.existsSync(fixture.runRoot)).toBe(false);
        expect(fs.readFileSync(manifestPath, "utf8")).toBe(manifestContents);
        expect(fs.existsSync(path.join(fixture.root, ".codex", "logs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellRuntimeAvailable)(
    "PowerShell: rejects a Run ID present in both roots before invoking Codex",
    () => {
      const fixture = createFixture({ git: false, manifest: false, runDirectory: true });
      const legacyRunRoot = path.join(fixture.root, ".codex", "runs", fixture.runId);
      const newManifestPath = path.join(fixture.runRoot, "run.json");
      const legacyManifestPath = path.join(legacyRunRoot, "run.json");
      const newManifestContents = '{"run_id":"new","status":"preserve"}\n';
      const legacyManifestContents = '{"run_id":"legacy","status":"preserve"}\n';
      fs.mkdirSync(legacyRunRoot, { recursive: true });
      fs.writeFileSync(newManifestPath, newManifestContents, "utf8");
      fs.writeFileSync(legacyManifestPath, legacyManifestContents, "utf8");
      const probe = createCodexInvocationProbe(fixture.root);

      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-RunId", fixture.runId, "--version"],
          fixture.root,
          probe.powerShellPath,
          { CODEX_INVOCATION_MARKER: probe.markerPath },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Ambiguous Run ID");
        expect(fs.existsSync(probe.markerPath)).toBe(false);
        expect(fs.existsSync(path.join(fixture.runRoot, "logs"))).toBe(false);
        expect(fs.readFileSync(newManifestPath, "utf8")).toBe(newManifestContents);
        expect(fs.readFileSync(legacyManifestPath, "utf8")).toBe(legacyManifestContents);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!bashRuntimeAvailable)(
    "Bash: rejects a Run ID present in both roots before invoking Codex",
    () => {
      const fixture = createFixture({ git: false, manifest: false, runDirectory: true });
      const legacyRunRoot = path.join(fixture.root, ".codex", "runs", fixture.runId);
      const newManifestPath = path.join(fixture.runRoot, "run.json");
      const legacyManifestPath = path.join(legacyRunRoot, "run.json");
      const newManifestContents = '{"run_id":"new","status":"preserve"}\n';
      const legacyManifestContents = '{"run_id":"legacy","status":"preserve"}\n';
      fs.mkdirSync(legacyRunRoot, { recursive: true });
      fs.writeFileSync(newManifestPath, newManifestContents, "utf8");
      fs.writeFileSync(legacyManifestPath, legacyManifestContents, "utf8");
      const probe = createCodexInvocationProbe(fixture.root);

      try {
        const result = runBash(
          path.join(fixture.root, "scripts", "codex-safe.sh"),
          ["--skip-preflight", "--run-id", fixture.runId, "--version"],
          fixture.root,
          probe.bashPath,
          { CODEX_INVOCATION_MARKER: toBashPath(probe.markerPath) },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Ambiguous Run ID");
        expect(fs.existsSync(probe.markerPath)).toBe(false);
        expect(fs.existsSync(path.join(fixture.runRoot, "logs"))).toBe(false);
        expect(fs.readFileSync(newManifestPath, "utf8")).toBe(newManifestContents);
        expect(fs.readFileSync(legacyManifestPath, "utf8")).toBe(legacyManifestContents);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellRuntimeAvailable)(
    "PowerShell: rejects a Run-local logs reparse point before logging or invoking Codex",
    () => {
      const fixture = createFixture({ git: false, manifest: false, runDirectory: true });
      const outsideRoot = path.join(fixture.root, "outside-logs");
      const logsPath = path.join(fixture.runRoot, "logs");
      const sentinelPath = path.join(outsideRoot, "sentinel.txt");
      const sentinelContents = "external sentinel remains unchanged\n";
      fs.mkdirSync(outsideRoot, { recursive: true });
      fs.writeFileSync(sentinelPath, sentinelContents, "utf8");
      fs.symlinkSync(outsideRoot, logsPath, process.platform === "win32" ? "junction" : "dir");
      const probe = createCodexInvocationProbe(fixture.root);

      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-RunId", fixture.runId, "--version"],
          fixture.root,
          probe.powerShellPath,
          { CODEX_INVOCATION_MARKER: probe.markerPath },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Run-local output path");
        expect(fs.existsSync(probe.markerPath)).toBe(false);
        expect(fs.readFileSync(sentinelPath, "utf8")).toBe(sentinelContents);
        expect(fs.readdirSync(outsideRoot)).toEqual(["sentinel.txt"]);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!bashRuntimeAvailable)(
    "Bash: rejects a Run-local logs junction before logging or invoking Codex",
    () => {
      const fixture = createFixture({ git: false, manifest: false, runDirectory: true });
      const outsideRoot = path.join(fixture.root, "outside-logs");
      const logsPath = path.join(fixture.runRoot, "logs");
      const sentinelPath = path.join(outsideRoot, "sentinel.txt");
      const sentinelContents = "external sentinel remains unchanged\n";
      fs.mkdirSync(outsideRoot, { recursive: true });
      fs.writeFileSync(sentinelPath, sentinelContents, "utf8");
      fs.symlinkSync(outsideRoot, logsPath, process.platform === "win32" ? "junction" : "dir");
      const probe = createCodexInvocationProbe(fixture.root);

      try {
        const result = runBash(
          path.join(fixture.root, "scripts", "codex-safe.sh"),
          ["--skip-preflight", "--run-id", fixture.runId, "--version"],
          fixture.root,
          probe.bashPath,
          { CODEX_INVOCATION_MARKER: toBashPath(probe.markerPath) },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Run-local directory");
        expect(fs.existsSync(probe.markerPath)).toBe(false);
        expect(fs.readFileSync(sentinelPath, "utf8")).toBe(sentinelContents);
        expect(fs.readdirSync(outsideRoot)).toEqual(["sentinel.txt"]);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!powerShellRuntimeAvailable)(
    "PowerShell: rejects a runs reparse point before logging",
    () => {
      const fixture = createFixture({ git: false, manifest: false });
      const outsideRunsRoot = path.join(fixture.root, "outside-runs");
      fs.mkdirSync(outsideRunsRoot, { recursive: true });
      fs.symlinkSync(outsideRunsRoot, path.join(fixture.root, "runs"), "junction");

      try {
        const result = runPowerShell(
          path.join(fixture.root, "scripts", "codex-safe.ps1"),
          ["-SkipPreflight", "-RunId", fixture.runId, "--version"],
          fixture.root,
        );

        expect(result.status).not.toBe(0);
        expect(fs.existsSync(path.join(outsideRunsRoot, fixture.runId))).toBe(false);
        expect(fs.existsSync(path.join(fixture.root, ".codex", "logs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
    },
    runtimeTestTimeout,
  );

  it.skipIf(!bashRuntimeAvailable)(
    "Bash: rejects a runs symlink before logging",
    () => {
      const fixture = createFixture({ git: false, manifest: false });
      const outsideRunsRoot = path.join(fixture.root, "outside-runs");
      fs.mkdirSync(outsideRunsRoot, { recursive: true });
      fs.symlinkSync(
        outsideRunsRoot,
        path.join(fixture.root, "runs"),
        process.platform === "win32" ? "junction" : "dir",
      );

      try {
        const result = runBash(
          path.join(fixture.root, "scripts", "codex-safe.sh"),
          ["--skip-preflight", "--run-id", fixture.runId, "--version"],
          fixture.root,
        );

        expect(result.status).not.toBe(0);
        expect(fs.existsSync(path.join(outsideRunsRoot, fixture.runId))).toBe(false);
        expect(fs.existsSync(path.join(fixture.root, ".codex", "logs"))).toBe(false);
      } finally {
        removeFixture(fixture);
      }
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

  it("preserves stdout diagnostics and fails closed when execpolicy exits nonzero", () => {
    const fixture = createFixture({ git: false, manifest: false });
    const fakeCodexPath = createFakeCodex(fixture.root);
    const callsPath = path.join(fixture.root, "execpolicy-calls.jsonl");
    const logPath = path.join(fixture.root, "codex-safe-events.jsonl");
    const callsArgument = fixtureBashPath(fixture, callsPath);
    const logArgument = fixtureBashPath(fixture, logPath);
    const stdoutDiagnostic = "Synthetic execpolicy stdout diagnostic";

    try {
      const result = runBash(
        path.join(fixture.root, "scripts", "codex-safe.sh"),
        ["--preset", "readonly", "--preflight-only", "--log-path", logArgument],
        fixture.root,
        fakeCodexPath,
        {
          CODEX_FAKE_CALLS: callsArgument,
          CODEX_FAKE_MODE: "failure-with-stdout",
          CODEX_FAKE_RESPONSE: stdoutDiagnostic,
        },
      );
      const calls = fs.readFileSync(callsPath, "utf8").trim().split(/\r?\n/);
      const events = fs
        .readFileSync(logPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => (JSON.parse(line) as { event: string }).event);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(stdoutDiagnostic);
      expect(result.stderr).toContain("codex execpolicy check failed");
      expect(`${result.stdout}${result.stderr}`).not.toContain("Preflight OK");
      expect(calls).toHaveLength(1);
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
