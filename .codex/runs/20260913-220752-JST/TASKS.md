# Tasks

## Now

- [x] 1. 初期状態、PR／Issue／#135／main、Plan、現行source／config／testsを確認する
- [x] 2. 3件をmust_fixに分類し、bounded scope・仮説・検証計画をPLANへ確定する
- [x] 3. session開始時worktree baseline優先、Windows Stop fallback、Stop(true) cleanupを最小修正する
- [x] 4. 3件の回帰contractを既存testsへ追加し、既存ケースを維持する
- [x] 5. focused／Windows degraded path／通常quality gates／verifyを実行する
- [x] 6. 差分、scope、production rule、#135非変更、Run Artifactを確認・sanitizeする
- [ ] 7. commit・push・local／remote／PR headを確認し、PR本文を更新する
- [ ] 8. 最新headのWeb CI／Mobile App CIとWindows Hook test実行を確認する

## 実装・変更タスクの完了処理

上記タスク完了後、`AGENTS.md`の実装タスク完了条件に従ってcommit・pushする。

- push後の最新PR headで、`AGENTS.md`で定義された必須CIを確認する。
- CI結果はPR本文とユーザー向け最終報告へ記録する。
- CI結果を記録するためだけにtracked Run Artifactを再commitしない。
- repository working treeのファイルを変更する実装・変更タスクでは、checkbox完了後に`AGENTS.md`の完了条件へ従ってcommit・push・最新PR headの必須CI確認を行う。push後の必須CI確認1件は、最新PR headの`Web CI`と`Mobile App CI`がともに`success`であることを確認し、CI結果をPR本文へ記録する必要がある場合はPR本文の更新まで完了した時点で、ユーザー向けProgressの分子へ加算する。これは新しいTASKS checkboxにはしない。
- 必須CIがfailureの場合は、`AGENTS.md` §8「必須検証」の品質ゲート失敗時の原因調査・修正・停止条件に従う。
- `TASKS.md`のcheckbox完了はfinal commit前のtracked task進捗であり、実装・変更タスク全体の完了を意味しない。
- review-only、plan-only、調査のみ、質問への回答、状態確認のみ、コード変更を伴わない分析ではcommit・push・PR・CI確認を実行しない。
- PR／Issue本文、label、review comment等のGitHub metadataのみを変更するタスクではcommit・push・PR・CI完了条件とProgressのCI加算を適用しない。repository file変更を同時に行う場合は通常の完了条件を適用する。
- ユーザーがcommit、push、PR作成、Git操作を明示的に禁止した場合は、その指示を優先し、禁止された工程を実行しない。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- なし

## Blocked

- なし
