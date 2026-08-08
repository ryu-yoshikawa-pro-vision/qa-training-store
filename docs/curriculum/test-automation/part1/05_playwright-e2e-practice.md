# Part 1-5: Playwright E2E実践

## 学習目標

- スプレッドシートで設計したテスト条件をPlaywrightへ実装できる。
- 正常系だけでなく、異常系、境界値、Role差分、状態遷移をE2Eへ落とせる。
- Seed / Scenario / Resetを利用して再現可能なテストを作れる。
- UIだけでなく、必要に応じてTest APIや内部状態Inspectionを組み合わせて検証できる。
- Desktop / Mobile Web、Accessibilityなど異なる品質観点を理解できる。

## 教材

**このモジュールでは、このリポジトリのScenario Shop Webアプリと既存Playwright E2Eを使用します。**

主な参照先:

- `e2e/web/phase1-required.spec.ts`
- `e2e/web/fixtures.ts`
- `e2e/web/mobile-boundary.spec.ts`
- `e2e/web/accessibility.spec.ts`
- `e2e/web/cross-role-lifecycle.spec.ts`
- `src/seeds/metadata.ts`
- `window.__TEST_API__`

## Lesson 1: テスト設計からコードへ落とす

スプレッドシートのTest Caseを、次の順序でコードへ変換します。

```text
Test ID
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
前提: out-of-stock
操作: 商品をCartへ追加
期待: 追加が拒否される
```

ここからPlaywright Testを作成します。

## Lesson 2: Seed / Scenario / Reset

E2Eでは前のテスト結果へ依存しないことが重要です。

Scenario Shopには、テスト開始状態を再現するためのScenarioがあります。

例:

- `default`
- `out-of-stock`
- `low-stock`
- `regular-member`
- `payment-declined`
- `cart-version-invalidates-checkout`

既存 `e2e/web/fixtures.ts` の `scenario` Fixtureを読み、次を確認します。

- Reset前に余分なPageを閉じている。
- Test APIでScenarioをResetしている。
- Reloadしている。
- Metadataを再確認している。
- Guest / Session状態を検証している。
- Console ErrorをEvidenceとして残している。

ここではFixture設計そのものを深掘りしません。まず「安定した初期状態がE2Eへ必要」という目的を理解します。Fixtureの設計・共通化は後半のテスト管理モジュールで扱います。

## Lesson 3: 異常系と境界値

次をPlaywrightで実装します。

- 在庫切れ
- 購入上限
- suspended user Login拒否
- Payment失敗

重要なのはError Messageを確認するだけではなく、誤った状態へ遷移していないことも確認することです。

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

## Lesson 8: Accessibility

`@axe-core/playwright` を利用した自動Accessibility Testと、Keyboard操作などの確認を学びます。

自動Accessibility Scanだけでは完全なAccessibility保証にならない点も理解します。

## ハンズオン1: Cart Regression

スプレッドシートのCart Test Caseから、最低3件をPlaywrightへ実装します。

必須:

- 正常追加
- 在庫切れまたは購入上限
- 削除または数量変更

## ハンズオン2: Payment Failure

Payment拒否からRetry成功までを実装します。

## ハンズオン3: Mobile確認

作成したテストのうち1件をMobile Projectで実行し、Desktopとの差を記録します。

## ハンズオン4: 既存E2Eとの差分分析

`phase1-required.spec.ts` と自分の実装を比較し、次を記録します。

- 自分の方が単純な点
- 既存側で追加している検証
- 既存側の保守上気になる点
- 後で共通化したくなりそうな処理

この時点ではまだPOMへ変更しません。

## 確認問題

1. 各テストの開始前にResetする価値は何か。
2. UI表示だけでは不足するE2Eの例を挙げる。
3. Cross-role E2Eを巨大化しすぎると何が問題になるか。
4. DesktopでPassしてもMobile Testが必要な理由は何か。
5. Accessibility自動Scanだけで十分ではない理由は何か。

## 完了条件

- Playwright E2Eを5件以上実装している。
- Scenario / Resetを利用したテストを含む。
- 正常、異常または境界の両方を含む。
- PaymentまたはRole横断の状態遷移を1件以上扱っている。
- MobileまたはAccessibilityの追加観点を1件以上実行している。
