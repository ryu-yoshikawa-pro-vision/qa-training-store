import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { slugHeading } from "../../scripts/spec/slug-heading";

const repositoryRoot = process.cwd();
const curriculumRoot = "docs/curriculum/ai-assisted-qa";
const graph = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, curriculumRoot, "knowledge-graph.json"), "utf8"),
);
const modules = Array.from({ length: 11 }, (_, index) => `M${String(index).padStart(2, "0")}`);

function headingAnchors(moduleId) {
  const readme = fs.readFileSync(
    path.join(repositoryRoot, curriculumRoot, "modules", moduleId, "README.md"),
    "utf8",
  );
  const duplicateCounts = new Map();
  return new Set(
    readme
      .split(/\r?\n/)
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => {
        const slug = slugHeading(line.replace(/^#{1,6}\s+/, ""));
        const duplicate = duplicateCounts.get(slug) ?? 0;
        duplicateCounts.set(slug, duplicate + 1);
        return duplicate === 0 ? slug : `${slug}-${duplicate}`;
      }),
  );
}

describe("AI-assisted QA knowledge and assessment references", () => {
  it("links every knowledge node to an existing heading in its own lesson", () => {
    const anchorsByModule = new Map(
      modules.map((moduleId) => [moduleId, headingAnchors(moduleId)]),
    );
    const nodes = graph.nodes.filter((node) => node.type === "knowledge");
    expect(nodes).toHaveLength(82);

    for (const node of nodes) {
      const expectedPath = `${curriculumRoot}/modules/${node.module}/README.md`;
      const parts = node.review_path?.split("#");
      expect(parts, `${node.id}: review_path must include one fragment`).toHaveLength(2);
      expect(parts[0], `${node.id}: review_path must stay in its lesson`).toBe(expectedPath);
      const anchor = decodeURIComponent(parts[1]);
      const hasHeading = anchorsByModule.get(node.module)?.has(anchor);
      expect(hasHeading, `${node.id}: missing #${anchor}`).toBe(true);
    }
  });

  it("covers all learning objectives and knowledge nodes in the module scoring criteria", () => {
    const objectives = graph.nodes.filter((node) => node.type === "learning_objective");
    const knowledge = graph.nodes.filter((node) => node.type === "knowledge");
    expect(objectives).toHaveLength(51);
    expect(knowledge).toHaveLength(82);

    for (const moduleId of modules) {
      const scoring = JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            "training/ai-assisted-qa-course/assessment/scoring-tests",
            `${moduleId}.json`,
          ),
          "utf8",
        ),
      );
      expect(scoring.module_id).toBe(moduleId);
      const actualObjectives = new Set(scoring.criteria.flatMap((item) => item.objective_ids));
      const actualKnowledge = new Set(scoring.criteria.flatMap((item) => item.knowledge_ids));
      const expectedObjectives = objectives
        .filter((node) => node.module === moduleId)
        .map((node) => node.id);
      const expectedKnowledge = knowledge
        .filter((node) => node.module === moduleId)
        .map((node) => node.id);

      expect([...actualObjectives].sort(), `${moduleId}: objective coverage`).toEqual(
        expectedObjectives.sort(),
      );
      expect([...actualKnowledge].sort(), `${moduleId}: knowledge coverage`).toEqual(
        expectedKnowledge.sort(),
      );
      const declaredObjectives = [...new Set(scoring.objective_ids)].sort();
      const declaredKnowledge = [...new Set(scoring.knowledge_ids)].sort();
      expect(declaredObjectives, `${moduleId}: objective header`).toEqual(expectedObjectives);
      expect(declaredKnowledge, `${moduleId}: knowledge header`).toEqual(expectedKnowledge);
    }
  });

  it("links safety, asynchronous work, assertions and Case mapping to the teaching section", () => {
    const expectedHeadings = {
      "K-M00-06": ["M00", "3.3 Secret、外部送信、公開範囲"],
      "K-M05-06": ["M05", "6. 非同期処理：処理の完了を待つ（`async` と `await`）"],
      "K-M05-08": ["M05", "7.2 表示確認（弱いAssertion）と業務結果の確認の違い"],
      "K-M05-09": [
        "M05",
        "8.1 Web-first assertion・Actionの自動待機と失敗の区別（M05-04）",
      ],
      "K-M06-01": ["M06", "手順付き練習：Caseをコードへ写す前に対応表を作る（M06-01）"],
    };

    for (const [id, [moduleId, heading]] of Object.entries(expectedHeadings)) {
      const node = graph.nodes.find((item) => item.id === id);
      expect(node, `${id}: missing knowledge node`).toBeDefined();
      const lesson = fs.readFileSync(
        path.join(repositoryRoot, curriculumRoot, "modules", moduleId, "README.md"),
        "utf8",
      );
      expect(lesson, `${id}: teaching heading absent`).toContain(heading);
      expect(node.review_path).toBe(
        `${curriculumRoot}/modules/${moduleId}/README.md#${slugHeading(heading)}`,
      );
    }
    expect(graph.nodes.find((node) => node.id === "K-M05-09")?.can_do).toContain(
      "Web-first assertionの再試行",
    );
  });

  it("keeps M00 port visibility and usage limits linked to M00-04 grading", () => {
    const objective = "M00-04";
    const knowledge = "K-M00-08";
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: objective,
        to: knowledge,
        relation: "requires_knowledge",
      }),
    );

    const quizPath = path.join(repositoryRoot, curriculumRoot, "quizzes/M00.json");
    const quiz = JSON.parse(fs.readFileSync(quizPath, "utf8"));
    const question = quiz.questions.find((item) => item.id === "M00-Q06");
    expect(question.knowledge_ids).toContain(knowledge);
    expect(question.objective_ids).toEqual(["M00-02", objective]);
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "QUIZ-M00-Q06",
        to: objective,
        relation: "evaluates",
      }),
    );

    const scorePath = path.join(
      repositoryRoot,
      "training/ai-assisted-qa-course/assessment/scoring-tests/M00.json",
    );
    const scoring = JSON.parse(fs.readFileSync(scorePath, "utf8"));
    const criterion = scoring.criteria.find((item) => item.id === "M00-CR-04");
    expect(criterion.objective_ids).toContain(objective);
    expect(criterion.knowledge_ids).toContain(knowledge);
    expect(criterion.required_evidence.join(" ")).toContain("K-M00-08");
    expect(criterion.pass_conditions.join(" ")).toContain("K-M00-08");
  });

  it("keeps the 78 quiz evaluation links consistent with the knowledge graph", () => {
    const quizNodes = graph.nodes.filter((node) => node.type === "quiz");
    const quizEdges = graph.edges.filter(
      (edge) => edge.relation === "evaluates" && edge.from.startsWith("QUIZ-"),
    );
    expect(quizNodes).toHaveLength(78);
    const graphIds = new Set(quizNodes.map((node) => node.id));
    const foundIds = [];

    for (const moduleId of modules) {
      const quiz = JSON.parse(
        fs.readFileSync(
          path.join(repositoryRoot, curriculumRoot, "quizzes", `${moduleId}.json`),
          "utf8",
        ),
      );
      expect(quiz.module_id).toBe(moduleId);

      for (const question of quiz.questions) {
        const id = `QUIZ-${question.id}`;
        foundIds.push(id);
        expect(graphIds.has(id), `${id}: missing graph node`).toBe(true);
        const expected = [...question.objective_ids, ...question.knowledge_ids].sort();
        const actual = quizEdges.filter((edge) => edge.from === id).map((edge) => edge.to);
        expect(actual.sort(), `${id}: graph evaluates edge differs from quiz JSON`).toEqual(
          expected,
        );
        const optionValues = question.options.map((option) => option.value);
        expect(optionValues, `${id}: requires four distinct options`).toHaveLength(4);
        expect(new Set(optionValues).size, `${id}: option values must be unique`).toBe(4);
        expect(optionValues, `${id}: correct answer must exist`).toContain(question.correct_value);
      }
    }
    expect([...new Set(foundIds)].sort()).toEqual([...graphIds].sort());
    expect(foundIds).toHaveLength(78);
  });
});
