# Tasks

## Now

- [x] 1. Runを初期化し、既存Plan／ADR、PR、branch、HEAD、origin/main、incoming diffを確認する
- [x] 2. validation query、固定model、runner／comparison／stdin failureの実装方針とテスト範囲を確定する
- [x] 3. 4指摘の実装・テスト・初期Plan注記を最小差分で適用する
- [x] 4. dataset validationとfocused Trigger Eval／OTel／Windows／stdin回帰テストを実行する
- [x] 5. 指定repository gatesと`pnpm run verify`を実行し、失敗があればbounded repairする
- [x] 6. 差分・最新main・fresh Routing Target・baseline条件を固定する
- [x] 7. 新しいTrigger Eval `all` baselineを1回取得し、self-compare／model mismatch／coverageを確認する
- [x] 8. Run Artifactを更新・sanitizer検証し、最終scope／diffを監査する
- [ ] 9. branch安全確認後にcommit・通常pushし、local／remote／PR headを照合する
- [ ] 10. PR本文を更新し、最新headのWeb CI／Mobile App CIを終端確認してRunを完了する

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
- D1. 旧main同期RunのCI待機は今回の実装Runとは別であり、今回のpush後headで再確認する。

## Blocked

- B1. （ブロック時のみ記載）
