# Seedカタログ

## 1. 共通基準

| 項目 | 値 |
|---|---|
| 基準時刻 | `2026-07-01T03:00:00.000Z`（日本時間12:00） |
| スキーマバージョン（Schema Version） | `1` |
| シードバージョン（Seed Version） | [`SEED_VERSION`](../../src/config/versions.ts)（Current SSOT） |
| 固定パスワード | `testpass1` |
| ゲストID（Guest ID） | `guest-default-001` |
| 画像マニフェストバージョン | `1` |
| 支払い遅延（Payment Delay） | 500ms |

シード内の相対日時はシステムクロック（Clock）基準で生成され、テストの実行日には依存しません。

## 2. 固定アカウント

| ID | メールアドレス（Email） | ロール / ランク / ステータス（Role/Rank/Status） |
|---|---|---|
| user-customer-regular | <regular@example.com> | customer/regular/active |
| user-customer-gold | <gold@example.com> | customer/gold/active |
| user-customer-platinum | <platinum@example.com> | customer/platinum/active |
| user-customer-suspended | <suspended@example.com> | customer/regular/suspended |
| user-customer-withdrawn | <withdrawn@example.com> | customer/regular/withdrawn |
| user-operator | <operator@example.com> | operator/-/active |
| user-admin | <admin@example.com> | admin/-/active |

### 2.1 シードのパスワードハッシュ

- 固定パスワードは `testpass1` です。
- シード生成スクリプトは、ユーザーごとに `SHA-256("scenario-shop-seed:" + userId)` の先頭16バイトをソルト（Salt）として使用します。
- `PBKDF2-SHA-256 / 210,000回 / 32バイト` でハッシュを生成し、`pbkdf2-sha256$210000$saltBase64$hashBase64` 形式で保存します。
- ランタイムのシード投入データには平文パスワードを含めません。固定パスワードはE2Eフィクスチャ（Fixture）および本書のみで管理します。

## 3. カテゴリ・ブランド

| ID | 表示名 | 備考 |
|---|---|---|
| category-apparel | ファッション | 1階層 |
| category-home | ホーム・キッチン | 1階層 |
| category-sports | スポーツ | 1階層 |
| category-accessories | バッグ・小物 | 1階層 |
| brand-scenario-basics | Scenario Basics | active |
| brand-scenario-life | Scenario Life | active |
| brand-scenario-active | Scenario Active | active |

ホーム画面における主要カテゴリの表示順は、ファッション、ホーム・キッチン、スポーツ、バッグ・小物の順です。

## 4. 代表商品

| 商品ID（Product ID） | コード | 商品名 | カテゴリ / ブランド | 状態・ランク | SKU / 価格 / 在庫 |
|---|---|---|---|---|---|
| product-basic-shirt | P-0001 | ベーシックTシャツ | ファッション/Basics | published/null | S:2,000円/20、M:2,000円/10、L:2,000円/0 |
| product-mug | P-0002 | セラミックマグ | ホーム/Basics | published/null | ONE:1,500円/50 |
| product-running-shoes | P-0003 | ランニングシューズ | スポーツ/Active | published/gold | 26:8,000円、セール6,400円/5 |
| product-premium-bag | P-0004 | プレミアムバッグ | バッグ・小物/Life | published/platinum | ONE:12,000円/2 |
| product-low-stock | P-0005 | コンパクトタオル | ホーム/Life | published/null | ONE:900円/3 |
| product-out-of-stock | P-0006 | スポーツボトル | スポーツ/Active | published/null | ONE:1,200円/0 |
| product-unpublished | P-0007 | 非公開商品 | ファッション/Basics | unpublished/null | ONE:3,000円/10 |
| product-draft | P-0008 | 下書き商品 | ホーム/Life | draft/null | ONE:4,000円/10 |
| product-discontinued | P-0009 | 販売終了商品 | バッグ・小物/Life | discontinued/null | ONE:2,500円/0 |
| product-variation-12 | P-0010 | 12色カラーポーチ | バッグ・小物/Life | published/null | COLOR-01～12:1,800円、セール1,500円/各5 |
| product-variation-13 | P-0011 | 13サイズトレーニングウェア | スポーツ/Active | published/null | SIZE-01～13:3,500～4,700円/各5 |

セール期間は基準時刻の1日前から1日後までです。

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

新着順の並び順はこの `publishedAt` の降順とし、同一日時の場合は `productCode` の昇順とします。なお、非公開商品および販売終了商品はストアフロントには表示されません。

## 4.1 GitHub画像アセット

| assetId | パス（Path） | 主な利用商品 | 有効状態（active） |
|---|---|---|---:|
| asset-shirt-front | `/images/products/basic-shirt-front.a1b2c3.webp` | ベーシックTシャツ（メイン） | ○ |
| asset-shirt-back | `/images/products/basic-shirt-back.d4e5f6.webp` | ベーシックTシャツ（サブ） | ○ |
| asset-mug | `/images/products/mug.11aa22.webp` | セラミックマグ | ○ |
| asset-running-shoes | `/images/products/running-shoes.33bb44.webp` | ランニングシューズ | ○ |
| asset-placeholder-retired | `/images/products/retired.55cc66.webp` | 既存参照確認用 | × |

公開（published）状態の全商品は、1〜3件の画像アセットの関連付けを持ち、そのうち1件がメイン画像（Primary）となります。新規の下書き（draft）商品は画像0件でも保存可能ですが、そのまま公開することはできません。

## 5. ホーム画面の期待値

| セクション | 商品ID順 |
|---|---|
| 新着商品 | product-variation-13、product-variation-12、product-low-stock、product-premium-bag、product-running-shoes、product-mug、product-basic-shirt、product-out-of-stock |
| セール商品 | product-variation-12、product-running-shoes |

ホーム画面の各セクションには、閲覧者（Viewer）の権限条件が適用されます。未ログイン状態では、gold/platinum会員限定の商品は表示されません。セールセクションでは、未ログイン状態でも「12色カラーポーチ」が表示され、gold会員としてログインした際には「ランニングシューズ」も追加表示されます。platinum会員としてログインした場合は、限定商品の閲覧範囲がさらに広がります。
また、在庫切れ商品はストアフロントから除外されず購入不可状態として表示されるため、`product-out-of-stock` も新着商品の表示上限8件に含まれます。

## 6. レビュー集計の期待値

| 商品（Product） | publishedCount | ratingTotal | average | 5★ | 4★ | 3★ | 2★ | 1★ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| product-basic-shirt | 2 | 9 | 4.5 | 1 | 1 | 0 | 0 | 0 |
| product-mug | 3 | 11 | 11 / 3（保存値は未丸め） | 1 | 1 | 1 | 0 | 0 |
| product-running-shoes | 4 | 18 | 4.5 | 2 | 2 | 0 | 0 | 0 |
| レビューなし商品 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

`publishedCount=0` の場合は `ratingAverage=0` とし、それ以外の場合は `ratingTotal / publishedCount` の計算結果を丸めずにそのまま保存します。画面表示時のみ小数第1位に丸めて表示し、ソートやフィルター処理には保存されている未丸めの `ratingAverage` を使用します。JavaScriptの数値型（Number）における表現誤差を考慮し、シードデータの検証では `ratingTotal / publishedCount` との許容誤差が $10^{-12}$（`1e-12`）以内であることを確認します。

## 7. 検索・フィルターの期待値

| 入力 | 期待される結果 |
|---|---|
| サジェスト `ラン` | 商品「ランニングシューズ」を返す |
| サジェスト `スポ` | カテゴリ「スポーツ」、商品「スポーツボトル」を返す |
| サジェスト `Scenario` | ブランド3件を返し、最大8件以内とする |
| `onSale=true`、gold会員閲覧時 | 12色カラーポーチ、ランニングシューズの2件 |
| `inStock=true` | 在庫0のSKUしか持たない商品を除外 |
| `minRating=4` | 平均4.0以上かつレビューが存在する商品のみ |
| Brand=Scenario Active | 閲覧者条件を満たすActiveブランドの商品 |
| 該当0件の組み合わせ | 適用済みフィルター（Applied Filter）を保持し、復旧アクションを表示 |

ファセット（Facet）件数の算出では、閲覧者条件（Viewer）および他のフィルター条件を適用し、対象ファセット自身の選択条件のみを除外して件数を計算します。

## 7.1 複数SKUを持つ商品の一覧価格期待値

- `product-variation-13` は、一般閲覧者（regular Viewer）に対して `3,500円〜4,700円` と表示します。
- 価格の昇順・降順ソートでは、`minimumViewerUnitPrice=3,500円` を主キーとして使用します。
- 価格フィルター「4,600円〜4,800円」を指定した場合、該当する価格帯の有効（active）なSKUを保持しているため、検索結果に対象商品を含めます。
- gold会員の閲覧者（gold Viewer）には、会員割引適用後の最小価格および最大価格を表示・使用します。

## 8. 価格の期待値

| ケース | 明細 | 小計 | 割引 | 送料 | 合計 |
|---|---|---:|---:|---:|---:|
| regular送料無料 | Tシャツ×2 + マグ×1 | 5,500円 | 0円 | 0円 | 5,500円 |
| gold同一カート | 同上 | 5,500円 | 275円 | 0円 | 5,225円 |
| platinum同一カート | 同上 | 5,500円 | 550円 | 0円 | 4,950円 |
| regular送料あり | Tシャツ×1 | 2,000円 | 0円 | 500円 | 2,500円 |
| gold端数境界 | 999円SKU×2 | 1,998円 | 98円（floor(999×5%)=49円×2） | 500円 | 2,400円 |
| goldセール商品 | シューズ×1 | 6,400円 | 320円 | 0円 | 6,080円 |

一般会員（regular）でTシャツ1点のみを購入する場合、送料無料の適用基準額までの不足額は3,000円です。

## 9. 学習用住所辞書

| 郵便番号 | 都道府県 | 市区町村 |
|---|---|---|
| 1000001 | 東京都 | 千代田区千代田 |
| 1500001 | 東京都 | 渋谷区神宮前 |
| 5300001 | 大阪府 | 大阪市北区梅田 |

上記以外の郵便番号では候補を表示せず、ユーザー自身による手入力を続行できるようにします。

## 10. デフォルト状態（default）

- アカウント7件、商品11件、カテゴリ4件、ブランド3件。
- 一般顧客（regular customer）のアクティブなカートに「ベーシックTシャツ（M）」を1点保持。
- 注文（Order）は、payment_failed、paid、preparing、shipped、delivered の各ステータスを1件ずつ用意。
- 決済（Payment）は、各注文のステータスと整合性を保つ。
- 配送（Shipment）のステータスは、preparingに対してpending、shippedに対してshipped、deliveredに対してdeliveredとする。
- レビュー集計（Review Summary）は、本書第6章の期待値と一致させる。
- 管理者ダッシュボード（Admin Overview）では、発送準備待ち1件、低在庫SKU（在庫数1〜5のSKU件数）、非公開レビュー1件、直近の注文最大5件を表示。

## 11. Phase 1のシナリオ

| シナリオ名 | 差分および期待される挙動 |
|---|---|
| empty-catalog | 商品（Product）、バリエーション（Variant）、商品画像（ProductImage）、カートおよびカート内商品（Cart / Cart Item）、チェックアウトセッション（Checkout Session）、注文・注文明細・注文履歴（Order / Order Item / Order History）、決済（Payment）、配送（Shipment）、レビュー・レビュー履歴・レビュー集計（Review / Review History / Review Summary）、在庫履歴（Inventory History）をすべて0件とします。ユーザー（User）、カテゴリ（Category）、ブランド（Brand）、シーケンス（Sequence）、シードメタデータ（Seed Metadata）のみを保持し、ユーザー住所（User Address）およびセッション（Session）は0件とします。ホーム画面の商品セクションおよび商品ナビゲーションの件数は空（Empty）となります。 |
| many-products | 1,000件の商品、3,000件のSKUを固定ルールに基づいて生成します。 |
| out-of-stock | 「ベーシックTシャツ（M）」の在庫数を0にします。 |
| low-stock | 「ベーシックTシャツ（M）」の在庫数を3にします。 |
| sale-active | 「ランニングシューズ」の価格をセール価格の6,400円にします。 |
| expired-sale | クロックをセール終了後の日時に固定し、通常価格の8,000円とします。 |
| regular-member | 一般会員（regular）としてログイン済みの状態とし、カートに「Tシャツ×2、マグ×1」を保持します。 |
| gold-member | gold会員としてログイン済みの状態とし、同一カート内容で合計金額が5,225円となることを確認します。 |
| platinum-member | platinum会員としてログイン済みの状態とし、同一カート内容で合計金額が4,950円となることを確認します。 |
| suspended-user | 利用停止（suspended）ユーザーのセッションを残した状態とし、保護された操作の実行時にセッションが無効化されることを確認します。 |
| cart-with-invalid-items | 価格変更、非公開化、在庫不足、無効なSKUを含むカート内商品を各1件ずつ用意します。なお、参照先が存在しない破損データはPhase 1の対象外とします。 |
| payment-declined | 決済失敗（payment_failed）の注文と、失敗した試行（failed Attempt）を用意します。 |
| payment-processing | 処理中（processing）の試行（Attempt）と orderId を用意し、`/checkout/processing?orderId=...` の再読み込み後に同じ試行が確定されることを確認します。 |
| orders-phase1-statuses | Phase 1で定義されているすべての注文ステータスを各1件以上用意します。 |
| reviewable-orders | 配達完了（delivered）の注文を2件、未レビューの注文商品（Order Item）を3件用意します。 |
| hidden-reviews | 公開（published）、非公開（hidden）、削除済み（deleted）のレビューを各1件ずつ用意し、レビュー集計（Review Summary）には公開（published）分のみが反映されることを確認します。 |
| guest-cart-merge-overflow | 会員カートに3点、ゲストカートに4点が存在し、購入上限が5点の場合の検証です。カート統合時に5点にまとめられ、上限を超過した2点については超過分として警告・案内が表示されることを確認します。 |
| checkout-resume | 同一のカートIDおよびバージョンを持つアクティブなチェックアウトセッションを用意し、中断したチェックアウトを再開します。 |
| checkout-replaced | 異なるカートバージョンを持つアクティブなセッションを破棄（abandoned）に変更したうえで、新規チェックアウトセッションを作成します。 |
| cart-version-invalidates-checkout | アクティブなチェックアウトセッション作成後にカート内商品が変更され、親カートのバージョンが増加した状態を再現します。チェックアウト再開時には自動的にカート画面へ差し戻されることを確認します。 |
| inactive-image-existing-link | 非アクティブ（inactive）な画像アセットを既存商品が参照している状態を再現します。商品名の変更などの更新は保存可能ですが、一度参照を解除した後に再関連付けすることは拒否されます。 |
| product-aggregate-edit | 下書き（draft）商品、既存SKU、新規追加SKU、画像アセット候補を用意し、集約（Aggregate）単位での一括更新が正しく行われるかを検証します。 |
| cross-role-product-lifecycle | 管理者（admin）が新規商品を登録・公開できるよう、未使用のコード／SKUおよびアセットを用意し、顧客（customer）による購入、配送、レビュー投稿に至る一連のライフサイクルを継続検証します。 |
| product-delete-blocked | カートから参照されている下書き（draft）商品を用意し、物理削除が拒否されることを検証します。 |
| admin-bulk-partial-failure | 商品やレビューの一部をあらかじめ競合バージョンにしておき、一括処理（Bulk）時の部分的な失敗と成功が正しく再現されるかを検証します。 |
| storage-write-failure | リポジトリテストアダプター（Repository Test Adapter）を用いて、次回の書き込み処理のみを意図的に失敗させます。なお、本シナリオはUI E2Eテストの必須シナリオには含めません。 |

シナリオのリセット（Scenario Reset）は、デフォルト状態に対する差分パッチではなく、対象シナリオの完全なデータセットを新規に再投入することで行います。すべてのシナリオにおいて、投入完了時点で外部キー参照および各集計値の整合性が保たれていなければなりません。

## 12. many-products生成規則

- 商品ID（Product ID）：`load-product-0001` 〜 `load-product-1000`。
- 各商品に3件のSKUを設定し、SKU IDの末尾を `-a` / `-b` / `-c` とする。
- 通常価格（regularPrice）：`500 + (商品番号 % 50) * 100`。3つのSKUのうち、`-b` は通常価格 + 100円、`-c` は通常価格 + 200円として価格幅を持たせる。
- 在庫数（stock）：`商品番号 % 21`。
- 評価（rating）：`(商品番号 % 5) + 1` とし、公開レビュー（published Review）を1件設定する。
- カテゴリおよびブランド：商品番号の剰余（mod）により決定する。
- 10商品ごとに1件のセール対象SKUを設定する。
- 公開日時が同一の場合は、`productCode` の昇順でソート順を確定する。

## 13. Seed変更ルール

- 固定ID、期待金額、ホーム画面の表示順、ファセット集計の期待値を変更する場合は、シードバージョン（Seed Version）をインクリメント（更新）します。
- E2Eテストの参照値は、本書、シードメタデータJSON、および画像マニフェスト参照のすべてへ同時に反映します。
- Phase 2およびPhase 3のシナリオを、Phase 1のシードデータへ混在させてはなりません。