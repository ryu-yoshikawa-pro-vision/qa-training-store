# Agentic QA・テスト自動化 知見循環・実案件還元計画

- Plan Revision: `v01`
- Status: `Draft / Review Required`
- Created: 2026-08-15 JST
- Revised: 2026-08-15 JST
- Scope: Research / Experiment / Curriculum / Field Feedback Operating Plan

## 0. 位置づけ

この計画は、`qa-training-store`を単なるSample Application、Test Automation Repository、
またはAgent Framework Repositoryとして拡張し続けるための計画ではない。

本Repositoryを、Test Automation、Agentic Development、Agentic QAを実際に使って検証し、
得られたEvidenceを学習と実案件へ循環させるTraining / Experimental Platformとして運用するための
中長期Operating Planとする。

本Repositoryの目的は次のとおりである。

1. Test Automationを段階的に学習できること。
2. AI AgentによるDevelopmentを実験できること。
3. AI AgentによるQA / Test Process Automationを実験できること。
4. 比較可能なApproachをEvidence付きで評価できること。
5. 実験結果を再利用可能なKnowledgeへ変換できること。
6. 検証済みKnowledgeをCurriculumへ反映できること。
7. 実案件へ段階的に適用し、Field Evidenceを取得できること。
8. Field EvidenceをRepositoryへ戻し、次のQuestion / Hypothesisへ接続できること。

このPlanは、特定のAgent構成、Model、Tool、QA Modeを永続的な正解として固定しない。
現在のRepository Architecture自体もEvaluation対象である。

このPlanが定義するのは、何を正しいと信じるかではない。

> 何を、どのEvidenceに基づいて、どの範囲まで信じてよいかを判断し続けるための運用である。

---

## 1. North Star

Repositoryの主要成果を、機能数、Test Case数、Agent数、Automation率、AI生成率ではなく、
次の循環が継続的に成立していることと定義する。

```text
External Knowledge ───────┐
                          │
Field Problem ────────────┤
                          ↓
                       Question
                          ↓
                       Hypothesis
                          ↓
                 Controlled Experiment
                          ↓
                  Evidence / Metrics
                          ↓
              Reproduction / Refutation
                          ↓
                Knowledge Consolidation
                   ↙               ↘
              Curriculum          Field Pilot
                   ↑                  ↓
                   └──── Feedback ────┘
                          ↓
                     New Question
                          ↺
```

North Starは、Experiment件数を増やすことではない。

> 再現可能なEvidenceを増やし、何が有効で何が無効かを更新し続け、
> そのKnowledgeを他者が学習でき、実案件で安全に再利用できる状態を作る。

### 1.1 主要成果として扱わないもの

以下は手段または副次指標であり、それ自体を主要成果としない。

- Agentを追加したこと。
- Test Case数が増えたこと。
- Frameworkを追加したこと。
- Promptが長くなったこと。
- Automation率が上がったこと。
- AI生成コード率が上がったこと。
- Finding件数が増えたこと。

### 1.2 主要成果

主要成果は、重要なQuestionについて次をEvidence付きで説明できることである。

- 何を試したか。
- 何と比較したか。
- 何が起きたか。
- どの条件で成立したか。
- どの条件では成立しなかったか。
- 再現したか。
- 何がまだ不明か。
- Curriculumへ反映してよいか。
- 実案件へ適用してよいか。

---

## 2. SSOTと責務境界

このPlanはKnowledge lifecycleとExperiment governanceの正本である。
既存のSpecification、Agentic QA contract、Visual Specification、Curriculum contractを再定義しない。

### 2.1 正本

| 責務 | 正本 |
| --- | --- |
| Product Expected Behavior | `docs/spec/**` と既存Normative Specification |
| Agentic QAの実行・採点・Evidence Contract | `QA_AGENT.md`、`scripts/agentic-qa/**` と関連Contract |
| Visual Reference / Screen Contract | Screen Catalog / Visual Specificationの正本 |
| Curriculum / Competency / Training Contract | `docs/curriculum/**` とTraining Environmentの正本 |
| Experiment governance / Knowledge lifecycle | このPlan |

### 2.2 優先順位

このPlanと各領域の正本が矛盾する場合、実行仕様、採点式、Curriculum要件、Product Behaviorについては
各領域の正本を優先する。

このPlanは以下を定義する。

- Experimentをどのように開始・比較・停止するか。
- EvidenceからKnowledgeへどのように昇格するか。
- Knowledgeをいつ再検証するか。
- CurriculumやFieldへどのように移すか。

Metricの厳密な計算式やOfficial ScoreのValidity条件は、このPlanに複製しない。
必要な場合は各SSOTを参照する。

---

## 3. Experimentの種類と基本原則

すべてのExperimentへ同じ厳密さを要求しない。
目的に応じてExperiment Classを明示する。

### 3.1 Experiment Class

| Class | 目的 | 主な要求 |
| --- | --- | --- |
| `Exploratory` | 未知の現象、Failure、候補仮説を発見する | ObservationとEvidenceを残す |
| `Comparative` | 2つ以上のApproachを比較する | 比較条件と評価方法を事前に固定する |
| `Confirmatory` | 重要な仮説を反証可能な形で確認する | 事前登録、独立Run、反復、Invalid条件を要求する |
| `Field Pilot` | 実案件で適用可能性と制約を確認する | Security Boundary、Baseline、Confounderを要求する |
| `Educational` | 学習効果、理解度、Recovery能力を確認する | Learner条件と評価基準を明示する |

Exploratory ExperimentのObservationを、そのままConfirmatoryな結論へ昇格させない。

### 3.2 ExperimentはQuestionから開始する

「Agentを使う」「新Modelを試す」だけではExperimentとしない。

最低限、次の流れを持つ。

```text
Question
↓
HypothesisまたはExploratory Goal
↓
Comparison / Observation Design
↓
Evaluation Method
↓
Execution
↓
Result
↓
Interpretation
↓
Knowledge Decision
```

### 3.3 ResultとInterpretationを分離する

```text
Result
= 実際に観測・計測した事実

Interpretation
= Resultから導いた推論
```

因果を証明できない場合は、因果として断定しない。

### 3.4 成功だけをEvidenceとして扱わない

以下もKnowledge Sourceとして保存する。

- Failure
- Block
- False Positive
- False Negative
- Human Intervention
- Unexpected Regression
- Contradictory Result
- Invalid Run

### 3.5 未実行をPASS扱いしない

- 未実行は未実行。
- Evidence不足はEvidence不足。
- Capability不明は不明。
- Environment BlockをAgent Successへ変換しない。
- Agentの自己申告をGround Truthにしない。

### 3.6 Comparisonは同じOutcomeに対して行う

Human QA、Deterministic Automation、Agentic QAを常に同列の競合手段として扱わない。

先に比較対象となるCapability / Outcomeを定義する。

例:

- Known Regression Detection
- Unknown Defect Discovery
- Test Design
- Failure Diagnosis
- Implementation Review
- Repair

同じOutcomeを狙わないApproach間の数値差を、優劣として解釈しない。

### 3.7 Agent比較で単一Runから一般結論を出さない

AI Agentは非決定的であり、単一RunはPerformanceの代表値とは限らない。

Comparative / Confirmatory ExperimentでAgent性能差を論じる場合は、
必要な独立Run数を実行前に定める。

最低限、以下を区別して記録する。

- RunごとのResult
- 中央値または代表値
- ばらつき
- Best / Worst
- Failure率
- Invalid Run数

Run数を一律に固定しない。
Question、Cost、Observed Varianceに応じて決める。
ただし単一Runだけを根拠に、Agent構成やModelの優劣をRecommended Practiceへ昇格させない。

### 3.8 事後的な条件変更を同じExperiment成功として扱わない

Comparative / Confirmatory Experimentでは、実行前に最低限次を固定する。

- Hypothesis
- Variant
- Evaluation Method
- Required Metrics
- Stop Condition
- Invalid Run Condition
- Planned Run CountまたはRun Count決定ルール

Resultを見た後に条件、Metric、Prompt、Tool Scope等を変えた場合は、
同一Experimentの都合のよいContinuationではなく、Variantまたは新しいExperiment Revisionとして扱う。

---

## 4. Experiment Lifecycleと記録

### 4.1 Lifecycle

1. `Question`
2. `Classify`
3. `Design`
4. `Pre-register when required`
5. `Execute`
6. `Evaluate`
7. `Reproduce / Refute`
8. `Knowledge Decision`

### 4.2 Designで最低限決める項目

- Experiment ID
- Experiment Class
- Question
- HypothesisまたはExploratory Goal
- Task / Challenge
- Capability / Outcome
- Baseline / Comparison
- Independent Variable
- Controlled Variables
- Agent / Model / Mode
- Context Policy
- Tool Scope
- Repository / Product Revision
- Runtime Environment
- Ground TruthまたはEvaluation Method
- Required Metrics
- Stop Condition
- Invalid Run Condition
- Planned Run Countまたは決定ルール

### 4.3 実行原則

既存のRepository Harness、Run Artifact、QA Artifact、Scored E2E等を可能な限り再利用する。
Experiment専用Infrastructureは最小化する。

Execution中に条件変更が必要になった場合は、変更理由を記録し、必要に応じてRunをInvalidとする。

### 4.4 Human Baselineを使う場合

Human Baselineは「人間」という一種類の基準ではない。
最低限、比較可能性に影響する以下を記録する。

- Experience band
- Role / Background
- Tool allowance
- Time budget
- Specification access
- Training Environment familiarity

個人評価を目的とせず、不要な個人情報は記録しない。

### 4.5 最小Experiment Record

初期段階では新しいDatabaseやExperiment Management Applicationを作らない。
既存Artifactまたは軽量なMachine-readable Recordを利用する。

Logical Contractの最低限は次とする。

```yaml
experiment_id:
experiment_class:
question:
hypothesis_or_goal:
capability:
source_revision:

variants: []
controlled_variables: []

environment:
  platform:
  runtime:

execution:
  planned_run_count:
  completed_run_count:
  invalid_run_count:
  stop_condition:
  invalid_conditions: []

evaluation:
  method:
  ground_truth_ref:
  required_metrics: []

results: []
evidence_refs: []
interpretation:
conclusion:
knowledge_refs: []
next_action:
```

全Experimentで全Metricを収集する必要はない。
Questionに必要なものだけをRequiredにする。

---

## 5. EvidenceとKnowledge Model

Knowledgeを単一の成熟度階段で管理しない。
Evidenceの再現性、外部支持、Field適用、推奨状態は異なる概念として分離する。

### 5.1 Evidence Status

| Status | 定義 |
| --- | --- |
| `hypothesis` | 未検証の仮説 |
| `observed` | 条件とEvidence付きで少なくとも1回観測した |
| `reproduced` | 独立Runまたは条件差を含む複数Runで再現した |
| `conflicting` | 有効なEvidence同士が矛盾している |

同一RunのRetry、実質同一Contextの再試行、失敗後に条件を調整した成功だけでは
`reproduced`としない。

### 5.2 External Support

| Status | 定義 |
| --- | --- |
| `none` | 外部Evidenceを確認していない |
| `supporting` | 独立した外部Evidenceが支持している |
| `mixed` | 支持と反証が混在している |
| `conflicting` | 主要な外部EvidenceがRepository Observationと衝突している |
| `not_applicable` | 外部支持が判断に不要または適用不能 |

### 5.3 Field Status

| Status | 定義 |
| --- | --- |
| `not_tested` | 実案件未検証 |
| `shadow` | Release Decisionへ使わず並行評価した |
| `assist` | Human Decision前提で実務補助に利用した |
| `bounded` | 明示Scope内でAgentic Flowを利用した |
| `risk_based` | Risk条件に基づき限定的な自律運用へ進んだ |

### 5.4 Recommendation Status

| Status | 定義 |
| --- | --- |
| `experimental` | 研究・試行段階 |
| `candidate` | 再利用候補だが標準推奨ではない |
| `recommended` | 適用条件・制約・Failure条件まで説明可能な推奨Practice |
| `stale` | 再検証Triggerにより現時点の推奨有効性が未確認 |
| `deprecated` | 新しいEvidenceにより非推奨、限定化、または置換された |

`deprecated`はEvidenceの成熟度ではなくLifecycle状態として扱う。

### 5.5 Knowledge Identity

再利用するKnowledgeにはIdentityとTraceabilityを持たせる。

Logical Contractは次を最低限とする。

```yaml
knowledge_id:
claim:

applies_to: []
does_not_apply_to: []

evidence_status:
external_support:
field_status:
recommendation_status:

evidence_refs: []
conflicting_evidence_refs: []

validated_at:
validated_against:
  model_or_runtime:
  tool_revision:
  repository_revision:

revalidation_triggers: []

supersedes: []
superseded_by: []
```

最初からKnowledge Databaseを作る必要はない。
Markdown / YAML等の軽量形式で十分である。
ただしKnowledge IDとEvidence Referenceは省略しない。

### 5.6 Recommendation昇格原則

`recommended`への昇格は、単一のStatusだけでは決めない。
少なくとも以下を確認する。

- Evidenceが複数Runまたは複数条件で支持されている。
- 重大なConflicting Evidenceが未整理のまま残っていない。
- 適用条件とNon-applicable Conditionsを説明できる。
- Failure SignとRecoveryまたはRollbackを説明できる。
- 外部EvidenceまたはField Evidenceが必要なテーマでは、それらも確認している。

すべてのKnowledgeにField Testを必須としない。
ただし実案件の標準Practiceとして推奨する場合は、Field Evidenceを強く要求する。

---

## 6. Failure TaxonomyとMetrics

### 6.1 Failure Taxonomy v1

初版として以下を使用し、実Experimentで分類不能や重複が増えた場合に改訂する。

| Code | 意味 |
| --- | --- |
| `SPEC_AMBIGUITY` | Specification / Acceptance Criteriaが曖昧 |
| `CONTEXT_MISSING` | 必要Contextが提供されていない |
| `CONTEXT_OVERLOAD` | 不要情報が判断を阻害した |
| `ORACLE_FAILURE` | Expected Behaviorを誤認した |
| `AGENT_REASONING_FAILURE` | 必要情報は存在したが推論・計画・判断を誤った |
| `TOOL_FAILURE` | Browser / MCP / Maestro / CLI等のTool実行失敗 |
| `ENVIRONMENT_FAILURE` | Build / CI / Runtime / Emulator / Network等の環境失敗 |
| `AUTOMATION_FLAKE` | Deterministic Automation自体が不安定 |
| `FALSE_POSITIVE` | DefectでないものをFindingとした |
| `FALSE_NEGATIVE` | Ground Truth上のDefectを検出できなかった |
| `DUPLICATE_FINDING` | 同一原因を複数Findingとして過大計上した |
| `OVER_REPAIR` | 必要範囲を超えて修正した |
| `UNDER_REPAIR` | Root CauseまたはRequired Scopeを修正しきれなかった |
| `REGRESSION_INTRODUCED` | 修正により新しいRegressionを導入した |
| `SCOPE_VIOLATION` | 許可されていない責務やSourceへ変更した |
| `HUMAN_INTERVENTION` | Agent単独では継続不能で人間介入が必要だった |
| `EVALUATION_FAILURE` | Evaluator / Ground Truth / Metric計算に問題があった |
| `RUN_INVALID` | Evidence不足や条件逸脱によりExperimentとして無効 |

Agent能力不足、Specification不足、Tool不足、Environment不足を混同しない。

### 6.2 Metric Strategy

MetricはQuestionに必要なものだけを選択する。
Official Agentic QAのMetric定義と計算式は既存SSOTを正とし、このPlanでは再定義しない。

主な候補は以下である。

- QA: Recall、Precision、False Positive Rate、Coverage、Reproduction Rate
- Development: First-pass Success、Repair Success、Regression Introduction、Scope Violation
- Delivery: Lead Time、Cycle Time、Human Active Time、Change Failure
- Cost: Agent Runtime、Tool Action、CI Runtime、Agent Cost
- Education: Completion、Failure Analysis Success、Time to Competency、Instructor Intervention

以下を単独のSuccess KPIにしない。

- AI生成コード率
- Agent利用回数
- Test Case増加数
- Automation率
- Token使用量の少なさ
- PR数
- Finding件数

---

## 7. External Knowledge Intake

外部Knowledgeはすべて同じ扱いにしない。

### 7.1 Source Claim Class

| Class | 例 | 扱い |
| --- | --- | --- |
| `Normative / Constraint` | Security、契約、法令、Repository policy | Experiment対象ではなく制約として扱う |
| `Tool Fact` | Official Documentation上のAPI仕様 | 一次情報で確認し、必要に応じてCompatibilityを検証する |
| `Empirical Claim` | 「このAgent構成は品質を改善する」 | 原則Hypothesisとして検証する |
| `Anecdotal Observation` | Blog、Conference Talk、個別事例 | 仮説候補として扱う |

「外部情報はすべて仮説」と単純化しない。
一方で、外部のEmpirical ClaimをRepository固有のBest Practiceへ直接昇格させない。

### 7.2 Intake Record

長文要約を蓄積すること自体を目的にしない。
最低限、次を残す。

```yaml
claim:
claim_class:
source:
source_type:
published_or_observed_at:
why_relevant:
current_assumption_challenged:
proposed_experiment:
priority:
```

---

## 8. Curriculum Promotion

Experiment Resultを直接Core Curriculumへ反映しない。

```text
Experiment Result
↓
Knowledge Review
↓
Recommendation Decision
↓
Curriculum Candidate
↓
Curriculum PR
↓
Fresh Learner Validation
↓
Curriculum Release
```

Experiment Resultの変更とCurriculum変更は原則として別Reviewにする。
Observationと一般化を同じReviewで承認し、Confirmation Biasを強めることを避ける。

CurriculumのLevel、Competency、Required Asset等の具体契約はCurriculum側のSSOTを正とする。
このPlanは学習段階を再定義しない。

Curriculumへ反映するKnowledgeには、成功手順だけでなく次を含める。

- Why
- Applicable Conditions
- Non-applicable Conditions
- Failure Signs
- Evidence
- Trade-off
- Recovery
- Anti-pattern

---

## 9. Field AdoptionとSecurity Boundary

実案件へRepository全体をコピーしない。
必要なPatternだけを段階導入する。

### 9.1 Adoption Stage

```text
Shadow
↓
Assist
↓
Bounded Agentic
↓
Risk-based Autonomy
```

- `Shadow`: Agent ResultをRelease Decisionへ直接使用しない。
- `Assist`: Human Decision前提でAgentを補助利用する。
- `Bounded Agentic`: 明示Scope内でImplementation / QA / Repair等をAgenticに実行する。
- `Risk-based Autonomy`: Low-risk / Well-bounded Taskに限りHuman Interventionを減らす。

Merge、Deployment、Credential、Production Data Mutation等の権限は、このStageだけで自動付与しない。
案件固有のRisk Decisionを別途必要とする。

### 9.2 Field Pilot開始前のRequired Security Gate

Field Evidenceの機密境界はOpen Questionにしない。
Public Repositoryへ実案件の機密情報を持ち込まない。

Repositoryへの保存を禁止するもの:

- 顧客Source Code
- Raw Log
- Raw Screenshot / Video / Trace
- Credential / Secret / Token
- Personal Information
- Internal URL
- Confidential Requirement
- Proprietary Artifact
- 契約上公開できないProject Metadata

Repositoryへ戻せるもの:

- Sanitized Observation
- Abstracted Constraint
- Aggregated Metric
- Anonymized Failure Pattern
- Generalized Hypothesis
- 機密情報を含まないSanitized Evidence Reference

Raw Evidenceが必要な場合は案件側で許可されたStorageへ保持し、
Repository側には機密情報を含まない抽象化されたReferenceだけを残す。

このGateを満たせないField PilotのEvidenceはPublic Repositoryへ取り込まない。

### 9.3 Field Pilot Record

実案件で「改善した」と判断する場合、可能な限り既存Baselineを持つ。
最低限、次を記録する。

```yaml
adopted_pattern:
field_stage:
existing_baseline:
pilot_condition:
expected_benefit:
observed_difference:
known_confounders: []
actual_failure_or_intervention: []
training_environment_differences: []
new_hypothesis:
```

Correlationを因果として断定しない。
Field Resultは成功事例だけに限定しない。

---

## 10. GovernanceとRevalidation

### 10.1 Logical Roles

小規模運用では一人が複数Roleを兼任してよい。
ただし責務を概念上分離する。

| Role | 主な責務 |
| --- | --- |
| Experiment Owner | Question、Design、Executionを管理する |
| Evaluator | ResultをEvaluation Contractに基づいて評価する |
| Knowledge Reviewer | 一般化、適用範囲、Recommendation変更を判断する |
| Curriculum Reviewer | Curriculumへの反映可否を判断する |
| Field Owner | 実案件のRiskと導入Stageを判断する |

以下はAgentまたはExperiment Ownerの自己申告だけで確定しない。

- Official Score
- Ground Truth Match
- Critical Finding
- `recommended`への昇格
- Field Stageの高リスク側への昇格

独立Reviewerを用意できない場合、その制約をEvidenceへ残す。

### 10.2 Knowledge Revalidation Trigger

Knowledgeには賞味期限がある。
以下の変化がClaimの成立条件へ影響し得る場合、`recommended`を`stale`へ移し再検証する。

- Agent Model Familyまたは重要なModel Behaviorの変更
- Agentic ToolのMajor Behavior変更
- Playwright / Maestro等の重要Tool変更
- Repository ArchitectureまたはSpecificationの大幅変更
- Evaluation Contractの重要変更
- 新しいConflicting Field Evidence
- 新しい高品質な外部Evidenceとの衝突

すべてのVersion変更で機械的にStale化しない。
Claimに影響する変更かをKnowledge Reviewerが判断する。

### 10.3 Operating Cadence

Cadenceは固定ノルマではなく目安とする。

- Weekly / Experiment Cycle: Small Experimentを1〜2件程度候補とする。
- Monthly / Knowledge Review: 十分なEvidenceが蓄積したらKnowledgeを見直す。
- Quarterly / Field Review: 適切な案件がある場合のみShadow / Assist Pilotを検討する。

件数達成を目的化しない。

Knowledge Reviewでは、成功数より以下を重視する。

- 何を反証したか。
- 何が再現しなかったか。
- 何を以前ほど信じなくなったか。
- どのUnknownが次の意思決定に最も影響するか。

### 10.4 Stop / Continue

Experiment Loopを無限に回さない。

Continue候補:

- Evidenceが矛盾している。
- Reproductionが不足している。
- Field Relevanceが高い。
- Decision Impactが大きい。

Stop / Park候補:

- 結果が十分安定している。
- Decisionへ影響しない。
- Costに対して得られる情報が小さい。
- より重要なUnknownがある。

Hypothesisが支持されなかった場合、Promptや条件を無限に調整して成功させることを目的にしない。
「この条件では成立しなかった」をKnowledgeとして受け入れる。

---

## 11. Transition Planと初期Experiment

### 11.1 Phase 0 — Required Foundation Completion

移行GateはPR番号ではなくCapabilityで定義する。

必要なCapability:

- Official Agentic QAをEvidence付きで評価できるScored Capability
- Screen / Important StateをSpecificationへ接続できるVisual Oracle
- Formal Regressionと分離されたTraining Environment

Current implementation reference:

- PR #23: Official Black-box Scored E2E
- PR #24: Screen Catalog / Visual Specification
- PR #25: Test Automation Curriculum / Training Environment

PR番号は現時点の実装参照であり、Operating Planの永続Gateではない。
最終仕様は各領域の最新SSOTと`main`を正とする。

### 11.2 Phase 1 — Stabilization / Feature Freeze

Foundation統合後、最新`main`でFull Validationを行う。

原則として以下を追加しない。

- 新Agent Framework
- Custom Runner
- Experiment Dashboard
- Result Database
- Custom Job Queue
- New MCP Proxy / Tool Router
- Generic Knowledge Management Platform

追加を検討できるのは、実Experimentで次のいずれかがEvidence付きで確認された場合に限る。

- Current Foundationでは必要なExperimentが実行不能。
- Evidence Integrityを保証できない。
- 同一Manual Workaroundが反復し、Experiment throughputまたは信頼性を実際に阻害している。

「将来必要そう」「あると便利そう」は根拠にしない。

### 11.3 Phase 2 — Baseline Experiments

最初は少数の高価値Experimentを実施し、Experiment Contract自体を検証する。
件数ノルマは設定しない。

初期候補は次の8件とする。

1. Fresh Context vs Implementation Context継承
2. Same Agent Review vs Independent Agent Review
3. Gray-box QA vs Black-box QA
4. Specificationあり vs Specificationなし
5. Single Repair Attempt vs Bounded Iterative Repair
6. Human Test Design vs Agent Test Design
7. Visual Referenceあり vs Visual Referenceなし
8. Single Agent vs Specialized Subagents

この一覧はRequired Task Listではない。
現在の不確実性、実案件との関連性、意思決定への影響、Experiment Costから優先順位を決める。

### 11.4 Phase 3 — Knowledge Consolidation

初期Experimentから次を整理する。

- Candidate Pattern
- Candidate Anti-pattern
- Open Question
- Conflicting Evidence
- Failure Taxonomy Revision Need
- Curriculum Candidate

### 11.5 Phase 4 — Curriculum Update

Knowledge Reviewで妥当と判断した内容だけをCurriculumへ反映する。
Fresh Learner Validation等の具体DoDはCurriculum SSOTへ従う。

### 11.6 Phase 5 — Field Pilot

適切な実案件へShadowまたはAssistから導入する。
Training Repositoryで成功したことだけを理由にBounded Agentic以上へ進めない。

### 11.7 Phase 6 — Feedback

Field Resultから新しいQuestion / Hypothesisを作り、Experimentへ戻す。

---

## 12. Risks / Non-goals / Plan DoD

### 12.1 主要Risk

#### Infrastructure Developmentへの回帰

Experiment開始前にPlatformを作り続けるRiskがある。

対策:

- Current Artifactを再利用する。
- Manual Recordを許容する。
- Evidence付きPain Pointになるまで自動化しない。

#### Confirmation Bias

既存Architectureを正当化するExperimentになるRiskがある。

対策:

- 反証可能なHypothesisを優先する。
- Comparative / Confirmatoryでは条件を事前固定する。
- Negative / Conflicting Resultを保持する。
- Current Architecture自体をVariableにする。

#### Curriculumへの早すぎる一般化

対策:

- Knowledge Statusを多軸管理する。
- Curriculum PRを分離する。
- Fresh Learner Validation等の既存Gateを維持する。

#### Training EnvironmentとFieldの差

対策:

- Field Statusを独立管理する。
- Shadow / Assistから開始する。
- Trainingとの差をField Recordへ残す。

#### Metrics Gaming

対策:

- 単一MetricをSuccess KPIにしない。
- Questionに必要なTrade-offを見る。

#### Repository Complexity

対策:

- Learner-visible PathとResearch Artifactを分離する。
- Operating Planに実装詳細を複製しない。

#### Knowledge Staleness

対策:

- Revalidation Triggerを持つ。
- Stale KnowledgeをRecommendedのまま放置しない。

### 12.2 Non-goals

このPlanだけでは以下を実装しない。

- Experiment SaaS
- Experiment Dashboard
- Leaderboard
- Knowledge Graph
- Vector Database
- Custom Agent Runtime
- Agent Job Queue
- Universal MCP Gateway
- Automated Field Deployment
- Human QA完全代替
- AI Agent Merge権限の自動付与
- AI QAのRequired CI化
- すべてのExperimentの完全自動化
- 全Metricの自動収集
- Model性能ランキング自体をRepositoryの目的にすること

必要性がExperiment Evidenceから確認された場合のみ、別Planで検討する。

### 12.3 Open Questions

以下は初期運用で必要性を確認する。

1. Experiment Recordを既存`.codex/runs`へ統合するか、軽量Directoryを持つか。
2. Knowledge Recordの物理配置をどこにするか。
3. Failure TaxonomyをMachine-readableにする時期。
4. External Knowledge IntakeをRepositoryに保存するか、Issue等を使うか。
5. Human Active Time / Agent Costをどの精度まで収集するか。

Field Security BoundaryとRevalidation RuleはOpen Questionから除外し、本PlanのRequired Policyとする。

### 12.4 このPlanのDoD

このPlanは以下を満たした時点でOperating PlanとしてApprove可能とする。

- RepositoryのNorth Starが一意である。
- 各既存SSOTとの責務境界が明確である。
- Experiment ClassとLifecycleが定義されている。
- Comparative / Confirmatoryの事前固定ルールが定義されている。
- Agent比較で単一Runから一般結論を出さない原則がある。
- Human / Automation / Agentを同一Outcomeで比較する原則がある。
- Evidence / External / Field / Recommendationを分離したKnowledge Modelがある。
- Knowledge IDとEvidence Traceabilityが定義されている。
- Failure Taxonomy v1が定義されている。
- Curriculum Promotion Gateが定義されている。
- Field Security BoundaryがRequired Gateとして定義されている。
- Revalidation Triggerが定義されている。
- Logical Reviewer Roleが定義されている。
- Foundation完了後のFeature Freeze原則が定義されている。
- 初期Experimentが少数のCandidateとして定義されている。
- Experiment Evidenceなしに新しい大規模Infrastructureを追加しない境界がある。

### 12.5 次のAction

このPlanのReview完了前にはExperiment Platform Implementationを開始しない。

順序は以下とする。

1. このPlanをレビューし、Operating PlanとしてApprove可能な状態にする。
2. Required Foundationの最終状態を確認する。
3. 最新`main`へPlanをrebaselineする。
4. Foundation完了後、Stabilization / Feature Freezeへ移行する。
5. 最初の高価値Experimentを1件だけ選ぶ。
6. Current Artifactで実行し、不足を実測する。
7. 不足が反復し、意思決定を妨げる場合だけ最小Implementationを別Plan化する。
8. Experiment → Knowledge → Curriculum → Field Feedbackを反復する。

---

## Final Principle

このRepositoryの価値は、どれだけ高度なAgent Frameworkを作ったかではない。

価値は、次の問いへ継続的に回答できることにある。

> AI Agentは、どの条件でDevelopmentとQAへ有効なのか。
>
> どの条件ではHuman、Deterministic Automation、または別のApproachを使うべきなのか。
>
> その判断を再現可能なEvidenceで説明できるか。
>
> そのKnowledgeを他者が学び、実案件で安全に再利用できるか。

Repositoryは答えを固定する場所ではなく、
**答えを検証し続けるためのTraining / Experiment / Feedback Platform**として運用する。
