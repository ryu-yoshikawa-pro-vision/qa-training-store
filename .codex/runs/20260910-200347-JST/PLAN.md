# Plan

## Objective

- `AGENTS.md`と`.codex/templates/TASKS.md`へ、repository working treeのファイル変更を伴う実装・変更タスクだけを対象に、final commit前のtracked Run Artifact確定、push後の最新head必須CI確認、CI確認1件を含むProgress算出を追加する。GitHub metadataのみの変更は対象外とし、手動Runの`run.json`制約を既知事項として記録する。

## Scope

- In: `AGENTS.md`、`.codex/templates/TASKS.md`、本Runの`PLAN.md`／`TASKS.md`／`REPORT.md`、`docs/plans/2026-09-10_200347_require-push-ci-on-completion.md`。`run.json`は既存collector経由の確認対象だが、意味値の変更対象ではない。
- Out: auto-net、Hook、rules、config、CI workflow、branch safety正本、Product Code／Test、依存変更

## Assumptions

- 通常の実装・変更タスクでは、対象branchを安全確認したうえでcommit・通常pushを行う。
- 対象branchにPRがない場合、pull_request起動CIの確認に必要なPRを日本語で作成する。
- 必須CIは`Web CI`と`Mobile App CI`とし、`Cross Browser Smoke`は通常PR必須CIに含めない。最新PR headで両方successになるまで完了扱いにしない。
- CI結果はGitHub上のCI結果、PR本文、ユーザー向け最終報告へ記録し、final push後にtracked Run Artifactへ書き戻さない。
- repository working treeのファイル変更を伴うタスクでは、TASKS checkbox総数へpush後必須CI確認1件をユーザー向けProgressだけで加算する。CI確認をTASKS checkbox、manifest field、独自schemaへ追加しない。
- PR／Issue本文、label、review comment等のGitHub metadataのみを変更するタスクはcommit・push・CI完了条件とProgressのCI加算の対象外とする。repository file変更を同時に行う場合は通常の完了条件を適用する。
- `run.json`は既存collectorを1回確認し、`status=pending`／`validation.status=not_run`が残る場合は手動Runの完了状態を反映できない既知制約としてREPORTとPR本文へ記録する。run.json、collector、manifest仕様は手編集・変更しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、変更範囲、DoD、禁止事項はユーザー指示で確定している。
- 仮定してよい細部: 既存の`docs/reference/git-branch-safety.md`をGit操作の詳細正本として参照する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `AGENTS.md`へ適用対象とcompletion gateを追加し、final commit前のArtifact確定とpush後CI確認を分離すれば、ローカルPASSのみの誤完了報告とhead自己参照を防げる。
- H2: TASKS templateのcheckboxをfinal commit前のローカル作業に限定し、commit／push／CI確認を説明へ移せば、再commitのための自己参照を防ぎつつreview-only／plan-onlyへGit操作を強制しない。
- H3: §3でrepository working tree変更タスクだけに必須CI確認1件を加算すれば、tracked task完了とCI成功前のProgress 100%を分離できる。
- H4: GitHub metadataのみの変更をcompletion contractから明示的に除外すれば、PR本文だけの更新へcommit・push・CIを誤適用しない。

## Research Plan

- Round 1 Query: 現行AGENTS、TASKS template、branch safety、CI triggerを確認する。
- Round 2 Query: 差分、検証結果、final commit前のRun Artifact、push後のPR headと必須workflow状態を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持／反証の根拠がある
  - 指定検証とscope監査がPASSする
  - push後の最新PR headで必須CIがsuccessになる

## Approach

- 対象branch、既存PR、契約、CI trigger、直近Runを再確認する。
- 正本PLANとRun-local PLANを確定し、Run-local TASKSへcommit前に完了できるcheckboxだけを追加する。
- `AGENTS.md`に§2のRun完了checkpoint例外、§3のProgress計算、repository working tree／GitHub metadataの適用境界を追加し、TASKS templateをfinal commit前のローカル工程だけのcheckboxへ更新する。
- REPORTへ4指摘、作業開始時PR head、`run.json`の実値と既知制約をappend-onlyで記録する。collectorはclean treeで1回だけ確認する。
- PLAN -> TASKS -> 実装 -> ローカル検証 -> Run Artifact更新 -> commit -> push -> PR head確認 -> 必須CI確認 -> PR本文更新 -> ユーザー向け報告の順に進め、CI成功後にtracked Run Artifactへ戻らない。

## Definition of Done

- 指定2文書の変更が意図したscopeに収まり、review-only／plan-onlyへGit操作を強制しない。
- repository working treeのコード、テスト、設定、文書、Run Artifact変更をcompletion contractの対象とし、GitHub metadataのみの変更を対象外とする。
- repository working tree変更タスクのユーザー向けProgressはtracked task数+必須CI確認1件とし、CI成功前は100%にしない。CI確認はTASKS checkboxへ戻さない。
- tracked Run Artifactがfinal commit前に確定し、final push後のCI結果記録だけを目的とするtracked変更・再commit・再pushがない。
- auto-net、Hook、rules、CI workflow、branch safety正本を変更していない。
- `pnpm run lint:markdown`、`pnpm run validate:skills`、`pnpm run verify`、`git diff --check`がPASSする。
- 専用branchへcommit・通常pushし、PRを作成または確認する。
- pushした最新PR headを確認し、Web CIとMobile App CIがsuccessになる。
- Run Artifactへfinal commit前の判断・検証・CI未確認状態を記録し、sanitizer Write／CheckをPASSする。
- `run.json`の`branch=null`、`base_branch=null`、`changed_files=[]`、`validation.status=not_run`、`status=pending`を実値として確認し、手動Runをmanifestへ反映できない既存collector制約を既知事項として記録する。`run.json`、collector、manifest仕様は変更しない。
- 最新headの`Web CI`と`Mobile App CI`がsuccessになった後、PR本文とユーザー向け最終報告へCI結果を記録する。

## Risks / Unknowns

- リスクと対策: 文書間の条件不整合、ProgressのCI未確認100%、GitHub metadataへの過剰適用、head自己参照は差分・sanitizer・PR head確認で検出する。PR未作成によるCI未起動はpush後にPRを作成する。CI failureは`AGENTS.md` §8の品質ゲート失敗時の原因調査・修正・停止条件へ委譲し、`run.json`のpending/not_runはHarness改善候補として分離する。
- 解消済み: `pnpm run verify`の既定5秒timeoutでWindows launcher契約テスト2件が失敗した履歴は、Issue #142への統合とPR #144の修正（対象2 testだけのtest-local `10000ms`）で解消された。PR #144はmainへmerge済みで、#140／#142の原因調査を今回やり直さない。PR #144修正を含む`b3ca0e8...`を取り込んだ対象branchで、標準ローカル検証を実施する。

## Thinking Log

- ユーザー指定により、今回の変更自体も新しいcompletion contractを実行する。final commit前のRun ArtifactにはCI未確認を記録し、CI success確認後にtracked Artifactへ追記しない。
