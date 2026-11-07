#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const runId = new Date().toISOString().replaceAll(":", "-");
const diagnosticsRoot = path.join(root, "output/training/ai-assisted-qa/diagnostics", runId);
fs.mkdirSync(diagnosticsRoot, { recursive: true });

function run(spec, label, expectedStatus) {
  const outputRoot = path.join(diagnosticsRoot, label);
  const result = spawnSync(
    packageManager,
    [
      "exec",
      "playwright",
      "test",
      spec,
      "--config=playwright.ai-assisted-qa.config.ts",
      "--project=ai-assisted-qa-chromium",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PLAYWRIGHT_TEST_ROOT: "workspace/M07", AI_QA_OUTPUT_ROOT: outputRoot },
      shell: process.platform === "win32",
    },
  );
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  fs.writeFileSync(path.join(diagnosticsRoot, label + ".log"), stdout + stderr, "utf8");
  if (result.error) throw result.error;
  if (expectedStatus === "failed") {
    if (
      result.status === 0 ||
      !stdout.includes("M07-FAIL-CODE") ||
      !stdout.includes("M07_INTENTIONAL_ASSERTION_FAILURE")
    ) {
      throw new Error("想定したAssertion失敗を証拠で確認できません。診断ログを確認してください。");
    }
  } else if (result.status !== 0) {
    throw new Error("修正後の別Runが成功しませんでした。診断ログを確認してください。");
  }
}

run("failure-assertion.spec.ts", "before", "failed");
run("repaired-assertion.spec.ts", "after", "passed");
console.log("M07の修正前Assertion失敗と修正後の独立Runを確認しました: " + diagnosticsRoot);
