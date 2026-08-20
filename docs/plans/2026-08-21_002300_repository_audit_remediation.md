# Repository Audit Remediation 実装計画

## 0. 依頼概要

- 依頼内容:
  - PR #35 で追加・確定した `maintenance-investigation` / `repository-audit` の2レポートを正本Evidenceとして、実際に対応が必要なRoot Causeを整理し、実装順序・PR分割・検証方法まで具体化する。
  - Finding IDを機械的に1件1タスク化せず、重複・Decision Gate・対応不要を分離する。
- 背景:
  - PR #35 は `main` へマージ済み。
  - 基準 `main` は `314a8f958072f19e672e3bc37089558d74e42feb`（`docs: Repository全体のメンテナンス調査レポートを追加 (#35)`）。
  - 監査ではCritical 0、High 2（REP-001 / REP-002）、Medium中心のProduct / Test / Tooling / Documentation / Training / CI Findingが確認された。
  - Reconciliationにより `REP-009` / `REP-014` は同一Root Cause、`REP-013` はunresolved contract ambiguity、`REP-019` はlocal worktree observationとして整理済み。
  - Maintenance Report側では `MNT-001` と `REP-003`、`MNT-002` と `REP-018` が同じRoot Causeを別監査から確認している。
- 期待成果:
  - 最上位のProduct correctnessを先に修正する。
  - QA/Test/Toolingのfalse-green / false-negative要因をProduct修正と分離して直す。
  - 判断が必要な項目は、Evidence不足のまま実装しない。
  - Documentation / Curriculumは、Current implementation / CIが確定してから最後に同期する。
  - 各Root Causeを、追加判断なしで実装できる粒度のPR sliceへ分割する。

## 1. ゴール / 完了条件

### ゴール

PR #35の監査結果を、Current Repositoryの正本契約に従った安全な修正へ段階的に変換し、Product correctness → Native consistency → QA/Test reliability → Tooling/CI reliability → Documentation/Training alignmentの順でRepositoryを整合させる。

### 完了条件（DoD）

1. REP-002のCheckout result integrityがWeb/Nativeともpersisted Order/Payment stateに基づく。
2. REP-001のNative Customer CatalogがSession-aware Viewer / Membership Rankを解決する。
3. REP-006のNative Customer-only direct routeがGuest/非CustomerをScreen service実行前に安全なboundaryへ送る。
4. MNT-001 / REP-003のNative Storefront scopeをCurrent Normative Specificationと一致させる。Current Specを維持する場合は、欠けているNative capabilityとRegression coverageを実装する。
5. REP-004のWeb Search Suggestionが通常のtypingでdiscoverableになる。
6. REP-005のWeb Cart repositoryが`cartId`と`itemId`の所属Invariantを検証する。
7. REP-007のAuthentication visual/spec stateが実際のscenario/setupと同じfailure pathを表す。
8. REP-012のFlow JがShipment transition未確認のままPASSしない。
9. MNT-003のNative Production Bundle GuardがHermes `.hbc` raw文字列検索へ依存せず、Automation/Production boundaryを有効に検証する。
10. MNT-002 / REP-018のAgentic QA challenge patchがWindows/Linuxのline-ending差で壊れず、patch compatibilityを高コスト処理前にfail-fast確認できる。
11. REP-011のWindows contract timeout riskを、global timeout緩和ではなく対象caseのcost/timeout budgetで安定化する。
12. MNT-004のWeb exportがroute-less artifactをexit 0で後段へ渡さない検証を持つ。
13. REP-015のGenerated image manifestがbuild中の上書きだけでdriftを隠さず、committed generated outputの整合性をread-onlyに検証できる。
14. REP-016のTraining Workflow remote action policyがRepository-wide policyと明示的に一致する。原則full SHA pinningとする。
15. REP-008、REP-009/014、REP-010のCurrent documentation / Curriculum driftを、関連実装・CIが確定した後に同期する。
16. REP-013、REP-017、MNT-005はDecision Gateの結論を記録し、結論が`fix`の場合のみ別sliceで実装する。
17. REP-019はRepository implementation taskへ昇格させない。
18. 各sliceでfocused validationと該当Required CIを通し、最後にCurrent `main` 相当のFull Required Validationを通す。
19. 監査Report自体はHistorical Evidenceとして保持し、Finding closureのために過去Reportを大量書換えしない。

## 2. 現状理解と前提

### Current understanding

#### 基準

- Base branch: `main`
- Base SHA: `314a8f958072f19e672e3bc37089558d74e42feb`
- Evidence:
  - `docs/reports/2026-08-20_010734_maintenance-investigation.md`
  - `docs/reports/2026-08-20_103937_repository-audit.md`

#### P0 Product correctness

- REP-002:
  - Web `OrderResultContent` はOrderを取得するが、heading / retry / explanationをURL側の`kind`だけで決定している。
  - Native Completeは`orderId`が任意で、Order lookupなしに`注文完了`を表示する。
  - Native FailedはOrderを取得するが、`payment_failed`との整合を確認せずfailure/retry UIを表示する。
- REP-001:
  - `src/bootstrap/native-runtime.ts` はCurrent Session Storeを初期化している一方、CatalogUseCasesへ`new GuestActorResolver()`を固定で渡している。
  - Native Customer Catalogのrank visibility / membership priceがSessionと接続されていない。

#### Native capability / authorization

- MNT-001 / REP-003:
  - `NativeCatalogScreen` はBrand/Priceを固定empty/null、`page: 1`、`pageSize: 20`で送信する。
  - `NativeSearchScreen` はkeyword-onlyでSuggestion / Brand / Price / Pagination UIを持たない。
  - Current Storefront SpecificationはWeb/Native共通のViewer / Filter / Pagination / Suggestion contractを記述しており、Known DeviationにNative縮小保証はない。
- REP-006:
  - `NativeShell` は`currentUser !== null && role !== customer`をblockedにするが、Guest `currentUser === null` をCustomer-only routeで止めない。
  - Direct Customer deep linkで各Screen serviceまで到達し、`auth.required`相当のgeneric errorになる。

#### Web behavior / persistence

- REP-004:
  - Search Comboboxはasync suggestionsを取得するが、通常typing後にPopoverが自動でdiscoverableにならない。
  - Existing component testはArrowDownでmenuを開く経路に偏っている。
- REP-005:
  - Dexie Cart update/deleteは`cartId`と`itemId`を独立取得し、`currentItem.cartId === currentCart.id`を検証しない。
  - Native SQL pathは`id + cart_id` predicateを持つ。

#### QA / Specification oracle

- REP-007:
  - `SCREEN-AUTH-LOGIN/validation-error` はcondition/scenarioを`storage-write-failure`としながら、Expected UIはrequired input Summaryを要求する。
  - Current visual captureはempty submitを実行しており、storage write failureを証明していない。
- REP-012:
  - Flow Jは`発送準備を開始` buttonが存在する場合だけclick/assertし、存在しない場合にprecondition / already-transitioned stateをassertしない。
- MNT-005:
  - Native Review Flowはsave successを保証するが、入力literalの保存内容までは保証しない。IME変換条件もあり、Product defectではなくoracle scopeの判断が必要。

#### Tooling / CI / generated artifacts

- MNT-003:
  - `validate-native-production-bundle.ts` は`.js|hbc|map|json`をUTF-8 textとして結合し、marker substringでAutomation/Productionを検査する。
  - Hermes `.hbc`では正常なAutomation markerをraw検索できずfalse negativeになる。
- MNT-002 / REP-018:
  - `.gitattributes` は`* text=auto eol=lf`。
  - Agentic QA preparationはpatch fileをraw textとしてstrict `git apply --check` / `git apply`し、Windows worktreeのCRLF patchとLF targetで失敗する。
  - Ubuntu PR CIではPASSしたため、Universal failureではなくWindows portability issueとして扱う。
- REP-011:
  - WindowsでPowerShell subprocess / large PNG fixture generationがVitest default 5s境界へ到達する。
  - Ubuntu CIはPASSしているため、global timeout問題とは扱わない。
- MNT-004:
  - stale Metro cache条件で`expo export`がexit 0のroute-less artifactを生成し、`--clear`後は正常化した。
  - clean GitHub runnerで恒常再現するProduct defectではない。
- REP-015:
  - `build:web`は`generate:image-manifest`でtracked TS/JSONを上書きしてからvalidate/buildする。
  - Current validatorはJSON/config/assetsを検査するが、tracked TS generated outputとの決定的driftをbuild前にfail-closeしない。

#### Training / policy / docs

- REP-013:
  - Training workflowはraw `training:web:expected-failure`を実行する。
  - `workflow-contract.ts`もraw commandを明示的に許可し、wrapperをapproved entrypointにしていない。
  - Curriculumは`training:web:check-expected-failure`をFailure Artifact lessonとして案内する。
  - Intentional responsibility splitの可能性があるため、confirmed SCRIPT_DRIFTではない。
- REP-016:
  - Training templatesは`actions/checkout@v4`等のmutable tagを使う。
  - Current Repository policyはremote `uses:`のfull SHA pinningを要求する。
  - `workflow-contract.ts`自体がmutable tagsをapproved actionとして固定している。
- REP-017:
  - Native CIは`pull_request` / `workflow_dispatch`で、`push`を持たない。
  - Legacy branch metadataだけではRuleset / direct-push prohibitionの完全な保証を確認できない。
- REP-008:
  - `docs/05_ui/design_system.md`のtoken/breakpoint/image ratioとcurrent code/configがdriftしている。
- REP-009 / REP-014:
  - `docs/08_testing/e2e_design.md`が古いPhase / E2E count / trigger modelをCurrent-lookingに保持している。同一Root Causeとして扱う。
- REP-010:
  - CurriculumのiOS manual-only説明が、current reusable Build-only Required Gate contractとdriftしている。
- Current `main`には`docs/plans/2026-08-20_132500_chromium-required-ci-cross-browser-split.md`があり、Cross Browser CI構造は今後さらに変わる予定。E2E/CI文書同期はその実装後に行う方が再修正を減らせる。
- `plan/phase3-cloudflare-backend`系の将来計画があるため、REP-005のWeb Dexie修正は局所Invariant修正に留め、大規模Persistence再設計へ広げない。

### Assumptions

- `docs/spec/`のCurrent Normative SpecificationをExpected Product Behaviorの正本とする。
- Native Storefrontについて新しいKnown Deviation / Owner Decisionが実装開始時点で存在しなければ、Current common Storefront contractをAndroidへ適用する。
- Checkout result修正ではOrder/Payment domain state machineを新設せず、既存DTO/stateを使ってpresentation consistencyを保証する。
- Native authorizationは各Screenへ重複guardを追加せず、Shell / route-boundaryの共通判定へ寄せる。
- Tooling修正ではfalse negativeを避けるためにsecurity/guardを弱めない。検査方法を実出力形式へ適合させる。
- Flake修正はretry増加・global timeout拡大を第一手段にしない。
- Generated artifact対応では新しい生成Frameworkを導入せず、既存generatorのdeterministic compare/checkを追加する。
- Documentationは実装より先にExpected Realityを書き換えない。

### Non-goals

- Phase 3 Backend / Cloudflare Workers / D1実装。
- Native Admin実装。
- iOS Runtime/Maestro保証の追加。
- Guest Checkout追加。
- UI全面リデザイン。
- Dependency / Expo / Playwright / Maestroの不要なversion upgrade。
- 全E2Eの再設計。
- 全Generated Artifact基盤の作り直し。
- Agentic QAの新Runner / Orchestrator / Session Manager追加。
- Rootのuser-owned untracked PNGをRepository修正として扱うこと。
- Historical audit ReportのFinding ID削除・再番号付け。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

実装開始時点で以下のDecision GateがRepository Evidenceだけで解消できない場合、そのsliceだけ停止してOwner判断を求める。他の独立sliceは進めてよい。

1. **DG-01 Native Storefront scope**
   - Current Specを維持し、Suggestion / Brand / Price / PaginationまでAndroidへ実装するか。
   - Default: New Known DeviationがなければCurrent Specを維持し実装する。
2. **DG-02 Training expected-failure responsibility（REP-013）**
   - Workflowを意図的にredにする教材なのか、Expected Failure Contractをgreenで検証する教材なのか。
   - Default: Current machine contractがraw commandを明示許可しているため、コード変更せず責務を確認する。
3. **DG-03 Native main assurance（REP-017）**
   - GitHub Ruleset / Branch Protectionでdirect main pushを禁止しNative PR Gateをrequiredにしているか。
   - 外部設定で保証済みならpush-trigger追加をしない。
4. **DG-04 Native Review oracle（MNT-005）**
   - Formal Flowの保証対象が「non-empty review save」か「入力literalの永続化」か。
   - Default: Product defectとして扱わず、契約がliteral integrityを要求すると確認できた場合だけTest oracleを強化する。

### 仮定してよい細部

- 同じRoot Causeかつ同じvalidation surfaceなら1PRへまとめてよい。
- Root Causeが別なら、変更行数が小さくても原則別PRにする。
- Error UIの細かい文言は既存ApplicationError / UI contractに従う。
- Test IDは既存命名規則に従い、既存consumerを壊さない範囲で追加してよい。

### 未回答の重要質問

- Plan保存時点ではなし。上記4件は実装Wave内のDecision Gateとして扱う。

## 4. 影響範囲

### Impacted areas

| Area | Finding / Root Cause | Priority | Main change surface |
|---|---|---:|---|
| Checkout result integrity | REP-002 | P0 | Web/Native presentation + regression tests |
| Native customer identity | REP-001 | P0 | Native runtime actor/session resolution |
| Native route authorization | REP-006 | P1 | Native Shell / route boundary |
| Native Storefront capability | MNT-001 / REP-003 | P1 | Native service surface / UI / tests |
| Web Search suggestion | REP-004 | P1 | Search ComboBox + component/E2E |
| Web Cart ownership | REP-005 | P2 | Dexie repository contract + negative test |
| Auth visual/spec oracle | REP-007 | P1 | Spec state/scenario + visual/test setup |
| Cross-role E2E oracle | REP-012 | P1 | Flow J assertions/fixture state |
| Native bundle guard | MNT-003 | P1 | Validation script + Native CI contract |
| Agentic QA patch portability | MNT-002 / REP-018 | P1 | Patch/preflight/EOL contracts |
| Contract timeout | REP-011 | P2 | Focused tests/fixture cost/per-test budget |
| Web artifact reproducibility | MNT-004 | P2 | Build/artifact validation |
| Generated image manifest drift | REP-015 | P2 | Generator/check/CI |
| Training action policy | REP-016 | P2 | Training templates + workflow validator |
| Design/current docs | REP-008 | P2 | Design doc/current SSOT wording |
| E2E/CI docs | REP-009 / REP-014 | P2 dependent | Testing design docs after CI split |
| iOS curriculum | REP-010 | P2 | Curriculum after current CI contract fixed |
| Expected-failure contract | REP-013 | Decision | Training policy/curriculum only after DG-02 |
| Native push assurance | REP-017 | Decision | GitHub setting or workflow after DG-03 |
| Native Review oracle | MNT-005 | Decision/low | Maestro oracle only after DG-04 |
| Local PNG observation | REP-019 | Reject | No Repository code change |

### Files to inspect

実装開始時に最新mainへrebaseし、最低限以下を再確認する。

#### Product / Native

- `src/bootstrap/native-runtime.ts`
- `src/application/use-cases/catalog-use-cases.ts`
- `src/application/customer-capabilities.ts`
- `src/infrastructure/database/sqlite/native-customer-repositories.ts`
- `src/presentation/native/native-screens.tsx`
- `src/presentation/native/native-shell.tsx`
- `src/presentation/native/native-purchase-screens.tsx`
- `src/presentation/pages/checkout-order-pages.tsx`
- `src/application/use-cases/checkout-order-use-cases.ts`

#### Web / persistence

- `src/presentation/components/search-combobox.tsx`
- `src/infrastructure/database/dexie/cart-checkout-repositories.ts`
- `src/application/use-cases/cart-use-cases.ts`

#### Test / Specification

- `tests/component/checkout-order-pages.test.tsx`
- `tests/component/native/**`
- `tests/repository-contract/**`
- `tests/contracts/**`
- `e2e/web/ui-ux-improvements.spec.ts`
- `e2e/web/cross-role-lifecycle.spec.ts`
- `docs/spec/features/checkout-and-payment.md`
- `docs/spec/features/storefront.md`
- `docs/spec/features/authentication.md`
- `docs/spec/roles-and-permissions.md`
- `src/seeds/scenarios.ts`
- `scripts/spec/visual-registry.ts`

#### Tooling / CI / Training

- `scripts/validate-native-production-bundle.ts`
- `.github/workflows/native-ci.yml`
- `scripts/agentic-qa/prepare-challenge.ts`
- `training/agentic-qa/instructor/challenge-patches/*.patch`
- `.gitattributes`
- `tests/runtime/agentic-qa-preparation.test.ts`
- `vitest.config.ts`
- `scripts/generate-image-manifest.ts`
- `scripts/validate-image-manifest.ts`
- `package.json`
- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/workflow-contract.ts`
- `CONTRIBUTING.md`

#### Documentation / Curriculum

- `docs/05_ui/design_system.md`
- `docs/spec/ui-ux-contract.md`
- `docs/08_testing/e2e_design.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/plans/2026-08-20_132500_chromium-required-ci-cross-browser-split.md`

## 5. 変更方針

### Change strategy

原則は**1 Root Cause = 1 PR**。同一境界・同一原因・同一validationであることを説明できる場合だけまとめる。

実行順は、重大度だけでなく「後続変更の前提を壊しているか」を優先する。

```text
P0 Product correctness
  ↓
Native session / route boundary
  ↓
Native Storefront contract
  ↓
Web behavior / persistence
  ↓
QA oracle / Specification
  ↓
Tooling / CI reliability
  ↓
Training / policy
  ↓
Documentation / Curriculum sync
  ↓
Final cross-layer regression
```

### 推奨PR slice

| Slice | Suggested branch | Findings | Dependency |
|---|---|---|---|
| R1 | `fix/checkout-result-state-integrity` | REP-002 | none |
| R2 | `fix/native-customer-session-boundaries` | REP-001, REP-006 | R1 independent |
| R3 | `feat/native-storefront-contract-parity` | MNT-001, REP-003 | R2 + DG-01 |
| R4 | `fix/web-search-suggestion-open-state` | REP-004 | none |
| R5 | `fix/cart-item-ownership-invariant` | REP-005 | keep minimal due Phase 3 plan |
| R6 | `fix/auth-visual-state-contract` | REP-007 | none |
| R7 | `test/cross-role-shipment-oracle` | REP-012 | none |
| R8 | `fix/native-production-bundle-guard` | MNT-003 | none |
| R9 | `fix/agentic-qa-patch-portability` | MNT-002, REP-018 | none |
| R10 | `test/windows-contract-timeout-budget` | REP-011 | after isolated measurement |
| R11 | `fix/web-export-artifact-validation` | MNT-004 | avoid unconditional cache clear first |
| R12 | `fix/generated-image-manifest-drift` | REP-015 | none |
| R13 | `fix/training-workflow-action-pinning` | REP-016 | may touch same Training files as DG-02; serialize |
| R14 | `docs/current-qa-contract-alignment` | REP-008, REP-009/014, REP-010 | after Cross Browser CI split implementation |
| D1 | decision only | REP-013 | DG-02 |
| D2 | decision/settings or code | REP-017 | DG-03 |
| D3 | decision/test only | MNT-005 | DG-04 |

### 実行タスク

#### Wave 0 — Rebaseline / conflict check

- [ ] 1. 実装開始時の最新`main`へrebaseし、PR #35 ReportとCurrent sourceの差分を再確認する。
- [ ] 2. `qa-training-store-ci-chromium-required-cross-browser-split`およびPhase 3関連作業との変更ファイル重複を確認する。
- [ ] 3. 各Findingを`open / already-fixed / changed-by-other-work / decision-required`へ再分類する。
- [ ] 4. Active implementation runをRepository契約どおり初期化し、slice単位でTASKS/REPORTを更新する。

#### Wave 1 — R1 Checkout result state integrity（最優先）

- [ ] 5. Web/Nativeで利用できるOrder detail DTOの`orderStatus`、ownership、action versionを確認する。
- [ ] 6. URL route kindをExpected stateとして信用せず、取得したOrder stateとの整合を判定する共通方針を決める。
- [ ] 7. Web Complete/Failedで、missing order / opposite state / unauthorized orderをsafe stateへ落とす。
- [ ] 8. Failed画面のRetryは`payment_failed`等のretry可能stateだけで表示・実行可能にする。
- [ ] 9. Native CompleteもOrder lookupを必須にし、missing `orderId`でsuccess表示しない。
- [ ] 10. Native FailedもOrder stateを確認してからfailure/retry UIを出す。
- [ ] 11. Web/Native component testへpaid→failed URL、failed→complete URL、missing ID、ownership negativeを追加する。
- [ ] 12. Formal E2E/Native flowは正常checkout pathを維持し、direct result boundaryのfocused regressionを追加する。

実装原則:
- 新しいPayment state machineは作らない。
- Existing `getMyOrder` / current DTOを使う。
- Retry idempotency contractを弱めない。

#### Wave 2 — R2 Native Customer session / authorization boundary

- [ ] 13. Catalog actorをCurrent Sessionから解決できる既存Identity abstractionへ接続する。Webのactor resolutionを参考にするがNative-specific storage boundaryを壊さない。
- [ ] 14. Guest / Customer / unsupported roleのCatalog viewer mappingをcontract testで固定する。
- [ ] 15. Native ShellにCustomer-only route classificationを追加するか、既存route metadataから共通判定できる最小構造を採用する。
- [ ] 16. Guest direct Customer routeはLoginへ、unsupported roleは既存Native対象外boundaryへ送る。
- [ ] 17. Profile / Addresses / Orders / Checkoutの主要deep link negative casesを追加する。
- [ ] 18. Gold/Platinum Customerのrank visibility / membership priceをNative repository/component/runtimeで検証する。

実装原則:
- 各Screenで個別に`auth.required`をcatchしてredirectしない。
- Native Admin supportを増やさない。

#### Wave 3 — R3 Native Storefront contract parity

- [ ] 19. DG-01を再確認する。Current Specが変わっていなければ共通Storefront contractを採用する。
- [ ] 20. Missing capabilityをSuggestion、Brand、Price range、Pagination、Facet countへ分解する。
- [ ] 21. `CustomerCatalogGateway` / Native service surfaceへSuggestion等、Current Specで必要なcapabilityを追加する。
- [ ] 22. Catalog/Search screenでcurrent request fieldsを固定empty/nullにせずUI stateから渡す。
- [ ] 23. Page/total/facetのUIをNativeの既存Design Systemで最小実装する。
- [ ] 24. Native Component / Contract / Maestroへ各capabilityの代表Regressionを追加する。
- [ ] 25. Web/Native共通Business semanticsは共有Application layerで保証し、UI pixel parityは要求しない。

注意:
- このWaveはR2より大きいため、SuggestionとFilter/Paginationを2PRへ分割してもよい。
- Current Specを縮小するOwner Decisionが入った場合は実装を止め、Spec/Known Deviation更新を別Planとして扱う。

#### Wave 4 — R4 / R5 Web behavior and persistence

- [ ] 26. Search ComboBoxでasync items到着後のopen-stateをReact Aria contractに沿って制御し、typingだけでpointer/touch/keyboardユーザーが候補を認識できるようにする。
- [ ] 27. 2文字未満、0 suggestions、stale request、Enter search、Arrow navigationの現行挙動を維持する。
- [ ] 28. Component testはArrowDownを前提にせず、通常typing後のpopup stateをassertする。
- [ ] 29. Dexie Cart update/deleteで`currentItem.cartId === currentCart.id`をmutation前に検証する。
- [ ] 30. 2 Cartを使ったforeign item negative repository contractを追加し、Native/Web error semanticsを必要な範囲で揃える。
- [ ] 31. Phase 3 Backend計画へ先回りしてRepository abstractionを再設計しない。

#### Wave 5 — R6 / R7 QA oracle and Specification

- [ ] 32. Authentication `validation-error` visual referenceが実際にrequired-field validationを表すことを正本化する。
- [ ] 33. `storage-write-failure`を別Important Stateとして保証する必要があるか、既存BR/AC/Application error contractを確認する。
- [ ] 34. 必要ならstorage failure用scenario/capture/assertionを追加し、不要なら誤ったscenario mappingを解消する。
- [ ] 35. Visual asset rename/regenerationが必要な場合、Screen Catalog/Visual Specificationの既存promotion contractに従う。
- [ ] 36. Flow Jの初期shipment stateを明示assertし、`button existsなら実行、無ければskip`を廃止する。
- [ ] 37. `not_started`ならtransitionを実行して結果assert、既に許可済みstateならそのstateを明示assertする。想定外stateはFAILする。
- [ ] 38. MNT-005はDG-04の結論が出た場合のみ、review body literal/reload assertionを別sliceで追加する。

#### Wave 6 — Tooling / CI reliability

##### R8 Native Production Bundle Guard

- [ ] 39. Automation/Production boundaryで本当に保証したいContractを、`marker raw bytes`ではなく`module resolution + runtime unavailability`として再定義する。
- [ ] 40. Hermes `.hbc`をUTF-8 substring scanする現在方式を除去または補助Evidenceへ降格する。
- [ ] 41. Existing static module-resolution contractとProduction Runtime/Test Control unavailable checkでfail-closeできる最小構造を選ぶ。
- [ ] 42. CIとlocal guardで同じContractを検証し、Automation正常bundleをfalse negativeにしない。
- [ ] 43. ProductionへTest Control/Harnessが漏れた場合に確実にFAILするnegative fixture/contractを維持する。

##### R9 Agentic QA patch portability

- [ ] 44. patch artifactのLF contractを明示し、Git attributes / generation / validationのどこで保証するか1箇所に決める。
- [ ] 45. full preparation/buildより前に`git apply --check`相当のfast preflightを実行する。
- [ ] 46. strictnessを保ったままWindows/Linuxで同じsemantic patchが適用可能になるようnormalization boundaryを実装する。
- [ ] 47. `--ignore-whitespace`を無条件採用してmalformed patchを通す修正はしない。
- [ ] 48. Windows line-ending caseとLinux LF caseをdeterministic testで固定する。

##### R10 Contract timeout budget

- [ ] 49. Hook subprocess case / Android visual batch caseを個別に測定し、安定p95とfixture costを取得する。
- [ ] 50. fixture costを下げられる場合は先に削減する。
- [ ] 51. 必要なcaseだけper-test timeoutを設定し、Vitest global timeoutを無意味に引き上げない。
- [ ] 52. timeout時も「assertion failure」と「budget timeout」が判別できるdiagnosticを維持する。

##### R11 Web export artifact validation

- [ ] 53. Build outputへminimum route/runtime presence checkを追加し、route-less artifactをBuild successとして後段へ渡さない。
- [ ] 54. `--clear`を常時強制する前に、deterministic validationで異常artifactをfail-fastできるかを優先する。
- [ ] 55. clean/warm cache controlをfocused test/scriptで確認する。

##### R12 Generated image manifest drift

- [ ] 56. Generator outputをmemory/tempへ生成し、committed TS/JSONと比較するread-only checkを追加する。
- [ ] 57. `generate`（意図的更新）と`check`（CI検証）を分離する。
- [ ] 58. `build:web`がtracked filesを暗黙上書きしてdrift Evidenceを消さない構成にする。
- [ ] 59. Config / JSON / TypeScriptの3者が同じsourceから決定的に一致するContract testを追加する。

#### Wave 7 — Training / Security policy

##### R13 Training action pinning

- [ ] 60. Training templatesのremote action tagsを、Current approved production workflowと同じfull SHA policyへ合わせる。
- [ ] 61. Human readabilityはSHA横のversion commentで維持する。
- [ ] 62. `APPROVED_TRAINING_ACTIONS`をexact full SHA allowlistへ更新する。
- [ ] 63. Training Copy validationがmutable `@v4`等を拒否するnegative contractを追加する。

##### D1 REP-013

- [ ] 64. raw expected-failure workflowと`check-expected-failure` wrapperの責務をDG-02で確定する。
- [ ] 65. Intentional red CI exerciseならmachine contractを維持し、Curriculumへ役割差を明記する。
- [ ] 66. Evidence Contractをgreenで保証することが正本ならWorkflowをwrapperまたはequivalent fail-closed checkへ変更する。
- [ ] 67. Owner Decision前に`if-no-files-found: warn`だけを単独で変更して意味を混ぜない。

#### Wave 8 — D2 Native main assurance

- [ ] 68. GitHub Ruleset / Branch Protectionの実設定を確認する。
- [ ] 69. Direct main push禁止 + Native PR check requiredが保証されているならRepository docsへ契約を明記し、push Native CIを追加しない。
- [ ] 70. Direct pushが許可される運用なら、Ruleset強化を第一候補にし、必要な場合のみNative CI `push: main`を追加する。
- [ ] 71. 高コストNative CIの二重実行を避けるため、PR Gateとpost-merge Gateの目的を分離する。

#### Wave 9 — Documentation / Curriculum alignment

- [ ] 72. Cross Browser CI splitの実装状態を確認し、古いCI構造を先に文書化しない。
- [ ] 73. `docs/05_ui/design_system.md`をCurrent executable tokens / breakpoint / image ratioへ同期する。Code側を古いDocument値へ戻さない。
- [ ] 74. `docs/08_testing/e2e_design.md`をCurrent/Supersededのどちらか明確に分類する。Currentとして残す場合は最新suite/triggerへ更新する。
- [ ] 75. REP-009 / REP-014は1 Root Causeとして一度だけ直す。
- [ ] 76. CurriculumのiOS gate説明をCurrent reusable Build-only Required Gateへ同期し、Runtime/Maestro保証へ拡大しない。
- [ ] 77. DG-02の結論がCurriculumへ影響する場合、Expected Failure lessonも同じPRで同期する。
- [ ] 78. `docs/PROJECT_CONTEXT.md`のliving contractを更新し、Repository ruleに従ってhistory / ADRが必要な変更だけ記録する。

#### Wave 10 — Final cross-layer verification

- [ ] 79. Finding→Fix→Regression test mappingをRoot Cause単位で確認する。
- [ ] 80. Web Product fixesはPlaywright focused runtimeで再現不能になったことを確認する。
- [ ] 81. Android Native Product fixesはCurrent canonical Native pathでComponent/Contract/Maestroを確認する。
- [ ] 82. Tooling fixesはWindows/Linux差、Hermes/JS差、clean/warm cache差を対象のcontrolとして確認する。
- [ ] 83. `pnpm run verify`と該当Native CI / Phase 1 CIを実行し、未実行をPASS扱いしない。
- [ ] 84. PR #35のHistorical Reportは変更せず、各PR本文/Run Artifactへ対応Finding IDとvalidation evidenceを残す。

## 6. 検証方法

### Validation plan

#### Global baseline

各sliceで変更範囲に応じて以下を使用する。

```text
pnpm run format:check
pnpm run lint:markdown
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component:web
pnpm run test:component:native
pnpm run test:contracts
```

全コマンドを全sliceで機械的に毎回実行するのではなく、focused validation → Repository Required Validationの順に行う。PR完了時はRepository contract上のRequired Gateを省略しない。

#### R1 Checkout

- Web component:
  - paid order + `/failed`
  - payment_failed order + `/complete`
  - missing orderId
  - unauthorized/not-found
  - retry visible only in retryable state
- Native component:
  - Complete missing ID does not show success
  - opposite state does not show false result
  - Failed retry only for valid failed state
- Runtime:
  - normal success
  - payment failure → retry → complete
  - direct result URL/deep link boundary

#### R2/R3 Native

- Native component/service contract
- repository contract
- route dependency check
- Runtime/Boundary Suite
- Maestro representative flows
- Gold/Platinum rank visibility/price
- direct Guest Customer route
- Search filter/pagination representative state

#### R4/R5 Web

- Search ComboBox component normal typing / no-result / stale async request
- Chromium focused E2E for pointer/keyboard
- Dexie 2-cart foreign-item repository test

#### R6/R7 Oracle

- `validate:spec`
- `validate:spec-visuals:final` when visual registry/assets change
- focused UI Review capture
- Flow J focused E2E ensuring no silent branch

#### R8 Native bundle guard

- automation resolution positive
- production resolution negative
- Hermes current output
- production Runtime/Test Control unavailable path
- contract negative fixture

#### R9 Agentic QA

- `pnpm run test:agentic-qa:preparation`
- strict apply preflight
- Windows EOL fixture/control
- Linux CI control
- full preparation only after fast preflight passes

#### R10 Timeout

- isolated affected tests multiple bounded runs
- no retry-based green
- current Ubuntu CI still green

#### R11 Web artifact

- stale/warm cache reproduction fixture or controlled condition
- route presence validation fails bad artifact
- normal automation/production artifact passes
- production smoke remains green

#### R12 Generated manifest

- deliberate temp drift negative test
- committed generated TS/JSON positive check
- build does not silently change tracked source

#### R13 Training security

- training workflow contract
- mutable tag negative test
- Training Web baseline
- Native Training baseline when applicable

#### Docs/Curriculum

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run validate:spec` where linked contracts change
- path/command/workflow references are current after dependent CI work

### 成功判定

- P0/P1 Findingの再現手順が修正後に失敗し、対応Regression TestがPASSする。
- Test/Tooling Findingは「テストを弱める」「retryで隠す」「global timeoutを上げる」ことなく解消する。
- Decision Gate項目はEvidenceとOwner Decisionが明示されるまで実装しない。
- No-op / Reject itemを変更しない。
- Current Required CIがGreen。
- Native変更時はNative CIの実Jobを実行し、docs-only skipをNative validationの代替にしない。

## 7. リスクと未解決論点

### Risks

1. **Native Storefront scope creep**
   - Current common specを機械的に全UIへコピーすると大きくなり得る。
   - 対策: Business capability parityとpixel/UI parityを分離し、DG-01でsemantic contractだけを確定する。
2. **Checkout修正の過剰抽象化**
   - Result resolver用の新frameworkを作ると単純なstate validationより複雑になる。
   - 対策: existing Order DTO + small pure helperを優先する。
3. **Native auth guard重複**
   - 各Screenでredirectすると将来driftする。
   - 対策: Shell/route boundaryへ集約する。
4. **Hermes guard弱体化**
   - raw scanを削るだけではProduction leak検出が弱くなる。
   - 対策: static resolution contractとruntime unavailable verificationの二層を保つ。
5. **Patch strictness低下**
   - `--ignore-whitespace`だけで直すとmalformed patchを通す可能性がある。
   - 対策: LF normalization/provenanceを先に直し、strict applyを維持する。
6. **Flakeをtimeout増加で隠す**
   - REP-011/MNT-004を雑にtimeout/cache clearで回避するとroot causeが残る。
   - 対策: fail-fast validationと対象cost削減を優先する。
7. **Concurrent CI workとの競合**
   - Cross Browser CI splitが`.github/workflows/ci.yml`やdocs/testsを更新する。
   - 対策: CI/E2E documentation sliceはその実装後にrebaseして実施する。
8. **Phase 3 Backendとの二重投資**
   - Web Dexie層を大幅再設計すると将来Backend移行で捨てる可能性がある。
   - 対策: REP-005はownership predicate + contract testの最小修正に限定する。
9. **Historical audit reportの可読性悪化**
   - closureのたびにReportへ追記すると監査Evidenceが実装ログ化する。
   - 対策: ReportはHistoricalとして固定し、closureはPR/Run Artifactへ残す。

### Open questions

- DG-01〜DG-04のみ。各Decision Gateは独立sliceを止めるが、他sliceを止めない。

## 8. 成果物

### 今回のPlan branch

- Branch: `plan/repository-audit-remediation`
- Plan: `docs/plans/2026-08-21_002300_repository_audit_remediation.md`

### 実装時の主な成果物

- Root CauseごとのProduct/Test/Tooling/Docs変更。
- 既存Test Layerに沿ったRegression test。
- 必要な場合のみ`docs/PROJECT_CONTEXT.md` / history / ADR更新。
- Repository契約に従った`.codex/runs/<run_id>/`。

### 変更しない成果物

- PR #35の2つのAudit ReportはHistorical Evidenceとして原則変更しない。
- REP-019のlocal PNGはRepository taskとして変更しない。

## 9. 実装優先順位まとめ

### Must Fix first

1. REP-002 — Checkout result state integrity
2. REP-001 — Native Customer session-aware rank/catalog semantics
3. REP-006 — Native Customer route authorization boundary
4. MNT-003 — Native Production Bundle Guard false negative
5. MNT-002 / REP-018 — Windows Agentic QA patch portability
6. REP-012 — Cross-role Flow J false-green
7. REP-004 — Web Search Suggestion discoverability

### Fix after boundary confirmation / next priority

8. MNT-001 / REP-003 — Native Storefront parity（DG-01）
9. REP-005 — Web Cart ownership invariant
10. REP-007 — Authentication visual/spec oracle
11. REP-011 — Windows contract timeout budget
12. MNT-004 — Web export artifact validation
13. REP-015 — Generated manifest drift guard
14. REP-016 — Training remote action pinning

### Documentation / Curriculum after implementation dependencies settle

15. REP-008 — Design System drift
16. REP-009 / REP-014 — E2E design current/historical drift（1 Root Cause）
17. REP-010 — iOS curriculum gate drift

### Decision only before any code change

18. REP-013 — Training expected-failure responsibility
19. REP-017 — Native main push assurance / GitHub settings
20. MNT-005 — Native Review oracle scope

### Reject / no Repository implementation

- REP-019 — pre-existing user-owned local PNG observation
- Reconciled Integration timeout
- Native Search default IME input conversion itself
- favicon 404 from temporary server
- manual image helper orphan candidate

## 10. 実装時の停止条件

- P0/P1の1件を直しただけで全計画完了とはしない。
- ただし全Root Causeを1つの巨大PRへ入れない。
- 各sliceはfocused validationとRequired Gateを通したら独立してmerge可能とする。
- Decision GateでOwner判断が必要になった場合、そのsliceだけ`BLOCKED`にし、独立sliceを進める。
- 新しいMaterial Findingが出た場合、既存Root Causeのaffected areaか新Root Causeかを判定してからscopeへ追加する。
- ついでのrefactor、dependency update、UI redesignは追加しない。
