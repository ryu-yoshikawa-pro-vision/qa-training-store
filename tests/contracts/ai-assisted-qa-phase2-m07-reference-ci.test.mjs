import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateM07Report } from "./ai-assisted-qa-phase2-m07-reference-ci.mjs";

const beforeRoot = "training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-before";
const beforeNames = ["追加したマグは数量1", "数量を2へ変更できる"];
const afterNames = [...beforeNames, "数量2への変更はカートを開き直しても維持される"];
const temporary = [];

afterEach(() => {
  for (const directory of temporary.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** Model the documented Playwright JSON format: one specs[] entry per individual test. */
function fixture(names, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pr215-m07-json-"));
  temporary.push(directory);
  const file = path.join(directory, "result.json");
  const result = {
    config: { rootDir: overrides.root ?? path.resolve(beforeRoot) },
    suites: [
      {
        specs: names.map((name) => ({
          title: name,
          file: overrides.file ?? "cart.spec.ts",
          tests: [
            {
              projectName: overrides.project ?? "ai-assisted-qa-chromium",
              expectedStatus: overrides.expected ?? "passed",
              results: (overrides.results ?? ["passed"]).map((status) => ({ status })),
            },
          ],
        })),
      },
    ],
    stats: {
      expected: names.length,
      unexpected: overrides.unexpected ?? 0,
      skipped: overrides.skipped ?? 0,
      flaky: overrides.flaky ?? 0,
    },
  };
  fs.writeFileSync(file, JSON.stringify(result));
  return file;
}

describe("M07保守前後の専用Chromium結果の検証", () => {
  it("保守前2件が同じspecに含まれるJSONを受理する", () => {
    expect(validateM07Report(fixture(beforeNames), beforeRoot, beforeNames)).toBe(2);
  });

  it("保守後3件の業務テスト名をそれぞれ検証する", () => {
    expect(validateM07Report(fixture(afterNames), beforeRoot, afterNames)).toBe(3);
  });

  it("3件目欠落や別名のtestを拒否する", () => {
    expect(() => validateM07Report(fixture(beforeNames), beforeRoot, afterNames)).toThrow();
    const wrongNames = [...beforeNames, "単純なreloadだけで成功"];
    expect(() => validateM07Report(fixture(wrongNames), beforeRoot, afterNames)).toThrow(
      "test names",
    );
  });

  it("別spec・別rootDir・別project・skip・retry・期待失敗を拒否する", () => {
    const scenarios = [
      { file: "other.spec.ts" },
      { root: path.resolve("training/playwright") },
      { project: "training-chromium" },
      { results: ["skipped"] },
      { results: ["failed", "passed"] },
      { expected: "failed" },
      { unexpected: 1 },
      { skipped: 1 },
      { flaky: 1 },
    ];
    for (const overrides of scenarios) {
      const file = fixture(afterNames, overrides);
      expect(() => validateM07Report(file, beforeRoot, afterNames)).toThrow();
    }
  });

  it("report不在を成功としない", () => {
    expect(() =>
      validateM07Report(
        path.join(os.tmpdir(), "pr215-m07-not-created-" + process.pid, "result.json"),
        beforeRoot,
        beforeNames,
      ),
    ).toThrow("report is missing");
  });
});
