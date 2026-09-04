# Competency Rubric

この文書は、Test Automation Curriculumの評価正本です。演習のTest本数や手順完了だけを合否条件にせず、Normative Specificationから判断理由を導き、実行可能なEvidenceで説明できるかを評価します。

## 評価の前提

- Expected Product Behaviorは [`docs/spec/README.md`](../../spec/README.md) のNormative Product BehaviorとFeatureのBR / ACから判断する。
- Application、既存Test、README、実行結果はImplementation / Regression / Supporting / Observed Evidenceであり、Normative Oracleへ昇格させない。
- Seed Scenario ID、Route、UI Test ID、Build値はSpecが指定するExecutable Canonical Sourceから確認する。
- `br_ids` / `ac_ids`など複数IDは`;`区切りで記録する。
- iOS Runtimeを実行したことは修了条件にしない。Current GuaranteeはAndroid = Build + Runtime E2E、iOS = Build-onlyである。

## Competency一覧

| ID | Competency | Path classification | bounded Level 2 | Primary learner-facing source(s) | Minimum Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | Automation Purpose / Scope | Common | Automationの価値・限界・自動化しない理由を説明する | [Part 1-1](./part1/01_test-automation-foundations.md) + [01_target-risk.csv](../../../training/workbook/01_target-risk.csv) | workbook Target & Riskのtarget / spec ref / scope rationale |
| C02 | Test Target / Specification Analysis | Common | Role、State、Data、BR、AC、JourneyをSpecから整理する | [Part 1-2](./part1/02_scenario-shop-analysis.md) + [02_test-cases.csv](../../../training/workbook/02_test-cases.csv) | Spec参照 + test condition / expected result |
| C03 | Risk Analysis | Common | ImpactとLikelihoodから優先順位と理由を説明する | [Part 1-3](./part1/03_test-design-and-automation-selection.md) + [01_target-risk.csv](../../../training/workbook/01_target-risk.csv) | impact / likelihood / priority / rationale |
| C04 | Test Design | Common | Spec / Riskに適したtechniqueを選び、選定理由を説明する | [Part 1-3](./part1/03_test-design-and-automation-selection.md) + [02_test-cases.csv](../../../training/workbook/02_test-cases.csv) | selected technique + Spec / Risk fit + reason |
| C05 | Test Layer Selection | Common | Formal SSOTのTest Level / Perspective / Execution・Platform Gateを選び、理由を説明する | [Part 1-6](./part1/06_execution-and-failure-analysis.md) + [Formal Test Strategy](../../08_testing/test_strategy.md) | Formal SSOTに基づくtest level / perspective / gate mapping + reason |
| C06 | Automation Selection | Common | Automate / Later / Do not automateをCostとRegression価値で判断する | [Part 1-3](./part1/03_test-design-and-automation-selection.md) + [03_automation-mapping.csv](../../../training/workbook/03_automation-mapping.csv) | automation decision / tool / entry or Spec reference + reason |
| C07 | Web Automation | Common | Playwrightで意味のあるLocator、Assertion、Reset、Evidenceを使う | [Part 1-5](./part1/05_playwright-e2e-practice.md) + `training/playwright/exercises/` | learner-authored Playwright exercise change + successful Web execution evidence |
| C08 | Native Automation | Native specialization | Native specializationとして、Android Maestro、Stable Test ID、Deep Link、Test Controlを使う | [Part 1-7](./part1/07_maestro-native-automation.md) + `training/maestro/exercises/` | learner-authored Native exercise diff + successful Maestro execution artifact; Baseline / stock PASSだけではC08 completionにならない |
| C09 | Failure Analysis | Common | Locator / Timing / Assertion等のmeaningful diagnosisからcause / action / re-run evidenceを示す | [Part 1-6](./part1/06_execution-and-failure-analysis.md) + [04_execution-improvement.csv](../../../training/workbook/04_execution-improvement.csv) | Locator / Timing / Assertion等のmeaningful diagnosis + cause / action / re-run |
| C10 | Maintainability | Common | real maintainability issueを診断し、reasoned minimal learner-authored improvementとre-run evidenceを示す | [Part 1-8](./part1/08_test-management-and-maintainability.md) + [04_execution-improvement.csv](../../../training/workbook/04_execution-improvement.csv) | real maintainability issue diagnosis + reasoned minimal learner-authored improvement + re-run |
| C11 | Change Management | Common | learner-authored Git / PR changeをreviewable diff、rationale、review recordで説明する | [Part 2-3](./part2/03_github-pull-request-review.md) + [Part 2-8](./part2/08_integration-design-capstone.md) | learner-authored Git / PR change + reviewable diff + change rationale + learner-facing review criteriaに基づくreview record（自分のDiffまたは教材用Diffで成立し、第三者ReviewはRequiredではない） |
| C12 | Continuous Execution Design | Common | bounded Web CIのTrigger / Gate / Artifact / Failure Evidenceを設計・説明する | [Part 2-5](./part2/05_playwright-ci.md) + [Part 2-8](./part2/08_integration-design-capstone.md) | Trigger / Gate / Artifact / Failure Evidence（bounded Web CI） |

`Common`はLearner Required Commonを示し、`Native specialization`はC08だけに使用します。`Advanced`はbounded Level 2外のscopeを説明する語であり、C01〜C12の新しいclassificationではありません。

## Completion contract

- Part 1 Common: C01〜C07 + C09〜C10
- Part 2 / Final Common: C01〜C07 + C09〜C12
- C08: Native specialization / Common non-required
- C12 Common Level 2: bounded Web CI
- C08 Minimum Evidence: learner-authored Native exercise diff + successful Maestro execution artifact
- Baseline / stock PASSだけではC08 completionにならない

## Level定義

| Level | 定義 | Evidence例 |
| --- | --- | --- |
| Level 0 | 説明・実施できない、またはOracleや保証範囲を誤る | SpecとImplementationを区別できない |
| Level 1 | 例・ヒント・詳細手順を使って実施できる | 例題を写してResetとAssertionを実行できる |
| Level 2 | 自力で実施し、判断理由とEvidenceを説明できる | Workbook、Test、Artifact、Failure分類が一貫する |
| Level 3 | 複数案とTrade-offを比較し、改善案を提案できる | Cost、Risk、Flaky、Platform保証を含む代替案を比較する |

Level 3はCommon Requiredではなく、bounded Level 2を超えるchallenge / Advanced scopeとして扱います。Instructor支援の有無はLevel定義の必須条件にしません。

## Part 1修了基準

Part 1 Common: C01〜C07 + C09〜C10 bounded Level 2。各Competencyの評価詳細とMinimum Evidenceは、上記の`Competency一覧`を参照します。C08、Physical Android、Native evidenceはCommon completionに要求しません。

Baseline / stock PASSはenvironment / harness evidenceであり、learner-authored competency evidenceの代替にはなりません。Native specializationを選択する場合のC08 evidenceは、上記の`Competency一覧`を参照します。外部提出はRequiredではありません。

## Part 2修了基準

Part 2 / Final Common: C01〜C07 + C09〜C12 bounded Level 2。各Competencyの評価詳細とMinimum Evidenceは、上記の`Competency一覧`を参照します。

C12 Commonはbounded Web CIのTrigger / Gate / Artifact / Failure Evidenceに限定します。Native / multi-platform / preview-prod delivery、Training Copyの運用詳細、Android baseline、Delivery SHAはCommon completionへ再列挙しません。C08はCommon completionに要求せず、Level 3相当の比較・提案もCommon Requiredではありません。

## 採点表

| 観点 | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- |
| Oracle | 参照先を指定できる | BR / ACとObservedを分離する | AmbiguityをIssueとして扱い代替案を比較する |
| Risk / Design | 技法を使える | Riskから条件・Layerを導く | Cost、Coverage、保守性のTrade-offを提案する |
| Automation | 手順を実行できる | 再現可能なTestとEvidenceを作る | Suiteの削減・分割・Trigger改善を提案する |
| Failure | エラーを報告できる | Failure Taxonomyで原因境界を説明する | 再発防止とGateへの反映を設計する |
| Delivery | CI用語を説明できる | bounded Web CIのTrigger / Gate / Artifact / Failure Evidenceを説明する | Exact SHA、Artifact、Runner Costを含む導入案を比較する |

Test本数はPractice Volumeとして記録します。単独の合否条件にはしません。
