# Agentic QA Workflow

## 目的

Scenario Shop の Normative Specification を、通常のテスト自動化と Agentic QA の両方で実行可能な入力へ接続します。Product Behavior の正本は `docs/spec/`、機械検証の正本は `scripts/agentic-qa/contracts.ts` です。

## 入力と成果物

```text
docs/spec/                         Normative / Supporting documentation
training/agentic-qa/challenges/   Learner-safe Challenge + Runbook
training/agentic-qa/instructor/    Answer Key + Patch (Instructor-only)
training/agentic-qa/tool-profiles/ Scored Tool Profile
.codex/runs/<run_id>/              Durable Charter, Findings, Evaluation
.artifacts/                        Raw evidence and disposable runtime data
```

Machine Contract は JSON + Zod に限定します。各JSONは `schema_version: 1` を持ち、validatorを通過しない入力は実行前Failureです。

## Normal / Gray-box

Charter の `spec_refs[]`、Role、Seed、Platform、Viewport/Device、Risk、Mission、Required Coverage、Runtime Controls、Budget、Stop Condition を固定してから実行します。Normal は既存Source/Test/ArtifactをReadonlyで観察し、Gray-boxは許可されたSeed Reset、Clock、Payment Delay、Deep Link、App Restart、Narrow Logなどを追加で使えます。どちらも Working Tree の変更を作らず、前後Snapshotで追加Source差分0を確認します。

Snapshotは専用のJSON + Zod契約で保存します。QA開始前後に同じRun／ModeのSnapshotを取得し、比較結果の `passed: true` と `additional_source_diff_count: 0` を確認してから `qa-findings.json` を確定します。

```text
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase before
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase after
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --before .codex/runs/<run_id>/working-tree-snapshot-normal-before.json --after .codex/runs/<run_id>/working-tree-snapshot-normal-after.json
```

`qa-findings.json`／`qa-findings-normal.json` の `working_tree_snapshot` はbefore／after／comparisonの3参照を必須とし、validatorはRun ID、Mode、Phase、相対Path、差分0を再検証します。`.codex/runs/` と `.artifacts/` 等のQA生成物はSource差分比較から除外します。

`qa-findings.json` では Normal / Gray-box の `charter_id` を固定し、Challenge/Benchmark/Runner Profile項目は `null` にします。Findingが0件でも、Coverage、Evidence、未完了理由、終了理由を残します。

Spec変更のReview Summaryは、Changed BR / ACと変更された直接参照Normative fileからAffected Challenge IDを導出します。CIでは既存のStyle Quality Job内で実行し、ローカルWorking Treeでは未追跡の`docs/spec`も含めます。

```text
pnpm run summarize:spec-impact
pnpm run summarize:spec-impact -- --base-ref HEAD --working-tree
```

GitHub Actionsでは`GITHUB_STEP_SUMMARY`へ同じMarkdownを追記し、Spec変更がない場合も`(none)`を明示します。

## Black-box Scored

Black-boxのRequired CoverageはChallenge Definitionだけから導出します。`learner-spec/` は `challenge.spec_refs[]` のBR/AC/Normative owner fileだけを決定的に含み、Supporting fileや任意の追加Specを自動追加しません。Challenge/RunbookのMissionはDefect、Non-defect、Item ID、Patch意図を示さない中立文にします。

`run-local-e2e.ts` は JSON/Zod の契約経路を検査する Contract Fixture であり、固定Findingを Official model-backed Scored Runへ昇格させません。`execution_kind=contract_fixture`、未完了Coverage、`fixture_not_official` により、評価Metricはfail-closeで無効になります。Official Runは実patched runtime、Fresh Runner、実測Evidence、別Session Evaluatorをすべて実行できた場合だけ成立します。

Runner Root は次だけです。

```text
<isolated-run-root>/
├ learner-spec/
├ runbook/
└ challenge/
```

Source、`.git`、`src/`、`tests/`、Patch、Answer Key、Build Artifact、JS Bundle、Source Map、Network Response Body、APK/IPA、Generic Shell、Search、Arbitrary Browser Evaluateを置きません。Positive Tool Allowlistの範囲外のCapabilityはToolとして実装・公開せず、Runner相当ScopeでForbidden Capability Probeを実行します。Probe失敗時はOfficial ScoredではなくDiagnostic/Trainingに降格します。

## Challenge Preparation

Defect ChallengeはInstructor-only Unified Diffを一つだけ持てます。Preparationは次の順序を崩しません。

1. Challenge、Answer Key、Tool Profile、Spec ReferenceをZod/整合性検証する。
2. Required CoverageとLearner-safe Bundleを生成する。
3. Runtime Sourceをdisposable copyへ用意し、Baseline Build / Serve / Installを行う。
4. Pre-patch Baseline Sanityで対象DefectがClean状態にないこと、Seed/Resetが利用できることを確認する。
5. Runtimeをcleanupし、意図しない差分がないことを確認する。
6. `git apply --check` 成功後にだけ `git apply` する。
7. Patched Build / Serve / Install、Post-patch SanityでMinimum Reproduction Conditionを確認する。
8. Scored Initial StateへResetし、Runtime endpointまたはBoot済みDeviceだけをRunnerへ渡す。
9. Fresh Runnerを起動し、Frozen `qa-findings.json`を保存する。
10. Runnerとは別SessionのEvaluatorがAnswer Keyを初めて読み、`evaluation.json`を生成する。

Baselineで対象Defectが既に存在する、Patch checkが失敗する、Post-patch再現が失敗する場合はScored Runを開始しません。PatchをApplication Branchへ適用した状態でCommitしません。

## Evaluation

一つのFindingは一つのProduct Behaviorに限定します。複数Defectを束ねた `invalid_non_atomic` はTPへ分解せず一Finding一FPです。Defect Itemへ一意に対応するAtomic FindingだけがTP、対応がないものはFNです。同じDefectへの二つ目以降はDuplicateで、TP/FPへ加算せずDuplicate Rateへ記録します。

Non-defectは、Required Coverageが完了しItem-specific observation Evidenceがある正常確認だけをTNとします。正常な挙動をDefectとして報告した場合は `FP_non_defect` で、PrecisionのFPへ一度、FPRの `fp_non_defect` へ一度加算します。Coverage未完了またはItem-specific Evidence不足はNEであり、TNではありません。

`blocked_environment` がRuntime、Emulator/Simulator、MCP、Seed/Test Control、Harnessの障害を示す場合、`valid_for_scoring=false` と `invalid_reasons` に `environment_blocker` を記録します。`invalid_reasons[]` はenum、重複なし、辞書順です。Mismatch、Isolation Failure、Tool Scope Failure、Preparation FailureもFail-closeします。

Benchmark RevisionはEvaluation母集団のRevisionです。Clean committed inputだけ `git:<40 lowercase hex>`、未Commitまたは混在入力はCanonical Manifest SHA-256の `sha256:<64 lowercase hex>` を使います。Benchmark Identityは `challenge_id + benchmark_revision + runtime_variant_id` で、同条件比較には完全一致するRunner Profileも必要です。真のUnexpected Valid Findingが確認された場合、元Runを新Ground Truthへ付け替えず、元Runを無効化して新RevisionでFresh Re-runします。

正式Metricは valid Scored Runだけに適用します。分母0は `null` です。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

## Platform note

WebはPlaywrightベースのRuntime観察を標準経路とします。NativeはAndroidの物理端末Runtimeが利用できる場合に同じCharter/Coverage/Evidence構造を使い、iOSは現行ADR-0011どおりCI Build-onlyです。Maestro Regression PASSをAgentic QA Capability PASSの代替にはしません。Runtime/MCP/Device Capabilityが不足する場合は未実施または `blocked_environment` をEvidence付きで明記します。
