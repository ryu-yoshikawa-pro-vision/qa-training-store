# Agentic QA Workflow

## 目的

Scenario Shop の Normative Specification を、Coding Agent自身が実行する
Exploratory QAへ接続します。Product Behaviorの正本は docs/spec/、機械検証の正本は
scripts/agentic-qa/contracts.ts です。

## Primary Entry Point

Agentic QAのPrimary Entry Pointは Coding Agent + Exploratory QA Skill です。
Coding AgentがSkillに従ってSpecificationを読み、Risk-basedにRuntimeを操作し、
Evidenceを取得して qa-findings.json を生成します。

    User
      ↓
    Coding Agent
      ↓
    Exploratory QA Skill
      ↓
    Specification / Charter / Challenge
      ↓
    Playwright-MCP / Maestro-MCP
      ↓
    Scenario Shop Runtime
      ↓
    Evidence → Atomic Findings → qa-findings.json

scripts/agentic-qa/** はCoding Agentを起動・wrap・orchestrateしません。
Deterministic Preparation、Contract Validation、Isolation Verification、Artifact
Validation、Evaluation、Scoringだけを担当するSupporting Harnessです。実行の方向は
Coding Agent → Skill → Runtime → Artifact → Script であり、Script → Agent ではありません。

## Mode Selection

日常の「Scenario ShopをQAしてください」はNormalを使用します。ModeはRuntimeを
操作する前に決定し、Coverage SSOTを変更しません。

1. **Normal**: qa-charter.json の spec_refs[] とRequired Coverageを使うデフォルトの
   Readonly探索。
2. **Gray-box**: Normalに加え、approved Seed Reset、Test Control、Clock Control、
   Payment Delay、Deep Link、App Restart、Narrow Console/Log、DOM、Accessibility
   など既存の許可Capabilityを使う探索。
3. **Black-box Scored**: Agent自体の未知不具合探索能力を評価する場合だけ使用。
   challenge.json.required_coverageをSSOTとし、Host RuntimeがFresh Session、trusted
   session identity、Tool Isolation、trusted Actual Tool Scopeを提供できる場合だけ
   Official Runを開始します。提供できない場合は BLOCKED です。

Normal／Gray-boxはSource Working TreeをReadonlyで扱い、Evidenceは
.codex/runs/<run_id>/ と .artifacts/へ保存します。Black-boxは learner-spec/、
runbook/、challenge/ だけのisolated rootを使います。

## Runtime Exploration

### Oracle確認とRisk分析

最初に次を読みます。

    docs/spec/README.md
    QA_AGENT.md
    docs/reference/agentic-qa-workflow.md

対象Featureの BR-*、AC-*、Normative Feature Specificationを確認し、Expected Behaviorは
Normative Specificationから判断します。Application SourceやExisting TestをExpected
Behaviorの正本にしません。Runtime操作前に、Primary user journey、Role/Permission、
State Transition、Validation、Boundary、Error Handling、Empty State、Loading/Async、
Persistence、Session、Cross-screen consistency、Accessibility、Responsive、
Native-specific behavior、Recovery/Retry、Data integrityのリスクを対象Scopeに応じて
優先順位づけします。チェックリストの機械的全件実行や無制限探索は行いません。

### Web

Playwright-MCPまたはCoding Agentへ提供された同等Browser Capabilityを第一選択とし、
Agent自身が次のloopを実行します。

    navigate → observe → interact → observe state transition
    → compare against Specification → collect evidence → decide next exploration

一度のHappy Pathで終了せず、リスクに応じてalternate path、invalid input、boundary、
repeated action、back/reload、session transition、role differenceを追加します。
Charter／ChallengeのBudgetとStop Conditionを超えません。

### Native

Android RuntimeとCapabilityが利用可能な場合はMaestro-MCPまたは同等Native Runtime
Capabilityを使い、Coding Agent自身が実Android Runtimeを観察・操作します。既存
Maestro Regression SuiteのPASSは Agentic QA complete の代替ではありません。
Capabilityが使えない場合は blocked_environment または未実施として記録し、代替の
Native Scriptを追加しません。iOSは現行ADR-0011どおりCI Build-onlyです。

## Evidence / Finding

可能な範囲でcurrent URL／screen、DOM、Accessibility tree、Screenshot、Narrow
Console／Log、Runtime-visible stateを取得します。ScreenshotだけをMachine-semantic
Evidenceにせず、notes／descriptionだけでObservationを証明しません。

Findingは 1 Finding = 1 distinct product deviation のAtomic単位です。Expected、
Actual、Reproduction Steps、Oracle、Role／Seed、Evidence、Reproduction Count、
Severity、ConfidenceをMachine Contractに従って記録します。複数問題をまとめず、QA中に
Product Codeを修正しません。

    Coverage Itemを選ぶ
    ↓ Specification確認
    ↓ Runtime観察
    ↓ 操作
    ↓ 結果観察
    ↓ Expected / Actual比較
    ↓ 必要なら追加探索
    ↓ Evidence取得
    ↓ Findingまたは正常観測を記録
    ↓ 次Coverageへ

Required Coverage complete、Exploration Budget exhausted、Explicit Stop Condition、
Environment blocker、またはUser-specified scope completeで停止します。Findingを1件
見つけただけではQA全体を終了しません。

## Deterministic Supporting Scripts

探索終了後、Coding Agentが qa-findings.json を生成します。その後にScriptを使って
Schema、Coverage、Evidence、Working Tree Snapshot、Scored時のEvaluation／Scoringを
検証します。Raw screenshot、trace、ADB log、MCP logは .artifacts/へ置き、Durable
Run Artifactにはrepo-relativeな要約だけを残します。

    docs/spec/                         Normative / Supporting documentation
    training/agentic-qa/challenges/   Learner-safe Challenge + Runbook
    training/agentic-qa/instructor/   Answer Key + Patch (Instructor-only)
    training/agentic-qa/tool-profiles/ Scored Tool Profile
    .codex/runs/<run_id>/              Durable Charter, Findings, Evaluation
    .artifacts/                        Raw evidence and disposable runtime data

Machine ContractはJSON + Zodに限定し、各JSONは schema_version: 1 を持ちます。
validatorを通らない入力は実行前Failureです。

### Normal / Gray-box artifacts

Charterの spec_refs[]、Role、Seed、Platform、Viewport／Device、Risk、Mission、
Required Coverage、Runtime Controls、Budget、Stop Conditionを固定します。Normal／
Gray-boxの qa-findings.json は charter_id と working_tree_snapshot（before／after／
comparison）を持ち、Challenge／Benchmark／Runner Profile項目は null です。
Findingが0件でもCoverage、Evidence、未完了理由、終了理由を記録します。

QA前後に同じRun／ModeのSnapshotを取得し、比較結果の passed: true と
additional_source_diff_count: 0 を確認してからFindingsを確定します。

    pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase before
    pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase after
    pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --before .codex/runs/<run_id>/working-tree-snapshot-normal-before.json --after .codex/runs/<run_id>/working-tree-snapshot-normal-after.json

Spec変更のReview Summaryは scripts/spec/summarize-impact.ts がChanged BR／ACと変更
された直接参照Normative fileからAffected Challenge IDを導出します。CIでは既存Style
Quality Jobの GITHUB_STEP_SUMMARY へ出力し、Working Treeでは未追跡 docs/spec も扱います。

## Black-box Preparation / Evaluation

Black-boxのRequired CoverageはChallenge Definitionだけから導出します。learner-spec/
は challenge.spec_refs[] のBR／AC／Normative owner fileだけを決定的に含み、
Supporting fileや任意Specを自動追加しません。Challenge／RunbookのMissionは中立文にし、
Answer KeyとPatchはCoding Agentへ渡しません。

Preparation Harnessの順序は次のとおりです。

    machine_contract_validation
    required_coverage_derive
    learner_safe_spec_bundle
    benchmark_revision_and_identity
    runner_profile
    disposable_source_copy
    baseline_build_serve_install
    pre_patch_baseline_sanity
    baseline_runtime_cleanup
    git_apply_check_and_apply
    patched_build_serve_install
    post_patch_sanity
    scored_initial_state_reset
    isolated_execution_root
    actual_tool_scope_unavailable
    positive_tool_allowlist_and_forbidden_probe
    runtime_stop_and_disposable_cleanup

Preparation HarnessはChallenge validation、Answer Key validation、learner-safe bundle、
disposable source、patch apply、baseline／patched sanity、initial state、isolated root、
Tool Profile validation、Forbidden Probeだけを担当します。Coding Agent起動、Agent
Session生成、Tool routing、retry、lifecycle managementは担当しません。Fresh Coding
Agent SessionはAgent Runtime／Hostが提供します。

Baselineで対象Defectが既に存在する、Patch checkが失敗する、Post-patchで再現条件が
成立しない場合はScored Runを開始しません。PatchはApplication Branchへ適用してCommit
せず、Runner Rootへコピーしません。actual_tool_scope が未計測なら、Filesystem
ProbeがcleanでもOfficial PASSへ昇格させず、tool_scope_validated=false とします。

run-contract-fixture.ts は deterministic contract pathだけを検証するFixtureです。
execution_kind=contract_fixture、valid_for_scoring=false、metrics=null、
fixture_not_officialを維持し、Official model-backed Scored Runの代替にはしません。

### Evaluation

EvaluatorはFrozen Findingを書き換えず、Answer Keyを初めて読み、別Sessionで
evaluation.jsonを生成します。Atomic Finding、Duplicate、invalid_non_atomic、
TN／FP_non_defect／NE、blocked_environment、Isolation／Tool Scope failure、
Unexpected Valid Findingを明示分類し、Mismatchは valid_for_scoring=false とします。
invalid_reasons[] はenum、重複なし、辞書順です。正式Metricはvalid Scored Runだけに
適用し、分母0は null です。

    Recall = TP / (TP + FN)
    Precision = TP / (TP + FP)
    False Positive Rate = FP_non_defect / (FP_non_defect + TN)
    Coverage = completed_required_coverage_items / required_coverage_items

Benchmark RevisionはClean committed inputだけ git:<40 lowercase hex>、未Commit／混在
入力はCanonical Manifestの sha256:<64 lowercase hex> を使います。Benchmark Identityは
challenge_id + benchmark_revision + runtime_variant_id、同条件比較にはRunner Profile
完全一致を要求します。Ground Truth変更時は元Runを付け替えず、元Runを無効化して新Revisionと
Fresh Re-runを行います。

## Platform note

WebはPlaywrightベースのRuntime観察、Nativeは利用可能なAndroid物理Runtimeで同じ
Charter／Coverage／Evidence構造を使います。Runtime、MCP、Device Capabilityが不足する
場合は未実施または blocked_environment をEvidence付きで明記します。Official Scored
Capability不足を解決するために、Repository独自のLLM wrapper、Codex CLI wrapper、
custom Agent Runner、custom Session Managerを追加しません。
