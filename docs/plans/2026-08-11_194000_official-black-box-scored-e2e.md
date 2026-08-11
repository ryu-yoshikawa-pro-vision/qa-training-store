# Official Black-box Scored E2E 実装計画

## 0. このPlanとBranchの位置づけ

この文書は、PR #16で意図的に `BLOCKED / DEFERRED / NOT EXECUTED` とした **Official Black-box Scored E2E** を、安全・比較可能・監査可能な形で実行するための実装計画である。

現在の `docs/plan-official-black-box-scored-e2e` Branch は **Documentation-only Branch** とする。

このBranchでは以下を行わない。

- Application Code変更
- `scripts/agentic-qa/**` 実装変更
- Coding Agent / LLM Runtime実装
- Custom Agent Runner追加
- MCP Proxy / Tool Router追加
- GitHub Actions Workflow変更
- Challenge / Answer Key / Patch変更
- Product Bug修正
- Official Scored Run実行

本Planの実装は、Planレビュー・マージ完了後、最新 `main` から作成する別Implementation Branchで開始する。

---

## 1. Goal

Scenario ShopのBlack-box Scored Agentic QAについて、**Coding Agent自身がLearner-safe Exploratory QA Skillを使ってSource-free Runtimeを探索し、その結果をOfficial Scoreとして評価できる状態**を作る。

初期Scopeは **Webのみ** とする。

現在のBasic / Intermediate / Advanced ChallengeはすべてWeb対象である。Android / iOSのOfficial Black-box Scoredは本PlanのDoDへ含めない。

最終Execution Flow:

```text
Trusted Operator / Host Workflow
        │
        ▼
Instructor-side deterministic preparation
  ├─ Challenge / Answer Key / Patch validation
  ├─ Protected Infrastructure validation
  ├─ Learner-safe Input / Scored Skill packaging
  ├─ Baseline / Patched sanity
  ├─ Source-free Prepared Target Runtime
  └─ Canonical Runtime Artifact identity
        │
        ▼
Prepared Target Runtime Host
  └─ Runtime URL / allowed resource boundary
        │
        ▼
Fresh + Fresh-context Coding Agent Session
  ├─ read-only learner-safe input
  ├─ Host-trusted Tool Inventory
  ├─ Host-enforced Origin / Resource Boundary
  ├─ constrained runner output
  └─ Host-trusted Budget Counter
        │
        ▼
Trusted Initial State Bootstrap
  ├─ Seed
  ├─ Role / Session
  ├─ Initial Route
  └─ trusted receipt
        │
        ▼
Coding Agent + Learner-safe Scored Skill
  ├─ Runtime exploration
  ├─ Evidence collection
  └─ Atomic Findings
        │
        ▼
Deterministic Output Import / Freeze
        │
        ▼
Deterministic Separate Evaluator Execution
        │
        ▼
evaluation.json / metrics
```

最重要原則:

> **QAの実行主体はCoding Agent + Exploratory QA Skillであり、Repository Scriptではない。**

`scripts/agentic-qa/**` はPreparation / Validation / Isolation Verification / Artifact Import / Artifact Integrity / Evaluation / Scoringだけを担当する。

HarnessはAgentをlaunch / wrap / orchestrate / retry / manageしない。

---

## 2. Success Criteria

最低1 Challengeについて以下を完走し、その後Basic / Intermediate / Advancedを同じContractで実行できることを確認する。

```text
Host Capability Gate PASS
→ Preparation
→ Protected Infrastructure PASS
→ Source-free Prepared Runtime ready
→ Fresh + Fresh-context Session
→ Host-trusted Tool / Context / Budget evidence
→ Trusted Initial State
→ Skill exploration
→ Frozen Runner Artifact
→ Deterministic Evaluator
→ valid_for_scoring=true
```

Official verificationが1つでも未証明ならScoreを有効化しない。

---

## 3. Non-goals

本Planでは以下を作らない。

- Repository独自LLM API Wrapper
- `codex exec`等をScriptから呼ぶAgent Wrapper
- Repository独自Agent Process Manager
- Repository独自Session Manager
- Repository独自Sub-agent Runtime
- MCP Proxy / Gateway / Tool Router
- Remote Sandbox Platform
- Ranking / Leaderboard Platform
- Benchmark SaaS
- Agent Job Queue
- AI QAのRequired CI Gate化
- Product Bug自動修正
- QAとRepairの自動連結
- Native Official Scored E2E
- pretraining contaminationが0であることの保証

Host Runtimeが必要Capabilityを提供できない場合、Repository側で上記を作って回避しない。

---

## 4. Current Baseline

PR #16マージ時点で以下は存在する。

- `docs/spec/**` Specification SSOT
- BR / AC stable ID
- Learner-safe Specification Bundle
- `.agents/skills/exploratory-qa/SKILL.md`
- Normal / Gray-box / Black-box Scored Mode Contract
- Challenge Definition
- Instructor Answer Key
- Instructor-only Unified Diff Patch
- Benchmark Revision / Identity
- Runner Profile
- Tool Profile
- isolated execution root
- Forbidden Capability Probe
- Actual Tool Scope Contract
- Fresh Session Contract
- Frozen Findings Contract
- Deterministic Evaluator
- Contract Fixture
- Required CI / Runtime Preparation test

既存Trust Boundaryを弱体化しない。

---

## 5. What “Official” Guarantees

Official Black-box Scoredが保証するのは **実行時Information Boundary** である。

Runner実行中に以下へアクセスできないことをHost / trusted layerで保証する。

- Source Repository
- `.git`
- Existing / Hidden Tests
- Challenge Patch
- Answer Key
- Previous Scored Findings / Evaluation
- Arbitrary External Search / Fetch
- Build Artifact direct read
- Web Bundle direct read
- Source Map
- Generic Shell
- arbitrary Browser Evaluate
- Network Response Body inspection
- Prior Scored Session Context

Official Scoredでも以下は自動保証しない。

- Model training dataへのBenchmark非混入
- Provider側での過去Knowledge完全不存在
- 公開Benchmark contaminationが0であること

本Planの「未知不具合」は、**実行時にInstructor-only情報を与えず、Fresh ContextとTool Isolation下でRuntimeから探索する**という意味で使用する。

---

## 6. Architecture Invariants

### 6.1 Execution Ownership

```text
Primary QA Executor
=
Coding Agent + Learner-safe Scored Skill
```

### 6.2 Handoff Owner

全工程をつなぐOwnerはRepository Harnessではなく **Trusted Operator / Host Workflow** とする。

初期実装はHuman Operatorの明示handoffでもよい。

```text
prepare
→ Fresh Session create
→ Initial State bootstrap
→ Runner execute
→ output import / freeze
→ deterministic evaluate
```

### 6.3 Harness Responsibilities

```text
Preparation
Contract validation
Protected patch validation
Runtime hosting
Isolation verification
Artifact import / freeze
Artifact integrity
Evaluation / scoring
```

### 6.4 Harness Prohibitions

- Coding Agent launch
- Model API call
- Agent Process監視
- Agent retry
- Agent Tool Call proxy
- Agentへの逐次命令
- Agent Reasoning取得

### 6.5 Evaluator

Evaluatorは別LLM Agent Sessionではない。

原則として既存 `evaluate.ts` 系の **Deterministic Evaluator** を、Runner終了・Artifact Freeze後に実行する。

---

## 7. Host Capability Gate

Repository実装前のWave 0で、以下のCapability Matrixを**実測**する。

| Capability | Available | Trusted Source | Machine-readable | Enforceable | Evidence shape |
|---|---|---|---|---|---|
| Fresh Session | | | | | |
| Fresh Context / no inheritance | | | | | |
| Session identity / audit artifact | | | | | |
| Model / configuration identity | | | | | |
| Actual Tool Scope inventory | | | | | |
| Tool allow / deny | | | | | |
| Origin allowlist | | | | | |
| Runtime Resource Boundary | | | | | |
| isolated root | | | | | |
| constrained output write | | | | | |
| Trusted Bootstrap Operations | | | | | |
| trusted reset/session receipt | | | | | |
| duration accounting | | | | | |
| top-level tool action accounting | | | | | |

必要Capabilityが1つでも満たせなければWave 1以降へ進まない。

```text
sufficient
→ implementation start

insufficient
→ Official Run = BLOCKED
→ Custom Runnerを作らず終了
```

---

## 8. Fresh Session / Fresh Context Contract

Session IDが新しいだけではOfficialにならない。

Host-trusted evidenceで最低限以下を証明する。

```text
session_id
session_created_at
session_artifact_identifier
model_identifier
model_configuration_identifier
host_identifier
host_profile_revision
fresh_session_proof
fresh_context_proof
parent_context_inherited=false
prior_conversation_inherited=false
repository_context_inherited=false
prior_scored_session_context_inherited=false
```

Hostから証明できない値をRepository側で推測して `false` へ設定しない。

Source-aware親Agentから子Agentをspawnする方式は、Hostが上記no-inheritanceをtrusted evidenceで証明できない限りOfficial不可。

---

## 9. Learner-safe Input / Skill Contract

Fresh Runnerへ渡してよいもの:

- Learner-safe Specification Bundle
- Challenge learner-facing definition
- Challenge Runbook
- Learner-safe Scored Skill Snapshot
- Runtime URL / runtime variant / allowed origins
- Required Initial State Definition
- Exploration Runtime Controls
- Exploration Budget / Stop Condition
- Output Contract

渡してはいけないもの:

- Repository Root / Source path
- `.git`
- Existing / Hidden Tests
- Answer Key
- Challenge Patch
- Ground Truth
- Instructor-only Benchmark metadata
- Evaluator config
- Prior Findings / Evaluation

### 9.1 Canonical Scored Skill

Preferred initial design:

```text
training/agentic-qa/skills/scored-v1.md
```

Source-free Runnerだけで理解できる自己完結Skillとする。

`QA_AGENT.md` やRepository内ReferenceをRequired Readingにしない。

PreparationでExact bytesをfreezeし、

```text
skill_revision = sha256:<64 lowercase hex>
```

をRunner Profileへ記録する。

### 9.2 Learner-safe Input Manifest

Runnerへ渡したexact input bytesをManifest化する。

```json
{
  "schema_version": 1,
  "run_id": "YYYYMMDD-HHMMSS-JST",
  "challenge_id": "CHALLENGE-BASIC-001",
  "spec_bundle_sha256": "...",
  "challenge_sha256": "...",
  "runbook_sha256": "...",
  "skill_revision": "sha256:...",
  "output_contract_revision": "sha256:..."
}
```

ManifestとRunner-visible bytesが一致しなければOfficial invalid。

---

## 10. Benchmark / Runner Identity

### 10.1 Benchmark Revision

Benchmark Revisionは **何を評価したか** を表す。

Canonical revision inputへ含める。

- source head / working tree input
- learner-safe Specification entries
- Challenge Definition
- Instructor Answer Key
- Challenge Patch
- Challenge Runbook

**Runtime VariantはBenchmark Revision digestへ含めない。**

Runtime VariantはBenchmark Identityの独立dimensionである。

この分離はclean / dirty working treeで一貫して適用する。

### 10.2 Benchmark Identity

```text
Benchmark Identity
=
challenge_id
+ benchmark_revision
+ runtime_variant_id
```

### 10.3 Runner Profile

Runner Profileは **どの実行条件で評価したか** を表す。

最低限:

```text
model
model_configuration_identifier
skill_revision
tool_profile_revision
output_contract_revision
host_profile_revision
max_duration_seconds
max_tool_actions
stop_condition
```

### 10.4 Same-condition

```text
same Benchmark Identity
AND same Prepared Target artifact_sha256
AND same Runner Profile
```

で同条件とする。

同一dirty benchmarkでRuntime Variantだけを変えた場合も、

```text
benchmark_revision = SAME
benchmark_identity = DIFFERENT
```

でなければならない。

---

## 11. Runtime Variant Contract

Officialでは `runtime_variant_id` をnon-null必須にする。

初期Web ScopeではCanonical Registryを持つ。

例:

```text
web-chromium-desktop-v1
web-chromium-tablet-v1
```

各Variantは最低限以下へbindする。

```text
platform
browser_engine
viewport_or_device
canonical viewport dimensions or profile
```

Evaluatorは以下の一致を検証する。

```text
Challenge Coverage viewport_or_device
=
Runtime Variant viewport_or_device
=
Host-reported actual browser configuration
```

例えばAdvanced Challengeの `tablet` をDesktop Variantで実行したRunはOfficial invalid。

---

## 12. Canonical Artifact Hash Contract

Directory自体へ直接hashを定義せず、Canonical File Manifestを使う。

```json
{
  "schema_version": 1,
  "files": [
    {"path": "assets/app.js", "sha256": "..."},
    {"path": "index.html", "sha256": "..."}
  ]
}
```

Rules:

1. Regular Fileのみ対象。
2. Artifact RootからのPOSIX relative path。
3. `..` / absolute path / backslash禁止。
4. Symlink原則禁止。
5. raw bytesへSHA-256。
6. `files[]`をpathのcode-unit昇順でsort。
7. mtime / owner / permission等を除外。
8. Canonical JSON serializationを固定。
9. `artifact_sha256 = sha256(canonical manifest bytes)`。

同一AlgorithmをPrepared TargetとFrozen Runner Artifactへ使用する。

Hash mismatchはOfficial invalid。

---

## 13. Source-free Prepared Runtime

Scenario Shop Webではpatched Disposable Sourceから生成した `dist/**` をPrepared Runtime Artifactとして使用する。

```text
.artifacts/agentic-qa/<run_id>/trusted/prepared-target/
  target-runtime.json
  artifact-manifest.json
  web-dist/**
```

Agent isolated rootへRuntime Artifact bytesを置かない。

Runnerへ与えるのはURLとlearner-safe Runtime metadataだけ。

### 13.1 Runtime Identity

`target-runtime.json` 最低限:

```json
{
  "schema_version": 1,
  "run_id": "...",
  "challenge_id": "...",
  "benchmark_revision": "...",
  "runtime_variant_id": "web-chromium-desktop-v1",
  "artifact_sha256": "...",
  "source_head_sha": "...",
  "patch_sha256": "...",
  "source_cleanup_completed": true
}
```

### 13.2 Source Cleanup

Runner公開前に以下を確認する。

- Disposable Source削除
- `.git`不在
- Existing / Hidden Test不在
- Challenge Patch不在
- Answer Key不在
- Source Map不在
- Agent rootにRuntime Artifact bytes不在

### 13.3 Runtime Lifecycle

```text
canonical hash verify
→ runtime start
→ readiness PASS
→ URL / Origin確定
→ Runner execution
→ output import / freeze
→ runtime stop
```

Runner成功・失敗にかかわらずRuntime stopを保証する。

---

## 14. Runtime Origin / Resource Boundary

Origin Allowlistだけでは不十分である。

同一OriginのJS bundleへAgentが直接Navigate / Readできる場合、Compiled Implementationを観測できるため `web_bundle = forbidden` と矛盾する。

Official Runnerで許可するもの:

- user-facing application navigation
- Application表示のためBrowser内部が行う通常subresource load
- approved Test Control endpoint / capability

禁止するもの:

- JS bundle direct navigation / direct read
- CSS等implementation resourceのdirect source read
- Source Map
- raw manifest / internal build metadata direct read
- Network Response Body inspection
- arbitrary raw HTTP fetch

Host Tool Boundaryで最低限以下をnegative probeする。

```text
/assets/*.js direct read → unavailable
*.map → unavailable
raw response body → unavailable
arbitrary fetch → unavailable
```

MCP Proxyを新規実装しない。HostがこのBoundaryを保証できなければOfficial RunはBLOCKED。

---

## 15. Challenge Patch / Protected Infrastructure Contract

Challenge Patchは **Product Defect Injection** だけに使用する。

Wave 0でMachine-readable Protected Path Setを確定する。

最低限以下の責務を持つPathを保護する。

- `scripts/agentic-qa/**`
- `training/agentic-qa/tool-profiles/**`
- `training/agentic-qa/skills/**`
- Answer Key / Benchmark machinery
- Scored Output Contract
- Test Control implementation
- Seed / Session bootstrap infrastructure
- Prepared Runtime server infrastructure
- Evaluator infrastructure
- Agentic QA contracts / validation

Preparation前に、

```text
patch_paths ∩ protected_paths = empty
```

を機械検証する。

さらにparent traversal / absolute path / symlink escape / Protected Path rename-delete-addをrejectする。

完全なStatic Security Scannerは作らない。

---

## 16. Bootstrap OperationsとExploration Controlsの分離

**Trusted Bootstrap Operations と Challenge `allowed_runtime_controls` を同じものとして扱わない。**

### 16.1 Trusted Bootstrap Operations

Initial State成立のためのPre-run infrastructure operation。

Runner探索用Toolではない。

最低限:

```text
seed_reset
session_reconcile
initial_route_normalize
```

Coverage + Canonical Seed Metadataから決定的にderiveし、Trusted Operator / Host Workflowまたはtrusted adapterがExploration開始前に実行する。

内部実装が `window.__TEST_API__` やBrowser evaluateを使ってもよいが、Runnerへarbitrary `browser_evaluate`をExposeしない。

各Operationはtrusted `operation_id`を返す。

### 16.2 Exploration Runtime Controls

探索開始後にRunnerが使えるControlは既存Challenge `allowed_runtime_controls`を正本とする。

現行Contract:

```text
seed_reset
clock
payment_delay
deep_link
app_restart
```

`session_set_or_clear` 等を探索用Runtime Controlへ追加しない。

Session reconciliationはBootstrap infrastructure責務とする。

### 16.3 Exploration-time `seed_reset` Contract

Official Scoredで探索開始後にRunnerが `seed_reset` を呼べる場合、その意味を**raw Seed Resetではなく、Current Single Initial State Groupのatomic re-bootstrap**に固定する。

```text
Runner top-level call:
approved_test_control.seed_reset()
        ↓
trusted adapter:
raw seed_reset(current seed)
→ session_reconcile(current required role)
→ initial_route_normalize
→ Current Initial State Group invariant verify
        ↓ PASS
Runnerへ制御を返す
```

Current Initial State Group invariantとして最低限以下を再確認する。

```text
seed == required seed
role == required role
session requirement == required session requirement
viewport_or_device == current Runtime Variant / Challenge requirement
initial route is learner-safe and valid for the current group
```

Basicでは `suspended-user` のraw resetがauthenticated suspended Sessionを生成しても、`guest`要件へ再reconcileしてからRunnerへ戻す。

Intermediateでは `orders-phase1-statuses + operator`、Advancedでは `default + guest` を同じ一般Contractで再成立させる。

Agent視点では `seed_reset` は1 top-level Tool Actionであり、Adapter内部のreset / reconciliation / validationを追加Tool Actionとしてcountしない。

探索中re-bootstrapのtrusted logには最低限以下を残す。

```text
operation_id
runner_session_id
initial_state_group_identity
requested_seed
required_role
observed_role
session_invariant_passed
route_invariant_passed
runtime_variant_invariant_passed
completed_at
```

Initial State Receipt自体を探索中resetのたびに増やす必要はない。最初のOfficial Initial State Receiptを正本とし、探索中の再BootstrapはHost-side trusted operation logへ記録する。

再Bootstrap後にCurrent Initial State Groupを完全に再成立できない場合は、Role / Session不一致のまま探索を継続してはいけない。

```text
re-bootstrap invariant PASS
→ exploration continue

re-bootstrap invariant FAIL
→ stop_reason = environment_blocked
→ Official Run invalid / valid_for_scoring=false
```

---

## 17. Official v1 Initial State Contract

### 17.1 Initial State SSOT

Initial StateはSeedだけではなく以下で決まる。

```text
coverage.seed
coverage.role
coverage.viewport_or_device
Canonical Seed Metadata.initialSession
Canonical Seed Metadata.safeResetPath
```

Challenge ID固有 `if` 分岐を正本にしない。

### 17.2 Official v1制約: Single Initial State Group

v1では1 Challenge内の全Required Coverageが **同一Initial State Group** を使うことを要求する。

```text
Initial State Group
=
seed
+ role
+ session requirement
+ viewport_or_device
```

Coverage Itemは複数あってよいが、途中でSeed / Role / Session / Viewportを切り替えない。

現在のBasic / Intermediate / Advancedは各Coverage 1件なのでこの制約で問題ない。

複数Initial State Groupを1Runで切り替える機能は将来Scopeとする。

これによりPauseable Budget Timer等を実装しない。

### 17.3 Generic Bootstrap

```text
seed_reset
→ Role / Session reconciliation
→ Initial route normalization
→ trusted state observation
→ receipt freeze
→ exploration budget start
```

Role / Session最低ルール:

```text
role == guest
→ session_present=false

role == customer/operator/admin
→ session_present=true
→ observed_role == requested_role
```

Basic `suspended-user + guest` はSeedがCustomer Sessionを生成してもBootstrapでclearする。

Intermediate `orders-phase1-statuses + operator` はoperator Sessionを成立させる。

Advanced `default + guest` はguest状態を成立させる。

### 17.4 Initial State Receipt

v1ではSingle Initial State Groupだが、ContractはCoverage bindingを保持する。

```json
{
  "schema_version": 1,
  "run_id": "...",
  "challenge_id": "...",
  "coverage_ids": ["COV-001"],
  "runner_session_id": "...",
  "requested_seed": "suspended-user",
  "requested_role": "guest",
  "observed_role": "guest",
  "session_present": false,
  "initial_path": "/login",
  "reset_operation_id": "...",
  "session_operation_id": "...",
  "target_runtime_artifact_sha256": "...",
  "runtime_variant_id": "...",
  "runtime_url_origin": "...",
  "completed_at": "..."
}
```

ReceiptはRunnerが自己生成しない。

trusted Test Control / Host Adapter / deterministic layerがOperation結果から生成する。

Cross-session / wrong runtime / wrong role / stale receiptをrejectする。

---

## 18. Runner Input / Output Contract

Runner root:

```text
isolated-run-root/
  input/      # learner-safe read-only
  output/     # constrained write only
```

Runnerは `output/**` 以外へwriteできない。

必要ならTool Profileへ `runner_output_write` を追加するが、これはGeneric File WriteではなくHostによるpath-confined write capabilityとする。

禁止:

- Parent traversal
- Symlink escape
- Absolute path
- Repository write
- Trusted artifact write
- Arbitrary shell

---

## 19. Runner Evidence Mapping Contract

現行Evidence Contractは `.artifacts/**` canonical refを正本としている。

Runner physical filesystemとfinal canonical Evidence Refを1:1 mappingする。

例:

```text
physical runner path:
output/evidence/COV-001/login.png

canonical evidence ref:
.artifacts/agentic-qa/<run_id>/runner/evidence/COV-001/login.png
```

Output ContractはRunnerへ **canonical final ref prefix** を事前に渡す。

Runnerは `qa-findings.json` に最初からcanonical final refを書く。

Harness ImporterはFinding bytesを書き換えない。

Importerは、

```text
canonical ref
↔ expected physical output path
```

の対応を検証し、physical fileを`.artifacts/**`へcopy/importする。

Screenshot等のHost Runtime ToolもこのMappingへ従う必要がある。

Mapping mismatch / missing physical file / path escapeはOfficial invalid。

---

## 20. Artifact Ownership / Tamper Boundary

| Artifact | Trusted Writer / Owner | Runner write |
|---|---|---|
| Challenge / Answer Key / Patch | Instructor Repository | No |
| Benchmark Manifest | Preparation Harness | No |
| Learner-safe Input Manifest | Preparation Harness | No |
| Prepared Runtime Identity | Preparation Harness | No |
| Runner Session Evidence | Host Runtime | No |
| Actual Tool Inventory | Host Runtime | No |
| Forbidden Probe | Host / trusted isolation layer | No |
| Initial State Receipt | trusted bootstrap layer | No |
| Runner Execution Summary | Host Runtime | No |
| `qa-findings.json` | Runner | constrained |
| Runtime Evidence | Runner Runtime Tool | constrained |
| Frozen Runner Artifact Manifest | Harness | No after freeze |
| `evaluation.json` | Deterministic Evaluator | No |

Directory / Permissionでも分離する。

```text
.artifacts/agentic-qa/<run_id>/
  trusted/**
  runner/**
  evaluation/**
```

---

## 21. Fresh Runner Session Artifact

既存 `runner-session.json` を拡張し、最低限以下をtrusted sourceから記録する。

- current session id
- prior Runner session ids
- fresh session / fresh context proof
- no parent / repository / prior scored context inheritance
- model identifier / model configuration
- host identifier / host profile revision
- Benchmark Revision
- Runtime Variant
- Prepared Target artifact hash
- Actual Tool Scope
- Forbidden Probe
- Tool Profile revision
- Skill revision
- Output Contract revision

Official verificationではRepository自己申告値ではなくHost-trusted sourceを要求する。

---

## 22. Budget / Stop Contract

### 22.1 Budgeted Tool Action

`1 Tool Action`:

> Exploration開始後にHostがRunner要求としてdispatchした1 top-level **budgeted exploration tool invocation**。

Rules:

- 成功 / 失敗ともcount。
- Initial State Bootstrap / readinessはcount外。
- Host内部retryはRunner新規callでなければcount外。
- Runner明示retryは別Action。
- Exploration-time `seed_reset` はRunner視点の1 top-level Actionとして1回だけcountし、内部re-bootstrap処理は追加countしない。
- **final `runner_output_write` / final result flushはBudget外。**

Budget exhausted後は、

```text
runtime exploration tools → disabled
final output / result flush → permitted
```

とする。

これによりBudgetを使い切っても`qa-findings.json`を確実に保存できる。

### 22.2 Duration

Host monotonic wall-clockで、

```text
exploration_started_at
→ exploration_terminal_stop
```

を測る。

Bootstrap / Preparation / final output flush時間は含めない。

探索開始後にRunnerが実行した `seed_reset` のatomic re-bootstrapは、そのtop-level探索Actionの実行時間としてDurationへ含める。Pre-run Bootstrapとは区別する。

### 22.3 Runner Execution Summary

```json
{
  "schema_version": 1,
  "run_id": "...",
  "runner_session_id": "...",
  "exploration_started_at": "...",
  "exploration_ended_at": "...",
  "duration_seconds": 412,
  "tool_actions": 83,
  "stop_reason": "required_coverage_and_candidates_resolved"
}
```

Canonical Stop Reason:

```text
required_coverage_and_candidates_resolved
budget_duration_exhausted
budget_tool_actions_exhausted
environment_blocked
runner_failed
operator_cancelled
```

既存 `STOP_CONDITION = required_coverage_and_candidates_resolved_or_budget_exhausted` と意味を合わせる。

Runner自己申告counterをtrusted metricにしない。

---

## 23. Deterministic Output Import / Freeze

Runner終了後、Harnessがconstrained outputをDeterministic Importする。

検証:

- path confinement
- canonical Evidence mapping
- Schema
- Required Coverage
- current-run Evidence
- Atomic Finding
- physical evidence existence
- Canonical Artifact Manifest

Freeze後にCanonical hashを記録し、post-freeze mutationをrejectする。

EvaluatorはFrozen Runner Artifactを書き換えない。

---

## 24. Deterministic Evaluator Contract

Runner終了・Freeze後にInstructor-sideで実行する。

Evaluator inputs:

- Frozen `qa-findings.json`
- Frozen Evidence
- Challenge
- Answer Key
- Benchmark Manifest
- Learner-safe Input Manifest
- Runtime Variant definition
- Target Runtime Identity / Artifact Manifest
- Tool Profile bytes
- Runner Session Evidence
- Actual Tool Inventory
- Forbidden Probe
- Initial State Receipt
- Runner Execution Summary
- Frozen Runner Artifact Manifest / hash
- Exploration-time trusted control operation log when runtime controls were used

Validation order:

```text
Schema
→ Benchmark Revision / Runbook
→ Runtime Variant / actual browser condition
→ Prepared Runtime identity / canonical hash
→ Runner Profile / Skill / Output Contract
→ Fresh Session / Fresh Context
→ Tool Profile / Actual Tool Scope
→ Origin / Runtime Resource Boundary
→ Forbidden Probe
→ Initial State / Role / Session binding
→ Exploration-time runtime-control invariant when used
→ Budget / Stop accounting
→ Evidence mapping / Frozen Artifact integrity
→ Required Coverage
→ Ground Truth
→ Scoring
```

Official verification failure時は `valid_for_scoring=false`、metricsは有効値にしない。

---

## 25. Official Artifact Set

```text
.codex/runs/<run_id>/
  challenge reference
  learner-safe-spec-bundle.json
  benchmark-manifest-<challenge_id>.json
  runner-profile.json
  qa-findings.json or frozen ref
  evaluation.json
  REPORT.md

.artifacts/agentic-qa/<run_id>/
  trusted/
    learner-safe-input-manifest.json
    runtime-variant.json
    target-runtime.json
    prepared-artifact-manifest.json
    runner-session.json
    forbidden-probe.json
    initial-state-receipt.json
    runner-execution-summary.json
    runtime-control-operations.json
    prepared-target/**
  runner/
    qa-findings.json
    evidence/**
    frozen-runner-artifact-manifest.json
  evaluation/
    evaluator-execution.json
```

`runtime-control-operations.json` は探索中Runtime Controlが使われた場合のtrusted operation logとし、未使用時は空配列または明示的な未使用状態をMachine Contractで固定する。

不要な別Rootは増やさない。

---

## 26. Implementation Start Gate

### Repository Gate

- PR #16 merged
- latest `main` で `pnpm run verify` PASS
- Required CI PASS
- Current Spec / Skill / Agentic QA Contract一致
- Basic / Intermediate / Advanced validation PASS
- Current Seed Metadata / Coverage Role / Viewport整合確認

### Host Gate

- Fresh Session
- Fresh Context / no inheritance
- trusted session/model/host identity
- Actual Tool Scope
- allow / deny enforcement
- Origin Boundary
- Runtime Resource Boundary
- isolated root
- constrained output
- Trusted Bootstrap Operations
- trusted Initial State receipt
- exploration-time `seed_reset` atomic re-bootstrap / invariant evidence
- duration / budgeted top-level tool action accounting

未達ならRepository Implementationを開始しない。

---

## 27. Implementation Waves

### Wave 0 — Rebaseline / Host Capability Spike

コード変更前に事実を確定する。

- latest main rebaseline
- Challenge validation
- Seed / Role / Viewport整合
- Host Capability Matrix
- Fresh Context
- Tool Inventory
- Origin / Resource Boundary
- constrained output
- Trusted Bootstrap Operations
- Exploration-time `seed_reset` re-bootstrap feasibility
- Evidence Mapping feasibility
- Budget accounting
- Protected Path candidate棚卸し

Exit:

```text
sufficient → Wave 1
insufficient → BLOCKED / STOP
```

### Wave 1 — Machine / Identity / Ownership Contracts

追加・拡張候補:

- Prepared Runtime schema
- Canonical Artifact Manifest schema
- Learner-safe Input Manifest
- Runtime Variant Registry / schema
- Initial State Receipt
- Runtime Control Operation Log schema
- Runner Session Fresh Context fields
- Runner Execution Summary
- Frozen Runner Artifact schema
- Evaluator Execution Receipt
- Runner Profile Skill / Output / Host / Model config revision
- Benchmark Manifest Runbook entry
- Benchmark Revision runtime_variant exclusion
- Tool Profile `runner_output_write`
- Protected Path Contract
- Origin / Resource Boundary Contract
- Evidence Mapping Contract

必須negative tests:

- missing fresh context
- unmeasured tool scope
- unsafe unknown capability
- origin/resource boundary missing
- Skill / Output revision missing
- dirty benchmark Runtime Variant change alters revision → FAIL
- Runtime Variant actual viewport mismatch
- wrong Initial State Role / Session
- cross-session receipt
- exploration-time seed_reset leaves wrong role/session → FAIL
- exploration-time seed_reset invariant evidence missing when reset used → FAIL
- Budget receipt missing
- Patch touches Protected Infrastructure
- Evidence physical/canonical mapping mismatch
- unsorted artifact manifest

### Wave 2 — Learner-safe Skill / Input Packaging

- Canonical Scored Skill
- Skill SHA-256
- Runbook SHA-256
- Output Contract revision
- Input Manifest
- `input/**` read-only packaging
- Instructor-only content混入検査

Exit: Runner inputだけでScored workflowを理解できる。

### Wave 3 — Source-free Runtime / Canonical Hash / Protected Patch

1. Disposable Source
2. Protected Path validation
3. Baseline Build / Sanity
4. Patch Apply
5. Patched Build / Sanity
6. `dist/**` copy
7. prohibited artifact検査
8. Canonical File Manifest / hash
9. Disposable Source cleanup
10. Runtime start from Prepared Artifact only
11. hash reverify
12. readiness
13. Runtime Variant / Origin確定
14. cleanup test

### Wave 4 — Trusted Initial State Bootstrap

- v1 Single Initial State Group validation
- Seed / Role / Viewport derive
- Trusted Bootstrap Operations
- guest session clear / authenticated session establish
- Initial Route normalize
- trusted operation IDs
- state observation
- receipt generation / binding

Exit:

- Basic `suspended-user + guest` generic PASS
- Intermediate `orders-phase1-statuses + operator` generic PASS
- Advanced `default + guest + tablet` generic PASS

### Wave 5 — Host-native Fresh Runner / Isolation

- Fresh Session
- Fresh Context evidence
- Model / Host profile
- Tool allowlist
- Origin / Resource Boundary
- Actual Tool Scope
- Forbidden Probe
- read-only input
- constrained output
- Runtime URL
- Scored Skill start
- Exploration Runtime Control adapter
- `seed_reset` atomic re-bootstrap / invariant enforcement
- trusted runtime-control operation log

Repository ScriptからAgent launch禁止。

### Wave 6 — Trusted Budget Accounting

- exploration start boundary
- budgeted top-level action semantics
- Host timer / counter
- hard cap capability
- exploration-time seed_reset = 1 budgeted action
- final output flush budget外
- Execution Summary
- Challenge Budget validation

### Wave 7 — Output Import / Evidence Mapping / Freeze

- physical `output/**` confinement
- canonical Evidence ref mapping
- qa-findings validation
- evidence import
- canonical Frozen Manifest
- hash / mutation detection

### Wave 8 — Deterministic Evaluator

- Benchmark / Runbook
- Runtime Variant / actual viewport
- Prepared Runtime hash
- Runner Profile
- Fresh Context
- Tool / Origin / Resource Boundary
- Initial State
- Exploration-time runtime-control invariant
- Budget
- Evidence Mapping / Frozen Artifact
- Ground Truth / metrics

### Wave 9 — Basic Official E2E

`CHALLENGE-BASIC-001`

```text
Preparation
→ Source-free Runtime
→ Fresh Runner
→ suspended-user + guest Initial State
→ Skill exploration
→ optional exploration-time seed_reset re-establishes suspended-user + guest
→ Freeze
→ Deterministic Evaluator
```

DoD:

- official_model_backed
- runtime_variant non-null / actual condition match
- valid_for_scoring=true
- Fresh Session / Context PASS
- Tool / Origin / Resource Boundary PASS
- Initial State PASS
- exploration-time seed_reset invariant PASS when reset is used
- Budget PASS
- current-run Evidence only
- Artifact audit PASS

### Wave 10 — Intermediate / Advanced

- Intermediate: `orders-phase1-statuses + operator + desktop`
- Advanced: `default + guest + tablet`

同じExploration-time `seed_reset` atomic re-bootstrap Contractを使い、Basic専用特殊処理を導入しない。

### Wave 11 — Reproducibility

同じPrepared Target Artifactを再利用し、2回以上Fresh Runする。

```text
same Benchmark Identity
same Prepared Target hash
same Runner Profile
```

確認:

- Benchmark Identity同一
- Runtime Artifact同一
- Runner Sessionは別
- Fresh Context proof各Run固有
- Evidence分離
- Metrics比較可能

Model / configurationだけ変更した場合:

```text
Benchmark Identity = SAME
Prepared Target = SAME
Runner Condition = DIFFERENT
```

### Wave 12 — Documentation / Final Audit

更新候補:

- `QA_AGENT.md`
- `.agents/skills/exploratory-qa/SKILL.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/reference/run-artifacts.md`
- `docs/PROJECT_CONTEXT.md`
- relevant curriculum
- ADRは必要な場合のみ

---

## 28. Test Strategy

### Contract Tests — Browser不要

- Runtime Variant Registry / viewport binding
- Benchmark Revision runtime_variant exclusion
- Canonical Artifact Manifest
- Learner-safe Input Manifest
- Runner Profile revisions
- Fresh Session / Context
- Tool Scope
- Origin / Resource Boundary
- Protected Patch
- Initial State single-group validation
- Initial State Receipt
- Runtime Control Operation Log
- exploration-time seed_reset invariant validation
- Runner Execution Summary
- budgeted action / Stop semantics
- Evidence Mapping
- Artifact ownership
- Freeze
- Evaluator receipt

### Runtime Integration — Chromium required

- Source cleanup後Runtime起動
- canonical hash verify
- Runtime Variant actual viewport
- Runtime Resource Boundary negative probe
- Trusted Bootstrap Operations
- Basic guest Initial State
- Intermediate operator Initial State
- Advanced tablet Initial State
- exploration-time seed_reset re-bootstrap for Basic / Intermediate / Advanced
- re-bootstrap role/session failure → environment_blocked
- cleanup

### Host Integration

- Fresh Session / Context
- Tool inventory
- deny enforcement
- Origin / Resource deny
- constrained output
- trusted Bootstrap receipt
- exploration-time seed_reset atomic adapter / operation log
- Budget timer / action accounting
- learner-safe input boundary

Host capabilityがない一般CIでfake PASSしない。

### Official E2E

Manual / Explicit WorkflowまたはHost-native executionで行う。

初期段階ではRequired CIにしない。

---

## 29. Failure / Blocker Policy

### Local Blocker

Challenge固有のInitial State / Runtime / Ground Truth問題は、そのChallengeだけをblockする。

探索中のallowed Runtime ControlでCurrent Initial State Groupを再成立できない場合も、そのRunを `environment_blocked` / invalidとして停止する。

### Global Blocker

以下はOfficial execution全体を止める。

- Fresh Session不可
- Fresh Context不可
- Actual Tool Scope不可
- Tool deny不可
- Origin Boundary不可
- Runtime Resource Boundary不可
- constrained output不可
- trusted Bootstrap不可
- exploration-time `seed_reset` invariantをHost/trusted adapterで保証不可
- trusted Budget不可
- source-free Runtime不可
- Scored Skill source-free delivery不可
- PatchがProtected Infrastructureへ触れる
- Instructor-only情報露出
- Artifact ownership不可
- Frozen input保証不可

### Fail-close

```text
unknown
unmeasured
not executed
not supported
unproven
```

をPASSへ寄せない。

---

## 30. Expected Implementation File Scope

候補:

```text
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/prepare-challenge.ts
scripts/agentic-qa/isolation.ts
scripts/agentic-qa/runner.ts
scripts/agentic-qa/evaluate.ts
scripts/agentic-qa/validate-contracts.ts
scripts/agentic-qa/benchmark-revision.ts
scripts/agentic-qa/build-learner-bundle.ts

scripts/agentic-qa/<canonical-artifact-manifest>.ts
scripts/agentic-qa/<prepared-runtime-lifecycle>.ts
scripts/agentic-qa/<runner-output-import>.ts
scripts/agentic-qa/<protected-patch-validation>.ts

training/agentic-qa/skills/scored-v1.md
training/agentic-qa/tool-profiles/scored-v1.json

tests/contracts/spec-agentic-qa.test.ts
tests/runtime/**

QA_AGENT.md
.agents/skills/exploratory-qa/SKILL.md
docs/reference/agentic-qa-workflow.md
docs/reference/run-artifacts.md
docs/PROJECT_CONTEXT.md
relevant docs/history/**
.codex/runs/<implementation-run>/**
```

Host integrationをRepositoryへ追加する場合もMachine Contract / trusted evidence adapterに限定する。

Product / Native / Maestro Regressionは原則変更しない。

---

## 31. Validation Gates

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
pnpm run build:spec
pnpm run lint
pnpm run typecheck
pnpm exec tsx scripts/agentic-qa/validate-contracts.ts
pnpm run test:contracts
pnpm run verify
```

Runtime変更時:

```bash
pnpm run test:agentic-qa:preparation
pnpm run test:e2e:chromium
```

Official Host capability利用可能環境ではHost Integration / Official E2Eを別途実行する。

未実行GateをPASS扱いしない。

---

## 32. Definition of Done

### Architecture

- [ ] Coding Agent + Scored SkillがPrimary Executor
- [ ] Repository独自Agent Runnerなし
- [ ] HarnessがAgentをlaunch / wrap / orchestrateしない
- [ ] Trusted Operator / Host Workflowがhandoff owner

### Host / Context / Isolation

- [ ] Fresh Session trusted
- [ ] Fresh Context / no inheritance trusted
- [ ] Model / Host config revision記録
- [ ] Actual Tool Scope measured
- [ ] Tool allow / deny enforced
- [ ] Origin Boundary enforced
- [ ] Runtime Resource Boundary enforced
- [ ] constrained output enforced
- [ ] trusted Budget accounting

### Learner-safe Input

- [ ] Scored Skill source-free delivery
- [ ] Skill revision fixed
- [ ] Runbook included in Benchmark Revision
- [ ] Output Contract revision included in Runner Profile
- [ ] Instructor-only情報非露出

### Benchmark / Runtime

- [ ] Runtime Variant excluded from Benchmark Revision digest
- [ ] Runtime Variant non-null for Official
- [ ] actual browser / viewport matches Runtime Variant and Challenge
- [ ] Prepared Runtime canonical hash
- [ ] Source cleanup後にRuntime start
- [ ] Bundle / Source Map direct observation不可

### Patch

- [ ] Protected Infrastructure untouched

### Initial State

- [ ] Official v1 uses Single Initial State Group
- [ ] Seed + Role + Session + Viewport + Route generic contract
- [ ] Basic guest PASS without Challenge-ID special branch
- [ ] Intermediate operator PASS with same contract
- [ ] Advanced tablet PASS with same contract
- [ ] trusted Receipt bound to Session / Runtime / Coverage
- [ ] exploration-time `seed_reset` atomically re-establishes Current Initial State Group
- [ ] failed re-bootstrap stops as `environment_blocked` / invalid

### Runner Output / Evidence

- [ ] only `output/**` write
- [ ] canonical Evidence Ref ↔ physical output mapping
- [ ] current-run Evidence only
- [ ] deterministic import
- [ ] Frozen Runner canonical hash
- [ ] post-freeze mutation rejected

### Budget / Stop

- [ ] exploration start boundary fixed
- [ ] budgeted top-level tool action semantics fixed
- [ ] exploration-time `seed_reset` counted once as top-level action
- [ ] final output flush excluded from budget
- [ ] duration / tool actions Host measured
- [ ] Stop Reason matches existing STOP_CONDITION semantics

### Evaluation

- [ ] Deterministic Evaluator
- [ ] runtime-control invariant evidence validated when control is used
- [ ] all identity / context / tool / resource / state / budget / evidence checks fail-close
- [ ] Official verification failure does not expose valid metrics

### Official E2E

- [ ] Basic PASS
- [ ] Intermediate PASS
- [ ] Advanced PASS
- [ ] same-condition Fresh Runs comparable

### Final

- [ ] Product Behavior unintended changesなし
- [ ] Native混在なし
- [ ] Contract FixtureをOfficial Evidenceに使用しない
- [ ] `pnpm run verify` PASS
- [ ] Required CI PASS
- [ ] Host-side evidence saved
- [ ] unexecuted items not marked PASS

---

## 33. Recommended Implementation Order

```text
0. Host Capability Spike
   ↓ insufficient → BLOCKED / STOP
1. Machine / Identity / Ownership Contracts
2. Learner-safe Skill / Input Packaging
3. Source-free Runtime / Hash / Protected Patch
4. Trusted Initial State Bootstrap
5. Fresh Host Integration / Isolation
6. Trusted Budget Accounting
7. Output Import / Evidence Mapping / Freeze
8. Deterministic Evaluator
9. Basic Official E2E
10. Intermediate / Advanced
11. Reproducibility
12. Documentation / Final Audit
```

---

## 34. Final Decision Rule

```text
Hostがtrusted / machine-readableに以下を提供・enforceできる
- Fresh Session
- Fresh Context / no inheritance
- Tool Isolation / Tool Inventory
- Origin Boundary
- Runtime Resource Boundary
- Constrained Output
- Trusted Bootstrap Operations
- Exploration-time seed_reset atomic re-bootstrap
- Budget Accounting
        ↓ YES
Official Black-box Scored E2EをSkill-firstで実装する

        ↓ NO
Official RunはBLOCKEDのまま維持する
Custom Agent Runnerは作らない
```

Official Black-box Scored E2Eの価値はHarnessを大きくすることではない。

**同じChallenge、同じPrepared Runtime、同じLearner-safe Instruction、同じ情報境界・Initial State・Runtime Variant・Runner条件の下で、Fresh + Fresh-context Coding AgentがSkillを使ってどれだけ未知不具合を発見できたかを、公正かつ再現可能に評価できること**が目的である。