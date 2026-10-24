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
  it("uses loopback port 8082 and only declared learner or assessment paths", () => {
    const m05Settings = resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
      testRoot: "workspace/M05/specs",
    });
    const allowedSettings = ["M06", "M07", "M08", "M10"].map((moduleId) =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: `workspace/${moduleId}/public-sample`,
      }),
    );
    const assessmentSettings = ["M05", "M06", "M07"].map((moduleId) =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: `training/ai-assisted-qa-course/assessment/playwright/${moduleId}`,
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
    expect(assessmentSettings.map((settings) => settings.testDir)).toEqual(
      ["M05", "M06", "M07"].map((moduleId) =>
        path.resolve(
          `C:/training/course/training/ai-assisted-qa-course/assessment/playwright/${moduleId}`,
        ),
      ),
    );
    expect(assessmentSettings.every((settings) => settings.testArea === "assessment")).toBe(true);
    expect(m05Settings.testArea).toBe("workspace");

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
    ).toThrow(/許可します/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: "workspace/M09/public-sample",
      }),
    ).toThrow(/許可します/);
    expect(() =>
      resolveAiAssistedQaPlaywrightSettings("C:/training/course", {
        testRoot: "workspace/M06/../../training/playwright",
      }),
    ).toThrow(/許可します/);
    for (const testRoot of [
      "training/ai-assisted-qa-course/assessment/playwright",
      "training/ai-assisted-qa-course/assessment/playwright/M04",
      "training/ai-assisted-qa-course/assessment/scoring-tests",
      "training/ai-assisted-qa-course/assessment/playwright/M06/../../scoring-tests",
    ]) {
      expect(() =>
        resolveAiAssistedQaPlaywrightSettings("C:/training/course", { testRoot }),
      ).toThrow(/許可します/);
    }
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

  it("keeps the completed M03 and M04 public answers aligned with their scoring examples", () => {
    const courseRoot = "training/ai-assisted-qa-course/assessment";
    const m03Path = path.join(repositoryRoot, `${courseRoot}/reference-solutions/M03.md`);
    const m04Path = path.join(repositoryRoot, `${courseRoot}/reference-solutions/M04.md`);
    const m03 = fs.readFileSync(m03Path, "utf8");
    const m04 = fs.readFileSync(m04Path, "utf8");
    const m03Scoring = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, `${courseRoot}/scoring-tests/M03.json`), "utf8"),
    ) as { cases?: { id?: string; response?: string; expected_decision?: string }[] };
    const m04Scoring = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, `${courseRoot}/scoring-tests/M04.json`), "utf8"),
    ) as { cases?: { id?: string; response?: string; expected_decision?: string }[] };

    for (const caseId of [
      "M03-EQP-01",
      "M03-EQP-02",
      "M03-EQP-03",
      "M03-EQP-04",
      "M03-EQP-05",
      "M03-EQP-06",
      "M03-BVA-02",
      "M03-BVA-03",
      "M03-BVA-04",
      "M03-DT-01",
      "M03-DT-02",
      "M03-DT-03",
      "M03-DT-04",
      "M03-DT-05",
      "M03-DT-06",
      "M03-ST-01",
      "M03-ST-02",
    ])
      expect(m03).toContain(caseId);

    for (const evidence of [
      "variant-basic-shirt-02",
      "min(3, 5, 99) = 3",
      "数量2を維持",
      "BR-CART-003",
      "cart version",
      "abandoned",
      "SCOPE-001",
      "TARGET-CART-001",
    ])
      expect(m03).toContain(evidence);

    const m03ReferenceLink = m03.match(/\]\((\.\.\/\.\.\/integrations\/M02-M03-contract\.md)\)/);
    expect(m03ReferenceLink).not.toBeNull();
    expect(fs.existsSync(path.resolve(path.dirname(m03Path), m03ReferenceLink?.[1] ?? ""))).toBe(
      true,
    );

    const expectedM03Calibration = ["M03-CAL-08", "M03-CAL-09", "M03-CAL-10", "M03-CAL-11"];
    const expectedM04Calibration = ["M04-CAL-08", "M04-CAL-09", "M04-CAL-10", "M04-CAL-11"];
    for (const [scoring, caseIds, answer] of [
      [m03Scoring, expectedM03Calibration, m03],
      [m04Scoring, expectedM04Calibration, m04],
    ] as const) {
      for (const caseId of caseIds) {
        const example = scoring.cases?.find((candidate) => candidate.id === caseId);
        expect(example?.expected_decision).toBe("pass");
        expect(example?.response).toBeTruthy();
        for (const term of (example?.response ?? "").match(
          /(?:M03|M04)-[A-Z]+-\d{2}|BR-CART-\d{3}|AC-CART-\d{3}|CASE-CART-CANDIDATE-\d{2}[AB]?|variant-basic-shirt-\d{2}|数量\d|Integration|Automate|Later|Do not automate|abandoned|ungradable/g,
        ) ?? [])
          expect(answer).toContain(term);
      }
    }

    for (const candidate of [
      "CASE-CART-CANDIDATE-01",
      "CASE-CART-CANDIDATE-02A / 02B",
      "CASE-CART-CANDIDATE-03",
    ])
      expect(m04).toContain(candidate);
    for (const judgment of [
      "Automate",
      "Later",
      "Do not automate",
      "BR-CART-001",
      "AC-CART-001",
      "RISK-CART-001",
    ])
      expect(m04).toContain(judgment);
  });

  it("calibrates revision mismatch and missing required evidence without automating learner judgment", () => {
    for (let index = 0; index <= 10; index += 1) {
      const moduleId = `M${String(index).padStart(2, "0")}`;
      const scoring = JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            `training/ai-assisted-qa-course/assessment/scoring-tests/${moduleId}.json`,
          ),
          "utf8",
        ),
      ) as {
        cases?: {
          type?: string;
          expected_decision?: string;
          provided_revision?: string;
          expected_revision?: string;
          missing_required_evidence?: string[];
        }[];
        evaluation_policy?: { automated_scope?: string };
      };
      const revisionMismatch = scoring.cases?.find(
        (example) => example.type === "revision-mismatch",
      );
      const missingEvidence = scoring.cases?.find(
        (example) => example.type === "required-evidence-missing",
      );

      expect(revisionMismatch?.provided_revision).toBeTruthy();
      expect(revisionMismatch?.expected_revision).toBeTruthy();
      expect(revisionMismatch?.provided_revision).not.toBe(revisionMismatch?.expected_revision);
      expect(revisionMismatch?.expected_decision).toBe("ungradable");
      expect(missingEvidence?.missing_required_evidence?.length).toBeGreaterThan(0);
      expect(missingEvidence?.expected_decision).toBe("ungradable");
      expect(scoring.evaluation_policy?.automated_scope).toContain("意味上");
    }
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
      "assessment/playwright/M05/product-link.spec.ts",
      "assessment/playwright/M06/cart-cases.spec.ts",
      "assessment/playwright/M07/expected-failure/intentional-assertion.spec.ts",
      "assessment/playwright/M07/repaired/repaired-assertion.spec.ts",
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
