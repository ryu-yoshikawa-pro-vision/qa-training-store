import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateReport } from "./ai-assisted-qa-phase2-m06-reference-ci.mjs";

const project = "ai-assisted-qa-chromium";
const testRoot = path.resolve("training/ai-assisted-qa-course/assessment/playwright/M06");
const directories = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** Build a Playwright JSON fixture where each test has its own spec entry. */
function reportFile(groups, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pr215-m06-json-"));
  directories.push(directory);
  const file = path.join(directory, "playwright-result.json");
  const suites = groups.map(([fileName, testCount]) => ({
    title: fileName,
    file: fileName,
    specs: Array.from({ length: testCount }, (_, index) => ({
      file: fileName,
      title: "Case " + (index + 1),
      tests: [
        {
          projectName: overrides.project ?? project,
          expectedStatus: overrides.expectedStatus ?? "passed",
          results: (overrides.results ?? ["passed"]).map((status) => ({ status })),
        },
      ],
    })),
  }));
  fs.writeFileSync(
    file,
    JSON.stringify({ config: { rootDir: overrides.root ?? testRoot }, suites }),
  );
  return file;
}

describe("PR #215 M06公開参考spec JSON reportの受入検査", () => {
  it("同一specに3 testが並ぶ固定3件を正しく数える", () => {
    const file = reportFile([["cart-cases.spec.ts", 3]]);
    expect(validateReport(file, ["cart-cases.spec.ts"], 3)).toBe(3);
  });

  it("004/005の2 specを各1件ずつ検査する", () => {
    const file = reportFile([
      ["remove-item.spec.ts", 1],
      ["quantity-update.spec.ts", 1],
    ]);
    expect(validateReport(file, ["remove-item.spec.ts", "quantity-update.spec.ts"], 2)).toBe(2);
  });

  it("件数が一致していても別specへのすり替えを拒否する", () => {
    const file = reportFile([
      ["cart-cases.spec.ts", 2],
      ["unexpected.spec.ts", 1],
    ]);
    expect(() => validateReport(file, ["cart-cases.spec.ts"], 3)).toThrow(
      "unexpected or missing spec files",
    );
  });

  it("不正なrootDir、skip、期待失敗、retry、project違いを拒否する", () => {
    const tests = [
      { root: path.resolve("training/playwright") },
      { results: ["skipped"] },
      { expectedStatus: "failed" },
      { results: ["failed", "passed"] },
      { project: "training-chromium" },
    ];
    for (const overrides of tests) {
      const file = reportFile([["cart-cases.spec.ts", 3]], overrides);
      expect(() => validateReport(file, ["cart-cases.spec.ts"], 3)).toThrow();
    }
  });

  it("Playwright JSON reportが存在しない場合は失敗する", () => {
    const file = path.join(os.tmpdir(), "pr215-missing-" + process.pid, "result.json");
    expect(() => validateReport(file, ["cart-cases.spec.ts"], 3)).toThrow(
      "Playwright JSON report is missing",
    );
  });
});
