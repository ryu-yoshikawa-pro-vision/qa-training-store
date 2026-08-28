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
- Requirement Group / ACからrepresentative regression codeを直接辿れる。
- WE-CORE 12からCurrent representative E2E codeを直接辿れる。
- 現在の下位Traceability代表label全件について、Current codeへの対応可否が未判定のまま残らない。
- Risk → Representative Requirement / AC → Representative Technique → Representative Perspective → Primary Test Level → Representative Formal Test / suite → CI Gateを辿れる。
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

- Requirement / AC → representative regressionは`docs/12_quality/requirements_traceability.md`を正本とする。
- Risk / Requirement・AC / technique / perspective / level / suite / gateは`docs/08_testing/test_strategy.md`を正本とする。
- 第三のTraceability fileは作らない。
- 全Requirement × 全Test declarationの1:1巨大Matrixは作らない。

`requirements_traceability.md`では、次の3層をそれぞれ閉じる。

1. Functional / Non-functional Requirement Group → representative regression
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
- Primary Test Levelは原則1つ。
- supporting suiteが本当に必要な場合だけ短く補足する。
- Current risk / requirement / test intentからTechniqueを合理的に説明できない場合は推測で発明せずStopする。
- 16 Riskを全Testへ展開しない。

### 2.5 Requirement Group → representative regression contract

`requirements_traceability.md`の既存Functional Requirement Group MatrixとNon-functional Groupの**全既存行**へ、Current codeへ直接辿れる`Representative Regression`を追加する。

ルール:

- Group単位のtraceなので、原則repository-relative test file / suite referenceを使う。
- Groupが広いためexact test titleの列挙は必須にしない。
- 1〜数個のrepresentative regressionで十分とし、全testを列挙しない。
- command、Playwright project、CI Gateはここへ重複させず`test_strategy.md`側で管理する。
- Current codeで代表先を説明できないGroupを無言で残さない。重要Groupで代表先を確定できない場合はStopする。

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

Current `requirements_traceability.md`には、§6の代表表18行に加えて、`## 7. 更新Rule`の後ろへ表ヘッダーなしで次の4行が残っており、合計22行の下位代表labelが存在する。

- `CT-BOUNDARY-001`
- `CT-ACTION-VERSION-001`
- `CT-CLOCK-CATALOG-001`
- `CT-ORDER-PRICE-001`

実装では**22行すべて**を監査し、各行を必ず次のいずれかへDispositionする。

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

- `playwright.config.ts`はFormal側。
- `playwright.training.config.ts`はTraining側。
- `training-web-baseline`がWeb CI matrixで実行されてもFormal Regression coverageへ昇格しない。
- Training exercise / expected failure / learner evidenceはPR 3 / PR 5の責務であり、本PRでは設計しない。

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

Test fileは、Risk mappingまたはRequirement direct referenceで実際に参照するものだけ開く。

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

- 新しいimplementation Runを作る。Plan Run `20260828-214107-JST`は再利用しない。
- latest `main` / branch / Master Plan / PR #75 merge / Issue #72を確認する。
- §3に従い、PR 2判断へ影響するsemantic contract driftだけをStop判定する。

### Step 2 — entrypoint-first inventory

§3.1の8入口からCurrent execution contractを確定する。

- permanent inventory fileは作らない。
- implementation Run Evidenceとして必要なfactだけ記録する。
- Risk / direct referenceに必要なtest fileだけ追加確認する。

### Step 3 — RA-G1 pre-audit

`requirements_traceability.md`をCurrent codeと照合する。

#### Requirement Group

- Functional Requirement Group Matrixの全既存行についてrepresentative regression候補を確認する。
- Non-functional Groupの全既存行についてrepresentative regression候補を確認する。
- group-levelなのでexact titleの網羅はしない。

#### WE-CORE

- 12 Mapping IDとCurrent `phase1-required.spec.ts`の先頭12 Flowを照合する。
- 各Mappingに`file path + exact title`を設定できることを確認する。
- 実行test件数とは分離する。

#### 下位代表label

- 現在の22行すべてを監査する。
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

各行は§2.4の7列をすべて持つ。

- Risk / Risk label
- Representative Requirement / AC
- Representative Technique
- Representative Perspective
- Primary Test Level
- Representative Formal Test / suite
- CI Gate

16 Riskをgroup化しない。Requirement / AC詳細全件を二重化しない。

### Step 6 — `requirements_traceability.md`修正（RA-G1）

#### Requirement Group

- Functional Requirement Group Matrixの全既存行へ`Representative Regression`を追加する。
- Non-functional Groupの全既存行へ`Representative Regression`を追加する。
- 代表file / suiteをboundedに記載し、全Test一覧へ展開しない。

#### WE-CORE

- WE-CORE表の列名を役割が分かる名前へ修正する。`Mapping ID`を第一候補とする。
- WE-CORE 12へverified `file + exact title` referenceを追加する。

#### 下位代表label

- 22行すべてをDisposition済みにする。
- `exact-title`または`suite-level`の行にはverified code referenceを記載する。
- `stop`が1行でも残る場合はPR 2 completionへ進まずPlanを見直す。
- §7の後ろに孤立している4行を既存下位代表表へ統合する。
- `Test ID Rule`が下位代表labelの実態を説明していない場合は、既存IDをrenameせずtaxonomy / labelの意味が一意になるようDocumentationを整理する。

command / project / CI Gateはこの文書へ重複させず`test_strategy.md`で管理する。

### Step 7 — PR 1 follow-up verification

実装後に確認する。

- RA-M1: WE-CORE 12 mapping / required command / PR matrix Gateを混同していない。
- RA-M2: Cross-roleをPR Gate外に戻していない。
- RA-M3: Formal E2E / Smoke projectと`ui-review-*`を混同していない。
- RA-M5: Nativeをfuture扱いしていない。
- RA-M6 / CUR-M9: iOS manual triggerとNative-change Build-only Required Gateを区別し、iOS Runtime保証を追加していない。

### Step 8 — bounded self-review

- 変更は2文書 + implementation Runだけか。
- Requirement Group / WE-CORE / 下位22行の3層がすべて閉じているか。
- Risk 16行の7列が欠けていないか。
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
- Web / Android / iOSのCurrent asymmetric guaranteeを正確に説明している。
- Currentにないproject / job / command / guaranteeを書いていない。

#### Risk

- 16 Riskすべてが1行ずつ存在する。
- 各RiskにRepresentative Requirement / AC、Technique、Perspectiveがある。
- Requirement / AC → technique → perspective → level → suite → gateを辿れる。
- 新Risk ID / groupを作っていない。

#### Traceability

- Functional Requirement Group Matrixの全既存行からrepresentative regressionへ辿れる。
- Non-functional Groupの全既存行からrepresentative regressionへ辿れる。
- WE-CORE 12はMapping IDでありexecutable countではない。
- 各WE-CORE referenceがCurrent file / exact titleに実在する。
- 下位代表label 22行すべてがDisposition済みで、未判定行がない。
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

最終diffが原則次だけであることを確認する。

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- active implementation Run Artifact

それ以外へ差分がある場合はscope violationとして停止する。

## 6. Stop conditions

次の場合は実装を止め、child Planを見直す。

- implementation開始時に、PR 2のTest分類 / Traceability / Gate / platform guaranteeへ影響するsemantic contractが本Planの前提から変わっている。
- `e2e_design.md`変更が必要になる。
- contract test / validator / test code変更が必要になる。
- Product / workflow / package / Playwright config変更が必要になる。
- Curriculum / Training behavior変更が必要になる。
- RA-G1解消のためTest codeへIDを追加する必要がある。
- Functional / Non-functional Requirement Groupの重要行でrepresentative regressionをCurrent evidenceから説明できない。
- 下位22行のいずれかが`stop`になり、Current evidenceだけでは解消できない。
- `CT-*` / `CP-*`等の現行label taxonomyをCurrent evidenceから説明できず、新ID制度設計が必要になる。
- RA-G3のRiskでRepresentative Techniqueを合理的に説明できず、推測が必要になる。
- RA-G3解消に新しいRisk Registry / Traceability SSOTが必要になる。
- RA-G6解消にCI Gate / Native guarantee自体の変更が必要になる。
- PR 3 / PR 4 / PR 5のPrimary owner領域へ踏み込む必要がある。

## 7. Definition of Done

次をすべて満たしたらPR 2 implementation完了。

- writable scopeが2文書 + implementation Runに限定されている。
- `test_strategy.md`で3軸を別々に読める。
- Phase 1 Risk 16件が1 Risk = 1 rowで追跡できる。
- 各RiskのTechniqueとPerspectiveが分離されている。
- 各RiskからRepresentative Requirement / ACを経由してFormal suite / Gateまで辿れる。
- Functional / Non-functional Requirement Groupの全既存行からrepresentative regressionへ辿れる。
- WE-CORE 12からCurrent exact E2Eへ辿れる。
- 下位代表label 22行すべてが`exact-title`または`suite-level`としてCurrent codeへ接続され、未判定 / `stop`が残っていない。
- §7の後ろに孤立した下位代表4行が残っていない。
- WE-COREをexecutable test countとして扱っていない。
- Current Test ID / Mapping label taxonomyの説明が文書内で自己矛盾していない。
- Formal / Trainingを混同していない。
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
