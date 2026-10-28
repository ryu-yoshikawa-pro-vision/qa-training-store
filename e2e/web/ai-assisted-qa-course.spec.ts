import fs from "node:fs";
import path from "node:path";
import axeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const repositoryRoot = process.cwd();
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim();
if (executablePath) test.use({ launchOptions: { executablePath } });

async function chooseCorrectAnswers(
  page: import("@playwright/test").Page,
  quiz: { questions: { correct_value: string }[] },
): Promise<void> {
  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index];
    if (question === undefined) throw new Error(`問題 ${index + 1} がありません`);
    await page.locator('input[type="radio"]').nth("ABCD".indexOf(question.correct_value)).check();
    if (index + 1 < quiz.questions.length) await page.getByRole("button", { name: "次へ" }).click();
  }
}

function readQuiz(moduleId: string): { questions: { correct_value: string }[] } {
  return JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`),
      "utf8",
    ),
  ) as { questions: { correct_value: string }[] };
}

async function expectCoursePageAccessible(page: import("@playwright/test").Page): Promise<void> {
  const accessibility = await new axeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
}

const moduleIds = Array.from({ length: 11 }, (_, index) => `M${String(index).padStart(2, "0")}`);

test.describe("AI協働QAの公開クイズ画面", () => {
  for (const moduleId of moduleIds) {
    test(`${moduleId}の全問題を完了し、採点・復習を表示する`, async ({ page }) => {
      const quiz = readQuiz(moduleId);
      await page.goto(`/docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.html`);
      await expect(page.getByRole("heading", { name: `${moduleId}の確認クイズ` })).toBeVisible();
      await expect(page.locator(".primary-navigation a[aria-current='page']")).toContainText(
        moduleId,
      );
      await expect(page.locator(".module-progress")).toContainText(moduleId);
      await expect(page.locator(".module-pager")).toBeVisible();
      expect(await page.locator("body").innerText()).not.toContain("SHA-256:");
      expect(await page.locator("body").innerText()).not.toMatch(/[a-f0-9]{64}/i);
      await page.getByRole("button", { name: "回答を始める" }).click();
      await expect(page.getByText(`第1問 / 全${quiz.questions.length}問`)).toBeVisible();
      await expectCoursePageAccessible(page);
      await chooseCorrectAnswers(page, quiz);
      await page.getByRole("button", { name: "結果を確認" }).click();
      await expect(
        page.getByText(`${quiz.questions.length} / ${quiz.questions.length}問正解（100%）`),
      ).toBeVisible();
      await expect(page.locator(".result-question")).toHaveCount(quiz.questions.length);
      await expect(page.getByRole("link", { name: "教材の復習先" }).first()).toBeVisible();
    });
  }

  test("全教材・全クイズをdesktop/mobileで表示し、導線・アクセシビリティ・横幅を確認する", async ({
    page,
  }) => {
    for (let index = 0; index < moduleIds.length; index += 1) {
      const moduleId = moduleIds[index];
      if (moduleId === undefined) throw new Error(`モジュール ${index} がありません`);
      await page.setViewportSize({ width: 1365, height: 900 });
      await page.goto(`/docs/curriculum/ai-assisted-qa/modules/${moduleId}/`);
      await expect(page.locator(".module-progress")).toContainText(moduleId);
      await expect(page.locator(".primary-navigation a[aria-current='page']")).toContainText(
        moduleId,
      );
      await expect(
        page.locator(".course-resources a[href*='/resources/training/']").first(),
      ).toBeVisible();
      await expect(page.locator(".module-pager")).toBeVisible();
      const images = page.locator(".document-body img");
      await expect(images).toHaveCount(
        moduleId === "M03"
          ? 3
          : moduleId === "M00" || moduleId === "M01" || moduleId === "M05"
            ? 3
            : 2,
      );
      expect(
        await images.evaluateAll((nodes) =>
          nodes.every(
            (node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
          ),
        ),
      ).toBe(true);
      await expectCoursePageAccessible(page);
      const visibleText = await page.locator("body").innerText();
      expect(visibleText).not.toContain("SHA-256:");
      expect(visibleText).not.toContain("source_sha");
      expect(visibleText).not.toContain("spec_sha256");
      expect(visibleText).not.toMatch(/[a-f0-9]{64}/i);

      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.locator(".mobile-primary-navigation")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expectCoursePageAccessible(page);
    }

    for (const moduleId of moduleIds) {
      const quiz = readQuiz(moduleId);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.html`);
      await expect(page.locator(".module-progress")).toContainText(moduleId);
      await page.getByRole("button", { name: "回答を始める" }).click();
      await expect(page.getByText(`第1問 / 全${quiz.questions.length}問`)).toBeVisible();
      await expectCoursePageAccessible(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const visibleText = await page.locator("body").innerText();
      expect(visibleText).not.toContain("SHA-256:");
      expect(visibleText).not.toContain("source_sha");
      expect(visibleText).not.toContain("spec_sha256");
      await chooseCorrectAnswers(page, quiz);
      await page.getByRole("button", { name: "結果を確認" }).click();
      await expect(page.locator(".result-question")).toHaveCount(quiz.questions.length);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expectCoursePageAccessible(page);
    }
  });

  test("M00/M01/M03/M05の教材とクイズをdesktop/mobileで撮影する", async ({ page }) => {
    const screenshotDirectory = path.join(repositoryRoot, "output", "playwright", "ai-assisted-qa");
    fs.mkdirSync(screenshotDirectory, { recursive: true });

    for (const moduleId of ["M00", "M01", "M03", "M05"]) {
      await page.setViewportSize({ width: 1365, height: 900 });
      await page.goto(`/docs/curriculum/ai-assisted-qa/modules/${moduleId}/`);
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-lesson-desktop.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-lesson-mobile.png`),
        fullPage: true,
      });

      await page.setViewportSize({ width: 1365, height: 900 });
      await page.goto(`/docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.html`);
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-quiz-start-desktop.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: "回答を始める" }).click();
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-quiz-question-desktop.png`),
        fullPage: true,
      });
      const quiz = readQuiz(moduleId);
      await chooseCorrectAnswers(page, quiz);
      await expect(page.getByRole("button", { name: "結果を確認" })).toBeEnabled();
      await page.getByRole("button", { name: "結果を確認" }).click();
      await expect(page.locator(".result-question")).toHaveCount(quiz.questions.length);
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-quiz-result-desktop.png`),
        fullPage: true,
      });

      await page.evaluate((id) => localStorage.removeItem(`ai-assisted-qa-quiz:${id}`), moduleId);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.reload();
      await expect(page.getByRole("button", { name: "回答を始める" })).toBeVisible();
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-quiz-start-mobile.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: "回答を始める" }).click();
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-quiz-question-mobile.png`),
        fullPage: true,
      });
      await chooseCorrectAnswers(page, quiz);
      await expect(page.getByRole("button", { name: "結果を確認" })).toBeEnabled();
      await page.getByRole("button", { name: "結果を確認" }).click();
      await expect(page.locator(".result-question")).toHaveCount(quiz.questions.length);
      await page.screenshot({
        path: path.join(screenshotDirectory, `${moduleId}-quiz-result-mobile.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  });

  test("一問ずつ回答し、全問終了後に結果・解説・復習先を表示して再開できる", async ({ page }) => {
    const quiz = readQuiz("M02");
    await page.goto("/docs/curriculum/ai-assisted-qa/quizzes/M02.html");
    await page.getByRole("button", { name: "回答を始める" }).click();

    await expect(page.getByText(`第1問 / 全${quiz.questions.length}問`)).toBeVisible();
    await expect(page.getByText("この条件での理由:")).toHaveCount(0);
    await chooseCorrectAnswers(page, quiz);
    await expect(page.getByRole("button", { name: "結果を確認" })).toBeEnabled();
    await page.getByRole("button", { name: "結果を確認" }).click();
    await expect(
      page.getByText(`${quiz.questions.length} / ${quiz.questions.length}問正解（100%）`),
    ).toBeVisible();
    await expect(page.getByText("この条件での理由:").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "教材の復習先" }).first()).toHaveAttribute(
      "href",
      "/docs/curriculum/ai-assisted-qa/modules/M02/#例カート数量の上限",
    );

    await page.reload();
    await expect(
      page.getByText(`${quiz.questions.length} / ${quiz.questions.length}問正解（100%）`),
    ).toBeVisible();
  });

  test("未回答の問題を飛ばせない", async ({ page }) => {
    const quiz = readQuiz("M03");
    await page.goto("/docs/curriculum/ai-assisted-qa/quizzes/M03.html");
    await page.getByRole("button", { name: "回答を始める" }).click();
    await page.getByRole("button", { name: "次へ" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "回答を1つ選んでから進んでください" }),
    ).toBeVisible();
    await expect(page.getByText(`第1問 / 全${quiz.questions.length}問`)).toBeVisible();
  });

  test("クイズのJSON版が変わると保存回答を引き継がない", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "ai-assisted-qa-quiz:M05",
        JSON.stringify({
          revision: "sha256:outdated",
          answers: { "M05-Q01": "A" },
          currentIndex: 1,
          resultStatus: "in_progress",
        }),
      );
    });
    await page.goto("/docs/curriculum/ai-assisted-qa/quizzes/M05.html");
    await expect(
      page.getByText(
        "クイズの版が更新されたため、以前の回答は引き継ぎません。新しい版で始めてください。",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "回答を始める" })).toBeVisible();
  });

  test("同じ版の途中回答だけをモジュール単位で保存し、続きから再開できる", async ({ page }) => {
    const quiz = readQuiz("M05");
    await page.goto("/docs/curriculum/ai-assisted-qa/quizzes/M05.html");
    await page.getByRole("button", { name: "回答を始める" }).click();
    await page.locator('input[type="radio"]').nth(1).check();
    await page.getByRole("button", { name: "次へ" }).click();

    const savedKeys = await page.evaluate(() => {
      const stored = localStorage.getItem("ai-assisted-qa-quiz:M05");
      if (stored === null) return [];
      return Object.keys(JSON.parse(stored)).sort();
    });
    expect(savedKeys).toEqual(["answers", "currentIndex", "resultStatus", "revision"]);

    await page.reload();
    await page.getByRole("button", { name: "続きから再開（第2問）" }).click();
    await expect(page.getByText(`第2問 / 全${quiz.questions.length}問`)).toBeVisible();
    await page.getByRole("button", { name: "前へ" }).click();
    await expect(page.locator('input[type="radio"]').nth(1)).toBeChecked();
  });

  test("375px幅でキーボード操作でき、横スクロールとWCAG 2.1 AA違反がない", async ({ page }) => {
    const quiz = readQuiz("M06");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/docs/curriculum/ai-assisted-qa/quizzes/M06.html");
    await page.getByRole("button", { name: "回答を始める" }).click();
    await page.locator('input[type="radio"]').first().focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(page.getByText(`第2問 / 全${quiz.questions.length}問`)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const accessibility = await new axeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  });

  test("形式が壊れたJSONを受け入れず、クイズ開始を拒否する", async ({ page }) => {
    await page.route("**/M10.json", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          schema_version: 1,
          module_id: "M10",
          questions: [{ id: "M10-Q01", question: "broken", options: [] }],
        }),
      }),
    );
    await page.goto("/docs/curriculum/ai-assisted-qa/quizzes/M10.html");
    await expect(page.getByRole("alert")).toContainText("クイズデータの形式が正しくありません");
    await expect(page.getByRole("button", { name: "回答を始める" })).toHaveCount(0);
  });
});
