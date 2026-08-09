# Scenario Shop 仕様SSOT・Acceptance Criteria・AIエージェントQA基盤 統合実装計画

## 0. 依頼概要

- 依頼内容:
  - 現在進行中の他PRを先にマージし、その後テスト自動化カリキュラムPR #13をマージした最新`main`を基準に、Scenario Shopの現在仕様を整理する。
  - Markdownを人間・AIエージェント共通の仕様正本（SSOT）とする。
  - 仕様変更・更新手順を整備する。
  - Business RuleとAcceptance Criteriaを明文化し、既存テストや将来のAIエージェントQAから追跡できる状態にする。
  - Markdownから人間向け静的HTMLを機械生成する。
  - 仕様をTest Oracleとして利用するAIエージェント探索QAのWorkflow、Finding契約、Evidence契約、評価方法を整備する。
  - AIエージェントQAを既存のテスト自動化カリキュラムへ組み込む。
  - 上記を分割PRにせず、1本の実装PRとして最後まで完了させる。
- 背景:
  - 現在のRepositoryにはREADME、`/guide`、`docs/PROJECT_CONTEXT.md`、ADR、Seed Metadata、Application実装、Playwright / Maestro / Unit等のテストに仕様相当情報が分散している。
  - Testabilityは高いが、QAが「期待挙動」を一意に判断するための明示的なProduct Specification SSOTがない。
  - AIエージェントQAでは、仕様が分散したままだとAIが実装や既存Testを誤って仕様扱いし、False Positiveや誤った修正提案を増やすRiskが高い。
  - Repositoryには既にCodex Run、Plan / Review / Repair / Harness Improvement、安全境界、Playwright E2E、UI Review、Seed / Reset、Test Control、Native Harness、CI等の基盤があるため、新しい巨大なQA Platformを追加するのではなく既存基盤へ接続する。
- 期待成果:
  - `docs/spec/`を中心とするCurrent Product Specification SSOT。
  - Business Rule IDとAcceptance Criteria IDによる追跡可能な仕様。
  - 仕様更新契約と、実装・Test・AI QAまでの変更フロー。
  - Markdownから生成される人間向けHTML仕様サイト。
  - Specificationの構造・Link・ID・HTML生成を検証するCI Gate。
  - AIエージェント探索QA専用のEntry Point / Skill / Workflow / Finding Contract。
  - AIエージェントQAの教材・評価用Challenge / Answer Key。
  - 既存テスト自動化カリキュラムへのAIエージェントQA統合。

## 1. ゴール / 完了条件

### ゴール

Scenario Shopの現在仕様をMarkdownの単一正本として確立し、その仕様を人間、Developer、QA、AIエージェントが同じOracleとして利用できるようにする。さらに、Acceptance Criteria、仕様変更管理、静的HTML生成、AIエージェント探索QA、教材評価、カリキュラムまで一貫して接続する。

### 完了条件（DoD）

- [ ] 実装開始時点で、依存する他PRとカリキュラムPR #13が`main`へマージ済みである。
- [ ] 実装Branchがその最新`main`を基準としている。
- [ ] README、`/guide`、`docs/PROJECT_CONTEXT.md`、ADR、Seed、Application、Test、CI、Native実装を棚卸しし、仕様情報の重複・矛盾・古い記述を分類している。
- [ ] `docs/spec/README.md`がSpecificationの唯一の入口として機能する。
- [ ] Product Scope、Role / Permission、Business Rule、State / Transition、Web / Native差分、UI/UX Contract、主要Feature仕様がMarkdownで明文化されている。
- [ ] Markdown SpecificationをProductの規範的SSOTと定義し、Application Code、既存Test、Generated HTMLをSSOTとして扱わない契約が明記されている。
- [ ] Business Ruleに安定ID（`BR-*`）、Acceptance Criteriaに安定ID（`AC-*`）が付与され、重複なく追跡できる。
- [ ] Acceptance CriteriaとTest Caseを別概念として定義し、既存カリキュラムのTest Case IDと混同しない。
- [ ] 仕様変更時の更新順、Bug Fix時の扱い、緊急対応時の例外、仕様と実装の不一致時の扱いが文書化されている。
- [ ] Markdownから人間向け静的HTMLを生成できる。
- [ ] Generated HTMLを直接編集せず、Markdownからの一方向生成のみとする。
- [ ] HTMLは最低限Navigation、ページ内見出しAnchor、Table、Code block、Responsive表示を備える。
- [ ] HTML生成物はGit管理上のSSOTにせず、`output/`等の生成先へ出力する。
- [ ] Specification用ValidationでMarkdown、Relative Link、ID重複、参照整合、HTML Buildを検証できる。
- [ ] Specification Validationが既存`verify` / CIのRequired品質ゲートへ接続される。
- [ ] AIエージェントQA専用Entry PointとSkillが存在し、Code Review / Repairとは別Workflowとして定義されている。
- [ ] AI QAではSpecificationをOracleとして必ず参照し、既存Testや現在実装を根拠なく仕様扱いしない。
- [ ] AI QA中は原則としてApplication Codeを修正せず、Observe → Reproduce → Record → Continueを守る。
- [ ] FindingにOracle Reference、Severity、Confidence、Role、Seed、Platform、Viewport、Steps、Expected、Actual、Evidence、Reproducibility、Risk、推奨Regression Layerが記録される。
- [ ] Findingの再現、False Positive抑制、重複確認、停止条件が明文化されている。
- [ ] Web Agentic QAの標準経路としてPlaywright MCPを位置付ける。
- [ ] Native Agentic QAはAndroidを標準経路とし、既存Maestro / Test Control / Native wrapperを再利用する。利用可能なMobile / Maestro系MCPは補助経路として扱い、特定MCPがないと教材全体が成立しない設計にしない。
- [ ] AI QAを初期段階ではPR Required CI Gateにせず、Manual / On-demandの補助QAとして扱う。
- [ ] 教材用ChallengeとAnswer KeyがRepository内でReview可能な形で定義される。
- [ ] ChallengeのためにProduction Runtimeへ恒久的なFeature Flagや意図的Bugを混入させない。
- [ ] AI QA評価がFinding数だけではなく、Recall、Precision、False Positive、Evidence品質、Reproducibility、Severity妥当性等を含む。
- [ ] カリキュラムにAIエージェント探索QAが追加され、Part 1 CapstoneとPart 2導入設計へ接続される。
- [ ] 最終的に`pnpm run verify`、Specification Validation、対象Playwright / Native検証、Markdownlint、HTML Buildが成功する。
- [ ] 実装PRの差分が「Specification / Acceptance Criteria / HTML生成 / AI QA基盤 / 教材 / カリキュラム」の目的から逸脱していない。

## 2. 現状理解と前提

### Current understanding

#### Entry points

- `README.md`
  - Product Scope、主要Feature、Role、Test Account、Seed Scenario、Test API、Web / Native実行方法等を含む。
- `/guide`
  - 利用者・テスター向けの学習入口としてRole、Scenario、操作上の注意等を提供する。
- `docs/PROJECT_CONTEXT.md`
  - Codex運用、UI/UX基準、現在の実装判断、CI/CD、Native Foundation等のliving contextを持つ。
- `docs/adr/`
  - 重要な設計判断の履歴を持つ。
- `AGENTS.md` / `PLANS.md` / `CODE_REVIEW.md`
  - AIエージェントの作業、計画、Review契約を持つ。
- `.agents/skills/`
  - Plan / Code Review / Repair / Harness Improvement等のWorkflowを持つ。
- `src/seeds/metadata.ts`
  - 現在のScenario Metadataを機械的に定義する。
- `e2e/web/fixtures.ts`
  - Scenario Reset、Metadata確認、Console / Page Error Evidence等を提供する。
- `playwright.config.ts`
  - Web E2E、Accessibility、Cross-role、Mobile、UI Review、Artifact方針を持つ。
- `.github/workflows/ci.yml`
  - Format / Markdownlint / Lint / Typecheck / Security / Vitest / Build / Playwright / UI Review / Preview / Smoke等をGate化している。
- Native workflow / wrapper / Maestro Flow
  - Build、Install、Smoke、Test Control、Runtime / Boundary / Evidenceの既存経路を持つ。
- `docs/curriculum/test-automation/**`
  - PR #13マージ後、テスト分析→設計→Playwright→Maestro→保守→Git / CIまでの学習設計となる。

#### Main flow（現在）

```text
README / Guide / PROJECT_CONTEXT / ADR / Code / Test
        ↓ 仕様相当情報が分散
Developer / QA / AIが個別に解釈
        ↓
Playwright / Maestro / CIで検証
```

#### Main flow（目標）

```text
docs/spec/**/*.md  ← Product Specification SSOT
        │
        ├─ Human → Generated HTML
        ├─ Developer / Reviewer
        ├─ QA / Test Design
        └─ AI Agent Oracle
        ↓
Business Rule / Acceptance Criteria
        ↓
Risk / Test Case / Automation
        ↓
Playwright / Maestro / Lower-layer Test
        ↓
Agentic Exploratory QA
        ↓
Finding / Accepted Defect / Regression Feedback
```

#### Key abstractions

- Product Specification:
  - 「どうあるべきか」を定義する規範的SSOT。
- Business Rule:
  - FeatureやRole、Stateを跨いでも維持されるRule。`BR-*`で識別する。
- Acceptance Criteria:
  - Rule / Featureが外部からどう確認できるかを記述する。`AC-*`で識別する。
- Test Case:
  - Riskや条件から導出した検証項目。カリキュラム上の`CART-001`等とし、Acceptance Criteriaとは分離する。
- Seed Scenario:
  - 再現可能な初期状態。Specificationは意味と期待を記述し、実行可能なSeed実装との整合を検証する。
- Test Oracle:
  - QAがExpectedを判断する根拠。今回以降はCurrent `docs/spec/`を最優先とする。
- Generated HTML:
  - Human向けPresentation。正本ではない。
- Agentic QA Finding:
  - AI探索中の観測を、Oracle ReferenceとEvidence付きで再現可能に記録する成果物。

#### Existing tests / evidence

- Unit / Integration / Repository Contract / Component / Contract Test。
- Playwright Web E2E、Accessibility、Mobile Boundary、Cross-role、UI Review。
- Trace / Screenshot / Video / HTML Report。
- Scenario FixtureによるResetとConsole / Page Error収集。
- Native Maestro Flow、Test Control、Contract Harness、Runtime / Boundary Suite。
- GitHub ActionsでのBuild、Preview、Smoke、Artifact。

#### Safe change surface

- `docs/spec/**`の新設。
- `docs/reference/**`の更新手順・Agentic QA Reference追加。
- `AGENTS.md`等のEntry Point更新。
- `.agents/skills/`へのAgentic QA Skill追加。
- Specification Build / Validation用の小さな`script`追加。
- `package.json`へのSpec用script追加と最小限のMarkdown Parser依存追加。
- `.github/workflows/ci.yml`へのSpec Validation接続。
- `docs/curriculum/test-automation/**`のAI QA統合。
- 教材用Challenge / Answer Keyの追加。

#### Unknowns

- 実装開始時点の`main`は現在の`main`と異なる。進行中の他PRおよびPR #13マージ後に、仕様情報・Native Scope・CI・Agent基盤を再Mappingする必要がある。
- 進行中PRで既にSpecification、Agentic QA、HTML Docsに相当する実装が追加された場合は重複を作らず統合する。
- 現在分散している情報に矛盾がある場合、Codeの現状を自動的に「正しい仕様」とみなしてはならない。ADR、履歴、既存文書、Product意図を照合し、それでも決められない場合はOwner Decisionを求める。

### Assumptions

- 実装は依存PRとPR #13がマージされた後に開始する。
- 今回保存するPlan Branchは計画保存用であり、実装開始前には必ず最新`main`との差分を再確認する。
- 実装自体は1本のFeature Branch / 1本のPRで完結させる。
- Markdown Specificationが唯一の規範的Product Specification SSOTとなる。
- Git履歴をVersion管理として利用し、仕様書独自の手動Version番号は原則追加しない。
- Generated HTMLはCommit対象にせず、ローカルまたはCI Artifactへ出力する。Repository事情によりCommitが必要と判明した場合でもGeneratedであることを機械検証する。
- HumanとAIで別仕様を作らない。両者とも同じMarkdownを読む。
- SpecificationのNavigationは`docs/spec/README.md`を正本とし、HTML Navigationもそこから導出する。
- HTML GeneratorはDocusaurus / VitePress等のDocs Frameworkを導入せず、既存Node / TypeScript基盤に小さなGeneratorを追加する。
- Markdown Parserは実装開始時にPackage互換性を再確認した上で、Raw HTMLを既定で無効化できる軽量Parserを採用する。現時点の第一候補は`markdown-it`系とする。
- AI QAはLLMの非決定性を持つため、初期Required CI Gateにはしない。
- AI QAで見つかったFindingは自動修正しない。Finding受理後に通常のImplementation / Repair Workflowへ渡す。

### Non-goals

- Product機能の全面改修。
- Specificationに合わせる名目で、棚卸し中に見つけた全Bugを同じPRで無条件に修正すること。
- 現在のPlaywright / Maestro Regression Suiteを全面的に書き換えること。
- HTMLを別の手動ドキュメントとして保守すること。
- Docusaurus、VitePress、CMS等の大規模Docs Platform導入。
- Specification用Databaseや外部SaaSの導入。
- AIエージェントQAをPR Required Checkにすること。
- LLMの出力を無検証でIssue / PRへ自動投稿すること。
- QA中のApplication自動修正。
- Challengeのために通常Production Runtimeへ恒久Feature Flagや意図的Bugを追加すること。
- Native後半未実装Featureを、このPRの都合で新規実装すること。
- 仕様HTMLの公開Hostingまでを必須DoDにすること。まず再生成可能なHTML出力とCI Artifactを成立させる。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

実装開始時の再Mappingで、次のいずれかが判明した場合のみOwner Decisionを求める。

1. 同一挙動について`docs` / ADR / 実装 / Testが明確に矛盾し、履歴からもProduct意図を確定できない。
2. 仕様化すると既存Product挙動をBreaking Changeする必要がある。
3. Challenge教材を成立させるためにProduction Pathへ意図的Bugを混入させる必要が生じる。
4. Human向けHTMLをArtifactではなく外部Hosting必須とする必要が生じる。
5. AI QAに使用できるToolが想定と異なり、Playwright MCPまたはNative既存経路で教材が成立しない。

### 仮定してよい細部

- File名やFeature分類の軽微な調整。
- HTMLのSpacingや色等、既存Design Token / UI基準で自然に決められるPresentation細部。
- Validation Script内部の関数分割。
- CI Job内のStep名。
- Generated outputの一時Path。

### 未回答の重要質問

- 現時点ではなし。
- ただし実装開始時の最新`main`再Mappingを開始Gateとし、そこで新しいBlocking Questionが出た場合は実装を停止して確認する。

## 4. 影響範囲

### Impacted areas

1. Product Specification / Documentation
2. Acceptance Criteria / Traceability
3. Specification Change Management
4. Static HTML Generator
5. Specification Validation / CI
6. AI Agent Operating Agreement
7. Agentic Exploratory QA Workflow
8. Evidence / Finding Contract
9. Agentic QA Training Challenge / Evaluation
10. Test Automation Curriculum
11. Existing README / Guide / Project Contextの責務整理

### Files to inspect（実装開始時に再確認）

#### Repository / Product context

- `README.md`
- `AGENTS.md`
- `PLANS.md`
- `CODE_REVIEW.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/**`
- `docs/reference/**`
- `docs/history/**`（必要な判断履歴のみ）

#### Product / Rule / State

- `src/domain/**`
- `src/application/**`
- `src/seeds/**`
- Role / permission関連定義
- Cart / Checkout / Payment / Order / Review / Admin Rule関連定義
- Web / Native Route定義
- Design Token / Responsive Contract関連実装

#### QA / Automation

- `e2e/web/**`
- `playwright.config.ts`
- `maestro/**`
- `tests/unit/**`
- `tests/integration/**`
- `tests/repository-contract/**`
- `tests/component/**`
- `tests/contracts/**`
- Native local wrapper / evidence scripts

#### CI / Build

- `package.json`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`（存在・現行役割を再確認）
- Markdownlint / Prettier / ESLint設定

#### Curriculum

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/part1/**`
- `docs/curriculum/test-automation/part2/**`

## 5. 変更方針

### Change strategy

実装は1本のPR内でWave順に進める。各WaveでReview可能な状態を保ち、後続Waveが前Waveの契約を前提にする。途中でProduct Bugを発見しても、SpecificationとAgentic QA基盤の完成を妨げない限り、無関係なProduct改善へScopeを拡張しない。

### Target Specification structure

初期構成は以下を基準とする。実装開始時の最新Product Scopeに応じてFeature Fileを増減するが、階層を過剰に深くしない。

```text
docs/spec/
├ README.md
├ glossary.md
├ product-scope.md
├ roles-and-permissions.md
├ state-and-scenarios.md
├ ui-ux-contract.md
├ known-deviations.md
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
   └ native-storefront-cart.md
```

Acceptance Criteriaは別Database / 別SSOTへ分離せず、関連Feature Specification内へ同居させる。SpecificationとAcceptance Criteriaの役割は見出しとIDで明確に分離する。

### ID convention

```text
BR-<AREA>-NNN
AC-<AREA>-NNN
```

例:

```text
BR-CART-001
AC-CART-001
AC-CART-002
```

ルール:

- IDは一度公開したら意味を別Requirementへ再利用しない。
- 削除・廃止時はGit履歴で追跡できるようにし、別Ruleへ番号を使い回さない。
- ACは少なくとも1つのBRまたは明示的なFeature Behaviorへ紐付ける。
- Test Case ID（例:`CART-001`）とは別Namespaceとする。
- UI Test ID / `testId`とも混同しない。

### Feature Spec template

各Feature Fileは原則として次を含む。

1. Purpose / Scope
2. Actors / Roles
3. Preconditions
4. Business Rules (`BR-*`)
5. State / Transition（必要な場合）
6. UI / Behavior Contract
7. Error / Boundary Behavior
8. Acceptance Criteria (`AC-*`)
9. Web / Native差分（該当する場合）
10. Out of scope
11. Implementation references（参考。正本ではない）
12. Related Test Case / Automation reference（追跡用。正本ではない）

### Oracle priority

AI QA / Human QAのExpected判断は次で統一する。

1. Current `docs/spec/**`の規範的記述
2. 同じSpecification内のBusiness Rule / Acceptance Criteria
3. ADR（判断理由。Current Specと矛盾する場合はSpec更新漏れとして扱う）
4. Application / Seed / Test / README / GuideはEvidence・実装参照。Specを暗黙に上書きしない。

Current Specと実装が矛盾する場合、実装へ合わせてSpecを書き換えるのではなくDeviationとして判定する。

### 実行タスク

#### Wave 0: Implementation Start Gate / 最新`main`再Mapping

- [ ] 0-1. 進行中の依存PRがマージ済みであることを確認する。
- [ ] 0-2. カリキュラムPR #13がマージ済みであることを確認する。
- [ ] 0-3. 実装Branchを最新`main`へ合わせる。
- [ ] 0-4. `AGENTS.md`、`PROJECT_CONTEXT`、ADR、CI、Native Scope、Curriculumを再読する。
- [ ] 0-5. 本PlanのFiles / Scopeが最新構成と矛盾しないか更新する。
- [ ] 0-6. 既に他PRで実装された同等機能があれば重複を除く。

#### Wave 1: Current Specification Inventory

- [ ] 1-1. README、Guide、PROJECT_CONTEXT、ADR、Code、Seed、Testから仕様候補を抽出する。
- [ ] 1-2. Product ScopeをWeb / Native / Role / Feature単位で棚卸しする。
- [ ] 1-3. Business RuleをCart、Auth、Checkout / Payment、Order、Review、Admin等で抽出する。
- [ ] 1-4. Role / Permission Matrixを実装と既存文書から照合する。
- [ ] 1-5. State / TransitionをCheckout、Payment、Order、Shipment、Review等で照合する。
- [ ] 1-6. UI/UX Contractを現在のDesign Token、Responsive Boundary、Accessibility契約から抽出する。
- [ ] 1-7. Seed Scenarioの意味・期待・推奨用途を照合する。
- [ ] 1-8. Web / NativeのCurrent ScopeとPlatform差分を確定する。
- [ ] 1-9. 矛盾を`document stale` / `implementation deviation` / `unknown owner decision`へ分類する。
- [ ] 1-10. 不明なProduct意図をCodeの現状だけで埋めない。

#### Wave 2: Markdown Specification SSOT確立

- [ ] 2-1. `docs/spec/README.md`を作成し、SSOT契約、読み順、Oracle優先順位を定義する。
- [ ] 2-2. `glossary.md`でTest Case ID / AC / BR / Seed Scenario / User Journey / Maestro Flow / Automation Flow等を整理する。
- [ ] 2-3. `product-scope.md`を作成する。
- [ ] 2-4. `roles-and-permissions.md`を作成する。
- [ ] 2-5. `state-and-scenarios.md`を作成する。
- [ ] 2-6. `ui-ux-contract.md`を作成する。
- [ ] 2-7. Feature Specificationを現在Scope全体について作成する。
- [ ] 2-8. Business Ruleへ`BR-*`を付与する。
- [ ] 2-9. Acceptance Criteriaへ`AC-*`を付与し、RuleとFeatureへ追跡可能にする。
- [ ] 2-10. `known-deviations.md`へ「期待仕様は確定しているが現行実装が異なる」既知Deviationのみ記録する。単なる未確認事項は入れない。
- [ ] 2-11. README / Guide / PROJECT_CONTEXTの重複仕様記述を減らし、詳細は`docs/spec`へ参照させる。運用・セットアップ等の責務は各文書に残す。

#### Wave 3: Specification Change Process / Traceability

- [ ] 3-1. `docs/spec/change-process.md`を作成する。
- [ ] 3-2. 通常Feature変更の順序を`Spec → AC → Risk / Test Design → Implementation → Automation → Agentic QA`として定義する。
- [ ] 3-3. Bug Fixで「既存Spec違反を直す場合」と「仕様変更が必要な場合」を分離する。
- [ ] 3-4. 緊急修正でも同一PR内でSpec同期を完了する原則を定義する。
- [ ] 3-5. Spec / Implementation / Testの不一致時のDecision Ruleを定義する。
- [ ] 3-6. `feature-spec.md`テンプレートを作成する。
- [ ] 3-7. AGENTS / Planning / Review契約から変更対象FeatureのSpecを事前確認するよう接続する。
- [ ] 3-8. Code ReviewでBehavior変更時のSpec / AC更新漏れを確認対象へ追加する。

#### Wave 4: Markdown → Static HTML Generator

- [ ] 4-1. `docs/spec/**/*.md`だけをSourceとするGeneratorを追加する。
- [ ] 4-2. Raw HTMLを既定無効とするMarkdown Parserを使用する。
- [ ] 4-3. `docs/spec/README.md`からHuman向けNavigationを導出する。
- [ ] 4-4. Heading Anchor、Page TOC、Table、Code Block、Relative Linkを変換する。
- [ ] 4-5. 既存UI基準と矛盾しない軽量Responsive CSSをGenerator管理下で出力する。
- [ ] 4-6. 出力先を`output/spec-site/`等のGenerated Directoryとし、Source TreeへHTMLを手動保存しない。
- [ ] 4-7. `pnpm run build:spec`を追加する。
- [ ] 4-8. CI ArtifactとしてHumanが生成HTMLを確認できるようにする。
- [ ] 4-9. 初期版では外部Hosting、認証、全文検索を必須にしない。

#### Wave 5: Specification Validation / CI Gate

- [ ] 5-1. Spec MarkdownがMarkdownlintを通ることを確認する。
- [ ] 5-2. `BR-*` / `AC-*`の重複を検出するValidatorを追加する。
- [ ] 5-3. ACから参照するBR等の存在確認を追加する。
- [ ] 5-4. `docs/spec`内Relative LinkのBroken Linkを検出する。
- [ ] 5-5. HTML Build失敗を検知する。
- [ ] 5-6. `pnpm run validate:spec`を追加する。
- [ ] 5-7. `pnpm run verify`へSpec Validation / Buildを接続する。
- [ ] 5-8. `.github/workflows/ci.yml`の既存Quality Gateへ追加する。独立Jobを増やす必要がなければ既存Style / Code Qualityへ統合し、CI肥大化を避ける。
- [ ] 5-9. Generated HTMLをCI ArtifactとしてUploadし、PR Reviewerが閲覧できるようにする。

#### Wave 6: AIエージェント探索QA専用Workflow

- [ ] 6-1. `QA_AGENT.md`をAI QA Entry Pointとして追加する。
- [ ] 6-2. `.agents/skills/exploratory-qa/SKILL.md`を追加する。
- [ ] 6-3. `docs/reference/agentic-qa-workflow.md`を追加する。
- [ ] 6-4. Agentic QA開始前に対象Spec / BR / AC、Role、Seed、Platform、Viewport、Charterを固定する。
- [ ] 6-5. Web標準経路をPlaywright MCPによる実操作とする。
- [ ] 6-6. Native標準経路をAndroid + 既存Test Control / Maestro / wrapperとする。Mobile / Maestro系MCPが使える場合は補助経路として利用する。
- [ ] 6-7. QA Run中はApplication Codeを原則Read-onlyとし、Finding確定前に修正しない。
- [ ] 6-8. Observation / Inference / Opinionを分ける。
- [ ] 6-9. Finding成立時はOracle Referenceを必須にする。
- [ ] 6-10. Finding Contractを定義する。
- [ ] 6-11. Reset可能なFindingは原則2回以上再現し、Seed / Role / Viewportを記録する。
- [ ] 6-12. Screenshot、URL、Console、Trace / Video、Native Evidence等のEvidence優先順位を定義する。
- [ ] 6-13. Duplicate Finding確認方法を定義する。
- [ ] 6-14. Severity / Confidence基準を定義する。
- [ ] 6-15. 停止条件を「固定周回数」ではなくRisk / Role / State / Journey / Platform / Viewport CoverageとCharter完了で定義する。
- [ ] 6-16. Tool failure、Environment failure、Product findingを混同しないFailure分類を定義する。
- [ ] 6-17. Finding受理後は通常のRepair / Implementation Runへ渡す。

### Agentic QA Finding schema

最低限以下を含む。

```text
Finding ID
Title
Severity
Confidence
Oracle Reference (BR / AC / Spec section)
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

#### Wave 7: AI QA教材Challenge / Answer Key / Evaluation

- [ ] 7-1. Challengeを通常Production Pathへ混入させない構成を決定する。
- [ ] 7-2. Repository内でReview可能なChallenge DefinitionとInstructor Answer Keyを作成する。
- [ ] 7-3. 必要な意図的DefectはTraining用のDisposable Copyへだけ適用できるPatch / Setupとして保持し、通常App Buildでは有効化しない。
- [ ] 7-4. Challenge適用前後を明確にし、元Repositoryへ意図しない変更が残らない手順を定義する。
- [ ] 7-5. Basic / Intermediate / Advancedの段階を用意する。
- [ ] 7-6. Functional、Role、State、Error、Responsive、Accessibility、UI/UX、False Positive誘発要素を混ぜる。
- [ ] 7-7. Answer Keyに「Defect」「Expected behavior（非Defect）」「Evidence」「Oracle Reference」「Severity目安」を含める。
- [ ] 7-8. 評価指標をRecallだけにせず、Precision、False Positive Rate、Evidence Quality、Reproducibility、Severity Accuracy、Coverageで評価する。
- [ ] 7-9. Challenge生成・適用が過剰に複雑になる場合は、Training Copy配布時にInstructorがPatch済みZIPを生成する方式を優先し、Production RuntimeへFeature Flagを追加しない。

#### Wave 8: カリキュラム統合

- [ ] 8-1. `docs/curriculum/test-automation/README.md`の学習成果へSpecification / Acceptance Criteria / Agentic QAを追加する。
- [ ] 8-2. Part 1前半のScenario Shop分析で、実装探索前にCurrent Specを確認する流れを追加する。
- [ ] 8-3. Test DesignでBR / AC → Risk → Test Caseの関係を追加する。
- [ ] 8-4. Part 1-8保守モジュールへ仕様変更時のSpec / AC / Test同期を追加する。
- [ ] 8-5. 新規`Part 1-9: AIエージェントによる探索的QA`を追加する。
- [ ] 8-6. 既存Part 1 CapstoneをPart 1-10へ移動し、参照を更新する。
- [ ] 8-7. Agentic QA Moduleで、AI QAとDeterministic Regression Automationの違いを明示する。
- [ ] 8-8. Playwright MCP、Seed / Test Control、Charter、Oracle、Finding、Evidence、False Positive、Regression還元を教材化する。
- [ ] 8-9. Native Agentic QAはAndroidを標準とし、iOSを完了条件にしない。
- [ ] 8-10. Part 1 Capstoneへ`Human-designed tests + Automation + Agentic QA + Validated Findings + Regression feedback`を追加する。
- [ ] 8-11. Part 2の変更管理 / PR Review / Integration Design CapstoneへSpec更新とAI QAの運用位置付けを追加する。
- [ ] 8-12. AI QAをRequired CI Gateにしない理由と、Manual / On-demand / Release前補助としての使い分けを教材化する。

#### Wave 9: Existing Documentation Responsibility Cleanup

- [ ] 9-1. Root READMEはSetup / Product Overview / Entry Link中心へ整理し、詳細RuleをSpecへリンクする。
- [ ] 9-2. `/guide`はApplication利用・学習用Guideとして残し、Product Specの正本扱いをやめる。
- [ ] 9-3. `PROJECT_CONTEXT.md`はAI作業・Architecture / operational contextへ責務を限定し、Product Ruleの重複をSpec参照へ寄せる。
- [ ] 9-4. ADRは過去判断理由として残し、Current Specとの矛盾を放置しない。
- [ ] 9-5. Existing TestはRegression assetとして扱い、Specの代替にしないことを明記する。

#### Wave 10: Full Validation / Review / One-PR Completion

- [ ] 10-1. `pnpm run format:check`。
- [ ] 10-2. `pnpm run lint:markdown`。
- [ ] 10-3. `pnpm run validate:spec`。
- [ ] 10-4. `pnpm run build:spec`。
- [ ] 10-5. `pnpm run lint`。
- [ ] 10-6. `pnpm run typecheck`。
- [ ] 10-7. Spec Validator / Generator用Unit Test。
- [ ] 10-8. 必要な既存Unit / Integration / Contract / Component Test。
- [ ] 10-9. `pnpm run test:e2e:chromium`。
- [ ] 10-10. `pnpm run test:a11y`。
- [ ] 10-11. `pnpm run test:e2e:mobile-boundary`。
- [ ] 10-12. Agentic QA WorkflowをCurrent AppでDry Runし、少なくとも1つのCharterについてFinding 0件でもEvidence / Coverage /終了理由が残ることを確認する。
- [ ] 10-13. Android環境が利用可能ならNative Agentic QA手順をDry Runする。利用不可の場合は既存Native CI / Maestro契約と静的整合を確認し、未実施を明記する。
- [ ] 10-14. `pnpm run verify`。
- [ ] 10-15. GitHub ActionsでSpec Gateを含む既存Required CIが成功することを確認する。
- [ ] 10-16. Generated HTML Artifactを実際に開き、Navigation、Anchor、Table、Code block、Responsiveを人間視点で確認する。
- [ ] 10-17. Spec / AC / Challenge Answer KeyをAIエージェントに読ませ、参照先とOracle優先順位を誤解しないか確認する。
- [ ] 10-18. PR差分を再Reviewし、Product Bug修正や無関係なRefactorが混ざっていないことを確認する。

## 6. 検証方法

### Validation plan

#### Static specification validation

- Markdownlint。
- Relative link validation。
- BR / AC ID uniqueness。
- BR / AC reference integrity。
- Required section validation（Feature Spec Templateに必須Sectionがあるか。過剰なSchema強制はしない）。
- Generated HTML Build。

#### Generator tests

- Markdown見出しから安定Anchorを生成できる。
- Relative LinkがGenerated HTML内で正しく解決される。
- Navigation順が`docs/spec/README.md`から導出される。
- Raw HTMLが実行可能な形で出力されない。
- Table / Code blockが保持される。
- 生成先がSource Markdownを変更しない。

#### Product regression

Specification整理自体でProduct Behaviorを変更しない場合でも、CI変更やDependency追加の影響を確認するため既存`verify`を通す。

#### Agentic QA workflow validation

- Specを読まずに探索開始できない契約になっている。
- CharterにRole / Seed / Risk / Platform / Viewport / Mission / Stop conditionが入る。
- FindingにOracle Referenceがない場合は完成扱いにならない。
- Spec上のExpected BehaviorをFalse PositiveとしてFinding化しない例を確認する。
- Reset可能なFindingで再現確認を行う。
- QA中にApplication Codeを自動修正しない。
- Tool / Environment FailureをProduct Defectへ分類しない。

#### Curriculum validation

- Part 1 / Part 2のLinkと番号が整合する。
- 既存用語（Test Case ID / UI Test ID / Seed Scenario / User Journey / Maestro Flow / Automation Flow）と新規BR / ACが矛盾しない。
- AI QAをAutomationの代替として説明しない。
- Challengeの答えをLearner向け本文へ露出しない。

### 成功判定

- 上記DoDをすべて満たす。
- `pnpm run verify`が成功する。
- GitHub Actions Required CIが成功する。
- SpecificationのSourceがMarkdownだけで一意に追える。
- Generated HTMLを削除してもMarkdownから完全再生成できる。
- HumanとAI Agentが同じSpecから同じBusiness Rule / Acceptance Criteriaを参照できる。
- AI QAのFindingが「AIの感想」ではなく、OracleとEvidenceに基づくQA成果物として再現できる。
- すべて1本のImplementation PR内でReview可能であり、別PRを前提にしない。

## 7. リスクと未解決論点

### Risks

#### R1. Scopeが大きい

- Risk:
  - Specification、Generator、CI、AI QA、Curriculumを1PRへ統合するため差分が大きくなる。
- Mitigation:
  - Wave順とCommit単位を分離する。
  - 各Waveで責務を明確化し、Product機能改修を混ぜない。
  - 最終的にはSquash Merge可能だが、Review中は論理Commitを保つ。

#### R2. 現状実装を誤って仕様化する

- Risk:
  - Bugや偶然の挙動をCurrent Specとして固定してしまう。
- Mitigation:
  - Codeだけを根拠にしない。
  - README、Guide、ADR、Test、History、Ruleを横断する。
  - 不明なものはOwner DecisionまたはKnown Deviationへ分離する。

#### R3. MarkdownとCodeの二重管理

- Risk:
  - Role、Seed、Status等の値がMarkdownとCodeでずれる。
- Mitigation:
  - MarkdownをNormative Behavior SSOTとし、CodeをExecutable implementationと明確に分ける。
  - すべての低レベル値をMarkdownへ複製しない。
  - 重複が必要なPublic ContractだけValidatorで整合確認する。

#### R4. Spec Validatorの過剰設計

- Risk:
  - Markdownが疑似Database化し、仕様を書く負荷が高くなる。
- Mitigation:
  - 初期必須MetadataはBR / AC IDとReference程度に限定する。
  - Front Matterの大量項目を要求しない。
  - Validatorは壊れやすいFormattingまで強制しない。

#### R5. HTML Docs Platformの肥大化

- Risk:
  - Documentation Framework導入がProductより重くなる。
- Mitigation:
  - Static Generator + CSS + Navigationだけから開始する。
  - Hosting / Full-text Search / CMSはNon-goal。

#### R6. AI QA False Positive

- Risk:
  - AIが仕様外の期待を作る。
- Mitigation:
  - Oracle Reference必須。
  - Confidence / Evidence / Reproduction必須。
  - Expected behaviorのChallengeを混ぜPrecisionを評価する。

#### R7. AI QAをCI Gate化して不安定化

- Risk:
  - LLM Variation、Cost、Tool FlakinessがPR Gateへ入る。
- Mitigation:
  - Manual / On-demandを初期標準とする。
  - Deterministic Regressionは既存Playwright / Maestro / lower layerに戻す。

#### R8. Challengeが通常Productを汚染する

- Risk:
  - 意図的BugやFeature FlagがProduction Pathへ残る。
- Mitigation:
  - Disposable Training Copy向けPatch / Setupを採用する。
  - Answer Key / Challenge Definitionは通常Runtimeから分離する。
  - Challenge適用状態をCIの通常Product Buildへ持ち込まない。

#### R9. Curriculumの難易度過多

- Risk:
  - 初学者がSpecification、AC、Automation、AI QAを一度に学ぶ。
- Mitigation:
  - Part 1前半ではSpecを「読む」ことから開始する。
  - BR / AC作成はTest Designと接続する。
  - AI QAはPlaywright / Failure Analysis / Maintainabilityを学んだ後に配置する。

### Open questions

- Implementation Start Gate時点で最新`main`を再確認して更新する。
- HTML公開先は今回DoDに含めない。将来必要になった場合のみ別途Product / Infrastructure判断を行う。
- Native iOS Agentic QAは環境依存が大きいため、今回の必須完了条件にはしない。既存iOS CI / Maestroの仕様整合は確認する。

## 8. 成果物

### 予定変更ファイル / Directory

```text
docs/spec/**
QA_AGENT.md
AGENTS.md
CODE_REVIEW.md
PLANS.md（必要な参照追加のみ）
docs/PROJECT_CONTEXT.md
docs/reference/agentic-qa-workflow.md
.agents/skills/exploratory-qa/**
scripts/spec/**
scripts/tests/spec-*.test.*
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
docs/curriculum/test-automation/**
training/agentic-qa/** または同等の教材Challenge領域
```

実際のPathはWave 0で最新Repository構造へ合わせる。

### 付随ドキュメント

- Current Product Specification
- Specification Change Process
- Feature Spec Template
- Agentic QA Workflow Reference
- Challenge / Instructor Answer Key
- Curriculum AI Agent QA Module

### 生成物（原則Git管理しない）

```text
output/spec-site/**
```

CIではArtifactとして確認できるようにする。

## 9. 実装時のCommit / Review単位

PRは1本だが、Reviewしやすいよう論理単位を分ける。

推奨Commit sequence:

1. `docs: establish current product specification`
2. `docs: define acceptance criteria and change process`
3. `feat: add specification html generator`
4. `ci: validate and publish specification artifact`
5. `docs: define agentic exploratory qa workflow`
6. `test: add agentic qa training challenges`
7. `docs: integrate agentic qa into curriculum`
8. `docs: align repository entry points with specification`
9. `test: validate specification and agentic qa contracts`

実装中の細部に応じて統合してよいが、無関係なProduct Fixと混ぜない。

## 10. 最終アーキテクチャ

```text
                    ┌──────────────────────┐
                    │ docs/spec/**/*.md    │
                    │ Product Spec SSOT    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
      Human / Reviewer    Developer / QA      AI Agent
              │                │                │
              │                │                │
              ▼                │                │
   Generated Static HTML       │                │
      (non-SSOT)               │                │
                               ▼                ▼
                         BR / Acceptance Criteria
                               │
                               ▼
                      Risk / Test Case Design
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       Deterministic Automation       Agentic Exploratory QA
 Playwright / Maestro / lower layer   Playwright MCP / Native
                │                             │
                └──────────────┬──────────────┘
                               ▼
                      Evidence / Finding
                               │
                               ▼
                       Accepted Regression
```

## 11. 備考

- 本Planは2026-08-09時点の`main`をMappingして作成しているが、実装開始条件は「進行中の他PRとカリキュラムPR #13がマージされた最新`main`」である。
- 実装開始前に必ずWave 0を実施し、本Planを最新Repositoryへ再同期する。
- 目的は文書量を増やすことではなく、仕様・Acceptance Criteria・Test・AI QAが同じ期待値を共有できる状態を作ることである。
- Specification Markdownは人間にもAIにも読みやすい自然文を優先し、過剰なMetadata Schemaや機械都合の記法を避ける。
- HTMLは閲覧性を上げるPresentation Layerであり、直接編集や別管理を行わない。
- AI Agent QAはDeterministic Test Automationの代替ではなく、未知RiskやUI/UX / Journey上の問題を探索し、妥当なFindingをRegressionへ還元する補助QAとして位置付ける。
