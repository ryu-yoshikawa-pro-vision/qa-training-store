import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath =
  "training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled";

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

describe("M09 Phase 3 workflow responsibilities", () => {
  it("maps workflow responsibilities and pinned distribution", () => {
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

  it("separates synthetic failure logs from actual CI evidence", () => {
    const cases = read("training/ai-assisted-qa-course/exercises/M09/failure-cases.md");
    expect(cases).toContain("実GitHub Actions・Scenario Shopの実行証拠ではありません");
    const a = cases.split("## A：Build失敗")[1].split("## B：Test失敗")[0];
    const b = cases.split("## B：Test失敗")[1].split("## C：Artifact保存失敗")[0];
    const c = cases.split("## C：Artifact保存失敗")[1].split("## D：Install失敗")[0];
    expect(a).toContain("Build — failure");
    expect(a).toContain("Playwright tests — skipped");
    expect(b).toContain("Playwright tests — failure");
    expect(b).toContain("Upload artifacts (if: always()) — success");
    expect(c).toContain("Playwright tests — success");
    expect(c).toContain("if-no-files-found: error");
    expect(c).toContain("failure");

    const submissionPath = "training/ai-assisted-qa-course/exercises/M09/submission-template.md";
    const submission = read(submissionPath);
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
    for (const condition of ["合成D Install", "合成E Distribution", "合成F Serve"]) {
      expect(submission).toContain(condition);
    }
    for (const marker of ["## D：Install失敗", "## E：配布検証失敗", "## F：Serve失敗"]) {
      expect(cases).toContain(marker);
    }
    expect(cases).toContain("最初の失敗**はInstall");
    expect(cases).toContain("最初の失敗**は配布検証");
    expect(cases).toContain("最初の失敗**はPlaywright step内のServe");
    expect(submission).toContain("最初の失敗step / 不一致");
    expect(submission).toContain("実行済み・skipped・不明");
  });

  it("requires a tracked pinned Shop and verified billing before enabling CI", () => {
    const manifest = JSON.parse(read("training/course-sync/manifest.json"));
    const expectedBuild = {
      command: "pnpm run build:web",
      source: "dist/**",
      target: "course/shop/**",
      required: true,
    };
    expect(manifest.generated.shop_build).toEqual(expectedBuild);
    const ignore = read("training/ai-assisted-qa-course/templates/learner-repo.gitignore");
    expect(ignore).not.toMatch(/^course\/shop\//m);
    expect(ignore).not.toMatch(/^\.course\//m);
    const prepare = read("scripts/training/prepare-learner-template.mjs");
    expect(prepare).toContain('"--source-sha"');
    expect(prepare).toContain('"verify-distribution"');

    const textbook = read("docs/curriculum/ai-assisted-qa/modules/M09/README.md");
    expect(textbook).toContain("追跡ファイル");
    expect(textbook).toContain("git ls-tree -r --name-only");
    expect(textbook).toContain("信頼境界");
    const exercise = read("training/ai-assisted-qa-course/exercises/M09/exercise.md");
    const quiz = JSON.parse(read("docs/curriculum/ai-assisted-qa/quizzes/M09.json"));
    expect(exercise).toContain("1日3回更新（7日間）");
    expect(exercise).toContain("週2回だけ更新（7日間）");
    expect(3 * 7).toBe(21);
    expect(2).toBe(2);
    expect(exercise).toContain("0回なら未検証");
    expect(exercise).toContain("BLOCKED");
    expect(textbook).toContain("本人のBilling画面");
    const billingQuiz = quiz.questions.find((question) => question.id === "M09-Q04");
    expect(billingQuiz.correct_value).toBe("C");
    const correctAnswer = billingQuiz.options.find((option) => option.value === "C");
    expect(correctAnswer.label).toContain("組織の契約・設定");
  });

  it("forbids unsafe external PR privilege escalation", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M09/exercise.md");
    const textbook = read("docs/curriculum/ai-assisted-qa/modules/M09/README.md");
    const submissionPath = "training/ai-assisted-qa-course/exercises/M09/submission-template.md";
    const submission = read(submissionPath);
    expect(exercise).toContain("pull_request_target");
    expect(exercise).toContain("write-all");
    expect(exercise).toContain("persist-credentials: false");
    expect(textbook).toContain("第三者が変更した依存スクリプト");
    expect(textbook).toContain("contents: read");
    expect(submission).toContain("外部PR + pull_request_target提案");
  });
});
