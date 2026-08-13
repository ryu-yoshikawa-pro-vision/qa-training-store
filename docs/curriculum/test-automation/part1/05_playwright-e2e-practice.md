# Part 1-5: Playwright E2E実践

## 学習目標

- スプレッドシートで設計したテスト条件をPlaywrightへ実装できる。
- 正常系だけでなく、異常系、境界値、Role差分、状態遷移をE2Eへ落とせる。
- Seed Scenario / Resetを利用して再現可能なテストを作れる。
- UIだけでなく、必要に応じてTest APIや内部状態Inspectionを組み合わせて検証できる。
- Desktop / Mobile Web、Accessibilityなど異なる品質観点を理解できる。

## 教材

**このモジュールでは、このリポジトリのScenario Shop Webアプリと既存Playwright E2Eを使用します。**

主な参照先:

- [`docs/spec/features/cart.md`](../../../spec/features/cart.md)
- `training/playwright/baseline/training-baseline.spec.ts`
- `training/playwright/exercises/`
- `e2e/web/phase1-required.spec.ts`（Formal比較教材）
- `e2e/web/mobile-boundary.spec.ts`
- `e2e/web/accessibility.spec.ts`
- `e2e/web/cross-role-lifecycle.spec.ts`
- `src/seeds/metadata.ts`
- `window.__TEST_API__`

`e2e/web/fixtures.ts` はこの段階では内部実装を読み解く教材にしません。Seed Scenario ResetやEvidence収集はTraining Test Harnessが提供する機能として利用し、Fixtureの責務・共通化・内部設計はPart 1-8で扱います。

## 演習実装の前提

受講者が作るE2Eは、実装済みのTraining用実行境界で管理します。

既存の正式Regressionへ直接追加することは前提にしません。既存E2Eは、受講者が自分の実装を完成させた後に設計・品質の比較対象として使用します。

Training環境には最低限、次が必要です。

- Training用specを `training/playwright/`へ保存できる。
- `training-chromium` / `training-mobile-chromium`を明示的に実行できる。
- Scenario ShopのAutomation Build / Test APIを利用できる。
- Seed ScenarioをResetできるTest Harnessを利用できる。
- Failure時にTrace、Screenshot、Videoなどを確認できる。
- Training用変更が正式Regressionの必須Suiteへ意図せず混入しない。

`playwright.training.config.ts`、`package.json`のTraining Script、Training CI templateがこの契約を提供します。

## Lesson 1: テスト設計からコードへ落とす

スプレッドシートのTest Caseを、次の順序でコードへ変換します。

```text
Test Case ID
↓
前提状態
↓
操作
↓
期待結果
↓
必要なEvidence
```

例:

```text
CART-002
前提: out-of-stock Seed Scenario
操作: 商品をCartへ追加
期待: 追加が拒否される
```

ここからPlaywright Testを作成します。

## Lesson 2: Seed Scenario / Reset

E2Eでは前のテスト結果へ依存しないことが重要です。

Scenario Shopには、テスト開始状態を再現するためのSeed Scenarioがあります。

例:

- `default`
- `out-of-stock`
- `low-stock`
- `regular-member`
- `payment-declined`
- `cart-version-invalidates-checkout`

Training Testでは、教材側が提供するTest Harnessを使って必要なSeed ScenarioへResetします。

この段階で重要なのは、Fixtureの実装方法ではなく次を理解することです。

- 各Testが明示的な初期状態から始まる。
- 前のTestが残したCartやSessionへ依存しない。
- Reset後の状態が期待したSeed Scenarioであることを確認できる。
- 状態準備のために長いUI操作を毎回繰り返さなくてよい。

既存Repositoryがこの仕組みをどのようにFixtureへ実装しているかは、Maestroまで一巡した後のPart 1-8で確認します。

## Lesson 3: 異常系と境界値

スプレッドシートで設計したケースから、次のような条件をPlaywrightへ実装します。

- 在庫切れ
- 購入上限
- suspended user Login拒否
- Payment失敗

重要なのはError Messageを確認するだけではなく、誤った状態へ遷移していないことも確認することです。

境界値の全組み合わせをE2Eへ持ち込まず、UI Journeyとして価値の高い代表条件を選びます。

## Lesson 4: 状態遷移をE2Eにする

Paymentを例にします。

```text
Checkout
↓
Processing
↓
Failed
↓
Order Detail
↓
Retry
↓
Complete
```

1画面ずつ別テストにするだけでなく、業務上重要なJourneyとして確認する価値を考えます。

既存のPayment失敗・再試行E2Eと比較します。

## Lesson 5: Role横断テスト

Scenario ShopではAdminが作成・変更した状態がCustomer側へ影響します。

Cross-role Testでは、単一Roleの画面だけでなく、Roleを跨ぐLifecycleを確認できます。

例:

```text
Adminが商品作成
↓
公開
↓
Customerが購入
↓
Operatorが配送
↓
CustomerがReview
```

どこまでを1本のE2Eに含めるかは、Risk、失敗原因の特定性、実行時間から判断します。

## Lesson 6: UIと内部状態を組み合わせる

購入完了画面が表示されても、内部状態が完全に正しいとは限りません。

Scenario ShopのTest APIではOrderなどをInspectionできます。

既存E2Eでは、UI表示に加えて次のような状態も確認します。

- `orderStatus`
- `latestPaymentStatus`
- `cartStatus`
- `checkoutStatus`

UI E2Eで内部状態を確認する場合は、ProductionへTest APIを露出しないなどの安全境界も必要です。

## Lesson 7: Mobile Web

Playwright Projectを切り替え、Mobile Viewportでも主要Flowを確認します。

確認観点:

- 横Overflow
- Tap Target
- Navigation
- AdminのMobile Boundary
- Small viewportでPage Endへ到達できるか

DesktopでPassすることとMobileで使えることは同じではありません。

Training baselineのMobile確認は `pnpm run training:web:mobile` で実行します。
Baseline確認とは別に、受講者が作成したExerciseをMobile Projectで実行する場合は、
`pnpm run training:web:mobile:exercise` を使用します。この入口は
`training/playwright/exercises`だけを `training-mobile-chromium` で実行し、Formal E2Eを実行しません。

## Lesson 8: Accessibility

`@axe-core/playwright` を利用した自動Accessibility Testと、Keyboard操作などの確認を学びます。

自動Accessibility Scanだけでは完全なAccessibility保証にならない点も理解します。

## ハンズオン1: Cart Regression

スプレッドシートのCart Test Caseから、最低3件をPlaywrightへ実装します。

必須:

- 正常追加
- 在庫切れまたは購入上限
- 削除または数量変更

各Caseについて、スプレッドシート上の設計根拠とコード上のAssertionが対応していることを確認します。

## ハンズオン2: Payment Failure

Payment拒否からRetry成功までを実装します。

## ハンズオン3: Mobile確認

まず `pnpm run training:web:mobile` でTraining baselineを確認します。その後、作成したテストのうち1件以上を
`pnpm run training:web:mobile:exercise` でMobile向けTraining実行環境へ実行し、Desktopとの差を記録します。

## ハンズオン4: 既存E2Eとの差分分析

`phase1-required.spec.ts` と自分の実装を比較し、次を記録します。

- 自分の方が単純な点
- 既存側で追加している検証
- 既存側の保守上気になる点
- 後で共通化したくなりそうな処理

この時点ではまだPOMやFixture内部の設計へ変更・分析しません。共通化の必要性だけを問題として記録し、Part 1-8で解決方法を学びます。

## 確認問題

1. 各テストの開始前にSeed ScenarioをResetする価値は何か。
2. UI表示だけでは不足するE2Eの例を挙げる。
3. Cross-role E2Eを巨大化しすぎると何が問題になるか。
4. DesktopでPassしてもMobile Testが必要な理由は何か。
5. Accessibility自動Scanだけで十分ではない理由は何か。
6. Training用E2Eを正式Regressionから分離する理由は何か。
7. Part 1前半でFixture内部を先に学ばない理由は何か。

## 完了条件

- Playwright E2Eを5件以上実装している（本数はPractice Volumeであり、Rubric単独の合否条件ではない）。
- Seed Scenario / Resetを利用したテストを含む。
- 正常、異常または境界の両方を含む。
- PaymentまたはRole横断の状態遷移を1件以上扱っている。
- Desktop実行に加えて、Mobile baselineを確認し、作成したExerciseをMobileで1件以上実行している。Accessibilityは追加観点として実行・記録できるが、Mobileの代替にはしない。
- Training用E2Eと既存Regressionを混同せず、両者の役割を説明できる。
- Seed Scenario Resetを利用できる一方、Fixture内部設計はPart 1-8で学ぶ内容だと区別できる。
