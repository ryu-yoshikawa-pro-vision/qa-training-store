# Tasks

## Now

- [x] 1. Issue・仕様・Git・関連config・既存testを固定する
- [x] 2. 計画書とGray-box QA Charterを作成する
- [x] 3. Charterをvalidatorで検証し、BEFORE Working Tree Snapshotを取得する
- [x] 4. Current baselineのfresh ChromiumでMouse初回操作を再現する
- [x] 5. fresh ChromiumでKeyboard初回操作とdirect `#reviews`を確認する
- [x] 6. 再現結果からRoot Causeと実装要否を判定する
- [x] 7. 再現時だけ最小修正とRegression Testを実装する
- [x] 8. targeted／指定／統合Validationを実行する
- [x] 9. 最終diff review、sanitizer、commit／push／PR確認を行う
- [x] 10. Run Artifactと最終報告を確定する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. `origin/main`はHEADより#110／#107／#108／#111の4コミット先行だが、Product Detail source／Header／router関連の差分はなく、追加差分は配送先文言、Product List loading、Admin overflow、SearchCombobox、Run文書と既存E2E補助に限定される。rebase／mergeはしない。

## Blocked

- B1. （ブロック時のみ記載）
