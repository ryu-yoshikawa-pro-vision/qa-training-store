# 計画書: リポジトリ全体の文章規約と日本語表現の統一

## 0. 依頼概要

- 依頼内容: PR #151を同一branchで更新し、文章規約を追加したうえで、現在使用される人間向け文書を横断監査・修正する。
- 背景: カリキュラム以外の入口文書、仕様補助資料、Skill、Issue / PR templateにも日本語と一般的な英語表現の揺れが残っている。
- 期待成果: `docs/WRITING_STANDARDS.md`を文章表現の正本とし、必要な文書だけを自然な日本語へ統一し、仕様・機械契約・正式名称を維持したPR #151をCI成功状態で提出する。

## 1. ゴール / 完了条件

- ゴール: リポジトリ内の人間向け文章について、一般語は自然な日本語、技術用語・正式名称・識別子・固定文字列は契約に応じて維持する判断基準を一つに定める。
- 完了条件（DoD）:
  - `docs/WRITING_STANDARDS.md`を追加し、単独で判断に使用できる。
  - `AGENTS.md`、`CONTRIBUTING.md`、必要な既存入口から正本を参照する。
  - 現行の人間向け文書を列挙・分類し、不要な英語混じり表現と表記揺れだけを修正する。
  - 仕様、要件、学習内容、BR / AC、ID、数値、順序、リンク、機械契約を保持する。
  - formatter、Markdownlint、既存validator / contract test、build、標準verify、Sanitizerを実行し、実行不能項目は原因と残るリスクを記録する。
  - 同一branchのPR #151へcommit・pushし、最新HEADの`Web CI`と`Mobile App CI`が成功する。Mergeは行わない。

## 2. 現状理解と前提

- Current understanding:
  - 現在のbranchは`fix/2026-09-14-2`、PR #151はopen・未mergeで、HEADは`a21ab02f73f511e9213becb07aafb5be47e19400`。
  - 既存PRはカリキュラム、テスト・品質文書、仕様補助文書の自然化を含む。今回の変更はその改善を後退させない。
  - `scripts/validate-curriculum.ts`、`scripts/spec/validate-spec.ts`、`scripts/spec/visual-contract.ts`、関連contract testが、見出し・ID・表・固定文字列を直接検証している。
  - 現行監査候補は、過去記録を除くMarkdown 151件（root 9、現行`docs/` 111、Skill関連14、`.codex/templates/` 4、`.codex/rules/README.md` 1、`.github` Markdown 1、`training/` 7、`examples/` 4）と、GitHub Issue form 3件。
- Assumptions:
  - 人間向けのIssue form表示文は修正対象とするが、YAML key、field id、`required`、Issue title prefix、workflow / job名は変更しない。
  - 仕様書のformal heading、formal table schema、validator / E2E / contract testが参照する固定文字列は、自然化できる表示部分と分離できる場合だけ分離する。
  - Skillのfrontmatter、Skill名、eval token、schema、fixture、機械用YAML / JSONは変更しない。
- Non-goals:
  - ソース、テスト、依存関係、設定値、workflow実装、package script、ログ、fixture、snapshotの文章統一目的の変更。
  - 過去の`.codex/runs/`、過去の`docs/plans/`、`docs/reports/`、`docs/history/`、既存ADR、過去の調査結果・リリース記録の一括修正。
  - 文章統一を目的とした新しい汎用lint、外部依存、造語、分類名の追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象、非対象、完了条件、branch、PR、Merge禁止が依頼文で明確。
- 仮定してよい細部: 人間向けリンク表示名・Issue form label・説明文は日本語化し、参照先・機械keyは維持する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - 文章規約と入口: `docs/WRITING_STANDARDS.md`、`AGENTS.md`、`CONTRIBUTING.md`、必要に応じてroot README。
  - 現行の開発・仕様・QA・運用文書: `docs/`、root Markdown、`training/`、`examples/`。
  - Coding Agentの将来出力に影響する`.agents/skills/**/SKILL.md`と参照Markdown。
  - GitHubの人間向けIssue / PR template。
- Files to inspect:
  - `AGENTS.md`、`CONTRIBUTING.md`、`docs/PROJECT_CONTEXT.md`、`docs/CODING_STANDARDS.md`、`CODE_REVIEW.md`、`PLANS.md`、`QA_AGENT.md`、`README.md`、`SECURITY.md`。
  - `docs/adr/`最近のADR、現在のPR #151 diff、`package.json`、Markdown設定、docs / curriculum / spec validator、direct contract test。
  - 現行`docs/`、`training/`、`examples/`、`.agents/skills/`、`.github/`、`.codex/templates/`。

## 5. 変更方針

- Change strategy:
  1. branch / PR HEAD、既存規約、validator、contract、E2E、対象文書の分類を確定する。
  2. `WRITING_STANDARDS.md`を先に追加し、一般語・技術用語・正式名称・固定文字列・要件の強さ・見出し・文体の判断を明文化する。
  3. `AGENTS.md`、`CONTRIBUTING.md`、既存の適切な入口から正本を参照させる。
  4. 横断検索を修正漏れの検出に使い、文脈ごとに一般語の日本語化、表記揺れの整理、不要な独自用語の除去を行う。自然な文や技術用語は変更しない。
  5. formal spec heading / schema、UI正式名称、Skill frontmatter、コード・fixture・固定値を照合し、変更差分をレビューする。
  6. ローカル検証、Sanitizer、commit・push、PR本文更新、最新必須CI確認を行う。
- 実行タスク:
  - [ ] 1. 規約・対象・機械契約を調査し、Run artifactへ記録する。
  - [ ] 2. `docs/WRITING_STANDARDS.md`を作成し、入口から参照する。
  - [ ] 3. 現行人間向け文書を監査・必要最小限修正する。
  - [ ] 4. 不変条件と品質ゲートを検証する。
  - [ ] 5. diffを自己レビューし、Sanitizer後にcommit・pushする。
  - [ ] 6. PR #151のタイトル・本文と最新必須CIを更新・確認する。

## 6. 検証方法

- Validation plan:
  - 対象MarkdownのPrettier、Markdownlint、`git diff --check`。
  - `validate:skills`、`validate:spec`、`validate:spec-visuals:final`、`validate:curriculum`、関連contract test。
  - `build:spec`、`build:docs`、標準`verify`。
  - 既存文書とのリンク、見出し階層、BR / AC ID、表列数、fenced code block、固定文字列の不変条件。
  - 文章候補語の横断検索と、過去記録・機械契約・正式名称の除外確認。
  - `scripts/sanitize-codex-artifacts.ps1`のWrite / Check。
  - push後のPR最新HEADに対する`Web CI`、`Mobile App CI`。
- 成功判定:
  - 変更対象の品質ゲートがPASSし、既存契約に意図しない変更がない。
  - 標準verifyが環境要因で完走できない場合は、原因が今回の差分に起因しないことを確認し、代替検証と残るリスクをPR / Runへ記録する。
  - PR #151がopen・未mergeで、同一branchの最新HEADが必須CI成功状態になる。

## 7. リスクと未解決論点

- Risks:
  - formal spec headingやUI正式名称の翻訳でvalidator・E2E・anchorを壊す可能性があるため、直接参照元と構造不変条件を先に確認する。
  - Skill本文の機械契約を誤って変更する可能性があるため、frontmatter・eval・schemaと人間向け本文を分けて扱う。
  - 全体監査を機械的な検索置換にすると、自然な技術用語や過去記録まで変更するため、文脈単位の差分レビューを行う。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: `docs/WRITING_STANDARDS.md`、入口文書、監査で修正が必要と判断した現行人間向け文書、PR #151 metadata。
- 付随ドキュメント: 本計画書、現行Run artifact。

## 9. 備考

- 前回PRで確認済みの`Competency Rubric`、`Native specialization`、`Common Core`、`learner-facing`、`bounded Level 2`の日本語表現を維持する。
- 既存のPR #151を更新し、新しいbranch / PRは作成せず、Mergeは行わない。
