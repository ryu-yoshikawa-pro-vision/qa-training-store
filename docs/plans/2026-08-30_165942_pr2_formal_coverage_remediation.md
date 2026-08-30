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
- [ ] 実装前に4 labelをCurrent `main`でread-only再監査し、planned remediation以外のcoverage gapがないことを確認
- [ ] `CT-DB-KEY-001 / FR-PR-041` のnormalized duplicate rejectionが不足している場合だけ既存Repository Contract testを最小拡張
- [ ] `CT-CATEGORY-002 / FR-PR-055` が未coveredの場合だけRepository Contract testを1本追加
- [ ] `CT-BOUNDARY-001 / FR-AR-003` が未coveredの場合だけ既存Order contract testへ最小assertionを追加
- [ ] 4 labelのCurrent evidence / disposition / PR #78 handoff情報をRun REPORTへ確定
- [ ] changed scopeに応じたlocal validation・scope check・Sanitizerを完了
- [ ] test code変更がある場合だけPRをOPENし、exact-head required CIを確認

## 0. 依頼概要

PR #78の再監査で不足が判明したFormal coverageだけを、既存Test suiteへの最小変更で補完する。

PR #84でProduct implementation gapは修正済みのため、本remediationのplanned implementationではProduct / Application / Infrastructure / Presentation sourceを変更しない。

本remediationの責務は次までとする。

1. 4 labelをCurrent evidenceで再監査する。
2. Current reviewで不足が確認済み、または不足可能性が高い以下だけを、必要時に既存2 test file内の最小差分で閉じる。
   - `FR-PR-041`: Category / Brand / Variation normalized duplicate rejection
   - `FR-PR-055`: Category末尾追加と同一Transactionでのmax+10
   - `FR-AR-003`: UI向けOrder DTOから内部fieldを除外
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
   - PR #78側のreference / dispositionが不足しているだけで、Current既存Formal Testの必要最小限のsuite setにより元Requirementを説明できる場合はSTOPしない。Traceability mapping gapとしてRun REPORTへhandoffする。
   - `FR-PR-041` / `FR-PR-055` / `FR-AR-003` は本Planで許可したplanned remediationとして扱い、不足が確認されてもそれだけを理由にSTOPしない。
   - 上記3 Requirement以外について、Current既存Formal Testを組み合わせてもRequirement behaviorを直接・合理的に説明できない場合、またはRequirementとCurrent implementationが矛盾する場合だけ予定外gapとしてSTOPする。
   - `stop=0`を作るためにRequirement意味を縮小しない。

2. **`CT-DB-KEY-001 / FR-PR-041` のnormalized duplicate rejectionが不足している場合だけ、既存Repository Contract testを最小拡張する。**
   - 対象: `tests/repository-contract/repositories.test.ts`
   - 既存test: `enforces unique keys and persistence projection consistency`
   - 新test file、新helper、新test titleは追加しない。
   - Current evidenceですでに直接・合理的に説明できるNormalization関数自体は重複testしない。
   - `tests/unit/normalization-cart-catalog.test.ts` がNFKC / case / whitespace normalizationとVariation scope key projectionを直接確認するため、Repository Contractでは「異なる入力が同じnormalized keyになり、Dexie unique制約でrejectされるbehavior」だけを補完する。
   - **Category**:
     - 既存の`await db.categories.add(toCategoryRecord(category))`はそのまま起点として使う。
     - 現在のraw duplicate record追加は置き換える。既存`DexieCategoryRepository`から`createAtEnd()`を呼び、以下のCommandでrejectを確認する。
       - `categoryId: "category-normalized-duplicate"`
       - `name: "  ホーム・キッチン  "`
       - `actorUserId: "user-operator"`
       - `now: FIXED_NOW`
     - 入力文字列が既存`category.name`と完全一致していなくても、RepositoryのNormalization後に既存`nameNormalized`と衝突してrejectされることだけを確認する。
   - **Brand**:
     - 既存`brand` fixtureを1件目として`db.brands.add(toBrandRecord(brand))`する。
     - `DexieBrandRepository`を既存`basic-repositories` importへ追加し、`create()`で以下の2件目だけを投入してrejectを確認する。
       - `brandId: "brand-normalized-duplicate"`
       - `name: " Ｓｃｅｎａｒｉｏ　Ｌｉｆｅ "`
       - `actorUserId: "user-operator"`
       - `now: FIXED_NOW`
     - `Scenario Life`と全角・余白差があっても同じ`nameNormalized`へ正規化されることを前提に、2件目rejectだけを確認する。
   - **Variation**:
     - 既存`variant` fixtureをspreadして2 recordを作り、`toVariantRecord()`経由でDBへ書く。
     - 共通`productId`は新しい架空IDを作らず既存`product.id`を使う。
     - 1件目:
       - `id: "variant-normalized-1"`
       - `productId: product.id`
       - `sku: "SKU-NORMALIZED-1"`
       - `optionValue: " Red "`
       - `optionValueNormalized: "red"`
       - `isActive: true`
     - 2件目:
       - `id: "variant-normalized-2"`
       - `productId: product.id`
       - `sku: "SKU-NORMALIZED-2"`
       - `optionValue: " ＲＥＤ "`
       - `optionValueNormalized: "red"`
       - `isActive: true`
     - `toVariantRecord()`は`optionValueNormalized`を再計算しないため、raw fixtureを不整合にしないよう両recordで`optionValueNormalized: "red"`を明示する。
     - `toVariantRecord()`が両recordを同じ`optionScopeKey`へ投影し、2件目がunique `[productId+optionScopeKey]` collisionでrejectされることだけを確認する。
   - raw Dexie errorの具体的message/classへ依存せず、既存styleどおり`rejects.toBeDefined()`程度に留める。
   - `optionScopeKey` / `nameNormalized`の具体値をRepository Contract側で重複assertしない。Normalizationの具体値はUnit evidenceへ委ねる。
   - 既存`projectionsAreConsistent()` assertionは変更しない。

3. **`CT-CATEGORY-002 / FR-PR-055` が未coveredの場合だけ、Repository Contract testを1本追加する。**
   - 対象: `tests/repository-contract/repositories.test.ts`
   - Test title: `creates the first category at ten and serializes concurrent appends`
   - 既存の空 `ScenarioShopDatabase` fixtureと`DexieCategoryRepository`を直接使う。
   - `CreateCategoryCommand`は各createで以下を固定する。
     - `actorUserId: "user-operator"`
     - `now: FIXED_NOW`
   - Category固有値はID・正規化後nameとも重複しない以下を使う。
     - `category-1` / `Category 1`
     - `category-2` / `Category 2`
     - `category-3` / `Category 3`
   - 1件目createの返却値で`sortOrder === 10`を確認する。
   - その後2件を`Promise.all`等で並行createし、両Promiseが成功することを確認する。
   - 並行createの返却`sortOrder`は個別assertしない。DB全件を取得し、persist済み`sortOrder`をsortした結果が`[10, 20, 30]`であることだけを確認する。
   - duplicate sortOrder / lost writeはこのpersisted-state assertionでまとめて確認する。
   - `CT-CATEGORY-002`のrepresentative Formal evidenceはこの新しいexact-title 1本に集約する。既存Application testを代表evidenceへ組み合わせない。
   - Current Dexie / fake-indexeddb環境で並行createを決定的に観測できない場合は、retry / sleep / spy / source text assertion / test-only hookを追加せずSTOPする。

4. **`CT-BOUNDARY-001 / FR-AR-003` が未coveredの場合だけ、既存Order contract testを最小拡張する。**
   - 対象: `tests/contracts/transactions.test.ts`
   - 既存test: `keeps order, payment, shipment, and histories consistent`
   - 既存Order / Payment / Shipment fixtureをそのまま使い、Checkout Use Case、Session、Gateway、Clock等を追加しない。
   - Current production pathの`PAYMENT_SUCCEEDED` semanticsと一致するOrderStatusHistoryを1件だけ追加する。
     - `id: "order-history-1"`
     - `orderId: order.id`
     - `fromStatus: "pending_payment"`
     - `toStatus: "paid"`
     - `actorUserId: null`
     - `reasonCode: "PAYMENT_SUCCEEDED"`
     - `createdAt: FIXED_NOW`
   - raw fixtureにinternal fieldを記述している事実をpreconditionとし、同じpropertyの存在をraw側へ重複assertしない。
   - `actorUserId`の値が`null`でもproperty自体はraw Historyに存在するため、public DTOに誤って`actorUserId` propertyが追加された場合はabsence assertionで検知できる。
   - public DTO側だけ、Requirementに必要な以下を明示assertする。
     - `detail.orderActionVersion === order.version`
     - `detail` rootにraw `version`がない
     - `detail.paymentAttempts[0]`に`gatewayIdempotencyKey` / `version`がない
     - `detail.shipment`に`version`がない
     - `detail.timeline`が1件で、`detail.timeline[0].status === "paid"`
     - `detail.timeline[0]`に`actorUserId`がない
   - Timelineの件数とstatus mappingをpositive assertionしてからinternal field absenceを確認し、空TimelineでもPASSするtestにしない。
   - whole-object snapshot、DTO専用fixture、新helper、別flowは追加しない。

5. **`CT-DB-KEY-001`は3RequirementすべてをCurrent evidenceで説明できる。**
   - `NFR-RL-011`: IndexedDB Indexへboolean/null/undefinedを直接保存せず、数値Key / non-null Scope Keyへ投影するcontract。
   - `FR-PR-041`: Category名・Brand名・Variation選択肢のTrim / Unicode NFKC / locale非依存小文字化とnormalized comparison keyによる重複判定。
   - `FR-PR-050`: productCode / SKUのTrim / Unicode NFKC / ASCII大文字化、format validation、case-insensitive uniqueness。
   - `tests/unit/normalization-cart-catalog.test.ts`をNormalizationの直接Formal evidence候補として必ず確認する。
   - `FR-PR-041`のnormalized duplicate rejectionがCurrent Formal evidenceで不足していれば、Definition of Done 2の既存Repository Contract拡張で閉じる。
   - 1つのexisting exact-titleへ無理に押し込まず、必要なら最小suite setとしてhandoffする。

6. **`CP-FORM-001`は3RequirementすべてをCurrent evidenceで説明できる。**
   - `NFR-AX-001`: FormのLabel、Error関連付け、Keyboard Focus。
   - `NFR-AX-007`: Error発生時のError Summary focusとSummary内Linkから対象fieldへの移動。
   - `NFR-MA-012`: Email正規化、文字数上限、Application Errorを共有関数・共有定数・共有型から参照するcontract。
   - `tests/unit/normalization-cart-catalog.test.ts`のEmail normalizationと、Application boundary / Error contractの既存Formal evidenceを組み合わせて確認する。
   - Accessibility evidenceだけで`NFR-MA-012`を落とさない。

7. **4 labelのrepresentative evidenceとfinal dispositionをRun REPORTへ残す。**
   - 元Requirement ID。
   - Current implementation evidence。
   - representative Formal evidence。
   - 複数suiteの場合は各suiteが担うRequirement範囲。
   - `exact-title` / `suite-level` / `stop`の最終判断。
   - Traceability mapping gapとFormal coverage gapを区別して記録する。
   - PR #78側で必要になる`suite-level` taxonomyの最小調整案。
   - 本remediationではPR #78 branch / Traceability docsを変更しない。

8. **planned implementationの通常差分を2 test file以内に保つ。**
   - `tests/repository-contract/repositories.test.ts`
   - `tests/contracts/transactions.test.ts`
   - `FR-PR-041`と`FR-PR-055`は同じRepository Contract file内で閉じる。
   - already coveredの項目はno-opとする。
   - 新Test file / helper / framework / planned Production source変更は行わない。

9. **local validationは実際の変更内容に合わせて最小化する。**
   - Repository Contract fileを変更した場合だけ`pnpm run test:repository`。
   - Order contract fileを変更した場合だけ`pnpm run test:contracts`。
   - suite command自体がchanged fileを含むため、通常DoDとして別のfocused file runを重ねない。
   - focused file runはsuite failure時の診断に必要な場合だけ使用し、通常の必須validationにはしない。
   - **test code変更がある場合**は、changed suiteに加えて`pnpm run typecheck` / `pnpm run lint` / `pnpm run format:check` / `pnpm run lint:markdown` / `git diff --check` / scope check / Sanitizerを実行する。
   - **planned remediationがすべてalready coveredでtest code変更が0の場合**は、TypeScript source/testに変更がないため`pnpm run typecheck` / `pnpm run lint`を必須にしない。Run Artifact等の文書差分を対象に`pnpm run format:check` / `pnpm run lint:markdown` / `git diff --check` / scope check / Sanitizerだけを実行する。
   - read-only evidenceとして参照したintegration / component / unit suiteを、evidence確認だけを理由にlocal再実行しない。

10. **test code変更がある場合だけcoverage-remediation PRを1本OPENする。**
    - planned remediationがすべてalready coveredでtest code変更が0なら空PRを作らない。
    - PRを作成した場合だけexact-head required CIをfull regressionのSSOTとして確認する。
    - no-opの場合は存在しないPR CIをDoDに要求しない。
    - mergeは明示指示があるまで行わない。

## 2. 現状理解と前提

### Current understanding

- Implementation BaseはPR #84 merge直後の`main`、`3022a74ba7cde2d3cc81ce318c6320dbf78115c6`。
- `FR-PR-055`は「新規Categoryは0件時`sortOrder=10`、既存時`max(sortOrder)+10`で末尾へ追加し、最大値取得と作成を同一Transactionで行うこと」。
- `DexieCategoryRepository.createAtEnd()`は`src/infrastructure/database/dexie/basic-repositories.ts`にあり、`db.transaction("rw", db.categories, ...)`内で一覧取得→最大値算出→`categories.add()`を行う。
- `CreateCategoryCommand`は`categoryId` / `name` / `actorUserId` / `now`を必要とする。Category作成のApplication flowはoperator/adminを要求するため、Repository Contract fixtureも`actorUserId: "user-operator"`とする。
- `tests/repository-contract/repositories.test.ts`は空の`ScenarioShopDatabase`、`FIXED_NOW`、`DexieCategoryRepository`をすでに利用しており、FR-PR-055の最小seamである。
- Category tableの`nameNormalized`はunique indexなので、並行create fixtureはnormalize後も異なるnameを使う。
- `FR-PR-041`はCategory / Brand / Variation optionについて共通Normalization結果を重複判定に使うことを要求する。
- Current schemaはCategory / Brandのnormalized keyとVariationの`[productId+optionScopeKey]`をunique indexとして持つ。
- `tests/unit/normalization-cart-catalog.test.ts`はNFKC / case / whitespace normalizationとVariation option scope key projectionを直接確認している。
- Current reviewではCategoryの既存unique assertionはraw `nameNormalized` collisionしか確認しておらず、Requirementが求める「異なる入力がNormalization後に重複としてrejectされるbehavior」の直接evidenceとしては弱い。実装前pre-auditで再確認し、不足が確定した場合は既存Category assertionをRepository経由のnormalized collisionへ置き換える。
- Current reviewではBrand / Variationのnormalized duplicate rejectionを直接確認するFormal evidenceも見つかっていない。実装前pre-auditで再確認し、不足が確定した場合だけ同じunique-key testへ最小assertionを足す。
- `toVariantRecord()`は`projectOptionScopeKey()`を使って`optionScopeKey`を生成する一方、`optionValueNormalized`は再計算せず入力値を保持する。そのためVariation fixtureで`optionValue`だけを変えて`optionValueNormalized: null`を残す形は禁止し、`optionValueNormalized: "red"`を明示してrecord自体の整合性を保つ。
- `FR-AR-003`は「UI向けOrder DTOにGateway Key、Repository Version、内部Actor IDを含めないこと」。
- `DexieOrderRepository.getDetail()`はraw Order / Payment / Shipment / OrderStatusHistoryから`OrderDetailDto`を明示的に組み立て、内部fieldを公開DTOへコピーしていない。
- `tests/contracts/transactions.test.ts`の既存Order testはOrder=`paid`、Payment=`succeeded`、Shipment=`pending`、`customer`、`FIXED_NOW`、`DexieOrderRepository.getDetail()`をすでに持つ。
- Current production pathの`PAYMENT_SUCCEEDED` Historyは`pending_payment → paid` / `actorUserId: null`である。FR-AR-003のためにsynthetic non-null Actorや完全なOrder lifecycle historyを作る必要はない。
- `CT-DB-KEY-001`は `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` を含む。
- Current PR #78では`CT-DB-KEY-001`を既存Repository Contractの単一exact-titleへ接続しているが、そのreference不足は直ちにFormal coverage gapを意味しない。Current既存suite setと本Planの最小remediationを合わせて元Requirementを説明できるかを再監査する。
- `CP-FORM-001`は `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012` を含む。
- Current PR #78では`CP-FORM-001`から`NFR-MA-012`が落ちているが、まずTraceability mapping gapとして扱い、Current Formal evidence自体が不足しているかを分けて判定する。
- `CT-BOUNDARY-001`は `FR-AR-001～004` / `NFR-MA-020～023` の複合labelであり、Order DTO evidence単独では全体を代表しない。
- Current `AGENTS.md`のlocal validationは「必要に応じて一部または全部」であり、Web CIではunit / integration / repository / component / contracts等をfull regressionとして実行する。

### Assumptions

- Historical gap analysisは調査の起点にのみ使い、最終判定は実装開始時点のCurrent `main`を正とする。
- 4-label再監査はコード変更前に実施し、planned remediation以外のgapが見つかった状態で部分実装だけを先行しない。
- PR #78の現在のmapping不備だけではSTOPしない。Current既存Formal Testの必要最小限のsuite setと本Planで許可したminimal remediationを合わせてもRequirementを説明できない場合だけFormal coverage gapとしてSTOPする。
- `FR-PR-041`は新fileや新frameworkを作らず、既存Repository Contractのunique-key testを必要時に置換・拡張する。
- Category / Brandのnormalized duplicate testは既存fixtureを1件目として再利用し、新しい成功fixtureを重複して作らない。
- Variation duplicate testは既存`variant` fixtureをspreadするが、変更した`optionValue`と一致する`optionValueNormalized`を明示して不自然なrecordを作らない。
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

4-label read-only再監査では、まず「PR #78のmapping不足」「本Planで許可したplanned remediation」「それ以外のCurrent Formal coverage不足」を分ける。

STOPしない:

- PR #78の現在のexact-title / suite-level referenceだけでは元Requirement全体を説明できないが、Current既存Formal Testの必要最小限のsuite setなら説明できる。
- `FR-PR-041`のCategory / Brand / Variation normalized duplicate rejectionが不足しているが、既存`tests/repository-contract/repositories.test.ts`のunique-key testの置換・最小assertion追加だけで閉じられる。
- `FR-PR-055`が不足しているが、planned Category Repository Contract test 1本だけで閉じられる。
- `FR-AR-003`が不足しているが、planned Order contract test拡張だけで閉じられる。
- 上記の場合はRun REPORTへevidence / planned remediation / PR #78側の修正案を記録し、実装へ進む。

STOPする:

- `CT-DB-KEY-001`の `NFR-RL-011` / `FR-PR-041` / `FR-PR-050` のうち、`FR-PR-041`のplanned Repository Contract置換・拡張を含めても直接・合理的に説明できないRequirementがある、またはimplementation gapがある。
- `CP-FORM-001`の `NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012` のいずれかをCurrent既存Formal Testで直接・合理的に説明できない、またはimplementation gapがある。
- `CT-CATEGORY-002`がplanned test追加だけでは閉じられず、Product変更が必要である。
- `CT-BOUNDARY-001`がFR-AR-003 planned test追加以外にも新しいFormal coverage gapを持つ。
- `stop=0`のためにRequirement意味の縮小、新ID制度、第三のTraceability SSOTが必要になる。

### Already-covered handling

- `FR-PR-041`がalready covered: unique-key testを変更しない。
- Categoryだけalready covered: Category test追加をno-opにする。
- FR-AR-003だけalready covered: Order contract変更をno-opにする。
- planned remediationがすべてalready covered: test code変更0とし、4-label handoff evidenceを確定して完了する。空PRは作らない。
- already-coveredはSTOP条件ではない。

### Implementation stop conditions

コード変更開始後は以下の場合にSTOPする。

- Category / Brand / Variation normalized duplicate rejectionの確認に新helper、新test file、Production hook、DB schema変更等が必要になる。
- Category concurrency behaviorをCurrent Dexie / fake-indexeddbで決定的に観測できず、retry / sleep / spy / hook等が必要になる。
- FR-AR-003確認にHistory 1件と既存DTO assertionを超える新flow、新fixture設計、Production hook等が必要になる。
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

`FR-PR-041` / `FR-PR-055` / `FR-AR-003`のalready-covered判定により、2 test fileの片方または両方が変更されないことを許容する。

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
- `src/infrastructure/database/dexie/basic-repositories.ts` — Category / Brand normalized key creation
- Product code / SKU normalization・uniquenessを担うCurrent Use Case / Repository code
- `tests/fixtures/repository.ts` — `category` / `brand` / `product` / `variant` / `FIXED_NOW`
- `tests/unit/normalization-cart-catalog.test.ts`
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/admin-product-use-cases.test.ts`

#### `CP-FORM-001`

- shared `INPUT_LIMITS` / Email normalization / Application Error contractを担うCurrent code
- `tests/unit/normalization-cart-catalog.test.ts`
- `tests/component/presentation-foundation.test.tsx`
- `tests/integration/auth-account.test.ts`
- PR #84後のshared input limits / Application validation / Application Errorに直接対応するCurrent Formal evidence

#### `CT-CATEGORY-002`

- `src/application/contracts/administration.ts` — `CreateCategoryCommand`
- `src/application/use-cases/admin-master-use-cases.ts` — staff actor boundary
- `src/infrastructure/database/dexie/basic-repositories.ts` — `DexieCategoryRepository.createAtEnd()`
- `tests/fixtures/repository.ts` — `FIXED_NOW`
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-master-use-cases.test.ts` — read-only。変更しない。

#### `CT-BOUNDARY-001`

- `src/application/contracts/orders.ts`
- `src/domain/contracts/entities.ts`
- `src/infrastructure/database/dexie/order-review-repositories.ts`
- `src/application/use-cases/checkout-order-use-cases.ts` — `getMyOrder()`と`PAYMENT_SUCCEEDED` History semanticsをread-only確認
- `tests/contracts/architecture.test.ts`
- `tests/contracts/transactions.test.ts`

## 5. 変更方針

### Change strategy

1. **Audit first, code second**
   - 4-label全体をread-only監査してからコードを書く。
   - PR #78のmapping不足はhandoff対象であり、それだけを理由にSTOPしない。
   - `FR-PR-041` / `FR-PR-055` / `FR-AR-003`はplanned remediationとして扱う。
   - それ以外のCurrent Formal coverage gapがある場合だけ、無駄な部分実装を残さずSTOPする。

2. **Coverage-only**
   - RequirementとCurrent behaviorが一致する場合だけtestを補完する。
   - Requirement矛盾はProduct gapとしてSTOPし、このPRへplanned Product fixを混ぜない。

3. **FR-PR-041は既存unique-key testをより直接的なbehavior evidenceへ寄せる**
   - Categoryのraw duplicate assertionは、`DexieCategoryRepository.createAtEnd()`で異なる入力をnormalize後にrejectするassertionへ置き換える。
   - Brandは既存`brand` fixtureを1件目として再利用し、`DexieBrandRepository.create()`で全角・余白差の2件目だけを試す。
   - Variationは既存`variant` fixtureを再利用し、`product.id`を共通scopeにして2 recordだけを作る。`optionValueNormalized: "red"`を明示してfixture自体も整合させる。
   - Normalization関数そのものの重複testは追加しない。

4. **Categoryは1 test / 2 essential assertionsに寄せる**
   - Commandは`actorUserId: "user-operator"` / `now: FIXED_NOW`を共通で使う。
   - 1件目の返却`sortOrder === 10`。
   - 並行create完了後のpersisted全件`[10,20,30]`。
   - concurrent return valueの重複assertionは追加しない。

5. **Order DTOは既存testへProduction-consistent History 1件 + public DTO assertionsだけを追加する**
   - `pending_payment → paid` / `PAYMENT_SUCCEEDED` / `actorUserId: null`のHistory 1件だけを使う。
   - raw fixture existence assertionは追加しない。
   - DTO absenceとTimeline positive mappingだけを確認する。

6. **4-label handoffは最小suite setを許容する**
   - 単一exact-titleへ無理に押し込まない。
   - Requirementごとの担当evidenceをRun REPORTに記録する。
   - Traceability mapping gapとFormal coverage gapを区別する。
   - 新Dispositionは作らない。

7. **Validationは変更内容ごとに最小化する**
   - test code変更あり: changed suiteを1回だけ + typecheck / lint / format / markdown / diff / scope / Sanitizer。
   - test code変更なし: format / markdown / diff / scope / Sanitizerのみ。typecheck / lintは必須にしない。
   - 通常DoDとしてfocused file runを重ねない。
   - read-only evidence suiteは変更がない限りlocal再実行しない。
   - full regressionはPR作成時のexact-head CIへ委譲する。

8. **PR #78へはhandoff情報だけ作る**
   - 本remediationではPR #78を編集しない。
   - 実際のtaxonomy / Traceability更新はFollow-upとする。

### 実行タスク

- [ ] 1. 実装開始時に最新`main`とCurrent repository rules（`AGENTS.md`、`PLANS.md`、Run Artifact contract、test conventions）を確認し、implementation Run Artifactを開始する。
- [ ] 2. コード変更前に`CT-DB-KEY-001`を`NFR-RL-011` / `FR-PR-041` / `FR-PR-050`ごとにread-only再監査する。`tests/unit/normalization-cart-catalog.test.ts`と既存unique-key Repository Contractを必ず確認する。
- [ ] 3. コード変更前に`CP-FORM-001`を`NFR-AX-001` / `NFR-AX-007` / `NFR-MA-012`ごとにread-only再監査する。Email normalization evidenceとして`tests/unit/normalization-cart-catalog.test.ts`を必ず確認する。
- [ ] 4. コード変更前に`CT-CATEGORY-002 / FR-PR-055`と`CT-BOUNDARY-001 / FR-AR-001～004 / NFR-MA-020～023`をread-only再監査する。
- [ ] 5. 4-label pre-auditでは、PR #78のmapping不足だけならhandoff対象として続行し、`FR-PR-041` / `FR-PR-055` / `FR-AR-003`は本Planのplanned remediationで閉じられるか判定する。それ以外のCurrent Formal coverage gapがある場合だけtest実装せずRunへ記録してSTOPする。
- [ ] 6. `FR-PR-041`のCategory / Brand / Variation normalized duplicate rejectionが不足している場合だけ、`tests/repository-contract/repositories.test.ts`の`enforces unique keys and persistence projection consistency`を置換・最小拡張する。
  - Category: 既存`category`をDBへ入れた後、`category-normalized-duplicate` / `"  ホーム・キッチン  "`を`DexieCategoryRepository.createAtEnd()`へ渡してreject。既存raw duplicate addは削除する。
  - Category共通値: `actorUserId: "user-operator"` / `now: FIXED_NOW`。
  - Brand: 既存`brand`をDBへ入れた後、`brand-normalized-duplicate` / `" Ｓｃｅｎａｒｉｏ　Ｌｉｆｅ "`を`DexieBrandRepository.create()`へ渡してreject。
  - Brand共通値: `actorUserId: "user-operator"` / `now: FIXED_NOW`。
  - Variation: `product.id`を共通`productId`にし、異なるid/SKUで`optionValue: " Red "` / `" ＲＥＤ "`、両方`optionValueNormalized: "red"` / `isActive: true`の2 recordを`toVariantRecord()`経由でaddし、2件目reject。
  - `nameNormalized` / `optionScopeKey`の具体値を重複assertしない。
  - 既存projection assertionはそのまま残す。
- [ ] 7. `FR-PR-055`が未coveredの場合だけ、同じRepository Contract fileへ `creates the first category at ten and serializes concurrent appends` を1本追加する。
  - 共通Command値は`actorUserId: "user-operator"` / `now: FIXED_NOW`。
  - Category固有値は`category-1/Category 1`、`category-2/Category 2`、`category-3/Category 3`。
  - 1件目の返却`sortOrder === 10`。
  - その後2件を並行createする。
  - DB全件のpersisted sortOrderが`[10,20,30]`。
  - 不安定なら複雑化せずSTOPする。
- [ ] 8. `FR-AR-003`が未coveredの場合だけ、`tests/contracts/transactions.test.ts`の既存Order testへHistory 1件とpublic DTO assertionを追加する。
  - `order-history-1`: pending_payment → paid / `PAYMENT_SUCCEEDED` / `actorUserId: null` / `createdAt: FIXED_NOW`。
  - Timelineは1件で`status === "paid"`。
  - `orderActionVersion === order.version`。
  - root `version`、payment `gatewayIdempotencyKey/version`、shipment `version`、timeline `actorUserId`がpublic DTOへ出ない。
  - raw fixture propertyの存在を重複assertしない。
- [ ] 9. 4 labelのCurrent implementation evidence / representative Formal evidence / final dispositionをRun REPORTへ確定する。Traceability mapping gapとFormal coverage gapを区別する。
- [ ] 10. test code変更がある場合、Repository Contract file変更時だけ`pnpm run test:repository`、Order contract file変更時だけ`pnpm run test:contracts`を実行し、その後`pnpm run typecheck` / `pnpm run lint` / `pnpm run format:check` / `pnpm run lint:markdown` / `git diff --check` / scope check / Sanitizerを実行する。通常DoDとしてfocused file runを別途重ねない。
- [ ] 11. planned remediationがすべてalready coveredでtest code変更が0の場合は、`pnpm run format:check` / `pnpm run lint:markdown` / `git diff --check` / scope check / Sanitizerだけを実行する。`pnpm run typecheck` / `pnpm run lint`は必須にしない。
- [ ] 12. validation failure時は`AGENTS.md` §8 / repair-loopに従い、安全な最小repairのみ行う。
- [ ] 13. Run Artifactへvalidation、scope、already-covered/no-op、4-label handoff情報を同期してfinalizeする。
- [ ] 14. test code変更が1件以上ある場合だけcoverage-remediation PRを`main`向けにOPENする。0件なら空PRを作らない。
- [ ] 15. PRを作成した場合だけexact-head required CIを確認し、Blocking Finding / required CI failureが残る状態をmerge可としない。mergeは明示指示があるまで行わない。

## 6. 検証方法

### Local required validation — test code変更あり

Repository Contract fileを変更した場合:

- `pnpm run test:repository`

Order contract fileを変更した場合:

- `pnpm run test:contracts`

共通:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `git diff --check`
- scope check
- Current Codex artifact Sanitizer Write / Check（residual 0）

suite command自体にchanged fileが含まれるため、通常DoDとしてfocused file runを追加しない。suite failureの原因切り分けが必要な場合のみfocused runを診断用に使い、その実行理由と結果をRun REPORTへ記録する。

### Local required validation — test code変更なし

planned remediationがすべてalready coveredでtest code変更が0の場合:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `git diff --check`
- scope check
- Current Codex artifact Sanitizer Write / Check（residual 0）

TypeScript source / testを変更していないため、このno-op pathでは`pnpm run typecheck` / `pnpm run lint`を必須にしない。

`CT-DB-KEY-001` / `CP-FORM-001`のrepresentative evidenceがintegration / component / unit suiteに存在しても、read-only evidence確認だけを理由にそのsuiteをlocal再実行しない。`tests/unit/normalization-cart-catalog.test.ts`もread-only evidenceとして扱い、変更しない限り`test:unit`を追加しない。変更していないsuiteのfull regressionはPR作成時のexact-head CIへ委譲する。

### Exact-head PR CI — PR作成時のみ

coverage-remediation PRを作成した場合だけ、Current Web CIをfull regressionのSSOTとする。

少なくともCurrent required jobsで以下を確認する。

- style / specification quality
- code quality / typecheck / security
- Codex artifact sanitization
- Vitest matrix: unit / integration / repository / component / contracts
- build / required E2E等、Current branch protection / required checksに含まれるjob

planned remediationがすべてno-opでPRを作成しない場合、exact-head PR CIは本remediationのDoDに含めない。

### 成功判定

- 4-label pre-auditがコード変更前に完了している。
- PR #78のmapping不足、本Planで許可したplanned remediation、それ以外のCurrent Formal coverage不足を区別できている。
- `FR-PR-041`が不足していた場合は、Category / Brand / Variation normalized duplicate rejectionが既存Repository Contractの置換・最小拡張でFormal evidence化されている。
- `FR-PR-055`が不足していた場合は、Category exact-title 1本で説明できる。
- `FR-AR-003`が不足していた場合は、Production-consistent History 1件を使ったOrder DTO boundary evidenceで説明できる。
- planned remediation以外のCurrent Formal coverage gap / implementation gapが残っていない。
- test code変更がある場合はchanged suite / typecheck / lint / format / markdown / diff / scope / SanitizerがPASSする。
- test code変更が0の場合はformat / markdown / diff / scope / SanitizerがPASSする。
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
   - コード変更前に4-label pre-auditを完了し、planned remediation以外のgapがあれば先にSTOPする。
2. **PR #78のmapping不足をFormal coverage不足と誤判定する**
   - Current既存Formal Testの必要最小限のsuite setでRequirementを説明できるならSTOPせずhandoffする。
3. **FR-PR-041のnormalized duplicate rejectionをNormalization unit testだけでcoveredと誤判定する**
   - Normalization function / projection evidenceと、Dexie unique rejection behaviorの両方を確認する。不足時は同じRepository Contract testを置換・最小拡張する。
4. **Categoryの既存raw duplicate assertionを残したままnormalized behavior assertionを追加し、冗長にする**
   - raw duplicate assertionはRepository経由のnormalized duplicate assertionへ置き換える。
5. **Brand用に成功fixtureを2件とも新規作成する**
   - 既存`brand` fixtureを1件目として再利用し、normalized duplicateの2件目だけRepository経由で作る。
6. **Variation fixtureの`optionValue`と`optionValueNormalized`が不整合になる**
   - `optionValue: " Red "` / `" ＲＥＤ "`の両方に`optionValueNormalized: "red"`を明示し、既存`product.id`をscopeへ使う。
7. **FR-PR-041対応を新Use Caseや新helperへ広げる**
   - Category / Brandは既存Repository、Variationは既存`toVariantRecord()` + unique indexだけを使う。
8. **Category concurrency testが環境依存になる**
   - 既存Repository Contract fixtureで1本だけ試し、決定的でなければSTOPする。retry / sleep / spy等を入れない。
9. **Category unique indexがsortOrder検証と無関係なfailureを起こす**
   - 3件のIDとnormalize後nameを固定で重複させない。
10. **Category actorを実際のApplication boundaryと異なる値にする**
    - `actorUserId: "user-operator"`を固定する。
11. **Category assertionを増やしすぎる**
    - first result=10と最終persisted `[10,20,30]`だけに留め、concurrent return値を重複assertしない。
12. **Order DTO用HistoryをProduction semanticsと異なるfixtureにする**
    - `PAYMENT_SUCCEEDED`はCurrent production pathと同じ`actorUserId: null`を使う。
13. **Order DTO testでfixture自身を重複assertする**
    - raw fixtureをpreconditionとし、public DTO境界だけをassertする。
14. **同じchanged testをfocused runとsuite runで二重実行する**
    - 通常validationはsuite commandを1回だけ実行する。focused runはfailure診断時だけ。
15. **no-opなのにTypeScript全体のvalidationを過剰実行する**
    - test code変更0ならtypecheck / lintを必須にせず、文書差分に必要なformat / markdown / diff / scope / Sanitizerだけ実行する。
16. **`CT-DB-KEY-001`を単一existing exact-titleへ無理に押し込む**
    - 3Requirementを個別監査し、必要なら最小suite setでhandoffする。
17. **`CP-FORM-001`から`NFR-MA-012`を落とす**
    - 3Requirement IDを個別監査する。
18. **read-only evidence suiteをローカルで過剰再実行する**
    - local testはchanged suiteだけ。full regressionはPR作成時CIへ委譲する。
19. **PR #78更新まで本remediationのDoDへ混ぜる**
    - 本remediationはhandoff情報確定で完了し、PR #78編集はFollow-upへ分離する。
20. **coverage remediationからProduct修正へscope creepする**
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

- remediation PRがmergeされた場合はPR #78 branchへ最新`main`を取り込む。planned remediationがすべてno-opの場合はCurrent main evidenceをそのまま使用する。
- PR #78の`suite-level`説明を、新Dispositionを増やさず「1つのtest file / suite、または複合label全体を説明するための必要最小限のsuite set」と読める最小表現へ調整する。
- `CT-CATEGORY-002`は新Category exact-title、またはno-op時のCurrent representative evidenceへ同期する。
- `CT-BOUNDARY-001`はArchitecture contract等が`FR-AR-001/002/004`と該当NFR群、Order contract evidenceが`FR-AR-003`を担う形で同期する。
- `CT-DB-KEY-001`はNormalization unit evidence、Repository unique-key evidence、Product code / SKU evidenceをRequirement単位で必要最小限のsuite setへ同期する。
- `CP-FORM-001`はRun REPORTで確定したRequirement単位のCurrent evidenceへ同期する。
- PR #78のTraceability / Run / PR本文を一度だけCurrent evidenceへ揃える。

## 10. 備考

- Planの詳細さは実装時の追加判断を減らすためのものであり、実装自体を複雑化する意図はない。
- 実コード差分の通常上限は2 test fileのまま。
- `tests/repository-contract/repositories.test.ts`では、必要時に既存unique-key testのCategory raw duplicate assertionをnormalized Repository behaviorへ置き換え、Brand / Variationの不足assertionを追加する。FR-PR-055不足時だけCategory concurrency testを1本追加する。
- `tests/contracts/transactions.test.ts`では、FR-AR-003不足時だけ既存Order contract testへProduction-consistent History 1件とpublic DTO boundary assertionを追加する。
- 4-label read-only監査でplanned remediation以外のgapが見つかった場合、上記実装を先行しない。
- PR #78のmapping不足だけなら予定外coverage gapとは扱わず、Run REPORTへhandoffして続行する。
- `tests/integration/admin-master-use-cases.test.ts` / `tests/integration/checkout-order-use-cases.test.ts`は変更しない。
- 新helper / 新Test file / planned Production source変更 / framework追加は行わない。
- Current evidenceでalready coveredなら、不要な実装を増やさないことを最優先する。
- test code変更時はchanged suiteを1回だけ実行し、no-op時はTypeScript validationを省略する。full regressionはPR作成時のexact-head CIへ委譲する。
