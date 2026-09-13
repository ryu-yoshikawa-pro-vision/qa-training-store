# Plan

## Objective

- PR #127へ`origin/main`（確認時点`f6727303da97f3b4b81777472a305ed5c3860410`）を通常mergeし、conflictを解消する。
- mainのADR-0023を維持したまま、Trigger Eval ADRを0024／0025へ移動し、現行文書の参照だけを更新する。
- Trigger Evalのdataset、baseline、routing／Skill／OTel／scoring契約を変更せず、PRを通常push後にmerge可能な状態へ戻す。

## Scope

- In:
  - 進行中の`git merge origin/main`の3者差分確認とconflict解消。
  - `package.json`、`docs/PROJECT_CONTEXT.md`、main側の追加変更の統合確認。
  - `docs/adr/0023-test-automation-curriculum-learning-experience.md`の維持。
  - Trigger Eval ADRのファイル名／見出し／現行`docs/plans/**`参照の限定修正。
  - 必須ローカル検証、Run Artifact、commit、通常push、PR本文、push後CI確認。
- Out:
  - rebase、force push、PR merge／close、branch削除。
  - baseline再実行、dataset/query/expected_skill/boundary、Skill description、routing意味、OTel observation/scoring、`compareRuns()`、timeout、Result schemaの変更。
  - 新しい`docs/plans/`、provenance remediation、Run lifecycle改善、汎用merge framework。

## Assumptions

- 現在のworking treeは、ユーザー指示に対応する未完了merge状態であり、既存のstaged main差分を保持して完了させる。
- `.codex/runs/**`と`docs/history/**`は過去記録として機械的に書き換えない。今回のRunは`20260913-105156-JST`を使用する。
- GitHub metadataの更新とCI確認はsource変更のpush後に実施する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象branch、PR、main SHA、禁止事項、完了条件が明示されている。
- 仮定してよい細部: conflictが1ファイルの場合は3者内容を併記して意味を保持する。ADRの番号変更履歴は本文へ短く記録する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `docs/PROJECT_CONTEXT.md`のconflictはPR #127のTrigger Eval記録とmainのPR #133 curriculum記録を併記すれば解消できる。
- H2: `package.json`はmainの`training:web:diagnostic`とPR #127の3 Eval scriptが共存する形で統合できる。
- H3: ADR番号と現行計画参照だけを更新すれば、Trigger Eval測定条件・dataset・baselineに差分は生じない。

## Research Plan

- Round 1 Query: merge state、merge base、ours／theirs、conflict file、package script、ADR／現行参照を確認する。
- Round 2 Query: diff scope、baseline hash、dataset fingerprint、禁止対象、focused／repository／verify、PR／CI終端状態を確認する。
- Exit Criteria:
  - すべてのconflict markerとunmerged pathがない。
  - ADR番号重複がなく、main ADR-0023とTrigger Eval ADR-0024／0025が存在する。
  - 必須検証PASS、通常push後のPRがOPEN／MERGEABLE、Web／Mobile CIが終端success（skipは明示）である。

## Approach

- 進行中mergeの3者差分を確認し、conflictを最小範囲で解消する。
- ADRを移動・見出し更新し、現行`docs/plans/**`だけ参照を修正する。
- diff／不変条件／focused／repository／verifyを実行し、Run Artifactをsanitizer検証する。
- branch safetyを再確認してmerge commitと修正をcommitし、明示refspecで通常pushする。
- PR本文を現状態へ更新し、最新headのWeb CI／Mobile App CIを終端まで確認する。

## Definition of Done

- `origin/main`が通常mergeされ、merge conflictがない。
- mainの変更とPR #127のTrigger Eval実装が保持される。
- ADR番号重複がなく、現行参照が0024／0025へ更新される。
- baseline／dataset／routing／Skill／OTel契約が不変である。
- 指定検証がPASSし、commit／push／PR本文／CI確認が完了する。

## Risks / Unknowns

- `PROJECT_CONTEXT`の併記漏れでmainまたはPR記録を失うリスク。対策はours／theirs／merge結果の3者比較。
- ADR全置換でmainのADR-0023を壊すリスク。対策はTrigger Eval参照だけをファイル単位で更新する。
- CI失敗がmerge差分以外に起因する可能性。first anomalyと変更因果を分離して記録する。

## Thinking Log

- 2026-09-13 10:51 JST: strict Run `20260913-105156-JST`を正規scriptで初期化した。既存`20260913-085558-JST`は別のOTel修正タスクのRunとして再利用しない。
- 2026-09-13 10:50 JST: 実ワークツリーはHEAD `e23cd7d`上で`origin/main=f6727303`のmerge中。unmerged pathは`docs/PROJECT_CONTEXT.md`のみで、`package.json`はmainのdiagnostic scriptを含む自動統合結果だった。
- 2026-09-13 10:51 JST: `PROJECT_CONTEXT`はPR #127／PR #133双方の記録を保持してconflict markerを除去した。Trigger Eval ADRは0024／0025へ移動し、現行`docs/plans/**`の参照を限定更新した。
