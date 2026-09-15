# Plan

## Objective

- カリキュラム25文書、中核仕様37文書、`docs/spec`のテンプレートを除く21文書を確認し、意味・仕様・要件を変更せず日本語表現を改善する。
- 文書構造、正式名称、識別子、リンク、コード、BR / AC、学習上の強さを維持し、commit・push・PR・最新headの必須CI確認まで完了する。

## Scope

- In:
  - `docs/curriculum/test-automation/**/*.md`
  - `docs/00_overview/**/*.md`〜`docs/12_quality/**/*.md`
  - `docs/spec/**/*.md`（`_templates`を除く）
  - 本Run Artifact、Repository plan、必要なPR本文の更新
- Out:
  - `docs/spec/_templates/`、`docs/13_decisions/`、ADR、plans（本計画書を除く）、reports、history、reference、guides、native、future、experiments、`PROJECT_CONTEXT.md`
  - プロダクト仕様、要件、学習内容、実装、テスト、設定、依存関係、CI workflowの変更

## Assumptions

- 現在branch `fix/2026-09-14-2` は作業用branchで、編集前のsource working treeはcleanである。
- `docs/10_operations/ci_cd_and_release.md` は現在のCI/CD・Release設計を記す仕様文書として対象に含める。
- 安全に意味を保てない曖昧な箇所は原文を残す。仕様の誤り・矛盾・古さは修正しない。
- `docs/spec`のformal headingとBR / AC grammarはvalidator契約のため維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。依頼に対象、非対象、意味保存、GitHub完了条件が明記されている。
- 仮定してよい細部: 一般語は自然な日本語へ整え、技術用語・正式名称・literalは既存表記を優先する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 文書をカテゴリと文書単位で読み、既存用語と機械判定対象を固定してから編集すれば、表現改善と仕様保存を両立できる。
- H2: diffレビューに要件の強さ、条件、例外、数値、ID、参照関係のチェックを含め、文書validatorと標準verifyを通せば、意図しない構造・参照破壊を検出できる。

## Research Plan

- Round 1 Query: 入口資料、branch/dirty state、最近Run/ADR、package scripts、workflow、対象83文書の目的と参照関係を確認する。
- Round 2 Query: 文書ごとの表現上の問題、正式用語、validatorが消費する構造、変更前後diffを確認する。
- Exit Criteria:
  - 対象83文書の分類と編集境界が確定している。
  - H1/H2をカテゴリ別diff、spec/curriculum validator、標準verifyで支持できる。
  - 最新PR headの `Web CI` と `Mobile App CI` がsuccessである。

## Approach

1. 対象文書と参照契約を確認し、共通用語・formal literal・非対象を固定する。
2. カリキュラム、番号付き中核仕様、`docs/spec`の順に、文脈単位で表現を改善する。
3. 各カテゴリのdiffを意味保存の観点でレビューし、対象外ファイル差分がないことを確認する。
4. Markdown、spec、curriculum、標準verify、diff check、Run sanitizerを実行する。
5. branch safetyを再確認し、commit、明示refspec push、PR作成/更新、最新headの必須CI確認を行う。PRはmergeしない。

## Definition of Done

- 対象文書の日本語表現が読みやすくなり、意味・仕様・要件・学習内容・formal literalが保存されている。
- `pnpm run format:check`、`pnpm run lint:markdown`、`pnpm run validate:spec`、`pnpm run validate:curriculum`、`pnpm run build:docs`、`pnpm run verify`、`git diff --check`が成功する。
- Run Artifact sanitizerが成功し、commit/push後にlocal/remote/PR headが一致する。
- PRが日本語タイトル・本文で作成または更新され、最新headの `Web CI` と `Mobile App CI` がsuccessである。

## Risks / Unknowns

- Must / should / may等の表現変更で強さを変えないよう、文ごとにbefore/afterを確認する。
- 技術用語、UI copy、path、command、ID、BR / AC headingを機械的に置換しない。
- 広範囲の変更によるリンク・Markdown・validator破壊をカテゴリ別検証で検出する。
- GitHub CLIが利用できない場合のPR/CI操作経路は、push前に認証状態を含めて確認する。

## Thinking Log

- 2026-09-14 15:37 JST: `feature-plan` Skillとplanning workflowを読み、strict implementation Run `20260914-153750-JST`を正規スクリプトで初期化した。
- 2026-09-14 15:39 JST: 作業ツリーはclean、branchは`fix/2026-09-14-2`。対象はカリキュラム25、中核仕様37、`docs/spec`（template除外）21の計83文書と分類した。
- 2026-09-14 15:40 JST: `docs/spec`はformal headingとBR / AC grammarをvalidatorが検査するため、それらを維持する方針を確定した。
