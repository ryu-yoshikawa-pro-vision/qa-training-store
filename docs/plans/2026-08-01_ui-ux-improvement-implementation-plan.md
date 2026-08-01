# qa-training-store UI・UX改善 実装プラン

## 1. 目的

PR #3の探索結果をもとに、確認されたUI・UX上の問題を同一の実装範囲で修正する。

単なる見た目の調整ではなく、次を実現する。

- Guestの商品探索からLogin、Cart、Checkout、注文完了まで操作意図が途切れない
- 商品、在庫、価格、Cart、Checkout、注文、Reviewの状態変化を画面上で理解できる
- 学習用アプリの説明とTest Account情報を、各操作画面の主目的を妨げない場所へ整理する
- Customer、Operator、Adminの各画面で、操作結果、制約、未保存状態、破壊的操作の影響が分かる
- Desktop、Tablet、Mobile、Small Mobileで主要な情報と操作を見失わない
- 既存の正常系、Seed Scenario、Test API、固定Clock、決定的なテスト条件を壊さない

---

## 2. 実装方針

- すべての修正を同一の実装範囲で行う
- 実装開始時に現行コードと既存Testを確認し、既に解消済みの問題は重複修正しない
- 指摘IDごとに場当たり的な分岐を増やさず、同じ原因を持つ問題は共通処理で解消する
- 既存のApplication／Domain契約を利用できる場合は、Presentation側で情報を捨てずに表示する
- 表示要件を満たす情報が既存DTOにない場合だけ、用途を限定したDTOを追加する
- 新しい依存関係と新しい状態管理Libraryは追加しない
- 自動保存、外部決済、実配送、Backendなど、今回の問題解決に不要な機能は追加しない
- Test Account、Scenario、会員Rankごとに個別の説明画面を増やさない
- 学習説明は1つのGuide画面と必要最小限のContextual Helpへ集約する
- 既存のProduct／SKU／Inventory分離、Checkout Stepper、Payment履歴、Review履歴、Admin Mobile境界表示は維持する
- 原因が再現できない問題へ、推測修正、無限Polling、待機時間の増加を入れない
- UI上で到達しない状態のためだけに、事前Capability DTOや重複Queryを追加しない
- User操作制約は既存Domain／Application側のMutation防御を維持する
- 文言、Rank Benefit、Scenario、Test Accountは、既存定数または今回追加する共通定義から生成し、画面ごとに重複Hardcodeしない

---

## 3. 実装順序

依存関係を考慮し、次の順番で実装する。

1. 共通の見出しFocus、内部Return先検証、One-time Notice
2. Login、Guest Cart統合、Checkout再開・置換
3. Cart、商品詳細、配送先、Profile、Review
4. Guide、Home、Login、模擬環境説明、Empty State
5. Admin商品編集、商品Preview、注文状態、User制約表示、Test Control
6. Accessibilityと`payment-processing`のFocused Test
7. Cross-role、Responsive、全体回帰

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
- Focus対象へ`scroll-margin-top`相当を設定し、Sticky Headerに隠れないようにする
- HookはFocus開始条件を引数で受け取れるようにし、各画面へ重複実装しない
- Focus処理は対象画面ごとに次のタイミングで1回実行する
  - `/checkout/address`：データ読込後、実Contentの`h1`がMountされた時点
  - `/checkout/payment`：データ読込後、実Contentの`h1`がMountされた時点
  - `/checkout/confirm`：データ読込後、実Contentの`h1`がMountされた時点
  - `/checkout/processing`：処理中画面の`h1`がMountされた時点
  - `/checkout/complete`：注文詳細読込後、実Contentの`h1`がMountされた時点
  - `/checkout/failed`：注文詳細読込後、実Contentの`h1`がMountされた時点
- Loading PanelにはFocusを移さない
- Browser BackでForm入力やCheckout Sessionを破棄しない

### 検証条件

- `390×844`で各Stepへ進んだ直後、`document.activeElement`が現在画面の`h1`になる
- 見出しのBounding BoxがViewport内にある
- 注文完了直後に注文番号、合計、注文詳細への導線を確認できる
- Desktopで不必要な大幅Scrollが発生しない
- Processing画面でも処理中見出しへFocusされる

---

## 4.2 内部Return先の検証

Login後の遷移先は共通Helperで検証する。

### 許可するReturn先

- `/cart`
- `/checkout/address`
- `/checkout/payment`
- `/checkout/confirm`

Query StringとHashは引き継がず、Pathだけを扱う。

### 拒否する値

- `http://`または`https://`から始まる値
- `//`から始まる値
- Backslashを含む値
- `/login`、`/signup`など認証循環を起こすPath
- Allowlist外のPath
- 空文字
- 不正なEncoding
- 複数値

不正な場合はRole別の既定RouteへFallbackする。

### Test

- 許可Pathが保持される
- 外部URL、Protocol-relative URL、循環Path、未知Pathが拒否される
- Open Redirectが発生しない

---

## 4.3 One-time Notice

Login後のCart統合結果とScenario Reset結果を、遷移先で1回だけ表示するためのWeb向けHelperを追加する。

### 保存形式

- `sessionStorage`を使用する
- 保存可能な値をDiscriminated Unionで限定する
- 用途は次の2種類だけにする
  - `cart-merge`
  - `scenario-reset`
- JSON Parse失敗、型不一致、不正値は例外にせず削除する
- Password、個人情報、任意URL、内部Error Stackは保存しない
- Native Buildを壊さないようWeb固有実装を分離する
- Global Notification FrameworkやEvent Busへ拡張しない

### 表示と消費

- Noticeの読出し、型検証、消費はStorefront Shell／Admin Shellへ重複実装しない
- `AppFrame`がNotice Stateを所有する
- `AppFrame`は`usePathname()`でPath変更を検知し、初回Mount時とPath変更時に未消費Noticeを読み出す
- 読み出したNoticeはReact Stateへ保持する
- 正常にStateへ取り込んだ直後に`sessionStorage`から削除する
- Shell切替やGuard Redirectが発生しても、同一Page Load内でNoticeを失わない
- `AppFrame`は現在選択したShellの`children`先頭へ共通Notice Componentを差し込む
- 表示後にReloadしても同じNoticeを再表示しない
- 同じPathで再Renderしただけでは再消費しない

### Path別表示

- `/cart`で`cart-merge`を受け取った場合：商品別の詳細Summaryを表示する
- CheckoutまたはHomeで`cart-merge`を受け取った場合：短いSuccess Noticeを表示する
- `scenario-reset`：遷移先がStorefront／Adminのどちらでも同じ初期化結果を表示する

### Checkout再開通知の重複防止

`resumed`と`replaced`はAddress画面を開くたびに返る可能性があるため、Checkout Session ID単位で表示済みを記録する。

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

- Login Use Caseの実際の戻り値を使用し、成功した場合だけ遷移する
- Customerは検証済みReturn先へ移動する
- Return先がないCustomerは`/`へ移動する
- Operator／AdminはReturn先を無視し`/admin`へ移動する
- Login失敗時は入力値とReturn先を保持する
- Cart Merge Noticeは保存してから`router.replace()`する
- `/checkout/payment`または`/checkout/confirm`が未解放の場合は、既存Checkout Guard／Load Errorで前Stepへ戻す

### 検証条件

- GuestがCartからCheckoutを選びLoginした後、購入導線へ復帰する
- Checkout URLへの直接アクセスでもReturn先が保持される
- Staff AccountがCustomer Checkoutへ誤遷移しない
- 外部URLへRedirectできない
- Login失敗時にHomeへ遷移しない

---

## 5.2 Guest Cart統合結果

対象：UX-006

既存のCart Merge処理を利用し、結果表示に必要な範囲だけDTOを拡張する。

### DTO

```ts
interface CartMergeItemResult {
  variantId: string;
  productName: string | null;
  optionValue: string | null;
  guestQuantity: number;
  previousUserQuantity: number;
  addedQuantity: number;
  overflowQuantity: number;
  finalQuantity: number;
  excludedReason:
    | "NOT_FOUND"
    | "UNPUBLISHED"
    | "RANK_REQUIRED"
    | "INACTIVE"
    | "OUT_OF_STOCK"
    | null;
}
```

- `NOT_FOUND`では`productName`を`null`とし、画面では`利用できない商品`と表示する
- Presentation側でRepositoryを再参照しない
- Merge時に判定済みの値を結果へ含める

### 数量の定義

- `guestQuantity`：Guest Cartに存在した数量
- `previousUserQuantity`：Login前からUser Cartに存在した数量。存在しない場合は0
- `addedQuantity`：実際にUser Cartへ追加できた数量
- `overflowQuantity`：Guest数量のうち追加できなかった数量
- `finalQuantity`：統合処理後のUser Cart数量
- 完全除外時は次にする
  - `addedQuantity = 0`
  - `overflowQuantity = guestQuantity`
  - `finalQuantity = previousUserQuantity`

### 調整ありの判定

```ts
const hasAdjustment = cartMerge.items.some(
  (item) => item.overflowQuantity > 0 || item.excludedReason !== null,
);
```

### 集計値

- 追加できた商品数：`addedQuantity > 0`のItem数
- 数量調整が発生した商品数：`overflowQuantity > 0 && excludedReason === null`のItem数
- 完全に除外された商品数：`excludedReason !== null`のItem数
- 追加数量合計：`sum(items.addedQuantity)`
- 上限超過数量合計：`sum(items.overflowQuantity)`

既存の`excludedItemCount`を「完全に除外された商品数」として表示しない。既存Fieldを維持する場合も、表示上はItem配列から正しい値を再集計する。

### 通知しない条件

- `cartMerge === null`
- `cartMerge.items.length === 0`
- 追加数量、上限超過数量、完全除外数がすべて0

### 遷移と表示

- 調整なし
  - 検証済みReturn先へ進む
  - 短いSuccess Noticeを1回表示する
- 調整あり
  - `/cart`へ移動する
  - Cart上部へ詳細Summaryを1回表示する
  - Cart内容を確認してからCheckoutを再開できるようにする

### 除外理由

- `NOT_FOUND`：商品が見つからない
- `UNPUBLISHED`：商品が非公開
- `RANK_REQUIRED`：会員Rank条件を満たさない
- `INACTIVE`：SKUが無効
- `OUT_OF_STOCK`：在庫切れ

内部Enumは直接表示しない。

### 検証条件

`guest-cart-merge-overflow`で、商品ごとに次を確認できる。

- Guest側数量
- Login前のUser Cart数量
- 追加数量
- 上限超過数量
- 統合後数量
- 調整理由

---

## 5.3 Checkoutの再開・置換

対象：UX-021

`checkout.start()`の`created | resumed | replaced`を使用する。

### 表示ルール

- `created`：Messageを表示しない
- `resumed`：`前回の購入手続きを再開しました。配送先、支払方法、注文内容を確認してください。`
- `replaced`：`カートが更新されたため、以前の購入手続きを置き換えました。最新の商品、数量、価格を確認してください。`

### 実装内容

- Address画面のStepperと`h1`の直後へ表示する
- Checkout Session ID単位で1回だけ表示する
- 内部Version番号は表示しない
- `replaced`後は最新Cartを元に商品、数量、金額を表示する

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
  - `購入できない商品を先に修正または削除してください。その後、現在価格へ同意できます。`と表示する
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

数量Selectの最大値は次にする。

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

- `390px`と`320px`の両方で3列Gridへ変更する

```css
grid-template-columns: repeat(3, minmax(0, 1fr));
```

- `プロフィール`、`配送先`、`注文履歴`を常時表示する
- Labelは必要に応じて折り返す
- 各項目の最小高さを44px以上にする
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

郵便番号から候補を取得できた場合は次のとおり更新する。

- `prefecture`：候補値へ更新する
- `city`：候補値へ更新する
- `addressLine1`
  - 空欄なら候補値を設定する
  - 入力済みなら既存値を保持する
- 候補がない場合は一切変更しない
- 入力済み`addressLine1`を保持した場合は次を表示する
  - `番地は入力済みの内容を保持しました。郵便番号と住所の組み合わせを確認してください。`
- 新規登録と既存配送先編集で同じ挙動にする
- FormはDirtyのまま維持する

### 検証条件

- 郵便番号と番地を入力後に住所候補を利用しても番地が残る
- 郵便番号を変更すると都道府県と市区町村が新しい候補へ更新される
- 候補なしの場合に値が変わらない

---

## 7.4 Profileの会員情報

対象：UX-007

Profile上部へ次を表示する。

- 現在の会員Rank
- Account状態
- Rank Benefit
- GuideへのLink

Rank Benefitは価格計算の定数・関数と共通の定義から生成する。

- 一般会員：5,000円以上で送料無料
- Gold：5%割引
- Platinum：10%割引・送料無料

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
orderCreatedAt: IsoDateTime;
```

- Review Use CaseでOrder ItemとOrderのSnapshotから取得する
- 現在の商品名や現在のVariant情報ではなく、注文時点のSnapshotを表示する
- Presentation側でRepositoryを直接参照しない

Review Form上部へ次を表示する。

- 商品名
- `variationName`と`optionValue`
- 注文番号
- 注文日
- 既存Review状態

内部IDは主表示にしない。

## 8.2 Customer注文詳細DTO

共有の`OrderItemDto`へCustomer固有のReview状態を追加しない。

```ts
interface CustomerOrderItemDto extends OrderItemDto {
  reviewState:
    | "NOT_POSTED"
    | "PUBLISHED"
    | "HIDDEN"
    | "DELETED"
    | "NOT_ELIGIBLE";
}

interface CustomerOrderDetailDto extends Omit<OrderDetailDto, "items"> {
  items: CustomerOrderItemDto[];
}
```

Admin注文詳細は既存の`AdminOrderDetailDto`を維持し、Customer固有のReview状態を混在させない。

### Review状態の判定順

1. Reviewが`deleted`なら`DELETED`
2. Reviewが`hidden`なら`HIDDEN`
3. Reviewが`published`なら`PUBLISHED`
4. 注文が`delivered`でReviewがなければ`NOT_POSTED`
5. それ以外は`NOT_ELIGIBLE`

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
- Guideへの導線は次へ配置する
  - Storefront Footer
  - Login画面
  - Test Control
  - Homeの学習Panel
- Headerへ新しいGuide Linkは追加しない
- 長大な操作マニュアルにせず、RoleとScenarioを選ぶ入口として構成する

### BuildとRoleによるTest Control表示

- Automation Build：Test Controlの説明を表示する
- Production Build：Test ControlへのLinkを表示せず、自動化環境で利用可能であることだけを記載する
- Guest／Customer／Operator：Admin専用Test Controlへ直接誘導しない
- AdminかつAutomation Build：Test Controlへの直接Linkを表示する

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

Content DictionaryのNoticeを用途別に分ける。

```ts
notice: {
  globalBanner: "学習用・実取引なし",
  trainingSummary: "...",
  personalData: "...",
  checkoutSafety: "...",
}
```

### 表示

- Global Header：`globalBanner`
- Guide：詳細説明
- Login／Signup：`personalData`とTest Account利用の注意
- Checkout：`checkoutSafety`
- Cart／商品詳細：一般説明を繰り返さない
- Footer：GuideとLegalへの導線
- Homeの学習Panel：`trainingSummary`とGuideへの導線

既存の共通`training`文言を一括変更して全画面を同じ短文にしない。安全上必要な注意は削除せず、重複だけを減らす。

---

## 9.5 HomeのEmpty Catalog

対象：UX-018

公開商品総数はCategoryの`visibleProductCount`から算出する。

```ts
const visibleProductTotal = categories.reduce(
  (sum, category) => sum + category.visibleProductCount,
  0,
);
```

同一商品が複数Categoryに所属しない既存契約を維持する。

- `visibleProductTotal === 0`の場合、商品SectionとCategory Sectionをまとめて非表示にする
- Home上へEmpty Stateを1つだけ表示する
- 表示内容
  - 現在公開中の商品がない
  - 読込失敗ではない
  - Guideまたは商品一覧への導線
- 商品が1件以上ある場合でも、各Product Sectionは`products.length === 0`なら描画しない
- 商品件数0のCategory Cardだけを並べない
- `empty-catalog`ではCategory定義が残っていてもEmpty Stateを1つだけ表示する
- 通常Catalogでは現在のHome構成を維持する

---

# 10. Admin商品編集

## 10.1 未保存変更の保護

対象：UX-011

### Dirty判定

- `ProductEditor`の初期値をSnapshotとして保持する
- 現在のProduct値、Variant値、Image選択、`removedVariantIds`を正規化して比較する
- Preview表示有無とMessageはDirty判定へ含めない
- `ProductEditor`から親PageへDirty状態を通知する
- 保存成功後は新しい初期値で再MountまたはSnapshotを更新し、Dirtyを解除する

### Router内遷移

対象：Sidebar、Breadcrumb、画面内Link、Browser Back。

- Expo Routerが利用するNavigationの離脱防止機構を使用する
- Dirty時だけNavigationを阻止する
- 阻止した元のNavigation Actionを保持する
- Actionは次の2つに統一する
  - `変更を破棄して移動`
  - `編集に戻る`

`変更を破棄して移動`では次の順番を守る。

1. Bypass用Refを有効化する
2. Dirtyを解除する
3. 保持した元のNavigation Actionを1回だけ再実行する
4. Bypass用Refを解除する

- 固定Pathへ置き換えない
- Browser Backも保持したActionを1回だけ再実行する
- `編集に戻る`ではActionを破棄し、入力を保持する
- 保存成功後のNavigationも同じBypass経路を使用する
- 再実行したNavigationをGuardが再度阻止してLoopさせない

### Browser離脱

対象：Reload、Tab Close、外部URL移動。

- Webの`beforeunload`を使用する
- Browser標準Dialogを使用し、独自文言が表示されることを前提にしない
- Dirtyでない場合はListenerを登録しない
- Router内遷移の再開処理と混在させない

### 保存成功後の遷移

- 親の`onSubmit`内でDirty解除前に`router.replace()`しない
- 保存成功後は最新Snapshotへ更新し、Dirtyを解除してからNavigationする
- 保存失敗時はDirtyを維持する

### Form外の操作

Dirty中は次をDisabledにする。

- 複製して新規登録
- 公開
- 非公開
- 販売終了
- 下書き削除

操作の近くに次を表示する。

```text
変更を保存または破棄してから実行してください。
```

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
- Command Queueの追加

### 検証条件

- Sidebar、Breadcrumb、Browser Back、Reloadで警告される
- Cancel後に入力値が残る
- 保存済み状態では警告されない
- Previewを開いてもDirtyが解除されない
- 保存成功後の正常な遷移をGuardが妨げない
- `変更を破棄して移動`で元のLinkまたはBack操作へ1回だけ進む
- Dirty中にForm外の状態変更操作を実行できない

---

## 10.2 商品Preview

対象：UX-012

### Preview専用DTO

```ts
interface ProductPreviewVariantDto extends ProductVariantForViewer {
  stockSource: "CURRENT" | "INITIAL";
  isActive: boolean;
}

interface ProductPreviewDto {
  // 既存のPreview表示項目
  statusAfterSave: ProductStatus;
  variants: ProductPreviewVariantDto[];
  publishabilityIssues: ApplicationErrorShape[];
}
```

実際の定義では既存`ProductPreviewDto`を拡張して構わないが、通常の`ProductDetail`へPreview固有情報を混在させない。

### Preview Use Case

#### 新規商品

- `statusAfterSave`は`draft`
- Variant在庫は`initialStockQuantity`を使用する
- `stockSource`は`INITIAL`
- `isActive`は作成時の有効状態として`true`

#### 編集商品

- 現在の商品Statusを取得し`statusAfterSave`へ設定する
- 既存VariantはDBの現在庫を取得する
- 既存Variantの`isActive`を保持する
- 既存Variantの`stockSource`は`CURRENT`
- 新規追加Variantは`initialStockQuantity`を使用し`stockSource`を`INITIAL`にする
- 削除予定VariantはPreviewへ含めない
- 既存Variantを`initialStockQuantity: 0`へ変換して在庫0として扱わない

### 表示内容

- Main Image
- Main Imageがない場合の`画像未設定`
- 商品名
- Short Description
- 保存後の状態
- 会員Rank制限
- Variant一覧の要約
- SKUごとの有効／無効
- 最小〜最大価格
- 在庫状態
  - 既存SKUの現在庫
  - 新規SKUの初期在庫
- 公開条件を満たさない項目
- `未保存の内容です`

### 実装方針

- Storefrontの商品詳細を完全複製しない
- 既存の`ProductImage`、`StatusBadge`、価格Formatterを再利用する
- `publishabilityIssues`をユーザー向け文言へ変換して表示する
- Preview DTOへ不足する表示情報だけを追加する
- Databaseへ副作用を発生させない

### 検証条件

- 編集Previewで既存SKUの在庫が0へ変わらない
- 無効SKUを識別できる
- 新規SKUの初期在庫と既存SKUの現在庫を区別できる
- 削除予定SKUが表示されない
- Previewを実行してもDatabaseが変更されない

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

### 配送欄の表示ルール

| Order状態 | Shipment状態 | 配送欄表示 |
|---|---|---|
| `paid` | `pending`または未作成 | 発送準備待ち |
| `preparing` | `pending` | 発送準備中 |
| `shipped` | `shipped` | 発送済み |
| `delivered` | `delivered` | 配送完了 |

Shipment Domainへ`preparing`を追加しない。PresentationでOrderとShipmentを組み合わせて表示する。

### 検証条件

- 発送準備開始直後に注文状態と配送欄が`発送準備中`として整合する
- Reload前後で状態が変わらない
- Customer注文詳細と矛盾しない

---

## 11.2 User操作不可理由

対象：UX-015

新しい`UserAdminCapabilities` DTOは追加しない。

### 画面側で判定する状態

- `currentUser.id === user.id`
  - 自分自身の管理役割または利用状態は変更不可
  - Disabled Control付近へ理由を表示する
- `user.accountStatus === "withdrawn"`
  - 退会済みUserは読取専用
- 選択値が現在値と同じ
  - 変更がないため実行ButtonをDisabledにする

### Mutation Error

- 最後のActive Admin保護など、既存Application／Domain側の制約は維持する
- 競合や直接API呼び出しで`LAST_ACTIVE_ADMIN`制約に到達した場合は、Generic Errorではなく次を表示する
  - `最後の管理者は変更できません。先に別の管理者を設定してください。`
- Presentation側でActive Admin人数を数えない
- 事前Capability取得用の追加Queryを実装しない

Disabled Controlと理由説明は`aria-describedby`で関連付ける。

---

# 12. Test Control

## 12.1 Scenario Metadata

対象：UX-016

Scenario Metadataを唯一のScenario ID定義元にする。

```ts
interface ScenarioMetadataDefinition {
  displayName: string;
  purpose: string;
  recommendedAccounts: readonly string[];
  routes: readonly string[];
  initialSession:
    | { kind: "guest" }
    | { kind: "customer"; email: string }
    | { kind: "operator"; email: string }
    | { kind: "admin"; email: string };
  summary: string;
}

export const SCENARIO_METADATA = {
  default: {
    // ...
  },
  "empty-catalog": {
    // ...
  },
} as const satisfies Record<string, ScenarioMetadataDefinition>;

export type PhaseOneScenario = keyof typeof SCENARIO_METADATA;

export const PHASE_ONE_SCENARIOS = Object.keys(
  SCENARIO_METADATA,
) as PhaseOneScenario[];
```

`ScenarioMetadataDefinition`から`PhaseOneScenario`を参照しない。型と配列の循環定義を作らない。

### 実装内容

- Scenario ID、型、表示情報を`SCENARIO_METADATA`から生成する
- 複数Roleを使うScenarioでは`recommendedAccounts`へ複数Accountを設定する
- Test Controlでは選択中Scenarioだけを表示する
- 詳細はGuideへLinkする

### Contract Test

全Scenarioについて次を検証する。

- IDの重複・漏れがない
- `recommendedAccounts`のEmailがSeed Userに存在する
- `initialSession`のEmailとRoleが生成Datasetの初期Sessionに一致する
- `guest`指定ではSessionが存在しない
- `routes`が空ではない
- Scenario IDと表示名が同じ定義から生成される

---

## 12.2 Scenario Reset確認

対象：UX-017

### 確認Dialog

既存Confirm Dialogを使用し、ユーザー向けに次を説明する。

- 現在の学習データが選択Scenarioの初期状態へ戻る
- Cart、Checkout、注文、商品、在庫、Review、入力途中の内容が初期化される
- 現在のSessionは破棄され、選択Scenarioの初期Sessionへ置き換わる
- ScenarioによってGuest状態、Customer Login済み、Operator Login済み、Admin Login済みになる
- 操作は元に戻せない

`Databaseを削除する`、`初期化後は必ず再Loginが必要`とは表示しない。

### Reset処理

- Reset中はButtonをDisabledにする
- 二重実行を防止する
- Reset失敗時は画面遷移せず、Test Control上でErrorを表示する
- Reset成功時は`scenario-reset` Noticeを保存する
- 選択Scenario Metadataの`initialSession`に応じて安全なPathへハード遷移する
  - `guest`／`customer`：`/`
  - `operator`／`admin`：`/admin`
- `window.location.assign()`相当を使用し、Application RuntimeとDexie接続を新しい状態で再初期化する
- 現在の`/admin/test-control`をそのままReloadしない

### Reset後の通知

`OneTimeNoticePresenter`で次を1回表示する。

- 初期化したScenario名
- 適用された初期Session状態
- 推奨Account
- 主な確認Route

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

## 14.1 注文詳細の再現手順

1. `payment-processing`へResetする
2. `regular@example.com`でLoginする
3. 注文一覧で`支払い待ち`の対象注文を開く
4. 注文詳細で次を5秒以内に確認する
   - `h1`
   - 注文番号
   - Order Status：`支払い待ち`
   - Payment Status：`支払い処理中`
5. Loading Panelが消える
6. Console ErrorとPage Errorが0件
7. Browser BackとHomeへの移動が可能

注文一覧へPayment Statusを新規追加しない。

## 14.2 Processing画面のFocus Test

Processing画面は通常500msで遷移するため、注文詳細の再現Testと分離する。

1. Test ControlまたはTest APIでPayment Delayを`3000ms`へ設定する
2. Checkout Confirmから支払いを開始する
3. Processing画面のMount後に`h1`へFocusされることを確認する
4. 処理完了後にCompleteまたはFailedへ遷移することを確認する
5. Test終了後はScenario Resetで決定的な初期状態へ戻す

待機時間を延ばす目的ではなく、Focus対象が表示されている時間を決定的に確保するためだけに既存Payment Delay機能を使う。

## 14.3 再現した場合の切り分け

1. App RuntimeがReadyにならない
2. Route Guardが待機し続ける
3. `getMyOrder()`が解決しない
4. Dexie QueryまたはTransactionがBlocked
5. Scenario Reset直後のSession参照が不整合
6. Playwright MCPだけで発生し通常E2Eでは再現しない

## 14.4 修正条件

- Promiseが解決しない：根本のQueryまたはTransactionを修正する
- Reset後のRuntime再初期化が停止する：Reset／Hard Navigation後の初期化処理を修正する
- 注文は取得できるが説明不足：注文詳細へ処理中状態と次のActionを表示する
- 通常E2Eで安定再現しない：Production Codeは変更せずFocused Testだけ残す

### 禁止事項

- 原因不明の無限Polling
- 一律30秒TimeoutでError化
- Paymentの強制成功・失敗
- Scenario固有Hardcode
- E2E待機時間を伸ばすだけの対応

---

# 15. Test実装とCI

## 15.1 Unit／Component／Integration／Contract

最低限、次を追加または更新する。

- Return先Allowlistと拒否条件
- Role別Login後遷移
- Cart Merge DTOの各数量、完全除外時の値、調整判定、集計、理由変換
- One-time Noticeの型検証、初回MountとPath変更時の消費、1回限りの表示
- Guard RedirectがあってもReset Noticeを失わないこと
- Checkoutの`created／resumed／replaced`表示済み判定
- 在庫数と購入上限の表示ルール
- 住所候補の都道府県・市区町村更新と番地保持
- Home CTAのRole別表示
- Customer Review DTOとReview状態判定順
- Scenario Metadataの全ID、Account、Role、初期Session整合
- UserのSELF／WITHDRAWN表示
- Last Active Admin Mutation Errorの文言変換
- Reset成功・失敗、Notice保存、安全Pathへの遷移
- Product EditorのDirty判定、破棄、元Navigation Actionの再実行、保存後解除
- Product Previewの既存在庫、新規在庫、SKU有効状態、保存後Status、公開条件表示
- Order／Shipment組合せ表示

## 15.2 Playwright E2Eの配置

### 新規Spec

```text
e2e/web/ui-ux-improvements.spec.ts
```

次を含める。

- GuestからLoginしてCheckout復帰
- Client-side Login遷移後のCart Merge Notice
- Guest Cart Overflowの数量内訳
- Checkout再開・置換
- Invalid Cart
- 商品詳細の在庫数
- ProfileとReview状態
- GuideとRole別Home CTA
- Empty Catalog
- 商品Formの未保存離脱、元Navigation再開、Form外操作
- 商品Preview
- Shipment状態同期
- User操作不可理由
- Scenario Reset確認とReset後Notice
- `payment-processing`注文詳細
- Processing画面Focus

### Cross-role Flow

PR CIで次を必ず実行する。

1. Adminが在庫変更  
   → Logout  
   → GuestまたはCustomerの商品詳細で正確な在庫数を確認

2. CustomerがReview投稿  
   → Adminが非公開  
   → Customerの注文詳細で`非公開レビューを編集`を確認

3. Adminが発送準備開始  
   → Customerの注文詳細で`発送準備中`を確認

各Cross-role Testは次を守る。

- Test開始時に対象ScenarioへResetする
- 前のTestのDB状態へ依存しない
- 1つのTest内でRoleを切り替える間はResetしない
- Test終了後の状態を次のTestが利用しない
- Serial実行を前提にしない
- Browser Contextごとに独立したStorageを使用する

既存Cross-role SuiteがPR CIで実行されないため、今回必要なFlowは`ui-ux-improvements.spec.ts`へ含める。

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
- Last Active AdminのMutation防御
- Product Previewの非永続性

---

# 18. 完了条件

次をすべて満たした時点で実装完了とする。

- Login後に購入導線へ自然に復帰できる
- 外部URLへのOpen Redirectができない
- Client-side Login遷移でもCart統合Noticeが表示される
- Cart統合結果にGuest数量、既存数量、追加数量、超過数量、最終数量が表示される
- Cart統合結果とCheckout再開／置換結果が1回だけ表示される
- Checkout遷移後に現在画面の`h1`がFocusされ、重要情報がViewport内にある
- Invalid Cartで次のActionを判断できる
- 商品詳細で正確な在庫数と購入上限の違いが分かる
- 住所候補利用で入力済み番地を失わず、都道府県と市区町村を更新できる
- Profileで会員RankとAccount状態を確認できる
- Review対象商品、注文、現在状態を確認できる
- Customer固有Review情報がAdmin DTOへ混入していない
- Login画面のTest Account情報がGuideへ整理されている
- Home CTAがRoleとLogin状態に一致する
- `empty-catalog`でEmpty Stateが1つだけ表示される
- 商品Formの未保存変更を誤って失わない
- 保存成功後の遷移を未保存Guardが妨げない
- 破棄後に元のNavigation Actionを1回だけ再実行できる
- Dirty中に商品状態変更などのForm外操作を実行できない
- 商品Previewで既存在庫、新規在庫、SKU状態、保存後Status、公開不能理由を正しく判断できる
- Previewで既存SKUが誤って在庫0にならない
- Admin注文詳細の注文状態と配送欄表示が整合する
- 自分自身と退会済みUserの操作不可理由が明示される
- Last Active Admin制約はMutation側で維持され、具体的Errorが表示される
- Test ControlでScenario目的とReset影響が分かる
- Reset後に安全なPathへ遷移し、Scenarioの初期Session状態を1回案内する
- Scenario Metadataが唯一のScenario ID定義元である
- Scenario Metadataが実際のSeed Account、Role、初期Sessionと一致する
- Status BadgeのAccessibilityをTestで確認している
- `payment-processing`の注文詳細でOrder StatusとPayment Statusを区別して確認できる
- Processing画面のFocusを既存Payment Delayで決定的に検証できる
- `payment-processing`は通常E2Eの再現結果に基づいて必要な修正だけを行っている
- Admin変更がStorefront／Customerへ反映されるCross-role Flowを独立したTestとしてPR CIで確認している
- 新規E2EがPR CIで実行される
- Desktop、Tablet、Mobile、Small Mobileの主要Flowを確認している
- 既存正常系と既存Scenarioを壊していない
- Format、Lint、Typecheck、Unit／Integration／Repository／Component／Contract Test、Build、必要なPlaywright E2Eがすべて成功する

問題を隠すためにTestを弱めたり、待機時間だけを増やしたりしないこと。
