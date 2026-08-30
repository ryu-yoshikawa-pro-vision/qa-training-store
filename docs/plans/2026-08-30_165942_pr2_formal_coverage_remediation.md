# PR 2 Formal Coverage Remediation Plan

- Status: Planned
- Branch: `test/pr2-formal-coverage-remediation`
- Implementation Base SHA: `3022a74ba7cde2d3cc81ce318c6320dbf78115c6`
- Parent Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Parent PR 2 Plan: `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md`
- Parent PR: #78 `docs: Formal Test Strategy / Traceability を Current contract に整合する`
- Predecessor repair: PR #84 `fix: Product正規化と入力制限contractをCurrent仕様へ整合`（Merged）

## Progress

- [x] 最新 `main`（PR #84 merge後）から独立branchを作成し、本Planを作成
- [ ] Current `main` で `CT-CATEGORY-002` のRequirement・実装・既存Formal Testを再監査
- [ ] `CT-CATEGORY-002` の不足Formal coverageを既存Repository Contract suiteへ最小追加
- [ ] Current `main` で `CT-BOUNDARY-001` のRequirement・実装・既存Formal Testを再監査
- [ ] `CT-BOUNDARY-001` の不足Formal coverageを既存Order repository contract testへ最小追加
- [ ] `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` をCurrent evidenceで再監査
- [ ] 4 labelすべてについてPR #78へ戻せる代表Formal evidenceを確定し、`stop=0`を確認
- [ ] 必要最小限のlocal validation・scope check・Sanitizerを完了

## 0. 依頼概要

- 依頼内容:
  - PR #78の再監査で不足が判明したFormal coverageだけを、既存Test suiteへの最小変更で補完する。
  - Product implementation gapはPR #84で別PRとして修正済みのため、このbranchのplanned implementationではProduct sourceを変更しない。
- 背景:
  - PR #78ではlower TraceabilityをCurrent Formal evidenceへ接続する必要がある。
  - 再監査の結果、`CT-CATEGORY-002 / FR-PR-055` と `CT-BOUNDARY-001 / FR-AR-003` はProduct behavior自体ではなくFormal Test evidenceが不足している。
  - `CT-DB-KEY-001` / `CP-FORM-001` はPR #84でProduct contract gapを修正済みであり、Current `main` で元label意味全体に対する代表evidenceを再確定する。
  - coverage evidenceが確定する前にPR #78のTraceabilityを再編集すると手戻りになるため、本remediationを先に完了させ、その後PR #78を一度だけCurrent evidenceへ同期する。
- 期待成果:
  - `CT-CATEGORY-002` と `CT-BOUNDARY-001` の不足Formal coverageが既存suiteへの最小変更で補完される。
  - `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` の4 labelについて、元のlabel意味を縮小せずCurrent evidenceが整理される。
  - 複合labelを単一testへ無理に押し込まず、必要な場合だけ最小のsuite setで説明する。
  - 新Test file、新helper、新frameworkは追加しない。

## 1. ゴール / 完了条件

### Goal

PR #78を止めている残存Formal coverage gapだけを閉じ、lower TraceabilityをCurrent Formal evidenceへ正確に接続できる状態を作る。

### Definition of Done

1. `CT-CATEGORY-002 / FR-PR-055`について、`tests/repository-contract/repositories.test.ts`へRepository contract testを1本だけ追加し、以下を1つのbehavioral scenarioで確認できる。
   - Test titleは `creates the first category at ten and serializes concurrent appends` とする。
   - 空のCategory storeに最初のCategoryを作成すると`sortOrder=10`になる。
   - その状態から2件のCategory createを並行発行したとき、両方が成功し、追加2件の`sortOrder`が`20` / `30`になる。
   - DB上でもCategory全件の`sortOrder`が`10` / `20` / `30`として重複なくpersistされる。
   - `DexieCategoryRepository.createAtEnd()`を直接使用し、Application session / clock / transaction runner等の不要なfixtureを増やさない。
   - 既存 `tests/integration/admin-master-use-cases.test.ts` の `creates categories at the end and reorders every ID in steps of ten` は通常のApplication behavior evidenceとして変更しない。
   - Current Dexie / fake-indexeddb環境で並行createを決定的に観測できない場合は、不安定なtest・retry・sleep・source text assertion・test-only production hookを追加せずSTOPする。
2. `CT-BOUNDARY-001`のうち不足している `FR-AR-003` について、既存`tests/contracts/transactions.test.ts`の `keeps order, payment, shipment, and histories consistent` へ最小assertionだけを追加し、`DexieOrderRepository.getDetail()`がUI向けOrder DTOへ内部情報を公開しないことを明示できる。
   - 既存test内でOrder / Payment / Shipmentはすでにraw entityとして作成されるため、Checkout Use Case、Session、Gateway、Clock等の追加fixtureを使わない。
   - 同test内にOrderStatusHistoryを1件だけ追加し、raw historyとpublic timelineの境界を確認できる状態にする。
   - raw Orderに`version`が存在する。
   - public `detail` rootにはraw `version`が存在せず、`orderActionVersion === rawOrder.version`である。
   - raw Paymentに`gatewayIdempotencyKey`と`version`が存在する。
   - `detail.paymentAttempts`の各要素には`gatewayIdempotencyKey`と`version`が存在しない。
   - raw Shipmentに`version`が存在する。
   - `detail.shipment`には`version`が存在しない。
   - raw OrderStatusHistoryに`actorUserId` propertyが存在する。値はnullでもnon-nullでもよい。
   - `detail.timeline`の各要素には`actorUserId`が存在しない。
   - DTO専用fixture、別flow、DB直接mutation用helperは追加しない。
3. PR #84 merge後のCurrent `main`を根拠に、`CT-DB-KEY-001`の元label意味全体をRequirement ID単位で再監査する。
   - `NFR-RL-011`: IndexedDB Indexへboolean/null/undefinedを直接保存せず、数値Key / non-null Scope Keyへ投影するcontract。
   - `FR-PR-041`: Category名・Brand名・Variation選択肢のTrim / Unicode NFKC / locale非依存小文字化とnormalized comparison keyによる重複判定。
   - `FR-PR-050`: productCode / SKUのTrim / Unicode NFKC / ASCII大文字化、format validation、case-insensitive uniqueness。
   - 上記3要件を満たすCurrent implementation evidenceと必要最小限のFormal evidenceを確定する。Product code / SKUだけを確認して`FR-PR-041`を落とさない。
4. PR #84 merge後のCurrent `main`を根拠に、`CP-FORM-001`が元のlabel意味全体に対してshared `INPUT_LIMITS`・Form/Application boundary・Application Error contract・Accessibility側のForm error contractを説明できる。
5. 4 labelすべてを再監査し、元のlabel意味を縮小せず`stop=0`である。
   - 単一testで説明できるlabelは`exact-title`を維持する。
   - 複合label全体を単一suiteで説明できない場合、remediation Run上は必要最小限の複数evidenceを記録する。
   - PR #78へhandoffする際は新Dispositionを作らず、`suite-level`を「1つのsuite、または複合label全体を説明するための必要最小限のsuite set」と読めるようtaxonomy説明を最小修正してから該当rowを同期する。
   - `exact-title` / `suite-level`という分類に合わせるためにRequirement意味を縮小しない。
6. Planned implementationではProduct / Application / Infrastructure / Presentation sourceを変更しない。
   - ただしlocal validation / CIでFAILが発生した場合はCurrent `AGENTS.md` §8とrepair-loopを優先する。
   - FAIL原因が安全に最小修正でき、Requirement判断や破壊的操作を伴わない場合はrepo ruleに従いrepairしてよい。
   - repairが本remediationの責務を実質的に広げる、Requirement判断が必要、または安全な最小修正を超える場合はSTOPする。
7. 実際に変更したtest fileのfocused test、関連するlocal suite、static checks、Sanitizer、scope checkが完了する。full regressionはexact-head PR CIで確認する。
8. planned changeは既存Formal Test、当Plan、Run Artifactに限定し、unexpected scopeがない。Validation failure repairが発生した場合は理由と追加差分をRun REPORTへ明記する。
9. 少なくとも1つのtest code変更が必要だった場合だけcoverage-remediation PRを1本OPENする。実装開始時点ですべてalready coveredなら空PRを作らず、evidenceを記録してPR #78 handoffへ進む。

## 2. 現状理解と前提

### Current understanding

- Implementation BaseはPR #84 merge直後の`main`、`3022a74ba7cde2d3cc81ce318c6320dbf78115c6`。
- `FR-PR-055`は「新規Categoryは0件時`sortOrder=10`、既存時`max(sortOrder)+10`で末尾へ追加し、最大値取得と作成を同一Transactionで行うこと」。
- Current `DexieCategoryRepository.createAtEnd()`は`src/infrastructure/database/dexie/basic-repositories.ts`にあり、`db.transaction("rw", db.categories, ...)`内でCategory一覧取得、最大`sortOrder`算出、`categories.add()`を行っている。
- `tests/repository-contract/repositories.test.ts`はすでに`DexieCategoryRepository`と空の`ScenarioShopDatabase`を使うRepository contract fixtureを持つため、FR-PR-055専用testを追加する最小の場所である。
- Existing Formal Test `tests/integration/admin-master-use-cases.test.ts` の `creates categories at the end and reorders every ID in steps of ten` は既存Categoryがある通常ケースの`max+10`とreorder behaviorをApplication経由で確認している。今回のRepository transaction責務を追加して肥大化させない。
- `FR-AR-003`は「UI向けOrder DTOにGateway Key、Repository Version、内部Actor IDを含めないこと」。
- `src/application/contracts/orders.ts` の `OrderDetailDto` は`orderActionVersion`を公開contractとして持つ一方、raw `version`、Gateway key、Actor IDをcontractへ含めていない。
- Domain側ではOrder、Payment、ShipmentにRepository `version`があり、Paymentには`gatewayIdempotencyKey`、OrderStatusHistoryには`actorUserId`がある。
- Current `DexieOrderRepository.getDetail()`はDomain/DB recordから`OrderDetailDto`を明示的に組み立て、Paymentの`gatewayIdempotencyKey` / `version`、Shipmentの`version`、Order status historyの`actorUserId`等をDTOへコピーしていない。
- `tests/contracts/transactions.test.ts` の `keeps order, payment, shipment, and histories consistent` は`DexieOrderRepository` / `DexiePaymentRepository` / `DexieShipmentRepository`を直接使い、Order / Payment / Shipment作成後に`orderRepository.getDetail()`を取得しているため、FR-AR-003を最小差分で検証する最も近い既存seamである。
- `OrderStatusHistory.actorUserId`はCurrent Domain contract上`EntityId | null`であり、nullは正規のraw internal valueである。FR-AR-003の検証にnon-null Actor IDは不要である。
- PR #78 branchのlower Traceability taxonomyでは`exact-title`と`suite-level`を使用し、現在の`suite-level`説明は1つのtest file / suiteを前提にしている。
- `CT-BOUNDARY-001`は `FR-AR-001～004` と `NFR-MA-020～023` を含む複合labelで、Current `tests/contracts/architecture.test.ts`だけでは`FR-AR-003`のOrder DTO runtime boundaryを直接保証しない。
- `CT-DB-KEY-001`は `NFR-RL-011`、`FR-PR-041`、`FR-PR-050` を含むため、Product code / SKUだけでなくCategory / Brand / Variationのnormalized duplicate contractも監査対象である。
- PR #84により、以前implementation gapだった`CT-DB-KEY-001`と`CP-FORM-001`はCurrent `main`上で再監査可能な状態になった。
- Current `AGENTS.md`の必須検証は「必要に応じて一部または全部」であり、PR Web CIではunit / integration / repository / component / contractsをmatrixで実行する。
- Current `AGENTS.md` §8では品質ゲートFAIL時、安全に最小修正できるものは元タスクとの関連性だけを理由に放置せずrepairする契約がある。

### Assumptions

- Historical gap analysisは調査の起点として利用するが、最終判定は必ず実装開始時点のCurrent `main`のRequirement・source・Formal Testを再読して行う。
- coverage gapはplanned implementation上Product sourceを変更せず閉じられることを前提とする。
- Requirementを確認するTestはsource text検索や実装文字列の存在確認ではなく、observable behavior / public DTO boundaryを検証する。
- `CT-CATEGORY-002`の追加実装は既存Repository Contract suite内の専用test 1本に集約する。
- Category並行createのbehavioral testはtransaction実装詳細そのものを証明するものではなく、read-max → createがtransaction外へ分離される退行を既存seamで検知する最小のblack-box regressionとして扱う。
- 上記並行createがCurrent fake-indexeddb / Dexie test environmentで決定的に観測できない場合は、不安定なtestを追加せずSTOPする。
- `CT-BOUNDARY-001 / FR-AR-003`では、`DexieOrderRepository.getDetail()`の既存Contract test seamでraw objectに内部fieldが存在することと、対応するpublic DTOのroot / nested objectからproperty自体が除外されることを対で確認する。
- 複合labelが複数suiteを必要とする場合、新しいDispositionを作らず、PR #78 handoff時に`suite-level`の説明だけを最小拡張する。
- full regressionはPR CIをSSOTとし、ローカルでは変更とevidence確定に直接必要なsuiteを優先する。

### Non-goals

- `docs/08_testing/test_strategy.md`や`docs/12_quality/requirements_traceability.md`を本remediation PRで更新しない。
- PR #78 branch、Child Plan、既存Run Artifact、PR本文を本remediation実装中に変更しない。
- `normalizeCode()`、Product code / SKU normalization、normalized uniquenessをplanned implementationで再修正しない。
- shared `INPUT_LIMITS`、Form/Application validation、Application Errorをplanned implementationで再修正しない。
- Product / Application / Infrastructure / Presentation sourceをplanned implementation対象にしない。
- Repository API変更、DB schema / migration変更。
- Test-only production hook、failure injection framework、transaction wrapper spy、source text assertionの追加。
- 新Test file、新Test helper、新ID制度、Test titleへのlabel埋込み。
- E2E / Native testの追加。
- 4-label代表evidenceを網羅的Test inventoryへ展開すること。
- `tests/integration/admin-master-use-cases.test.ts`の変更。
- `tests/integration/checkout-order-use-cases.test.ts`の変更。

## 3. 質問 / 曖昧性

### Blocking questions

現時点でなし。

### Already-covered handling

実装開始時点のCurrent `main`で対象gapがすでに十分なFormal Testによりcoveredされていた場合、タスク全体をSTOPしない。

- `CT-CATEGORY-002`だけalready covered: Category test変更をno-opとし、残りのremediation / re-auditを続行する。
- `CT-BOUNDARY-001 / FR-AR-003`だけalready covered: Order DTO test変更をno-opとし、残りのremediation / re-auditを続行する。
- 両gapともalready covered: test codeを変更せず4-label re-auditを完了し、空のremediation PRは作らずPR #78 handoffへ進む。
- already coveredと判断した場合は、Current evidenceのfile / exact titleまたはsuiteと判断理由をRun REPORTへ記録する。

### Stop conditions

以下のいずれかに該当した場合は推測でscopeを広げずSTOPする。

- `FR-PR-055`の並行create behaviorをCurrent Dexie / fake-indexeddb環境で決定的に観測できず、専用hook・spy・retry・sleep・failure injection等が必要になる。
- `FR-AR-003`の確認に新flow、新Test fixture設計、Production hook等が必要になる。
- Current implementationがRequirementと矛盾し、coverage-onlyでは閉じられない。
- `CT-DB-KEY-001`について `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` のいずれかをCurrent evidenceで説明できない。
- `CP-FORM-001`の元label意味全体をPR #84後のCurrent evidenceで説明できない。
- 4 labelのいずれかを`stop=0`にするためにRequirement意味の縮小、新Test ID制度、第三のTraceability SSOTが必要になる。
- workflow / package / config / validator / DB schema / Curriculum / Trainingのplanned changeが必要になる。
- validation failure repairがRequirement判断、破壊的操作、外部副作用、安全な最小修正を超える変更を必要とする。

### Assumptions allowed

- 新規assertionの具体的な`expect()`記法や変数名は既存suite conventionへ合わせる。
- Category並行createは`Promise.all`等、既存TypeScript / Vitestで最小の方法を使う。
- raw property確認では値の業務的意味を再検証せず、対象propertyがraw modelに存在することだけをpreconditionとする。
- DTO absenceはrootだけでなく、Requirement上対応するnested objectを直接assertする。
- OrderStatusHistoryは既存Order contract testに1 recordだけ追加し、専用fixture/helperは作らない。

### Open questions

- なし。

## 4. 影響範囲

### Impacted areas

planned implementationの想定変更対象は原則以下だけ。

- `tests/repository-contract/repositories.test.ts`
- `tests/contracts/transactions.test.ts`
- 本Plan
- 新しいimplementation Run Artifact

Validation failure repairが発生した場合のみ、Current `AGENTS.md` §8 / repair-loopに従う最小追加差分を許容し、その理由をRun REPORTへ記録する。

### Files to inspect

#### Category coverage

- `docs/01_requirements/functional_requirements.md` — `FR-PR-055`
- `src/infrastructure/database/dexie/basic-repositories.ts` — `DexieCategoryRepository.createAtEnd()`
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts` — 既存通常ケースevidenceの確認だけ。変更しない。

#### Order DTO boundary

- `docs/01_requirements/functional_requirements.md` — `FR-AR-003`
- `src/application/contracts/orders.ts` — `OrderDetailDto` / nested DTO
- `src/domain/contracts/entities.ts` — raw Order / Payment / Shipment / OrderStatusHistory
- `src/infrastructure/database/dexie/order-review-repositories.ts` — `DexieOrderRepository.getDetail()`
- `tests/contracts/transactions.test.ts` — `keeps order, payment, shipment, and histories consistent`
- `src/application/use-cases/checkout-order-use-cases.ts` — `getMyOrder()`が`OrderRepository.getDetail()`をそのまま公開境界へ返すことのread-only確認

#### `CT-DB-KEY-001` re-audit

- `docs/01_requirements/non_functional_requirements.md` — `NFR-RL-011`
- `docs/01_requirements/functional_requirements.md` — `FR-PR-041`, `FR-PR-050`
- `src/domain/services/normalization.ts`
- Category / Brand / Variation duplicate validationを担うCurrent Use Case / Repository code
- Product code / SKU normalization・uniquenessを担うCurrent Use Case / Repository code
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/admin-product-use-cases.test.ts`
- PR #84 changed testsのうち上記3Requirementに直接対応するCurrent Formal evidence

#### `CP-FORM-001` / 4-label re-audit / PR #78 handoff

- PR #78 `docs/12_quality/requirements_traceability.md`
- `tests/component/presentation-foundation.test.tsx`
- PR #84 changed testsのうちshared `INPUT_LIMITS` / Form/Application validation / Application Errorに直接対応するCurrent test file
- `tests/contracts/architecture.test.ts`
- `tests/contracts/transactions.test.ts`

## 5. 変更方針

### Change strategy

1. **Current evidence first**
   - Historical findingをそのまま修正対象とせず、Requirement → source → existing Formal Testの順で再確認する。
   - すでにCurrent TestでRequirementを十分直接保証している場合は、そのgapを`already covered / no change`として扱う。

2. **Coverage-only**
   - 既存Product behaviorとRequirementが一致している場合だけTestを補完する。
   - Product behaviorがRequirementと矛盾する場合はimplementation gapとしてSTOPし、このPRへplanned Product fixを混ぜない。
   - Validation failure repairは別契約としてCurrent `AGENTS.md` §8 / repair-loopを優先する。

3. **CategoryはRepository Contractへ1本だけ追加する**
   - `tests/repository-contract/repositories.test.ts`の既存`ScenarioShopDatabase` fixtureと`DexieCategoryRepository`をそのまま使う。
   - Test titleは `creates the first category at ten and serializes concurrent appends` に固定する。
   - Application Use Case、Session、Clock、IdGenerator、Transaction Runnerを追加しない。
   - 新しいTest file / helperは作らない。
   - 既存`tests/integration/admin-master-use-cases.test.ts`は変更しない。

4. **Category coverageは1本のbehavioral testで閉じる**
   - test開始時点でCategory storeは空の既存Repository Contract fixtureを使用する。
   - `DexieCategoryRepository.createAtEnd()`で1件createし、返却値とpersisted recordの`sortOrder=10`を確認する。
   - 続けて同Repositoryから2件を並行createする。
   - 並行createした2件の`sortOrder`をsortして`[20, 30]`になることを確認する。
   - DB全件の`sortOrder`をsortして`[10, 20, 30]`になることを確認し、重複やlost writeがないことを固定する。
   - transaction implementation detailそのものをspyせず、Requirement上のobservable resultだけを検証する。
   - このtestがCurrent環境で安定しない場合は複雑な代替実装へ進まずSTOPする。

5. **Order DTO boundaryは既存Order repository contract testへassertionだけ追加する**
   - `tests/contracts/transactions.test.ts`の既存 `keeps order, payment, shipment, and histories consistent` を使用する。
   - 既存Order / Payment / Shipment作成処理はそのまま利用し、Checkout flowを新たに通さない。
   - `orderRepository.appendStatusHistory()`で1件のOrderStatusHistoryを追加する。専用fixtureやhelperは作らない。
   - raw Orderの`version`存在を確認し、`detail` rootに`version`がないこと、`detail.orderActionVersion === rawOrder.version`を確認する。
   - raw Paymentの`gatewayIdempotencyKey` / `version`存在を確認し、`detail.paymentAttempts`の各要素に両propertyがないことを確認する。
   - raw Shipmentの`version`存在を確認し、`detail.shipment`に`version`がないことを確認する。
   - raw OrderStatusHistoryの`actorUserId` property存在を確認し、`detail.timeline`の各要素に`actorUserId`がないことを確認する。raw値はnullでもよい。
   - whole-object snapshot、DTO専用fixture、Session/Gateway/Clock等のApplication fixtureを増やさず、Requirementに直接対応する明示assertionだけを追加する。
   - `tests/integration/checkout-order-use-cases.test.ts`は変更しない。

6. **`CT-DB-KEY-001`はRequirement IDごとにread-only再監査する**
   - `NFR-RL-011`: persistence projectionのboolean/null/undefined回避と数値Key / non-null Scope Keyを確認する。
   - `FR-PR-041`: Category / Brand / Variationのnormalized comparison keyと重複判定を確認する。
   - `FR-PR-050`: productCode / SKUのnormalize・format validation・normalized uniquenessを確認する。
   - 1つのexact-titleへ無理に集約せず、元label意味全体に必要な最小Formal evidenceをRun REPORTへ記録する。
   - Current evidenceで不足があれば本remediationへ追加testを広げずSTOPし、別gapとして扱う。

7. **`CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001`もread-only再監査する**
   - `CP-FORM-001`はshared `INPUT_LIMITS`、Application validation、Application Error、Form error accessibilityの元label意味全体を確認する。
   - `CT-CATEGORY-002`は新Category contract test + 既存Application evidenceでFR-PR-055を説明できることを確認する。
   - `CT-BOUNDARY-001`はArchitecture contract等とOrder DTO boundary evidenceで元label意味全体を説明できることを確認する。
   - 本remediation PRでTraceability docsを更新しない。

8. **PR #78 handoffでtaxonomy矛盾を解消する**
   - remediation merge後または両gap already covered確認後に、PR #78 branchへ最新mainを取り込む。
   - PR #78の`suite-level`説明を、新しいDispositionを追加せず「1つのtest file / suite、または複合label全体を説明するための必要最小限のsuite set」と読める最小表現へ修正する。
   - `CT-BOUNDARY-001`は、Architecture contractが`FR-AR-001/002/004`と該当NFR群、Order repository contract evidenceが`FR-AR-003`を担うことを明示する。
   - `CT-DB-KEY-001` / `CP-FORM-001`も元label意味全体に複数suiteが必要なら同じ`suite-level`ルールを使う。
   - Requirement意味を縮小して単一referenceへ押し込まない。

### 実行タスク

- [ ] 1. 実装開始時に`origin/main`をfetchし、`3022a74b...`以降にmainが進んでいればsemantic impactを確認する。必要なら最新mainを取り込んでからCurrent evidenceを再監査する。
- [ ] 2. Current repository rules（`AGENTS.md`、`PLANS.md`、Run Artifact contract、test conventions）を再読し、この実装用Run Artifactを開始する。
- [ ] 3. `FR-PR-055`、`src/infrastructure/database/dexie/basic-repositories.ts`の`DexieCategoryRepository.createAtEnd()`、`tests/repository-contract/repositories.test.ts`、既存Category integration evidenceを再監査する。
- [ ] 4. `CT-CATEGORY-002`が未coveredの場合だけ、`tests/repository-contract/repositories.test.ts`へ `creates the first category at ten and serializes concurrent appends` を1本追加する。
  - 空DBで最初のcreateが`sortOrder=10`でpersistされることを確認する。
  - 続けて2件を並行createし、追加2件が`20` / `30`になることを確認する。
  - DB全件が`10` / `20` / `30`となり、重複・lost writeがないことを確認する。
  - 並行createがCurrent環境で決定的に成立しない場合は、不安定なtestや専用hookを追加せずSTOPする。
- [ ] 5. `FR-AR-003`、`OrderDetailDto` / nested DTO、Domain raw entity、`DexieOrderRepository.getDetail()`、`tests/contracts/transactions.test.ts`の既存Order testを再監査する。
- [ ] 6. `CT-BOUNDARY-001 / FR-AR-003`が未coveredの場合だけ、`tests/contracts/transactions.test.ts`の `keeps order, payment, shipment, and histories consistent` へOrderStatusHistory 1件とraw/private → public DTO boundary assertionだけを追加する。
  - raw Order: `version`あり → `detail` root: `version`なし、`orderActionVersion === rawOrder.version`。
  - raw Payment: `gatewayIdempotencyKey` / `version`あり → `detail.paymentAttempts[*]`: 両propertyなし。
  - raw Shipment: `version`あり → `detail.shipment`: `version`なし。
  - raw OrderStatusHistory: `actorUserId` propertyあり → `detail.timeline[*]`: `actorUserId`なし。raw値はnull可。
  - Checkout Use Case、新fixture、新helperは追加しない。
- [ ] 7. `CT-DB-KEY-001`を `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` ごとにCurrent `main`でread-only再監査し、各RequirementのCurrent implementation / Formal evidenceを確定する。
- [ ] 8. `CP-FORM-001`をCurrent `main`でread-only再監査し、shared input limits・Form/Application validation・Application Error・Form error accessibility contractを説明する最小の代表Formal evidenceを確定する。
- [ ] 9. `CT-CATEGORY-002` / `CT-BOUNDARY-001`を追加Testまたはalready-covered evidenceで再監査する。複合labelは必要最小限のsuite setを許可し、各evidenceが元label意味のどの部分を担うかをRun REPORTへ明示する。
- [ ] 10. 4 labelのうち1件でもCurrent evidenceで元のlabel意味全体を説明できなければ`stop`として扱い、PR #78を完了扱いにしない。Requirement意味を縮小したり、部分coverageを単一referenceへ押し込んで`stop=0`を作らない。
- [ ] 11. 実際に変更したtest fileをfocused実行する。片方がno-opなら変更していないfileのfocused実行は必須にしない。
- [ ] 12. 関連するlocal suiteとstatic checksを実行する。通常は`test:repository` / `test:contracts`、`typecheck`、`lint`、`format:check`、`lint:markdown`、`git diff --check`、Sanitizerを対象とする。変更が片方だけなら関連suiteだけでもよいが、4-label evidence確認に必要な追加suiteがある場合はそのsuiteだけ追加する。
- [ ] 13. local validation failureが出た場合は`AGENTS.md` §8 / repair-loopに従い原因を分類し、安全に最小修正できる場合だけrepairする。planned scope外のrepair差分はRun REPORTへ明記する。
- [ ] 14. Run Artifactへ4-labelの最終evidence・validation・scope・already-covered/no-op判定を同期し、Current Run contractに従ってfinalizeする。
- [ ] 15. test code変更が1件以上ある場合だけcoverage-remediation PRを`main`向けに1本OPENする。PR本文では実際に閉じたgapと4-label re-auditの結果を簡潔に記載する。両gap no-opなら空PRを作らない。
- [ ] 16. remediation PRを作成した場合、exact-head PR CIでunit / integration / repository / component / contractsその他Current required jobsを確認する。Blocking Findingやrequired CI failureが残る場合はmerge可としない。mergeは明示指示があるまで行わない。
- [ ] 17. remediation merge後、または両gap no-op確認後、PR #78 branchへ最新mainを取り込み、`suite-level` taxonomy説明・Traceability row・Run / PR本文をCurrent evidenceへ一度だけ同期する。

## 6. 検証方法

### Focused validation — changed files only

実装中の高速feedbackとして、実際に変更したtest fileだけを直接実行する。

- Category testを追加した場合:
  - `tests/repository-contract/repositories.test.ts`
- Order DTO assertionを追加した場合:
  - `tests/contracts/transactions.test.ts`

両方変更した場合は2 fileを実行する。片方がalready covered / no-opなら、そのfileをfocused validationのためだけに再実行する必要はない。

### Local required validation — relevant scope only

Current `AGENTS.md`の「必要に応じて一部または全部」を正とし、本remediationの変更とevidence確定に直接必要なlocal gateへ限定する。

通常は以下を実行する。

- `pnpm run test:repository` — Category Repository Contract変更がある場合、または`CT-DB-KEY-001` evidence確認に必要な場合。
- `pnpm run test:contracts` — Order DTO boundary変更がある場合、または`CT-BOUNDARY-001` evidence確認に必要な場合。
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `git diff --check`
- Current Codex artifact Sanitizer Write / Check（residual 0）

`CT-DB-KEY-001` / `CP-FORM-001`の代表evidenceがrepository/contracts以外のsuiteにある場合、そのevidenceを確認するために必要なsuiteだけ追加実行してよい。`test:unit` / `test:integration` / `test:component`を「念のため」という理由だけで一律追加しない。

### Exact-head PR CI — full regression

本remediation PRを作成した場合、Current Web CIをfull regressionのSSOTとする。

少なくともCurrent required jobsで以下を確認する。

- style / specification quality
- code quality / typecheck / security
- Codex artifact sanitization
- Vitest matrix: unit / integration / repository / component / contracts
- build / required E2E等、Current branch protection / required checksに含まれるjob

ローカルでPR CI全体を重複再現しない。CI failureはCurrent `AGENTS.md` §8とrepair-loopに従って扱う。

### 成功判定

- 実際に変更したtest fileのfocused testがPASSする。
- 関連するlocal suite / static checksがPASSする。
- PRを作成した場合はexact-head required CIがPASSする。
- environment failureがある場合、Run contractに従って正しく分類し、Test/timeout/CI contractを弱めて通さない。
- `git diff --check` PASS。
- Sanitizer residual 0。
- planned implementationとしてProduct/Application/Infrastructure/Presentation source変更0。
- Validation failure repairでplanned scope外のsource変更が生じた場合は、`AGENTS.md` §8 / repair-loopに基づく必要性と最小性がRun REPORTで説明されている。
- workflow/package/config/validator/DB/Curriculum/Trainingのplanned change 0。
- `tests/integration/admin-master-use-cases.test.ts`変更0。
- `tests/integration/checkout-order-use-cases.test.ts`変更0。
- `CT-DB-KEY-001`は `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` の全Requirementを落とさず説明できる。
- 4-label再監査で意味の縮小なしに、必要なら最小suite setを使って`stop=0`を説明できる。
- test code変更がある場合のPR changed filesがplanned Test/Plan/Run Artifact範囲、または明示記録されたvalidation repair範囲に収まる。
- 両gap already coveredの場合、不要なtest変更や空PRを作らずPR #78 handoffへ進める。

## 7. リスクと未解決論点

### Risks

1. **Category concurrency test自体が環境依存になる**
   - 対応: 既存Repository Contract fixtureで1本だけ試し、Current Dexie / fake-indexeddbで決定的に成立しないならSTOPする。retry、sleep、専用hook、transaction spy等で無理に成立させない。
2. **Order DTO boundary検証に不要なCheckout/Application fixtureを持ち込む**
   - 対応: `tests/contracts/transactions.test.ts`の既存`DexieOrderRepository.getDetail()` seamへassertionを追加し、`checkout-order-use-cases.test.ts`は変更しない。
3. **Order DTOのnegative assertionをrootだけ確認して空振りする**
   - 対応: Order root、Payment attempt、Shipment、Timelineの各対応objectを直接assertし、raw側property存在と対にする。
4. **`CT-DB-KEY-001`の意味をProduct code / SKUだけへ縮小する**
   - 対応: `NFR-RL-011` / `FR-PR-041` / `FR-PR-050`をRequirement ID単位で監査し、Category / Brand / Variation normalized duplicate contractを必ず含める。
5. **複合labelとPR #78の`suite-level`定義が矛盾する**
   - 対応: 本remediationでは複数evidenceをRunへ記録し、PR #78 handoff時に新Dispositionを作らず`suite-level`説明だけを最小拡張する。
6. **already coveredなのに不要なtestやPRを作る**
   - 対応: gap単位で`already covered / no change`を許可し、両gap no-opなら空PRを作らない。
7. **local validationを広げすぎて無関係なrepairを引き込む**
   - 対応: focused file + repository/contracts等の関連suite + static checksへ限定し、full regressionはexact-head PR CIへ委譲する。
8. **planned source変更0とrepo repair ruleが衝突する**
   - 対応: source変更0はplanned implementationの制約とし、validation failure時は`AGENTS.md` §8 / repair-loopを優先する。安全な最小repairを超える場合だけSTOPする。
9. **coverage remediationからProduct修正へscope creepする**
   - 対応: RequirementとCurrent behaviorの矛盾はplanned Product fixとして扱わずSTOPする。validation failure repairとは区別してRunへ記録する。

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

already-covered判定により、上記2 test fileの片方または両方が変更されないことを許容する。

Validation failure repairが必要になった場合のみ、Current `AGENTS.md` §8 / repair-loopに従う追加ファイル変更を許容する。その場合はplanned scopeとの差分、原因、必要性をRun REPORTへ明記する。

### 付随ドキュメント

- 本remediation PRでは`docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`を変更しない。
- remediation merge後、または両gap no-op確認後にPR #78側でCurrent evidenceへ同期する。
- PR #78側では必要に応じて`suite-level` taxonomy説明を最小修正し、複合labelの最小suite setを正確に表現する。

## 9. 備考

- Planの詳細さは実装時の追加判断を減らすためのものであり、実装自体を複雑化する意図はない。
- 実コード差分の通常目標は「Repository Contract test 1本追加 + 既存Order repository contract testへのnested DTO boundary assertion追加」の2箇所だけ。
- `tests/integration/admin-master-use-cases.test.ts` / `tests/integration/checkout-order-use-cases.test.ts`は変更しない。
- 新helper / 新Test file / planned Product source変更 / framework追加は行わない。
- Current evidenceでalready coveredなら、不要な実装を増やさないことを最優先する。
- Full regressionはexact-head PR CIへ委譲し、ローカルでは変更とevidence確定に必要な範囲へ絞る。
