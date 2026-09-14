# Seed Catalog

## 1. 共通基準

| 項目 | 値 |
|---|---|
| 基準時刻 | `2026-07-01T03:00:00.000Z`（日本時間12:00） |
| Schema Version | `1` |
| Seed Version | [`SEED_VERSION`](../../src/config/versions.ts)（Current SSOT） |
| 固定Password | `testpass1` |
| Guest ID | `guest-default-001` |
| Image Manifest Version | `1` |
| Payment Delay | 500ms |

Seed中の相対日時はClock基準で生成し、実行日へ依存しません。

## 2. 固定Account

| ID | Email | Role/Rank/Status |
|---|---|---|
| user-customer-regular | <regular@example.com> | customer/regular/active |
| user-customer-gold | <gold@example.com> | customer/gold/active |
| user-customer-platinum | <platinum@example.com> | customer/platinum/active |
| user-customer-suspended | <suspended@example.com> | customer/regular/suspended |
| user-customer-withdrawn | <withdrawn@example.com> | customer/regular/withdrawn |
| user-operator | <operator@example.com> | operator/-/active |
| user-admin | <admin@example.com> | admin/-/active |

### 2.1 Seed Password Hash

- 固定Passwordは`testpass1`。
- Seed生成ScriptはUserごとに`SHA-256("scenario-shop-seed:" + userId)`の先頭16byteをSaltとして使用する。
- `PBKDF2-SHA-256 / 210,000回 / 32byte`でHashを生成し、`pbkdf2-sha256$210000$saltBase64$hashBase64`形式で保存する。
- Runtime Seed投入Dataに平文Passwordを含めない。固定PasswordはE2E Fixtureと本書だけで管理する。

## 3. Category・Brand

| ID | 表示名 | 備考 |
|---|---|---|
| category-apparel | ファッション | 1階層 |
| category-home | ホーム・キッチン | 1階層 |
| category-sports | スポーツ | 1階層 |
| category-accessories | バッグ・小物 | 1階層 |
| brand-scenario-basics | Scenario Basics | active |
| brand-scenario-life | Scenario Life | active |
| brand-scenario-active | Scenario Active | active |

Homeの主要Category順はファッション、ホーム・キッチン、スポーツ、バッグ・小物です。

## 4. 代表商品

| Product ID | Code | 商品 | Category/Brand | 状態・Rank | SKU/価格/在庫 |
|---|---|---|---|---|---|
| product-basic-shirt | P-0001 | ベーシックTシャツ | ファッション/Basics | published/null | S:2,000円/20、M:2,000円/10、L:2,000円/0 |
| product-mug | P-0002 | セラミックマグ | ホーム/Basics | published/null | ONE:1,500円/50 |
| product-running-shoes | P-0003 | ランニングシューズ | スポーツ/Active | published/gold | 26:8,000円、Sale6,400円/5 |
| product-premium-bag | P-0004 | プレミアムバッグ | バッグ・小物/Life | published/platinum | ONE:12,000円/2 |
| product-low-stock | P-0005 | コンパクトタオル | ホーム/Life | published/null | ONE:900円/3 |
| product-out-of-stock | P-0006 | スポーツボトル | スポーツ/Active | published/null | ONE:1,200円/0 |
| product-unpublished | P-0007 | 非公開商品 | ファッション/Basics | unpublished/null | ONE:3,000円/10 |
| product-draft | P-0008 | 下書き商品 | ホーム/Life | draft/null | ONE:4,000円/10 |
| product-discontinued | P-0009 | 販売終了商品 | バッグ・小物/Life | discontinued/null | ONE:2,500円/0 |
| product-variation-12 | P-0010 | 12色カラーポーチ | バッグ・小物/Life | published/null | COLOR-01～12:1,800円、Sale1,500円/各5 |
| product-variation-13 | P-0011 | 13サイズトレーニングウェア | スポーツ/Active | published/null | SIZE-01～13:3,500～4,700円/各5 |

Sale期間は基準時刻の1日前から1日後です。

### 4.0 初回公開日時

| Product ID | publishedAt |
|---|---|
| product-variation-13 | 2026-06-30T03:00:00.000Z |
| product-variation-12 | 2026-06-29T03:00:00.000Z |
| product-low-stock | 2026-06-28T03:00:00.000Z |
| product-premium-bag | 2026-06-27T03:00:00.000Z |
| product-running-shoes | 2026-06-26T03:00:00.000Z |
| product-mug | 2026-06-25T03:00:00.000Z |
| product-basic-shirt | 2026-06-24T03:00:00.000Z |
| product-out-of-stock | 2026-06-23T03:00:00.000Z |
| product-unpublished | 2026-06-20T03:00:00.000Z |
| product-discontinued | 2026-06-10T03:00:00.000Z |
| product-draft | null |

新着順はこの`publishedAt`降順、同値はproductCode昇順です。非公開・販売終了商品はStorefrontへ表示しません。

## 4.1 GitHub画像Asset

| assetId | Path | 主な利用商品 | active |
|---|---|---|---:|
| asset-shirt-front | `/images/products/basic-shirt-front.a1b2c3.webp` | ベーシックTシャツPrimary | ○ |
| asset-shirt-back | `/images/products/basic-shirt-back.d4e5f6.webp` | ベーシックTシャツSub | ○ |
| asset-mug | `/images/products/mug.11aa22.webp` | セラミックマグ | ○ |
| asset-running-shoes | `/images/products/running-shoes.33bb44.webp` | ランニングシューズ | ○ |
| asset-placeholder-retired | `/images/products/retired.55cc66.webp` | 既存参照確認用 | × |

全published商品は1～3件のAsset関連とPrimary 1件を持ちます。新規draft商品は画像0件で保存可能ですが公開不可です。

## 5. Home期待値

| Section | Product ID順 |
|---|---|
| 新着商品 | product-variation-13、product-variation-12、product-low-stock、product-premium-bag、product-running-shoes、product-mug、product-basic-shirt、product-out-of-stock |
| Sale商品 | product-variation-12、product-running-shoes |

Home SectionはViewer条件を適用します。未Loginではgold/platinum限定商品を表示しません。Sale Sectionは未Loginでも12色カラーポーチを表示し、gold Login時はランニングシューズも追加します。platinum Login時は限定商品の閲覧範囲がさらに広がります。 在庫切れはStorefrontから除外せず、購入不可状態を表示するため、`product-out-of-stock`も新着上限8件に含みます。

## 6. Review Summary期待値

| Product | publishedCount | ratingTotal | average | 5★ | 4★ | 3★ | 2★ | 1★ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| product-basic-shirt | 2 | 9 | 4.5 | 1 | 1 | 0 | 0 | 0 |
| product-mug | 3 | 11 | 11 / 3（保存値は未丸め） | 1 | 1 | 1 | 0 | 0 |
| product-running-shoes | 4 | 18 | 4.5 | 2 | 2 | 0 | 0 | 0 |
| Reviewなし商品 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

`publishedCount=0`では`ratingAverage=0`、それ以外は`ratingTotal / publishedCount`を丸めず保存します。表示時だけ小数第1位へ丸め、Sort・Filterも保存済みの未丸め`ratingAverage`を使用します。JavaScript Numberの表現差を避けるため、Seed検証では`ratingTotal / publishedCount`との許容誤差`1e-12`以内を確認します。

## 7. Search・Filter期待値

| 入力 | 期待 |
|---|---|
| Suggestion `ラン` | 商品「ランニングシューズ」を返す |
| Suggestion `スポ` | Category「スポーツ」、商品「スポーツボトル」を返す |
| Suggestion `Scenario` | Brand 3件を返し、最大8件以内 |
| `onSale=true`、gold Viewer | 12色カラーポーチ、ランニングシューズの2件 |
| `inStock=true` | 在庫0 SKUしか持たない商品を除外 |
| `minRating=4` | 平均4.0以上かつReviewありの商品だけ |
| Brand=Scenario Active | Viewer条件を満たすActive Brand商品 |
| 組合せ0件 | Applied Filterを保持し、復旧Actionを表示 |

Facet件数はViewerと他Filterを適用し、対象Facet自身の選択だけを除外して計算します。

## 7.1 複数SKU一覧価格期待値

- `product-variation-13`はregular Viewerで`3,500円〜4,700円`と表示する。
- 価格昇順・降順は`minimumViewerUnitPrice=3,500円`を主Keyにする。
- 価格Filter 4,600～4,800円では、対象価格のactive SKUを持つため商品を含める。
- gold Viewerでは会員割引後の最小・最大価格を使用する。

## 8. 価格期待値

| Case | 明細 | 小計 | 割引 | 送料 | 合計 |
|---|---|---:|---:|---:|---:|
| regular送料無料 | Tシャツ×2 + マグ×1 | 5,500円 | 0円 | 0円 | 5,500円 |
| gold同一Cart | 同上 | 5,500円 | 275円 | 0円 | 5,225円 |
| platinum同一Cart | 同上 | 5,500円 | 550円 | 0円 | 4,950円 |
| regular送料あり | Tシャツ×1 | 2,000円 | 0円 | 500円 | 2,500円 |
| gold端数境界 | 999円SKU×2 | 1,998円 | 98円（floor(999×5%)=49円×2） | 500円 | 2,400円 |
| gold Sale商品 | シューズ×1 | 6,400円 | 320円 | 0円 | 6,080円 |

regularでTシャツ1件の場合、送料無料不足額は3,000円です。

## 9. 学習用住所辞書

| 郵便番号 | 都道府県 | 市区町村 |
|---|---|---|
| 1000001 | 東京都 | 千代田区千代田 |
| 1500001 | 東京都 | 渋谷区神宮前 |
| 5300001 | 大阪府 | 大阪市北区梅田 |

上記以外は候補なしとし、手入力を続行できます。

## 10. default

- Account 7件、商品11件、Category 4件、Brand 3件。
- regular customerのactive CartにTシャツM×1。
- Orderはpayment_failed、paid、preparing、shipped、deliveredを各1件。
- Paymentは各Order状態と整合する。
- Shipmentはpreparing/pending、shipped/shipped、delivered/delivered。
- Review Summaryは本書6章の期待値に一致する。
- Admin Overviewは発送準備待ち1件、低在庫SKUは在庫1～5のSKU件数、非公開Review1件、最近のOrder最大5件。

## 11. Phase 1 Scenario

| Scenario | 差分・期待 |
|---|---|
| empty-catalog | Product、Variant、ProductImage、Cart/Cart Item、Checkout Session、Order/Order Item/Order History、Payment、Shipment、Review/Review History/Review Summary、Inventory Historyを0件にする。User、Category、Brand、Sequence・Seed Metadataだけを保持し、User AddressとSessionは0件とする。Home商品Sectionと商品Navigation件数はEmpty |
| many-products | 1,000商品、3,000 SKUを固定規則で生成 |
| out-of-stock | TシャツMを0 |
| low-stock | TシャツMを3 |
| sale-active | シューズ6,400円 |
| expired-sale | ClockをSale終了後へ固定し8,000円 |
| regular-member | regularでLogin済み、Tシャツ×2+マグ×1 Cart |
| gold-member | goldでLogin済み、同一Cart、合計5,225円 |
| platinum-member | platinumでLogin済み、同一Cart、合計4,950円 |
| suspended-user | suspendedのSessionを残し、保護操作で無効化 |
| cart-with-invalid-items | 価格変更、非公開、在庫不足、無効SKU各1件。参照先が存在しない破損DataはPhase 1対象外 |
| payment-declined | payment_failed Orderとfailed Attemptを用意 |
| payment-processing | processing AttemptとorderIdを用意し、`/checkout/processing?orderId=...`再読込後に同じAttemptを確定 |
| orders-phase1-statuses | Phase 1の全Order状態を1件以上用意 |
| reviewable-orders | delivered 2件、未Review Order Item 3件 |
| hidden-reviews | published/hidden/deleted各1件、Summaryはpublishedだけ |
| guest-cart-merge-overflow | 会員Cart3点、Guest Cart4点、購入上限5点。5点へ統合し2点を超過として表示 |
| checkout-resume | 同じCart ID/Versionのactive Sessionを用意し再開する |
| checkout-replaced | 異なるCart Versionのactive Sessionをabandonedへ変更して新規作成 |
| cart-version-invalidates-checkout | active Checkout作成後にCart Itemを変更し親Cart versionが増加。Checkout再開時にCartへ戻す |
| inactive-image-existing-link | inactive Assetを既存商品が参照。商品名変更は保存可能、解除後の再関連付けは拒否 |
| product-aggregate-edit | draft商品、既存SKU、新規SKU、画像Asset候補を用意しAggregate更新を検証 |
| cross-role-product-lifecycle | adminが新規商品を登録・公開できる空きCode/SKUとAssetを用意し、customer購入・配送・Reviewまで継続 |
| product-delete-blocked | Cart参照ありdraft商品を用意し物理削除を拒否 |
| admin-bulk-partial-failure | 商品/Reviewの一部を競合versionにし、Bulk部分成功を再現 |
| storage-write-failure | Repository Test Adapterで次の書込みだけ失敗。UI E2Eの必須Scenarioにはしない |

Scenario Resetはdefaultへの差分Patchではなく、対象Scenarioの完全なDatasetを新規投入する。すべてのScenarioは外部Key参照と集計値が投入完了時点で整合していなければならない。

## 12. many-products生成規則

- Product ID `load-product-0001`～`1000`。
- 各商品3 SKU、SKU ID末尾`-a/-b/-c`。
- regularPrice = `500 + (商品番号 % 50) * 100`。3 SKUのうちbは+100円、cは+200円として価格幅を作る。
- stock = `商品番号 % 21`。
- rating = `(商品番号 % 5) + 1`、published Review 1件。
- Category/Brandは番号modで決定。
- 10件ごとにSale SKUを1件設定する。
- 同時刻時はproductCodeでSortを確定する。

## 13. Seed変更Rule

- 固定ID・期待金額・Home順・Facet期待を変更する場合はSeed Versionを上げる。
- E2E参照値は本書、Seed Metadata JSON、Image Manifest参照へ同時反映する。
- Phase 2/3 ScenarioをPhase 1 Seedへ混在させない。
