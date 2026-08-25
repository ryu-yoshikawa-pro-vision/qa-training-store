# Plan

## Objective

- PR #48のレビュー指摘に対応し、対象プラン内のWorkflow表示名表記を実際のトップレベル名に合わせる。

## Scope

- In:
  - `docs/plans/2026-08-23_114600_ci-workflow-display-name-renaming.md` の `Cross-Browser Smoke` から `Cross Browser Smoke` への表記置換3箇所
  - 現在のRun Artifact
- Out:
  - Workflow実装、job / step、Contract Test、concurrency、その他のソースコード
  - 過去の `.codex/runs/**`
  - dependency、validator、追加テスト、Git操作

## Assumptions

- 実際の `.github/workflows/cross-browser-smoke.yml` のトップレベル表示名は `Cross Browser Smoke` である。
- レビュー指摘はプラン文書内の表記不一致だけであり、Workflow実装の追加修正は不要である。

## Questions / Ambiguity

- 必ず質問する不透明点: なし
- 仮定してよい細部: 対象文字列の完全一致を3箇所すべて置換する。
- 未回答の重要質問: なし

## Hypotheses

- H1: 対象プラン内の `Cross-Browser Smoke` は3箇所で、すべて `Cross Browser Smoke` に統一できる。
- H2: 置換後の差分は対象プラン文書の3行置換だけになる。

## Research Plan

- Round 1 Query: リポジトリ規約、repair-loop手順、対象プラン、実Workflow、作業前差分を確認する。
- Round 2 Query: Markdown lint、`git diff --check`、対象文書の差分内容と変更範囲を確認する。
- Exit Criteria:
  - 対象文書内に `Cross-Browser Smoke` が残っていない。
  - 差分が指定された3箇所の表記置換だけである。
  - 指定検証が成功し、Run Artifactがsanitizerを通過する。

## Approach

- `allowed_files` を対象プラン文書の1ファイルに固定し、完全一致の3箇所だけを編集する。
- 指定されたMarkdown lintと差分検証のみを実行し、Contract TestとE2Eは再実行しない。
- repair loopは1 iterationで検証し、成功条件を満たした時点で停止する。

## Definition of Done

- 対象プラン文書の3箇所が `Cross Browser Smoke` になっている。
- Workflow、過去Run Artifact、job / step、テスト、その他のソースコードに変更がない。
- `pnpm run lint:markdown` と `git diff --check` が成功する。
- 対象文書の差分に意図しない変更がない。
- Run Artifactのsanitizer Write / Checkが成功する。

## Risks / Unknowns

- Run Artifactはリポジトリ規約上作成・保存するが、生成物はsource scopeから除外し、過去Runは変更しない。
- Markdown lintが既存状態や環境要因で失敗した場合は、最初の異常を分析し、対象文書へ無関係な修正を追加しない。

## Thinking Log

- 2026-08-23 JST: レビュー指摘を `must_fix` と分類した。実Workflowのトップレベル名を確認し、`allowed_files` を対象プラン文書1ファイルに固定した。
