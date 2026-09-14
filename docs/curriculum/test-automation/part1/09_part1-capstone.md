# Part 1-9: 総合演習

この総合演習では、既存Formal Regressionを答えとして写さず、現在の正式な仕様からCartの最小Riskを一巡します。Part 1の共通課程は共通経路で修了でき、モバイルアプリ自動化の選択課程は追加の選択経路です。発展課題は追加のChallengeです。

## 学習目標

- Part 1の共通課程のC01〜C07 + C09〜C10を一つの対応関係へ接続する。
- Guest Cart、Login、CheckoutのどこまでをWeb E2Eへ置くかを理由付きで決める。
- Training baseline、exercise、実行記録、Failure分類を自力で説明する。

## 中核: Cart Journey（共通課程の必須範囲・Web）

中核課題はPlaywrightによるWeb Cart Journeyで修了できます。モバイルアプリ自動化の選択やAndroid / iOS実行は、この共通経路の前提にしません。

1. [`cart.md`](../../../spec/features/cart.md) のBR / ACを読み、Guest / Customer / State / Dataを整理する。
2. `training/workbook/01_target-risk.csv` と `02_test-cases.csv`へRisk、条件、境界、期待結果を記録する。
3. [`state-and-scenarios.md`](../../../spec/state-and-scenarios.md)で必要な初期状態を確認し、必要な節だけ[`seed_catalog.md`](../../../07_testability/seed_catalog.md)と`/guide`で観察する。実装時にだけ実行可能なソースで具体的なIDを照合する。
4. `pnpm run training:web:baseline`でbaselineを実行し、必要なCart条件を`exercises/`へ実装した後、`pnpm run training:web:exercise`でDesktop learner exerciseを実行する。
5. `training-mobile-chromium`でResponsive Riskを1件確認する。
6. `03_automation-mapping.csv` と `04_execution-improvement.csv`へDecision、実行記録、Failure分類を追記する。

P1-6のC09診断で作成した失敗時の記録、cause、action、修正後の再実行記録は、同じ`test_case_id`の異なる`run_context`として再利用します。P1-9で診断Failureを新しく作り直す必要はありません。

## モバイルアプリ自動化の選択課程（選択時）

P1-7を選択した受講者は、P1-6までの共通課程の必須前提を満たした後、P1-7のNative開始条件とC08に最低限必要な成果物を確認します。Physical Android、Native artifact、Maestroの実行記録は選択課程の範囲であり、Part 1の共通課程の修了には要求しません。詳細はP1-7と [習熟度評価基準](../02_competency-rubric.md) を参照します。

選択課程を選ばない受講者やNative環境を利用できない受講者を、共通経路のblocked / not_completedとは扱いません。

Nativeを選択する場合だけ、P1-7で作成した受講者作成のNative exercise diffとMaestroの成功実行Artifactを中核課題の成果物とは別に確認します。Baseline / stock PASSやiOS Build-onlyは、その成果物の代替ではありません。

## 発展課題

中核課題の代わりにはならない追加課題です。

- Purchase Journey: Guest Cart → Login → Cart統合 → Address → Checkout → Payment → Order。
- Failure / Recovery: Payment Failure → Retry → Paid。
- Cross-role Lifecycle: Customer Purchase → Operator Shipment → Customer Review。

発展課題は仕様のBR / AC、Scenario Reset、Layer選択、実行記録を中核課題と同じ形式でリポジトリ内へ保存・記録します。外部提出は必須ではありません。

## 自己確認

次を自分の成果物を指しながら確認できれば、Part 1の共通課程の修了を自己判定できます。

- `cart.md`のBR / ACから選んだRisk、Test Case、Layer、Tool、実行記録の対応を説明できる。
- Guest / Customer、State / Data、Scenario / Resetの境界を既存SSOTへ戻って確認できる。
- Web baselineと自分のFailure Exerciseを分離し、Failure分類、原因仮説、実行記録、未確定範囲を説明できる。
- 自動化しないまたはLaterとした条件を、Riskと理由付きで説明できる。
- Nativeを選択しない共通経路でも修了でき、選択時だけNative成果物を別判定できる。

### Recovery

対応関係やFailureの分析がつながらない場合は、まず対象BR / AC、Risk、Test Case、実行条件、実行記録を1つずつ確認し、抜けた最初の項目へ戻ります。実行できない場合はBrowser、Seed / Reset、Test Control、環境上の問題を分けて記録します。Native環境の不足は共通課程の修了未達とせず、Nativeを選択する場合だけP1-7のRecoveryへ戻ります。

## 完了条件

- Part 1の共通課程: C01〜C07 + C09〜C10の対象範囲を限定したレベル2。各習熟項目に最低限必要な成果物は [習熟度評価基準](../02_competency-rubric.md) を参照し、C08 / Physical Android / Native artifactを共通課程の修了に要求しない。
- Spec、Risk、Test Case、Layer、Tool、実行記録の対応関係を説明できる。
- 自動化しない条件またはLater条件を1つ説明できる。
- baselineとFailure Exerciseを混ぜていない。
- 共通経路の成果物がWeb Cart Journey、対応関係、Failureの分析として自己完結し、Native / baselineの実行記録と混ざっていない。

## 次の行動

Part 1の共通課程の成果物を完了したら、[00_learning-designのPart 2移行説明](../00_learning-design.md)を確認して [P2-1: 開発プロセス](../part2/01_software-development-process.md) へ進みます。モバイルアプリ自動化の選択課程を選んだ場合も、Native成果物を別判定したうえで同じPart 2入口へ戻ります。
