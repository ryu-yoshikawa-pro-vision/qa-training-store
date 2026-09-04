# Part 1-9: 総合演習

このCapstoneでは、既存Formal Regressionを答えとして写さず、Current Normative SpecificationからCartの最小Riskを一巡します。Part 1 CommonはCommon routeで修了でき、Native specializationは追加の選択経路です。Advancedは追加Challengeです。

## 学習目標

- Part 1 CommonのC01〜C07 + C09〜C10を一つのTraceabilityへ接続する。
- Guest Cart、Login、CheckoutのどこまでをWeb E2Eへ置くかを理由付きで決める。
- Training baseline、exercise、Evidence、Failure分類を自力で説明する。

## Core: Cart Journey

1. [`cart.md`](../../../spec/features/cart.md) のBR / ACを読み、Guest / Customer / State / Dataを整理する。
2. `training/workbook/01_target-risk.csv` と `02_test-cases.csv`へRisk、条件、境界、期待結果を記録する。
3. 既存Scenarioの意味を [`state-and-scenarios.md`](../../../spec/state-and-scenarios.md) とExecutable Sourceで確認する。
4. `training-chromium`でbaselineを実行し、必要なCart条件を`exercises/`へ実装する。
5. `training-mobile-chromium`でResponsive Riskを1件確認する。
6. `03_automation-mapping.csv` と `04_execution-improvement.csv`へDecision、Evidence、Failure分類を追記する。

## Native specialization（選択時）

P1-7を選択した受講者は、P1-6までのCommon prerequisiteを満たした後、P1-7のNative開始条件とC08 Minimum Evidenceを確認します。Physical Android、Native artifact、Maestro実行EvidenceはNative specializationの範囲であり、Part 1 Common completionには要求しません。詳細はP1-7と [Competency Rubric](../02_competency-rubric.md) を参照します。

Native specializationを選択しない受講者やNative環境を利用できない受講者を、Common routeのblocked / not_completedとは扱いません。

## Advanced tracks

Coreの代わりにはならない追加課題です。

- Purchase Journey: Guest Cart → Login → Cart統合 → Address → Checkout → Payment → Order。
- Failure / Recovery: Payment Failure → Retry → Paid。
- Cross-role Lifecycle: Customer Purchase → Operator Shipment → Customer Review。

Advancedは仕様のBR / AC、Scenario Reset、Layer選択、EvidenceをCoreと同じ形式でRepository内へ保存・記録します。外部提出は必須ではありません。

## 完了条件

- Part 1 Common: C01〜C07 + C09〜C10 bounded Level 2。各CompetencyのMinimum Evidenceは [Competency Rubric](../02_competency-rubric.md) を参照し、C08 / Physical Android / Native artifactをCommon completionに要求しない。
- Spec、Risk、Test Case、Layer、Tool、EvidenceのTraceabilityを説明できる。
- 自動化しない条件またはLater条件を1つ説明できる。
- baselineとFailure Exerciseを混ぜていない。
- Android Build / RuntimeとiOS Build-onlyの保証差を誤記しない。
