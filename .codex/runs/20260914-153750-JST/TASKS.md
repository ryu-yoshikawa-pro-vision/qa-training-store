# Tasks

## Now

- [x] 1. PLANを確定し、`docs/plans/`へ保存する
- [x] 2. 入口資料、branch、最近Run/ADR、対象83文書、参照関係、package/workflow/validatorを調査する
- [x] 3. 表現改善の対象・非対象、formal literal、意味保存チェック項目を確定する
- [x] 4. カリキュラム文書を文書単位で表現改善する
- [x] 5. 中核仕様文書と`docs/spec`を文書単位で表現改善する
- [x] 6. 変更前後のdiffを意味保存の観点でレビューする
- [x] 7. Markdown、spec、curriculum、標準verify、diff/scopeを検証する
- [x] 8. Run Artifactを更新・サニタイズし、commit対象を確定する
- [ ] 9. branch safety確認後にcommit、push、PR、最新headの必須CI確認、必要なPR本文更新を完了する

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

- D1. GitHub CLI (`gh`) が環境にインストールされていないため、push後のPR/CI操作は認証済みの代替経路を確認する。
- D2. `docs/spec`のfeature headingとBR / AC grammarはvalidatorの機械契約のため、翻訳対象から除外する。

## Blocked

- B1. （ブロック時のみ記載）
