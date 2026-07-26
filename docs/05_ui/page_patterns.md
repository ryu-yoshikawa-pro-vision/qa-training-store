# Page Pattern設計

本ファイルは画面の構造とInteractionの正本です。各Route固有のData項目は`ui_specifications.md`、文言は`ui_content_dictionary.md`を参照します。

## 1. Storefront Shell

### Desktop

```text
[Scenario Shop] [商品を検索________________] [商品] [注文履歴] [アカウント] [カート 2]
[Learning Notice / Test Mode]
[Main Content]
[Footer: 規約・Privacy・模擬取引表示]
```

- Searchは全Storefrontで利用可能。
- operator/adminがLogin中の場合は購入Navigationを出さず、「管理画面へ」を表示する。
- HeaderはScrollしても主要Navigationが見失われない範囲でStickyとする。

### Mobile

```text
[Scenario Shop] [検索] [カート 2]
[Main Content]
[Home] [検索] [カート] [注文] [アカウント]
```

Bottom Navigationは現在地をTextとIconで示します。

## 2. Home Pattern

表示順:

1. Hero: 架空店舗説明、主要CTA「商品を見る」
2. 主要Category: 最大6件
3. 新着商品: 最大8件
4. Sale商品: 最大8件。0件ならSection自体を表示しない
5. 会員Rank案内: 割引率と送料無料条件
6. 学習用注意: 詳細NoticeへのLink

Recommendationや閲覧履歴によるPersonalizationは行いません。

## 3. Product List・Search・Category Pattern

### Desktop

```text
[Breadcrumb]
[Title]                                           [123件]
[Search Result説明]
[Filter Sidebar]  [Applied Filter Chips]          [Sort]
                  [Product Grid 4 columns]
                  [Pagination]
```

### Mobile

```text
[Title]
[Search Field]
[Filter 3] [Sort]
[Applied Filter Chips horizontal scroll]
[123件]
[Product Grid 2 columns]
[Pagination]
```

Rule:

- Desktop Filterは変更時に即時適用する。
- Mobile FilterはBottom Sheet内で仮選択し、「123件の商品を表示」で確定する。
- Filter項目: Category、Brand、価格、在庫あり、Sale中、最低評価。
- Applied Chipは個別解除でき、「すべて解除」を最後に置く。
- Filter候補件数は0件候補も表示し、選択不可であることを伝える。
- Search結果0件では、検索語修正、Filter解除、全商品、主要Categoryへの導線を表示する。
- 詳細から戻った場合、Query、Page、Scroll位置を復元する。

## 4. Search Suggestion Pattern

- 2文字以上入力し、150ms Debounce後に最大8件を表示する。
- Group順は商品、Category、Brand。
- 商品候補は商品名とBrandを表示する。
- `ArrowDown/ArrowUp`で移動、`Enter`で決定、`Escape`で閉じる。
- 商品候補は`/products/[productId]`、Category候補は`/categories/[categoryId]`、Brand候補は`/search?brand=[brandId]`へ移動する。
- 候補外の文字列でEnterした場合は`/search?q=...`へ移動する。
- 検索中、0件、読込ErrorをCombobox内で明示する。

## 5. Product Detail Pattern

### Desktop

```text
[Breadcrumb]
[Gallery 55%] [ブランド / 商品名 / 評価]
              [Regular / Sale / Member Price]
              [Shipping Condition]
              [Variation Buttons]
              [Stock / Quantity]
              [Add to Cart]
[Description]
[Review Summary / Distribution / Sort / Reviews]
```

### Mobile

- Gallery、商品名、価格、Variation、在庫、説明、Reviewの順。
- Viewport下部に選択価格・在庫・「カートに追加」を含むSticky Barを表示する。
- Sticky BarはSoftware Keyboard表示時に入力を妨げない。

Rule:

- Thumbnail選択でMain Imageを変更する。
- Main Image選択で拡大Dialogを開く。DialogはKeyboardとSwipe/Buttonに対応する。
- 通常価格、Sale価格、会員適用価格を視覚的に区別し、二重に同じ価格を表示しない。
- Variationが12件以下ならButton、13件以上ならSelect。
- 選択不能Variationは消さず、在庫切れ理由を表示する。
- RatingはReview SectionへのAnchor Link。
- 送料は「あと¥1,200で送料無料」または「送料無料」と表示する。

## 6. Cart Pattern

### Desktop

```text
[Cart Items 2/3]                     [Order Summary 1/3 Sticky]
[Item / Variation / Price / Qty]     [Subtotal]
[Price/Stock Notice]                 [Discount]
                                     [Shipping]
                                     [Total]
                                     [Checkout]
```

### Mobile

Item一覧の下へSummaryを置き、Checkout CTAを画面下部にSticky表示してもよい。ただしItem Errorがある場合はCTAを無効化し、理由へ移動できるLinkを表示します。

## 7. Checkout Pattern

### Desktop

```text
[Step Indicator]
[Form 2/3, one column]               [Order Summary 1/3 Sticky]
```

### Mobile

- Step Indicatorを簡略表示する。
- Order Summaryは上部の折りたたみ領域とする。
- Primary CTAは画面末尾に1つだけ置く。

Rule:

- 建物名など任意Fieldは折りたたみ可能だが、入力済みなら常時表示する。
- 電話番号には「配送連絡に使用します」と理由を表示する。
- 郵便番号候補は自動確定せず、候補を利用するか選択させる。
- Submit Error時はError SummaryへFocusする。
- 注文確認CTAは「注文を確定する（合計金額）」とする。
- 会員Checkoutのみである理由をLogin誘導時に簡潔に示す。

## 8. Order・Self-Service Pattern

Order一覧:

- Order Number、注文日時、合計、状態、代表商品画像、詳細Link。
- 状態Filterと新しい順Sort。

Order詳細:

- Page HeaderにOrder NumberとStatus。
- 「現在の状態」「次に行われること」「利用者ができること」を表示する。
- 商品、金額、配送先、Payment Attempt、Shipment、TimelineをSection化する。
- `payment_failed`だけ再Payment CTAを表示する。
- `delivered`のeligible ItemへReview CTAを表示する。

## 9. Admin Shell・Overview Pattern

```text
[Side Navigation] [Breadcrumb]
                  [Page Title]                    [Primary Action]
                  [Status / Support Text]
                  [Main Content]
```

Side Navigation:

- 概要
- 商品管理: 商品、カテゴリ、ブランド、在庫
- 注文
- レビュー
- ユーザー（adminのみ）
- テスト制御（Automation adminのみ）

Overview:

- 要対応Card: 発送準備待ち、低在庫、非公開Review
- 最近の注文Table
- Quick Action: 商品登録、在庫調整、注文確認
- 売上、Conversion、Chart、前年対比は表示しない

## 10. Resource Index Pattern

```text
[Page Title]                                      [Primary Action]
[Search] [Filter] [Sort]
[Applied Filters]
[Bulk Action Bar when selected]
[Table]
[Pagination]
```

Rule:

- Empty Stateは「まだDataがない」と「Filterで0件」を区別する。
- Row全体をLinkにせず、Resource NameをPrimary Linkとする。
- Bulk Actionは商品公開/非公開、Review非公開/再公開だけ。
- Bulk処理前に対象件数を確認し、結果は成功件数と失敗件数を表示する。

## 11. Resource Details・Form Pattern

### Detail

- Breadcrumb、Page Title、Status、Primary Action。
- Main 2/3に主要情報、Aside 1/3に状態・分類・Meta情報。
- 危険操作はPage末尾のDanger Zoneへ分離する。

### Product Edit

```text
[Main 2/3]                         [Aside 1/3]
基本情報                           公開状態
説明                               Category
Variation / Price / Stock参照      Brand
GitHub Image Assets                会員制限
                                   更新情報
[Contextual Save Bar: 破棄 / 保存]
```

- TabでFormを細切れにせず、Section HeadingとAnchor Navigationを使用する。
- 未保存変更がある間だけContextual Save Barを表示する。
- Route離脱時は保存・破棄・戻るを選択させる。
- 既存SKUの在庫は読取専用とし、在庫調整画面へのLinkを置く。
- GitHub Image Asset Catalogから関連付ける。Binary Uploadは行わない。
- 並べ替えはDragと上下移動Buttonの両方を提供する。

## 12. Loading・Empty・Error Pattern

### Loading

- 初回Pageは構造を保つSkeleton。
- Button処理はButton内Loading。
- Search Suggestionは候補領域内Loading。

### Empty

- 空の理由
- 次の1Action
- 必要なら補助Link

### Error

- Page読込ErrorはRetryと安全な戻り先。
- Form ErrorはSummaryとField Error。
- Conflictは変更内容を保持し、再読込か再適用を選択。
- Not FoundとForbiddenを区別する。
