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
- Secret不要・DeployなしのTraining Web CIとAndroid Training CIを提供する。
- Setup / Start Gate / Recovery / Instructor Referenceを用意する。
- Fresh Learner Dry RunでPart 1 → Part 2を通す。
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
| Playwright Project / Test Match | `playwright.config.ts` |
| Package Command | `package.json` |
| Formal Web Regression | `e2e/web/` |
| Formal Native Regression | `maestro/` |
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
- Evidence / Failure Taxonomy
- Competency / Rubric
- Build / Runtime / Artifact / Quality Gate

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
- Curriculum validation script
- Package Script
- 必要最小限のContract Test
- Curriculum / Training Navigation docs

Product Business Logic、Formal RegressionのExpectation、Formal Production / Deploy Contractは原則変更しない。

### 5.6 Unknowns

Blocking Unknownは本Plan時点で残さない。

実装中に以下のContractへ影響するUnknownが発見された場合、実装者が推測で決めずPlan / TASKSへ記録して判断を更新する。

- Training Path
- Workflow activation方式
- Supported OS
- Workbook format / schema
- DoD
- Security / Production separation
- Specification Oracle

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

- `playwright.config.ts`: Formal Regression専用として維持
- `playwright.training.config.ts`: Training専用Configを新設
- `training/playwright/`: Learner用spec / starter / sampleの保存先
- `output/training/playwright/`: Training Evidence出力先候補

Training specを`e2e/web/`へ混在させない。

### 6.3 Training Maestro

- `maestro/`: Formal Regression専用として維持
- `training/maestro/`: Learner用Flowの保存先
- `output/training/maestro/`または`.artifacts`配下: 実行Evidence

Training FlowをFormal Maestro Suiteへ混在させない。

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

### 6.5 Training GitHub Actions

Training Workflowは教材元Repositoryで自動実行可能な`.github/workflows/`へ直接置かない。

```text
training/github-actions/
├ README.md
├ training-ci.yml
└ training-native-ci.yml
```

これらを**Workflow Template**として管理する。

Instructorが用意するTraining Copyでは、Formal Production / Deploy Workflowを無効化または除外した状態を先に作り、その後Training Templateだけを`.github/workflows/`へ有効化する。

LearnerがFormal WorkflowとTraining Workflowの両方を同時起動させる構成を標準経路にしない。

### 6.6 Curriculum validation

以下をTargetとする。

- `scripts/validate-curriculum.ts`
- `package.json`へ`validate:curriculum`
- `pnpm run verify`へ接続

Validatorは自然文全体を解析しない。決定的に検証可能なContractだけを対象とする。

---

## 7. Fixed implementation decisions

### 7.1 Training Playwright

- Separate Config方式を採用する。
- `playwright.training.config.ts`の`testDir`は`training/playwright`とする。
- Formal `playwright.config.ts`へLearner Testを追加しない。
- Training用Package ScriptからのみTraining Configを起動する。
- Seed Reset / Test APIは既存Automation Build Contractを再利用する。
- Trace / Screenshot / Video / HTML ReportをTraining Evidenceとして確認できるようにする。

### 7.2 Training Maestro

- `training/maestro/`をLearner Flowの唯一の標準Pathとする。
- AndroidをRequired Platformとする。
- Existing Test Control / Deep Link Contractを再利用する。
- iOS RuntimeはOptional Comparisonに留める。

### 7.3 Training CI

Web Training CIとAndroid Training CIの両方を**Required Asset**とする。

Web Training CIの最小責務:

```text
Checkout
→ Setup Node / pnpm
→ Install
→ Quality Check
→ Web Build
→ Chromium Install
→ Training Playwright
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
→ Training Maestro minimal flow
→ Evidence Upload
```

Current Formal Native CIの全機能をTraining CIへ複製しない。まず1 Job相当の理解可能な構成を作り、Part 2でCurrent Build / Runtime分離と比較させる。

### 7.4 Training Copy policy

Part 1はGitHub Accountを必須にしないためLocal Copy / ZIPを許容する。

Part 2開始時はGit Historyを持つ専用Training Copyへ移行する。

Training CopyはLearnerへ渡す前にInstructor側で以下を満たす。

- Upstream Historyを保持する。
- Formal Production / Deploy WorkflowがTraining PRで起動しない。
- Training Workflow Templateだけが有効化される。
- Production Secretを登録しない。
- Learnerが本体RepositoryへPushする必要がない。

### 7.5 Learner environment support

初版のCanonical Local Environmentを以下に固定する。

#### Web

- Windows 11をPrimaryとして手順を保証する。
- Node.js 24
- pnpm 9.10.0
- Chromium / Playwright

#### Native Required

- Windows 11
- PowerShell
- Java 17
- Android SDK / API 36
- Build Tools 36.0.0
- Android Emulator
- Maestro 2.8.0
- Existing `scripts/native/windows/android-local.ps1`のDoctor Contractを可能な限り再利用する。

#### Alternative

- macOSのWeb学習はSupported。
- macOS Native / iOS SimulatorはOptional / Best-effort extension。
- Linux Desktopは初版Required Support外。

Platform対応を広げるために本PRを止めない。

### 7.6 Instructor Reference

Public Repository内のInstructor資料は秘密にできないため、`Instructor-only`ではなく**Instructor Reference**と呼ぶ。

- Learnerの標準Navigationから外す。
- 演習前に参照しない運用を明記する。
- Access Control / Secret化はしない。
- 完成Code 1つを唯一の正解にしない。

### 7.7 Workbook schema

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
| `01_spreadsheet-test-design.md` | CSV Workbook、BR/AC/Risk Traceability、Progressive Disclosure | P1 |
| `part1/01_test-automation-foundations.md` | C01 Automation Purpose / Scopeへ接続 | P1 |
| `part1/02_scenario-shop-analysis.md` | Normative SpecとObserved Behaviorを分離 | P1 |
| `part1/03_test-design-and-automation-selection.md` | Spec→Risk→Design→Layer→Automation | P1 |
| `part1/04_playwright-foundations.md` | Coding Bridge、Training Config / Command | P2 |
| `part1/05_playwright-e2e-practice.md` | Training Playwright実Path、Seed / Evidence | P1 |
| `part1/06_execution-and-failure-analysis.md` | Failure Taxonomy、Evidence、Instructor Exercise | P1 |
| `part1/07_maestro-native-automation.md` | Training Maestro実Path、Android Required、iOS Optional | P1 |
| `part1/08_test-management-and-maintainability.md` | Spec変更Lifecycle、不要Test削除判断 | P2 |
| `part1/09_part1-capstone.md` | Cart Core維持、Competency Evidence、Advanced段階化 | P1 |
| `part2/01_software-development-process.md` | Spec Change→Implementation→Review→Test | P2 |
| `part2/02_git-version-control.md` | Training Copy実手順、Part 1 artifact移行 | P2 |
| `part2/03_github-pull-request-review.md` | Spec/Test/Validation Traceability | P2 |
| `part2/04_ci-github-actions.md` | Training Template有効化、安全境界 | P1 |
| `part2/05_playwright-ci.md` | Training Web CI / Artifact実手順 | P1 |
| `part2/06_native-ci-maestro.md` | Android Training CI、Current iOS Build-onlyへ全面修正 | P1 Critical |
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

### Wave 0 — Baseline / Contract Freeze

作業:

- Latest `main` / Spec / Product / Test / Native / CIを再確認する。
- Information typeごとのCanonical Sourceを再確認する。
- Curriculum 20 / 20文書をInventoryする。
- Current iOS Build-onlyを確認する。
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
- Training Path / Config / CI Template / Workbook / OS Support Contractを本Planどおり確認する。
- Instructor Reference skeletonを作る。

Gate:

- 後続WaveがPathやPlatform方針を再判断する必要がない。

### Wave 2 — Specification Traceability / Workbook

作業:

- CSV 4ファイルとREADMEを作る。
- Spec / BR / AC → Risk → Test Case → Automation Mappingを実装する。
- Sample Caseを少数だけ入れる。
- 完成Answerを埋めすぎない。

Validation:

- Sample CaseでSpecからImplementation Pathまで辿れる。
- CSVをGoogle SheetsへImport可能な形で保持する。

### Wave 3 — Training Playwright Foundation

作業:

- `playwright.training.config.ts`
- `training/playwright/`
- Training Package Script
- Seed Reset / Test API利用
- Training Evidence
- Formal Regression isolation validation

Validation:

- Training Testだけを実行できる。
- Formal `e2e/web/`へLearner Testが混ざらない。
- Intentional FailでTrace / Screenshot / Video / Reportを確認できる。

### Wave 4 — Training Maestro / Android Foundation

作業:

- `training/maestro/`
- Android local setup / command
- Test Control Reset
- minimal Flow
- Evidence
- Formal `maestro/`との分離

Validation:

- Canonical Windows環境でDoctor / Build / Install / Launch / Training Flowを通す。
- iOS RuntimeをRequired Validationにしない。

### Wave 5 — Training GitHub / CI Foundation

作業:

- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- Training Copy preparation / activation README
- Web Failure Artifact
- Android Maestro Evidence
- Formal Workflow非競合Gate

Validation:

- Training Copy上でTraining Workflowだけが起動する。
- Production Secret不要。
- Cloudflare Deployなし。
- Web Training CI PASS。
- Android Training CI PASS。

### Wave 6 — Part 1 Curriculum Rebaseline

Training実Path / Commandが確定した後にPart 1全文書を改訂する。

作業:

- Automation Purpose / Spec / Risk / Test Design Flow
- Coding Bridge
- Training Playwright実手順
- Failure Taxonomy
- Training Maestro実手順
- Maintainability
- Core / Advanced Capstone
- Competency Mapping

Gate:

- Part 1全LessonでPath / Command /用語 /完了条件が実装と一致する。

### Wave 7 — Part 2 Curriculum Rebaseline

Training CI実体が存在してからPart 2全文書を改訂する。

作業:

- Training Copy移行
- Git / GitHub / PR
- Web Training CI
- Android Training CI
- Current Formal CI比較
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
- Web / Android Start Gate
- Troubleshooting
- Part 1 → Part 2 migration

Gate:

- 講師の暗黙知がRequired手順として残らない。

### Wave 9 — Curriculum Validator / Repository-wide Integration Review

作業:

- `scripts/validate-curriculum.ts`
- `validate:curriculum`
- `verify`接続
- 全20文書 + Training assetsの整合Review

Validatorは最低限以下を決定的に確認する。

- Required Training Pathの存在
- Workbook header contract
- Training Playwright Config / testDir contract
- Training CI Templateの存在
- Curriculumが参照するRepository-owned Package Scriptの存在
- 明示的Relative Linkの存在
- Sample Spec / BR / AC referenceのIntegrity

自然文からWorkflow Job名や全Seed IDを推測抽出するような複雑なParserは作らない。

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
Training Playwright
↓
Intentional Failure / Evidence
↓
Training Maestro / Android
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

Final Gate:

- Required Learner Journeyが手順の空白なく完走する。
- Blocked / SkipをRequired項目へ残さない。

---

## 14. Validation plan

### 14.1 Static / Repository Quality

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run validate:spec`
- `pnpm run validate:curriculum`
- `pnpm run test`
- `pnpm run build:web`
- `pnpm run verify`

### 14.2 Training Web

- Minimal PASS
- Seed Reset
- Mobile Training execution
- Intentional FAIL
- Trace / Screenshot / Video / HTML Report確認
- Formal Regression isolation確認

### 14.3 Training Android

- Doctor
- Build
- Install
- Launch
- Test Control Reset
- Training Maestro PASS
- Evidence確認
- Formal Maestro isolation確認

### 14.4 Training CI

- Web Training CI PASS
- Web intentional failureでArtifact取得
- Android Training CI PASS
- Production / Deploy Workflow非起動
- Production Secret不要

### 14.5 Formal Regression

Training用`package.json`変更等によってCurrent Native CIが起動することはExpectedとする。

Agentは「Native Codeを変えていないから」という理由だけでNative CI path filterを弱めたり、`package.json`をchange detection対象から外したりしない。

- Required Phase 1 CI
- Required Native CI
- iOS Build-only Gate

をCurrent Contractどおり確認する。

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
- Training Copyでのみ`.github/workflows/`へ有効化する。
- Formal Production / Deploy WorkflowをTraining Copyで無効化してからLearnerへ渡す。

### Risk 3: Windows Native setupが重い

Mitigation:

- Canonical Environmentを1つに限定する。
- Existing Doctor Contractを再利用する。
- macOS / Linuxの完全サポートを初版へ要求しない。

### Risk 4: Workbook管理が目的化する

Mitigation:

- CSV 4ファイルに限定する。
- Lessonごとに入力Columnを段階化する。
- Test Case数ではなくRisk / Reasonを評価する。

### Risk 5: Instructor ReferenceがLearnerに見える

Mitigation:

- Publicであることを明記する。
- Standard Navigationから外す。
- 秘密情報を置かない。
- Access Control実装へScopeを広げない。

### Risk 6: Curriculum Driftが再発する

Mitigation:

- `validate:curriculum`を追加する。
- Machine-verifiableなPath / Script / Schemaを検証する。
- Current Guaranteeを引用するLessonではCanonical SourceへのLinkを残す。

### Risk 7: Existing Repositoryが正解集になる

Mitigation:

- Formal Regression / Current Workflowは演習後に比較する。
- RubricはAlternative Designを許容する。
- Current ImplementationとSpecificationをOracleとして混同しない。

### Risk 8: iOSを教えるためにCI方針を歪める

Mitigation:

- Current Build-only Contractを教材として使う。
- iOS RuntimeはOptional / hypothetical designとしてのみ扱う。

---

## 16. Open questions / 曖昧性

### 16.1 Blocking questions

**なし。**

本Planでは、以前未確定だった以下を固定済みである。

- Training Playwright = separate config
- Training Maestro = separate path
- Workbook = CSV canonical template
- Training Workflow = repository内Template、Training Copyでのみ有効化
- Android Training CI = Required
- Native learner canonical environment = Windows 11
- Instructor asset = Public Instructor Reference

### 16.2 実装時に仮定してよい細部

以下はCurrent Repository Conventionに従い、後から局所修正可能でありContractを変えない範囲で実装者が決めてよい。

- Training Scriptの細かなCommand名
- Evidence Folder内の補助File名
- CSV Sample Rowの具体的なCase
- Instructor Referenceの章構成
- Troubleshooting項目の表示順

ただしPath、Workflow activation、Supported OS、DoD、Security Boundary、Oracleを変える判断は仮定扱いにしない。

---

## 17. Follow-up notes

- API / Performance / Security / Visual Regression等の追加Curriculumは本Implementation後の学習効果を見て別Planで判断する。
- macOS NativeをRequired Supportへ昇格する場合は、Canonical Setup / Validationを別途定義する。
- Instructor Referenceを本当に非公開にする必要が生じた場合は、Public Repository外のDelivery方式を別タスクで検討する。
- iOS Runtime CI方針が将来変わった場合はCurriculumをADRと同時に再Baselineする。

---

## 18. Definition of Done

### Curriculum

- 20 / 20文書をCurrent Repositoryへ再Baseline済み。
- Automation Purpose → Spec → Risk → Design → Automation → CIが1本のLearning Storyとしてつながる。
- iOS Runtime / MaestroをCurrent Formal CI Guaranteeとして誤記していない。
- Android = Build + Runtime、iOS = Build-onlyを正しく説明する。
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
- Google SheetsへImport可能である。
- 初学者へ一度に全Columnを要求しない。

### Training Playwright

- `playwright.training.config.ts`が存在する。
- `training/playwright/`だけをTraining Testとして実行できる。
- Formal `e2e/web/`へLearner Testが混在しない。
- Seed ResetとFailure Evidenceを利用できる。

### Training Maestro

- `training/maestro/`が存在する。
- Canonical Windows + AndroidでRequired Flowを実行できる。
- Formal `maestro/`と分離されている。
- iOS RuntimeをRequiredにしていない。

### Training CI

- Web Training CI Templateが存在し、Training CopyでPASSする。
- Android Training CI Templateが存在し、Training CopyでPASSする。
- Production Secretを必要としない。
- Cloudflare Deployを起動しない。
- Formal Production / Deploy Workflowと競合しない。

### Setup / Recovery

- Web Start Gateがある。
- Android Start Gateがある。
- Part 1 → Part 2 Training Copy移行手順がある。
- Browser / JDK / Android SDK / Emulator / APK / Maestro / Git / Actionsの主要FailureをTroubleshootできる。

### Validation

- `pnpm run validate:curriculum`が成功する。
- `pnpm run verify`が成功する。
- Required Phase 1 CIが成功する。
- Required Native CIが成功する。
- iOS Build-only Gateが成功する。
- Fresh Learner Dry RunがRequired項目を完走する。
- 未解消Required Blockerがない。

### PR

- 上記DoDを**1本のCurriculum Implementation PR**でReview可能にする。
- Specification Foundationそのものを含めない。
- Product機能追加・無関係なRefactorを混在させない。

---

## 19. Final Review Questions

PR Merge前に以下へすべてYesと答えられることを確認する。

### Educational

- Automationの目的と限界から学習が始まるか。
- SpecificationとObserved Behaviorを区別できるか。
- RiskとTest Designが接続されているか。
- Test Layer / Automation Selectionに理由があるか。
- 自動化しない判断を評価できるか。
- Failure原因をProduct以外へも切り分けられるか。

### Practical

- Fresh LearnerがWebを起動できるか。
- Training Playwrightを実行できるか。
- Failure Evidenceを確認できるか。
- Windows + AndroidでMaestroまで進められるか。
- Part 2へ成果物を引き継げるか。
- Training PR / CIをProduction環境へ影響せず実行できるか。

### Current repository consistency

- Current Native Scopeと一致するか。
- iOS Build-onlyと一致するか。
- Package Script名が実在するか。
- Training Pathが実在するか。
- Specification ReferenceがCurrent Specと一致するか。
- Formal RegressionとTraining Testが分離されているか。

### Maintainability

- 教材のためだけの過剰な抽象化がないか。
- Instructorだけが理解する暗黙手順がないか。
- Curriculum Driftを機械検出できる範囲があるか。
- Training専用コードとFormal Regressionの責務が明確か。

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
> AndroidとiOSは現在の再現性とCostが違うため、同じ保証Levelにはしません。

この判断能力を育成できることを、本Implementationの最終成果とする。
