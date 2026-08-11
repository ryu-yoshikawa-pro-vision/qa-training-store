# Official Black-box Scored E2E 実装計画

## 0. このPlanと現在Branchの位置づけ

この文書は、PR #16で意図的に`BLOCKED / DEFERRED / NOT EXECUTED`とした**Official Black-box Scored E2E**を、将来安全かつ比較可能な形で実行するための実装計画である。

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

Scenario ShopのBlack-box Scored Agentic QAについて、Coding Agent自身がExploratory QA Skillを使用して実Runtimeを探索し、その結果を**再現可能・比較可能・監査可能なOfficial Scored Run**として評価できる状態を作る。

初期Implementation Scopeは**Webのみ**とする。

現在のBasic / Intermediate / Advanced ChallengeはすべてWebを対象としており、Prepared RuntimeもWeb `dist/**`を前提としている。Android / iOSのOfficial Black-box Scoredは本PlanのDoDへ含めず、WebでTrust Boundaryと比較Contractが成立した後の別計画とする。

最終的なExecution Flowは以下とする。

```text
Trusted Operator / Host Workflow
        │
        ├─ Instructor-only Challenge / Answer Key / Patch / Tool Profile
        │
        ▼
Deterministic Preparation Harness
        │
        ├─ Learner-safe Inputs / Scored Skill
        ├─ Source-free Prepared Target Runtime
        ├─ Protected Infrastructure validation
        └─ Trusted Runtime Identity
        │
        ▼
Fresh + Fresh-context Coding Agent Session
        │
        ├─ Trusted Tool Scope / Origin Allowlist
        ├─ Narrow approved_test_control
        ├─ Trusted Budget Accounting
        └─ Constrained Runner Output Channel
        │
        ▼
Trusted Initial State Bootstrap
        │
        ├─ Seed
        ├─ Role / Session
        ├─ Initial Route
        └─ Trusted Receipt
        │
        ▼
Exploratory QA Skill
        │
        ├─ Runtime Exploration
        ├─ Evidence Collection
        └─ Atomic Findings
        │
        ▼
Frozen Runner Artifact Set
        │
        ▼
Deterministic Separate Evaluator Execution Context
        │
        ▼
evaluation.json
        │
        ▼
Recall / Precision / FP Rate / Coverage
```

最も重要な原則は以下である。

> **QAの実行主体はCoding Agent + Exploratory QA Skillであり、Repository Scriptではない。**

`scripts/agentic-qa/**`は、Agentを起動・wrap・orchestrateせず、Deterministic Preparation / Validation / Isolation Verification / Artifact Import / Artifact Integrity / Evaluation / Scoringだけを担当する。

### 1.2 Success Criteria

最低1 Challengeについて、以下をすべて満たしたOfficial Runを完走する。

```text
Preparation
→ Source-free Target Runtime ready
→ Protected Infrastructure unchanged
→ Trusted Fresh + Fresh-context Coding Agent Session
→ Learner-safe Skill / Input revision fixed
→ Trusted Tool Scope / Runtime Origin isolation
→ Trusted Initial State bootstrap
→ Trusted Budget accounting
→ Black-box exploration by Skill
→ Constrained Runner Output
→ Frozen Findings / Evidence
→ Deterministic Separate Evaluator
→ Valid Official evaluation
```

BasicでArchitectureを成立させた後、Intermediate / Advancedを**同じContract**で実行できることを確認する。

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
- Native Official Scored E2E
- pretraining / model training dataへのBenchmark非混入保証

Host Runtimeが必要Capabilityを提供できない場合、Repository側で上記を作って回避しない。

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
- Deterministic Evaluator
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

## 4. Threat Model / What Official Means

Official Black-box Scoredが保証するのは、**実行時Information Boundary**である。

最低限、Runner実行中に以下へアクセスできないことをHost / trusted execution layerで保証する。

- Source Repository
- `.git`
- Existing / Hidden Tests
- Challenge Patch
- Answer Key
- Previous Scored Findings / Evaluation
- Arbitrary External Search / Fetch
- Build Artifact bytes / Source Map
- Generic Shell
- arbitrary Browser Evaluate
- Network Response Body inspection

一方、Official Scoredであっても以下を自動的には保証しない。

- Modelのpretraining dataにRepository / Challenge相当情報が存在しないこと
- Model provider側Memoryへ過去情報が一切存在しないこと
- 公開済みBenchmarkに対するtraining contaminationが0であること

したがって本Planでいう「未知不具合探索能力」は、**実行時にInstructor-only情報を与えず、Fresh ContextとTool Isolation下でRuntimeから発見する能力**を意味する。

将来、より強いBenchmark secrecyが必要になった場合は、private / unpublished Challenge、ephemeral Patch Variant等を別計画で扱う。

---

## 5. Current Blockers

### 5.1 Blocker A — Trusted Fresh SessionだけでなくFresh Contextが必要

Repository側JSONへ単に、

```json
{
  "fresh_session": true
}
```

と書くだけではOfficial証明にならない。

さらに、Session IDが新しくても以下を継承していればBlack-boxではない。

- 親Agent conversation context
- Repository summary / source-derived context
- Previous Findings / Evaluation
- Prior Scored Session context
- User / workspace MemoryのうちBenchmark情報を含むもの

Host Runtime自身から、最低限以下をtrusted evidenceとして取得できる必要がある。

- Session ID
- Session作成時刻
- Sessionが新規作成されたこと
- prior Runner sessionとの非同一性
- model identifier
- model configuration identifier
- runtime / host identifier
- Session artifact / audit identifier
- parent contextを継承していないこと
- prior conversationを継承していないこと
- Repository source-derived contextを継承していないこと
- previous scored-session contextを継承していないこと

Repository Scriptが自己申告値を生成してFresh Session / Fresh Contextを装ってはいけない。

### 5.2 Blocker B — Trusted Actual Tool Scope

Official RunではActual Tool Scopeが実測され、

```text
measured=true
source=runner_runtime_inventory
```

でなければならない。

必要なのは、Host Runtimeが現在SessionへExposeしたCapabilityを機械可読形式で返し、そのinventoryとHost側のallow / deny enforcementが一致することである。

### 5.3 Blocker C — Source-free Prepared Target Runtime Lifecycle

現在のPreparation Harnessはpatched RuntimeのSanityとInitial State Resetを確認した後にRuntimeを停止し、Disposable Sourceをcleanupする。

Official Runには以下が必要である。

```text
Patched Source
↓
Build / Sanity
↓
Source-free Runtime Artifact
↓
Disposable Source cleanup
↓
Prepared ArtifactだけからTarget Runtime start
↓
Readiness Probe
↓
Runtime URLだけをFresh Agentへ提供
```

Agent callbackをPreparation Scriptへ戻すのは解決策としない。

### 5.4 Blocker D — Initial StateはSeedだけでは決まらない

Challengeが要求するInitial StateはSeedだけではなく、最低限以下の組である。

```text
Seed
+ Role
+ Session state
+ Initial route
```

例:

- Basic: `suspended-user` SeedだがChallenge Roleは`guest`であり、Seed Metadataの初期Customer Sessionをそのまま残してはいけない。
- Intermediate: `orders-phase1-statuses` + `operator`であり、Operator Sessionが必要である。
- Advanced: `default` + `guest`である。

Challenge IDごとの`if`分岐でSessionを手修正するのではなく、Coverage DefinitionとCanonical Seed Metadataから一般化したInitial State Contractを作る必要がある。

### 5.5 Blocker E — Learner-safe Skill Delivery

Black-box RunnerはRepository Sourceを読めないため、`.agents/skills/exploratory-qa/SKILL.md`をRepository Pathから読む前提では実行できない。

Official Runでは、Black-box Scoredに必要なSkill InstructionだけをLearner-safeに固定し、Exact Revisionを比較条件として記録する必要がある。

### 5.6 Blocker F — Constrained Runner Output Channel

Scored Tool Profileは`generic_shell`を禁止しているため、Runnerが`qa-findings.json`やEvidenceをどこへどの権限で永続化するかを明示する必要がある。

Arbitrary file writeを許可してはいけない。

### 5.7 Blocker G — Browser Navigation / Network Origin Boundary

`runtime_navigate`を許可するだけでは、外部Web Site / GitHub / Search Engine等へのNavigationを防げない。

Official RunではBrowser / HTTP accessをTarget Runtimeとapproved Test Control originへ限定するHost-enforced Origin Allowlistが必要である。

### 5.8 Blocker H — Narrow Approved Test Control

Current Preparationは内部的に`window.__TEST_API__`等を利用できるが、Official Runnerへ`browser_evaluate`を公開してはいけない。

Runnerには、Seed / Session / App Restart等の**限定されたRuntime Controlだけを公開するNarrow Adapter**が必要である。

概念上は以下とする。

```text
Runner
↓ approved_test_control.seed_reset(...)
↓ approved_test_control.session_set_or_clear(...)
↓ approved_test_control.app_restart()
Trusted Narrow Adapter
↓
Internal Test Control implementation
```

内部実装がBrowser evaluate等を使うこと自体は許容できるが、そのCapabilityをRunnerへExposeしない。

### 5.9 Blocker I — Challenge Patchが測定装置を改変してはいけない

Challenge PatchはProduct Defect Injectionのために使う。

Patchが以下を変更できると、Test Controlや評価基盤そのものをDefect Patchが改変し、trusted receiptやscoringの信頼性が失われる。

- Agentic QA Harness
- Test Control / Seed Bootstrap
- Session Bootstrap
- Scored Skill
- Tool Profile
- Evaluator
- Benchmark machinery
- Output Contract
- Runtime server / trusted adapter

Patch対象PathとProtected Infrastructure Pathの交差が0であることをPreparation前に機械検証する必要がある。

### 5.10 Blocker J — Trusted Budget Accounting

Challengeは`max_duration_seconds`と`max_tool_actions`を持つが、Official比較ではAgent自己申告ではなくHost-trusted counterで測定・enforceする必要がある。

---

## 6. Architecture Invariants

### 6.1 Execution Ownership

```text
Primary QA Executor
=
Coding Agent + Exploratory QA Skill
```

### 6.2 Orchestration Owner

全工程をつなぐOwnerはRepository Harnessではなく、**Trusted Operator / Host Workflow**とする。

初期実装はHuman Operatorによる明示的なhandoffでもよい。

```text
Trusted Operator / Host Workflow
↓ prepare
↓ Fresh + Fresh-context Session create
↓ Initial State bootstrap
↓ Runner execute
↓ Runner output freeze/import
↓ deterministic evaluate
```

将来Host-native Workflowへ自動化してよいが、`scripts/agentic-qa/**`からAgentをspawnしてはいけない。

Source-aware親Agentが子Agentをspawnする方式は、HostがFresh Context / no inheritanceをtrusted evidenceで証明できない限りOfficial不可とする。

### 6.3 Harness Responsibility

```text
scripts/agentic-qa/**
=
Preparation
Validation
Isolation Verification
Artifact Import / Freeze
Artifact Integrity
Evaluation
Scoring
```

### 6.4 Harnessが行ってはいけないこと

- Coding Agentを起動する
- Model APIを呼ぶ
- Agent Processを監視する
- Agent Sessionを再試行する
- AgentのTool CallをProxyする
- Agentへ逐次命令を送る
- Agent内部Reasoningを取得する

### 6.5 Runner Terminology

Black-box Scoredでいう`Runner`は、**評価対象となるFresh + Fresh-context Coding Agent Session**を意味する。

Repository独自Node.js Runner implementationを意味しない。

### 6.6 Evaluator Terminology

`Separate Evaluator`は**別のLLM Agent Sessionを意味しない**。

原則として既存`evaluate.ts`系のDeterministic Evaluatorを、Frozen Runner Artifactを入力としてRunner終了後に別Execution Contextで実行する。

Human adjudicationが必要な`review_needed`等だけを別の明示工程として扱う。

---

## 7. Target Architecture

```text
Trusted Operator / Host Workflow
        │
        ├──────────────────────────────────────┐
        │                                      │
        ▼                                      │
Instructor-side Repository                    │
  ├ Challenge Definition                      │
  ├ Answer Key                                 │
  ├ Challenge Patch                            │
  ├ Tool Profile                               │
  ├ Scored Skill Source                        │
  └ Protected Infrastructure Policy            │
        │                                      │
        ▼                                      │
Deterministic Preparation Harness             │
  ├ Contract validation                        │
  ├ Patch protected-path validation            │
  ├ Learner-safe Input packaging               │
  ├ Baseline / Patched sanity                  │
  ├ Source-free Prepared Runtime               │
  └ Canonical artifact hash                    │
        │                                      │
        ▼                                      │
Prepared Target Runtime Host                   │
  └ URL / Origin only                          │
        │                                      │
        ▼                                      │
Fresh + Fresh-context Coding Agent Session ◀───┘
  ├ read-only input/**
  ├ constrained output/**
  ├ Origin Allowlist
  ├ Narrow approved_test_control
  ├ Host-trusted Tool Inventory
  └ Host-trusted Budget Counter
        │
        ▼
Trusted Initial State Bootstrap
  ├ Seed
  ├ Role / Session
  ├ Initial Route
  └ Initial State Receipt
        │
        ▼
Exploratory QA Skill
        │
        ▼
Runner Output / Evidence
        │
        ▼
Deterministic Import + Freeze
        │
        ▼
Deterministic Evaluator
```

---

## 8. Host Capability Contract

### 8.1 Wave 0 Capability Matrix

Wave 0ではコードを書かず、最低限以下のMatrixを実測で完成させる。

| Capability | Available | Trusted Source | Machine-readable | Enforceable | Evidence shape |
|---|---|---|---|---|---|
| Fresh Session | | | | | |
| Fresh Context / no inheritance | | | | | |
| Session identity | | | | | |
| Model / configuration identity | | | | | |
| Actual Tool Scope inventory | | | | | |
| Tool allow / deny | | | | | |
| Origin allowlist | | | | | |
| isolated root | | | | | |
| constrained output write | | | | | |
| Narrow approved_test_control | | | | | |
| Session role establish / clear | | | | | |
| trusted reset operation receipt | | | | | |
| duration accounting | | | | | |
| top-level tool action accounting | | | | | |
| session audit artifact | | | | | |

必要Capabilityが1つでも満たせなければWave 1へ進まない。

### 8.2 Fresh Session / Fresh Context Capability

最低限以下をCanonical化して記録できること。

```text
session_id
session_created_at
model_identifier
model_configuration_identifier
host_runtime_identifier
host_profile_revision
session_artifact_identifier
fresh_session_proof
fresh_context_proof
parent_context_inherited=false
prior_conversation_inherited=false
repository_context_inherited=false
prior_scored_session_context_inherited=false
```

Hostから証明できない値をRepository側で推測して`false`へ設定しない。

### 8.3 Tool Inventory Capability

最低限以下を取得できること。

```text
actual_tool_scope.measured = true
actual_tool_scope.source = runner_runtime_inventory
actual_tool_scope.exposed_capabilities = [...]
```

Host固有Tool名はRepositoryのCanonical Runtime Capabilityへ明示的にnormalizeする。

未知Capabilityを無視しない。

情報境界への影響を判断できない未知Capabilityはfail-closeする。

### 8.4 Permission / Isolation Capability

Host側で以下をdenyできること。

- Repository Source Read
- `.git`
- Existing / Hidden Tests
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
- Prior Scored Session access

Skillの指示だけで禁止したことにはしない。

### 8.5 Origin Allowlist Capability

Web Official Runでは、Runner Browser / HTTP Capabilityを最低限以下だけへ限定できること。

```text
allowed_origins = [
  prepared Target Runtime origin,
  approved Test Control origin if different
]
```

Origin外Navigation、redirect、fetch、new page / popup等がHost Tool Boundaryを越えて到達できないことをnegative probeで確認する。

### 8.6 Narrow Approved Test Control Capability

Runnerへ許可してよいControlはChallengeの`allowed_runtime_controls`からderiveする。

初期Web Scopeで必要になり得る操作例:

```text
seed_reset
session_set_or_clear
app_restart
deep_link
clock
payment_delay
```

実装上の重要ルール:

- Runnerへ`browser_evaluate`を公開しない。
- Runnerへgeneric JavaScript executionを公開しない。
- Runnerへ任意localStorage / IndexedDB操作を公開しない。
- Adapter内部がCurrent Test Controlを使う場合でも、Runnerから見えるCapabilityは上記Narrow Operationだけにする。
- 各操作はtrusted `operation_id`と結果を返せること。
- Challengeが許可していないControlは呼べないこと。

### 8.7 Budget Capability

Official RunではHostが以下を機械計測できること。

- exploration_started_at
- exploration_ended_at
- duration_seconds
- tool_actions
- stop_reason

可能であればHard Timeout / Hard Tool-action CapもHostでenforceする。

HostがAction Countを取得・enforceできない場合、`max_tool_actions`を比較条件として持つChallengeのOfficial RunはBLOCKEDとする。

### 8.8 Host Capability Gate

Wave 0でCapability Matrixが必要条件を満たさない場合、**Wave 1以降のRepository実装へ進まない**。

```text
Host capability sufficient
→ Implementation開始

Host capability insufficient
→ Official Run = BLOCKED
→ Plan / Capability Matrixのみ残す
→ Custom Runnerは作らない
```

---

## 9. Learner-safe Input / Skill Contract

### 9.1 Positive Input Allowlist

Fresh Runner Sessionへ渡してよいものを明示する。

- Learner-safe Specification Bundle
- Challenge learner-facing definition
- Challenge Runbook
- Learner-safe Scored Skill Snapshot
- Target Runtime URL / allowed origins
- Required Initial State definition
- allowed runtime controls
- Exploration Budget
- Stop Condition
- Output Contract

渡してはいけないもの:

- Repository Root
- Source path
- `.git`
- Existing / Hidden Tests
- Answer Key
- Challenge Patch
- Ground Truth
- Instructor-only Benchmark metadata
- Evaluator configuration
- Historical Runner Findings
- Previous Evaluation
- Instructor-only logs

### 9.2 Canonical Scored Skill

Black-box Scored Runnerへ渡すSkill InstructionをSource-free環境でも自己完結させる。

Preferred initial design:

```text
training/agentic-qa/skills/scored-v1.md
```

`.agents/skills/exploratory-qa/SKILL.md`のBlack-box Scored節は、このCanonical文書を参照する。

同じRuleを2箇所へ手作業で複製しない。

HostがSkill InstallationとExact Revisionをtrustedに固定できる場合、Host-installed Skillを使用してよい。

### 9.3 Scored Skill Snapshot

Preparation時にRunnerへ渡すExact Skill bytesをfreezeし、

```text
skill_revision = sha256:<64 lowercase hex>
```

を計算する。

Skill SnapshotはRepository Source Pathや`QA_AGENT.md`等のRunnerから読めない文書をRequired Readingにしてはいけない。

### 9.4 Learner-safe Input Manifest

Runnerへ渡したInput全体をMachine Artifactとして固定する。

例:

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

Runnerへ渡したPrompt / learner-safe file bytesとManifestが一致しなければOfficial invalidとする。

---

## 10. Benchmark / Runner Comparison Identity

### 10.1 Benchmark Revision

Benchmark Revisionは**何を評価したか**を表す。

Canonical Benchmark Revision Inputへ最低限以下を含める。

- source head / working tree inputs
- learner-safe Specification entries
- Challenge Definition
- Instructor Answer Key
- Challenge Patch
- Challenge Runbook
- runtime variant identity

RunbookはAgentの探索指示へ直接影響するため、Benchmark Revisionから除外しない。

Runner ProfileはBenchmark Revisionへ含めない。

### 10.2 Runner Profile

Runner Profileは**どの実行条件で評価したか**を表す。

現行Profileへ、実装時に最低限以下を追加する。

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

Output ContractはFindingの粒度や必須Field、Evidence要求へ影響し、Precision等の比較結果を変え得るためRunner Profileへ含める。

Host-specificな細かな値を無制限に増やさず、比較結果へ実質影響する設定だけをCanonical化する。

### 10.3 Official Runtime Variant

Historical fixture互換のため既存Schema全体を即座にnon-nullへ変更する必要はない。

ただし`execution_kind = official_model_backed`では、Evaluator verification上、`runtime_variant_id`を**non-null必須**とする。

例:

```text
web-chromium-desktop-v1
```

Runtime VariantがnullのOfficial Runは`valid_for_scoring=false`とする。

### 10.4 Prepared Target Identity

`target-runtime.json`に`artifact_sha256`を持たせる。

Same-condition比較では、Benchmark IdentityとRunner Profileだけでなく**Prepared Target Artifact Hashも一致**させる。

最も比較精度が高い方式は、1つのImmutable Prepared Target Artifactを複数Fresh Runで再利用することである。

### 10.5 Same-condition Definition

```text
same Benchmark Identity
AND same Prepared Target artifact_sha256
AND same Runner Profile
```

で同条件とする。

Model / model configuration / Skill / Tool Profile / Output Contract / Host Profileのいずれかが異なる場合はRunner Conditionが異なる。

---

## 11. Canonical Artifact Hash Contract

### 11.1 Problem

`dist/**`やFrozen Runner Artifact SetはDirectoryであり、Directory自体に標準的なSHA-256計算方法はない。

ZIP / TAR bytesをそのままhashするとtimestampやmetadata差でhashが変わる可能性があるため、Official identityへ直接使わない。

### 11.2 Canonical File Manifest

Directory Artifactは以下のCanonical Manifestを生成してhashする。

```json
{
  "schema_version": 1,
  "files": [
    {
      "path": "assets/app.js",
      "sha256": "<64 lowercase hex>"
    },
    {
      "path": "index.html",
      "sha256": "<64 lowercase hex>"
    }
  ]
}
```

Canonicalization Rule:

1. Regular Fileだけを対象にする。
2. PathはArtifact RootからのPOSIX relative pathとする。
3. `..`、absolute path、backslashを許可しない。
4. Symlinkは原則禁止する。必要になった場合は別Contract化し、暗黙followしない。
5. 各Fileのraw bytesへSHA-256を計算する。
6. `files[]`をpathのcode-unit昇順でsortする。
7. mtime、owner、permission等の非内容metadataを含めない。
8. Canonical JSON serializationを固定する。
9. `artifact_sha256 = sha256(canonical manifest bytes)`とする。

同じAlgorithmをPrepared Target ArtifactとFrozen Runner Artifactへ再利用する。

### 11.3 Hash Verification

- Artifact生成直後にmanifest/hashを作る。
- Runtime start前に再検証する。
- Runner比較前に再検証する。
- Freeze後のRunner ArtifactもEvaluator開始前に再検証する。

Hash mismatchはOfficial invalidとする。

---

## 12. Prepared Target Runtime Contract

### 12.1 Principle

Fresh AgentへRepository Sourceを渡さず、**実行可能なTarget Runtimeだけを提供**する。

### 12.2 Web Runtime Artifact

Scenario Shop Webでは、patched Disposable Sourceから生成した`dist/**`をRuntime Artifactとして使用する。

ArtifactはInstructor-side trusted領域へ保存し、Agentのisolated execution rootには入れない。

```text
.artifacts/agentic-qa/<run_id>/trusted/prepared-target/
  target-runtime.json
  artifact-manifest.json
  web-dist/
```

Agentへ与えるのはURLとlearner-safe runtime metadataだけとする。

### 12.3 Runtime Identity

`target-runtime.json`には最低限以下を記録する。

```json
{
  "schema_version": 1,
  "run_id": "YYYYMMDD-HHMMSS-JST",
  "challenge_id": "CHALLENGE-BASIC-001",
  "benchmark_revision": "...",
  "runtime_variant_id": "web-chromium-desktop-v1",
  "artifact_sha256": "...",
  "artifact_manifest_sha256": "...",
  "source_head_sha": "...",
  "patch_sha256": "...",
  "created_at": "...",
  "source_cleanup_completed": true
}
```

### 12.4 Source Cleanup Boundary

Target RuntimeをFresh Agentへ公開する前に、以下を完了する。

- Disposable Source削除
- Temporary `.git`不在
- Existing / Hidden Test不在
- Challenge Patch不在
- Answer Key不在
- Source Map不在
- Agent isolated rootにRuntime Artifact bytes不在

### 12.5 Runtime Server

Target Runtime ServerはHarness側が起動してよい。

役割は**Target Applicationをserveすることだけ**とする。

HarnessがCoding Agentを起動・制御することは禁止する。

Server lifecycle:

```text
Prepared Runtime hash verify
↓
Prepared Runtime start
↓
Readiness Probe PASS
↓
Runtime URL / Origin確定
↓
Fresh Agent execution
↓
Runner result freeze / import
↓
Runtime stop
```

Agent実行の成功・失敗にかかわらずRuntime stopを保証する。

---

## 13. Challenge Patch / Protected Infrastructure Contract

### 13.1 Principle

Challenge Patchは**Product Defect Injection**だけに使用する。

測定装置、Test Control、Scoring、Runner Input等をPatchが変更してはいけない。

### 13.2 Protected Infrastructure

Wave 0でCurrent Mainを再棚卸しし、Machine-readable Protected Path Setを固定する。

最低限以下の責務を持つPathはProtected対象とする。

- `scripts/agentic-qa/**`
- `training/agentic-qa/tool-profiles/**`
- `training/agentic-qa/skills/**`
- Instructor Answer Key / Benchmark machinery
- Scored Output Contract
- Test Control implementation
- Seed / Session bootstrap infrastructure
- Prepared Runtime server infrastructure
- Evaluator infrastructure
- Agentic QA contracts / validation

実際のProduct/Test Control配置に合わせてExact Path / Prefixを決める。

### 13.3 Patch Validation

Preparation前にPatch headerから変更Pathを抽出し、

```text
patch_paths ∩ protected_infrastructure_paths = empty
```

を機械検証する。

さらに以下をrejectする。

- parent traversal
- absolute path
- symlink escapeを狙う変更
- Protected Pathへのrename / delete / add
- Harness / Test Controlのimport経路を書き換えて間接的にProtected codeを差し替える変更で、現在Validatorが明確に検出できるもの

完全な静的security scannerを作る必要はない。

少なくとも「Defect Patchが直接測定装置を変更する」ケースをfail-closeで防ぐ。

---

## 14. Trusted Initial State Bootstrap Contract

### 14.1 Initial State SSOT

Official RunのInitial StateはSeed単体ではなく、各Required Coverageの以下で決まる。

```text
coverage.seed
coverage.role
Canonical Seed Metadata.initialSession
Canonical Seed Metadata.safeResetPath
Challenge.allowed_runtime_controls
```

Challenge ID固有分岐を正本にしない。

### 14.2 Generic Bootstrap Rule

概念上、各Coverageについて以下を実施する。

```text
seed_reset(coverage.seed)
↓
Role / Session reconciliation
↓
Initial route normalization
↓
Trusted state observation
↓
Receipt freeze
↓
Exploration開始
```

Role / Session reconciliationの最低ルール:

```text
coverage.role == guest
→ session_present must be false
→ authenticated sessionがSeedで作成されてもtrusted controlでclearする

coverage.role == customer/operator/admin
→ session_present must be true
→ observed_role must equal coverage.role
→ SeedのinitialSessionがCoverage roleと一致しない場合は、許可されたnarrow controlで正しいSessionへ設定するかBLOCKED
```

任意のRole spoofing APIをRunnerへ公開しない。

Session操作はChallengeが許可するOfficial Bootstrap Operationとして、Exploration開始前だけTrusted Operator / Host Workflowが実行する方式でもよい。

### 14.3 Initial Route

Seed Metadataの`safeResetPath`またはCoverage / Runbookで明示したLearner-safe初期Routeへ遷移する。

Initial RouteがChallengeの探索目的と矛盾する場合、Challenge Contract自体を修正する。Challenge ID固有コードで隠さない。

### 14.4 Narrow Control

Runner自身がBootstrapを行う場合でも、使用するのはSection 8.6のNarrow `approved_test_control`だけとする。

`browser_evaluate`、任意localStorage操作、任意IndexedDB操作は引き続きForbiddenである。

### 14.5 Receipt Set

Required Coverageは配列であるため、Receiptも複数Coverageへ対応する。

Canonical Artifactは、

```text
initial-state-receipts.json
```

とし、CoverageごとのReceipt配列を持つ。

例:

```json
{
  "schema_version": 1,
  "run_id": "...",
  "receipts": [
    {
      "challenge_id": "CHALLENGE-BASIC-001",
      "coverage_id": "COV-001",
      "runner_session_id": "...",
      "requested_seed": "suspended-user",
      "requested_role": "guest",
      "observed_role": "guest",
      "session_present": false,
      "initial_path": "/login",
      "reset_operation_id": "...",
      "session_operation_id": "...",
      "reset_completed": true,
      "target_runtime_artifact_sha256": "...",
      "runtime_variant_id": "web-chromium-desktop-v1",
      "runtime_url_origin": "...",
      "state_fingerprint": "...",
      "completed_at": "..."
    }
  ]
}
```

### 14.6 Receipt Ownership

ReceiptはRunnerが任意に自己生成するArtifactにしない。

Test Control / Host Adapter / trusted deterministic layerがOperation結果から生成する。

`state_fingerprint`はCurrent Test Controlで決定的に取得可能な範囲に限定する。取得できない場合は無理に推測値を入れず、代替のtrusted state revisionを定義する。

ReceiptのRunner Session / Runtime Artifact / Challenge / Coverage bindingが一致しなければOfficial invalidとする。

### 14.7 Failure

Bootstrap失敗時は該当Required Coverageを実行せず、`blocked_environment` / invalidとして扱う。

### 14.8 Budget Boundary

Initial State Bootstrap / readiness確認はExploration Budget外とする。

最初の探索Tool ActionからHost-trusted Budget計測を開始する。

---

## 15. Runner Input / Output Filesystem Contract

### 15.1 Isolated Root

Runner isolated rootは概念的に以下へ分ける。

```text
isolated-run-root/
  input/      # learner-safe, read-only
  output/     # constrained write only
```

### 15.2 Input

`input/**`はRunnerにread-onlyで公開する。

例:

- learner-safe Specification Bundle
- Challenge Definition
- Runbook
- Scored Skill Snapshot
- Output Contract
- Runtime metadata
- Initial State definition

### 15.3 Output

Runnerは`output/**`以外へwriteできない。

新しいAllowed Capabilityとして、必要なら以下をTool Profileへ追加する。

```text
runner_output_write
```

これはGeneric File Writeではなく、Hostが`output/**`へpath-confined writeを提供するCapabilityとする。

禁止:

- Parent traversal
- Symlink escape
- Absolute path
- Repository write
- Trusted artifact write
- Arbitrary shell

### 15.4 Runner Output

最低限:

```text
output/
  qa-findings.json
  evidence/**
```

Runner終了後、Harnessは終了済みOutputをcurrent run ArtifactへDeterministic Importし、Schema / Path / Canonical Hashを検証してFreezeする。

Artifact ImportはAgent orchestrationではない。

---

## 16. Artifact Ownership / Tamper Boundary

Official RunではArtifactごとのWriterを固定する。

| Artifact | Trusted Writer / Owner | Runner write可否 |
|---|---|---|
| Challenge / Answer Key / Patch | Instructor Repository | No |
| Benchmark Manifest | Preparation Harness | No |
| Learner-safe Input Manifest | Preparation Harness | No |
| Prepared Artifact Manifest / Runtime Identity | Preparation Harness | No |
| Runner Session Evidence | Host Runtime / trusted adapter | No |
| Actual Tool Inventory | Host Runtime | No |
| Forbidden Probe | Host / trusted isolation layer | No |
| Initial State Receipts | trusted Test Control / adapter | No |
| Runner Execution Summary | Host Runtime | No |
| `qa-findings.json` | Runner | Yes, constrained output only |
| Runtime Evidence | Runner Runtime Tool | Yes, constrained artifact channel |
| Frozen Runner Artifact Manifest | Harness import/freeze | No after freeze |
| `evaluation.json` | Deterministic Evaluator | No |

RunnerがHost-trusted Artifactを変更できるFilesystem / Tool権限を持ってはいけない。

EvaluatorはFrozen Runner Artifactを変更しない。

Trusted ArtifactとRunner-generated ArtifactはDirectory / Permissionでも分離する。

```text
.artifacts/agentic-qa/<run_id>/
  trusted/**
  runner/**
  evaluation/**
```

既存safe artifact contractと整合する範囲で導入し、別Rootを増やさない。

---

## 17. Fresh Runner Execution Contract

### 17.1 Start

Trusted Operator / Host WorkflowがHost-native capabilityでFresh + Fresh-context Coding Agent Sessionを作成する。

Repository HarnessからAgent launchしない。

### 17.2 Runner Session Evidence

既存`runner-session.json` Contractを拡張し、最低限以下をtrusted sourceから記録する。

- current session id
- prior Runner session ids
- session artifact new
- fresh session proof
- fresh context proof
- no parent / repository / prior-scored context inheritance
- model identifier
- model configuration identifier
- host identifier / host profile revision
- Benchmark Revision
- Runtime Variant
- Prepared Target artifact hash
- Actual Tool Scope
- Forbidden Probe reference
- Tool Profile revision
- Skill revision
- Output Contract revision

### 17.3 Origin Boundary

Runner BrowserはTarget Runtime / approved Test Control origin以外へNavigate / Fetchできない。

Redirect / popup / new pageも同じBoundaryへ従う。

### 17.4 Skill Execution

Coding AgentはLearner-safe Scored Skill Snapshotを使用する。

Repository Sourceを読むことなく、Runtime observationだけで判断する。

### 17.5 Findings

Required CoverageごとにObservationを行い、FindingがあればAtomicに記録する。

Evidenceはcurrent runのみを使用する。

### 17.6 Freeze

Runner Session終了後、Harnessがconstrained outputから`qa-findings.json` / evidenceをimportし、Canonical Artifact Hashを記録してFreezeする。

Freeze後にFinding内容をEvaluator側で変更しない。

---

## 18. Trusted Budget / Stop Contract

### 18.1 Tool Action Semantics

Official比較における`1 Tool Action`は、原則として以下と定義する。

> Exploration開始後に、HostがRunner要求としてdispatchした**1 top-level tool invocation**。

Rules:

- Tool Call成功 / 失敗の両方をcountする。
- Initial State Bootstrap / readiness probeはcount外。
- Host内部retryはRunnerが新しいtop-level Tool Callを出していなければ追加countしない。
- Runnerが明示的に再実行したTool Callは別Actionとしてcountする。
- Hostが異なるCounter Semanticsしか提供できない場合、その意味を`host_profile_revision`へ含め、異なるSemanticsをsame-condition扱いしない。

### 18.2 Duration Semantics

`duration_seconds`はHostのmonotonic wall-clockを用い、

```text
exploration_started_at
→ terminal stop
```

の経過時間とする。

Bootstrap時間やPreparation時間を含めない。

### 18.3 Runner Execution Summary

Host-trusted Artifactとして、

```text
runner-execution-summary.json
```

を保存する。

最低限:

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

### 18.4 Canonical Stop Reason

既存`STOP_CONDITION = required_coverage_and_candidates_resolved_or_budget_exhausted`と意味を揃える。

Canonical Stop Reason:

```text
required_coverage_and_candidates_resolved
budget_duration_exhausted
budget_tool_actions_exhausted
environment_blocked
runner_failed
operator_cancelled
```

`coverage_completed`だけでは候補Finding未解決でも停止できるため使用しない。

### 18.5 Enforcement

Challenge BudgetとExecution SummaryをEvaluatorが比較する。

Budget超過がある場合、Hostがhard enforcementできず超過したRunをsame-condition Official Scoreとして有効化しない。

Runner自己申告のAction Countをtrusted metricとして扱わない。

---

## 19. Deterministic Separate Evaluator Contract

### 19.1 Separation

EvaluatorはRunner Agent Sessionではない。

Runner終了・Artifact Freeze後にInstructor-sideのDeterministic Evaluatorとして実行する。

同じTrusted Machine上で実行してもよいが、Runnerのconversation / tool stateを再利用しない。

### 19.2 Evaluator Inputs

- Frozen `qa-findings.json`
- Frozen Evidence
- Challenge Definition
- Answer Key
- Benchmark Manifest
- Learner-safe Input Manifest
- Target Runtime Identity
- Prepared Artifact Manifest
- Tool Profile bytes
- Runner Session Evidence
- Actual Tool Inventory
- Forbidden Probe
- Initial State Receipts
- Runner Execution Summary
- Frozen Runner Artifact Manifest / hash

### 19.3 Evaluation Execution Receipt

必要なら現在の`evaluator-session.json`を、より正確な名称・Contractへ移行する。

```text
evaluator-execution.json
```

最低限:

```text
evaluator_execution_id
runner_session_id
frozen_runner_artifact_sha256
evaluator_revision
started_at
completed_at
```

別LLM Sessionを作ることを要件にしない。

### 19.4 Validation Order

Scoring前に以下をfail-closeで検証する。

```text
Schema
↓
Benchmark Identity / Runbook revision
↓
Official Runtime Variant non-null
↓
Prepared Target Identity / Canonical hash
↓
Runner Profile / Skill / Output Contract revision
↓
Fresh Session / Fresh Context
↓
Tool Profile Revision
↓
Actual Tool Scope
↓
Origin Boundary / Forbidden Probe
↓
Initial State Receipt binding / Role / Session
↓
Budget / Stop accounting
↓
Evidence / Frozen Artifact Integrity
↓
Required Coverage
↓
Ground Truth Match
↓
Scoring
```

Official verificationが1つでも失敗した場合、metricsを有効値として出さない。

---

## 20. Artifact Set

Official Runでは最低限以下を1 `run_id`へ束ねる。

```text
.codex/runs/<run_id>/
  challenge reference
  learner-safe-spec-bundle.json
  benchmark-manifest-<challenge_id>.json
  runner-profile.json
  qa-findings.json or frozen reference
  evaluation.json
  REPORT.md

.artifacts/agentic-qa/<run_id>/
  trusted/
    learner-safe-input-manifest.json
    target-runtime.json
    prepared-artifact-manifest.json
    runner-session.json
    forbidden-probe.json
    initial-state-receipts.json
    runner-execution-summary.json
    prepared-target/**
  runner/
    qa-findings.json
    evidence/**
    frozen-runner-artifact-manifest.json
  evaluation/
    evaluator-execution.json
```

Instructor-only Artifact / Runner-visible Artifact / Runner-generated Artifact / Evaluation Artifactの境界を文書とPermissionの両方で一致させる。

---

## 21. Implementation Start Gate

### 21.1 Repository Gate

- PR #16が`main`へマージ済み。
- `pnpm run verify`が最新`main`でPASSする。
- Required CIがPASSする。
- `docs/spec/` / Skill / Agentic QA ContractがCurrent Truthと一致する。
- Challenge Basic / Intermediate / Advancedがvalidation PASSする。

### 21.2 Host Capability Gate

Wave 0 Capability Matrixで以下を実証できる。

- Fresh Session
- Fresh Context / no inheritance
- trusted Session ID
- model identifier / model configuration
- Actual Tool Scope inventory
- Capability allow / deny enforcement
- Browser Origin Allowlist
- isolated working root
- constrained output write
- Narrow approved_test_control
- trusted Initial State operation receipt
- trusted duration / top-level tool-action accounting
- session-level artifact / audit identity

### 21.3 Decision Gate

Host Runtime Gateが未達の場合、Repository Implementationを開始しない。

不足CapabilityをRepository独自Agent Runtimeで埋めない。

---

## 22. Implementation Waves

### Wave 0 — Current Main Rebaseline / Host Capability Spike

目的:

コード変更前にRepositoryとHost双方の事実を確定する。

作業:

- 最新`main`のAgentic QA Contract再確認
- Basic / Intermediate / Advanced Challenge再Validation
- Canonical Seed MetadataとCoverage Role / Initial Session整合確認
- Section 8のCapability Matrixを実測で完成
- Fresh SessionとFresh Contextを別Capabilityとして確認
- Tool Inventory取得方法確認
- Permission / Origin enforcement確認
- constrained output channel確認
- Narrow approved_test_control確認
- trusted Initial State receipt確認
- trusted budget accounting確認
- Protected Infrastructure候補Path棚卸し
- 不足Capability明示

このWaveではProduct / Harness実装を変更しない。

Exit Gate:

```text
Host capability sufficient
→ Wave 1へ

Host capability insufficient
→ BLOCKED
→ Custom Runnerを作らず終了
```

### Wave 1 — Machine / Ownership / Protected Path Contract

目的:

新しいTrust Boundaryをコード実装前にMachine Contractとして固定する。

追加 / 拡張候補:

- `preparedTargetRuntimeSchema`
- canonical artifact manifest schema
- `learnerSafeInputManifestSchema`
- `initialStateReceiptsSchema`
- `runnerSessionSchema` Fresh Context fields
- `runnerExecutionSummarySchema`
- Frozen Runner Artifact schema
- Evaluator Execution Receipt schema
- `runnerProfileSchema` Skill / Output / Host / Model configuration revision
- Benchmark Manifest Runbook entry
- Tool Profile `runner_output_write`
- allowed origin contract
- Official runtime variant non-null verification
- protected infrastructure path contract
- narrow approved_test_control contract

Validation:

- valid fixture PASS
- missing trusted session identity FAIL
- fresh context unproven FAIL
- unmeasured Tool Scope FAIL
- unknown unsafe capability FAIL
- origin boundary missing FAIL
- source cleanup incomplete FAIL
- Skill revision missing FAIL
- Output Contract revision missing FAIL
- Runbook revision mismatch FAIL
- Initial State Role / Session mismatch FAIL
- stale / cross-session Receipt FAIL
- Budget receipt missing FAIL
- trusted artifact Runner mutation FAIL
- Patch touching Protected Infrastructure FAIL
- null runtime_variant_id for Official FAIL
- nondeterministic / unsorted artifact manifest FAIL

### Wave 2 — Learner-safe Skill / Input Packaging

目的:

Source-free Runnerが必要InstructionをRepository Readなしで受け取れるようにする。

作業:

- Canonical Scored Skill Source確定
- Learner-safe Skill Snapshot生成
- Skill SHA-256
- Runbook SHA-256
- Output Contract revision
- learner-safe input manifest生成
- isolated `input/**` read-only packaging
- Instructor-only content混入検査

Exit Gate:

- Runner入力だけでBlack-box Scored workflowを理解できる
- `QA_AGENT.md`等の非公開Repository Readを要求しない
- Input bytes / revisionが決定的

### Wave 3 — Source-free Prepared Target Runtime / Canonical Hash

目的:

Patched RuntimeをFresh AgentへSource非公開かつ内容同一性を証明可能な形で提供する。

作業:

1. Disposable Source作成
2. Protected Path validation
3. Baseline Build / Sanity
4. Patch Apply
5. Patched Build / Sanity
6. `dist/**`をPrepared Target Artifactへcopy
7. Source Map / prohibited artifact検査
8. Canonical File Manifest生成
9. Artifact SHA-256計算
10. Disposable Source削除
11. `target-runtime.json`作成
12. Prepared ArtifactだけからRuntime起動
13. Runtime start前Hash再検証
14. Readiness probe
15. Origin確定
16. Runtime停止 / cleanup test

このWaveでCoding Agentは起動しない。

Exit Gate:

- Source削除後でもRuntimeが起動する
- Runtime URLでApplicationが操作可能
- Agent isolated rootにBuild Artifact bytesがない
- Runtime Artifact hashが決定的

### Wave 4 — Trusted Initial State Bootstrap / State Receipts

目的:

各CoverageのSeed + Role + Session + Initial Routeを決定的に成立させる。

作業:

- Challenge `allowed_runtime_controls`検証
- Coverage Seed / RoleとCanonical Seed Metadataの整合計算
- Narrow Seed Reset
- Guest Session clear / authenticated Role establishを一般Contract化
- Initial Route normalization
- trusted operation ID取得
- Initial State observation
- Session / Runtime Artifact / CoverageへbindしたReceipt生成
- `initial-state-receipts.json`生成
- wrong seed / wrong role / stale receipt / different runner session / different runtime hashのnegative test

Exit Gate:

- Basicの`guest + suspended-user`がChallenge ID特殊分岐なしで成立する
- Intermediateの`operator + orders-phase1-statuses`が同じContractで成立する
- Advancedの`guest + default`が同じContractで成立する
- Preparation Browser stateに依存しない

### Wave 5 — Host-native Fresh Runner / Isolation Integration

目的:

Repository ScriptにAgent Runnerを作らず、Host-native capabilityでFresh + Fresh-context Runnerを作る。

作業:

- Trusted Operator / Host WorkflowでFresh Session作成
- Fresh Context evidence取得
- Model / Host profile取得
- Positive Tool Allowlist適用
- Origin Allowlist適用
- Actual Tool Scope取得
- Forbidden Probe
- learner-safe `input/**`投入
- constrained `output/**`付与
- Narrow approved_test_control提供
- Target Runtime URL提供
- Scored Skill起動

禁止:

- `scripts/agentic-qa/**`からAgent launch
- Child processでCodex / model CLI起動
- Model SDK dependency追加
- source-aware parent contextの暗黙継承
- arbitrary browser evaluateのRunner公開

Exit Gate:

Runner Session Evidence / Tool Inventory / Context Evidence / Origin BoundaryがMachine Contractを満たす。

### Wave 6 — Trusted Budget Accounting

目的:

探索時間とTool Action数をAgent自己申告に依存せず比較可能にする。

作業:

- Exploration start boundary固定
- top-level Tool Action semantics固定
- Host timer / tool action counter取得
- Hard cap capability確認
- `runner-execution-summary.json`生成
- Challenge Budgetとの整合validation
- duration / action超過negative test
- bootstrap actionがbudgetへ混入しないことを確認
- Stop Reasonが既存STOP_CONDITION semanticsと一致することを確認

Exit Gate:

Official RunのBudget / Stop Reasonがtrusted evidenceで再現できる。

### Wave 7 — Runner Output Import / Findings Freeze

目的:

Runner OutputをEvaluatorへ渡す前にImmutableにする。

作業:

- `output/**` path confinement
- Required Coverage確認
- current-run Evidence確認
- Atomic Finding確認
- `qa-findings.json`Schema validation
- Evidence import
- Canonical Frozen Artifact Manifest生成
- Frozen bytes hash記録
- Runner Session終了
- Post-freeze mutation検知

Negative:

- parent traversal
- symlink escape
- trusted artifact overwrite
- previous-run evidence
- unsafe path
- missing evidence
- post-freeze mutation

をrejectする。

### Wave 8 — Deterministic Evaluator Integration

目的:

Runnerと独立したDeterministic Execution ContextでOfficial scoringする。

作業:

- Evaluator revision / execution receipt
- Answer Key読込
- Benchmark / Runbook revision検証
- Official Runtime Variant検証
- Prepared Target canonical hash検証
- Runner Profile / Skill / Output Contract revision検証
- Fresh Session / Fresh Context検証
- Tool Scope / Origin / Forbidden Probe検証
- Initial State ReceiptのSeed / Role / Session / Runtime binding検証
- Budget / Stop検証
- Evidence / Frozen Artifact Integrity
- TP / FP / FN / TN / NE
- Metrics

Official verification失敗時は`valid_for_scoring=false`とする。

### Wave 9 — Basic Official E2E

対象:

`CHALLENGE-BASIC-001`

実行:

```text
Preparation
→ Source-free Runtime
→ Fresh + Fresh-context Runner
→ suspended-user + guest Initial State
→ Skill exploration
→ Frozen Runner Artifact
→ Deterministic Evaluator
```

DoD:

- execution_kindがOfficial model-backed種別
- `runtime_variant_id` non-null
- `valid_for_scoring=true`
- Fresh Session / Fresh Context PASS
- trusted Tool Scope measured
- Origin Boundary PASS
- guest Session state PASS
- Initial State Receipt binding PASS
- Budget accounting PASS
- Skill / Runbook / Output Contract revision fixed
- Evidence current-run only
- metrics non-null where denominator permits
- Artifact audit PASS

Contract Fixtureをこの証拠に使用しない。

### Wave 10 — Intermediate / Advanced Official E2E

BasicでArchitectureが成立した後だけ進む。

対象:

- `CHALLENGE-INTERMEDIATE-001`
- `CHALLENGE-ADVANCED-001`

確認:

- Intermediate: `orders-phase1-statuses + operator`
- Advanced: `default + guest`

同じInitial State Contract / Narrow Test Control / Runner Contractで実行する。

Basic専用特殊処理を共通Runtimeへ持ち込まない。

### Wave 11 — Reproducibility / Same-condition Comparison

目的:

同一条件で複数Fresh Runを比較できることを実証する。

最優先は**同じPrepared Target Artifactを再利用**する。

最低限:

```text
same Benchmark Identity
same Prepared Target artifact_sha256
same Runner Profile
```

で2回以上Fresh Runを実施する。

確認:

- Benchmark Identity一致
- Prepared Target hash一致
- Runner Session IDは異なる
- Fresh Context proofは各Run固有
- Evidenceはrunごとに分離
- Metrics比較可能

次にmodel / model configurationだけ変えた場合、

```text
Benchmark Identity = SAME
Prepared Target = SAME
Runner Condition = DIFFERENT
```

となることを確認する。

### Wave 12 — Documentation / Curriculum / Final Audit

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
- Web-only initial scopeを逸脱していない
- Official Evidence揃っている
- Contract FixtureをOfficial扱いしていない
- Source / Context / Tool / Origin isolationを実測証明
- Artifact ownership境界を実測証明
- Protected InfrastructureをChallenge Patchが変更していない
- Host capability evidence保存
- Required Validation PASS

---

## 23. Test Strategy

### 23.1 Contract Tests

Browser不要。

- Prepared Target Schema
- Canonical Artifact Manifest / hash
- Learner-safe Input Manifest
- Skill / Runbook / Output Contract revision
- Fresh Session / Fresh Context fields
- Actual Tool Scope
- Origin Allowlist
- Forbidden Probe
- Narrow approved_test_control capability
- Initial State Receipt Seed / Role / Session binding
- multi-Coverage receipt integrity
- Runner Execution Summary
- Tool Action / Stop Reason semantics
- Runner Profile
- Official runtime variant
- Benchmark Identity
- Protected Infrastructure path rejection
- Artifact ownership
- Output path confinement
- Freeze semantics
- Deterministic evaluator receipt

### 23.2 Runtime Integration Tests

Chromium required。

- prepared artifactからRuntime起動
- Source cleanup後Runtime起動
- canonical hash再検証
- readiness
- origin enforcement integration
- Narrow seed reset / session clear / session establish
- Basic guest Initial State
- Intermediate operator Initial State
- app restart
- Initial State Receipt
- cleanup

Contract Suiteへ実Browser dependencyを混ぜない。

### 23.3 Host Integration Tests

Host capabilityが利用できる環境だけで実行する。

- Fresh Session identity
- Fresh Context / no inheritance
- Tool inventory
- Tool deny enforcement
- Origin deny enforcement
- constrained output write
- Narrow approved_test_control
- budget timer / top-level tool action accounting
- learner-safe input boundary

Host capabilityがない一般CIでfake PASSしない。

### 23.4 Official E2E

Manual / Explicit workflowまたはHost-native executionで実施する。

初期段階ではRequired CIにしない。

---

## 24. Failure / Blocker Policy

### 24.1 Local Blocker

特定ChallengeだけのInitial State / Runtime / Ground Truth問題は、そのChallengeだけをblockする。

他ChallengeのContract / Runtime workは継続してよい。

### 24.2 Global Blocker

以下はWhole Official Executionを止める。

- trusted Fresh Sessionを作れない
- Fresh Context / no inheritanceを証明できない
- Actual Tool Scopeを実測できない
- forbidden capabilityをHostでdenyできない
- Runtime OriginをHostでrestrictできない
- Narrow approved_test_controlを安全に提供できない
- trusted Budget accountingができない
- constrained Runner Outputを提供できない
- source-free Target Runtimeを作れない
- Learner-safe Scored SkillをSource-freeに供給できない
- Challenge PatchがProtected Infrastructureを変更する
- Answer Key / Patch / Source / Prior FindingsがRunnerへ露出する
- Artifact ownership / tamper boundaryを保証できない
- Deterministic EvaluatorへのFrozen inputを保証できない

### 24.3 Fail-close

不明な状態をPASSへ寄せない。

```text
unknown
unmeasured
not executed
not supported
unproven
```

は明示的にinvalid / blockedへ分類する。

---

## 25. Expected File Scope for Implementation PR

Implementation時の変更候補は以下。

```text
scripts/agentic-qa/contracts.ts
scripts/agentic-qa/prepare-challenge.ts
scripts/agentic-qa/isolation.ts
scripts/agentic-qa/runner.ts
scripts/agentic-qa/evaluate.ts
scripts/agentic-qa/validate-contracts.ts
scripts/agentic-qa/benchmark-revision.ts
scripts/agentic-qa/build-learner-bundle.ts

# 新規の場合でも最小限
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

Host integrationをRepository codeへ追加する必要がある場合も、**Agent launch wrapperではなくMachine Contract / trusted evidence adapterに限定**する。

Product code、Native code、Maestro Regressionは原則変更しない。

---

## 26. Validation Gates

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

## 27. Definition of Done

### Architecture

- [ ] Coding Agent + Exploratory QA SkillがPrimary Executorのまま
- [ ] Repository独自Agent Runnerを実装していない
- [ ] HarnessがAgentをlaunch / wrap / orchestrateしない
- [ ] Trusted Operator / Host Workflowがhandoff Ownerとして明示されている

### Host / Context

- [ ] trusted Fresh Session identityをHostから取得できる
- [ ] Fresh Context / no inheritanceをHostから証明できる
- [ ] Model / Host configuration revisionを記録できる
- [ ] Actual Tool ScopeをHostから実測できる
- [ ] Positive Tool AllowlistをHostでenforceできる
- [ ] Runtime Origin AllowlistをHostでenforceできる
- [ ] Narrow approved_test_controlを安全に提供できる
- [ ] Trusted Budget accountingを取得できる

### Learner-safe Inputs

- [ ] Source-free RunnerへScored Skillを供給できる
- [ ] Skill revisionを固定できる
- [ ] Runbook revisionをBenchmarkへ含める
- [ ] Output Contract revisionをRunner Profileへ含める
- [ ] Learner-safe Input Manifestを保存できる
- [ ] RunnerへInstructor-only情報が露出しない

### Prepared Runtime / Patch

- [ ] Challenge PatchがProtected Infrastructureへ触れない
- [ ] patched RuntimeをSource-free Artifactとして生成できる
- [ ] Canonical Artifact Manifest / hashを生成できる
- [ ] Disposable Source cleanup後にRuntimeを起動できる
- [ ] Runtime readinessを機械確認できる
- [ ] Official Runtime Variantがnon-null

### Initial State

- [ ] Seed + Role + Session + Initial Routeを一般Contractで成立させられる
- [ ] Basicのguest SessionをChallenge固有分岐なしで成立させられる
- [ ] Intermediateのoperator Sessionを同じContractで成立させられる
- [ ] Initial State Receiptをtrusted writerが生成する
- [ ] ReceiptがRunner Session / Runtime Artifact / Coverageへbindされる
- [ ] multi-Coverage Receiptを表現できる
- [ ] Bootstrap失敗をOfficial PASSにしない

### Runner Output / Ownership

- [ ] Runnerはconstrained `output/**`だけwriteできる
- [ ] RunnerがTrusted Artifactを変更できない
- [ ] current-run Evidenceだけを使用する
- [ ] `qa-findings.json` / EvidenceをDeterministic Importできる
- [ ] Frozen Runner ArtifactをCanonical Hashできる
- [ ] Post-freeze mutationをrejectできる

### Budget / Stop

- [ ] Exploration start boundaryを固定できる
- [ ] 1 top-level Tool Invocation = 1 Actionのsemanticsを固定できる
- [ ] duration / tool actionsをHostが計測できる
- [ ] Challenge BudgetとExecution Summaryを照合できる
- [ ] Stop Reasonが既存STOP_CONDITIONと一致する

### Evaluation

- [ ] Deterministic Separate Evaluatorを使用する
- [ ] Benchmark / Runbook / Prepared Runtime / Runner / Session / Context / Tool / Origin / Initial State / Budget / Evidenceを検証する
- [ ] Official verification failure時にmetricsを有効化しない

### Official E2E

- [ ] Basic Challenge Official Run PASS
- [ ] Intermediate Challenge Official Run PASS
- [ ] Advanced Challenge Official Run PASS
- [ ] 同一Prepared Target + 同条件Fresh Runを複数回比較可能

### Final

- [ ] Product Behaviorの意図しない変更なし
- [ ] Native Scopeを本Implementationへ混在させていない
- [ ] Contract FixtureをOfficial Scored Evidenceとして使用していない
- [ ] `pnpm run verify` PASS
- [ ] Required CI PASS
- [ ] Official Host-side evidenceを保存済み
- [ ] 未実行項目をPASS扱いしていない

---

## 28. Recommended Implementation Order

```text
0. Host Capability Spike
   ↓ insufficient → BLOCKED / STOP
1. Machine / Ownership / Protected Path Contracts
2. Learner-safe Skill / Input Packaging
3. Source-free Prepared Runtime / Canonical Hash
4. Trusted Initial State Bootstrap
5. Fresh + Fresh-context Host Integration
6. Trusted Budget Accounting
7. Runner Output Import / Freeze
8. Deterministic Evaluator Integration
9. Basic Official E2E
10. Intermediate / Advanced
11. Reproducibility Comparison
12. Documentation / Final Audit
```

最初にHost Capabilityを確認する理由は、そこが満たせなければOfficial Runを成立させられないためである。

Repository側Harnessを先に拡張し続けてからHost Capability不足が判明する進め方は避ける。

---

## 29. Final Decision Rule

本Planで最も重要なDecision Ruleを以下に固定する。

```text
Hostが以下をtrusted / machine-readableに提供・enforceできる
- Fresh Session
- Fresh Context / no inheritance
- Tool Isolation / Tool Inventory
- Runtime Origin Boundary
- Narrow approved_test_control
- Constrained Output
- Budget Accounting
- Initial State trusted receipt
        ↓ YES
Official Black-box Scored E2EをSkill-firstで実装する

        ↓ NO
Official RunはBLOCKEDのまま維持する
Custom Agent Runnerは作らない
```

Official Black-box Scored E2Eの価値はHarnessを大きくすることではない。

**同じChallenge、同じPrepared Runtime、同じLearner-safe Instruction、同じ情報境界・Initial State・Runner条件の下で、Fresh + Fresh-context Coding AgentがSkillを使ってどれだけ未知不具合を発見できたかを、公正かつ再現可能に評価できること**が目的である。
