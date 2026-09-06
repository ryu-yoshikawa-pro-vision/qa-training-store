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
session correlation framework
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
- [ ] Evaluator rootとRouting Target rootはrealpath上で相互に包含しない。
- [ ] Routing Targetはshared-object cloneではなく、remote repositoryから用意したindependent cloneを使用する。
- [ ] Observation Probeからcanonical baselineまで同じRouting Target cloneを再利用する。
- [ ] Observation Probe / live eval中は同じRouting Targetを他のCodex sessionから使用しない。
- [ ] Routing TargetはObservation Probe前にcurrent Codexの通常のuser-consented project trust / hook trust手順を完了している。
- [ ] trust設定はrunnerが作成・変更しない。
- [ ] current Codex Hostが実際に使用したSkillをHost-native evidenceから観測する。
- [ ] positive / negative observation controlでSkill readをtrigger proxyとして利用できることを実測確認する。
- [ ] Observation Probeはrunner実装前のmanual technical checkとして行い、Probe専用のcommitted scriptは追加しない。
- [ ] routing observationとtask completionを分離する。
- [ ] timeout / abnormal process termination / terminal event欠落では、途中Skill readがあっても最終Skill集合を確定しない。
- [ ] hook correlation / parse / selectorの成立を確認する前に「Skill read 0件」を確定しない。
- [ ] `unobservable_reason`はordered decision pipeline 1本で決定し、独立したpriority state machineを作らない。
- [ ] case outcomeを `pass` / `false_negative` / `sibling_misroute` / `unexpected_trigger` / `unobservable` に分類できる。
- [ ] `sibling_misroute` は、そのcaseのnear-miss boundaryでexpected Skillと対向するcanonical Skillだけを単独で観測した場合に限定する。
- [ ] expected以外のnon-sibling Skill、複数Skill、expected + extra Skillは `unexpected_trigger` とする。
- [ ] observable caseでは `observed_skills` を最終Skill集合として `string[]` で保存する。
- [ ] observableなSkill read 0件は `observed_skills: []` とする。
- [ ] `outcome = unobservable` では `observed_skills: null` とし、空集合と区別する。
- [ ] scoringはobserved Skillの集合で判定し、read順序を使わない。
- [ ] live runnerは `train` / `validation` / `all` を選択できる。
- [ ] PR2 canonical baselineは、有効な `all` runを1回だけ採用する。
- [ ] case単位retry、routing結果改善目的の再実行、unobservableだけの引き直しを行わない。
- [ ] Evaluator / environment defectでrun全体を無効化した場合だけ、修正・commit・Probe / validation後に新しい `all` runを最初から実行できる。
- [ ] canonical `all` baselineでは4 boundaryの両side、計8 sideすべてについて最低1件はrouting observableである。
- [ ] `train` / `validation`単独runはdiagnostic用途とし、少なくとも1件routing observableならrun-level successとする。
- [ ] baselineと後続 `all` runをcase ID単位に比較できる。
- [ ] comparison JSONのschema / case status fieldを固定し、後続PRが推測せず利用できる。
- [ ] `--compare`なしのrunでは `comparison` fieldを出力しない。
- [ ] observation loss / recoveryをrouting failureの改善・悪化と混同しない。
- [ ] `evaluator_git_sha` でrunner / dataset revisionを特定できる。
- [ ] `routing_source_git_sha` で実際にrouting対象とした `AGENTS.md` / Skill revisionを特定できる。
- [ ] comparison時のCodex version差を条件差として明示できる。
- [ ] Evaluator logicの意味変更があるcomparisonをdescription-only improvementと誤認しない。
- [ ] live evalは `pnpm run verify` のhard gateにしない。
- [ ] deterministic dataset validationとscoring / comparison testのみCI gateにする。
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
- Evaluator rootの内側にも外側の親にも置かない
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
Evaluator root配下へのTarget clone
Target root配下へのEvaluator配置
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

Observation Probe / live eval中は、このTargetを評価専用として扱い、別Codex process/sessionを同じTargetへ接続しない。

### 3.5 Routing Target preflight

live run開始前にrunnerは以下を確認する。

```text
Target rootが存在する
Evaluator rootとTarget rootのrealpathが異なる
Target root realpathがEvaluator root realpathの子孫ではない
Evaluator root realpathがTarget root realpathの子孫ではない
Git working tree / checkoutである
6 canonical Skillの既知SKILL.md pathがすべて通常fileとして存在しread可能
.agents/skills/*/evals/trigger/** がTarget rootに存在しない
routing_source_git_sha = Target HEAD
EvaluatorとTargetのGit common-dir real pathが異なる
Targetの .git/objects/info/alternates が存在しない、または空である
Git status上、tracked / staged / non-ignored untracked changeがない
```

6 Skill preflightで確認するのは、以下のknown pathのfilesystem presence / readabilityだけとする。

```text
.agents/skills/android-native-local-validation/SKILL.md
.agents/skills/code-review/SKILL.md
.agents/skills/exploratory-qa/SKILL.md
.agents/skills/feature-plan/SKILL.md
.agents/skills/harness-improvement/SKILL.md
.agents/skills/repair-loop/SKILL.md
```

preflightでは以下を実装しない。

```text
SKILL frontmatterの再validation
Host discovery emulator
Codex routing/discoveryのRepository独自再実装
```

Skill package自体のdeterministic validationは既存 `validate:skills` / repository validationに委ね、Hostが実際にselect/readするかはTrigger Evalで測る。

Target clean判定は特別なhook-log allowlistを実装せず、概念上以下が空であることを確認する。

```bash
git -C <target-root> status --porcelain --untracked-files=all
```

normal hook log (`.codex/logs/*.jsonl`) は `.codex/logs/.gitignore` でignore済み、fallback log (`.artifacts/**`) もRepository rootでignore済みなので、通常のGit clean判定だけで十分とする。

Git common-dirは `git rev-parse --git-common-dir` の結果を各root基準で解決し、realpath比較する。

path containment判定も文字列prefix比較ではなく、realpath化したdirectory境界で判定する。

### 3.6 answer-key isolationの保証範囲

保証対象:

```text
Routing Target working tree
Routing Target Git refs
canonical remote clone手順で取得するGit object database
Host prompt
Evaluator / Target間のdirectory containmentなし
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

### 4.1 位置づけ

Observation Probeは**runner実装前のmanual technical check**とする。

目的は、current Codex Hostで「canonical `SKILL.md` のactual read/open」をSkill triggerのobservation proxyとして安定利用できるか確認すること。

Probeのためだけに以下を追加しない。

```text
committed probe script
Probe専用CLI option
Probe専用runner
session correlation utility
```

実装者はTarget rootを `-C` に指定して `codex exec` を直接実行し、hook JSONLを直接確認する。Probeで確認したactual tool/input shapeと判断根拠はimplementation Run Artifactへ記録し、そのshapeだけを後続runnerのSkill read selectorへ実装する。

Probe実行中は同じRouting Targetを他のCodex session / processから使用しない。

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
- hook correlation / parse / selectorが正常に成立する。
- canonical Skill readが0件。
- `turn.completed`まで到達し、`observed_skills = []`を確定できる。

### 4.4 Hook log path / correlation

確認対象は以下2箇所。

```text
<target-root>/.codex/logs/hooks-*.jsonl
<target-root>/.artifacts/codex-hooks/hooks-*.jsonl
```

各caseで両directoryを実行前にpath + byte size snapshotする。

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

case fieldは `id` / `query` / `expected_skill` / `boundary` だけ。

### 5.2 owner / split / polarity derivation

以下を固定する。

```text
owner_skill
= dataset fileを所有する .agents/skills/<skill>/ のSkill名

split
= train.yaml      → train
= validation.yaml → validation

polarity
= expected_skill === owner_skill → positive
= otherwise                       → negative
```

`otherwise`には「別canonical Skill」と `null` の両方を含む。

したがってpolarityをYAML fieldとして保存しない。

### 5.3 Case ID

```text
<owner-skill>-<split>-NNN
```

IDはglobal unique。owner/split prefixはfile pathと一致。後続追加で既存IDを詰め直さない。

### 5.4 Boundary enum

```text
exploratory-qa-vs-android-native-local-validation
code-review-vs-repair-loop
repair-loop-vs-harness-improvement
feature-plan-vs-direct-implementation
```

### 5.5 Boundary integrity / sibling mapping

```text
exploratory-qa-vs-android-native-local-validation
participants = { exploratory-qa, android-native-local-validation }
owner_skill / expected_skill はparticipants内
expected_skillはnull不可
sibling(exploratory-qa) = android-native-local-validation
sibling(android-native-local-validation) = exploratory-qa

code-review-vs-repair-loop
participants = { code-review, repair-loop }
owner_skill / expected_skill はparticipants内
expected_skillはnull不可
sibling(code-review) = repair-loop
sibling(repair-loop) = code-review

repair-loop-vs-harness-improvement
participants = { repair-loop, harness-improvement }
owner_skill / expected_skill はparticipants内
expected_skillはnull不可
sibling(repair-loop) = harness-improvement
sibling(harness-improvement) = repair-loop

feature-plan-vs-direct-implementation
owner_skill = feature-plan
expected_skill ∈ { feature-plan, null }
canonical Skillとしてのsiblingは定義しない
```

`sibling_misroute`判定にはこの固定mappingだけを使う。generic graph / routing classifierは作らない。

### 5.6 Initial 24-case matrix

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

### 5.7 Canonical observable boundary-side set

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

### 5.8 Query authoring / manual review

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

### 5.9 Duplicate normalization

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

### 7.1 `trusted terminal` の定義

`trusted terminal` は、current Codex stdout JSONLで当該caseについて `turn.completed` または `turn.failed` のどちらか一方を終端eventとして信頼できる状態を指す。

以下はtrusted terminalとして扱わない。

```text
turn.completed / turn.failed がどちらもない
terminal eventが競合・重複しfinal stateを一意に決められない
top-level errorしかない
```

### 7.2 routing observationのordered decision pipeline

各caseは以下の順序だけで判定する。独立した `unobservable_reason` priority listや別state machineを作らない。

```text
1. process timeoutか
   YES → outcome = unobservable
         observed_skills = null
         unobservable_reason = timeout

2. spawn failure / signal、またはtrusted terminalなし + non-zero exitか
   YES → outcome = unobservable
         observed_skills = null
         unobservable_reason = process_failure

3. trusted terminalが成立しないか
   YES → outcome = unobservable
         observed_skills = null
         unobservable_reason = lifecycle_failure

4. hook correlationが成功したか
   NO  → outcome = unobservable
         observed_skills = null
         unobservable_reason = hook_correlation

5. append deltaをJSONとしてparseできたか
   NO  → outcome = unobservable
         observed_skills = null
         unobservable_reason = hook_parse

6. Probeで確認したselectorでcanonical Skill actual readを信頼判定できるか
   NO  → outcome = unobservable
         observed_skills = null
         unobservable_reason = skill_read_observation

7. terminal = turn.failed かつ observed_skills = [] か
   YES → outcome = unobservable
         observed_skills = null
         unobservable_reason = lifecycle_failure

8. otherwise
   → final observed_skills を確定してSet-based scoringへ渡す
```

重要:

- hook correlation / parse / selectorが成立する前に `observed_skills = []` を確定しない。
- trusted `turn.completed` / `turn.failed` がある単なるnon-zero exitは `process_failure` に上書きしない。
- timeout / process failure / lifecycle failureでは途中Skill readが見えていてもfinal resultへ残さない。
- `turn.failed` + Skill readありはstep 8へ進み、観測済みSkill集合をrouting evidenceとしてscoreする。
- `turn.completed` + Skill read 0件はstep 8へ進み、`observed_skills = []`としてscoreする。

### 7.3 `observed_skills` invariant

```text
observable outcome → string[]
observable 0 Skill → []
unobservable → null
```

`[]` はhook observation全体が成立した上でcanonical Skill read 0件を確定した場合だけに使用する。

### 7.4 Set-based scoring

ordered decision pipelineのstep 8へ到達したobservable caseだけに適用する。

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
feature-plan expected時にfeature-plan以外のcanonical Skillが発火
```

`sibling_misroute`は「near-miss boundaryの対向Skillだけへきれいに誤routingした」場合だけを表す。

### 7.5 `unobservable_reason`

保存可能な値は以下だけ。

```text
timeout
process_failure
lifecycle_failure
hook_correlation
hook_parse
skill_read_observation
```

どのreasonを採用するかは7.2のordered decision pipelineだけで決める。

### 7.6 Host JSONL / child process

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

### 8.1 Deterministic eval logic

```text
scripts/evals/skill-trigger-evals.ts
```

責務:

- constants / types
- minimal dataset filesystem discovery / YAML read
- schema / invariant validation
- owner / split / polarity derivation
- boundary integrity / sibling mapping
- normalization / fingerprint
- scoring
- summary
- run-level observability判定
- comparison

filesystem readを含むため厳密な意味でのpure moduleとは呼ばない。とはいえHost / child process / hook / Git操作は持たせない。

plain function / plain objectで実装し、dataset loader / scorer / comparisonを別fileへ分割しない。

### 8.2 Side-effect runner

```text
scripts/evals/run-skill-trigger-evals.ts
```

責務:

- CLI
- Evaluator / Target preflight
- SHA取得
- realpath containment / common-dir / alternates確認
- canonical SKILL.md existence / readability確認
- `codex --version`
- `codex exec`
- timeout / process lifecycle
- stdout JSONL parse
- hook snapshot / delta
- actual Skill read extraction
- routing observability確定
- deterministic scorer呼び出し
- output serialization

HostAdapter/provider interfaceは作らない。Target clone/trust/cleanupもrunnerへ入れない。

### 8.3 Test

```text
tests/repository-contract/skill-trigger-evals.test.ts
```

Host Runtimeを起動せず、deterministic logic + small helperだけをtestする。

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
- live eval中は同じTargetを他Codex process/sessionと共有しない。
- timeoutは120000ms。
- `codex --version`はlive run開始時に1回。失敗ならrun開始せずexit 1。
- modelを確実に観測できなければ `unreported`。

---

## 11. Result contract

### 11.1 Case result

observable例:

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

unobservable例:

```json
{
  "id": "feature-plan-validation-002",
  "owner_skill": "feature-plan",
  "split": "validation",
  "boundary": "feature-plan-vs-direct-implementation",
  "expected_skill": null,
  "observed_skills": null,
  "outcome": "unobservable",
  "unobservable_reason": "timeout"
}
```

### 11.2 Top-level result

`--compare`なしの通常runでは `comparison` fieldを出力しない。

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

### 12.1 Preconditions

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

### 12.2 Comparison JSON contract

`--compare`ありの場合だけ、current runのtop-level `provenance` / `cases` / `summary` に追加の `comparison` objectを保存する。

`--compare`なしの場合は `comparison: null` や空objectを出さず、field自体をomitする。

最小schemaを以下で固定する。

```json
{
  "comparison": {
    "baseline_evaluator_git_sha": "...",
    "baseline_routing_source_git_sha": "...",
    "baseline_codex_version": "...",
    "codex_version_match": true,
    "counts": {
      "unchanged_pass": 0,
      "fixed": 0,
      "regressed": 0,
      "unchanged_failure": 0,
      "newly_unobservable": 0,
      "recovered_observable": 0,
      "unchanged_unobservable": 0
    },
    "cases": [
      {
        "id": "code-review-train-001",
        "status": "fixed",
        "baseline_outcome": "false_negative",
        "current_outcome": "pass"
      }
    ]
  }
}
```

`comparison.cases` はcase ID辞書順とする。

comparison caseへ以下は重複保存しない。

```text
query
expected_skill
observed_skills
owner_skill
boundary
split
```

それらはcurrent result / baseline result側のcaseを正本とする。

### 12.3 Status

```text
unchanged_pass
fixed
regressed
unchanged_failure
newly_unobservable
recovered_observable
unchanged_unobservable
```

transition:

```text
pass → pass                         = unchanged_pass
observable failure → pass           = fixed
pass → observable failure           = regressed
observable failure → failure        = unchanged_failure
observable → unobservable           = newly_unobservable
unobservable → observable           = recovered_observable
unobservable → unobservable         = unchanged_unobservable
```

observable failureは以下。

```text
false_negative
sibling_misroute
unexpected_trigger
```

failure category間の変化は `unchanged_failure`。weighted score / rankingは作らない。

`recovered_observable`はrouting改善を意味しない。

### 12.4 Evaluator semantics差

Evaluator semanticsが変わった場合、comparisonはdiagnosticとして実行できるがdescription-only improvementとは解釈しない。対象は以下。

```text
Skill read extraction
observability判定
scoring
outcome classification
comparison transition
observed_skills contract
run-level observability contract
```

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

### 13.1 train / validation

selected cases完走 + output保存 + 1件以上observableでsuccess。

### 13.2 canonical all

8 `(boundary, expected_skill)` sideすべてに最低1 observable caseが必要。routing outcomeがfailureでもobservableならcoverage成立。

### 13.3 canonical runの「1回」契約

PR2で採用するcanonical baselineは、**有効なcanonical `all` run 1回**とする。

禁止:

```text
case単位retry
routing failureを良く見せるための再実行
unobservable caseだけの引き直し
同じEvaluator/environment条件で複数all runを実行して都合の良い結果だけ採用
```

ただし、実行後に以下のような明確なEvaluator / environment defectが判明した場合は、そのrun全体をcanonical baselineとして無効化できる。

```text
Skill read selector実装バグ
hook parser / correlation実装バグ
routing observation判定実装バグ
Target preparation / trust / hook environmentの明確な不備
```

無効化した場合:

1. 無効化理由をimplementation Run Artifactへ記録する。
2. evaluator defectなら修正してsource implementationをcommitする。
3. 新しい `evaluator_git_sha` を確定する。
4. environment defectならTarget/trust/hook状態を正常化する。
5. Observation Probe / deterministic validationを再確認する。
6. canonical `all`を最初から1回実行する。

無効化したrunを有効baselineと比較・採用しない。

runnerへretry / rerun managerは実装しない。これはcanonical実行手順の運用契約である。

### 13.4 exit 1

```text
dataset / CLI / preflight failure
TargetとEvaluatorが同一root/common-dir
Evaluator / Targetのrealpathが相互containment
Target dirty（tracked / staged / non-ignored untracked）
TargetにTrigger Eval datasetあり
Targetで6 canonical SKILL.md pathの存在/readability不足
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

run-level observability条件を満たさない場合も、可能ならresultを書いてからexit 1する。

---

## 14. Deterministic validation / tests

### 14.1 Dataset validator

- 6 Skill / 12 files。
- YAML / schema_version / exact fields。
- ID unique / owner split整合。
- owner / split / polarity derivationが定義どおり。
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
positive/negative derivation
required side欠落
25件以上でもcontract validならPASS
```

Observation pipeline / scoring:

```text
timeout → unobservable/timeout/null
spawn failure / signal / no-terminal non-zero → process_failure/null
trusted terminalなし → lifecycle_failure/null
hook correlation failure → hook_correlation/null
hook parse failure → hook_parse/null
selector unreliable → skill_read_observation/null
turn.failed + hook observation正常 + Skill 0 → lifecycle_failure/null
turn.failed + hook observation正常 + Skillあり → score
turn.completed + hook observation正常 + Skill 0 → []でscore
turn.completed + hook observation正常 + Skillあり → score
hook correlation failure時にSkill 0扱いしない
hook parse failure時にSkill 0扱いしない
trusted terminal + non-zeroだけではprocess_failureにしない
unobservableでarray禁止
observableでnull禁止

expected null + [] → pass
expected null + any Skill → unexpected_trigger
expected Skill + [] → false_negative
expected Skill + [expected] → pass
expected Skill + [boundary sibling]のみ → sibling_misroute
expected Skill + [non-sibling]のみ → unexpected_trigger
expected Skill + [sibling, extra] → unexpected_trigger
expected Skill + [expected, extra] → unexpected_trigger
feature-plan expected + [feature-plan] → pass
feature-plan expected + [feature-plan以外のcanonical Skill] → unexpected_trigger
feature-plan expected + [feature-plan, extra] → unexpected_trigger
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

Comparison:

```text
7 transition全部
fingerprint mismatch
case ID mismatch
Codex version match / mismatch
comparison JSON counts
comparison.cases stable sort
--compareなしではcomparison field omit
```

Runner helper:

```text
Target dirty / dataset present / common-dir shared / alternates non-empty
Evaluator root == Target root → FAIL
Target is descendant of Evaluator → FAIL
Evaluator is descendant of Target → FAIL
separate sibling/outside realpaths → containment理由ではFAILしない
6 known SKILL.md存在/readability不足 → FAIL
6 known SKILL.mdが揃う → frontmatter/Host discovery模倣なしでpreflight継続
Target clean statusは通常のGit status判定だけ
routing_source_git_sha = Target HEAD
evaluator_git_sha = Evaluator HEAD
Evaluator source consistency
```

canonical rerun運用のためのretry manager unit testは作らない。
trust stateのunit test/mock frameworkも作らない。

### 14.3 CI

`pnpm run verify`へ追加するのはdeterministic validateだけ。live eval / Probe / trust確認はCI gateにしない。

---

## 15. Source commit / canonical baseline順序

1. latest main / divergence確認。
2. incoming diff確認・必要ならmain取り込み。
3. current descriptionsを記録しPR2変更禁止を確認。
4. implementation Run開始。
5. remoteからindependent current-main TargetをEvaluatorと相互containmentしないpathへ1回clone。
6. 通常手順でproject trust / hook trust。
7. Targetを評価専用とし、他Codex sessionから使用しない。
8. runner実装前にmanual Observation Probeを実施。
9. Probeでは `codex exec` を直接実行し、normal/fallback hook JSONLを直接確認する。
10. Probeで確認したactual tool/input shapeをRun Artifactへ記録する。
11. Probe失敗時はtrust/config/hooksを先に切り分ける。
12. trust成立後もProbe不成立ならblocker。
13. 4 boundaryをrouting SSOTと照合。
14. 24 cases / 12 YAML作成。
15. 全case manual review。
16. deterministic eval logic / runner / tests / package実装。
17. deterministic/repository validation。
18. source implementation commit。active Run Artifactは含めない。
19. `evaluator_git_sha`確定。
20. baseline直前にlatest main再取得。
21. routing/observation差分確認。
22. 同じTargetをfetchし `routing_source_git_sha` へdetached checkout。
23. relevant changeならtrust確認 / manual Probe再実行 / evaluator再validate。
24. Target preflight。
25. Evaluator source clean確認。
26. canonical `all`を最初から最後まで1回実行。
27. baseline JSON保存。
28. 8 side observability確認。
29. unobservableの`observed_skills = null`確認。
30. routing failureを見てもdescription変更・case retry・引き直しをしない。
31. Evaluator/environment defectが判明した場合のみ、当該run全体を無効化し13.3の手順で新しいcanonical runを行う。
32. 有効なcanonical baselineをevaluation/reportから参照。
33. Run Artifact sanitization。
34. final scope diff。
35. baseline / standard Run Artifactを後続commit。
36. Target cleanup。

baseline artifact自身を`evaluator_git_sha` commitへ自己参照させない。

---

## 16. Canonical commands

Validate:

```bash
pnpm run eval:skills:trigger:validate
```

Target preparation:

```bash
git clone --no-tags --single-branch --branch main <REMOTE_REPOSITORY_URL> <target-root>
```

`<target-root>`はEvaluator rootの内部にも、その親にも置かない。

Manual Observation Probe:

```text
current Codexの通常手順でTargetをtrust
↓
Targetを他Codex sessionから使用しない状態にする
↓
codex exec --json --ephemeral --sandbox read-only -C <target-root> -
↓
positive / negative controlを個別実行
↓
<target-root>/.codex/logs/hooks-*.jsonl
または
<target-root>/.artifacts/codex-hooks/hooks-*.jsonl
を直接確認
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
- Evaluator / Target realpathの相互containmentなし。
- Targetは他Codex sessionと共有していない。
- 6 known canonical `SKILL.md` が存在/readableで、preflightがHost discoveryを再実装していない。
- normal Git statusでTarget clean。
- common-dir非共有 / alternatesなし。
- prompt metadata leakageなし。
- evaluator/routing SHA一致確認。
- fingerprint provenance。
- ordered observation pipeline。
- hook failureをSkill read 0件と誤認しない。
- `[]` / `null` invariant。
- clean sibling-onlyだけが `sibling_misroute`。
- non-sibling / multiple triggerは `unexpected_trigger`。
- `--compare`なしbaseline JSONにcomparison fieldなし。
- comparison JSON contract。
- stable sort。
- 8 boundary side observable。
- 有効なcanonical allを1回だけ採用し、routing結果改善目的のretryをしていない。

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
Probe専用committed script / Probe framework
Host discovery emulator / frontmatter validatorの重複実装
canonical rerun manager
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
- manual Probe成立。
- 24 cases manual review完了。
- answer-key-free Targetでcanonical baseline取得。
- Evaluator / Target path containmentなし。
- 8 sideすべてobservable。
- hook observationが成立する前にSkill read 0件を確定していない。
- `sibling_misroute`と`unexpected_trigger`をnear-miss boundaryに沿って正しく区別できる。
- `unobservable_reason`がordered decision pipelineどおり一意に分類できる。
- evaluator/routing provenanceを特定可能。
- comparison JSON / transition contract成立。
- 有効なcanonical baselineは1 runだけで、結果改善目的のretryなし。
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
- polarityは `expected_skill === owner_skill` のみpositive、それ以外はnegative。
- `sibling_misroute`はnear-miss boundaryの対向Skillだけへの単独誤routingを意味する。
- non-sibling / multi-triggerを`sibling_misroute`へ丸めない。
- answer-key isolationはRepository/Git contextの汚染防止でありsecurity sandboxではない。
- Evaluator / TargetはGitだけでなくdirectory realpathでも相互containmentさせない。
- project/hook trustはenvironment prerequisiteでrunner責務ではない。
- Observation Probeはrunner実装前のmanual technical checkであり、Probe frameworkを作らない。
- Probe / live eval中は評価用Targetを他Codex sessionと共有しない。
- `observed_skills = []` はhook observation成立後の0 Skill確定、`null`は最終集合確定不能。
- `unobservable_reason`はpriority tableではなくordered decision pipelineだけで決める。
- `skill-trigger-evals.ts`はdeterministic eval logic + minimal dataset readsに留め、pure性のためだけにfileを増やさない。
- 6 Skill preflightはknown `SKILL.md`存在/readabilityだけに留め、Host discoveryを模倣しない。
- Target clean判定は通常のGit statusへ寄せ、hook-log専用allowlistを作らない。
- canonical baselineは有効run 1回だけを採用し、defectで無効化したrunだけ全体再実行を許す。
- runnerへretry / rerun managerを追加しない。
- `--compare`なしではcomparison fieldをomitする。
- read-only sandbox、no retry、sequentialを維持する。
- PR3のTarget作成問題をPR2で一般化しない。
- Evaluator semantics変更時のcomparisonをdescription-only effectと断定しない。
- ここから新しい評価frameworkを足さない。