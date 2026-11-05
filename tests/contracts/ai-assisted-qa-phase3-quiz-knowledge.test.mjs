import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const modules = [
  { id: "M08", objectives: 4, knowledge: 5 },
  { id: "M09", objectives: 5, knowledge: 7 },
  { id: "M10", objectives: 5, knowledge: 7 },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

const graph = readJson("docs/curriculum/ai-assisted-qa/knowledge-graph.json");
const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

describe("Phase 3 quiz and understanding coverage", () => {
  it("covers all 14 learning objectives and 19 understanding nodes without approving drafts", () => {
    const coveredObjectives = new Set();
    const coveredKnowledge = new Set();
    for (const module of modules) {
      const lesson = "docs/curriculum/ai-assisted-qa/modules/" + module.id + "/README.md";
      const quiz = readJson("docs/curriculum/ai-assisted-qa/quizzes/" + module.id + ".json");
      const objectives = new Set(
        Array.from(
          { length: module.objectives },
          (_, index) => module.id + "-" + String(index + 1).padStart(2, "0"),
        ),
      );
      const knowledge = graph.nodes.filter(
        (node) => node.type === "knowledge" && node.module === module.id,
      );
      expect(knowledge).toHaveLength(module.knowledge);

      for (const question of quiz.questions) {
        expect(question.id).toMatch(new RegExp("^" + module.id + "-Q[0-9]{2}$"));
        expect(question.objective_ids).toHaveLength(1);
        expect(objectives.has(question.objective_ids[0])).toBe(true);
        coveredObjectives.add(question.objective_ids[0]);
        expect(question.knowledge_ids).toHaveLength(1);
        coveredKnowledge.add(question.knowledge_ids[0]);
        const node = nodeById.get(question.knowledge_ids[0]);
        expect(node).toMatchObject({
          type: "knowledge",
          module: module.id,
          status: "draft_requires_content_review",
          review_path: question.review_path,
        });
        expect(question.review_path.startsWith(lesson + "#")).toBe(true);
        expect(question.source_refs.some((ref) => ref.startsWith(lesson))).toBe(true);
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((option) => option.value)).size).toBe(4);
        expect(question.options.some((option) => option.value === question.correct_value)).toBe(
          true,
        );
        for (const option of question.options) {
          expect(option.label.length).toBeGreaterThan(0);
          expect(option.reason.length).toBeGreaterThan(7);
        }
        expect(
          graph.edges.some(
            (edge) =>
              edge.relation === "evaluates" &&
              edge.from === "QUIZ-" + question.id &&
              edge.to === node.id,
          ),
        ).toBe(true);
      }
      for (const objective of objectives) expect(coveredObjectives.has(objective)).toBe(true);
      for (const node of knowledge) {
        expect(coveredKnowledge.has(node.id)).toBe(true);
        expect(
          graph.edges.some(
            (edge) =>
              edge.relation === "teaches" &&
              edge.from === "LESSON-" + module.id &&
              edge.to === node.id,
          ),
        ).toBe(true);
      }
    }
    expect(coveredObjectives.size).toBe(14);
    expect(coveredKnowledge.size).toBe(19);
  });

  it("keeps verified safety answers instead of rewarding unsafe CI shortcuts", () => {
    const m08 = readJson("docs/curriculum/ai-assisted-qa/quizzes/M08.json");
    const m09 = readJson("docs/curriculum/ai-assisted-qa/quizzes/M09.json");
    const m10 = readJson("docs/curriculum/ai-assisted-qa/quizzes/M10.json");
    const findCorrect = (quiz, id) => {
      const question = quiz.questions.find((item) => item.id === id);
      return question.options.find((option) => option.value === question.correct_value).label;
    };
    expect(findCorrect(m08, "M08-Q02")).toContain("stage");
    expect(findCorrect(m09, "M09-Q02")).toContain("現在のHEAD");
    expect(findCorrect(m09, "M09-Q04")).toContain("公式条件");
    expect(findCorrect(m09, "M09-Q05")).toContain("contents: read");
    expect(findCorrect(m10, "M10-Q01")).toContain("diff");
    expect(findCorrect(m10, "M10-Q03")).toContain("target-sha.txt");
    expect(findCorrect(m10, "M10-Q06")).toContain("未確認");
  });
});
