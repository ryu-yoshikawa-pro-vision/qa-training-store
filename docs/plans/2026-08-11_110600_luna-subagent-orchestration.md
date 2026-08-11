# GPT-5.6 Luna Subagent Orchestration・並列実装・品質ゲート統合計画

## 0. このPlanと現在Branchの位置づけ

この文書は、Scenario Shop / `qa-training-store` のCodex実装運用を、**Parent Agentによるオーケストレーション + GPT-5.6 Luna custom subagentによる積極的な並列調査・bounded implementation・品質ゲート実行**へ移行するためのImplementation Planである。

現在の `docs/plan-luna-subagent-orchestration` Branchは、PR #16 `feat: 仕様SSOTとAgentic QA基盤を構築する` のMerge後の `main` を基点としたDocumentation-only Branchである。

このBranchでは以下を行わない。

- `.codex/agents/*.toml` の実装変更
- `.codex/config.toml` の実装変更
- `AGENTS.md` / Harness / Scriptの実装変更
- Application Code / Test Codeの変更
- CI Workflowの変更
- Product Behaviorの変更
- 実RunによるCodex runtime検証

本Planの実装は、Implementation開始時点の最新 `main` から作成する別のImplementation Branchで行う。

本PlanはRepositoryの `PLANS.md` / `docs/plans/TEMPLATE.md` に合わせて、Goal / Current understanding / Assumptions / Non-goals / Impacted areas / Files to inspect / Change strategy / Validation plan / Risks / Open questions / Follow-up notesを明示する。

---

## 1. Goal

### 1.1 Goal

現在のCodex運用を、Parent Agentが調査・実装・検証を抱え込む方式から、以下へ移行する。

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

GPT-5.6 Luna Custom Subagents
  = bounded investigation
  + bounded implementation
  + bounded local validation execution
  + failure investigation
```

Standard / Strict taskでは、安全に委譲できる独立作業をParent自身が抱え込まず、原則custom subagentへ委譲する。

read-only investigationは独立観点がある場合に積極的にparallelizeする。

write-heavy taskは、Work Packageの独立性だけでなくexecution workspace isolationまで実証できた場合だけparallelizeし、保証できない場合はserial executionへfail-closeする。

### 1.2 Model / Reasoning Owner Decision

Repository-governed subagentはすべて以下へ統一する。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

対象custom agent:

```text
code_researcher
implementation_researcher
test_investigator
implementation_worker
quality_gate_runner
```

`.codex/config.toml` のdefault subagent model / reasoning effortもLuna + maxへ固定する。

### 1.3 Agent Selection Owner Decision

Repository-governed taskではCodex built-in / generic agentを通常利用しない。

対象外例:

```text
default
worker
explorer
```

Lightweightでsubagentを起動する場合もproject-scoped custom agentを使用する。

新しい役割が必要な場合は `.codex/agents/<role>.toml` を追加し、最低限以下をRepository contractとして固定する。

- exact agent name
- `gpt-5.6-luna`
- `model_reasoning_effort = "max"`
- sandbox intent
- recursive delegation禁止
- role responsibility
- output contract
- `scripts/verify` invariant

Userが明示的に別model / roleを指定した場合だけ例外を別判断する。

### 1.4 Fixed Decisions

1. existing 4 custom agentsをLuna + maxへ移行する。
2. `quality_gate_runner` をLuna + maxで追加する。
3. project defaultもLuna + maxへ固定する。
4. built-in / generic subagentをRepository-governed taskの通常経路から除外する。
5. read-only investigationをStandard / Strictで積極並列化する。
6. writable implementationはWrite Parallel Capability Gate通過時だけ並列化する。
7. workspace isolationがFAIL / UNKNOWNならserial fallbackする。
8. ParentがLocal Required Validation Setを確定する。
9. `quality_gate_runner` はRequired Validation Setを削除せず実行する。
10. `quality_gate_runner` はSourceを修正しない。
11. External Completion ChecksはParentが確認する。
12. final completion decisionはParentだけが行う。
13. silent model fallback / silent reasoning-effort downgradeを行わない。
14. child → grandchild recursive delegationを禁止する。
15. Existing Failure Taxonomyを唯一のFailure Category SSOTとする。
16. Source Integrity snapshotはunexpected **net** Source mutation detectorとして扱う。
17. legacy / undocumented configへ安全性を依存しない。
18. runtimeでspawnされたagentがallowlist / Luna contractから外れた場合、そのRunをfail-closeする。

### 1.5 Definition of Done

#### Model / Agent

- [ ] 5 custom agentsすべてが `gpt-5.6-luna` / `max`。
- [ ] `.codex/config.toml` defaultもLuna / max。
- [ ] agent TOML内 `name` が期待role名と完全一致する。
- [ ] agent nameが重複しない。
- [ ] built-in / generic agent名をcustom role identityとして使用しない。
- [ ] silent fallbackなし。

#### Config Migration

- [ ] `features.codex_hooks` を削除し `features.hooks` へ移行。
- [ ] `agents.max_threads` を削除し `agents.max_concurrent_threads_per_session` へ移行。
- [ ] undocumented `agents.max_depth` を `.codex/config.toml` から削除。
- [ ] `AGENTS.md` / docs / verifyから `agents.max_depth = 1` 依存を削除。
- [ ] recursion preventionをchild configuration / runtime complianceで実現。
- [ ] `scripts/verify` がlegacy key不在を確認する。

#### Sandbox / Delegation

- [ ] researchers 3 roleはconfig上 `read-only`。
- [ ] worker / quality runnerはconfig上 `workspace-write`。
- [ ] read-only agentはruntime overrideでsandboxが広がってもbehavioral read-onlyを維持。
- [ ] read-only real runで各agent `changed_files = []`。
- [ ] child recursive spawnをconfiguration-level優先で防止。
- [ ] completed agentをphase終了時にclose。

#### Runtime Agent Compliance

- [ ] runtimeで起動された全subagentのidentityを観測可能なEvidenceで確認。
- [ ] observed `agent_type` がproject custom allowlist内。
- [ ] observed modelが `gpt-5.6-luna`。
- [ ] non-allowlist / built-in / generic subagentが1件でも観測されたらRun non-compliant。
- [ ] model mismatchが1件でも観測されたらRun non-compliant。
- [ ] reasoning effortはruntime直接観測可能な場合だけruntime evidence化し、観測不能ならconfigured evidenceとして扱う。

#### Writable Execution

- [ ] Write Parallel Capability Gate実施。
- [ ] workspace isolation実証時のみparallel write。
- [ ] isolation未証明ならserial fallback。
- [ ] serial fallbackでもPlan完了可能。

#### Validation

- [ ] workerはfocused validationだけを実行。
- [ ] ParentがLocal Required Validation Setを確定。
- [ ] quality runnerがrequired setを変更せず実行。
- [ ] quality runnerのSource edit禁止contractあり。
- [ ] tool-level write protectionを安全に利用可能なら適用。
- [ ] before / after snapshotでunexpected net Source mutationをfail-close。
- [ ] Existing Failure Taxonomy SSOTを維持。

#### Completion State

- [ ] `LOCAL_IMPLEMENTATION_COMPLETE` はapplicable Real-run Acceptance Criteriaをすべて満たした場合だけtrue。
- [ ] `MERGE_READY` はLocal完了 + Required External Checks PASSの場合だけtrue。
- [ ] External Check pending / 未実行をPASS扱いしない。

---

## 2. Current understanding

### 2.1 PR #16 Merge後Baseline

Current `main` には少なくとも以下が存在する。

- Specification SSOT
- BR / AC validation
- Agentic Exploratory QA
- QA artifact contract
- `pnpm run verify`拡張
- Runtime / Contract test分離
- Run Artifact / Evidence運用
- bounded Repair Loop
- subagent observation / collection contract
- change-scope enforcement
- Failure Taxonomy SSOT
- working-tree snapshot / comparison基盤

Implementation開始時には最新 `main` へ再Baselineする。

### 2.2 Current Custom Agents

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
```

Current baselineでは `gpt-5.4-mini` / `medium` を利用している。

| Agent | Responsibility | Sandbox intent | Source write |
| --- | --- | --- | --- |
| `code_researcher` | Code / dependency / impact investigation | read-only | No |
| `implementation_researcher` | Change surface / implementation approach | read-only | No |
| `test_investigator` | Test / CI / failure investigation | read-only | No |
| `implementation_worker` | Parent確定scopeの限定実装 | workspace-write | Yes |

### 2.3 Current Config Debt

Current `.codex/config.toml` にはlegacy / current-unverified contractが残っている。

```text
features.codex_hooks = true
agents.max_threads = 4
agents.max_depth = 1
```

今回のImplementationでは曖昧に「整理」せず、以下へ明示移行する。

```text
features.codex_hooks
→ REMOVE
→ features.hooks = true

agents.max_threads
→ REMOVE
→ agents.max_concurrent_threads_per_session = 6

agents.max_depth
→ REMOVE
```

recursive delegation safetyを `max_depth` に依存しない。

### 2.4 Current Read-only Safety Contract

Current Repositoryは、sandboxがruntime / wrapper overrideの影響を受ける場合でもread-only agentが編集・作成・削除を行わないbehavioral contractを持つ。

本Planでも以下の二層を維持する。

```text
Configuration intent
  = sandbox_mode = "read-only"

Behavioral contract
  = runtime overrideで権限が広がってもSource変更禁止
```

real runではper-agent `changed_files = []` をEvidence化する。

### 2.5 Current Scope Enforcement Constraint

Current `codex-task` / change-scope contractはRepository working tree全体のchanged filesを評価する。

同一working treeで複数writable workerを同時実行すると、各workerの変更帰属が不安定になる可能性がある。

```text
disjoint write set
≠
parallel write capability proven
```

parallel writeにはworkspace isolationとworker-specific attributionの実証が必要である。

### 2.6 Current Failure Taxonomy SSOT

```text
spec/failure-taxonomy.json
docs/reference/failure-taxonomy.md
```

このtaxonomyを今回拡張・置換しない。

quality runnerは独自Failure Categoryを作らない。

### 2.7 Current Source Integrity Building Blocks

既存working-tree snapshot / entry collection semanticsは、少なくとも以下を扱える。

- added / untracked
- modified
- deleted
- rename / copy
- file content hash
- Git HEAD SHA変化

新しいSource Integrity frameworkを作らず既存semanticsを再利用する。

### 2.8 Snapshotの保証範囲

Before / After snapshotが保証するのは、validation前後でunexpected additional **net** Source diffが残っていないことである。

途中write → restoreまで完全検知する保証ではない。

quality runner validation-only性は多層防御とする。

1. developer instructionsでSource edit禁止
2. tool-level write protectionが安全に利用できれば適用
3. ParentがRequired Validation Set固定
4. Before / After snapshotでnet mutationをfail-close
5. write attempt Evidenceが観測できればnet diffがなくてもfailure扱い

### 2.9 Current Subagent Observation Contract

Current Repositoryはread-only subagentの `changed_files = []`、writable subagentのallowed / changed scope、parent decision等をEvidence化できる。

今回のImplementationではこれをRuntime Agent Compliance Gateへ拡張する。

---

## 3. Assumptions

### 3.1 Assumptions allowed

- Current Codexでproject-scoped custom agentsを利用できる。
- Current Codexで `gpt-5.6-luna` / `max` を利用できる。
- Current configでdefault subagent model / effortを設定できる。
- custom agent TOMLでsandbox intentを設定できる。
- existing verify scriptsを拡張できる。
- Existing snapshot semanticsを再利用できる。
- Existing Failure Taxonomyは変更不要。
- parallel write不可でもserial fallbackで目的達成可能。
- Remote CIはLocal validationと別phaseで確認可能。

### 3.2 Codex Version Assumption

Plan更新時点のOpenAI公式情報では、GPT-5.6をCodex CLIで利用する最低バージョンは `0.144.0` である。

Implementation開始時にCurrent official requirementを再確認し、以下を適用する。

```text
Current official minimum <= 0.144.0
→ require Codex CLI >= 0.144.0

Current official minimum > 0.144.0
→ require the newer official minimum
```

preflightでminimum未満ならBLOCKEDとし、model fallbackしない。

### 3.3 Assumption Failure Policy

```text
Luna / max unavailable
→ BLOCKED

Codex CLI below required minimum
→ BLOCKED until environment is upgraded

child recursion primary config unavailable
→ secondary config / minimal hook / runtime complianceを評価

workspace isolation unavailable
→ serial writable execution

runtime reasoning effort unobservable
→ configured evidence

quality runner write-tool blocking unavailable
→ behavioral prohibition + net Source mutation detection
```

---

## 4. Non-goals

- Parent Agent自体をLunaへ強制しない。
- built-in / generic subagentを通常利用しない。
- 独自LLM Runnerを作らない。
- Responses API wrapperを作らない。
- Custom Session Managerを作らない。
- 独自MCP orchestration layerを作らない。
- Remote Sandbox platformを作らない。
- distributed worker infrastructureを作らない。
- parallel write専用の大型worktree managerを作らない。
- unsafe same-working-tree parallel writeを許可しない。
- writable workerに共有fileを同時編集させない。
- quality runnerへ自動修正権限を与えない。
- quality runnerへValidation Set選定を丸投げしない。
- quality runnerへfinal Failure Taxonomy classificationを任せない。
- 第二Failure Taxonomyを作らない。
- unlimited Repair Loopを導入しない。
- silent model fallbackを行わない。
- automatic reasoning-effort downgradeを行わない。
- Product featureを変更しない。
- snapshotだけで「一度もSource writeがなかった」と主張しない。
- Remote CI未完了をLocal PASSだけでMerge Ready扱いしない。

---

## 5. Impacted areas

### 5.1 Agent Definitions

- 3 read-only researchers
- `implementation_worker`
- new `quality_gate_runner`
- model / effort / name / sandbox / recursion contract

### 5.2 Parent Orchestration

- Standard / Strict delegation policy
- custom agent allowlist
- Runtime Agent Compliance Gate
- agent lifecycle
- Work Package decomposition
- read / write set
- Write Parallel Capability Gate
- Local Required Validation Set
- External Completion Checks
- completion state model

### 5.3 Config / Governance

- legacy config migration
- child recursion prevention
- read-only behavioral safety
- quality runner validation-only boundary
- L3 approval / rollback

### 5.4 Harness / Evidence

- Bash / PowerShell verify parity
- subagent observation
- runtime identity / model evidence
- changed-file evidence
- Source Integrity
- Failure Taxonomy connection

### 5.5 Product

Application behaviorは変更しない。

parallelismを証明するためだけのProduct defect / Product fixture追加は行わない。

---

## 6. Files to inspect

Implementation開始時に最新 `main` で再確認する。

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

### 6.2 Governance / Docs

```text
AGENTS.md
PLANS.md
CODE_REVIEW.md
docs/plans/TEMPLATE.md
docs/reference/codex-implementation-harness.md
docs/reference/subagent-observation.md
docs/reference/run-artifacts.md
docs/reference/change-scope-policy.md
docs/reference/failure-taxonomy.md
spec/failure-taxonomy.json
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
.codex/templates/subagent-run.schema.json
```

Hook変更はconfig / observation contractで足りない場合だけ行う。

### 6.4 Source Integrity

```text
scripts/agentic-qa/working-tree-snapshot.ts
scripts/agentic-qa/benchmark-revision.ts
```

必要な場合だけ小さく共通化し、Agentic QA固有contractを壊さない。

### 6.5 Local / External Validation

```text
package.json
.github/workflows/**
```

Agent orchestrationのためだけにRemote Workflowを大規模再設計しない。

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
  ├─ PASS → disjoint worker(s) parallel
  └─ FAIL / UNKNOWN → worker(s) serial
  ↓ join / evidence / close
Parent integration review
  ↓
quality_gate_runner
  ├─ execute Parent-defined Local Required Validation Set
  ├─ optional diagnostics
  ├─ net Source Integrity
  └─ structured result
  ↓
Runtime Agent Compliance Gate
  ↓
LOCAL_IMPLEMENTATION_COMPLETE
  ↓
External Completion Checks
  ↓
MERGE_READY
  ↓
Parent final completion decision
```

Failure時:

```text
Local / External FAIL or BLOCKED
  ↓
parallel read-only investigation
  ├─ test_investigator
  └─ code_researcher
  ↓
Parent causal judgement
  ↓
Existing Failure Taxonomy classification when needed
  ↓
Repair plan
  ↓
implementation_worker(s)
  ↓
Parent integration review
  ↓
quality_gate_runner local revalidation
  ↓
Runtime Agent Compliance Gate
  ↓
External recheck when applicable
```

### 7.2 Agent Identity Contract

各custom agent TOMLはexact identityを持つ。

```text
code_researcher.toml
→ name = "code_researcher"

implementation_researcher.toml
→ name = "implementation_researcher"

test_investigator.toml
→ name = "test_investigator"

implementation_worker.toml
→ name = "implementation_worker"

quality_gate_runner.toml
→ name = "quality_gate_runner"
```

Invariant:

- filename basenameと`name`が一致。
- 5 role間でname重複なし。
- `default` / `worker` / `explorer` をcustom nameに使わない。
- required custom roleが欠落しない。

### 7.3 Model / Sandbox Contract

全custom agents:

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

Expected sandbox:

| Agent | Sandbox |
| --- | --- |
| `code_researcher` | `read-only` |
| `implementation_researcher` | `read-only` |
| `test_investigator` | `read-only` |
| `implementation_worker` | `workspace-write` |
| `quality_gate_runner` | `workspace-write` |

### 7.4 Parent Config Migration

Target:

```toml
[agents]
enabled = true
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "max"
max_concurrent_threads_per_session = 6

[features]
hooks = true
multi_agent = true
```

Remove:

```text
features.codex_hooks
agents.max_threads
agents.max_depth
```

`AGENTS.md`、Harness docs、verifyからも `max_depth = 1` を前提とする文言・検証を除去する。

### 7.5 Built-in / Generic Agent Policy

Repository-governed normal flowで利用できるroleは次の5つだけとする。

```text
code_researcher
implementation_researcher
test_investigator
implementation_worker
quality_gate_runner
```

built-in / generic roleはspawnしない。

新roleが必要なら別custom TOMLとしてRepository contractへ追加する。

### 7.6 Runtime Agent Compliance Gate

Static TOMLだけではなく、実際にspawnされたagentをruntime Evidenceでfail-closeする。

各observed SubagentStart / equivalent runtime recordについて最低限確認する。

```text
agent_type ∈ {
  code_researcher,
  implementation_researcher,
  test_investigator,
  implementation_worker,
  quality_gate_runner
}

model == gpt-5.6-luna
```

Violation:

```text
non-allowlist agent observed
→ RUN_NON_COMPLIANT
→ LOCAL_IMPLEMENTATION_COMPLETE = false

model mismatch observed
→ RUN_NON_COMPLIANT
→ LOCAL_IMPLEMENTATION_COMPLETE = false
```

Reasoning effort:

- static config/TOMLで `max` を必須化。
- CLIが `max` configを受理しspawn成功することを実証。
- runtimeで直接観測できる場合だけruntime `max` Evidence化。
- 観測不能ならconfigured evidenceとして扱う。

PreToolUseでspawn role / modelを安定識別できることをWave 0で実証できた場合は、非allowlist / explicit non-Luna overrideを事前blockしてよい。

ただしhookだけを唯一の安全境界にせず、runtime observationによるfail-closeを残す。

### 7.7 Child Recursion Prevention

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

第一選択として各child custom agentでCurrent CLIが有効なら以下を使う。

```toml
[agents]
enabled = false
```

必要なら第二防御:

```toml
[features]
multi_agent = false
```

config-level preventionが不足する場合だけminimal hook enforcementを検討する。

`agents.max_depth` には依存しない。

negative real-run testを必須とする。

### 7.8 Read-only Roles

#### `code_researcher`

- Code / dependency / impact調査。
- Source edit / create / delete禁止。
- additional subagent spawn禁止。
- `changed_files = []` を期待。

#### `implementation_researcher`

- safe change surface / Work Package候補 / read-write set候補 / validation candidates。
- Source edit禁止。
- final scope / designを勝手に確定しない。
- additional subagent spawn禁止。

#### `test_investigator`

- tests / CI / missing coverage / first abnormal event調査。
- Local Validation候補 / External Check候補を返す。
- Test Code修正禁止。
- final Failure Categoryを決めない。
- additional subagent spawn禁止。

runtime overrideでsandboxが広がってもbehavioral read-only契約を解除しない。

### 7.9 `implementation_worker`

目的:

- Parent確定Work Packageだけ実装。
- minimal diff。

禁止:

- allowed scope外編集
- file delete / rename / move
- git mutation
- unrelated refactor
- model-authored `.codex/runs/**` 更新
- recursive delegation

Validation:

- Work Packageに直接関係するfocused validationだけ実行可能。
- repository-wide `pnpm run verify` やheavy E2E / Native full suiteを無目的に重複実行しない。
- full required validationはquality runnerへ委譲。

### 7.10 `quality_gate_runner`

目的:

- Parent確定済みLocal Required Validation Setを実行。
- first abnormal event / downstream failure分離。
- causal relation候補を返す。
- net Source Integrityを確認。

禁止:

- Application / Test / Specification / Documentation Source編集
- Sourceへのpatch / edit / write
- git mutation
- failure自動修正
- Parent Required Validation Set削除
- required validation未実行をPASS扱い
- final Failure Taxonomy category確定
- recursive delegation

Source write防止:

1. developer instructions
2. safeなtool-level write protectionが利用可能なら適用
3. Before / After snapshotでunexpected net Source mutationをfail-close
4. observed write attemptがあればnet diffがなくてもfailure

### 7.11 Local Required Validation Set

```text
Test Investigator
  ↓ candidates
Parent
  ↓ final Local Required Validation Set
Quality Gate Runner
  ↓ execute all required checks
```

canonical local gate:

```bash
pnpm run verify
```

変更scopeに応じて追加する。

```text
Web behavior
→ pnpm run test:e2e:chromium

Accessibility
→ pnpm run test:a11y

Mobile web boundary
→ pnpm run test:e2e:mobile-boundary

Specification
→ pnpm run validate:spec
→ pnpm run build:spec

Agentic QA runtime preparation
→ pnpm run test:agentic-qa:preparation

Native
→ Current Native Runbookでrequiredなlocal checks
```

Runner rules:

- Parent required commandを削除しない。
- 実行不能ならBLOCKED。
- upstream failureで後続無意味ならnot-run reasonを残す。
- diagnosticsをRequired PASSの代替にしない。
- Source Integrity failureをvalidation PASSより優先。

### 7.12 Source Integrity

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

最低限:

- tracked modification
- new tracked / untracked source file
- deletion
- rename
- copy
- content hash change
- Git HEAD change

validation中の再生成可能outputは除外可能だが、Application / Test / Specification Sourceをgenerated扱いしない。

### 7.13 Failure Taxonomy Integration

唯一のSSOT:

```text
spec/failure-taxonomy.json
docs/reference/failure-taxonomy.md
```

quality runnerはFailure Categoryではなくcausal relation候補だけを返す。

```text
current_change_related
baseline_independent
environment_or_flaky
harness_or_contract
unknown
```

final taxonomy classificationはParentが必要時だけ行う。

### 7.14 Write Parallel Capability Gate

Gate A — Work Package Independence:

- write set非重複
- shared schema / migration / lockfile同時更新なし
- same generated output同時更新なし
- worker間途中依存なし
- formatter / generatorが他worker scopeを変更しない

Gate B — Workspace Isolation:

- workerごとに独立working root / workspace
- 他workerのin-flight diffが見えない
- worker-specific changed-file attribution可能
- scope validationが他worker変更を誤検知しない

Decision:

```text
A PASS + B PASS
→ parallel writable allowed

A PASS + B FAIL / UNKNOWN
→ serial writable

A FAIL
→ serial writable
```

parallel writeのためだけに大型worktree managerを作らない。

### 7.15 Read / Write Overlap

implementation中のread-only investigationは、research read setとactive worker write setがdisjointの場合だけparallelizeする。

不明ならworker join後に実行する。

### 7.16 Agent Lifecycle

```text
spawn
→ run
→ wait/join
→ evidence collect
→ Parent decision
→ close
```

Research agentsをcloseしてからImplementationへ進み、workersをcloseしてからQuality Gateへ進む。

### 7.17 Completion State Model

#### `LOCAL_IMPLEMENTATION_COMPLETE`

以下をすべて満たす場合だけtrue。

- implementation finished
- Parent integration review finished
- quality runner PASS
- Local Required Validation Set PASS
- net Source Integrity PASS
- Runtime Agent Compliance Gate PASS
- applicable Real-run Acceptance CriteriaすべてPASS / resolved
- no unresolved local blocker

applicable Real-run Acceptance Criteriaには最低限以下を含む。

- Luna custom agent runtime evidence
- max configured / accepted evidence
- child recursion negative test
- parallel read-only real run
- each read-only `changed_files = []`
- writable isolation capability decision
- quality runner real run
- Source Integrity real run

writable isolationがFAIL / UNKNOWNでも、serial fallback decisionとserial execution safetyが確認できればその項目はresolved扱いにできる。

#### `MERGE_READY`

以下をすべて満たす場合だけtrue。

- `LOCAL_IMPLEMENTATION_COMPLETE = true`
- Required GitHub Actions PASS
- required remote / Native / platform checks PASS、または明確にN/A
- no unresolved blocker

External Checksが開始できない状態では次のように報告する。

```text
LOCAL_IMPLEMENTATION_COMPLETE = true
External checks = pending
MERGE_READY = false
```

### 7.18 Run Artifact Ownership

Model-authored durable decision contentはParentだけが更新する。

```text
.codex/runs/<run_id>/PLAN.md
.codex/runs/<run_id>/TASKS.md
.codex/runs/<run_id>/REPORT.md
.codex/runs/<run_id>/evaluation.json
```

trusted wrapper / hook / collector generated updateは既存contractどおり許可する。

### 7.19 Failure / Repair Loop

Local / External failure時は即修正せず、可能な範囲でparallel investigationする。

```text
test_investigator
  → first-failure / CI / test analysis

code_researcher
  → diff / dependency / causal analysis
```

Parentがcausal relationを判断し、必要時だけExisting Failure Taxonomyからcategoryを選ぶ。

Repair後:

```text
Parent integration review
→ quality_gate_runner local revalidation
→ Runtime Agent Compliance Gate
→ External Check recheck when applicable
```

bounded retry:

- 同一エラー2回連続
- 同じ工程3回失敗
- 新しいEvidenceなし
- 新しい仮説なし

上記では無目的再試行を止める。

### 7.20 Governance / Approval / Rollback

今回のImplementationはpermission / sandbox / wrapper / agent tool availabilityへ影響し得るためStrict相当として扱う。

L3相当変更前にRun Artifactへ以下を記録する。

- User / Owner explicit approval
- L3境界
- expected behavior
- rollback condition
- rollback procedure

UserがImplementation Branch上で「このPlanを実装する」と明示した依頼は、このPlanに記載されたL3変更へのexplicit approvalとして扱ってよい。その場合、同じ承認を再質問せずRun Artifactへ記録する。

Rollback:

```text
Implementation PRをmergeしない
→ 問題commitを人間側Git操作でrevert
→ old config / agent / hook / harness contractへ戻す
→ baseline verify再実行
```

Agent自身にdestructive rollbackを実行させない。

### 7.21 `scripts/verify` Contract

#### Required Agents / Identity

- 5 required TOML存在。
- each `name` == filename basename。
- names unique。
- built-in namesと衝突しない。

#### Model / Effort

全 `.codex/agents/*.toml`:

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

#### Sandbox

```text
code_researcher = read-only
implementation_researcher = read-only
test_investigator = read-only
implementation_worker = workspace-write
quality_gate_runner = workspace-write
```

#### Parent Config

```text
agents.enabled = true
default_subagent_model = gpt-5.6-luna
default_subagent_reasoning_effort = max
max_concurrent_threads_per_session = 6
features.multi_agent = true
features.hooks = true
```

#### Legacy Absence

次が存在したらFAIL。

```text
features.codex_hooks
agents.max_threads
agents.max_depth
```

AGENTS / docs / verifyに `max_depth = 1` safety dependencyを残さない。

#### Delegation / Runtime Contract

- built-in / generic通常利用禁止。
- child recursion禁止。
- read-only behavioral contract。
- worker focused-validation boundary。
- quality runner Source-edit禁止。
- Runtime Agent Compliance Gate contract。

#### Source / Failure / Completion

- net Source Integrity contract。
- A/M/D/untracked/rename/copy/HEAD semantics。
- Existing Failure Taxonomy SSOT。
- Parent Required Validation Set preservation。
- Local / External separation。
- `LOCAL_IMPLEMENTATION_COMPLETE` / `MERGE_READY` separation。

Bash / PowerShell parityを維持する。

### 7.22 Implementation Waves

#### Wave 0 — Rebaseline / Governance / Capability Discovery

Repository:

- latest `main`
- Open PR conflict
- Current custom agents / config / AGENTS / verify
- Current scope enforcement
- Current subagent observation
- Current Failure Taxonomy
- Current snapshot semantics
- Current Repair Loop

Codex preflight:

- `codex --version`
- Current official minimum version再確認
- CLIがrequired minimum以上
- Luna availability
- max config acceptance
- SubagentStart / equivalent identity-model observability
- child `agents.enabled = false` 有効性
- optional child `multi_agent = false` 有効性
- spawn PreToolUse input observability
- read-only runtime override behavior
- quality runner write-tool blocking可否
- worker workspace / cwd behavior

BLOCKER:

- required CLI minimum未満
- Luna / max unavailable
- child recursionを許容可能に制御不能
- runtime agent complianceを信頼できるEvidenceで判定不能
- required validationを弱めないと成立しない

#### Wave 1 — Model / Identity / Config Migration

- 4 existing agents → Luna + max
- add quality runner
- exact agent identity
- sandbox intent
- project defaults
- current concurrency key
- current hooks key
- remove `codex_hooks`
- remove `max_threads`
- remove `max_depth`
- remove `max_depth` dependency from AGENTS / docs / verify

#### Wave 2 — Orchestration Contract

- Parent responsibility
- custom allowlist
- built-in / generic禁止
- Runtime Agent Compliance Gate
- read-only sandbox + behavioral contract
- lifecycle / close rule
- Work Package / read-write sets
- Write Parallel Capability Gate
- serial fallback
- worker focused validation
- Local Required Validation Set
- External Completion Checks
- completion states
- Failure Taxonomy SSOT
- Run Artifact ownership
- bounded Repair Loop

#### Wave 3 — Harness / Static Contracts

- quality runner contract
- net Source Integrity
- Existing snapshot semantics reuse
- verify Bash / PowerShell parity
- identity invariant
- model / effort invariant
- sandbox invariant
- legacy key absence
- runtime compliance contract
- relevant contract tests
- schema changes only if necessary
- hook changes only if necessary

#### Wave 4 — Read-only Parallel Real Run

```text
code_researcher + implementation_researcher + test_investigator
→ parallel
→ wait / join
→ evidence
→ close
```

Acceptance:

- 2+ agents overlap
- all observed agent_type allowlisted
- all observed models Luna
- max configured / accepted
- each `changed_files = []`
- aggregate Source diff 0
- Parent synthesis成功

#### Wave 5 — Recursive Delegation Negative Run

各childからgrandchild spawnが禁止されることを安全なnegative testで確認する。

Acceptance:

- recursive spawn不可
- primary config enforcement確認
- fallbackを使う場合は理由とEvidence記録
- `max_depth` 非依存

#### Wave 6 — Writable Capability Verification

Isolation PASS:

- workersが相手のin-flight diffを見ない
- changed files attribution可能
- scope誤検知なし
- deterministic integration

Isolation FAIL / UNKNOWN:

```text
serial fallback
```

parallel write成功自体はDoDではない。

#### Wave 7 — Quality Gate Runner Real Run

確認:

- Parent Required Set保持
- required commands実行
- Source editなし
- possible write-tool protectionまたは制約Evidence
- before / after net Source Integrity
- structured result
- causal relationとFailure Taxonomy分離

#### Wave 8 — Failure / Repair Real Run

既存fixture / contract fixtureを優先する。

```text
quality runner FAIL
→ parallel investigators
→ Parent causal judgement
→ Existing Failure Taxonomy classification when needed
→ bounded repair worker
→ Parent review
→ quality runner PASS
```

Product defectを残してmergeしない。

#### Wave 9 — Local / External Final Validation

Local:

- repository harness verify
- `pnpm run verify`
- relevant contract tests
- read-only parallel real run
- recursion negative run
- writable capability decision
- quality runner real run
- Runtime Agent Compliance Gate PASS
- Source Integrity PASS
- Run Artifact sanitizer

すべて満たしたら:

```text
LOCAL_IMPLEMENTATION_COMPLETE = true
```

External:

- Required GitHub Actions
- applicable Phase 1 / Native final gates
- PR head Required Checks

すべてPASS / N/Aなら:

```text
MERGE_READY = true
```

---

## 8. Validation plan

### 8.1 Static Validation

- TOML parse
- Markdownlint
- exact agent identity
- unique agent names
- model / effort invariant
- sandbox invariant
- parent config invariant
- legacy key absence
- built-in / generic禁止contract
- child recursion contract
- worker scope / focused-validation contract
- quality runner Source-edit禁止contract
- Failure Taxonomy SSOT contract
- completion state contract
- Bash / PowerShell parity

### 8.2 Codex Preflight

- Current official minimum version確認
- Codex CLI version gate
- Luna availability
- max config acceptance
- custom agent discovery

Plan更新時点のminimum baselineは `0.144.0`。

### 8.3 Runtime Agent Validation

- each custom agent Luna spawn
- SubagentStart / equivalent Evidence
- agent_type allowlist
- actual model Luna
- max configured / accepted
- recursive spawn negative test
- read-only parallel execution
- each read-only `changed_files = []`
- completed agent close

runtime effortを観測不能ならconfigured evidenceとして扱う。

### 8.4 Writable Capability Validation

- workspace / cwd isolation
- in-flight diff visibility
- worker-specific attribution
- scope independence
- serial fallback

parallel write capabilityが証明できないこと自体はPlan failureではない。

### 8.5 Quality Runner Validation

- Parent Required Set preservation
- required commands execution
- write-tool restriction where available
- write-attempt detection where available
- net Source Integrity
- generated output exclusion
- structured result
- blocked / not-run handling

### 8.6 Failure / Repair Validation

- first abnormal event分離
- causal relation
- Existing Failure Taxonomyとの分離
- parallel investigation
- bounded repair
- repair後revalidation

### 8.7 Repository Quality

最低限:

```bash
bash scripts/verify
pnpm run verify
```

PowerShell parityを該当環境で確認する。

変更scopeに応じてPlaywright / a11y / Mobile Boundary / Spec / Agentic QA / Nativeを追加する。

### 8.8 Completion State Validation

`LOCAL_IMPLEMENTATION_COMPLETE` はSection 7.17の全条件とapplicable Real-run Acceptanceを満たすこと。

`MERGE_READY` はLocal完了 + Required External Checks PASS / N/Aであること。

### 8.9 Validation Failure Policy

- 未実行をPASS扱いしない。
- pending External CheckをMerge Ready扱いしない。
- runtime agent compliance violationを無視しない。
- quality runner Source Integrity failureを無視しない。
- unknown causal relationを無理にbaseline / environmentへ分類しない。
- 同じvalidationをEvidenceなしで無目的再実行しない。

---

## 9. Risks

### Risk 1 — `max`によるlatency / usage増加

Mitigation:

- Owner Decisionとしてmax固定。
- read-heavy workを安全にparallelize。
- wall-clock / retry / usage記録。
- automatic downgradeなし。

### Risk 2 — built-in / generic agentによるcontract逸脱

Mitigation:

- custom-only policy。
- static allowlist。
- Runtime Agent Compliance Gate。
- optional pre-spawn block。
- violation時Local completion false。

### Risk 3 — Runtime overrideでread-only sandboxが広がる

Mitigation:

- read-only config intent。
- behavioral read-only。
- per-agent `changed_files = []`。

### Risk 4 — Parallel write conflict

Mitigation:

- Work Package independence。
- workspace isolation requirement。
- attribution確認。
- serial fallback。

### Risk 5 — Quality runnerがSourceを変更

Mitigation:

- developer instructions。
- possible tool-level protection。
- write-attempt observation。
- net Source Integrity。

### Risk 6 — Snapshotがwrite / restoreを検知できない

Mitigation:

- snapshotをnet mutation detectorとして限定。
- behavioral prohibition。
- tool-level block / observationを可能な範囲で併用。

### Risk 7 — Child recursion

Mitigation:

- child `agents.enabled = false` 第一選択。
- optional `multi_agent = false`。
- minimal hook only if needed。
- negative real-run test。
- `max_depth` 非依存。

### Risk 8 — Legacy configが残る

Mitigation:

- `codex_hooks` / `max_threads` / `max_depth` を名指し削除。
- verifyでabsenceをfail-close。
- AGENTS / docsも移行。

### Risk 9 — Local completionが実Run Evidenceより弱い

Mitigation:

- applicable Real-run AcceptanceをLocal completion必須条件へ統合。

### Risk 10 — Failure Taxonomy二重化

Mitigation:

- Existing taxonomy only。
- runnerはcausal relationのみ。
- final classificationはParent。

### Risk 11 — Local / Remote混同

Mitigation:

- `LOCAL_IMPLEMENTATION_COMPLETE` / `MERGE_READY` 分離。

### Risk 12 — Validation重複

Mitigation:

- worker focused validation。
- full required validationはrunner。

### Risk 13 — Codex version不足

Mitigation:

- implementation時official minimum再確認。
- baseline minimum 0.144.0。
- version不足時BLOCKED。

### Risk 14 — L3 regression

Mitigation:

- Strict workflow。
- explicit approval記録。
- rollback plan。
- merge前real run。

---

## 10. Open questions

### 10.1 Blocking questions

Plan作成時点のBlocking Questionはなし。

Owner Decisionは確定済みである。

Implementation開始をUserが明示した場合、その依頼をSection 7.20のL3 explicit approvalとして記録し、同じ承認を再質問しない。

### 10.2 Implementation-time Capability Questions

Wave 0で解決する。

1. child `[agents] enabled = false` がCurrent CLIでrecursive delegationを止めるか。
2. child `features.multi_agent = false` が必要か。
3. SubagentStart / equivalentでagent_typeとmodelを安定観測できるか。
4. spawn PreToolUseでrole / model overrideを安全に識別できるか。
5. read-only sandboxがruntime overrideからどう影響されるか。
6. quality runnerのedit/write toolsだけを安全に抑止できるか。
7. writable workerにisolated workspaceがあるか。
8. runtime reasoning effortを直接観測できるか。
9. token / usage / creditを取得できるか。

### 10.3 Resolution Policy

安全fallbackがあるものはImplementationを止めない。

```text
parallel write unavailable
→ serial

runtime max observation unavailable
→ configured evidence

quality runner tool block unavailable
→ behavioral prohibition + net mutation detection
```

BLOCKER:

- required Codex version不足
- Luna / max利用不可
- child recursionを安全に制御不能
- runtime agent identity / model complianceを信頼できるEvidenceで判定不能
- required validationを弱める必要がある
- Source IntegrityがProduct / Test / Spec Sourceを誤ってgenerated扱いする

---

## 11. Follow-up notes

### 11.1 Implementation後Observation

複数実Runで以下を観察する。

- taskあたりsubagent数
- parallel execution数
- wall-clock
- subagent wait時間
- Repair Loop回数
- initial quality gate PASS率
- scope violation
- runtime compliance violation
- Source mutation violation
- spawn failure
- token / usage / credit情報

### 11.2 Parallelism評価

agent数をKPIにしない。

評価対象:

- Parent context pollution低減
- independent work wall-clock短縮
- evidence quality
- implementation / validation責務分離
- conflict / retry overhead

parallel overheadがbenefitを上回るtaskではserialを選ぶ。

### 11.3 Future Agent追加

新roleはproject-scoped custom agentとして追加する。

最低限:

- exact unique name
- Luna + max
- sandbox intent
- recursion disabled
- responsibility
- output contract
- static verify invariant
- runtime allowlist update

### 11.4 No Automatic Downgrade

usage / latencyが高くても、本Planだけを根拠にmodel / effortを自動downgradeしない。

### 11.5 Official / Repository References

Implementation開始時にCurrent versionを再確認する。

OpenAI Official:

- GPT-5.6 availability / minimum Codex version
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
  = 判断・分解・Validation Set・Failure interpretation・統合・最終責任

GPT-5.6 Luna Custom Subagents / max
  = bounded investigation / implementation / local validation

Runtime Agent Compliance Gate
  = 実際にspawnされたagent identity / modelをfail-close

Parallel Read-only Work
  = independent investigationのwall-clock短縮

Write Parallel Capability Gate
  = workspace isolation実証時だけparallel write

Quality Gate Runner
  = Parent指定Local Required Validation Setを変更せず実行

Source Integrity
  = unexpected net Source mutationをfail-close

Existing Failure Taxonomy
  = 唯一のFailure Category SSOT

LOCAL_IMPLEMENTATION_COMPLETE
  = local implementation + local validation + runtime acceptance完了

MERGE_READY
  = Local完了 + Required External Checks完了
```

subagentを使える箇所では積極的に使う。

ただし以下を守る。

- legacy / undocumented configへ安全性を依存しない。
- built-in / generic agentを通常利用しない。
- runtime compliance violationをfail-closeする。
- read-only sandboxが広がってもbehavioral read-onlyを維持する。
- safeに分離できないwriteをparallelizeしない。
- childにrecursive delegationさせない。
- workerにfull quality gateを無目的に重複実行させない。
- quality runnerに修正させない。
- snapshotをSource write不在の完全証明と誤認しない。
- runnerにValidation Set選定やfinal Failure Category判断を丸投げしない。
- Local completionとMerge Readyを混同しない。
- 観測できないruntime事実を観測済みと扱わない。
- Parent Agentの最終責任をsubagentへ委譲しない。
