import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const taskScriptPath = path.join(repoRoot, "scripts", "codex-task.ps1");
const sanitizerPath = path.join(repoRoot, "scripts", "lib", "codex-artifact-sanitizer.ps1");
const powerShellCommand = process.platform === "win32" ? "powershell.exe" : "pwsh";
const nativeStdoutMarker = "codex-task-native-stdout";
const nativeStderrMarker = "codex-task-native-stderr";

function hasPowerShellRuntime() {
  const result = spawnSync(powerShellCommand, ["-NoProfile", "-Command", "exit 0"], {
    encoding: "utf8",
    timeout: 10_000,
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

function encodePowerShell(script: string) {
  return Buffer.from(script, "utf16le").toString("base64");
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
      'if "%CODEX_TEST_EXIT_CODE%"=="0" if defined output_file echo {"ok":true}> "%output_file%"',
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
    "  printf '%s\\n' '{\"ok\":true}' > \"$output_file\"",
    "fi",
    'exit "$exit_code"',
    "",
  ].join("\n");
  fs.writeFileSync(fakeCodexPath, script, "utf8");
  fs.chmodSync(fakeCodexPath, 0o755);
  return fakeCodexPath;
}

function createWrapperFixture(): WrapperFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-task-native-contract-"));
  const scriptsDir = path.join(root, "scripts");
  const libDir = path.join(scriptsDir, "lib");
  fs.mkdirSync(libDir, { recursive: true });

  const wrapperPath = path.join(scriptsDir, "codex-task.ps1");
  fs.copyFileSync(taskScriptPath, wrapperPath);
  fs.copyFileSync(sanitizerPath, path.join(libDir, "codex-artifact-sanitizer.ps1"));

  return {
    root,
    wrapperPath,
    fakeCodexPath: createFakeCodex(root),
    outputPath: path.join(root, "output.json"),
    reportPath: path.join(root, "report.json"),
    logPath: path.join(root, "task.jsonl"),
  };
}

function runWrapper(fixture: WrapperFixture, exitCode: number) {
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
      "-OutputFile",
      fixture.outputPath,
      "-ReportPath",
      fixture.reportPath,
      "-LogPath",
      fixture.logPath,
      "native command contract",
    ],
    {
      cwd: fixture.root,
      encoding: "utf8",
      timeout: 30_000,
      env: {
        ...process.env,
        CODEX_BIN: fixture.fakeCodexPath,
        CODEX_TEST_EXIT_CODE: String(exitCode),
      },
      windowsHide: process.platform === "win32",
    },
  );

  const report = JSON.parse(fs.readFileSync(fixture.reportPath, "utf8")) as {
    codex_exit_code: unknown;
    status: string;
  };
  const log = fs.readFileSync(fixture.logPath, "utf8");
  return { result, report, log };
}

const powerShellAvailable = hasPowerShellRuntime();

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

  it.skipIf(!powerShellAvailable)(
    "stores scalar host exit codes in the wrapper report for success and failure",
    () => {
      for (const exitCode of [0, 7]) {
        const fixture = createWrapperFixture();
        try {
          const { result, report, log } = runWrapper(fixture, exitCode);

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
          }
        } finally {
          fs.rmSync(fixture.root, { recursive: true, force: true });
        }
      }
    },
    60_000,
  );
});
