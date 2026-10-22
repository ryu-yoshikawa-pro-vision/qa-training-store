import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseMarkdownFile } from "../spec/markdown";

const COURSE_ROOT = "docs/curriculum/ai-assisted-qa";
const QUIZ_ROOT = `${COURSE_ROOT}/quizzes`;
const GRAPH_PATH = `${COURSE_ROOT}/knowledge-graph.json`;
const MODULE_ID_PATTERN = /^M(?:0[0-9]|10)$/;
const QUESTION_ID_PATTERN = /^(M(?:0[0-9]|10))-Q[0-9]{2}$/;
const OPTION_VALUES = ["A", "B", "C", "D"] as const;
const PINNED_SKILL_REFERENCE =
  "ryu-yoshikawa-pro-vision/qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324";

type QuizOption = {
  value: string;
  label: string;
  meaning: string;
  reason: string;
};

type QuizQuestion = {
  id: string;
  objective_ids: string[];
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

export function validateAiAssistedQa(rootDir = process.cwd()): AiAssistedQaValidationResult {
  const courseManifestPath = repositoryPath(rootDir, "training/course-sync/manifest.json");
  const courseManifest = JSON.parse(fs.readFileSync(courseManifestPath, "utf8")) as {
    state_contract_revision?: string;
    load_files?: { module_id?: string; target_path?: string }[];
  };
  requireCondition(
    courseManifest.state_contract_revision === "ai-assisted-qa-course-v2",
    "course distribution state contract revision must be v2",
  );
  const graphAbsolute = repositoryPath(rootDir, GRAPH_PATH);
  const graph = JSON.parse(fs.readFileSync(graphAbsolute, "utf8")) as {
    nodes?: { id?: string; type?: string }[];
  };
  const objectiveIds = new Set(
    (graph.nodes ?? [])
      .filter((node) => node.type === "learning_objective" && typeof node.id === "string")
      .map((node) => node.id as string),
  );
  requireCondition(
    objectiveIds.size === 51,
    `知識グラフの学習項目は51件必要です: ${objectiveIds.size}`,
  );
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
      validateQuestion(rootDir, moduleId, question, objectiveIds);
      requireCondition(!seenQuestionIds.has(question.id), `問題IDが重複しています: ${question.id}`);
      seenQuestionIds.add(question.id);
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
        expected?: { required_paths?: string[]; objective_ids?: string[] };
        checks?: { id?: string; mode?: string; condition?: string }[];
        references?: string[];
        confidentiality?: {
          public?: boolean;
          contains_model_answers?: boolean;
          contains_private_assessment_tests?: boolean;
        };
      };
      requireCondition(
        state.schema_version === 1 && state.module_id === moduleId && state.state === stateName,
        `${statePath}のID/版が不正です`,
      );
      requireCondition(
        state.revision === "ai-assisted-qa-course-v2",
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
        state.confidentiality?.public === true &&
          state.confidentiality.contains_model_answers === false &&
          state.confidentiality.contains_private_assessment_tests === false,
        `${statePath}に非公開資料が混入する可能性があります`,
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

  return { modules, questionCount, objectiveCount: coveredObjectiveIds.size, stateCount };
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
    `AI協働テスト自動化クイズを検証しました: ${result.modules.join(", ")} / ${result.questionCount}問`,
  );
}
