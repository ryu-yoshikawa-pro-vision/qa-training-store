# Repository Audit Remediation 実装計画

## 0. Context

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Base: `main`
- Plan branch: `plan/repository-audit-remediation`
- Baseline SHA: `314a8f958072f19e672e3bc37089558d74e42feb`
- Evidence:
  - `docs/reports/2026-08-20_010734_maintenance-investigation.md`
  - `docs/reports/2026-08-20_103937_repository-audit.md`

このPlanの目的は、監査Findingをすべて実装することではない。Current Product Contract / Repository Policy / Executable Contractに反し、実害や品質リスクが明確なRoot Causeだけを必要最小限で修正する。

## 1. Goal

### Goal

本当に必要なRemediationだけを、既存の設計・Test・CIを再利用して修正する。新しいFrameworkや不要な抽象化は作らない。

### Definition of Done

1. 実装開始時に最新`origin/main`を確認し、対象Findingが未修正であることをrebaselineしている。
2. Active remediation 9件だけを対象とし、Follow-up / Deferred項目を「ついで」に実装していない。
3. Product BehaviorはNormative Specification、委譲された低レベル値はExecutable Canonical Sourceへ一致する。
4. Assertion弱体化、無条件retry、global timeout増加、failure maskingで問題を隠していない。
5. 既存Contract / Domain rule / Validator / Harnessを優先し、新しいFrameworkは必要性を示すEvidenceがある場合だけ追加する。
6. 変更箇所に対応するFocused ValidationがPASSし、UI/Runtime Findingは必要な範囲でBefore / Afterを確認している。
7. MNT-003はActual Production Hermes Build Output、またはそこから決定的に導出されるArtifactを使ってfail-closeを確認している。
8. 実装PRを作成する場合は関連Required CIをGreenにする。Agent自身はPRをmergeしない。

## 2. Current understanding

- PR #35の監査Reportは`main`へmerge済みで、Historical Evidenceとして保持する。
- Current `docs/spec/known-deviations.md`にActive deviationはない。
- Native Catalogはviewer contextがGuest固定かつGateway / Repository境界で失われ、visibility / membership pricingがCurrent common contractへ一致しない。
- Native Storefrontは一部query dimensionとSuggestion経路が未接続で、`CatalogUseCases.suggest()`のcustomer経路は空配列固定である。
- Checkout resultはroute presentationを信用し、persisted Order / Payment stateと矛盾できる。
- Native Customer-only routeにはdirect navigation時のauthorization gapがある。
- Web Search Suggestionは通常typingだけでは表示されないFindingがある。
- Cart mutationにはcurrent cartとitemのownership invariantが不足している。
- Cross-role Flow Jはtransition未確認でもPASSできるTest Oracle defectがある。
- Native Production Bundle GuardはHermes artifactへのraw marker scanでfalse-negativeになり得る。
- Agentic QA challenge patchはWindows line ending条件でstrict applyに失敗する。
- Current `.gitattributes`は`* text=auto eol=lf`でRepository textのLF checkoutを既に正本化している。
- Training workflowはRepositoryのAction SHA pinning方針と一致していない。

## 3. Assumptions

- 実装Group開始時に`git fetch`等で最新`origin/main`を確認し、既に修正済みならそのGroupはNo-op / already-fixedとして終了する。
- Runtime確認のためだけにProduct capability、Native Test Control Scenario、Seed、認証経路を追加しない。
- MCPが利用不能でもProduct defectとは扱わず、Focused Testや既存Runtime手段で代替する。未実行をPASS扱いしない。
- 実装はCurrent Repository contractに従いwritable作業をserialで進める。read-only調査は必要な場合だけ並列化してよい。

## 4. Non-goals

- Phase 3 Backend / Cloudflare Workers / D1。
- Native Admin、Guest Checkout、iOS Runtime/Maestro保証の追加。
- UI全面リデザイン。
- Dependencyの不要なversion upgrade。
- 全E2E再設計、Generated Artifact Framework、Agentic QA Runner / Orchestratorの新設。
- Native Suggestion用の新Cancellation framework。
- Bundle Inspection用の新しい汎用Framework。
- Runtime確認だけのためのNative Test Control Scenario追加。
- Git permission policy / Hook / auto-net rulesの変更。
- Audit Report本文の修正、Findingの削除・改番。
- Follow-up / Deferred項目の同時実装。

## 5. Impacted areas

Active remediationは次の9Groupに限定する。

| Group | Finding | Area |
|---|---|---|
| G1 | MNT-003 | Native Production Bundle Guard / CI |
| G2 | REP-002 | Checkout result state integrity |
| G3 | REP-001 + MNT-001 + REP-003 | Native Catalog / Storefront |
| G4 | REP-006 | Native route authorization |
| G5 | REP-004 | Web Search Suggestion |
| G6 | REP-005 | Cart ownership invariant |
| G7 | REP-012 | Cross-role Flow J Test Oracle |
| G8 | MNT-002 + REP-018 | Agentic QA patch portability |
| G9 | REP-016 | Training Action SHA pinning |

## 6. Files to inspect

| Group | Primary files / areas |
|---|---|
| G1 | `scripts/validate-native-production-bundle.ts`、`.github/workflows/native-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`、production-validation Maestro flow |
| G2 | Checkout / Order Application Use Case、Web / Native result screens、checkout/payment tests |
| G3 | `src/bootstrap/native-runtime.ts`、`src/application/use-cases/catalog-use-cases.ts`、`src/application/customer-capabilities.ts`、`src/application/native/guest-storefront.ts`、`src/infrastructure/database/sqlite/native-customer-repositories.ts`、`src/presentation/native/native-screens.tsx`、Storefront tests |
| G4 | Native Shell / route boundary、customer deep-link tests |
| G5 | Web Search ComboBox / suggestion state、component/E2E tests |
| G6 | Dexie cart repository、repository contract tests |
| G7 | Cross-role Flow J、related seed/state helpers |
| G8 | `.gitattributes`、Agentic QA preparation script、challenge patch、related deterministic tests |
| G9 | Training workflow templates、action allowlist / workflow contract tests |

## 7. Change strategy

### G1 — Native Production Bundle Guard

- Hermes `.hbc`をraw text markerだけで判定する方式を置き換える。
- Standalone validatorだけ直して、Native CI内の同系統scanを残さない。
- 既存validatorをWorkflowから再利用できるなら再利用する。
- Actual Production Hermes Build Output、またはそこから決定的に導出されるArtifactをEvidenceにする。
- `--no-bytecode` projectionだけをProduction保証にしない。
- 既存Positive / Negative controlとMaestro production-validationを再利用し、新Harnessを作らない。

### G2 — Checkout result state integrity

- persisted Order ownership / Order state / Payment stateを正本にする。
- route `complete` / `failed`だけで成功・失敗表示を決めない。
- paid→failed、failed→complete、missing order ID、unauthorizedをRegressionで固定する。
- 新しいPayment State Machineや独自UXは作らず、既存Boundary patternを使う。

### G3 — Native Catalog / Storefront

R2aとR3は同じRuntime / UseCase / Gateway / Repository / SQLiteを変更し、Storefront parityがviewer contextを前提とするため同一Groupで扱う。

viewer contextは次の経路で保持する。

```text
Current Session / Identity Resolver
  → CatalogUseCases
  → CustomerCatalogGateway
  → NativeCustomerCatalogRepository
  → NativeCustomerSQLiteRepository
```

- Guest固定をやめ、既存`ProductViewer`を利用する。
- visibilityは既存`canViewerSeeProduct()`、pricingは既存Domain pricing semanticsを再利用する。
- Native専用viewer / pricing / visibility ruleは作らない。
- Home / Search / Detail / Facet / rank restriction / membership pricingが同じviewer contractへ一致することを確認する。

Storefrontは`BR-STOREFRONT-002` / `AC-STOREFRONT-002`をrebaselineし、欠けているdimensionだけ修正する。

対象:

- Keyword / Category / Brand
- Price / Inventory / Sale / Minimum rating
- total / page / pagination / facet counts / stable sort
- Suggestion（2文字以上、最大8件）

Suggestionは次の既存層を接続する。

```text
NativeSearchScreen
  → NativeCatalogService.suggest()
  → CatalogUseCases.suggest()
  → CustomerCatalogGateway.suggest()
  → NativeCustomerCatalogRepository.suggest()
  → NativeCustomerSQLiteRepository.suggest()
```

- customer経路の空配列固定をやめる。
- SQLite Suggestionはviewer-awareかつdeterministicにする。
- async raceが実在する場合だけ最小のstale-result guardを入れる。Cancellation frameworkは作らない。
- 全rank×全Test layerの重複Testは作らず、既存coverageの不足だけ追加する。

### G4 — Native route authorization

- Customer-only guardをShell / route boundaryへ集約する。
- Guest direct routeは既存Login boundaryへ送る。
- unsupported management roleは既存forbidden / unsupported boundaryへ送る。
- 代表的なnegative deep-link caseだけ追加し、全role×全route matrixは作らない。

### G5 — Web Search Suggestion

- 通常typingでasync suggestion到着後にComboBoxが開くよう、Current React Aria contractに沿って修正する。
- 2文字未満、no-result、既存stale protection、Enter / Arrow navigationを維持する。
- Component TestはArrowDown前提にせず通常typingから確認する。

### G6 — Cart ownership invariant

- update / delete前に`currentItem.cartId === currentCart.id`を確認する。
- foreign itemのnegative repository testを追加する。
- Repository redesignはしない。

### G7 — Flow J Test Oracle

- Product codeではなくTest Oracleだけを修正する。
- 許可された初期stateをassertし、transition前なら操作後stateまでassertする。
- already-transitionedを許す場合もstateを明示assertする。
- 想定外stateはFAILさせる。retryやassertion弱体化で回避しない。

### G8 — Agentic QA patch portability

- まず既存`.gitattributes`の`* text=auto eol=lf`を正本として、対象challenge patchがRepository / checkout上でLFになる状態へ揃える。
- 高コストPreparation前にstrict `git apply --check`相当のpreflightを置き、line ending incompatibilityを早期にfail-closeする。
- `--ignore-whitespace`を通常経路には使わない。
- patchをLFへ揃えたWindows checkoutとLinux controlでstrict applyを確認する。
- それでもworktree EOL条件でstrict applyが再現する場合だけ、Evidenceを確認してPreparation script側の最小normalizationを検討する。無条件のEOL normalization utilityは作らない。

### G9 — Training Action SHA pinning

- Official upstreamでCurrent tag/versionとfull SHAを確認する。
- Current versionにSecurity Advisoryがないか確認する。
- versionを変えずfull SHAへpinするのを基本とする。
- allowlist / contract testをexact SHAへ合わせ、mutable tagを拒否する。
- Security理由でversion upgradeが必要なら別対応へ分離する。

## 8. Common implementation rules

- 最小差分を優先する。同じRoot Causeでも変更面が違う場合は混ぜない。
- 既存Contract / Domain rule / Repository / Validator / Harnessを再利用する。
- 新しいAbstraction / Frameworkは、既存構造では安全に直せないEvidenceがある場合だけ検討する。
- Testを増やす前に既存coverageを確認し、不足分だけ追加する。
- Assertion弱体化、無条件retry、global timeout増加、failure maskingは禁止する。
- Product ContractにないUXや機能をPlan都合で追加しない。

## 9. Validation plan

変更GroupごとにFocused Validationを先に実行し、その後、変更面に必要なRepository gateだけを実行する。

### Group-specific

- G1: corrected bundle inspection contract、既存Positive / Negative control、Actual Hermes Artifact、Maestro production-validation。
- G2: opposite-state / missing ID / unauthorized + 必要なWeb/Native Runtime Before / After。
- G3: viewer contextのEnd-to-End伝播、Storefront全dimensionの不足coverage、代表Filter / Pagination / Suggestion Runtime。
- G4: Guest + 代表的な非Customer direct-route negative case、必要ならNative deep-link runtime。
- G5: normal typing / no-result / keyboard path + Web Runtime Before / After。
- G6: foreign-item repository contract test。
- G7: Focused Playwrightでfalse-greenがfail-closeになったことを確認。
- G8: `.gitattributes`準拠のLF patch + Windows strict apply + Linux control。script normalizationは追加した場合だけその境界をtestする。
- G9: upstream SHA / advisory確認 + mutable-tag negative contract。

### Repository gates

変更面に応じて必要なものだけ選択する。

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

UI/Runtime Findingは可能なら最新`main`相当でBeforeを再現し、修正後に同じ操作でAfterを確認する。MCP unavailableをPASS扱いしないが、Repository / Contract testで十分なFindingへ無理にMCPを追加しない。

## 10. Risks

1. Native Catalogを表層だけ直してviewer contextが途中で失われる。
   - G3はSessionからSQLiteまでEnd-to-Endで確認する。
2. Storefront parity対応が機能追加へ膨らむ。
   - Current BR/ACで欠けているdimensionだけ修正する。
3. Hermes guardを別のfalse-negative方式へ置き換える。
   - Actual Production Artifact由来Evidenceを必須にする。
4. Test FindingをProduct修正へ誤拡張する。
   - G7はTest Oracleだけ、G8はPreparation contractだけを対象にする。
5. 監査Findingを全部消そうとしてScopeが膨らむ。
   - Active 9Group以外はFollow-up / Deferredとして実装しない。

## 11. Open questions

全体を止めるBlocking Questionはない。

- G1でActual Hermes Artifactをどのrepresentationで検査するかは実装時にCurrent build outputを確認し、最小でfail-closeできる方式を選ぶ。新しい汎用Frameworkは作らない。

## 12. Follow-up notes / Deferred

以下は監査Findingとして残すが、このPlanのActive implementationから外す。

| Finding | 扱い | 理由 |
|---|---|---|
| REP-007 / R6 | Follow-up | Login visual/spec mapping。主要Product defectを止めないdocs/spec alignment。 |
| REP-011 / R10 | Follow-up | Windows 5秒timeout。局所Test quality issueで主要Remediationと分離可能。 |
| REP-008 / R12a | Follow-up | Design System docs drift。Executable Contractは別途確認可能。 |
| REP-010 / R12b | Follow-up | iOS Curriculum drift。Current Build-only gate自体の修正ではない。 |
| REP-009 + REP-014 / R13 | Deferred | Cross Browser CI splitのmain反映後に再評価する。 |
| REP-013 / C1 | Confirmation only | intentをread-only確認し、変更が必要なら別対応。 |
| REP-017 / C2 | Confirmation only | Ruleset / Branch Protectionをread-only確認し、変更が必要なら別対応。 |

既存No-op / Deferredも維持する。

- MNT-004: clean environmentで再現するまで実装しない。
- REP-015: generated outputsはCurrent時点で同期済み。
- MNT-005: exact body mappingはLower Layerで保証済み。
- REP-019: Repository defectではないため変更しない。

## 13. Execution notes

- 各Group開始前に最新`origin/main`を確認し、state-changing rebaseは自動実行しない。
- Parent Codexはfeature branchで、確認済みの明示Pathだけ`git add`し、staged diff確認後にnormal commit / normal pushまで実施してよい。
- `implementation_worker` / auto-netではGit writeしない。
- force push、rebase、amend、destructive reset / clean / rm、protected branch direct updateは実行しない。
- PR作成はユーザーが明示依頼した場合だけ行い、PR mergeは実施しない。

## 14. Plan branch validation

このPlanning branch自体はPlan + Run Artifactだけの変更である。完了扱いにする前にローカルRepository環境で次を実行する。

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260821-174900-JST -Write -Check
pnpm run format:check
pnpm run lint:markdown
```

3件がPASSするまでPlanning Runを100%完了扱いにしない。
