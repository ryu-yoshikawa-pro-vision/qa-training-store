# Part 1-5: Playwright E2E実践

## 学習目標

- スプレッドシートで設計したテスト条件をPlaywrightへ実装できる。
- 正常系だけでなく、異常系、境界値、Role差分、状態遷移をE2Eへ落とせる。
- Seed Scenario / Resetを利用して再現可能なテストを作れる。
- UIの期待結果と、必要な場合に内部状態を確認する発展課題の違いを説明できる。
- Desktop / Mobile Web、Accessibilityなど異なる品質観点を理解できる。

## 教材

**このモジュールでは、このリポジトリのScenario Shop Webアプリと既存Playwright E2Eを使用します。**

主な参照先:

- [`docs/spec/features/cart.md`](../../../spec/features/cart.md)
- [`docs/spec/state-and-scenarios.md`](../../../spec/state-and-scenarios.md)
- `training/playwright/baseline/training-baseline.spec.ts`
- `training/playwright/exercises/`
- `training/playwright/support/reset-scenario.ts`
- `e2e/web/phase1-required.spec.ts`（Formal比較教材）
- `e2e/web/mobile-boundary.spec.ts`
- `e2e/web/accessibility.spec.ts`
- `e2e/web/cross-role-lifecycle.spec.ts`

`e2e/web/fixtures.ts` はこの段階では内部実装を読み解く教材にしません。Seed Scenario Resetや実行記録の収集はTraining Test Harnessが提供する機能として利用し、Fixtureの責務・共通化・内部設計はPart 1-8で扱います。

## 演習実装の前提

受講者が作るE2Eは、実装済みのTraining用実行境界で管理します。

既存の正式Regressionへ直接追加することは前提にしません。既存E2Eは、受講者が自分の実装を完成させた後に設計・品質の比較対象として使用します。

Training環境には最低限、次が必要です。

- Training用specを `training/playwright/`へ保存できる。
- `training-chromium` / `training-mobile-chromium`を明示的に実行できる。
- Scenario ShopのTraining Harnessを利用できる。
- Seed ScenarioをResetできるTest Harnessを利用できる。
- Failure時にTrace、Screenshot、Videoなどを確認できる。
- Training用変更が正式Regressionの必須Suiteへ意図せず混入しない。

`playwright.training.config.ts`、`package.json`のTraining Script、Training CI templateがこの契約を提供します。

## 実装を始める前に準備するもの

P1-3の設計が未完了なら、先に戻ってから実装します。Playwrightのコードだけを先に書くと、何を確認するTestなのか、どの結果をWorkbookへ記録するのかが決まりません。最低限、次のInputを1つのCaseごとに揃えます。

| 準備するもの | 例 | 使う場所 |
| --- | --- | --- |
| Test Case ID | P1-3で作った`TC-CART-101`など。配布sampleの`TC-CART-001`／`TC-CART-002`を完成Caseとして流用しない | Test titleまたはannotation、Workbookの全行 |
| 条件・前提・期待結果 | 対象商品、Seed Scenario、操作、確認する画面状態 | `02_test-cases.csv`、Test本文 |
| Reset方法 | `resetScenario(page, "default")`など | Testの最初 |
| 代表specのPath | `training/playwright/exercises/my-cart.spec.ts` | `03_automation-mapping.csv`の`implementation_path` |

Starterは完成答案ではありません。内容を直接完成させず、`training/playwright/exercises/`へ自分のCase用の新しい`.spec.ts`を作成し、そこへStarterのimportと最小構造を参考に書きます。Helper／POMを作る場合も同じ`training/playwright/`配下へ置き、代表specからimportします。まずは1つのspecへ素直に書き、P1-8で共通化の要否を判断します。

Desktop learner exerciseの互換commandは `pnpm run training:web:exercise`、Mobile learner exerciseは既存の `pnpm run training:web:mobile:exercise`です。実行結果を評価へ渡す場合は、P1-6で扱う`training:web:exercise:with-receipt`を使い、実行したCaseとEvidenceを記録します。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P1-3で設計した複数のTest Case、特に自分が作成した`TC-CART-101`などを代表とする条件・前提・期待結果・Risk／BR／AC・Layer / Tool、P1-4で確認したAction／Locator／Assertionの基礎、既存`resetScenario`。実装前にCase ID、Reset方法、代表specの保存先を準備する |
| Activity | CaseをTraining specへ実装し、各Testの開始時に明示的なSeed ScenarioへResetする。正常、境界／異常、状態変化、Desktop、受講者が作成したMobile Web exerciseを必要な範囲で実行する |
| Observation | Reset後のScenario、画面上の状態変化、期待結果と実際の結果、Desktop／Mobileの差、Trace／Screenshot／Video／Reportの生成、WorkbookのCaseとコードの対応 |
| Output | 受講者が作成したTraining spec、対応するWorkbookの`implementation_path`、実行ごとのReceipt／Evidence参照、Desktop／Mobileで観察した差分。各Test Case IDはWorkbookの`implementation_path`、テストタイトル、注釈、または既存metadataのいずれかでコードと実行結果へ追跡できるようにする。編集場所は自由で、評価時はRepository相対Pathを保って`handoff-root/code/`と各rootへ集約する |
| Self-check | P1-3のCaseとコードの条件・期待結果が対応し、Reset、正常・境界／異常、状態変化、Desktop、Learner-authored Mobileの各観点を必要な理由とともに説明する。意味の妥当性は自動判定へ委ねない |
| Completion | 少なくとも複数の受講者CaseをTraining境界へ実装し、各Caseについて明示Resetと意味のあるAssertion、実行記録、Workbookとの対応を確認できる。`TC-CART-001`／`TC-CART-002`は配布sampleのため、必須の完成Caseとして要求しない |
| Recovery | 学習上の実装不足はP1-3／P1-4へ戻る。Test／Product FailureはExpected／ActualとEvidenceを分ける。Browser、Base URL、Harness、Artifact不足は環境問題として記録し、Training specをFormal Regressionへ移さない |
| Handoff | P1-6へCase ID、実装Path、実行command、run／case／RetryのReceipt、Evidence、Failure分類またはPass結果を渡す。P1-6開始時に初期状態と実行対象が再現できることを確認する |

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
TC-CART-002
前提: cart-with-invalid-itemsへResetし、regular@example.comでLoginする
操作: CartからCheckoutの入口を確認する
期待: 購入不可明細の理由が表示され、Checkoutへ進めない
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

Training Testでは、教材側が提供する`resetScenario(page, "<scenario>")`を使って必要なSeed ScenarioへResetします。受講者は`page.evaluate()`、`window.__TEST_API__`、正式RegressionのFixture内部を実装しません。

### Testの分離と製品データのReset

PlaywrightのBrowserContext分離とScenario Shop固有のResetは別の責務です。

- **BrowserContext分離**: TestごとにCookie、`localStorage`、`sessionStorage`などのBrowser状態を分け、前のTestの認証やBrowser状態へ依存しないようにします。
- **Scenario Reset**: 在庫、Cart、Account、Clockなどの製品データを指定Scenarioへ戻します。

BrowserContextだけでは製品データの初期状態は作れず、Scenario ResetだけではBrowser状態の分離を代替できません。両方を使って再現可能なTestを作ります。

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

## Lesson 4: 状態遷移をE2Eにする（発展）

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

## Lesson 5: Role横断テスト（発展）

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

## Lesson 6: UIと内部状態を組み合わせる（発展）

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

Training baselineのDesktop確認とは別に、受講者が作成したExerciseは `pnpm run training:web:exercise` で `training-chromium`へ実行します。

Training baselineのMobile確認は `pnpm run training:web:mobile` で実行します。
Baseline確認とは別に、受講者が作成したExerciseをMobile Projectで実行する場合は、
`pnpm run training:web:mobile:exercise` を使用します。この入口は
`training/playwright/exercises`だけを `training-mobile-chromium` で実行し、Formal E2Eを実行しません。

## Lesson 8: Accessibility（発展）

`@axe-core/playwright` を利用した自動Accessibility Testと、Keyboard操作などの確認を学びます。

自動Accessibility Scanだけでは完全なAccessibility保証にならない点も理解します。

## ハンズオン1: Cart Regression

P1-3で作成した複数のCart Test Caseから、共通課程の中核として代表条件を実装します。`TC-CART-101`はP1-2からP1-6へ渡す縦断Caseの1つであり、これだけで全ての観点を満たしたことにはしません。3件程度は練習量の目安であり、件数だけを修了条件にはしません。

必須:

- 正常追加
- 購入上限または別の対象Riskの境界値（受講者のCase ID。`TC-CART-101`を代表例にする）
- 購入不可明細からのCheckout阻止など、別のRiskを表すCase
- 削除または数量変更

在庫切れ（`out-of-stock`）を追加練習にする場合は、Workbookの`TC-CART-001`／`TC-CART-002`を流用せず、別のTest Case IDで記録します。配布sampleのIDを使う場合でも、受講者が作成したコードと実行結果が対応していることを記録します。

各Caseについて、スプレッドシート上の設計根拠とコード上のAssertionが対応していることを確認します。

## ハンズオン2: Payment Failure（発展）

Payment拒否からRetry成功までを実装します。

## ハンズオン3: Mobile確認

まず `pnpm run training:web:mobile` でTraining baselineを確認します。その後、作成したテストのうち1件以上を
`pnpm run training:web:mobile:exercise` でMobile向けTraining実行環境へ実行し、Desktopとの差を記録します。

## ハンズオン4: 既存E2Eとの差分分析（発展課題・参考資料との比較）

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

## 自己確認

### 回答の最低判定基準

- Seed Scenario / Resetについて、各Testが明示的な初期状態から始まり、前のTestの状態へ依存しないことを説明している。
- UI表示だけでなく、必要なCaseでは状態遷移や内部状態を確認し、Test API / Inspectionを使う場合のTraining / Production境界を説明している。
- CoreとしてCartの正常追加、削除または数量変更、在庫切れまたは購入上限の代表Boundary、Mobile baselineとExerciseを選んでいる。
- Payment、Cross-role、Internal Inspection、Accessibilityの実行は発展課題であり、共通課程の修了には不要だと説明できる。
- DesktopとMobileの差をViewport / Navigation / Touch Targetなど観測可能な観点で記録し、実行記録とTest Case IDを結び付けている。
- Failure時に期待状態と実際の状態を分け、Training specをFormal Regressionへ混在させていない。

### Recovery

共通課程の中核と発展課題を混同した場合はLesson 3とLesson 7、ハンズオン1と3へ戻り、Cartの代表Boundaryを1件だけResetから再実行します。実行できない場合はBase URL / Browser / Training Harnessを環境上の問題として記録し、Caseの選択理由と分けて復帰します。

## 完了条件

- 共通課程の中核として、Cartの正常追加、明示的なSeed Scenario / Reset、代表Boundary、Mobile baselineと作成したExerciseのMobile実行を対応付けて確認できる。
- 各TestのTest Case ID、Risk / BR / AC、期待結果、Layer / Tool、実行記録を対応付けている。
- Payment、Cross-role、Internal Inspection、Accessibilityの実行は発展課題として扱い、共通課程の修了の前提にしていない。
- Training用E2Eと既存Regressionを混同せず、両者の役割を説明できる。
- Seed Scenario Resetを利用できる一方、Fixture内部設計はPart 1-8で学ぶ内容だと区別できる。

練習量の目安として5件以上のPlaywright E2Eを作成してもよいが、件数や発展課題の実施だけでは修了としません。

## 次の行動

[Part 1-6: テスト実行・結果分析・改善](./06_execution-and-failure-analysis.md)へ進み、共通課程の中核または発展課題で得たFailure / 実行記録を原因分析へ接続します。
