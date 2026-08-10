# テスト自動化カリキュラム再Baseline・教材提供基盤 統合実装計画

## 0. このPlanと現在Branchの位置づけ

この文書は、`docs/curriculum/test-automation/` の現行カリキュラムを、Scenario ShopのCurrent Product / Test / Native / CI / Specification構成へ再Baselineし、実際に教育提供できるTraining Environmentまで完成させるための実装計画である。

現在の`docs/test-automation-curriculum-remediation-plan` Branchは、**計画文書だけを保存・レビューするDocumentation-only Branch**とする。

このBranchでは以下を行わない。

- Curriculum本文の変更
- Application Codeの変更
- Playwright / Maestro Testの変更
- Training専用Config / Scriptの実装
- GitHub Actions Workflowの変更
- Specification Systemの実装
- Product Bugの修正
- Implementation PRの作成

本Planの実装は、**Specification Foundation Implementationが`main`へMergeされた後**、最新`main`から作成する別のImplementation Branchで開始する。

本Planの対応は、**1本のCurriculum Implementation PRで最後まで完了させる。** PRは分割しない。ただし実装作業はWave単位に分け、各WaveでScope、Validation、完了条件を固定する。

1PRへ統合する理由は、以下の成果物が強く依存しており、分割すると「後続実装が存在する前提」の不完全状態が発生しやすいためである。

```text
Normative Specification
↕
Curriculum本文
↕
Competency / Instructor Reference
↕
Workbook
↕
Training Playwright / Maestro
↕
Training CI
↕
Setup / Start Gate / Recovery
```

一方、Specification Foundationそのものは本PRへ含めない。Specification Systemの構築は既存の別Planに従って先に完了させ、本Implementationでは完成済みのNormative Specification / BR / ACを教材へ接続する。

---

## 1. Goal / 完了条件

### 1.1 Primary Goal

Scenario Shopを一貫した教材として使用し、受講者を単なる「Playwright / Maestroの操作ができる人」ではなく、次の一連の活動を自力で判断・実行できるTest Automation Engineerへ育成できる状態へ仕上げる。

```text
Automationの目的・限界を理解する
↓
Specification / Test Targetを理解する
↓
Riskを分析する
↓
Test Condition / Test Caseを設計する
↓
適切なTest LayerとToolを選ぶ
↓
自動化する / しないを判断する
↓
Playwright / Maestroで実装する
↓
EvidenceからFailureを分析する
↓
Test資産を保守・改善する
↓
Git / Review / CI / Quality Gateへ接続する
↓
案件へ継続運用可能な自動化基盤として導入する
```

### 1.2 Educational Goal

教育側が評価する中心を「手順を完了したか」「Testを何本書いたか」ではなく、**なぜその判断をしたかを説明し、Evidenceで裏付けられるか**へ置く。

学習者には最低限、以下を求める。

- Automationの目的・限界とManual Testとの補完関係を説明できる。
- Normative SpecificationとObserved Behaviorを区別できる。
- Role / State / Data / Business Rule / Boundary / User Journeyを整理できる。
- Riskとテスト設計技法からTest Condition / Test Caseを導出できる。
- すべてをUI E2Eへ置かず、適切なTest Layerを選べる。
- 自動化しない判断にも理由を持てる。
- Playwright / MaestroをSyntaxではなく目的から使い分けられる。
- Seed / Reset等で決定的な初期状態を作れる。
- FailureをEvidenceから分類し、修正対象を切り分けられる。
- POM / Helper / Fixture / Automation Flow等を問題に応じて選べる。
- PR / CI / Quality Gate / Artifact / Runner Costを含めて継続実行方法を設計できる。

### 1.3 Part 1 Outcome

Part 1修了時、受講者はGitHub / CIを必須とせず次を一巡できる。

```text
Automation Purpose
→ Specification / Target Analysis
→ Risk Analysis
→ Test Design
→ Automation Selection
→ Playwright / Maestro
→ Failure Analysis
→ Maintenance
```

### 1.4 Part 2 Outcome

Part 2修了時、受講者はPart 1のTest資産を変更管理と継続実行へ接続し、以下を理由付きで設計できる。

- PR / main / Nightly / ManualへのTest配置
- Required Quality Gate
- Web / Android / iOSの保証範囲
- Build / Runtimeの境界
- Artifact再利用
- Failure Evidence
- Preview / Production / Smoke
- Runner CostとFeedback速度

最終到達点はGitHub Actions YAMLの暗記ではなく、**案件のRisk・Platform・Cost・Reliabilityを踏まえて継続運用可能な自動テスト基盤を設計できること**とする。

### 1.5 High-level DoD

- Specification Foundation完成後のCurrent Specを教材Oracleとして利用する。
- `docs/curriculum/test-automation/` の全20文書をCurrent Repositoryへ再Baselineする。
- iOS Runtime / MaestroをCurrent Formal CI Guaranteeとして誤記しない。
- Android = Build + Runtime E2E、iOS = Build-onlyの保証差を正しく教材化する。
- Competency C01〜C12とLevel 0〜3を評価正本として用意する。
- Training Playwright / MaestroをFormal Regressionから分離する。
- Workbook TemplateをCSV正本として提供する。
- Training TypeScriptをRepository Quality Gateでtypecheckする。
- Secret不要・DeployなしのTraining Web CIとAndroid Training CIを提供する。
- Training Copy preparationを決定的なScript / Validationとして提供する。
- Repository-owned Training baseline smokeをFormal Required CIで継続確認する。
- Setup / Start Gate / Recovery / Instructor Referenceを用意する。
- Fresh Learner Dry RunでPart 1 → Part 2を通す。
- `pnpm run validate:curriculum`をRequired Phase 1 CIへ明示的に接続する。
- `pnpm run verify`とRequired GitHub Actionsを成功させる。
- 未解消Required Blockerを残さない。

---

## 2. Current understanding

### 2.1 Current Repository facts

本Plan作成時点では以下を確認済みである。

- Scenario ShopはWebとNativeを持つTest Automation Training向けEC Applicationである。
- Web E2EのFormal Regressionは`playwright.config.ts`と`e2e/web/`で管理される。
- Native Formal Regressionは`maestro/`、Native Test Control、Android Runtime CI等で管理される。
- Android Formal CIはBuild + Emulator Runtime + Maestro等を継続的に保証する。
- iOS Formal CIはADR-0011に基づくBuild-only Gateであり、Simulator boot / install / launch / Maestro Runtimeを正式保証しない。
- Current Curriculumには古いiOS Runtime前提が残っている。
- Current Curriculum自身がTraining専用Playwright境界、Training Workflow、Workbook実Template等を「後続で用意するもの」として扱っている。
- `package.json`はNative CIのchange detection対象であるため、Training用Package Script追加によりNative CIが起動することはCurrent Contract上Expectedである。
- Current `tsconfig.json`は`e2e/**/*.ts`や`scripts/**/*.ts`を含むが、将来追加する`training/**/*.ts`と`playwright.training.config.ts`は現状のままではtypecheck対象外である。
- Current Phase 1 CIは個別のQuality / Test / Build commandを実行しており、`pnpm run verify`そのものをRequired CIで呼んでいない。このため`validate:curriculum`を`verify`へ追加するだけではRequired CI Gateにならない。
- Current Android build contractはCompile API 36 / Build Tools 36.0.0を使用する一方、Formal Runtime EmulatorはAPI 34 / `google_apis` / `x86_64`を使用する。
- Existing `scripts/native/windows/android-local.ps1`は接続済みADB deviceを前提にDoctor / Build / Install / Test等を行うが、AVD作成・Emulator起動そのものは提供しない。

### 2.2 Specification dependency

Specification Foundation実装後は、Expected Product BehaviorのOracleをNormative Specificationへ統一する。

Specification Foundation完成前のCurrent Implementation / README / Existing Testから期待動作を逆算して、本ImplementationのSpecとして固定しない。

### 2.3 Information typeごとのCanonical Source

「コードを正本」と一括りにしない。情報種別ごとに以下をCanonical Sourceとする。

| 情報 | Canonical Source |
| --- | --- |
| Expected Product Behavior | `docs/spec/` のNormative領域 |
| Business Rule / Acceptance Criteria | `docs/spec/` のBR / AC |
| Unresolved Product Behavior | Specification SystemのUnresolved領域 |
| Seed Scenario ID / Test Data Scenario | `src/seeds/metadata.ts`等のExecutable Source |
| Domain Type / State | DomainのExecutable Source。ただし期待挙動はSpecへ従う |
| Playwright Project / Test Match | `playwright.config.ts` / `playwright.training.config.ts` |
| Package Command | `package.json` |
| Formal Web Regression | `e2e/web/` |
| Formal Native Regression | `maestro/` |
| Training Web Test | `training/playwright/` |
| Training Native Flow | `training/maestro/` |
| Android / iOS CI Guarantee | `.github/workflows/` + Current ADR |
| Current Implementation | Application Code |
| Observed Behavior | 実行したApplication |
| Supporting説明 | README / Guide / PROJECT_CONTEXT |

### 2.4 Curriculum baseline

対象は以下20文書すべてとする。

```text
docs/curriculum/test-automation/
├ README.md
├ 00_learning-design.md
├ 01_spreadsheet-test-design.md
├ part1/
│  ├ 01_test-automation-foundations.md
│  ├ 02_scenario-shop-analysis.md
│  ├ 03_test-design-and-automation-selection.md
│  ├ 04_playwright-foundations.md
│  ├ 05_playwright-e2e-practice.md
│  ├ 06_execution-and-failure-analysis.md
│  ├ 07_maestro-native-automation.md
│  ├ 08_test-management-and-maintainability.md
│  └ 09_part1-capstone.md
└ part2/
   ├ 01_software-development-process.md
   ├ 02_git-version-control.md
   ├ 03_github-pull-request-review.md
   ├ 04_ci-github-actions.md
   ├ 05_playwright-ci.md
   ├ 06_native-ci-maestro.md
   ├ 07_ci-cd-quality-gates.md
   └ 08_integration-design-capstone.md
```

---

## 3. Assumptions

以下が崩れた場合は実装前または実装中にPlanを見直す。

- Specification Foundation Implementationが本Plan実装前に`main`へMergeされる。
- Specification FoundationがNormative / Supporting境界、BR / AC ID、Validation Contractを提供する。
- Native Phase 2後半のCurrent Product Scopeを大きく覆す別PRが同時進行していない。
- iOS Formal CIはADR-0011のBuild-only方針を維持する。
- Existing Formal RegressionはTraining Scratch Spaceへ転用しない。
- Initial Training ReleaseではWindowsをNative learner pathのCanonical Environmentとする。
- macOSはWeb学習とOptional Native比較を許容するが、初版のNative Required Completion Environmentにはしない。
- Linux Desktopは初版Learner SupportのRequired範囲外とする。
- Instructor ReferenceはPublic Repository内へ保存されるため秘密情報として扱わない。
- Delivery Readiness確認では、本体RepositoryとProduction Secretから分離されたInstructor管理のGitHub Training Copy remoteを利用できる。remoteが一時的に利用できない場合でも独立実装は継続するが、最終Delivery Ready判定は保留する。

---

## 4. Non-goals

- Scenario Shopへの新しいBusiness Feature大量追加
- Coupon / Point / Refund / Return等の教材都合のProduct機能追加
- API Testing専用Curriculumの新設
- Performance / Security / Mutation / Chaos Testing講座の新設
- Visual Regression Toolの本格導入
- AI QA / Agentic QAをPart 1 / Part 2の必須学習へ追加
- iOS Runtime CIの復活
- iOS Runtimeを教材完了条件へ追加
- Existing Regression Suiteの全面書換え
- 全Existing TestへのTest Case ID一括付与
- POMの必須化
- Curriculum対応を理由としたProduct Architecture全面Refactor
- Instructor AnswerをAccess Controlで秘匿する仕組み
- Formal CIのchange detection最適化
- Training用Intentional FailureをRequired CIの通常PASS Suiteへ混在させること

今回優先するVertical Scopeは次に固定する。

```text
Automation Purpose
↓
Specification / Target Analysis
↓
Risk
↓
Test Design
↓
Test Layer / Automation Selection
↓
Playwright / Maestro
↓
Failure Analysis
↓
Maintainability
↓
Git / Review
↓
CI / Quality Gate
```

---

## 5. Repo mapping

### 5.1 Entry points

実装開始時に最低限以下を読む。

- `AGENTS.md`
- `PLANS.md`
- `.agents/skills/feature-plan/SKILL.md`
- `docs/PROJECT_CONTEXT.md`
- Current `docs/spec/README.md`
- Current Specification validation scripts
- `docs/adr/0011-native-ci-ios-build-only-gate.md`
- `README.md`
- `package.json`
- `tsconfig.json`
- `playwright.config.ts`
- `e2e/web/`
- `maestro/`
- `src/seeds/metadata.ts`
- `scripts/native/windows/android-local.ps1`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `docs/curriculum/test-automation/**`

### 5.2 Main flow

Current Learning Flowは概ね以下である。

```text
Part 1
Automation基礎
→ Scenario Shop分析
→ Test Design / Automation Selection
→ Playwright
→ Failure Analysis
→ Maestro
→ Maintainability
→ Capstone

Part 2
Development Process
→ Git
→ GitHub / PR / Review
→ CI基礎
→ Playwright CI
→ Native CI
→ Quality Gate
→ Integration Capstone
```

本Implementationではこの骨格を壊さず、Specification TraceabilityとTraining実体を接続する。

### 5.3 Key abstractions

- Normative Specification / BR / AC
- Risk / Test Condition / Test Case
- Test Layer / Tool
- Seed Scenario / Test Control
- Formal Regression / Training Test
- Baseline PASS / Intentional Failure Exercise
- Evidence / Failure Taxonomy
- Competency / Rubric
- Build / Runtime / Artifact / Quality Gate
- Source Repository / Disposable Training Copy / GitHub Training Copy

### 5.4 Existing tests / gates

- Unit / Integration / Repository Contract / Component / Contract Tests
- Web Playwright E2E / Accessibility / Mobile / Cross-role / Smoke
- Android Native Build / Runtime / Maestro
- iOS Build-only CI
- Markdown / ESLint / Typecheck / Build / `pnpm run verify`

### 5.5 Safe change surface

今回変更してよい主な領域は以下とする。

- Curriculum docs
- Training専用Directory / Config / Script
- Training CI template
- Training Copy preparation / validation script
- Curriculum validation script
- Training TypeScript config
- Package Script
- `.github/workflows/ci.yml`への`validate:curriculum` / Training Web baseline smoke接続
- `.github/workflows/native-ci.yml`への最小Training Maestro baseline smoke接続
- 必要最小限のContract Test
- Curriculum / Training Navigation docs

Product Business Logic、Formal RegressionのExpectation、Formal Production / Deploy Contractは原則変更しない。Formal CIへの追加は**既存Gateを弱めず、Training資産の最小継続検証を追加する範囲**に限定する。

### 5.6 Unknowns

Blocking Unknownは本Plan時点で残さない。

実装中に以下のContractへ影響するUnknownが発見された場合、実装者が推測で決めずPlan / TASKSへ記録して判断を更新する。

- Training Path
- Workflow activation方式
- Supported OS
- Workbook format / schema / ID grammar
- DoD
- Security / Production separation
- Specification Oracle
- Required CI wiring
- Android Runtime AVD contract

---

## 6. Impacted areas / Files to inspect

### 6.1 Curriculum

- `docs/curriculum/test-automation/**`

追加候補を以下に固定する。

- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`

文書責務が重複する場合は統合してよいが、Learner向け本文とInstructor ReferenceのNavigationは分離する。

### 6.2 Training Playwright

以下をTarget Architectureとする。

```text
playwright.config.ts
→ Formal Regression専用

playwright.training.config.ts
→ Training専用

training/playwright/
├ baseline/
│  └ Repository-owned PASS sample / smoke
├ exercises/
│  └ Learner starter / practice
└ failure-exercises/
   └ 明示実行時のみExpected FAILとなる教材
```

Evidence候補:

- `output/training/playwright/`

Rules:

- Training specを`e2e/web/`へ混在させない。
- Default Training commandとRequired CIは`baseline/`だけを実行する。
- `failure-exercises/`を通常PASS Suiteへ含めない。
- Failure exercise検証は「TestがFAILしたこと」と「Evidenceが生成されたこと」を確認したうえで、Validation Script自体は成功終了できるContractにする。

### 6.3 Training Maestro

```text
maestro/
→ Formal Regression専用

training/maestro/
├ baseline/
│  └ Required PASS flow
├ exercises/
│  └ Learner practice
└ failure-exercises/
   └ 必要な場合だけ置くExpected FAIL教材
```

Evidenceは`output/training/maestro/`またはGit管理外の`.artifacts`配下へ出す。

Rules:

- Training FlowをFormal Maestro Suiteへ混在させない。
- Required CIでは`baseline/`だけを実行する。
- Native Failure Exercise自体は必須数を増やさず、教育上必要なものだけ置く。

### 6.4 Workbook

CSVをRepository上のCanonical Templateとする。

```text
training/workbook/
├ README.md
├ 01_target-risk.csv
├ 02_test-cases.csv
├ 03_automation-mapping.csv
└ 04_execution-improvement.csv
```

Google SheetsはCSVをImport / Copyして使用するDelivery Surfaceとし、Google Sheets固有機能をSSOTにしない。

### 6.5 Training GitHub Actions / Training Copy

Training Workflow Templateは教材元Repositoryで自動起動しないPathへ置く。

```text
training/github-actions/
├ README.md
├ training-ci.yml
└ training-native-ci.yml
```

Training Copy作成を人手のファイル操作だけにしない。最低限次を新設する。

- `scripts/training/prepare-training-copy.ts`
- `scripts/training/validate-training-copy.ts`

`prepare-training-copy`はSource Repositoryを破壊せず、指定したDisposable Targetに対してのみ次を行う。

1. Git Historyを保持したTraining Copyを準備する。
2. Formal Production / Deploy WorkflowをTraining Copy側で非実行化する。
3. Training Workflow TemplateをTraining Copyの`.github/workflows/`へ有効化する。
4. Production Secretを要求する設定を追加しない。
5. Source RepositoryのFormal Workflowを削除・変更しない。

`validate-training-copy`は最低限次を機械検証する。

- Training Workflowが有効化されている。
- Formal Production / Deploy WorkflowがTraining PR Triggerとして残っていない。
- Production Secret参照がない。
- Cloudflare Deploy等のProduction Deploy Stepがない。
- Training WorkflowがRepository-owned Training commandだけを参照する。

Local disposable copyの既定出力はGit管理外の`.artifacts/training-copy/<run_id>/`相当とし、完了時にSource Working Treeへ不要差分を残さない。

### 6.6 Curriculum validation / Required CI

以下をTargetとする。

- `scripts/validate-curriculum.ts`
- `package.json`へ`validate:curriculum`
- `pnpm run verify`へ接続
- `.github/workflows/ci.yml`の既存Required Quality Jobへ`pnpm run validate:curriculum`を**明示的に追加**

Current Phase 1 CIは`pnpm run verify`を直接実行しないため、`verify`への接続だけでRequired Gateになったとみなさない。

新しい専用Jobを増やすこと自体は目的にしない。既存`code-quality`等の自然なRequired Jobへ追加できる場合はそれを優先する。

### 6.7 Training TypeScript quality

Training TypeScriptをFormal Quality Gateから漏らさない。

Target:

- `tsconfig.training.json`
- `package.json`へ`typecheck:training`
- 既存`typecheck`から`typecheck:training`を呼ぶ

`tsconfig.training.json`はCurrent TypeScript Contractを継承し、最低限以下を含める。

- `playwright.training.config.ts`
- `training/**/*.ts`

Intentional Failure ExerciseはAssertion / Locator / State等のRuntime Failureとして作り、Source Repository上の教材Template自体にはType Errorを残さない。

### 6.8 Formal CI baseline smoke

Training Runtime Driftを継続検出するため、Repository-owned baselineだけをFormal CIへ接続する。

#### Web

Current Phase 1 CIのAutomation Build Artifactを再利用し、既存E2E Job / MatrixへTraining Web baseline smokeを追加する方式を優先する。

- `training/playwright/baseline/`だけを実行する。
- `failure-exercises/`はRequired CIへ入れない。
- 新しいWeb Buildを重複させない。

#### Native

Current `native-ci.yml`のAndroid Runtime / Maestro Jobで既に起動しているEmulatorとAutomation APKを再利用し、`training/maestro/baseline/`の最小Flowを追加実行する方式を優先する。

- Training用に別Emulator / 別APK buildを増やさない。
- Formal MaestroのExpectationを変更しない。
- Training baseline failureはRepository-owned教材DriftとしてRequired CI failureにする。

---

## 7. Fixed implementation decisions

### 7.1 Training Playwright

- Separate Config方式を採用する。
- `playwright.training.config.ts`の`testDir`は`training/playwright`とする。
- Formal `playwright.config.ts`へLearner Testを追加しない。
- Default Training commandは`baseline/`または明示的に選択したLearner exerciseだけを実行する。
- Required CIは`baseline/`だけを実行する。
- Failure Exerciseは専用Commandで明示実行する。
- Seed Reset / Test APIは既存Automation Build Contractを再利用する。
- Trace / Screenshot / Video / HTML ReportをTraining Evidenceとして確認できるようにする。
- `playwright.training.config.ts`と`training/**/*.ts`は`typecheck:training`対象とする。

### 7.2 Training Maestro

- `training/maestro/`をLearner Flowの唯一の標準Pathとする。
- AndroidをRequired Platformとする。
- `baseline/`をRequired CI / Required Completionの標準Flowとする。
- Existing Test Control / Deep Link Contractを再利用する。
- iOS RuntimeはOptional Comparisonに留める。

### 7.3 Workbook ID Grammar

CSVの複数ID Fieldは次に固定する。

- `br_ids` / `ac_ids`等で複数IDを持つ場合は**`;`区切り**を使用する。
- 例: `BR-CART-001;BR-CART-002`
- 区切り前後へ不要な空白を入れない。
- 同一Field内の重複IDを禁止する。
- 空Fieldは「その行へ直接対応するBR / ACがない」場合だけ許可する。
- BR / ACが空でも`spec_ref`と`risk_id`等、理由を追跡できる上位Traceabilityを失わない。
- Validatorは非空IDのGrammar / uniqueness / Current Spec reference integrityを確認する。

### 7.4 Training CI

Web Training CIとAndroid Training CIの両方を**Required Asset**とする。

Web Training CIの最小責務:

```text
Checkout
→ Setup Node / pnpm
→ Install
→ Quality Check
→ Web Build
→ Chromium Install
→ Training Playwright baseline
→ Evidence Upload
```

Android Training CIの最小責務:

```text
Checkout
→ Setup Node / pnpm / Java
→ Install
→ Android Automation Build
→ Emulator boot
→ APK install
→ Training Maestro baseline
→ Evidence Upload
```

Current Formal Native CIの全機能をTraining CIへ複製しない。まず理解可能な最小構成を教材Templateとし、Part 2でCurrent Build / Runtime分離と比較させる。

### 7.5 Training Copy policy / Execution proof

Part 1はGitHub Accountを必須にしないためLocal Copy / ZIPを許容する。

Part 2開始時はGit Historyを持つ専用Training Copyへ移行する。

Training Copy preparationは`prepare-training-copy`へ集約し、「無効化または除外」のような受講者判断へ委ねない。

Implementation PRで証明するものを次へ固定する。

#### Merge Gateで証明するもの

- Disposable Local Training CopyをScriptで生成できる。
- `validate-training-copy`が成功する。
- Training Workflow TemplateがRepository-owned commandだけを参照する。
- Web Training baselineがSource Required CIでPASSする。
- Android Training baselineがSource Native Required CIでPASSする。
- Production / Deploy Workflow隔離Contractを機械検証できる。

#### Delivery Readiness Gateで証明するもの

Instructor管理のGitHub Training Copy remoteへImplementation candidate commitまたはMerge commitを反映し、次を1回以上実行する。

- Training Web Workflow PASS
- Android Training Workflow PASS
- Failure Artifact取得
- Production / Deploy Workflow非起動
- Production Secret不要

Evidenceとして最低限以下をRun `REPORT.md`へ記録する。

- Training Copy repository / branch識別情報
- Source commit SHA
- GitHub Actions run URL / run ID
- Web / Android result
- Artifact名

**Delivery Readiness Gateは2本目のImplementation PRを意味しない。** 外部Training Copyでの実行証明であり、Source変更は同じCurriculum Implementation PRへ集約する。

Training Copy remoteが一時的に利用できない場合はDelivery ValidationだけをBlockedとし、独立Waveは継続する。ただし最終的な「Training Delivery Ready」は宣言しない。

### 7.6 Learner environment support / Android Runtime Contract

初版のCanonical Local Environmentを以下に固定する。

#### Web

- Windows 11をPrimaryとして手順を保証する。
- Node.js 24
- pnpm 9.10.0
- Chromium / Playwright

#### Android Build Contract

- Windows 11
- PowerShell
- Java 17
- Android Compile SDK 36
- Android Build Tools 36.0.0
- Maestro 2.8.0

#### Android Runtime Emulator Contract

Current Formal CIと大きく乖離させないため、初版Required Runtimeを以下に固定する。

- Runtime API: 34
- System Image: `system-images;android-34;google_apis;x86_64`
- ABI: `x86_64`
- Device Profile: `pixel_2`
- Training AVD Name: `scenario-shop-training-api34`
- Emulator boot完了後にADB deviceを1台へ確定してTraining commandへ渡す。

Existing `scripts/native/windows/android-local.ps1`は接続済みDevice以降のDoctor / Build / Install / Test Contractとして再利用する。

AVD作成・起動・boot待機はTraining専用Helperへ分離する。

Target:

- `scripts/training/android-emulator.ps1`

最低責務:

1. `sdkmanager` / `avdmanager` / `emulator` / `adb`を確認する。
2. API 34 `google_apis` `x86_64` system imageを確認・必要なら導入手順を案内する。
3. `scenario-shop-training-api34`を決定的に作成または再利用する。
4. Emulatorを起動する。
5. `sys.boot_completed=1`等の意味のある状態まで待機する。
6. 対象Serialを確定する。
7. Existing `android-local.ps1`へ対象Deviceを引き渡せる状態にする。

Compile SDK 36とRuntime API 34を「同じAPI Levelでなければならない」と誤解させない教材説明を追加する。

#### Alternative

- macOSのWeb学習はSupported。
- macOS Native / iOS SimulatorはOptional / Best-effort extension。
- Linux Desktopは初版Required Support外。

Platform対応を広げるために本PRを止めない。

### 7.7 Instructor Reference

Public Repository内のInstructor資料は秘密にできないため、`Instructor-only`ではなく**Instructor Reference**と呼ぶ。

- Learnerの標準Navigationから外す。
- 演習前に参照しない運用を明記する。
- Access Control / Secret化はしない。
- 完成Code 1つを唯一の正解にしない。

### 7.8 Workbook schema

#### `01_target-risk.csv`

最低限の列:

- `target_id`
- `spec_ref`
- `br_ids`
- `ac_ids`
- `risk_id`
- `risk_description`
- `impact`
- `likelihood`
- `priority`

#### `02_test-cases.csv`

- `test_case_id`
- `risk_id`
- `spec_ref`
- `br_ids`
- `ac_ids`
- `test_condition`
- `precondition`
- `expected_result`
- `design_technique`

#### `03_automation-mapping.csv`

- `test_case_id`
- `automation_decision`
- `test_layer`
- `tool`
- `implementation_path`
- `execution_timing`
- `reason`

#### `04_execution-improvement.csv`

- `test_case_id`
- `run_context`
- `result`
- `evidence`
- `failure_category`
- `cause`
- `action`
- `improvement`

初学者へ全列を最初から入力させず、Lessonごとに使用Columnを段階的に解放する。

---

## 8. Competency Model

Curriculum全体で共通して評価するCompetencyを以下12個へ固定する。

### C01 Automation Purpose / Scope

- Automationの目的と限界を説明できる。
- ManualとAutomationの補完関係を説明できる。
- 自動化しない判断を説明できる。

### C02 Test Target / Specification Analysis

- Role / State / Data / Dependency / Business Rule / User Journeyを整理できる。
- Normative Specification / BR / ACからExpected Behaviorを読み取れる。
- Implementation / Existing Test / Observed BehaviorをOracleと混同しない。

### C03 Risk Analysis

壊れた場合のUser / Business Impactと発生可能性から優先度を説明できる。

### C04 Test Design

同値分割、境界値、Decision Table、State Transition、Role Matrix等を必要に応じて適用できる。

### C05 Test Layer Selection

Unit / Integration / Repository Contract / Component / Web E2E / Native E2Eの責務を理解し、Riskを適切なLayerへ配置できる。

### C06 Automation Selection

自動化する / しない / LaterをRisk・頻度・再現性・判定可能性・Costから判断できる。

### C07 Web Automation

Playwrightで再現可能かつ意味のあるLocator / Assertion / Test Dataを使ったE2Eを実装できる。

### C08 Native Automation

Maestro / Stable UI Test ID / Deep Link / Test Controlを利用し、Androidを標準にNative E2Eを実装できる。

### C09 Failure Analysis

EvidenceからFailureを分類し、原因仮説、確認、修正、再発防止まで進められる。

### C10 Maintainability

重複、Flaky、責務混在、不要Test、実行時間を見つけ、Helper / POM / Fixture / Flow等を選べる。

### C11 Change Management

Git / PR / Reviewを使い、Test変更をProduction Codeと同じ品質資産として管理できる。

### C12 Continuous Execution Design

CI Trigger、Quality Gate、Artifact、Platform、Cost、Failure Evidenceを設計できる。

### 8.1 Competency Level

| Level | 定義 |
| --- | --- |
| 0 | 説明・実施できない、または誤った理解で実施する |
| 1 | 手順や講師支援があれば実施できる |
| 2 | 自力で実施し、判断理由とEvidenceを説明できる |
| 3 | 複数案とTrade-offを比較し、改善案まで提案できる |

Part 1は原則C01〜C10の主要項目でLevel 2を目標とする。

Part 2はC01〜C12の主要項目でLevel 2以上を目標とし、Capstoneの主要設計判断では一部Level 3相当を求める。

最低Test本数はPractice Volumeであり、単独の合否条件にしない。

---

## 9. Specification Traceability Contract

テスト設計の標準Flowを以下へ統一する。

```text
Normative Specification
↓
Business Rule / Acceptance Criteria
↓
Risk
↓
Test Condition
↓
Test Case
↓
Test Layer / Tool
↓
Automation implementation
↓
Execution Evidence
```

### 9.1 Oracle rules

- Expected BehaviorはNormative Specificationから判断する。
- ApplicationはCurrent Implementationとして観測する。
- Existing Testは既存検証資産として比較する。
- README / GuideはSupporting Informationとして扱う。
- Seed ID等はExecutable Canonical Sourceへ従う。

### 9.2 Specification ambiguity

Expected Behaviorが確定できない場合はImplementationから仕様を作らない。

```text
SpecでExpectedを確定できない
↓
Unresolved / Known Deviationを確認
↓
Specification Issueとして記録
↓
Product Defectと断定しない
```

### 9.3 Namespace

以下を混同しない。

- BR ID: Business Rule
- AC ID: Acceptance Criteria
- Risk ID: Risk
- Test Case ID: Test Condition / Case traceability
- UI Test ID: UI element identification

---

## 10. Failure Taxonomy

Part 1 / Part 2で同じ分類語彙を使う。

- Product Defect
- Test Code Defect
- Test Data / Seed Defect
- Locator Defect
- Synchronization / Timing Defect
- Harness / Test Control Defect
- Environment / Toolchain Defect
- External Dependency Defect
- Specification Issue / Ambiguity
- Expected Product Change
- Flaky / Non-deterministic
- Unknown / Investigation Required

分類はラベル付け自体を目的にせず、修正対象を誤らないために使う。

---

## 11. Curriculum Rebaseline Matrix

| File | Required direction | Priority |
| --- | --- | --- |
| `README.md` | Current iOS保証、Spec Oracle、Training実入口、Part 1/2 Outcome | P1 |
| `00_learning-design.md` | C01〜C12、Competency評価、Spec→Risk Flow、Training境界 | P1 |
| `01_spreadsheet-test-design.md` | CSV Workbook、BR/AC/Risk Traceability、`;`区切りGrammar、Progressive Disclosure | P1 |
| `part1/01_test-automation-foundations.md` | C01 Automation Purpose / Scopeへ接続 | P1 |
| `part1/02_scenario-shop-analysis.md` | Normative SpecとObserved Behaviorを分離 | P1 |
| `part1/03_test-design-and-automation-selection.md` | Spec→Risk→Design→Layer→Automation | P1 |
| `part1/04_playwright-foundations.md` | Coding Bridge、Training Config / Command | P2 |
| `part1/05_playwright-e2e-practice.md` | Training Playwright実Path、baseline / failure separation、Seed / Evidence | P1 |
| `part1/06_execution-and-failure-analysis.md` | Failure Taxonomy、Evidence、Expected Fail Exercise | P1 |
| `part1/07_maestro-native-automation.md` | Training Maestro実Path、Android Runtime AVD Contract、iOS Optional | P1 |
| `part1/08_test-management-and-maintainability.md` | Spec変更Lifecycle、不要Test削除判断 | P2 |
| `part1/09_part1-capstone.md` | Cart Core維持、Competency Evidence、Advanced段階化 | P1 |
| `part2/01_software-development-process.md` | Spec Change→Implementation→Review→Test | P2 |
| `part2/02_git-version-control.md` | Script化したTraining Copy実手順、Part 1 artifact移行 | P1 |
| `part2/03_github-pull-request-review.md` | Spec/Test/Validation Traceability | P2 |
| `part2/04_ci-github-actions.md` | Training Template有効化、Merge Gate / Delivery Gate、安全境界 | P1 |
| `part2/05_playwright-ci.md` | Training Web CI / Artifact実手順、Repository baseline smoke | P1 |
| `part2/06_native-ci-maestro.md` | Android Training CI、API 36 build / API 34 runtime、Current iOS Build-only | P1 Critical |
| `part2/07_ci-cd-quality-gates.md` | Platform別保証Level、Required Gate判断 | P1 |
| `part2/08_integration-design-capstone.md` | Current保証との比較、C11/C12評価 | P1 |

### 11.1 Part 1 Capstone

CoreはCartを維持する。

Advancedを以下の3系統へ分ける。

#### Purchase Journey

```text
Guest Cart
→ Login
→ Cart Merge
→ Address
→ Checkout
→ Payment
→ Order
```

#### Failure / Recovery

```text
Payment Failure
→ Retry
→ Paid
```

#### Cross-role Lifecycle

```text
Customer Purchase
→ Operator Shipment
→ Customer Review
```

Core修了へAdvanced全件を要求しない。

---

## 12. Coding Bridge

General-purpose JavaScript講座は作らない。

Playwright学習で必要になったタイミングに限定して以下を扱う。

- Function parameter / return
- Object / Array
- Destructuring
- import / export
- async / await
- Type annotation / narrowing
- `map` / `filter`
- Error / try-catchの基本
- Classの読み方
- Object composition
- Promise / `Promise.all`の概念

---

## 13. Change strategy / Wave Plan

教材本文は、参照するTraining資産が存在してから最終確定する。これにより「Lessonが存在しないPath / Commandを参照する」状態を避ける。

### 13.1 Execution continuity contract

1PRを途中の局所障害で止めないため、Blockerを次の2種類へ分ける。

#### Local Blocker

特定Task / Wave / Validationだけに影響し、他の正当性を評価できるもの。

例:

- Windows Emulatorが一時的に起動しない。
- Instructor管理Training Copy remoteが一時的に利用できない。
- 1つのFailure Exerciseだけが未完成。

Local Blocker発生時:

1. 該当TaskをBlockedとして`TASKS.md` / `REPORT.md`へ記録する。
2. 依存Taskだけを止める。
3. Curriculum、Workbook、Web Training、Rubric等、独立して進められるTaskは継続する。
4. Final ValidationまでにRequired Blockerを解消する。

#### Global Blocker

Implementation全体の正本や安全性を評価できないもの。

例:

- Specification Foundation Contractが利用不能。
- Latest `main`が広範囲に壊れ、Baselineを確定できない。
- Required Source Repositoryへアクセスできない。

Global BlockerだけWhole-run停止条件とする。

#### Final fail-close

途中でBlocked / Skipを記録してもよいが、Required項目に未解決Blockerを残したままImplementation完了扱いにしない。

### Wave 0 — Baseline / Contract Freeze

作業:

- Latest `main` / Spec / Product / Test / Native / CIを再確認する。
- Information typeごとのCanonical Sourceを再確認する。
- Curriculum 20 / 20文書をInventoryする。
- Current iOS Build-onlyを確認する。
- Android Build 36 / Runtime 34 Contractを再確認する。
- Current Phase 1 CIで`validate:curriculum`を接続すべきRequired Jobを確認する。
- Open PR / dependency影響を確認する。
- `.codex/runs/`のPlan / TASKSへ本Wave構造を落とす。

Gate:

- Blocking Unknownが0件。
- Current factsとDecisionを分離できている。

### Wave 1 — Curriculum Contract / Training Architecture / Competency

作業:

- C01〜C12とLevel 0〜3を正本化する。
- Part 1 / Part 2修了基準を固定する。
- Core / Advancedを固定する。
- Training Path / baseline / failure exercise / Config / CI Template / Workbook / OS Support Contractを本Planどおり確認する。
- Instructor Reference skeletonを作る。

Gate:

- 後続WaveがPathやPlatform方針を再判断する必要がない。

### Wave 2 — Specification Traceability / Workbook

作業:

- CSV 4ファイルとREADMEを作る。
- Spec / BR / AC → Risk → Test Case → Automation Mappingを実装する。
- `;`区切りID GrammarをREADMEへ明記する。
- Sample Caseを少数だけ入れる。
- 完成Answerを埋めすぎない。

Validation:

- Sample CaseでSpecからImplementation Pathまで辿れる。
- Multiple ID fieldをGrammarどおりparseできる。
- CSVをGoogle SheetsへImport可能な形で保持する。

### Wave 3 — Training Playwright Foundation

作業:

- `playwright.training.config.ts`
- `training/playwright/baseline/`
- `training/playwright/exercises/`
- `training/playwright/failure-exercises/`
- `tsconfig.training.json`
- Training Package Script
- `typecheck:training`
- Seed Reset / Test API利用
- Training Evidence
- Formal Regression isolation validation

Validation:

- Training baselineだけを実行してPASSする。
- Formal `e2e/web/`へLearner Testが混ざらない。
- `typecheck:training`が成功する。
- Intentional Failure専用Commandは期待どおりFAILし、Trace / Screenshot / Video / Reportを生成する。
- Expected Failure Validation自体は「期待したFAIL + Evidenceあり」を成功として判定できる。

### Wave 4 — Training Maestro / Android Foundation

作業:

- `training/maestro/baseline/`
- `training/maestro/exercises/`
- 必要な場合のみ`training/maestro/failure-exercises/`
- `scripts/training/android-emulator.ps1`
- Android local setup / command
- Test Control Reset
- baseline Flow
- Evidence
- Formal `maestro/`との分離

Validation:

- Compile SDK 36 / Build Tools 36.0.0を確認する。
- API 34 `google_apis` `x86_64` AVDを決定的に準備できる。
- Canonical Windows環境でEmulator boot → Doctor → Build → Install → Launch → Training baseline Flowを通す。
- Formal MaestroとTraining baselineを分離できる。
- iOS RuntimeをRequired Validationにしない。

### Wave 5 — Training Copy / GitHub Actions Foundation

作業:

- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/prepare-training-copy.ts`
- `scripts/training/validate-training-copy.ts`
- Training Copy preparation / activation README
- Web Failure Artifact
- Android Maestro Evidence
- Formal Workflow非競合Gate

Validation — Merge Gate:

- Disposable Local Training Copyを生成する。
- Training TemplateがTarget `.github/workflows/`へ有効化される。
- Formal Production / Deploy WorkflowがTraining PR Triggerとして残らない。
- Production Secret参照なし。
- Cloudflare Deployなし。
- `validate-training-copy` PASS。
- Source Working Treeへ不要差分なし。

Validation — Delivery Readiness Gate:

Instructor管理GitHub Training Copy remoteが利用可能なら、Implementation candidate commitでWeb / Android Training Workflowを実行する。

- Web Training CI PASS。
- Android Training CI PASS。
- Failure Artifactを確認する。
- Production / Deploy Workflow非起動を確認する。
- Run URL / commit SHA / Artifact名を`REPORT.md`へ記録する。

remoteが一時的に利用できない場合はDelivery GateだけBlockedとし、Wave 6以降の独立作業を継続する。

### Wave 6 — Part 1 Curriculum Rebaseline

Training実Path / Commandが確定した後にPart 1全文書を改訂する。

作業:

- Automation Purpose / Spec / Risk / Test Design Flow
- Coding Bridge
- Training Playwright baseline / exercise / expected failure実手順
- Failure Taxonomy
- Android Build 36 / Runtime AVD 34を区別したTraining Maestro実手順
- Maintainability
- Core / Advanced Capstone
- Competency Mapping

Gate:

- Part 1全LessonでPath / Command /用語 /完了条件が実装と一致する。

### Wave 7 — Part 2 Curriculum Rebaseline

Training CI実体が存在してからPart 2全文書を改訂する。

作業:

- Script化したTraining Copy移行
- Git / GitHub / PR
- Web Training CI
- Android Training CI
- Merge Gate / Delivery Readiness Gate
- Current Formal CI比較
- Android Build API / Runtime API差
- iOS Build-only全面反映
- Quality Gate / Cost / Reliability
- Integration Capstone

Gate:

- Current Workflowと教材のCurrent Factに差異がない。
- Training CIとFormal CIの責務を区別できる。

### Wave 8 — Instructor / Setup / Recovery

作業:

- Learner Navigation
- Instructor Reference
- Rubric詳細
- Expected Contract / Alternative Design / Anti-pattern
- Failure Exercises
- Web Start Gate
- Android AVD / Start Gate
- Troubleshooting
- Part 1 → Part 2 migration

Gate:

- 講師の暗黙知がRequired手順として残らない。
- AVD未作成 / system image不足 / Emulator boot failureをRecovery手順で扱う。

### Wave 9 — Curriculum Validator / Required CI / Repository-wide Integration Review

作業:

- `scripts/validate-curriculum.ts`
- `validate:curriculum`
- `verify`接続
- `typecheck:training`のRepository typecheck接続
- `.github/workflows/ci.yml`のRequired Quality Jobへ`validate:curriculum`追加
- Phase 1 CIへTraining Web baseline smoke追加
- Native Runtime CIへTraining Maestro baseline smoke追加
- 全20文書 + Training assetsの整合Review

Validatorは最低限以下を決定的に確認する。

- Required Training Pathの存在
- Workbook header contract
- `;`区切りMultiple ID Grammar
- Training Playwright Config / testDir contract
- Training CI Templateの存在
- Training Copy preparation / validation Scriptの存在
- Curriculumが参照するRepository-owned Package Scriptの存在
- 明示的Relative Linkの存在
- Sample Spec / BR / AC referenceのIntegrity

自然文からWorkflow Job名や全Seed IDを推測抽出するような複雑なParserは作らない。

Validation:

- `pnpm run validate:curriculum`がLocalでPASSする。
- `pnpm run typecheck`でTraining TypeScriptまでPASSする。
- Required Phase 1 CI上で`validate:curriculum`が実行される。
- Training Web baseline smokeがSource CIでPASSする。
- Training Maestro baseline smokeがSource Native CIでPASSする。

### Wave 10 — End-to-End Fresh Learner Validation

「初見」を以下のContractで定義する。

- Fresh checkout / Fresh Training Copyから開始する。
- Learner向けREADME / Curriculumだけを標準入口にする。
- Instructor Referenceを見ない。
- Existing Formal Regressionを演習前のAnswerとして先読みしない。
- Learner用Commandだけを使用する。

最低限以下を順に通す。

```text
Setup
↓
Scenario Shop exploration
↓
Specification
↓
Risk / Workbook
↓
Training Playwright baseline
↓
Intentional Failure / Evidence
↓
Android AVD preparation
↓
Training Maestro baseline
↓
Part 1 Capstone
↓
Training Copy migration
↓
Git / GitHub / PR
↓
Web Training CI
↓
Android Training CI
↓
Current Formal CI comparison
↓
iOS Build-only analysis
↓
Quality Gate design
↓
Part 2 Capstone
```

Merge Gate:

- Required Learner JourneyのLocal / Source CIで検証可能な部分が手順の空白なく完走する。
- Blocked / SkipをSource Repository Required項目へ残さない。

Delivery Readiness Gate:

- Instructor管理GitHub Training CopyでWeb / Android Training Workflowの実Run Evidenceがある。
- Production / Deploy Workflow非起動を確認済み。
- Production Secret不要を確認済み。
- Delivery GateがBlockedの場合、「Implementation Merge Ready」と「Training Delivery Ready」を明確に分け、後者を完了扱いにしない。

---

## 14. Validation plan

### 14.1 Static / Repository Quality

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run typecheck:training`
- `pnpm run validate:spec`
- `pnpm run validate:curriculum`
- `pnpm run test`
- `pnpm run build:web`
- `pnpm run verify`

`typecheck:training`が既存`typecheck`から呼ばれる最終Contractなら重複実行は不要だが、実装時のEvidenceではTraining TypeScriptが対象に含まれることを確認する。

### 14.2 Training Web

- Baseline minimal PASS
- Seed Reset
- Mobile Training execution
- Intentional Failure専用Command
- Expected FAILを確認
- Trace / Screenshot / Video / HTML Report確認
- Formal Regression isolation確認
- Source Phase 1 CI baseline smoke PASS

### 14.3 Training Android

- Build Contract: Compile SDK 36 / Build Tools 36.0.0
- Runtime Contract: API 34 / `google_apis` / `x86_64` / `pixel_2`
- AVD create / reuse
- Emulator boot
- Doctor
- Build
- Install
- Launch
- Test Control Reset
- Training Maestro baseline PASS
- Evidence確認
- Formal Maestro isolation確認
- Source Native CI baseline smoke PASS

### 14.4 Training Copy / CI

#### Merge Gate

- Disposable Local Training Copy生成
- `validate-training-copy` PASS
- Training Template activation確認
- Formal Production / Deploy Workflow isolation確認
- Production Secret参照なし
- Source Required CIでTraining baseline command PASS

#### Delivery Readiness Gate

- GitHub Training Copy Web Workflow PASS
- GitHub Training Copy Android Workflow PASS
- Failure Artifact取得
- Production / Deploy Workflow非起動
- Production Secret不要
- Run URL / commit SHA / Artifact名記録

### 14.5 Formal Regression

Training用`package.json`変更等によってCurrent Native CIが起動することはExpectedとする。

Agentは「Native Codeを変えていないから」という理由だけでNative CI path filterを弱めたり、`package.json`をchange detection対象から外したりしない。

- Required Phase 1 CI
- Required Native CI
- iOS Build-only Gate

をCurrent Contractどおり確認する。

### 14.6 Required CI assertion

CIがGreenであることだけでなく、今回追加したGateが**実際に実行されたこと**を確認する。

最低限:

- Phase 1 Required Job logに`validate:curriculum`実行がある。
- Phase 1 CIにTraining Web baseline smoke実行がある。
- Native Runtime JobにTraining Maestro baseline smoke実行がある。
- Training TypeScriptがtypecheck対象である。

「Scriptは存在するがRequired CIから呼ばれていない」をPASSにしない。

---

## 15. Risks

### Risk 1: 1PRが大きい

Mitigation:

- Wave単位でScopeとValidationを閉じる。
- `.codex/runs/<run_id>/TASKS.md`で進捗を分解する。
- 各Wave完了時にSelf Reviewする。
- Product Feature追加を禁止する。

### Risk 2: Training CIがFormal CIと競合する

Mitigation:

- Training Workflowを`training/github-actions/`のTemplateとして保存する。
- `prepare-training-copy`でTraining Copyにだけ有効化する。
- `validate-training-copy`でFormal Production / Deploy Workflow隔離を機械確認する。
- Source RepositoryのFormal Workflowを削除しない。

### Risk 3: GitHub Training Copy remoteが利用できない

Mitigation:

- Local disposable copy / Source Required CIでMerge Gateを先に完了する。
- Delivery ValidationだけをLocal Blockerとして記録する。
- 他Waveを止めない。
- Remoteが利用可能になった時点で実Run Evidenceを取得する。
- Evidence未取得のままTraining Delivery Readyを宣言しない。

### Risk 4: Windows Native setupが重い

Mitigation:

- Canonical Environmentを1つに限定する。
- Build 36 / Runtime 34を分離して記述する。
- AVD作成・bootをTraining Helperへ集約する。
- Existing Android Local ScriptをDevice接続後のContractとして再利用する。
- macOS / Linuxの完全サポートを初版へ要求しない。

### Risk 5: Workbook管理が目的化する

Mitigation:

- CSV 4ファイルに限定する。
- Lessonごとに入力Columnを段階化する。
- Multiple ID Grammarを`;`へ固定する。
- Test Case数ではなくRisk / Reasonを評価する。

### Risk 6: Instructor ReferenceがLearnerに見える

Mitigation:

- Publicであることを明記する。
- Standard Navigationから外す。
- 秘密情報を置かない。
- Access Control実装へScopeを広げない。

### Risk 7: Curriculum Driftが再発する

Mitigation:

- `validate:curriculum`をRequired Phase 1 CIへ直接接続する。
- Machine-verifiableなPath / Script / Schemaを検証する。
- Training Web / Native baseline smokeをFormal CIで実行する。
- Current Guaranteeを引用するLessonではCanonical SourceへのLinkを残す。

### Risk 8: Intentional Failureが通常CIを壊す

Mitigation:

- `baseline`と`failure-exercises`をPathで分離する。
- Required CIは`baseline`だけを実行する。
- Failure exerciseは専用Expected-Fail validationで扱う。

### Risk 9: Training TypeScriptが品質Gateから漏れる

Mitigation:

- `tsconfig.training.json`を追加する。
- `typecheck:training`をRepository `typecheck`へ接続する。
- Runtime Failure ExerciseでType Errorを教材化しない。

### Risk 10: Existing Repositoryが正解集になる

Mitigation:

- Formal Regression / Current Workflowは演習後に比較する。
- RubricはAlternative Designを許容する。
- Current ImplementationとSpecificationをOracleとして混同しない。

### Risk 11: iOSを教えるためにCI方針を歪める

Mitigation:

- Current Build-only Contractを教材として使う。
- iOS RuntimeはOptional / hypothetical designとしてのみ扱う。

---

## 16. Open questions / 曖昧性

### 16.1 Blocking questions

**なし。**

本Planでは以下を固定済みである。

- Training Playwright = separate config + baseline / exercise / expected failure separation
- Training Maestro = separate path + baseline separation
- Workbook = CSV canonical template
- Multiple BR / AC IDs = `;`区切り
- Training Workflow = repository内Template、Training Copyでのみ有効化
- Training Copy preparation = Script化
- Training Copy validation = Script化
- Web / Android Training CI = Required Asset
- Source Formal CI = Training baseline smokeを継続実行
- `validate:curriculum` = Required Phase 1 CIへ明示接続
- Training TypeScript = dedicated typecheck + Repository typecheckへ接続
- Native learner canonical environment = Windows 11
- Android Build = Compile SDK 36 / Build Tools 36.0.0
- Android Runtime = API 34 / `google_apis` / `x86_64` / `pixel_2`
- AVD startup = Training専用PowerShell Helper
- Instructor asset = Public Instructor Reference
- Local Blocker = 独立Taskを止めない

### 16.2 実装時に仮定してよい細部

以下はCurrent Repository Conventionに従い、後から局所修正可能でありContractを変えない範囲で実装者が決めてよい。

- Training Scriptの細かなPackage Command名
- Evidence Folder内の補助File名
- CSV Sample Rowの具体的なCase
- Instructor Referenceの章構成
- Troubleshooting項目の表示順
- `validate:curriculum`を既存`style-quality`か`code-quality`のどちらへ置くか。ただしRequired Phase 1 CIで必ず実行する。

ただしPath、Workflow activation、Supported OS、DoD、Security Boundary、Oracle、Android Runtime Contract、Training baseline / failure separationを変える判断は仮定扱いにしない。

---

## 17. Follow-up notes

- API / Performance / Security / Visual Regression等の追加Curriculumは本Implementation後の学習効果を見て別Planで判断する。
- macOS NativeをRequired Supportへ昇格する場合は、Canonical Setup / Validationを別途定義する。
- Instructor Referenceを本当に非公開にする必要が生じた場合は、Public Repository外のDelivery方式を別タスクで検討する。
- iOS Runtime CI方針が将来変わった場合はCurriculumをADRと同時に再Baselineする。
- GitHub Training Copyの恒久的なOrganization運用や自動Provisioningが必要になった場合は別の運用改善として扱う。本PlanではTraining Copy preparation / validation Contractと実Run Evidenceまでを対象とする。

---

## 18. Definition of Done

### Curriculum

- 20 / 20文書をCurrent Repositoryへ再Baseline済み。
- Automation Purpose → Spec → Risk → Design → Automation → CIが1本のLearning Storyとしてつながる。
- iOS Runtime / MaestroをCurrent Formal CI Guaranteeとして誤記していない。
- Android = Build + Runtime、iOS = Build-onlyを正しく説明する。
- Android Build APIとRuntime APIの違いを誤解なく説明する。
- SpecificationがExpected Behavior Oracleとして一貫して扱われる。
- Test本数だけで修了判定しない。

### Competency / Instructor

- C01〜C12とLevel 0〜3が存在する。
- Part 1 / Part 2の修了Competencyが明示される。
- Instructor ReferenceでRequired Contract / Alternative Design / Anti-patternを区別する。
- Public Referenceであり秘密ではないことを明記する。

### Workbook

- CSV 4ファイルとREADMEが存在する。
- Spec / BR / AC / Risk / Test Case / Layer / Tool / Implementationを追跡できる。
- Multiple ID Fieldが`;`区切りGrammarへ従う。
- Google SheetsへImport可能である。
- 初学者へ一度に全Columnを要求しない。

### Training Playwright

- `playwright.training.config.ts`が存在する。
- `training/playwright/baseline/`がRequired PASSとして実行できる。
- `failure-exercises/`が通常PASS Suiteから分離されている。
- Formal `e2e/web/`へLearner Testが混在しない。
- Seed ResetとFailure Evidenceを利用できる。
- Training TypeScriptがtypecheck対象である。

### Training Maestro

- `training/maestro/baseline/`が存在する。
- Canonical Windows + Android API 34 AVDでRequired Flowを実行できる。
- Formal `maestro/`と分離されている。
- Source Native CIでTraining baseline smokeを実行する。
- iOS RuntimeをRequiredにしていない。

### Training Copy / CI

- `prepare-training-copy`がDisposable Copyを決定的に準備できる。
- `validate-training-copy`が安全境界を確認できる。
- Web Training CI Templateが存在する。
- Android Training CI Templateが存在する。
- Production Secretを必要としない。
- Cloudflare Deployを起動しない。
- Formal Production / Deploy Workflowと競合しない。
- Merge GateとしてSource Required CIでWeb / Android Training baselineがPASSする。
- Delivery Readiness GateとしてInstructor管理GitHub Training CopyのWeb / Android Workflow実Run Evidenceを取得する。

### Setup / Recovery

- Web Start Gateがある。
- Android Start Gateがある。
- AVD create / reuse / boot手順がある。
- Part 1 → Part 2 Training Copy移行手順がある。
- Browser / JDK / Android SDK / AVD / Emulator / APK / Maestro / Git / Actionsの主要FailureをTroubleshootできる。

### Validation

- `pnpm run typecheck:training`が成功する。
- `pnpm run validate:curriculum`が成功する。
- `pnpm run verify`が成功する。
- Required Phase 1 CIで`validate:curriculum`が実行・成功する。
- Required Phase 1 CIでTraining Web baseline smokeが成功する。
- Required Native CIでTraining Maestro baseline smokeが成功する。
- Required Native CI全体が成功する。
- iOS Build-only Gateが成功する。
- Fresh Learner Dry RunがRequired項目を完走する。
- Delivery Readiness GateのGitHub Training Copy Evidenceが揃う。
- 未解消Required Blockerがない。

### PR

- 上記Source変更を**1本のCurriculum Implementation PR**でReview可能にする。
- Delivery Readiness用Training Copy実行は2本目のImplementation PRを作らない。
- Specification Foundationそのものを含めない。
- Product機能追加・無関係なRefactorを混在させない。

---

## 19. Final Review Questions

PR Merge前またはDelivery Ready判定前に、該当Gateについて以下へすべてYesと答えられることを確認する。

### Educational

- Automationの目的と限界から学習が始まるか。
- SpecificationとObserved Behaviorを区別できるか。
- RiskとTest Designが接続されているか。
- Test Layer / Automation Selectionに理由があるか。
- 自動化しない判断を評価できるか。
- Failure原因をProduct以外へも切り分けられるか。

### Practical

- Fresh LearnerがWebを起動できるか。
- Training Playwright baselineを実行できるか。
- Intentional Failureを通常PASS Suiteと混ぜずにEvidence確認できるか。
- WindowsでAPI 34 AVDを準備・起動できるか。
- AndroidでMaestro baselineまで進められるか。
- Part 2へ成果物を引き継げるか。
- Training CopyをScriptで準備・検証できるか。
- Training PR / CIをProduction環境へ影響せず実行できるか。

### Current repository consistency

- Current Native Scopeと一致するか。
- Android Build 36 / Runtime 34 Contractと一致するか。
- iOS Build-onlyと一致するか。
- Package Script名が実在するか。
- Training Pathが実在するか。
- Training TypeScriptがtypecheckされるか。
- `validate:curriculum`がRequired Phase 1 CIで実行されるか。
- Training baseline smokeがWeb / Native Formal CIで実行されるか。
- Specification ReferenceがCurrent Specと一致するか。
- Formal RegressionとTraining Testが分離されているか。

### Delivery evidence

- Instructor管理GitHub Training CopyのSource commit SHAを特定できるか。
- Web Training Workflow Run URLがあるか。
- Android Training Workflow Run URLがあるか。
- Artifactを確認できるか。
- Production / Deploy Workflowが起動していないか。
- Production Secretを使用していないか。

### Maintainability

- 教材のためだけの過剰な抽象化がないか。
- Instructorだけが理解する暗黙手順がないか。
- Curriculum DriftをMachine validation + Runtime baseline smokeで検出できるか。
- Training専用コードとFormal Regressionの責務が明確か。
- Training Copy preparationが手作業依存になっていないか。

---

## 20. Expected Implementation Result

本Plan完了時、Scenario Shopは単なる「自動テストのサンプルRepository」ではなく、以下を一貫して体験できるTraining Environmentになる。

```text
Automation Purpose / Scope
↓
Normative Specification
↓
Business Rule / Acceptance Criteria
↓
Risk Analysis
↓
Test Design
↓
Test Layer / Automation Selection
↓
Playwright / Maestro
↓
Failure Evidence / Analysis
↓
Maintenance
↓
Git / PR / Review
↓
CI / Quality Gate
↓
Automation Introduction Design
```

受講者が最終的に次のような説明を、自分のEvidenceとTrade-offを伴ってできる状態を目指す。

> この仕様とBusiness Riskから、この条件を確認します。
> このRuleの細かい組み合わせは下位Testへ置き、User JourneyはPlaywrightで確認します。
> NativeではPlatform固有RiskだけMaestroへ追加します。
> このTestは自動化しません。保守Costに対してRegression価値が低いためです。
> PRではこのSuiteをRequiredとし、高コストな確認は別Timingへ配置します。
> Failure時にはこのEvidenceを確認します。
> AndroidではBuild ContractとRuntime Contractを分け、現在の再現性とCostに合う保証Levelを選びます。
> iOSはCurrent Formal CIがBuild-onlyなので、未実行RuntimeをPASSとは報告しません。

この判断能力を育成でき、かつTraining資産自体がMachine validation / Runtime baseline / Delivery Evidenceで継続検証できることを、本Implementationの最終成果とする。
