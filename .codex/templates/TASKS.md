# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [ ] 1. PLANを確定する
- [ ] 2. 不足知識を repo docs / tickets / logs / 必要なWeb検索で補い、証跡を run-local REPORT に残す
- [ ] 3. 実行タスクへ落とし込む
- [ ] 4. 実行・ローカル検証する
- [ ] 5. （実装・変更タスクの場合）変更とstage内容を確認し、対象branchへcommitする
- [ ] 6. （実装・変更タスクの場合）Git branch safetyを確認し、対象branchへ通常pushする
- [ ] 7. （実装・変更タスクの場合）PRを作成または既存PRを確認し、push後の最新PR headと必須CIがsuccessであることを確認する
- [ ] 8. REPORTへ記録し完了判定する

- 実装・変更タスク以外（review-only、plan-only、調査のみ、質問への回答、状態確認のみ、コード変更を伴わない分析）では5〜7を実行しない。
- 実装・変更タスクでユーザーがcommit、push、PR作成、Git操作を明示的に禁止した場合は、その指示を優先し、禁止された工程を実行しない。
- 実装・変更タスクは、最新PR headの必須CIが`success`になるまで完了扱いにしない。CIが`queued`／`in_progress`なら未完了、`failure`なら原因確認と残作業をREPORTへ記録する。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. （必要になったら追記）

## Blocked

- B1. （ブロック時のみ記載）
