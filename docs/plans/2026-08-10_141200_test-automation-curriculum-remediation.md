# テスト自動化カリキュラム再Baseline・教材提供基盤 統合実装計画

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

このPlan承認後の実装は、**Specification FoundationのImplementation PRが`main`へMergeされた後**、最新`main`から作成する別のImplementation Branchで開始する。

本Planの対応は、**原則として1本のCurriculum Implementation PRで最後まで完了させる。**

PRは分割しない。ただし、実装作業そのものは明確なWaveへ分け、各Waveで対象・Validation・完了条件を固定する。

1本のPRへ統合する理由は、以下の成果物が強く依存しており、分割すると各PR単体で「後続実装が存在する前提」の不完全状態が発生しやすいためである。

```text
Curriculum本文
↕
Competency / Instructor Rubric
↕
Workbook
↕
Training Playwright / Maestro
↕
Training CI
↕
Setup / Start Gate / Recovery
↕
Specification Traceability
```

一方、Specification Foundationそのものは本PRへ含めない。Specification Systemの構築は既存の別Planに従って先に完了させ、このImplementation PRでは完成済みのNormative Specification / BR / ACを教材へ接続する。

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
- Normative Specificationと現在の実装を区別し、Expected ResultのOracleを説明できる。
- Test Caseを思いつきで列挙せず、Riskとテスト設計技法から導出できる。
- すべてをUI E2Eへ置かず、適切なTest Layerを選べる。
- 自動化しない判断にも理由を持てる。
- Playwright / MaestroをSyntaxではなく目的に応じて使い分けられる。
- Test Dataと初期状態を決定的に再現できる。
- FailureをEvidenceから分類し、Product / Test / Data / Environment / Specification等のどこに問題があるか切り分けられる。
- POM / Helper / Fixture / Automation Flow等を問題に応じて選べる。
- PR / CI / Quality Gate / Artifact / Runner Costを含めて継続実行方法を設計できる。

### 1.3 Final Learner Outcome

#### Part 1修了

受講者は、GitHub / CIがなくてもScenario Shopを対象に以下を一巡できる。

```text
探索
→ Risk分析
→ Test Design
→ Automation Selection
→ Playwright / Maestro
→ Failure Analysis
→ Maintenance
```

#### Part 2修了

受講者は、Part 1で作成したTest資産を変更管理と継続実行へ接続し、以下を理由付きで設計できる。

- PR / main / Nightly / ManualへのTest配置
- Required Quality Gate
- Web / Android / iOSの保証範囲
- Build / Runtimeの境界
- Artifact再利用
- Failure Evidence
- Preview / Production / Smoke
- Runner CostとFeedback速度

最終到達点はGitHub Actions YAMLの暗記ではなく、**案件のRisk・Platform・Cost・Reliabilityを踏まえて、自動テストを継続運用できる仕組みを設計できること**とする。

---

## 2. Implementation Start Gate

Implementation Branchを作成する前に、以下をすべて満たす。

### 2.1 Required dependency

- Specification Foundation Implementationが`main`へMerge済みである。
- `docs/spec/README.md`が存在する。
- Normative Product BehaviorとSupporting文書の境界が確定している。
- BR / ACのIDと参照Contractが機械検証可能になっている。
- `pnpm run validate:spec`および関連Required CIが利用可能である。

### 2.2 Repository baseline

- Native Phase 2後半PR #14がMerge済みである。
- Curriculum PR #13がMerge済みである。
- Specification FoundationのImplementationがMerge済みである。
- 実装開始時点のOpen PRを確認し、依存する変更がないことを確認する。
- 最新`main`からImplementation Branchを作る。

### 2.3 Current facts to re-confirm

Implementation開始時点でコードを正本として最低限以下を再確認する。

- Web Product Scope
- Native Product Scope
- Guest / customer / operator / adminのRole差分
- Cart / Checkout / Payment / Order / Shipment / ReviewのState / Rule
- Seed Scenario一覧
- Web Test Control
- Native Test Control
- Playwright Projects / scripts
- Maestro Flow一覧
- Android CIのBuild + Runtime保証
- iOS CIのBuild-only保証
- Web CI/CDのPR / main / Extended E2E / Deploy経路
- Current SpecificationのNormative Scope

### 2.4 Start Gate failure

Specification Foundationが未完成の場合、Curriculum Implementationを開始しない。

既存カリキュラムのiOS誤記などだけを先行して別PRへ切り出すことも原則しない。Start Gateを満たしてから最新`main`を基準に1本のImplementation PRで整合を取る。

---

## 3. One-PR Execution Contract

### 3.1 PR contract

本Planに基づく実装は、以下を**1本のCurriculum Implementation PR**へ含める。

- Curriculum Rebaseline
- Competency Model
- Instructor Rubric
- Specification Traceability
- Training Playwright Foundation
- Training Maestro Foundation
- Workbook Template
- Training Git / GitHub / CI Foundation
- Setup / Start Gate / Recovery / Troubleshooting
- Learner / Instructor Navigation
- End-to-End教材検証

### 3.2 Why one PR

分割した場合、次のような不整合が発生しやすい。

- LessonがTraining用Commandを説明するがCommandは次PRまで存在しない。
- Workbookが新しいRisk / BR / AC列を要求するがCurriculum側が未更新。
- Rubricが評価するCompetencyとCapstoneの完了条件が一致しない。
- Training Workflowが参照するScriptとLessonの手順が別PRでずれる。
- Specification Traceabilityの列や用語が教材内で一時的に混在する。

1PRにすることで、受講者へ見せる最終状態を1つのDiffとしてReviewできる。

### 3.3 One PR does not mean one-shot implementation

1PRでも実装はWave単位で行う。

- Waveごとに変更Scopeを限定する。
- WaveごとにValidationを行う。
- 各Wave終了時に現在の差分をSelf Reviewする。
- 後続Waveで前WaveのContractを勝手に変更しない。
- Contract変更が必要になった場合はPlan / Taskを更新し、影響範囲を明示してから変更する。

### 3.4 Execution continuity

Local Blockerが発生しても、独立して進められるWaveを止めない。

例:

```text
Android Emulatorが一時的に起動できない
↓
Native Runtime ValidationはBlockedとして記録
↓
Curriculum本文 / Workbook / Web Training / Rubric / CI設計など
独立して進められるTaskは継続
↓
Final ValidationまでにNative Blockerを解消
```

Whole-runを止めるのはGlobal Blockerだけとする。

Global Blockerの例:

- Specification FoundationのContract自体が利用不能
- Repository Buildが広範囲で壊れており教材実装の正当性を評価できない
- Required Toolchain全体が利用不能

### 3.5 Final fail-close

途中WaveでSkip / Blockedを許容しても、Final Definition of Doneでは未解決Required Blockerを残さない。

「進められるところまで進めた」と「Implementation完了」は区別する。

---

## 4. Non-goals

今回の1PRを巨大なQA技術カタログにしない。

以下は原則Non-goalとする。

- Scenario Shopへの新しいBusiness Feature追加
- Coupon / Point / Refund / Return等のProduct機能追加
- API Testing専用Curriculumの新設
- Performance Testingの新設
- Security Testing講座の新設
- Visual Regression Toolの本格導入
- Mutation Testing
- Chaos Testing
- AI QA / Agentic QAをPart 1 / Part 2の必須学習へ追加
- iOS Runtime CIの復活
- iOS Runtimeを教材完了条件へ追加
- Existing Regression Suiteの全面書換え
- 全既存TestへのTest Case ID付与
- Curriculum対応を理由としたProduct Architecture全面Refactor

今回優先するVertical Scopeは次とする。

```text
Specification
↓
Risk
↓
Test Design
↓
Test Layer
↓
Automation Selection
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

## 5. Competency Model

Curriculum全体で共通して評価するCompetencyを固定する。

### C01 Test Target Analysis

Role / State / Data / Dependency / Business Rule / User Journeyを整理できる。

### C02 Specification Reading

Normative Specification、BR、ACからExpected Behaviorを読み取り、実装やExisting TestをOracleと混同しない。

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

---

## 6. Competency Level

各Competencyを0〜3で評価する。

| Level | 定義 |
| --- | --- |
| 0 | 説明・実施できない、または誤った理解で実施する |
| 1 | 手順や講師支援があれば実施できる |
| 2 | 自力で実施し、判断理由を説明できる |
| 3 | 複数の選択肢とTrade-offを比較し、改善案を提案できる |

Part 1 / Part 2の修了条件はTest本数だけで判定しない。

最低演習量は維持するが、**修了判定の正本はCompetency LevelとEvidence**とする。

### Part 1 target

原則、C01〜C10でLevel 2を目標とする。

C11 / C12はPart 2への導入理解まででよい。

### Part 2 target

C01〜C12でLevel 2以上を目標とし、Capstoneの主要設計判断では一部Level 3相当の比較説明を求める。

---

## 7. Specification Traceability Contract

Specification Foundation完成後は、テスト設計の入口を次へ変更する。

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

### 7.1 Oracle

学習者へ以下を明確に教える。

- Normative Specification = Expected BehaviorのOracle
- Application = 現在のImplementation
- Existing Test = 既存の検証資産
- README / Guide = Supporting情報
- Seed Metadata = Test Data / ScenarioのExecutable Canonical Source

「アプリがそう動いたから正しい」「既存E2Eがそう期待しているから仕様」とは判断しない。

### 7.2 Workbook mapping

Test Caseへ少なくとも以下のTraceabilityを持たせる。

- Spec Reference
- BR ID
- AC ID
- Risk ID
- Test Case ID
- Test Layer
- Tool
- Implementation path

ただし全Caseへ無理にBR / ACを付けない。

ResponsiveやVisual Evidence等、直接BR / ACへ対応しない品質確認は適切なSpec ReferenceまたはRiskを使う。

### 7.3 Specification issue handling

Expected Behaviorが確定できない場合、Existing Implementationから勝手に仕様を決めない。

```text
仕様が不明
↓
Unresolved Specificationを確認
↓
必要なら仕様確認対象として記録
↓
Product Bugとして断定しない
```

---

## 8. Failure Taxonomy

Part 1 Failure Analysisを以下へ標準化する。

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

Failure分類は「ラベルを付けること」が目的ではない。

修正対象を誤らず、ProductをTestの都合へ合わせる誤修正や、Retry / Timeoutによる隠蔽を防ぐために使う。

---

## 9. Coding Bridge

プログラミング未経験者向けに別のJavaScript講座は作らない。

必要になったタイミングで最小限のCoding Bridgeを挟む。

対象候補:

- Function parameter / return
- Object / Array
- Destructuring
- Module / import / export
- async / await
- Type annotation
- Array `map` / `filter`
- Error / try-catchの基本
- Classの読み方
- Object composition
- Promise / `Promise.all`の概念

Coding Bridgeは「コード設計の専門講座」に発展させず、そのLessonのTest Automation目的へ必要な範囲に限定する。

---

## 10. Workbook Re-design

現行Workbookの8 Sheet思想は維持しつつ、初学者へ一度に全管理項目を要求しない。

### 10.1 Core Workbook

Part 1前半では以下を中心にする。

1. Test Target / Specification Analysis
2. Risk Analysis
3. Test Condition / Test Case
4. Automation Selection / Mapping

### 10.2 Operational Workbook

Testが増えてから以下を追加する。

5. Execution Evidence
6. Improvement / Maintenance

### 10.3 Optional / Advanced

必要な教材実装に応じて以下を独立SheetまたはViewで提供してよい。

- Detailed Test Coverage Mapping
- CI Execution Placement
- Instructor Evaluation

### 10.4 Template requirements

Workbook Templateは少なくとも以下を満たす。

- 複製可能
- Google SheetsへImport / Copyしやすい
- 入力例を含む
- Scenario Shop固有の完成Answerを最初から埋めすぎない
- Test Case ID、BR / AC、Risk、Layer、Toolの意味が混同されない
- 入力規則を過剰に複雑化しない

---

## 11. Curriculum Rebaseline Matrix

`docs/curriculum/test-automation/` 配下の全Curriculum文書を確認する。

### README.md

P1:

- iOSを「Simulator / Maestro」と記載しているCurrent Repository説明をBuild-onlyへ修正する。
- Specification Foundationを主要教材へ追加する。
- Part 1 / Part 2の修了Competencyを明示する。
- 実装完了後は「後続でTraining環境を用意する」という古い将来形を除去し、実在するTraining入口へ更新する。

### 00_learning-design.md

P1:

- Current OracleをSpecificationへ変更する。
- 学習順序へSpec / BR / AC → Riskを接続する。
- Competency / Rubricの位置づけを追加する。
- iOS CIのCurrent StateをBuild-onlyへ修正する。

### 01_spreadsheet-test-design.md

P1:

- BR / AC / Spec RefをWorkbookへ追加する。
- Core / OperationalのProgressive Disclosureへ整理する。
- Test Case数よりRisk / Traceability /理由を優先することを明示する。

### Part 1-1

P2:

- 自動化の価値判断をCompetency C06へ対応させる。
- Current SpecificationとObserved Behaviorの違いを軽く導入する。

### Part 1-2

P1:

- `/guide` / SeedだけでなくNormative Specificationを分析Inputへ追加する。
- Observed BehaviorとExpected Behaviorを分離する。

### Part 1-3

P1:

- Spec / BR / AC → Risk → Test Conditionの流れへ変更する。
- Layer SelectionとAutomation SelectionをCompetencyへ対応させる。

### Part 1-4

P2:

- Coding Bridgeを追加する。
- Training用Playwright Project / Scriptの実Pathへ更新する。

### Part 1-5

P1:

- Training用Playwright Environmentの実装結果へ手順を固定する。
- Seed / Test Control / Evidence取得方法を実Commandへ合わせる。
- Native Phase 2後半完成後のCurrent Scopeと矛盾しないよう発展例を見直す。

### Part 1-6

P1:

- Failure Taxonomyを拡張する。
- Specification Issue / Harness / Test Data等を正式分類へ入れる。
- Instructor Failure Exerciseと接続する。

### Part 1-7

P2:

- Android Emulatorを引き続き標準とする。
- iOSはOptional local comparisonに留め、CI Runtime保証と混同しない。
- Training Maestro Path / Commandを実装へ合わせる。

### Part 1-8

P2:

- POMを必須としない現在方針を維持する。
- Refactoring判断をRubricへ接続する。
- Specification変更時のTest資産Lifecycleを実際のSpec Contractへ合わせる。

### Part 1-9

P1:

- CartをCore Capstoneとして維持する。
- Completionを本数 + Competency Evidenceへ変更する。
- Advanced Capstoneを定義する。

Advanced候補:

```text
Guest Cart
→ Login
→ Cart Merge
→ Address
→ Checkout
→ Payment
→ Order
```

```text
Payment Failure
→ Retry
→ Paid
```

```text
Customer Purchase
→ Operator Shipment
→ Customer Review
```

### Part 2-1

P2:

- Specification Change → Implementation → Review → Testの関係を追加する。

### Part 2-2

P3:

- 基本構成は維持する。
- Training成果物の実Path確定後に移行手順を具体化する。

### Part 2-3

P2:

- Spec / Test Design / ValidationのTraceabilityをPR Review観点へ追加する。

### Part 2-4

P1:

- Training CIの実Workflow / Commandへ更新する。
- Production Workflow分離の実装方法を曖昧な将来形ではなく確定手順にする。

### Part 2-5

P1:

- Training Playwright CIを実際に実行できる状態へ更新する。
- Artifact Path / Report確認方法を固定する。

### Part 2-6

P1 Critical:

- Current iOS CI説明をBuild-onlyへ全面修正する。
- iOS Simulator boot / install / launch / MaestroをCurrent CI Flowとして説明しない。
- Android = Build + Runtime E2E、iOS = Build + Build-time Contractという非対称保証を教材化する。
- 「なぜ両Platformを同じRequired Levelにしないのか」をRisk / Maintainability / Local reproducibilityから考えさせる。

### Part 2-7

P1:

- Native Quality GateのCurrent GuaranteeをBuild-only iOSへ更新する。
- Required Gateを「多いほど品質が高い」としない思想を維持する。

### Part 2-8

P1:

- Current iOS baseline記述を修正する。
- 最終CapstoneをCurrent Repositoryの実保証と比較できるようにする。
- Competency C11 / C12の評価と接続する。

---

## 12. Training Delivery Foundation

### 12.1 Training Playwright boundary

Existing Regressionへ受講者コードを混在させない。

実装するもの:

- Training専用spec directory
- Training専用Playwright Projectまたは明示的Test selection
- Training専用Package Script
- Automation Build / Test Control利用
- Seed Reset
- Trace / Screenshot / Video / Report出力
- Existing RegressionへTraining Testが混ざらないContract TestまたはValidation

Path / Project名は実装時にCurrent Repositoryへ最も自然なものを選ぶ。

### 12.2 Training Maestro boundary

実装するもの:

- Learner用Maestro Flow保存場所
- Android標準実行Command
- Native Test Control Resetの利用手順
- JUnit / Screenshot等Evidence
- Existing production/regression Maestro Flowとの混在防止

全受講者へiOS Runtimeを要求しない。

### 12.3 Training CI boundary

Training CIはProduction / Deploy Workflowから安全に分離する。

最低限:

- Production Secret不要
- Cloudflare Deployなし
- Training Playwright実行
- 必要なQuality Check
- Android Native Trainingを追加可能
- Learner ArtifactをUpload可能
- Fork / Copy運用の安全境界を明示

### 12.4 Copy / Fork policy

標準:

- Part 1はLocal Copy / ZIPも許容
- Part 2開始時にGit Historyを持つTraining Copyへ移行
- CIハンズオンは演習用Copyを標準
- Forkを使う場合はProduction Workflowが意図せず起動しない開始Gateを必須

---

## 13. Setup / Start Gate

教材提供時に「環境構築できたつもり」を避けるため、開始Gateを機械的に確認できるようにする。

### 13.1 Web / Playwright Gate

- Node / pnpm version確認
- Dependency install
- Scenario Shop Web起動
- Training Playwright minimal test PASS
- Training Evidence出力確認

### 13.2 Native / Android Gate

- JDK
- Android SDK
- Emulator
- App Build
- APK Install
- App Launch
- Maestro minimal flow PASS
- Test Control Reset PASS

### 13.3 Git / GitHub Gate

- Git Historyを保持したTraining Copy
- `main`存在
- Training Branch
- RemoteへPush可能
- 本体Repositoryへ直接Push不要

### 13.4 CI Gate

- GitHub Actions利用可能
- Production / Deploy WorkflowがTraining PRで起動しない
- Training Workflowだけが意図どおり起動
- Production Secret不要

---

## 14. Instructor System

Learner向けLessonだけで研修を成立させない。

以下をInstructor資産として用意する。

### 14.1 Instructor Guide

- Lesson目的
- 期待Competency
- つまずきやすい点
- 教えすぎてはいけないAnswer
- 既存Repositoryを見せるタイミング
- Optional / Advancedの判断

### 14.2 Rubric

各CapstoneでC01〜C12のどれを評価するか固定する。

各評価はLevel 0〜3で記録する。

### 14.3 Expected Outcome

「完成コード1つ」を正解にしない。

- 必須Contract
- 許容されるAlternative Design
- 明確なAnti-pattern

を分ける。

### 14.4 Failure Exercises

意図的に最低限以下を体験できる教材を用意する。

- Assertion failure
- Locator failure
- State / Seed issue
- Timing issue
- CI environment issue

Product Defect注入まで必須にする必要はない。

### 14.5 Troubleshooting

講師が毎回ゼロから調べなくてよいように、以下を記録する。

- Web起動失敗
- Browser install失敗
- Playwright timeout
- Android SDK / JDK
- Emulator boot
- APK install
- Maestro connection
- Git remote / permission
- GitHub Actions failure

---

## 15. Wave Plan

### Wave 0 — Baseline / Contract Freeze

目的:

- Implementation開始時点の正本を固定する。

作業:

- Spec / Product / Test / Native / CIを再確認
- iOS Build-only確認
- Curriculum全20文書を最新状態と照合
- Implementation Task一覧作成

完了条件:

- Current factsに未解決の推測がない。
- Wave 1以降で参照するCanonical Sourceが記録されている。

### Wave 1 — Curriculum Contract / Competency

作業:

- C01〜C12定義
- Level 0〜3定義
- Part 1 / Part 2修了基準
- Instructor Rubric skeleton
- Core / Advanced区分

完了条件:

- 以降のLessonが同じ到達像を参照できる。

### Wave 2 — Specification Traceability / Workbook

作業:

- Spec / BR / AC → Risk → Testへの接続
- Workbook Template
- Core / Operational分離
- Test Case ID / UI Test ID / BR / AC Namespace整理

Validation:

- Sample CaseでTraceabilityを最後まで辿る。

### Wave 3 — Part 1 Curriculum Rebaseline

作業:

- Part 1全Lesson改訂
- Coding Bridge
- Failure Taxonomy
- Advanced Capstone
- Competency mapping

完了条件:

- Part 1の前後Lessonで用語・前提・Path・完了条件が矛盾しない。

### Wave 4 — Training Playwright Foundation

作業:

- Training spec boundary
- Project / Script
- Reset / Evidence
- minimal examples
- Existing Regression isolation

Validation:

- Training Testだけ実行できる。
- Existing Required Regressionへ混入しない。
- Failure Evidenceを確認できる。

### Wave 5 — Training Maestro / Android Foundation

作業:

- Training Maestro boundary
- Android setup
- Test Control
- Evidence
- sample flow

Validation:

- Android Emulator上でTraining Flowを実行できる。
- Existing Maestro Regressionと分離できる。

### Wave 6 — Part 2 Curriculum Rebaseline

作業:

- Git / GitHub / CI Lesson更新
- Current Training pathへ具体化
- iOS Build-only全面反映
- Android / iOS guarantee差を教材化
- Quality Gate / Cost判断更新

完了条件:

- Current Workflowとの記述差異がない。

### Wave 7 — Training GitHub Actions

作業:

- Secret不要Training CI
- Playwright Training CI
- Failure Artifact
- 必要に応じAndroid Training CI
- Production Workflow隔離手順

Validation:

- Training CIだけで教材ハンズオンが完結する。

### Wave 8 — Instructor / Setup / Recovery

作業:

- Start Gate
- Setup Guide
- Instructor Guide
- Rubric詳細
- Troubleshooting
- Recovery
- Part 1 → Part 2 migration

### Wave 9 — Repository-wide Curriculum Integration Review

確認:

- 全文書Link
- Path
- Command
- Script
- Scenario名
- Current Product Scope
- Android / iOS保証
- Specification Reference
- Workbook column
- Rubric
- Learner artifact

矛盾を0にする。

### Wave 10 — End-to-End Training Validation

受講者目線で最低限以下を順に確認する。

```text
Setup
↓
Scenario Shop探索
↓
Specification確認
↓
Risk / Workbook
↓
Playwright
↓
Failure Analysis
↓
Maestro / Android
↓
Part 1 Capstone
↓
Part 2 Copy migration
↓
Git / GitHub
↓
Training CI
↓
Playwright CI
↓
Native CI設計
↓
Quality Gate設計
↓
Part 2 Capstone
```

完成済みRepositoryを知っている開発者目線だけでなく、初見受講者が手順を辿れることを確認する。

---

## 16. Validation Strategy

### 16.1 Static

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run lint`
- `pnpm run typecheck`
- Specification validation

### 16.2 Existing repository regression

- `pnpm run test`
- `pnpm run build:web`
- `pnpm run verify`
- 変更影響に応じ既存Playwright
- Native変更がある場合Current Native CI contract

### 16.3 Training validation

新設したTraining Commandを実際に実行する。

- Web minimal PASS
- Web intentional FAIL → Evidence
- Seed Reset
- Android minimal Maestro PASS
- Training CI PASS

### 16.4 Documentation consistency

以下の参照が実在することを確認する。

- File Path
- Package Script
- Playwright Project
- Maestro Flow
- Seed Scenario
- Workflow / Job
- Spec / BR / AC
- Artifact Path

「教材では存在すると書いているが実装されていない」を残さない。

---

## 17. Definition of Done

### Curriculum

- `docs/curriculum/test-automation/` 全文書がCurrent Repositoryと整合する。
- iOS Runtime / MaestroをCurrent Formal CI Guaranteeとして誤記していない。
- Android = Build + Runtime、iOS = Build-onlyを正しく説明する。
- SpecificationがExpected Behavior Oracleとして一貫して扱われる。
- Part 1 / Part 2のLearner OutcomeがCompetencyとして明示される。
- Test本数だけで修了判定しない。

### Training environment

- Training PlaywrightがExisting Regressionから分離されている。
- Training MaestroがExisting Regressionから分離されている。
- Web / Android Start Gateがある。
- Training CIがProduction Secret / Deployへ依存しない。
- Part 1 → Part 2移行手順が実行可能である。

### Workbook / Traceability

- 複製可能なWorkbook Templateがある。
- Spec / BR / AC / Risk / Test Case / Layer / Tool / Implementationを追跡できる。
- 初学者へ一度に過剰な管理項目を要求しない。

### Instructor

- Rubricがある。
- Level 0〜3で評価できる。
- Expected OutcomeとAlternative Designを区別する。
- Failure Exerciseがある。
- Troubleshooting / Recoveryがある。

### Validation

- `pnpm run verify`が成功する。
- Required GitHub Actionsが成功する。
- Training Web validationが成功する。
- Android Training validationが成功する。
- Required documentation link / command validationが成功する。
- 未解消Required Blockerがない。

### PR

- **上記DoDを1本のCurriculum Implementation PRでReview可能にする。**
- Specification FoundationそのものはこのPRへ含めない。
- Product機能追加・無関係なRefactorを混在させない。

---

## 18. Scope Creep Guard

Implementation中に「教材としてあると便利」という理由だけで新技術を追加しない。

追加候補が出た場合は次を問う。

1. C01〜C12のどのCompetencyに必要か。
2. 現行Scenario Shopで既に学習可能か。
3. 今回追加しないとVertical Learning Flowが成立しないか。
4. 新しいTool / Dependency / Platform Costを増やす価値があるか。

4つのうち明確な必要性がなければFuture候補として記録し、今回Scopeへ入れない。

---

## 19. Implementation Principles

- 完成済みコードを演習前の正解として見せすぎない。
- Existing Repositoryを絶対的な正解としない。
- SpecificationをOracleとし、実装とTestは検証対象とする。
- POMを標準解にしない。
- すべてをE2Eにしない。
- Web / Android / iOSへ全Testを機械的に複製しない。
- iOS Runtimeを「CIでできるから」だけで復活させない。
- Retry / Timeout / `continue-on-error`で品質問題を隠さない。
- TrainingのためにProduction Security Boundaryを弱めない。
- Learner CodeをFormal Regressionへ直接混在させない。
- 最低本数は練習量であり、Competencyの代替指標にしない。
- 1PRで完了させるが、内部実装はWave単位で小さく検証する。

---

## 20. Final Review Questions

PR Merge前に以下へすべてYesと答えられることを確認する。

### Educational

- 学習者は「何をTestしたか」だけでなく「なぜ」を説明できる構成か。
- SpecificationとObserved Behaviorを区別できるか。
- Test DesignからAutomationへ飛躍していないか。
- 自動化しない判断を評価できるか。
- Test Layer選択を評価できるか。
- Failure原因をProduct以外へも切り分けられるか。

### Practical

- 初見学習者がWebを起動できるか。
- Training Playwrightを実行できるか。
- Failure Evidenceを見られるか。
- Android Emulator / Maestroまで進められるか。
- Part 2へ成果物を引き継げるか。
- Training PR / CIをProduction環境へ影響せず実行できるか。

### Current repository consistency

- Native Current Scopeと一致するか。
- iOS Build-onlyと一致するか。
- Script名が実在するか。
- Seed Scenario名が実在するか。
- Workflow説明がCurrent YAMLと一致するか。
- Specification ReferenceがCurrent Specと一致するか。

### Maintainability

- 教材のためだけの過剰な抽象化がないか。
- Instructorだけが理解できる暗黙手順がないか。
- Current Repository変更時に更新箇所を追跡できるか。
- Training専用コードとFormal Regressionの責務が明確か。

---

## 21. Expected Implementation Result

本Plan完了時、Scenario Shopは単なる「自動テストのサンプルRepository」ではなく、以下を一貫して体験できるTraining Environmentになる。

```text
Normative Specification
↓
Business Rule / Acceptance Criteria
↓
Risk Analysis
↓
Test Design
↓
Automation Selection
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

その結果、受講者は既存Test Caseをコードへ置き換えるだけではなく、案件に対して次のように説明できる状態を目指す。

> この仕様とBusiness Riskから、この条件を確認します。
> このRuleの細かい組み合わせは下位Testへ置き、User JourneyはPlaywrightで確認します。
> NativeではPlatform固有RiskだけMaestroへ追加します。
> このTestは自動化しません。保守Costに対してRegression価値が低いためです。
> PRではこのSuiteをRequiredとし、高コストな確認は別Timingへ配置します。
> Failure時にはこのEvidenceを確認します。
> AndroidとiOSは現在の再現性とCostが違うため、同じ保証Levelにはしません。

この判断能力を育成できることを、本Implementationの最終成果とする。
