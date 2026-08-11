# Plan

## Objective

- `pnpm run lint:markdown` のエラーを原因に沿った最小差分で解消する。

## Scope

- In: lint 出力に示された `docs/plans/2026-08-10_132200_screen-catalog-visual-specification.md` と本 Run Artifact。
- Out: 既存の作業ツリー差分、Markdown lint 設定、無関係な文書・コード。

## Assumptions

- MD038 の指摘は、コードスパン内の末尾空白をコードスパン外へ移せば文意を保てる。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 区切り文字の後ろの空白は通常の Markdown テキストとして表現する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 2件の MD038 は同一原因で、対象2行のコードスパン境界だけを修正すれば解消する。
- H2: lint 再実行後に追加エラーは発生しない。

## Research Plan

- Round 1 Query: lint 出力、対象行、既存作業ツリー差分、直近 Run を確認する。
- Round 2 Query: 修正後に `pnpm run lint:markdown` を再実行する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - lint が成功し、未解決論点がない

## Approach

- lint 失敗を must_fix として分類し、対象ファイルを固定する。
- 2箇所を最小修正し、lint、差分、Artifact Sanitizer を検証する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done

- `pnpm run lint:markdown` が exit 0 になる。
- 対象外ファイルを変更せず、Run Artifact がサニタイズ済みになる。

## Risks / Unknowns

- 既存差分が広範囲にあるため、対象ファイル以外を編集しない。

## Thinking Log

- 2026-08-11 11:19 JST: 初回 lint は1ファイル2件の MD038 のみ。コードスパン内の区切り文字後の空白を外へ移す最小修正を採用する。
