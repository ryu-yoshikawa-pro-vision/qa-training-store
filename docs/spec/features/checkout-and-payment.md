# Checkout and Payment

## Purpose / Scope

CustomerのAddress、Checkout Session、Cart Version、価格確認、Local Mock Payment、Processing/Complete/FailedのBoundaryを定義します。

## Business Rules

### BR-CHECKOUT-001 — CustomerごとのCheckout Sessionを再開または置換する

同じUser、Cart、Cart Versionのactive Sessionは再開し、異なるCart/Versionなら旧Sessionをabandonedにして新しいSessionを作ります。Sessionは24時間でexpiredです。

### BR-CHECKOUT-002 — Cart Versionと価格をOrder作成直前に再検証する

不一致または価格差異があればOrder/Paymentを作らずCartへ戻します。直接URLは不足Stepへ戻します。

### BR-CHECKOUT-003 — Mock Payment結果をOrder/Inventoryと一貫して確定する

TEST-SUCCESSだけが在庫を再検証してPayment succeeded、Order paid、在庫減算を確定します。明確な失敗はpayment_failedとし、在庫を変更しません。processing中は再試行とCancelを禁止します。

## UI / Behavior Contract

Address、Payment、Confirm、Processing、Complete、Failedの各画面はOrder所有権とPayment状態を検証します。Payment DelayはTest Controlで変更できますが、外部通信は行いません。

## Acceptance Criteria

### Criteria

#### AC-CHECKOUT-001 — Sessionを再開・置換する

Related BR: `BR-CHECKOUT-001`

同一Cart/Versionの再開、異なるVersionの置換、期限切れ、Logout後の再Login復帰が確認できます。

#### AC-CHECKOUT-002 — Stale Cartを確定しない

Related BR: `BR-CHECKOUT-002`

Cart Versionまたは価格が変わった状態で、Order/Paymentが作成されず、必要なStepまたはCartへ戻ります。

#### AC-CHECKOUT-003 — Payment結果を一度だけ確定する

Related BR: `BR-CHECKOUT-003`

成功、明確な拒否、processing再開、最終在庫不足で、Order、Payment、Inventory、Historyの整合が保たれます。

## Executable Canonical Sources

- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/infrastructure/payment/mock-payment-gateway.ts`
- `src/domain/policies/state-transitions.ts`
- `src/test-controls/`
- `app/checkout/`, `app/checkout/*.native.tsx`
