# Plan

## Objective

- `AGENTS.md`と`.codex/templates/TASKS.md`へ、通常の実装タスクはfinal commit前にtracked Run Artifactを確定し、push後の最新headで必須CI成功を確認してから完了扱いにする契約を追加する。

## Scope

- In: `AGENTS.md`、`.codex/templates/TASKS.md`、本Runの標準Artifact、`docs/plans/2026-09-10_200347_require-push-ci-on-completion.md`
- Out: auto-net、Hook、rules、config、CI workflow、branch safety正本、Product Code／Test、依存変更

## Assumptions

- 通常の実装・変更タスクでは、対象branchを安全確認したうえでcommit・通常pushを行う。
- 対象branchにPRがない場合、pull_request起動CIの確認に必要なPRを日本語で作成する。
- 必須CIは`Web CI`と`Mobile App CI`とし、`Cross Browser Smoke`は通常PR必須CIに含めない。最新PR headで両方successになるまで完了扱いにしない。
- CI結果はGitHub上のCI結果、PR本文、ユーザー向け最終報告へ記録し、final push後にtracked Run Artifactへ書き戻さない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、変更範囲、DoD、禁止事項はユーザー指示で確定している。
- 仮定してよい細部: 既存の`docs/reference/git-branch-safety.md`をGit操作の詳細正本として参照する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `AGENTS.md`へ適用対象とcompletion gateを追加し、final commit前のArtifact確定とpush後CI確認を分離すれば、ローカルPASSのみの誤完了報告とhead自己参照を防げる。
- H2: TASKS templateのcheckboxをfinal commit前のローカル作業に限定し、commit／push／CI確認を説明へ移せば、再commitのための自己参照を防ぎつつreview-only／plan-onlyへGit操作を強制しない。

## Research Plan

- Round 1 Query: 現行AGENTS、TASKS template、branch safety、CI triggerを確認する。
- Round 2 Query: 差分、検証結果、final commit前のRun Artifact、push後のPR headと必須workflow状態を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持／反証の根拠がある
  - 指定検証とscope監査がPASSする
  - push後の最新PR headで必須CIがsuccessになる

## Approach

- 対象branch、既存PR、契約、CI trigger、直近Runを再確認する。
- `AGENTS.md`に実装タスクのcompletion contractを追加し、TASKS templateをfinal commit前のローカル工程だけのcheckboxへ更新する。
- PLAN、TASKS、REPORTと必要なmachine-managed artifactをfinal commit前状態まで更新・検証し、明示stage、branch safety確認、commit、明示refspec pushを順に行う。
- push後はlocal/remote HEADとPR最新headを確認し、そのheadの必須CIを確認する。CI成功結果はPR本文とユーザー向け最終報告へ記録し、tracked fileは更新しない。
- 標準フロー: `PLAN -> TASKS -> 実行・ローカル検証 -> Run Artifact確定 -> commit -> push -> PR head / CI確認 -> PR本文・ユーザー向け最終報告`

## Definition of Done

- 指定2文書の変更が意図したscopeに収まり、review-only／plan-onlyへGit操作を強制しない。
- tracked Run Artifactがfinal commit前に確定し、final push後のCI結果記録だけを目的とするtracked変更・再commit・再pushがない。
- auto-net、Hook、rules、CI workflow、branch safety正本を変更していない。
- `pnpm run lint:markdown`、`pnpm run validate:skills`、`pnpm run verify`、`git diff --check`がPASSする。
- 専用branchへcommit・通常pushし、PRを作成または確認する。
- pushした最新PR headを確認し、Web CIとMobile App CIがsuccessになる。
- Run Artifactへfinal commit前の判断・検証・CI未確認状態を記録し、sanitizer Write／CheckをPASSする。
- 最新headの`Web CI`と`Mobile App CI`がsuccessになった後、PR本文とユーザー向け最終報告へCI結果を記録する。

## Risks / Unknowns

- リスクと対策: 文書間の条件不整合とhead自己参照は差分・sanitizer・PR head確認で検出する。PR未作成によるCI未起動はpush後にPRを作成する。CI failureは`AGENTS.md` §8の品質ゲート失敗時の原因調査・修正・停止条件へ委譲する。
- 未解決: なし。

## Thinking Log

- ユーザー指定により、今回の変更自体も新しいcompletion contractを実行する。final commit前のRun ArtifactにはCI未確認を記録し、CI success確認後にtracked Artifactへ追記しない。
