# チェックアウトと決済

## 目的と対象範囲

顧客の配送先住所、チェックアウトセッション、カートバージョン、価格確認、ローカルモック決済、および処理中／完了／失敗の境界を定義します。

## 業務ルール

### BR-CHECKOUT-001 — 顧客ごとのチェックアウトセッションを再開または置換する

同一のユーザー、カート、カートバージョンに紐づく有効なセッションは再開し、カートやバージョンが異なる場合は旧セッションを破棄扱いにして新しいセッションを作成します。なお、セッションは24時間で有効期限切れとなります。

### BR-CHECKOUT-002 — カートバージョンと価格を注文作成直前に再検証する

カートバージョンの不一致または価格の差異がある場合、注文および決済は作成せずカート画面へ戻します。URLへ直接アクセスした場合は、未完了のステップへ戻します。

### BR-CHECKOUT-003 — モック決済結果を注文・在庫と一貫して確定する

TEST-SUCCESSの場合のみ在庫を再検証し、決済完了、注文支払い済み、在庫の減算を確定します。明確に失敗した場合はpayment_failedとし、在庫は変更しません。処理中の状態では再試行およびキャンセルを禁止します。

## UI・振る舞い規約

配送先一覧、配送先選択、決済、確認、処理中、完了、失敗の各画面では、注文の所有権と決済状態を検証します。決済遅延はテストコントロールから変更可能ですが、外部通信は行いません。

### SCREEN-CHECKOUT-ADDRESSES — 配送先一覧

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能

- 顧客自身の配送先を一覧表示し、追加・編集・既定の配送先設定を行う。
- 未登録時にチェックアウトへ進むための登録導線を表示する。

#### 重要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 配送先一覧と管理アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |
| `empty` | empty | `customer` | `default` | 未登録状態の案内と追加フォームへの導線を表示する。 | `required` | `web-desktop` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-CHECKOUT-ADDRESSES default web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-CHECKOUT-ADDRESSES default android](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/default/android.webp)

##### `empty`

###### Webデスクトップ

[![SCREEN-CHECKOUT-ADDRESSES empty web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/empty/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESSES/empty/web-desktop.webp)

### SCREEN-CHECKOUT-ADDRESS — 配送先選択

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能

- チェックアウトセッションで使用する配送先を選択し、決済画面へ進める。
- 再開、置換、古い状態に関する通知と、次に行うアクションを表示する。

#### 重要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 配送先選択と次ステップへのアクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |
| `resume-notice` | transient | `customer` | `checkout-resume` | 再開されたチェックアウトセッションであることを一度だけ通知する。 | `required` | `web-desktop` | `-` | `BR-CHECKOUT-001`, `AC-CHECKOUT-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-CHECKOUT-ADDRESS default web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-CHECKOUT-ADDRESS default android](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESS/default/android.webp)

##### `resume-notice`

###### Webデスクトップ

[![SCREEN-CHECKOUT-ADDRESS resume-notice web-desktop](../assets/screens/SCREEN-CHECKOUT-ADDRESS/resume-notice/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-ADDRESS/resume-notice/web-desktop.webp)

### SCREEN-CHECKOUT-PAYMENT — 決済

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能

- モック決済オプションを選択し、確認画面へ進める。
- 不完全なセッションやカートバージョンの不一致を安全に処理する。

#### 重要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 決済オプションと確認アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-002`, `AC-CHECKOUT-002` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-CHECKOUT-PAYMENT default web-desktop](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-CHECKOUT-PAYMENT default android](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-PAYMENT/default/android.webp)

### SCREEN-CHECKOUT-CONFIRM — 注文確認

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能

- 注文内容、配送先、価格、決済方法を最終確認する。
- カート情報が古い場合や価格の不一致が発生している場合は注文を確定せず、修正のための導線を表示する。

#### 重要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | 注文内容と確定アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-002`, `AC-CHECKOUT-002` |
| `stale-cart` | conflict | `customer` | `cart-version-invalidates-checkout` | 不一致の内容を説明し、カートまたは該当するステップへ戻す。 | `required` | `web-desktop` | `-` | `BR-CHECKOUT-002`, `AC-CHECKOUT-002` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-CHECKOUT-CONFIRM default web-desktop](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-CHECKOUT-CONFIRM default android](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-CONFIRM/default/android.webp)

##### `stale-cart`

###### Webデスクトップ

[![SCREEN-CHECKOUT-CONFIRM stale-cart web-desktop](../assets/screens/SCREEN-CHECKOUT-CONFIRM/stale-cart/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-CONFIRM/stale-cart/web-desktop.webp)

### SCREEN-CHECKOUT-PROCESSING — 処理中

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能

- 決済処理中の状態を表示し、再読み込みや再開の導線を表示する。
- 処理中の二重確定、再試行、キャンセルを禁止する。

#### 重要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `payment-processing` | 決済処理中の状態と待機アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-003`, `AC-CHECKOUT-003` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ — 正本画面リファレンス

[![SCREEN-CHECKOUT-PROCESSING default web-desktop](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-CHECKOUT-PROCESSING default android](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-PROCESSING/default/android.webp)

### SCREEN-CHECKOUT-COMPLETE — 完了

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能

- 決済完了、注文番号、および注文履歴への導線を表示する。

#### 重要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `default` | 注文完了と注文確認アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-003`, `AC-CHECKOUT-003` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-CHECKOUT-COMPLETE default web-desktop](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-CHECKOUT-COMPLETE default android](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-COMPLETE/default/android.webp)

### SCREEN-CHECKOUT-FAILED — 失敗

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能

- 決済拒否の通知、再試行、カート画面や注文内容確認への導線を表示する。
- 決済失敗時に、在庫や注文を完了・成功状態へ変更しない。

#### 重要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `payment-declined` | 失敗理由と再試行アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-CHECKOUT-003`, `AC-CHECKOUT-003` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-CHECKOUT-FAILED default web-desktop](../assets/screens/SCREEN-CHECKOUT-FAILED/default/web-desktop.webp)](../assets/screens/SCREEN-CHECKOUT-FAILED/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-CHECKOUT-FAILED default android](../assets/screens/SCREEN-CHECKOUT-FAILED/default/android.webp)](../assets/screens/SCREEN-CHECKOUT-FAILED/default/android.webp)

## 受入基準

### 判定基準

#### AC-CHECKOUT-001 — セッションを再開・置換する

関連BR: `BR-CHECKOUT-001`

同一のカートおよびバージョンにおける再開、異なるバージョンでの置換、有効期限切れ時の処理、ならびにログアウト後の再ログインによる復帰が確認できること。

#### AC-CHECKOUT-002 — 古いカート情報を確定しない

関連BR: `BR-CHECKOUT-002`

カートバージョンまたは価格が変更された状態において、注文や決済が作成されず、必要なステップまたはカートへ戻ること。

#### AC-CHECKOUT-003 — 決済結果を一度だけ確定する

関連BR: `BR-CHECKOUT-003`

成功、明確な拒否、処理中（`processing`）からの再開、最終的な在庫不足のいずれのケースにおいても、注文、決済、在庫、注文履歴の整合性が保たれること。

## 実行可能な正本ソース

- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/infrastructure/payment/mock-payment-gateway.ts`
- `src/domain/policies/state-transitions.ts`
- `src/test-controls/`
- `app/checkout/`, `app/checkout/*.native.tsx`

## 配送先入力の再開・置換時の扱い

- 同じ顧客・カート・カートバージョンで有効なチェックアウトセッションを再開した場合は、保存済みの配送先入力を保持する。Webでは保存された配送先スナップショットに一致する本人の登録済み配送先を選択状態に復元する。一致する配送先が変更・削除されていた場合は既定の配送先へ無断で切り替えず、再選択を求める。
- Nativeではセッションに保存された配送先スナップショットを入力欄へ復元する。
- カートの変更・セッション期限切れで置換した場合は、新しいセッションの住所・決済方法は未設定とする。WebとNativeは新規開始・再開・置換を区別して案内する。以前のセッションを使った住所更新や注文確定は拒否する。
- Webは本人の登録済み配送先を選択するUIである一方、Nativeは登録済み配送先の呼び出しに加え直接入力も可能である。直接入力を製品仕様として許容するか、登録済み配送先を必須に統一するかは未決であり、この差異について受入判定を保留する。

- Nativeのセッション再開時、未開始・期限切れ・カートバージョン変更の場合は新しいチェックアウトの開始を試みるが、ストレージ読み取り失敗など予期しないエラーでは新Sessionを作らず、エラーを表示する。

## 支払方法選択と確認画面への遷移

- 顧客は配送先を保存した有効なCheckout Sessionで、`TEST-SUCCESS`、`TEST-DECLINED`、`TEST-INSUFFICIENT`、`TEST-AUTH-FAILED`の4種類からモック決済方法を選ぶ。Use Case境界でもこれ以外の決済コードを拒否し、セッションを変更しない。
- 本人・期限・カートバージョン・セッションの期待バージョン・保存済み配送先が有効な場合にのみ、選択した決済方法をSessionへ保存し、`unlockedStep=confirm`、`version+1`に更新する。保存成功後にのみWeb/Nativeで`/checkout/confirm`へ遷移する。
- 確認画面から支払方法の選択画面へ戻った場合は、Checkout Sessionに保存されている決済方法をWeb・Nativeの両画面で再選択する。Sessionに決済方法が未保存のときのみ`TEST-SUCCESS`を初期選択とする。保存済みの失敗決済コードを無断で成功決済へ切り替えない。
- 配送先ステップが未完了、またはカートバージョンが一致しない状態で決済画面を直接参照した場合は、支払方法の確認アクションを実行できず、Sessionの決済方法・バージョン・ステップは更新しない。
- 保存失敗時は画面に留まりエラーを表示する。選択・保存段階では注文・決済・在庫を変更しない。実際の決済処理は注文確認後の別操作である。
## 注文確認と確定前の再検証

- 注文確認画面では、本人のCheckout Sessionから生成した商品名・SKU選択肢・数量・明細額、配送先、選択済みの支払方法を表示する。商品小計・会員割引・送料・合計金額は`CheckoutConfirmationDto`からWeb/Nativeの両方に表示する。現行の`calculateOrderTotals`は税額を独立した明細として提供しないため、別の税額表示を前提としない。
- `getConfirmation`と`beginOrder`は確認済みの画面でも毎回本人のSession・Cart version・追加時と現在の商品の有効単価を検証する。Cart versionが変更されていれば`CART_VERSION_CHANGED`、承諾していない価格変更は`PRICE_CHANGED`として拒否し、注文・決済・在庫を更新しない。
- 確認画面の読込時または確定操作時にCart version/価格の不一致が発生した場合は、Web/Nativeともカートを確認する導線を提示する。未完了の購入Stepでは必要な前のStepへ戻れるようにする。既に取得した古い確認DTOだけを根拠に注文を作成しない。
