# Official Black-box Scored E2E 実装計画

## 0. このPlanと現在Branchの位置づけ

この文書は、PR #16で意図的に`BLOCKED / DEFERRED / NOT EXECUTED`とした**Official Black-box Scored E2E**を、将来安全に実行可能にするための実装計画である。

現在の`docs/plan-official-black-box-scored-e2e` Branchは**計画文書を保存・レビューするためのDocumentation-only Branch**とする。

このBranchでは以下を行わない。

- Application Codeの変更
- `scripts/agentic-qa/**`の実装変更
- Coding Agent / LLM Runtimeの実装
- Custom Agent Runnerの追加
- MCP Proxy / Tool Routerの追加
- GitHub Actions Workflowの変更
- Challenge / Answer Key / Patchの変更
- Product Bug修正
- Official Scored Runの実行
- PR作成

このBranchで変更してよいのは、本Planを含む計画文書のみとする。

本Planの実装は、Planレビュー完了後、最新`main`から作成する**別のImplementation Branch**で開始する。

---

## 1. Goal

### 1.1 Goal

Scenario ShopのBlack-box Scored Agentic QAについて、Coding Agent自身がExploratory QA Skillを使用して実Runtimeを探索し、その結果を再現可能・比較可能・監査可能なOfficial Scored Runとして評価できる状態を作る。

最終的なExecution Flowは以下とする。

```text
Challenge / Answer Key / Patch
        ↓
Deterministic Preparation Harness
        ↓
Source-free Prepared Target Runtime
        ↓
Fresh Coding Agent Session
        ↓
Exploratory QA Skill
        ↓
Playwright-MCP / equivalent Runtime Capability
        ↓
Risk-based Black-box Exploration
        ↓
Frozen qa-findings.json
        ↓
Separate Evaluator Session
        ↓
evaluation.json
        ↓
Recall / Precision / FP Rate / Coverage
```

ここで最も重要な原則は以下である。

> **QAの実行主体はCoding Agent + Exploratory QA Skillであり、Repository Scriptではない。**

`script/agentic-qa/**`は、Agentを起動・wrap・orchestrateせず、Deterministic Preparation / Validation / Isolation Verification / Artifact Integrity / Evaluation / Scoringだけを担当する。

### 1.2 Success Criteria

最低1 Challengeについて、以下をすべて満たしたOfficial Runを完走する。

```text
Preparation
→ Source-free Target Runtime ready
→ Trusted Fresh Coding Agent Session
→ Trusted Tool Scope inventory
→ Required Seed bootstrap
→ Black-box exploration by Skill
→ Frozen Findings
→ Separate Evaluator
→ Valid Official evaluation
```

そのうえで、Basic / Intermediate / Advancedの各Challengeを同じContractで実行可能にする。

---

## 2. Non-goals

本Planでは以下を作らない。

- Repository独自LLM API Wrapper
- OpenAI / Anthropic / Gemini等のAPIを直接呼ぶAgent Runner
- `codex exec`等をNode Scriptから呼ぶWrapper
- Repository独自Agent Process Manager
- Repository独自Sub-agent Runtime
- Repository独自Session Manager
- MCP Proxy / MCP Gateway
- Agent Tool Router
- Agent retry daemon
- Remote Sandbox Platform
- Ranking / Leaderboard Platform
- Agent Job Queue
- Benchmark SaaS
- 常時稼働Agent Worker
- AI QAのRequired CI Gate化
- Product Bugの自動修正
- QA探索とRepairの自動連結

Host Runtimeが必要Capabilityを提供できない場合、Repository側でこれらを作って回避しない。

---

## 3. Current Baseline

PR #16マージ時点で以下は完成している。

### 3.1 Specification / Oracle

- `docs/spec/`がSpecification Systemとして存在する。
- Normative Product BehaviorとSupporting / Operational文書が分離されている。
- BR / ACが安定IDを持つ。
- `spec_refs[]`からLearner-safe Specification Bundleを決定的に生成できる。

### 3.2 Skill-first Agentic QA

- `.agents/skills/exploratory-qa/SKILL.md`がPrimary QA Entry Pointである。
- Normal / Gray-box / Black-box ScoredのMode Contractがある。
- WebはPlaywright-MCP相当Capabilityを第一選択とする。
- QA探索中にProduct Codeを修正しない。

### 3.3 Black-box Harness

以下が存在する。

- Challenge Definition
- Instructor Answer Key
- Instructor-only Unified Diff Patch
- Learner-safe Bundle
- Benchmark Revision
- Benchmark Identity
- Runner Profile
- isolated execution root
- Positive Tool Allowlist
- Forbidden Capability Probe
- Actual Tool Scope Contract
- Fresh Session Contract
- Frozen Findings Contract
- Separate Evaluator
- Contract Fixture

### 3.4 Trust Boundary

以下が既にMachine Contractとして存在する。

- strict `run_id`
- current-run Evidenceのみ許可
- safe artifact path
- Canonical Forbidden Capability Set
- Tool ProfileとProbeのexact set一致
- `actual_tool_scope.measured === (source === "runner_runtime_inventory")`
- Fresh Session identity invariant
- Tool Profile raw-byte revision verification
- Contract Fixtureは`valid_for_scoring=false`
- Benchmark RevisionとRunner Profileの分離

これらを本Planで弱体化しない。

---

## 4. Current Blockers

PR #16ではOfficial Black-box Scored E2Eを以下の理由でdeferした。

### 4.1 Blocker A — Trusted Fresh Coding Agent Session

Repository側のJSONに、単に

```json
{
  "fresh_session": true
}
```

と書くだけではOfficial証明にならない。

Host Runtime自身から、少なくとも以下をtrusted evidenceとして取得できる必要がある。

- Session ID
- Session作成時刻
- Sessionが新規作成されたこと
- prior sessionとの非同一性
- model identifier
- runtime / host identifier
- Session artifact / audit identifier

Repository Scriptが自己申告値を生成してFresh Sessionを装ってはいけない。

### 4.2 Blocker B — Trusted Actual Tool Scope

現在のContractは、Official RunではActual Tool Scopeが実測され、

```text
measured=true
source=runner_runtime_inventory
```

でなければならない。

しかしRepository側からHost Runtimeの実Tool Capability一覧をtrusted inventoryとして取得する方法がない。

必要なのは、Host Runtimeが現在SessionへExposeしたCapabilityを機械可読形式で返すこと。

### 4.3 Blocker C — Source-free Prepared Target Runtime Lifecycle

現在のPreparation Harnessは、patched RuntimeのSanityとInitial State Resetを確認した後にRuntimeを停止し、Disposable Sourceをcleanupする。

そのため、Preparation完了後にFresh Coding Agentへ渡せるLive Target Runtimeが存在しない。

Agent callbackをPreparation Scriptへ戻すのは解決策としない。

必要なのは以下である。

```text
Patched Source
↓
Build / Sanity
↓
Source-free Runtime Artifact
↓
Disposable Source cleanup
↓
Target Runtime start
↓
Runtime URLだけをFresh Agentへ提供
```

### 4.4 Blocker D — Fresh Browser State / Seed Bootstrap

Challengeには例えば以下のようなSeedが指定される。

```text
suspended-user
orders-phase1-statuses
...
```

Preparation時にHarness側BrowserでSeed Resetしても、そのStorage StateはFresh Coding Agent側の新Browser Sessionには引き継がれない。

したがってOfficial Runでは、Fresh Agent Browserに対してChallenge指定Seedを決定的に適用し、その成功をMachine Evidenceとして残す必要がある。

Runtime URLだけをFresh Agentへ渡して完了とはしない。

---

## 5. Architecture Invariants

以下は実装中も変更してはいけない。

### 5.1 Execution Ownership

```text
Primary QA Executor
=
Coding Agent + Exploratory QA Skill
```

### 5.2 Harness Responsibility

```text
scripts/agentic-qa/**
=
Preparation
Validation
Isolation Verification
Artifact Integrity
Evaluation
Scoring
```

### 5.3 Harnessが行ってはいけないこと

- Coding Agentを起動する
- Model APIを呼ぶ
- Agent Processを監視する
- Agent Sessionを再試行する
- AgentのTool CallをProxyする
- Agentへ逐次命令を送る
- Agent内部Reasoningを取得する

### 5.4 Runner Terminology

Black-box Scoredでいう`Runner`は、**評価対象となるFresh Coding Agent Session**を意味する。

Repository独自のNode.js Runner implementationを意味しない。

---

## 6. Target Architecture

```text
Instructor-side Repository
        │
        ├─ Challenge Definition
        ├─ Answer Key
        ├─ Challenge Patch
        └─ Tool Profile
                │
                ▼
     Deterministic Preparation Harness
                │
                ├─ Validate Contract
                ├─ Build Learner-safe Bundle
                ├─ Build Baseline Runtime
                ├─ Baseline Sanity
                ├─ Apply Patch
                ├─ Build Patched Runtime
                ├─ Patched Sanity
                ├─ Create Runtime Artifact
                └─ Delete Disposable Source
                │
                ▼
       Prepared Target Runtime Host
                │
                │ only URL / runtime identity
                ▼
        Fresh Coding Agent Session
                │
                ├─ Trusted Session Identity
                ├─ Trusted Tool Scope Inventory
                ├─ Positive Tool Allowlist
                └─ Learner-safe Inputs only
                │
                ▼
         Exploratory QA Skill
                │
                ├─ Required Seed Bootstrap
                ├─ Runtime Exploration
                ├─ Evidence Collection
                └─ Atomic Findings
                │
                ▼
          Frozen qa-findings.json
                │
                ▼
        Separate Evaluator Session
                │
                ├─ Answer Key
                ├─ Benchmark Ground Truth
                ├─ Evidence Integrity
                └─ Identity Verification
                │
                ▼
            evaluation.json
```

---

## 7. Host Capability Contract

Implementation開始前に、使用するCoding Agent Hostが以下を提供可能か確認する。

### 7.1 Fresh Session Capability

最低限以下を取得できること。

```text
session_id
session_created_at
model_identifier
host_runtime_identifier
session_artifact_identifier
fresh_session_proof
```

`fresh_session_proof`はRepositoryが自己生成したbooleanではなく、Host Runtimeから取得した情報に基づく。

### 7.2 Tool Inventory Capability

最低限以下を取得できること。

```text
actual_tool_scope.measured = true
actual_tool_scope.source = runner_runtime_inventory
actual_tool_scope.exposed_capabilities = [...]
```

Host固有Tool名は、RepositoryのCanonical Runtime Capabilityへ明示的にnormalizeする。

未知Capabilityを無視しない。

未知Capabilityが情報境界へ影響する可能性がある場合はfail-closeする。

### 7.3 Permission / Isolation Capability

Host側で以下を禁止できること。

- Repository Source Read
- `.git`
- Existing Tests
- Answer Key
- Challenge Patch
- Generic Shell
- Git Repository Search
- GitHub Search
- Web Search
- Arbitrary External Fetch
- Browser Arbitrary Evaluate
- Network Body Inspection
- Web Bundle / Source Map access
- APK / IPA access
- Arbitrary ADB Shell

Skillの指示だけで禁止したことにはしない。

### 7.4 Host Capability Gate

上記をHost Runtimeが提供できない場合、Implementationは以下までで停止する。

```text
Contract / Preparation / Runtime Artifact
= 実装可能

Official Agent Execution
= BLOCKED
```

不足Capabilityを補うためCustom Agent Runnerを作らない。

---

## 8. Prepared Target Runtime Contract

### 8.1 Principle

Fresh AgentへRepository Sourceを渡さず、**実行可能なTarget Runtimeだけを提供**する。

### 8.2 Web Runtime Artifact

Scenario Shop Webでは、patched Disposable Sourceから生成した`dist/**`をRuntime Artifactとして使用する。

ArtifactはInstructor-side領域へ保存し、Agentのisolated execution rootには入れない。

例:

```text
.artifacts/agentic-qa/<run_id>/prepared-target/
  target-runtime.json
  web-dist/
```

Agentへ与えるのはURLとlearner-safe runtime metadataだけとする。

`web-dist/**`自体をAgent Tool Scopeからread可能にしない。

### 8.3 Runtime Identity

`target-runtime.json`には最低限以下を記録する。

```json
{
  "schema_version": 1,
  "run_id": "YYYYMMDD-HHMMSS-JST",
  "challenge_id": "CHALLENGE-BASIC-001",
  "benchmark_revision": "...",
  "runtime_variant_id": "...",
  "artifact_sha256": "...",
  "source_head_sha": "...",
  "patch_sha256": "...",
  "created_at": "...",
  "source_cleanup_completed": true
}
```

### 8.4 Source Cleanup Boundary

Target RuntimeをFresh Agentへ公開する前に、以下を完了する。

- Disposable Source削除
- Temporary `.git`不在
- Existing Test不在
- Challenge Patch不在
- Answer Key不在
- Source Map不在
- Agent isolated rootにRuntime Artifact bytes不在

### 8.5 Runtime Server

Target Runtime ServerはHarness側が起動してよい。

ただし役割は**Target Applicationをserveすることだけ**とする。

HarnessがCoding Agentを起動・制御することは禁止する。

Server lifecycleは以下とする。

```text
Prepared Runtime start
↓
Readiness Probe PASS
↓
Runtime URL確定
↓
Fresh Agent execution
↓
Agent result freeze
↓
Runtime stop
↓
Runtime artifact retention / cleanup policy
```

Agent実行の成功・失敗にかかわらずRuntime stopを保証する。

---

## 9. Seed / Initial State Bootstrap Contract

### 9.1 Problem

Challenge指定SeedはFresh Agent側Browser Sessionへ決定的に適用されなければならない。

Preparation BrowserのStorageを再利用してはいけない。

### 9.2 Allowed Bootstrap

Challengeの`allowed_runtime_controls`に`seed_reset`が存在する場合、Fresh AgentはExploration開始前にLearner-safe Test Controlを使用して指定SeedへResetする。

例:

```text
Fresh Browser Session
↓
seed_reset(suspended-user)
↓
Reset Result確認
↓
app_restart / page reload
↓
Initial State確認
↓
Exploration Budget開始
```

### 9.3 BootstrapはExplorationと分離する

以下をMachine Artifactとして残す。

```text
initial-state-receipt.json
```

最低限:

```json
{
  "schema_version": 1,
  "run_id": "...",
  "challenge_id": "...",
  "coverage_id": "...",
  "requested_seed": "suspended-user",
  "reset_completed": true,
  "runtime_url_origin": "...",
  "completed_at": "..."
}
```

Seed bootstrap失敗時はRequired Coverageを実行せず、Official Runをinvalid / blockedとして扱う。

### 9.4 Budget

Seed bootstrap / readiness確認はExplorationそのものと区別する。

ChallengeのExploration Budgetを消費するAction範囲をContractで明示する。

原則として、決定的なpre-run bootstrapはExploration Budget外とし、最初の探索ActionからBudget計測を開始する。

---

## 10. Learner-safe Input Contract

Fresh Runner Sessionへ渡してよいものをPositive Allowlistで固定する。

最低限:

- learner-safe Specification Bundle
- Challenge learner-facing definition
- Challenge runbook
- Target Runtime URL
- required Seed name
- allowed runtime controls
- Exploration Budget
- Stop Condition
- Output Contract

渡してはいけないもの:

- Repository Root
- Source path
- `.git`
- Existing Tests
- Answer Key
- Challenge Patch
- Ground Truth
- Benchmark internal manifest bytes
- Evaluator configuration
- Historical Runner Findings
- Previous Evaluation
- Instructor-only logs

---

## 11. Fresh Runner Execution Contract

### 11.1 Start

Host RuntimeでFresh Coding Agent Sessionを作成する。

開始時に以下をFrozen artifactとして保存する。

```text
runner-session.json
```

### 11.2 Runner Session Evidence

既存Contractを維持し、最低限以下をtrusted sourceから埋める。

- current session id
- prior session ids
- session artifact new
- model identifier
- host identifier
- Actual Tool Scope
- Forbidden Probe result
- Tool Profile revision

### 11.3 Skill Execution

Coding Agentは`.agents/skills/exploratory-qa/SKILL.md`相当のBlack-box Scored Workflowを実行する。

Repository Sourceを読むことなく、Runtime observationだけで判断する。

### 11.4 Findings

Required CoverageごとにObservationを行い、FindingがあればAtomicに記録する。

Evidenceはcurrent runのみを使用する。

### 11.5 Freeze

Runner Session終了前に`qa-findings.json`をFreezeし、そのbytes hashを記録する。

Freeze後にFinding内容をEvaluator側で変更しない。

---

## 12. Separate Evaluator Contract

### 12.1 Separation

EvaluatorはRunner Sessionと同一Sessionで実行しない。

Evaluator側はInstructor-only情報へアクセスできる。

### 12.2 Evaluator Inputs

- Frozen `qa-findings.json`
- Challenge Definition
- Answer Key
- Benchmark Manifest
- Tool Profile bytes
- Runner Session Evidence
- Forbidden Probe
- Initial State Receipt
- Evidence artifacts

### 12.3 Validation Order

Scoring前に以下をfail-closeで検証する。

```text
Schema
↓
Benchmark Identity
↓
Runner Profile
↓
Fresh Session
↓
Tool Profile Revision
↓
Actual Tool Scope
↓
Forbidden Probe
↓
Initial State Receipt
↓
Evidence Integrity
↓
Required Coverage
↓
Ground Truth Match
↓
Scoring
```

途中でOfficial verificationが失敗した場合、metricsを有効値として出さない。

---

## 13. Artifact Set

Official Runでは最低限以下を1 `run_id`へ束ねる。

```text
.codex/runs/<run_id>/
  challenge.json or challenge reference
  learner-safe-spec-bundle.json
  benchmark-manifest-<challenge_id>.json
  runner-profile.json
  qa-findings.json
  evaluation.json
  REPORT.md

.artifacts/agentic-qa/<run_id>/
  target-runtime.json
  initial-state-receipt.json
  runner-session.json
  forbidden-probe.json
  evidence/**
  prepared-target/**
```

Instructor-only artifactとLearner-visible artifactの境界を明示する。

---

## 14. Implementation Start Gate

Implementation Branchを作る前に以下をすべて満たす。

### Repository Gate

- PR #16が`main`へマージ済み。
- `pnpm run verify`が最新`main`でPASSする。
- Required CIがPASSする。
- `docs/spec/` / Skill / Agentic QA ContractがCurrent Truthと一致する。
- Challenge Basic / Intermediate / Advancedがvalidation PASSする。

### Host Runtime Gate

使用するCoding Agent Hostについて以下を実証できる。

- Fresh Session作成
- trusted Session ID取得
- model identifier取得
- Actual Tool Scope inventory取得
- Capability allow / deny enforcement
- isolated working root
- session-level artifact / audit identity

### Decision Gate

Host Runtime Gateが未達の場合、Implementationを無理に開始しない。

必要ならPlanを`BLOCKED`状態で維持する。

---

## 15. Implementation Waves

## Wave 0 — Current Main Rebaseline / Host Capability Spike

目的:

Official E2E実装前に、RepositoryとHost双方の事実を確定する。

作業:

- 最新`main`のAgentic QA Contract再確認
- `.agents/skills/exploratory-qa/SKILL.md`再確認
- Basic / Intermediate / Advanced Challenge再Validation
- Host RuntimeのFresh Session API / Feature確認
- Host RuntimeのTool Inventory取得方法確認
- Host RuntimeのPermission enforcement確認
- Host Runtimeから取得できるsession evidenceを列挙
- 不足Capabilityを明示

Exit Gate:

```text
Host capability sufficient
→ Wave 1へ

Host capability insufficient
→ BLOCKED。Custom Runnerは作らない
```

---

## Wave 1 — Official Runtime / Session Machine Contract

目的:

新しい境界を実装前にMachine Contractとして固定する。

追加候補:

- `preparedTargetRuntimeSchema`
- `initialStateReceiptSchema`
- Host-trusted Runner Session field
- Runtime readiness state

既存Contractと重複するSchemaを作らない。

`runner-session.json`へ自然に統合できるものは統合する。

Validation:

- valid fixture PASS
- missing trusted session identity FAIL
- unmeasured Tool Scope FAIL
- source cleanup incomplete FAIL
- Seed bootstrap missing FAIL

---

## Wave 2 — Source-free Prepared Target Runtime

目的:

Patched RuntimeをFresh AgentへSource非公開で提供できるようにする。

作業:

1. Disposable Sourceを作成
2. Baseline Build / Sanity
3. Patch Apply
4. Patched Build / Sanity
5. `dist/**`をPrepared Target Artifactへcopy
6. Artifact hash計算
7. Source Map / prohibited artifact検査
8. Disposable Source削除
9. `target-runtime.json`作成
10. Prepared ArtifactだけからRuntime起動
11. Readiness probe
12. Runtime停止 / cleanup test

重要:

このWaveでCoding Agentは起動しない。

Exit Gate:

- Source削除後でもRuntimeが起動する
- Runtime URLでApplicationが操作可能
- Agent isolated rootにBuild Artifact bytesがない
- Runtime Artifact hashが固定される

---

## Wave 3 — Fresh Browser Seed Bootstrap

目的:

Fresh RunnerのBrowser StateをChallenge指定Seedへ決定的に初期化する。

作業:

- Challenge `allowed_runtime_controls`検証
- learner-safe seed reset入口確認
- Fresh browser上でSeed Reset
- Reset completion確認
- App restart / reload
- Initial State observation
- `initial-state-receipt.json`生成
- wrong seed / unsupported seed / reset failureのnegative test

Exit Gate:

- Fresh browserごとに同じInitial Stateを再現できる
- Preparation Browser stateに依存しない

---

## Wave 4 — Host-native Fresh Coding Agent Session Integration

目的:

Repository ScriptにAgent Runnerを作らず、Host-native capabilityでFresh Runnerを作る。

作業:

- Fresh Session作成
- trusted Session metadata取得
- Positive Tool Allowlist適用
- Actual Tool Scope取得
- Forbidden Probe
- learner-safe inputs投入
- Target Runtime URL提供
- Exploratory QA Skill起動

禁止:

- `scripts/agentic-qa/**`からAgent launch
- Child processでCodex / model CLI起動
- Model SDK dependency追加

Exit Gate:

Runner Session EvidenceがMachine Contractを満たす。

---

## Wave 5 — Findings Freeze / Evidence Integrity

目的:

Runnerの出力をEvaluatorへ渡す前にImmutableにする。

作業:

- Required Coverage確認
- current-run Evidence確認
- Atomic Finding確認
- `qa-findings.json`Schema validation
- Frozen bytes hash記録
- Runner Session終了

Negative:

- previous-run evidence
- unsafe path
- missing evidence
- post-freeze mutation

をrejectする。

---

## Wave 6 — Separate Evaluator Integration

目的:

Runnerと独立したEvaluatorでOfficial scoringする。

作業:

- Separate evaluator identity
- Answer Key読込
- Benchmark Identity検証
- Runner Profile検証
- Tool Profile revision検証
- Fresh Session検証
- Tool Scope検証
- Forbidden Probe検証
- Initial State Receipt検証
- Evidence Integrity
- TP / FP / FN / TN / NE
- Metrics

Official verification失敗時は`valid_for_scoring=false`とする。

---

## Wave 7 — Basic Official E2E

対象:

`CHALLENGE-BASIC-001`

実行:

```text
Preparation
→ Source-free Runtime
→ Fresh Runner
→ suspended-user bootstrap
→ Skill exploration
→ Frozen Findings
→ Separate Evaluator
```

DoD:

- execution_kindがOfficial model-backed種別
- `valid_for_scoring=true`
- trusted Tool Scope measured
- Fresh Session PASS
- Evidence current-run only
- metrics non-null
- Artifact audit PASS

Contract Fixtureをこの証拠に使用しない。

---

## Wave 8 — Intermediate / Advanced Official E2E

BasicでArchitectureが成立した後だけ進む。

対象:

- `CHALLENGE-INTERMEDIATE-001`
- `CHALLENGE-ADVANCED-001`

Challenge-specific Seed / Coverage / Evidenceを同じContractで実行する。

Basic専用特殊処理を共通Runtimeへ持ち込まない。

---

## Wave 9 — Reproducibility / Same-condition Comparison

目的:

同一Benchmark条件で複数Runner実行を比較できることを実証する。

最低限:

```text
same challenge
same benchmark_revision
same runtime_variant_id
same runner_profile
```

で2回Fresh Runを実施する。

確認:

- Benchmark Identity一致
- Runner Session IDは異なる
- Evidenceはrunごとに分離
- Metrics比較可能

次にmodel identifierだけ変えた場合、

```text
Benchmark Identity = SAME
Runner Condition = DIFFERENT
```

になることを確認する。

---

## Wave 10 — Documentation / Curriculum / Final Audit

更新候補:

- `QA_AGENT.md`
- `.agents/skills/exploratory-qa/SKILL.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/reference/run-artifacts.md`
- `docs/PROJECT_CONTEXT.md`
- relevant curriculum
- ADRが必要な場合のみADR

既存ADRで表現可能なら新規ADRを増やさない。

最終Audit:

- Custom Agent Runnerなし
- Product変更なし
- Official Evidence揃っている
- Contract FixtureをOfficial扱いしていない
- Source isolationを実測証明
- Host capability evidence保存
- Required Validation PASS

---

## 16. Test Strategy

### 16.1 Contract Tests

Browser不要。

- Prepared Target Schema
- Initial State Receipt Schema
- Fresh Session trusted fields
- Actual Tool Scope
- Forbidden Probe
- Artifact path
- Benchmark Identity
- Freeze semantics

### 16.2 Runtime Integration Tests

Chromium required。

- prepared artifactからRuntime起動
- Source cleanup後Runtime起動
- readiness
- seed reset
- app restart
- cleanup

Contract Suiteへ実Browser dependencyを混ぜない。

### 16.3 Host Integration Tests

Host capabilityが利用できる環境だけで実行する。

- Fresh Session identity
- Tool inventory
- Tool deny enforcement
- learner-safe input boundary

Host capabilityがない一般CIでfake PASSしない。

### 16.4 Official E2E

Manual / Explicit workflowまたはHost-native executionで実施する。

初期段階ではRequired CIにしない。

---

## 17. Failure / Blocker Policy

### Local Blocker

特定ChallengeだけのSeed / Runtime / Ground Truth問題は、そのChallengeだけをblockする。

他ChallengeのContract / Runtime workは継続してよい。

### Global Blocker

以下はWhole Official Executionを止める。

- trusted Fresh Sessionを作れない
- Actual Tool Scopeを実測できない
- forbidden capabilityをHostでdenyできない
- source-free Target Runtimeを作れない
- Answer Key / PatchがRunnerへ露出する
- Evaluator separationを保証できない

### Fail-close

不明な状態をPASSへ寄せない。

```text
unknown
unmeasured
not executed
not supported
```

は明示的にinvalid / blockedへ分類する。

---

## 18. Security / Information Boundary

Official Scoredの目的は、Agentの既知情報検索能力ではなくRuntimeから未知不具合を探索する能力を評価すること。

したがって情報境界はProduct correctnessの一部として扱う。

必須:

- Source Repository非公開
- Answer Key非公開
- Patch非公開
- Existing Test非公開
- Previous Finding非公開
- External Search禁止
- Generic Shell禁止
- Build Artifact direct read禁止
- Runtime URLは許可
- Learner-safe Specは許可

Tool Scopeがこの境界を満たしたことを実測で証明する。

---

## 19. Expected File Scope for Implementation PR

Implementation時の変更候補は以下。

```text
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/prepare-challenge.ts
scripts/agentic-qa/isolation.ts
scripts/agentic-qa/runner.ts
scripts/agentic-qa/evaluate.ts
scripts/agentic-qa/validate-contracts.ts

# 新規の場合でも最小限
scripts/agentic-qa/<prepared-runtime-lifecycle>.ts

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

Host integrationをRepository codeへ追加する必要がある場合も、**Agent launch wrapperではなくMachine Contract / evidence adapterに限定**する。

Product code、Native code、Maestro Regressionは原則変更しない。

---

## 20. Validation Gates

最低限以下を維持する。

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

Official Host capabilityが利用可能な環境では、Host IntegrationとOfficial E2Eも別途実行する。

実行できていないGateをPASS扱いしない。

---

## 21. Definition of Done

### Architecture

- [ ] Coding Agent + Exploratory QA SkillがPrimary Executorのまま
- [ ] Repository独自Agent Runnerを実装していない
- [ ] HarnessがAgentをlaunch / wrap / orchestrateしない

### Prepared Runtime

- [ ] patched RuntimeをSource-free Artifactとして生成できる
- [ ] Disposable Source cleanup後にRuntimeを起動できる
- [ ] Runtime readinessを機械確認できる
- [ ] Runtime identity / artifact hashを記録できる

### Fresh Runner

- [ ] trusted Fresh Session identityをHostから取得できる
- [ ] Actual Tool ScopeをHostから実測できる
- [ ] Positive Tool AllowlistをHostでenforceできる
- [ ] Forbidden Capability ProbeがPASSする
- [ ] RunnerへInstructor-only情報が露出しない

### State

- [ ] Fresh BrowserへChallenge Seedを決定的に適用できる
- [ ] Initial State Receiptを保存できる
- [ ] Seed bootstrap失敗をOfficial PASSにしない

### Runner / Findings

- [ ] SkillでRuntime探索を実施する
- [ ] Required Coverageを完了するかBudget / blockerを正しく記録する
- [ ] current-run Evidenceだけを使用する
- [ ] `qa-findings.json`をFreezeする

### Evaluation

- [ ] Separate Evaluator Sessionを使用する
- [ ] Benchmark / Runner / Session / Tool / State / Evidenceを検証する
- [ ] Official verification failure時にmetricsを有効化しない

### Official E2E

- [ ] Basic Challenge Official Run PASS
- [ ] Intermediate Challenge Official Run PASS
- [ ] Advanced Challenge Official Run PASS
- [ ] 同条件Fresh Runを複数回比較可能

### Final

- [ ] Product Behaviorの意図しない変更なし
- [ ] Contract FixtureをOfficial Scored Evidenceとして使用していない
- [ ] `pnpm run verify` PASS
- [ ] Required CI PASS
- [ ] Official Host-side evidenceを保存済み
- [ ] 未実行項目をPASS扱いしていない

---

## 22. Recommended Implementation Order

優先順位は以下。

```text
1. Host Capability Spike
2. Machine Contract
3. Source-free Prepared Runtime
4. Fresh Browser Seed Bootstrap
5. Host-native Fresh Session Integration
6. Findings Freeze
7. Separate Evaluator
8. Basic Official E2E
9. Intermediate / Advanced
10. Reproducibility Comparison
11. Documentation / Final Audit
```

最初にHost Capabilityを確認する理由は、そこが満たせなければOfficial Runを実装できないためである。

Repository側Harnessを先に拡張し続けてからHost Capability不足が判明する進め方は避ける。

---

## 23. Final Decision Rule

本Planで最も重要なDecision Ruleを以下に固定する。

```text
HostがFresh Session / Tool Isolation / Trusted Tool Inventoryを提供できる
        ↓ YES
Official Black-box Scored E2EをSkill-firstで実装する

        ↓ NO
Official RunはBLOCKEDのまま維持する
Custom Agent Runnerは作らない
```

Official Black-box Scored E2Eの価値は、Harnessを大きくすることではない。

**同じChallenge、同じRuntime、同じ情報境界の下で、Fresh Coding AgentがSkillを使ってどれだけ未知不具合を発見できたかを、公正かつ再現可能に評価できること**が目的である。
