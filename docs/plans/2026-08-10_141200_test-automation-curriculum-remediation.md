# テスト自動化カリキュラム再Baseline・教材提供基盤 実装計画

## 0. このPlanと現在Branchの位置づけ

この文書は、`docs/curriculum/test-automation/` の現行カリキュラムを、現在のScenario ShopのProduct / Test / Native / CI構成へ再Baselineし、実際に教育提供できる状態まで仕上げるための実装計画である。

現在の `docs/test-automation-curriculum-remediation-plan` Branchは、**計画文書だけを保存・レビューするDocumentation-only Branch**とする。

このBranchでは以下を行わない。

- カリキュラム本文の変更
- Application Codeの変更
- Playwright / Maestro Testの変更
- Training専用Config / Scriptの実装
- GitHub Actions Workflowの変更
- Specification Systemの実装
- Product Bugの修正
- PR作成

このPlan承認後の実装は、最新`main`から作成する別Branchで行う。

本Planでは、依存関係とReview可能性を優先し、1本の巨大PRへ全Scopeを混在させない。

推奨する実装単位は次の3段階とする。

1. **Curriculum Rebaseline PR**
   - 現在のRepositoryとの事実整合
   - 学習者Competency定義
   - Instructor評価基準
   - Part 1 / Part 2本文改訂
2. **Training Delivery Foundation PR**
   - Training専用Playwright / Maestro / Workbook / CI教材境界
   - Setup / Start Gate / Recovery / Troubleshooting
3. **Specification Traceability Integration PR**
   - Specification Foundation実装後に、Spec / BR / AC → Risk → Test Design → AutomationのTraceabilityをカリキュラムへ接続

Specification Foundationが先に完成した場合は、1と3を同一Implementation PRへ統合してもよい。ただしTraining Delivery Foundationまで同時に混ぜることは、変更責務が大きく異なるため原則避ける。

---

## 1. Goal

### 1.1 Primary Goal

Scenario Shopを一貫した教材として使用し、受講者を単なる「Playwright / Maestroの操作ができる人」ではなく、次の一連の活動を自力で判断・実行できるTest Automation Engineerへ育成できるカリキュラムへ仕上げる。

```text
仕様・テスト対象を理解する
↓
Riskを分析する
↓
Test Condition / Test Caseを設計する
↓
適切なTest LayerとToolを選ぶ
↓
自動化する / しないを判断する
↓
Playwright / Maestro等で実装する
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

教育側が評価する中心を「手順を完了したか」「Testを何本書いたか」から、**なぜその判断をしたかを説明し、Evidenceで裏付けられるか**へ明確化する。

学習者には最低限、以下を求める。

- 対象機能を自分で探索し、Role / State / Data / Business Rule / Boundaryを整理できる。
- Test Caseを思いつきで列挙せず、Riskとテスト設計技法から導出できる。
- すべてをUI E2Eへ置かず、適切なTest Layerを選べる。
- 自動化しない判断にも理由を持てる。
- Playwright / MaestroをSyntaxではなく目的に応じて使い分けられる。
- Test Dataと初期状態を決定的に再現できる。
- FailureをProduct Defectと決めつけず、Evidenceから分類・調査できる。
- Helper / POM / Fixture / Automation Flow等を問題に応じて選べる。
- Testを変更管理・Review・CI・Quality Gateへ接続できる。
- Risk、Feedback速度、Flakiness、Runner Costを見てCI/CD設計を判断できる。

### 1.3 Definition of Done

本計画全体の完了条件は次とする。

#### Curriculum

- `docs/curriculum/test-automation/` の既存20文書をすべて最新Repository状態へ再Baselineする。
- 現在のiOS正式保証範囲をBuild-only Gateとして正しく記述する。
- Android Build + Runtime E2Eと、iOS Build-onlyの保証差を明示する。
- Native Phase 2後半で追加されたLogin / Session / Account / Address / Checkout / Payment / Order / Reviewを教材候補へ反映する。
- CartをPart 1標準Capstoneとして維持しつつ、購入・Payment Retry・Cross-roleをAdvanced課題として段階化する。
- 学習目標、演習、提出物、評価観点、完了条件が矛盾しない。
- 最低本数は演習量の下限とし、修了判定の中心をCompetencyへ移す。

#### Competency / Instructor

- Part 1 / Part 2の修了能力をCompetencyとして明文化する。
- 各Competencyに評価LevelとObservable Evidenceを定義する。
- Instructorが同じ成果物を概ね同じ基準で判定できるRubricを用意する。
- Learner向け情報とInstructor-only Answer / Evaluation情報を分離する。
- Failure分類、Review観点、Automation Selectionの判断基準を講師側でも一貫して扱える。

#### Training Delivery

- Training用Playwright Testを正式Regressionから分離して保存・実行できる。
- Training用Maestro Flowを正式Regressionから分離して扱える。
- Workbook Templateを複製可能な形で提供できる。
- Part 1開始前のWeb / Playwright Gateを実行できる。
- Native / Maestro開始前のAndroid Gateを実行できる。
- Part 2のTraining CIがProduction / Deploy Workflowや本番Secretへ依存しない。
- ZIP等からPart 2のGit管理Copyへ成果物を安全に移行できる。
- Setup失敗時のRecovery / Troubleshooting手順を用意する。

#### Specification Traceability

- Specification Foundation実装後は、実装や既存TestをOracleとして扱わない。
- Normative Specification / BR / ACからRiskとTestへ辿れる。
- Workbook上でBR / ACとRisk / Test Caseの対応を記録できる。
- Spec変更時にRisk / Test Case / Automation / Regression分類を同期して見直す演習が存在する。

#### Validation

- Markdownlintが成功する。
- Curriculum内の相対Linkが有効である。
- 現在のRepository Path / Script / Workflowの記述が実物と一致する。
- iOS Runtime未実行をPASSとして表現しない。
- Product Behaviorを変更しない。
- 既存Regression / CIの品質Gateを弱めない。

---

## 2. Current Baseline

### 2.1 Curriculum Structure

現在のカリキュラムは20文書で構成される。

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

全20文書を対象とし、一部だけを直して完了扱いにしない。

### 2.2 Current Strengths

現在のカリキュラムで維持すべき設計思想は次である。

- Tool操作より先にテスト自動化の目的とProcessを学ぶ。
- Scenario Shopだけを継続利用し、別Sample Appへ切り替えない。
- 既存Regressionを最初から正解としてコピーさせない。
- Test Design → Automation Selection → Implementationの順序を維持する。
- POM / Fixture等を最初から必須Patternとして教えない。
- 「すべてE2E」「すべてWeb / Android / iOSへ複製」を避ける。
- Part 1ではGitHubを必須にせず、Part 2でDevelopment Processへ接続する。
- Production Workflow / SecretとTraining環境を分離する。
- CIを「動けばよい」ではなく、Quality Gate / Cost / Reliabilityまで扱う。
- 最終演習で既存Repository構成を正解として先に見せず、自分の判断と比較させる。

### 2.3 Verified Current Repository Facts

2026-08-10時点で最低限次をCurrent Baselineとして扱う。

#### iOS

`docs/adr/0011-native-ci-ios-build-only-gate.md` がAcceptedであり、iOS正式Native CIはBuild-only Gateである。

正式保証は次である。

```text
Android
Build
+ Emulator Runtime
+ Maestro
+ Contract Harness
+ Production-validation Runtime

 iOS
Automation Simulator Build
+ Production-validation Simulator Build
+ Build-time Contract / Bundle Guard
```

iOSの以下は正式Gate対象外である。

- Simulator boot
- App install / launch
- Maestro runtime
- 実`expo-sqlite` Contract Harness
- Production-validation runtime
- Runtime Evidence

`native-ios-ci.yml` は `workflow_call` / `workflow_dispatch` からBuild Jobを実行し、Top-level Native CIからBuild-only Gateとして利用される。

したがって、現在のCurriculumに残る「iOS Simulator Build → Install → Launch → MaestroがCurrent CI baseline」という記述は修正必須である。

#### Specification

`docs/spec/README.md` はまだ存在しない。

`docs/plans/2026-08-09_110500_specification-agentic-qa-foundation.md` はSpecification SystemのImplementation Planであり、現時点ではNormative Specificationを教材のCurrent Oracleとして前提にできない。

そのためCurriculum改訂は次を分離する。

1. Current Repositoryで今すぐ正せる事実記述。
2. Specification Foundation実装後に有効化するTraceability改訂。

Specificationが未実装の段階で、存在しないBR / AC IDや`docs/spec/` PathをCurrent教材として記述しない。

#### Training Delivery

現行Curriculum自身が明示しているとおり、Training専用Playwright Project、Training Workflow、Workbook実Template等は教材設計上の要件であり、現時点では完成済み教材として扱わない。

---

## 3. Target Learner Competency Model

カリキュラム改訂時に、Lesson数やTest本数ではなく以下のCompetencyを修了判定の中心へ置く。

### C01: Automation Purpose / Scope

- 自動化の目的と限界を説明できる。
- 手動確認と自動確認の役割を分けられる。
- 自動化しない判断を説明できる。

### C02: Test Target Analysis

- Feature、Role、State、Data、Dependency、Boundaryを整理できる。
- 画面一覧だけでなくUser Journeyと状態遷移を見られる。

### C03: Risk-based Test Design

- RiskからTest Conditionを導出できる。
- 同値分割、境界値、Decision Table、State Transition等を実対象へ適用できる。

### C04: Test Layer / Automation Selection

- Unit / Integration / Repository Contract / Component / Web E2E / Native E2Eの役割を説明できる。
- Riskに応じて適切なLayerを選べる。
- Web / Nativeへ機械的にCaseを複製しない。

### C05: Playwright Implementation

- Locator / Action / Assertionを目的に応じて選べる。
- Auto-waitを基本に安定したWeb E2Eを作れる。
- Test CaseとAssertionの対応を説明できる。

### C06: Native / Maestro Automation

- Native固有Riskを説明できる。
- UI Test ID / Deep Link / Test Controlを使える。
- Androidを標準環境としてMaestro Flowを実装できる。

### C07: Test Data / Reproducibility

- Seed Scenario / Resetの価値を説明できる。
- Test間依存を避け、決定的な初期状態を作れる。
- Long UI setupとTest Harnessによる状態準備を使い分けられる。

### C08: Failure Analysis

- Error / EvidenceからFailure Pointを特定できる。
- Retry / Timeout延長だけで終わらない。
- Product / Test / Data / Harness / Environment / Specification等を分類できる。

### C09: Test Maintainability

- 重複、Flaky、Execution Time、責務混在を見つけられる。
- Helper / POM / Component Object / Fixture / Automation Flowを問題に応じて選べる。
- 抽象化自体を目的化しない。

### C10: Version Control / Review

- Diffを読んで変更Scopeを説明できる。
- PRでTest Design、Validation、Remaining Riskを共有できる。
- Test Codeを品質資産としてReviewできる。

### C11: CI / Evidence / Quality Gate

- Local TestをCIへ接続できる。
- Artifact / Evidenceを設計できる。
- PR / main / Nightly / ManualへTestを配置できる。
- Required GateをReliabilityとActionabilityから選べる。

### C12: Automation System Design

- Web / Android / iOSの保証範囲を分けて設計できる。
- Build / Runtime / Artifact / Deploy / Smokeを接続できる。
- Risk / Cost / Feedback Speedを理由に継続実行基盤を設計できる。

---

## 4. Competency Level

各Competencyを最低限次の4段階で評価する。

| Level | 定義 |
| --- | --- |
| 0 | 用語または手順を説明できず、ガイド付きでも成立しない |
| 1 | 手順や例があれば実行できるが、判断理由を十分説明できない |
| 2 | 自力で実施し、選択理由とEvidenceを説明できる |
| 3 | Trade-offを比較し、別案との違い・改善案まで説明できる |

原則として次を修了基準候補とする。

- Part 1: C01〜C09の主要項目がLevel 2以上。
- Part 2: C10〜C12を含む全体主要項目がLevel 2以上。
- Capstoneで一部Level 3相当のTrade-off説明が確認できれば発展到達として扱う。

Test本数はCompetencyを観測するための演習量であり、単独の合否条件にしない。

---

## 5. Curriculum Design Principles to Preserve

改訂で以下を壊さない。

1. **Progressive Disclosure**
   - 必要になる前に高度なPatternを先に暗記させない。
2. **One Product, Multiple Perspectives**
   - Scenario Shopを同じBusiness Domainのまま繰り返し見る。
3. **Reason before Tool**
   - Tool選択よりRisk / Test Conditionを先に考える。
4. **No Universal POM Rule**
   - POM等を唯一の正解として教えない。
5. **No E2E Maximization**
   - E2E本数・自動化率をKPIにしない。
6. **Evidence-based Failure Analysis**
   - RetryよりEvidenceと原因分析を優先する。
7. **Safe Training Boundary**
   - Training変更をProduction Regression / Secret / Deployへ混ぜない。
8. **Current Repository is a Comparison Example, not Absolute Truth**
   - 既存実装との差を理由付きで評価させる。
9. **Specification is Oracle once available**
   - Specification Foundation完成後はExisting Implementation / Existing TestをExpected Behaviorの正本にしない。

---

## 6. Scope

### 6.1 Existing Curriculum Documents

既存20文書すべてをReview / Update対象とする。

### 6.2 New Curriculum Support Documents

Curriculum Rebaseline PRでは、最低限以下の追加を検討する。

- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-guide.md`

必要性が重複する場合は1文書へ統合してよい。文書数を増やすこと自体を目的にしない。

### 6.3 Training Delivery Assets

Training Delivery Foundation PRでは、以下を実装対象とする。

- Training Playwright実行境界
- Training Maestro実行境界
- Workbook Template
- Training CI Template / Workflow境界
- Setup / Start Gate
- Part 1 → Part 2成果物移行手順
- Failure / Troubleshooting教材
- Instructor用Expected Evidence

具体PathはCurrent Repositoryとの衝突を確認したうえで確定する。

`.github/workflows/`へTraining Workflowを置く場合、教材元Repository上で意図せずProduction Workflowと同時起動しないContractを必須とする。

必要なら実行されないTemplate Pathへ配置し、Training Copyへ移したときだけ`.github/workflows/`へ有効化する方式を優先する。

---

## 7. Non-goals

- Scenario Shopへ新しいBusiness Featureを大量追加する。
- Coupon / Point / Refund等をカリキュラムのためだけに実装する。
- iOS Runtime CIをカリキュラム都合で復活させる。
- すべてのTest Layerを受講者自身に実装させる。
- JavaScript / TypeScriptのGeneral-purpose入門講座を作る。
- ISTQB等のTest Theory全範囲を再実装する。
- Test Management SaaSを導入する。
- Workbook管理そのものを学習目的にする。
- 全Browser / 全Platform / 全Caseを毎回Requiredにする。
- Agentic QAを初学者向けPart 1 / 2の必須範囲へ追加する。
- 現在のRepository構成を唯一の正解として暗記させる。

---

## 8. Implementation Strategy

# Program A: Curriculum Rebaseline

## Wave A0: Baseline Inventory

### Goal

全20文書をCurrent Repositoryへ照合し、変更前にFact / Learning Design / Delivery Requirementを分離する。

### Read First

- `README.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/0011-native-ci-ios-build-only-gate.md`
- `package.json`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `src/seeds/metadata.ts`
- `e2e/web/`
- `maestro/`
- `docs/plans/2026-08-09_110500_specification-agentic-qa-foundation.md`

### Output

20文書について次を一時Inventoryとして整理する。

- Current Fact
- Stale Fact
- Learning Objective
- Exercise Dependency
- Training Asset Dependency
- Spec Foundation Dependency
- Required Change

Inventoryは実装作業用であり、恒久文書化の価値がなければCommit不要とする。

### Gate

- 20 / 20文書を確認済み。
- Native / iOS Factを推測せずCurrent Workflow / ADRから確認済み。
- 未実装Training Assetを「存在する」と書かない。

---

## Wave A1: Repository Fact Rebaseline

### Goal

学習設計に手を入れる前に、Current Repositoryについて誤っている記述を0にする。

### Required Changes

#### iOS

次の誤解を全Curriculumから排除する。

- iOS Runtime / MaestroがCurrent Required Gateである。
- `native-ios-ci.yml`がInstall / Launch / Maestroまで正式保証する。
- iOS Runtime未実行をPASSとして扱う。

Current保証は必ず次の意味へ揃える。

```text
Android = Build + Runtime E2E
 iOS = Simulator Build + Build-time validation
```

「iOS Runtime CIをどう設計するか」はHypothetical / Future Design Exerciseとしてのみ扱える。

#### Native Scope

Current Native Customer Flowを再確認し、教材候補を次まで拡張可能とする。

- Storefront
- Search
- Cart
- Persistence
- Login / Session
- Guest Cart Merge
- Account / Address
- Checkout
- Payment
- Payment Failure / Retry
- Order
- Review

Native AdminはCurrent Scope外として維持する。

### Primary Files

- `README.md`
- `00_learning-design.md`
- `part1/07_maestro-native-automation.md`
- `part1/09_part1-capstone.md`
- `part2/01_software-development-process.md`
- `part2/04_ci-github-actions.md`
- `part2/05_playwright-ci.md`
- `part2/06_native-ci-maestro.md`
- `part2/07_ci-cd-quality-gates.md`
- `part2/08_integration-design-capstone.md`

### Gate

RepositoryのCurrent Native / iOS保証範囲をCurriculum内で検索し、相反する説明が0件であること。

---

## Wave A2: Learning Outcome / Competency Reframe

### Goal

Lesson完了条件を、単なるTask CompletionからObservable Competencyへ揃える。

### Changes

- READMEへPart 1 / Part 2のTarget Competencyを簡潔に追加する。
- `00_learning-design.md`へCompetency-based Evaluation原則を追加する。
- 新規Rubric文書を作成する場合はC01〜C12とLevel 0〜3を正本化する。
- 各Lessonで対象Competencyを明示するか、Rubric側からLessonへMappingする。
- 「最低3件」「最低10件」等はPractice Volumeとして残してよいが、修了判定の本体にしない。
- Capstoneでは成果物とCompetency Evidenceの対応を明示する。

### Gate

- Part 1完了時に何ができる人なのかをTest本数なしでも説明できる。
- Part 2完了時に何ができる人なのかをWorkflow YAMLの暗記なしでも説明できる。
- Instructorが同じ成果物を評価する共通基準が存在する。

---

## Wave A3: Part 1 Rework

### Goal

Part 1を「Automation基礎 → Target Analysis → Risk/Test Design → Web → Failure → Native → Maintainability → Capstone」の一本のLearning Loopとして完成させる。

### A3-1 `01_test-automation-foundations.md`

維持する内容:

- 自動化の価値と限界
- 手動との補完関係
- 自動化率を目的化しない

追加・調整:

- C01との対応を明示する。
- 最終判断に「なぜ自動化しないか」をEvidenceとして残す。

### A3-2 `02_scenario-shop-analysis.md`

維持する内容:

- Role / State / Data / User Journey
- Existing E2Eを先に読まない

追加・調整:

- Specification Foundation完成前はREADME / Guide / Seed / UIを情報源として明示的に区別する。
- Specification完成後はNormative SpecをExpected Behaviorの主Oracleへ切り替える。
- 「Observed Behavior」と「Expected Behavior」を同一視しない教育を追加する。

### A3-3 `03_test-design-and-automation-selection.md`

維持する内容:

- Equivalence / Boundary / Decision Table / State Transition
- Test Layer選択
- Test Pyramidを機械適用しない

追加・調整:

- Risk → Condition → Layer → ToolのTraceabilityを明示する。
- Specification完成後はBR / ACとの対応を追加する。
- 「自動化しない」「Manualを残す」Caseも正常な判断として評価する。

### A3-4 `04_playwright-foundations.md`

維持する内容:

- JS / TSをPlaywrightに必要な最小範囲へ限定
- Locator / Assertion / Auto-wait

追加・調整:

Coding Bridgeを必要になった時点で小さく挿入する。

候補:

- Function parameter / return
- Module / export
- Object composition
- Array `map` / `filter`
- Classの最低限
- Type / narrowing
- Error handling

General-purpose JS講座へ拡大しない。

### A3-5 `05_playwright-e2e-practice.md`

維持する内容:

- Training Harnessを利用しFixture内部は後で学ぶ
- Seed Scenario
- State transition / Cross-role
- Mobile / Accessibility

追加・調整:

- Test Caseの目的とAssertionを対応付けるEvidenceを強化する。
- Existing Test API / Internal Inspectionを使う場合、何をUIで保証し何を内部状態で保証したか説明させる。

### A3-6 `06_execution-and-failure-analysis.md`

現在のFailure分類を拡張し、最低限次を区別する。

- Product Defect
- Test Code Defect
- Test Data / Seed Defect
- Locator Defect
- Timing / Synchronization Defect
- Harness / Test Control Defect
- Environment Defect
- External Dependency
- Specification Issue / Ambiguity
- Expected Product Change
- Flaky / Intermittent

「Specification Issue」はSpecification Foundation完成後に正式利用する。未実装段階では概念だけを先に導入してもよい。

### A3-7 `07_maestro-native-automation.md`

維持する内容:

- Android EmulatorをPart 1標準経路
- iOSは全受講者必須にしない
- Web / Native共通Business RuleとPlatform差分

追加・調整:

- Current Native購入FlowをAdvanced題材として追加する。
- iOS RuntimeはOptional Local Explorationであり、Current CI保証と混同しない。
- Android / iOSで共通Flowが使える可能性と、正式保証範囲が同じであることを混同しない。

### A3-8 `08_test-management-and-maintainability.md`

維持する内容:

- 問題を経験してから抽象化
- POM必須論を避ける
- Fixture / Automation Flow / Seed Scenarioの責務分離

追加・調整:

- Specification変更時のTest LifecycleをSpecification Foundation完成後にBR / ACまで接続する。
- 「削除するTestを判断できること」もCompetencyへ含める。
- Test Code quantityではなく必要な保証を維持することを再強調する。

### A3-9 `09_part1-capstone.md`

Core CapstoneはCartを維持する。

理由:

- Web / Native共通で扱える。
- 初学者でもBusiness Ruleを把握しやすい。
- Boundary / State / Persistence / Platform差を扱える。

Advanced Capstoneを段階化する。

#### Advanced A: Purchase Journey

```text
Guest Cart
→ Login
→ Cart Merge
→ Address
→ Checkout
→ Payment
→ Order
```

#### Advanced B: Failure / Recovery

```text
Payment Declined
→ Failed
→ Retry
→ Paid
```

#### Advanced C: Cross-role Lifecycle

Webを中心に次を扱う。

```text
Product / Inventory Operation
→ Customer Purchase
→ Shipment
→ Delivery
→ Review
```

Core修了にAdvanced全件を要求しない。

### A3 Gate

- C01〜C09をPart 1内で観測できる。
- Playwright / MaestroのSyntaxだけで修了できない。
- Advanced課題がCurrent Product Scope内で成立する。
- iOS RuntimeをPart 1 Requiredにしない。

---

## Wave A4: Workbook Simplification / Progressive Disclosure

### Goal

WorkbookをTest管理作業そのものが主目的にならないよう段階化する。

### Current Sheets

1. `01_テスト対象分析`
2. `02_リスク分析`
3. `03_テスト観点`
4. `04_テストケース`
5. `05_自動化候補`
6. `06_自動化対応表`
7. `07_実行結果`
8. `08_改善管理`

### Direction

8 Sheet構成を削除すること自体は目的にしない。

ただし、初学者が最初からすべてを埋める構成は避ける。

最低限次の段階に分ける。

#### Core Design Stage

- Test Target / Risk
- Test Condition / Test Case
- Automation Selection

#### Implementation Stage

- Automation Mapping

#### Operation Stage

- Execution / Improvement

必要なら物理Sheet数は維持しつつ、Lessonごとに「今使うSheet」を限定する。

Specification Foundation完成後は以下のColumnを追加検討する。

- Related BR
- Related AC
- Spec Ref

BR / ACが未実装の状態でPlaceholder IDを固定しない。

### Gate

- Part 1前半で8 Sheetすべてを完成させる必要がない。
- 学習者が表を埋めることではなくTest Designを説明できる。
- Automation MappingはImplementation後に更新する。

---

## Wave A5: Part 2 Rework

### Goal

Part 2を「GitHub Actionsを学ぶ講座」ではなく、Part 1のTest資産を変更管理と継続実行へ接続する講座として完成させる。

### A5-1 `01_software-development-process.md`

- Current iOS ArtifactをBuild-onlyとして説明する。
- Specification Foundation完成後はRequirement / Spec Change → Test Impactを開発Flowへ追加する。
- Monitoring / Improvementまで含むLoop構造を維持する。

### A5-2 `02_git-version-control.md`

大枠維持。

- ZIP → Git History付きCopy移行を維持する。
- Commit数やCommand暗記ではなくDiffとChange Unitを評価する。
- Training成果物以外を誤って上書きしないGateを維持する。

### A5-3 `03_github-pull-request-review.md`

大枠維持。

Review観点へ次を追加する。

- Spec / Test Design / Automationの同期
- TestをPassさせるためにExpectationを弱めていないか
- Current保証範囲を過大に報告していないか
- 未実行PlatformをPASS扱いしていないか

### A5-4 `04_ci-github-actions.md`

大枠維持。

- Training Copyを標準CI経路とする方針を維持する。
- ForkでProduction Workflowが同時起動しないStart Gateを維持する。
- Secret配布で本番Workflowを無理にPassさせない。

### A5-5 `05_playwright-ci.md`

大枠維持。

- Build Artifact再利用
- Failure Artifact
- Browser Strategy
- Production Artifact Smoke

Competency C11へ接続する。

### A5-6 `06_native-ci-maestro.md`

**全面的なCurrent Fact Rebaselineが必要。**

Current Repositoryの比較教材は次として説明する。

#### Android Current CI

```text
Detect Native Change
↓
Static / Production Guard
↓
Android Automation Build
+ Android Production-validation Build
↓
APK Artifact
↓
Android Runtime / Maestro
↓
Native Verify
```

#### iOS Current CI

```text
Native CI
↓ reusable workflow

iOS Automation Build
+
iOS Production-validation Build
↓
iOS Verify
```

Current iOSではSimulator boot / Install / Launch / Maestroを実行しない。

Lesson構成は次へ修正する。

1. Native CIがWebより重い理由。
2. Android Training CIを1 JobでEnd-to-End実行。
3. Build / Runtime分離。
4. APK Artifact。
5. Emulator / Maestro / Evidence。
6. Current Android Native CIとの比較。
7. Current iOS Build-only Gateとの比較。
8. 「もしRuntime Gateを採用するなら何が追加で必要か」を設計演習として扱う。
9. Android / iOSを同じ保証レベルへ無条件に揃えない理由を考える。

Current Repositoryに存在しないiOS Runtime PASSを完了条件へ含めない。

### A5-7 `07_ci-cd-quality-gates.md`

- Android / iOSのCurrent保証差をQuality Gate設計例として利用する。
- 「両Platform Required = 高品質」と短絡しない。
- Required条件はReliability / Cost / Feedback /代替Coverageから選ぶ。
- Build-only GateもQuality Contractの一種として明示する。

### A5-8 `08_integration-design-capstone.md`

Current State一覧を正す。

受講者は最初にCurrent Workflowをコピーせず、自分で次を設計する方針を維持する。

- PR / main / Nightly / Manual
- Web
- Android
- iOS
- Artifact
- Evidence
- Quality Gate
- Deploy / Smoke

Current Repositoryとの比較時には、iOSがBuild-onlyであることを必ず差分評価に含める。

### A5 Gate

- C10〜C12を観測できる。
- iOS Build-onlyを正しく説明できる。
- iOS Runtime CIはDesign Optionとしては考えられるがCurrent Factと混同しない。
- Current Repositoryを唯一の正解としてコピーしない。

---

## Wave A6: Instructor System

### Goal

「良い教材文書」から「複数講師でも運用できる教育システム」へ進める。

### Required Instructor Information

最低限次を定義する。

- LessonごとのExpected Competency
- Required Evidence
- Common Wrong Answers / Failure Modes
- Acceptable Alternative Designs
- Instructor-only Answer / Reference
- Pass / Needs Revision基準
- Environment Failure時の扱い
- Product Defectを学習者が発見した場合の扱い
- Specification Ambiguityを発見した場合の扱い

### Rubric Example

Locator選択を例にする。

| Level | Observable Behavior |
| --- | --- |
| 0 | 動作するLocatorを作れない |
| 1 | 例を参考にLocatorを書ける |
| 2 | Role / Label / UI Test ID等から理由付きで選べる |
| 3 | Accessibility、保守性、Web / Native差を含めTrade-offを比較できる |

同様に主要CompetencyへObservable Behaviorを定義する。

### Learner / Instructor Separation

Instructor-onlyの正解をLearner教材と同じ入口へ露出させない。

ただしSecurity機構を過剰実装する必要はない。Repositoryの公開形態に応じて、少なくとも「演習前に正解を読むことが標準導線にならない」構成を作る。

### Gate

- 「講師によって合否が大きく変わる」状態を減らせる。
- Alternativeな妥当設計を不正解扱いしない。
- RepositoryのCurrent実装と違うだけで減点しない。

---

# Program B: Training Delivery Foundation

## Wave B0: Delivery Architecture

### Goal

Training Codeを既存Production / Regression資産と安全に分離する具体構成を確定する。

### Decisions to Make

- Training Playwright Testの保存Path
- Training用Playwright Config / Project
- Training用Package Script
- Training Maestro Flowの保存Path
- Workbook Templateの形式
- Training CIをRepository内の実行WorkflowにするかTemplateにするか
- Instructor Assetの配置
- Learner成果物の標準Path

### Principle

既存Regressionを練習用Scratch Spaceにしない。

---

## Wave B1: Web / Playwright Training Boundary

### Required Capability

- Training Testだけを明示的に実行できる。
- Existing Regressionへ自動混入しない。
- Automation Build / Test API / Seed Resetを利用できる。
- Trace / Screenshot / Video等のEvidenceを確認できる。
- Desktop / Mobile等の必要なTraining variationを実行できる。

### Validation

- Empty Training Suiteでも既存Regressionに影響しない。
- Training Testを追加しても`pnpm run verify`の契約を意図せず変えない。
- Training専用CommandがREADME / Curriculumから再現できる。

---

## Wave B2: Native / Maestro Training Boundary

### Standard Platform

Android Emulatorを標準とする。

### Required Capability

- Build
- Install
- Launch
- Test Control Reset
- Maestro 1 Flow
- Evidence

### iOS

Optional extensionとして扱う。

Training Delivery FoundationのためにCurrent iOS Runtime CI契約を変更しない。

---

## Wave B3: Workbook Template

### Required

CurriculumのCore / Implementation / Operation Stageに合わせて複製可能なTemplateを用意する。

候補形式:

- Google SheetsへImport可能なCSV群
- Spreadsheet Toolに依存しないMarkdown / CSV Reference

外部Test Management SaaSは必須にしない。

### Gate

- LearnerがColumn設計から作り直さなくてよい。
- Sheet入力が学習目的を圧迫しない。
- Risk / Test Case / Automation Mappingを追跡できる。

---

## Wave B4: Training CI Boundary

### Required

- Production Deploy Secret不要。
- Cloudflare Deploy不要。
- Training Workflowだけを安全に実行可能。
- Unit / Quality → Playwrightへ段階的に拡張できる。
- Native Training CIはAndroidを標準とする。
- Failure Artifactを取得できる。

### Important Constraint

教材元Repository上でTraining Workflowを有効化することで既存PR Triggerと競合する設計は避ける。

Training Copyへ配置したときだけ有効になるTemplate方式も選択肢とする。

---

## Wave B5: Setup / Start Gate / Recovery

教材提供前に最低限次を作る。

### Web Gate

- Node / pnpm
- Install
- Web Start
- Chromium Install
- Minimum Playwright Test

### Native Gate

- JDK
- Android SDK
- Emulator
- Native Build
- APK Install
- Maestro Minimum Flow

### Part 2 Gate

- Git History付きCopy
- GitHub Account
- Push可能Remote
- Production Workflow非競合
- Training CI利用可能

### Recovery

- Dependency Install Failure
- Browser Install Failure
- Port conflict
- Android SDK / JDK mismatch
- Emulator boot failure
- APK install failure
- Maestro connection failure
- Git migration conflict
- GitHub Actions permission / disabled Actions

を最低限扱う。

---

# Program C: Specification Traceability Integration

## Start Gate

以下を満たすまでProgram Cを実装しない。

- `docs/spec/README.md`が存在する。
- Normative / Supportingの境界が実装済み。
- BR / AC GrammarとValidatorが確定済み。
- Current Product BehaviorのSpec Coverageが教材対象Featureで十分存在する。

## Wave C1: Learning Model Integration

学習Flowを次へ更新する。

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
Automation
↓
Evidence
```

## Wave C2: Workbook Traceability

Workbookへ最低限次を接続する。

- Spec Ref
- Related BR
- Related AC
- Risk ID
- Test Case ID
- Automation implementation

すべてのCaseへ機械的に大量IDを付けることが目的ではない。

「このTestは何の期待動作を保証するのか」を追跡できることを目的とする。

## Wave C3: Specification Change Exercise

仮想変更だけでなく、専用Training Branch / Patch等を使える場合は次を実施する。

```text
Specification Change
↓
Affected BR / AC
↓
Affected Risk
↓
Test Design update
↓
Automation impact
↓
Regression classification update
↓
Implementation / Validation
```

Current Productへ不要な仕様変更を混ぜない。

## Wave C4: Failure Classification Integration

Failure分析で次を正式に区別する。

- Product implementation deviates from Spec
- Test expectation deviates from Spec
- Spec is ambiguous / unresolved
- Environment / Harness prevents evaluation

既存ImplementationやExisting RegressionからExpectedを逆算しない。

---

## 9. File-by-file Change Matrix

| File | Direction | Priority |
| --- | --- | --- |
| `README.md` | Current Native/iOS修正、Competency・提供準備状況を明確化 | P1 |
| `00_learning-design.md` | Competency評価、Instructor/Learner責務、Spec Oracle移行方針 | P1 |
| `01_spreadsheet-test-design.md` | Progressive Workbook、後続BR/AC Traceability | P1 |
| `part1/01_test-automation-foundations.md` | C01へ接続、自動化しない判断をEvidence化 | P2 |
| `part1/02_scenario-shop-analysis.md` | Observed / Expected分離、後続Spec接続 | P1 |
| `part1/03_test-design-and-automation-selection.md` | Risk → Layer → Tool Traceability強化 | P1 |
| `part1/04_playwright-foundations.md` | Coding Bridge追加 | P2 |
| `part1/05_playwright-e2e-practice.md` | Design ↔ Assertion対応、Internal Inspection責務明確化 | P2 |
| `part1/06_execution-and-failure-analysis.md` | Failure taxonomy拡張 | P1 |
| `part1/07_maestro-native-automation.md` | Current Native Scope、iOS保証差を反映 | P1 |
| `part1/08_test-management-and-maintainability.md` | Spec変更時Lifecycle、削除判断のCompetency化 | P2 |
| `part1/09_part1-capstone.md` | Core Cart維持、Advanced Purchase/Recovery/Cross-role追加 | P1 |
| `part2/01_software-development-process.md` | Current iOS Build-only、後続Spec change flow | P1 |
| `part2/02_git-version-control.md` | 大枠維持、成果物・Diff評価を明確化 | P3 |
| `part2/03_github-pull-request-review.md` | Spec/Test同期、保証範囲Reviewを追加 | P2 |
| `part2/04_ci-github-actions.md` | Training CI安全境界を維持・実装へ接続 | P2 |
| `part2/05_playwright-ci.md` | Current設計維持、C11への接続 | P2 |
| `part2/06_native-ci-maestro.md` | iOS Runtime前提をBuild-onlyへ全面Rebaseline | P1 |
| `part2/07_ci-cd-quality-gates.md` | Platform別保証LevelをGate設計教材へ反映 | P1 |
| `part2/08_integration-design-capstone.md` | Current iOS前提修正、Competency-based評価 | P1 |

---

## 10. Failure Classification Standard

Part 1 / Part 2で同じ分類語彙を使う。

| Category | Meaning |
| --- | --- |
| Product Defect | Product実装がExpected Behaviorを満たさない |
| Test Defect | Test Code / Assertion / expectation自体が誤っている |
| Test Data / Seed Defect | Initial StateやDataが期待どおりでない |
| Locator Defect | UI要素識別が誤り・不安定 |
| Timing / Synchronization | 意味のある状態待機が不足 |
| Harness Defect | Fixture / Test Control / Helper / Harnessの不具合 |
| Environment Defect | OS / Browser / Emulator / Runner等の環境問題 |
| External Dependency | 制御外Service等の問題 |
| Specification Issue | Expected Behaviorが曖昧・矛盾・未定義 |
| Expected Change | Product変更に対してTestが古い |
| Flaky / Intermittent | 同じ前提で結果が非決定的に変動 |

Specification Foundation完成前は「Specification Issue」を概念として扱い、Current Specが存在するかのように誤記しない。

---

## 11. Instructor Evaluation Contract

講師は以下を評価しない。

- Existing Repositoryと全く同じCodeになったか。
- POMを使ったか。
- Test Case数が多いか。
- Automation率が高いか。
- 全Platformへ同じTestを書いたか。

講師が評価するのは次である。

- RiskとTestがつながっているか。
- 選択理由が説明できるか。
- Assertionが目的を保証しているか。
- 初期状態が再現可能か。
- Failure分析がEvidenceに基づくか。
- Alternative DesignのTrade-offを理解しているか。
- 不要な複雑性を追加していないか。
- Current Guaranteeを過大報告していないか。

---

## 12. Validation Strategy

### Curriculum Document Validation

- `pnpm run lint:markdown`
- Relative Link確認
- Current file path / script name確認
- `README.md`とのNavigation整合

### Repository Fact Validation

Curriculum内でCurrent実装を引用する箇所は、最低限次へ照合する。

- `package.json`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `docs/adr/0011-native-ci-ios-build-only-gate.md`
- `src/seeds/metadata.ts`
- Current `maestro/`

### Training Foundation Validation

Program Bでは、実際にLearner Pathを最初から通す。

最低限次をFresh環境相当で確認する。

1. Web Start Gate
2. Training Playwright first test
3. Intentional Failure + Evidence
4. Android Start Gate
5. Training Maestro first flow
6. Part 1 output migration
7. Git branch / commit
8. Training CI
9. Playwright CI Artifact
10. Native Training CIまたはその標準手順

文書だけ整っていて実行できない状態をDoDにしない。

---

## 13. Risks and Mitigations

### Risk 1: Curriculumが広すぎる

現在でもPart 1 / Part 2は広い。

Mitigation:

- Core / Advancedを明確に分ける。
- 新Toolを追加しない。
- Agentic QA / Security / Performance等を必須Scopeへ追加しない。

### Risk 2: Scenario Shopの複雑さが初学者を圧倒する

Mitigation:

- Productを単純化するのではなく、Lessonごとに見せる範囲を限定する。
- CartをCore Domainとして繰り返し利用する。
- AdvancedでCheckout / Payment / Cross-roleを解放する。

### Risk 3: Workbook作業が目的化する

Mitigation:

- Progressive DisclosureをWorkbookにも適用する。
- 最初から8 Sheetすべてを完成させない。

### Risk 4: Current Repositoryが正解集になる

Mitigation:

- Existing Test / Workflowを演習後に比較する。
- 「違う = 間違い」にしないRubricを採用する。
- Specification Foundation完成後はSpecをOracleへする。

### Risk 5: iOSを教えるためにCI方針を歪める

Mitigation:

- Current Build-only契約をそのまま教材として使う。
- Runtime GateはFuture Design Exerciseとして扱う。

### Risk 6: Training WorkflowがProduction CIと競合する

Mitigation:

- Training Copyを標準経路にする。
- Template方式を優先候補にする。
- Production SecretをTrainingへ渡さない。

### Risk 7: Competency Rubricが細かすぎる

Mitigation:

- C01〜C12を上限目安とする。
- 各Lessonへ細かい点数表を大量追加しない。
- Capstoneでまとめて観測できる項目はまとめる。

---

## 14. Implementation Order

推奨順序は次とする。

```text
Program A
Curriculum Rebaseline
  ↓
Program B
Training Delivery Foundation
  ↓
Specification Foundation Implementation
  ↓
Program C
Specification Traceability Integration
  ↓
End-to-End Curriculum Dry Run
```

ただしSpecification Foundation ImplementationがProgram Aより先に完了した場合は次でもよい。

```text
Specification Foundation
  ↓
Program A + Program C
  ↓
Program B
  ↓
End-to-End Dry Run
```

最も避けるべき順序は、Training Environmentを作らずCurriculum本文だけを際限なく詳細化することである。

---

## 15. PR Boundary Recommendation

### PR A: Curriculum Rebaseline

Scope:

- Existing 20 Curriculum docs
- Competency / Instructor docs
- Current Native / iOS correction
- Capstone reorganization
- Workbook learning design

Product Code / Workflowは変更しない。

### PR B: Training Delivery Foundation

Scope:

- Training Playwright boundary
- Training Maestro boundary
- Workbook Template
- Setup / Gate / Troubleshooting
- Training CI boundary

必要なCode / Script / Config変更を含める。

### PR C: Specification Traceability

Start Gate:

- Specification Foundation実装済み。

Scope:

- Spec / BR / AC → Risk / Test Traceability
- Workbook update
- Specification Change Exercise
- Failure classification integration

### Why not one giant PR

3つは責務が異なる。

- PR Aは教育設計・事実整合。
- PR Bは実行環境・Tooling。
- PR CはSpecification Systemへの依存変更。

全部を同時に行うと、Curriculumの内容が悪いのかTraining Harnessが悪いのかSpec実装待ちなのかをReviewしづらくなる。

---

## 16. Final Acceptance Test

最終的には文書Reviewだけでなく、Learner Journeyを実際に1周する。

### Part 1 Dry Run

```text
Setup
↓
Scenario Shop exploration
↓
Risk / Test Design
↓
Automation Selection
↓
Playwright
↓
Intentional Failure / Evidence
↓
Maestro Android
↓
Maintainability Improvement
↓
Part 1 Capstone
```

確認する。

- Current Repositoryの完成コードを見なくても進められるか。
- 手順の空白で止まらないか。
- Test Harnessが正式Regressionへ混入しないか。
- Competency Level 2を判断できるEvidenceが残るか。

### Part 2 Dry Run

```text
Part 1 artifacts
↓
Git History付きCopyへ移行
↓
Branch / Commit
↓
GitHub / PR / Review
↓
Training CI
↓
Playwright CI
↓
Android Native CI exercise
↓
iOS Build-only guarantee analysis
↓
Quality Gate design
↓
Integration Capstone
```

確認する。

- Production Secretが不要か。
- Production Deployを誤起動しないか。
- Current Android / iOS Guaranteeを正しく説明できるか。
- Failure Evidenceを取得できるか。
- Current Repositoryと異なる妥当設計も評価できるか。

### Final DoD

- Learnerが「何をしたか」だけでなく「なぜそうしたか」を説明できる。
- InstructorがEvidenceとRubricで評価できる。
- Current Product / Test / CIとCurriculumが一致する。
- Specification Foundation完成後はExpected BehaviorのOracleが明確である。
- Training CodeとProduction Regression / CIが安全に分離される。
- カリキュラムを通して、対象分析からCI/CD設計まで1本のLearning Storyとしてつながる。
