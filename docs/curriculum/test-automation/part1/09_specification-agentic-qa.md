# Specification と Agentic QA

> 参考資料: この文書はPart 1の必須範囲には含めません。Agentic QAを必須カリキュラムへ混在させず、必須のPart 1では [`09_part1-capstone.md`](./09_part1-capstone.md) を使用します。

## 到達目標

- 正式な仕様、補助文書、実行可能な正本ソースの責務を区別できる。
- `BR` / `AC` をRisk、Test Case、Automationへ接続し、変更時にどの判断基準を再確認するか説明できる。
- Normal、Gray-box、Black-box Scored の変更境界とCoverage SSOTを選べる。
- Charter、判断基準、Atomic Finding、実行記録、False Positive、Regression還元を一つのQA結果へまとめられる。
- Fresh Session、Positive Tool Allowlist、Forbidden Capability Probe、受講者向けBundle、講師専用資料の意味を説明できる。
- JSON + Zod Contract、Benchmark Revision / Identity、Runner Profile / Budget、評価のFail-close条件を検証できる。

Agentic QAの主な入口はCoding Agent + Exploratory QA Skillです。Coding Agentが
Specificationを読み、Risk-basedにRuntimeを探索し、Playwright-MCP／Maestro-MCP等の
Runtime Capabilityで実行記録とAtomic Findingを作成します。`scripts/agentic-qa/**`は
Coding Agentを起動するScript Runnerではなく、DeterministicなPreparation、Validation、
Isolation Verification、Artifact Integrity、Evaluation、Scoringを支えるHarnessです。

## 1. Specificationを読む

最初に `docs/spec/README.md` から対象Featureへ進み、正式なProduct Scope、Roles、State、UI/UX、Feature Specificationを確認します。Feature文書は次の5節を固定順で持ちます。

1. Purpose / Scope
2. Business Rules
3. UI / Behavior Contract
4. Acceptance Criteria
5. 実行可能な正本ソース

`BR-AREA-NNN` はBusiness Rule、`AC-AREA-NNN` は受け入れ可能な観測条件です。ACの `Related BR` を起点に、Riskを考え、Test CaseのPrecondition / Action / Expected / 実行記録を設計し、PlaywrightやMaestroのAutomationへ落とします。仕様にない期待を勝手に判断基準へ追加せず、Known DeviationまたはUnresolved Specificationへ分離します。

## 2. Agentic QAの三つのMode

| Mode | Coverageの正本 | 変更境界 | 主な用途 |
|---|---|---|---|
| Normal | `qa-charter.json` | Source Working TreeはReadonly | Spec-driven Web / Native観察 |
| Gray-box | `qa-charter.json` | Readonly + 許可Seed / Test Control / Narrow Log | 原因候補を絞る探索 |
| Black-box Scored | `challenge.json.required_coverage` | isolated rootのみ | Learner-safe入力での比較可能な探索 |

Normal / Gray-boxでも、`.codex/runs/<run_id>/` と `.artifacts/`への実行記録の保存は許可します。`working-tree-snapshot.ts`で同形式のbefore／after Snapshotを取得し、comparisonの`passed=true`かつ`additional_source_diff_count=0`を確認してからFindingsを確定します。Black-boxのReadonlyはSource Isolationではありません。Runnerへは `learner-spec/`、`runbook/`、`challenge/`だけを渡します。

通常の「Scenario ShopをQAしてください」はNormalを使います。Black-box ScoredのFresh
Coding Agent Session、trusted identity、Tool Isolation、Actual Tool ScopeはAgent
Runtime／Hostが提供するCapabilityであり、RepositoryのHarnessが生成しません。

Playwright MCPまたは同等の狭いBrowser Toolでは、Target OriginへのNavigate、Click / Fill / Select / Scroll、DOM / Accessibility / Screenshot / URL観察だけを公開します。Browser arbitrary `evaluate`、JS Bundle / Source Map、Network Response Body、Web Search、Generic Shellを公開Capabilityにしません。NativeではAndroidのDevice / Maestro経路を確認し、iOSは現行ADR-0011どおりCI Build-onlyです。

## 3. Charter、判断基準、実行記録

Charterは `spec_refs[]`、Mission、Risk、Role、Seed、Platform、Viewport / Device、Runtime Controls、Budget、Stop Condition、必須Coverageを固定します。判断基準はBR / ACを優先し、参照のOwnerとなる正式なファイルを受講者向けBundleへ決定的に含めます。

実行記録はスクリーンショット、Accessibility、DOM、URL/Screen、Narrow Logなどの相対参照です。直接観測したExpected / Actualと推測を分離します。Findingが0件でも、Coverageの `completed` / `not_completed` / `blocked_environment`、実行記録、終了理由を残します。

Atomic Findingは一つのProduct Behaviorだけを持ちます。複数Defectを一つへ束ねた提出は `invalid_non_atomic`、同じDefectへの重複は `duplicate` です。正常なBehaviorを誤って報告するFalse Positiveは、項目固有の観測記録がある場合 `FP_non_defect` として分類します。未探索または観測不足はTNではなくNEです。確定Findingは対応するUnit / Integration / Component / E2E / Native Regressionの最小層へ還元します。

## 4. 受講者向けChallenge演習

Machine ContractはJSON + Zodです。Challengeの受講者向けJSONにはDefect / Non-defect分類、Answer Item ID、Patch意図、秘密のMappingを入れません。Answer KeyとUnified Diff Patchは講師専用です。Patchを使う場合の準備順序は次です。

```text
Baseline Build / Serve / Install
→ Pre-patch Baseline Sanity
→ cleanup / clean status
→ git apply --check → git apply
→ Patched Build / Serve / Install
→ Post-patch Sanity
→ Scored Initial StateへReset
→ runtime cleanup
→ Fresh Coding Agent Session (Agent Runtime / Host provided)
```

Pre-patchで対象Defectが存在する、`git apply --check`が失敗する、Post-patchで再現条件を満たさない場合はScored Runを始めません。PatchはApplication Branchへ適用してCommitせず、Runner Rootへコピーしません。

Black-box ScoredのCoverage SSOTは `challenge.required_coverage` のみです。Normal / Gray-boxはCharterから導出します。Runnerは必須IDを縮小・追加・並べ替えません。`challenge_id + benchmark_revision + runtime_variant_id` がBenchmark Identityで、同じ条件のRunner比較にはRunner Profileも完全一致させます。Clean committed inputは `git:<40 lowercase hex>`、未Commit / mixed inputはCanonical Manifest SHA-256の `sha256:<64 lowercase hex>`です。

RunnerはFresh Coding Agent SessionでPositive Tool Allowlistを使い、Forbidden Capability Probeを通します。RunnerとEvaluatorは別Sessionです。HarnessはRunnerを起動・wrap・retryしません。EvaluatorはFrozen `qa-findings.json`を書き換えず、Answer Keyを初めて読んで `evaluation.json`へMatch / Adjudicationを記録します。Environment Blocker、Isolation Failure、Tool Scope Failure、Benchmark Identity Mismatchは `valid_for_scoring=false` とし、`invalid_reasons[]`をenum・unique・辞書順で保存します。

## 5. 評価の読み方

Defectの一意Atomic FindingはTP、未報告はFNです。Unmatched Atomic Finding、`invalid_non_atomic`、`FP_non_defect`をPrecisionのFPへ数えます。`FP_non_defect`はPrecisionのFPのsubsetで、同じFindingを二重のFindingとして数えません。Non-defectは実行記録付きの正常確認だけTN、未実施はNEです。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

分母0は `null` です。Unexpected Valid Findingが真の未登録Defectなら、元Runを後付け再採点せず、元Runを無効化してGround Truth更新、新Benchmark Revision、同Runner ProfileのFresh Re-runを行います。

## 演習

1. Storefrontの `BR` / `AC` から、Risk、Test Case、Playwrightの実行記録を表にする。
2. 同じ観点でNormal Charterを作り、Coverageが0件Findingでも十分な理由を説明する。
3. Basic Challengeを受講者向けrootへ準備し、RootにSource / Patch / Answer KeyがないことをProbeする。
4. TP、FN、FP、TN、NE、`FP_non_defect`、`invalid_non_atomic`、`blocked_environment`を小さなFixturesで再計算する。
5. Android Capabilityが利用できる場合はNative Customer FlowをGray-boxで観察する。利用できない場合はMaestro Regression PASSをCapability PASSとせず、未実施理由を記録する。

## 参照

- [Specification Entry](../../../spec/README.md)
- [Agentic QA Workflow](../../../reference/agentic-qa-workflow.md)
- [QA Agent Contract](../../../../QA_AGENT.md)
- [Part 1 総合演習](./09_part1-capstone.md)
