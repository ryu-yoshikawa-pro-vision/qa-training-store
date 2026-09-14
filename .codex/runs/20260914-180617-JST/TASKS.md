# タスク

## 今回のタスク

- [x] 1. 既存PR、branch、Run、ADR、対象83文書、固定値参照を調査し、計画を保存する
- [x] 2. 前回の意味のない文書差分を戻し、カリキュラムと仕様文書を文脈単位で再修正する
- [x] 3. 日本語化漏れと機械契約・正式名称の保持を横断確認する
- [x] 4. 文書diff、不変条件、scopeをレビューする
- [x] 5. Markdown、spec、curriculum、docs build、標準verifyを検証する
- [x] 6. Run Artifactを更新・サニタイズし、commit対象を確定する
- [ ] 7. 同一branchへcommit・pushし、PR #151本文更新と最新headの必須CI確認を完了する

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

## 発見事項

- D1. `tests/contracts/training-curriculum.test.ts`がrubricの2つの英文固定文字列を直接検査するため、本文の機械契約として保持する。
- D2. `gh`が利用できない場合は、既存PR・PR本文・CIの確認と更新に認証済みGitHub connectorを使用する。

## ブロック

- B1. （ブロック時のみ記載）
