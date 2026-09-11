# Tasks

## Now

- [x] 9. レビュー指摘3件を`AGENTS.md`、TASKS template、Planへ反映する
- [x] 10. ローカル検証、scope監査、Run Artifact更新、sanitizerを完了する
- [x] 11. final commit対象を確認する

## Previous cycle history

- 初回実装時の確認・検証・commit・push・PR確認は、既存の`REPORT.md` checkpoint（2026-09-10）に記録済みである。
- 旧task 9〜10の「push後CI確認後にRun Report／TASKSを更新する」順序は、今回のレビュー修正で廃止し、上記3 taskへ置き換える。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] D1. 既存lockfileを使い、検証に必要な依存を`--ignore-scripts`で準備する
- [x] D2. 既存native test timeoutの再現性と今回差分との因果関係を確認する

## Blocked

- なし

## 実装・変更タスクの完了処理（checkboxではない）

- 上記task完了後、`AGENTS.md`の実装タスク完了条件に従ってcommit・通常pushする。
- push後の最新PR headで、`AGENTS.md`で定義された必須CIを確認する。
- CI結果はPR本文とユーザー向け最終報告へ記録する。
- CI結果を記録するためだけにtracked Run Artifactを再commitしない。
- 必須CIがfailureの場合は、`AGENTS.md` §8「必須検証」の品質ゲート失敗時の原因調査・修正・停止条件に従う。
