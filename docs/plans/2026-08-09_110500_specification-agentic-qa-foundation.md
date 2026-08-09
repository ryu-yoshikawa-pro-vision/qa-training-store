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

そのうえで、以下を1本のImplementation PRで一貫して接続する。

```text
Specification
  ↓
Business Rule / Acceptance Criteria
  ↓
Risk / Test Design
  ↓
Deterministic Automation
  +
Agentic Exploratory QA
  ↓
Evidence / Finding
  ↓
Validated Regression / Spec Feedback
```

Human向けにはMarkdownから静的HTMLを機械生成する。AIエージェントはGenerated HTMLではなくMarkdownのCurrent Specificationを直接読む。

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

#### Specification

- [ ] README、Guide、PROJECT_CONTEXT、ADR、Seed、Application、Test、CI、Native実装を棚卸ししている。
- [ ] 仕様情報の重複、古い文書、Implementation Deviation、未確定事項を分類している。
- [ ] `docs/spec/README.md`がCurrent Product Specificationの唯一の入口として機能する。
- [ ] Product Scope、Role / Permission、Business Rule、State / Transition、Web / Native差分、UI/UX Contract、主要Feature仕様がMarkdownで明文化されている。
- [ ] MarkdownをNormative Product Behavior SSOTと明記している。
- [ ] Seed Metadata、Role、Route、Design Token、Config等のExecutable Canonical Sourceとの責務境界を明記している。
- [ ] Generated HTML、Application実装、Existing TestをNormative Product Behavior SSOTとして扱わない。
- [ ] Executable Canonical Sourceの低レベル値をMarkdownへ無目的に複製しない。

#### Business Rule / Acceptance Criteria

- [ ] Business Ruleへ安定ID`BR-*`を付与している。
- [ ] Acceptance Criteriaへ安定ID`AC-*`を付与している。
- [ ] Test Case ID、UI Test ID / `testId`、BR、ACを別Namespaceとして扱っている。
- [ ] Current Specificationに存在するBRをActive BRとして扱う。
- [ ] BR / ACのMarkdown最小Grammarを明文化している。
- [ ] `BR-*` / `AC-*`の重複を機械検証できる。
- [ ] ACから参照する1件以上のBRの存在を機械検証できる。
- [ ] Active BRは、1件以上のACから参照されるか、直接ACを持たない理由を明記している。
- [ ] Feature SpecのRequired Section / Conditional Sectionが明確である。

#### Change Process

- [ ] 通常Feature変更時のSpec更新順を文書化している。
- [ ] 「Existing SpecへのBug Fix」と「Product Specification変更」を区別している。
- [ ] 緊急修正時のSpec同期ルールを定義している。
- [ ] Spec / Implementation / Testが矛盾した場合のDecision Ruleを定義している。
- [ ] Product意図が確定できない項目を、AIや現行Implementationで勝手に埋めない。
- [ ] Known Deviation解消時のLifecycleを定義している。
- [ ] Unresolved Specification確定時のLifecycleを定義している。

#### Human-facing HTML

- [ ] `docs/spec/**/*.md`から静的HTMLを生成できる。
- [ ] HTMLはMarkdownから一方向生成する。
- [ ] Generated HTMLを直接編集しない。
- [ ] HTMLはNavigation、見出しAnchor、Page TOC、Table、Code block、Responsive表示を備える。
- [ ] Navigationは`docs/spec/README.md`の`## Navigation`から導出する。
- [ ] Generated HTMLを削除してもMarkdownから完全再生成できる。
- [ ] 初期DoDに外部Hosting、認証、全文検索、CMSを含めない。

#### Specification Validation / CI

- [ ] Markdownlintが成功する。
- [ ] Relative Link validationが成功する。
- [ ] BR / AC ID uniquenessが成功する。
- [ ] BR / AC reference integrityが成功する。
- [ ] BR Acceptance coverageが成功する。
- [ ] Feature Required Section validationが成功する。
- [ ] Challenge / Answer KeyのSpec Reference integrityが成功する。
- [ ] HTML Buildが成功する。
- [ ] Specification Validationが`pnpm run verify`とRequired CIへ接続される。
- [ ] Generated HTMLをCI ArtifactとしてReviewerが確認できる。

#### Agentic QA

- [ ] Code Review / Repairとは別のAgentic Exploratory QA Entry Point / Skill / Workflowがある。
- [ ] AI QA開始前に対象Spec、BR / AC、Known Deviation、Unresolved Specification、Role、Seed、Platform、Viewport、Charterを固定する。
- [ ] AI QAではSpecificationをOracleとして参照する。
- [ ] 未確定仕様をNormative Oracleとして扱わない。
- [ ] Known Deviationを新規Defectとして重複報告しない。
- [ ] Spec-driven DiscoveryとGray-box Investigationの情報境界を定義している。
- [ ] QA探索Workerは既存Harnessの`readonly` presetを標準経路として利用する。
- [ ] QA開始直前と終了直後のWorking Tree Snapshotを比較し、QA実行による追加Source差分が0であることを確認する。
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
- [ ] Challenge評価時の`evaluation.json`もVersioned JSON Contractを持つ。
- [ ] Raw Screenshot / Trace / MCP Log等の大容量Evidenceは既存Artifact方針に従いGit管理対象外へ分離する。

#### Challenge / Evaluation

- [ ] Challenge DefinitionとInstructor Answer KeyをRepository内でReview可能に管理する。
- [ ] Black-box Scored ChallengeとGray-box Training / Investigationを区別している。
- [ ] Black-box Scored Runnerへは**Built Artifactのファイル自体を渡さず**、外側でServe / Install済みのRuntimeだけを提供する。
- [ ] Black-box WebではSource Map、JS Bundle内容取得、Source inspection経路をScored Runnerへ提供しない。
- [ ] Black-box NativeではAPK / IPAファイル、Arbitrary ADB shell、App package extraction経路をScored Runnerへ提供しない。
- [ ] Gray-box TrainingではSource参照を許容するが、Black-box Recall / Precisionと同じスコアへ混ぜない。
- [ ] Learner / AgentへInstructor Answer Keyを渡さない。
- [ ] Scored RunではFilesystem、Git History、GitHub Connector、Repository Search、External Search、Prompt Context、Hidden Test Output等からInstructor-only情報へアクセスできないことを評価成立条件とする。
- [ ] Scored Runner / OrchestratorはAnswer Keyを参照しない。
- [ ] Runnerが`qa-findings.json`をFreezeした後、別EvaluatorだけがAnswer Keyを読む。
- [ ] FindingとDefect Itemの計数単位がAtomic Findingで統一されている。
- [ ] Instructorが定義したRequired Coverage SetをRunnerが減らせない。
- [ ] Required Coverageの完了状態とEvidenceを機械可読に記録できる。
- [ ] Non-defect Itemは`TN / FP / Not Evaluated`を区別する。
- [ ] 未探索Non-defectをTNに数えない。
- [ ] TP / FP / FN / TN、Recall / Precision / FPRを同一単位で再計算できる。
- [ ] Evidence Quality、Reproducibility、Severity Accuracy、Coverageの採点Ruleが定義されている。
- [ ] Challenge / Answer KeyのOracle ReferenceがCurrent Specに存在することをCIで検証できる。

#### Curriculum

- [ ] Specification / Acceptance Criteriaの読み方をカリキュラムへ追加する。
- [ ] BR / AC → Risk → Test Case → Automationの関係を追加する。
- [ ] Agentic QAをPart 1後半へ追加する。
- [ ] Black-box探索とGray-box調査の違いを教材化する。
- [ ] Part 1 CapstoneへValidated FindingとRegression Feedbackを追加する。
- [ ] Part 2の変更管理 / PR Review / Integration DesignへSpec同期とAI QA運用を接続する。
- [ ] PR #14マージ後のNative Scope / iOS CIを反映する。

#### Final

- [ ] 既存Product Behaviorを意図せず変更していない。
- [ ] Product Bug修正や無関係なRefactorが混ざっていない。
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

### 2.3 現在の問題

```text
README / Guide / PROJECT_CONTEXT / ADR / Code / Test
        ↓
仕様相当情報が分散
        ↓
Human / QA / AIが個別に期待値を解釈
        ↓
Test / Review / QAでOracleが揺れる
```

### 2.4 目標状態

```text
docs/spec/**/*.md
Normative Product Behavior SSOT
        │
        ├─ Human → Generated HTML
        ├─ Developer / Reviewer
        ├─ QA / Test Design
        └─ AI Agent Oracle
        │
        ├─ references → Executable Canonical Sources
        │               Seed / Role / Route / Token / Config
        ▼
Business Rule / Acceptance Criteria
        ▼
Risk / Test Case Design
        ▼
Deterministic Automation + Agentic Exploratory QA
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
- Current Repositoryに存在する`codex-safe`の`readonly` presetをAgentic QAの標準Read-only経路として再利用する。Wave 0でContractが変更・削除されていた場合のみ再設計する。
- Challenge評価の目的はAIの未知不具合探索能力を評価することであり、Code Inspection能力をBlack-box探索スコアへ混ぜない。

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
- `scripts/codex-safe.*`
- `scripts/codex-task.*`
- Existing run / evaluation artifact schema

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

### 7.1 基本方針

実装は1本のPR内でWave順に進める。

- Waveごとに責務を明確にする。
- 各Wave完了時にScope Reviewする。
- Product Bugや無関係なRefactorを混ぜない。
- 後続Waveが前WaveのContractを前提にできる順序で実施する。
- 中核Contractに矛盾する状況が発生した場合だけOwner Decisionを求める。

### 7.2 仕様の正本モデル

#### Normative Product Behavior SSOT

`docs/spec/**/*.md`を「Productとして何が正しいか」を定義する規範的SSOTとする。

対象例:

- Product Scope
- Actor / Roleごとの許可・禁止
- Business Rule
- State / Transition
- Error / Boundary Behavior
- UI / UX Contract
- Web / Nativeで同じであるべきBehavior
- 意図したPlatform Difference
- Acceptance Criteria

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

#### Non-SSOT

以下は仕様判断の参考・Evidenceにはなるが、Normative Product Behavior SSOTを暗黙に上書きしない。

- Application実装
- Existing Test
- Generated HTML
- README
- Guide
- PROJECT_CONTEXT
- ADR

ADRはDecision Historyであり、Current Specと矛盾する場合はCurrent SpecまたはADRの同期漏れとして扱う。

### 7.3 Key abstractions

- **Product Specification**: どうあるべきかを定義するNormative Behavior。
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
- **Black-box Scored Challenge**: Source / Artifact bytes / Answer Keyを見ず、RuntimeとSpecから探索能力を評価するChallenge。
- **Gray-box Training / Investigation**: Source / Existing Test参照を許容し、原因調査やRegression判断を学ぶ非Black-box評価モード。
- **Required Coverage Set**: InstructorがChallengeごとに固定する、Scored Runで最低限探索すべき有限集合。

### 7.4 Target Specification structure

```text
docs/spec/
├ README.md
├ glossary.md
├ product-scope.md
├ roles-and-permissions.md
├ state-and-scenarios.md
├ ui-ux-contract.md
├ known-deviations.md
├ unresolved-specifications.md
├ change-process.md
├ _templates/
│  └ feature-spec.md
└ features/
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

#### Business Rule

```markdown
### BR-CART-001 — Cart数量上限

Cart数量は、Product仕様で定義された購入可能上限を超えてはならない。
```

Current Specificationに存在する`BR-*`見出しはActive BRとして扱う。

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

1. Current `docs/spec/**`のNormative記述
2. 同Spec内のBR / AC
3. `known-deviations.md`によるCurrent Implementationとの差異情報
4. ADRによるDecision History
5. Application / Seed / Test / README / GuideはEvidence / Implementation Reference

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
Feature Spec / BR / ACへ統合
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
Agentic QA / Exploratory QA
  ↓
Review / Merge
```

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

- 対象`docs/spec/**`
- QA Runbook / Charter
- App UI / Runtime
- Test Control / Seed利用方法
- 実行に必要なSetup情報
- Runtime Evidence

Finding候補を作る前にApplication SourceやExisting Regressionから答えを探さない。

#### Gray-box Investigation

Finding候補をSpec + UI Evidenceで再現した後、原因調査やRegression Layer判断が必要な場合のみApplication Code / Existing Testを参照してよい。

Codeを読んだこと自体をExpected根拠にしない。

#### Read-only Write Boundary

Current Repositoryの`codex-safe` / 同等Harnessの`readonly` presetを標準経路とする。

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

Black-box Scored Challengeではworkspace-write Parentによる探索Fallbackを許可しない。

#### Working Tree Snapshot

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

Implementation PRの既存差分とQAが作った追加差分を混同しない。

#### Web Capability

標準経路はPlaywright MCP。

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
- 必要に応じたLog取得

Mobile MCP、Maestro MCP、ADB等の組み合わせは問わないが、Capabilityを満たさなければAgentic QA完了と扱わない。

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

#### `qa-findings.json`

最低構造:

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "charter_id": "<charter_id>",
  "coverage": {
    "required_ids": ["COV-001", "COV-002"],
    "items": [
      {
        "coverage_id": "COV-001",
        "status": "completed",
        "evidence_refs": [".artifacts/..."],
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

- `completed`
- `not_completed`
- `blocked`

Scored Runでは`required_ids`をChallenge Definitionから受け取り、Runnerが削除・縮小しない。

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

Raw Screenshot、Trace、MCP Log、ADB Log等は`.artifacts/**`等へ分離し、Run Artifactには相対Referenceと要約だけを残す。

### 7.12 Challenge Definition / Spec Drift Contract

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
Mission / observation target
Role
Seed / initial state
Platform / viewport or device
Required evidence type
Related non-defect item ID  # 該当する場合のみ
```

Challenge DefinitionとInstructor Answer Keyが参照する`BR-*` / `AC-*` / Spec sectionはCurrent `docs/spec/**`に存在しなければValidation Failureとする。

Spec変更でChallengeの意味が古くなった場合、Patch適用可能性だけで正常扱いしない。

### 7.13 Black-box Scored Challenge Isolation

#### Runtime提供原則

Scored Runnerへ**Build ArtifactのbytesやSource Treeを渡さない**。

外側のPreparation ProcessがBuild / Serve / Installを完了し、Runnerには以下だけを与える。

Web:

- 起動済みURL / Runtime endpoint
- `docs/spec/**`
- Learner Runbook / Charter
- 許可されたSeed / Test Control
- UI / DOM / Accessibility / Console等のRuntime Evidence Capability

Native:

- Boot済みEmulator / Simulator上で起動可能なApp
- `docs/spec/**`
- Learner Runbook / Charter
- 許可されたTest Control
- UI操作 / Screenshot / narrow log capability

Scored Runnerへ渡さないもの:

- Application Source
- Existing Test Source
- Source Map
- JS Bundle file access / response body inspection
- APK / IPA file access
- Arbitrary ADB shell / package extraction
- Challenge Patch Source
- Instructor Answer Key
- Defect List
- Instructor-only Test
- Evaluator Matching情報

Web RuntimeがSource MapやSource inspection経路を無効化できない場合、またはNative RuntimeがArtifact extractionを防げない場合、そのRunは練習には使えてもBlack-box Scored Resultとして扱わない。

### 7.14 Runner / Evaluator separation

```text
Black-box Runner / Orchestrator
  │  Answer Keyを読めない
  │
  ├─ Required Coverageを実施
  ├─ Atomic Finding確定
  └─ qa-findings.jsonをFreeze
            ↓
         Run終了
            ↓
Evaluator
  │  ここで初めてAnswer Keyを読む
  │
  ├─ Atomic Finding ↔ Answer Item Matching
  ├─ Coverage Evidence検証
  ├─ TP / FP / FN / TN / NE集計
  └─ evaluation.json生成
```

Runner / OrchestratorがAnswer Keyを参照できた場合、そのRunは`valid_for_scoring=false`とする。

EvaluatorはFrozen Findingを書き換えない。

### 7.15 Answer Key Item Contract

Answer Keyは採点可能な有限Item集合として定義する。

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

- 真のDefectと確認 → Answer Key /評価母集団を補正して再計算。
- Defectではない → FPとして確定。

Review未完了のまま最終Scored Resultを確定しない。

### 7.18 TP / FP / FN / TN / NE

評価単位をAtomic Finding / Answer Itemの対応で統一する。

#### Defect Item

- **TP**: 一意のAtomic FindingがDefect Itemへ正しくMatchしたもの。
- **FN**: Defect ItemにMatchするAtomic Findingがないもの。

#### Submitted Finding

- **FP**: どのDefect Itemにも正しくMatchせず、Product Defectとして提出された一意のAtomic Finding。
- `duplicate`、`invalid_non_atomic`、`review_needed`は別分類とし、最終評価前に扱いを確定する。

#### Non-defect Item

Non-defectは**実際に探索・観察したものだけ**評価する。

- **TN**: Related Coverage Itemが`completed`でEvidenceがあり、そのNon-defectをDefectとして誤報しなかったもの。
- **FP_non_defect**: Related Coverage Itemを実施したうえで、そのNon-defectをDefectとして誤報したもの。
- **NE (Not Evaluated)**: Related Coverage Itemが`not_completed`または`blocked`で、正常挙動を実際に評価していないもの。

NEをTNへ数えない。

### 7.19 Metric formulas

分母0は`null`とし、0点と同義にしない。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

FPRの分母には**exercised non-defect itemsだけ**を含める。NEはFPRから除外し、Coverageで未実施として反映する。

PrecisionはEvaluatorがDeduplicateしたunique Atomic Finding集合で計算する。

### 7.20 Instructor-defined Coverage Contract

Scored ChallengeのRequired Coverage SetはInstructorがChallenge Definitionで固定する。

Runnerは:

- Required Coverage IDを削除しない。
- Required Coverage IDを任意に減らさない。
- Additional exploratory coverageを追加してよい。

EvaluatorはChallenge DefinitionのRequired Coverage IDと`qa-findings.json.coverage.required_ids`が一致することを確認する。

Coverage Itemを`completed`にするには、最低限以下を満たす。

- 対象Role / Seed / Platform / Viewport等を実際に設定している。
- Mission / Observation Targetまで到達している。
- Required Evidence Referenceが存在する。

単なる自己申告だけで`completed`にしない。

### 7.21 Quality metric scoring

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
- 環境上2回目が不可能で理由とEvidenceが十分: 0.5
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

`blocked`はcompletedに数えないが、REPORTへ環境要因を明記する。

### 7.22 `evaluation.json` Contract

最低構造:

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "challenge_id": "<challenge_id>",
  "mode": "black-box",
  "valid_for_scoring": true,
  "matches": [],
  "counts": {
    "tp": 0,
    "fp": 0,
    "fn": 0,
    "tn": 0,
    "fp_non_defect": 0,
    "not_evaluated_non_defect": 0,
    "duplicates": 0,
    "invalid_non_atomic": 0
  },
  "metrics": {
    "recall": null,
    "precision": null,
    "false_positive_rate": null,
    "evidence_quality": null,
    "reproducibility": null,
    "severity_accuracy": null,
    "coverage": 0,
    "duplicate_rate": null
  }
}
```

既存`run.json` / Evaluation Contractと競合する場合は新規Schemaを乱立させず、既存Contractへ最小拡張する。

### 7.23 Challenge Validation

```text
Clean Source
  ↓
Challenge Patch / Setup適用
  ↓
Build / Install / ServeをRunner外で実施
  ↓
Scored Runtime起動
  ↓
Runner Workspace / Tool Scope作成
  ├─ Application Sourceなし
  ├─ Existing Test Sourceなし
  ├─ Source Map / JS Bundle inspectionなし
  ├─ APK / IPA file accessなし
  ├─ Patch Sourceなし
  └─ Instructor-only contentなし
  ↓
Spec / Answer Key Oracle Reference integrity確認
  ↓
Challenge-specific sanity check
```

意図的Defectにより通常Regressionが失敗する場合、通常Regression全PASSをChallenge Validation条件にしない。

---

## 8. Target implementation Waves

### Wave 0: Implementation Start Gate / Rebaseline

- [ ] PR #14のmergeを確認する。
- [ ] PR #13のmergeを確認する。
- [ ] 他依存PRを確認する。
- [ ] 最新`main`からImplementation Branchを作る。
- [ ] AGENTS / PROJECT_CONTEXT / ADR / CI / Native / Curriculumを再Mappingする。
- [ ] `codex-safe` / `readonly` presetのCurrent Contractを再確認する。
- [ ] Existing Run / Evaluation schemaを再確認する。
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

### Wave 2: Markdown Specification SSOT

- [ ] `docs/spec/README.md`を作る。
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
- [ ] Current Spec内BR = Active BRのContractをDocument化する。
- [ ] BR IDを付与する。
- [ ] AC IDを付与する。
- [ ] AC → 1件以上のBR Referenceを付与する。
- [ ] BR Coverage / `Acceptance: N/A`を確認する。
- [ ] Required 5 Section / Conditional SectionをTemplateへ反映する。
- [ ] `change-process.md`を作る。
- [ ] Known Deviation解消Lifecycleを記載する。
- [ ] Unresolved Specification解消Lifecycleを記載する。
- [ ] Feature Spec Templateを作る。
- [ ] AGENTS / Planning / Reviewから変更対象Specを事前確認するよう接続する。
- [ ] Behavior変更時のSpec / AC更新漏れをCode Review観点へ追加する。

### Wave 4: Markdown → Static HTML

- [ ] `docs/spec/**/*.md`だけをSourceとする。
- [ ] Raw HTMLを既定無効にできる軽量Markdown Parserを選定する。
- [ ] `## Navigation`をNavigation Sourceとする。
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
- [ ] Challenge Definition / Answer KeyのSpec Reference integrity。
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
- [ ] Existing `readonly` presetを標準探索経路として接続する。
- [ ] Parent / OrchestratorがRun Artifactを保存する。
- [ ] QA開始前 / 終了後Working Tree Snapshot Contractを実装する。
- [ ] Charter Contractを実装する。
- [ ] Atomic Finding Contractを実装する。
- [ ] `qa-findings.json` Versioned Contractを実装する。
- [ ] Coverage Resultを`qa-findings.json`へ構造化する。
- [ ] Known Deviation / Unresolved Spec処理を実装する。
- [ ] Severity / Confidence / Duplicate / Reproduction基準を定義する。
- [ ] Tool / Environment / Product Failureを分類する。
- [ ] Web CapabilityをPlaywright MCPでDry Runする。
- [ ] Native Capability ContractをDocument化する。

### Wave 7: Challenge / Black-box Runtime / Evaluation

- [ ] Learner-safe Challenge Definitionを作る。
- [ ] Instructor Answer Key Item Contractを作る。
- [ ] Challenge Definitionへ`spec_refs`とRequired Coverage Setを定義する。
- [ ] Build / Serve / InstallをRunner外で行うScored Runtime生成方法を作る。
- [ ] Scored RunnerへArtifact bytes / Source Treeを渡さない。
- [ ] Web Source Map / JS Bundle inspection経路をScored modeで除外する。
- [ ] Native APK / IPA file access / arbitrary ADB shellをScored modeで除外する。
- [ ] Gray-box Training Pathを別途定義する。
- [ ] Scored Runner / Evaluatorを分離する。
- [ ] RunnerがFinding Freeze後にEvaluatorを開始する。
- [ ] Required Coverage IDをRunnerが縮小できないことを検証する。
- [ ] Challenge Patch / SetupをDisposable環境へだけ適用する。
- [ ] Challenge Validation / Sanityを追加する。
- [ ] Defect / Non-defect Itemを用意する。
- [ ] Atomic Finding ↔ Answer Item Matching Ruleを実装する。
- [ ] Duplicate / invalid_non_atomic / review_neededを分離する。
- [ ] TP / FP / FN / TN / NE分類を実装する。
- [ ] 未探索Non-defectをTNへ数えない。
- [ ] Recall / Precision / FPR / Coverage計算を実装する。
- [ ] Evidence / Reproducibility / Severity採点を実装する。
- [ ] `evaluation.json` Versioned Contractを実装する。
- [ ] Basic / Intermediate / Advancedを用意する。
- [ ] Functional / Role / State / Error / Responsive / Accessibility / UI/UX / Non-defectを混ぜる。

### Wave 8: Curriculum integration

- [ ] Curriculum READMEへSpecification / AC / Agentic QAを追加する。
- [ ] Part 1前半へCurrent Specを読む工程を追加する。
- [ ] Test DesignへBR / AC → Risk → Test Caseを追加する。
- [ ] 保守モジュールへSpec / AC / Test同期を追加する。
- [ ] 新規Agentic QA ModuleをPart 1後半へ追加する。
- [ ] 既存Capstoneを後ろへ移動し参照番号を更新する。
- [ ] Playwright MCP / Seed / Charter / Oracle / Atomic Finding / Evidence / False Positive / Regression還元を教材化する。
- [ ] Black-box DiscoveryとGray-box Investigationの違いを教材化する。
- [ ] Native Agentic QAはCapability Contract + Android標準で説明する。
- [ ] Challenge評価でSource / Artifact / Answer Key隔離の意味を説明する。
- [ ] Instructor-defined CoverageとNon-defect評価を教材化する。
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
- [ ] Finding 0件でもCoverage / Evidence /終了理由が残ることを確認する。
- [ ] QA前後Snapshot比較でQAによる追加Source差分0を確認する。
- [ ] Android Capabilityが利用可能ならNative Agentic QAをDry Runする。
- [ ] Android Capability不足なら未実施を明記し、Maestro PASSで代替しない。
- [ ] Scored RunnerへApplication Source / Existing Test / Source Map / Artifact bytes / Patch Source / Answer Keyが渡らないことを確認する。
- [ ] Scored Web RunnerがJS Bundle content inspectionできないことを確認する。
- [ ] Scored Native RunnerがAPK / arbitrary ADB shellへアクセスできないことを確認する。
- [ ] Challengeを最低1件Black-box End-to-Endで評価する。
- [ ] Required Coverage SetをRunnerが縮小できないことを確認する。
- [ ] Non-defect未探索ケースがTNではなくNEになることを確認する。
- [ ] Atomic Findingが最大1 Defect ItemへだけMatchすることを確認する。
- [ ] Frozen FindingをEvaluatorが変更しないことを確認する。
- [ ] TP / FP / FN / TN / NEと各Metricが再計算可能であることを確認する。
- [ ] Challenge / Answer KeyのSpec Reference integrityを確認する。
- [ ] `pnpm run verify`。
- [ ] Required GitHub Actions成功を確認する。
- [ ] Generated HTMLをHuman視点で確認する。
- [ ] Spec / ACをAIエージェントに読ませOracle解釈を確認する。
- [ ] PR差分へProduct Fix / unrelated Refactorが混入していないことをReviewする。

---

## 9. Validation plan

### 9.1 Static Specification

- Markdownlint
- Relative Link
- BR / AC ID uniqueness
- AC → BR integrity
- BR Acceptance coverage
- Required 5 Section
- Conditional Section非強制
- Challenge / Answer Key Spec Reference integrity
- Generated HTML Build

### 9.2 Generator

- Stable Heading Anchor
- `## Navigation`からのNavigation導出
- Relative Link変換
- Raw HTML Safety
- Table / Code block保持
- Source Markdown不変
- Deterministic regeneration

### 9.3 Agentic QA

- Specを読まずに開始しない。
- Known Deviationを新規Defect化しない。
- Unresolved Specificationを確定Defect化しない。
- Charterが必要Fieldを持つ。
- Oracle ReferenceなしFindingを完成扱いしない。
- FindingがAtomicである。
- Reset可能Findingで再現する。
- Existing `readonly` presetが標準探索経路として使われる。
- QA前後Baseline Snapshotを比較し、QAによる追加Source変更0を確認する。
- Tool / Environment FailureをProduct Defectへ分類しない。
- Discovery中にSource / Existing Testから答えを先取りしない。

### 9.4 Run Artifact

- `qa-findings.json`に`schema_version`がある。
- `run_id` / `charter_id`からRunを追跡できる。
- Oracle / Evidence / Reproduction / Statusを機械処理できる。
- Required Coverage ID、status、Evidenceを機械処理できる。
- Challenge時の`evaluation.json`からTP / FP / FN / TN / NEとMetricを再計算できる。

### 9.5 Black-box Challenge Isolation

- Scored Runner WorkspaceにApplication Sourceがない。
- Existing Test Sourceがない。
- Source Mapがない。
- JS Bundle file / response-body inspection経路がない。
- APK / IPA file accessがない。
- Arbitrary ADB shellがない。
- Patch Sourceがない。
- Instructor Answer Keyがない。
- Scored RunnerがGitHub Connector / Search等からInstructor情報へアクセスできない。
- Build / Serve / InstallはRunner外で完了している。
- RunnerとEvaluatorが分離されている。
- Finding Freeze後だけEvaluatorがAnswer Keyを読む。

### 9.6 Scoring correctness

- 1 Findingが最大1 Defect ItemへMatchする。
- 同一DefectのDuplicateが追加TPにならない。
- Non-atomic FindingをTPへ分解しない。
- 未探索Non-defectがTNにならない。
- Exercised Non-defectだけがTN / FP_non_defect判定対象になる。
- NEはFPR分母から除外されCoverageで反映される。
- Required Coverage SetはInstructor定義でRunnerが縮小できない。
- Coverage completionにEvidenceが必要である。
- Challenge外Unexpected Findingを自動FP化しない。
- 分母0Metricを`null`として扱う。

### 9.7 Curriculum

- Part 1 / Part 2 Link / Number整合。
- Test Case ID / UI Test ID / BR / ACの用語整合。
- Agentic QAをAutomationの代替として説明しない。
- Atomic Findingの考え方が教材とWorkflowで一致する。
- Black-box / Gray-boxの目的を混同しない。
- Learner本文にAnswer Keyを露出しない。
- PR #14後のNative / iOS CIの事実と整合する。

### 9.8 Product Regression

Package / Generator / CI変更を伴うため既存`verify`とRequired CIを通す。

実行していない検証をPASS扱いしない。

---

## 10. Risks

### R1. 1PRのScopeが大きい

**Risk:** Specification、Generator、CI、Agentic QA、Challenge、Curriculumを1PRへ含めるためReview負荷が高い。

**Mitigation:** WaveとLogical Commitを分離し、Product Feature改修を混ぜない。各Wave完了時にScope Reviewする。

### R2. 現状Implementationを誤って仕様化する

**Risk:** Bugや偶然の挙動をSpecへ固定する。

**Mitigation:** Docs / ADR / History / Test / Codeを横断し、不明なものはUnresolved Specificationへ分離する。

### R3. MarkdownとCodeの二重管理

**Risk:** Seed / Role / Route / Token等が二重管理になる。

**Mitigation:** Normative Behavior SSOTとExecutable Canonical Sourceを責務分離し、低レベル値を無目的に複製しない。

### R4. Validator過剰設計

**Risk:** Markdownが疑似Database化する。

**Mitigation:** 機械必須は最小Grammar、BR / AC ID / Reference、Navigation、Required 5 Section程度に限定する。

### R5. HTML Platform肥大化

**Risk:** Documentation Framework整備が主目的化する。

**Mitigation:** Lightweight Parser + Static HTML + CSS + Navigationに限定する。Hosting / Search / CMSはNon-goal。

### R6. AI QA False Positive

**Risk:** AIが独自期待を作る。

**Mitigation:** Oracle Reference、Known Deviation Check、Reproduction、Evidence、Confidenceを必須化する。

### R7. QA WorkerがSourceを変更する

**Risk:** 探索結果が自己修正によって汚染される。

**Mitigation:** Existing `readonly` presetを標準とし、Before / After SnapshotでQAによる追加差分0を確認する。

### R8. Black-box RunnerへのImplementation leakage

**Risk:** Sourceを除外してもJS Bundle、Source Map、APK等から実装を読める。

**Mitigation:** Artifact bytesはRunnerへ渡さず、Runner外でServe / Install済みRuntimeだけを提供する。Source Map / bundle inspection / arbitrary ADB shell等もScored modeでは除外する。

### R9. Runner / Evaluatorの情報混線

**Risk:** Finding作成AgentがAnswer Keyを見た状態で自己採点する。

**Mitigation:** Finding FreezeまではRunnerだけ、Answer KeyはRun終了後のEvaluatorだけが読む。

### R10. TP / FPの計数単位が混ざる

**Risk:** TPをDefect Item単位、FPをFinding単位で数えるとPrecisionが数学的に破綻する。

**Mitigation:** 1 Finding = 1 deviation、1 Finding → 最大1 Defect Itemに固定する。Duplicate / non-atomicを別分類する。

### R11. 未探索正常ケースでFPRが良化する

**Risk:** 未探索Non-defectまでTNにすると、何もしないAgentが低FPRになる。

**Mitigation:** Non-defectはTN / FP_non_defect / NEの3状態とし、exercised itemだけをFPR分母へ入れる。未実施はCoverageへ反映する。

### R12. Coverage自己申告のGaming

**Risk:** AgentがCoverage denominatorを小さく宣言すれば100%にできる。

**Mitigation:** Instructor-defined Required Coverage SetをChallenge Definitionで固定し、Runnerは縮小不可とする。完了にはEvidenceを要求する。

### R13. Challenge / Spec drift

**Risk:** Product Specが変わっても古いChallenge / Answer Keyが残り、誤ったOracleで採点する。

**Mitigation:** Challenge Definition / Answer KeyのSpec Reference integrityをCIで検証する。意味変更時はChallenge更新を要求する。

### R14. NativeをAgentic QAと誤認する

**Risk:** Maestro Regressionを実行しただけで探索QA完了と扱う。

**Mitigation:** Native Capability Contractを定義し、Capability不足時は未実施と明記する。

### R15. CurriculumがPR #14後の現状とずれる

**Risk:** PR #13のNative / iOS CI説明がマージ直後から古くなる。

**Mitigation:** Wave 0でPR #14→#13後をRebaselineし、Wave 8でCurrent Productへ同期する。

### R16. Known Deviation / Unresolved SpecのLifecycle不整合

**Risk:** 解消済みKnown Deviationが残りRegressionを抑制する、または確定済みUnresolved Specが未確定扱いされ続ける。

**Mitigation:** Known DeviationはActive-only。Unresolved Specificationは確定後Feature Specへ統合して一覧から削除する。

---

## 11. Open questions

現時点でImplementationを開始できない未回答のBlocking Questionはない。

Wave 0で以下が判明した場合はOpen Questionへ追加し、必要ならOwner Decisionを求める。

- PR #14 / #13または後続PRによって本Planの中核ContractとCurrent Repositoryが衝突する。
- Product意図をDocs / ADR / History / Code / Testから確定できない。
- Current Harnessで`readonly` + Browser / Device Capabilityを成立させられない。
- Black-box RuntimeでSource / Artifact / Answer Key隔離を保証できない。
- Scored Web RuntimeでSource Map / Bundle inspectionを十分に制限できない。
- Scored Native RuntimeでAPK access / arbitrary ADB shellを十分に制限できない。
- Existing Run / Evaluation schemaと本PlanのVersioned Artifact Contractを最小拡張で両立できない。

Blocking Questionを推測で埋めて実装を続けない。

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
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
docs/curriculum/test-automation/**
training/agentic-qa/**       # 実PathはWave 0で確定
```

これは将来のImplementation PRのScopeであり、現在のPlan Branchでは変更しない。

### Generated Artifact

```text
output/spec-site/**
.artifacts/**
```

原則Git管理しない。

### Durable Documentation

- Current Product Specification
- Business Rule / Acceptance Criteria
- Specification Change Process
- Feature Spec Template
- Agentic QA Workflow Reference
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
                  │ docs/spec/**/*.md           │
                  │ Normative Behavior SSOT     │
                  └──────────────┬──────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
          Human / HTML      Developer / QA     AI Agent
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
                    ┌────────────┴────────────┐
                    ▼                         ▼
          Deterministic Automation      Agentic QA
       Playwright / Maestro / lower     Web / Native Capability
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                        Evidence / Finding
                                 │
                                 ▼
                    Accepted Regression / Feedback

Black-box Scored Challenge
Preparation Process
  ├─ Build / Serve / Install
  └─ Runtime only
        │
        ▼
Read-only Scored Runner
  × Source
  × Artifact bytes
  × Answer Key
        │
        ▼
Atomic Findings + Coverage Evidence
        │
        ▼
Frozen qa-findings.json
        │
        ▼
Separate Evaluator + Answer Key
        │
        ▼
evaluation.json

Executable Canonical Sources
Seed / Role / Route / Token / Config
        ↑
        └──── Specから意味・Contractを参照しつつRuntimeで利用
```

---

## 16. 実装開始時の原則

- 最初にPR #14、PR #13、その他依存PRのMerge状態を確認する。
- 最新`main`の事実を本Planより優先し、Wave 0でPlanを同期する。
- Goal / SSOT責務 / Atomic Finding / Instructor-defined Coverage / Black-box Source・Artifact・Answer Key隔離 / QA Write Boundary / Runner-Evaluator分離等の中核Contractを暗黙に弱めない。
- 最新Repositoryと中核Contractが衝突する場合はOwner Decisionを求める。
- 目的は文書量を増やすことではなく、人間とAIが同じ期待値からQAできる状態を作ることである。
- Markdownは人間にもAIにも読みやすい自然文を優先する。
- MetadataやValidatorは必要最小限にする。
- Generated HTMLはPresentation Layerであり、直接編集しない。
- Agentic QAはDeterministic Automationの代替ではない。
- Black-box Scored ChallengeとGray-box Trainingを混同しない。
- 未探索正常ケースを良い評価として扱わない。
- Source / Artifact / Answer KeyへアクセスできたRunを探索能力の高得点として扱わない。
