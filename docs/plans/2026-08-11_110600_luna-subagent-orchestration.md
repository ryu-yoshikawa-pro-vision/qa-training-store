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

本PlanはRepositoryの `PLANS.md` / `docs/plans/TEMPLATE.md` に合わせて、Goal / Current understanding / Assumptions / Non-goals / Impacted areas / Files to inspect / Change strategy / Validation plan / Risks / Open questions / Follow-up notesを明示する。

---

## 1. Goal

### 1.1 Goal

現在のCodex運用を、Parent Agentが調査・実装・検証を抱え込む方式から、次の責務分離へ移行する。

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
  + external completion check
  + final completion decision

Subagents
  = bounded investigation
  + bounded implementation
  + bounded validation execution
  + failure investigation
```

Standard / Strict taskでは、subagentへ安全に委譲可能な独立作業をParent Agent自身が抱え込まず、**原則subagentへ委譲し、安全に並列実行できる場合は積極的に並列化する**。

ただしparallelism自体を目的にしない。

特にwrite-heavy taskは、**Work Packageの独立性に加えてexecution workspace isolationまで実証できた場合だけparallelizeし、保証できなければserial executionへfail-closeする**。

### 1.2 Model / Reasoning Owner Decision

Repository-governed subagentはすべて以下へ統一する。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

最低限のproject-scoped custom agentは以下とする。

```text
code_researcher
implementation_researcher
test_investigator
implementation_worker
quality_gate_runner
```

`.codex/config.toml` のdefault subagent model / reasoning effortも同じ値へ固定し、future config driftや意図しないgeneric spawnに対するdefense-in-depthとする。

### 1.3 Agent Selection Owner Decision

Repository-governed taskでは、**Codex built-in / generic agentを通常実行に使用しない**。

Standard / Strictだけでなく、Lightweightでsubagentを起動する場合もproject-scoped custom agentを使用する。

対象外とするbuilt-in / generic roleの例:

```text
default
worker
explorer
```

新しい役割が必要になった場合は、built-in roleをその場で使うのではなく、必要性を確認したうえで `.codex/agents/<role>.toml` を追加し、Luna + max、sandbox、recursive delegation禁止、責務境界をRepository contractとして明示する。

Userが明示的に別model / roleを指定した場合だけ例外を検討する。

### 1.4 Fixed Decisions

本Planでは以下を固定する。

1. `code_researcher` / `implementation_researcher` / `test_investigator` / `implementation_worker` を `gpt-5.6-luna` + `max` へ移行する。
2. 新規 `quality_gate_runner` を `gpt-5.6-luna` + `max` で追加する。
3. `.codex/config.toml` のdefault subagent model / effortもLuna + maxへ固定する。
4. Repository-governed taskではbuilt-in / generic subagentを通常利用しない。
5. Standard / Strictではread-only investigationを積極的にparallelizeする。
6. writable implementationはWrite Parallel Capability Gateを通過した場合だけparallelizeする。
7. Capability GateがFAIL / UNKNOWNならwritable workerはserial executionとする。
8. Parent AgentがLocal Required Validation Setを確定し、`quality_gate_runner` はそれを削除せず実行する。
9. `quality_gate_runner` はSourceを修正しない。
10. External Completion ChecksはParent Agentが確認する。
11. final completion decisionはParent Agentだけが行う。
12. silent model fallback / silent reasoning-effort downgradeを行わない。
13. subagentがsubagentをspawnするrecursive delegationを禁止する。
14. 既存Failure Taxonomyを唯一のFailure Category SSOTとし、新しい独自taxonomyを作らない。
15. Source Integrity snapshotは「validation中にnet Source mutationが残っていないこと」を検証するものであり、「一度もSource writeが発生していないこと」の完全証明とは扱わない。

### 1.5 `max`の位置づけ

本RepositoryではOwner Decisionとして全subagentを `max` に固定する。

導入後の実Runでは取得可能な範囲で以下を記録する。

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

### 1.6 Definition of Done

#### Model / Agent

- [ ] existing 4 custom agentsが `gpt-5.6-luna` / `max`。
- [ ] `quality_gate_runner` が追加され `gpt-5.6-luna` / `max`。
- [ ] project defaultもLuna / max。
- [ ] Repository-governed taskではbuilt-in / generic subagentを使用しないcontractがある。
- [ ] silent fallbackがない。

#### Sandbox / Delegation

- [ ] `code_researcher` / `implementation_researcher` / `test_investigator` はconfig上 `read-only`。
- [ ] `implementation_worker` / `quality_gate_runner` はconfig上 `workspace-write`。
- [ ] read-only agentはruntime overrideでsandboxが広がってもbehavioral read-onlyを維持する。
- [ ] read-only agentの実Run Evidenceで `changed_files = []` を確認できる。
- [ ] child recursive spawnをconfiguration-level優先で防止する。
- [ ] completed agentをphase終了時にcloseする。

#### Writable Execution

- [ ] Write Parallel Capability Gateを実装する。
- [ ] workspace isolationが実証できた場合だけparallel writeを有効化する。
- [ ] isolation未証明ならserial fallbackする。
- [ ] serial fallbackでも本Planの完了条件を満たせる。

#### Validation

- [ ] workerはfocused validationだけを実行する。
- [ ] ParentがLocal Required Validation Setを確定する。
- [ ] `quality_gate_runner` がrequired setを変更せず実行する。
- [ ] quality runnerはSource editを行わないbehavioral contractを持つ。
- [ ] tool-level write protectionを利用可能ならquality runnerへ適用する。
- [ ] before / after snapshotでunexpected **net** Source mutationをfail-closeする。
- [ ] External Completion ChecksをParentが確認する。

#### Failure Handling

- [ ] runnerはcausal relation候補だけを返す。
- [ ] Existing Failure Taxonomy SSOTを維持する。
- [ ] final taxonomy classificationはParentが必要時のみ行う。
- [ ] failure時にparallel investigation + bounded Repair Loopへ遷移できる。

#### Governance / Harness

- [ ] Strict workflowとして実装する。
- [ ] L3 explicit approvalとrollback planを記録する。
- [ ] Bash / PowerShell verify parityを維持する。
- [ ] all-agent Luna / max invariantをmechanical gate化する。
- [ ] sandbox-mode invariantをmechanical gate化する。
- [ ] child recursion invariantを検証する。
- [ ] built-in / generic subagent禁止contractを検証する。
- [ ] Failure Taxonomy SSOT invariantを維持する。

#### Completion State

- [ ] `LOCAL_IMPLEMENTATION_COMPLETE` を機械的・運用的に判定できる。
- [ ] `MERGE_READY` をLocal完了とExternal Checks完了の両方から判定できる。
- [ ] External Check未実行 / pendingをPASS扱いしない。

---

## 2. Current understanding

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

Implementation開始時には、その時点の最新 `main` へ再Baselineし、Open PRとの競合を確認する。

### 2.2 Current Custom Agents

Current Repositoryには以下が存在する。

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
```

Current baselineではいずれも `gpt-5.4-mini` / `medium` を利用している。

| Agent | Current responsibility | Current sandbox intent | Source write |
| --- | --- | --- | --- |
| `code_researcher` | Code / dependency / impact investigation | read-only | No |
| `implementation_researcher` | Change surface / implementation approach investigation | read-only | No |
| `test_investigator` | Tests / CI / failure / missing coverage investigation | read-only | No |
| `implementation_worker` | Parent確定scopeの限定実装 | workspace-write | Yes |

### 2.3 Current Read-only Safety Contract

Current `AGENTS.md` では、read-only investigation agentについて、runtime / wrapper overrideでread-only sandboxが完全に保証できない場合でも編集・作成・削除を行わないbehavioral contractを持つ。

本Planでもこの既存契約を維持する。

したがってread-only safetyは次の二層とする。

```text
Configuration intent
  = sandbox_mode = "read-only"

Behavioral contract
  = runtime overrideで権限が広がってもSourceを変更しない
```

read-only real runではsubagent単位のEvidenceとして `changed_files = []` を確認する。

### 2.4 Current Scope Enforcement Constraint

Current `codex-task` / change-scope contractは、Codex実行後にRepository working tree全体からchanged filesを収集し、allowed scopeと比較する。

したがって同一working treeで複数writable workerを同時実行すると、Worker Aのscope checkからWorker Bのin-flight変更が見える可能性がある。

以下を固定する。

```text
disjoint write set
≠
parallel write capability proven
```

parallel writeにはdisjoint write setだけでなく、**worker単位のworkspace isolationとchanged-file attributionの実証**が必要である。

### 2.5 Current Failure Taxonomy SSOT

Current Repositoryでは以下がFailure Categoryの正本である。

```text
spec/failure-taxonomy.json
docs/reference/failure-taxonomy.md
```

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

### 2.6 Current Source Integrity Building Blocks

PR #16で導入されたworking-tree snapshot / entry collection semanticsは、少なくとも以下を扱える。

- added / untracked
- modified
- deleted
- rename / copyをold path + new pathとして表現
- file content hash
- Git HEAD SHA変化

既知のgenerated output / artifactsをSource comparison対象から除外する仕組みも存在する。

本PlanではSource Integrity用の独自frameworkを新設せず、既存semanticsを再利用する。

### 2.7 Source Integrityで証明できること / できないこと

Before / After snapshotで証明する対象は、**validationの開始前と終了後でunexpected additional Source diffが残っていないこと**である。

これは次を完全には証明しない。

```text
Sourceへ一度もwriteされていない
```

理論上、途中でSourceを書き換えて元に戻した場合はnet diffが残らない可能性がある。

したがってquality runnerのvalidation-only性は以下の多層防御で守る。

1. agent developer instructionsでSource edit禁止
2. tool-level write protectionをCurrent Codexで利用可能なら適用
3. ParentがLocal Required Validation Setを固定
4. Before / After snapshotでunexpected net Source mutationをfail-close
5. unexpected write Evidenceがあればnet diffがなくてもfailureとして扱う

### 2.8 Current Run Artifact Behavior

Current harnessはwrapper / hook / collectorにより `run.json`、report、subagent evidence等をmachine-generated artifactとして更新できる。

ownershipは以下とする。

```text
Model-authored durable decision content
  → Parent Agent only

Trusted harness / hook / collector generated artifact
  → Machine-generated update allowed
```

### 2.9 Current Plan Contract

Repositoryの `PLANS.md` / `docs/plans/TEMPLATE.md` は、保存するPlanに以下を明示することを要求している。

- Goal
- Current understanding
- Assumptions
- Non-goals
- Impacted areas
- Files to inspect
- Change strategy
- Validation plan
- Risks
- Open questions
- Follow-up notes

本Planはこの構造へ正規化する。

---

## 3. Assumptions

### 3.1 Assumptions allowed

以下はImplementation開始時に再確認するが、Plan全体を止めるBlocking Questionとはしない。

- Current Codex CLIにproject-scoped custom agentsが存在する。
- `gpt-5.6-luna` / `max` がCurrent Codex runtimeで利用可能である。
- project default subagent model / reasoning effortをCurrent config keyで設定できる。
- Current custom agent fileでsandbox intentを設定できる。
- Existing `scripts/verify` / `scripts/verify.ps1` を拡張して新contractを検証できる。
- Existing working-tree snapshot semanticsをSource Integrityへ再利用できる。
- Existing Failure Taxonomyは今回変更する必要がない。
- parallel writeが利用できなくてもserial fallbackで目的を達成できる。
- Remote CIはLocal validationとは別phaseで確認できる。

### 3.2 Assumption failure policy

上記の前提が崩れた場合でも、次の安全側fallbackを優先する。

```text
Luna / max unavailable
→ silent fallbackせずBLOCKED

child recursion configuration prevention unavailable
→ secondary configuration / minimal hook / behavioral contractを評価

workspace isolation unavailable
→ serial writable execution

runtime reasoning effort directly unobservable
→ configured evidenceとして扱い、runtime observedと偽らない

quality runner write-tool blocking unavailable
→ behavioral prohibition + net Source mutation detectionを維持し、制約をEvidenceへ明記
```

---

## 4. Non-goals

本Planでは以下を行わない。

- Parent Agent自体をLunaへ強制する。
- Repository-governed taskでbuilt-in / generic subagentを通常利用する。
- 独自LLM Runnerを構築する。
- Responses API wrapperを構築する。
- Custom Session Managerを構築する。
- 独自MCP orchestration layerを構築する。
- Remote Sandbox platformを構築する。
- Kubernetes / distributed worker infrastructureを構築する。
- parallel writeのためだけに大型worktree managerを構築する。
- unsafe same-working-tree parallel writeを許可する。
- writable workerへ共有fileの同時編集を許可する。
- quality runnerへ自動修正権限を与える。
- quality runnerへValidation Set選定を丸投げする。
- quality runnerへfinal Failure Taxonomy classificationを任せる。
-第二Failure Taxonomyを作る。
- unlimited Repair Loopを導入する。
- silent model fallbackを行う。
- automatic reasoning-effort downgradeを行う。
- Product featureを変更する。
- Current Agentic QA snapshot / Failure Taxonomyを不要に再設計する。
- net-diff snapshotだけで「一度もSource writeされていない」と主張する。
- Remote CI未完了をLocal PASSだけでMerge Ready扱いする。

---

## 5. Impacted areas

### 5.1 Agent Definitions

- existing read-only research agents
- existing `implementation_worker`
- new `quality_gate_runner`
- agent model / effort / sandbox / recursion settings

### 5.2 Parent Orchestration

- Standard / Strict subagent delegation policy
- built-in / generic agent禁止
- agent lifecycle
- Work Package decomposition
- read / write set management
- Write Parallel Capability Gate
- Local Required Validation Set
- External Completion Checks
- completion state model

### 5.3 Safety / Governance

- child recursion prevention
- read-only behavioral safety
- quality runner validation-only boundary
- Source Integrity
- L3 approval / rollback
- Run Artifact ownership

### 5.4 Harness / Evidence

- Bash / PowerShell verify parity
- subagent observation
- agent model / sandbox invariant
- changed-file Evidence
- Failure Taxonomy connection
- local / external completion Evidence

### 5.5 Application / Product

Application behaviorは変更しない。

Product Code / Product Testの変更は、本Planのruntime fixture確認に既存fixtureを安全に再利用できない場合でも、parallelismを証明するためだけには追加しない。

---

## 6. Files to inspect

Implementation開始時に最低限以下を最新 `main` で再確認する。

### 6.1 Agent / Config

```text
.codex/config.toml
.codex/requirements.toml
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
```

追加予定:

```text
.codex/agents/quality_gate_runner.toml
```

### 6.2 Repository Governance

```text
AGENTS.md
PLANS.md
CODE_REVIEW.md
docs/plans/TEMPLATE.md
```

### 6.3 Harness / Safety

```text
scripts/codex-task.sh
scripts/codex-task.ps1
scripts/verify
scripts/verify.ps1
.codex/hooks/pre_tool_use_policy.py
.codex/hooks/pre_tool_use_policy.ps1
.codex/hooks/observe.sh
.codex/hooks/observe.ps1
```

Hookはconfig-level enforcementで足りない場合だけ変更候補とする。

### 6.4 Evidence / Run Artifact

```text
docs/reference/codex-implementation-harness.md
docs/reference/subagent-observation.md
docs/reference/run-artifacts.md
docs/reference/change-scope-policy.md
docs/reference/failure-taxonomy.md
spec/failure-taxonomy.json
.codex/templates/subagent-run.schema.json
```

### 6.5 Existing Source Integrity

```text
scripts/agentic-qa/working-tree-snapshot.ts
scripts/agentic-qa/benchmark-revision.ts
```

必要な場合だけ小さく共通化し、Agentic QA固有contractを壊さない。

### 6.6 Quality Gate / CI

```text
package.json
.github/workflows/**
```

Remote Workflowは今回のAgent orchestrationのためだけに大規模変更しない。

---

## 7. Change strategy

### 7.1 Target Architecture

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
  ├─ before/after net Source Integrity check
  └─ structured result
  ↓
LOCAL_IMPLEMENTATION_COMPLETE
  ↓
External Completion Checks when applicable
  ├─ Required GitHub Actions
  ├─ CI-only Native / platform validation
  └─ other remote checks
  ↓
MERGE_READY
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

### 7.2 Parent Responsibility

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
- External Completion Check特定
- subagent dispatch
- subagent lifecycle管理
- subagent result synthesis
- cross-worker consistency review
- causal relation judgement
- existing Failure Taxonomyへの最終classification
- Repair Loop遷移判断
- model-authored durable Run Artifact更新
- `LOCAL_IMPLEMENTATION_COMPLETE` 判定
- `MERGE_READY` 判定
- final completion decision

Parent Agentが主要実装を直接行うのは以下に限定する。

- Lightweight task
- 分割コストが明らかに高い極小修正
- subagentへ安全にscopeを渡せないintegration work
- worker完了後のごく小さいintegration fix

Standard / StrictでParentが主要実装を直接行った場合は理由をRun Artifactへ記録する。

### 7.3 Agent Model / Allowlist Contract

すべてのproject-scoped custom agentへ明示する。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

Parent project config:

```toml
[agents]
enabled = true
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "max"
max_concurrent_threads_per_session = 6

[features]
multi_agent = true
hooks = true
```

Repository-governed taskで利用できるagent allowlist:

```text
code_researcher
implementation_researcher
test_investigator
implementation_worker
quality_gate_runner
```

built-in / generic subagentは通常実行禁止とする。

### 7.4 Sandbox Contract

Expected static sandbox intent:

| Agent | Expected sandbox |
| --- | --- |
| `code_researcher` | `read-only` |
| `implementation_researcher` | `read-only` |
| `test_investigator` | `read-only` |
| `implementation_worker` | `workspace-write` |
| `quality_gate_runner` | `workspace-write` |

read-only agentsではsandboxとbehavioral contractを両方維持する。

```text
sandbox read-only
+
Source edit / create / delete禁止
+
changed_files = [] Evidence
```

runtime overrideでsandboxが広がってもbehavioral read-only契約を解除しない。

### 7.5 Child Recursion Prevention

Target hierarchy:

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

Parentではmulti-agent toolsを有効にする。

各child custom agentではCurrent CLIで有効かをWave 0で確認し、第一選択として次を使用する。

```toml
[agents]
enabled = false
```

必要でCurrent CLIが有効なら第二防御として次も利用する。

```toml
[features]
multi_agent = false
```

configuration-level preventionで足りない場合だけ、minimal hook enforcementを評価する。

instruction-onlyまたはhook-onlyを唯一の安全境界にしない。

### 7.6 Read-only Agent Responsibilities

#### `code_researcher`

- related code / dependency / impact surface調査
- canonical source確認
- hidden coupling発見
- failure時のcausal relation evidence収集
- Source edit禁止
- additional subagent spawn禁止

#### `implementation_researcher`

- requested changeのsafe change surface整理
- Work Package候補
- read/write set候補
- validation candidate整理
- Source edit禁止
- final scope / designを勝手に確定しない
- additional subagent spawn禁止

#### `test_investigator`

- existing tests / CI / contract確認
- Local Required Validation Set候補
- External Completion Check候補
- missing coverage確認
- first abnormal event / downstream failure分離
- Test Code修正禁止
- final Failure Taxonomy categoryを勝手に確定しない
- additional subagent spawn禁止

### 7.7 `implementation_worker`

目的:

- Parentが確定したWork Packageのみ実装
- minimal diff
- independent Acceptance Criteriaを満たす

禁止:

- Parent指定allowed scope外の編集
- file delete / rename / move
- git mutation
- unrelated refactor
- model-authored `.codex/runs/**` 更新
- recursive delegation

Validation responsibility:

- Work Packageに直接関係するfocused validationだけ実行してよい。
- repository-wide `pnpm run verify` や高コストE2E / Native full suiteは、Parentから明示された場合を除きworker自身で重複実行しない。
- full / required validationは`quality_gate_runner`へ委譲する。

出力:

- changed files
- implementation summary
- decision points
- focused validation executed
- unverified items
- scope adherence
- unexpected mutation有無

### 7.8 `quality_gate_runner`

目的:

- Parent確定済みLocal Required Validation Setを実行
- validation結果をEvidence付きで返す
- first abnormal event / downstream failureを分離
- current changeとの因果関係候補を返す
- validation前後のnet Source Integrityを確認する

Model / sandbox:

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
sandbox_mode = "workspace-write"
```

workspace-writeはbuild output / cache / Playwright artifacts等のために必要となり得る。

禁止:

- Application Code編集
- Test Code編集
- Specification / Documentation編集
- Sourceへのpatch / edit / write
- git mutation
- failureの自動修正
- Parent Local Required Validation Setの削除
- required validationの未実行をPASS扱い
- final Failure Taxonomy categoryの確定
- additional subagent spawn

Source write防止は次の順で強化する。

1. developer instructions
2. Current tool / permission layerで安全にwrite toolを止められるなら適用
3. Before / After snapshotでunexpected net Source mutationをfail-close
4. hook / observationにwrite attempt Evidenceが残るならnet diffがなくてもfailureとして扱う

### 7.9 Local Required Validation Set

最終決定者はParent Agentとする。

```text
Test Investigator
  ↓ validation candidates
Parent
  ↓ Local Required Validation Set確定
Quality Gate Runner
  ↓ required set実行
```

通常のcanonical local gate:

```bash
pnpm run verify
```

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

Runner rules:

- Parent required commandを勝手に削除しない。
- 実行不能ならBLOCKED。
- upstream failureで後続が無意味なら `not_run_due_to_upstream_failure`。
- additional diagnosticsは追加可能。
- diagnostic resultをRequired PASSの代替にしない。
- Source Integrity failureをvalidation PASSより優先する。

### 7.10 External Completion Checks

GitHub ActionsやCI-only platform validationはLocal Required Validation Setと分離する。

責務:

```text
Quality Gate Runner
  = local validation execution

Parent Agent
  = External Completion Checkの特定・確認・最終判定
```

例:

- Phase 1 Required CI
- Native CI final verify
- GitHub-hosted platform build / runtime
- PR headに対するRequired Check

External checkが未実行 / pendingなら `MERGE_READY` にしない。

### 7.11 Completion State Model

#### `LOCAL_IMPLEMENTATION_COMPLETE`

以下をすべて満たす。

- implementation finished
- Parent integration review finished
- `quality_gate_runner` PASS
- Local Required Validation Set PASS
- net Source Integrity PASS
- no unresolved local blocker

これはMerge Readyを意味しない。

#### `MERGE_READY`

以下をすべて満たす。

- `LOCAL_IMPLEMENTATION_COMPLETE`
- Required GitHub Actions PASS
- required remote / Native / platform checks PASS
- no unresolved blocker

External Checksがまだ開始できない場合は、状態を明確に次のように報告する。

```text
LOCAL_IMPLEMENTATION_COMPLETE
External checks pending
MERGE_READY = false
```

### 7.12 Source Integrity Contract

Parent integration review完了後、現在の実装diffを正当なvalidation baselineとしてBefore Snapshotへ含める。

```text
Parent integration review
  ↓
Before Source Snapshot
  ↓
Required Local Validation
  ↓
After Source Snapshot
  ↓
Comparison
```

最低限検出対象:

- tracked modification
- new tracked / untracked source file
- deletion
- rename
- copy
- content hash change
- Git HEAD change

validation中に生成される再生成可能outputはSource mutationと混同しない。

例:

- `output/**`
- `.artifacts/**`
- `.codex/runs/**` のtrusted generated artifact
- build / test cache
- dependency cache

ただし「generated」と称してApplication / Test / Specification sourceを除外しない。

### 7.13 Failure Taxonomy Integration

Failure Categoryの唯一のSSOT:

```text
spec/failure-taxonomy.json
docs/reference/failure-taxonomy.md
```

`quality_gate_runner` はFailure Categoryではなく、次のようなcausal relation候補だけを返す。

```text
current_change_related
baseline_independent
environment_or_flaky
harness_or_contract
unknown
```

final categoryが必要な場合だけ、ParentがEvidenceを統合してExisting Taxonomyから選択する。

### 7.14 Quality Runner Output Contract

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
- net source diff count
- Git HEAD changed: yes/no
- unexpected net Source mutation: yes/no
- observed write attempt if available

Remaining
- unverified checks
- environment limitations

Recommendation
- local validation complete
- investigate
- repair
- human decision required
```

### 7.15 Read / Write Parallelization Contract

#### Read-only

Standard / Strictでは独立した調査観点が2つ以上ある場合、原則parallel spawnする。

```text
minimal Parent orientation
→ parallel spawn
→ wait/join
→ evidence collect
→ Parent decision
→ close finished agents
→ Parent synthesis
```

implementation phase中にread-only agentを追加する場合は、researcher read setとactive worker write setがdisjointであることを確認する。

不明ならworker join後に調査する。

#### Write Parallel Capability Gate

Gate A — Work Package Independence:

- write set非重複
- shared schema / migration / lockfile同時更新なし
- same generated output同時更新なし
- worker間途中依存なし
- merge order不要、またはParentが明示管理可能
- formatter / generatorが他worker scopeを変更しない

Gate B — Workspace Isolation:

- 各workerが独立working root / isolated workspaceで実行されることを実Runで証明
- Worker AからWorker Bのin-flight diffが見えない
- worker単位でchanged filesを帰属可能
- scope validationが他worker変更を誤検知しない

Decision:

```text
Gate A PASS + Gate B PASS
→ parallel writable execution allowed

Gate A PASS + Gate B FAIL / UNKNOWN
→ serial writable execution

Gate A FAIL
→ serial writable execution
```

parallel writeのためだけに大型worktree manager / custom runnerを作らない。

### 7.16 Concurrency / Lifecycle

初期値:

```toml
max_concurrent_threads_per_session = 6
```

完了agentを開きっぱなしにしない。

```text
spawn
→ run
→ wait/join
→ evidence collect
→ Parent decision
→ close
```

Research agentsをcloseしてからImplementationへ進み、Implementation workerをcloseしてからQuality Gateへ進む。

### 7.17 Run Artifact Ownership

Modelがdecision contentを書く場合、Parent Agentだけが行う。

```text
.codex/runs/<run_id>/PLAN.md
.codex/runs/<run_id>/TASKS.md
.codex/runs/<run_id>/REPORT.md
.codex/runs/<run_id>/evaluation.json
```

Trusted machine-generated updateは既存contractに従い許可する。

例:

- `codex-task` wrapper report / manifest
- hook observation
- subagent observation generation
- collectorによる`run.json` aggregation
- validation result aggregation

### 7.18 Failure / Repair Loop

Local Quality GateまたはExternal Completion CheckがFAIL / BLOCKEDした場合、Parentは即座に修正へ飛ばない。

```text
test_investigator
  → first-failure / test / CI / contract analysis

code_researcher
  → diff / dependency / causal relation analysis
```

可能な範囲でparallel investigationする。

ParentがEvidenceを統合してcausal relationを判断し、必要な場合だけExisting Failure Taxonomyからcategoryを選ぶ。

Repair後は必ず:

```text
Parent integration review
→ quality_gate_runner local revalidation
→ External Checks再確認 when applicable
```

bounded retryを維持する。

最低限以下で無目的再試行を止める。

- 同一エラー2回連続
- 同じ工程3回失敗
- 新しいEvidenceなし
- 新しい仮説なし

### 7.19 Governance / Rollback

Current `AGENTS.md` のL3 governanceに従い、今回のImplementationはStrict相当として扱う。

L3相当変更へ着手する前にRun Artifactへ記録する。

- User / Ownerの明示承認
- 変更するL3境界
- expected behavior
- rollback condition
- rollback procedure

本PlanのMerge自体はL3実装承認の代替にしない。

Rollbackは大型systemを作らず、人間側Git操作を正本とする。

```text
Implementation PRをmergeしない
→ 問題のあるImplementation commitを人間側でrevert
→ old config / agent / hook / harness contractへ戻す
→ baseline verify再実行
```

Agent自身にdestructive rollbackを実行させない。

### 7.20 `scripts/verify` Contract

#### Required Agent Files

```text
code_researcher.toml
implementation_researcher.toml
test_investigator.toml
implementation_worker.toml
quality_gate_runner.toml
```

#### Model / Effort Invariant

すべての `.codex/agents/*.toml` が以下を満たす。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

agent名ごとの重複hard-codeではなく、可能なら全agent TOMLを走査する。

#### Sandbox Invariant

```text
code_researcher.sandbox_mode = read-only
implementation_researcher.sandbox_mode = read-only
test_investigator.sandbox_mode = read-only
implementation_worker.sandbox_mode = workspace-write
quality_gate_runner.sandbox_mode = workspace-write
```

#### Parent Config Invariant

```text
agents.enabled = true
default_subagent_model = gpt-5.6-luna
default_subagent_reasoning_effort = max
max_concurrent_threads_per_session = 6
features.multi_agent = true
features.hooks = true
```

#### Delegation Invariant

- child recursive delegation禁止
- project custom agent allowlistを通常利用
- built-in / generic agent通常利用禁止
- read-only behavioral contract維持
- worker focused-validation boundary
- quality runner Source-edit禁止

#### Source / Failure / Completion Invariant

- Before / After net Source Integrity contract
- A/M/D/untracked/rename/copy/HEAD semantics
- Existing Failure Taxonomy SSOT維持
- Parent Local Required Validation Set preservation
- Local / External validation separation
- `LOCAL_IMPLEMENTATION_COMPLETE` / `MERGE_READY` separation

Bash / PowerShell verify parityを維持する。

### 7.21 Implementation Waves

#### Wave 0 — Rebaseline / Governance / Capability Discovery

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
- custom child `agents.enabled = false` 可否
- optional child `multi_agent = false` 可否
- runtime model / effort observability
- read-only sandbox / runtime override挙動
- quality runner write-tool blocking可否
- worker workspace / cwd behavior

Wave 0の主要判断:

```text
1. Luna + max contract成立
2. Child recursion prevention成立
3. Read-only behavioral contract検証可能
4. Write Parallel Capability Gate判定可能
5. Existing Failure Taxonomy維持可能
6. Existing Source Integrity semantics再利用可能
```

Product Codeは変更しない。

#### Wave 1 — Model / Config Migration

- existing 4 agents → Luna + max
- add `quality_gate_runner`
- default subagent model / effort
- current concurrency key
- current hooks / multi-agent key
- stale / unsupported key整理
- child recursion config-level prevention
- built-in / generic agent禁止contract
- sandbox intent固定

#### Wave 2 — Orchestration Contract

`AGENTS.md` / implementation harnessへ反映する。

- Parent responsibility
- parallel read-only investigation
- custom agent allowlist
- built-in / generic禁止
- read-only sandbox + behavioral contract
- agent lifecycle / close rule
- Work Package decomposition
- read/write sets
- Write Parallel Capability Gate
- serial fallback
- worker focused-validation boundary
- Local Required Validation Set
- External Completion Checks
- `LOCAL_IMPLEMENTATION_COMPLETE` / `MERGE_READY`
- Failure Taxonomy SSOT preservation
- Run Artifact ownership
- bounded Repair Loop

#### Wave 3 — Harness / Quality Runner / Static Contracts

- `quality_gate_runner` contract
- Parent-defined validation set execution
- Source write prohibition
- before / after net Source Integrity
- existing snapshot semantics reuse
- causal relation output
- no custom Failure Taxonomy
- scripts/verify / PowerShell parity
- model / effort invariant
- sandbox invariant
- built-in / generic禁止 invariant
- relevant contract tests
- schema changes only if necessary
- hook changes only if configuration-level enforcement is insufficient

#### Wave 4 — Read-only Parallel Real Run

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
- each read-only agent `changed_files = []`
- aggregate Source diff 0
- Parent synthesis成功
- completed threads close

#### Wave 5 — Writable Capability Verification

安全なbounded taskでworkspace isolationを確認する。

Isolation PASS:

- each workerが相手のin-flight diffを見ない
- changed files帰属可能
- scope check誤検知なし
- deterministic integration

Isolation FAIL / UNKNOWN:

```text
Worker A
→ join / Parent review
→ Worker B
→ join / Parent review
```

serial fallbackでPlan完了可能とする。

#### Wave 6 — Quality Gate Runner Real Run

ParentがLocal Required Validation Setを確定してrunnerへ渡す。

確認:

- required setを削除しない
- required command実行
- Source editを行わない
- possible tool-level write protectionが機能する、または利用不能制約をEvidence化
- before / after net Source Integrity
- untracked / deleted / rename / copyも扱う
- structured result
- causal relationとFailure Taxonomyを混同しない

#### Wave 7 — Failure / Repair Real Run

安全なexisting fixture / contract fixtureを優先して以下を確認する。

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

#### Wave 8 — Local / External Final Validation

Local:

```text
repository harness verify
pnpm run verify
relevant contract tests
read-only parallel real run
writable capability decision evidence
quality_gate_runner real run
net Source Integrity check
Run Artifact sanitizer
```

Local条件を満たしたら:

```text
LOCAL_IMPLEMENTATION_COMPLETE = true
```

External:

- Required GitHub Actions
- applicable Phase 1 / Native final gates
- PR head Required Checks

External条件も満たしたら:

```text
MERGE_READY = true
```

未実行をPASS扱いしない。

---

## 8. Validation plan

### 8.1 Static Validation

- TOML parse
- Markdownlint
- model / effort invariant
- sandbox-mode invariant
- custom agent allowlist invariant
- built-in / generic禁止contract
- child recursion contract
- worker scope contract
- worker focused-validation contract
- quality runner Source-edit禁止contract
- Failure Taxonomy SSOT contract
- Local / External completion state contract
- Bash / PowerShell verify parity

### 8.2 Runtime Agent Validation

- each custom agent discovery
- each custom agent Luna spawn
- max config acceptance
- child recursive spawn negative test
- read-only parallel execution
- each read-only agent `changed_files = []`
- completed agent close
- runtime model observation where available
- runtime reasoning effort observation where available

reasoning effortを直接観測できない場合はconfigured evidenceとして扱い、runtime observedとは記載しない。

### 8.3 Writable Capability Validation

- workspace / cwd isolation
- in-flight diff visibility
- worker-specific changed-file attribution
- scope validation independence
- serial fallback

parallel write capabilityが証明できないこと自体はPlan failureにしない。

### 8.4 Quality Runner Validation

- Parent-defined Local Required Validation Set preservation
- required commands execution
- write-tool restriction where available
- Source write attempt detection where available
- Before / After net Source Integrity
- untracked / modify / delete / rename / copy / HEAD change semantics
- generated output exclusion
- structured result
- blocked / not-run handling

### 8.5 Failure / Repair Validation

- first abnormal event / downstream failure separation
- causal relation候補
- Existing Failure Taxonomyとの分離
- parallel failure investigation
- bounded repair
- repair後revalidation

### 8.6 Repository Quality

最低限:

```bash
bash scripts/verify
pnpm run verify
```

PowerShell parityも該当環境で確認する。

変更scopeに応じて追加する。

- Playwright Chromium
- Accessibility
- Mobile Boundary
- Specification validation
- Agentic QA preparation
- Native local validation

### 8.7 Completion State Validation

#### `LOCAL_IMPLEMENTATION_COMPLETE`

必須:

- implementation finished
- Parent integration review finished
- quality runner PASS
- Local Required Validation Set PASS
- net Source Integrity PASS
- no unresolved local blocker

#### `MERGE_READY`

必須:

- `LOCAL_IMPLEMENTATION_COMPLETE = true`
- Required GitHub Actions PASS
- required remote / Native / platform checks PASS
- no unresolved blocker

### 8.8 Validation Failure Policy

- 未実行をPASS扱いしない。
- pending External CheckをMerge Ready扱いしない。
- quality runnerのSource Integrity failureを無視しない。
- unknown causal relationを無理にbaseline / environmentへ分類しない。
-同じvalidationをEvidenceなしで無目的再実行しない。

---

## 9. Risks

### Risk 1 — `max`によるlatency / usage増加

Mitigation:

- Owner Decisionとしてmax固定
- read-heavy independent work parallelization
- proper task granularity
- wall-clock / retry / usage記録
- automatic downgradeなし

### Risk 2 — built-in / generic agentによるLuna/max contract逸脱

Mitigation:

- Repository-governed taskではbuilt-in / generic agent禁止
- project custom agent explicit pin
- project default Luna + max
- `scripts/verify` contract
- silent fallback禁止

### Risk 3 — Runtime overrideでread-only sandboxが広がる

Mitigation:

- custom agent configでread-only intent
- behavioral read-only contract
- per-agent `changed_files = []` Evidence
- aggregate Source diff確認

### Risk 4 — Parallel write conflict / scope誤検知

Mitigation:

- Work Package independence
- workspace isolation requirement
- changed-file attribution
- isolation未証明時serial fallback
- shared config / lockfile parallel edit禁止

### Risk 5 — Read / write race

Mitigation:

- active write setとresearch read set重複禁止
- overlap不明ならjoin後research
- immutable baseline利用

### Risk 6 — Quality runnerがSourceを変更

Mitigation:

- developer instructions
- possible tool-level write protection
- write attempt observation where available
- existing snapshot semantics再利用
- Before / After net Source Integrity
- mutation時FAIL

### Risk 7 — Snapshotで途中write / restoreを検知できない

Mitigation:

- snapshotを「net mutation detector」と正確に位置づける
- Source write禁止behavioral contract
- tool-level blockが利用可能なら適用
- write attempt Evidenceを利用可能なら確認

### Risk 8 — Child recursion

Mitigation:

- child `agents.enabled = false` を第一選択
- optional `multi_agent = false` 第二防御
-必要時のみminimal PreToolUse enforcement
- instructions
- negative real-run test

### Risk 9 — Failure Taxonomy二重化

Mitigation:

- existing taxonomyを唯一のSSOT
- runnerはcausal relationだけ返す
- final classificationはParent
- taxonomy外category禁止

### Risk 10 — Local validationとRemote CIの混同

Mitigation:

- `LOCAL_IMPLEMENTATION_COMPLETE`
- `MERGE_READY`
- Local Required Validation Set = quality runner
- External Completion Checks = Parent
- remote pendingをPASS扱いしない

### Risk 11 — Validation重複でparallelization効果を相殺

Mitigation:

- workerはfocused validation
- full required validationはrunner
- same heavy suiteの無目的重複禁止

### Risk 12 — Unsupported / deprecated config

Mitigation:

- Implementation時Current official docs再確認
- legacy alias migration
- undocumented keyへ安全性を依存しない
- config-load / spawn real test

### Risk 13 — L3 regression

Mitigation:

- Strict workflow
- explicit approval
- rollback plan
- Implementation PRをmerge前に実Run検証

---

## 10. Open questions

### 10.1 Blocking questions

**Plan作成時点のBlocking Questionはなし。**

Owner Decisionとして以下は確定済みである。

- 全project-scoped custom subagent = `gpt-5.6-luna`
- 全project-scoped custom subagent = `model_reasoning_effort = "max"`
- implementation workerを利用する
- quality gate runnerを追加する
- read-only investigationを積極並列化する
- safeな場合だけwriteを並列化する
- unsafe / unknownならserial fallbackする

ただしImplementation開始前にはCurrent `AGENTS.md` のL3 governanceに従い、L3変更への明示承認をRun Artifactへ記録する必要がある。

### 10.2 Implementation-time capability questions

以下はWave 0で解決する。

1. Child custom agentの `[agents] enabled = false` がCurrent CLIで期待どおりrecursive delegationを止めるか。
2. 必要ならchild `features.multi_agent = false` を併用できるか。
3. Current Codex runtimeでread-only sandboxがparent runtime overrideからどのような影響を受けるか。
4. Current Codexでquality runnerのwrite-capable edit toolsだけを安全に抑止できるか。
5. Writable subagentにworker単位のisolated workspace / working rootが提供されるか。
6. Runtime modelをどこまで観測できるか。
7. Runtime reasoning effortを直接観測できるか。
8. Token / usage / credit情報を実Run Evidenceとして取得できるか。

### 10.3 Resolution policy

Capability questionが未解決でも、以下の安全側fallbackがある場合はImplementationを止めない。

```text
parallel write unavailable
→ serial

runtime max observation unavailable
→ configured evidence

quality runner write-tool block unavailable
→ behavioral contract + net Source mutation fail-close
```

ただし以下はBLOCKERとする。

- Luna / max自体を利用できない
- child recursionをRepository policyとして許容可能なレベルまで制御できない
- required validationを以前より弱めないと実装できない
- Source Integrityが既存Product / Test sourceを誤ってgenerated扱いする

---

## 11. Follow-up notes

### 11.1 Implementation後のObservation

導入直後に自動policy変更は行わない。

複数の実Runを通じて最低限以下を観察する。

- taskあたりsubagent数
- parallel execution数
- wall-clock
- subagent wait時間
- Repair Loop回数
- initial quality gate PASS率
- scope violation
- Source mutation violation
- agent spawn failure
- token / usage / credit情報

### 11.2 Parallelismの評価

agent数をKPIにしない。

評価対象は以下とする。

- Parent context pollution低減
- independent workのwall-clock短縮
- evidence quality
- implementation / validation責務分離
- conflict / retry overhead

parallel overheadがbenefitを上回るtaskではserial executionを選ぶ。

### 11.3 Future Agent追加

将来agent roleを追加する場合は、built-in roleをその場で利用せず、project-scoped custom agentとして追加することを原則とする。

最低限:

```text
model = gpt-5.6-luna
model_reasoning_effort = max
sandbox intent
recursive delegation disabled
role responsibility
output contract
scripts/verify invariant
```

### 11.4 No Automatic Model Downgrade

usage / latencyが高くても、本Planだけを根拠にreasoning effortを自動downgradeしない。

変更が必要な場合は、実Run Evidenceを基にOwner Decisionとして別途判断する。

### 11.5 Official / Repository Reference Baseline

Implementation時にはCurrent versionを再確認する。

OpenAI Official:

- Codex Subagents documentation
- Codex Configuration Reference
- Codex Hooks documentation
- GPT-5.6 model guidance
- GPT-5.6 Luna model documentation

Repository:

- `AGENTS.md`
- `PLANS.md`
- `docs/plans/TEMPLATE.md`
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

### 11.6 Final Implementation Principle

```text
Parent Agent
  = 判断・分解・Validation Set決定・Failure interpretation・統合・責任

GPT-5.6 Luna Custom Subagents / max
  = 調査・実装・検証のbounded execution

Built-in / Generic Subagents
  = Repository-governed taskでは通常利用しない

Parallel Read-only Work
  = independent investigationのwall-clock短縮

Write Parallel Capability Gate
  = workspace isolationまで証明できる場合だけparallel writeを許可

Quality Gate Runner
  = Parent指定Local Required Validation Setを変更せず実行

Source Integrity
  = validation前後のunexpected net Source mutationをfail-close

Existing Failure Taxonomy
  = Run failure categoryの唯一のSSOT

LOCAL_IMPLEMENTATION_COMPLETE
  = local implementation / validation完了

MERGE_READY
  = Local完了 + Required External Checks完了

Repair Loop
  = Evidence駆動で必要なときだけ再動員
```

subagentを使える箇所では積極的に使う。

同時に以下を守る。

- 安全に分離できないwriteを並列化しない。
- Repository-governed taskでbuilt-in / generic subagentを通常利用しない。
- read-only sandboxが広がってもbehavioral read-onlyを維持する。
- childにrecursive delegationさせない。
- workerにfull quality gateを無目的に重複実行させない。
- validation runnerに修正させない。
- snapshotを「一度もSource writeがないこと」の完全証明と誤認しない。
- runnerにValidation Set選定やfinal Failure Category判断を丸投げしない。
- Existing Failure Taxonomyを第二体系で上書きしない。
- generated artifactとSource mutationを混同しない。
- local implementation completeとMerge Readyを混同しない。
- 観測できないruntime事実を観測済みと扱わない。
- Parent Agentの最終責任をsubagentへ委譲しない。
