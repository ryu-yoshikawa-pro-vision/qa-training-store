import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import axeBuilder from "@axe-core/playwright";
import { chromium, expect as playwrightExpect, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAiAssistedQaSite } from "../../scripts/docs/build-ai-assisted-qa";
import { resolveAiAssistedQaPlaywrightSettings } from "../../scripts/training/ai-assisted-qa-playwright-settings";
import { validateAiAssistedQa } from "../../scripts/training/validate-ai-assisted-qa";

const repositoryRoot = process.cwd();
const outputRoot = fs.mkdtempSync(path.join(tmpdir(), "ai-assisted-qa-site-"));
const docsOutput = path.join(outputRoot, "docs");
let server: http.Server;
let browser: Browser;
let baseUrl: string;

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

async function chooseCorrectAnswers(
  page: Page,
  quiz: { questions: { correct_value: string }[] },
): Promise<void> {
  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index];
    if (question === undefined) throw new Error(`問題 ${index + 1} がありません`);
    await page.locator('input[type="radio"]').nth("ABCD".indexOf(question.correct_value)).check();
    if (index + 1 < quiz.questions.length) await page.getByRole("button", { name: "次へ" }).click();
  }
}

describe("AI-assisted QA Playwright boundary", () => {
  it("uses loopback port 8082 and only M06 or M07 workspace paths", () => {
    const settings = resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
      testRoot: "workspace/M07/specs",
    });
    expect(settings.baseUrl).toBe("http://127.0.0.1:8082");
    expect(settings.testDir).toBe(path.resolve("C:/training/course/workspace/M07/specs"));

    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        baseUrl: "https://127.0.0.1:8082",
      }),
    ).toThrow(/loopback HTTP 8082/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        baseUrl: "http://127.0.0.1:8081",
      }),
    ).toThrow(/loopback HTTP 8082/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        baseUrl: "http://user:secret@127.0.0.1:8082",
      }),
    ).toThrow(/loopback HTTP 8082/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: "training/playwright/exercises",
      }),
    ).toThrow(/workspace\/M06またはworkspace\/M07/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: "workspace/M06/../../training/playwright",
      }),
    ).toThrow(/workspace\/M06またはworkspace\/M07/);
  });
});

describe("AI-assisted QA knowledge graph", () => {
  it("validates the canonical learning-objective rows and ignores later summary references", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/training/knowledge-graph.mjs", "validate"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    const result = JSON.parse(output) as { ok?: boolean; objectives?: number };
    expect(result).toMatchObject({ ok: true, objectives: 51 });
  });
});

describe("AI-assisted QA static learning course", () => {
  beforeAll(async () => {
    const validation = validateAiAssistedQa(repositoryRoot);
    expect(validation.modules).toEqual(expect.arrayContaining(["M02", "M03", "M05", "M06"]));
    expect(validation.questionCount).toBeGreaterThan(0);
    buildAiAssistedQaSite(repositoryRoot, docsOutput);

    const siteRoot = path.join(docsOutput, "curriculum");
    server = http.createServer((request, response) => {
      let urlPath: string;
      try {
        urlPath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      } catch {
        response.writeHead(400).end("Bad Request");
        return;
      }
      const absolute = path.resolve(siteRoot, `.${urlPath}`);
      const relative = path.relative(siteRoot, absolute);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const filePath = fs.statSync(absolute, { throwIfNoEntry: false })?.isDirectory()
        ? path.join(absolute, "index.html")
        : absolute;
      if (!fs.existsSync(filePath)) {
        response.writeHead(404).end("Not Found");
        return;
      }
      response.writeHead(200, { "content-type": contentType(filePath) });
      response.end(fs.readFileSync(filePath));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim();
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    if (server?.listening)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    fs.rmSync(outputRoot, { recursive: true, force: true });
  });

  it("builds the staged course and pins the quiz revision to the exact JSON bytes", () => {
    expect(fs.existsSync(path.join(docsOutput, "curriculum/ai-assisted-qa/index.html"))).toBe(true);
    expect(
      fs.existsSync(path.join(docsOutput, "curriculum/ai-assisted-qa/modules/M02/index.html")),
    ).toBe(true);
    expect(fs.existsSync(path.join(docsOutput, "curriculum/ai-assisted-qa/quizzes/M02.html"))).toBe(
      true,
    );

    const quizBytes = fs.readFileSync(
      path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/quizzes/M02.json"),
    );
    const revision = createHash("sha256").update(quizBytes).digest("hex");
    const html = fs.readFileSync(
      path.join(docsOutput, "curriculum/ai-assisted-qa/quizzes/M02.html"),
      "utf8",
    );
    expect(html).toContain(`data-revision="${revision}"`);
    expect(html).not.toContain("correct_value");
    expect(html).toContain("quiz.js");
  });

  it("shows one question at a time, hides answers until completion, and restores the completed result", async () => {
    const quiz = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/quizzes/M02.json"),
        "utf8",
      ),
    ) as { questions: { correct_value: string }[] };
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/ai-assisted-qa/quizzes/M02.html`);
    await page.getByRole("button", { name: "回答を始める" }).click();

    await playwrightExpect(page.getByText(`第1問 / 全${quiz.questions.length}問`)).toBeVisible();
    await playwrightExpect(page.getByText("この条件での理由:")).toHaveCount(0);
    await chooseCorrectAnswers(page, quiz);
    await playwrightExpect(page.getByRole("button", { name: "結果を確認" })).toBeEnabled();
    await page.getByRole("button", { name: "結果を確認" }).click();
    await playwrightExpect(
      page.getByText(`${quiz.questions.length} / ${quiz.questions.length}問正解（100%）`),
    ).toBeVisible();
    await playwrightExpect(page.getByText("この条件での理由:").first()).toBeVisible();
    await playwrightExpect(
      page.getByRole("link", { name: "教材の復習先" }).first(),
    ).toHaveAttribute("href", "/docs/curriculum/ai-assisted-qa/modules/M02/#例カート数量の上限");

    await page.reload();
    await playwrightExpect(
      page.getByText(`${quiz.questions.length} / ${quiz.questions.length}問正解（100%）`),
    ).toBeVisible();
    await page.close();
  });

  it("does not allow an unanswered question to be skipped", async () => {
    const quiz = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/quizzes/M03.json"),
        "utf8",
      ),
    ) as { questions: { correct_value: string }[] };
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/ai-assisted-qa/quizzes/M03.html`);
    await page.getByRole("button", { name: "回答を始める" }).click();
    await page.getByRole("button", { name: "次へ" }).click();
    await playwrightExpect(
      page.getByRole("alert").filter({ hasText: "回答を1つ選んでから進んでください" }),
    ).toBeVisible();
    await playwrightExpect(page.getByText(`第1問 / 全${quiz.questions.length}問`)).toBeVisible();
    await page.close();
  });

  it("discards saved answers when the quiz JSON revision changes", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/ai-assisted-qa/quizzes/M05.html`);
    await page.evaluate(() =>
      localStorage.setItem(
        "ai-assisted-qa-quiz:M05",
        JSON.stringify({
          revision: "sha256:outdated",
          answers: { "M05-Q01": "A" },
          currentIndex: 1,
          resultStatus: "in_progress",
        }),
      ),
    );
    await page.reload();
    await playwrightExpect(
      page.getByText(
        "クイズの版が更新されたため、以前の回答は引き継ぎません。新しい版で始めてください。",
      ),
    ).toBeVisible();
    await playwrightExpect(page.getByRole("button", { name: "回答を始める" })).toBeVisible();
    await context.close();
  });

  it("resumes in-progress answers from the same quiz revision using only per-module state", async () => {
    const quiz = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/quizzes/M05.json"),
        "utf8",
      ),
    ) as { questions: { correct_value: string }[] };
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/ai-assisted-qa/quizzes/M05.html`);
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
    await playwrightExpect(page.getByText(`第2問 / 全${quiz.questions.length}問`)).toBeVisible();
    await page.getByRole("button", { name: "前へ" }).click();
    await playwrightExpect(page.locator('input[type="radio"]').nth(1)).toBeChecked();
    await context.close();
  });

  it("supports keyboard answers at a mobile viewport without horizontal overflow", async () => {
    const quiz = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/quizzes/M06.json"),
        "utf8",
      ),
    ) as { questions: { correct_value: string }[] };
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/ai-assisted-qa/quizzes/M06.html`);
    await page.getByRole("button", { name: "回答を始める" }).click();
    await page.locator('input[type="radio"]').first().focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await playwrightExpect(page.getByText(`第2問 / 全${quiz.questions.length}問`)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const accessibility = await new axeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
    await context.close();
  });
});
