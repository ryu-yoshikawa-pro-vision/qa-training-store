# 注文

## 目的・対象範囲

注文のスナップショット保持、カスタマー向け表示、オペレーターや管理者による準備・発送・配送完了処理、ならびに注文と配送の状態整合性について定義します。

## ビジネスルール

### BR-ORDER-001 — 注文は作成時点の購入情報をスナップショット保存する

商品、SKU、価格、ランク、配送先、画像、注文明細番号を作成時点で保存し、その後に商品やユーザー情報が変更されても過去の注文履歴は変更しません。

### BR-ORDER-002 — 注文と配送は許可された順序に従い同一トランザクションで更新する

paid → preparing → shipped → delivered の順序を遵守し、発送および配送完了の処理では、注文と配送を同一トランザクション内で更新します。

## UI・振る舞い契約

カスタマーは注文番号、合計金額、配送先概要、支払い、配送、タイムライン、および次に行うべきアクションを確認できます。オペレーターや管理者はカスタマーとしての購入操作権限を持たず、管理対象となる注文の許可されたステータス遷移のみを実行できます。

### SCREEN-ORDERS-LIST — 注文一覧

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- カスタマー自身の注文番号、合計金額、支払い、配送、タイムラインを一覧表示する。
- 空状態、処理中、失敗をそれぞれ個別のステータス表示として扱う。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 注文一覧とステータスを表示する。 | `required` | `web-desktop, android` | `-` | `BR-ORDER-001`, `AC-ORDER-001` |
| `empty` | empty | `customer` | `orders-empty` | 注文が存在しない旨とストアフロントへの導線を表示する。 | `required` | `web-desktop` | `-` | `BR-ORDER-001`, `AC-ORDER-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ORDERS-LIST default web-desktop](../assets/screens/SCREEN-ORDERS-LIST/default/web-desktop.webp)](../assets/screens/SCREEN-ORDERS-LIST/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-ORDERS-LIST default android](../assets/screens/SCREEN-ORDERS-LIST/default/android.webp)](../assets/screens/SCREEN-ORDERS-LIST/default/android.webp)

##### `empty`

###### Webデスクトップ

[![SCREEN-ORDERS-LIST empty web-desktop](../assets/screens/SCREEN-ORDERS-LIST/empty/web-desktop.webp)](../assets/screens/SCREEN-ORDERS-LIST/empty/web-desktop.webp)

### SCREEN-ORDERS-DETAIL — 注文詳細

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- 注文スナップショット、支払い、配送、タイムライン、レビュー投稿可否を表示する。
- カスタマー本人の注文のみを表示し、その後に商品情報が変更されてもスナップショットの内容は変更しない。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 注文スナップショットと配送状態を表示する。 | `required` | `web-desktop, android` | `-` | `BR-ORDER-001`, `AC-ORDER-001` |
| `reviewable` | domain | `customer` | `reviewable-orders` | 配達完了となった商品のレビュー投稿導線を表示する。 | `required` | `web-desktop` | `-` | `BR-ORDER-001`, `AC-ORDER-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ORDERS-DETAIL default web-desktop](../assets/screens/SCREEN-ORDERS-DETAIL/default/web-desktop.webp)](../assets/screens/SCREEN-ORDERS-DETAIL/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-ORDERS-DETAIL default android](../assets/screens/SCREEN-ORDERS-DETAIL/default/android.webp)](../assets/screens/SCREEN-ORDERS-DETAIL/default/android.webp)

##### `reviewable`

###### Webデスクトップ

[![SCREEN-ORDERS-DETAIL reviewable web-desktop](../assets/screens/SCREEN-ORDERS-DETAIL/reviewable/web-desktop.webp)](../assets/screens/SCREEN-ORDERS-DETAIL/reviewable/web-desktop.webp)

## 受入基準

### 判定基準

#### AC-ORDER-001 — 注文履歴をスナップショットとして表示する

関連ビジネスルール: `BR-ORDER-001`

商品、価格、ランク、配送先住所を後から変更しても、注文詳細のスナップショットおよび明細行の表示順は保持され、変更されません。

#### AC-ORDER-002 — 配送ステータス遷移を飛び越さない

関連ビジネスルール: `BR-ORDER-002`

paid から直接 shipped へ進めることはできず、注文と配送のステータスは preparing、shipped、delivered の各段階で常に一致します。

## 実行可能な正本ソース

- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/application/use-cases/admin-operations-use-cases.ts`
- `src/domain/policies/state-transitions.ts`
- `src/seeds/default-dataset.ts`
- `app/orders/`, `app/admin/orders/`
