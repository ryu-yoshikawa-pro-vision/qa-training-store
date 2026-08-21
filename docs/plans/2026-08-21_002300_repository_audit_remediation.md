# Repository Audit Remediation 実装計画

## 0. 依頼概要

- 対象Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Plan branch: `plan/repository-audit-remediation`
- Base branch: `main`
- Baseline SHA: `314a8f958072f19e672e3bc37089558d74e42feb`
- Evidence:
  - `docs/reports/2026-08-20_010734_maintenance-investigation.md`
  - `docs/reports/2026-08-20_103937_repository-audit.md`
- 目的:
  - 監査Findingを機械的に全実装せず、Current Contract上で本当に修正が必要なRoot Causeだけを解消する。
  - Product / Test / Tooling / DocumentationをRoot Cause単位の小さなPRへ分ける。
  - Product/UI/NativeのBehavior修正は、可能な限りPlaywright-MCP / Maestro-MCPを使い、修正前後の実Runtimeを確認する。

## 1. Goal / Definition of Done

### Goal

Current Product Contract、Repository Policy、Executable Contractに反する問題だけを、必要最小限の変更で修正する。

### Definition of Done

1. 各Slice開始時に最新`main`へrebaseし、Findingが未修正であることを再確認している。
2. Product BehaviorはNormative Specificationへ一致する。
3. Route / App ID / Test ID / Seed ID / Design Token / Build Config等、SpecがExecutable Canonical Sourceへ委譲する低レベル値はCode / Configへ一致する。
4. Test修正でassertion弱体化、無条件retry、global timeout増加、failure maskingを行っていない。
5. Runtime Findingは、可能な場合、最新`main`でBeforeを再現し、修正後に同じ操作でAfterを確認している。
6. MCPが利用可能な場合は積極的に使用し、Rendered UIも確認している。
7. MCPが利用不能な場合は未実行をPASS扱いせず、代替Runtime Evidenceと理由を記録している。
8. MNT-003はActual Production Hermes Build Outputそのもの、またはそこから決定的に導出されるArtifact graphをEvidenceに含めている。
9. Production isolation surfaceを変更するNative PRはR8を先にmainへmergeしている。通常のNative Product変更はR8と並列merge可能だが、Current Native Production Build + Maestro production-validationの実Job成功を必須とする。
10. Native変更PRはNative CIの実Jobを実行し、docs-only skipを代替Evidenceにしない。
11. Required CIがGreenである。
12. Deferred / No-op項目を「ついで」に実装していない。
13. Root CauseごとにPRを分離し、別Root Causeを巨大PRへ混ぜていない。
14. Run Artifact、MCP Evidence、PR本文がRepository契約に従っている。

## 2. Current Understanding

- PR #35の監査ReportはHistorical Evidenceとして保持する。
- `docs/spec/README.md` のOracle Priorityでは、Product BehaviorはNormative Specification、委譲された低レベル値はExecutable Canonical Sourceが正本である。
- `docs/spec/known-deviations.md` にActive deviationはない。
- Native StorefrontはWeb/Native共通Product Behaviorとして定義されている。
- `BR-STOREFRONT-002` / `AC-STOREFRONT-002` は、Keyword、Category、Brand、価格、在庫、Sale、最低評価、total、page、Facet件数、stable sortまで一貫することを要求する。
- Current `NATIVE_CUSTOMER_SCENARIOS` に`gold-member` / `platinum-member`はない。
- Current Native RuntimeはCatalog actorに`GuestActorResolver`を固定している。
- Current `createNativeCustomerCatalogGateway()`はviewer kindを検証するが、viewer contextをNative repositoryへ渡していない。
- Current `NativeCustomerSQLiteRepository`はGuest可視性とGuest pricingを前提にHome / Search / Detailを計算している。
- Current Native `CatalogUseCases.suggest()`は`customerGateway`経路で空配列を返し、`CustomerCatalogGateway`には`suggest()` capabilityがない。
- Current `NativeCatalogService` / `NativeCustomerCatalogRepository` / `NativeCustomerSQLiteRepository` / Native Search UIにもSuggestion経路がない。
- Current Native CIにはStandalone bundle validatorとは別に、Production Build JobとRuntime Jobの2箇所でHermes bundleへraw marker scanを行う重複検査がある。
- `qa-training-store-ci-chromium-required-cross-browser-split` branchにはCI分離実装があるが、Current `main`には未反映である。
- Phase 3 Backend PRは別計画であり、本Planでは先回りしたBackend abstractionを作らない。

## 3. Assumptions / Non-goals / Open Questions

### Assumptions

- 実装時は各Sliceを最新`main`へrebaseする。
- 他PRで既に修正済みなら、そのSliceを`already-fixed`へ変更する。
- Runtime検証のためだけにProduct capabilityやTest Control capabilityを追加しない。
- MCP availabilityは環境依存であり、MCP unavailable自体をProduct defectにしない。

### Non-goals

- Phase 3 Backend / Cloudflare Workers / D1実装。
- Native Admin追加。
- iOS Runtime/Maestro保証追加。
- Guest Checkout追加。
- UI全面リデザイン。
- Dependencyの不要なversion upgrade。
- Action SHA pinningとversion upgradeの混在。
- 全E2E再設計。
- Generated Artifact Framework新設。
- Agentic QA Runner / Orchestrator新設。
- Metro cacheへの無条件`--clear`導入。
- MCP検証だけのためのNative Test Control Scenario拡張。
- Audit ReportのFinding削除・改番。

### Open Questions

- REP-013: raw expected-failure Workflowとchecker wrapperの責務分離が意図的か。
- REP-017: GitHub Ruleset / Branch ProtectionがNative main assuranceを十分に保証しているか。
- MNT-003: Actual Production Hermes Artifactへ対する最小fail-close検証方式。

上記は全体Blockerではなく、該当Sliceのconfirmation gateとする。

## 4. Repo Mapping

### Entry points / Safe change surface

- Checkout:
  - `docs/spec/features/checkout-and-payment.md`
  - Checkout / Order Application Use Case
  - Web / Native result screens
- Native identity / authorization:
  - `src/bootstrap/native-runtime.ts`
  - Session / Identity abstraction
  - `src/application/use-cases/catalog-use-cases.ts`
  - `src/application/customer-capabilities.ts`
  - `src/application/native/guest-storefront.ts`
  - `src/infrastructure/database/sqlite/native-customer-repositories.ts`
  - Native Shell / route boundary
- Storefront:
  - `docs/spec/features/storefront.md`
  - `src/presentation/native/native-screens.tsx`
  - `src/bootstrap/native-runtime.ts`
  - `src/application/use-cases/catalog-use-cases.ts`
  - `src/application/customer-capabilities.ts`
  - `src/application/native/guest-storefront.ts`
  - `src/infrastructure/database/sqlite/native-customer-repositories.ts`
- Web Search:
  - Search ComboBox / async suggestion state
- Cart:
  - Dexie cart repository
- QA/Test:
  - Cross-role Flow J
  - Contract tests
- Tooling:
  - `scripts/validate-native-production-bundle.ts`
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
  - Agentic QA patch preparation
  - Training workflow contract
- Docs:
  - `docs/05_ui/design_system.md`
  - iOS Curriculum
  - `docs/08_testing/e2e_design.md`

### Main flow

```text
Route / Screen
  → Application Use Case
  → Gateway / Repository
  → Persisted State / Platform Adapter
  → Presentation
```

Native Catalog viewer contextは次の経路で途切れず伝播させる。

```text
Current Session / Identity Resolver
  → CatalogUseCases
  → CustomerCatalogGateway
  → NativeCustomerCatalogRepository
  → NativeCustomerSQLiteRepository
```

Native Suggestionは次の経路を完成させる。

```text
NativeSearchScreen
  → NativeCatalogService.suggest()
  → CatalogUseCases.suggest()
  → CustomerCatalogGateway.suggest()
  → NativeCustomerCatalogRepository.suggest()
  → NativeCustomerSQLiteRepository.suggest()
```

NativeのProduction isolationは別Boundaryとして、Build Kind / Native Runtime composition / Test Control routing / Production APK / Runtime validationの順に保証する。

### Key abstractions

- `SessionIdentityResolver` / Current Actor resolution
- `CatalogUseCases`
- `CustomerCatalogGateway`
- `NativeCatalogService`
- `NativeCustomerCatalogRepository`
- `NativeCustomerSQLiteRepository`
- Checkout / Order / Payment persisted state
- Native Shell / route authorization boundary
- Native Test Control / Contract Harness production boundary
- Native CI Production Build / Runtime validation

### Existing validation layers

- Unit / Integration / Repository Contract / Component / Contract tests
- Playwright Web E2E
- Native Component tests
- Maestro Native flows
- Native Production Bundle Guard
- Agentic QA deterministic preparation tests
- `validate:spec`
- `validate:spec-visuals:final`
- `validate:curriculum`

### Files to inspect

| Slice | Primary files / areas |
|---|---|
| R1 | Checkout/Order Use Case、Web/Native result screens、checkout/payment tests |
| R2a | `src/bootstrap/native-runtime.ts`、session identity、`CatalogUseCases`、`CustomerCatalogGateway`、`NativeCustomerCatalogRepository`、`NativeCustomerSQLiteRepository`、Native catalog tests |
| R2b | Native Shell / route boundary、customer deep-link tests |
| R3 | `native-screens.tsx`、`native-runtime.ts`、`catalog-use-cases.ts`、`customer-capabilities.ts`、`guest-storefront.ts`、`native-customer-repositories.ts`、Native Storefront tests |
| R4 | Web Search ComboBox、search component/E2E tests |
| R5 | Dexie cart repository、repository contract tests |
| R6 | Login visual registry/spec、visual validation tests |
| R7 | Cross-role Flow J、related seed/state helpers |
| R8 | `validate-native-production-bundle.ts`、`native-ci.yml`、`native-ci-workflow.test.ts`、production-validation Maestro flow |
| R9 | Agentic QA patch/preparation scripts、Windows/Linux contract tests |
| R10 | affected Windows contract tests / fixtures |
| R11 | Training workflow/templates、workflow contract tests |
| R12/R13 | affected Design System / Curriculum / E2E design docs and validators |

### Unknowns

- R8のHermes inspectionをどのartifact representationでfail-closeにするか。
- REP-013のraw expected-failureとwrapperの責務分離が意図的か。
- REP-017のGitHub Ruleset / Branch Protection実設定。

## 5. Scope

### Must Fix / Fix

| Slice | Finding | Root Cause |
|---|---|---|
| R1 | REP-002 | Checkout resultがpersisted Order/Payment stateではなくroute presentationを信用する |
| R2a | REP-001 | Native Catalog viewer contextがGuest固定かつGateway/Repository境界で失われる |
| R2b | REP-006 | Native Customer-only direct routeのGuest guard欠落 |
| R3 | MNT-001 / REP-003 | Native StorefrontがCurrent common contractを満たさない |
| R4 | REP-004 | Web Search Suggestionが通常typingで表示されない |
| R5 | REP-005 | Web Cart mutationのitem ownership invariant欠落 |
| R6 | REP-007 | Login visual/spec scenario mapping不整合 |
| R7 | REP-012 | Flow Jがshipment transition未確認でもPASSできる |
| R8 | MNT-003 | Native Production Bundle GuardのHermes false-negative |
| R9 | MNT-002 / REP-018 | Agentic QA patchのWindows EOL portability |
| R10 | REP-011 | Windows contract testの5秒境界false-negative |
| R11 | REP-016 | Training workflow action tagとSHA-pin policyの矛盾 |
| R12a | REP-008 | Design System docsとExecutable Tokenのdrift |
| R12b | REP-010 | iOS CurriculumとCurrent Build-only Gateのdrift |
| R13 | REP-009 / REP-014 | Current-lookingな旧E2E設計文書 |

### Confirmation only

- C1 / REP-013: 原則コード変更なし。
- C2 / REP-017: GitHub settings確認。保証済みならRepository変更なし。

### Deferred / No-op

- MNT-004: clean environmentで再現するまで実装しない。
- REP-015: Current generated outputsは同期済み。将来改善としてDefer。
- MNT-005: exact body mappingはLower Layerで保証済み。現状変更なし。
- REP-019: Repository defectではないため変更なし。

## 6. Dependencies / Merge Order

### Native Production isolation gate

R8は高優先度のparallel remediationとし、通常のNative Product修正の開発・mergeを一律にはBlockしない。

R8をhard merge prerequisiteにするのは、Production isolation surfaceを直接変更するPRに限定する。

対象例:

- `src/test-controls/**`
- `src/bootstrap/native-runtime.ts`内のBuild Kind / Test Control / Contract Harness composition
- `app.config.ts`
- `EXPO_PUBLIC_*` build-kind branching
- Native build config
- Production bundle guard
- Test Control / Contract Harness routing

同じ`src/bootstrap/native-runtime.ts`でも、Catalog identity wiringなどProduction isolation contractへ影響しない変更だけならR8 hard prerequisiteとはしない。

上記へ触れない通常のNative Product Presentation/Application修正はR8と並列merge可能とする。ただしCurrent Native CIで、Actual Production-validation BuildとMaestro production-validationを含む実Job成功を必須とする。

### R3 dependency

R3はR2aのviewer context伝播修正後にmergeする。Guest固定またはviewer contextがRepositoryまで届かない状態でStorefront parityを完成扱いにしない。

### R13 dependency

R13は`qa-training-store-ci-chromium-required-cross-browser-split`がmainへmergeされるまで`BLOCKED_BY_DEPENDENCY`とする。

## 7. Change Strategy

### R1 — Checkout result state integrity

- persisted Order ownership / Order state / Payment stateを正本にする。
- route `complete/failed`だけで表示を決めない。
- contradictory success/failureを表示しない。
- 不整合時の遷移先はPlanで新設せず、Current Boundary UX / Route patternから最小の既存Patternを使用する。
- Retryは実際にretry可能なstateだけ表示する。
- Native Completeは`orderId`なしで成功表示しない。
- paid→failed、failed→complete、missing ID、unauthorizedをRegressionへ追加する。
- 新Payment State Machineは作らない。

### R2a — Native Customer Catalog viewer context

- `GuestActorResolver`固定をやめ、Current Sessionからviewerを解決するExisting Identity abstractionへCatalogを接続する。
- viewer contextを次の経路で途切れず伝播させる。

```text
SessionIdentityResolver / Current Actor
  → CatalogUseCases
  → CustomerCatalogGateway
  → NativeCustomerCatalogRepository
  → NativeCustomerSQLiteRepository
```

- `createNativeCustomerCatalogGateway()`でviewer kindを検証するだけで捨てず、repository inputへviewer contextを渡す。
- Native repository / SQLite側でGuest固定visibilityや`viewerUnitPrice(..., null)`を使わず、既存Domainのvisibility / rank / pricing semanticsをviewer contextに適用する。
- Homeの商品可視性、Category/Brand count、Search result、Facet、Product Detail、rank restriction、membership pricingを同じviewer contractで揃える。
- Guest / regular / gold / platinumのactor semanticsをComponent / Contract / Repository-level coverageで固定する。
- Native専用の新Pricing rule / visibility ruleを作らない。
- Runtime確認だけのためにGold/Platinum scenarioを追加しない。

### R2b — Native Customer route guard

- Customer-only route guardをShell / route boundaryへ集約する。
- Guest direct routeは既存Login boundaryへ送る。
- unsupported management roleは既存forbidden / unsupported boundaryへ送る。
- Profile / Address / Order / Checkoutの代表deep-link negative caseを追加する。
- Screenごとのredirect重複は作らない。

### R3 — Native Storefront contract parity

実装前に`BR-STOREFRONT-002` / `AC-STOREFRONT-002`の全dimensionをrebaselineする。

必須確認dimension:

- Keyword
- Category
- Brand
- Price range
- Inventory
- Sale
- Minimum rating
- total
- page / pagination
- Facet counts
- Stable sort
- Suggestion（2文字以上、最大8件）

方針:

- 既に実装済み・正しいdimensionは変更しない。
- 欠けているdimensionだけを最小実装する。
- fixed `[]` / `null` / `page: 1` をCurrent UI stateへ接続する。
- Suggestionは次の経路をEnd-to-Endで完成させる。

```text
NativeSearchScreen
  → NativeCatalogService.suggest()
  → CatalogUseCases.suggest()
  → CustomerCatalogGateway.suggest()
  → NativeCustomerCatalogRepository.suggest()
  → NativeCustomerSQLiteRepository.suggest()
```

- `CustomerCatalogGateway`と`NativeCustomerCatalogRepository`へ最小の`suggest()` contractを追加する。
- `CatalogUseCases.suggest()`の`customerGateway`経路は空配列固定をやめ、Native Gatewayへ委譲する。Web側の既存Repository-based suggest経路は変更しない。
- `NativeCatalogService`とRuntime compositionへ`suggest()`を公開し、Native Search UIから利用できるようにする。
- SQLite Suggestionは2文字以上、最大8件、R2aで確立したviewer条件、既存の決定的sort/visibility semanticsを再利用する。
- Native Search UIでは入力変更時のstale resultを表示せず、Suggestion選択から既存の検索/商品導線へ進める。Web Search UIのpixel copyはしない。
- Underlying SQLite / Application contractを再利用する。
- 全dimensionは既存coverageをrebaselineし、不足するContractだけ追加する。Native Component Testは実際に追加・修正したUI controlとrequest mappingを確認し、Maestroでは代表Filter + Pagination + Suggestionを実操作する。

### R4 — Web Search Suggestion

- async suggestion到着後のComboBox open-stateをReact Aria contractに沿って制御する。
- 2文字未満、no-result、stale request、Enter、Arrow navigationを維持する。
- Component TestはArrowDownなしの通常typingから開始する。
- Playwright-MCP / Runtimeでpointer / keyboard / mobile-widthを代表確認する。

### R5 — Cart ownership invariant

- update/delete前に`currentItem.cartId === currentCart.id`を検証する。
- 2 Cart + foreign item negative repository testを追加する。
- Phase 3 Backendへ先回りしたRepository再設計はしない。

### R6 — Login visual/spec mapping

- `validation-error`を実際のempty-submit required validationへ合わせる。
- State slug / Expected UI / setupの意味を揃える。
- Storage Failure Canonical Visualを別BR/ACが要求していない限り、新Scenario / 新Screenshotは作らない。

### R7 — Flow J false-green

これはProduct Runtime FindingではなくTest Oracle Findingとして扱う。

正本Validation:

- Focused Playwright test。
- pre-fixでは、transition control / expected stateが欠けた条件でもFlow JがPASSできることを安全に再現またはcontrol-flow evidenceで確認する。
- post-fixでは、許可された初期状態を明示assertし、transition前なら操作後stateまでassertする。
- already-transitionedを許容する場合は、そのstateを明示assertする。
- 想定外stateはFAILする。

MCP:

- Shipment / Order画面の実状態確認には使ってよい。
- MCPだけで「false-greenが修正された」と判定しない。

### R8 — Native Production Bundle Guard

Affected Surface:

- `scripts/validate-native-production-bundle.ts`
- `.github/workflows/native-ci.yml`
  - Production-validation Build JobのProduction APK bundle scan
  - Runtime Jobのdownloaded Production APK bundle scan
- `tests/contracts/native-ci-workflow.test.ts`
- `maestro/native-production-validation.yaml`はRuntime補助Evidenceとして維持する。

方針:

- Marker / Module / Screen / Service非存在Contractを維持する。
- Hermes `.hbc`をUTF-8/raw bytesへのmarker substring searchだけで判定する方式を置き換える。
- Standalone validatorだけ直してWorkflow内の重複raw scanを残さない。
- 可能ならCorrected Production Artifact inspectionを一つの責務へ集約し、Build Job / Runtime Jobの重複検査は同じ正しいinspection contractを再利用する。新しい汎用Frameworkは作らない。
- `native-ci-workflow.test.ts`は旧`grep -aE`実装そのものを固定せず、corrected fail-close contractを固定するよう更新する。
- Actual Production Hermes Build Output、またはそこから決定的に導出されるArtifact graphを必須Evidenceにする。
- `--no-bytecode` projectionだけをProduction保証の代替にしない。
- Automation Positive Controlを維持する。
- ProductionへTest Control/Harnessが漏れた場合にFAILするNegative Controlを維持する。
- Maestro Production-validationによるRuntime Test Control unavailable確認は補助Evidenceとして維持する。

### R9 — Agentic QA patch portability

- Patch artifactのLF contractを明示する。
- normalization boundaryを1箇所に限定する。
- 高コストPreparation前にstrict `git apply --check`相当を実行する。
- `--ignore-whitespace`常用はしない。
- Windows CRLF / Linux LFをdeterministic testで固定する。

### R10 — Windows contract timeout

- affected caseだけWindowsで2〜3回bounded確認する。
- Fixture costを簡単に下げられる場合は先に下げる。
- それでも5秒境界ならaffected testだけexplicit timeoutを設定する。
- global timeout変更・retry追加はしない。
- p95 Benchmark基盤は作らない。

### R11 — Training Action SHA pinning

- Official upstreamでCurrent tag/versionとfull SHAを照合する。
- Current versionのSecurity Advisoryを確認する。
- 同versionのfull SHAへpinする。
- `APPROVED_TRAINING_ACTIONS`をexact SHA allowlistへ変更する。
- mutable tagを拒否するContract Testを追加する。
- Security理由でversion upgradeが必要なら別対応へ切り出す。

### R12a — Design System docs

- Executable token / breakpoint / image ratioへDocumentを同期する。
- Codeを古いDocument値へ戻さない。
- token→Markdown自動生成基盤は作らない。

### R12b — iOS Curriculum

- Current reusable Build-only Required Gateへ同期する。
- `workflow_call` + Native `verify` dependencyを正しく説明する。
- iOS Runtime/Maestro保証へ拡大しない。

### R13 — E2E design supersession

Status: `BLOCKED_BY_DEPENDENCY`

Cross Browser CI split merge後に:

- 最新`main`へrebaseする。
- `docs/08_testing/e2e_design.md`を再評価する。
- DefaultはHistorical / Superseded classificationとする。
- Current CIの正本へのリンクを明記する。
- Current文書として残す明確な理由がある場合だけ最新suite/count/triggerへ同期する。
- REP-009 / REP-014は1 Root Causeとして一度だけ対応する。

## 8. Confirmation Tasks

### C1 — REP-013

- raw expected-failureとwrapperの責務分離を確認する。
- Current machine contractと教材意図が一致するならコード変更しない。
- 必要ならCurriculumへ短い役割説明だけ追加する。
- EvidenceなしにWorkflowをwrapperへ置換しない。

### C2 — REP-017

- GitHub Ruleset / Branch Protection実設定を確認する。
- `main` direct push禁止 + Native PR check requiredなら変更なし。
- direct push可能ならRuleset強化を第一候補にする。
- push Native CI追加はRulesetだけで保証できない場合の次案とする。

## 9. MCP / Runtime Validation Contract

### Before / After

Runtime Findingは原則:

```text
latest mainで再現
  ↓
修正
  ↓
同じMCP / Runtime操作を再実行
  ↓
Finding消失 + 正常経路維持を確認
```

対象の中心:

- R1
- R2a
- R2b
- R3
- R4

R7はFocused Playwrightが正本で、MCPは補助とする。

### Playwright-MCP

- Main path / reproduction path
- direct URL / reload / back / repeated action
- pointer / keyboard / touch相当
- opposite-state / unauthorized / error boundary
- DOM / ARIAだけでなくRendered UI

### Maestro-MCP

- launch / deep link / navigation
- login / session
- tap / input / scroll
- invalid direct route
- Storefront Suggestion / Filter / Pagination
- Checkout Complete / Failed boundary

Gold/Platinum:

- Component / Contract Testで必須保証する。
- Current deterministic setupで安全に作れる場合だけRuntime確認する。
- Runtime確認のためだけにNative Test Control Scenarioを追加しない。
- 安全なsetupがなければRuntimeは`BLOCKED`として記録する。

### Evidence storage

- screenshot / trace / raw MCP log / ADB logcatは`.artifacts/<slice>/<run>/`へ保存する。
- Repository rootへ出さない。
- `.codex/runs/**/REPORT.md`とPR本文には要約だけ記録する。
- MCP unavailableをPASS扱いしない。

## 10. Validation Plan

### Global

Focused Validation後、変更に対応するRequired Gateを通す。

候補:

```text
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run validate:curriculum
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component:web
pnpm run test:component:native
pnpm run test:contracts
```

### Slice-specific

- R1: opposite-state / missing ID / unauthorized + Web/Native Runtime Before/After。
- R2a: Guest / regular / gold / platinumについて、viewer contextがUseCase→Gateway→Repositoryまで保持され、Home / Search / Facet / Detail / membership pricingがCurrent Contractへ一致することを確認する。
- R2b: Guest direct route / unsupported role + Maestro deep-link。
- R3: BR/AC全dimensionの既存coverageをrebaselineし、不足するContract/Componentだけ追加。SuggestionはUI→Service→UseCase→Gateway→Repository→SQLiteのdelegation、2文字未満、最大8件、stale result、viewer条件を確認し、Maestroで代表Filter / Pagination / Suggestionを実操作する。
- R4: normal typing / no result / stale request + Playwright-MCP。
- R5: foreign-item Repository Test。
- R6: `validate:spec` / `validate:spec-visuals:final`。
- R7: Focused Playwrightでfalse-greenをfail-closeへ変更したことを確認。MCPは補助。
- R8: Standalone validator + Production Build Job + downloaded Production APK検証のcorrected contract、Automation Positive Control、Production Negative Control、Actual Hermes Artifact Evidence、Maestro production-validation。
- R9: Windows EOL + Linux control。
- R10: Windows bounded repeat。
- R11: upstream SHA / Advisory / mutable-tag negative test。
- R12a / R12b / R13: Markdown / spec / curriculum validation。

## 11. Plan Branch Completion Validation

このPlan branch自体はMarkdown + Run Artifactのみの変更である。

branchを完了扱いにする前に、Repositoryをローカル取得できる環境で次を実行する。

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260821-174900-JST -Write -Check
pnpm run format:check
pnpm run lint:markdown
```

条件:

- sanitize: residual findings 0。
- format:check: PASS。
- lint:markdown: PASS。
- 失敗時は修正後に再実行する。
- 上記未実行の状態ではPlanning Runを100%完了扱いにしない。

## 12. Risks

1. Native Storefront scope creep
   - 全dimensionをrebaselineし、欠けているものだけ修正する。
2. Native viewer contextの表層修正
   - Actor Resolverだけで終わらせず、Gateway / Repository / SQLiteまでviewerを伝播する。
3. Checkout UX新設
   - Current Boundary patternを再利用する。
4. Native auth guard重複
   - Shell / route boundaryへ集約する。
5. Hermes guard弱体化 / 重複実装
   - Actual Production Artifact由来Evidenceを必須にし、Standalone validatorとWorkflowのinspection contractを可能な範囲で共有する。
6. Patch strictness低下
   - strict applyを維持する。
7. Timeout対応の過剰調査
   - bounded reproductionで止める。
8. MCP scope creep
   - Test Controlを検証都合で拡張しない。
9. Concurrent CI workとの競合
   - R13だけdependency blockedとする。
10. R8によるProduct fixの不必要な遅延
   - hard prerequisiteをProduction isolation surface変更時だけに限定する。
11. Suggestionの部分実装
   - UIだけ、Gatewayだけで終わらせず、Native Search UIからSQLiteまで同一contractで接続する。

## 13. Priority

### High-priority parallel tooling

1. R8 — Native Production Bundle Guard

### Highest product priority

2. R1 — Checkout result integrity
3. R2a — Native Catalog viewer context
4. R2b — Native route guard
5. R3 — Native Storefront parity
6. R4 — Web Search Suggestion

### QA / Tooling

7. R9 — Agentic QA patch portability
8. R7 — Flow J false-green
9. R5 — Cart ownership invariant
10. R6 — Login spec/visual mapping
11. R10 — Windows timeout budget
12. R11 — Training action pinning

### Documentation

13. R12a — Design System
14. R12b — iOS Curriculum
15. R13 — E2E design supersession after dependency merge

### Confirmation only

- C1 / REP-013
- C2 / REP-017

## 14. Follow-up / Stop Conditions

- 別Root Causeを「ついで」に修正しない。
- Deferred itemは追加Evidenceがない限り実装しない。
- Dependency update、UI redesign、大規模Refactorを追加しない。
- Product ContractにないUXをPlan都合で新設しない。
- MCPで新Findingを見つけた場合、今回Root Causeと別なら別対応へ分離する。

## 15. Deliverables

- Plan: `docs/plans/2026-08-21_002300_repository_audit_remediation.md`
- Planning Run Artifact: `.codex/runs/20260821-174900-JST/`
- 実装時: Root Causeごとの小PR、Regression Test、Run Artifact、Runtime Evidence、残Risk記録。
- PR #35のAudit ReportはHistorical Evidenceとして原則変更しない。
