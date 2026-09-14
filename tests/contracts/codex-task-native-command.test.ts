import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const taskScriptPath = path.join(repoRoot, "scripts", "codex-task.ps1");
const sanitizerPath = path.join(repoRoot, "scripts", "lib", "codex-artifact-sanitizer.ps1");
const powerShellCommand = process.platform === "win32" ? "powershell.exe" : "pwsh";
const nativeStdoutMarker = "codex-task-native-stdout";
const nativeStderrMarker = "codex-task-native-stderr";
const verifyCommandTextStdoutMarker = "codex-task-verify-command-text-stdout";
const verifyCommandTextStderrMarker = "codex-task-verify-command-text-stderr";
const runId = "20990101-000000-JST";

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

function runVerifyProbe(commandText: string, root: string) {
  const script = `${getResolveRepoPathFunction()}
${getNativeCommandFunction()}
${getVerifyCommandFunction()}
$repoRoot = [System.Environment]::GetEnvironmentVariable("CODEX_VERIFY_PROBE_ROOT")
$verifyCommand = [System.Environment]::GetEnvironmentVariable("CODEX_VERIFY_PROBE_COMMAND")
[System.Environment]::SetEnvironmentVariable("CODEX_VERIFY_COMMAND", "codex-task-verify-restore")
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

  const defaultSource =
    process.platform === "win32"
      ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "hostname.exe")
      : "/bin/echo";
  const defaultPath = path.join(root, "verify-default.exe");
  fs.copyFileSync(defaultSource, defaultPath);
  if (process.platform !== "win32") {
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
      stdoutMarkers: [],
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

function createWrapperFixture({ manifest = false }: { manifest?: boolean } = {}): WrapperFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-task-native-contract-"));
  const scriptsDir = path.join(root, "scripts");
  const libDir = path.join(scriptsDir, "lib");
  fs.mkdirSync(libDir, { recursive: true });

  const wrapperPath = path.join(scriptsDir, "codex-task.ps1");
  fs.copyFileSync(taskScriptPath, wrapperPath);
  fs.copyFileSync(sanitizerPath, path.join(libDir, "codex-artifact-sanitizer.ps1"));

  if (manifest) {
    for (const relativePath of [
      "scripts/collect-run-artifacts.ps1",
      "scripts/collect-run-artifacts.py",
      "scripts/sanitize-codex-artifacts.ps1",
    ]) {
      fs.copyFileSync(path.join(repoRoot, relativePath), path.join(root, relativePath));
    }

    const gitInit = spawnSync("git", ["init", "-q"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: process.platform === "win32",
    });
    if (gitInit.error || gitInit.status !== 0) {
      throw new Error(
        `Unable to initialize manifest fixture repository: ${gitInit.stderr ?? gitInit.error}`,
      );
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
    wrapperArgs.push("-RunId", options.runId);
  }
  wrapperArgs.push(
    "-OutputFile",
    fixture.outputPath,
    "-ReportPath",
    fixture.reportPath,
    "-LogPath",
    fixture.logPath,
    "native command contract",
  );

  const result = spawnSync(powerShellCommand, wrapperArgs, {
    cwd: fixture.root,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      ...process.env,
      CODEX_BIN: fixture.fakeCodexPath,
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
          fs.readFileSync(
            path.join(fixture.root, ".codex", "runs", options.runId, "run.json"),
            "utf8",
          ),
        ) as {
          run_id: string;
          status: string;
          validation: { status: string };
        })
      : undefined;
  return { result, report, log, manifest };
}

const powerShellAvailable = hasPowerShellRuntime();
const verifyRuntimeFixtures = createVerifyRuntimeFixtures();
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
    it.skipIf(!fixture.available)(
      `returns a scalar exit code for the ${fixture.name} verify path`,
      () => {
        const result = runVerifyProbe(fixture.commandText, verifyRuntimeFixtures.root);

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stdout).toContain("RESULT_TYPE=System.Int32");
        expect(result.stdout).toContain("RESULT_COUNT=1");
        expect(result.stdout).toContain("RESULT_VALUE=0");
        expect(result.stdout).toContain("RESTORED_VERIFY_COMMAND=codex-task-verify-restore");
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
            "scripts/lib/codex-artifact-sanitizer.ps1",
            "scripts/collect-run-artifacts.ps1",
            "scripts/collect-run-artifacts.py",
            "scripts/sanitize-codex-artifacts.ps1",
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
