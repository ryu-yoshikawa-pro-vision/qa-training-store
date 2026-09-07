# Issue #117 PR5 — Semantic Output Eval

## 0. 依頼概要

- 対象: Issue #117 の PR5「Semantic Output Eval」。
- 目的: PR4で意図的に対象外とした、Deterministic Evalでは安全に判定できない**意味的品質**を、必要なSkillについてrubric / assertionベースで評価できるようにする。
- 前提: PR4「Deterministic Output Eval」はPR #126として`main`へmerge済み。
- このbranchでは本Planを正本として後続実装する。
- Plan作成時点では実装しない。Semantic grader、eval dataset、runner、test、CI、Skill本文、Product Codeは変更しない。

---

## 1. ゴール

PR5の目的は「全SkillにLLM Judgeを付けること」ではない。

各Skillについて、次の4条件を満たす場合だけSemantic Output Evalを実装する。

1. Skillに評価対象として明確なOutputがある。
2. Outputとself-containedなcontextだけで意味品質を判断できる。
3. PR4や既存validatorでは扱えない重要な品質が残る。
4. actual Workflow executionを再現しなくても、その評価結果に実用的な意味がある。

この条件を満たさないSkillは、意味判断そのものが存在していてもPR5ではN/Aとする。

PR5で作るものは、**既知の良いcandidate outputと既知の悪いcandidate outputを、Skill Contractに基づいて安定して識別できるSemantic graderの定義・calibration基盤**である。

実Skillを実行して生成物を取得し、Skill間handoff・repair execution・runtime validationまで含めて評価することはPR6の責務とする。

### 重要原則

1. PR4のdeterministic評価とsemantic評価を混ぜない。
2. Skillごとの意味契約から必要最小限のcriterionだけを選ぶ。
3. Output全文や唯一の模範回答との一致ではなく、rubric assertionで評価する。
4. LLM Judgeの揺らぎを3 trialで可視化し、mixed resultをPASSへ丸めない。
5. Skillを実行する独自Agent RuntimeをPR5で作らない。
6. Semantic Eval基盤そのものを過度に汎用化しない。

---

## 2. Semantic Eval要否の固定分類

### 2.1 PR5で実装するSkill

現行Contractを、前節の4条件で再評価した結果、PR5では次の4 SkillだけをSemantic Eval対象とする。

| Skill | PR5分類 | Semantic Eval対象 | PR4との境界 |
| --- | --- | --- | --- |
| `feature-plan` | `semantic required` | 事実整合、scope discipline、主要riskとvalidationの対応 | required H2 presenceはPR4 validatorへ残す |
| `code-review` | `semantic required` | finding妥当性、impact/evidence整合、review-only境界 | fixed serializationを新設せずFinding内容だけ意味評価する |
| `harness-improvement` | `semantic required` | evidenceに基づく改善か、Product bugとの分離、過剰抽象化防止 | candidateの固定Machine schemaは新設しない |
| `exploratory-qa` | `semantic required` | FindingとEvidence/Oracleの整合、断定の妥当性、重要riskへの対応 | `qaFindingsSchema` / Coverage relationはPR4へ残す |

### 2.2 PR5ではN/AとするSkill

| Skill | PR5分類 | N/A理由 | 後続 |
| --- | --- | --- | --- |
| `repair-loop` | `N/A for PR5` | Output品質の本質が、実際に何を変更したか、validation結果、remaining delta、stop decisionとactual executionの整合にある。静的candidateだけでは本質を十分評価できない | PR6 Workflow E2Eで実repair executionと合わせて評価 |
| `android-native-local-validation` | `N/A for PR5` | first anomaly、stage gate、retry/stop判断は実log・command result・実行順序との整合が本質。固定packetだけのJudgeを先に作るよりactual executionと一体で見る方が目的に合う | PR6 Workflow E2EでNative execution evidenceと合わせて評価 |

このN/Aは「意味判断がない」という意味ではない。

**Output単体のSemantic graderとして今作る価値が低い**ためPR5から外す。

N/Aを減らすために、repair-loopやNative用の人工的なcandidate format、log packet schema、iteration serializationを新設してはならない。

---

## 3. Skillごとの評価対象

### 3.1 `feature-plan`

Canonical source:

```text
.agents/skills/feature-plan/SKILL.md
.agents/skills/feature-plan/references/planning-workflow.md
.agents/skills/feature-plan/assets/plan-template.md
```

PR5ではPlanの文面全体を採点しない。

最小の重要criterionだけを見る。

候補:

1. **Fact / strategy consistency**
   - contextで確定しているRepository / Issue事実とPlanの変更戦略が矛盾していない。
2. **Scope discipline**
   - user request / non-goalを越える再設計・実装をPlanへ持ち込んでいない。
3. **Risk / validation alignment**
   - 主要riskに対して、実装完了を判断できるvalidationが対応している。

PR4で扱うheading存在、Markdown whitespace、fence parsingは評価しない。

### 3.2 `code-review`

Canonical source:

```text
.agents/skills/code-review/SKILL.md
.agents/skills/code-review/references/review-workflow.md
```

候補:

1. **Finding validity**
   - Findingが実際のdiff / supplied factsに支えられている。
2. **Impact and evidence alignment**
   - 指摘する影響・重要度がEvidenceと釣り合い、根拠の弱いstyle nitやspeculationを重大Findingへ昇格していない。
3. **Review boundary**
   - review-onlyの依頼で修正実装へ進んでいない。

Severity文字列、Location文字列など、grader都合の固定Output serializationを作らない。

### 3.3 `harness-improvement`

Canonical source:

```text
.agents/skills/harness-improvement/SKILL.md
.agents/skills/harness-improvement/references/improvement-workflow.md
```

候補:

1. **Evidence-grounded candidate**
   - 改善提案がsupplied run / evaluation / repeated failure evidenceに支えられている。
2. **Product / Harness separation**
   - 単発Product bugをHarness問題へすり替えていない。
3. **Minimal reusable improvement**
   - blanket retry、無根拠timeout延長、defect隠し、abstractionのためのabstractionへ拡大していない。

### 3.4 `exploratory-qa`

Canonical source:

```text
.agents/skills/exploratory-qa/SKILL.md
.agents/skills/exploratory-qa/references/workflow.md
```

Repository-side deterministic contract:

```text
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/coverage.ts
```

Semantic caseはschema-validであることを前提とする。

候補:

1. **Oracle / evidence consistency**
   - FindingがNormative Specification / supplied OracleとEvidenceに支えられている。
2. **Claim discipline**
   - observationからEvidence以上の断定をせず、Product defect / environment / test issueを根拠なく混同していない。
3. **Risk relevance**
   - candidate outputがmissionで重要なriskを扱い、無関係な探索結果へ偏っていない。

Coverage item存在やschema relationはPR4のdeterministic評価へ残す。

---

## 4. Rubric設計原則

### 4.1 Criterion数

各Skillは**2〜3 criterion**を基本とする。

3 criterionでSkillの本質的意味品質を表せるなら増やさない。

`correctness / relevance / coverage / traceability / risk-awareness / scope-discipline / stop-decision`はIssue #117上の設計観点であり、評価データへそのまま全列挙する必要はない。

### 4.2 `dimension` metadataは作らない

runnerがscore、weight、cross-Skill比較、thresholdに使わないため、`dimension` fieldはevaluation data schemaへ持ち込まない。

criterionは以下だけでよい。

```yaml
criteria:
  - id: FP-SCOPE
    assertion: >-
      The candidate plan stays within the requested planning scope and does not
      introduce unrelated implementation or redesign work.
    source: references/planning-workflow.md
```

`source`はpackage-local canonical contract fileへの相対pathとする。

Markdown anchorの存在検証までは行わない。File existenceだけをdeterministicに確認する。

### 4.3 全Skill共通Rubricを作らない

共通化するのはevaluation fileの最小shapeとJudge response shapeだけとする。

次は作らない。

- global semantic score
- 100点満点
- weight
- cross-Skill threshold
- global dimension registry
- Rule Engine
- DSL
- plugin registry

---

## 5. Calibration data設計

### 5.1 配置

PR5対象4 Skillだけに次を追加する。

```text
.agents/skills/feature-plan/evals/output/semantic.yaml
.agents/skills/code-review/evals/output/semantic.yaml
.agents/skills/harness-improvement/evals/output/semantic.yaml
.agents/skills/exploratory-qa/evals/output/semantic.yaml
```

`repair-loop` / `android-native-local-validation`には空directory、N/A marker、placeholder datasetを作らない。

N/A理由の正本はこのPlanとIssue / PR discussionとする。

### 5.2 最小schema

概念shape:

```yaml
schema_version: 1
skill: feature-plan
criteria:
  - id: FP-SCOPE
    assertion: >-
      ...
    source: references/planning-workflow.md
cases:
  - id: FP-SEM-001-PASS
    context: |
      ...
    candidate_output: |
      ...
    expected:
      outcome: pass

  - id: FP-SEM-002-FAIL
    context: |
      ...
    candidate_output: |
      ...
    expected:
      outcome: fail
      failed_criteria:
        - FP-SCOPE
```

`expected`を1 objectへまとめ、`expected: pass`と`expected_failed_assertions`の二重管理はしない。

Deterministic validationで次を固定する。

- `outcome: pass`では`failed_criteria`を持たない。
- `outcome: fail`では`failed_criteria`が1件以上必要。
- `failed_criteria`はそのSkillのcriterion IDだけを参照する。

### 5.3 Anchor数

各Skillに最低2 caseだけ置く。

- 1つのsemantic-pass anchor
- 1つのsemantic-fail anchor

初回PRでcase数を増やすこと自体を品質向上とみなさない。

### 5.4 Fail anchorの作り方

fail anchorは単なる空文字・壊れた文書にしない。

**一見もっともらしいが、1つの中心契約を明確に破る**caseとする。

例:

- `feature-plan`: Plan-only依頼なのに実装作業までscopeへ含める。
- `code-review`: 実害のないstyle差分をHigh-risk regressionとして断定する。
- `harness-improvement`: 単発Product bugをHarness timeout延長で隠す。
- `exploratory-qa`: observationからEvidenceなしにProduct defectを断定する。

fail caseが副次的に別criterionもFAILすること自体は禁止しない。

ただしcalibration truthの`failed_criteria`には、case設計で明確に狙ったcriterionだけを記載し、曖昧な複合negativeを避ける。

### 5.5 Case self-containment

caseはJudgeがRepositoryを追加探索しなくても判断できるよう、必要な事実を`context`へ閉じる。

Judgeの役割は次に限定する。

```text
rubric assertion
+ supplied context
+ candidate output
→ criterionごとの意味判定
```

Product全体、current branch、Issue全文、hidden answer keyをJudgeへ調査させない。

---

## 6. Judge response contract

### 6.1 ZodをSingle Source of Truthにする

Repositoryには既存Zod 4があるため、新規dependencyを追加しない。

Judge response contractは1つのZod schemaだけを正本とする。

概念shape:

```ts
const judgeResponseSchema = z.object({
  schema_version: z.literal(1),
  case_id: z.string().min(1),
  criteria: z.array(
    z.object({
      id: z.string().min(1),
      verdict: z.enum(["pass", "fail"]),
      reason: z.string().min(1),
    }),
  ),
});
```

同じschemaを次の両方へ使う。

```text
judgeResponseSchema
├─ Zod 4 JSON Schema変換
│  └─ codex exec --output-schema
└─ Zod parse
   └─ returned final JSONの検証
```

Judge用JSON SchemaとHarness parserを別々に手書きしない。

### 6.2 `evidence` fieldは作らない

初回PRではcriterionごとの`reason`だけを取得する。

`evidence`と`reason`を分離すると意味が重なり、schemaとpromptが増えるため追加しない。

必要性が実運用で確認された場合のみ後続で検討する。

### 6.3 Harness側の追加検証

Zod parse成功後、Harnessは次を確認する。

- `case_id`が実行caseと一致する。
- criterion IDがmissingでない。
- duplicate criterionがない。
- unknown criterionがない。
- rubricの全criterionがちょうど1回ずつ返る。

Judgeに`overall`やscoreを返させない。

Harness側で、全criterion PASSならtrial PASS、1つでもFAILならtrial FAILとする。

---

## 7. Codex Judge runnerの最小設計

### 7.1 Current Codex CLI capability

実装時点のOpenAI Codex CLI sourceで、通常の`codex exec`に少なくとも次のoptionが存在することを確認済みの前提とする。

```text
--model
--sandbox
--skip-git-repo-check
--output-schema
--output-last-message / -o
--ephemeral
```

ただし、Repositoryの実行環境にインストールされているCodex CLI versionで同じ組み合わせが成立するかはPhase 0でfunctional probeする。

### 7.2 JSON event streamを解析しない

PR5では`codex exec --json` / JSONL lifecycle event parserを実装しない。

理由:

- Semantic Judgeで必要なのはfinal structured resultだけである。
- `--output-schema`でfinal response shapeを制約できる。
- `--output-last-message`でfinal messageを専用fileへ出せる。
- `turn.started` / `turn.completed`等のevent protocolへ不要に依存すると実装量と将来driftが増える。

### 7.3 Judge invocation

概念上は次の形とする。

```text
codex exec
  --ephemeral
  --skip-git-repo-check
  --sandbox read-only
  --model <explicit-model>
  --output-schema <temporary-json-schema-file>
  --output-last-message <temporary-result-file>
  -
```

promptはstdinから渡す。

Judge executionは一時directoryをworking directoryとして実行し、Evaluator Repositoryをworking directoryにしない。

`--skip-git-repo-check`を利用するため、一時Git Repositoryを初期化しない。

### 7.4 Functional probe

source実装を始める前に、短い1 case probeで以下を確認する。

1. `codex --version` が取得できる。
2. `codex exec --help`で必要optionが存在する。
3. read-only + ephemeral + skip-git-repo-checkの実行が成立する。
4. explicit model指定が成立する。
5. `--output-schema` + `--output-last-message`の組み合わせでfinal result fileが生成される。
6. result fileを`judgeResponseSchema`でparseできる。

これが成立しない場合:

- JSONL event parserを代替実装しない。
- OpenAI SDK / provider SDKを追加しない。
- temp Git repo等の複雑なfallbackを自動追加しない。
- PR5 runtimeを`BLOCKED`として設計判断を分離する。

### 7.5 Judge isolation

Judge promptに渡すもの:

1. evaluation instruction
2. Skill名
3. rubric criteria
4. case context
5. candidate output
6. required structured responseの説明

渡さないもの:

- `expected.outcome`
- `expected.failed_criteria`
- full semantic.yaml
- Evaluator Repository path
- Planのcalibration truth

一時directoryへEvaluator sourceやeval fileをcopyしない。

---

## 8. Pure evaluator

追加:

```text
scripts/evals/skill-semantic-output-evals.ts
```

責務は次だけに限定する。

### Dataset

- 対象4 Skillの`semantic.yaml` discovery
- YAML parse
- Zod schema validation
- Skill名 / case ID / criterion ID uniqueness
- `expected.failed_criteria` reference integrity
- `source` file existence
- dataset fingerprint生成

### Judge

- `judgeResponseSchema`定義
- 同schemaからJSON Schema生成
- Judge prompt構築
- Judge final JSON parse
- criterion completeness確認
- trial outcome導出
- 3 trial aggregate導出

### 非責務

- Codex process起動
- Skill実行
- Repository routing
- Git hook監視
- Product validation
- Workflow E2E
- PR4 deterministic validationの再実装

---

## 9. Dataset fingerprint

canonical YAML serializationは作らない。

fingerprintは対象4ファイルをrelative path順に並べ、次をSHA-256するだけとする。

```text
relative path
+ separator
+ raw file bytes
```

目的は「同じevaluation dataだったか」のprovenanceであり、意味的に同じYAMLをformatting差分まで同一fingerprintにすることではない。

Formatting変更でfingerprintが変わって構わない。

---

## 10. Trial / aggregation semantics

canonical runは固定で**3 trial**とする。

初回PRでは`--trials` CLI optionを公開しない。

不要な可変parameterを増やさず、canonical behaviorを1つに固定する。

### Trial outcome

```text
all criteria PASS -> pass
1つ以上criteria FAIL -> fail
runtime / timeout / process / output file missing / schema parse failure -> unobservable
```

### Case aggregate

```text
3 pass                         -> stable_pass
3 fail                         -> stable_fail
3 trialすべてobservableでmixed -> unstable
1 trialでもunobservable       -> unobservable
```

`unstable`を2/3 majorityでPASSへ変換しない。

`unobservable`はJudge品質のFAILと混同しない。

### Calibration expected

- pass anchor -> `stable_pass`
- fail anchor -> `stable_fail`
- fail anchorの`expected.failed_criteria` -> 全3 trialでFAIL検出

これを満たさないcaseはcalibration failureとする。

---

## 11. Provenance

live resultには最低限次だけを残す。

```text
schema_version
evaluator_git_sha
dataset_sha256
codex_version
requested_model
trial_count
executed_at
case_id
trial outcomes
criterion verdicts
aggregate outcome
calibration match
```

`model`という名前は使わない。

CLIへ要求したmodelを記録するため、`requested_model`とする。

providerが実際に返したmodel identityをCLIから確認できない場合、それを推測して記録しない。

`trial_count`はPR5では常に3である。

---

## 12. Runner

追加:

```text
scripts/evals/run-skill-semantic-output-evals.ts
```

責務:

- CLI引数parse
- `--model <name>`必須
- `--output <path>`必須
- optional `--skill <name>`
- optional `--case <id>`
- `codex --version`取得
- temporary directory / schema file / result file作成
- Codex Judgeを3回sequential実行
- timeout / exit status / output readを管理
- normalized result JSON出力

初回PRでは次を作らない。

- `--trials`
- `--compare`
- baseline registry
- retry option
- concurrency option
- provider option
- judge profile registry
- JSONL event parser
- Hook observer
- automatic fallback runtime

### Retry

自動retryは実装しない。

1 trialのruntime/protocol不成立はそのtrialを`unobservable`にする。

canonical runで1件でも`unobservable`ならcalibration PASSにしない。

---

## 13. Package script / CI境界

### 13.1 Package script

追加するlive scriptは1つだけとする。

```json
{
  "eval:skills:semantic": "tsx scripts/evals/run-skill-semantic-output-evals.ts"
}
```

`eval:skills:semantic:validate`は初回PRでは追加しない。

理由:

- deterministic integrityはRepository Contract Testで評価できる。
- `pnpm run verify`は既にRepository Contract Testを通す。
- 同じvalidation経路をCLIとtestで二重管理しない。

将来、LLMなしの手動高速validation commandが実際に必要になった場合だけ追加を検討する。

### 13.2 Required CI

live LLM Judgeは通常`pnpm run verify`やRequired CIへ入れない。

理由:

- external runtime / model可用性に依存する。
- latency / quota / model更新で通常PR gateが不安定になる。
- PR5のlive runは評価・calibrationであり、Product build gateではない。

通常CIで固定するのは、dataset / parser / aggregation等のdeterministic contractだけとする。

---

## 14. Repository Contract Test

追加:

```text
tests/repository-contract/skill-semantic-output-evals.test.ts
```

LLMなしで次を検証する。

### Dataset

- 対象4 datasetが存在する。
- `repair-loop` / `android-native-local-validation`へplaceholder semantic datasetがない。
- duplicate case / criterion IDを拒否する。
- unknown expected criterionを拒否する。
- pass expectedにfailed criteriaを持たせない。
- fail expectedは1件以上のfailed criterionを要求する。
- rubric source file missingを拒否する。

### Prompt leakage

- Judge promptに`expected.outcome`を含めない。
- Judge promptに`expected.failed_criteria`を含めない。

### Response

- valid responseをparseできる。
- missing criterionを拒否する。
- duplicate criterionを拒否する。
- unknown criterionを拒否する。
- malformed JSONをobservable PASS/FAILへ推測変換しない。

### Aggregation

- 3 pass -> stable_pass
- 3 fail -> stable_fail
- observable mixed -> unstable
- 1 unobservableを含む -> unobservable

### Fingerprint

- 同じraw datasetでfingerprintが安定する。
- dataset bytesが変わればfingerprintも変わる。

---

## 15. 実装時の変更ファイル

基本構成:

```text
.agents/skills/feature-plan/evals/output/semantic.yaml
.agents/skills/code-review/evals/output/semantic.yaml
.agents/skills/harness-improvement/evals/output/semantic.yaml
.agents/skills/exploratory-qa/evals/output/semantic.yaml
scripts/evals/skill-semantic-output-evals.ts
scripts/evals/run-skill-semantic-output-evals.ts
tests/repository-contract/skill-semantic-output-evals.test.ts
package.json
```

Plan自体:

```text
docs/plans/2026-09-08_004700_issue-117-pr5-semantic-output-eval.md
```

必要にならない限り変更しない:

```text
.agents/skills/*/SKILL.md
.agents/skills/*/references/**
.agents/skills/repair-loop/evals/**
.agents/skills/android-native-local-validation/evals/**
.agents/skills/feature-plan/scripts/validate-plan-output.ts
tests/contracts/skill-output-eval.test.ts
.github/workflows/**
pnpm-lock.yaml
.codex/agents/**
Product Code
Product Test
```

---

## 16. 実装前preflight

### 16.1 Repository dependency

latest `main`で次を確認する。

- PR #126がmerge済み。
- `.agents/skills/feature-plan/scripts/validate-plan-output.ts` が存在する。
- `tests/contracts/skill-output-eval.test.ts` がPR4 boundaryを維持している。
- 対象4 Skillのcanonical contractにmaterial driftがない。
- N/A 2 SkillのOutput / Workflow Contractに、PR5分類を変えるmaterial driftがない。

PR2 / PR3はPR5のrequired dependencyではない。

Trigger Eval selector / Hook observer / routing scoringをPR5へ流用しない。

### 16.2 Existing dependency

- current `zod` / `yaml`で実装可能であることを確認する。
- Zod 4の既存JSON Schema変換を利用し、追加schema-conversion dependencyを入れない。

### 16.3 Codex capability probe

Phase 0で前述のfunctional probeを1回だけ実施する。

probe不成立時に、実装者判断で別runtimeへ拡張しない。

---

## 17. 実装手順

### Phase 0 — preflight / Codex probe

1. latest `main` / PR4 boundaryを確認する。
2. 4 Skillのsemantic required、2 SkillのN/A判断にdriftがないことを確認する。
3. Zod JSON Schema conversionがcurrent dependencyで利用できることを確認する。
4. Codex CLI option存在を確認する。
5. 1 caseだけで`--output-schema` + `--output-last-message` functional probeを行う。
6. probe不成立ならfallbackを作らずBLOCKEDとして止める。

### Phase 1 — 4 SkillのEval data

1. 4 Skillに`semantic.yaml`を追加する。
2. 各Skill2〜3 criterionに絞る。
3. 各criterionをpackage-local canonical sourceへtraceさせる。
4. pass anchor / targeted fail anchorを1件ずつ作る。
5. case contextをself-containedにする。
6. deterministic項目がrubricへ混入していないことを確認する。

### Phase 2 — Pure evaluator

1. dataset Zod schemaを実装する。
2. 4 dataset discoveryを実装する。
3. ID / expected reference / source file integrityを実装する。
4. raw-file fingerprintを実装する。
5. `judgeResponseSchema`を実装する。
6. 同schemaからCodex用JSON Schemaを生成する。
7. expected metadataを除外したprompt builderを実装する。
8. response completeness checkを実装する。
9. trial / aggregate pure functionを実装する。

### Phase 3 — Minimal Judge runner

1. `--model` / `--output` / optional `--skill` / `--case`だけを実装する。
2. temporary directoryを作る。
3. JSON Schemaをtemporary fileへ書く。
4. Codexをread-only / ephemeral / skip-git-repo-checkで実行する。
5. `--output-last-message`のresult fileを読む。
6. same Zod schemaでparseする。
7. process / timeout / output failureを`unobservable`にする。
8. 各case3 trialをsequential実行する。
9. provenance付きresult JSONを書く。
10. retry、JSONL parser、temp Git repoは作らない。

### Phase 4 — Repository Contract Test

前節14のdeterministic contractをテストする。

### Phase 5 — Canonical calibration

source実装をcommitした後、そのcommitをEvaluator SHAとして固定する。

1. targeted testsをPASSさせる。
2. explicit modelを指定する。
3. 全8 anchor（4 Skill × pass/fail）を3 trialずつsequential実行する。
4. 4 pass anchorすべてが`stable_pass`になることを確認する。
5. 4 fail anchorすべてが`stable_fail`になることを確認する。
6. fail anchorのtarget failed criterionが全3 trialで検出されることを確認する。
7. `unstable` / `unobservable`が1件でもあればcanonical calibrationをPASS扱いしない。
8. failure時はまずcase ambiguity / rubric wording / protocolを確認し、model結果へ都合よくtruthを変更しない。
9. official resultをRun Artifactへ保存する場合はRepository sanitizerを通す。

### Phase 6 — Full validation / scope audit

1. targeted repository-contract test
2. `pnpm run validate:skills`
3. `pnpm run verify`
4. `git diff --check main...HEAD`
5. changed file inventory
6. Product / Skill Contract / workflow / dependency driftなし確認

---

## 18. Canonical live run

形:

```bash
pnpm run eval:skills:semantic -- \
  --model <explicit-model> \
  --output <repo-relative-run-artifact-path>
```

特定Skill / caseだけの診断時:

```bash
pnpm run eval:skills:semantic -- \
  --model <explicit-model> \
  --skill code-review \
  --case CR-SEM-002-FAIL \
  --output <repo-relative-run-artifact-path>
```

Windows PowerShellではshell syntaxだけ合わせ、引数意味は変えない。

---

## 19. Validation commands

最低限:

```bash
pnpm exec vitest run tests/repository-contract/skill-semantic-output-evals.test.ts --no-file-parallelism --maxWorkers=1
pnpm run validate:skills
pnpm run verify
```

実装commit後:

```bash
git diff --check main...HEAD
```

changed filesについて次がないことを確認する。

```text
Product Code変更
Product Test変更
Skill description変更
Skill workflow変更
routing変更
PR4 deterministic contract変更
.github/workflows/**変更
.codex/agents/**変更
新規dependency変更
pnpm-lock.yaml変更
repair-loop / Native用placeholder eval追加
```

---

## 20. Definition of Done

- [ ] 6 SkillすべてについてSemantic Eval要否が判断されている。
- [ ] 4 Skillが`semantic required`、2 SkillがPR5 N/Aとして理由まで明示されている。
- [ ] N/A Skillのための人工的Output schema / placeholder evalを作っていない。
- [ ] 対象4 Skillに2〜3個のSkill-specific criterionがある。
- [ ] 全criterionがpackage-local canonical sourceへtraceできる。
- [ ] deterministic項目をSemantic rubricへ重複実装していない。
- [ ] 各対象Skillに1 pass anchor / 1 plausible targeted fail anchorがある。
- [ ] expected truthをJudge promptへ渡していない。
- [ ] Judge response contractは1つのZod schemaを正本としている。
- [ ] 同じZod schemaからCodex `--output-schema`用JSON Schemaを生成している。
- [ ] JSONL event parserを追加していない。
- [ ] Judge用temp Git Repositoryを作っていない。
- [ ] criterionの`pass` / `fail`と短いreasonを取得できる。
- [ ] Harness側がcriterion verdictからtrial resultを導出する。
- [ ] canonical trial countは3に固定されている。
- [ ] 3/3 PASS=`stable_pass`、3/3 FAIL=`stable_fail`、observable mixed=`unstable`、runtime/protocol failure含有=`unobservable`として区別できる。
- [ ] pass anchorが`stable_pass`、fail anchorが`stable_fail`になるcanonical calibrationを確認できる。
- [ ] fail anchorのtarget failed criterionを全3 trialで検出できる。
- [ ] resultへevaluator SHA、raw dataset fingerprint、Codex CLI version、`requested_model`、trial countを記録できる。
- [ ] live Judgeを通常Required CIへ入れていない。
- [ ] repository-contract testでdataset / prompt leakage / response / aggregationをdeterministicに検証できる。
- [ ] `eval:skills:semantic:validate`等の重複validation scriptを初回PRで追加していない。
- [ ] Product Code / Product Test / `.codex/agents/**` / routing / Skill description / Skill workflowを変更していない。
- [ ] 新規npm dependency / lockfile変更を追加していない。
- [ ] targeted test、`pnpm run validate:skills`、`pnpm run verify`が通る。
- [ ] `git diff --check main...HEAD`が通る。

---

## 21. Scope

### Included

- 6 SkillのSemantic Eval要否棚卸し
- 4 SkillのSkill-specific semantic rubric
- 4 Skillのpass / fail calibration anchor
- deterministic eval data validation
- Zod-based Judge response contract
- Codex `--output-schema`を利用するminimal Judge runner
- 3-trial stability classification
- provenance / result JSON
- deterministic repository contract test
- explicit live semantic calibration

### Excluded

- `repair-loop`のstatic Semantic Eval
- `android-native-local-validation`のstatic Semantic Eval
- Skill description最適化
- Trigger Eval変更
- PR2 dataset / selector / hook logic流用
- PR4 deterministic grader拡張
- Skill Workflow semantic redesign
- Product Code / Product Test変更
- actual repair execution評価
- Native Build / Install / Maestro実行評価
- multi-Skill handoff
- Workflow E2E
- provider SDK追加
- JSONL lifecycle parser
- temp Git repo bootstrap
- Embedding / vector similarity
- Golden全文一致
- 100点score
- cross-Skill common rubric
- dimension registry
- Repository独自Agent Runtime / Workflow Engine
- live Semantic EvalのRequired CI化

---

## 22. Risks

### Risk 1 — LLM Judgeが不安定

対策:

- 3 trial固定
- mixedを`unstable`
- majority voteでPASSへ丸めない
- strong pass / plausible targeted fail anchor
- `requested_model` / Codex version / dataset fingerprint記録

### Risk 2 — Rubricが広すぎる

対策:

- Skillあたり2〜3 criterion
- 重要な意味契約だけに限定
- criterion追加は「既存2〜3個では重大なfalse-passを防げない」場合だけ

### Risk 3 — Rubricがdeterministic contractを重複する

対策:

- PR4 validator / schemaと照合
- field existence / formatting / ID rule / Coverage relationをSemantic rubricから除外

### Risk 4 — Judgeがanswer metadataを読む

対策:

- prompt builderでexpected metadataを構造的に除外
- temp directoryで実行
- Evaluator RepositoryをJudge working directoryにしない
- semantic.yaml自体をJudgeへ渡さない

### Risk 5 — Runtime wrapperが過剰になる

対策:

- `--output-schema` / `--output-last-message`を使う
- JSONL parserを作らない
- temp Git repoを作らない
- retry / compare / concurrency / provider abstractionを作らない

### Risk 6 — PR5とPR6の境界が崩れる

対策:

- PR5はhand-authored calibration candidateだけをJudgeする
- actual Skill executionは行わない
- repair-loop / Nativeはexecution依存が強いためPR6へ残す

---

## 23. Shippability

PR5単体でレビュー可能な完成状態は次とする。

1. 4 Skill分のSemantic rubric / calibration dataが存在する。
2. 2 SkillのN/A理由が明確で、placeholder実装がない。
3. deterministic validator / repository testsがPASSする。
4. live Judgeで全8 anchorの3-trial calibrationが成立する。
5. resultに再現性判断に必要なprovenanceが残る。
6. PR4 deterministic boundaryを壊していない。
7. PR6なしでも「supplied candidate outputを意味評価するgrader」として独立して利用できる。
8. actual Skill execution / Workflow executionをPR5へ持ち込んでいない。

PR5が証明するのは、**Semantic graderが既知の良いcandidateと既知の悪いcandidateを安定して区別できること**である。

PR5単体で「現在のSkill実行品質が良い」ことまで証明したとは扱わない。

actual Skill executionの評価はPR6で行う。

---

## 24. Fixed assumptions / implementation-time probe

### 固定Assumptions

- PR4はPR5の直接dependencyであり、merge済み`main`を基点とする。
- PR2 / PR3はPR5のrequired dependencyではない。
- PR5対象は4 Skill、N/Aは2 Skillとする。
- LLM provider SDKは追加しない。
- Codex CLIを既存Host Runtimeとして利用する。
- Judge responseはZod schemaをSSOTとする。
- canonical semantic calibrationではmodelを明示指定する。
- canonical trial countは3固定とする。
- live semantic evalは通常CI必須Gateにしない。
- PR6がactual Skill execution / Workflow E2Eを担当する。

### 実装時probeで確定する項目

- Repository環境のCodex CLI version。
- current CLIで`--output-schema` + `--output-last-message`が同時利用できること。
- exact model指定が成立すること。
- canonical runに採用する具体的`requested_model`名。

probe結果によりこの最小経路が成立しない場合、実装者判断で代替runtimeを増設せずBLOCKEDとして記録する。

---

## 25. 今回Plan-onlyで行わないこと

この修正commitでもPlanファイルだけを変更する。

まだ行わないもの:

- `evals/output/**`作成
- semantic rubric実装
- calibration fixture作成
- evaluator / runner実装
- package script変更
- test追加
- live Codex trial
- Run Artifact作成
- Skill本文変更
- PR作成

後続実装は、このbranch上で本Planを正本として開始する。
