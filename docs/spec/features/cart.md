# カート（Cart）

## 目的・対象範囲（Purpose / Scope）

ゲストおよび会員（Customer）のカートに対する商品追加、数量変更、削除、状態の再検証、ならびにログイン時のゲストカート統合仕様を定義します。なお、注文データへの変換処理はチェックアウト・注文機能（Checkout/Orders Feature）側で定義します。

## ビジネスルール（Business Rules）

### BR-CART-001 — カート内の数量は「在庫数」「購入上限数」「99」のうち最小値を超えない

同一SKUの商品は合算して判定します。上限を超える指定があった場合は数量の自動補正を行わずに操作全体を拒否し、変更前の数量を維持します。数量を0に指定した場合は該当明細をカートから削除します。

### BR-CART-002 — ログイン時は会員カートを基準としてゲストカートを統合する

SKU単位で数量を合算します。許容上限を超える数量分、非公開商品、会員ランク不足の商品、無効なSKU、在庫0の商品は統合対象から除外し、その理由を明示します。統合元のゲストカートは破棄済み（abandoned）状態へ遷移します。

### BR-CART-003 — カート画面の表示時およびチェックアウト開始時に商品状態を再検証する

商品の公開状態、購入権限、価格、在庫数を再検証します。価格変更が発生している場合は、会員（顧客）の承認が得られるまでチェックアウト手続きへ進めません。

## UI・振る舞い規約（UI / Behavior Contract）

カートはゲストまたは会員のみが利用できます。カート明細には商品情報、画像、現在価格、数量、上限数、問題点、合計金額、空状態（Empty State）を表示します。また、更新処理の実行中は同一カートに対する変更操作（Mutation）の二重実行を防止します。

### SCREEN-STOREFRONT-CART — カート

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### 機能一覧（Functions）

- ゲストおよび会員カートの明細、数量、現在価格、問題が発生している理由、合計金額を表示する。
- 在庫数、購入上限数、公開状態、価格を再検証し、問題がある明細の修正や削除を行えるようにする。

#### 主要なUI状態（Important UI States）

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `guest, customer` | `default` | カート明細と数量の変更操作を表示する。 | `required` | `web-desktop, android` | `-` | `BR-CART-001`, `AC-CART-001` |
| `empty` | empty | `guest, customer` | `default` | カートが空である旨と商品を探すための導線を表示する。 | `required` | `web-desktop` | `-` | `BR-CART-001` |
| `invalid-items` | error | `guest, customer` | `cart-with-invalid-items` | 購入できない理由と修正用のアクションを表示する。 | `required` | `web-desktop` | `-` | `BR-CART-003`, `AC-CART-003` |

#### 画面リファレンス（Visual References）

##### `default`

###### Web Desktop

[![SCREEN-STOREFRONT-CART default web-desktop](../assets/screens/SCREEN-STOREFRONT-CART/default/web-desktop.webp)](../assets/screens/SCREEN-STOREFRONT-CART/default/web-desktop.webp)

###### Android — 正式ビジュアルリファレンス（Canonical Visual Reference）

[![SCREEN-STOREFRONT-CART default android](../assets/screens/SCREEN-STOREFRONT-CART/default/android.webp)](../assets/screens/SCREEN-STOREFRONT-CART/default/android.webp)

##### `empty`

###### Web Desktop

[![SCREEN-STOREFRONT-CART empty web-desktop](../assets/screens/SCREEN-STOREFRONT-CART/empty/web-desktop.webp)](../assets/screens/SCREEN-STOREFRONT-CART/empty/web-desktop.webp)

##### `invalid-items`

###### Web Desktop

[![SCREEN-STOREFRONT-CART invalid-items web-desktop](../assets/screens/SCREEN-STOREFRONT-CART/invalid-items/web-desktop.webp)](../assets/screens/SCREEN-STOREFRONT-CART/invalid-items/web-desktop.webp)

## 受入基準（Acceptance Criteria）

### 基準一覧（Criteria）

#### AC-CART-001 — 上限超過時の操作を拒否すること

関連ビジネスルール: `BR-CART-001`

在庫数、購入上限数、99の各境界値において、上限を超える指定があった場合に数量が自動補正されず、現在の数量が維持されること。

#### AC-CART-002 — ゲストカートを会員カートへ統合できること

関連ビジネスルール: `BR-CART-002`

ゲストカートの明細と会員カートの明細の統合結果、除外理由、カートバージョン（Cart Version）、およびゲストカートの状態が仕様どおり一致すること。

#### AC-CART-003 — 問題のある明細が含まれる場合はチェックアウトへ進めないこと

関連ビジネスルール: `BR-CART-003`

価格変更、在庫切れ、公開停止、会員ランク不足が正しく再検証され、ユーザーによる承認または明細の修正が行われない限りチェックアウトへ進めないこと。

## 実行可能カノニカルソース（Executable Canonical Sources）

- `src/application/use-cases/cart-use-cases.ts`
- `src/domain/services/cart.ts`
- `src/domain/policies/permissions.ts`
- `src/seeds/scenarios.ts`
- `app/cart.tsx`, `app/cart.native.tsx`