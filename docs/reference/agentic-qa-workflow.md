# Agentic QAとScenario Shopの統合

## 目的と責任分担

この文書は、portableな[`exploratory-qa` Skill](../../.agents/skills/exploratory-qa/SKILL.md)に対するScenario Shop固有のartifact構成、具体的なschemaの紐付け、validatorと準備処理の対応、採点統合を定義します。

- PortableなMode選択、Charter、Coverage、Budget、Stop、Evidence、Finding、finalizationの意味はpackage-local referencesに定義します。
- `QA_AGENT.md`はリポジトリの実行責任とMachine Contractの境界を管理します。
- `scripts/agentic-qa/**`は決定的な準備、検証、隔離検証、artifact整合性確認、evaluation、scoringを担当します。Coding Agentのlaunch、wrap、orchestrate、retry、管理は行いません。
- Normative Product Specificationは`docs/spec/`です。

## リポジトリのartifact構成

```text
docs/spec/                         規範仕様と補助文書
training/agentic-qa/challenges/   受講者向け安全なChallenge + Runbook
training/agentic-qa/instructor/   Answer Key + Patch（Instructor専用）
training/agentic-qa/skills/        hash検証済みの採点用Skill snapshot
training/agentic-qa/tool-profiles/ 採点用Tool Profile
.codex/runs/<run_id>/              永続的なCharter、Findings、Evaluation
.artifacts/                        raw evidenceと使い捨てruntimeデータ
```

Normal / Gray-boxでは`.codex/runs/<run_id>/qa-charter.json`、candidateとfinalの`qa-findings.json`、同一Runのworking-tree snapshotを使います。Black-box inputでは、隔離されたartifact chainのChallenge directory、learner-safe Bundle、Runbook、hash検証済みの`training/agentic-qa/skills/scored-v1.md` snapshot、Canonical Runner Input、Source-free Prepared Targetを使います。

rawのscreenshot、trace、ADB log、MCP logは`.artifacts/`配下に保存します。永続的なRun Artifactにはリポジトリ相対の概要だけを含めます。

## Machine Contractと検証の対応

- JSON + Zod schema: `scripts/agentic-qa/contracts.ts`。
- ファイル間とRun Artifactの検証: `scripts/agentic-qa/validate-contracts.ts`。
- 規範参照の文法とowner解決: `scripts/agentic-qa/spec-refs.ts`。
- Coverageの整合性: `scripts/agentic-qa/coverage.ts`。
- Learner-safe Bundle: `scripts/agentic-qa/build-learner-bundle.ts`。
- Canonical JSONとartifact identity: `canonical-json.ts`と`canonical-artifact-manifest.ts`。
- Working Tree Snapshotとsource diffの比較: `working-tree-snapshot.ts`。
- Runtimeとresourceの境界: `resource-boundary-probe.ts`と`isolation.ts`。
- Host Evidenceのgate: `host-capability-gate.ts`。

各JSONは`schema_version: 1`を持ちます。Normal / Gray-boxの`spec_refs[]`は`BR-<AREA>-NNN`、`AC-<AREA>-NNN`、または`docs/spec/<normative-file>.md#<slug-heading>`を受け付けます。無効な参照やファイル間検証の失敗は、実行前の失敗です。

## Normal / Gray-boxの具体的な紐付け

現在のRunでは、既存のZod契約に従って`.codex/runs/<run_id>/qa-charter.json`を作成または検証します。`spec_refs[]`、mission、risk、role、seed、platform、viewportまたはdevice、required coverage、allowed controls、`exploration_budget`、Stop Conditionを紐付けます。

最初のRuntime interaction前にBEFORE Snapshotを取得します。

```text
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase before
```

Runtime QA後にcandidate `qa-findings.json`を作成し、AFTER Snapshotを取得して、同じRun / Modeで比較します。

```text
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase after
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --before .codex/runs/<run_id>/working-tree-snapshot-normal-before.json --after .codex/runs/<run_id>/working-tree-snapshot-normal-after.json
```

比較の`passed`がtrueで、`additional_source_diff_count`が0の場合だけFindingsを確定します。Normal / Gray-boxの出力では`charter_id`と`working_tree_snapshot`を設定し、Challenge、Benchmark Revision、Runtime Variant、Runner Profileはnullにします。

## Black-boxの準備対応

`prepare-challenge.ts`はmachine contract、Challenge、protected Patch、learner-safe specification Bundle、disposable source、baselineとpatched sanity、deterministic reset、Source-free Prepared Target、Canonical Artifact Manifest、Runner Input、isolated root、Tool Profile、Forbidden Probe、Host handoffを検証します。Agent Sessionは開始しません。

protected PatchはInstructor専用です。使い捨てcopyへ`git apply --check`の後に`git apply`で適用し、application branchへcommitせず、Runner-visible inputへcopyしません。

準備の順序はcontract testで固定されています。

```text
machine_contract_challenge_spec_validation
→ protected_patch_validation
→ learner_safe_specification_bundle_benchmark_identity
→ disposable_source_dependency_preparation
→ baseline_build_pre_patch_sanity
→ patch_apply
→ patched_build_post_patch_sanity
→ scored_initial_state_deterministic_reset_sanity
→ source_free_prepared_target_copy_hash_validation
→ learner_safe_runner_input_skill_runbook_output_contract_freeze
→ isolated_runner_root_from_frozen_input
→ repository_forbidden_boundary_preflight
→ disposable_source_cleanup
→ host_trusted_runtime_capability_handoff
```

Host Capability Receiptの欠落、証明されていないrequired evidence、trusted URLの欠落、preconditionの失敗、Patch checkの失敗、post-patch reproductionの欠落がある場合は、Official Scored Runを開始しません。`BLOCKED / DEFERRED / NOT EXECUTED`として記録し、リポジトリ側の決定的な準備をOfficial Runへ昇格させません。

## Runner、evaluator、identityの対応

- Runnerのライフサイクルと制約付き出力: `runner-input.ts`、`prepared-runtime-lifecycle.ts`、`runner-output-import.ts`。
- 正式な検証とtrust boundary: `official-verification.ts`、`host-capability-gate.ts`、`resource-boundary-probe.ts`。
- 分離されたevaluationとscoring: `evaluate.ts`。
- Benchmark revisionとidentity: `benchmark-revision.ts`、`canonical-artifact-manifest.ts`。

RunnerとEvaluatorは別Sessionです。EvaluatorはRunner Findingsをfreezeし、Answer Keyをevaluator側だけで読み、`evaluation.json`を書き込みます。`blocked_environment`、Isolation / Tool Scope failure、Benchmark Identity mismatchがある場合は`valid_for_scoring=false`にします。Ground Truthの変更には新しいBenchmark RevisionとFresh Re-runが必要です。

`invalid_non_atomic`、Duplicate、`TN` / `FP_non_defect` / `NE`、Unexpected Valid Findingは、それぞれ異なるevaluation分類です。`invalid_reasons[]`はenumのみ、重複なし、辞書順で保存します。`FP_non_defect`はPrecisionへ1回だけ加算し、Environment / Harness blockerがある場合は`valid_for_scoring=false`を維持します。

Clean committed inputには`git:<40 lowercase hex>`を使います。未commitまたは混在したinputには、Runtime VariantとRunner Profileを除くCanonical Benchmark Manifest Inputの`sha256:<64 lowercase hex>`を使います。Benchmark Identityは`challenge_id + benchmark_revision + runtime_variant_id`です。同条件の比較にはPrepared Target hash、Runner Input hash、Runner Profileも必要です。

Metrics apply only to valid Scored Runs:

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

分母が0の場合は`null`です。adjudicationやGround Truthの変更のためにFrozen Findingsを書き換えません。

Static serverの`Sec-Fetch-Dest`は多層防御のbrowser UX情報であり、Security Boundaryではありません。Host-trusted Tool Isolationと実際のRuntime Resource Negative Probeを正本とします。

## CIとリポジトリの参照

`style-quality` CI jobは`pnpm run validate:spec`とリポジトリのcontract testを実行します。最終的な`pnpm run verify`にはunit、integration、repository、component、contract、build、securityの全gateが含まれます。仕様の影響概要は`scripts/spec/summarize-impact.ts`を使い、既存のCI step summaryへ出力します。

補助Referenceの[`run-artifacts.md`](run-artifacts.md)は、より広いRun artifact構成を定義します。探索的QAの動作に関するportableな意味の正本は、引き続きpackage-local workflowだけです。
