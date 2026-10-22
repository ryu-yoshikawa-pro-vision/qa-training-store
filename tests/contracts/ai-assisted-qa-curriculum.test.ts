import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAiAssistedQaSite } from "../../scripts/docs/build-ai-assisted-qa";
import { resolveAiAssistedQaPlaywrightSettings } from "../../scripts/training/ai-assisted-qa-playwright-settings";
import { validateAiAssistedQa } from "../../scripts/training/validate-ai-assisted-qa";

const repositoryRoot = process.cwd();
const outputRoot = fs.mkdtempSync(path.join(tmpdir(), "ai-assisted-qa-site-"));
const docsOutput = path.join(outputRoot, "docs");

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
  beforeAll(() => {
    const validation = validateAiAssistedQa(repositoryRoot);
    expect(validation.modules).toEqual(expect.arrayContaining(["M02", "M03", "M05", "M06"]));
    expect(validation.questionCount).toBeGreaterThan(0);
    buildAiAssistedQaSite(repositoryRoot, docsOutput);
  }, 120_000);

  afterAll(async () => {
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
});
