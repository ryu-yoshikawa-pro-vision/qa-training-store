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
- [x] 19. C2 / REP-017をread-only confirmationへ固定し、設定変更・追加CI実装を別対応へ分離する
- [x] 20. C1 / REP-013をread-only confirmationへ固定し、intent不明時は変更せず報告で止める
- [x] 21. G0 Policy変更を撤回し、既存Policy上のGit Execution Contractへ縮小する
- [x] 22. Active remediationを必要性の高い9Groupへ絞り、R6/R10/R12/R13/C1/C2をFollow-upへ移し、Git/MCP/validation重複を削る
- [x] 23. G8で既存`.gitattributes`のLF contractを優先し、script normalizationをEvidenceがある場合だけに限定する
- [ ] 24. `sanitize-codex-artifacts`をWrite + Checkで実行する
- [ ] 25. `pnpm run format:check`を実行する
- [ ] 26. `pnpm run lint:markdown`を実行する

## Discovered

- D1. Current Native Test Control scenario allowlistに`gold-member` / `platinum-member`がないため、Runtime検証だけを目的としたscenario追加は禁止する → Plan反映済み。
- D2. Cross Browser CI splitは実装branchに存在するがmain未反映のため、R13はActive implementationから外しFollow-upとする。
- D3. `BR-STOREFRONT-002` / `AC-STOREFRONT-002`は在庫・Sale・最低評価・Facet件数・stable sortも要求する → G3へ必要dimensionを維持。
- D4. REP-012はProduct Runtime FindingではなくTest Oracle Finding → G7でFocused Playwrightを正本Validationとする。
- D5. Native SuggestionはUIだけでなく`CustomerCatalogGateway` capability自体が欠けている → G3へApplication/Gateway経路を維持。
- D6. Native CIのProduction Build / Runtime JobにもStandalone validatorと同系統のraw Hermes marker scanがある → G1で同一Root Causeとして扱う。
- D7. REP-001はActor ResolverだけでなくGatewayがviewerを捨て、SQLiteがGuest visibility/pricingを前提にしている → G3でviewer context End-to-Endを維持。
- D8. Native SuggestionはService / Repository / SQLite / UIにも経路がない → G3で全経路を維持。
- D9. R2aとR3は同じNative Catalog boundaryを変更しR3がR2aへ依存する → G3へ統合。
- D10. Native Suggestionのstale protectionは実際のasync overlapがある場合だけ必要 → 専用Cancellation framework禁止。
- D11. REP-017は外部Repository設定のconfirmation Finding → Active implementationから除外。
- D12. REP-013はintent未確定のconfirmation Finding → Active implementationから除外。
- D13. Parentのfeature-branch add / commit / pushは既存Policyで扱える → Git permission policy変更は不要。
- D14. auto-netまでGit writeを許可すると追加Guardが必要になりscopeが膨らむ → auto-net禁止を維持。
- D15. 監査Findingをすべて同じMust Fix粒度で持つとPlanが監査Report化する → Product correctness / authorization / test reliability / CI-securityに直接効く9GroupだけActiveとする。
- D16. `.gitattributes`は既に`* text=auto eol=lf`を定義している → G8はまず既存LF contractでpatchを揃え、script側normalizationはstrict apply問題が残るEvidenceがある場合だけ検討する。

## Blocked

- B1. GitHub connector環境ではRepository script / pnpm commandを直接実行できないため、Task 24〜26はRepositoryをローカル取得できる環境で実行する。

現在のPlanning RunはValidation未完了のため100%完了扱いにしない。