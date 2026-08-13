# Screen Catalog Review Repair iteration 4

日付: 2026-08-13（JST）

## 対象

PR #24の追加レビュー指摘に対し、Android Capture Caseのseed／role／setup／ready意味論をCurrent Repositoryへ再baselineした。

## Root cause

- `regular-member` resetはcustomer Sessionと会員Cartを復元するが、既存のcustomer login setupを重複実行していた。
- Paymentの画面rootと支払操作要素はCheckout Sessionが無効でも描画され得るため、root testIDだけではnormal Payment stateを証明できなかった。
- Confirmはconfirmationロード前にrootが存在せず、既存submit testIDはloaded confirmationの後だけ存在する。
- Product ListとCategoryは同じcatalog rootを共有し、headingをready条件へ含めていなかった。

## 修正

- `customer-seeded-session` setupを追加し、`regular-member`のprofile／addresses／orders系Android Targetをseed stateへ接続した。
- Checkout subflowはcustomer loginを削除し、seeded customer role／Cart、session開始、住所保存、Payment session marker、Confirm submitを順にassertする。
- Payment controlsへ、valid `state.session`時だけ存在するsemantic testIDを付け、Payment ready matcherへ接続した。Confirmは既存`native-checkout-confirm-submit`、Addressはactive session markerをrootと併せて要求する。
- Category ready matcherをProduct Listから分離し、Shell navigationの同名ラベルを誤って拾わない専用heading testIDを検証する。Representative contract testで25 Android Targetの件数と主要caseのscenario／role／setup／readyを固定した。

## Validation boundary

- 対象contract tests、Native component test、registry／spec validationはPASS。
- API34／`google_apis`／`x86_64`／`pixel_2`の実測capture／promotionは今回実行していない。Physical API30はcanonical inputではない。
- Android canonical Target 25件はblockedのまま、Structural ValidationはPASS、Final Visual DoDはBLOCKEDのまま維持する。
