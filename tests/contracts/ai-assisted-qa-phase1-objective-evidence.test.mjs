import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

// Each objective must have its own learner task, submission slot, rubric evidence, and quiz.
// Quizzes and examples do not certify Level 2 without the learner's verified results.
const requiredPractice = {
  M00: {
    "M00-01": ["P01", "P02", "P05"],
    "M00-02": ["P03", "P06"],
    "M00-03": ["P04"],
    "M00-04": ["P05", "P06"],
  },
  M01: {
    "M01-01": ["P01", "P02", "P03"],
    "M01-02": ["P04"],
    "M01-03": ["P06"],
    "M01-04": ["P05"],
  },
  M02: {
    "M02-01": ["P01", "P02", "P03"],
    "M02-02": ["P01", "P02", "P03"],
    "M02-03": ["P06"],
    "M02-04": ["P04"],
    "M02-05": ["P05"],
  },
  M03: {
    "M03-01": ["P01"],
    "M03-02": ["P02"],
    "M03-03": ["P03"],
    "M03-04": ["P04"],
    "M03-05": ["P05", "P06"],
  },
  M04: {
    "M04-01": ["P01", "P02", "P03"],
    "M04-02": ["P04"],
    "M04-03": ["P05"],
    "M04-04": ["P06"],
  },
};

describe("Phase 1: all 22 objective-to-practice evidence contracts", () => {
  it("keeps each required exercise, submission, rubric and knowledge quiz linked", () => {
    const objectives = Object.entries(requiredPractice).flatMap(([module, items]) =>
      Object.keys(items).map((id) => `${module}/${id}`),
    );
    expect(objectives).toHaveLength(22);

    for (const [module, mapping] of Object.entries(requiredPractice)) {
      const exercise = read(`training/ai-assisted-qa-course/exercises/${module}/exercise.md`);
      const submission = read(
        `training/ai-assisted-qa-course/exercises/${module}/submission-template.md`,
      );
      const lesson = read(`docs/curriculum/ai-assisted-qa/modules/${module}/README.md`);
      const rubric = JSON.parse(
        read(`training/ai-assisted-qa-course/assessment/scoring-tests/${module}.json`),
      );
      const quiz = JSON.parse(read(`docs/curriculum/ai-assisted-qa/quizzes/${module}.json`));
      const start = JSON.parse(
        read(`training/ai-assisted-qa-course/states/${module}/start.json`),
      );
      const end = JSON.parse(
        read(`training/ai-assisted-qa-course/states/${module}/end.json`),
      );

      expect(rubric.criteria).toHaveLength(Object.keys(mapping).length);
      for (const [objective, expectedPractice] of Object.entries(mapping)) {
        const criterion = rubric.criteria.find((entry) =>
          entry.objective_ids.includes(objective),
        );
        expect(criterion, `${objective}: missing rubric criterion`).toBeDefined();
        const evidence = criterion.required_evidence.join(" ");
        const rubricPractice = criterion.required_evidence[0].match(/P0[1-6]/g) ?? [];
        expect(rubricPractice, `${objective}: P requirements differ`).toEqual(
          expectedPractice,
        );
        expect(evidence).toContain("本人");
        expect(criterion.pass_conditions.join(" ")).toMatch(/未実行|未記入/);
        expect(lesson).toContain(objective);
        expect(start.expected.objective_ids).toContain(objective);
        expect(end.expected.objective_ids).toContain(objective);
        expect(quiz.questions.some((question) => question.objective_ids.includes(objective))).toBe(
          true,
        );

        for (const task of expectedPractice) {
          expect(exercise, `${objective}: missing practice ${task}`).toContain(
            `**${task} `,
          );
          expect(submission, `${objective}: missing evidence row ${task}`).toContain(
            `| ${task} |`,
          );
        }
      }
    }
  });

  it("does not replace real security or runtime evidence with fictional exercise answers", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M00/exercise.md");
    expect(exercise).toContain("実AIが正答した場合でも");
    expect(exercise).toContain("架空の誤回答を実AIの出力として記録してはいけません");
    expect(exercise).toContain("競合エラー・非0終了と既存本文の不変");
    expect(exercise).toContain("実CodespaceのPorts画面");
  });
});
