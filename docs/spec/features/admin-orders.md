# 管理者注文

## 目的・対象範囲

オペレーターおよび管理者が、注文を準備中、発送済み、配送完了へと進行させるための管理契約を定義します。

## ビジネスルール

### BR-ADMINORD-001 — 注文と配送情報を同じ状態順で進める

「paid → preparing」「preparing → shipped」「shipped → delivered」の遷移のみを許可し、対応する配送情報も同一トランザクションで更新します。

## UI・振る舞い契約

注文一覧および注文詳細では、顧客スナップショット、現在の状態、次のアクション、注文アクションバージョン、配送情報を表示します。古いバージョンでの操作は競合として拒否します。

### SCREEN-ADMIN-ORDERS — 管理者注文一覧

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- 注文一覧、決済ステータス、配送ステータス、フィルターを表示する。
- 注文詳細のバージョン付きアクションへ進める。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `orders-phase1-statuses` | 複数ステータスの注文一覧を表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINORD-001`, `AC-ADMINORD-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-ORDERS default web-desktop](../assets/screens/SCREEN-ADMIN-ORDERS/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-ORDERS/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-ORDERS default web-tablet](../assets/screens/SCREEN-ADMIN-ORDERS/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-ORDERS/default/web-tablet.webp)

### SCREEN-ADMIN-ORDER-DETAIL — 管理者注文詳細

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- 顧客スナップショット、注文・配送ステータス、次のアクション、バージョンを表示する。
- 許可された状態遷移のみを実行する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `orders-phase1-statuses` | 注文詳細と次のアクションを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINORD-001`, `AC-ADMINORD-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-ORDER-DETAIL default web-desktop](../assets/screens/SCREEN-ADMIN-ORDER-DETAIL/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-ORDER-DETAIL/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-ORDER-DETAIL default web-tablet](../assets/screens/SCREEN-ADMIN-ORDER-DETAIL/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-ORDER-DETAIL/default/web-tablet.webp)

## 受入基準

### 基準

#### AC-ADMINORD-001 — 配送操作をバージョン付きで実行する

関連ビジネスルール: `BR-ADMINORD-001`

準備、発送、配送完了が正しい順序とバージョンに従って実行され、注文のみ、または配送情報のみが単独で更新される不整合な状態を発生させません。

## 実行可能な正本ソース

- `src/application/use-cases/admin-operations-use-cases.ts`
- `src/domain/policies/state-transitions.ts`
- `app/admin/orders/`
