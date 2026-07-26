# UI Content Dictionary

本ファイルは利用者へ表示する日本語文言とStatus名の正本です。Domain値、Route名、Repository名を画面へ直接表示しません。

## 1. Brand・共通

| Key | 表示 |
|---|---|
| brand.storeName | Scenario Shop |
| brand.adminName | Scenario Shop Admin |
| environment.testMode | テスト環境 |
| notice.training | このサイトはテスト自動化学習用です。実際の注文・決済・配送は行われません。 |
| notice.personalData | 実在する氏名・住所・電話番号・カード情報を入力しないでください。 |

## 2. Navigation

| Key | 表示 |
|---|---|
| nav.home | ホーム |
| nav.products | 商品 |
| nav.search | 検索 |
| nav.cart | カート |
| nav.orders | 注文履歴 |
| nav.account | アカウント |
| nav.admin | 管理画面 |
| nav.overview | 概要 |
| nav.categories | カテゴリ |
| nav.brands | ブランド |
| nav.inventory | 在庫 |
| nav.reviews | レビュー |
| nav.users | ユーザー |
| nav.testControl | テスト制御 |

## 3. Role・Rank・Account Status

| Domain値 | 表示 |
|---|---|
| customer | 顧客 |
| operator | 運用担当者 |
| admin | 管理者 |
| regular | 一般会員 |
| gold | ゴールド会員 |
| platinum | プラチナ会員 |
| active | 利用中 |
| suspended | 利用停止中 |
| withdrawn | 退会済み |

## 4. Product Status

| Domain値 | 表示 |
|---|---|
| draft | 下書き |
| published | 公開中 |
| unpublished | 非公開 |
| discontinued | 販売終了 |

## 5. Order・Payment・Shipment Status

| Domain値 | 表示 |
|---|---|
| pending_payment | 支払い待ち |
| payment_failed | 支払い失敗 |
| paid | 支払い済み |
| preparing | 発送準備中 |
| shipped | 発送済み |
| delivered | 配送完了 |
| processing | 処理中 |
| succeeded | 支払い完了 |
| failed | 支払い失敗 |
| pending | 発送準備前 |

## 6. Review Status

| Domain値 | 表示 |
|---|---|
| published | 公開中 |
| hidden | 非公開 |
| deleted | 削除済み |

## 7. Primary Action

| Key | 表示 |
|---|---|
| action.viewProducts | 商品を見る |
| action.search | 検索する |
| action.addToCart | カートに追加 |
| action.checkout | 購入手続きへ |
| action.confirmOrder | 注文を確定する（{total}） |
| action.retryPayment | 支払いを再試行 |
| action.startPreparation | 発送準備を開始 |
| action.ship | 発送する |
| action.completeDelivery | 配送完了にする |
| action.writeReview | レビューを書く |
| action.createProduct | 商品を登録 |
| action.deleteProduct | 下書き商品を削除 |
| action.addVariant | SKUを追加 |
| action.deactivateVariant | SKUを無効にする |
| action.selectImageAsset | 画像を選択 |
| action.adjustInventory | 在庫を調整 |
| action.save | 保存 |
| action.discard | 変更を破棄 |
| action.clearFilters | 条件をすべて解除 |
| action.showResults | {count}件の商品を表示 |

## 8. Search・Filter

| Key | 表示 |
|---|---|
| search.placeholder | 商品名、カテゴリ、ブランドで検索 |
| search.resultTitle | 「{query}」の検索結果 |
| search.resultCount | {count}件の商品 |
| search.noResultsTitle | 条件に一致する商品がありません |
| search.noResultsBody | 検索語を変えるか、絞り込み条件を解除してください。 |
| filter.category | カテゴリ |
| filter.brand | ブランド |
| filter.price | 価格 |
| filter.inStock | 在庫あり |
| filter.onSale | セール中 |
| filter.rating | 評価 |
| sort.newest | 新着順 |
| sort.priceAsc | 価格が安い順 |
| sort.priceDesc | 価格が高い順 |
| sort.ratingDesc | 評価が高い順 |

## 9. Price・Shipping

| Key | 表示 |
|---|---|
| price.taxIncluded | 税込 |
| price.memberPrice | 会員価格 |
| price.discount | {rate}%OFF |
| shipping.free | 送料無料 |
| shipping.remaining | あと{amount}で送料無料 |
| shipping.standard | 送料 {amount} |

## 10. Form

| Key | 表示 |
|---|---|
| form.required | 必須 |
| form.optional | 任意 |
| form.errorSummaryTitle | 入力内容を確認してください |
| form.phoneHelp | 配送に関する連絡に使用します。 |
| form.buildingToggle | 建物名・部屋番号を入力 |
| form.postalSuggestion | 郵便番号から住所候補が見つかりました。入力しますか？ |
| form.unsaved | 保存していない変更があります。 |

## 10.1 商品管理・画像

| Key | 表示 |
|---|---|
| product.priceRange | {min}〜{max} |
| product.imageCatalogHelp | この画面では登録済み画像を選択します。新しい画像はGitHub Repositoryへ追加し、再デプロイすると選択できます。 |
| product.imageInactive | この画像は現在、新規選択の対象外です。 |
| product.stockReadOnly | 既存SKUの在庫は在庫調整画面で変更してください。 |
| product.deleteConfirm | 下書き商品「{name}」と関連するSKU・画像設定を削除します。GitHub上の画像ファイルは削除されません。 |
| cart.mergeSummary | ゲストカートを統合しました。追加{added}件、上限超過{overflow}件、除外{excluded}件。 |
| checkout.resumed | 前回の購入手続きを再開しました。 |

## 11. Empty State

| Key | 表示 |
|---|---|
| empty.cartTitle | カートに商品がありません |
| empty.cartBody | 商品を探してカートに追加してください。 |
| empty.ordersTitle | 注文履歴がありません |
| empty.adminResourceTitle | まだ{resource}がありません |
| empty.filteredTitle | 条件に一致する{resource}がありません |

## 12. Message Style

- Titleは結果を簡潔に断定する: 「商品をカートに追加しました」。
- Bodyは必要な場合だけ次の操作を示す。
- 「成功しました」「エラーです」だけで終わらせない。
- 英語のDomain値や技術語を利用者向けMessageへ出さない。
- Account、Order、Payment、Reviewは画面では原則「アカウント」「注文」「支払い」「レビュー」と表記する。

## 13. Checkout再確認

| Key | 文言 |
|---|---|
| checkout.membershipChanged | 会員情報が変更されたため、注文内容を再確認してください。 |
