import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildCodexInvocationArgs,
  buildCodexOtelMetricsExporterConfig,
  quoteCodexShellArgument,
  TRIGGER_EVAL_MODEL,
} from "../../scripts/evals/run-skill-trigger-evals";

const temporaryRoots: string[] = [];
const windowsIt = process.platform === "win32" ? it : it.skip;

function createTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "codex-argv-contract-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Codex OTel argv contract", () => {
  it("includes the fixed Trigger Eval model and preserves the process flags", () => {
    const targetRoot = "C:\\routing-target";
    const endpoint = "http://127.0.0.1:12345/v1/metrics";
    expect(buildCodexInvocationArgs(targetRoot, endpoint)).toEqual([
      "exec",
      "--model",
      TRIGGER_EVAL_MODEL,
      "--json",
      "--ephemeral",
      "--sandbox",
      "read-only",
      "-C",
      targetRoot,
      "-c",
      quoteCodexShellArgument(buildCodexOtelMetricsExporterConfig(endpoint)),
      "-",
    ]);
  });

  it("uses TOML literal strings for values that must survive cmd.exe", () => {
    expect(buildCodexOtelMetricsExporterConfig("http://127.0.0.1:12345/v1/metrics")).toBe(
      "otel.metrics_exporter={otlp-http={endpoint='http://127.0.0.1:12345/v1/metrics',protocol='json'}}",
    );
  });

  windowsIt("preserves the OTel -c value through cmd.exe and a .cmd launcher", () => {
    const root = createTemporaryRoot();
    writeFileSync(join(root, "fixture.cmd"), "@echo off\r\necho %~1\r\necho %~2\r\n", "utf8");
    const config = buildCodexOtelMetricsExporterConfig("http://127.0.0.1:12345/v1/metrics");

    const result = spawnSync("fixture.cmd", ["-c", quoteCodexShellArgument(config)], {
      cwd: root,
      encoding: "utf8",
      shell: process.env.ComSpec ?? "cmd.exe",
      windowsHide: true,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout.split(/\r?\n/u).filter((line) => line.length > 0)).toEqual(["-c", config]);
  });
});
