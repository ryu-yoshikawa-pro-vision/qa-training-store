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
  it("covers the Phase 3 objectives and knowledge nodes without approving drafts", () => {
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

  it("keeps draft graph prerequisites coherent without changing approval status", () => {
    const knowledgeNodes = graph.nodes.filter(
      (node) => node.type === "knowledge" && modules.some((module) => module.id === node.module),
    );
    const knowledgeIds = new Set(knowledgeNodes.map((node) => node.id));
    const requires = graph.edges.filter(
      (edge) => edge.relation === "requires" && knowledgeIds.has(edge.from),
    );
    for (const node of knowledgeNodes) {
      expect(node.title.length).toBeGreaterThan(0);
      expect(node.can_do.length).toBeGreaterThan(0);
      expect(node.status).toBe("draft_requires_content_review");
      expect(
        graph.edges.some(
          (edge) =>
            edge.relation === "requires_knowledge" &&
            edge.to === node.id &&
            node.module === edge.from.slice(0, 3),
        ),
      ).toBe(true);
    }
    for (const edge of requires) {
      expect(knowledgeIds.has(edge.to)).toBe(true);
      expect(edge.status).toBe("draft");
      expect(nodeById.get(edge.from).module).toBe(nodeById.get(edge.to).module);
    }
    const visiting = new Set();
    const visited = new Set();
    const assertAcyclic = (id) => {
      if (visited.has(id)) return;
      expect(visiting.has(id), id + " has a circular prerequisite").toBe(false);
      visiting.add(id);
      for (const edge of requires.filter((item) => item.from === id)) {
        assertAcyclic(edge.to);
      }
      visiting.delete(id);
      visited.add(id);
    };
    for (const node of knowledgeNodes) assertAcyclic(node.id);
    expect(visited.size).toBe(19);
  });

  it("traces Phase 3 goals through lessons, practice and assessment references", () => {
    for (const module of modules) {
      const lesson = fs.readFileSync(
        path.join(root, "docs/curriculum/ai-assisted-qa/modules", module.id, "README.md"),
        "utf8",
      );
      const base = path.join(root, "training/ai-assisted-qa-course/exercises", module.id);
      const exercise = fs.readFileSync(path.join(base, "exercise.md"), "utf8");
      const submission = fs.readFileSync(path.join(base, "submission-template.md"), "utf8");
      const statePath = "training/ai-assisted-qa-course/states/" + module.id + "/end.json";
      const state = readJson(statePath);
      expect(state.expected.phase).toBe("P3");
      expect(state.expected.objective_ids).toHaveLength(module.objectives);
      for (const objective of state.expected.objective_ids) {
        expect(lesson).toContain(objective);
        expect(exercise).toContain(objective);
        expect(submission).toContain(objective);
        expect(
          graph.nodes.some(
            (node) => node.id === objective && node.type === "learning_objective",
          ),
        ).toBe(true);
      }
      for (const step of ["P01", "P02", "P03", "P04", "P05", "P06"]) {
        expect(exercise).toContain(step);
        expect(submission).toContain(step);
      }
      expect(state.phase_assessment.phase_id).toBe("P3");
      expect(state.phase_assessment.terminal_module_id).toBe("M10");
      expect(state.phase_assessment.entry_command).toContain("course:assess M10");
      expect(state.phase_assessment.mastery_status).toBe("not_evaluated_by_course_check");
    }
  });
});
