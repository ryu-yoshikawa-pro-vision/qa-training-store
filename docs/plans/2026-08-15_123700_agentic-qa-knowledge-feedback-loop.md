# QA Training・Agentic QA 継続改善・知見循環計画

- Plan Revision: `v11`
- Status: `Draft / Review Required`
- Created: 2026-08-15 JST
- Revised: 2026-08-15 JST
- Scope: Test Target / Test Automation / Agentic QA / Experiment / Knowledge Promotion / Curriculum Operating Plan

## 0. 位置づけ

この計画は、`qa-training-store`を単なるSample Application、Test Automation Repository、
またはAgent Framework Repositoryとして拡張し続けるための計画ではない。

本Repositoryを、次の3領域を継続的に育てるQA Training / Experimental Platformとして運用する。

1. **Test Target**: QA対象として十分に現実的で、Risk・状態・難易度・Testabilityを持つProduct。
2. **Curriculum**: Test Targetと現在のQA Practiceに追従し、段階的に学べるTraining Environment。
3. **Agentic QA System**: AI Agent、Skill、QA Policy、Harness、Evaluation、Test Automation等からなるQA実行基盤。

この3領域を独立した完成物として扱わない。
Test Targetの不足はCurriculumやAgentic QAの学習価値を下げ、CurriculumのGapはTest Targetの不足を発見し、
Agentic QAのFailureはSkill / HarnessだけでなくSpecification、Test Target、Regression Automationの不足を示すことがある。

このPlanの中心は「Agentを使うこと」「機能を増やすこと」「教材を増やすこと」ではない。

> **Test Target、Curriculum、Agentic QA SystemをExperimentとEvidenceで継続的に改善し、
> より現実的で難しいQAを高品質に実行・学習できるRepositoryへ育てる。**

目的は次の10点である。

1. Test Automationを段階的に学習できる。
2. Test TargetをQA学習・QA実験に適したProductとして継続的に成熟させる。
3. AI AgentがRepository内でQAを実行できる。
4. AI AgentによるTest Design、Exploration、Review、Failure Diagnosis、Repairを検証できる。
5. Agent、Context、Tool、QA Mode、Skill、Harness等のApproachを比較可能なEvidenceで評価できる。
6. Known Regressionを適切なTest LayerへDeterministic Automationとして固定できる。
7. CurriculumをTest Target、QA Risk、Tooling、Agentic QAの進化へ追従させる。
8. False Positive、False Negative、Scope Violation、Regression、Flake等を減らす改善Loopを作る。
9. 実験結果を再利用可能なKnowledgeへ変換し、必要なArtifactへPromotionできる。
10. Promotion後の効果を正式なExperimentで再評価し、新しいQuestionへ戻せる。

特定のAgent構成、Model、Tool、QA Mode、Skill、Harness、Test Architecture、Curriculum構成を
永続的な正解として固定しない。
現在のRepository Architecture、Test Target、Curriculum、Agentic QA運用自体もEvaluation対象とする。

---

## 1. North Star

```text
External Knowledge / Industry Practice ─┐
                                        │
Repository QA Failure ──────────────────┤
                                        │
Test Target Gap ────────────────────────┤
                                        │
Curriculum / Learner Gap ───────────────┤
                                        │
Harness / Tool / Automation Pain ───────┤
                                        ↓
                                     Question
                                        ↓
                              Hypothesis / Goal
                                        ↓
                               Controlled Experiment
                                        ↓
                                Evidence / Metrics
                                        ↓
                            Reproduction / Refutation
                                        ↓
                              Knowledge Consolidation
          ┌───────────────┬──────────────┼──────────────┬──────────────┬─────────────┐
          ↓               ↓              ↓              ↓              ↓             ↓
     Test Target   Regression       QA Policy        Skill         Harness      Curriculum
      / Spec       Automation
          └───────────────┴──────────────┼──────────────┴──────────────┴─────────────┘
                                        ↓
                           Repository-wide Re-evaluation
                                        ↓
                         Failure / Improvement / New Gap
                                        ↓
                                  New Question
                                        ↺
```

主要成果は機能数、Test Case数、Agent数、Automation率、AI生成率、教材ページ数ではない。

> Test TargetのQA価値、Curriculumの学習価値、Agentic QAの品質をEvidenceで高め、
> 改善理由と成立条件を後から説明できる状態を作る。

重要なQuestionについて最低限次を説明できることを成果とする。

- 何を試し、何と比較したか。
- Product / QA / TrainingのどのGapを解消しようとしたか。
- QAのどのOutcomeを改善しようとしたか。
- 何が改善し、何が悪化し、何が変わらなかったか。
- どの条件で成立し、どの条件では成立しないか。
- 再現したか、支持されなかったか、反証されたか、何がまだ不明か。
- Test Target / Specification / Regression Automation / QA Policy / Skill / Harness / Curriculumの
  どこへ反映すべきか。
- 反映後に対象領域とRepository全体が本当に改善したか。

---

## 2. SSOTと責務境界

このPlanはExperiment governance、Knowledge lifecycle、Promotion判断の正本であり、既存SSOTを再定義しない。

| 責務 | 正本 |
| --- | --- |
| Product Expected Behavior | `docs/spec/**` と既存Normative Specification |
| Product Implementation | Current Application Source / Architecture |
| Formal Regression Automation | `e2e/**`、`maestro/**`、Unit / Integration / Contract Test等の各正本 |
| Agentic QA実行・採点・Evidence Contract | `QA_AGENT.md`、`scripts/agentic-qa/**` と関連Contract |
| Agent Skill | `.agents/skills/**` とSkill固有Contract |
| Visual Reference / Screen Contract | Screen Catalog / Visual Specificationの正本 |
| Curriculum / Competency / Training Contract | `docs/curriculum/**` とTraining Environmentの正本 |
| Experiment / Knowledge / Promotion判断 | このPlan |

このPlanと各領域の正本が矛盾する場合、Product Behavior、実行仕様、採点式、Skill実装、
Formal Test、Curriculum要件は各領域の正本を優先する。

このPlanが定義する範囲は次に限定する。

- Test Target / Curriculum / Agentic QA SystemのGapをQuestionへ変換する方法。
- Experimentの開始、比較、停止方法。
- EvidenceからKnowledgeへの判断方法。
- Knowledgeの再検証方法。
- KnowledgeをどのArtifactへPromotionするかの判断方法。
- Promotion後の改善を正式なExperimentで再評価する方法。

Official ScoreやMetricの厳密な計算式は複製せず、各SSOTを参照する。

### 2.1 Skill、Harness、Regression Automationの境界

Skill、Harness、Regression Automationを同じ責務にしない。

- **Skill**: Agentの観察、推論、計画、Tool利用、Failure Analysis等の手順・判断知識を持つ。
- **Harness**: Deterministicな準備、Isolation、Evidence Integrity、Evaluation、Scoring、Artifact管理等を担う。
- **Regression Automation**: Expected Behaviorと判定方法が安定したKnown Regression / Contractを、
  適切なTest LayerでDeterministicに継続検知する。
- **QA Policy**: `QA_AGENT.md`等で、QA Mode、Gate、必須Evidence、禁止事項、責務境界を定義する。

HarnessをAgent launcher、汎用Agent orchestrator、独自Agent Runtimeへ拡張することを既定路線にしない。
Agentの判断問題をHarnessへ押し込みすぎず、Known BehaviorをAgentへ毎回探索させすぎず、
Deterministicに保証すべき問題だけをHarnessまたはRegression Automationへ移す。

### 2.2 Test TargetとSpecificationの境界

Test Targetを難しくするためにExpected Behaviorを曖昧にしない。

- Productの複雑さはState、Role、Boundary、Async、Recovery等の意味あるRiskから作る。
- Specification不足をAgent Skillで吸収することを既定解にしない。
- `SPEC_AMBIGUITY`が反復する場合はProduct SpecificationのClarification候補として扱う。
- Testabilityのために不自然なProduct Behaviorを追加しない。
- Test用ControlやStable IDが必要な場合は、Product ContractとTest Controlの責務を分離する。

---

## 3. Experiment原則

### 3.1 Study Intent、Design Type、Target Areaを分離する

実験目的、比較設計、改善対象を同一Enumにしない。
各Experimentは3軸を独立して指定する。

#### Study Intent

| Intent | 目的 | 主な要求 |
| --- | --- | --- |
| `exploratory` | 未知のFailure・Gap・挙動・仮説候補を発見する | ObservationとEvidence |
| `confirmatory` | 重要仮説を反証可能な形で確認する | 事前登録、独立Run、反復、Decision Rule |

#### Design Type

| Design | 意味 | 主な要求 |
| --- | --- | --- |
| `single_variant` | 一つの条件・Approachを観測する | Observation条件を固定する |
| `comparative` | 2つ以上の条件・Approachを比較する | Variant、比較条件、Evaluationを事前固定する |

#### Target Area

| Area | 主な対象 |
| --- | --- |
| `test_target` | Feature、State、Role、Risk、Testability、Specification、QA難易度 |
| `regression_automation` | Playwright、Maestro、Unit / Integration / Contract Test等のKnown Regression検知 |
| `qa_execution` | Agent、Model、Context、Prompt、QA Mode、Review / Repair Flow |
| `harness` | Isolation、Evidence、Scoring、Deterministic Control、Artifact Integrity |
| `training` | Learner Flow、Curriculum、Competency、Training Environment、難易度設計 |

例:

- `study_intent=exploratory` + `design_type=single_variant` + `target_area=test_target`
- `study_intent=confirmatory` + `design_type=comparative` + `target_area=qa_execution`
- `study_intent=exploratory` + `design_type=single_variant` + `target_area=harness`
- `study_intent=confirmatory` + `design_type=comparative` + `target_area=training`

Exploratory Observationを、そのままConfirmatoryな結論へ昇格させない。

### 3.2 Questionから開始する

「機能を増やす」「Agentを増やす」「新Modelを試す」「Skillを追加する」「教材を増やす」だけでは
Experimentとしない。

```text
Question
↓
HypothesisまたはExploratory Goal
↓
Study Intent / Design / Target Area
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
↓
Promotion Decision
```

`Result`は観測・計測した事実、`Interpretation`はそこから導いた推論として分離する。
因果を証明できない場合は因果として断定しない。

### 3.3 Negative Evidenceを残す

Failure、Block、False Positive、False Negative、Human Intervention、Unexpected Regression、
Contradictory Result、Protocol Violation、Learning Failure、Test Target GapもKnowledge Sourceとして保存する。

未実行、Evidence不足、Capability不明、Environment BlockをPASSやAgent Successへ変換しない。
Agentの自己申告だけをGround Truthにしない。

同一Question / Hypothesisに関する失敗Experimentを、後続の成功Experimentだけで上書きしない。
Experiment Family単位でPositive / Negative / Invalid Evidenceを追跡する。

### 3.4 同じOutcomeだけを比較する

Human QA、Deterministic Automation、Agentic QAを常に同列の競合手段として扱わない。
先に比較対象となるCapability / Outcomeを定義する。

例:

- Known Regression Detection
- Unknown Defect Discovery
- Test Design Quality
- Failure Diagnosis Accuracy
- Review Precision
- Repair Success
- Scope Control
- Evidence Completeness
- Test Target Risk Coverage
- Curriculum Completion / Failure Analysis Success

同じOutcomeを狙わないApproach間の数値差を優劣として解釈しない。

### 3.5 Agent比較は単一Runで一般化しない

AI Agentは非決定的である。
`design_type=comparative`または`study_intent=confirmatory`でAgent性能差を論じる場合、
必要な独立Run数またはRun Count決定ルールを実行前に定める。

最低限、RunごとのResult、代表値、ばらつき、Best / Worst、Failure率、Protocol Invalid Run数を区別する。
単一Runだけを根拠にAgent構成、Model、Skill、PromptをRecommendedへ昇格させない。

### 3.6 Confirmatoryは支持・反証条件まで事前固定する

`study_intent=confirmatory`ではMetricを列挙するだけでは不十分である。
結果を見る前に最低限以下を固定する。

- Hypothesis
- Variant / Comparison
- Primary Outcome
- Secondary Outcome / Guardrail Outcomeがある場合の扱い
- Evaluation Method
- Support Rule
- Refutation Rule
- Minimum Practical Effectまたは意味のある差の基準
- Aggregation Rule
- Stop Condition
- Invalid Run Condition
- Planned Run Countまたは決定ルール

例:

```yaml
primary_outcome: precision
guardrail_outcomes:
  recall: "degradation <= 3pp"
minimum_practical_effect:
  value: "+5 percentage points"
  not_applicable_reason:
aggregation_rule: median_across_independent_runs
decision_rule:
  support_if: "precision improves >= 5pp and recall degradation <= 3pp"
  refute_if: "precision degrades >= 5pp"
  otherwise: not_supported
```

Minimum Practical Effectを合理的に定義できないテーマでは、無理に数値を置かず、
`not_applicable_reason`をExecution前に記録する。

厳密な統計検定をすべてのExperimentへ必須にはしない。
ただしResult確認後に都合のよいMetricだけを選んでHypothesis Supportと判定しない。
Support Rule未達を自動的にRefutationへ変換しない。

### 3.7 事後調整を同一成功として扱わない

ConfirmatoryまたはComparative Designでは、実行前Designを固定する。

Result確認後にFeature、Specification、Prompt、Skill、Tool Scope、Metric、Decision Rule、条件等を変えた場合は、
同一Experimentの成功として扱わず、Variantまたは新しいExperiment Revisionとして扱う。

### 3.8 BenchmarkやGround Truthへの過適合をQA改善とみなさない

Scored ChallengeやBenchmarkの数字だけを改善する変更をQA強化と扱わない。

以下を禁止する。

- Hidden Answer、Ground Truth、Expected FindingをAgent Contextへ混入させる。
- Benchmark固有の答えをSkillやPromptへ埋め込む。
- Failureを隠すためにEvaluatorやMetricを弱める。
- Scoreを上げるためにQA ScopeやEvidence要件を縮小する。
- Benchmark専用の不自然なProduct BehaviorをTest Targetへ追加する。

改善は、事前定義したOutcomeとEvidence Integrityを維持したまま成立していることを確認する。

### 3.9 Test Targetを複雑化すること自体をGoalにしない

Test Target変更は、QA学習価値、QA実験価値、Product Realismのいずれかを明確に改善する場合に行う。

Test Target Gapの候補例:

- State Transitionが浅く、状態依存QAを学べない。
- Role / Permission差分が少なく、Authorization Riskを扱えない。
- Boundary / Validationが単純で、境界値設計を十分に学べない。
- Async / Loading / Partial Failure / Retry / Recoveryが少なく、現実的な非同期Riskを扱えない。
- Persistence / Session / Cross-screen Consistencyが弱い。
- Web / Native固有のLifecycleやResponsive Riskが不足している。
- Error / Empty / Loading Stateが不足している。
- Accessibility / Localization / Date-Time等、必要なQuality Characteristicを扱えない。

ただし、上記を機械的なFeature Checklistとして全部実装しない。
変更候補ごとに最低限以下を説明する。

```yaml
test_target_change:
  gap_or_question:
  capability_or_feature:
  qa_risk:
  learning_value:
  agentic_qa_value:
  realism_value:
  added_complexity:
  expected_test_layers: []
  curriculum_impact:
  specification_impact:
```

「現実のECにありそう」「難しい方が勉強になる」だけでは実装理由にしない。
Added Complexityに対してQA / Training上のInformation Gainが小さい場合は追加しない。

### 3.10 Industry AlignmentはInputであり正解ではない

Industry Practice、Official Documentation、QA / Security / Accessibility等の標準的Practice、
一般的なProduct Patternは、Repositoryを現実に近づけるInputとして利用する。

ただし外部Practiceを無検証でRepositoryへコピーしない。

- Normative Constraintは制約として扱う。
- Tool Factは一次情報で確認する。
- Product / QA PracticeはCurrent RepositoryのGap候補として扱う。
- Empirical Claimは原則Experimentで検証する。

「業界標準に近い」を、ArchitectureやFeature数を増やす免罪符にしない。

---

## 4. Experiment Lifecycleと記録

Lifecycleは次の9段階とする。

1. `Question`
2. `Classify`
3. `Design`
4. `Pre-register when required`
5. `Execute`
6. `Evaluate`
7. `Reproduce / Refute`
8. `Knowledge Decision`
9. `Promotion Decision`

Designでは最低限、Experiment ID、Experiment Family、Study Intent、Design Type、Target Area、Question、
Hypothesis / Goal、Task、Capability、Comparison、Controlled Variables、Agent / Model、Context Policy、
Tool Scope、Revision、Environment、Evaluation Method、Required Metrics、Stop / Invalid条件、Run Countを決める。

既存のRepository Harness、Run Artifact、QA Artifact、Formal Test、Scored E2E等を可能な限り再利用する。
Experiment専用Infrastructureは最小化する。

### 4.1 Experiment FamilyとLineage

同一Question / Hypothesisの複数Experimentを束ね、成功したExperimentだけを後から引用するSelection Biasを防ぐ。

```yaml
experiment_family_id:
experiment_id:
parent_experiment_id:
derived_from: []
```

- `experiment_family_id`: 同一Question / Hypothesisを追う一連のExperimentを束ねる。
- `parent_experiment_id`: 直前のExperimentから直接派生した場合に記録する。
- `derived_from`: 複数ExperimentやExternal Evidenceを基に設計した場合の参照を持つ。

Feature、Specification、Prompt、Skill、Tool、Model、条件を変えて成功するまで試行した場合も、
同一Family内の失敗履歴を残す。
Knowledge Consolidationでは単一Experimentだけでなく、関連Family全体のEvidenceを確認する。

### 4.2 Pre-registrationの固定証跡

Confirmatory Experimentおよび事前固定を必要とするComparative Designでは、Execution開始前のDesignを追跡可能にする。
大規模Registryは作らずGitまたは既存Artifactのimmutable referenceを利用する。

```yaml
design_revision:
pre_registered_at:
pre_registration_ref:
```

`pre_registration_ref`はCommit SHA、Artifact digest等、実行後の書き換えを判別できるReferenceとする。
事後修正したDesignを元から事前登録済みだったものとして扱わない。

### 4.3 Failure、Evaluation Invalid、Invalid Runを分離する

`RUN_INVALID`はAgentやProductが失敗したRunを都合よく除外するために使わない。
Runの成否と、そのRunからEvaluation値を算出できるかを別に扱う。

`RUN_INVALID`にできるのは、事前定義したExperiment Protocol自体が壊れ、予定した条件でRunを解釈できない場合に限定する。

例:

- Variant取り違え。
- Prior Result / Hidden Answerの混入。
- Pre-registered条件からの逸脱。
- Evaluator / Ground Truth破損。
- 実行対象のFailureではなく計測・収集Protocolの破損でRequired Evidenceを取得できない。

以下は原則として通常Result / Failureとして残す。

- AgentがTool操作に失敗した。
- AgentがTimeout / Budget Exhaustionした。
- Agentが完走できなかった。
- Browser / Runtime / Environment Failure。
- Agent起因のHuman Intervention。
- Test Target自体が想定したRiskを十分に生成できなかった。

Tool / Runtime / Agent Failureの結果としてRequired Evidenceが欠損した場合、Run自体は通常Failureとして保持する。
欠損したEvidence、Failure Code、理由を保存し、そのEvidenceを必要とするMetricまたはEvaluationだけを
`invalid`または`not_computable`とする。

Invalid Runは理由とEvidenceを必須とし、Variant別のInvalid率も報告する。

### 4.4 Human Baseline

Human Baselineを使う場合は、比較可能性に影響する範囲で次を記録する。

- Experience band / Role
- Tool allowance
- Time budget
- Specification access
- Training Environment familiarity

個人評価を目的とせず、不要な個人情報は記録しない。
Participantを識別できるPerformance DataはRepositoryへ保存しない。
必要な場合は匿名化・集計する。

### 4.5 実行主体と実行条件のIdentityを残す

Experimentを後から再現・比較・再検証できるよう、Raw Experiment Record側でExecutor Identityを保持する。

AI Agentを使用するExperimentでは取得可能な範囲で最低限以下を記録する。

```yaml
executor:
  type:
  role:
  model_or_runtime:
  configuration_ref:
  prompt_or_skill_ref:
  context_policy:
  tool_scope_ref:
```

- `model_or_runtime`: 実際に使用したModel / Runtime identity。証明できない場合は`unknown`。
- `configuration_ref`: Reasoning、Agent設定、Runner profile等のReference。
- `prompt_or_skill_ref`: Prompt / Skill / Agent instructionのRevisionまたはimmutable Reference。
- `context_policy`: Fresh / inherited、Gray-box / Black-box等のContext条件。
- `tool_scope_ref`: 利用可能Toolと制約を特定できるReference。

Identityが取得できないことを隠さず`unknown`として記録する。
HumanまたはDeterministic Automationで該当しない項目は`not_applicable`としてよい。

### 4.6 最小Experiment Record

初期段階ではDatabaseやExperiment Management Applicationを作らない。
既存Artifactまたは軽量なMachine-readable Recordを使う。

```yaml
experiment_family_id:
experiment_id:
parent_experiment_id:
derived_from: []
study_intent:
design_type:
target_area:
question:
hypothesis_or_goal:
capability:
source_revision:
required_capabilities: []
optional_capabilities: []
promotion_targets: []
variants: []
controlled_variables: []
environment: {}
executor:
  type:
  role:
  model_or_runtime:
  configuration_ref:
  prompt_or_skill_ref:
  context_policy:
  tool_scope_ref:
design_revision:
pre_registered_at:
pre_registration_ref:
confirmatory_contract:
  primary_outcome:
  guardrail_outcomes: {}
  secondary_outcomes: []
  minimum_practical_effect:
    value:
    not_applicable_reason:
  aggregation_rule:
  decision_rule:
    support_if:
    refute_if:
    otherwise:
execution:
  planned_run_count:
  completed_run_count:
  invalid_run_count:
  stop_condition:
  invalid_conditions: []
runs:
  - run_id:
    variant_id:
    status: completed | failure | invalid
    artifact_ref:
    failure_codes: []
    invalid_reason:
    evaluation_status: valid | partial | invalid | not_computable
    missing_evidence: []
    evidence_refs: []
evaluation:
  method:
  ground_truth_ref:
  required_metrics: []
results: []
interpretation:
conclusion:
knowledge_refs: []
next_action:
```

`confirmatory_contract`は`study_intent=confirmatory`でRequiredとする。
AI Agent Experimentでは`executor`をRequiredとし、不明なIdentityは省略せず`unknown`として残す。
各Runは`run_id`で一意に追跡し、既存Run Artifactを正本とする場合は改変されない`artifact_ref`を必須とする。
Run、Variant、Failure / Invalid理由、Evaluation可否、Evidenceの対応はRun単位で追跡する。
集約`results`はRun Recordを正本として算出し、Run単位Evidenceの代替にはしない。

---

## 5. EvidenceとKnowledge Model

Knowledgeを単一の成熟度階段で管理しない。
Evidenceの蓄積状態、Claimへの判定、再現範囲、外部支持、ArtifactへのPromotionを分離する。

### 5.1 Evidence State

| State | 定義 |
| --- | --- |
| `none` | 有効なExperiment Evidenceがない |
| `observed` | 条件とEvidence付きで1回以上観測 |
| `reproduced` | 独立Runで複数回再現 |
| `conflicting` | 有効なEvidence同士が矛盾している |

同一RunのRetry、実質同一Contextの再試行、失敗後に条件調整した成功だけでは`reproduced`としない。

### 5.2 Claim Assessment

| Assessment | 定義 |
| --- | --- |
| `untested` | 有効な判定をまだ行っていない |
| `supported` | 事前定義したSupport Ruleまたは十分なEvidenceによりClaimを支持 |
| `not_supported` | Support Ruleを満たさないが、反対命題まで支持するEvidenceはない |
| `refuted` | 事前定義したRefutation Ruleまたは十分な反証EvidenceによりClaimを反証 |
| `inconclusive` | Conflict、Evidence不足等で支持・反証を判定できない |

`not_supported`と`refuted`を同一視しない。

### 5.3 Replication Scope

```yaml
replication_scope:
  same_condition: false
  cross_task: false
  cross_platform: false
  cross_model: false
  cross_environment: false
```

同一条件での再現と、異なるTask / Platform / Modelでの再現を同じ強さとして扱わない。
Promotion判断ではClaimの`applies_to`とReplication Scopeを対応させる。

Claimが単一Platform / Taskに限定される場合、無関係なCross-platform / Cross-task Validationを必須にしない。
広い一般化を主張する場合だけ、そのScopeを裏付けるHoldout / Cross-task / Cross-platform Evidenceを要求する。

### 5.4 External Support

| Status | 定義 |
| --- | --- |
| `none` | 外部Evidence未確認 |
| `supporting` | 独立した外部Evidenceが支持 |
| `mixed` | 支持と反証が混在 |
| `conflicting` | 主要外部Evidenceと衝突 |
| `not_applicable` | 外部支持が不要または適用不能 |

### 5.5 Promotion StatusとTarget

Knowledgeは「成熟したら何か1つへ昇格する」とは限らない。
Promotion TargetごとにStatusを持つ。

Status:

- `not_applicable`
- `experimental`
- `candidate`
- `recommended`
- `stale`
- `deprecated`

Target:

- `test_target`: QA対象としてのFeature、State、Risk、Testability、Specificationを改善する。
- `regression_automation`: Known Regression / Contractを適切なTest LayerへDeterministicに固定する。
- `qa_policy`: Repository全体のAgentic QA Contract、Gate、禁止事項、QA Mode等。
- `skill`: Agentの判断・探索・Tool利用・Failure Analysis等の再利用可能な手順知識。
- `harness`: DeterministicなIsolation、Evidence、Evaluation、Scoring、Artifact Integrity等。
- `curriculum`: 学習教材、演習、Competency、Failure Lesson、難易度設計等。

例:

```yaml
promotion:
  test_target: not_applicable
  regression_automation: candidate
  qa_policy: candidate
  skill: recommended
  harness: not_applicable
  curriculum: candidate
```

一つのKnowledgeが複数Targetへ適用できる場合も、それぞれ独立して判断する。
Skillで有効だからHarnessへ実装する、Harnessで有効だからFormal Regressionへ入れる、
Productが複雑だからCurriculumのBest Practiceにする、と自動変換しない。

### 5.6 Atomic Knowledge ClaimとPractical Effect

Knowledge Claimは反証可能な最小単位にする。
「Fresh ContextはAgentic QAを改善する」「Productを複雑にすると学習効果が上がる」のような広すぎるClaimを避ける。

```yaml
claim:
  subject:
  comparison:
  outcome:
  direction:
context:
  qa_mode:
  platform:
  task_class:
conditions: []
effect:
  observed:
  practical_threshold:
    value:
    not_applicable_reason:
```

0.1ポイントの差と、意思決定を変える差を同じ`improve`として扱わない。
適用不能なテーマでは`not_applicable_reason`を残す。

異なるOutcome、Platform、QA Modeで結果が分かれる場合は別Knowledgeとして管理する。
上位Patternが必要な場合は複数Atomic Knowledgeを参照して一般化する。

### 5.7 Knowledge IdentityとTraceability

```yaml
knowledge_id:
claim: {}
context: {}
conditions: []
effect: {}
applies_to: []
does_not_apply_to: []
evidence_state:
claim_assessment:
replication_scope: {}
external_support:
promotion:
  test_target:
  regression_automation:
  qa_policy:
  skill:
  harness:
  curriculum:
experiment_family_refs: []
evidence_refs: []
conflicting_evidence_refs: []
validated_at:
validated_against:
  model_or_runtime:
  tool_revision:
  repository_revision:
  executor_condition_refs: []
  environment_refs: []
promotion_artifacts: []
knowledge_reviews:
  - review_ref:
    reviewer_identity:
    reviewed_revision:
    independence_check:
    decision:
revalidation_triggers: []
supersedes: []
superseded_by: []
```

`executor_condition_refs`と`environment_refs`はRaw Experiment側のimmutable条件を参照し、
Prompt、Skill、Configuration、Context Policy、Tool Scope等をKnowledge Recordへ重複コピーしない。

Knowledge Reviewでは手書きされた`experiment_family_refs`だけに依存しない。
Canonical Experiment Record Locationを検索し、参照対象Familyの全Recordを確認する。
同一FamilyのNegative / Invalid Evidenceを意図的または偶発的に除外しない。

### 5.8 Promotion昇格

`recommended`は単一Runや単一成功だけで付与しない。
最低限次を確認する。

- Claim Assessmentが`supported`である。
- 複数Runまたは必要な複数条件でEvidenceが支持される。
- Replication ScopeがClaim ScopeとPromotion Targetに対して十分である。
- 重大なConflicting Evidenceが未整理で残っていない。
- Applicable / Non-applicable Conditionsを説明できる。
- Failure SignとRecovery / Rollbackを説明できる。
- Practical Effectが意思決定上十分、または適用不能理由が妥当である。
- Promotion先の責務境界に適合する。
- Promotion後Validationが必要なTargetでは、5.9のValidationを完了している。

`recommended`への昇格はIndependent Knowledge ReviewをRequiredとする。
対象Knowledge Revisionに対するReview Reference、Reviewer Identity、Review対象Revision、
独立性確認結果、Decisionを保存する。

Review証跡がない場合、または独立Reviewerを用意できない場合、最大`candidate`までとする。

### 5.9 Promotion後ValidationもExperiment Contractへ戻す

Test Target、Regression Automation、QA Policy、Skill、HarnessへPromotionした変更は、
実装しただけで`recommended`としない。

Promotion後評価は、原則として次のいずれかで実施する。

- 元Experiment FamilyのChild Experiment。
- Promotion Effectを検証する新しいConfirmatory Experiment。

最低限、元Knowledgeが期待するEffectをPrimary OutcomeまたはGuardrail Outcomeへ接続し、
結果を見る前にDecision Ruleを固定する。

```text
Knowledge supported
↓
Promotion Target = candidate
↓
Target Artifact Change
↓
Post-promotion Experiment
↓
Target-specific Validation + Guardrail確認
↓
Independent Knowledge Review
↓
recommended / candidate維持 / stale / revert
```

「変更後に一度QAしたら良さそうだった」をPromotion成功としない。

---

## 6. Failure TaxonomyとMetrics

### 6.1 Failure Taxonomy v1

| Code | 意味 |
| --- | --- |
| `SPEC_AMBIGUITY` | Specification / Acceptance Criteriaが曖昧 |
| `TEST_TARGET_GAP` | QA / Trainingに必要なRisk・State・Feature・Testabilityが不足 |
| `CONTEXT_MISSING` | 必要Context不足 |
| `CONTEXT_OVERLOAD` | 不要情報が判断を阻害 |
| `ORACLE_FAILURE` | Expected Behaviorを誤認 |
| `AGENT_REASONING_FAILURE` | 情報はあるが推論・計画・判断を誤る |
| `TOOL_FAILURE` | Browser / MCP / Maestro / CLI等の失敗 |
| `ENVIRONMENT_FAILURE` | Build / CI / Runtime / Emulator / Network等の失敗 |
| `AUTOMATION_FLAKE` | Deterministic Automation自体が不安定 |
| `REGRESSION_GAP` | Known Regressionを適切なDeterministic Testで保護できていない |
| `CURRICULUM_GAP` | 学習Goal、難易度、説明、演習、Current Repositoryとの整合不足 |
| `FALSE_POSITIVE` | DefectでないFinding |
| `FALSE_NEGATIVE` | Ground Truth上のDefectを見逃す |
| `DUPLICATE_FINDING` | 同一原因を複数Findingとして過大計上 |
| `OVER_REPAIR` | 必要範囲を超えた修正 |
| `UNDER_REPAIR` | Root Cause / Required Scopeを修正しきれない |
| `REGRESSION_INTRODUCED` | 修正により新Regressionを導入 |
| `SCOPE_VIOLATION` | 許可外の責務 / Sourceへ変更 |
| `HUMAN_INTERVENTION` | Agent単独で継続不能 |
| `EVALUATION_FAILURE` | Evaluator / Ground Truth / Metric問題 |
| `RUN_INVALID` | Protocol破損によりExperiment Resultとして解釈不能 |

分類不能・重複が増えた場合にTaxonomyを改訂する。
Agent能力不足、Specification不足、Test Target不足、Curriculum不足、Tool不足、Environment不足を混同しない。
`RUN_INVALID`の適用は4.3に従う。

Failure Taxonomyは原因分類の正本であり、調査開始Evidenceの固定Pathまでは定義しない。
Browser、MCP、Maestro、CLI、CI等で適切なEvidence経路は異なるため、Evidence取得・Troubleshooting手順は
各Execution / Curriculum SSOTを正とする。

### 6.2 Metrics

MetricはQuestionに必要なものだけ選択し、Official Agentic QAの計算式は既存SSOTを正とする。
候補は以下とする。

- QA: Recall、Precision、FPR、Coverage、Reproduction Rate
- Review: Defect Detection、Duplicate Rate、Severity Accuracy、Scope Accuracy
- Repair: First-pass Success、Repair Success、Regression Introduction、Scope Violation
- Reliability: Completion Rate、Tool Failure Rate、Flake Rate、Evidence Completeness
- Test Target: Risk Variety、State / Role Coverage、Feature-to-Test-Layer Fit、Testability Gap
- Regression Automation: Known Regression Coverage、Layer Fit、Flake Rate、Failure Diagnostic Value
- Delivery: Lead Time、Cycle Time、Human Active Time
- Cost: Agent Runtime、Tool Action、CI Runtime、Agent Cost
- Education: Completion、Failure Analysis Success、Time to Competency、Instructor Intervention、Difficulty Fit

Test TargetのFeature数、Test Case数、教材ページ数、AI生成コード率、Agent利用回数、Automation率、Token量、PR数、
Finding件数を単独のSuccess KPIにしない。

Confirmatory ExperimentではPrimary OutcomeとDecision Ruleを事前固定し、
複数Metricの中から事後的に都合のよいものだけを成功判定へ使わない。

---

## 7. External Knowledge / Industry Practice Intake

外部Knowledgeは種類を分けて扱う。

| Class | 例 | 扱い |
| --- | --- | --- |
| `Normative / Constraint` | Security、Accessibility、Repository policy、Tool制約 | 制約として扱う |
| `Tool Fact` | Official Documentation上のAPI仕様 | 一次情報で確認する |
| `Product / QA Practice` | 一般的なState、Role、Recovery、Test Design Pattern | Gap候補として比較する |
| `Empirical Claim` | Agent構成が品質を改善する等 | 原則Hypothesisとして検証する |
| `Anecdotal Observation` | Blog、Conference Talk、個別事例 | 仮説候補とする |

外部情報をすべて仮説とは扱わないが、Product / QA PracticeやEmpirical Claimを
RepositoryのBest Practiceへ直接昇格させない。

```yaml
claim:
claim_class:
source:
source_type:
published_or_observed_at:
verified_at:
applicable_version:
why_relevant:
current_gap_or_assumption_challenged:
proposed_target_area:
proposed_experiment:
priority:
```

`Tool Fact`は確認日時と対象Versionを残し、Tool更新後に古いFactを無条件に使い続けない。
長文要約の蓄積自体を目的にしない。

---

## 8. Knowledge Promotion

Experiment Resultを直接Product、Formal Test、Skill、Harness、QA Policy、Curriculumへ反映しない。

```text
Experiment Result
↓
Knowledge Review
↓
Promotion Decision
↓
Target Artifact Change as candidate
↓
Post-promotion Experiment
↓
Independent Review
↓
recommended / maintain candidate / revise / stale / revert
```

### 8.1 Test Target / Specification Promotion

Test TargetへPromotionするのは、QA / Training価値を上げるProduct GapまたはSpecification Gapが
Evidence付きで確認された場合である。

候補例:

- MeaningfulなState Transition追加。
- Role / Permission差分追加。
- Boundary / Validationの現実的な拡張。
- Async / Loading / Error / Retry / Recovery State追加。
- Persistence / Session / Cross-screen Risk追加。
- Web / Native特有Riskの追加。
- Specification Clarification。
- Testability改善。

Test Target変更はProduct RequirementとNormative Specificationへ正しく反映する。
「Agentを困らせるため」のFeatureや、Benchmark専用の罠を追加しない。

Test Target変更後は最低限、次への影響を確認する。

- Product Specification。
- Formal Regression Automation。
- Agentic QA Challenge / Charter / Coverage。
- Visual Specification。
- Curriculum / Workbook / Exercise。

### 8.2 Regression Automation Promotion

Regression AutomationへPromotionするのは、Expected Behaviorと判定方法が安定し、
Agentによる未知探索ではなくDeterministicに継続検知する方が適切なKnown Regression / Contractである。

候補例:

- Web Runtime Regression → Playwright。
- Native Runtime Regression → Maestro等のNative Runtime Test。
- Component / Logic Contract → Unit / Component / Integration Test。
- CI / Repository Contract → Contract Test / Validator。

すべてのAgent FindingをE2Eへ追加しない。
Suggested Regression Layer、Risk、Failure Diagnostic Value、実行Cost、Flake Riskを見てLayerを選ぶ。

### 8.3 Skill Promotion

SkillへPromotionするのは、Agentの判断・手順・Tool利用方法として再利用する価値があるKnowledgeである。

候補例:

- Explorationの進め方。
- Specificationの読み方。
- FindingのAtomic化。
- Failure Diagnosisの手順。
- Evidence確認順序の判断原則。
- 修正前後のReview戦略。

Skillへ入れる内容は特定Benchmarkの答えではなく、Claim Scopeに応じた再利用可能な判断原則にする。
Specification GapやKnown RegressionをSkillルールで無理に吸収しない。

### 8.4 Harness Promotion

HarnessへPromotionするのは、Deterministicに保証した方がQAの再現性・Evidence Integrity・Evaluation信頼性を高めるKnowledgeである。

候補例:

- Fresh Session / Context保証。
- Test Data Reset。
- Tool / Source Isolation。
- Artifact Integrity。
- Required Evidence検証。
- Scoring / Evaluation Contract。
- TimeoutやCleanupのDeterministic Control。

Agentの判断を丸ごとHarnessへ移さない。
Harness追加は「Agentが失敗したから自動化する」ではなく、同種Failureが反復し、Deterministic保証が適切であるEvidenceがある場合に限る。

### 8.5 QA Policy Promotion

QA PolicyへPromotionするのは、個別SkillやHarnessを超えてRepository全体で守るべきContractである。

候補例:

- Official QA Modeの境界。
- 必須Evidence。
- Ground Truth隔離。
- Scored QAのFail-close条件。
- Finding Contract。
- AgentとEvaluatorの責務分離。
- Known RegressionとExploratory QAの責務分離。

Policyは実装詳細を複製せず、各SSOTへの参照を使う。

### 8.6 Curriculum Promotion

CurriculumはTest TargetやAgentic QA Systemとは別の後付けDocumentationではない。
Current RepositoryのRisk・Automation・Agentic QA Practiceを学習可能な形へ変換する。

#### Core / Practice

推奨Practiceとして教える内容は`promotion.curriculum=recommended`を要求する。
Fresh Learner Validationを通し、Why、Applicable / Non-applicable Conditions、Failure Signs、Evidence、Trade-off、Recoveryを含める。

Test Target変更で新しいRiskやTest Layerが追加された場合、必要に応じてCurriculumのGoal、Exercise、Workbook、
Competency、Difficultyを再評価する。

#### Advanced / Research

`experimental`、`not_supported`、`refuted`、`inconclusive`、`conflicting`なKnowledgeも、
比較演習、研究課題、Failure Analysis教材として利用できる。
ただしBest Practiceとして教えず、未確定状態を明示する。

### 8.7 Knowledge-onlyを認める

すべてのKnowledgeを実装へPromotionする必要はない。

- Effectが小さい。
- 条件が狭すぎる。
- Evidenceが不足している。
- 実装Costが高い。
- 現在のProduct / QA / Training Decisionへ影響しない。

この場合はKnowledge Recordだけを残し、新Feature、新Test、新Infrastructure、新Skillを作らない。

### 8.8 再利用可能Artifactとして残す

PromotionしたKnowledgeは、後から「なぜこのFeature / Test / Skill / Harness / Policy / Curriculumが存在するか」を
追跡できる形にする。

```yaml
promotion_artifact:
  target: test_target | regression_automation | qa_policy | skill | harness | curriculum
  artifact_ref:
  artifact_revision_ref:
  knowledge_id:
  source_experiment_family_refs: []
  applies_to: []
  does_not_apply_to: []
  expected_effect:
  failure_signs: []
  rollback_or_recovery:
  validation_experiment_ref:
```

`artifact_revision_ref`はCommit SHA、Blob SHA、Artifact digest等、検証したRevisionを特定できるimmutable Referenceとする。
MutableなPathだけを検証済みArtifactのIdentityにしない。

このRecordはKnowledgeと実装Artifactをつなぐ最小Traceabilityであり、専用RegistryやDatabaseを要求しない。
Git、Markdown、YAML、既存Artifact Referenceで開始する。

---

## 9. Repository Continuous Improvement Loop

### 9.1 Learning SourceをQA Runだけに限定しない

次をQuestion / Experiment Inputとして回収する。

#### Repository QA / Agentic QA

- FindingのFalse Positive / False Negative。
- 見逃したRisk。
- Duplicate Finding。
- Scope Violation。
- Repair Failure / Regression。
- Tool / Runtime Failure。
- Evidence欠損。
- Agentが停止した箇所。
- Human Interventionが必要だった箇所。
- Repeated Manual Workaround。

#### Test Target / Specification

- QA対象として単純すぎるFeature。
- 現実的なState / Role / Boundary / Async / Recovery Risk不足。
- Testability Gap。
- Specification Ambiguity。
- Web / Native間で学習可能なRisk差が不足している箇所。

#### Regression Automation

- Agentが繰り返し見つけるKnown Regression。
- Formal Test Layerが不適切なFinding。
- FlakeやDiagnostic Value不足。
- Test Gap / Redundant Test。

#### Curriculum / Learner

- Learnerが暗黙知なしで進められない箇所。
- 難易度が急すぎる / 低すぎる箇所。
- Test TargetのCurrent Behaviorと教材がずれている箇所。
- Tool操作はできるがRisk / Oracle / Failure Analysisを理解できない箇所。
- Agentic QAとDeterministic Automationの使い分けを学べない箇所。

#### External Knowledge / Industry Practice

- Current Repositoryにない重要Risk Pattern。
- Tool / Platformの新しいCapability。
- Standard Practiceとの意味ある差分。
- Current Assumptionと衝突するEvidence。

単発Observationへ場当たり的に変更を足さず、反復性、影響、学習価値、再現性、Costを見てQuestionへ変換する。

### 9.2 改善の優先順位

領域ごとに局所最適化せず、Repository全体のQA / Training Valueで優先する。

優先度が高い候補:

1. Critical Defect / False Negativeや重大なOracle FailureにつながるGap。
2. Ground Truth、Evidence Integrity、Isolationを壊すGap。
3. Test Targetが単純すぎて重要なQA Riskを学習・検証できないGap。
4. False Positive、Duplicate、Scope Violationを増やすGap。
5. CurriculumがCurrent Product / QA Practiceと乖離しているGap。
6. Failure Diagnosis / Repair / Regression Protectionの不足。
7. Flake、Tool Failure、Environment Failure。
8. Human Active Time / Agent Cost。

速度やCost、Feature数、難易度のためにRecall、Precision、Evidence Integrity、Learning Clarityを弱めない。

### 9.3 3領域の変更を相互にImpact Reviewする

#### Test Targetを変更した場合

最低限確認する。

- Normative Specificationは更新が必要か。
- Existing Formal Regressionは十分か。
- Agentic QA Charter / Challenge / Coverageは更新が必要か。
- Visual Specificationは更新が必要か。
- Curriculum / Workbook / Exercise / Competencyは更新が必要か。

#### Curriculum Gapを発見した場合

教材文だけで解決すべきかを決め打ちしない。

- Test Targetに適切な学習対象が存在しないのか。
- Specificationが説明不足なのか。
- Training Environment / Test Controlが不足しているのか。
- Curriculumの順序・難易度・説明だけの問題なのか。

を分離する。

#### Agentic QA Failureを発見した場合

Skill追加を既定解にしない。

- Specification Gapか。
- Test Target Gapか。
- Known Regression Automation Gapか。
- Agent Skill / Context問題か。
- Harness / Environment問題か。
- Evaluation Contract問題か。

をFailure TaxonomyとEvidenceで分離する。

### 9.4 Promotion後は正式Experimentで再評価する

Promotion Artifactへ変更を入れた時点で改善完了とは扱わない。
5.9のPost-promotion Experimentを使う。

最低限次を事前固定する。

- Primary Outcome。
- Guardrail Outcome。
- Decision Rule。
- Applicable Scope。
- 必要なHoldout / Cross-task / Cross-platform範囲。
- Rollback条件。

Claim Scopeを超えた一般化のためにCross-task等を無条件要求せず、
Claim Scopeに必要な範囲だけ再検証する。

変更が期待Effectを再現しなければ`candidate`へ戻す、`stale`へ移す、またはRevertする。

### 9.5 Repository Data Boundary

ExperimentとKnowledgeはRepository内で再現可能なDataを基本とする。

- Repository外の非公開Sourceを無断で持ち込まない。
- Credential / Secret / TokenをExperiment Artifactへ保存しない。
- 個人を識別できるLearner / Human Performance Dataを保存しない。
- External Knowledgeは公開可能なSource Referenceまたは安全な要約を使う。
- Raw Artifactに不要な秘密情報が含まれる場合はKnowledge化前に除外する。

このPlanのために独自のSecurity PlatformやSanitization Systemを新設しない。

---

## 10. GovernanceとRevalidation

### 10.1 Logical Roles

一人が複数Roleを兼任してよいが、責務は概念上分離する。

| Role | 責務 |
| --- | --- |
| Experiment Owner | Question、Design、Execution |
| Evaluator | Evaluation Contractに基づくResult評価 |
| Knowledge Reviewer | 一般化、適用範囲、Promotion変更 |
| Test Target Maintainer | Product / Specification変更とProduct Validation |
| Automation Maintainer | Formal Regression Layerへの反映とValidation |
| Agentic QA Maintainer | Skill / Harness / QA Policyへの反映とValidation |
| Curriculum Reviewer | Curriculum / Competency / Difficulty反映可否 |

Official Score、Ground Truth Match、Critical FindingはAgentまたはExperiment Ownerの自己申告だけで確定しない。
`recommended`昇格にはIndependent Knowledge Reviewを必須とする。

### 10.2 Independent Reviewの最低条件

Independent Reviewerは単に別の時刻・別のPromptで同じConclusionを追認する役割ではない。
最低限以下を満たす。

- Result生成Contextから独立している。
- Raw EvidenceとPre-registrationを変更しない。
- Experiment OwnerのConclusionを正解として前提提示されない。
- Evidenceから独立してConclusion / Applicability / Promotion Targetを評価できる。

Human Reviewer、Fresh Independent Agent、別担当Reviewerのいずれも利用できる。
Independent Reviewの実施要件だけでなく、Knowledge RecordへReview証跡を残す。

### 10.3 Revalidation Trigger

以下の変化がClaimの成立条件へ影響し得る場合、該当Promotionを`stale`へ移し再検証する。

- Test TargetのFeature / State / Role / Architectureの重要変更。
- Normative Specificationの重要変更。
- Agent Model Familyまたは重要Behavior変更。
- Agentic ToolのMajor Behavior変更。
- Prompt / Skill / Agent configurationの重要変更。
- Context Policy / Tool Scopeの重要変更。
- Playwright / Maestro等の重要Tool変更。
- Formal Regression Layer / Contractの重要変更。
- Harness / Evaluation Contractの重要変更。
- Curriculum Goal / Competency / Training Environmentの重要変更。
- 新しいConflicting Evidence。
- 高品質なExternal Evidenceとの衝突。

Raw Experimentの`executor` IdentityとKnowledgeの`validated_against`を用いて影響範囲を判断する。
すべてのVersion変更で機械的にStale化せず、Claimへの影響をKnowledge Reviewerが判断する。

### 10.4 Continue / Stop / Park

成功数やFeature追加数を目標にしない。

Continue候補:

- Evidenceが矛盾している。
- Reproduction不足。
- QA / Training Decisionへの影響が大きい。
- False Negativeや重大Failureへ関係する。
- Test Target / Curriculum / Agentic QAの間に重要なGapが残っている。

Stop / Park候補:

- Resultが十分安定した。
- QA / Training Decisionへほぼ影響しない。
- Added Complexity / Costに対するInformation Gainが小さい。
- より重要なUnknownがある。

Hypothesisが支持されなくても条件を無限調整して成功させず、非成立自体をKnowledgeとして受け入れる。

---

## 11. Transition Plan

### 11.1 Foundation CapabilityはGlobal Gateにしない

Current Foundationとして次のCapabilityを利用する。

- `test_target`: Current Web / Native ProductとNormative Specification。
- `formal_regression`: Existing Web / Native / Unit / Integration / Contract Test。
- `official_scored_qa`: Official Agentic QAをEvidence付きで評価できるScored Capability。
- `visual_oracle`: Screen / Important StateをSpecificationへ接続できるVisual Oracle。
- `training_environment`: Formal Regressionと分離されたTraining Environment。

Current implementation reference:

- PR #23: Official Black-box Scored E2E
- PR #24: Screen Catalog / Visual Specification
- PR #25: Test Automation Curriculum / Training Environment

PR番号は現時点の実装参照であり、永続Gateではない。
最終仕様は各SSOTと最新`main`を正とする。

各Experimentが必要なCapabilityだけを`required_capabilities`として宣言する。
Blocked Capabilityは、そのCapabilityを必要とするExperimentだけをBlockする。

### 11.2 Capability ReadinessはEvidenceで判定する

```yaml
capability_id:
status: ready | degraded | blocked | unknown
validation_ref:
validated_revision:
validated_at:
known_limitations: []
```

- `ready`: 必要ContractをValidation Evidence付きで満たす。
- `degraded`: 制約がPrimary OutcomeまたはEvidence Integrityを損なわず、Design上説明できる場合のみ利用可能。
- `blocked`: 必須Contractを満たさず実行不可。
- `unknown`: Readiness Evidence不足。

新しいCapability RegistryをRequiredにしない。
既存SSOT、CI、Validation ArtifactをReferenceとして利用する。

### 11.3 Stabilization / Feature Freeze

原則として、Evidenceなしに次を追加しない。

- 大規模Feature / Domain拡張。
- 新Agent Framework。
- Custom Runner。
- Experiment Dashboard / Result Database。
- Custom Job Queue。
- New MCP Proxy / Tool Router。
- Generic Knowledge Management Platform。
- Skillの細分化・増殖。
- Formal E2E Testの無制限追加。

新規基盤や大きなProduct Complexityを検討できるのは、実ExperimentまたはGap Analysisで
次のいずれかがEvidence付きで確認された場合に限る。

- 必要なQA / Training RiskをCurrent Test Targetで扱えない。
- 必要なExperimentが既存Capabilityでは実行不能。
- Evidence Integrityを保証できない。
- Known RegressionがRepeated Agent Workになっている。
- 同一Manual Workaroundが反復し、Experiment / Training throughputまたは信頼性を実際に阻害する。

「将来必要そう」「あると便利そう」「一般的なECにはある」は根拠にしない。

### 11.4 Experiment Readiness Gate

最初の正式Experimentを開始する前に次を確定する。

- Experiment RecordのCanonical Location。
- Knowledge RecordのCanonical Location。
- Experiment / Knowledge / Experiment Family ID Convention。
- Pre-registration Reference方式。
- Run ID / Run Artifact Reference方式。
- Evidence Reference方式。
- Executor IdentityのReference方式。
- Promotion Artifact / Revision Reference方式。
- 対象ExperimentのRequired Capability確認とValidation Reference。
- Evaluator / Knowledge Reviewer。

このGateのためにDashboard、Database、専用SaaSを作らない。
Markdown / YAML / Git Commit等の最小手段で開始する。

### 11.5 Initial Baseline Assessment

最初のExperimentを選ぶ前に、完璧な監査ではなく軽量なBaseline Assessmentを一度行う。

#### Test Target

- 現在学べる主要Risk / State / Role / Boundary / Async / Recovery。
- Web / Nativeで扱えるRisk差。
- Testability Gap。
- 単純すぎる領域と過剰に複雑な領域。

#### Curriculum

- Current Test Target / Specificationとの整合。
- Difficulty progression。
- Risk / Oracle / Test Design / Failure Analysisの学習可能性。
- Web / Native / CI / Agentic QAとの接続。

#### Agentic QA System

- Current Skill / Harness / QA Policy / Evaluation / Scoring。
- False Positive / False Negative / Evidence / Scope Controlの既知Gap。
- Known RegressionとAgentic Explorationの責務重複。

AssessmentはGap候補を作るためのものであり、全Gapを一括修正しない。

### 11.6 Baseline Experiment Candidates

初期候補は次とする。Required Task Listではない。

#### Agentic QA

1. Fresh Context vs Implementation Context継承。
2. Same Agent Review vs Independent Agent Review。
3. Gray-box QA vs Black-box QA。
4. Specificationあり vs Specificationなし。
5. Single Repair Attempt vs Bounded Iterative Repair。
6. Human Test Design vs Agent Test Design。
7. Visual Referenceあり vs Visual Referenceなし。
8. Single Agent vs Specialized Subagents。

#### Test Target / Training

9. State / Role / Boundary等の不足がQA Finding Qualityへ与える影響。
10. Test Target変更前後でのTest Design Variety / Failure Analysis Value比較。
11. Curriculum Exercise難易度とFresh Learner Completion / Failure Analysis Successの適合確認。
12. Known RegressionをAgent探索からDeterministic Automationへ移した際のQA Information Gain比較。

現在の不確実性、QA / Trainingへの影響、Cost、利用可能Capabilityで優先する。

### 11.7 改善Loop

```text
Baseline Assessment / New Gap
↓
Question / Experiment
↓
Knowledge Consolidation
↓
Promotion Decision
↓
Test Target / Regression Automation / QA Policy / Skill / Harness / Curriculum
↓
Post-promotion Experiment
↓
Repository-wide Re-evaluation
↓
Failure / Improvement / New Gap
↓
New Question
```

このLoopを回すこと自体が目的ではない。
QA / Training Valueが改善しない変更を増やさない。

---

## 12. Risks / Non-goals / Plan DoD

### 12.1 主要Risk

| Risk | 対策 |
| --- | --- |
| Product Bloat | Test Target変更にQA / Training ValueとAdded Complexityの説明を要求 |
| Synthetic Complexity | AgentやLearnerを困らせるだけのFeature / Benchmark専用罠を禁止 |
| Infrastructure開発へ戻る | Current Artifact再利用、Manual Record許容、Evidence付きPain Pointまで自動化しない |
| Confirmation Bias | 反証可能なHypothesis、Support / Refutation Rule事前固定、immutable pre-registration reference |
| Result Selection Bias | Experiment Family全RecordとRun Artifactを確認する |
| Claim Overstatement | `not_supported`と`refuted`を分離する |
| Metric Cherry-picking | Primary / Guardrail Outcome、Practical Threshold、Aggregation / Decision Ruleを事前固定する |
| Benchmark Overfitting | Ground Truth隔離、答えのSkill埋め込み禁止、Claim Scopeに応じたHoldout再評価 |
| Skill Sprawl | EvidenceとPromotion ReviewなしにSkillを増やさない |
| Harness Sprawl | Deterministic保証が必要な反復FailureだけHarness候補にする |
| Regression E2E Sprawl | Suggested Layer、Risk、Cost、Flake、Diagnostic ValueでTest Layerを選ぶ |
| Curriculum Drift | Test Target / QA System変更時にCurriculum Impactを確認する |
| Curriculum Overfitting | Tool操作暗記ではなくRisk / Oracle / Failure Analysisを評価する |
| Execution Identity Loss | Model / Prompt / Skill / Context / Tool ScopeをRaw Experimentへ記録する |
| Governance Evidence Loss | Independent Reviewの対象Revisionと証跡をKnowledgeへ保持する |
| Metrics Gaming | 単一Metric最適化を避けTrade-offを見る |
| Knowledge Staleness | Revalidation Triggerと`stale`を使う |
| Repository Complexity | Product、Formal Test、QA Contract、Training、Experiment Artifactの責務を分離する |

### 12.2 Non-goals

このPlanだけでは、Experiment SaaS / Dashboard / Leaderboard、Knowledge Graph / Vector DB、
Custom Agent Runtime / Job Queue / Universal MCP Gateway、Human QA完全代替、
AI AgentへのMerge権限自動付与、AI QA Required CI化、全Experiment / Metricの完全自動化、
Model性能ランキング基盤を実装しない。

また、次もGoalにしない。

- Test TargetのFeature数最大化。
- 難易度のための難易度。
- Skill / Harness / Agent数最大化。
- Formal E2E Test数最大化。
- Curriculum文書数最大化。
- 外部Practiceの網羅的コピー。

必要性がExperiment EvidenceまたはGap Analysisから確認された場合のみ別Planまたは通常変更として実装する。

### 12.3 Open Questions

Plan Approval時点で未確定でもよいが、11.4のReadiness Gateまでに必要なものはそこで確定する。

1. Experiment Recordの物理配置。
2. Knowledge Recordの物理配置。
3. Promotion Artifact Referenceの物理形式。
4. Failure TaxonomyをMachine-readableにする時期。
5. External Knowledge IntakeをRepository / Issue等のどこに置くか。
6. Test Target Baseline Assessmentの最小Artifact形式。
7. Human Active Time / Agent Costの収集精度。

Pre-registration Traceability、Experiment Family / Run Traceability、Confirmatory Decision Rule、Executor Identity、
Independent Review Evidence、Promotion Target、Post-promotion Experiment、Revalidation Ruleは
Open QuestionではなくRequired Policyとする。

### 12.4 Plan DoD

以下を満たした時点でOperating PlanとしてApprove可能とする。

- North StarがTest Target / Curriculum / Agentic QA Systemの継続改善に一意化されている。
- 既存SSOT境界が明確である。
- Test Target / Specificationの責務境界が明確である。
- Skill / Harness / Regression Automation / QA Policyの責務境界が明確である。
- Study Intent / Design Type / Target Areaが分離され、`test_target`と`training`を第一級に扱える。
- Test Target変更にQA Learning Value / Realism / Added Complexityの判断規則がある。
- Industry AlignmentをInputとして扱い、無検証でBest Practice化しない。
- Experiment Lifecycleと事前固定ルールがある。
- ConfirmatoryにPrimary / Guardrail Outcome、Support / Refutation Rule、Practical Effect、Aggregation Ruleがある。
- Pre-registrationの実行前Revisionを追跡できる。
- Experiment Family / LineageでPositive / Negative Evidenceを束ねられる。
- Run ID / Artifact ReferenceでRun、Variant、Failure / Invalid理由、Evidenceを追跡できる。
- Run FailureとEvaluation InvalidとProtocol Invalid Runの境界がある。
- Evidence StateとClaim Assessmentが分離されている。
- `not_supported`と`refuted`が区別されている。
- Replication ScopeとClaim Scopeが対応している。
- Atomic Knowledge ClaimとPractical Effectがある。
- AI Agent ExperimentでExecutor Identityを残す。
- Knowledgeが検証対象Executor / Environment条件をimmutable Referenceで追跡できる。
- Promotion TargetがTest Target / Regression Automation / QA Policy / Skill / Harness / Curriculumに分離されている。
- Promotion Artifact Revisionをimmutable Referenceで追跡できる。
- Promotion後Validationが正式なExperiment Contractへ戻る。
- `recommended`昇格にIndependent ReviewとReview証跡が必要である。
- Failure Taxonomy v1がTest Target / Regression / Curriculum Gapも分類できる。
- Failure調査Evidenceの詳細は各Execution / Curriculum SSOTへ委譲する。
- Test Target / Regression Automation / Skill / Harness Promotionの条件が分離されている。
- Core / PracticeとAdvanced / Research CurriculumのPromotion Ruleがある。
- Test Target変更時にSpecification / Formal Test / Agentic QA / Visual / Curriculum Impactを確認する。
- Curriculum GapをTest Target / Specification / Training Environment / Curriculum自身へ正しくRoutingできる。
- Agentic QA FailureをSkillだけでなく複数Root CauseへRoutingできる。
- Foundation CapabilityがExperiment単位のDependency Gateである。
- Capability ReadinessをValidation Evidenceで判定する。
- Experiment Readiness Gateがある。
- EvidenceなしにProduct Complexity、大規模Infrastructure、Skill、E2E Testを追加しない。

### 12.5 次のAction

1. このPlanをレビューしApprove可能な状態にする。
2. PR #23 / #24 / #25を含むFoundationの最新状態を`main`で確認する。
3. Planを最新`main`へrebaselineする。
4. Test Target / Curriculum / Agentic QA Systemの軽量Baseline Assessmentを行う。
5. Experiment / Knowledge / Promotion ArtifactのCanonical Locationを最小構成で決める。
6. Stabilization / Feature Freezeを適用する。
7. QA / Trainingへの影響が大きく、利用可能Capabilityで実行できるQuestionを1件選ぶ。
8. Current ArtifactでExperimentを実行し、不足を実測する。
9. Knowledgeを作成し、必要なTargetだけへ`candidate`としてPromotionする。
10. Post-promotion Experimentで効果とGuardrailを再評価する。
11. Independent Review後に`recommended / candidate / stale / revert`を判断する。
12. Failure / Improvement / New Gapから次のQuestionを作る。

---

## Final Principle

このRepositoryの価値は、どれだけ高度なAgent Frameworkを作ったか、
どれだけFeatureやTestや教材を増やしたかではない。

> Test Targetは、現実的で意味のあるQA Riskを十分に持っているか。
>
> Curriculumは、そのRiskを段階的に理解・設計・自動化・分析できるようになっているか。
>
> AI Agentは、そのTargetに対して正確かつ再現可能にQAを実行できるか。
>
> Known Regressionは適切なDeterministic Testへ固定されているか。
>
> Agentの判断FailureはSkill、保証FailureはHarness、ContractはQA Policyへ正しく分離できているか。
>
> その改善判断を再現可能なEvidenceで説明できるか。

Repositoryは答えを固定する場所ではなく、
**Test Target、Curriculum、Test Automation、Agentic QA SystemをExperimentとEvidenceで継続的に磨き、
QAと学習の両方を強くするPlatform**として運用する。
