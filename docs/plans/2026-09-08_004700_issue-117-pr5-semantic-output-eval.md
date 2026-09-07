# Issue #117 PR5 — Semantic Output Eval

## 0. 依頼概要

- 対象: Issue #117 の PR5「Semantic Output Eval」。
- 目的: PR4で意図的に対象外とした、Deterministic Evalでは安全に判定できない**意味的品質**を、必要なSkillについてrubric / assertionベースで評価できるようにする。
- 前提: PR4「Deterministic Output Eval」はPR #126として`main`へmerge済み。
- このbranchでは本Planを正本として後続実装する。
- Plan作成時点では実装しない。Semantic grader、eval dataset、runner、test、CI、Skill本文、Product Codeは変更しない。

---

## 1. ゴール / 完了条件

### ゴール

6 Skillそれぞれについて、現在のSkill Contractに**人間またはLLMでなければ安全に判定できない意味要件があるか**を明示し、必要なSkillだけにSemantic Output Evalを実装する。

PR5の目的は「LLM Judgeを置くこと」ではない。

重要なのは次の5点である。

1. PR4のdeterministic評価とsemantic評価を混ぜない。
2. Skillごとの意味契約から必要なdimensionだけを選ぶ。
3. Output全文や唯一の模範回答との一致ではなく、rubric assertionで評価する。
4. LLM Judgeの揺らぎを複数trialで可視化し、mixed resultをPASSへ丸めない。
5. Skillを実行する独自Agent RuntimeをPR5で作らない。

### 6 SkillのSemantic Eval分類

現行`main`のSkill Contractを確認した結果、PR5では6 Skillすべてにdeterministicだけでは扱えない意味判断が存在する。

ただし、**共通rubricを全Skillへ強制しない**。評価するdimensionは下表の範囲に限定する。

| Skill | PR5分類 | Semantic Eval対象 | PR4との境界 |
| --- | --- | --- | --- |
| `feature-plan` | `semantic required` | correctness / relevance / coverage / risk-awareness / scope-discipline | required H2 presenceはPR4 validatorへ残し、Semantic graderでは再判定しない |
| `code-review` | `semantic required` | correctness / relevance / traceability / risk-awareness / scope-discipline | fixed serializationを新設せず、findingの妥当性・重要度・根拠を意味評価する |
| `repair-loop` | `semantic required` | correctness / traceability / scope-discipline / stop-decision | iteration schemaを新設せず、triage・最小修正・停止判断の妥当性だけを意味評価する |
| `harness-improvement` | `semantic required` | correctness / relevance / traceability / risk-awareness / scope-discipline | candidate schemaを新設せず、繰り返しEvidenceに基づく改善か・過剰抽象化でないかを意味評価する |
| `exploratory-qa` | `semantic required` | correctness / coverage / traceability / risk-awareness / scope-discipline | `qaFindingsSchema` / Coverage relationはPR4へ残し、Finding内容・仮説・Evidenceの意味品質だけを評価する |
| `android-native-local-validation` | `semantic required (narrow)` | correctness / traceability / risk-awareness / scope-discipline / stop-decision | Build/Install/Flow等のstage結果そのものは既存deterministic gateへ残し、first anomaly分類・retry/stop判断だけを意味評価する |

この分類は「6 Skillすべてに同じrubricを付ける」という意味ではない。

特に`android-native-local-validation`では、コマンド成功/失敗やstage gateをLLM Judgeへ移さない。Semantic対象は、同じログからfirst anomalyを正しく分離できるか、根拠なく`TRANSIENT_FAILURE`扱いしていないか、上流失敗後に停止すべきか等の判断に限定する。

### 必須原則

- Golden全文一致を使わない。
- sentence / keyword / Markdown wordingの一致率を品質判定に使わない。
- 100点満点等の独自総合スコアを作らない。
- Skill間で共通rubric dimensionを強制しない。
- deterministicで既に判定できる項目をLLM Judgeへ移さない。
- grader都合でSkill OutputのJSON schema / Markdown label / serializationを新設しない。
- Semantic Eval dataは評価専用Contractであり、Production Skill Output Contractへ昇格させない。
- LLM Judgeの`overall`自己申告をそのまま信頼せず、criterion verdictからHarness側で結果を導出する。
- invalid JSON、timeout、process failure、protocol不明はFAIL/PASSへ推測変換せず`unobservable`扱いにする。
- mixed trialをmajority voteでPASSへ丸めない。
- live Semantic Evalを通常の`pnpm run verify`やRequired CIへ直接入れない。
- deterministicなdataset/rubric integrity checkだけは通常検証へ接続可能とする。
- Repository独自Agent Runtime / Workflow Engine / Skill Registry / Rule DSLを作らない。
- PR6のWorkflow E2Eを前倒ししない。

### Definition of Done

- [ ] 6 SkillのSemantic Eval要否が現行Contractに基づいて確定している。
- [ ] 各Skillに、そのSkill責務だけを扱うsemantic rubric / calibration caseがある。
- [ ] rubricはIssue #117の候補dimensionから必要なものだけを使用している。
- [ ] 各criterionがSkillのcanonical contract sourceへtraceできる。
- [ ] deterministic項目をSemantic rubricへ重複実装していない。
- [ ] 各Skillに少なくとも1つのsemantic-pass anchorと1つのsemantic-fail anchorがある。
- [ ] fail anchorは単なる空文・破損文ではなく、構造上はもっともらしいが意味契約を破るcaseである。
- [ ] expected verdict / expected failed assertionはJudge promptへ渡さない。
- [ ] Judge responseはstrict machine-readable schemaでparseし、parse不能をfail-closedに扱う。
- [ ] criterion単位の`pass` / `fail`と短いreason / evidenceを取得できる。
- [ ] Harness側が全required criterionからtrial結果を導出する。
- [ ] canonical runは同一caseを3 trial実行できる。
- [ ] 3/3 PASSを`stable_pass`、3/3 FAILを`stable_fail`、mixedを`unstable`として区別できる。
- [ ] runtime/protocol不成立を`unobservable`として区別できる。
- [ ] canonical calibrationでpass anchorが`stable_pass`、fail anchorが`stable_fail`になることを確認できる。
- [ ] fail anchorで、意図したfailed assertionを各trialで検出できる。
- [ ] evaluator SHA、dataset fingerprint、Codex CLI version、指定model、trial countをresultへ記録できる。
- [ ] source/eval definition validationはLLMなしで再現できる。
- [ ] live judge実行は通常CI必須Gateにしていない。
- [ ] Product Code / Product Runtime / `.codex/agents/**` / Skill routing / Skill descriptionを変更していない。
- [ ] 新規npm dependency / lockfile変更を追加していない。
- [ ] targeted test、deterministic eval validation、`pnpm run verify`が通る。
- [ ] 実装commit後に`git diff --check main...HEAD`が通る。

---

## 2. 現状理解とPR4からの引継ぎ

PR4では、Output Contractをgrader都合で発明しないことを優先し、以下だけをdeterministicに評価した。

- `feature-plan`: canonical template由来required H2 presence
- `exploratory-qa`: 既存`qaFindingsSchema` / `assertCoverageIntegrity`

以下4 Skillはstable machine-readable Output ContractがないためPR4ではN/Aとした。

- `code-review`
- `repair-loop`
- `harness-improvement`
- `android-native-local-validation`

このN/Aは「品質要求がない」という意味ではない。

むしろ、現在の各Skillには次のような**semantic requirement**があり、これがPR5の対象になる。

### `feature-plan`

Canonical source:

```text
.agents/skills/feature-plan/SKILL.md
.agents/skills/feature-plan/references/planning-workflow.md
.agents/skills/feature-plan/assets/plan-template.md
```

PR4ではrequired H2の存在しか評価していない。

PR5では、例えば以下を意味評価する。

- Repository / Issueの事実と矛盾しないstrategyか。
- requestに対して不要な実装や再設計をscopeへ持ち込んでいないか。
- acceptance criteriaが目的と検証可能な形でつながっているか。
- test strategyが主要riskへ対応しているか。
- unknownとimplementation-owned detailを混同していないか。

Heading presence、Markdown whitespace、fence parsingはPR5で再評価しない。

### `code-review`

Canonical source:

```text
.agents/skills/code-review/SKILL.md
.agents/skills/code-review/references/review-workflow.md
```

Meaningful findingは、単にSeverity / Locationという文字列を持つことではなく、変更に起因する具体的risk、evidence、impact、actionabilityが必要になる。

PR5では、代表patchに対して次を評価する。

- 実害のあるregressionを正しく指摘しているか。
- 根拠のないstyle nitやspeculationをfindingへ昇格していないか。
- Evidenceがfindingの主張を支えているか。
- Severity / risk説明が影響と釣り合っているか。
- review-only scopeを越えて修正実装へ進んでいないか。

### `repair-loop`

Canonical source:

```text
.agents/skills/repair-loop/SKILL.md
.agents/skills/repair-loop/references/repair-workflow.md
```

PR5では、Finding setとEvidenceを与えたときの次を評価する。

- highest-impact findingを適切にtriageしているか。
- Evidence未確認の仮定で修正範囲を広げていないか。
- smallest safe fixという境界を守っているか。
- validationが修正したunit / riskへ対応しているか。
- no-progress / unresolved conditionで停止・明示すべきところを無限継続していないか。

実patch適用やiteration executionはPR6のWorkflow E2E責務であり、PR5では実行Engineを作らない。

### `harness-improvement`

Canonical source:

```text
.agents/skills/harness-improvement/SKILL.md
.agents/skills/harness-improvement/references/improvement-workflow.md
```

PR5では、複数runのfriction evidenceとcandidate responseを使い、次を評価する。

- 単発Product bugをHarness問題へ誤分類していないか。
- repeated frictionという根拠があるか。
- proposed changeが再利用可能な摩擦削減につながるか。
- defectを隠す緩和、blanket retry、無根拠timeout延長等になっていないか。
- abstractionのためのabstractionへ拡大していないか。

### `exploratory-qa`

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

PR5ではschemaやCoverage SSOT relationを再実装せず、schema-validであることを前提に次を評価する。

- risk map / charterがmissionと事実に関連しているか。
- observationとhypothesisを分離しているか。
- FindingがEvidence以上の断定をしていないか。
- Product defect / environment / test issueを根拠なく混同していないか。
- 重要riskに対して探索の抜けがないか。

### `android-native-local-validation`

Canonical source:

```text
.agents/skills/android-native-local-validation/SKILL.md
.agents/skills/android-native-local-validation/references/windows-android-workflow.md
```

既存Repository command helperのstage resultはdeterministic側に残す。

PR5では、固定したlog/evidence packetとcandidate summaryを使い、次だけを意味評価する。

- first anomalyと派生errorを分離しているか。
- classificationがEvidenceに整合しているか。
- `TRANSIENT_FAILURE`を根拠なく選んでいないか。
- upstream failure後にdownstreamへ進めていないか。
- retry目的・変更条件・stop conditionが妥当か。
- blocked / not-executedをPASS扱いしていないか。

---

## 3. 実装前preflight

実装開始時にlatest `main`で以下を再確認する。

### 3.1 Dependency確認

- PR #126が引き続きmerge済みである。
- `.agents/skills/feature-plan/scripts/validate-plan-output.ts` が存在する。
- `tests/contracts/skill-output-eval.test.ts` がPR4のdeterministic boundaryを維持している。
- 6 Skillの`SKILL.md` / canonical referenceにmaterial driftがない。

PR2 / PR3はPR5のrequired dependencyではない。

PR2が先にmergeされた場合でも、Trigger selector / Hook判定 / routing scoringをPR5へ流用しない。
低レベルのCodex process executionが安全に共通化済みで、かつsemantic contractを混ぜずに再利用できる場合だけ利用を検討する。共通化自体をPR5の目的にしない。

### 3.2 Judge runtime capability probe

現在`main`の`package.json`にはOpenAI SDK等のLLM provider dependencyがないため、PR5だけのためにprovider SDKを追加しない。

既存Host RuntimeであるCodex CLIをJudge実行に利用する前提とする。

実装前に、source変更を始める前の短いprobeで以下を確認する。

1. `codex --version` が取得できる。
2. `codex exec --json --ephemeral --sandbox read-only` 相当のread-only ephemeral実行が成立する。
3. explicit model指定が可能である。
4. JSON event streamから、terminal stateと最終assistant textを曖昧なconsole regexなしで抽出できる。
5. JSON-only instructionに対してmachine-readable grader responseを取得できる。

このprobeでstable protocolが確認できない場合、stderrや自然文ログをheuristic parseして先へ進まない。

新しいLLM SDK / HTTP client / Repository独自Agent Runtimeへ即座に切り替えるのではなく、PR5 runtimeを`BLOCKED`として記録し、設計判断を分離する。

### 3.3 Direct Contract drift時の扱い

Contract driftがある場合だけ、そのSkillのsemantic classification / rubric dimensionを再評価する。

禁止:

- N/Aを作る/減らすためのRepository-wide再設計。
- Semantic EvalのためのSkill workflow変更。
- rubricに合わせてSkill Contractを変更すること。
- PR4 graderの責務拡張。

---

## 4. Semantic Eval data設計

### 4.1 配置

各Skillの評価データはpackage-localへ置く。

```text
.agents/skills/<skill>/evals/output/semantic.yaml
```

空directoryや共通rubric directoryは作らない。

6 Skill共通で必要なのは、loaderが認識する最小限のevaluation metadataだけとする。

概念上の最小shape:

```yaml
schema_version: 1
skill: feature-plan
rubric:
  - id: FP-CORRECTNESS
    dimension: correctness
    assertion: "..."
    source: "references/planning-workflow.md#..."
cases:
  - id: FP-SEM-001-PASS
    context: |
      ...
    candidate_output: |
      ...
    expected: pass
    expected_failed_assertions: []
```

これは**evaluation data schema**であり、Skill Output schemaではない。

### 4.2 Rubric規則

各rubricは原則3〜5 criterion程度に抑える。

各criterionは以下を満たす。

- 一つの意味判断を表す。
- `dimension`はIssue #117で許可された候補から、そのSkillに必要なものだけ選ぶ。
- `assertion`はpass/fail境界が第三者に分かる具体性を持つ。
- `source`でpackage-local canonical contractへtraceできる。
- formatting preference、文体、語彙の好みを評価しない。
- deterministic validatorで既に強制している項目を含めない。

全Skill共通100点score、weight、global thresholdは作らない。

### 4.3 Calibration case規則

各Skillに最低2 caseを置く。

- 1つの`pass` anchor
- 1つの`fail` anchor

`fail` anchorは「空文字」「意味不明な文章」のような容易すぎるnegativeにしない。

例:

- `code-review`: 実regressionを見落とし、無害なstyle変更だけをHigh findingにする。
- `repair-loop`: 指摘された不具合より広いrefactorを提案し、validation対象もずれる。
- `harness-improvement`: 単発Product bugをHarness timeout延長で隠す。
- `exploratory-qa`: observationから証拠なしにProduct defectを断定する。
- `android-native-local-validation`: first anomalyがdevice disconnectなのに`TRANSIENT_FAILURE`としてblind retryし、後続Suiteへ進む。
- `feature-plan`: Plan-only依頼なのに実装をscopeへ含め、主要riskに対するvalidationがない。

`expected`と`expected_failed_assertions`はHarness-side calibration truthであり、Judge promptへ含めない。

### 4.4 Case self-containment

caseはsemantic判断に必要な事実を`context`へ閉じる。

Product全体や現在のRepository実装をJudgeが追加探索しないと判定できないcaseは避ける。

これにより、Judgeの役割を「与えられたcontract + facts + candidate outputの評価」に限定する。

---

## 5. Evaluator / Runner設計

### 5.1 Pure evaluation module

追加候補:

```text
scripts/evals/skill-semantic-output-evals.ts
```

責務:

- 6 Skillの`semantic.yaml` discovery
- YAML parse / schema validation
- unique skill / case / assertion ID validation
- allowed dimension validation
- rubric source path existence確認
- caseのexpected assertion reference integrity
- canonical serializationによるdataset fingerprint生成
- Judge promptの構築
- Judge JSON responseのstrict parse
- criterion verdictからtrial outcomeを導出
- 複数trialのaggregate outcomeを導出

非責務:

- Codex process起動
- Skill実行
- Repository routing
- Tool hook監視
- Product validation
- Workflow E2E

### 5.2 Judge runner

追加候補:

```text
scripts/evals/run-skill-semantic-output-evals.ts
```

責務:

- CLI引数parse
- `--validate-only`
- `--skill <name>` / `--case <id>`による絞り込み
- live run時の`--model <explicit-model>`必須化
- live run時の`--output <path>`必須化
- canonical `--trials 3`
- `codex --version`取得
- Codex CLI Judge processのsequential実行
- timeout / process / protocol状態の記録
- normalized result JSON出力

### 5.3 Judge isolation

JudgeはRepositoryを調査するAgentとして動かさない。

Judge promptには次だけを渡す。

1. evaluation instruction
2. 対象Skill名
3. rubric assertions
4. case context
5. candidate output
6. required JSON result schema

`expected` / `expected_failed_assertions`は絶対に渡さない。

可能ならCodex CLIは一時的な空のworking directoryでread-only / ephemeral実行し、JudgeがEvaluator Repository内のanswer metadataへアクセスできないようにする。

CLIがGit working treeを必須とする場合は、一時directoryへ最小の空Git working treeを作る。Repository sourceやeval filesをcopyしない。

Judge isolationを成立させるために独自Agent Runtimeを作らない。

### 5.4 Judge response contract

Judgeにはraw JSONだけを要求する。

概念shape:

```json
{
  "schema_version": 1,
  "case_id": "FP-SEM-001-PASS",
  "criteria": [
    {
      "id": "FP-CORRECTNESS",
      "verdict": "pass",
      "reason": "...",
      "evidence": "..."
    }
  ]
}
```

Harnessが検証するもの:

- top-level object / schema version
- case ID一致
- rubric criterionがmissing / duplicate / unknownでない
- verdictが`pass | fail`のみ
- reason / evidenceが空でない

Judgeにoverall scoreを返させない。

Harness側で、**全criterionがPASSならtrial PASS、1つでもFAILならtrial FAIL**とする。

### 5.5 Trial aggregation

canonical runは3 trialとする。

case outcome:

```text
3 PASS                -> stable_pass
3 FAIL                -> stable_fail
PASS/FAIL mixed       -> unstable
runtime/protocol欠落  -> unobservable
```

`unstable`を2/3 majorityでPASSへ変換しない。

calibration expected:

- pass anchor -> `stable_pass`
- fail anchor -> `stable_fail`
- fail anchorの`expected_failed_assertions` -> 全3 trialでFAIL検出

これを満たさないcaseはSemantic Eval calibration failureとして扱う。

### 5.6 Provenance

live resultには最低限以下を記録する。

```text
schema_version
evaluator_git_sha
dataset_sha256
codex_version
model
trial_count
executed_at
case_id
trial outcomes
criterion verdicts
aggregate outcome
calibration match
```

modelを`unreported`のままcanonical evidenceへ昇格しない。

model名はhard-codeせず、canonical run時に明示指定して記録する。

---

## 6. 実装時の変更ファイル

基本構成:

```text
.agents/skills/android-native-local-validation/evals/output/semantic.yaml
.agents/skills/code-review/evals/output/semantic.yaml
.agents/skills/exploratory-qa/evals/output/semantic.yaml
.agents/skills/feature-plan/evals/output/semantic.yaml
.agents/skills/harness-improvement/evals/output/semantic.yaml
.agents/skills/repair-loop/evals/output/semantic.yaml
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
.agents/skills/feature-plan/scripts/validate-plan-output.ts
tests/contracts/skill-output-eval.test.ts
.github/workflows/**
pnpm-lock.yaml
.codex/agents/**
Product Code
```

### package scripts

候補:

```json
{
  "eval:skills:semantic:validate": "tsx scripts/evals/run-skill-semantic-output-evals.ts --validate-only",
  "eval:skills:semantic": "tsx scripts/evals/run-skill-semantic-output-evals.ts"
}
```

`eval:skills:semantic:validate`はLLMを呼ばず、通常の`verify`へ接続する。

`eval:skills:semantic`はLLMを呼ぶため通常CIへ接続しない。

---

## 7. 実装手順

### Phase 0 — preflight / protocol probe

1. latest `main`とPR4 merge状態を確認する。
2. 6 Skillのcanonical semantic contractを再確認する。
3. PR4 deterministic boundaryにdriftがないことを確認する。
4. Codex CLI version / explicit model / read-only ephemeral / JSON terminal responseをprobeする。
5. stable final assistant payloadがmachine-readableに取得できることを確認する。
6. probe結果が不成立ならheuristic parserを足さずBLOCKEDにする。

### Phase 1 — Eval data

1. 6 Skillに`evals/output/semantic.yaml`を追加する。
2. Skillごとのrubricを3〜5 assertion程度で定義する。
3. 各assertionをcanonical referenceへtraceさせる。
4. pass / fail anchorを1件ずつ定義する。
5. fail anchorの期待failed assertionを明示する。
6. deterministic項目がrubricへ混入していないことをreviewする。

### Phase 2 — Pure evaluator

1. YAML loader / schema validationを実装する。
2. duplicate / unknown / dangling referenceをfail-closedにする。
3. dataset fingerprintをdeterministicに生成する。
4. expected metadataを除外したJudge prompt builderを実装する。
5. Judge response parserをstrictに実装する。
6. trial / aggregate outcomeをpure functionとして実装する。

### Phase 3 — Judge runner

1. `--validate-only`を実装する。
2. `--model` / `--trials` / `--skill` / `--case` / `--output`を実装する。
3. Judge用一時workspaceを作り、Evaluator sourceを見せない。
4. Codexをread-only / ephemeralでsequential実行する。
5. stdout event protocolからtrusted final textだけを抽出する。
6. timeout / spawn / terminal / parse failureを`unobservable`として保持する。
7. resultへprovenanceを付ける。
8. 自動retryを実装しない。

### Phase 4 — Deterministic contract tests

1. 6 dataset discoveryを確認する。
2. duplicate case / assertion ID rejectionを確認する。
3. unsupported dimension rejectionを確認する。
4. missing rubric source rejectionを確認する。
5. unknown expected assertion rejectionを確認する。
6. expected metadataがJudge promptへ含まれないことを確認する。
7. valid Judge response parseを確認する。
8. missing / duplicate / unknown criterion response rejectionを確認する。
9. malformed JSONを`unobservable`へ落とす境界を確認する。
10. `stable_pass` / `stable_fail` / `unstable` / `unobservable` aggregationを確認する。
11. dataset fingerprintが同じinputで安定することを確認する。

### Phase 5 — Canonical semantic calibration

source実装をcommitした後、そのcommitをEvaluator SHAとして固定する。

1. deterministic validationをPASSさせる。
2. explicit modelを指定する。
3. 全12 anchorを3 trialずつsequential実行する。
4. pass anchorsが`stable_pass`になることを確認する。
5. fail anchorsが`stable_fail`になることを確認する。
6. fail anchorの期待failed assertionが全trialで検出されることを確認する。
7. `unstable` / `unobservable`が1件でもあればcanonical calibrationをPASS扱いしない。
8. rubricをmodel出力へ都合よく合わせるのではなく、まずcase ambiguity / prompt protocol / contract traceabilityを確認する。
9. official resultをRun Artifactとして保存する場合はRepository sanitizerを通す。

### Phase 6 — Full validation / scope audit

1. targeted repository-contract test
2. semantic dataset validate-only
3. `validate:skills`
4. `pnpm run verify`
5. `git diff --check main...HEAD`
6. changed file inventory
7. Product / dependency / workflow / `.codex/agents/**` driftなし確認

---

## 8. Test strategy

### Deterministic tests

LLMなしで必ず再現可能な部分をRepository Contract Testで固定する。

重点:

- Dataset schema
- Skill / case / assertion ID integrity
- dimension allowlist
- canonical source link
- Judge prompt leakage防止
- Judge result schema
- aggregation semantics
- fingerprint
- malformed result fail-closed

### Live semantic calibration

LLM trialはunit testではなくexplicit eval runとして扱う。

必須条件:

- exact model記録
- same dataset fingerprint
- same evaluator SHA
- 3 trials
- sequential
- retryなし
- raw expected label非提示
- all anchor calibration stable

### なぜlive evalを通常CIへ入れないか

- external model/runtime可用性へ依存する。
- latency / quota / model更新で通常PR gateが不安定になる。
- Semantic Evalは「強制」ではなく「評価・回帰検知」の責務である。

その代わり、dataset / rubric / parser / aggregationのdeterministic integrityは通常`verify`で壊れないようにする。

---

## 9. Validation commands

実装後の最低限:

```bash
pnpm exec vitest run tests/repository-contract/skill-semantic-output-evals.test.ts --no-file-parallelism --maxWorkers=1
pnpm run eval:skills:semantic:validate
pnpm run validate:skills
pnpm run verify
```

canonical semantic runの形:

```bash
pnpm run eval:skills:semantic -- \
  --model <explicit-model> \
  --trials 3 \
  --output <repo-relative-run-artifact-path>
```

Windows PowerShellではshell syntaxに合わせて同じ引数を渡す。

実装commit後:

```bash
git diff --check main...HEAD
```

changed filesについて、以下がないことを確認する。

```text
Product Code変更
Product Runtime変更
Skill description / routing変更
PR4 deterministic contract変更
.github/workflows/**変更
.codex/agents/**変更
新規dependency / pnpm-lock.yaml変更
```

---

## 10. Scope

### Included

- 6 SkillのSemantic Eval要否棚卸し
- Skill-specific semantic rubric
- pass / fail calibration anchor
- deterministic eval data validation
- LLM Judge prompt / response contract
- Codex CLIを使ったexplicit semantic judge runner
- 3-trial stability classification
- provenance / result JSON
- deterministic repository contract test
- validate-only command
- live semantic calibration

### Excluded

- Skill description最適化
- Trigger Eval変更
- PR2 dataset / selector / hook logic変更
- PR4 deterministic grader拡張
- Skill Workflow semantic redesign
- Product Code / Product Test変更
- actual repair / harness modificationの実行評価
- Native Build / Install / Maestroの実実行
- multi-Skill handoff
- Workflow E2E
- provider SDK追加
- Embedding / vector similarity
- Golden全文一致
- 100点score
- cross-Skill common rubric
- Repository独自Agent Runtime / Workflow Engine
- live Semantic EvalのRequired CI化

実Skill実行・複数Skill handoff・Artifact再利用はPR6で扱う。

---

## 11. Risks and rollback

### Risk 1 — LLM Judge自体が不安定

対策:

- canonical 3 trial
- mixedを`unstable`
- majority voteでPASSへ丸めない
- strong pass / plausible fail anchorでcalibration
- model / Codex version / dataset fingerprintを記録

### Risk 2 — Rubricがdeterministic contractを重複する

対策:

- 各criterionにcanonical sourceを持たせる。
- PR4 test / validatorと照合する。
- formatting / field existence / schema ruleはSemantic rubricから除外する。

### Risk 3 — Judgeがexpected answerを読む

対策:

- expected metadataをprompt builderから構造的に除外する。
- JudgeはEvaluator Repositoryを見せない一時workspaceで実行する。
- case facts / rubric / candidate outputだけをstdinで渡す。

### Risk 4 — 評価基盤が独自Agent Runtime化する

対策:

- PR5 runnerはJudge invocationだけ。
- Skill routing、tool orchestration、workflow executionを持たない。
- actual Skill executionはPR6へ送る。

### Risk 5 — Rubricが過度に抽象的で何でもPASSする

対策:

- assertionごとにpass/fail境界を具体化する。
- plausible negative anchorを置く。
- expected failed assertionまでcalibrationする。

### Rollback

PR5はProduct behaviorへ接続しない。

問題があれば以下を削除/戻すことで独立してrollbackできる。

```text
.agents/skills/*/evals/output/semantic.yaml
scripts/evals/skill-semantic-output-evals.ts
scripts/evals/run-skill-semantic-output-evals.ts
tests/repository-contract/skill-semantic-output-evals.test.ts
package.jsonのsemantic eval scripts / verify接続
```

PR4 deterministic graderやProduct Runtimeへrollback影響を与えない。

---

## 12. Shippability

PR5単体でレビュー可能な完成状態は次とする。

1. Semantic rubric / calibration dataが6 Skill分存在する。
2. deterministic validator / testsがPASSする。
3. live Judgeで3-trial calibrationが成立する。
4. resultに再現性判断に必要なprovenanceが残る。
5. PR4 deterministic boundaryを壊していない。
6. PR6なしでも「candidate outputを意味評価するgrader」として独立して利用できる。
7. actual Workflow executionをPR5へ持ち込んでいない。

PR6はこのSemantic graderを必要なSkill Outputの評価componentとして再利用できるが、PR5側からPR6の実行Engineを先取りしない。

---

## 13. Open questions and assumptions

### 固定Assumptions

- PR4はPR5の直接dependencyであり、merge済み`main`を基点とする。
- PR2 / PR3はPR5のrequired dependencyではない。
- 現行6 Skillにはすべてsemantic judgment対象が存在する。
- LLM provider SDKは追加しない。
- Codex CLIを既存Host Runtimeとして利用する。
- canonical semantic calibrationではmodelを明示指定する。
- live semantic evalは通常CI必須Gateにしない。
- PR6がactual Skill execution / Workflow E2Eを担当する。

### 実装時にprobeで確定する項目

- 現行Codex CLIでtrusted final assistant textを取得する正確なJSON event shape。
- explicit model指定の正確なCLI引数。
- Judge用空workspaceで必要な最小Git/preflight条件。
- canonical runに採用する具体的model名。

これらは現在のCLI capabilityに依存するため、Planで推測してhard-codeしない。

probeで確認後、確認した現行仕様だけを実装へ反映する。

---

## 14. 今回Plan-onlyで行わないこと

このcommitでは本Planファイルだけを追加する。

以下はまだ行わない。

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
