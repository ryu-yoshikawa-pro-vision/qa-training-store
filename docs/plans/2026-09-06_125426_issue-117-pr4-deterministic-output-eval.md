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

### 完了条件（DoD）

- [ ] 6 Skillすべてについて deterministic evaluation 対象を棚卸しし、`existing-contract adapter` / `minimal grader` / `N/A` のいずれかを明示する。
- [ ] 各分類について、canonical source と input representation が明示されている。
- [ ] `minimal grader` は stable canonical serialization / template が既に存在する場合にのみ採用している。
- [ ] `existing-contract adapter` は既存 schema / validator / artifact contract を再利用し、rule を二重実装していない。
- [ ] `N/A` は「未実装」ではなく、stable serialization 不在などの理由を明示した PR4 の境界判断として固定されている。
- [ ] expected data は自然言語全文ではなく property / relation / invariant として表現されている。
- [ ] Output 全文 exact match を使っていない。
- [ ] LLM Judge、Embedding、Semantic similarity を使っていない。
- [ ] evaluator のためだけに Skill の Production Output format を変更していない。
- [ ] evaluator のためだけに新しい Repository-wide taxonomy / registry / workflow engine を作っていない。
- [ ] 評価対象 Skill ごとに少なくとも1件の valid fixture がある。
- [ ] 評価対象 Skill ごとに、実装した deterministic invariant を壊す代表的 invalid fixture がある。
- [ ] required omission を deterministic に判定できる grader では omission を検出できる。
- [ ] unknown reference を authoritative catalog / schema で判定できる領域では検出できる。
- [ ] false-pass が起きやすい parser 境界が実際に存在する場合だけ near-valid regression fixture を追加する。
- [ ] evaluator / validator の結果を machine-readable JSON として取得できる。
- [ ] deterministic evaluation failure 時は CLI または canonical validation entry point が non-zero exit を返す。
- [ ] 既存 Machine Contract の error 情報を不要に別の独自 check-id taxonomy へ再マッピングしていない。
- [ ] dedicated validation が既存 Repository quality path から到達可能である。
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
| `exploratory-qa` | schema、ID、reference、coverage、evidence、status relation | 既存 `scripts/agentic-qa/**` Machine Contract あり | `existing-contract adapter` |
| `android-native-local-validation` | stage order、failure classification、completion consistency | stable machine-readable result の有無を要確認 | result contract があれば adapter、なければ `N/A` |

### `feature-plan`

Canonical source は少なくとも次の3つ。

- `.agents/skills/feature-plan/SKILL.md`
- `.agents/skills/feature-plan/assets/plan-template.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`

`SKILL.md` は package-local template を reusable output skeleton として使用し、Repository plan artifact として保存する契約を持つ。

そのため、Phase 0 で template の heading が canonical contract として現在も使われていることを確認できれば、保存済み Markdown Plan を対象にした最小 grader は妥当である。

この grader は「似た意味の見出し」を推測しない。canonical template で必須と確認できた heading と non-empty body のみを評価する。

### `code-review`

Canonical semantic source は次。

- `.agents/skills/code-review/SKILL.md`
- `.agents/skills/code-review/references/review-workflow.md`

Finding には Severity、Title、Location、Why it matters、Evidence、Suggested fix 等の意味上の required fields がある。

ただし、これらが JSON field、固定 Markdown label、固定 heading などとして serialized される stable contract が存在するかは別問題である。

Phase 0 で stable serialization を確認できない場合、PR4では text parser を作らず N/A とする。

No-findings の判定も同様で、`no findings` を自由文から正規表現で推測するような実装は行わない。

### `repair-loop`

Canonical semantic source は次。

- `.agents/skills/repair-loop/SKILL.md`
- `.agents/skills/repair-loop/references/repair-workflow.md`
- Repository mapping / evaluation artifact contract

Iterationには `iteration_number`、`allowed_files`、`changed_files`、`validation_result`、`decision` 等があり、`needs_human -> stop_needs_human` のような deterministic relation も存在する。

ただし、これらを機械 parse できる stable structured artifact がすでに存在するかを Phase 0 で確認する。

存在しない場合、Markdown / text の表現をPR4側で新規固定せず N/A とする。

### `harness-improvement`

Canonical semantic source は次。

- `.agents/skills/harness-improvement/SKILL.md`
- `.agents/skills/harness-improvement/references/improvement-workflow.md`
- `docs/reference/harness-improvement-loop.md`

Candidate modelには `target`、`failure_category`、`evidence`、`expected_impact`、`risk`、`recommended_change`、`strictness` 等が定義されている。

ただし candidate の stable machine-readable serialization が存在するかは Phase 0 で確認する。

また Repository reference が参照する failure taxonomy の concrete source は Plan 作成時点で current tree から解決できていないため、taxonomy membership check は authority を確認できた場合だけ実装する。

### `exploratory-qa`

Canonical portable source:

- `.agents/skills/exploratory-qa/references/workflow.md`
- `.agents/skills/exploratory-qa/references/scored-mode.md`

Repository-side Machine Contract:

- `scripts/agentic-qa/**`
- 特に `scripts/agentic-qa/contracts.ts`

既存 Zod schema / relation validation がすでに ID format、uniqueness、reference syntax、allowed value、status relation 等を扱っている。

PR4では regex / enum / relation をコピーしない。

また、既存 validator が返す `path` / validation issue / message 等で machine-readable に扱える場合、全ruleを独自 stable `check_id` へ再マッピングしない。Adapter は既存 error surface を可能な限りそのまま利用する。

### `android-native-local-validation`

Canonical portable source:

- `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`

Workflow上は deterministic な停止・完了規則が存在する。

- upstream gate failure 後に downstream stage を PASS としない。
- blocked / not executed stage を PASS と報告しない。
- failure classification は allowed set を使う。
- required gate 全体が成立して初めて completion とする。

一方、Skill自身に stable machine-readable Output schema があるかは未確認である。

既存 Native helper / Run Artifact に authoritative な result contract がある場合だけ adapter を実装し、なければ N/A とする。

### Assumptions

- 新規 dependency は不要で、既存 TypeScript / Node.js / Zod / Vitest で実装できる想定とする。
- 共通 machine-readable result は evaluator の内部 / CLI 出力であり、各 Skill の Production Output Contract ではない。
- 共通 result shape は consumer が必要とする最小限に留め、長期互換性要件がない限り過剰な versioning を追加しない。
- Text grader を実装する場合も、canonical template / stable marker を直接確認し、alias辞書・類義語判定・意味推測はしない。
- Existing Machine Contract を利用する Skill では、adapter は既存 public validator / schema を呼び出し、同じ rule を再実装しない。

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
- grader のための新しい Markdown Output convention の策定。
- alias / 類義語対応を含む汎用 Markdown parser。
- generic rule DSL / plugin system の導入。
- Product Code / Product behavior の変更。
- `.codex/agents/**` の変更。
- `spec/failure-taxonomy.json` 不在問題のついで修正。

---

## 3. 質問 / 曖昧性

### 実装前に必ず解消する technical unknown

Phase 0 で以下を確認する。ユーザー判断ではなく Repository investigation で解消する。

#### A. Text系 Skill の stable serialization

対象:

- `feature-plan`
- `code-review`
- `repair-loop`
- `harness-improvement`

確認内容:

1. Outputが保存される canonical artifact はあるか。
2. その artifact の serialization は schema / template /固定 field marker として既に契約化されているか。
3. 現行テストやvalidatorがその形式を既に前提としているか。
4. evaluator を作るために新しい label / heading / JSON shape を導入する必要がないか。

判定:

- stable serialization あり -> `minimal grader` または `existing-contract adapter`
- semantic contract のみ -> `N/A`

#### B. Harness failure taxonomy の current authority

`docs/reference/harness-improvement-loop.md` や evaluation reference が参照する failure taxonomy の current authoritative source を確定する。

- current canonical file / module が存在する場合は再利用する。
- rename / migration 済みなら current source に追従する。
- authoritative source が存在しない場合、PR4だけのために taxonomy を新設・hard-code しない。
- taxonomy authority が解決できない場合、membership check のみ N/A とし、他の確実な deterministic check は継続可能。

#### C. Native validation result contract

Native helper / Run Artifact / existing contract test を確認し、stage result / classification / completion を表す stable machine-readable contract がすでに存在するかを確定する。

- 存在する場合 -> adapter
- 存在しない場合 -> N/A
- evaluator のためだけの新しい Native result schema は作らない。

#### D. `exploratory-qa` の再利用 entry point

既存 `scripts/agentic-qa/**` のうち、PR4から呼ぶ最小 public validation entry point を確定する。

- schema / regex / enum / relation をコピーしない。
- 既存 validation issue を独自 taxonomy に変換しない。
- 必要なら最小 export の追加を検討するが、adapter専用の大規模 abstraction は作らない。

---

## 4. 影響範囲

### 実装時の候補

Phase 0 で実装対象が確定した後にのみ追加する。

```text
.agents/skills/<skill>/evals/output/**      # package-local fixture / grader が本当に必要なSkillのみ
.agents/skills/<skill>/scripts/**           # package-local deterministic helper が必要な場合のみ
scripts/skill-output-eval/**                # 複数Skillで本当に共有が必要な最小runner / result helperのみ
tests/contracts/skill-output-eval.test.ts
package.json
```

N/A Skill に空 `evals/` directory、fake grader、placeholder parser を作らない。

### Existing sources to inspect and preferably keep read-only

```text
.agents/skills/feature-plan/SKILL.md
.agents/skills/feature-plan/assets/plan-template.md
.agents/skills/feature-plan/references/planning-workflow.md
.agents/skills/code-review/SKILL.md
.agents/skills/code-review/references/review-workflow.md
.agents/skills/repair-loop/SKILL.md
.agents/skills/repair-loop/references/repair-workflow.md
.agents/skills/harness-improvement/SKILL.md
.agents/skills/harness-improvement/references/improvement-workflow.md
.agents/skills/exploratory-qa/references/workflow.md
.agents/skills/exploratory-qa/references/scored-mode.md
.agents/skills/android-native-local-validation/references/windows-android-workflow.md
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/coverage.ts
scripts/agentic-qa/evaluate.ts
scripts/agentic-qa/canonical-artifact-manifest.ts
docs/reference/evaluation.md
docs/reference/harness-improvement-loop.md
docs/reference/repair-loop.md
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
- failure taxonomy の新設・移動・修復。

---

## 5. 変更方針

### Phase 0: 6 Skill inventory と実装Scope決定Gate

このPhaseを、単なる調査ではなく **PR4 implementation scope を確定する Gate** とする。

各 Skill / deterministic candidate について最低限次を確認する。

```text
skill
canonical_source
input_representation
stable_serialization: yes | no
invariant
implementation_mode: existing-contract adapter | minimal grader | N/A
n/a_reason                  # N/A時のみ
semantic_excluded
```

重要:

- grader の実装詳細を先に決めない。
- `stable_serialization = no` なら原則 N/A。
- 「field名が文書に書いてある」だけでは `stable_serialization = yes` にしない。
- parserを作れば評価できる、という理由で grader 対象にしない。

Phase 0 の終了時に、6 Skillを次の3分類へ確定する。

#### A. `existing-contract adapter`

既存 machine-readable schema / validator / artifact contract がある。

実装方針:

- 既存 validation entry point を呼ぶ。
- validation issue を薄く machine-readable output へ渡す。
- ruleをコピーしない。

#### B. `minimal grader`

既存 stable template / serialization があるが専用validatorがない。

実装方針:

- canonical formだけを見る。
- heading / field alias を増やさない。
- semantic判断をしない。
- required presence / non-empty / allowed value / deterministic relation のみに限定する。

#### C. `N/A`

semantic contract はあるが stable serialization がない、または authority が解決できない。

実装方針:

- graderを作らない。
- N/A reasonを1つの実装 inventory / test registry で固定する。
- empty directoryやfake fixtureを作らない。

### Phase 1: 実装inventoryを単一SSOTにする

Markdown inventory、runtime registry、N/A registry を別々に作らない。

実装が必要な場合、1つの小さな定義を SSOT として使う。

概念例:

```ts
const outputEvaluations = {
  "feature-plan": {
    mode: "grader",
  },
  "code-review": {
    mode: "not-applicable",
    reason: "no stable serialized output contract",
  },
  "exploratory-qa": {
    mode: "adapter",
  },
} as const;
```

これは概念例であり、同じshapeをそのまま実装する義務はない。

目的は次の二重管理を避けること。

- inventory JSON
- runtime registry
- N/A Markdown
- test-only registry

6 Skill coverage はこの単一SSOTを contract test で確認する。

### Phase 2: 評価対象 Skill だけを実装

Phase 0 で A/B に分類された Skill だけを実装する。

以下は現時点の候補であり、Phase 0 の結果を上書きしない。

#### 2-A. `feature-plan` — `minimal grader` 候補

Phase 0 で package-local template が stable canonical serialization と確認できた場合のみ実装する。

評価するもの:

- canonical required heading の存在。
- required section の本文が whitespace-only でないこと。

評価しないもの:

- 類義語 heading。
- heading順序。ただし既存contractが明示的に順序を要求している場合を除く。
- Plan の技術的正しさ。
- risk の重要度。
- strategy の妥当性。
- wording / paragraph count。

禁止:

- `Goal | ゴール | 目的` のような alias辞書。
- fuzzy match。
- semantic heading classification。

Fixture:

- minimum valid。
- required heading omission。
- heading はあるが required body が空。
- parser false-pass が実際に起きる場合のみ near-valid regression。

#### 2-B. `code-review` — Phase 0 判定

stable serialized review artifact / field marker が確認できた場合のみ minimal grader を検討する。

確認できない場合:

```text
N/A: finding の semantic field contract は存在するが、
現在の Skill Output に stable machine-readable / canonical text serialization がない。
PR4で parser 用 format を導入すると Production Output Contract を事実上変更するため、
このPRでは deterministic grader を作らない。
```

特に以下は禁止する。

- `no findings` を自然言語 regex で推測する。
- `Severity:` 等のlabelをgrader側で新規必須化する。
- severity enumを新設する。

#### 2-C. `repair-loop` — Phase 0 判定

stable structured iteration artifact が確認できた場合、既存 representation 上で次の deterministic relation を評価候補とする。

- decision allowed value。
- triage classification allowed value。
- `needs_human -> stop_needs_human`。
- `changed_files ⊆ allowed_files`。
- scope violation と success / continue の不整合。
- required validation result omission。

stable representation が確認できない場合は N/A。

禁止:

- 自由文から file list を独自parseすること。
- grader都合で iteration JSON schemaを新設すること。

#### 2-D. `harness-improvement` — Phase 0 判定

stable candidate serialization が確認できた場合、以下を deterministic 評価候補とする。

- required field omission。
- `strictness` / `status` / `owner_decision` allowed value。
- evidence non-empty。
- authoritative catalog が存在する場合のみ unknown target。
- authoritative taxonomy が解決できた場合のみ failure category membership。

stable candidate serialization がなければ N/A。

taxonomy source が解決できない場合、taxonomy membership check のみ N/A とし、新しい taxonomy を hard-code しない。

#### 2-E. `exploratory-qa` — `existing-contract adapter`

新しい schema grader を作らず、既存 `scripts/agentic-qa/**` Machine Contract を再利用する。

再利用候補:

- Zod schema parse。
- coverage ID / challenge ID format。
- required coverage uniqueness。
- evidence reference syntax。
- status / `mission_completed` consistency。
- artifact / reference relation。

Adapterは薄くする。

- 既存 validator の input を受け取る。
- 既存 validation result / issue を machine-readable に返す。
- 必要ならSkill名とoverall statusを付加する。
- regex / enum / relationを再記述しない。
- 全ruleを独自 `check_id` taxonomy へ変換しない。

既存 issue が `path` / `code` / `message` を持つなら、それをテストの接続点として利用できるかを優先検討する。

Fixtureは既存fixtureを再利用できる場合は再利用する。

#### 2-F. `android-native-local-validation` — Phase 0 判定

existing machine-readable result contract がある場合だけ adapter を実装する。

候補 invariant:

- stage status / order consistency。
- failure classification allowed value。
- blocked / not-executed stage を PASS と扱わない。
- upstream failure 後の downstream success claim を許可しない。
- completion claim と required gate result の consistency。

stable contract がない場合:

```text
N/A: portable workflowにはdeterministicな停止・完了規則があるが、
現在のProduction Outputを表すstable machine-readable serializationがない。
PR4のgrader都合で新しいOutput schemaを導入するとOutput Contract変更になるため、
このPRでは評価対象外とする。
```

### Phase 3: 最小の machine-readable result

PR4独自の長期保存artifact contractを必要以上に作らない。

必要最低限の例:

```json
{
  "skill": "feature-plan",
  "status": "fail",
  "issues": [
    {
      "check": "required-section",
      "path": "## 6. 検証方法",
      "message": "required section is missing"
    }
  ]
}
```

原則:

- `skill`。
- `status`: `pass` / `fail`。
- `issues`。
- failure があれば non-zero exit。
- 既存 Machine Contract の issue shape が使える場合はその情報を保持する。
- `schema_version` は、実際に永続保存・複数consumer・backward compatibility が必要と確認できた場合だけ追加する。
- stable global `check_id` taxonomy は作らない。Skill固有 grader で必要な最小識別子だけ使用する。

### Phase 4: Fixture / contract test

各評価対象 Skill に次を用意する。

必須:

- 1 valid fixture。
- 実装した主要 invariant を壊す代表 invalid fixture。

必要な場合のみ:

- required omission fixture。
- unknown reference fixture。
- near-valid false-pass regression fixture。

「全Skillに同じ種類・同じ件数のfixtureを作る」ことを目的にしない。

テストは overall fail だけでなく、既存 validation issue または grader の最小識別子を使って意図した failure であることを確認する。

### Phase 5: Canonical validation path を1つにする

同じ fixture suite を `test:contracts` と dedicated command の両方で重複全実行しない。

実装時に、次のどちらかを canonical path として選ぶ。

#### Option A: contract test が canonical

```text
fixture -> grader / adapter -> Vitest contract test -> test:contracts -> verify
```

CLI は単一inputを評価する薄い entry point に留める。

#### Option B: dedicated validator が canonical

```text
fixture -> dedicated validator -> exit / JSON
                         ↑
              contract test は runner / serialization のsmoke
```

選定基準:

- 既存 Repository convention に自然に乗る方。
- fixture suite の二重実行を避けられる方。
- `pnpm run verify` から確実に到達できる方。

新しい GitHub Actions workflow / matrix は作らない。

現行 quality gate から到達しないことが確認された場合だけ、既存jobへ最小接続する。

### Phase 6: Scope / semantic freeze

実装完了時に diff で次を確認する。

- 6 Skill frontmatter `description` に変更がない。
- Trigger Eval dataset / description optimization を追加していない。
- Semantic rubric / LLM Judge を追加していない。
- Workflow E2E runner を追加していない。
- Product Codeを変更していない。
- `.codex/agents/**` を変更していない。
- existing Machine Contract schema を不要に複製・改変していない。
- dependency / lockfile を不要に変更していない。
- failure taxonomy をPR4都合で新設・修復していない。
- N/A Skillのためのempty package / fake graderを作っていない。

---

## 6. 検証方法

### Phase 0 inventory validation

- 6 Skill がすべて inventory SSOT に1回ずつ現れる。
- 各Skillに `adapter / grader / N/A` が必ず定義される。
- N/Aには非空reasonがある。
- grader / adapterには canonical source と stable input representation がある。

### Targeted validation

最終的な実装構成に応じ、canonical path を1つ選ぶ。

候補:

```bash
pnpm exec vitest run tests/contracts/skill-output-eval.test.ts --no-file-parallelism --maxWorkers=1
```

または既存 naming convention に沿った dedicated validator command。

確認内容:

- valid fixture が PASS。
- invalid fixture が意図した invariant で FAIL。
- N/A Skill の reason が inventory で固定されている。
- existing Machine Contract adapter が既存 rule を再利用している。
- machine-readable result が parse 可能。
- failure input で canonical CLI / validator が non-zero。

### Repository integration validation

必要なコマンドだけを最終実装に合わせて実行する。

```bash
pnpm run validate:skills
pnpm run test:contracts
pnpm run typecheck
pnpm run format:check
pnpm run lint:markdown
pnpm run verify
git diff --check
```

専用 `validate:skill-output-evals` script を追加した場合のみ、それも実行する。

### Scope validation

- Skill `description` diff = 0。
- `.codex/agents/**` diff = 0。
- Product source diff = 0。
- Trigger / Semantic / E2E Eval implementation diff = 0。
- dependency / lockfile diff = 0 を期待値とする。
- taxonomy source の新設・修復 diff = 0。

### 成功判定

- 6 Skillすべてについて「なぜ評価する / しない」が説明できる。
- grader実装数が多いことを成功条件にしていない。
- stable serializationのないSkillへ自由文parserを導入していない。
- 実装した grader / adapter が invalid fixture を確実に落とす。
- existing Machine Contract の duplication がない。
- machine-readable result と exit status で自動判定できる。
- `pnpm run verify` が PASS する。

---

## 7. リスクと未解決論点

### Risk 1: Semantic contract と serialization contract の混同

field名がworkflow文書に存在するだけで text parser を作ると、grader が暗黙の Output format を新設してしまう。

対策:

- Phase 0で stable serialization を独立項目として確認する。
- stable serialization がなければ N/A。

### Risk 2: Free-form text parser の過剰制約

特に code-review / repair-loop / harness-improvement で自然言語labelをparseし始めると、正しい自由文Outputを false-negative にする。

対策:

- canonical template / schema がない限り parser を作らない。
- alias辞書、fuzzy match、semantic heading detection は実装しない。

### Risk 3: False-pass防止を理由に semantic judge 化する

Evidenceが妥当か、Riskが十分か、Findingが正しいかまで判定すると deterministic scope を超える。

対策:

- existence、allowed value、format、uniqueness、reference relation、state consistency に限定する。

### Risk 4: Existing Machine Contract の二重実装

`exploratory-qa` の既存 schema / relationをPR4側でコピーすると drift する。

対策:

- adapter only。
- 既存 validation issue を優先利用する。
- 独自 check-id mapping を必要以上に作らない。

### Risk 5: Inventory / registry の二重管理

N/A list、runtime registry、test registryを別々に作ると同期コストが生まれる。

対策:

- 6 Skill coverage を1つの実装SSOTへ集約する。

### Risk 6: Harness taxonomy authority の不整合

Repository referenceが `spec/failure-taxonomy.json` を参照している一方、current treeでauthorityが解決できない可能性がある。

対策:

- Phase 0で確認。
- 解決できない場合はtaxonomy membership checkだけN/A。
- PR4でtaxonomyを作り直さない。

### Risk 7: Native Output schema を evaluator のために新設してしまう

Workflow ruleはdeterministicでもOutput serializationがstableでなければ安全にgraderへ入力できない。

対策:

- existing artifact contract がある場合だけ adapter。
- なければ N/A。

### Risk 8: Fixture / validation の重複

同じfixture suiteをdedicated commandとVitestの両方でフル実行すると保守コストとCI時間だけが増える。

対策:

- canonical validation path を1つ決める。
- もう一方は必要なsmokeだけにする。

### Open questions

- `code-review` に stable serialized review output が存在するか。
- `repair-loop` に stable structured iteration artifact が存在するか。
- `harness-improvement` に stable candidate serialization が存在するか。
- `harness-improvement` の current failure taxonomy authority はどこか。
- Native helperに stable machine-readable execution result contract が存在するか。
- `exploratory-qa` の既存 validation function のうち、PR4 adapter から直接利用すべき最小 public entry point はどれか。

これらは implementation前の Repository investigation で解消する technical unknown であり、現時点でユーザー判断を要求する blocker ではない。

---

## 8. 成果物

### 今回の Plan-only branch で作成・更新するもの

```text
docs/plans/2026-09-06_125426_issue-117-pr4-deterministic-output-eval.md
```

これ以外は今回変更しない。

### 後続実装で想定する成果物

Phase 0 の結果に応じて必要なものだけ作る。

必須:

- 6 Skill deterministic coverage inventory の単一SSOT。
- 評価対象 Skill の最小 grader / existing-contract adapter。
- 評価対象 Skill の valid / invalid fixture。
- machine-readable evaluation result。
- quality path から到達する contract test / validation。

条件付き:

- package-local `evals/output/**`。
- package-local helper script。
- Repository-level runner。
- dedicated package command。
- 既存 quality job への最小接続。

作らないもの:

- N/A Skill の空 `evals/` Directory。
- fake grader。
- 新しい共通 Rule Engine。
- generic parser framework。
- grader用Production Output schema。

---

## 9. 実装時の判断ルール

実装者が迷った場合は、以下の順で判断する。

1. **既存の machine-readable contract があるか。**
   - ある -> adapter を優先。
2. **machine-readable contract はないが、canonical template / stable serialization があるか。**
   - ある -> 最小 grader を検討。
3. **semantic contract しかないか。**
   - はい -> N/A。
4. **評価するために新しいOutput formatを決める必要があるか。**
   - はい -> 実装しない。
5. **既存validatorを呼べば済むruleを再実装しようとしていないか。**
   - はい -> adapterへ戻す。
6. **alias、fuzzy match、DSL、plugin discovery、汎用parserが必要になっていないか。**
   - はい -> scopeを縮小する。
7. **同じfixtureを複数経路でフル実行していないか。**
   - はい -> canonical validation pathを1つに寄せる。
8. **N/Aを減らすこと自体が目的になっていないか。**
   - はい -> Issue #117 の「評価可能なSkillにgrader、N/A理由を明示」を優先する。

---

## 10. 備考

- Refs: Issue #117。
- 前提PR: PR #123（PR1: Skill package構造整理・Portability対応、merge済み）。
- PR4 は PR2 / PR3 の完了を待たず、PR1 merge後の `main` から独立して実装できる。
- PR5 Semantic Output Eval は PR4 で deterministic / semantic 境界を明確にした後に進める。
- 本Planでは「grader数」より「既存contractを壊さず、false-passを防ぎつつ、評価可能範囲だけを実装すること」を優先する。
- stable serialization がない Skill を N/A にすることは不足ではなく、PR4 の責務を守るための意図的な境界判断である。
- この Plan commit では実装を行わない。grader、fixture、script、package command、CI、Skill contract の変更は後続実装で行う。
