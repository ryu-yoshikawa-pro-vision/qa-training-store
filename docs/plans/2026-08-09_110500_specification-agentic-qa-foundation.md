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

## 1. 依頼概要

### 依頼内容

- 現在進行中のProduct / Native関連PRを先にマージする。
- その後、テスト自動化カリキュラムPR #13をマージする。
- その最新`main`を基準にScenario Shopの現在仕様を棚卸しする。
- Markdownを人間・AIエージェント共通の**Normative Product Behavior SSOT**とする。
- 仕様更新手順、Business Rule、Acceptance Criteria、Traceabilityを整備する。
- Markdownから人間向け静的HTMLを機械生成する。
- SpecificationをTest Oracleとして利用するAIエージェント探索QAを整備する。
- AI QA用Challenge、Instructor Answer Key、評価方法を整備する。
- AIエージェントQAをテスト自動化カリキュラムへ組み込む。
- 上記を複数PRへ分割せず、1本のImplementation PRとして完了させる。

### 背景

現在のRepositoryには、Product仕様に相当する情報が以下へ分散している。

- `README.md`
- `/guide`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/**`
- Domain / Application実装
- Seed Metadata
- Playwright / Maestro / Unit / Integration / Contract等のTest
- CI Workflow

既存RepositoryはSeed / Reset / Test Clock / Test Control / Inspection / Evidence等のTestabilityが高い。一方で、QAが「何が正しい期待挙動か」を確認するためのNormative Product Specificationが一箇所に整理されていない。

AIエージェントQAでは、仕様が分散したままだと以下が起きやすい。

- 実装の現状を誤って仕様とみなす。
- 既存Testを仕様の正本として扱う。
- Product意図が不明な箇所をAIが補完する。
- Known Deviationを新規Defectとして重複報告する。
- UI/UX上許容されているPlatform差をFalse Positiveとして報告する。

そのため、AI QAを追加する前にProduct Specificationの正本、変更手順、Acceptance Criteriaを確立する。

---

## 2. ゴール / 完了条件

### ゴール

Scenario Shopの現在仕様をMarkdownのNormative Product Behavior SSOTとして確立し、人間、Developer、QA、AIエージェントが同じOracleを参照できる状態を作る。

そのうえで、SpecificationからAcceptance Criteria、Risk / Test Design、Deterministic Automation、Agentic Exploratory QA、Finding、Regressionへ一貫して接続できるようにする。

### 完了条件（DoD）

#### Implementation Start Gate

- [ ] 既知の依存PRとしてNative Phase 2後半PR #14が`main`へマージ済みである。
- [ ] カリキュラムPR #13が、その後`main`へマージ済みである。
- [ ] 実装開始時点で他に依存するOpen PRがある場合、その影響を確認済みである。
- [ ] Implementation Branchを最新`main`から作成している。
- [ ] PR #14によるNative Scope / Android / iOS CI変更と、PR #13の記述の整合を再確認している。
- [ ] PR #13内にPR #14マージ後の現状と不整合な記述があれば、今回のCurriculum更新Scopeで修正対象としている。

#### Specification

- [ ] README、Guide、PROJECT_CONTEXT、ADR、Seed、Application、Test、CI、Native実装を棚卸ししている。
- [ ] 仕様情報の重複、古い文書、Implementation Deviation、未確定事項を分類している。
- [ ] `docs/spec/README.md`がCurrent Product Specificationの唯一の入口として機能する。
- [ ] Product Scope、Role / Permission、Business Rule、State / Transition、Web / Native差分、UI/UX Contract、主要Feature仕様がMarkdownで明文化されている。
- [ ] Markdownを**Normative Product Behavior SSOT**と明記している。
- [ ] Runtimeで利用するSeed Metadata、Role、Route、Design Token、Config等の**Executable Canonical Source**との責務境界を明記している。
- [ ] Generated HTML、Application実装、既存TestをNormative Product Behavior SSOTとして扱わない。
- [ ] Executable Canonical Sourceの低レベル値をMarkdownへ無目的に複製しない。

#### Business Rule / Acceptance Criteria

- [ ] Business Ruleへ安定ID`BR-*`を付与している。
- [ ] Acceptance Criteriaへ安定ID`AC-*`を付与している。
- [ ] Test Case ID、UI Test ID / `testId`、BR、ACを別Namespaceとして扱っている。
- [ ] BR / ACのMarkdown最小Grammarが明文化されている。
- [ ] Current Specificationに存在するBRをActive BRとして扱う定義がある。
- [ ] `BR-*` / `AC-*`の重複を機械検証できる。
- [ ] ACから参照する1件以上のBRの存在を機械検証できる。
- [ ] Active BRは、1件以上のACから参照されるか、Acceptance Criteriaを直接持たない理由を明記している。
- [ ] Feature SpecのRequired Section / Conditional Sectionが明確である。

#### Change Process

- [ ] 通常Feature変更時のSpec更新順を文書化している。
- [ ] 「既存仕様へのBug Fix」と「Product Specification変更」を区別している。
- [ ] 緊急修正時のSpec同期ルールを定義している。
- [ ] Spec / Implementation / Testが矛盾した場合のDecision Ruleを定義している。
- [ ] Product意図が確定できない項目は、AIや実装の現状で勝手に埋めない。
- [ ] Known Deviation解消時の削除 / Regression同期手順が定義されている。
- [ ] Unresolved Specification確定時のFeature Spec統合手順が定義されている。

#### Human-facing HTML

- [ ] `docs/spec/**/*.md`から静的HTMLを生成できる。
- [ ] HTMLはMarkdownから一方向生成する。
- [ ] Generated HTMLを直接編集しない。
- [ ] HTMLはNavigation、見出しAnchor、Page TOC、Table、Code block、Responsive表示を備える。
- [ ] Navigationは`docs/spec/README.md`の明示的な`## Navigation` Sectionから導出する。
- [ ] Generated HTMLを削除してもMarkdownから完全再生成できる。
- [ ] 初期DoDに外部Hosting、認証、全文検索、CMSを含めない。

#### Specification Validation / CI

- [ ] Markdownlintが成功する。
- [ ] Relative Link validationが成功する。
- [ ] BR / AC ID uniquenessが成功する。
- [ ] BR / AC reference integrityが成功する。
- [ ] BR Acceptance coverageが成功する。
- [ ] Feature Required Section validationが成功する。
- [ ] HTML Buildが成功する。
- [ ] Specification Validationが`pnpm run verify`とRequired CIへ接続される。
- [ ] Generated HTMLをCI ArtifactとしてReviewerが確認できる。

#### Agentic QA

- [ ] Code Review / Repairとは別のAgentic Exploratory QA Entry Point / Skill / Workflowがある。
- [ ] AI QA開始前に対象Spec、BR / AC、Known Deviation、Unresolved Specification、Role、Seed、Platform、Viewport、Charterを固定する。
- [ ] AI QAではSpecificationをOracleとして参照する。
- [ ] 未確定仕様をNormative Oracleとして扱わない。
- [ ] Known Deviationを新規Defectとして重複報告しない。
- [ ] DiscoveryとInvestigationの情報境界を定義している。
- [ ] QA探索Workerは既存Harnessの`readonly` presetを標準経路として利用する。
- [ ] QA成果物の保存は探索WorkerではなくParent / Orchestratorが担当できる設計とする。
- [ ] QA開始直前と終了直後のWorking Tree Snapshotを比較し、**QA実行による追加差分が0**であることを確認する。
- [ ] FindingはOracleとEvidenceに基づく。
- [ ] Findingの再現、重複確認、Severity、Confidence、停止条件を定義している。
- [ ] Web Agentic QAの標準CapabilityをPlaywright MCPで満たせる。
- [ ] Native Agentic QAは特定Tool名ではなく必要Capabilityを定義し、Androidを標準対象とする。
- [ ] Nativeで必要Capabilityが満たせない場合、Maestro Regressionの成功だけでAgentic QA実施済みとみなさない。
- [ ] AI QAを初期Required CI Gateにしない。

#### QA Run Artifact

- [ ] Charter、Finding、Coverage、終了理由をRun Artifactへ保存できる。
- [ ] `qa-findings.json`はVersioned JSON Contractを持つ。
- [ ] Challenge評価時の`evaluation.json`もVersioned JSON Contractを持つ。
- [ ] Raw Screenshot / Trace / MCP Log等の大容量・一時Evidenceは既存Artifact方針に従いGit管理対象外へ分離する。

#### Challenge / Evaluation

- [ ] Challenge DefinitionとInstructor Answer KeyをRepository内でReview可能に管理する。
- [ ] **Black-box Scored Challenge**と**Gray-box Training / Investigation**を区別している。
- [ ] Black-box Scored ChallengeのAgentにはApplication Sourceを渡さず、Built Artifact / Runtime、`docs/spec`、Learner Runbook、許可されたTest Controlだけを提供する。
- [ ] Gray-box TrainingではSource参照を許容するが、Black-box Recall / Precisionと同じスコアとして扱わない。
- [ ] Learner / Agentへ渡すDisposable WorkspaceにはInstructor Answer Keyを含めない。
- [ ] Scored Challenge RunではFilesystemだけでなくGit History、GitHub Connector、Repository Search、External Search、Prompt Context、Hidden Test Output等からAnswer Keyへアクセスできないことを評価成立条件とする。
- [ ] Scored Runner / OrchestratorはAnswer Keyを参照しない。
- [ ] Runnerが`qa-findings.json`を確定した後、別EvaluatorだけがAnswer Keyを読み、Frozen Findingを採点する。
- [ ] Answer Keyへアクセス可能なRunはScored Resultとして扱わない。
- [ ] 意図的Defectを通常Production Runtimeへ恒久Feature Flagとして混入させない。
- [ ] ChallengeはDisposable Training CopyへPatch / Setupとして適用する。
- [ ] Challenge適用後も対象Appが起動・探索可能であることを検証する。
- [ ] Challenge Bundle生成時にInstructor-only contentが除外されていることを検証する。
- [ ] Defect / Non-defect itemとFindingのMatching Ruleが定義されている。
- [ ] TP / FP / FN / TNの分類とRecall / Precision / False Positive Rateの計算式が定義されている。
- [ ] Evidence Quality、Reproducibility、Severity Accuracy、Coverageの採点Ruleが定義されている。

#### Curriculum

- [ ] Specification / Acceptance Criteriaの読み方をカリキュラムへ追加する。
- [ ] BR / AC → Risk → Test Case → Automationの関係を追加する。
- [ ] Agentic QAをPart 1後半へ追加する。
- [ ] Black-box探索とGray-box調査の違いを教材化する。
- [ ] Part 1 CapstoneへValidated FindingとRegression Feedbackを追加する。
- [ ] Part 2の変更管理 / PR Review / Integration DesignへSpec同期とAI QA運用を接続する。
- [ ] PR #14マージ後のNative Scope / iOS CIを反映し、PR #13時点の前提が古い場合は更新する。

#### Final

- [ ] 既存Product Behaviorを意図せず変更していない。
- [ ] Product Bug修正や無関係なRefactorが混ざっていない。
- [ ] `pnpm run verify`が成功する。
- [ ] GitHub Actions Required CIが成功する。
- [ ] Implementation PRだけで全DoDがReview可能であり、別実装PRを前提にしない。

---

## 3. Current understanding

### 現在の主要Entry Point

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

### 既知の依存変更

PR #14はNative Phase 2後半として、Login / Session / Account / Address / Checkout / Payment / Order / Review、Android / iOS Maestro、iOS Simulator正式CI Gate等を追加・変更する予定である。

そのため、本Planの実装開始時には少なくとも以下を再Baselineする。

- Native Product Scope
- Native Seed / Test Control
- Native Route / Role / State
- Android CI
- iOS CI
- Maestro Flow
- Native Production-validation
- Curriculum内のNative説明

PR #13はPR #14より前のRepository状態を前提に作成されているため、PR #14→PR #13の順でマージした後、Curriculumの事実記述が古くなっていないか必ず確認する。

### 現在の問題

```text
README / Guide / PROJECT_CONTEXT / ADR / Code / Test
        ↓
仕様相当情報が分散
        ↓
Human / QA / AIが個別に期待値を解釈
        ↓
Test / Review / QAでOracleが揺れる
```

### 目標

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

## 4. 仕様の正本モデル

### 4.1 Normative Product Behavior SSOT

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

### 4.2 Executable Canonical Sources

Runtime / Build / Test Harnessが機械的に利用する値は、その責務を持つCodeをExecutable Canonical Sourceとして維持する。

対象例:

- Seed Scenario ID / Metadata
- Role / StatusのType / Enum / Union
- Route definitions
- Design Token
- Build / Runtime Config
- App ID
- Test ID / Accessibility Label

Markdownはこれらの**意味・期待・契約**を定義するが、すべての低レベル値を無目的に複製しない。

仕様上Public Contractとして同じ値をMarkdownにも記載する必要がある場合のみ重複を許し、可能な範囲でValidatorまたはTestにより整合を確認する。

### 4.3 Non-SSOT

以下は仕様判断の参考・Evidenceにはなるが、Normative Product Behavior SSOTを暗黙に上書きしない。

- Application実装
- Existing Test
- Generated HTML
- README
- Guide
- PROJECT_CONTEXT
- ADR

ADRは「なぜその判断をしたか」を残すDecision Historyであり、Current Specと矛盾する場合はCurrent SpecまたはADRの同期漏れとして扱う。

---

## 5. Key abstractions

- **Product Specification**: どうあるべきかを定義するNormative Behavior。
- **Business Rule**: Feature / Role / Stateを跨いでも維持されるRule。`BR-*`。
- **Acceptance Criteria**: Rule / Featureを外部からどう確認できるか。`AC-*`。
- **Test Case**: Risk / Conditionから導出した検証項目。例`CART-001`。
- **UI Test ID / testId**: UI ElementをAutomationから識別するIdentity。
- **Seed Scenario**: 再現可能な初期状態。Executable metadataはCode、意味と期待はSpecで扱う。
- **Known Deviation**: Normative Specは確定しているがCurrent Implementationが異なる、**現在Activeな**既知差異。
- **Unresolved Specification**: Product意図が未確定で、Normative Oracleとして利用できない項目。
- **Test Oracle**: Expected判断の根拠。
- **Agentic QA Charter**: 探索対象、Risk、Role、Seed、Platform、Viewport、Mission、Stop Conditionを固定する単位。
- **Agentic QA Finding**: OracleとEvidenceを伴う再現可能な観測結果。
- **Black-box Scored Challenge**: SourceやAnswer Keyを見ずにUI / RuntimeとSpecから探索能力を評価するChallenge。
- **Gray-box Training / Investigation**: Source / Existing Test参照を許容し、原因調査やRegression判断も学ぶ非Black-box評価モード。

---

## 6. Assumptions / Non-goals / Blocking questions

### Assumptions

- Future ImplementationはPR #14とPR #13マージ後に開始する。
- Implementationは最新`main`から別Branchを作る。
- 実装内容は1本のPRで完結させる。
- Markdown SpecificationとGenerated HTMLを別管理しない。
- Git HistoryをVersion Historyとして使い、手動Document Version番号を原則導入しない。
- HTMLは初期段階ではCI ArtifactとLocal Buildを標準とする。
- AI QAはRequired CI Gateにしない。
- AI QA Findingは探索中に自動修正しない。
- Current Repositoryに存在する`codex-safe`の`readonly` presetをAgentic QAの標準Read-only経路として再利用する。Wave 0で当該Contractが変更・削除されていた場合のみ再設計する。

### Non-goals

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

### Blocking questions

実装開始後、以下の場合のみOwner Decisionを求める。

1. Docs / ADR / Code / Test / Historyを照合してもProduct意図を確定できない。
2. Normative Specを確定すると既存Product BehaviorのBreaking Changeが必要になる。
3. ChallengeをProduction Pathへ混入させなければ教材が成立しない。
4. Human向けHTMLに外部Hosting / 認証が必須と判明する。
5. Agentic QAに必要なCapabilityを現在利用可能なToolで満たせない。
6. Black-box Scored ChallengeでSource / Answer Key隔離を保証できない。

未確定事項は推測で実装せず`Unresolved Specification`として分離し、該当範囲のAI QAをNormative判定対象から外す。

---

## 7. 影響範囲 / Files to inspect

### Repository / Product Context

- `README.md`
- `AGENTS.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/**`
- `docs/reference/**`
- `docs/history/**`の関連履歴

### Product / Rule / State

- `src/domain/**`
- `src/application/**`
- `src/seeds/**`
- Role / Permission definitions
- Route definitions
- Cart / Checkout / Payment / Order / Review / Admin Rule
- Design Token / Responsive / Accessibility関連実装

### QA / Automation

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
- Existing evaluation / run artifact schema

### CI / Build

- `package.json`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- Markdownlint / Prettier / ESLint設定

### Curriculum

- `docs/curriculum/test-automation/README.md`
- `00_learning-design.md`
- `01_spreadsheet-test-design.md`
- `part1/**`
- `part2/**`

---

## 8. Target Specification structure

初期構成は以下を基準とする。最新Product Scopeに応じてFeature Fileを調整するが、階層を過剰に深くしない。

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

---

## 9. Markdown最小Grammar

### 9.1 Navigation

`docs/spec/README.md`に以下の明示Sectionを設ける。

```markdown
## Navigation

- [Product Scope](./product-scope.md)
- [Roles and Permissions](./roles-and-permissions.md)
- [Cart](./features/cart.md)
```

HTML Generatorは`## Navigation`配下のMarkdown Link ListだけをNavigation Sourceとして読む。

本文中の任意ListをNavigationとして推測しない。

### 9.2 Business Rule

```markdown
### BR-CART-001 — Cart数量上限

Cart数量は、Product仕様で定義された購入可能上限を超えてはならない。
```

**Current Specificationに存在する`BR-*`見出しはActive BRとして扱う。**

廃止したBRをCurrent Spec内へStatus付きで残してActive / Inactive管理する仕組みは初期版では作らない。廃止履歴はGit Historyで追跡する。

### 9.3 Acceptance Criteria

単一BRを参照する例:

```markdown
#### AC-CART-001 — 上限値を受け入れる

Related BR: `BR-CART-001`

Given ...
When ...
Then ...
```

複数BRを参照する例:

```markdown
#### AC-CHECKOUT-003 — 注文確定前に購入条件を再検証する

Related BR: `BR-CART-004`, `BR-PAYMENT-002`

...
```

`Related BR:`は1件以上のBacktick囲みBR IDをComma区切りで列挙する。

Given / When / Thenは有効な表現手段だが、すべてのACへ強制しない。期待結果を明確に検証可能な自然文でもよい。

### 9.4 BR without direct AC

Active BRが直接Acceptance Criteriaを持たない場合のみ、BR Section内へ以下を明記する。

```text
Acceptance: N/A — <直接ACを持たない理由>
```

Validatorは、Active BRが少なくとも1つのACから参照されるか、`Acceptance: N/A`を持つことを確認する。

### 9.5 ID rule

```text
BR-<AREA>-NNN
AC-<AREA>-NNN
```

- IDは一度利用した意味から別Requirementへ再利用しない。
- 廃止後も番号を使い回さない。
- Test Case IDと分離する。
- UI Test ID / `testId`と分離する。
- ID Grammarを増やしすぎない。

---

## 10. Oracle priority / Deviation handling

Human QA / AI QAのExpected判断を以下で統一する。

1. Current `docs/spec/**`のNormative記述
2. 同Spec内のBR / AC
3. `known-deviations.md`によるCurrent Implementationとの差異情報
4. ADRによるDecision History
5. Application / Seed / Test / README / GuideはEvidence / Implementation Reference

### 10.1 Known Deviation

Specが確定しておりCurrent Implementationが異なる場合はKnown Deviationとする。

`known-deviations.md`には**現在ActiveなDeviationのみ**を保持する。解消済みDeviationを履歴目的で残し続けず、解消履歴はGit Historyと修正PR / Regressionから追跡する。

Agentic QAでActive Known Deviationを再現した場合は、新規Findingとして重複登録せず以下のように扱う。

```text
Known deviation reproduced
Reference: <known-deviations section>
```

Known Deviationを修正するPRでは以下を同一変更として扱う。

```text
Implementation修正
  ↓
必要なRegression追加 / 更新
  ↓
known-deviations.mdから該当Active Entryを削除
  ↓
AI QAのKnown Deviation入力から除外
```

これにより、将来同じRegressionが再発した場合に古いKnown Deviationによって新規Findingが抑制されることを防ぐ。

### 10.2 Unresolved Specification

Product意図が未確定な範囲は`unresolved-specifications.md`へ記録する。

この範囲についてAIは以下を行ってよい。

- Observationを記録する。
- Risk / Questionを記録する。

しかしNormative Oracleがないため、Product Defectとして確定しない。

Owner Decision等で仕様が確定したら、以下を同一変更として行う。

```text
Feature Spec / BR / ACへ確定内容を統合
  ↓
unresolved-specifications.mdから該当Entryを削除
  ↓
必要なTest / Automation / QA Charterを更新
```

---

## 11. Feature Spec template / Required Section Contract

各Feature Fileは原則として以下を持つ。

### Required

1. Purpose / Scope
2. Actors / Roles
3. Preconditions
4. Business Rules
5. UI / Behavior Contract
6. Error / Boundary Behavior
7. Acceptance Criteria
8. Out of scope
9. Executable Canonical Source references

### Conditional

10. State / Transition — State machineを持つ場合
11. Web / Native差分 — Platform差が存在する場合
12. Related Test / Automation references — 対応資産が存在する場合
13. Known Deviations / Unresolved Specification references — 該当Entryが存在する場合

ValidatorのRequired Section validationはRequired 9項目だけを機械的に確認する。Conditional Sectionの存在を一律強制しない。

Implementation ReferenceやExisting TestはTraceabilityのために参照するが、Normative Specを上書きしない。

---

## 12. Change Process

### 12.1 通常Feature変更

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

### 12.2 Bug Fix

#### Existing Spec violation

Current Implementationが既存Specに違反している場合、SpecをImplementationへ合わせて変更しない。

- Defectを修正する。
- 必要なRegressionを追加する。
- Active Known Deviationなら該当Entryを削除する。
- Spec変更は、誤記修正や説明補足が必要な場合だけ行う。

#### Specification change required

期待挙動自体を変える場合はBug Fix扱いでSpec更新を省略せず、通常Feature変更と同じ順序で更新する。

### 12.3 Emergency Fix

緊急修正でも原則として同一Implementation PR内でSpec / AC / Testを同期する。

緊急性のため事前更新できない場合は、例外理由を明示し、Merge前にCurrent Specへ同期する。仕様同期なしで「後で直す」を通常運用にしない。

---

## 13. Agentic QA Operating Contract

### 13.1 QA Mode

Agentic QAはCode Review / Repair / Implementationとは別Workflowとする。

QA Runの目的は以下である。

```text
Observe
  ↓
Reproduce
  ↓
Record
  ↓
Continue exploration
```

Findingが受理された後に、別のImplementation / Repair phaseへ渡す。

### 13.2 Information boundary

#### Spec-driven Discovery

標準Discoveryでは以下を参照してよい。

- 対象`docs/spec/**`
- QA Runbook / Charter
- App UI / Runtime
- Test Control / Seedの利用方法
- 実行に必要なSetup情報
- Runtime Evidence

Finding候補を作る前に、Application SourceやExisting Regressionから答えを探すことを標準手順にしない。

#### Gray-box Investigation

Finding候補をSpec + UI Evidenceで再現した後、原因調査やRegression Layer判断が必要な場合のみ、Application Code / Existing Testを参照してよい。

Codeを読んだこと自体をExpected根拠にしない。

Gray-box Training / Investigationの成果は、Black-box Scored ChallengeのRecall / Precisionスコアと混ぜない。

#### Black-box Scored Challenge

正式な探索能力評価はBlack-boxを標準とする。

Agentへ提供するもの:

- Built Web Artifactまたは起動済みWeb Runtime
- Androidの場合はBuild済みApp / Emulator等のRuntime
- `docs/spec/**`
- Learner Runbook / Charter
- 許可されたSeed / Test Control操作
- Runtimeから取得できるEvidence

Agentへ提供しないもの:

- Application Source
- Existing Regression Source
- Challenge Patch Source
- Instructor Answer Key
- Defect List
- Instructor-only Test
- EvaluatorのMatching情報

Black-box Scored Runでは「Sourceを読まないでください」というInstructionだけに依存せず、Source自体をAgent Workspace / Tool Scopeから外す。

### 13.3 Write boundary

探索WorkerはApplication Sourceを変更しない。

Current Repositoryで既に利用可能な`codex-safe` / 同等Harnessの`readonly` presetを**標準経路**とする。

Wave 0で`readonly` presetが削除・変更され必要境界を満たせないことが確認された場合のみ、Owner Decisionまたは最小の代替を検討する。

Read-only探索Worker自身がRun Artifactを書けない場合にSource WorkspaceへWrite権限を与えて解決しない。

標準構成:

```text
Parent / Orchestrator
  ├─ Run Artifactを管理
  └─ Read-only Exploration Worker
       ├─ Browser / Device操作
       ├─ Observation
       └─ Structured resultをParentへ返却
```

通常の非Scored QAでTool routing上Read-only WorkerへBrowser Capabilityを渡せない場合は、Parentで探索するFallbackを許可する。その場合もSource変更を禁止し、Working Tree SnapshotでQAによる追加変更0を確認する。

**Black-box Scored Challengeではworkspace-write Parentによる探索Fallbackを許可しない。** Read-only / isolated Runnerを成立させられない場合、そのRunはScored Evaluation対象外とする。

### 13.4 Working Tree Snapshot Contract

Implementation Branch上にはQA開始前からImplementation PRの差分が存在するため、単純な「`git diff`が空」を要求しない。

以下を比較する。

```text
QA開始直前
  ├─ git status --porcelain 等のSnapshot
  └─ git diff / git diff --cached 等のBaseline
        ↓
Agentic QA
        ↓
QA終了直後
  ├─ 同じ形式のSnapshot
  └─ 同じ形式のDiff
        ↓
Before / After比較
        ↓
QA実行による追加Source差分 = 0
```

必要ならBaselineをRun Artifactへ保存し、QA前から存在したImplementation差分とQAが新規に作った差分を混同しない。

### 13.5 Web Capability

Webの標準経路はPlaywright MCPとする。

最低Capability:

- Navigate
- DOM / Accessibility情報の観察
- Click / Fill / Select等の操作
- Scroll
- Screenshot
- URL確認
- Console / Error確認
- Seed / Test Controlを使ったReset
- Viewport切替

### 13.6 Native Capability Contract

Native Agentic QAはAndroidを標準Platformとする。

特定MCP名ではなく、以下Capabilityを満たすTool経路を要求する。

- Current ScreenのScreenshot取得
- Accessibility / Test ID / Semantic Label等による対象識別
- Tap
- Text input
- Scroll
- Back
- App restart
- Deep Link起動
- Test Control / Seed Reset
- Screenshot / Runtime Evidence取得
- 必要に応じてLog取得

Mobile MCP、Maestro MCP、ADB等のどの組み合わせでもよいが、上記Capabilityを満たさなければAgentic Exploratory QA完了とは扱わない。

既存Maestro Flowを実行してPASSしただけではAgentic QA実施済みとしない。

---

## 14. Agentic QA Charter / Finding / Artifact

### 14.1 Charter

最低限以下を含む。

```text
Charter ID
Target Spec
Business Rule / Acceptance Criteria
Risk
Role
Seed Scenario
Platform
Viewport / Device
Mission
Out of scope
Stop condition
```

停止条件は固定回数ではなく、Risk / Role / State / Journey / Platform / Viewport CoverageとCharter Mission完了で定義する。

### 14.2 Finding human-readable fields

```text
Finding ID
Title
Severity
Confidence
Oracle Reference
Known Deviation Check
Platform
Viewport / Device
Role
Seed Scenario
Route / Screen
Precondition
Steps
Expected
Actual
Evidence
Reproducibility
Risk / User impact
Duplicate check
Suggested regression layer
Status
```

### 14.3 Finding成立条件

- ObservationとInference / Opinionを分離する。
- ExpectedのOracle Referenceを示す。
- Known Deviationを確認する。
- Reset可能なFindingは原則2回以上再現する。
- Seed / Role / Platform / Viewportを記録する。
- Evidenceを残す。
- Duplicate Checkを行う。
- Tool / Environment FailureをProduct Defectとして扱わない。

### 14.4 `qa-findings.json` Versioned Contract

初期Contractは過剰なSchema Frameworkを導入せず、少なくとも次の構造を持つ。

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "charter_id": "<charter_id>",
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

Field名・enumの細部は既存Run Artifact Contractへ合わせてWave 0 / Wave 6で最終確定してよいが、以下は変えない。

- `schema_version`を持つ。
- `run_id` / `charter_id`からRunへ追跡できる。
- Findingを配列として機械処理できる。
- Oracle / Evidence / Reproduction / Statusを構造化する。

### 14.5 `evaluation.json` Versioned Contract

Challenge時のみ作成する。

最低限:

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
    "tn": 0
  },
  "metrics": {
    "recall": 0,
    "precision": 0,
    "false_positive_rate": 0,
    "evidence_quality": 0,
    "reproducibility": 0,
    "severity_accuracy": 0,
    "coverage": 0
  }
}
```

既存`run.json` / Evaluation Contractと競合する場合は新規Schemaを乱立させず、既存Contractへ最小拡張する。

### 14.6 Run Artifact

既存Codex Run Artifactを再利用する。

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

- `qa-charter.md`: Human-readable探索契約。
- `qa-findings.json`: 機械評価可能なFinding一覧。
- `REPORT.md`: Run Summary / Coverage / 終了理由。
- `evaluation.json`: Frozen FindingをAnswer Keyと照合した評価結果。

Raw Screenshot、Trace、MCP Log、ADB Log等は既存Artifact方針に従い`.artifacts/**`等へ分離し、Run Artifactには相対Referenceと要約だけを残す。

---

## 15. Challenge / Answer Key / Evaluation

### 15.1 原則

Challengeの目的は「Finding数を増やすこと」ではなく、AIエージェントが仕様をOracleとして妥当なFindingを作れるか評価することである。

正式な探索能力スコアはBlack-box Scored Challengeで測る。Gray-box Training / Investigationは学習・原因分析・Regression Layer判断に使い、同じスコアへ混ぜない。

### 15.2 Repository側

RepositoryにはReview可能な形で以下を保持できる。

```text
training/agentic-qa/
├ challenges/
├ patches-or-setup/
├ learner-bundle/
└ instructor/
   └ answer-key/
```

実PathはWave 0で調整する。

### 15.3 Black-box Learner Workspace

Agentへ元Repositoryを直接渡さない。

```text
Source Repository
  ├─ Application Source
  ├─ Challenge Patch Source
  ├─ Instructor Answer Key
  └─ Bundle / Build Generator
          ↓
Black-box Disposable Workspace / Runtime
  ├─ Built Web Artifact または起動済みRuntime
  ├─ AndroidならBuild済みApp / Runtime
  ├─ docs/spec
  ├─ Learner Runbook
  └─ Challenge適用済み状態
       × Application Sourceなし
       × Existing Test Sourceなし
       × Patch Sourceなし
       × Instructor Answer Keyなし
```

Scored RunnerのWorkspace / Tool ScopeをこのBlack-box環境へ限定する。

さらに、以下からInstructor情報へアクセスできないことを成立条件とする。

- Filesystem
- Parent directory traversal
- Git history containing instructor content
- GitHub Connector / Repository Search
- External Search
- Prompt Context
- Hidden test output containing answer

これを保証できない環境では練習用途には使えても、Precision / Recall等のScored Evaluationには使わない。

### 15.4 Runner / Evaluator separation

Scored Challengeは以下の順序を固定する。

```text
Black-box Runner / Orchestrator
  │  Answer Keyを読めない
  │
  ├─ Charter実行
  ├─ Finding確定
  └─ qa-findings.jsonをFreeze
            ↓
         Run終了
            ↓
Evaluator
  │  ここで初めてAnswer Keyを読む
  │
  ├─ Finding ↔ Answer Item Matching
  ├─ TP / FP / FN / TN集計
  └─ evaluation.json生成
```

Runner / OrchestratorがAnswer Keyを参照できた場合、そのRunは`valid_for_scoring=false`とする。

EvaluatorはFrozenされたFindingの内容を採点のために書き換えない。

### 15.5 Gray-box Training / Investigation

Gray-boxでは必要に応じて以下を許可する。

- Application Source
- Existing Test
- Implementation Reference
- Trace / Logを用いた原因調査

ただし目的は、探索後の原因分析、Test Layer判断、Regression追加判断まで学習することである。

Black-boxのRecall / Precisionとは別結果として扱う。

### 15.6 Challenge defect

- Production Runtimeへ恒久Feature Flagを追加しない。
- Disposable CopyへPatch / Setupとして適用する。
- Challenge適用前後を識別可能にする。
- 元RepositoryへChallenge変更を戻さない。
- App起動や探索自体を破壊するChallengeを無制限に作らない。

### 15.7 Answer Key Item Contract

Answer Keyは、曖昧な「バグ一覧」ではなく採点可能なItem集合として定義する。

各Itemは最低限以下を持つ。

```text
Item ID
Kind: defect | non-defect
Title
Oracle Reference
Expected Behavior
Minimum Reproduction Condition
Required observation / distinguishing condition
Evidence expectation
Expected severity       # defectのみ
Allowed severity delta  # defectのみ
```

`non-defect` Itemは、意図されたPlatform差、正常なError表示、Role制約、Empty State等、AIがFalse Positive化しやすい正常挙動を対象にする。

### 15.8 Finding ↔ Answer Item Matching Rule

MatchingはTitleの文字列一致で行わない。

FindingがDefect ItemへMatchするには、最低限以下を満たす。

1. 同じNormative Behavior / Oracleを対象としている。
2. Actual BehaviorがAnswer ItemのDefect本質と一致する。
3. Minimum Reproduction Conditionを満たすか、同じDefectを示す同等条件で再現している。
4. Evidenceが同じFailureを裏付ける。

1つのFindingが複数Defectをまとめている場合、EvaluatorはDefect Item単位へ分解してMatchできるが、1つのDefect Itemへ複数Findingが重複してもTPは1件と数える。

同じDefectの重複Findingは追加TPにしない。重複はDuplicate Qualityの悪化としてREPORTへ記録し、必要なら補助指標にするが初期必須Metricにはしない。

Matchが曖昧で機械判定だけでは不安定な場合、EvaluatorはReview-neededとして残し、人手確認後に確定してよい。AI Runner自身に自己採点させない。

### 15.9 TP / FP / FN / TN

Answer Keyの`defect` Itemと`non-defect` Itemを有限の評価母集団とする。

- **TP**: Defect Itemに正しくMatchした一意のFinding。
- **FN**: Defect Itemのうち、MatchするFindingがないもの。
- **FP**: Defect ItemへMatchしないのにProduct Defectとして提出された一意のFinding。Non-defect ItemをDefect化したFindingもFP。
- **TN**: Non-defect Itemのうち、Defectとして誤報されなかったもの。

Challenge外の予期しない真のDefectをAgentが発見した場合は、採点上自動的にFPへ落とさない。`unexpected_valid_finding`としてInstructor Reviewへ回し、Product Spec / Current Appを確認して評価母集団を補正する。

### 15.10 Metric formulas

分母が0の場合は`null`として扱い、0点と同義にしない。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
```

`FP_non_defect`は、明示的なNon-defect ItemをDefect化した件数とする。

通常のChallenge外FPはPrecisionへ反映するが、FPRの母集団には含めない。これにより「全正常ケース」という無限母集団を仮定しない。

### 15.11 Quality metric scoring

初期版は0〜1へ正規化する。複雑な重み付き総合点を必須にしない。

#### Evidence Quality

各TP Findingを以下の4項目で0 / 1採点し平均する。

- Oracle Referenceが正しい。
- Reproduction Stepsが再実行可能。
- Actualを裏付けるEvidence Referenceがある。
- Expected / Actualが観測事実と推論を混同していない。

Finding単位Score = 満たした項目数 / 4。

全TP Findingの平均をRunのEvidence Qualityとする。

#### Reproducibility

- Reset可能なDefectで`reproduction_count >= 2`かつ同一症状: 1.0
- 環境上2回目が不可能で理由とEvidenceが十分: 0.5
- 1回のみで理由なし、または再現失敗: 0.0

全TP Findingの平均をRun Scoreとする。

#### Severity Accuracy

Severityを`critical > high > medium > low`のOrdinalとして扱う。

Answer Keyの`allowed severity delta`以内なら1.0、それを超えた場合0.0とし、全TP Findingの平均を取る。

初期Defaultは`allowed severity delta = 1`とする。Critical相当をLow等へ大幅に外すケースを正答扱いしない。

#### Coverage

CoverageはBug数ではなくCharterで宣言したCoverage Dimensionの実施率とする。

```text
Coverage = completed_declared_coverage_items / declared_coverage_items
```

Coverage ItemはCharterに列挙したRole / State / Journey / Platform / Viewport / Risk等の具体的項目とし、単に「見た」と自己申告するだけでなくREPORT / Evidenceから実施確認できることを要求する。

### 15.12 CI / Validation

少なくとも以下を機械検証する。

```text
Clean Source
  ↓
Black-box Learner Bundle / Artifact生成
  ↓
Application Source / Existing Test / Instructor-only content不在確認
  ↓
Challenge適用済みRuntime生成
  ↓
Build / Launch可能性確認
  ↓
Challenge-specific sanity check
```

意図的Defectにより通常Regressionが失敗する場合、通常Regression全PassをChallenge Validation条件にしない。Challengeが意図どおり適用され、探索可能な状態であることを確認する専用Sanity Contractを持つ。

Basic / Intermediate / Advancedの3段階を基本とするが、難易度分類のためにRuntimeへ複雑な仕組みを追加しない。

---

## 16. Target implementation Waves

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
- [ ] Required / Conditional SectionをTemplateへ反映する。
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
- [ ] Required 9 SectionのValidation。
- [ ] Conditional Sectionは一律必須にしない。
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
- [ ] Finding Contractを実装する。
- [ ] `qa-findings.json` Versioned Contractを実装する。
- [ ] Known Deviation / Unresolved Spec処理を実装する。
- [ ] Severity / Confidence / Duplicate / Reproduction基準を定義する。
- [ ] Tool / Environment / Product Failureを分類する。
- [ ] Web CapabilityをPlaywright MCPでDry Runする。
- [ ] Native Capability ContractをDocument化する。

### Wave 7: Challenge / Black-box Bundle / Evaluation

- [ ] Challenge Definitionを作る。
- [ ] Instructor Answer Key Item Contractを作る。
- [ ] Black-box Disposable Workspace / Runtime生成方法を作る。
- [ ] Application Source / Existing Test / Patch Source / Instructor-only contentをScored Bundleから除外する。
- [ ] Gray-box Training Pathを別途定義する。
- [ ] Scored Runner / Evaluatorを分離する。
- [ ] RunnerがFinding Freeze後にEvaluatorを開始する。
- [ ] Scored Runの情報アクセス境界を定義する。
- [ ] Challenge Patch / SetupをDisposable Copyへだけ適用する。
- [ ] Challenge Validation / Sanityを追加する。
- [ ] Defect / Non-defect Itemを用意する。
- [ ] Finding ↔ Answer Item Matching Ruleを実装する。
- [ ] TP / FP / FN / TN分類を実装する。
- [ ] Recall / Precision / FPR計算を実装する。
- [ ] Evidence / Reproducibility / Severity / Coverage採点を実装する。
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
- [ ] Playwright MCP / Seed / Charter / Oracle / Finding / Evidence / False Positive / Regression還元を教材化する。
- [ ] Black-box DiscoveryとGray-box Investigationの違いを教材化する。
- [ ] Native Agentic QAはCapability Contract + Android標準で説明する。
- [ ] Challenge評価でSource / Answer Key隔離の意味を説明する。
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
- [ ] QA前後Snapshot比較でQAによる追加Source差分0を確認する。
- [ ] Android Capabilityが利用可能ならNative Agentic QAをDry Runする。
- [ ] Android Capability不足なら未実施を明記し、Maestro PASSで代替しない。
- [ ] Black-box BundleにApplication Source / Existing Test / Patch Source / Answer Keyがないことを確認する。
- [ ] Black-box RunnerがAnswer Keyへアクセスできないことを確認する。
- [ ] Challengeを最低1件Black-box End-to-Endで評価する。
- [ ] Frozen FindingをEvaluatorが変更しないことを確認する。
- [ ] TP / FP / FN / TNと各Metricが再計算可能であることを確認する。
- [ ] `pnpm run verify`。
- [ ] Required GitHub Actions成功を確認する。
- [ ] Generated HTMLをHuman視点で確認する。
- [ ] Spec / ACをAIエージェントに読ませOracle解釈を確認する。
- [ ] PR差分へProduct Fix / unrelated Refactorが混入していないことをReviewする。

---

## 17. Validation plan

### 17.1 Static Specification

- Markdownlint
- Relative Link
- BR / AC ID uniqueness
- AC → BR integrity
- BR Acceptance coverage
- Required 9 Section
- Conditional Section非強制
- Generated HTML Build

### 17.2 Generator

- Stable Heading Anchor
- `## Navigation`からのNavigation導出
- Relative Link変換
- Raw HTML Safety
- Table / Code block保持
- Source Markdown不変
- Deterministic regeneration

### 17.3 Agentic QA

- Specを読まずに開始しない。
- Known Deviationを新規Defect化しない。
- Unresolved Specificationを確定Defect化しない。
- Charterが必要Fieldを持つ。
- Oracle ReferenceなしFindingを完成扱いしない。
- Reset可能Findingで再現する。
- Existing `readonly` presetが標準探索経路として使われる。
- QA前後のBaseline Snapshotを比較し、QAによる追加Source変更0を確認する。
- Tool / Environment FailureをProduct Defectへ分類しない。
- Discovery中にSource / Existing Testから答えを先取りしない。

### 17.4 Run Artifact

- `qa-findings.json`に`schema_version`がある。
- `run_id` / `charter_id`からRunを追跡できる。
- Oracle / Evidence / Reproduction / Statusを機械処理できる。
- Challenge時の`evaluation.json`からTP / FP / FN / TNとMetricを再計算できる。

### 17.5 Challenge

- Black-box BundleにApplication Sourceがない。
- Black-box BundleにExisting Test Sourceがない。
- Black-box BundleにPatch Sourceがない。
- Black-box BundleにInstructor Answer Keyがない。
- Scored RunnerがGitHub Connector / Search等からInstructor情報へアクセスできない。
- Scored RunnerとEvaluatorが分離されている。
- Finding Freeze後だけEvaluatorがAnswer Keyを読む。
- Challenge適用後にAppを探索可能。
- Defect / Non-defect Itemを両方含む。
- Matching RuleからTP / FP / FN / TNを再現できる。
- 分母0のMetricを`null`として扱う。
- Challenge外のUnexpected Valid Findingを自動FP化しない。

### 17.6 Curriculum

- Part 1 / Part 2 Link / Number整合。
- Test Case ID / UI Test ID / BR / ACの用語整合。
- Agentic QAをAutomationの代替として説明しない。
- Black-box / Gray-boxの目的を混同しない。
- Learner本文にAnswer Keyを露出しない。
- PR #14後のNative / iOS CIの事実と整合する。

### 17.7 Product Regression

Specification整理が主目的でも、Package / Generator / CI変更を伴うため既存`verify`とRequired CIを通す。

実行していない検証をPASS扱いしない。

---

## 18. Risks / Mitigation

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

**Mitigation:** 最小Grammar、BR / AC ID / Reference / Navigation / Required Section程度に限定し、大量Front Matterを要求しない。

### R5. HTML Platform肥大化

**Risk:** Documentation Framework整備が主目的化する。

**Mitigation:** Lightweight Parser + Static HTML + CSS + Navigationに限定する。Hosting / Search / CMSはNon-goal。

### R6. AI QA False Positive

**Risk:** AIが独自期待を作る。

**Mitigation:** Oracle Reference、Known Deviation Check、Reproduction、Evidence、Confidenceを必須化する。

### R7. QA WorkerがSourceを変更する

**Risk:** 探索結果が自己修正によって汚染される。

**Mitigation:** Existing `readonly` presetを標準とし、ParentがArtifactを保存する。Implementation BranchではBefore / After Snapshotを比較し、QAによる追加差分0を確認する。

### R8. Challenge Answer / Source leakage

**Risk:** AgentがAnswer KeyやChallenge Source差分を読んでRecall / Precision評価が無効になる。

**Mitigation:** Black-box BundleではApplication Source / Existing Test / Patch Source / Instructor contentを除外し、Connector / Searchアクセスも制限する。隔離できないRunはScored対象外とする。

### R9. Runner / Evaluatorの情報混線

**Risk:** Finding作成AgentがAnswer Keyを見た状態で自己採点し、評価が循環する。

**Mitigation:** Finding FreezeまではRunnerだけ、Answer KeyはRun終了後のEvaluatorだけが読む。Frozen FindingをEvaluatorが変更しない。

### R10. Evaluationが計算不能 / 恣意的になる

**Risk:** Matching Ruleや母集団が曖昧でRecall / Precision / FPRを再計算できない。

**Mitigation:** Defect / Non-defect Itemを有限母集団として定義し、Matching Rule、TP / FP / FN / TN、Formula、Quality Metric RuleをPlanで固定する。

### R11. NativeをAgentic QAと誤認する

**Risk:** Maestro Regressionを実行しただけで探索QA完了と扱う。

**Mitigation:** Native Capability Contractを定義し、Capability不足時は未実施と明記する。

### R12. CurriculumがPR #14後の現状とずれる

**Risk:** PR #13のNative / iOS CI説明がマージ直後から古くなる。

**Mitigation:** Wave 0でPR #14→#13後をRebaselineし、Wave 8でCurrent Productへ同期する。

### R13. Known Deviation / Unresolved SpecのLifecycle不整合

**Risk:** 解消済みKnown Deviationが残りRegressionを新規Findingとして検出できない、または確定済みUnresolved Specが未確定扱いされ続ける。

**Mitigation:** Known DeviationはActive-only、解消時に削除する。Unresolved Specificationは確定内容をFeature Specへ統合後に削除する。

---

## 19. 予定成果物

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

これは**将来のImplementation PRのScope**であり、現在のPlan Branchでは変更しない。

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

## 20. Implementation PRのCommit / Review単位

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

## 21. Final architecture

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
Built Runtime + Spec + Runbook
        │
        ▼
Read-only Runner
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

## 22. Open questions

現時点でImplementationを開始できない未回答のBlocking Questionはない。

ただしWave 0の最新`main`再Mappingで以下が判明した場合はOpen Questionへ追加し、必要ならOwner Decisionを求める。

- PR #14 / #13または後続PRによって本Planの中核ContractとCurrent Repositoryが衝突する。
- Product意図をDocs / ADR / History / Code / Testから確定できない。
- Current Harnessで`readonly` + Browser / Device Capabilityを成立させられない。
- Black-box BundleでSource / Answer Key隔離を保証できない。
- Existing Run / Evaluation schemaと本PlanのVersioned Artifact Contractを最小拡張で両立できない。

---

## 23. Follow-up notes

今回のImplementation PR完了後に必要性が確認された場合のみ、別途検討する。

- Generated HTMLの外部Hosting / 認証 / Full-text Search。
- AI QAのNightly / Release前自動起動。
- AI QAをCI Gateへ昇格するかの実測評価。
- iOS物理端末Agentic QA。
- Challenge数や難易度の追加拡張。
- Evaluation Scoreの重み付き総合点や長期Trend分析。
- Unexpected Valid FindingをAnswer Key / Product Backlogへ還元する運用の高度化。

これらは今回の必須DoDへ入れない。

---

## 24. 実装開始時の原則

- 最初にPR #14、PR #13、その他依存PRのMerge状態を確認する。
- 最新`main`の事実を本Planより優先し、Wave 0でPlanを同期する。
- ただし、Goal / SSOT責務 / Black-box Source・Answer Key隔離 / QA Write Boundary / Runner-Evaluator分離等の中核Contractを暗黙に弱めない。
- 最新Repositoryと中核Contractが衝突する場合はOwner Decisionを求める。
- 目的は文書量を増やすことではなく、人間とAIが同じ期待値からQAできる状態を作ることである。
- Markdownは人間にもAIにも読みやすい自然文を優先する。
- MetadataやValidatorは必要最小限にする。
- Generated HTMLはPresentation Layerであり、直接編集しない。
- Agentic QAはDeterministic Automationの代替ではない。
- Black-box Scored ChallengeとGray-box Trainingを混同しない。
- Source / Answer KeyへアクセスできたRunを探索能力の高得点として扱わない。
