# Agentic QA Operating Contract

この文書は、Scenario Shop における Agentic QA の Repository-specific execution ownership、Machine Contract、artifact binding、Harness integration を定義します。PortableなMode選択、Charter、Coverage、Budget、Stop、Evidence、Finding、finalizationの意味は [`exploratory-qa` Skill](.agents/skills/exploratory-qa/SKILL.md) と package-local referencesを正本とします。

Normative Product Specification は `docs/spec/`、Machine Contract の実装正本は `scripts/agentic-qa/contracts.ts` です。

## Execution Ownership

- Primary QA Executor: Coding Agent + Exploratory QA Skill。
- Runtime Interaction: Coding Agent runtimeが提供する Playwright-MCP / Maestro-MCP または同等Capability。
- Supporting Harness: `scripts/agentic-qa/**`。
- Harness responsibility: Preparation、validation、isolation verification、artifact integrity、evaluation、scoring。
- Harness does not launch、wrap、orchestrate、retry、manage the Coding Agent。

実行の方向は `Coding Agent + Skill → Runtime → qa-findings.json → Supporting Harness` です。QA中はProduct Codeを変更せず、Finding確定後にのみRepair workflowへ明示的に切り替えます。

## Repository Mode Contract

- Normal: current Runの`.codex/runs/<run_id>/qa-charter.json`を入力とし、Source Working TreeはReadonlyで扱います。Evidenceは`.codex/runs/<run_id>/`と`.artifacts/`へ保存します。
- Gray-box Scenario Shop mapping: Scenario / Seedのallowlistは `src/seeds/metadata.ts`（`default`、`empty-catalog`、`out-of-stock`、`low-stock`、`regular-member`、`cart-with-invalid-items`、`payment-declined`、`checkout-resume`、`reviewable-orders`）と `src/seeds/scenarios.ts`、Reset / Test Controlは `src/test-controls/` が具体実装です。Machine Contractの`allowed_runtime_controls`は `seed_reset`、`clock`、`payment_delay`、`deep_link`、`app_restart` を受け、DOM、Accessibility、Console、Narrow Log等のObservation Evidenceは`evidenceTypeSchema`へbindingします。Runtime capabilityはこのRepositoryのPlaywright-MCP / Maestro-MCPまたは同等Capability mappingを使用します。
- Black-box Scored: `training/agentic-qa/challenges/<challenge-id>/challenge.json`、learner-safe Bundle、Runbook、hash-verified `training/agentic-qa/skills/scored-v1.md` snapshot、Canonical Runner Input、Source-free Prepared TargetだけをRunner-visible boundaryへ渡します。Fresh Coding Agent Session、trusted session identity、Tool Isolation、trusted Actual Tool Scopeが必要です。Runnerは`.agents/skills/**`、`QA_AGENT.md`、source、Answer Key、Patch、prior run artifactを読みません。

Normal / Gray-boxのfinding artifactは`charter_id`と`working_tree_snapshot`（before / after / comparison）を持ち、`challenge_id`、`benchmark_revision`、`runtime_variant_id`、`runner_profile`は`null`です。Black-box Scoredは`charter_id`が`null`で、Challenge、Benchmark Revision、Runtime Variant、Runner Profileを記録します。Mode間で結果やMetricを混ぜません。

Official Scored実行に必要なFresh Session、trusted identity、Tool Isolation、Actual Tool Scopeを提供できない場合は`BLOCKED`です。Repository独自Runner、LLM wrapper、Session Manager、MCP orchestrationで補完しません。

Static serverの`Sec-Fetch-Dest`は偽装可能なbrowser UX情報でありSecurity Boundaryではありません。正本はHost-trusted Tool Isolationと実配信Runtimeに対するResource Negative Probeです。

## Machine Contract

- JSON + Zod schemaの正本は`scripts/agentic-qa/contracts.ts`です。
- 各JSONは`schema_version: 1`を持ち、validatorを通らない入力は実行前Failureです。
- `spec_refs[]`は`BR-<AREA>-NNN`、`AC-<AREA>-NNN`、または`docs/spec/<normative-file>.md#<slug-heading>`だけを許可します。
- Feature Specificationは`Purpose / Scope`、`Business Rules`、`UI / Behavior Contract`、`Acceptance Criteria`、`Executable Canonical Sources`の5節をこの順で持ちます。`AC`はRelated BRを持ち、Active BRはACまたは明示的な`Acceptance: N/A`を持ちます。
- Normal / Gray-boxのCoverage SSOTはCharter、Black-box ScoredのCoverage SSOTは`challenge.json.required_coverage`です。Runnerは`required_ids`やCoverage Itemを追加・削除・並べ替えません。
- FindingはMachine Contractに従うAtomic Findingです。Expected、Actual、Reproduction Steps、Oracle、Role/Seed、Evidence、Reproduction Count、Severity、Confidence、Known Deviation、Suggested Regression Layerを記録します。複数問題をまとめた提出は`invalid_non_atomic`です。
- Evidenceは`.artifacts/`のraw artifactを相対参照します。未探索はTNにせず、Observation EvidenceがないNon-defectは確定しません。Coverage未完了またはObservation Evidence不足はNEです。

## Normal / Gray-box artifact binding

Charterは`spec_refs`、Role、Seed、Platform、Viewport/Device、Risk、Mission、Required Coverage、Runtime Controls、`exploration_budget`、Stop Conditionを固定します。過去RunのCharterは暗黙再利用せず、現行仕様、User Scope、Platform、Role、Seedを再検証します。

最初のRuntime interaction前に`working-tree-snapshot.ts`でBEFORE Snapshotを取得し、QA後にAFTER Snapshotを取得します。同じRun / Modeで比較し、`passed: true`かつ`additional_source_diff_count: 0`を確認してからFindingsをfinalizeします。Finding確定後のBEFORE Snapshotは許可しません。

## Black-box Scored contract

PreparationはCoding Agentを起動せず、Challenge validation、Answer Key validation、learner-safe Bundle、disposable source、protected patch、baseline / patched sanity、Canonical Artifact Manifest、Source-free Prepared Target、Runner Input、isolated root、Tool Profile、Forbidden Probe、output import、Evidence Mapping、Freeze、Evaluationを担当します。Agent Session生成、Tool routing、retry、lifecycle managementはHostが担当します。

Host Capability Receiptがない、required proofが`proven`でない、Source-free Prepared Targetをtrusted URLとしてFresh Sessionへ渡せない場合は、Official Scoredを開始せず`BLOCKED / DEFERRED / NOT EXECUTED`と記録します。未取得のHost証跡をRepository側でPASSへ補完しません。

Challenge PatchはInstructor-only Unified Diffです。Application Branchへ適用してCommitせず、Runner Rootへコピーしません。Pre-patchでDefectが既に存在する、Patch checkが失敗する、Post-patchで再現条件が成立しない場合はScored Runを開始しません。

Benchmark Identityは`challenge_id + benchmark_revision + runtime_variant_id`です。同条件比較にはPrepared Target hash、Canonical Runner Input hash、Runner Profileを加えます。Clean committed inputは`git:<40 lowercase hex>`、それ以外はCanonical Benchmark Manifest Inputの`sha256:<64 lowercase hex>`を使います。

EvaluatorはFrozen Findingを書き換えず、別SessionでEvaluationを生成します。`blocked_environment`、Isolation / Tool Scope failure、Benchmark Identity Mismatchは`valid_for_scoring=false`です。Ground Truth変更時は元Runを再採点せず、新Revision + Fresh Re-runを行います。Metricはvalid Scored Runだけに適用し、分母0は`null`です。

`invalid_non_atomic`、Duplicate、`TN` / `FP_non_defect` / `NE`、Unexpected Valid Findingを個別に分類し、`invalid_reasons[]`はenum・unique・辞書順で保存します。`FP_non_defect`はPrecisionのFPへ一度だけ加算し、Environment / Harness blockerは`valid_for_scoring=false`とします。

## Repository Harness mapping

- Contract validation / cross-file validation: `scripts/agentic-qa/validate-contracts.ts`。
- Learner-safe Bundle: `scripts/agentic-qa/build-learner-bundle.ts`。
- Challenge preparation and isolation: `scripts/agentic-qa/prepare-challenge.ts`、`resource-boundary-probe.ts`、`host-capability-gate.ts`。
- Runner input / prepared lifecycle: `runner-input.ts`、`prepared-runtime-lifecycle.ts`。
- Runtime snapshots: `working-tree-snapshot.ts`。
- Findings import / Official verification / evaluation: `runner-output-import.ts`、`official-verification.ts`、`evaluate.ts`。
- Frozen canonical artifacts and identity: `canonical-json.ts`、`canonical-artifact-manifest.ts`、`benchmark-revision.ts`。

Detailed artifact layout、command mapping、CI integration、scoring implementationは [`docs/reference/agentic-qa-workflow.md`](docs/reference/agentic-qa-workflow.md) に残します。Portable workflowの正本はこの文書ではありません。
