# Agentic QA・テスト自動化 知見循環・実案件還元計画

- Plan Revision: `v00`
- Status: `Draft / Review Required`
- Created: 2026-08-15 JST
- Scope: Research / Experiment / Curriculum / Field Feedback Operating Plan

## 0. 位置づけ

この計画は、`qa-training-store`を単なるSample Application、Test Automation Repository、またはAgent Framework Repositoryとして拡張し続けるための計画ではない。

本Repositoryを、以下を一つの循環として継続的に検証できるTraining / Experimental Platformとして運用するための中長期Operating Planとする。

1. Test Automationを学習する。
2. AI AgentによるDevelopmentを実験する。
3. AI AgentによるQA / Test Process Automationを実験する。
4. Human / Deterministic Automation / Agentic Approachを比較評価する。
5. 実験結果をEvidence付きKnowledgeへ変換する。
6. 検証済みKnowledgeをCurriculumへ反映する。
7. 実案件へ段階的に適用する。
8. Fieldで得たEvidenceをRepositoryへ戻し、次のHypothesisへ接続する。

このPlanは、特定のAgent構成、Model、Tool、QA Modeを永続的な正解として固定しない。

現在のRepository Architecture自体もEvaluation対象とする。

このPlanの目的は「何を正しいと信じるか」を先に決めることではなく、**何をどのEvidenceに基づいて信じてよいかを判断できる継続サイクルを作ること**である。

---

## 1. RepositoryのNorth Star

Repositoryの主要成果を、機能数、Test Case数、Agent数、Automation率、AI生成率ではなく、次の循環が成立していることと定義する。

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

North Starは次の状態である。

> Experimentを増やすことではなく、再現可能なEvidenceを増やし、何が有効で何が無効かを更新し続け、その結果をCurriculumとField Practiceへ還元できること。

---

## 2. ゴール / 完了条件

### 2.1 ゴール

PR #23、#24、#25等で整備するAgentic QA、Visual Specification、Training Environmentを、実際に使用して知見を生産する運用へ移行する。

そのうえで、Repositoryを以下の4機能を持つPlatformとして成立させる。

- `Training Platform`: Test Automationを段階的に学べる。
- `Experiment Lab`: Agentic Development / Agentic QAを比較実験できる。
- `Knowledge Base`: Evidence付きPattern / Anti-patternを蓄積できる。
- `Field Feedback Hub`: 実案件での適用結果をRepositoryへ戻せる。

### 2.2 このPlan自体のDoD

このPlanは以下を満たした時点でOperating PlanとしてApprove可能とする。

- Repositoryの目的とNorth Starが一意である。
- Experimentと通常Developmentの責務境界が明確である。
- Knowledge Maturityが定義されている。
- Experiment Lifecycleと最低限RequiredなEvidenceが定義されている。
- Failure Taxonomy v1が定義されている。
- Metricsの使い方と誤用防止が定義されている。
- Curriculum PromotionのGateが定義されている。
- Field Adoptionの段階が定義されている。
- 外部Knowledgeの取り込み方が定義されている。
- PR #23〜#25完了後のFeature Freeze / Experiment優先原則が定義されている。
- 初期Experiment BacklogがCandidateとして定義されている。
- 実験前に過剰なExperiment Platformを実装しない境界がある。
- 未検証のArchitectureやPracticeをBest Practiceとして扱わない。

このPlanのApproveは、Experiment Runner、Dashboard、Database、Knowledge Management Application等の実装開始を意味しない。

---

## 3. 基本原則

### 3.1 Repository改善そのものを成果にしない

以下を主要成果として扱わない。

- 新しいAgentを追加した。
- Test Case数が増えた。
- Frameworkを追加した。
- Promptが長くなった。
- Automation率が上がった。
- AIが実装したコード量が増えた。

主要成果は、次の問いへEvidence付きで回答できることとする。

- 何を試したか。
- 何と比較したか。
- 何が起きたか。
- なぜ起きた可能性が高いか。
- 再現したか。
- どの条件で成立し、どの条件で成立しないか。
- 実案件へ適用可能か。
- Curriculumへ昇格させてよいか。

### 3.2 ExperimentはHypothesisから開始する

「Agentを使ってみる」「新Modelを試す」だけではExperimentとしない。

最低限以下を明確にする。

```text
Question
↓
Hypothesis
↓
Comparison / Baseline
↓
Controlled Variables
↓
Metrics / Evidence
↓
Result
↓
Conclusion
```

Comparisonを設定できないExperimentでは、設定できない理由と、何をObservationとして扱うかを明示する。

### 3.3 成功だけをEvidenceとして扱わない

Failure、Block、False Positive、False Negative、Human Intervention、Unexpected RegressionもKnowledge Sourceとして保存する。

成功率だけを最適化しない。

### 3.4 未実行をPASS扱いしない

Current Repositoryの既存方針を維持する。

- 未実行は未実行。
- Evidence不足はEvidence不足。
- Host / Tool Capability不明は不明。
- Environment BlockはProduct / Agent Successへ変換しない。

### 3.5 AIの自己評価をGround Truthにしない

Agentが「問題なし」「修正完了」「Test PASS」と報告しただけではEvidenceとしない。

可能な限り、以下を独立させる。

- Deterministic Test / Validator
- Independent QA Agent
- Human Review
- Instructor Answer Key
- Known Challenge Ground Truth
- Runtime Evidence

### 3.6 一度の成功をBest Practiceへ昇格しない

一度のObservationは`Observed`であり、`Recommended`ではない。

### 3.7 外部情報を正解として輸入しない

Paper、Industry Report、Vendor Guidance、OSS Practice、Engineering Blog等は重要なInputとするが、Repository固有の推奨へ直接昇格させない。

外部Claimは原則としてHypothesisまたはSupporting Evidenceとして扱う。

### 3.8 Framework追加よりExperimentを優先する

PR #23〜#25等のCurrent Foundation完了後は、新しいAgent / Runner / Orchestration / Dashboard / Knowledge Platformを原則追加しない。

追加を検討できるのは、実Experimentで以下がEvidence付きで確認された場合に限る。

- Current Foundationでは必要なExperimentが実行不能。
- Current FoundationではEvidence Integrityを保証できない。
- 同一のManual Workaroundが反復し、Experiment throughputまたは信頼性を有意に阻害している。

「将来必要そう」「あると便利そう」は新規基盤追加の根拠にしない。

---

## 4. Knowledge Maturity Model

Knowledgeは以下の状態で管理する。

| Status | 定義 | 利用方針 |
| --- | --- | --- |
| `Hypothesis` | 外部情報、現場課題、過去Observationから生まれた未検証の仮説 | Experiment対象。推奨しない |
| `Observed` | 少なくとも1回、条件とEvidence付きで現象を確認した | Observationとして共有可能 |
| `Reproduced` | 独立Runまたは条件差を含む複数Runで再現した | Candidate Pattern / Anti-pattern |
| `Triangulated` | Repository Experimentと外部Evidence、異なるEvaluation方法等で複数方向から支持された | Curriculum Candidate |
| `Field-tested` | 実案件のShadow / Assist等で有効性または制約を確認した | Field Guidance候補 |
| `Recommended` | 複数条件で再現し、適用条件・制約・失敗条件まで説明可能 | Core Curriculum / Recommended Practice候補 |
| `Deprecated` | 新しいEvidenceにより非推奨、限定条件化、または置換された | Anti-pattern / Historical Knowledgeとして保持 |

### 4.1 Maturity運用ルール

- Status昇格にはEvidence Referenceを持つ。
- `Observed → Reproduced`は同一RunのRetryだけで満たさない。
- Model、Prompt、Tool、Source Revision等が実質同一のRetryは独立再現とみなさない。
- `Recommended`は永久保証ではない。
- Model / Tool / Repository Architectureの大幅変更時は再検証対象にできる。
- `Deprecated`を削除せず、なぜ非推奨になったかを残す。

---

## 5. Experiment Lifecycle

### 5.1 Phase A — Question

実験対象となる問いを一文で定義する。

例:

> Fresh ContextのIndependent QA Agentは、Implementation Contextを継承するQA AgentよりFalse Positiveを減らせるか。

### 5.2 Phase B — Hypothesis

方向性を予測可能な形で定義する。

悪い例:

> Fresh Contextを試す。

良い例:

> Fresh Contextを使用するとImplementation由来の思い込みが減り、Precisionが向上する一方、Context不足によってRecallが低下する可能性がある。

### 5.3 Phase C — Experiment Design

最低限以下を決める。

- Experiment ID
- Question
- Hypothesis
- Task / Challenge
- Baseline / Comparison
- Independent Variable
- Controlled Variables
- Agent / Model / Mode
- Tool Scope
- Repository / Product Revision
- Runtime Environment
- Ground TruthまたはEvaluation方法
- Metrics
- Stop Condition
- Invalid Run Condition

### 5.4 Phase D — Execution

既存のRepository Harness、Run Artifact、QA Artifact、Scored E2E等を可能な限り再利用する。

Experiment専用Infrastructureは最小化する。

Execution中に条件変更が必要になった場合は、同一Run内で都合よく変更せず、Run invalidationまたはVariantとして記録する。

### 5.5 Phase E — Evaluation

ResultとInterpretationを分ける。

```text
Result
= 実際に観測・計測したもの

Interpretation
= Resultから推論したもの
```

因果を直接証明できない場合はCorrelation / Hypothesis Supportとして扱う。

### 5.6 Phase F — Reproduction / Refutation

重要なObservationは別Runで再確認する。

再現しない場合、それ自体をFailureではなくKnowledgeとして扱う。

例:

- Environment依存だった。
- Model Revision依存だった。
- Challenge Type依存だった。
- Prompt Variationで消えた。
- Randomnessが大きかった。

### 5.7 Phase G — Knowledge Decision

最終的に以下のいずれかへ分類する。

- Promote maturity
- Keep current maturity
- Narrow applicability
- Refute hypothesis
- Need more data
- Deprecated

---

## 6. Experiment Record Contract v1

初期段階では新しいDatabaseやExperiment Management Applicationを作らない。

既存Run Artifactまたは既存Documentationへ、後から機械集計可能な最小情報を追加する方針とする。

Logical Contractは以下を目安とする。

```yaml
experiment_id:
question:
hypothesis:
knowledge_refs: []
source_revision:
task_class:

variant:
  name:
  baseline_or_candidate:

agent:
  role:
  model:
  mode:
  context_policy:
  tool_scope:

environment:
  platform:
  browser_or_runtime:
  viewport_or_device:

evaluation:
  ground_truth_type:
  evaluator:

metrics:
  elapsed_time:
  human_active_time:
  intervention_count:
  recall:
  precision:
  false_positive_rate:
  coverage:
  repair_success:
  regression_introduction:
  estimated_agent_cost:

failures: []
result:
interpretation:
confidence:
knowledge_status_before:
knowledge_status_after:
next_experiment:
```

### 6.1 Required / Optional

全Experimentで全FieldをRequiredにしない。

最低限Required候補は以下とする。

- Experiment ID
- Question
- Hypothesis
- Source Revision
- Variant
- Environment
- Evaluation Method
- Result
- Evidence Reference
- Conclusion

MetricsはExperiment Questionに必要なものだけ選択する。

---

## 7. Failure Taxonomy v1

Failure Taxonomyは最初から完全であることを目指さない。

初版として以下を使用し、実Experimentで分類不能・重複が増えた場合に改訂する。

| Code | 意味 |
| --- | --- |
| `SPEC_AMBIGUITY` | Specification / Acceptance Criteriaが曖昧でOracleが確定できない |
| `CONTEXT_MISSING` | 必要なContextがAgentへ提供されていない |
| `CONTEXT_OVERLOAD` | 不要情報が多く重要Contextの判断を阻害した |
| `ORACLE_FAILURE` | Expected Behaviorの判断を誤った |
| `AGENT_REASONING_FAILURE` | 必要情報は存在したが推論・計画・判断を誤った |
| `TOOL_FAILURE` | Browser / MCP / Maestro / CLI等のTool実行に失敗した |
| `ENVIRONMENT_FAILURE` | Build / CI / Runtime / Emulator / Network等の環境で失敗した |
| `AUTOMATION_FLAKE` | Deterministic Automation自体が不安定だった |
| `FALSE_POSITIVE` | 実際にはDefectでないものをFindingとした |
| `FALSE_NEGATIVE` | Ground Truth上のDefectを検出できなかった |
| `DUPLICATE_FINDING` | 同一原因を複数Findingとして過大計上した |
| `OVER_REPAIR` | 必要範囲を超えて修正した |
| `UNDER_REPAIR` | Root CauseまたはRequired Scopeを修正しきれなかった |
| `REGRESSION_INTRODUCED` | 修正により新しいRegressionを導入した |
| `SCOPE_VIOLATION` | 許可されていないSource / File / Responsibilityへ変更した |
| `HUMAN_INTERVENTION` | Agent単独では継続不能で人間介入が必要だった |
| `EVALUATION_FAILURE` | Evaluator / Ground Truth / Metric計算の問題でResultを確定できない |
| `RUN_INVALID` | Required Evidence不足、条件逸脱等によりExperimentとして無効 |

### 7.1 Failure Analysisの目的

「Agentが失敗した」で終わらせず、Failure Sourceを分離する。

特に以下を混同しない。

- Agent能力不足
- Specification不足
- Test Oracle不足
- Tool不足
- Environment不足
- Repository Harness不足

Infrastructure FailureをAgent Quality Failureとして数えず、逆も同様とする。

---

## 8. Metrics Strategy

### 8.1 QA Metrics候補

- Recall
- Precision
- False Positive Rate
- Required Coverage
- Detection Latency
- Finding Reproduction Rate
- Duplicate Finding Rate

### 8.2 Development / Repair Metrics候補

- First-pass Success
- Repair Success Rate
- Regression Introduction Rate
- Scope Violation Rate
- Time to First Green
- Rework Count
- Human Intervention Count

### 8.3 Delivery Metrics候補

- Lead Time
- Cycle Time
- PR Review Time
- Human Active Time
- Escaped Defect
- Change Failure

### 8.4 Cost Metrics候補

- Agent Runtime
- Tool Action Count
- Token / API Costが取得可能な場合のAgent Cost
- CI Runtime
- Human Active Minutes

### 8.5 Education Metrics候補

- Learner Completion
- Exercise Pass / Fail
- Failure Analysis Success
- Time to Competency
- Instructor Intervention
- Recovery Success

### 8.6 Metric Anti-pattern

以下を単独のSuccess KPIにしない。

- AI生成コード率
- Agent利用回数
- Test Case増加数
- Automation率
- Token使用量の少なさ
- PR数
- Finding件数

Finding件数は品質ではない。False Positiveを増やせば容易に増加するためである。

---

## 9. Comparison Strategy

すべてのExperimentでHuman Baselineを要求しないが、主要テーマでは比較対象を持つ。

### 9.1 QA比較

```text
A. Human QA

B. Deterministic Automation
   - Vitest
   - Playwright
   - Maestro
   - Contract / Validator

C. Agentic QA
```

### 9.2 Development Process比較

Representative Experimentでは以下を比較可能にする。

```text
A. Human-oriented Development
   + Conventional QA

B. Agent Development
   + Deterministic QA

C. Agent Development
   + Independent Agent QA
   + Deterministic QA
   + Agent Repair
```

### 9.3 Comparison Fairness

可能な限り以下を揃える。

- Same Product Revision
- Same Task / Challenge
- Same Specification
- Same Runtime Target
- Same Time / Action Budgetまたは差分を明示
- Same Evaluation Contract

完全に揃えられない場合は制約を記録する。

---

## 10. Agent Independence Strategy

AI AgentによるDevelopmentとQAを同一Contextで連続実行する場合、Correlated Failureが起き得る。

そのため、Experimentでは独立性そのものをVariableとして扱う。

Candidate構成:

```text
Developer Agent
↓
Deterministic Gate
↓
Fresh / Independent QA Agent
↓
Finding
↓
Repair Agent
↓
Regression Gate
```

比較対象として以下を持てる。

- Same Agent / Same Context Review
- Same Model / Fresh Context Review
- Different Role / Fresh Context Review
- Gray-box QA
- Black-box QA
- Human Acceptance

「常に別Modelを使う」「常にBlack-boxを使う」を現時点では標準化しない。

どの独立性がCost / Recall / Precision / Repair Qualityへ寄与するかを実験対象とする。

---

## 11. External Knowledge Intake

### 11.1 対象

外部Knowledge Source候補:

- DORA / Software Delivery Research
- Quality Engineering Industry Report
- OpenAI / GitHub / Tool Vendor Official Guidance
- Playwright / Maestro Official Documentation
- Academic Paper
- OSS Repository / Agent Framework
- Engineering Blog / Conference Talk
- QA Community Practice
- 実案件でのObservation

### 11.2 Intake Contract

外部情報は長文要約を蓄積すること自体を目的としない。

最低限以下へ変換する。

```yaml
claim:
source:
source_type:
published_or_observed_at:
why_relevant:
current_assumption_challenged:
proposed_experiment:
priority:
```

### 11.3 Source Weight

Sourceの権威だけでKnowledge Statusを昇格させない。

一方で、External Evidenceを無視してRepository内Experimentだけに閉じない。

`Triangulated`では、可能な場合に異なるEvidence Sourceを組み合わせる。

---

## 12. Curriculum Promotion Lifecycle

Experiment Resultを直接Core Curriculumへ反映しない。

```text
Experiment Result
↓
Knowledge Review
↓
Knowledge Maturity Decision
↓
Curriculum Candidate
↓
Curriculum PR
↓
Fresh Learner Validation
↓
Curriculum Release
```

### 12.1 Curriculumへ載せる情報

成功手順だけでなく以下を含める。

- Why
- Applicable Conditions
- Non-applicable Conditions
- Failure Signs
- Evidence
- Trade-off
- Recovery
- Anti-pattern

### 12.2 Core / Advanced分離

Agentic QAの高度なTrust Boundary、Benchmark、Fresh Session、Isolation等を初心者へ一括で見せない。

Learning Pathは段階化する。

```text
Level 0
Manual Test / Test Design / Basic Playwright

Level 1
Risk / Test Layer / Playwright / CI

Level 2
Specification / BR / AC / Maestro / Failure Analysis

Level 3
Agent Development / Agent QA / Review / Repair

Advanced / Research
Black-box Scored / Isolation / Benchmark / Reproducibility
```

Repository内部構造を単純化することと、Learnerが見る範囲を単純化することを混同しない。

---

## 13. Field Adoption Lifecycle

実案件へCurrent Repositoryの全Architectureをそのままコピーしない。

必要なPatternのみ段階導入する。

### Stage 1 — Shadow

```text
Human Process
+
Agent Process
```

Agent ResultをRelease Decisionへ直接使用せず比較Evidenceを取得する。

### Stage 2 — Assist

```text
Agent Investigation / Test Generation / QA
↓
Human Decision
```

### Stage 3 — Bounded Agentic

```text
Agent Implementation
↓
Deterministic Gate
↓
Independent Agent QA
↓
Agent Repair
↓
Human Acceptance
```

ScopeとRiskを限定する。

### Stage 4 — Risk-based Autonomy

Low-risk / Well-bounded Taskに限り、Human Interventionをさらに減らす。

Merge、Deployment、Credential、Data Mutation等の高リスク操作は別Decisionとする。

### 13.1 Field Feedback Required

Field Pilotでは最低限以下をRepositoryへ戻す。

- What was adopted
- Project constraints
- Expected benefit
- Actual benefit
- Failure / Intervention
- Metrics available
- Difference from Training Environment
- New Hypothesis

Field Resultを成功事例だけに限定しない。

---

## 14. Operating Cadence

Cadenceは固定ノルマではなく初期目安とする。

### 14.1 Weekly / Experiment Cycle

- 1〜2件程度のSmall Experimentを候補とする。
- Repository変更が目的ではなく、Questionへ回答可能なサイズにする。
- 同一テーマを複数週かけてReproduceしてよい。

### 14.2 Monthly / Knowledge Review

月次または十分なExperimentが蓄積した時点で以下を確認する。

- 何を試したか。
- 何が再現したか。
- 何が再現しなかったか。
- 何を反証したか。
- どのKnowledge Statusを変更するか。
- Curriculum Candidateはあるか。
- Infrastructure追加が本当に必要か。
- 次に最も価値の高いUnknownは何か。

成功数より「何を以前ほど信じなくなったか」を重視する。

### 14.3 Quarterly / Field Review

適切な案件がある場合、1〜2件程度のShadow / Assist Pilotを検討する。

案件都合によりQuarter単位で必ずField Pilotを実施する義務は持たない。

---

## 15. Transition Plan

### Phase 0 — Current Foundation Completion

現在進行中のFoundation Implementationを優先する。

主なCurrent Gate:

- PR #23: Official Black-box Scored E2E
- PR #24: Screen Catalog / Visual Specification
- PR #25: Test Automation Curriculum / Training Environment

これらの最終仕様は各PRのReview結果と最新`main`を正とする。

このPlanは上記PRのScopeを無断で拡張しない。

### Phase 1 — Stabilization / Feature Freeze

Foundation統合後、最新`main`で必要なFull Validationを実施する。

この期間は原則として以下を行わない。

- 新Agent Framework
- Custom Runner
- Experiment Dashboard
- Result Database
- Custom Job Queue
- New MCP Proxy / Tool Router
- Generic Knowledge Management Platform

Critical Bug、Experiment実行を妨げるDefect、Evidence Integrity問題は修正対象とする。

### Phase 2 — Experiment Baseline

最初のExperiment群を実施する。

10〜20件は初期の目安であり、DoDではない。

目的は件数達成ではなく、Failure Taxonomy、Record Contract、Metrics、Experiment Granularityが実用的かを検証することにある。

### Phase 3 — Knowledge Consolidation

初期Experimentから以下を整理する。

- Pattern Candidate
- Anti-pattern Candidate
- Open Question
- Conflicting Evidence
- Taxonomy Revision Need
- Curriculum Candidate

### Phase 4 — Curriculum Update

Knowledge Reviewで妥当と判断した内容だけをCurriculumへ反映する。

Fresh Learner Validationを維持する。

### Phase 5 — Field Pilot

適切な実案件へShadowまたはAssistから導入する。

Training Repositoryで成功したことだけを理由にBounded Agentic以上へ進めない。

### Phase 6 — Feedback

Field Resultから新しいQuestion / Hypothesisを作り、Experimentへ戻す。

---

## 16. Initial Experiment Backlog

以下はCandidateであり、Required Task Listではない。

優先順位はCurrent Unknown、Field Relevance、Experiment Cost、Foundation Readinessから決める。

### 16.1 Agentic QA

1. Gray-box QA vs Black-box QA
2. Fresh Context vs Implementation Context継承
3. Same Agent Review vs Independent Agent Review
4. Specificationあり vs Specificationなし
5. Visual Referenceあり vs Visual Referenceなし
6. Deterministic Regression実行前QA vs 実行後QA
7. Runtime Evidence制限あり vs 広いTool Access
8. Time / Tool Action Budget Variation
9. Basic / Intermediate / Advanced Challenge間の性能差
10. Web vs AndroidでのAgent QA Failure差

### 16.2 Agentic Development / Repair

11. Single Agent vs Specialized Subagents
12. Implementation Researchあり vs なし
13. Test Investigatorあり vs なし
14. Single Repair Attempt vs Bounded Iterative Repair
15. QA Findingを直接Repairへ渡す vs ParentがTriagingして渡す
16. Specification / BR / ACによるImplementation Accuracy差
17. Test-first Agent Flow vs Implementation-first Agent Flow
18. Same Model Role Split vs Model Variation

### 16.3 Test Automation

19. Human Test Design vs Agent Test Design
20. E2E偏重設計 vs Test Layerを明示した設計
21. Stable Test IDあり vs User-facing Locator中心
22. Trace / Screenshot / Video Evidenceの組合せによるFailure Diagnosis差
23. Playwright ExerciseでのFailure-driven Learning効果
24. Maestro Native TrainingでのEnvironment Friction分析

### 16.4 Process / Education

25. Agent-assisted Learner vs AgentなしLearner
26. Curriculum Level別のInstructor Intervention差
27. Failure Exerciseあり vs 成功Exerciseのみ
28. Specification-first Learning vs Automation-first Learning

---

## 17. Experiment Prioritization

Experiment Candidateは少なくとも以下で優先順位を判断する。

```text
Priority
≈
Field Relevance
× Decision Impact
× Uncertainty
× Reusability
÷ Experiment Cost
```

厳密な数式評価をRequiredにしない。

優先するのは、結果によって次のArchitecture、Curriculum、Field Practiceの判断が変わるExperimentである。

興味深いだけでDecisionへ影響しないExperimentを大量に回さない。

---

## 18. Stop / Continue Decision

Experiment Loop自体も無限に回さない。

テーマ単位で以下を判断する。

### Continue

- Evidenceが矛盾している。
- Reproductionが不足している。
- Field Relevanceが高い。
- Decision Impactが大きい。

### Stop / Park

- 結果が十分安定している。
- Decisionへ影響しない。
- Costに対して得られる情報が小さい。
- Foundation制約で有効なExperimentができない。
- より重要なUnknownがある。

### Refute

Hypothesisが支持されなかった場合、別のPromptや条件を無限に調整して成功させることを目的にしない。

「この条件では成立しなかった」をKnowledgeとして受け入れる。

---

## 19. Governance / Review Boundary

### 19.1 Experiment Result Review

Experiment OwnerとResult Reviewerを完全分離できる場合は望ましいが、初期運用で常に必須とはしない。

ただし以下は自己申告のみで確定しない。

- Official Score
- Ground Truth Match
- Critical Finding
- Recommended Practiceへの昇格

### 19.2 Curriculum Review

Experiment結果のPRとCurriculum変更PRは原則分離する。

理由は、Observationと一般化を同じReviewで承認するとConfirmation Biasが入りやすいためである。

### 19.3 Field Adoption Review

実案件への導入判断はTraining Repositoryだけで完結しない。

案件固有の以下を別途考慮する。

- Data sensitivity
- Release risk
- Regulatory / Contractual constraints
- Tool availability
- Existing CI / Test Architecture
- Team skill
- Human review capacity

---

## 20. Non-goals

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

必要性がExperiment Evidenceから確認された場合のみ別Planで検討する。

---

## 21. Risks

### Risk 1 — Infrastructure Developmentへの回帰

Experimentを始める前に必要以上のPlatformを作り始める可能性がある。

Mitigation:

- Current Artifactを再利用する。
- Manual Recordを許容する。
- 反復作業がEvidence付きPain Pointになるまで自動化しない。

### Risk 2 — Confirmation Bias

既存Agent Architectureを正当化するためのExperimentになる可能性がある。

Mitigation:

- Refutation可能なHypothesisにする。
- Baselineを置く。
- Negative Resultを保持する。
- Current Architecture自体をVariableにできるようにする。

### Risk 3 — Curriculumへの早すぎる一般化

一度の成功が教材の推奨事項になる可能性がある。

Mitigation:

- Knowledge Maturity Gate
- Curriculum PR分離
- Fresh Learner Validation

### Risk 4 — Training EnvironmentとFieldの差

Scenario Shopで有効でも実案件で無効な可能性がある。

Mitigation:

- Field-testedを独立Statusとする。
- Shadow / Assistから導入する。
- Field ConstraintをEvidenceとして戻す。

### Risk 5 — Metrics Gaming

Recall、Finding数、Automation率等、一つのMetricだけを最適化する可能性がある。

Mitigation:

- Precision / FPR / Cost / Intervention等とのTrade-offを見る。
- MetricはQuestionに必要なものだけ使用する。

### Risk 6 — Repository Complexity

Research向けArtifactが初心者のLearning Pathを複雑化する可能性がある。

Mitigation:

- Repository内部CapabilityとLearner-visible Pathを分離する。
- Beginner CurriculumからAdvanced Research Artifactを隠す。

---

## 22. Open Questions

以下はPlan Reviewまたは初期Experimentを通して決める。

1. Experiment Recordを既存`.codex/runs`へ統合するか、独立した軽量Directoryを持つか。
2. Knowledge Maturityの正本をどこに置くか。
3. Failure TaxonomyをMachine-readableにする時期。
4. External Knowledge IntakeをRepositoryに保存するか、Issue等を利用するか。
5. Human Active Time / Agent Costをどの精度まで収集するか。
6. Field Evidenceで機密情報をRepositoryへ持ち込まないためのAbstract / Redaction Contract。
7. Experiment ResultのReviewer IndependenceをどこまでRequiredにするか。
8. Model RevisionやTool Revisionが変化した際のKnowledge Revalidation Rule。

これらはPlan段階で過剰に固定せず、初期運用で必要性を確認する。

---

## 23. 次のAction

このPlanのReview完了前にはExperiment Platform Implementationを開始しない。

順序は以下とする。

1. このPlanを複数回レビューし、目的・境界・過剰設計リスクを詰める。
2. Current Foundation PR #23〜#25の最終状態を確認する。
3. 最新`main`へPlanをrebaselineする。
4. Foundation完了後、Feature Freeze / Stabilizationへ移行する。
5. 最初のExperimentを1件だけ選ぶ。
6. Current Artifactで実行し、不足を実測する。
7. 不足が本当に反復する場合だけ最小Implementationを別Plan化する。
8. Experiment → Knowledge → Curriculum → Field Feedbackを反復する。

---

## 24. Final Principle

このRepositoryにおいて、今後の主要な価値は「どれだけ高度なAgent Frameworkを作ったか」ではない。

価値は、次の問いへ継続的に回答できることにある。

> AI Agentは、どの条件でDevelopmentとQAへ有効なのか。
>
> どの条件では人間、Deterministic Automation、または別のApproachを使うべきなのか。
>
> その判断を再現可能なEvidenceで説明できるか。
>
> そのKnowledgeを他者が学び、実案件で安全に再利用できるか。

Repositoryは答えを固定する場所ではなく、**答えを検証し続けるためのTraining / Experiment / Feedback Platform**として運用する。
