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
- [ ] 4 labelすべてについてPR #78へ戻せる代表Formal evidenceを確定し、`stop=0`を確認
- [ ] Required local validation・scope check・Sanitizerを完了

## 0. 依頼概要

- 依頼内容:
  - PR #78の再監査で不足が判明したFormal coverageだけを、既存Test suiteへの最小変更で補完する。
  - Product implementation gapはPR #84で別PRとして修正済みのため、このbranchではProduct sourceを変更しない。
- 背景:
  - PR #78ではlower TraceabilityをCurrent Formal evidenceへ接続する必要がある。
  - 再監査の結果、`CT-CATEGORY-002 / FR-PR-055` と `CT-BOUNDARY-001 / FR-AR-003` はProduct behavior自体ではなく、Formal Test evidenceが不足している。
  - `CT-DB-KEY-001` / `CP-FORM-001` はPR #84でProduct contract gapを修正済みであり、Current `main` で代表evidenceを再確定するだけでよい。
  - coverage evidenceが確定する前にPR #78のTraceabilityを再編集すると手戻りになるため、本PRを先に完了させ、その後PR #78を一度だけCurrent evidenceへ同期する。
- 期待成果:
  - `CT-CATEGORY-002` と `CT-BOUNDARY-001` の不足Formal coverageが、既存Test suiteへの最小変更で補完される。
  - `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` の4 labelについて、元のlabel意味を縮小せずCurrent evidenceが整理される。
  - 1つのtest / suiteだけで複合label全体を説明できない場合は、必要最小限の複数Formal evidenceを組み合わせて説明する。
  - coverage-remediationは1 PRにまとめ、PR #78のdocs scopeを汚さない。

## 1. ゴール / 完了条件

### Goal

PR #78を止めている残存Formal coverage gapだけを閉じ、lower TraceabilityをCurrent Formal evidenceへ正確に接続できる状態を作る。

### Definition of Done

1. `CT-CATEGORY-002 / FR-PR-055`について、既存`tests/integration/admin-master-use-cases.test.ts`へ専用testを1本だけ追加し、以下を1つのbehavioral scenarioで確認できる。
   - Category 0件から最初のcreateを行うと`sortOrder=10`になる。
   - その状態から2件のCategory createを並行発行したとき、両方が成功し、最終的な追加2件の`sortOrder`が`20` / `30`となる。
   - DB上でもCategory全件の`sortOrder`が`10` / `20` / `30`として重複なくpersistされる。
   - 既存の `creates categories at the end and reorders every ID in steps of ten` は既存責務のまま維持し、本Requirementの専用testへ責務を集約するために肥大化させない。
   - Current Dexie / fake-indexeddb環境で並行createを決定的に観測できない場合は、不安定なtest・source text assertion・test-only production hookを追加せずSTOPする。
2. `CT-BOUNDARY-001`のうち不足している `FR-AR-003` について、既存`tests/integration/checkout-order-use-cases.test.ts`の購入成功testへ最小assertionを追加し、UI向けOrder DTOが内部情報を公開しないことを明示できる。
   - raw Order recordに`version` propertyが存在する。
   - raw Payment recordに`gatewayIdempotencyKey` propertyが存在する。
   - raw OrderStatusHistory recordに`actorUserId` propertyが存在する。値はRequirement上nullでもnon-nullでもよく、non-null値を作るために別flowへ切り替えない。
   - public DTOにはraw `version`、`gatewayIdempotencyKey`、`actorUserId` propertyを含めない。
   - UI action用に意図的に公開される`orderActionVersion`は存在を維持し、raw Repository `version`の非公開と区別する。
3. PR #84 merge後のCurrent `main`を根拠に、`CT-DB-KEY-001`が元のlabel意味全体に対してProduct code / SKU normalization・normalized uniqueness・関連するpersistence projectionを説明できる。
4. PR #84 merge後のCurrent `main`を根拠に、`CP-FORM-001`が元のlabel意味全体に対してshared `INPUT_LIMITS`・Form/Application boundary・Application Error contract・Accessibility側のForm error contractを説明できる。
5. 4 labelすべてを再監査し、元のlabel意味を縮小せず`stop=0`である。
   - 1つのlabelを1つのtest / suiteだけで説明できない場合は、必要最小限の複数evidenceを代表evidenceとして採用してよい。
   - `exact-title` / `suite-level`という分類を守るために、意味の一部を落としたり不適切な単一referenceへ押し込んだりしない。
6. Product sourceを変更せずに完了する。Current evidenceとRequirementの矛盾を見つけた場合はscopeを広げずSTOPする。
7. 変更した2 integration suiteのfocused test、Required validation、Sanitizer、scope checkが完了する。
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
- `OrderStatusHistory.actorUserId`はCurrent Domain contract上`EntityId | null`であり、nullは正規のraw internal valueである。FR-AR-003の検証にnon-null Actor IDは不要である。
- Existing `tests/integration/checkout-order-use-cases.test.ts` の購入成功testはOrder作成・Payment成功・Order Detail取得まで実行しているため、新しいflowやfixtureを追加せず同test内でraw/private → public DTO boundaryを確認できる。
- Current lower Traceabilityの `CT-BOUNDARY-001` は `FR-AR-001～004` と `NFR-MA-020～023` を含む複合labelであり、今回追加するOrder DTO evidenceだけでlabel全体を代表させない。
- PR #84により、以前implementation gapだった`CT-DB-KEY-001`と`CP-FORM-001`はCurrent `main`上で再監査可能な状態になった。

### Assumptions

- Historical gap analysisは調査の起点として利用するが、最終判定は必ずCurrent `main`のRequirement・source・Formal Testを再読して行う。
- coverage gapはProduct sourceを変更せず閉じられることを前提とする。
- Requirementを確認するためのテストは、source text検索や実装文字列の存在確認ではなく、observable behavior / public DTO boundaryを検証する。
- `CT-CATEGORY-002`の追加実装は既存Category integration suite内の専用test 1本に集約し、0件境界・末尾追加・並行createの直列化を同scenarioで確認する。
- 上記並行createがCurrent fake-indexeddb / Dexie test environmentで決定的に観測できない場合は、不安定なtestを追加せずSTOPする。
- `CT-BOUNDARY-001 / FR-AR-003`ではraw propertyの存在とpublic DTO propertyのabsenceを確認すれば十分であり、Actor IDをnon-nullにするための別flow・追加fixture・DB直接編集は行わない。
- 1つのlower Traceability labelは、元の意味全体を説明するために複数のCurrent Formal evidenceを持ってよい。

### Non-goals

- `docs/08_testing/test_strategy.md`や`docs/12_quality/requirements_traceability.md`を本PRで更新しない。
- PR #78 branch、Child Plan、Run Artifact、PR本文を本PR実装中に変更しない。
- `normalizeCode()`、Product code / SKU normalization、normalized uniquenessを再修正しない。
- shared `INPUT_LIMITS`、Form/Application validation、Application Errorを再修正しない。
- Product source、Application source、Infrastructure source、Presentation sourceの変更。
- Repository API変更、DB schema / migration変更。
- Test-only production hook、failure injection framework、transaction wrapper spy、source text assertionの追加。
- 新Test file、新Test helper、新ID制度、Test titleへのlabel埋込み。
- E2E / Native testの追加。
- 4-label代表evidenceを網羅的Test inventoryへ展開すること。

## 3. 質問 / 曖昧性

### Blocking questions

現時点でなし。

### Stop conditions

以下のいずれかに該当した場合は推測でscopeを広げずSTOPする。

- Current `main`で対象gapがすでにFormal Testにより直接かつ十分にcoveredになっているため、追加Testが不要である。
- `FR-PR-055`の並行create behaviorをCurrent Dexie / fake-indexeddb環境で決定的に観測できず、専用hook・spy・failure injection等が必要になる。
- `FR-AR-003`の確認にProduct/Application/Infrastructure source変更、新flow、新fixture設計が必要になる。
- Current implementationがRequirementと矛盾し、coverage-onlyでは閉じられない。
- `CT-DB-KEY-001` / `CP-FORM-001`の元label意味全体をPR #84後のCurrent evidenceで説明できない。
- 4 labelのいずれかを`stop=0`にするためにlabel意味の縮小、Test ID制度変更、Traceability docsの先行変更が必要になる。
- workflow / package / config / validator / DB schema / Curriculum / Training / PR #78 docsの変更が必要になる。

### Assumptions allowed

- 新規assertionの具体的な`expect()`記法や変数名は既存suite conventionへ合わせる。
- Category並行createは`Promise.all`等、既存TypeScript / Vitestで最小の方法を使う。
- raw property確認では値の業務的意味を再検証せず、対象propertyがraw modelに存在することだけをpreconditionとする。

### Open questions

- なし。

## 4. 影響範囲

### Impacted areas

実装時の想定変更対象は原則以下だけ。

- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/checkout-order-use-cases.test.ts`
- 本Plan
- 新しいimplementation Run Artifact

Product / Application / Infrastructure / Presentation sourceは変更しない。

### Files to inspect

#### Category coverage

- `docs/01_requirements/functional_requirements.md` — `FR-PR-055`
- `src/infrastructure/database/dexie/admin-master-repositories.ts` — `DexieCategoryRepository.createAtEnd()`
- `src/application/use-cases/admin-master-use-cases.ts`
- `tests/integration/admin-master-use-cases.test.ts`

#### Order DTO boundary

- `docs/01_requirements/functional_requirements.md` — `FR-AR-003`
- `src/application/contracts/orders.ts` — `OrderDetailDto`
- `src/domain/contracts/entities.ts` — raw Order / Payment / OrderStatusHistory
- `src/infrastructure/database/dexie/order-review-repositories.ts` — `DexieOrderRepository.getDetail()`
- `tests/integration/checkout-order-use-cases.test.ts`

#### 4-label re-audit

- PR #78 `docs/12_quality/requirements_traceability.md`
- `tests/repository-contract/repositories.test.ts`
- `tests/integration/admin-product-use-cases.test.ts`
- `tests/component/presentation-foundation.test.tsx`
- PR #84 changed testsのうち`CT-DB-KEY-001` / `CP-FORM-001`の元label意味に直接対応するCurrent test file
- `tests/contracts/architecture.test.ts`

## 5. 変更方針

### Change strategy

1. **Current evidence first**
   - Historical findingをそのまま修正対象とせず、Requirement → source → existing Formal Testの順で再確認する。
   - すでにCurrent TestでRequirementを十分直接保証している場合は、新規Testを増やさず「already covered」と判定する。

2. **Coverage-only**
   - 既存Product behaviorとRequirementが一致している場合だけTestを補完する。
   - Product behaviorがRequirementと矛盾する場合はimplementation gapとしてSTOPし、このPRへProduct fixを混ぜない。

3. **既存Test suiteへ統合**
   - Categoryは`tests/integration/admin-master-use-cases.test.ts`へFR-PR-055専用testを1本だけ追加する。
   - 既存`creates categories at the end and reorders every ID in steps of ten`には新しいtransaction責務を追加しない。
   - Order DTOは`tests/integration/checkout-order-use-cases.test.ts`の既存購入成功testへassertionだけ追加し、新test / 新flowを増やさない。
   - 新しいTest file / helperは作らない。

4. **Category coverageは1本のbehavioral testで閉じる**
   - test開始時にCategory storeを空にする。
   - 1件createし、返却値とpersisted recordの`sortOrder=10`を確認する。
   - 続けて2件を並行createする。
   - 並行createした2件の`sortOrder`をsortして`[20, 30]`になることを確認する。
   - DB全件の`sortOrder`をsortして`[10, 20, 30]`になることを確認し、重複やlost writeがないことを固定する。
   - transaction implementation detailそのものをspyせず、Requirement上のobservable resultだけを検証する。
   - このtestがCurrent環境で安定しない場合は複雑な代替実装へ進まずSTOPする。

5. **Order DTO boundaryは既存成功testへ最小assertionを追加する**
   - 購入成功後、同じorderIdを使ってraw Order / Payment / OrderStatusHistoryをDBから取得する。
   - raw Orderに`version` propertyが存在することを確認する。
   - raw Paymentに`gatewayIdempotencyKey` propertyが存在することを確認する。
   - raw OrderStatusHistoryに`actorUserId` propertyが存在することを確認する。値はnullでもよい。
   - 既存`getMyOrder()`の返却DTOについて、`version` / `gatewayIdempotencyKey` / `actorUserId` propertyが存在しないことを明示的に確認する。
   - `orderActionVersion`は引き続き存在することを確認し、raw `version`との契約差を明確にする。
   - non-null Actor IDを得るための別flow探索、追加fixture、直接DB mutationは行わない。

6. **複合labelは必要最小限の複数evidenceで説明してよい**
   - 1つのlower Traceability labelに複数Requirement / NFRが含まれ、単一test / suiteでは意味全体を説明できない場合、複数のCurrent Formal evidenceを組み合わせる。
   - `CT-BOUNDARY-001`では、既存Architecture contract等が `FR-AR-001/002/004`・`NFR-MA-020～023`を代表し、今回追加するOrder DTO assertionが`FR-AR-003`を補う構成を第一候補とする。
   - `CT-DB-KEY-001` / `CP-FORM-001`も、PR #84後の元label意味全体を単一testへ無理に縮約しない。
   - 代表evidenceは最小個数に留め、全Test inventoryへ展開しない。

7. **4-label再監査はread-only evidence整理に留める**
   - 本PRでTraceability docsを更新しない。
   - 各labelについて、元のlabel意味、Requirement、Current implementation evidence、representative Formal evidence、最終dispositionをRun REPORTへ記録する。
   - 複数evidenceを採用した場合は、それぞれがlabelのどの意味を担うかを短く記載する。
   - 代表suiteを再監査のためだけに個別focused実行しない。最終Required validationで各suiteがPASSしていることをevidenceとする。
   - PR #78 merge前のTraceability同期は、このcoverage-remediation PRがmergeされた後にPR #78側で行う。

### 実行タスク

- [ ] 1. 実装開始時に`origin/main`をfetchし、`3022a74b...`以降にmainが進んでいればsemantic impactを確認する。必要なら最新mainを取り込んでからCurrent evidenceを再監査する。
- [ ] 2. Current repository rules（`AGENTS.md`、`PLANS.md`、Run Artifact contract、test conventions）を再読し、この実装用Run Artifactを開始する。
- [ ] 3. `FR-PR-055`、`DexieCategoryRepository.createAtEnd()`、既存Category integration testを再監査する。
- [ ] 4. `tests/integration/admin-master-use-cases.test.ts`へFR-PR-055専用testを1本追加する。
  - Category storeを空にする。
  - 最初のcreateが`sortOrder=10`でpersistされることを確認する。
  - 続けて2件を並行createし、追加2件が`20` / `30`となることを確認する。
  - DB全件が`10` / `20` / `30`となり、重複・lost writeがないことを確認する。
  - 並行createがCurrent環境で決定的に成立しない場合は、不安定なtestや専用hookを追加せずSTOPする。
- [ ] 5. `FR-AR-003`、`OrderDetailDto`、Domain raw entity、`DexieOrderRepository.getDetail()`、既存Checkout/Order integration testを再監査する。
- [ ] 6. `tests/integration/checkout-order-use-cases.test.ts`の既存購入成功testへ、raw/private → public DTO boundary assertionだけを追加する。
  - raw Orderに`version` propertyが存在する。
  - raw Paymentに`gatewayIdempotencyKey` propertyが存在する。
  - raw OrderStatusHistoryに`actorUserId` propertyが存在する。値はnullでもよい。
  - public DTOには`version` / `gatewayIdempotencyKey` / `actorUserId` propertyが存在しない。
  - `orderActionVersion`は意図されたUI action contractとして存在する。
  - non-null Actor IDを得るための別flow、新fixture、DB直接編集は追加しない。
- [ ] 7. `CT-DB-KEY-001`をCurrent `main`でread-only再監査し、PR #84後のProduct code / SKU normalization・normalized uniqueness・persistence projectionを説明する最小の代表Formal evidenceを確定する。
- [ ] 8. `CP-FORM-001`をCurrent `main`でread-only再監査し、PR #84後のshared input limits・Form/Application validation・Application Error・Form error accessibility contractを説明する最小の代表Formal evidenceを確定する。
- [ ] 9. `CT-CATEGORY-002` / `CT-BOUNDARY-001`を追加Test後に再監査する。複合labelは必要最小限の複数evidenceを許可し、各evidenceが元label意味のどの部分を担うかを明示する。
- [ ] 10. 4 labelのうち1件でもCurrent evidenceで元のlabel意味全体を説明できなければ`stop`として扱い、PR #78を完了扱いにしない。label意味を縮小したり、部分coverageを単一referenceへ押し込んで`stop=0`を作らない。
- [ ] 11. 変更した2 integration suiteだけをfocused実行し、実装中の高速feedbackを得る。
- [ ] 12. Required local validation、Sanitizer、scope checkを実行する。4-label代表evidenceの個別focused再実行は行わず、Required validationで代表suiteがPASSすることを確認する。
- [ ] 13. Run Artifactへ4-labelの最終evidence・validation・scopeを同期し、Current Run contractに従ってfinalizeする。
- [ ] 14. coverage-remediation PRを`main`向けに1本だけOPENする。PR本文では2 coverage gapと4-label re-auditの結果を簡潔に記載する。
- [ ] 15. reviewでBlocking Findingがなく、exact-head CIが成立した後にmerge可否を判断する。mergeは明示指示があるまで行わない。
- [ ] 16. merge後、PR #78 branchへ最新mainを取り込み、PR #78のTraceability / Run / PR本文をCurrent evidenceへ同期する作業へ移る。

## 6. 検証方法

### Focused validation — changed suites only

実装中の高速feedbackとして、変更した2 integration suiteだけを直接実行する。

- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/checkout-order-use-cases.test.ts`

Current package scripts / Vitest CLIに合わせ、2 suiteを可能なら1回のfocused runで実行する。

`CT-DB-KEY-001` / `CP-FORM-001` / Architecture contract等のread-only代表suiteは、再監査のためだけにここで個別再実行しない。最終Required validationに含まれるため、同じtestを二重に実行しない。

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

Required validation内で、4-labelの代表evidenceとして採用したsuiteが実際にPASSしていることを確認し、Run Artifactへ対応関係を記録する。

E2E / Nativeをローカルで追加実行することは原則不要。PR-triggered CIのCurrent matrixをSSOTとして確認する。

### 成功判定

- 変更した2 integration suiteのfocused testがPASSする。
- Required local validationがPASSし、4-label代表evidenceとして採用したsuiteもその中でPASSしている。
- environment failureがある場合、Run contractに従って正しく分類し、Test/timeout/CI contractを弱めて通さない。
- `git diff --check` PASS。
- Sanitizer residual 0。
- Product/Application/Infrastructure/Presentation source変更0。
- workflow/package/config/validator/DB/Curriculum/Training/PR #78 docsの変更0。
- 4-label再監査で意味の縮小なしに、必要なら複数evidenceを使って`stop=0`を説明できる。
- PR作成時のchanged filesがPlan/Test/Run Artifactの想定範囲に収まる。

## 7. リスクと未解決論点

### Risks

1. **Category concurrency test自体が環境依存になる**
   - 対応: 1本の専用integration testでのみ試し、Current Dexie / fake-indexeddbで決定的に成立しないならSTOPする。retry、sleep、専用hook、transaction spy等で無理に成立させない。
2. **Order DTOのnegative assertionが空振りする**
   - 対応: raw recordに対象propertyが存在することを先に確認する。ただしActor IDの値はnullでもよく、non-nullにするために別flowを追加しない。
3. **複合labelを単一testへ縮約して意味を失う**
   - 対応: 必要最小限の複数evidenceを許可し、各evidenceが担うRequirementをRun REPORTへ明記する。
4. **再監査のためのvalidationを重複実行して作業を膨らませる**
   - 対応: focused validationは変更した2 suiteだけ。read-only代表suiteはRequired validationのPASSを利用する。
5. **coverage remediationからProduct修正へscope creepする**
   - 対応: Current implementationとRequirementが矛盾したら、その場でProduct fixを始めずSTOPする。

### Open questions

- なし。

## 8. 成果物

### 変更ファイル

想定:

- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/checkout-order-use-cases.test.ts`
- `docs/plans/2026-08-30_165942_pr2_formal_coverage_remediation.md`
- `.codex/runs/<implementation-run-id>/PLAN.md`
- `.codex/runs/<implementation-run-id>/TASKS.md`
- `.codex/runs/<implementation-run-id>/REPORT.md`
- machine-managed `run.json`（Current Run contractで必要な場合）

### 付随ドキュメント

- 本PRでは`docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`を変更しない。
- coverage-remediation merge後、PR #78側でCurrent evidenceへ同期する。

## 9. 備考

- Planの詳細さは実装時の追加判断を減らすためのものであり、実装自体を複雑化する意図はない。
- 実コード差分の目標は「Category integration test 1本追加 + 既存Checkout成功testへのassertion追加」のみ。
- 新helper / 新Test file / Product source変更 / framework追加は行わない。
