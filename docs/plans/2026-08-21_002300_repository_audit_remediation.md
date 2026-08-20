# Repository Audit Remediation 実装計画

## 0. 依頼概要

- 対象Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Base branch: `main`
- Base SHA: `314a8f958072f19e672e3bc37089558d74e42feb`
- Evidence:
  - `docs/reports/2026-08-20_010734_maintenance-investigation.md`
  - `docs/reports/2026-08-20_103937_repository-audit.md`
- 目的:
  - PR #35 の2つの監査ReportをEvidenceとして、本当に対応が必要なRoot Causeだけを実装対象へ残す。
  - Finding IDを機械的に1件1タスク化しない。
  - Product correctness、Test/QA reliability、Tooling integrity、Current documentation alignmentを必要最小限の変更で修正する。
  - 実表示・実動作が関係する修正は、利用可能であればPlaywright-MCP / Maestro-MCPを積極的に使用して検証する。

## 1. 基本方針

1. **必要な修正だけを行う。**
   - Audit Findingになったことだけを理由に実装しない。
   - 実害、Current Normative Specification、Repository Policy、Executable Contractを確認してから修正する。
2. **Current Normative Specificationを正本とする。**
   - `docs/spec/` とCurrent executable contractが一致しない場合、Known DeviationがなければCurrent implementationをSpecへ戻す。
3. **過剰設計を避ける。**
   - 新Framework、新State Machine、新Generated Artifact基盤、大規模RefactorをFinding対応へ混ぜない。
4. **Testを弱めてGreenにしない。**
   - retry追加、global timeout引上げ、assertion削除、failure maskingを第一手段にしない。
5. **実画面・実動作を検証する。**
   - Product/UI/Native behaviorは静的確認・Unit/Component Testだけで完了扱いにしない。
   - 利用可能ならPlaywright-MCP / Maestro-MCPで操作し、Rendered UIも目視確認する。
6. **ReportはHistorical Evidenceとして保持する。**
   - Finding closureのためにPR #35の監査Reportを大量更新しない。

## 2. Scope

### 2.1 必須対応

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
| REP-009 / REP-014 | `e2e_design.md`がCurrent-lookingな古いCI/E2E設計を保持する | Docs Fix after CI split |

### 2.2 確認のみ。Defaultはコード変更なし

| ID | 確認事項 | Default |
|---|---|---|
| REP-013 | raw expected-failure Workflowとchecker wrapperの責務 | Current machine contractを維持。必要なら教材に役割差を明記 |
| REP-017 | GitHub Ruleset / Branch ProtectionがNative main assuranceを保証するか | 保証済みならRepository変更なし |

### 2.3 今回の実装対象から外す

| ID | 理由 |
|---|---|
| MNT-004 | stale Metro cacheの環境依存再現。clean runnerで再現するまで防御層追加を必須化しない |
| REP-015 | Current generated outputsは同期済み。将来drift detection改善であり、現時点の必須修正ではない |
| MNT-005 | Exact Review body mappingはComponent Testで保証済み。Maestroはsave journey保証として成立し、IME変換はProduct defectではない |
| REP-019 | pre-existing user-owned local PNG。Repository defectではない |

## 3. Non-goals

- Phase 3 Backend / Cloudflare Workers / D1実装。
- Native Admin追加。
- iOS Runtime/Maestro保証追加。
- Guest Checkout追加。
- UI全面リデザイン。
- Dependencyの不要なversion upgrade。
- GitHub ActionsのAction version upgradeをSHA pinningへ混ぜること。
- 全E2E再設計。
- Generated Artifact Framework新設。
- Agentic QA Runner / Orchestrator新設。
- Metro cache問題に対する無条件`--clear`導入。
- Historical audit ReportのFinding削除・改番。

## 4. Current Contractから確定できる判断

### 4.1 Native StorefrontはDecision Gateにしない

`docs/spec/features/storefront.md` はStorefrontをWeb/Native共通挙動として定義し、`BR-STOREFRONT-002` はKeyword、Category、Brand、価格、在庫、Sale、最低評価、total/pageを要求する。

`docs/spec/features/native-customer.md` もNative CustomerはWeb共有Application契約へ従い、Native専用の簡略業務Ruleを作らないと定義する。

`docs/spec/known-deviations.md` にActive deviationはない。

したがって、実装開始時点で新しいNormative変更が入っていなければ、MNT-001 / REP-003は**既存Contractへの復元**として修正する。新Feature扱いにしない。

### 4.2 REP-007はScenario mappingだけを第一選択とする

Current visual registryはLogin `validation-error`を`submit empty login form`で生成している。

一方Specだけが同Stateへ`storage-write-failure`を関連付けており、Expected UIはrequired field Summaryである。

第一選択はSpecのCondition/Scenarioを実際のrequired-field validationへ合わせること。

新しいStorage Failure Scenario / Visual Assetは、既存BR/ACがCanonical Visualを要求しているEvidenceが別途確認された場合だけ追加する。

### 4.3 MNT-003ではNormative Contractを弱めない

`AC-NATIVE-002` のProduction保証は維持する。

ToolがHermes `.hbc`をUTF-8 textとしてraw substring scanしていることが問題であり、Tool failureを理由にMarker/Module/Screen/Service非存在Contractを削除・縮小しない。

Hermes outputへ適合した最小の検証方法へ置き換える。

## 5. 推奨PR Slice

原則は1 Root Cause = 1 PR。変更境界とValidationが明確に同じ場合だけ束ねる。

| Slice | Suggested branch | Findings | 備考 |
|---|---|---|---|
| R1 | `fix/checkout-result-state-integrity` | REP-002 | 最優先 |
| R2 | `fix/native-customer-session-boundaries` | REP-001, REP-006 | 同じNative session/route boundary |
| R3 | `fix/native-storefront-contract-parity` | MNT-001, REP-003 | Current Specへの復元 |
| R4 | `fix/web-search-suggestion-open-state` | REP-004 | 独立 |
| R5 | `fix/cart-item-ownership-invariant` | REP-005 | 最小predicate + test |
| R6 | `fix/auth-visual-state-contract` | REP-007 | Spec/registry mapping中心 |
| R7 | `test/cross-role-shipment-oracle` | REP-012 | Product変更なしを基本 |
| R8 | `fix/native-production-bundle-guard` | MNT-003 | Contractを維持してToolを修正 |
| R9 | `fix/agentic-qa-patch-portability` | MNT-002, REP-018 | Windows/Linux EOL |
| R10 | `test/windows-contract-timeout-budget` | REP-011 | affected testsのみ |
| R11 | `fix/training-workflow-action-pinning` | REP-016 | version upgradeしない |
| R12 | `docs/current-design-contract-alignment` | REP-008, REP-010 | 現行Realityへの同期 |
| R13 | `docs/e2e-design-supersession` | REP-009, REP-014 | Cross Browser CI split実装後 |
| C1 | confirmation only | REP-013 | 原則コード変更なし |
| C2 | GitHub settings check | REP-017 | 保証済みなら変更なし |

## 6. 実行順序

```text
R1 Checkout integrity
  ↓
R2 Native session / authorization
  ↓
R3 Native Storefront contract
  ↓
R4 / R5 Web behavior / persistence
  ↓
R6 / R7 Spec/Test oracle
  ↓
R8 / R9 / R10 Tooling reliability
  ↓
R11 Training security policy
  ↓
R12 Current docs/curriculum
  ↓
R13 E2E historical/superseded docs after CI split
```

R4〜R12は依存がなければ別worktreeで並列化してよい。ただし同一fileを触るsliceはserializeする。

## 7. 実装タスク

### Wave 0 — Rebaseline

- [ ] 最新`main`へrebaseし、Findingが他PRで既に修正されていないか確認する。
- [ ] `qa-training-store-ci-chromium-required-cross-browser-split`の状態と変更範囲を確認する。
- [ ] 各sliceを`open / already-fixed / changed-by-other-work`へ再分類する。
- [ ] 実装時はRepository契約に従って必要なRun Artifactを初期化する。

### Wave 1 — R1 Checkout result state integrity

- [ ] Web/Nativeで既存Order DTOからownership、`orderStatus`、retry可能状態を確認する。
- [ ] route `complete/failed`を状態の正本として信用しない。
- [ ] Web Complete/Failedはpersisted Order stateとroute expectationを照合し、不一致・missing・unauthorizedをsafe error/not-foundへ送る。
- [ ] Retryは`payment_failed`等の実際にretry可能なstateだけで表示する。
- [ ] Native Completeは`orderId`を必須境界として扱い、Order lookupなしに成功表示しない。
- [ ] Native FailedもOrder stateを照合する。
- [ ] paid→failed route、failed→complete route、missing ID、ownership negativeをRegression Testへ追加する。

実装原則:
- 新Payment State Machineを作らない。
- Existing Order DTO / use caseを使用する。
- Retry idempotencyを弱めない。

### Wave 2 — R2 Native Customer session / route boundary

- [ ] Catalog viewerをCurrent Sessionから解決する既存Identity abstractionへ接続する。
- [ ] Guest / regular / gold / platinumのviewer/rank mappingをContract Testで固定する。
- [ ] Native Customer-only route判定をShell/route boundaryへ集約する。
- [ ] Guest direct Customer routeはLoginへ送る。
- [ ] unsupported management roleは既存Native unsupported boundaryへ送る。
- [ ] Profile / Address / Order / Checkoutの代表deep link negative caseを追加する。
- [ ] Gold/Platinumのrank visibility / membership pricingをNative Component/Runtimeで確認する。

各Screenへ個別redirect logicを複製しない。

### Wave 3 — R3 Native Storefront contract parity

- [ ] Current Storefront Specが変更されていないことを再確認する。Known Deviationが無ければそのまま実装する。
- [ ] Suggestion、Brand、Price range、Pagination、Facet/totalをCurrent service surfaceへ最小追加する。
- [ ] Native Catalog/Searchの固定`[]`/`null`/`page: 1`をUI stateへ接続する。
- [ ] Product List/SearchでユーザーがCurrent Contractのfilter/pageを操作できる最小UIを実装する。
- [ ] Underlying SQLite/Application contractを再利用し、Web UIをpixel-copyしない。
- [ ] Native Component / Contract / Maestroへ代表Regressionを追加する。

必要ならSuggestionとFilter/Paginationを別PRへ分割してよい。

### Wave 4 — R4 Web Search Suggestion

- [ ] async suggestion到着後のComboBox open-stateをReact Aria contractに沿って制御する。
- [ ] 2文字未満、no-result、stale async request、Enter、Arrow navigationを維持する。
- [ ] Component Testを「ArrowDownしない通常typing」から開始し、候補がdiscoverableになることをassertする。
- [ ] pointer/touch/keyboardの代表interactionをRuntimeで確認する。

### Wave 5 — R5 Cart ownership invariant

- [ ] Dexie update/deleteでmutation前に`currentItem.cartId === currentCart.id`を検証する。
- [ ] 2 Cart + foreign item negative repository testを追加する。
- [ ] Native SQLと同等のownership semanticsを必要な範囲で合わせる。
- [ ] Phase 3 Backendへ先回りしたRepository abstraction再設計はしない。

### Wave 6 — R6 Login visual/spec mapping

- [ ] `SCREEN-AUTH-LOGIN/validation-error`のCondition/Scenarioを実際の`submit empty login form` required validationへ合わせる。
- [ ] Visual RegistryとSpecのState slug / Expected UI / setupが同じ意味になることを確認する。
- [ ] 既存BR/ACがStorage Failure Canonical Visualを要求していない限り、新Scenario・新Screenshotは追加しない。
- [ ] `validate:spec` / visual contractを通す。

### Wave 7 — R7 Flow J false-green

- [ ] `button existsならtransition、無ければskip`を廃止する。
- [ ] Initial shipment/order stateを明示assertする。
- [ ] transition前stateなら操作して結果をassertする。
- [ ] 既に許可されたpost-stateならそのstateを明示assertする。
- [ ] 想定外stateはFAILする。

### Wave 8 — R8 Native Production Bundle Guard

- [ ] `AC-NATIVE-002`のMarker / Module / Screen / Service非存在Contractを維持する。
- [ ] Hermes `.hbc`をUTF-8 raw textとして読む現在方式を置き換える。
- [ ] Existing static module-resolution contract、no-bytecode projection、runtime Test Control unavailable、Hermes-aware inspection等を比較し、最小でfail-closeする組合せを選ぶ。
- [ ] Automation buildをfalse negativeにしないPositive Controlを追加する。
- [ ] ProductionへTest Control/Harnessが漏れた場合にFAILするNegative Controlを維持する。
- [ ] Toolを通すためにNormative guaranteeを弱めない。

### Wave 9 — R9 Agentic QA patch portability

- [ ] Patch artifactのLF contractを明示する。
- [ ] line-ending normalization boundaryを1箇所に限定する。
- [ ] 高コストPreparation前にstrict `git apply --check`相当のfast preflightを入れる。
- [ ] malformed patchを許容する`--ignore-whitespace`常用はしない。
- [ ] Windows CRLF checkout caseとLinux LF caseをdeterministic testで固定する。

### Wave 10 — R10 Windows contract timeout

- [ ] 対象2系統だけをWindowsで2〜3回程度boundedに再実行する。
- [ ] PNG fixture生成等のcostを簡単に削減できる場合は先に削減する。
- [ ] それでも5秒境界へ到達するcaseだけexplicit per-test timeoutを設定する。
- [ ] global Vitest timeoutは変更しない。
- [ ] retryでGreenにしない。

p95測定や性能Benchmark基盤は作らない。

### Wave 11 — R11 Training action pinning

- [ ] Training templateの各remote actionについて、**現在使用しているversion/tagに対応するexact commit SHA**を確認する。
- [ ] 同じversionのfull SHAへpinする。
- [ ] 今回のFinding対応を理由にAction version upgradeを行わない。
- [ ] SHA横のcommentでversion readabilityを維持する。
- [ ] `APPROVED_TRAINING_ACTIONS`をexact SHA allowlistへ変更する。
- [ ] mutable tagを拒否するContract Testを追加する。

### Wave 12 — R12 Current Design / iOS Curriculum alignment

#### REP-008

- [ ] Current executable token/breakpoint/image ratioを正本として`docs/05_ui/design_system.md`を同期する。
- [ ] Codeを古いDocument値へ戻さない。
- [ ] このFindingだけのためにtoken→Markdown自動生成基盤を作らない。

#### REP-010

- [ ] iOS CurriculumをCurrent reusable Build-only Required Gateへ同期する。
- [ ] `workflow_call` + Native `verify` dependencyを正しく説明する。
- [ ] iOS Runtime/Maestro保証へ拡大しない。

REP-010はCross Browser CI splitを待つ必要はない。

### Wave 13 — R13 E2E design supersession

Cross Browser CI split実装後に行う。

- [ ] `docs/08_testing/e2e_design.md`をCurrent documentとして継続更新する必要があるか確認する。
- [ ] Defaultは**Historical / Superseded classification**とし、Current CI正本へのリンクを明示する。
- [ ] Currentとして残す明確な理由がある場合だけ、最新suite/count/triggerへ更新する。
- [ ] REP-009 / REP-014は1 Root Causeとして一度だけ対応する。

古い固定test countを今後も手動同期し続ける設計は避ける。

## 8. 確認タスク

### C1 — REP-013 Training expected-failure responsibility

コード変更を前提にしない。

- [ ] raw `training:web:expected-failure`が「CIで意図的に赤いFailureを体験する入口」、wrapperが「Expected Failure Evidence Contract Checker」という責務分離か確認する。
- [ ] Current machine contractと教材意図が一致するならコードは変更しない。
- [ ] 必要ならCurriculumへ役割差を短く明記する。
- [ ] 明確なOwner/Contract Evidenceがない状態でWorkflowをwrapperへ置換しない。

### C2 — REP-017 Native main assurance

- [ ] GitHub Ruleset / Branch Protection実設定を確認する。
- [ ] `main` direct push禁止 + Native PR check requiredなら変更なし。
- [ ] direct pushが許可される場合だけ、Ruleset強化を第一候補として検討する。
- [ ] push Native CI追加はRulesetだけで保証できない場合の次案とする。

高コストNative CIを理由なくPR後・push後の二重実行にしない。

## 9. Deferred / No-op

### MNT-004 — Web stale Metro cache

Current implementation taskへ入れない。

追加対応する条件:

1. clean GitHub-hosted runnerまたはcontrolled clean environmentでroute-less exit 0が再現する、または
2. existing smokeより前の段階でinvalid artifactが実運用上流出するEvidenceが得られる。

条件を満たさなければclose/deferする。

### REP-015 — Generated image manifest

Current filesは同期済みで、Current validatorもhash/metadata/config整合を検証している。

実際のdrift事故、レビュー事故、CIでのsource overwrite問題がmaterial化するまではFollow-up improvementとして保持する。

### MNT-005 — Native Review oracle

Exact body mappingはComponent Testで既に保証されている。Maestroは実機上のReview save journeyを保証する責務として扱う。

IMEによる入力変換だけを理由にMaestroへLower-layer assertionを重複追加しない。

### REP-019

Repository changeなし。

## 10. MCP / Runtime検証方針

### 10.1 原則

Product/UI/Nativeの修正では、利用可能であれば**Playwright-MCP / Maestro-MCPを積極的に使用する**。

MCPは単なる既存Test再実行の代替ではなく、修正対象Behaviorを実際に操作して確認するために使う。

Static analysis / Unit / Component / Contract TestがPASSしていても、Runtime behaviorがFindingの中心ならそれだけで完了扱いにしない。

### 10.2 Playwright-MCP

Web関連では可能な範囲で以下を確認する。

- 実BrowserでMain pathとFinding reproduction pathを操作する。
- Direct URL / reload / back / repeated actionを必要に応じて確認する。
- pointer / keyboard / touch相当のinteractionを確認する。
- Error / Empty / opposite-state / unauthorized boundaryを確認する。
- DOM/ARIA snapshotだけで終わらずRendered UIを実際に視覚確認する。

対象Slice:

- R1 Checkout result integrity
- R4 Search Suggestion
- R7 Flow J
- 必要に応じてR6 visual/spec mapping

### 10.3 Maestro-MCP

Native関連では可能な範囲で以下を確認する。

- launch / deep link / navigation
- login/session
- tap / input / scroll
- state transition
- invalid direct route
- reload/relaunch/persistenceがRelevantな場合
- Gold/Platinum rank behavior
- Storefront Suggestion/Filter/Pagination
- Checkout Complete/Failed boundary

対象Slice:

- R1 Native Checkout
- R2 Native session / authorization
- R3 Native Storefront
- R8 Production boundaryでRuntime確認が適用可能な部分

### 10.4 Visual Inspection

MCPで画面を取得できる場合、実際のRendered UIを視認する。

最低限確認する。

- false success / false failure表示が残っていないか
- missing/unauthorized stateが正常画面に見えないか
- Search popupがtyping後に表示されるか
- Native Filter/Paginationが操作可能か
- error/retry UIが正しいstateでだけ出るか
- layout overlap / clipping / text truncation / modal overflow等の副作用がないか

主観的なデザイン改善はFinding対応へ混ぜない。

### 10.5 MCPが利用不能な場合

- 利用不能理由をRun Artifact / PRへ記録する。
- 未実行をPASS扱いしない。
- Existing CLI / Playwright / Maestro / ADB等の最も近いRuntime手段で代替する。
- MCP環境構築だけのために本PlanのScopeを広げない。

## 11. Slice別Validation

### Global

変更範囲に応じてFocused Validationを先に行い、PR完了時はRepository Required Gateを省略しない。

候補:

```text
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
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

- Web component:
  - paid order + failed route
  - failed order + complete route
  - missing orderId
  - unauthorized/not-found
  - retryable state only
- Native component:
  - missing ID does not show success
  - opposite state does not show false result
  - Failed retry only in retryable state
- Playwright-MCP:
  - opposite-state direct URLs
  - normal checkout success/failure
- Maestro-MCP:
  - Complete/Failed deep-link boundary
  - payment retry journey
- Rendered result screenを視覚確認する。

### R2 Native session / authorization

- Native component/service contract
- Guest/regular/gold/platinum actor mapping
- Guest direct Customer route
- unsupported management role
- Maestro-MCPでdeep link/login/rank behaviorを確認
- Gold/Platinumの表示価格・rank visibilityを実画面確認

### R3 Native Storefront

- Native Component / Contract
- Suggestion / Brand / Price / Pagination代表case
- many-products scenario
- Maestro-MCPで実際にFilter/Pageを操作
- total/resultが選択条件に一致することを確認
- Rendered filter controlsと結果を視覚確認

### R4 Search Suggestion

- Component normal typing / no result / stale async request
- Playwright-MCPで通常typingのみからpopupが開くことを確認
- mouse/pointer、keyboard、mobile-widthで代表caseを確認
- `aria-expanded`だけでなく実際に候補が画面表示されることを確認

### R5 Cart

- 2 Cart foreign-item Repository Test
- 正常update/delete regression

### R6 Spec/Visual

- `pnpm run validate:spec`
- `pnpm run validate:spec-visuals:final`
- 必要な場合だけPlaywright-MCPでempty submit stateを再確認

### R7 Flow J

- focused Playwright run
- Playwright-MCPでtransition前後の実状態を確認可能なら確認
- Missing controlでsilent PASSしないこと

### R8 Native Bundle Guard

- Automation Positive Control
- Production Negative Control
- Hermes current output
- module/surface contract
- Runtime Test Control unavailable確認が適用可能なら実施

### R9 Agentic QA

- fast strict patch preflight
- `pnpm run test:agentic-qa:preparation`
- Windows EOL fixture
- Linux CI control

### R10 Timeout

- affected testsをWindowsでbounded repeat
- no retry-based green
- global timeout unchanged

### R11 Training Action pinning

- Training workflow contract
- mutable tag negative test
- Training Web baseline
- Native Training baseline when relevant
- versionが変更されていないことをdiffで確認

### R12 / R13 Docs

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run validate:spec` when relevant
- Path/command/workflow referencesをCurrent Repositoryと照合

## 12. 成功判定

- P0/P1 Product Findingの既存再現手順が修正後に再現しない。
- 対応Regression TestがPASSする。
- Product/UI/Native Findingは、MCPが利用可能な場合MCP Runtime確認まで完了する。
- 実画面確認が可能なFindingではRendered UIを確認する。
- Test/Tooling修正でassertionを弱めていない。
- global timeout / retry / cache clearで問題を隠していない。
- Deferred itemを「ついで」に実装していない。
- Action pinningにversion upgradeを混ぜていない。
- MNT-003でNormative Production Contractを弱めていない。
- Current Required CIがGreen。
- Native変更時はNative CIの実Jobを実行し、docs-only skipを代替にしない。

## 13. リスク

1. **Native Storefront scope creep**
   - 対策: semantic contract parityだけを要求し、Web UI pixel parityは要求しない。
2. **Checkout過剰抽象化**
   - 対策: Existing Order DTO + small state checkを優先する。
3. **Native auth guard重複**
   - 対策: Shell/route boundaryへ集約する。
4. **Hermes guard弱体化**
   - 対策: ToolをContractへ合わせ、ContractをToolへ合わせない。
5. **Patch strictness低下**
   - 対策: LF normalization/provenanceを直し、strict applyを維持する。
6. **Timeout対応の過剰調査**
   - 対策: 2〜3回のbounded reproductionで十分。Benchmark基盤を作らない。
7. **Concurrent CI workとの競合**
   - 対策: REP-009/014だけCross Browser CI split後に処理する。
8. **Phase 3 Backendとの二重投資**
   - 対策: REP-005は局所Invariantだけ修正する。
9. **MCP availability依存**
   - 対策: MCP unavailableはBlockerとして記録し、既存CLI等で代替。未実行をPASS扱いしない。

## 14. 優先順位

### Must Fix first

1. REP-002 — Checkout result state integrity
2. REP-001 / REP-006 — Native session / route boundary
3. MNT-001 / REP-003 — Native Storefront Current Contract parity
4. MNT-003 — Native Production Bundle Guard
5. MNT-002 / REP-018 — Windows Agentic QA patch portability
6. REP-012 — Flow J false-green
7. REP-004 — Web Search Suggestion

### Next

8. REP-005 — Cart ownership invariant
9. REP-007 — Login spec/visual mapping
10. REP-011 — Windows local timeout budget
11. REP-016 — Training remote action SHA pinning
12. REP-008 — Design System docs
13. REP-010 — iOS Curriculum

### After dependent CI work

14. REP-009 / REP-014 — E2E design Historical/Superseded classification

### Confirmation only

- REP-013 — expected-failure responsibility
- REP-017 — GitHub Ruleset / Branch Protection

### Deferred / no change

- MNT-004
- REP-015
- MNT-005
- REP-019

## 15. 実装時の停止条件

- 全Root Causeを1つの巨大PRへ入れない。
- 各sliceはFocused Validation + Required Gateを通したら独立merge可能とする。
- MCPで新しいMaterial Findingを発見しても、今回Root Causeのaffected areaか別Root Causeかを判定してからScopeへ追加する。
- 別Root Causeなら「ついで修正」せず別対応へ分離する。
- Deferred itemは明確な追加Evidenceがない限り実装しない。
- Dependency update、UI redesign、大規模Refactorを追加しない。

## 16. 成果物

### Plan branch

- Branch: `plan/repository-audit-remediation`
- Plan: `docs/plans/2026-08-21_002300_repository_audit_remediation.md`

### 実装時

- Root Causeごとの必要最小限のProduct/Test/Tooling/Docs変更。
- 既存Test Layerに沿ったRegression Test。
- Repository契約で必要なRun Artifact。
- PR本文へFinding ID、Runtime/MCP検証、未実行項目、残Riskを記録する。

### 変更しないもの

- PR #35のAudit ReportはHistorical Evidenceとして原則変更しない。
- Deferred / no-op項目をFinding数合わせのために実装しない。
