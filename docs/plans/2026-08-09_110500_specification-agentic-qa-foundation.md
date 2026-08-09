# Scenario Shop 仕様SSOT・Acceptance Criteria・AIエージェントQA基盤 統合実装計画

## 0. このPlanと現在Branchの位置づけ

この文書は、将来実施する1本のImplementation PRの実装計画である。

現在の`plan/specification-agentic-qa-foundation` Branchは**計画文書を保存・レビューするためのDocumentation-only Branch**とし、このBranchでは以下を行わない。

- Application Codeの変更
- Script / Package / Dependencyの追加
- GitHub Actions Workflowの変更
- Agent / Skill / Safety設定の実装
- Challenge / Patch / Answer Keyの実装
- Curriculum本文の変更
- Product Bugの修正
- PR作成

このBranchで変更してよいのは、本Planを含む計画文書のみとする。

本Planに記載する実装は、依存PRのマージ後に最新`main`から作成する**別のFeature Branch**で開始し、原則として1本のImplementation PRで最後まで完了させる。

---

## 1. Goal

### 1.1 Goal

Scenario Shopの現在仕様をMarkdownの**Normative Product Behavior SSOT**として確立し、人間、Developer、QA、AIエージェントが同じTest Oracleを参照できる状態を作る。

`docs/spec/`全体はSpecification Systemとして扱い、その中で「現在の正しいProduct Behavior」を定義するNormative領域と、変更管理・既知差異・未確定事項等のSupporting領域を明確に分離する。

そのうえで、以下を1本のImplementation PRで一貫して接続する。

```text
Normative Specification
  ↓
Business Rule / Acceptance Criteria
  ↓
Risk / Test Design
  ↓
Deterministic Automation
  +
Risk-based Agentic Exploratory QA
  ↓
Evidence / Finding
  ↓
Validated Regression / Spec Feedback
```

Human向けにはMarkdownから静的HTMLを機械生成する。AIエージェントはGenerated HTMLではなくCurrent Specification Systemを読み、Expected判断にはNormative領域だけをTest Oracleとして使う。

### 1.2 依頼概要

- 現在進行中のProduct / Native関連PRを先にマージする。
- その後、テスト自動化カリキュラムPR #13をマージする。
- 最新`main`を基準にScenario Shopの現在仕様を棚卸しする。
- Markdownを人間・AI共通のNormative Product Behavior SSOTとする。
- 仕様更新手順を整備する。
- Business RuleとAcceptance Criteriaを整備する。
- Markdownから人間向け静的HTMLを生成する。
- SpecificationをOracleとして使うAgentic Exploratory QAを整備する。
- AI QA用Challenge / Instructor Answer Key / Evaluationを整備する。
- AI QAをテスト自動化カリキュラムへ統合する。
- 上記を複数PRへ分割せず、1本のImplementation PRで完了させる。

### 1.3 Definition of Done

#### Implementation Start Gate

- [ ] Native Phase 2後半PR #14が`main`へマージ済みである。
- [ ] カリキュラムPR #13がその後`main`へマージ済みである。
- [ ] 実装開始時点で他に依存するOpen PRがある場合、その影響を確認済みである。
- [ ] Implementation Branchを最新`main`から作成している。
- [ ] PR #14によるNative Scope / Android / iOS CI変更と、PR #13の記述の整合を再確認している。
- [ ] PR #13内にPR #14後の現状と不整合な記述があれば、今回のCurriculum更新Scopeで修正対象としている。
- [ ] Sandbox / Approval / Public Contractを扱うため、Current `AGENTS.md` Contractに従いImplementation Runを`strict`相当で扱う。

#### Specification

- [ ] README、Guide、PROJECT_CONTEXT、ADR、Seed、Application、Test、CI、Native実装を棚卸ししている。
- [ ] 仕様情報の重複、古い文書、Implementation Deviation、未確定事項を分類している。
- [ ] `docs/spec/README.md`がCurrent Specification Systemの唯一の入口として機能する。
- [ ] Product Scope、Role / Permission、Business Rule、State / Transition、Web / Native差分、UI/UX Contract、主要Feature仕様がMarkdownで明文化されている。
- [ ] `docs/spec/`内でNormative Product Behavior領域とSupporting / Operational領域を明確に分離している。
- [ ] Normative領域だけをProduct BehaviorのSSOTとして扱う。
- [ ] `known-deviations.md`はActiveなImplementation差異情報、`unresolved-specifications.md`はOracle未確定情報として扱い、Normative Product Behaviorそのものにはしない。
- [ ] Seed Metadata、Role、Route、Design Token、Config等のExecutable Canonical Sourceとの責務境界を明記している。
- [ ] Generated HTML、Application実装、Existing Test、README、Guide、ADRをNormative Product Behavior SSOTとして扱わない。
- [ ] Executable Canonical Sourceの低レベル値をMarkdownへ無目的に複製しない。

#### Business Rule / Acceptance Criteria

- [ ] Business Ruleへ安定ID`BR-*`を付与している。
- [ ] Acceptance Criteriaへ安定ID`AC-*`を付与している。
- [ ] Test Case ID、UI Test ID / `testId`、BR、ACを別Namespaceとして扱っている。
- [ ] Current Normative Specificationに存在するBRをActive BRとして扱う。
- [ ] BR / ACのMarkdown最小Grammarを明文化している。
- [ ] `BR-*` / `AC-*`の重複を機械検証できる。
- [ ] ACから参照する1件以上のBRの存在を機械検証できる。
- [ ] Active BRは、1件以上のACから参照されるか、直接ACを持たない理由を明記している。
- [ ] Feature SpecのRequired Section / Conditional Sectionが明確である。

#### Change Process / Execution Continuity

- [ ] 通常Feature変更時のSpec更新順を文書化している。
- [ ] 「Existing SpecへのBug Fix」と「Product Specification変更」を区別している。
- [ ] 緊急修正時のSpec同期ルールを定義している。
- [ ] Spec / Implementation / Testが矛盾した場合のDecision Ruleを定義している。
- [ ] Product意図が確定できない項目を、AIや現行Implementationで勝手に埋めない。
- [ ] Known Deviation解消時のLifecycleを定義している。
- [ ] Unresolved Specification確定時のLifecycleを定義している。
- [ ] Agentic QA / Human Exploratory QAを毎変更へ機械的に強制せず、Riskに応じた適用条件を定義している。
- [ ] 局所Blockerは該当Taskと依存TaskだけをBlockedにし、独立Task / Waveは継続する。
- [ ] Global blockerだけがWhole-run停止条件になる。
- [ ] Final Validationはfail-closeとし、未解消BlockerをDoD完了扱いにしない。

#### Human-facing HTML

- [ ] `docs/spec/**/*.md`から静的HTMLを生成できる。
- [ ] HTMLはMarkdownから一方向生成する。
- [ ] Generated HTMLを直接編集しない。
- [ ] HTMLはNavigation、見出しAnchor、Page TOC、Table、Code block、Responsive表示を備える。
- [ ] Navigationは`docs/spec/README.md`の`## Navigation`から導出する。
- [ ] Generated HTMLを削除してもMarkdownから完全再生成できる。
- [ ] HTML上でもNormative / Supportingの責務を誤解しない表示・説明を行う。
- [ ] 初期DoDに外部Hosting、認証、全文検索、CMSを含めない。

#### Specification Validation / CI

- [ ] Markdownlintが成功する。
- [ ] Relative Link validationが成功する。
- [ ] BR / AC ID uniquenessが成功する。
- [ ] BR / AC reference integrityが成功する。
- [ ] BR Acceptance coverageが成功する。
- [ ] Feature Required Section validationが成功する。
- [ ] Challenge / Answer KeyのNormative Spec Reference integrityが成功する。
- [ ] 変更されたBR / ACを参照するChallenge IDをCI / Review Summaryへ列挙できる。
- [ ] Challengeが直接参照するNormative fileが変更された場合もAffected ChallengeとしてCI / Review Summaryへ列挙できる。
- [ ] HTML Buildが成功する。
- [ ] Specification Validationが`pnpm run verify`とRequired CIへ接続される。
- [ ] Generated HTMLをCI ArtifactとしてReviewerが確認できる。

#### Agentic QA

- [ ] Code Review / Repairとは別のAgentic Exploratory QA Entry Point / Skill / Workflowがある。
- [ ] AI QA開始前に対象Normative Spec、BR / AC、Known Deviation、Unresolved Specification、Role、Seed、Platform、Viewport、Charterを固定する。
- [ ] AI QAではNormative SpecificationをExpectedのOracleとして参照する。
- [ ] 未確定仕様をNormative Oracleとして扱わない。
- [ ] Known Deviationを新規Defectとして重複報告しない。
- [ ] Spec-driven DiscoveryとGray-box Investigationの情報境界を定義している。
- [ ] 通常QA / Gray-box QAの探索Workerは既存Harnessの`readonly` presetを標準経路として利用する。
- [ ] 通常QA / Gray-box QAでは開始直前と終了直後のWorking Tree Snapshotを比較し、QA実行による追加Source差分が0であることを確認する。
- [ ] Black-box Scored Runnerでは既存Repository Root上の`readonly`実行をSource隔離境界として利用しない。
- [ ] **1 Finding = 1 distinct product deviation**をFinding Contractとする。
- [ ] FindingはOracleとEvidenceに基づく。
- [ ] Findingの再現、重複確認、Severity、Confidence、停止条件を定義している。
- [ ] Web Agentic QAの標準CapabilityをPlaywright MCPで満たせる。
- [ ] Native Agentic QAは特定Tool名ではなく必要Capabilityを定義し、Androidを標準対象とする。
- [ ] Nativeで必要Capabilityを満たせない場合、Maestro Regression PASSだけでAgentic QA実施済みとみなさない。
- [ ] AI QAを初期Required CI Gateにしない。

#### QA Run Artifact

- [ ] Charter、Finding、Coverage、終了理由をRun Artifactへ保存できる。
- [ ] `qa-findings.json`はVersioned JSON Contractを持つ。
- [ ] `qa-findings.json`に構造化Coverage Resultを持つ。
- [ ] Required Coverageの`completed` / `not_completed` / `blocked_environment`を区別できる。
- [ ] Scored RunはBenchmark Revisionを記録し、同じ評価母集団か判別できる。
- [ ] Challenge評価時の`evaluation.json`もVersioned JSON Contractを持つ。
- [ ] Raw Screenshot / Trace / MCP Log等の大容量Evidenceは既存Artifact方針に従いGit管理対象外へ分離する。

#### Challenge / Evaluation

- [ ] Challenge DefinitionとInstructor Answer KeyをRepository内でReview可能に管理する。
- [ ] Black-box Scored ChallengeとGray-box Training / Investigationを区別している。
- [ ] Black-box Scored RunnerはSource Repositoryとは別の**isolated execution root**で実行し、Source Repositoryをmount / exposeしない。
- [ ] Black-box Scored Runnerは**fresh agent session**で開始し、過去のSource / Answer Key / Evaluator Contextを引き継がない。
- [ ] Black-box Scored Runnerはdenylistだけに依存せず、QAに必要なCapabilityだけを明示した**Tool Allowlist**で実行する。
- [ ] Black-box Scored RunnerへはBuilt Artifactのファイル自体を渡さず、外側でServe / Install済みのRuntimeだけを提供する。
- [ ] Black-box WebではSource Map、JS Bundle内容取得、Browser evaluate、Network response body inspection等のImplementation inspection経路をScored Runnerへ提供しない。
- [ ] Black-box NativeではAPK / IPAファイル、Arbitrary ADB shell、App package extraction経路をScored Runnerへ提供しない。
- [ ] Scored RunnerからGitHub / Repository Search / Web Search / Generic shell / arbitrary HTTP fetchへ到達できない。
- [ ] Scored Run開始前のForbidden Capability Probeで主要な禁止経路がUnavailable / Blockedであることを確認する。
- [ ] Gray-box TrainingではSource参照を許容するが、Black-box Recall / Precisionと同じスコアへ混ぜない。
- [ ] Learner-safe Challenge DefinitionはDefect / Non-defect分類やAnswer Key Item IDを漏らさない。
- [ ] Required Coverage Missionは「正常」「不具合」等の正解を示さない中立的な探索表現にする。
- [ ] Learner / AgentへInstructor Answer Keyを渡さない。
- [ ] Scored RunではFilesystem、Git History、GitHub Connector、Repository Search、External Search、Prompt Context、Hidden Test Output等からInstructor-only情報へアクセスできないことを評価成立条件とする。
- [ ] Scored Runner / OrchestratorはAnswer Keyを参照しない。
- [ ] Runnerが`qa-findings.json`相当のStructured ResultをFreezeした後、別EvaluatorだけがAnswer Keyを読む。
- [ ] Challenge適用前にInstructor-only Baseline Sanityを実施し、対象DefectがClean Baselineに存在しないことを確認する。
- [ ] Challenge適用後にInstructor-only Post-patch Sanityを実施し、意図したDefect / Non-defect Ground Truthが成立することを確認する。
- [ ] FindingとDefect Itemの計数単位がAtomic Findingで統一されている。
- [ ] Instructorが定義したRequired Coverage SetをRunnerが減らせない。
- [ ] Required Coverageの完了状態とEvidenceを機械可読に記録できる。
- [ ] Non-defect Itemは`TN / FP / Not Evaluated`を区別する。
- [ ] Non-defectをTNにするには、Coverage完了だけでなく**そのItem固有のRequired ObservationをEvidenceが満たす**ことを要求する。
- [ ] 未探索またはItem固有Observation未確認のNon-defectをTNに数えない。
- [ ] Required CoverageがEnvironment / Harness要因で`blocked_environment`になったScored Runは`valid_for_scoring=false`とし、Agent能力のScoreとして確定しない。
- [ ] TP / FP / FN / TN、Recall / Precision / FPRを同一単位で再計算できる。
- [ ] Evidence Quality、Reproducibility、Severity Accuracy、Coverageの採点Ruleが定義されている。
- [ ] Challenge / Answer KeyのOracle ReferenceがCurrent Normative Specに存在することをCIで検証できる。
- [ ] Benchmark Revisionが異なるScoreを同一母集団として比較しない。

#### Curriculum

- [ ] Specification / Acceptance Criteriaの読み方をカリキュラムへ追加する。
- [ ] Normative SpecificationとSupporting Specification情報の違いを教材化する。
- [ ] BR / AC → Risk → Test Case → Automationの関係を追加する。
- [ ] Agentic QAをPart 1後半へ追加する。
- [ ] Black-box探索とGray-box調査の違いを教材化する。
- [ ] Normal readonlyとScored Black-box Isolationの違いを教材化する。
- [ ] Scored RunではFresh Session / Tool Allowlistが必要な理由を教材化する。
- [ ] Agentic QAを全変更の必須工程ではなくRisk-basedな探索手段として説明する。
- [ ] Part 1 CapstoneへValidated FindingとRegression Feedbackを追加する。
- [ ] Part 2の変更管理 / PR Review / Integration DesignへSpec同期とAI QA運用を接続する。
- [ ] PR #14マージ後のNative Scope / iOS CIを反映する。

#### Final

- [ ] 既存Product Behaviorを意図せず変更していない。
- [ ] Product Bug修正や無関係なRefactorが混ざっていない。
- [ ] 独立Taskを局所Blockerのために不必要に中断していない。
- [ ] 未解消Blockerがある状態を全DoD完了としていない。
- [ ] `pnpm run verify`が成功する。
- [ ] GitHub Actions Required CIが成功する。
- [ ] Implementation PRだけで全DoDがReview可能であり、別実装PRを前提にしない。

---

## 2. Current understanding

### 2.1 現在の主要Entry Point

- `README.md`: Product Overview、Setup、Test Account、Seed、Test API、Web / Native実行方法。
- `/guide`: 利用者・テスター向けの操作・学習Guide。
- `docs/PROJECT_CONTEXT.md`: AI作業、Architecture、UI/UX、CI、Native等のliving context。
- `docs/adr/**`: 過去の重要な設計判断。
- `AGENTS.md` / `PLANS.md` / `CODE_REVIEW.md`: AIエージェント運用契約。
- `.agents/skills/**`: Plan / Review / Repair / Harness Improvement等のWorkflow。
- `src/seeds/metadata.ts`: Scenario MetadataのExecutable Canonical Source。
- `e2e/web/fixtures.ts`: Reset、Metadata確認、Console / Page Error Evidence。
- `playwright.config.ts`: Web E2E / Accessibility / Mobile / Cross-role / UI Review / Artifact。
- `.github/workflows/ci.yml`: Web / Quality / Build / E2E / Preview / Smoke Gate。
- Native workflow / wrapper / Maestro: Build / Install / Runtime / Test Control / Evidence。
- `docs/curriculum/test-automation/**`: PR #13マージ後のテスト自動化学習設計。

### 2.2 既知の依存変更

PR #14はNative Phase 2後半として、Login / Session / Account / Address / Checkout / Payment / Order / Review、Android / iOS Maestro、iOS Simulator正式CI Gate等を追加・変更する予定である。

実装開始時には少なくとも以下を再Baselineする。

- Native Product Scope
- Native Seed / Test Control
- Native Route / Role / State
- Android CI
- iOS CI
- Maestro Flow
- Native Production-validation
- Curriculum内のNative説明

PR #13はPR #14より前のRepository状態を前提に作成されているため、PR #14→PR #13の順でマージした後、Curriculumの事実記述が古くなっていないか必ず確認する。

### 2.3 現在のHarness / Run制約

Current `codex-safe`の`readonly` presetは`read-only` sandboxとしてSourceへの書込みを防げる。一方で、Current wrapperはRepository RootをWorking Rootとして利用する前提であり、Repository外から起動してもRepository Rootへ戻す。

したがって、Current `readonly` presetは**Write Boundary**としては再利用できるが、Black-box Scored Challengeに必要な**Read / Information Boundary**までは保証しない。

またCurrent `AGENTS.md`ではSandbox / Approval / Public Contractを扱う変更はStrict workflow対象であり、Current `RUN_MANIFEST.json`にはGit Commit SHAを直接保持するFieldがない。

本PlanではWrite Boundary、Scored Read Boundary、Benchmark Revisionを別Contractとして扱う。

### 2.4 現在の問題

```text
README / Guide / PROJECT_CONTEXT / ADR / Code / Test
        ↓
仕様相当情報が分散
        ↓
Human / QA / AIが個別に期待値を解釈
        ↓
Test / Review / QAでOracleが揺れる
```

### 2.5 目標状態

```text
docs/spec/
Specification System
        │
        ├─ Normative Product Behavior
        │    ├─ product-scope
        │    ├─ roles / state / UI contract
        │    └─ features / BR / AC
        │
        └─ Supporting / Operational
             ├─ README / glossary / change-process
             ├─ known-deviations
             ├─ unresolved-specifications
             └─ templates

Normative Product Behavior
        │
        ├─ Human → Generated HTML
        ├─ Developer / Reviewer
        ├─ QA / Test Design
        └─ AI Agent Test Oracle
        │
        ├─ references → Executable Canonical Sources
        │               Seed / Role / Route / Token / Config
        ▼
Business Rule / Acceptance Criteria
        ▼
Risk / Test Case Design
        ▼
Deterministic Automation + Risk-based Exploratory QA
        ▼
Evidence / Finding
        ▼
Accepted Regression / Spec Feedback
```

---

## 3. Assumptions

- Future ImplementationはPR #14とPR #13マージ後に開始する。
- Implementationは最新`main`から別Branchを作る。
- 実装内容は1本のPRで完結させる。
- Markdown SpecificationとGenerated HTMLを別管理しない。
- Git HistoryをVersion Historyとして使い、手動Document Version番号を原則導入しない。
- HTMLは初期段階ではCI ArtifactとLocal Buildを標準とする。
- AI QAはRequired CI Gateにしない。
- AI QA Findingは探索中に自動修正しない。
- Current Repositoryに存在する`codex-safe`の`readonly` presetは通常QA / Gray-box QAの標準Read-only経路として再利用する。
- Black-box Scored ChallengeではCurrent Repository Root上の`codex-safe readonly`をSource隔離手段として使わず、Source Repositoryとは別のisolated execution rootを用意する。
- Black-box Scored Runnerは、Source / Answer Keyを読んでいないFresh Sessionから開始する。
- Challenge評価の目的はAIの未知不具合探索能力を評価することであり、Code Inspection能力をBlack-box探索スコアへ混ぜない。
- Benchmark Revisionが異なるRunは、明示的な換算・再評価なしに同一Benchmark Scoreとして直接比較しない。

---

## 4. Non-goals

- Product機能の全面改修。
- 棚卸し中に見つけた全Product Bugの同時修正。
- Existing Regression Suiteの全面書換え。
- Docusaurus / VitePress / CMS等の大型Docs Platform導入。
- Specification Database / 外部SaaS導入。
- HTMLを手動編集可能な第二の仕様書にすること。
- HTML外部Hostingを今回の必須DoDにすること。
- AI QAをPR Required Checkにすること。
- LLM Findingを無検証でIssue / PRへ自動投稿すること。
- QA探索中のApplication自動修正。
- Challenge用DefectをProduction Runtimeへ恒久的に入れること。
- Native機能を仕様整理のために新規実装すること。
- iOS物理端末Agentic QAを必須にすること。
- Challenge評価のために独自の大規模Evaluation Platformを構築すること。
- Initial versionで重み付き総合スコアやランキングシステムまで作ること。
- Black-box隔離のために必要以上のContainer PlatformやRemote Sandbox基盤を新設すること。最小のisolated execution root + Tool Allowlistで成立させる。
- Benchmark Revisionのために外部Version Databaseを導入すること。

---

## 5. Impacted areas

1. Product Specification / Documentation
2. Business Rule / Acceptance Criteria / Traceability
3. Specification Change Management
4. Static HTML Generator
5. Specification Validation / CI
6. AI Agent Operating Agreement
7. Agentic Exploratory QA Workflow
8. Evidence / Finding / Coverage Artifact
9. Agentic QA Training Challenge / Evaluation
10. Test Automation Curriculum
11. Existing README / Guide / Project Contextの責務整理
12. Scored Runner Isolation / Benchmark Reproducibility

---

## 6. Files to inspect

### 6.1 Repository / Product Context

- `README.md`
- `AGENTS.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/**`
- `docs/reference/**`
- `docs/history/**`の関連履歴

### 6.2 Product / Rule / State

- `src/domain/**`
- `src/application/**`
- `src/seeds/**`
- Role / Permission definitions
- Route definitions
- Cart / Checkout / Payment / Order / Review / Admin Rule
- Design Token / Responsive / Accessibility関連実装

### 6.3 QA / Automation

- `e2e/web/**`
- `playwright.config.ts`
- `maestro/**`
- `tests/unit/**`
- `tests/integration/**`
- `tests/repository-contract/**`
- `tests/component/**`
- `tests/contracts/**`
- Native local wrapper / Evidence scripts
- `.codex/templates/**`
- `.codex/config.toml`
- `scripts/codex-safe.*`
- `scripts/codex-task.*`
- Existing run / evaluation artifact schema
- MCP / Agent Tool routing configuration relevant to Browser / Native capability exposure

### 6.4 CI / Build

- `package.json`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- Markdownlint / Prettier / ESLint設定

### 6.5 Curriculum

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/part1/**`
- `docs/curriculum/test-automation/part2/**`

---

## 7. Change strategy

### 7.1 基本方針 / Blocker Policy

実装は1本のPR内でWave順に進める。

- Waveごとに責務を明確にする。
- 各Wave完了時にScope Reviewする。
- Product Bugや無関係なRefactorを混ぜない。
- 後続Waveが前WaveのContractを前提にできる順序で実施する。
- 中核Contractに矛盾する状況が発生した場合だけOwner Decisionを求める。

#### Local blocker

特定Platform、Tool、Challenge、Feature等に閉じたBlockerは、そのTaskと直接依存するTaskだけを`Blocked`へ移す。

例:

- Native Scored RunnerのDevice Capabilityだけが不足している。
- 1つのFeatureでProduct意図が未確定である。
- 特定ChallengeだけBaseline Sanityが成立しない。

この場合、以下のような独立Taskは継続する。

- Specification整備
- HTML Generator / Validator
- Web Agentic QA
- Curriculumの独立部分
- Documentation責務整理
- 他Platform / 他Challenge

#### Global blocker

Whole-runを停止してOwner Decisionを求めるのは、以下のようにGoal / Safety / Core Contract全体へ影響する場合だけとする。

- PR #14 / #13等のImplementation Start Gate未達のまま実装開始が必要になる。
- Normative SSOTの責務そのものを変更しないと成立しない。
- Source / Answer Key isolation等の安全境界を守れないままScored評価を成立させる必要がある。
- 1本のImplementation PRという前提を維持できない重大なRepository制約が判明する。

#### Final fail-close

実行途中は進められる独立Taskを可能な限り進める。一方、Final Validationでは未解消のRequired Blockerを残したままDoD完了、PASS、Implementation-readyと扱わない。

### 7.2 Specification System / 仕様の正本モデル

`docs/spec/`全体をSpecification Systemとするが、**すべてのファイルをNormative Product Behaviorとして扱わない**。

#### Normative Product Behavior SSOT

初期構成では、以下をProductとして「何が正しいか」を定義するNormative領域とする。

- `product-scope.md`
- `roles-and-permissions.md`
- `state-and-scenarios.md`
- `ui-ux-contract.md`
- `features/**/*.md`

Normative対象例:

- Product Scope
- Actor / Roleごとの許可・禁止
- Business Rule
- State / Transition
- Error / Boundary Behavior
- UI / UX Contract
- Web / Nativeで同じであるべきBehavior
- 意図したPlatform Difference
- Acceptance Criteria

Featureの分割変更等でNormative Fileが増減する場合は`docs/spec/README.md`でNormative領域を明示し、暗黙に`docs/spec/**/*.md`全部をOracle化しない。

#### Supporting / Operational Specification

以下はSpecification Systemの一部だが、単独ではNormative Product Behaviorを定義しない。

- `README.md`: Specification入口、Navigation、責務説明
- `glossary.md`: 用語補助。Behavior Ruleを上書きしない
- `change-process.md`: 仕様変更運用
- `known-deviations.md`: ActiveなNormative SpecとCurrent Implementationの差異情報
- `unresolved-specifications.md`: Product意図が未確定でOracleにできない情報
- `_templates/**`: Authoring Template

Supporting文書がNormative領域と矛盾した場合、Supporting文書の同期漏れとして扱う。

#### Executable Canonical Sources

Runtime / Build / Test Harnessが機械的に利用する値は、その責務を持つCodeをExecutable Canonical Sourceとして維持する。

対象例:

- Seed Scenario ID / Metadata
- Role / StatusのType / Enum / Union
- Route definitions
- Design Token
- Build / Runtime Config
- App ID
- Test ID / Accessibility Label

Markdownはこれらの意味・期待・契約を定義するが、すべての低レベル値を無目的に複製しない。

Public Contractとして同じ値をMarkdownにも記載する必要がある場合のみ重複を許し、可能な範囲でValidatorまたはTestにより整合を確認する。

#### External Non-SSOT

以下は仕様判断の参考・Evidenceにはなるが、Normative Product Behavior SSOTを暗黙に上書きしない。

- Application実装
- Existing Test
- Generated HTML
- Repository RootのREADME / Guide
- PROJECT_CONTEXT
- ADR

ADRはDecision Historyであり、Current Normative Specと矛盾する場合はCurrent SpecまたはADRの同期漏れとして扱う。

### 7.3 Key abstractions

- **Specification System**: `docs/spec/`配下のNormative + Supporting文書全体。
- **Normative Product Behavior**: Productとしてどうあるべきかを定義するCurrent Oracle。
- **Business Rule**: Feature / Role / Stateを跨いでも維持されるRule。`BR-*`。
- **Acceptance Criteria**: Rule / Featureを外部からどう確認できるか。`AC-*`。
- **Test Case**: Risk / Conditionから導出した検証項目。例`CART-001`。
- **UI Test ID / testId**: UI ElementをAutomationから識別するIdentity。
- **Seed Scenario**: 再現可能な初期状態。Executable metadataはCode、意味と期待はSpecで扱う。
- **Known Deviation**: Normative Specは確定しているがCurrent Implementationが異なる、現在Activeな既知差異。
- **Unresolved Specification**: Product意図が未確定でNormative Oracleとして利用できない項目。
- **Test Oracle**: Expected判断の根拠。
- **Agentic QA Charter**: 探索対象、Risk、Role、Seed、Platform、Viewport、Mission、Stop Conditionを固定する単位。
- **Agentic QA Finding**: 1つのdistinct product deviationをOracleとEvidence付きで記録するAtomic成果物。
- **Black-box Scored Challenge**: Source / Artifact bytes / Answer Keyを見ず、RuntimeとLearner-safe Specificationから探索能力を評価するChallenge。
- **Gray-box Training / Investigation**: Source / Existing Test参照を許容し、原因調査やRegression判断を学ぶ非Black-box評価モード。
- **Required Coverage Set**: InstructorがChallengeごとに固定する、Scored Runで最低限探索すべき有限集合。
- **Benchmark Revision**: Application / Normative Spec / Challenge / Answer Key等、採点母集団を一意に識別するRevision ID。
- **Fresh Scored Session**: Source / Answer Key / Evaluator情報を一度も受け取っていない新規Agent Session。
- **Scored Tool Allowlist**: Black-box探索に必要なCapabilityだけを列挙したPositive Permission Set。

### 7.4 Target Specification structure

```text
docs/spec/
├ README.md                    # Supporting: entry / navigation / responsibility
├ glossary.md                  # Supporting
├ product-scope.md             # Normative
├ roles-and-permissions.md     # Normative
├ state-and-scenarios.md       # Normative
├ ui-ux-contract.md            # Normative
├ known-deviations.md          # Supporting: active implementation deviation
├ unresolved-specifications.md # Supporting: no normative oracle
├ change-process.md            # Supporting: authoring / maintenance
├ _templates/                  # Supporting
│  └ feature-spec.md
└ features/                    # Normative
   ├ storefront.md
   ├ authentication.md
   ├ cart.md
   ├ checkout-and-payment.md
   ├ orders.md
   ├ reviews.md
   ├ admin-catalog.md
   ├ admin-inventory.md
   ├ admin-orders.md
   ├ admin-users.md
   └ native-*.md
```

Acceptance Criteriaは別Database / 別SSOTへ分離せず、関連Feature Specification内へ配置する。

### 7.5 Markdown最小Grammar

#### Navigation

`docs/spec/README.md`に明示Sectionを設ける。

```markdown
## Navigation

- [Product Scope](./product-scope.md)
- [Roles and Permissions](./roles-and-permissions.md)
- [Cart](./features/cart.md)
```

HTML Generatorは`## Navigation`配下のMarkdown Link ListだけをNavigation Sourceとして読む。

READMEには、Navigation ItemがNormative / Supportingのどちらか分かる説明を持たせる。ただしNavigation Metadataを複雑なFront Matterへ発展させない。

#### Business Rule

```markdown
### BR-CART-001 — Cart数量上限

Cart数量は、Product仕様で定義された購入可能上限を超えてはならない。
```

Current Normative Specificationに存在する`BR-*`見出しはActive BRとして扱う。

廃止したBRをCurrent Spec内へStatus付きで残す仕組みは初期版では作らない。廃止履歴はGit Historyで追跡する。

#### Acceptance Criteria

単一BR:

```markdown
#### AC-CART-001 — 上限値を受け入れる

Related BR: `BR-CART-001`
```

複数BR:

```markdown
#### AC-CHECKOUT-003 — 注文確定前に購入条件を再検証する

Related BR: `BR-CART-004`, `BR-PAYMENT-002`
```

`Related BR:`は1件以上のBacktick囲みBR IDをComma区切りで列挙する。

Given / When / Thenは有効な表現手段だが、すべてのACへ強制しない。

#### BR without direct AC

```text
Acceptance: N/A — <直接ACを持たない理由>
```

ValidatorはActive BRが少なくとも1つのACから参照されるか、`Acceptance: N/A`を持つことを確認する。

#### ID rule

```text
BR-<AREA>-NNN
AC-<AREA>-NNN
```

- IDは別Requirementへ再利用しない。
- 廃止後も番号を使い回さない。
- Test Case IDと分離する。
- UI Test ID / `testId`と分離する。

### 7.6 Feature Spec Required / Conditional Section

初期Validatorで機械必須にするのは、内容を持つ可能性が高い5 Sectionだけとする。

#### Required

1. Purpose / Scope
2. Business Rules
3. UI / Behavior Contract
4. Acceptance Criteria
5. Executable Canonical Source references

#### Conditional

- Actors / Roles — Role差がある場合
- Preconditions — 明示条件がある場合
- State / Transition — State machineを持つ場合
- Error / Boundary Behavior — Feature固有のError / Boundary Contractがある場合
- Web / Native差分 — Platform差が存在する場合
- Out of scope — 誤解しやすい境界を明示する必要がある場合
- Related Test / Automation references — 対応資産が存在する場合
- Known Deviations / Unresolved Specification references — 該当Entryが存在する場合

Conditional Sectionへ`None`等を書くためだけに空見出しを増やさない。

### 7.7 Oracle priority / Deviation handling

Expected判断は以下で統一する。

1. Current Normative Product Behavior
2. 同Normative Spec内のBR / AC
3. `known-deviations.md`によるActive Implementation差異情報
4. ADRによるDecision History
5. Application / Seed / Test / README / GuideはEvidence / Implementation Reference

`unresolved-specifications.md`に対象範囲が存在する場合はNormative Oracle不足として扱い、Current ImplementationやExisting Testで補完してDefect確定しない。

#### Known Deviation

`known-deviations.md`には現在ActiveなDeviationのみを保持する。

Agentic QAでActive Known Deviationを再現した場合は新規Defectとして重複登録しない。

```text
Implementation修正
  ↓
必要なRegression追加 / 更新
  ↓
known-deviations.mdから該当Entry削除
  ↓
AI QA入力から除外
```

#### Unresolved Specification

Product意図が未確定な範囲は`unresolved-specifications.md`へ記録する。

AIはObservation、Risk、Questionを記録してよいが、Normative OracleがないためProduct Defectとして確定しない。

仕様確定時:

```text
Normative Feature Spec / BR / ACへ統合
  ↓
unresolved-specifications.mdから削除
  ↓
必要なTest / Automation / Charter更新
```

### 7.8 Change Process

#### 通常Feature変更

```text
Change Request
  ↓
Normative Spec更新
  ↓
BR / AC更新
  ↓
Risk / Test Design更新
  ↓
Implementation
  ↓
Deterministic Automation更新
  ↓
Riskに応じてAgentic QA / Human Exploratory QA
  ↓
Review / Merge
```

Agentic QA / Human Exploratory QAは全変更へ一律必須にしない。少なくとも以下では実施候補とする。

- 新規User-facing Feature
- UI / UX / Responsive / Accessibility Behavior変更
- User Journey変更
- Role / Permission変更
- State / Transition変更
- Error / Boundary Behavior変更
- 高RiskなRegression修正
- Release前の探索確認

以下のような変更では、既存Deterministic TestとReviewで十分ならAgentic QAを省略できる。

- 文言のみでBehavior不変のDocumentation変更
- Internal-only RefactorでBehavior Contract不変
- 既存Testで十分に閉じる低Risk修正

省略した場合も「未実施をPASS扱い」せず、必要ならPR / Run Summaryで適用不要理由を短く残す。

#### Existing Spec violation

Current Implementationが既存Specに違反している場合、SpecをImplementationへ合わせて変更しない。

- Defectを修正する。
- 必要なRegressionを追加する。
- Active Known Deviationなら該当Entryを削除する。
- Spec変更は誤記修正や説明補足が必要な場合だけ行う。

#### Specification change required

期待挙動自体を変える場合はBug Fix扱いでSpec更新を省略せず、通常Feature変更と同じ順序で更新する。

#### Emergency Fix

緊急修正でも原則として同一Implementation PR内でSpec / AC / Testを同期する。

事前更新できない場合は例外理由を明示し、Merge前にCurrent Specへ同期する。

### 7.9 Agentic QA Operating Contract

#### QA Mode

```text
Observe
  ↓
Reproduce
  ↓
Record
  ↓
Continue exploration
```

Finding受理後に別Implementation / Repair phaseへ渡す。

#### Spec-driven Discovery

参照してよいもの:

- 対象Normative Specification
- 対象に関連するActive Known Deviation
- 対象に関連するUnresolved Specification
- QA Runbook / Charter
- App UI / Runtime
- Test Control / Seed利用方法
- 実行に必要なSetup情報
- Runtime Evidence

Known Deviation / Unresolved SpecificationはExpected Behaviorを上書きするNormative Sourceではなく、誤判定防止用のSupporting情報として扱う。

Finding候補を作る前にApplication SourceやExisting Regressionから答えを探さない。

#### Gray-box Investigation

Finding候補をNormative Spec + UI Evidenceで再現した後、原因調査やRegression Layer判断が必要な場合のみApplication Code / Existing Testを参照してよい。

Codeを読んだこと自体をExpected根拠にしない。

#### Normal / Gray-box Read-only Write Boundary

通常QA / Gray-box QAではCurrent Repositoryの`codex-safe` / 同等Harnessの`readonly` presetを標準経路とする。

このContractの目的は**SourceへのWriteを防ぐこと**であり、Sourceを読めないBlack-box隔離を保証することではない。

Read-only Worker自身がRun Artifactを書けない場合にSource WorkspaceへWrite権限を与えて解決しない。

```text
Parent / Orchestrator
  ├─ Run Artifactを管理
  └─ Read-only Exploration Worker
       ├─ Browser / Device操作
       ├─ Observation
       └─ Structured resultをParentへ返却
```

通常の非Scored QAでTool routing上Read-only WorkerへBrowser Capabilityを渡せない場合だけParent fallbackを許可する。

#### Black-box Read / Information Boundary

Black-box Scored Challengeは通常`readonly`とは別経路とする。

Current wrapperがRepository RootをWorking Rootとして扱う以上、Repository Root上で`read-only`にしてもApplication Sourceを読めるため、Scored Source Isolationとしては不十分である。

Scored Runnerは以下を満たす**isolated execution root**で、**Fresh Session**から起動する。

- Source Repositoryとは別Path / Workspaceである。
- Source Repositoryをmountしない。
- `.git`を含めない。
- Application Source / Existing Test / Patch Sourceをcopyしない。
- Learner-safe Specification Bundle / Runbook / Challenge Definitionだけを配置する。
- Runtimeは外側で起動済みのURL / Emulator / Simulatorを操作する。
- Repository Connector / Search等のSourceへ戻れるToolをRunnerへ付与しない。
- Fresh SessionのPromptにはLearner-safe Inputだけを渡し、過去のSource / Answer Key / Evaluator Contextを引き継がない。

実装方法は専用の軽量Launcher、Temporary Workspace、Container等のうち最小構成を選ぶ。既存Harnessへ無理にSource-free modeを押し込む必要はない。

#### Scored Tool Allowlist

Scored Runnerは「禁止Tool一覧」だけで守らず、許可するCapabilityをPositive Listとして固定する。

標準Allowed Capability:

- isolated root内のLearner-safe Spec / Runbook / Challenge DefinitionのRead
- Target RuntimeへのUser-facing Navigation
- Click / Tap / Fill / Text input / Select / Scroll / Back
- DOM / Accessibility / Semantic Label / Test ID観察
- Screenshot
- Current URL / Current Screen確認
- 制限されたConsole / Narrow LogのRead
- 許可されたSeed / Test Control / Deep Link
- Viewport切替 / App restart等、Challenge Definitionで許可したQA操作

標準でExposeしないCapability:

- Source Repository / Parent DirectoryのFilesystem探索
- Generic Shell / PowerShell / Bash
- Arbitrary `curl` / HTTP fetch / File download
- Git / GitHub Connector / Repository Search
- Web Search / External Search
- Browser `evaluate`等のArbitrary Runtime Code Execution
- Network Response Body inspection
- JS Bundle / Source Map取得
- Arbitrary ADB shell / Package extraction
- Instructor-only Test / Hidden Test output

Browser NavigationはTarget Application OriginとChallenge Definitionで明示的に許可したTest Control / Deep Linkへ限定する。Static bundle URLを直接探索する目的のNavigationは許可しない。

特定Tool実装上、必要CapabilityとForbidden Capabilityを分離できない場合、そのToolをScored Runnerへ直接Exposeしない。より狭いWrapper / Worker経由で必要Capabilityだけを提供する。

#### Forbidden Capability Probe

Scored Run開始前にRunnerと同等のTool Scopeから代表的な禁止経路をProbeする。

最低確認:

- Source Repository Pathへアクセスできない。
- Parent Directory traversalでSourceへ戻れない。
- GitHub / Repository Searchが利用できない。
- Web Search / arbitrary external fetchが利用できない。
- Generic Shellが利用できない。
- WebではJS Bundle / Source Map / Network Response Bodyを取得できない。
- NativeではAPK / IPA / arbitrary ADB shellへ到達できない。

Probeが1つでも成立してしまう場合、そのRunはScored開始前にIsolation Failureとして中止し、練習Runへ降格する。

#### Working Tree Snapshot

Working Tree SnapshotはSource Repositoryを持つ通常QA / Gray-box QAで利用する。

```text
QA開始直前
  ├─ git status --porcelain等
  └─ git diff / git diff --cached等
        ↓
Agentic QA
        ↓
QA終了直後
  ├─ 同形式Snapshot
  └─ 同形式Diff
        ↓
Before / After比較
        ↓
QA実行による追加Source差分 = 0
```

Black-box Scored RunnerにはSource Repository自体を置かないため、Source Tree差分0ではなくIsolation / Tool Allowlist ContractをValidationする。

#### Web Capability

通常Agentic QAの標準経路はPlaywright MCP。

必要Capability:

- Navigate
- DOM / Accessibility観察
- Click / Fill / Select
- Scroll
- Screenshot
- URL確認
- Console / Error確認
- Seed / Test Control Reset
- Viewport切替

Scored modeではPlaywright MCP全Toolを無条件にExposeせず、上記Scored Tool Allowlistへ絞った経路を利用する。

#### Native Capability Contract

Androidを標準Platformとする。

必要Capability:

- Current Screen Screenshot
- Accessibility / Test ID / Semantic Label等による対象識別
- Tap
- Text input
- Scroll
- Back
- App restart
- Deep Link
- Test Control / Seed Reset
- Runtime Evidence
- 必要に応じたNarrow Log取得

Mobile MCP、Maestro MCP、ADB等の組み合わせは問わないが、Capabilityを満たさなければAgentic QA完了と扱わない。

Black-box Scored Nativeでは任意Shell / Package extraction等のImplementation inspectionへ繋がるCapabilityは付与しない。

### 7.10 Atomic Finding Contract

**1 Finding = 1 distinct product deviation**とする。

Atomic Findingの条件:

- 1つの主要Expected Behaviorを対象にする。
- 1つの主要Actual Deviationを記録する。
- 1つのDefect Itemへ最大1件だけMatchする。
- 複数の独立Deviationを1 Findingへまとめない。

同じ操作で複数問題を見つけた場合はFindingを分ける。

Evaluatorが1 Findingから複数Defect Itemを勝手にTPへ分解しない。

非Atomic Findingは`invalid_non_atomic`として扱い、TPにはしない。対応するDefect Itemは別Atomic Findingで発見されていなければFNのままとする。

### 7.11 QA Run Artifact Contract

#### Benchmark Revision

Scored Resultを後から比較・再評価できるよう、RunごとにBenchmark Revisionを持つ。

Benchmark Revisionは、少なくとも以下の評価母集団を一意に識別できることを要求する。

- Application / Runtimeを生成したSource状態
- Learner-safe Normative Specification Bundle
- Challenge Definition
- Instructor Answer Key
- Challenge Patch / Setup

実装方式を特定のVersion DBへ固定しない。

- Benchmark入力がClean / CommittedならGit Commit SHAをそのままRevision IDとして利用してよい。
- Implementation validation等でWorking Treeが未Commitの場合は、対象Benchmark InputのDeterministic Content Digest等を使ってよい。
- `source_head_sha`を補助情報として保存してよい。
- Runtime生成に追加Variantがある場合だけ`runtime_variant_id`またはDigestを追加する。

同一`challenge_id`でもBenchmark Revisionが異なるRunは別母集団として扱う。

#### `qa-findings.json`

最低構造:

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "charter_id": "<charter_id>",
  "benchmark_revision": "<revision>",
  "source_head_sha": "<optional sha>",
  "runtime_variant_id": null,
  "coverage": {
    "required_ids": ["COV-001", "COV-002"],
    "items": [
      {
        "coverage_id": "COV-001",
        "status": "completed",
        "evidence_refs": [".artifacts/..."],
        "blocker_reason": null,
        "notes": "..."
      }
    ]
  },
  "findings": [
    {
      "finding_id": "FIND-001",
      "title": "...",
      "severity": "high",
      "confidence": "high",
      "oracle_refs": ["BR-CART-001", "AC-CART-002"],
      "platform": "web",
      "role": "customer",
      "seed_scenario": "default",
      "steps": ["..."],
      "expected": "...",
      "actual": "...",
      "evidence": [
        {
          "type": "screenshot",
          "ref": ".artifacts/..."
        }
      ],
      "reproduction_count": 2,
      "known_deviation_ref": null,
      "duplicate_of": null,
      "suggested_regression_layer": "web-e2e",
      "status": "validated"
    }
  ]
}
```

Coverage `status`初期候補:

- `completed`: Missionまで到達しRequired Evidenceがある。
- `not_completed`: Runnerが実施しなかった、途中で断念した、必要条件を満たさなかった。
- `blocked_environment`: Runtime / Emulator / MCP / Test Control等、Runner能力評価と切り離すべきEnvironment / Harness要因で実施不能。

Scored Runでは`required_ids`をChallenge Definitionから受け取り、Runnerが削除・縮小しない。

`blocked_environment`には`blocker_reason`と可能なEvidenceを残す。

#### Run Artifact Layout

```text
.codex/runs/<run_id>/
├ PLAN.md
├ TASKS.md
├ REPORT.md
├ run.json
├ qa-charter.md
├ qa-findings.json
└ evaluation.json     # Challenge評価時のみ
```

Current `run.json`へBenchmark情報を最小拡張できる場合は同じ情報を追跡用に持たせてもよい。新規Manifestを乱立させない。

Raw Screenshot、Trace、MCP Log、ADB Log等は`.artifacts/**`等へ分離し、Run Artifactには相対Referenceと要約だけを残す。

Black-box Scored RunnerがRead-only / Source-freeでArtifactを書けない場合、Runner終了後に外側のOrchestratorがFrozen Structured ResultをRun Artifactへ保存する。OrchestratorはScored Finding生成中にAnswer Keyを参照しない。

### 7.12 Learner-safe Challenge Definition / Spec Drift Contract

Learner-safeなChallenge Definitionは最低限以下を持つ。

```text
Challenge ID
Level
Target platform
Spec refs[]
Required coverage[]
Allowed runtime controls
Out of scope
```

Required Coverage Itemは最低限:

```text
Coverage ID
Neutral mission / observation target
Role
Seed / initial state
Platform / viewport or device
Required evidence type
```

Learner-safe Definitionには以下を入れない。

- `defect` / `non-defect`分類
- Answer Key Item ID
- `Related non-defect item ID`
- Challenge Patchの意図
- 正常 / 異常どちらが正解かを示す説明

Coverage Missionは、例えば「suspended userでlogin journeyを探索する」のように中立的に書き、「正常動作を確認する」「不具合を探すべき箇所」等の答えを示す表現を避ける。

Defect / Non-defect ItemとCoverageのMappingはInstructor Answer Keyだけに保持する。

Challenge DefinitionとInstructor Answer Keyが参照する`BR-*` / `AC-*` / Normative Spec sectionはCurrent Normative Specificationに存在しなければValidation Failureとする。

Scored Answer ItemのOracleは、可能な限り安定した`BR-*` / `AC-*`を最低1件含める。UI/UX等でBR / ACだけでは表現しにくい場合はNormative file / section referenceを併用してよい。

#### Spec change impact reporting

Reference存在確認だけでは意味変更を検知できないため、CI / ReviewではBaseとの差分から以下を抽出する。

1. 変更された`BR-*` / `AC-*`
2. Challenge `spec_refs[]`が直接参照する変更Normative file

それらを参照するChallenge IDをSummaryへ列挙する。

例:

```text
Changed requirement: BR-CART-001
Affected challenges:
- CHALLENGE-BASIC-02
- CHALLENGE-ADV-01

Changed normative file: docs/spec/ui-ux-contract.md
Affected challenges:
- CHALLENGE-UI-02
```

このImpact Reportは、Requirement / File内容が変わっただけで自動Failureにはしない。

Reviewer / ImplementerはAffected Challengeごとに以下のどちらかを確認する。

- Challenge / Answer Keyを更新した。
- 編集が意味変更ではなく、Challenge更新不要と判断した。

Fingerprint DBや独自Version Databaseは初期版では導入しない。

### 7.13 Black-box Scored Challenge Isolation

#### Runtime提供原則

Scored Runnerへ**Build ArtifactのbytesやSource Treeを渡さない**。

外側のPreparation ProcessがBuild / Serve / Installを完了し、Source Repositoryとは別のisolated execution rootを作る。

Runner rootの例:

```text
<isolated-run-root>/
├ learner-spec/       # Learner-safe Specification Bundle
├ runbook/
└ challenge/          # Learner-safe Definition only

× .git
× src/
× tests/
× patches/
× instructor/
× build artifact files
```

RunnerはFresh Sessionで起動し、Prompt / ContextへLearner-safe Inputだけを渡す。

RunnerにはScored Tool Allowlistで許可したCapabilityだけを与える。

Web Runtime:

- 起動済みURL / Runtime endpoint
- Learner-safe Specification Bundle
- Learner Runbook / Charter
- 許可されたSeed / Test Control
- UI / DOM / Accessibility / Screenshot /制限Console等のRuntime Evidence Capability

Native Runtime:

- Boot済みEmulator / Simulator上で起動可能なApp
- Learner-safe Specification Bundle
- Learner Runbook / Charter
- 許可されたTest Control
- UI操作 / Screenshot / Narrow Log capability

Scored Runnerへ渡さないもの:

- Source Repository
- Application Source
- Existing Test Source
- `.git` / Git history
- Source Map
- JS Bundle file access / response body inspection
- Browser arbitrary evaluate
- APK / IPA file access
- Arbitrary ADB shell / package extraction
- Challenge Patch Source
- Instructor Answer Key
- Defect List
- Instructor-only Test
- Evaluator Matching情報
- GitHub Connector / Repository Search
- Web Search / External Search
- Generic Shell / arbitrary HTTP fetch
- 前SessionのSource / Answer Key Context

Current Repository上の`codex-safe readonly`はSource Write防止には利用できるが、Repositoryを読めるためこのIsolation Contractの代替にはならない。

Web RuntimeがSource MapやSource inspection経路を無効化できない場合、Native RuntimeがArtifact extractionを防げない場合、RunnerがSource Repositoryへ戻れる場合、またはFresh Session / Tool Allowlistを保証できない場合、そのRunは練習には使えてもBlack-box Scored Resultとして扱わない。

### 7.14 Runner / Evaluator separation

```text
Preparation Process
  ├─ Benchmark Revision確定
  ├─ Baseline sanity
  ├─ Challenge Patch / Setup
  ├─ Post-patch sanity
  ├─ Build / Serve / Install
  ├─ isolated execution root作成
  ├─ learner-safe inputs配置
  └─ Tool Allowlist / Forbidden Probe
            ↓
Fresh Black-box Runner
  │  Source / Answer Keyを読めない
  │
  ├─ Required Coverageを実施
  ├─ Atomic Finding確定
  └─ qa-findings.json相当のStructured ResultをFreeze
            ↓
         Run終了
            ↓
Separate Evaluator
  │  ここで初めてAnswer Keyを読む
  │
  ├─ Benchmark Revision / Isolation確認
  ├─ Coverage blocker確認
  ├─ Atomic Finding ↔ Answer Item Matching
  ├─ Item-specific Evidence検証
  ├─ TP / FP / FN / TN / NE集計
  └─ evaluation.json生成
```

Runner / OrchestratorがSource RepositoryやAnswer Keyを参照できた場合、そのRunは`valid_for_scoring=false`とする。

EvaluatorはFrozen Findingを書き換えない。

RunnerとEvaluatorは同じAgent Sessionを使い回さない。

### 7.15 Instructor Answer Key Item Contract

Answer Keyは採点可能な有限Item集合として定義し、Learner-safe Challenge Definitionとは分離する。

```text
Item ID
Kind: defect | non-defect
Title
Oracle Reference
Expected Behavior
Minimum Reproduction Condition
Required observation / distinguishing condition
Related Coverage ID
Evidence expectation
Expected severity       # defectのみ
Allowed severity delta  # defectのみ
```

`non-defect` Itemは意図されたPlatform差、正常Error表示、Role制約、Empty State等、AIがFalse Positive化しやすい正常挙動を対象にする。

Defect / Non-defect分類、Related Coverage Mapping、Expected severity等はInstructor-only情報とし、Runnerへ渡さない。

Oracle Referenceは安定BR / ACを優先し、必要に応じてNormative file / sectionを補助参照する。

### 7.16 Atomic Finding ↔ Answer Item Matching Rule

1 Atomic Findingは最大1 Defect ItemへMatchする。

Defect ItemへMatchする条件:

1. 同じNormative Behavior / Oracleを対象としている。
2. Actual BehaviorがDefect本質と一致する。
3. Minimum Reproduction Conditionを満たすか、同じDefectを示す同等条件で再現している。
4. Evidenceが同じFailureを裏付ける。

同じDefect Itemへ複数Atomic FindingがMatchした場合:

- 最初の一意FindingだけをTP候補とする。
- 残りを`duplicate`とする。
- Duplicateは追加TPにしない。
- Precision計算前にDuplicateをunique submitted finding集合から除外する。
- `duplicate_rate = duplicate_findings / submitted_atomic_findings`を補助Metricとして記録できる。

Non-atomic Findingは`invalid_non_atomic`としTPへ変換しない。

Matchingが曖昧なら`review_needed`としてEvaluator / Human reviewで確定する。Runner自身に自己採点させない。

### 7.17 Unexpected Valid Finding

Challenge外の予期しない真のDefect候補をAgentが発見した場合、自動的にFPへ落とさない。

`unexpected_valid_finding`としてInstructor Reviewへ回し、以下のどちらかで評価を確定する。

- 真のDefectと確認 → Answer Key / 評価母集団を補正し、新しいBenchmark Revisionとして再評価する。
- Defectではない → FPとして確定。

Review未完了のまま最終Scored Resultを確定しない。

Answer Key変更前後のScoreを同一Benchmark Revisionとして比較しない。

### 7.18 TP / FP / FN / TN / NE

評価単位をAtomic Finding / Answer Itemの対応で統一する。

#### Defect Item

- **TP**: 一意のAtomic FindingがDefect Itemへ正しくMatchしたもの。
- **FN**: Defect ItemにMatchするAtomic Findingがないもの。

#### Submitted Finding

- **FP**: どのDefect Itemにも正しくMatchせず、Product Defectとして提出された一意のAtomic Finding。
- `duplicate`、`invalid_non_atomic`、`review_needed`は別分類とし、最終評価前に扱いを確定する。

#### Non-defect Item

Non-defectは**実際にそのItem固有の正常条件まで探索・観察したものだけ**評価する。

- **TN**: Instructor-only Mapping先のRelated Coverage Itemが`completed`で、かつEvidenceがそのNon-defect Itemの`Required observation / distinguishing condition`を満たし、そのBehaviorをDefectとして誤報しなかったもの。
- **FP_non_defect**: Item固有のRequired observationまで実施・Evidence化したうえで、その正常BehaviorをDefectとして誤報したもの。
- **NE (Not Evaluated)**: Related Coverageが`not_completed`、またはCoverage自体は`completed`でもItem固有のRequired observationをEvidenceから確認できないもの。

単に画面へ到達した、Coverage Itemを`completed`にした、という事実だけではTNにしない。

`blocked_environment`がRequired Coverageに存在する場合は、TN / FP / NEの最終Score比較より前にRun自体をInvalid Scored Runとして扱う。

NEをTNへ数えない。

### 7.19 Scoring validity / Environment blocker

Scored Resultの比較可能性を保つため、Required CoverageがEnvironment / Harness要因で実行不能なRunをCoverage低下としてAgentへ帰責しない。

#### `not_completed`

以下はRunner側の未実施としてCoverage低下へ反映する。

- Required Flowを実施しなかった。
- 途中で探索を諦めた。
- 指定Role / Seed / Viewportを設定しなかった。
- Required Evidenceを残さなかった。

#### `blocked_environment`

以下のようなRunner能力と切り離すべき原因でRequired Coverageを実施できない場合に使う。

- Runtime down / 起動不能
- Emulator / Simulator infrastructure failure
- 必須MCP Capability unavailable
- Test Control / Seed Reset自体の障害
- Harnessの異常で操作不能

EvaluatorがRequired Coverageの`blocked_environment`を確認した場合:

```text
valid_for_scoring = false
invalid_reason = environment_blocker
```

とし、Recall / Precision / FPR / Coverage等をAgent能力の正式Scoreとして確定しない。

一部Metricを診断用に計算してもよいが、比較・合否・ランキングには使わない。

Environment blockerとAgent操作失敗の境界が曖昧な場合はEvaluator Reviewを要求する。

### 7.20 Metric formulas

以下は`valid_for_scoring=true`のRunに適用する。

分母0は`null`とし、0点と同義にしない。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

FPRの分母には**item-specific observationをEvidenceで確認できたexercised non-defect itemsだけ**を含める。NEはFPRから除外し、Coverage / Evaluation Detailで未実施として反映する。

PrecisionはEvaluatorがDeduplicateしたunique Atomic Finding集合で計算する。

### 7.21 Instructor-defined Coverage Contract

Scored ChallengeのRequired Coverage SetはInstructorがChallenge Definitionで固定する。

Runnerは:

- Required Coverage IDを削除しない。
- Required Coverage IDを任意に減らさない。
- Additional exploratory coverageを追加してよい。

EvaluatorはChallenge DefinitionのRequired Coverage IDと`qa-findings.json.coverage.required_ids`が一致することを確認する。

Coverage Itemを`completed`にするには、最低限以下を満たす。

- 対象Role / Seed / Platform / Viewport等を実際に設定している。
- Neutral Mission / Observation Targetまで到達している。
- Required Evidence Referenceが存在する。

単なる自己申告だけで`completed`にしない。

Learner-safe Coverage SetにはDefect / Non-defectの正解を示す情報を含めない。

Coverage完了とNon-defect ItemのTN成立は別判定とし、TNにはInstructor-only Item ContractのRequired observationを追加要求する。

### 7.22 Quality metric scoring

初期版は0〜1へ正規化する。複雑な重み付き総合点を必須にしない。

#### Evidence Quality

各TP Findingを以下4項目で0 / 1採点する。

- Oracle Referenceが正しい。
- Reproduction Stepsが再実行可能。
- Actualを裏付けるEvidence Referenceがある。
- Expected / ActualがObservationとInferenceを混同していない。

Finding Score = 満たした項目数 / 4。

TPが0件ならRunのEvidence Qualityは`null`。

#### Reproducibility

- Reset可能なDefectで`reproduction_count >= 2`かつ同一症状: 1.0
- 環境上2回目が不可能で理由とEvidenceが十分: 0.5。ただしRequired Coverage自体がEnvironment blockerならRun validityを先に判定する。
- 1回のみで理由なし、または再現失敗: 0.0

TPが0件なら`null`。

#### Severity Accuracy

Severityは`critical > high > medium > low`のOrdinal。

Answer Keyの`allowed severity delta`以内なら1.0、超えた場合0.0。

初期Defaultは`allowed severity delta = 1`。

TPが0件なら`null`。

#### Coverage

Instructor定義Required Coverage Setに対する実施率。

```text
Coverage = completed_required_coverage_items / required_coverage_items
```

`not_completed`はCoverage低下として扱う。

`blocked_environment`がRequired Coverageに存在する場合はCoverage低下としてAgentへ帰責せず、Scored RunをInvalidとする。

### 7.23 `evaluation.json` Contract

最低構造:

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "challenge_id": "<challenge_id>",
  "benchmark_revision": "<revision>",
  "source_head_sha": "<optional sha>",
  "runtime_variant_id": null,
  "mode": "black-box",
  "fresh_session": true,
  "tool_scope_validated": true,
  "valid_for_scoring": true,
  "invalid_reasons": [],
  "matches": [],
  "counts": {
    "tp": 0,
    "fp": 0,
    "fn": 0,
    "tn": 0,
    "fp_non_defect": 0,
    "not_evaluated_non_defect": 0,
    "duplicates": 0,
    "invalid_non_atomic": 0,
    "blocked_environment_coverage": 0
  },
  "metrics": {
    "recall": null,
    "precision": null,
    "false_positive_rate": null,
    "evidence_quality": null,
    "reproducibility": null,
    "severity_accuracy": null,
    "coverage": null,
    "duplicate_rate": null
  }
}
```

Evaluatorは`qa-findings.json`と`evaluation.json`のBenchmark Revisionが一致することを確認する。

`valid_for_scoring=false`の場合、正式Scoreとして利用しないMetricは`null`を基本とし、診断値を別Fieldへ持つ必要が出た場合のみ最小拡張する。

既存`run.json` / Evaluation Contractと競合する場合は新規Schemaを乱立させず、既存Contractへ最小拡張する。

### 7.24 Challenge Ground Truth / Validation

ChallengeをScored Runnerへ渡す前に、Ground TruthをInstructor-only Validationで確認する。

#### Pre-patch Baseline Sanity

```text
Clean Baseline
  ↓
Instructor-only challenge-specific sanity
```

最低限確認:

- 注入対象DefectがClean Baselineですでに再現していない。
- Non-defect Itemとして採点する正常BehaviorがBaselineで期待どおり成立する。
- Challengeに必要なSeed / Test Control / Runtime前提が利用可能である。

全Regression SuiteをChallengeごとに二重実行する必要はない。Challenge-specificな最小Sanityに限定する。

#### Post-patch Sanity

```text
Challenge Patch / Setup適用
  ↓
Build / Install / Serve
  ↓
Instructor-only post-patch sanity
```

最低限確認:

- 意図したDefect ItemがMinimum Reproduction Conditionで成立する。
- Non-defect Itemが意図せずDefect化していない。
- Challenge対象外の最低限のNavigation / Reset / Runtime操作が可能である。

Baselineに元から存在するDefectをChallenge注入結果として扱わない。

#### Isolation / Learner-safe Validation

```text
Source Repository外にisolated execution root作成
  ├─ .gitなし
  ├─ Application Sourceなし
  ├─ Existing Test Sourceなし
  ├─ Source Map / JS Bundle inspectionなし
  ├─ APK / IPA file accessなし
  ├─ Patch Sourceなし
  └─ Instructor-only contentなし
  ↓
Fresh Session作成
  ↓
Scored Tool Allowlist適用
  ↓
Forbidden Capability Probe
  ↓
Learner-safe Definitionの情報漏洩確認
  ↓
Normative Spec / Answer Key Oracle Reference integrity確認
  ↓
Changed BR / AC + Changed referenced Normative file → Affected Challenge Summary
  ↓
Scored Run開始
```

意図的Defectにより通常Regressionが失敗する場合、通常Regression全PASSをChallenge Validation条件にしない。

---

## 8. Target implementation Waves

### Wave 0: Implementation Start Gate / Rebaseline

- [ ] PR #14のmergeを確認する。
- [ ] PR #13のmergeを確認する。
- [ ] 他依存PRを確認する。
- [ ] 最新`main`からImplementation Branchを作る。
- [ ] Current `AGENTS.md`に従いStrict workflowとしてRunを初期化する。
- [ ] AGENTS / PROJECT_CONTEXT / ADR / CI / Native / Curriculumを再Mappingする。
- [ ] `codex-safe` / `readonly` presetのCurrent Write Boundaryを再確認する。
- [ ] Current wrapperがBlack-box Source Isolationには不十分である前提を維持し、isolated execution rootの最小方式を決める。
- [ ] Browser / Native Tool routingを確認し、Scored Tool Allowlistを成立させる最小経路を決める。
- [ ] Existing Run / Evaluation schemaを再確認する。
- [ ] Benchmark Revisionを既存Run Contractへ最小拡張する方式を決める。
- [ ] PR #14後のNative ScopeとPR #13 Curriculumの整合を確認する。
- [ ] 本PlanのPath / Wave / DoDを最新Repositoryへ同期する。
- [ ] 既に同等機能が追加済みなら重複を除く。

### Wave 1: Current Specification Inventory

- [ ] README / Guide / PROJECT_CONTEXT / ADR / Code / Seed / Testを横断する。
- [ ] Web / Native Product Scopeを確定する。
- [ ] Role / Permission Matrixを確認する。
- [ ] Business Ruleを抽出する。
- [ ] State / Transitionを抽出する。
- [ ] UI/UX / Accessibility Contractを抽出する。
- [ ] Seed Scenarioの意味と期待を整理する。
- [ ] Executable Canonical Source一覧を作る。
- [ ] 矛盾を`document stale` / `implementation deviation` / `unresolved specification`へ分類する。
- [ ] Product意図をCodeの現状だけで決定しない。

### Wave 2: Markdown Specification System / SSOT

- [ ] `docs/spec/README.md`を作る。
- [ ] READMEでNormative / Supporting責務を明記する。
- [ ] `glossary.md`を作る。
- [ ] `product-scope.md`を作る。
- [ ] `roles-and-permissions.md`を作る。
- [ ] `state-and-scenarios.md`を作る。
- [ ] `ui-ux-contract.md`を作る。
- [ ] `known-deviations.md`をActive-onlyで作る。
- [ ] `unresolved-specifications.md`を作る。
- [ ] Current Scope全体のFeature Specを作る。
- [ ] Executable Canonical SourceへのReferenceを付ける。
- [ ] README / Guide / PROJECT_CONTEXTから重複Ruleを減らしSpecへ参照させる。

### Wave 3: BR / AC / Change Process / Traceability

- [ ] Markdown最小GrammarをDocument化する。
- [ ] Current Normative Spec内BR = Active BRのContractをDocument化する。
- [ ] BR IDを付与する。
- [ ] AC IDを付与する。
- [ ] AC → 1件以上のBR Referenceを付与する。
- [ ] BR Coverage / `Acceptance: N/A`を確認する。
- [ ] Required 5 Section / Conditional SectionをTemplateへ反映する。
- [ ] `change-process.md`を作る。
- [ ] Known Deviation解消Lifecycleを記載する。
- [ ] Unresolved Specification解消Lifecycleを記載する。
- [ ] Risk-based Agentic QA適用条件を記載する。
- [ ] Local / Global BlockerとFinal fail-closeの実行契約を記載する。
- [ ] Feature Spec Templateを作る。
- [ ] AGENTS / Planning / Reviewから変更対象Specを事前確認するよう接続する。
- [ ] Behavior変更時のSpec / AC更新漏れをCode Review観点へ追加する。

### Wave 4: Markdown → Static HTML

- [ ] `docs/spec/**/*.md`だけをSourceとする。
- [ ] Raw HTMLを既定無効にできる軽量Markdown Parserを選定する。
- [ ] `## Navigation`をNavigation Sourceとする。
- [ ] Normative / Supportingの責務をHumanが誤解しないNavigation / Labelを生成する。
- [ ] Heading Anchor / TOC / Table / Code / Relative Linkを生成する。
- [ ] 軽量Responsive CSSを生成する。
- [ ] `output/spec-site/**`等へ出力する。
- [ ] `pnpm run build:spec`を追加する。
- [ ] Source Markdownを変更しないことをTestする。
- [ ] Hosting / Auth / Searchは追加しない。

### Wave 5: Specification Validation / CI

- [ ] Markdownlint。
- [ ] Relative Link validation。
- [ ] BR / AC ID uniqueness。
- [ ] AC → BR integrity。
- [ ] BR Acceptance coverage。
- [ ] Required 5 SectionのValidation。
- [ ] Conditional Sectionは一律必須にしない。
- [ ] Challenge Definition / Answer KeyのNormative Spec Reference integrity。
- [ ] Changed BR / AC → Affected Challenge IDをCI Summaryへ出力する。
- [ ] Changed referenced Normative file → Affected Challenge IDもCI Summaryへ出力する。
- [ ] HTML Build validation。
- [ ] `pnpm run validate:spec`を追加する。
- [ ] `pnpm run verify`へ接続する。
- [ ] 既存CIの適切なJobへ接続する。
- [ ] HTML ArtifactをUploadする。
- [ ] CI Jobを不要に増やさない。

### Wave 6: Agentic QA Workflow / Safety / Artifacts

- [ ] `QA_AGENT.md`を追加する。
- [ ] `.agents/skills/exploratory-qa/SKILL.md`を追加する。
- [ ] `docs/reference/agentic-qa-workflow.md`を追加する。
- [ ] Spec-driven DiscoveryとGray-box Investigationを分離する。
- [ ] Normal / Gray-box QAはExisting `readonly` presetを標準探索経路として接続する。
- [ ] Read-only Write BoundaryとBlack-box Read Boundaryを明確に分離する。
- [ ] Parent / OrchestratorがRun Artifactを保存する。
- [ ] 通常QAの開始前 / 終了後Working Tree Snapshot Contractを実装する。
- [ ] Charter Contractを実装する。
- [ ] Atomic Finding Contractを実装する。
- [ ] `qa-findings.json` Versioned Contractを実装する。
- [ ] Benchmark RevisionをRun Artifactへ記録できるようにする。
- [ ] Coverage Resultを`qa-findings.json`へ構造化する。
- [ ] `blocked_environment`分類を実装する。
- [ ] Known Deviation / Unresolved Spec処理を実装する。
- [ ] Severity / Confidence / Duplicate / Reproduction基準を定義する。
- [ ] Tool / Environment / Product Failureを分類する。
- [ ] Web CapabilityをPlaywright MCPでDry Runする。
- [ ] Native Capability ContractをDocument化する。

### Wave 7: Challenge / Black-box Runtime / Evaluation

- [ ] Learner-safe Challenge Definitionを作る。
- [ ] Learner-safe CoverageからDefect / Non-defect Mappingを排除する。
- [ ] Coverage Missionを中立的な探索表現にする。
- [ ] Instructor Answer Key Item Contractを作る。
- [ ] Challenge Definitionへ`spec_refs`とRequired Coverage Setを定義する。
- [ ] Build / Serve / InstallをRunner外で行うScored Runtime生成方法を作る。
- [ ] Source Repository外のisolated execution root生成方法を作る。
- [ ] Fresh Scored Sessionを作る。
- [ ] Scored Tool Allowlistを実装し、Generic Shell / arbitrary fetch / Search / Browser evaluate等をExposeしない。
- [ ] Forbidden Capability Probeを実装する。
- [ ] Scored RunnerへArtifact bytes / Source Tree / `.git`を渡さない。
- [ ] Web Source Map / JS Bundle / Network Response inspection経路をScored modeで除外する。
- [ ] Native APK / IPA file access / arbitrary ADB shellをScored modeで除外する。
- [ ] Repository Connector / GitHub / Web SearchをScored Runnerから除外する。
- [ ] Gray-box Training Pathを別途定義する。
- [ ] Scored Runner / Evaluatorを別Sessionとして分離する。
- [ ] Benchmark RevisionをRunner / Evaluator双方で一致確認する。
- [ ] RunnerがFinding Freeze後にEvaluatorを開始する。
- [ ] Required Coverage IDをRunnerが縮小できないことを検証する。
- [ ] `blocked_environment`があれば`valid_for_scoring=false`にする。
- [ ] Challenge Patch / SetupをDisposable環境へだけ適用する。
- [ ] Challenge適用前Baseline Sanityを追加する。
- [ ] Challenge適用後Post-patch Sanityを追加する。
- [ ] Defect / Non-defect Itemを用意する。
- [ ] Atomic Finding ↔ Answer Item Matching Ruleを実装する。
- [ ] Duplicate / invalid_non_atomic / review_neededを分離する。
- [ ] TP / FP / FN / TN / NE分類を実装する。
- [ ] TNにItem-specific Required Observation Evidenceを必須化する。
- [ ] 未探索 / Item observation未確認Non-defectをTNへ数えない。
- [ ] Recall / Precision / FPR / Coverage計算を実装する。
- [ ] Evidence / Reproducibility / Severity採点を実装する。
- [ ] `evaluation.json` Versioned Contractを実装する。
- [ ] Basic / Intermediate / Advancedを用意する。
- [ ] Functional / Role / State / Error / Responsive / Accessibility / UI/UX / Non-defectを混ぜる。

### Wave 8: Curriculum integration

- [ ] Curriculum READMEへSpecification / AC / Agentic QAを追加する。
- [ ] Part 1前半へCurrent Specification Systemを読む工程を追加する。
- [ ] Normative / Supportingの違いを追加する。
- [ ] Test DesignへBR / AC → Risk → Test Caseを追加する。
- [ ] 保守モジュールへSpec / AC / Test同期を追加する。
- [ ] 新規Agentic QA ModuleをPart 1後半へ追加する。
- [ ] 既存Capstoneを後ろへ移動し参照番号を更新する。
- [ ] Playwright MCP / Seed / Charter / Oracle / Atomic Finding / Evidence / False Positive / Regression還元を教材化する。
- [ ] Black-box DiscoveryとGray-box Investigationの違いを教材化する。
- [ ] Normal readonlyとBlack-box Isolationの違いを教材化する。
- [ ] Fresh Session / Tool Allowlist / Forbidden Probeの意味を教材化する。
- [ ] Agentic QAをRisk-basedな探索手段として説明する。
- [ ] Native Agentic QAはCapability Contract + Android標準で説明する。
- [ ] Challenge評価でSource / Artifact / Answer Key隔離の意味を説明する。
- [ ] Instructor-defined CoverageとNon-defect評価を教材化する。
- [ ] Environment blocker時にScored Resultを無効にする理由を説明する。
- [ ] Benchmark Revisionが異なるScoreを単純比較しないことを説明する。
- [ ] Part 1 CapstoneへValidated FindingとRegression Feedbackを追加する。
- [ ] Part 2の変更管理 / PR Review / Integration DesignへSpec同期とAI QAを追加する。
- [ ] PR #14後のNative Scope / iOS CIにCurriculum記述を同期する。

### Wave 9: Existing Documentation Responsibility Cleanup

- [ ] READMEをSetup / Product Overview / Spec Entry中心へ整理する。
- [ ] GuideをApplication利用・学習Guideとして維持する。
- [ ] PROJECT_CONTEXTをAI作業・Architecture・Operational Context中心へ整理する。
- [ ] ADRをDecision Historyとして維持する。
- [ ] Existing TestをRegression Assetとして位置付ける。
- [ ] Specとの重複Ruleを減らす。

### Wave 10: Full Validation / Review

- [ ] `pnpm run format:check`。
- [ ] `pnpm run lint:markdown`。
- [ ] `pnpm run validate:spec`。
- [ ] `pnpm run build:spec`。
- [ ] `pnpm run lint`。
- [ ] `pnpm run typecheck`。
- [ ] Spec Validator / Generator Test。
- [ ] 必要なUnit / Integration / Contract / Component Test。
- [ ] `pnpm run test:e2e:chromium`。
- [ ] `pnpm run test:a11y`。
- [ ] `pnpm run test:e2e:mobile-boundary`。
- [ ] Current AppでWeb Agentic QA Charterを最低1件Dry Runする。
- [ ] Finding 0件でもCoverage / Evidence / 終了理由が残ることを確認する。
- [ ] 通常QAでSnapshot比較によりQAによる追加Source差分0を確認する。
- [ ] Android Capabilityが利用可能ならNative Agentic QAをDry Runする。
- [ ] Android Capability不足なら未実施を明記し、Maestro PASSで代替しない。
- [ ] Scored RunnerがSource Repository外のisolated execution rootで動作することを確認する。
- [ ] Scored RunnerがFresh Sessionで開始することを確認する。
- [ ] Scored Runner rootに`.git` / Application Source / Existing Test / Source Map / Artifact bytes / Patch Source / Answer Keyがないことを確認する。
- [ ] Scored Tool Allowlistに必要Capabilityだけが含まれることを確認する。
- [ ] Forbidden Capability ProbeでSource / Search / Shell / arbitrary fetch / Browser evaluate等が利用不可であることを確認する。
- [ ] Scored Web RunnerがJS Bundle / Source Map / Network Response Bodyをinspectionできないことを確認する。
- [ ] Scored Native RunnerがAPK / arbitrary ADB shellへアクセスできないことを確認する。
- [ ] Scored RunnerがGitHub Connector / Repository Search / Web SearchでSource / Answerへ戻れないことを確認する。
- [ ] Learner-safe CoverageにDefect / Non-defect Mappingがないことを確認する。
- [ ] Challenge適用前Baseline Sanityで対象Defectが存在しないことを確認する。
- [ ] Post-patch Sanityで意図したGround Truthが成立することを確認する。
- [ ] Challengeを最低1件Black-box End-to-Endで評価する。
- [ ] Benchmark RevisionがRun ArtifactとEvaluationで一致することを確認する。
- [ ] Required Coverage SetをRunnerが縮小できないことを確認する。
- [ ] Non-defect未探索ケースがTNではなくNEになることを確認する。
- [ ] Coverage completedでもItem-specific Observation EvidenceがなければTNではなくNEになることを確認する。
- [ ] Required CoverageのEnvironment blockerで`valid_for_scoring=false`になることを確認する。
- [ ] Runner起因の`not_completed`はCoverage低下になることを確認する。
- [ ] Atomic Findingが最大1 Defect ItemへだけMatchすることを確認する。
- [ ] Frozen FindingをEvaluatorが変更しないことを確認する。
- [ ] Runner / Evaluatorが同じAgent Sessionを再利用しないことを確認する。
- [ ] TP / FP / FN / TN / NEと各Metricが再計算可能であることを確認する。
- [ ] Challenge / Answer KeyのNormative Spec Reference integrityを確認する。
- [ ] 変更BR / ACおよび変更Referenced Normative fileのAffected Challenge Summaryを確認する。
- [ ] Local Blocker発生時に独立Taskが継続されることをRun Artifactから確認する。
- [ ] Final Validation時に未解消Required Blockerがあればfail-closeされることを確認する。
- [ ] `pnpm run verify`。
- [ ] Required GitHub Actions成功を確認する。
- [ ] Generated HTMLをHuman視点で確認する。
- [ ] Normative Spec / ACをAIエージェントに読ませOracle解釈を確認する。
- [ ] Supporting文書をNormative Oracleとして誤認しないことを確認する。
- [ ] PR差分へProduct Fix / unrelated Refactorが混入していないことをReviewする。

---

## 9. Validation plan

### 9.1 Static Specification

- Markdownlint
- Relative Link
- Normative / Supporting責務の明示
- BR / AC ID uniqueness
- AC → BR integrity
- BR Acceptance coverage
- Required 5 Section
- Conditional Section非強制
- Challenge / Answer Key Normative Spec Reference integrity
- Changed BR / AC → Affected Challenge Summary
- Changed directly referenced Normative file → Affected Challenge Summary
- Generated HTML Build

### 9.2 Generator

- Stable Heading Anchor
- `## Navigation`からのNavigation導出
- Normative / SupportingのHuman-readable表示
- Relative Link変換
- Raw HTML Safety
- Table / Code block保持
- Source Markdown不変
- Deterministic regeneration

### 9.3 Normal / Gray-box Agentic QA

- Normative Specを読まずに開始しない。
- Known Deviationを新規Defect化しない。
- Unresolved Specificationを確定Defect化しない。
- Charterが必要Fieldを持つ。
- Oracle ReferenceなしFindingを完成扱いしない。
- FindingがAtomicである。
- Reset可能Findingで再現する。
- Existing `readonly` presetがWrite Boundaryとして使われる。
- QA前後Baseline Snapshotを比較し、QAによる追加Source変更0を確認する。
- Tool / Environment FailureをProduct Defectへ分類しない。
- Discovery中にSource / Existing Testから答えを先取りしない。

### 9.4 Run Artifact / Benchmark Reproducibility

- `qa-findings.json`に`schema_version`がある。
- `run_id` / `charter_id`からRunを追跡できる。
- Scored Runに`benchmark_revision`がある。
- BenchmarkがClean CommitならGit SHA、未Commit validationなら同等のDeterministic Revision IDを記録できる。
- 必要な場合だけ`source_head_sha` / `runtime_variant_id`を持つ。
- `qa-findings.json`と`evaluation.json`のBenchmark Revisionが一致する。
- Oracle / Evidence / Reproduction / Statusを機械処理できる。
- Required Coverage ID、status、Evidence、blocker reasonを機械処理できる。
- `completed` / `not_completed` / `blocked_environment`を区別できる。
- Challenge時の`evaluation.json`からTP / FP / FN / TN / NEとMetricを再計算できる。
- Benchmark Revisionが異なるScoreを同一系列として無条件比較しない。

### 9.5 Black-box Challenge Isolation / Tool Scope

- Scored RunnerはSource Repositoryとは別のisolated execution rootで起動する。
- Scored RunnerはFresh Sessionで起動する。
- Fresh SessionへLearner-safe Input以外の過去Contextを引き継がない。
- Source RepositoryがRunnerへmount / exposeされていない。
- `.git`がない。
- Application Sourceがない。
- Existing Test Sourceがない。
- Source Mapがない。
- JS Bundle file / response-body inspection経路がない。
- Browser arbitrary evaluateがない。
- APK / IPA file accessがない。
- Arbitrary ADB shellがない。
- Patch Sourceがない。
- Instructor Answer Keyがない。
- GitHub Connector / Repository Search / Web SearchでSourceへ戻れない。
- Generic Shell / arbitrary HTTP fetch / file downloadがない。
- Build / Serve / InstallはRunner外で完了している。
- Existing repo-root `readonly`だけをScored Isolationとして使っていない。
- Scored Tool AllowlistがPositive Listとして定義されている。
- Forbidden Capability ProbeがScored開始前に成功している。
- RunnerとEvaluatorが別Sessionとして分離されている。
- Finding Freeze後だけEvaluatorがAnswer Keyを読む。

### 9.6 Learner-safe Input Validation

- Coverage DefinitionにDefect / Non-defect分類がない。
- Coverage DefinitionにAnswer Key Item IDがない。
- `Related non-defect item ID`がない。
- Coverage Missionが中立的表現である。
- Answer Key MappingはInstructor-onlyに留まる。
- Learner-safe Spec BundleがNormative / Supportingの責務を保持する。

### 9.7 Challenge Ground Truth

- Patch適用前のInstructor-only Baseline Sanityで対象Defectが存在しない。
- BaselineのNon-defect Itemが期待どおり成立する。
- Patch適用後のInstructor-only Sanityで意図したDefectがMinimum Reproduction Conditionを満たす。
- Patch適用後もNon-defect Itemが意図せず壊れていない。
- Challenge-specific Sanityを利用し、全Regression二重実行を必須にしていない。
- Baselineの既存DefectをChallenge注入Defectとして採点しない。

### 9.8 Scoring correctness

- 1 Findingが最大1 Defect ItemへMatchする。
- 同一DefectのDuplicateが追加TPにならない。
- Non-atomic FindingをTPへ分解しない。
- 未探索Non-defectがTNにならない。
- Coverage completedだけではTNにしない。
- Non-defect ItemのRequired observationをEvidenceが満たした場合だけTN / FP_non_defect判定対象になる。
- Item-specific observationがEvidenceで確認できない場合はNEになる。
- NEはFPR分母から除外されCoverage / Detailで反映される。
- Required Coverage SetはInstructor定義でRunnerが縮小できない。
- Coverage completionにEvidenceが必要である。
- Runner起因の未実施は`not_completed`でCoverage低下になる。
- Environment / Harness起因のRequired Coverage blockerは`blocked_environment`になり、Runが`valid_for_scoring=false`になる。
- Invalid Scored RunをAgent能力比較へ使わない。
- Challenge外Unexpected Findingを自動FP化しない。
- Unexpected Valid FindingでAnswer Keyを更新した場合はBenchmark Revisionを更新して再評価する。
- 分母0Metricを`null`として扱う。

### 9.9 Execution Continuity

- Local Blockerが該当Task / dependent taskだけをBlockedにする。
- Local BlockerがWeb / Native / Docs / Challenge等の独立Taskを不要に停止させない。
- Global blockerだけがWhole-run停止条件になる。
- `## Blocked`へ理由 / 依存 / 再開条件を記録する。
- Final Validationでは未解消Required Blockerを残したままPASSにしない。

### 9.10 Curriculum

- Part 1 / Part 2 Link / Number整合。
- Test Case ID / UI Test ID / BR / ACの用語整合。
- Normative / Supportingの違いが一貫している。
- Agentic QAをAutomationの代替として説明しない。
- Agentic QAを全変更の必須工程として説明しない。
- Atomic Findingの考え方が教材とWorkflowで一致する。
- Black-box / Gray-boxの目的を混同しない。
- Normal readonly / Black-box isolationを混同しない。
- Fresh Session / Tool Allowlistの意味を正しく説明する。
- Learner本文にAnswer Keyを露出しない。
- Benchmark Revisionが違うScoreを同一基準として単純比較しない。
- PR #14後のNative / iOS CIの事実と整合する。

### 9.11 Product Regression

Package / Generator / CI変更を伴うため既存`verify`とRequired CIを通す。

実行していない検証をPASS扱いしない。

---

## 10. Risks

### R1. 1PRのScopeが大きい

**Risk:** Specification、Generator、CI、Agentic QA、Challenge、Curriculumを1PRへ含めるためReview負荷が高い。

**Mitigation:** WaveとLogical Commitを分離し、Product Feature改修を混ぜない。各Wave完了時にScope Reviewする。Local Blockerでは独立Taskを継続する。

### R2. 現状Implementationを誤って仕様化する

**Risk:** Bugや偶然の挙動をSpecへ固定する。

**Mitigation:** Docs / ADR / History / Test / Codeを横断し、不明なものはUnresolved Specificationへ分離する。

### R3. Specification System全体をNormativeと誤認する

**Risk:** `unresolved-specifications.md`やTemplateまでOracleとして扱われ、自己矛盾が生じる。

**Mitigation:** `docs/spec/`をSpecification Systemとし、Normative領域とSupporting領域を明示分離する。Expected判断にはNormative領域だけを使う。

### R4. MarkdownとCodeの二重管理

**Risk:** Seed / Role / Route / Token等が二重管理になる。

**Mitigation:** Normative Behavior SSOTとExecutable Canonical Sourceを責務分離し、低レベル値を無目的に複製しない。

### R5. Validator過剰設計

**Risk:** Markdownが疑似Database化する。

**Mitigation:** 機械必須は最小Grammar、BR / AC ID / Reference、Navigation、Required 5 Section程度に限定する。

### R6. HTML Platform肥大化

**Risk:** Documentation Framework整備が主目的化する。

**Mitigation:** Lightweight Parser + Static HTML + CSS + Navigationに限定する。Hosting / Search / CMSはNon-goal。

### R7. AI QA False Positive

**Risk:** AIが独自期待を作る。

**Mitigation:** Oracle Reference、Known Deviation Check、Reproduction、Evidence、Confidenceを必須化する。

### R8. Normal QA WorkerがSourceを変更する

**Risk:** 探索結果が自己修正によって汚染される。

**Mitigation:** Existing `readonly` presetをWrite Boundaryとして標準利用し、Before / After SnapshotでQAによる追加差分0を確認する。

### R9. `readonly`をBlack-box隔離と誤認する

**Risk:** Repository Root上のread-only RunnerがSourceを読めるため、探索能力評価がCode Inspection評価へ変質する。

**Mitigation:** Scored RunnerはSource Repository外のisolated execution rootで実行し、Source Repositoryをmountしない。Existing repo-root readonlyはScored Isolationの代替にしない。

### R10. Filesystemを隔離してもToolからImplementationへ到達する

**Risk:** Source Repositoryを除外してもGeneric Shell、Browser evaluate、arbitrary fetch、Network response inspection等からJS BundleやImplementation情報へ到達する。

**Mitigation:** Fresh Session + Positive Tool AllowlistをScored Contractとし、Browser / Nativeの必要CapabilityだけをExposeする。Forbidden Capability Probeで実行前に検証する。

### R11. Scored Sessionへ過去Contextが混入する

**Risk:** 同じAgent SessionがScored開始前にSource / Answer Keyを読んでいれば、Filesystem隔離後もBlack-box評価にならない。

**Mitigation:** Scored RunnerはFresh Sessionで開始し、Learner-safe Prompt / Inputsだけを渡す。Evaluatorは別Sessionとする。

### R12. Black-box RunnerへのImplementation leakage

**Risk:** Sourceを除外してもJS Bundle、Source Map、APK等から実装を読める。

**Mitigation:** Artifact bytesはRunnerへ渡さず、Runner外でServe / Install済みRuntimeだけを提供する。Source Map / bundle inspection / arbitrary ADB shell等もScored modeでは除外する。

### R13. Learner-safe CoverageからAnswerが漏れる

**Risk:** Non-defect Mappingや「正常確認」等のMission表現が正解を教え、False Positive評価が無効になる。

**Mitigation:** Learner-safe Coverageは中立Missionだけを持ち、Defect / Non-defect分類とCoverage MappingはInstructor Answer Keyだけに保持する。

### R14. Runner / Evaluatorの情報混線

**Risk:** Finding作成AgentがAnswer Keyを見た状態で自己採点する。

**Mitigation:** Finding FreezeまではRunnerだけ、Answer KeyはRun終了後の別Session Evaluatorだけが読む。

### R15. Benchmark RevisionなしでScoreを比較する

**Risk:** Application / Spec / Challenge / Answer Keyが変わった後も同じ`challenge_id`だけでScoreを比較し、異なる母集団を同一評価と誤認する。

**Mitigation:** Scored RunへBenchmark Revisionを必須化し、`qa-findings.json`と`evaluation.json`で一致確認する。異なるRevisionを無条件比較しない。

### R16. Challenge Ground TruthがBaseline Defectに汚染される

**Risk:** Patch前から存在するDefectをChallenge注入結果として扱い、Answer Keyが誤ったGround Truthになる。

**Mitigation:** Challenge-specificなPre-patch Baseline SanityとPost-patch SanityをInstructor-onlyで実施する。

### R17. TP / FPの計数単位が混ざる

**Risk:** TPをDefect Item単位、FPをFinding単位で数えるとPrecisionが数学的に破綻する。

**Mitigation:** 1 Finding = 1 deviation、1 Finding → 最大1 Defect Itemに固定する。Duplicate / non-atomicを別分類する。

### R18. 未探索正常ケースでFPRが良化する

**Risk:** 未探索Non-defectまでTNにすると、何もしないAgentが低FPRになる。

**Mitigation:** Non-defectはTN / FP_non_defect / NEを区別し、Item-specific Required ObservationをEvidenceで確認できたItemだけをFPR分母へ入れる。

### R19. Coverage完了だけでTNになる

**Risk:** 1つのCoverage Itemへ複数Non-defect Itemが紐づく場合、画面到達だけで未観察の正常BehaviorまでTNになる。

**Mitigation:** TNにはCoverage完了に加え、Answer Item固有のRequired ObservationをEvidenceが満たすことを要求する。満たさなければNE。

### R20. Coverage自己申告のGaming

**Risk:** AgentがCoverage denominatorを小さく宣言すれば100%にできる。

**Mitigation:** Instructor-defined Required Coverage SetをChallenge Definitionで固定し、Runnerは縮小不可とする。完了にはEvidenceを要求する。

### R21. Environment failureでAgent Scoreが不当に下がる

**Risk:** Runtime / MCP / Emulator障害をCoverage不足としてAgentへ帰責すると評価比較が壊れる。

**Mitigation:** Runner起因は`not_completed`、Environment / Harness起因は`blocked_environment`へ分離する。Required CoverageにEnvironment blockerがあればRunを`valid_for_scoring=false`とする。

### R22. Challenge / Spec drift

**Risk:** Product Specが変わっても古いChallenge / Answer Keyが残り、誤ったOracleで採点する。

**Mitigation:** Spec Reference integrityをCIで検証し、変更BR / ACに加えて直接参照する変更Normative fileもAffected Challenge Summaryへ出す。Fingerprint DBは作らない。

### R23. Local BlockerでGoal全体が停止する

**Risk:** Nativeや1 Challengeの局所Blockerで、Web / Docs / Validator / Curriculum等の独立Taskまで停止し、1回の`/goal`で進められる作業を残す。

**Mitigation:** Local / Global Blockerを分離する。Local Blockerは該当Taskと依存TaskだけをBlockedへ移し、独立Taskを継続する。Final Validationだけfail-closeにする。

### R24. Agentic QA運用の過剰化

**Risk:** すべての小変更でExploratory QAが必須になり、運用負荷が増える。

**Mitigation:** UI / Journey / Role / State / Error / High-risk変更等を主な適用対象とするRisk-based運用にする。

### R25. NativeをAgentic QAと誤認する

**Risk:** Maestro Regressionを実行しただけで探索QA完了と扱う。

**Mitigation:** Native Capability Contractを定義し、Capability不足時は未実施と明記する。

### R26. CurriculumがPR #14後の現状とずれる

**Risk:** PR #13のNative / iOS CI説明がマージ直後から古くなる。

**Mitigation:** Wave 0でPR #14→#13後をRebaselineし、Wave 8でCurrent Productへ同期する。

### R27. Known Deviation / Unresolved SpecのLifecycle不整合

**Risk:** 解消済みKnown Deviationが残りRegressionを抑制する、または確定済みUnresolved Specが未確定扱いされ続ける。

**Mitigation:** Known DeviationはActive-only。Unresolved Specificationは確定後Normative Feature Specへ統合して一覧から削除する。

---

## 11. Open questions

現時点でImplementationを開始できない未回答のBlocking Questionはない。

Wave 0以降で以下が判明した場合はOpen Questionへ追加し、必要ならOwner Decisionを求める。

- PR #14 / #13または後続PRによって本Planの中核ContractとCurrent Repositoryが衝突する。
- Product意図をDocs / ADR / History / Code / Testから確定できない。
- Current Harnessで通常QAの`readonly` + Browser / Device Capabilityを成立させられない。
- Source Repositoryとは別のisolated execution rootでBlack-box Runnerを成立させられない。
- Scored Tool Allowlistへ必要なBrowser / Native Capabilityだけを安全に切り出せない。
- Fresh Scored Sessionを既存Agent / MCP構成で成立させられない。
- Scored Web RuntimeでSource Map / Bundle / Network inspectionを十分に制限できない。
- Scored Native RuntimeでAPK access / arbitrary ADB shellを十分に制限できない。
- Existing Run / Evaluation schemaと本PlanのVersioned Artifact / Benchmark Revision Contractを最小拡張で両立できない。
- Environment blockerとRunner起因の失敗をEvidenceから合理的に区別できないケースが生じる。

Open Questionは推測で埋めない。ただし**Local Blockerなら該当Taskと依存Taskだけを停止し、独立Taskは継続する**。

Whole-runを止めるのは、Goal / Safety / Core Contract全体へ影響するGlobal Blockerに限る。

---

## 12. Follow-up notes

今回のImplementation PR完了後に必要性が確認された場合のみ別途検討する。

- Generated HTMLの外部Hosting / 認証 / Full-text Search。
- AI QAのNightly / Release前自動起動。
- AI QAをCI Gateへ昇格するかの実測評価。
- iOS物理端末Agentic QA。
- Challenge数や難易度の追加拡張。
- Evaluation Scoreの重み付き総合点や長期Trend分析。
- Unexpected Valid FindingをProduct Backlog / Answer Keyへ還元する運用の高度化。
- Duplicate Rate等の補助Metricを正式KPIへ昇格するかの検討。
- Challenge Impact Summaryを将来Hard Gate化する必要性の評価。
- Scored Tool Allowlistを将来別Harnessへ一般化する必要性の評価。

これらは今回の必須DoDへ入れない。

---

## 13. 予定成果物

### Future Implementation PRの予定変更領域

```text
docs/spec/**
QA_AGENT.md
AGENTS.md
CODE_REVIEW.md
PLANS.md                    # 必要な参照追加のみ
docs/PROJECT_CONTEXT.md
docs/reference/agentic-qa-workflow.md
.agents/skills/exploratory-qa/**
scripts/spec/**
scripts/tests/spec-*.test.*
scripts/agentic-qa/**       # isolated scored runner / tool scope / evaluation orchestrationが必要な場合のみ最小追加
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
docs/curriculum/test-automation/**
training/agentic-qa/**       # 実PathはWave 0で確定
```

これは将来のImplementation PRのScopeであり、現在のPlan Branchでは変更しない。

### Generated / Runtime Artifact

```text
output/spec-site/**
.artifacts/**
<temporary isolated scored-run-root>/**
```

原則Git管理しない。

### Durable Documentation

- Current Specification System
- Normative Product Behavior Specification
- Business Rule / Acceptance Criteria
- Specification Change Process
- Feature Spec Template
- Agentic QA Workflow Reference
- Scored Tool Allowlist / Isolation Contract
- Challenge Definition
- Instructor Answer Key
- Curriculum Agentic QA Module

---

## 14. Implementation PRのCommit / Review単位

PRは1本だがReview可能性を保つ。

推奨Logical Commit:

1. `docs: establish current product specification`
2. `docs: define acceptance criteria and change process`
3. `feat: add specification html generator`
4. `ci: validate and publish specification artifact`
5. `docs: define agentic exploratory qa workflow`
6. `test: add isolated agentic qa challenges`
7. `docs: integrate agentic qa into curriculum`
8. `docs: align repository entry points with specification`
9. `test: validate specification and agentic qa contracts`

無関係なProduct Fixを混ぜない。

---

## 15. Final architecture

```text
                  ┌─────────────────────────────┐
                  │ docs/spec/                  │
                  │ Specification System        │
                  └──────────────┬──────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
┌─────────────────────────────┐       ┌─────────────────────────────┐
│ Normative Product Behavior  │       │ Supporting / Operational    │
│ scope / roles / state / UI  │       │ README / glossary / process │
│ features / BR / AC          │       │ deviations / unresolved     │
└──────────────┬──────────────┘       └─────────────────────────────┘
               │
       ┌───────┼───────────────┐
       │       │               │
       ▼       ▼               ▼
 Human/HTML  Developer/QA    AI Agent Oracle
               │               │
               │               ▼
               │        Spec-driven Discovery
               │               │
               ▼               ▼
          BR / Acceptance Criteria
               │
               ▼
          Risk / Test Case
               │
      ┌────────┴───────────┐
      ▼                    ▼
Deterministic          Risk-based
Automation             Agentic QA
      │                    │
      └────────┬───────────┘
               ▼
        Evidence / Finding
               │
               ▼
    Regression / Spec Feedback

Normal / Gray-box QA
Repository Root
  └─ existing readonly preset
       → Write Boundary

Black-box Scored Challenge
Preparation Process
  ├─ Benchmark Revision
  ├─ Baseline sanity
  ├─ Challenge Patch / Setup
  ├─ Post-patch sanity
  ├─ Build / Serve / Install
  ├─ isolated execution root
  ├─ learner-safe inputs only
  └─ Forbidden Capability Probe
        │
        ▼
Fresh Source-free Scored Runner
  + explicit Tool Allowlist
  × Source Repository / .git
  × Artifact bytes
  × Search / generic shell
  × Answer Key / prior context
        │
        ▼
Atomic Findings + Coverage Evidence
        │
        ▼
Frozen Structured Result
        │
        ▼
Separate Evaluator + Answer Key
  + same Benchmark Revision
        │
        ▼
evaluation.json

Executable Canonical Sources
Seed / Role / Route / Token / Config
        ↑
        └──── Normative Specから意味・Contractを参照しつつRuntimeで利用
```

### Execution continuity

```text
Local blocker
  ├─ affected task → Blocked
  ├─ dependent task → Blocked
  └─ independent task → Continue

Global blocker
  └─ Whole-run stop / Owner Decision

Final Validation
  └─ unresolved Required Blocker → Fail-close
```

---

## 16. 実装開始時の原則

- 最初にPR #14、PR #13、その他依存PRのMerge状態を確認する。
- 最新`main`の事実を本Planより優先し、Wave 0でPlanを同期する。
- Current `AGENTS.md`のStrict workflow要件に従う。
- Goal / Normative SSOT責務 / Atomic Finding / Instructor-defined Coverage / Black-box Source・Artifact・Answer Key隔離 / QA Write Boundary / Runner-Evaluator分離等の中核Contractを暗黙に弱めない。
- `docs/spec/`全体を無条件にNormative Oracle化しない。
- Normal readonlyとBlack-box Isolationを同じ安全境界として扱わない。
- Scored RunnerはFresh Session + isolated root + explicit Tool Allowlistを成立条件とする。
- Scored Runnerへ「禁止していないから使える」Capabilityを残さない。
- Benchmark Revisionを記録せずScored Resultを比較可能な成果物として扱わない。
- Challenge Ground TruthはPre-patch / Post-patch Sanityで確認する。
- Local Blockerでは該当Taskと依存Taskだけを止め、独立Taskを最後まで進める。
- Global blockerだけWhole-runを停止する。
- Final Validationはfail-closeとし、Blocked / 未実施をPASS扱いしない。
- 最新Repositoryと中核Contractが衝突する場合はOwner Decisionを求める。
- 目的は文書量を増やすことではなく、人間とAIが同じ期待値からQAできる状態を作ることである。
- Markdownは人間にもAIにも読みやすい自然文を優先する。
- MetadataやValidatorは必要最小限にする。
- Generated HTMLはPresentation Layerであり、直接編集しない。
- Agentic QAはDeterministic Automationの代替ではない。
- Agentic QAを全変更へ無条件に強制しない。
- Black-box Scored ChallengeとGray-box Trainingを混同しない。
- Learner-safe入力へDefect / Non-defectの正解を漏らさない。
- 未探索正常ケースを良い評価として扱わない。
- Coverage完了だけでNon-defectをTN扱いせず、Item-specific Observation Evidenceを確認する。
- Environment / Harness blockerをAgent能力不足として採点しない。
- Source / Artifact / Answer Key / Forbidden ToolへアクセスできたRunをBlack-box Scored Resultとして扱わない。
