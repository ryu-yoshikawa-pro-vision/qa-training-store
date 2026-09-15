# カリキュラム・仕様書の日本語表現改善 計画

## 0. 依頼概要

- 依頼内容: `qa-training-store` のカリキュラムと、製品・テスト・セキュリティ・品質などの仕様文書を、意味・仕様・要件を変えずに自然で読みやすい日本語へ整える。
- 背景: 対象文書には、日本語として読めるが英語の語順や直訳調の表現が残っている。文書間の用語と参照関係を保ったまま、学習者・実装者が読みやすい表現にする必要がある。
- 期待成果: 対象文書の文章表現が一貫して改善され、Markdown構造、正式名称、識別子、リンク、仕様上の強さと数値が維持される。

## 1. ゴール / 完了条件

- ゴール: 対象83文書を文書ごとに確認し、意味を変更せずに不自然な直訳調、冗長な言い回し、主語・述語の分かりにくさ、用語の揺れを最小差分で改善する。
- 完了条件（DoD）:
  - `docs/curriculum/test-automation/` の25文書を確認し、カリキュラムの学習目標、演習、Evidence、Self-check、Completion、Common / Native境界を変えない。
  - `docs/00_overview`〜`docs/12_quality` の37文書と `docs/spec` のテンプレートを除く21文書を確認し、要件、制約、状態、画面、データ、テスト、セキュリティ、品質、BR / ACを変えない。
  - formal heading、BR / AC ID、UI文言、コード、command、path、URL、設定値、リンク先、表の論理構造を維持する。
  - 変更前後のdiffを対象ファイルごとに確認し、情報の削除・追加、強さ・数値・順序・参照関係の変化がないことを確認する。
  - `pnpm run format:check`、`pnpm run lint:markdown`、`pnpm run validate:spec`、`pnpm run validate:curriculum`、`git diff --check` および必要な標準検証が成功する。
  - Run Artifactをサニタイズしてからcommitし、現在の非default branchへpushし、PRを作成または既存PRを使用し、最新headの `Web CI` と `Mobile App CI` の成功を確認する。PRはmergeしない。

## 2. 現状理解と前提

- Current understanding:
  - 現在のbranchは `fix/2026-09-14-2` で、編集前の作業ツリーはcleanである。
  - `docs/curriculum/test-automation/` は、README、共通Reference、Part 1、Part 2からなる学習者向けカリキュラムと提供契約を定義する。
  - `docs/spec/` はNormative Product BehaviorとSupporting / Operational文書を含み、BR / ACの見出し・ID・順序にvalidatorの契約がある。
  - 番号付き `docs/00_overview`〜`docs/12_quality` は、プロダクトの要件、設計、データ、画面、フロー、テスト容易性、テスト、デプロイ、CI/CD、セキュリティ、品質を説明する現在の設計・仕様文書である。
  - `package.json` の `verify` はMarkdown、spec、curriculum、lint、typecheck、test、build等を含むため、文書変更でも標準ゲートを確認する。
- Assumptions:
  - 文章として安全に改善できない曖昧な記載は原文を残し、仕様の誤り・古さ・矛盾は修正しない。
  - `docs/10_operations/ci_cd_and_release.md` は現在のCI/CD・Release設計を記す仕様文書として対象に含める。
  - `docs/spec/_templates/` はテンプレートの正式な英語見出しと例を保持するため、変更対象から除外する。
  - `docs/13_decisions/decision_log.md`、ADR、plans、reports、history、reference、guides、native、future、experiments、`PROJECT_CONTEXT.md`、内部運用履歴は今回の文書表現改善の対象外とする。
- Non-goals:
  - プロダクト仕様、学習内容、要件、実装、テスト、設定、依存関係、CI workflowの変更。
  - 新しい要件・説明・用語・分類・略称・例の追加。
  - 見出し階層、表、Mermaid、リンク、相互参照、コードブロック、セクション番号の再構成。
  - 既存の問題や仕様矛盾の修正。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象範囲、非対象、意味保存、commit / push / PR / CIまでの完了条件が依頼に明記されている。
- 仮定してよい細部: 既存の正式用語とvalidatorが要求する英語見出しは、そのまま維持する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - 学習者向けテスト自動化カリキュラムとそのNavigation / Completion説明。
  - 製品の要件・画面・データ・ドメイン・フロー・テスト容易性・テスト・デプロイ・CI/CD・セキュリティ・品質の設計文書。
  - Normative Specificationの読み方、FeatureのBR / AC、画面状態、State / Scenarioの説明。
  - Markdown lint、spec validator、curriculum validator、docs buildの入力。
- Files to inspect:
  - `docs/curriculum/test-automation/**/*.md`（25文書）。
  - `docs/00_overview/**/*.md`〜`docs/12_quality/**/*.md`（37文書）。
  - `docs/spec/**/*.md`（`_templates`を除く21文書）。
  - 参照契約確認用の `docs/spec/README.md`、`docs/reference/curriculum-self-study-review.md`、`package.json`、検証Script、`.github/workflows/`。

## 5. 変更方針

- Change strategy:
  1. 対象文書をカテゴリごとに読み、共通用語、正式名称、機械判定対象、参照関係を一覧化する。
  2. 文書ごとに、主語・述語、修飾関係、冗長表現、直訳調、日英語の使い分けを文脈単位で確認する。
  3. 必須・推奨・任意、禁止、条件、例外、数値、範囲、順序、対象、成果物、期待結果を変更しない範囲で文章を編集する。安全に判断できない箇所は変更しない。
  4. 各カテゴリのdiffを確認し、意味保存チェックを行う。正式識別子やコードを機械的に置換しない。
  5. 文書検証、標準verify、差分・scope確認、Run Artifact sanitizerを実行する。
  6. branch safetyを再確認してcommit、明示refspec push、PR作成または既存PR更新、最新headの必須CI確認を行う。CI結果を必要に応じてPR本文へ追記し、mergeは行わない。
- 実行タスク:
  - [ ] 1. 入口資料、branch、未commit変更、対象文書、参照関係、検証契約を確認する。
  - [ ] 2. 対象83文書の用語・構造・表現を確認し、編集範囲を確定する。
  - [ ] 3. カリキュラム文書を文書単位で表現改善する。
  - [ ] 4. 中核仕様文書と `docs/spec` を文書単位で表現改善する。
  - [ ] 5. 変更前後のdiffを意味保存の観点でレビューする。
  - [ ] 6. Markdown、spec、curriculum、標準verify、diff/scopeを検証する。
  - [ ] 7. Run Artifactを更新・サニタイズし、commit対象を確定する。
  - [ ] 8. commit、push、PR、最新headの必須CI確認、必要なPR本文更新を完了する。

## 6. 検証方法

- Validation plan:
  - 文書変更前に `git status --short`、`git branch --show-current`、`git branch -vv`、必要に応じてPR状態を確認する。
  - 編集中は対象ファイル一覧、Markdown構造、リンク、ID、表、コードブロックの差分を確認する。
  - `pnpm run format:check`、`pnpm run lint:markdown`、`pnpm run validate:spec`、`pnpm run validate:curriculum`、`pnpm run build:docs`、`git diff --check` を実行する。
  - `pnpm run verify` を実行し、失敗時は最初の異常を特定してから安全な最小修正と関連ゲートの再実行を行う。
  - `git diff --name-only` と `git diff --stat` で対象外ファイル変更がないことを確認する。
  - `scripts/sanitize-codex-artifacts.ps1 -Path <run> -Write -Check` でRun Artifactの絶対パス残存を確認する。
  - push後は、pushした最新commitをheadとするPRの `Web CI` と `Mobile App CI` がsuccessであることを確認する。
- 成功判定:
  - validator、Markdown lint、format、標準verify、diff check、sanitizerが成功し、文書以外の変更がない。
  - 最新PR headの必須CIが両方successで、必要なCI結果がPR本文に記載されている。

## 7. リスクと未解決論点

- Risks:
  - 「できる」「行う」「推奨する」などの表現変更で要件の強さが変わる可能性がある。変更前後を文ごとに確認する。
  - 英語の正式名称と一般語の境界を誤る可能性がある。既存文書の用語、validator、コード・設定のliteralを優先する。
  - 広範囲の文書変更で参照関係やMarkdown構造を壊す可能性がある。カテゴリごとにvalidatorとdiffを確認する。
  - GitHub CLIが利用できない可能性がある。認証済みの安全な代替経路を確認し、外部操作ができない場合は根拠と残作業をRun Artifactへ記録する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - 上記対象範囲のうち、文脈確認により安全に表現改善できるMarkdown文書。
- 付随ドキュメント:
  - 本計画書。
  - `.codex/runs/20260914-153750-JST/` の `PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`。

## 9. 備考

- 仕様上の矛盾、誤り、古い情報を発見しても今回のPRでは変更せず、必要に応じてPR本文の対象外欄へ記録する。
- Run ArtifactのREPORTはappend-onlyとし、checkpointの意味を削除・並べ替え・変更しない。
