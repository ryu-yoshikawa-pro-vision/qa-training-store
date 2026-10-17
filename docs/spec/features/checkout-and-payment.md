# Checkout and Payment

## Purpose / Scope

顧客（Customer）の配送先住所、チェックアウトセッション、カートバージョン、価格確認、ローカルモック決済、および処理中（Processing）／完了（Complete）／失敗（Failed）の境界を定義します。

## Business Rules

### BR-CHECKOUT-001 — CustomerごとのCheckout Sessionを再開または置換する

同一のユーザー、カート、カートバージョンに紐づくアクティブなセッションは再開し、カートやバージョンが異なる場合は旧セッションを破棄（abandoned）扱いにして新しいセッションを作成します。なお、セッションは24時間で有効期限切れ（expired）となります。

### BR-CHECKOUT-002 — Cart Versionと価格をOrder作成直前に再検証する

カートバージョンの不一致または価格の差異がある場合、注文（Order）および決済（Payment）は作成せずカート画面へ戻します。URLへ直接アクセスした場合は、未完了のステップへ戻します。

### BR-CHECKOUT-003 — Mock Payment結果をOrder/Inventoryと一貫して確定する

TEST-SUCCESSの場合のみ在庫を再検証し、決済完了（Payment succeeded）、注文支払い済み（Order paid）、在庫の減算を確定します。明確に失敗した場合はpayment_failedとし、在庫は変更しません。処理中（processing）の状態では再試行およびキャンセルを禁止します。

## UI / Behavior Contract

配送先一覧（Addresses）、配送先選択（Address）、決済（Payment）、確認（Confirm）、処理中（Processing）、完了（Complete）、失敗（Failed）の各画面では、注文の所有権と決済状態を検証します。決済遅延（Payment Delay）はテストコントロールから変更可能ですが、外部通信は行いません。

### SCREEN-CHECKOUT-ADDRESSES — Addresses

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 顧客自身の配送先を一覧表示し、追加・編集・選択へと進める。
- 未登録時にチェックアウトへ進むための登録導線を表示する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 配送先一覧と管理アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |
| `empty` | empty | `customer` | `default` | 未登録状態の案内と追加フォームへの導線を表示する。 | `required` | `web-desktop` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-CHECKOUT-ADDRESSES default web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-CHECKOUT-ADDRESSES default android](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/android.webp)

##### `empty`

###### Web Desktop

[![SCREEN-CHECKOUT-ADDRESSES empty web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/empty/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/empty/web-desktop.webp)

### SCREEN-CHECKOUT-ADDRESS — Checkout Address

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- チェックアウトセッションで使用する配送先を選択し、決済画面へ進める。
- 再開（resume）、置換（replaced）、古い状態（stale）に関する通知と、次に行うアクションを表示する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 配送先選択と次ステップへのアクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |
| `resume-notice` | transient | `customer` | `checkout-resume` | 再開されたチェックアウトセッションであることを一度だけ通知する。 | `required` | `web-desktop` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-CHECKOUT-ADDRESS default web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-CHECKOUT-ADDRESS default android](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/android.webp)

##### `resume-notice`

###### Web Desktop

[![SCREEN-CHECKOUT-ADDRESS resume-notice web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESS/resume-notice/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESS/resume-notice/web-desktop.webp)

### SCREEN-CHECKOUT-PAYMENT — Checkout Payment

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- モック決済オプションを選択し、確認画面へ進める。
- 不完全なセッションやカートバージョンの不一致を安全に処理する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 決済オプションと確認アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-002`, `AC-CHECKOUT-002` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-CHECKOUT-PAYMENT default web-desktop](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-CHECKOUT-PAYMENT default android](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/android.webp)

### SCREEN-CHECKOUT-CONFIRM — Checkout Confirm

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 注文内容、配送先、価格、決済方法を最終確認する。
- カート情報が古い（stale）場合や価格の不一致（price conflict）が発生している場合は注文を確定せず、修正のための導線を表示する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 注文内容と確定アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-002`, `AC-CHECKOUT-002` |
| `stale-cart` | conflict | `customer` | `cart-version-invalidates-checkout` | 不一致の内容を説明し、カートまたは該当するステップへ戻す。 | `required` | `web-desktop` | `-` | `BR-CHECKOUT-002`, `AC-CHECKOUT-002` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-CHECKOUT-CONFIRM default web-desktop](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-CHECKOUT-CONFIRM default android](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/android.webp)

##### `stale-cart`

###### Web Desktop

[![SCREEN-CHECKOUT-CONFIRM stale-cart web-desktop](../assets/screens/SCREEN-CHECKOUT-CONFIRM/stale-cart/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-CONFIRM/stale-cart/web-desktop.webp)

### SCREEN-CHECKOUT-PROCESSING — Checkout Processing

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 決済処理中（processing）の状態を表示し、再読み込み（Reload）や再開（resume）の導線を表示する。
- 処理中の二重確定、再試行（Retry）、キャンセルを禁止する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `payment-processing` | 決済処理中の状態と待機アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-003`, `AC-CHECKOUT-003` |

#### Visual References

##### `default`

###### Web Desktop — Canonical Visual Reference

[![SCREEN-CHECKOUT-PROCESSING default web-desktop](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-CHECKOUT-PROCESSING default android](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/android.webp)

### SCREEN-CHECKOUT-COMPLETE — Checkout Complete

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 決済完了、注文番号、および注文履歴への導線を表示する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `default` | 注文完了と注文確認アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-003`, `AC-CHECKOUT-003` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-CHECKOUT-COMPLETE default web-desktop](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-CHECKOUT-COMPLETE default android](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/android.webp)

### SCREEN-CHECKOUT-FAILED — Checkout Failed

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 決済拒否の通知、再試行、カート画面や注文内容確認への導線を表示する。
- 決済失敗時に、在庫や注文を完了・成功状態へ変更しない。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `payment-declined` | 失敗理由と再試行アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-003`, `AC-CHECKOUT-003` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-CHECKOUT-FAILED default web-desktop](../assets/screens/SCREEN-CHECKOUT-FAILED/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-FAILED/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-CHECKOUT-FAILED default android](../assets/screens/SCREEN-CHECKOUT-FAILED/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-FAILED/default/android.webp)

## Acceptance Criteria

### Criteria

#### AC-CHECKOUT-001 — Sessionを再開・置換する

Related BR: `BR-CHECKOUT-001`

同一のカートおよびバージョンにおける再開、異なるバージョンでの置換、有効期限切れ時の処理、ならびにログアウト後の再ログインによる復帰が確認できること。

#### AC-CHECKOUT-002 — Stale Cartを確定しない

Related BR: `BR-CHECKOUT-002`

カートバージョンまたは価格が変更された状態において、注文や決済が作成されず、必要なステップまたはカートへ戻ること。

#### AC-CHECKOUT-003 — Payment結果を一度だけ確定する

Related BR: `BR-CHECKOUT-003`

成功、明確な拒否、処理中（processing）からの再開、最終的な在庫不足のいずれのケースにおいても、注文（Order）、決済（Payment）、在庫（Inventory）、注文履歴（History）の整合性が保たれること。

## Executable Canonical Sources

- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/infrastructure/payment/mock-payment-gateway.ts`
- `src/domain/policies/state-transitions.ts`
- `src/test-controls/`
- `app/checkout/`, `app/checkout/*.native.tsx`