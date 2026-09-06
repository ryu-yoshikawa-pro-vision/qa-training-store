# Issue #117 PR2 Trigger Eval baseline 実装計画

## 0. 依頼概要

- 対象 Issue: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117
- 対象フェーズ: PR2「Trigger Eval baseline」
- 実装ブランチ: `refactor/117-pr2-trigger-eval-baseline`
- 目的: PR3 で Skill `description` を変更する前に、現状の Skill routing を再測定・比較できる baseline として固定する。

PR2 は routing を改善する PR ではない。baseline で failure が見つかっても、PR2 内では Skill `description` や routing contract を変更しない。

実装は最小に保つ。Repository 独自 Agent Runtime、routing engine、keyword/regex classifier、LLM judge、汎用 Host abstraction、general shell parser、retry framework、parallel runner、統計評価基盤は作らない。

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
- [ ] 各 Skill / split に positive case と negative case が最低 1 件ずつある。
- [ ] scored case は expected routing が「canonical 6 Skill の1つ」または「canonical Skill不要」のどちらかへ一意に決まる single-intent query のみに限定する。
- [ ] multi-Skill が正当に必要な query は PR2 に入れず PR6 の責務とする。
- [ ] train / validation は物理ファイルで分離する。
- [ ] normalized duplicate query がない。
- [ ] Issue #117 指定の4 near-miss boundaryを train / validation 双方で両側からカバーする。
- [ ] canonical eval は6 Skill同時条件で実行する。
- [ ] Host へ渡すのは dataset の自然な `query` 本文だけであり、expected label / owner / split / boundary / case ID を prompt に混ぜない。
- [ ] evaluator の active Run Artifact / baseline result を Host の working tree から分離する。
- [ ] current Codex Host が実際に使用した Skill を Host-native evidence から観測する。
- [ ] positive / negative observation control で Skill read を trigger proxy として利用できることを実測確認する。
- [ ] case outcome を `pass` / `false_negative` / `sibling_misroute` / `unexpected_trigger` / `unobservable` に分類できる。
- [ ] `unobservable` では machine-readable な `unobservable_reason` を保存する。
- [ ] scoring は observed Skill の集合で判定し、read順序を使わない。
- [ ] live runner は `train` / `validation` / `all` を選択できる。
- [ ] PR2 canonical baseline は `all` で1回取得する。
- [ ] baseline と後続 `all` run を case ID 単位に比較できる。
- [ ] observation loss/recovery を routing failure の改善・悪化と混同しない。
- [ ] baseline の `source_git_sha` が実際に評価した source/dataset と、実際に起動した runner の source revision に一致する。
- [ ] live routing failure は runner 自体の failure にしない。
- [ ] live eval は `pnpm run verify` の hard gate にしない。
- [ ] deterministic dataset validation と pure scoring/comparison test のみ CI gate にする。
- [ ] 6 Skill の `description` を変更していない。
- [ ] `AGENTS.md` の routing 意味契約を変更していない。
- [ ] Product code / Product test / training content を変更していない。
- [ ] Repository 独自 Agent Runtime / Workflow Engine / routing classifier を追加していない。
- [ ] canonical baseline と標準 Run Artifact が Repository policy に沿って保存される。

---

## 2. 実装開始前の前提確認

### 2.1 Latest `main` を基準にする

PR2 baseline は「description変更前の current routing」を測るため、実装開始前に latest `main` との差分を必ず確認する。

現在 branch が `main` に behind している場合は、incoming diff を確認する。

特に以下への変更を確認する。

```text
AGENTS.md
.agents/skills/*/SKILL.md
.codex/config.toml
.codex/hooks/log_event.mjs
scripts/validate-skills.ts
Skill discovery / validation に関わる共通 infrastructure
```

判断:

```text
behind = 0
→ 継続

behind > 0 かつ上記 routing / observation 契約へ影響なし
→ latest main を branch へ取り込んで継続

behind > 0 かつ routing / observation 契約へ影響あり
→ latest main を取り込んだうえで、この Plan の前提と boundary を再確認してから継続
```

merge / rebase の方法そのものは PR2 の評価設計ではないため、この Plan では固定しない。

### 2.2 Routing SSOT

- `AGENTS.md`: Repository-level routing SSOT。
- `.agents/skills/<skill>/SKILL.md`: Skill入口契約。current `description` がbaseline対象。

PR2ではどちらの routing 意味も変更しない。

### 2.3 Existing observation surface

- `.codex/config.toml`: hooks有効。
- `.codex/hooks/log_event.mjs`: `PostToolUse` 等をJSONLへ記録。
- normal log: `.codex/logs/hooks-*.jsonl`
- fallback log: `.artifacts/codex-hooks/hooks-*.jsonl`

Hook loggerをTrigger Eval専用に改造しない。

### 2.4 Canonical Eval

Canonical Eval は以下を意味する。

- 6 Skillすべてが discover 可能。
- current `AGENTS.md` / current Skill descriptions を使う。
- target Skillだけを残す one-vs-rest evaluation はしない。
- evaluator metadata はHost contextから除外する。

---

## 3. Evaluator root / Target root

### 3.1 2つの root を分離する

```text
Evaluator root
- runner を起動する通常 working tree
- current implementation Run Artifact がある
- --output / --compare artifact を置く

Target root
- source_git_sha の clean checkout
- Codex の -C に渡す
- dataset / AGENTS.md / 6 Skills は source_git_sha の内容
- evaluator の active Run Artifact / result は存在しない
```

Target root の具体的な作り方として detached Git worktree を推奨する。

```bash
git worktree add --detach <target-root> <source_git_sha>
```

ただし runner contract として必要なのは「別pathの clean Git checkout」であり、Git worktree という実装手段自体は必須条件にしない。

runner自身に checkout/worktree の作成・削除機能は実装しない。

### 3.2 Target root preflight

live run開始前に runner は以下を確認する。

```text
Target root が存在する
Evaluator root と別path
Git working tree / checkout である
tracked working-tree diffなし
staged diffなし
12 dataset filesをTarget rootから読める
6 canonical SkillをTarget rootから発見できる
```

untracked/ignored hook log は許可する。

### 3.3 Evaluator root source consistency

live runner は Evaluator root の script を実行するため、`source_git_sha` と runner source がずれないようにする。

live run前に以下を必須確認する。

```text
Evaluator root HEAD == Target root HEAD == source_git_sha
```

さらに Evaluator root では、current Run Directory以外に source/runtime behaviorへ影響する未commit変更を許可しない。

許可:

```text
.codex/runs/<current-run-id>/**
```

禁止例:

```text
scripts/evals/**
.agents/skills/*/evals/trigger/**
package.json
pnpm-lock.yaml
AGENTS.md
.agents/skills/*/SKILL.md
.codex/config.toml
.codex/hooks/**
その他 tracked source
```

未commit source差分がある場合は live baseline を開始せず、commitまたはrestoreして `source_git_sha` とrunner sourceを一致させる。

---

## 4. Observation Probe

### 4.1 目的

PR2は「canonical `SKILL.md` の actual read/open」を Skill trigger の observation proxy とする。

このproxyが current Codex で成立することを、scored dataset完成前に2件のunscored technical controlで確認する。

### 4.2 Positive control

明示 Skill query を1件実行する。

例:

```text
$feature-plan を使って、この依頼の実装計画だけを作ってください。
```

合格条件:

- 当該runのhook evidenceを一意に取得できる。
- 指定 Skill の canonical `SKILL.md` actual read/openを検出できる。
- path mention / search resultをactual readと誤認しない。

### 4.3 Negative control

canonical 6 Skill不要の単純read-only queryを1件実行する。

例:

```text
package.json に記載されている package name だけを確認して答えてください。
```

合格条件:

- 当該runのhook evidenceを一意に取得できる。
- canonical Skill readが0件。

### 4.4 Hook log correlation

ThreadId / SessionId変換は実装しない。

各caseで normal/fallback の2directoryを合わせてsnapshotする。

```text
<target-root>/.codex/logs/hooks-*.jsonl
<target-root>/.artifacts/codex-hooks/hooks-*.jsonl
```

手順:

1. 実行前に path + byte size をsnapshot。
2. Codex processを1件だけ実行。
3. 実行後snapshot。
4. 新規またはsize増加fileを抽出。
5. exactly 1 fileならそのappend deltaだけ読む。
6. 0 / 複数 / size縮小 / non-append change は `unobservable`。

file全体ではなくbefore-size以降だけを読む。

### 4.5 Selectorを過剰実装しない

probeで観測した current Codex の具体的な tool/input shapeだけを扱う。

禁止:

- arbitrary shell language parser。
- loose regexでpath文字列だけをread扱い。
- query内容からexpected Skillを逆算するclassifier。
- LLM judge。

actual readを安定判定するためにgeneral shell parserが必要になる場合はPR2 blockerとする。

### 4.6 Probe blocker

以下のどれかなら実装を推測で進めない。

- hook evidenceを一意にcorrelateできない。
- normal/fallbackどちらにもevidenceがない。
- actual readとmentionを安定区別できない。
- positive controlでSkill readを検出できない。
- negative controlでもcanonical Skill readが常に発生する。

blockerはRun Artifactへ記録する。

---

## 5. Dataset設計

### 5.1 Directory layout

```text
.agents/skills/<skill>/evals/trigger/
├── train.yaml
└── validation.yaml
```

6 Skill × 2 files = 12 files。

### 5.2 YAML schema

```yaml
schema_version: 1
cases:
  - id: code-review-train-001
    query: "変更内容をレビューして問題点を洗い出してください"
    expected_skill: code-review
    boundary: code-review-vs-repair-loop
```

case fieldは以下だけ。

```text
id
query
expected_skill
boundary
```

owner / split / polarity は pathとexpectedから導出する。

### 5.3 Case ID

```text
<owner-skill>-<split>-NNN
```

例:

```text
code-review-train-001
feature-plan-validation-002
```

- global unique。
- owner/split prefixはfile pathと一致。
- 後続追加で既存IDを詰め直さない。

### 5.4 Boundary enum

Issue #117指定の4種だけ。

```text
exploratory-qa-vs-android-native-local-validation
code-review-vs-repair-loop
repair-loop-vs-harness-improvement
feature-plan-vs-direct-implementation
```

### 5.5 Boundary integrity

```text
exploratory-qa-vs-android-native-local-validation
owner/expected ∈ { exploratory-qa, android-native-local-validation }

code-review-vs-repair-loop
owner/expected ∈ { code-review, repair-loop }

repair-loop-vs-harness-improvement
owner/expected ∈ { repair-loop, harness-improvement }

feature-plan-vs-direct-implementation
owner = feature-plan
expected ∈ { feature-plan, null }
```

### 5.6 Initial 24-case matrix

PR2 initial dataset は exactly 24 cases で作る。

これは初期設計値であり、validatorの永久的な `count == 24` invariantにはしない。

各splitの配置:

| Owner | Case | Expected | Boundary | 意味 |
|---|---:|---|---|---|
| `exploratory-qa` | 001 | `exploratory-qa` | `exploratory-qa-vs-android-native-local-validation` | Product behavior / specification-driven exploratory QA |
| `exploratory-qa` | 002 | `android-native-local-validation` | `exploratory-qa-vs-android-native-local-validation` | Android tooling / Release APK / physical device / Maestro / native failure |
| `android-native-local-validation` | 001 | `android-native-local-validation` | `exploratory-qa-vs-android-native-local-validation` | Native local validation |
| `android-native-local-validation` | 002 | `exploratory-qa` | `exploratory-qa-vs-android-native-local-validation` | Androidを含むがProduct behavior探索が主目的 |
| `code-review` | 001 | `code-review` | `code-review-vs-repair-loop` | review-only |
| `code-review` | 002 | `repair-loop` | `code-review-vs-repair-loop` | 確定済みfinding/validation failureの修正 |
| `repair-loop` | 001 | `repair-loop` | `repair-loop-vs-harness-improvement` | 現在のcode/test failureのbounded repair |
| `repair-loop` | 002 | `harness-improvement` | `repair-loop-vs-harness-improvement` | run/eval結果からharness改善候補を作る |
| `harness-improvement` | 001 | `harness-improvement` | `repair-loop-vs-harness-improvement` | harness改善候補作成 |
| `harness-improvement` | 002 | `repair-loop` | `repair-loop-vs-harness-improvement` | harnessではなく現在の実装修正が主目的 |
| `feature-plan` | 001 | `feature-plan` | `feature-plan-vs-direct-implementation` | 計画だけを求める |
| `feature-plan` | 002 | `null` | `feature-plan-vs-direct-implementation` | plan artifact不要の明確な単純実装 |

この12配置をtrain / validationの双方で作る。ただしqueryは別の自然なシナリオとし、単純paraphraseにしない。

### 5.7 Query authoring rule

禁止:

- `$code-review` 等の明示Skill名。
- routing meta-question。
- expected labelを示唆する文言。
- multi-Skillが正当に必要な複合依頼。

### 5.8 Manual dataset review contract

semantic correctnessはLLM validatorを作らず、人間/実装者レビューで確認する。

全caseについて以下を確認する。

1. single-intentである。
2. current `AGENTS.md` / `SKILL.md`から `expected_skill` を説明できる。
3. boundaryの両側のうち、なぜexpected側なのか説明できる。
4. Skill名 / expected labelがqueryに露出していない。
5. train / validationが単純paraphraseではない。

この5条件をbaseline実行前のdataset review checklistとする。

### 5.9 Duplicate normalization

重複検知専用:

1. Unicode NFKC。
2. trim。
3. 連続whitespaceをASCII space 1個へcollapse。
4. lowercase。

Hostにはraw queryをそのまま渡す。

---

## 6. Train / validationの位置づけ

`validation` は秘密のblind holdoutではない。YAMLはRepositoryにcommitされるため、人間やAgentから読める。

PR2で保証するのは以下だけ。

- train / validationを物理分離する。
- runnerでsplitを別実行できる。
- 後続description tuningでは、tuning loopの判断材料としてvalidation実行結果を使わない運用が可能である。

したがって本Planでは `validation` を **operational validation split** と呼ぶ。

「validation queryがAgentから見えない」「blind holdoutである」とは扱わない。

---

## 7. Scoring contract

### 7.1 Outcome

```text
pass
false_negative
sibling_misroute
unexpected_trigger
unobservable
```

### 7.2 Set-based scoring

```text
Host evidenceを信頼できない
→ unobservable

expected = null, observed = ∅
→ pass

expected = null, observed ≠ ∅
→ unexpected_trigger

expected != null, observed = ∅
→ false_negative

expected != null, expected ∉ observed
→ sibling_misroute

expected != null, expected ∈ observed, extra Skillあり
→ unexpected_trigger

expected != null, observed = {expected}
→ pass
```

read順序はscoringに使わない。

### 7.3 `unobservable_reason`

`outcome = unobservable` のときだけ以下のenumを保存する。

```text
timeout
process_failure
lifecycle_failure
hook_correlation
hook_parse
skill_read_observation
```

observable outcomeでは `unobservable_reason = null`。

対応例:

```text
120秒timeout
→ timeout

spawn後non-zero / process abnormal termination
→ process_failure

thread.started欠落 / turn.failed / top-level error / terminal event欠落
→ lifecycle_failure

hook file 0件 / 複数 / non-append
→ hook_correlation

append delta JSON parse不能
→ hook_parse

hookは読めるがactual Skill readを信頼判定できない
→ skill_read_observation
```

自由文error dumpはbaseline JSONへ保存しない。詳細は一時logまたはRun Artifactに必要な要約だけ残す。

### 7.4 JSONL lifecycle

success:

```text
thread.started を1件確認
AND
turn.completed を確認
```

observation failure:

```text
turn.failed
top-level error
process timeout
process non-zero exit
terminal event欠落
```

Host response本文はrouting scoringに使わない。

---

## 8. 実装構造

### 8.1 Pure logic

```text
scripts/evals/skill-trigger-evals.ts
```

責務:

- constants/types
- dataset discovery/YAML parse
- schema/invariant validation
- owner/split/polarity derivation
- boundary integrity
- normalization/fingerprint
- scoring
- summary
- comparison

plain function / plain objectで実装する。class hierarchyは作らない。

### 8.2 Side-effect runner

```text
scripts/evals/run-skill-trigger-evals.ts
```

責務:

- CLI parse
- Evaluator/Target preflight
- Target dataset load
- `codex --version` 取得
- `codex exec` spawn/stdin
- timeout
- stdout JSONL lifecycle parse
- hook snapshot/delta
- actual Skill read extraction
- pure scorer呼び出し
- serialization/output write

HostAdapter/provider interfaceは作らない。

### 8.3 Test

```text
tests/repository-contract/skill-trigger-evals.test.ts
```

Host Runtimeは起動しない。pure logicを中心に検証する。

### 8.4 Dependency

新規dependencyは原則追加しない。

既存の Node.js / TypeScript / tsx / yaml / Vitest を再利用する。

---

## 9. Runner CLI contract

### 9.1 package scripts

```json
{
  "eval:skills:trigger:validate": "tsx scripts/evals/run-skill-trigger-evals.ts --validate-only",
  "eval:skills:trigger": "tsx scripts/evals/run-skill-trigger-evals.ts"
}
```

`verify`へ入れるのは`eval:skills:trigger:validate`のみ。

### 9.2 Supported options

```text
--validate-only
--target-root <path>
--split train|validation|all
--output <path>
--compare <path>
```

#### `--validate-only`

- Host起動なし。
- current repository rootの全datasetをvalidate。
- `--target-root` / `--output` / `--compare` 不要。

#### `--target-root`

- live mode必須。
- Codex `-C` とlive dataset sourceに使用。
- Evaluator rootと別path。
- clean Git checkout。
- `source_git_sha` はTarget root HEAD。

#### `--split`

- default: `all`
- `train` / `validation` / `all`

#### `--output`

- live mode必須。
- Evaluator root側。
- Target root配下は禁止。

#### `--compare`

- optional。
- `--split all` のみ許可。
- baselineはEvaluator root側から読む。

### 9.3 追加しないoption

```text
case filter
parallelism
retry count
repeat count
model sweep
statistical sampling
checkout/worktree create/remove
```

---

## 10. Codex execution contract

### 10.1 Command

```bash
codex exec --json --ephemeral --sandbox read-only -C <target-root> -
```

queryはstdinへUTF-8でそのまま渡す。

### 10.2 Execution rules

- 1 case = 1 fresh process/session。
- sequential。
- retryなし。
- expected metadataをpromptへ追加しない。
- current project config / Skill discoveryを維持。
- network overrideなし。

### 10.3 Timeout

```text
CASE_TIMEOUT_MS = 120000
```

timeoutは`unobservable + timeout`として次caseへ進む。

### 10.4 Codex version

live run開始時に1回だけ以下を実行する。

```bash
codex --version
```

trimしたstdout文字列を `provenance.codex_version` に保存する。

取得不能ならlive run全体を開始せずexit 1とする。versionを推測しない。

modelは確実に観測できない場合 `unreported`。

---

## 11. Result contract

### 11.1 JSON

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
      "outcome": "pass",
      "unobservable_reason": null
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

`query`はresultへ複製しない。queryのSSOTはdataset YAML。

### 11.2 Serialization

- cases: case ID辞書順。
- observed_skills: Skill名辞書順。
- summary keys: 実装内で1つの固定順序へ統一。

### 11.3 Dataset fingerprint

12 filesをrepository-relative path辞書順に並べ、各fileについて:

```text
path + NUL + raw bytes
```

を連結してSHA-256。

### 11.4 Provenance

最低限:

```text
source_git_sha
dataset_sha256
codex_version
model
executed_at
split
```

absolute Target root pathは保存しない。

---

## 12. Baseline comparison

### 12.1 Preconditions

`--compare`は`--split all`のみ。

以下はcomparison error:

- dataset fingerprint mismatch。
- case ID set mismatch。
- baseline schema parse failure。

### 12.2 Status

observable failure:

```text
false_negative
sibling_misroute
unexpected_trigger
```

transition:

```text
pass → pass
= unchanged_pass

observable failure → pass
= fixed

pass → observable failure
= regressed

observable failure → observable failure
= unchanged_failure

observable → unobservable
= newly_unobservable

unobservable → observable
= recovered_observable

unobservable → unobservable
= unchanged_unobservable
```

`recovered_observable` はrouting改善を意味しない。current outcomeも併記する。

### 12.3 Comparison output

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

---

## 13. Exit code

### exit 0

- selected casesを最後まで処理しoutput保存成功。
- routing failureあり。
- 一部caseが`unobservable`。

routing/observation結果は評価データでありCLI failureではない。

### exit 1

- dataset validation failure。
- unsupported option combination。
- live modeで`--target-root` / `--output`欠落。
- Evaluator root == Target root。
- Target rootがGit checkoutでない / tracked/staged dirty。
- Evaluator HEAD != Target HEAD。
- Evaluator rootにcurrent Run Directory以外のsource差分がある。
- outputがTarget root配下。
- `--compare` と `train|validation`併用。
- `codex --version`取得不能。
- Codex executable自体を起動不能。
- output write failure。
- comparison input contract failure。

個別caseのtimeout/process/lifecycle/hook failureは`unobservable`として扱う。

---

## 14. Deterministic validation / tests

### 14.1 Dataset validator

hard gate:

- 6 Skill discovery。
- 12 dataset file presence。
- YAML parse。
- `schema_version = 1`。
- exact allowed fields。
- ID unique / owner+split整合。
- query non-empty。
- expectedがcanonical Skillまたはnull。
- boundary 4種。
- boundary participant integrity。
- normalized duplicateなし。
- 各Skill/splitにpositive + negative。
- train/validation双方に4 boundary。
- 各boundaryのexpected side coverage。
- fingerprint生成可能。

`case count == 24` はvalidatorで強制しない。

single-intent / semantic boundary correctnessはmanual dataset reviewで確認する。

### 14.2 Pure tests

Dataset:

- valid fixture PASS。
- malformed/unknown field FAIL。
- duplicate ID FAIL。
- ID owner/split mismatch FAIL。
- normalized duplicate FAIL。
- unknown expected/boundary FAIL。
- boundary participant mismatch FAIL。
- required positive/negative/boundary side欠落 FAIL。
- 25件以上でもcontractを満たせば件数だけでFAILしない。

Scoring:

- null + empty → pass。
- null + observed → unexpected_trigger。
- expected + empty → false_negative。
- expected absent → sibling_misroute。
- expected + extra → unexpected_trigger。
- expected only → pass。
- observation failure → unobservable + reason。
- observed order不変性。

Comparison:

- 7 transition status全部。
- fingerprint mismatch error。
- case ID mismatch error。

### 14.3 CI

`pnpm run verify`へ追加するのはdeterministic validateだけ。

live Codex evalはCI gateにしない。

---

## 15. Source commit / baseline取得順序

1. latest `main` との差分を解消・確認する。
2. implementation RunをEvaluator rootで開始する。
3. Observation Probeをclean Target rootで実施する。
4. 24-case datasetを作成しmanual reviewする。
5. pure logic / runner / tests / package scriptsを実装する。
6. deterministic validation / repository validationを通す。
7. source implementationをcommitする。active Run Artifactはこのcommitへ含めない。
8. source commit SHAを取得する。
9. clean Target rootをそのSHAから用意する。
10. `Evaluator HEAD == Target HEAD == source_git_sha` を確認する。
11. Evaluator rootにcurrent Run Directory以外のsource差分がないことを確認する。
12. canonical `--split all` baselineを1回実行する。
13. baseline JSONをEvaluator rootのRun Directoryへ保存する。
14. Target rootをcleanupする。
15. baseline / standard Run Artifactを後続commitで保存する。

baseline artifact自身を含むcommit SHAを `source_git_sha` にしない。

---

## 16. Canonical commands

### Validate

```bash
pnpm run eval:skills:trigger:validate
```

### Baseline

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-baseline.json
```

### Train split

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split train \
  --output .codex/runs/<run_id>/trigger-eval-train.json
```

### Validation split

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split validation \
  --output .codex/runs/<run_id>/trigger-eval-validation.json
```

### Compare

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-result.json \
  --compare <baseline-json>
```

後続PRはこのCLI contractを利用できる。PR3固有のtuning手順・commit順序・validation実行回数はPR3 Planで決め、PR2 Planでは規定しない。

---

## 17. 実行タスク

- [ ] 1. latest `main` / branch divergenceを確認する。
- [ ] 2. behindならincoming diffを確認し、routing/observation前提への影響を判定してlatest mainを取り込む。
- [ ] 3. current 6 Skill descriptionsを記録しPR2中の変更禁止を確認する。
- [ ] 4. Evaluator rootでimplementation Runを開始する。
- [ ] 5. committed HEADからprobe用clean Target rootを用意する。
- [ ] 6. positive / negative controlを実行する。
- [ ] 7. hook append deltaとactual Skill read selectorを確定する。
- [ ] 8. probe不成立なら独自classifier/parserへ逃げずblockerとして停止する。
- [ ] 9. probe Target rootをcleanupする。
- [ ] 10. 4 boundaryをcurrent routing SSOTと照合する。
- [ ] 11. initial 24 cases / 12 YAMLを作成する。
- [ ] 12. 全24caseを5項目manual dataset reviewで確認する。
- [ ] 13. pure logicを実装する。
- [ ] 14. minimal side-effect runnerを実装する。
- [ ] 15. `unobservable_reason` enumを実装する。
- [ ] 16. deterministic testsを実装する。
- [ ] 17. package scripts追加、validateのみverifyへ追加する。
- [ ] 18. deterministic validation / repository validationを実行する。
- [ ] 19. source implementationをcommitする。active Run Artifactは除外する。
- [ ] 20. source SHAからcanonical Target rootを用意する。
- [ ] 21. Target clean / Evaluator HEAD一致 / Evaluator source cleanをpreflightする。
- [ ] 22. canonical all baselineを1回実行する。
- [ ] 23. result/summary/provenance/unobservable reasonsを確認する。
- [ ] 24. routing failureを見てもdescriptionを変更しない。
- [ ] 25. Target rootをcleanupする。
- [ ] 26. Run-level `evaluation.json` / `REPORT.md` からbaseline artifactを参照する。
- [ ] 27. Run Artifact sanitizationを行う。
- [ ] 28. final diffでscope逸脱がないことを確認する。
- [ ] 29. baseline / standard Run Artifactを後続commitで保存する。

---

## 18. Validation

最低限:

```bash
pnpm run eval:skills:trigger:validate
pnpm run test:repository
pnpm run validate:skills
pnpm run verify
```

Canonical baselineで確認:

- initial 24 cases全件処理。
- 1 case = 1 ephemeral process。
- 6 Skill同時条件。
- evaluator metadata leakageなし。
- Evaluator HEAD / Target HEAD / `source_git_sha` 一致。
- Target dataset fingerprint使用。
- `codex_version`が`codex --version`由来。
- `thread.started` + `turn.completed` lifecycle。
- queryはresultへ複製しない。
- observed Skill sort安定。
- `unobservable_reason`整合。
- summary整合。

Comparison self-smoke:

```text
pass → unchanged_pass
observable failure → unchanged_failure
unobservable → unchanged_unobservable
```

---

## 19. Scope guard

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
Product code / Product E2E / training scenario
PR4 Deterministic Output Eval logic
PR5 Semantic Output Eval logic
PR6 Workflow E2E Eval logic
新規 Agent Runtime / routing engine
query classifier / LLM judge
general Host adapter
general shell parser
retry / parallel / statistical framework
runner内のcheckout/worktree lifecycle manager
```

---

## 20. 成果物

予定source:

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

Run Artifact:

```text
.codex/runs/<run_id>/trigger-eval-baseline.json
標準 PLAN.md / TASKS.md / REPORT.md / run.json / evaluation.json 等
```

raw hook JSONLは一時evidenceでありcommitしない。

---

## 21. 成功判定

PR2成功:

- current main前提を確認済み。
- deterministic validation PASS。
- repository validation PASS。
- positive/negative observation control成立。
- initial 24 casesのmanual dataset review完了。
- clean Target rootでcanonical baseline取得成功。
- actual runner sourceと`source_git_sha`が一致。
- machine-readable result/comparison contractが成立。
- `unobservable`原因をrouting failureと混同しない。
- routing failureが残っていても記録できている。
- description tuning 0件。
-独自Runtime/classifier/judge 0件。

PR2 blocker:

- Host Skill selectionを信頼できる形で観測できない。

blocker時は評価方式を捏造せず停止し、Run Artifactへ理由を記録する。

---

## 22. 備考

- PR2の価値はscoreの高さではなく、description変更前のroutingを同じdataset/runner contractで再測定できることにある。
- initial 24 casesは統計benchmarkではなく回帰baseline。
- `validation` はoperational validation splitであり、blind/secret holdoutではない。
- `evals/` はこのRepository独自のSkill評価拡張。
- pure logic + side-effect runnerの2file分離はframework化ではなく最小のtestability分離。
- Target root分離は独自Agent Runtimeではなく、evaluator metadata leakageを避けるための実行境界。
- ここから新しい評価frameworkを足さない。追加要求が出た場合はPR2へ抱え込まずscopeを再確認する。
