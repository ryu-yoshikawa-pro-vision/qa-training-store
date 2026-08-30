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
- [ ] `CT-CATEGORY-002` の不足Formal coverageを最小の既存Test suiteへ追加
- [ ] Current `main` で `CT-BOUNDARY-001` のRequirement・実装・既存Formal Testを再監査
- [ ] `CT-BOUNDARY-001` の不足Formal coverageを最小の既存Test suiteへ追加
- [ ] `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` をCurrent evidenceで再監査
- [ ] 4 labelすべてについて、必要最小限の単一または複数Formal evidenceで元のlabel意味全体を説明し、`stop=0`を確認
- [ ] Required local validation・focused evidence validation・scope check・Sanitizerを完了
- [ ] Run ArtifactをCurrent repository contractに従ってfinalize
- [ ] coverage-remediation PRを1本だけOPENし、review可能な状態にする
- [ ] coverage-remediation PR merge後、PR #78へ戻る

## 0. 依頼概要

- 依頼内容:
  - PR #78「Formal Test Strategy / Perspective / Traceability」を完成させる前提として、再監査で残った純粋なFormal coverage gap 2件を1つの独立PRで補完する。
  - 対象は `CT-CATEGORY-002` と `CT-BOUNDARY-001`。
  - PR #84で解消した `CT-DB-KEY-001` / `CP-FORM-001` も含め、最終的に4 labelをCurrent `main`で再監査し、PR #78を止める未解決labelがないことを確認する。
- 背景:
  - PR #78のlower Traceability再監査では、`CT-DB-KEY-001` と `CP-FORM-001` はProduct implementation gap、`CT-CATEGORY-002` と `CT-BOUNDARY-001` はFormal coverage gapとして分離された。
  - Product implementation gap 2件はPR #84で修正され、`main`へmerge済み。
  - 残る作業は既存Product behaviorを変更することではなく、Current RequirementをCurrent Formal Testで直接説明できる状態へ補完すること。
  - coverage evidenceが確定する前にPR #78のTraceabilityを再編集すると手戻りになるため、本PRを先に完了させ、その後PR #78を一度だけCurrent evidenceへ同期する。
- 期待成果:
  - `CT-CATEGORY-002` と `CT-BOUNDARY-001` の不足Formal coverageが、既存Test suiteへの最小変更で補完される。
  - `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` の4 labelについて、元のlabel意味を縮小せずCurrent evidenceが整理される。
  - 1つのtest / suiteだけで複合label全体を説明できない場合は、必要最小限の複数Formal evidenceを組み合わせて説明する。
  - coverage-remediationは1 PRにまとめ、PR #78のdocs scopeを汚さない。

## 1. ゴール / 完了条件

- ゴール:
  - PR #78を止めている残存Formal coverage gapだけを閉じ、lower TraceabilityをCurrent Formal evidenceへ正確に接続できる状態を作る。
- 完了条件（DoD）:
  1. `CT-CATEGORY-002 / FR-PR-055`について、以下をCurrent evidenceで確認できる。
     - 新規Categoryが0件なら`sortOrder=10`になる。
     - 既存Categoryがある場合は`max(sortOrder)+10`で末尾へ追加される。
     - 最大`sortOrder`取得とCategory作成が同一Dexie Transaction内で行われるというRequirementを、Current implementationとbehavioral Formal Test evidenceの組み合わせで説明できる。
     - transaction-side regressionは、既存Dexie integration seamで安定して観測できる場合のみ追加し、source text assertionやtest-only production hookへ逃げない。
  2. `CT-BOUNDARY-001`のうち不足している `FR-AR-003` について、UI向けOrder DTOが内部情報を公開しないことをFormal Testで明示できる。
     - Gateway idempotency key等のGateway内部値を含めない。
     - raw Repository `version`をそのまま公開しない。UI action用に意図的に公開される`orderActionVersion`とは区別する。
     - 内部Actor ID等を含めない。
     - raw DB側に代表internal valueが存在することをpreconditionとして確認したうえで、public DTO側のabsenceをnegative assertionで固定する。
  3. PR #84 merge後のCurrent `main`を根拠に、`CT-DB-KEY-001`が元のlabel意味全体に対してProduct code / SKU normalization・normalized uniqueness・関連するpersistence projectionを説明できる。
  4. PR #84 merge後のCurrent `main`を根拠に、`CP-FORM-001`が元のlabel意味全体に対してshared `INPUT_LIMITS`・Form/Application boundary・Application Error contract・Accessibility側のForm error contractを説明できる。
  5. 4 labelすべてを再監査し、元のlabel意味を縮小せず`stop=0`である。
     - 1つのlabelを1つのtest / suiteだけで説明できない場合は、必要最小限の複数evidenceを代表evidenceとして採用してよい。
     - `exact-title` / `suite-level`という分類を守るために、意味の一部を落としたり不適切な単一referenceへ押し込んだりしない。
  6. Product sourceを変更せずに完了する。Current evidenceとRequirementの矛盾を見つけた場合はscopeを広げずSTOPする。
  7. focused test、4-label代表evidenceのfocused validation、Required validation、Sanitizer、scope checkが完了する。
  8. 変更は原則として既存Formal Test、当Plan、Run Artifactに限定され、unexpected / forbidden scopeが0件である。
  9. coverage-remediation用PRを1本だけ作成し、review可能な状態にする。mergeは明示指示があるまで実施しない。

## 2. 現状理解と前提

### Current understanding

- Implementation BaseはPR #84 merge直後の`main`、`3022a74ba7cde2d3cc81ce318c6320dbf78115c6`。
- `FR-PR-055`は「新規Categoryは0件時`sortOrder=10`、既存時`max(sortOrder)+10`で末尾へ追加し、最大値取得と作成を同一Transactionで行うこと」。
- Current `DexieCategoryRepository.createAtEnd()`は`db.transaction("rw", db.categories, ...)`内でCategory一覧を取得し、最大`sortOrder`を算出して`categories.add()`している。
- Existing Formal Test `tests/integration/admin-master-use-cases.test.ts` の `creates categories at the end and reorders every ID in steps of ten` は既存Categoryがある場合の末尾追加結果を確認しているが、0件境界とtransaction-side regressionを独立したevidenceとして明示していない。
- `FR-AR-003`は「UI向けOrder DTOにGateway Key、Repository Version、内部Actor IDを含めないこと」。
- `src/application/contracts/orders.ts` の `OrderDetailDto` は`orderActionVersion`を公開contractとして持つ一方、raw `version`、Gateway key、Actor IDをcontractへ含めていない。
- Current `DexieOrderRepository.getDetail()`はDomain/DB recordから`OrderDetailDto`を明示的に組み立て、Paymentの`gatewayIdempotencyKey`、raw Repository `version`、Order status historyの`actorUserId`等をDTOへコピーしていない。
- Existing `tests/integration/checkout-order-use-cases.test.ts` はOrder Detailの主要な正の値を確認しているが、raw DBにinternal valueが存在することとpublic DTOで非公開であることを対にしたnegative assertionを固定していない。
- Current lower Traceabilityの `CT-BOUNDARY-001` は `FR-AR-001～004` と `NFR-MA-020～023` を含む複合labelであり、今回追加するOrder DTO evidenceだけでlabel全体を代表させない。
- PR #84により、以前implementation gapだった`CT-DB-KEY-001`と`CP-FORM-001`はCurrent `main`上で再監査可能な状態になった。

### Assumptions

- Historical gap analysisは調査の起点として利用するが、最終判定は必ずCurrent `main`のRequirement・source・Formal Testを再読して行う。
- coverage gapはProduct sourceを変更せず閉じられることを前提とする。
- Requirementを確認するためのテストは、source text検索や実装文字列の存在確認ではなく、observable behavior / public DTO boundaryを検証する。
- `CT-CATEGORY-002`のtransaction-side behavioral testの第一候補は、同一Category storeへ複数createを並行発行した際に末尾`sortOrder`が重複せず直列化されることを確認する既存Dexie integration testとする。
- 上記並行createがCurrent fake-indexeddb / Dexie test environmentで決定的に観測できない場合は、不安定なtestを追加せずSTOPする。
- 1つのlower Traceability labelは、元の意味全体を説明するために複数のCurrent Formal evidenceを持ってよい。

### Non-goals

- `docs/08_testing/test_strategy.md`や`docs/12_quality/requirements_traceability.md`を本PRで更新しない。
- PR #78 branch、Child Plan、Run Artifact、PR本文を本PR実装中に変更しない。
- `normalizeCode()`、Product code / SKU normalization、normalized uniquenessを再修正しない。
- `INPUT_LIMITS`、Form validation、Application Error contractを再修正しない。
- Category / OrderのProduct behaviorをcoverage都合で変更しない。
- 新しいRisk ID、Traceability SSOT、恒久的なcoverage inventoryを作らない。
- workflow、package、lockfile、validator、DB schema / migration、Seed、Playwright / Maestro、Curriculum / Trainingを変更しない。
- 大規模Test refactor、Test helper framework、failure injection frameworkを新設しない。
- 既存Test名の一括変更やFormal Test inventoryの全面整理を行わない。
- 複合labelを単一testへ無理に集約するための新しいTest ID制度やaggregation helperを作らない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - なし。Current Requirementと実装から着手可能。
- 仮定してよい細部:
  - assertionの具体的な配置や既存Testへの統合方法は、Current Test styleに合わせて最小差分を選ぶ。
  - private field negative assertionはRequirement上の内部概念を代表するraw field名を対象とし、公開契約である`orderActionVersion`まで否定しない。
  - 複合labelの代表evidenceは、意味全体を説明できる最小個数に留める。
- 未回答の重要質問:
  - `CT-CATEGORY-002`のtransaction-side behavioral regressionをCurrent test environmentで決定的に再現できるかは、実装開始時にfocused spikeで確認する。安定したbehavioral evidenceを作れずProduct/test hook追加が必要になる場合はSTOPする。

## 4. 影響範囲

### Impacted areas

- Formal Integration Test
  - Category master / repository behavior
  - Customer order read DTO boundary
- Read-only representative evidence validation
  - Repository contract
  - Form / accessibility component contract
- Implementation Run Artifact
- 本Plan

### Files to inspect

Requirement / traceability evidence:

- `docs/01_requirements/functional_requirements.md`
  - `FR-PR-055`
  - `FR-AR-001～004`
- `docs/01_requirements/non_functional_requirements.md`
  - `NFR-RL-008`
  - `NFR-TS-007`
  - `NFR-MA-010`
  - `NFR-MA-012`
  - `NFR-MA-020～023`
- `docs/12_quality/requirements_traceability.md`
  - `CT-DB-KEY-001`
  - `CP-FORM-001`
  - `CT-CATEGORY-002`
  - `CT-BOUNDARY-001`

Category current implementation / test:

- `src/application/use-cases/admin-master-use-cases.ts`
- `src/infrastructure/database/dexie/basic-repositories.ts`
  - `DexieCategoryRepository.createAtEnd()`
- `tests/integration/admin-master-use-cases.test.ts`
  - existing test: `creates categories at the end and reorders every ID in steps of ten`

Order boundary current implementation / test:

- `src/application/contracts/orders.ts`
  - `OrderDetailDto`
  - `CustomerOrderDetailDto`
- `src/application/use-cases/checkout-order-use-cases.ts`
  - `getMyOrder()` / `getMyCustomerOrder()`
- `src/infrastructure/database/dexie/order-review-repositories.ts`
  - `DexieOrderRepository.getDetail()`
- `src/domain/contracts/entities.ts`
  - `Order.version`
  - `Payment.gatewayIdempotencyKey` / `Payment.version`
  - `OrderStatusHistory.actorUserId`
- `tests/integration/checkout-order-use-cases.test.ts`
  - existing order-detail assertions in `creates consistent snapshots and decrements stock exactly once after success`

PR #84 evidence for read-only re-audit:

- `tests/repository-contract/repositories.test.ts`
  - `CT-DB-KEY-001`のrepresentative repository/persistence evidence候補
- `tests/integration/admin-product-use-cases.test.ts`
  - Product code / SKU normalization・normalized uniquenessのApplication evidence候補
- `tests/integration/auth-account.test.ts`
- `tests/integration/checkout-order-use-cases.test.ts`
- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/admin-operations-use-cases.test.ts`
- `tests/integration/catalog-use-cases.test.ts`
- `tests/integration/review-user-use-cases.test.ts`
  - shared `INPUT_LIMITS` / Application validation evidence候補
- `tests/component/presentation-foundation.test.tsx`
  - Error Summary / fieldErrors / focus contract evidence候補
- PR #84で変更された各Component test
  - Form `INPUT_LIMITS` evidenceはCurrent変更内容から必要最小限の代表suiteを選ぶ

## 5. 変更方針

### Change strategy

1. **Current evidence first**
   - Historical findingをそのまま修正対象とせず、Requirement → source → existing Formal Testの順で再確認する。
   - すでにCurrent TestでRequirementを十分直接保証している場合は、新規Testを増やさず「already covered」と判定する。

2. **Coverage-only**
   - 既存Product behaviorとRequirementが一致している場合だけTestを補完する。
   - Product behaviorがRequirementと矛盾する場合はimplementation gapとしてSTOPし、このPRへProduct fixを混ぜない。

3. **既存Test suiteへ統合**
   - Categoryは`tests/integration/admin-master-use-cases.test.ts`を第一候補とする。
   - Order DTOは`tests/integration/checkout-order-use-cases.test.ts`を第一候補とする。
   - 新しいTest fileは、既存suiteでは責務を明確に表現できない場合のみ検討する。

4. **Behavior / boundary assertionを優先**
   - source code文字列を読み込んで`transaction(`やfield名を検索するTestは作らない。
   - DTO private fieldはruntime objectへのnegative assertionで固定する。
   - private field negative assertionは、raw DB側に代表internal valueが存在することを先に確認してからpublic DTOのabsenceを確認し、空振りPASSを防ぐ。

5. **Category transaction coverageは既存seamで具体化する**
   - 0件境界: Categoryを0件にした状態でcreateし、`sortOrder=10`を確認する。
   - 既存境界: 現在の最大`sortOrder`を取得し、create後が`max+10`であることを確認する。
   - transaction-side regressionの第一候補: 同じ初期最大値を持つ状態から2件のCategory createを`Promise.all`等で並行発行し、最終的な`sortOrder`が重複せず`max+10` / `max+20`として両方persistされることを確認する。
   - 上記がCurrent Dexie / fake-indexeddb環境で決定的に成立しない場合は、不安定なtestや専用hookを追加せずSTOPする。

6. **Order DTO boundaryはraw/private → public DTOの対で検証する**
   - 既存の購入成功flowを使い、raw Order / Payment / OrderStatusHistoryからRequirementに対応するinternal valueが存在することを確認する。
   - その後`getMyOrder()` / `getMyCustomerOrder()`の返却DTOに`version`、`gatewayIdempotencyKey`、`actorUserId`等が存在しないことを確認する。
   - raw record側の代表Actor IDが対象flowでは`null`しか得られない場合、Current test seamでnon-null Actor IDを決定的に作れる既存flowを選ぶ。Product source変更や専用hookは追加しない。
   - `orderActionVersion`は意図されたUI concurrency contractとして存在を維持し、raw `version`の非公開と区別する。

7. **複合labelは必要最小限の複数evidenceで説明してよい**
   - 1つのlower Traceability labelに複数Requirement / NFRが含まれ、単一test / suiteでは意味全体を説明できない場合、複数のCurrent Formal evidenceを組み合わせる。
   - `CT-BOUNDARY-001`では、既存Architecture contract等が `FR-AR-001/002/004`・`NFR-MA-020～023`を代表し、今回追加するOrder DTO testが`FR-AR-003`を補う構成を第一候補とする。
   - `CT-DB-KEY-001` / `CP-FORM-001`も、PR #84後の元label意味全体を単一testへ無理に縮約しない。
   - 代表evidenceは最小個数に留め、全Test inventoryへ展開しない。

8. **4-label再監査はRun Artifactへ残す**
   - 本PRでTraceability docsを更新しない。
   - 各labelについて、元のlabel意味、Requirement、Current implementation evidence、representative Formal evidence、最終dispositionをRun REPORTへ記録する。
   - 複数evidenceを採用した場合は、それぞれがlabelのどの意味を担うかを短く記載する。
   - PR #78 merge前のTraceability同期は、このcoverage-remediation PRがmergeされた後にPR #78側で行う。

### 実行タスク

- [ ] 1. 実装開始時に`origin/main`をfetchし、`3022a74b...`以降にmainが進んでいればsemantic impactを確認する。必要なら最新mainを取り込んでからCurrent evidenceを再監査する。
- [ ] 2. Current repository rules（`AGENTS.md`、`PLANS.md`、Run Artifact contract、test conventions）を再読し、この実装用Run Artifactを開始する。
- [ ] 3. `FR-PR-055`、`DexieCategoryRepository.createAtEnd()`、既存Category integration testを再監査する。
- [ ] 4. Categoryの0件境界`sortOrder=10`と既存時`max+10`が代表Formal evidenceとして不足していれば、`tests/integration/admin-master-use-cases.test.ts`へ最小assertionを追加する。
- [ ] 5. `FR-PR-055`のtransaction-side regressionについて、同一初期状態から2件を並行createし、`max+10` / `max+20`へ重複なくpersistされるbehavioral testを第一候補としてfocused spikeする。
  - Current Dexie / fake-indexeddbで決定的に再現できる場合のみ既存integration suiteへ追加する。
  - source text assertion、test-only production hook、failure-injection framework、Repository API変更が必要なら追加せずSTOPする。
- [ ] 6. `FR-AR-003`、`OrderDetailDto`、Domain raw entity、`DexieOrderRepository.getDetail()`、既存Checkout/Order integration testを再監査する。
- [ ] 7. 既存Order DetailのFormal Testへ、raw internal valueの存在確認とpublic DTO absenceを対にしたnegative assertionを追加する。
  - raw Orderの`version`が存在することを確認する。
  - raw Paymentの`gatewayIdempotencyKey`が存在することを確認する。
  - raw OrderStatusHistory等から内部Actor IDの代表値を確認する。対象flowでnon-null値を得られない場合はCurrent既存flowを選び直す。
  - public DTOにはraw `version`、`gatewayIdempotencyKey`、`actorUserId`を含めないことを確認する。
  - `orderActionVersion`はUI action contractとして存在することを維持する。
  - whole-object snapshotではなく、Requirementに直接対応する明示的assertionを優先する。
- [ ] 8. `CT-DB-KEY-001`をCurrent `main`でread-only再監査し、PR #84後のProduct code / SKU normalization・normalized uniqueness・persistence projectionを説明する最小の代表Formal evidenceを確定する。
- [ ] 9. `CP-FORM-001`をCurrent `main`でread-only再監査し、PR #84後のshared input limits・Form/Application validation・Application Error・Form error accessibility contractを説明する最小の代表Formal evidenceを確定する。
- [ ] 10. `CT-CATEGORY-002` / `CT-BOUNDARY-001`を追加Test後に再監査する。複合labelは必要最小限の複数evidenceを許可し、各evidenceが元label意味のどの部分を担うかを明示する。
- [ ] 11. 4 labelのうち1件でもCurrent evidenceで元のlabel意味全体を説明できなければ`stop`として扱い、PR #78を完了扱いにしない。label意味を縮小したり、部分coverageを単一referenceへ押し込んで`stop=0`を作らない。
- [ ] 12. 変更したCategory / Order integration suiteのfocused testを実行する。
- [ ] 13. 4-label代表evidenceとして採用するread-only suiteをfocused実行する。少なくとも`CT-DB-KEY-001`のrepository contract代表suiteと、`CP-FORM-001`の代表component suiteを含める。
- [ ] 14. Required local validation、Sanitizer、scope checkを実行する。
- [ ] 15. Run Artifactへ4-labelの最終evidence・validation・scopeを同期し、Current Run contractに従ってfinalizeする。
- [ ] 16. coverage-remediation PRを`main`向けに1本だけOPENする。PR本文では2 coverage gapと4-label re-auditの結果を簡潔に記載する。
- [ ] 17. reviewでBlocking Findingがなく、exact-head CIが成立した後にmerge可否を判断する。mergeは明示指示があるまで行わない。
- [ ] 18. merge後、PR #78 branchへ最新mainを取り込み、PR #78のTraceability / Run / PR本文をCurrent evidenceへ同期する作業へ移る。

## 6. 検証方法

### Focused validation — changed suites

変更したTest suiteを直接実行する。

- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/checkout-order-use-cases.test.ts`

Current package scripts / Vitest CLIに合わせ、2 suiteを可能なら1回のfocused runで実行する。

### Focused validation — 4-label representative evidence

4-label再監査で代表evidenceとして採用したsuiteを実際に実行する。最低限の候補は以下。

- `CT-DB-KEY-001`
  - `tests/repository-contract/repositories.test.ts`
  - 必要に応じて`tests/integration/admin-product-use-cases.test.ts`
- `CP-FORM-001`
  - `tests/component/presentation-foundation.test.tsx`
  - shared `INPUT_LIMITS` / Application boundaryを代表するCurrent integration / component suiteの必要最小セット
- `CT-CATEGORY-002`
  - `tests/integration/admin-master-use-cases.test.ts`
- `CT-BOUNDARY-001`
  - `tests/contracts/architecture.test.ts`
  - `tests/integration/checkout-order-use-cases.test.ts`

代表evidenceを複数採用する場合、採用したsuiteはすべてfocused validation対象とする。

### Required local validation

実装時点のCurrent repository rulesを正とし、少なくとも以下を実行する。

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run typecheck`
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:repository`
- `pnpm run test:component`
- `pnpm run test:contracts`
- `pnpm run lint`
- `git diff --check`
- Current Codex artifact Sanitizer Write / Check（residual 0）

本PRはProduct / Presentation sourceを変更しないが、`CT-DB-KEY-001` / `CP-FORM-001`をCurrent evidenceとして再確定して`stop=0`を判断するため、repository / component validationも省略しない。

E2E / Nativeをローカルで追加実行することは原則不要。PR-triggered CIのCurrent matrixをSSOTとして確認する。

### 成功判定

- changed suite focused testがPASSする。
- 4-label代表evidenceとして採用したfocused suiteがすべてPASSする。
- Required local validationがPASSする。またはenvironment failureがある場合、Run contractに従って正しく分類し、Test/timeout/CI contractを弱めて通さない。
- `git diff --check` PASS。
- Sanitizer residual 0。
- Product/source変更0を原則とする。
- workflow/package/config/validator/DB/Curriculum/Training/PR #78 docsの変更0。
- 4-label再監査で意味の縮小なしに、必要なら複数evidenceを使って`stop=0`を説明できる。
- PR作成時のchanged filesがPlan/Test/Run Artifactの想定範囲に収まる。

## 7. リスクと未解決論点

### Risks

1. **CT-CATEGORY-002を「transactionがsourceに書いてある」だけでTest済みにする**
   - 対策: source-text assertionは禁止。0件境界、既存`max+10`、並行createの直列化をCurrent integration seamでbehaviorとして確認できるかを先に監査する。

2. **Category並行create test自体がscheduler依存でflakyになる**
   - 対策: focused spikeでCurrent Dexie / fake-indexeddb上の決定性を先に確認する。決定的でなければtestを無理に追加せずSTOPする。

3. **atomicityを証明するためにproductionへtest hookを追加する**
   - 対策: coverage-only scopeを優先。専用hook / failure injection framework / Repository API変更が必要ならSTOPし、implementation/testability gapとして別判断する。

4. **FR-AR-003のnegative assertionが空振りPASSする**
   - 対策: raw DB側に`version` / Gateway key / Actor ID等の代表internal valueが存在することを確認してからpublic DTO absenceをassertする。

5. **FR-AR-003のraw Repository Versionと`orderActionVersion`を混同する**
   - 対策: `orderActionVersion`はUI action concurrency用の公開contractとして維持し、raw `version` fieldそのものがDTOへ露出しないことをnegative assertionする。

6. **複合labelを単一testへ押し込むためにlabel意味を縮める**
   - 対策: `requirements_traceability.md`のCurrent label文言を固定入力とし、必要なら複数evidenceを組み合わせて意味全体を説明する。代表evidenceの個数は必要最小限にする。

7. **PR #78を同時編集してscopeを混在させる**
   - 対策: coverage PR mergeまではPR #78関連fileを禁止scopeとする。

### STOP conditions

以下の場合は実装範囲を広げずSTOPして報告する。

- Current `DexieCategoryRepository.createAtEnd()`が`FR-PR-055`と実際には矛盾している。
- Category transaction-side RequirementをCurrent test environmentで安定してbehavioral regressionとして保証できず、Product source / test hook / framework追加が必要になる。
- Current Order DTOに`FR-AR-003`で禁止されたprivate/internal fieldが実際に露出している。
- raw internal valueを持つ代表fixture / existing flowをProduct変更なしに準備できず、meaningfulなDTO negative testを作れない。
- `CT-DB-KEY-001`または`CP-FORM-001`がPR #84 merge後も元のlabel意味全体を説明できない。
- 4 labelのいずれかで、必要最小限の複数Formal evidenceを組み合わせても元label意味全体を説明できない。
- DB schema / migration / workflow / package / validator変更が必要になる。
- PR #78のTraceabilityを先に変更しなければTest実装できない状態になる。

### Open questions

- 現時点なし。上記STOP conditionsは実装開始時のCurrent evidenceで判定する。

## 8. 成果物

### 変更ファイル（想定）

Plan:

- `docs/plans/2026-08-30_165942_pr2_formal_coverage_remediation.md`

Formal Test候補:

- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/checkout-order-use-cases.test.ts`

Read-only representative evidence候補:

- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-product-use-cases.test.ts`
- `tests/contracts/architecture.test.ts`
- `tests/component/presentation-foundation.test.tsx`
- PR #84で変更された必要最小限のIntegration / Component suite

Run Artifact:

- 実装開始時にCurrent Codex Run contractに従って`.codex/runs/<run-id>/`を作成・管理する。

### 原則変更しないファイル

- `src/**`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md`
- PR #78 active Run Artifact
- `.github/workflows/**`
- `package.json` / lockfile
- DB schema / migration
- Curriculum / Training

### 付随ドキュメント

- coverage-remediation PR本文（実装完了後）
- Issue #72は進捗インデックスとしてbranch / Plan / PR番号と完了状態だけを更新し、詳細FindingやValidation内容は複製しない。

## 9. PR #78へのHandoff

coverage-remediation PRがmergeされた後にのみ、PR #78へ戻る。

PR #78側では以下を行う。

1. `docs/formal-test-strategy-traceability`へ最新`main`を取り込む。
2. `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001`をmerge後のCurrent Formal evidenceで再評価する。
3. lower Traceability dispositionを元のlabel意味を維持したまま更新する。
   - 1 labelを単一test / suiteで説明できない場合は、必要最小限の複数referenceを記載する。
   - `CT-BOUNDARY-001`はArchitecture boundary evidenceとOrder DTO boundary evidenceの役割を混同しない。
4. PR #78の古いRun state / validation state / PR本文をCurrent repository contractとCurrent evidenceへ同期する。
5. PR #78全体を再レビューし、Required validation → validated head → Run finalization → finalization-head CI / mergeability確認の順で完了させる。
6. PR #78 merge後にIssue #72のPR 2を完了扱いにし、PR 3へ進む。

## 10. 備考

- このPlanはcoverage-remediationを**1 PR**で完結させる前提である。`CT-CATEGORY-002`と`CT-BOUNDARY-001`を別PRへ分割しない。
- 本Plan修正時点では実装、Test変更、Run Artifact作成、PR作成は行わない。
- 「Formal coverageを増やすこと」自体が目的ではない。PR #78のlower TraceabilityがCurrent RequirementとCurrent Formal Suiteを、意味を縮小せず正確に結べる最小evidenceを作ることが目的である。
