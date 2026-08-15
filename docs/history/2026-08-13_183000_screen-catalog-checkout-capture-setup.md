# Screen Catalog Checkout Capture Setup

## 判断

AndroidのCheckout Payment／Confirm Targetは、`regular-member` scenarioとcustomer roleを持つだけではcapture前提を満たさない。Native CheckoutのPayment／Confirm画面はactive Checkout Sessionのunlocked stepを要求するため、login後に直接deep linkしても正しい画面を保証できない。

## 実装

- Registryへ`customer-checkout-address`、`customer-checkout-payment`、`customer-checkout-confirm`を追加した。
- setup planへ`checkoutStep`を追加し、既存のcustomer loginとNative Checkoutのstable testID操作を小さなMaestro subflowへ接続した。
- subflowはまずseed済みCart itemをassertし、`describe-case`から`native_checkout_step`を出力し、Native CIは`CHECKOUT_STEP`としてsubflowへ渡す。workflowへscreenごとの操作分岐は複製していない。
- Address／Payment／Confirm Targetを対応するsetup IDへrebaselineした。Capture前のgeneric ready assertionとscreenshot順序は維持する。

## 検証境界

Maestro 2.8.0のsyntaxとcontract testで、setup metadataとstep-specific操作を検証する。API34 canonical Emulatorがこのworktreeで利用できない限り、physical API30の画像はcanonicalへ昇格せず、Android TargetのblockedとFinal Visual DoD BLOCKEDを維持する。
