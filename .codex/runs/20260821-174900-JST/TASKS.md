# Tasks

## Now

- [x] 1. Repository Planning / Review Contractを再確認する
- [x] 2. Main PlanをTemplate必須項目へ再整理する
- [x] 3. MNT-003 / REP-002 / PR Slice / MCP / Oracle / SHA pinning指摘を反映する
- [x] 4. R3 Storefront parityをCurrent BR/AC全dimensionのrebaselineへ修正する
- [x] 5. R7 Flow Jの正本ValidationをFocused Playwrightへ修正する
- [x] 6. R8をNative Product PRのmerge gateとして整理する
- [x] 7. Branch差分を確認し、Plan + Run Artifact以外の変更がないことを確認する
- [x] 8. R8のAffected SurfaceへNative CIの重複raw scanとContract Testを追加する
- [x] 9. R3 Native Suggestionの`CustomerCatalogGateway` / `CatalogUseCases.suggest()`経路を明示する
- [x] 10. `Main flow` / `Key abstractions` / `Files to inspect` / `Unknowns`をMain Planへ復元する
- [x] 11. R8 hard merge prerequisiteをProduction isolation surface変更時だけに限定する
- [x] 12. R2aをviewer contextのUseCase→Gateway→Repository→SQLite伝播まで拡張する
- [x] 13. R3 SuggestionをNative Search UI→Service→UseCase→Gateway→Repository→SQLiteまで明示する
- [x] 14. Main Plan / Planning Run ArtifactをR2a / R3のEnd-to-End経路へ同期する
- [x] 15. PR分割をRoot Cause数ベースから変更面・依存関係ベースへ簡素化する
- [x] 16. R2a + R3、R12a + R12bをPreferred implementation groupへまとめる
- [x] 17. R2a / R3の重複Testとspeculative async frameworkを削る
- [x] 18. MCP / R8 validationをFindingに必要な操作と既存Harness再利用へ限定する
- [ ] 19. `sanitize-codex-artifacts`をWrite + Checkで実行する
- [ ] 20. `pnpm run format:check`を実行する
- [ ] 21. `pnpm run lint:markdown`を実行する

## Discovered

- D1. Current Native Test Control scenario allowlistに`gold-member` / `platinum-member`がないため、Runtime検証だけを目的としたscenario追加は禁止する → Plan反映済み。
- D2. Cross Browser CI splitは実装branchに存在するがmain未反映のため、R13を`BLOCKED_BY_DEPENDENCY`とする → Plan反映済み。
- D3. `BR-STOREFRONT-002` / `AC-STOREFRONT-002`は在庫・Sale・最低評価・Facet件数・stable sortも要求する → R3へ全dimensionを反映済み。
- D4. REP-012はProduct Runtime FindingではなくTest Oracle Finding → Focused Playwrightを正本Validationへ変更済み。
- D5. Native SuggestionはUIだけでなく`CustomerCatalogGateway` capability自体が欠けている → R3へApplication/Gateway経路を反映済み。
- D6. Native CIのProduction Build / Runtime JobにもStandalone validatorと同系統のraw Hermes marker scanがある → R8へ同一Root Causeとして反映済み。
- D7. R2aはActor Resolverだけでなく、Gatewayがviewerを捨て、SQLiteがGuest visibility/pricingを前提にしている → viewer context End-to-End伝播をR2aへ反映済み。
- D8. Native Suggestionは`NativeCatalogService` / `NativeCustomerCatalogRepository` / `NativeCustomerSQLiteRepository` / Native Search UIにも経路がない → R3へ全経路を反映済み。
- D9. R2aとR3は同じNative Catalog boundaryを変更しR3がR2aへ依存するため、別PRより同一Groupの方が変更・Validationが単純 → G2へ統合済み。
- D10. Native Suggestionのstale protectionは現実のasync overlapがある場合だけ必要で、専用Cancellation frameworkは不要 → Planへ制約追加済み。

## Blocked

- B1. GitHub connector環境ではRepository script / pnpm commandを直接実行できないため、Task 19〜21はRepositoryをローカル取得できる環境で実行する。

現在のPlanning RunはValidation未完了のため100%完了扱いにしない。
