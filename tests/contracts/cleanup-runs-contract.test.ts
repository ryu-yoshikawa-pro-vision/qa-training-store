import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const bashExecutable =
  process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
const powerShellExecutable = process.platform === "win32" ? "powershell.exe" : "pwsh";

function hasCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: process.platform === "win32",
  });
  return result.status === 0 && !result.error;
}

const bashAvailable = process.platform !== "win32" || fs.existsSync(bashExecutable);
const powerShellAvailable = hasCommand(powerShellExecutable, ["-NoProfile", "-Command", "exit 0"]);

function createFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanup-runs-contract-"));
  const repo = path.join(tempRoot, "repository");
  const scripts = path.join(repo, "scripts");
  fs.mkdirSync(scripts, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "cleanup-runs.sh"),
    path.join(scripts, "cleanup-runs.sh"),
  );
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "cleanup-runs.ps1"),
    path.join(scripts, "cleanup-runs.ps1"),
  );

  const runId = "20261118-000001-JST";
  const runRoot = path.join(repo, "runs", runId);
  const legacyRunRoot = path.join(repo, ".codex", "runs", runId);
  const invalidRunRoot = path.join(repo, "runs", "not-a-run-id");
  const topLog = path.join(repo, "logs", "top.jsonl");
  const nestedLog = path.join(repo, "logs", "nested", "nested.jsonl");
  const legacyLog = path.join(repo, ".codex", "logs", "top.jsonl");
  const legacyArtifact = path.join(repo, ".codex", "artifacts", "preserved.json");
  const legacyReport = path.join(repo, ".codex", "reports", "preserved.json");

  fs.mkdirSync(runRoot, { recursive: true });
  fs.mkdirSync(legacyRunRoot, { recursive: true });
  fs.mkdirSync(invalidRunRoot, { recursive: true });
  fs.mkdirSync(path.dirname(topLog), { recursive: true });
  fs.mkdirSync(path.dirname(nestedLog), { recursive: true });
  fs.mkdirSync(path.dirname(legacyLog), { recursive: true });
  fs.mkdirSync(path.dirname(legacyArtifact), { recursive: true });
  fs.mkdirSync(path.dirname(legacyReport), { recursive: true });
  fs.writeFileSync(path.join(runRoot, "marker.txt"), "new Run\n", "utf8");
  fs.writeFileSync(path.join(legacyRunRoot, "marker.txt"), "legacy Run\n", "utf8");
  fs.writeFileSync(path.join(invalidRunRoot, "marker.txt"), "invalid ID\n", "utf8");
  fs.writeFileSync(topLog, "top log\n", "utf8");
  fs.writeFileSync(nestedLog, "nested log\n", "utf8");
  fs.writeFileSync(legacyLog, "legacy log\n", "utf8");
  fs.writeFileSync(legacyArtifact, "legacy artifact\n", "utf8");
  fs.writeFileSync(legacyReport, "legacy report\n", "utf8");

  return {
    tempRoot,
    repo,
    runId,
    runRoot,
    legacyRunRoot,
    invalidRunRoot,
    topLog,
    nestedLog,
    legacyLog,
    legacyArtifact,
    legacyReport,
  };
}

function toBashPath(filePath: string) {
  if (process.platform !== "win32") return filePath;
  const cygpath = path.resolve(path.dirname(bashExecutable), "..", "usr", "bin", "cygpath.exe");
  const result = spawnSync(cygpath, ["-u", filePath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`cygpath failed: ${result.stderr}`);
  return result.stdout.trim();
}

function runBash(repo: string, args: string[]) {
  const scriptPath = path.join(repo, "scripts", "cleanup-runs.sh");
  return spawnSync(bashExecutable, [toBashPath(scriptPath), ...args], {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
}

function runPowerShell(repo: string, args: string[]) {
  return spawnSync(
    powerShellExecutable,
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(repo, "scripts", "cleanup-runs.ps1"),
      ...args,
    ],
    {
      cwd: repo,
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: process.platform === "win32",
    },
  );
}

function assertPreviewOnly(
  run: (repo: string, args: string[]) => SpawnSyncReturns<string>,
  dryRun: string,
) {
  const fixture = createFixture();
  try {
    const preview = run(fixture.repo, [dryRun]);
    expect(preview.error).toBeUndefined();
    expect(preview.status, `${preview.stderr}\n${preview.stdout}`).toBe(0);
    expect(preview.stdout).toContain(`runs/${fixture.runId}`);
    expect(preview.stdout).toContain("logs/top.jsonl");
    expect(preview.stdout).not.toContain(".codex/logs/");
    expect(preview.stdout).not.toContain(".codex/artifacts/");
    expect(preview.stdout).not.toContain(".codex/reports/");
    expect(preview.stdout).not.toContain(".codex/runs/");
    expect(preview.stdout).not.toContain("not-a-run-id");
    expect(fs.readFileSync(path.join(fixture.runRoot, "marker.txt"), "utf8")).toBe("new Run\n");
    expect(fs.existsSync(fixture.legacyRunRoot)).toBe(true);
    expect(fs.readFileSync(path.join(fixture.legacyRunRoot, "marker.txt"), "utf8")).toBe(
      "legacy Run\n",
    );
    expect(fs.existsSync(fixture.invalidRunRoot)).toBe(true);
    expect(fs.readFileSync(path.join(fixture.invalidRunRoot, "marker.txt"), "utf8")).toBe(
      "invalid ID\n",
    );
    expect(fs.readFileSync(fixture.topLog, "utf8")).toBe("top log\n");
    expect(fs.readFileSync(fixture.legacyLog, "utf8")).toBe("legacy log\n");
    expect(fs.readFileSync(fixture.legacyArtifact, "utf8")).toBe("legacy artifact\n");
    expect(fs.readFileSync(fixture.legacyReport, "utf8")).toBe("legacy report\n");
    expect(fs.readFileSync(fixture.nestedLog, "utf8")).toBe("nested log\n");
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

describe("Run cleanup root boundary", () => {
  it.skipIf(!bashAvailable)(
    "Bash preview lists only new-root Run and top-level log fixtures",
    () => {
      assertPreviewOnly(runBash, "--dry-run");
    },
  );

  it.skipIf(!powerShellAvailable)(
    "PowerShell preview lists only new-root Run and top-level log fixtures",
    () => {
      assertPreviewOnly(runPowerShell, "-DryRun");
    },
  );

  it.skipIf(!bashAvailable)("Bash explicit cleanup preserves old .codex paths", () => {
    const fixture = createFixture();
    try {
      const result = runBash(fixture.repo, ["--confirm-delete-generated-runs"]);
      expect(result.error).toBeUndefined();
      expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
      expect(fs.existsSync(fixture.runRoot)).toBe(false);
      expect(fs.existsSync(fixture.topLog)).toBe(false);
      expect(fs.existsSync(fixture.nestedLog)).toBe(true);
      expect(fs.existsSync(fixture.legacyRunRoot)).toBe(true);
      expect(fs.existsSync(fixture.legacyLog)).toBe(true);
      expect(fs.existsSync(fixture.legacyArtifact)).toBe(true);
      expect(fs.existsSync(fixture.legacyReport)).toBe(true);
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  it.skipIf(!powerShellAvailable)("PowerShell explicit cleanup preserves old .codex paths", () => {
    const fixture = createFixture();
    try {
      const result = runPowerShell(fixture.repo, ["-ConfirmDeleteGeneratedRuns"]);
      expect(result.error).toBeUndefined();
      expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
      expect(fs.existsSync(fixture.runRoot)).toBe(false);
      expect(fs.existsSync(fixture.topLog)).toBe(false);
      expect(fs.existsSync(fixture.nestedLog)).toBe(true);
      expect(fs.existsSync(fixture.legacyRunRoot)).toBe(true);
      expect(fs.existsSync(fixture.legacyLog)).toBe(true);
      expect(fs.existsSync(fixture.legacyArtifact)).toBe(true);
      expect(fs.existsSync(fixture.legacyReport)).toBe(true);
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  it.skipIf(!bashAvailable)("Bash preview refuses an external symlink Run candidate", () => {
    const fixture = createFixture();
    const outsideRunRoot = path.join(fixture.tempRoot, "outside-run");
    const linkedRunRoot = path.join(fixture.repo, "runs", fixture.runId);

    try {
      fs.rmSync(fixture.runRoot, { recursive: true, force: true });
      fs.mkdirSync(outsideRunRoot, { recursive: true });
      fs.writeFileSync(path.join(outsideRunRoot, "marker.txt"), "external Run\n", "utf8");
      fs.symlinkSync(
        outsideRunRoot,
        linkedRunRoot,
        process.platform === "win32" ? "junction" : "dir",
      );

      const result = runBash(fixture.repo, ["--dry-run"]);
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Refusing to inspect symlink/reparse-point Run candidate");
      expect(fs.readFileSync(path.join(outsideRunRoot, "marker.txt"), "utf8")).toBe(
        "external Run\n",
      );
      expect(fs.existsSync(fixture.topLog)).toBe(true);
      expect(fs.lstatSync(linkedRunRoot).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  it.skipIf(!bashAvailable)(
    "Bash preview refuses a runs root symlink to the legacy Run tree",
    () => {
      const fixture = createFixture();
      const runsRoot = path.join(fixture.repo, "runs");
      const legacyRunsRoot = path.join(fixture.repo, ".codex", "runs");

      try {
        fs.rmSync(runsRoot, { recursive: true, force: true });
        fs.symlinkSync(legacyRunsRoot, runsRoot, process.platform === "win32" ? "junction" : "dir");

        const result = runBash(fixture.repo, ["--dry-run"]);
        expect(result.error).toBeUndefined();
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("Refusing to inspect symlink/reparse-point runs root");
        expect(fs.existsSync(path.join(fixture.legacyRunRoot, "marker.txt"))).toBe(true);
        expect(fs.existsSync(fixture.topLog)).toBe(true);
      } finally {
        fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!powerShellAvailable)(
    "PowerShell preview refuses an external reparse-point Run candidate",
    () => {
      const fixture = createFixture();
      const outsideRunRoot = path.join(fixture.tempRoot, "outside-run");
      const linkedRunRoot = path.join(fixture.repo, "runs", fixture.runId);

      try {
        fs.rmSync(fixture.runRoot, { recursive: true, force: true });
        fs.mkdirSync(outsideRunRoot, { recursive: true });
        fs.writeFileSync(path.join(outsideRunRoot, "marker.txt"), "external Run\n", "utf8");
        fs.symlinkSync(
          outsideRunRoot,
          linkedRunRoot,
          process.platform === "win32" ? "junction" : "dir",
        );

        const result = runPowerShell(fixture.repo, ["-DryRun"]);
        expect(result.error).toBeUndefined();
        expect(result.status).not.toBe(0);
        expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toContain(
          "Refusing to inspect symlink/reparse-point Run candidate",
        );
        expect(fs.readFileSync(path.join(outsideRunRoot, "marker.txt"), "utf8")).toBe(
          "external Run\n",
        );
        expect(fs.existsSync(fixture.topLog)).toBe(true);
        expect(fs.lstatSync(linkedRunRoot).isSymbolicLink()).toBe(true);
      } finally {
        fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!powerShellAvailable)(
    "PowerShell preview refuses a runs root reparse point to the legacy Run tree",
    () => {
      const fixture = createFixture();
      const runsRoot = path.join(fixture.repo, "runs");
      const legacyRunsRoot = path.join(fixture.repo, ".codex", "runs");

      try {
        fs.rmSync(runsRoot, { recursive: true, force: true });
        fs.symlinkSync(legacyRunsRoot, runsRoot, process.platform === "win32" ? "junction" : "dir");

        const result = runPowerShell(fixture.repo, ["-DryRun"]);
        expect(result.error).toBeUndefined();
        expect(result.status).not.toBe(0);
        expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toContain(
          "Refusing to inspect symlink/reparse-point runs root",
        );
        expect(fs.existsSync(path.join(fixture.legacyRunRoot, "marker.txt"))).toBe(true);
        expect(fs.existsSync(fixture.topLog)).toBe(true);
      } finally {
        fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
      }
    },
  );
});
