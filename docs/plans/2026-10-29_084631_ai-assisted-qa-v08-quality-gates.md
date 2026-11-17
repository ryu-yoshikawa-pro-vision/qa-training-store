# AI協働QAカリキュラムv08 品質ゲート・修正計画

## 0. 依頼概要

- 依頼内容: PR #199向けv08変更を対象に必須品質ゲートと関連Contractを実行し、検出した不具合を修正して再検証する。
- 背景: v07由来の詳細な教材本文を維持し、図解、クイズ、教材Web表示、CI見本、評価契約の整合を確認する。
- 期待成果: PASS/FAIL/BLOCKEDを実行ログに基づいて報告し、コミット・push先・SHAと未検証事項を明示する。

## 1. ゴール / 完了条件

- ゴール: 指定された17ファイルのv08差分を検証し、修正可能な品質問題を必要最小限で直す。
- 完了条件（DoD）:
  - 対象ブランチが`docs/plan-ai-agent-qa-curriculum-redesign`、開始HEADが`dcfbe70c787092302cafd0c752ccbb02614c8767`である。
  - v08の指定17ファイルが反映され、開始時にそれ以外の作業差分がない。
  - `pnpm validate:ai-assisted-qa`、`pnpm run build:docs`、`pnpm run lint:markdown`、`git diff --check`を実行し、終了コードを記録する。
  - Web builderの型・lint・format検査、教材・配布・評価・Run evidence関連Contract、M09→M10 workflow Contractを実行する。
  - M00〜M10の11章、51学習目標、53問のreview_path、29図解参照、およびworkflow例と正式評価器の整合を確認する。
  - 修正が必要な場合は変更後の関連検証と必須ゲートを再実行し、最終差分が意図した範囲に収まる。
  - ユーザーの2026-10-29の追加指示に従い、Run記録確定後に対象差分をcommitし、PR branchへ通常pushしてHEAD一致を確認する。

## 2. 現状理解と前提

- 現状理解:
  - 開始ブランチは`docs/plan-ai-agent-qa-curriculum-redesign`、HEADは`dcfbe70c787092302cafd0c752ccbb02614c8767`。
  - 開始時差分はM00〜M10、SVG3件、workflow見本、builder、progression planの計17ファイル。
  - 初回`git diff --check`はM09ログ例とM10 Markdownの改行表現にある末尾空白を検出した。
  - 既存入口は`validate:ai-assisted-qa`、`build:docs`、`lint:markdown`、5つのAI協働QA Contract suiteである。
- 前提:
  - v08は既に適用済みであり、ZIP再適用は不要。
  - 教材の意図的なMarkdown改行は表示を維持できる記法へ置き換える。
  - Windows環境では`pnpm.cmd`を使い、実際の終了コードと環境エラーを区別する。
- 対象外:
  - PR本文変更、merge、force push。
  - GitHub Actionsの起動、外部サービスへの変更。
  - 51目標、正式評価条件、意図的な教材用failureの弱体化。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: ブラウザ検査はローカル環境が許す範囲で行い、起動できない場合は未検証とする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲: `docs/curriculum/ai-assisted-qa/modules/M00`〜`M10`、同課程の図解、Phase 3 workflow見本、AI課程Web builder、課程進行計画、必要な関連Contract。
- 確認対象ファイル:
  - `docs/curriculum/ai-assisted-qa/modules/M00/README.md`〜`M10/README.md`
  - `docs/curriculum/ai-assisted-qa/assets/figures/M03/04-analysis-to-techniques.svg`
  - `docs/curriculum/ai-assisted-qa/assets/figures/M05/03-html-locator-assertion.svg`
  - `docs/curriculum/ai-assisted-qa/assets/figures/M09/03-ci-webserver-responsibility.svg`
  - `training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled`
  - `scripts/docs/build-ai-assisted-qa.ts`
  - `docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_progression.md`
  - `tests/contracts/ai-assisted-qa-*.test.*`およびdocs build設定・生成物。

## 5. 変更方針

- 変更方針: 初回の差分検査で確認した末尾空白を原因別に修正し、教材の表示意味を保つ。その後、指定ゲートと既存Contractを実行し、各FAILの原因をソース・仕様・テスト・環境に分類して修正する。
- 実行タスク:
  - [x] 1. 開始branch、HEAD、17ファイルの差分範囲、初回diff checkを確認する。
  - [x] 2. Plan/Run artifactを作成し、既存validator・builder・workflow契約・関連テストを照合する。
  - [x] 3. 末尾空白を意味を保って修正し、必須ゲートと追加検証を実行する。
  - [x] 4. 修正後に関連検証と必須ゲートを再実行する。
  - [x] 5. 最終branch、HEAD、status、diff stat、未検証事項を確定して報告する。

## 6. 検証方法

- 検証計画:
  - `pnpm.cmd validate:ai-assisted-qa`
  - `pnpm.cmd run build:docs`
  - `pnpm.cmd run lint:markdown`
  - `pnpm.cmd exec tsc --noEmit --project tsconfig.json`
  - `pnpm.cmd exec eslint scripts/docs/build-ai-assisted-qa.ts`
  - `pnpm.cmd exec prettier --check scripts/docs/build-ai-assisted-qa.ts`と対象差分のMarkdown/YAML
  - curriculum、distribution、assessment、tutor、GitHub Run evidenceのContract suite
  - 必要に応じて`pnpm.cmd run training:ai-assisted-qa:test`とローカルブラウザ表示確認
  - `git diff --check`、`git diff --stat`、`git status --short`
- 成功判定: 全必須ゲートと関連する型・lint・format・Contractが終了コード0で完了し、教材の11章・51目標・53 review_path・29図解・CI契約が一致する。未実施の画面検査や外部CIはPASS扱いしない。

## 7. リスクと未解決論点

- リスク: Markdown改行修正で表示が変化する可能性があるため、変換後はbuildと可能なブラウザ確認で確かめる。
- 未解決の質問: なし。ローカルブラウザや依存取得が環境制約で実行できない場合はBLOCKEDとして記録する。

## 8. 成果物

- 変更ファイル: 修復が必要と確認された範囲内の教材・builder・workflow・Contract。
- 付随ドキュメント: 本計画書と`.codex/runs/20261029-084627-JST/`のRun artifacts。

## 9. 備考

- PR #199・GitHub Actionsの実行結果は現在の未コミット差分を検証しないため、この依頼のローカル検証には代用しない。
