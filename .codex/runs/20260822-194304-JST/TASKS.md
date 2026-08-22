# Tasks

## Now

- [x] 1. PR HEAD、status/diff、CodeRabbit thread、指定Plan、直近Run、ADR/規約を確認しrepair scopeを確定する
- [x] 2. Repair PLAN、allowed files、H1〜H3、初回Native Doctor結果を記録する
- [x] 3. Native Search state synchronization、独立stale guard、initialKeyword処理とComponent Test A〜Eを実装する
- [x] 4. Native SQLite bulk loading/detail最適化、query trace regression、Guest rank negative assertionを実装する
- [x] 5. 既存Maestro Search flowを最小更新し、Native Doctor以降のruntime validationを実行する
- [x] 6. Focused/repository gates、diff self-review、REPORT訂正、Sanitizer/schema validationを完了する
- [x] 7. feature branchの差分を確認し、normal commit/pushする（PR mergeはしない）

## Discovered

- D1. `CustomerCatalogGateway`二重定義指摘は現HEADでimport/re-exportのみのためrejectする。
- D2. 既存`maestro/native-search.yaml`は`NativeCatalogScreen`の商品一覧検索であり、`NativeSearchScreen`のSuggestion契約を検証していないため、同一flowを最小更新する。
- D3. Android Doctorは初回確認時点でauthorized physical deviceを検出したため、Build/Install/FlowのBefore/After実行可否を変更後に再確認する。

## Blocked

- （なし）
