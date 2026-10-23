import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
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
  it("uses loopback port 8082 and only declared course workspace paths", () => {
    const m05Settings = resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
      testRoot: "workspace/M05/specs",
    });
    const allowedSettings = ["M06", "M07", "M08", "M10"].map((moduleId) =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: `workspace/${moduleId}/public-sample`,
      }),
    );
    expect(m05Settings.testDir).toBe(path.resolve("C:/training/course/workspace/M05/specs"));
    expect(allowedSettings.map((settings) => settings.testDir)).toEqual(
      ["M06", "M07", "M08", "M10"].map((moduleId) =>
        path.resolve(`C:/training/course/workspace/${moduleId}/public-sample`),
      ),
    );
    expect(allowedSettings.every((settings) => settings.baseUrl === "http://127.0.0.1:8082")).toBe(
      true,
    );

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
    ).toThrow(/workspace\/M05、M06、M07、M08またはM10/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: "workspace/M09/public-sample",
      }),
    ).toThrow(/workspace\/M05、M06、M07、M08またはM10/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: "workspace/M06/../../training/playwright",
      }),
    ).toThrow(/workspace\/M05、M06、M07、M08またはM10/);
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

  it("generates a 51-row objective map with linked lesson, quiz answer, practice, assessment, and review evidence", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/training/knowledge-graph.mjs", "table"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    expect(output).toContain(
      "| Phase | Learning item | Knowledge | Lesson section | Level | Level 2 evidence | Quiz: answer and explanation | Practical exercise and submission | Phase rubric |",
    );
    expect(
      output.split(/\r?\n/).filter((line) => /^\| P[123] \| M(?:0[0-9]|10)-\d{2} \|/.test(line)),
    ).toHaveLength(51);
    expect(output).toContain("M10-Q01");
    expect(output).toContain("training/ai-assisted-qa-course/exercises/M00/submission-template.md");
  });

  it("requires manual review for curriculum-relevant files without graph nodes", () => {
    fs.mkdirSync(path.join(repositoryRoot, "output"), { recursive: true });
    const outputDirectory = fs.mkdtempSync(
      path.join(repositoryRoot, "output", "ai-qa-impact-contract-"),
    );
    const listPath = path.join(outputDirectory, "changed-files.txt");
    fs.writeFileSync(listPath, "tests/contracts/ai-assisted-qa-next-module.test.ts\n", "utf8");
    try {
      const result = spawnSync(
        process.execPath,
        [
          "scripts/training/knowledge-graph.mjs",
          "impact",
          "--changed-files",
          path.relative(repositoryRoot, listPath),
        ],
        { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      expect(result.status).toBe(2);
      expect(JSON.parse(result.stdout)).toMatchObject({
        ok: false,
        status: "manual_review_required",
        unmapped: ["tests/contracts/ai-assisted-qa-next-module.test.ts"],
      });
    } catch (error) {
      throw new Error(`Changed-file impact check could not run: ${String(error)}`);
    } finally {
      fs.rmSync(outputDirectory, { recursive: true, force: true });
    }
  });
});

describe("AI-assisted QA static learning course", () => {
  beforeAll(() => {
    const validation = validateAiAssistedQa(repositoryRoot);
    expect(validation.modules).toEqual(expect.arrayContaining(["M02", "M03", "M05", "M06"]));
    expect(validation.questionCount).toBeGreaterThan(0);
    expect(validation.assessmentFiles).toBe(33);
    buildAiAssistedQaSite(repositoryRoot, docsOutput);
  }, 120_000);

  afterAll(async () => {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  });

  it("aligns the public M02 Cart risk reference with the canonical workbook ID", () => {
    const answer = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/assessment/reference-solutions/M02.md",
      ),
      "utf8",
    );
    const scoring = JSON.parse(
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "training/ai-assisted-qa-course/assessment/scoring-tests/M02.json",
        ),
        "utf8",
      ),
    ) as { decision_rules?: string[]; cases?: { response?: string }[] };
    const riskRows = fs
      .readFileSync(path.join(repositoryRoot, "training/workbook/01_target-risk.csv"), "utf8")
      .split(/\r?\n/)
      .filter((row) => row.includes(",RISK-CART-001,"));

    expect(riskRows).toHaveLength(1);
    expect(answer).toContain("RISK-CART-001");
    expect(answer).not.toContain("Risk-CART-001");
    expect(scoring.decision_rules?.join(" ")).toContain("RISK-CART-001");
    expect(scoring.cases?.[0]?.response).toContain("RISK-CART-001");
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

  it("keeps public assessment source files out of the built Web bundle", () => {
    const visit = (directory: string): string[] =>
      fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const absolute = path.join(directory, entry.name);
        return entry.isDirectory() ? visit(absolute) : [absolute];
      });
    const builtFiles = visit(docsOutput);
    for (const relativePath of [
      "reference-solutions/M00.md",
      "scoring-tests/M00.json",
      "completed-states/M00.json",
    ]) {
      expect(
        builtFiles.some((filePath) => filePath.replaceAll("\\", "/").includes(relativePath)),
      ).toBe(false);
    }
    const publicAnswerHeading =
      fs
        .readFileSync(
          path.join(
            repositoryRoot,
            "training/ai-assisted-qa-course/assessment/reference-solutions/M00.md",
          ),
          "utf8",
        )
        .split(/\r?\n/, 1)[0] ?? "";
    expect(
      builtFiles.some((filePath) =>
        fs.readFileSync(filePath, "utf8").includes(publicAnswerHeading),
      ),
    ).toBe(false);
  });
});
