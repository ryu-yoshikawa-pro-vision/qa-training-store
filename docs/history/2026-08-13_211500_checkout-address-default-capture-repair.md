# Checkout Address default capture repair

日付: 2026-08-13（JST）

## Finding

`SCREEN-CHECKOUT-ADDRESS/default/android` は、setup subflowで`/checkout/address`を開いてCheckout Sessionを開始した後、共通capture flowでも同じrouteを開いていました。これにより、default stateが`started`ではなく`resumed`としてreadyを通過する可能性がありました。

## Repair

- Address default Android Targetを`customer-seeded-session`へ変更した。
- `regular-member` resetがcustomer sessionとactive Cartをseedすることを再確認した。
- `regular-member`のdefault datasetには、current active Cartに紐づくactive Checkout Sessionがないことをcontract testで固定した。
- Addressの共通capture flowによる一度のroute navigationでCheckoutを開始し、既存のsession-ready条件を満たす構成にした。
- Payment／Confirmの専用setupと、Category専用ready matcherは維持した。

API34 canonical captureは今回実行しておらず、Android 25 targetはblockedのまま維持する。
