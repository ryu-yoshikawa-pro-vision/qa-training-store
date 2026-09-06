# Issue #117 PR4 — Deterministic Output Eval

## 0. 依頼概要

- 依頼内容: Issue #117 の PR4 として、6つの Agent Skill の Output のうち、機械的・決定論的に判定可能な品質を評価する仕組みを実装するための Plan を作成する。
- 背景: PR1 で6 Skillの portable package 化と責務分離が完了したため、その構造を前提に、既存 Output Contract のうち deterministic に評価可能な範囲を棚卸しし、評価可能な部分だけを既存 validator の直接再利用または最小 grader で検証可能にする。
- PR4 の役割: PR5 Semantic Output Eval の前段として、required section / field、allowed value、ID / reference integrity、status / stop consistency、artifact integrity など、人間や LLM Judge を使わずに判定できる領域を固定する。
- Base: `main` の PR1 merge commit `1f680e1bd91bbf6aa9cfb4d4bc7c5816f659605c`。
- 期待成果: 6 Skillすべてについて deterministic evaluation の適用可否と根拠を明示し、**stable な入力表現が既に存在する評価可能な Skill にだけ**既存 validator の直接再利用または最小 grader と valid / invalid fixture を用意する。
- この Plan 作成・修正時点では実装しない。この branch では正本 Plan のみを更新し、grader、fixture、script、CI、Skill 本文は変更しない。

---

## 1. ゴール / 完了条件

### ゴール

既存の Skill Output Contract を evaluator の都合で変更せず、現在すでに存在する deterministic な property / relation / invariant のうち、**既存の stable serialization / artifact / template / Machine Contract を入力として安全に評価できるものだけ**を機械評価する。

PR4で重要なのは「6 Skillすべてに新しい grader を作ること」ではない。

重要なのは次の3点である。

1. 6 Skillすべてについて機械評価可能範囲を棚卸しする。
2. 既存 validator / schema があるものは新しい adapter 層を挟まず、可能な限り contract test から直接再利用する。
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
- Phase 0 が完了するまで、各 Skill の grader 実装を確定事項として扱わない。
- N/A を減らすこと自体を目的にしない。
- PR4ではCLI、runtime registry、PR4専用 package script、GitHub Actions workflowを追加しない。

### 完了条件（DoD）

- [ ] 6 Skillすべてについて deterministic evaluation 対象を棚卸しし、`existing-validator reuse` / `minimal grader` / `N/A` のいずれかを明示する。
- [ ] 各分類について canonical source と input representation が明示されている。
- [ ] `existing-validator reuse` は既存 schema / validator / artifact contract を直接再利用し、rule を二重実装していない。
- [ ] `minimal grader` は stable canonical serialization / template が既に存在する場合にのみ採用している。
- [ ] `N/A` は未実装ではなく、stable serialization 不在・authority 不在等の理由を明示した PR4 の境界判断として固定されている。
- [ ] expected data は自然言語全文ではなく property / relation / invariant を表している。
- [ ] Output 全文 exact match を使っていない。
- [ ] LLM Judge、Embedding、Semantic similarity を使っていない。
- [ ] evaluator のためだけに Skill の Production Output format を変更していない。
- [ ] evaluator のためだけに新しい Repository-wide taxonomy / workflow engine / plugin mechanism を作っていない。
- [ ] 評価対象 Skill ごとに少なくとも1件の valid fixture がある。
- [ ] 評価対象 Skill ごとに、実装した deterministic invariant を壊す代表的 invalid fixture がある。
- [ ] required omission を deterministic に判定できる grader / validator では omission を検出できる。
- [ ] unknown reference を authoritative catalog / schema で判定できる領域では検出できる。
- [ ] false-pass が起きやすい parser 境界が実際に存在する場合だけ near-valid regression fixture を追加する。
- [ ] invalid fixture に対し grader / validator が machine-readable な failure information を返す。
- [ ] contract test は invalid fixture が意図した failure reason で拒否されることを確認し、期待どおり拒否できた場合は test 自体は PASS する。
- [ ] existing validator の error 情報を不要に独自 check-id taxonomy へ再マッピングしていない。
- [ ] `tests/contracts/skill-output-eval.test.ts` が `pnpm run test:contracts` から実行され、`pnpm run verify` の既存 `test` 経路から到達する。
- [ ] PR4専用 CLI / runtime registry / package script / GitHub Actions workflow / matrix を追加していない。
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

PR4 は Output の意味品質全般を判定する PR ではない。correctness、relevance、coverage、risk-awareness、evidence の妥当性、提案の有用性などの semantic judgment は PR5 の責務であり、本PRへ持ち込まない。

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

### Skill別の初期棚卸し

以下は実装確定ではなく、Phase 0 で確認する初期仮説である。

| Skill | deterministic 候補 | stable input の初期見立て | Phase 0 後の候補 |
| --- | --- | --- | --- |
| `feature-plan` | canonical top-level heading の存在・一意性 | package-local template が存在 | `minimal grader` の可能性が高い |
| `code-review` | finding required fields、no-findings residual risk | 意味契約はあるが serialization は未確認 | stable serialization がなければ `N/A` |
| `repair-loop` | iteration fields、decision / triage relation、scope relation | 意味契約はあるが structured artifact の有無を要確認 | 既存validatorがあれば reuse、stable representationだけなら grader、なければ `N/A` |
| `harness-improvement` | candidate fields、enum、evidence、target / taxonomy relation | candidate serialization の有無を要確認 | 既存validatorがあれば reuse、stable serializationだけなら grader、なければ `N/A` |
| `exploratory-qa` | schema、ID、reference、coverage、evidence、status relation、artifact integrity | 既存 `scripts/agentic-qa/**` Machine Contract あり | `existing-validator reuse` |
| `android-native-local-validation` | stage order、failure classification、completion consistency | stable machine-readable result の有無を要確認 | 既存validatorがあれば reuse、なければ `N/A` |

### `feature-plan`

Canonical source候補:

- `.agents/skills/feature-plan/SKILL.md`
- `.agents/skills/feature-plan/assets/plan-template.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`

`SKILL.md` は package-local template を reusable output skeleton として使用し、Repository plan artifact として保存する契約を持つ。

現在の template は各section内に `- ゴール:` 等の placeholder 自体を持つため、「section body が non-empty」という判定では未記入templateもPASSし得る。

そのためPR4では body の充実度を判定しない。

Phase 0 で template heading が現在の canonical serialization と確認できた場合、最小 grader は次だけを評価する。

- required top-level heading が存在する。
- required top-level heading が重複していない。
- fenced code block 内の heading は実 section として数えない。

内容の十分性、placeholderが埋まっているか、技術的正しさ、risk / validation の質はPR5のsemantic評価へ残す。

### `code-review`

Canonical semantic source候補:

- `.agents/skills/code-review/SKILL.md`
- `.agents/skills/code-review/references/review-workflow.md`

Finding の意味上の required fields があっても、JSON field / 固定 Markdown label / canonical artifact としての stable serialization がなければ grader は作らない。

No-findings の判定を自然言語 regex で推測しない。

### `repair-loop`

Canonical semantic source候補:

- `.agents/skills/repair-loop/SKILL.md`
- `.agents/skills/repair-loop/references/repair-workflow.md`
- Skill Inputs から明示される Repository evaluation / artifact contract

Iterationには deterministic relation があるが、限定探索内で既存validatorまたはstable structured representationを確認できた場合だけ評価対象とする。

### `harness-improvement`

Canonical semantic source候補:

- `.agents/skills/harness-improvement/SKILL.md`
- `.agents/skills/harness-improvement/references/improvement-workflow.md`
- Skill Inputs から明示される Repository target catalog / taxonomy / artifact contract

Candidate modelの意味契約だけではgraderを作らない。stable serializationとauthorityが確認できるruleだけ評価する。

### `exploratory-qa`

Canonical portable source候補:

- `.agents/skills/exploratory-qa/references/workflow.md`
- `.agents/skills/exploratory-qa/references/scored-mode.md`

Repository-side Machine Contract候補:

- `scripts/agentic-qa/contracts.ts`
- `scripts/agentic-qa/coverage.ts`
- `scripts/agentic-qa/evaluate.ts`
- `scripts/agentic-qa/canonical-artifact-manifest.ts`

既存 schema / validator はすでにexportされ、既存contract testから直接importされている。

したがってPR4では、必要な既存 schema / validator を `tests/contracts/skill-output-eval.test.ts` から直接 import / call することを第一選択とする。

新しい `exploratory-qa adapter` file は原則作らない。

PR4側へ regex / enum / relation をコピーしない。

### `android-native-local-validation`

Canonical portable source候補:

- `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`

Workflow上のdeterministic ruleは存在するが、Production Outputを表すstable machine-readable contractと既存validatorが確認できた場合だけ直接再利用する。

stable result contractはあってもvalidatorがなく、PR4で新validatorを作ることがProduction Output Contract変更にならないと明確に判断できる場合のみ minimal grader を検討する。

それ以外はN/Aとする。

### Assumptions

- 新規 dependency は不要で、既存 TypeScript / Node.js / Zod / Vitest で実装できる想定とする。
- Machine-readable result は全Skillで同一shapeに正規化しない。既存validatorは既存structured result / issueをそのまま利用し、minimal graderだけ必要最小限のlocal structured resultを返す。
- PR4専用CLI、runtime registry、package scriptは不要。
- PR4専用CI workflowは不要。`test:contracts -> test -> verify` の既存経路を正本とする。

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

---

## 3. 質問 / 曖昧性

### ユーザー判断が必要な blocker

なし。

### 実装時にRepository調査で解消するtechnical unknown

- `code-review` に stable serialized review output が存在するか。
- `repair-loop` に stable structured iteration artifact / direct validator が存在するか。
- `harness-improvement` に stable candidate serialization、direct validator、current taxonomy authority が存在するか。
- `android-native-local-validation` に stable machine-readable execution result / direct validator が存在するか。
- `exploratory-qa` でPR4のfixtureから直接呼ぶ既存 schema / validator はどれか。

これらは次のPhase 0の限定探索で解消する。限定探索を超えてRepository archaeologyを行わない。

---

## 4. 影響範囲

### 実装時の候補

Phase 0 で実装対象が確定した後に必要なものだけ追加する。

```text
.agents/skills/<skill>/scripts/**           # portableなSkill固有minimal graderが必要なSkillのみ
.agents/skills/<skill>/evals/output/**      # portableなSkill固有fixtureが必要なSkillのみ
tests/contracts/skill-output-eval.test.ts   # 6 Skill coverage + direct validator reuse + grader fixture test
```

原則変更しない:

```text
scripts/skill-output-eval/**
package.json
.github/workflows/**
```

### 配置責務

#### Skill package内へ置くもの

- Skill自身のportableなOutput Contractだけで完結するminimal grader。
- Skill自身のportableなfixture。
- そのSkillを別Repositoryへ移しても意味が成立するdeterministic helper。

例: `feature-plan` の canonical plan heading grader。

#### Repository-levelで新設しないもの

- PR4専用adapter。
- PR4専用common result normalizer。
- PR4専用runtime registry。
- PR4専用CLI。

既存Repository Machine Contractを使う場合は、contract testから既存exportを直接import / callする。

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

### Phase 0: 限定されたOutput Contract inventoryと実装Scope確定

Phase 0はRepository全体の考古学調査にしない。

各Skillについて、次の順番だけを調べる。

1. `.agents/skills/<skill>/SKILL.md`。
2. `SKILL.md` から直接参照される `references/` / `assets/` / `scripts/`。
3. `SKILL.md` の Inputs から明示的に接続される Repository contract / mapping。
4. 上記Outputを**直接**validateしている既存 schema / validator / contract test。

ここまででstable serialization / authoritative validatorが確認できなければ、そのSkillまたはそのruleはN/Aとする。

次は禁止する。

- 関連しそうな旧artifactを広範囲に探し続ける。
- 「流用できそう」という理由だけで別用途artifactをOutput Contractへ昇格する。
- graderを作るためにserializationを推測・新設する。
- N/Aを避けるために探索範囲を広げる。

Phase 0で各Skillについて最低限次を確定する。

```text
skill
canonical_source
input_representation
stable_serialization: yes | no
deterministic_invariants
artifact_integrity_check: existing | not-applicable | unavailable
implementation_mode: existing-validator reuse | minimal grader | N/A
n/a_reason                  # N/A時のみ
semantic_excluded
```

#### A. `existing-validator reuse`

採用条件:

- 既存 machine-readable schema / validator / artifact contract がある。
- PR4のcontract testから既存exportを直接呼べる。

実装:

- `tests/contracts/skill-output-eval.test.ts` から既存 schema / validator を直接 import / call する。
- 既存の machine-readable issue / safeParse result 等をそのまま利用する。
- ruleをコピーしない。
- direct callできるのにadapter fileを作らない。

#### B. `minimal grader`

採用条件:

- 既存 stable canonical template / serialization がある。
- 専用validatorはまだない。
- grader追加がProduction Output format変更にならない。

実装:

- canonical formだけを見る。
- required presence / uniqueness / allowed value / deterministic relationに限定する。
- alias / fuzzy match / semantic parseを行わない。
- Skill package内に閉じる。

#### C. `N/A`

採用条件:

- semantic contractはあるがstable serializationがない。
- authoritative catalog / taxonomy / result contractが限定探索で解決できない。
- grader追加が事実上新しいProduction Output formatを定義してしまう。

実装:

- graderを作らない。
- N/A reasonをcontract test内の6 Skill coverage tableに残す。
- empty directory / fake fixture / placeholder parserを作らない。

### Phase 1: 6 Skill coverageはcontract test tableをSSOTにする

PR4ではruntime registry / CLIを作らないため、6 Skill coverageのSSOTは `tests/contracts/skill-output-eval.test.ts` 内の小さなstatic tableに固定する。

概念例:

```ts
const outputEvalCoverage = [
  { skill: "feature-plan", mode: "minimal-grader" },
  { skill: "code-review", mode: "n/a", reason: "..." },
  { skill: "exploratory-qa", mode: "existing-validator-reuse" },
] as const;
```

同じ情報を別のinventory JSON / Markdown / registryへ複製しない。

Contract testでは対象6 Skillが重複なく全て分類されていることを確認する。

### Phase 2: Phase 0でA/Bに分類されたSkillだけ実装

以下は候補であり、Phase 0の結果を上書きしない。

#### 2-A. `feature-plan` — `minimal grader` 候補

Phase 0で package-local template がstable canonical serializationと確認できた場合のみ実装する。

評価対象:

- canonical required top-level headingの存在。
- canonical required top-level headingの一意性。

評価しないもの:

- section bodyがnon-emptyか。
- template placeholderが埋まっているか。
- content completeness。
- wording / paragraph count。
- technical correctness。
- risk / validation planの質。

false-pass防止:

- fenced code block内のheadingは実sectionとして数えない。
- 実装はline-by-lineでfence状態を追跡する程度に留める。
- Markdown AST parserや新dependencyは導入しない。

禁止:

- heading alias辞書。
- fuzzy match。
- semantic heading classification。
- placeholder field parser。

Fixture候補:

- minimum valid。
- required heading omission。
- required heading duplicate。
- required headingがfenced code block内にしか存在しないfalse-pass case。

#### 2-B. `code-review` — Phase 0判定

stable serialized review artifact / canonical field markerと既存validatorが確認できた場合は既存validatorを直接再利用する。

stable serializationはあるがvalidatorだけがない場合、Production Output formatを変更せずごく小さいgraderを作れると明確に判断できるruleだけ minimal graderを検討する。

それ以外はN/A。

禁止:

- `no findings` を自然言語regexで推測する。
- `Severity:` 等のlabelをgrader側で新規必須化する。
- severity enumを新設する。

#### 2-C. `repair-loop` — Phase 0判定

stable structured iteration artifactと既存validatorが確認できた場合は直接再利用する。

stable structured representationだけがありvalidatorがない場合は、次のうち既存representation上で確実に判定できるruleだけminimal grader候補とする。

- decision / triage allowed value。
- `needs_human -> stop_needs_human`。
- `changed_files ⊆ allowed_files`。
- scope violationとsuccess / continueの不整合。
- required validation result omission。

stable representationがなければN/A。

自由文からfile listを独自parseしない。grader都合でiteration schemaを新設しない。

#### 2-D. `harness-improvement` — Phase 0判定

stable candidate serializationと既存validatorが確認できた場合は直接再利用する。

stable serializationだけがありvalidatorがない場合は、authorityが確認できる範囲だけminimal grader候補とする。

- required field omission。
- 既存contractで明示されたallowed values。
- authoritative target catalogが解決できる場合のunknown target。
- authoritative failure taxonomyが解決できる場合のunknown category。

`evidence non-empty` のように「文字が存在する」ことしか見られず意味的妥当性を保証できないruleは、実装価値が低ければ無理に入れない。

current authorityが解決できないruleはN/Aとし、PR4でtaxonomyを新設・修復しない。

#### 2-E. `exploratory-qa` — `existing-validator reuse` 候補

新しいschema graderもadapterも作らず、既存 `scripts/agentic-qa/**` Machine Contractを直接再利用する。

Phase 0で次を確認する。

- PR4 fixtureから直接呼ぶ既存 schema / validator。
- ID / uniqueness / reference / allowed value / status relationの既存validation範囲。
- `canonical-artifact-manifest` 等を含むartifact integrity checkの既存範囲。

既存validation issueに `code` / `path` 等があれば、それをfailure識別に使う。

独自global check IDへ変換しない。

新しい `scripts/skill-output-eval/exploratory-qa-adapter.ts` 等は作らない。

#### 2-F. `android-native-local-validation` — Phase 0判定

stable machine-readable execution result contractと既存validatorが確認できた場合は直接再利用する。

既存validatorがなく、minimal grader追加がProduction Output Contract変更にならないと明確に判断できる場合だけminimal graderを検討する。

それ以外は次の趣旨でN/Aを固定する。

```text
N/A: workflow上のdeterministic ruleは存在するが、
現在のProduction Outputを安全に評価できるstable machine-readable contract / validatorがない。
PR4のgrader都合で新しいOutput schemaを導入するとOutput Contract変更になるため、
このPRでは評価対象外とする。
```

### Phase 3: Machine-readable resultは各既存contract / graderのstructured resultを使う

PR4共通result schemaやnormalizerは作らない。

#### Existing validator reuse

- Zod `safeParse` result / issues等、既存のmachine-readable resultをそのままtestで扱う。
- 既存 `code` / `path` 等をfailure識別に利用する。
- PR4共通 `{ skill, status, issues }` へ変換しない。

#### Minimal grader

Skill-localで必要最小限のstructured resultを返す。

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

- local graderで必要な `valid` / `issues` 程度に留める。
- `schema_version`、timestamp、grader version、metrics等を追加しない。
- human向け `message` 全文をtest contractにしない。
- Repository-wide/globalなcheck-ID taxonomyを作らない。

### Phase 4: Fixture / contract test

各評価対象Skillに必要最小限を用意する。

必須:

- 1件以上のvalid fixture。
- 実装するdeterministic invariantを壊す代表invalid fixture。

追加:

- required omissionを扱うgrader / validatorならomission fixture。
- uniquenessを扱うgrader / validatorならduplicate fixture。
- reference integrityを扱うvalidatorならunknown reference fixture。
- parser false-pass境界が実際にある場合だけnear-valid regression。

Testは単なるoverall failureだけではなく、既存 `code/path` またはlocal `rule/path` で意図した失敗理由を確認する。

重要:

- invalid fixtureが拒否されたことは期待動作なので、そのcontract testはPASSする。
- `pnpm run test:contracts` がnon-zeroになるのは、grader / validatorが期待どおりの判定をできずcontract test自体が失敗した場合である。
- invalid fixture単体の期待failureと、test commandのexit codeを混同しない。

### Phase 5: Canonical validation pathを既存quality gateへ一本化

PR4のfixture suiteの正本は次とする。

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

### Phase 6: Scope freeze

実装完了時にdiffで次を確認する。

- Skill `description`変更なし。
- Trigger Eval / Semantic Eval / Workflow E2E実装なし。
- Product source変更なし。
- `.codex/agents/**`変更なし。
- `.github/workflows/**`変更なし。
- `package.json`変更なし。
- existing Machine Contractのschema / regex / enum / relationの不要な複製なし。
- dependency / lockfile変更なし。
- PR4専用adapter / common result normalizer / CLI / runtime registry追加なし。
- N/A回避目的の新Output schema / template / taxonomy追加なし。

---

## 6. 検証方法

### Targeted contract test

```bash
pnpm exec vitest run tests/contracts/skill-output-eval.test.ts --no-file-parallelism --maxWorkers=1
```

確認内容:

- 6 Skillが重複なく `existing-validator-reuse` / `minimal-grader` / `N/A` に分類される。
- valid fixtureがPASS。
- invalid fixtureが期待する既存 `code/path` またはlocal `rule/path` で拒否される。
- N/A理由が空でない。
- `feature-plan` を実装した場合、required top-level heading omission / duplicateを検出する。
- `feature-plan` を実装した場合、fenced code block内headingだけではrequired heading存在扱いにならない。
- `exploratory-qa` は新しいadapterを経由せず、既存Machine Contractを直接呼んでvalidationする。

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
Product source diff = 0
Trigger / Semantic / E2E Eval implementation diff = 0
dependency / lockfile diff = 0
PR4専用adapter / CLI / runtime registry diff = 0
```

### 成功判定

- Issue #117 PR4の6 Skill coverageを1対1で説明できる。
- 評価対象はstable inputまたは既存authoritative validatorを持つものだけ。
- invalid fixtureを意図したmachine-readable reasonで拒否できる。
- existing Machine Contract duplicationがない。
- 既存validatorを直接再利用できる箇所に不要なadapter層がない。
- `pnpm run test:contracts` から検証され、既存 `test -> verify` 経路にも自然に含まれる。
- 新しいCLI / package script / CI workflowなしでgateされる。

---

## 7. リスクと未解決論点

### Risk 1: Phase 0調査が広がる

対策:

- `SKILL.md -> direct references/assets/scripts -> declared Repository Inputs -> direct validators/tests` の限定順だけ確認する。
- ここで見つからなければN/A。
- 関連しそうな旧artifact探索を続けない。

### Risk 2: Free-form parserがOutput formatを事実上定義する

対策:

- stable serializationなしならN/A。
- feature-planのようにcanonical templateがある場合だけminimal grader。
- alias / fuzzy / semantic parse禁止。

### Risk 3: feature-planを過剰にparseする

対策:

- top-level required headingの存在・一意性だけ評価する。
- body completeness / placeholder completionは評価しない。
- line-by-lineでfenced code blockだけ除外する。
- Markdown ASTやdependencyは追加しない。

### Risk 4: Existing Machine Contractを二重実装する

対策:

- existing validator / schemaをcontract testから直接import / callする。
- direct callできる場合はadapterを作らない。
- existing `code/path`等をfailure識別に利用する。
- regex / enum / relationをコピーしない。

### Risk 5: inventoryのために新しいregistry層を作る

対策:

- 6 Skill coverageはcontract test tableをSSOTに固定する。
- inventory専用module / runtime registryを作らない。

### Risk 6: 共通result normalizationを作りたくなる

対策:

- existing validatorは既存resultをそのまま使う。
- minimal graderはlocal resultだけ定義する。
- PR4共通result schema / normalizerを作らない。

### Risk 7: Harness taxonomy authorityの不整合

対策:

- 限定探索でcurrent authorityが解決できた場合だけmembership check。
- 解決できなければそのruleはN/A。
- PR4でtaxonomyを新設・修復しない。

### Risk 8: Native Output schemaをgrader都合で新設する

対策:

- existing result contract / validatorがある場合だけ直接再利用する。
- なければN/Aを基本とする。

### Risk 9: invalid fixture failureとtest command failureを混同する

対策:

- invalid fixtureがmachine-readable failure resultになることをassertする。
- 期待どおりfailure resultならcontract testはPASS。
- commandのnon-zeroはcontract test自体が壊れた場合だけ。

### 実装時の判断ルール

迷った場合は次を上から確認する。

1. **このruleはsemantic判断か。**
   - はい -> PR5へ残す。
2. **stable serialization / authoritative validatorは限定探索内で確認できたか。**
   - いいえ -> N/A。
3. **既存validator / schemaをcontract testから直接呼べるか。**
   - はい -> 直接再利用する。adapterを作らない。
4. **graderのために新しいOutput formatを作ろうとしていないか。**
   - はい -> N/Aへ戻す。
5. **portableなSkill固有ruleだけで完結するか。**
   - はい -> package-local minimal grader候補。
6. **alias / fuzzy / DSL / plugin discovery / generic parserが必要になっていないか。**
   - はい -> scopeを縮小する。
7. **共通result normalizer / CLI / runtime registryが必要になっていないか。**
   - PR4では作らない。contract testで完結させる。
8. **同じruleを既存Machine Contractと新graderの両方で持とうとしていないか。**
   - はい -> 既存validator reuseへ戻す。
9. **N/Aを減らすこと自体が目的になっていないか。**
   - はい -> N/Aを受け入れる。

---

## 8. 成果物

### 今回のPlan-only branch

```text
docs/plans/2026-09-06_125426_issue-117-pr4-deterministic-output-eval.md
```

今回変更するのはこのPlanのみ。

### 後続実装で必須になる成果物

Phase 0結果に応じて必要なものだけ作る。

- `tests/contracts/skill-output-eval.test.ts`
  - 6 Skill coverage tableのSSOT。
  - existing validatorの直接再利用test。
  - minimal grader fixture test。
- 評価対象Skillでminimal graderが必要な場合だけ package-local grader。
- minimal graderがあるSkillだけ必要な valid / invalid fixture。

### 条件付き成果物

- package-local `scripts/`: portable minimal graderが本当に必要なSkillのみ。
- package-local `evals/output/`: portable fixtureが必要なSkillのみ。

作らないもの:

- N/A Skillの空directory。
- fake grader / placeholder parser。
- inventory専用module。
- Repository-level PR4 adapter。
- common result normalizer / schema。
- CLI / runtime registry / package script。
- PR4専用GitHub Actions workflow / matrix。
- global rule taxonomy / plugin framework。

### 現時点の最小実装見立て

Phase 0で現在の初期仮説どおりだった場合、最小構成は次を想定する。

```text
.agents/skills/feature-plan/
├── scripts/
│   └── <minimal heading validator>
└── evals/output/
    ├── <valid fixture>
    ├── <missing heading fixture>
    ├── <duplicate heading fixture>
    └── <fenced-heading-only fixture>

tests/contracts/
└── skill-output-eval.test.ts
```

`exploratory-qa` は新規adapterなしで既存 `scripts/agentic-qa/**` をtestから直接再利用する。

他4 Skillが限定探索でstable serialization / validatorなしと判定された場合、coverage tableへN/A理由を記録するだけでよい。

この小さい構成でIssue #117 PR4のDoDを満たせるなら、それ以上の共通基盤を追加しない。

---

## 9. 備考

- Refs: Issue #117。
- 前提PR: PR #123（PR1: Skill package構造整理・Portability対応、merge済み）。
- PR4はPR2 / PR3を待たずPR1 merge後のmainから実装できる。
- PR5 Semantic Output EvalはPR4でdeterministic / semantic境界を確定した後に進める。
- このPlan commitでは実装を行わない。