# Agentic QA Operating Contract

この文書は、Scenario Shop を対象にする Agentic QA の実行契約です。Normative Product Specification は `docs/spec/`、Machine Contract の正本は `scripts/agentic-qa/contracts.ts` です。

## Execution Ownership

Primary QA Executor:
Coding Agent + Exploratory QA Skill

Runtime Interaction:
Playwright-MCP / Maestro-MCP or equivalent capabilities provided by the
Coding Agent runtime.

Supporting Harness:
`scripts/agentic-qa/**`

Harness responsibility:
Preparation / validation / isolation verification / artifact integrity /
evaluation / scoring

Harness does NOT launch, wrap, orchestrate, retry, or manage the Coding Agent.
The direction is `Coding Agent + Skill → Runtime → qa-findings.json →
Supporting Harness`.

## Modes

- Normal (default): `qa-charter.json` の `spec_refs[]` と Required Coverage を使い、既存のアプリ・テスト・生成物を読み取り専用で観察します。通常の変更境界は `.codex/runs/<run_id>/` と `.artifacts/` です。Source Working Tree に追加差分を作りません。
- Gray-box: Normal と同じ Readonly Boundary を保ちつつ、許可された Seed、Test Control、Narrow Log、Accessibility/DOM などの検証補助を使います。Source、Test、Patch、Answer Key は見ません。
- Black-box Scored: Agent自体の未知不具合探索能力を評価する場合だけ使用します。ChallengeのLearner-safe Bundle、Runbook、自己完結した`training/agentic-qa/skills/scored-v1.md`、Canonical Runner Input、Source-free Prepared Runtimeだけを境界内へ配置し、Fresh Coding Agent Session、trusted session identity、Tool Isolation、trusted Actual Tool Scopeを必要とします。

Normal / Gray-box の `qa-findings.json` は `charter_id` と `working_tree_snapshot`（before／after／comparison）を持ち、`challenge_id`、`benchmark_revision`、`runtime_variant_id`、`runner_profile` は `null` です。Black-box Scored は逆に `charter_id` が `null` で、Challenge、Benchmark Revision、Runtime Variant、Runner Profile を必ず記録します。モード間で結果やMetricを混ぜません。

通常の「Scenario ShopをQAしてください」はNormal Skill workflowを使用します。利用中のCoding Agent RuntimeがBlack-boxに必要なFresh Session、trusted identity、Tool Isolation、Actual Tool Scope inventoryを提供できない場合、Official Scored E2Eは `BLOCKED` です。Repository独自RunnerやLLM wrapperで解決しません。

Normal／Gray-boxでcurrent runに`qa-charter.json`がない場合は、Coding AgentがUser Request、Normative Specification、BR／AC、Risk、Platform、Role／Seed、Runtime Capabilityからbounded Charterをcurrent runへ作成します。Charterには`exploration_budget`とStop Conditionを含め、既存Zod／validatorで`spec_refs`、Coverageの一意性、Budgetを検証してからRuntimeへ進みます。過去RunのCharterを暗黙再利用せず、Charter検証後かつ最初のRuntime interaction前に`working-tree-snapshot.ts`のBEFORE Snapshotを取得します。

## Runner terminology

In Black-box Scored mode, **Runner** means the Fresh Coding Agent Session
being evaluated. It does not mean a repository-specific Node.js runner, LLM
API wrapper, Codex CLI wrapper, or agent orchestration process.

## Oracle and coverage

Normative Spec は Business Rule (`BR-*`) と Acceptance Criteria (`AC-*`) を優先します。`spec_refs[]` は次の3形式だけです。

```text
BR-<AREA>-NNN
AC-<AREA>-NNN
docs/spec/<normative-file>.md#<slug-heading>
```

Feature Specification は `Purpose / Scope`、`Business Rules`、`UI / Behavior Contract`、`Acceptance Criteria`、`Executable Canonical Sources` の5節をこの順で持ちます。`AC` は `Related BR` を持ち、Active `BR` は `AC` または明示的な `Acceptance: N/A` を持ちます。

Normal / Gray-box の Required Coverage は Charter、Black-box Scored の唯一の Coverage SSOT は `challenge.json.required_coverage` です。Runner は `required_ids` や Coverage Item を追加・削除・並べ替えません。

## Finding and evidence

Finding は一つの観測可能な Product Behavior に限定する Atomic Finding とします。Expected と Actual、再現手順、Oracle、Role/Seed、Evidence、Reproduction Count、Severity、Confidence、Known Deviation、Suggested Regression Layer を記録します。複数の不具合を一つに束ねた提出は `invalid_non_atomic` とし、TPへ分解しません。

Evidence は `.artifacts/` に保存するスクリーンショット、DOM/Accessibility、URL/Screen、Narrow Console/Log などを相対参照します。未探索を TN とせず、Non-defect は Item-specific Observation Evidence がある場合だけ TN または `FP_non_defect` を確定します。Coverage未完了、または Observation Evidence 不足は NE です。

## Scored preparation and evaluation

Challenge Preparation の順序は固定です。

```text
Machine Contract validation
→ Learner-safe Bundle / Benchmark Revision / Runner Profile
→ disposable clean source copy
→ Baseline Build / Serve / Install
→ Pre-patch Baseline Sanity
→ runtime cleanup / clean status
→ git apply --check → git apply
→ Patched Build / Serve / Install
→ Post-patch Sanity
→ Scored Initial State Reset
→ Protected Patch validation
→ Source-free Prepared Target / Canonical Artifact Manifest
→ Learner-safe Scored Skill / Runner Input freeze
→ isolated root / Tool Allowlist / Forbidden Probe
→ runtime stop / disposable cleanup
→ Host Capability Gate / trusted bootstrap handoff
→ Fresh Coding Agent Session (provided by the Agent runtime / host)
→ bounded output import / Evidence Mapping / Frozen Artifact
→ Frozen qa-findings.json
→ Separate Evaluator
→ evaluation.json
```

Challenge Patch は Instructor-only Unified Diff です。Application Branchへ適用してCommitせず、Runner Rootへコピーしません。Pre-patchで対象Defectが既に存在する、Post-patchで再現条件が成立しない、Patch checkが失敗する場合はScored Runを開始しません。

Preparation HarnessはCoding Agentを起動せず、Agent Session生成、Tool routing、retryも担当しません。Host Capability Receiptがない、required proofが`proven`でない、またはSource-free Prepared Targetをtrusted URLとしてFresh Sessionへ引き渡せない場合は、Official Scoredを開始せず `BLOCKED / DEFERRED / NOT EXECUTED` と記録します。Repository独自のRunner／LLM wrapper／Session Managerで解決しません。未取得のHost証跡をRepository側で推測してPASSへ補完しません。

Benchmark Identity は `challenge_id + benchmark_revision + runtime_variant_id`、同条件のRunner比較はこれにPrepared Target hash、Canonical Runner Input hash、Runner Profileを加えたものです。Clean committed inputだけ `git:<40 lowercase hex>`、それ以外はRuntime VariantとRunner Profileを除外したCanonical Benchmark Manifest Inputの `sha256:<64 lowercase hex>` を使います。Runtime Variantを変えてもBenchmark Revisionは変わらず、Benchmark IdentityとRunner Input hashが変わります。

Evaluator は Frozen Finding を書き換えません。`invalid_non_atomic` は一 Finding = 一 FP、`FP_non_defect` は Precision の FP へ一度だけ加算しつつ FPR の `fp_non_defect` にも加算します。Environment/Harness による `blocked_environment` は `valid_for_scoring=false` と `invalid_reasons` に `environment_blocker` を付けます。真の Unexpected Valid Finding は元Runを再採点せず、Ground Truth更新後に新Revision + Fresh Re-runを行います。

Metric は valid Scored Runだけに適用し、分母0は `null` とします。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

## Implementation references

- `docs/reference/agentic-qa-workflow.md`: 実行者向け手順とartifact layout。
- `scripts/agentic-qa/contracts.ts`: JSON + Zod の正本。
- `scripts/agentic-qa/validate-contracts.ts`: Cross-file と Run Artifact validation。
- `scripts/agentic-qa/build-learner-bundle.ts`: `spec_refs[]` からの決定的Bundle。
- `scripts/agentic-qa/prepare-challenge.ts`: disposable patch preparation、isolation、Forbidden Probe。Coding Agentは起動しない。
- `scripts/agentic-qa/canonical-json.ts` / `canonical-artifact-manifest.ts`: identity-bearing JSONとPrepared/Frozen Artifactの共有正本。
- `scripts/agentic-qa/runner-input.ts` / `prepared-runtime-lifecycle.ts`: Learner-safe Input、Scored Skill、Source-free Prepared Targetのfreezeとhash検証。
- `scripts/agentic-qa/initial-state-bootstrap.ts` / `resource-boundary-probe.ts`: generic Initial State、Runtime Control、実配信resourceのnegative probe契約。
- `scripts/agentic-qa/runner-output-import.ts` / `official-verification.ts` / `host-capability-gate.ts`: constrained output、Evidence Mapping、Host証跡のfail-close検証。
- `scripts/agentic-qa/runner.ts` / `evaluate.ts`: Frozen Runner Result と Separate Evaluator。`runner.ts`はCoding Agentを起動しない。
- `scripts/agentic-qa/working-tree-snapshot.ts`: Normal / Gray-box前後Snapshotと追加Source差分の比較。
