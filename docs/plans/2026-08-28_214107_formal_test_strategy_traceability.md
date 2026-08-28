# PR 2 — Formal Test Strategy / Perspective / Traceability 実装計画

## 0. 依頼概要

- 対象: Master Plan の PR 2「Formal Test Strategy / Perspective / Traceability」。
- 目的: Current executable contract / workflow / ADR を正本として、Formal Test Strategy と Traceability を最小変更で整理する。
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Progress tracker: Issue #72
- Baseline: `main` commit `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`（PR #75 merge commit）
- Branch: `docs/formal-test-strategy-traceability`

PR 2では Product / Test Suite / CI Gate を変更しない。Documentation を Current repository contract に合わせる。

## 1. ゴール

次の2文書だけを実装修正し、Master Plan の RA-G1 / RA-G3 / RA-G6 を解消する。

1. `docs/08_testing/test_strategy.md`
2. `docs/12_quality/requirements_traceability.md`

完了時に次を満たす。

- Test Level / Test Type、Test Perspective、Execution / Platform / CI Gate を別軸として読める。
- Formal Regression と Training Test を同じ coverage 分類として扱わない。
- Requirement / AC → representative regression code を直接辿れる。
- Risk → Representative Requirement / AC → technique / perspective → Primary Test Level → Representative Formal Test / suite → CI Gate を辿れる。
- Web / Android / iOS の Current guarantee を正確に説明できる。
- 第三の Traceability SSOT、Risk Registry、permanent Test Inventory を追加していない。
- Test title / file / workflow / Playwright project / Product codeを変更していない。

## 2. Fixed decisions

実装時に再判断しない決定をここで固定する。

### 2.1 Writable scope

実装時に変更してよいのは次だけ。

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- 新しい PR 2 implementation Run Artifact

次は read-only とする。

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

`e2e_design.md`、contract test、validator等を変更しないと完了できない場合は、その場で追加せず Stop condition とする。

### 2.2 Traceability SSOT

- Requirement / AC → representative regression は `docs/12_quality/requirements_traceability.md` を正本とする。
- Risk / Requirement・AC / technique・perspective / level / suite / gate は `docs/08_testing/test_strategy.md` を正本とする。
- 第三の Traceability file は作らない。
- 全Requirement × 全Test declarationの1:1巨大Matrixは作らない。

### 2.3 Phase 1 Risk

- Current `test_strategy.md` の Phase 1重要Risk 16件をそのまま使う。
- 1 Risk = 1 row とし、group化しない。
- PR 2では新しい Stable Risk ID を導入しない。
- 現在の番号 / Risk文言を行の識別に使う。

### 2.4 Risk mapping contract

Risk mappingは次の6列で固定する。

| Risk / Risk label | Representative Requirement / AC | Representative technique / perspective | Primary Test Level | Representative Formal Test / suite | CI Gate |
|---|---|---|---|---|---|

- `Representative Requirement / AC` は必須。RiskとRequirement / ACを接続しない表は作らない。
- Requirement全件を列挙せず、代表Requirement Group / ACまたは必要最小限のRequirement IDを記載する。
- Primary Test Levelは原則1つ。
- supporting suiteが本当に必要な場合だけ短く補足する。
- Tool名をTechniqueとして書かない。
- 16 Riskを全Testへ展開しない。

### 2.5 Requirement / code reference contract

`requirements_traceability.md` の direct code reference は次で固定する。

#### WE-CORE

- `WE-CORE-001`〜`WE-CORE-012`は Requirement / business-flow **Mapping ID** とする。
- executable test countを表すIDとして扱わない。
- identifier自体はrenameしない。
- representative code referenceは原則:
  - repository-relative test file path
  - exact test title
- `e2e/web/phase1-required.spec.ts`のCurrent titleと実際に照合して記載する。
- package command / Playwright project / CI Gateはこの表へ重複させず、`test_strategy.md`側で管理する。

#### 下位Testの代表行

- 現在の `UT-*` / `CT-*` / `CP-*` / `WE-*` 等のラベルを、実装前にCurrent repository evidenceで分類する。
- 「Executable test code自身が保持する正式ID」なのか「Traceability上のrepresentative label」なのかを区別する。
- Test codeにIDが存在しない場合、IDをTest codeへ新規埋込みしない。
- direct code referenceは原則:
  - repository-relative test file path
  - exact test title
- 1つのexact titleへ一意に落とせないが、1つのtest file / suiteが明確に代表する場合だけ `suite-level` と明示してfile referenceを許容する。
- 代表先をCurrent evidenceから一意に説明できない場合は、架空のreferenceを追加せずStop conditionとする。
- Current `Test ID Rule` と `CT-*` / `CP-*` 等の既存ラベルの意味が矛盾する場合は、Documentation上のtaxonomy説明を正す。新しいID制度は設計しない。

### 2.6 Platform parity

PR 2でいうPlatform parityは、全platformへ同じTest Suiteを揃えることではない。

Current guaranteeを明示することを意味する。

- Web: Current Formal Web / Smoke / relevant CI contract
- Android: Build + Runtime / Maestro
- iOS: Automation / Production-validation Build-only
- iOS Runtime / MaestroはRequired guaranteeではない

新しいcross-platform suite、parity matrix、Runtime Gateは作らない。

### 2.7 Formal / Training boundary

- `playwright.config.ts`はFormal側。
- `playwright.training.config.ts`はTraining側。
- `training-web-baseline`がWeb CI matrixで実行されてもFormal Regression coverageへ昇格しない。
- Training exercise / expected failure / learner evidenceはPR 3 / PR 5の責務であり、本PRでは設計しない。

## 3. Current evidence

実装開始時にCurrent `main`で再確認する。値が変わっていた場合はStopする。

### 3.1 Web / Playwright

Current evidenceとして少なくとも次を確認する。

- `package.json`
  - Unit / Integration / Repository / Component / Contract
  - Web E2E / Accessibility / Mobile Boundary / Cross-role / Smoke
  - Training scripts
- `playwright.config.ts`
  - `chromium`
  - `mobile-chromium`
  - `cross-role-chromium`
  - `deployed-smoke`
  - `firefox-smoke`
  - `webkit-smoke`
  - `ui-review-*`は別責務
- `playwright.training.config.ts`
  - `training-chromium`
  - `training-mobile-chromium`
- `.github/workflows/ci.yml`
  - `e2e-chromium` matrix
  - UI Review
  - Production Smoke
  - Preview Deployed Smoke
  - non-PR Extended E2E
- `.github/workflows/cross-browser-smoke.yml`
  - weekly / manual Firefox・WebKit Smoke

### 3.2 Native

- `.github/workflows/native-ci.yml`
  - Native change detection
  - Android Build / Runtime
  - iOS reusable workflow
- `.github/workflows/native-ios-ci.yml`
  - `workflow_call`
  - `workflow_dispatch`
  - Automation / Production-validation Build
  - `ios-verify`
- `docs/adr/0011-native-ci-ios-build-only-gate.md`
  - Android Build + Runtime
  - iOS Build-only
  - iOS Runtime / Maestro非保証

### 3.3 Current Traceability

`docs/12_quality/requirements_traceability.md`で最低限確認する。

- Requirement Group Matrix
- `Test ID Rule`
- `WE-CORE-001`〜`012`
- 下位Testの代表ラベル
- `CT-*` / `CP-*`等がCurrent `Test ID Rule`に明記されていない現状

この確認結果をimplementation Run Evidenceへ記録し、推測でtaxonomyを補完しない。

## 4. Implementation steps

### Step 1 — implementation preflight

新しいimplementation Runを作る。

確認:

- latest `main`
- branch
- Master Plan
- PR #75 merge
- Issue #72
- Current writable scope

Plan Run `20260828-214107-JST`は再利用しない。

### Step 2 — entrypoint-first inventory

全test directoryの網羅Inventoryは作らない。

最初に次だけでCurrent execution contractを確定する。

1. `package.json`
2. `playwright.config.ts`
3. `playwright.training.config.ts`
4. `.github/workflows/ci.yml`
5. `.github/workflows/cross-browser-smoke.yml`
6. `.github/workflows/native-ci.yml`
7. `.github/workflows/native-ios-ci.yml`
8. ADR-0011

確認する属性:

- Formal / Training
- Test Level / Type
- runner / project / suite
- trigger
- platform
- Required Gate / supporting evidence

Test fileは、Risk mappingまたはRequirement direct referenceで実際に参照するものだけ開く。

### Step 3 — RA-G1 pre-audit

`requirements_traceability.md`をCurrent codeと照合する。

#### WE-CORE

- 12 Mapping IDとCurrent `phase1-required.spec.ts`の先頭12 Flowを照合する。
- 各Mappingに `file path + exact title` を設定できることを確認する。
- 実行test件数とは分離する。

#### 下位Testの代表ラベル

- `UT-*` / `CT-*` / `CP-*` / `WE-*`等についてCurrent codeを必要な行だけ検索する。
- label taxonomyとCurrent Test Levelの対応を確認する。
- Current `Test ID Rule`が実態を説明できていなければ、既存labelを変えずtaxonomy説明を補正する。
- IDをtest codeへ追加しない。
- 一意な代表code referenceを確認できない重要行があれば停止する。

### Step 4 — `test_strategy.md`の3軸分離

以下を独立したセクション / 表にする。

#### A. Test Level / Test Type

Current evidenceに存在する分類だけを書く。

最低限:

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

「何を見るか」をPerspective、「どの層で検証するか」をLevelとする。

#### C. Execution / Platform / CI Gate

Current workflowに存在するものだけを書く。

最低限:

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

### Step 5 — Risk mapping

Current Phase 1重要Risk 16件を、順序・文言を維持して16行で作る。

各行:

1. Risk / Risk label
2. Representative Requirement / AC
3. Representative technique / perspective
4. Primary Test Level
5. Representative Formal Test / suite
6. CI Gate

Rule:

- group化しない。
- 新Risk IDを作らない。
- 代表Requirement / ACを必ず持たせる。
- Current repository evidenceで確認できないsuite / gateを書かない。
- Requirement / AC詳細全件を二重化しない。

### Step 6 — Requirement direct reference

`requirements_traceability.md`を修正する。

- WE-CORE表の列名を役割が分かる名前へ修正する。`Mapping ID`を第一候補とする。
- WE-CORE 12へverified `file + exact title` referenceを追加する。
- 下位Testの代表行は、Current evidenceで確認できたreferenceだけ追加する。
- `Test ID Rule`が下位代表ラベルの実態を説明していない場合は、既存IDをrenameせず、taxonomy / labelの意味が一意になるようDocumentationを整理する。
- command / project / CI Gateをこの文書へ重複させない。

### Step 7 — PR 1 follow-up verification

実装後に確認する。

- RA-M1: WE-CORE 12 mapping / required command / PR matrix Gateを混同していない。
- RA-M2: Cross-roleをPR Gate外に戻していない。
- RA-M3: Formal E2E / Smoke projectと`ui-review-*`を混同していない。
- RA-M5: Nativeをfuture扱いしていない。
- RA-M6 / CUR-M9: iOS manual triggerとNative-change Build-only Required Gateを区別し、iOS Runtime保証を追加していない。

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

これらの変更が必要になった場合はValidationを増やして続行せず、StopしてPlanを見直す。

### 5.2 Current SSOT cross-check

#### Strategy

- Level / Perspective / Execution・Platform・Gateが別軸になっている。
- Formal / Trainingを混同していない。
- Web / Android / iOSのCurrent asymmetric guaranteeを正確に説明している。
- Currentにないproject / job / command / guaranteeを書いていない。

#### Risk

- 16 Riskすべてが1行ずつ存在する。
- 各RiskにRepresentative Requirement / ACがある。
- Requirement / AC → technique / perspective → level → suite → gateを辿れる。
- 新Risk ID / groupを作っていない。

#### Traceability

- WE-CORE 12はMapping IDでありexecutable countではない。
- 各WE-CORE referenceがCurrent file / exact titleに実在する。
- 下位代表ラベルのreferenceはCurrent codeで確認済み。
- `CT-*` / `CP-*`等のtaxonomy説明が表の実態と矛盾しない。
- IDをtest codeへ新規埋込みしていない。

### 5.3 Bounded regression search

検索failureの対象は、今回変更する2文書だけに限定する。

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

- implementation開始時にCurrent Formal Suite / workflowが本Planの前提から変わっている。
- `e2e_design.md`変更が必要になる。
- contract test / validator / test code変更が必要になる。
- Product / workflow / package / Playwright config変更が必要になる。
- Curriculum / Training behavior変更が必要になる。
- RA-G1解消のためTest codeへIDを追加する必要がある。
- `CT-*` / `CP-*`等の現行label taxonomyをCurrent evidenceから説明できず、新ID制度設計が必要になる。
- 重要Mappingの代表code referenceを一意に説明できない。
- RA-G3解消に新しいRisk Registry / Traceability SSOTが必要になる。
- RA-G6解消にCI Gate / Native guarantee自体の変更が必要になる。
- PR 3 / PR 4 / PR 5のPrimary owner領域へ踏み込む必要がある。

## 7. Definition of Done

次をすべて満たしたらPR 2 implementation完了。

- writable scopeが2文書 + implementation Runに限定されている。
- `test_strategy.md`で3軸を別々に読める。
- Phase 1 Risk 16件が1 Risk = 1 rowで追跡できる。
- 各RiskからRepresentative Requirement / ACを経由してFormal suite / Gateまで辿れる。
- `requirements_traceability.md`からWE-CORE 12およびverifiedな下位代表行のCurrent codeへ辿れる。
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
