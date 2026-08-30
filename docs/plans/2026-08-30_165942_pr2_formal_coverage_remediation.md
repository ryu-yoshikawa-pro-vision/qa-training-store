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
  - 残る作業は既存Product behaviorを変更することではなく、Current Requirementを既存Formal Testで直接説明できる状態へ補完すること。
  - coverage evidenceが確定する前にPR #78のTraceabilityを再編集すると手戻りになるため、本PRを先に完了させ、その後PR #78を一度だけCurrent evidenceへ同期する。
- 期待成果:
  - `CT-CATEGORY-002` と `CT-BOUNDARY-001` の不足Formal coverageが、既存Test suiteへの最小変更で補完される。
  - `CT-DB-KEY-001` / `CP-FORM-001` / `CT-CATEGORY-002` / `CT-BOUNDARY-001` の4 labelについてCurrent evidenceが整理され、PR #78へ戻る時点で`stop=0`と説明できる。
  - coverage-remediationは1 PRにまとめ、PR #78のdocs scopeを汚さない。

## 1. ゴール / 完了条件

- ゴール:
  - PR #78を止めている残存Formal coverage gapだけを閉じ、lower TraceabilityをCurrent Formal evidenceへ接続できる状態を作る。
- 完了条件（DoD）:
  1. `CT-CATEGORY-002 / FR-PR-055`について、以下をCurrent evidenceで確認できる。
     - 新規Categoryが0件なら`sortOrder=10`、既存Categoryがある場合は`max(sortOrder)+10`で末尾へ追加される。
     - 最大`sortOrder`取得とCategory作成が同一Dexie Transaction内で行われるというRequirementを、既存実装とFormal Test evidenceの組み合わせで直接説明できる。
     - 単なる成功結果確認だけでは不足する場合、既存Test seamで可能な最小のatomicity / transaction-boundary regression assertionを追加する。
  2. `CT-BOUNDARY-001 / FR-AR-003`について、UI向けOrder DTOが内部情報を公開しないことをFormal Testで明示できる。
     - Gateway idempotency key等のGateway内部値を含めない。
     - raw Repository `version`をそのまま公開しない。UI action用に意図的に公開される`orderActionVersion`とは区別する。
     - 内部Actor ID等を含めない。
     - private fieldのabsenceをnegative assertionで固定する。
  3. PR #84 merge後のCurrent `main`を根拠に、`CT-DB-KEY-001`がProduct code / SKU normalization・normalized uniquenessを説明できる。
  4. PR #84 merge後のCurrent `main`を根拠に、`CP-FORM-001`がshared `INPUT_LIMITS`・Form/Application boundary・Application Error contractを説明できる。
  5. 4 labelすべてを再監査し、PR #78を止める`stop`が0件である。
  6. Product sourceを変更せずに完了する。Current evidenceと矛盾する実装差異が見つかった場合はscopeを広げずSTOPする。
  7. focused test、Required validation、Sanitizer、scope checkがすべて完了する。
  8. 変更は原則として既存Formal Test、当Plan、Run Artifactに限定され、unexpected / forbidden scopeが0件である。
  9. coverage-remediation用PRを1本だけ作成し、review可能な状態にする。mergeは明示指示があるまで実施しない。

## 2. 現状理解と前提

### Current understanding

- Implementation BaseはPR #84 merge直後の`main`、`3022a74ba7cde2d3cc81ce318c6320dbf78115c6`。
- `FR-PR-055`は「新規Categoryは0件時`sortOrder=10`、既存時`max(sortOrder)+10`で末尾へ追加し、最大値取得と作成を同一Transactionで行うこと」。
- Current `DexieCategoryRepository.createAtEnd()`は`db.transaction("rw", db.categories, ...)`内で全Categoryを取得し、最大`sortOrder`を算出して`categories.add()`している。
- Existing Formal Test `tests/integration/admin-master-use-cases.test.ts` の `creates categories at the end and reorders every ID in steps of ten` は末尾追加結果を確認しているが、`FR-PR-055`のtransaction/atomicity側を独立したRegression evidenceとして明示していない。
- `FR-AR-003`は「UI向けOrder DTOにGateway Key、Repository Version、内部Actor IDを含めないこと」。
- Current `DexieOrderRepository.getDetail()`はDomain/DB recordから`OrderDetailDto`を明示的に組み立て、`gatewayIdempotencyKey`等のPayment内部fieldやraw `version`、Actor情報をDTOへコピーしていない。一方、UI action concurrency用の`orderActionVersion`は意図された公開contractなので、raw Repository `version`との意味を混同しない。
- Existing `tests/integration/checkout-order-use-cases.test.ts` はOrder Detailの主要な正の値を確認しているが、private/internal fieldが存在しないことをnegative assertionで固定していない。
- PR #84により、以前implementation gapだった`CT-DB-KEY-001`と`CP-FORM-001`はCurrent `main`上で再監査可能な状態になった。

### Assumptions

- Historical gap analysisは調査の起点として利用するが、最終判定は必ずCurrent `main`のRequirement・source・Formal Testを再読して行う。
- coverage gapはProduct sourceを変更せず閉じられることを前提とする。
- Requirementを確認するためのテストは、source text検索や実装文字列の存在確認ではなく、可能な限りobservable behavior / public DTO boundaryを検証する。
- `CT-CATEGORY-002`の「同一Transaction」をobservable behaviorだけで無理に証明するためのtest-only production hookは追加しない。Currentの既存seamで直接保証できない場合は、既存Repository integration seamやTransaction behaviorを再監査し、それでも不十分ならSTOPする。

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

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - なし。Current Requirementと実装から着手可能。
- 仮定してよい細部:
  - assertionの具体的な配置や既存Testへの統合方法は、Current Test styleに合わせて最小差分を選ぶ。
  - private field negative assertionは、Requirement上の内部概念を代表するraw field名を対象とし、公開契約である`orderActionVersion`まで否定しない。
- 未回答の重要質問:
  - `CT-CATEGORY-002`のtransaction-side coverageを既存seamだけで直接再現可能かは実装開始時に再監査する。Product/test hook追加が必要になる場合はcoverage-only scopeを超えるためSTOPする。

## 4. 影響範囲

### Impacted areas

- Formal Integration Test
  - Category master / repository behavior
  - Customer order read DTO boundary
- Implementation Run Artifact
- 本Plan

### Files to inspect

Requirement / traceability evidence:

- `docs/01_requirements/functional_requirements.md`
  - `FR-PR-055`
  - `FR-AR-003`
- `docs/01_requirements/non_functional_requirements.md`
  - `NFR-RL-008`
  - `NFR-TS-007`
  - `NFR-MA-010`
  - `NFR-MA-023`
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

- `src/application/use-cases/checkout-order-use-cases.ts`
  - `getMyOrder()` / `getMyCustomerOrder()`
- `src/infrastructure/database/dexie/order-review-repositories.ts`
  - `DexieOrderRepository.getDetail()`
- Application contract file that defines `OrderDetailDto` / related DTOs
- `tests/integration/checkout-order-use-cases.test.ts`
  - existing order-detail assertions in `creates consistent snapshots and decrements stock exactly once after success`

PR #84 evidence for read-only re-audit:

- Product write/normalization path and existing integration tests relevant to`CT-DB-KEY-001`
- shared `INPUT_LIMITS` / Form / Application validation and existing Integration / Component tests relevant to`CP-FORM-001`

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
   - Category transactionはCurrentのRepository integration seamでtransactional behaviorを実証できる方法があるかを先に確認する。

5. **4-label再監査はRun Artifactへ残す**
   - 本PRでTraceability docsを更新しない。
   - 各labelについて、意味、Requirement、Current implementation evidence、representative Formal Test、最終dispositionをRun REPORTへ記録する。
   - PR #78 merge前のTraceability同期は、このcoverage-remediation PRがmergeされた後にPR #78側で行う。

### 実行タスク

- [ ] 1. 実装開始時に`origin/main`をfetchし、`3022a74b...`以降にmainが進んでいればsemantic impactを確認する。必要なら最新mainを取り込んでからCurrent evidenceを再監査する。
- [ ] 2. Current repository rules（`AGENTS.md`、Run Artifact contract、test conventions）を再読し、この実装用Run Artifactを開始する。
- [ ] 3. `FR-PR-055`、`DexieCategoryRepository.createAtEnd()`、既存Category integration testを再監査する。
- [ ] 4. Categoryの末尾追加について0件時`10`・既存時`max+10`の両境界が代表Formal evidenceとして不足していれば、既存integration suiteへ最小assertionを追加する。
- [ ] 5. `FR-PR-055`の「最大値取得と作成を同一Transaction」について、既存Dexie integration seamでatomicity / transaction boundaryをbehaviorとして保証できる最小Testを特定して追加する。
  - test-only production hookや新しいfailure-injection frameworkが必要なら追加せずSTOPする。
  - 単にsource textを検査して`transaction()`が存在することをassertするTestは禁止する。
- [ ] 6. `FR-AR-003`、`OrderDetailDto`、`DexieOrderRepository.getDetail()`、既存Checkout/Order integration testを再監査する。
- [ ] 7. 既存Order DetailのFormal Testへ、内部fieldがUI DTOへ露出しないnegative assertionを追加する。
  - 少なくともGateway idempotency key相当、raw `version`、内部Actor ID相当を確認する。
  - `orderActionVersion`はUI action contractとして意図されたfieldなので削除・否定しない。
  - whole-object snapshotではなく、Requirementに直接対応する明示的assertionを優先する。
- [ ] 8. `CT-DB-KEY-001`をCurrent `main`でread-only再監査し、PR #84後のProduct code / SKU normalization・normalized uniquenessと代表Formal Testを記録する。
- [ ] 9. `CP-FORM-001`をCurrent `main`でread-only再監査し、PR #84後のshared input limits・Form/Application validation・Application Errorと代表Formal Testを記録する。
- [ ] 10. `CT-CATEGORY-002` / `CT-BOUNDARY-001`を追加Test後に再監査し、4 labelすべてについて`exact-title` / `suite-level` / 必要最小の既存disposition modelで説明可能か確認する。
- [ ] 11. 4 labelのうち1件でもCurrent evidenceで元のlabel意味全体を説明できなければ`stop`として扱い、PR #78を完了扱いにしない。label意味を縮小して`stop=0`を作らない。
- [ ] 12. focused testを実行する。
- [ ] 13. Required local validation、Sanitizer、scope checkを実行する。
- [ ] 14. Run Artifactへ最終evidence・validation・scopeを同期し、Current Run contractに従ってfinalizeする。
- [ ] 15. coverage-remediation PRを`main`向けに1本だけOPENする。PR本文では2 coverage gapと4-label re-auditの結果を簡潔に記載する。
- [ ] 16. reviewでBlocking Findingがなく、exact-head CIが成立した後にmerge可否を判断する。mergeは明示指示があるまで行わない。
- [ ] 17. merge後、PR #78 branchへ最新mainを取り込み、PR #78のTraceability / Run / PR本文をCurrent evidenceへ同期する作業へ移る。

## 6. 検証方法

### Focused validation

変更したTest suiteを直接実行する。

- `tests/integration/admin-master-use-cases.test.ts`
- `tests/integration/checkout-order-use-cases.test.ts`

Current package scripts / Vitest CLIに合わせ、2 suiteを可能なら1回のfocused runで実行する。

### Required local validation

実装時点のCurrent repository rulesを正とし、少なくとも以下を実行する。

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run typecheck`
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:contracts`
- `pnpm run lint`
- `git diff --check`
- Current Codex artifact Sanitizer Write / Check（residual 0）

`test:component`はProduct/Presentationを変更しない想定のため原則必須にしない。ただしCurrent repository rule、実際の変更範囲、または実装時のRequired gateが要求する場合は実行する。

E2E / Nativeをローカルで追加実行することは原則不要。PR-triggered CIのCurrent matrixをSSOTとして確認する。

### 成功判定

- focused testがPASSする。
- Required local validationがPASSする。またはenvironment failureがある場合、Run contractに従って正しく分類し、Test/timeout/CI contractを弱めて通さない。
- `git diff --check` PASS。
- Sanitizer residual 0。
- Product/source変更0を原則とする。
- workflow/package/config/validator/DB/Curriculum/Training/PR #78 docsの変更0。
- 4-label再監査で意味の縮小なしに`stop=0`を説明できる。
- PR作成時のchanged filesがPlan/Test/Run Artifactの想定範囲に収まる。

## 7. リスクと未解決論点

### Risks

1. **CT-CATEGORY-002を「transactionがsourceに書いてある」だけでTest済みにしてしまう**
   - 対策: source-text assertionは禁止。Current integration seamでRequirementに対するbehavioral evidenceを作れるかを先に監査する。

2. **atomicityを証明するためにproductionへtest hookを追加する**
   - 対策: coverage-only scopeを優先。専用hook / failure injection framework /Repository API変更が必要ならSTOPし、implementation/testability gapとして別判断する。

3. **FR-AR-003のraw Repository Versionと`orderActionVersion`を混同する**
   - 対策: `orderActionVersion`はUI action concurrency用の公開contractとして維持し、raw `version` fieldそのものがDTOへ露出しないことをnegative assertionする。

4. **4-label再監査時にlabel意味を縮めてstopを回避する**
   - 対策: `requirements_traceability.md`のCurrent label文言を固定入力とし、その意味全体に対する代表evidenceを判定する。

5. **PR #78を同時編集してscopeを混在させる**
   - 対策: coverage PR mergeまではPR #78関連fileを禁止scopeとする。

### STOP conditions

以下の場合は実装範囲を広げずSTOPして報告する。

- Current `DexieCategoryRepository.createAtEnd()`が`FR-PR-055`と実際には矛盾している。
- Category transaction-side Requirementを既存Test seamで保証できず、Product source / test hook / framework追加が必要になる。
- Current Order DTOに`FR-AR-003`で禁止されたprivate/internal fieldが実際に露出している。
- `CT-DB-KEY-001`または`CP-FORM-001`がPR #84 merge後も元のlabel意味全体を説明できない。
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
4. PR #78の古いRun state / validation state / PR本文をCurrent repository contractとCurrent evidenceへ同期する。
5. PR #78全体を再レビューし、Required validation → validated head → Run finalization → finalization-head CI / mergeability確認の順で完了させる。
6. PR #78 merge後にIssue #72のPR 2を完了扱いにし、PR 3へ進む。

## 10. 備考

- このPlanはcoverage-remediationを**1 PR**で完結させる前提である。`CT-CATEGORY-002`と`CT-BOUNDARY-001`を別PRへ分割しない。
- 本Plan作成時点では実装、Test変更、Run Artifact作成、PR作成は行わない。
- 「Formal coverageを増やすこと」自体が目的ではない。PR #78のlower TraceabilityがCurrent RequirementとCurrent Formal Suiteを正確に結べる最小evidenceを作ることが目的である。
