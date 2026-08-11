# GPT-5.6 Luna Subagent Orchestration・並列実装・品質ゲート統合計画

## 0. このPlanと現在Branchの位置づけ

この文書は、Scenario Shop / `qa-training-store` のCodex実装運用を、**Parent Agentによるオーケストレーション + GPT-5.6 Luna subagentによる積極的な並列調査・bounded implementation・品質ゲート実行**へ移行するためのImplementation Planである。

現在の `docs/plan-luna-subagent-orchestration` Branchは、PR #16 `feat: 仕様SSOTとAgentic QA基盤を構築する` のMerge後の `main` を基点とした**Documentation-only Branch**である。

このBranchでは以下を行わない。

- `.codex/agents/*.toml` の変更
- `.codex/config.toml` の変更
- `AGENTS.md` / Harness / Scriptの実装変更
- Application Code / Test Codeの変更
- CI Workflowの変更
- Product Behaviorの変更
- GitHub Actionsの実装検証

このBranchで変更するのは本Planのみとする。

本Planの実装は、Implementation開始時点の最新 `main` から作成する**別のImplementation Branch**で行う。

---

## 1. Goal / Owner Decision

### 1.1 Goal

現在のCodex運用を、Parent Agentが調査・実装・検証を抱え込む方式から、以下の責務分離へ移行する。

```text
Parent Agent
  = requirement interpretation
  + planning
  + task decomposition
  + dependency management
  + validation-set decision
  + subagent orchestration
  + integration review
  + failure interpretation
  + repair decision
  + final completion decision

Subagents
  = bounded investigation
  + bounded implementation
  + bounded validation execution
  + failure investigation
```

Standard / Strict taskでは、subagentへ安全に委譲可能な独立作業をParent Agent自身が抱え込まず、**原則subagentへ委譲し、安全に並列実行できる場合は積極的に並列化する**。

ただしparallelism自体を目的にしない。特にwrite-heavy taskは、**Work Packageの独立性に加えてexecution workspace isolationまで実証できた場合だけparallelizeし、保証できなければserial executionへfail-closeする**。

### 1.2 Model / Reasoning Owner Decision

すべてのproject-scoped custom subagentを以下へ統一する。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

対象は最低限以下とする。

```text
code_researcher
implementation_researcher
test_investigator
implementation_worker
quality_gate_runner
```

さらに、custom roleを明示しないspawnが発生した場合にもLuna + maxを既定値とする。

### 1.3 Fixed Decisions

本Planでは以下を固定する。

1. `code_researcher` / `implementation_researcher` / `test_investigator` / `implementation_worker` を `gpt-5.6-luna` + `max` へ移行する。
2. 新規 `quality_gate_runner` を `gpt-5.6-luna` + `max` で追加する。
3. `.codex/config.toml` でもdefault subagent model / effortをLuna + maxへ固定する。
4. Standard / Strictではread-only investigationを積極的にparallelizeする。
5. writable implementationはWrite Parallel Capability Gateを通過した場合だけparallelizeする。
6. Capability GateがFAIL / UNKNOWNならwritable workerはserial executionとする。
7. Parent AgentがRequired Validation Setを確定し、`quality_gate_runner` はそれを削除せず実行する。
8. `quality_gate_runner` はSourceを修正しない。
9. final completion decisionはParent Agentだけが行う。
10. silent model fallback / silent reasoning-effort downgradeを行わない。
11. subagentがsubagentをspawnするrecursive delegationを禁止する。
12.既存Failure Taxonomyを唯一のFailure Category SSOTとし、新しい独自taxonomyを作らない。

### 1.4 `max`の位置づけ

GPT-5.6は `max` reasoning effortを利用可能である。

本RepositoryではOwner Decisionとして全subagentを `max` に固定する。これは一般的な推奨値ではなく、品質優先のRepository policyである。

実Runでは取得可能な範囲で以下を記録する。

- subagent起動数
- parallel execution数
- phaseごとのwall-clock傾向
- Repair Loop回数
- 同一Failure再試行回数
- quality gate初回PASS率
- scope violation件数
- unexpected Source mutation件数
- token / usage / credit情報
- 1 taskあたりのsubagent count

自動的なmodel変更・effort downgradeは導入しない。

---

## 2. Current Baseline

### 2.1 PR #16 Merge後のBaseline

PR #16はMerge済みであり、Current `main` には少なくとも以下が存在する。

- Specification SSOT
- BR / AC validation
- Agentic Exploratory QA
- QA artifact contract
- `pnpm run verify`拡張
- 品質ゲート完了契約
- Runtime / Contract test分離
- Run Artifact / Evidence運用
- bounded Repair Loop
- subagent observation / collection contract
- change-scope enforcement
- Failure Taxonomy SSOT
- working-tree snapshot / comparison基盤

Implementation開始時にはその時点の最新 `main` へ再Baselineし、Open PRとの競合を確認する。

### 2.2 Current Custom Agents

Current Repositoryには以下が存在する。

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
```

Current baselineではいずれも `gpt-5.4-mini` / `medium` を利用している。

| Agent | Current responsibility | Source write |
| --- | --- | --- |
| `code_researcher` | Code / dependency / impact investigation | No |
| `implementation_researcher` | Change surface / implementation approach investigation | No |
| `test_investigator` | Tests / CI / failure / missing coverage investigation | No |
| `implementation_worker` | Parent確定scopeの限定実装 | Yes |

### 2.3 Current Scope Enforcement Constraint

Current `codex-task` / change-scope contractは、Codex実行後にRepository working tree全体からchanged filesを収集し、allowed scopeと比較する。

したがって同一working treeで複数writable workerを同時実行すると、Worker Aのscope checkからWorker Bのin-flight変更が見える可能性がある。

以下を固定する。

```text
disjoint write set
≠
parallel write capability proven
```

parallel writeには、disjoint write setだけでなく**worker単位のworkspace isolationとchanged-file attributionの実証**が必要である。

### 2.4 Current Failure Taxonomy SSOT

Current Repositoryでは `spec/failure-taxonomy.json` と `docs/reference/failure-taxonomy.md` がFailure Categoryの正本である。

既存category例:

```text
instruction_gap
scope_creep
missing_context
missing_validation
unsafe_action_blocked
bad_subagent_delegation
flaky_or_env_issue
review_gap
repair_loop_stalled
artifact_contract_gap
```

本Planではこのtaxonomyを拡張・置換しない。

`CHANGE_CAUSED` / `BASELINE` / `ENVIRONMENT` のような別体系をFailure Categoryとして導入しない。

### 2.5 Current Source Integrity Building Blocks

PR #16で導入されたworking-tree snapshot基盤は、Source差分について以下を扱える。

- added / untracked
- modified
- deleted
- rename / copyをold path + new pathとして表現
- file content hash
- Git HEAD SHA変化

既知のgenerated output / artifactsをSource comparison対象から除外する仕組みも存在する。

本PlanではSource Integrity用の独自frameworkを新設せず、既存semanticsを再利用する。

### 2.6 Current Run Artifact Behavior

Current harnessはwrapper / hook / collectorにより `run.json`、report、subagent evidence等をmachine-generated artifactとして更新できる。

したがってownershipは以下とする。

```text
Model-authored durable decision content
  → Parent Agent only

Trusted harness / hook / collector generated artifact
  → Machine-generated update allowed
```

---

## 3. Target Architecture

### 3.1 Standard / Strict Execution Flow

```text
Parent minimal orientation
  ↓
Parallel read-only investigation
  ├─ code_researcher
  ├─ implementation_researcher
  └─ test_investigator
  ↓ wait / join / evidence / close
Parent synthesis
  ├─ implementation plan
  ├─ dependency graph
  ├─ Work Packages
  ├─ read/write sets
  └─ Local Required Validation Set
  ↓
Write Parallel Capability Gate
  ├─ PASS
  │    → disjoint implementation_worker(s) parallel
  └─ FAIL / UNKNOWN
       → implementation_worker(s) serial
  ↓ join / evidence / close
Parent integration review
  ↓
quality_gate_runner
  ├─ execute Parent-defined Local Required Validation Set
  ├─ optional diagnostics
  ├─ before/after Source Integrity check
  └─ structured result
  ↓
PASS
  ↓
Parent local completion review
  ↓
External Completion Checks when applicable
  ├─ Required GitHub Actions
  ├─ CI-only Native / platform validation
  └─ other remote checks
  ↓
Parent final completion decision
```

Failure時:

```text
Local gate or External Check FAIL / BLOCKED
  ↓
Parallel read-only failure investigation
  ├─ test_investigator
  └─ code_researcher
  ↓ join / close
Parent causal relation judgement
  ↓
Parent maps evidence to existing Failure Taxonomy when needed
  ↓
Repair plan
  ↓
implementation_worker(s)
  ↓
Parent integration review
  ↓
quality_gate_runner local revalidation
  ↓
External Checks rerun / recheck when applicable
```

### 3.2 Parent Agent Responsibility

Parent Agentは以下を担当する。

- User intent / requirement interpretation
- Current repository state確認
- workflow level決定
- scope決定
- Plan / Task decomposition
- dependency graph
- read set / write set
- Work Package定義
- Write Parallel Capability Gate判定
- Local Required Validation Set確定
- External Completion Checkの特定
- subagent dispatch
- subagent lifecycle管理
- subagent result synthesis
- cross-worker consistency review
- causal relation judgement
- existing Failure Taxonomyへの最終classification
- Repair Loop遷移判断
- model-authored durable Run Artifact更新
- final completion decision

Parent Agentが主要実装を直接行うのは以下に限定する。

- Lightweight task
- 分割コストが明らかに高い極小修正
- subagentへ安全にscopeを渡せないintegration work
- worker完了後のごく小さいintegration fix

Standard / StrictでParentが主要実装を直接行った場合は理由をRun Artifactへ記録する。

---

## 4. Agent Model Contract

### 4.1 Explicit Custom Agent Pinning

以下すべてのproject-scoped custom agentで明示する。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

対象:

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
.codex/agents/quality_gate_runner.toml
```

### 4.2 Project Default

`.codex/config.toml` ではCurrent official keyを利用する。

```toml
[agents]
enabled = true
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "max"
max_concurrent_threads_per_session = 6
```

Custom role側でも明示pinを残す。

理由:

- role単位のintentを明確にする
- accidental default driftを防ぐ
- `scripts/verify` でcontract化する
- future config changeの影響を受けにくくする

### 4.3 Custom Agent Allowlist

Standard / Strictで通常使用するsubagentは、原則以下のproject-scoped custom roleへ限定する。

```text
code_researcher
implementation_researcher
test_investigator
implementation_worker
quality_gate_runner
```

Codexが提供するbuilt-in / generic roleは、**Luna + maxを確実に継承することとRepository contractを満たすことをWave 0で実証し、明示allowlistへ追加した場合だけ使用可能**とする。

実証できないbuilt-in / generic roleを「便利だから」という理由でStandard / Strictからspawnしない。

Custom roleで代替可能ならCustom roleを優先する。

### 4.4 Override Policy

Parent / task-specific workflowが以下を勝手に行わない。

- spawn時に別modelを指定
- spawn時にmax以外のeffortを指定
- agent TOMLからmodel / effort pinを削除

例外:

- Userが具体的なmodel / effort変更を明示
- Luna利用不能でUserがfallbackを明示承認
- repository-wide migrationとして別途承認

Luna利用不能時はsilent fallbackしない。

### 4.5 Runtime Evidenceの限界

Modelとreasoning effortのEvidenceを分ける。

```text
Model
  - TOML / config invariantでLunaを検証
  - runtimeで観測可能ならactual modelも記録

Reasoning effort
  - TOML / config invariantでmaxを検証
  - Current CLIがmax configを受理してspawn成功することを確認
  - runtimeで直接観測可能なら追加Evidence化
  - 観測不能なら「runtime maxを直接観測済み」とは記録しない
```

必要なら既存subagent evidence schemaへconfiguration evidenceを追加するが、観測できない値を推測でruntime evidence扱いしない。

---

## 5. Child Recursion Prevention

### 5.1 Target Hierarchy

許可:

```text
Parent
  ├─ Child A
  ├─ Child B
  └─ Child C
```

禁止:

```text
Parent
  └─ Child
       └─ Grandchild
```

### 5.2 Enforcement Priority

Parent project configではsubagent orchestrationを有効にする。

```toml
[agents]
enabled = true

[features]
multi_agent = true
hooks = true
```

各child custom agentではWave 0で、agent-file configuration layerから以下が有効かを実Runで確認する。

第一選択:

```toml
[agents]
enabled = false
```

これによりchild session自身のagent delegationを止められるなら、これをprimary enforcementとする。

第二防御としてCurrent CLIで有効なら以下も利用してよい。

```toml
[features]
multi_agent = false
```

### 5.3 Fallback

agent-file overrideでtool-level preventionを保証できない場合のみ、以下を検討する。

1. developer instructionsでrecursive spawn禁止
2. Current hook inputでchild invocationを安全に識別できるか検証
3. PreToolUse hookでrecursive spawnをblock可能なら最小実装
4. `scripts/verify` contract
5. negative real-run test

Hookは第一選択にしない。

**instruction-onlyを唯一の安全境界にも、hookだけを唯一の安全境界にも置かない。**

---

## 6. Agent Responsibilities

### 6.1 `code_researcher`

目的:

- related code / dependency / impact surface調査
- canonical source確認
- hidden coupling発見
- failure時のcausal relation evidence収集

契約:

- read-only
- Source編集禁止
- implementation decisionを勝手に確定しない
- additional subagent spawn禁止

出力:

- inspected paths
- findings
- dependency / impact notes
- evidence
- unresolved questions

### 6.2 `implementation_researcher`

目的:

- requested changeに必要な変更箇所特定
- safe change surface整理
- Work Package候補
- read/write set候補
- validation candidate整理

契約:

- read-only
- Source編集禁止
- final scope / designを勝手に確定しない
- additional subagent spawn禁止

### 6.3 `test_investigator`

目的:

- existing tests / CI / contract確認
- Local Required Validation Set候補
- External Completion Check候補
- missing coverage確認
- failure時のfirst abnormal event / downstream failure分離

契約:

- read-only
- Test Code修正禁止
- flaky / baseline / environmentをEvidenceなしで断定しない
- final validation setを勝手に確定しない
- final Failure Taxonomy categoryを勝手に確定しない
- additional subagent spawn禁止

### 6.4 `implementation_worker`

目的:

- Parentが確定したWork Packageのみ実装
- minimal diff
- independent Acceptance Criteriaを満たす

契約:

- workspace-write
- Parent指定allowed scope外を編集しない
- file delete / rename / move禁止
- git mutation禁止
- unrelated refactor禁止
- ambiguityが出たらscopeを広げずParentへ返す
- model-authored `.codex/runs/**` 更新禁止
- additional subagent spawn禁止

Validation responsibility:

- 自分のWork Packageに直接関係する**focused validation**のみ実行してよい
- repository-wide `pnpm run verify` や高コストE2E / Native full suiteは、Parentから明示された場合を除きworker自身では繰り返さない
- full / required validationは`quality_gate_runner`へ委譲する

出力:

- changed files
- implementation summary
- decision points
- focused validation executed
- unverified items
- scope adherence
- unexpected mutation有無

### 6.5 `quality_gate_runner`

目的:

- Parent確定済みLocal Required Validation Setを実行
- validation結果をEvidence付きで返す
- first abnormal event / downstream failureを分離
- current changeとの因果関係候補を返す
- Source Integrityを確認する

Model:

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

Sandbox:

```toml
sandbox_mode = "workspace-write"
```

workspace-writeはbuild output / cache / Playwright artifacts等のために必要となり得る。

ただしSource Modificationを許可する意味ではない。

禁止:

- Application Code編集
- Test Code編集
- Specification / Documentation編集
- Sourceへのpatch / edit / write
- git mutation
- failureの自動修正
- Parent Required Validation Setの削除
- required validationの未実行をPASS扱い
- final Failure Taxonomy categoryの確定
- additional subagent spawn

---

## 7. Validation Responsibility Contract

### 7.1 Local Required Validation Set

最終決定者はParent Agentとする。

```text
Test Investigator
  ↓ validation candidates
Parent
  ↓ Local Required Validation Setを確定
Quality Gate Runner
  ↓ required setを実行
```

通常のcanonical local gate:

```bash
pnpm run verify
```

ただし `pnpm run verify` だけで全runtime validationが完結すると仮定しない。

変更scopeに応じて追加する例:

```text
Web behavior
→ pnpm run test:e2e:chromium

Accessibility
→ pnpm run test:a11y

Responsive / mobile web boundary
→ pnpm run test:e2e:mobile-boundary

Specification
→ pnpm run validate:spec
→ pnpm run build:spec

Agentic QA runtime preparation
→ pnpm run test:agentic-qa:preparation

Native
→ Current Native Runbook / local contractで実行可能なrequired checks
```

### 7.2 Quality Runner Rules

`quality_gate_runner` は以下を守る。

- Parentがrequiredとしたcommandを勝手に削除しない
- 実行不能ならBLOCKED
- upstream failureで後続が無意味なら `not_run_due_to_upstream_failure`
- additional diagnosticsは追加してよい
- diagnostic resultをRequired PASSの代替にしない
- Source Integrity failureをvalidation PASSより優先する

### 7.3 External Completion Checks

GitHub ActionsやCI-only platform validationはLocal Required Validation Setと分離する。

External Completion Checksの例:

- Phase 1 Required CI
- Native CI final verify
- GitHub-hosted platform build / runtime
- PR headに対するRequired Check

責務:

```text
Quality Gate Runner
  = local validation execution

Parent Agent
  = External Completion Checkの特定・確認・最終判定
```

External checkが未完了 / 未実行ならfinal completionをPASS扱いしない。

External check failure時はParentがログ / job / artifact Evidenceを取得し、read-only investigatorsへ原因調査を委譲する。

---

## 8. Source Integrity Contract

### 8.1 Principle

`quality_gate_runner` のvalidation-only性はinstructionだけで証明しない。

```text
Before Source Snapshot
  ↓
Required Local Validation
  ↓
After Source Snapshot
  ↓
Comparison
```

unexpected Source mutationがあればrunner statusはFAILとする。

### 8.2 Reuse Current Snapshot Semantics

PR #16で導入されたworking-tree snapshot / entry collection semanticsを再利用する。

最低限検出対象:

- tracked modification
- new tracked / untracked source file
- deletion
- rename
- copy
- content hash change
- Git HEAD change

rename / copyはold path / new pathの両方を評価できる形を維持する。

### 8.3 Generated Output Exclusion

validation中に生成される以下のような再生成可能outputはSource mutationと混同しない。

- `output/**`
- `.artifacts/**`
- `.codex/runs/**` のtrusted generated artifact
- build / test cache
- dependency cache

ただし「generated」と称してApplication / Test / Specification sourceを除外しない。

### 8.4 Implementation Rule

新しいsnapshot frameworkは作らない。

既存Agentic QA用CLIがmode / artifact contract上そのまま再利用できない場合は、underlying source-entry collection / comparison semanticsを小さく共通化するか、同じ既存helperを安全に利用する。

大型Source Integrity subsystemを新設しない。

---

## 9. Quality Gate Runner Output Contract

最低限以下をParentへ返す。

```text
Status
- PASS
- FAIL
- BLOCKED

Local Required Validation Set
- required commands
- executed / not executed

Executed
- command
- exit status
- relevant summary

Not Executed
- command
- reason
- upstream failure / environment blocker / not applicable

Failure Evidence
- first abnormal event
- downstream failures
- relevant logs / paths

Suspected Causal Relation
- current_change_related
- baseline_independent
- environment_or_flaky
- harness_or_contract
- unknown

Source Integrity
- before snapshot reference
- after snapshot reference
- source diff count
- Git HEAD changed: yes/no
- unexpected Source mutation: yes/no

Remaining
- unverified checks
- environment limitations

Recommendation
- local validation complete
- investigate
- repair
- human decision required
```

`Suspected Causal Relation` は**Failure Taxonomyではない**。

runnerはcausal evidenceを返すだけで、final Failure CategoryはParentがCurrent Failure Taxonomy SSOTから選ぶ。

---

## 10. Failure Taxonomy Integration

### 10.1 SSOT

Failure CategoryはCurrent Repositoryの以下を唯一のSSOTとする。

```text
spec/failure-taxonomy.json
docs/reference/failure-taxonomy.md
```

新しいcategory enumを本Planで追加しない。

### 10.2 Causal RelationとTaxonomyを分離する理由

次は異なる概念である。

```text
Causal Relation
  = 現在の変更と失敗の因果関係候補

Failure Taxonomy
  = Run failureを再発防止の観点で分類するRepository-wide category
```

たとえば `environment_or_flaky` というcausal relation候補が、そのまま必ず `flaky_or_env_issue` taxonomyになるとは限らない。

### 10.3 Final Classification

Parent Agentはinvestigator / runnerのEvidenceを統合した後、必要な場合のみCurrent Taxonomyからcategoryを選択する。

- taxonomy外categoryを作らない
- Evidenceなしclassificationをしない
- runnerの候補を無批判に採用しない
- evaluation.jsonの既存contractを維持する

---

## 11. Parallelization Contract

### 11.1 Read-only Investigation

Standard / Strictでは独立した調査観点が2つ以上ある場合、原則parallel spawnする。

典型:

```text
code_researcher
implementation_researcher
test_investigator
```

Target lifecycle:

```text
minimal Parent orientation
→ parallel spawn
→ wait/join
→ evidence collect
→ Parent decision
→ close finished agents
→ Parent synthesis
```

### 11.2 Read / Write Overlap Rule

read-only agentだからactive writerと無条件で並列化してよいわけではない。

implementation phase中のauxiliary investigationは以下のいずれかを満たす場合だけ並列化する。

- researcher read setとactive worker write setがdisjoint
- workerがjoin済み
- read対象がimmutable / committed baselineであることを保証できる

不明ならworker join後に調査する。

### 11.3 Write Parallel Capability Gate

writable workerをparallelizeする前に以下を確認する。

#### Gate A — Work Package Independence

- write set非重複
- shared schema / migration / lockfileを同時更新しない
- same generated outputを更新しない
- worker間の途中依存なし
- merge orderが不要、またはParentが明確に管理可能
- formatter / generatorが他worker scopeを変更しない

#### Gate B — Workspace Isolation

- 各workerが独立working root / isolated workspaceで実行されることを実Runで証明
- Worker AからWorker Bのin-flight source diffが見えない
- worker単位でchanged filesを帰属可能
- worker単位のscope validationが他worker変更を誤検知しない

Decision:

```text
Gate A PASS + Gate B PASS
→ parallel writable execution allowed

Gate A PASS + Gate B FAIL / UNKNOWN
→ serial writable execution

Gate A FAIL
→ serial writable execution
```

### 11.4 Isolation Realization Priority

1. Current Codexがsubagent単位の正式isolated workspaceを提供するなら利用
2. Current Repository harnessで安全にisolated execution rootを再利用可能なら利用
3. どちらも保証できないならparallel writeを導入しない

parallel writeのためだけに大型worktree manager / custom runnerを作らない。

Git worktreeを追加する必要が本当に出た場合はcleanup、Windows互換性、scope enforcementとの統合を別判断する。

### 11.5 Parallelism KPI

最大agent数をKPIにしない。

最適化対象:

- Parent context pollution低減
- independent workのwall-clock短縮
- evidence quality
- implementation / validation責務分離

---

## 12. Concurrency / Agent Lifecycle

### 12.1 Thread Limit

初期値:

```toml
max_concurrent_threads_per_session = 6
```

想定:

```text
Research phase
  3 read-only agents + spare capacity

Implementation phase
  isolated workspaceが実証できた場合のみ複数worker

Failure phase
  parallel investigators + repair worker
```

初期導入で8以上へ上げない。

### 12.2 Lifecycle

完了agentを開きっぱなしにしない。

```text
spawn
→ run
→ wait/join
→ evidence collect
→ Parent decision
→ close
```

Research agentをcloseしてからImplementationへ進み、Implementation workerをcloseしてからQuality Gateへ進む。

必要時のみresumeする。

### 12.3 Current Config Key Migration

Parent project configはCurrent official keyへ寄せる。

```toml
[features]
hooks = true
multi_agent = true
```

legacy migration:

```text
features.codex_hooks
→ features.hooks

agents.max_threads
→ agents.max_concurrent_threads_per_session
```

Current official referenceで確認できないkeyへ安全性を依存しない。

---

## 13. Run Artifact Ownership

### 13.1 Model-authored Durable Content

Modelが直接decision contentを書く場合、Parent Agentだけが行う。

```text
.codex/runs/<run_id>/PLAN.md
.codex/runs/<run_id>/TASKS.md
.codex/runs/<run_id>/REPORT.md
.codex/runs/<run_id>/evaluation.json
```

Worker / runnerはParent decisionの意味を直接書き換えない。

### 13.2 Trusted Machine-generated Updates

既存contractに従う以下は許可する。

- `codex-task` wrapper report / manifest
- hook observation
- subagent observation generation
- collectorによる`run.json` aggregation
- validation result aggregation

### 13.3 Parallel Conflict Prevention

Workerは `PLAN.md` / `TASKS.md` / `REPORT.md` / `evaluation.json` を直接編集しない。

machine-generated subagent evidenceはrunごと・subagentごとに一意pathを使用し、同一pathへのparallel writeを避ける。

---

## 14. Failure / Repair Loop

### 14.1 Failure Investigation

Local Quality GateまたはExternal Completion CheckがFAIL / BLOCKEDした場合、Parentは即座に修正へ飛ばない。

可能な範囲でparallel investigationする。

```text
test_investigator
  → first-failure / test / CI / contract analysis

code_researcher
  → diff / dependency / causal relation analysis
```

必要時だけ `implementation_researcher` を追加する。

### 14.2 Parent Causal Judgement

ParentがEvidenceを統合し、まずcausal relationを判断する。

```text
current_change_related
baseline_independent
environment_or_flaky
harness_or_contract
unknown
```

この時点では独自Failure Categoryを作らない。

### 14.3 Existing Taxonomy Classification

Run evaluation上categoryが必要な場合のみ、Current Failure Taxonomy SSOTからParentが選択する。

### 14.4 Repair

`current_change_related` またはcurrent validationを成立させるための修正が必要ならRepair Loopへ進む。

RepairでもWrite Parallel Capability Gateを適用する。

- isolation実証済みならdisjoint repair workerをparallelize可能
- 未実証ならserial repair

修正後:

```text
Parent integration review
→ quality_gate_runner local revalidation
→ External Checks再確認 when applicable
```

### 14.5 Bounded Retry

既存bounded Repair Loop思想を維持する。

最低限以下で無目的再試行を止める。

- 同一エラー2回連続
- 同じ工程3回失敗
- 新しいEvidenceなし
- 新しい仮説なし

停止後は追加investigationまたはhuman decisionへ戻る。

---

## 15. Governance / Approval / Rollback

### 15.1 L3 Change Recognition

Current `AGENTS.md` ではpermission / sandbox / approval / wrapper behavior等の変更はL3 governance対象である。

今回のImplementationは以下を含む可能性がある。

- child agent tool availability
- subagent sandbox / feature behavior
- hook enforcement
- wrapper / scope behavior

したがってImplementation Runは**Strict相当**として扱う。

### 15.2 Explicit Approval Gate

L3相当変更へ着手する前に、以下をRun Artifactへ記録する。

- User / Ownerの明示承認
- 変更するL3境界
- expected behavior
- rollback condition
- rollback procedure

本PlanのMerge自体はL3実装承認の代替にしない。

Implementation開始時に明示承認を確認する。

### 15.3 Rollback Plan

大型rollback systemは作らない。

基本rollback:

1. Implementation PRをmergeしない
2. L3 behaviorが不安定なら該当Implementation commitを人間側Git操作でrevertする
3. 旧 `.codex/config.toml` / agent TOML / hook / harness contractへ戻す
4. baseline verifyを再実行する
5. rollback理由をRun Artifactへ記録する

Agent自身に `git reset` / `git clean` / destructive rollbackを実行させない。

Rollback trigger例:

- child recursionを安全に止められない
- Luna / max spawnがCurrent CLIで安定しない
- source integrityが正しく判定できない
- scope enforcementが既存taskを誤検知する
- required validationが以前より弱くなる

---

## 16. Lightweight Exception

Lightweight taskでは以下のような明白な小変更についてsubagent省略を許可する。

- single file
- low risk
- no dependency impact
- no design ambiguity
- no cross-platform impact
- validationが単純

省略理由はRun Artifactへ記録する。

Lightweightを使って以下を回避しない。

- Standard / Strict相当の実装
- security / permission / sandbox変更
- public contract変更
- CI / build / Native基盤変更
- cross-cutting refactor

---

## 17. Capability Preflight

Implementation開始時に以下を確認する。

```bash
codex --version
```

### 17.1 Model / Config

- Current Codex CLIが `gpt-5.6-luna` を利用可能
- custom agent configがmodel / reasoning effortを受理
- `max`を指定したspawn成功
- default subagent model / effortが有効
- max concurrent threads keyが有効

### 17.2 Delegation

- Parent multi-agent tools利用可能
- child `[agents] enabled = false` がagent-file overrideとして有効か
- 必要ならchild `features.multi_agent = false` が有効か
- recursive spawn negative testを安全に実行可能か
- built-in / generic roleのmodel / effort inheritanceを観測可能か

### 17.3 Parallel Write

- worker workspace / cwd behavior
- in-flight diff visibility
- changed-file attribution
- scope validation independence

### 17.4 Evidence

- runtime model observability
- reasoning effort observability
- subagent lifecycle event observability
- token / usage information observability

### 17.5 Failure Policy

Luna / maxが利用不能ならsilent fallbackしない。

BLOCKERとして記録し、User判断へ戻す。

---

## 18. Planned File Changes

Implementation PRでは最新 `main` を再Baselineして必要なものだけ変更する。

### 18.1 Agent Definitions

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
.codex/agents/quality_gate_runner.toml  # NEW
```

### 18.2 Orchestration / Config

```text
.codex/config.toml
AGENTS.md
```

### 18.3 Harness / Documentation

```text
docs/reference/codex-implementation-harness.md
docs/reference/subagent-observation.md
docs/reference/run-artifacts.md
```

必要なら:

```text
docs/reference/change-scope-policy.md
```

### 18.4 Source Integrity

既存helper再利用を優先する。

必要な場合だけ以下を小さく変更する。

```text
scripts/agentic-qa/working-tree-snapshot.ts
scripts/agentic-qa/benchmark-revision.ts
```

Agentic QA固有contractを壊さない。

### 18.5 Hooks / Safety

child config overrideで十分ならhook変更はしない。

必要な場合だけ:

```text
.codex/hooks/pre_tool_use_policy.py
.codex/hooks/pre_tool_use_policy.ps1
.codex/hooks/observe.sh
.codex/hooks/observe.ps1
```

### 18.6 Validation Contract

```text
scripts/verify
scripts/verify.ps1
```

### 18.7 Schema / Tests

必要な場合だけ:

```text
.codex/templates/subagent-run.schema.json
relevant harness / contract tests
```

新しいtaxonomy / runner framework / orchestration platformは作らない。

---

## 19. `scripts/verify` Contract

### 19.1 Required Agent Files

```text
code_researcher.toml
implementation_researcher.toml
test_investigator.toml
implementation_worker.toml
quality_gate_runner.toml
```

### 19.2 All-agent Model Invariant

すべてのproject-scoped custom agentが以下を満たす。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

可能なら `.codex/agents/*.toml` 全体を走査してInvariant化する。

### 19.3 Parent Config Invariant

```text
agents.enabled = true
default_subagent_model = gpt-5.6-luna
default_subagent_reasoning_effort = max
max_concurrent_threads_per_session = 6
features.multi_agent = true
features.hooks = true
```

### 19.4 Child Recursion Invariant

Current CLIで有効な最強のconfiguration-level preventionを検証する。

第一候補:

```text
child agents.enabled = false
```

必要なら第二防御:

```text
child features.multi_agent = false
```

利用できない場合は代替enforcementとnegative contract testを必須とする。

### 19.5 Agent Allowlist Invariant

Standard / Strictのnormal flowでproject custom agentを優先し、未検証built-in / generic agentをspawnしないcontractを検証する。

### 19.6 Safety Invariant

以下を検証する。

- implementation worker scope restriction
- worker focused-validation boundary
- quality runner Source-edit禁止
- Source Integrity before / after contract
- A/M/D/untracked/rename/copy/head change detection semantics
- Parent-defined Local Required Validation Set preservation
- existing Failure Taxonomy SSOTの維持
- child recursion禁止
- model-authored Run Artifact parent ownership
- trusted machine-generated artifact exception
- parallel writable Capability Gate
- isolation未証明時serial fallback
- Local / External validation responsibility separation

Bash / PowerShell verify parityを維持する。

---

## 20. Implementation Waves

### Wave 0 — Rebaseline / Governance / Capability Discovery

Repository:

- latest `main`
- Open PR conflict
- Current custom agents
- Current `AGENTS.md`
- Current config
- Current verify scripts
- Current change-scope enforcement
- Current subagent observation schema
- Current Failure Taxonomy
- Current working-tree snapshot semantics
- Current Repair Loop
- Current `pnpm run verify`

Governance:

- workflow level = Strict
- L3境界確認
- explicit approval確認
- rollback plan記録

Codex runtime:

- Luna availability
- max config acceptance
- generic default inheritance
- custom child `agents.enabled = false`可否
- optional child `multi_agent = false`可否
- built-in / generic role inheritance
- runtime model / effort observability
- workspace / cwd behavior

Wave 0の最重要判断:

```text
1. Luna + max contract成立
2. Child recursion prevention成立
3. Write Parallel Capability Gateを判定可能
4. Existing Failure Taxonomyを維持可能
```

Product Codeは変更しない。

### Wave 1 — Model / Config Migration

- existing 4 agents → Luna + max
- add `quality_gate_runner`
- default subagent model / effort
- current concurrency key
- current hooks / multi-agent key
- stale / unsupported key整理
- child recursion config-level prevention
- project custom agent allowlist contract

Validation:

- TOML parse
- config load
- agent discovery
- custom role spawn smoke
- max config acceptance
- recursive spawn negative test

### Wave 2 — Orchestration Contract

`AGENTS.md` / implementation harnessへ反映する。

- Parent responsibility
- parallel read-only investigation
- Work Package decomposition
- read/write sets
- custom agent allowlist
- built-in / generic restriction
- agent lifecycle / close rule
- Write Parallel Capability Gate
- workspace isolation requirement
- serial fallback
- worker focused-validation boundary
- Local Required Validation Set
- External Completion Checks
- Failure Taxonomy SSOT preservation
- model-authored Run Artifact ownership
- trusted generated artifact exception
- bounded Repair Loop

### Wave 3 — Quality Runner / Source Integrity / Contract Validation

- `quality_gate_runner` contract
- Parent-defined validation set execution
- before / after Source Integrity
- reuse current working-tree entry semantics
- causal relation output
- no custom Failure Taxonomy
- scripts/verify / PowerShell parity
- relevant contract tests
- schema changes only if necessary
- hook changes only if config-level child recursion prevention is insufficient

### Wave 4 — Read-only Parallel Real Run

```text
Parent
  ↓
code_researcher + implementation_researcher + test_investigator
  ↓ parallel
wait / join
  ↓
evidence collect
  ↓
close
```

Acceptance:

- 2+ agents overlap
- Luna model evidence
- max configured evidence
- Source diff 0
- Parent synthesis成功
- completed thread close

### Wave 5 — Writable Capability Verification

安全なbounded taskでworkspace isolationを確認する。

Case A — Isolation PASS:

```text
Worker A → isolated workspace A
Worker B → isolated workspace B
```

確認:

- 相手のin-flight source diffを見ない
- changed files帰属可能
- scope check誤検知なし
- deterministic integration

PASSならparallel writable executionを有効化する。

Case B — Isolation FAIL / UNKNOWN:

```text
Worker A
→ join / Parent review
→ Worker B
→ join / Parent review
```

serial fallbackでPlan完了可能とする。

### Wave 6 — Quality Gate Runner Real Run

ParentがLocal Required Validation Setを確定してrunnerへ渡す。

確認:

- required setを削除しない
- focused worker validationとfull validationが不要重複しない
- required command実行
- before / after Source Integrity
- untracked / deleted / rename / copyも検知可能
- Source mutationなし
- structured result
- causal relationとFailure Taxonomyを混同しない

### Wave 7 — Failure / Repair Real Run

安全なfixture failureまたは既存contract test fixtureで以下を確認する。

```text
quality_gate_runner FAIL
→ parallel investigators
→ Parent causal judgement
→ existing Failure Taxonomy classification when needed
→ bounded repair worker
→ Parent review
→ quality_gate_runner PASS
```

Product defectを人工的に残したままmergeしない。

### Wave 8 — External / Final Validation

Local:

```text
repository harness verify
pnpm run verify
relevant contract tests
read-only parallel real run
writable capability decision evidence
quality_gate_runner real run
Source Integrity check
Run Artifact sanitizer
```

External:

- Required GitHub Actions
- applicable Phase 1 / Native final gates
- PR head Required Checks

未実行をPASS扱いしない。

---

## 21. Real-run Acceptance Criteria

### 21.1 Model / Config

- [ ] `code_researcher` = Luna / max
- [ ] `implementation_researcher` = Luna / max
- [ ] `test_investigator` = Luna / max
- [ ] `implementation_worker` = Luna / max
- [ ] `quality_gate_runner` = Luna / max
- [ ] generic default = Luna / max
- [ ] Current CLIがmax設定を受理してspawn成功
- [ ] runtime modelを取得可能なEvidenceでLuna確認
- [ ] effortをruntime直接観測できない場合、その限界を明記

### 21.2 Agent Selection

- [ ] Standard / Strict normal flowはproject custom agent allowlistを利用
- [ ] built-in / generic agentを使う場合はLuna/max inheritanceとcontractを事前実証
- [ ] 未検証built-in / generic agentを使用しない

### 21.3 Delegation / Lifecycle

- [ ] read-only agents 2+ parallel
- [ ] Research phase終了後close
- [ ] child recursive spawnがconfiguration-levelまたはfallback enforcementでblock
- [ ] Parentがresultsを統合して最終判断

### 21.4 Writable Capability

- [ ] Write Parallel Capability Gate実行
- [ ] workspace isolation可否をEvidence付き判定
- [ ] isolation PASSなら2+ disjoint worker parallel safety確認
- [ ] isolation FAIL / UNKNOWNならserial fallback確認
- [ ] worker scope attribution正しい
- [ ] workerはfocused validationだけ実行
- [ ] model-authored durable Run Artifactを編集しない

### 21.5 Quality Gate

- [ ] ParentがLocal Required Validation Setを確定
- [ ] runnerがrequired setを削除しない
- [ ] runnerがrequired validationを実行
- [ ] runnerがSourceを変更しない
- [ ] added / untracked / modified / deleted / rename / copy / HEAD changeをSource Integrityで扱う
- [ ] blocked / upstream failureをPASS扱いしない
- [ ] runnerのcausal relationとFailure Taxonomyを分離

### 21.6 Failure Taxonomy

- [ ] `spec/failure-taxonomy.json`をSSOT維持
- [ ] runnerが独自Failure Categoryを作らない
- [ ] Parentだけが必要時に既存taxonomyからfinal categoryを選択

### 21.7 Governance

- [ ] L3 explicit approval記録
- [ ] rollback plan記録
- [ ] destructive rollbackをagentが実行しない

### 21.8 Final

- [ ] subagent Evidence集約
- [ ] required local gates PASS
- [ ] required External Completion Checks PASS
- [ ] Run Artifact sanitizer PASS

---

## 22. Risks and Mitigations

### Risk 1 — `max`によるlatency / usage増加

Mitigation:

- Owner Decisionとしてmax固定
- read-heavy independent work parallelization
- proper task granularity
- wall-clock / retry / usage記録
- automatic downgradeなし

### Risk 2 — Unverified agentがLuna/max contractを逸脱

Mitigation:

- project custom agent explicit pin
- project default Luna + max
- custom agent allowlist
- built-in / generic roleは実証後のみallowlist追加
- silent fallback禁止

### Risk 3 — Parallel write conflict / scope誤検知

Mitigation:

- Work Package independence
- workspace isolation requirement
- changed-file attribution
- isolation未証明時serial fallback
- shared config / lockfile parallel edit禁止

### Risk 4 — Read / write race

Mitigation:

- active write setとresearch read set重複禁止
- overlap不明ならjoin後research
- immutable baseline利用

### Risk 5 — Quality runnerがSourceを変更

Mitigation:

- developer instructions
- validation-only prompt
- existing snapshot semantics再利用
- before / after comparison
- A/M/D/untracked/rename/copy/HEADを検知
- mutation時FAIL

### Risk 6 — Child recursion

Mitigation:

- child `agents.enabled = false`を第一選択
- optional `multi_agent = false`第二防御
-必要時のみPreToolUse enforcement
- instructions
- negative real-run test

### Risk 7 — Failure Taxonomy二重化

Mitigation:

- existing taxonomyを唯一のSSOT
- runnerはcausal relationだけ返す
- final classificationはParent
- taxonomy外category禁止

### Risk 8 — Local validationとRemote CIの混同

Mitigation:

- Local Required Validation Set = quality runner
- External Completion Checks = Parent
- remote pendingをPASS扱いしない

### Risk 9 — Validation重複でparallelization効果を相殺

Mitigation:

- workerはfocused validation
- full required validationはrunner
- same heavy suiteの無目的重複禁止

### Risk 10 — Unsupported / deprecated config

Mitigation:

- implementation時Current official docs再確認
- legacy alias migration
- undocumented keyへ依存しない
- config-load / spawn real test

### Risk 11 — L3 regression

Mitigation:

- Strict workflow
- explicit approval
- rollback plan
- implementation PRをmerge前に実Run検証

---

## 23. Non-goals

本Planでは以下を行わない。

- Parent Agent自体をLunaへ強制
- 独自LLM Runner
- Responses API wrapper
- Custom Session Manager
- 独自MCP orchestration layer
- Remote Sandbox platform
- Kubernetes / distributed worker infrastructure
- parallel writeのためだけの大型worktree manager
- unsafe same-working-tree parallel write
- writable workerの共有file同時編集
- quality runnerの自動修正
- quality runnerへのValidation Set選定丸投げ
-第二Failure Taxonomy
- unlimited Repair Loop
- silent model fallback
- automatic reasoning-effort downgrade
- Product feature変更
- current Agentic QA snapshot / Failure Taxonomyの不要な再設計

---

## 24. Definition of Done

### Model / Agent

- existing 4 custom agentsがLuna / max
- `quality_gate_runner`追加、Luna / max
- project defaultもLuna / max
- custom agent allowlist確立
- silent fallbackなし

### Orchestration

- Standard / Strictでparallel read-only researchを原則利用
- ParentがWork Package / Validation Set / integration / final judgmentを担当
- child recursionをconfiguration-level優先で防止
- completed agentをclose
- model-authored durable Run ArtifactはParent only
- trusted generated artifact update維持

### Writable Execution

- Write Parallel Capability Gate実装
- workspace isolation実証時のみparallel write
-未証明ならserial fallback
- serial fallbackでもPlan完了可能

### Validation

- worker focused validation boundary
- Parent Local Required Validation Set
- quality runner required set実行
- quality runner Source modificationなし
- existing source snapshot semantics再利用
- External Completion ChecksをParentが確認

### Failure Handling

- runnerはcausal relationだけ返す
- existing Failure Taxonomy SSOT維持
- final taxonomy classificationはParent
- failure時parallel investigation + bounded Repair Loop

### Governance

- Strict workflow
- L3 explicit approval
- rollback plan

### Harness

- Bash / PowerShell verify parity
- all-agent Luna / max invariant
- child recursion invariant
- custom agent allowlist invariant
- Source Integrity invariant
- Failure Taxonomy SSOT invariant
- Current config key migration

### Evidence

- actual Luna custom subagent spawn
- max config acceptance
- parallel read-only real run
- writable isolation capability decision
- quality runner real run
- source integrity negative test
- required local validation PASS
- required External Completion Checks PASS

---

## 25. Implementation Start Gate

Implementation開始前に以下を満たす。

- [ ] latest `main`取得
- [ ] PR #16後baseline再確認
- [ ] Current Open PR conflict確認
- [ ] Current official Codex docs再確認
- [ ] Luna / max availability確認
- [ ] Strict workflowとしてRun開始
- [ ] L3 explicit approval確認
- [ ] rollback plan記録
- [ ] current Failure Taxonomy確認
- [ ] current source snapshot semantics確認
- [ ] child recursion prevention検証方法決定
- [ ] Write Parallel Capability Gate検証方法決定
- [ ] Local / External validation責務決定
- [ ] latest `main` からImplementation Branch作成
- [ ] 本Planをprimary planning referenceとして使用

---

## 26. Official / Repository Reference Baseline

Implementation時にはCurrent versionを再確認する。

### OpenAI Official

- Codex Subagents documentation
- Codex Configuration Reference
- Codex Hooks documentation
- GPT-5.6 model guidance
- GPT-5.6 Luna model documentation

### Repository

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/agents/*.toml`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/subagent-observation.md`
- `docs/reference/change-scope-policy.md`
- `docs/reference/failure-taxonomy.md`
- `spec/failure-taxonomy.json`
- `scripts/codex-task.sh`
- `scripts/codex-task.ps1`
- `scripts/verify`
- `scripts/verify.ps1`
- `scripts/agentic-qa/working-tree-snapshot.ts`
- `scripts/agentic-qa/benchmark-revision.ts`

---

## 27. Final Implementation Principle

本Planの目的はagent数を増やすことではない。

```text
Parent Agent
  = 判断・分解・Validation Set決定・Failure interpretation・統合・責任

GPT-5.6 Luna Subagents / max
  = 調査・実装・検証のbounded execution

Parallel Read-only Work
  = independent investigationのwall-clock短縮

Write Parallel Capability Gate
  = workspace isolationまで証明できる場合だけparallel writeを許可

Quality Gate Runner
  = Parent指定Local Required Validation Setを変更せず実行

Existing Failure Taxonomy
  = Run failure categoryの唯一のSSOT

External Completion Checks
  = Parentがremote CI / platform resultを確認

Repair Loop
  = Evidence駆動で必要なときだけ再動員
```

subagentを使える箇所では積極的に使う。

同時に以下を守る。

- 安全に分離できないwriteを並列化しない
- 未検証built-in / generic agentを使わない
- childにrecursive delegationさせない
- workerにfull quality gateを無目的に重複実行させない
- validation runnerに修正させない
- runnerにValidation Set選定やfinal Failure Category判断を丸投げしない
- existing Failure Taxonomyを第二体系で上書きしない
- generated artifactとSource mutationを混同しない
- local validationとremote completion checkを混同しない
- 観測できないruntime事実を観測済みと扱わない
- Parent Agentの最終責任をsubagentへ委譲しない
