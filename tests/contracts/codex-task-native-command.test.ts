import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const taskScriptPath = path.join(repoRoot, "scripts", "codex-task.ps1");
const sanitizerLibraryPath = path.join(repoRoot, "scripts", "lib", "codex-artifact-sanitizer.mjs");
const sanitizerCliPath = path.join(repoRoot, "scripts", "sanitize-codex-artifacts.mjs");
const powerShellCommand = process.platform === "win32" ? "powershell.exe" : "pwsh";
const nativeStdoutMarker = "codex-task-native-stdout";
const nativeStderrMarker = "codex-task-native-stderr";
const verifyCommandTextStdoutMarker = "codex-task-verify-command-text-stdout";
const verifyCommandTextStderrMarker = "codex-task-verify-command-text-stderr";
const runId = "20990101-000000-JST";
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

function createBashCodexProbe(root: string) {
  const fakeCodexPath = path.join(root, "fake-bash-codex.sh");
  const markerPath = path.join(root, "codex-invoked.txt");
  fs.writeFileSync(
    fakeCodexPath,
    [
      "#!/usr/bin/env bash",
      'printf invoked > "$CODEX_INVOCATION_MARKER"',
      "output_file=",
      'while [ "$#" -gt 0 ]; do',
      '  if [ "$1" = "--output-last-message" ]; then output_file=$2; shift 2; else shift; fi',
      "done",
      'if [ -n "$output_file" ]; then printf \'{"ok":true}\\n\' > "$output_file"; fi',
      "exit 0",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.chmodSync(fakeCodexPath, 0o755);
  return { fakeCodexPath, markerPath };
}

function hasPowerShellRuntime() {
  const result = spawnSync(powerShellCommand, ["-NoProfile", "-Command", "exit 0"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  return result.status === 0 && !result.error;
}

function hasCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: process.platform === "win32",
  });
  return result.status === 0 && !result.error;
}

function getNativeCommandFunction() {
  const source = fs.readFileSync(taskScriptPath, "utf8");
  const startMarker = "function Invoke-NativeCommand {";
  const endMarker = 'if ($state.runtime -eq "host")';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  if (start < 0 || end < 0) {
    throw new Error("Unable to isolate Invoke-NativeCommand from codex-task.ps1");
  }

  return source.slice(start, end);
}

function getResolveRepoPathFunction() {
  const source = fs.readFileSync(taskScriptPath, "utf8");
  const startMarker = "function Resolve-RepoPath {";
  const endMarker = "function Convert-ToContainerPath {";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  if (start < 0 || end < 0) {
    throw new Error("Unable to isolate Resolve-RepoPath from codex-task.ps1");
  }

  return source.slice(start, end);
}

function getVerifyCommandFunction() {
  const source = fs.readFileSync(taskScriptPath, "utf8");
  const startMarker = "function Invoke-VerifyCommand {";
  const endMarker = "function Write-TaskLog {";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  if (start < 0 || end < 0) {
    throw new Error("Unable to isolate Invoke-VerifyCommand from codex-task.ps1");
  }

  return source.slice(start, end);
}

function encodePowerShell(script: string) {
  return Buffer.from(script, "utf16le").toString("base64");
}

function runVerifyProbe(commandText: string, root: string, includeDiagnostics = false) {
  const diagnostics = includeDiagnostics
    ? `
$probePath = Resolve-RepoPath -RepoRoot $repoRoot -Path $verifyCommand
$probeInfo = Get-Item -LiteralPath $probePath
[Console]::Out.WriteLine("FIXTURE_EXISTS={0}" -f (Test-Path -LiteralPath $probePath -PathType Leaf))
[Console]::Out.WriteLine("FIXTURE_LENGTH={0}" -f $probeInfo.Length)
[Console]::Out.WriteLine("FIXTURE_MODE={0}" -f $probeInfo.Mode)
if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
    [Console]::Out.WriteLine("FIXTURE_EXECUTABLE=True")
}
else {
    & test -x $probePath *> $null
    [Console]::Out.WriteLine("FIXTURE_EXECUTABLE={0}" -f ($LASTEXITCODE -eq 0))
}
$LASTEXITCODE = 0
& $probePath
$directSuccess = $?
$directExitCode = $LASTEXITCODE
[Console]::Out.WriteLine("DIRECT_LASTEXITCODE={0}" -f $directExitCode)
[Console]::Out.WriteLine("DIRECT_SUCCESS={0}" -f $directSuccess)
$helperResult = Invoke-NativeCommand -Command $probePath -CommandArgs @()
[Console]::Out.WriteLine("HELPER_TYPE={0}" -f $helperResult.GetType().FullName)
[Console]::Out.WriteLine("HELPER_COUNT={0}" -f @($helperResult).Count)
[Console]::Out.WriteLine("HELPER_VALUE={0}" -f $helperResult)
`
    : "";
  const script = `${getResolveRepoPathFunction()}
${getNativeCommandFunction()}
${getVerifyCommandFunction()}
$repoRoot = [System.Environment]::GetEnvironmentVariable("CODEX_VERIFY_PROBE_ROOT")
$verifyCommand = [System.Environment]::GetEnvironmentVariable("CODEX_VERIFY_PROBE_COMMAND")
[System.Environment]::SetEnvironmentVariable("CODEX_VERIFY_COMMAND", "codex-task-verify-restore")
${diagnostics}
$result = Invoke-VerifyCommand -CommandText $verifyCommand -RepoRoot $repoRoot
[Console]::Out.WriteLine("RESULT_TYPE={0}" -f $result.GetType().FullName)
[Console]::Out.WriteLine("RESULT_COUNT={0}" -f @($result).Count)
[Console]::Out.WriteLine("RESULT_VALUE={0}" -f $result)
[Console]::Out.WriteLine("RESTORED_VERIFY_COMMAND={0}" -f [System.Environment]::GetEnvironmentVariable("CODEX_VERIFY_COMMAND"))
`;

  return spawnSync(powerShellCommand, ["-NoProfile", "-EncodedCommand", encodePowerShell(script)], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      ...process.env,
      CODEX_VERIFY_PROBE_COMMAND: commandText,
      CODEX_VERIFY_PROBE_ROOT: root,
    },
    windowsHide: process.platform === "win32",
  });
}

function summarizeProbeOutput(value: string, root: string) {
  const normalizedRoot = root.replaceAll("\\", "/");
  const redacted = value
    .replaceAll(root, "<TEMP_ROOT>")
    .replaceAll(normalizedRoot, "<TEMP_ROOT>")
    .replaceAll(normalizedRoot.replaceAll("/", "\\"), "<TEMP_ROOT>");
  if (redacted.trim().length === 0) return JSON.stringify(redacted);
  return `<non-empty output redacted; ${redacted.length} characters>`;
}

function summarizeSpawnResult(
  result: {
    status: number | null;
    signal: NodeJS.Signals | null;
    error?: Error | null;
    stdout?: string;
    stderr?: string;
  },
  root: string,
) {
  return {
    status: result.status,
    signal: result.signal,
    error: result.error ? { code: "code" in result.error ? result.error.code : "unknown" } : null,
    stdout: summarizeProbeOutput(result.stdout ?? "", root),
    stderr: summarizeProbeOutput(result.stderr ?? "", root),
  };
}

function getDefaultExecutableDiagnostics(root: string) {
  const executablePath = path.join(root, "verify-default.exe");
  let fixture: { exists: boolean; mode?: string; executable: boolean; error?: string };
  try {
    const stat = fs.statSync(executablePath);
    fixture = {
      exists: true,
      mode: (stat.mode & 0o777).toString(8),
      executable: process.platform === "win32" || (stat.mode & 0o111) !== 0,
    };
  } catch (error) {
    fixture = {
      exists: false,
      executable: false,
      error: error instanceof Error && "code" in error ? String(error.code) : "unknown",
    };
  }

  const nodeDirect = spawnSync(executablePath, [], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: process.platform === "win32",
  });
  const shellDirect =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/c", `"${executablePath}"`], {
          cwd: root,
          encoding: "utf8",
          timeout: 10_000,
          windowsHide: true,
        })
      : spawnSync("bash", ["-c", 'exec "$1"', "codex-fixture", executablePath], {
          cwd: root,
          encoding: "utf8",
          timeout: 10_000,
        });

  return {
    fixture,
    nodeDirect: summarizeSpawnResult(nodeDirect, root),
    shellDirect: summarizeSpawnResult(shellDirect, root),
  };
}

type VerifyRuntimeFixture = {
  name: string;
  commandText: string;
  stdoutMarkers: string[];
  stderrMarker?: string;
  available: boolean;
};

function createVerifyRuntimeFixtures() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-task-verify-contract-"));
  const writeFixture = (name: string, contents: string) => {
    const fixturePath = path.join(root, name);
    fs.writeFileSync(fixturePath, contents, "utf8");
    return fixturePath;
  };

  const ps1Path = writeFixture(
    "verify.ps1",
    [
      "Write-Output 'codex-task-verify-ps1-stdout-1'",
      "Write-Output 'codex-task-verify-ps1-stdout-2'",
      "[Console]::Error.WriteLine('codex-task-verify-ps1-stderr')",
      "exit 0",
      "",
    ].join("\r\n"),
  );
  const cmdContents = [
    "@echo off",
    "echo codex-task-verify-cmd-stdout-1",
    "echo codex-task-verify-cmd-stdout-2",
    "echo codex-task-verify-cmd-stderr 1>&2",
    "exit /b 0",
    "",
  ].join("\r\n");
  const cmdPath = writeFixture("verify.cmd", cmdContents);
  const batPath = writeFixture("verify.bat", cmdContents.replace(/cmd/g, "bat"));
  const shPath = writeFixture(
    "verify.sh",
    [
      "#!/bin/sh",
      "printf '%s\\n' codex-task-verify-sh-stdout-1",
      "printf '%s\\n' codex-task-verify-sh-stdout-2",
      "printf '%s\\n' codex-task-verify-sh-stderr >&2",
      "exit 0",
      "",
    ].join("\n"),
  );

  if (process.platform !== "win32") {
    fs.chmodSync(shPath, 0o755);
  }

  const defaultPath = path.join(root, "verify-default.exe");
  const defaultStdoutMarkers =
    process.platform === "win32"
      ? []
      : [
          "codex-task-verify-native-executable-stdout-1",
          "codex-task-verify-native-executable-stdout-2",
        ];
  const defaultStderrMarker =
    process.platform === "win32" ? undefined : "codex-task-verify-native-executable-stderr";
  if (process.platform === "win32") {
    const defaultSource = path.join(
      process.env.SystemRoot ?? "C:\\Windows",
      "System32",
      "hostname.exe",
    );
    fs.copyFileSync(defaultSource, defaultPath);
  } else {
    fs.writeFileSync(
      defaultPath,
      [
        "#!/bin/sh",
        "printf '%s\\n' codex-task-verify-native-executable-stdout-1",
        "printf '%s\\n' codex-task-verify-native-executable-stdout-2",
        "printf '%s\\n' codex-task-verify-native-executable-stderr >&2",
        "exit 0",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.chmodSync(defaultPath, 0o755);
  }

  const commandText = [
    `Write-Output '${verifyCommandTextStdoutMarker}-1'`,
    `Write-Output '${verifyCommandTextStdoutMarker}-2'`,
    `Write-Error '${verifyCommandTextStderrMarker}'`,
    "exit 0",
  ].join("; ");

  const windowsPowerShellAvailable = process.platform === "win32" && hasPowerShellRuntime();
  const bashAvailable = process.platform !== "win32" && hasCommand("bash", ["-c", "exit 0"]);

  const fixtures: VerifyRuntimeFixture[] = [
    {
      name: ".ps1",
      commandText: ps1Path,
      stdoutMarkers: ["codex-task-verify-ps1-stdout-1", "codex-task-verify-ps1-stdout-2"],
      stderrMarker: "codex-task-verify-ps1-stderr",
      available: windowsPowerShellAvailable,
    },
    {
      name: ".cmd",
      commandText: cmdPath,
      stdoutMarkers: ["codex-task-verify-cmd-stdout-1", "codex-task-verify-cmd-stdout-2"],
      stderrMarker: "codex-task-verify-cmd-stderr",
      available: process.platform === "win32" && hasCommand("cmd.exe", ["/d", "/c", "exit 0"]),
    },
    {
      name: ".bat",
      commandText: batPath,
      stdoutMarkers: ["codex-task-verify-bat-stdout-1", "codex-task-verify-bat-stdout-2"],
      stderrMarker: "codex-task-verify-bat-stderr",
      available: process.platform === "win32" && hasCommand("cmd.exe", ["/d", "/c", "exit 0"]),
    },
    {
      name: ".sh",
      commandText: shPath,
      stdoutMarkers: ["codex-task-verify-sh-stdout-1", "codex-task-verify-sh-stdout-2"],
      stderrMarker: "codex-task-verify-sh-stderr",
      available: bashAvailable,
    },
    {
      name: "default executable",
      commandText: defaultPath,
      stdoutMarkers: defaultStdoutMarkers,
      ...(defaultStderrMarker ? { stderrMarker: defaultStderrMarker } : {}),
      available: true,
    },
    {
      name: "command text",
      commandText,
      stdoutMarkers: [`${verifyCommandTextStdoutMarker}-1`, `${verifyCommandTextStdoutMarker}-2`],
      stderrMarker: verifyCommandTextStderrMarker,
      available: windowsPowerShellAvailable,
    },
  ];

  return { root, fixtures };
}

function runNativeCommandProbe(exitCode: number) {
  const nativeCommandFunction = getNativeCommandFunction();
  const script = `${nativeCommandFunction}
$exitCode = [int]$env:CODEX_NATIVE_EXIT_CODE
if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
    $nativeCommand = "echo ${nativeStdoutMarker} & echo ${nativeStderrMarker} 1>&2 & exit /b $exitCode"
    $nativeArgs = @("/d", "/c", $nativeCommand)
    $command = "cmd.exe"
}
else {
    $nativeCommand = "printf '%s\\n' ${nativeStdoutMarker}; printf '%s\\n' ${nativeStderrMarker} >&2; exit $exitCode"
    $nativeArgs = @("-c", $nativeCommand)
    $command = "sh"
}
$result = Invoke-NativeCommand -Command $command -CommandArgs $nativeArgs
[Console]::Out.WriteLine("RESULT_TYPE={0}" -f $result.GetType().FullName)
[Console]::Out.WriteLine("RESULT_COUNT={0}" -f @($result).Count)
[Console]::Out.WriteLine("RESULT_VALUE={0}" -f $result)
`;

  return spawnSync(powerShellCommand, ["-NoProfile", "-EncodedCommand", encodePowerShell(script)], {
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, CODEX_NATIVE_EXIT_CODE: String(exitCode) },
    windowsHide: process.platform === "win32",
  });
}

type WrapperFixture = {
  root: string;
  wrapperPath: string;
  fakeCodexPath: string;
  outputPath: string;
  reportPath: string;
  logPath: string;
};

type WrapperRunOptions = {
  skipVerify?: boolean;
  verifyCommand?: string;
  recordRunManifest?: boolean;
  runId?: string;
  additionalArguments?: string[];
};

function createFakeCodex(root: string) {
  if (process.platform === "win32") {
    const fakeCodexPath = path.join(root, "fake-codex.cmd");
    const script = [
      "@echo off",
      `echo ${nativeStdoutMarker}`,
      `echo ${nativeStderrMarker} 1>&2`,
      'set "output_file="',
      ":parse_args",
      'if "%~1"=="" goto finish',
      'if "%~1"=="--output-last-message" (',
      '  set "output_file=%~2"',
      "  shift",
      "  shift",
      "  goto parse_args",
      ")",
      "shift",
      "goto parse_args",
      ":finish",
      'set "repo_root=%CODEX_TEST_ROOT:\\=/%"',
      'if "%CODEX_TEST_EXIT_CODE%"=="0" if defined output_file echo {"ok":"%repo_root%"}> "%output_file%"',
      "exit /b %CODEX_TEST_EXIT_CODE%",
      "",
    ].join("\r\n");
    fs.writeFileSync(fakeCodexPath, script, "utf8");
    return fakeCodexPath;
  }

  const fakeCodexPath = path.join(root, "fake-codex.sh");
  const script = [
    "#!/bin/sh",
    `printf '%s\\n' ${nativeStdoutMarker}`,
    `printf '%s\\n' ${nativeStderrMarker} >&2`,
    "output_file=",
    "exit_code=$(printenv CODEX_TEST_EXIT_CODE)",
    'while [ "$#" -gt 0 ]; do',
    '  if [ "$1" = "--output-last-message" ]; then',
    "    output_file=$2",
    "    shift 2",
    "  else",
    "    shift",
    "  fi",
    "done",
    'if [ "$exit_code" = "0" ] && [ -n "$output_file" ]; then',
    '  repo_root="$(printf "%s" "${CODEX_TEST_ROOT:?}" | tr "\\\\" "/")"',
    '  printf \'{"ok":"%s"}\\n\' "$repo_root" > "$output_file"',
    "fi",
    'exit "$exit_code"',
    "",
  ].join("\n");
  fs.writeFileSync(fakeCodexPath, script, "utf8");
  fs.chmodSync(fakeCodexPath, 0o755);
  return fakeCodexPath;
}

function createWrapperFixture({ manifest = false }: { manifest?: boolean } = {}): WrapperFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-task-native-contract-"));
  const scriptsDir = path.join(root, "scripts");
  const libDir = path.join(scriptsDir, "lib");
  fs.mkdirSync(libDir, { recursive: true });

  const wrapperPath = path.join(scriptsDir, "codex-task.ps1");
  fs.copyFileSync(taskScriptPath, wrapperPath);
  fs.copyFileSync(sanitizerLibraryPath, path.join(libDir, "codex-artifact-sanitizer.mjs"));
  fs.copyFileSync(sanitizerCliPath, path.join(scriptsDir, "sanitize-codex-artifacts.mjs"));

  const gitInit = spawnSync("git", ["init", "-q"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: process.platform === "win32",
  });
  if (gitInit.error || gitInit.status !== 0) {
    throw new Error(
      `Unable to initialize wrapper fixture repository: ${gitInit.stderr ?? gitInit.error}`,
    );
  }

  if (manifest) {
    for (const relativePath of [
      "scripts/collect-run-artifacts.ps1",
      "scripts/collect-run-artifacts.py",
    ]) {
      fs.copyFileSync(path.join(repoRoot, relativePath), path.join(root, relativePath));
    }
  }

  return {
    root,
    wrapperPath,
    fakeCodexPath: createFakeCodex(root),
    outputPath: path.join(root, "output.json"),
    reportPath: path.join(root, "report.json"),
    logPath: path.join(root, "task.jsonl"),
  };
}

function runWrapper(
  fixture: WrapperFixture,
  codexExitCode: number,
  options: WrapperRunOptions = {},
) {
  const wrapperArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    fixture.wrapperPath,
    "-SkipPreflight",
  ];
  if (options.skipVerify ?? true) {
    wrapperArgs.push("-SkipVerify");
  }
  if (options.verifyCommand !== undefined) {
    wrapperArgs.push("-VerifyCommand", options.verifyCommand);
  }
  if (options.recordRunManifest) {
    wrapperArgs.push("-RecordRunManifest");
  }
  if (options.runId !== undefined) {
    fs.mkdirSync(path.join(fixture.root, "runs", options.runId), { recursive: true });
    wrapperArgs.push("-RunId", options.runId);
  }
  wrapperArgs.push(
    "-OutputFile",
    fixture.outputPath,
    "-ReportPath",
    fixture.reportPath,
    "-LogPath",
    fixture.logPath,
  );
  wrapperArgs.push(...(options.additionalArguments ?? []), "native command contract");

  const result = spawnSync(powerShellCommand, wrapperArgs, {
    cwd: fixture.root,
    encoding: "utf8",
    timeout: process.platform === "win32" ? 60_000 : 30_000,
    env: {
      ...process.env,
      CODEX_BIN: fixture.fakeCodexPath,
      CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
      CODEX_TEST_EXIT_CODE: String(codexExitCode),
    },
    windowsHide: process.platform === "win32",
  });

  const report = JSON.parse(fs.readFileSync(fixture.reportPath, "utf8")) as {
    codex_exit_code: unknown;
    verify_exit_code: unknown;
    status: string;
  };
  const log = fs.readFileSync(fixture.logPath, "utf8");
  const manifest =
    options.recordRunManifest && options.runId
      ? (JSON.parse(
          fs.readFileSync(path.join(fixture.root, "runs", options.runId, "run.json"), "utf8"),
        ) as {
          run_id: string;
          status: string;
          validation: { status: string };
        })
      : undefined;
  const output = fs.existsSync(fixture.outputPath)
    ? fs.readFileSync(fixture.outputPath, "utf8")
    : undefined;
  return { result, report, log, manifest, output };
}

function runWrapperWithDefaultPaths(fixture: WrapperFixture, runId?: string) {
  const wrapperArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    fixture.wrapperPath,
    "-SkipPreflight",
    "-SkipVerify",
  ];
  if (runId) {
    fs.mkdirSync(path.join(fixture.root, "runs", runId), { recursive: true });
    wrapperArgs.push("-RunId", runId);
  }
  wrapperArgs.push("default output path contract");

  return spawnSync(powerShellCommand, wrapperArgs, {
    cwd: fixture.root,
    encoding: "utf8",
    timeout: process.platform === "win32" ? 60_000 : 30_000,
    env: {
      ...process.env,
      CODEX_BIN: fixture.fakeCodexPath,
      CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
      CODEX_TEST_EXIT_CODE: "0",
    },
    windowsHide: process.platform === "win32",
  });
}

const powerShellAvailable = hasPowerShellRuntime();
const verifyRuntimeFixtures = createVerifyRuntimeFixtures();
const bashTaskRuntimeAvailable = hasCommand("bash", ["-c", "exit 0"]);
const manifestRuntimeAvailable =
  process.platform === "win32" &&
  powerShellAvailable &&
  hasCommand("python", ["--version"]) &&
  hasCommand("git", ["--version"]);

describe("codex-task native command output and exit code contract", () => {
  it("keeps host and docker calls on the shared scalar-exit-code function", () => {
    const source = fs.readFileSync(taskScriptPath, "utf8");
    const nativeCommandFunction = getNativeCommandFunction();

    expect(nativeCommandFunction).toContain("& $Command @CommandArgs | Out-Host");
    expect(nativeCommandFunction).toContain("return $LASTEXITCODE");
    expect(source.match(/\$report\.codex_exit_code = Invoke-NativeCommand/g)).toHaveLength(2);
    expect(source).toContain("$report.codex_exit_code -ne 0");
    expect(source).toContain("$script:codexTaskTerminationCode = [int]$report.codex_exit_code");
  });

  it("uses the new Run root for task artifacts and excludes both Run roots from scope scans", () => {
    const powerShell = fs.readFileSync(taskScriptPath, "utf8");
    const shell = fs.readFileSync(path.join(repoRoot, "scripts", "codex-task.sh"), "utf8");

    expect(powerShell).toContain('Join-Path (Join-Path $runRoot "artifacts")');
    expect(powerShell).toContain('Join-Path (Join-Path $runRoot "reports")');
    expect(powerShell).toContain('".artifacts\\\\codex-task\\\\artifacts"');
    expect(powerShell).toContain('".artifacts\\\\codex-task\\\\reports"');
    expect(powerShell).toContain('Join-Path $RepoRoot "logs"');
    expect(powerShell).toContain('Join-Path $RepoRoot (Join-Path "runs"');
    expect(powerShell).toContain("runs/$($State.run_id)/evaluation.json");
    expect(powerShell).toContain("$normalized -ne '.codex/runs'");
    expect(powerShell).toContain("$normalized.StartsWith('.codex/runs/'");
    expect(powerShell).toContain("$normalized -ne 'runs'");
    expect(powerShell).toContain("$normalized.StartsWith('runs/'");
    expect(shell).toContain('output_file="$run_root/artifacts/');
    expect(shell).toContain('report_path="$run_root/reports/');
    expect(shell).toContain('log_path="$run_root/logs/');
    expect(shell).toContain('artifacts_dir="$repo_root/.artifacts/codex-task/artifacts"');
    expect(shell).toContain('reports_dir="$repo_root/.artifacts/codex-task/reports"');
    expect(shell).toContain('logs_dir="$repo_root/logs"');
    expect(shell).toContain('evaluation_path="runs/$run_id/evaluation.json"');
    expect(shell).toContain('"$normalized" != ".codex/runs"');
    expect(shell).toContain('"$normalized" != .codex/runs/*');
    expect(shell).toContain('"$normalized" != "runs"');
    expect(shell).toContain('"$normalized" != runs/*');
    expect(powerShell).toContain("Ambiguous Run ID exists in both runs/");
    expect(shell).toContain("Ambiguous Run ID exists in both runs/");
  });

  it.skipIf(!powerShellAvailable)(
    "PowerShell: uses runtime-only defaults without a Run ID and Run-local defaults with one",
    () => {
      const noRun = createWrapperFixture();
      try {
        const result = runWrapperWithDefaultPaths(noRun);
        const artifactsDirectory = path.join(noRun.root, ".artifacts", "codex-task", "artifacts");
        const reportsDirectory = path.join(noRun.root, ".artifacts", "codex-task", "reports");
        const logsDirectory = path.join(noRun.root, "logs");

        expect(result.error).toBeUndefined();
        expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
        expect(fs.readdirSync(artifactsDirectory)).toEqual(
          expect.arrayContaining([expect.stringMatching(/^codex-task-.*\.json$/)]),
        );
        expect(fs.readdirSync(reportsDirectory)).toEqual(
          expect.arrayContaining([expect.stringMatching(/^codex-task-.*\.report\.json$/)]),
        );
        expect(fs.readdirSync(logsDirectory)).toEqual(
          expect.arrayContaining([expect.stringMatching(/^codex-task-.*\.jsonl$/)]),
        );
        expect(fs.existsSync(path.join(noRun.root, ".codex"))).toBe(false);
      } finally {
        fs.rmSync(noRun.root, { recursive: true, force: true });
      }

      const withRun = createWrapperFixture();
      const id = "20990101-123456-JST";
      try {
        const result = runWrapperWithDefaultPaths(withRun, id);
        const runRoot = path.join(withRun.root, "runs", id);

        expect(result.error).toBeUndefined();
        expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
        expect(fs.readdirSync(path.join(runRoot, "artifacts"))).toEqual(
          expect.arrayContaining([expect.stringMatching(/^codex-task-.*\.json$/)]),
        );
        expect(fs.readdirSync(path.join(runRoot, "reports"))).toEqual(
          expect.arrayContaining([expect.stringMatching(/^codex-task-.*\.report\.json$/)]),
        );
        expect(fs.readdirSync(path.join(runRoot, "logs"))).toEqual(
          expect.arrayContaining([expect.stringMatching(/^codex-task-.*\.jsonl$/)]),
        );
        expect(fs.existsSync(path.join(withRun.root, "logs"))).toBe(false);
      } finally {
        fs.rmSync(withRun.root, { recursive: true, force: true });
      }
    },
    120_000,
  );

  it.skipIf(!bashTaskRuntimeAvailable)(
    "Bash: rejects a missing RunId before creating logs, output, or a Run directory",
    () => {
      const fixture = createWrapperFixture();
      const wrapperPath = path.join(fixture.root, "scripts", "codex-task.sh");
      const runId = "20990101-987650-JST";
      fs.copyFileSync(path.join(repoRoot, "scripts", "codex-task.sh"), wrapperPath);

      try {
        const result = spawnSync("bash", [wrapperPath, "--run-id", runId, "missing-run probe"], {
          cwd: fixture.root,
          encoding: "utf8",
          timeout: 30_000,
        });

        expect(result.status).not.toBe(0);
        expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toContain(
          "Run root is missing or unsafe",
        );
        expect(fs.existsSync(path.join(fixture.root, "runs", runId))).toBe(false);
        expect(fs.existsSync(path.join(fixture.root, ".codex"))).toBe(false);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!bashTaskRuntimeAvailable)(
    "Bash: rejects a duplicate Run ID before writing either manifest or task artifacts",
    () => {
      const fixture = createWrapperFixture();
      const wrapperPath = path.join(fixture.root, "scripts", "codex-task.sh");
      const runId = "20990101-987654-JST";
      const runRoot = path.join(fixture.root, "runs", runId);
      const legacyRunRoot = path.join(fixture.root, ".codex", "runs", runId);
      const newManifestPath = path.join(runRoot, "run.json");
      const legacyManifestPath = path.join(legacyRunRoot, "run.json");
      const newManifestContents = '{"run_id":"new","status":"preserve"}\n';
      const legacyManifestContents = '{"run_id":"legacy","status":"preserve"}\n';
      fs.copyFileSync(path.join(repoRoot, "scripts", "codex-task.sh"), wrapperPath);
      fs.mkdirSync(runRoot, { recursive: true });
      fs.mkdirSync(legacyRunRoot, { recursive: true });
      fs.writeFileSync(newManifestPath, newManifestContents, "utf8");
      fs.writeFileSync(legacyManifestPath, legacyManifestContents, "utf8");

      try {
        const result = spawnSync(
          "bash",
          [wrapperPath, "--run-id", runId, "--record-run-manifest", "duplicate-run probe"],
          {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 30_000,
            env: {
              ...process.env,
              CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
              CODEX_TEST_EXIT_CODE: "0",
            },
          },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Ambiguous Run ID");
        expect(fs.readFileSync(newManifestPath, "utf8")).toBe(newManifestContents);
        expect(fs.readFileSync(legacyManifestPath, "utf8")).toBe(legacyManifestContents);
        expect(fs.existsSync(path.join(runRoot, "logs"))).toBe(false);
        expect(fs.existsSync(path.join(runRoot, "artifacts"))).toBe(false);
        expect(fs.existsSync(path.join(runRoot, "reports"))).toBe(false);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!manifestRuntimeAvailable)(
    "rejects a missing RunId before creating logs, output, or a Run directory",
    () => {
      const fixture = createWrapperFixture();
      const runId = "20990101-987651-JST";
      try {
        const result = spawnSync(
          powerShellCommand,
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            fixture.wrapperPath,
            "-SkipPreflight",
            "-RunId",
            runId,
            "missing-run probe",
          ],
          {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 30_000,
            env: {
              ...process.env,
              CODEX_BIN: fixture.fakeCodexPath,
              CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
              CODEX_TEST_EXIT_CODE: "0",
            },
            windowsHide: process.platform === "win32",
          },
        );

        expect(result.status).not.toBe(0);
        expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toMatch(
          /Run directory not found|Run root is missing/,
        );
        expect(fs.existsSync(path.join(fixture.root, "runs", runId))).toBe(false);
        expect(fs.existsSync(path.join(fixture.root, ".codex"))).toBe(false);
        expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).not.toContain(nativeStdoutMarker);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!manifestRuntimeAvailable)(
    "does not update a legacy .codex/runs Run when that ID is explicitly supplied",
    () => {
      const fixture = createWrapperFixture({ manifest: true });
      const runId = "20990101-987652-JST";
      const legacyRunRoot = path.join(fixture.root, ".codex", "runs", runId);
      const legacyManifestPath = path.join(legacyRunRoot, "run.json");
      const legacyReportPath = path.join(legacyRunRoot, "reports", "saved.report.json");
      const legacyEvaluationPath = path.join(legacyRunRoot, "evaluation.json");
      const manifestContents = '{"run_id":"legacy","status":"preserve"}\n';
      const reportContents = '{"status":"preserve-report"}\n';
      const evaluationContents = '{"result":"preserve-evaluation"}\n';
      fs.mkdirSync(path.dirname(legacyReportPath), { recursive: true });
      fs.writeFileSync(legacyManifestPath, manifestContents, "utf8");
      fs.writeFileSync(legacyReportPath, reportContents, "utf8");
      fs.writeFileSync(legacyEvaluationPath, evaluationContents, "utf8");

      try {
        const result = spawnSync(
          powerShellCommand,
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            fixture.wrapperPath,
            "-SkipPreflight",
            "-RunId",
            runId,
            "legacy-run probe",
          ],
          {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 30_000,
            env: {
              ...process.env,
              CODEX_BIN: fixture.fakeCodexPath,
              CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
              CODEX_TEST_EXIT_CODE: "0",
            },
            windowsHide: process.platform === "win32",
          },
        );

        expect(result.status).not.toBe(0);
        expect(fs.existsSync(path.join(fixture.root, "runs", runId))).toBe(false);
        expect(fs.readFileSync(legacyManifestPath, "utf8")).toBe(manifestContents);
        expect(fs.readFileSync(legacyReportPath, "utf8")).toBe(reportContents);
        expect(fs.readFileSync(legacyEvaluationPath, "utf8")).toBe(evaluationContents);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!manifestRuntimeAvailable)(
    "rejects a Run ID present in both roots before invoking Codex or writing artifacts",
    () => {
      const fixture = createWrapperFixture({ manifest: true });
      const runId = "20990101-987655-JST";
      const runRoot = path.join(fixture.root, "runs", runId);
      const legacyRunRoot = path.join(fixture.root, ".codex", "runs", runId);
      const newManifestPath = path.join(runRoot, "run.json");
      const legacyManifestPath = path.join(legacyRunRoot, "run.json");
      const newManifestContents = '{"run_id":"new","status":"preserve"}\n';
      const legacyManifestContents = '{"run_id":"legacy","status":"preserve"}\n';
      fs.mkdirSync(runRoot, { recursive: true });
      fs.mkdirSync(legacyRunRoot, { recursive: true });
      fs.writeFileSync(newManifestPath, newManifestContents, "utf8");
      fs.writeFileSync(legacyManifestPath, legacyManifestContents, "utf8");

      try {
        const result = spawnSync(
          powerShellCommand,
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            fixture.wrapperPath,
            "-SkipPreflight",
            "-RecordRunManifest",
            "-RunId",
            runId,
            "duplicate-run probe",
          ],
          {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 30_000,
            env: {
              ...process.env,
              CODEX_BIN: fixture.fakeCodexPath,
              CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
              CODEX_TEST_EXIT_CODE: "0",
            },
            windowsHide: process.platform === "win32",
          },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Ambiguous Run ID");
        expect(output).not.toContain(nativeStdoutMarker);
        expect(fs.readFileSync(newManifestPath, "utf8")).toBe(newManifestContents);
        expect(fs.readFileSync(legacyManifestPath, "utf8")).toBe(legacyManifestContents);
        expect(fs.existsSync(path.join(runRoot, "logs"))).toBe(false);
        expect(fs.existsSync(path.join(runRoot, "artifacts"))).toBe(false);
        expect(fs.existsSync(path.join(runRoot, "reports"))).toBe(false);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!powerShellAvailable)(
    "PowerShell: rejects a Run-local artifacts reparse point before Codex can write through it",
    () => {
      const fixture = createWrapperFixture();
      const runId = "20990101-987656-JST";
      const runRoot = path.join(fixture.root, "runs", runId);
      const outsideRoot = path.join(fixture.root, "outside-artifacts");
      const artifactsPath = path.join(runRoot, "artifacts");
      const sentinelPath = path.join(outsideRoot, "sentinel.txt");
      const sentinelContents = "external sentinel remains unchanged\n";
      fs.mkdirSync(runRoot, { recursive: true });
      fs.mkdirSync(outsideRoot, { recursive: true });
      fs.writeFileSync(sentinelPath, sentinelContents, "utf8");
      fs.symlinkSync(outsideRoot, artifactsPath, process.platform === "win32" ? "junction" : "dir");

      try {
        const result = spawnSync(
          powerShellCommand,
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            fixture.wrapperPath,
            "-SkipPreflight",
            "-SkipVerify",
            "-RunId",
            runId,
            "artifact reparse point probe",
          ],
          {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 30_000,
            env: {
              ...process.env,
              CODEX_BIN: fixture.fakeCodexPath,
              CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
              CODEX_TEST_EXIT_CODE: "0",
            },
            windowsHide: process.platform === "win32",
          },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Run-local output path");
        expect(output).not.toContain(nativeStdoutMarker);
        expect(fs.readFileSync(sentinelPath, "utf8")).toBe(sentinelContents);
        expect(fs.readdirSync(outsideRoot)).toEqual(["sentinel.txt"]);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!bashTaskRuntimeAvailable)(
    "Bash: rejects a Run-local artifacts junction before Codex can write through it",
    () => {
      const fixture = createWrapperFixture();
      const wrapperPath = path.join(fixture.root, "scripts", "codex-task.sh");
      const runId = "20990101-987657-JST";
      const runRoot = path.join(fixture.root, "runs", runId);
      const outsideRoot = path.join(fixture.root, "outside-artifacts");
      const artifactsPath = path.join(runRoot, "artifacts");
      const sentinelPath = path.join(outsideRoot, "sentinel.txt");
      const sentinelContents = "external sentinel remains unchanged\n";
      fs.copyFileSync(path.join(repoRoot, "scripts", "codex-task.sh"), wrapperPath);
      fs.mkdirSync(runRoot, { recursive: true });
      fs.mkdirSync(outsideRoot, { recursive: true });
      fs.writeFileSync(sentinelPath, sentinelContents, "utf8");
      fs.symlinkSync(outsideRoot, artifactsPath, process.platform === "win32" ? "junction" : "dir");
      const probe = createBashCodexProbe(fixture.root);

      try {
        const result = spawnSync(
          "bash",
          [
            toBashPath(wrapperPath),
            "--skip-preflight",
            "--skip-verify",
            "--run-id",
            runId,
            "artifact junction probe",
          ],
          {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 30_000,
            env: {
              ...process.env,
              CODEX_BIN: toBashPath(probe.fakeCodexPath),
              CODEX_INVOCATION_MARKER: toBashPath(probe.markerPath),
            },
          },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Run-local directory");
        expect(fs.existsSync(probe.markerPath)).toBe(false);
        expect(fs.readFileSync(sentinelPath, "utf8")).toBe(sentinelContents);
        expect(fs.readdirSync(outsideRoot)).toEqual(["sentinel.txt"]);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!bashTaskRuntimeAvailable || process.platform === "win32")(
    "Bash: rejects an explicit Run-local log symlink before Codex can write through it",
    () => {
      const fixture = createWrapperFixture();
      const wrapperPath = path.join(fixture.root, "scripts", "codex-task.sh");
      const runId = "20990101-987658-JST";
      const runRoot = path.join(fixture.root, "runs", runId);
      const logsPath = path.join(runRoot, "logs");
      const outsideRoot = path.join(fixture.root, "outside-log");
      const sentinelPath = path.join(outsideRoot, "sentinel.jsonl");
      const explicitLogPath = path.join(logsPath, "explicit.jsonl");
      const sentinelContents = "external sentinel remains unchanged\n";
      fs.copyFileSync(path.join(repoRoot, "scripts", "codex-task.sh"), wrapperPath);
      fs.mkdirSync(logsPath, { recursive: true });
      fs.mkdirSync(outsideRoot, { recursive: true });
      fs.writeFileSync(sentinelPath, sentinelContents, "utf8");
      fs.symlinkSync(sentinelPath, explicitLogPath, "file");
      const probe = createBashCodexProbe(fixture.root);

      try {
        const result = spawnSync(
          "bash",
          [
            toBashPath(wrapperPath),
            "--skip-preflight",
            "--skip-verify",
            "--run-id",
            runId,
            "--log-path",
            toBashPath(explicitLogPath),
            "explicit log symlink probe",
          ],
          {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 30_000,
            env: {
              ...process.env,
              CODEX_BIN: toBashPath(probe.fakeCodexPath),
              CODEX_INVOCATION_MARKER: toBashPath(probe.markerPath),
            },
          },
        );
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

        expect(result.status).not.toBe(0);
        expect(output).toContain("Run-local output file is unsafe");
        expect(fs.existsSync(probe.markerPath)).toBe(false);
        expect(fs.readFileSync(sentinelPath, "utf8")).toBe(sentinelContents);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!manifestRuntimeAvailable)("fails closed for a reparse-point runs root", () => {
    const fixture = createWrapperFixture();
    const runId = "20990101-987653-JST";
    const outsideRunsRoot = path.join(fixture.root, "outside-runs");
    fs.mkdirSync(outsideRunsRoot, { recursive: true });
    fs.symlinkSync(outsideRunsRoot, path.join(fixture.root, "runs"), "junction");

    try {
      const result = spawnSync(
        powerShellCommand,
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          fixture.wrapperPath,
          "-SkipPreflight",
          "-RunId",
          runId,
          "symlink-run probe",
        ],
        {
          cwd: fixture.root,
          encoding: "utf8",
          timeout: 30_000,
          env: {
            ...process.env,
            CODEX_BIN: fixture.fakeCodexPath,
            CODEX_TEST_ROOT: fixture.root.replaceAll("\\", "/"),
            CODEX_TEST_EXIT_CODE: "0",
          },
          windowsHide: process.platform === "win32",
        },
      );

      expect(result.status).not.toBe(0);
      expect(fs.existsSync(path.join(outsideRunsRoot, runId))).toBe(false);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it("routes every verify form through the shared scalar-exit-code function", () => {
    const verifyCommandFunction = getVerifyCommandFunction();
    const nativeCommandFunction = getNativeCommandFunction();
    const normalizedVerifySource = verifyCommandFunction.replace(/\s+/g, " ");

    expect(normalizedVerifySource.match(/Invoke-NativeCommand/g)).toHaveLength(6);
    expect(normalizedVerifySource).toContain(
      'Invoke-NativeCommand -Command "powershell.exe" -CommandArgs @("-ExecutionPolicy", "Bypass", "-File", $resolvedPath)',
    );
    expect(normalizedVerifySource).toContain(
      'Invoke-NativeCommand -Command "cmd.exe" -CommandArgs @("/d", "/c", $resolvedPath)',
    );
    expect(normalizedVerifySource).toContain(
      "Invoke-NativeCommand -Command $bashCmd.Source -CommandArgs @($resolvedPath)",
    );
    expect(normalizedVerifySource).toContain(
      "Invoke-NativeCommand -Command $resolvedPath -CommandArgs @()",
    );
    expect(normalizedVerifySource).toContain(
      'Invoke-NativeCommand -Command "powershell.exe" -CommandArgs @("-NoProfile", "-EncodedCommand", $encodedRunner)',
    );
    expect(normalizedVerifySource).not.toContain("& powershell.exe");
    expect(normalizedVerifySource).not.toContain("& cmd.exe");
    expect(normalizedVerifySource).not.toContain("& $bashCmd.Source");
    expect(normalizedVerifySource).not.toContain("& $resolvedPath");
    expect(normalizedVerifySource).not.toContain("return $LASTEXITCODE");
    expect(normalizedVerifySource).toContain(
      "[System.Environment]::GetEnvironmentVariable('CODEX_VERIFY_COMMAND')",
    );
    expect(normalizedVerifySource).toContain(
      "[System.Environment]::SetEnvironmentVariable('CODEX_VERIFY_COMMAND', $CommandText)",
    );
    expect(normalizedVerifySource).toContain(
      "[System.Text.Encoding]::Unicode.GetBytes($verifyRunner)",
    );
    expect(nativeCommandFunction).toContain("[AllowEmptyCollection()]");
  });

  it.skipIf(!powerShellAvailable)(
    "returns a scalar exit code while keeping native stdout and stderr visible",
    () => {
      for (const exitCode of [0, 7]) {
        const result = runNativeCommandProbe(exitCode);

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stdout).toContain(nativeStdoutMarker);
        expect(result.stderr).toContain(nativeStderrMarker);
        expect(result.stdout).toContain("RESULT_TYPE=System.Int32");
        expect(result.stdout).toContain("RESULT_COUNT=1");
        expect(result.stdout).toContain(`RESULT_VALUE=${exitCode}`);
        expect(result.stdout).not.toContain(`RESULT_VALUE=${nativeStdoutMarker}`);
      }
    },
    60_000,
  );

  afterAll(() => {
    fs.rmSync(verifyRuntimeFixtures.root, { recursive: true, force: true });
  });

  for (const fixture of verifyRuntimeFixtures.fixtures) {
    it.skipIf(!powerShellAvailable || !fixture.available)(
      `returns a scalar exit code for the ${fixture.name} verify path`,
      () => {
        const diagnostics =
          fixture.name === "default executable"
            ? getDefaultExecutableDiagnostics(verifyRuntimeFixtures.root)
            : undefined;
        const result = runVerifyProbe(
          fixture.commandText,
          verifyRuntimeFixtures.root,
          diagnostics !== undefined,
        );
        const failureContext = JSON.stringify({
          powershell: summarizeSpawnResult(result, verifyRuntimeFixtures.root),
          powershellTrace: diagnostics
            ? result.stdout
                .split(/\r?\n/)
                .filter((line) => /^(FIXTURE_|DIRECT_|HELPER_|RESULT_|RESTORED_)/.test(line))
            : undefined,
          directExecutions: diagnostics,
        });
        const assertionOutput = diagnostics
          ? result.stdout
              .split(/\r?\n/)
              .filter((line) => /^(FIXTURE_|DIRECT_|HELPER_|RESULT_|RESTORED_)/.test(line))
              .join("\n")
          : result.stdout;

        expect(result.error, failureContext).toBeUndefined();
        expect(result.status, failureContext).toBe(0);
        expect(assertionOutput, failureContext).toContain("RESULT_TYPE=System.Int32");
        expect(assertionOutput, failureContext).toContain("RESULT_COUNT=1");
        expect(assertionOutput, failureContext).toContain("RESULT_VALUE=0");
        expect(assertionOutput, failureContext).toContain(
          "RESTORED_VERIFY_COMMAND=codex-task-verify-restore",
        );
        for (const marker of fixture.stdoutMarkers) {
          expect(result.stdout).toContain(marker);
        }
        if (fixture.stderrMarker) {
          expect(result.stderr).toContain(fixture.stderrMarker);
        }
      },
      60_000,
    );
  }

  it.skipIf(!powerShellAvailable)(
    "stores scalar host exit codes in the wrapper report for success and failure",
    () => {
      for (const exitCode of [0, 7]) {
        const fixture = createWrapperFixture();
        try {
          const { result, report, log, output } = runWrapper(fixture, exitCode);

          expect(result.error).toBeUndefined();
          expect(result.status).toBe(exitCode);
          expect(result.stdout).toContain(nativeStdoutMarker);
          expect(result.stderr).toContain(nativeStderrMarker);
          expect(typeof report.codex_exit_code).toBe("number");
          expect(Array.isArray(report.codex_exit_code)).toBe(false);
          expect(report.codex_exit_code).toBe(exitCode);
          expect(report.status).toBe(exitCode === 0 ? "verify_skipped" : "codex_failed");
          expect(log).toContain('"event":"codex_exec_exit"');
          expect(log).toContain(`"exit_code":${exitCode}`);

          if (exitCode === 0) {
            expect(fs.existsSync(fixture.outputPath)).toBe(true);
            expect(output).toMatch(/<(?:REPO_ROOT|TEMP_ROOT)>/);
            expect(output).not.toContain(fixture.root.replaceAll("\\", "/"));
            expect(output).not.toContain(fixture.root.replaceAll("/", "\\"));
          }
        } finally {
          fs.rmSync(fixture.root, { recursive: true, force: true });
        }
      }
    },
    60_000,
  );

  it.skipIf(!powerShellAvailable)(
    "sanitizes known outputs when argument validation fails before Codex starts",
    () => {
      const fixture = createWrapperFixture();
      try {
        const { result, report } = runWrapper(fixture, 0, {
          additionalArguments: ["--unsupported-contract-option"],
        });
        const reportText = fs.readFileSync(fixture.reportPath, "utf8");

        expect(result.error).toBeUndefined();
        expect(result.status).not.toBe(0);
        expect(report.status).toBe("invalid_args");
        expect(reportText).toContain("<REPO_ROOT>");
        expect(reportText).not.toContain(fixture.root.replaceAll("\\", "/"));
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
    60_000,
  );

  const fullWrapperCases = [
    {
      name: "success",
      verifyExitCode: 0,
      verifyCommand: [
        `Write-Output '${verifyCommandTextStdoutMarker}-full-wrapper-success-1'`,
        `Write-Output '${verifyCommandTextStdoutMarker}-full-wrapper-success-2'`,
        `Write-Error '${verifyCommandTextStderrMarker}-full-wrapper-success'`,
        "exit 0",
      ].join("; "),
      stdoutMarkers: [
        `${verifyCommandTextStdoutMarker}-full-wrapper-success-1`,
        `${verifyCommandTextStdoutMarker}-full-wrapper-success-2`,
      ],
      stderrMarker: `${verifyCommandTextStderrMarker}-full-wrapper-success`,
      reportStatus: "ok",
      manifestStatus: "completed",
      validationStatus: "passed",
    },
    {
      name: "failure",
      verifyExitCode: 7,
      verifyCommand: [
        `Write-Output '${verifyCommandTextStdoutMarker}-full-wrapper-failure-1'`,
        `Write-Output '${verifyCommandTextStdoutMarker}-full-wrapper-failure-2'`,
        `Write-Error '${verifyCommandTextStderrMarker}-full-wrapper-failure'`,
        "exit 7",
      ].join("; "),
      stdoutMarkers: [
        `${verifyCommandTextStdoutMarker}-full-wrapper-failure-1`,
        `${verifyCommandTextStdoutMarker}-full-wrapper-failure-2`,
      ],
      stderrMarker: `${verifyCommandTextStderrMarker}-full-wrapper-failure`,
      reportStatus: "verify_failed",
      manifestStatus: "failed",
      validationStatus: "failed",
    },
  ] as const;

  for (const testCase of fullWrapperCases) {
    it.skipIf(!manifestRuntimeAvailable)(
      `keeps command text verify ${testCase.name} scalar through the full wrapper and manifest`,
      () => {
        const fixture = createWrapperFixture({ manifest: true });
        try {
          for (const relativePath of [
            "scripts/codex-task.ps1",
            "scripts/lib/codex-artifact-sanitizer.mjs",
            "scripts/collect-run-artifacts.ps1",
            "scripts/collect-run-artifacts.py",
            "scripts/sanitize-codex-artifacts.mjs",
          ]) {
            expect(fs.existsSync(path.join(fixture.root, relativePath))).toBe(true);
          }

          const gitProbe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
            cwd: fixture.root,
            encoding: "utf8",
            timeout: 10_000,
            windowsHide: process.platform === "win32",
          });
          expect(gitProbe.error).toBeUndefined();
          expect(gitProbe.status).toBe(0);
          expect(gitProbe.stdout.trim()).toBe("true");

          const { result, report, log, manifest } = runWrapper(fixture, 0, {
            skipVerify: false,
            verifyCommand: testCase.verifyCommand,
            recordRunManifest: true,
            runId,
          });

          expect(result.error).toBeUndefined();
          expect(result.status).toBe(testCase.verifyExitCode);
          for (const marker of testCase.stdoutMarkers) {
            expect(result.stdout).toContain(marker);
          }
          expect(result.stderr).toContain(testCase.stderrMarker);
          expect(typeof report.codex_exit_code).toBe("number");
          expect(report.codex_exit_code).toBe(0);
          expect(typeof report.verify_exit_code).toBe("number");
          expect(Array.isArray(report.verify_exit_code)).toBe(false);
          expect(report.verify_exit_code).toBe(testCase.verifyExitCode);
          expect(report.status).toBe(testCase.reportStatus);
          expect(manifest).toBeDefined();
          expect(manifest?.run_id).toBe(runId);
          expect(manifest?.status).toBe(testCase.manifestStatus);
          expect(manifest?.validation.status).toBe(testCase.validationStatus);
          expect(log).toContain('"event":"verify_exit"');
          expect(log).toContain(`"exit_code":${testCase.verifyExitCode}`);

          if (testCase.verifyExitCode === 0) {
            expect(fs.existsSync(fixture.outputPath)).toBe(true);
          }
        } finally {
          fs.rmSync(fixture.root, { recursive: true, force: true });
        }
      },
      60_000,
    );
  }
});
