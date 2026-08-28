import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const collectorPath = path.join(repoRoot, "scripts", "collect-run-artifacts.py");

function runCollector(existingManifest: Record<string, unknown>, includeLegacyFiles = false) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-manifest-contract-"));
  const runId = `contract-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runRoot = path.join(tempRoot, runId);
  const manifestPath = path.join(runRoot, "run.json");
  fs.mkdirSync(runRoot, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(existingManifest)}\n`, "utf8");
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
    const result = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [collectorPath, "--run-id", runId, "--runs-root", tempRoot, "--manifest-path", manifestPath],
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, any>;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

describe("run manifest v2 contract", () => {
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
    ) as Record<string, any>;
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
});
