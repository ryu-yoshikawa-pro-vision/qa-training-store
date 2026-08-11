# GPT-5.6 Luna Subagent Orchestration・並列実装・品質ゲート統合計画

## 0. このPlanと現在Branchの位置づけ

この文書は、Scenario Shop / `qa-training-store` のCodex実装運用を、**親agentによるオーケストレーション + GPT-5.6 Luna subagentによる積極的な並列調査・bounded実装・品質ゲート実行**へ移行するためのImplementation Planである。

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

## 1. Goal

### 1.1 Goal

現在のCodex運用を、親agentが調査・実装・検証を抱え込む方式から、以下の責務分離へ移行する。

```text
Parent Agent
  = requirement interpretation
  + planning
  + task decomposition
  + dependency management
  + validation-set decision
  + subagent orchestration
  + integration review
  + repair decision
  + final completion decision

Subagents
  = bounded investigation
  + bounded implementation
  + validation execution
  + failure investigation
```

Standard / Strict taskでは、subagentへ安全に委譲可能な作業を親agent自身が抱え込まず、**独立作業は原則としてsubagentへ委譲し、安全に並列実行できる場合は積極的に並列化する**。

ただし、parallelismそのものを目的にしない。特にwrite-heavy taskは、**独立workspace / working rootが実証できた場合にのみ並列化し、保証できない場合はserial executionへfail-closeする**。

そのうえで、すべてのproject-scoped custom subagentと、modelを明示しない通常spawnの既定値を以下へ統一する。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

### 1.2 Owner Decision

本Planでは以下をOwner Decisionとして固定する。

1. すべてのsubagentは原則 `gpt-5.6-luna` を使用する。
2. すべてのsubagentは原則 `model_reasoning_effort = "max"` を使用する。
3. `code_researcher` / `implementation_researcher` / `test_investigator` / `implementation_worker` をすべてLuna + maxへ変更する。
4. 新規 `quality_gate_runner` もLuna + maxで追加する。
5. `.codex/config.toml` にdefault subagent model / reasoning effortを設定し、generic subagentもLuna + maxを既定とする。
6. 親agentは、明示されたユーザー例外がない限り、spawn時に別model / reasoning effortへ上書きしない。
7. Standard / Strict taskでは、subagentを使える作業は積極的に委譲する。
8. read-only investigationは、独立観点がある場合は原則並列化する。
9. writable implementationは、**Write Parallel Capability Gate** を通過した場合だけ並列化する。
10. Write Parallel Capability Gateを通過できない場合、writable workerはserial実行とする。
11. 最終完了判定は親agentが行い、workerまたはquality gate runner自身の自己判定だけで完了扱いにしない。
12. silent model fallback / silent reasoning-effort downgradeは行わない。

### 1.3 Reasoning Effortについて

GPT-5.6 familyは `max` reasoning effortをサポートする。GPT-5.6 Lunaはcost-sensitive / high-volume向けのモデルであるが、本Planでは速度・token効率よりもsubagent単位の品質を優先し、Owner Decisionどおり全subagentを `max` に固定する。

これは一般的な推奨値ではなく、本RepositoryのOwner Decisionである。

導入後の実Runでは最低限以下をEvidenceとして記録する。

- subagent起動数
- parallel execution数
- phaseごとのwall-clock傾向
- Repair Loop回数
- 同一Failure再試行回数
- quality gate初回PASS率
- scope violation件数
- unexpected tracked source mutation件数
- 取得可能な範囲のtoken / usage / credit情報
- 1 taskあたりのsubagent count

本Planでは自動的なmodel変更・effort downgradeは導入しない。

---

## 2. Current Understanding

### 2.1 Current Custom Agents

Current Repositoryには以下のproject-scoped custom agentsが存在する。

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
```

Current baselineではいずれも `gpt-5.4-mini` / `medium` を利用している。

| Agent | Current responsibility | Source write |
| --- | --- | --- |
| `code_researcher` | Codebase / dependency / impact investigation | No |
| `implementation_researcher` | Implementation approach / change surface investigation | No |
| `test_investigator` | Test / CI / flaky / missing coverage investigation | No |
| `implementation_worker` | Parentがscopeを確定した後の限定実装 | Yes |

### 2.2 PR #16 Merge後のBaseline

PR #16はMerge済みであり、Current `main` には以下が含まれる。

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

Implementation開始時には、その時点の最新 `main` へ再Baselineし、Open PRとの競合を確認する。

### 2.3 Current Scope Enforcement Constraint

Current `codex-task` / change-scope contractは、Codex実行後にRepository working tree全体から `changed_files` を収集し、`allowed_files` / `allowed_dirs` / `allowed_globs` と比較する。

したがって、**同一working treeで複数writable workerを同時実行した場合、Worker Aのscope checkからWorker Bの変更も見える可能性がある**。

この状態で単純に「allowed scopeが重複しないからparallel-safe」と判定してはいけない。

本Planでは以下を固定する。

```text
disjoint write set
≠
parallel write capability proven
```

Parallel writeには、disjoint write setに加えて**execution workspace isolationの実証**が必要である。

### 2.4 Current Run Artifact Behavior

Current harnessは `run.json`、report、collector output等をmachine-generated artifactとして更新できる。

したがって「Run Artifactは親agentだけが更新する」という表現は、以下へ正規化する。

```text
Model-authored durable Run Artifact
  → Parent Agent only

Trusted harness / hook / collector generated artifact
  → Machine-generated update allowed
```

Worker自身が `PLAN.md` / `TASKS.md` / `REPORT.md` / `evaluation.json` を勝手に編集することは禁止するが、既存wrapper / collectorの正規更新は許可する。

---

## 3. Target Architecture

### 3.1 Standard / Strict Execution Flow

Target flowを以下に固定する。

```text
Parent orientation
  ↓
Parallel read-only investigation
  ├─ code_researcher
  ├─ implementation_researcher
  └─ test_investigator
  ↓ join / evidence collection / close
Parent synthesis
  ├─ implementation plan
  ├─ dependency graph
  ├─ Work Packages
  ├─ read/write sets
  └─ Required Validation Set
  ↓
Write Parallel Capability Gate
  ├─ PASS
  │    → parallel bounded implementation if scopes are disjoint
  └─ FAIL / UNKNOWN
       → serial bounded implementation
  ↓ join / evidence collection / close
Parent integration review
  ↓
quality_gate_runner
  ├─ execute Parent-defined Required Validation Set
  ├─ optional diagnostics
  ├─ source-integrity verification
  └─ structured result
  ↓
PASS → Parent final review → Complete
  │
  └─ FAIL / BLOCKED
       ↓
     Parallel failure investigation
       ├─ test_investigator
       └─ code_researcher
       ↓ join / close
     Parent causal classification / Repair plan
       ↓
     implementation_worker(s)
       ↓
     Parent integration review
       ↓
     quality_gate_runner revalidation
```

### 3.2 Parent Agent Responsibility

Parent Agentは以下へ集中する。

- User intent / requirement解釈
- Current repository state確認
- Scope決定
- Plan / Task decomposition
- Dependency graph作成
- read set / write set決定
- Write Parallel Capability Gate判定
- Required Validation Set確定
- subagent dispatch
- subagent lifecycle管理
- subagent結果統合
- cross-worker consistency review
- failure causal classification
- Repair Loop遷移判断
- final completion decision
- model-authored durable Run Artifact更新

Parent Agentが直接主要実装を行うのは以下に限定する。

- Lightweight task
- 分割コストの方が明らかに高い極小修正
- subagentへ安全にscopeを渡せないintegration work
- worker完了後に必要となった非常に小さいintegration fix

Standard / Strictで親agentが主要実装を直接行った場合は、その理由を `REPORT.md` に記録する。

---

## 4. Agent Model Contract

### 4.1 Explicit Custom Agent Pinning

以下すべてのcustom agent TOMLで明示的にpinする。

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

### 4.2 Default Subagent Contract

`.codex/config.toml` ではCurrent official keyを利用する。

```toml
[agents]
enabled = true
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "max"
max_concurrent_threads_per_session = 6
```

これによりgeneric spawnの既定値もLuna + maxへ寄せる。

Custom role側でもmodel / effortを明示する理由:

- role intentをfile単位で明確にする
- accidental default driftを防ぐ
- `scripts/verify` でcontract化しやすくする
- future config変更時にもrole contractを維持する

### 4.3 Override Policy

親agentまたはtask-specific workflowが以下を勝手に行ってはならない。

- spawn時に別modelを指定する
- spawn時にmax以外のreasoning effortを指定する
- agent TOMLからmodel / effort pinを削除する

例外:

- ユーザーが具体的なmodel / effort変更を明示した
- OpenAI側のmodel availabilityによりLunaが利用不能で、ユーザーがfallbackを明示承認した
- repository-wide migration planとして別途承認された

Luna利用不能時はsilent fallbackしない。

### 4.4 Runtime Evidenceの限界

Current subagent observation schemaはagent modelを記録できるが、reasoning effortをruntime observed valueとして保証する契約は持っていない。

そのためDoDを以下へ分離する。

```text
Model
  - config/TOML invariantでgpt-5.6-lunaを検証
  - runtime subagent evidenceで可能な範囲で実modelを観測

Reasoning effort
  - config/TOML invariantでmaxを検証
  - Current CLIがmax configを受理しspawn成功することを検証
  - runtime wire formatで観測可能なら追加Evidence化
  - 観測不能な場合に「runtime maxを直接観測した」とは記録しない
```

必要なら `subagent-run.schema.json` に以下を追加する。

- `reasoning_effort`
- `configuration_evidence`
- `runtime_evidence`
- `evidence_source = configured | runtime_observed | inferred`

既存schemaで十分なら無理に追加しない。

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

### 5.2 Enforcement Strategy

Parent project configではmulti-agent toolsを有効化する。

```toml
[features]
multi_agent = true
hooks = true
```

Current official configでは `features.multi_agent` が `spawn_agent` / `send_input` / `resume_agent` / `wait_agent` / `close_agent` を制御する。

各custom agent側ではWave 0で**agent-file内のfeature overrideがCurrent CLIで有効か**を実証する。

有効なら各child agentへ以下を設定する。

```toml
[features]
multi_agent = false
```

これを第一選択とする。

もしCurrent CLIでagent-file単位のfeature overrideが有効でない場合は、以下へfallbackする。

- developer instructionsでsubagent spawn禁止
- PreToolUse hookでchild sessionからの `spawn_agent` / `Agent` invocationをblock可能か検証
- `scripts/verify` contract
- Real-run Evidence

**instruction-onlyを唯一の安全境界にしない。**

### 5.3 Hook Capability Note

Current Codex hooksでは `spawn_agent` はlocal function-tool hook pathで `Agent` matcherにも一致する。

ただし `SubagentStart` hookの `continue: false` はsubagent開始を停止しないため、再帰spawn阻止に `SubagentStart`だけを使わない。

Wave 0で実際のhook inputを確認し、child session識別が十分できる場合だけPreToolUse enforcementを導入する。

---

## 6. Agent Responsibilities

### 6.1 `code_researcher`

目的:

- related code / dependency / impact surface調査
- canonical source確認
- shared dependency確認
- hidden coupling発見

契約:

- read-only
- Source編集禁止
- 必要なEvidenceだけ返す
- implementation decisionを勝手に確定しない
- additional subagentをspawnしない

### 6.2 `implementation_researcher`

目的:

- requested changeに必要な具体的変更箇所特定
- safe change surface整理
- Work Package候補作成
- read set / write set候補作成
- validation candidate整理

契約:

- read-only
- Source編集禁止
- 最終write setを勝手に確定しない
- additional subagentをspawnしない

### 6.3 `test_investigator`

目的:

- existing tests / CI / contract / regression確認
- Required Validation Set候補作成
- failure root-cause候補整理
- missing coverage確認

契約:

- read-only
- test修正禁止
- flakyと断定する前にEvidenceを要求
- required validationの最終決定はParentへ返す
- additional subagentをspawnしない

### 6.4 `implementation_worker`

目的:

- Parentが確定したWork Packageだけを実装する
- minimal diffを維持する
- worker単位のAcceptance Criteriaを満たす

契約:

- workspace-write
- Parentが明示した `allowed-files` / `allowed-dirs` / `allowed-globs` 外を編集しない
- file delete / rename / move禁止
- git mutation禁止
- unrelated refactor禁止
- dependency / design ambiguityが出たら勝手に広げずParentへ返す
- model-authored `.codex/runs/**` 更新禁止
- additional subagent spawn禁止

Worker出力:

- changed files
- implementation summary
- decision points
- local validation executed
- unverified items
- scope adherence
- unexpected mutation有無

### 6.5 New `quality_gate_runner`

目的:

- implementation後のRequired Validation Setを実行する
- PASS / FAIL / BLOCKEDをEvidence付きで返す
- failureを分類する
- validation responsibilityをimplementation workerから分離する

Model:

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

Sandbox:

```toml
sandbox_mode = "workspace-write"
```

workspace-writeとする理由:

- test runner cache
- build output
- Playwright artifacts
- generated validation output
- package/build toolingの一時生成物

ただし、workspace-writeは**Source Modification権限を技術的に完全排除するものではない**。

したがってvalidation-onlyは以下の多層契約で守る。

1. developer instructionsでSource edit禁止
2. ParentがRequired Validation Setだけを渡す
3. validation前snapshot
4. validation実行
5. validation後snapshot
6. tracked Source差分比較
7. unexpected tracked Source mutationがあればrunner resultをFAIL
8. 必要ならPreToolUse hookでedit operationをblock可能かWave 0で確認

禁止:

- Application Code編集
- Test Code編集
- Specification / Documentation編集
- Sourceへの `apply_patch` / Edit / Write
- git mutation
- failureの自動修正
- Required Validation Setの削除
- skipped validationをPASS扱いすること
- unrelated failureの即断
- additional subagent spawn

---

## 7. Required Validation Set Contract

### 7.1 Selection Responsibility

Required Validation Setの最終決定者はParent Agentとする。

`test_investigator` は候補を返すが、`quality_gate_runner` 自身がrequired gateの有無を勝手に決めない。

Target:

```text
Test Investigator
  ↓ candidate validations
Parent
  ↓ decide Required Validation Set
Quality Gate Runner
  ↓ execute exactly that required set
```

### 7.2 Runner Rules

`quality_gate_runner` は以下を守る。

- Parentがrequiredとしたcommandを勝手に削除しない
- 実行不能ならSKIPではなくBLOCKEDとして返す
- required commandの順序に依存がある場合は上流から実行する
- 上流failureで後続が無意味なら、後続は `not_run_due_to_upstream_failure` として明示する
- required set以外のdiagnostic commandは追加してよい
- diagnostic追加はRequired PASSの代替にしない

### 7.3 Canonical Baseline

通常のcanonical local gateは `pnpm run verify` とする。

ただし `verify` だけで全runtime validationが完結すると仮定しない。

変更scopeに応じた例:

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
→ dedicated runtime test

Android Native
→ Current Native Runbook / CI contractに従う

iOS Native
→ Current ADR / CI contractに従う
```

---

## 8. Quality Gate Runner Output Contract

最低限以下をParentへ返す。

```text
Status
- PASS
- FAIL
- BLOCKED

Required Validation Set
- required command list
- executed / not executed

Executed
- command
- result
- relevant summary

Not Executed
- command
- reason
- upstream failure / environment blocker / not applicable

Failures
- first abnormal event
- downstream failures
- classification
- evidence
- suspected relation to current changes

Source Integrity
- before snapshot
- after snapshot
- unexpected tracked source mutation: yes/no

Remaining
- unverified checks
- environment limitations

Recommendation
- complete
- investigate
- repair
- human decision required
```

Failure classification:

```text
CHANGE_CAUSED
BASELINE
ENVIRONMENT
HARNESS
FLAKY_SUSPECTED
BLOCKED
UNKNOWN
```

`UNKNOWN` を禁止しない。

根拠不足で `BASELINE` / `ENVIRONMENT` / `FLAKY_SUSPECTED` へ押し込まない。

---

## 9. Parallelization Contract

### 9.1 Read-only Investigation

Standard / Strictでは独立した調査観点が2つ以上存在する場合、原則parallel spawnする。

典型:

```text
code_researcher
implementation_researcher
test_investigator
```

Target:

```text
minimal parent orientation
→ parallel investigation
→ wait / join
→ evidence collection
→ close finished agents
→ parent synthesis
```

### 9.2 Read / Write Overlap Rule

read-only agentだから常にwrite workerと並列実行してよいわけではない。

Active implementation workerのwrite setとresearcherのread setが重複する場合、researcherがhalf-written / not-yet-integrated stateを読むリスクがある。

したがってimplementation phase中のauxiliary investigationは以下のいずれかを満たす場合だけ並列化する。

- researcher read setとactive worker write setがdisjoint
- workerがjoin済み
- read対象がimmutable baseline / committed sourceであることを明示的に保証できる

不明ならworker join後に調査する。

### 9.3 Writable Parallel Capability Gate

writable workerをparallel化する前に、Parentは以下を確認する。

#### Gate A — Work Package Independence

- write setが重複しない
- shared schema / migration / lockfileを同時更新しない
- same generated outputを更新しない
- worker間の途中依存がない
- merge orderに意味がない、または明示管理可能
- formatter / generatorが相手scopeを変更しない

#### Gate B — Workspace Isolation

- 各workerが独立working root / isolated workspaceで実行されることを実Runで証明できる
- Worker Aの`git status` / scope checkからWorker Bのin-flight変更が混入しない
- worker単位でchanged filesを正しく帰属できる

#### Decision

```text
Gate A PASS + Gate B PASS
→ parallel writable execution allowed

Gate A PASS + Gate B FAIL/UNKNOWN
→ serial writable execution

Gate A FAIL
→ serial writable execution
```

**disjoint pathだけを根拠にparallel writeを許可しない。**

### 9.4 Isolation実現方針

Wave 0 / Wave 1でCurrent Codex clientの実挙動を確認する。

優先順位:

1. Current Codexがsubagentごとの独立workspace / working rootを正式に提供している場合はそれを利用する。
2. Current Repositoryの既存harnessで安全にisolated execution rootを提供できる場合は再利用する。
3. いずれも保証できなければwritable parallelismを導入しない。

本Planのためだけに大型custom runner / distributed worker platformを作らない。

Git worktreeを自前で追加する案は、必要性・cleanup・Windows互換性・scope enforcementとの統合まで含めて別途評価し、単にparallelismを満たすためだけには追加しない。

### 9.5 Parallelismを目的化しない

最適化対象:

- parent context pollution低減
- independent workのwall-clock短縮
- evidence quality向上
- implementation / validation責務分離

最大agent数はKPIにしない。

---

## 10. Concurrency / Agent Lifecycle

### 10.1 Thread Limit

初期値:

```toml
max_concurrent_threads_per_session = 6
```

Current official config上、この値はprimary threadを除くopen spawned-agent thread数の上限である。

想定:

```text
Research phase:
  3 read-only agents + spare capacity

Implementation phase:
  isolated workspaceが実証できた場合のみ複数worker

Failure phase:
  parallel investigators + repair worker
```

初期導入で8以上へ上げない。

### 10.2 Lifecycle

完了agentを開いたままにしない。

標準phase lifecycle:

```text
spawn
→ run
→ wait/join
→ evidence collect
→ parent decision
→ close finished agent
```

Research agentをcloseしてからImplementation phaseへ進み、Implementation workerをcloseしてからQuality Gate phaseへ進む。

必要な場合のみresumeする。

### 10.3 Current Feature Keys

Parent project configではCurrent official keyを使用する。

```toml
[features]
hooks = true
multi_agent = true
```

legacy key:

```text
features.codex_hooks
→ features.hooks

agents.max_threads
→ agents.max_concurrent_threads_per_session
```

`agents.max_depth` のようなCurrent official referenceで確認できないkeyへ安全性を依存しない。

削除前にCurrent CLI / Repository contractからの参照を確認する。

---

## 11. Run Artifact Ownership

### 11.1 Model-authored Durable Artifacts

以下のcontentをModelが直接書き換える場合はParent Agentだけが行う。

```text
.codex/runs/<run_id>/PLAN.md
.codex/runs/<run_id>/TASKS.md
.codex/runs/<run_id>/REPORT.md
.codex/runs/<run_id>/evaluation.json
```

`run.json` もParent decisionの意味を勝手にworkerが変更してはいけない。

### 11.2 Trusted Machine-generated Updates

以下は既存contractに従うmachine-generated更新として許可する。

- `codex-task` wrapperによるreport / manifest更新
- hook observation
- subagent observation generation
- collectorによる `run.json` aggregation
- validation result aggregation

したがって「parent-only write」は**model-authored durable decision content**に対するownershipであり、trusted harness自動更新を禁止する意味ではない。

### 11.3 Parallel Conflict Prevention

Workerは以下を直接編集しない。

- `PLAN.md`
- `TASKS.md`
- `REPORT.md`
- `evaluation.json`

machine-generated subagent evidenceは既存 `subagents/*.json` 等のcontractを利用し、同一pathへのparallel writeを発生させない。

---

## 12. Failure / Repair Loop

### 12.1 Gate Failure

`quality_gate_runner` がFAIL / BLOCKEDしたら、Parentは即座に修正へ飛ばない。

まず可能な範囲で以下をparallel investigationする。

```text
test_investigator
  → test / CI / contract / first-failure analysis

code_researcher
  → current diff / dependency / causal relation analysis
```

必要なら `implementation_researcher` を追加する。

### 12.2 Parent Classification

ParentがEvidenceを統合し、次を決定する。

```text
CHANGE_CAUSED
→ current Repair Loop

BASELINE
→ causal independenceを証明し、別task候補として記録

ENVIRONMENT
→ reproducibility / environment evidenceを記録

HARNESS
→ repairまたはharness-improvementへ分岐

BLOCKED / UNKNOWN
→ additional investigationまたはhuman decision
```

### 12.3 Repair

RepairでもWrite Parallel Capability Gateを適用する。

- Isolationを実証できれば、disjoint repair workerをparallelizeしてよい。
- 実証できなければserial repairとする。

修正後はParent integration reviewを通し、必ず `quality_gate_runner` へ戻す。

### 12.4 Bounded Retry

既存のbounded Repair Loop思想を維持する。

最低限以下で無目的再試行を止める。

- 同一エラー2回連続
- 同じ工程3回失敗
- 新しいEvidenceなし
- 新しい仮説なし

停止後はroot-cause investigationまたはhuman decisionへ戻る。

---

## 13. Lightweight Exception

Lightweight taskでは以下のような明白な小変更についてsubagent省略を許可する。

- single file
- low risk
- no dependency impact
- no design ambiguity
- no cross-platform impact
- validationが単純

ただしsubagent省略理由を `REPORT.md` に記録する。

Lightweightを使って以下を回避してはならない。

- Standard / Strict相当の実装
- security / permission / sandbox変更
- public contract変更
- CI / build / Native基盤変更
- cross-cutting refactor

---

## 14. Codex Version / Availability / Capability Preflight

Implementation開始時に以下を確認する。

```bash
codex --version
```

確認項目:

- Current Codex CLIが `gpt-5.6-luna` を利用可能
- project-scoped custom agent configがmodel / reasoning effortを受理
- `max` reasoning effortを指定したspawnが成功
- multi-agent toolsが利用可能
- `agents.default_subagent_model` が有効
- `agents.default_subagent_reasoning_effort` が有効
- `agents.max_concurrent_threads_per_session` が有効
- `features.hooks` が有効
- `features.multi_agent` が有効
- custom agent内のfeature overrideが有効か
- child recursionをtool-levelでblock可能か
- parallel writable workerに独立workspaceが割り当てられるか
- runtime evidenceでmodel / reasoning effortをどこまで観測できるか

Luna / maxが利用不能ならsilent fallbackしない。

Plan / Run ArtifactへBLOCKERとして記録し、ユーザー判断へ戻す。

---

## 15. Planned File Changes

Implementation PRでは最低限以下を再Baselineして変更する。

### Agent Definitions

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
.codex/agents/quality_gate_runner.toml  # NEW
```

### Orchestration / Config

```text
.codex/config.toml
AGENTS.md
```

### Hooks / Safety

既存hookで足りるか確認し、必要な場合だけ変更する。

```text
.codex/hooks/pre_tool_use_policy.py
.codex/hooks/pre_tool_use_policy.ps1
.codex/hooks/observe.sh
.codex/hooks/observe.ps1
```

### Harness / Documentation

```text
docs/reference/codex-implementation-harness.md
docs/reference/subagent-observation.md
docs/reference/run-artifacts.md
docs/reference/change-scope-policy.md   # only if parallel/isolated semantics change
```

### Validation Contract

```text
scripts/verify
scripts/verify.ps1
```

### Schema / Tests

必要性を再確認して変更する。

```text
.codex/templates/subagent-run.schema.json
relevant harness / contract tests
```

不要なら新schema / framework / runnerを追加しない。

---

## 16. `scripts/verify` Contract

### 16.1 Required Agent Files

```text
code_researcher.toml
implementation_researcher.toml
test_investigator.toml
implementation_worker.toml
quality_gate_runner.toml
```

### 16.2 All-agent Model Invariant

すべての `.codex/agents/*.toml` が以下を満たす。

```toml
model = "gpt-5.6-luna"
model_reasoning_effort = "max"
```

可能ならagent名ごとの重複hard-codeではなく `.codex/agents/*.toml` 全体を走査してInvariant化する。

### 16.3 Config Invariant

`.codex/config.toml` で以下を検証する。

```text
agents.enabled = true
default_subagent_model = gpt-5.6-luna
default_subagent_reasoning_effort = max
max_concurrent_threads_per_session = 6
features.multi_agent = true
features.hooks = true
```

### 16.4 Child Recursion Invariant

agent-file feature overrideがCurrent CLIで有効なら、すべてのchild agentで次を検証する。

```text
features.multi_agent = false
```

feature overrideを利用できない場合は、代替enforcementの実装とcontract testを必須とする。

### 16.5 Safety Invariant

以下を検証する。

- implementation workerのscope restriction
- quality gate runnerのSource-edit禁止契約
- Source Integrity snapshot contract
- Required Validation Setをrunnerが削除しない契約
- child recursion禁止
- model-authored Run Artifact parent-only ownership
- trusted harness machine-generated update例外
- parallel writable executionにCapability Gateが必要
- isolated workspace未証明時はserial fallback

Bash / PowerShellのverify契約は同等にする。

---

## 17. Implementation Waves

### Wave 0 — Rebaseline / Official Spec / Capability Discovery

latest `main` で以下を確認する。

Repository:

- Current custom agent list
- Current `AGENTS.md`
- Current `.codex/config.toml`
- Current verify scripts
- Current change-scope enforcement
- Current subagent observation schema
- Current Repair Loop
- Current `pnpm run verify`
- Open PRとの競合

Codex runtime:

- Current CLI version
- Luna availability
- max effort config acceptance
- generic subagent default inheritance
- current feature keys
- hook tool coverage
- custom agent feature override可否
- child session識別可否
- runtime model observability
- reasoning effort observability
- worker workspace / cwd behavior

**Wave 0の最重要判定はWrite Parallel Capability Gateを実現できるかどうかである。**

このWaveではProduct Codeを変更しない。

### Wave 1 — Model / Config Migration

実施:

- 既存4 custom agentsをLuna + maxへ変更
- `quality_gate_runner`追加
- default subagent model / effort追加
- concurrencyをCurrent keyへ移行
- `features.hooks` / `features.multi_agent`へ移行
- unsupported / stale config key整理
- child recursion tool-level preventionを可能な範囲で実装

Validation:

- TOML parse
- Codex config load
- agent discovery
- each custom role spawn smoke
- generic spawn smoke
- max config acceptance

### Wave 2 — Orchestration Contract

`AGENTS.md` / implementation harnessへ以下を実装する。

- Parent orchestration responsibility
- parallel read-only investigation
- agent lifecycle / close rule
- Work Package decomposition
- read set / write set
- Write Parallel Capability Gate
- workspace isolation requirement
- serial fallback
- model-authored Run Artifact parent-only ownership
- trusted machine-generated artifact exception
- no recursive subagents
- Required Validation Set contract
- quality gate handoff
- failure investigation
- Repair handoff
- bounded retry
- Lightweight exception

### Wave 3 — Harness / Hook / Contract Validation

実施:

- `scripts/verify`
- `scripts/verify.ps1`
- relevant contract tests
- child recursion enforcement
- source integrity check
- subagent observation docs/schema as needed
- hook changes only whenCurrent capabilityが実証できた場合

### Wave 4 — Read-only Parallel Real Run

まず安全なread-heavy workflowを実Runする。

```text
Parent
  ↓
code_researcher + implementation_researcher + test_investigator
  ↓ parallel
join
  ↓
evidence collect
  ↓
close
```

Acceptance:

- 2+ agentsが実際にoverlapして実行される
- Luna model evidence取得
- max configured evidence取得
- Source差分0
- Parent synthesis可能
- completed threadsがcloseされる

### Wave 5 — Writable Execution Capability Verification

専用fixtureまたは安全なbounded taskでworkspace isolationを検証する。

#### Case A — Isolation PASS

```text
Worker A → isolated workspace A
Worker B → isolated workspace B
```

確認:

- each workerが相手のin-flight source diffを見ない
- changed filesをworker単位で帰属可能
- scope checkが誤検知しない
- integration方法がdeterministic

PASSならparallel writable executionを有効化する。

#### Case B — Isolation FAIL / UNKNOWN

parallel writable executionを有効化しない。

Target operation:

```text
implementation_worker A
→ join
→ Parent review
→ implementation_worker B
→ join
→ Parent review
```

**このfallbackでも本Planは完了可能とする。**

「parallel writeできなかった」ことをImplementation失敗にはしない。安全に保証できないparallel writeを無理に実装する方を失敗とする。

### Wave 6 — Quality Gate Runner Real Run

ParentがRequired Validation Setを確定し、runnerへ渡す。

確認:

- runnerがrequired setを削除しない
- required commandを実行する
- before/after Source Integrityを確認する
- Source mutationがない
- structured resultを返す
- optional diagnosticとrequired gateを区別する

### Wave 7 — Failure / Repair Real Run

安全なfixture failureで以下を確認する。

```text
quality_gate_runner FAIL
→ parallel investigators
→ Parent classification
→ bounded repair worker
→ Parent review
→ quality_gate_runner PASS
```

Product defectを残したままmergeしない。

### Wave 8 — Final Validation

最低限:

```text
repository harness verify
pnpm run verify
relevant contract tests
Codex read-only parallel real run
writable capability decision evidence
quality_gate_runner real run
source integrity check
Run Artifact sanitizer
```

Current Required CIもすべてPASSさせる。

---

## 18. Real-run Acceptance Criteria

### Model / Config

- [ ] `code_researcher` configが `gpt-5.6-luna` / `max`。
- [ ] `implementation_researcher` configが `gpt-5.6-luna` / `max`。
- [ ] `test_investigator` configが `gpt-5.6-luna` / `max`。
- [ ] `implementation_worker` configが `gpt-5.6-luna` / `max`。
- [ ] `quality_gate_runner` configが `gpt-5.6-luna` / `max`。
- [ ] generic subagent defaultがLuna + max。
- [ ] Current CLIがmax設定を受理してspawn成功する。
- [ ] runtime modelを取得可能なEvidenceでLunaと確認する。
- [ ] reasoning effortをruntime直接観測できない場合、その限界を明示する。

### Delegation / Lifecycle

- [ ] read-only agentを2つ以上parallel実行できる。
- [ ] Research phase終了後にagentをcloseできる。
- [ ] child agentがgrandchildをspawnできない、またはspawn attemptがblockされる。
- [ ] Parentがsubagent結果を統合して最終判断する。

### Writable Capability

- [ ] Write Parallel Capability Gateを実行する。
- [ ] workspace isolation可否をEvidence付きで判定する。
- [ ] isolation PASSならdisjoint workerを2つ以上parallel実行して安全性を確認する。
- [ ] isolation FAIL / UNKNOWNならserial fallbackを確認する。
- [ ] workerがmodel-authored durable Run Artifactを編集しない。
- [ ] worker scope attributionが正しい。

### Quality Gate

- [ ] ParentがRequired Validation Setを確定する。
- [ ] `quality_gate_runner` がrequired setを削除しない。
- [ ] runnerがrequired validationを実行する。
- [ ] runnerがtracked Sourceを変更しない。
- [ ] skipped / blocked / upstream-failureをPASS扱いしない。
- [ ] failureをstructured classificationできる。

### Repair

- [ ] failure investigationをparallel read-only agentsへ委譲できる。
- [ ] Parentがcausal classificationする。
- [ ] Repair後にParent integration reviewを行う。
- [ ] Repair後にquality gate runnerへ戻る。

### Final

- [ ] subagent EvidenceがRun Artifact / machine-readable evidenceへ集約される。
- [ ] required local gatesがPASSする。
- [ ] required GitHub ActionsがPASSする。

---

## 19. Non-goals

本Planでは以下を行わない。

- Parent AgentそのものをGPT-5.6 Lunaへ強制すること。
- 独自LLM Runnerの構築。
- Responses API wrapperの構築。
- Custom Session Managerの構築。
- 独自MCP orchestration layerの構築。
- Remote Sandbox platformの構築。
- Kubernetes / distributed worker infrastructure。
- parallel writeのためだけの大型worktree manager構築。
- すべてのtaskを無理にparallel化すること。
- 同一working tree上でscope帰属不能なparallel writeを許可すること。
- writable workerへ共有fileの同時編集を許可すること。
- quality gate runnerへ自動修正権限を与えること。
- Required Validation Setの選定をquality gate runnerへ丸投げすること。
- unlimited Repair Loop。
- silent model fallback。
- auto reasoning-effort downgrade。
- Product feature変更。

---

## 20. Risks and Mitigations

### Risk 1 — `max` によるlatency / usage増加

Mitigation:

- Owner Decisionとしてmaxを固定する。
- independent read-heavy workをparallel化する。
- task granularityを適切に保つ。
- wall-clock / Repair回数 / usage情報を記録する。
- 自動downgradeはしない。

### Risk 2 — Parallel write conflict / scope誤検知

Mitigation:

- Write Parallel Capability Gate
- disjoint write set
- workspace isolation requirement
- changed-file attribution確認
- isolation未証明時serial fallback
- shared config / lockfile parallel edit禁止

### Risk 3 — Read/write race

Mitigation:

- active write setとresearch read setの重複禁止
- overlap不明ならjoin後にresearch
- committed / immutable baselineを明示利用

### Risk 4 — Context duplication

Mitigation:

- subagent promptにはtask-specific scopeだけ渡す。
- Parentが必要最小限のcontextを委譲する。
- subagent結果はsummary + Evidence中心にする。

### Risk 5 — Quality runner自身がSourceを直す

Mitigation:

- agent instructions
- Required Validation Set限定
- before / after snapshot
- tracked Source diff check
- possible hook enforcementをWave 0で評価
- mutation検知時FAIL

### Risk 6 — Child recursion

Mitigation:

- child `multi_agent = false` が有効なら利用
- PreToolUse hook enforcement可否確認
- instruction contract
- verify contract
- real-run negative test

### Risk 7 — Reasoning effortをruntime証明できない

Mitigation:

- config invariantとruntime evidenceを分離
-観測可能範囲だけを事実として記録
- schema拡張は必要時のみ

### Risk 8 — Future agentが別modelへ戻る

Mitigation:

- config default Luna + max
- per-role explicit pin
- all `.codex/agents/*.toml` invariant validation

### Risk 9 — Unsupported / deprecated Codex config

Mitigation:

- Implementation時点のCurrent official Config Referenceへ再照合
- legacy aliasをCurrent keyへ移行
- undocumented keyへ安全性を依存しない
- real CLI config-load / spawn testをDoDにする

---

## 21. Validation Plan

### Static

- TOML parse
- Markdownlint
- harness contract tests
- `scripts/verify`
- PowerShell verify parity

### Runtime

- Codex agent discovery
- each custom role spawn
- Luna model evidence
- max config acceptance
- generic default inheritance
- child recursion negative test
- parallel read-only execution
- completed agent close
- writable isolation capability test
- serial fallback test
- quality gate runner execution
- Required Validation Set preservation
- failure classification
- Repair Loop handoff

### Repository Quality

- `pnpm run verify`
- change-scope-specific E2E
- Native validation when impacted
- Required GitHub Actions

### Integrity

- unexpected tracked Source diffなし
- agent scope違反なし
- model-authored Run Artifact ownership違反なし
- no recursive subagents
- no git mutation by worker
- parallel write attribution ambiguityなし

---

## 22. Definition of Done

### Model / Agent

- 既存4 custom agentsがすべて `gpt-5.6-luna` / `max`。
- `quality_gate_runner` が追加され `gpt-5.6-luna` / `max`。
- default subagent model / effortもLuna + max。
- silent fallbackなし。

### Orchestration

- Standard / Strictでparallel read-only researchを原則利用する。
- Parentがwork decomposition / Required Validation Set / integration / final judgmentを担当する。
- child recursionをtool-level優先で防止する。
- completed agentをphase終了時にcloseする。
- model-authored durable Run ArtifactはParent-only write。
- trusted harness machine-generated artifact updateは維持する。

### Writable Execution

- Write Parallel Capability Gateが実装される。
- workspace isolationが実証できた場合のみparallel writeを有効化する。
- isolation未証明ならserial fallbackする。
- serial fallbackでもPlan完了扱いにできる。
- unsafe parallelismをDoD達成のために強制しない。

### Quality Gate

- ParentがRequired Validation Setを確定する。
- implementation後に `quality_gate_runner` へhandoffできる。
- runnerがrequired tests / quality gatesを実行する。
- runnerはSourceを修正しない。
- Source Integrityをbefore / afterで検証する。
- failure classification / Evidence / not-run reasonを返す。
- failure時はparallel investigation + Repair Loopへ遷移できる。

### Harness

- `scripts/verify` / PowerShell parityが新contractを検証する。
- all-agent Luna + max invariantがmechanical gateになる。
- Current Codex config keyへ移行済み。
- child recursion enforcementが検証可能。

### Evidence

- actual Luna custom subagent spawnを確認済み。
- max configをCurrent CLIが受理することを確認済み。
- parallel read-only real runを確認済み。
- writable isolation capability decisionをEvidence化済み。
- quality gate runner real runを確認済み。
- required local validation PASS。
- required GitHub Actions PASS。

---

## 23. Implementation Start Gate

PR #16のMerge条件は満たされている。

Implementation開始前に以下を満たす。

- latest `main` を取得済み。
- PR #16後の `AGENTS.md` / `package.json` / harness / Agentic QA contractを再Baseline済み。
- Current Open PRとの変更競合を確認済み。
- Current OpenAI official Codex docsを再確認済み。
- Current Codex CLIがLuna / max / multi-agentを利用可能。
- Write Parallel Capability Gateの検証方法を決定済み。
- 実装用の新規Branchをlatest `main` から作成済み。
- 本PlanをImplementation Runのprimary planning referenceとして使用する。

---

## 24. Official Reference Baseline

Implementation時にはCurrent official documentationを再確認する。

最低限の参照対象:

- Codex Subagents documentation
- Codex Configuration Reference
- Codex Hooks documentation
- GPT-5.6 Luna model documentation
- GPT-5.6 model guidance / reasoning effort documentation

本Plan作成・レビュー時点で確認している重要事項:

- subagent workflowsはparallel exploration / tests / log analysis等のread-heavy taskに向いている。
- write-heavy parallel workflowsはconflict / coordination overheadへ注意が必要である。
- `agents.default_subagent_model` / `agents.default_subagent_reasoning_effort` が存在する。
- explicit spawn model / effortはdefaultより優先される。
- `agents.max_concurrent_threads_per_session` はprimaryを除くopen spawned-agent thread数を制限する。
- `agents.max_threads` はlegacy aliasである。
- `features.multi_agent` はmulti-agent collaboration toolsを制御する。
- `features.hooks` がCurrent keyであり `features.codex_hooks` はdeprecated aliasである。
- PreToolUse hookは `spawn_agent` をlocal function toolとして捕捉でき、`Agent` aliasにも一致する。
- `SubagentStart` の `continue: false` はsubagent開始を停止しない。
- GPT-5.6は `max` reasoning effortをサポートする。

---

## 25. Final Implementation Principle

本Planの最終目的は「agent数を増やすこと」ではない。

目指すのは以下である。

```text
Parent Agent
  = 判断・分解・Validation Set決定・統合・責任

GPT-5.6 Luna Subagents / max
  = 調査・実装・検証のbounded execution

Parallelism
  = 安全に独立できる作業のwall-clock短縮

Write Parallel Capability Gate
  = 並列writeの安全性をdisjoint pathだけでなくworkspace isolationまで含めて判定

Quality Gate Runner
  = Parent指定のRequired Validation Setを変更せず実行するvalidation responsibility

Repair Loop
  = Failure時だけEvidence駆動で再動員
```

subagentを使える箇所では積極的に使う。

ただし、**安全に分離できないwriteを並列化しない、検証者に修正させない、Required Validation Setをrunnerへ丸投げしない、machine-generated artifactとmodel-authored artifactを混同しない、観測できないruntime事実を観測済みと扱わない、親agentの最終責任をsubagentへ委譲しない**ことを同時に守る。
