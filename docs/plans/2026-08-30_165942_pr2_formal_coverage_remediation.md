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
- [ ] Current `main` で `CT-CATEGORY-002 / FR-PR-055` を再監査し、不足時だけRepository Contract testを1本追加
- [ ] Current `main` で `CT-BOUNDARY-001 / FR-AR-003` を再監査し、不足時だけ既存Order contract testへassertionを追加
- [ ] `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` を元Requirement IDを落とさず再監査
- [ ] 4 labelすべてについてPR #78へ渡せるCurrent Formal evidenceとhandoff情報を確定し、`stop=0`を確認
- [ ] 必要最小限のlocal validation・scope check・Sanitizer・exact-head CI確認を完了

## 0. 依頼概要

- PR #78の再監査で不足が判明したFormal coverageだけを、既存Test suiteへの最小変更で補完する。
- Product implementation gapはPR #84で修正済みのため、本remediationのplanned implementationではProduct / Application / Infrastructure / Presentation sourceを変更しない。
- coverage evidenceを確定してからPR #78へ戻す。PR #78自体のTraceability / taxonomy / Run / PR本文の更新は、本remediationの実装・DoDには含めずFollow-upとして扱う。

期待成果:

- `CT-CATEGORY-002 / FR-PR-055` と `CT-BOUNDARY-001 / FR-AR-003` の不足Formal coverageだけが閉じる。
- `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` の4 labelについて、元Requirement意味を縮小せずCurrent evidenceが整理される。
- PR #78側が迷わず同期できるhandoff情報をRun REPORTへ残す。
- 新Test file、新helper、新framework、planned Production source変更を追加しない。

## 1. ゴール / 完了条件

### Goal

PR #78を止めている残存Formal coverage gapだけを閉じ、lower TraceabilityをCurrent Formal evidenceへ正確に接続できる情報を確定する。

### Definition of Done

1. `CT-CATEGORY-002 / FR-PR-055`がCurrent testで未coveredの場合だけ、`tests/repository-contract/repositories.test.ts`へRepository contract testを1本追加する。
   - Test titleは `creates the first category at ten and serializes concurrent appends` とする。
   - 既存の空DB fixtureと`DexieCategoryRepository`を直接使用する。
   - 3件はID・正規化後nameとも重複しない固定値を使う。
     - `category-1` / `Category 1`
     - `category-2` / `Category 2`
     - `category-3` / `Category 3`
   - 1件目createが`sortOrder=10`になる。
   - その後2件を並行createし、返却された追加2件の`sortOrder`をsortすると`[20, 30]`になる。
   - DB全件のpersist済み`sortOrder`をsortすると`[10, 20, 30]`になり、重複・lost writeがない。
   - `CT-CATEGORY-002`の代表Formal evidenceはこの新しいexact-title 1本に集約する。既存Application testを代表evidenceへ組み合わせる必要はない。
   - Current Dexie / fake-indexeddb環境で並行createを決定的に観測できない場合は、retry・sleep・spy・source text assertion・test-only hookを追加せずSTOPする。

2. `CT-BOUNDARY-001 / FR-AR-003`がCurrent testで未coveredの場合だけ、`tests/contracts/transactions.test.ts`の既存 `keeps order, payment, shipment, and histories consistent` を最小拡張する。
   - 既存Order / Payment / Shipment fixtureをそのまま使い、Checkout Use Case、Session、Gateway、Clock等を追加しない。
   - `orderRepository.appendStatusHistory()`で以下のHistoryを1件だけ追加する。
     - `id: "order-history-1"`
     - `orderId: order.id`
     - `fromStatus: null`
     - `toStatus: "pending_payment"`
     - `actorUserId: customer.id`
     - `reasonCode: "ORDER_CREATED"`
     - `createdAt: FIXED_NOW`
   - raw Orderは`version`を持ち、public `detail` rootには`version`がなく、`detail.orderActionVersion === rawOrder.version`である。
   - raw Paymentは`gatewayIdempotencyKey` / `version`を持ち、`detail.paymentAttempts[0]`には両propertyがない。
   - raw Shipmentは`version`を持ち、`detail.shipment`には`version`がない。
   - raw OrderStatusHistoryは`actorUserId === customer.id`である。
   - public `detail.timeline`は1件あり、`detail.timeline[0].status === "pending_payment"`で、`detail.timeline[0]`には`actorUserId`がない。
   - Timelineのpositive mappingを確認してからnegative field assertionを行い、空配列でもPASSするtestにしない。
   - whole-object snapshot、DTO専用fixture、新helper、別flowは追加しない。

3. `CT-DB-KEY-001`は元labelの3RequirementをID単位で再監査し、すべてをCurrent evidenceで説明できる。
   - `NFR-RL-011`: IndexedDB Indexへboolean/null/undefinedを直接保存せず、数値Key / non-null Scope Keyへ投影するcontract。
   - `FR-PR-041`: Category名・Brand名・Variation選択肢のTrim / Unicode NFKC / locale非依存小文字化とnormalized comparison keyによる重複判定。
   - `FR-PR-050`: productCode / SKUのTrim / Unicode NFKC / ASCII大文字化、format validation、case-insensitive uniqueness。
   - Product code / SKUだけを見て`FR-PR-041`を落とさない。

4. `CP-FORM-001`は元labelの3RequirementをID単位で再監査し、すべてをCurrent evidenceで説明できる。
   - `NFR-AX-001`: FormのLabel、Error関連付け、Keyboard Focus。
   - `NFR-AX-007`: Error発生時のError Summary focusとSummary内Linkから対象fieldへの移動。
   - `NFR-MA-012`: Email正規化、文字数上限、Application Errorを共有関数・共有定数・共有型から参照するcontract。
   - `NFR-MA-012`を落としてAccessibilityだけのlabelへ縮小しない。

5. 4 labelすべてをCurrent evidenceで再監査し、元Requirement意味を縮小せず`stop=0`である。
   - 単一testで説明できるlabelはexact-titleを優先する。
   - 複合label全体を単一suiteで説明できない場合だけ、必要最小限のsuite setをRun REPORTへ記録する。
   - `CT-CATEGORY-002`は新Category exact-title 1本で代表する。
   - `CT-BOUNDARY-001`はArchitecture contract等とOrder DTO boundary evidenceの最小suite setで説明する。

6. Run REPORTにPR #78 handoff情報が整理されている。
   - 4 labelそれぞれの元Requirement。
   - Current implementation evidence。
   - representative Formal evidenceと、複数suiteの場合は各suiteが担うRequirement範囲。
   - final disposition / stop判定。
   - PR #78側で必要になる`suite-level` taxonomyの最小調整案。
   - 本remediation内ではPR #78 branchやTraceability docsを変更しない。

7. Planned implementationではProduct / Application / Infrastructure / Presentation sourceを変更しない。
   - local validation / CI failureはCurrent `AGENTS.md` §8とrepair-loopを優先する。
   - 安全な最小repairで直せる場合のみrepo ruleに従ってrepairしてよい。
   - Requirement判断、破壊的操作、外部副作用、本remediation責務を実質的に広げるrepairが必要ならSTOPする。

8. 実際に変更したtest fileのfocused test、関連local suite、static checks、Sanitizer、scope checkがPASSする。full regressionはexact-head PR CIで確認する。

9. 少なくとも1つのtest code変更が必要だった場合だけcoverage-remediation PRを1本OPENする。両gap already coveredなら空PRを作らず、handoff evidenceを確定して本remediationを完了する。

## 2. 現状理解と前提

### Current understanding

- Implementation BaseはPR #84 merge直後の`main`、`3022a74ba7cde2d3cc81ce318c6320dbf78115c6`。
- `FR-PR-055`は「新規Categoryは0件時`sortOrder=10`、既存時`max(sortOrder)+10`で末尾へ追加し、最大値取得と作成を同一Transactionで行うこと」。
- Current `DexieCategoryRepository.createAtEnd()`は`src/infrastructure/database/dexie/basic-repositories.ts`にあり、`db.transaction("rw", db.categories, ...)`内で一覧取得→最大値算出→`categories.add()`を行う。
- `tests/repository-contract/repositories.test.ts`は空の`ScenarioShopDatabase`と`DexieCategoryRepository`を既に使っており、FR-PR-055の最小seamである。
- Category tableの`nameNormalized`はunique indexなので、並行create fixtureはnormalize後も異なるnameを使う必要がある。
- `FR-AR-003`は「UI向けOrder DTOにGateway Key、Repository Version、内部Actor IDを含めないこと」。
- `DexieOrderRepository.getDetail()`はraw Order / Payment / Shipment / OrderStatusHistoryから`OrderDetailDto`を明示的に組み立て、内部fieldを公開DTOへコピーしていない。
- `tests/contracts/transactions.test.ts`の既存Order testは`customer` / `FIXED_NOW`、Order / Payment / Shipment、`DexieOrderRepository.getDetail()`をすでに持つため、History 1件とassertionだけでFR-AR-003を検証できる。
- `CT-DB-KEY-001`は `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` を含む。
- `CP-FORM-001`は `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012` を含む。
- `CT-BOUNDARY-001`は `FR-AR-001～004` と `NFR-MA-020～023` を含む複合labelで、Order DTO evidenceだけで全体を代表させない。
- PR #78のCurrent taxonomyは`suite-level`を1つのtest file / suite前提で説明しているため、複合labelが最小suite setを必要とする場合はPR #78側で後続調整が必要になる。
- Current `AGENTS.md`のlocal validationは「必要に応じて一部または全部」であり、Web CIではunit / integration / repository / component / contracts等をfull regressionとして実行する。

### Assumptions

- Historical gap analysisは調査の起点にのみ使い、最終判定は実装開始時点のCurrent `main`を正とする。
- coverage gapはplanned implementation上Production sourceを変えず閉じられる。
- Category concurrency testはtransaction構造そのものをspyするtestではなく、read-max→writeがtransaction外へ分離された退行を既存seamで検知する最小black-box regressionとして扱う。
- Order DTO testではraw internal fieldの存在と、対応するpublic DTO objectへの非公開を対で確認する。
- 4-label re-auditはread-only evidence整理であり、新たなcoverage gapを見つけても本remediationへ無制限に追加しない。

### Non-goals

- 本remediation PRで`docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`を変更すること。
- 本remediation内でPR #78 branch、PR #78 Run Artifact、PR #78本文を更新すること。
- Product / Application / Infrastructure / Presentation sourceのplanned変更。
- Repository API、DB schema / migrationの変更。
- 新Test file、新Test helper、新ID制度、Test titleへのlabel埋込み。
- retry / sleep / transaction spy / source text assertion / test-only production hook / failure injection frameworkの追加。
- E2E / Native test追加。
- 4-label代表evidenceを網羅的Test inventoryへ展開すること。
- `tests/integration/admin-master-use-cases.test.ts` / `tests/integration/checkout-order-use-cases.test.ts`の変更。

## 3. 質問 / 曖昧性

### Blocking questions

現時点でなし。

### Already-covered handling

実装開始時点のCurrent `main`で対象gapが十分なFormal Testによりcoveredされている場合、タスク全体をSTOPしない。

- Categoryだけalready covered: Category test変更をno-opにして残りを続行する。
- FR-AR-003だけalready covered: Order contract変更をno-opにして残りを続行する。
- 両方already covered: test codeを変更せず4-label re-auditとhandoff evidence確定を完了し、空PRは作らない。
- already covered判定はfile / exact titleまたはsuiteと判断理由をRun REPORTへ残す。

### Stop conditions

以下のいずれかに該当した場合はscopeを広げずSTOPする。

- `FR-PR-055`の並行createをCurrent Dexie / fake-indexeddbで決定的に観測できず、retry / sleep / hook / spy等が必要になる。
- `FR-AR-003`の確認に新flow、新Test fixture設計、Production hook等が必要になる。
- Current implementationがRequirementと矛盾し、coverage-onlyでは閉じられない。
- `CT-DB-KEY-001`の `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` のいずれかをCurrent evidenceで説明できない。
- `CP-FORM-001`の `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012` のいずれかをCurrent evidenceで説明できない。
- 4 labelの`stop=0`化にRequirement意味の縮小、新ID制度、第三のTraceability SSOTが必要になる。
- workflow / package / config / validator / DB schema / Curriculum / Trainingのplanned changeが必要になる。
- validation failure repairがRequirement判断、破壊的操作、外部副作用、安全な最小修正を超える変更を必要とする。

### Assumptions allowed

- `expect()`の細かな記法やlocal変数名は既存suite conventionに合わせる。
- Category並行createは`Promise.all`等の最小手段を使う。
- Order raw recordの取得は既存Repository / DB seamのうち追加helperを不要にする最小手段を使う。

### Open questions

- なし。

## 4. 影響範囲

### Impacted areas

planned implementationの想定変更対象:

- `tests/repository-contract/repositories.test.ts`
- `tests/contracts/transactions.test.ts`
- 本Plan
- 新しいimplementation Run Artifact

already-covered判定により2つのtest fileの片方または両方が変更されないことを許容する。

Validation failure repairが発生した場合のみ、Current `AGENTS.md` §8 / repair-loopに従う最小追加差分を許容し、その理由をRun REPORTへ記録する。

### Files to inspect

#### Category coverage

- `docs/01_requirements/functional_requirements.md` — `FR-PR-055`
- `src/infrastructure/database/dexie/basic-repositories.ts` — `DexieCategoryRepository.createAtEnd()`
- `src/infrastructure/database/dexie/database.ts` — Category index contract
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts` — read-only確認。変更しない。

#### Order DTO boundary

- `docs/01_requirements/functional_requirements.md` — `FR-AR-003`
- `src/application/contracts/orders.ts` — `OrderDetailDto` / nested DTO
- `src/domain/contracts/entities.ts` — Order / Payment / Shipment / OrderStatusHistory
- `src/infrastructure/database/dexie/order-review-repositories.ts` — `DexieOrderRepository.getDetail()`
- `tests/contracts/transactions.test.ts` — `keeps order, payment, shipment, and histories consistent`
- `src/application/use-cases/checkout-order-use-cases.ts` — `getMyOrder()`のread-only確認

#### `CT-DB-KEY-001`

- `docs/01_requirements/non_functional_requirements.md` — `NFR-RL-011`
- `docs/01_requirements/functional_requirements.md` — `FR-PR-041`, `FR-PR-050`
- normalization / mapper / relevant Repository・Use Case code
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/admin-product-use-cases.test.ts`
- PR #84後の上記3Requirementに直接対応するCurrent Formal evidence

#### `CP-FORM-001`

- `docs/01_requirements/non_functional_requirements.md` — `NFR-AX-001`, `NFR-AX-007`, `NFR-MA-012`
- shared `INPUT_LIMITS` / normalization / Application Error contractを担うCurrent code
- `tests/component/presentation-foundation.test.tsx` — Error Summary / focus / field link
- PR #84後のshared input limits / Application validation / Application Errorに直接対応するCurrent Formal evidence

#### 4-label handoff evidence

- PR #78 `docs/12_quality/requirements_traceability.md` — read-only参照
- `tests/contracts/architecture.test.ts`
- 上記Category / Order / DB-Key / Form evidence

## 5. 変更方針

### Change strategy

1. **Current evidence first**
   - Requirement → source → existing Formal Testの順で再確認する。
   - 十分coveredなら`already covered / no change`とし、不要なtestを増やさない。

2. **Coverage-only**
   - Product behaviorとRequirementが一致する場合だけTestを補完する。
   - Requirement矛盾はProduct gapとしてSTOPし、このPRへplanned Product fixを混ぜない。
   - validation failure repairだけは`AGENTS.md` §8 / repair-loopを優先する。

3. **CategoryはRepository Contract test 1本で閉じる**
   - 既存空DB fixtureと`DexieCategoryRepository`を直接利用する。
   - 3件のID / nameを固定し、Category unique index由来の無関係なfailureを避ける。
   - `sortOrder=10`、並行追加`20/30`、persisted `[10,20,30]`だけを検証する。
   - `CT-CATEGORY-002` representative evidenceは新exact-title 1本とする。
   - Application fixture / helper / spyは追加しない。

4. **Order DTOは既存Order contract testへassertionだけ追加する**
   - 既存Order / Payment / Shipmentを再利用する。
   - non-null `actorUserId`を持つHistory 1件を直接Repository経由で追加する。
   - raw fieldの存在、Timelineへのpositive mapping、対応public fieldのabsenceを対で確認する。
   - Checkout flow、DTO専用fixture、新helperを追加しない。

5. **4-label re-auditはRequirement ID単位でread-only実施する**
   - `CT-DB-KEY-001`: `NFR-RL-011` / `FR-PR-041` / `FR-PR-050`。
   - `CP-FORM-001`: `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012`。
   - `CT-CATEGORY-002`: `FR-PR-055`。
   - `CT-BOUNDARY-001`: `FR-AR-001～004` / `NFR-MA-020～023`。
   - 不足が見つかった場合は本remediationへ追加testを際限なく増やさずSTOPし、別gapとして扱う。

6. **PR #78へはhandoff情報だけ作る**
   - 本remediationではPR #78 branchを編集しない。
   - Run REPORTに、複合labelで必要な最小suite setと`suite-level` taxonomy調整案を残す。
   - 実際のtaxonomy / Traceability更新は本remediation完了後のFollow-upとする。

### 実行タスク

- [ ] 1. 実装開始時に最新`main`を確認し、Base SHA以降のsemantic impactがあればCurrent evidenceを再監査する。
- [ ] 2. Current repository rules（`AGENTS.md`、`PLANS.md`、Run Artifact contract、test conventions）を再読し、implementation Run Artifactを開始する。
- [ ] 3. `FR-PR-055`とCurrent Category implementation / Formal Testを再監査する。
- [ ] 4. 未coveredの場合だけ`tests/repository-contract/repositories.test.ts`へ `creates the first category at ten and serializes concurrent appends` を1本追加する。
  - 固定fixtureは`category-1/Category 1`、`category-2/Category 2`、`category-3/Category 3`。
  - 1件目`10`、並行追加`20/30`、persisted `[10,20,30]`を確認する。
  - 不安定なら複雑化せずSTOPする。
- [ ] 5. `FR-AR-003`とCurrent Order DTO mapping / Formal Testを再監査する。
- [ ] 6. 未coveredの場合だけ`tests/contracts/transactions.test.ts`の既存Order testへHistory 1件とboundary assertionを追加する。
  - Historyは`order-history-1` / `ORDER_CREATED` / `pending_payment` / `customer.id` / `FIXED_NOW`を固定使用する。
  - raw Order / Payment / Shipment / Historyのinternal field存在を確認する。
  - `detail.timeline`が1件かつ`pending_payment`をmapしていることを確認する。
  - root / paymentAttempts / shipment / timelineから対応internal fieldが除外されていることを確認する。
- [ ] 7. `CT-DB-KEY-001`を`NFR-RL-011` / `FR-PR-041` / `FR-PR-050`ごとにread-only再監査する。
- [ ] 8. `CP-FORM-001`を`NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012`ごとにread-only再監査する。
- [ ] 9. `CT-CATEGORY-002` / `CT-BOUNDARY-001`を追加Testまたはalready-covered evidenceで再監査する。
- [ ] 10. 4 labelのCurrent implementation evidence / representative Formal evidence / final dispositionをRun REPORTへ確定する。複合labelは各suiteが担うRequirement範囲を明記する。
- [ ] 11. 4 labelのいずれかで元Requirementを説明できなければ`stop`として扱い、本remediationを無理に`stop=0`へしない。
- [ ] 12. 実際に変更したtest fileをfocused実行する。
- [ ] 13. 関連local suite / static checks / Sanitizer / scope checkを実行する。
- [ ] 14. validation failure時は`AGENTS.md` §8 / repair-loopに従って原因分類し、安全な最小repairのみ行う。
- [ ] 15. Run Artifactへvalidation、scope、already-covered/no-op判定、PR #78 handoff情報を同期してfinalizeする。
- [ ] 16. test code変更が1件以上ある場合だけcoverage-remediation PRを`main`向けにOPENする。両gap no-opなら空PRを作らない。
- [ ] 17. PRを作成した場合はexact-head required CIを確認し、Blocking Finding / required CI failureが残る状態をmerge可としない。mergeは明示指示があるまで行わない。

## 6. 検証方法

### Focused validation — changed files only

変更したtest fileだけを直接実行する。

- Category test変更時: `tests/repository-contract/repositories.test.ts`
- Order DTO変更時: `tests/contracts/transactions.test.ts`

片方がalready covered / no-opなら変更していないfileのfocused runは必須にしない。

### Local required validation — relevant scope only

通常は以下を実行する。

- `pnpm run test:repository` — Category変更時、または`CT-DB-KEY-001` evidence確認に必要な場合。
- `pnpm run test:contracts` — Order DTO変更時、または`CT-BOUNDARY-001` evidence確認に必要な場合。
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `git diff --check`
- Current Codex artifact Sanitizer Write / Check（residual 0）

`CT-DB-KEY-001` / `CP-FORM-001`の代表evidenceがrepository/contracts以外のsuiteにある場合、そのevidence確認に必要なsuiteだけ追加する。`test:unit` / `test:integration` / `test:component`を「念のため」で一律追加しない。

### Exact-head PR CI — full regression

PRを作成した場合はCurrent Web CIをfull regressionのSSOTとする。

少なくともCurrent required jobsの以下を確認する。

- style / specification quality
- code quality / typecheck / security
- Codex artifact sanitization
- Vitest matrix: unit / integration / repository / component / contracts
- build / required E2E等、Current branch protection / required checksに含まれるjob

ローカルでPR CI全体を重複再現しない。CI failureは`AGENTS.md` §8 / repair-loopに従う。

### 成功判定

- 実際に変更したtest fileのfocused testがPASSする。
- 関連local suite / static checksがPASSする。
- PR作成時はexact-head required CIがPASSする。
- `git diff --check` PASS。
- Sanitizer residual 0。
- planned implementationとしてProduct / Application / Infrastructure / Presentation source変更0。
- validation repairが発生した場合は必要性・最小性・planned scopeとの差分がRun REPORTに記録される。
- `tests/integration/admin-master-use-cases.test.ts`変更0。
- `tests/integration/checkout-order-use-cases.test.ts`変更0。
- `CT-DB-KEY-001`は3Requirementすべてを説明できる。
- `CP-FORM-001`は3Requirementすべてを説明できる。
- 4-label re-auditで意味の縮小なしに`stop=0`を説明できる。
- `CT-CATEGORY-002`は新Category exact-title 1本を代表evidenceにできる。
- PR #78へ渡すhandoff情報がRun REPORTに揃っている。
- 両gap already coveredなら不要なtest変更や空PRを作らない。

## 7. リスクと未解決論点

### Risks

1. **Category concurrency testが環境依存になる**
   - 既存Repository Contract fixtureで1本だけ試し、決定的でなければSTOPする。retry / sleep / spy等を入れない。
2. **Category unique indexがsortOrder検証と無関係なfailureを起こす**
   - 3件のIDとnormalize後nameを固定で重複させない。
3. **Order DTO negative assertionが空TimelineでもPASSする**
   - non-null Actorを持つHistoryを1件追加し、Timeline件数とstatusのpositive mappingを先に確認する。
4. **`CT-DB-KEY-001`の意味をProduct code / SKUへ縮小する**
   - 3Requirement IDを個別監査する。
5. **`CP-FORM-001`から`NFR-MA-012`を落とす**
   - `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012`を個別監査する。
6. **複合labelを単一suiteへ無理に押し込む**
   - 必要な場合だけ最小suite setをhandoff evidenceへ記録する。
7. **PR #78更新まで本remediationのDoDへ混ぜる**
   - 本remediationはhandoff情報確定で完了し、PR #78編集はFollow-upへ分離する。
8. **local validationを広げすぎて無関係なrepairを引き込む**
   - focused file + 関連suite + static checksに限定し、full regressionはexact-head CIへ委譲する。
9. **coverage remediationからProduct修正へscope creepする**
   - Requirement矛盾はSTOP。validation failure repairとは明確に区別する。

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
- `CT-CATEGORY-002`は新Category exact-titleへ同期する。
- `CT-BOUNDARY-001`はArchitecture contract等が`FR-AR-001/002/004`と該当NFR群、Order repository contract evidenceが`FR-AR-003`を担う形で同期する。
- `CT-DB-KEY-001` / `CP-FORM-001`もRun REPORTで確定したCurrent evidenceへ同期する。
- PR #78のTraceability / Run / PR本文を一度だけCurrent evidenceへ揃える。

## 10. 備考

- Planの詳細さは実装時の追加判断を減らすためのものであり、実装自体を複雑化する意図はない。
- 実コード差分の通常目標は「Category Repository Contract test 1本追加 + 既存Order contract testへのHistory 1件とnested DTO boundary assertion追加」の2箇所だけ。
- `tests/integration/admin-master-use-cases.test.ts` / `tests/integration/checkout-order-use-cases.test.ts`は変更しない。
- 新helper / 新Test file / planned Production source変更 / framework追加は行わない。
- Current evidenceでalready coveredなら、不要な実装を増やさないことを最優先する。
- Full regressionはexact-head PR CIへ委譲し、ローカルでは変更とevidence確定に必要な範囲へ絞る。