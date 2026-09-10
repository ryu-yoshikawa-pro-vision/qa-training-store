# Plan

## Objective

- 正本Plan `docs/plans/2026-09-08_004700_issue-117-pr5-semantic-output-eval.md` に従い、4対象SkillのSemantic Output Eval、最小Codex Judge runner、repository-contract test、canonical calibrationを実装する。

## Scope

- In:
  - `feature-plan`、`code-review`、`harness-improvement`、`exploratory-qa` の2〜3 criterionとpass/fail anchor。
  - `scripts/evals/skill-semantic-output-evals.ts` のdataset/prompt/response/trial/aggregation純粋処理。
  - `scripts/evals/run-skill-semantic-output-evals.ts` の固定3 trial・600秒timeout・Codex subprocess実行。
  - `tests/repository-contract/skill-semantic-output-evals.test.ts`、package script、Run Artifact。
- Out:
  - `repair-loop`／`android-native-local-validation`のplaceholderやdataset、PR2 Trigger固有処理、PR4 validator拡張、CI、Product Code/Test、Skill本文、依存追加。

## Assumptions

- 対象branchは `origin/main` をすでに含むためmergeは不要。
- PR2 #127は未mergeであり、`origin/main` の `scripts/evals/**` に再利用可能な独立helperはないため、既存Windows実績をrunner内の最小処理として踏襲する。
- `zod@4.4.3` と `yaml@2.9.0`、Codex CLI `0.153.4` を利用する。
- capability probeで確認した `gpt-5.6-luna` をcanonical calibrationの明示modelとする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。正本Planがscope、criterion、runner、DoD、検証を固定している。
- 仮定してよい細部: datasetのcase ID prefix、candidate wording、内部関数名はPlanのcontractを満たす最小設計で決める。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 4 Skillの意味契約は各2〜3 criterionで、self-contained contextとcandidate outputから判定可能である。
- H2: Codex `--output-schema`と`--output-last-message`を同じZod schemaから供給し、3 trialのmixed/runtime failureを別aggregateへ保持できる。

## Research Plan

- Round 1 Query: 最新main、PR4境界、6 Skill Contract、PR2状態、既存subprocess/dependency、Codex capabilityを確認する。
- Round 2 Query: dataset schema、prompt leakage境界、source realpath、runner終了条件、repository-contractを実装し、targeted testで反証を探す。
- Exit Criteria:
  - H1/H2をdataset、pure test、live calibration、最終検証で支持または具体的blockerとして記録する。
  - Plan外差分と未解決事項がない。

## Approach

- Phase 0でpreflightを完了し、Phase 1〜4を順に実装・検証する。
- source実装をcommitしてclean treeとEvaluator SHAを固定した後、`gpt-5.6-luna`で全8 anchorを3 trialずつsequential実行する。
- calibration結果と最終検証をRun Artifactへ日本語で記録し、必要なrepository artifactはsanitizer Write/Checkを通す。

## Definition of Done

- 正本Plan §20の全完了条件を満たす。
- targeted repository-contract test、`pnpm run validate:skills`、`pnpm run verify`、`git diff --check main...HEAD`がPASSする。
- 8 anchorがtarget criterionを保ったまま4 `stable_pass`／4 `stable_fail`となり、Runner exit 0を確認する。
- 最終commit SHA、変更inventory、未解決事項を報告できる。

## Risks / Unknowns

- Judge揺らぎ: 3 trial固定、mixed=`unstable`、majority voteなし。
- candidate内命令とtruth leakage: `EvaluationData`を4 keyへ投影し、JSON.stringifyとuntrusted instructionを使う。
- timeout/process残留: 600,000ms固定、Windowsはtaskkill `/T /F`、非WindowsはSIGKILL。
- calibration mismatch: expected truthを変更せず、case/rubric/protocolを切り分ける。

## Thinking Log

- 2026-09-10 Phase 0: `origin/main=55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`、対象HEADは8 commit ahead/0 behind。PR4境界は既存validator/schema、PR2はOPEN未merge、mainに`scripts/evals/**`なし。
- 2026-09-10 Phase 0: Codex `gpt-5`はChatGPT accountでunsupportedだったため、設定済みかつprobe成功の明示model `gpt-5.6-luna`を採用する。probeはread-only/ephemeral/skip-git-repo-check/structured outputを確認した。
