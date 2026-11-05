import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import {
  validateCourseWorkflow,
} from "../../scripts/training/ai-assisted-qa-github-run-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath =
  "training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled";
const testTarget = {
  test_file: "workspace/M07/repaired-assertion.spec.ts",
  test_root: "workspace/M07",
};

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

describe("M09 Phase 3 workflow responsibilities", () => {
  it("maps PR event, runner, verified distribution, browser, SHA, test and artifact steps", () => {
    const workflow = read(workflowPath);
    const parsed = parseDocument(workflow, { uniqueKeys: true }).toJS();
    expect(parsed.on).toEqual({ pull_request: null });
    expect(parsed.permissions).toEqual({ contents: "read" });

    const job = parsed.jobs["course-e2e"];
    expect(job["runs-on"]).toBe("ubuntu-latest");
    const steps = job.steps;
    expect(steps).toHaveLength(11);
    expect(steps[0].uses).toBe("actions/checkout@v4");
    expect(steps[0].with.ref).toBe("${{ github.event.pull_request.head.sha }}");
    expect(steps[0].with["persist-credentials"]).toBe(false);
    expect(steps[3].run).toBe("pnpm install --frozen-lockfile");
    expect(steps[4].run).toContain(
      "node scripts/training/ai-assisted-qa-course.mjs verify-distribution",
    );
    expect(steps[4].run).toContain("test -s course/shop/index.html");
    expect(steps[4].run).toContain("test -s .course/distribution-manifest.json");
    expect(steps[5].run).toBe("pnpm exec playwright install --with-deps chromium");
    expect(steps[7].env.EXPECTED_HEAD_SHA).toBe("${{ github.event.pull_request.head.sha }}");
    expect(steps[8].run).toContain("target-sha.txt");
    expect(steps[9].env).toEqual({
      PLAYWRIGHT_TEST_ROOT: "workspace/M07",
      PLAYWRIGHT_USE_PREBUILT_DIST: "true",
    });
    expect(steps[10].uses).toBe("actions/upload-artifact@v4");
    expect(steps[10].if).toBe("always()");
    expect(steps[10].with["if-no-files-found"]).toBe("error");
    expect(steps[10].with.path).toContain("playwright-result.json");
    expect(
      validateCourseWorkflow(workflow, ".github/workflows/course-e2e.yml", testTarget),
    ).toHaveProperty("check_name", "course-e2e");

    const config = read("playwright.ai-assisted-qa.config.ts");
    expect(config).toContain("verify-distribution");
    expect(config).toContain('process.env.PLAYWRIGHT_USE_PREBUILT_DIST = "true"');
    expect(config).toContain('"pnpm exec tsx scripts/serve-web-dist.ts"');
    expect(config).toContain('"pnpm run build:web && pnpm exec tsx scripts/serve-web-dist.ts"');
    expect(config).toContain('process.env.PLAYWRIGHT_USE_PREBUILT_DIST === "true"');
    const textbook = read("docs/curriculum/ai-assisted-qa/modules/M09/README.md");
    expect(textbook).toContain("actions/checkout");
    expect(textbook).toContain("取得・配置する機能ではありません");
    expect(textbook).toContain("BLOCKED");
  });

  it("rejects dangerous workflow changes before running untrusted PR code", () => {
    const workflow = read(workflowPath);
    const variants = [
      workflow.replace("  pull_request:", "  pull_request_target:"),
      workflow.replace("contents: read", "contents: write"),
      workflow.replace("persist-credentials: false", "persist-credentials: true"),
      workflow.replace("if: always()", "if: success()"),
      workflow.replace("if-no-files-found: error", "if-no-files-found: warn"),
      workflow.replace(
        'PLAYWRIGHT_USE_PREBUILT_DIST: "true"',
        'PLAYWRIGHT_USE_PREBUILT_DIST: "false"',
      ),
      workflow.replace(
        "node scripts/training/ai-assisted-qa-course.mjs verify-distribution",
        "pnpm run build:web",
      ),
      workflow.replace(
        "output/training/ai-assisted-qa/playwright-result.json",
        "output/training/ai-assisted-qa/secret.txt",
      ),
    ];
    for (const changed of variants) {
      expect(changed).not.toBe(workflow);
      expect(() =>
        validateCourseWorkflow(changed, ".github/workflows/course-e2e.yml", testTarget),
      ).toThrow();
    }
  });

  it("separates synthetic failure logs from actual CI evidence", () => {
    const cases = read("training/ai-assisted-qa-course/exercises/M09/failure-cases.md");
    expect(cases).toContain("実GitHub Actions・Scenario Shopの実行証拠ではありません");
    const a = cases.split("## A：Build失敗")[1].split("## B：Test失敗")[0];
    const b = cases.split("## B：Test失敗")[1].split("## C：Artifact保存失敗")[0];
    const c = cases.split("## C：Artifact保存失敗")[1].split("## 記録")[0];
    expect(a).toContain("Build — failure");
    expect(a).toContain("Playwright tests — skipped");
    expect(b).toContain("Playwright tests — failure");
    expect(b).toContain("Upload artifacts (if: always()) — success");
    expect(c).toContain("Playwright tests — success");
    expect(c).toContain("if-no-files-found: error");
    expect(c).toContain("failure");

    const submission = read(
      "training/ai-assisted-qa-course/exercises/M09/submission-template.md",
    );
    for (const condition of [
      "合成A Build",
      "合成B Test",
      "合成C Artifact",
      "別条件X Browser",
      "別条件Y Test",
      "別条件Z checkout SHA",
    ]) {
      expect(submission).toContain(condition);
    }
    expect(submission).toContain("最初の失敗step / 不一致");
    expect(submission).toContain("実行済み・skipped・不明");
  });
});
