#!/usr/bin/env node
// Read-only integrity and change-impact CLI for the AI-assisted QA curriculum.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve, isAbsolute, sep } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const graphPath = resolve(root, "docs/curriculum/ai-assisted-qa/knowledge-graph.json");
const mapPath = resolve(
  root,
  "docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md",
);
const repoName = "ryu-yoshikawa-pro-vision/qa-training-store";
const skillRepo = "ryu-yoshikawa-pro-vision/qa-workflow-skills";
const pinnedSkillSha = "7cc6cba7772de549841a39d71694cbafbc783324";
const phases = new Set(["P1", "P2", "P3"]);
const modules = Array.from({ length: 11 }, (_, index) => "M" + String(index).padStart(2, "0"));
const permittedTypes = new Set([
  "phase",
  "module",
  "learning_objective",
  "knowledge",
  "lesson",
  "quiz",
  "exercise",
  "assessment",
  "module_state",
  "artifact",
  "test_target",
  "skill",
]);
const relations = {
  part_of: [
    ["module", "phase"],
    ["learning_objective", "module"],
    ["lesson", "module"],
    ["quiz", "module"],
    ["exercise", "module"],
    ["assessment", "phase"],
  ],
  requires: [
    ["module", "module"],
    ["knowledge", "knowledge"],
  ],
  requires_knowledge: [["learning_objective", "knowledge"]],
  applies_to: [["learning_objective", "test_target"]],
  may_use_skill: [["module", "skill"]],
  teaches: [["lesson", "knowledge"]],
  evaluates: [
    ["quiz", "learning_objective"],
    ["exercise", "learning_objective"],
    ["assessment", "learning_objective"],
  ],
  uses_target: [
    ["lesson", "test_target"],
    ["exercise", "test_target"],
    ["assessment", "test_target"],
  ],
  uses_skill: [
    ["lesson", "skill"],
    ["exercise", "skill"],
  ],
  produces: [["exercise", "artifact"]],
  has_start_state: [["module", "module_state"]],
  has_end_state: [["module", "module_state"]],
};
const fail = (message) => {
  throw new Error(message);
};
const load = () => JSON.parse(readFileSync(graphPath, "utf8"));
const unique = (values) => new Set(values).size === values.length;
const sameSet = (left, right) =>
  left.size === right.size && [...left].every((value) => right.has(value));
function safeLocalPath(file) {
  if (typeof file !== "string" || !file || isAbsolute(file)) return null;
  const actual = resolve(root, file);
  const rel = relative(root, actual);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) return null;
  return actual;
}
function objectiveRows() {
  const text = readFileSync(mapPath, "utf8");
  return [...text.matchAll(/^\|\s*(M\d\d-\d\d)\s*\|[^|\r\n]*\|[^|\r\n]*\|[^|\r\n]*\|\s*$/gm)].map(
    (match) => match[1],
  );
}
function validate(graph) {
  if (graph.schema_version !== 1) fail("Unknown graph schema_version");
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges))
    fail("Graph must contain nodes and edges");
  const ids = graph.nodes.map((node) => node.id);
  if (ids.some((id) => typeof id !== "string" || !id) || !unique(ids))
    fail("Node IDs must be unique nonempty strings");
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) {
    if (!permittedTypes.has(node.type) || !node.title) fail("Invalid node: " + node.id);
    if (
      [
        "test_target",
        "skill",
        "lesson",
        "quiz",
        "exercise",
        "assessment",
        "module_state",
        "artifact",
      ].includes(node.type)
    ) {
      if (!node.path || !node.repo) fail("Missing repo/path: " + node.id);
      if (/\b(private|secret|answer[-_ ]?key|model[-_ ]?answer)\b/i.test(node.path))
        fail("Private material path in graph: " + node.id);
    }
    if (
      node.type === "skill" &&
      (node.repo !== skillRepo ||
        !/^skills\/[^/]+\/SKILL\.md$/.test(node.path) ||
        node.ref !== pinnedSkillSha)
    ) {
      fail("Skill must use the Plan-pinned qa-workflow-skills revision: " + node.id);
    }
    if (node.type === "artifact" && (node.public !== true || node.private !== false))
      fail("Only public artifact contracts may appear in the graph: " + node.id);
    if (
      node.type === "module_state" &&
      (node.public_contract !== true || node.private_data !== false)
    )
      fail("State must refer only to its public contract: " + node.id);
    if (node.repo === repoName) {
      const actual = safeLocalPath(node.path);
      if (!actual || !existsSync(actual))
        fail("Missing/local path escapes repository: " + node.path);
    }
  }
  const seenEdges = new Set();
  for (const edge of graph.edges) {
    const from = byId.get(edge.from),
      to = byId.get(edge.to);
    if (!from || !to) fail("Dangling edge: " + edge.from + " -> " + edge.to);
    if (
      !relations[edge.relation]?.some(
        ([fromType, toType]) => fromType === from.type && toType === to.type,
      )
    )
      fail("Invalid relation type: " + JSON.stringify(edge));
    const key = edge.from + "\u0000" + edge.relation + "\u0000" + edge.to;
    if (seenEdges.has(key)) fail("Duplicate relation: " + key);
    seenEdges.add(key);
  }
  const mapIds = objectiveRows();
  const objectives = graph.nodes.filter((node) => node.type === "learning_objective");
  if (
    !unique(mapIds) ||
    mapIds.length !== 51 ||
    !sameSet(new Set(mapIds), new Set(objectives.map((node) => node.id)))
  )
    fail("Learning objective IDs differ from the 51 canonical learning-map rows");
  for (const node of objectives) {
    const module = node.id.slice(0, 3);
    if (
      node.module !== module ||
      !modules.includes(module) ||
      !graph.edges.some(
        (edge) => edge.from === node.id && edge.to === module && edge.relation === "part_of",
      )
    )
      fail("Objective does not belong to its module: " + node.id);
    if (
      !graph.edges.some((edge) => edge.from === node.id && edge.relation === "requires_knowledge")
    )
      fail("Missing knowledge decomposition: " + node.id);
    objectiveEvidence(graph, node, byId);
  }
  for (const knowledge of graph.nodes.filter((node) => node.type === "knowledge")) {
    if (
      !graph.edges.some(
        (edge) => edge.to === knowledge.id && edge.relation === "requires_knowledge",
      )
    )
      fail("Unused knowledge node: " + knowledge.id);
    if (!graph.edges.some((edge) => edge.to === knowledge.id && edge.relation === "teaches"))
      fail("Knowledge has no lesson: " + knowledge.id);
  }
  for (const module of graph.nodes.filter((node) => node.type === "module")) {
    if (!modules.includes(module.id)) fail("Unexpected module: " + module.id);
    if (
      !graph.edges.some(
        (edge) =>
          edge.from === module.id && edge.to === module.phase && edge.relation === "part_of",
      )
    )
      fail("Missing phase relation: " + module.id);
    for (const [relation, stateName] of [
      ["has_start_state", "start"],
      ["has_end_state", "end"],
    ]) {
      const refs = graph.edges.filter(
        (edge) => edge.from === module.id && edge.relation === relation,
      );
      if (refs.length !== 1)
        fail("Each module must have exactly one " + stateName + " state: " + module.id);
      const state = byId.get(refs[0].to);
      if (state?.type !== "module_state" || state.module !== module.id || state.state !== stateName)
        fail("Invalid module-state relation: " + module.id + " " + stateName);
      const data = JSON.parse(readFileSync(safeLocalPath(state.path), "utf8"));
      if (
        data.module_id !== module.id ||
        data.state !== stateName ||
        data.public_contract !== true ||
        data.read_only !== true
      )
        fail("State contract differs from graph: " + module.id + " " + stateName);
      if (data.source_sha !== null && !/^[a-f0-9]{40}$/.test(data.source_sha || ""))
        fail("Invalid state source SHA: " + module.id + " " + stateName);
    }
    const hasLesson = graph.edges.some(
      (edge) =>
        edge.to === module.id &&
        edge.relation === "part_of" &&
        byId.get(edge.from)?.type === "lesson",
    );
    const hasExercise = graph.edges.some(
      (edge) =>
        edge.to === module.id &&
        edge.relation === "part_of" &&
        byId.get(edge.from)?.type === "exercise",
    );
    const hasQuiz = graph.edges.some(
      (edge) =>
        edge.to === module.id &&
        edge.relation === "part_of" &&
        byId.get(edge.from)?.type === "quiz",
    );
    if (!hasLesson || !hasExercise || !hasQuiz)
      fail("Each module needs a lesson, exercise, and quiz: " + module.id);
  }
  const assessments = graph.nodes.filter((node) => node.type === "assessment");
  if (assessments.length !== 3) fail("There must be one public assessment rubric for each phase");
  for (const phase of phases) {
    if (
      !assessments.some(
        (node) =>
          node.phase === phase &&
          graph.edges.some(
            (edge) => edge.from === node.id && edge.to === phase && edge.relation === "part_of",
          ),
      )
    )
      fail("Missing phase assessment: " + phase);
  }
  const visiting = new Set(),
    done = new Set();
  const visit = (id) => {
    if (visiting.has(id)) fail("Prerequisite cycle: " + id);
    if (done.has(id)) return;
    visiting.add(id);
    for (const edge of graph.edges.filter(
      (item) => item.from === id && item.relation === "requires",
    ))
      visit(edge.to);
    visiting.delete(id);
    done.add(id);
  };
  for (const node of graph.nodes.filter(
    (item) => item.type === "module" || item.type === "knowledge",
  ))
    visit(node.id);
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    objectives: mapIds.length,
    knowledge: graph.nodes.filter((node) => node.type === "knowledge").length,
    lessons: graph.nodes.filter((node) => node.type === "lesson").length,
    quizQuestions: graph.nodes.filter((node) => node.type === "quiz").length,
    exercises: graph.nodes.filter((node) => node.type === "exercise").length,
    assessments: assessments.length,
    moduleStates: graph.nodes.filter((node) => node.type === "module_state").length,
    artifacts: graph.nodes.filter((node) => node.type === "artifact").length,
    tentative: graph.nodes.filter((node) => node.status?.includes("draft")).length,
  };
}
function matchingNodes(graph, query) {
  return graph.nodes.filter(
    (node) =>
      node.id === query ||
      node.path === query ||
      (node.repo && node.repo + ":" + node.path === query),
  );
}
function objectivesForKnowledge(graph, knowledgeId) {
  const affected = new Set([knowledgeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges.filter(
      (item) => item.relation === "requires" && !affected.has(item.from),
    )) {
      if (affected.has(edge.to)) {
        affected.add(edge.from);
        changed = true;
      }
    }
  }
  return graph.edges
    .filter((edge) => edge.relation === "requires_knowledge" && affected.has(edge.to))
    .map((edge) => edge.from);
}
function impact(graph, query) {
  const matches = matchingNodes(graph, query);
  if (!matches.length) fail("No node matches: " + query);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const modulesAffected = new Set(),
    objectiveIds = new Set(),
    reasons = [];
  const addObjective = (id, source, relation) => {
    const node = byId.get(id);
    if (node?.type !== "learning_objective") return;
    objectiveIds.add(id);
    modulesAffected.add(node.module);
    if (
      !reasons.some(
        (item) => item.source === source && item.relation === relation && item.objective === id,
      )
    )
      reasons.push({ source, relation, objective: id });
  };
  const addModule = (moduleId, source, relation) => {
    if (!byId.has(moduleId)) return;
    modulesAffected.add(moduleId);
    for (const node of graph.nodes.filter(
      (item) => item.type === "learning_objective" && item.module === moduleId,
    ))
      addObjective(node.id, source, relation);
  };
  for (const target of matches) {
    if (target.type === "module") addModule(target.id, target.id, "module_scope");
    if (target.type === "learning_objective") addObjective(target.id, target.id, "objective");
    if (target.module) modulesAffected.add(target.module);
    if (target.type === "assessment" && target.phase) {
      for (const module of graph.nodes.filter(
        (item) => item.type === "module" && item.phase === target.phase,
      ))
        addModule(module.id, target.id, "phase_assessment");
    }
    for (const edge of graph.edges.filter(
      (item) => item.from === target.id && item.relation === "evaluates",
    ))
      addObjective(edge.to, target.id, "evaluates");
    for (const edge of graph.edges.filter(
      (item) => item.from === target.id && item.relation === "teaches",
    )) {
      for (const objectiveId of objectivesForKnowledge(graph, edge.to))
        addObjective(objectiveId, target.id, "teaches");
    }
    if (target.type === "knowledge")
      for (const objectiveId of objectivesForKnowledge(graph, target.id))
        addObjective(objectiveId, target.id, "requires_knowledge");
    if (target.type === "module_state") {
      const module = graph.edges.find(
        (edge) =>
          edge.to === target.id && ["has_start_state", "has_end_state"].includes(edge.relation),
      );
      if (module) addModule(module.from, target.id, module.relation);
    }
    if (target.type === "artifact") {
      for (const edge of graph.edges.filter(
        (item) => item.to === target.id && item.relation === "produces",
      )) {
        const exercise = byId.get(edge.from);
        if (exercise?.module) {
          modulesAffected.add(exercise.module);
          for (const relation of graph.edges.filter(
            (item) => item.from === exercise.id && item.relation === "evaluates",
          ))
            addObjective(relation.to, target.id, "produced_by_exercise");
        }
      }
    }
    if (target.type === "skill" || target.type === "test_target") {
      const relationName = target.type === "skill" ? "uses_skill" : "uses_target";
      for (const edge of graph.edges.filter(
        (item) => item.to === target.id && item.relation === relationName,
      )) {
        const consumer = byId.get(edge.from);
        if (consumer?.module) {
          modulesAffected.add(consumer.module);
          for (const relation of graph.edges.filter(
            (item) => item.from === consumer.id && item.relation === "evaluates",
          ))
            addObjective(relation.to, target.id, relationName);
          for (const teaches of graph.edges.filter(
            (item) => item.from === consumer.id && item.relation === "teaches",
          ))
            for (const id of objectivesForKnowledge(graph, teaches.to))
              addObjective(id, target.id, relationName);
        }
      }
    }
    if (target.module && !["learning_objective", "module"].includes(target.type)) {
      for (const relation of graph.edges.filter(
        (item) => item.from === target.id && item.relation === "evaluates",
      ))
        addObjective(relation.to, target.id, "evaluates");
      if (
        objectiveIds.size === 0 &&
        ["lesson", "exercise", "quiz", "module_state"].includes(target.type)
      )
        addModule(target.module, target.id, "content_scope");
    }
  }
  return {
    matches: matches.map((node) => ({
      id: node.id,
      title: node.title,
      status: node.status ?? null,
    })),
    review_modules: [...modulesAffected].sort().map((id) => ({ id, title: byId.get(id)?.title })),
    direct_objectives: [...objectiveIds].sort(),
    reasons,
    note: "Review candidates only; no curriculum, test target, or Skill was modified.",
  };
}
const excludedChange = (file) =>
  /(^|\/)(node_modules|output|dist|\.expo|\.git)(\/|$)/i.test(file) ||
  /\.(png|jpe?g|gif|webp|ico|woff2?)$/i.test(file);
const relevantChange = (file) =>
  /^(docs\/curriculum\/ai-assisted-qa\/|training\/ai-assisted-qa-course\/|training\/course-sync\/|workspace\/M0[67]\/|scripts\/training\/(ai-assisted-qa|knowledge-graph)|scripts\/docs\/build-ai-assisted-qa\.ts$|tests\/contracts\/ai-assisted-qa-[^/]+$|e2e\/web\/ai-assisted-qa-course\.spec\.ts$|playwright\.ai-assisted-qa\.config\.ts$|package\.json$)/.test(
    file,
  ) || /^docs\/(spec\/features\/(cart|storefront)\.md|spec\/state-and-scenarios\.md)$/.test(file);
function changedFilesImpact(graph, listPath) {
  const actual = safeLocalPath(listPath);
  if (!actual || !existsSync(actual))
    fail("Changed-file list must be a readable file within the repository");
  const raw = readFileSync(actual, "utf8").trim();
  let files;
  try {
    const parsed = JSON.parse(raw);
    files = Array.isArray(parsed) ? parsed : raw.split(/\r?\n/);
  } catch {
    files = raw.split(/\r?\n/);
  }
  const normalized = files
    .map((file) => String(file).trim().replace(/^\.\//, "").replace(/\\/g, "/"))
    .filter(Boolean);
  const mapped = [],
    unmapped = [],
    excluded = [];
  for (const file of normalized) {
    if (excludedChange(file)) {
      excluded.push(file);
      continue;
    }
    const nodes = matchingNodes(graph, file);
    if (nodes.length) mapped.push({ file, impact: impact(graph, file) });
    else if (relevantChange(file)) unmapped.push(file);
  }
  return {
    ok: unmapped.length === 0,
    status: unmapped.length ? "manual_review_required" : "mapped",
    mapped,
    unmapped,
    excluded,
    note: unmapped.length
      ? "Unmapped curriculum-relevant files require manual review."
      : "All curriculum-relevant files matched registered nodes.",
  };
}
function markdownCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function objectiveEvidence(
  graph,
  objective,
  byId = new Map(graph.nodes.map((node) => [node.id, node])),
) {
  const moduleId = objective.module;
  const lesson = graph.nodes.find((node) => node.type === "lesson" && node.module === moduleId);
  if (!lesson) fail("Learning objective has no lesson: " + objective.id);
  const lessonPath = safeLocalPath(lesson.path);
  if (!lessonPath || !existsSync(lessonPath))
    fail("Learning objective lesson is missing: " + objective.id);
  const headings = new Set(
    readFileSync(lessonPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^#{2,3}\s+/.test(line))
      .map((line) => line.replace(/^#{2,3}\s+/, "").trim()),
  );
  if (
    !Array.isArray(objective.lesson_sections) ||
    objective.lesson_sections.length === 0 ||
    objective.lesson_sections.some((section) => !headings.has(section))
  )
    fail("Learning objective lesson section does not exist: " + objective.id);

  const knowledge = graph.edges
    .filter((edge) => edge.from === objective.id && edge.relation === "requires_knowledge")
    .map((edge) => byId.get(edge.to))
    .filter(Boolean);
  const quizNodes = graph.edges
    .filter(
      (edge) =>
        edge.to === objective.id &&
        edge.relation === "evaluates" &&
        byId.get(edge.from)?.type === "quiz",
    )
    .map((edge) => byId.get(edge.from));
  const questions = quizNodes.map((quizNode) => {
    const quizPath = safeLocalPath(quizNode.path);
    if (!quizPath || !existsSync(quizPath))
      fail("Learning objective quiz file is missing: " + objective.id);
    const quiz = JSON.parse(readFileSync(quizPath, "utf8"));
    const question = quiz.questions.find((item) => item.id === quizNode.question_id);
    if (!question || !question.objective_ids.includes(objective.id))
      fail("Quiz node does not evaluate its linked objective: " + quizNode.id);
    const answer = question.options.find((option) => option.value === question.correct_value);
    if (!answer?.label || !answer?.reason || !question.review_path)
      fail("Quiz answer, explanation, or review path is incomplete: " + quizNode.id);
    return { ...question, answer, quizNode };
  });
  if (questions.length === 0) fail("Learning objective has no quiz question: " + objective.id);

  const exerciseNodes = graph.edges
    .filter(
      (edge) =>
        edge.to === objective.id &&
        edge.relation === "evaluates" &&
        byId.get(edge.from)?.type === "exercise",
    )
    .map((edge) => byId.get(edge.from));
  if (exerciseNodes.length === 0)
    fail("Learning objective has no practical exercise: " + objective.id);
  for (const exercise of exerciseNodes) {
    const exercisePath = safeLocalPath(exercise.path);
    if (!exercisePath || !existsSync(exercisePath))
      fail("Practical exercise is missing: " + exercise.id);
    if (
      !graph.edges.some(
        (edge) =>
          edge.from === exercise.id &&
          edge.relation === "produces" &&
          byId.get(edge.to)?.type === "artifact",
      )
    )
      fail("Practical exercise has no submitted artifact: " + exercise.id);
  }

  const module = byId.get(moduleId);
  const assessments = graph.edges
    .filter(
      (edge) =>
        edge.to === objective.id &&
        edge.relation === "evaluates" &&
        byId.get(edge.from)?.type === "assessment",
    )
    .map((edge) => byId.get(edge.from));
  if (!module || assessments.length !== 1 || assessments[0].phase !== module.phase)
    fail("Learning objective does not map to its phase assessment: " + objective.id);
  const assessmentPath = safeLocalPath(assessments[0].path);
  if (!assessmentPath || !existsSync(assessmentPath))
    fail("Public phase rubric is missing: " + objective.id);
  return { lesson, knowledge, questions, exercises: exerciseNodes, assessment: assessments[0] };
}

function renderTable(graph) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const objectives = graph.nodes
    .filter((node) => node.type === "learning_objective")
    .sort((left, right) => left.id.localeCompare(right.id));
  const rows = objectives.map((objective) => {
    const evidence = objectiveEvidence(graph, objective, byId);
    const module = byId.get(objective.module);
    const knowledge = evidence.knowledge.map((item) => item.id + " " + item.title).join("; ");
    const lesson = evidence.lesson.path + " — " + objective.lesson_sections.join("; ");
    const quiz = evidence.questions
      .map(
        (question) =>
          question.id +
          ": " +
          question.question +
          " — 正答 " +
          question.answer.value +
          ": " +
          question.answer.label +
          "。解説: " +
          question.answer.reason,
      )
      .join("<br>");
    const exercise = evidence.exercises
      .map((item) => {
        const artifacts = graph.edges
          .filter((edge) => edge.from === item.id && edge.relation === "produces")
          .map((edge) => byId.get(edge.to))
          .filter(Boolean)
          .map((artifact) => artifact.path + " → " + artifact.destination)
          .join("; ");
        return item.path + " → " + artifacts;
      })
      .join("<br>");
    const review = evidence.questions.map((question) => question.review_path).join("<br>");
    return (
      "| " +
      [
        module.phase,
        objective.id,
        knowledge,
        lesson,
        objective.cognitive_target,
        objective.level2,
        quiz,
        exercise,
        objective.evaluation_hint + " → " + evidence.assessment.path,
        review,
      ]
        .map(markdownCell)
        .join(" | ") +
      " |"
    );
  });
  return [
    "| Phase | Learning item | Knowledge | Lesson section | Level | Level 2 evidence | Quiz: answer and explanation | Practical exercise and submission | Phase rubric | Review destination |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}
try {
  const args = process.argv.slice(2),
    graph = load(),
    counts = validate(graph);
  if (args[0] === "validate" && args.length === 1)
    console.log(JSON.stringify({ ok: true, ...counts }, null, 2));
  else if (args[0] === "table" && args.length === 1) console.log(renderTable(graph));
  else if (args[0] === "impact" && args.length === 2)
    console.log(JSON.stringify({ ok: true, ...impact(graph, args[1]) }, null, 2));
  else if (args[0] === "impact" && args[1] === "--changed-files" && args.length === 3) {
    const result = changedFilesImpact(graph, args[2]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 2;
  } else
    fail(
      "Usage: node scripts/training/knowledge-graph.mjs validate | table | impact <node-id|repo-path> | impact --changed-files <path-list-file>",
    );
} catch (error) {
  console.error("knowledge-graph: " + error.message);
  process.exitCode = 1;
}
