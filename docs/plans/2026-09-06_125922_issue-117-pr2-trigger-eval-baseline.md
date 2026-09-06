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
- [ ] 各 Skill / split に positive case と negative case が最低1件ずつある。
- [ ] scored case は expected routing が「canonical 6 Skill の1つ」または「canonical Skill不要」のどちらかへ一意に決まる single-intent query のみに限定する。
- [ ] multi-Skill が正当に必要な query は PR2 に入れず PR6 の責務とする。
- [ ] train / validation は物理ファイルで分離する。
- [ ] normalized duplicate query がない。
- [ ] Issue #117 指定の4 near-miss boundaryを train / validation 双方で両側からカバーする。
- [ ] canonical eval は6 Skill同時条件で実行する。
- [ ] Host へ渡すのは dataset の自然な `query` 本文だけであり、expected label / owner / split / boundary / case ID を prompt に混ぜない。
- [ ] Trigger Eval dataset の `query + expected_skill` を Host working tree から除外し、answer key をHostへ見せない。
- [ ] evaluator の active Run Artifact / baseline result も Host working tree から分離する。
- [ ] current Codex Host が実際に使用した Skill を Host-native evidence から観測する。
- [ ] positive / negative observation control で Skill read を trigger proxy として利用できることを実測確認する。
- [ ] routing observation と task completion を分離し、Skill readを観測済みなら後続task failureだけを理由にrouting結果を捨てない。
- [ ] case outcome を `pass` / `false_negative` / `sibling_misroute` / `unexpected_trigger` / `unobservable` に分類できる。
- [ ] `unobservable` では machine-readable な `unobservable_reason` を保存する。
- [ ] scoring は observed Skill の集合で判定し、read順序を使わない。
- [ ] live runner は `train` / `validation` / `all` を選択できる。
- [ ] PR2 canonical baseline は `all` で1回取得する。
- [ ] baseline と後続 `all` run を case ID 単位に比較できる。
- [ ] observation loss/recovery を routing failure の改善・悪化と混同しない。
- [ ] baseline の `source_git_sha` がEvaluator側のdataset/runner source revisionとSanitized TargetのHEADに一致する。
- [ ] 一部caseの routing failure / observation failure は runner 自体の failure にしない。
- [ ] selected caseが全件 `unobservable` のrunは成功扱いにしない。
- [ ] comparison時のCodex version差を条件差として明示できる。
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

branch が `main` に behind している場合は incoming diff を確認する。

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

behind > 0 かつ routing / observation 契約へ影響なし
→ latest main を branch へ取り込んで継続

behind > 0 かつ routing / observation 契約へ影響あり
→ latest main を取り込んだうえで、この Plan の前提と boundary を再確認してから継続
```

merge / rebase の方法そのものは PR2 の評価設計ではないため固定しない。

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
- Trigger Evalのanswer key / evaluator resultはHost contextへ入れない。

---

## 3. Evaluator root / Sanitized Target root

### 3.1 責務を分離する

```text
Evaluator root
- source_git_sha の通常 working tree
- runner を起動する
- 12 Trigger Eval datasetを読む
- current implementation Run Artifactがある
- --output / --compare artifactを置く

Sanitized Target root
- 同じ source_git_sha の checkout
- Codex の -C に渡す
- AGENTS.md / 6 Skills / Repository source はsource_git_shaの内容
- .agents/skills/*/evals/trigger/** は除外する
- evaluator active Run Artifact / result は存在しない
```

重要:

```text
dataset source = Evaluator root
Host working directory = Sanitized Target root
```

Target rootからdatasetを読まない。

これにより、YAML内の `query` と `expected_skill` が同じHost working treeに存在する構造を避ける。

### 3.2 Target rootの作成

具体的な作り方として detached Git worktree を推奨する。

```bash
git worktree add --detach <target-root> <source_git_sha>
```

その後、Target rootからTrigger Eval datasetだけを除外する。

概念上の除外対象:

```text
.agents/skills/*/evals/trigger/**
```

runner自身に checkout/worktree の作成・削除機能は実装しない。

dataset除外も汎用sanitizer frameworkにはしない。PR2で必要なこの1パターンだけを実行手順として固定する。

### 3.3 Sanitized Target preflight

live run開始前に runner は以下を確認する。

```text
Target root が存在する
Evaluator root と別path
Git working tree / checkout である
Target HEAD == Evaluator HEAD
staged diffなし
6 canonical SkillをTarget rootから発見できる
Target rootに .agents/skills/*/evals/trigger/** が存在しない
```

Target rootのtracked diffは、**Trigger Eval datasetを除外したことによる削除だけ**を許可する。

それ以外のtracked diffが1件でもあればlive runを開始しない。

untracked/ignored hook log は許可する。

### 3.4 Evaluator root source consistency

live run前に以下を必須確認する。

```text
Evaluator root HEAD == Target root HEAD == source_git_sha
```

Evaluator rootではcurrent Run Directory以外に source/runtime behaviorへ影響する未commit変更を許可しない。

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

未commit source差分がある場合は live baseline を開始せず、commitまたはrestoreして `source_git_sha` とrunner/dataset sourceを一致させる。

### 3.5 Fingerprintの正本

`dataset_sha256` はEvaluator rootの12 dataset filesから計算する。

Target rootにはdatasetを置かないため、Target rootからfingerprintを計算してはいけない。

---

## 4. Observation Probe

### 4.1 目的

PR2は「canonical `SKILL.md` の actual read/open」を Skill trigger の observation proxy とする。

このproxyが current Codex で成立することを、scored dataset完成前に2件のunscored technical controlで確認する。

probeでもHost working directoryにTrigger Eval answer keyを置かない。

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
- `turn.completed` まで到達し、空集合をrouting observationとして確定できる。

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

ただしlive Hostにはtrain/validationどちらのanswer keyも見せない。

---

## 7. Routing observation / Scoring contract

### 7.1 Routing observationとtask completionを分ける

Trigger Evalが測るのはroutingであり、task execution successではない。

そのため、Host lifecycle failureを自動的にrouting `unobservable`へ変換しない。

優先順位を以下で固定する。

```text
1. hook correlation / parse自体が信頼不能
   → routing unobservable

2. canonical Skill readを1件以上信頼観測できた
   → observed_skillsを確定
   → 後続のtimeout / turn.failed / process non-zeroがあってもroutingはobservable

3. canonical Skill readが0件
   AND turn.completedまで到達
   → observed_skills = ∅ を確定

4. canonical Skill readが0件
   AND turn.completed前にtimeout / process failure / lifecycle failure
   → empty setを断定せずunobservable
```

この契約により、例えば `repair-loop` を正しくtriggerしてSkill read後にread-only制約でtaskが完遂できなくても、routing結果は保持する。

task completionの成否はPR2のrouting scoreへ使わない。

### 7.2 Outcome

```text
pass
false_negative
sibling_misroute
unexpected_trigger
unobservable
```

### 7.3 Set-based scoring

routing observationが確定した後にのみ以下を適用する。

```text
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

### 7.4 `unobservable_reason`

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

分類:

```text
hook file 0件 / 複数 / non-append
→ hook_correlation

append delta JSON parse不能
→ hook_parse

hookは読めるがactual Skill read selectorを信頼できない
→ skill_read_observation

Skill read未観測かつturn.completed前に120秒timeout
→ timeout

Skill read未観測かつturn.completed前にprocess abnormal termination / non-zero
→ process_failure

Skill read未観測かつthread.started欠落 / turn.failed / top-level error / terminal event欠落
→ lifecycle_failure
```

Skill readをすでに信頼観測できている場合、後続の上記failureだけを理由に `unobservable` へ上書きしない。

自由文error dumpはbaseline JSONへ保存しない。詳細は一時logまたはRun Artifactに必要な要約だけ残す。

### 7.5 JSONL lifecycle

routing以外のtask lifecycleとして最低限以下をparseする。

```text
thread.started
turn.completed
turn.failed
top-level error
process exit
```

`turn.completed` は「Skill read 0件をempty observed setとして確定する」ために使用する。

Host response本文はrouting scoringに使わない。

---

## 8. 実装構造

### 8.1 Pure logic

```text
scripts/evals/skill-trigger-evals.ts
```

責務:

- constants/types
- Evaluator root dataset discovery/YAML parse
- schema/invariant validation
- owner/split/polarity derivation
- boundary integrity
- normalization/fingerprint
- routing observation resultからのscoring
- summary
- comparison

plain function / plain objectで実装する。class hierarchyは作らない。

### 8.2 Side-effect runner

```text
scripts/evals/run-skill-trigger-evals.ts
```

責務:

- CLI parse
- Evaluator/Sanitized Target preflight
- Evaluator root dataset load
- `codex --version` 取得
- `codex exec` spawn/stdin
- timeout
- stdout JSONL lifecycle parse
- hook snapshot/delta
- actual Skill read extraction
- routing observability確定
- pure scorer呼び出し
- serialization/output write

HostAdapter/provider interfaceは作らない。

Target checkout作成やdataset削除をrunnerへ内包しない。

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
- Evaluator/current repository rootの全datasetをvalidate。
- `--target-root` / `--output` / `--compare` 不要。

#### `--target-root`

- live mode必須。
- Codex `-C` にのみ使用する。
- dataset sourceには使用しない。
- Evaluator rootと別path。
- 同じGit HEADのSanitized Target。
- `.agents/skills/*/evals/trigger/**` が存在してはいけない。

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
sanitizer profile
```

---

## 10. Codex execution contract

### 10.1 Command

```bash
codex exec --json --ephemeral --sandbox read-only -C <target-root> -
```

queryはEvaluator root datasetから読み、stdinへUTF-8でそのまま渡す。

### 10.2 Execution rules

- 1 case = 1 fresh process/session。
- sequential。
- retryなし。
- expected metadataをpromptへ追加しない。
- current project config / Skill discoveryを維持。
- network overrideなし。
- Target rootにはTrigger Eval datasetを置かない。

### 10.3 Timeout

```text
CASE_TIMEOUT_MS = 120000
```

routing evidence確定前にtimeoutした場合は `unobservable + timeout`。

Skill readをすでに信頼観測できている場合、後続timeoutでもrouting scoreは保持する。

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

`split = all` のinitial PR2 baseline例:

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

### 11.2 `summary.total`

`summary.total` は **当該runでselectedされたcase数から動的に算出**する。

```text
--split all
→ initial datasetでは24

--split train
→ initial datasetでは12

--split validation
→ initial datasetでは12
```

`24` をsource constantとしてhardcodeしない。

### 11.3 Serialization

- cases: case ID辞書順。
- observed_skills: Skill名辞書順。
- summary keys: 実装内で1つの固定順序へ統一。

### 11.4 Dataset fingerprint

Evaluator rootの12 filesをrepository-relative path辞書順に並べ、各fileについて:

```text
path + NUL + raw bytes
```

を連結してSHA-256。

Sanitized Targetにはdatasetが存在しないため、Target rootからfingerprintを作らない。

### 11.5 Provenance

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

Codex version mismatchはcomparison errorにはしない。

### 12.2 Codex version条件差

comparison outputへ最低限以下を保存する。

```text
baseline_codex_version
codex_version_match
```

例:

```json
{
  "baseline_codex_version": "codex-cli ...",
  "codex_version_match": false
}
```

versionが異なる場合もcase comparisonは実行するが、description変更だけの効果とは断定しない。

`REPORT.md` にもCodex version差を条件差として要約する。

### 12.3 Status

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

### 12.4 Comparison output

```json
{
  "comparison": {
    "baseline_source_git_sha": "...",
    "baseline_codex_version": "...",
    "codex_version_match": true,
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

### 13.1 exit 0

以下を満たす場合はrunner execution成功。

- selected casesを最後まで処理しoutput保存成功。
- 少なくとも1件はrouting observable。

以下はexit 0を妨げない。

- routing failureあり。
- 一部caseが`unobservable`。

routing qualityは評価データでありCLI failureではない。

### 13.2 exit 1

- dataset validation failure。
- unsupported option combination。
- live modeで`--target-root` / `--output`欠落。
- Evaluator root == Target root。
- Target rootがGit checkoutでない。
- Target HEAD != Evaluator HEAD。
- Target rootにTrigger Eval datasetが残っている。
- Target tracked diffにTrigger Eval dataset削除以外がある。
- Target staged diffあり。
- Evaluator rootにcurrent Run Directory以外のsource差分がある。
- outputがTarget root配下。
- `--compare` と `train|validation`併用。
- `codex --version`取得不能。
- Codex executable自体を起動不能。
- output write failure。
- comparison input contract failure。
- **selected caseが全件 `unobservable`。**

一部caseのtimeout/process/lifecycle/hook failureは`unobservable`として保存し、全件でない限りrun-level exit 1へ直結させない。

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

Scoring / observability:

- canonical Skill read観測 + 後続turn.failed → Skill read集合でscoreする。
- canonical Skill read観測 + 後続timeout → Skill read集合でscoreする。
- Skill read 0 + turn.completed → empty setとしてscoreする。
- Skill read 0 + timeout → unobservable + timeout。
- Skill read 0 + process failure → unobservable + process_failure。
- hook correlation failure → unobservable + hook_correlation。
- null + empty → pass。
- null + observed → unexpected_trigger。
- expected + empty → false_negative。
- expected absent → sibling_misroute。
- expected + extra → unexpected_trigger。
- expected only → pass。
- observed order不変性。
- summary.totalはselected case数から算出。

Comparison:

- 7 transition status全部。
- fingerprint mismatch error。
- case ID mismatch error。
- Codex version一致 / 不一致を `codex_version_match` に反映。

Runner contract smoke / small helper testで確認可能な範囲:

- TargetにTrigger Eval datasetが残っていればpreflight FAIL。
- Target diffがdataset削除以外を含めばpreflight FAIL。
- selected cases全件unobservableならrun-level failure判定。

### 14.3 CI

`pnpm run verify`へ追加するのはdeterministic validateだけ。

live Codex evalはCI gateにしない。

---

## 15. Source commit / baseline取得順序

1. latest `main` との差分を解消・確認する。
2. implementation RunをEvaluator rootで開始する。
3. Observation Probeをanswer keyのないTargetで実施する。
4. 24-case datasetを作成しmanual reviewする。
5. pure logic / runner / tests / package scriptsを実装する。
6. deterministic validation / repository validationを通す。
7. source implementationをcommitする。active Run Artifactはこのcommitへ含めない。
8. source commit SHAを取得する。
9. 同じSHAからTarget checkoutを用意する。
10. Targetから `.agents/skills/*/evals/trigger/**` を除外する。
11. `Evaluator HEAD == Target HEAD == source_git_sha` を確認する。
12. Target diffがTrigger Eval dataset削除だけであることを確認する。
13. Evaluator rootにcurrent Run Directory以外のsource差分がないことを確認する。
14. canonical `--split all` baselineを1回実行する。
15. baseline JSONをEvaluator rootのRun Directoryへ保存する。
16. selected 24 casesが全件unobservableでないことを確認する。
17. Target rootをcleanupする。
18. baseline / standard Run Artifactを後続commitで保存する。

baseline artifact自身を含むcommit SHAを `source_git_sha` にしない。

---

## 16. Canonical commands

### Validate

```bash
pnpm run eval:skills:trigger:validate
```

### Target preparation

例:

```bash
git worktree add --detach <target-root> <source_git_sha>
```

その後、Target rootから以下だけを除外する。

```text
.agents/skills/*/evals/trigger/**
```

runnerはTarget rootの作成/削除/除外処理そのものを自動化しない。

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
- [ ] 5. committed HEADからprobe用Targetを用意し、Trigger Eval answer keyが見えないことを確認する。
- [ ] 6. positive / negative controlを実行する。
- [ ] 7. hook append deltaとactual Skill read selectorを確定する。
- [ ] 8. probe不成立なら独自classifier/parserへ逃げずblockerとして停止する。
- [ ] 9. probe Target rootをcleanupする。
- [ ] 10. 4 boundaryをcurrent routing SSOTと照合する。
- [ ] 11. initial 24 cases / 12 YAMLを作成する。
- [ ] 12. 全24caseを5項目manual dataset reviewで確認する。
- [ ] 13. pure logicを実装する。
- [ ] 14. minimal side-effect runnerを実装する。
- [ ] 15. routing observationとtask lifecycleを分離する。
- [ ] 16. `unobservable_reason` enumを実装する。
- [ ] 17. deterministic testsを実装する。
- [ ] 18. package scripts追加、validateのみverifyへ追加する。
- [ ] 19. deterministic validation / repository validationを実行する。
- [ ] 20. source implementationをcommitする。active Run Artifactは除外する。
- [ ] 21. source SHAからcanonical Target checkoutを用意しTrigger Eval datasetを除外する。
- [ ] 22. Target HEAD / Target diff / Evaluator HEAD / Evaluator source cleanをpreflightする。
- [ ] 23. canonical all baselineを1回実行する。
- [ ] 24. result/summary/provenance/unobservable reasonsを確認する。
- [ ] 25. 全件unobservableでないことを確認する。
- [ ] 26. routing failureを見てもdescriptionを変更しない。
- [ ] 27. Target rootをcleanupする。
- [ ] 28. Run-level `evaluation.json` / `REPORT.md` からbaseline artifactを参照する。
- [ ] 29. Run Artifact sanitizationを行う。
- [ ] 30. final diffでscope逸脱がないことを確認する。
- [ ] 31. baseline / standard Run Artifactを後続commitで保存する。

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
- Target rootにTrigger Eval datasetなし。
- prompt metadata leakageなし。
- Evaluator HEAD / Target HEAD / `source_git_sha` 一致。
- Target tracked diffはdataset除外だけ。
- dataset fingerprintはEvaluator root dataset由来。
- `codex_version`が`codex --version`由来。
- Skill read観測後のtask failureでrouting結果を失っていない。
- Skill read 0件は`turn.completed`時だけempty setとして確定している。
- queryはresultへ複製しない。
- observed Skill sort安定。
- `unobservable_reason`整合。
- summary.totalがselected case数と一致。
- 全件unobservableではない。

Comparison self-smoke:

```text
pass → unchanged_pass
observable failure → unchanged_failure
unobservable → unchanged_unobservable
```

Codex version mismatch fixtureでもcomparisonを実行し、`codex_version_match = false`になることを確認する。

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
generic evaluator sanitizer framework
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

Sanitized Target rootも一時実行環境でありcommitしない。

---

## 21. 成功判定

PR2成功:

- current main前提を確認済み。
- deterministic validation PASS。
- repository validation PASS。
- positive/negative observation control成立。
- initial 24 casesのmanual dataset review完了。
- Trigger Eval answer keyを除外したSanitized Targetでcanonical baseline取得成功。
- actual runner/dataset sourceと`source_git_sha`が一致。
- Skill read観測とtask completion failureを混同していない。
- selected casesが全件unobservableではない。
- machine-readable result/comparison contractが成立。
- `unobservable`原因をrouting failureと混同しない。
- Codex version差をcomparison条件差として表現できる。
- routing failureが残っていても記録できている。
- description tuning 0件。
- 独自Runtime/classifier/judge 0件。

PR2 blocker:

- Host Skill selectionを信頼できる形で観測できない。
- answer keyをHostから分離した条件でobservation proxyを成立させられない。

blocker時は評価方式を捏造せず停止し、Run Artifactへ理由を記録する。

---

## 22. 備考

- PR2の価値はscoreの高さではなく、description変更前のroutingを同じdataset/runner contractで再測定できることにある。
- initial 24 casesは統計benchmarkではなく回帰baseline。
- `validation` はoperational validation splitであり、blind/secret holdoutではない。
- datasetはRepositoryにcommitするが、live Host working treeからは除外する。保存場所と評価時の可視性は別問題として扱う。
- `evals/` はこのRepository独自のSkill評価拡張。
- pure logic + side-effect runnerの2file分離はframework化ではなく最小のtestability分離。
- Sanitized Targetは独自Agent Runtimeではない。同じsource revisionからEvaluator answer keyだけを外したHost working directoryである。
- read-only sandboxはcase間のRepository mutationを防ぐため維持する。ただしtask completion failureをrouting failureへ変換しない。
- ここから新しい評価frameworkを足さない。追加要求が出た場合はPR2へ抱え込まずscopeを再確認する。