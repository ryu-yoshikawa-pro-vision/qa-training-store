# Part 1-9: 総合演習

このCapstoneでは、既存Formal Regressionを答えとして写さず、Current Normative SpecificationからCartの最小Riskを一巡します。Part 1 CommonはCommon routeで修了でき、Native specializationは追加の選択経路です。Advancedは追加Challengeです。

## 学習目標

- Part 1 CommonのC01〜C07 + C09〜C10を一つのTraceabilityへ接続する。
- Guest Cart、Login、CheckoutのどこまでをWeb E2Eへ置くかを理由付きで決める。
- Training baseline、exercise、Evidence、Failure分類を自力で説明する。

## Core: Cart Journey（Common Required / Web）

CoreはPlaywrightによるWeb Cart Journeyで完了します。Native specializationの選択やAndroid / iOS実行は、このCommon routeの前提にしません。

1. [`cart.md`](../../../spec/features/cart.md) のBR / ACを読み、Guest / Customer / State / Dataを整理する。
2. `training/workbook/01_target-risk.csv` と `02_test-cases.csv`へRisk、条件、境界、期待結果を記録する。
3. 既存Scenarioの意味を [`state-and-scenarios.md`](../../../spec/state-and-scenarios.md) とExecutable Sourceで確認する。
4. `training-chromium`でbaselineを実行し、必要なCart条件を`exercises/`へ実装する。
5. `training-mobile-chromium`でResponsive Riskを1件確認する。
6. `03_automation-mapping.csv` と `04_execution-improvement.csv`へDecision、Evidence、Failure分類を追記する。

## Native specialization（選択時）

P1-7を選択した受講者は、P1-6までのCommon prerequisiteを満たした後、P1-7のNative開始条件とC08 Minimum Evidenceを確認します。Physical Android、Native artifact、Maestro実行EvidenceはNative specializationの範囲であり、Part 1 Common completionには要求しません。詳細はP1-7と [Competency Rubric](../02_competency-rubric.md) を参照します。

Native specializationを選択しない受講者やNative環境を利用できない受講者を、Common routeのblocked / not_completedとは扱いません。

Nativeを選択する場合だけ、P1-7で作成したlearner-authored Native exercise diffとsuccessful Maestro execution artifactをCoreの成果物とは別に確認します。Baseline / stock PASSやiOS Build-onlyは、その成果物の代替ではありません。

## Advanced tracks

Coreの代わりにはならない追加課題です。

- Purchase Journey: Guest Cart → Login → Cart統合 → Address → Checkout → Payment → Order。
- Failure / Recovery: Payment Failure → Retry → Paid。
- Cross-role Lifecycle: Customer Purchase → Operator Shipment → Customer Review。

Advancedは仕様のBR / AC、Scenario Reset、Layer選択、EvidenceをCoreと同じ形式でRepository内へ保存・記録します。外部提出は必須ではありません。

## 自己確認

次を自分の成果物を指しながら確認できれば、Part 1 Commonの完了を自己判定できます。

- `cart.md`のBR / ACから選んだRisk、Test Case、Layer、Tool、Evidenceの対応を説明できる。
- Guest / Customer、State / Data、Scenario / Resetの境界を既存SSOTへ戻って確認できる。
- Web baselineと自分のFailure Exerciseを分離し、Failure分類、原因仮説、Evidence、未確定範囲を説明できる。
- 自動化しないまたはLaterとした条件を、Riskと理由付きで説明できる。
- Nativeを選択しないCommon routeでも完了でき、選択時だけNative成果物を別判定できる。

### Recovery

TraceabilityやFailure reasoningがつながらない場合は、まず対象BR / AC、Risk、Test Case、実行条件、Evidenceを1つずつ確認し、抜けた最初の項目へ戻ります。実行できない場合はBrowser、Seed / Reset、Test Control、Environment blockを分けて記録します。Native環境の不足はCommon completionの未達とせず、Nativeを選択する場合だけP1-7のRecoveryへ戻ります。

## 完了条件

- Part 1 Common: C01〜C07 + C09〜C10 bounded Level 2。各CompetencyのMinimum Evidenceは [Competency Rubric](../02_competency-rubric.md) を参照し、C08 / Physical Android / Native artifactをCommon completionに要求しない。
- Spec、Risk、Test Case、Layer、Tool、EvidenceのTraceabilityを説明できる。
- 自動化しない条件またはLater条件を1つ説明できる。
- baselineとFailure Exerciseを混ぜていない。
- Common routeの成果物がWeb Cart Journey、Traceability、Failure reasoningとして自己完結し、Native / baselineのEvidenceと混ざっていない。

## 次の行動

Part 1 Commonの成果物を完了したら、[00_learning-designのPart 2移行説明](../00_learning-design.md)を確認して [P2-1: 開発プロセス](../part2/01_software-development-process.md) へ進みます。Native specializationを選択した場合も、Native成果物を別判定したうえで同じPart 2入口へ戻ります。
