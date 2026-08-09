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

### 1.2 Implementation Start Gate

実装開始前に以下をすべて満たす。

- Native Phase 2後半PR #14が`main`へマージ済み。
- カリキュラムPR #13がその後`main`へマージ済み。
- 実装開始時点の他Open PRの依存影響を確認済み。
- 最新`main`からImplementation Branchを作成済み。
- PR #14後のNative Scope / Android / iOS CIとPR #13のCurriculum記述を再確認済み。
- PR #13内に古いNative / iOS CI記述があれば今回Scopeで修正対象に含める。
- Sandbox / Approval / Public Contractを扱うため、Current `AGENTS.md` Contractに従いImplementation Runを`strict`相当で扱う。

Start Gateが未達のまま実装へ進まない。

### 1.3 Definition of Done

#### Specification

- `docs/spec/README.md`がSpecification Systemの唯一の入口として機能する。
- Normative Product BehaviorとSupporting / Operational文書を明示的に分離する。
- Product Scope、Role / Permission、State / Transition、UI / UX、主要Feature、BR、ACをCurrent Specとして明文化する。
- `known-deviations.md`はActiveなImplementation差異だけを扱う。
- `unresolved-specifications.md`は未確定事項だけを扱い、Oracleにしない。
- Seed ID、Role / Status type、Route、Design Token、Build Config、Test ID等の低レベル値はExecutable Canonical Sourceを正本とし、Markdownへ無目的に複製しない。
- Generated HTML、Application、Existing Test、README、Guide、ADRをNormative Product Behavior SSOTとして扱わない。

#### BR / AC / Feature Grammar

- BRへ安定ID`BR-*`、ACへ安定ID`AC-*`を付与する。
- Test Case ID、UI Test ID、BR、ACを別Namespaceとする。
- BR / AC見出しGrammar、`Related BR:` Grammar、Required 5 Sectionの**exact heading grammar**を本Planどおり実装する。
- Required 5 Sectionは各Feature Specに1回ずつ、定義順で存在する。
- Active BRは1件以上のACから参照されるか、`Acceptance: N/A — <reason>`を持つ。
- BR / AC ID uniqueness、AC → BR integrity、BR Acceptance coverageを機械検証する。

#### Change Process / Execution Continuity

- Existing Spec violationとSpecification changeを区別する。
- 緊急修正でもMerge前にSpec / AC / Testを同期する。
- Product意図が確定できない場合はUnresolvedへ置き、Implementation / Existing Testから推測してOracle化しない。
- Agentic QAはRisk-basedとし全変更へ強制しない。
- Local Blockerは該当Taskと依存Taskだけを止め、独立Taskは継続する。
- Global BlockerだけWhole-run停止条件とする。
- Final Validationはfail-closeとする。

#### HTML / Validation / CI

- `docs/spec/**/*.md`から静的HTMLを一方向生成できる。
- Generated HTMLを直接編集しない。
- `docs/spec/README.md`の`## Navigation`をNavigation Sourceとする。
- Markdownlint、Relative Link、BR / AC、Required Section、Challenge reference、HTML Buildを検証する。
- Changed BR / ACおよびChanged directly referenced Normative fileからAffected Challenge IDをCI / Review Summaryへ出す。
- `pnpm run validate:spec`、`pnpm run build:spec`を追加し、`pnpm run verify`とRequired CIへ接続する。
- Generated HTMLをCI ArtifactとしてReviewerが確認できる。

#### Agentic QA

- Code Review / Repairとは別のAgentic Exploratory QA Entry Point / Skill / Workflowを作る。
- Spec-driven DiscoveryとGray-box Investigationを分離する。
- 通常QA / Gray-boxは既存`readonly` presetをWrite Boundaryとして使う。
- 通常QA / Gray-boxは前後Working Tree SnapshotでQAによる追加Source差分0を確認する。
- Black-box Scored Runnerではrepo-root `readonly`をSource Isolationとして使わない。
- **1 Finding = 1 distinct product deviation**を固定する。
- WebはPlaywright MCP相当Capability、NativeはCapability Contractで扱い、Androidを標準対象とする。
- Maestro Regression PASSだけでNative Agentic QA完了としない。
- AI QAを初期Required CI Gateにしない。

#### Challenge / Evaluation

- Machine Contractは本Planで固定した**JSON + Zod**を使い、YAML / Markdown Front Matter /別Databaseを追加しない。
- Challenge Definition、Instructor Answer Key、Challenge Patch、Tool Profileの保存Pathを本Planどおり固定する。
- 各Machine JSONは`schema_version: 1`を必須とする。
- `spec_refs[]`は本Planの許可Grammar以外を受け付けない。
- `challenge.required_coverage`をRequired Coverageの唯一の正本とし、`qa-findings.json`側から独自に追加・削除・並べ替えできない。
- Challenge / Answer Key / Finding間のID uniquenessとCross-file integrityをZod / Validatorで機械検証する。
- Learner-safe Specification Bundleは`challenge.spec_refs[]`から決定的に生成し、実装者が任意の追加Specを混ぜない。
- Defect注入はInstructor-only Unified Diff Patchへ限定し、Disposable Source Copyへだけ適用する。
- Scored RunnerはFresh Session + isolated execution root + explicit Tool Allowlistで実行する。
- Source Repository、`.git`、Existing Test、Patch Source、Answer Key、Artifact bytes、Search、Generic Shell等をRunnerへExposeしない。
- Scored開始前にForbidden Capability Probeを通す。
- Challenge Definition側でExploration Budget / Stop Conditionを固定する。
- Benchmark RevisionとRunner Execution ProfileをRun Artifactへ記録する。
- 未Commit Benchmark Revisionは本PlanのCanonical Manifest + SHA-256 Algorithmで決定的に生成する。
- `qa-findings.json` / `evaluation.json`をVersioned Contractとして保存する。
- Instructor-defined Required Coverage SetをRunnerが縮小できない。
- Non-defectはTN / FP_non_defect / NEを区別し、Item-specific observation Evidenceを要求する。
- `FP_non_defect`は**Precision用FPのsubset**とし、同じ1 FindingがPrecisionでは`fp`、FPRでは`fp_non_defect`へ寄与する。
- `invalid_non_atomic`をTPへ分解せず、Product Defectとして提出された1 FindingにつきPrecisionへ1 FP penaltyを課す。
- `evaluation.json.matches[]`からFinding / Answer Item / Coverage / Classification / Adjudicationを追跡できる。
- Environment / Harness要因でRequired Coverageが`blocked_environment`なら`valid_for_scoring=false`とする。
- Unexpected Valid Findingが真の未登録Defectなら元Runを後付け再採点せず、新Benchmark RevisionでFresh Re-runする。
- Pre-patch Baseline Sanity / Post-patch SanityでChallenge Ground Truthを確認する。

#### Final

- Product Behaviorを意図せず変更していない。
- Product Bug修正や無関係なRefactorが混ざっていない。
- `pnpm run verify`が成功する。
- Required GitHub Actionsが成功する。
- 未解消Required Blockerを残してDoD完了扱いにしない。
- Implementation PR 1本だけで全DoDをReview可能にする。

---

## 2. Current understanding

### 2.1 Current Entry Points

- `README.md`: Product Overview、Setup、Test Account、Seed、Web / Native実行方法。
- `/guide`: 利用者・テスター向けGuide。
- `docs/PROJECT_CONTEXT.md`: AI作業、Architecture、UI / UX、CI、Native等のliving context。
- `docs/adr/**`: 過去の重要Decision。
- `AGENTS.md` / `PLANS.md` / `CODE_REVIEW.md`: AIエージェント運用契約。
- `.agents/skills/**`: Plan / Review / Repair等のWorkflow。
- `src/seeds/metadata.ts`: Seed Scenario MetadataのExecutable Canonical Source。
- `e2e/web/**` / `playwright.config.ts`: Web Regression / Evidence。
- Native wrapper / Maestro / workflow: Native Build / Runtime / Test Control / Evidence。
- `.github/workflows/ci.yml`: Web / Quality / Build / E2E / Deploy Gate。
- `docs/curriculum/test-automation/**`: PR #13マージ後のカリキュラム。

### 2.2 Dependency State to Rebaseline

PR #14はNative Phase 2後半としてLogin / Session / Account / Address / Checkout / Payment / Order / Review、Android / iOS Maestro、iOS Simulator正式CI Gate等を追加する予定である。

実装開始時に最低限以下を再Baselineする。

- Native Product Scope
- Native Seed / Test Control
- Native Route / Role / State
- Android CI
- iOS CI
- Maestro Flow
- Native Production-validation
- Curriculum内Native説明

PR #13はPR #14より前のRepository状態を前提に作成されているため、PR #14 → PR #13の順でマージした後、Curriculumの事実記述を再確認する。

### 2.3 Current Harness Constraint

Current `codex-safe`の`readonly` presetはSource Write防止には使えるが、Current wrapperはRepository RootをWorking Rootとして扱うためSource Readを防げない。

したがって、以下を別Contractとして扱う。

- Normal / Gray-box: Existing `readonly` = Write Boundary
- Black-box Scored: isolated root + Tool Allowlist = Read / Information Boundary
- Benchmark Revision = 評価母集団
- Runner Execution Profile = 実行条件

### 2.4 Current Problem

```text
README / Guide / PROJECT_CONTEXT / ADR / Code / Test
        ↓
仕様相当情報が分散
        ↓
Human / QA / AIが個別に期待値を解釈
        ↓
Test / Review / QAでOracleが揺れる
```

---

## 3. Assumptions

- Future ImplementationはPR #14とPR #13マージ後に開始する。
- Implementationは最新`main`から別Branchを作る。
- 実装は1本のPRで完結させる。
- Markdown SpecificationとGenerated HTMLを別管理しない。
- Git HistoryをVersion Historyとして使い、手動Document Version番号を導入しない。
- HTMLはLocal Build + CI Artifactを初期標準とする。
- AI QAはRequired CI Gateにしない。
- AI QA Findingは探索中に自動修正しない。
- Challenge評価は未知不具合探索能力の評価であり、Code Inspection能力をBlack-box Scoreへ混ぜない。
- 同条件Score比較は原則`same benchmark_revision + same runner_profile`とする。
- Model差等を意図的に比較する場合はProfile差分を明示する。
- Challenge Defect注入はSource Patchに限定し、初期版では任意Instructor setup scriptを導入しない。

---

## 4. Non-goals

- Product機能の全面改修。
- 棚卸し中に見つけた全Product Bugの同時修正。
- Existing Regression Suiteの全面書換え。
- Docusaurus / VitePress / CMS等の大型Docs Platform。
- Specification Database / 外部SaaS。
- HTMLを第二の編集可能仕様書にすること。
- HTML外部Hosting / 認証 / Full-text Search。
- AI QAをPR Required Checkにすること。
- LLM Findingの無検証Issue / PR自動投稿。
- QA探索中のApplication自動修正。
- Challenge DefectをProduction Runtimeへ恒久投入すること。
- Native機能を仕様整理のために新規実装すること。
- iOS物理端末Agentic QA。
- 大規模Evaluation Platform / Remote Sandbox基盤。
- 重み付き総合スコア / Ranking System。
- Fingerprint DB / Version DB。
- YAML parser等、Challenge Machine Contractのためだけの新規dependency。
- Challengeごとの任意Instructor setup script。
- Learner-safe Spec Bundleへ`spec_refs[]`外の文書を暗黙追加すること。
- Runner Execution Profileへ取得不能な温度、乱数Seed等を推測して記録すること。

---

## 5. Impacted areas

1. Product Specification / Documentation
2. BR / AC / Traceability
3. Specification Change Management
4. Static HTML Generator
5. Specification Validation / CI
6. AI Agent Operating Agreement
7. Agentic Exploratory QA Workflow
8. Finding / Evidence / Coverage Artifact
9. Challenge / Answer Key / Challenge Patch / Evaluation
10. Test Automation Curriculum
11. Existing README / Guide / PROJECT_CONTEXT責務整理
12. Scored Runner Isolation / Benchmark / Runner Profile

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

### 6.3 QA / Agent / Artifact

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
- Existing run / evaluation schema
- Browser / Native MCP / Tool routing config

### 6.4 CI / Build / Curriculum

- `package.json`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- Markdownlint / Prettier / ESLint設定
- `docs/curriculum/test-automation/**`

---

## 7. Change strategy

### 7.1 Blocker Policy

#### Local blocker

特定Platform、Tool、Challenge、Feature等に閉じたBlockerは、そのTaskと直接依存するTaskだけを`Blocked`へ移す。

例:

- Native Scored RunnerのDevice Capabilityだけ不足。
- 1 FeatureだけProduct意図未確定。
- 1 ChallengeだけBaseline Sanity不成立。

この場合も以下の独立Taskは継続する。

- Specification整備
- HTML Generator / Validator
- Web Agentic QA
- Curriculumの独立部分
- 他Platform / 他Challenge

#### Global blocker

Whole-runを止めるのは以下のようなGoal / Safety / Core Contract全体へ影響する場合だけとする。

- Implementation Start Gate未達のまま実装開始が必要。
- Normative SSOT責務自体を変更しないと成立しない。
- Source / Answer Key isolationを守れないままScored評価成立が要求される。
- 1本のImplementation PR前提を維持できない重大なRepository制約が判明。

#### Final fail-close

途中は独立Taskを可能な限り進める。Final Validationでは未解消Required Blockerを残したままPASS / DoD完了にしない。

### 7.2 Specification System / SSOT

`docs/spec/`全体をSpecification Systemとし、全ファイルをNormativeにはしない。

#### Normative Product Behavior

初期Normative領域を以下に固定する。

- `docs/spec/product-scope.md`
- `docs/spec/roles-and-permissions.md`
- `docs/spec/state-and-scenarios.md`
- `docs/spec/ui-ux-contract.md`
- `docs/spec/features/**/*.md`

Normative対象:

- Product Scope
- Role / Permission
- Business Rule
- State / Transition
- Error / Boundary Behavior
- UI / UX Contract
- Web / Native共通Behavior
- Intentional Platform Difference
- Acceptance Criteria

Normative Fileを増減する場合は`docs/spec/README.md`で明示する。`docs/spec/**/*.md`を暗黙に全Oracle化しない。

#### Supporting / Operational

- `docs/spec/README.md`: Entry / Navigation /責務説明
- `docs/spec/glossary.md`: 用語補助
- `docs/spec/change-process.md`: 変更運用
- `docs/spec/known-deviations.md`: Active Implementation差異
- `docs/spec/unresolved-specifications.md`: 未確定項目
- `docs/spec/_templates/**`: Authoring Template

SupportingがNormativeと矛盾した場合はSupporting側同期漏れとして扱う。

#### Executable Canonical Sources

以下の低レベル値はCode側正本を維持する。

- Seed Scenario ID / Metadata
- Role / Status Type
- Route definitions
- Design Token
- Build / Runtime Config
- App ID
- Test ID / Accessibility Label

Markdownは意味・期待・契約を定義する。Public Contract上同値を文書にも置く場合だけ重複を許す。

#### Oracle Priority

Expected判断は以下で固定する。

1. Current Normative Product Behavior
2. 同Spec内BR / AC
3. Active Known Deviationによる「Implementation差異情報」
4. ADRによるDecision History
5. Application / Seed / Test / README / GuideはEvidence / Implementation Reference

Known DeviationはExpected Behaviorを変更しない。Unresolved範囲はDefect確定しない。

### 7.3 Target Specification Structure

```text
docs/spec/
├ README.md                    # Supporting
├ glossary.md                  # Supporting
├ product-scope.md             # Normative
├ roles-and-permissions.md     # Normative
├ state-and-scenarios.md       # Normative
├ ui-ux-contract.md            # Normative
├ known-deviations.md          # Supporting
├ unresolved-specifications.md # Supporting
├ change-process.md            # Supporting
├ _templates/
│  └ feature-spec.md           # Supporting
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

ACは別Databaseへ分離せず関連Feature Spec内へ置く。

### 7.4 Markdown Exact Grammar

#### Navigation

`docs/spec/README.md`に以下のSectionを置く。

```markdown
## Navigation

- [Product Scope](./product-scope.md)
- [Roles and Permissions](./roles-and-permissions.md)
- [Cart](./features/cart.md)
```

Generatorは`## Navigation`直下のMarkdown Link ListだけをNavigation Sourceとして読む。

#### Feature Required Sections

各`docs/spec/features/**/*.md`は以下の見出しを**exact match・各1回・この順序**で持つ。

```markdown
## Purpose / Scope

## Business Rules

## UI / Behavior Contract

## Acceptance Criteria

## Executable Canonical Sources
```

ValidatorはAliasを認めない。例えば`## Scope`、`## Business Rule`、`## Canonical Sources`はRequired Sectionとして扱わない。

Conditional Sectionは必要な場合だけ追加する。空のConditional Sectionを作らない。

#### BR

```markdown
### BR-CART-001 — Cart数量上限

Cart数量は、Product仕様で定義された購入可能上限を超えてはならない。
```

Grammar:

```text
^### BR-[A-Z0-9]+-[0-9]{3} — .+$
```

Current Normative Specificationに存在するBR見出しはActive BRとする。廃止BRをStatus付きで残さずGit Historyで追う。

#### AC

```markdown
#### AC-CART-001 — 上限値を受け入れる

Related BR: `BR-CART-001`
```

複数BR:

```markdown
Related BR: `BR-CART-004`, `BR-PAYMENT-002`
```

Grammar:

```text
^#### AC-[A-Z0-9]+-[0-9]{3} — .+$
Related BR: `BR-...`[, `BR-...`]*
```

`Related BR:`は1件以上必須。

#### BR without direct AC

```text
Acceptance: N/A — <直接ACを持たない理由>
```

ValidatorはActive BRがACから参照されるか、このMarkerを持つことを確認する。

### 7.5 Change Process

#### Normal Feature Change

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

Agentic QA候補:

- 新規User-facing Feature
- UI / UX / Responsive / Accessibility Behavior変更
- User Journey変更
- Role / Permission変更
- State / Transition変更
- Error / Boundary Behavior変更
- 高Risk Regression修正
- Release前探索

Behavior不変Docs、Internal-only Refactor、既存Testで十分な低Risk変更では省略可能。省略をPASS扱いせず、必要なら理由を短く残す。

#### Existing Spec violation

Implementationが既存Specに違反する場合はSpecをImplementationへ合わせない。

- Defect修正
- 必要なRegression追加 / 更新
- Active Known DeviationならEntry削除
- Specは誤記 / 説明補足が必要な場合だけ修正

#### Specification change

期待挙動そのものを変更する場合は通常Feature ChangeとしてSpec → AC → Test → Implementationを同期する。

#### Emergency Fix

原則同一Implementation PR内でSpec / AC / Testを同期する。事前同期できない場合もMerge前までにCurrent Specへ反映する。

### 7.6 Known Deviation / Unresolved Lifecycle

#### Known Deviation

Active-onlyとする。

```text
Implementation修正
  ↓
Regression追加 / 更新
  ↓
known-deviations.mdからEntry削除
  ↓
AI QA入力から除外
```

再現しても新規Defectとして重複報告しない。

#### Unresolved Specification

Product意図未確定範囲を置く。AIはObservation / Risk / Questionを記録してよいがDefect確定しない。

```text
Product Decision
  ↓
Normative Feature Spec / BR / ACへ統合
  ↓
unresolved-specifications.mdから削除
  ↓
必要なTest / Automation / Charter更新
```

### 7.7 Agentic QA Operating Contract

#### Modes

**Spec-driven Discovery**で参照可:

- 対象Normative Spec
- Active Known Deviation
- 関連Unresolved Specification
- Runbook / Charter
- App Runtime
- Seed / Test Control利用方法
- Runtime Evidence

Finding候補を作る前にSource / Existing Regressionから答えを探さない。

**Gray-box Investigation**では、Normative Spec + UI EvidenceでFinding候補を再現した後だけ原因調査目的でSource / Existing Testを参照してよい。CodeをExpected根拠にしない。

#### Normal / Gray-box Write Boundary

既存`readonly` presetを標準経路とする。

```text
Parent / Orchestrator
  ├─ Run Artifactを管理
  └─ Read-only Exploration Worker
       ├─ Browser / Device操作
       ├─ Observation
       └─ Structured resultをParentへ返却
```

QA開始直前 / 終了直後に同形式のWorking Tree Snapshotを取り、QAによる追加Source差分0を確認する。

#### Atomic Finding

**1 Finding = 1 distinct product deviation**。

条件:

- 1つの主要Expected Behavior
- 1つの主要Actual Deviation
- 最大1 Defect ItemへMatch
- 複数独立Deviationをまとめない

`invalid_non_atomic`はTPへ分解しない。Product Defectとして提出された場合はPrecisionで1 Finding = 1 FP penaltyとする。内部に本物Defectが含まれていても別Atomic FindingがなければそのDefect ItemはFNのまま。

### 7.8 Black-box Scored Isolation

#### Isolated Root

Current repo-root `readonly`はSource Isolationに使わない。

Runner root:

```text
<isolated-run-root>/
├ learner-spec/
├ runbook/
└ challenge/

× .git
× src/
× tests/
× patches/
× instructor/
× build artifact files
```

RunnerはFresh Sessionで起動し、Prompt / ContextへLearner-safe Inputだけを渡す。

Build / Serve / InstallはPreparation Process側で完了し、RunnerへRuntime endpointまたはBoot済みDeviceだけを提供する。

#### Positive Tool Allowlist

Allowed logical capabilities:

- isolated root内Learner-safe File read
- Target RuntimeへのUser-facing navigation
- Click / Tap / Fill / Select / Scroll / Back
- DOM / Accessibility / Semantic Label / Test ID observation
- Screenshot
- Current URL / Current Screen
- 制限Console / Narrow Log
- 許可Seed / Test Control / Deep Link
- Viewport / App restart

Exposeしない:

- Source Repository / Parent traversal
- Generic Shell / PowerShell / Bash
- Arbitrary HTTP fetch / File download
- Git / GitHub / Repository Search
- Web / External Search
- Browser arbitrary `evaluate`
- Network Response Body inspection
- JS Bundle / Source Map取得
- APK / IPA file access
- Arbitrary ADB shell / Package extraction
- Instructor-only Test / Hidden Test output
- Challenge Patch Source
- Answer Key / Defect List / Evaluator Matching情報
- prior Session Source / Answer Key Context

Browser NavigationはTarget Application OriginとChallengeで許可されたTest Control / Deep Linkへ限定する。

必要CapabilityとForbidden CapabilityをTool実装上分離できない場合は、そのToolを直接Exposeせず狭いWrapper / Workerを使う。

#### Forbidden Capability Probe

Scored Run開始前にRunner同等Scopeで最低以下をProbeする。

- Source Repository Path inaccessible
- Parent traversalでSourceへ戻れない
- GitHub / Repository Search unavailable
- Web Search / arbitrary external fetch unavailable
- Generic Shell unavailable
- Web: JS Bundle / Source Map / Network Response Body inaccessible
- Native: APK / IPA / arbitrary ADB shell inaccessible

1つでも成立したらScored開始せず練習Runへ降格する。

### 7.9 Machine Contract Storage: JSON + Zod

初期版のMachine Contract保存形式を**JSON + Zod**へ固定する。YAML / Markdown Front Matter /独自Databaseを併用しない。

Repositoryには既に`zod`があるため、新規Schema dependencyを追加しない。

#### Fixed paths

```text
training/agentic-qa/
├ challenges/
│  ├ CHALLENGE-BASIC-001/
│  │  ├ challenge.json
│  │  └ runbook.md
│  ├ CHALLENGE-INTERMEDIATE-001/
│  │  ├ challenge.json
│  │  └ runbook.md
│  └ CHALLENGE-ADVANCED-001/
│     ├ challenge.json
│     └ runbook.md
├ instructor/
│  ├ answer-key/
│  │  ├ CHALLENGE-BASIC-001.json
│  │  ├ CHALLENGE-INTERMEDIATE-001.json
│  │  └ CHALLENGE-ADVANCED-001.json
│  └ challenge-patches/
│     ├ CHALLENGE-BASIC-001.patch
│     ├ CHALLENGE-INTERMEDIATE-001.patch
│     └ CHALLENGE-ADVANCED-001.patch
└ tool-profiles/
   └ scored-v1.json

scripts/agentic-qa/
├ contracts.ts
├ validate-contracts.ts
├ build-learner-bundle.ts
├ benchmark-revision.ts
├ prepare-challenge.ts
├ evaluate.ts
└ <minimal runner/orchestration helpers>
```

- `challenge.json`: Learner-safe Machine Contract。
- `runbook.md`: Human / Learner説明。採点用秘密情報を含めない。
- `instructor/answer-key/*.json`: Instructor-only Machine Contract。
- `instructor/challenge-patches/*.patch`: Instructor-only Unified Diff。Runnerへ渡さない。
- `tool-profiles/scored-v1.json`: Scored Allowlist / capability profileのMachine Contract。
- `scripts/agentic-qa/contracts.ts`: Challenge / Answer Key / Tool Profile / Findings / EvaluationのZod Schemaを正本とする。

各Machine JSONは必ず以下を持つ。

```json
{
  "schema_version": 1
}
```

JSONがZod validationを通らない場合は実行前Failureとする。

### 7.10 `spec_refs[]` Exact Grammar

`challenge.json` / Answer Keyが参照するSpec Referenceは**string array**とし、以下3形式だけを許可する。

```text
BR-CART-001
AC-CART-002
docs/spec/ui-ux-contract.md#responsive-behavior
```

許可形式:

1. `BR-<AREA>-NNN`
2. `AC-<AREA>-NNN`
3. Repo-root relative Normative Markdown path + optional `#heading-anchor`

Path reference rules:

- POSIX separator`/`を使う。
- `docs/spec/`から開始するrepo-root relative pathとする。
- `..`を含めない。
- 対象は7.2で定義したNormative Fileだけ。Supporting Fileを参照不可。
- `.md`で終わる。
- `#anchor`は省略可能。
- `#anchor`を付ける場合、Static HTML GeneratorとValidatorが共有する同一`slugHeading()` helperで生成されるAnchor IDと完全一致させる。
- 自由文字列Reference、表示名だけのReference、絶対Pathは受け付けない。

ValidatorはReference existenceを以下で確認する。

- BR / AC: Current Normative Spec内のID存在
- File: Normative allowlist内Path存在
- File + Anchor: 対象Markdown headingを`slugHeading()`したAnchor存在

Spec drift summaryはBase差分から以下を列挙する。

- Changed referenced BR / AC → affected Challenge IDs
- Changed directly referenced Normative file → affected Challenge IDs

内容変更だけで自動Failureにはせず、Reviewerが「Challenge更新済み」または「意味変更なし」を確認する。

### 7.11 Learner-safe Challenge Definition

`challenge.json`の最低Contract:

```json
{
  "schema_version": 1,
  "challenge_id": "CHALLENGE-BASIC-001",
  "level": "basic",
  "target_platform": "web",
  "spec_refs": ["BR-CART-001", "AC-CART-002"],
  "required_coverage": [
    {
      "coverage_id": "COV-001",
      "mission": "<neutral mission>",
      "role": "customer",
      "seed": "<seed id>",
      "platform": "web",
      "viewport_or_device": "desktop",
      "required_evidence_types": ["screenshot"]
    }
  ],
  "allowed_runtime_controls": ["seed_reset"],
  "exploration_budget": {
    "max_duration_seconds": 900,
    "max_tool_actions": 150
  },
  "stop_condition": "required_coverage_and_candidates_resolved_or_budget_exhausted",
  "out_of_scope": []
}
```

`level` enum:

```text
basic | intermediate | advanced
```

`target_platform` / Coverage `platform`初期enum:

```text
web | android | ios
```

`exploration_budget.max_duration_seconds` / `max_tool_actions`は、実行基盤で固定不能な値だけ`null`を許可する。Field自体はomitせず常に存在させる。

`stop_condition`初期版は以下の固定値だけを使う。

```text
required_coverage_and_candidates_resolved_or_budget_exhausted
```

意味:

- 全Required Coverageが`completed`または正当な`blocked_environment`として記録済み、かつ
- Open candidate findingがすべてFrozen Finding化またはEvidence不足等の理由付きでdiscard済み、

であればBudget上限前でも停止可能。それ以外はBudget exhaustionまで継続する。

Learner-safe Challenge Definitionへ以下を入れない。

- defect / non-defect分類
- Answer Key Item ID
- Related non-defect item ID
- Challenge Patchの意図
- 正常 / 異常どちらが正解かを示す説明

Coverage Missionは中立表現にする。

#### Required Coverage SSOT

**Required Coverageの唯一の正本は`challenge.required_coverage`である。**

Derived value:

```text
expected_required_ids
= challenge.required_coverage.map(item => item.coverage_id)
```

Rules:

- `coverage_id`はChallenge内で一意。
- `qa-findings.json.coverage.required_ids`は`expected_required_ids`と**同一順序で完全一致**する。
- Runnerが`required_ids`を追加・削除・並べ替えしない。
- `qa-findings.json.coverage.items`はRequired Coverageだけを持ち、各`coverage_id`について**ちょうど1件**のResultを持つ。
- `coverage.items`のID集合 / 順序も`expected_required_ids`と完全一致する。
- Additional explorationはFinding / Evidenceへ残してよいが、Required Coverage配列へ追加しない。

初期`coverage_id` grammar:

```text
^COV-[0-9]{3}$
```

### 7.12 Learner-safe Specification Bundle

Black-box Scored Runnerへ渡す`learner-spec/`は`challenge.spec_refs[]`から**決定的に生成**する。

#### Resolve rule

各`spec_refs[]`を以下のようにOwner Normative Markdown Fileへ解決する。

- BR reference → そのBR見出しを所有するNormative Markdown File。
- AC reference → そのAC見出しを所有するNormative Markdown File。
- Markdown path reference → `#anchor`を除いたそのNormative Markdown File。

その後:

1. Owner Fileのrepo-relative pathを取得する。
2. Pathで重複排除する。
3. POSIX repo-relative path昇順へsortする。
4. **File全体**を`<isolated-run-root>/learner-spec/<repo-relative-path>`へcopyする。

例:

```json
{
  "spec_refs": [
    "BR-CART-001",
    "AC-CART-002",
    "docs/spec/ui-ux-contract.md#responsive-behavior"
  ]
}
```

Resolved bundle:

```text
learner-spec/
└ docs/spec/
   ├ features/cart.md
   └ ui-ux-contract.md
```

Rules:

- Section単位の切り出しはしない。Owner Markdown File全体をcopyする。
- `spec_refs[]`が解決しない場合はBundle生成Failure。
- Supporting Fileを自動追加しない。
- 他のNormative Fileも自動追加しない。
- Challengeで追加Normative情報が必要なら`spec_refs[]`へ明示的にReferenceを追加する。
- Bundle生成結果のPath一覧と各File SHA-256をPreparation Evidenceへ残す。
- Answer Key Itemの`oracle_refs[]`は、Current Normative Specに存在し、かつそのReferenceが解決するOwner FileがLearner-safe Bundle内に含まれていなければならない。

これによりEvaluatorだけが知るHidden Oracleを作らない。

### 7.13 Tool Profile / Runner Execution Profile

#### `scored-v1.json`

Tool ProfileはScored RunnerへExposeするLogical CapabilityのPositive Listを持つ。

最低Contract:

```json
{
  "schema_version": 1,
  "profile_id": "scored-v1",
  "allowed_capabilities": [
    "learner_safe_file_read",
    "runtime_navigate",
    "runtime_interact",
    "runtime_observe",
    "screenshot",
    "narrow_console_or_log",
    "approved_test_control"
  ]
}
```

Forbidden Capabilityは7.8のContractとして実装し、Allowedに存在しないCapabilityをRunnerへExposeしない。

#### Runner Execution Profile

Benchmark Revisionは「何を評価したか」、Runner Profileは「どの条件で評価したか」を表す。

Runへ最低以下を保存する。

```json
{
  "model": "<actual model identifier>",
  "tool_profile_revision": "sha256:<hex>",
  "max_duration_seconds": 900,
  "max_tool_actions": 150,
  "stop_condition": "required_coverage_and_candidates_resolved_or_budget_exhausted"
}
```

Rules:

- `model`は実行基盤から取得できる実Identifierを保存する。取得不能ならScored comparison用Runを正式化せず、Wave 0でBlockerとして扱う。
- `tool_profile_revision`はPreparation Processが実際に使用した`scored-v1.json`のUTF-8 raw file bytesへSHA-256を適用し、`sha256:<lowercase hex>`として保存する。
- Budget値はChallenge Definitionからコピーする。
- 固定不能Budget値は`null`で保存し、omitしない。
- `qa-findings.json`と`evaluation.json`のRunner Profileは完全一致させる。
- 同じBenchmarkでもRunner Profileが異なるRunを同一条件として比較しない。

### 7.14 Challenge Patch Contract

Challenge Defect注入はInstructor-onlyの**Unified Diff Patch**へ限定する。

Fixed path:

```text
training/agentic-qa/instructor/challenge-patches/<challenge_id>.patch
```

例:

```text
training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch
```

Rules:

- Answer Keyに`kind = defect` Itemが1件以上あるChallengeは、初期版では対応するPatch Fileを必須とする。
- Non-defectのみのChallengeではPatch Fileを省略できる。
- 1 ChallengeにつきPatch Fileは最大1件。
- Patchは標準Unified Diffとし、任意Shell / JS / TS / PowerShell setup scriptをChallenge注入目的で実行しない。
- Seed / initial stateは既存Seed / Test Controlで作る。Challenge固有の任意DB mutation scriptを追加しない。
- PatchはInstructor-onlyで、Learner-safe Bundle / isolated Runner Rootへcopyしない。

#### Application flow

Preparation Processは**Disposable Source Copy**だけで以下を行う。

```text
Clean benchmark source copy
  ↓
Instructor-only Pre-patch Baseline Sanity
  ↓
git statusで意図しないSource差分0確認
  ↓
git apply --check <challenge.patch>
  ↓
git apply <challenge.patch>
  ↓
Instructor-only Post-patch Sanity
  ↓
Build / Serve / Install
  ↓
Scored Runtime提供
```

- `git apply --check` failureはChallenge Preparation Failure。
- Patch適用後に意図しない追加Source編集をしない。
- Scored Run後はDisposable Copyを破棄する。
- Challenge PatchをImplementation BranchのApplication Sourceへ適用した状態でCommitしない。
- Baseline Sanityで対象Defectが既に存在する場合、Patchを適用して採点へ進まない。
- Post-patch SanityでAnswer KeyのMinimum Reproduction Conditionを満たさない場合、Scored Runを開始しない。

### 7.15 Benchmark Revision

Benchmark Revisionは以下の評価母集団を一意に識別する。

- Runtimeを生成したSource状態
- Learner-safe Normative Spec Bundle
- Challenge Definition
- Instructor Answer Key
- Challenge Patch（存在する場合）
- Runtime Variant（存在する場合）

#### Clean committed benchmark

以下をすべて満たす場合のみ、Git Commit SHAをそのまま利用してよい。

- Source Working Treeがclean。
- Challenge / Answer Key / Patch / Normative Specが同一Commitに存在する。
- Runtime Variantが追加で存在しない、またはVariant IDを別Fieldで固定できる。

形式:

```text
git:<40-char-lowercase-sha>
```

#### Uncommitted / mixed benchmark

未Commit validation、Working Tree変更、Commit外Benchmark Inputを含む場合は、以下のCanonical Manifestを生成してSHA-256する。

Canonical Manifest logical shape:

```json
{
  "schema_version": 1,
  "source_head_sha": "<40-char sha>",
  "working_tree_entries": [
    {
      "status": "M",
      "path": "src/example.ts",
      "sha256": "<hex>"
    }
  ],
  "learner_spec_entries": [
    {
      "path": "docs/spec/features/cart.md",
      "sha256": "<hex>"
    }
  ],
  "challenge": {
    "path": "training/agentic-qa/challenges/CHALLENGE-BASIC-001/challenge.json",
    "sha256": "<hex>"
  },
  "answer_key": {
    "path": "training/agentic-qa/instructor/answer-key/CHALLENGE-BASIC-001.json",
    "sha256": "<hex>"
  },
  "challenge_patch": {
    "path": "training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch",
    "sha256": "<hex>"
  },
  "runtime_variant_id": null
}
```

`challenge_patch`が存在しない場合は`null`。

#### Working tree entry generation

`working_tree_entries`はBenchmarkを生成するRepository Working Treeについて、HEADとの差異を決定的に表す。

対象:

- Modified tracked file
- Added tracked / untracked non-ignored file
- Deleted tracked file
- Renamed fileはGitのstatusを正規化し、旧Path削除 + 新Path追加として表現してよい。実装時に一方式へ固定する。

Rules:

- Pathはrepo-root relative POSIX path。
- Entryは`path`昇順。
- Existing fileの`sha256`は**raw file bytes**へSHA-256を適用したlowercase hex。
- Deleted fileは`sha256: null`。
- `.git/**`、`node_modules/**`、`output/**`、`.artifacts/**`、`.codex/runs/**`等、Git ignore / Generated / Runtime Artifactは対象外。
- Git ignored fileをBenchmark入力として依存させない。必要InputはSource-controlledまたは明示Benchmark Inputへ移す。

#### Canonical serialization

- Manifest ObjectのKey順序は上記Schema順に固定する。
- Entry ArrayはPath昇順。
- JSONはUTF-8、BOMなし、LF、2-space indent、末尾改行1個でserializationする。
- Manifest file bytesへSHA-256を適用する。

形式:

```text
benchmark_revision = sha256:<lowercase hex>
```

Manifest自体はRun Evidenceとして保存してよいが、外部Version DBは作らない。

同一`challenge_id`でもBenchmark Revisionが違えば別母集団とする。

### 7.16 Instructor Answer Key

Answer Key JSON最低Contract:

```json
{
  "schema_version": 1,
  "challenge_id": "CHALLENGE-BASIC-001",
  "items": [
    {
      "item_id": "DEFECT-001",
      "kind": "defect",
      "title": "<title>",
      "oracle_refs": ["BR-CART-001"],
      "expected_behavior": "<expected>",
      "minimum_reproduction_condition": "<condition>",
      "required_observation": "<observation>",
      "related_coverage_id": "COV-001",
      "evidence_expectation": "<evidence>",
      "expected_severity": "high",
      "allowed_severity_delta": 1
    }
  ]
}
```

`kind`:

```text
defect | non-defect
```

`non-defect` Itemでは`expected_severity` / `allowed_severity_delta`を`null`とする。Fieldはomitしない。

Defect / Non-defect分類、Coverage Mapping、Expected SeverityはInstructor-onlyとしRunnerへ渡さない。

Oracle ReferenceはBR / ACを優先し、必要時のみNormative file / section referenceを使う。

#### Cross-file integrity

ValidatorはChallenge / Answer Key / Patch / Findingsについて最低限以下を検証する。

- Challenge Directory名 === `challenge.challenge_id`。
- Answer Key filename stem === `challenge.challenge_id`。
- `answer_key.challenge_id === challenge.challenge_id`。
- `challenge.required_coverage[].coverage_id`は一意。
- `answer_key.items[].item_id`は一意。
- `answer_key.items[].related_coverage_id`は`challenge.required_coverage[].coverage_id`のいずれかに存在する。
- `answer_key.items[].oracle_refs[]`は7.10 Grammarに適合しCurrent Normative Specに存在する。
- 各Answer ItemのOracle Owner Fileは7.12のLearner-safe Bundleに含まれる。
- Defect Itemが1件以上なら7.14のChallenge Patchが存在する。
- Non-defectのみならPatch不存在を許可する。
- `qa-findings.json.findings[].finding_id`はRun内で一意。
- `qa-findings.coverage.required_ids` / `coverage.items[].coverage_id`は7.11のDerived Required IDsと完全一致する。

### 7.17 QA Run Artifact Contract

#### Layout

```text
.codex/runs/<run_id>/
├ PLAN.md
├ TASKS.md
├ REPORT.md
├ run.json
├ qa-charter.md
├ benchmark-manifest.json   # sha256 benchmark時。git:<sha>のみなら任意
├ qa-findings.json
└ evaluation.json           # Challenge評価時のみ
```

Raw Screenshot / Trace / MCP Log / ADB Log等は`.artifacts/**`へ分離し、Run Artifactへ相対Referenceと要約だけを残す。

Scored RunnerがArtifactを書けない場合はRunner終了後にOrchestratorがFrozen Structured Resultを保存する。Finding生成中のOrchestratorはAnswer Keyを参照しない。

#### `qa-findings.json`

最低構造:

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "charter_id": "<charter_id>",
  "benchmark_revision": "<revision>",
  "source_head_sha": null,
  "runtime_variant_id": null,
  "runner_profile": {
    "model": "<model>",
    "tool_profile_revision": "sha256:<hex>",
    "max_duration_seconds": 900,
    "max_tool_actions": 150,
    "stop_condition": "required_coverage_and_candidates_resolved_or_budget_exhausted"
  },
  "coverage": {
    "required_ids": ["COV-001"],
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
      "oracle_refs": ["BR-CART-001"],
      "platform": "web",
      "role": "customer",
      "seed_scenario": "default",
      "steps": ["..."],
      "expected": "...",
      "actual": "...",
      "evidence": [{"type": "screenshot", "ref": ".artifacts/..."}],
      "reproduction_count": 2,
      "known_deviation_ref": null,
      "duplicate_of": null,
      "suggested_regression_layer": "web-e2e",
      "status": "validated"
    }
  ]
}
```

Coverage `status`:

```text
completed | not_completed | blocked_environment
```

- `completed`: Mission到達 + Required Evidenceあり。
- `not_completed`: Runnerが未実施 / 断念 / 必要条件不足。
- `blocked_environment`: Runtime / Emulator / MCP / Test Control等のEnvironment / Harness要因で実施不能。

Required Coverageは7.11のSSOT / Derived Ruleに従う。

### 7.18 Runner / Evaluator Separation

```text
Preparation Process
  ├─ Machine Contract validation
  ├─ Required Coverage derive / integrity check
  ├─ Learner-safe Spec Bundle生成
  ├─ Benchmark Revision確定
  ├─ Runner Profile確定
  ├─ Disposable Source Copy作成
  ├─ Baseline sanity
  ├─ Challenge Patch apply-check / apply
  ├─ Post-patch sanity
  ├─ Build / Serve / Install
  ├─ isolated execution root作成
  ├─ learner-safe input配置
  └─ Tool Allowlist / Forbidden Probe
            ↓
Fresh Black-box Runner
  ├─ Required Coverage実施
  ├─ Atomic Finding確定
  └─ Structured Result Freeze
            ↓
Run終了
            ↓
Separate Evaluator
  ├─ Answer Keyを初めてRead
  ├─ Benchmark / Runner Profile / Isolation確認
  ├─ Coverage blocker確認
  ├─ Finding ↔ Answer Item Matching
  ├─ Item-specific Evidence確認
  ├─ Adjudication
  └─ evaluation.json生成
```

- Runner / OrchestratorがSource / Answer KeyをScored Finding生成中に参照できたRunは`valid_for_scoring=false`。
- EvaluatorはFrozen Findingを書き換えない。
- RunnerとEvaluatorは同一Agent Sessionを再利用しない。

### 7.19 Matching / Classification

#### Defect Item Match

1 Atomic Findingは最大1 Defect ItemへMatchする。

Match条件:

1. 同じNormative Behavior / Oracle。
2. Actual BehaviorがDefect本質と一致。
3. Minimum Reproduction Conditionまたは同等条件を満たす。
4. Evidenceが同じFailureを裏付ける。

同一Defect Itemへ複数FindingがMatchした場合:

- 最初の一意FindingだけTP候補。
- 残りは`duplicate`。
- Duplicateは追加TP / FPにしない。
- `duplicate_rate`へ別計上。

`review_needed`は正式Score確定前に必ずadjudicateする。

#### Defect Item

- **TP**: 一意Atomic FindingがDefect Itemへ正しくMatch。
- **FN**: MatchするAtomic Findingなし。

#### Submitted Finding / Precision FP

Precision用`FP`を以下の**相互排他的Finding分類の合計**として固定する。

```text
FP = generic_unmatched_atomic_fp
   + invalid_non_atomic_fp
   + fp_non_defect
```

- `generic_unmatched_atomic_fp`: どのDefect Item / Non-defect Itemにも正しく対応しない一意Atomic Finding。
- `invalid_non_atomic_fp`: Product Defectとして提出された`invalid_non_atomic` Finding。1 Finding = 1 FP。
- `fp_non_defect`: 実際には正常なNon-defect ItemをDefectとして誤報したFinding。

**`fp_non_defect`はPrecision用FPのsubsetである。**

1件の`fp_non_defect` Findingは:

- `counts.fp += 1`
- `counts.fp_non_defect += 1`

へ寄与するが、Finding自体を2件として扱わない。

`generic_unmatched_atomic_fp`から`fp_non_defect`を除外し、同じFindingをPrecision内で二重計上しない。

#### Non-defect Item

- **TN**: Related Coverageが`completed`で、EvidenceがそのItemのRequired Observationを満たし、Defectとして誤報されていない。
- **FP_non_defect**: Item固有Required ObservationまでEvidence化し、その正常BehaviorをDefectとして誤報した。
- **NE**: Related Coverageが`not_completed`、またはCoverage `completed`でもItem-specific observationをEvidenceから確認できない。

未探索をTNにしない。Coverage到達だけでTNにしない。

### 7.20 Environment Blocker / Scoring Validity

#### `not_completed`

Runner側未実施としてCoverage低下へ反映する。

- Required Flow未実施
- 探索を諦めた
- Role / Seed / Viewport未設定
- Required Evidenceなし

#### `blocked_environment`

Runner能力評価と分離すべき原因:

- Runtime down / 起動不能
- Emulator / Simulator infrastructure failure
- 必須MCP Capability unavailable
- Test Control / Seed Reset障害
- Harness異常

EvaluatorがRequired Coverageの`blocked_environment`を確認した場合:

```text
valid_for_scoring = false
invalid_reason = environment_blocker
```

正式Recall / Precision / FPR / Coverageは確定しない。Agent能力比較へ使わない。

Runnerが自己都合で`blocked_environment`化しないよう、Evaluator / OrchestratorがEvidenceを確認する。

### 7.21 Unexpected Valid Finding

Challenge外の未知Defect候補は自動FP化しない。

- Defectではない → 元BenchmarkのFPとして確定可。
- 真の未登録Defect → Ground Truth変更になるため元Runを新Benchmarkへ後付け再採点しない。

真の未登録Defect時:

```text
Unexpected Valid Finding confirmed
  ↓
元RunのFrozen Finding / Evidence保持
  ↓
元Run:
  valid_for_scoring = false
  invalid_reason = benchmark_ground_truth_changed
  ↓
Answer Key / Ground Truth更新
  ↓
新Benchmark Revision
  ↓
Fresh Session + 同じ比較対象Runner ProfileでFresh Re-run
  ↓
新Runを正式Scoreとする
```

元`qa-findings.json`のBenchmark Revisionを書き換えない。

### 7.22 Metrics

`valid_for_scoring=true`にだけ正式適用する。分母0は`null`。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

FPR分母はItem-specific observationをEvidence確認できたexercised non-defect itemsだけ。NEを除外する。

#### Evidence Quality

各TPを以下4項目0 / 1で評価し平均する。

- Oracle Reference正当
- Reproduction Steps再実行可能
- Actualを裏付けるEvidenceあり
- Expected / ActualでObservationとInferenceを混同しない

TP 0件なら`null`。

#### Reproducibility

- Reset可能Defectで2回以上同一症状: 1.0
- 正当な理由で2回目不能 + Evidence十分: 0.5
- 1回のみ理由なし / 再現失敗: 0.0

TP 0件なら`null`。

#### Severity Accuracy

Ordinal:

```text
critical > high > medium > low
```

Answer Keyの`allowed_severity_delta`以内なら1.0、超過0.0。Default delta = 1。TP 0件なら`null`。

### 7.23 `evaluation.json` Contract

最低構造:

```json
{
  "schema_version": 1,
  "run_id": "<run_id>",
  "challenge_id": "CHALLENGE-BASIC-001",
  "benchmark_revision": "<revision>",
  "source_head_sha": null,
  "runtime_variant_id": null,
  "runner_profile": {
    "model": "<model>",
    "tool_profile_revision": "sha256:<hex>",
    "max_duration_seconds": 900,
    "max_tool_actions": 150,
    "stop_condition": "required_coverage_and_candidates_resolved_or_budget_exhausted"
  },
  "mode": "black-box",
  "fresh_session": true,
  "tool_scope_validated": true,
  "valid_for_scoring": true,
  "invalid_reasons": [],
  "matches": [
    {
      "finding_id": "FIND-001",
      "answer_item_id": "DEFECT-003",
      "coverage_id": "COV-002",
      "classification": "tp",
      "required_observation_satisfied": true,
      "adjudication": "automatic"
    }
  ],
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

`matches[]` rules:

- `finding_id`: Finding由来ならID、TN / FN / NE等でFindingなしなら`null`。
- `answer_item_id`: Item判定ならID、generic FP / invalid_non_atomic等なら`null`可。
- `coverage_id`: Item-specific observation評価時に設定、それ以外`null`可。
- `classification`: `tp | fp | fn | tn | fp_non_defect | ne | duplicate | invalid_non_atomic | review_needed | unexpected_valid_finding`。
- `required_observation_satisfied`: 必要時boolean、それ以外`null`。
- `adjudication`: `automatic | human`。

`classification = fp_non_defect`のrecordは**1 recordのまま**`counts.fp`と`counts.fp_non_defect`双方へ1ずつ寄与する。

Human adjudicationでもFrozen `qa-findings.json`を書き換えず`matches[]`へ判断を残す。

`counts` / `metrics`はFrozen Findings + Frozen Answer Key + Required Coverage + `matches[]`から再確認可能にする。

Evaluatorは`qa-findings.json`と`evaluation.json`のBenchmark Revision / Runner Profile完全一致を確認する。

`valid_for_scoring=false`なら正式Metricは`null`を基本とする。

### 7.24 Challenge Ground Truth

#### Pre-patch Baseline Sanity

Challenge-specificに最低以下を確認する。

- 注入対象DefectがClean Baselineですでに存在しない。
- Non-defect ItemがBaselineで期待どおり成立。
- Seed / Test Control / Runtime前提が利用可能。

全RegressionをChallengeごとに二重実行しない。

#### Post-patch Sanity

- 意図DefectがMinimum Reproduction Conditionで成立。
- Non-defect Itemが意図せず壊れていない。
- 最低限Navigation / Reset / Runtime操作可能。

Baseline既存DefectをChallenge注入結果として扱わない。

---

## 8. Target implementation Waves

### Wave 0: Start Gate / Rebaseline

- [ ] PR #14 merge確認。
- [ ] PR #13 merge確認。
- [ ] 他依存PR確認。
- [ ] 最新`main`からImplementation Branch作成。
- [ ] `AGENTS.md`に従いStrict workflowとしてRun初期化。
- [ ] AGENTS / PROJECT_CONTEXT / ADR / CI / Native / Curriculum再Mapping。
- [ ] Existing `readonly` Write Boundary再確認。
- [ ] isolated execution root最小方式を決定。
- [ ] Browser / Native Tool routingを確認しScored Tool Allowlist実現経路を決定。
- [ ] Existing Run / Evaluation schemaを確認し、本PlanSchemaを既存Contractへ最小統合。
- [ ] `training/agentic-qa/**` fixed pathがCurrent Repoと衝突しないことを確認。衝突がなければ変更しない。
- [ ] Unified Diff PatchをDisposable Source Copyへ適用できるGit実行経路を確認。
- [ ] Learner-safe Spec Bundle生成でNormative Owner Fileを解決できることを確認。
- [ ] Benchmark Revisionの`git:<sha>` / `sha256:<manifest>`生成経路を確認。
- [ ] PR #14後Native ScopeとPR #13 Curriculum整合確認。
- [ ] 本PlanのPath / commandsをCurrent Repoへ同期。

Wave 0で選択してよいのは**実装手段**だけであり、本Planで固定したJSON format、Path、Grammar、Required Coverage SSOT、Learner Bundle Rule、Patch Contract、Benchmark Revision Algorithm、Scoring semanticsを変更しない。変更が必要ならCore Contract衝突としてOwner Decisionを求める。

### Wave 1: Current Specification Inventory

- [ ] README / Guide / PROJECT_CONTEXT / ADR / Code / Seed / Test横断。
- [ ] Web / Native Product Scope確定。
- [ ] Role / Permission Matrix確定。
- [ ] BR抽出。
- [ ] State / Transition抽出。
- [ ] UI / UX / Accessibility Contract抽出。
- [ ] Seed Scenario意味整理。
- [ ] Executable Canonical Source一覧化。
- [ ] 矛盾を`document stale | implementation deviation | unresolved specification`へ分類。
- [ ] Product意図をCodeだけで決定しない。

### Wave 2: Markdown Specification System

- [ ] `docs/spec/README.md`。
- [ ] `glossary.md`。
- [ ] Normative core 4 files。
- [ ] `known-deviations.md` Active-only。
- [ ] `unresolved-specifications.md`。
- [ ] `change-process.md`。
- [ ] `_templates/feature-spec.md`。
- [ ] Current Scope全Feature Spec。
- [ ] Executable Canonical Source refs。
- [ ] Existing README / Guide / PROJECT_CONTEXTの重複RuleをSpec Referenceへ寄せる。

### Wave 3: BR / AC / Exact Grammar / Change Process

- [ ] Required 5 Section exact heading / orderをTemplateへ実装。
- [ ] BR / AC exact heading Grammarを実装。
- [ ] `Related BR:` Grammar実装。
- [ ] BR / AC ID付与。
- [ ] BR Coverage / `Acceptance: N/A`確認。
- [ ] Known Deviation / Unresolved lifecycle記載。
- [ ] Risk-based Agentic QA条件記載。
- [ ] Local / Global Blocker + Final fail-close記載。
- [ ] AGENTS / ReviewへSpec同期観点接続。

### Wave 4: Markdown → Static HTML

- [ ] `docs/spec/**/*.md`だけをSourceにする。
- [ ] Raw HTML既定無効の軽量Parserを選ぶ。
- [ ] `## Navigation`からNavigation生成。
- [ ] Required Heading Anchor / TOC / Table / Code / Relative Link生成。
- [ ] `slugHeading()` helperをGenerator / Spec Ref Validatorで共用する。
- [ ] Normative / Supporting Labelを表示。
- [ ] Responsive CSS。
- [ ] `output/spec-site/**`へ生成。
- [ ] `pnpm run build:spec`。
- [ ] Hosting / Auth / Searchを追加しない。

### Wave 5: Specification / Machine Contract Validation / CI

- [ ] Markdownlint。
- [ ] Relative Link validation。
- [ ] BR / AC uniqueness。
- [ ] AC → BR integrity。
- [ ] BR Acceptance coverage。
- [ ] Required 5 Section exact heading + order validation。
- [ ] Challenge / Answer Key / Tool Profile Zod validation。
- [ ] Challenge Directory / Answer Key filename / `challenge_id`一致validation。
- [ ] `coverage_id` / Answer `item_id` uniqueness validation。
- [ ] Answer `related_coverage_id` → Challenge Required Coverage integrity。
- [ ] Defect Item存在時のChallenge Patch存在validation。
- [ ] `spec_refs[]` exact grammar / reference integrity。
- [ ] Answer Oracle Owner FileがLearner-safe Bundleに含まれることをvalidation。
- [ ] Learner-safe Bundleを決定的に生成するTest。
- [ ] Benchmark Manifest canonical serialization / digest Test。
- [ ] Changed BR / AC → Affected Challenge Summary。
- [ ] Changed referenced Normative file → Affected Challenge Summary。
- [ ] HTML Build validation。
- [ ] `pnpm run validate:spec`。
- [ ] `pnpm run verify`へ接続。
- [ ] Existing CIの適切なJobへ接続。
- [ ] HTML Artifact Upload。
- [ ] 不要なCI Job増加を避ける。

### Wave 6: Agentic QA Workflow / Artifacts

- [ ] `QA_AGENT.md`。
- [ ] `.agents/skills/exploratory-qa/SKILL.md`。
- [ ] `docs/reference/agentic-qa-workflow.md`。
- [ ] Spec-driven / Gray-box分離。
- [ ] Normal / Gray-box readonly標準経路。
- [ ] Working Tree Snapshot。
- [ ] Charter Contract。
- [ ] Atomic Finding Contract。
- [ ] `scripts/agentic-qa/contracts.ts` Zod schemas。
- [ ] `qa-findings.json` Versioned Contract。
- [ ] Required Coverage SSOTから`required_ids` / result skeletonをderiveするhelper。
- [ ] `qa-findings.coverage.required_ids` / `items`完全一致validation。
- [ ] Benchmark Revision / Runner Profile記録。
- [ ] Coverage status / blocker reason構造化。
- [ ] Known Deviation / Unresolved処理。
- [ ] Severity / Confidence / Duplicate / Reproduction基準。
- [ ] Web Capability Dry Run。
- [ ] Native Capability Contract。

### Wave 7: Challenge / Isolation / Evaluation

- [ ] `training/agentic-qa/**` fixed structure作成。
- [ ] Basic / Intermediate / Advanced各1 Challenge作成。
- [ ] `challenge.json` / Answer Key / `scored-v1.json`をZod validation可能にする。
- [ ] Defect Itemを持つChallengeへInstructor-only Unified Diff Patchを作成。
- [ ] `spec_refs[]` exact grammar適用。
- [ ] `challenge.required_coverage`をRequired Coverage SSOTとして実装。
- [ ] Cross-file ID / Coverage / Oracle integrityを実装。
- [ ] Learner-safe Spec Bundleを`spec_refs[]`から生成。
- [ ] BundleへOwner Normative File全体だけをcopyしSupportingを暗黙追加しない。
- [ ] Learner-safe CoverageからDefect / Non-defect mapping排除。
- [ ] Coverage Mission中立化。
- [ ] Exploration Budget / Stop Condition固定。
- [ ] Disposable Source Copy作成。
- [ ] Pre-patch Baseline Sanity。
- [ ] `git apply --check` → `git apply`。
- [ ] Post-patch Sanity。
- [ ] Build / Serve / InstallをRunner外へ分離。
- [ ] Benchmark Revisionを確定し必要時Canonical Manifestを保存。
- [ ] isolated execution root作成。
- [ ] Fresh Session作成。
- [ ] Scored Tool Allowlist実装。
- [ ] Forbidden Capability Probe実装。
- [ ] Source / `.git` / Artifact bytes / Test / Patch / Answer KeyをRunnerへ渡さない。
- [ ] JS Bundle / Source Map / Network Response / browser evaluateをScored Webから除外。
- [ ] APK / IPA / arbitrary ADB shellをScored Nativeから除外。
- [ ] GitHub / Repository / Web Search / Generic Shellを除外。
- [ ] Runner / Evaluator別Session。
- [ ] Benchmark Revision / Runner Profile一致確認。
- [ ] Finding Freeze後だけEvaluator開始。
- [ ] Required Coverage縮小不可。
- [ ] `blocked_environment` invalidation。
- [ ] Matching / Duplicate / invalid_non_atomic / review_needed実装。
- [ ] FP / FP_non_defect subset semantics実装。
- [ ] TN / FP_non_defect / NE + Item-specific Evidence実装。
- [ ] Unexpected Valid Finding → invalidate + new revision + Fresh Re-run。
- [ ] Recall / Precision / FPR / Coverage計算。
- [ ] Evidence / Reproducibility / Severity scoring。
- [ ] `evaluation.json.matches[]` machine-readable contract。

### Wave 8: Curriculum Integration

- [ ] Specification / AC / Normative vs Supporting追加。
- [ ] BR / AC → Risk → Test Case → Automation接続。
- [ ] Agentic QA ModuleをPart 1後半へ追加。
- [ ] Capstone番号 / Link更新。
- [ ] Playwright MCP / Seed / Charter / Oracle / Atomic Finding / Evidence / False Positive / Regression還元。
- [ ] Black-box / Gray-box区別。
- [ ] Normal readonly / Black-box Isolation区別。
- [ ] Fresh Session / Tool Allowlist / Forbidden Probe。
- [ ] JSON + Zod Machine ContractとLearner-safe / Instructor-only境界。
- [ ] Required Coverage SSOTとLearner-safe Bundle生成ルール。
- [ ] Instructor Challenge PatchをScored Runnerから隔離する理由。
- [ ] Benchmark Revision / Runner Profile / Budget比較条件。
- [ ] Instructor-defined Coverage / Non-defect評価。
- [ ] `FP_non_defect`がPrecision FP subsetであること。
- [ ] `invalid_non_atomic` FP penalty。
- [ ] Environment blocker invalidation。
- [ ] Unexpected Finding時Fresh Re-run。
- [ ] Risk-based Agentic QA運用。
- [ ] PR #14後Native / iOS CIへ同期。

### Wave 9: Existing Documentation Responsibility Cleanup

- [ ] READMEをSetup / Product Overview / Spec Entry中心へ整理。
- [ ] GuideをApplication利用・学習Guideとして維持。
- [ ] PROJECT_CONTEXTをAI作業・Architecture・Operational Context中心へ整理。
- [ ] ADRをDecision Historyとして維持。
- [ ] Existing TestをRegression Assetとして位置付け。
- [ ] Specとの重複Rule削減。

### Wave 10: Full Validation

- [ ] `pnpm run format:check`
- [ ] `pnpm run lint:markdown`
- [ ] `pnpm run validate:spec`
- [ ] `pnpm run build:spec`
- [ ] `pnpm run lint`
- [ ] `pnpm run typecheck`
- [ ] Spec Validator / Generator Tests
- [ ] Required Unit / Integration / Contract / Component Tests
- [ ] `pnpm run test:e2e:chromium`
- [ ] `pnpm run test:a11y`
- [ ] `pnpm run test:e2e:mobile-boundary`
- [ ] Web Agentic QA Charter最低1件Dry Run
- [ ] Finding 0件でもCoverage / Evidence / exit reasonが残る
- [ ] Normal QA前後Snapshotで追加Source差分0
- [ ] Android CapabilityがあればNative Agentic QA Dry Run
- [ ] Android Capability不足なら未実施明記、Maestro PASS代替禁止
- [ ] Challenge / Answer Key / Tool ProfileがJSON + Zod validation成功
- [ ] `schema_version`欠落時Failure
- [ ] Required Coverage ID重複時Failure
- [ ] Answer Item ID重複時Failure
- [ ] Answer `related_coverage_id`不存在時Failure
- [ ] Answer Key / Challenge ID不一致時Failure
- [ ] `qa-findings.finding_id`重複時Failure
- [ ] `qa-findings.coverage.required_ids`がDerived Required IDsと不一致ならFailure
- [ ] `qa-findings.coverage.items`がRequired Coverageと件数 / ID / 順序不一致ならFailure
- [ ] Invalid `spec_refs[]`形式がFailure
- [ ] Supporting pathを`spec_refs[]`へ入れるとFailure
- [ ] Answer Oracle Owner FileがLearner Bundle外ならFailure
- [ ] Learner-safe Bundleが`spec_refs[]`から同じPath集合 / Digestで再生成できる
- [ ] Required 5 Section alias / 欠落 / 重複 / 順序違反がFailure
- [ ] Defect ItemありChallengeでPatch不存在ならFailure
- [ ] Challenge Patchが`git apply --check`を通る
- [ ] Baseline SourceへPatchが未適用で対象Defect不存在
- [ ] Post-patchで意図したDefectが成立
- [ ] Patch SourceがRunner Rootに存在しない
- [ ] Uncommitted Benchmark ManifestのEntry order / serialization / SHA-256がDeterministic
- [ ] 同一Inputから同じ`benchmark_revision`が生成される
- [ ] Input 1 byte変更で`sha256:` Benchmark Revisionが変わる
- [ ] Scored Runner isolated root / Fresh Session確認
- [ ] Runner rootにSource / `.git` / Test / Source Map / Artifact / Patch / Answer Keyなし
- [ ] Tool Allowlist / Forbidden Probe成功
- [ ] Web bundle / source map / network body / evaluate inaccessible
- [ ] Native APK / arbitrary ADB shell inaccessible
- [ ] GitHub / Search / Generic Shell inaccessible
- [ ] Learner-safe CoverageにAnswer mappingなし
- [ ] Challenge最低1件Black-box E2E評価
- [ ] Benchmark Revision / Runner ProfileがFindingsとEvaluationで一致
- [ ] Budget null fieldがomitされない
- [ ] Tool Profile Revisionが実`scored-v1.json` SHA-256と一致
- [ ] Required Coverage縮小不可
- [ ] 未探索Non-defect → NE
- [ ] Coverage completedでもItem observationなし → NE
- [ ] Non-defect誤報1件が`counts.fp`と`counts.fp_non_defect`双方へ1寄与し、Precision内二重計上しない
- [ ] `invalid_non_atomic` → TP分解なし + 1 FP penalty
- [ ] Environment blocker → `valid_for_scoring=false`
- [ ] Runner起因`not_completed` → Coverage低下
- [ ] Atomic Finding最大1 Defect Item
- [ ] Frozen FindingをEvaluatorが変更しない
- [ ] Runner / Evaluator別Session
- [ ] `matches[]`からautomatic / human adjudication追跡可能
- [ ] TP / FP / FN / TN / NE / Metrics再計算可能
- [ ] Unexpected true defect → original invalid + new revision + Fresh Re-run
- [ ] Changed BR / AC / referenced Normative file → Affected Challenge Summary
- [ ] Local Blocker時も独立Task継続
- [ ] Final Validationは未解消Required Blockerでfail-close
- [ ] `pnpm run verify`
- [ ] Required GitHub Actions成功
- [ ] Generated HTML Human Review
- [ ] AI AgentがNormativeだけをExpected Oracleとして解釈
- [ ] Product Fix / unrelated Refactor混入なし

---

## 9. Validation plan / Success Criteria

### 9.1 Specification

成功条件:

- Exact Feature Heading Grammar、BR / AC Grammar、Link、ReferenceがValidatorで決定的に判定できる。
- Normative / Supporting責務がHuman / AIの双方で誤解されない。
- Generated HTMLはMarkdownからDeterministicに再生成できる。

### 9.2 Machine Contract / Cross-file Integrity

成功条件:

- Challenge / Answer Key / Tool Profile / Findings / Evaluationが`contracts.ts`のZod Schemaを通る。
- `schema_version`、null / required field semanticsが一意。
- YAML / Front Matter等の第二Machine Contractが存在しない。
- `spec_refs[]`は定義3形式だけが受理される。
- Challenge Directory / Answer Key filename / payload `challenge_id`が一致する。
- Challenge Required Coverage / Answer Mapping / Findings Coverage間のCross-file integrityが一意に検証できる。
- Coverage / Answer Item / Finding ID duplicateを拒否する。

### 9.3 Learner-safe Bundle

成功条件:

- `spec_refs[]`からOwner Normative Markdown File集合を一意に解決できる。
- File全体をrepo-relative path保持でcopyする。
- Section slicingをしない。
- Supporting / unrelated Normative Fileを暗黙追加しない。
- Answer Item OracleがLearnerへ提供されていないHidden Normative Fileを参照できない。
- 同じ`spec_refs[]` / Spec状態から同じBundle Path集合とFile digest集合を生成する。

### 9.4 Challenge Patch / Ground Truth

成功条件:

- Defect Itemを持つChallengeには規約PathのUnified Diff Patchがある。
- `git apply --check`成功後だけPatch適用する。
- PatchはDisposable Source Copyにだけ適用する。
- Pre-patchで対象Defect不存在、Post-patchで意図Defect成立を確認する。
- Challenge Patch / Answer KeyはRunner Rootへ入らない。
- 任意Instructor setup scriptをChallenge注入経路として追加しない。

### 9.5 Black-box Isolation

成功条件:

- Source-free isolated root + Fresh Session + Positive Tool Allowlistが成立。
- Forbidden Capability Probeが全項目Blockを確認。
- Runner / Evaluator Session分離が確認できる。

### 9.6 Scoring Correctness

成功条件:

- Atomic Finding最大1 Match。
- Duplicateが追加TP / FPにならない。
- `invalid_non_atomic`が1 FP penalty。
- `fp_non_defect` 1 FindingがPrecisionでは1 FP、FPRでは1 FP_non_defectへ寄与し、Precision内で二重計上されない。
- 未探索 / Item-specific EvidenceなしNon-defectがTNにならない。
- Environment blockerがAgent Score低下ではなくRun invalidationになる。
- Frozen Findings + Frozen Answer Key + Coverage + `matches[]`からcounts / metricsを再確認できる。

### 9.7 Reproducibility / Benchmark Revision

成功条件:

- Same Benchmark + Same Runner Profileを同条件比較として識別できる。
- Tool Profile Revisionが使用ファイルbytesのSHA-256と一致。
- Budget固定不能値は`null`で記録される。
- Clean committed Benchmarkは`git:<sha>`として識別できる。
- Uncommitted / mixed BenchmarkはCanonical Manifestから`sha256:<hex>`を決定的に生成できる。
- Manifest Entry / JSON serialization規則が実装者依存にならない。
- Ground Truth変更後は元RunをRevision付替えせずFresh Re-runする。

### 9.8 Product Regression

`pnpm run verify`とRequired CIを成功させる。実行していない検証をPASS扱いしない。

---

## 10. Risks

### R1. 1PR Scopeが大きい

**Mitigation:** Wave / Logical Commitで分離し、Product Feature改修を混ぜない。Local Blockerでは独立Taskを続行する。

### R2. Current Implementationを誤って仕様化

**Mitigation:** Docs / ADR / History / Test / Codeを横断し、不明項目はUnresolvedへ分離する。

### R3. Specification System全体をNormativeと誤認

**Mitigation:** Normative allowlistを明示しExpected判断はその領域だけを使う。

### R4. MarkdownとCode二重管理

**Mitigation:** Behavior SSOTとExecutable Canonical Sourceを分離する。

### R5. Validator / Docs Platform肥大化

**Mitigation:** Exact Grammar + JSON + Zod + Static HTMLの最小構成に限定する。YAML / CMS / DBを追加しない。

### R6. AI QA False Positive

**Mitigation:** Oracle Reference、Known Deviation、Reproduction、Evidence、Confidenceを要求する。

### R7. readonlyをBlack-box隔離と誤認

**Mitigation:** Normal readonlyとScored isolated rootを明確に分離する。

### R8. Tool経由Implementation leakage

**Mitigation:** Positive Tool Allowlist + Forbidden Probe。Shell / Search / evaluate / arbitrary fetch等をExposeしない。

### R9. Prior Session leakage

**Mitigation:** Fresh Scored Session。Evaluatorは別Session。

### R10. Learner-safe InputからAnswer leakage

**Mitigation:** Challenge JSONからclassification / Answer Item / Mappingを除外し、中立Coverageだけを渡す。

### R11. Learner-safe Spec Bundleが実装者ごとに変わる

**Mitigation:** `spec_refs[]` → Owner Normative File全体 → dedupe / sort / copyを固定し、Supporting / unrelated Specの暗黙追加を禁止する。

### R12. Required CoverageがArtifact側で改変される

**Mitigation:** `challenge.required_coverage`を唯一のSSOTとし、Derived ID配列 / Result配列の完全一致をValidatorで強制する。

### R13. Challenge PatchがSourceへ混入する

**Mitigation:** Instructor-only Unified Diff + Disposable Copy + `git apply --check`。Runner RootへPatchを渡さず、Application Branchへ適用状態をCommitしない。

### R14. Benchmark / Runner Profile混同

**Mitigation:** Benchmark = evaluation population、Runner Profile = execution conditionとして別Field固定。

### R15. 未Commit Benchmark Revisionが実装者依存になる

**Mitigation:** Canonical Manifest、Path sort、raw bytes SHA-256、JSON serializationを固定する。

### R16. TP / FP Gaming

**Mitigation:** Atomic Finding、invalid_non_atomic FP penalty、FP_non_defect subset semanticsを固定する。

### R17. 未探索正常ケースでFPR改善

**Mitigation:** TN / FP_non_defect / NE + Item-specific Evidence。

### R18. Environment failureでAgent Score低下

**Mitigation:** `blocked_environment`ならRun invalidation。

### R19. Challenge / Spec drift

**Mitigation:** BR / AC + directly referenced Normative file impact summary。

### R20. Ground Truth change後の後付け再採点

**Mitigation:** Original Run invalidation + New Benchmark + Fresh Re-run。

### R21. Local BlockerでGoal停止

**Mitigation:** Local / Global分離、Finalだけfail-close。

### R22. Curriculum drift

**Mitigation:** Wave 0でPR #14 → #13後をRebaselineしWave 8でCurrent Productへ同期。

---

## 11. Open questions

現時点でImplementationを開始するための未回答Blocking Questionはない。

Wave 0以降で以下が判明した場合だけOpen Questionへ追加する。

- PR #14 / #13 /後続PRによって本PlanのCore ContractとCurrent Repositoryが衝突する。
- Product意図をDocs / ADR / History / Code / Testから確定できない。
- Existing HarnessでNormal readonly + Browser / Device Capabilityを成立させられない。
- isolated execution rootを成立させられない。
- Scored Tool Allowlistへ必要Capabilityだけを安全に切り出せない。
- Fresh Scored Sessionを成立させられない。
- Web / NativeでImplementation inspection経路を十分に閉じられない。
- Existing Run / Evaluation schemaへ本PlanContractを最小統合できない。
- `training/agentic-qa/**` fixed pathが既存Current Repositoryの別責務と実際に衝突する。
- Model identifierをScored Runner実行基盤から取得できない。
- Environment blockerとRunner failureをEvidenceから合理的に区別できない。
- Current Git / Execution EnvironmentでDisposable Source Copy + `git apply --check`を安全に成立させられない。

Open Questionを推測で埋めない。ただしLocal Blockerなら該当Taskと依存Taskだけを停止し、独立Taskを継続する。

---

## 12. Follow-up notes

今回DoDへ含めない。

- Generated HTML外部Hosting / Auth / Full-text Search
- AI QA Nightly / Release自動起動
- AI QAのCI Gate昇格
- iOS物理端末Agentic QA
- Challenge追加拡張
- 重み付き総合Score / Trend / Ranking
- Unexpected FindingのBacklog自動連携
- Duplicate Rateの正式KPI化
- Challenge Impact SummaryのHard Gate化
- Scored Harnessの汎用化
- Runner Profileを跨ぐ統計的Model比較
- Challengeごとの高度なSetup Script / DB mutation system

---

## 13. 予定成果物

### Durable / Source-controlled

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
scripts/agentic-qa/**
training/agentic-qa/**
package.json
pnpm-lock.yaml              # dependency変更が本当に必要な場合だけ
.github/workflows/ci.yml
docs/curriculum/test-automation/**
```

Challenge Machine Contractのためだけにdependencyを増やさないため、JSON parsing + Existing `zod`を使う。

### Generated / Runtime

```text
output/spec-site/**
.artifacts/**
<temporary disposable benchmark-source-copy>/**
<temporary isolated scored-run-root>/**
```

原則Git管理しない。

---

## 14. Implementation PRのLogical Commit / Review単位

1. `docs: establish current product specification`
2. `docs: define acceptance criteria and change process`
3. `feat: add specification html generator`
4. `ci: validate and publish specification artifact`
5. `docs: define agentic exploratory qa workflow`
6. `test: add isolated agentic qa challenges`
7. `docs: integrate agentic qa into curriculum`
8. `docs: align repository entry points with specification`
9. `test: validate specification and agentic qa contracts`

PRは1本。無関係なProduct Fixを混ぜない。

---

## 15. Final architecture

```text
                  docs/spec/
              Specification System
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
 Normative Product        Supporting /
 Behavior SSOT            Operational
 scope / roles /          README / process /
 state / UI /             deviations /
 features / BR / AC       unresolved
          │
     ┌────┼───────────────┐
     ▼    ▼               ▼
 Human   Developer/QA   AI Oracle
  │                       │
  ▼                       ▼
Static HTML          Spec-driven QA
          \             /
           BR / AC / Risk
                │
       ┌────────┴────────┐
       ▼                 ▼
Deterministic        Risk-based
Automation           Agentic QA
       └────────┬────────┘
                ▼
         Evidence / Finding
                ▼
      Regression / Spec Feedback

Normal / Gray-box QA
Repository Root
  └─ existing readonly
       → Write Boundary

Black-box Scored
Preparation Process
  ├─ validate JSON / Cross-file contracts
  ├─ derive Required Coverage from challenge.json
  ├─ resolve spec_refs → learner-safe Normative file bundle
  ├─ Benchmark Revision
  ├─ Runner Profile
  ├─ Disposable Source Copy
  ├─ Baseline Sanity
  ├─ Instructor Unified Diff Patch
  ├─ Post-patch Sanity
  ├─ Build / Serve / Install
  ├─ isolated root
  ├─ learner-safe inputs only
  └─ Forbidden Probe
        │
        ▼
Fresh Source-free Runner
  + scored-v1 Tool Allowlist
  + fixed Budget / Stop Condition
  × Source / .git / tests / patch
  × artifact bytes
  × search / shell / evaluate
  × Answer Key / prior context
        │
        ▼
Atomic Findings + Required Coverage Results
        │
        ▼
Frozen Structured Result
        │
        ▼
Separate Evaluator
  + Instructor Answer Key
  + same Benchmark
  + same Runner Profile
  + matches[]
        │
        ▼
evaluation.json

Unexpected true defect
  → original Run invalid
  → new Benchmark Revision
  → Fresh Re-run
```

---

## 16. 実装開始時の固定原則

- 最初にPR #14、PR #13、他依存PRのMerge状態を確認する。
- 最新`main`の事実を本Planより優先するが、Core Contract変更が必要なら勝手に変更せずOwner Decisionを求める。
- Current `AGENTS.md`のStrict workflowに従う。
- `docs/spec/`全体をNormative Oracle化しない。
- Feature Required 5 Section / BR / AC Grammarは本Planのexact contractを使う。
- Challenge / Answer Key / Tool ProfileはJSON + Zod、本PlanFixed Pathを使う。
- `spec_refs[]`は定義3形式以外を許可しない。
- Required Coverageの唯一の正本は`challenge.required_coverage`とする。
- `qa-findings.coverage.required_ids` / `coverage.items`を独自編集せずChallengeからderiveして完全一致検証する。
- Learner-safe Spec Bundleは`spec_refs[]`のOwner Normative Markdown File全体だけで構成し、Supportingや無関係Fileを暗黙追加しない。
- Challenge DefectはInstructor-only Unified Diff Patchで注入し、Disposable Source Copyにだけ適用する。
- Challenge注入目的の任意setup scriptを初期版へ追加しない。
- Normal readonlyとBlack-box Isolationを同一視しない。
- Scored RunnerはFresh Session + isolated root + Positive Tool Allowlistを成立条件とする。
- Benchmark RevisionなしのScored Resultを比較可能成果物にしない。
- Clean committed Benchmark以外はCanonical Manifest + SHA-256でRevisionを作る。
- Runner Profileなしで異なるModel / Tool / Budget条件を同一条件比較しない。
- Budget固定不能値は`null`で記録し、omit / 推測しない。
- Tool Profile Revisionは実際に使用した`scored-v1.json` bytesのSHA-256を使う。
- `fp_non_defect`はPrecision用FPのsubsetとして1回だけPrecisionへ寄与させる。
- Product Defectとして提出された`invalid_non_atomic`をPrecisionから逃がさない。
- Ground Truth変更時は元Runを新Benchmarkへ付け替えずFresh Re-runする。
- Local Blockerで全Goalを止めず、独立Taskを継続する。
- Final Validationは未解消Required Blockerがあればfail-closeする。
- 目的は文書量を増やすことではなく、人間とAIが同じ期待値からQAできる状態を作ることである。
