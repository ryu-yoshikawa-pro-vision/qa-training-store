# Issue #117 PR2 Trigger Eval baseline 実装計画

## 0. 依頼概要

- 依頼内容: Issue #117 の PR2「Trigger Eval baseline」を実装するための計画を、PR2専用ブランチ上に保存する。
- 背景: PR1（#123）で Skill package 構造と routing SSOT の整理が `main` に取り込まれた。PR3 では Skill description を最適化する予定だが、その前に現状の routing 性能を再現可能な baseline として固定する必要がある。
- 期待成果: 6 Skill すべてについて positive / negative の Trigger Eval dataset を train / validation に分離し、全 Skill が同時に利用可能な現行 Codex Host 上で routing を評価・記録・比較できる最小基盤を作る。
- 対象 Issue: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117
- 実装ブランチ: `refactor/117-pr2-trigger-eval-baseline`
- Plan 作成時の base: PR #123 merge 後の `main`

## 1. ゴール / 完了条件

### ゴール

Skill description を変更する前の状態で、6 Skill の routing と Issue #117 が指定する near-miss 境界を現行 Codex Host 上で再現可能に測定し、PR3 以降で同条件比較できる baseline を残す。

PR2 の目的は「routing を良くすること」ではなく「現在の routing を測れること」である。baseline で failure が出ても PR2 内では description を修正しない。

### 完了条件（DoD）

- [ ] 以下の 6 Skill すべてに `evals/trigger/train.yaml` と `evals/trigger/validation.yaml` が存在する。
  - `android-native-local-validation`
  - `code-review`
  - `exploratory-qa`
  - `feature-plan`
  - `harness-improvement`
  - `repair-loop`
- [ ] 各 Skill / split に、その Skill へ route すべき positive case と、その Skill へ route すべきでない negative case が最低 1 件ずつある。
- [ ] PR2 の scored dataset は、期待 routing が「canonical 6 Skill のちょうど 1 Skill」または「どの canonical Skill も不要」のどちらかへ一意に決まる single-intent query のみに限定する。
- [ ] 複数 Skill が正当に必要な複合依頼は PR2 の score 対象に含めず、PR6 Workflow E2E Eval の責務として残す。
- [ ] train / validation は物理ファイルで分離する。
- [ ] train / validation を跨ぐ normalized duplicate query がない。
- [ ] Issue #117 の 4 near-miss 境界を train / validation の双方でカバーする。
- [ ] Canonical Eval は対象 Skill だけを隔離せず、Repository の 6 Skill が同時に利用可能な通常条件で実行する。
- [ ] Host へ渡す内容は dataset の自然な `query` 本文のみとし、`expected_skill`、owner Skill、split、boundary、case ID を prompt へ混ぜない。
- [ ] 現行 Codex Host が実際に使用した Skill を Host-native な実行 evidence から観測する。
- [ ] Repository 独自の keyword / regex / embedding / LLM classifier、Agent Runtime、routing engine、Workflow Engine を追加しない。
- [ ] case 単位で `pass` / `false_negative` / `sibling_misroute` / `unexpected_trigger` / `unobservable` を判定できる。
- [ ] scoring は observed Skill の集合で判定し、Skill を読んだ順序を正誤判定に使わない。
- [ ] Skill / split / boundary / outcome の集計を保存できる。
- [ ] baseline result に Git SHA / dataset fingerprint / Codex version / model 情報（観測できる範囲）/ execution timestamp を残す。
- [ ] baseline と後続 result を case ID 単位で `fixed` / `regressed` / `unchanged_pass` / `unchanged_failure` に比較できる。
- [ ] live routing score は `pnpm run verify` の hard gate にしない。
- [ ] dataset/schema/invariant と pure scoring/comparison logic のみ deterministic test / CI で検証する。
- [ ] 6 Skill の `SKILL.md` frontmatter `description` を変更していない。
- [ ] `AGENTS.md` の routing 意味契約を変更していない。
- [ ] Product code、Product test、training content を変更していない。
- [ ] canonical baseline を 1 回取得し、PR2 implementation Run 配下へ保存する。
- [ ] Repository の通常 validation と Trigger Eval deterministic validation が PASS する。

## 2. 現状理解と前提

### Current understanding

#### Entry points

- `AGENTS.md`
  - Repository-level Skill routing の SSOT。
  - 6 Skill の高レベルな使い分けを定義している。
- `.agents/skills/<skill>/SKILL.md`
  - 各 Skill の入口契約。
  - 現在の `description` が PR2 baseline の評価対象であり、PR2 では変更禁止。
- `.codex/config.toml`
  - 現行 Codex Host の project-scoped config。
  - hooks が有効で、`PostToolUse` 等が `.codex/hooks/log_event.mjs` を呼ぶ。
- `.codex/hooks/log_event.mjs`
  - `session_id` ごとに `.codex/logs/hooks-<session_id>.jsonl` を生成し、`PostToolUse` の `tool_name` / `tool_input_preview` を bounded / sanitized JSONL として残す既存観測面。
- `.codex/logs/.gitignore`
  - hook JSONL は commit 対象外。
- `package.json`
  - `validate:skills` と Repository 全体の `verify` はあるが、Trigger Eval command はまだない。
- `scripts/validate-skills.ts`
  - Skill package/frontmatter/reference 等の deterministic validation を担当する既存 validator。
- `tests/repository-contract/validate-skills.test.ts`
  - Skill package validation の既存 repository contract test。
- `.codex/templates/evaluation.schema.json`
  - Run-level `evaluation.json` の既存 schema。Trigger Eval case result を無理にここへ詰め込まない。

#### Codex Host 側で確認できていること

現行 Codex の Skill prompt contract では、task が Skill description に一致した場合に Skill を使用し、選択後はその `SKILL.md` を完全に読むことが要求されている。

`codex exec` には少なくとも以下がある。

- `--json`
- `--ephemeral`
- `--sandbox read-only`
- `-C / --cd`

PR2 では別 Host を一般化せず、この Repository が現在使っている Codex CLI だけを評価対象にする。

#### Main flow

1. scored dataset を作る前に、評価対象外の明示 Skill query で observation probe を行う。
2. `codex exec --json --ephemeral --sandbox read-only -C <repo-root> -` を 1 session 起動し、query は stdin へそのまま渡す。
3. `thread.started` の thread/session identity と既存 hook log の `session_id` が一意に対応できることを確認する。
4. `PostToolUse` evidence から canonical `.agents/skills/<skill>/SKILL.md` の実 read/open を一意に識別できることを確認する。
5. observation が成立した場合だけ scored dataset と runner を完成させる。
6. 各 scored case を 1 case = 1 fresh ephemeral Codex session で実行する。
7. expected Skill と observed canonical Skill set を pure function で比較する。
8. case result と集計を baseline JSON に保存する。
9. PR3 では同一 dataset / 同一評価手順を使って description 変更前後を case ID 単位で比較する。

### Key concepts

- **Dataset owner Skill**
  - dataset file の配置元 Skill。
  - `.agents/skills/<owner>/evals/trigger/<split>.yaml` の `<owner>` から導出する。
- **Split**
  - `train.yaml` / `validation.yaml` の filename から導出する。
- **Expected Skill**
  - canonical 6 Skill の 1 つ、または `null`。
  - `null` は「6 Skill のどれも使用すべきでない」を意味する。
- **Positive case**
  - `expected_skill === owner_skill`。
  - dataset に `polarity` field は持たせず evaluator が導出する。
- **Negative case**
  - `expected_skill !== owner_skill`。
  - sibling Skill または `null` を期待する。
- **Observed Skills**
  - Host-native evidence で実 read/open が確認できた canonical Skill の重複を除いた集合。
  - raw occurrence order を debug 用に保持してもよいが、scoring には使わない。
- **Canonical Eval**
  - 6 Skill が同時に discover 可能な通常 Repository 条件。
  - target Skill のみを隔離する one-vs-rest eval は行わない。
- **Train split**
  - PR3 の description 調整で failure 分析に使ってよい。
- **Validation split**
  - PR3 の tuning 中は正解合わせに使わず、変更後の確認に使う operational holdout。
- **Single-intent case**
  - query の主要求だけから期待 Skill が 1 Skill または `null` に一意に定まる case。
  - 「レビューして必要なら修正」「計画してから実装」等、複数 Skill が正当に必要になり得る query は scored dataset に入れない。

### Existing tests / validation

- `pnpm run validate:skills`
- `pnpm run test:repository`
- `pnpm run verify`

Trigger routing を実 Codex Host 上で評価する dataset / command は現時点では存在しない。

### Safe change surface

- `.agents/skills/<skill>/evals/trigger/**`
- `scripts/evals/run-skill-trigger-evals.ts`
- `tests/repository-contract/skill-trigger-evals.test.ts`
- `package.json`
- PR2 implementation Run Artifact

### Assumptions

- PR2 の live Host は Codex CLI 1 種類のみ。汎用 `HostAdapter` interface は作らない。
- Skill 使用の一次 evidence は canonical `SKILL.md` の実 read/open とする。
- observation の exact `PostToolUse.tool_name` / `tool_input_preview` shape は実装前に explicit-skill probe で確定する。
- probe で一意に識別できない場合は、runner 実装を推測で進めない。
- 1 case = 1 fresh `--ephemeral` session。
- live case は `--sandbox read-only` で実行する。
- query は stdin 経由でそのまま渡し、shell escaping のために内容を書き換えない。
- model が明示指定・Host から観測できる場合だけ baseline に値を残す。resolved model が得られなければ `unreported` とし、推測しない。

### Non-goals

- Skill description tuning。
- `SKILL.md` Workflow / Output Contract / stop condition の変更。
- `AGENTS.md` routing 文言変更。
- PR2 で routing failure を修正すること。
- multi-Skill query の正しさを評価すること。これは PR6。
- Output quality Eval。PR4 / PR5 の責務。
- keyword / regex / embedding / LLM evaluator による routing 判定。
- Codex Agent Runtime / Skill loading mechanism の再実装。
- 複数 Host / provider 対応の abstraction。
- score の統計モデル、F1、confidence interval、multiple-run aggregation 等。
- live model score の CI hard gate 化。
- Product code、Playwright/Maestro training、native product behavior の変更。

## 3. 質問 / 曖昧性

### 実装開始を止める product question

なし。

### 実装時に最初に解消する技術的 blocker

以下だけは実測が必要であり、推測で固定しない。

- `codex exec --json` の `thread.started.thread_id` と hook `session_id` を一意に対応できるか。
- `PostToolUse` evidence のどの `tool_name` / input shape が「canonical `SKILL.md` を実際に read/open した」ことを示すか。

probe は scored dataset を使わず、Skill 名を明示した評価対象外 query で行う。したがって baseline dataset の routing 結果には影響しない。

### blocker 時の停止条件

次のどれかなら implementation blocker とする。

- session correlation が一意にできない。
- read-only run で既存 hook evidence が取得できない。
- `SKILL.md` の実 read/open と単なる path mention を区別できない。
- Host-native evidence がなく、query 内容から Skill を推測しないと scoring できない。

blocker 時に行ってはいけないこと:

- keyword classifier を作る。
- regex で user query 自体を分類する。
- LLM judge に expected Skill を判定させる。
- 独自 Agent Runtime / Skill loader を作る。
- scored dataset を都合よく変える。

blocker は Run Artifact に記録し、Host-native な観測方法自体を別途見直す。

## 4. 影響範囲

### Skill-local eval data

全 6 Skill に固定で以下を追加する。

```text
.agents/skills/<skill>/evals/trigger/
├── train.yaml
└── validation.yaml
```

計 12 files。

### Shared runner

固定 path:

```text
scripts/evals/run-skill-trigger-evals.ts
```

1 file に以下をまとめる。PR2 では責務ごとの file 分割や class hierarchy を作らない。

- dataset discovery / YAML parse
- deterministic invariant validation
- query normalization for duplicate detection
- dataset fingerprint
- Codex CLI spawn
- JSONL lifecycle parse
- existing hook log correlation
- canonical Skill read extraction
- set-based outcome classification
- summary aggregation
- baseline JSON serialization
- optional baseline comparison

query 内容から Skill を推論する責務は持たせない。

### Deterministic contract test

固定 path:

```text
tests/repository-contract/skill-trigger-evals.test.ts
```

Host Runtime は起動しない。

### package scripts

固定名:

```json
{
  "eval:skills:trigger:validate": "tsx scripts/evals/run-skill-trigger-evals.ts --validate-only",
  "eval:skills:trigger": "tsx scripts/evals/run-skill-trigger-evals.ts"
}
```

`verify` へ追加するのは `eval:skills:trigger:validate` のみ。

### Live runner CLI contract

#### canonical baseline

```bash
pnpm run eval:skills:trigger -- --output .codex/runs/<run_id>/trigger-eval-baseline.json
```

#### baseline comparison

```bash
pnpm run eval:skills:trigger -- \
  --output .codex/runs/<run_id>/trigger-eval-result.json \
  --compare <baseline-json>
```

`--output` は live mode では必須。`--validate-only` では Host を起動せず、output file も不要。

PR2 で追加する runner option は原則以下だけとする。

- `--validate-only`
- `--output <path>`
- `--compare <path>`（任意）

split 選択、case filter、parallelism、retry、repeat count 等は PR2 に追加しない。全 24 case 前後を canonical 条件で逐次実行する。

### Baseline artifact

固定 path:

```text
.codex/runs/<run_id>/trigger-eval-baseline.json
```

既存 `evaluation.json` schema を Trigger Eval 専用に肥大化しない。Run-level `evaluation.json` / `REPORT.md` から supplemental baseline artifact を参照する。

### Files to inspect before editing

- `AGENTS.md`
- `PLANS.md`
- `.agents/skills/*/SKILL.md`
- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- `.codex/logs/.gitignore`
- `.codex/templates/evaluation.schema.json`
- `scripts/validate-skills.ts`
- `package.json`
- `tests/repository-contract/validate-skills.test.ts`
- PR1 #123 の final merge state

PR2 では Skill references 全件を読み直す必要はない。routing boundary を決めるのに必要な `SKILL.md` と `AGENTS.md` を正本とし、query 意味の確認で必要になった reference のみ追加確認する。

## 5. 変更方針

### Change strategy

順序を以下で固定する。

1. current branch / PR1 merge state / description 固定を確認する。
2. scored dataset を作る前に explicit-skill observation probe を行う。
3. probe が通ったら、observed Skill extraction の最小 selector を固定する。
4. 6 Skill の routing boundary matrix を `AGENTS.md` / current `SKILL.md` から作る。
5. single-intent だけで 12 dataset files を作り、原則 24 cases に収める。
6. dataset を baseline 実行前に確定する。
7. shared runner の deterministic validation / scoring / comparison を実装する。
8. Codex CLI live execution を最小追加する。
9. deterministic contract tests と package scripts を追加する。
10. current description のまま canonical baseline を 1 回実行する。
11. failure は記録だけし、description / routing contract を修正しない。
12. Repository-wide validation と scope diff を確認する。

### Observation probe contract

probe は baseline score に含めない。

query は Skill 名を明示した単純な依頼とし、Host に意図的に 1 Skill を使わせる。目的は routing accuracy の測定ではなく observation transport の確認だけ。

probe で確認するもの:

1. `codex exec --json --ephemeral --sandbox read-only -C <repo-root> -` が正常起動する。
2. stdin の query がそのまま 1 turn として処理される。
3. `thread.started.thread_id` が取得できる。
4. 同じ ID を持つ `.codex/logs/hooks-<session_id>.jsonl` が取得できる。
5. `PostToolUse` に canonical `SKILL.md` の実 read/open を示す一意な evidence がある。
6. arbitrary path mention、`AGENTS.md` 内のリンク、grep/search result を Skill trigger と誤認しない selector を作れる。

実装する selector は probe で確認した current Codex の exact evidence shape だけを扱う。将来の Host 一般化のための adapter interface は作らない。

### Dataset contract

各 YAML は以下の最小 schema とする。

```yaml
schema_version: 1
cases:
  - id: code-review-train-001
    query: "変更内容をレビューして問題点を洗い出してください"
    expected_skill: code-review
    boundary: direct
```

negative example:

```yaml
schema_version: 1
cases:
  - id: code-review-train-002
    query: "確定済みのレビュー指摘を修正して検証してください"
    expected_skill: repair-loop
    boundary: code-review-vs-repair-loop
```

field は以下だけ。

- `schema_version`
- `cases[].id`
- `cases[].query`
- `cases[].expected_skill`
- `cases[].boundary`

持たせない field:

- `skill`
- `split`
- `polarity`
- free-form `tags`

理由:

- owner Skill は directory path から導出できる。
- split は filename から導出できる。
- polarity は `expected_skill === owner_skill` で導出できる。
- near-miss 集計は free-form tags ではなく固定 `boundary` enum で足りる。

### Boundary enum

以下だけを許可する。

```text
direct
exploratory-qa-vs-android-native-local-validation
code-review-vs-repair-loop
repair-loop-vs-harness-improvement
feature-plan-vs-direct-implementation
```

新しい taxonomy を PR2 内で増やさない。

### Single-intent rule

全 scored case で必須。

許可:

- 「レビューだけ」
- 「確定済み failure の修正だけ」
- 「QA探索だけ」
- 「Android physical-device validationだけ」
- 「harness改善候補作成だけ」
- 「計画だけ」
- canonical 6 Skill のどれも不要な明確な単純実装依頼

禁止:

- 「レビューして必要なら修正」
- 「計画してから実装」
- 「QAしてバグがあれば修正」
- その他、2 Skill 以上が同一 turn で正当に必要になり得る依頼

single-intent は semantic rule なので LLM validator を作らない。dataset review で確認する。

### Dataset size

PR2 initial baseline は **24 cases を標準**とする。

計算:

```text
6 Skills × 2 splits × (1 positive + 1 negative) = 24 cases
```

24件で以下を同時に満たすように case を設計する。

- 全 Skill / split に positive 1 件以上。
- 全 Skill / split に negative 1 件以上。
- 4 near-miss boundary が train / validation の双方に存在する。
- 各 near-miss boundary で、各 split に boundary の両側となる期待結果を最低 1 件ずつ置く。
  - Skill-vs-Skill は両 Skill がそれぞれ `expected_skill` になる case を持つ。
  - `feature-plan-vs-direct-implementation` は `feature-plan` と `null` をそれぞれ期待する case を持つ。

24件を超えることを禁止はしないが、単純な言い換えで増やさない。24件で上記契約を満たせない場合のみ追加し、理由を `REPORT.md` に記録する。

### Query duplicate normalization

重複検知専用 normalization を以下で固定する。

1. Unicode NFKC normalization。
2. 前後 whitespace を trim。
3. 連続 whitespace を ASCII space 1 個へ collapse。
4. `toLowerCase()`。

normalized query は duplicate detection のみに使う。Host へ渡す query 本文は YAML に書かれた原文をそのまま使用する。

train / validation を跨ぐ normalized duplicate は禁止する。同じ split 内でも exact/normalized duplicate は禁止する。

### Near-miss design

#### `exploratory-qa` vs `android-native-local-validation`

- Product behavior / specification-driven runtime exploration → `exploratory-qa`
- Windows Android tooling / Release APK / physical device / Maestro / native physical-device failure → `android-native-local-validation`
- 「Android」という単語だけを決定要因にしない。

#### `code-review` vs `repair-loop`

- finding を出す / review-only → `code-review`
- 確定済み finding / validation failure を bounded に修正 → `repair-loop`
- 「レビュー指摘」という語ではなく依頼行為で分ける。

#### `repair-loop` vs `harness-improvement`

- 現在の code/test failure を修正 → `repair-loop`
- run/eval/repeated failure から harness 改善候補を作る → `harness-improvement`
- failing test という語だけで repair-loop に寄せない。

#### `feature-plan` vs direct implementation

- 計画だけを求める → `feature-plan`
- plan artifact を必要としない明確な単純実装だけを求める → `null`
- 「計画してから実装」は multi-Skill / multi-stage になり得るため scored dataset へ入れない。

### Canonical scoring contract

scoring は observed Skill **set** のみで判定する。

`observed_skills` は canonical 6 Skill の unique set として扱う。読んだ順序は score に影響させない。

判定:

```text
Host evidence を信頼できる形で取得できない
→ unobservable

expected_skill = null AND observed_skills = ∅
→ pass

expected_skill = null AND observed_skills ≠ ∅
→ unexpected_trigger

expected_skill != null AND observed_skills = ∅
→ false_negative

expected_skill != null AND expected_skill ∉ observed_skills
→ sibling_misroute

expected_skill != null AND expected_skill ∈ observed_skills
  AND observed_skills に expected_skill 以外もある
→ unexpected_trigger

expected_skill != null AND observed_skills = {expected_skill}
→ pass
```

`unobservable` は pass にしない。

複数 Skill が正当に必要な case は dataset から除外しているため、「expected Skill + sibling Skill」の同時 observed は PR2 では unexpected trigger と扱ってよい。

### Codex execution contract

runner は各 case について Node の child process から以下を直接起動する。

```bash
codex exec --json --ephemeral --sandbox read-only -C <repo-root> -
```

query は stdin へ UTF-8 で書き込む。

ルール:

- 1 case = 1 process / 1 ephemeral session。
- case は逐次実行。parallelism は実装しない。
- retry は実装しない。
- query に case metadata を付加しない。
- project config / 6 Skill discovery を通常どおり有効にする。
- `--ignore-user-config` 等、通常 routing 条件を変える flag は追加しない。
- sandbox は explicit `read-only` にする。
- network を有効化する override はしない。
- non-zero exit / incomplete lifecycle / evidence correlation failure は routing failure にせず `unobservable` として記録する。

### Baseline result contract

baseline JSON は意図的に小さく保つ。

```json
{
  "schema_version": 1,
  "provenance": {
    "git_sha": "...",
    "dataset_sha256": "...",
    "codex_version": "...",
    "model": "unreported",
    "executed_at": "..."
  },
  "cases": [
    {
      "id": "code-review-train-001",
      "owner_skill": "code-review",
      "split": "train",
      "boundary": "direct",
      "query": "...",
      "expected_skill": "code-review",
      "observed_skills": ["code-review"],
      "outcome": "pass"
    }
  ],
  "summary": {}
}
```

`summary` は以下だけ。

- total / outcome counts
- by Skill
- by split
- by boundary

保存しないもの:

- raw Host JSONL
- full hook log
- absolute local path
- credential / environment dump
- reasoning text
- generalized runtime trace

raw Codex stdout / hook log は既存 ignored log / temporary evidence として必要時に確認し、baseline artifact には normalized result のみ残す。

### Dataset fingerprint

12 dataset files を repository-relative path の辞書順に並べ、各 `path + NUL + raw file bytes` を連結した byte sequence の SHA-256 を `dataset_sha256` とする。

fingerprint は dataset 内容または file path が変われば変わる。parsed object の再serializationは使わない。

### Baseline comparison

comparison は case ID の pure diff だけに限定する。

```text
baseline = pass, current = pass
→ unchanged_pass

baseline != pass, current = pass
→ fixed

baseline = pass, current != pass
→ regressed

baseline != pass, current != pass
→ unchanged_failure
```

failure category が別の failure category へ変わっても `unchanged_failure` とし、追加の ranking / severity / weighted score は作らない。

比較時に case ID が baseline/current の片側にしかない場合は comparison error とする。PR3 で validation dataset をこっそり入れ替えて score を改善できないようにする。

provenance 条件が異なる場合は comparison 自体を禁止しないが、`REPORT.md` に差を明示する。dataset fingerprint が異なる場合は同条件 baseline comparison とみなさない。

### CI / deterministic enforcement

CI hard gate は以下だけ。

- 12 dataset files が存在する。
- YAML parse / `schema_version` が正しい。
- case field が schema contract に一致する。
- owner Skill / split を path から導出できる。
- case ID が global unique。
- `expected_skill` が canonical 6 Skill または `null`。
- `boundary` が固定 enum のいずれか。
- query が空でない。
- normalized duplicate がない。
- 各 Skill / split に positive / negative が最低 1 件ずつある。
- 4 near-miss boundary が train / validation 双方に存在する。
- 各 near-miss boundary の双方の expected side が各 split に存在する。
- pure outcome classification が contract test を通る。
- pure baseline comparison が contract test を通る。

live Codex score は CI gate にしない。

### 実行タスク

- [ ] 1. current `main` / PR1 #123 merge state / branch diff を再確認し、PR2開始前 description が固定されていることを確認する。
- [ ] 2. scored dataset 作成前に explicit-skill observation probe を 1〜2件実施する。
- [ ] 3. `thread_id == hook session_id` correlation と canonical `SKILL.md` read/open の exact evidence selector を確認する。
- [ ] 4. probe が観測不能なら custom classifier を作らず停止し、Run Artifact に blocker を記録する。
- [ ] 5. probe が通ったら、6 Skill の `SKILL.md` / `AGENTS.md` から single-intent routing boundary matrix を作る。
- [ ] 6. 12 dataset filesを作成し、原則24 casesで positive / negative / 4 near-miss coverageを満たす。
- [ ] 7. baseline実行前にdataset内容をレビューし、multi-Skill query、露骨なSkill名依存、単純paraphrase duplicationを除外する。
- [ ] 8. `scripts/evals/run-skill-trigger-evals.ts` に deterministic dataset validation / fingerprint / pure scoring / pure comparison を実装する。
- [ ] 9. 同じ runner に最小の Codex CLI spawn / JSONL lifecycle / hook correlation / Skill read extraction を実装する。Host abstraction は作らない。
- [ ] 10. `tests/repository-contract/skill-trigger-evals.test.ts` に dataset invariant / scoring / comparison の deterministic test を追加する。
- [ ] 11. `package.json` に `eval:skills:trigger:validate` / `eval:skills:trigger` を追加し、validate のみ `verify` に組み込む。
- [ ] 12. current description のまま canonical baseline を逐次実行する。
- [ ] 13. `.codex/runs/<run_id>/trigger-eval-baseline.json` を保存し、Run-level `evaluation.json` / `REPORT.md` から参照する。
- [ ] 14. baseline failureを outcome / Skill / split / boundary で整理する。description は修正しない。
- [ ] 15. final diff で description / AGENTS routing / Product code / PR4-6 scope に意図しない変更がないことを確認する。
- [ ] 16. required validation と `pnpm run verify` を実行し、Run Artifact sanitization を行う。

## 6. 検証方法

### A. Static dataset validation

```bash
pnpm run eval:skills:trigger:validate
```

確認項目:

- 6 Skill discovery
- 12 file presence
- YAML parse / schema version
- exact allowed fields
- global ID uniqueness
- canonical expected Skill
- boundary enum
- query non-empty
- normalization duplicate prevention
- per Skill / split positive + negative
- required near-miss coverage

### B. Repository contract tests

`tests/repository-contract/skill-trigger-evals.test.ts` で最低限以下を固定する。

Dataset:

- valid minimal fixture が PASS。
- malformed YAML/schema が FAIL。
- duplicate ID が FAIL。
- normalized duplicate query が FAIL。
- unknown expected Skill が FAIL。
- unknown boundary が FAIL。
- Skill/split の positive または negative 欠落が FAIL。
- near-miss required side 欠落が FAIL。

Scoring:

- `null + empty` → pass。
- `null + observed` → unexpected_trigger。
- `expected + empty` → false_negative。
- `expected absent + sibling observed` → sibling_misroute。
- `expected present + extra sibling` → unexpected_trigger。
- `expected only` → pass。
- observation failure → unobservable。
- observed order を変えても set が同じなら outcome が変わらない。

Comparison:

- pass→pass = unchanged_pass。
- failure→pass = fixed。
- pass→failure = regressed。
- failure→failure = unchanged_failure。
- missing/extra case ID = error。

### C. Observation probe

full implementation 前に評価対象外 query で確認する。

- `codex exec --json --ephemeral --sandbox read-only` が動く。
- fresh thread ID が取得できる。
- hook `session_id` と一意対応する。
- canonical `SKILL.md` の actual read/open を誤検知なく抽出できる。
- read-only により Product/Repository source が変更されない。

probe 自体の routing score は記録しない。

### D. Canonical baseline

```bash
pnpm run eval:skills:trigger -- --output .codex/runs/<run_id>/trigger-eval-baseline.json
```

確認:

- 全 cases が逐次処理される。
- 1 case ごとに fresh ephemeral session。
- expected label が Host prompt に混入していない。
- 6 Skill が同時 discover 可能。
- baseline JSON が schema contract どおり。
- `unobservable` を pass に隠していない。
- train / validation / Skill / boundary summary が case result と一致する。

### E. Baseline comparison smoke

同じ result を自分自身と比較した場合に全件 `unchanged_pass` または `unchanged_failure` となり、case ID mismatch がないことを pure test または local smoke で確認する。

live model を比較 smoke のために再実行する必要はない。

### F. Repository regression

最低限:

```bash
pnpm run eval:skills:trigger:validate
pnpm run test:repository
pnpm run validate:skills
pnpm run verify
```

live canonical eval は別実行とし、CI hard gate にしない。

### G. Scope guard

変更可:

```text
.agents/skills/*/evals/trigger/**
scripts/evals/run-skill-trigger-evals.ts
tests/repository-contract/skill-trigger-evals.test.ts
package.json
pnpm-lock.yaml  # dependency追加が本当に必要な場合のみ。原則変更しない
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
新規 Agent Runtime / Workflow Engine / general Host adapter
```

### 成功判定

- deterministic dataset validation PASS。
- repository contract tests PASS。
- `pnpm run verify` PASS。
- canonical live baseline が全 scored case を処理して machine-readable result を保存できる。
- baseline に routing failure があっても PR2 success とする。
- `unobservable` がある場合は隠さず failure category として残す。ただし observation 自体が全体的に成立しない場合は PR2 implementation blocker とする。
- description tuning 0件。
- Repository独自 Agent Runtime / routing classifier 0件。

## 7. リスクと未解決論点

### Risks

1. **複合依頼を単一 expected Skill で採点して false failure を作る**
   - 対策: scored dataset を single-intent のみに限定する。multi-Skill は PR6。
2. **Skill read 順序を意味のある routing priority と誤解する**
   - 対策: scoring は observed set のみ。順序を使わない。
3. **Host abstraction を先に作り、PR2が評価基盤開発そのものになる**
   - 対策: Codex CLI 1経路へ直接接続。`HostAdapter` interface を作らない。
4. **Skill path mention を Skill使用と誤判定する**
   - 対策: explicit-skill probe で actual read/open の exact evidence shape を確認してから selector を固定する。
5. **observation が取れないため query classifier を作りたくなる**
   - 対策: blocker として停止。Repository側で routing を再実装しない。
6. **datasetを増やし過ぎる**
   - 対策: initial baseline は24 cases標準。必要なboundary coverageを満たすためだけ追加する。
7. **dataset field / taxonomyを増やし過ぎる**
   - 対策: 4 case fields + fixed boundary enum のみ。
8. **validation data を PR3 tuning に使う**
   - 対策:物理splitを維持し、PR3でvalidationをfailure-drivenに書き換えない。
9. **live evalをCI gateにしてflaky/cost/quotaを持ち込む**
   - 対策: deterministic validationのみverifyへ入れる。
10. **baseline failureをPR2で直す**
    - 対策: failureはPR3 input。PR2 diff guardでdescription変更禁止。
11. **既存evaluation schemaをTrigger Eval用に肥大化する**
    - 対策: supplemental baseline JSONに分離する。
12. **比較機能が統計評価frameworkへ膨らむ**
    - 対策: case IDの4状態diffだけに限定する。

### Open questions

実装前に残す技術的 unknown は observation probe の exact evidence shape のみ。

それ以外の主要設計はこの Plan で固定する。

## 8. 成果物

### 予定変更ファイル

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
scripts/evals/run-skill-trigger-evals.ts
tests/repository-contract/skill-trigger-evals.test.ts
package.json
```

原則 dependency は追加しない。既存 `yaml` / Node / TypeScript / Vitest を再利用する。

### 付随 artifact

- 正本 Plan: `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
- PR2 implementation の標準 `.codex/runs/<run_id>/` Artifact
- canonical baseline: `.codex/runs/<run_id>/trigger-eval-baseline.json`
- raw hook JSONL: `.codex/logs/` の既存 ignored evidence。commitしない。

## 9. 備考

- PR2 の価値は score の高さではなく、PR3 前の current routing を同じdatasetで再測定可能に固定することにある。
- baseline failure が多数あっても description をPR2で直さない。
- datasetのsingle-intent制約は意図的である。複数Skill coordinationはPR6で評価する。
- initial 24 cases は統計的benchmarkではなく、6 Skillと重点near-missを持つ回帰baselineである。
- `evals/` はこのRepository独自のSkill評価拡張であり、Agent Skills一般仕様の必須directoryとして扱わない。
- runnerは1 fileの小さなorchestratorに留め、Codex Host abstraction、routing engine、LLM judge、retry framework、parallel runnerを追加しない。
- PR1で整理したPortabilityを壊さないため、Skill-local datasetからlocal machine固有absolute pathやcredentialを参照しない。
