import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseMarkdownFile } from "../spec/markdown";

const COURSE_ROOT = "docs/curriculum/ai-assisted-qa";
const QUIZ_ROOT = `${COURSE_ROOT}/quizzes`;
const ASSESSMENT_ROOT = "training/ai-assisted-qa-course/assessment";
const GRAPH_PATH = `${COURSE_ROOT}/knowledge-graph.json`;
const MODULE_ID_PATTERN = /^M(?:0[0-9]|10)$/;
const QUESTION_ID_PATTERN = /^(M(?:0[0-9]|10))-Q[0-9]{2}$/;
const OPTION_VALUES = ["A", "B", "C", "D"] as const;
const PINNED_SKILL_REFERENCE =
  "ryu-yoshikawa-pro-vision/qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324";
const REQUIRED_ASSESSMENT_SKILLS = [
  "qa-workflow",
  "spec-analysis",
  "test-analysis",
  "test-requirement-design",
  "test-condition-design",
  "test-case-design",
  "coverage-analysis",
  "adversarial-review",
  "e2e-test-implementation",
  "e2e-test-inspection",
  "e2e-test-execution",
  "e2e-test-result-analysis",
  "e2e-test-reporting",
];
const REQUIRED_SCORING_CASE_TYPES = [
  "correct",
  "incorrect",
  "partial",
  "acceptable-alternative",
  "ungradable",
  "revision-mismatch",
  "required-evidence-missing",
  "prompt-injection",
];

type QuizOption = {
  value: string;
  label: string;
  meaning: string;
  reason: string;
};

type QuizQuestion = {
  id: string;
  objective_ids: string[];
  knowledge_ids: string[];
  question: string;
  options: QuizOption[];
  correct_value: string;
  source_refs: string[];
  review_path: string;
};

type QuizDocument = {
  schema_version: number;
  module_id: string;
  questions: QuizQuestion[];
};

export type AiAssistedQaValidationResult = {
  modules: string[];
  questionCount: number;
  objectiveCount: number;
  stateCount: number;
  assessmentFiles: number;
};

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function repositoryPath(rootDir: string, relativePath: string): string {
  requireCondition(!path.isAbsolute(relativePath), `絶対パスは使用できません: ${relativePath}`);
  const absolutePath = path.resolve(rootDir, ...relativePath.split(/[\\/]/));
  const relativeToRoot = path.relative(path.resolve(rootDir), absolutePath);
  requireCondition(
    relativeToRoot !== ".." &&
      !relativeToRoot.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativeToRoot),
    `リポジトリ外のパスは使用できません: ${relativePath}`,
  );
  return absolutePath;
}

function requireNonEmptyString(value: unknown, description: string): asserts value is string {
  requireCondition(typeof value === "string" && value.trim().length > 0, `${description}が空です`);
}

function validateMarkdownReference(rootDir: string, reference: string, description: string): void {
  const [filePart = "", fragment] = reference.split("#", 2);
  const absolutePath = repositoryPath(rootDir, filePart);
  requireCondition(fs.existsSync(absolutePath), `${description}の参照先がありません: ${reference}`);
  requireCondition(
    filePart.endsWith(".md"),
    `${description}はMarkdownを参照してください: ${reference}`,
  );
  if (fragment === undefined) return;
  const parsed = parseMarkdownFile(absolutePath, filePart);
  requireCondition(
    parsed.headings.some((heading) => heading.anchor === decodeURIComponent(fragment)),
    `${description}の見出しがありません: ${reference}`,
  );
}

function validateSourceReference(rootDir: string, reference: string, questionId: string): void {
  requireNonEmptyString(reference, `${questionId}.source_refs`);
  if (/^https:\/\//i.test(reference)) return;
  if (reference.startsWith("ryu-yoshikawa-pro-vision/qa-workflow-skills@")) {
    requireCondition(
      reference === PINNED_SKILL_REFERENCE,
      `${questionId}の外部Skill参照がPlan固定revisionと一致しません: ${reference}`,
    );
    return;
  }
  requireCondition(
    !/^[a-z][a-z0-9+.-]*:/i.test(reference),
    `${questionId}で許可されないURL schemeです`,
  );
  const [filePart = "", fragment] = reference.split("#", 2);
  const absolutePath = repositoryPath(rootDir, filePart);
  requireCondition(
    fs.existsSync(absolutePath),
    `${questionId}の根拠ファイルがありません: ${reference}`,
  );
  if (fragment === undefined || !filePart.endsWith(".md")) return;
  validateMarkdownReference(rootDir, reference, `${questionId}.source_refs`);
}

function validateQuestion(
  rootDir: string,
  moduleId: string,
  question: QuizQuestion,
  objectiveIds: Set<string>,
  knowledgeIds: Set<string>,
  graphEdges: { from?: string; relation?: string; to?: string }[],
  objectiveKnowledge: Map<string, string[]>,
): void {
  requireCondition(
    question !== null && typeof question === "object",
    `${moduleId}に不正な問題があります`,
  );
  requireCondition(
    QUESTION_ID_PATTERN.test(question.id) && question.id.startsWith(`${moduleId}-`),
    `${moduleId}に不正な問題IDがあります: ${question.id}`,
  );
  requireNonEmptyString(question.question, `${question.id}.question`);
  requireCondition(
    Array.isArray(question.objective_ids) && question.objective_ids.length > 0,
    `${question.id}.objective_idsが空です`,
  );
  for (const objectiveId of question.objective_ids) {
    requireCondition(
      objectiveIds.has(objectiveId) && objectiveId.startsWith(`${moduleId}-`),
      `${question.id}が別モジュールまたは未定義の学習項目を参照しています: ${objectiveId}`,
    );
  }

  requireCondition(
    Array.isArray(question.knowledge_ids) && question.knowledge_ids.length > 0,
    `${question.id}.knowledge_idsが空です`,
  );
  for (const knowledgeId of question.knowledge_ids) {
    requireCondition(
      knowledgeIds.has(knowledgeId) &&
        question.objective_ids.some((objectiveId) =>
          (objectiveKnowledge.get(objectiveId) ?? []).includes(knowledgeId),
        ) &&
        graphEdges.some(
          (edge) =>
            edge.from === `QUIZ-${question.id}` &&
            edge.relation === "evaluates" &&
            edge.to === knowledgeId,
        ),
      `${question.id}と理解ノードの対応が不正です: ${knowledgeId}`,
    );
  }
  requireCondition(
    Array.isArray(question.options) && question.options.length === 4,
    `${question.id}は4択ではありません`,
  );
  const values = question.options.map((option) => option.value);
  requireCondition(
    OPTION_VALUES.every((value) => values.filter((candidate) => candidate === value).length === 1),
    `${question.id}の選択肢はA〜Dを1件ずつ含めてください`,
  );
  for (const option of question.options) {
    requireNonEmptyString(option.label, `${question.id}/${option.value}.label`);
    requireNonEmptyString(option.meaning, `${question.id}/${option.value}.meaning`);
    requireNonEmptyString(option.reason, `${question.id}/${option.value}.reason`);
  }
  requireCondition(
    OPTION_VALUES.filter((value) => value === question.correct_value).length === 1,
    `${question.id}.correct_valueがA〜Dにありません`,
  );
  requireCondition(
    Array.isArray(question.source_refs) && question.source_refs.length > 0,
    `${question.id}.source_refsが空です`,
  );
  for (const reference of question.source_refs)
    validateSourceReference(rootDir, reference, question.id);
  requireNonEmptyString(question.review_path, `${question.id}.review_path`);
  validateMarkdownReference(rootDir, question.review_path, `${question.id}.review_path`);
  requireCondition(
    question.review_path.startsWith(`${COURSE_ROOT}/modules/${moduleId}/`),
    `${question.id}.review_pathは該当モジュールの教材を参照してください`,
  );
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function validateAssessmentPackage(
  rootDir: string,
  moduleId: string,
  objectiveIds: string[],
  knowledgeIds: string[],
  objectiveKnowledge: Map<string, string[]>,
  availableSkills: Set<string>,
): number {
  const solutionPath = `${ASSESSMENT_ROOT}/reference-solutions/${moduleId}.md`;
  const scoringPath = `${ASSESSMENT_ROOT}/scoring-tests/${moduleId}.json`;
  const statePath = `${ASSESSMENT_ROOT}/completed-states/${moduleId}.json`;
  const solutionAbsolute = repositoryPath(rootDir, solutionPath);
  const scoringAbsolute = repositoryPath(rootDir, scoringPath);
  const stateAbsolute = repositoryPath(rootDir, statePath);
  for (const filePath of [solutionAbsolute, scoringAbsolute, stateAbsolute])
    requireCondition(
      fs.existsSync(filePath) && fs.statSync(filePath).isFile(),
      `評価資料がありません: ${filePath}`,
    );

  const solution = fs.readFileSync(solutionAbsolute, "utf8");
  requireCondition(solution.trim().length > 500, `${solutionPath}の解説が不足しています`);
  for (const id of [...objectiveIds, ...knowledgeIds])
    requireCondition(solution.includes(id), `${solutionPath}が${id}を根拠付きで扱っていません`);

  const scoring = JSON.parse(fs.readFileSync(scoringAbsolute, "utf8")) as {
    schema_version?: number;
    module_id?: string;
    revision?: string;
    skill_source?: { repository?: string; commit?: string; skills?: string[] };
    objective_ids?: string[];
    knowledge_ids?: string[];
    criteria?: {
      id?: string;
      objective_ids?: string[];
      knowledge_ids?: string[];
      required_evidence?: string[];
      pass_conditions?: string[];
      partial_credit?: string[];
      reject_if?: string[];
    }[];
    cases?: {
      id?: string;
      type?: string;
      response?: string;
      evidence?: string[];
      expected_decision?: string;
      rationale?: string;
      provided_revision?: string;
      expected_revision?: string;
      missing_required_evidence?: string[];
      calibration_expected_decisions?: string[];
    }[];
    evaluation_policy?: {
      automated_scope?: string;
      execution_evidence?: {
        schema_version?: number;
        kind?: string;
        source_path?: string;
        required_runs?: {
          spec?: string;
          label?: string;
          minimum_tests?: number;
          expected_outcome?: string;
          require_trace?: boolean;
        }[];
        required_verifications?: {
          skill?: string;
          evidence_path?: string;
          artifact_path?: string;
        }[];
      };
      formal_assessment?: {
        required?: boolean;
        phase_id?: string;
        terminal_module_id?: string;
        candidate_evaluator?: string;
        finalizer?: string;
        human_final_approval_required?: boolean;
        result_path?: string;
      };
      calibration?: {
        required?: boolean;
        scope?: string;
        critical_false_passes_allowed?: number;
        retain_expected_decision_labels_as?: string;
      };
      live_condition?: {
        required?: boolean;
        conditions_prepublished?: boolean;
        selection_rule?: string;
      };
    };
  };
  requireCondition(
    scoring.schema_version === 1 && scoring.module_id === moduleId,
    `${scoringPath}のschema/module IDが不正です`,
  );
  requireCondition(
    scoring.revision === "assessment-reference-v1",
    `${scoringPath}のrevisionが不正です`,
  );
  requireCondition(
    scoring.skill_source?.repository === "ryu-yoshikawa-pro-vision/qa-workflow-skills" &&
      scoring.skill_source.commit === "7cc6cba7772de549841a39d71694cbafbc783324" &&
      Array.isArray(scoring.skill_source.skills) &&
      scoring.skill_source.skills.length > 0,
    `${scoringPath}の固定Skill参照が不正です`,
  );
  for (const skill of scoring.skill_source.skills)
    requireCondition(
      REQUIRED_ASSESSMENT_SKILLS.includes(skill) && availableSkills.has(skill),
      `${scoringPath}のSkillがmanifestにありません: ${skill}`,
    );
  requireCondition(
    JSON.stringify(sortedUnique(scoring.objective_ids ?? [])) ===
      JSON.stringify(sortedUnique(objectiveIds)) &&
      JSON.stringify(sortedUnique(scoring.knowledge_ids ?? [])) ===
        JSON.stringify(sortedUnique(knowledgeIds)),
    `${scoringPath}の学習項目/知識範囲がグラフと一致しません`,
  );
  requireCondition(
    Array.isArray(scoring.criteria) && scoring.criteria.length >= objectiveIds.length,
    `${scoringPath}の評価基準が不足しています`,
  );
  const criterionObjectives = new Set<string>();
  const criterionIds = new Set<string>();
  for (const criterion of scoring.criteria) {
    requireCondition(
      typeof criterion.id === "string" && criterion.id.startsWith(`${moduleId}-`),
      `${scoringPath}のcriterion IDが不正です`,
    );
    requireCondition(
      !criterionIds.has(criterion.id),
      `${scoringPath}のcriterion IDが重複しています: ${criterion.id}`,
    );
    criterionIds.add(criterion.id);
    requireCondition(
      Array.isArray(criterion.objective_ids) &&
        criterion.objective_ids.length > 0 &&
        Array.isArray(criterion.knowledge_ids) &&
        criterion.knowledge_ids.length > 0 &&
        Array.isArray(criterion.required_evidence) &&
        criterion.required_evidence.length > 0 &&
        Array.isArray(criterion.pass_conditions) &&
        criterion.pass_conditions.length > 0 &&
        Array.isArray(criterion.partial_credit) &&
        criterion.partial_credit.length > 0 &&
        Array.isArray(criterion.reject_if) &&
        criterion.reject_if.length > 0,
      `${scoringPath}/${criterion.id}に判定根拠・部分点・棄却条件がありません`,
    );
    for (const objectiveId of criterion.objective_ids) {
      requireCondition(
        objectiveIds.includes(objectiveId),
        `${scoringPath}が別モジュールの学習項目を参照しています: ${objectiveId}`,
      );
      criterionObjectives.add(objectiveId);
      const expectedKnowledge = objectiveKnowledge.get(objectiveId) ?? [];
      for (const knowledgeId of criterion.knowledge_ids)
        requireCondition(
          expectedKnowledge.includes(knowledgeId),
          `${objectiveId}と${knowledgeId}の対応が知識グラフにありません`,
        );
    }
    for (const knowledgeId of criterion.knowledge_ids)
      requireCondition(
        knowledgeIds.includes(knowledgeId),
        `${scoringPath}が別モジュールの知識を参照しています: ${knowledgeId}`,
      );
  }
  requireCondition(
    objectiveIds.every((id) => criterionObjectives.has(id)),
    `${scoringPath}に評価基準のない学習項目があります`,
  );
  requireCondition(
    Array.isArray(scoring.cases) && scoring.cases.length >= REQUIRED_SCORING_CASE_TYPES.length,
    `${scoringPath}の評価例が不足しています`,
  );
  const caseTypes = new Set<string>();
  const caseIds = new Set<string>();
  for (const example of scoring.cases) {
    requireCondition(
      typeof example.id === "string" &&
        typeof example.type === "string" &&
        typeof example.response === "string" &&
        example.response.trim().length > 0 &&
        Array.isArray(example.evidence) &&
        example.evidence.length > 0 &&
        typeof example.expected_decision === "string" &&
        typeof example.rationale === "string",
      `${scoringPath}に構造不完全な採点例があります`,
    );
    requireCondition(
      !caseIds.has(example.id),
      `${scoringPath}に重複する採点例IDがあります: ${example.id}`,
    );
    requireCondition(
      example.id.startsWith(`${moduleId}-`),
      `${scoringPath}に別モジュールの採点例IDがあります: ${example.id}`,
    );
    caseIds.add(example.id);
    caseTypes.add(example.type);
    if (example.type === "acceptable-alternative")
      requireCondition(
        Array.isArray(example.calibration_expected_decisions) &&
          example.calibration_expected_decisions.includes("pass_with_reason") &&
          example.calibration_expected_decisions.includes("pass"),
        `${scoringPath}/${example.id} must allow a valid alternative without forcing one label`,
      );
    if (example.type === "revision-mismatch")
      requireCondition(
        typeof example.provided_revision === "string" &&
          example.provided_revision.length > 0 &&
          typeof example.expected_revision === "string" &&
          example.expected_revision.length > 0 &&
          example.provided_revision !== example.expected_revision &&
          example.expected_decision === "ungradable",
        `${scoringPath}/${example.id} must mark a revision mismatch as ungradable and identify distinct revisions`,
      );
    if (example.type === "required-evidence-missing")
      requireCondition(
        Array.isArray(example.missing_required_evidence) &&
          example.missing_required_evidence.length > 0 &&
          example.expected_decision === "ungradable",
        `${scoringPath}/${example.id} must mark missing required evidence as ungradable and list the missing evidence`,
      );
    if (example.type === "prompt-injection")
      requireCondition(
        example.expected_decision === "ungradable" &&
          example.evidence.some((item) => item.includes(`/states/${moduleId}/end.json`)),
        `${scoringPath}/${example.id} must reject prompt-injection claims without learner evidence`,
      );
  }
  requireCondition(
    REQUIRED_SCORING_CASE_TYPES.every((type) => caseTypes.has(type)),
    `${scoringPath}に正答/誤答/部分/別解/評価不能の代表例が必要です`,
  );
  requireCondition(
    typeof scoring.evaluation_policy?.automated_scope === "string" &&
      scoring.evaluation_policy.automated_scope.includes("Node.js validates") &&
      scoring.evaluation_policy.formal_assessment?.required === true &&
      scoring.evaluation_policy.formal_assessment.human_final_approval_required === false &&
      scoring.evaluation_policy.formal_assessment.candidate_evaluator?.includes("OpenCode") &&
      scoring.evaluation_policy.formal_assessment.finalizer?.includes("Node.js") &&
      scoring.evaluation_policy.calibration?.required === true &&
      scoring.evaluation_policy.calibration.critical_false_passes_allowed === 0 &&
      scoring.evaluation_policy.calibration.scope?.includes("model id") &&
      scoring.evaluation_policy.calibration.scope.includes("prompt SHA-256"),
    `${scoringPath}がNode.js確定・独立AI候補・モデル校正を分離していません`,
  );
  const moduleNumber = Number(moduleId.slice(1));
  const expectedPhase = moduleNumber <= 4 ? "P1" : moduleNumber <= 7 ? "P2" : "P3";
  const terminalModule = expectedPhase === "P1" ? "M04" : expectedPhase === "P2" ? "M07" : "M10";
  requireCondition(
    scoring.evaluation_policy.formal_assessment?.phase_id === expectedPhase &&
      scoring.evaluation_policy.formal_assessment.terminal_module_id === terminalModule &&
      scoring.evaluation_policy.formal_assessment.result_path ===
        `workspace/.course-assessments/${expectedPhase}/attempts/<assessment_id>/result.json`,
    `${scoringPath}のPhase評価集約先が不正です`,
  );
  if (moduleId === terminalModule)
    requireCondition(
      scoring.evaluation_policy.live_condition?.required === true &&
        scoring.evaluation_policy.live_condition.conditions_prepublished === false &&
        typeof scoring.evaluation_policy.live_condition.selection_rule === "string",
      `${scoringPath}が評価時に提示する本人判断条件を適切に分離していません`,
    );
  else
    requireCondition(
      scoring.evaluation_policy.live_condition === undefined,
      `${scoringPath}はPhase末のlive conditionを非終端moduleへ要求してはいけません`,
    );
  const executionEvidence = scoring.evaluation_policy.execution_evidence;
  const expectedPlaywrightRuns: Record<string, unknown[]> = {
    M05: [
      {
        spec: "product-link.spec.ts",
        label: "before",
        minimum_tests: 1,
        expected_outcome: "failed",
        require_trace: true,
      },
      {
        spec: "product-link.spec.ts",
        label: "after",
        minimum_tests: 1,
        expected_outcome: "passed",
      },
    ],
    M06: [
      { spec: "cart-cases.spec.ts", label: "main", minimum_tests: 3, expected_outcome: "passed" },
      { spec: "new-case.spec.ts", label: "initial", minimum_tests: 1, expected_outcome: "passed" },
      { spec: "new-case.spec.ts", label: "repeat", minimum_tests: 1, expected_outcome: "passed" },
    ],
    M07: [
      {
        spec: "repaired-assertion.spec.ts",
        label: "before",
        minimum_tests: 1,
        expected_outcome: "failed",
        require_trace: true,
      },
      {
        spec: "repaired-assertion.spec.ts",
        label: "after",
        minimum_tests: 1,
        expected_outcome: "passed",
      },
      {
        spec: "maintenance.spec.ts",
        label: "before",
        minimum_tests: 2,
        expected_outcome: "passed",
      },
      { spec: "maintenance.spec.ts", label: "after", minimum_tests: 2, expected_outcome: "passed" },
    ],
  };
  if (moduleId === "M03")
    requireCondition(
      executionEvidence?.schema_version === 1 &&
        executionEvidence.kind === "pinned-skill-runtime-contract" &&
        executionEvidence.source_path ===
          "skills/test-condition-design/scripts/runtime_contract.py" &&
        JSON.stringify(executionEvidence.required_verifications) ===
          JSON.stringify([
            {
              skill: "test-condition-design",
              evidence_path: "workspace/M03/condition-runtime-evidence.json",
              artifact_path: "workspace/M03/condition-design.md",
            },
            {
              skill: "test-case-design",
              evidence_path: "workspace/M03/case-runtime-evidence.json",
              artifact_path: "workspace/M03/cases.md",
            },
          ]),
      `${scoringPath}は2つの固定Skill runtime検証を要求してください`,
    );
  else if (Object.hasOwn(expectedPlaywrightRuns, moduleId))
    requireCondition(
      executionEvidence?.schema_version === 1 &&
        executionEvidence.kind === "playwright-run-record" &&
        JSON.stringify(executionEvidence.required_runs) ===
          JSON.stringify(expectedPlaywrightRuns[moduleId]),
      `${scoringPath}は対象moduleの修正前後/再実行Run証拠を正確に要求してください`,
    );
  else
    requireCondition(
      executionEvidence === undefined,
      `${scoringPath}は実行証拠を必要としないmoduleに実行条件を追加してはいけません`,
    );

  const completed = JSON.parse(fs.readFileSync(stateAbsolute, "utf8")) as {
    schema_version?: number;
    module_id?: string;
    revision?: string;
    objective_ids?: string[];
    knowledge_ids?: string[];
    reference_only?: boolean;
    source_state_revision?: string;
    artifacts?: {
      id?: string;
      path?: string;
      revision?: string;
      contract_id?: string;
      expected_data?: Record<string, unknown>;
    }[];
    checks?: { id?: string; expectation?: string; observed?: unknown; evidence_ref?: string }[];
  };
  requireCondition(
    completed.schema_version === 1 && completed.module_id === moduleId,
    `${statePath}のschema/module IDが不正です`,
  );
  requireCondition(
    completed.revision === "assessment-reference-v1" && completed.reference_only === true,
    `${statePath}が公開基準データとして宣言されていません`,
  );
  requireCondition(
    completed.source_state_revision === "ai-assisted-qa-course-v3",
    `${statePath}のsource end-state revisionが一致しません`,
  );
  requireCondition(
    JSON.stringify(sortedUnique(completed.objective_ids ?? [])) ===
      JSON.stringify(sortedUnique(objectiveIds)) &&
      JSON.stringify(sortedUnique(completed.knowledge_ids ?? [])) ===
        JSON.stringify(sortedUnique(knowledgeIds)),
    `${statePath}の学習項目/知識範囲がグラフと一致しません`,
  );
  requireCondition(
    Array.isArray(completed.artifacts) && completed.artifacts.length > 0,
    `${statePath}に完成基準artifactがありません`,
  );
  for (const artifact of completed.artifacts) {
    requireCondition(
      typeof artifact.id === "string" &&
        typeof artifact.path === "string" &&
        typeof artifact.revision === "string" &&
        typeof artifact.contract_id === "string" &&
        artifact.expected_data !== null &&
        typeof artifact.expected_data === "object",
      `${statePath}に不完全な完成artifact契約があります`,
    );
  }
  requireCondition(
    Array.isArray(completed.checks) &&
      completed.checks.length >= 3 &&
      completed.checks.every(
        (check) =>
          typeof check.id === "string" &&
          typeof check.expectation === "string" &&
          check.observed === null &&
          typeof check.evidence_ref === "string",
      ),
    `${statePath}に未実施を明示した完了照合条件がありません`,
  );
  return 3;
}

export function validateAiAssistedQa(rootDir = process.cwd()): AiAssistedQaValidationResult {
  const courseManifestPath = repositoryPath(rootDir, "training/course-sync/manifest.json");
  const courseManifest = JSON.parse(fs.readFileSync(courseManifestPath, "utf8")) as {
    state_contract_revision?: string;
    load_files?: { module_id?: string; source_path?: string; target_path?: string }[];
    local_files?: { source_path?: string; target_path?: string }[];
    external_skill_files?: { source_path?: string; target_path?: string; skill?: string }[];
    forbidden_paths?: string[];
  };
  requireCondition(
    courseManifest.state_contract_revision === "ai-assisted-qa-course-v3",
    "course distribution state contract revision must be v3",
  );
  const graphAbsolute = repositoryPath(rootDir, GRAPH_PATH);
  const graph = JSON.parse(fs.readFileSync(graphAbsolute, "utf8")) as {
    nodes?: {
      id?: string;
      type?: string;
      module?: string;
      phase?: string;
      path?: string;
      reference_materials?: {
        id?: string;
        module_id?: string;
        kind?: string;
        path?: string;
        revision?: string;
        public?: boolean;
        included_in_learner_package?: boolean;
      }[];
    }[];
    edges?: { from?: string; relation?: string; to?: string }[];
  };
  const objectiveIds = new Set(
    (graph.nodes ?? [])
      .filter((node) => node.type === "learning_objective" && typeof node.id === "string")
      .map((node) => node.id as string),
  );
  requireCondition(
    objectiveIds.size >= 51,
    `知識グラフの学習項目が既存契約の51件より少なくなっています: ${objectiveIds.size}`,
  );
  const knowledgeByModule = new Map<string, string[]>();
  for (const node of graph.nodes ?? []) {
    if (node.type !== "knowledge" || typeof node.id !== "string" || typeof node.module !== "string")
      continue;
    knowledgeByModule.set(node.module, [...(knowledgeByModule.get(node.module) ?? []), node.id]);
  }
  const objectiveKnowledge = new Map<string, string[]>();
  for (const edge of graph.edges ?? []) {
    if (
      edge.relation !== "requires_knowledge" ||
      typeof edge.from !== "string" ||
      typeof edge.to !== "string"
    )
      continue;
    objectiveKnowledge.set(edge.from, [...(objectiveKnowledge.get(edge.from) ?? []), edge.to]);
  }
  requireCondition(
    [...knowledgeByModule.values()].reduce((sum, items) => sum + items.length, 0) >= 58,
    "知識グラフの理解ノードが既存契約の58件より少なくなっています",
  );
  const allModules = Array.from({ length: 11 }, (_, index) => `M${String(index).padStart(2, "0")}`);
  const assessmentMaterials = (graph.nodes ?? [])
    .filter((node) => node.type === "assessment")
    .flatMap((node) => node.reference_materials ?? []);
  const expectedAssessmentPaths = allModules.flatMap((moduleId) => [
    `${ASSESSMENT_ROOT}/reference-solutions/${moduleId}.md`,
    `${ASSESSMENT_ROOT}/scoring-tests/${moduleId}.json`,
    `${ASSESSMENT_ROOT}/completed-states/${moduleId}.json`,
  ]);
  requireCondition(
    assessmentMaterials.length === expectedAssessmentPaths.length &&
      new Set(assessmentMaterials.map((material) => material.path)).size ===
        expectedAssessmentPaths.length &&
      expectedAssessmentPaths.every((expectedPath) =>
        assessmentMaterials.some(
          (material) =>
            material.path === expectedPath &&
            material.revision === "assessment-reference-v1" &&
            material.public === true &&
            material.included_in_learner_package === false,
        ),
      ),
    "公開評価資料のID/パス/revisionと学習者配布境界を知識グラフへ登録してください",
  );
  for (const material of assessmentMaterials) {
    const module = graph.nodes?.find(
      (node) => node.type === "module" && node.id === material.module_id,
    );
    const phaseAssessment = graph.nodes?.find(
      (node) => node.type === "assessment" && node.phase === module?.phase,
    );
    requireCondition(
      Boolean(module && phaseAssessment?.reference_materials?.includes(material)),
      `評価資料の参照が対応するphase/moduleにありません: ${material.path}`,
    );
  }
  const assessmentForbiddenPaths = [
    "training/ai-assisted-qa-course/assessment/reference-solutions/**",
    "training/ai-assisted-qa-course/assessment/scoring-tests/**",
    "training/ai-assisted-qa-course/assessment/completed-states/**",
  ];
  requireCondition(
    assessmentForbiddenPaths.every((item) => courseManifest.forbidden_paths?.includes(item)),
    "公開の模範/採点/完成状態は配布manifestで明示的に除外してください",
  );
  const distributionEntries = [
    ...(courseManifest.local_files ?? []),
    ...(courseManifest.external_skill_files ?? []),
    ...(courseManifest.load_files ?? []),
  ];
  for (const entry of distributionEntries) {
    const pathValues = [entry.source_path, entry.target_path].filter(
      (item): item is string => typeof item === "string",
    );
    requireCondition(
      pathValues.every(
        (item) =>
          !/\/assessment\/(?:reference-solutions|scoring-tests|completed-states)(?:\/|$)/i.test(
            `/${item}`,
          ),
      ),
      "公開の模範/採点/完成状態が学習者配布manifestへ含まれています",
    );
  }
  const quizDirectory = repositoryPath(rootDir, QUIZ_ROOT);
  requireCondition(fs.existsSync(quizDirectory), `クイズディレクトリがありません: ${QUIZ_ROOT}`);

  const quizFiles = fs
    .readdirSync(quizDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^M(?:0[0-9]|10)\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const requiredModules = Array.from(
    { length: 11 },
    (_, index) => `M${String(index).padStart(2, "0")}`,
  );
  requireCondition(
    JSON.stringify(quizFiles.map((name) => name.slice(0, -5))) === JSON.stringify(requiredModules),
    "M00〜M10の確認クイズを各1ファイル用意してください",
  );

  const seenQuestionIds = new Set<string>();
  const coveredObjectiveIds = new Set<string>();
  let questionCount = 0;
  let stateCount = 0;
  let assessmentFiles = 0;
  const modules: string[] = [];
  for (const moduleId of requiredModules) {
    const fileName = `${moduleId}.json`;
    requireCondition(MODULE_ID_PATTERN.test(moduleId), `不正なモジュールIDです: ${moduleId}`);
    const quizPath = `${QUIZ_ROOT}/${fileName}`;
    const modulePath = `${COURSE_ROOT}/modules/${moduleId}/README.md`;
    requireCondition(
      fs.existsSync(repositoryPath(rootDir, modulePath)),
      `${moduleId}の教材Markdownがありません`,
    );
    const quiz = JSON.parse(
      fs.readFileSync(repositoryPath(rootDir, quizPath), "utf8"),
    ) as QuizDocument;
    requireCondition(quiz.schema_version === 1, `${fileName}のschema_versionは未対応です`);
    requireCondition(quiz.module_id === moduleId, `${fileName}のmodule_idが一致しません`);
    requireCondition(
      Array.isArray(quiz.questions) && quiz.questions.length > 0,
      `${fileName}に問題がありません`,
    );

    for (const question of quiz.questions) {
      validateQuestion(
        rootDir,
        moduleId,
        question,
        objectiveIds,
        new Set(knowledgeByModule.get(moduleId) ?? []),
        graph.edges ?? [],
        objectiveKnowledge,
      );
      requireCondition(
        graph.nodes?.some((node) => node.id === `QUIZ-${question.id}` && node.type === "quiz"),
        `問題の知識グラフノードがありません: ${question.id}`,
      );
      requireCondition(!seenQuestionIds.has(question.id), `問題IDが重複しています: ${question.id}`);
      seenQuestionIds.add(question.id);
      const graphKnowledgeIds = (graph.edges ?? [])
        .filter((edge) => edge.from === `QUIZ-${question.id}` && edge.relation === "evaluates" && edge.to?.startsWith("K-"))
        .map((edge) => edge.to as string);
      requireCondition(
        JSON.stringify(sortedUnique(graphKnowledgeIds)) === JSON.stringify(sortedUnique(question.knowledge_ids)),
        `${question.id}の理解ノード参照が知識グラフと一致しません`,
      );
      for (const objectiveId of question.objective_ids) coveredObjectiveIds.add(objectiveId);
      questionCount += 1;
    }

    const inputPath = `training/ai-assisted-qa-course/inputs/${moduleId}/start.md`;
    const exercisePath = `training/ai-assisted-qa-course/exercises/${moduleId}/exercise.md`;
    const submissionPath = `training/ai-assisted-qa-course/exercises/${moduleId}/submission-template.md`;
    for (const requiredPath of [inputPath, exercisePath, submissionPath]) {
      const absolutePath = repositoryPath(rootDir, requiredPath);
      requireCondition(
        fs.existsSync(absolutePath),
        `${moduleId}の公開演習素材がありません: ${requiredPath}`,
      );
      requireCondition(
        fs.statSync(absolutePath).isFile() &&
          fs.readFileSync(absolutePath, "utf8").trim().length > 40,
        `${requiredPath}が空か短すぎます`,
      );
    }
    const exerciseText = fs.readFileSync(repositoryPath(rootDir, exercisePath), "utf8");
    requireCondition(
      /提出|提出物/.test(exerciseText),
      `${moduleId}の演習に提出物の指示がありません`,
    );
    const moduleObjectiveIds = [...objectiveIds].filter((objectiveId) =>
      objectiveId.startsWith(`${moduleId}-`),
    );
    requireCondition(
      moduleObjectiveIds.length > 0,
      `${moduleId}の学習項目が知識グラフにありません`,
    );
    const moduleKnowledgeIds = sortedUnique(knowledgeByModule.get(moduleId) ?? []);
    requireCondition(moduleKnowledgeIds.length > 0, `${moduleId}のknowledge nodeがありません`);
    assessmentFiles += validateAssessmentPackage(
      rootDir,
      moduleId,
      sortedUnique(moduleObjectiveIds),
      moduleKnowledgeIds,
      objectiveKnowledge,
      new Set(
        (courseManifest.external_skill_files ?? [])
          .map((item) => item.skill)
          .filter((item): item is string => typeof item === "string"),
      ),
    );

    for (const stateName of ["start", "end"] as const) {
      const statePath = `training/ai-assisted-qa-course/states/${moduleId}/${stateName}.json`;
      const stateAbsolute = repositoryPath(rootDir, statePath);
      requireCondition(
        fs.existsSync(stateAbsolute),
        `${moduleId}/${stateName}の公開状態契約がありません`,
      );
      const state = JSON.parse(fs.readFileSync(stateAbsolute, "utf8")) as {
        schema_version?: number;
        module_id?: string;
        state?: string;
        revision?: string;
        source_sha?: string | null;
        source_sha_resolution?: string;
        public_contract?: boolean;
        read_only?: boolean;
        inputs?: {
          artifact_id?: string;
          path?: string;
          revision?: string;
          contract_id?: string;
          from_module?: string;
          optional?: boolean;
          same_input_contract?: boolean;
        }[];
        public_fallback?: {
          artifact_id?: string;
          revision?: string;
          contract_id?: string;
          path?: string;
          public?: boolean;
        };
        outputs?: {
          artifact_id?: string;
          path?: string;
          revision?: string;
          contract_id?: string;
        }[];
        expected?: { required_paths?: string[]; objective_ids?: string[]; phase?: string };
        phase_assessment?: {
          phase_id?: string;
          terminal_module_id?: string;
          required_objective_ids?: string[];
          required_at_terminal_module?: string;
          assessment_is_terminal_only?: boolean;
          entry_command?: string;
          result_root?: string;
          mastery_status?: string;
        };
        checks?: { id?: string; mode?: string; condition?: string }[];
        references?: string[];
        distribution?: {
          public_source?: boolean;
          includes_reference_solutions?: boolean;
          includes_scoring_tests?: boolean;
          includes_completed_states?: boolean;
        };
      };
      requireCondition(
        state.schema_version === 1 && state.module_id === moduleId && state.state === stateName,
        `${statePath}のID/版が不正です`,
      );
      requireCondition(
        state.revision === "ai-assisted-qa-course-v3",
        `${statePath}のrevisionが不正です`,
      );
      requireCondition(
        state.source_sha === null && typeof state.source_sha_resolution === "string",
        `${statePath}は同期時の確定SHA束縛を宣言してください`,
      );
      requireCondition(
        state.public_contract === true && state.read_only === true,
        `${statePath}は公開の読取専用契約である必要があります`,
      );
      requireCondition(
        state.distribution?.public_source === true &&
          state.distribution.includes_reference_solutions === false &&
          state.distribution.includes_scoring_tests === false &&
          state.distribution.includes_completed_states === false,
        `${statePath}の公開ソース・学習者配布範囲の契約が不正です`,
      );
      requireCondition(
        state.expected?.required_paths?.length,
        `${statePath}に必須パスがありません`,
      );
      requireCondition(
        JSON.stringify([...(state.expected?.objective_ids ?? [])].sort()) ===
          JSON.stringify([...moduleObjectiveIds].sort()),
        `${statePath}の学習項目が知識グラフと一致しません`,
      );
      requireCondition(
        Array.isArray(state.checks) &&
          state.checks.length >= 3 &&
          state.checks.every((check) => check.id && check.mode && check.condition),
        `${statePath}に照合条件がありません`,
      );
      if (stateName === "end") {
        const modulePhase = graph.nodes?.find(
          (node) => node.type === "module" && node.id === moduleId,
        )?.phase;
        const terminalByPhase = { P1: "M04", P2: "M07", P3: "M10" } as const;
        const terminalModule =
          modulePhase && modulePhase in terminalByPhase
            ? terminalByPhase[modulePhase as keyof typeof terminalByPhase]
            : undefined;
        const modulesForPhase = new Set(
          (graph.nodes ?? [])
            .filter((node) => node.type === "module" && node.phase === modulePhase)
            .map((node) => node.id),
        );
        const phaseObjectiveIds = (graph.nodes ?? [])
          .filter(
            (node) =>
              node.type === "learning_objective" &&
              typeof node.id === "string" &&
              modulesForPhase.has(node.id.slice(0, 3)),
          )
          .map((node) => node.id as string)
          .sort();
        const phaseAssessment = state.phase_assessment;
        requireCondition(
          Boolean(
            modulePhase &&
            terminalModule &&
            phaseAssessment?.phase_id === modulePhase &&
            phaseAssessment.terminal_module_id === terminalModule &&
            phaseAssessment.required_at_terminal_module === terminalModule &&
            phaseAssessment.assessment_is_terminal_only === true &&
            phaseAssessment.entry_command ===
              `pnpm course:assess ${terminalModule} --model provider/model-id` &&
            phaseAssessment.result_root ===
              `workspace/.course-assessments/${modulePhase}/attempts` &&
            phaseAssessment.mastery_status === "not_evaluated_by_course_check" &&
            JSON.stringify([...(phaseAssessment.required_objective_ids ?? [])].sort()) ===
              JSON.stringify(phaseObjectiveIds),
          ),
          `${statePath}のPhase終端評価参照が知識グラフ/Phase契約と一致しません`,
        );
        const hasTerminalAssessmentCheck = state.checks?.some(
          (check) => check.mode === "phase-assessment-reference",
        );
        requireCondition(
          hasTerminalAssessmentCheck === (moduleId === terminalModule),
          `${statePath}はPhase終端moduleだけを正式評価の入口として参照してください`,
        );
      }
      requireCondition(
        Array.isArray(state.references) && state.references.length >= 2,
        `${statePath}に参照がありません`,
      );
      for (const reference of state.references ?? [])
        validateSourceReference(rootDir, reference, `${moduleId}/${stateName}`);
      if (stateName === "start") {
        requireCondition(Array.isArray(state.inputs), `${statePath}にinputs配列がありません`);
        const fallbackInput = state.public_fallback;
        requireCondition(
          Boolean(
            fallbackInput?.artifact_id &&
            fallbackInput.revision &&
            fallbackInput.contract_id &&
            fallbackInput.path &&
            fallbackInput.public === true,
          ),
          `${statePath}の公開fallback契約が不完全です`,
        );
        const fallbackPath = repositoryPath(
          rootDir,
          `training/ai-assisted-qa-course/${fallbackInput?.path ?? ""}`,
        );
        requireCondition(
          fs.existsSync(fallbackPath) &&
            state.expected?.required_paths?.includes(fallbackInput?.path ?? ""),
          `${statePath}の公開fallbackが必須入力に含まれていません`,
        );
        const currentIndex = requiredModules.indexOf(moduleId);
        if (currentIndex === 0) {
          requireCondition(
            state.inputs.length === 0,
            `${statePath}の先行入力は空である必要があります`,
          );
        } else {
          const previousModule = requiredModules[currentIndex - 1];
          const previousEndPath = repositoryPath(
            rootDir,
            `training/ai-assisted-qa-course/states/${previousModule}/end.json`,
          );
          const previousEnd = JSON.parse(fs.readFileSync(previousEndPath, "utf8")) as {
            outputs?: {
              artifact_id?: string;
              path?: string;
              revision?: string;
              contract_id?: string;
            }[];
          };
          requireCondition(state.inputs.length > 0, `${statePath}の先行入力がありません`);
          for (const input of state.inputs) {
            const priorOutput = previousEnd.outputs?.find(
              (output) => output.artifact_id === input.artifact_id,
            );
            requireCondition(
              Boolean(
                priorOutput &&
                input.from_module === previousModule &&
                input.optional === true &&
                input.same_input_contract === true &&
                input.path === priorOutput.path &&
                input.revision === priorOutput.revision &&
                input.contract_id === priorOutput.contract_id &&
                input.contract_id === fallbackInput?.contract_id &&
                input.revision !== fallbackInput?.revision &&
                fallbackInput?.artifact_id !== input.artifact_id,
              ),
              `${statePath}の先行artifact ID/path/revision/contractが前工程と一致しません`,
            );
          }
        }
      } else {
        requireCondition(
          Array.isArray(state.outputs) && state.outputs.length > 0,
          `${statePath}に終了artifactがありません`,
        );
        const outputIds = new Set<string>();
        const outputPaths = new Set<string>();
        for (const output of state.outputs ?? []) {
          requireCondition(
            Boolean(
              output.artifact_id &&
              output.path &&
              output.revision &&
              output.contract_id &&
              state.expected?.required_paths?.includes(output.path),
            ),
            `${statePath}の終了artifact契約が不完全です`,
          );
          requireCondition(
            !outputIds.has(output.artifact_id ?? "") && !outputPaths.has(output.path ?? ""),
            `${statePath}の終了artifact ID/pathが重複しています`,
          );
          outputIds.add(output.artifact_id ?? "");
          outputPaths.add(output.path ?? "");
          requireCondition(
            courseManifest.load_files?.some(
              (entry) => entry.module_id === moduleId && entry.target_path === output.path,
            ),
            `${statePath}の終了artifact pathが単一モジュールのload allowlistにありません`,
          );
        }
      }
      stateCount += 1;
    }
    modules.push(moduleId);
  }

  requireCondition(
    coveredObjectiveIds.size === objectiveIds.size,
    `確認クイズから参照されない学習項目があります: ${[...objectiveIds]
      .filter((id) => !coveredObjectiveIds.has(id))
      .sort()
      .join(", ")}`,
  );
  for (const rubricPath of [
    "training/ai-assisted-qa-course/assessment/phase-1-rubric.md",
    "training/ai-assisted-qa-course/assessment/phase-2-rubric.md",
    "training/ai-assisted-qa-course/assessment/phase-3-rubric.md",
  ]) {
    const absolutePath = repositoryPath(rootDir, rubricPath);
    requireCondition(
      fs.existsSync(absolutePath) && fs.readFileSync(absolutePath, "utf8").trim().length > 80,
      `フェーズ別公開評価基準がありません: ${rubricPath}`,
    );
  }
  requireCondition(stateCount === 22, `開始・終了状態は22件必要です: ${stateCount}`);

  return {
    modules,
    questionCount,
    objectiveCount: coveredObjectiveIds.size,
    stateCount,
    assessmentFiles,
  };
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const result = validateAiAssistedQa();
  console.log(
    `AI協働テスト自動化課程を検証しました: ${result.modules.join(", ")} / ${result.questionCount}問 / 評価資料${result.assessmentFiles}件`,
  );
}
