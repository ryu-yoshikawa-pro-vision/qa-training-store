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

test.describe("AI協働QAの公開クイズ画面", () => {
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
});
