# 管理者在庫管理

## 目的・対象範囲

オペレーターおよび管理者が、SKU単位の在庫と在庫履歴を管理する際の仕様・規約を定義します。

## ビジネスルール

### BR-ADMININV-001 — 在庫はSKU単位の非負整数として調整する

在庫数0は `out_of_stock`、1〜5は `low_stock`、6以上は `available` として扱い、在庫数0を `low_stock` へ二重計上しません。

### BR-ADMININV-002 — すべての在庫変更を履歴と一緒に保存する

手動調整および決済成功時の購入による減算は、変更前後の値、理由、実行者、注文を含む履歴とともに、同一トランザクション内で保存します。

## UI・振る舞い契約

在庫一覧ではSKU単位の絞り込み、検索、並び替え機能を提供し、商品一覧における総在庫表示とは明確に境界を分離します。処理の失敗時に中途半端な部分更新を表示することはありません。

### SCREEN-ADMIN-INVENTORIES — 管理者在庫一覧

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- SKU単位の在庫数、ステータス分類、絞り込み、在庫調整、変更履歴を表示する。
- 0 / 1〜5 / 6以上の境界値判定とバージョン競合について明示する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | 在庫一覧とステータス分類を表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMININV-001`, `AC-ADMININV-001` |
| `stock-boundaries` | boundary | `operator, admin` | `default` | 0、1〜5、6以上をそれぞれ異なるステータスとして表示する。 | `required` | `web-desktop` | `-` | `BR-ADMININV-001`, `AC-ADMININV-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-INVENTORIES default web-desktop](../assets/screens/SCREEN-ADMIN-INVENTORIES/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-INVENTORIES/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-INVENTORIES default web-tablet](../assets/screens/SCREEN-ADMIN-INVENTORIES/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-INVENTORIES/default/web-tablet.webp)

##### `stock-boundaries`

###### Webデスクトップ

[![SCREEN-ADMIN-INVENTORIES stock-boundaries web-desktop](../assets/screens/SCREEN-ADMIN-INVENTORIES/stock-boundaries/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-INVENTORIES/stock-boundaries/web-desktop.webp)

## 受入基準

### 判定基準

#### AC-ADMININV-001 — 在庫状態を正しく分類する

関連ビジネスルール: `BR-ADMININV-001`

0、1、5、6の各境界値において、SKU一覧と商品概要の表示内容および件数が分類規約と一致します。

#### AC-ADMININV-002 — 在庫履歴をアトミックに保存する

関連ビジネスルール: `BR-ADMININV-002`

在庫調整または購入成功時に在庫数と履歴の内容が一致し、処理失敗時は双方が変更されず元の状態を維持します。

## 実行可能な正本ソース

- `src/application/use-cases/admin-operations-use-cases.ts`
- `src/domain/contracts/entities.ts`
- `src/infrastructure/database/dexie/`
- `app/admin/inventories.tsx`
