# Issue #117 PR2 Trigger Eval baseline 実装計画

## 0. 依頼概要

- 対象 Issue: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117
- 対象フェーズ: PR2「Trigger Eval baseline」
- 実装ブランチ: `refactor/117-pr2-trigger-eval-baseline`
- base: PR #123 merge 後の `main`
- 目的: PR3 で Skill `description` を変更する前に、現状の Skill routing を同じ条件で再測定・比較できる baseline として固定する。

PR2 は routing 改善そのものを行う PR ではない。baseline で failure が見つかっても `description` や routing contract は変更せず、PR3 の入力として残す。

実装は最小に保つ。Repository 独自 Agent Runtime、routing engine、LLM judge、keyword classifier、汎用 Host abstraction、retry framework、parallel runner、統計評価基盤は作らない。

---

## 1. ゴール / 完了条件

### 1.1 ゴール

6 Skill すべてについて positive / negative の Trigger Eval query を train / validation に分離し、6 Skill が同時に利用可能な現行 Codex Host 上で routing を評価する。

評価結果は machine-readable に保存し、後続 run で case ID 単位に比較できるようにする。

### 1.2 対象 Skill

```text
android-native-local-validation
code-review
exploratory-qa
feature-plan
harness-improvement
repair-loop
```

### 1.3 DoD

- [ ] 6 Skill すべてに `evals/trigger/train.yaml` と `evals/trigger/validation.yaml` がある。
- [ ] 各 Skill / split に、その Skill へ route すべき positive case と、その Skill へ route すべきでない negative case が最低 1 件ずつある。
- [ ] scored case は expected routing が「canonical 6 Skill のちょうど 1 Skill」または「canonical Skill 不要」のどちらかへ一意に決まる single-intent query のみに限定する。
- [ ] 複数 Skill が正当に必要な query は PR2 の scored dataset に入れず PR6 の責務とする。
- [ ] train / validation は物理ファイルで分離する。
- [ ] normalized duplicate query が同一 split 内にも split 間にも存在しない。
- [ ] Issue #117 の 4 near-miss boundary を train / validation の双方で両側からカバーする。
- [ ] canonical eval は 6 Skill が同時に discover 可能な通常 Repository 条件で実行する。
- [ ] Host へ渡すのは dataset の自然な `query` 本文だけであり、expected label、owner Skill、split、boundary、case ID を prompt へ混ぜない。
- [ ] evaluator の active Run Artifact や生成中 result を Host の working tree に置かず、評価メタデータの間接リークを防ぐ。
- [ ] 現行 Codex Host が実際に使用した Skill を Host-native evidence から観測する。
- [ ] positive / negative observation control で、Skill read が trigger の観測 proxy として利用可能か実測確認する。
- [ ] case outcome を `pass` / `false_negative` / `sibling_misroute` / `unexpected_trigger` / `unobservable` に分類できる。
- [ ] scoring は observed Skill の集合だけで判定し、read 順序を正誤判定に使わない。
- [ ] live runner は `train` / `validation` / `all` を選択できる。
- [ ] PR2 canonical baseline は `all` で 1 回取得する。
- [ ] baseline result を後続 `all` run と case ID 単位で比較できる。
- [ ] observation loss / recovery を routing failure の改善・悪化と混同せず比較できる。
- [ ] comparison result を machine-readable output に保存できる。
- [ ] runner の成功 / 失敗 exit code が明確である。
- [ ] baseline の `source_git_sha` が runner / dataset を含む実際の評価対象 commit を指す。
- [ ] live routing failure は runner 自体の失敗扱いにせず result として保存する。
- [ ] live routing score は `pnpm run verify` の hard gate にしない。
- [ ] deterministic dataset validation と pure scoring / comparison test のみ CI gate にする。
- [ ] 6 Skill の `SKILL.md` frontmatter `description` を変更していない。
- [ ] `AGENTS.md` の routing 意味契約を変更していない。
- [ ] Product code / Product test / training content を変更していない。
- [ ] Repository 独自 Agent Runtime / Workflow Engine / routing classifier を追加していない。
- [ ] Repository-wide validation が PASS する。
- [ ] canonical baseline と標準 Run Artifact が Repository policy に沿って保存される。

---

## 2. 現状理解と設計原則

### 2.1 Repository 側の入口

- `AGENTS.md`
  - Repository-level Skill routing の SSOT。
  - Codex に最近の `.codex/runs/` を確認するよう要求しているため、評価用 Host working tree に evaluator の active Run Artifact を置くと routing 評価を汚染し得る。
- `.agents/skills/<skill>/SKILL.md`
  - Skill の入口契約。
  - 現在の `description` が PR2 baseline の評価対象。
- `.codex/config.toml`
  - project-scoped Codex config。
  - hooks が有効。
- `.codex/hooks/log_event.mjs`
  - `UserPromptSubmit` / `PostToolUse` 等を session ごとの JSONL へ記録する既存 hook logger。
  - 通常は `.codex/logs/`、書き込み不能時は `.artifacts/codex-hooks/` へ fallback する。
- `.codex/logs/.gitignore`
  - hook JSONL は commit 対象外。
- `scripts/validate-skills.ts`
  - Skill package の既存 deterministic validator。
- `tests/repository-contract/validate-skills.test.ts`
  - Skill validator の既存 repository contract test。
- `package.json`
  - `validate:skills` / `test:repository` / `verify` がある。
  - Trigger Eval command はまだない。

### 2.2 現行 Codex Host について確認できていること

現行 Codex の Skill prompt contract では、task が Skill description に一致した場合に Skill を使用し、選択後は `SKILL.md` を読むことが要求される。

`codex exec` には少なくとも以下がある。

```text
--json
--ephemeral
--sandbox read-only
-C / --cd
```

`--json` の top-level lifecycle には少なくとも以下がある。

```text
thread.started
turn.started
turn.completed
turn.failed
error
```

PR2 は現在この Repository で使用する Codex CLI だけを対象とする。将来別 Host を扱うための adapter interface は作らない。

### 2.3 Canonical Eval の意味

Canonical Eval は、6 Skill を同時に discover 可能な Repository routing 条件で評価することを意味する。

以下は行わない。

- target Skill だけを残す one-vs-rest evaluation。
- Repository独自 classifier で query を事前分類する。
- Skill routing SSOT である `AGENTS.md` を無効化する。
- Skill `description` を評価専用に差し替える。

一方、evaluator の active Run Artifact や生成中 baseline/result は routing の入力ではないため、Host の working tree から分離する。

### 2.4 Evaluator root と Target root を分離する

live eval では2つの root を分ける。

```text
Evaluator root
- runner を起動する通常 working tree
- active PR2/PR3 Run Artifact がある
- --output / --compare artifact を置く

Target root
- source_git_sha から作った clean detached worktree
- Codex の -C に渡す
- dataset / AGENTS.md / 6 Skills は source_git_sha の内容
- evaluator の未commit active Run Artifact や生成中 result は存在しない
```

runner 自身に worktree 作成・削除を実装しない。実行者が既存 Git の `worktree` 機能で用意する。

```bash
git worktree add --detach <target-root> <source_git_sha>
```

live run 終了後は通常の Git worktree cleanup で削除する。

### 2.5 Key concepts

#### Dataset owner Skill

`.agents/skills/<owner>/evals/trigger/<split>.yaml` の `<owner>`。

YAML に owner field は持たせない。

#### Split

`train.yaml` / `validation.yaml` の filename から導出する。

#### Expected Skill

canonical 6 Skill の1つ、または `null`。

`null` は「この依頼では canonical 6 Skill を使わない」を意味する。

#### Positive case

```text
expected_skill === owner_skill
```

#### Negative case

```text
expected_skill !== owner_skill
```

negative の expected は sibling Skill または `null`。

#### Observed Skills

Host-native evidence から actual read/open が確認できた canonical `SKILL.md` の Skill 名集合。

- scoring では unique set として扱う。
- serialization 時は canonical Skill 名の辞書順に sort する。
- raw read 順序を長期 artifact へ保存する必要はない。

#### Train split

PR3 の description tuning / failure analysis に使用してよい。

#### Validation split

PR3 の tuning 中は使用せず、変更後の holdout 確認に使用する。

runner で split を選択可能にし、「見えるが使わない」という弱い運用にしない。

#### Single-intent case

主要求だけから expected Skill が1 Skillまたは `null` に一意に決まる query。

以下は scored dataset に入れない。

- 「レビューして必要なら修正」
- 「計画してから実装」
- 「QAして問題があれば修正」
- その他、同一 turn で複数 Skill が正当に必要となり得る依頼

### 2.6 Safe change surface

変更予定:

```text
.agents/skills/*/evals/trigger/**
scripts/evals/skill-trigger-evals.ts
scripts/evals/run-skill-trigger-evals.ts
tests/repository-contract/skill-trigger-evals.test.ts
package.json
PR2 implementation Run Artifact
```

`pnpm-lock.yaml` は dependency 追加が本当に必要な場合のみ変更可。原則 dependency は追加しない。

### 2.7 Non-goals

- Skill `description` tuning。
- Skill Workflow / Output Contract / stop condition の変更。
- `AGENTS.md` routing 文言変更。
- PR2 内で routing failure を修正すること。
- multi-Skill Workflow E2E。PR6 の責務。
- Deterministic Output Eval。PR4 の責務。
- Semantic Output Eval。PR5 の責務。
- keyword / regex / embedding / LLM judge による query routing 判定。
- Codex Agent Runtime / Skill loader の再実装。
- 複数 Host/provider abstraction。
- precision / recall / F1 / weighted score / confidence interval / statistical significance。
- retry / backoff framework。
- parallel runner。
- live model score の CI hard gate 化。
- Product code / Product E2E / training scenario の変更。
- runner に Git worktree lifecycle manager を実装すること。

---

## 3. 実装前 Observation Probe

### 3.1 目的

PR2 の scoring は「canonical `SKILL.md` の actual read/open」を Skill trigger の observation proxy とする。

この proxy が現行 Codex で成立することを、scored dataset 作成前に実測する。

### 3.2 Probe 用 Target root

probe も evaluator の通常 working treeではなく、probe開始時点の committed HEAD から clean detached worktree を1つ作って行う。

```bash
git worktree add --detach <probe-target-root> <current-head>
```

probe target には scored Trigger Eval dataset をまだ作成しない。

### 3.3 Hook log correlation

ThreadId / SessionId の対応関係は実装しない。

各 probe / live case で、Target root 配下の以下2箇所を1つの候補集合として扱う。

```text
<target-root>/.codex/logs/hooks-*.jsonl
<target-root>/.artifacts/codex-hooks/hooks-*.jsonl
```

手順:

1. 実行前に両 directory の `hooks-*.jsonl` について file path と byte size を snapshot する。
2. Codex process を1件だけ実行する。
3. 実行後に同じ snapshot を取得する。
4. 新規作成または size 増加した file を抽出する。
5. exactly 1 file のみ変化した場合、その file を当該 case の evidence とする。
6. evidence として読むのは file 全体ではなく、**実行前 size から実行後 size までの append 部分だけ**とする。新規 file は offset 0 から読む。
7. 0 file / 複数 file / size縮小・置換など append と判断できない状態は `unobservable` とする。

これにより過去 session の hook event を当該 case に混ぜない。

外部で同時に別 Codex session が同じ Target root へ書き込んで複数 file が変化した場合も推測で選ばない。

### 3.4 Positive control

評価対象外の明示 Skill query を1件実行する。

```text
$feature-plan を使って、この依頼の実装計画だけを作ってください。
```

合格条件:

- case に対応する hook delta を exactly 1 file から取得できる。
- `PostToolUse` evidence から指定 Skill の canonical `SKILL.md` actual read/open を一意に検出できる。
- 単なる path mention / search result を actual read と誤認しない selector を作れる。

### 3.5 Negative control

canonical 6 Skill を使う必要がない read-only の単純 Repository query を1件実行する。

例:

```text
package.json に記載されている package name だけを確認して答えてください。
```

Skill 名は書かない。

合格条件:

- case に対応する hook delta を exactly 1 file から取得できる。
- canonical 6 Skill の `SKILL.md` actual read/open が0件である。

### 3.6 Selector を過剰実装しない

probe で観測できた current Codex の具体的な tool/input shape だけを扱う。

以下は行わない。

- arbitrary shell language を解釈する general parser。
- path文字列が含まれるだけで Skill read と判定する loose regex。
- query内容から「使ったはずのSkill」を逆算する classifier。

Host evidence が command text しかなく、actual read と単なる mention を安定して区別するために一般的な shell parser が必要になる場合は、selector を肥大化させず blocker とする。

### 3.7 Probe blocker

以下のどれかなら PR2 implementation blocker とする。

- hook log correlation が一意にできない。
- 通常 / fallback のどちらにも hook evidence が取得できない。
- actual `SKILL.md` read/open と path mention を安定して区別できない。
- positive control で指定 Skill read を検出できない。
- negative control で canonical Skill read が常に発生し、Skill selection の proxy として使えない。
- query 自体を分類しないと observed Skill を得られない。

blocker 時にしてはいけないこと:

- keyword classifier を作る。
- user query を regex で分類する。
- LLM judge に routing を判定させる。
- 独自 Agent Runtime / Skill loader を作る。
- general shell parser を作る。
- scored dataset を都合よく変更する。

blocker は implementation Run に記録し、Host-native observation 方法自体を別途見直す。

---

## 4. Dataset 設計

### 4.1 Directory layout

各 Skill に固定で以下を置く。

```text
.agents/skills/<skill>/evals/trigger/
├── train.yaml
└── validation.yaml
```

計12 files。

### 4.2 YAML schema

各 file は以下の最小 schema とする。

```yaml
schema_version: 1
cases:
  - id: code-review-train-001
    query: "変更内容をレビューして問題点を洗い出してください"
    expected_skill: code-review
    boundary: code-review-vs-repair-loop
```

case field は以下だけ。

```text
id
query
expected_skill
boundary
```

持たせない field:

```text
skill
split
polarity
tags
```

理由:

- owner Skill は directory path から導出する。
- split は filename から導出する。
- polarity は owner / expected の一致から導出する。
- near-miss は固定 boundary だけで足りる。

### 4.3 Case ID

形式を固定する。

```text
<owner-skill>-<split>-NNN
```

例:

```text
code-review-train-001
feature-plan-validation-002
```

- global unique。
- owner / split は ID prefix と file path の双方で一致すること。
- `NNN` は安定ID用であり、後続追加時に連番を詰め直さない。

### 4.4 Boundary enum

許可する boundary は Issue #117 指定の4種だけとする。

```text
exploratory-qa-vs-android-native-local-validation
code-review-vs-repair-loop
repair-loop-vs-harness-improvement
feature-plan-vs-direct-implementation
```

`direct` や free-form taxonomy は PR2 では追加しない。

### 4.5 Boundary integrity

#### `exploratory-qa-vs-android-native-local-validation`

```text
owner_skill ∈ {
  exploratory-qa,
  android-native-local-validation
}

expected_skill ∈ {
  exploratory-qa,
  android-native-local-validation
}
```

#### `code-review-vs-repair-loop`

```text
owner_skill ∈ {
  code-review,
  repair-loop
}

expected_skill ∈ {
  code-review,
  repair-loop
}
```

#### `repair-loop-vs-harness-improvement`

```text
owner_skill ∈ {
  repair-loop,
  harness-improvement
}

expected_skill ∈ {
  repair-loop,
  harness-improvement
}
```

#### `feature-plan-vs-direct-implementation`

```text
owner_skill = feature-plan
expected_skill ∈ { feature-plan, null }
```

boundary と無関係な Skill を owner / expected にした case は validation error とする。

### 4.6 Initial 24-case 配置

PR2 initial dataset は **exactly 24 cases で作成する**。

```text
6 Skills × 2 splits × 2 cases = 24 cases
```

これは初期データ設計であり、**validator の永久的な「件数=24」invariantにはしない**。

train / validation は同じ配置構造を使う。ただし query 自体は別の自然なシナリオとし、単純 paraphrase にしない。

各 split の配置:

| Owner dataset | Case | Expected | Boundary | 意味 |
|---|---:|---|---|---|
| `exploratory-qa` | 001 | `exploratory-qa` | `exploratory-qa-vs-android-native-local-validation` | Product behavior / specification-driven exploratory QA |
| `exploratory-qa` | 002 | `android-native-local-validation` | `exploratory-qa-vs-android-native-local-validation` | Android tooling / Release APK / physical device / Maestro / native failure |
| `android-native-local-validation` | 001 | `android-native-local-validation` | `exploratory-qa-vs-android-native-local-validation` | Native local validation |
| `android-native-local-validation` | 002 | `exploratory-qa` | `exploratory-qa-vs-android-native-local-validation` | Android を含むが Product behavior 探索が主目的 |
| `code-review` | 001 | `code-review` | `code-review-vs-repair-loop` | finding を出す review-only |
| `code-review` | 002 | `repair-loop` | `code-review-vs-repair-loop` | 確定済み finding / validation failure の修正 |
| `repair-loop` | 001 | `repair-loop` | `repair-loop-vs-harness-improvement` | 現在の code/test failure の bounded repair |
| `repair-loop` | 002 | `harness-improvement` | `repair-loop-vs-harness-improvement` | run/eval failure から harness 改善候補を作る |
| `harness-improvement` | 001 | `harness-improvement` | `repair-loop-vs-harness-improvement` | harness 改善候補作成 |
| `harness-improvement` | 002 | `repair-loop` | `repair-loop-vs-harness-improvement` | harness ではなく現在の実装修正が主目的 |
| `feature-plan` | 001 | `feature-plan` | `feature-plan-vs-direct-implementation` | 計画だけを求める |
| `feature-plan` | 002 | `null` | `feature-plan-vs-direct-implementation` | plan artifact 不要の明確な単純実装だけを求める |

この12配置を train / validation にそれぞれ作る。

これにより24件で以下を満たす。

- 各 Skill / split の positive 1件以上。
- 各 Skill / split の negative 1件以上。
- 4 boundary の train / validation coverage。
- 各 boundary の expected side coverage。
- `feature-plan-vs-direct-implementation` の `feature-plan` / `null` 両側 coverage。

24件を超える case は、上記 coverage を24件で満たせない具体的理由が見つかった場合だけ PR2 内で追加する。単純 paraphrase を増やすためには追加しない。

### 4.7 Query authoring rule

scored case では以下を避ける。

- `$code-review` 等の明示 Skill 名。
- 「どのSkillを使うべきか」のような routing meta-question。
- expected label を示唆する evaluator instruction。
- 2 Skill 以上が正当に必要となる複合依頼。

train / validation は同じ boundary を測るが、対象作業・言い回し・具体状況を変える。

### 4.8 Query duplicate normalization

重複検知専用 normalization を以下で固定する。

1. Unicode NFKC normalization。
2. 前後 whitespace trim。
3. 連続 whitespace を ASCII space 1個へ collapse。
4. `toLowerCase()`。

normalized query は duplicate detection にだけ使う。

Host へ渡す query は YAML の原文を UTF-8 でそのまま渡す。

normalized duplicate は同一 split 内 / split 間のどちらも禁止する。

---

## 5. Scoring contract

### 5.1 Outcome

```text
pass
false_negative
sibling_misroute
unexpected_trigger
unobservable
```

### 5.2 Set-based scoring

`observed_skills` は canonical 6 Skill の unique set とする。

```text
Host evidence を信頼できる形で取得できない
→ unobservable

expected_skill = null
AND observed_skills = ∅
→ pass

expected_skill = null
AND observed_skills ≠ ∅
→ unexpected_trigger

expected_skill != null
AND observed_skills = ∅
→ false_negative

expected_skill != null
AND expected_skill ∉ observed_skills
→ sibling_misroute

expected_skill != null
AND expected_skill ∈ observed_skills
AND observed_skills に expected_skill 以外もある
→ unexpected_trigger

expected_skill != null
AND observed_skills = {expected_skill}
→ pass
```

read 順序は scoring に使わない。

複数 Skill が正当に必要な query は dataset から除外しているため、expected Skill に加えて sibling Skill が observed された場合は `unexpected_trigger` とする。

### 5.3 Unobservable の扱い

以下は routing failure ではなく observation failure として `unobservable` にする。

- Codex process timeout。
- Codex non-zero exit。
- `thread.started` を1件確認できない。
- terminal event が `turn.completed` にならない。
- `turn.failed` / top-level `error` が発生する。
- hook log correlation が0 / 複数 fileで一意にならない。
- hook append delta の parse failure。
- actual Skill read selector を信頼できない。

`unobservable` を pass にしない。

### 5.4 JSONL lifecycle

1 case の Host lifecycle success は以下とする。

```text
thread.started を1件確認
AND
turn.completed を確認
```

以下は observation failure:

```text
turn.failed
top-level error
process timeout
process non-zero exit
terminal event欠落
```

Host response本文の内容を routing scoring に使用しない。

---

## 6. 実装構造

### 6.1 Pure logic

固定 path:

```text
scripts/evals/skill-trigger-evals.ts
```

責務:

- canonical Skill constants
- boundary constants
- dataset discovery / YAML parse
- schema / invariant validation
- owner / split derivation
- positive / negative derivation
- boundary integrity validation
- query normalization
- dataset fingerprint
- set-based scoring
- summary aggregation
- baseline comparison
- result type definitions

外部 process を起動しない。

class hierarchy や framework abstraction は作らない。plain function / plain object を使う。

### 6.2 Side-effect runner

固定 path:

```text
scripts/evals/run-skill-trigger-evals.ts
```

責務:

- CLI option parse
- Target root preflight
- Target root dataset load
- `codex exec` spawn
- stdin query write
- per-case timeout
- stdout JSONL lifecycle parse
- normal/fallback hook log before/after snapshot
- changed hook log delta identification
- actual canonical Skill read extraction
- pure scorer 呼び出し
- result serialization
- output file write

Host interface / provider interface / adapter class は作らない。

Git worktree の作成・削除はrunnerへ入れない。

### 6.3 Deterministic test

固定 path:

```text
tests/repository-contract/skill-trigger-evals.test.ts
```

Host Runtime は起動しない。

主に `scripts/evals/skill-trigger-evals.ts` の pure logic を検証する。

side-effect runner には framework-level unit test を大量に作らない。observation probe と canonical live run が integration evidence になる。

### 6.4 Dependency

原則追加しない。

既存:

```text
Node.js
TypeScript
tsx
yaml
Vitest
Git worktree
```

を再利用する。

---

## 7. Runner CLI contract

### 7.1 package scripts

`package.json` に固定名で追加する。

```json
{
  "eval:skills:trigger:validate": "tsx scripts/evals/run-skill-trigger-evals.ts --validate-only",
  "eval:skills:trigger": "tsx scripts/evals/run-skill-trigger-evals.ts"
}
```

`verify` へ追加するのは `eval:skills:trigger:validate` のみ。

### 7.2 Supported options

PR2 で追加する option は以下だけ。

```text
--validate-only
--target-root <path>
--split train|validation|all
--output <path>
--compare <path>
```

#### `--validate-only`

- Host を起動しない。
- current repository root の dataset / schema / invariant / fingerprint生成可能性を検証する。
- `--target-root` / `--output` / `--compare` は使用しない。
- `--split` は不要で、全 dataset を検証する。

#### `--target-root`

- live mode では必須。
- Codex `-C` と live dataset source の両方に使う。
- evaluator root 自身を指定してはいけない。
- Git worktree であり、tracked diff / staged diff がないことを preflight する。
- `source_git_sha` は Target root の `HEAD` から取得する。
- runner は Target root を作成・削除しない。

#### `--split`

- default: `all`
- PR2 baseline: `all`
- PR3 tuning: `train`
- PR3 holdout確認: `validation`

#### `--output`

- live mode では必須。
- evaluator root 側に置く。
- Target root 配下を指定してはいけない。
- case実行中の result が後続caseのRepository contextへ見える構造にしない。

#### `--compare`

- optional。
- `--split all` のときだけ許可する。
- baseline artifact は evaluator root 側から読む。
- Target root 配下の artifact を comparison source にしない。

### 7.3 追加しない option

```text
case filter
parallelism
retry count
repeat count
statistical sampling
model sweep
worktree create/remove
```

### 7.4 Canonical execution

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-baseline.json
```

### 7.5 Train execution

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split train \
  --output .codex/runs/<run_id>/trigger-eval-train.json
```

### 7.6 Validation execution

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split validation \
  --output .codex/runs/<run_id>/trigger-eval-validation.json
```

### 7.7 Baseline comparison

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-result.json \
  --compare <baseline-json>
```

---

## 8. Target root / Codex execution contract

### 8.1 Target root preflight

live run開始前に runner は最低限以下を確認する。

```text
Target root が存在する
Target root が evaluator root と別path
Target root が Git worktree
tracked working-tree diffなし
staged diffなし
12 dataset filesをTarget rootから読める
6 canonical SkillをTarget rootから発見できる
```

untracked / ignored hook log は live run 中に生成されるため、run開始後の存在自体を tracked-dirty 扱いしない。

### 8.2 Source commit と active Run Artifact

source implementation commit には以下を含める。

```text
12 dataset files
pure logic
runner
test
package.json
必要なsource変更
```

canonical baselineを取る前の source implementation commit には、**今回の active implementation Run Artifact と baseline result を含めない**。

理由:

- Target rootをsource commitから作ることで、evaluatorのactive Run ArtifactをHost contextから除外する。
- baseline/result自身を後続caseが読める場所に置かない。
- `source_git_sha` と評価対象source/datasetを一致させる。

Repository policy上必要なRun Artifactは削除せず evaluator root に保持し、baseline取得後の後続commitで正式に保存する。

### 8.3 Codex command

各 live case で Node child process から直接以下を起動する。

```bash
codex exec --json --ephemeral --sandbox read-only -C <target-root> -
```

query は stdin へ UTF-8 でそのまま書き込む。

### 8.4 Execution rules

- 1 case = 1 process / 1 fresh ephemeral session。
- case は逐次実行。
- parallelismなし。
- retryなし。
- expected labelやcase metadataをpromptへ追加しない。
- project config / Skill discovery は通常条件を維持する。
- `--ignore-user-config` 等、通常 routing 条件を変える flag は追加しない。
- explicit `--sandbox read-only` を使う。
- network を有効化する override はしない。

### 8.5 Timeout

per-case timeout は CLI option にせず source constant とする。

```text
CASE_TIMEOUT_MS = 120000
```

2分を超えた case は child process を終了し `unobservable` として次 case へ進む。

retry はしない。

現行 Host で全体的に2分を超えて observation 不能になる場合は timeout framework を拡張せず blocker / follow-up として扱う。

### 8.6 Hook log evidence

normal / fallback の両方をsnapshot対象にする。

```text
<target-root>/.codex/logs/hooks-*.jsonl
<target-root>/.artifacts/codex-hooks/hooks-*.jsonl
```

exactly 1 file の append delta を取得できた場合だけ当該caseのevidenceとして使う。

0 / 複数 / non-append change は `unobservable`。

### 8.7 Skill read extraction

probe で実測した current Codex の exact `PostToolUse` evidence shape のみを selector として実装する。

selector は少なくとも次を区別できなければならない。

- actual canonical `SKILL.md` read/open
- `AGENTS.md` や別file中に path文字列が書かれていただけ
- grep/search output中のpath mention
- arbitrary command text中のpath mention

query content からSkillを推測してはいけない。

---

## 9. Result / baseline contract

### 9.1 Output JSON

initial PR2 baseline の例:

```json
{
  "schema_version": 1,
  "provenance": {
    "source_git_sha": "...",
    "dataset_sha256": "...",
    "codex_version": "...",
    "model": "unreported",
    "executed_at": "...",
    "split": "all"
  },
  "cases": [
    {
      "id": "code-review-train-001",
      "owner_skill": "code-review",
      "split": "train",
      "boundary": "code-review-vs-repair-loop",
      "expected_skill": "code-review",
      "observed_skills": ["code-review"],
      "outcome": "pass"
    }
  ],
  "summary": {
    "total": 24,
    "by_outcome": {},
    "by_owner_skill": {},
    "by_split": {},
    "by_boundary": {}
  }
}
```

### 9.2 `query` を result に複製しない

case query のSSOTは12 dataset filesとする。

result JSONには `query` を保存しない。

理由:

- dataset / result の二重管理を避ける。
- artifactを小さくする。
- validation queryをRun Artifactへ不要に複製しない。
- case ID と `dataset_sha256` で元datasetを特定できる。

### 9.3 Serialization order

stable diff のため以下を固定する。

- `cases`: case ID 辞書順。
- `observed_skills`: canonical Skill 名辞書順。
- summary object key: 固定 canonical order または辞書順のどちらか1つに統一する。

### 9.4 Provenance

最低限:

```text
source_git_sha
dataset_sha256
codex_version
model
executed_at
split
```

model は明示指定またはHostから確実に観測できる場合のみ値を保存する。得られなければ `unreported`。

Target rootのabsolute pathは保存しない。

### 9.5 Dataset fingerprint

Target rootの12 dataset filesを repository-relative path 辞書順に並べる。

各fileについて、

```text
path + NUL + raw file bytes
```

を連結した byte sequence の SHA-256 を `dataset_sha256` とする。

parsed YAML の再serializationは使わない。

### 9.6 source_git_sha と baseline 実行順序

`source_git_sha` は baseline JSON 自身を含む commit SHA ではない。

**runner / dataset / package scripts / tests を含み、baseline artifact生成前に確定した source implementation commit SHA** とする。

canonical baseline取得順序:

1. runner / dataset / tests / package scripts を完成させる。
2. deterministic validation / repository validation を通す。
3. source implementation を commit する。今回の active Run Artifact はこのcommitへ含めない。
4. source commit SHAを取得する。
5. `git worktree add --detach <target-root> <source_git_sha>` でTarget rootを作る。
6. Target root tracked stateがcleanであることを確認する。
7. runnerをEvaluator rootから起動し、Target rootを `--target-root` へ渡してlive baselineを実行する。
8. baseline JSON / Run ArtifactをEvaluator rootに生成する。
9. Target rootをcleanupする。
10. baseline / standard Run Artifactを後続commitで保存する。

baseline artifact自身を含むcommit SHAをJSON内へ自己参照させない。

---

## 10. Baseline comparison contract

### 10.1 前提

`--compare` は `--split all` のみ許可する。

baseline / current の `dataset_sha256` が一致しない場合は comparison error。

case ID set が完全一致しない場合も comparison error。

### 10.2 Observable outcome

comparison上、以下を observable とする。

```text
pass
false_negative
sibling_misroute
unexpected_trigger
```

`unobservable` は routing quality の良否ではなく observation state として別扱いする。

### 10.3 Case status

```text
baseline = pass
current = pass
→ unchanged_pass

baseline = observable failure
current = pass
→ fixed

baseline = pass
current = observable failure
→ regressed

baseline = observable failure
current = observable failure
→ unchanged_failure

baseline = observable outcome
current = unobservable
→ newly_unobservable

baseline = unobservable
current = observable outcome
→ recovered_observable

baseline = unobservable
current = unobservable
→ unchanged_unobservable
```

`observable failure` は以下。

```text
false_negative
sibling_misroute
unexpected_trigger
```

failure categoryが別failure categoryへ変わっても `unchanged_failure`。

`recovered_observable` は「routingが改善した」という意味ではない。current outcome自体を併記して判断可能にする。

ranking / severity / weighted score は作らない。

### 10.4 Comparison output

`--compare` 指定時のみ top-level `comparison` を追加する。

```json
{
  "comparison": {
    "baseline_source_git_sha": "...",
    "counts": {
      "fixed": 0,
      "regressed": 0,
      "unchanged_pass": 0,
      "unchanged_failure": 0,
      "newly_unobservable": 0,
      "recovered_observable": 0,
      "unchanged_unobservable": 0
    },
    "cases": [
      {
        "id": "code-review-train-001",
        "baseline_outcome": "pass",
        "current_outcome": "pass",
        "status": "unchanged_pass"
      }
    ]
  }
}
```

comparison `cases` も case ID 辞書順。

### 10.5 Provenance差

`dataset_sha256` 不一致は comparison error。

Codex version / model 等の provenance が異なる場合は comparison 自体を禁止しないが、result / `REPORT.md` で条件差を明示する。

---

## 11. Exit code contract

### exit 0

以下は runner 実行成功とする。

- selected split の全 case を処理しoutputを保存できた。
- `false_negative` / `sibling_misroute` / `unexpected_trigger` が存在する。
- 一部 case が `unobservable` でも全 case を最後まで処理してresultを保存できた。

routing failure / per-case observation failure は評価結果でありrunner failureではない。

### exit 1

以下は runner / input contract failure とする。

- dataset validation failure。
- unsupported CLI option combination。
- live modeで `--target-root` 欠落。
- live modeで `--output` 欠落。
- evaluator root と Target root が同一。
- Target rootがGit worktreeでない。
- live run開始前からTarget rootにtracked/staged diffがある。
- `--output` がTarget root配下。
- `--compare` と `--split train|validation` の併用。
- output file write failure。
- baseline JSON parse / schema failure。
- comparison時dataset fingerprint mismatch。
- comparison時case ID set mismatch。
- Codex executable自体を起動できず全caseを評価不能。

個別caseのHost timeout / failure / evidence ambiguityは `unobservable` とし、全体exit 1へ直結させない。

---

## 12. Deterministic validation / CI

### 12.1 Dataset validation

`pnpm run eval:skills:trigger:validate` で以下を hard gate にする。

- 6 Skill discovery。
- 12 dataset file presence。
- YAML parse。
- `schema_version = 1`。
- exact allowed fields。
- case ID global uniqueness。
- case ID owner / split prefix integrity。
- query non-empty。
- expected Skill が canonical 6 Skill または `null`。
- boundary が固定4種のいずれか。
- owner / split をpathから導出できる。
- boundary participant integrity。
- normalized duplicateなし。
- 各 Skill / split の positive + negative 最低1件。
- train / validation 双方の4 boundary coverage。
- 各 boundary で必要な expected side coverage。
- dataset fingerprint生成可能。

**case総数がexactly 24かどうかはvalidatorで強制しない。**

24件はPR2 initial datasetの実装方針であり、将来有用なcaseを追加するたびvalidator変更を要求する永久invariantにはしない。

single-intentかどうかはsemanticなのでLLM validatorを作らない。dataset reviewで確認する。

### 12.2 Pure logic tests

`tests/repository-contract/skill-trigger-evals.test.ts` で最低限以下を固定する。

#### Dataset

- valid minimal fixture PASS。
- malformed schema FAIL。
- unknown field FAIL。
- duplicate ID FAIL。
- ID owner/split mismatch FAIL。
- normalized duplicate query FAIL。
- unknown expected Skill FAIL。
- unknown boundary FAIL。
- boundary participant mismatch FAIL。
- Skill/split positive欠落 FAIL。
- Skill/split negative欠落 FAIL。
- required boundary side欠落 FAIL。
- 24件を超えてもcoverage/schemaが正しければ件数だけを理由にFAILしない。

#### Scoring

- `null + empty` → `pass`。
- `null + observed` → `unexpected_trigger`。
- `expected + empty` → `false_negative`。
- `expected absent + sibling observed` → `sibling_misroute`。
- `expected present + extra sibling` → `unexpected_trigger`。
- `expected only` → `pass`。
- observation failure → `unobservable`。
- observed orderだけ変えても outcome不変。

#### Comparison

- pass→pass = `unchanged_pass`。
- observable failure→pass = `fixed`。
- pass→observable failure = `regressed`。
- observable failure→observable failure = `unchanged_failure`。
- observable→unobservable = `newly_unobservable`。
- unobservable→observable = `recovered_observable`。
- unobservable→unobservable = `unchanged_unobservable`。
- dataset fingerprint mismatch = error。
- missing/extra case ID = error。

### 12.3 verify integration

`pnpm run verify` へ入れるのは deterministic validate command のみ。

live Codex eval は入れない。

---

## 13. PR2 baseline / PR3 運用

### 13.1 PR2 baseline

source implementation commit後にclean detached Target rootを作る。

```bash
git worktree add --detach <target-root> <source_git_sha>
```

Evaluator rootから:

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-baseline.json
```

を1回実行する。

scoreの高さはPR2 success条件ではない。

### 13.2 PR3 tuning

PR3でもcurrent description commitからclean detached Target rootを用意する。

tuning中は:

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split train \
  --output .codex/runs/<run_id>/trigger-eval-train.json
```

のみ使用する。

validation はtuning中に見て修正対象へ合わせない。

### 13.3 PR3 holdout

trainで変更を確定したsource commitから新しいclean detached Target rootを作り、

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split validation \
  --output .codex/runs/<run_id>/trigger-eval-validation.json
```

でholdout確認する。

その後、同じsource commitのclean Target rootで正式比較を行う。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-result.json \
  --compare <PR2-baseline-json>
```

---

## 14. 実行タスク

- [ ] 1. current `main` / PR1 #123 merge state / branch diffを確認する。
- [ ] 2. current 6 Skill `description` を記録し、PR2中の変更禁止を確認する。
- [ ] 3. evaluator rootでimplementation Runを開始する。
- [ ] 4. current committed HEADからprobe用clean detached worktreeを作る。
- [ ] 5. positive observation controlをprobe Target rootで実行する。
- [ ] 6. negative observation controlをprobe Target rootで実行する。
- [ ] 7. normal/fallback hook directoryのbefore/after差分からexactly 1 append deltaを取得できることを確認する。
- [ ] 8. actual canonical `SKILL.md` read selectorをprobe evidenceから固定する。
- [ ] 9. general shell parserが必要になる等probe不成立ならclassifier等を作らずblockerとして停止する。
- [ ] 10. probe用worktreeをcleanupする。
- [ ] 11. 6 Skill `SKILL.md` / `AGENTS.md` から4 routing boundaryの意味を再確認する。
- [ ] 12. 本Planの24-case matrixに従って12 YAML filesを作る。
- [ ] 13. train / validation queryがsingle-intentで、単純paraphraseでないことをレビューする。
- [ ] 14. `scripts/evals/skill-trigger-evals.ts` にpure logicを実装する。
- [ ] 15. `scripts/evals/run-skill-trigger-evals.ts` に最小side-effect runnerを実装する。
- [ ] 16. `--validate-only` / `--target-root` / `--split` / `--output` / `--compare` のみ実装する。
- [ ] 17. 120秒固定per-case timeoutを実装する。
- [ ] 18. deterministic repository contract testを追加する。
- [ ] 19. `package.json` に2 commandを追加しvalidateのみ`verify`へ入れる。
- [ ] 20. deterministic validation / repository validationを実行する。
- [ ] 21. runner / dataset / test / package scriptsをsource implementation commitとしてcommitする。active Run Artifactはこのcommitへ含めない。
- [ ] 22. source implementation commit SHAを取得する。
- [ ] 23. source SHAからcanonical baseline用clean detached Target rootを作る。
- [ ] 24. Target root preflightでtracked/staged diffなしを確認する。
- [ ] 25. Target rootを `--target-root` としてcanonical `--split all` baselineを1回実行する。
- [ ] 26. baseline JSONをEvaluator rootのRun Directoryへ保存する。
- [ ] 27. baseline failureをoutcome / owner Skill / split / boundaryで整理する。
- [ ] 28. failureを見てもdescription / routing contractは変更しない。
- [ ] 29. Target rootをcleanupする。
- [ ] 30. Run-level `evaluation.json` / `REPORT.md` からbaseline artifactを参照する。
- [ ] 31. Run Artifact sanitizationを行う。
- [ ] 32. final diffでscope逸脱がないことを確認する。
- [ ] 33. baseline / standard Run Artifactを後続commitで保存する。

---

## 15. 検証方法

### 15.1 Observation probe

positive / negative control双方で以下を確認する。

- evaluator rootとは別のclean detached Target rootで実行する。
- `codex exec --json --ephemeral --sandbox read-only` が動く。
- 1 processだけ実行される。
- normal/fallback hook directoryの差分からexactly 1 append evidenceを取得できる。
- positive controlで指定Skill actual readを検出できる。
- negative controlでcanonical Skill readが0件。
- path mentionをactual Skill readと誤判定しない。
- selectorのためにgeneral shell parserを作らなくてよい。

### 15.2 Static dataset validation

```bash
pnpm run eval:skills:trigger:validate
```

### 15.3 Repository contract test

```bash
pnpm run test:repository
```

### 15.4 Existing Skill validation

```bash
pnpm run validate:skills
```

### 15.5 Canonical baseline

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-baseline.json
```

確認:

- initial 24 case全件処理。
- 1 case = 1 ephemeral process。
- case metadata label leakageなし。
- evaluator active Run Artifact / output artifactがTarget rootに存在しない。
- 6 Skill同時条件。
- `source_git_sha` がTarget root HEADと一致。
- dataset fingerprintがTarget root datasetから計算されている。
- `thread.started` + `turn.completed` lifecycle確認。
- result schema契約どおり。
- `query`がresultへ重複保存されていない。
- observed Skill sort安定。
- summaryがcase resultと一致。
- `unobservable`をpassに隠していない。

### 15.6 Comparison smoke

live modelを再実行する必要はない。

baseline resultのself comparisonで:

```text
pass → unchanged_pass
observable failure → unchanged_failure
unobservable → unchanged_unobservable
```

となり、case ID mismatchがないことをpure testまたはlocal smokeで確認する。

### 15.7 Repository regression

最低限:

```bash
pnpm run eval:skills:trigger:validate
pnpm run test:repository
pnpm run validate:skills
pnpm run verify
```

live canonical evalはCI hard gateにしない。

### 15.8 Scope guard

変更可:

```text
.agents/skills/*/evals/trigger/**
scripts/evals/skill-trigger-evals.ts
scripts/evals/run-skill-trigger-evals.ts
tests/repository-contract/skill-trigger-evals.test.ts
package.json
pnpm-lock.yaml  # dependency追加が本当に必要な場合のみ
PR2 implementation Run Artifact
```

変更禁止:

```text
.agents/skills/*/SKILL.md の description
AGENTS.md の routing 意味契約
Product code
Product E2E / training scenario
PR4 Deterministic Output Eval logic
PR5 Semantic Output Eval logic
PR6 Workflow E2E Eval logic
新規 Agent Runtime
routing classifier
LLM judge
general Host adapter
general shell parser
retry framework
parallel runner
statistical scoring framework
runner内のGit worktree lifecycle manager
```

---

## 16. 成功判定

PR2成功:

- deterministic dataset validation PASS。
- repository contract tests PASS。
- `pnpm run verify` PASS。
- positive / negative observation controlが成立する。
- canonical live baselineがclean Target rootでinitial 24 scored caseを処理しmachine-readable resultを保存できる。
- evaluatorのactive Run Artifact / resultをHost contextへ混入していない。
- baseline resultをcase ID単位で後続比較できる。
- `unobservable` transitionをrouting改善/悪化と混同しない。
- `source_git_sha`で実際の評価対象sourceを特定できる。
- routing failureが残っていても記録できている。
- description tuning 0件。
- Repository独自Agent Runtime / classifier 0件。

PR2 blocker:

- observation controlが成立せずHost Skill selectionを信頼できる形で観測できない。

この場合は評価方式を捏造せずblockerを記録する。

---

## 17. リスクと対策

### 17.1 Evaluator metadataがroutingへリークする

対策: evaluator rootとTarget rootを分離し、source commitからclean detached worktreeを作る。active implementation Run Artifact / output artifactをTarget rootへ置かない。

### 17.2 複合依頼を単一Skillで採点する

対策: scored datasetはsingle-intent限定。multi-SkillはPR6。

### 17.3 Skill read順をrouting priorityと誤解する

対策: set-based scoringのみ。

### 17.4 Skill read proxy自体が誤っている

対策: positive controlだけでなくnegative controlも実施。

### 17.5 Hook logger fallbackを見落とす

対策: `.codex/logs/` と `.artifacts/codex-hooks/` の双方を同じsnapshot集合として扱う。

### 17.6 過去hook eventが当該caseへ混入する

対策: changed file全体ではなくbefore-size以降のappend deltaだけを読む。

### 17.7 Codex内部IDへ依存する

対策: ThreadId / SessionId対応を実装せずhook log before/after差分でcorrelateする。

### 17.8 同時別sessionでhook logが混ざる

対策: 複数file変化時は推測せず`unobservable`。

### 17.9 Observation不能をclassifier/parserで補完する

対策: classifier / LLM judge / general shell parserを作らずblockerとして停止する。

### 17.10 Datasetが増えすぎる

対策: PR2 initial datasetは24 casesで固定matrixを使う。ただしvalidatorはexact件数を永久invariantにしない。

### 17.11 Dataset taxonomyが増えすぎる

対策: Issue指定4 boundaryだけ。

### 17.12 Validationをtuningに使う

対策: `--split train|validation|all`を持ち、PR3運用を固定する。

### 17.13 Runnerが巨大化する

対策: pure logicとside effectの2fileだけに分離。class/frameworkは作らない。

### 17.14 Timeoutなしでrunが停止する

対策: fixed 120秒per-case timeout。retryなし。

### 17.15 Baseline SHAが評価対象とずれる

対策: source implementationを先にcommitし、そのSHAからTarget rootを作って評価してからartifactを後続commitする。

### 17.16 `unobservable`をrouting failure改善/悪化と誤認する

対策: `newly_unobservable` / `recovered_observable` / `unchanged_unobservable` をcomparisonで分離する。

### 17.17 Live evalをCI gateにする

対策: deterministic validateのみ`verify`へ追加。

### 17.18 Baseline failureをPR2で直す

対策: failureはPR3 input。PR2ではdescription変更禁止。

---

## 18. 成果物

### 18.1 予定変更ファイル

```text
.agents/skills/android-native-local-validation/evals/trigger/train.yaml
.agents/skills/android-native-local-validation/evals/trigger/validation.yaml
.agents/skills/code-review/evals/trigger/train.yaml
.agents/skills/code-review/evals/trigger/validation.yaml
.agents/skills/exploratory-qa/evals/trigger/train.yaml
.agents/skills/exploratory-qa/evals/trigger/validation.yaml
.agents/skills/feature-plan/evals/trigger/train.yaml
.agents/skills/feature-plan/evals/trigger/validation.yaml
.agents/skills/harness-improvement/evals/trigger/train.yaml
.agents/skills/harness-improvement/evals/trigger/validation.yaml
.agents/skills/repair-loop/evals/trigger/train.yaml
.agents/skills/repair-loop/evals/trigger/validation.yaml
scripts/evals/skill-trigger-evals.ts
scripts/evals/run-skill-trigger-evals.ts
tests/repository-contract/skill-trigger-evals.test.ts
package.json
```

### 18.2 Run Artifact

- 正本 Plan:
  - `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
- PR2 implementation の標準 `.codex/runs/<run_id>/` Artifact
- canonical baseline:
  - `.codex/runs/<run_id>/trigger-eval-baseline.json`
- raw hook evidence:
  - `<target-root>/.codex/logs/` または `<target-root>/.artifacts/codex-hooks/` の一時JSONL
  - commitしない
  - Target worktree cleanup時に破棄してよい

---

## 19. 実装判断の禁止事項

実装者は以下を「便利だから」という理由で追加しない。

- 24件を大きく超える初期dataset。
- validatorのexact 24件固定。
- new taxonomy。
- custom schema library dependency。
- HostAdapter interface。
- provider abstraction。
- routing engine。
- LLM judge。
- user query classifier。
- general shell parser。
- retry/backoff。
- parallel execution。
- case filtering CLI。
- repeat count。
- model sweep。
- statistical score。
- dashboard。
- database。
- runnerによるworktree作成/削除framework。
- `evaluation.json` schemaのTrigger Eval向け肥大化。

上記が本当に必要と判明した場合はPR2内でそのまま追加せず、理由をRun Artifactへ記録してscopeを再確認する。

---

## 20. 備考

- PR2の価値はscoreの高さではなく、PR3前のcurrent routingを同じdatasetで再測定可能に固定することにある。
- initial 24 casesは統計benchmarkではなく、6 SkillとIssue指定near-missを持つ回帰baselineである。
- 24 casesはPR2初期データの設計値であり、dataset validatorの永久的な件数contractではない。
- train / validationを分ける目的はPR3 tuning時のholdoutを維持するためである。
- `evals/` はこのRepository独自のSkill評価拡張であり、Agent Skills一般仕様の必須directoryとして扱わない。
- pure logicとside-effect runnerの2file分割はframework化ではなく、実装とtestを単純に保つための最小分離である。
- Target root分離は独自Agent Runtimeではない。既存Codexをそのまま使い、evaluator metadataをHost working treeから分離するための評価環境上の境界である。
- PR1で整理したPortabilityを壊さないため、Skill-local datasetからlocal machine固有absolute pathやcredentialを参照しない。
