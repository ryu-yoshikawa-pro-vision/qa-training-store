# Issue #117 PR4 — Deterministic Output Eval

## 0. 依頼概要

- 依頼内容: Issue #117 の PR4 として、6つの Agent Skill の Output のうち、機械的・決定論的に判定可能な品質を評価する仕組みを実装するための Plan を作成する。
- 背景: PR1 で6 Skillの portable package 化と責務分離が完了したため、その構造を前提に、既存 Output Contract のうち deterministic に評価可能な範囲を棚卸しし、評価可能な部分だけを grader / existing-contract adapter / fixture で検証可能にする。
- PR4 の役割: PR5 Semantic Output Eval の前段として、required section / field、allowed value、ID / reference integrity、status / stop consistency、artifact integrity など、人間や LLM Judge を使わずに判定できる領域を固定する。
- Base: `main` の PR1 merge commit `1f680e1bd91bbf6aa9cfb4d4bc7c5816f659605c`。
- 期待成果: 6 Skillすべてについて deterministic evaluation の適用可否と根拠を明示し、**stable な入力表現が既に存在する評価可能な Skill にだけ** grader / adapter と valid / invalid fixture を用意し、結果を machine-readable に取得できるようにする。
- この Plan 作成・修正時点では実装しない。この branch では正本 Plan のみを更新し、grader、fixture、script、CI、Skill 本文は変更しない。

---

## 1. ゴール / 完了条件

### ゴール

既存の Skill Output Contract を evaluator の都合で変更せず、現在すでに存在する deterministic な property / relation / invariant のうち、**既存の stable serialization / artifact / template / Machine Contract を入力として安全に評価できるものだけ**を機械評価する。

PR4で重要なのは「6 Skillすべてに grader を作ること」ではない。

重要なのは次の3点である。

1. 6 Skillすべてについて機械評価可能範囲を棚卸しする。
2. stable な入力表現が既にあるものだけを grader / adapter 化する。
3. 意味上の Output Contract はあるが stable な serialization がないものは、grader のために新しい出力形式を発明せず N/A とする。

### 必須原則

- Output 全文の exact match を採用しない。
- LLM Judge、Embedding、Semantic similarity を使用しない。
- evaluator の都合で新しい Production Output schema / Markdown format / label convention を発明しない。
- 「意味上 field が定義されている」ことと「機械 parse 可能な serialization が定義されている」ことを区別する。
- 既存 Machine Contract がある領域は複製せず再利用する。
- 6 Skillを一律に同じ schema へ押し込まない。
- 巨大な共通 Rule Engine、独自 DSL、Plugin Framework、汎用 Markdown parser framework を作らない。
- deterministic に評価できない Skill / invariant は無理に実装せず N/A 理由を残す。
- Phase 0 が完了するまで、各 Skill の grader 実装を確定事項として扱わない。
- N/A を減らすこと自体を目的にしない。

### 完了条件（DoD）

- [ ] 6 Skillすべてについて deterministic evaluation 対象を棚卸しし、`existing-contract adapter` / `minimal grader` / `N/A` のいずれかを明示する。
- [ ] 各分類について canonical source と input representation が明示されている。
- [ ] `minimal grader` は stable canonical serialization / template が既に存在する場合にのみ採用している。
- [ ] `existing-contract adapter` は既存 schema / validator / artifact contract を再利用し、rule を二重実装していない。
- [ ] `N/A` は未実装ではなく、stable serialization 不在・authority 不在等の理由を明示した PR4 の境界判断として固定されている。
- [ ] expected data は自然言語全文ではなく property / relation / invariant として表現されている。
- [ ] Output 全文 exact match を使っていない。
- [ ] LLM Judge、Embedding、Semantic similarity を使っていない。
- [ ] evaluator のためだけに Skill の Production Output format を変更していない。
- [ ] evaluator のためだけに新しい Repository-wide taxonomy / workflow engine / plugin mechanism を作っていない。
- [ ] 評価対象 Skill ごとに少なくとも1件の valid fixture がある。
- [ ] 評価対象 Skill ごとに、実装した deterministic invariant を壊す代表的 invalid fixture がある。
- [ ] required omission を deterministic に判定できる grader では omission を検出できる。
- [ ] unknown reference を authoritative catalog / schema で判定できる領域では検出できる。
- [ ] false-pass が起きやすい parser 境界が実際に存在する場合だけ near-valid regression fixture を追加する。
- [ ] evaluator / validator の結果を machine-readable JSON として取得できる。
- [ ] deterministic evaluation failure 時は canonical validation entry point が non-zero exit を返す。
- [ ] 既存 Machine Contract の error 情報を不要に独自 check-id taxonomy へ再マッピングしていない。
- [ ] `tests/contracts/skill-output-eval.test.ts` が `pnpm run test:contracts` から実行され、`pnpm run verify` の既存 `test` 経路から到達する。
- [ ] PR4専用の GitHub Actions workflow / matrix を追加していない。
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
| `feature-plan` | canonical section、必須領域 | package-local template が存在 | `minimal grader` の可能性が高い |
| `code-review` | finding required fields、no-findings residual risk | 意味契約はあるが serialization は未確認 | stable serialization がなければ `N/A` |
| `repair-loop` | iteration fields、decision / triage relation、scope relation | 意味契約はあるが structured artifact の有無を要確認 | artifact があれば adapter / grader、なければ `N/A` |
| `harness-improvement` | candidate fields、enum、evidence、target / taxonomy relation | candidate serialization の有無を要確認 | stable serialization があれば grader、なければ `N/A` |
| `exploratory-qa` | schema、ID、reference、coverage、evidence、status relation、artifact integrity | 既存 `scripts/agentic-qa/**` Machine Contract あり | `existing-contract adapter` |
| `android-native-local-validation` | stage order、failure classification、completion consistency | stable machine-readable result の有無を要確認 | result contract があれば adapter、なければ `N/A` |

### `feature-plan`

Canonical source候補:

- `.agents/skills/feature-plan/SKILL.md`
- `.agents/skills/feature-plan/assets/plan-template.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`

`SKILL.md` は package-local template を reusable output skeleton として使用し、Repository plan artifact として保存する契約を持つ。

Phase 0 で template heading が現在の canonical serialization と確認できた場合のみ、保存済み Markdown Plan を対象に最小 grader を実装する。

この grader は canonical heading と required body の non-empty だけを見る。類義語 heading、fuzzy match、semantic heading classification は行わない。

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

Iterationには deterministic relation があるが、stable structured representation が確認できた場合だけ評価対象とする。

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

既存 Zod schema / validator が持つ ID format、uniqueness、reference syntax、allowed value、status relation、artifact integrity を再利用する。

PR4側へ regex / enum / relation をコピーしない。

### `android-native-local-validation`

Canonical portable source候補:

- `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`

Workflow上のdeterministic ruleは存在するが、Production Outputを表すstable machine-readable contractが確認できた場合だけ adapter を実装する。

### Assumptions

- 新規 dependency は不要で、既存 TypeScript / Node.js / Zod / Vitest で実装できる想定とする。
- 共通 machine-readable result は evaluator / CLI の出力であり、各 Skill の Production Output Contract ではない。
- result shape は consumer が必要とする最小限に留め、長期互換性要件がない限り過剰なversioningを追加しない。
- PR4専用のCI workflowは不要。`test:contracts -> test -> verify` の既存経路を正本とする。

### Non-goals

- Trigger Eval dataset / runner。
- Skill frontmatter description の変更・最適化。
- Semantic Output Eval。
- LLM Judge / rubric grader。
- Workflow E2E Eval。
- Agent Runtime / Workflow Engine。
- 自動 repair / retry。
- Golden Output全文一致。
- 全Skill共通Output schemaへの移行。
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
- `repair-loop` に stable structured iteration artifact が存在するか。
- `harness-improvement` に stable candidate serialization と current taxonomy authority が存在するか。
- `android-native-local-validation` に stable machine-readable execution result が存在するか。
- `exploratory-qa` でPR4から直接再利用すべき既存 validator entry pointはどれか。

これらは次のPhase 0の限定探索で解消する。限定探索を超えてRepository archaeologyを行わない。

---

## 4. 影響範囲

### 実装時の候補

Phase 0 で実装対象が確定した後に必要なものだけ追加する。

```text
.agents/skills/<skill>/scripts/**           # portableなSkill固有grader/helperが必要なSkillのみ
.agents/skills/<skill>/evals/output/**      # portableなSkill固有fixtureが必要なSkillのみ
scripts/skill-output-eval/**                # Repository固有adapter / 本当に共有が必要な薄いCLIのみ
tests/contracts/skill-output-eval.test.ts
package.json                                # CLI aliasが本当に必要な場合のみ
```

### 配置責務

#### Skill package内へ置くもの

- Skill自身のportableなOutput Contractだけで完結するgrader。
- Skill自身のportableなfixture。
- そのSkillを別Repositoryへ移しても意味が成立するdeterministic helper。

例: `feature-plan` の canonical plan template grader。

#### Repository-levelへ置くもの

- Repository固有Machine Contractへのadapter。
- 既存Repository validatorを呼ぶだけの薄い接続処理。
- 複数Skillを本当に共通entry pointから実行する必要がある場合の最小CLI。

例: `exploratory-qa` から `scripts/agentic-qa/**` のRepository Machine Contractへ接続するadapter。

Repository-level adapterへSkill固有ruleをコピーしない。逆に、Skill packageからRepository固定pathを直接importしてportable graderを壊さない。

### Expected no-change areas

- Product source / runtime behavior。
- Skill frontmatter `description`。
- PR2 / PR3 / PR5 / PR6 scope。
- `.codex/agents/**`。
- dependency / lockfile。
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
implementation_mode: existing-contract adapter | minimal grader | N/A
n/a_reason                  # N/A時のみ
semantic_excluded
```

#### A. `existing-contract adapter`

採用条件:

- 既存 machine-readable schema / validator / artifact contract がある。

実装:

- 既存validation entry pointを呼ぶ。
- 既存の machine-readable issue 情報をできる限り保持する。
- ruleをコピーしない。

#### B. `minimal grader`

採用条件:

- 既存 stable canonical template / serialization がある。
- 専用validatorはまだない。

実装:

- canonical formだけを見る。
- required presence / non-empty / allowed value / deterministic relationに限定する。
- alias / fuzzy match / semantic parseを行わない。

#### C. `N/A`

採用条件:

- semantic contractはあるがstable serializationがない。
- authoritative catalog / taxonomy / result contractが限定探索で解決できない。

実装:

- graderを作らない。
- N/A reasonだけを6 Skill coverageを確認する既存/新規の最小tableに残す。
- empty directory / fake fixture / placeholder parserを作らない。

### Phase 1: 6 Skill coverageを最小の場所にだけ持つ

「inventory専用module」を作ること自体を目的にしない。

優先順位:

1. runtime dispatch / CLI registryが実装上すでに必要なら、その定義を6 Skill coverageのSSOTとして使う。
2. runtime registry自体が不要なら、`tests/contracts/skill-output-eval.test.ts` のcoverage tableをSSOTとしてよい。
3. inventory JSON / runtime registry / N/A Markdown / test-only registryを並立させない。

つまり、**専用inventory moduleは必要なときだけ作る**。

Contract testでは対象6 Skillが重複なく全て分類されていることを確認する。

### Phase 2: Phase 0でA/Bに分類されたSkillだけ実装

以下は候補であり、Phase 0の結果を上書きしない。

#### 2-A. `feature-plan` — `minimal grader` 候補

Phase 0で package-local template がstable canonical serializationと確認できた場合のみ実装する。

評価対象:

- canonical required headingの存在。
- required section bodyがwhitespace-onlyでないこと。

false-pass防止:

- fenced code block内のheadingは実sectionとして数えない。
- 実装はline-by-lineでfence状態を追跡する程度に留める。
- Markdown AST parserや新dependencyは導入しない。

禁止:

- heading alias辞書。
- fuzzy match。
- semantic heading classification。
- wording / paragraph count / technical correctness判定。

Fixture候補:

- minimum valid。
- required heading omission。
- headingはあるがbodyが空。
- required headingがfenced code block内にしか存在しないfalse-pass case。

#### 2-B. `code-review` — Phase 0判定

stable serialized review artifact / canonical field markerが確認できた場合だけ minimal graderを検討する。

確認できなければN/A。

禁止:

- `no findings` を自然言語regexで推測する。
- `Severity:` 等のlabelをgrader側で新規必須化する。
- severity enumを新設する。

#### 2-C. `repair-loop` — Phase 0判定

stable structured iteration artifactが確認できた場合だけ次を評価候補とする。

- decision / triage allowed value。
- `needs_human -> stop_needs_human`。
- `changed_files ⊆ allowed_files`。
- scope violationとsuccess / continueの不整合。
- required validation result omission。

stable representationがなければN/A。

自由文からfile listを独自parseしない。grader都合でiteration schemaを新設しない。

#### 2-D. `harness-improvement` — Phase 0判定

stable candidate serializationが確認できた場合だけ次を評価候補とする。

- required field omission。
- 既存contractで明示されたallowed values。
- evidence non-empty。
- authoritative target catalogが解決できる場合のunknown target。
- authoritative failure taxonomyが解決できる場合のunknown category。

current authorityが解決できないruleはN/Aとし、PR4でtaxonomyを新設・修復しない。

#### 2-E. `exploratory-qa` — `existing-contract adapter` 候補

新しいschema graderを作らず、既存 `scripts/agentic-qa/**` Machine Contractを再利用する。

Phase 0で次を確認する。

- 再利用すべきpublic validation entry point。
- ID / uniqueness / reference / allowed value / status relationの既存validation範囲。
- `canonical-artifact-manifest` 等を含むartifact integrity checkの既存範囲。

既存validation issueに `code` / `path` 等があればそれをそのままfailure識別に使う。

独自global check IDへ変換しない。

#### 2-F. `android-native-local-validation` — Phase 0判定

stable machine-readable execution result contractが確認できた場合だけadapterを実装する。

なければ次の趣旨でN/Aを固定する。

```text
N/A: workflow上のdeterministic ruleは存在するが、
現在のProduction Outputを表すstable machine-readable serializationがない。
PR4のgrader都合で新しいOutput schemaを導入するとOutput Contract変更になるため、
このPRでは評価対象外とする。
```

### Phase 3: 最小machine-readable result

PR4独自の長期保存artifact contractを作らない。

必要最低限:

```json
{
  "skill": "feature-plan",
  "status": "fail",
  "issues": [
    {
      "rule": "required-section",
      "path": "検証方法",
      "message": "required section is missing"
    }
  ]
}
```

原則:

- `skill`。
- `status`: `pass` / `fail`。
- `issues`。
- failureがあればnon-zero exit。
- `schema_version` は永続保存・複数consumer・後方互換が本当に必要と確認できた場合だけ追加する。

Failure識別:

- existing-contract adapter: 既存validatorの `code` / `path` または同等のmachine-readable fieldをassertする。
- minimal grader: grader localの小さい `rule` / `path` を使う。
- human向け `message` の全文一致をtest contractにしない。
- Repository-wide/globalなcheck-ID taxonomyは作らない。

### Phase 4: Fixture / contract test

各評価対象Skillに必要最小限を用意する。

必須:

- 1件以上のvalid fixture。
- 実装するdeterministic invariantを壊す代表invalid fixture。

追加:

- required omissionを扱うgraderならomission fixture。
- reference integrityを扱うvalidatorならunknown reference fixture。
- parser false-pass境界が実際にある場合だけnear-valid regression。

Testは単なるoverall `fail` だけではなく、前述の既存 `code/path` またはlocal `rule/path` で意図した失敗理由を確認する。

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

PR4専用 GitHub Actions workflow / matrix は追加しない。

CLIが必要な場合:

- 実input 1件をgrader / adapterへ渡し、machine-readable JSONとexit codeを返す薄いI/Fに限定する。
- fixture suite全件をCLIでも再実行しない。
- CLIが不要ならpackage scriptも追加しない。

### Phase 6: Scope freeze

実装完了時にdiffで次を確認する。

- Skill `description`変更なし。
- Trigger Eval / Semantic Eval / Workflow E2E実装なし。
- Product source変更なし。
- `.codex/agents/**`変更なし。
- `.github/workflows/**`変更なし。
- existing Machine Contractのschema / regex / enum / relationの不要な複製なし。
- dependency / lockfile変更なし。
- N/A回避目的の新Output schema / template / taxonomy追加なし。

---

## 6. 検証方法

### Targeted contract test

```bash
pnpm exec vitest run tests/contracts/skill-output-eval.test.ts --no-file-parallelism --maxWorkers=1
```

確認内容:

- 6 Skillが重複なく `adapter` / `grader` / `N/A` に分類される。
- valid fixtureがPASS。
- invalid fixtureが期待する既存 `code/path` またはlocal `rule/path` でFAIL。
- N/A理由が空でない。
- machine-readable resultがJSONとしてparseできる。
- `feature-plan` を実装した場合、fenced code block内headingだけではPASSしない。
- `exploratory-qa` adapterを実装した場合、既存Machine Contractを通してvalidationされる。

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
Product source diff = 0
Trigger / Semantic / E2E Eval implementation diff = 0
dependency / lockfile diff = 0
```

### 成功判定

- Issue #117 PR4の6 Skill coverageを1対1で説明できる。
- 評価対象はstable inputを持つものだけ。
- invalid fixtureを意図したmachine-readable reasonで落とせる。
- existing Machine Contract duplicationがない。
- `pnpm run test:contracts` から検証され、既存 `test -> verify` 経路にも自然に含まれる。
- 新しいCI workflowなしでgateされる。

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

### Risk 3: feature-planの単純substring判定でfalse-passする

対策:

- line-by-lineでfenced code blockを除外する。
- Markdown ASTやdependencyは追加しない。

### Risk 4: Existing Machine Contractを二重実装する

対策:

- adapter only。
- existing `code/path`等をfailure識別に利用する。
- regex / enum / relationをコピーしない。

### Risk 5: inventoryのために新しいregistry層を作る

対策:

- runtime registryが必要ならそれをSSOTにする。
- runtime registryが不要ならcontract test tableで十分。
- inventory専用moduleを必須にしない。

### Risk 6: package-localとRepository adapterの責務が混ざる

対策:

- portable Skill ruleはSkill package内。
- Repository固定Machine Contractへの接続はRepository-level。
- adapterへSkill ruleをコピーしない。
- Skill packageからRepository固定pathを直接importしない。

### Risk 7: Harness taxonomy authorityの不整合

対策:

- 限定探索でcurrent authorityが解決できた場合だけmembership check。
- 解決できなければそのruleはN/A。
- PR4でtaxonomyを新設・修復しない。

### Risk 8: Native Output schemaをgrader都合で新設する

対策:

- existing result contractがある場合だけadapter。
- なければN/A。

### Risk 9: validationを二重実行する

対策:

- fixture suiteはcontract testを正本にする。
- CLIは必要なら単一input評価だけ。
- PR4専用workflowを追加しない。

### 実装時の判断ルール

迷った場合は次を上から確認する。

1. **このruleはsemantic判断か。**
   - はい -> PR5へ残す。
2. **stable serialization / authoritative validatorは限定探索内で確認できたか。**
   - いいえ -> N/A。
3. **graderのために新しいOutput formatを作ろうとしていないか。**
   - はい -> N/Aへ戻す。
4. **既存validatorを呼べば済むか。**
   - はい -> adapter。
5. **portableなSkill固有ruleだけで完結するか。**
   - はい -> package-local grader候補。
6. **Repository固定contractへの接続が必要か。**
   - はい -> Repository-level adapter。
7. **alias / fuzzy / DSL / plugin discovery / generic parserが必要になっていないか。**
   - はい -> scopeを縮小する。
8. **新しいregistry / inventory fileが本当にruntimeで必要か。**
   - いいえ -> contract test tableで済ませる。
9. **同じfixtureを複数経路でフル実行していないか。**
   - はい -> contract testへ一本化する。
10. **N/Aを減らすこと自体が目的になっていないか。**
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

- 6 Skill coverageを表す最小SSOT（既存runtime registryまたはcontract test tableでよい）。
- 評価対象Skillの最小grader / existing-contract adapter。
- 評価対象Skillのvalid / invalid fixture。
- machine-readable evaluation result。
- `tests/contracts/skill-output-eval.test.ts`。

### 条件付き成果物

- package-local `scripts/` / `evals/output/`: portable graderが必要なSkillのみ。
- Repository-level `scripts/skill-output-eval/**`: Repository adapterまたは薄いCLIが本当に必要な場合のみ。
- `package.json`: CLI aliasが本当に必要な場合のみ。

作らないもの:

- N/A Skillの空directory。
- fake grader / placeholder parser。
- inventory専用module（他にSSOTを置けない場合を除く）。
- PR4専用GitHub Actions workflow / matrix。
- global rule taxonomy / plugin framework。

---

## 9. 備考

- Refs: Issue #117。
- 前提PR: PR #123（PR1: Skill package構造整理・Portability対応、merge済み）。
- PR4はPR2 / PR3を待たずPR1 merge後のmainから実装できる。
- PR5 Semantic Output EvalはPR4でdeterministic / semantic境界を確定した後に進める。
- このPlan commitでは実装を行わない。
