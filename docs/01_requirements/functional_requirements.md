# 機能要件

本ファイルはPhase 1の実装要件を定義します。Phase 2・3は末尾の将来要件だけを方向性として保持し、開始時に再詳細化します。

## 1. 認証・アカウント

| ID | 要件 |
|---|---|
| FR-AU-001 | activeなcustomer/operator/adminは固定テストアカウントまたは新規登録customerアカウントでログインでき、customerだけGuest Cartを統合し、operator/adminはSessionだけを作成すること |
| FR-AU-002 | 未ログイン利用者は公開商品の閲覧、ゲストカートへの追加、`/cart`での閲覧・数量変更・削除ができること |
| FR-AU-003 | Checkoutを開始できるのはactiveなcustomerだけであること |
| FR-AU-004 | active customerのLogin成功時にゲストカートを会員カートへ統合し、統合結果を表示すること。operator/adminはGuest Cartを変更しないこと |
| FR-AU-005 | suspended・withdrawnアカウントはログインできないこと |
| FR-AU-006 | 顧客はプロフィールと最大5件の配送先を登録・編集・削除できること |
| FR-AU-007 | 管理者はcustomerの会員ランク、active/suspended状態、operator/admin間のロールを変更できること。customerとのロール変更とwithdrawnへの変更はPhase 1対象外であること |
| FR-AU-008 | 最後の有効な管理者を停止またはoperatorへ変更できず、管理者自身の停止・降格を拒否すること |
| FR-AU-009 | operator/adminは購入者機能を利用できないこと |
| FR-AU-010 | Default配送先の作成・変更・削除時に旧Default解除または後継選択を同一Transactionで行うこと |
| FR-AU-011 | customerのLogin/RegisterではSession作成とGuest Cart統合を同一Transactionで行い、operator/adminのLoginではSessionだけを作成し、失敗時はSessionを作成せずGuest Cartを保持すること |
| FR-AU-012 | accountStatusまたはoperator/adminロール変更時に対象Userの全Sessionを同一Transactionで無効化すること |
| FR-AU-013 | EmailはTrim・Unicode NFKC・Locale非依存小文字化した値を保存・検索・一意判定に使用すること |
| FR-AU-014 | customerの会員ランク変更時に対象Userのactive Checkout Sessionを同一Transactionでabandonedへ変更し、Cartを保持すること |
| FR-AU-015 | customerをsuspendedへ変更する際に全Session無効化とactive Checkout Sessionのabandonedを同一Transactionで行い、Cartを保持すること |
| FR-AU-016 | 最初の配送先は自動的にDefaultとし、既存Defaultの更新でDefault指定を外すだけの操作は許可せず、Default削除時はcreatedAt昇順・id昇順で後継を決定すること |

## 2. 商品探索・商品・カテゴリ・ブランド

| ID | 要件 |
|---|---|
| FR-PR-001 | 利用者は公開中かつ閲覧条件を満たす商品を一覧表示できること |
| FR-PR-002 | 商品をキーワード、カテゴリ、ブランド、価格帯、在庫有無、Sale中、最低評価で絞り込めること |
| FR-PR-003 | 新着、価格昇順、価格降順、評価順で並べ替えられること |
| FR-PR-004 | 商品一覧は1ページ20件で、閲覧条件適用後にページングすること |
| FR-PR-005 | 同順位時はproductCode昇順を最終Sort Keyとすること |
| FR-PR-006 | 商品詳細に価格、在庫、説明、画像、評価、Variationを表示すること |
| FR-PR-007 | 会員限定商品と必要会員ランクを設定できること |
| FR-PR-008 | 閲覧条件を満たさない商品の直接URLはForbiddenとすること |
| FR-PR-009 | operator/adminは商品Aggregate（商品本体、SKU、画像参照）を登録・編集・複製・プレビューできること |
| FR-PR-010 | 商品状態をdraft、published、unpublished、discontinuedで管理すること |
| FR-PR-011 | 参照のないdraft商品だけを、SKU・画像関連とともに物理削除できること |
| FR-PR-012 | CategoryはPhase 1では1階層とし、商品は1つのCategoryと1つのBrandに所属すること |
| FR-PR-013 | 商品はVariationなし、または軸名を持つ1軸Variationを持てること |
| FR-PR-014 | SKUごとに価格、在庫、購入上限、有効状態を管理すること |
| FR-PR-015 | operator/adminはCategoryを登録・編集・並べ替えでき、Brandを登録・編集できること |
| FR-PR-016 | 公開商品が参照するCategory・Brandの無効化を拒否すること |
| FR-PR-017 | 公開Review件数、平均評価、評価分布を商品詳細へ表示し、件数と平均評価を一覧へ表示すること。平均は`publishedCount=0`で0、それ以外は`ratingTotal / publishedCount`を未丸め保存し、表示時だけ小数第1位へ丸めること |
| FR-PR-018 | Homeに主要Category、新着商品、Sale商品、会員Rank案内を表示すること |
| FR-PR-019 | Home、全商品、検索結果、Category別一覧を別Routeとして提供すること |
| FR-PR-020 | 検索入力に商品、Category、Brandの候補を最大8件表示し、Keyboardで選択できること。商品候補は商品詳細、Category候補はCategory一覧、Brand候補はBrand Filter適用済み検索結果へ遷移し、候補外EnterはKeyword検索を実行すること |
| FR-PR-021 | 検索結果件数、適用済みFilter、個別解除、全解除を表示すること |
| FR-PR-022 | Search結果はFilter候補件数を返し、Mobileでは未確定条件を「該当商品を表示」でまとめて適用すること |
| FR-PR-023 | 商品一覧から詳細へ遷移し戻った場合、検索条件、Page、Scroll位置を復元すること |
| FR-PR-024 | 商品詳細にBreadcrumb、Brand、Thumbnail付きGallery、画像拡大、価格階層、送料条件を表示すること |
| FR-PR-025 | 1軸Variationは12件以下ならButton群、13件以上ならSelectとして選択できること |
| FR-PR-026 | Mobile商品詳細では主要購入条件とCart追加をSticky領域に表示すること |
| FR-PR-027 | 商品Reviewを新着、評価が高い順、評価が低い順で並べ替えられること |
| FR-PR-028 | 商品編集はProduct Aggregate単位で保存し、SKUと画像参照の追加・変更・削除を同一Transactionで確定すること |
| FR-PR-029 | 既存SKUの在庫数を商品編集から直接変更できず、在庫調整機能を経由すること |
| FR-PR-030 | 新規SKUの初期在庫を保存する際に`INITIAL_STOCK`在庫履歴を作成すること |
| FR-PR-031 | Cart/Order/Review参照または`INITIAL_STOCK`以外の在庫履歴があるSKUは物理削除せず無効化し、それらがなくdraft商品に属するSKUだけを`INITIAL_STOCK`履歴とともに物理削除できること |
| FR-PR-032 | 商品画像はGitHub Repositoryの静的Asset Catalogから最大3件を関連付け、Primary、順序、代替Textを管理できること |
| FR-PR-033 | 管理UIから画像BinaryをGitHubへUpload・上書き・削除せず、Assetの追加はRepository更新と再Deployで行い、Release済みAssetは物理削除しないこと |
| FR-PR-034 | 複数SKU商品の一覧価格、価格Filter、SortをViewer向け最小・最大有効単価から決定すること |
| FR-PR-035 | Categoryの手動表示順を永続化し、Brandは名称順固定とすること |
| FR-PR-036 | 商品複製はDBへ即時保存せず、新規登録Formへ説明・Category・Brand・価格・active SKU構成・active画像関連を転記し、商品Code/SKUを空、初期在庫を0として利用者の保存後に通常の商品作成処理を実行すること |
| FR-PR-037 | 商品Previewは保存済みDataではなく編集中の未保存Form Dataを、編集画面内のDialogまたはOverlayで表示し、独立Routeや再読込復元を要求しないこと |
| FR-PR-038 | productCodeはdraftかつ参照なしの場合だけ変更でき、保存済みSKUは同条件を満たす場合だけ変更できること |
| FR-PR-039 | 最初の画像関連は自動的にPrimaryとなり、Primary解除時に画像が残る場合は先頭画像を同一TransactionでPrimaryにすること |
| FR-PR-040 | 新規画像関連はactive Assetだけを許可し、既存のinactive Asset関連は維持できるが、解除後は再関連付けできないこと |
| FR-PR-041 | Category名、Brand名、Variation選択肢はTrim・Unicode NFKC・Locale非依存小文字化した比較Keyで重複判定し、Webと将来SQLiteで同じ結果になること |
| FR-PR-042 | 商品画像0件はdraftだけ許可し、画像1～3件ではPrimaryをちょうど1件、同一商品内assetIdを一意にすること |
| FR-PR-043 | draft商品・SKU削除は削除Transaction内で参照条件を再確認し、条件が変化していた場合は全体をRollbackすること |
| FR-PR-044 | Home、Storefront Category・Brand Navigation、検索FacetはViewer条件を適用した表示名と商品件数を含む共通Catalog Queryから取得し、Navigationは件数1以上のactive項目だけを表示すること |
| FR-PR-045 | 商品の初回公開時にpublishedAtを保存し、新着順はpublishedAt降順・productCode昇順とし、再公開でpublishedAtを更新しないこと |
| FR-PR-046 | 商品Aggregateの作成は必ずdraft・publishedAt未設定とし、Aggregate作成・更新からstatusを変更できず、公開状態は専用Use Caseだけが変更すること |
| FR-PR-047 | Category指定時の商品検索は指定したactiveな1階層Categoryを直接条件とし、公開商品が参照するCategoryの無効化を拒否すること |
| FR-PR-048 | Category・Brandは作成時activeとし、名称やCategory表示順の更新からisActiveを変更できず、有効/無効は専用Use Caseだけが変更すること |
| FR-PR-049 | BrandはnameNormalized昇順、同値id昇順で表示し、手動並べ替えを提供しないこと |
| FR-PR-050 | productCodeとSKUはTrim・Unicode NFKC・ASCII大文字化後に`[A-Z0-9_-]+`で検証・保存し、大文字小文字を区別せず一意にすること |
| FR-PR-051 | draftを含むすべての商品Aggregateはactive SKUを1件以上保持し、Variationなし商品はactive SKUをちょうど1件、Variationあり商品はactive SKUを1件以上保持すること |
| FR-PR-052 | 新規SKUはactive固定で作成し、isActiveは保存済みSKUの更新時だけ変更できること |
| FR-PR-053 | Sale有効判定を行うHome、Navigation、商品検索・候補・詳細、管理商品一覧・詳細はApplicationのTest Clockから取得した同一時刻を内部Queryへ渡し、Repositoryで現在時刻を直接取得しないこと |
| FR-PR-054 | 商品Aggregateの作成・更新ではApplication Clockを1回だけ取得し、Product、SKU、画像関連、INITIAL_STOCK履歴へ同一時刻を保存すること。商品作成時は0件Review Summaryにも同じ時刻を使用し、商品更新では既存Review Summaryを変更しないこと |
| FR-PR-055 | 新規Categoryは0件時sortOrder=10、既存時max(sortOrder)+10で末尾へ追加し、最大値取得と作成を同一Transactionで行うこと |

## 3. カート

| ID | 要件 |
|---|---|
| FR-CA-001 | guestとcustomerは商品をカートへ追加できること |
| FR-CA-002 | 同じSKUを追加した場合は数量を加算し、上限超過時は自動補正せず操作全体を拒否すること |
| FR-CA-003 | 数量は1以上かつ99、購入上限、在庫数の最小値以下であること |
| FR-CA-004 | 数量0への変更は明細削除として扱うこと |
| FR-CA-005 | Cartを再表示した際に価格、公開状態、閲覧権限、在庫を再検証すること |
| FR-CA-006 | 価格変更がある場合は変更前後を表示し、利用者の確認後にCheckout可能とすること |
| FR-CA-007 | Login時のCart統合で会員Cartを基準に数量を合算し、上限超過分と購入不可明細を除外してSKU単位の結果を表示すること |
| FR-CA-008 | Cart状態を再読込・Browser再起動後も保持すること |
| FR-CA-009 | Order作成済みCartを再度Checkoutできないこと |
| FR-CA-010 | Cartと商品詳細に送料無料までの不足額または送料無料達成を表示すること |
| FR-CA-011 | guestIdをLocal Storageへ保存し、同一BrowserでGuest Cartを再取得できること |
| FR-CA-012 | Cart数量変更で許容上限を超えた場合、現在値を維持して理由を表示すること |
| FR-CA-013 | Cart Itemの追加・数量変更・削除・価格変更承認・Guest Cart統合時に、親CartのupdatedAtとversionを同一Transactionで更新すること |
| FR-CA-014 | active Cartの取得または作成を原子的に行い、複数Tab競合時にもUser/Guestごとにactive Cartを1件だけ保持すること |
| FR-CA-015 | Cart Itemへ保存する価格はSale適用後・会員割引適用前の有効単価とし、表示時・注文確定時に現在の会員ランクから割引を再計算すること |
| FR-CA-016 | Cart表示DTOは商品名、SKU、画像、現在価格、追加時価格、購入可能上限、明細別問題を返し、UIが追加Queryを組み合わせないこと |
| FR-CA-017 | Cart追加は指定数量を既存明細へ加算し、新規明細ではUse CaseがitemIdを生成する。Cart数量変更は変更後の絶対数量を指定し、0は明細削除として処理すること |
| FR-CA-018 | 商品詳細からのCart追加はCart Versionを要求せず、Use Caseがownerを解決し、active Cart取得または作成と明細加算・親Cart version更新を同一Transactionで実行すること |

## 4. 価格・送料・会員特典

| ID | 要件 |
|---|---|
| FR-MO-001 | 金額を日本円の整数として扱うこと |
| FR-MO-002 | セール期間中はSKUのセール価格を適用すること |
| FR-MO-003 | regular 0%、gold 5%、platinum 10%の会員割引を、各SKUのSale適用後・会員割引前単価へ適用すること |
| FR-MO-004 | 送料は500円とし、regular/goldは割引前商品小計5,000円以上、platinumは常時無料とすること |
| FR-MO-005 | 単価割引額を`floor(有効単価×割引率)`で算出し、明細割引額を`単価割引額×数量`、注文割引額を全明細割引額の合計とすること |
| FR-MO-006 | Order ItemへlineNumber、商品名、商品Code、SKU、Variation、割引前有効単価、単価割引額、数量、割引前行小計、明細割引額、割引後行合計、代表画像をSnapshot保存し、Orderへ商品小計、会員割引額、送料、合計、会員ランク、配送先をSnapshot保存すること |

## 5. 在庫

| ID | 要件 |
|---|---|
| FR-ST-001 | 在庫はSKU単位の0以上整数として管理すること |
| FR-ST-002 | 在庫0の商品をカートへ追加できないこと |
| FR-ST-003 | Cart更新、Checkout確認、Payment成功確定時に在庫を再検証すること |
| FR-ST-004 | Payment成功確定時に在庫を1回だけ減算すること |
| FR-ST-005 | 在庫数を下回る調整と購入を拒否すること |
| FR-ST-006 | operator/adminは理由付きで在庫を調整できること |
| FR-ST-007 | 在庫変更履歴を保存すること |
| FR-ST-008 | 在庫1～5点を低在庫として表示し、在庫0は在庫切れとして区別すること |
| FR-ST-009 | 手動在庫調整と在庫履歴作成を同一Transactionで行い、片方だけを保存しないこと |

## 6. 配送先・Checkout

| ID | 要件 |
|---|---|
| FR-CH-001 | CheckoutはCart、配送先、支払方法、確認、処理、結果の順で進むこと |
| FR-CH-002 | Checkout SessionへCart ID/Version、配送先Snapshot、支払方法、段階を保存すること |
| FR-CH-003 | Checkout Sessionは24時間で期限切れになること |
| FR-CH-004 | Browser再読込後に進行中Checkoutを復元できること |
| FR-CH-005 | 前段未完了Routeへ直接アクセスした場合、必要な前段Routeへ戻すこと |
| FR-CH-006 | Cart Versionが変わった場合はCartへ戻して再確認を要求すること |
| FR-CH-007 | 注文確認画面に商品、数量、配送先、値引き、送料、合計を表示すること |
| FR-CH-008 | 注文確定の二重操作を防止すること |
| FR-CH-009 | 注文作成時にCheckout Sessionをconverted、Cartをconsumedへ変更すること |
| FR-CH-010 | Checkout Formを原則1列とし、必須・任意、入力理由、Error復旧を明示すること |
| FR-CH-011 | Seedで使用する郵便番号に一致した場合、ローカル辞書から都道府県・市区町村を入力候補として提示すること |
| FR-CH-012 | Desktopでは注文Summaryを右側Sticky、Mobileでは折りたたみ可能な領域として表示すること |
| FR-CH-013 | 注文確定Buttonに支払合計を含め、確定操作であることを明示すること |
| FR-CH-014 | 注文完了画面に注文番号、合計、配送先概要、次の操作を表示すること |
| FR-CH-015 | active Checkout SessionはUserごとに最大1件とし、同一Cart/Versionなら再開、異なる場合は既存Sessionをabandonedとして新規作成すること |
| FR-CH-016 | Logout後もactive Checkout Sessionを保持し、再Login後に所有者確認のうえ再開できること |
| FR-CH-017 | Checkout処理・結果RouteはorderIdを受け取り、Order所有者または管理権限を検証して表示すること |
| FR-CH-018 | `/checkout/processing?orderId=...`はCheckout Sessionではなく、Orderがpending_paymentかつ最新Paymentがprocessingであることを検証して復元すること |
| FR-CH-019 | Checkout Session期限切れをApp起動時、Checkout Route Guard時、Checkout開始時に判定し、定期Timerへ依存しないこと |
| FR-CH-020 | 注文作成Transaction内でCart Itemの追加時単価と現在単価を再比較し、差異がある場合はOrder/Paymentを作成せず`PRICE_CHANGED`としてCartへ戻すこと |

## 7. 模擬Payment

| ID | 要件 |
|---|---|
| FR-PY-001 | 実Payment Providerと通信せず、テスト用支払方法だけを使用すること |
| FR-PY-002 | Phase 1の結果はsucceededまたはfailedとして決定的に返ること |
| FR-PY-003 | `TEST-SUCCESS`は成功、`TEST-DECLINED`、`TEST-INSUFFICIENT`、`TEST-AUTH-FAILED`は明確失敗を返すこと |
| FR-PY-004 | Payment Attemptはprocessing、succeeded、failedを持つこと |
| FR-PY-005 | Payment Gateway呼出し中にApp DB Transactionを保持しないこと |
| FR-PY-006 | Mockが成功候補を返した後、在庫再検証に成功した場合だけPayment succeeded、Order paid、在庫、状態履歴を同一App DB Transactionで確定すること |
| FR-PY-007 | Mock明確失敗または最終在庫不足時はPaymentとOrderをpayment_failedへ確定し、在庫を変更しないこと |
| FR-PY-008 | failed OrderはOrder詳細から`retry-payment`単一TransactionでOrder pending_payment、状態履歴、新しいPayment Attemptを作成して再試行できること |
| FR-PY-009 | processing中はCancel・再試行を許可しないこと |
| FR-PY-010 | processingのまま再起動した場合、同じAttemptを再実行して確定できること |
| FR-PY-011 | gatewayIdempotencyKeyはPayment Attemptだけが保持すること |
| FR-PY-012 | 複数Repositoryを更新するLogin/RegisterとCart統合、商品Aggregate・公開状態・Category/Brand無効化、在庫調整、User Access、Order作成、Payment確定、発送、配送完了、Review集計はApplicationTransactionRunnerで単一Transactionとして実行すること |
| FR-PY-013 | Payment処理再開は同じPayment Attemptを使用し、既にsucceeded/failedなら既存結果を返し、競合時も最新状態を再取得して完了済み結果を返すこと |

## 8. 注文・配送

| ID | 要件 |
|---|---|
| FR-OR-001 | Order Numberを`ORD-YYYYMMDD-NNNN`形式で重複なく採番すること |
| FR-OR-002 | 顧客は自分のOrder一覧・詳細だけを閲覧できること |
| FR-OR-003 | operator/adminは全Orderを検索・閲覧できること |
| FR-OR-004 | Phase 1のOrder状態をpending_payment、payment_failed、paid、preparing、shipped、deliveredとすること |
| FR-OR-005 | operator/adminはpaid Orderの準備を開始できること |
| FR-OR-006 | 発送時に配送会社、追跡番号、発送日時を保存し、Order/Shipmentを同一Txで更新すること |
| FR-OR-007 | 配送完了時に配送完了日時を保存し、Order/Shipmentを同一Txで更新すること |
| FR-OR-008 | Order状態変更履歴を保存すること |
| FR-OR-009 | OrderとOrder Itemを物理削除しないこと |
| FR-OR-010 | 通常管理操作で状態を飛び越えたり逆戻りさせたりできないこと |
| FR-OR-011 | 顧客Order詳細に現在状態、次に可能な操作、配送情報、状態履歴を表示すること |

## 9. Review

| ID | 要件 |
|---|---|
| FR-RV-001 | customer本人のdelivered注文明細だけReview投稿できること |
| FR-RV-002 | 注文明細1件につきReviewを1件だけ作成できること |
| FR-RV-003 | 評価は1～5、本文は必須・最大1,000文字とすること |
| FR-RV-004 | 顧客は自分のpublished/hidden Reviewを編集・論理削除でき、編集では現在Statusを維持し、deleted後は編集・再投稿できないこと |
| FR-RV-005 | operator/adminはReviewを非公開・再公開できること |
| FR-RV-006 | published Reviewだけを商品集計へ含めること |
| FR-RV-007 | Review変更と商品集計更新を同一Txで行うこと |
| FR-RV-008 | 星評価入力をRadio GroupとしてKeyboard操作できること |

## 10. 管理・表示

| ID | 要件 |
|---|---|
| FR-AD-001 | 管理RouteはDesktop Webかつoperator/adminだけが利用できること |
| FR-AD-002 | User管理とRole/Status変更はadminだけが利用できること |
| FR-AD-003 | 商品、Category、Brand、在庫、Order、User、Reviewの管理一覧に検索・Filter・Pageを設けること。管理商品一覧の在庫Filterはactive SKUの合計在庫で判定し、0を在庫切れ、1～5を低在庫、1以上を在庫ありとすること |
| FR-AD-004 | 権限違反はメニュー非表示だけでなくRouteとUse Caseで拒否すること |
| FR-AD-005 | 全画面にTest Mode Badgeを表示し、Login・Signup・Cart・Checkoutでは実取引なしと実在情報入力禁止を明示すること |
| FR-AD-006 | 利用規約、Privacy、模擬取引表示を静的ページとして閲覧できること |
| FR-AD-007 | 管理画面はSide Navigation、Page Header、Breadcrumb、Main ContentからなるAdmin Shellを使用すること |
| FR-AD-008 | 管理Overviewに準備待ち注文、低在庫SKU、非公開Review、最近の注文、Quick Actionを表示すること |
| FR-AD-009 | 管理一覧はTitle、Primary Action、Search、Filter、Sort、適用Filter、Table、Paginationの共通構造を使用すること |
| FR-AD-010 | 管理詳細・編集は主情報と補助情報を分け、未保存時にSave/Discard Barを表示すること |
| FR-AD-011 | 商品の公開/非公開、Reviewの非公開/再公開に限り複数選択Bulk Actionを提供すること |
| FR-AD-012 | Categoryと商品画像の並べ替えはDrag以外に上下移動Buttonを提供すること |
| FR-AD-013 | UI表示文言とStatus表示名を日本語辞書で一元管理すること |
| FR-AD-014 | 商品、Category、Brand、在庫、Order、User、Reviewの管理一覧ごとに検索・Filter・Sort項目を固定すること |
| FR-AD-015 | Bulk ActionはResourceごとに独立Transactionで実行し、部分成功結果を表示すること |
| FR-AD-016 | 各Admin一覧は画面仕様で定義したFilter・Sort・Pageを専用Query DTOで受け取り、List Item DTOを返すこと |

## 11. テスト制御

| ID | 要件 |
|---|---|
| FR-TC-001 | Automation BuildでDB Resetと指定Seed投入ができること |
| FR-TC-002 | Test Clockを固定・解除できること |
| FR-TC-003 | Mock Paymentの処理Delayを固定できること |
| FR-TC-004 | WebでTest APIから現在のApp/Schema/Seed Versionを取得できること |
| FR-TC-005 | Test Modeであることを画面に常時表示すること |
| FR-TC-006 | Reset後にSession、Cart、Checkout、業務DataがSeedの期待値へ戻ること |
| FR-TC-007 | 通常UIから任意のDB書換えや任意Script実行を提供しないこと |
| FR-TC-008 | Automation BuildではOrder、SKU在庫、Review集計の固定形式Read-only Inspection APIだけを提供し、任意Table・任意Queryを提供しないこと |
| FR-TC-009 | ResetはCurrent SessionとGuest Identityを消去し、指定SeedのGuest IDをLocal Storageへ設定してDBとBrowser側識別子を同じ初期状態へ戻すこと |

## 12. 将来要件

### Phase 2

- Native SQLite、Android/iOS購入者機能、Maestro
- Password変更、退会
- Guest Checkoutの要否再評価
- 決定的な未発送Cancel、Cancel申請、Return、全額Refund
- 簡易Audit Log

### Phase 3

- Payment timeout/unknown、独立Gateway台帳、Reconciliation、Finalize失敗復旧
- Import/Export、Migration Recovery、Integrity Check
- Version付き規約同意履歴
- Public Demo分離、Visual、厳密な性能Gate
- Wishlist、Recommendation、Coupon、Pointは教材要件がある場合だけ追加

## 14. 実装境界

| ID | 要件 |
|---|---|
| FR-AR-001 | PresentationはRequest型だけを生成し、Current User/Role/Rank、Actor、Guest ID、Clock、生成ID、画像Manifest解決値はUse Caseが内部Commandへ補完すること |
| FR-AR-002 | 商品画像ManifestはBuild生成ModuleをRuntime正本とし、Runtime Fetchを行わないこと |
| FR-AR-003 | UI向けOrder DTOにGateway Key、Repository Version、内部Actor IDを含めないこと |
| FR-AR-004 | Resetは1 Browser Context・1 Pageを対応条件とし、複数Tabをまたぐ原子性を保証しないこと |
