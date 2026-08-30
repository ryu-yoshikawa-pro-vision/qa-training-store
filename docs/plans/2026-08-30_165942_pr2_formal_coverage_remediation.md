# PR 2 Formal Coverage Remediation Plan

- Status: Planned
- Branch: `test/pr2-formal-coverage-remediation`
- Implementation Base SHA: `3022a74ba7cde2d3cc81ce318c6320dbf78115c6`
- Parent Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Parent PR 2 Plan: `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md`
- Parent PR: #78 `docs: Formal Test Strategy / Traceability を Current contract に整合する`
- Predecessor repair: PR #84 `fix: Product正規化と入力制限contractをCurrent仕様へ整合`（Merged）

## Progress

- [x] PR #84 merge後の `main` から独立branchを作成し、本Planを作成
- [ ] 実装前に4 labelをCurrent `main`でread-only再監査し、予定外のcoverage gapがないことを確認
- [ ] `CT-CATEGORY-002 / FR-PR-055` が未coveredの場合だけRepository Contract testを1本追加
- [ ] `CT-BOUNDARY-001 / FR-AR-003` が未coveredの場合だけ既存Order contract testへ最小assertionを追加
- [ ] 4 labelのCurrent evidence / disposition / PR #78 handoff情報をRun REPORTへ確定
- [ ] changed suiteだけのlocal validation・static checks・scope check・Sanitizerを完了
- [ ] test code変更がある場合だけPRをOPENし、exact-head required CIを確認

## 0. 依頼概要

PR #78の再監査で不足が判明したFormal coverageだけを、既存Test suiteへの最小変更で補完する。

PR #84でProduct implementation gapは修正済みのため、本remediationのplanned implementationではProduct / Application / Infrastructure / Presentation sourceを変更しない。

本remediationの責務は次までとする。

1. 4 labelをCurrent evidenceで再監査する。
2. 既知の2 coverage gapだけを必要時に最小test差分で閉じる。
3. PR #78へ戻せるrepresentative evidenceとhandoff情報を確定する。

PR #78自身のTraceability / taxonomy / Run / PR本文の更新は本remediationのDoDへ含めず、Follow-upとして扱う。

## 1. ゴール / 完了条件

### Goal

PR #78を止めている残存Formal coverage gapだけを閉じ、lower TraceabilityをCurrent Formal evidenceへ正確に接続できる情報を確定する。

### Definition of Done

1. **コード変更前に4 label全体をread-only再監査する。**
   - `CT-DB-KEY-001`: `NFR-RL-011` / `FR-PR-041` / `FR-PR-050`
   - `CP-FORM-001`: `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012`
   - `CT-CATEGORY-002`: `FR-PR-055`
   - `CT-BOUNDARY-001`: `FR-AR-001～004` / `NFR-MA-020～023`
   - Current Requirement → implementation → existing Formal Testの順に確認する。
   - 既知の `FR-PR-055` / `FR-AR-003` 以外に新しいFormal coverage gapまたはRequirement矛盾が見つかった場合、先にCategory / Order testを書かずSTOPする。
   - `stop=0`を作るためにRequirement意味を縮小しない。

2. **`CT-CATEGORY-002 / FR-PR-055` が未coveredの場合だけ、Repository Contract testを1本追加する。**
   - 対象: `tests/repository-contract/repositories.test.ts`
   - Test title: `creates the first category at ten and serializes concurrent appends`
   - 既存の空 `ScenarioShopDatabase` fixtureと`DexieCategoryRepository`を直接使う。
   - 固定fixtureはID・正規化後nameとも重複しない以下を使う。
     - `category-1` / `Category 1`
     - `category-2` / `Category 2`
     - `category-3` / `Category 3`
   - 1件目createの返却値で`sortOrder === 10`を確認する。
   - その後2件を`Promise.all`等で並行createし、両Promiseが成功することを確認する。
   - 並行createの返却`sortOrder`は個別assertしない。DB全件を取得し、persist済み`sortOrder`をsortした結果が`[10, 20, 30]`であることだけを確認する。
   - これによりduplicate sortOrder / lost writeを1つのpersisted-state assertionで確認する。
   - `CT-CATEGORY-002`のrepresentative Formal evidenceはこの新しいexact-title 1本に集約する。既存Application testを代表evidenceへ組み合わせない。
   - Current Dexie / fake-indexeddb環境で並行createを決定的に観測できない場合は、retry / sleep / spy / source text assertion / test-only hookを追加せずSTOPする。

3. **`CT-BOUNDARY-001 / FR-AR-003` が未coveredの場合だけ、既存Order contract testを最小拡張する。**
   - 対象: `tests/contracts/transactions.test.ts`
   - 既存test: `keeps order, payment, shipment, and histories consistent`
   - 既存Order / Payment / Shipment fixtureをそのまま使い、Checkout Use Case、Session、Gateway、Clock等を追加しない。
   - Orderが`paid`である既存fixtureとTimelineを矛盾させないため、OrderStatusHistoryを2件だけ追加する。
     1. `order-history-1`
        - `orderId: order.id`
        - `fromStatus: null`
        - `toStatus: "pending_payment"`
        - `actorUserId: customer.id`
        - `reasonCode: "ORDER_CREATED"`
        - `createdAt: FIXED_NOW`
     2. `order-history-2`
        - `orderId: order.id`
        - `fromStatus: "pending_payment"`
        - `toStatus: "paid"`
        - `actorUserId: null`
        - `reasonCode: "PAYMENT_SUCCEEDED"`
        - `createdAt: FIXED_NOW`
   - 同一時刻による並び順へ依存せず、public `detail.timeline`が2件あり、status集合として`pending_payment`と`paid`の両方を含むことを確認する。
   - raw fixtureにinternal fieldを記述している事実をpreconditionとし、同じpropertyの存在をraw側へ重複assertしない。
   - public DTO側だけ、Requirementに必要な以下を明示assertする。
     - `detail.orderActionVersion === order.version`
     - `detail` rootにraw `version`がない
     - `detail.paymentAttempts[0]`に`gatewayIdempotencyKey` / `version`がない
     - `detail.shipment`に`version`がない
     - `detail.timeline`の各要素に`actorUserId`がない
   - Timelineの件数とstatus mappingをpositive assertionしてからinternal field absenceを確認し、空TimelineでもPASSするtestにしない。
   - whole-object snapshot、DTO専用fixture、新helper、別flowは追加しない。

4. **`CT-DB-KEY-001`は3RequirementすべてをCurrent evidenceで説明できる。**
   - `NFR-RL-011`: IndexedDB Indexへboolean/null/undefinedを直接保存せず、数値Key / non-null Scope Keyへ投影するcontract。
   - `FR-PR-041`: Category名・Brand名・Variation選択肢のTrim / Unicode NFKC / locale非依存小文字化とnormalized comparison keyによる重複判定。
   - `FR-PR-050`: productCode / SKUのTrim / Unicode NFKC / ASCII大文字化、format validation、case-insensitive uniqueness。
   - 1つのexisting exact-titleへ無理に押し込まず、必要なら最小suite setとしてhandoffする。

5. **`CP-FORM-001`は3RequirementすべてをCurrent evidenceで説明できる。**
   - `NFR-AX-001`: FormのLabel、Error関連付け、Keyboard Focus。
   - `NFR-AX-007`: Error発生時のError Summary focusとSummary内Linkから対象fieldへの移動。
   - `NFR-MA-012`: Email正規化、文字数上限、Application Errorを共有関数・共有定数・共有型から参照するcontract。
   - Accessibility evidenceだけで`NFR-MA-012`を落とさない。

6. **4 labelのrepresentative evidenceとfinal dispositionをRun REPORTへ残す。**
   - 元Requirement ID。
   - Current implementation evidence。
   - representative Formal evidence。
   - 複数suiteの場合は各suiteが担うRequirement範囲。
   - `exact-title` / `suite-level` / `stop`の最終判断。
   - PR #78側で必要になる`suite-level` taxonomyの最小調整案。
   - 本remediationではPR #78 branch / Traceability docsを変更しない。

7. **planned implementationの通常差分を2 test file以内に保つ。**
   - `tests/repository-contract/repositories.test.ts`
   - `tests/contracts/transactions.test.ts`
   - 片方または両方がalready coveredなら、そのtest fileは変更しない。
   - 新Test file / helper / framework / planned Production source変更は行わない。

8. **local validationはchanged suiteだけに限定する。**
   - 実際に変更したtest fileのfocused run。
   - Category変更時だけ`pnpm run test:repository`。
   - Order contract変更時だけ`pnpm run test:contracts`。
   - read-only evidenceとして参照したintegration / component / unit suiteを、evidence確認だけを理由にlocal再実行しない。
   - static checks / Sanitizer / scope checkは実行する。

9. **test code変更がある場合だけcoverage-remediation PRを1本OPENする。**
   - test code変更が0なら空PRを作らない。
   - PRを作成した場合だけexact-head required CIをfull regressionのSSOTとして確認する。
   - no-opの場合は存在しないPR CIをDoDに要求しない。
   - mergeは明示指示があるまで行わない。

## 2. 現状理解と前提

### Current understanding

- Implementation BaseはPR #84 merge直後の`main`、`3022a74ba7cde2d3cc81ce318c6320dbf78115c6`。
- `FR-PR-055`は「新規Categoryは0件時`sortOrder=10`、既存時`max(sortOrder)+10`で末尾へ追加し、最大値取得と作成を同一Transactionで行うこと」。
- `DexieCategoryRepository.createAtEnd()`は`src/infrastructure/database/dexie/basic-repositories.ts`にあり、`db.transaction("rw", db.categories, ...)`内で一覧取得→最大値算出→`categories.add()`を行う。
- `tests/repository-contract/repositories.test.ts`は空の`ScenarioShopDatabase`と`DexieCategoryRepository`をすでに利用しており、FR-PR-055の最小seamである。
- Category tableの`nameNormalized`はunique indexなので、並行create fixtureはnormalize後も異なるnameを使う。
- `FR-AR-003`は「UI向けOrder DTOにGateway Key、Repository Version、内部Actor IDを含めないこと」。
- `DexieOrderRepository.getDetail()`はraw Order / Payment / Shipment / OrderStatusHistoryから`OrderDetailDto`を明示的に組み立て、内部fieldを公開DTOへコピーしていない。
- `tests/contracts/transactions.test.ts`の既存Order testはOrder=`paid`、Payment=`succeeded`、Shipment=`pending`、`customer`、`FIXED_NOW`、`DexieOrderRepository.getDetail()`をすでに持つ。
- したがってFR-AR-003のためにCheckout/Application flowを追加する必要はない。
- `CT-DB-KEY-001`は `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` を含む。
- Current PR #78では`CT-DB-KEY-001`を既存Repository Contractの単一exact-titleへ接続しているが、その1 testだけで元label全体を説明できるとは限らないため再監査が必要である。
- `CP-FORM-001`は `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012` を含む。
- Current PR #78では`CP-FORM-001`から`NFR-MA-012`が落ちているため、元label意味をCurrent evidenceで再構成する必要がある。
- `CT-BOUNDARY-001`は `FR-AR-001～004` / `NFR-MA-020～023` の複合labelであり、Order DTO evidence単独では全体を代表しない。
- Current `AGENTS.md`のlocal validationは「必要に応じて一部または全部」であり、Web CIではunit / integration / repository / component / contracts等をfull regressionとして実行する。

### Assumptions

- Historical gap analysisは調査の起点にのみ使い、最終判定は実装開始時点のCurrent `main`を正とする。
- 4-label再監査はコード変更前に実施し、予定外gapが見つかった状態で既知2 gapの実装だけを先行しない。
- Category concurrency testはtransaction実装詳細をspyするtestではなく、transaction境界を外した場合のread-max raceをobservable stateで検知する最小black-box regressionとする。
- Order DTO testではfixture自身へ記述済みのraw internal fieldを再assertせず、public DTOへの非公開だけを直接検証する。
- read-only evidence suiteはCurrent codeを読むことでrepresentative evidenceを確定し、変更がないsuiteをlocal validation目的だけで再実行しない。

### Non-goals

- 本remediation PRで`docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`を変更すること。
- 本remediation内でPR #78 branch、PR #78 Run Artifact、PR #78本文を更新すること。
- Product / Application / Infrastructure / Presentation sourceのplanned変更。
- Repository API、DB schema / migrationの変更。
- 新Test file、新Test helper、新ID制度、Test titleへのlabel埋込み。
- retry / sleep / transaction spy / source text assertion / test-only production hook / failure injection frameworkの追加。
- E2E / Native test追加。
- 4-label evidenceを網羅的Test inventoryへ展開すること。
- `tests/integration/admin-master-use-cases.test.ts` / `tests/integration/checkout-order-use-cases.test.ts`の変更。

## 3. 質問 / 曖昧性

### Blocking questions

現時点でなし。

### Pre-implementation stop gate

4-label read-only再監査で以下が判明した場合は、Category / Order test実装へ進む前にSTOPする。

- `CT-DB-KEY-001`の `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` のいずれかに、既知2 gapとは別のFormal coverage gapまたはimplementation gapがある。
- `CP-FORM-001`の `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012` のいずれかをCurrent evidenceで説明できない。
- `CT-CATEGORY-002`がtest追加だけでは閉じられず、Product変更が必要である。
- `CT-BOUNDARY-001`がFR-AR-003 test追加以外にも新しいFormal coverage gapを持つ。
- `stop=0`のためにRequirement意味の縮小、新ID制度、第三のTraceability SSOTが必要になる。

### Already-covered handling

- Categoryだけalready covered: Category変更をno-opにする。
- FR-AR-003だけalready covered: Order contract変更をno-opにする。
- 両方already covered: test code変更0とし、4-label handoff evidenceを確定して完了する。空PRは作らない。
- already-coveredはSTOP条件ではない。

### Implementation stop conditions

コード変更開始後は以下の場合にSTOPする。

- Category concurrency behaviorをCurrent Dexie / fake-indexeddbで決定的に観測できず、retry / sleep / spy / hook等が必要になる。
- FR-AR-003確認に新flow、新fixture設計、Production hook等が必要になる。
- workflow / package / config / validator / DB schema / Curriculum / Trainingのplanned変更が必要になる。
- validation failure repairがRequirement判断、破壊的操作、外部副作用、安全な最小修正を超える変更を必要とする。

### Open questions

- なし。

## 4. 影響範囲

### Planned writable files

通常想定:

- `tests/repository-contract/repositories.test.ts`
- `tests/contracts/transactions.test.ts`
- 本Plan
- 新しいimplementation Run Artifact

片方または両方がalready coveredなら対応test fileは変更しない。

Validation failure repairが発生した場合のみ、Current `AGENTS.md` §8 / repair-loopに従う最小追加差分を許容し、その理由をRun REPORTへ記録する。

### Files to inspect — read-only

#### 4-label pre-audit

- PR #78 `docs/12_quality/requirements_traceability.md`
- `docs/01_requirements/functional_requirements.md`
- `docs/01_requirements/non_functional_requirements.md`

#### `CT-DB-KEY-001`

- `src/domain/services/normalization.ts`
- `src/infrastructure/database/dexie/mappers.ts`
- `src/infrastructure/database/dexie/database.ts`
- Category / Brand / Variation duplicate validationを担うCurrent Use Case / Repository code
- Product code / SKU normalization・uniquenessを担うCurrent Use Case / Repository code
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/admin-product-use-cases.test.ts`

#### `CP-FORM-001`

- shared `INPUT_LIMITS` / Email normalization / Application Error contractを担うCurrent code
- `tests/component/presentation-foundation.test.tsx`
- `tests/integration/auth-account.test.ts`
- PR #84後のshared input limits / Application validation / Application Errorに直接対応するCurrent Formal evidence

#### `CT-CATEGORY-002`

- `src/infrastructure/database/dexie/basic-repositories.ts` — `DexieCategoryRepository.createAtEnd()`
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts` — read-only。変更しない。

#### `CT-BOUNDARY-001`

- `src/application/contracts/orders.ts`
- `src/domain/contracts/entities.ts`
- `src/infrastructure/database/dexie/order-review-repositories.ts`
- `src/application/use-cases/checkout-order-use-cases.ts` — `getMyOrder()`の公開境界をread-only確認
- `tests/contracts/architecture.test.ts`
- `tests/contracts/transactions.test.ts`

## 5. 変更方針

### Change strategy

1. **Audit first, code second**
   - 4-label全体をread-only監査してからコードを書く。
   - 予定外gapがある場合は無駄な部分実装を残さずSTOPする。

2. **Coverage-only**
   - RequirementとCurrent behaviorが一致する場合だけtestを補完する。
   - Requirement矛盾はProduct gapとしてSTOPし、このPRへplanned Product fixを混ぜない。

3. **Categoryは1 test / 2 essential assertionsに寄せる**
   - 1件目の返却`sortOrder === 10`。
   - 並行create完了後のpersisted全件`[10,20,30]`。
   - concurrent return valueの重複assertionは追加しない。

4. **Order DTOは既存testへHistory 2件 + public DTO assertionsだけを追加する**
   - existing paid OrderとTimelineを整合させる。
   - raw fixture existence assertionは追加しない。
   - DTO absenceとTimeline positive mappingだけを確認する。

5. **4-label handoffは最小suite setを許容する**
   - 単一exact-titleへ無理に押し込まない。
   - Requirementごとの担当evidenceをRun REPORTに記録する。
   - 新Dispositionは作らない。

6. **Validationはchanged scopeだけ**
   - changed test file / changed suiteだけlocal実行する。
   - read-only evidence suiteは変更がない限りlocal再実行しない。
   - full regressionはPR作成時のexact-head CIへ委譲する。

7. **PR #78へはhandoff情報だけ作る**
   - 本remediationではPR #78を編集しない。
   - 実際のtaxonomy / Traceability更新はFollow-upとする。

### 実行タスク

- [ ] 1. 実装開始時に最新`main`とCurrent repository rules（`AGENTS.md`、`PLANS.md`、Run Artifact contract、test conventions）を確認し、implementation Run Artifactを開始する。
- [ ] 2. コード変更前に`CT-DB-KEY-001`を`NFR-RL-011` / `FR-PR-041` / `FR-PR-050`ごとにread-only再監査する。
- [ ] 3. コード変更前に`CP-FORM-001`を`NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012`ごとにread-only再監査する。
- [ ] 4. コード変更前に`CT-CATEGORY-002 / FR-PR-055`と`CT-BOUNDARY-001 / FR-AR-001～004 / NFR-MA-020～023`をread-only再監査する。
- [ ] 5. 4-label pre-auditで既知2 gap以外のSTOPがあれば、test実装せずRunへ記録してSTOPする。
- [ ] 6. `FR-PR-055`が未coveredの場合だけ、`tests/repository-contract/repositories.test.ts`へ `creates the first category at ten and serializes concurrent appends` を1本追加する。
  - 固定fixtureは`category-1/Category 1`、`category-2/Category 2`、`category-3/Category 3`。
  - 1件目の返却`sortOrder === 10`。
  - その後2件を並行createする。
  - DB全件のpersisted sortOrderが`[10,20,30]`。
  - 不安定なら複雑化せずSTOPする。
- [ ] 7. `FR-AR-003`が未coveredの場合だけ、`tests/contracts/transactions.test.ts`の既存Order testへHistory 2件とpublic DTO assertionを追加する。
  - `ORDER_CREATED`: null → pending_payment / `actorUserId: customer.id`。
  - `PAYMENT_SUCCEEDED`: pending_payment → paid / `actorUserId: null`。
  - Timelineは2件あり、status集合として`pending_payment` / `paid`を含む。
  - `orderActionVersion === order.version`。
  - root `version`、payment `gatewayIdempotencyKey/version`、shipment `version`、timeline `actorUserId`がpublic DTOへ出ない。
  - raw fixture propertyの存在を重複assertしない。
- [ ] 8. 4 labelのCurrent implementation evidence / representative Formal evidence / final dispositionをRun REPORTへ確定する。
- [ ] 9. 実際に変更したtest fileだけfocused実行する。
- [ ] 10. Category変更時だけ`pnpm run test:repository`、Order変更時だけ`pnpm run test:contracts`を実行する。
- [ ] 11. static checks / scope check / Sanitizerを実行する。
- [ ] 12. validation failure時は`AGENTS.md` §8 / repair-loopに従い、安全な最小repairのみ行う。
- [ ] 13. Run Artifactへvalidation、scope、already-covered/no-op、4-label handoff情報を同期してfinalizeする。
- [ ] 14. test code変更が1件以上ある場合だけcoverage-remediation PRを`main`向けにOPENする。0件なら空PRを作らない。
- [ ] 15. PRを作成した場合だけexact-head required CIを確認し、Blocking Finding / required CI failureが残る状態をmerge可としない。mergeは明示指示があるまで行わない。

## 6. 検証方法

### Focused validation — changed files only

- Category変更時: `tests/repository-contract/repositories.test.ts`
- Order変更時: `tests/contracts/transactions.test.ts`

変更していないfileはfocused validationのためだけに再実行しない。

### Local required validation — changed scope only

- Category testを変更した場合: `pnpm run test:repository`
- Order contract testを変更した場合: `pnpm run test:contracts`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `git diff --check`
- Current Codex artifact Sanitizer Write / Check（residual 0）

`CT-DB-KEY-001` / `CP-FORM-001`のrepresentative evidenceがintegration / component / unit suiteに存在しても、read-only evidence確認だけを理由にそのsuiteをlocal再実行しない。変更していないsuiteのfull regressionはPR作成時のexact-head CIへ委譲する。

### Exact-head PR CI — PR作成時のみ

coverage-remediation PRを作成した場合だけ、Current Web CIをfull regressionのSSOTとする。

少なくともCurrent required jobsで以下を確認する。

- style / specification quality
- code quality / typecheck / security
- Codex artifact sanitization
- Vitest matrix: unit / integration / repository / component / contracts
- build / required E2E等、Current branch protection / required checksに含まれるjob

両gap no-opでPRを作成しない場合、exact-head PR CIは本remediationのDoDに含めない。

### 成功判定

- 4-label pre-auditがコード変更前に完了し、既知2 gap以外のSTOPがない。
- 実際に変更したtest fileのfocused testがPASSする。
- changed suiteのlocal testがPASSする。
- static checks / `git diff --check` / SanitizerがPASSする。
- PR作成時だけexact-head required CIがPASSする。
- planned implementationとしてProduct / Application / Infrastructure / Presentation source変更0。
- validation repairが発生した場合は必要性・最小性・planned scopeとの差分がRun REPORTに記録される。
- `tests/integration/admin-master-use-cases.test.ts`変更0。
- `tests/integration/checkout-order-use-cases.test.ts`変更0。
- `CT-DB-KEY-001`は3Requirementすべてを説明できる。
- `CP-FORM-001`は3Requirementすべてを説明できる。
- `CT-CATEGORY-002`は新Category exact-title 1本、またはalready-covered evidenceで説明できる。
- `CT-BOUNDARY-001`はOrder DTO evidenceを含む必要最小限のsuite setで元Requirement全体を説明できる。
- 4-label re-auditでRequirement意味の縮小なしに`stop=0`を説明できる。
- PR #78へ渡すhandoff情報がRun REPORTに揃っている。
- test code変更0の場合は不要なPRを作らない。

## 7. リスクと未解決論点

### Risks

1. **4-label監査を後回しにして不要な部分実装を残す**
   - コード変更前に4-label pre-auditを完了し、予定外gapがあれば先にSTOPする。
2. **Category concurrency testが環境依存になる**
   - 既存Repository Contract fixtureで1本だけ試し、決定的でなければSTOPする。retry / sleep / spy等を入れない。
3. **Category unique indexがsortOrder検証と無関係なfailureを起こす**
   - 3件のIDとnormalize後nameを固定で重複させない。
4. **Category assertionを増やしすぎる**
   - first result=10と最終persisted `[10,20,30]`だけに留め、concurrent return値を重複assertしない。
5. **既存paid OrderとTimelineが矛盾する**
   - `ORDER_CREATED`と`PAYMENT_SUCCEEDED`の2 Historyだけ追加し、pending_paymentとpaidの両状態をmapする。
6. **Order DTO testでfixture自身を重複assertする**
   - raw fixtureをpreconditionとし、public DTO境界だけをassertする。
7. **`CT-DB-KEY-001`を単一existing exact-titleへ無理に押し込む**
   - 3Requirementを個別監査し、必要なら最小suite setでhandoffする。
8. **`CP-FORM-001`から`NFR-MA-012`を落とす**
   - 3Requirement IDを個別監査する。
9. **read-only evidence suiteをローカルで過剰再実行する**
   - local testはchanged suiteだけ。full regressionはPR作成時CIへ委譲する。
10. **PR #78更新まで本remediationのDoDへ混ぜる**
    - 本remediationはhandoff情報確定で完了し、PR #78編集はFollow-upへ分離する。
11. **coverage remediationからProduct修正へscope creepする**
    - Requirement矛盾はSTOP。validation failure repairとは区別する。

### Open questions

- なし。

## 8. 成果物

### 変更ファイル

通常想定:

- `tests/repository-contract/repositories.test.ts`
- `tests/contracts/transactions.test.ts`
- `docs/plans/2026-08-30_165942_pr2_formal_coverage_remediation.md`
- `.codex/runs/<implementation-run-id>/PLAN.md`
- `.codex/runs/<implementation-run-id>/TASKS.md`
- `.codex/runs/<implementation-run-id>/REPORT.md`
- machine-managed `run.json`（Current Run contractで必要な場合）

already-covered判定により、2 test fileの片方または両方が変更されないことを許容する。

Validation failure repairが必要になった場合のみ、Current `AGENTS.md` §8 / repair-loopに従う最小追加差分を許容し、その理由をRun REPORTへ記録する。

### 付随ドキュメント

- 本remediation PRでは`docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`を変更しない。
- PR #78へ渡すevidence / taxonomy調整案はRun REPORTへ記録する。

## 9. Follow-up notes

本remediation完了後、PR #78側で以下を行う。これは本PlanのDoD / 実行タスクには含めない。

- remediation PRがmergeされた場合はPR #78 branchへ最新`main`を取り込む。両gap no-opの場合はCurrent main evidenceをそのまま使用する。
- PR #78の`suite-level`説明を、新Dispositionを増やさず「1つのtest file / suite、または複合label全体を説明するための必要最小限のsuite set」と読める最小表現へ調整する。
- `CT-CATEGORY-002`は新Category exact-title、またはno-op時のCurrent representative evidenceへ同期する。
- `CT-BOUNDARY-001`はArchitecture contract等が`FR-AR-001/002/004`と該当NFR群、Order contract evidenceが`FR-AR-003`を担う形で同期する。
- `CT-DB-KEY-001` / `CP-FORM-001`はRun REPORTで確定したRequirement単位のCurrent evidenceへ同期する。
- PR #78のTraceability / Run / PR本文を一度だけCurrent evidenceへ揃える。

## 10. 備考

- Planの詳細さは実装時の追加判断を減らすためのものであり、実装自体を複雑化する意図はない。
- 実コード差分の通常目標は「Category Repository Contract test 1本 + 既存Order contract testへのHistory 2件とpublic DTO boundary assertion」の2箇所だけ。
- 4-label read-only監査で予定外gapが見つかった場合、上記実装を先行しない。
- `tests/integration/admin-master-use-cases.test.ts` / `tests/integration/checkout-order-use-cases.test.ts`は変更しない。
- 新helper / 新Test file / planned Production source変更 / framework追加は行わない。
- Current evidenceでalready coveredなら、不要な実装を増やさないことを最優先する。
- local validationはchanged suiteへ限定し、full regressionはPR作成時のexact-head CIへ委譲する。
