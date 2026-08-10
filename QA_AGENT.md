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
- Black-box Scored: Agent自体の未知不具合探索能力を評価する場合だけ使用します。ChallengeのLearner-safe Bundle、Runbook、Challengeだけをisolated execution rootに配置し、Fresh Coding Agent Session、trusted session identity、Tool Isolation、trusted Actual Tool Scopeを必要とします。

Normal / Gray-box の `qa-findings.json` は `charter_id` と `working_tree_snapshot`（before／after／comparison）を持ち、`challenge_id`、`benchmark_revision`、`runtime_variant_id`、`runner_profile` は `null` です。Black-box Scored は逆に `charter_id` が `null` で、Challenge、Benchmark Revision、Runtime Variant、Runner Profile を必ず記録します。モード間で結果やMetricを混ぜません。

通常の「Scenario ShopをQAしてください」はNormal Skill workflowを使用します。利用中のCoding Agent RuntimeがBlack-boxに必要なFresh Session、trusted identity、Tool Isolation、Actual Tool Scope inventoryを提供できない場合、Official Scored E2Eは `BLOCKED` です。Repository独自RunnerやLLM wrapperで解決しません。

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
→ isolated root / Tool Allowlist / Forbidden Probe
→ runtime stop / disposable cleanup
→ Fresh Coding Agent Session (provided by the Agent runtime / host)
→ Frozen qa-findings.json
→ Separate Evaluator
→ evaluation.json
```

Challenge Patch は Instructor-only Unified Diff です。Application Branchへ適用してCommitせず、Runner Rootへコピーしません。Pre-patchで対象Defectが既に存在する、Post-patchで再現条件が成立しない、Patch checkが失敗する場合はScored Runを開始しません。

Preparation HarnessはCoding Agentを起動せず、Agent Session生成、Tool routing、retryも担当しません。Fresh SessionがRuntime/Hostから提供されない場合は、Preparation後にOfficial Scoredを開始せず `BLOCKED` と記録します。

Benchmark Identity は `challenge_id + benchmark_revision + runtime_variant_id`、同条件のRunner比較はこれに完全一致する Runner Profile を加えたものです。Clean committed inputだけ `git:<40 lowercase hex>`、それ以外は Canonical Manifest の `sha256:<64 lowercase hex>` を使います。

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
- `scripts/agentic-qa/runner.ts` / `evaluate.ts`: Frozen Runner Result と Separate Evaluator。`runner.ts`はCoding Agentを起動しない。
- `scripts/agentic-qa/working-tree-snapshot.ts`: Normal / Gray-box前後Snapshotと追加Source差分の比較。
