# Issue #117 PR2 Trigger Eval baseline 実装計画

## 0. 依頼概要

- 対象 Issue: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117
- 対象フェーズ: PR2「Trigger Eval baseline」
- 実装ブランチ: `refactor/117-pr2-trigger-eval-baseline`
- 目的: PR3でSkill `description`を変更する前に、現状のSkill routingを再測定・比較できるbaselineとして固定する。

PR2はroutingを改善するPRではない。baselineでfailureが見つかっても、PR2内では以下を変更しない。

```text
.agents/skills/*/SKILL.md の description
AGENTS.md の routing 意味契約
Product behavior
```

実装は最小に保つ。以下は作らない。

```text
Repository独自Agent Runtime
routing engine
keyword / regex classifier
LLM judge
general Host abstraction
general shell parser
retry framework
parallel runner
statistical evaluation framework
generic sanitizer / snapshot builder
temporary Git tree rewrite framework
checkout / clone lifecycle manager
container / VM / custom permission framework
workspace reset framework
caseごとのclone manager
project trust manager
hook trust manager
trust state parser / editor
```

---

## 1. ゴール / 完了条件

### 1.1 ゴール

6 Skillすべてについてpositive / negativeのTrigger Eval queryをtrain / validationに分離し、6 Skillが同時に利用可能な現行Codex Host上でroutingを評価する。

評価結果をmachine-readableに保存し、後続runとcase ID単位で比較できるようにする。

### 1.2 対象Skill

```text
android-native-local-validation
code-review
exploratory-qa
feature-plan
harness-improvement
repair-loop
```

### 1.3 DoD

- [ ] 6 Skillすべてに `evals/trigger/train.yaml` と `evals/trigger/validation.yaml` がある。
- [ ] 各Skill / splitにpositive caseとnegative caseが最低1件ずつある。
- [ ] scored caseはexpected routingが「canonical 6 Skillの1つ」または「canonical Skill不要」のどちらかへ一意に決まるsingle-intent queryのみに限定する。
- [ ] multi-Skillが正当に必要なqueryはPR2に入れずPR6の責務とする。
- [ ] train / validationは物理ファイルで分離する。
- [ ] normalized duplicate queryがない。
- [ ] Issue #117指定の4 near-miss boundaryをtrain / validation双方で両側からカバーする。
- [ ] canonical evalは6 Skill同時条件で実行する。
- [ ] Hostへ渡すのはdatasetのraw `query`本文だけであり、expected label / owner / split / boundary / case IDをpromptに混ぜない。
- [ ] PR2 canonical runではRouting Targetのworking tree / Git refs / Git object databaseにPR2 Trigger Eval answer keyを持ち込まない。
- [ ] Routing TargetとEvaluatorは同じGit common-dirを共有しない。
- [ ] Routing Targetはshared-object cloneではなく、remote repositoryから用意したindependent cloneを使用する。
- [ ] Observation Probeからcanonical baselineまで同じRouting Target cloneを再利用する。
- [ ] Routing TargetはObservation Probe前にcurrent Codexの通常のuser-consented project trust / hook trust手順を完了している。
- [ ] trust設定はrunnerが作成・変更しない。
- [ ] current Codex Hostが実際に使用したSkillをHost-native evidenceから観測する。
- [ ] positive / negative observation controlでSkill readをtrigger proxyとして利用できることを実測確認する。
- [ ] routing observationとtask completionを分離する。
- [ ] timeout / abnormal process termination / terminal event欠落では、途中Skill readがあっても最終Skill集合を確定しない。
- [ ] case outcomeを `pass` / `false_negative` / `sibling_misroute` / `unexpected_trigger` / `unobservable` に分類できる。
- [ ] `sibling_misroute` は、そのcaseのnear-miss boundaryでexpected Skillと対向するcanonical Skillだけを単独で観測した場合に限定する。
- [ ] expected以外のnon-sibling Skill、複数Skill、expected + extra Skillは `unexpected_trigger` とする。
- [ ] observable caseでは `observed_skills` を最終Skill集合として `string[]` で保存する。
- [ ] observableなSkill read 0件は `observed_skills: []` とする。
- [ ] `outcome = unobservable` では `observed_skills: null` とし、空集合と区別する。
- [ ] `unobservable`ではmachine-readableな `unobservable_reason` を1つ保存し、複数異常時のpriorityを固定する。
- [ ] scoringはobserved Skillの集合で判定し、read順序を使わない。
- [ ] live runnerは `train` / `validation` / `all` を選択できる。
- [ ] PR2 canonical baselineは `all` で1回取得する。
- [ ] canonical `all` baselineでは4 boundaryの両side、計8 sideすべてについて最低1件はrouting observableである。
- [ ] `train` / `validation`単独runはdiagnostic用途とし、少なくとも1件routing observableならrun-level successとする。
- [ ] baselineと後続 `all` runをcase ID単位に比較できる。
- [ ] observation loss / recoveryをrouting failureの改善・悪化と混同しない。
- [ ] `evaluator_git_sha` でrunner / dataset revisionを特定できる。
- [ ] `routing_source_git_sha` で実際にrouting対象とした `AGENTS.md` / Skill revisionを特定できる。
- [ ] comparison時のCodex version差を条件差として明示できる。
- [ ] Evaluator logicの意味変更があるcomparisonをdescription-only improvementと誤認しない。
- [ ] live evalは `pnpm run verify` のhard gateにしない。
- [ ] deterministic dataset validationとpure scoring / comparison testのみCI gateにする。
- [ ] 6 Skillの `description` を変更していない。
- [ ] `AGENTS.md` のrouting意味契約を変更していない。
- [ ] Product code / Product test / training contentを変更していない。
- [ ] Repository独自Agent Runtime / Workflow Engine / routing classifierを追加していない。
- [ ] canonical baselineと標準Run ArtifactがRepository policyに沿って保存される。

---

## 2. 実装開始前 / baseline直前の前提確認

### 2.1 実装開始時にlatest `main`を確認する

branchが`main`にbehindしている場合はincoming diffを確認する。特に以下を見る。

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
→ latest main を branch へ取り込む
→ expected routing / observation前提を再確認してから継続
```

merge / rebaseの方法自体は固定しない。

### 2.2 canonical baseline直前にもlatest `main`を再確認する

```text
latest main が実装開始時から不変
→ そのSHAを routing_source_git_sha とする

latest main が進んだが routing / observation 無関係
→ 同じRouting Targetをfetchして新しいlatest mainへdetached checkout
→ 新しいlatest main SHAを routing_source_git_sha とする

latest main が routing / observation へ影響する変更を含む
→ baselineを開始しない
→ expected routing / probe / runner前提を再確認する
→ 必要ならEvaluator branchへ最小修正を反映する
→ Targetを新しいlatest mainへcheckoutする
→ project config / hook sourceが変わった場合は通常のtrust確認をやり直す
→ Observation Probeを再実行する
→ 再validate後に新しい evaluator_git_sha を確定する
```

PR2 canonical baselineのrouting subjectは、baseline直前に確定したlatest `main`とする。

### 2.3 Routing SSOT

- `AGENTS.md`: Repository-level routing SSOT。
- `.agents/skills/<skill>/SKILL.md`: Skill入口契約。current `description` がbaseline対象。

PR2ではどちらのrouting意味も変更しない。

---

## 3. Evaluator root / Routing Target root

### 3.1 2つのrevisionを分離する

```text
Evaluator root
- PR2 source implementation commit
- runnerを起動する
- 12 Trigger Eval datasetを読む
- implementation Run Artifact / output / compare artifactを置く
- HEAD = evaluator_git_sha

Routing Target root
- remote mainから作成したindependent clone
- Observation Probeからcanonical baselineまで同じcloneを再利用する
- Codex の -C に渡す
- current AGENTS.md / 6 Skills / Repository sourceを持つ
- PR2 Trigger Eval datasetを持たない
- PR2 Plan / PR2 Run Artifact / baseline resultを持たない
- Evaluator repositoryのGit refs / common-dirを共有しない
- Evaluator repository由来のshared object databaseを使用しない
- HEAD = routing_source_git_sha（baseline直前に確定）
```

```text
dataset / expected label = Evaluator root
Host working directory   = Routing Target root
```

### 3.2 Routing Targetはremote repositoryから1回だけcloneする

```bash
git clone --no-tags --single-branch --branch main <REMOTE_REPOSITORY_URL> <target-root>
```

禁止:

```text
Evaluator repository pathからのlocal clone
file:// URLからのclone
--local
--shared
--reference
--reference-if-able
Evaluator repositoryからの git worktree add
```

runnerにはclone作成・checkout管理・cleanup・trust変更を実装しない。

### 3.3 Project trust / hook trustはenvironment prerequisite

Observation Probe前に、Routing Targetをcurrent Codexの通常のuser-consented trust workflowでtrustedにする。Repository-owned hookに追加trustが必要なら通常手順で承認する。

runnerは以下をしない。

```text
~/.codex/config.toml 編集
trust state file 編集
hook trust key生成
--dangerously-bypass-* でtrust回避
一時CODEX_HOMEによるtrust偽装
```

Probe失敗時は、まずproject trust / hook trust / `.codex/config.toml` load / hooks enabled / hook logger実行可否を確認する。未成立ならenvironment preparation failureであり、observation design blockerとは扱わない。

### 3.4 同じTarget cloneをProbeからbaselineまで再利用する

baseline直前は概念上以下を行う。

```bash
git -C <target-root> fetch --prune origin main
git -C <target-root> checkout --detach <routing_source_git_sha>
```

TargetにTrigger Eval datasetやEvaluator artifactをcopyしない。

### 3.5 Routing Target preflight

live run開始前にrunnerは以下を確認する。

```text
Target rootが存在する
Evaluator rootと別path
Git working tree / checkoutである
tracked working-tree diffなし
staged diffなし
6 canonical SkillをTarget rootから発見できる
.agents/skills/*/evals/trigger/** がTarget rootに存在しない
routing_source_git_sha = Target HEAD
EvaluatorとTargetのGit common-dir real pathが異なる
Targetの .git/objects/info/alternates が存在しない、または空である
```

Git common-dirは `git rev-parse --git-common-dir` の結果を各root基準で解決し、realpath比較する。

untracked/ignored hook logはlive run中に生成されるため許可する。

### 3.6 answer-key isolationの保証範囲

保証対象:

```text
Routing Target working tree
Routing Target Git refs
canonical remote clone手順で取得するGit object database
Host prompt
```

保証しないもの:

```text
OS全体のfilesystem confidentiality
別process / 別userによる強制隔離
container / VM sandbox境界
adversarial Hostに対するsecurity boundary
Git pack内部のadversarial object-level confidentiality
```

container / VM / object provenance scanner等は追加しない。

### 3.7 Evaluator source consistency

Evaluator HEADを `evaluator_git_sha` とする。

`.codex/runs/**` はsource consistency判定対象外。それ以外のtracked / untracked changeはbaseline開始前にcommit / restore / cleanupする。runnerはactive Run IDを探索・推測しない。

### 3.8 Dataset fingerprint

`dataset_sha256`はEvaluator rootの12 dataset filesから計算する。Targetからは計算しない。

### 3.9 PR3への境界

PR2 merge後はmain自体にTrigger Eval datasetが入るため、PR3のanswer-key-free Target準備方法はPR3 Planで決める。PR2でgeneric sanitizer / temporary repository generatorを作らない。

---

## 4. Observation Probe

### 4.1 Trigger proxy

canonical `SKILL.md` のactual read/openをSkill triggerのobservation proxyとする。

### 4.2 Positive control

```text
$feature-plan を使って、この依頼の実装計画だけを作ってください。
```

合格条件:

- hook evidenceを一意に取得できる。
- `feature-plan/SKILL.md` のactual read/openを検出できる。
- path mention / search resultをactual readと誤認しない。

### 4.3 Negative control

```text
package.json に記載されている package name だけを確認して答えてください。
```

合格条件:

- hook evidenceを一意に取得できる。
- canonical Skill readが0件。
- `turn.completed`まで到達し、`observed_skills = []`を確定できる。

### 4.4 Hook correlation

各caseでnormal/fallback両方の `hooks-*.jsonl` を、実行前にpath + byte size snapshotする。

1 case = 1 Codex process、sequentialで実行し、after snapshotとの差から新規/増加fileを抽出する。

```text
exactly 1 append delta
→ parse対象

0 / 複数 / size縮小 / non-append
→ unobservable + hook_correlation
```

file全体ではなくbefore-size以降だけを読む。ThreadId / SessionId mappingは作らない。

### 4.5 Selectorを過剰実装しない

Probeで確認したcurrent Codexの具体的なtool/input shapeだけを扱う。general shell parser、loose path regex、query classifier、LLM judgeは作らない。

trust成立後もactual readを安定観測できない場合はPR2 blockerとする。

---

## 5. Dataset設計

### 5.1 Layout / schema

```text
.agents/skills/<skill>/evals/trigger/
├── train.yaml
└── validation.yaml
```

```yaml
schema_version: 1
cases:
  - id: code-review-train-001
    query: "変更内容をレビューして問題点を洗い出してください"
    expected_skill: code-review
    boundary: code-review-vs-repair-loop
```

case fieldは `id` / `query` / `expected_skill` / `boundary` だけ。owner / split / polarityはpathとexpectedから導出する。

### 5.2 Case ID

```text
<owner-skill>-<split>-NNN
```

IDはglobal unique。owner/split prefixはfile pathと一致。後続追加で既存IDを詰め直さない。

### 5.3 Boundary enum

```text
exploratory-qa-vs-android-native-local-validation
code-review-vs-repair-loop
repair-loop-vs-harness-improvement
feature-plan-vs-direct-implementation
```

### 5.4 Boundary integrity / sibling mapping

```text
exploratory-qa-vs-android-native-local-validation
participants = { exploratory-qa, android-native-local-validation }
sibling(exploratory-qa) = android-native-local-validation
sibling(android-native-local-validation) = exploratory-qa

code-review-vs-repair-loop
participants = { code-review, repair-loop }
sibling(code-review) = repair-loop
sibling(repair-loop) = code-review

repair-loop-vs-harness-improvement
participants = { repair-loop, harness-improvement }
sibling(repair-loop) = harness-improvement
sibling(harness-improvement) = repair-loop

feature-plan-vs-direct-implementation
owner = feature-plan
expected ∈ { feature-plan, null }
canonical Skillとしてのsiblingは定義しない
```

`sibling_misroute`判定にはこの固定mappingだけを使う。generic graph / routing classifierは作らない。

### 5.5 Initial 24-case matrix

初期値は6 Skill × 2 split × 2 owner case = 24 cases。ただしvalidatorの永久的な `count == 24` invariantにはしない。

各splitの配置:

| Owner | Case | Expected | Boundary |
|---|---:|---|---|
| exploratory-qa | 001 | exploratory-qa | exploratory-qa-vs-android-native-local-validation |
| exploratory-qa | 002 | android-native-local-validation | exploratory-qa-vs-android-native-local-validation |
| android-native-local-validation | 001 | android-native-local-validation | exploratory-qa-vs-android-native-local-validation |
| android-native-local-validation | 002 | exploratory-qa | exploratory-qa-vs-android-native-local-validation |
| code-review | 001 | code-review | code-review-vs-repair-loop |
| code-review | 002 | repair-loop | code-review-vs-repair-loop |
| repair-loop | 001 | repair-loop | repair-loop-vs-harness-improvement |
| repair-loop | 002 | harness-improvement | repair-loop-vs-harness-improvement |
| harness-improvement | 001 | harness-improvement | repair-loop-vs-harness-improvement |
| harness-improvement | 002 | repair-loop | repair-loop-vs-harness-improvement |
| feature-plan | 001 | feature-plan | feature-plan-vs-direct-implementation |
| feature-plan | 002 | null | feature-plan-vs-direct-implementation |

train / validationは自然な別シナリオとし、単純paraphraseにしない。

### 5.6 Canonical observable boundary-side set

canonical `all`では以下8 sideすべてに最低1 observable caseが必要。

```text
exploratory-qa-vs-android-native-local-validation / exploratory-qa
exploratory-qa-vs-android-native-local-validation / android-native-local-validation
code-review-vs-repair-loop / code-review
code-review-vs-repair-loop / repair-loop
repair-loop-vs-harness-improvement / repair-loop
repair-loop-vs-harness-improvement / harness-improvement
feature-plan-vs-direct-implementation / feature-plan
feature-plan-vs-direct-implementation / null
```

train/validation双方でobservableまでは要求しない。割合閾値は導入しない。

### 5.7 Query authoring / manual review

禁止:

```text
明示Skill名
routing meta-question
expected label leakage
正当にmulti-Skillが必要な複合依頼
```

全caseをmanual reviewし、以下を確認する。

1. single-intent。
2. current `AGENTS.md` / `SKILL.md` からexpectedを説明可能。
3. boundaryのどちら側か説明可能。
4. label leakageなし。
5. train / validationが単純paraphraseではない。

### 5.8 Duplicate normalization

NFKC → trim → whitespace collapse → lowercase。重複検知専用で、Hostにはraw queryを渡す。

---

## 6. Train / validation

`validation`はsecret holdoutではなくoperational validation splitとする。

- 物理分離する。
- CLIで別実行できる。
- PR3 tuning loopではvalidation結果を使わない運用を可能にする。
- committed YAML自体がAgentから永続的に不可視とは主張しない。
- PR2 live Routing Targetにはtrain/validationどちらのanswer keyも置かない。

---

## 7. Routing observation / Scoring

### 7.1 lifecycleによるrouting set確定

#### `turn.completed`

```text
Skill readあり → final observed_skillsでscore
Skill readなし → observed_skills = [] でscore
```

#### `turn.failed`

```text
Skill readあり → observed Skill集合でscore
Skill readなし → unobservable + lifecycle_failure + observed_skills = null
```

#### timeout / abnormal termination / terminal欠落 / top-level errorのみ

```text
Skill read有無にかかわらず
→ unobservable
→ observed_skills = null
```

途中Skill readをfinal resultとして保存しない。

### 7.2 `observed_skills` invariant

```text
observable outcome → string[]
observable 0 Skill → []
unobservable → null
```

### 7.3 Set-based scoring

observable caseにのみ適用する。

```text
expected = null, observed = []
→ pass

expected = null, observed != []
→ unexpected_trigger

expected != null, observed = []
→ false_negative

expected != null, observed = [expected] のみ
→ pass

expected != null,
boundaryにcanonical siblingが定義されており、
observed = [sibling] のみ
→ sibling_misroute

expected != null,
上記以外のnon-empty observed
→ unexpected_trigger
```

したがって以下はすべて `unexpected_trigger`。

```text
expected以外のnon-sibling Skillのみ
sibling + 別Skill
expected + extra Skill
複数のwrong Skill
feature-plan expected時に任意のcanonical Skillが発火
```

`sibling_misroute`は「near-miss boundaryの対向Skillだけへきれいに誤routingした」場合だけを表す。

### 7.4 `unobservable_reason`

```text
timeout
process_failure
lifecycle_failure
hook_correlation
hook_parse
skill_read_observation
```

複数異常時priority:

```text
1 timeout
2 process_failure
3 lifecycle_failure
4 hook_correlation
5 hook_parse
6 skill_read_observation
```

trusted `turn.completed` / `turn.failed`がある単なるnon-zero exitをprocess_failureへ上書きしない。

### 7.5 Host JSONL / child process

stdout JSONL:

```text
thread.started
turn.completed
turn.failed
top-level error
```

child process:

```text
exit code
signal
spawn failure
timeout
```

response proseはrouting scoringに使わない。

---

## 8. 実装構造

### 8.1 Pure logic

```text
scripts/evals/skill-trigger-evals.ts
```

責務:

- constants / types
- dataset discovery / YAML parse / validation
- owner / split / polarity derivation
- boundary integrity / sibling mapping
- normalization / fingerprint
- scoring
- summary
- run-level observability判定
- comparison

plain function / plain object。class hierarchyなし。外部process起動なし。

### 8.2 Side-effect runner

```text
scripts/evals/run-skill-trigger-evals.ts
```

責務:

- CLI
- Evaluator / Target preflight
- SHA取得
- common-dir / alternates確認
- `codex --version`
- `codex exec`
- timeout / process lifecycle
- stdout JSONL parse
- hook snapshot / delta
- actual Skill read extraction
- routing observability確定
- pure scorer呼び出し
- output serialization

HostAdapter/provider interfaceは作らない。Target clone/trust/cleanupもrunnerへ入れない。

### 8.3 Test

```text
tests/repository-contract/skill-trigger-evals.test.ts
```

Host Runtimeを起動せず、pure logic + small helperだけをtestする。

### 8.4 Dependency

既存Node.js / TypeScript / tsx / yaml / Vitestを再利用し、新規dependencyは原則追加しない。

---

## 9. CLI contract

package scripts:

```json
{
  "eval:skills:trigger:validate": "tsx scripts/evals/run-skill-trigger-evals.ts --validate-only",
  "eval:skills:trigger": "tsx scripts/evals/run-skill-trigger-evals.ts"
}
```

options:

```text
--validate-only
--target-root <path>
--split train|validation|all
--output <path>
--compare <path>
```

- `--validate-only`: 全12 datasetをvalidate。Host起動なし。他optionとの明示併用は禁止。
- `--target-root`: live必須。dataset sourceには使わず、Codex `-C` 用だけ。
- `--split`: live default `all`。
- `--output`: live必須。Target配下は禁止。
- `--compare`: optional、`all`だけ。

追加しないoption:

```text
case filter
parallelism
retry / repeat
model sweep
sampling
clone lifecycle
sanitizer profile
routing source override
run-id
percentage threshold
trust override
```

---

## 10. Codex execution

各case:

```bash
codex exec --json --ephemeral --sandbox read-only -C <target-root> -
```

- queryはraw UTF-8でstdin。
- 1 case = 1 fresh process/session。
- sequential。
- retryなし。
- expected metadataをpromptへ追加しない。
- network overrideなし。
- case間でTargetを変更しない。
- timeoutは120000ms。
- `codex --version`はlive run開始時に1回。失敗ならrun開始せずexit 1。
- modelを確実に観測できなければ `unreported`。

---

## 11. Result contract

case:

```json
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
```

unobservable:

```json
{
  "observed_skills": null,
  "outcome": "unobservable",
  "unobservable_reason": "timeout"
}
```

top level:

```json
{
  "schema_version": 1,
  "provenance": {
    "evaluator_git_sha": "...",
    "routing_source_git_sha": "...",
    "dataset_sha256": "...",
    "codex_version": "...",
    "model": "unreported",
    "executed_at": "...",
    "split": "all"
  },
  "cases": [],
  "summary": {
    "total": 24,
    "by_outcome": {},
    "by_owner_skill": {},
    "by_split": {},
    "by_boundary": {}
  }
}
```

- `query`はresultへ複製しない。
- cases / observed_skillsはstable sort。
- `summary.total`はselected case数から動的算出。
- dataset fingerprintは12 YAMLをpath辞書順で `path + NUL + raw bytes` としてSHA-256。
- absolute path / raw hook / partial Skill set / trust stateは保存しない。

---

## 12. Comparison

`--compare`は`all`のみ。

hard error:

```text
dataset_sha256 mismatch
case ID set mismatch
baseline schema parse failure
```

comparison自体を禁止しない差:

```text
evaluator Git SHA
routing source Git SHA
Codex version
model provenance
```

保存:

```text
baseline_evaluator_git_sha
baseline_routing_source_git_sha
baseline_codex_version
codex_version_match
```

status:

```text
unchanged_pass
fixed
regressed
unchanged_failure
newly_unobservable
recovered_observable
unchanged_unobservable
```

failure category間の変化は `unchanged_failure`。weighted score / rankingは作らない。

Evaluator semanticsが変わった場合、comparisonはdiagnosticとして実行できるがdescription-only improvementとは解釈しない。対象はSkill read extraction、observability、scoring、outcome classification、comparison transition、`observed_skills` contract、run-level observability contract。

追加のevaluator version/hash frameworkは作らず、`evaluator_git_sha` + Git diffで追跡する。

---

## 13. Run-level success / Exit code

observable outcome:

```text
pass
false_negative
sibling_misroute
unexpected_trigger
```

### train / validation

selected cases完走 + output保存 + 1件以上observableでsuccess。

### canonical all

8 `(boundary, expected_skill)` sideすべてに最低1 observable caseが必要。routing outcomeがfailureでもobservableならcoverage成立。

exit 1:

```text
dataset / CLI / preflight failure
TargetとEvaluatorが同一root/common-dir
Target dirty/staged
TargetにTrigger Eval datasetあり
Targetに6 Skill不足
Target alternates非空
Evaluatorに .codex/runs/** 外のsource差分
outputがTarget配下
compareとnon-all併用
codex version取得不能
Codex spawn不能
output write failure
comparison contract failure
train|validation全件unobservable
allの8 sideいずれかが全件unobservable
```

可能ならresultを書いてからexit 1する。

---

## 14. Deterministic validation / tests

### 14.1 Dataset validator

- 6 Skill / 12 files。
- YAML / schema_version / exact fields。
- ID unique / owner split整合。
- query non-empty。
- expected canonical/null。
- 4 boundary。
- boundary participant integrity。
- normalized duplicateなし。
- 各Skill/split positive + negative。
- train/validation双方4 boundary。
- expected side coverage。
- fingerprint生成可能。

24件固定はvalidator invariantにしない。semantic correctnessはmanual review。

### 14.2 Tests

Dataset:

```text
valid fixture
unknown/malformed field
ID duplicate / owner split mismatch
normalized duplicate
unknown expected/boundary
boundary participant mismatch
required side欠落
25件以上でもcontract validならPASS
```

Scoring / observability:

```text
turn.completed + Skill → score
turn.completed + 0 Skill → []でscore
turn.failed + Skill → score
turn.failed + 0 Skill → unobservable/lifecycle_failure/null
timeout → unobservable/timeout/null
abnormal no terminal → unobservable/null
hook correlation / parse failure → unobservable/null
unobservableでarray禁止
observableでnull禁止
reason priority
trusted terminal + non-zeroだけではprocess_failureにしない

expected null + [] → pass
expected null + any Skill → unexpected_trigger
expected Skill + [] → false_negative
expected Skill + [expected] → pass
expected Skill + [boundary sibling]のみ → sibling_misroute
expected Skill + [non-sibling]のみ → unexpected_trigger
expected Skill + [sibling, extra] → unexpected_trigger
expected Skill + [expected, extra] → unexpected_trigger
feature-plan expected + any canonical Skill → unexpected_trigger
observed order invariance
```

Run-level:

```text
train/validation 1 observable → success
train/validation all unobservable → failure
all 8 sides observable → success
all 7 sides only → failure
routing failureでもobservableならside coverage成立
```

Comparisonは7 transition、fingerprint/ID mismatch、Codex version match/mismatchをtestする。

Runner helperはTarget dirty/dataset/common-dir/alternates、SHA取得、Evaluator source consistencyをtestする。trust stateのunit test/mock frameworkは作らない。

### 14.3 CI

`pnpm run verify`へ追加するのはdeterministic validateだけ。live eval / Probe / trust確認はCI gateにしない。

---

## 15. Source commit / canonical baseline順序

1. latest main / divergence確認。
2. incoming diff確認・必要ならmain取り込み。
3. current descriptionsを記録しPR2変更禁止を確認。
4. implementation Run開始。
5. remoteからindependent current-main Targetを1回clone。
6. 通常手順でproject trust / hook trust。
7. Observation Probe。
8. Probe失敗時はtrust/config/hooksを先に切り分け。
9. trust成立後もProbe不成立ならblocker。
10. 4 boundaryをrouting SSOTと照合。
11. 24 cases / 12 YAML作成。
12. 全case manual review。
13. pure logic / runner / tests / package実装。
14. deterministic/repository validation。
15. source implementation commit。active Run Artifactは含めない。
16. `evaluator_git_sha`確定。
17. baseline直前にlatest main再取得。
18. routing/observation差分確認。
19. 同じTargetをfetchし `routing_source_git_sha` へdetached checkout。
20. relevant changeならtrust確認 / Probe再実行 / evaluator再validate。
21. Target preflight。
22. Evaluator source clean確認。
23. canonical `all`を1回実行。
24. baseline JSON保存。
25. 8 side observability確認。
26. unobservableの`observed_skills = null`確認。
27. routing failureを見てもdescription変更しない。
28. evaluation/reportからbaseline参照。
29. Run Artifact sanitization。
30. final scope diff。
31. baseline / standard Run Artifactを後続commit。
32. Target cleanup。

baseline artifact自身を`evaluator_git_sha` commitへ自己参照させない。

---

## 16. Canonical commands

```bash
pnpm run eval:skills:trigger:validate
```

Target preparation:

```bash
git clone --no-tags --single-branch --branch main <REMOTE_REPOSITORY_URL> <target-root>
```

baseline直前:

```bash
git -C <target-root> fetch --prune origin main
git -C <target-root> checkout --detach <routing_source_git_sha>
```

baseline:

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-baseline.json
```

compare:

```bash
pnpm run eval:skills:trigger -- \
  --target-root <target-root> \
  --split all \
  --output .codex/runs/<run_id>/trigger-eval-result.json \
  --compare <baseline-json>
```

---

## 17. Validation

```bash
pnpm run eval:skills:trigger:validate
pnpm run test:repository
pnpm run validate:skills
pnpm run verify
```

Canonical baselineで最低限確認:

- 24 cases全件処理。
- 1 case = 1 fresh process。
- 6 Skill同時条件。
- answer-key-free independent Target。
- common-dir非共有 / alternatesなし。
- prompt metadata leakageなし。
- evaluator/routing SHA一致確認。
- fingerprint provenance。
- lifecycle rules。
- `[]` / `null` invariant。
- clean sibling-onlyだけが `sibling_misroute`。
- non-sibling / multiple triggerは `unexpected_trigger`。
- stable sort。
- 8 boundary side observable。

---

## 18. Scope guard

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
.agents/skills/*/SKILL.md description
AGENTS.md routing意味契約
Product code / Product E2E / training scenario
PR4/PR5/PR6 logic
Agent Runtime / routing engine
query classifier / LLM judge
general Host adapter / general shell parser
retry / parallel / statistical framework
runner clone lifecycle manager
generic sanitizer / snapshot framework
container / VM / custom permission framework
workspace reset / case-per-clone
project trust / hook trust manager
```

---

## 19. 成果物 / 成功判定

Source:

```text
12 Trigger Eval YAML
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

成功条件:

- deterministic / repository validation PASS。
- Probe成立。
- 24 cases manual review完了。
- answer-key-free Targetでcanonical baseline取得。
- 8 sideすべてobservable。
- `sibling_misroute`と`unexpected_trigger`をnear-miss boundaryに沿って正しく区別できる。
- evaluator/routing provenanceを特定可能。
- comparison contract成立。
- description tuning 0件。
- custom Runtime / classifier / judge / trust automation 0件。

PR2 blocker:

- trustを通常手順で成立させてもSkill selectionを観測できない。
- answer-key-free Targetでobservation proxyが成立しない。
- canonical allで8 sideのいずれかが1件もobservableにならない。

blocker時は評価方式を捏造せず停止し、Run Artifactへ理由を記録する。

---

## 20. 備考

- PR2の価値はscoreの高さではなく、description変更前のrouting baselineを再測定できることにある。
- 24 casesは統計benchmarkではなく回帰baseline。
- `validation`はoperational validation split。
- `sibling_misroute`はnear-miss boundaryの対向Skillだけへの単独誤routingを意味する。
- non-sibling / multi-triggerを`sibling_misroute`へ丸めない。
- answer-key isolationはRepository/Git contextの汚染防止でありsecurity sandboxではない。
- project/hook trustはenvironment prerequisiteでrunner責務ではない。
- `observed_skills = []` は0 Skill確定、`null`は最終集合確定不能。
- pure logic + side-effect runnerの2file分離は最小のtestability分離。
- read-only sandbox、no retry、sequentialを維持する。
- PR3のTarget作成問題をPR2で一般化しない。
- Evaluator semantics変更時のcomparisonをdescription-only effectと断定しない。
- ここから新しい評価frameworkを足さない。
