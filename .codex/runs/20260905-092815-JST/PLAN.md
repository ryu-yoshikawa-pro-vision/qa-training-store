# Plan

## Objective

- PR #114からIssue #96と無関係なCodex Hook contract testのtimeout変更だけを除外する。
- Breadcrumb実装、競合解消内容、最新main側の変更、既存commitを変更・rewriteしない。

## Scope

- In:
  - `tests/contracts/codex-hook-contract.test.ts` の指定されたtimeout差分2箇所を元へ戻す。
  - Breadcrumb関連の差分、main同期内容、PR差分、validation結果を確認する。
  - timeout再発時は原因と実行時間を記録し、Hook側の修正は行わない。
  - Run Artifact、commit、push、PR本文／状態の更新。
- Out:
  - Hook implementation、contract test本体の高速化、別Hook修正。
  - Breadcrumb／Route／CSS／main機能の変更、再merge、既存commitのrewrite。
  - timeoutを再延長する修正。

## Assumptions

- `origin/main` は確認のみとし、今回の作業で新たなmain mergeは行わない。
- working treeは開始時にcleanであり、対象ファイルのPR差分は指定された2箇所だけである。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: cleanup用の新Run Artifactを作成し、既存Runは変更しない。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 対象テストの差分を2箇所だけ元へ戻せば、PRからHook contract testの差分を除外できる。
- H2: timeoutが再発してもBreadcrumbのfocused validationは独立してPASSし、Hook問題はこのPR外として記録できる。

## Research Plan

- Round 1 Query: branch、working tree、origin/main、対象testの`origin/main...HEAD`差分を確認する。
- Round 2 Query: cleanup後のdiff、Breadcrumb/main保持、focused validation、contracts／verify結果を確認する。
- Exit Criteria:
  - timeout差分が対象testとPR差分から消え、Breadcrumb／main側の差分が不変である。
  - validation結果とtimeout再発の有無を正確に記録する。
  - cleanなworking tree、commit、push、PR確認が完了する。

## Approach

- branch／remote／差分を確認する。
- 指定された2箇所だけを`apply_patch`で元へ戻す。
- Breadcrumb focused validationを実行し、timeout再発時は変更せず分類する。
- diff／Run Artifactを確認してcommit・pushし、PR #114を確認する。

## Definition of Done

- `tests/contracts/codex-hook-contract.test.ts` のPR差分が0件になる。
- Breadcrumb実装、main側Catalog／product detail／CSS変更、Route情報が不変である。
- timeout再発時もHook関連コードを変更しない。
- validation、Run Artifact更新、commit、push、PR確認が完了する。

## Risks / Unknowns

- Windows localではcontracts／verifyの既存Hook timeoutが再発する可能性がある。再延長せず、test名・実行時間・timeoutを記録する。
- `origin/main`が進んでいる場合も、今回のcleanupのためにmergeしない。

## Thinking Log

- 2026-09-05: 対象testのPR差分はHook matrixの30秒化とruntime Git config testの15秒追加の2箇所だけだった。指定どおり、この2箇所のみを戻す。
