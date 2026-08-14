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

本Planの実装は、**Specification Foundation ImplementationがCurrent Repositoryへ正しく再Baselineされた状態で`main`へMergeされた後**、最新`main`から作成する別のImplementation Branchで開始する。

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
- `docs/curriculum/test-automation/` の**既存20文書 + 新規Required 2文書 = 全22文書**をCurrent Repositoryへ再Baseline / 整備する。
- 新規Required文書は`02_competency-rubric.md`と`03_instructor-reference.md`に固定する。
- iOS Runtime / MaestroをCurrent Formal CI Guaranteeとして誤記しない。
- Android = Build + Runtime E2E、iOS = Build-onlyの保証差を正しく教材化する。
- Competency C01〜C12とLevel 0〜3を評価正本として用意する。
- Training Playwright / MaestroをFormal Regressionから分離する。
- Workbook TemplateをCSV正本として提供する。
- Training TypeScriptをRepository Quality Gateでtypecheckする。
- Secret不要・Deployなし・read-only権限のTraining Web CIとAndroid Training CIを提供する。
- Training Copy preparationを**完全なSource commit SHA + Workflow allowlist**で決定的に提供する。
- Repository-owned Training baseline smokeをFormal Required CIで継続確認する。
- Setup / Start Gate / Recovery / Instructor Referenceを用意する。
- Fresh Learner Dry RunでPart 1 → Part 2を通す。
- `pnpm run validate:curriculum`をRequired Phase 1 CIへ明示的に接続する。
- Final Delivery Readinessは本PRのRequired Definition of Done / Merge Gateに含めない。
- Required DoDはCurriculum、Workbook / Training assets、Formal / Training境界、Local Physical Android、GitHub Native CI API34 Emulator、`pnpm run verify`、Current PR HEADのRequired CI、およびCritical / High Source findingの解消で判定する。
- `prepare-training-copy` / `validate-training-copy`は安全な教材Copyを作成・検証するLocal機能として維持する。
- Instructor管理Training Copyへのpublish、remote 3 run、`FINAL_CANDIDATE_SHA` freeze、PR HEAD / resolved SHA equality、Final Delivery RecordはFuture operational validation / optional instructor validationとして扱う。
- `pnpm run verify`とRequired GitHub Actionsを成功させる。
- 未解消Required Blockerを残さない。

### 1.6 Implementation Start Gate

Implementation Branchを作成する前に、以下を**すべて**満たす。

1. Specification Foundation Implementationが`main`へMerge済みである。
2. `docs/spec/README.md`が存在し、Specification Systemの入口として機能している。
3. Normative Product BehaviorとSupporting / Operational文書の境界が明示されている。
4. BR / ACの安定IDと参照GrammarがCurrent Specification Contractとして利用可能である。
5. `pnpm run validate:spec`がLocalで成功する。
6. Required Phase 1 CI上でもSpecification validationが実行・成功する。
7. Current ADR / Current WorkflowとSpecification FoundationのNative保証記述を再照合する。
8. AndroidのCurrent Formal GuaranteeがBuild + Runtime E2Eであることを確認する。
9. iOSのCurrent Formal GuaranteeがADR-0011に基づくBuild-onlyであり、未実行RuntimeをPASSとしていないことを確認する。
10. Specification Foundation内に古いNative / iOS CI記述が残っている場合は、Curriculum Implementation開始前に先行Foundation側の責務として解消済みであることを確認する。
11. 実装開始時点のOpen PRを確認し、本Planと競合するProduct / Native / CI / Spec変更がないことを確認する。
12. 上記確認後の**最新`main`**からCurriculum Implementation Branchを作成する。

Start Gateが未達のまま、Implementation Branchを作成して本実装へ進まない。

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
- Existing `scripts/native/windows/android-local.ps1`は接続済みADB deviceを前提にDoctor / Build / Install / Test等を行う。Windows Local Fresh LearnerではAVD作成・Emulator起動を必須にしない。
- Current Phase 1 CIとCurrent Native CIはいずれも`pull_request`で起動するため、Training Copyへそのまま持ち込むとTraining WorkflowとFormal Workflowが同時実行される。
- Current Native CIのchange detectionは`maestro/**`等を対象とするが、将来追加する`training/maestro/**`は現状のままでは検知対象外である。
- Current Native Runtime CIは`ubuntu-24.04` / Java 17 / Android Runtime API 34 / `google_apis` / `x86_64` / `pixel_2` / KVMを使用し、ADB ready、`sys.boot_completed=1`、package service readyを有限待機で確認している。

### 2.2 Specification dependency

Specification Foundation実装後は、Expected Product BehaviorのOracleをNormative Specificationへ統一する。

Specification Foundation完成前のCurrent Implementation / README / Existing Testから期待動作を逆算して、本ImplementationのSpecとして固定しない。

Specification FoundationがMerge済みであっても、Current ADR / Workflowと矛盾する古い保証記述が残っている場合はStart Gate未達として扱う。

### 2.3 Information typeごとのCanonical Source

「コードを正本」と一括りにしない。情報種別ごとに以下をCanonical Sourceとする。

| 情報 | Canonical Source |
| --- | --- |
| Expected Product Behavior | `docs/spec/` のNormative領域 |
| Business Rule / Acceptance Criteria | `docs/spec/` のBR / AC |
| Unresolved Product Behavior | Specification SystemのUnresolved領域 |
| Seed Scenario ID / Test Data Scenario | `src/seeds/metadata.ts`等のExecutable Source |
| Domain Type / State | DomainのExecutable Source。ただし期待挙動はSpecへ従う |
| Formal Playwright Project / Test Match | `playwright.config.ts` |
| Training Playwright Project / Test Match | `playwright.training.config.ts` |
| Package Command | `package.json` |
| Formal Web Regression | `e2e/web/` |
| Formal Native Regression | `maestro/` |
| Training Web Test | `training/playwright/` |
| Training Native Flow | `training/maestro/` |
| Android / iOS CI Guarantee | `.github/workflows/` + Current ADR |
| Training Copy active Workflow | `training/github-actions/` Template + Training Copy allowlist Contract |
| Current Implementation | Application Code |
| Observed Behavior | 実行したApplication |
| Supporting説明 | README / Guide / PROJECT_CONTEXT |

### 2.4 Curriculum baseline / Required document set

完了対象を**22文書**へ固定する。

- Existing Curriculum: 20文書
- New Required Curriculum assets: 2文書

```text
docs/curriculum/test-automation/
├ README.md
├ 00_learning-design.md
├ 01_spreadsheet-test-design.md
├ 02_competency-rubric.md             # New Required
├ 03_instructor-reference.md          # New Required
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

`02_competency-rubric.md`と`03_instructor-reference.md`は「候補」ではなくRequiredであり、他文書へ統合して省略しない。

---

## 3. Assumptions

以下が崩れた場合は実装前または実装中にPlanを見直す。

- Specification Foundation Implementationが本Plan実装前に`main`へMergeされる。
- Specification FoundationがNormative / Supporting境界、BR / AC ID、Validation Contractを提供する。
- Specification FoundationはStart Gate時点でCurrent ADR / Current Workflowへ再Baseline済みである。
- Native Phase 2後半のCurrent Product Scopeを大きく覆す別PRが同時進行していない。
- iOS Formal CIはADR-0011のBuild-only方針を維持する。
- Existing Formal RegressionはTraining Scratch Spaceへ転用しない。
- Initial Training ReleaseではWindowsをNative learner pathのCanonical Environmentとする。
- macOSはWeb学習とOptional Native比較を許容するが、初版のNative Required Completion Environmentにはしない。
- Linux Desktopは初版Learner SupportのRequired範囲外とする。
- Instructor ReferenceはPublic Repository内へ保存されるため秘密情報として扱わない。
- 将来の任意のOperational validationでは、本体RepositoryとProduction Secretから分離されたInstructor管理の**disposable / training-only GitHub repository**を利用できる。
- GitHub Training CopyはProduction repository / environmentと接続せず、Production / Organization Secretのgrant対象にしない。
- 将来の任意Operational validationを実施する場合、そのSourceは同一Source Repositoryのmaintainer-controlled Curriculum Implementation PRのHEAD full SHAに限定する。Forkや第三者Repositoryのcommitは対象外とする。
- Training Copy remoteが利用できないことは、本PRのRequired failure / Merge blockerとして扱わない。

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
- Formal CIのchange detectionを無関係に最適化すること
- Training用Intentional FailureをRequired CIの通常PASS Suiteへ混在させること
- Training CopyでFormal Phase 1 / Native / Deploy Workflowを同時実行すること
- GitHub Training Copyの恒久Provisioning Platformを新設すること
- Arbitrary codeの安全性を静的解析だけで完全証明するSupply-chain Security Frameworkを新設すること

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
- `tests/contracts/native-ci-workflow.test.ts`
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
- Source Repository / final PR HEAD SHA / Disposable Training Copy / GitHub Training Copy
- Formal Workflow Set / Training Workflow Allowlist
- Training CI Trust Boundary / least privilege

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
- `.github/workflows/native-ci.yml`へのTraining Maestro baseline smoke接続と`training/maestro/**`change detection追加
- `tests/contracts/native-ci-workflow.test.ts`等の既存Workflow Contract Testへの必要最小限の追加
- Curriculum / Training Navigation docs

Product Business Logic、Formal RegressionのExpectation、Formal Production / Deploy Contractは原則変更しない。Formal CIへの変更は**既存Gateを弱めず、新しいTraining資産を正しく検証するための必要最小限**に限定する。

### 5.6 Unknowns

Blocking Unknownは本Plan時点で残さない。

実装中に以下のContractへ影響するUnknownが発見された場合、実装者が推測で決めずPlan / TASKSへ記録して判断を更新する。

- Training Path
- Workflow activation / allowlist方式
- Supported OS
- Workbook format / schema / ID grammar
- DoD
- Security / Production separation
- Specification Oracle
- Required CI wiring
- Native CI change detection
- Android Runtime CI Emulator contract
- Optional Training Copy operational evidence contract

---

## 6. Impacted areas / Files to inspect

### 6.1 Curriculum

Required document setは`2.4`の22文書に固定する。

新規Required文書:

- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`

責務:

- `02_competency-rubric.md`: C01〜C12、Level 0〜3、Part 1 / Part 2評価Contractの正本。
- `03_instructor-reference.md`: Expected Contract、Alternative Design、Anti-pattern、採点・Facilitation・Troubleshootingの講師向けReference。

両文書はRequired fileとして別々に存在させる。Learner向け本文とInstructor ReferenceのNavigationは分離する。

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
- Failure exercise検証は「TestがFAILしたこと」と「Evidenceが生成されたこと」を確認する。
- Source RepositoryのExpected Failure検証用wrapperは、期待したNon-zero exitとEvidence生成を確認したうえでwrapper自体はPASSできるContractにする。

### 6.3 Training Playwright projects

`playwright.training.config.ts`には最低限次の2 Projectを定義する。

- `training-chromium`
  - Desktop Chromium
  - Part 1の標準Web Training Project
- `training-mobile-chromium`
  - Chromium + Mobile相当のviewport / device contract
  - Responsive / touch-oriented差分を学ぶ補助Project

Rules:

- Required Source CIの最小baseline smokeは`training-chromium`を必須とする。
- `training-mobile-chromium`はWave 3 / Fresh Learner Validationで実行確認する。
- Mobile Project専用の大規模Suiteを追加しない。
- Curriculum本文でProject名を参照する場合は`validate:curriculum`で存在を検証する。

### 6.4 Training Maestro

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

### 6.5 Workbook

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

### 6.6 Training GitHub Actions / Training Copy

Training Workflow Templateは教材元Repositoryで自動起動しないPathへ置く。

```text
training/github-actions/
├ README.md
├ training-ci.yml
└ training-native-ci.yml
```

Training Copy作成を人手のファイル操作へ委ねない。最低限次を新設する。

- `scripts/training/prepare-training-copy.ts`
- `scripts/training/validate-training-copy.ts`

#### Source SHA Contract

`prepare-training-copy`はCurrent Working TreeやMutable refを暗黙に複製しない。

- 必須Inputは**完全なcommit SHA**とする。
- Branch名、Tag名、短縮SHAをDelivery EvidenceのSourceとして受け付けない。
- Local preparationでも入力SHAを完全SHAへresolveして記録する。
- Local Training Copyは入力された完全SHAをresolveしてmanifestへ記録する。
- 将来の任意Operational validationでremoteへ実行する場合だけ、同一`qa-training-store` Repositoryのmaintainer-controlled PR HEAD full SHAとの一致を確認する。
- Fork / third-party Repository由来のSHAを将来のOperational validation Sourceとして実行しない。
- 生成したTraining CopyとEvidenceへresolved Source commit SHAを記録する。

概念例:

```text
prepare-training-copy
  --source-sha <40_CHAR_PR_HEAD_SHA>
  --target <disposable-target>
```

具体的なPackage Script名やCLI option名はImplementation時の局所決定でよい。Local Copyでは完全SHA必須とし、remote Operational validationのSHA equalityは将来の任意運用条件とする。

#### Workflow Allowlist Contract

Training Copyの`.github/workflows/`で有効なWorkflowは次の2つだけに固定する。

```text
.github/workflows/
├ training-ci.yml
└ training-native-ci.yml
```

`prepare-training-copy`はDisposable / Training Copy側で次を行う。

1. 指定された完全Source SHAのGit Historyを保持したCopyを準備する。
2. Copy側の`.github/workflows/`をTraining allowlist状態へ置き換える。
3. `training/github-actions/training-ci.yml`を`.github/workflows/training-ci.yml`へ有効化する。
4. `training/github-actions/training-native-ci.yml`を`.github/workflows/training-native-ci.yml`へ有効化する。
5. Phase 1 CI / Native CI / iOS CI / Deploy系を含むSource Formal WorkflowをTraining CopyのActive Workflowとして残さない。
6. Source Repositoryの`.github/workflows/`は削除・変更しない。

#### Training CI Trust Boundary

Training Copyで未Mergeの最終candidateを実行するため、安全境界をWorkflow内容の善意に依存させない。

Training Workflowは以下をRequired Contractとする。

- Top-level `permissions: contents: read`を明示する。
- `contents: write`、`actions: write`、`checks: write`、`pull-requests: write`、`packages: write`、`deployments: write`、`id-token: write`等のwrite権限を付与しない。
- `secrets.*`、Repository / Environment Secret、Production credentialを参照しない。
- `environment:`を使わず、Production GitHub Environmentへ接続しない。
- GitHub-hosted runnerだけを使い、`self-hosted` runnerを使わない。
- Training Copy repositoryはdisposable / training-onlyとし、Production deploy先・Production secret・Production environmentから分離する。
- Organization Secretが選択Repository方式等でTraining CopyへgrantされていないことをDelivery前に確認する。
- `actions/checkout`は`persist-credentials: false`を使用する。
- Reusable Workflowを外部Repositoryから呼ばない。必要なWorkflowはallowlist 2件内で完結させる。
- `uses:`はCurrent Repositoryで採用実績があるapproved action setへ限定し、Validatorで直接参照を検査する。
- `run:`の主要Entry PointはRepository-owned Training package scriptの明示allowlistから呼び出す。
- ValidatorはWorkflowの直接的な`permissions` / `secrets` / `environment` / `runs-on` / `uses` / `run` entry pointを検証する。
- 任意Node / shellコードの意味論を静的に完全証明することは目的にせず、**trusted exact SHA + no secrets + read-only token + GitHub-hosted ephemeral runner + isolated repository**を主な実行Sandboxとする。

`validate-training-copy`は最低限次を機械検証する。

- `.github/workflows/`のactive YAML/YMLがTraining allowlistと完全一致する。
- `training-ci.yml`と`training-native-ci.yml`がTemplate Sourceと期待どおり対応する。
- `permissions: contents: read`が明示され、write permission / `id-token: write`がない。
- `secrets.*`参照がない。
- `environment:`がない。
- `self-hosted` runner指定がない。
- Cloudflare Deploy等のProduction Deploy Stepがない。
- Formal Phase 1 / Native / iOS / Deploy WorkflowがActive Workflowとして残っていない。
- `uses:`がapproved action setに限定される。
- `run:`の主要Entry PointがRepository-owned Training command allowlistへ限定される。
- resolved Source commit SHAを記録できる。

Local disposable copyの既定出力はGit管理外の`.artifacts/training-copy/<run_id>/`相当とし、完了時にSource Working Treeへ不要差分を残さない。

### 6.7 Curriculum validation / Required CI

以下をTargetとする。

- `scripts/validate-curriculum.ts`
- `package.json`へ`validate:curriculum`
- `pnpm run verify`へ接続
- `.github/workflows/ci.yml`の既存Required Quality Jobへ`pnpm run validate:curriculum`を**明示的に追加**

Current Phase 1 CIは`pnpm run verify`を直接実行しないため、`verify`への接続だけでRequired Gateになったとみなさない。

新しい専用Jobを増やすこと自体は目的にしない。既存`code-quality`等の自然なRequired Jobへ追加できる場合はそれを優先する。

### 6.8 Training TypeScript quality

Training TypeScriptをFormal Quality Gateから漏らさない。

Target:

- `tsconfig.training.json`
- `package.json`へ`typecheck:training`
- 既存`typecheck`から`typecheck:training`を呼ぶ

`tsconfig.training.json`はCurrent TypeScript Contractを継承し、最低限以下を含める。

- `playwright.training.config.ts`
- `training/**/*.ts`

Intentional Failure ExerciseはAssertion / Locator / State等のRuntime Failureとして作り、Source Repository上の教材Template自体にはType Errorを残さない。

### 6.9 Formal CI baseline smoke / Native change detection

Training Runtime Driftを継続検出するため、Repository-owned baselineだけをFormal CIへ接続する。

#### Web

Current Phase 1 CIのAutomation Build Artifactを再利用し、既存E2E Job / MatrixへTraining Web baseline smokeを追加する方式を優先する。

- `training/playwright/baseline/`だけを`training-chromium`で実行する。
- `failure-exercises/`はRequired CIへ入れない。
- 新しいWeb Buildを重複させない。

#### Native

Current `native-ci.yml`のAndroid Runtime / Maestro Jobで既に起動しているEmulatorとAutomation APKを再利用し、`training/maestro/baseline/`の最小Flowを追加実行する方式を優先する。

- Training用に別Emulator / 別APK buildを増やさない。
- Formal MaestroのExpectationを変更しない。
- Training baseline failureはRepository-owned教材DriftとしてRequired CI failureにする。

Native CIのchange detectionには**`training/maestro/**`を追加する。**

理由:

```text
training/maestro/** only change
↓
Native CI detect = true
↓
Android Runtime Job実行
↓
Training Maestro baseline smoke実行
```

となることをRequired Contractとする。

既存`tests/contracts/native-ci-workflow.test.ts`等のWorkflow Contract Testが適切な責務を持つ場合は、以下を追加検証する。

- `training/maestro/**`がNative change detection対象である。
- Training baseline smoke stepがAndroid Runtime Jobに存在する。
- Existing Formal Native Gateを弱めていない。

これは無関係なpath filter最適化ではなく、新しいRequired Training Gateを確実に起動するための必要変更である。

---

## 7. Fixed implementation decisions

### 7.1 Training Playwright

- Separate Config方式を採用する。
- `playwright.training.config.ts`の`testDir`は`training/playwright`とする。
- Formal `playwright.config.ts`へLearner Testを追加しない。
- `training-chromium`を標準Desktop Projectとする。
- `training-mobile-chromium`をMobile補助Projectとする。
- Default Training commandは`baseline/`または明示的に選択したLearner exerciseだけを実行する。
- Required Source CIは`baseline/`を`training-chromium`で実行する。
- `training-mobile-chromium`はLocal / Fresh Learner Validationで必ず1回以上実行する。
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

両Workflow共通Contract:

```yaml
permissions:
  contents: read
```

- `actions/checkout`は`persist-credentials: false`。
- GitHub-hosted runnerのみ。
- Secret / Environment / OIDC / write permissionなし。
- Production Deployなし。

#### Web Training CI baseline mode

通常のTraining PRではbaseline modeだけを実行する。

```text
Checkout
→ Setup Node / pnpm
→ Install
→ Quality Check
→ Web Build
→ Chromium Install
→ Training Playwright baseline
→ Evidence Upload
→ Workflow PASS
```

#### Web Training CI expected-failure mode

`training-ci.yml`には`workflow_dispatch`等のManual Entry Pointから選べる`mode` Inputを持たせる。

最低限:

```text
mode = baseline
mode = expected-failure
```

Rules:

- PR Triggerでは常に`baseline`として扱う。
- `expected-failure`はManual / Instructor Validation専用とする。
- `expected-failure`では`training/playwright/failure-exercises/`だけを実行する。
- Test Processは期待どおりNon-zero / Failureになることを要求する。
- Trace / Screenshot / HTML Report等のEvidence Upload Stepは`if: always()`相当で実行する。
- Expected Failure RunはRequired PR Checkにしない。
- Delivery Evidenceでは「GitHub Actionsのactual conclusionが`failure`で、これはexpected outcomeであること」と「Artifactが取得できたこと」の両方を確認する。

#### Android Training CI Runtime Contract

Training Copyの`training-native-ci.yml`はCurrent Formal Native Runtimeの実証済みPrimitiveを簡略化して再利用し、次を固定する。Formal `native-ci.yml`自体はTraining CopyでActiveにしない。

Environment:

- Runner: `ubuntu-24.04` GitHub-hosted
- Job timeout: finite（初版目安50分以内。実装時にCurrent Native CIと整合させる）
- Node.js: 24
- pnpm: 9.10.0
- Java: Temurin 17
- Maestro: 2.8.0 pinned
- Android Compile SDK: 36
- Android Build Tools: 36.0.0
- Runtime API: 34
- System Image: `system-images;android-34;google_apis;x86_64`
- ABI: `x86_64`
- Device Profile: `pixel_2`
- AVD: ephemeral `scenario-shop-training-api34-ci`

Runtime lifecycle:

```text
Checkout (credentials not persisted)
→ Setup Node / pnpm / Java
→ Install
→ Resolve Android SDK / sdkmanager / avdmanager / emulator / adb
→ Install missing platform-tools / emulator / API34 google_apis x86_64 image
→ Android Automation Release build (Compile SDK36 / Build Tools36)
→ Verify APK
→ Verify / enable KVM
→ Create fresh AVD with no snapshot
→ Start headless emulator
→ finite ADB-ready wait
→ finite sys.boot_completed=1 wait
→ finite package-service-ready wait
→ assert one target emulator serial + API34 + x86_64
→ Install APK with finite timeout
→ Launch / Test Control reset
→ Training Maestro baseline with finite timeout
→ Collect JUnit / Maestro debug / emulator log / logcat / environment metadata
→ Evidence upload with if: always()
→ Emulator cleanup with if: always()
```

Rules:

- ADB ready、`sys.boot_completed=1`、package service readyは無限待機にしない。
- Target serialを曖昧にせず、対象Emulatorを1台へ確定してMaestro / adb操作へ渡す。
- AVDはTraining Workflow runごとにfresh dataを基本とし、学習用Stateを前Runから引き継がない。
- Boot / install / Maestro failure時でもEmulator log、logcat、Maestro debug、JUnit等の取得可能なEvidenceを`if: always()`相当でUploadする。
- Cleanupは`if: always()`相当で実行し、Emulator processを終了する。
- Current Formal Native CIの全検証を複製しないが、Runtime再現に必要なKVM / AVD / boot / serial / timeout / evidence / cleanup Contractは省略しない。
- Android側のIntentional Failure Workflowは初版Requiredにしない。Failure Artifact Lifecycleの学習はWeb Training CIで成立させる。

### 7.5 Training Copy policy / Execution proof

Part 1はGitHub Accountを必須にしないためLocal Copy / ZIPを許容する。

Part 2開始時はGit Historyを持つ専用Training Copyへ移行する。

Training Copy preparationは`prepare-training-copy`へ集約し、受講者へWorkflow選別判断を委ねない。

#### Local / Source Merge Gate component

- Current Curriculum Implementation PR HEADの完全SHAを使ってDisposable Local Training Copyを生成できる。
- `.github/workflows/`がTraining allowlist 2ファイルだけになる。
- `validate-training-copy`が成功する。
- Training Workflow Templateがread-only / no-secret / GitHub-hosted runner Contractを満たす。
- Training Workflow TemplateがRepository-owned Training commandだけを主要Entry Pointとして参照する。
- Web Training baselineがSource Required CIでPASSする。
- Android Training baselineがSource Native Required CIでPASSする。
- `training/maestro/**`変更時にNative Runtime CIが起動するContractを確認できる。
- Production / Deploy / Formal Workflow非混在Contractを機械検証できる。

#### Final Delivery Readiness（Optional / Future Operational Validation）

Owner Decisionにより、Final Delivery Readinessは本PRのRequired Definition of Done、Task、Merge Gateから外す。今回のRequired判定は、Fresh Learner、Local / Source validation、Required CI、Critical / High Source findingの解消で完了する。

Training Copyのremote運用を将来実施する場合は、次の任意手順を利用できる。

1. `prepare-training-copy`へ完全Source SHAを渡してLocal Training Copyを生成する。
2. `validate-training-copy`でTrust Boundary / Workflow allowlistを検証する。
3. Instructor管理のdisposable / training-only GitHub Training Copyへ反映する。
4. Web baseline、Android baseline、Web expected-failureの3 runとArtifactを確認する。
5. Active Workflow allowlist、`permissions: contents: read`、Secret / Environment / OIDC / write permission / self-hosted runner / Production Deployなしを確認する。
6. 必要な場合だけ、PR HEADとTraining Copy resolved SHAの一致を記録する。

これらのremote run、`FINAL_CANDIDATE_SHA` freeze、Delivery start/end PR HEAD equality、Training Copy resolved SHA equality、Final Delivery Recordは、Future operational validation / optional instructor validationであり、本PRのMerge blockerではない。

Training Copy remoteが利用できない場合:

- Remote Deliveryを未実施のOptional validationとして記録する。
- Local prepare / validate、Curriculum、Web、Physical Android、Required CIなどの独立したRequired DoD判定は継続する。
- Remote Delivery未実施をfailure、Blocked task、Merge blockerへ昇格しない。

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

#### Windows Local Android Physical Device Contract

Windows Local Fresh Learner / Part 1 NativeのCanonical Runtimeは、USB接続されたPhysical Android Deviceとする。既存`android-local.ps1`へ明示serialと`-RequirePhysicalDevice`を渡し、次を有限・fail-closeに確認する。

- ADB statusが`device`であること。
- `ro.kernel.qemu` / `ro.boot.qemu`がEmulatorを示さないこと。
- Android APIが`app.config.ts`の`minSdkVersion`以上であること。
- Device ABIをAuto検出し、そのABI向けRelease APKをBuildすること。
- Package service、awake、unlocked、Maestro操作可能性を確認すること。
- Build / APK integrity / Install / Smoke / Test Control / Training Maestro / Evidenceを同じserialで実行すること。

Android Emulator / AVDはWindows Localの任意補助経路であり、Part 1完了条件にはしない。GitHub Native CIでは別契約としてAPI 34 / `google_apis` / `x86_64` Emulator Runtimeを維持する。

Target:

- `scripts/native/windows/android-local.ps1`

`scripts/training/android-emulator.ps1`はWindows Local Canonical経路から除去する。CIのEmulator準備・起動は`training/github-actions/training-native-ci.yml`および`.github/workflows/native-ci.yml`のWorkflow内で完結する。

Compile SDK 36とRuntime API 34を「同じAPI Levelでなければならない」と誤解させない教材説明を追加する。

#### Alternative

- macOSのWeb学習はSupported。
- macOS Native / iOS SimulatorはOptional / Best-effort extension。
- Linux Desktopは初版Required Support外。

Platform対応を広げるために本PRを止めない。

### 7.7 Instructor Reference

Public Repository内のInstructor資料は秘密にできないため、`Instructor-only`ではなく**Instructor Reference**と呼ぶ。

- `03_instructor-reference.md`をRequired文書として作成する。
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

Curriculum全体で共通して評価するCompetencyを以下12個へ固定する。詳細な評価正本は`02_competency-rubric.md`へ置く。

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

完了対象は22文書。既存20文書の再Baselineに加えて、新規Required 2文書を実装する。

| File | Required direction | Priority |
| --- | --- | --- |
| `README.md` | Current iOS保証、Spec Oracle、Training実入口、Part 1/2 Outcome | P1 |
| `00_learning-design.md` | C01〜C12、Competency評価、Spec→Risk Flow、Training境界 | P1 |
| `01_spreadsheet-test-design.md` | CSV Workbook、BR/AC/Risk Traceability、`;`区切りGrammar、Progressive Disclosure | P1 |
| `02_competency-rubric.md` | C01〜C12 / Level 0〜3 / Part 1・2評価Contractの正本 | P1 New Required |
| `03_instructor-reference.md` | Expected Contract / Alternative / Anti-pattern / Facilitation / Troubleshooting | P1 New Required |
| `part1/01_test-automation-foundations.md` | C01 Automation Purpose / Scopeへ接続 | P1 |
| `part1/02_scenario-shop-analysis.md` | Normative SpecとObserved Behaviorを分離 | P1 |
| `part1/03_test-design-and-automation-selection.md` | Spec→Risk→Design→Layer→Automation | P1 |
| `part1/04_playwright-foundations.md` | Coding Bridge、Training Config / Project / Command | P2 |
| `part1/05_playwright-e2e-practice.md` | Training Playwright実Path、Desktop / Mobile、baseline / failure separation、Seed / Evidence | P1 |
| `part1/06_execution-and-failure-analysis.md` | Failure Taxonomy、Evidence、Expected Fail Exercise | P1 |
| `part1/07_maestro-native-automation.md` | Training Maestro実Path、Windows Local Physical Device Canonical、GitHub CI Emulatorとの責務分離、iOS Optional | P1 |
| `part1/08_test-management-and-maintainability.md` | Spec変更Lifecycle、不要Test削除判断 | P2 |
| `part1/09_part1-capstone.md` | Cart Core維持、Competency Evidence、Advanced段階化 | P1 |
| `part2/01_software-development-process.md` | Spec Change→Implementation→Review→Test | P2 |
| `part2/02_git-version-control.md` | exact SHA + Script化Training Copy、Part 1 artifact移行 | P1 |
| `part2/03_github-pull-request-review.md` | Spec/Test/Validation Traceability | P2 |
| `part2/04_ci-github-actions.md` | Training Workflow allowlist、Trust Boundary、Training Copy prepare / validate、Optional operational validation境界 | P1 |
| `part2/05_playwright-ci.md` | Training Web CI baseline / expected-failure / Artifact実手順 | P1 |
| `part2/06_native-ci-maestro.md` | Android Training CI Runtime Contract、Native detect、API 36 build / API 34 runtime、Current iOS Build-only | P1 Critical |
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

教材本文は、参照するTraining資産が存在してから最終確定する。これにより「Lessonが存在しないPath / Command / Projectを参照する」状態を避ける。

### 13.1 Execution continuity contract

1PRを途中の局所障害で止めないため、Blockerを次の2種類へ分ける。

#### Local Blocker

特定Task / Wave / Validationだけに影響し、他の正当性を評価できるもの。

例:

- Windows LocalのPhysical Deviceが未接続・未認証・lock中である。
- Instructor管理Training Copy remoteが一時的に利用できない（将来のOptional validationのみ）。
- 1つのFailure Exerciseだけが未完成。

Local Blocker発生時:

1. 該当TaskをBlockedとして`TASKS.md` / `REPORT.md`へ記録する。
2. 依存Taskだけを止める。
3. Curriculum、Workbook、Web Training、Rubric等、独立して進められるTaskは継続する。
4. Required Definition of DoneのFinal ValidationまでにRequired Blockerを解消する。

#### Global Blocker

Implementation全体の正本や安全性を評価できないもの。

例:

- Specification Foundation Contractが利用不能。
- Latest `main`が広範囲に壊れ、Baselineを確定できない。
- Required Source Repositoryへアクセスできない。

Global BlockerだけWhole-run停止条件とする。

#### Final fail-close

途中でBlocked / Skipを記録してもよいが、Required項目に未解決Blockerを残したままImplementation完了扱いにしない。

将来のDelivery Readinessを実施しないことは本PRのBlockerではない。Required Definition of Doneに含まれるBlockerだけをPR Merge判定へ反映する。

### Wave 0 — Start Gate / Baseline / Contract Freeze

作業:

- `1.6 Implementation Start Gate`を全項目確認する。
- Latest `main` / Spec / Product / Test / Native / CIを再確認する。
- Information typeごとのCanonical Sourceを再確認する。
- Curriculum **22 / 22文書**（既存20 + 新規Required 2）をInventoryする。
- Current iOS Build-onlyを確認する。
- Android Build 36 / Runtime 34 Contractを再確認する。
- Current Phase 1 CIで`validate:curriculum`を接続すべきRequired Jobを確認する。
- Current Native CIのchange detectionを確認する。
- Open PR / dependency影響を確認する。
- `.codex/runs/`のPlan / TASKSへ本Wave構造を落とす。

Gate:

- Start Gate 12項目がすべてPASS。
- Required document set 22件がInventoryされている。
- Blocking Unknownが0件。
- Current factsとDecisionを分離できている。

### Wave 1 — Curriculum Contract / Training Architecture / Competency

作業:

- `02_competency-rubric.md`を新規Requiredとして作成し、C01〜C12とLevel 0〜3を正本化する。
- `03_instructor-reference.md`を新規Requiredとして作成する。
- Part 1 / Part 2修了基準を固定する。
- Core / Advancedを固定する。
- Training Path / Project / baseline / failure exercise / Config / CI Template / Workbook / OS Support Contractを本Planどおり確認する。
- Training Copy full SHA / Workflow allowlist / Trust Boundary / Required DoDとOptional operational validationの境界を確認する。

Gate:

- 後続WaveがPath、Project、Workflow allowlist、Platform、Security Boundary、Merge Gate方針を再判断する必要がない。

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
- `training-chromium`
- `training-mobile-chromium`
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

- `training-chromium`でTraining baselineだけを実行してPASSする。
- `training-mobile-chromium`でもRequired minimal Training caseを実行してPASSする。
- Formal `e2e/web/`へLearner Testが混ざらない。
- `typecheck:training`が成功する。
- Intentional Failure専用Commandは期待どおりFAILし、Trace / Screenshot / Video / Reportを生成する。
- Expected Failure Validation wrapperは「期待したFAIL + Evidenceあり」を成功として判定できる。

### Wave 4 — Training Maestro / Android Foundation

作業:

- `training/maestro/baseline/`
- `training/maestro/exercises/`
- 必要な場合のみ`training/maestro/failure-exercises/`
- `scripts/native/windows/android-local.ps1`のPhysical Device opt-in
- Android local physical-device setup / command
- Test Control Reset
- baseline Flow
- Evidence
- Formal `maestro/`との分離

Validation:

- Compile SDK 36 / Build Tools 36.0.0を確認する。
- Canonical Windows環境で明示serialのPhysical Deviceを`-RequirePhysicalDevice`付きでDoctor → Prepare → Build → Install → Launch → Test Control → Training baseline → Evidenceまで通す。
- Formal MaestroとTraining baselineを分離できる。
- GitHub Native CI側ではAPI 34 `google_apis` `x86_64` Emulator RuntimeとTraining baselineを維持する。
- iOS RuntimeをRequired Validationにしない。

### Wave 5 — Training Copy / GitHub Actions Foundation

作業:

- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- Web baseline mode
- Web expected-failure mode
- Android Training CI Runtime Contract
- read-only / no-secret / GitHub-hosted runner Trust Boundary
- `scripts/training/prepare-training-copy.ts`
- `scripts/training/validate-training-copy.ts`
- exact Source SHA Contract
- Training Workflow allowlist Contract
- Training Copy preparation / activation README
- Web Failure Artifact
- Android Maestro Evidence

Validation — Local / Source component only:

- Current PR HEAD full SHAを入力してDisposable Local Training Copyを生成する。
- `.github/workflows/`が`training-ci.yml` / `training-native-ci.yml`の2件だけになる。
- `validate-training-copy` PASS。
- `permissions: contents: read` / no-secret / no-environment / no-self-hosted / no-OIDC / no-writeを確認する。
- Cloudflare Deployなし。
- Android Training CIが`ubuntu-24.04` / Java17 / API34 google_apis x86_64 / KVM / finite boot wait / serial / evidence / cleanup Contractを持つ。
- Source Working Treeへ不要差分なし。
- resolved Source SHAを記録できる。

**Wave 5では正式なGitHub Delivery Readiness EvidenceをRequired成果物として確定しない。** Training Copy preparation / validationとWorkflow Trust BoundaryはRequired Assetとして維持し、remote 3 Runは将来のOptional operational validationへdeferする。

### Wave 6 — Part 1 Curriculum Rebaseline

Training実Path / Project / Commandが確定した後にPart 1全文書を改訂する。

作業:

- Automation Purpose / Spec / Risk / Test Design Flow
- Coding Bridge
- Training Playwright Desktop / Mobile / baseline / exercise / expected failure実手順
- Failure Taxonomy
- Windows Local Physical DeviceのTraining Maestro実手順と、GitHub CI API 34 Emulator保証の責務分離
- Maintainability
- Core / Advanced Capstone
- Competency Mapping

Gate:

- Part 1全LessonでPath / Project / Command / 用語 / 完了条件が実装と一致する。

### Wave 7 — Part 2 Curriculum Rebaseline

Training CI実体が存在してからPart 2全文書を改訂する。

作業:

- full Source SHAを使ったTraining Copy移行
- Training Workflow allowlist / Trust Boundary
- Git / GitHub / PR
- Web Training CI baseline / expected-failure
- Android Training CI Runtime Contract
- 将来のOptional operational validationとしてのDelivery Readiness設計
- Current Formal CI比較
- Android Build API / Runtime API差
- iOS Build-only全面反映
- Quality Gate / Cost / Reliability
- Integration Capstone

Gate:

- Current Workflowと教材のCurrent Factに差異がない。
- Training CIとFormal CIの責務を区別できる。
- Training CopyでFormal WorkflowがActiveにならないことを説明できる。
- Training CIのleast-privilege Boundaryを説明できる。

### Wave 8 — Instructor / Setup / Recovery

作業:

- Learner Navigation
- `03_instructor-reference.md`のRequired内容完成
- `02_competency-rubric.md`のRubric詳細完成
- Expected Contract / Alternative Design / Anti-pattern
- Failure Exercises
- Web Start Gate
- Android Physical Device / Start Gate
- Training Copy Start Gate / Trust Boundary
- Troubleshooting
- Part 1 → Part 2 migration

Gate:

- 講師の暗黙知がRequired手順として残らない。
- Developer Options、USB debugging、ADB authorization、explicit serial、`device` status、awake、unlocked、supported Android API、ABI、package serviceのPhysical Device Recoveryを扱う。
- Training Copy active Workflow / permission / runner不一致をRecoveryで扱う。

### Wave 9 — Curriculum Validator / Required CI / Repository-wide Integration Review

作業:

- `scripts/validate-curriculum.ts`
- `validate:curriculum`
- `verify`接続
- `typecheck:training`のRepository typecheck接続
- `.github/workflows/ci.yml`のRequired Quality Jobへ`validate:curriculum`追加
- Phase 1 CIへTraining Web baseline smoke追加
- Native Runtime CIへTraining Maestro baseline smoke追加
- Native CI change detectionへ`training/maestro/**`追加
- `tests/contracts/native-ci-workflow.test.ts`等へ必要なWorkflow Contract追加
- **全22文書 + Training assets**の整合Review

Validatorは最低限以下を決定的に確認する。

- Curriculum Required file setが22文書と一致し、`02_competency-rubric.md` / `03_instructor-reference.md`が存在する。
- Required Training Pathの存在
- Workbook header contract
- `;`区切りMultiple ID Grammar
- Training Playwright Config / `testDir` contract
- `training-chromium` / `training-mobile-chromium` Project存在
- Training CI Templateの存在
- Training Workflowのread-only permission / no-secret / no-environment / no-self-hosted / no-write / approved direct action contract
- Android Training CI Runtime Contractに必要なRunner / API / image / KVM / boot / timeout / serial / evidence / cleanup要素
- Training Copy preparation / validation Scriptの存在
- Curriculumが参照するRepository-owned Package Scriptの存在
- 明示的Relative Linkの存在
- Sample Spec / BR / AC referenceのIntegrity

自然文からWorkflow Job名や全Seed IDを推測抽出するような複雑なParserや、任意実行コードの意味論を完全解析するSecurity Scannerは作らない。

Validation:

- `pnpm run validate:curriculum`がLocalでPASSする。
- `pnpm run typecheck`でTraining TypeScriptまでPASSする。
- Required Phase 1 CI上で`validate:curriculum`が実行される。
- Training Web baseline smokeがSource CIでPASSする。
- `training/maestro/**`だけの変更でNative CI detectがtrueになるContractをTestで確認する。
- Training Maestro baseline smokeがSource Native CIでPASSする。

### Wave 10 — End-to-End Fresh Learner Validation / Required Merge Evaluation

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
Training Playwright desktop baseline
↓
Training Playwright mobile project
↓
Intentional Failure / Evidence
↓
Physical Android Device preparation
↓
Training Maestro baseline
↓
Part 1 Capstone
↓
Training Copy preparation / validation with exact Source SHA
↓
Git / GitHub / PR
↓
Training CI design / local validation
↓
Current Formal CI comparison
↓
iOS Build-only analysis
↓
Quality Gate design
↓
Part 2 Capstone
↓
Source Required CI final PASS
↓
Current PR Required DoD evaluation
↓
Optional Future Training Copy operational validation
```

Required Merge Evaluation:

- Required Curriculum 22 / 22文書が存在し、Validator対象になっている。
- Workbook / Training assets、Formal / Training境界、Training Copy prepare / validateが成立している。
- Training Playwright desktop / mobile、learner exercise、expected-failure lifecycleがPASSする。
- Windows Local Physical AndroidでTraining Maestro baselineがPASSする。
- GitHub Native CIのAPI34 / `google_apis` / `x86_64` EmulatorでTraining Maestro baselineがPASSする。
- `pnpm run verify`、Current PR HEADのPhase 1 CI / Native CIがPASSする。
- Critical / Highの未解消Source findingがない。
- Remote Training Copy Delivery未実施はFuture operational validationとして記録し、Required Merge Gateへ含めない。

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

- `training-chromium` baseline minimal PASS
- Seed Reset
- `training-mobile-chromium` minimal PASS
- Intentional Failure専用Command
- Expected FAILを確認
- Trace / Screenshot / Video / HTML Report確認
- Formal Regression isolation確認
- Source Phase 1 CI baseline smoke PASS

### 14.3 Training Android

Local:

- Canonical device: USB-connected Physical Android Device with explicit serial and ADB status `device`
- Build Contract: Compile SDK 36 / Build Tools 36.0.0
- Physical Device Start Gate: Developer Options / USB debugging / ADB authorization / awake / unlocked
- Android API: `app.config.ts`の`minSdkVersion`以上。特定のAPI 30を最低値として固定しない
- ABI: `Auto`検出で端末に合わせる
- Doctor
- Prepare
- Build
- APK integrity
- Install
- Launch
- Test Control Reset
- Training Maestro baseline PASS
- Evidence確認
- cleanup
- Formal Maestro isolation確認

Training GitHub Actions:

- Runner `ubuntu-24.04`
- Java 17 / Node 24 / pnpm 9.10.0 / Maestro 2.8.0
- API34 `google_apis` `x86_64` system image
- KVM available / enabled
- fresh AVD creation
- finite ADB / boot / package-service waits
- exact target serial selection
- APK install / launch / reset
- Maestro baseline finite execution
- JUnit / Maestro debug / emulator log / logcat / environment evidence `if: always()`
- Emulator cleanup `if: always()`

Source Formal CI:

- Source Native CI baseline smoke PASS
- `training/maestro/**` change detection Contract PASS

### 14.4 Training Copy / CI

#### Local / Source component

- Current PR HEAD full SHAをexplicit source SHAとして使用
- Disposable Local Training Copy生成
- `.github/workflows/` active allowlist = `training-ci.yml`, `training-native-ci.yml`
- `validate-training-copy` PASS
- `permissions: contents: read`
- write permission / OIDC / Secret / Environment / self-hosted runnerなし
- approved direct action / Repository-owned Training command entry point Contract
- Source Working Treeへ不要差分なし
- resolved Source SHA記録

#### Optional Future Training Copy operational validation component

- `prepare-training-copy` / `validate-training-copy`のLocal Trust BoundaryとWorkflow allowlistを維持する。
- Instructor管理のremote Training Copy、Web baseline、Android baseline、Web expected-failureは任意の将来運用で実行できる。
- Optional実行時は、permissions、Secret、Environment、OIDC、runner、Deploy境界を確認する。
- `FINAL_CANDIDATE_SHA`、Delivery start/end PR HEAD equality、Training Copy resolved SHA equality、Final Delivery Recordは任意の将来Evidenceとする。
- これらを未実施でも本PRのRequired DoD、Merge Gate、Task完了判定には影響させない。

Training Copy operational validationは**PR #25のRequired Merge Gateではなく、Future operational validation / optional instructor validation**とする。

### 14.5 Formal Regression

Training用`package.json`変更等によってCurrent Native CIが起動することはExpectedとする。

Agentは「Native Codeを変えていないから」という理由だけでNative CI path filterを弱めたり、`package.json`をchange detection対象から外したりしない。

一方、`training/maestro/**`は新しいRequired Training baselineをNative Runtime CIで実行するため、Native change detectionへ明示的に追加する。

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
- `training/maestro/**`がNative detection対象である。
- Training TypeScriptがtypecheck対象である。

「Scriptは存在するがRequired CIから呼ばれていない」「Training path変更でRequired Jobがskipされる」をPASSにしない。

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
- Training Copyではactive Workflowをallowlist 2件へ固定する。
- `prepare-training-copy`でCopy側だけをallowlist化する。
- `validate-training-copy`で`.github/workflows/`の完全一致を検証する。
- Source RepositoryのFormal Workflowを削除しない。

### Risk 3: GitHub Training Copy remoteが利用できない

Mitigation:

- Local disposable copy / Source Required CIの独立検証を先に進める。
- Remote DeliveryはOptional / Future Operational Validationとして記録する。
- 他WaveとRequired Merge Evaluationを止めない。
- Remoteが利用可能になった時点で、必要に応じて任意のRun Evidenceを取得する。
- Evidence未取得を本PRのMerge blockerへ昇格しない。

### Risk 4: Optional operational validationでEvidenceが古いcandidateを指す（PR #25 Required Merge Gate外）

Mitigation:

- Optional operational validationを実施する場合だけ、開始時点のSource full SHAを記録する。
- Optional実行の開始 / 終了時に、使用したSource SHAとTraining Copy resolved SHAを確認する。
- Optional実行開始後にSourceが変わった場合は、そのEvidenceを再利用しない。
- 新しいSourceでOptional実行を再開する場合は、必要なrunだけを再実行する。
- このRiskとMitigationはPR #25のRequired DoD、Task、Merge Gateには影響しない。

### Risk 5: Training Copy candidate実行がProduction権限へ触れる

Mitigation:

- Optional remote operational validationでは、same-repo maintainer-controlled sourceのfull SHAだけを許可する。
- Optional remote operational validationではFork / third-party SHAを禁止する。
- dedicated disposable training-only repositoryを使う。
- `permissions: contents: read`を明示する。
- Secret / Environment / OIDC / write permission / self-hosted runnerを禁止する。
- Production / Organization SecretがTraining Copyへgrantされていないことを確認する。
- `actions/checkout` credentialsをpersistしない。
- approved direct actions + Repository-owned Training command entry pointをValidatorで確認する。

### Risk 6: Android Training CIが環境依存で再現しない

Mitigation:

- `ubuntu-24.04` / Java17 / API34 `google_apis` `x86_64` / `pixel_2` / KVMを固定する。
- AVDをrunごとにfresh作成する。
- ADB / boot / package serviceをfinite timeoutで待つ。
- target serialを確定する。
- failure evidence / cleanupを`if: always()`相当で実行する。
- Current Formal Native Runtimeの実証済みPrimitiveを参照する。

### Risk 7: Windows Native setupが重い

Mitigation:

- Windows LocalのCanonical EnvironmentをPhysical Deviceへ限定し、CI Emulatorは別契約として記述する。
- Build 36とGitHub Native CIのRuntime API 34を責務分離して記述する。
- GitHub Training CIのAVD作成・bootをTraining Workflowへ集約する。
- Existing Android Local ScriptをDevice接続後のContractとして再利用する。
- macOS / Linuxの完全サポートを初版へ要求しない。

### Risk 8: Native Training変更でRequired CIがskipされる

Mitigation:

- `training/maestro/**`をNative change detectionへ追加する。
- Existing Workflow Contract Testで検知対象を確認する。
- Training baseline smokeがNative Runtime Jobへ実在することを確認する。

### Risk 9: Workbook管理が目的化する

Mitigation:

- CSV 4ファイルに限定する。
- Lessonごとに入力Columnを段階化する。
- Multiple ID Grammarを`;`へ固定する。
- Test Case数ではなくRisk / Reasonを評価する。

### Risk 10: Instructor ReferenceがLearnerに見える

Mitigation:

- Publicであることを明記する。
- Standard Navigationから外す。
- 秘密情報を置かない。
- Access Control実装へScopeを広げない。

### Risk 11: Curriculum Driftが再発する

Mitigation:

- 22文書のRequired file setをValidatorで確認する。
- `validate:curriculum`をRequired Phase 1 CIへ直接接続する。
- Machine-verifiableなPath / Script / Schema / Projectを検証する。
- Training Web / Native baseline smokeをFormal CIで実行する。
- Current Guaranteeを引用するLessonではCanonical SourceへのLinkを残す。

### Risk 12: Intentional Failureが通常CIを壊す

Mitigation:

- `baseline`と`failure-exercises`をPathで分離する。
- Required PR Triggerは`baseline`だけを実行する。
- `expected-failure`はManual Workflowとして分離する。
- Artifact Uploadは`if: always()`相当で保証する。

### Risk 13: Training TypeScriptが品質Gateから漏れる

Mitigation:

- `tsconfig.training.json`を追加する。
- `typecheck:training`をRepository `typecheck`へ接続する。
- Runtime Failure ExerciseでType Errorを教材化しない。

### Risk 14: Existing Repositoryが正解集になる

Mitigation:

- Formal Regression / Current Workflowは演習後に比較する。
- RubricはAlternative Designを許容する。
- Current ImplementationとSpecificationをOracleとして混同しない。

### Risk 15: iOSを教えるためにCI方針を歪める

Mitigation:

- Current Build-only Contractを教材として使う。
- iOS RuntimeはOptional / hypothetical designとしてのみ扱う。

---

## 16. Open questions / 曖昧性

### 16.1 Blocking questions

**なし。**

本Planでは以下を固定済みである。

- Curriculum Required documents = existing 20 + new 2 = 22
- `02_competency-rubric.md` / `03_instructor-reference.md` = Required separate files
- Implementation Start Gate = Spec Foundation + `docs/spec/README.md` + BR/AC + `validate:spec` + Current ADR/Workflow再Baseline
- Training Playwright = separate config + `training-chromium` / `training-mobile-chromium`
- Training Playwright = baseline / exercise / expected failure separation
- Training Maestro = separate path + baseline separation
- Workbook = CSV canonical template
- Multiple BR / AC IDs = `;`区切り
- Training Workflow = repository内Template、Training Copyでのみ有効化
- Training Copy Source = full commit SHA
- Optional remote operational validationのDelivery Source = same-repo maintainer-controlled sourceのPR HEAD full SHA
- Training Copy active Workflow = allowlist 2件のみ
- Training Copy preparation / validation = Script化
- Training CI Trust Boundary = read-only token / no secrets / no environment / GitHub-hosted runner / isolated training repo
- Web / Android Training CI = Required Asset
- Web Failure Artifact = Manual expected-failure Workflow Run
- Android Training CI Runtime = ubuntu-24.04 / Java17 / API34 google_apis x86_64 / KVM / finite wait / serial / evidence / cleanup
- Source Formal CI = Training baseline smokeを継続実行
- Native detection = `training/maestro/**`を対象化
- `validate:curriculum` = Required Phase 1 CIへ明示接続
- Training TypeScript = dedicated typecheck + Repository typecheckへ接続
- Native learner canonical environment = Windows 11
- Android Build = Compile SDK 36 / Build Tools 36.0.0
- Android Training CI Runtime = API 34 / `google_apis` / `x86_64` / `pixel_2`
- Training CI Emulator lifecycle = `training/github-actions/training-native-ci.yml`内で完結
- Instructor asset = Public Instructor Reference
- Local Blocker = 独立Taskを止めない
- Delivery Readiness = Optional / Future Operational Validation。Required Merge Gateには含めない

### 16.2 実装時に仮定してよい細部

以下はCurrent Repository Conventionに従い、後から局所修正可能でありContractを変えない範囲で実装者が決めてよい。

- Training Scriptの細かなPackage Command名
- `prepare-training-copy`の具体的CLI option名。ただしfull SHA必須。
- Evidence Folder内の補助File名
- CSV Sample Rowの具体的なCase
- Instructor Referenceの章内表示順
- Troubleshooting項目の表示順
- `validate:curriculum`を既存`style-quality`か`code-quality`のどちらへ置くか。ただしRequired Phase 1 CIで必ず実行する。
- `training-mobile-chromium`の具体的device descriptor / viewport値。ただしMobile相当ProjectとしてCurrent Playwright Conventionに沿う。
- Android Training CIの個別step timeout秒数。ただしすべて有限であり、Current Formal Native CIの値を合理的な初期値として参照する。
- Approved GitHub Action setの具体的列挙。ただしCurrent Repositoryで利用実績があり、Training Workflowが必要とする最小setに限定する。

ただしRequired文書数、Path、Project名、Workflow allowlist、full SHA必須、Supported OS、DoD、Security Boundary、Android CI Runtime Contract、Oracle、Training baseline / failure separationの変更は仮定扱いにしない。Delivery ReadinessのRequired / Optional境界はOwner Decisionで確定する。

---

## 17. Follow-up notes

- API / Performance / Security / Visual Regression等の追加Curriculumは本Implementation後の学習効果を見て別Planで判断する。
- macOS NativeをRequired Supportへ昇格する場合は、Canonical Setup / Validationを別途定義する。
- Instructor Referenceを本当に非公開にする必要が生じた場合は、Public Repository外のDelivery方式を別タスクで検討する。
- iOS Runtime CI方針が将来変わった場合はCurriculumをADRと同時に再Baselineする。
- GitHub Training Copyの恒久的なOrganization運用、自動Provisioning、remote 3 Run、Final Delivery Recordが必要になった場合は別の運用改善として扱う。本PlanではTraining Copy preparation / validation ContractをRequired Assetとして維持し、remote運用はOptional / Future Operational Validationとする。
- より高度なSupply-chain policy enforcementが必要になった場合は別Security Planで扱う。初版はleast privilegeとIsolationを主境界とする。

---

## 18. Definition of Done

### Start Gate

- Specification Foundation ImplementationがCurrent `main`へMerge済み。
- `docs/spec/README.md`が存在する。
- Normative / Supporting境界が明示される。
- BR / AC参照Contractが利用可能である。
- `pnpm run validate:spec`がLocal / Required CIで成功する。
- Specification FoundationのNative / iOS保証記述がCurrent ADR / Workflowと一致する。
- Latest `main`からImplementation Branchを作成している。

### Curriculum

- **22 / 22文書**（既存20 + `02_competency-rubric.md` + `03_instructor-reference.md`）が存在し、必要な再Baseline / 新規整備が完了している。
- Automation Purpose → Spec → Risk → Design → Automation → CIが1本のLearning Storyとしてつながる。
- iOS Runtime / MaestroをCurrent Formal CI Guaranteeとして誤記していない。
- Android = Build + Runtime、iOS = Build-onlyを正しく説明する。
- Android Build APIとRuntime APIの違いを誤解なく説明する。
- SpecificationがExpected Behavior Oracleとして一貫して扱われる。
- Test本数だけで修了判定しない。

### Competency / Instructor

- `02_competency-rubric.md`がRequired fileとして存在する。
- C01〜C12とLevel 0〜3が存在する。
- Part 1 / Part 2の修了Competencyが明示される。
- `03_instructor-reference.md`がRequired fileとして存在する。
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
- `training-chromium`が存在する。
- `training-mobile-chromium`が存在する。
- `training/playwright/baseline/`がRequired PASSとして実行できる。
- `failure-exercises/`が通常PASS Suiteから分離されている。
- Formal `e2e/web/`へLearner Testが混在しない。
- Seed ResetとFailure Evidenceを利用できる。
- Training TypeScriptがtypecheck対象である。

### Training Maestro

- `training/maestro/baseline/`が存在する。
- Windows LocalではCanonical Physical Android DeviceでRequired Flowを実行できる。
- GitHub Native CIではAndroid API 34 / `google_apis` / `x86_64` EmulatorでRequired Flowを実行できる。
- Formal `maestro/`と分離されている。
- Source Native CIでTraining baseline smokeを実行する。
- `training/maestro/**`変更でNative Runtime CIがskipされない。
- iOS RuntimeをRequiredにしていない。

### Training Copy / CI

- `prepare-training-copy`がfull Source SHAからDisposable Copyを決定的に準備できる。
- Local Training Copyは指定したfull Source SHAから作成できる。Optional remote operational validationを行う場合だけ、same-repo maintainer-controlled sourceのPR HEAD full SHAを使用する。
- Training Copyの`.github/workflows/`が`training-ci.yml` / `training-native-ci.yml`のallowlistと完全一致する。
- `validate-training-copy`がTrust Boundaryを確認できる。
- Training Workflowが`permissions: contents: read`、no-secret、no-environment、no-OIDC、no-write、GitHub-hosted runner Contractを満たす。
- Web Training CI Templateが存在する。
- Android Training CI Templateが存在し、`ubuntu-24.04` / Java17 / API34 / KVM / AVD / finite boot / serial / evidence / cleanup Contractを満たす。
- Web baseline / Android baseline / Web expected-failureは、Source CIおよびLocal Training assetとしてRequired条件を満たす。remote Training Copyでの実RunはOptionalとする。
- Formal Phase 1 / Native / iOS / Deploy WorkflowがTraining CopyでActiveにならない。

### Setup / Recovery

- Web Start Gateがある。
- Windows Local Android Start Gateがあり、Physical DeviceのUSB／ADB authorization／awake／unlockedを確認する。
- GitHub Native CI Training用のAVD create / reuse / boot手順がある。
- Training Copy active Workflow / permission / runner確認手順がある。
- Part 1 → Part 2 Training Copy移行手順がある。
- Browser / JDK / Android SDK / Physical Device / CI AVD / APK / Maestro / Git / Actionsの主要FailureをTroubleshootできる。

### Validation

- `pnpm run typecheck:training`が成功する。
- `pnpm run validate:curriculum`が22文書Required setを含め成功する。
- `pnpm run verify`が成功する。
- Required Phase 1 CIで`validate:curriculum`が実行・成功する。
- Required Phase 1 CIでTraining Web baseline smokeが成功する。
- Required Native CIでTraining Maestro baseline smokeが成功する。
- `training/maestro/**`がNative change detection対象である。
- Required Native CI全体が成功する。
- iOS Build-only Gateが成功する。
- Fresh Learner Dry RunがRequired項目を完走する。
- Current PR HEADのPhase 1 CI / Native CIが成功する。
- Windows Local Physical AndroidのTraining Maestro baselineとGitHub Native CI API34 EmulatorのTraining Maestro baselineが成功する。
- Critical / Highの未解消Source findingがない。
- remote Training CopyのWeb baseline / Android baseline / Web expected-failure、`FINAL_CANDIDATE_SHA`、PR HEAD / resolved SHA equality、Final Delivery RecordはOptional / Future Operational Validationであり、Required DoDに含めない。
- 未解消Required Blockerがない。

### PR

- 上記Source変更を**1本のCurriculum Implementation PR**でReview可能にする。
- Training Copyのremote運用を行う場合も、2本目のImplementation PRを作らず、別のOptional operational validationとして扱う。
- Delivery ReadinessはCurriculum Implementation PR Merge前のRequired Gateではない。
- Fresh Learner / Run Artifactは今回のRequired DoD判定の根拠とする。
- Final Delivery Record、freeze後のEvidence、PR HEAD / resolved SHA equalityは将来任意の運用記録とする。
- Specification Foundationそのものを含めない。
- Product機能追加・無関係なRefactorを混在させない。

---

## 19. Final Review Questions

PR Merge前に以下へすべてYesと答えられることを確認する。

### Start Gate

- `docs/spec/README.md`がCurrent mainに存在するか。
- Normative / Supporting境界が明確か。
- BR / AC参照ContractがCurrentか。
- `validate:spec`がRequired CIで実際に実行されているか。
- Current Android / iOS保証とSpecが一致するか。

### Educational

- 22 / 22 Required Curriculum文書が存在するか。
- Automationの目的と限界から学習が始まるか。
- SpecificationとObserved Behaviorを区別できるか。
- RiskとTest Designが接続されているか。
- Test Layer / Automation Selectionに理由があるか。
- 自動化しない判断を評価できるか。
- Failure原因をProduct以外へも切り分けられるか。

### Practical

- Fresh LearnerがWebを起動できるか。
- `training-chromium`でbaselineを実行できるか。
- `training-mobile-chromium`でminimal caseを実行できるか。
- Intentional Failureを通常PASS Suiteと混ぜずにEvidence確認できるか。
- WindowsでPhysical Android Deviceを明示serialで準備・検証できるか。
- AndroidでMaestro baselineまで進められるか。
- Part 2へ成果物を引き継げるか。
- full Source SHAからTraining CopyをScriptで準備・検証できるか。
- Training PR / CIをProduction環境へ影響せず実行できるか。

### Current repository consistency

- Current Native Scopeと一致するか。
- Android Build 36 / Runtime 34 Contractと一致するか。
- iOS Build-onlyと一致するか。
- Package Script名が実在するか。
- Training Path / Project名が実在するか。
- Training TypeScriptがtypecheckされるか。
- `validate:curriculum`がRequired Phase 1 CIで実行されるか。
- Training baseline smokeがWeb / Native Formal CIで実行されるか。
- `training/maestro/**`だけの変更でもNative CIが起動するか。
- Specification ReferenceがCurrent Specと一致するか。
- Formal RegressionとTraining Testが分離されているか。

### Optional future Delivery evidence / Trust Boundary

以下は将来、Instructorが任意にremote Training Copy operational validationを実施する場合の確認項目であり、本PRのMerge条件ではない。

- 必要な場合だけDelivery開始直前のPR HEAD full SHAを記録する。
- Training Copy resolved Source SHA、Delivery開始 / 終了時PR HEADの一致を確認する。
- Training CopyのActive Workflowがallowlist 2件だけか確認する。
- Workflow permissionが`contents: read`のみか確認する。
- write permission / `id-token: write` / `secrets.*` / `environment:` / `self-hosted`がないか確認する。
- Training CopyへProduction / Organization Secretがgrantされていないか確認する。
- Web / Android baselineとWeb expected-failureのRun URL、結論、Artifactを記録する。
- Production / Deploy WorkflowがActiveになっていないか確認する。

### Maintainability

- 教材のためだけの過剰な抽象化がないか。
- Instructorだけが理解する暗黙手順がないか。
- Curriculum DriftをMachine validation + Runtime baseline smokeで検出できるか。
- Training専用コードとFormal Regressionの責務が明確か。
- Training Copy preparationが手作業依存になっていないか。
- Workflow分類ロジックではなくallowlistで安全境界を単純化できているか。
- Security Validatorが任意コード完全解析へ過剰拡張されていないか。

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
Playwright Desktop / Mobile / Maestro
↓
Failure Evidence / Analysis
↓
Maintenance
↓
Git / PR / Review
↓
Training CI / Formal CI比較
↓
Quality Gate
↓
Automation Introduction Design
```

受講者が最終的に次のような説明を、自分のEvidenceとTrade-offを伴ってできる状態を目指す。

> この仕様とBusiness Riskから、この条件を確認します。
> このRuleの細かい組み合わせは下位Testへ置き、User JourneyはPlaywrightで確認します。
> Desktopだけでなく、必要なResponsive RiskはMobile Projectでも確認します。
> NativeではPlatform固有RiskだけMaestroへ追加します。
> このTestは自動化しません。保守Costに対してRegression価値が低いためです。
> PRではこのSuiteをRequiredとし、高コストな確認は別Timingへ配置します。
> Failure時にはこのEvidenceを確認します。
> Training CopyではTraining Workflowだけを有効にし、read-only token / no secrets / GitHub-hosted runnerで実行境界を限定します。
> Android Training CIではAPI 34 Emulatorのboot / serial / timeout / Evidence / Cleanupまで実行Contractとして扱います。
> Optional remote operational validationを行う場合は、使用したSource full SHAとEvidenceの対応を確認します。これはPR #25のRequired DoD / Merge Gateではありません。
> AndroidではBuild ContractとRuntime Contractを分け、現在の再現性とCostに合う保証Levelを選びます。
> iOSはCurrent Formal CIがBuild-onlyなので、未実行RuntimeをPASSとは報告しません。

この判断能力を育成でき、かつTraining資産自体がMachine validation / Runtime baseline / exact Source traceability / least-privilege execution / Source CI / Fresh Learner validationで継続検証できることを、本Implementationの最終成果とする。
