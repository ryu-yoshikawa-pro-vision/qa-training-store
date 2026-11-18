import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const collectorPath = path.join(repoRoot, "scripts", "collect-run-artifacts.py");
let runCounter = 0;

function nextRunId() {
  runCounter += 1;
  return `20261117-${String(runCounter).padStart(6, "0")}-JST`;
}

function copyCollectorToFixture(tempRoot: string) {
  const scriptsRoot = path.join(tempRoot, "scripts");
  const fixtureCollectorPath = path.join(scriptsRoot, "collect-run-artifacts.py");
  fs.mkdirSync(scriptsRoot, { recursive: true });
  fs.copyFileSync(collectorPath, fixtureCollectorPath);
  return fixtureCollectorPath;
}

type Manifest = {
  [key: string]: unknown;
  schema_version?: number;
  safety: Record<string, unknown>;
  artifact_summary: Record<string, unknown>;
  validation: Record<string, unknown>;
};

function runCollector(
  existingManifest: Record<string, unknown>,
  includeLegacyFiles = false,
  baseManifest?: Record<string, unknown>,
  refreshGitChangedFiles = false,
  includeEvaluation = false,
) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-manifest-contract-"));
  const fixtureCollectorPath = copyCollectorToFixture(tempRoot);
  const runId = nextRunId();
  const runsRoot = path.join(tempRoot, "runs");
  const runRoot = path.join(runsRoot, runId);
  const manifestPath = path.join(runRoot, "run.json");
  const baseManifestPath = path.join(tempRoot, "base-manifest.json");
  fs.mkdirSync(runRoot, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(existingManifest)}\n`, "utf8");
  if (includeEvaluation) {
    fs.writeFileSync(
      path.join(runRoot, "evaluation.json"),
      `${JSON.stringify({ run_id: runId, primary_failure_category: null })}\n`,
      "utf8",
    );
  }
  if (baseManifest) {
    fs.writeFileSync(baseManifestPath, `${JSON.stringify(baseManifest)}\n`, "utf8");
  }
  if (includeLegacyFiles) {
    fs.mkdirSync(path.join(runRoot, "subagents"), { recursive: true });
    fs.writeFileSync(
      path.join(runRoot, "subagents", "legacy.json"),
      JSON.stringify({
        parent_run_id: runId,
        mode: "writable",
        changed_files: ["must-not-be-collected.txt"],
        agent: { name: "legacy-agent" },
      }),
      "utf8",
    );
    fs.mkdirSync(path.join(tempRoot, "observations"), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, "observations", "hooks.jsonl"),
      JSON.stringify({ run_id: runId, event: "SafetyBlocked", blocking: true }) + "\n",
      "utf8",
    );
  }

  try {
    const args = [
      fixtureCollectorPath,
      "--run-id",
      runId,
      "--runs-root",
      runsRoot,
      "--manifest-path",
      manifestPath,
    ];
    if (baseManifest) {
      args.push("--base-manifest", baseManifestPath);
    }
    if (refreshGitChangedFiles) {
      args.push("--refresh-git-changed-files");
    }
    const result = spawnSync(process.platform === "win32" ? "python" : "python3", args, {
      cwd: tempRoot,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runGit(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr ?? result.stdout}`);
  }
}

function runCollectorInTemporaryGitRepository() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-manifest-git-contract-"));
  const temporaryCollectorPath = path.join(tempRoot, "scripts", "collect-run-artifacts.py");
  const runId = nextRunId();
  const runRoot = path.join(tempRoot, "runs", runId);
  const manifestPath = path.join(runRoot, "run.json");
  const stagedPath = "staged 日本語 file.txt";
  const unstagedPath = "unstaged 日本語 file.txt";
  const duplicatePath = "duplicate file.txt";
  const untrackedPath = "untracked 日本語 file.txt";
  const ignoredLegacyRunPath = path.join(".codex", "runs", "observed", "ignored file.txt");
  const ignoredRunPath = path.join("runs", "observed", "ignored file.txt");

  fs.mkdirSync(path.dirname(temporaryCollectorPath), { recursive: true });
  fs.copyFileSync(collectorPath, temporaryCollectorPath);
  fs.writeFileSync(path.join(tempRoot, stagedPath), "initial\n", "utf8");
  fs.writeFileSync(path.join(tempRoot, unstagedPath), "initial\n", "utf8");
  fs.writeFileSync(path.join(tempRoot, duplicatePath), "initial\n", "utf8");
  runGit(tempRoot, ["init", "--quiet"]);
  runGit(tempRoot, ["add", "."]);
  runGit(tempRoot, [
    "-c",
    "user.name=Codex Contract",
    "-c",
    "user.email=codex-contract@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "initial",
  ]);

  fs.writeFileSync(path.join(tempRoot, stagedPath), "staged\n", "utf8");
  runGit(tempRoot, ["add", "--", stagedPath]);
  fs.writeFileSync(path.join(tempRoot, unstagedPath), "unstaged\n", "utf8");
  fs.writeFileSync(path.join(tempRoot, duplicatePath), "duplicate\n", "utf8");
  fs.writeFileSync(path.join(tempRoot, untrackedPath), "untracked\n", "utf8");
  fs.mkdirSync(path.dirname(path.join(tempRoot, ignoredLegacyRunPath)), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, ignoredLegacyRunPath), "legacy-generated\n", "utf8");
  fs.mkdirSync(path.dirname(path.join(tempRoot, ignoredRunPath)), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, ignoredRunPath), "generated\n", "utf8");
  fs.mkdirSync(runRoot, { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({
      schema_version: 2,
      run_id: runId,
      status: "running",
      changed_files: [
        "existing.txt",
        ".codex/runs/legacy/old.json",
        "runs/legacy/new.json",
        stagedPath,
        duplicatePath,
      ],
      validation: { status: "not_run", commands: [], warnings: [] },
    })}\n`,
    "utf8",
  );

  try {
    const result = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [temporaryCollectorPath, "--run-id", runId, "--refresh-git-changed-files"],
      { cwd: tempRoot, encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(`collector failed: ${result.stderr ?? result.stdout}`);
    }
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCollectorWithoutGit() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-manifest-git-failure-"));
  const temporaryCollectorPath = path.join(tempRoot, "scripts", "collect-run-artifacts.py");
  const runId = nextRunId();
  const manifestPath = path.join(tempRoot, "runs", runId, "run.json");
  fs.mkdirSync(path.dirname(temporaryCollectorPath), { recursive: true });
  fs.copyFileSync(collectorPath, temporaryCollectorPath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ schema_version: 2, run_id: runId, changed_files: ["existing.txt"] })}\n`,
    "utf8",
  );

  try {
    return spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [
        temporaryCollectorPath,
        "--run-id",
        runId,
        "--manifest-path",
        manifestPath,
        "--refresh-git-changed-files",
      ],
      { cwd: tempRoot, encoding: "utf8" },
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

describe("run manifest v2 contract", () => {
  it("defaults both collector wrappers to the repository runs directory", () => {
    const shellWrapper = fs.readFileSync(
      path.join(repoRoot, "scripts", "collect-run-artifacts.sh"),
      "utf8",
    );
    const powerShellWrapper = fs.readFileSync(
      path.join(repoRoot, "scripts", "collect-run-artifacts.ps1"),
      "utf8",
    );
    const collector = fs.readFileSync(collectorPath, "utf8");

    expect(shellWrapper).toContain('--runs-root "$script_dir/../runs"');
    expect(powerShellWrapper).toContain('Join-Path $PSScriptRoot "..\\runs"');
    expect(collector).toContain('expected_runs_root = canonical_repo_root / "runs"');
  });

  it("rejects external RunsRoot and manifest paths without changing the saved manifest", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-manifest-path-contract-"));
    const fixtureCollectorPath = copyCollectorToFixture(tempRoot);
    const runId = nextRunId();
    const runsRoot = path.join(tempRoot, "runs");
    const runRoot = path.join(runsRoot, runId);
    const manifestPath = path.join(runRoot, "run.json");
    const outsideRoot = path.join(tempRoot, "outside");
    const outsideManifestPath = path.join(outsideRoot, "run.json");
    const manifestContents = `${JSON.stringify({ run_id: runId, status: "preserve" })}\n`;
    fs.mkdirSync(runRoot, { recursive: true });
    fs.mkdirSync(outsideRoot, { recursive: true });
    fs.writeFileSync(manifestPath, manifestContents, "utf8");
    fs.writeFileSync(outsideManifestPath, "outside manifest stays untouched\n", "utf8");

    try {
      const command = process.platform === "win32" ? "python" : "python3";
      const outsideRootResult = spawnSync(
        command,
        [
          fixtureCollectorPath,
          "--run-id",
          runId,
          "--runs-root",
          outsideRoot,
          "--manifest-path",
          manifestPath,
        ],
        { cwd: tempRoot, encoding: "utf8" },
      );
      expect(outsideRootResult.status).not.toBe(0);
      expect(fs.readFileSync(manifestPath, "utf8")).toBe(manifestContents);

      const outsideManifestResult = spawnSync(
        command,
        [
          fixtureCollectorPath,
          "--run-id",
          runId,
          "--runs-root",
          runsRoot,
          "--manifest-path",
          outsideManifestPath,
        ],
        { cwd: tempRoot, encoding: "utf8" },
      );
      expect(outsideManifestResult.status).not.toBe(0);
      expect(fs.readFileSync(outsideManifestPath, "utf8")).toBe(
        "outside manifest stays untouched\n",
      );
      expect(fs.readFileSync(manifestPath, "utf8")).toBe(manifestContents);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("reads a relative base manifest outside the repository without modifying it", () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-manifest-external-base-contract-"),
    );
    const fixtureRoot = path.join(tempRoot, "repository");
    const fixtureCollectorPath = copyCollectorToFixture(fixtureRoot);
    const runId = nextRunId();
    const runRoot = path.join(fixtureRoot, "runs", runId);
    const manifestPath = path.join(runRoot, "run.json");
    const baseManifestPath = path.join(tempRoot, "base-manifest.json");
    const baseManifestContents = `${JSON.stringify({
      schema_version: 2,
      run_id: runId,
      status: "from-external-base",
      changed_files: ["base.txt"],
      validation: { status: "not_run", commands: [], warnings: [] },
    })}\n`;
    fs.mkdirSync(runRoot, { recursive: true });
    fs.writeFileSync(baseManifestPath, baseManifestContents, "utf8");

    try {
      const result = spawnSync(
        process.platform === "win32" ? "python" : "python3",
        [
          fixtureCollectorPath,
          "--run-id",
          runId,
          "--runs-root",
          path.join(fixtureRoot, "runs"),
          "--manifest-path",
          manifestPath,
          "--base-manifest",
          "../base-manifest.json",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );

      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(fs.readFileSync(manifestPath, "utf8"))).toMatchObject({
        run_id: runId,
        status: "from-external-base",
        changed_files: ["base.txt"],
      });
      expect(fs.readFileSync(baseManifestPath, "utf8")).toBe(baseManifestContents);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects a reparse-point RunsRoot before updating the Run manifest", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-manifest-reparse-contract-"));
    const fixtureCollectorPath = copyCollectorToFixture(tempRoot);
    const runId = nextRunId();
    const runsRoot = path.join(tempRoot, "runs");
    const outsideRoot = path.join(tempRoot, "outside-runs");
    const outsideRunRoot = path.join(outsideRoot, runId);
    const manifestPath = path.join(outsideRunRoot, "run.json");
    const manifestContents = `${JSON.stringify({ run_id: runId, status: "preserve" })}\n`;
    fs.mkdirSync(outsideRunRoot, { recursive: true });
    fs.writeFileSync(manifestPath, manifestContents, "utf8");
    fs.symlinkSync(outsideRoot, runsRoot, process.platform === "win32" ? "junction" : "dir");

    try {
      const result = spawnSync(
        process.platform === "win32" ? "python" : "python3",
        [
          fixtureCollectorPath,
          "--run-id",
          runId,
          "--runs-root",
          runsRoot,
          "--manifest-path",
          manifestPath,
        ],
        { cwd: tempRoot, encoding: "utf8" },
      );

      expect(result.status).not.toBe(0);
      expect(fs.readFileSync(manifestPath, "utf8")).toBe(manifestContents);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects a duplicate Run ID across new and legacy roots before changing either manifest", () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-manifest-duplicate-run-contract-"),
    );
    const fixtureCollectorPath = copyCollectorToFixture(tempRoot);
    const runId = nextRunId();
    const runsRoot = path.join(tempRoot, "runs");
    const newRunRoot = path.join(runsRoot, runId);
    const legacyRunRoot = path.join(tempRoot, ".codex", "runs", runId);
    const newManifestPath = path.join(newRunRoot, "run.json");
    const legacyManifestPath = path.join(legacyRunRoot, "run.json");
    const newManifestContents = '{"run_id":"new","status":"preserve-new"}\n';
    const legacyManifestContents = '{"run_id":"legacy","status":"preserve-legacy"}\n';
    fs.mkdirSync(newRunRoot, { recursive: true });
    fs.mkdirSync(legacyRunRoot, { recursive: true });
    fs.writeFileSync(newManifestPath, newManifestContents, "utf8");
    fs.writeFileSync(legacyManifestPath, legacyManifestContents, "utf8");

    try {
      const result = spawnSync(
        process.platform === "win32" ? "python" : "python3",
        [
          fixtureCollectorPath,
          "--run-id",
          runId,
          "--runs-root",
          runsRoot,
          "--manifest-path",
          newManifestPath,
        ],
        { cwd: tempRoot, encoding: "utf8" },
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Ambiguous Run ID");
      expect(fs.readFileSync(newManifestPath, "utf8")).toBe(newManifestContents);
      expect(fs.readFileSync(legacyManifestPath, "utf8")).toBe(legacyManifestContents);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects a reparse-point evaluation path without changing the Run manifest", () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "codex-manifest-evaluation-link-contract-"),
    );
    const fixtureCollectorPath = copyCollectorToFixture(tempRoot);
    const runId = nextRunId();
    const runsRoot = path.join(tempRoot, "runs");
    const runRoot = path.join(runsRoot, runId);
    const manifestPath = path.join(runRoot, "run.json");
    const evaluationPath = path.join(runRoot, "evaluation.json");
    const outsideEvaluationRoot = path.join(tempRoot, "outside-evaluation");
    const outsideEvaluationPath = path.join(outsideEvaluationRoot, "evaluation.json");
    const manifestContents = `${JSON.stringify({ run_id: runId, status: "preserve" })}\n`;
    const evaluationContents = '{"run_id":"outside","result":"preserve"}\n';
    fs.mkdirSync(runRoot, { recursive: true });
    fs.mkdirSync(outsideEvaluationRoot, { recursive: true });
    fs.writeFileSync(manifestPath, manifestContents, "utf8");
    fs.writeFileSync(outsideEvaluationPath, evaluationContents, "utf8");
    fs.symlinkSync(
      outsideEvaluationRoot,
      evaluationPath,
      process.platform === "win32" ? "junction" : "dir",
    );

    try {
      const result = spawnSync(
        process.platform === "win32" ? "python" : "python3",
        [
          fixtureCollectorPath,
          "--run-id",
          runId,
          "--runs-root",
          runsRoot,
          "--manifest-path",
          manifestPath,
        ],
        { cwd: tempRoot, encoding: "utf8" },
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(
        "Run evaluation path must not contain a symlink or reparse point",
      );
      expect(fs.readFileSync(manifestPath, "utf8")).toBe(manifestContents);
      expect(fs.readFileSync(outsideEvaluationPath, "utf8")).toBe(evaluationContents);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("does not re-inject removed fields while processing an existing v2 manifest", () => {
    const manifest = runCollector({
      schema_version: 2,
      run_id: "legacy-run-id",
      agents_used: ["stale-agent"],
      hook_observations: { event_counts: { Stop: 4 } },
      subagents: { summary: { total: 4 } },
      safety: {
        network: true,
        scope_violation: false,
        delete_attempt_blocked: true,
        git_mutation_attempt_blocked: true,
      },
      artifact_summary: {
        codex_task_report_count: 9,
        hook_event_count: 4,
        subagent_run_count: 4,
        evaluation_present: false,
      },
      codex_task_reports: ["existing.report.json"],
      changed_files: ["existing.txt"],
      validation: { status: "passed", commands: [], warnings: [] },
    });

    expect(manifest.schema_version).toBe(2);
    expect(manifest).not.toHaveProperty("agents_used");
    expect(manifest).not.toHaveProperty("hook_observations");
    expect(manifest).not.toHaveProperty("subagents");
    expect(manifest.safety).toEqual({ network: true, scope_violation: false });
    expect(manifest.artifact_summary).toEqual({
      codex_task_report_count: 1,
      evaluation_present: false,
    });
  });

  it("keeps an existing v2 manifest at v2 when the base manifest is v1", () => {
    const manifest = runCollector(
      {
        schema_version: 2,
        run_id: "existing-v2-run-id",
        safety: { network: true, scope_violation: false },
        artifact_summary: { codex_task_report_count: 4, evaluation_present: false },
        codex_task_reports: ["existing.report.json"],
        changed_files: ["existing.txt"],
        validation: { status: "passed", commands: [], warnings: [] },
      },
      false,
      {
        schema_version: 1,
        agents_used: ["stale-agent"],
        hook_observations: { event_counts: { Stop: 4 } },
        subagents: { summary: { total: 4 } },
        safety: {
          delete_attempt_blocked: true,
          git_mutation_attempt_blocked: true,
          scope_violation: false,
        },
        artifact_summary: {
          hook_event_count: 4,
          subagent_run_count: 4,
          evaluation_present: false,
        },
      },
    );

    expect(manifest.schema_version).toBe(2);
    expect(manifest).not.toHaveProperty("agents_used");
    expect(manifest).not.toHaveProperty("hook_observations");
    expect(manifest).not.toHaveProperty("subagents");
    expect(manifest.safety).toEqual({ network: true, scope_violation: false });
    expect(manifest.artifact_summary).toEqual({
      codex_task_report_count: 1,
      evaluation_present: false,
    });
  });

  it("keeps an existing v2 manifest at v2 when the base manifest is v2", () => {
    const manifest = runCollector(
      {
        schema_version: 2,
        safety: { network: false, scope_violation: false },
        artifact_summary: { codex_task_report_count: 0, evaluation_present: false },
        validation: { status: "not_run", commands: [], warnings: [] },
      },
      false,
      {
        schema_version: 2,
        safety: { network: true, scope_violation: false },
        artifact_summary: { codex_task_report_count: 7, evaluation_present: false },
      },
    );

    expect(manifest.schema_version).toBe(2);
    expect(manifest).not.toHaveProperty("agents_used");
    expect(manifest).not.toHaveProperty("hook_observations");
    expect(manifest).not.toHaveProperty("subagents");
  });

  it("preserves existing v1 legacy values without rescanning old files", () => {
    const legacyAgents = ["legacy-agent"];
    const legacyHookObservations = { event_counts: { SafetyBlocked: 2 } };
    const legacySubagents = { records: [{ path: "legacy.json" }], summary: { total: 1 } };
    const manifest = runCollector(
      {
        schema_version: 1,
        run_id: "legacy-run-id",
        agents_used: legacyAgents,
        hook_observations: legacyHookObservations,
        subagents: legacySubagents,
        safety: {
          network: false,
          delete_attempt_blocked: true,
          git_mutation_attempt_blocked: false,
          scope_violation: false,
        },
        artifact_summary: {
          codex_task_report_count: 3,
          hook_event_count: 2,
          subagent_run_count: 1,
          evaluation_present: false,
        },
        codex_task_reports: ["legacy.report.json"],
        changed_files: ["legacy.txt"],
        validation: { status: "passed", commands: [], warnings: [] },
      },
      true,
      {
        schema_version: 2,
        agents_used: ["must-not-replace-v1"],
        hook_observations: { event_counts: { UserPromptSubmit: 9 } },
        subagents: { summary: { total: 9 } },
      },
    );

    expect(manifest.schema_version).toBe(1);
    expect(manifest.agents_used).toEqual(legacyAgents);
    expect(manifest.hook_observations).toEqual(legacyHookObservations);
    expect(manifest.subagents).toEqual(legacySubagents);
    expect(manifest.changed_files).toEqual(["legacy.txt"]);
    expect(manifest.safety.delete_attempt_blocked).toBe(true);
    expect(manifest.safety.git_mutation_attempt_blocked).toBe(false);
    expect(manifest.artifact_summary.hook_event_count).toBe(2);
    expect(manifest.artifact_summary.subagent_run_count).toBe(1);
    expect(manifest.validation.warnings).toEqual([]);
  });

  it("keeps every manifest writer on the v2 shape for new runs", () => {
    const template = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".codex", "templates", "RUN_MANIFEST.json"), "utf8"),
    ) as Manifest;
    const powershell = fs.readFileSync(path.join(repoRoot, "scripts", "codex-task.ps1"), "utf8");
    const shell = fs.readFileSync(path.join(repoRoot, "scripts", "codex-task.sh"), "utf8");

    expect(template.schema_version).toBe(2);
    expect(template).not.toHaveProperty("agents_used");
    expect(template).not.toHaveProperty("hook_observations");
    expect(template).not.toHaveProperty("subagents");
    expect(powershell).toContain("schema_version = 2");
    expect(shell).toContain('"schema_version": 2');
    expect(powershell).toContain("$existingIsV1");
    expect(shell).toContain('existing.get("schema_version") == 1');
  });

  it("keeps the existing changed_files list when refresh is not requested", () => {
    const manifest = runCollector({
      schema_version: 2,
      changed_files: ["existing.txt", ".codex/runs/legacy/old.json", "runs/legacy/new.json"],
      validation: { status: "not_run", commands: [], warnings: [] },
    });

    expect(manifest.changed_files).toEqual([
      "existing.txt",
      ".codex/runs/legacy/old.json",
      "runs/legacy/new.json",
    ]);
  });

  it("points evaluation_path at the new run root and clears stale paths when absent", () => {
    const withEvaluation = runCollector(
      {
        schema_version: 2,
        evaluation_path: ".codex/runs/legacy/evaluation.json",
        validation: { status: "not_run", commands: [], warnings: [] },
      },
      false,
      undefined,
      false,
      true,
    );
    expect(withEvaluation.evaluation_path).toBe(
      `runs/${String(withEvaluation.run_id)}/evaluation.json`,
    );

    const withoutEvaluation = runCollector({
      schema_version: 2,
      evaluation_path: ".codex/runs/legacy/evaluation.json",
      validation: { status: "not_run", commands: [], warnings: [] },
    });
    expect(withoutEvaluation.evaluation_path).toBeNull();
  });

  it("unions tracked and untracked Git paths while preserving existing paths", () => {
    const manifest = runCollectorInTemporaryGitRepository();
    const changedFiles = manifest.changed_files as string[];
    const expectedPaths = [
      "existing.txt",
      ".codex/runs/legacy/old.json",
      "runs/legacy/new.json",
      "staged 日本語 file.txt",
      "unstaged 日本語 file.txt",
      "duplicate file.txt",
      "untracked 日本語 file.txt",
    ];

    for (const expectedPath of expectedPaths) {
      expect(changedFiles.filter((value) => value === expectedPath)).toHaveLength(1);
    }
    expect(changedFiles).not.toContain(".codex/runs/observed/ignored file.txt");
    expect(changedFiles).not.toContain("runs/observed/ignored file.txt");
    expect(manifest.status).toBe("running");
  });

  it("returns a failure when Git refresh cannot execute", () => {
    const result = runCollectorWithoutGit();

    expect(result.status).not.toBe(0);
  });
});
