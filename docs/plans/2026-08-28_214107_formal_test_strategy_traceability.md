# PR 2 — Formal Test Strategy / Perspective / Traceability 実装計画

## 0. 依頼概要

- 依頼内容: Master Plan の PR 2「Formal Test Strategy / Perspective / Traceability」を実施するための child Plan を作成する。
- 背景: PR #75 で PR 1「Current Documentation / SSOT Repair」が `main` へ merge され、Current Documentation と Current executable contract / CI の主要な事実差分は解消済みである。次段階では、Current Formal Suite を正本として Test Strategy と Traceability の設計契約を整理する。
- 期待成果: Test Level / Test Type、Test Perspective、Execution / Platform / CI Gate を別軸として読め、Requirement / AC → representative regression と Risk / technique / level / gate を既存文書から追跡できる状態を、設計変更や Test Suite 大量編集なしで実現する。
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Progress tracker: Issue #72
- Baseline: `main` commit `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`（PR #75 merge commit）
- Branch: `docs/formal-test-strategy-traceability`

## 1. ゴール / 完了条件

### ゴール

Current Formal Suite、Playwright project、package script、Web / Native workflow、ADR を実行上の正本として、Formal Test Strategy と Traceability を次の契約へ整合する。

1. Test Level / Test Type と Test Perspective と Execution / Platform / CI Gate を混同しない。
2. Formal Regression と Training Test を同じ coverage count / Formal Suite として扱わない。
3. Requirement / AC から representative regression code / suite を直接辿れる。
4. Risk から representative technique / perspective、Primary Test Level、Representative Formal Test / suite、CI Gate を辿れる。
5. Current Native contract（Android Build + Runtime / Maestro、iOS Build-only）と Web / Cross-browser / Deployed Smoke / UI Review の実行境界を正確に説明する。

### 完了条件（DoD）

- `docs/08_testing/test_strategy.md` で以下の3軸が別セクションまたは別表として一意に説明されている。
  - Test Level / Test Type
  - Test Perspective
  - Execution / Platform / CI Gate
- Current Formal Suiteとして少なくとも Unit、Application Integration、Repository Contract、Component、Static / Operational Contract、Web E2E、Native Component / Repository / Android Runtime E2E、Deployed / Production Smoke の位置付けをCurrent repository evidenceに基づいて説明している。
- Accessibility、Responsive / Mobile Web、Role、State、Boundary、Failure等を Test Level ではなく代表 Perspective として扱っている。
- Web CI、Cross Browser Smoke、Native CI、iOS reusable workflow、Formal / Training boundaryをCurrent workflowと一致させている。
- `training-web-baseline` が Web CI `e2e-chromium` matrixに含まれていても、Training TestをFormal Regression coverageへ繰り上げないことが明記されている。
- `docs/12_quality/requirements_traceability.md` から既存の主要 Mapping / Test IDについてCurrent code / suiteへの代表参照を辿れる。
- `WE-CORE-001`〜`WE-CORE-012`はidentifierをrenameせず、Requirement / business-flow mappingとexecutable test declarationを区別したまま representative Formal Testへ接続されている。
- Risk / technique / level / gateの代表mappingが `test_strategy.md` にあり、個別Requirement全件の巨大Matrixにはしていない。
- 第三のTraceability SSOTを追加していない。
- Stable Risk IDは既存Risk記述 / labelで一意に追跡できないことを実Evidenceで確認した場合だけ導入し、先に新設しない。
- Test title / test file / workflow / Playwright project / Product codeの大量編集を行っていない。
- Remediation MatrixでPR 2がPrimary ownerのRA-G1 / RA-G3 / RA-G6を対応し、PR 1 follow-up verification対象のRA-M1 / RA-M2 / RA-M3 / RA-M5 / RA-M6 / CUR-M9を再確認している。
- Validation planがすべてPASSし、scope外変更がない。

## 2. 現状理解と前提

### Current understanding

#### Baseline /依存関係

- PR #75はmerge済みで、merge commitは`12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`。
- Master PlanはPR 1 merge後の最新`main`からPR 2 branchを作成する順序を固定している。
- Issue #72は進捗インデックス専用で、詳細scope / design decisionのSSOTではない。

#### Current Test Strategy / Traceability

- `docs/08_testing/test_strategy.md` は現在、Unit / Application Integration / Repository Contract / Static Asset Contract / Component / Web E2E / Deployed Smokeを1つの「Test Level」表で説明している。
- 同文書にはPR 1でCurrent Web E2E matrixとNative boundaryが反映済みだが、Master Plan PR 2が要求する「Level / Perspective / Execution・Platform Gate」の3軸分離、Formal / Training boundary、platform parity / operational contractの体系化は未完了。
- `docs/12_quality/requirements_traceability.md` はRequirement Group Matrix、Test ID Rule、WE-CORE 12 mapping、下位Testの個別対応例を持つ。
- 現在のTraceabilityはRequirement / Mapping IDと確認観点を結んでいるが、各代表IDからCurrent regression code path / executable suiteへのdirect referenceが体系化されていない。
- Test StrategyにはPhase 1重要Riskが16項目あるが、Technique / Perspective → Formal Test / CI Gateの代表mapping metadataは体系化されていない。

#### Current executable suite

- `package.json`のFormal test entry pointには`test:unit`、`test:integration`、`test:repository`、`test:component:web`、`test:component:native`、`test:contracts`、Web E2E / Accessibility / Mobile Boundary / Cross-role / Smokeがある。
- `pnpm run test`はUnit / Integration / Repository / Component / Contractsを集約する。
- `playwright.config.ts`のFormal E2E / Smoke projectは`chromium`、`mobile-chromium`、`cross-role-chromium`、`deployed-smoke`、`firefox-smoke`、`webkit-smoke`。
- `ui-review-desktop`、`ui-review-tablet`、`ui-review-mobile`、`ui-review-small-mobile`はUI Review用の別責務であり、Formal E2E project inventoryと同じcoverage countへ混ぜない。
- `e2e/web/`には`phase1-required.spec.ts`、`ui-ux-improvements.spec.ts`、`accessibility.spec.ts`、`mobile-boundary.spec.ts`、`cross-role-lifecycle.spec.ts`、`smoke.spec.ts`、`ui-review.spec.ts`等がある。
- `phase1-required.spec.ts`の先頭12 test titleはWE-CORE 12 business-flow mappingのFlow名と対応するが、同fileには12件を超えるcurrent executable declarationがあるため、12 mappingと実行テスト数を同一視できない。

#### Web CI / Cross Browser

- `.github/workflows/ci.yml`は`pull_request`、`main` push、weekly schedule、`workflow_dispatch`を持つ。
- `e2e-chromium` matrixは`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`を実行する。
- Web CI `verify`は少なくともVitest、build、`e2e-chromium`、UI Review、Production SmokeをRequired resultとして確認し、non-PRではExtended E2EもRequiredにする。
- PRの条件を満たす場合はPreview deploy後にdeployed preview smokeを実行し、最終`validate`で結果を確認する。
- `.github/workflows/cross-browser-smoke.yml`はweekly schedule / `workflow_dispatch`でFirefox / WebKit Smokeを実行する。

#### Native / Training

- `.github/workflows/native-ci.yml`はPRと`workflow_dispatch`を入口とし、Native change detection後にNative Static、Android Build / Runtime系、iOS reusable workflow等をCurrent gateとして実行する。
- `.github/workflows/native-ios-ci.yml`は`workflow_call`と`workflow_dispatch`を持ち、Automation / Production-validationのiOS Simulator Buildと`ios-verify`を行う。Runtime / MaestroはCurrent Required Guaranteeではない。
- ADR-0011はAndroidをBuild + Runtime、iOSをBuild-onlyとするCurrent formal Native contractの正本である。
- `playwright.training.config.ts`は`training/playwright`をtestDirとし、`training-chromium` / `training-mobile-chromium`をFormal Playwright configと分離している。
- `package.json`にはTraining Web baseline / mobile / exercise / expected failureとTraining Native baselineがある。
- Training testがFormal Web CIの一部legとして実行されても、その事実だけでFormal Regression coverageへ分類しない。

### Assumptions

- PR 2の主変更はDocumentation / Traceability design contractであり、Current Product behaviorやCurrent CI Gate自体を変更しない。
- Current executable contract / workflow / ADRをDocumentationへ合わせるのであって、DocumentationのためにworkflowやTest Suiteを変更しない。
- 既存のPhase 1 Risk 16項目は、まず現在の記述自体を一意なRisk labelとして再利用できるか確認する。新しいStable Risk IDを先に導入しない。
- Requirement全件とtest declaration全件の1:1 Matrixは作らず、代表traceを固定する。
- Direct code referenceは「IDをTest codeへ埋め込む」ことを意味しない。Current test code path / test title / suite / commandを文書側から直接辿れることを基本案とする。
- Current codeに一意な代表testを確認できないMapping / Test IDがある場合は、推測でfile / titleを割り当てない。

### Non-goals

- Product behavior変更。
- Test Suite / test title / file nameの一括rename。
- WE-CORE identifierのrename。
- Formal E2E件数を固定契約化すること。
- CI matrix、workflow trigger、Required Gateの変更。
- Playwright project追加・削除・rename。
- iOS Runtime / MaestroをRequired Guaranteeへ追加すること。
- Training TestをFormal Regressionへ昇格すること。
- PR 3のCompetency / Assessment / Decision B / Common Core / specialization設計。
- PR 4のCurriculum全文監査、用語統一、self-study remediation。
- PR 5のTraining learner exercise / artifact contract実装。
- Phase 6のRefactoring decision。
- 第三のTraceability file、全Repository用Risk registry、permanent test inventory fileの追加。
- 全Requirement / 全Test declarationの巨大な1:1 Traceability Matrix。
- unrelated documentation cleanup。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点でblocking questionはなし。

ただし実装前auditで次が判明した場合は、推測せず停止してPlanを見直す。

- Current Formal Suite / workflowが本Plan作成時から変わり、Test Level / Gate分類の前提が変わっている。
- 既存Risk記述だけでは一意に追跡できず、Stable Risk ID導入の要否が設計判断になる。
- 既存Mapping / Test IDに対してCurrent code上の代表testを一意に特定できず、RA-G1 completion方法が複数案に分かれる。
- DocumentationだけではRA-G1 / RA-G3 / RA-G6を満たせず、Test code / workflow semanticsの変更が必要になる。

### 仮定してよい細部

- 表の列順、見出し名、文書内section順など、3軸分離とtrace contractを変えないeditorial detail。
- 同じCurrent suiteを表す場合の`Representative Formal Test`表記をfile path中心にするかcommand中心にするかは、再現性と重複最小化を優先して実装時に決めてよい。

### 未回答の重要質問

- なし。上記stop conditionに該当した場合だけ追加する。

## 4. 影響範囲

### Impacted areas

#### Primary change target

1. `docs/08_testing/test_strategy.md`
   - 3軸分離
   - Formal / Training boundary
   - Web / Native / Smoke / operational gateのCurrent contract
   - Risk / technique / perspective / level / representative suite / gateの最小mapping

2. `docs/12_quality/requirements_traceability.md`
   - Requirement / Mapping ID → representative current regression code / suite direct reference
   - WE-CORE 12 mappingとexecutable declarationの区別維持
   - 既存下位Test例のCurrent code reference確認

#### Conditional change target

3. `docs/08_testing/e2e_design.md`
   - `test_strategy.md` / `requirements_traceability.md`との責務境界やcross-referenceが不十分な場合のみ最小修正する。
   - Global Test Level / Perspective / Gate matrixを重複定義しない。

4. `tests/contracts/**` / validator
   - 既存contractが旧Documentation構造を固定していて正当なDocumentation変更により失敗する場合、または新しいcanonical contractの再発防止に既存convention上の最小contract変更が不可欠な場合だけ検討する。
   - 新しい大規模validator / metadata systemは作らない。

### Files to inspect（read-only SSOT）

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `docs/08_testing/test_strategy.md`
- `docs/08_testing/e2e_design.md`
- `docs/12_quality/requirements_traceability.md`
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
- `tests/unit/**`
- `tests/integration/**`
- `tests/repository-contract/**`
- `tests/component/**`
- `tests/contracts/**`
- `tests/runtime/**`
- `training/playwright/**`
- `training/maestro/**`

## 5. 変更方針

### 5.1 実装直前にCurrent Formal Suite Inventoryを再検証する

永続的な新規inventory fileは作らず、implementation RunのEvidenceとしてCurrent suiteをread-onlyで整理する。

最低限、各entryについて次を確認する。

- Formal / Training
- Test Level / Type
- Representative Perspective
- Runner / project / suite / code path
- Trigger（PR / main / schedule / manual / native-change conditional）
- Platform
- Required Gate / supporting evidenceの別

Inventoryは少なくとも次を含む。

- Vitest Unit / Integration / Repository / Web Component / Contract
- Jest Native Component
- Web E2E required
- Accessibility
- Mobile Boundary / Extended Mobile E2E
- Cross-role
- UI Review
- Production / Deployed Smoke
- Firefox / WebKit Cross-browser Smoke
- Native Static / Native contract
- Android Build / Runtime / Maestro
- iOS Automation / Production-validation Build-only
- Training Web baseline / exercise
- Training Native baseline

この再検証でPlanのCurrent understandingが変わる場合、scopeを勝手に広げずStop conditionへ移る。

### 5.2 `test_strategy.md`を3軸へ分離する

現在のTest Level説明を、少なくとも以下へ責務分離する。

#### A. Test Level / Test Type

Current repository evidenceを基準に、以下を体系化する。

- Unit
- Application Integration
- Repository Contract
- Component
- Static / Operational Contract
- Web E2E
- Native Component / Repository / Android Runtime E2E
- Deployed / Production Smoke

注意:

- Accessibility / Responsive / Role / State等をLevelとして追加しない。
- UI ReviewをWeb E2Eのtest declaration数へ混ぜない。
- Nativeの各suite名はCurrent workflow / test entryの実態を確認してから記載し、存在しない固定名称を発明しない。

#### B. Test Perspective

最低限以下を代表Perspectiveとして定義する。

- Accessibility
- Responsive / Mobile Web
- Role / Ownership
- State / Lifecycle
- Boundary
- Failure / Recovery
- Data / Persistence consistency
- Security / Authorization
- UX / Visual acceptance（Current UI Reviewとの責務を明示）

Perspectiveは「何を見るか」、Levelは「どの層で検証するか」として明確に分ける。

#### C. Execution / Platform / CI Gate

Current workflowを正本に、少なくとも以下を整理する。

- Web PR
- main push
- weekly schedule
- manual `workflow_dispatch`
- Web `e2e-chromium` matrix
- UI Review
- Production Smoke
- PR Preview Deployed Smoke
- non-PR Extended E2E
- weekly/manual Cross-browser Smoke
- Native PR conditional gate
- Native manual gate
- Android Build + Runtime / Maestro
- iOS Build-only reusable gate
- Formal / Training boundary

「workflowで同時に走る」ことと「同じFormal coverage分類である」ことを分離する。

### 5.3 Formal / Training boundaryを明文化する

- `playwright.config.ts`と`playwright.training.config.ts`の責務を明確に分ける。
- `training-web-baseline`がWeb CI matrixに入っている理由を「Training asset / baselineの健全性確認」として扱い、Formal Regression count / Requirement coverageへ含めない。
- `training:web:mobile*`、Training expected-failure、Training Native baselineも同様にTraining側のcontractとする。
- PR 3 / PR 5が所有するLearner completion / Evidence契約へ踏み込まない。

### 5.4 Phase 1 Risk → Technique / Perspective / Level / Gateを最小mappingする（RA-G3 / RA-G6）

`test_strategy.md`の既存Phase 1重要Risk 16項目を消さず、各Riskまたはboundedな同義groupについて代表traceを持たせる。

最小列の候補:

| Risk / Risk label | Representative technique / perspective | Primary Test Level | Representative Formal Test / suite | CI Gate |
|---|---|---|---|---|

ルール:

- 16 Riskを全Testへ展開しない。
- Primaryを1つ選び、必要な場合だけsupporting level / suiteを短く補足する。
- Techniqueは実際のriskとCurrent testsから説明できるものだけを使う。
- 単にTool名をTechnique欄へ書かない。
- Stable Risk IDは既存Risk文言で追跡不能な場合だけ導入する。
- Requirement / ACの詳細対応は`requirements_traceability.md`を正本とし、同じ巨大Matrixを二重化しない。

### 5.5 Requirement / Mapping ID → Current regression code direct referenceを追加する（RA-G1）

`requirements_traceability.md`で次を行う。

#### WE-CORE 12

- `WE-CORE-001`〜`012`のidentifierは維持する。
- 表の役割を「Test declaration一覧」ではなく「Requirement / business-flow mapping」と一意にする。
- 必要であれば列名`Test ID`を`Mapping ID`等へ変更するが、identifier自体はrenameしない。
- 各mappingからCurrent representative regression codeを直接辿れるよう、verified code path / test titleまたはbounded suite referenceを追加する。
- `e2e/web/phase1-required.spec.ts`の現在のtest titleと照合し、推測で番号を割り当てない。
- 12 mappingとcurrent executable declaration countを同一視しない。

#### 下位Testの個別対応例

- 既存の代表Test ID行について、Current code上の代表test file / suiteをread-only検索する。
- 一意な代表file / testを確認できる行だけdirect referenceを追加する。
- 既存ID文字列がtest codeに直接埋め込まれていなくても、Current code path / test titleが一意なら文書側direct referenceでよい。
- 一意に特定できない行へ架空のcode referenceを追加しない。
- staleな行が見つかった場合、Requirement mapping自体が誤りなのかcode referenceだけが不足しているのかを分離して判断する。今回のscopeで意味変更が必要ならStop conditionとする。

### 5.6 `e2e_design.md`はE2E責務に限定する

- Global Test Strategy 3軸を`e2e_design.md`へ複製しない。
- Playwright project、WE-CORE mapping、Cross-role、Locator、Wait、Artifact、Smoke、Native boundaryなどE2E実装責務を維持する。
- PR 2変更後のStrategy / Traceabilityへ誘導が必要な場合だけcross-referenceを最小追加する。
- Current project名、command、Gateの事実を変更しない。

### 5.7 PR 1 follow-up verification

次をCurrent main / 実装後docsで再確認する。

- RA-M1: WE-CORE 12 mapping / required command / PR matrix Gateを再度混同していない。
- RA-M2: Cross-roleがPR `e2e-chromium` matrixに含まれるCurrent contractを維持している。
- RA-M3: Formal E2E / Smoke projectと`ui-review-*`を別責務として扱っている。
- RA-M5: Nativeをfuture扱いせず、Web Gateと別のCurrent contractとして説明している。
- RA-M6 / CUR-M9: iOS standalone manual Build-onlyとNative change時Required Build-onlyを区別し、iOS Runtime保証を追加していない。

### 5.8 contract test / validatorの扱い

- Documentation修正だけで既存contractがPASSするならtest / validatorは変更しない。
- 既存contractが旧文書構造を固定しており、正しい新契約と衝突する場合だけ最小修正する。
- 新しいRisk registry、mapping parser、custom validator等をPR 2のためだけに追加しない。
- Contract testを追加する場合は、変わりやすい表の全文や件数ではなく、Formal / Training boundaryやcanonical referenceなど再発防止価値が高く安定した契約に限定する。

### 実行タスク

- [ ] 1. implementation開始時の最新`main` / branch / Master Plan / PR 1 merge状態を再確認する。
- [ ] 2. package scripts、Playwright configs、Web / Cross-browser / Native workflows、ADR-0011、test directoryからCurrent Formal Suite Inventoryを確定する。
- [ ] 3. RA-G1 / RA-G3 / RA-G6とPR 1 follow-up FindingをCurrent evidenceで再検証する。
- [ ] 4. `test_strategy.md`をTest Level / Perspective / Execution・Platform・Gateの3軸へ整理する。
- [ ] 5. Formal / Training boundaryとCurrent Web / Native / Smoke gateをStrategyへ反映する。
- [ ] 6. Phase 1 Riskの代表Technique / Perspective / Level / Formal Suite / Gate mappingをboundedに追加する。
- [ ] 7. `requirements_traceability.md`へWE-CORE 12と既存代表Test IDのverified direct code / suite referenceを追加する。
- [ ] 8. 必要な場合のみ`e2e_design.md`のcross-reference / responsibility wordingを最小修正する。
- [ ] 9. 必要性がEvidenceで確認できた場合のみcontract test / validatorを最小修正する。
- [ ] 10. Finding単位・3軸・Formal/Training・Native boundary・scopeを自己レビューする。
- [ ] 11. Validationを実施し、scope外差分がないことを確認する。
- [ ] 12. implementation Runをfinalizeし、PR 2 reviewへ進める。

## 6. 検証方法

### Required local validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- Curriculum文書を変更した場合のみ`pnpm run validate:curriculum`
- TypeScript test / validatorを変更した場合は`pnpm run typecheck`
- `git diff --check`

### Manual Current SSOT cross-check

#### Formal suite / Test Level

- `package.json`のUnit / Integration / Repository / Component / Contracts / E2E / Training scriptsとStrategyのLevel / boundaryが一致する。
- `tests/**`のcurrent directory / suiteがStrategy記載と矛盾しない。
- 存在しないsuite名や固定countを作っていない。

#### Playwright / Web CI

- `playwright.config.ts`のFormal project名と`playwright.training.config.ts`のTraining project名を混同していない。
- `e2e-chromium` matrixの5 legとStrategyのGate説明が一致する。
- Cross-roleをPR外と記載していない。
- UI ReviewをFormal E2E declaration countへ混ぜていない。
- Production Smoke / Preview Deployed Smoke / non-PR Extended E2EのCurrent triggerを誤って一つのGateにまとめていない。
- Cross Browser Smokeがweekly / manualであることと一致する。

#### Native

- `.github/workflows/native-ci.yml`のNative change detectionとRequired GateをCurrent Strategyと照合する。
- `.github/workflows/native-ios-ci.yml`の`workflow_call` / `workflow_dispatch`、Automation / Production-validation Build、`ios-verify`と一致する。
- ADR-0011どおりAndroid Runtime保証とiOS Build-only保証を区別する。
- iOS Runtime / Maestro未実施をPASSやRequiredへ繰り上げない。

#### Traceability

- `WE-CORE-001`〜`012`の各representative code referenceが実在し、該当Flowを表している。
- direct referenceとして記載したfile path / command / projectがCurrent repositoryに存在する。
- 下位Test例のcode referenceは一意性を確認したものだけである。
- Risk → technique / perspective → Primary Level → representative Formal suite → Gateを少なくとも代表経路で辿れる。
- Requirement / AC → representative regressionとRisk mappingが相互に矛盾しない。

### Bounded search / regression check

実装後、少なくとも次の誤記がPR 2変更対象Current docsへ再導入されていないことを検索する。

- WE-CORE 12 = executable test countという記載。
- Cross-role = PR Gate外という記載。
- iOS = manual onlyという単純化。
- Native = future / unsupportedというCurrent contractと矛盾する記載。
- Training test = Formal Regression coverageという記載。
- `ui-review-*` = Formal E2E projectという誤分類。
- Currentに存在しないPlaywright project / package command / workflow job名。

Repository-wide historical textのzero-matchを要求しない。検索failureはCurrent / changed strategy・traceability docsに限定する。

### 成功判定

- Required local validationがPASSする。
- Current SSOT cross-checkが全項目PASSする。
- RA-G1 / RA-G3 / RA-G6のCompletionを文書差分から説明できる。
- RA-M1 / M2 / M3 / M5 / M6 / CUR-M9のfollow-upでregressionがない。
- 変更はPrimary / Conditional targetとcurrent implementation Run Artifactに限定される。
- Product / workflow / package script / Playwright project / test titleのsemantic changeがない。

## 7. リスクと未解決論点

### Risks

1. **3軸を1つの表へ再び混在させる**
   - 対策: Level / Perspective / Execution・Platform・Gateを別セクション / 別表とし、同じ用語を複数軸で定義しない。

2. **Traceabilityを全件1:1 Matrixへ拡大する**
   - 対策: representative traceに限定し、Requirement Groupと既存Mapping IDを活用する。

3. **Direct code referenceのためTest codeへID埋込みを始める**
   - 対策: 文書からCurrent file / title / suiteへの参照を第一案とし、Test code変更をNon-goalとする。

4. **Training Web baselineがWeb CIにあるためFormal Testと誤分類する**
   - 対策: Execution Gateとcoverage classificationを明確に別軸にする。

5. **UI Review / AccessibilityをTest Levelとして扱う**
   - 対策: Perspective / acceptance evidenceとして分類し、runner/projectとの関係を別列で示す。

6. **NativeをAndroid / iOSの一律Runtime contractとして書く**
   - 対策: ADR-0011とCurrent workflowsを正本としてAndroid Runtime / iOS Build-onlyを分離する。

7. **Risk IDを先に設計してscopeを広げる**
   - 対策: 既存Risk文言 / Requirement Group / unique labelで追跡可能かを先に検証する。

8. **PR 3以降のCurriculum / Competency責務を先取りする**
   - 対策: Formal Test Strategy / Product Traceabilityだけに限定し、Learner competency / evidenceは触らない。

9. **Documentation変更を理由にworkflow / suiteを変える**
   - 対策: workflow / executable contractをread-only SSOTとし、変更必要性が出たらstopする。

### Open questions

- 現時点でなし。
- implementation前Current inventoryで一意なrepresentative regressionを確定できないIDが見つかった場合は、そのIDだけOpen question化し、架空のdirect referenceで埋めない。

### Stop conditions

次の場合は実装を停止してchild Planを再検討する。

- Current `main`でFormal Suite / workflow contractが本Planから実質変更されている。
- RA-G1解消にTest codeへのID大量埋込みやTest title renameが必要になる。
- RA-G3解消に新しいpermanent Risk Registry / Traceability SSOTが必要になる。
- RA-G6解消にCurrent CI Gate / Native guarantee自体の変更が必要になる。
- Stable Risk ID導入が必要だが、命名 / ownership / lifecycleの新しい設計判断が必要になる。
- representative code referenceをCurrent repository evidenceから一意に確定できない重要Mappingがあり、DoDを満たせない。
- Product code、workflow、package script、Playwright project、Training behaviorのsemantic changeが必要になる。
- PR 3 / PR 4 / PR 5のPrimary owner領域を変更しないとPR 2を完了できない。

## 8. 成果物

### 実装時の変更候補

Primary:

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`

Conditional:

- `docs/08_testing/e2e_design.md`
- 必要性がCurrent Evidenceで確認された最小の`tests/contracts/**` / validator

Plan / Run:

- `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md`
- PR 2 Plan Run Artifact
- PR 2 implementation開始時はRepository Run contractに従いimplementation Runを分離する。

### 付随ドキュメント

- 新しい`docs/reports/` reportは作成しない。
- 新しいTraceability / Risk inventory永久ファイルは作成しない。
- Issue #72は進捗リンク / statusだけ更新し、実装詳細を複製しない。

## 9. Follow-up notes

- PR 2 merge後、Master Planどおり最新`main`からPR 3「Decision B / Competency / Assessment Contract」を開始する。
- PR 2 merge後はPhase 6 Refactoring Necessity ReviewをPR 3〜5と並行して調査可能になる。
- PR 3では本PRで整理したTest Level / Perspective / Gate契約をC05 / C12等のCompetency設計の前提として利用する。
- PR 4ではRA-M8のTest Case ID grammarやCurriculum側Trace / terminologyをfollow-upするが、PR 2ではCurriculum本文へ拡大しない。
- PR 5ではFormal / Training boundaryを維持しつつTraining learner entry / Artifact / Evidenceを具体化する。
