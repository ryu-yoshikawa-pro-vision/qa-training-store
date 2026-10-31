import { MODEL_ID_PATTERN } from "./ai-assisted-qa-assessment-core.mjs";

const MODULE_ID_PATTERN = /^M(?:0[0-9]|10)$/;
export const COURSE_TUTOR_AGENT_ID = "qa-course-tutor";
export const REQUIRED_OPEN_CODE_VERSION = "2.0.22";

function fail(message) {
  throw new Error(message);
}

export function parseTutorArgs(args) {
  const [moduleId, ...options] = args;
  if (!MODULE_ID_PATTERN.test(moduleId ?? ""))
    fail("Usage: pnpm course:tutor M00|M01|...|M10 --model provider/model-id");
  if (options.length !== 2 || options[0] !== "--model" || !MODEL_ID_PATTERN.test(options[1]))
    fail(
      "course:tutor requires exactly one explicit --model provider/model-id; model fallback is disabled",
    );
  return { moduleId, modelId: options[1] };
}

export function buildTutorConfig({ moduleId, modelId }) {
  if (!MODULE_ID_PATTERN.test(moduleId ?? "") || !MODEL_ID_PATTERN.test(modelId ?? ""))
    fail("Tutor module or model ID is invalid");
  const readPaths = [
    `course/modules/${moduleId}/*`,
    `course/exercises/${moduleId}/*`,
    `course/quizzes/${moduleId}.json`,
    `course/states/${moduleId}/*`,
    "course/start-here.md",
    "course/assessment/*",
    "docs/spec/features/*",
    `workspace/${moduleId}/*`,
  ];
  return {
    $schema: "https://opencode.ai/config.json",
    model: modelId,
    default_agent: COURSE_TUTOR_AGENT_ID,
    autoupdate: false,
    share: "disabled",
    agents: {
      [COURSE_TUTOR_AGENT_ID]: {
        mode: "primary",
        model: modelId,
        description: "Read-only self-study tutor for one AI-assisted QA course module",
        system: [
          "あなたは選択された1モジュールだけを支援する自己学習用チューターです。",
          "読み取り専用です。ファイル変更、shell、MCP、外部検索、subagent、学習者の代行をしません。",
          "正式評価の条件・結果・個人記録は参照しません。評価の達成判定を行わず、course:assessへ答案を転記しません。",
          "質問にはまず短く直接答え、必要な専門語を初学者向けに説明し、参照したファイルの見出しを示します。",
          "すぐに完成答案を提示せず、先に考え方を確かめる質問か段階的なヒントを出します。求められたら説明例を示し、別条件で本人が判断する練習へ戻します。",
          "教材や正式仕様で確認できない内容は推測せず、未確定として伝えます。テストを実行していない場合は成功したと述べません。",
          `現在の範囲は${moduleId}と、そのモジュールの公開教材・課題・状態・学習者成果物です。ほかのモジュールやworkspace/.course-assessmentsを読まないでください。`,
          "学習者がSecret、API key、Token、個人情報を貼り付けたら処理を続けず、取り消しとSecret更新を案内してください。",
        ].join("\n"),
        permissions: [
          { action: "*", resource: "*", effect: "deny" },
          { action: "external_directory", resource: "*", effect: "deny" },
          ...readPaths.map((resource) => ({ action: "read", resource, effect: "allow" })),
        ],
      },
    },
  };
}

export function buildTutorInitialPrompt(moduleId) {
  if (!MODULE_ID_PATTERN.test(moduleId ?? "")) fail("Tutor module ID is invalid");
  return `M${moduleId.slice(1)}の学習を手伝ってください。最初に教材の学習目標と手順を短く案内し、私の疑問や詰まりに合わせて説明・段階的ヒント・誤解の修正を行ってください。読み取り専用の範囲を守り、完成答案の代行や正式評価をしないでください。`;
}
