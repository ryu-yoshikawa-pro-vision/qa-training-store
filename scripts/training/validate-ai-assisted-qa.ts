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
  const graphAbsolute = repositoryPath(rootDir, GRAPH_PATH);
  const graph = JSON.parse(fs.readFileSync(graphAbsolute, "utf8")) as {
    nodes?: { id?: string; type?: string }[];
  };
  const objectiveIds = new Set(
    (graph.nodes ?? [])
      .filter((node) => node.type === "learning_objective" && typeof node.id === "string")
      .map((node) => node.id as string),
  );
  const quizDirectory = repositoryPath(rootDir, QUIZ_ROOT);
  requireCondition(fs.existsSync(quizDirectory), `クイズディレクトリがありません: ${QUIZ_ROOT}`);

  const quizFiles = fs
    .readdirSync(quizDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^M(?:0[0-9]|10)\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  requireCondition(quizFiles.length > 0, "新課程のクイズJSONがありません");

  const seenQuestionIds = new Set<string>();
  let questionCount = 0;
  const modules: string[] = [];
  for (const fileName of quizFiles) {
    const moduleId = fileName.slice(0, -".json".length);
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
      questionCount += 1;
    }
    modules.push(moduleId);
  }

  return { modules, questionCount };
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
