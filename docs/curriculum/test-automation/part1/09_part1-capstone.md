# Part 1-9: 総合演習

このCapstoneでは、既存Formal Regressionを答えとして写さず、Current Normative SpecificationからCartの最小Riskを一巡します。CoreだけでPart 1を修了でき、Advancedは追加Challengeです。

## 学習目標

- C01〜C10を一つのTraceabilityへ接続する。
- Guest Cart、Login、CheckoutのどこまでをWeb E2Eへ置くかを理由付きで決める。
- Training baseline、exercise、Evidence、Failure分類を自力で説明する。

## Core: Cart Journey

1. [`cart.md`](../../../spec/features/cart.md) のBR / ACを読み、Guest / Customer / State / Dataを整理する。
2. `training/workbook/01_target-risk.csv` と `02_test-cases.csv`へRisk、条件、境界、期待結果を記録する。
3. 既存Scenarioの意味を [`state-and-scenarios.md`](../../../spec/state-and-scenarios.md) とExecutable Sourceで確認する。
4. `training-chromium`でbaselineを実行し、必要なCart条件を`exercises/`へ実装する。
5. `training-mobile-chromium`でResponsive Riskを1件確認する。
6. Windows LocalのCanonical Physical Android Deviceを、明示serial・`adb` status `device`・起動済み・unlock済みで準備する。Release APKをDevice ABIに合わせてBuildし、Install、Smoke、Test Control、Training Maestro baselineを実行する。Evidenceにはserial、physical判定、API、ABI、APK integrity、JUnit、Screenshot、UI hierarchy、logcat、activity stateを残す。Physical Device capabilityがない場合は実行を成功扱いにせず、`blocked_environment` または `not_completed` と理由をWorkbookへ記録する。環境不足は直ちにFailureとはしないが、Required Journeyの完了にも読み替えない。
7. `03_automation-mapping.csv` と `04_execution-improvement.csv`へDecision、Evidence、Failure分類を追記する。

## Advanced tracks

Coreの代わりにはならない追加課題です。

- Purchase Journey: Guest Cart → Login → Cart統合 → Address → Checkout → Payment → Order。
- Failure / Recovery: Payment Failure → Retry → Paid。
- Cross-role Lifecycle: Customer Purchase → Operator Shipment → Customer Review。

Advancedは仕様のBR / AC、Scenario Reset、Layer選択、EvidenceをCoreと同じ形式で提出します。

## 完了条件

- Spec、Risk、Test Case、Layer、Tool、EvidenceのTraceabilityを説明できる。
- 自動化しない条件またはLater条件を1つ説明できる。
- baselineとFailure Exerciseを混ぜていない。
- Physical Android DeviceでBuild / Install / Smoke / Test Control / Training Maestro baseline / Evidenceを一続きに確認できる。
- Android Build / RuntimeとiOS Build-onlyの保証差を誤記しない。
