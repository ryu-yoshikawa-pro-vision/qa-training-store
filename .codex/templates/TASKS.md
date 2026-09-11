# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [ ] 1. PLANを確定する
- [ ] 2. 必要な調査を行い、証跡を run-local REPORT に残す
- [ ] 3. 実行タスクへ落とし込む
- [ ] 4. 実装・変更する
- [ ] 5. ローカル検証する
- [ ] 6. 変更範囲を確認する
- [ ] 7. Run Artifactをfinal commit前状態まで更新・検証する
- [ ] 8. commit対象を確定する

## 実装・変更タスクの完了処理

上記タスク完了後、`AGENTS.md`の実装タスク完了条件に従ってcommit・pushする。

- push後の最新PR headで、`AGENTS.md`で定義された必須CIを確認する。
- CI結果はPR本文とユーザー向け最終報告へ記録する。
- CI結果を記録するためだけにtracked Run Artifactを再commitしない。
- 必須CIがfailureの場合は、`AGENTS.md` §8「必須検証」の品質ゲート失敗時の原因調査・修正・停止条件に従う。
- `TASKS.md`のcheckbox完了はfinal commit前のtracked task進捗であり、実装・変更タスク全体の完了を意味しない。
- review-only、plan-only、調査のみ、質問への回答、状態確認のみ、コード変更を伴わない分析ではcommit・push・PR・CI確認を実行しない。
- ユーザーがcommit、push、PR作成、Git操作を明示的に禁止した場合は、その指示を優先し、禁止された工程を実行しない。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. （必要になったら追記）

## Blocked

- B1. （ブロック時のみ記載）
