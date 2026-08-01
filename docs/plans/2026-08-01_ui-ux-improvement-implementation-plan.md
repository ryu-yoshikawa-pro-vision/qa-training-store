# qa-training-store UI・UX改善 実装プラン

## 1. 目的

PR #3の探索結果をもとに、確認されたUI・UX上の問題を同一の実装範囲で修正する。

単に表示を整えるのではなく、次を実現する。

- Guestの商品探索からLogin、Cart、Checkout、注文完了まで、ユーザーの操作意図が途切れない
- 商品、在庫、価格、Cart、Checkout、注文、Reviewなどの状態変化が画面上で理解できる
- 学習用アプリの説明とTest Account情報を、各操作画面の主目的を妨げない場所へ整理する
- Customer、Operator、Adminの各画面で、操作結果、制約、未保存状態、破壊的操作の影響が分かる
- DesktopとMobileで主要な情報と操作を見失わない
- 既存の正常系、Seed Scenario、Test API、固定Clock、決定的なテスト条件を壊さない

---

## 2. 実装方針

- すべての修正を同一の実装範囲で行う
- 実装開始時に現行コードと既存Testを確認し、既に解消済みの問題は重複修正しない
- 指摘IDごとに場当たり的な分岐を増やさず、同じ原因を持つ問題は共通処理で解消する
- 既存のApplication／Domain契約を利用できる場合は、Presentation側で情報を捨てずに表示する
- Presentation側だけでは正しく判定できない制約は、Application DTOへ表示用Capabilityを追加する
- 新しい依存関係と新しい状態管理Libraryは追加しない
- 自動保存、外部決済、実配送、Backendなど、今回の問題解決に不要な機能は追加しない
- Test Account、Scenario、会員Rankごとに個別の説明画面を増やさない
- 学習説明は1つのGuide画面と必要最小限のContextual Helpへ集約する
- 既存のProduct／SKU／Inventory分離、Checkout Stepper、Payment履歴、Review履歴、Admin Mobile境界表示は維持する
- 原因が再現できない問題へ推測修正、無限Polling、待機時間の増加を入れない

---

## 3. 実装順序

依存関係を考慮し、次の順番で実装する。

1. 共通の画面Focus、内部Return先検証、One-time Notice
2. Login、Guest Cart統合、Checkout再開・置換
3. Cart、商品詳細、配送先、Profile、Review
4. Guide、Home、Login、模擬環境説明、Empty State
5. Admin商品編集、注文状態、User Capability、Test Control
6. Accessibilityと`payment-processing`のFocused Test
7. Responsive確認と全体回帰

各段階でTypeScript Errorと関連Test失敗を残したまま次へ進まないこと。

---

# 4. 共通処理

## 4.1 Checkout画面の見出しFocusとScroll

対象：UX-001

CheckoutのRoute遷移後に前画面のScroll位置が残り、現在Stepや注文結果が画面外になる問題を解消する。

### 実装内容

- Web向けの小さな共通HookまたはComponentを追加する
- Focus対象は各画面の`h1`へ統一する
- `h1`へ`tabIndex={-1}`を設定する
- Data Load完了後、実Contentの`h1`がMountされた時点で1回実行する
- Loading PanelにはFocusを移さない
- Focus時に見出しがViewport内へ入るようScrollする
- Sticky Headerに隠れないよう、Focus対象へ`scroll-margin-top`相当を設定する
- 次の画面へ適用する
  - `/checkout/address`
  - `/checkout/payment`
  - `/checkout/confirm`
  - `/checkout/processing`
  - `/checkout/complete`
  - `/checkout/failed`
- Browser Backで既存Form入力やCheckout Sessionを破棄しない

### 検証条件

- `390×844`で各Stepへ進んだ直後、`document.activeElement`が現在画面の`h1`になる
- 見出しのBounding BoxがViewport内にある
- 注文完了直後に注文番号、合計、注文詳細への導線を確認できる
- Desktopで不必要な大幅Scrollが発生しない

---

## 4.2 内部Return先の検証

Login後の遷移先は、共通Helperで検証する。

### 許可するReturn先

- `/cart`
- `/checkout/address`
- `/checkout/payment`
- `/checkout/confirm`

Query StringやHashは引き継がず、Pathだけを扱う。

### 拒否する値

- `http://`または`https://`から始まる値
- `//`から始まる値
- Backslashを含む値
- `/login`、`/signup`、認証循環を起こすPath
- Allowlist外のPath
- 空文字、不正なEncoding、複数値

不正な場合はRole別の既定RouteへFallbackする。

### Test

- 許可Pathが保持される
- 外部URL、Protocol-relative URL、循環Path、未知Pathが拒否される
- Open Redirectが発生しない

---

## 4.3 One-time Notice

Login後のCart統合結果とScenario Reset結果を、遷移先で1回だけ表示するためのWeb向けHelperを追加する。

### 実装内容

- `sessionStorage`を使用する
- 保存可能な値をDiscriminated Unionで限定する
- 用途は次の2種類だけにする
  - `cart-merge`
  - `scenario-reset`
- JSON Parse失敗、型不一致、不正値は例外にせず削除する
- 読み出した通知は直後に削除し、Reloadで再表示しない
- Password、個人情報、任意URL、内部Error Stackは保存しない
- Native Buildを壊さないようWeb固有実装を分離する
- Global Notification Frameworkへ拡張しない

### Checkout再開通知の重複防止

`resumed`と`replaced`はAddress画面を開くたびに返る可能性があるため、Checkout Session ID単位で表示済みを記録する。

例：

```text
checkout:<sessionId>:resumed
checkout:<sessionId>:replaced
```

- 同じSessionでは1回だけ表示する
- Browser Reloadで再表示しない
- 新しいCheckout Sessionでは表示可能にする

---

# 5. Login、Cart統合、Checkout復帰

## 5.1 未LoginのCustomer専用RouteからLoginへ遷移する

対象：UX-005

Return先の付与はCart Buttonだけに限定せず、`RouteGuard`のCustomer Accessで処理する。

### 実装内容

- 未Loginで`customer` Routeへアクセスした場合、現在Pathを共通Helperで検証する
- 許可Pathの場合は次へRedirectする

```text
/login?returnTo=<許可された内部Path>
```

- 許可Pathでない場合は通常の`/login`へRedirectする
- `staff`、`admin`、`automation-admin`にはCustomer用Return先を付与しない

### Login成功後

- Customerは検証済みReturn先へ移動する
- Return先がないCustomerは`/`へ移動する
- Operator／AdminはReturn先を無視し`/admin`へ移動する
- Login失敗時は入力値とReturn先を保持する
- `/checkout/payment`または`/checkout/confirm`が現在Sessionで未解放の場合は、既存Checkout Guard／Load Errorにより前Stepへ戻せる状態を維持する

### 検証条件

- GuestがCartからCheckoutを選びLoginした後、元の購入導線へ戻る
- Checkout URLへの直接アクセスでもReturn先が保持される
- Staff AccountがCustomer Checkoutへ誤遷移しない
- 外部URLへRedirectできない

---

## 5.2 Guest Cart統合結果

対象：UX-006

既存の`CartMergeResult`を使用する。

### 調整ありの判定

```ts
const hasAdjustment = cartMerge.items.some(
  (item) => item.overflowQuantity > 0 || item.excludedReason !== null,
);
```

### 集計値

- 追加数量合計：`sum(items.addedQuantity)`
- 上限超過数量合計：`sum(items.overflowQuantity)`
- 追加商品数：`addedItemCount`
- 除外商品数：`excludedItemCount`

### 通知しない条件

- `cartMerge === null`
- `cartMerge.items.length === 0`
- 追加数量、上限超過数量、除外数がすべて0

### 遷移と表示

- 調整なし
  - 検証済みReturn先へ進む
  - 短いSuccess Noticeを1回表示する
- 調整あり
  - `/cart`へ移動する
  - Cart上部へ詳細Summaryを1回表示する
  - Cart内容を確認してからCheckoutを再開できるようにする

### 除外理由

内部Enumを直接表示せず、次へ変換する。

- `NOT_FOUND`：商品が見つからない
- `UNPUBLISHED`：商品が非公開
- `RANK_REQUIRED`：会員Rank条件を満たさない
- `INACTIVE`：SKUが無効
- `OUT_OF_STOCK`：在庫切れ

### 検証条件

`guest-cart-merge-overflow`で、統合前数量、追加数量、上限超過数量、最終数量、上限調整の理由を理解できる。

---

## 5.3 Checkoutの再開・置換

対象：UX-021

`checkout.start()`の`created | resumed | replaced`を使用する。

### 表示ルール

- `created`
  - Messageを表示しない
- `resumed`
  - 「前回の購入手続きを再開しました。配送先、支払方法、注文内容を確認してください。」
- `replaced`
  - 「カートが更新されたため、以前の購入手続きを置き換えました。最新の商品、数量、価格を確認してください。」

### 実装内容

- Address画面のStepperと`h1`の直後へ表示する
- Checkout Session ID単位で1回だけ表示する
- 内部Version番号は表示しない
- `replaced`後は最新Cartを元に商品、数量、金額が表示されることを確認する

### 検証条件

- `checkout-resume`で再開Messageが1回表示される
- `checkout-replaced`と`cart-version-invalidates-checkout`で置換Messageが1回表示される
- Reloadしても同じMessageを繰り返さない

---

# 6. Cartと商品詳細

## 6.1 価格変更同意とBlocking Issue

対象：UX-019

### 表示ルール

- `PRICE_CHANGED`以外のBlocking Issueが1件以上ある
  - 価格同意Panelは表示する
  - 同意ButtonはDisabledにする
  - 「購入できない商品を先に修正または削除してください。その後、現在価格へ同意できます。」と表示する
- Blocking Issueを解消し、`PRICE_CHANGED`だけになった
  - 同意ButtonをEnabledにする
- 同意成功後
  - Cartを再描画し、価格Warningを消す

### Error処理

- Conflict：最新Cartを再読込するActionを表示する
- Quantity／Stock／Rank等の既知Error：原因に対応する文言を表示する
- 原因が特定できない場合だけGeneric Errorを使用する

### 検証条件

- `cart-with-invalid-items`で最初に修正すべきItemが分かる
- 問題Itemを解消した後に価格同意できる
- 同じGeneric Errorを繰り返す状態を残さない

---

## 6.2 商品詳細の正確な在庫数

対象：UX-022

### 表示ルール

- 0点：`在庫切れ`
- 1〜5点：`残りN点`
- 6点以上：`在庫 N点`
- `purchaseLimit < stockQuantity`：`1回の購入上限はM点です`を追加
- `purchaseLimit >= stockQuantity`：購入上限の補足を表示しない

数量Selectの最大値は必ず次にする。

```text
min(stockQuantity, purchaseLimit)
```

### 実装内容

- Variant変更時に在庫数、購入上限、数量Selectを即時更新する
- 在庫と購入上限を同じ意味に見せない
- 商品一覧Cardには具体在庫数を追加しない
- Admin在庫変更後、再読込した商品詳細へ正しい値を反映する

### 検証条件

- `low-stock`、`out-of-stock`、通常在庫で表示ルールが一致する
- Variantごとの在庫差が分かる
- 在庫0のVariantは引き続き選択不能である

---

# 7. Customer Accountと配送先

## 7.1 Mobile Account Navigation

対象：UX-002

- `390px`と`320px`で横Scrollに依存しない3列Gridまたは折返しLayoutへ変更する
- `プロフィール`、`配送先`、`注文履歴`を常時表示する
- Touch Targetを44px以上維持する
- `aria-current="page"`を維持する
- DocumentとNavigation内に不要な横Overflowを発生させない

---

## 7.2 配送先Empty State

対象：UX-003

次の文言へ変更する。

```text
登録フォームから最初の配送先を登録してください。
```

新しい画面やLayoutは追加しない。

---

## 7.3 住所候補適用時の既存値保持

対象：UX-008

### 実装内容

- 郵便番号から取得した値は、空Fieldだけへ補完する
- 入力済みの`prefecture`、`city`、`addressLine1`は上書きしない
- 特に入力済み番地を消さない
- 候補がない場合は既存入力を変更しない
- 補完したField名を成功Messageで示す
- 入力済みFieldを保持した場合は、内容確認を促す
- 新規登録と既存配送先編集で同じ挙動にする
- FormはDirtyのまま維持する

### 検証条件

- 郵便番号と番地を入力後に住所候補を利用しても番地が残る
- 空の都道府県・市区町村だけが補完される
- 候補なしの場合に値が変わらない

---

## 7.4 Profileの会員情報

対象：UX-007

Profile上部へ次を表示する。

- 現在の会員Rank
- Account状態
- Rank Benefit
  - 一般会員：5,000円以上で送料無料
  - Gold：5%割引
  - Platinum：10%割引・送料無料
- GuideへのLink

内部Enumは表示せず、既存Label変換を利用する。

---

# 8. Reviewの対象と状態

対象：UX-010

## 8.1 Review Eligibility DTO

`ReviewEligibilityDto`へ次を追加する。

```ts
productName: string;
variationName: string | null;
optionValue: string | null;
orderNumber: string;
orderCreatedAt: string;
```

Review Use CaseでOrder Item、Order、Product Snapshotから取得し、Presentation側でRepositoryを直接参照しない。

Review Form上部へ次を表示する。

- 商品名
- `variationName`と`optionValue`
- 注文番号
- 注文日
- 既存Review状態

内部IDは主表示にしない。

## 8.2 注文詳細のReview状態

Customer用の注文商品表示DTOへ次を追加する。

```ts
reviewState:
  | "NOT_POSTED"
  | "PUBLISHED"
  | "HIDDEN"
  | "DELETED"
  | "NOT_ELIGIBLE";
```

Application層でReviewとOrder状態を結合して決定する。

### Action表示

- `NOT_POSTED`：`レビューを書く`
- `PUBLISHED`：`レビューを編集`
- `HIDDEN`：`非公開レビューを編集`
- `DELETED`：Buttonを表示せず`削除済み・再投稿できません`
- `NOT_ELIGIBLE`：Buttonを表示せず、配達完了後に投稿可能であることを表示する

### 検証条件

- 複数商品を含む注文でも対象を取り違えない
- Adminの公開状態とCustomer表示が一致する
- 削除済みReviewを再投稿できるように見せない

---

# 9. 学習Guideと情報配置

## 9.1 `/guide`

公開Routeの`/guide`を1画面追加する。

### 内容

- アプリの目的
- 実際の注文、決済、配送が行われないこと
- 実在する個人情報を入力しないこと
- Customer、Operator、Adminの違い
- 固定Test AccountとPassword
- 会員RankとBenefit
- Test Scenarioの概要
- Test Control Resetの影響
- 主要な確認フロー
  - 商品探索から注文
  - Payment失敗と再試行
  - Adminの商品・在庫・注文操作
  - Review投稿と公開状態変更

### 実装方針

- Account、Rank、Scenario情報は共通定義から生成する
- LoginやTest Controlへ同じ情報を重複Hardcodeしない
- HeaderまたはFooter、Login、Test Controlから移動できるようにする
- 長大な操作マニュアルにせず、RoleとScenarioを選ぶ入口として構成する

### BuildとRoleによるTest Control表示

- Automation Build
  - Test Controlの説明を表示する
- Production Build
  - Test ControlへのLinkを表示しない
  - Scenario機能は自動化環境で利用できる旨だけを記載する
- Guest／Customer／Operator
  - Admin専用Test Controlへ直接誘導しない
- AdminかつAutomation Build
  - Test Controlへの直接Linkを表示する

---

## 9.2 Login画面の固定Account一覧

- 常時展開されている固定Account一覧とPassword表示を削除する
- 次の短い案内とLinkだけを残す

```text
テスト用アカウントは学習ガイドで確認できます。
```

- Login Form、Error、Signup導線を主情報として維持する
- Test Account自体は削除しない

---

## 9.3 Home CTA

対象：UX-004

Secondary CTAをSessionとRoleに応じて変更する。

- Guest：`ログインして購入` → `/login`
- Customer：`マイページ` → `/account/profile`
- Operator／Admin：`管理画面へ` → `/admin`

Primary CTAの`商品を見る`は全Roleで維持する。

---

## 9.4 模擬環境説明

対象：UX-009

- Global Header：`学習用・実取引なし`の短い常時表示
- Guide：詳細説明
- Login／Signup：個人情報とTest Account利用の注意
- Checkout：実在住所・Card情報を入力しない注意
- Cart／商品詳細：同じ一般説明を繰り返さない
- Footer：GuideとLegalへの導線
- Homeの学習Panel：Guideへの簡潔な導線として残す

安全上必要な注意は削除せず、重複だけを減らす。

---

## 9.5 HomeのEmpty Catalog

対象：UX-018

- 公開商品が0件の場合、空の`おすすめ商品`と`新着商品`Sectionを表示しない
- 重複したEmpty Stateを複数表示せず、Home上で1つにまとめる
- 表示内容
  - 現在公開中の商品がない
  - 読込失敗ではない
  - Guideまたは商品一覧への導線
- Categoryが0件の場合も空Gridだけを表示しない
- 通常Catalogでは現在のHome構成を維持する

---

# 10. Admin商品編集

## 10.1 未保存変更の保護

対象：UX-011

### Dirty判定

- `ProductEditor`の初期値をSnapshotとして保持する
- 現在のProduct値、Variant値、Image選択、`removedVariantIds`を正規化して比較する
- Preview表示有無とMessageはDirty判定へ含めない
- 保存成功後は新しい初期値で再MountまたはSnapshotを更新し、Dirtyを解除する

### Router内遷移

対象：Sidebar、Breadcrumb、画面内Link、Browser Back。

- Expo Routerが利用するNavigationの離脱防止機構を使用する
- Dirty時だけ確認する
- Actionは次の2つに統一する
  - `変更を破棄して移動`
  - `編集に戻る`
- `編集に戻る`では入力を保持する
- `変更を破棄して移動`では遷移を続行する

### Browser離脱

対象：Reload、Tab Close、外部URL移動。

- Webの`beforeunload`を使用する
- Browser標準Dialogを使用し、独自文言が表示されることを前提にしない
- Dirtyでない場合は登録しない

### 明示的な破棄

`ContextualSaveBar`の破棄操作では次を初期状態へ戻す。

- Product値
- Variant値
- Image選択
- `removedVariantIds`
- Preview
- Form Message

### 対象外

- 自動保存
- Draftの永続化
- Product Editor以外へのGuard適用
- 新しいNavigation Libraryの追加

### 検証条件

- Sidebar、Breadcrumb、Browser Back、Reloadで警告される
- Cancel後に入力値が残る
- 保存済み状態では警告されない
- Previewを開いてもDirtyが解除されない

---

## 10.2 商品Preview

対象：UX-012

### 表示内容

- Main Image
- 商品名
- Short Description
- 保存後の初期状態
- 会員Rank制限
- Variant一覧の要約
- 最小〜最大価格
- 在庫状態
- `未保存の内容です`

### 実装方針

- Storefrontの商品詳細を完全複製しない
- 既存の`ProductImage`、`StatusBadge`、価格Formatterを再利用する
- Preview DTOへ不足する表示情報だけを追加する
- Databaseへ副作用を発生させない

---

# 11. Admin注文とUser管理

## 11.1 Shipment状態の同期

対象：UX-013

- 発送準備開始、発送、配送完了のMutation成功後に注文詳細を再取得する
- 見出し、注文Status Badge、配送欄、Action Buttonを同じ再取得結果から描画する
- 一部だけLocal Stateで先行更新しない
- 更新中は対象ActionをDisabledにする
- Success Messageは再取得完了後に表示する
- Conflict時は最新状態の再読込Actionを表示する

### 検証条件

- 発送準備開始直後に注文状態と配送欄が同期する
- Reload前後で状態が変わらない
- Customer注文詳細と矛盾しない

---

## 11.2 User Capability

対象：UX-015

Presentation側でAdmin人数を数えず、`UserAdminDto`へApplication層で判定したCapabilityを追加する。

```ts
interface UserAdminCapabilities {
  canChangeRole: boolean;
  canChangeAccountStatus: boolean;
  roleChangeRestriction:
    | "SELF"
    | "LAST_ACTIVE_ADMIN"
    | "WITHDRAWN"
    | null;
  accountStatusRestriction:
    | "SELF"
    | "LAST_ACTIVE_ADMIN"
    | "WITHDRAWN"
    | null;
}
```

`UserAdminDto`へ`capabilities`を追加する。

### 判定責務

- Application Use Caseが現在Actorと対象Userを考慮して判定する
- `LAST_ACTIVE_ADMIN`は、対象AdminをRole変更または利用停止するとActive Adminが0人になる場合
- PresentationはCapabilityを使ってDisabled状態と説明を描画する
- Mutation側の既存Domain制約は維持し、Capabilityだけに依存して保護しない

### 表示文言

- `SELF`：自分自身の管理役割または利用状態は変更できない
- `LAST_ACTIVE_ADMIN`：最後の管理者は変更できない。先に別の管理者を設定する
- `WITHDRAWN`：退会済みUserは読取専用

Disabled Controlと説明を`aria-describedby`で関連付ける。

---

# 12. Test Control

## 12.1 Scenario Metadata

対象：UX-016

既存Scenario一覧と同じ定義元で、各Scenarioへ次を持たせる。

- ID
- 表示名
- 目的
- 推奨Account
- 主な確認Route
- 初期Session状態
- 初期状態の短い説明

`PHASE_ONE_SCENARIOS`と説明定義を別々に保守せず、同じMetadataからScenario ID一覧と表示情報を生成する。

Test Controlでは選択中Scenarioだけを表示し、詳細はGuideへLinkする。

---

## 12.2 Scenario Reset確認

対象：UX-017

### 確認Dialog

既存Confirm Dialogを使用し、次を説明する。

- 現在のDatabaseが削除される
- Cart、Checkout、注文、商品、在庫、Review、入力途中の内容が選択Scenarioの初期状態へ戻る
- 現在のSessionは破棄され、選択Scenarioの初期Sessionへ置き換わる
- ScenarioによってはGuest状態、Customer Login済み状態、特定Role Login済み状態になる
- 操作は元に戻せない

「初期化後は必ず再Loginが必要」とは記載しない。

### Reset処理

- Reset中はButtonをDisabledにする
- 二重実行を防止する
- Reset失敗時はReloadせず、Test Control上でErrorを表示する
- Reset成功時は`scenario-reset` One-time Noticeを保存してからReloadする

### Reset後の通知

Login画面に限定せず、現在表示されるStorefront ShellまたはAdmin Shellの共通領域で表示する。

表示内容：

- 初期化したScenario名
- 適用された初期Session状態
- 推奨Account
- 主な確認Route

一時的なForbiddenを成功結果として扱わない。現在Roleで表示できないRouteにいる場合は、既存Guardに従って安全な画面へ移動し、その画面でNoticeを表示する。

---

# 13. Accessibility Focused Test

対象：UX-014

現行`StatusBadge`は文字列をDOMへ出しているため、Test失敗を確認する前に`aria-label`を追加しない。

### 対象

- 商品一覧の公開状態
- 注文一覧の注文状態
- Review一覧の公開状態
- User一覧のRole、Rank、Account状態
- 在庫一覧のSKU状態

### 判定

- `getByRole('cell', { name: ... })`等で取得できる
  - Production Markupは変更しない
  - Focused Testだけ追加する
- 取得できない
  - 空CellになるDOM原因を特定する
  - 状態TextをCell内のAccessible Textとして提供する
  - Decorative Dotは`aria-hidden`のまま維持する
  - 二重読み上げになる`aria-label`を追加しない

Testは既存の`e2e/web/accessibility.spec.ts`へ追加する。

---

# 14. `payment-processing`

対象：UX-020

Production CodeへPollingやTimeoutを追加する前に、通常のPlaywright E2Eで再現する。

## 14.1 再現手順

1. `payment-processing`へResetする
2. `regular@example.com`でLoginする
3. 注文一覧を開く
4. `支払い処理中`の注文を選ぶ
5. 注文詳細で次を5秒以内に確認する
   - `h1`
   - 注文番号
   - `支払い処理中`の状態
6. Loading Panelが消える
7. Console ErrorとPage Errorが0件
8. Browser BackとHomeへの移動が可能

探索時に使用した直接URLが特定できる場合は、同じ注文詳細URLへの直接アクセスも別Caseで確認する。

## 14.2 再現した場合の切り分け

1. App RuntimeがReadyにならない
2. Route Guardが待機し続ける
3. `getMyOrder()`が解決しない
4. Dexie QueryまたはTransactionがBlocked
5. Scenario Reset直後のSession参照が不整合
6. Playwright MCPだけで発生し通常E2Eでは再現しない

## 14.3 修正条件

- Promiseが解決しない：根本のQueryまたはTransactionを修正する
- Reset後のRuntime再初期化が停止する：Reset／Reload後の初期化処理を修正する
- 注文は取得できるが説明不足：注文詳細へ処理中状態と次のActionを表示する
- 通常E2Eで安定再現しない：Production Codeは変更せずFocused Testだけ残す

### 禁止事項

- 原因不明の無限Polling
- 一律30秒TimeoutでError化
- Paymentの強制成功・失敗
- Scenario固有Hardcode

---

# 15. Test実装とCI

## 15.1 Unit／Component／Integration

最低限、次を追加または更新する。

- Return先Allowlistと拒否条件
- Role別Login後遷移
- Cart Mergeの調整あり判定、集計、理由変換
- One-time Noticeの型検証と1回限りの読出し
- Checkoutの`created／resumed／replaced`表示済み判定
- 在庫数と購入上限の表示ルール
- 住所候補の空Fieldだけ補完
- Home CTAのRole別表示
- Review DTOとReview状態別Action
- Scenario Metadataの全ID対応
- User Capabilityの`SELF／LAST_ACTIVE_ADMIN／WITHDRAWN`
- Reset成功・失敗とNotice保存

## 15.2 Playwright E2Eの配置

### 新規Spec

```text
e2e/web/ui-ux-improvements.spec.ts
```

次を含める。

- GuestからLoginしてCheckout復帰
- Guest Cart Overflow
- Checkout再開・置換
- Invalid Cart
- 商品詳細の在庫数
- ProfileとReview状態
- GuideとRole別Home CTA
- 商品Formの未保存離脱
- Shipment状態同期
- User Capability表示
- Scenario Reset確認とReset後Notice
- `payment-processing`

### 既存Specへ追加

- Accessibility：`e2e/web/accessibility.spec.ts`
- Mobile Account Navigation、Checkout見出しFocus、注文完了Viewport：`e2e/web/mobile-boundary.spec.ts`
- Guideの主要Viewport Screenshot：`e2e/web/ui-review.spec.ts`

## 15.3 package.json

`test:e2e:chromium`で新規SpecがPR CI上でも実行されるようにする。

```json
"test:e2e:chromium": "playwright test e2e/web/phase1-required.spec.ts e2e/web/ui-ux-improvements.spec.ts --project=chromium"
```

Mobile固有Caseは、PR CIですでに実行される`mobile-boundary.spec.ts`へ追加する。

## 15.4 必須実行

```text
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run validate:image-manifest
pnpm run security:check
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
pnpm run test:contracts
pnpm run build:web
pnpm run test:e2e:chromium
pnpm run test:a11y
pnpm run test:e2e:mobile-boundary
```

`pnpm run verify`だけではPlaywright E2Eを実行しないため、E2Eを別途実行する。

---

# 16. Responsive確認

最低限、次のViewportで確認する。

- Desktop：`1440×1000`
- Tablet：`1024×900`
- Mobile：`390×844`
- Small Mobile：`320×700`

主要画面：

- Home
- Guide
- Login
- 商品詳細
- Cart
- Checkout各Step
- 注文完了
- Profile
- 配送先
- 注文詳細／Review
- Admin商品編集
- Test Control

Adminの管理操作は既存どおり1024px以上を前提とし、Mobileへ管理Table操作を新規実装しない。

---

# 17. 壊してはいけない既存動作

- 商品検索、Filter、Sort、Pagination
- Filter 0件時の解除導線
- Variantごとの価格、Sale、会員割引
- 在庫切れVariantの選択不能
- Cartの価格内訳、送料、会員割引
- Checkout Stepper
- Payment成功、利用拒否、残高不足、認証失敗
- Payment失敗後の再試行
- 注文完了時のCart消費
- Customer注文履歴のPayment／Order／Shipment分離
- Adminの商品、SKU、Inventory分離
- 在庫履歴とVersion管理
- 商品・ReviewのBulk Partial Failure表示
- Reviewの公開、非公開、再公開履歴
- Admin Mobileの1024px境界案内
- Test API、Seed Scenario、固定Clock、Payment Delay
- Scenarioごとの初期Session復元
- `default`Scenarioの決定的な初期状態

---

# 18. 完了条件

次をすべて満たした時点で実装完了とする。

- Login後に購入導線へ自然に復帰できる
- 外部URLへのOpen Redirectができない
- Cart統合結果とCheckout再開／置換結果が1回だけ表示される
- Checkout遷移後に現在画面の`h1`がFocusされ、重要情報がViewport内にある
- Invalid Cartで次のActionを判断できる
- 商品詳細で正確な在庫数と購入上限の違いが分かる
- 住所候補利用で入力済み値を失わない
- Profileで会員RankとAccount状態を確認できる
- Review対象商品、注文、現在状態を確認できる
- Login画面のTest Account情報がGuideへ整理されている
- Home CTAがRoleとLogin状態に一致する
- Empty Catalogを読込失敗と誤認しない
- 商品Formの未保存変更を誤って失わない
- 商品Previewで主要変更を保存前に判断できる
- Admin注文詳細の状態表示が同期する
- User操作不可理由がCapabilityと一致する
- Test ControlでScenario目的とReset影響が分かる
- Reset後にScenarioの初期Session状態を正しく案内する
- Status BadgeのAccessibilityをTestで確認している
- `payment-processing`は通常E2Eの再現結果に基づいて必要な修正だけを行っている
- 新規E2EがPR CIで実行される
- Desktop、Mobile、Small Mobileの主要Flowを確認している
- 既存正常系と既存Scenarioを壊していない
- Format、Lint、Typecheck、Unit／Integration／Repository／Component／Contract Test、Build、必要なPlaywright E2Eがすべて成功する

問題を隠すためにTestを弱めたり、待機時間だけを増やしたりしないこと。
