# PR 2 — Formal Test Strategy / Perspective / Traceability 実装計画

## 0. 依頼概要

- 対象: Master Plan の PR 2「Formal Test Strategy / Perspective / Traceability」。
- 目的: Current executable contract / workflow / ADR を正本として、Formal Test Strategy と Traceability を最小変更で整理する。
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Progress tracker: Issue #72
- Baseline: `main` commit `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`（PR #75 merge commit）
- Branch: `docs/formal-test-strategy-traceability`

PR 2では Product behavior、Test Suite、CI Gateを変更しない。DocumentationをCurrent repository contractへ合わせる。

## 1. ゴール / 完了境界

次の2文書だけを実装修正し、Master PlanのRA-G1 / RA-G3 / RA-G6を解消する。

1. `docs/08_testing/test_strategy.md`
2. `docs/12_quality/requirements_traceability.md`

完了時に次を満たす。

- Test Level / Test Type、Test Perspective、Execution / Platform / CI Gateを別軸として読める。
- Formal RegressionとTraining Testを同じcoverage分類として扱わない。
- Requirement Group / ACからCurrentのrepresentative verificationを辿れる。Currentにautomationがある箇所は既存code / suiteへ直接辿れる。
- WE-CORE 12からCurrent representative E2E codeを直接辿れる。
- 現在の下位Traceability代表label全件について、Current codeへの対応可否が未判定のまま残らない。
- Risk → Representative Requirement / AC → applicable Technique / Perspective → Primary Test Level → Representative Formal Test / suite → CI Gateを辿れる。
- Web / Android / iOSのCurrent guaranteeを正確に説明できる。
- 第三のTraceability SSOT、Risk Registry、permanent Test Inventoryを追加していない。
- Test title / test file / workflow / Playwright project / Product codeを変更していない。

## 2. Fixed decisions

実装時に再判断しない決定をここで固定する。

### 2.1 Writable scope

実装時に変更してよいのは次だけ。

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- 新しいPR 2 implementation Run Artifact

次はread-onlyとする。

- `docs/08_testing/e2e_design.md`
- `docs/12_quality/acceptance_criteria.md`
- `package.json`
- `playwright.config.ts`
- `playwright.training.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/cross-browser-smoke.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `docs/adr/0011-native-ci-ios-build-only-gate.md`
- `e2e/web/**`
- `tests/**`
- `training/playwright/**`
- `training/maestro/**`
- validator / scripts
- Product source
- Master Plan
- Curriculum

`e2e_design.md`、contract test、validator等を変更しないと完了できない場合は、その場でscope追加せずStop conditionとする。

### 2.2 Traceability SSOTと3層の責務

- Requirement / AC → representative verificationは`docs/12_quality/requirements_traceability.md`を正本とする。
- Risk / Requirement・AC / technique / perspective / level / suite / gateは`docs/08_testing/test_strategy.md`を正本とする。
- 第三のTraceability fileは作らない。
- 全Requirement × 全Test declarationの1:1巨大Matrixは作らない。

`requirements_traceability.md`では、次の3層をそれぞれ閉じる。

1. Functional / Non-functional Requirement Group → representative Current verification
2. WE-CORE 12 Mapping → representative E2E code
3. 下位Traceability代表label → representative lower-level code / suite

### 2.3 Phase 1 Risk

- Current `test_strategy.md`のPhase 1重要Risk 16件をそのまま使う。
- 1 Risk = 1 rowとし、group化しない。
- PR 2では新しいStable Risk IDを導入しない。
- 現在の番号 / Risk文言を行の識別に使う。

### 2.4 Risk mapping contract

Risk mappingは次の7列で固定する。

| Risk / Risk label | Representative Requirement / AC | Representative Technique | Representative Perspective | Primary Test Level | Representative Formal Test / suite | CI Gate |
|---|---|---|---|---|---|---|

ルール:

- `Representative Requirement / AC`は必須。RiskとRequirement / ACを接続しない表は作らない。
- Requirement全件を列挙せず、代表Requirement Group / ACまたは必要最小限のRequirement IDを記載する。
- `Representative Technique`と`Representative Perspective`を同じ列へ混ぜない。
- Techniqueは認知されたTest Design Techniqueを使う。例: Equivalence Partitioning、Boundary Value Analysis、Decision Table、State Transition、Scenario / Use-case Testing。
- Tool名、runner名、Perspective名をTechniqueとして代用しない。
- Perspectiveは「何を見るか」、Techniqueは「どう設計するか」、Levelは「どの層で検証するか」として分ける。
- `Representative Technique`はCurrent risk / requirement / test intentから具体的なTechniqueを説明できる場合に記載する。特定Techniqueが主ではないRiskでは`—`または`Not primary`を許容し、表を埋めるためだけにTechniqueを発明しない。
- `Representative Perspective`はCurrent risk / test intentに基づく意味のある分類を記載する。
- Primary Test Levelは原則1つ。
- `Representative Formal Test / suite`は、Currentのstableなsuite / package command / Playwright project等、Riskを代表して検証する実行単位を記載する。exact test titleをRisk表へ大量複製せず、個別code referenceは`requirements_traceability.md`側を優先する。
- `CI Gate`は、そのRepresentative suiteを実際に実行する、またはRequired dependencyとして直接要求する最も近いworkflow job / matrix legを記載する。より具体的なjob / legが存在するのに最終aggregateの`verify` / `validate`だけを全Riskへ機械的に記載しない。
- supporting suiteが本当に必要な場合だけ短く補足する。
- Techniqueを設定できないことだけをStop理由にしない。Risk → Requirement / AC、Representative Formal Test / suite、CI Gateを合理的に接続できない場合、またはRA-G3全体としてTechnique / Perspectiveとの関係をCurrent evidenceから説明できない場合はStopする。
- 16 Riskを全Testへ展開しない。

### 2.5 Requirement Group → representative verification contract

`requirements_traceability.md`の既存Functional Requirement Group MatrixとNon-functional Groupの**全既存行**へ、Currentの検証方法を辿れる`Representative Verification`を追加する。

ルール:

- Functional Requirement GroupはCurrent executable regressionが存在する場合、原則repository-relative test file / suite referenceへ接続する。
- Non-functional GroupはCurrent contractに応じ、automated test / suite、Benchmark、UI Review、Static Check、Smoke等の**実在するCurrent verification**へ接続する。codeが存在しないverificationを架空のcode referenceへ変換しない。
- Group単位のtraceなのでexact test titleの網羅は必須にしない。
- 1〜数個のrepresentative verificationで十分とし、全test / 全evidenceを列挙しない。
- package command、Playwright project、CI Gateの詳細は`test_strategy.md`側で管理し、この文書へ重複させない。
- 全Groupを確認し、Current verificationを説明できないGroupを無言で残さない。Current evidenceからverificationを確定できず、PR 2内で新Test / 新Gateを作らないと埋められない場合はStopする。

### 2.6 WE-CORE direct code reference contract

- `WE-CORE-001`〜`WE-CORE-012`はRequirement / business-flow **Mapping ID** とする。
- executable test countを表すIDとして扱わない。
- identifier自体はrenameしない。
- representative code referenceは原則次の組合せとする。
  - repository-relative test file path
  - exact test title
- `e2e/web/phase1-required.spec.ts`のCurrent titleと実際に照合して記載する。
- package command / Playwright project / CI GateはWE-CORE表へ重複させず`test_strategy.md`側で管理する。

### 2.7 下位Traceability代表label contract

Plan作成時点のCurrent `requirements_traceability.md`には、§6の代表表18行に加えて、`## 7. 更新Rule`の後ろへ表ヘッダーなしで次の4行が残っており、合計22行の下位代表labelが存在する。

- `CT-BOUNDARY-001`
- `CT-ACTION-VERSION-001`
- `CT-CLOCK-CATALOG-001`
- `CT-ORDER-PRICE-001`

この22行はPlan作成時点のCurrent evidenceであり、固定件数の契約にはしない。実装では**実装開始時点に存在するCurrent下位Traceability代表label全件**を監査し、各行を必ず次のいずれかへDispositionする。

1. `exact-title`
   - repository-relative test file path + exact test title
2. `suite-level`
   - 1つのtest file / suiteが明確に代表する場合に限り、suite-levelと明示してfile referenceを持たせる
3. `stop`
   - Current evidenceからlabelの意味または代表codeを合理的に説明できない

ルール:

- 「確認できた行だけ追加し、残りは未判定のまま残す」は禁止する。
- 現在の`UT-*` / `CT-*` / `CP-*` / `WE-*`等について、「Executable test code自身が保持する正式ID」なのか「Traceability上のrepresentative label」なのかをCurrent evidenceで区別する。
- Test codeにIDが存在しない場合、IDをTest codeへ新規埋込みしない。
- Current `Test ID Rule`と`CT-*` / `CP-*`等の既存labelの意味が矛盾する場合は、既存IDをrenameせずDocumentation上のtaxonomy説明を正す。新しいID制度は設計しない。
- §7の後ろに孤立している4行は、意味を変えず下位代表表へ統合する。

### 2.8 Platform parity

PR 2でいうPlatform parityは、全platformへ同じTest Suiteを揃えることではない。

Current guaranteeを明示することを意味する。

- Web: Current Formal Web / Smoke / relevant CI contract
- Android: Build + Runtime / Maestro
- iOS: Automation / Production-validation Build-only
- iOS Runtime / MaestroはRequired guaranteeではない

新しいcross-platform suite、parity matrix、Runtime Gateは作らない。

### 2.9 Formal / Training boundary

- `playwright.config.ts`はProduct側automation configであり、Formal E2E / Smoke projectsに加えて別責務の`ui-review-*` projectsも含む。configに存在することだけを理由にFormal Regressionへ分類しない。
- `playwright.training.config.ts`はTraining-only Playwright configとする。
- `training-web-baseline`がWeb CI matrixで実行されてもFormal Regression coverageへ昇格しない。
- Training exercise / expected failure / learner evidenceはPR 3 / PR 5の責務であり、本PRでは設計しない。

### 2.10 Implementation delta scope

Plan作成と実装を同一branchで行うため、PR-wide diffとimplementation deltaを分けて扱う。

- Plan-only validation / Sanitizer完了後、**implementation Run作成や実装文書変更を開始する直前**のbranch HEADを`IMPLEMENTATION_BASE_SHA`として取得する。
- `IMPLEMENTATION_BASE_SHA`は新しいimplementation RunのEvidenceへ記録する。
- implementation scope判定は`IMPLEMENTATION_BASE_SHA...HEAD`で行う。
- PR-wide diffにはchild Plan / Plan Run Artifactが含まれてよい。それらをimplementation scope violationとして扱わない。

## 3. Current evidence / implementation preflight

実装開始時にCurrent `main`を再確認する。

**PR 2のTest分類、Traceability、Gate、platform guaranteeへ影響するsemantic contractが変わっていた場合だけStopする。**

無関係なscript追加、comment変更、PR 2判断へ影響しない変更だけでStopしない。Current evidenceを更新して続行する。

### 3.1 Entrypoint-first execution contract

全test directoryの網羅Inventoryは作らない。最初に次だけでCurrent execution contractを確定する。

1. `package.json`
2. `playwright.config.ts`
3. `playwright.training.config.ts`
4. `.github/workflows/ci.yml`
5. `.github/workflows/cross-browser-smoke.yml`
6. `.github/workflows/native-ci.yml`
7. `.github/workflows/native-ios-ci.yml`
8. `docs/adr/0011-native-ci-ios-build-only-gate.md`

確認する属性:

- Formal / Training
- Test Level / Type
- runner / project / suite
- trigger
- platform
- Required Gate / supporting evidence

Test fileは、Risk mappingまたはRequirement verification / direct referenceで実際に参照するものだけ開く。

### 3.2 Current Traceability

`docs/12_quality/requirements_traceability.md`で最低限確認する。

- Functional Requirement Group Matrixの全既存行
- Non-functional Groupの全既存行
- `Test ID Rule`
- `WE-CORE-001`〜`012`
- §6の下位代表label 18行
- §7の後ろに孤立している4行
- `CT-*` / `CP-*`等がCurrent `Test ID Rule`に明記されていない現状

確認結果はimplementation Run Evidenceへ記録し、推測でtaxonomyを補完しない。

## 4. Implementation steps

### Step 1 — implementation Run / preflight

- Plan-only validation / Sanitizer完了後、implementation変更開始直前のbranch HEADを`IMPLEMENTATION_BASE_SHA`として取得する。
- その後に新しいimplementation Runを作る。Plan Run `20260828-214107-JST`は再利用しない。
- implementation Run Evidenceへ`IMPLEMENTATION_BASE_SHA`を記録する。
- latest `main` / branch / Master Plan / PR #75 merge / Issue #72を確認する。
- §3に従い、PR 2判断へ影響するsemantic contract driftだけをStop判定する。

### Step 2 — entrypoint-first inventory

§3.1の8入口からCurrent execution contractを確定する。

- permanent inventory fileは作らない。
- implementation Run Evidenceとして必要なfactだけ記録する。
- Risk / Requirement verification / direct referenceに必要なtest fileだけ追加確認する。

### Step 3 — RA-G1 pre-audit

`requirements_traceability.md`をCurrent contractと照合する。

#### Requirement Group

- Functional Requirement Group Matrixの全既存行についてrepresentative Current verification候補を確認する。
- Non-functional Groupの全既存行についてrepresentative Current verification候補を確認する。
- FunctionalはCurrent executable regressionがある場合にfile / suiteへ接続する。
- Non-functionalはCurrent contractに応じ、automated suite / Benchmark / UI Review / Static Check / Smoke等の実在するverificationを使う。
- group-levelなのでexact titleや全Evidenceの網羅はしない。
- Current verificationが存在しない、またはCurrent evidenceから確定できないGroupを推測で埋めない。

#### WE-CORE

- 12 Mapping IDとCurrent `phase1-required.spec.ts`の先頭12 Flowを照合する。
- 各Mappingに`file path + exact title`を設定できることを確認する。
- 実行test件数とは分離する。

#### 下位代表label

- 実装開始時点のCurrent下位Traceability代表label全件を監査する。Plan作成時点では22行であることをEvidenceとして扱い、固定件数とはしない。
- 各行を`exact-title` / `suite-level` / `stop`のいずれかへDispositionする。
- label taxonomyとCurrent Test Levelの対応を確認する。
- Current `Test ID Rule`が実態を説明できていなければ、既存labelを変えずtaxonomy説明を補正する。
- IDをtest codeへ追加しない。

### Step 4 — `test_strategy.md`の3軸分離

以下を独立したセクション / 表にする。

#### A. Test Level / Test Type

Current evidenceに存在する分類だけを書く。最低限:

- Unit
- Application Integration
- Repository Contract
- Component
- Static / Operational Contract
- Web E2E
- Native Component / Repository / Android Runtime E2E
- Deployed / Production Smoke

Accessibility / Responsive / Role / State / Boundary / Failure / UI ReviewをLevelとして追加しない。

#### B. Test Perspective

代表Perspectiveとして最低限:

- Accessibility
- Responsive / Mobile Web
- Role / Ownership
- State / Lifecycle
- Boundary
- Failure / Recovery

Current Risk / testで説明できる場合のみ:

- Data / Persistence consistency
- Security / Authorization
- UX / Visual acceptance

#### C. Execution / Platform / CI Gate

Current workflowに存在するものだけを書く。最低限:

- Web PR / main / schedule / manual
- `e2e-chromium` matrix
- UI Review
- Production Smoke
- Preview Deployed Smoke
- non-PR Extended E2E
- weekly / manual Cross-browser Smoke
- Native PR conditional
- Native manual
- Android Build + Runtime / Maestro
- iOS Build-only reusable gate
- Formal / Training boundary

workflowで同時に走ることと同じcoverage分類であることを分離する。

### Step 5 — Risk mapping（RA-G3 / RA-G6）

Current Phase 1重要Risk 16件を、順序・文言を維持して16行で作る。

各行は§2.4の7列を持つ。`Representative Technique`は適用可能な場合だけ具体値を記載し、特定Techniqueが主ではないRiskでは`—`または`Not primary`を使う。

- Risk / Risk label
- Representative Requirement / AC
- Representative Technique
- Representative Perspective
- Primary Test Level
- Representative Formal Test / suite
- CI Gate

追加ルール:

- Formal Test / suiteはstableなsuite / package command / Playwright project等の代表実行単位に留め、exact test titleをRisk表へ大量複製しない。
- CI GateはRepresentative suiteを実行・要求する最も近いworkflow job / matrix legを記載する。
- より具体的なjob / legがある場合、最終aggregateの`verify` / `validate`だけで全Riskを埋めない。
- 16 Riskをgroup化しない。Requirement / AC詳細全件を二重化しない。

### Step 6 — `requirements_traceability.md`修正（RA-G1）

#### Requirement Group

- Functional Requirement Group Matrixの全既存行へ`Representative Verification`を追加する。
- Non-functional Groupの全既存行へ`Representative Verification`を追加する。
- FunctionalはCurrent executable regressionが存在する場合、代表file / suiteへ接続する。
- Non-functionalはCurrent contractに応じ、automated suite / Benchmark / UI Review / Static Check / Smoke等の実在するCurrent verificationへ接続する。
- codeが存在しないverificationへ架空のcode referenceを追加しない。
- 代表verificationをboundedに記載し、全Test / 全Evidence一覧へ展開しない。

#### WE-CORE

- WE-CORE表の列名を役割が分かる名前へ修正する。`Mapping ID`を第一候補とする。
- WE-CORE 12へverified `file + exact title` referenceを追加する。

#### 下位代表label

- 実装開始時点のCurrent下位Traceability代表label全件をDisposition済みにする。
- `exact-title`または`suite-level`の行にはverified code referenceを記載する。
- `stop`が1行でも残る場合はPR 2 completionへ進まずPlanを見直す。
- §7の後ろに孤立している4行を既存下位代表表へ統合する。
- `Test ID Rule`が下位代表labelの実態を説明していない場合は、既存IDをrenameせずtaxonomy / labelの意味が一意になるようDocumentationを整理する。

package command / project / CI Gateの詳細はこの文書へ重複させず`test_strategy.md`で管理する。

### Step 7 — PR 1 follow-up verification

実装後に確認する。

- RA-M1: WE-CORE 12 mapping / required command / PR matrix Gateを混同していない。
- RA-M2: Cross-roleをPR Gate外に戻していない。
- RA-M3: Formal E2E / Smoke projectと`ui-review-*`を混同していない。
- RA-M5: Nativeをfuture扱いしていない。
- RA-M6 / CUR-M9: iOS manual triggerとNative-change Build-only Required Gateを区別し、iOS Runtime保証を追加していない。

### Step 8 — bounded self-review

- `IMPLEMENTATION_BASE_SHA...HEAD`の変更は2文書 + active implementation Runだけか。
- PR-wide diffにchild Plan / Plan Runが含まれることをimplementation scope violationとして誤判定していないか。
- Requirement Group / WE-CORE / Current下位Traceability代表label全件の3層がすべて閉じているか。
- Requirement GroupをCurrent verificationへ接続しており、codeがない箇所へ架空のreferenceを作っていないか。
- Risk 16行が7列schemaを維持し、Techniqueが適用できない行で無理に値を発明していないか。
- Formal Test / suiteとCI Gateを最も近い実行単位で記載し、`verify` / `validate`だけへ潰していないか。
- Technique / Perspective / Level / Gateを混同していないか。
- Formal / Training、Android / iOS guaranteeを混同していないか。
- PR 3以降のCompetency / Curriculum / learner evidenceへ踏み込んでいないか。

## 5. Validation

### 5.1 Required local validation

必須:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- `git diff --check`

Curriculumは変更禁止なので`validate:curriculum`はPR 2のrequired validationに含めない。

TypeScript / validator / test変更も禁止なので`typecheck`はPR 2のrequired validationに含めない。

これらの変更が必要になった場合はValidationを増やして続行せずStopしてPlanを見直す。

### 5.2 Current SSOT cross-check

#### Strategy

- Level / Perspective / Execution・Platform・Gateが別軸になっている。
- TechniqueとPerspectiveが別列である。
- Formal / Trainingを混同していない。
- `playwright.config.ts`内のFormal E2E / Smokeと`ui-review-*`を、config単位ではなくproject責務で区別している。
- Web / Android / iOSのCurrent asymmetric guaranteeを正確に説明している。
- Currentにないproject / job / command / guaranteeを書いていない。

#### Risk

- 16 Riskすべてが1行ずつ存在する。
- 各RiskにRepresentative Requirement / ACと意味のあるRepresentative Perspectiveがある。
- Representative TechniqueはCurrent evidenceから適用可能な場合だけ具体値を持ち、該当しない場合は`—`または`Not primary`である。
- Representative Formal Test / suiteがstableな代表実行単位であり、exact titleの大量複製になっていない。
- CI GateがRepresentative suiteに最も近いCurrent workflow job / matrix legを指している。
- より具体的なjob / legが存在するRiskを`verify` / `validate`だけで一律に埋めていない。
- Requirement / AC → applicable technique / perspective → level → suite → gateを辿れる。
- Techniqueの非適用だけを理由にRisk mappingを未完了扱いしていない。
- 新Risk ID / groupを作っていない。

#### Traceability

- Functional Requirement Group Matrixの全既存行からrepresentative Current verificationへ辿れる。
- Non-functional Groupの全既存行からrepresentative Current verificationへ辿れる。
- Current automationがあるGroupは既存file / suiteへ接続され、automationがないCurrent verificationへ架空のcode referenceを作っていない。
- WE-CORE 12はMapping IDでありexecutable countではない。
- 各WE-CORE referenceがCurrent file / exact titleに実在する。
- 実装開始時点のCurrent下位Traceability代表label全件がDisposition済みで、未判定行がない。
- Plan作成時点の22行という件数を永続的な契約として扱っていない。
- `exact-title` / `suite-level`のreferenceはCurrent codeで確認済み。
- §7の後ろに孤立した4行が残っていない。
- `CT-*` / `CP-*`等のtaxonomy説明が表の実態と矛盾しない。
- IDをtest codeへ新規埋込みしていない。

### 5.3 Bounded regression search

検索failureの対象は今回変更する2文書だけに限定する。

次の誤記を再導入していないことを確認する。

- WE-CORE 12 = executable test count
- Cross-role = PR Gate外
- iOS = manual only
- Native = future / unsupported
- Training = Formal Regression coverage
- `ui-review-*` = Formal E2E inventory
- Currentに存在しないproject / command / workflow job

Repository-wide historical zero-matchは要求しない。

### 5.4 Scope check

implementation scopeはPR-wide diffではなく、Step 1で記録した`IMPLEMENTATION_BASE_SHA...HEAD`で確認する。

このimplementation deltaが原則次だけであることを確認する。

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- active implementation Run Artifact

それ以外へimplementation開始後の差分がある場合はscope violationとして停止する。

PR-wide diffには、implementation開始前から存在する次のPlan差分が含まれてよい。

- `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md`
- Plan Run `20260828-214107-JST` Artifact

これらを理由にimplementation scope violationと判定しない。

## 6. Stop conditions

次の場合は実装を止め、child Planを見直す。

- implementation開始時に、PR 2のTest分類 / Traceability / Gate / platform guaranteeへ影響するsemantic contractが本Planの前提から変わっている。
- `e2e_design.md`変更が必要になる。
- contract test / validator / test code変更が必要になる。
- Product / workflow / package / Playwright config変更が必要になる。
- Curriculum / Training behavior変更が必要になる。
- RA-G1解消のためTest codeへIDを追加する必要がある。
- Functional / Non-functional Requirement GroupのいずれかでCurrent verificationをCurrent evidenceから説明できず、新Test / 新Gateを追加しないとTraceabilityを成立させられない。
- 実装開始時点のCurrent下位Traceability代表labelのいずれかが`stop`になり、Current evidenceだけでは解消できない。
- `CT-*` / `CP-*`等の現行label taxonomyをCurrent evidenceから説明できず、新ID制度設計が必要になる。
- RA-G3のRiskをRepresentative Requirement / AC、Representative Formal Test / suite、CI Gateへ合理的に接続できない、またはRA-G3全体としてTechnique / Perspectiveとの関係をCurrent evidenceから説明できない。
- RA-G3解消に新しいRisk Registry / Traceability SSOTが必要になる。
- RA-G6解消にCI Gate / Native guarantee自体の変更が必要になる。
- PR 3 / PR 4 / PR 5のPrimary owner領域へ踏み込む必要がある。

## 7. Definition of Done

次をすべて満たしたらPR 2 implementation完了。

- `IMPLEMENTATION_BASE_SHA`がimplementation Run Evidenceに記録され、implementation deltaのscopeを再現できる。
- `IMPLEMENTATION_BASE_SHA...HEAD`のwritable scopeが2文書 + implementation Runに限定されている。
- `test_strategy.md`で3軸を別々に読める。
- Phase 1 Risk 16件が1 Risk = 1 rowで追跡できる。
- 各RiskのTechniqueとPerspectiveが別列で、Technique非適用時に推測の値を発明していない。
- 各RiskからRepresentative Requirement / ACを経由してFormal suite / Gateまで辿れる。
- 各RiskのFormal Test / suiteとCI GateがCurrentの最も近い代表実行単位を示し、aggregate gateだけへ情報を潰していない。
- Functional / Non-functional Requirement Groupの全既存行からrepresentative Current verificationへ辿れる。
- Current automationがないverificationへ架空のcode referenceを追加していない。
- WE-CORE 12からCurrent exact E2Eへ辿れる。
- 実装開始時点のCurrent下位Traceability代表label全件が`exact-title`または`suite-level`としてCurrent codeへ接続され、未判定 / `stop`が残っていない。
- §7の後ろに孤立した下位代表4行が残っていない。
- WE-COREをexecutable test countとして扱っていない。
- Current Test ID / Mapping label taxonomyの説明が文書内で自己矛盾していない。
- Formal / Trainingを混同していない。
- `playwright.config.ts`に存在することだけを理由に`ui-review-*`をFormal Regressionへ分類していない。
- Android Runtime / iOS Build-onlyを混同していない。
- 新Risk ID、第三のTraceability SSOT、permanent inventoryを追加していない。
- Test code / workflow / validator / Product / Curriculumを変更していない。
- Required validationがPASSしている。
- RA-G1 / RA-G3 / RA-G6の対応を差分で説明できる。
- RA-M1 / M2 / M3 / M5 / M6 / CUR-M9にregressionがない。

## 8. Follow-up

- PR 2 merge後、最新`main`からPR 3を開始する。
- PR 3はCompetency / Assessment Contractを担当し、本PRのTest Level / Perspective / Gate契約を前提として使う。
- PR 4はCurriculum remediationを担当する。
- PR 5はTraining learner exercise / artifact / evidenceを担当する。
- Phase 6はMaster PlanどおりPR 2 merge後から並行調査可能。
