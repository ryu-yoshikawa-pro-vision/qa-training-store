# QA Training・Agentic QA 継続改善・知見循環計画

- Plan Revision: `v13`
- Status: `Draft / Review Required`
- Created: 2026-08-15 JST
- Revised: 2026-08-16 JST
- Scope: Test Target / Test Automation / Agentic QA / Experiment / Knowledge Promotion / Curriculum Operating Plan

## 0. 位置づけ

この計画は、`qa-training-store`を単なるSample Application、Test Automation Repository、
またはAgent Framework Repositoryとして拡張し続けるための計画ではない。

本Repositoryを、次の3領域を継続的に育てるQA Training / Experimental Platformとして運用する。

1. **Test Target**: QA対象として十分に現実的で、Risk・状態・難易度・Testabilityを持つProduct。
2. **Curriculum**: Test Targetと現在のQA Practiceに追従し、段階的に学べるTraining Environment。
3. **QA System**: Formal Regression Automation、Agentic QA、Skill、QA Policy、Harness、Evaluation等からなるQA実行基盤。

この3領域を独立した完成物として扱わない。
Test Targetの不足はCurriculumやQA Systemの学習・評価価値を下げ、CurriculumのGapはTest Targetの不足を発見し、
Agentic QAのFailureはSkill / HarnessだけでなくSpecification、Test Target、Regression Automationの不足を示すことがある。

このPlanの中心は「Agentを使うこと」「機能を増やすこと」「教材を増やすこと」ではない。

> **Test Target、Curriculum、QA SystemをExperimentとEvidenceで継続的に改善し、
> より現実的で意味のあるQAを高品質に実行・学習できるRepositoryへ育てる。**

目的は次の10点である。

1. Test Automationを段階的に学習できる。
2. Test TargetをQA学習・QA実験に適したProductとして継続的に成熟させる。
3. AI AgentがRepository内でQAを実行できる。
4. AI AgentによるTest Design、Exploration、Review、Failure Diagnosis、Repairを検証できる。
5. Agent、Context、Tool、QA Mode、Skill、Harness等のApproachを比較可能なEvidenceで評価できる。
6. Known Regressionを適切なTest LayerへDeterministic Automationとして固定できる。
7. CurriculumをTest Target、QA Risk、Tooling、Agentic QAの進化へ追従させる。
8. False Positive、False Negative、Scope Violation、Regression、Flake等を減らす改善Loopを作る。
9. 再利用価値のある実験結果だけをKnowledgeへ変換し、必要なArtifactへPromotionできる。
10. Promotion後の効果を必要な強さで再評価し、新しいQuestionへ戻せる。

特定のAgent構成、Model、Tool、QA Mode、Skill、Harness、Test Architecture、Curriculum構成を
永続的な正解として固定しない。
現在のRepository Architecture、Test Target、Curriculum、QA System自体もEvaluation対象とする。

### 0.1 Simple-first原則

このPlanのために新しい基盤を先に作らない。

標準運用は次の順序とする。

```text
Gapを見つける
↓
通常変更で十分か？ ── Yes → 通常の実装・Review・Testで完了
↓ No
Lightweight Experiment
↓
比較・一般化・Best Practice化が必要か？ ── Yes → Confirmatory / Comparative Contractを追加
↓
再利用価値のあるResultか？ ── No → Experiment Recordで完了
↓ Yes
Knowledge化
↓
実装価値があるか？ ── No → Knowledgeだけ残す
↓ Yes
必要なTargetだけ変更
↓
Target-specific Validation
↓
効果を主張する場合だけPost-promotion Experiment
↓
次のGapへ
```

「PlanにExperimentがあるからExperiment Platformを作る」のではない。
Git、Markdown / YAML、既存Artifact、既存CI、既存Skill / Harness / Testを優先し、
反復する実測Pain Pointが出るまで新しいRegistry、Database、Dashboard、Runner等を追加しない。

---

## 1. North Star

```text
External Knowledge / Industry Practice ─┐
Repository QA Failure ──────────────────┤
Test Target Gap ────────────────────────┤
Curriculum / Learner Gap ───────────────┤
Harness / Tool / Automation Pain ───────┤
                                        ↓
                                     Question
                                        ↓
                              Experiment / Validation
                                        ↓
                                Evidence / Result
                                        ↓
                         Reusable Knowledge if valuable
          ┌───────────────┬──────────────┼──────────────┬──────────────┬─────────────┐
          ↓               ↓              ↓              ↓              ↓             ↓
     Test Target   Regression       QA Policy        Skill         Harness      Curriculum
      / Spec       Automation
          └───────────────┴──────────────┼──────────────┴──────────────┴─────────────┘
                                        ↓
                           Target-specific Validation
                                        ↓
                         Failure / Improvement / New Gap
                                        ↓
                                  New Question
                                        ↺
```

主要成果は機能数、Test Case数、Agent数、Automation率、AI生成率、教材ページ数ではない。

> Test TargetのQA価値、Curriculumの学習価値、QA Systemの品質をEvidenceで高め、
> 改善理由と成立条件を後から説明できる状態を作る。

重要なQuestionについて最低限次を説明できることを成果とする。

- 何を試し、必要なら何と比較したか。
- Product / QA / TrainingのどのGapを解消しようとしたか。
- 何が改善し、何が悪化し、何が変わらなかったか。
- どの条件で成立し、どの条件では成立しないか。
- Test Target / Specification / Regression Automation / QA Policy / Skill / Harness / Curriculumの
  どこへ反映すべきか。
- 反映後に必要なValidationを通ったか。

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

- Test Target / Curriculum / QA SystemのGapをQuestionへ変換する方法。
- Experimentの必要性と強度を決める方法。
- Evidenceから再利用可能なKnowledgeを作る条件。
- KnowledgeをどのArtifactへPromotionするかの判断方法。
- Promotion後に必要なValidationを決める方法。

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

各Experimentは必要な範囲で3軸を指定する。

#### Study Intent

| Intent | 目的 | 主な要求 |
| --- | --- | --- |
| `exploratory` | 未知のFailure・Gap・挙動・仮説候補を発見する | Lightweight RecordとEvidence |
| `confirmatory` | 重要仮説を反証可能な形で確認する | 事前固定、独立Run、Decision Rule |

#### Design Type

| Design | 意味 | 主な要求 |
| --- | --- | --- |
| `single_variant` | 一つの条件・Approachを観測する | 条件を識別可能にする |
| `comparative` | 2つ以上の条件・Approachを比較する | Variantと比較条件を実行前に固定する |

#### Target Area

| Area | 主な対象 |
| --- | --- |
| `test_target` | Feature、State、Role、Risk、Testability、Specification、QA難易度 |
| `regression_automation` | Playwright、Maestro、Unit / Integration / Contract Test等 |
| `qa_execution` | Agent、Model、Context、Prompt、QA Mode、Review / Repair Flow |
| `harness` | Isolation、Evidence、Scoring、Deterministic Control、Artifact Integrity |
| `training` | Learner Flow、Curriculum、Competency、Training Environment、難易度設計 |

Exploratory Observationを、そのままConfirmatoryな結論へ昇格させない。

### 3.2 Questionから開始し、必要以上にExperiment化しない

通常のBug Fix、Specification Maintenance、Curriculum Maintenance、明らかなRegression修正まで
Experimentへ変換しない。

Experimentを使うのは、主に次の場合である。

- どのApproachが有効か不明で、Evidenceを取りたい。
- 複数の選択肢を比較したい。
- QA / Training Outcomeへの効果を主張したい。
- Best PracticeやReusable Knowledgeとして一般化したい。

```text
Question / Goal
↓
必要な強度のExperiment
↓
Result
↓
Interpretation
↓
Reusable Knowledgeにする価値があるか判断
↓
必要な場合だけPromotion
```

`Result`は観測・計測した事実、`Interpretation`はそこから導いた推論として分離する。
因果を証明できない場合は因果として断定しない。

### 3.3 Negative Evidenceを残す

Failure、Block、False Positive、False Negative、Human Intervention、Unexpected Regression、
Contradictory Result、Protocol Violation、Learning Failure、Test Target GapもExperiment Evidenceとして残す。

未実行、Evidence不足、Capability不明、Environment BlockをPASSやAgent Successへ変換しない。
Agentの自己申告だけをGround Truthにしない。

同一Question / Hypothesisを繰り返す場合、成功Resultだけを後から選ばない。
必要な場合はExperiment FamilyでPositive / Negative / Invalid Evidenceを束ねる。

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
Agent性能差やRecommended Practiceを論じる場合、必要な独立Run数またはRun Count決定ルールを実行前に定める。

最低限、RunごとのResult、代表値、ばらつき、Failure率、Protocol Invalid Run数を区別する。
単一Runだけを根拠にAgent構成、Model、Skill、PromptをRecommendedへ昇格させない。

### 3.6 Confirmatoryは支持・反証条件まで事前固定する

`study_intent=confirmatory`では結果を見る前に最低限以下を固定する。

- Hypothesis
- Variant / Comparison
- Primary Outcome
- Guardrail Outcomeがある場合の扱い
- Evaluation Method
- Support Rule
- Refutation Rule
- Minimum Practical Effectまたは`not_applicable_reason`
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
aggregation_rule: median_across_independent_runs
decision_rule:
  support_if: "precision improves >= 5pp and recall degradation <= 3pp"
  refute_if: "precision degrades >= 5pp"
  otherwise: not_supported
```

厳密な統計検定をすべてのExperimentへ必須にはしない。
Result確認後に都合のよいMetricだけを選んでHypothesis Supportと判定しない。
Support Rule未達を自動的にRefutationへ変換しない。

### 3.7 事後調整を同一成功として扱わない

ConfirmatoryまたはComparative Designで、Result確認後にFeature、Specification、Prompt、Skill、Tool Scope、Metric、
Decision Rule、条件等を変えた場合は、同一Experimentの成功として扱わず新Variantまたは新Revisionとする。

### 3.8 BenchmarkやGround Truthへの過適合をQA改善とみなさない

以下を禁止する。

- Hidden Answer、Ground Truth、Expected FindingをAgent Contextへ混入させる。
- Benchmark固有の答えをSkillやPromptへ埋め込む。
- Failureを隠すためにEvaluatorやMetricを弱める。
- Scoreを上げるためにQA ScopeやEvidence要件を縮小する。
- Benchmark専用の不自然なProduct BehaviorをTest Targetへ追加する。

### 3.9 Test Targetを複雑化すること自体をGoalにしない

Test Target変更は、QA学習価値、QA実験価値、Product Realismのいずれかを明確に改善する場合に行う。

Gap候補例:

- State Transitionが浅く、状態依存QAを学べない。
- Role / Permission差分が少なく、Authorization Riskを扱えない。
- Boundary / Validationが単純で、境界値設計を十分に学べない。
- Async / Loading / Partial Failure / Retry / Recoveryが少ない。
- Persistence / Session / Cross-screen Consistencyが弱い。
- Web / Native固有のLifecycleやResponsive Riskが不足している。
- Accessibility / Localization / Date-Time等、必要なQuality Characteristicを扱えない。

すべてをFeature Checklistとして実装しない。
変更候補では最低限次を説明する。

```yaml
test_target_change:
  gap_or_question:
  capability_or_feature:
  qa_risk:
  learning_value:
  realism_value:
  added_complexity:
  expected_test_layers: []
  curriculum_impact:
  specification_impact:
```

Agentic QA固有の価値が判断に必要な場合だけ`agentic_qa_value`を追加する。
「現実のECにありそう」「難しい方が勉強になる」だけでは実装理由にしない。

### 3.10 Industry AlignmentはInputであり正解ではない

Industry Practice、Official Documentation、QA / Security / Accessibility等の標準的Practice、
一般的なProduct Patternは、Repositoryを現実に近づけるInputとして利用する。

- Normative Constraintは制約として扱う。
- Tool Factは一次情報で確認する。
- Product / QA PracticeはCurrent RepositoryのGap候補として扱う。
- Empirical Claimは必要ならExperimentで検証する。

「業界標準に近い」をArchitectureやFeature数を増やす免罪符にしない。

### 3.11 Test Target RevisionとQA System性能を混同しない

異なるTest Target Revision上のRecall、Precision、Coverage、Finding Quality等をそのまま比較し、
Agent、Skill、Model、Harness等の改善・劣化として解釈しない。

QA System自体の性能差を比較する場合、原則としてVariant間で同一の`target_revision_ref`を使用する。
Official Scored QAでは既存SSOTが定義するBenchmark Identityも一致させる。

Test Target変更後は、そのRevision上で新しいBaselineを取得する。
長期比較が必要な場合は同一RevisionまたはFrozen / Holdout Challengeを利用する。

---

## 4. Experiment Lifecycleと記録

Experiment Recordは**Lightweightを標準**とし、Confirmatory / Comparativeで必要な項目だけ追加する。
全Experimentに研究用のFull Schemaを要求しない。

### 4.1 Lightweight Experiment Record

通常のExploratory Experimentは、再現と判断に必要な最小情報だけ残す。

```yaml
experiment_id:
study_intent: exploratory | confirmatory
design_type: single_variant | comparative
target_area:
question_or_goal:
target_revision_ref:
execution_conditions_ref:
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
results: []
interpretation:
next_action:
```

ルール:

- `target_revision_ref`はProduct / Specification / Challenge等、QA対象Revisionを特定できるimmutable Referenceとする。
- `execution_conditions_ref`はExecutor / Environment / Tool Scope等を再現できる既存Artifactまたはimmutable Referenceとする。
- AI Agent ExperimentではModel / Prompt or Skill / Context Policy / Tool Scopeを追跡できることを必須とする。
- 該当しないOptional fieldを空欄で埋めるためだけのRecordを作らない。
- Run Artifactが既存SSOTに十分な情報を持つ場合は重複コピーせずReferenceする。

### 4.2 Confirmatory / Comparative Extension

比較・一般化・Best Practice化に必要な場合だけ、Lightweight Recordへ次を追加する。

```yaml
experiment_family_id:
parent_experiment_id:
derived_from: []
variants: []
controlled_variables: []
required_capabilities: []
pre_registration_ref:
confirmatory_contract:
  primary_outcome:
  guardrail_outcomes: {}
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
  stop_condition:
  invalid_conditions: []
evaluation:
  method:
  ground_truth_ref:
  required_metrics: []
```

`confirmatory_contract`は`study_intent=confirmatory`でRequiredとする。
Comparativeでも結果解釈に必要なVariant、Controlled Variables、Run Ruleは実行前に固定する。

### 4.3 Experiment FamilyとLineageは必要な場合だけ使う

同一Question / Hypothesisを複数Experimentで追う場合、成功Resultだけを引用するSelection Biasを防ぐためFamilyを使う。
単発Exploratory Experimentへ機械的にFamily Recordを作らない。

- `experiment_family_id`: 同一Question / Hypothesisを追う一連のExperimentを束ねる。
- `parent_experiment_id`: 直前のExperimentから直接派生した場合に使う。
- `derived_from`: 複数ExperimentやExternal Evidenceを基に設計した場合だけ使う。

### 4.4 Pre-registrationは必要なExperimentだけ行う

Confirmatory Experimentおよび事前固定が必要なComparative Designでは、Execution開始前のDesignを追跡可能にする。
Git Commit SHA、Artifact digest等、書き換えを判別できるReferenceを使う。

単純なExploratory ObservationまでPre-registrationを必須にしない。

### 4.5 Failure、Evaluation Invalid、Invalid Runを分離する

`RUN_INVALID`はAgentやProductが失敗したRunを都合よく除外するために使わない。
Runの成否と、そのRunからEvaluation値を算出できるかを別に扱う。

`RUN_INVALID`にできるのは、事前定義したExperiment Protocol自体が壊れ、予定した条件でRunを解釈できない場合に限定する。

例:

- Variant取り違え。
- Prior Result / Hidden Answerの混入。
- Pre-registered条件からの逸脱。
- Evaluator / Ground Truth破損。
- 実行対象のFailureではなく計測・収集Protocolの破損でRequired Evidenceを取得できない。

以下は原則として通常Failureとして残す。

- AgentがTool操作に失敗した。
- AgentがTimeout / Budget Exhaustionした。
- Agentが完走できなかった。
- Browser / Runtime / Environment Failure。
- Agent起因のHuman Intervention。

Tool / Runtime / Agent Failureの結果としてRequired Evidenceが欠損した場合、Run自体は通常Failureとして保持する。
欠損したEvidence、Failure Code、理由を保存し、そのEvidenceを必要とするMetricまたはEvaluationだけを
`invalid`または`not_computable`とする。

### 4.6 Human Baseline

Human Baselineを使う場合だけ、比較可能性に影響する範囲で次を記録する。

- Experience band / Role
- Tool allowance
- Time budget
- Specification access
- Training Environment familiarity

個人評価を目的とせず、不要な個人情報は記録しない。

---

## 5. EvidenceとKnowledge Model

### 5.1 すべてのExperimentをKnowledge化しない

Knowledge Recordを作るのは、次のいずれかに該当するResultだけとする。

- 別Task / Revisionでも再利用する可能性がある。
- Best Practice / Anti-patternとして一般化する価値がある。
- Test Target / Regression Automation / QA Policy / Skill / Harness / CurriculumへPromotion候補になる。
- 将来のRevalidation対象として追跡する価値がある。
- Contradictory / Negative Evidenceとして後続判断へ重要な影響を持つ。

単発Observation、低価値Result、単なる実行Failure、通常Bug Fixの確認結果はExperiment Recordだけで完了してよい。

```text
Experiment Result
↓
再利用・一般化・Promotion・再検証の価値があるか？
├─ No → Experiment Recordで完了
└─ Yes → Knowledge Recordを作る
```

### 5.2 Evidence State

| State | 定義 |
| --- | --- |
| `none` | 有効なExperiment Evidenceがない |
| `observed` | 条件とEvidence付きで1回以上観測 |
| `reproduced` | 独立Runで複数回再現 |
| `conflicting` | 有効なEvidence同士が矛盾している |

### 5.3 Claim Assessment

| Assessment | 定義 |
| --- | --- |
| `untested` | 有効な判定をまだ行っていない |
| `supported` | 事前定義したRuleまたは十分なEvidenceによりClaimを支持 |
| `not_supported` | Support Ruleを満たさないが反対命題まで支持していない |
| `refuted` | 事前定義したRuleまたは十分なEvidenceによりClaimを反証 |
| `inconclusive` | Conflict、Evidence不足等で判断不能 |

`not_supported`と`refuted`を同一視しない。

### 5.4 Replication Scope

```yaml
replication_scope:
  same_condition: false
  cross_task: false
  cross_platform: false
  cross_model: false
  cross_environment: false
```

Claimが単一Platform / Taskに限定される場合、無関係なCross-platform / Cross-task Validationを要求しない。
広い一般化を主張する場合だけ、そのScopeを裏付けるEvidenceを要求する。

### 5.5 External Support

必要なKnowledgeだけ外部支持を記録する。

| Status | 定義 |
| --- | --- |
| `none` | 外部Evidence未確認 |
| `supporting` | 独立した外部Evidenceが支持 |
| `mixed` | 支持と反証が混在 |
| `conflicting` | 主要外部Evidenceと衝突 |
| `not_applicable` | 外部支持が不要または適用不能 |

### 5.6 PromotionはSparseに記録する

Promotion Targetは関係するTargetだけ記録する。
全Knowledgeに6 Target分の`not_applicable`を埋めない。

Status:

- `experimental`
- `candidate`
- `recommended`
- `stale`
- `deprecated`

Target:

- `test_target`
- `regression_automation`
- `qa_policy`
- `skill`
- `harness`
- `curriculum`

例:

```yaml
promotion:
  - target: skill
    status: recommended
  - target: curriculum
    status: candidate
```

記載されていないTargetは対象外として扱う。
一つのKnowledgeが複数Targetへ適用できる場合も、それぞれ独立して判断する。

### 5.7 Atomic Knowledge ClaimとPractical Effect

Knowledge Claimは反証可能な最小単位にする。

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

異なるOutcome、Platform、QA Modeで結果が分かれる場合は別Knowledgeとして扱う。

### 5.8 Knowledge Recordは必要項目だけ持つ

Knowledge RecordのCoreは次とする。

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
experiment_family_refs: []
evidence_refs: []
promotion: []
validated_at:
validated_against:
  repository_revision:
  executor_condition_refs: []
  environment_refs: []
```

次は必要な場合だけ追加する。

```yaml
replication_scope: {}
external_support:
conflicting_evidence_refs: []
promotion_artifacts: []
knowledge_reviews: []
revalidation_triggers: []
supersedes: []
superseded_by: []
```

Prompt、Skill、Configuration、Context Policy、Tool Scope等はRaw Experiment側のimmutable条件を参照し、
Knowledge Recordへ重複コピーしない。

### 5.9 Recommended昇格

`recommended`は単一Runや単一成功だけで付与しない。
最低限次を確認する。

- Claim Assessmentが`supported`である。
- Claim Scopeに必要なEvidenceがある。
- 重大なConflicting Evidenceが未整理で残っていない。
- Applicable / Non-applicable Conditionsを説明できる。
- Practical Effectが意思決定上十分、または適用不能理由が妥当である。
- Promotion先の責務境界に適合する。
- Promotion先に必要なTarget-specific Validationを完了している。
- 効果Claimを伴うPromotionでは必要なPost-promotion Experimentを完了している。

`recommended`への昇格はIndependent Knowledge ReviewをRequiredとする。
Review Reference、Reviewer Identity、Review対象Revision、独立性確認結果、Decisionを保存する。
Review証跡がない場合は最大`candidate`までとする。

### 5.10 Promotion後ValidationはTargetに応じて行う

すべてのPromotion Targetは、そのTargetに適したValidation Referenceを残す。

QA / Training Outcomeへの効果を主張する場合は、元Experiment FamilyのChild Experimentまたは
新しいConfirmatory Experimentで効果を検証する。

Curriculumの誤記修正、Current Repositoryとの整合、手順の実行可能性等は、
Fresh Learner ValidationやDeterministic Curriculum Validationでよい。
「この教材順序でCompletionが上がる」等のLearning Effectを主張する場合だけ`target_area=training`のExperimentを行う。

### 5.11 CandidateとMainline Baselineを分離する

`candidate`はRepositoryの正式Baselineへ定着済みであることを意味しない。

可能な場合はBranch、Worktree、Disposable Copy、Isolated Artifact等でCandidate Changeを検証する。
技術的または運用上の理由で先に`main`へ統合する場合も、その事実だけで`recommended`へ昇格させない。

通常のProduct Development、Bug Fix、Specification Update、Curriculum Maintenance等として行う変更は、
Experiment Promotionと混同しない。

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
Failure Taxonomyは原因分類の正本であり、調査開始Evidenceの固定Pathまでは定義しない。
Evidence取得・Troubleshooting手順は各Execution / Curriculum SSOTを正とする。

### 6.2 Metrics

MetricはQuestionに必要なものだけ選択し、Official Agentic QAの計算式は既存SSOTを正とする。

候補:

- QA: Recall、Precision、FPR、Coverage、Reproduction Rate
- Review: Defect Detection、Duplicate Rate、Severity Accuracy、Scope Accuracy
- Repair: First-pass Success、Repair Success、Regression Introduction、Scope Violation
- Reliability: Completion Rate、Tool Failure Rate、Flake Rate、Evidence Completeness
- Test Target: Risk Variety、State / Role Coverage、Feature-to-Test-Layer Fit、Testability Gap
- Regression Automation: Known Regression Coverage、Layer Fit、Flake Rate、Failure Diagnostic Value
- Delivery: Lead Time、Cycle Time、Human Active Time
- Cost: Agent Runtime、Tool Action、CI Runtime、Agent Cost
- Education: Completion、Failure Analysis Success、Time to Competency、Instructor Intervention、Difficulty Fit

Feature数、Test Case数、教材ページ数、AI生成コード率、Agent利用回数、Automation率、Token量、PR数、Finding件数を
単独のSuccess KPIにしない。

---

## 7. External Knowledge / Industry Practice Intake

外部Knowledgeは種類を分けて扱う。

| Class | 例 | 扱い |
| --- | --- | --- |
| `Normative / Constraint` | Security、Accessibility、Repository policy、Tool制約 | 制約として扱う |
| `Tool Fact` | Official Documentation上のAPI仕様 | 一次情報で確認する |
| `Product / QA Practice` | 一般的なState、Role、Recovery、Test Design Pattern | Gap候補として比較する |
| `Empirical Claim` | Agent構成が品質を改善する等 | 必要ならHypothesisとして検証する |
| `Anecdotal Observation` | Blog、Conference Talk、個別事例 | 仮説候補とする |

外部情報の長文要約を蓄積すること自体を目的にしない。
必要な情報だけ、Source、確認日時 / Version、Current Gapとの関係を残す。
Industry Alignmentは固定周期の調査作業にせず、10.3の重要Trigger時に必要な範囲だけ再確認する。

---

## 8. Knowledge Promotion

PromotionはSection 1のNorth StarとSection 5の判断規則に従う。
ここではTargetごとの責務だけを定義し、同じLifecycleを再定義しない。

### 8.1 Test Target / Specification

Evidence付きでQA / Training価値を上げるGapが確認された場合に候補とする。

例:

- MeaningfulなState Transition。
- Role / Permission差分。
- Boundary / Validation。
- Async / Loading / Error / Retry / Recovery State。
- Persistence / Session / Cross-screen Risk。
- Web / Native特有Risk。
- Specification Clarification。
- Testability改善。

Test Target変更時は、Product Specification、Formal Regression、Agentic QA、Visual Specification、Curriculumへの影響を確認する。

### 8.2 Regression Automation

Expected Behaviorと判定方法が安定し、Deterministicに継続検知する方が適切なKnown Regression / Contractを対象とする。

- Web Runtime Regression → Playwright。
- Native Runtime Regression → Maestro等。
- Component / Logic Contract → Unit / Component / Integration Test。
- CI / Repository Contract → Contract Test / Validator。

すべてのAgent FindingをE2Eへ追加しない。
Risk、Diagnostic Value、実行Cost、Flake RiskでTest Layerを選ぶ。

### 8.3 Skill

Agentの判断・手順・Tool利用方法として再利用する価値があるKnowledgeを対象とする。

- Exploration。
- Specificationの読み方。
- FindingのAtomic化。
- Failure Diagnosis。
- Evidence確認順序。
- Review戦略。

Specification GapやKnown RegressionをSkillルールで無理に吸収しない。

### 8.4 Harness

Deterministicに保証した方がQAの再現性・Evidence Integrity・Evaluation信頼性を高めるKnowledgeを対象とする。

- Fresh Session / Context保証。
- Test Data Reset。
- Tool / Source Isolation。
- Artifact Integrity。
- Required Evidence検証。
- Scoring / Evaluation Contract。
- Timeout / Cleanup。

Agentの判断を丸ごとHarnessへ移さない。

### 8.5 QA Policy

個別SkillやHarnessを超えてRepository全体で守るべきContractを対象とする。

- Official QA Modeの境界。
- 必須Evidence。
- Ground Truth隔離。
- Scored QAのFail-close条件。
- Finding Contract。
- AgentとEvaluatorの責務分離。
- Known RegressionとExploratory QAの責務分離。

### 8.6 Curriculum

Current RepositoryのRisk・Automation・Agentic QA Practiceを学習可能な形へ変換する。

#### Core / Practice

推奨Practiceとして教える内容は`recommended`を要求する。
Why、Applicable / Non-applicable Conditions、Failure Signs、Evidence、Trade-off、Recoveryを必要な範囲で含める。

#### Advanced / Research

`experimental`、`not_supported`、`refuted`、`inconclusive`、`conflicting`なKnowledgeも、
比較演習、研究課題、Failure Analysis教材として利用できる。
Best Practiceとしては扱わない。

### 8.7 Knowledge-onlyを認める

すべてのKnowledgeを実装へPromotionする必要はない。
Effectが小さい、条件が狭い、Evidence不足、Costが高い、現在のDecisionへ影響しない場合はKnowledgeだけ残す。

### 8.8 Promotion Artifact Traceability

Promotionした場合だけ、KnowledgeとArtifactをつなぐ最小Traceabilityを残す。

```yaml
promotion_artifact:
  target:
  artifact_ref:
  artifact_revision_ref:
  knowledge_id:
  expected_effect:
  validation_ref:
  validation_experiment_ref:
```

`applies_to`、`does_not_apply_to`、`failure_signs`、`rollback_or_recovery`等は必要なTargetだけ追加する。
専用RegistryやDatabaseを要求しない。

---

## 9. Repository Continuous Improvement Loop

### 9.1 Learning Source

Question候補は次から得る。

- Repository QA / Agentic QAのFailure、False Positive / Negative、Scope Violation、Evidence欠損。
- Test Target / SpecificationのRisk不足、Testability Gap、Ambiguity。
- Regression AutomationのKnown Regression Gap、Flake、Layer不適合。
- Curriculum / Learnerの難易度、説明、Current Repositoryとのズレ。
- External Knowledge / Industry Practiceとの意味ある差分。

単発Observationへ場当たり的に変更を足さず、影響、学習価値、反復性、Costを見て優先する。

### 9.2 改善の優先順位

1. Critical Defect / False Negativeや重大なOracle FailureにつながるGap。
2. Ground Truth、Evidence Integrity、Isolationを壊すGap。
3. Test Targetが単純すぎて重要なQA Riskを学習・検証できないGap。
4. False Positive、Duplicate、Scope Violationを増やすGap。
5. CurriculumがCurrent Product / QA Practiceと乖離しているGap。
6. Failure Diagnosis / Repair / Regression Protection不足。
7. Flake、Tool Failure、Environment Failure。
8. Human Active Time / Agent Cost。

### 9.3 3領域の変更を相互にImpact Reviewする

#### Test Target変更時

- Normative Specification。
- Formal Regression。
- Agentic QA Charter / Challenge / Coverage。
- Visual Specification。
- Curriculum / Exercise / Competency。

への影響を確認する。

#### Curriculum Gap発見時

教材だけで解決すべきかを決め打ちせず、Test Target、Specification、Training Environment、Curriculum自身を切り分ける。

#### Agentic QA Failure発見時

Skill追加を既定解にせず、Specification、Test Target、Regression Automation、Skill / Context、Harness / Environment、
Evaluation Contractを切り分ける。

### 9.4 Promotion後は必要な強さで再評価する

- 単純な整合・実行可能性確認 → Target-specific Validation。
- QA / Training Outcomeへの効果Claim → Confirmatory Experiment。
- 広い一般化 → Claim Scopeに必要なHoldout / Cross-task / Cross-platform Evidence。

期待Effectを再現しなければ`candidate`維持、`stale`、またはRevertとする。

### 9.5 Repository Data Boundary

- Repository外の非公開Sourceを無断で持ち込まない。
- Credential / Secret / TokenをExperiment Artifactへ保存しない。
- 個人を識別できるLearner / Human Performance Dataを保存しない。
- External Knowledgeは公開可能なSource Referenceまたは安全な要約を使う。

このPlanのために独自のSecurity PlatformやSanitization Systemを新設しない。

---

## 10. GovernanceとRevalidation

### 10.1 Logical Roles

一人が複数Roleを兼任してよい。Roleごとの専用組織やWorkflowを作る必要はない。

| Role | 責務 |
| --- | --- |
| Experiment Owner | Question、Design、Execution |
| Evaluator | Evaluation Contractに基づくResult評価 |
| Knowledge Reviewer | 一般化、適用範囲、Promotion判断 |
| Test Target Maintainer | Product / Specification変更 |
| Automation Maintainer | Formal Regression反映 |
| Agentic QA Maintainer | Skill / Harness / QA Policy反映 |
| Curriculum Reviewer | Curriculum反映可否 |

Official Score、Ground Truth Match、Critical FindingはAgentまたはExperiment Ownerの自己申告だけで確定しない。
`recommended`昇格にはIndependent Knowledge Reviewを必須とする。

### 10.2 Independent Reviewの最低条件

- Result生成Contextから独立している。
- Raw EvidenceとPre-registrationを変更しない。
- Experiment OwnerのConclusionを正解として前提提示されない。
- Evidenceから独立してConclusion / Applicability / Promotion Targetを評価できる。

Human Reviewer、Fresh Independent Agent、別担当Reviewerのいずれも利用できる。

### 10.3 Revalidation Trigger

次の変化がClaimの成立条件へ影響し得る場合、該当Knowledge / Promotionを再確認する。

- Test Target / Specificationの重要変更。
- Agent Model / Tool / Prompt / Skill / Context Policyの重要変更。
- Playwright / Maestro等の重要Tool変更。
- Formal Regression / Harness / Evaluation Contractの重要変更。
- Curriculum Goal / Training Environmentの重要変更。
- Relevant Standard / Official Guidanceの重要変更。
- 新しいConflicting Evidence。

すべてのVersion変更で機械的にStale化しない。
影響があるKnowledgeだけを対象にする。

### 10.4 Continue / Stop / Park

Continue候補:

- Evidenceが矛盾している。
- Reproduction不足。
- QA / Training Decisionへの影響が大きい。
- False Negativeや重大Failureへ関係する。

Stop / Park候補:

- Resultが十分安定した。
- QA / Training Decisionへほぼ影響しない。
- Added Complexity / Costに対するInformation Gainが小さい。
- より重要なUnknownがある。

Hypothesisが支持されなくても条件を無限調整して成功させない。

---

## 11. Transition Plan

### 11.1 Foundation CapabilityはGlobal Gateにしない

Current Foundationとして次を利用する。

- `test_target`: Current Web / Native ProductとNormative Specification。
- `formal_regression`: Existing Web / Native / Unit / Integration / Contract Test。
- `official_scored_qa`: Official Agentic QAのScored Capability。
- `visual_oracle`: Screen / Important StateをSpecificationへ接続するVisual Oracle。
- `training_environment`: Formal Regressionと分離されたTraining Environment。

Current implementation reference:

- PR #23: Official Black-box Scored E2E
- PR #24: Screen Catalog / Visual Specification
- PR #25: Test Automation Curriculum / Training Environment

PR番号は現時点の実装参照であり、永続Gateではない。
各Experimentが必要なCapabilityだけ確認する。

### 11.2 Capability Readinessは必要時に既存Evidenceで確認する

```yaml
capability_id:
status: ready | degraded | blocked | unknown
validation_ref:
known_limitations: []
```

新しいCapability RegistryをRequiredにしない。
既存SSOT、CI、Validation ArtifactをReferenceとして利用する。

### 11.3 Stabilization / Feature Freeze

Evidenceなしに次を追加しない。

- 大規模Feature / Domain拡張。
- 新Agent Framework。
- Custom Runner。
- Experiment Dashboard / Result Database。
- Custom Job Queue。
- New MCP Proxy / Tool Router。
- Generic Knowledge Management Platform。
- Skillの細分化・増殖。
- Formal E2E Testの無制限追加。

新規基盤や大きなProduct Complexityを検討するのは、Current Artifactで実際に不足が確認された場合だけとする。

### 11.4 Experiment Readiness Gate

最初の正式Experimentを開始する前に、最低限次だけ決める。

- Experiment Recordの置き場所。
- Knowledge Recordの置き場所。
- ID Convention。
- Artifact / Evidence Reference方式。
- Confirmatoryで使うPre-registration Reference方式。
- 必要なCapabilityのReadiness確認方法。

このGateのためにDashboard、Database、専用SaaSを作らない。

### 11.5 Initial Baseline Assessment

最初のExperimentを選ぶ前に軽量なBaseline Assessmentを一度行う。

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

#### QA System

- Current Formal Regression、Agentic QA、Skill、Harness、QA Policy、Evaluation、Scoring。
- False Positive / False Negative / Evidence / Scope Controlの既知Gap。
- Known RegressionとAgentic Explorationの責務重複。

AssessmentはGap候補を作るためのものであり、全Gapを一括修正しない。

### 11.6 Baseline Experiment Candidates

初期候補でありRequired Task Listではない。

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

1. State / Role / Boundary不足とQA Finding Quality。
2. Test Target変更前後のTest Design Variety / Failure Analysis Value。
3. Curriculum Exercise難易度とFresh Learner Outcome。
4. Known RegressionをDeterministic Automationへ移した際のQA Information Gain。

現在の不確実性、Impact、Cost、利用可能Capabilityで優先する。

### 11.7 改善Loop

詳細なLifecycleはSection 0.1、Section 1、Section 9を正とする。
このSectionでは重複定義しない。

最初は**Gapを1件選び、既存Artifactで1周回す**。
反復する不足だけを次の改善対象にする。

---

## 12. Risks / Non-goals / Plan DoD

### 12.1 主要Risk

| Risk | 対策 |
| --- | --- |
| Product Bloat | QA / Training ValueとAdded Complexityで判断 |
| Synthetic Complexity | Benchmark専用罠や難易度のための難易度を禁止 |
| Test Target Confounding | 同一Target RevisionでQA System性能を比較 |
| Governance Bloat | Lightweight Recordを標準とし、Confirmatory項目は必要時のみ追加 |
| Knowledge Bloat | 再利用価値のあるResultだけKnowledge化 |
| Promotion Ceremony | 関係するTargetだけSparseに記録 |
| Infrastructure開発へ戻る | Current Artifact再利用、実測Pain Pointまで自動化しない |
| Confirmation Bias | Confirmatoryだけ事前固定を強化 |
| Result Selection Bias | 必要なExperiment FamilyでNegative Evidenceも確認 |
| Benchmark Overfitting | Ground Truth隔離、答えのSkill埋め込み禁止 |
| Skill / Harness Sprawl | Evidenceなしに追加しない |
| Regression E2E Sprawl | Risk、Cost、Flake、Diagnostic ValueでLayer選択 |
| Curriculum Drift | Test Target / QA System変更時にImpact確認 |
| Knowledge Staleness | 影響のあるKnowledgeだけRevalidation |

### 12.2 Non-goals

このPlanだけでは次を実装しない。

- Experiment SaaS / Dashboard / Leaderboard。
- Knowledge Graph / Vector DB。
- Custom Agent Runtime / Job Queue / Universal MCP Gateway。
- Human QA完全代替。
- AI AgentへのMerge権限自動付与。
- AI QA Required CI化。
- 全Experiment / Metricの完全自動化。
- Model性能ランキング基盤。

また、Feature数、難易度、Skill / Harness / Agent数、E2E Test数、Curriculum文書数、外部Practice取り込み量をGoalにしない。

### 12.3 Open Questions

Plan Approval時点で未確定でもよい。

1. Experiment / Knowledge Recordの物理配置。
2. Promotion Artifact Referenceの物理形式。
3. Failure TaxonomyをMachine-readableにする時期。
4. External Knowledge Intakeを置く場所。
5. Test Target Baseline Assessmentの最小Artifact形式。
6. Human Active Time / Agent Costの収集精度。

必要になる前に専用仕組みを作らない。

### 12.4 Plan DoD

以下を満たした時点でOperating PlanとしてApprove可能とする。

- North StarがTest Target / Curriculum / QA Systemの継続改善に一意化されている。
- 既存SSOT境界が明確である。
- Skill / Harness / Regression Automation / QA Policyの責務境界が明確である。
- Test Target変更にQA / Training ValueとAdded Complexityの判断規則がある。
- Industry AlignmentをInputとして扱い、無検証でBest Practice化しない。
- Test Target Revision変更とQA System性能変化を分離して評価できる。
- Lightweight Experiment Recordが標準になっている。
- Confirmatory / Comparativeだけ必要な追加Contractを要求する。
- Run FailureとEvaluation InvalidとProtocol Invalid Runの境界がある。
- Run Artifact / Executor条件を必要な粒度で追跡できる。
- すべてのExperimentをKnowledge化せず、再利用価値のあるResultだけKnowledge化する。
- `not_supported`と`refuted`を区別できる。
- Promotion TargetをSparseに記録できる。
- Promotion Artifact Revisionをimmutable Referenceで追跡できる。
- Candidate StatusとMainline Baselineの境界が明確である。
- Target-specific Validationと効果Experimentを区別できる。
- `recommended`昇格にIndependent Reviewが必要である。
- Test Target / Regression Automation / Skill / Harness / CurriculumのPromotion責務が分離されている。
- Test Target変更時にSpecification / Formal Test / Agentic QA / Visual / Curriculum Impactを確認する。
- Curriculum GapとAgentic QA Failureを複数Root CauseへRoutingできる。
- CapabilityをGlobal Gateにしない。
- EvidenceなしにProduct Complexity、大規模Infrastructure、Skill、E2E Testを追加しない。

### 12.5 次のAction

1. このPlanをレビューしApprove可能な状態にする。
2. PR #23 / #24 / #25を含むFoundationの最新状態を`main`で確認する。
3. Planを最新`main`へrebaselineする。
4. Test Target / Curriculum / QA Systemの軽量Baseline Assessmentを行う。
5. Experiment / Knowledge ArtifactのCanonical Locationを最小構成で決める。
6. QA / TrainingへのImpactが大きいQuestionを1件選ぶ。
7. Current ArtifactでLightweight Experimentを実行する。
8. 比較・一般化が必要な場合だけConfirmatory / Comparative Contractを追加する。
9. 再利用価値がある場合だけKnowledgeを作る。
10. 必要なTargetだけ`candidate`として変更する。
11. Target-specific Validationと、必要な場合だけPost-promotion Experimentを行う。
12. 次のGapへ進む。

---

## Final Principle

このRepositoryの価値は、どれだけ高度なAgent Frameworkを作ったか、
どれだけFeatureやTestや教材を増やしたかではない。

> Test Targetは、現実的で意味のあるQA Riskを十分に持っているか。
>
> Curriculumは、そのRiskを段階的に理解・設計・自動化・分析できるか。
>
> QA Systemは、Known RegressionをDeterministicに守りつつ、AI Agentが未知のRiskを正確かつ再現可能にQAできるか。
>
> 必要な改善だけを、既存Artifactを優先し、小さく検証して追加できているか。
>
> その判断を必要十分なEvidenceで説明できるか。

Repositoryは答えを固定する場所ではなく、
**Test Target、Curriculum、QA Systemを小さなExperimentとEvidenceで継続的に磨き、
必要なものだけを実装するPlatform**として運用する。
