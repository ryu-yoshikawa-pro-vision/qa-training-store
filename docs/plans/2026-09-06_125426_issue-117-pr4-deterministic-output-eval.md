# Issue #117 PR4 — Deterministic Output Eval

## 0. 依頼概要

- 依頼内容: Issue #117 の PR4 として、6つの Agent Skill の Output のうち、機械的・決定論的に判定可能な品質を評価する仕組みを実装するための Plan を作成する。
- 背景: PR1 で6 Skillの portable package 化と責務分離が完了したため、その構造を前提に Output Contract の deterministic な部分を evaluator / grader / fixture で検証可能にする。
- PR4 の役割: PR5 Semantic Output Eval の前段として、required field、allowed value、ID / reference integrity、status / stop consistency、artifact integrity など、人間や LLM Judge を使わずに判定可能な領域を固定する。
- Base: `main` の PR1 merge commit `1f680e1bd91bbf6aa9cfb4d4bc7c5816f659605c`。
- 期待成果: 6 Skillすべてについて deterministic evaluation の適用範囲を明示し、評価可能な Skill には false-pass を防ぐ grader と valid / invalid fixture を用意し、結果を machine-readable に取得できる。
- この Plan 作成時点では実装しない。今回の branch にはこの正本 Plan だけを保存し、grader、fixture、script、CI、Skill 本文は変更しない。

---

## 1. ゴール / 完了条件

### ゴール

既存の Skill Output Contract を変更するのではなく、現在すでに存在する deterministic な property / relation / invariant を機械評価できるようにする。

特に次を守る。

- Output 全文の exact match を採用しない。
- LLM Judge を使用しない。
- evaluator の都合で新しい Production Output schema を発明しない。
- 既存 Machine Contract がある領域は複製せず再利用する。
- 6 Skillを一律に同じ schema へ押し込まない。
- 巨大な共通 Rule Engine、独自 DSL、Plugin Framework を作らない。
- deterministic に評価できない Skill / invariant は無理に実装せず N/A 理由を残す。

### 完了条件（DoD）

- [ ] 6 Skillすべてについて deterministic evaluation 対象を棚卸しし、`grader` / `existing-contract adapter` / `N/A` のいずれかを明示する。
- [ ] grader を持つ Skill では、評価根拠となる canonical Output Contract / Template / Machine Contract が特定されている。
- [ ] expected data は自然言語全文ではなく property / relation / invariant として表現されている。
- [ ] Output 全文 exact match を使っていない。
- [ ] LLM Judge、Embedding、Semantic similarity を使っていない。
- [ ] 共通化は evaluator の実行結果形式と最小 runner に限定し、Skill 固有 rule を巨大な共通 Rule Engine へ移していない。
- [ ] evaluator のためだけに Skill の Production Output format を変更していない。
- [ ] evaluator のためだけに新しい Repository-wide taxonomy / registry / workflow engine を作っていない。
- [ ] `feature-plan` の required plan structure を機械評価できる。
- [ ] `code-review` の finding required fields と no-findings 時の必須情報を機械評価できる。
- [ ] `repair-loop` の iteration fields、allowed values、stop / scope relation を機械評価できる。
- [ ] `harness-improvement` の candidate fields、allowed values、evidence requirement を機械評価できる。
- [ ] `exploratory-qa` は既存 `scripts/agentic-qa/**` の Machine Contract を再利用し、schema / ID / reference / status consistency 等を二重実装していない。
- [ ] `android-native-local-validation` は既存の stable machine-readable result contract が確認できた場合だけ adapter を実装し、確認できない場合は N/A 理由を明示する。
- [ ] 評価対象 Skill ごとに valid fixture がある。
- [ ] 評価対象 Skill ごとに required omission を検出する invalid fixture がある。
- [ ] 評価対象 Skill ごとに relation / allowed value / reference 等の false-pass を防ぐ invalid fixture が少なくとも1件ある。
- [ ] unknown reference を authoritative catalog / schema で判定できる領域では検出できる。
- [ ] fixture test は単に `fail` したことだけでなく、期待する check ID / error reason を確認する。
- [ ] evaluator は machine-readable JSON result を出力できる。
- [ ] deterministic evaluation failure 時は CLI が non-zero exit になる。
- [ ] N/A の Skill は grader を偽造せず、理由が test または inventory で固定されている。
- [ ] dedicated test が既存の Repository quality path から到達可能である。
- [ ] 最終 `pnpm run verify` で PR4 の deterministic evaluation contract が検証される。
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

PR4 は Output の意味品質全般を判定する PR ではない。例えば correctness、relevance、coverage、risk-awareness 等の semantic judgment は PR5 の責務であり、本PRへ持ち込まない。

### Skill別の初期棚卸し

| Skill | 現在確認できる deterministic 候補 | 初期方針 |
| --- | --- | --- |
| `feature-plan` | canonical Template の required section、planning workflow の主要 output area | package-local text grader |
| `code-review` | finding required fields、no-findings 時の residual risk / unvalidated area | package-local text grader |
| `repair-loop` | iteration fields、decision / triage enum、`needs_human` と stop decision、scope relation | package-local structured-text grader |
| `harness-improvement` | candidate fields、strictness / status / owner_decision enum、evidence requirement | package-local grader + Repository adapter |
| `exploratory-qa` | 既存 Zod schema、ID、reference、coverage、evidence、status relation、artifact contract | existing Machine Contract adapter |
| `android-native-local-validation` | stage order、failure classification、blocked / unexecuted を PASS にしない契約 | existing result contract の有無を Phase 0 で確認。なければ N/A |

### `feature-plan`

Canonical source は少なくとも次の2つ。

- `.agents/skills/feature-plan/assets/plan-template.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`

Template には `依頼概要`、`ゴール / 完了条件`、`現状理解と前提`、`質問 / 曖昧性`、`影響範囲`、`変更方針`、`検証方法`、`リスクと未解決論点`、`成果物`、`備考` がある。

grader は見出し・必須領域の存在と空欄を判定する。本文の wording、文章量、表現順序を Golden text と比較しない。

### `code-review`

Canonical source は `.agents/skills/code-review/references/review-workflow.md`。

Finding の required fields は次のとおり。

```text
Severity
Title
Location
Why it matters
Evidence
Suggested fix
Open questions
Verdict
confidence
```

No-findings review では residual risk と unvalidated areas を残す契約がある。

PR4では、canonical contract に明示されていない severity の具体 enum 等を evaluator 側で勝手に追加しない。

### `repair-loop`

Canonical source は `.agents/skills/repair-loop/references/repair-workflow.md`。

Iteration required fields:

```text
iteration_number
input_findings
repair_plan
allowed_files
changed_files
validation_commands
validation_result
remaining_delta
decision
```

Allowed decision:

```text
continue
stop_success
stop_no_progress
stop_scope_violation
stop_unsafe
stop_max_iterations
stop_needs_human
```

Allowed triage classification:

```text
must_fix
should_fix
defer
reject
needs_human
```

明示されている relation も deterministic に評価する。

- `needs_human` がある場合は `decision = stop_needs_human`。
- scope violation がある場合は loop を継続せず stop する。
- changed files が明示的 `allowed_files` 外へ出た状態を success と扱わない。

### `harness-improvement`

Canonical Skill source は `.agents/skills/harness-improvement/references/improvement-workflow.md`。

Candidate fields:

```text
candidate_id
target
failure_category
source_runs
evidence
expected_impact
risk
recommended_change
strictness
status
owner_decision
```

Allowed values:

```text
strictness: normal | strict | blocked
status: proposed | accepted | rejected | deferred | implemented
owner_decision: not_reviewed | approved | rejected | needs_more_evidence
```

Evidence は必須。

Repository-specific target catalog / strictness mapping は `docs/reference/harness-improvement-loop.md` が current mapping を持つ。ただし、この文書が参照する failure taxonomy の具体 source は Plan 作成時の調査では canonical file を解決できていない。PR4実装ではここを推測で補完せず、Phase 0 で current source を確定する。

### `exploratory-qa`

Canonical portable source は次の2つ。

- `.agents/skills/exploratory-qa/references/workflow.md`
- `.agents/skills/exploratory-qa/references/scored-mode.md`

Repository-side Machine Contract は既存 `scripts/agentic-qa/**` に存在する。

特に `scripts/agentic-qa/contracts.ts` にはすでに Zod schema と relation validation があり、例として次を扱っている。

- schema version
- `run_id` format
- coverage ID / challenge ID format
- spec reference format
- required coverage ID uniqueness
- evidence ref syntax
- coverage status と `mission_completed` の consistency
- allowed evidence type
- tool / isolation contract

PR4ではこれらの schema を Skill 側へコピーしない。Existing contract を呼び出して、validation result を PR4 の共通 result format へ変換する adapter に留める。

### `android-native-local-validation`

Canonical portable source は `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`。

Workflow上は deterministic な rule が存在する。

- upstream gate failure 後に downstream stage を PASS としない。
- blocked / not executed stage を PASS と報告しない。
- failure classification は明示された allowed set を使う。
- required gate 全体が成立して初めて completion とする。

一方、Skill自身にはこれらを表す stable machine-readable Output schema が明示されていない。既存 Native helper / Run Artifact に authoritative な result schema があるかを Phase 0 で確認し、存在しなければ「grader のために Output schema を新設する」のではなく N/A とする。

### Assumptions

- 既存 Production Output format は grader を作りやすくする目的では変更しない。
- 新規 dependency は不要で、既存 TypeScript / Node.js / Zod / Vitest で実装できる想定とする。
- 共通 machine-readable result は **evaluator の出力**であり、各 Skill の Production Output Contract ではない。
- Text系 Skill の grader は UTF-8 Markdown / text を input とし、既存の section / field marker を最小限 parse する。
- Repository Machine Contractを利用する Skillでは、adapter は既存 schema / validator を import または既存公開関数経由で呼び出し、同じ rule を再実装しない。

### Non-goals

- Trigger Eval dataset / runner の実装。
- Skill frontmatter description の変更・最適化。
- Semantic Output Eval。
- LLM Judge / rubric grader。
- Workflow E2E Eval。
- Agent Runtime / Agent Runner / Workflow Engine の新設。
- 自動 repair / retry。
- Golden Output全文一致。
- 全Skillを同じ Output schema に移行すること。
- generic Markdown AST framework の導入。
- generic rule DSL / plugin system の導入。
- Product Code / Product behavior の変更。
- `.codex/agents/**` の変更。

---

## 3. 質問 / 曖昧性

### 必ず実装前に解消する不透明点

#### A. Harness failure taxonomy の current authority

`docs/reference/harness-improvement-loop.md` が参照する failure taxonomy の concrete source を current repository から確定する。

- current canonical file / module が存在する場合はその source を再利用する。
- path rename / migration 済みなら current source に追従する。
- authoritative source が存在しない場合、PR4だけのために taxonomy を新設しない。
- source を解決できない場合、その check は N/A / blocked として理由を固定し、candidate field / allowed values / evidence 等の確実に判定できる領域だけを grader 対象にする。

#### B. Native validation result contract

Native helper / Run Artifact / existing contract test を確認し、stage result / classification / completion を表す stable machine-readable contract がすでに存在するかを確定する。

- 存在する場合は adapter で再利用する。
- 存在しない場合は PR4 では N/A とする。
- evaluator のためだけの新しい Native execution result schema は作らない。

### 仮定してよい細部

- evaluator の共通 JSON field 名は、既存 Repository convention と衝突しない範囲で局所的に決めてよい。
- test fixture の具体文言は canonical contract の意味を変えず、minimum valid / invalid case として作成してよい。
- dedicated script 名は既存 script naming convention に合わせる。

### 未回答のユーザー質問

なし。Issue #117 に PR4 の目的・境界・完了条件が明示されているため、Plan作成時点でユーザー判断が必要な blocker はない。

---

## 4. 影響範囲

### Impacted areas

実装時の主な変更候補は以下。

```text
.agents/skills/<skill>/evals/output/**
.agents/skills/<skill>/scripts/**          # Skill固有graderが必要な場合のみ
scripts/skill-output-eval/**               # 最小runner / adapter / result型
 tests/contracts/skill-output-eval.test.ts
package.json
```

`evals/output/` は形式だけのために6 Skillすべてへ作らない。N/A Skillには空 Directory を作らず、Repository-level inventory で理由を固定する構成を優先する。

### Existing sources to inspect and preferably keep read-only

```text
.agents/skills/feature-plan/assets/plan-template.md
.agents/skills/feature-plan/references/planning-workflow.md
.agents/skills/code-review/references/review-workflow.md
.agents/skills/repair-loop/references/repair-workflow.md
.agents/skills/harness-improvement/references/improvement-workflow.md
.agents/skills/exploratory-qa/references/workflow.md
.agents/skills/exploratory-qa/references/scored-mode.md
.agents/skills/android-native-local-validation/references/windows-android-workflow.md
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/coverage.ts
scripts/agentic-qa/evaluate.ts
scripts/agentic-qa/canonical-artifact-manifest.ts
docs/reference/harness-improvement-loop.md
scripts/native/windows/**
tests/contracts/spec-agentic-qa.test.ts
tests/contracts/official-black-box-contracts.test.ts
tests/contracts/native-windows-local-validation.test.ts
```

### Expected no-change areas

- Product source。
- Product Runtime behavior。
- Skill frontmatter `description`。
- PR2 Trigger Eval dataset / runner。
- PR3 description optimization。
- PR5 Semantic Eval。
- PR6 Workflow E2E Eval。
- `.codex/agents/**`。
- dependency / lockfile。既存 dependency で実現できる限り変更しない。

---

## 5. 変更方針

### Phase 0: Output Contract inventory と authority freeze

実装前に6 Skillを同じ手順で棚卸しする。

各 deterministic check について、最低限次を記録する。

```text
skill
check_id
canonical_source
input_representation
invariant
valid_case
invalid_case
semantic_excluded
implementation_mode: grader | adapter | N/A
```

この Phase で先に N/A 判定を許可する。grader を書いた後で正当化するのではなく、canonical machine contract が存在するかを先に確認する。

特に次を確定する。

1. `harness-improvement` の failure taxonomy current authority。
2. `android-native-local-validation` の stable machine-readable execution result の有無。
3. `exploratory-qa` で再利用すべき既存 public schema / validator function。
4. Text系 Skillで、現在の heading / field marker が canonical contract として十分安定している範囲。

### Phase 1: 最小の evaluator result contract

Repository-level runner は Skill 固有 rule を持たず、grader / adapter の結果を同じ machine-readable shape で返すことだけを担当する。

候補形:

```json
{
  "schema_version": 1,
  "skill": "repair-loop",
  "status": "pass",
  "checks": [
    {
      "check_id": "repair-loop.decision.allowed-value",
      "passed": true,
      "message": "decision is allowed"
    }
  ]
}
```

必要最低限の契約は以下。

- `schema_version` は evaluator result schema の version。
- `skill` は対象 Skill 名。
- `status` は少なくとも `pass` / `fail`。
- `checks[]` は stable `check_id`、boolean result、diagnostic message を持つ。
- fail check が1件でもあれば overall `fail`。
- CLI は `pass` で exit 0、`fail` で non-zero。
- N/A Skill は false PASS を返さず、inventory 上で N/A reason を持つ。

共通 runner は6 Skillを explicit registry / map で接続する程度に留め、dynamic plugin discovery や generic rule language を作らない。

### Phase 2: Skill別 grader / adapter

#### 2-A. `feature-plan`

Text / Markdown grader を実装する。

最低限確認する invariant:

- canonical Plan section が存在する。
- `Goal` / 完了条件が空でない。
- `Current understanding` と `Assumptions` を区別する領域がある。
- `Non-goals` が存在する。
- `Impacted areas` / `Files to inspect` 相当の変更範囲がある。
- `Change strategy` が存在する。
- `Validation plan` が存在する。
- `Risks` / `Open questions` が存在する。
- 成果物が明示されている。

判定しないもの:

- Plan が技術的に正しいか。
- risk の重要度が妥当か。
- strategy が最適か。
- wording / paragraph count / exact sentence。

Invalid fixture 例:

- Validation section omission。
- Non-goals omission。
- Goal heading はあるが本文が空。
- Required section 名に似た自由文があるだけで canonical section がない false-pass case。

#### 2-B. `code-review`

Finding-oriented text grader を実装する。

Finding が1件以上ある場合、各 finding で次の field を要求する。

```text
Severity
Title
Location
Why it matters
Evidence
Suggested fix
Open questions
Verdict
confidence
```

No-findings case では、Finding field を無理に要求せず、contract に従い次を確認する。

- residual risk が記載されている。
- unvalidated area が記載されている。

Invalid fixture 例:

- Finding から `Evidence` が欠落。
- `Location` が欠落。
- no-findings と主張するが residual risk / unvalidated area がない。

Severity の意味妥当性や Finding の correctness は PR5 領域なので判定しない。

#### 2-C. `repair-loop`

Iteration record grader を実装する。

Required fields:

```text
iteration_number
input_findings
repair_plan
allowed_files
changed_files
validation_commands
validation_result
remaining_delta
decision
```

Deterministic relation:

- `decision` は canonical allowed set に含まれる。
- triage classification は canonical allowed set に含まれる。
- `needs_human` が存在すれば `decision = stop_needs_human`。
- scope violation が成立している record を `continue` / `stop_success` にしない。
- `allowed_files` と `changed_files` が明示 list として parse 可能な場合、out-of-scope file を検出する。
- validation を実行したと主張する iteration で `validation_result` を欠落させない。

Invalid fixture 例:

- unknown decision。
- `needs_human` + `continue`。
- `changed_files` が `allowed_files` 外なのに `stop_success`。
- `validation_result` omission。

#### 2-D. `harness-improvement`

Candidate grader を実装する。

Required fields:

```text
candidate_id
target
failure_category
source_runs
evidence
expected_impact
risk
recommended_change
strictness
status
owner_decision
```

Deterministic checks:

- required field omission。
- `strictness` allowed value。
- `status` allowed value。
- `owner_decision` allowed value。
- `evidence` が空でない。
- current authoritative target catalog に照合可能な場合は unknown target を検出する。
- current authoritative failure taxonomy が解決できた場合だけ `failure_category` を照合する。

Failure taxonomy source が解決できない場合、その check を grader 内で hard-code しない。field presence の評価は継続し、taxonomy membership check は明示 N/A とする。

Invalid fixture 例:

- evidence omission。
- invalid `strictness`。
- invalid `status` / `owner_decision`。
- authoritative catalog がある場合の unknown target。

#### 2-E. `exploratory-qa`

新しい schema grader を作らず、既存 `scripts/agentic-qa/**` Machine Contract への adapter を実装する。

再利用対象例:

- Zod schema parse。
- coverage ID / challenge ID format。
- required coverage uniqueness。
- evidence reference syntax。
- status / `mission_completed` consistency。
- artifact / reference relation。

Adapter は既存 validation failure を stable `check_id` と evaluator result へ変換する。既存 schema と同じ regex / enum / relation をコピーしない。

Fixture は既存 fixture を再利用できる場合は再利用する。PR4専用 fixture が必要な場合も、既存 contract を通す入力だけを追加する。

Invalid case 例:

- duplicate coverage ID。
- `completed` なのに `mission_completed = false`。
- malformed evidence ref。
- schema 上 required entity omission。
- authoritative reference relation failure。

#### 2-F. `android-native-local-validation`

Phase 0 で existing machine-readable result contract を探す。

存在する場合だけ adapter を実装し、少なくとも次の existing invariant を current contract に合わせて検証する。

- stage status / order consistency。
- failure classification allowed value。
- blocked / not-executed stage を PASS と扱わない。
- required upstream failure 後の downstream success claim を許可しない。
- completion claim と required gate result の consistency。

stable contract が存在しない場合:

```text
N/A: portable workflowにはdeterministicな停止・完了規則があるが、
現在のProduction Outputを表すstable machine-readable serializationがない。
PR4のgrader都合で新しいOutput schemaを導入するとSkillのOutput Contract変更になるため、
このPRでは評価対象外とする。
```

この N/A は未実装扱いではなく、PR4 の境界判断として contract test / inventory で固定する。

### Phase 3: Fixture と false-pass regression test

各実装 grader / adapter に次を用意する。

- minimum valid fixture。
- required omission fixture。
- relation / allowed value / reference failure fixture。
- near-valid false-pass regression fixture。

Testでは overall fail だけでなく、期待する check ID を確認する。

例:

```text
repair-loop.required.validation-result
repair-loop.decision.allowed-value
repair-loop.scope.changed-files-contained
```

check ID は test と machine-readable result の安定した接続点とし、人間向け diagnostic message の全文一致には依存しない。

### Phase 4: Repository command と quality path 接続

Dedicated command を追加する。

候補:

```text
pnpm run validate:skill-output-evals
```

責務:

- 指定 fixture / input を grader へ渡す。
- machine-readable JSON を stdout または明示 output へ出す。
- deterministic failure を non-zero exit へ反映する。

CI workflow を直接増やす前に、既存 `pnpm run test:contracts` / `pnpm run verify` の到達性を利用する。

優先順位:

1. `tests/contracts/skill-output-eval.test.ts` を既存 `test:contracts` に含める。
2. `verify` が `test:contracts` を通じて必ず fixture contract test を実行することを確認する。
3. dedicated validation command 自体の contract test / smoke を追加する。
4. 現行 Web CI が `verify` または該当 contract test を実行しているなら workflow YAML は変更しない。
5. CIから到達しないことが確認された場合だけ、既存 quality job へ最小接続する。

PR4専用の新 workflow や matrix は作らない。

### Phase 5: Scope / semantic freeze の最終確認

実装完了時に次を diff で確認する。

- 6 Skill frontmatter `description` に変更がない。
- Trigger Eval dataset / description optimization を追加していない。
- Semantic rubric / LLM Judge を追加していない。
- Workflow E2E runner を追加していない。
- Product Codeを変更していない。
- `.codex/agents/**` を変更していない。
- existing `scripts/agentic-qa/**` schema を不要に複製・改変していない。
- dependency / lockfile を不要に変更していない。

---

## 6. 検証方法

### Targeted validation

実装後はまず dedicated contract test を実行する。

```bash
pnpm exec vitest run tests/contracts/skill-output-eval.test.ts --no-file-parallelism --maxWorkers=1
```

確認内容:

- 全 grader / adapter の valid fixture が PASS。
- required omission fixture が期待 check ID で FAIL。
- relation / enum / reference fixture が期待 check ID で FAIL。
- N/A Skill の理由が inventory と一致。
- JSON result が parse 可能。
- fail input で CLI exit code が non-zero。

### Repository integration validation

```bash
pnpm run validate:skill-output-evals
pnpm run validate:skills
pnpm run test:contracts
pnpm run typecheck
pnpm run format:check
pnpm run lint:markdown
pnpm run verify
git diff --check
```

### Scope validation

実装差分について最低限次を確認する。

- Skill `description` diff = 0。
- `.codex/agents/**` diff = 0。
- Product source diff = 0。
- Trigger / Semantic / E2E Eval implementation diff = 0。
- dependency / lockfile diff = 0 を期待値とする。変更が必要になった場合は実装を止め、既存 dependency で代替できない根拠を再確認する。

### 成功判定

- Issue #117 PR4 の6 Skill coverage inventory と実装状態が1対1で説明できる。
- grader が invalid fixture を意図した check で確実に落とす。
- existing Machine Contract の duplication がない。
- machine-readable JSON と exit status の両方で自動判定できる。
- `pnpm run verify` が PASS する。

---

## 7. リスクと未解決論点

### Risk 1: Free-form text parser の過剰制約

Text Skill は自由文 Output を持つため、grader が Markdown wording や見出し順を過剰に固定すると正しい Output を false-negative にする。

対策:

- canonical contract が明示する section / field marker のみを評価する。
- sentence / paragraph / wording exact match をしない。
- semantic quality は PR5 へ残す。

### Risk 2: False-pass を避けようとして semantic judge 化する

「Evidenceが妥当か」「Riskが十分か」まで判定し始めると deterministic scope を超える。

対策:

- existence、allowed value、format、uniqueness、reference relation、state consistency に限定する。
- content quality は存在確認と最低限の non-empty check までにする。

### Risk 3: Existing Machine Contract の二重実装

特に `exploratory-qa` は既存 schema が大きく、PR4用に部分コピーすると将来 drift する。

対策:

- adapter only を原則とする。
- regex / enum / relation を PR4側へ再記述しない。
- existing contract の public surface が不足する場合は、最小 export / helper 化が本当に必要かを先に検証する。

### Risk 4: Harness taxonomy authority の不整合

Repository reference が示す failure taxonomy の concrete source が current tree と一致しない可能性がある。

対策:

- Phase 0 で authority を先に解決する。
- 解決できない場合は taxonomy membership check を N/A にする。
- PR4を理由に新 taxonomy を発明しない。

### Risk 5: Native Output schema を evaluator のために新設してしまう

Workflow rule は deterministic でも、Output serialization が stable contract でなければ grader の入力を定義できない。

対策:

- existing machine artifact がある場合だけ adapter を作る。
- なければ明示 N/A とする。
- Native machine result contract の新設が必要なら別 change として扱う。

### Risk 6: CI / command の重複

Dedicated command を追加した結果、同じ fixture suite を複数jobで重複実行すると保守コストが増える。

対策:

- existing `test:contracts` / `verify` の到達性を優先利用する。
- workflow YAML を変更するのは existing gate から到達しない場合だけにする。

### Open questions

- `harness-improvement` の current failure taxonomy authority はどこか。
- Native helperに stable machine-readable execution result contract が存在するか。
- `exploratory-qa` の既存 validation function のうち、PR4 adapter から直接再利用すべき public entry point はどれか。

これらは implementation前の Repository investigation で解消可能な technical unknown であり、現時点でユーザー判断を要求するものではない。

---

## 8. 成果物

### 今回の Plan-only branch で作成するもの

```text
docs/plans/2026-09-06_125426_issue-117-pr4-deterministic-output-eval.md
```

これ以外は今回作成しない。

### 後続実装で想定する成果物

最終 path は Phase 0 の authority inventory 後に existing structure と整合させるが、責務としては次を想定する。

- 6 Skill deterministic coverage inventory。
- 評価対象 Skill の package-local output eval fixture / grader。
- existing Machine Contract adapter。
- 最小 Repository-level evaluator runner / result type。
- machine-readable evaluation result。
- valid / invalid fixture contract test。
- dedicated package command。
- 必要な場合だけ既存 quality gate への最小接続。

N/A Skill に空 `evals/` Directory や fake grader は作らない。

---

## 9. 備考

- Refs: Issue #117。
- 前提PR: PR #123（PR1: Skill package構造整理・Portability対応、merge済み）。
- PR4 は PR2 / PR3 の完了を待たず、PR1 merge後の `main` から独立して実装できる。
- PR5 Semantic Output Eval は PR4 で deterministic / semantic 境界を明確にした後に進める。
- この Plan commit では実装を行わない。grader、fixture、script、package command、CI、Skill contract の変更は後続実装で行う。
