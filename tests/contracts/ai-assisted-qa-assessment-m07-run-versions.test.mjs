import { Buffer } from "node:buffer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  finalizeAssessment,
  sha256,
} from "../../scripts/training/ai-assisted-qa-assessment-core.mjs";
import { verifyModuleRunEvidence } from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const SOURCE_SHA = "a".repeat(40);
const RUN_IDS = ["123e4567-e89b-42d3-a456-426614174190", "123e4567-e89b-42d3-a456-426614174191"];
const beforeCode = [
  'import { test, expect } from "@playwright/test";',
  'test("mug quantity one", async ({ page }) => {',
  '  await expect(page.getByLabel("数量")).toHaveValue("1");',
  "});",
  'test("quantity two", async ({ page }) => {',
  '  await expect(page.getByLabel("数量")).toHaveValue("2");',
  "});",
].join("\n");
const afterCode = [
  beforeCode,
  'test("cart reentry retains two", async ({ page }) => {',
  '  await page.goto("/products/product-mug");',
  '  await page.goto("/cart");',
  '  await expect(page.getByLabel("数量")).toHaveValue("2");',
  "});",
].join("\n");
const tempDirs = [];
afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function setupM07Runs({ after = afterCode, afterStart = "2026-11-03T00:00:03Z" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qa-course-m07-runs-"));
  tempDirs.push(root);
  const workspaceRoot = path.join(root, "workspace");
  const moduleRoot = path.join(workspaceRoot, "M07");
  const specName = "maintenance.spec.ts";
  const specPath = path.join(moduleRoot, specName);
  fs.mkdirSync(moduleRoot, { recursive: true });
  const relative = (filepath) => path.relative(root, filepath).split(path.sep).join("/");
  const write = (index, code, started) => {
    const runId = RUN_IDS[index];
    const runDir = path.join(moduleRoot, "evidence", "runs", runId);
    fs.mkdirSync(runDir, { recursive: true });
    const bytes = Buffer.from(code);
    fs.writeFileSync(specPath, bytes);
    const snapshot = path.join(runDir, "spec-snapshot.ts");
    const reportFile = path.join(runDir, "playwright-result.json");
    fs.writeFileSync(snapshot, bytes);
    const titles =
      index === 0
        ? ["mug quantity one", "quantity two"]
        : ["mug quantity one", "quantity two", "cart reentry retains two"];
    const report = {
      config: { rootDir: moduleRoot },
      suites: [
        {
          specs: titles.map((title) => ({
            file: specName,
            title,
            tests: [
              {
                projectName: "ai-assisted-qa-chromium",
                expectedStatus: "passed",
                status: "expected",
                results: [{ status: "passed", attachments: [] }],
              },
            ],
          })),
        },
      ],
    };
    const reportBytes = Buffer.from(JSON.stringify(report));
    fs.writeFileSync(reportFile, reportBytes);
    const receipt = {
      schema_version: 1,
      kind: "ai-assisted-qa-playwright-run",
      producer: "course:run",
      run_id: runId,
      module_id: "M07",
      source_sha: SOURCE_SHA,
      spec_path: "workspace/M07/" + specName,
      spec_sha256: sha256(bytes),
      source_snapshot_path: relative(snapshot),
      source_snapshot_sha256: sha256(bytes),
      label: index === 0 ? "before" : "after",
      project: "ai-assisted-qa-chromium",
      command: [
        "pnpm",
        "exec",
        "playwright",
        "test",
        specName,
        "--config=playwright.ai-assisted-qa.config.ts",
        "--project=ai-assisted-qa-chromium",
        "--retries=0",
      ].join(" "),
      started_at: started,
      finished_at: new Date(Date.parse(started) + 1000).toISOString(),
      exit_code: 0,
      outcome: "passed",
      report_path: relative(reportFile),
      report_sha256: sha256(reportBytes),
      tests: titles.map((title) => ({
        title,
        status: "passed",
        expected_status: "passed",
      })),
      attachments: [],
      spec_unchanged_during_run: true,
      environment_error: null,
    };
    fs.writeFileSync(path.join(runDir, "run-evidence.json"), JSON.stringify(receipt));
  };
  write(0, beforeCode, "2026-11-03T00:00:00Z");
  write(1, after, afterStart);
  const scoring = {
    evaluation_policy: {
      execution_evidence: {
        schema_version: 1,
        kind: "playwright-run-record",
        required_runs: [
          {
            spec: specName,
            label: "before",
            minimum_tests: 2,
            expected_outcome: "passed",
          },
          {
            spec: specName,
            label: "after",
            minimum_tests: 3,
            expected_outcome: "passed",
          },
        ],
      },
    },
  };
  const verify = () =>
    verifyModuleRunEvidence({ workspaceRoot, moduleId: "M07", scoring, sourceSha: SOURCE_SHA });
  return { verify, specPath, scoring };
}

it("accepts a verified archived M07 before PASS with a changed current after spec", () => {
  const { verify } = setupM07Runs();
  const result = verify();
  expect(result.status).toBe("passed");
  expect(result.checks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "M07-RUN-maintenance.spec.ts-before",
        status: "passed",
        test_count: 2,
      }),
      expect.objectContaining({
        id: "M07-RUN-maintenance.spec.ts-after",
        status: "passed",
        test_count: 3,
      }),
      expect.objectContaining({
        id: "M07-BEFORE-AFTER-maintenance.spec.ts",
        status: "passed",
        code_changed: true,
        runs_are_separate_and_ordered: true,
      }),
    ]),
  );
});

it("rejects a changed after file, unmodified before/after pair and reversed run ordering", () => {
  const current = setupM07Runs();
  fs.writeFileSync(current.specPath, beforeCode);
  expect(current.verify().status).toBe("ungradable");
  const identical = setupM07Runs({ after: beforeCode });
  expect(identical.verify().status).toBe("ungradable");
  const reversed = setupM07Runs({ afterStart: "2026-11-02T00:00:00Z" });
  expect(reversed.verify().status).toBe("ungradable");
});

it("does not exempt unpaired before runs from current spec matching", () => {
  const { verify, specPath, scoring } = setupM07Runs();
  scoring.evaluation_policy.execution_evidence.required_runs.pop();
  fs.writeFileSync(specPath, afterCode);
  const result = verify();
  expect(result.status).toBe("ungradable");
});

it("rejects a fabricated passing M07 after report without a business assertion", () => {
  const emptyAfter = [
    beforeCode,
    'test("cart reentry retains two", async ({ page }) => {',
    '  await page.goto("/cart");',
    "});",
  ].join("\n");
  const { verify } = setupM07Runs({ after: emptyAfter });
  const result = verify();
  expect(result.status).toBe("ungradable");
  expect(result.reasons.join(" ")).toMatch(/business assertion/);
});

it("rejects a PASS report whose test title is absent from the saved M07 spec", () => {
  const renamed = afterCode.replace("cart reentry retains two", "new cart behavior");
  const { verify } = setupM07Runs({ after: renamed });
  const result = verify();
  expect(result.status).toBe("ungradable");
  expect(result.reasons.join(" ")).toMatch(/report test titles do not match/);
});

it("keeps invalid M07 Run evidence ungradable even if the AI asserts a passing Level", () => {
  const missingAssertion = [
    beforeCode,
    'test("cart reentry retains two", async ({ page }) => {',
    '  await page.goto("/cart");',
    "});",
  ].join("\n");
  const evidence = setupM07Runs({ after: missingAssertion }).verify();
  expect(evidence.status).toBe("ungradable");

  const candidate = {
    assessment_id: "123e4567-e89b-42d3-a456-426614174000",
    phase_id: "P2",
    completed: true,
    pass: true,
    objectives: [{ objective_id: "M07-05", status: "assessed", level: 3 }],
  };
  const final = finalizeAssessment({
    candidate,
    calibration: { id: "calibrated", status: "passed", critical_false_passes: 0, mismatches: [] },
    requiredObjectiveIds: ["M07-05"],
    sourceSha: SOURCE_SHA,
    versions: {
      attempt: 1,
      terminalModuleId: "M07",
      modelId: "opencode/example",
      openCodeVersion: "2.0.22",
    },
    inputSnapshot: [],
    deterministicChecks: evidence.checks,
    challenge: {
      id: "CH-P2",
      objective_ids: ["M07-05"],
      condition_sha256: "b".repeat(64),
      answer_sha256: "c".repeat(64),
    },
  });
  expect(final.completed).toBe(false);
  expect(final.status).toBe("ungradable");
});
