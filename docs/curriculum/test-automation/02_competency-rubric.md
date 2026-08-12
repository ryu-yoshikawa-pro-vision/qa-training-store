# Competency Rubric

この文書は、Test Automation Curriculumの評価正本です。演習のTest本数や手順完了だけを合否条件にせず、Normative Specificationから判断理由を導き、実行可能なEvidenceで説明できるかを評価します。

## 評価の前提

- Expected Product Behaviorは [`docs/spec/README.md`](../../spec/README.md) のNormative Product BehaviorとFeatureのBR / ACから判断する。
- Application、既存Test、README、実行結果はImplementation / Regression / Supporting / Observed Evidenceであり、Normative Oracleへ昇格させない。
- Seed Scenario ID、Route、UI Test ID、Build値はSpecが指定するExecutable Canonical Sourceから確認する。
- `br_ids` / `ac_ids`など複数IDは`;`区切りで記録する。
- iOS Runtimeを実行したことは修了条件にしない。Current GuaranteeはAndroid = Build + Runtime E2E、iOS = Build-onlyである。

## Competency一覧

| ID | Competency | Level 2で確認する行動 |
| --- | --- | --- |
| C01 | Automation Purpose / Scope | Automationの価値・限界・自動化しない理由を説明する |
| C02 | Test Target / Specification Analysis | Role、State、Data、BR、AC、JourneyをSpecから整理する |
| C03 | Risk Analysis | ImpactとLikelihoodから優先順位を説明する |
| C04 | Test Design | 同値分割、境界値、Decision Table、State、Role Matrixを使い分ける |
| C05 | Test Layer Selection | Unit、Contract、Component、Web E2E、Native E2Eの責務を分ける |
| C06 | Automation Selection | Automate / Later / Do not automateをCostとRegression価値で判断する |
| C07 | Web Automation | Playwrightで意味のあるLocator、Assertion、Reset、Evidenceを使う |
| C08 | Native Automation | Android Maestro、Stable Test ID、Deep Link、Test Controlを使う |
| C09 | Failure Analysis | Evidenceから原因分類、仮説、確認、修正、再発防止へ進む |
| C10 | Maintainability | Flaky、重複、責務混在、不要Test、実行時間を改善する |
| C11 | Change Management | Git、PR、ReviewでTest資産の変更を説明可能にする |
| C12 | Continuous Execution Design | Trigger、Gate、Artifact、Platform、Cost、Reliabilityを設計する |

## Level定義

| Level | 定義 | Evidence例 |
| --- | --- | --- |
| Level 0 | 説明・実施できない、またはOracleや保証範囲を誤る | SpecとImplementationを区別できない |
| Level 1 | 手順書や講師の支援があれば実施できる | 例題を写してResetとAssertionを実行できる |
| Level 2 | 自力で実施し、判断理由とEvidenceを説明できる | Workbook、Test、Artifact、Failure分類が一貫する |
| Level 3 | 複数案とTrade-offを比較し、改善案を提案できる | Cost、Risk、Flaky、Platform保証を含む代替案を比較する |

## Part 1修了基準

Part 1はC01〜C10の主要項目をLevel 2へ到達させます。次を一つのTraceabilityとして提出します。

1. Current SpecのFeature、BR、ACを参照した対象分析。
2. RiskとTest Conditionを記録したWorkbook。
3. Web Training baselineまたは自分のexerciseと、Android Training Maestroの最小Flow。
4. Desktop / Mobileの実行結果と、FailureまたはExpected FailureのEvidence。
5. Core Cart Capstoneの設計理由と、自動化しない条件の説明。

AdvancedのPurchase Journey、Failure / Recovery、Cross-role Lifecycleは、Coreの代替ではなく追加Challengeです。全3系統の完了を必須にしません。

## Part 2修了基準

Part 2はC01〜C12の主要項目をLevel 2以上へ到達させます。Capstoneでは一部のC11 / C12判断をLevel 3相当として扱います。

- full Source SHAからTraining Copyを準備し、Workflow allowlistを検証できる。
- Training CIとFormal CIを分離し、read-only / no-secret / GitHub-hosted runner境界を説明できる。
- Web baseline、Android baseline、expected-failureの結果とArtifactの意味を区別できる。
- Android Build API 36 / Runtime API 34を混同せず、iOS Build-onlyをRuntime PASSとして報告しない。
- Final Candidate SHA、Training Copy Source SHA、Delivery Evidenceの関係を説明できる。

## 採点表

| 観点 | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- |
| Oracle | 参照先を指定できる | BR / ACとObservedを分離する | AmbiguityをIssueとして扱い代替案を比較する |
| Risk / Design | 技法を使える | Riskから条件・Layerを導く | Cost、Coverage、保守性のTrade-offを提案する |
| Automation | 手順を実行できる | 再現可能なTestとEvidenceを作る | Suiteの削減・分割・Trigger改善を提案する |
| Failure | エラーを報告できる | Failure Taxonomyで原因境界を説明する | 再発防止とGateへの反映を設計する |
| Delivery | CI用語を説明できる | AllowlistとRequired Gateを検証する | Exact SHA、Artifact、Runner Costを含む導入案を比較する |

Test本数はPractice Volumeとして記録します。単独の合否条件にはしません。
