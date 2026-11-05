import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  runAiAssistedQaSpecCli,
  verifyModuleRunEvidence,
} from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const SOURCE_SHA = "a".repeat(40);
const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

it("issues distinct authorized course:run receipts from the fixed Playwright launcher", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-fresh-run-"));
  tempRoots.push(root);
  const moduleRoot = path.join(root, "workspace", "M07");
  fs.mkdirSync(moduleRoot, { recursive: true });
  fs.writeFileSync(
    path.join(moduleRoot, "repaired-assertion.spec.ts"),
    [
      'import { expect, test } from "@playwright/test";',
      'test("valid learner assertion", async ({ page }) => {',
      '  await expect(page.getByRole("heading")).toBeVisible();',
      "});",
    ].join("\n"),
  );
  const workspaceRoot = path.join(root, "workspace");
  const scoring = {
    evaluation_policy: {
      execution_evidence: {
        schema_version: 1,
        kind: "playwright-run-record",
        required_runs: [
          {
            spec: "repaired-assertion.spec.ts",
            label: "after",
            minimum_tests: 1,
            expected_outcome: "passed",
          },
        ],
      },
    },
  };
  const verify = () =>
    verifyModuleRunEvidence({ workspaceRoot, moduleId: "M07", scoring, sourceSha: SOURCE_SHA });
  expect(verify().status).toBe("ungradable");

  const calls = [];
  const spawn = (launcher, args, options) => {
    calls.push({ launcher, args, options });
    expect(launcher).toBe(process.platform === "win32" ? "corepack.cmd" : "corepack");
    expect(args).toEqual([
      "pnpm",
      "exec",
      "playwright",
      "test",
      "repaired-assertion.spec.ts",
      "--config=playwright.ai-assisted-qa.config.ts",
      "--project=ai-assisted-qa-chromium",
      "--retries=0",
    ]);
    expect(options.cwd).toBe(root);
    expect(options.env.PLAYWRIGHT_TEST_ROOT).toBe(moduleRoot);
    const report = {
      config: { rootDir: moduleRoot },
      suites: [
        {
          specs: [
            {
              file: "repaired-assertion.spec.ts",
              title: "valid learner assertion",
              tests: [
                {
                  projectName: "ai-assisted-qa-chromium",
                  expectedStatus: "passed",
                  status: "expected",
                  results: [{ status: "passed", attachments: [] }],
                },
              ],
            },
          ],
        },
      ],
    };
    fs.writeFileSync(
      path.join(options.env.AI_QA_OUTPUT_ROOT, "playwright-result.json"),
      JSON.stringify(report),
    );
    return { status: 0, stdout: "", stderr: "" };
  };

  const args = ["M07", "repaired-assertion.spec.ts", "--label", "after"];
  const first = runAiAssistedQaSpecCli(args, { root, sourceSha: SOURCE_SHA, spawn });
  const second = runAiAssistedQaSpecCli(args, { root, sourceSha: SOURCE_SHA, spawn });
  expect(calls).toHaveLength(2);
  expect(first.receipt.run_id).not.toBe(second.receipt.run_id);
  expect(first.receipt.outcome).toBe("passed");
  expect(first.receipt.spec_sha256).toBe(second.receipt.spec_sha256);
  expect(fs.existsSync(first.receiptPath)).toBe(true);
  expect(fs.existsSync(second.receiptPath)).toBe(true);
  expect(verify().status).toBe("passed");

  const changed = JSON.parse(fs.readFileSync(second.receiptPath, "utf8"));
  changed.command = "manually asserted PASS";
  fs.writeFileSync(second.receiptPath, JSON.stringify(changed));
  expect(verify().status).toBe("ungradable");
});
