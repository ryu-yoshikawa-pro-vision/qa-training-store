# Plan

## Objective

- `AGENTS.md`と`.codex/templates/TASKS.md`へ、通常の実装タスクはローカル検証後にcommit・push・PR head確認・最新headの必須CI成功確認まで行う契約を追加する。

## Scope

- In: `AGENTS.md`、`.codex/templates/TASKS.md`、本Runの標準Artifact、`docs/plans/2026-09-10_200347_require-push-ci-on-completion.md`
- Out: auto-net、Hook、rules、config、CI workflow、branch safety正本、Product Code／Test、依存変更

## Assumptions

- 通常の実装・変更タスクでは、対象branchを安全確認したうえでcommit・通常pushを行う。
- 対象branchにPRがない場合、pull_request起動CIの確認に必要なPRを日本語で作成する。
- 必須CIは`Web CI`と`Mobile App CI`とし、最新PR headで両方successになるまで完了扱いにしない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、変更範囲、DoD、禁止事項はユーザー指示で確定している。
- 仮定してよい細部: 既存の`docs/reference/git-branch-safety.md`をGit操作の詳細正本として参照する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `AGENTS.md`へ適用対象とcompletion gateを追加すれば、ローカルPASSのみの誤完了報告を防げる。
- H2: TASKS templateへ条件付きGit／PR／CI工程を追加すれば、review-only／plan-onlyへGit操作を強制せず実装タスクの抜けを防げる。

## Research Plan

- Round 1 Query: 現行AGENTS、TASKS template、branch safety、CI triggerを確認する。
- Round 2 Query: 差分、検証結果、push後のPR headと必須workflow状態を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持／反証の根拠がある
  - 指定検証とscope監査がPASSする
  - push後の最新PR headで必須CIがsuccessになる

## Approach

- 最新`origin/main`から専用branchを作成し、計画とRun Artifactを保存する。
- `AGENTS.md`に実装タスクのcompletion contractを追加し、TASKS templateを条件付き工程へ更新する。
- ローカル検証、明示stage、branch safety確認、commit、明示refspec push、PR作成／確認、最新head CI確認を順に行う。
- 標準フロー: `PLAN -> TASKS -> 実行・検証 -> commit -> push -> PR/head/CI確認 -> REPORT`

## Definition of Done

- 指定2文書の変更が意図したscopeに収まり、review-only／plan-onlyへGit操作を強制しない。
- auto-net、Hook、rules、CI workflow、branch safety正本を変更していない。
- `pnpm run lint:markdown`、`pnpm run validate:skills`、`pnpm run verify`、`git diff --check`がPASSする。
- 専用branchへcommit・通常pushし、PRを作成または確認する。
- pushした最新PR headを確認し、Web CIとMobile App CIがsuccessになる。
- Run Artifactへ判断・検証・CI結果を記録し、sanitizer Write／CheckをPASSする。

## Risks / Unknowns

- リスクと対策: 文書間の条件不整合は差分と検証で確認する。PR未作成によるCI未起動はpush後にPRを作成する。CI failureは最初の異常と因果関係を調査し、安全に最小修正できない場合は停止する。
- 未解決: なし。

## Thinking Log

- ユーザー指定により、今回の変更自体も新しいcompletion contractを実行する。
