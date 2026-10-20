# 管理カタログ

## 目的・対象範囲

オペレーターおよび管理者が、商品集約（Product Aggregate）、カテゴリー、ブランド、画像アセット（Image Asset）、および公開状態を管理する際の仕様規約を定義します。

## ビジネスルール

### BR-ADMINCAT-001 — 商品の公開可否と状態遷移を検証する

公開するには、有効（active）なカテゴリー、有効なブランド、有効なSKU、画像、およびプライマリ画像が必須です。通常の商品集約の編集処理ではステータスを変更せず、専用の状態変更処理のみが状態遷移を実行します。

### BR-ADMINCAT-002 — 商品集約とアセット関連をトランザクションで更新する

商品、バリアント、画像関連、初期在庫履歴、およびレビューサマリーを同一トランザクション内で一貫性を保って保存し、商品編集処理によって既存在庫やリリース済みのアセットバイナリが損なわれないようにします。

## UI・振る舞い規約

オペレーターおよび管理者は未保存フォームのプレビューを確認できますが、プレビューによってデータベースへの書き込みは行われません。下書き（Draft）状態でのみ許可されるコードやSKUの変更と、公開後に可能となるSKUの追加や無効化の境界条件を定義します。

### SCREEN-ADMIN-DASHBOARD — 管理ダッシュボード

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- オペレーターおよび管理者が管理対象の概要と主要な管理動線を確認する。
- デスクトップ表示の要件を満たさないビューポートでは、管理操作UIの代わりに警告メッセージを表示する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | 管理概要とナビゲーションを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINCAT-001`, `AC-ADMINCAT-001` |
| `admin-mobile-warning` | responsive | `operator, admin` | `default` | 1024px未満では専用の警告メッセージを表示する。 | `required` | `web-mobile, web-small-mobile` | `-` | `BR-ADMINCAT-001`, `AC-ADMINCAT-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-DASHBOARD default web-desktop](../assets/screens/SCREEN-ADMIN-DASHBOARD/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-DASHBOARD/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-DASHBOARD default web-tablet](../assets/screens/SCREEN-ADMIN-DASHBOARD/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-DASHBOARD/default/web-tablet.webp)

##### `admin-mobile-warning`

###### Webモバイル

[![SCREEN-ADMIN-DASHBOARD admin-mobile-warning web-mobile](../assets/screens/SCREEN-ADMIN-DASHBOARD/admin-mobile-warning/web-mobile.webp)](../assets/screens/SCREEN-ADMIN-DASHBOARD/admin-mobile-warning/web-mobile.webp)

###### Web小型モバイル

[![SCREEN-ADMIN-DASHBOARD admin-mobile-warning web-small-mobile](../assets/screens/SCREEN-ADMIN-DASHBOARD/admin-mobile-warning/web-small-mobile.webp)](../assets/screens/SCREEN-ADMIN-DASHBOARD/admin-mobile-warning/web-small-mobile.webp)

### SCREEN-ADMIN-PRODUCTS — 商品管理

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- 商品、公開状態、フィルター条件、一括操作の結果を表示する。
- 商品新規登録および商品詳細への管理動線を提供する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | 商品一覧と管理アクションを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINCAT-001`, `AC-ADMINCAT-001` |
| `many-products` | domain | `operator, admin` | `many-products` | 多数の商品一覧とフィルターを表示する。 | `required` | `web-desktop` | `-` | `BR-ADMINCAT-001`, `AC-ADMINCAT-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-PRODUCTS default web-desktop](../assets/screens/SCREEN-ADMIN-PRODUCTS/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-PRODUCTS/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-PRODUCTS default web-tablet](../assets/screens/SCREEN-ADMIN-PRODUCTS/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-PRODUCTS/default/web-tablet.webp)

##### `many-products`

###### Webデスクトップ

[![SCREEN-ADMIN-PRODUCTS many-products web-desktop](../assets/screens/SCREEN-ADMIN-PRODUCTS/many-products/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-PRODUCTS/many-products/web-desktop.webp)

### SCREEN-ADMIN-PRODUCT-NEW — 商品新規登録

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- 商品集約の新規入力、バリデーション、プレビュー機能を提供する。
- 保存前のプレビュー表示中はデータベースへ書き込まれないことを、画面表示上でも明確に区別する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | 新規商品登録フォームを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINCAT-001`, `AC-ADMINCAT-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-PRODUCT-NEW default web-desktop](../assets/screens/SCREEN-ADMIN-PRODUCT-NEW/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-PRODUCT-NEW/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-PRODUCT-NEW default web-tablet](../assets/screens/SCREEN-ADMIN-PRODUCT-NEW/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-PRODUCT-NEW/default/web-tablet.webp)

### SCREEN-ADMIN-PRODUCT-DETAIL — 商品詳細・編集

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- 既存商品の集約、バリアント、画像、在庫、および公開状態を編集する。
- 未保存の変更（Dirty）、プレビュー、販売終了（Discontinue）、削除不可（Delete blocked）などの確認ダイアログやステータスを表示する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | 商品編集フォームと現在のステータスを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINCAT-001`, `AC-ADMINCAT-001` |
| `discontinue-confirm` | conflict | `operator, admin` | `default` | 販売終了の確認ダイアログを表示する。 | `required` | `web-desktop` | `-` | `BR-ADMINCAT-001`, `AC-ADMINCAT-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-PRODUCT-DETAIL default web-desktop](../assets/screens/SCREEN-ADMIN-PRODUCT-DETAIL/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-PRODUCT-DETAIL/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-PRODUCT-DETAIL default web-tablet](../assets/screens/SCREEN-ADMIN-PRODUCT-DETAIL/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-PRODUCT-DETAIL/default/web-tablet.webp)

##### `discontinue-confirm`

###### Webデスクトップ

[![SCREEN-ADMIN-PRODUCT-DETAIL discontinue-confirm web-desktop](../assets/screens/SCREEN-ADMIN-PRODUCT-DETAIL/discontinue-confirm/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-PRODUCT-DETAIL/discontinue-confirm/web-desktop.webp)

### SCREEN-ADMIN-CATEGORIES — カテゴリー管理

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- カテゴリーの一覧表示、新規作成、編集、およびバリデーション機能を提供する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | カテゴリー一覧と管理フォームを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINCAT-002`, `AC-ADMINCAT-002` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-CATEGORIES default web-desktop](../assets/screens/SCREEN-ADMIN-CATEGORIES/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-CATEGORIES/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-CATEGORIES default web-tablet](../assets/screens/SCREEN-ADMIN-CATEGORIES/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-CATEGORIES/default/web-tablet.webp)

### SCREEN-ADMIN-BRANDS — ブランド管理

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- ブランドの一覧表示、新規作成、編集、およびバリデーション機能を提供する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | ブランド一覧と管理フォームを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINCAT-002`, `AC-ADMINCAT-002` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-BRANDS default web-desktop](../assets/screens/SCREEN-ADMIN-BRANDS/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-BRANDS/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-BRANDS default web-tablet](../assets/screens/SCREEN-ADMIN-BRANDS/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-BRANDS/default/web-tablet.webp)

## 受入基準

### 基準

#### AC-ADMINCAT-001 — 不完全な商品を公開しない

関連ビジネスルール: `BR-ADMINCAT-001`

必須となるカテゴリー、ブランド、SKU、画像、プライマリ画像の条件を満たさない商品は公開されず、許可された状態遷移のみが正常に完了すること。

#### AC-ADMINCAT-002 — プレビューと保存の責務を分離する

関連ビジネスルール: `BR-ADMINCAT-002`

プレビュー、保存、初期在庫、レビューサマリー、アセット関連の各処理がトランザクション規約を満たし、プレビューの実行のみではデータベースが変更されないこと。

## 実行可能な正本ソース

- `src/application/use-cases/admin-product-use-cases.ts`
- `src/application/use-cases/admin-master-use-cases.ts`
- `src/domain/policies/state-transitions.ts`
- `src/infrastructure/image-assets/`
- `app/admin/products/`, `app/admin/categories/`, `app/admin/brands.tsx`
