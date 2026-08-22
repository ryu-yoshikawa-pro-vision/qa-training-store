# Tasks

## Now

- [x] 1. 必須文書、指定Plan全文、最近のADR/Run、最新origin/main、作業ツリーを確認しStrict runを初期化する
- [x] 2. G3/G4 repo mapping結果から実装計画・変更面・Validationを確定する
- [x] 3. G3のviewer context、Storefront parity、Suggestionを既存経路へ実装し不足coverageを追加する
- [x] 4. G3 Native UIの不足dimension/SuggestionとG4 Native route boundaryを実装し代表negative testを追加する
- [x] 5. Focused Validationと変更面に必要なRepository gateを実行する
- [x] 6. Run artifactをSanitizeし、REPORT/evaluation/最終報告を更新する
- [ ] 7. feature branchの差分を確認し、必要ならnormal commit/pushする（PR mergeはしない）

## Discovered

- D1. Native Catalog service surfaceに`CatalogUseCases.suggest`を追加すると、既存Native runtime contract testの期待値更新が必要。
- D2. Native Catalog repository interfaceへviewerを必須化すると、共有Repository contract suiteとNative harnessのGuest呼出し整合が必要。

## Blocked

- （なし）
