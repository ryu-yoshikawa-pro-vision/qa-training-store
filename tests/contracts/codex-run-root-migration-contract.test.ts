import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const tsxLoaderUrl = import.meta.resolve("tsx");
const bashRunsInWsl =
  process.platform === "win32" &&
  spawnSync("bash", ["-c", "uname -s"], { encoding: "utf8" }).stdout.trim().startsWith("Linux");

function runBash(scriptPath: string, args: string[], cwd: string) {
  let launchPath = bashRunsInWsl
    ? path.relative(cwd, scriptPath).replaceAll("\\", "/")
    : scriptPath;
  if (bashRunsInWsl && !launchPath.startsWith(".")) {
    launchPath = `./${launchPath}`;
  }
  return spawnSync("bash", [launchPath, ...args], { cwd, encoding: "utf8" });
}

function hasPowerShellRuntime() {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", "exit 0"], {
    encoding: "utf8",
    timeout: 5_000,
  });
  return result.status === 0 && !result.error;
}

const powerShellAvailable = process.platform === "win32" && hasPowerShellRuntime();
const fixtureRoots: string[] = [];

afterEach(() => {
  for (const root of fixtureRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  fixtureRoots.length = 0;
});

function runPowerShell(scriptPath: string, args: string[], cwd: string) {
  return spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
    { cwd, encoding: "utf8" },
  );
}

type Fixture = {
  root: string;
  scriptPath: (name: string) => string;
  runRoot: (runId: string) => string;
  legacyRunRoot: (runId: string) => string;
};

function createFixture(): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-run-root-contract-"));
  fixtureRoots.push(root);
  const scriptsRoot = path.join(root, "scripts");
  const templatesRoot = path.join(root, ".codex", "templates");
  fs.mkdirSync(scriptsRoot, { recursive: true });
  fs.mkdirSync(templatesRoot, { recursive: true });

  for (const name of ["init-project.sh", "init-project.ps1", "new-run.sh", "new-run.ps1"]) {
    fs.copyFileSync(path.join(repoRoot, "scripts", name), path.join(scriptsRoot, name));
  }

  fs.writeFileSync(path.join(templatesRoot, "TASKS.md"), "# task template\n", "utf8");
  fs.writeFileSync(path.join(templatesRoot, "REPORT.md"), "# report template\n", "utf8");
  fs.writeFileSync(path.join(templatesRoot, "PLAN.md"), "# plan template\n", "utf8");
  fs.writeFileSync(
    path.join(templatesRoot, "RUN_MANIFEST.json"),
    `${JSON.stringify(
      {
        schema_version: 2,
        run_id: "<run_id>",
        status: "running",
        task_type: "implementation",
        workflow_level: "standard",
        validation: { status: "not_run", commands: ["template-command"], warnings: [] },
        custom_machine_field: { retained: true },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    root,
    scriptPath: (name) => path.join(scriptsRoot, name),
    runRoot: (runId) => path.join(root, "runs", runId),
    legacyRunRoot: (runId) => path.join(root, ".codex", "runs", runId),
  };
}

function createCredentialScanFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-run-credential-scan-"));
  fixtureRoots.push(root);
  const scriptsRoot = path.join(root, "scripts");
  const testApiPath = path.join(root, "src", "test-controls", "test-api.web.ts");
  fs.mkdirSync(scriptsRoot, { recursive: true });
  fs.mkdirSync(path.dirname(testApiPath), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "security-static-check.ts"),
    path.join(scriptsRoot, "security-static-check.ts"),
  );
  fs.writeFileSync(
    testApiPath,
    [
      'const allowed = buildKind === "automation" || buildKind === "local";',
      "const guarded = !isTestApiBuild(buildKind);",
      "void allowed;",
      "void guarded;",
      "",
    ].join("\n"),
    "utf8",
  );
  return root;
}

function runCredentialScan(root: string) {
  const stdoutPath = path.join(root, "security-scan.stdout.txt");
  const stderrPath = path.join(root, "security-scan.stderr.txt");
  const stdoutFd = fs.openSync(stdoutPath, "w");
  let stderrFd: number | undefined;
  let status: number | null = null;

  try {
    stderrFd = fs.openSync(stderrPath, "w");
    status = spawnSync(
      process.execPath,
      ["--import", tsxLoaderUrl, path.join(root, "scripts", "security-static-check.ts")],
      { cwd: root, encoding: "utf8", stdio: ["ignore", stdoutFd, stderrFd], timeout: 30_000 },
    ).status;
  } finally {
    try {
      fs.closeSync(stdoutFd);
    } finally {
      if (stderrFd !== undefined) fs.closeSync(stderrFd);
    }
  }

  return {
    status,
    stdout: fs.readFileSync(stdoutPath, "utf8"),
    stderr: fs.readFileSync(stderrPath, "utf8"),
  };
}

function expectSuccessful(result: ReturnType<typeof runBash>) {
  expect(result.status, result.stderr).toBe(0);
}

function expectCollision(result: ReturnType<typeof runBash>) {
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}\n${result.stderr}`).toMatch(/already exists|legacy root/i);
}

const runId = "20990101-123456-JST";

describe("run root migration contract", () => {
  it("declares runs/ as the default and report root", () => {
    const config = fs.readFileSync(path.join(repoRoot, "codex-project.toml"), "utf8");
    expect(config).toMatch(/^default_run_root = "runs"$/m);
    expect(config).toMatch(/^run_report = "runs\/<run_id>\/REPORT\.md"$/m);
  });

  it("initializes runs/.gitkeep and preserves existing .codex/runs content with Bash", () => {
    const fixture = createFixture();
    const existingLegacyFile = path.join(fixture.root, ".codex", "runs", "existing", "keep.txt");
    fs.mkdirSync(path.dirname(existingLegacyFile), { recursive: true });
    fs.writeFileSync(existingLegacyFile, "preserve this\n", "utf8");

    expectSuccessful(runBash(fixture.scriptPath("init-project.sh"), [], fixture.root));

    expect(fs.existsSync(path.join(fixture.root, "runs", ".gitkeep"))).toBe(true);
    expect(fs.readFileSync(existingLegacyFile, "utf8")).toBe("preserve this\n");
    expect(fs.existsSync(path.join(fixture.root, ".codex", "runs", ".gitkeep"))).toBe(false);
  });

  it("does not create a missing legacy Run root with Bash", () => {
    const fixture = createFixture();

    expectSuccessful(runBash(fixture.scriptPath("init-project.sh"), [], fixture.root));

    expect(fs.existsSync(path.join(fixture.root, "runs", ".gitkeep"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, ".codex", "runs"))).toBe(false);
  });

  it("keeps legacy Run initialization out of both project initializers", () => {
    const bash = fs.readFileSync(path.join(repoRoot, "scripts", "init-project.sh"), "utf8");
    const powerShell = fs.readFileSync(path.join(repoRoot, "scripts", "init-project.ps1"), "utf8");

    expect(bash).toContain("runs/.gitkeep");
    expect(bash).not.toContain(".codex/runs");
    expect(powerShell).toContain('"runs\\.gitkeep"');
    expect(powerShell).not.toContain(".codex\\runs");
  });

  it("rolls back only a PowerShell Run directory created by the current invocation", () => {
    const powerShell = fs.readFileSync(path.join(repoRoot, "scripts", "new-run.ps1"), "utf8");
    const createdFlagIndex = powerShell.indexOf("$createdRunRoot = $false");
    const runCreationIndex = powerShell.indexOf(
      "New-Item -ItemType Directory -Path $runRoot -ErrorAction Stop | Out-Null",
    );
    const createdSuccessIndex = powerShell.indexOf("$createdRunRoot = $true", runCreationIndex);
    const runIdCheckIndex = powerShell.indexOf("if (Test-PathEntry -Path $runRoot)");
    const legacyRunIdCheckIndex = powerShell.indexOf("if (Test-PathEntry -Path $legacyRunRoot)");
    const rollbackCatchIndex = powerShell.indexOf(
      "catch {\n    if ($createdRunRoot -and (Test-PathEntry -Path $runRoot))",
      createdSuccessIndex,
    );
    const initializationBlock = powerShell.slice(runCreationIndex, rollbackCatchIndex);
    const rollbackBlock = powerShell.slice(rollbackCatchIndex);

    expect(createdFlagIndex).toBeGreaterThanOrEqual(0);
    expect(runCreationIndex).toBeGreaterThanOrEqual(0);
    expect(createdFlagIndex).toBeLessThan(runCreationIndex);
    expect(runIdCheckIndex).toBeGreaterThanOrEqual(0);
    expect(legacyRunIdCheckIndex).toBeGreaterThanOrEqual(0);
    expect(runIdCheckIndex).toBeLessThan(runCreationIndex);
    expect(legacyRunIdCheckIndex).toBeLessThan(runCreationIndex);
    expect(createdSuccessIndex).toBeGreaterThan(runCreationIndex);
    expect(rollbackCatchIndex).toBeGreaterThan(createdSuccessIndex);
    expect(initializationBlock).toContain(
      'Copy-Item -LiteralPath (Join-Path $templatesRoot "TASKS.md")',
    );
    expect(initializationBlock).toContain("ConvertTo-Json -Depth 8");
    expect(initializationBlock).toContain(
      'Set-Content -LiteralPath (Join-Path $runRoot "run.json")',
    );
    expect(rollbackBlock).toContain("Remove-Item -LiteralPath $runRoot -Recurse -Force");
    expect(rollbackBlock).toContain(
      "if ((-not $createdRunRoot) -and (Test-PathEntry -Path $runRoot))",
    );
    expect(powerShell.match(/Remove-Item/g)).toHaveLength(1);
  });

  it("rejects a Bash runs root symlink during initialization", () => {
    const fixture = createFixture();
    const externalRunsRoot = path.join(fixture.root, "external-runs");
    fs.mkdirSync(externalRunsRoot, { recursive: true });
    fs.symlinkSync(externalRunsRoot, path.join(fixture.root, "runs"), "dir");

    const result = runBash(fixture.scriptPath("init-project.sh"), [], fixture.root);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/symlink|reparse|resolve directly/i);
    expect(fs.existsSync(path.join(externalRunsRoot, ".gitkeep"))).toBe(false);
  });

  it.skipIf(!powerShellAvailable)(
    "initializes runs/.gitkeep and preserves existing .codex/runs content with PowerShell",
    () => {
      const fixture = createFixture();
      const existingLegacyFile = path.join(fixture.root, ".codex", "runs", "existing", "keep.txt");
      fs.mkdirSync(path.dirname(existingLegacyFile), { recursive: true });
      fs.writeFileSync(existingLegacyFile, "preserve this\n", "utf8");

      expectSuccessful(runPowerShell(fixture.scriptPath("init-project.ps1"), [], fixture.root));

      expect(fs.existsSync(path.join(fixture.root, "runs", ".gitkeep"))).toBe(true);
      expect(fs.readFileSync(existingLegacyFile, "utf8")).toBe("preserve this\n");
      expect(fs.existsSync(path.join(fixture.root, ".codex", "runs", ".gitkeep"))).toBe(false);
    },
  );

  it.skipIf(!powerShellAvailable)(
    "does not create a missing legacy Run root with PowerShell",
    () => {
      const fixture = createFixture();

      expectSuccessful(runPowerShell(fixture.scriptPath("init-project.ps1"), [], fixture.root));

      expect(fs.existsSync(path.join(fixture.root, "runs", ".gitkeep"))).toBe(true);
      expect(fs.existsSync(path.join(fixture.root, ".codex", "runs"))).toBe(false);
    },
  );

  it.skipIf(!powerShellAvailable)(
    "rejects a PowerShell runs reparse point during initialization",
    () => {
      const fixture = createFixture();
      const externalRunsRoot = path.join(fixture.root, "external-runs");
      fs.mkdirSync(externalRunsRoot, { recursive: true });
      fs.symlinkSync(externalRunsRoot, path.join(fixture.root, "runs"), "junction");

      const result = runPowerShell(fixture.scriptPath("init-project.ps1"), [], fixture.root);

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(/reparse point|resolve directly/i);
      expect(fs.existsSync(path.join(externalRunsRoot, ".gitkeep"))).toBe(false);
    },
  );

  it("writes only runs/<id> from templates and preserves run manifest fields with Bash", () => {
    const fixture = createFixture();
    const result = runBash(
      fixture.scriptPath("new-run.sh"),
      ["--run-id", runId, "--task-type", "repair", "--workflow-level", "strict"],
      fixture.root,
    );

    expectSuccessful(result);
    expect(fs.readdirSync(fixture.runRoot(runId)).sort()).toEqual(
      ["PLAN.md", "REPORT.md", "TASKS.md", "run.json"].sort(),
    );
    expect(fs.readFileSync(path.join(fixture.runRoot(runId), "TASKS.md"), "utf8")).toBe(
      "# task template\n",
    );
    expect(fs.existsSync(fixture.legacyRunRoot(runId))).toBe(false);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(fixture.runRoot(runId), "run.json"), "utf8"),
    );
    expect(manifest).toMatchObject({
      schema_version: 2,
      run_id: runId,
      status: "running",
      task_type: "repair",
      workflow_level: "strict",
      validation: { status: "not_run", commands: ["template-command"], warnings: [] },
      custom_machine_field: { retained: true },
    });
    expect(manifest).not.toHaveProperty("preset");
  });

  it("retains Bash flags and refuses an existing target run even with --force", () => {
    const fixture = createFixture();
    const result = runBash(
      fixture.scriptPath("new-run.sh"),
      ["--run-id", runId, "--no-plan", "--no-run-manifest", "--force"],
      fixture.root,
    );
    expectSuccessful(result);
    expect(fs.readdirSync(fixture.runRoot(runId)).sort()).toEqual(["REPORT.md", "TASKS.md"]);

    const sentinelPath = path.join(fixture.runRoot(runId), "sentinel.txt");
    fs.writeFileSync(sentinelPath, "keep this\n", "utf8");
    expectCollision(
      runBash(fixture.scriptPath("new-run.sh"), ["--run-id", runId, "--force"], fixture.root),
    );
    expect(fs.readFileSync(sentinelPath, "utf8")).toBe("keep this\n");
  });

  it("keeps Bash CLI validation and does not create a run for invalid values", () => {
    const fixture = createFixture();
    const result = runBash(
      fixture.scriptPath("new-run.sh"),
      ["--run-id", "invalid", "--task-type", "unknown"],
      fixture.root,
    );

    expect(result.status).not.toBe(0);
    expect(fs.existsSync(path.join(fixture.root, "runs"))).toBe(false);
  });

  it("refuses an ID already present in .codex/runs without creating a new run", () => {
    const fixture = createFixture();
    const legacyRunRoot = fixture.legacyRunRoot(runId);
    fs.mkdirSync(legacyRunRoot, { recursive: true });
    fs.writeFileSync(path.join(legacyRunRoot, "sentinel.txt"), "keep this\n", "utf8");

    expectCollision(
      runBash(fixture.scriptPath("new-run.sh"), ["--run-id", runId, "--force"], fixture.root),
    );
    expect(fs.existsSync(fixture.runRoot(runId))).toBe(false);
    expect(fs.readFileSync(path.join(legacyRunRoot, "sentinel.txt"), "utf8")).toBe("keep this\n");
  });

  it("rejects a Bash runs root that resolves outside the repository", () => {
    const fixture = createFixture();
    const externalRunsRoot = path.join(fixture.root, "external-runs");
    fs.mkdirSync(externalRunsRoot, { recursive: true });
    fs.symlinkSync(externalRunsRoot, path.join(fixture.root, "runs"), "dir");

    const result = runBash(
      fixture.scriptPath("new-run.sh"),
      ["--run-id", runId, "--force"],
      fixture.root,
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/symlink|reparse|resolve directly/i);
    expect(fs.existsSync(path.join(externalRunsRoot, runId))).toBe(false);
  });

  it.skipIf(!powerShellAvailable)(
    "rejects a PowerShell runs reparse point that resolves outside the repository",
    () => {
      const fixture = createFixture();
      const externalRunsRoot = path.join(fixture.root, "external-runs");
      fs.mkdirSync(externalRunsRoot, { recursive: true });
      fs.symlinkSync(externalRunsRoot, path.join(fixture.root, "runs"), "junction");

      const result = runPowerShell(
        fixture.scriptPath("new-run.ps1"),
        ["-RunId", runId, "-Force"],
        fixture.root,
      );

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(/reparse point|resolve directly/i);
      expect(fs.existsSync(path.join(externalRunsRoot, runId))).toBe(false);
    },
  );

  it.skipIf(!powerShellAvailable)(
    "writes only runs/<id>, preserves manifest fields, and honors PowerShell flags",
    () => {
      const fixture = createFixture();
      const result = runPowerShell(
        fixture.scriptPath("new-run.ps1"),
        ["-RunId", runId, "-TaskType", "repair", "-WorkflowLevel", "strict"],
        fixture.root,
      );

      expectSuccessful(result);
      expect(fs.readdirSync(fixture.runRoot(runId)).sort()).toEqual(
        ["PLAN.md", "REPORT.md", "TASKS.md", "run.json"].sort(),
      );
      expect(fs.existsSync(fixture.legacyRunRoot(runId))).toBe(false);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(fixture.runRoot(runId), "run.json"), "utf8"),
      );
      expect(manifest).toMatchObject({
        schema_version: 2,
        run_id: runId,
        status: "running",
        task_type: "repair",
        workflow_level: "strict",
        validation: { status: "not_run", commands: ["template-command"], warnings: [] },
        custom_machine_field: { retained: true },
      });
      expect(manifest).not.toHaveProperty("preset");

      const flagFixture = createFixture();
      const flagResult = runPowerShell(
        flagFixture.scriptPath("new-run.ps1"),
        ["-RunId", runId, "-NoPlan", "-NoRunManifest", "-Force"],
        flagFixture.root,
      );
      expectSuccessful(flagResult);
      expect(fs.readdirSync(flagFixture.runRoot(runId)).sort()).toEqual(["REPORT.md", "TASKS.md"]);

      const sentinelPath = path.join(flagFixture.runRoot(runId), "sentinel.txt");
      fs.writeFileSync(sentinelPath, "keep this\n", "utf8");
      const collisionResult = runPowerShell(
        flagFixture.scriptPath("new-run.ps1"),
        ["-RunId", runId, "-Force"],
        flagFixture.root,
      );
      expectCollision(collisionResult);
      expect(fs.readFileSync(sentinelPath, "utf8")).toBe("keep this\n");
    },
  );

  it.skipIf(!powerShellAvailable)(
    "refuses an ID already present in .codex/runs with PowerShell",
    () => {
      const fixture = createFixture();
      const legacyRunRoot = fixture.legacyRunRoot(runId);
      fs.mkdirSync(legacyRunRoot, { recursive: true });
      fs.writeFileSync(path.join(legacyRunRoot, "sentinel.txt"), "keep this\n", "utf8");

      const result = runPowerShell(
        fixture.scriptPath("new-run.ps1"),
        ["-RunId", runId, "-Force"],
        fixture.root,
      );

      expectCollision(result);
      expect(fs.existsSync(fixture.runRoot(runId))).toBe(false);
      expect(fs.readFileSync(path.join(legacyRunRoot, "sentinel.txt"), "utf8")).toBe("keep this\n");
    },
  );
});

describe("Run root credential scan contract", () => {
  it("rejects synthetic credentials in Run Markdown and JSONL artifacts", () => {
    const root = createCredentialScanFixture();
    const runRoot = path.join(root, "runs", runId);
    fs.mkdirSync(runRoot, { recursive: true });
    fs.writeFileSync(
      path.join(runRoot, "REPORT.md"),
      'api_key: "syntheticReportCredential012345"\n',
      "utf8",
    );
    fs.writeFileSync(
      path.join(runRoot, "hooks.jsonl"),
      '{"access_token":"syntheticJsonlCredential012345"}\n',
      "utf8",
    );

    const result = runCredentialScan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`runs/${runId}/REPORT.md: hard-coded secret assignment`);
    expect(result.stderr).toContain(`runs/${runId}/hooks.jsonl: hard-coded secret assignment`);
    expect(result.stderr).not.toContain("syntheticReportCredential012345");
    expect(result.stderr).not.toContain("syntheticJsonlCredential012345");
  });

  it.skipIf(process.platform === "win32")(
    "fails closed on a Run-root symlink without following it",
    () => {
      const root = createCredentialScanFixture();
      const outsideRunRoot = path.join(root, "outside-run");
      const runRoot = path.join(root, "runs", runId);
      fs.mkdirSync(path.join(root, "runs"), { recursive: true });
      fs.mkdirSync(outsideRunRoot, { recursive: true });
      fs.writeFileSync(
        path.join(outsideRunRoot, "REPORT.md"),
        'api_key: "syntheticOutsideCredential012345"\n',
        "utf8",
      );
      fs.symlinkSync(outsideRunRoot, runRoot, "dir");

      const result = runCredentialScan(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        `Credential scan refuses symlink/reparse point: runs/${runId}`,
      );
      expect(result.stderr).not.toContain("syntheticOutsideCredential012345");
    },
  );
});
