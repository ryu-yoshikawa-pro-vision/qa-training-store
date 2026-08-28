# PR 1 Child Plan: Current Documentation / SSOT Repair

## 0. 依頼概要

- 依頼内容: Master PlanのPhase 0 — Current `main` revalidation結果に基づき、Current Fact / Canonical Contractの不整合だけを修正するPR 1の実装計画を作成する。
- 背景: PR #61でMaster Planが`main`へマージされた。Audit時点のFindingをそのまま実装せず、Current `origin/main`で再検証してからPR 1のscopeを確定する。
- 実装開始条件: このPlanのレビュー承認後。同じ`fix/current-documentation-ssot-repair` branch / PRで実装を継続する。

## 1. Goal / 完了条件

### Goal

Current Repositoryの実装・workflow・validator・Workbookと、Current Documentation / Curriculumの記載を照合し、設計変更なしで修正できるRA-M1〜RA-M6およびRA-M8の事実差だけを修正する。既存の実行契約を緩めず、変動する値はCurrent SSOTへの参照へ寄せる。

### 完了条件（DoD）

- PR 1の変更対象が本Planのscope内に限定される。
- Required Web E2Eの実行Command / project / Gate、Cross-roleのPR Gate扱い、NativeのCurrent境界、Seed Versionの参照先がCurrent実装・workflow・ADRと一致する。
- Test Case IDのlearner-facing例が、Current validatorとWorkbookが受け付けるcanonical grammarへ揃う。
- `CHANGELOG.md`などの歴史記録、validatorのcanonical contract、Workbookのcanonicalデータ、contract test、Product behavior、Formal CI Gateは変更しない。
- 後続ownerの設計変更をPR 1へ取り込まない。
- 実装後のformat / markdown / spec / curriculum / contract validationが成功する。

## 2. Current understanding

以下は、baseline `origin/main` = `927dce6debff045957d15ff76cd1ab254c3720ca`で確認した事実である。

- PR #61はMERGEDであり、merge commit `237a2be587fcd5755bd2bd42087ccc7b07e9aed8`はCurrent `origin/main`の祖先である。
- `docs/08_testing/e2e_design.md`、`docs/08_testing/test_strategy.md`、`docs/12_quality/requirements_traceability.md`、`docs/12_quality/acceptance_criteria.md`は、Phase 1必須Web E2Eを12本と記載している。
- `package.json`のCurrent `test:e2e:chromium`は、`e2e/web/phase1-required.spec.ts`と`e2e/web/ui-ux-improvements.spec.ts`を`--project=chromium`で実行する。このcommandのexecutable test declaration数は、12 WE-CORE FlowのmappingやPR 1の固定文書契約とは別の実行詳細として扱う。
- `.github/workflows/ci.yml`の`e2e-chromium` matrixには`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`があり、`verify`は`e2e-chromium`の成功を要求する。`cross-role`はPR workflow内のRequired matrix legである。
- `playwright.config.ts`のうち、RA-M3で対象とするFormal E2E / Smoke関連のCurrent project identifierは`chromium`、`mobile-chromium`、`cross-role-chromium`、`deployed-smoke`、`firefox-smoke`、`webkit-smoke`である。同じconfigには別責務のUI Review用`ui-review-desktop`、`ui-review-tablet`、`ui-review-mobile`、`ui-review-small-mobile`も存在するが、RA-M3のCurrent Fact repair対象には含めない。
- `src/config/versions.ts`の`SEED_VERSION`と`tests/integration/seeds.test.ts`の期待値は11である。`docs/07_testability/seed_catalog.md`だけがSeed Versionを9と記載している。`CHANGELOG.md`の9 / 10は歴史記録である。
- Current Native保証は、`docs/curriculum/test-automation/README.md`、`docs/adr/0011-native-ci-ios-build-only-gate.md`、`.github/workflows/native-ci.yml`により、Android = Build + Runtime E2E、iOS = Build-onlyと定義されている。
- `.github/workflows/native-ci.yml`はNative変更時に`native-ios-ci.yml` reusable workflowを呼び、`native-ci / verify`でiOS結果のsuccessを要求する。iOS Simulator Runtime / MaestroはRequired保証ではない。
- `docs/08_testing/e2e_design.md`と`docs/12_quality/acceptance_criteria.md`には、Nativeをfuture / phase2またはPhase 1正本外と扱う記載が残っている。`docs/08_testing/test_strategy.md`にもCurrent Native Gateとの境界を示す修正が必要である。
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`と`part2/08_integration-design-capstone.md`は、iOSを手動Build-only baselineかつPR Required Gate外と記載している。この記載は、Native変更時のtop-level Required Build-only Gateを表していない。
- `scripts/validate-curriculum.ts`の`WORKBOOK_ID_PATTERNS.test_case_id`は`^TC-[A-Z0-9]+-\\d{3}$`である。`training/workbook/02_test-cases.csv`のcanonical例は`TC-CART-001`であり、Current contract testはこのWorkbook / validatorを検証する。
- `training/workbook/README.md`にはvalidatorと矛盾するTest Case ID例はないが、learner-facingなgrammar説明がない。Curriculumには`CART-001`、`PRODUCT-001`、`CART-002`等の旧例が残っている。
- `scripts/validate-curriculum.ts`は`docs/curriculum/test-automation/00_learning-design.md`を要求している。validator / contract testに`00_learning_design.md`というdirect wrong literalはなく、`pnpm run validate:curriculum`と`tests/contracts/training-curriculum.test.ts`はPASSした。
- `docs/curriculum/test-automation/README.md`、validator、canonical `part1/09_part1-capstone.md`がRequired Navigation / completionの正本である。`part1/10_part1-capstone.md`はLegacy Aliasであり、RA-L1の旧Maestro flow記載はRequired completionへ影響しない。

## 3. Assumptions

- 実装はこのPlanのレビュー承認後、同じ`fix/current-documentation-ssot-repair` branchで開始する。
- Master PlanのFixed decisions、ADR-0011、ADR-0019、およびCurrent executable contractを変更せず、文書をそれらへ合わせる。
- `package.json`、workflow、validator、Workbook CSV、contract testの変更は、Current Fact repairだけでは解決できない差が新たに確認された場合を除き行わない。
- 実装時点で変動値が変わっていた場合は、値を複製せず、該当するCurrent SSOTを再確認して参照を更新する。

## 4. Non-goals

- Product behavior、Native app behavior、Curriculum全体の再設計。
- Formal Test Strategyの再設計、Traceability設計、Decision Bの実装、Competency / Assessment再設計。
- Self-study remediation、Instructor Reference全面整理、Specification editorial、Training Evidence、learner exerciseの全面改善。
- Formal Testの変更、Product CI Gateの変更、Native Runtime保証の追加、iOS Simulator / Maestro Required化。
- validatorを教材例へ合わせて緩めること、Workbook canonical dataの変更、contract testの設計変更。
- `CHANGELOG.md`のCurrent値への書換え、dependency更新、refactoring、unrelated cleanup。
- RA-M7の再実装、RA-L1のLegacy Alias変更、PR 2以降の実装。

## 5. Impacted areas

- Current Web E2Eの文書契約: `package.json`、`playwright.config.ts`、`.github/workflows/ci.yml`をread-onlyのSSOTとして参照し、`docs/08_testing/`と`docs/12_quality/`の記述を修正する。
- Current Native CI境界のCurriculum: `.github/workflows/native-ci.yml`、`native-ios-ci.yml`、ADR-0011をread-onlyのSSOTとして参照し、Part 2の説明を修正する。
- Seed VersionのCurrent参照: `src/config/versions.ts`をSSOTとして、Seed Catalogの固定値複製を修正する。
- Test Case IDのlearner-facing説明: validatorとWorkbookの現行契約を参照し、READMEへcanonical explanationを追加し、Curriculumの具体例をcanonical例へ揃える。
- Required Navigation / completion: canonical README、validator、`part1/09_part1-capstone.md`だけを確認し、Legacy Aliasは変更しない。

## 6. Files to inspect / change

### 6.1 実際の変更対象

- `docs/07_testability/seed_catalog.md`
- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/12_quality/acceptance_criteria.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `training/workbook/README.md`

### 6.2 read-onlyで確認する対象

- `package.json`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `src/config/versions.ts`
- `tests/integration/seeds.test.ts`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- `training/workbook/01_target-risk.csv`
- `training/workbook/02_test-cases.csv`
- `training/workbook/03_automation-mapping.csv`
- `training/workbook/04_execution-improvement.csv`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`
- `docs/curriculum/test-automation/part1/10_part1-capstone.md`
- `docs/adr/0011-native-ci-ios-build-only-gate.md`
- `docs/adr/0019-chromium-required-ci-cross-browser-smoke.md`
- `CHANGELOG.md`

### 6.3 変更しない対象

`src/**`、`app/**`、`e2e/**`、`maestro/**`、`training/workbook/*.csv`、`scripts/validate-curriculum.ts`、`tests/**`、`.github/workflows/**`、`docs/spec/**`、`package.json`、`pnpm-lock.yaml`、Master Plan、過去Run Artifact。上記read-only対象のうち、6.1に明記した文書以外は変更しない。

## 7. Change strategy

### 7.1 全体方針

- Current executable contract / workflow / ADRを正本として引用し、同じ事実を文書間で新たに重複定義しない。
- `WE-CORE-001`〜`WE-CORE-012`の12 FlowはRequirement / business-flow mappingとして維持し、Current Required executable test declaration数を示すものとして扱わない。実行入口と対象は`package.json`の`test:e2e:chromium`を参照し、PR上のRequired coverage全体はCurrent Web CIの`e2e-chromium` matrixとして別に扱う。
- NativeはWeb E2Eへ混ぜず、Current Native CIの別契約として説明する。Android Build + Runtime、iOS Build-only、Native変更時のRequired条件、iOS Runtime非保証を混同しない。
- Seed Versionは`src/config/versions.ts`の`SEED_VERSION`をCurrent SSOTとして参照し、履歴文書は変更しない。
- Test Case ID grammarのlearner-facing説明は`training/workbook/README.md`へ集約し、Curriculumはその説明を参照して具体例だけをcanonical形式へ揃える。

### 7.2 Finding別の実装指示

#### RA-M1 — Required Web E2E件数 / commandの文書差

- Current State:
  - 12 WE-CORE Flow: `WE-CORE-001`〜`WE-CORE-012`はRequirement / business-flow mappingであり、Current Required executable test declarationが12個という意味ではない。
  - Required leg command: `package.json`の`pnpm run test:e2e:chromium`がCurrent Web CIの`e2e-chromium` matrixにおける`required` legのcommandであり、`e2e/web/phase1-required.spec.ts`と`e2e/web/ui-ux-improvements.spec.ts`を`--project=chromium`で実行する。
  - PR matrix Gate: PRの`e2e-chromium` matrix全体は`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`の各legで構成され、`verify`はmatrix jobの成功を要求する。`test:e2e:chromium`だけがPR全体の唯一のRequired Gateではない。
- Current finding: 対象文書には「必須E2E 12本」と、Required leg commandおよびPR matrix Gateの境界を混同し得る記載が残っている。
- Evidence / SSOT: `package.json`、`e2e/web/phase1-required.spec.ts`、`e2e/web/ui-ux-improvements.spec.ts`、`.github/workflows/ci.yml`、`playwright.config.ts`。
- Disposition: PR 1で12 Flow、required leg command / target、PR `e2e-chromium` matrix Gate全体の文書境界を分離して修正する。12 FlowのRequirement / business-flow mapping自体は変更しない。Cross-role leg固有のPR Gate差はRA-M2で扱う。
- 実際の変更対象: `docs/08_testing/e2e_design.md`、`docs/08_testing/test_strategy.md`、`docs/12_quality/requirements_traceability.md`、`docs/12_quality/acceptance_criteria.md`。
- 変更しない対象: `package.json`、E2E spec、workflow、Playwright config、WE-CORE mappingの設計、Formal Test。
- Change strategy:
  - `WE-CORE-001`〜`WE-CORE-012`の12 Flowはbusiness-flow / requirement mappingとして維持し、executable test countとして扱わない。
  - `pnpm run test:e2e:chromium`はCurrent Web CIの`e2e-chromium` matrixにおける`required` legのcommandとして記載し、対象specと`chromium` projectはCurrent SSOTを参照する。
  - PR Required coverage全体を`pnpm run test:e2e:chromium`だけと誤記せず、`e2e-chromium` matrix全体に別legがあることを区別する。
  - Cross-role legのCurrent PR Gate差はRA-M2で扱い、RA-M1へ統合しない。
  - Current executable test declaration数を新しい固定契約として文書へ複製せず、Current execution target / commandは`package.json`、workflow、`playwright.config.ts`をSSOTとして参照する。
- Validation: `rg`で12 Flowがmappingとして扱われ、required leg command / targetとPR matrix Gate全体が別々に記載され、`test:e2e:chromium`をPR全体の唯一のRequired Gateとする記述がないことを確認する。併せて`package.json`、workflow、Playwright configのCurrent SSOTと照合し、`pnpm run lint:markdown`、`pnpm run validate:spec`、既存の必要なcontract validationを実行する。
- Stop condition: WE-CORE 12 Flow自体の再設計、Formal E2E suiteの構成変更、CI matrix変更、package script変更、executable test数を固定契約として定義し直す判断、またはFormal Test Strategyの再設計が必要になった場合は停止する。Formal Test Strategyの再設計はPR 2へ残す。

#### RA-M2 — Cross-roleをPR外とする文書とCurrent PR Gateの差

- Current State: 文書はCross-role Lifecycleをmain / 週次扱いとしているが、Current `e2e-chromium` PR matrixに`cross-role` commandがあり、`verify`がmatrix成功を要求する。
- Evidence / SSOT: `.github/workflows/ci.yml`、`package.json`の`test:e2e:cross-role`、`playwright.config.ts`の`cross-role-chromium`。
- Disposition: PR 1で文書のGate記載だけをCurrent PR Required matrixへ修正する。
- 実際の変更対象: `docs/08_testing/e2e_design.md`、`docs/08_testing/test_strategy.md`。
- 変更しない対象: `.github/workflows/ci.yml`、Cross-role spec、`package.json`、CIのRequired判定。
- Change strategy: Cross-roleの実行責務とPR Required matrixでの位置づけを記載し、main / 週次のみとする旧記載を削除する。Cross-roleをRequiredにするためのworkflow変更は行わない。
- Validation: workflowの現行matrix / `verify`参照と文書記載を`rg`で照合し、markdown lintを実行する。
- Stop condition: Cross-roleのRequired扱いを変更する必要、またはCI Gate設計の変更が必要になった場合は停止する。

#### RA-M3 — Playwright project名の文書差

- Current State: `e2e_design.md`の`chromium-desktop`等はCurrent configのproject名ではない。RA-M3の対象となるFormal E2E / Smoke関連のCurrent project identifierは`chromium`、`mobile-chromium`、`cross-role-chromium`、`deployed-smoke`、`firefox-smoke`、`webkit-smoke`である。`playwright.config.ts`には別責務のUI Review用`ui-review-desktop`、`ui-review-tablet`、`ui-review-mobile`、`ui-review-small-mobile`も存在するが、今回のRA-M3 Current Fact repairの対象には含めない。
- Evidence / SSOT: `playwright.config.ts`、`package.json`、`.github/workflows/ci.yml`。
- Disposition: PR 1で文書上のproject名と対応する用途 / Gateを修正する。
- 実際の変更対象: `docs/08_testing/e2e_design.md`。
- 変更しない対象: `playwright.config.ts`、workflow、package script、Browser matrix。
- Change strategy: RA-M3の対象範囲では、Current configで使用されるFormal E2E / Smoke識別子をそのまま記載し、翻訳・別名を作らない。別責務の`ui-review-*` projectは存在事実として区別するが、RA-M3の変更対象文書・修正scopeへ追加しない。Current Gateが異なるprojectは用途と実行入口を分けて記載する。
- Validation: `playwright.config.ts`、`package.json`、workflowのFormal E2E / Smoke project・commandと文書表を照合し、`ui-review-*`をRA-M3の変更対象へ追加していないことを確認する。
- Stop condition: project名変更やCI matrix変更が必要になった場合は停止する。

#### RA-M4 — Seed VersionのCurrent Documentation / implementation差

- Current State: `docs/07_testability/seed_catalog.md`は9、`src/config/versions.ts`の`SEED_VERSION`とseed integration testは11である。`CHANGELOG.md`の9 / 10は履歴である。
- Evidence / SSOT: `src/config/versions.ts`、`tests/integration/seeds.test.ts`、`docs/07_testability/seed_catalog.md`、`CHANGELOG.md`。
- Disposition: PR 1でSeed CatalogをCurrent SSOT参照へ修正する。CHANGELOGは変更しない。
- 実際の変更対象: `docs/07_testability/seed_catalog.md`。
- 変更しない対象: `src/config/versions.ts`、seed data / tests、`CHANGELOG.md`。
- Change strategy: Current値を別の固定値として複製せず、`src/config/versions.ts`の`SEED_VERSION`がCurrent SSOTであることを示す。Seed Catalogの他の固定データ説明は変更しない。
- Validation: Seed Catalogの参照先と実装SSOTを照合し、古いCurrent値の残存を検索する。
- Stop condition: Seed Versionの変更がseed data、Product behavior、migration設計を要求する場合は停止する。

#### RA-M5 — Test Strategy / Acceptance / E2E文書のNative境界差

- Current State: `e2e_design.md`はNative / Maestroをfuture / phase2とし、`acceptance_criteria.md`はNative/SQLite資料をfuture / Phase 1正本外としている。`test_strategy.md`にもWeb GateとCurrent Native Gateの境界が不足している。
- Evidence / SSOT: `docs/curriculum/test-automation/README.md`、`docs/adr/0011-native-ci-ios-build-only-gate.md`、`.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`。
- Disposition: PR 1で「NativeにCurrent formal contractがない」という誤解を除去する。NativeをWeb Phase 1 E2Eへ追加する設計変更はしない。
- 実際の変更対象: `docs/08_testing/e2e_design.md`、`docs/08_testing/test_strategy.md`、`docs/12_quality/acceptance_criteria.md`。
- 変更しない対象: Native workflow、Native app、Maestro、ADR、Web E2Eのscope、Formal Test Strategy全体の再設計。
- Change strategy: Web Phase 1文書が担当する範囲と、別契約として既に存在するNative保証を明示する。Current保証はAndroid Build + Runtime、iOS Build-onlyとし、iOS Runtime / Simulator / Maestro PASSを保証しない。将来の追加範囲とCurrent contractを区別する。
- Validation: Native README / ADR / workflowの保証範囲と3文書の記載を照合し、`pnpm run lint:markdown`と`pnpm run validate:spec`を実行する。
- Stop condition: NativeをWeb Gateへ統合する、Formal Test Strategyを再設計する、またはNative CI Gateを変更する必要が生じた場合は停止する。

#### RA-M6 — CurriculumのiOS manual-only説明とNative change時Required Build-only Gateの差

- Current State: `part2/06_native-ci-maestro.md`と`part2/08_integration-design-capstone.md`は、iOSを手動Build-only baselineかつPR Required Gate外としている。Currentではstandalone `workflow_dispatch`を維持しつつ、Native変更時はtop-level `native-ci`がiOS reusable workflowを呼び、`native-ci / verify`がiOS successを要求する。
- Evidence / SSOT: `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`docs/adr/0011-native-ci-ios-build-only-gate.md`、`docs/curriculum/test-automation/README.md`。
- Disposition: PR 1でCurriculumのCurrent factを修正する。
- 実際の変更対象: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`、`docs/curriculum/test-automation/part2/08_integration-design-capstone.md`。
- 変更しない対象: Native workflow、iOS Build実装、Simulator Runtime / Maestro、Part 2の演習目的、Current guaranteeの設計。
- Change strategy: 「manual only」をstandalone triggerの事実へ限定し、Native変更時のtop-level Required Build-only Gateを併記する。iOS Runtime / MaestroをRequiredへ昇格させず、全PRでiOS Buildが実行されるとも記載しない。
- Validation: Native workflowの`native_changed`、reusable workflow呼出し、`IOS_RESULT` success要求とCurriculumの説明を照合する。
- Stop condition: workflow変更、iOS Runtime保証、Runner / Trigger設計の変更が必要になった場合は停止する。

#### RA-M7 — canonical filename / validator contract

- Current State: canonical filenameは`00_learning-design.md`であり、validatorがこのpathを要求する。direct wrong literalはvalidator / contract testに存在しない。Current validatorとcontract testはPASSした。
- Evidence / SSOT: `scripts/validate-curriculum.ts`、`tests/contracts/training-curriculum.test.ts`、`docs/curriculum/test-automation/README.md`。
- Disposition: regressionなしのためPR 1 scopeから除外する。再実装・rename・文書修正は行わない。
- 実際の変更対象: なし。
- 変更しない対象: canonical Curriculum filename、validator、contract test、README。
- Change strategy: `pnpm run validate:curriculum`、contract test、wrong literal検索で回帰だけを確認する。
- Validation: `pnpm run validate:curriculum`、`pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1`、direct wrong literal検索。
- Stop condition: canonical pathの回帰、validator / contract testの失敗、またはrenameが必要な差が見つかった場合はPR 1実装を停止する。

#### RA-M8 — Curriculum Test Case ID例とcanonical grammarの差

- Current State: validatorの`test_case_id` patternは`^TC-[A-Z0-9]+-\\d{3}$`で、Workbookの例は`TC-CART-001`である。Workbook CSVはcanonical形式で、contract testもCurrent Workbook / validatorを通過する。一方、Curriculumには`CART-001`、`PRODUCT-001`、`CART-002`等がある。Workbook READMEには矛盾するgrammarはないが、canonical explanationが不足している。
- Evidence / SSOT: `scripts/validate-curriculum.ts`、`training/workbook/02_test-cases.csv`、`training/workbook/03_automation-mapping.csv`、`training/workbook/README.md`、`tests/contracts/training-curriculum.test.ts`。
- Disposition: PR 1でREADMEをlearner-facing grammar explanationの正本とし、Curriculumの具体例をcanonical形式へ揃える。validatorを緩めない。
- 実際の変更対象: `training/workbook/README.md`、`docs/curriculum/test-automation/00_learning-design.md`、`docs/curriculum/test-automation/01_spreadsheet-test-design.md`、`docs/curriculum/test-automation/part1/04_playwright-foundations.md`、`docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`、`docs/curriculum/test-automation/part1/07_maestro-native-automation.md`。
- 変更しない対象: `training/workbook/*.csv`、`scripts/validate-curriculum.ts`、`tests/contracts/training-curriculum.test.ts`、Test Case ID以外のRisk / AC / UI Test ID grammar、Product behavior。
- Change strategy: READMEに`TC-<DOMAIN>-NNN`、uppercase ASCII alphanumeric domain、3桁数字という現行validator contractに対応する説明を追加する。Curriculumはgrammarを別定義せずREADMEを参照し、learner-facingな旧具体例を`TC-CART-001` / `TC-CART-002` / `TC-PRODUCT-001`等へ置換する。既存Workbookのtraceabilityは変更しない。
- Validation: validator / Workbook / contract testが同じgrammarを使うことを確認し、Curriculum内の旧Test Case ID例とcanonical例を検索する。`pnpm run validate:curriculum`とcontract testを実行する。
- Stop condition: validator、Workbook、README、contract testのcanonical grammarが一致しないことが判明した場合、またはCurriculum例の修正にvalidator / Workbook / test変更が必要な場合は停止する。validatorを緩めて解決しない。

#### RA-L1 — Legacy P1 CapstoneのRequired completion影響

- Current State: `part1/10_part1-capstone.md`はLegacy Aliasで、Required Navigation / Rubric / Validatorはcanonical `part1/09_part1-capstone.md`だけを対象とする。Legacyの2 Maestro flow記載はCurrent Learner Required navigation / completionに影響しない。
- Evidence / SSOT: `docs/curriculum/test-automation/README.md`、`scripts/validate-curriculum.ts`、`docs/curriculum/test-automation/part1/09_part1-capstone.md`、`docs/curriculum/test-automation/part1/10_part1-capstone.md`。
- Disposition: PR 1およびPR 4の実装修正対象から除外する。PR 4ではRequired navigation / completionへの影響なしという確認結果だけを引き継ぐ。
- 実際の変更対象: なし。
- 変更しない対象: `part1/10_part1-capstone.md`、canonical navigation、Rubric、validator。
- Change strategy: Legacy AliasをCurrent Required教材へ昇格させず、既存のcanonical boundaryを維持する。
- Validation: required file list / README navigation / canonical capstoneの整合を確認する。
- Stop condition: 後続調査でLegacy文書がRequired navigationまたはcompletionから参照される事実が判明した場合は、PR 4 scopeを再判定してPR 1を停止する。

## 8. Validation plan

### このchild Plan作成時

- `pnpm run lint:markdown`
- `git diff --check`
- `scripts/sanitize-codex-artifacts.ps1 -Write -Path .codex/runs/20260828-074252-JST`
- `scripts/sanitize-codex-artifacts.ps1 -Check -Path .codex/runs/20260828-074252-JST`
- Phase 0 read-only確認済み: `pnpm run validate:curriculum`、`pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1`、Current workflow / config / ID grammarの`rg`照合。

### PR 1実装後

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Current SSOT照合: `package.json` / `playwright.config.ts` / Web workflow、Native workflow / ADR、`src/config/versions.ts`、validator / Workbook / contract test。
- 文書検索: 旧E2E Gate説明、旧project名、旧Seed Version、旧Test Case ID例、Native future / manual-only誤記、RA-M7 wrong literalの残存がないこと。
- docs-onlyのPR 1であるため、Product behavior変更を伴うFull E2E、Native build、Maestro runtimeは実装検証の前提にしない。必要性が生じた場合はStop conditionを適用する。

### 成功判定

- Current SSOTと文書記載の不整合が解消される。
- validator / Workbook / contract testの既存canonical contractが維持される。
- Product code、test、workflow、package / lockfile、Master Plan、過去Run Artifactに差分がない。
- 上記コマンドが成功し、追加の設計判断を要する未解決差がない。

## 9. Risks

- WE-COREの12 Flow、required leg command、PRの`e2e-chromium` matrix Gate全体を混同すると、不要なtest数の固定やFormal Test Strategy変更につながる。12 Flowはmappingとして維持し、実行入口・matrix構成はCurrent SSOTへ寄せる。
- NativeをWeb Phase 1へ取り込む表現にすると、Android Runtime / iOS Build-onlyの既存境界や後続PRの責務を壊す。別contractとして記載する。
- Seed Versionやproject名などの変動値を複製すると、次回変更時に再びdriftする。可能な箇所はSSOT参照にする。
- Test Case IDの旧例を一括置換する際、Risk ID、AC ID、UI Test IDを誤って変更しない。Test Case IDとして使われるlearner-facing例だけを対象にする。
- `CHANGELOG.md`の履歴をCurrent Factへ書き換えると、履歴の意味が変わるため変更しない。

## 10. Open questions / Stop conditions

- Phase 0時点のblocking question: なし。
- RA-M8のvalidator / Workbook / contract test間のcanonical grammarは一致しているため、grammar選択に関するblocking questionはない。
- Product behavior、Formal CI Gate、validator / Workbook / contract testの変更、新しい設計判断、Current Findingの解消済み判定、scope外ファイル差分が必要になった場合は、推測で実装せず停止する。
- 実装前にCurrent SSOTの値が変わっている場合は、Planの事実を再確認し、変更範囲を拡張せずにユーザーへ確認する。

## 11. Follow-up notes

- RA-M1: PR 2でFormal Test Strategy / Perspective / Traceability側の後続整合を確認する。
- RA-M2: PR 2でPR Gate責務とTraceabilityの後続整合を確認する。
- RA-M3: PR 2でproject / Gateの文書横断整合を確認する。
- RA-M4: 後続ownerなし。Current SSOT参照を維持する。
- RA-M5: PR 2 / PR 3でFormal StrategyとNative specialization / Competency boundaryの後続整合を確認する。
- RA-M6: PR 2 / PR 3でNative CI boundaryとCompetency / Curriculum後続設計を確認する。
- RA-M7: PR 3側のCurrent curriculum validationでregression確認を継続するが、PR 1で再実装しない。
- RA-M8: PR 4でCurriculum全体の学習導線・演習・completionとの後続整合を確認する。PR 1ではID grammarのCurrent Fact repairに限定する。
- RA-L1: PR 4でRequired navigation / completionへの影響なしという判定を引き継ぎ、実装修正は行わない。
- PR 1はこのPlanのレビュー承認後にのみ実装を開始し、実装完了後も同じbranch / PRでvalidationとレビューを行う。
