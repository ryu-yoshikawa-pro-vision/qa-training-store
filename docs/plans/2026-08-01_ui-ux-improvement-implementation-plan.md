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
- 同じ原因を持つ問題は小さな共通処理で解消し、指摘ごとの場当たり的な分岐を増やさない
- 既存のApplication／Domain契約を利用できる場合は、Presentation側で情報を捨てずに表示する
- 表示要件を満たす情報が既存DTOにない場合だけ、用途を限定したDTOを追加する
- 新しい状態管理Library、Navigation Library、Backend、外部決済、実配送、自動保存は追加しない
- Test Account、Scenario、Rank Benefit、文言は共通定義から生成し、画面ごとに重複Hardcodeしない
- Product／SKU／Inventory分離、Checkout Stepper、Payment履歴、Review履歴、Admin Mobile境界表示は維持する
- 原因が再現できない問題へ、推測修正、無限Polling、待機時間の増加を入れない
- UI上で到達しない状態のためだけに、Capability DTOや重複Queryを追加しない
- User操作制約は既存Domain／Application側のMutation防御を維持する

---

## 3. 実装順序

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

### 実装内容

- Web向けの小さな共通HookまたはComponentを追加する
- Focus対象は各画面の`h1`へ統一し、`tabIndex={-1}`を設定する
- `scroll-margin-top`相当を設定し、Sticky Headerに隠れないようにする
- HookはFocus開始条件を引数で受け取れるようにする
- Focus実行タイミングは次のとおりとする
  - Address／Payment／Confirm：データ読込後に実Contentの`h1`がMountされた時点
  - Processing：処理中画面の`h1`がMountされた時点
  - Complete／Failed：注文詳細読込後に実Contentの`h1`がMountされた時点
- Loading PanelにはFocusを移さない
- Browser BackでForm入力やCheckout Sessionを破棄しない

### 検証条件

- `390×844`で各Stepへ進んだ直後、`document.activeElement`が現在画面の`h1`になる
- 見出しのBounding BoxがViewport内にある
- Desktopで不必要な大幅Scrollが発生しない
- Processing画面でも処理中見出しへFocusされる

---

## 4.2 内部Return先の検証

Login後の遷移先は共通Helperで検証する。

### 許可するPath

- `/cart`
- `/checkout/address`
- `/checkout/payment`
- `/checkout/confirm`

Query StringとHashは引き継がず、Pathだけを扱う。

### 拒否する値

- 外部URL
- `//`から始まる値
- Backslashを含む値
- `/login`、`/signup`など認証循環を起こすPath
- Allowlist外のPath
- 空文字、不正Encoding、複数値

不正な場合はRole別の既定RouteへFallbackする。

### Test

- 許可Pathが保持される
- 外部URL、Protocol-relative URL、循環Path、未知Pathが拒否される
- Open Redirectが発生しない

---

## 4.3 One-time Notice

Login後のCart統合結果とScenario Reset結果を、遷移先で一度だけ表示するためのWeb向けHelperを追加する。

### 保存形式

`sessionStorage`へ保存できる値をDiscriminated Unionで限定する。

```ts
type CartMergeNotice = {
  type: "cart-merge";
  presentation: "summary" | "success";
  targetPath:
    | "/"
    | "/cart"
    | "/checkout/address"
    | "/checkout/payment"
    | "/checkout/confirm";
  result: CartMergeResult;
};

type ScenarioResetNotice = {
  type: "scenario-reset";
  scenarioId: PhaseOneScenario;
  scenarioName: string;
  initialSessionLabel: string;
  recommendedAccounts: readonly string[];
  routes: readonly string[];
};

type OneTimeNotice = CartMergeNotice | ScenarioResetNotice;
```

- JSON Parse失敗、型不一致、不正値は例外にせず削除する
- Password、個人情報、任意URL、内部Error Stackは保存しない
- Native Buildを壊さないようWeb固有実装を分離する
- Global Notification FrameworkやEvent Busへ拡張しない

### 表示と消費

- Noticeの読出し、型検証、消費をStorefront Shell／Admin Shellへ重複実装しない
- `AppFrame`がNotice Stateと、Noticeを取り込んだ`consumedPath`を所有する
- `AppFrame`は`usePathname()`でPath変更を検知し、初回Mount時とPath変更時に未消費Noticeを読み出す
- `targetPath`が現在Pathと一致するCart Noticeだけを取り込む
- 正常にReact Stateへ取り込んだ直後に`sessionStorage`から削除する
- 同一Path内の再RenderではStateを維持する
- `consumedPath`から別Pathへ移動した場合はStateを`null`にする
- Noticeには閉じるButtonを設け、閉じた場合もStateを`null`にする
- Shell切替やGuard Redirectが発生しても、同一Page Load内でNoticeを失わない
- 表示後にReloadしても同じNoticeを再表示しない
- Successは`role="status"`、調整や注意を含むSummaryは内容に応じて`role="status"`または`role="alert"`を使用する

### 表示形式

- `presentation: "summary"`：Cart上部へ商品別の詳細Summaryを表示する
- `presentation: "success"`：HomeまたはCheckoutへ短いSuccess Noticeを表示する
- `scenario-reset`：Storefront／Adminのどちらでも同じ初期化結果を表示する

### Checkout再開通知の表示済み履歴

```text
checkout:<sessionId>:resumed
checkout:<sessionId>:replaced
```

- 同じCheckout Sessionでは1回だけ表示する
- Browser Reloadで再表示しない
- 新しいCheckout Sessionでは表示可能にする
- Scenario Reset成功時は、`checkout:`で始まる表示済みKeyをすべて削除する
- Reset失敗時は削除しない

表示済みKeyの削除は共通Web Helperへ実装し、次の両方から呼び出す。

- Test Control画面からのReset成功時
- `window.__TEST_API__.reset()`のWrapperからのReset成功時

実行順は次のとおりとする。

1. Reset成功
2. Checkout通知履歴を削除
3. `scenario-reset` Noticeを保存
4. 安全なPathへハード遷移

### Reset再実行Test

同一Browser Contextで次を確認する。

1. `checkout-resume`へReset
2. 再開Messageを確認
3. 同じScenarioへ再Reset
4. 再び再開Messageが表示される

---

# 5. Login、Cart統合、Checkout復帰

## 5.1 未LoginのCustomer専用RouteからLoginへ遷移する

対象：UX-005

Return先の付与はCart Buttonだけに限定せず、`RouteGuard`のCustomer Accessで処理する。

- 未LoginでCustomer Routeへアクセスした場合、現在Pathを共通Helperで検証する
- 許可Pathなら`/login?returnTo=<path>`へRedirectする
- Allowlist外なら通常の`/login`へRedirectする
- Staff／Admin／Automation AdminにはCustomer用Return先を付与しない

### Login成功後

- Login Use Caseの戻り値を使用し、成功した場合だけ遷移する
- Customerは検証済みReturn先へ移動する
- Return先がないCustomerは`/`へ移動する
- Operator／AdminはReturn先を無視し`/admin`へ移動する
- Login失敗時は入力値とReturn先を保持する
- Cart Merge Noticeは保存してから`router.replace()`する
- Payment／Confirmが未解放の場合は既存GuardまたはLoad Errorで前Stepへ戻す

### 検証条件

- GuestがCartからLoginした後、購入導線へ復帰する
- Checkout URLへの直接アクセスでもReturn先が保持される
- StaffがCustomer Checkoutへ誤遷移しない
- Login失敗時にHomeへ遷移しない

---

## 5.2 Guest Cart統合結果

対象：UX-006

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

- `NOT_FOUND`では`productName: null`とし、画面では`利用できない商品`と表示する
- Presentation側でRepositoryを再参照しない
- Merge処理中に確定した情報を結果へ含める

### 数量の定義

- `guestQuantity`：Guest Cartに存在した数量
- `previousUserQuantity`：Login前のUser Cart数量。未存在なら0
- `addedQuantity`：実際に追加できた数量
- `overflowQuantity`：追加できなかったGuest数量
- `finalQuantity`：統合後のUser Cart数量
- 完全除外時は`addedQuantity = 0`、`overflowQuantity = guestQuantity`、`finalQuantity = previousUserQuantity`

### 調整判定と集計

```ts
const hasAdjustment = cartMerge.items.some(
  (item) => item.overflowQuantity > 0 || item.excludedReason !== null,
);
```

表示用集計はItem配列から算出する。

- 追加できた商品数
- 数量調整が発生した商品数
- 完全に除外された商品数
- 追加数量合計
- 上限超過数量合計

既存の`excludedItemCount`を「完全に除外された商品数」として表示しない。

### 遷移

- 調整なし：検証済みReturn先へ移動し、`presentation: "success"`を表示する
- 調整あり：`/cart`へ移動し、`presentation: "summary"`を表示する
- `cartMerge === null`、Itemなし、追加・超過・完全除外がすべて0の場合は通知しない

### 検証条件

`guest-cart-merge-overflow`で商品ごとのGuest数量、既存数量、追加数量、超過数量、最終数量、理由を確認できる。

---

## 5.3 Checkoutの再開・置換

対象：UX-021

- `created`：Messageを表示しない
- `resumed`：前回の購入手続きを再開したことを表示する
- `replaced`：Cart更新により以前の手続きを置き換えたことを表示する
- Address画面のStepperと`h1`の直後へ表示する
- Checkout Session ID単位で1回だけ表示する
- 内部Version番号は表示しない
- `replaced`後は最新Cartを元に商品、数量、金額を表示する

---

# 6. Cartと商品詳細

## 6.1 価格変更同意とBlocking Issue

対象：UX-019

- `PRICE_CHANGED`以外のBlocking Issueがある場合、価格同意Panelを表示したままButtonをDisabledにする
- `購入できない商品を先に修正または削除してください。その後、現在価格へ同意できます。`と表示する
- `PRICE_CHANGED`だけになった場合にButtonをEnabledにする
- 同意成功後はCartを再取得し、価格Warningを消す
- Conflictは最新Cart再読込Actionを表示する
- Stock、Quantity、Rankなど既知Errorは原因別文言へ変換する
- 原因不明の場合だけGeneric Errorを使用する

---

## 6.2 商品詳細の正確な在庫数

対象：UX-022

### 表示ルール

- 0点：`在庫切れ`
- 1〜5点：`残りN点`
- 6点以上：`在庫 N点`
- `purchaseLimit < stockQuantity`：`1回の購入上限はM点です`

数量Selectの最大値は`min(stockQuantity, purchaseLimit)`とする。

- Variant変更時に在庫数、購入上限、数量Selectを即時更新する
- 商品一覧Cardには具体在庫数を追加しない
- Admin在庫変更後、再読込した商品詳細へ正しい値を反映する

---

# 7. Customer Accountと配送先

## 7.1 Mobile Account Navigation

対象：UX-002

```css
grid-template-columns: repeat(3, minmax(0, 1fr));
```

- `390px`と`320px`の両方で3列Gridを使用する
- Labelは折り返し可とし、各項目の最小高さを44px以上にする
- `aria-current="page"`を維持する
- 横Scrollを発生させない

## 7.2 配送先Empty State

対象：UX-003

`登録フォームから最初の配送先を登録してください。`へ変更する。新しい画面は追加しない。

## 7.3 住所候補適用時の既存値保持

対象：UX-008

- `prefecture`と`city`は候補値へ更新する
- `addressLine1`が空なら候補値を設定する
- `addressLine1`が入力済みなら保持し、組み合わせ確認Messageを表示する
- 候補なしの場合は一切変更しない
- 新規登録と既存配送先編集で同じ挙動にする

## 7.4 Profileの会員情報

対象：UX-007

Profile上部へRank、Account状態、Rank Benefit、Guide Linkを表示する。

Rank Benefitは`FREE_SHIPPING_THRESHOLD`、`membershipDiscountRate()`など価格計算と同じ定義から生成する。

---

# 8. Reviewの対象と状態

対象：UX-010

## 8.1 Review Eligibility DTO

```ts
productName: string;
variationName: string | null;
optionValue: string | null;
orderNumber: string;
orderCreatedAt: IsoDateTime;
```

Order ItemとOrderのSnapshotから取得し、現在の商品情報を参照しない。Review Form上部へ商品名、Variant、注文番号、注文日、現在Review状態を表示する。

## 8.2 Customer注文詳細DTO

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

共有`OrderItemDto`やAdmin DTOへCustomer固有状態を混在させない。

判定順はDeleted、Hidden、Published、Deliveredかつ未投稿、それ以外とする。

- `NOT_POSTED`：レビューを書く
- `PUBLISHED`：レビューを編集
- `HIDDEN`：非公開レビューを編集
- `DELETED`：削除済み・再投稿不可
- `NOT_ELIGIBLE`：配達完了後に投稿可能

---

# 9. 学習Guideと情報配置

## 9.1 `/guide`

公開Routeとして追加し、次を1画面にまとめる。

- アプリの目的と模擬環境の注意
- Roleの違い
- 固定Test AccountとPassword
- RankとBenefit
- Scenarioの概要、Resetの影響、主要確認Flow

Account、Rank、Scenario情報は共通定義から生成する。

Guide LinkはStorefront Footer、Login、Test Control、Homeの学習Panelへ配置する。Headerには追加しない。

Automation BuildかつAdminの場合だけTest Controlへの直接Linkを表示する。Production BuildやGuest／Customer／OperatorにはAdmin専用Linkを表示しない。

## 9.2 Login画面

固定Account一覧とPasswordの常時表示を削除し、Guide Linkだけを残す。Login Form、Error、Signup導線を主情報とする。

## 9.3 Home CTA

- Guest：ログインして購入
- Customer：マイページ
- Operator／Admin：管理画面へ

Primary CTAの商品を見るは全Roleで維持する。

## 9.4 模擬環境文言

```ts
notice: {
  globalBanner: "学習用・実取引なし",
  trainingSummary: "...",
  personalData: "...",
  checkoutSafety: "...",
}
```

Header、Guide、Login／Signup、Checkout、Home、Footerで用途別に使い分ける。Cartと商品詳細へ一般説明を繰り返さない。

## 9.5 HomeのEmpty Catalog

公開商品総数はCategoryの`visibleProductCount`合計で判定する。

```ts
const visibleProductTotal = categories.reduce(
  (sum, category) => sum + category.visibleProductCount,
  0,
);
```

- 0件なら商品SectionとCategory Sectionを非表示にし、Empty Stateを1つだけ表示する
- Product Sectionは`products.length === 0`なら描画しない
- 商品件数0のCategory Cardを並べない

---

# 10. Admin商品編集

## 10.1 未保存変更の保護

対象：UX-011

### Dirty判定

Product、Variant、Image、`removedVariantIds`を正規化したSnapshotと比較する。Preview表示有無とMessageはDirty判定へ含めない。

### Router内遷移

- Dirty時だけNavigationを阻止し、元のNavigation Actionを保持する
- 選択肢は`変更を破棄して移動`と`編集に戻る`
- 破棄時は次の順序を守る
  1. Bypass Refを有効化
  2. Dirtyを解除
  3. 元のNavigation Actionを1回だけ再実行
  4. Bypass Refを解除
- 固定Pathへ置き換えない
- Browser Backも同じActionを1回だけ再実行する
- 保存成功後のNavigationも同じBypass経路を使用する

### Browser離脱

Reload、Tab Close、外部URLは`beforeunload`を使用する。Dirtyでない場合はListenerを登録しない。

### Form外操作

Dirty中は複製、公開、非公開、販売終了、下書き削除をDisabledにし、保存または破棄が必要であることを表示する。

### 明示的な破棄

Product、Variant、Image、`removedVariantIds`、Preview、Form Messageを初期状態へ戻す。

---

## 10.2 商品Preview

対象：UX-012

### DTO

```ts
interface ProductPreviewVariantDto extends ProductVariantForViewer {
  stockSource: "CURRENT" | "INITIAL";
  isActive: boolean;
}

interface ProductPreviewDto {
  statusAfterSave: ProductStatus;
  variants: ProductPreviewVariantDto[];
  publishabilityIssues: ApplicationErrorShape[];
}
```

通常の`ProductDetail`へPreview固有情報を混在させない。

### 値の取得元

#### 新規商品

- `statusAfterSave`：`draft`
- 在庫：Formの`initialStockQuantity`
- `stockSource`：`INITIAL`
- `isActive`：`true`

#### 編集商品

| 項目 | 取得元 |
|---|---|
| 現在庫 | DB上の現在値 |
| SKU、Option、価格、Sale、購入上限 | Formの未保存値 |
| `isActive` | `updateVariants.isActive`の未保存値 |
| 商品Status | DB上の現在Status |
| 削除予定か | `removeVariantIds` |

- DB上の`isActive`でForm上の変更を上書きしない
- 新規追加Variantは`initialStockQuantity`と`stockSource: "INITIAL"`を使用する
- 削除予定VariantはPreviewへ含めない
- 既存Variantを`initialStockQuantity: 0`へ変換しない

### 表示内容

Main Image、商品名、Short Description、保存後Status、Rank制限、SKUの有効状態、価格範囲、既存在庫、新規初期在庫、公開不能理由、未保存表示を含める。

### Test

- 既存SKUが誤って在庫0にならない
- 有効→無効、無効→有効の未保存変更がPreviewへ反映される
- 削除予定SKUが表示されない
- PreviewでDBが変更されない

---

# 11. Admin注文とUser管理

## 11.1 Shipment状態の同期

対象：UX-013

Mutation成功後に注文詳細を再取得し、注文Status、配送欄、Actionを同じ結果から描画する。Local Stateだけを先行更新しない。

| Order | Shipment | 配送欄 |
|---|---|---|
| `paid` | `pending`または未作成 | 発送準備待ち |
| `preparing` | `pending` | 発送準備中 |
| `shipped` | `shipped` | 発送済み |
| `delivered` | `delivered` | 配送完了 |

Shipment Domainへ`preparing`を追加しない。

## 11.2 User操作不可理由

対象：UX-015

- 自分自身：Role／Account状態変更不可
- Withdrawn：読取専用
- 選択値が現在値と同じ：実行Button無効
- Disabled Controlと説明を`aria-describedby`で関連付ける
- Active Admin人数をPresentationで数えない
- Last Active Adminは既存Mutation防御を維持し、到達時は具体的Errorを表示する
- 新しいCapability DTOや事前Queryを追加しない

---

# 12. Test Control

## 12.1 Scenario Metadata

Scenario Metadataを唯一のID定義元にする。

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
  // all scenarios
} as const satisfies Record<string, ScenarioMetadataDefinition>;

export type PhaseOneScenario = keyof typeof SCENARIO_METADATA;
export const PHASE_ONE_SCENARIOS = Object.keys(
  SCENARIO_METADATA,
) as PhaseOneScenario[];
```

`ScenarioMetadataDefinition`から`PhaseOneScenario`を参照せず、循環定義を作らない。

Contract Testで全ScenarioのAccount存在、Role、初期Session、Guest、Route、ID重複・漏れを検証する。

## 12.2 Scenario Reset

### Dialog

現在の学習データ、Cart、Checkout、注文、商品、在庫、Review、入力途中の内容がScenario初期状態へ戻ること、Sessionが初期Sessionへ置き換わること、元に戻せないことを説明する。

`Databaseを削除する`や`必ず再Loginが必要`とは表示しない。

### 処理

- Reset中は二重実行を防ぐ
- 失敗時は遷移せずErrorを表示する
- 成功時はCheckout通知履歴を削除し、Scenario Reset Noticeを保存する
- Guest／Customerは`/`、Operator／Adminは`/admin`へ`window.location.assign()`相当でハード遷移する
- `/admin/test-control`をそのままReloadしない

---

# 13. Accessibility Focused Test

対象：UX-014

現行Status BadgeはTextをDOMへ出しているため、Test失敗前にMarkupを変更しない。

- 商品、注文、Review、User、在庫の状態TextをRoleまたはTextで取得する
- 取得できる場合はProduction Markupを変更しない
- 取得できない場合だけDOM原因を修正する
- Decorative Dotは`aria-hidden`のまま維持する
- 二重読み上げになる`aria-label`を追加しない

既存`e2e/web/accessibility.spec.ts`へ追加する。

---

# 14. `payment-processing`

対象：UX-020

## 14.1 注文詳細の再現

1. `payment-processing`へReset
2. regular CustomerでLogin
3. 注文一覧の`支払い待ち`注文を開く
4. 注文詳細でOrder Statusが`支払い待ち`、Payment Statusが`支払い処理中`であることを5秒以内に確認
5. Loading Panel消失、Console Error 0、Page Error 0を確認
6. Browser BackとHome移動を確認

注文一覧へPayment Statusは追加しない。

## 14.2 Processing画面Focus

E2EではTest Control UIを使用せず、Test APIへ固定する。

1. `window.__TEST_API__.reset({ scenario: "default" })`
2. regular CustomerでLogin
3. `window.__TEST_API__.setPaymentDelay(3000)`
4. Checkout Confirmまで進む
5. 支払い開始後、Processingの`h1`へFocusされることを確認
6. CompleteまたはFailedへの遷移を確認
7. Test終了後に`window.__TEST_API__.reset({ scenario: "default" })`

Payment DelayはFocus対象の表示時間を決定的に確保するためだけに使う。

## 14.3 修正条件

通常E2Eで再現した原因だけを修正する。Promise、Runtime、Dexie、Sessionの根本原因を特定し、無限Polling、30秒Timeout、Scenario Hardcode、待機延長だけの修正は禁止する。

---

# 15. Test実装とCI

## 15.1 Unit／Component／Integration／Contract

最低限、次を追加または更新する。

- Return先AllowlistとRole別Login遷移
- Cart Merge DTO、完全除外時の値、集計、理由変換
- One-time Noticeの型検証、Path変更時消費、終了条件、Target Path、表示形式
- Reset成功時のCheckout通知履歴削除とReset失敗時の維持
- 同じCheckout Scenarioへ再Resetした場合の再表示
- Checkoutの`created／resumed／replaced`
- 在庫数、購入上限、住所候補、Home CTA
- Customer Review DTOと判定順
- Scenario MetadataとSeed整合
- User制約とLast Active Admin Error変換
- Product EditorのDirty判定、破棄、元Navigation再実行
- Product PreviewのDB在庫、Form `isActive`、新規在庫、Status、公開条件
- Order／Shipment組合せ

## 15.2 新規E2E

`e2e/web/ui-ux-improvements.spec.ts`へ次を含める。

- Login後Checkout復帰とClient-side Cart Notice
- Cart Overflow数量内訳
- Checkout再開・置換と同一Scenario再Reset
- Invalid Cart、商品在庫、Profile、Review
- Guide、Home CTA、Empty Catalog
- 未保存離脱、元Navigation再開、Form外操作、Preview
- Shipment同期、User操作不可理由
- Reset確認、Reset後Notice
- `payment-processing`注文詳細とProcessing Focus

## 15.3 Cross-role

各Test開始時にScenario Resetし、同一Test内だけでRoleを切り替える。前TestのDB状態へ依存せず、Browser ContextごとにStorageを独立させる。

- Admin在庫変更→Storefront在庫確認
- Customer Review投稿→Admin非公開→Customer表示確認
- Admin発送準備→Customer注文詳細確認

## 15.4 Playwright ConfigとScript

新規SpecをChromium Projectの収集対象へ追加する。

```ts
{
  name: "chromium",
  testMatch: [
    /phase1-required\.spec\.ts/,
    /accessibility\.spec\.ts/,
    /ui-ux-improvements\.spec\.ts/,
  ],
  use: { ...devices["Desktop Chrome"] },
}
```

`package.json`は次に変更する。

```json
"test:e2e:chromium": "playwright test e2e/web/phase1-required.spec.ts e2e/web/ui-ux-improvements.spec.ts --project=chromium"
```

収集確認として次を必ず実行する。

```text
pnpm exec playwright test --project=chromium --list
```

出力に`ui-ux-improvements.spec.ts`のTestが含まれることを確認する。

Mobile固有Caseは`mobile-boundary.spec.ts`、Accessibilityは`accessibility.spec.ts`、Guide Screenshotは`ui-review.spec.ts`へ追加する。

## 15.5 必須実行

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
pnpm exec playwright test --project=chromium --list
pnpm run test:e2e:chromium
pnpm run test:a11y
pnpm run test:e2e:mobile-boundary
```

---

# 16. Responsive確認

- Desktop：`1440×1000`
- Tablet：`1024×900`
- Mobile：`390×844`
- Small Mobile：`320×700`

Home、Guide、Login、商品詳細、Cart、Checkout、注文完了、Profile、配送先、注文詳細、Review、Admin商品編集、Test Controlを確認する。

Admin管理操作は既存どおり1024px以上を前提とし、Mobile用の管理Tableを新規実装しない。

---

# 17. 壊してはいけない既存動作

- 商品検索、Filter、Sort、Pagination
- Variant価格、Sale、会員割引、在庫切れ選択不能
- Cart価格内訳、送料、Checkout Stepper
- Payment成功、失敗、再試行、Cart消費
- Order／Payment／Shipment分離
- Product／SKU／Inventory分離、在庫履歴、Version管理
- Bulk Partial Failure
- Review公開、非公開、再公開履歴
- Admin Mobile境界案内
- Test API、Seed Scenario、固定Clock、Payment Delay
- Scenario初期Session復元とDefault Scenarioの決定性
- Last Active AdminのMutation防御
- Product Previewの非永続性

---

# 18. 完了条件

- Login後に購入導線へ復帰でき、Open Redirectがない
- Client-side Login遷移でもCart Noticeが正しく一度だけ表示され、別Path移動または閉じる操作で消える
- Cart統合数量と理由が正しく表示される
- Scenario Reset後にCheckout通知履歴が消え、同じScenarioでも再び通知される
- Checkout各画面の`h1`が適切なタイミングでFocusされる
- Invalid Cart、商品在庫、住所候補、Profile、Reviewの状態が理解できる
- Guide、Login、Home、模擬環境説明が整理されている
- Empty CatalogでEmpty Stateが1つだけ表示される
- 商品Formの未保存変更を失わず、元Navigationを1回だけ再開できる
- PreviewでDB現在庫とFormの未保存`isActive`を正しく使い分ける
- Admin注文、Shipment、User制約の表示が実状態と一致する
- Scenario Metadataが唯一のID定義元で、Seedと一致する
- `payment-processing`を通常E2Eで切り分け、Processing FocusをTest APIで決定的に検証する
- `ui-ux-improvements.spec.ts`がPlaywrightのChromium Projectに収集され、PR CIで実行される
- Cross-role Flowが独立したTestとして実行される
- 4Viewportで主要Flowを確認する
- 既存正常系と既存Scenarioを壊していない
- Format、Lint、Typecheck、Unit／Integration／Repository／Component／Contract Test、Build、必要なPlaywright E2Eがすべて成功する

問題を隠すためにTestを弱めたり、待機時間だけを増やしたりしないこと。
