import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const manifest = JSON.parse(read("training/course-sync/manifest.json"));
const modules = Array.from({ length: 11 }, (_, index) => `M${String(index).padStart(2, "0")}`);
const distributedFiles = new Set(manifest.local_files.map((entry) => entry.source_path));

describe("AI協働QAの反復実践と正式評価の契約", () => {
  for (const moduleId of modules) {
    it(`${moduleId}の別条件演習・提出欄・採点根拠が揃っている`, () => {
      const directory = `training/ai-assisted-qa-course/exercises/${moduleId}`;
      const exercisePath = `${directory}/exercise.md`;
      const templatePath = `${directory}/submission-template.md`;
      const exercise = read(exercisePath);
      const template = read(templatePath);
      const scoring = JSON.parse(
        read(`training/ai-assisted-qa-course/assessment/scoring-tests/${moduleId}.json`),
      );
      const state = JSON.parse(read(`training/ai-assisted-qa-course/states/${moduleId}/end.json`));

      expect(distributedFiles.has(exercisePath)).toBe(true);
      expect(distributedFiles.has(templatePath)).toBe(true);
      for (let number = 1; number <= 6; number++) {
        const id = `P0${number}`;
        expect(exercise).toContain(`**${id}`);
        expect(template).toContain(`| ${id} |`);
      }
      expect(template).toMatch(/未実行|未確認|未決/);
      expect(state.expected.required_paths.length).toBeGreaterThan(0);
      expect(
        state.expected.required_paths.some((file) => file.startsWith(`workspace/${moduleId}/`)),
      ).toBe(true);

      for (const criterion of scoring.criteria) {
        const evidence = [...criterion.required_evidence, ...criterion.pass_conditions].join(" ");
        expect(evidence).toMatch(/P0[1-6]/);
        expect(evidence).toContain("未実行");
      }
    });
  }

  it("M05のP01〜P06の参照判断を課題・実行証拠の要件と対応付ける", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M05/exercise.md");
    const reference = read("training/ai-assisted-qa-course/assessment/reference-solutions/M05.md");
    for (let number = 1; number <= 6; number++) {
      const id = `P0${number}`;
      expect(exercise).toContain(`**${id}`);
      expect(reference).toMatch(new RegExp(`^#{2,3} ${id}[^\\n]*$`, "m"));
    }
    for (const expected of [
      "items[0].qty = 4",
      "items[1].qty = 2",
      "copy.qty = 5",
      "(2, 0, 3, 5)",
      "0点追加",
      "p03-type-error.ts",
      "tsx",
      'Promise.resolve("ready")',
      "waitForTimeout(5000)",
      "未実行をPASSとしません",
    ])
      expect(reference).toContain(expected);
  });

  for (const [moduleId, requiredTerms] of [
    [
      "M06",
      ["CASE-CART-004", "CASE-CART-005", "数量0", "fallback", "initial", "repeat"],
    ],
    ["M07", ["合成B", "合成C", "Page Object", "3番目", "3件以上", "実Run"]],
    [
      "M08",
      [
        "private-note.md",
        "git diff --cached --name-only",
        "git show --stat HEAD",
        "base→head",
        "Factory",
        "未実行",
      ],
    ],
  ]) {
    it(`${moduleId}のP01〜P06に模範判断があり、実行証拠の限界を明示する`, () => {
      const exercise = read(`training/ai-assisted-qa-course/exercises/${moduleId}/exercise.md`);
      const reference = read(
        `training/ai-assisted-qa-course/assessment/reference-solutions/${moduleId}.md`,
      );
      for (let number = 1; number <= 6; number++) {
        const id = `P0${number}`;
        expect(exercise).toContain(`**${id}`);
        expect(reference).toMatch(new RegExp(`^#{2,3} ${id}[^\\n]*$`, "m"));
      }
      for (const term of requiredTerms) expect(reference).toContain(term);
    });
  }

  it("M06の削除・数量更新Caseは両Runで2件以上実行する", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M06/exercise.md");
    const scoring = JSON.parse(
      read("training/ai-assisted-qa-course/assessment/scoring-tests/M06.json"),
    );
    const required = scoring.evaluation_policy.execution_evidence.required_runs;
    for (const label of ["initial", "repeat"]) {
      const run = required.find((entry) => entry.label === label);
      expect(run?.spec).toBe("new-case.spec.ts");
      expect(run?.minimum_tests).toBeGreaterThanOrEqual(2);
    }
    expect(exercise).toContain("CASE-CART-005");
    expect(exercise).toContain("ページを再読み込み→Cartで数量2が保持される");
    const submission = read("training/ai-assisted-qa-course/exercises/M06/submission-template.md");
    expect(submission).toMatch(/^\| CASE-CART-005 \|/m);
    expect(submission).toContain("再読み込み後の数量保持");
    for (const id of ["M06-CAL-01", "M06-CAL-04", "M06-CAL-08"]) {
      expect(scoring.cases.find((item) => item.id === id)?.response).toContain("CASE-CART-005");
    }
    expect(scoring.cases.find((item) => item.id === "M06-CAL-12")).toMatchObject({
      type: "partial",
      expected_decision: "partial",
    });
    const completed = JSON.parse(
      read("training/ai-assisted-qa-course/assessment/completed-states/M06.json"),
    );
    const newCaseArtifact = completed.artifacts.find(
      (artifact) => artifact.path === "workspace/M06/new-case.spec.ts",
    );
    expect(newCaseArtifact?.expected_data.case_purposes).toEqual([
      "remove the only cart item",
      "update mug quantity from one to two and preserve after reload",
    ]);
    expect(exercise).toContain("数量0");
    expect(exercise).toContain("Web UIから数量0へ変更できるというE2Eは作りません");
    expect(
      read("training/ai-assisted-qa-course/assessment/playwright/M06/quantity-update.spec.ts"),
    ).toContain('selectOption("2")');
  });

  it("M07の保守後Runは独立した3件のCaseを検証する", () => {
    const scoring = JSON.parse(
      read("training/ai-assisted-qa-course/assessment/scoring-tests/M07.json"),
    );
    const required = scoring.evaluation_policy.execution_evidence.required_runs;
    const maintenance = required.filter((entry) => entry.spec === "maintenance.spec.ts");
    expect(maintenance.find((entry) => entry.label === "before")?.minimum_tests).toBe(2);
    expect(maintenance.find((entry) => entry.label === "after")?.minimum_tests).toBe(3);
    const reference = read(
      "training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after/cart.spec.ts",
    );
    expect(reference.match(/test\("/g)?.length).toBeGreaterThanOrEqual(3);
    for (const id of ["M07-CAL-01", "M07-CAL-04"]) {
      expect(scoring.cases.find((item) => item.id === id)?.response).toContain("3本目");
    }
    expect(scoring.cases.find((item) => item.id === "M07-CAL-10")).toMatchObject({
      type: "partial",
      expected_decision: "partial",
    });
  });
});
