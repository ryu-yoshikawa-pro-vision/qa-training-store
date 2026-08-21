# Repository Audit Remediation 実装計画

## 0. 依頼概要

- 対象Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Plan branch: `plan/repository-audit-remediation`
- Base branch: `main`
- Base SHA: `314a8f958072f19e672e3bc37089558d74e42feb`
- Evidence:
  - `docs/reports/2026-08-20_010734_maintenance-investigation.md`
  - `docs/reports/2026-08-20_103937_repository-audit.md`
- 目的:
  - PR #35 の2つの監査ReportをEvidenceとして、Current Repositoryで本当に対応が必要なRoot Causeだけを実装対象へ残す。
  - Finding IDを機械的に1件1タスク化しない。
  - Product correctness、Test/QA reliability、Tooling integrity、Current documentation alignmentを必要最小限の変更で修正する。
  - Product/UI/Nativeの修正では、利用可能な場合はPlaywright-MCP / Maestro-MCPを積極的に使用し、修正前後の実表示・実動作まで確認する。

## 1. ゴール / 完了条件

### Goal

監査で確認された問題のうち、Current Product Contract、Repository Policy、Executable Contractに照らして修正が必要なものだけを、Root Cause単位の小さなPRへ分けて解消する。

### Definition of Done

1. Must Fix / Fixと分類した各Root Causeについて、実装開始時の最新`main`で未修正であることを再確認している。
2. Product BehaviorはNormative Specificationへ一致し、低レベル値はSpecificationが委譲するExecutable Canonical Sourceへ一致している。
3. Test修正でassertion弱体化、無条件retry、global timeout増加、failure maskingを行っていない。
4. Product/UI/Native Findingは、RuntimeがFindingの中心である場合、修正前の再現と修正後の同一操作による再検証を行っている。
5. Playwright-MCP / Maestro-MCPが利用可能な場合は積極的に利用し、Rendered UIも確認している。
6. MCPが利用不能な場合は未実行をPASS扱いせず、理由と代替Runtime Evidenceを記録している。
7. MNT-003はActual Production Hermes Build Outputそのもの、またはそのBuild Outputから決定的に導出されるArtifact graphをEvidenceに含めてProduction保証を検証している。
8. Native変更を含むPRはNative CIの実Jobを実行し、docs-only skipを代替Evidenceにしていない。
9. Required CIがGreenである。
10. Deferred / No-op項目を「ついで」に実装していない。
11. Root CauseごとのPRへ分割され、別Root Causeを一つの巨大PRへ混ぜていない。
12. 実装時のRun Artifact、MCP Evidence、PR本文がRepository契約に従っている。

## 2. 現状理解と前提

### 2.1 Current understanding

- `main`のCurrent baselineはPR #35マージ後の`314a8f958072f19e672e3bc37089558d74e42feb`。
- PR #35の監査ReportはHistorical Evidenceとして保持し、Finding closureのために大量編集しない。
- `qa-training-store-ci-chromium-required-cross-browser-split` branchにはCross Browser CI分離の実装commit `0d256cf3d93dc826758f9ffca1072f3fa7da00c6` が存在するが、Current `main`には未反映である。
- `docs/spec/known-deviations.md` にActive Known Deviationはない。
- `docs/spec/README.md` のOracle Priorityでは、Product BehaviorはNormative Specificationを優先する一方、Route / App ID / Test ID / Design Token / Build Config等の低レベル値は各FeatureのExecutable Canonical Sourceで指定されたCode / Configを正本とする。
- Native Storefrontは`docs/spec/features/storefront.md`と`docs/spec/features/native-customer.md`でWeb/Native共通Product Behaviorとして定義されている。
- Current `NATIVE_CUSTOMER_SCENARIOS`には`gold-member` / `platinum-member`が含まれていないため、Gold/PlatinumのNative Runtime確認を行うためだけにTest Control Scenarioを拡張してはならない。

### 2.2 Entry points

主要な変更入口はRoot Causeごとに異なる。

- Checkout:
  - `docs/spec/features/checkout-and-payment.md`
  - Web / Native Checkout presentation
  - Checkout / Order Application Use Case
  - Checkout / Order Component / E2E / Native tests
- Native session / authorization:
  - Native Runtime composition
  - Identity / Session abstraction
  - Native Shell / route boundary
  - `docs/spec/roles-and-permissions.md`
- Storefront:
  - `docs/spec/features/storefront.md`
  - Native Catalog/Search presentation
  - Catalog Application service / SQLite repository
- Web Search Suggestion:
  - Web Search Combobox / async suggestion state
  - Component / Playwright E2E
- Cart:
  - Web Dexie cart repository
  - Repository contract tests
- Visual / Curriculum / Documentation:
  - `docs/spec/**`
  - `docs/05_ui/design_system.md`
  - `docs/curriculum/**`
  - `docs/08_testing/e2e_design.md`
- Tooling:
  - Native production bundle validator
  - Agentic QA preparation / patch application
  - Contract tests
  - Training workflow contract / template

### 2.3 Main flow

```text
Audit Finding
  ↓
Latest mainで再確認
  ↓
Normative / Executable Contractを確定
  ↓
Root Cause単位の小さな修正
  ↓
Focused Test
  ↓
必要なRuntime Before/After確認
  ↓
Required Gate / Native Gate
  ↓
独立PRとしてmerge
```

### 2.4 Key abstractions

- Product Behavior Oracle: `docs/spec/**`
- Executable low-level Oracle: 各Specの`Executable Canonical Sources`
- Customer identity/session: Application / Native Runtime composition
- Authorization: Application Use Case + presentation route boundary
- Checkout truth: persisted Order / Payment state
- Storefront truth: Catalog Application contract / repository result
- Native Test Control: deterministic QA setup。検証のためだけにscopeを広げない。
- CI / Training machine contract: workflow contract tests / repository policy

### 2.5 Existing tests / evidence

- Unit / Integration / Repository Contract / Component / Contract tests
- Playwright Web E2E / Cross-role / Accessibility / Mobile Boundary
- Native Jest Component tests
- Maestro Native flows
- Native production bundle validation
- Agentic QA deterministic preparation tests
- `validate:spec` / `validate:spec-visuals:final` / `validate:curriculum`

### 2.6 Safe change surface

- 既存Application / Repository / Presentation contractへ局所修正する。
- 既存Test LayerにRegressionを追加する。
- Current Specificationが誤っているFindingは最小のDocument mapping修正に留める。
- Tool failureはToolをContractへ合わせ、ContractをToolへ合わせない。
- Phase 3 Backendへ先回りした抽象化を作らない。

### 2.7 Assumptions

- 実装開始時に各Sliceを最新`main`へrebaseし、他PRで既に修正済みならそのSliceを`already-fixed`へ変更する。
- Cross Browser CI split branchはR13以外のSliceをBlockしない。
- Runtime検証用に新しいProduct capabilityやTest Control capabilityを追加する必要がある場合、それは原則このPlanのscope外とする。
- MCPのavailabilityは環境依存であり、利用不能そのものをProduct/Test defectとは扱わない。

### 2.8 Unknowns

- REP-013のraw expected-failureとchecker wrapperの責務分離が意図的か。
- REP-017のGitHub Ruleset / Branch Protection実設定がNative main assuranceを十分に保証しているか。
- MNT-003をCurrent Production Hermes Artifactに対して最小かつfail-closeで検証する実装方式。

## 3. 質問 / 曖昧性

### Blocking questions

全体Planを開始できないBlocking Questionはない。

ただし次の2項目は対象Sliceの変更判断前に確認する。

- REP-013: Current machine contractとCurriculumの責務分離が意図的ならコード変更しない。
- REP-017: GitHub Ruleset / Branch Protectionが保証済みならRepository変更しない。

### 仮定してよい細部

- 既存Boundary UXのどの画面を再利用するかは、Current route / UI patternを調査して最小の既存Patternを選択する。
- Test fileの配置は既存同種Testのconventionへ従う。
- MCP screenshot / raw log名は`.artifacts/<slice>/<run>/`配下で一意ならよい。

### 未回答の重要質問

- なし。REP-013 / REP-017は全体実装のBlocking Questionではなく、当該Sliceのconfirmation gateとする。

## 4. Non-goals

- Phase 3 Backend / Cloudflare Workers / D1実装。
- Native Admin追加。
- iOS Runtime/Maestro保証追加。
- Guest Checkout追加。
- UI全面リデザイン。
- Dependencyの不要なversion upgrade。
- Action SHA pinningへmajor/minor version upgradeを混ぜること。
- 全E2E再設計。
- Generated Artifact Framework新設。
- Agentic QA Runner / Orchestrator新設。
- Metro cache問題に対する無条件`--clear`導入。
- Historical Audit ReportのFinding削除・改番。
- MCP検証だけのためのNative Test Control Scenario拡張。

## 5. Scope / Impacted areas

### 5.1 必須対応

| ID | Root Cause | 判定 |
|---|---|---|
| REP-002 | Checkout resultがpersisted Order/Payment stateではなくroute kindを信用する | Must Fix |
| REP-001 | Native Customer CatalogがsessionではなくGuest actorで評価される | Must Fix |
| REP-006 | Native Customer-only direct routeでGuestをScreen実行前にguardしない | Must Fix |
| MNT-001 / REP-003 | Native StorefrontがCurrent common Storefront contractを満たさない | Must Fix |
| REP-004 | Web Search Suggestionが通常typingだけではdiscoverableにならない | Must Fix |
| REP-005 | Web Cart mutationが`cartId`と`itemId`の所属Invariantを検証しない | Fix |
| REP-007 | Login visual/spec stateのscenario mappingが矛盾する | Fix, minimal |
| REP-012 | Flow Jがshipment transition未確認でもPASSできる | Must Fix |
| MNT-003 | Native Production Bundle GuardがHermes `.hbc`でfalse negativeになる | Must Fix |
| MNT-002 / REP-018 | Agentic QA patchがWindows EOL差でstrict applyできない | Must Fix |
| REP-011 | Windows contract testsが5秒境界でfalse negativeになる | Fix, local |
| REP-016 | Training workflow action tagがRepository SHA-pin policyと矛盾する | Fix |
| REP-008 | Design System referenceがCurrent executable tokenとdriftする | Docs Fix |
| REP-010 | iOS CurriculumがCurrent Build-only Required Gateとdriftする | Curriculum Fix |
| REP-009 / REP-014 | `e2e_design.md`がCurrent-lookingな古いCI/E2E設計を保持する | Docs Fix, dependency blocked |

### 5.2 確認のみ。Defaultはコード変更なし

| ID | 確認事項 | Default |
|---|---|---|
| REP-013 | raw expected-failure Workflowとchecker wrapperの責務 | Current machine contractを維持。必要なら教材へ役割差だけ明記 |
| REP-017 | GitHub Ruleset / Branch ProtectionがNative main assuranceを保証するか | 保証済みならRepository変更なし |

### 5.3 今回の実装対象から外す

| ID | 理由 |
|---|---|
| MNT-004 | stale Metro cacheの環境依存再現。clean runnerで再現するまで防御層追加を必須化しない |
| REP-015 | Current generated outputsは同期済み。将来drift detection改善であり、現時点の必須修正ではない |
| MNT-005 | Exact Review body mappingはComponent Testで保証済み。Maestroはsave journey保証として成立する |
| REP-019 | pre-existing user-owned local PNG。Repository defectではない |

### 5.4 Files to inspect

実装開始時にRoot Causeごとに最低限次を再確認する。

- REP-002:
  - `docs/spec/features/checkout-and-payment.md`
  - Checkout / Order use cases
  - Web / Native Checkout result screens
  - related Component / E2E / Maestro tests
- REP-001:
  - Native Runtime composition
  - Identity / Session abstraction
  - Catalog use case construction
  - Native Catalog Component / Contract tests
- REP-006:
  - Native Shell / Expo Router boundary
  - `docs/spec/roles-and-permissions.md`
  - Native deep-link tests
- MNT-001 / REP-003:
  - `docs/spec/features/storefront.md`
  - `docs/spec/features/native-customer.md`
  - Native Catalog/Search UI
  - Catalog Application / SQLite contract
- REP-004:
  - Web Search / ComboBox component
  - Component / Playwright tests
- REP-005:
  - Web Dexie cart repository
  - Repository contract tests
- REP-007:
  - Authentication Spec
  - visual registry / setup
  - `validate:spec` contracts
- REP-012:
  - Cross-role lifecycle Flow J
- MNT-003:
  - Native production bundle validator
  - Production Hermes build output
  - module-resolution / runtime boundary tests
- MNT-002 / REP-018:
  - Agentic QA preparation / patch artifact generation / apply boundary
- REP-011:
  - affected contract tests only
- REP-016:
  - Training workflow template
  - `APPROVED_TRAINING_ACTIONS`
  - repository security/action policy
- REP-008 / REP-010 / REP-009 / REP-014:
  - affected docs and their Current Canonical Sources

## 6. Current Contractから確定できる判断

### 6.1 Oracle Priority

- Product BehaviorはNormative Specificationを正本とする。
- ただしRoute / App ID / Test ID / Accessibility Label / Seed ID / Design Token / Build Config等、SpecがExecutable Canonical Sourceへ委譲している低レベル値はCode / Configを正本とする。
- TestやREADMEをProduct Behavior Oracleへ昇格させない。

### 6.2 Native StorefrontはDecision Gateにしない

Current Storefront SpecはWeb/Native共通BehaviorとしてKeyword、Category、Brand、価格、在庫、Sale、最低評価、total/pageを要求する。Native Customer SpecもNative専用の簡略業務Ruleを作らないと定義する。

Known Deviationがないため、実装開始時点でNormative変更が入っていなければMNT-001 / REP-003は既存Contractへの復元として修正する。

### 6.3 REP-007はScenario mappingだけを第一選択とする

Current visual registryはLogin `validation-error`を`submit empty login form`で生成している。一方Specは同Stateへ`storage-write-failure`を関連付けている。

第一選択はSpecのCondition/Scenarioを実際のrequired-field validationへ合わせること。Storage Failure Canonical Visualを別BR/ACが明示要求しているEvidenceがない限り、新Scenario / 新Screenshotは作らない。

### 6.4 MNT-003ではNormative Contractを弱めない

Production BundleでMarker / Module / Screen / Serviceが存在しないというCurrent Contractを維持する。

Current validatorがHermes `.hbc`をUTF-8 raw textとして読む方式を修正し、**Actual Production Hermes Build Outputそのもの、またはそこから決定的に導出されるArtifact graphを必ず検証対象に含める**。

`--no-bytecode` JavaScript projectionだけをProduction Hermes Bundleの代替Evidenceにして完了しない。

### 6.5 REP-002の不整合時UXはPlanで新規決定しない

Checkout Complete / FailedはOrder ownershipとpersisted Payment / Order stateを検証し、route kindと矛盾する成功/失敗表示を出してはならない。

ただし不整合時の遷移先をPlanだけで`error` / `not-found`へ固定しない。Current RepositoryのBoundary UX / Route patternを確認し、既存Contractに最小で整合する既存Patternを使用する。

## 7. Change strategy / 推奨PR Slice

原則は1 Root Cause = 1 PR。関連領域でもRoot Causeが異なる場合は分ける。

| Slice | Suggested branch | Findings | 備考 |
|---|---|---|---|
| R1 | `fix/checkout-result-state-integrity` | REP-002 | 最優先 |
| R2a | `fix/native-customer-catalog-actor` | REP-001 | R3の前提 |
| R2b | `fix/native-customer-route-guard` | REP-006 | R2aと独立 |
| R3 | `fix/native-storefront-contract-parity` | MNT-001, REP-003 | R2a merge後を推奨 |
| R4 | `fix/web-search-suggestion-open-state` | REP-004 | 独立 |
| R5 | `fix/cart-item-ownership-invariant` | REP-005 | 最小predicate + test |
| R6 | `fix/auth-visual-state-contract` | REP-007 | Spec/registry mapping中心 |
| R7 | `test/cross-role-shipment-oracle` | REP-012 | Product変更なしを基本 |
| R8 | `fix/native-production-bundle-guard` | MNT-003 | Current Hermes artifact evidence必須 |
| R9 | `fix/agentic-qa-patch-portability` | MNT-002, REP-018 | Windows/Linux EOL |
| R10 | `test/windows-contract-timeout-budget` | REP-011 | affected testsのみ |
| R11 | `fix/training-workflow-action-pinning` | REP-016 | version upgradeしない |
| R12a | `docs/design-token-alignment` | REP-008 | executable tokenへ同期 |
| R12b | `docs/ios-curriculum-gate-alignment` | REP-010 | Current Build-only Required Gateへ同期 |
| R13 | `docs/e2e-design-supersession` | REP-009, REP-014 | `BLOCKED_BY_DEPENDENCY` |
| C1 | confirmation only | REP-013 | 原則コード変更なし |
| C2 | GitHub settings check | REP-017 | 保証済みなら変更なし |

### Dependency

R13は次をdependencyとする。

```text
qa-training-store-ci-chromium-required-cross-browser-split
  ↓ mainへmerge
R13開始前に最新mainへrebase
  ↓
e2e_design.mdを再評価
```

R13以外はこのdependencyを理由に止めない。

## 8. 実行順序

```text
R1 Checkout integrity
  ↓
R2a Native Catalog actor
  ├─→ R3 Native Storefront contract
  └─ independent of R2b
R2b Native route guard
  ↓
R4 / R5 Web behavior / persistence
  ↓
R6 / R7 Spec/Test oracle
  ↓
R8 / R9 / R10 Tooling reliability
  ↓
R11 Training security policy
  ↓
R12a / R12b Current docs/curriculum
  ↓
R13 after Cross Browser CI split merge
```

依存がなく同一fileを触らないSliceは別worktreeで並列化してよい。

## 9. 実装タスク

### Wave 0 — Rebaseline

- [ ] 最新`main`へrebaseする。
- [ ] 各Findingを`open / already-fixed / changed-by-other-work`へ再分類する。
- [ ] Cross Browser CI split branchのCurrent statusを確認する。
- [ ] SliceごとにFiles / Existing tests / Safe change surfaceを再確認する。
- [ ] Repository契約に従って実装Run Artifactを初期化する。

### R1 — Checkout result state integrity

- [ ] Web/NativeでOrder ownership、`orderStatus`、Payment状態、retry可能状態をExisting DTO / use caseから取得する。
- [ ] route `complete/failed`を状態の正本として信用しない。
- [ ] persisted stateとroute expectationが矛盾する場合、contradictory success/failureを表示しない。
- [ ] 不整合時はCurrent Boundary UX / Route patternを確認し、最小の既存Patternへ接続する。
- [ ] Retryは実際にretry可能なstateだけで表示する。
- [ ] Native Completeは`orderId`なしで成功表示しない。
- [ ] paid→failed route、failed→complete route、missing ID、ownership negativeをRegressionへ追加する。

実装原則:
- 新Payment State Machineを作らない。
- Existing Order DTO / use caseを使用する。
- Retry idempotencyを弱めない。

### R2a — Native Customer Catalog actor

- [ ] Catalog viewerをCurrent Sessionから解決するExisting Identity abstractionへ接続する。
- [ ] Guest / regular / gold / platinumのviewer/rank mappingをComponent / Contract Testで固定する。
- [ ] rank visibility / membership pricingがCurrent customer sessionへ従うことを確認する。
- [ ] Runtime確認だけのために`gold-member` / `platinum-member` Native Test Control Scenarioを追加しない。

### R2b — Native Customer route guard

- [ ] Customer-only route判定をShell / route boundaryへ集約する。
- [ ] Guest direct Customer routeは既存Login boundaryへ送る。
- [ ] unsupported management roleは既存Native unsupported / forbidden boundaryへ送る。
- [ ] Profile / Address / Order / Checkoutの代表deep-link negative caseを追加する。
- [ ] 各Screenへredirect logicを複製しない。

### R3 — Native Storefront contract parity

- [ ] Current Storefront SpecとKnown Deviationを再確認する。
- [ ] Suggestion、Brand、Price range、Pagination、Facet/totalをCurrent service surfaceへ最小追加する。
- [ ] Native Catalog/Searchの固定`[]` / `null` / `page: 1`をUI stateへ接続する。
- [ ] Product List/SearchでCurrent Contractのfilter/pageを操作できる最小UIを実装する。
- [ ] Underlying SQLite / Application contractを再利用し、Web UIをpixel-copyしない。
- [ ] Native Component / Contract / Maestroへ代表Regressionを追加する。

必要ならSuggestionとFilter/Paginationを別PRへ分割してよい。

### R4 — Web Search Suggestion

- [ ] async suggestion到着後のComboBox open-stateをReact Aria contractに沿って制御する。
- [ ] 2文字未満、no-result、stale async request、Enter、Arrow navigationを維持する。
- [ ] Component TestをArrowDownなしの通常typingから開始し、候補がdiscoverableになることをassertする。
- [ ] pointer / keyboard / mobile-widthの代表interactionをRuntimeで確認する。

### R5 — Cart ownership invariant

- [ ] Dexie update/deleteでmutation前に`currentItem.cartId === currentCart.id`を検証する。
- [ ] 2 Cart + foreign item negative repository testを追加する。
- [ ] Native SQLと同等のownership semanticsを必要な範囲で合わせる。
- [ ] Phase 3 Backendへ先回りしたRepository abstraction再設計はしない。

### R6 — Login visual/spec mapping

- [ ] `SCREEN-AUTH-LOGIN/validation-error`のCondition/Scenarioを実際のempty submit required validationへ合わせる。
- [ ] Visual RegistryとSpecのState slug / Expected UI / setupを同じ意味へ揃える。
- [ ] Storage Failure Canonical Visualを既存BR/ACが要求していない限り、新Scenario / 新Screenshotは追加しない。
- [ ] `validate:spec` / visual contractを通す。

### R7 — Flow J false-green

- [ ] `button existsならtransition、無ければskip`を廃止する。
- [ ] Initial shipment/order stateを明示assertする。
- [ ] transition前stateなら操作して結果をassertする。
- [ ] 既に許可されたpost-stateならそのstateを明示assertする。
- [ ] 想定外stateはFAILする。

### R8 — Native Production Bundle Guard

- [ ] Current Production Marker / Module / Screen / Service非存在Contractを維持する。
- [ ] Hermes `.hbc`をUTF-8 raw textとして読むCurrent方式を置き換える。
- [ ] **Actual Production Hermes Build Outputそのもの、またはそのOutputから決定的に導出されるArtifact graphを必須Evidenceにする。**
- [ ] `--no-bytecode` projectionだけをProduction Hermes Bundleの代替Evidenceにしない。
- [ ] Existing static module-resolution contract、Artifact graph、runtime Test Control unavailable、Hermes-aware inspection等を比較し、最小でfail-closeする組合せを選ぶ。
- [ ] Automation buildをfalse negativeにしないPositive Controlを維持する。
- [ ] ProductionへTest Control/Harnessが漏れた場合にFAILするNegative Controlを維持する。

### R9 — Agentic QA patch portability

- [ ] Patch artifactのLF contractを明示する。
- [ ] line-ending normalization boundaryを1箇所に限定する。
- [ ] 高コストPreparation前にstrict `git apply --check`相当のfast preflightを入れる。
- [ ] malformed patchを許容する`--ignore-whitespace`常用はしない。
- [ ] Windows CRLF checkout caseとLinux LF caseをdeterministic testで固定する。

### R10 — Windows contract timeout

- [ ] 対象2系統だけをWindowsで2〜3回程度boundedに再実行する。
- [ ] Fixture生成costを簡単に削減できる場合は先に削減する。
- [ ] それでも5秒境界へ到達するcaseだけexplicit per-test timeoutを設定する。
- [ ] global timeoutは変更しない。
- [ ] retryでGreenにしない。

p95測定やBenchmark基盤は作らない。

### R11 — Training Action SHA pinning

- [ ] 各remote actionについてOfficial upstreamでCurrent tag/versionとfull commit SHAを照合する。
- [ ] Current versionのSecurity Advisory有無を確認する。
- [ ] 同versionのfull SHAへpinする。
- [ ] SHA横のcommentでversion readabilityを維持する。
- [ ] `APPROVED_TRAINING_ACTIONS`をexact SHA allowlistへ変更する。
- [ ] mutable tagを拒否するContract Testを追加する。
- [ ] Security理由でversion upgradeが必要だと判明した場合、今回のpinningへ混ぜず別対応として切り出す。

### R12a — Design System document alignment

- [ ] Current executable token / breakpoint / image ratioを正本として`docs/05_ui/design_system.md`を同期する。
- [ ] Codeを古いDocument値へ戻さない。
- [ ] token→Markdown自動生成基盤を作らない。

### R12b — iOS Curriculum alignment

- [ ] iOS CurriculumをCurrent reusable Build-only Required Gateへ同期する。
- [ ] `workflow_call` + Native `verify` dependencyを正しく説明する。
- [ ] iOS Runtime/Maestro保証へ拡大しない。

### R13 — E2E design supersession

Status: `BLOCKED_BY_DEPENDENCY`

Dependency: `qa-training-store-ci-chromium-required-cross-browser-split` が`main`へmergeされること。

merge後に:

- [ ] 最新`main`へrebaseする。
- [ ] `docs/08_testing/e2e_design.md`をCurrent documentとして継続更新する価値があるか再評価する。
- [ ] DefaultはHistorical / Superseded classificationとし、Current CI正本へのリンクを明示する。
- [ ] Currentとして残す明確な理由がある場合だけ最新suite/count/triggerへ更新する。
- [ ] REP-009 / REP-014は1 Root Causeとして一度だけ対応する。

## 10. Confirmation tasks

### C1 — REP-013 Training expected-failure responsibility

コード変更を前提にしない。

- [ ] raw `training:web:expected-failure`がCIで意図的に赤いFailureを体験する入口、wrapperがExpected Failure Evidence Contract Checkerという責務分離か確認する。
- [ ] Current machine contractと教材意図が一致するならコードは変更しない。
- [ ] 必要ならCurriculumへ役割差を短く明記する。
- [ ] EvidenceなしにWorkflowをwrapperへ置換しない。

### C2 — REP-017 Native main assurance

- [ ] GitHub Ruleset / Branch Protection実設定を確認する。
- [ ] `main` direct push禁止 + Native PR check requiredなら変更なし。
- [ ] direct pushが許可される場合だけRuleset強化を第一候補として検討する。
- [ ] push Native CI追加はRulesetだけで保証できない場合の次案とする。

## 11. Deferred / No-op

### MNT-004 — Web stale Metro cache

Current implementation taskへ入れない。

追加対応する条件:

1. clean GitHub-hosted runnerまたはcontrolled clean environmentでroute-less exit 0が再現する、または
2. existing smokeより前の段階でinvalid artifactが実運用上流出するEvidenceが得られる。

### REP-015 — Generated image manifest

Current filesは同期済み。実際のdrift事故、レビュー事故、CIでのsource overwrite問題がmaterializeするまではFollow-up improvementとする。

### MNT-005 — Native Review oracle

Exact body mappingはComponent Testで保証済み。MaestroはReview save journeyを保証する責務として扱い、IME入力変換だけを理由にLower-layer assertionを重複追加しない。

### REP-019

Repository changeなし。

## 12. MCP / Runtime検証方針

### 12.1 共通Contract

Runtime Findingは原則として同じ操作でBefore / Afterを比較する。

```text
latest mainでFindingを再現
  ↓
修正
  ↓
同じMCP/Runtime操作を再実行
  ↓
Findingが消え、正常経路が維持されることを確認
```

対象の中心:

- R1 Checkout
- R2a Native Catalog actor
- R2b Native route guard
- R3 Native Storefront
- R4 Web Search Suggestion
- R7 Flow J

### 12.2 Playwright-MCP

Web関連では可能な範囲で以下を確認する。

- Main pathとFinding reproduction path。
- Direct URL / reload / back / repeated action。
- pointer / keyboard / touch相当のinteraction。
- Error / Empty / opposite-state / unauthorized boundary。
- DOM / ARIAだけでなくRendered UIを視覚確認。

### 12.3 Maestro-MCP

Native関連では可能な範囲で以下を確認する。

- launch / deep link / navigation。
- login / session。
- tap / input / scroll。
- state transition。
- invalid direct route。
- Storefront Suggestion / Filter / Pagination。
- Checkout Complete / Failed boundary。

Gold/Platinumについて:

- actor semantics / price / visibilityはComponent / Contract Testで必須検証する。
- Current deterministic Native setupで安全にRuntime状態を作れる場合のみMaestro-MCPでも確認する。
- `NATIVE_CUSTOMER_SCENARIOS`にGold/Platinumがない現状で、Runtime検証だけを目的にTest Control Scenarioを拡張しない。
- 安全な既存setupがない場合、Runtime確認は`BLOCKED`として記録し、Component / Contract EvidenceでProduct contractを保証する。

### 12.4 Visual Inspection

実画面では最低限以下を確認する。

- false success / false failure表示が残っていないか。
- missing / unauthorized stateが正常画面に見えないか。
- Search popupがtyping後に表示されるか。
- Native Filter / Paginationが操作可能か。
- error / retry UIが正しいstateだけで出るか。
- layout overlap / clipping / text truncation / modal overflow等の副作用がないか。

主観的なデザイン改善は混ぜない。

### 12.5 MCP Evidence保存契約

- screenshot / trace / raw MCP log / ADB logcat等は原則`.artifacts/<slice>/<run>/`へ保存する。
- Repository rootへRuntime screenshotやraw logを出さない。
- `.codex/runs/**/REPORT.md`とPR本文には再現条件、操作、結果、Artifact参照の要約だけを書く。
- 一時Evidenceを正式Run Artifactとして長期保存しない。

### 12.6 MCPが利用不能な場合

- 利用不能理由をRun Artifact / PRへ記録する。
- 未実行をPASS扱いしない。
- Existing CLI / Playwright / Maestro / ADB等の最も近いRuntime手段で代替する。
- MCP環境構築だけのために本PlanのScopeを広げない。

## 13. Validation plan

### Global

Focused Validationを先に行い、PR完了時は変更に対応するRequired Gateを省略しない。

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

### R1 Checkout

- Web/Native Component:
  - paid + failed route
  - failed + complete route
  - missing orderId
  - unauthorized / not-found boundary
  - retryable state only
- Playwright-MCP / Maestro-MCP:
  - pre-fix reproduction
  - post-fix same-operation verification
  - normal success/failure regression
- Rendered result screen確認。

### R2a Native Catalog actor

- Guest / regular / gold / platinum actor mappingをComponent / Contractで必須確認。
- Current deterministic setupで可能な範囲のみMaestro-MCP Runtime確認。
- RuntimeのためだけにGold/Platinum scenarioを追加しない。

### R2b Native route guard

- Guest direct Customer route。
- unsupported management role。
- Maestro-MCPでpre/post deep-link behavior確認。

### R3 Native Storefront

- Component / Contract。
- Suggestion / Brand / Price / Pagination代表case。
- many-products scenario。
- Maestro-MCPでFilter / Pageを実操作。
- result / totalと条件の一致、Rendered controls確認。

### R4 Search Suggestion

- Component normal typing / no result / stale request。
- Playwright-MCPでpre-fix reproductionとpost-fix同一typing確認。
- mouse / keyboard / mobile-width。
- `aria-expanded`だけでなく候補の実表示を確認。

### R5 Cart

- 2 Cart foreign-item Repository Test。
- 正常update/delete regression。

### R6 Spec / Visual

- `pnpm run validate:spec`
- `pnpm run validate:spec-visuals:final`
- 必要な場合だけPlaywright-MCPでempty submit state再確認。

### R7 Flow J

- focused Playwright run。
- pre-fix silent-pass reproductionが安全に可能なら記録。
- post-fix transition前後の状態確認。
- Missing controlでsilent PASSしないこと。

### R8 Native Bundle Guard

- Automation Positive Control。
- Production Negative Control。
- **Actual Production Hermes Build Output / derived artifact graph evidence。**
- module / surface contract。
- Runtime Test Control unavailable確認が適用可能なら実施。

### R9 Agentic QA

- fast strict patch preflight。
- `pnpm run test:agentic-qa:preparation`。
- Windows EOL fixture。
- Linux CI control。

### R10 Timeout

- affected testsをWindowsでbounded repeat。
- no retry-based green。
- global timeout unchanged。

### R11 Training Action pinning

- official upstream tag→SHA照合。
- Security Advisory確認。
- Training workflow contract。
- mutable tag negative test。
- version未変更をdiffで確認。

### R12a / R12b / R13 Docs

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum` when relevant
- `pnpm run validate:spec` when relevant
- Path / command / workflow referencesをCurrent Repositoryと照合。

## 14. Risks

1. **Native Storefront scope creep**
   - semantic contract parityだけを要求し、Web UI pixel parityは要求しない。
2. **Checkout過剰抽象化 / UX新設**
   - Existing Order DTOとCurrent Boundary patternを優先し、新State Machineや新Boundary UXを作らない。
3. **Native auth guard重複**
   - Shell / route boundaryへ集約する。
4. **Hermes guard弱体化**
   - ToolをContractへ合わせ、Actual Production Hermes Artifact由来Evidenceを必須にする。
5. **Patch strictness低下**
   - LF normalization/provenanceを直しstrict applyを維持する。
6. **Timeout対応の過剰調査**
   - bounded reproductionで十分。Benchmark基盤を作らない。
7. **Concurrent CI workとの競合**
   - R13だけCross Browser CI split merge後に実施する。
8. **Phase 3 Backendとの二重投資**
   - REP-005は局所Invariantだけ修正する。
9. **MCP availability依存**
   - unavailableは記録し、既存Runtime手段で代替する。
10. **MCP検証のためのscope creep**
   - Gold/Platinum等のTest Control拡張を検証目的だけで追加しない。

## 15. Open questions

- REP-013: Training raw failure / checker wrapperの責務分離。C1で確認する。
- REP-017: GitHub Ruleset / Branch Protection実設定。C2で確認する。
- MNT-003: Actual Production Hermes Artifactへ対する最小fail-close検証方式。R8実装調査で決定する。

いずれも他Slice開始の全体Blockerではない。

## 16. Follow-up notes

- MNT-004はclean environmentで再現Evidenceが追加された場合のみ再評価する。
- REP-015はgenerated output drift事故がmaterializeした場合にread-only drift checkを再検討する。
- MNT-005はFormal Native E2Eの責務を将来「exact persisted body」まで拡張する場合のみ再評価する。
- REP-019はRepository対応へ戻さない。
- R13はCross Browser CI splitがmainへmergeされた後だけ開始する。

## 17. 優先順位

### Must Fix first

1. REP-002 — Checkout result state integrity
2. REP-001 — Native Catalog actor
3. REP-006 — Native route guard
4. MNT-001 / REP-003 — Native Storefront parity
5. MNT-003 — Native Production Bundle Guard
6. MNT-002 / REP-018 — Windows Agentic QA patch portability
7. REP-012 — Flow J false-green
8. REP-004 — Web Search Suggestion

### Next

9. REP-005 — Cart ownership invariant
10. REP-007 — Login spec/visual mapping
11. REP-011 — Windows local timeout budget
12. REP-016 — Training remote action SHA pinning
13. REP-008 — Design System docs
14. REP-010 — iOS Curriculum

### Dependency blocked

15. REP-009 / REP-014 — E2E design Historical/Superseded classification

### Confirmation only

- REP-013
- REP-017

### Deferred / no change

- MNT-004
- REP-015
- MNT-005
- REP-019

## 18. 実装時の停止条件

- 全Root Causeを1つの巨大PRへ入れない。
- 各SliceはFocused Validation + Required Gateを通したら独立merge可能とする。
- MCPで新しいMaterial Findingを発見しても、今回Root Causeのaffected areaか別Root Causeかを判定する。
- 別Root Causeならついで修正せず別対応へ分離する。
- Deferred itemは明確な追加Evidenceがない限り実装しない。
- Dependency update、UI redesign、大規模Refactorを追加しない。
- Current Product ContractにないUXをPlan都合で新設しない。

## 19. 成果物

### Plan branch

- Branch: `plan/repository-audit-remediation`
- Plan: `docs/plans/2026-08-21_002300_repository_audit_remediation.md`
- Planning Run Artifact: `.codex/runs/20260821-174900-JST/`

### 実装時

- Root Causeごとの必要最小限のProduct / Test / Tooling / Docs変更。
- Existing Test Layerに沿ったRegression Test。
- Repository契約で必要なRun Artifact。
- MCP raw evidenceは`.artifacts/<slice>/<run>/`へ保存し、Run Artifact / PRには要約だけを記録する。
- PR本文へFinding ID、Before/After Runtime Evidence、未実行項目、残Riskを記録する。

### 変更しないもの

- PR #35のAudit ReportはHistorical Evidenceとして原則変更しない。
- Deferred / No-op項目をFinding数合わせのために実装しない。
