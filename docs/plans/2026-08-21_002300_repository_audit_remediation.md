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
  - 同じ変更面・依存関係を持つFindingは無理に別PRへ分割せず、レビュー可能な最小の実装単位へまとめる。
  - Product/UI/NativeのBehavior修正は、可能な限りPlaywright-MCP / Maestro-MCPを使い、修正前後の実Runtimeを確認する。
  - 実装Agentが安全なfeature branch上で`git add` / `git commit` / 通常の`git push`まで進められるよう、既存Common Git Safety Policyと上位Repository Policyの不整合を実装開始前に解消する。

## 1. Goal / Definition of Done

### Goal

Current Product Contract、Repository Policy、Executable Contractに反する問題だけを、必要最小限の変更で修正する。

### Definition of Done

1. G0でSafe Git Write Policy Alignmentを先に完了し、Parent Codexがfeature branch上で確認済み差分を`git add` / `git commit` / 通常の`git push`できる契約へ揃えている。
2. `main` / `master`等のprotected branchへの直接commit / push、force push、remote ref削除、history rewrite、PR mergeは引き続き禁止されている。
3. 各実装Group開始時に`git fetch`等で最新`origin/main`を確認し、対象Findingの存続とCurrent Contractとの差分をrebaselineしている。state-changing rebaseは自動実行しない。
4. Product BehaviorはNormative Specificationへ一致する。
5. Route / App ID / Test ID / Seed ID / Design Token / Build Config等、SpecがExecutable Canonical Sourceへ委譲する低レベル値はCode / Configへ一致する。
6. Test修正でassertion弱体化、無条件retry、global timeout増加、failure maskingを行っていない。
7. Runtime Findingは、可能な場合、最新`main`相当でBeforeを再現し、修正後に同じ操作でAfterを確認している。
8. MCPが利用可能な場合は積極的に使用し、Findingに関係するRendered UIを確認している。
9. MCPが利用不能な場合は未実行をPASS扱いせず、代替Runtime Evidenceと理由を記録している。
10. MNT-003はActual Production Hermes Build Outputそのもの、またはそこから決定的に導出されるArtifact graphをEvidenceに含めている。
11. Production isolation surfaceを変更するNative PRはR8を先にmainへmergeしている。通常のNative Product変更はR8と並行して開発可能だが、Current Native Production Build + Maestro production-validationの実Job成功を必須とする。
12. Native変更PRはNative CIの実Jobを実行し、docs-only skipを代替Evidenceにしない。
13. Required CIがGreenである。
14. Deferred / No-op項目を「ついで」に実装していない。
15. PRはRoot Cause数ではなく変更面・依存関係・Validation単位で切り、無関係な領域だけを同じPRへ混ぜない。
16. Run Artifact、MCP Evidence、PR本文がRepository契約に従っている。

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
- Current Common Hook `.codex/hooks/pre_tool_use_policy.mjs` は、feature branch上の通常`git add` / `git commit` / `git push`を許可し、rebase、commit amend、force push、remote ref削除、protected branch直接更新等を拒否するContractを既に持つ。
- `.codex/rules/README.md`も通常の`git add` / `git commit` / `git push`をCommon Rulesでblanket forbiddenにしない方針を記載している。
- 一方でCurrent `AGENTS.md`と`.codex/rules-auto-net/30-auto-net-forbidden.rules`は通常の`git add` / `git commit` / `git push`まで禁止しており、Common Git Safety Policyと上位実行契約が不整合である。
- ユーザー方針として、安全なfeature branchで`git add` / `git commit` / 通常の`git push`は許可し、PR mergeは実施しない。

## 3. Assumptions / Non-goals / Open Questions

### Assumptions

- 実装時は各Preferred implementation group開始前に`git fetch`等で最新`origin/main`を確認し、Findingと変更面をrebaselineする。
- state-changing rebaseは自動実行しない。Current branchの統合方法に判断が必要なら、履歴を書き換えずに停止してParent/ユーザー判断へ戻す。
- 他PRで既に修正済みなら、そのFindingを`already-fixed`へ変更する。
- Runtime検証のためだけにProduct capabilityやTest Control capabilityを追加しない。
- MCP availabilityは環境依存であり、MCP unavailable自体をProduct defectにしない。
- Git writeはParent Codexが担当し、`implementation_worker`は引き続きParent-defined scope内のSource編集だけを担当する。
- Parent CodexはValidationと差分確認後、確認済みの明示Pathだけをstageする。`git add .` / `git add -A` / `git add --all`は使わない。
- PR作成はユーザーが明示的に依頼した場合だけ実施する。PR mergeは実施しない。

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
- Native Suggestionだけのための新しいCancellation / Request orchestration framework。
- Confirmation-only Findingの確認結果だけを理由にしたCurriculum / Workflow / executable contract / external settingsの自動変更。
- PR mergeの自動化。
- force push / force-with-lease、remote branch削除、mirror、history rewrite、`git reset --hard`、`git clean`、`git rm`の許可拡大。
- state-changing rebase / commit amendの許可拡大。
- Git操作専用の新Wrapper / Orchestrator Framework新設。
- Audit ReportのFinding削除・改番。

### Open Questions

- REP-013: raw expected-failure Workflowとchecker wrapperの責務分離が意図的か。
- REP-017: GitHub Ruleset / Branch ProtectionがNative main assuranceを十分に保証しているか。
- MNT-003: Actual Production Hermes Artifactへ対する最小fail-close検証方式。

上記は全体Blockerではなく、該当Finding / Groupのconfirmation gateとする。

## 4. Repo Mapping

### Entry points / Safe change surface

- Safe Git write policy:
  - `AGENTS.md`
  - `.codex/rules/README.md`
  - `.codex/rules-auto-net/10-auto-net-allow.rules`
  - `.codex/rules-auto-net/30-auto-net-forbidden.rules`
  - `.codex/hooks/pre_tool_use_policy.mjs`（Current safety contractの確認対象。新要件不足がない限り変更しない）
  - `tests/contracts/codex-hook-contract.test.ts`
  - auto-net / execpolicy関連の既存Contract Test
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

Safe Git write:

```text
Parent validates scope + diff + tests
  → git add -- <explicit confirmed paths>
  → normal git commit on feature branch
  → normal git push to same feature branch
  → PR creation only when explicitly requested
  → PR merge is never performed
```

Product Runtime:

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

- Parent Codex / `implementation_worker` responsibility boundary
- Common PreToolUse Git Safety Policy
- auto-net execpolicy rules
- protected branch / feature branch boundary
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

- Codex Hook / execpolicy Contract tests
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

| Slice / Group | Primary files / areas |
|---|---|
| G0 | `AGENTS.md`、`.codex/rules/README.md`、`.codex/rules-auto-net/10-auto-net-allow.rules`、`.codex/rules-auto-net/30-auto-net-forbidden.rules`、`.codex/hooks/pre_tool_use_policy.mjs`、Git policy Contract tests |
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

### Implementation prerequisite

#### G0 — Safe Git Write Policy Alignment

監査Findingではないが、本Planを実装Agentが安全に遂行するためのRepository execution contract整合として先に対応する。

- feature branch上の通常`git add` / `git commit` / `git push`をParent Codexへ許可する。
- protected branch直接更新、history rewrite、force push、remote ref削除、PR mergeは禁止を維持する。
- `implementation_worker`へGit write責務を広げない。
- PR作成はユーザー明示依頼時のみとする。

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

- C1 / REP-013: raw expected-failure / wrapper / Curriculumの責務をread-onlyで確認し、intentが確定しない限り変更しない。
- C2 / REP-017: GitHub settingsのread-only確認のみ。保証不足でもこのPlan中に設定変更しない。

### Deferred / No-op

- MNT-004: clean environmentで再現するまで実装しない。
- REP-015: Current generated outputsは同期済み。将来改善としてDefer。
- MNT-005: exact body mappingはLower Layerで保証済み。現状変更なし。
- REP-019: Repository defectではないため変更なし。

## 6. Implementation Groups / Dependencies

### Grouping principle

SliceはFinding追跡単位として残すが、PRはSlice数に合わせて機械的に増やさない。

同じPRへまとめてよい条件:

- 同じ主要ファイル / abstractionを変更する。
- 一方が他方の前提であり、分けると同じboundaryを連続して変更する。
- 同じValidationで安全に確認できる。

分ける条件:

- Product / CI / Docsなど責務が異なる。
- rollback / review riskが明確に異なる。
- merge dependencyが異なる。

### Preferred implementation groups

| Group | Included slices | 理由 |
|---|---|---|
| G0 | Safe Git Write Policy Alignment | 本Planの実装前提。既存Common Hookの安全境界へ`AGENTS.md` / auto-net policyを揃える。 |
| G1 | R1 | Checkout state integrityは独立したProduct boundary。 |
| G2 | R2a + R3 | Native Catalog/Storefrontの同じRuntime・UseCase・Gateway・Repository・SQLiteを連続して変更し、R3はR2aを前提とする。 |
| G3 | R2b | Route authorizationはStorefront data pathと別boundary。 |
| G4 | R4 | Web Search UIの独立修正。 |
| G5 | R5 | Cart repository invariantの独立修正。 |
| G6 | R6 | Spec/visual mappingの独立修正。 |
| G7 | R7 | Test Oracleのみの独立修正。 |
| G8 | R8 | Native Production isolation tooling/CIの独立修正。 |
| G9 | R9 | Agentic QA patch portabilityの独立修正。 |
| G10 | R10 | Windows timeout false-negativeの局所修正。 |
| G11 | R11 | Training workflow SHA policyの独立修正。 |
| G12 | R12a + R12b | どちらも小さいCurrent-documentation alignmentで、Product codeを変更しない。 |
| G13 | R13 | Cross Browser CI split merge後のみ実施。 |

C1 / C2はread-only確認だけで終わり、Documentation / Workflow / executable contract / external settingsの変更やPR作成へ自動移行しない。

### G0 gate

- G0は他のwritable implementation groupより先に完了する。
- G0完了前は、Current Repository Policyどおり通常の`git add` / `git commit` / `git push`を自動実行しない。
- G0完了後はParent Codexだけが、確認済みfeature branchで`git add -- <explicit paths>` → normal commit → normal pushを実施してよい。
- `implementation_worker`は引き続きGit mutationを行わない。
- PR mergeはG0後も禁止する。

### Native Production isolation gate

R8は高優先度のtooling remediationとし、通常のNative Product修正の開発を一律にはBlockしない。

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

上記へ触れない通常のNative Product Presentation/Application修正はR8と並行して開発可能とする。ただしmerge判断に進む前にCurrent Native CIで、Actual Production-validation BuildとMaestro production-validationを含む実Job成功を必須とする。本PlanのAgent自身はPR mergeを実施しない。

### G2 dependency

G2内ではR2aのviewer context伝播を先に成立させ、その上でR3のStorefront parityを完成させる。PRは同一でも、実装順序とcommit単位は分けてよい。

### R13 dependency

R13は`qa-training-store-ci-chromium-required-cross-browser-split`がmainへmergeされるまで`BLOCKED_BY_DEPENDENCY`とする。

## 7. Change Strategy

### G0 — Safe Git Write Policy Alignment

目的:

- Current Common Hookが既に持つ「safe feature-branch writeを許可し、dangerous/protected updatesを拒否する」境界へ、`AGENTS.md`とauto-net rulesを整合させる。
- 実装Agentがコード修正・Validation後に安全なfeature branchへcommit / pushまで完結できるようにする。
- PR mergeや履歴破壊まで許可範囲を広げない。

方針:

1. `AGENTS.md`のGit write契約をParent / Workerで分離する。
   - Parent Codex:
     - 変更Scopeとdiffを確認する。
     - 必要なValidationを実行・解釈する。
     - 確認済みの明示Pathだけを`git add -- <paths>`でstageしてよい。
     - feature branch上で通常の`git commit`を実行してよい。
     - 同じfeature branchへ通常の`git push`を実行してよい。
   - `implementation_worker`:
     - Parent-defined scope内のSource編集だけを行う。
     - `git add` / `git commit` / `git push`は行わない。
2. stage-allを許可しない。
   - `git add .`
   - `git add -A`
   - `git add --all`
   は使用しない。
3. 次は引き続き禁止する。
   - protected branch (`main` / `master` / default branch)への直接commit / push
   - `git push --force` / `-f` / `--force-with-lease`
   - remote ref deletion / prune / mirror
   - state-changing `git rebase`
   - `git commit --amend`
   - destructive `git reset` / `git clean` / `git restore` / `git rm`
   - branch/tagの強制rewrite / delete
   - PR merge
4. PR作成は自動化しない。
   - ユーザーが明示的にPR作成を依頼した場合だけ作成してよい。
   - PRを作成してもmergeしない。
5. `.codex/rules-auto-net/30-auto-net-forbidden.rules`の通常`git add` / `git commit` / `git push` blanket forbiddenを除去する。
6. auto-netで通常Git writeを承認なしに実行させる必要がある場合だけ、`.codex/rules-auto-net/10-auto-net-allow.rules`へ最小のallow ruleを追加する。
   - destructive / protected caseはCommon HookとCommon forbidden rulesが引き続きfail-closeすることをContract Testで確認する。
   - auto-net allowをCommon safetyより優先させる設計にはしない。
7. `.codex/hooks/pre_tool_use_policy.mjs`はCurrent Contractでsafe add / commit / pushとprotected / destructive拒否を既に持つため、新しい安全要件不足が確認されない限り変更しない。
8. 新しいGit wrapper / Git workflow framework / worktree managerは作らない。

Rollback:

- G0のValidationでunsafeな許可拡大や既存safe modeの退行が確認された場合は、Product実装へ進まない。
- `AGENTS.md` / auto-net rulesの変更を前の内容へ通常のファイル編集で戻し、通常のfollow-up commitでrollbackする。
- rollbackに`git reset --hard` / rebase / force push / history rewriteを使わない。
- Common Hookは原則変更しないため、rollback中もprotected branch / force push等の防御を維持する。

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
- 既存の`ProductViewer` / Storefront query contractを優先し、Native専用viewer modelを新設しない。
- 可視性は既存`canViewerSeeProduct()`、価格は既存`effectiveUnitPrice()` / `viewerUnitPrice()`等のCurrent Domain semanticsを再利用する。
- Homeの商品可視性、Category/Brand count、Search result、Facet、Product Detail、rank restriction、membership pricingを同じviewer contractで揃える。
- Guest / regular / gold / platinumは、既存Test layerをrebaselineして不足する最小Regressionだけ追加する。全rankをComponent / Contract / Repositoryの各layerへ重複追加しない。
- Native専用の新Pricing rule / visibility ruleを作らない。
- Runtime確認だけのためにGold/Platinum scenarioを追加しない。

### R2b — Native Customer route guard

- Customer-only route guardをShell / route boundaryへ集約する。
- Guest direct routeは既存Login boundaryへ送る。
- unsupported management roleは既存forbidden / unsupported boundaryへ送る。
- Guestと代表的な非Customer roleでdeep-link negative caseを確認し、全role×全routeの組合せTestは作らない。
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
- Suggestion選択は既存の検索/商品導線へ接続する。
- async応答の前後入替が実際に起こり得る構造の場合だけ、最小のrequest sequence guard等で古い結果を表示しない。専用Cancellation frameworkは作らない。
- Underlying SQLite / Application contractを再利用し、Web Search UIのpixel copyはしない。
- 全dimensionは既存coverageをrebaselineし、不足するContractだけ追加する。Native Component Testは実際に追加・修正したUI controlとrequest mappingだけを確認し、Maestroは代表Filter + Pagination + Suggestionに限定する。

### R4 — Web Search Suggestion

- async suggestion到着後のComboBox open-stateをReact Aria contractに沿って制御する。
- 2文字未満、no-result、既存のstale request protection、Enter、Arrow navigationを維持する。
- Component TestはArrowDownなしの通常typingから開始する。
- RuntimeではFinding再現に必要な通常typingと代表的なkeyboard / pointer操作を確認する。網羅的なdevice/input matrixは作らない。

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

- Shipment / Order画面の実状態確認が必要な場合だけ補助的に使う。
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
- Standalone validatorだけ直してWorkflow内の同系統false-negativeを残さない。
- 既存validatorをWorkflowから再利用できるなら再利用し、Build Job / Runtime Jobごとの新しいinspection実装を増やさない。
- 新しい汎用Bundle Inspection Frameworkは作らない。
- `native-ci-workflow.test.ts`は旧`grep -aE`実装そのものを固定せず、corrected fail-close contractを固定するよう更新する。
- Actual Production Hermes Build Output、またはそこから決定的に導出されるArtifact graphを必須Evidenceにする。
- `--no-bytecode` projectionだけをProduction保証の代替にしない。
- Existing Automation Positive Control / Production Negative Control / Maestro production-validationを再利用し、新しい重複Harnessを作らない。

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
- mutable tagを拒否する既存Contract Testを更新、または不足する最小negative caseだけ追加する。
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

- `git fetch`等で最新`origin/main`とCurrent文書をrebaselineする。state-changing rebaseは自動実行しない。
- `docs/08_testing/e2e_design.md`を再評価する。
- DefaultはHistorical / Superseded classificationとする。
- Current CIの正本へのリンクを明記する。
- Current文書として残す明確な理由がある場合だけ最新suite/count/triggerへ同期する。
- REP-009 / REP-014は一度のdocs対応で閉じる。

## 8. Confirmation Tasks

### C1 — REP-013

- raw expected-failureとwrapperの責務分離をread-onlyで確認する。
- Current machine contract、package script、Curriculumの役割が一致しているならNo-opとして終了する。
- 意図が一意に確定できない場合は推測でWorkflow / wrapper / Curriculumを変更しない。
- 現在のEvidence、考えられる責務分離、必要な判断事項、推奨alignment案を報告する。
- Documentation / executable contract変更が必要なら、ユーザーの明示承認後に別対応として実施する。

### C2 — REP-017

- GitHub Ruleset / Branch Protection実設定をread-onlyで確認する。
- `main` direct push禁止 + 必要なNative PR checkがrequiredならNo-opとして終了する。
- 保証不足なら、現在値・不足している保証・推奨するRuleset / Branch Protection変更内容を報告する。
- GitHub Ruleset / Branch Protection自体はこのPlanの実装中に変更しない。
- push時Native CI追加などRepository側の追加実装も、確認結果だけを理由に自動追加しない。
- 設定変更や追加実装が必要なら、ユーザーの明示承認後に別対応として実施する。

## 9. MCP / Runtime Validation Contract

### Before / After

Runtime Findingは原則:

```text
latest main相当でFindingを再現
  ↓
修正
  ↓
同じ操作を再実行
  ↓
Finding消失 + 正常経路維持を確認
```

対象の中心:

- R1
- R2a / R3（G2）
- R2b
- R4

R7はFocused Playwrightが正本で、MCPは必要時の補助とする。

### MCPの使用範囲

- Findingの再現と修正確認に必要な操作だけを行う。
- direct URL / reload / back / pointer / keyboard / touch等は、対象Findingに関係するものだけ選ぶ。
- DOM / ARIAだけでなくRendered UIを確認する。
- MCPを理由に周辺機能の探索範囲を広げない。

### Native Runtime

- launch / deep link / navigation / session等は対象Findingに必要なものだけ使う。
- G2ではStorefrontの代表Filter / Pagination / Suggestionを確認する。
- R1ではCheckout Complete / Failed boundaryを確認する。

Gold/Platinum:

- Repository / Contract等のdeterministicな既存Test layerで必須保証する。
- Current deterministic Runtime setupで安全に作れる場合だけ追加確認する。
- Runtime確認のためだけにNative Test Control Scenarioを追加しない。

### Evidence storage

- screenshot / trace / raw MCP log / ADB logcatは`.artifacts/<group>/<run>/`へ保存する。
- Repository rootへ出さない。
- `.codex/runs/**/REPORT.md`とPR本文には要約だけ記録する。
- MCP unavailableをPASS扱いしない。

## 10. Validation Plan

### Global

まず変更箇所に対応するFocused Validationを実行する。その後、RepositoryのRequired Gate / PR Gateとして必要なcommandだけを実行する。

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

全Groupで上記を機械的に全部実行するという意味ではない。変更面とRepository gateに応じて選択し、CIで必須のものはCIへ委ねてもよい。

### Group / Slice-specific

- G0:
  - Common Hookの既存ALLOW: explicit-path `git add`、feature branch normal commit、feature branch normal pushを維持する。
  - protected branch direct commit / pushを拒否する。
  - force push / force-with-leaseを拒否する。
  - rebase / amend / destructive reset / clean / rmを拒否する。
  - auto-netの通常`git add` / `git commit` / `git push` blanket forbiddenを解消しつつ、Common Hook safetyがfail-closeすることを確認する。
  - `AGENTS.md`でParentだけがGit writeを担当し、`implementation_worker`はGit writeしないことをContractとして確認する。
  - PR mergeは禁止、PR作成は明示依頼時のみというContractを確認する。
- G1 / R1: opposite-state / missing ID / unauthorized + Web/Native Runtime Before/After。
- G2 / R2a: viewer contextがUseCase→Gateway→Repository→SQLiteまで保持され、Guest / regular / gold / platinum semanticsがCurrent Contractへ一致することを既存coverage + 不足する最小Regressionで確認する。
- G2 / R3: BR/AC全dimensionの既存coverageをrebaselineし、不足するContract/Componentだけ追加。SuggestionはUI→Service→UseCase→Gateway→Repository→SQLiteのdelegation、2文字未満、最大8件、viewer条件を確認し、Maestroで代表Filter / Pagination / Suggestionを実操作する。stale protectionは実際にasync overlapがある場合だけ確認する。
- G3 / R2b: Guest + 代表的な非Customer roleのdirect route negative case + 必要なMaestro deep-link。
- G4 / R4: normal typing / no result / 既存stale protection + 代表keyboard/pointer Runtime。
- G5 / R5: foreign-item Repository Test。
- G6 / R6: `validate:spec` / `validate:spec-visuals:final`。
- G7 / R7: Focused Playwrightでfalse-greenをfail-closeへ変更したことを確認。MCPは必要時のみ。
- G8 / R8: corrected Production Artifact inspection contract、Existing Positive / Negative Control、Actual Hermes Artifact Evidence、Maestro production-validation。
- G9 / R9: Windows EOL + Linux control。
- G10 / R10: Windows bounded repeat。
- G11 / R11: upstream SHA / Advisory / mutable-tag negative case。
- G12 / R12a / R12b: Markdown / spec / curriculum validationのうち変更対象に必要なもの。
- G13 / R13: dependency merge後のMarkdown / current-reference validation。

## 11. Plan Branch Completion Validation

このPlan branch自体はMarkdown + Run Artifactのみの変更である。G0のPolicy本体はこのPlanning branchではまだ変更しない。

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

1. G0のPermission scope拡大
   - Common Hookの既存safe境界を正本にし、通常のfeature-branch add/commit/push以外へ許可を広げない。
2. 誤stage
   - Parentは明示Pathだけstageし、`git add .` / `-A` / `--all`を使わない。
3. Protected branch / history破壊
   - Common Hook / Common Rulesのprotected branch、force push、rebase、amend、reset/clean等のfail-closeを維持する。
4. PR mergeの自動化
   - 明示的に禁止し、PR作成もユーザー明示依頼時だけに限定する。
5. Git policy変更のrollback
   - unsafe regression時は通常のcontent edit + follow-up commitで戻し、history rewriteを使わない。
6. Native Storefront scope creep
   - 全dimensionをrebaselineし、欠けているものだけ修正する。
7. Native viewer contextの表層修正
   - Actor Resolverだけで終わらせず、既存`ProductViewer`とDomain semanticsをSQLiteまで伝播する。
8. PRの過剰分割
   - R2a + R3、R12a + R12bはPreferred Groupとしてまとめ、同じboundaryを何度も変更しない。
9. Checkout UX新設
   - Current Boundary patternを再利用する。
10. Native auth guard重複
   - Shell / route boundaryへ集約し、全role×全route matrixは作らない。
11. Hermes guard弱体化 / 重複実装
   - Actual Production Artifact由来Evidenceを必須にし、既存validatorを可能ならWorkflowから再利用する。新Frameworkは作らない。
12. Patch strictness低下
   - strict applyを維持する。
13. Timeout対応の過剰調査
   - bounded reproductionで止める。
14. MCP scope creep
   - Findingに必要な操作だけに限定し、検証都合でProduct/Test Controlを拡張しない。
15. Concurrent CI workとの競合
   - R13だけdependency blockedとする。
16. Suggestionの過剰な非同期設計
   - raceが実際にある場合だけ最小guardを入れ、Cancellation frameworkは作らない。
17. Confirmationからのscope creep
   - C1 / C2はread-only確認に限定し、intent未確定のDocumentation / Workflow / executable contract変更、Repository外設定変更、追加CI実装へ自動移行しない。

## 13. Priority / Execution Order

Current Codex run内のwritable implementationはserialで進める。read-only researchは必要な場合だけ並列化してよい。ユーザーが外側で別worktree / 別sessionを明示的に管理する運用は本PlanのParent/worker orchestration責務外とする。

1. G0 — Safe Git Write Policy Alignment
2. G8 — R8 Native Production Bundle Guard（high-priority tooling）
3. G1 — R1 Checkout result integrity
4. G2 — R2a + R3 Native Catalog / Storefront contract
5. G3 — R2b Native route guard
6. G4 — R4 Web Search Suggestion
7. G9 — R9 Agentic QA patch portability
8. G7 — R7 Flow J false-green
9. G5 — R5 Cart ownership invariant
10. G6 — R6 Login spec/visual mapping
11. G10 — R10 Windows timeout budget
12. G11 — R11 Training action pinning
13. G12 — R12a + R12b Current docs alignment
14. G13 — R13 E2E design supersession after dependency merge

Confirmation only:

- C1 / REP-013（read-only。intentが一意に確定しない場合は報告で止める）
- C2 / REP-017（read-only。変更が必要なら明示承認後の別対応）

## 14. Follow-up / Stop Conditions

- G0がGreenになるまで、他Groupで新しいGit write許可を使用しない。
- Parentが`git add`する前に対象Pathとdiffを確認し、無関係な変更をstageしない。
- protected branchへ直接commit / pushしない。
- force push / remote delete / mirror / rebase / amend / destructive reset / clean / rmを実行しない。
- PR mergeを実行しない。
- PR作成はユーザーの明示依頼がある場合だけ実施する。
- 別Root Causeを「ついで」に修正しない。ただし同じ変更面・依存関係で一体となるFindingはPreferred Group内でまとめてよい。
- Deferred itemは追加Evidenceがない限り実装しない。
- Dependency update、UI redesign、大規模Refactorを追加しない。
- Product ContractにないUXをPlan都合で新設しない。
- 新しいAbstraction / Frameworkは、既存構造ではFindingを安全に直せない具体的Evidenceがある場合だけ検討する。
- MCPで新Findingを見つけた場合、今回の修正に不可欠でなければ別対応へ分離する。
- Confirmation-onlyでDocumentation / Workflow / executable contract / 外部設定 / 追加実装が必要と判明しても、このPlan中では変更せず、ユーザーへ報告して停止する。

## 15. Deliverables

- Plan: `docs/plans/2026-08-21_002300_repository_audit_remediation.md`
- Planning Run Artifact: `.codex/runs/20260821-174900-JST/`
- 実装時:
  - G0でSafe Git Write Policyを整合する。
  - Preferred implementation group単位で必要なSource / Regression Test / Run Artifact / Runtime Evidence / 残Riskを更新する。
  - G0完了後、Parent Codexは確認済みfeature branchで明示Pathのstage、normal commit、normal pushまで実施してよい。
  - PR作成はユーザーが明示依頼した場合だけ実施する。
  - PR mergeは実施しない。
- Confirmation-only項目はread-onlyで完結し、変更せずにEvidence・判断事項・推奨案を報告する。
- PR #35のAudit ReportはHistorical Evidenceとして原則変更しない。
