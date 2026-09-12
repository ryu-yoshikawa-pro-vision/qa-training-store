# Tasks

## Now

- [x] 1. closure Runの実行範囲と完了条件をPLANへ確定する
- [x] 2. canonical原本と現在datasetを検証し、指定値と一致することを確認する
- [x] 3. 原本をsnapshotし、hash一致・parseComparableRun・compareRuns self-compareを検証する
- [x] 4. REPORT／evaluationへPR2完了条件と既知制約を記録し、Run artifactをSanitizer対象にする
- [x] 5. mainとのmerge状態とrouting意味変更を確認し、必要なら手動conflict解消または明示停止する
- [ ] 6. 指定品質ゲート、strict collector、diffを実行して結果を記録する
- [ ] 7. branch安全確認後にcommit／pushし、PR本文とCI最終状態を確認する
- [ ] 8. Runを最終化し、未完了事項だけを明記する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- B1. origin/mainがTrigger Eval dataset／evaluator／observerをsemantic-output構成へ変更しており、merge後のrouting条件がbaselineと一致しないため、full verifyとcanonical再評価を実行しない。
