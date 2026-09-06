# Issue #117 PR4 — Deterministic Output Eval

## 0. 依頼概要

- 対象: Issue #117 の PR4「Deterministic Output Eval」。
- 目的: 6つの Agent Skill の Output について、人間判断や LLM Judge を使わず、**既存 Contract 上で安全に機械判定できる品質だけ**を deterministic に検証できるようにする。
- 前提: PR1（Skill package 構造整理・Portability対応）は merge 済み。
- この branch ではこの Plan を正本として後続実装する。
- Plan 修正時点では実装しない。grader、test、fixture、CI、Skill本文、Product Codeは変更しない。

---

## 1. ゴール / 完了条件

### ゴール

既存 Skill Output Contract を evaluator の都合で変更せず、既に存在する stable serialization / canonical template / Machine Contract だけを利用して deterministic Output Eval を実装する。

PR4で重要なのは、6 Skillすべてへ grader を作ることではない。

重要なのは次の3点である。

1. 6 Skillすべてについて deterministic evaluation の適用可否と理由を明示する。
2. 既存 validator / schema があるものは直接再利用する。
3. stable serialization がないものは、grader のために新しい Output 形式を発明せず N/A とする。

### 6 Skillの固定分類

この表をPR4の分類判断の正本とする。

| Skill | PR4分類 | 実装方針 |
| --- | --- | --- |
| `feature-plan` | `minimal grader` | canonical plan template の required H2 presenceだけを検証 |
| `code-review` | `N/A` | stable serialized Output Contractがないためgraderを作らない |
| `repair-loop` | `N/A` | iteration semanticsはあるがimplemented Output schemaがないためgraderを作らない |
| `harness-improvement` | `N/A` | candidate semanticsはあるがstable serialized artifact / validatorがないためgraderを作らない |
| `exploratory-qa` | `existing-validator reuse` | `qaFindingsSchema` / `assertCoverageIntegrity` を直接再利用 |
| `android-native-local-validation` | `N/A` | execution gatesはあるがSkill Output全体のstable result schemaがないためgraderを作らない |

この分類はPlan時点で確定する。

**実装側に同じclassification table / inventoryを作らない。**

理由:

- static classificationをstatic testで再検証してもOutput品質評価にはならない。
- Planとtestの二重管理を避ける。
- Issue #117の「6 Skillの機械評価可能範囲」「N/A理由」はこのPlanで明示する。
- 実装testは評価可能な2 Skillのdeterministic behaviorだけを検証する。

### 必須原則

- Output全文のexact matchを使わない。
- LLM Judge、Embedding、Semantic similarityを使わない。
- evaluator都合の新しいProduction Output schema / Markdown label / serializationを作らない。
- semantic requirementとmachine-parseable serializationを混同しない。
- 既存Machine Contractのschema / enum / regex / relationをコピーしない。
- 既存validatorを直接呼べる場合はadapterを作らない。
- 6 Skill共通result schemaを作らない。
- common Rule Engine、DSL、Plugin Framework、runtime registryを作らない。
- generic Markdown parserを作らない。
- static fixture fileは必要な場合だけとし、本PRでは原則作らない。
- PR4専用CLI、package script、GitHub Actions workflowを作らない。
- Trigger Eval、description optimization、Semantic Eval、Workflow E2Eを前倒ししない。

### Definition of Done

- [ ] 6 Skillすべての分類とN/A理由がこのPlanで明示されている。
- [ ] 実装側にclassification table / inventoryを重複実装していない。
- [ ] 新規graderは `feature-plan` の1つだけである。
- [ ] `exploratory-qa` は既存Machine Contractを直接再利用する。
- [ ] `feature-plan` でrequired H2 omissionを検出できる。
- [ ] required H2はcolumn 1の `## ` だけを認識し、leading space付きheadingをrequired H2扱いしない。
- [ ] LF / CRLFの双方でline parsingが安定する。
- [ ] fenced code block内だけにあるrequired H2を存在扱いしない。
- [ ] backtick / tilde fenceの双方を扱う。
- [ ] fence openerは0〜3 space + 3文字以上の同一marker + optional info stringを扱う。
- [ ] fence closerは0〜3 space + openerと同じmarker + opener以上の長さ + trailing space/tabのみを扱う。
- [ ] openerより短い同一marker行をcloserと誤認しない。
- [ ] non-whitespace suffixを持つmarker行をcloserと誤認しない。
- [ ] canonical templateからrequired H2を0件しか取得できない場合はvacuous PASSせずconfiguration errorで停止する。
- [ ] `feature-plan` graderは `{ valid, missingHeadings }` のmachine-readable structured resultを返す。
- [ ] `exploratory-qa` valid Normal-mode Findings inputが `qaFindingsSchema.safeParse` を通る。
- [ ] valid Normal-mode Coverageはsuccessful parse後の `parsed.data.coverage` を使って `assertCoverageIntegrity` を通る。
- [ ] `run_id` omissionを `qaFindingsSchema.safeParse` が拒否し、Zod issue pathで確認できる。
- [ ] Coverage SSOTとOutput Coverageの不一致を `assertCoverageIntegrity` が `coverage.items does not match the Coverage SSOT` で拒否する。
- [ ] `assertCoverageIntegrity` をmachine-readable化するだけのwrapperを作っていない。
- [ ] Finding ID uniqueness / `duplicate_of` target existence等、既存Machine Contractにないruleを新設していない。
- [ ] new static `evals/output/**` fixtureを作っていない。
- [ ] `package.json` / workflow / dependency / lockfileを変更していない。
- [ ] Product Code / Product Runtime / `.codex/agents/**` を変更していない。
- [ ] targeted test、`pnpm run verify`、`git diff --check main...HEAD` が通る。

---

## 2. 現状理解と前提

### `feature-plan`

Canonical source:

```text
.agents/skills/feature-plan/SKILL.md
.agents/skills/feature-plan/assets/plan-template.md
.agents/skills/feature-plan/references/planning-workflow.md
```

`SKILL.md` は package-local `assets/plan-template.md` を reusable output skeleton として使うことを明示している。

そのため、canonical template の top-level section H2 は deterministic に評価できる。

一方、template本文にはplaceholder自体が存在するため、次はPR4で評価しない。

- body non-empty
- placeholder completion
- semantic completeness
- validation planの質
- riskの質
- technical correctness

また、templateにheadingが1回ずつ存在していても、heading uniquenessを要求する明示Contractはないため重複禁止ruleを作らない。

PR4で評価するのは**canonical template由来required H2がfence外に存在することだけ**とする。

### `code-review`

FindingにはSeverity / Location / Evidence等のsemantic requirementsがある。

しかし通常Outputについて固定JSON schema、固定Markdown label、canonical serializationがない。

`Severity:` 等をgrader都合で必須化すると新しいOutput formatになるためN/Aとする。

### `repair-loop`

Iteration field / stop relationは意味上定義されているが、current Repository evaluation contractはimplemented Output schemaではなくcontract exampleである。

PR4でiteration serializationを作らない。

### `harness-improvement`

Candidate modelは意味上定義されているが、stable machine-readable candidate artifact / validatorがない。

PR4でcandidate serializationやtaxonomy validatorを作らない。

### `exploratory-qa`

Canonical portable source:

```text
.agents/skills/exploratory-qa/SKILL.md
.agents/skills/exploratory-qa/references/workflow.md
.agents/skills/exploratory-qa/references/scored-mode.md
```

Repository-side Machine Contract:

```text
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/coverage.ts
```

WorkflowはRepository-defined candidate findings artifactをfinal Outputとして扱う。

既存実装には以下が存在する。

```text
qaFindingsSchema
coverageResultSchema
assertCoverageIntegrity
```

`qaFindingsSchema` は Findings artifact のshape、required fields、内包されるCoverage Result shapeを検証する。

`assertCoverageIntegrity` はCharter / Challenge由来Coverage SSOTとOutput Coverageのrelationを検証する。

PR4では `qaFindingsSchema` と `assertCoverageIntegrity` だけを直接扱う。

`coverageResultSchema` は `qaFindingsSchema` に内包されているため、個別testを必須にしない。

#### PR4で追加しないfinding relation

Current `findingSchema` は次の形式Contractを持つ。

```text
finding_id   -> FIND-[0-9]{3}
duplicate_of -> FIND-[0-9]{3} | null
```

しかしcurrent `qaFindingsSchema` には、少なくともPR4で直接再利用できる形では次のcross-reference ruleが存在しない。

- findings配列全体の `finding_id` uniqueness
- `duplicate_of` が実在Findingを指すこと

Issue #117でID uniqueness / reference integrityが候補に含まれていても、PR4都合でこれらを新設しない。

既存authoritative Machine Contractがないruleを新設すると、Output EvalではなくOutput Contract変更になるためである。

### `android-native-local-validation`

Workflow / PowerShell helperにはDoctor / Build / Install / Smoke / Test等のdeterministic gateがある。

一方、Skill Output全体を表すstable stage-result schemaはない。

新しいNative result schemaをgrader都合で作らない。

### Assumptions

- 新規dependencyは不要。
- TypeScript / Node.js / Zod / Vitestの既存構成で実装できる。
- `feature-plan` はlocal `{ valid, missingHeadings }` をmachine-readable経路とする。
- `exploratory-qa` は `qaFindingsSchema.safeParse` のresult / issuesをmachine-readable経路とする。
- `assertCoverageIntegrity` はthrowing relation validatorのまま追加チェックとして使う。
- fixtureはtest inputを意味し、専用fixture fileを必須にしない。

---

## 3. 実装前preflight

### 目的

Phase 0は再調査ではなく、**Plan作成後にlatest `main` で直接Contractが変わっていないかを確認する工程**とする。

current branch上の古いsnapshotだけを見て「driftなし」と判断しない。

### latest `main` と比較する直接Contract

実装開始時にlatest `main`の次だけ確認し、Plan前提と比較する。

```text
.agents/skills/feature-plan/SKILL.md
.agents/skills/feature-plan/assets/plan-template.md
.agents/skills/exploratory-qa/SKILL.md
.agents/skills/exploratory-qa/references/workflow.md
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/coverage.ts
```

N/A 4 Skillについては、各Skillの直接Output Contract sourceだけを確認し、stable machine-readable Output schemaが追加されていないかを見る。

確認事項:

- `feature-plan/SKILL.md` が引き続き package-local template を reusable output skeleton として参照している。
- `plan-template.md` のH2が引き続きcanonical section skeletonである。
- `exploratory-qa` workflowが引き続きRepository-defined findings artifactをOutputとして扱っている。
- `qaFindingsSchema` / `assertCoverageIntegrity` が引き続き存在する。
- N/A 4 Skillにstable machine-readable Output schemaが追加されていない。

前提が変わっていなければ固定分類をそのまま実装する。

前提が変わっていた場合だけ、そのSkillの直接Contractを確認し分類を再評価する。

禁止:

- N/Aを減らすためのRepository-wide探索。
- 別用途artifactをSkill Output Contractへ昇格すること。
- serializationを推測してgraderを作ること。
- unrelatedなlatest `main`変更を理由にscopeを広げること。

---

## 4. 実装時の変更ファイル

基本構成は次の2ファイルだけとする。

```text
.agents/skills/feature-plan/scripts/validate-plan-output.ts
tests/contracts/skill-output-eval.test.ts
```

`tests/contracts/skill-output-eval.test.ts` は、分類inventoryではなく**評価可能な2 Skillのdeterministic behavior testだけ**を持つ。

### 原則変更しない領域

```text
.agents/skills/*/evals/output/**
scripts/skill-output-eval/**
package.json
pnpm-lock.yaml
.github/workflows/**
.codex/agents/**
```

Product source / Runtime behaviorも変更しない。

---

## 5. 実装方針

### Phase 1: `feature-plan` minimal grader

#### 実装ファイル

```text
.agents/skills/feature-plan/scripts/validate-plan-output.ts
```

#### Public API

filesystem I/Oを持たないpure functionに固定する。

```ts
validatePlanOutput(
  templateMarkdown: string,
  outputMarkdown: string,
): {
  valid: boolean;
  missingHeadings: string[];
}
```

責務:

- `templateMarkdown` からrequired H2を抽出する。
- `outputMarkdown` からfence外H2を抽出する。
- canonical required H2のうち存在しないheadingだけを `missingHeadings` として返す。
- `valid` は `missingHeadings.length === 0` と一致させる。

持たせない責務:

- filesystem read
- Repository path解決
- CLI
- log出力
- template location hard-code
- rule taxonomy
- issue object abstraction

このgraderはrequired heading omissionしか扱わないため、`issues: [{ rule, path }]` のような将来拡張前提のresult shapeは作らない。

#### Line splitting

LF / CRLFの双方を同じline列として扱う。

実装は次相当に固定する。

```ts
const lines = markdown.split(/\r?\n/);
```

行末の `\r` がfence closer判定やheading比較へ残る実装にしない。

CR-only改行まで対応するための追加parserは作らない。

#### Required H2

required heading listはhard-codeしない。

canonical sourceは既存:

```text
.agents/skills/feature-plan/assets/plan-template.md
```

required H2候補は、fence外かつ**column 1から `## ` で始まる行だけ**とする。

つまり次はrequired H2として認識する。

```text
## 6. 検証方法
```

次は認識しない。

```text
 ## 6. 検証方法
   ## 6. 検証方法
```

0〜3個のleading space許容はfence delimiterにだけ適用し、headingには適用しない。

H1は対象外。

headingは行全体の文字列完全一致で扱う。

alias / fuzzy matching / normalizationは行わない。

#### Empty-required guard

canonical templateからrequired H2を0件しか抽出できない場合、Output validationを実行しない。

```ts
throw new Error("canonical plan template has no required level-2 headings");
```

message全文をRepository-wide contractにはしないが、testではconfiguration errorとしてthrowすることを確認する。

required heading件数や具体的heading名はhard-codeしない。

#### Fence parserの最小仕様

full Markdown parserを作らず、line-by-line stateだけを持つ。

##### Opener

fence openerとして認識する条件:

1. 行頭0〜3個のspaceを許容する。
2. その後に同じmarkerの連続が3文字以上ある。
3. markerはbacktick `` ` `` またはtilde `~`。
4. marker列の後ろにはinfo stringを許容する。

例:

````text
```text
~~~json
   ```ts
````

上記はすべてopenerとして認識する。

##### Closer

fence closerとして認識する条件:

1. 行頭0〜3個のspaceを許容する。
2. openerと同じmarker characterを使う。
3. marker数はopener以上。
4. marker列の後ろはspace / tabのみ許容する。
5. marker列の後ろにinfo string相当の非空文字列がある行はcloser扱いしない。

##### 意図的に対応しないもの

- 4個以上space indentされたfence解釈。
- nested fence完全互換。
- CommonMark完全実装。
- indented code block parsing。
- Markdown AST。
- new parser dependency。

PR4の目的はrequired heading false-pass防止であり、Markdown parser開発ではない。

#### Output validation rule

Output側で評価するのは次だけ。

```text
canonical required H2がfence外に少なくとも1回存在すること
```

評価しない:

- duplicate heading
- heading order
- body presence
- placeholder completion
- paragraph count
- semantic completeness
- technical correctness

#### Result

valid:

```json
{
  "valid": true,
  "missingHeadings": []
}
```

invalid:

```json
{
  "valid": false,
  "missingHeadings": [
    "## 6. 検証方法"
  ]
}
```

追加しないfield:

- issues
- rule
- path
- schema_version
- timestamp
- grader_version
- metrics
- global check id

---

### Phase 2: `feature-plan` contract tests

static fixture fileは作らない。

canonical `plan-template.md` をtest側でreadする。

#### Test A: valid canonical template

```text
templateMarkdown = canonical template
outputMarkdown   = canonical template
```

期待:

```text
valid = true
missingHeadings = []
```

このtestはstructure validityだけを検証する。

canonical template本文のplaceholderが埋まっていることまでは意味しない。

#### Test B: required H2 omission

canonical templateからrequired H2を1つだけ除去する。

期待:

- `valid: false`
- `missingHeadings` が除去したheadingだけを含む

#### Test C: fenced-heading false-pass prevention

canonical templateからrequired H2を1つ通常位置から除去し、同じheadingをfenced code block内にだけ置く。

backtick / tildeの双方をparameterized testで確認する。

backtickケースでは、**4文字backtick opener**を使い、以下を1ケース内でまとめて確認する。

- test inputの行区切りは `\r\n` とし、CRLFでも同じ判定になることを確認する。
- info string付きopener。
- 0〜3 spaceのindent。
- openerより短い3文字backtick行はcloserではない。
- openerと同じ4文字backtickでも、non-whitespace suffixがあればcloserではない。
- openerと同じ4文字backtick + trailing whitespaceのみの行で初めてcloseする。

概念例:

`````text
   ````text
   ```
   ````not-a-closing-fence
## 6. 検証方法
   ````
`````

実testでは上記各行を `\r\n` で連結する。

上記では、3文字backtick行と ` ````not-a-closing-fence` のどちらもcloser扱いしてはいけないため、required H2は最後の4文字closerまでfence内に留まる。

tildeケース:

````text
~~~text
## 6. 検証方法
~~~
````

期待:

```text
valid = false
missingHeadings = [対象heading]
```

fence内headingをrequired sectionとして数えない。

backtick用 / tilde用のstatic fixture fileは増やさない。

#### Test D: canonical template configuration guard

H2を持たない `templateMarkdown` を渡す。

期待:

- `validatePlanOutput` がthrowする。
- empty required setでPASSしない。

#### Test D-2: leading-space H2はrequired headingとして扱わない

新しいstatic fixtureは作らない。

小さいinline inputで、column 1ではない `## ` 行をrequired H2として抽出しないことを確認する。

例えばH2を持たないtemplateへ次だけを置いても、required H2 0件としてconfiguration errorになることを確認する。

```text
 ## 6. 検証方法
```

このtestはCommonMark互換性を広げるためではなく、Planで固定したcolumn-1-only ruleの回帰防止だけを目的とする。

---

### Phase 3: `exploratory-qa` existing validator reuse

新しいgrader / adapter / wrapperは作らない。

直接import / callするもの:

```text
qaFindingsSchema
assertCoverageIntegrity
```

#### Representative fixtureはNormal modeに固定

PR4のcontract testではNormal modeだけを代表入力として使う。

理由:

- Normalはworkflowのdefault mode。
- Gray-box / Black-box Scoredまでfixture化するとrunner profile / isolation / benchmark等のsupporting harness contractへ範囲が広がる。
- `qaFindingsSchema` 自体は3 mode unionなので、既存schema全体をPR4で再テストする必要はない。

#### Minimal valid Normal-mode object

以下をtest内の小さいbuilderまたはliteralで作る。

```text
schema_version: 1
run_id: 20260906-000001-JST
source_head_sha: null
mode: normal
charter_id: CHARTER-001
challenge_id: null
benchmark_revision: null
runtime_variant_id: null
runner_profile: null
working_tree_snapshot:
  before: .artifacts/agentic-qa/20260906-000001-JST/before.json
  after: .artifacts/agentic-qa/20260906-000001-JST/after.json
  comparison: .artifacts/agentic-qa/20260906-000001-JST/comparison.json
coverage:
  required_ids:
    - COV-001
  items:
    - coverage_id: COV-001
      status: not_completed
      mission_completed: false
      evidence_refs: []
      evidence_types: []
      blocker_reason: null
      notes: ""
findings: []
```

この入力を巨大なScored fixtureへ発展させない。

既存small builderが本当にそのまま再利用できる場合だけ再利用してよい。

再利用のためのhelper refactorが必要なら、test内literalの方を選ぶ。

#### Coverage SSOT source object

`assertCoverageIntegrity` に渡す `expectedSource` はfull Charter / Challenge fixtureを作らず、`required_coverage` だけを持つ最小objectにする。

具体値は次に固定する。

```text
required_coverage:
  - coverage_id: COV-001
    mission: representative mission
    role: customer
    seed: default
    platform: web
    viewport_or_device: desktop
    required_evidence_types:
      - screenshot
```

これ以上のCharter fieldを追加しない。

`expectedSource` は `assertCoverageIntegrity` の既存parameter typeを満たす範囲で型付けし、広いcast、新helper、新schemaは作らない。

#### Test E: valid schema + valid Coverage relation

上記minimal Normal inputを次で評価する。

```ts
const parsed = qaFindingsSchema.safeParse(input);
```

期待:

```text
parsed.success = true
```

これを `exploratory-qa` のmachine-readable評価経路とする。

successful parse後はraw `input.coverage` ではなく、**Zodで型が確定した `parsed.data.coverage`** をrelation validatorへ渡す。

概念例:

```ts
const parsed = qaFindingsSchema.safeParse(input);
expect(parsed.success).toBe(true);
if (!parsed.success) return;

assertCoverageIntegrity(expectedSource, parsed.data.coverage);
```

期待:

- throwしない。

raw inputを直接渡すためのcastや追加type annotationを作らない。

#### Test F: required field omission

上記valid inputから `run_id` だけを除外したobjectを作る。

作り方はtest実装上もっとも単純な方法を選んでよい。cast回避やhelper抽出自体を目的にしない。

評価:

```ts
qaFindingsSchema.safeParse(withoutRunId)
```

期待:

```text
success = false
```

Zod issueの `path` に `run_id` が含まれることを確認する。

human-readable message全文はassertしない。

#### Test G: Coverage SSOT mismatch

Test Eでsuccessful parseした `parsed.data.coverage` を基準に、actual Coverageの次だけ変更する。

```text
coverage.required_ids = ["COV-001"]
coverage.items[0].coverage_id = "COV-999"
```

つまり、valid schemaを通過したCoverageからitem IDだけを意図的に壊す。

`assertCoverageIntegrity(expectedSource, actualCoverage)` を直接呼ぶ。

期待:

- `coverage.items does not match the Coverage SSOT` をthrowする。
- `toThrow("coverage.items does not match the Coverage SSOT")` 相当で、COV-999 mismatchという狙った理由で拒否されたことを確認する。
- 単なる `toThrow()` だけにはしない。

このerror assertionはPR4独自resultへの変換ではなく、既存validatorが**意図したrelation failureで落ちたこと**を確認するために使う。

#### `coverageResultSchema` の個別test

追加しない。

`qaFindingsSchema` に内包されており、既存contract testも存在するため、PR4でstatus relation matrixを再テストしない。

#### Findings ID / reference integrityを新設しない

次のgrader / helperを作らない。

```text
validateFindingIds
validateDuplicateReferences
validateFindingReferences
```

既存Machine Contractにないcross-reference ruleをPR4で新設しない。

---

### Phase 4: N/A 4 Skill

このPlanのclassification tableへ理由を残すだけとする。

実装側にN/A inventory / fixture / testを追加しない。

#### `code-review`

```text
N/A: semantic review fields exist, but there is no stable machine-readable or fixed Markdown serialization. PR4 will not invent one.
```

#### `repair-loop`

```text
N/A: deterministic iteration relations exist, but the current Repository evaluation contract is a contract example rather than an implemented output schema. PR4 will not create serialization solely for grading.
```

#### `harness-improvement`

```text
N/A: candidate semantics exist, but there is no stable machine-readable candidate artifact / validator. PR4 will not create one.
```

#### `android-native-local-validation`

```text
N/A: deterministic execution gates exist, but there is no stable machine-readable Skill Output schema for stage results. PR4 will not introduce one.
```

作らないもの:

- N/A Skill grader
- N/A fixture
- N/A classification test
- empty `evals/` directory
- placeholder parser

---

## 6. 検証方法

### Targeted

```bash
pnpm exec vitest run tests/contracts/skill-output-eval.test.ts --no-file-parallelism --maxWorkers=1
```

確認内容:

`feature-plan`:

- canonical template valid -> `missingHeadings = []`。
- required H2 omission -> `missingHeadings` に対象heading。
- column 1の `## ` だけをrequired H2として扱う。
- LF / CRLFの双方でline parsingが安定する。
- 4文字backtick opener + info string + 0〜3 spaceでfalse-passしない。
- openerより短い3文字backtick行をcloserと誤認しない。
- non-whitespace suffixを持つ4文字backtick行をcloserと誤認しない。
- tilde fence + info stringでfalse-passしない。
- empty required H2 guard。

`exploratory-qa`:

- Normal-mode `qaFindingsSchema.safeParse` success。
- successful parse後の `parsed.data.coverage` が `assertCoverageIntegrity` を通る。
- `run_id` omission failure / Zod path。
- parsed valid Coverageを基準にしたCOV-999 item mismatchが `coverage.items does not match the Coverage SSOT` で拒否される。
- existing validator direct reuse。

確認しないもの:

- 6 Skill classification inventoryのruntime test。
- N/A reasonのruntime test。
- supporting Agentic QA Machine Contract全体。

### Repository gate

最終検証は次の3段だけとする。

```bash
pnpm exec vitest run tests/contracts/skill-output-eval.test.ts --no-file-parallelism --maxWorkers=1
pnpm run verify
git diff --check main...HEAD
```

`git diff --check main...HEAD` はcommit前後を問わず、branch側の変更全体についてwhitespace errorを確認する正本commandとする。

`pnpm run verify` が `test` を含み、`test` が `test:contracts` を含むため、完了条件として同じcommandを個別に重複実行しない。

失敗原因の切り分けとして個別commandを使うことは許可する。

### Scope diff確認

次が0であることを確認する。

```text
Skill description changes
.codex/agents/** changes
.github/workflows/** changes
package.json changes
pnpm-lock.yaml changes
Product source changes
Trigger / Semantic / E2E Eval implementation
PR4 classification inventory implementation
PR4 adapter / CLI / runtime registry
new evals/output fixture files
```

---

## 7. リスクと実装時の判断ルール

### Risk 1: N/Aを減らすためにOutput Contractを発明する

対策:

- fixed classificationを維持する。
- latest `main`とのdirect contract driftがない限り再調査しない。

### Risk 2: classificationをtest実装へ複製する

対策:

- classification / N/A理由の正本はこのPlanだけにする。
- `skill-output-eval.test.ts` は評価可能な2 Skillのbehaviorだけをtestする。

### Risk 3: `feature-plan` resultを汎用化する

対策:

- `{ valid, missingHeadings }` だけにする。
- `issues` / `rule` / `path` taxonomyを作らない。

### Risk 4: `feature-plan` graderがMarkdown parser化する

対策:

- required H2 presenceだけを見る。
- LF / CRLFだけをline splitで吸収する。
- required H2はcolumn 1の `## ` だけを見る。
- line-by-line fence stateだけを持つ。
- opener / closer仕様はSection 5の最小境界に固定する。
- AST / dependency / CommonMark完全互換へ広げない。

### Risk 5: fence内headingでfalse-passする

対策:

- info string付きopenerを認識する。
- closerはopener以上のmarker長を要求する。
- openerより短い同一marker行をcloser扱いしないtestを持つ。
- closerはtrailing whitespaceだけを許容する。
- non-whitespace suffix付きmarker行をcloser扱いしないtestを持つ。
- backtick / tildeを双方testする。
- backtick代表caseをCRLFで実行し、行末 `\r` が判定へ混入しないことも同時に確認する。

### Risk 6: canonical template parser failureでvacuous PASSする

対策:

- required H2が0件ならthrowする。
- leading-space付き `## ` だけではrequired H2ありと判定しない。

### Risk 7: Agentic QA Machine Contract全体を再テストする

対策:

- Normal-mode minimal fixtureだけを使う。
- `qaFindingsSchema.safeParse` と `assertCoverageIntegrity` だけを直接扱う。
- Scored runner / host / benchmark / isolation fixtureへ広げない。

### Risk 8: Issue候補を見て新しいFinding relation ruleを足す

対策:

- Issueのcandidate categoryよりcurrent authoritative Machine Contractを優先する。
- finding ID uniqueness / `duplicate_of` target existenceは既存ruleがないため追加しない。

### Risk 9: machine-readable result統一のためwrapperを作る

対策:

- `feature-plan`: local `{ valid, missingHeadings }`。
- `exploratory-qa`: Zod `safeParse` result / issues。
- `assertCoverageIntegrity`: existing throwのまま。

### Risk 10: fixture / helperを増やす

対策:

- `feature-plan`: canonical template + test内mutation。
- `exploratory-qa`: Normal-mode minimal object + minimal `required_coverage` source object。
- valid relation確認には `parsed.data.coverage` を使い、raw input型を合わせるためのcast/helperを追加しない。
- helper抽出が必要になるなら、まずtest内literalで済まないか確認する。

### Risk 11: validationがcommit後にno-opになる

対策:

- plain `git diff --check` ではなく `git diff --check main...HEAD` を使う。
- commit前後に関係なくbranch差分全体を検査する。

### 実装時の判断順序

迷った場合は次の順で判断する。

1. latest `main`とのdirect contract driftを確認済みか。
2. fixed 6 Skill classificationから外れていないか。
3. semantic qualityを評価しようとしていないか。該当するならPR5へ残す。
4. classification / N/A情報をimplementationへ複製しようとしていないか。
5. 既存validatorを直接呼べないか。呼べるなら直接使う。
6. grader都合の新Output formatを作ろうとしていないか。該当するなら作らない。
7. `feature-plan` required headingをhard-codeしていないか。
8. required H2をcolumn 1以外からも拾おうとしていないか。
9. LF / CRLF以外の改行対応まで一般化しようとしていないか。
10. `validatePlanOutput` にfilesystem / CLI責務を入れていないか。
11. `{ valid, missingHeadings }` よりresultを一般化しようとしていないか。
12. required H2 0件でPASSできないか。
13. fence parserをSection 5以上に一般化していないか。
14. duplicate / order / body / semanticsまで評価していないか。
15. `exploratory-qa` fixtureをGray-box / Scoredへ広げていないか。
16. safeParse成功後もraw `input.coverage` をrelation validatorへ渡すためのcast/helperを作ろうとしていないか。
17. Finding ID / `duplicate_of` cross-reference ruleを新設していないか。
18. throwing validatorをnormalizeするwrapperを作っていないか。
19. static fixture / registry / CLI / common normalizerを追加しようとしていないか。
20. plain `git diff --check` でcommit後の差分確認を済ませようとしていないか。

該当した場合はPlanの最小境界へ戻す。

---

## 8. 成果物

### Plan-only branchでの正本

```text
docs/plans/2026-09-06_125426_issue-117-pr4-deterministic-output-eval.md
```

### 後続実装で追加するファイル

```text
.agents/skills/feature-plan/scripts/validate-plan-output.ts
tests/contracts/skill-output-eval.test.ts
```

役割:

- `validate-plan-output.ts`: LF / CRLF line split + column-1 required H2 extraction + fence handling + `missingHeadings` calculationだけ。
- `skill-output-eval.test.ts`: `feature-plan` と `exploratory-qa` のdeterministic behavior testだけ。

これ以上の実装ファイルは、latest `main`のdirect contract driftにより明確に必要になった場合を除き追加しない。

### 作らないもの

- classification table / inventory implementation
- N/A Skill grader / fixture / test / empty directory
- `.agents/skills/*/evals/output/**` static fixtures
- repository-level PR4 adapter
- common result normalizer / schema
- exception adapter
- CLI
- runtime registry
- package script
- PR4専用GitHub Actions workflow
- global rule taxonomy
- generic Markdown parser
- Finding cross-reference validator

---

## 9. 備考

- Refs: Issue #117。
- 前提PR: PR #123（PR1、merge済み）。
- PR4はPR2 / PR3を待たず実装できる。
- PR5 Semantic Output EvalはPR4でdeterministic / semantic境界を確定した後に進める。
- このPlanの目的は、実装者の選択肢を増やすことではなく、**最小実装を迷わず再現できる状態にすること**である。
