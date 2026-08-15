# Agentic QA・テスト自動化 知見循環・実案件還元計画

- Plan Revision: `v02`
- Status: `Draft / Review Required`
- Created: 2026-08-15 JST
- Revised: 2026-08-15 JST
- Scope: Research / Experiment / Curriculum / Field Feedback Operating Plan

## 0. 位置づけ

この計画は、`qa-training-store`を単なるSample Application、Test Automation Repository、
またはAgent Framework Repositoryとして拡張し続けるための計画ではない。

本Repositoryを、Test Automation、Agentic Development、Agentic QAを実際に使って検証し、
得られたEvidenceを学習と実案件へ循環させるTraining / Experimental Platformとして運用する。

目的は次の8点である。

1. Test Automationを段階的に学習できる。
2. AI AgentによるDevelopmentを実験できる。
3. AI AgentによるQA / Test Process Automationを実験できる。
4. 比較可能なApproachをEvidence付きで評価できる。
5. 実験結果を再利用可能なKnowledgeへ変換できる。
6. 検証済みKnowledgeをCurriculumへ反映できる。
7. 実案件へ段階適用してField Evidenceを取得できる。
8. Field Evidenceを次のQuestion / Hypothesisへ戻せる。

特定のAgent構成、Model、Tool、QA Modeを永続的な正解として固定しない。
現在のRepository Architecture自体もEvaluation対象とする。

> このPlanは「何を正しいと信じるか」ではなく、
> 「何を、どのEvidenceに基づき、どの範囲まで信じてよいか」を判断する運用を定義する。

---

## 1. North Star

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

主要成果は機能数、Test Case数、Agent数、Automation率、AI生成率ではない。

> 再現可能なEvidenceを増やし、有効条件・無効条件・不明点を更新し続け、
> そのKnowledgeを他者が学習でき、実案件で安全に再利用できる状態を作る。

Agent追加、Framework追加、Test Case増加、Automation率、AI生成コード率、Finding件数は、
それ自体をSuccess KPIにしない。

重要なQuestionについて最低限次を説明できることを成果とする。

- 何を試し、何と比較したか。
- 何が起き、何が起きなかったか。
- どの条件で成立し、どの条件では成立しないか。
- 再現したか、何がまだ不明か。
- Curriculumまたは実案件へ移してよいか。

---

## 2. SSOTと責務境界

このPlanはExperiment governanceとKnowledge lifecycleの正本であり、既存SSOTを再定義しない。

| 責務 | 正本 |
| --- | --- |
| Product Expected Behavior | `docs/spec/**` と既存Normative Specification |
| Agentic QA実行・採点・Evidence Contract | `QA_AGENT.md`、`scripts/agentic-qa/**` と関連Contract |
| Visual Reference / Screen Contract | Screen Catalog / Visual Specificationの正本 |
| Curriculum / Competency / Training Contract | `docs/curriculum/**` とTraining Environmentの正本 |
| Experiment / Knowledge運用 | このPlan |

このPlanと各領域の正本が矛盾する場合、Product Behavior、実行仕様、採点式、Curriculum要件は
各領域の正本を優先する。

このPlanが定義するのは次の範囲に限定する。

- Experimentの開始、比較、停止方法。
- EvidenceからKnowledgeへの判断方法。
- Knowledgeの再検証方法。
- Curriculum / Fieldへの移行方法。

Official ScoreやMetricの厳密な計算式は複製せず、各SSOTを参照する。

---

## 3. Experiment原則

### 3.1 Experiment Class

すべてのExperimentへ同じ厳密さを要求しない。

| Class | 目的 | 主な要求 |
| --- | --- | --- |
| `Exploratory` | 未知の現象・Failure・仮説候補を発見する | ObservationとEvidence |
| `Comparative` | 2つ以上のApproachを比較する | 比較条件と評価方法の事前固定 |
| `Confirmatory` | 重要仮説を反証可能な形で確認する | 事前登録、独立Run、反復、Invalid条件 |
| `Field Pilot` | 実案件で適用可能性と制約を確認する | Security、Baseline、Confounder |
| `Educational` | 学習効果やRecovery能力を確認する | Learner条件と評価基準 |

Exploratory Observationを、そのままConfirmatoryな結論へ昇格させない。

### 3.2 Questionから開始する

「Agentを使う」「新Modelを試す」だけではExperimentとしない。

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

`Result`は観測・計測した事実、`Interpretation`はそこから導いた推論として分離する。
因果を証明できない場合は因果として断定しない。

### 3.3 Negative Evidenceを残す

Failure、Block、False Positive、False Negative、Human Intervention、Unexpected Regression、
Contradictory Result、Invalid RunもKnowledge Sourceとして保存する。

未実行、Evidence不足、Capability不明、Environment BlockをPASSやAgent Successへ変換しない。
Agentの自己申告だけをGround Truthにしない。

### 3.4 同じOutcomeだけを比較する

Human QA、Deterministic Automation、Agentic QAを常に同列の競合手段として扱わない。
先に比較対象となるCapability / Outcomeを定義する。

例:

- Known Regression Detection
- Unknown Defect Discovery
- Test Design
- Failure Diagnosis
- Implementation Review
- Repair

同じOutcomeを狙わないApproach間の数値差を優劣として解釈しない。

### 3.5 Agent比較は単一Runで一般化しない

AI Agentは非決定的である。
Comparative / Confirmatory ExperimentでAgent性能差を論じる場合、必要な独立Run数または
Run Count決定ルールを実行前に定める。

最低限、RunごとのResult、代表値、ばらつき、Best / Worst、Failure率、Invalid Run数を区別する。
Run数はQuestion、Cost、Observed Varianceに応じて決めるが、単一Runだけを根拠に
Agent構成やModelをRecommended Practiceへ昇格させない。

### 3.6 事後調整を同一成功として扱わない

Comparative / Confirmatoryでは、実行前に最低限以下を固定する。

- Hypothesis
- Variant
- Evaluation Method
- Required Metrics
- Stop Condition
- Invalid Run Condition
- Planned Run Countまたは決定ルール

Result確認後にPrompt、Tool Scope、Metric、条件等を変えた場合は、Variantまたは新しい
Experiment Revisionとして扱う。

---

## 4. Experiment Lifecycleと記録

Lifecycleは次の8段階とする。

1. `Question`
2. `Classify`
3. `Design`
4. `Pre-register when required`
5. `Execute`
6. `Evaluate`
7. `Reproduce / Refute`
8. `Knowledge Decision`

Designでは最低限、Experiment ID、Class、Question、Hypothesis / Goal、Task、Capability、
Comparison、Independent / Controlled Variables、Agent / Model、Context、Tool Scope、Revision、
Environment、Evaluation Method、Required Metrics、Stop / Invalid条件、Run Countを決める。

既存のRepository Harness、Run Artifact、QA Artifact、Scored E2E等を可能な限り再利用する。
Experiment専用Infrastructureは最小化する。

### 4.1 Human Baseline

Human Baselineを使う場合は、比較可能性に影響する範囲で次を記録する。

- Experience band / Role
- Tool allowance
- Time budget
- Specification access
- Training Environment familiarity

個人評価を目的とせず、不要な個人情報は記録しない。

### 4.2 最小Experiment Record

初期段階ではDatabaseやExperiment Management Applicationを作らない。
既存Artifactまたは軽量なMachine-readable Recordを使う。

```yaml
experiment_id:
experiment_class:
question:
hypothesis_or_goal:
capability:
source_revision:
variants: []
controlled_variables: []
environment: {}
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

全Experimentで全Metricを収集せず、Questionに必要なものだけRequiredにする。

---

## 5. EvidenceとKnowledge Model

Knowledgeを単一の成熟度階段で管理しない。
Evidence再現性、外部支持、Field適用、Recommendationを分離する。

### 5.1 Evidence Status

| Status | 定義 |
| --- | --- |
| `hypothesis` | 未検証 |
| `observed` | 条件とEvidence付きで1回以上観測 |
| `reproduced` | 独立Runまたは条件差を含む複数Runで再現 |
| `conflicting` | 有効なEvidence同士が矛盾 |

同一RunのRetry、実質同一Contextの再試行、失敗後に条件調整した成功だけでは
`reproduced`としない。

### 5.2 External Support

| Status | 定義 |
| --- | --- |
| `none` | 外部Evidence未確認 |
| `supporting` | 独立した外部Evidenceが支持 |
| `mixed` | 支持と反証が混在 |
| `conflicting` | 主要外部Evidenceと衝突 |
| `not_applicable` | 外部支持が不要または適用不能 |

### 5.3 Field Status

| Status | 定義 |
| --- | --- |
| `not_tested` | 実案件未検証 |
| `shadow` | Release Decisionへ使わず並行評価 |
| `assist` | Human Decision前提で実務補助 |
| `bounded` | 明示Scope内でAgentic Flowを利用 |
| `risk_based` | Risk条件に基づき限定自律運用 |

### 5.4 Recommendation Status

| Status | 定義 |
| --- | --- |
| `experimental` | 研究・試行段階 |
| `candidate` | 再利用候補 |
| `recommended` | 適用条件・制約・Failure条件まで説明可能 |
| `stale` | 再検証Triggerにより有効性未確認 |
| `deprecated` | 非推奨、限定化、または置換済み |

`deprecated`は成熟度ではなくLifecycle状態である。

### 5.5 Knowledge Identity

再利用するKnowledgeにはIdentityとTraceabilityを持たせる。

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

物理保存先は初期運用で決めてよいが、Knowledge IDとEvidence Referenceは省略しない。

### 5.6 Recommendation昇格

`recommended`は単一Statusだけで決めない。最低限次を確認する。

- 複数Runまたは複数条件でEvidenceが支持される。
- 重大なConflicting Evidenceが未整理で残っていない。
- Applicable / Non-applicable Conditionsを説明できる。
- Failure SignとRecovery / Rollbackを説明できる。
- テーマ上必要ならExternal / Field Evidenceも確認している。

すべてのKnowledgeにField Testを必須としないが、実案件の標準Practiceとして推奨する場合は
Field Evidenceを強く要求する。

---

## 6. Failure TaxonomyとMetrics

### 6.1 Failure Taxonomy v1

| Code | 意味 |
| --- | --- |
| `SPEC_AMBIGUITY` | Specification / Acceptance Criteriaが曖昧 |
| `CONTEXT_MISSING` | 必要Context不足 |
| `CONTEXT_OVERLOAD` | 不要情報が判断を阻害 |
| `ORACLE_FAILURE` | Expected Behaviorを誤認 |
| `AGENT_REASONING_FAILURE` | 情報はあるが推論・計画・判断を誤る |
| `TOOL_FAILURE` | Browser / MCP / Maestro / CLI等の失敗 |
| `ENVIRONMENT_FAILURE` | Build / CI / Runtime / Emulator / Network等の失敗 |
| `AUTOMATION_FLAKE` | Deterministic Automation自体が不安定 |
| `FALSE_POSITIVE` | DefectでないFinding |
| `FALSE_NEGATIVE` | Ground Truth上のDefectを見逃す |
| `DUPLICATE_FINDING` | 同一原因を複数Findingとして過大計上 |
| `OVER_REPAIR` | 必要範囲を超えた修正 |
| `UNDER_REPAIR` | Root Cause / Required Scopeを修正しきれない |
| `REGRESSION_INTRODUCED` | 修正により新Regressionを導入 |
| `SCOPE_VIOLATION` | 許可外の責務 / Sourceへ変更 |
| `HUMAN_INTERVENTION` | Agent単独で継続不能 |
| `EVALUATION_FAILURE` | Evaluator / Ground Truth / Metric問題 |
| `RUN_INVALID` | Evidence不足や条件逸脱でExperiment無効 |

分類不能・重複が増えた場合にTaxonomyを改訂する。
Agent能力不足、Specification不足、Tool不足、Environment不足を混同しない。

### 6.2 Metrics

MetricはQuestionに必要なものだけ選択し、Official Agentic QAの計算式は既存SSOTを正とする。
候補は以下とする。

- QA: Recall、Precision、FPR、Coverage、Reproduction Rate
- Development: First-pass Success、Repair Success、Regression Introduction、Scope Violation
- Delivery: Lead Time、Cycle Time、Human Active Time、Change Failure
- Cost: Agent Runtime、Tool Action、CI Runtime、Agent Cost
- Education: Completion、Failure Analysis Success、Time to Competency、Instructor Intervention

AI生成コード率、Agent利用回数、Test Case数、Automation率、Token量、PR数、Finding件数を
単独のSuccess KPIにしない。

---

## 7. External Knowledge Intake

外部Knowledgeは種類を分けて扱う。

| Class | 例 | 扱い |
| --- | --- | --- |
| `Normative / Constraint` | Security、契約、法令、Repository policy | 制約として扱う |
| `Tool Fact` | Official Documentation上のAPI仕様 | 一次情報で確認する |
| `Empirical Claim` | Agent構成が品質を改善する等 | 原則Hypothesisとして検証する |
| `Anecdotal Observation` | Blog、Conference Talk、個別事例 | 仮説候補とする |

外部情報をすべて仮説とは扱わないが、Empirical ClaimをRepository固有のBest Practiceへ
直接昇格させない。

最低限、次を記録する。

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

長文要約の蓄積自体を目的にしない。

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

Experiment ResultとCurriculum変更は原則別Reviewにする。
CurriculumのLevel、Competency、Required Asset等はCurriculum SSOTを正とし、このPlanで再定義しない。

Curriculumへ反映するKnowledgeには、成功手順だけでなくWhy、Applicable / Non-applicable Conditions、
Failure Signs、Evidence、Trade-off、Recovery、Anti-patternを含める。

---

## 9. Field AdoptionとSecurity Boundary

### 9.1 Adoption Stage

Repository全体を実案件へコピーせず、必要なPatternだけ段階導入する。

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
- `Assist`: Human Decision前提で補助利用する。
- `Bounded Agentic`: 明示Scope内でAgentic Flowを利用する。
- `Risk-based Autonomy`: Low-risk / Well-bounded Taskに限りHuman Interventionを減らす。

Merge、Deployment、Credential、Production Data Mutation等の権限はStageだけで自動付与せず、
案件固有Riskを別途判断する。

### 9.2 Required Security Gate

Field Pilot開始前に機密境界を満たす。
Public Repositoryへ以下を保存しない。

- 顧客Source Code
- Raw Log / Screenshot / Video / Trace
- Credential / Secret / Token
- Personal Information
- Internal URL
- Confidential Requirement
- Proprietary Artifact
- 公開不可のProject Metadata

Repositoryへ戻せるのは、Sanitized Observation、Abstracted Constraint、Aggregated Metric、
Anonymized Failure Pattern、Generalized Hypothesis、機密情報を含まないReferenceに限定する。

Raw Evidenceが必要な場合は案件側で許可されたStorageへ保持する。
このGateを満たせないField EvidenceはPublic Repositoryへ取り込まない。

### 9.3 Field Pilot Record

Fieldで改善を判断する場合、可能な限り既存Baselineを持つ。

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

Correlationを因果として断定せず、失敗結果も戻す。

---

## 10. GovernanceとRevalidation

### 10.1 Logical Roles

一人が複数Roleを兼任してよいが、責務は概念上分離する。

| Role | 責務 |
| --- | --- |
| Experiment Owner | Question、Design、Execution |
| Evaluator | Evaluation Contractに基づくResult評価 |
| Knowledge Reviewer | 一般化、適用範囲、Recommendation変更 |
| Curriculum Reviewer | Curriculum反映可否 |
| Field Owner | 実案件Riskと導入Stage |

Official Score、Ground Truth Match、Critical Finding、`recommended`昇格、Field Stage昇格は、
AgentまたはExperiment Ownerの自己申告だけで確定しない。
独立Reviewerを用意できない場合は、その制約をEvidenceへ残す。

### 10.2 Revalidation Trigger

以下の変化がClaimの成立条件へ影響し得る場合、`recommended`を`stale`へ移し再検証する。

- Agent Model Familyまたは重要Behavior変更
- Agentic ToolのMajor Behavior変更
- Playwright / Maestro等の重要Tool変更
- Repository Architecture / Specificationの大幅変更
- Evaluation Contractの重要変更
- 新しいConflicting Field Evidence
- 高品質な外部Evidenceとの衝突

すべてのVersion変更で機械的にStale化せず、Claimへの影響をKnowledge Reviewerが判断する。

### 10.3 Cadenceと停止判断

Cadenceはノルマではなく目安とする。

- Weekly: Small Experimentを1〜2件程度候補とする。
- Monthly: 十分なEvidenceがあればKnowledge Reviewする。
- Quarterly: 適切な案件がある場合だけShadow / Assist Pilotを検討する。

成功数より、何を反証したか、何が再現しなかったか、何を以前ほど信じなくなったか、
次の意思決定に最も影響するUnknownは何かを重視する。

Evidence矛盾、Reproduction不足、Field RelevanceやDecision Impactが高い場合はContinue候補とする。
結果が十分安定、Decisionへ影響しない、Costに対する情報量が小さい、より重要なUnknownがある場合は
Stop / Park候補とする。

Hypothesisが支持されなくても条件を無限調整して成功させず、非成立自体をKnowledgeとして受け入れる。

---

## 11. Transition Plan

### 11.1 Required Foundation Completion

移行GateはPR番号ではなくCapabilityで定義する。

- Official Agentic QAをEvidence付きで評価できるScored Capability
- Screen / Important StateをSpecificationへ接続できるVisual Oracle
- Formal Regressionと分離されたTraining Environment

Current implementation reference:

- PR #23: Official Black-box Scored E2E
- PR #24: Screen Catalog / Visual Specification
- PR #25: Test Automation Curriculum / Training Environment

PR番号は現時点の実装参照であり、永続Gateではない。最終仕様は各SSOTと最新`main`を正とする。

### 11.2 Stabilization / Feature Freeze

Foundation統合後、最新`main`でFull Validationを行う。

原則として、新Agent Framework、Custom Runner、Experiment Dashboard、Result Database、Custom Job Queue、
New MCP Proxy / Tool Router、Generic Knowledge Management Platformを追加しない。

新規基盤を検討できるのは、実Experimentで以下のいずれかがEvidence付きで確認された場合に限る。

- Current Foundationでは必要なExperimentが実行不能。
- Evidence Integrityを保証できない。
- 同一Manual Workaroundが反復し、Experiment throughputまたは信頼性を実際に阻害する。

「将来必要そう」「あると便利そう」は根拠にしない。

### 11.3 Baseline Experiments

最初は少数の高価値Experimentを実施し、Experiment Contract自体も検証する。
初期候補は次の8件とする。

1. Fresh Context vs Implementation Context継承
2. Same Agent Review vs Independent Agent Review
3. Gray-box QA vs Black-box QA
4. Specificationあり vs Specificationなし
5. Single Repair Attempt vs Bounded Iterative Repair
6. Human Test Design vs Agent Test Design
7. Visual Referenceあり vs Visual Referenceなし
8. Single Agent vs Specialized Subagents

Required Task Listではない。現在の不確実性、実案件との関連性、意思決定への影響、Costで優先する。

### 11.4 後続Phase

```text
Baseline Experiments
↓
Knowledge Consolidation
↓
Curriculum Update
↓
Field Pilot
↓
Feedback
↓
New Experiment
```

Training Repositoryで成功したことだけを理由にBounded Agentic以上へ進めない。

---

## 12. Risks / Non-goals / Plan DoD

### 12.1 主要Risk

| Risk | 対策 |
| --- | --- |
| Infrastructure開発へ戻る | Current Artifact再利用、Manual Record許容、Evidence付きPain Pointまで自動化しない |
| Confirmation Bias | 反証可能なHypothesis、事前固定、Negative / Conflicting Result保持 |
| Curriculumへ早期一般化 | Knowledge Review、別PR、既存Fresh Learner Gate |
| TrainingとFieldの差 | Field Status分離、Shadow / Assist、差分記録 |
| Metrics Gaming | 単一Metric最適化を避けTrade-offを見る |
| Repository Complexity | Learner-visible PathとResearch Artifactを分離 |
| Knowledge Staleness | Revalidation Triggerと`stale`状態を使う |

### 12.2 Non-goals

このPlanだけでは、Experiment SaaS / Dashboard / Leaderboard、Knowledge Graph / Vector DB、
Custom Agent Runtime / Job Queue / Universal MCP Gateway、Automated Field Deployment、Human QA完全代替、
AI AgentへのMerge権限自動付与、AI QA Required CI化、全Experiment / Metricの完全自動化、
Model性能ランキング基盤を実装しない。

必要性がExperiment Evidenceから確認された場合のみ別Planで検討する。

### 12.3 Open Questions

初期運用で決めるものは次に限定する。

1. Experiment Recordの物理配置。
2. Knowledge Recordの物理配置。
3. Failure TaxonomyをMachine-readableにする時期。
4. External Knowledge IntakeをRepository / Issue等のどこに置くか。
5. Human Active Time / Agent Costの収集精度。

Field Security BoundaryとRevalidation RuleはOpen QuestionではなくRequired Policyとする。

### 12.4 Plan DoD

以下を満たした時点でOperating PlanとしてApprove可能とする。

- North Starと既存SSOT境界が一意である。
- Experiment Class、Lifecycle、事前固定ルールがある。
- Agent比較の反復原則と同一Outcome比較原則がある。
- Evidence / External / Field / Recommendationを分離したKnowledge Modelがある。
- Knowledge ID、Evidence Traceability、Revalidation Triggerがある。
- Failure Taxonomy v1がある。
- Curriculum Promotion Gateがある。
- Field Security BoundaryがRequired Gateである。
- Logical Reviewer Roleがある。
- Foundation後のFeature Freeze原則がある。
- 初期Experimentが少数Candidateとして定義されている。
- Experiment Evidenceなしに大規模Infrastructureを追加しない。

### 12.5 次のAction

1. このPlanをレビューしApprove可能な状態にする。
2. Required Foundationの最終状態を確認する。
3. 最新`main`へPlanをrebaselineする。
4. Stabilization / Feature Freezeへ移行する。
5. 最初の高価値Experimentを1件選ぶ。
6. Current Artifactで実行し、不足を実測する。
7. 反復する不足だけを最小Implementationとして別Plan化する。
8. Experiment → Knowledge → Curriculum → Field Feedbackを反復する。

---

## Final Principle

このRepositoryの価値は、どれだけ高度なAgent Frameworkを作ったかではない。

> AI Agentは、どの条件でDevelopmentとQAへ有効なのか。
>
> どの条件ではHuman、Deterministic Automation、または別のApproachを使うべきなのか。
>
> その判断を再現可能なEvidenceで説明できるか。
>
> そのKnowledgeを他者が学び、実案件で安全に再利用できるか。

Repositoryは答えを固定する場所ではなく、
**答えを検証し続けるためのTraining / Experiment / Feedback Platform**として運用する。
