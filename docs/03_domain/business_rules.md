# 業務ルール

本ファイルはPhase 1の正本です。Cancel/Return/Refundと高度なPayment復旧はPhase 2以降で再詳細化します。

## 1. 商品・Master

### 1.1 商品状態

| 状態 | 顧客表示 | 購入 | 変更先 |
|---|---:|---:|---|
| draft | × | × | published / 物理削除 |
| published | ○ | ○ | unpublished / discontinued |
| unpublished | × | × | published / discontinued |
| discontinued | × | × | なし |

- Cart Item、Order Item、Reviewから参照されず、かつ所属SKUに`INITIAL_STOCK`以外の在庫履歴がないdraftだけ物理削除可能。削除時はSKU、商品画像関連、削除対象SKUだけに紐づく`INITIAL_STOCK`履歴も同一Txで削除する。GitHub上の画像Asset Binaryは削除しない。
- 公開にはactiveなCategory、activeなBrand、active SKU1件以上、商品画像関連1件以上、Primary画像ちょうど1件が必要。
- 公開商品が紐づくCategory・Brandは無効化不可。
- 商品は1つのCategoryを直接参照する。CategoryはPhase 1で階層を持たない。
- StorefrontでCategoryを選択した場合は、指定したactiveな1階層CategoryをOR条件として検索する。
- Category・Brandは作成時にactiveとする。Category名称・表示順、Brand名称の通常更新で有効状態を変更せず、状態変更専用Use Caseを使用する。
- 新規CategoryはCategoryが0件ならsortOrder=10、既存Categoryがある場合はmax(sortOrder)+10として末尾へ追加する。最大値取得と作成は同一Transactionで実行し、任意位置への変更は作成後の並べ替えで行う。

### 1.2 商品Aggregate編集

- Product、Variant、ProductImage関連を`ProductAggregate`として同一Txで保存する。
- Product Aggregate更新では既存Variantの在庫を変更しない。既存在庫は在庫調整Use Caseだけが変更する。
- Product Aggregateはdraftを含めてactive Variantを1件以上保持する。Variationなしはactive Variantをちょうど1件、Variationありはactive Variantを1件以上保持する。これにより管理一覧の価格と在庫表示を常に決定できる。
- productCodeはdraftかつCart/Order/Review参照なしの場合だけ変更可能。保存済みSKUも親商品がdraftかつVariant参照なしの場合だけ変更可能。公開後はCode/SKUを維持し、新SKU追加と旧SKU無効化で対応する。
- productCode/SKUはTrim、Unicode NFKC、ASCII大文字化の順で正規化し、`[A-Z0-9_-]+`だけを保存する。正規化後の値を表示・検索・一意判定・Sortへ使用する。
- 新規Variantは常にactiveで作成し、初期在庫を入力でき、保存時に`INITIAL_STOCK`履歴を作成する。無効状態での新規作成は許可せず、保存後の無効化はUpdate契約で行う。
- draft Variantでも、Cart/Order/Review参照または`INITIAL_STOCK`以外の在庫履歴がある場合は物理削除せず`isActive=false`にする。参照がなく在庫履歴が`INITIAL_STOCK`だけの場合は、その履歴を同一Txで削除してVariantを物理削除できる。
- published商品はactive Variantを1件以上保持する。最後のactive Variantの無効化・削除を拒否する。
- 商品Aggregateの新規作成は常に`draft`かつ`publishedAt=null`とする。Aggregate編集でstatusを変更せず、公開・非公開・販売終了は専用の状態変更Use Caseだけが行う。
- Variationなし商品は`variationName=null`かつ`optionValue=null`のactive Variantを1件だけ持つ。
- Variationあり商品は軸名を1～30文字で保持し、同一商品内のactiveな`optionValue`を重複禁止とする。
- 商品複製操作はDBへ保存せず、新規登録Formを事前入力する。説明、Category、Brand、価格、active Variant構成、active画像関連だけを転記し、Product Codeと各SKUは空、初期在庫は0とする。利用者がCode/SKUを入力して保存した時点で通常のCreateProductAggregateを実行し、INITIAL_STOCK履歴と0件Review Summaryを作成する。元のOrder、Review、在庫履歴は転記しない。
- Previewは未保存Form Dataを表示し、DB・在庫履歴を変更しない。商品名、Category、Brand、active Variant 1件以上などdraft保存に必要な最小Validationを満たす場合だけ実行でき、画像0件はPlaceholderとして表示する。

### 1.3 GitHub画像Asset

- 画像Binaryの正本はGitHub Repository内`public/images/products/`とする。Cloudflare Pagesは同一Originの静的Assetとして配信する。
- Build前に画像ManifestのTypeScript Moduleと診断用JSONを生成し、ApplicationはModuleを静的importして`assetId`からPath、形式、寸法、容量、有効状態を取得する。Runtime Fetchは行わない。
- 管理UIはAsset Catalogから画像を選択し、商品との関連付け、解除、Primary、順序、Alt Textだけを変更する。最初の関連は自動的にPrimaryとし、Primaryを解除して画像が残る場合はsortOrder先頭を同一TxでPrimaryにする。Default Alt Textを初期値としてProduct固有Alt Textを編集できる。
- BrowserからGitHub APIへ書き込まない。GitHub TokenをFrontendへ保存しない。
- 新規Binary追加・差し替えはRepositoryへ新しいContent Hash付きFileを追加し、PR/Commitと再Deployで反映する。既存Fileを上書きしない。
- GitHub CIは各BrowserのIndexedDB参照を把握できないため、Release済みAssetは使用状態にかかわらずManifest/Fileから物理削除しない。選択候補から外す場合は`isActive=false`とし、既存商品では表示を継続する。
- 新規関連付けはactive Assetだけを許可する。既存関連のinactive Assetは維持できるが、解除後は再関連付けできない。

### 1.4 一覧価格・Facet

- SKUごとに、現在時刻のSale適用後価格へViewerの会員割引を適用し`viewerUnitPrice`を算出する。
- 商品一覧はactive Variantの`minimumViewerUnitPrice`と`maximumViewerUnitPrice`を返す。同額は単一価格、異なる場合は「最小～最大」を表示する。
- 価格Filterはactive Variantのいずれかの`viewerUnitPrice`が範囲内なら商品を含める。
- 価格昇順・降順はどちらも`minimumViewerUnitPrice`を主Keyとし、最終KeyはproductCode昇順とする。
- `hasPurchasableStock`はactiveかつ在庫1以上のVariantが1件以上、`hasActiveSale`は現在Sale中のactive Variantが1件以上の場合にtrueとする。
- 管理商品一覧の在庫状態は商品に属するactive Variantの在庫合計`activeTotalStock`で判定する。`in_stock`は1以上、`low_stock`は1～5、`out_of_stock`は0とし、SKU単位の在庫状態は在庫一覧画面で扱う。

### 1.5 商品探索

- Homeは主要Category、新着商品、Sale商品、会員Rank案内を固定順で表示する。新着は`publishedAt`降順、同値はproductCode昇順とする。`publishedAt`は初回公開時だけ設定し再公開で更新しない。
- Homeの商品SectionはViewer条件を適用し、新着・Sale各最大8件とする。
- Category/Brand NavigationはViewer条件適用後の商品件数が1件以上のactive項目だけを返す。Category件数はそのCategoryへ直接属する可視商品数とする。
- Search対象は商品名、短い説明、Brand名、Category名。
- Search Suggestionは2文字以上、最大8件。商品、Category、Brandの順でGroup化する。
- Search/FilterはViewer条件、Keyword、Category、Brand、価格、在庫、Sale、最低評価を適用してからtotalとPageを計算する。Category/Brandは同一Facet内OR、異なるFacet間ANDとする。
- Facet件数はViewer条件と現在の他条件を適用し、対象Facet自身の選択だけを除外して計算する。
- Category Facetは1階層CategoryのID、表示名、件数を返す。
- `publishedCount=0`では`ratingAverage=0`、それ以外は`ratingAverage=ratingTotal / publishedCount`を丸めず保存する。
- Rating Filterは未丸めの`ratingAverage >= minimumRating`かつ`publishedCount > 0`を満たす商品を対象とする。
- Sale Filterは現在時刻にSale価格が有効なSKUを1件以上持つ商品を対象とする。
- 同順位SortはproductCode昇順で確定する。
- 詳細から戻る際のScroll位置はUI Stateであり、業務Dataとして永続化しない。

### 1.6 価格・Sale

- 金額は日本円整数。
- `saleStartAt <= now < saleEndAt`でSale価格を適用。
- Sale価格は通常価格より小さい正整数。
- 商品詳細は通常価格、Sale価格、会員適用価格を重複なく表示する。
- Storefront Variant DTOの`activeSalePrice`は現在時刻にSaleが有効な場合だけ設定し、期間外の設定済みsalePriceを画面へ返さない。

### 1.7 Variation

- 1軸Variationだけを扱い、軸名と選択肢名を明示する。
- 12件以下はButton群、13件以上はSelectで表示する。
- 在庫切れVariationは非表示にせず、選択不能と理由を表示する。
- Variation選択前は数量変更とCart追加を無効化する。
- Storefrontへ返すVariantはactiveなものだけとし、DTOに`isActive`を含めない。在庫切れはactiveのまま`stockQuantity=0`で表現する。

### 1.8 Review集計

`product_review_summaries`に公開Review件数、評価合計、平均、評価1～5別件数を保持します。Reviewの作成、評価変更、削除、非公開、再公開と同じTxで更新します。

- 商品新規作成時に全値0のSummaryを同一Transactionで作成する。削除可能なdraft商品を削除する場合は、Reviewがないことを再確認してSummaryも同一Transactionで削除する。
- 商品AggregateのCreate/UpdateではUse CaseがClockを1回だけ取得し、Product、Variant、ProductImage、INITIAL_STOCK履歴に同じ時刻を使用する。Create時は0件Review Summaryにも同じ時刻を使用する。Update時は既存Review Summaryを変更せず、Review Summaryの再集計はReview変更Use Caseだけが行う。Repositoryは実時計を直接取得しない。

- 評価別件数合計はpublishedCountと一致する。
- 評価順商品Sortは未丸めのratingAverage降順、publishedCount降順、productCode昇順。
- 平均評価は表示時だけ小数第1位へ丸め、永続化・Sort・Filterでは丸めない。
- Review一覧は新着、評価高い順、評価低い順を提供する。
- 顧客は本人のpublished/hidden Reviewを編集できるがStatusは変更しない。hidden Reviewを編集しても自動再公開せず、adminの再公開操作を必要とする。published/hiddenはdeletedへ論理削除でき、deleted後は編集・再投稿できない。

## 2. 価格計算

```text
1. SKU有効単価 = Sale適用後・会員割引前単価
2. 単価割引 = floor(SKU有効単価 × 会員割引率)
3. 会員単価 = SKU有効単価 - 単価割引
4. 明細小計 = SKU有効単価 × 数量
5. 明細割引 = 単価割引 × 数量
6. 明細合計 = 会員単価 × 数量
7. 商品小計 = 全明細小計の合計
8. 会員割引 = 全明細割引の合計
9. 合計 = 商品小計 - 会員割引 + 送料
```

- regular 0%、gold 5%、platinum 10%。
- 端数処理はSKU単価ごとに1回だけ行う。商品小計全体へ割引率を掛け直さない。
- 商品一覧・商品詳細・Cart・Checkout・Order履歴は同じ単価割引Ruleを使用する。
- regular/goldは割引前小計5,000円以上で送料無料。
- platinumは常時送料無料。
- 送料500円、税込表示。
- regular/goldには送料無料までの不足額を`max(0, 5000 - 割引前小計)`で表示する。
- Order Itemへ有効単価、単価割引、明細小計、明細割引、明細合計をSnapshot保存し、Orderへ商品小計、割引合計、Rank、送料、合計をSnapshot保存する。

## 2.1 配送先

- Userあたり最大5件、Defaultは最大1件。
- 最初の配送先は`makeDefault=false`でも自動的にDefaultとする。既存Defaultを更新する際に`makeDefault=false`を指定してもDefaultは維持し、Defaultを0件へする更新操作は許可しない。
- 別の配送先をDefaultにする場合は、対象をDefaultにして旧Defaultを同一Txで解除する。
- Default配送先を削除して他の配送先が残る場合、`createdAt`昇順、同値は`id`昇順の先頭を同一Txで新Defaultにする。
- 最後の配送先を削除した場合、Defaultは0件になる。

## 3. Cart

- `/cart`はguest/customerが利用できる公開Storefront Routeとし、operator/adminは利用不可とする。

- guestとcustomerだけ利用可能。
- 同一SKUは合算する。追加後数量が在庫、99、SKU購入上限の最小値を超える場合、自動補正せず操作全体を拒否し現在数量を維持する。
- 商品詳細の「カートに追加」は追加数量、Cart画面の数量変更は変更後の絶対数量として別契約で扱う。数量0はCart Itemを保存せず削除する。
- 商品詳細からのCart追加はCart Versionを要求しない。Use CaseがUser/Guest ownerを解決し、active Cartの取得または作成、既存SKU加算または新規明細作成を同一Transactionで行う。Cart画面の数量変更・削除は表示済み状態への更新なのでCart/Item Versionを要求する。
- 表示・Checkout開始時に公開、権限、価格、在庫を再検証する。
- 価格変更は顧客承認までCheckout不可。
- Order作成時にCartを`consumed`へし、明細をOrder Itemへ変換する。
- guestIdはLocal Storageへ保存し、同一BrowserのGuest Cartを再取得する。
- Cart Itemの追加、数量変更、削除、価格変更承認では、親Cartの`updatedAt`と`version`を同一Txで更新する。Guest Cart統合でもUser Cart versionを更新する。
- Cart/Checkoutの明細表示順はCart Itemの`createdAt`昇順、同値はitemId昇順とし、Order ItemのlineNumberも同じ順序から採番する。
- Login時はUser Cartを基準にGuest CartをSKU単位で統合する。合算数量は許容上限まで取り込み、超過分を除外して件数を表示する。非公開、Rank不足、無効SKU、在庫0の明細は除外し理由を表示する。Guest Cartは同一Txでabandonedへ変更する。
- Payment失敗後に元Cartは復活させず、Order詳細から再試行する。

### 3.1 名称Normalization

Category名、Brand名、Variation選択肢の重複判定は、次の共通関数で比較Keyを生成します。

1. 前後空白を除去する。
2. Unicode NFKCで正規化する。
3. Locale非依存で小文字化する。
4. 連続する空白を1文字へまとめる。

表示用の元文字列は保持し、重複判定とIndexには比較Keyを使用します。

## 4. Checkout Session

- `active / converted / abandoned / expired`を持つ。
- customer、Cart、Cart version、配送先Snapshot、支払方法、現在Stepを保持する。
- Gateway Keyは保持しない。Gateway KeyはPayment Attempt作成時に生成する。
- active SessionはUserごとに最大1件。Start時に同じCart ID/VersionのSessionがあれば再開する。異なる場合は既存をabandonedへ変更して新規作成する。
- LogoutではSessionを削除せず、再Login後にOwnershipとCart状態を確認して再開できる。
- 24時間でexpired。
- Cart versionが変わった場合、Cart変更TransactionではCheckout Sessionを更新しない。Route Guard・確認画面取得・注文確定時に不一致を検出してCartへ戻し、次回Checkout開始時に旧active Sessionをabandonedへ変更する。
- 直接URLアクセス時は不足した前段へ戻す。
- Order作成成功時にconvertedへ変更する。
- 結果Routeは`/checkout/complete?orderId=...`または`/checkout/failed?orderId=...`とし、表示前にOrder所有者または管理権限を検証する。
- 郵便番号補完は外部APIを使わず、同梱した学習用辞書から候補を返す。候補は利用者が適用し、未一致でも手入力を続行できる。

## 5. 在庫

- 在庫はSKU単位の0以上整数。管理FilterとOverviewでは、`out=0`、`low=1～5`、`available=1以上`として扱い、在庫0を低在庫件数へ含めない。
- Cart追加・Order作成では減算しない。
- Payment成功確定Txで再検証・減算する。
- Mockが成功候補を返しても、最終在庫再検証で不足した場合はPayment failed（errorCode=`OUT_OF_STOCK`）、Order payment_failedとして確定し、在庫とInventory Historyを変更しない。Local Mockのため実課金済み不整合は発生しない。
- すべての管理調整と購入減算を履歴へ保存する。

## 6. 模擬Payment

| Code | 結果 | Error表示 |
|---|---|---|
| TEST-SUCCESS | succeeded | なし |
| TEST-DECLINED | failed | 支払いが拒否されました |
| TEST-INSUFFICIENT | failed | 残高不足として処理できませんでした |
| TEST-AUTH-FAILED | failed | 本人確認に失敗しました |

- Mockは外部通信せず、CodeとAttempt Keyから決定的な結果を返す。
- 同じAttempt Keyは同じ結果を返す。
- 通常Delayは500msを初期値とし、Test Controlで変更可能。
- Gateway呼出し中にApp DB Txを保持しない。
- 明確なfailedだけ再Payment可能。
- Payment processing中はCancel・再試行不可。`/checkout/processing?orderId=...`はOrder所有権、Order pending_payment、最新Payment processingを検証して表示・再開する。
- 再起動後または確定書込み失敗後にprocessingが残る場合、同じAttempt Keyで再実行する。Local Mockは決定的なので結果は変わらない。最新Attemptが既にsucceeded/failedならGatewayを再実行せず既存結果を返す。競合時は最新状態を再取得し、他処理が確定済みなら同じ完了結果を返す。
- Timeout/Unknown/ReconciliationはPhase 3。

## 7. Order・採番

- `ORD-YYYYMMDD-NNNN`。日付はClockのAsia/Tokyo。
- `daily_sequences`をOrder作成Tx内で更新する。
- Order作成時点で商品、価格、住所をSnapshot保存する。
- Order ItemはCart Itemの`createdAt`昇順、同値はitemId昇順でlineNumberを1から採番する。注文詳細はlineNumber順、注文一覧の代表画像はlineNumber=1を使用する。
- Orderは物理削除しない。

### Phase 1状態

```text
pending_payment
├─ payment_failed ── retry ──> pending_payment
└─ paid → preparing → shipped → delivered
```

- `paid → preparing`はoperator/adminの準備開始操作で行う。
- 状態を飛び越えたり逆戻りさせたりしない。
- 顧客画面では内部状態名ではなく、現在状態、次に行われること、利用可能Actionを表示する。

## 8. 配送

- 準備開始時にShipment `pending`を作成する。
- 発送時にcarrierName、trackingNumber、shippedAtを必須とする。
- Order `preparing→shipped`とShipment `pending→shipped`を同一Txで更新する。
- 配送完了時にOrder `shipped→delivered`とShipment `shipped→delivered`を同一Txで更新する。

## 9. Review

- customer本人のdelivered注文明細だけ投稿可能。
- 注文明細1件につき1件。論理削除後も同じorderItemIdのRecordを保持するため再投稿不可。
- publishedだけ商品集計へ含める。
- Review状態変更とSummaryを同一Txで更新する。
- 星評価UIはRadio Groupとする。

## 10. Admin操作

- operator/adminは購入不可。
- adminだけRank、Role、Account Statusを変更できる。Phase 1ではRankはcustomer内、Roleはoperator/admin間、Statusはactive/suspended間だけを許可し、変更理由を入力・保存しない。Role/Status変更時は対象Userの全Sessionを同一Txで無効化する。customerをsuspendedへ変更する場合はactive Checkoutもabandonedへ変更し、Cartは保持する。
- 最後のactive adminを停止・降格できない。
- Overviewは発送準備待ち、低在庫、非公開Review、最近のOrderを表示する。売上集計は行わない。
- Bulk Actionは商品公開/非公開、Review非公開/再公開だけ。
- Bulk Actionは各Resourceの通常Ruleを個別に検証し、部分成功を許可する。結果に成功件数と失敗対象を含める。
- Password変更・退会の詳細はPhase 2。

## 11. Test Control

- Reset、Seed、Clock、Payment Delayだけを提供する。
- ResetはApp DBとSessionを削除し、指定Seedを投入する。
- 任意DB書換え、Import/Export、任意Fault ScriptはPhase 1へ含めない。

## 12. 将来業務Rule

- Phase 2: Guest Checkout再評価、未発送Cancel、Cancel申請、Return、全額Refund、退会。
- Phase 3: Payment Unknown、Gateway Ledger、Reconciliation、Migration/Import/Export。

## 11. 実装境界の補足

- Login/RegisterのPassword照合はDB Transaction外で行う。認証成功後、Use CaseはSession IDを生成してCurrentSessionStoreへ先に設定し、成功した場合だけSession作成とGuest Cart統合の単一Txを開始する。Tx失敗時はCurrentSessionStoreをclearし、DB Sessionを作成せずGuest Cartを保持する。Local Storage設定失敗時はTxを開始しない。起動時はCurrentSessionStoreが存在してDB Sessionがない場合にpointerをclearする。
- active Cartの取得または作成は単一Txで行い、Unique競合時は既存Cartを再取得する。
- 手動在庫調整は数量更新とInventory History作成を単一Txで行う。
- Checkout Session期限はApp起動、Checkout Route Guard、Checkout開始時に判定する。
- Search SuggestionはRequest Sequence IDまたはAbortControllerで最新入力の結果だけを表示する。
