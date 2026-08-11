# GPT-5.6 Luna Subagent Orchestration・並列実装・品質ゲート統合計画

## 0. このPlanと現在Branchの位置づけ

この文書は、Scenario Shop / `qa-training-store` のCodex実装運用を、**親agentによるオーケストレーション + GPT-5.6 Luna subagentによる積極的な並列調査・並列実装・品質ゲート実行**へ移行するための実装計画である。

現在の `docs/plan-luna-subagent-orchestration` Branchは、PR #16 `feat: 仕様SSOTとAgentic QA基盤を構築する` のMerge後の最新 `main` を基点とした**Documentation-only Branch**である。

このBranchでは以下を行わない。

- `.codex/agents/*.toml` の変更
- `.codex/config.toml` の変更
- `AGENTS.md` / Harness / Scriptの実装変更
- Application Code / Test Codeの変更
- CI Workflowの変更
- Product Behaviorの変更
- GitHub Actionsの実装検証

このBranchで変更するのは本Planのみとする。

本Planの実装は、最新 `main` から作成する**別のImplementation Branch**で行う。

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
  + subagent orchestration
  + integration review
  + final completion decision

Subagents
  = bounded investigation
  + bounded implementation
  + validation execution
  + failure investigation
```

Standard / Strict taskでは、subagentへ安全に委譲可能な作業を親agent自身が抱え込まず、**独立作業は原則としてsubagentへ委譲し、並列実行可能なら積極的に並列化する**。

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
5. `.codex/config.toml` にdefault subagent model / reasoning effortを設定し、将来追加されるgeneric subagentもLuna + maxを既定とする。
6. 親agentは、明示されたユーザー例外がない限り、spawn時に別model / reasoning effortへ上書きしない。
7. Standard / Strict taskでは、subagentを使える作業は積極的に委譲する。
8. 並列化できるread-only調査は原則並列化する。
9. writable実装も、write scopeが完全分離できる場合は積極的に並列化する。
10. 最終完了判定は親agentが行い、実装workerまたはquality gate runner自身の自己判定だけで完了扱いにしない。

### 1.3 Reasoning Effortについて

GPT-5.6 Lunaは `max` reasoning effortをサポートする。

本Planでは速度・token効率よりも、subagent単位の調査・実装・検証品質を優先し、Owner Decisionどおり全subagentを `max` に固定する。

ただし、`max` は低いreasoning effortよりlatency / token usageが増える可能性があるため、導入後の実Runでは以下をEvidenceとして記録する。

- subagent起動数
- 並列実行数
- wall-clock上の待ち時間傾向
- Repair Loop回数
- 同一Failure再試行回数
- quality gateの初回PASS率
- scope違反 / unexpected source mutationの有無

本Planでは自動的なeffort downgradeは導入しない。

---

## 2. Current Understanding

### 2.1 現在のCustom Agents

Current Repositoryには以下のproject-scoped custom agentsが存在する。

```text
.codex/agents/code_researcher.toml
.codex/agents/implementation_researcher.toml
.codex/agents/test_investigator.toml
.codex/agents/implementation_worker.toml
```

現在はいずれも `gpt-5.4-mini` / `medium` を利用している。

| Agent | Current responsibility | Write |
| --- | --- | --- |
| `code_researcher` | Codebase / dependency / impact investigation | No |
| `implementation_researcher` | Implementation approach / change surface investigation | No |
| `test_investigator` | Test / CI / flaky / missing coverage investigation | No |
| `implementation_worker` | Parentがscopeを確定した後の限定実装 | Yes |

### 2.2 Current Subagent Policy

Current `AGENTS.md` では、Standard / Strictの実装前にproject-scoped custom agentsを原則利用する方針がある。

また、writable subagentは原則1タスク1つで、完全に分離されたwrite scopeの場合だけparallel executionを許可している。

この安全思想は維持するが、本Planでは次を追加する。

- 「使ってよい」から「使える場合は原則使う」へ強化する。
- read-only investigationは独立観点を積極的にparallelizeする。
- implementation taskをWork Packageへ分解し、write setがdisjointなら複数 `implementation_worker` をparallelizeする。
- validationを新規 `quality_gate_runner` へ委譲する。
- gate failure時の原因調査も複数read-only agentへ再度parallelizeする。

### 2.3 Current Config

Current `.codex/config.toml` は概ね以下を持つ。

```toml
[features]
codex_hooks = true

[agents]
max_threads = 4
max_depth = 1
```

Current OpenAI Codex Configuration Referenceでは以下が正式キーとして定義されている。

```text
agents.enabled
agents.default_subagent_model
agents.default_subagent_reasoning_effort
agents.max_concurrent_threads_per_session
agents.max_threads  # legacy alias
features.hooks
features.multi_agent
```

`features.codex_hooks` はdeprecated aliasであり、`agents.max_threads` は `agents.max_concurrent_threads_per_session` のlegacy aliasである。

`agents.max_depth` はCurrent Configuration Referenceに確認できないため、本Planでは再帰spawn防止の安全境界として依存しない。

### 2.4 PR #16 Merge後のBaseline

PR #16は2026-08-11に `main` へMerge済みであり、本Plan BranchはそのMerge commitを含む最新 `main` から作成する。

Current baselineには以下が含まれる。

- Specification SSOT
- BR / AC validation
- Agentic Exploratory QA
- QA artifact contract
- `pnpm run verify`拡張
- `AGENTS.md`の品質ゲート完了契約
- Runtime / Contract test分離
- Run Artifact / Evidence運用

Implementation開始時は、さらにその時点の最新 `main` へrebaselineし、Open PRの競合を確認する。

---

## 3. Target Architecture

### 3.1 Standard / Strict Execution Flow

Target flowを以下に固定する。

```text
Parent orientation
  ↓
Parallel investigation
  ├─ code_researcher
  ├─ implementation_researcher
  └─ test_investigator
  ↓ join
Parent planning / dependency graph / write-set assignment
  ↓
Parallel bounded implementation when safe
  ├─ implementation_worker A
  ├─ implementation_worker B
  └─ implementation_worker C
  ↓ join
Parent integration review
  ↓
quality_gate_runner
  ├─ targeted validation
  ├─ canonical quality gate
  ├─ path-specific tests
  ├─ E2E / Native checks when applicable
  └─ structured result
  ↓
PASS → Parent final review → Complete
  │
  └─ FAIL
       ↓
     Parallel failure investigation
       ├─ test_investigator
       └─ code_researcher
       ↓ join
     Parent classification / Repair plan
       ↓
     implementation_worker(s)
       ↓
     quality_gate_runner revalidation
```

### 3.2 Parent Agent Responsibility

Parent agentは以下へ集中する。

- User intent / requirement解釈
- Current repository state確認
- Scope決定
- Plan / Task decomposition
- Dependency graph作成
- read / write set決定
- subagent dispatch
- subagent結果統合
- cross-worker consistency review
- Repair Loopへの遷移判断
- final completion decision
- `.codex/runs/**` の正式Run Artifact更新

親agentが直接実装するのは、以下に限定する。

- Lightweight task
- 分割コストの方が明らかに高い極小修正
- subagentへ安全にscopeを渡せない統合作業
- worker完了後に必要となった非常に小さいintegration fix

Standard / Strictで親agentが主要実装を直接行った場合は、その理由を `REPORT.md` に記録する。

---

## 4. Agent Model Contract

### 4.1 Explicit Custom Agent Pinning

以下すべてのagent TOMLで明示的にpinする。

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

`.codex/config.toml` に以下を設定する。

```toml
[agents]
enabled = true
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "max"
max_concurrent_threads_per_session = 6
```

これにより、role TOMLを明示しないgeneric subagentも原則Luna + maxを継承する。

Custom role側でもmodel / effortを明示する理由は以下。

- intentをfile単位で明確にする
- accidental default driftを防ぐ
- `scripts/verify` でcontract化しやすくする
- future config変更時にもrole contractを維持する

### 4.3 Override Policy

親agentまたはtask-specific workflowが以下を勝手に行ってはならない。

```text
spawn時に別modelを指定する
spawn時にmax以外のreasoning effortを指定する
agent TOMLからmodel / effort pinを削除する
```

例外は以下のみ。

- ユーザーが具体的なmodel / effort変更を明示した
- OpenAI側のmodel availabilityによりLunaが利用不能で、ユーザーがfallbackを承認した
- repository-wide migration planとして別途承認された

Luna利用不能時はsilent fallbackしない。

---

## 5. Agent Responsibilities

### 5.1 `code_researcher`

目的:

- related code / dependency / impact surface調査
- canonical source確認
- shared dependency確認
- hidden couplingの発見

契約:

- read-only
- 編集禁止
- 必要な証拠だけ返す
- implementation decisionを勝手に確定しない
- subagentをspawnしない

### 5.2 `implementation_researcher`

目的:

- requested changeに必要な具体的変更箇所を特定
- safe change surface整理
- implementation Work Package候補作成
- validation candidates整理

契約:

- read-only
- 編集禁止
- write set候補を親へ返す
- subagentをspawnしない

### 5.3 `test_investigator`

目的:

- existing tests / CI / contract / regression確認
- failure root-cause候補整理
- missing coverage確認
- required validation整理

契約:

- read-only
- test修正禁止
- flakyと断定する前にEvidenceを要求
- subagentをspawnしない

### 5.4 `implementation_worker`

目的:

- parentが確定したWork Packageだけを実装する
- minimal diffを維持する
- worker単位で独立したAcceptance Criteriaを満たす

契約:

- workspace-write
- parentが明示した `allowed-files` / `allowed-dirs` / `allowed-globs` 外を編集しない
- file delete / rename / move禁止
- git mutation禁止
- unrelated refactor禁止
- dependency / design ambiguityが出たら勝手に広げずparentへ返す
- `.codex/runs/**` を編集しない
- subagentをspawnしない

出力:

- changed files
- implementation summary
- decision points
- local validation executed
- unverified items
- scope adherence
- unexpected mutation有無

### 5.5 New `quality_gate_runner`

新規追加する。

目的:

- implementation後のrequired validationを実行する
- complete / fail / blockedをEvidence付きで返す
- failureを分類する
- 実装者とは別roleとしてvalidation independenceを確保する

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

が必要になる可能性があるため。

ただしSource Modificationは明確に禁止する。

禁止:

- Application Code編集
- Test Code編集
- Specification / Documentation編集
- `apply_patch` / edit operationによるtracked source変更
- git mutation
- failureの自動修正
- unrelated failureの即断
- skipped validationをPASS扱いすること
- subagent spawn

---

## 6. Quality Gate Runner Output Contract

最低限、親agentへ以下を返す。

```text
Status
- PASS
- FAIL
- BLOCKED

Executed
- command
- result
- relevant summary

Skipped
- command
- reason

Failures
- first abnormal event
- downstream failures
- classification
- evidence
- suspected relation to current changes

Source Integrity
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

Failure classificationは以下を初期標準とする。

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

根拠不足で `BASELINE` / `ENVIRONMENT` / `FLAKY_SUSPECTED` へ押し込むより、未確定を正直に返すことを優先する。

---

## 7. Parallelization Contract

### 7.1 Read-only Investigation

Standard / Strictでは、独立した調査観点が2つ以上存在する場合、原則parallel spawnする。

典型:

```text
code_researcher
implementation_researcher
test_investigator
```

親agentが全コードを先に調査し尽くしてからsubagentを呼ぶ運用は避ける。

Target:

```text
minimal parent orientation
→ parallel investigation
→ join
→ parent synthesis
```

### 7.2 Writable Implementation Parallelization

implementationをWork Packageへ分解し、安全条件を満たせば複数 `implementation_worker` をparallel spawnする。

例:

```text
WP-A: domain service + unit tests
WP-B: isolated UI component + component tests
WP-C: independent documentation / specification validator
```

### 7.3 Writable Parallelization Safety Conditions

以下をすべて満たす場合にparallel writeを許可する。

1. `allowed-files` / `allowed-dirs` / `allowed-globs` が重複しない。
2. 同じtracked fileを編集しない。
3. 同じgenerated outputを生成・更新しない。
4. 一方のworkerの変更結果を他方が実装中に必要としない。
5. shared schema / migration / lockfileを同時更新しない。
6. `.codex/runs/**` をworkerが編集しない。
7. 各Work Packageに独立したAcceptance Criteriaがある。
8. merge orderに意味がない、または親agentが明示的にdependency orderを管理できる。
9. cross-package formatter等が他workerのfileへtracked変更を発生させない。

1つでも不明ならserial executionへ落とす。

### 7.4 Parallelizationを目的化しない

目標は最大agent数ではない。

最適化対象は以下。

- parent context pollution低減
- independent workのwall-clock短縮
- evidence quality向上
- implementation / validation責務分離

共有fileを無理に分割し、integration costを増やすparallelismは禁止する。

---

## 8. Concurrency Configuration

### 8.1 Thread Limit

初期値は以下とする。

```toml
max_concurrent_threads_per_session = 6
```

想定:

```text
Research phase:
  3 read-only agents + spare capacity

Implementation phase:
  up to 3 bounded workers + auxiliary investigation

Failure phase:
  parallel investigator + bounded repair worker
```

初期導入で8以上へ上げない。

理由:

- Expo / Playwright / Native / package manager等の共有resource競合
- build / test実行によるCPU / memory contention
- tracked generated output競合
- 親agent側のintegration review負荷

### 8.2 Feature Keys

Current official keyへ寄せる。

```toml
[features]
hooks = true
multi_agent = true
```

- `features.codex_hooks` はdeprecated aliasのため `features.hooks` へ移行する。
- `features.multi_agent` はdefault onだが、repository intentを明示するため明記する。

### 8.3 Legacy Keys

以下をCurrent keyへ移行する。

```text
agents.max_threads
→ agents.max_concurrent_threads_per_session

features.codex_hooks
→ features.hooks
```

`agents.max_depth` はCurrent Configuration Referenceに存在しないため、再帰spawn防止のcontractには使用しない。

削除前にCurrent Codex CLIでconfig loadが正常であることと、repository scriptsがこのkeyをcontractとして参照していないことを確認する。

---

## 9. One-level Orchestration Contract

subagentがsubagentを再帰spawnする構造を禁止する。

Target hierarchy:

```text
Parent
  ├─ child
  ├─ child
  ├─ child
  └─ child
```

禁止:

```text
Parent
  └─ child
       └─ grandchild
```

`max_depth` のような未確認config keyへ依存せず、以下でcontract化する。

- `AGENTS.md`
- 各 `.codex/agents/*.toml` developer instructions
- `scripts/verify` contract
- 実Run Evidence

各custom agentへ次を明示する。

```text
Do not spawn, resume, or delegate to additional subagents.
Only the parent agent orchestrates subagent execution.
```

---

## 10. Run Artifact Ownership

### 10.1 Parent-only Durable Artifact Write

以下のdurable Run Artifactは親agentだけが更新する。

```text
.codex/runs/<run_id>/PLAN.md
.codex/runs/<run_id>/TASKS.md
.codex/runs/<run_id>/REPORT.md
.codex/runs/<run_id>/run.json
.codex/runs/<run_id>/evaluation.json
```

理由:

- parallel worker write conflict防止
- append-only `REPORT.md` 競合防止
- progress denominator破損防止
- single source of run decision維持

### 10.2 Subagent Evidence

subagentは親agentへ結果を返し、既存subagent observation / collection contractを通してEvidenceを集約する。

必要ならrun-localのmachine-readable subagent evidenceは既存schemaを再利用する。

新しい独自artifact formatは、既存 `subagent-run.schema.json` で表現不能な場合だけ追加検討する。

---

## 11. Failure / Repair Loop

### 11.1 Gate Failure

`quality_gate_runner` がFAILしたら親agentは即修正しない。

まず可能な範囲で以下をparallel investigationする。

```text
test_investigator
  → failure / test / CI contract analysis

code_researcher
  → current diff / dependency / causal relation analysis
```

必要なら `implementation_researcher` も追加する。

### 11.2 Parent Classification

親agentがEvidenceを統合し、次を決定する。

```text
CHANGE_CAUSED
→ current Repair Loop

BASELINE
→ causal independenceを証明し、別task候補として記録

ENVIRONMENT
→ reproducibility / environment evidenceを記録

HARNESS
→ harness improvementまたはrepairへ分岐

BLOCKED / UNKNOWN
→ human decisionまたは追加調査
```

### 11.3 Repair

修正対象が分離可能なら、Repairでも複数 `implementation_worker` をparallelizeしてよい。

修正後は必ず `quality_gate_runner` へ戻す。

### 11.4 Bounded Retry

既存のbounded Repair Loop思想を維持する。

最低限以下で無目的再試行を止める。

- 同一エラー2回連続
- 同じ工程3回失敗
- 新しいEvidenceなし
- 新しい仮説なし

停止後はroot-cause investigationまたはhuman decisionへ戻る。

---

## 12. Quality Gate Selection

### 12.1 Canonical Gate

Current Repositoryでは、通常のcanonical local gateとして `pnpm run verify` を使用する。

`verify` だけで全runtime validationが完結すると仮定しない。

### 12.2 Path-specific Additional Validation

変更scopeに応じて `quality_gate_runner` は追加検証を選択する。

例:

```text
Web behavior
→ Playwright Chromium E2E

Accessibility
→ a11y E2E

Responsive / mobile web boundary
→ mobile-boundary E2E

Specification
→ validate:spec / build:spec

Agentic QA runtime preparation
→ dedicated runtime test

Android Native
→ Native build/runtime/Maestro contract

iOS Native
→ Current ADRに従うBuild-only validation
```

何を実行すべきか不明な場合、`test_investigator` の調査結果を利用する。

### 12.3 Fail-close

- 未実行をPASS扱いしない。
- skipped gateには理由を必須とする。
- required gateがenvironment blockerならStatusはBLOCKEDとする。
- unrelatedと判断する場合もEvidenceを必須とする。

---

## 13. Lightweight Exception

Lightweight taskでは、以下のような明白な小変更についてsubagent省略を許可する。

- single file
- low risk
- no dependency impact
- no design ambiguity
- no cross-platform impact
- validationが単純

ただし、subagent省略理由を `REPORT.md` に記録する。

Lightweightを使って以下を回避してはならない。

- Standard / Strict相当の実装
- security / permission / sandbox変更
- public contract変更
- CI / build / Native基盤変更
- cross-cutting refactor

---

## 14. Codex Version / Availability Preflight

Implementation開始時に以下を確認する。

```bash
codex --version
```

確認項目:

- Current Codex CLIが `gpt-5.6-luna` を利用可能である。
- project-scoped subagent configがmodel / reasoning effortを受理する。
- `max` reasoning effortが実際に利用可能である。
- multi-agent toolsが利用可能である。
- `agents.default_subagent_model` / `agents.default_subagent_reasoning_effort` がCurrent CLIで有効である。

Lunaが利用不能ならsilent fallbackしない。

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

### Harness / Documentation

```text
docs/reference/codex-implementation-harness.md
docs/reference/subagent-observation.md
docs/reference/run-artifacts.md          # only if contract changes require it
```

### Validation Contract

```text
scripts/verify
scripts/verify.ps1
```

### Schema / Tests

必要性を再確認して以下を変更する。

```text
.codex/templates/subagent-run.schema.json
relevant harness / contract tests
```

不要ならschema追加や新しいvalidation frameworkは作らない。

---

## 16. `scripts/verify` Contract

Current harnessは `implementation_worker` のmodelまでhard-codeしているため、Luna migrationと同じPRで更新必須である。

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

可能ならagent名ごとの重複hard-codeではなく、`.codex/agents/*.toml` 全体を走査してInvariantとして検証する。

これにより将来agent追加時もLuna + max contractから逸脱したら品質ゲートが落ちる。

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

### 16.4 Safety Invariant

以下も検証する。

- implementation workerのscope restriction
- quality gate runnerのsource-edit禁止
- subagent recursion禁止
- parent-only Run Artifact ownership
- parallel writable scope separation rule

Bash / PowerShellのverify契約は同等にする。

---

## 17. Implementation Waves

### Wave 0 — Rebaseline / Preflight

latest `main` で以下を確認する。

- Current custom agent list
- Current `AGENTS.md`
- Current `.codex/config.toml`
- Current verify scripts
- Current subagent observation schema
- Current Repair Loop
- Current `pnpm run verify`
- Current Codex CLI / Luna availability
- Open PRとの競合

このWaveではProduct Codeを変更しない。

### Wave 1 — Model / Config Migration

実施:

- 既存4 custom agentsをLuna + maxへ変更
- `quality_gate_runner`追加
- default subagent model / effort追加
- concurrencyをCurrent keyへ移行
- `features.hooks` / `features.multi_agent`へ明示移行
- unsupported / stale config keyの扱いを確認

Validation:

- TOML parse
- Codex config load
- agent discovery
- Luna spawn smoke

### Wave 2 — Orchestration Contract

`AGENTS.md` / implementation harnessへ以下を実装する。

- parent orchestration responsibility
- parallel read-only investigation
- Work Package decomposition
- writable parallel safety conditions
- parent-only Run Artifact ownership
- no recursive subagents
- quality gate handoff
- failure investigation
- Repair handoff
- bounded retry
- Lightweight exception

### Wave 3 — Harness / Contract Validation

実施:

- `scripts/verify`
- `scripts/verify.ps1`
- relevant contract tests
- subagent observation docs/schema as needed

全agent Luna + max invariantをmechanical gateにする。

### Wave 4 — Real Multi-agent Execution Verification

TOML / static validationだけで完了しない。

Repository内の小さく安全な実タスクまたは専用fixtureを使い、実際に以下を1回以上通す。

```text
Parent
  ↓
3 parallel research agents
  ↓
join
  ↓
2+ parallel implementation workers with disjoint scopes
  ↓
join / integration review
  ↓
quality_gate_runner
```

実Application behaviorを無意味に変更するためのfixtureは作らない。

既存harness contractを利用して安全に再現できる方法を優先する。

### Wave 5 — Failure / Repair Execution Verification

可能なら意図的かつ安全なfixture failureを使って以下を確認する。

```text
quality_gate_runner FAIL
→ parallel investigators
→ parent classification
→ bounded repair worker
→ quality_gate_runner PASS
```

Product defectを人工的に残したままmergeしない。

### Wave 6 — Final Validation

最低限:

```text
repository harness verify
pnpm run verify
relevant contract tests
Codex multi-agent real run evidence
source integrity check
Run Artifact sanitizer
```

Current Required CIもすべてPASSさせる。

---

## 18. Real-run Acceptance Criteria

導入完了には以下をすべて満たす。

- [ ] `code_researcher` が `gpt-5.6-luna` / `max` でspawnされる。
- [ ] `implementation_researcher` が `gpt-5.6-luna` / `max` でspawnされる。
- [ ] `test_investigator` が `gpt-5.6-luna` / `max` でspawnされる。
- [ ] `implementation_worker` が `gpt-5.6-luna` / `max` でspawnされる。
- [ ] `quality_gate_runner` が `gpt-5.6-luna` / `max` でspawnされる。
- [ ] generic subagentがdefaultでLuna + maxを継承する。
- [ ] read-only agentを2つ以上parallel実行できる。
- [ ] write scopeが完全分離されたworkerを2つ以上parallel実行できる。
- [ ] worker同士が同じtracked fileを編集しない。
- [ ] workerが `.codex/runs/**` を編集しない。
- [ ] parentがworker join後にintegration reviewを行う。
- [ ] `quality_gate_runner` がrequired validationを実行する。
- [ ] `quality_gate_runner` がtracked sourceを変更しない。
- [ ] gate failureをstructured classificationできる。
- [ ] failure investigationをparallel subagentsへ委譲できる。
- [ ] Repair後にquality gate runnerへ戻る。
- [ ] child subagentがgrandchild subagentをspawnしない。
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
- すべてのtaskを無理にparallel化すること。
- writable workerへ共有fileの同時編集を許可すること。
- quality gate runnerへ自動修正権限を与えること。
- unlimited Repair Loop。
- silent model fallback。
- auto reasoning-effort downgrade。
- Product feature変更。

---

## 20. Risks and Mitigations

### Risk 1 — `max` によるlatency増加

Mitigation:

- Lunaのhigh-volume向け特性を利用する。
- 独立作業をparallel化する。
- task granularityを適切に保つ。
- 実Runでwall-clockとRepair回数を記録する。

### Risk 2 — Parallel write conflict

Mitigation:

- explicit write set
- disjoint scope requirement
- Run Artifact parent-only write
- shared config / lockfileのparallel edit禁止
- parent integration review

### Risk 3 — Context duplication

Mitigation:

- subagent promptにはtask-specific scopeだけ渡す。
- parentが必要最小限のcontextを委譲する。
- subagent結果はsummary + evidence中心にする。

### Risk 4 — Quality runner自身がsourceを直してしまう

Mitigation:

- agent developer instructionsでsource edit禁止
- pre/post working tree comparison
- verify contract
- unexpected source mutationならFAIL

### Risk 5 — Future agentが別modelへ戻る

Mitigation:

- config default Luna + max
- per-role explicit pin
- all `.codex/agents/*.toml` invariant validation

### Risk 6 — Unsupported / deprecated Codex config

Mitigation:

- Current official Config Referenceへ合わせる。
- legacy aliasをCurrent keyへ移行する。
- undocumented `max_depth` へ安全性を依存しない。
- real Codex CLI config-load / spawn testをDoDにする。

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
- Luna model confirmation
- max reasoning effort confirmation where observable
- parallel read-only spawn
- parallel disjoint write spawn
- quality gate runner execution
- failure classification
- Repair Loop handoff

### Repository Quality

- `pnpm run verify`
- change-scope-specific E2E
- Native validation when impacted
- Required GitHub Actions

### Integrity

- unexpected tracked file diffなし
- agent scope違反なし
- Run Artifact ownership違反なし
- no recursive subagents
- no git mutation by worker

---

## 22. Definition of Done

### Model / Agent

- 既存4 custom agentsがすべて `gpt-5.6-luna` / `max`。
- `quality_gate_runner` が追加され `gpt-5.6-luna` / `max`。
- default subagent model / effortもLuna + max。
- silent fallbackなし。

### Orchestration

- Standard / Strictでparallel researchを原則利用する。
- disjoint write scopeではparallel implementationを原則検討する。
- parentがwork decomposition / integration / final judgmentを担当する。
- subagent recursionを禁止する。
- Run Artifactはparent-only write。

### Quality Gate

- implementation後に `quality_gate_runner` へ必ずhandoffできる。
- runnerがrequired tests / quality gatesを実行する。
- runnerはSourceを修正しない。
- failure classification / evidence / skipped validationを返す。
- failure時はparallel investigation + Repair Loopへ遷移できる。

### Harness

- `scripts/verify` / PowerShell parityが新contractを検証する。
- all-agent Luna + max invariantがmechanical gateになる。
- Current Codex config keyへ移行済み。

### Evidence

- actual Luna subagent spawnを確認済み。
- parallel research実Runを確認済み。
- parallel implementation実Runを確認済み。
- quality gate runner実Runを確認済み。
- required local validation PASS。
- required GitHub Actions PASS。

---

## 23. Implementation Start Gate

PR #16のMerge条件はすでに満たされている。

Implementation開始前に以下を満たす。

- latest `main` を取得済み。
- PR #16後の `AGENTS.md` / `package.json` / harness / Agentic QA contractを再Baseline済み。
- Current Open PRとの変更競合を確認済み。
- Current Codex CLIがLuna / max / multi-agentを利用可能。
- 実装用の新規Branchをlatest `main` から作成済み。
- 本PlanをImplementation Runのprimary planning referenceとして使用する。

---

## 24. Final Implementation Principle

本Planの最終目的は「agent数を増やすこと」ではない。

目指すのは以下である。

```text
Parent Agent
  = 判断・分解・統合・責任

GPT-5.6 Luna Subagents / max
  = 調査・実装・検証のbounded execution

Parallelism
  = 独立作業のwall-clock短縮

Quality Gate Runner
  = 実装者とは分離されたvalidation responsibility

Repair Loop
  = Failure時だけEvidence駆動で再動員
```

subagentを使える箇所では積極的に使う。

ただし、**安全に分離できない作業を並列化しない、検証者に修正させない、親agentの最終責任をsubagentへ委譲しない**ことを同時に守る。
