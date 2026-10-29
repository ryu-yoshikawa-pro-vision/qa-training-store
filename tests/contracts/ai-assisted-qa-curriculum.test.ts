import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildAiAssistedQaSite } from "../../scripts/docs/build-ai-assisted-qa";
import { resolveAiAssistedQaPlaywrightSettings } from "../../scripts/training/ai-assisted-qa-playwright-settings";
import { validateAiAssistedQa } from "../../scripts/training/validate-ai-assisted-qa";
import { slugHeading } from "../../scripts/spec/slug-heading";

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
    expect(validation.questionCount).toBe(53);
    expect(validation.assessmentFiles).toBe(33);
    buildAiAssistedQaSite(repositoryRoot, docsOutput);
  }, 120_000);

  afterAll(async () => {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  });

  it("gives all 11 lessons a concrete beginner-facing orientation", () => {
    const graph = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/knowledge-graph.json"),
        "utf8",
      ),
    ) as { nodes: { id: string; module: string; type: string }[] };
    for (let index = 0; index <= 10; index += 1) {
      const moduleId = `M${String(index).padStart(2, "0")}`;
      const lesson = fs.readFileSync(
        path.join(repositoryRoot, `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`),
        "utf8",
      );
      const section =
        /^## この章でできるようになること\r?\n([\s\S]*?)(?=^## )/m.exec(lesson)?.[1] ?? "";
      expect(section.trim(), `${moduleId} has a non-empty learning orientation`).not.toBe("");

      const objectivesTable = /^\|\s*学習目標(?:ID)?\s*\|/m.exec(section);
      expect(objectivesTable, `${moduleId} has a learning-objective table`).not.toBeNull();
      const orientation = objectivesTable ? section.slice(0, objectivesTable.index).trim() : "";
      expect(orientation.length, `${moduleId} keeps its explanatory introduction`).toBeGreaterThan(
        200,
      );

      const objectiveIds = [
        ...section.matchAll(/^\|\s*(?:\*\*)?(M\d{2}-\d{2})(?:\*\*)?\s*\|/gm),
      ].map((match) => match[1]);
      const expectedObjectiveIds = graph.nodes
        .filter((node) => node.type === "learning_objective" && node.module === moduleId)
        .map((node) => node.id);
      expect(objectiveIds, `${moduleId} lists every existing learning objective`).toEqual(
        expectedObjectiveIds,
      );
    }
  });

  it("rejects duplicate calibration case IDs before a model is invoked", () => {
    const scoringPath = path.join(
      repositoryRoot,
      "training/ai-assisted-qa-course/assessment/scoring-tests/M03.json",
    );
    const scoring = JSON.parse(fs.readFileSync(scoringPath, "utf8")) as {
      cases: { id: string }[];
    };
    scoring.cases.push({ ...scoring.cases[0]! });
    const readFile = fs.readFileSync;
    const spy = vi.spyOn(fs, "readFileSync").mockImplementation((...args) => {
      if (String(args[0]) === scoringPath) return JSON.stringify(scoring);
      return readFile(...args);
    });
    try {
      expect(() => validateAiAssistedQa(repositoryRoot)).toThrow(/重複する採点例ID/);
    } finally {
      spy.mockRestore();
    }
  });

  it("connects the new M06 and M07 exercises to learner-owned required files", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, "training/course-sync/manifest.json"), "utf8"),
    ) as { load_files: { module_id: string; target_path: string }[] };
    for (const [moduleId, fileName] of [
      ["M06", "new-case.spec.ts"],
      ["M07", "maintenance.spec.ts"],
    ]) {
      const target = `workspace/${moduleId}/${fileName}`;
      const endState = JSON.parse(
        fs.readFileSync(
          path.join(repositoryRoot, `training/ai-assisted-qa-course/states/${moduleId}/end.json`),
          "utf8",
        ),
      ) as { expected: { required_paths: string[] } };
      expect(
        manifest.load_files.some(
          (entry) => entry.module_id === moduleId && entry.target_path === target,
        ),
      ).toBe(true);
      expect(endState.expected.required_paths).toContain(target);
    }
    const starter = fs.readFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/inputs/M06/new-case.spec.ts"),
      "utf8",
    );
    expect(starter).toContain('throw new Error("TODO:');
    const maintenance = fs.readFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/inputs/M07/maintenance.spec.ts"),
      "utf8",
    );
    expect(maintenance).not.toContain("base.extend");
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
      "BR-STOREFRONT-002",
      "(カテゴリA OR カテゴリB) AND ブランドX",
      "| R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |",
      "Cart再検証のCase一覧",
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
      "CASE-CART-BASE-01",
      "既存Caseへ統合",
    ])
      expect(m04).toContain(judgment);

    expect(m04).toContain("Candidate-01単独では **Do not automate**");
    expect(m04).toContain("値を2とするなら、Candidate-01および`CASE-CART-BASE-01`と同じ検証");
    expect(m04).not.toContain("前提修正後はIntegrationへ追加する");
  });

  it("keeps M06 fallback input separate from personal Phase 1 completion", () => {
    const assessmentRoot = "training/ai-assisted-qa-course/assessment";
    const scoring = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, `${assessmentRoot}/scoring-tests/M06.json`),
        "utf8",
      ),
    ) as {
      criteria?: { id?: string; required_evidence?: string[]; pass_conditions?: string[] }[];
      cases?: { id?: string; expected_decision?: string; response?: string }[];
    };
    const criterion = scoring.criteria?.find((candidate) => candidate.id === "M06-CR-01");
    const fallbackExample = scoring.cases?.find((candidate) => candidate.id === "M06-CAL-08");
    const falseCompletionExample = scoring.cases?.find(
      (candidate) => candidate.id === "M06-CAL-09",
    );
    const startState = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/states/M06/start.json"),
        "utf8",
      ),
    ) as { public_fallback?: { path?: string }; expected?: { previous_artifact_policy?: string } };

    expect(criterion?.required_evidence?.join(" ")).toContain("revision");
    expect(criterion?.required_evidence?.join(" ")).toContain("fallback");
    expect(criterion?.pass_conditions?.join(" ")).toContain("Phase 1");
    expect(fallbackExample?.expected_decision).toBe("pass");
    expect(fallbackExample?.response).toContain("Phase 1");
    expect(falseCompletionExample?.expected_decision).toBe("fail");
    expect(startState.public_fallback?.path).toBe("inputs/M06/start.md");
    expect(startState.expected?.previous_artifact_policy).toContain("public sample");
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
      expect(scoring.evaluation_policy?.automated_scope).toContain(
        "OpenCode returns candidate judgments only",
      );
      expect(scoring.evaluation_policy?.automated_scope).toContain(
        "ignores any AI-supplied completion or pass flag",
      );
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
    expect(html).not.toContain("SHA-256:");
    expect(html).toContain('class="primary-navigation"');
    expect(html).toMatch(/<nav class="primary-navigation"[^>]*tabindex="0"/);
    expect(html).toMatch(/<nav class="toc"[^>]*tabindex="0"/);
    expect(html).toContain('class="module-progress"');
    expect(html).toContain('class="module-pager"');
    expect(html).toContain("quiz.js");

    const lesson = fs.readFileSync(
      path.join(docsOutput, "curriculum/ai-assisted-qa/modules/M02/index.html"),
      "utf8",
    );
    expect(lesson).toContain('name="course-source-revision"');
    expect(lesson).not.toContain("SHA-256:");
    expect(lesson).not.toContain("source_sha");
    expect(lesson).not.toContain("spec_sha256");

    const quizCss = fs.readFileSync(
      path.join(docsOutput, "curriculum/ai-assisted-qa/quizzes/quiz.css"),
      "utf8",
    );
    expect(quizCss).toContain("color-scheme: light;");
    expect(quizCss).not.toContain("prefers-color-scheme:dark");
    expect(quizCss).not.toContain("color-scheme:light dark");
  });

  it("routes all public learner materials internally and excludes protected assessment data", () => {
    const courseRoot = "training/ai-assisted-qa-course";

    for (let index = 0; index <= 10; index += 1) {
      const id = `M${String(index).padStart(2, "0")}`;
      const phase = index <= 4 ? 1 : index <= 7 ? 2 : 3;
      const html = fs.readFileSync(
        path.join(docsOutput, "curriculum/ai-assisted-qa/modules", id, "index.html"),
        "utf8",
      );

      for (const relativePath of [
        `${courseRoot}/exercises/${id}/exercise.md`,
        `${courseRoot}/inputs/${id}/start.md`,
        `${courseRoot}/exercises/${id}/submission-template.md`,
        `${courseRoot}/assessment/phase-${phase}-rubric.md`,
      ]) {
        expect(fs.existsSync(path.join(repositoryRoot, relativePath))).toBe(true);
        expect(html).toContain(`href="/docs/curriculum/ai-assisted-qa/resources/${relativePath}"`);
        expect(
          fs.existsSync(path.join(docsOutput, "curriculum/ai-assisted-qa/resources", relativePath)),
        ).toBe(true);
      }
      expect(html).toContain(`href="/docs/curriculum/ai-assisted-qa/quizzes/${id}.html"`);
      expect(html).toContain(`href="/docs/curriculum/ai-assisted-qa/objectives.html"`);
      expect(html).toContain(`aria-current="page">${id}：`);
      expect(html).toContain('class="module-pager"');
      expect(html).not.toContain("/blob/main/");
      expect(html).not.toContain("/assessment/reference-solutions/");
      expect(html).not.toContain("/assessment/scoring-tests/");
      expect(html).not.toContain("/assessment/completed-states/");
      expect(html).not.toContain("SHA-256:");
    }
    const quizJs = fs.readFileSync(
      path.join(docsOutput, "curriculum/ai-assisted-qa/quizzes/quiz.js"),
      "utf8",
    );
    expect(quizJs).toContain(
      "docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md",
    );
    expect(quizJs).toContain("/docs/curriculum/ai-assisted-qa/resources/");
    expect(quizJs).not.toContain("__COURSE_SOURCE_URL__");

    const objectiveMap = fs.readFileSync(
      path.join(docsOutput, "curriculum/ai-assisted-qa/objectives.html"),
      "utf8",
    );
    expect([...objectiveMap.matchAll(/data-objective-id="M(?:0[0-9]|10)-\d{2}"/g)]).toHaveLength(
      51,
    );
    expect(objectiveMap).not.toContain("correct_value");
    expect(objectiveMap).not.toContain("scoring-tests");
    expect(objectiveMap).not.toContain("reference-solutions");
  });

  it("copies every authored course illustration with alternative text and safe HTML", () => {
    const m03Lesson = fs.readFileSync(
      path.join(docsOutput, "curriculum/ai-assisted-qa/modules/M03/index.html"),
      "utf8",
    );
    const imageLinkStyle = m03Lesson.match(/\.canonical-image-link\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const imageStyle = m03Lesson.match(/\.canonical-image-link img\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(imageLinkStyle).toContain("display: block;");
    expect(imageLinkStyle).toContain("width: 100%;");
    expect(imageStyle).toContain("width: 100%;");
    expect(imageStyle).toContain("height: auto;");

    for (let index = 0; index <= 10; index += 1) {
      const id = `M${String(index).padStart(2, "0")}`;
      const lesson = fs.readFileSync(
        path.join(docsOutput, "curriculum/ai-assisted-qa/modules", id, "index.html"),
        "utf8",
      );
      const imageCount = [...lesson.matchAll(/<img\b/g)].length;
      expect(imageCount).toBeGreaterThanOrEqual(id === "M03" ? 3 : 2);
      expect(lesson).not.toMatch(/<img\b(?![^>]*\balt=)[^>]*>/i);
      expect(lesson).toContain(`/assets/figures/${id}/`);
    }
    for (const image of [
      "m00-agent-boundary.png",
      "m01-expected-observed.png",
      "m05-test-execution-flow.png",
    ]) {
      expect(fs.existsSync(path.join(docsOutput, "curriculum/ai-assisted-qa/assets", image))).toBe(
        true,
      );
    }
  });

  it("links all 53 quiz review paths to explanatory headings in the emitted module pages", () => {
    const curriculumRoot = "docs/curriculum/ai-assisted-qa";
    const quizRoot = path.join(repositoryRoot, curriculumRoot, "quizzes");
    const genericReviewAnchors = new Set(
      ["確認と復習", "確認クイズ", "参考"].map((heading) => slugHeading(heading)),
    );
    const focusedReviewHeadings = new Map([
      ["M01-Q02", "3. 探索、回帰、自動化を選ぶ"],
      ["M02-Q03", "3. 条件を4つの観点で整理する — Role・State・Data・Journey"],
      ["M06-Q01", "2. 毎回同じ状態から始める（テストの独立性）"],
      ["M06-Q02", "3. 仕様どおりのAssertionを選ぶ"],
      ["M06-Q03", "6. 実行証拠（Evidence）を読む"],
      ["M06-Q04", "6. 実行証拠（Evidence）を読む"],
      ["M06-Q05", "5. テスト結果の4つの状態を正しく区別する"],
      ["M06-Q06", "4. 固定3 Caseと別Caseの実装"],
      ["M07-Q03", "3.3 なぜ「待機時間の延長」や「リトライ」で解決してはいけないのか？"],
      ["M07-Q04", "4.2 before Runとafter Runを比較する"],
      ["M08-Q01", "7.2 working tree、stage、commitの三つを区別する"],
      ["M08-Q02", "4.2 指定したファイルだけをstageに追加する手順"],
    ]);
    const quizScript = fs.readFileSync(
      path.join(docsOutput, "curriculum/ai-assisted-qa/quizzes/quiz.js"),
      "utf8",
    );
    expect(quizScript).toContain("safeHref(question.review_path)");
    expect(quizScript).toContain(
      'return "/docs/curriculum/ai-assisted-qa/modules/"+moduleMatch[1]+"/"+fragment;',
    );

    let questionCount = 0;
    for (let moduleNumber = 0; moduleNumber <= 10; moduleNumber += 1) {
      const moduleId = `M${String(moduleNumber).padStart(2, "0")}`;
      const quiz = JSON.parse(fs.readFileSync(path.join(quizRoot, `${moduleId}.json`), "utf8")) as {
        questions: {
          id: string;
          review_path: string;
        }[];
      };
      const lesson = fs.readFileSync(
        path.join(docsOutput, "curriculum/ai-assisted-qa/modules", moduleId, "index.html"),
        "utf8",
      );
      const emittedAnchors = new Set(
        [...lesson.matchAll(/<h[1-6] id="([^"]+)"/g)].map((match) => match[1]),
      );

      for (const question of quiz.questions) {
        questionCount += 1;
        const [sourcePath, encodedFragment] = question.review_path.split("#", 2);
        expect(question.id).toMatch(new RegExp(`^${moduleId}-Q\\d{2}$`));
        expect(sourcePath).toBe(`${curriculumRoot}/modules/${moduleId}/README.md`);
        expect(encodedFragment).toBeTruthy();

        const fragment = decodeURIComponent(encodedFragment ?? "");
        expect(genericReviewAnchors.has(fragment)).toBe(false);
        expect(emittedAnchors.has(fragment)).toBe(true);
        const focusedHeading = focusedReviewHeadings.get(question.id);
        if (focusedHeading !== undefined) {
          expect(fragment, `${question.id} links to its explanatory section`).toBe(
            slugHeading(focusedHeading),
          );
        }
      }
    }
    expect(questionCount).toBe(53);
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
