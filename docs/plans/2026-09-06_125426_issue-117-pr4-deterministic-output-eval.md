# Issue #117 PR4 — Deterministic Output Eval

## 0. 依頼概要

- 依頼内容: Issue #117 の PR4 として、6つの Agent Skill の Output のうち、機械的・決定論的に判定可能な品質を評価する仕組みを実装するための Plan を作成する。
- 背景: PR1 で6 Skillの portable package 化と責務分離が完了したため、その構造を前提に、既存 Output Contract のうち deterministic に評価可能な範囲を棚卸しし、評価可能な部分だけを既存 validator の直接再利用または最小 grader で検証可能にする。
- PR4 の役割: PR5 Semantic Output Eval の前段として、required section / field、allowed value、ID / reference integrity、status / stop consistency、artifact integrity など、人間や LLM Judge を使わずに判定できる領域を固定する。
- Base: `main` の PR1 merge commit `1f680e1bd91bbf6aa9cfb4d4bc7c5816f659605c`。
- 期待成果: 6 Skillすべてについて deterministic evaluation の適用可否と根拠を明示し、**現在の Repository Contract で安全に評価できる Skill だけ**既存 validator の直接再利用または最小 grader で valid / invalid input を検証する。
- この Plan 作成・修正時点では実装しない。この branch では正本 Plan のみを更新し、grader、test、fixture、script、CI、Skill 本文は変更しない。

---

## 1. ゴール / 完了条件

### ゴール

既存の Skill Output Contract を evaluator の都合で変更せず、現在すでに存在する deterministic な property / relation / invariant のうち、**既存の stable serialization / canonical template / Machine Contract を入力として安全に評価できるものだけ**を機械評価する。

PR4で重要なのは「6 Skillすべてに新しい grader を作ること」ではない。

重要なのは次の3点である。

1. 6 Skillすべてについて機械評価可能範囲を明示する。
2. 既存 validator / schema があるものは新しい adapter 層を挟まず contract test から直接再利用する。
3. stable な入力表現がないものは、grader のために新しい出力形式を発明せず N/A とする。

### 必須原則

- Output 全文の exact match を採用しない。
- LLM Judge、Embedding、Semantic similarity を使用しない。
- evaluator の都合で新しい Production Output schema / Markdown format / label convention を発明しない。
- 「意味上 field が定義されている」ことと「機械 parse 可能な serialization が定義されている」ことを区別する。
- 既存 Machine Contract がある領域は複製せず、既存 export / validator / schema を直接再利用する。
- 既存 validator を直接 import / call できる場合、PR4専用 adapter を作らない。
- 6 Skillを一律に同じ result schema へ押し込まない。
- 巨大な共通 Rule Engine、独自 DSL、Plugin Framework、汎用 Markdown parser framework を作らない。
- deterministic に評価できない Skill / invariant は無理に実装せず N/A 理由を残す。
- N/A を減らすこと自体を目的にしない。
- PR4ではCLI、runtime registry、PR4専用 package script、GitHub Actions workflowを追加しない。
- static fixture file を作ること自体を目的にしない。既存 canonical artifact や test 内の最小 input 生成で十分なら新規 fixture file を作らない。

### 完了条件（DoD）

- [ ] 6 Skillすべてについて `existing-validator reuse` / `minimal grader` / `N/A` の分類と理由が明示されている。
- [ ] `feature-plan` は `minimal grader` とし、package-local canonical template から required top-level heading を導出して検証する。
- [ ] `exploratory-qa` は `existing-validator reuse` とし、実 Skill Output である Findings / Coverage 周辺の既存 schema / validator を直接再利用する。
- [ ] `code-review`、`repair-loop`、`harness-improvement`、`android-native-local-validation` は current Repository Contract 上 stable machine-readable Output serialization がないため N/A とする。
- [ ] `existing-validator reuse` は既存 schema / validator / artifact contract の rule を二重実装していない。
- [ ] `minimal grader` は evaluator 都合の新しい Output format を定義していない。
- [ ] expected data は自然言語全文ではなく property / relation / invariant を表している。
- [ ] Output 全文 exact match を使っていない。
- [ ] LLM Judge、Embedding、Semantic similarity を使っていない。
- [ ] evaluator のためだけに Skill の Production Output format を変更していない。
- [ ] evaluator のためだけに新しい Repository-wide taxonomy / workflow engine / plugin mechanism を作っていない。
- [ ] 評価対象 Skill ごとに valid / invalid input を使った deterministic contract test がある。fixture は論理的な test input を意味し、専用 fixture file は必須としない。
- [ ] `feature-plan` で required heading omission を検出できる。
- [ ] `feature-plan` で fenced code block 内にしかない required heading を存在扱いしない。
- [ ] `exploratory-qa` で required field omission を既存 schema で検出できる。
- [ ] `exploratory-qa` で Coverage SSOT と一致しない coverage reference / coverage set を既存 `assertCoverageIntegrity` で検出できる。
- [ ] invalid input に対し grader / validator が machine-readable な failure information、または既存 deterministic exception を返す。
- [ ] contract test は invalid input が意図した理由で拒否されることを確認し、期待どおり拒否できた場合は test 自体は PASS する。
- [ ] existing validator の error 情報を不要に独自 check-id taxonomy へ再マッピングしていない。
- [ ] `tests/contracts/skill-output-eval.test.ts` が `pnpm run test:contracts` から実行され、`pnpm run verify` の既存 `test` 経路から到達する。
- [ ] PR4専用 CLI / adapter / common result normalizer / runtime registry / package script / GitHub Actions workflow / matrix を追加していない。
- [ ] Skill frontmatter `description` の最適化を行っていない。
- [ ] Trigger Eval、Semantic Output Eval、Workflow E2E Eval を前倒ししていない。
- [ ] Product Code、Product Runtime behavior、`.codex/agents/**` を変更していない。

---

## 2. 現状理解と前提

### Current understanding

PR1 は merge 済みで、現在の `main` では以下の6 Skillが package-local workflow / reference を持つ。

```text
.agents/skills/android-native-local-validation/
.agents/skills/code-review/
.agents/skills/exploratory-qa/
.agents/skills/feature-plan/
.agents/skills/harness-improvement/
.agents/skills/repair-loop/
```

Issue #117 の依存関係上、PR4 は PR1 を前提とするが、PR2 Trigger Eval / PR3 description optimization の完了を待つ必要はない。

PR4 は Output の意味品質全般を判定する PR ではない。correctness、relevance、coverage、risk-awareness、evidence の意味的妥当性、提案の有用性などの semantic judgment は PR5 の責務であり、本PRへ持ち込まない。

### 最重要の設計判断

PR4では、次の2つを混同しない。

```text
A. Semantic Output Contract
   例: code-review は Severity / Evidence / Location を含むべき

B. Stable Serialization Contract
   例: JSON schema、固定 Markdown template、canonical artifact schema
```

Aだけが存在してBが存在しない場合、PR4で自由文 parser を作ると、grader が事実上新しい Output format を定義することになる。

したがって、**Aだけでは grader 実装の根拠にしない**。

### 6 Skillの分類をPlan時点で確定する

現時点の Repository Contract を確認した結果、PR4の分類は次で固定する。

| Skill | PR4分類 | 根拠 | 実装方針 |
| --- | --- | --- | --- |
| `feature-plan` | `minimal grader` | package-local `assets/plan-template.md` が reusable output skeleton として明示されている | canonical template の level-2 heading 存在だけを検証 |
| `code-review` | `N/A` | required fields は semantic contract として存在するが、固定 JSON / Markdown serialization がない | grader を作らず理由のみ記録 |
| `repair-loop` | `N/A` | iteration field / relation は定義されているが、Repository evaluation は schema 実装ではなく contract example | grader を作らず理由のみ記録 |
| `harness-improvement` | `N/A` | candidate model は意味契約として存在するが、stable machine-readable candidate serialization / validator がない | grader を作らず理由のみ記録 |
| `exploratory-qa` | `existing-validator reuse` | `qaFindingsSchema`、`coverageResultSchema`、`assertCoverageIntegrity` 等の Machine Contract が既に存在 | contract test から直接 import / call |
| `android-native-local-validation` | `N/A` | workflow / PowerShell helper は gate と実行 semantics を持つが、Skill Output を表す stable result schema がない | grader を作らず理由のみ記録 |

この分類を減らす・増やすためのRepository archaeologyは行わない。

実装開始時のPhase 0は、この分類を再調査する工程ではなく、**main の後続変更で前提Contractが変わっていないことを確認する短い drift preflight** とする。

### `feature-plan`

Canonical source:

- `.agents/skills/feature-plan/SKILL.md`
- `.agents/skills/feature-plan/assets/plan-template.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`

`SKILL.md` は package-local template を reusable output skeleton として使用し、Repository plan artifact として保存する契約を持つ。

現在の template は各section内に `- ゴール:` 等の placeholder 自体を持つため、「section body が non-empty」という判定では未記入templateもPASSし得る。

そのためPR4では body の充実度や placeholder completion を判定しない。

また、template上でheadingが1回ずつ現れることは事実だが、「同じtop-level headingを複数回書いてはならない」という明示Output Contractは存在しないため、PR4でheading uniquenessを新しいInvariantとして追加しない。

最小 grader が評価するのは次だけとする。

- canonical template の level-2 heading (`## ...`) を required heading として導出する。
- Output の fenced code block 外に、各 required heading が少なくとも1回存在することを確認する。

内容の十分性、placeholderが埋まっているか、heading重複、技術的正しさ、risk / validation の質はPR4では評価しない。

### `code-review`

Canonical semantic source:

- `.agents/skills/code-review/SKILL.md`
- `.agents/skills/code-review/references/review-workflow.md`

Finding には Severity、Title、Location、Why it matters、Evidence、Suggested fix 等の意味上のrequired fieldsがある。

ただし normal output は findings であり、固定JSON field、固定Markdown label、canonical serialized artifactは定義されていない。

PR4で `Severity:` 等のlabelを必須化すると新しいOutput formatになるため N/A とする。

No-findings の判定も自然言語regexで推測しない。

### `repair-loop`

Canonical semantic source:

- `.agents/skills/repair-loop/SKILL.md`
- `.agents/skills/repair-loop/references/repair-workflow.md`
- `docs/reference/repair-loop.md`
- `docs/reference/evaluation.md`

Iterationには `iteration_number`、`allowed_files`、`changed_files`、`validation_result`、`decision` 等と、`needs_human -> stop_needs_human` のdeterministic relationがある。

ただし Repository evaluation contract は current implementation では schema ではなく contract example と明示されている。

したがって、PR4で iteration JSON / Markdown parser を新設せず N/A とする。

### `harness-improvement`

Canonical semantic source:

- `.agents/skills/harness-improvement/SKILL.md`
- `.agents/skills/harness-improvement/references/improvement-workflow.md`
- `docs/reference/evaluation.md`

Candidate modelには `candidate_id`、`target`、`failure_category`、`evidence`、`expected_impact`、`risk`、`recommended_change`、`strictness`、`status`、`owner_decision` が定義されている。

ただしこれは意味契約であり、current Repository evaluation contractもschema実装ではない。

PR4でcandidate serializationやtaxonomy validatorを新設せず N/A とする。

### `exploratory-qa`

Canonical portable source:

- `.agents/skills/exploratory-qa/references/workflow.md`
- `.agents/skills/exploratory-qa/references/scored-mode.md`

Repository-side Machine Contract:

- `scripts/agentic-qa/contracts.ts`
- `scripts/agentic-qa/coverage.ts`

Workflowは最終的に Repository-defined candidate findings artifact を生成し、既存 `contracts.ts` には実Outputに対応する `qaFindingsSchema` / `findingSchema` / `coverageResultSchema` が存在する。

Coverage SSOTとのrelationは `assertCoverageIntegrity` が既に検証する。

PR4では **Exploratory QAの実Skill Outputである Findings / Coverage 周辺だけ** を対象にする。

次のMachine Contract全体をPR4で再テストしない。

- Host capability receipt。
- Runner session / runner profile。
- Tool isolation / resource boundary probe。
- Prepared target / runtime handoff。
- Bootstrap operation。
- Benchmark / evaluator全体。
- その他 `tests/contracts/spec-agentic-qa.test.ts` ですでに検証されている supporting harness contract。

Artifact manifest等のsupporting contractは既存Agentic QA contract testの責務を維持し、PR4で同じfixture matrixを複製しない。

### `android-native-local-validation`

Canonical portable source:

- `.agents/skills/android-native-local-validation/SKILL.md`
- `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`

Repository helper:

- `scripts/native/windows/android-local.ps1`

WorkflowとhelperにはDoctor / Build / Install / Smoke / Test等のgate、失敗時stop、evidence保存などのdeterministic semanticsがある。

一方、helperはcommand実行、log / JUnit / text / screenshot生成、throwによる失敗通知を行う実行helperであり、Skill Output全体を表すstable stage-result JSON schemaは提供していない。

PR4で新しいNative Output schemaを作るとOutput Contract変更になるため N/A とする。

### Assumptions

- 新規 dependency は不要で、既存 TypeScript / Node.js / Zod / Vitest で実装できる。
- Machine-readable result は全Skillで同一shapeに正規化しない。既存validatorは既存structured result / issueをそのまま利用し、`feature-plan` graderだけ必要最小限のlocal structured resultを返す。
- PR4専用CLI、adapter、runtime registry、package scriptは不要。
- PR4専用CI workflowは不要。`test:contracts -> test -> verify` の既存経路を正本とする。
- 「fixture」はdeterministicなvalid / invalid test inputを意味し、専用fileを必須としない。

### Non-goals

- Trigger Eval dataset / runner。
- Skill frontmatter description の変更・最適化。
- Semantic Output Eval。
- LLM Judge / rubric grader。
- Workflow E2E Eval。
- Agent Runtime / Workflow Engine。
- 自動 repair / retry。
- Golden Output全文一致。
- 全Skill共通Output schema / result schemaへの移行。
- PR4専用adapter layer。
- PR4専用CLI / runtime registry / package script。
- generic Markdown AST framework。
- generic rule DSL / plugin system。
- Product Code / Product behavior の変更。
- `.codex/agents/**` の変更。
- missing Output serialization / taxonomy をPR4都合で新設すること。
- 既存Agentic QA Machine Contract全体の再テスト。

---

## 3. 質問 / 曖昧性

### ユーザー判断が必要な blocker

なし。

### 実装前に確認するtechnical preflight

分類判断はPlan時点で完了している。

実装開始時には current branch / main の後続変更で前提がdriftしていないかだけ確認する。

確認対象:

- `feature-plan` の `SKILL.md` が引き続き package-local `assets/plan-template.md` を reusable output skeleton として参照していること。
- `plan-template.md` のlevel-2 headingが引き続きcanonical section skeletonであること。
- `exploratory-qa` のworkflowが引き続き Repository-defined candidate findings artifact をOutputとして扱っていること。
- `qaFindingsSchema` / `coverageResultSchema` / `assertCoverageIntegrity` が引き続き存在し、Outputに直接利用できること。
- N/A 4 Skillに新しいstable machine-readable Output schemaが main 側で追加されていないこと。ただし確認は各Skillの直接参照先に限定し、Repository-wide archaeologyは行わない。

前提が変わっていなければPlanの分類をそのまま実装する。

前提が変わっていた場合のみ、そのSkillの分類を再評価し、PR4の基本原則を崩してgraderを増やさない。

---

## 4. 影響範囲

### 実装時の想定変更ファイル

現時点では次の2箇所だけを基本構成とする。

```text
.agents/skills/feature-plan/scripts/<minimal-plan-structure-validator>.ts
tests/contracts/skill-output-eval.test.ts
```

新規 static fixture file は原則作らない。

`feature-plan` のvalid inputは既存 canonical templateを使い、invalid inputはcontract test内でtemplateから最小mutationして生成する。

`exploratory-qa` は既存 schema / validator を直接再利用し、新しいpackage-local script / adapterを作らない。

### 原則変更しない領域

```text
.agents/skills/*/evals/output/**
scripts/skill-output-eval/**
package.json
.github/workflows/**
pnpm-lock.yaml
```

### 配置責務

#### Skill package内へ置くもの

`feature-plan` のportableなcanonical structure graderだけ。

このgraderはRepository固定pathやAgentic QA contractへ依存しない。

#### Repository-levelで新設しないもの

- PR4専用adapter。
- PR4専用common result normalizer。
- PR4専用runtime registry。
- PR4専用CLI。
- PR4専用fixture catalog。

既存Repository Machine Contractを使う `exploratory-qa` は、contract testから既存exportを直接import / callする。

### Expected no-change areas

- Product source / runtime behavior。
- Skill frontmatter `description`。
- PR2 / PR3 / PR5 / PR6 scope。
- `.codex/agents/**`。
- dependency / lockfile。
- `package.json`。
- `.github/workflows/**`。

---

## 5. 変更方針

### Phase 0: Contract drift preflightのみ行う

Phase 0は分類のためのRepository調査ではない。

Section 3に記載した直接Contractだけを確認し、Plan作成時点からdriftしていなければ次の分類をそのまま採用する。

```text
feature-plan                    -> minimal grader
code-review                     -> N/A
repair-loop                     -> N/A
harness-improvement             -> N/A
exploratory-qa                  -> existing-validator reuse
android-native-local-validation -> N/A
```

禁止:

- N/Aを減らすための追加探索。
- 関連しそうな旧artifactのRepository-wide検索。
- 別用途artifactをOutput Contractへ昇格すること。
- graderを作るためのserialization推測・新設。

### Phase 1: 6 Skill coverageはcontract test tableをSSOTにする

6 Skill coverageのSSOTは `tests/contracts/skill-output-eval.test.ts` 内の小さなstatic tableに固定する。

概念例:

```ts
const outputEvalCoverage = [
  { skill: "feature-plan", mode: "minimal-grader" },
  {
    skill: "code-review",
    mode: "n/a",
    reason: "semantic output fields exist, but no stable serialized output contract exists",
  },
  { skill: "exploratory-qa", mode: "existing-validator-reuse" },
] as const;
```

実装時には6 Skillすべてを1回ずつ列挙する。

同じ分類情報をinventory JSON / Markdown / runtime registryへ複製しない。

Contract testでは対象6 Skillが重複なく全て分類され、N/A reasonが空でないことを確認する。

### Phase 2: `feature-plan` minimal grader

#### 2-A. Required headingの正本

required heading配列をgrader内へhard-codeしない。

正本は既存:

```text
.agents/skills/feature-plan/assets/plan-template.md
```

とする。

Validator / test はcanonical template Markdownから、fenced code block外の **level-2 ATX heading (`## `)** を抽出し、それをrequired heading setとして利用する。

これにより template と grader rule の二重管理を避ける。

H1 `# 計画書テンプレート` はplan titleそのものではなくtemplate titleなのでrequired対象にしない。

#### 2-B. Output側の評価

Output Markdownからfenced code block外のlevel-2 headingを抽出し、canonical template由来のrequired headingが全て存在するかだけ確認する。

評価対象:

- required heading omission。

評価しないもの:

- heading uniqueness / duplicate。
- section bodyがnon-emptyか。
- template placeholderが埋まっているか。
- content completeness。
- heading順序。
- wording / paragraph count。
- technical correctness。
- risk / validation planの質。

#### 2-C. Fence handling

false-pass防止のため、fenced code block内のheadingは実sectionとして数えない。

実装はline-by-lineの小さいstate machineに留める。

- standard backtick fence (` ``` `) を扱う。
- standard tilde fence (` ~~~ `) も同様に扱う。
- fence内で `## ...` が現れてもheading setへ追加しない。
- full Markdown AST parserは導入しない。
- 新dependencyは追加しない。

#### 2-D. Minimal result

Skill-local graderだけ必要最小限のstructured resultを返す。

概念例:

```json
{
  "valid": false,
  "issues": [
    {
      "rule": "required-section",
      "path": "## 6. 検証方法"
    }
  ]
}
```

原則:

- `valid` / `issues` 程度に留める。
- `schema_version`、timestamp、grader version、metrics等を追加しない。
- human向けmessage全文をtest contractにしない。
- global check-ID taxonomyを作らない。

### Phase 3: `feature-plan` fixture testは既存template + test内mutationで作る

新しい `.agents/skills/feature-plan/evals/output/**` は作らない。

Valid input:

- `assets/plan-template.md` 自体を読み込み、required heading structureがvalidであることを確認する。

Invalid input 1 — required omission:

- canonical templateからrequired headingを1つだけ除去したstringをtest内で生成する。
- graderが `required-section` / 対象headingで拒否することを確認する。

Invalid input 2 — fenced-heading false-pass:

- canonical templateからrequired headingを1つ通常位置から除去する。
- 同じheadingをfenced code block内へだけ追加する。
- graderがそのheadingを存在扱いせず拒否することを確認する。

専用fixture fileを作らないことで、canonical templateとfixtureの二重保守を避ける。

### Phase 4: `exploratory-qa` は実Skill Outputだけexisting validatorを直接再利用する

新しいschema graderもadapterも作らない。

#### 4-A. 対象

PR4で直接扱うexisting contractは次を中心にする。

```text
qaFindingsSchema
coverageResultSchema
assertCoverageIntegrity
```

必要な場合だけ `findingSchema` 等、上記Output validationから直接利用されるexportを使う。

#### 4-B. 対象外

次は既存Agentic QA contract testの責務を維持し、PR4 testでfixture matrixを複製しない。

- runner / evaluator session contract。
- host capability / isolation contract。
- prepared target / runtime handoff contract。
- artifact manifestの詳細contract。
- resource boundary / bootstrap / benchmark contract。
- scored harnessの全schema網羅テスト。

PR4は「Agentic QA Machine Contract全体の追加テスト」ではなく、「Exploratory QA Skill Outputが既存deterministic contractを持つことの確認」に限定する。

#### 4-C. Fixture / input strategy

package-local `evals/output/` や巨大なAgentic QA fixture一式は新設しない。

優先順位:

1. 既存contract testの小さいbuilder / fixtureをそのまま再利用できるなら再利用する。
2. 再利用のために大きなtest helper抽出やrefactorが必要なら、`skill-output-eval.test.ts` 内に最小objectを置く。
3. scored run一式やHost receipt一式を新規fixtureとして複製しない。

最低限のtest input:

- valid Findings / Coverage input。
- required fieldを1つ欠落させたinvalid input -> `qaFindingsSchema` が拒否。
- Coverage SSOTに存在しない / 一致しないcoverage IDまたはcoverage set -> `assertCoverageIntegrity` が拒否。
- 必要に応じ、`coverageResultSchema` の既存status relationを壊した代表1件。

ここで新しいOutput ruleを追加せず、既存schema / validatorがすでに持つruleだけを使う。

#### 4-D. Failure assertion

- Zod schema failureは既存 issue の `code` / `path` を確認する。
- `assertCoverageIntegrity` は既存 deterministic error の種類 / message断片など、現在のAPIで安定して確認できる最小情報だけassertする。
- PR4独自のglobal check IDへ変換しない。

### Phase 5: N/A 4 Skillはcoverage tableの理由だけ残す

#### `code-review`

```text
N/A: required review fields are semantic output requirements, but the normal review output has no stable machine-readable or fixed Markdown serialization. PR4 will not invent one.
```

#### `repair-loop`

```text
N/A: deterministic iteration relations exist, but the supplied Repository evaluation contract is currently a contract example rather than an implemented output schema. PR4 will not create an iteration serialization solely for grading.
```

#### `harness-improvement`

```text
N/A: the candidate model is semantically defined, but there is no stable machine-readable candidate artifact / validator in the current contract. PR4 will not create one or repair the missing taxonomy authority.
```

#### `android-native-local-validation`

```text
N/A: workflow and helper have deterministic execution gates, but there is no stable machine-readable Skill Output schema representing stage results. PR4 will not introduce a new Native result contract.
```

N/A Skill用のgrader、fixture、空directoryは作らない。

### Phase 6: Canonical validation pathを既存quality gateへ一本化

PR4のcontract testの正本は次とする。

```text
tests/contracts/skill-output-eval.test.ts
        ↓
pnpm run test:contracts
        ↓
pnpm run test
        ↓
pnpm run verify
```

現在の `package.json` では `test` が `test:contracts` を実行し、`verify` が `test` を実行しているため、この既存経路をそのまま利用する。

PR4では次を追加しない。

- 専用CLI。
- 専用package script。
- runtime registry。
- GitHub Actions workflow / matrix。

### Phase 7: Scope freeze

実装完了時にdiffで次を確認する。

- Skill `description`変更なし。
- Trigger Eval / Semantic Eval / Workflow E2E実装なし。
- Product source変更なし。
- `.codex/agents/**`変更なし。
- `.github/workflows/**`変更なし。
- `package.json`変更なし。
- dependency / lockfile変更なし。
- `evals/output/**` 新設なし。
- existing Machine Contractのschema / regex / enum / relationの不要な複製なし。
- PR4専用adapter / common result normalizer / CLI / runtime registry追加なし。
- N/A回避目的の新Output schema / template / taxonomy追加なし。

---

## 6. 検証方法

### Targeted contract test

```bash
pnpm exec vitest run tests/contracts/skill-output-eval.test.ts --no-file-parallelism --maxWorkers=1
```

確認内容:

- 6 Skillが重複なく次の固定分類になっている。
  - `feature-plan`: `minimal-grader`
  - `exploratory-qa`: `existing-validator-reuse`
  - その他4 Skill: `N/A`
- N/A理由が空でない。
- `feature-plan` canonical templateがvalid inputとしてPASSする。
- `feature-plan` required top-level heading omissionを検出する。
- `feature-plan` fenced code block内headingだけではrequired heading存在扱いにならない。
- `feature-plan` required heading listをvalidator内部へhard-codeしていない。
- `exploratory-qa` valid Findings / Coverage inputが既存schema / validatorを通る。
- `exploratory-qa` required field omissionを既存schemaが拒否する。
- `exploratory-qa` Coverage SSOTと一致しないreference / setを `assertCoverageIntegrity` が拒否する。
- `exploratory-qa` が新しいadapterを経由せず既存Machine Contractを直接利用する。
- supporting Agentic QA Machine Contract全体のfixtureをPR4 testへ複製していない。

### Repository integration validation

```bash
pnpm run test:contracts
pnpm run validate:skills
pnpm run typecheck
pnpm run format:check
pnpm run lint:markdown
pnpm run verify
git diff --check
```

### Scope validation

```text
Skill description diff = 0
.codex/agents/** diff = 0
.github/workflows/** diff = 0
package.json diff = 0
pnpm-lock.yaml diff = 0
Product source diff = 0
Trigger / Semantic / E2E Eval implementation diff = 0
PR4専用adapter / CLI / runtime registry diff = 0
new evals/output fixture file diff = 0
```

### 成功判定

- Issue #117 PR4の6 Skill coverageを1対1で説明できる。
- 新規graderは `feature-plan` の最小structure validatorだけ。
- `exploratory-qa` は実Skill Outputに限定して既存validatorを直接再利用する。
- invalid inputを意図したdeterministic reasonで拒否できる。
- existing Machine Contract duplicationがない。
- N/A 4 Skill用のserialization / grader / fixtureを新設していない。
- `pnpm run test:contracts` から検証され、既存 `test -> verify` 経路にも自然に含まれる。
- 新しいCLI / package script / CI workflowなしでgateされる。

---

## 7. リスクと未解決論点

### Risk 1: Planで確定したN/Aを実装時に再調査し始める

対策:

- Phase 0はcontract drift preflightだけにする。
- direct contractに変更がなければ分類を再議論しない。
- N/Aを減らすためのRepository archaeologyを禁止する。

### Risk 2: `feature-plan` graderが新しいOutput Contractを作る

対策:

- required headingはcanonical templateから導出する。
- hard-codeしたheading registryを持たない。
- heading存在以外を評価しない。
- duplicate / order / body / placeholder completionをruleにしない。

### Risk 3: Markdown parserを作り込みすぎる

対策:

- line-by-lineのfence state + level-2 heading extractionだけにする。
- backtick / tilde fenceだけ扱う。
- AST / generic parser / new dependencyを追加しない。

### Risk 4: Existing Agentic QA Machine Contractを二重実装する

対策:

- `qaFindingsSchema` / `coverageResultSchema` / `assertCoverageIntegrity` を直接利用する。
- regex / enum / relationをコピーしない。
- direct callできるためadapterを作らない。

### Risk 5: `exploratory-qa` の範囲がMachine Contract全体へ広がる

対策:

- PR4対象は Findings / Coverage output周辺だけ。
- Host / Runner / Preparation / Benchmark等は既存 `spec-agentic-qa.test.ts` の責務を維持する。
- artifact manifest等の既存fixture matrixを再作成しない。

### Risk 6: fixture directoryが増える

対策:

- `feature-plan` はcanonical template + test内mutation。
- `exploratory-qa` は既存small fixture/builderかtest内minimal object。
- static fixture fileは、test内生成では表現できない具体的理由がない限り作らない。

### Risk 7: 共通result normalizationを作りたくなる

対策:

- existing validatorは既存resultをそのまま使う。
- `feature-plan` graderだけlocal resultを持つ。
- PR4共通result schema / normalizerを作らない。

### Risk 8: invalid input failureとtest command failureを混同する

対策:

- invalid inputがmachine-readable failure / deterministic exceptionになることをassertする。
- 期待どおり拒否できればcontract testはPASS。
- commandのnon-zeroはcontract test自体が壊れた場合だけ。

### 実装時の判断ルール

迷った場合は次を上から確認する。

1. **Planで分類済みの6 Skill mappingから外れようとしていないか。**
   - はい -> direct contract driftがあるか確認する。driftがなければPlanへ戻す。
2. **このruleはsemantic判断か。**
   - はい -> PR5へ残す。
3. **既存validator / schemaを直接呼べるか。**
   - はい -> 直接再利用する。adapterを作らない。
4. **graderのために新しいOutput formatを作ろうとしていないか。**
   - はい -> N/Aを維持する。
5. **`feature-plan` required headingをhard-codeしようとしていないか。**
   - はい -> canonical templateから導出する。
6. **duplicate / order / body / semantic completenessまで検証しようとしていないか。**
   - はい -> scopeをrequired heading existenceへ戻す。
7. **Agentic QA Machine Contract全体を再テストしようとしていないか。**
   - はい -> Findings / Coverage outputへ戻す。
8. **static fixture file / common result normalizer / CLI / runtime registryが必要になっていないか。**
   - PR4では原則作らない。contract testで完結させる。
9. **N/Aを減らすこと自体が目的になっていないか。**
   - はい -> N/Aを維持する。

---

## 8. 成果物

### 今回のPlan-only branch

```text
docs/plans/2026-09-06_125426_issue-117-pr4-deterministic-output-eval.md
```

今回変更するのはこのPlanのみ。

### 後続実装で必須になる成果物

```text
.agents/skills/feature-plan/scripts/<minimal-plan-structure-validator>.ts
tests/contracts/skill-output-eval.test.ts
```

役割:

- `feature-plan` validator:
  - canonical template由来required H2抽出。
  - Outputのfence-aware H2抽出。
  - missing required headingのstructured result。
- `skill-output-eval.test.ts`:
  - 6 Skill固定classification table。
  - `feature-plan` canonical template + test内mutation test。
  - `exploratory-qa` existing schema / coverage validator direct reuse test。
  - N/A reason coverage。

### 作らないもの

- N/A Skillのgrader / fixture / empty directory。
- `.agents/skills/*/evals/output/**` の新規fixture file。
- fake grader / placeholder parser。
- inventory専用module。
- Repository-level PR4 adapter。
- common result normalizer / schema。
- CLI / runtime registry / package script。
- PR4専用GitHub Actions workflow / matrix。
- global rule taxonomy / plugin framework。

### 最小実装見立て

```text
.agents/skills/feature-plan/
└── scripts/
    └── <minimal-plan-structure-validator>.ts

tests/contracts/
└── skill-output-eval.test.ts
```

この2ファイルの追加だけでIssue #117 PR4のDoDを満たせる限り、それ以上の共通基盤・fixture file・adapterを追加しない。

---

## 9. 備考

- Refs: Issue #117。
- 前提PR: PR #123（PR1: Skill package構造整理・Portability対応、merge済み）。
- PR4はPR2 / PR3を待たずPR1 merge後のmainから実装できる。
- PR5 Semantic Output EvalはPR4でdeterministic / semantic境界を確定した後に進める。
- このPlan commitでは実装を行わない。
