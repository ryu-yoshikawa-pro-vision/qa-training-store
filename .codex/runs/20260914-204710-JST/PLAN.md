# Plan

## Objective

- PR #151を同一branchで更新し、`docs/WRITING_STANDARDS.md`を文章表現の正本として追加する。
- 現在使用される人間向け文書だけを横断監査し、一般語を自然な日本語へ統一しつつ、仕様・要件・学習内容・機械契約・正式名称を維持する。

## Scope

- In: root文書、現行`docs/`、`training/`、`examples/`、`.agents/skills/`の人間向け本文、`.codex/templates/`、`.github`のIssue / PR template、文章規約参照、PR metadata。
- Out: 過去Run、過去Plan / Report / history、ADR本文の一括修正、ソース、テスト、fixture、snapshot、schema、設定key、workflow実装、Skill frontmatterとeval用機械契約、新しい文章lint。

## Assumptions

- branch `fix/2026-09-14-2`と既存PR #151を継続使用する。新branch、新PR、Mergeは行わない。
- 人間向け表示文は日本語化できるが、ファイル名、識別子、コマンド、URL、ID、正式なUI名、formal spec heading / schema、validator / E2E / contract testの固定文字列は維持する。
- Issue formのlabel / descriptionは人間向け文として監査するが、YAML key、field id、`required`、title prefixは維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。依頼文に対象、非対象、完了条件、branch、PR、Merge禁止が明記されている。
- 仮定してよい細部: 同じ概念の訳語は文脈に合わせて一つへ寄せ、既存PRで確認済みの日本語表現を優先する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 不自然な一般英語は、機械契約と正式名称を先に抽出すれば、文脈単位の最小差分で安全に日本語化できる。
- H2: formal spec / UI契約を直接参照するvalidator・E2E・contract testを再実行すれば、文章改善による契約破壊を検出できる。

## Research Plan

- Round 1 Query: branch / PR HEAD、root規約、最近のADR、現行文書一覧、Markdown設定、validator / contract / E2E固定文字列を確認する。
- Round 2 Query: 一般英語の横断検索結果を文書ごとに分類し、現行文書、過去記録、機械契約、正式名称を分離して修正候補を確定する。
- Exit Criteria:
  - 現行監査候補を分類し、修正対象と対象外の根拠がある。
  - 主要固定文字列、formal heading / table schema、リンク、ID、コードブロックの不変条件が列挙されている。
  - 未解決論点がないか、残る場合は次アクションが定義されている。

## Approach

1. repository planを保存し、run-local TASKS / REPORTへ調査結果を記録する。
2. `WRITING_STANDARDS.md`を作成し、AGENTS / CONTRIBUTING / 必要な入口から参照する。
3. 現行人間向け文書を横断監査し、一般語・見出し・表現揺れだけを文脈単位で修正する。
4. validator、contract、build、Markdown品質、構造不変条件、標準verify、Sanitizerを実行する。
5. self-review後にcommit / pushし、PR本文と最新必須CIを更新・確認する。

## Definition of Done

- 文章規約が追加され、入口から参照できる。
- 現行人間向け文書の監査結果・監査数・修正数・除外範囲を報告できる。
- 仕様、要件、強さ、数値、リンク、ID、参照、機械契約を保持している。
- ローカル検証とSanitizerの結果を記録し、標準verifyの環境上の制約を因果関係付きで説明できる。
- PR #151のタイトル・本文が最終範囲に一致し、同一branchの最新HEADで`Web CI`と`Mobile App CI`が成功し、PRはopen・未mergeである。

## Risks / Unknowns

- formal heading、anchor、UI正式名称の翻訳でdocs build・E2Eを壊すリスク: 直接参照元を先に確認し、関連contract / build / smokeを実行する。
- Skill本文の変更でtrigger / evalを壊すリスク: frontmatter、eval、schema、fixtureを編集せず、人間向け本文だけを修正する。
- 機械的置換で自然な技術用語や過去記録を変更するリスク: 検索は候補抽出だけに使い、文脈ごとに採否を判断する。

## Thinking Log

- 2026-09-14: 現行候補は過去記録を除くMarkdown 151件とIssue form 3件。PR #151の既存自然化を維持し、まず規約を正本化する方針とした。
