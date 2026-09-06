# Refactoring Necessity Review

## Baseline / scope

- Repository: ryu-yoshikawa-pro-vision/qa-training-store
- PR: #128
- Branch: docs/phase6-refactoring-necessity-review
- Investigation baseline SHA: 856a14eb448a6ad6bf9722f623cf0d094b7a7d2a
- Audit baseline SHA: 4ed5374dcd5e98bf96c05f0fdecef56b42064a0c
- Execution Plan: docs/plans/2026-09-06_140451_phase6_refactoring_necessity_review.md
- Master Plan: docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md
- Initial Evidence inventory: docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md

本レビューはPhase 6のdecision-only成果物である。16 candidateをCurrent Repository Evidenceで分類したが、refactor_nowを含めてProduct code、formal test behavior、training behavior、workflow behavior、dependency、Normative Specification、Curriculumの実装変更は行わない。

## Method / bounded evidence rule

各candidateを順番に、Evidence Card、candidate-targeted history、consumer / dependency / reference、protection、transaction / state / platform boundary、Pass 1 classificationの順で確認した。HistoryはinceptionからCurrentまでの候補pathに限定し、material change、反復repair、change reason、candidateに帰属できるfailureを確認した。単純commit数、file size、完全call graph、Repository全体の全面再Auditは使用していない。

Pass 1でEvidenceが足りなかったのは§4.16だけである。Pass 2ではarchitecture directionの不足論点だけを確認し、全16 candidateをPass 2へ送っていない。§4.13 / §4.15のplatform duplicationは、意図的なplatform ownershipとshared contract protectionを確認した上で、見た目の類似だけではRefactor化しなかった。同じEvidenceは候補間で再利用した。

## Executive summary

- 16/16 candidateにclassificationを付与した。
- refactor_nowは§4.9 Native CI workflowと§4.10 Global Web CSSの2件。対象boundaryだけを後続Plan / 別PRへ送る。
- refactor_when_touchedは§4.1〜§4.7、§4.11、§4.12の9件。各sectionに再評価triggerを記録した。
- keep_as_isは§4.8、§4.13〜§4.15の4件。size、fan-in、platform duplicationだけではRefactor理由にならないことをEvidenceで確認した。
- needs_more_evidenceは§4.16の1件。不足Evidence、取得条件、再判断triggerを記録した。

## Classification summary

| Classification | Candidates | Count |
| --- | --- | ---: |
| refactor_now | §4.9、§4.10 | 2 |
| refactor_when_touched | §4.1〜§4.7、§4.11、§4.12 | 9 |
| keep_as_is | §4.8、§4.13〜§4.15 | 4 |
| needs_more_evidence | §4.16 | 1 |
| Total | §4.1〜§4.16 | 16 |

## Candidate matrix

| Candidate | Current path | Classification | One-line rationale |
| --- | --- | --- | --- |
| §4.1 | src/infrastructure/database/sqlite/native-customer-application-repositories.ts | refactor_when_touched | Native customer repository / transaction boundaryは保護されているが、次の同boundary変更時に集中責務を再評価する。 |
| §4.2 | src/infrastructure/database/sqlite/native-customer-repositories.ts | refactor_when_touched | Native catalog / guest cart compatibility surfaceは保護されているが、次のcatalogまたはcart変更時に再評価する。 |
| §4.3 | src/presentation/native/native-purchase-screens.tsx | refactor_when_touched | Native purchase capability内のstateful screen集中に保守コストはあるが、現時点の分割利益は明確でない。 |
| §4.4 | src/presentation/native/native-screens.tsx | refactor_when_touched | Native storefrontのasync / filter / cart UI集中は次のcapability変更時に再評価する。 |
| §4.5 | src/presentation/pages/admin-product-pages.tsx | refactor_when_touched | Admin Product UI surfaceはcohesiveだが、次のeditor workflow変更時に再評価する。 |
| §4.6 | src/application/use-cases/checkout-order-use-cases.ts | refactor_when_touched | customer purchase lifecycleとtransaction boundaryは意図的だが、state追加またはrepair再発時に再評価する。 |
| §4.7 | src/application/use-cases/review-user-use-cases.ts | refactor_when_touched | role / capabilityの集中に保守コストはあるが、transaction scopeとconsumerは明確である。 |
| §4.8 | src/application/use-cases/admin-product-use-cases.ts | keep_as_is | Admin Product aggregate capabilityとtransaction ownershipが一致し、別責務混在のEvidenceがない。 |
| §4.9 | .github/workflows/native-ci.yml | refactor_now | build / runtime / artifact / visual / training / final gateの反復repairとblast radiusがCurrentに具体化している。 |
| §4.10 | src/presentation/styles/global.css | refactor_now | global cascade / breakpoint ownershipへの短期反復repairと全Web fan-outがCurrent riskを形成している。 |
| §4.11 | src/seeds/default-dataset.ts、src/seeds/scenarios.ts、src/seeds/metadata.ts | refactor_when_touched | 高fan-in SSOTだが、load / reset / validationのcohesiveなdata boundaryとして保護されている。 |
| §4.12 | scripts/agentic-qa/** | refactor_when_touched | deterministic harnessのcontract連鎖に保守コストはあるが、ADRとcontract protectionに整合する。 |
| §4.13 | scripts/native/android-maestro-run.sh、scripts/training/** | keep_as_is | Formal LinuxとTraining Windows physical-deviceはexecution platform / artifact boundaryが異なる。 |
| §4.14 | e2e/web/fixtures.ts | keep_as_is | Web E2Eのreset / identity / artifact lifecycleを小規模に一貫して担っている。 |
| §4.15 | src/infrastructure/database/dexie/**、src/infrastructure/database/sqlite/** | keep_as_is | Web IndexedDBとNative SQLiteの意図的platform duplicationで、shared contractがparityを保護する。 |
| §4.16 | src/domain/repositories/contracts.ts、src/domain/policies/permissions.ts | needs_more_evidence | type-only dependencyの許容方向とcanonical ownerを定めるnormative architecture evidenceが不足している。 |

## 4.1 Native customer application repositories

- Candidate: §4.1 Native customer application repositories
- Current path(s): src/infrastructure/database/sqlite/native-customer-application-repositories.ts（2,643 lines / 98,414 bytes）
- Current responsibility: User、Session、Address、Product、Review Summary、Inventory、Cart、Checkout、Order、Sequence、Payment、Shipment、Reviewの13 repository、SQLite row mapping、NativeRepositoryContext、unsupported Admin placeholder、transaction scope / runner / factoryを担当する。
- Current public / composition surface: NativeCustomerApplicationRepositories、NativeCustomerTransactionRunner、createNativeCustomerApplicationRepositories。主要composition rootはsrc/bootstrap/native-runtime.tsとsrc/test-controls/native-contract-harness-runner.native.ts。
- Current consumers / dependencies / references: Native bootstrap、Native contract harness、Application repository / transaction contracts、Native SQLite schema / mapper。
- Protecting tests / workflows: tests/contracts/native-customer-application-repositories.test.ts、tests/repository-contract/native-customer-shared.test.ts、tests/contracts/native-sqlite-transactions.test.ts、shared application / domain repository contract、.github/workflows/native-ci.yml。
- Transaction / state / platform boundary: Native SQLite customer application repository boundary。NativeRepositoryContext.writeと10 transaction scopesがmulti-repository write / rollbackを所有する。Web Dexie implementationは§4.15の別platform boundaryである。
- Audit baselineからのmaterial change: Audit時点からCurrentまでの責務境界変更は確認されない。investigation baselineからbranch HEADへのcandidate path diffもない。
- Recent churn / material change frequency / repair / failure summary: dfee64cでPhase 2 Native customer repositoryとtransaction surfaceを導入し、778b6f6でcart ID / checkout transaction等を同boundary内でrepairした。反復repairやCurrent candidate起因failureは確認されなかった。単純なline countは判定理由にしていない。
- Evidence references: dfee64c、778b6f6、src/bootstrap/native-runtime.ts、src/test-controls/native-contract-harness-runner.native.ts、tests/contracts/native-customer-application-repositories.test.ts、tests/contracts/native-sqlite-transactions.test.ts。
- Classification: refactor_when_touched
- Why now / why not now: 13 repository、row mapping、transaction context / runnerの集中は関連変更時のmaintainability costになる。しかし公開面は2 composition rootに限定され、transaction protectionがあり、今すぐ分割するbenefitが延期より明確に大きいCurrent riskはない。
- Follow-up trigger or missing evidence: 同ファイルの複数repository、mapper、transaction scopeを次に変更する時、または同boundaryのrepairが反復した時に再評価する。

## 4.2 Native customer catalog / compatibility repository

- Candidate: §4.2 Native customer catalog / compatibility repository
- Current path(s): src/infrastructure/database/sqlite/native-customer-repositories.ts（1,041 lines / 38,185 bytes）
- Current responsibility: catalog home / search / suggest / detail / category、viewer / price mapping、Guest Cart compatibility API、cart mutationを担当する。
- Current public / composition surface: NativeCustomerSQLiteRepositoryのgetHome、search、suggest、getProductDetail、getCategoryName、getCart、addItem、updateQuantity、removeItem。src/application/native/guest-storefront.tsのNative customer catalog / cart gatewayから利用される。
- Current consumers / dependencies / references: src/bootstrap/native-runtime.ts、src/test-controls/native-contract-harness-runner.native.ts、src/application/native/guest-storefront.ts、Native SQLite schema / mapper、shared customer repository contract。
- Protecting tests / workflows: tests/repository-contract/native-customer-shared.test.ts、tests/contracts/native-sqlite-transactions.test.ts、shared customer repository suite、Native contract harness、.github/workflows/native-ci.yml。
- Transaction / state / platform boundary: Native SQLite catalog read and Guest Cart compatibility boundary。cart mutationはrunNativeExclusiveTransactionを使用し、catalog / viewer semanticsはshared repository contractへ接続する。
- Audit baselineからのmaterial change: Audit baselineからCurrentでは4caaed9のNative catalog / route authorization alignmentが主なmaterial change。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 7f7e48eでfoundation、dcc8983 / ebf7c45でNative runtime / CI surface、4caaed9（#42）でcatalog / viewer / route authorizationを大きく変更した。Currentのcandidate起因failureや同boundaryの反復repairは確認されなかった。
- Evidence references: 7f7e48e、dcc8983、ebf7c45、4caaed9、src/application/native/guest-storefront.ts、tests/repository-contract/native-customer-shared.test.ts、tests/contracts/native-sqlite-transactions.test.ts。
- Classification: refactor_when_touched
- Why now / why not now: catalog queryとGuest Cart compatibilityの集中にはmaintainability costがあるが、consumerはNative bootstrap / harness中心で、transaction / contract protectionがある。現在の分割benefitが延期より明確ではない。
- Follow-up trigger or missing evidence: catalog filtering / viewer rule、cart compatibility boundaryの次回変更、または同boundaryのrepair反復時に再評価する。

## 4.3 Native purchase screens

- Candidate: §4.3 Native purchase screens
- Current path(s): src/presentation/native/native-purchase-screens.tsx（1,434 lines / 53,924 bytes）
- Current responsibility: Login、Signup、Profile、Addresses、Checkout address / payment / confirm / processing / result / complete / failed、Orders、Order detail、Reviewの14 screenと、usePurchaseServices、useCheckoutSession、PurchaseTextInput等のshared presentation helperを担当する。
- Current public / composition surface: Native screen exports、src/presentation/native-route.native.tsx、app/*.native.tsx。Application service / checkout session hookへ委譲するNative presentation surfaceである。
- Current consumers / dependencies / references: Native route、Expo Router native entrypoints、Native runtime service surface、Application checkout / order / review use cases。
- Protecting tests / workflows: tests/component/native/native-purchase-screens.test.tsx、tests/contracts/native-runtime-service-surface.test.ts、tests/contracts/expo-router-public-imports.test.ts、Native Maestro purchase / review flows、.github/workflows/native-ci.yml。
- Transaction / state / platform boundary: Native purchase presentation、screen state、navigation boundary。Transaction ownershipはN/A — SQLite transactionは§4.1 / §4.2のadapterとApplication serviceが所有する。
- Audit baselineからのmaterial change: 3022a74（#84）のinput-limit contract整合が21-lineのmaterial surface change。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: dfee64cで初期Native purchase surface、778b6f6、8381a80、96069dc、f909ea4（#43 checkout invariant / result repair）、3022a74で関連変更があった。Currentのscreen起因未解決failureは確認されなかった。
- Evidence references: dfee64c、778b6f6、8381a80、96069dc、f909ea4、3022a74、src/presentation/native-route.native.tsx、tests/component/native/native-purchase-screens.test.tsx。
- Classification: refactor_when_touched
- Why now / why not now: 同一Native customer purchase capability内のstateful screen集中にはlocal reasoning costがある。一方、shared runtime service / checkout hook、route composition、component / contract / Maestro protectionがあり、今すぐ分割するbenefitは明確でない。
- Follow-up trigger or missing evidence: screen追加、checkout state / navigation boundary変更、または同じscreen群のrepair反復時に再評価する。

## 4.4 Native storefront screens

- Candidate: §4.4 Native storefront screens
- Current path(s): src/presentation/native/native-screens.tsx（1,205 lines / 45,018 bytes）
- Current responsibility: Home、Catalog、Search、Product Detail、Cart、Guide、Legal、Unsupportedと、product card、filter / result control、request serial、async UI stateを担当する。
- Current public / composition surface: Native screen exports、src/presentation/native-route.native.tsx、app/*.native.tsx。Web route / CSSは別platform compositionである。
- Current consumers / dependencies / references: Native route、Native bootstrap / customer gateways、Native component primitives、Native catalog / cart application services。
- Protecting tests / workflows: tests/component/native/native-catalog-screen.test.tsx、native-cart-screen.test.tsx、native-product-detail-screen.test.tsx、tests/contracts/native-visual-contract.test.ts、maestro/native-storefront.yaml、native-search.yaml、native-cart.yaml、.github/workflows/native-ci.yml / native-ios-ci.yml。
- Transaction / state / platform boundary: Native storefront presentation / async UI state。Transaction ownershipはN/A — Application service / SQLite adapterへ委譲する。
- Audit baselineからのmaterial change: 3022a74（#84）のsearch input limitが3-line material change。4caaed9（#42）のcatalog / route authorization変更はAudit時点の主要historyとして扱った。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 7f7e48e、dcc8983、ebf7c45、be27f8f、90c6d8b、a491f4f、dfee64c、96069dc、4caaed9、3022a74でcatalog / search / cart / authorization関連の変更がある。Current candidate起因failureはなく、component / visual / Native runtime protectionがある。
- Evidence references: 4caaed9、3022a74、src/presentation/native-route.native.tsx、tests/component/native/native-catalog-screen.test.tsx、tests/contracts/native-visual-contract.test.ts、maestro/native-search.yaml。
- Classification: refactor_when_touched
- Why now / why not now: catalog/search async state、filter、product/cart UIの連携にはmaintainability costがあるが、Native capability boundaryは意図的で、現時点の未解決failureや今すぐ分割するbenefitはない。
- Follow-up trigger or missing evidence: catalog / search / cart capability追加、async state boundary変更、または同一surfaceのrepair反復時に再評価する。

## 4.5 Admin product pages

- Candidate: §4.5 Admin product pages
- Current path(s): src/presentation/pages/admin-product-pages.tsx（1,215 lines / 44,862 bytes）
- Current responsibility: Admin product list、new / edit、ProductEditor、variant / image editing、preview、dirty-navigation guardを担当する。
- Current public / composition surface: app/admin/products/index.tsx、new.tsx、[productId].tsxから構成されるWeb Admin Product UI。Application adminProducts use caseへ委譲する。
- Current consumers / dependencies / references: Admin product route、ProductEditor内部 state、admin-product application service、Web router / navigation guard。
- Protecting tests / workflows: tests/component/admin-product-pages.test.tsx、tests/integration/admin-product-use-cases.test.ts、tests/repository-contract/repositories.test.ts、e2e/web/ui-review.spec.ts、Web CI。
- Transaction / state / platform boundary: Web Admin product presentation / form state boundary。TransactionはN/A — Application use case / Dexie adapterが所有する。
- Audit baselineからのmaterial change: 3022a74のinput-limit追加が10-line material change。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 8900637初期実装、61d52d3、2b15e6a、0466614、01acf2c、1512a3e、65f6979、201a67b、778b6f6、3022a74でform / UX / review / navigation関連変更がある。Current candidate起因failureは確認されなかった。
- Evidence references: 8900637、01acf2c、65f6979、1512a3e、3022a74、app/admin/products/index.tsx、tests/component/admin-product-pages.test.tsx、e2e/web/ui-review.spec.ts。
- Classification: refactor_when_touched
- Why now / why not now: list / create / edit / preview / guardの同一Product management surfaceには保守負荷があるが、ProductEditorはcohesiveで、component / integration / E2E protectionがある。現時点で分割benefitが延期より明確でない。
- Follow-up trigger or missing evidence: ProductEditor field、variant、preview、navigation guardの次回変更、または同surfaceのrepair反復時に再評価する。

## 4.6 Checkout / Order use case

- Candidate: §4.6 Checkout / Order use case
- Current path(s): src/application/use-cases/checkout-order-use-cases.ts（639 lines / 24,690 bytes）
- Current responsibility: checkout session start / get / set、begin order、payment success / failure / retry / resume、order list / detailを一つのcustomer purchase lifecycleとして担当する。
- Current public / composition surface: CheckoutOrderUseCases、src/application/create-application-services.ts、src/bootstrap/native-runtime.ts、src/presentation/pages/checkout-order-pages.tsx、Native purchase screens、contract harness。
- Current consumers / dependencies / references: Web checkout / order pages、Native purchase screens、Application transaction runner、cart / checkout / inventory / order / payment / product / sequence repositories。
- Protecting tests / workflows: tests/integration/checkout-order-use-cases.test.ts、tests/repository-contract/native-customer-shared.test.ts、tests/component/checkout-order-pages.test.tsx、tests/contracts/architecture.test.ts、Native contract harness、Web / Native CI。
- Transaction / state / platform boundary: Application checkout / payment / order state and transaction boundary。start-checkout、create-order、finalize-payment-success / failure、retry-paymentが複数repositoryをatomicに扱う。Dexie / SQLite implementationは§4.15のplatform adapterへ委譲する。
- Audit baselineからのmaterial change: f909ea4（#43）、3022a74（#84）、08510e3（#88）のcheckout / search / cart / contract repairがCurrentまでのmaterial changes。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 上記3回の同じpurchase contract / transaction boundaryへのrepairがあり、次回変更時の再評価価値は高い。しかしCurrentのcandidate起因未解決failureは確認されなかった。
- Evidence references: f909ea4、3022a74、08510e3、src/application/create-application-services.ts、tests/integration/checkout-order-use-cases.test.ts、tests/contracts/architecture.test.ts。
- Classification: refactor_when_touched
- Why now / why not now: purchase lifecycleの集中とmulti-repository transactionにはmaintainability costがあるが、transaction ownership自体が重要な保護境界である。現在の分割benefitが延期コストを明確に上回るEvidenceはない。
- Follow-up trigger or missing evidence: 新しいpayment / order stateまたはtransaction scopeの追加、CT-BOUNDARY-001相当のrepair再発時に再評価する。

## 4.7 Review / User use cases

- Candidate: §4.7 Review / User use cases
- Current path(s): src/application/use-cases/review-user-use-cases.ts（674 lines / 23,327 bytes）
- Current responsibility: CustomerReviewUseCases、AdminReviewUseCases、AdminUserUseCasesの3 classで、customer review eligibility / mutation、admin review visibility / bulk、admin user role / suspension / membershipを担当する。
- Current public / composition surface: Application service factory、Native runtime、src/presentation/pages/review-user-pages.tsx、Native purchase screens、Native contract harness。
- Current consumers / dependencies / references: Review / User pages、Native customer runtime、User / Review / Order / Product repositories、Application transaction runner。
- Protecting tests / workflows: tests/integration/review-user-use-cases.test.ts、tests/component/review-user-pages.test.tsx、tests/component/native/native-purchase-screens.test.tsx、tests/repository-contract/native-customer-shared.test.ts、e2e/web/phase1-required.spec.ts、cross-role-lifecycle.spec.ts、ui-review.spec.ts、Web / Native CI。
- Transaction / state / platform boundary: Application role / capability boundary。Customer review mutationはreview-change、admin user mutationはchange-user-accessでtransaction scopeが分かれる。Platform差はcomposition / adapterへ委譲する。
- Audit baselineからのmaterial change: 3022a74のinput-limit contract整合が17-line material change。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 8900637、7dea554、01acf2c、65f6979、72ed2aa、7f7e48e、3022a74にrole / review / UI contractの変更がある。Current candidate起因failureや同boundaryの反復repairは確認されなかった。
- Evidence references: 8900637、01acf2c、65f6979、72ed2aa、3022a74、tests/integration/review-user-use-cases.test.ts、e2e/web/cross-role-lifecycle.spec.ts。
- Classification: refactor_when_touched
- Why now / why not now: Customer Review、Admin Review、Admin Userの集中にはrole別のmaintainability costがあるが、transaction scopeとcomposition rootは明確で、今すぐ分割するbenefitは延期より大きくない。
- Follow-up trigger or missing evidence: 一つのrole / capabilityだけに新しいstate、policy、mutationを追加する時、またはrole boundaryのrepairが反復した時に再評価する。

## 4.8 Admin product use case

- Candidate: §4.8 Admin product use case
- Current path(s): src/application/use-cases/admin-product-use-cases.ts（649 lines / 23,295 bytes）
- Current responsibility: Admin Product aggregateのquery、create、update、preview、status、bulk、duplicateを担当する。
- Current public / composition surface: Application service factoryとsrc/presentation/pages/admin-product-pages.tsxから利用されるAdmin Product application capability。
- Current consumers / dependencies / references: Admin Product pages、Product / Inventory / Category / Brand / Review Summary repositories、transaction scopes update-product-aggregate、change-product-status、delete-draft-product。
- Protecting tests / workflows: tests/integration/admin-product-use-cases.test.ts、tests/component/admin-product-pages.test.tsx、tests/repository-contract/repositories.test.ts、Web E2E / CI。
- Transaction / state / platform boundary: Application Product aggregate / transaction boundary。Native AdminはunsupportedでNative boundaryへ拡張していない。
- Audit baselineからのmaterial change: 3022a74のinput-limit / normalization contract整合が66-line material change。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 8900637、7dea554、01acf2c、1512a3e、65f6979、7f7e48e、3022a74でproduct contractを変更したが、すべて同じaggregate boundary内である。candidate起因の未解決failureや別責務混在は確認されなかった。
- Evidence references: 8900637、7dea554、01acf2c、1512a3e、3022a74、tests/integration/admin-product-use-cases.test.ts、tests/component/admin-product-pages.test.tsx。
- Classification: keep_as_is
- Why now / why not now: Product aggregateのquery / mutation / preview / statusは同じownershipとtransaction boundaryにあり、refactor_nowの具体的riskはない。関連変更時に分割するmaintainability costも現時点で具体化されていないため、refactor_when_touchedにも該当しない。
- Follow-up trigger or missing evidence: N/A — 通常のProduct contract変更は既存の同一boundaryで扱う。別責務の混在、transaction ownership不一致、candidate起因failureが新たに観測された場合だけ再評価する。

## 4.9 Native CI workflow

- Candidate: §4.9 Native CI workflow
- Current path(s): .github/workflows/native-ci.yml（2,058 lines / 97,260 bytes）
- Current responsibility: trigger / detect、native static、Android automation / production build、bundle guard、Android runtime、Maestro artifact、visual capture、Training baseline、reusable iOS build-only、final fail-closed verifyを担当する。
- Current public / composition surface: detect、native-static、android-automation-build、android-production-build、production-bundle-guard、android-runtime、native-ios、verify jobs。native-ci / verifyが全job outcomeとno-change skipを集約する。
- Current consumers / dependencies / references: .github/workflows/native-ios-ci.yml、scripts/native/android-maestro-run.sh、Maestro flows、Training baseline、native CI contract tests、Native artifact / report consumers。
- Protecting tests / workflows: tests/contracts/native-ci-workflow.test.ts、tests/contracts/ci-workflow.test.ts、tests/contracts/native-test-control-maestro.test.ts、reusable iOS workflow、fail-closed final verify。
- Transaction / state / platform boundary: Native CI workflow orchestration、job dependency、artifact handoff、platform gate、final status boundary。Application transaction / Product stateはN/A。
- Audit baselineからのmaterial change: 9b3a396（#83）のGradle memory settingが2-line change。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 53ae9d7（436-line rework）、8381a80（490-line split）、bb064ac（visual batch）、41ad95b（locale / capture repair）、f3ba3e3（production artifact inspection）、9b3a396（Gradle memory fix）等で同一workflow boundaryへのmaterial repair / responsibility adjustmentが反復した。Android memory、Hermes artifact、locale / capture、build / runtime dependencyのfailure boundaryが同じ変更面へ戻っている。
- Evidence references: 53ae9d7、8381a80、bb064ac、41ad95b、f3ba3e3、9b3a396、.github/workflows/native-ci.yml、tests/contracts/native-ci-workflow.test.ts。
- Classification: refactor_now
- Why now / why not now: size単独ではなく、反復repair、複数platform gate、artifact / training / visual coupling、final fail-closed dependencyのoperational blast radiusがCurrent risk / costとして具体化している。今のworkflow boundaryを次のNative変更まで先送りするより、別Planで早期に再設計を検討するbenefitが明確である。ただし今回のPRでは実装しない。
- Follow-up trigger or missing evidence: 対象candidateは§4.9、対象boundaryはNative workflowのbuild / runtime / artifact / visual / training / final-gate orchestration。別Plan / 別PRでCurrent mainへ再mappingしてから実装を検討する。file split / API migration設計は本reviewの範囲外。

## 4.10 Global Web CSS

- Candidate: §4.10 Global Web CSS
- Current path(s): src/presentation/styles/global.css（4,489 lines / 88,146 bytes、Audit inventoryでは5,160 lines / 823 selector lines / 13 media blocks）
- Current responsibility: Web shell、Admin、Storefront、form / table、catalog / cart / checkout / order / review、responsive / accessibility stateを一つのglobal cascadeで担当する。
- Current public / composition surface: src/presentation/root-layout.web.tsx:3からWeb全体へimportされるglobal stylesheet。Native StyleSheet / tokensは別platform surfaceである。
- Current consumers / dependencies / references: src/presentation/**のWeb className、Admin / Storefront shell、各page / component、Web visual / E2E contract。
- Protecting tests / workflows: tests/contracts/architecture.test.ts、tests/contracts/visual-contract.test.ts、tests/contracts/native-visual-contract.test.ts、e2e/web/accessibility.spec.ts、mobile-boundary.spec.ts、phase1-required.spec.ts、ui-review.spec.ts、ui-ux-improvements.spec.ts、Web / Native visual CI。
- Transaction / state / platform boundary: Web CSS cascade / breakpoint / visual contract。Transaction / application stateはN/A。Native stylingは対象外の意図的platform boundaryである。
- Audit baselineからのmaterial change: 4487cc6（long text layout、114 lines）、a9fcb63（Admin overflow）、c4d6b0e（product loading layout、71 lines）、e8e2074（review link）、cb8a036（breadcrumb、26-line change）がAudit baseline以降のmaterial CSS change。
- Recent churn / material change frequency / repair / failure summary: 短期間にoverflow、loading layout、review link、breadcrumb、long textなどcascade / breakpoint / ownershipの異なるrepairが同じstylesheetへ反復した。単なるline countではなく、global fan-outとlocal ownership不明瞭さ、修正blast radiusがCurrent costとして観測されている。
- Evidence references: 4487cc6、a9fcb63、c4d6b0e、e8e2074、cb8a036、src/presentation/root-layout.web.tsx、tests/contracts/visual-contract.test.ts、e2e/web/mobile-boundary.spec.ts。
- Classification: refactor_now
- Why now / why not now: size単独ではなく、Audit baseline以降のmaterial repair pattern、global cascade / breakpoint ownership、全Web fan-outが具体的Current riskを示す。次のUI修正まで待つより、別Planでownership boundaryを早期に整理するbenefitが明確である。今回のPRではCSS refactorを実装しない。
- Follow-up trigger or missing evidence: 対象candidateは§4.10、対象boundaryはWeb global cascadeとStorefront / Admin / responsive ownership。別Plan / 別PRでCurrent mainへ再mappingしてから実装を検討する。CSS分割案は本reviewの範囲外。

## 4.11 Seed SSOT

- Candidate: §4.11 Seed SSOT
- Current path(s): src/seeds/default-dataset.ts（842 lines）、src/seeds/scenarios.ts（657）、src/seeds/metadata.ts（462）
- Current responsibility: base user / product / order / review / payment、scenario overlay、fixed clock、guest identity、payment delay、Guide metadata、schema / seed versionを担当する。
- Current public / composition surface: createDefaultDataset、createScenarioDataset、SCENARIO_METADATA、scenario type / list / guard。Web seed loader、SQLite seed、Test Control、Native contract harness、E2E fixtureから利用される。
- Current consumers / dependencies / references: src/seeds/load-seed.ts、src/infrastructure/database/sqlite/seed.ts、src/bootstrap/browser-runtime.web.ts、src/bootstrap/native-runtime.ts、src/test-controls/**、e2e/web/fixtures.ts、integration / repository tests。
- Protecting tests / workflows: tests/integration/seeds.test.ts、tests/repository-contract/customer-shared.test.ts、tests/repository-contract/native-customer-shared.test.ts、src/seeds/validation.ts、Native SQLite transaction contracts、Web / Native reset / harness。
- Transaction / state / platform boundary: Seed / scenario / reset metadata shared data boundary。Database transactionはN/A — loader / SQLite seedが各database transactionへ委譲し、SSOT自身は永続化transactionを所有しない。
- Audit baselineからのmaterial change: Audit baselineからCurrentのcandidate path material diffはない。dfee64c / 778b6f6のscenario / Native foundation変更とmetadata追加はinception〜Currentのtargeted historyとして確認した。investigation baselineからbranch HEADへのcandidate path diffもない。
- Recent churn / material change frequency / repair / failure summary: 8900637初期dataset、7dea554、01acf2c（metadata / scenario material change）、7f7e48e、dcc8983、dfee64c、778b6f6でscenario / Native supportが追加された。高fan-inではあるが、Current candidate起因failureや同SSOT boundaryのrepeated repairは確認されなかった。
- Evidence references: 8900637、01acf2c、7f7e48e、dcc8983、dfee64c、778b6f6、src/seeds/load-seed.ts、src/infrastructure/database/sqlite/seed.ts、tests/integration/seeds.test.ts。
- Classification: refactor_when_touched
- Why now / why not now: Web、Native、Formal、Training、Guideへ波及するため関連変更時の確認コストは具体的にある。一方、dataset生成、scenario overlay、metadata、validationの公開面は一貫したSSOT boundaryとして保護され、今すぐ分割するbenefitは延期より大きくない。
- Follow-up trigger or missing evidence: 次のscenario / version / clock / identity変更時、または同じSSOT boundaryでcross-platform repairが反復した時に再評価する。

## 4.12 Agentic QA Harness

- Candidate: §4.12 Agentic QA Harness
- Current path(s): scripts/agentic-qa/**（26 files / 9,375 lines / 347,839 bytes）
- Current responsibility: Zod contracts、challenge preparation、learner-safe bundle、isolation、resource boundary、runner input / output、trusted evidence、canonical artifact manifest、official verification、black-box evaluation / scoringを担当する。
- Current public / composition surface: contracts.ts、prepare-challenge.ts、official-verification.ts、evaluate.ts、runner-input.ts、runner-output-import.ts、isolation.ts等のdeterministic supporting harness API。
- Current consumers / dependencies / references: package.json:26,58、.github/workflows/ci.yml:358-360、training/agentic-qa assets、spec / artifact references、CI preparation job。
- Protecting tests / workflows: tests/contracts/spec-agentic-qa.test.ts、official-black-box-contracts.test.ts、official-artifact-chain.test.ts、tests/runtime/agentic-qa-preparation.test.ts、ADR-0012 / ADR-0015、CI preparation step。
- Transaction / state / platform boundary: Deterministic preparation / validation / isolation / artifact integrity / evaluation / scoringと、Host側Fresh Coding Agent executionのtrust boundary。Product transaction / runtime stateはN/A。
- Audit baselineからのmaterial change: Audit baselineからCurrentのscripts/agentic-qa candidate path material diffはない。047824f、c118b80、5169148、034a175等はinception〜Currentのtargeted historyとして確認した。investigation baselineからbranch HEADへのcandidate path diffもない。
- Recent churn / material change frequency / repair / failure summary: 4f943ff foundation、c289208 fail-close contracts、4a6e064 evidence / tool-scope、034a175 official scored E2E、5169148 artifact contracts、c118b80 verifier checks、047824f repairでpreparationからverificationまでのcontract repairが反復した。一方、Currentのcandidate起因failureは確認されず、ADR-defined responsibilityとCI / testsは整合している。
- Evidence references: 4f943ff、c289208、4a6e064、034a175、5169148、c118b80、047824f、docs/adr/0012-specification-and-agentic-qa-foundation.md:20-29、docs/adr/0015-official-black-box-scored-e2e-artifact-boundary.md:12-32。
- Classification: refactor_when_touched
- Why now / why not now: schema / hash / fail-close contractの連鎖は変更時の横断保守コストになるが、現行のdeterministic supporting harness責務はADRに明記され、段階別contract protectionがある。今すぐ再編するbenefitは延期より明確でない。
- Follow-up trigger or missing evidence: schema version、artifact chain、runner input / output、trust receipt、evaluation scoringの変更時、または同一contractへのrepair反復時に再評価する。

## 4.13 Maestro cleanup helpers

- Candidate: §4.13 Maestro cleanup helpers
- Current path(s): scripts/native/android-maestro-run.sh（99 lines / 2,656 bytes）、scripts/training/maestro-runner.ts（137）、scripts/training/maestro-invocation.ts（37）、run-maestro-baseline.ts / run-maestro-exercise.ts entrypoints
- Current responsibility: Formal側はLinux CIのforce-stop、pm clear、process poll、Maestro / JUnit artifactを担当する。Training側はWindows physical Android serial、readiness、cleanup、Windows command quoting、Training outputを担当する。Currentのrun-maestro-baseline.tsはentrypointに縮小され、処理はmaestro-runner.tsへ移動している。
- Current public / composition surface: .github/workflows/native-ci.ymlからFormal / Training baselineへ18回参照されるBash helper、package.json:43-44のTraining entrypoint、training/github-actions/training-native-ci.ymlのpath contract。
- Current consumers / dependencies / references: Native CI、Training Native CI、training Maestro baseline / exercise flow、ADB、Maestro、training serial resolver。
- Protecting tests / workflows: tests/contracts/native-test-control-maestro.test.ts、tests/contracts/native-ci-workflow.test.ts、tests/contracts/training-curriculum.test.ts、training/github-actions/training-native-ci.yml、Native / Training workflow contracts。
- Transaction / state / platform boundary: Formal Linux CIとTraining Windows physical-deviceのexecution platform boundary、ADB process / application state cleanup、Maestro invocation、artifact output。Product transaction / application data stateはN/A。
- Audit baselineからのmaterial change: 856a14e（#124）でTraining baseline runnerを14-line entrypointとmaestro-runner.tsへ再構成した。investigation baselineからbranch HEADへのcandidate path diffはない。
- Recent churn / material change frequency / repair / failure summary: 1313ab9、7c442d3、50021ad、83a48c0、8e55988、53c4038、856a14eでFormal helper追加、Training workflow、serial / quoting、runner責務を順次整備した。Current semantic driftやhelper起因failureは確認されなかった。
- Evidence references: 83a48c0、50021ad、8e55988、53c4038、856a14e、.github/workflows/native-ci.yml:1368-1808、scripts/training/maestro-runner.ts:49-128、tests/contracts/native-ci-workflow.test.ts、tests/contracts/training-curriculum.test.ts。
- Classification: keep_as_is
- Why now / why not now: force-stop / pm clearの意味は似ているが、Linux Bash / timeoutとWindows Node / serial / quoting / artifact workflowは別platform ownershipである。Current failureやsemantic driftはなく、DRY理由だけで今すぐ共通化するbenefitも、次の関連変更時に必ず共通化する具体的costもない。
- Follow-up trigger or missing evidence: N/A — platform-independent cleanup contractの具体的failure、semantic drift、またはplatform ownershipを変更するADRが出た場合だけ再評価する。

## 4.14 Web E2E fixture

- Candidate: §4.14 Web E2E fixture
- Current path(s): e2e/web/fixtures.ts（142 lines / 5,602 bytes）
- Current responsibility: extended test / expect、explicit scenario reset、metadata、guest / session identity、context page cleanup、console / pageerror collection、artifact attachment、postcondition、login / address / checkout / mobile helperを担当する。
- Current public / composition surface: exported test fixture、expect、login、expectSessionIdCleared、addDefaultAddress、completeCheckout、expectAdminMobileBoundary。
- Current consumers / dependencies / references: accessibility、cross-role-lifecycle、mobile-boundary、phase1-required、ui-review、ui-ux-improvementsの6 Formal Web E2E spec。window.\_\_TEST_API\_\_.reset / getMetadataとSeed metadataへ依存する。
- Protecting tests / workflows: 6 E2E spec、未使用scenarioのfail-closed、guest / session identity assertions、console / pageerror artifact、Playwright project setup。
- Transaction / state / platform boundary: Formal Web Playwright context / scenario reset / evidence artifact boundary。Database transaction / Product persistenceはN/A — test control APIへ委譲する。
- Audit baselineからのmaterial change: Audit baselineからCurrentまでのcandidate path material diffは確認されない。investigation baselineからbranch HEADへのcandidate path diffもない。
- Recent churn / material change frequency / repair / failure summary: 8900637、7dea554、38c2c08、aca68d1、0466614、01acf2cでE2E lifecycle / UI helperを整備したが、Currentのfixture起因failure、repeated repair、別lifecycleの混在は確認されなかった。
- Evidence references: e2e/web/fixtures.ts:11-70, 76-142、e2e/web/accessibility.spec.ts、cross-role-lifecycle.spec.ts、mobile-boundary.spec.ts、phase1-required.spec.ts、ui-review.spec.ts、ui-ux-improvements.spec.ts、01acf2c。
- Classification: keep_as_is
- Why now / why not now: 小規模なshared prerequisiteではあるが、reset、metadata、identity、artifact、postconditionを一つのWeb E2E lifecycleとしてcohesiveに扱っている。size / fan-inだけではrefactor_nowにならず、独立lifecycleの混在もないためrefactor_when_touchedにも該当しない。
- Follow-up trigger or missing evidence: N/A — explicit reset / identity / artifact contractが崩れるfailure、またはfixture内に別lifecycleが独立して変更されるEvidenceが出た場合だけ再評価する。

## 4.15 Dexie / SQLite adapters

- Candidate: §4.15 Dexie / SQLite adapters
- Current path(s): src/infrastructure/database/dexie/**（10 files / 3,530 lines）、src/infrastructure/database/sqlite/**（6 files / 4,955 lines）
- Current responsibility: 同じApplication repository / transaction contractsを、Web IndexedDB / DexieとNative SQLiteの異なるschema、row model、mapper、transaction APIへ実装する。
- Current public / composition surface: Webはsrc/bootstrap/browser-runtime.web.tsのDexie factory / transaction runner、Nativeはsrc/bootstrap/native-runtime.tsのNative SQLite factory / repository / seed / schema。
- Current consumers / dependencies / references: Web / Native composition roots、Application use cases、repository / transaction contracts、shared customer repository suite、Native schema / mapper / transaction tests。
- Protecting tests / workflows: tests/contracts/shared-customer-repository-suite.ts、tests/repository-contract/customer-shared.test.ts、tests/repository-contract/native-customer-shared.test.ts、tests/contracts/native-sqlite-schema.test.ts、native-sqlite-mappers.test.ts、native-sqlite-transactions.test.ts、tests/contracts/architecture.test.ts。
- Transaction / state / platform boundary: Intentional Web IndexedDB / Native SQLite platform ownership。shared Application contractは共通だが、schema / mapper / transaction implementationはplatform-specificで、Native entrypointにDexie importはない。
- Audit baselineからのmaterial change: Audit baselineからCurrentのDexie / SQLite candidate path material diffはない。7f7e48e、dcc8983 / ebf7c45 / dfee64c、4caaed9（#42）、f909ea4（#43）はinception〜Currentのtargeted historyとして確認した。investigation baselineからbranch HEADへのcandidate path diffもない。
- Recent churn / material change frequency / repair / failure summary: Web adapterでは01acf2c / 1512a3e / f909ea4、Native adapterでは7f7e48e〜778b6f6 / 4caaed9にmaterial changesがある。shared contract / schema / mapper / transaction testsで保護され、candidate起因のsemantic drift / failureは確認されなかった。
- Evidence references: 7f7e48e、dcc8983、dfee64c、778b6f6、4caaed9、f909ea4、src/bootstrap/browser-runtime.web.ts:12-14、src/bootstrap/native-runtime.ts:19-21,103-104、tests/repository-contract/customer-shared.test.ts、tests/contracts/native-sqlite-transactions.test.ts。
- Classification: keep_as_is
- Why now / why not now: 同じbusiness contractを異なるplatformへ実装するduplicationは意図的で、shared contract testsがsemantic parityを担当する。sizeやlook-alikeだけでrefactor_nowにせず、現時点で共通化によるbenefitやadapter-specific failureがないためrefactor_when_touchedにも送らない。
- Follow-up trigger or missing evidence: N/A — semantic parity drift、adapter-specific failure、またはplatform ownershipを変更するarchitecture decisionが出た場合だけ再評価する。

## 4.16 Domain → Application type dependency

- Candidate: §4.16 Domain → Application type dependency
- Current path(s): src/domain/repositories/contracts.ts:1-94, 125, 197、src/domain/policies/permissions.ts:1-8
- Current responsibility: Domain repository interfaceがApplicationのDTO / query / command typeを参照し、Domain permission policyがApplication ProductViewer typeを参照する。4 referenceはtype-only importである。
- Current public / composition surface: repository interfaces、canViewerSeeProduct、rankSatisfies。Application use cases / Infrastructure adaptersがDomain repository / policyを利用する。
- Current consumers / dependencies / references: src/application/**、src/infrastructure/database/dexie/**、src/infrastructure/database/sqlite/**、tests/unit/policies.test.ts、repository contract tests。ProductViewerはsrc/application/contracts/common.ts:111-113に定義される。
- Protecting tests / workflows: tests/contracts/architecture.test.ts:61-73,160-179はApplication→Infrastructure / DexieとNative→Webを検査するがDomain→Applicationをrejectしない。tests/unit/policies.test.tsとshared repository contractがbehaviorを保護する。
- Transaction / state / platform boundary: compile-time Domain repository / policyとApplication DTO / viewer contractのboundary。import typeのためruntime import / transaction / platform stateはN/A。ただしcanonical type ownerと依存方向の設計判断が必要である。
- Audit baselineからのmaterial change: Audit baselineからCurrentまでのcandidate path material diffは確認されない。investigation baselineからbranch HEADへのcandidate path diffもない。
- Recent churn / material change frequency / repair / failure summary: 8900637で初期architectureを導入し、7f7e48e / 778b6f6でrepository contractを変更した。runtime cycle、compile-time failure、candidate起因repairは確認されなかった。単純なimport数はrisk scoreにしていない。
- Evidence references: 8900637、7f7e48e、778b6f6、src/domain/repositories/contracts.ts:1-94,125,197、src/domain/policies/permissions.ts:1-8、src/application/contracts/common.ts:111-113、docs/adr/0003-platform-route-composition-root.md:14、docs/04_data/repository_interfaces.md:3,14、tests/contracts/architecture.test.ts。
- Classification: needs_more_evidence
- Why now / why not now: type-onlyでruntime failureがなく、即時refactorのbenefitは確定しない。一方、ADR-0003はApplicationがDomain Repository Portへ依存する方向を記録し、repository interface説明はApplication contractのRead DTOを参照する現行設計を記録している。Domain→Application type dependencyを許容するのか、ProductViewer / repository DTOのcanonical ownerを移すのかを確定するEvidenceなしにkeep_as_is / refactor_when_touchedへ断定しない。
- Follow-up trigger or missing evidence: 不足Evidenceは、Domain→Application type dependencyを許容する明示ADR / architecture contract、ProductViewer・repository Read DTOのcanonical ownerを決める設計判断、その判断を検査するstatic contract。取得条件はarchitecture ownerが方針を決め、必要ならADR / contract testを追加する時点。再判断triggerはDomain / Application contractの次回変更、runtime cycle / compile-time dependency failureの再現、またはarchitecture direction ADRの確定である。Related finding: RA-Q1。

## RA-C1 conclusion

RA-C1（Hotspot / duplication / large-file等のRefactoring candidate群）は、16 candidateのNecessity Reviewとして次のように集約される。

- refactor_now: §4.9 Native CI workflow（Native workflow build / runtime / artifact / visual / training / final-gate orchestration）、§4.10 Global Web CSS（Web global cascade / breakpoint / Storefront / Admin ownership）。いずれもCurrentの反復repairとblast radiusを根拠とするが、本PRでは実装しない。
- refactor_when_touched: §4.1、§4.2、§4.3、§4.4、§4.5、§4.6、§4.7、§4.11、§4.12。各candidateの関連変更時triggerは個別sectionに記録した。
- keep_as_is: §4.8、§4.13、§4.14、§4.15。intentional aggregate / platform / lifecycle boundaryとprotectionがあり、sizeや見た目だけでRefactor化しない。
- needs_more_evidence: §4.16。architecture directionとcanonical type ownerが不足している。

RA-C1用の追加調査は行っていない。Candidate detailで取得済みのEvidenceを集約した。

## RA-Q1 conclusion

RA-Q1（Domain → Application type dependencyの妥当性）は§4.16と同一Evidenceで判断する。classificationはneeds_more_evidenceであり、type-only import、runtime cycle未確認、既存architecture testの対象範囲、ADR-0003とrepository interface説明の関係を根拠とする。不足Evidenceは、許容依存方向とProductViewer / repository Read DTOのcanonical ownerを定める明示architecture decision / contractである。取得条件と再判断triggerは§4.16へ記録した。

RA-Q1用にimport、history、test protectionを二重調査していない。

## Follow-up

- refactor_now follow-up: §4.9と§4.10を対象boundary単位の別Plan / 別PRでCurrent mainへ再mappingし、実装要否を再確認する。今回のPRではworkflow / CSS refactorを実装しない。
- refactor_when_touched follow-up: §4.1〜§4.7、§4.11、§4.12は各candidate sectionのtrigger発生時に再評価する。
- needs_more_evidence follow-up: §4.16 / RA-Q1はarchitecture ownerの判断、ADR / static contractの追加、runtime cycle / compile-time failureの再現時に再判断する。
- Issue #72はCloseしない。PR #128はmergeしない。

## Freshness check

- Freshness procedure: 2026-09-06 JSTにgit fetch origin mainを実行し、investigation baseline SHAとlatest origin/mainをdiff-firstで比較した。
- Investigation baseline SHA: 856a14eb448a6ad6bf9722f623cf0d094b7a7d2a
- Latest origin/main SHA: 856a14eb448a6ad6bf9722f623cf0d094b7a7d2a
- Changed filenames / diff: baselineからlatest origin/mainへの変更なし。
- Freshness relevant set: 各candidate current path、既知consumer / dependency / reference、principal composition root、protecting test / workflowをEvidence Cardから再利用した。set内の変更はなし。known set外のadded / deleted pathにcandidate public / composition surfaceへのdirect import / referenceが現れる変更もなかった。
- Re-evaluation: material changeがないため16 classificationを維持した。
- Last confirmed main SHA: 856a14eb448a6ad6bf9722f623cf0d094b7a7d2a

## Scope / non-goals confirmation

- 変更対象はこのdurable report、Repository標準Run Artifact、既存Execution Planの範囲に限定する。Execution Plan自体はCurrent factとの不整合がないため変更していない。
- Product source、formal test behavior、training behavior、workflow behavior、dependency / lockfile、Normative Specification、Curriculum semanticは変更していない。
- 全Repository再Audit、全commit timeline、完全call graph、generic dependency scanner、graph DB、candidate別Evidence file / Run、Refactoring管理台帳は作成していない。
- refactor_nowのfile split、API migration、implementation designは作成していない。
- Issue #72 close、PR #128 merge、auto-merge、force push、rebaseは実施しない。
