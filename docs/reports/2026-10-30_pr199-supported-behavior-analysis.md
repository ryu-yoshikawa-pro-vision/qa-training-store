# Scenario Shop 全サポート動作の分類と基本分析（再調査）

## 2026-11-01 Q-32：Cart再検証・旧version・Web/Native差の静的監査（review_required 維持）

- **対象・正式契約**：`SCREEN-STOREFRONT-CART-A02-01`。正式`docs/spec/features/cart.md:9-23/29-32/70-86`のBR-CART-001/003、AC-CART-001/003はguest/active customerのCart表示時とCheckout開始時に公開状態・会員rank・価格・在庫・購入上限を再検証し、問題が残る間はCheckoutを遮断、価格変更は承認後に進行することを要求。operator/adminは`CartUseCases.resolveOwner:240-267`で拒否。画面状態の視覚必須はdefault Web desktop/Android、invalid-items Web desktop（`cart.md:34-40`）。
- **Web/Native UI→Use Case**：Web `app/cart.tsx`→`CartPage/CartContent:30-57/95-141/172-276`は`getCart`でDTOを読み、明細ごとの理由を日本語表示し、非価格問題がある間は価格同意をdisabled、blockingIssuesがあればCheckoutリンクを出さず修正/削除を案内。更新時はcart/item期待versionを渡し、競合は再読込を案内するが、画面上の明示的な再読込操作は初期読込エラー以外にない。Native `app/cart.native.tsx`→`NativeCartScreen:780-972`は同じCart DTOを読み、数量変更/削除/価格反映に期待versionを渡す。非価格問題中は価格反映をdisabled、問題があればCheckoutボタンを表示しない。ただし明細問題の理由は「購入前に確認が必要な商品です。」の共通文のみで、Webの理由別説明・旧価格/現在価格の併記とは異なる。Nativeはmutationエラー時にエラーPanelへ切替・再試行でCartを再取得する経路。プラットフォーム別の正式期待・実画面は未判定。
- **Dexie/SQLite→Checkout**：`CartUseCases.getCart:82-115`はownerと現在時刻を解決して`getCartDto`へ委譲。`DexieCartRepository.getCartDto:448-539`と`NativeCartRepository.getCartDto:1577-1660`は公開停止`UNPUBLISHED`、rank不足`RANK_REQUIRED`、SKU無効`INACTIVE`、在庫0`OUT_OF_STOCK`、数量>在庫`INSUFFICIENT_STOCK`、追加時価格との差`PRICE_CHANGED`を明細/全体blockingIssuesに収集し、現在価格・rank割引・合計と`maximumQuantity`を算出する。数量変更/削除/価格同意は`cartExpectedVersion`と`itemExpectedVersion`を照合（Dexie`cart-checkout-repositories.ts:208-317`、SQLite`native-customer-application-repositories.ts:1307-1423`）。`CheckoutOrderUseCases.start:108-139`はCart version不一致・空/問題Cartを拒否し、確認時もDexie`cart-checkout-repositories.ts:757-782`とSQLite`native-customer-application-repositories.ts:1896-1921`がCart versionとblockingIssuesを再検証する。
- **重要な未実証の仕様差候補**：両Repositoryの`getCartDto`は`maximumQuantity=minimum(stock,purchaseLimit,99)`を計算するが、**現在の明細数量が購入上限だけを超えた場合をblockingIssuesに追加しない**（数量>stockのみ検査）。例えば購入上限5でCart数量4を作った後、stockを10に維持し購入上限を2へ縮小すると、DTOの最大数は2でもblockingIssuesは空のままになり得る。Checkout開始/確認はそのDTOを使用するため、数量超過の検出漏れが疑われる。静的経路からの条件付き推論であり、製品不具合確定・実注文成立・実行PASSを意味しない。購入上限の変更可否、Checkout後段のガード、既存Issue重複を制御された実Runで検証する。
- **Seed・既存テスト**：defaultの`cart-regular-active`はregular会員のshirt M数量1・version1（`default-dataset.ts:705-727`）。`cart-with-invalid-items`は同じactive Cartへ価格変更・非公開・在庫0・inactive SKUの4明細を設定（`scenarios.ts:259-284`）。guest初期状態でこの4明細は表示されず、regular会員でのログインが必要。`tests/integration/cart-use-cases.test.ts:191-270`は価格同意の版更新、在庫不足での同意拒否と版不変、4種の問題DTOを確認する。既存の数量変更version検査・共通Repository契約も参照できるが、購入上限縮小、旧Cart/item versionの全操作、Nativeの理由別表示、実Web/Android、同時操作を直接証明しない。
- **Risk/TR・Condition/Case採否**：High候補＝購入上限変更後の再検証漏れによる過剰購入・注文整合、Medium候補＝Nativeで理由が分からず修正困難、Medium候補＝stale version/価格同意の誤許可。C1=regularの4問題SeedでWeb明細理由とCheckout遮断（既存統合はDTOのみ）、C2=同じ条件のNative案内/修正/Checkout遮断（実Run待ち）、C3=在庫・公開・rankの各変更前後と明細/Cart版不変、C4=購入上限5→2・数量4・stock10でCart DTOとCheckout開始/確認の遮断を確認（未実証の優先負例）、C5=価格のみ変更→本人同意→全明細価格/版更新、C6=非価格問題を併発した価格変更は先に修正/削除してから同意、C7=旧Cart/item versionによる数量変更/削除/同意を拒否しDB/Session不変、C8=Cart version変更後のCheckout開始拒否、C9=guest/customer/operatorのRole境界・Web/Android実画面。C1〜C9は採用候補であり今回の実行PASSではない。
- **判定・引継ぎ**：静的処理経路と既存テスト範囲は確認したが、購入上限変更の実再現、旧version負例のDB不変、正式なNative理由表示期待、実Web/Android・視覚正本が不足するため`review_required`維持。基本分析79/188操作・非default状態18/20は変更しない。製品SUT・正式仕様・既存Seed/Reset・既存製品テストは変更しない。再開条件は制御された学習用fixture/実Run証拠、正式仕様判断、または関連コード/契約の変更。次の独立作業は**Q-33**（M08〜M10教材・Phase 3評価・専用CI受入）。

## Q-22 商品一覧empty：全件0と絞込0の復旧導線・Seed実値の静的監査（review_required 維持）

- **正式契約・対象**：`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`。正式`docs/spec/features/storefront.md:63-74`のempty状態はguest/customer、`empty-catalog`、Web desktop必須視覚で「表示可能な商品がない理由と元の画面に戻る導線」を要求。BR-STOREFRONT-001/AC-STOREFRONT-001。Nativeのdefaultは別の必須視覚状態であり、emptyのAndroid視覚PASSを要求したとは読まない。
- **Use Case→Repository→Seed**：`CatalogUseCases.search`はviewer/clockを解決しDexie `ProductQueryRepository.search` / Native SQLiteの公開候補・rank・フィルターを経由して`total=0/items=[]`を返す。既存`src/seeds/scenarios.ts:179-197`の`emptyCatalog`は`products/productVariants/productImages`等を消すが、**categories/brandsは削除していない**。したがって`src/seeds/metadata.ts`の「カテゴリが空」という説明はSeed実体と不一致。Web/Native Home Repositoryはactiveカテゴリーを可視商品数0で返し得る。以前の本レポートにあった「empty-catalogはカテゴリー自体0件/削除」の記述を訂正し、追加Seedなしで0商品・activeカテゴリー存続の境界を静的に構成できるとする（実Runは未確認）。
- **Webの復旧導線の正確な区別**：`catalog-list-page.tsx:270-286/502-529`で、products/page1/無keyword/無filter/無価格範囲なら`showUnfilteredEmptyState=true`、0件時`StatePanel kind=empty`の**パネル内actionはnull**。ただし同画面の`Breadcrumbs`には常にホーム`/`へのリンクがあり、「戻る導線が画面に全くない」とは断定できない。検索語・価格等の絞込0件は`filter-empty`と「条件をすべて解除」ボタンが出る。全件0と絞込0を同一のCTA期待値にしない。
- **Native・既存テスト**：`NativeCatalogScreen:119-289`は0件時「商品が見つかりません」「検索条件を変えてお試しください。」の`NativeStatePanel`を表示し、当該パネルのactionは指定しない。Nativeの戻る操作/画面遷移は実端末で未検証。`tests/component/catalog-pages.test.tsx:305-337`はWeb無条件0件のパネル内解除ボタン不在と、検索・価格絞込0件の解除ボタン存在をmockでassert。**このテストはBreadcrumbsの「元の画面」適合、実Web/Android、視覚正本一致を証明しない**。
- **Risk/TR/Condition/Case採否**：Medium候補＝復旧不能と誤認するUX/正式期待の曖昧さ、Low〜Medium候補＝Seed説明と実データの不整合。C1 `empty-catalog` guest→`/products` 0件・パネル内CTAなし・Breadcrumbsから`/`へ復帰、C2 default guest→公開商品あり、C3 defaultに未一致価格条件→解除CTAで一覧へ復帰、C4 Native 0件案内とOS戻る操作、C5 `empty-catalog`のactiveカテゴリー0商品・Web/Native Home差、C6 visual Web desktop正本を採用。C1〜C6は実行済みではない。エラー状態・ロード中・ページ外・カテゴリ別0件を別同値クラスとする。
- **判定・教材代替・再開条件**：パネル内CTA欠落は静的事実だがBreadcrumbsが正式の「元の画面に戻る導線」を満たすかは未決。製品不適合/実Run PASSは未判定、`analysis_status=review_required`、基本分析79/188・状態18/20は変更しない。教材はC1とC3の比較・仕様解釈レビューを使用し、正解を「不具合確定」に固定しない。実Web画面・視覚正本/戻り操作、Native実行、正式UI解釈の証拠取得時に再判定。既存製品コード/Seed/仕様/テストは無変更。次の独立作業は**Q-23**。

## Q-21 商品詳細からのCart追加：Role・rank・価格・数量の静的監査（review_required 維持）

- **正式契約・対象**：`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-02`。正式`docs/spec/features/storefront.md:9-23/102-115/216-222`のBR/AC-STOREFRONT-001/003と`docs/spec/features/cart.md:9-19/70-85`のBR-CART-001/003・AC-CART-001を併用。guest/active customer（regular/gold/platinum）に限り購入可能SKUを追加し、非公開・rank不足・stock0・上限超過は拒否する。operator/admin、停止/退会customerはCart利用不可。商品詳細の閲覧許可とCartへの追加許可は別判定。
- **Web/Native UI→Use Case**：Web `ProductDetailView:61-103/190-299`はSKUを選び、数量1〜`min(stockQuantity,purchaseLimit)`を指定して`cart.addItem({variantId,addQuantity:quantity})`。Native `NativeProductDetailScreen:586-739`は複数SKUを初期未選択にし、`isNativeVariantAddable`がstock0を禁止、詳細画面の追加数量は**常に1**。Webは成功後Cartへのリンク、NativeはCartへ進むボタンを表示する。共通`CartUseCases.addItem:118-149/240-268`は正整数・ownerを検証し、guestまたはactive customerのrankを決定。画面で既存Cartの数量を事前合算していないため、最終的な追加可否はRepositoryで再判定する。
- **Dexie/SQLite・価格/原子性**：Dexie `cart-checkout-repositories.ts:111-205`とNative SQLite `native-customer-application-repositories.ts:1138-1284`はSKU active・商品published・rank・stock0を確認し、同一SKUの既存数量と追加数を`addCartQuantity`で合算する。共通`src/domain/services/cart.ts:3-27`の上限は`min(stock,purchaseLimit,99)`で、自動丸めはしない。成功時はSKU明細の数量/版と親Cart版を各1増加（新規明細は版1）、`effectiveUnitPrice`を追加時点の基準価格として保存。会員割引は`pricing.ts:6-15/41-47/72-101`でregular 0%、gold 5%、platinum 10%、送料は小計/ランクに基づきCart DTO側で再計算する。Webは`cart-mutation` transaction、NativeはSQLite write transactionで変更を包む。ただし拒否時の新規Cart行・明細・version不変を**実DBで全条件確認したわけではない**。追加超過の`addCartQuantity`は`RangeError`を送出し、Webは汎用エラー文言、Nativeは`asError(caught).message`経路となるため、利用者向けエラーの適合は未確認。
- **固定Seed・採用Case**：`default-dataset.ts:69-160/290-333`でP-0001のS20/M10/L0、P-0002の単一SKU在庫50/価格1500、P-0003のgold限定在庫5/通常8000・期間内sale6400、P-0004のplatinum限定在庫2/12000、P-0005の在庫3/900、P-0006の在庫0、P-0007〜9の非公開を使用。全SKUの設定購入上限は5。C1 guestでP-0002の正常追加/Cart金額・version、C2 guest/regularによるP-0003/4拒否とgold/platinum本人の許可・価格、C3 P-0005の1/3/4境界、C4同一SKU既存数量4→+1許可/+2拒否・明細/親版不変、C5 sale-active/expired-saleとrank別価格、C6正整数以外/99境界・inactive SKU（固定Seed不足なら学習用fixtureを最小限検討）、C7 Web複数点とNative1点の表示/追加・拒否メッセージ、C8新規Cart拒否のDB rollback。C1〜C8は**採用候補のテスト条件であり実行済みPASSではない**。
- **既存検証・不足と判定**：`tests/contracts/shared-customer-repository-suite.ts:80-171`はWeb Dexie/Native SQLiteのguest追加、guestによるgold商品拒否、stock0/非公開拒否後のCart DTO不変を検査。`tests/integration/cart-use-cases.test.ts:133-159`は数量**更新**での超過とversion不変を検査するが、商品詳細からの**追加**時の既存SKU合算超過、rank別customer追加、実UI表示、99境界、実Androidを直接網羅しない。現HEAD `d54eaed7deb4`の[Web CI 41268368117](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41268368117)は必須Web jobs成功。ただし個別C1〜C8の実Web/Android・製品適合を意味しない。リスクは誤購入許可/金額・version破壊（High候補、発生未確認）、上限超過時の説明不足/Platform差（Low〜Medium候補）。BR/AC、Role/State/Data、Risk/TR、Condition/Caseは静的に整理したが、必要な追加負例・Cart不変・実Runの証拠不足につき`analysis_status=review_required`を維持する。製品SUT・正式Seed/仕様/既存製品テストは無変更。次は独立したQ-22、Q-21再開条件は学習用の追加負例実Run/実Web・Android/期待UI判断の取得。

## Q-02 自己降格・自己停止の拒否：管理ユーザー詳細の静的監査（review_required 維持）

- **対象・正式契約**：`SCREEN-ADMIN-USER-DETAIL-A02-01`。正式`docs/spec/features/admin-users.md:9-15/44-51/75-79`の`BR-ADMINUSER-001`/`AC-ADMINUSER-001`は自身の権限を失わせる変更を拒否し、自己ロール/状態変更をUI上で操作可能に見せないことを要求。Web管理者詳細のみの対象で、Native実画面のPASSとは扱わない。
- **Role/State/Data・Seed**：default `src/seeds/default-dataset.ts:729-775`にはactive admin `user-admin`、active operator `user-operator`、停止/退会customerと`sessions: []`。自己拒否を実証するにはadmin本人としてログインしたSessionを別途作成する。変更対象のUser（role/accountStatus/version）、本人Session、他ユーザーのSession、更新前後のactive admin数を独立して観察する。
- **Web UI**：`src/presentation/pages/review-user-pages.tsx:618-671/737-829`は`currentUser.id===userId`を`isSelf`とし、本人の役割select/変更ボタンおよび利用停止/再開ボタンをdisabledにして理由を表示する。操作の失敗時は`SELF_CHANGE_FORBIDDEN`を日本語化する。これは静的経路であり、実ブラウザのキーボード操作・アクセシビリティ/表示の実Runではない。
- **Use Case/原子性**：`src/application/use-cases/review-user-use-cases.ts:573-629`の`AdminUserUseCases.changeRole`は`requireAdmin`後にactor.idと対象userIdが一致すればtransaction前に`SELF_CHANGE_FORBIDDEN`を投げる。`changeSuspension`も本人かつ`suspended`要求をtransaction前に拒否。従ってこの2つの拒否経路では`users.update`/`sessions.deleteByUserId`へ到達しない。非self操作は`change-user-access` transaction内で対象version・状態・最終管理者数を検査し、成功時にSessionを削除する。自己`suspended→active`はこの明示self guardの対象外だが、`requireAdmin`での停止者認可と`canTransitionAccount`の別条件があり、自己再開の可否は独立した実証なしに断定しない。
- **既存テストと不足**：`tests/integration/review-user-use-cases.test.ts:320-352`は自己role降格の`SELF_CHANGE_FORBIDDEN`をテスト定義として持つが、自己停止の拒否、拒否前後のUser/version/Session不変、他sessionやversion競合は直接assertしていない。`tests/component/review-user-pages.test.tsx`には非selfのロール/停止・Last Admin表示のmock Caseがあるが、本人のrole/statusボタンdisabledの直接Caseは未確認。現HEADのWeb CI [41265352947](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41265352947)はsuccess（integration/component job含む）だが、未定義Caseの実証ではない。
- **Risk/TR・採用Case**：High：自己権限喪失/Session整合、Medium：UI保護理由と直接Use Case呼出しの差。C1 admin本人→operator降格拒否、C2 admin本人→suspended拒否、C3 拒否前後のUser/version/Session/active-admin数不変、C4 UIのrole/status disabledと説明、C5 他admin/別sessionの操作とversion競合を採用。本人active→activeは`canTransitionAccount`で拒否される同値負例、停止adminの自己再開は認可条件を別検討。最終管理者数と並行認可の競合はQ-01の論点を参照し、重複した製品不具合登録をしない。
- **判定・再開条件**：基本分析の主要な静的経路は確認したが、C2〜C5の独立した実Run/不変性証拠が未取得。製品適合・Web実Run・教材受入は未確認、`analysis_status=review_required`を維持する。追加の学習用契約Case・Web画面実Runと拒否前後snapshotが得られた場合のみ再判定。0分枠は再開条件が変わらなければQ-03（Checkout正式仕様差分の処理方針監査）へ進む。SUT・正式仕様・製品テストは無変更。

## Q-20 商品詳細のCart追加拒否：Web/Native・原子性・既存契約の静的監査

- **正式契約**：`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`を`storefront.md:17-23/102-115/218-222`のBR/AC-STOREFRONT-001/003と`cart.md:9-19/70-86`のBR-CART-001/003・AC-CART-001に照合。guest/active customerのみCart追加可能で、operator/adminは対象外。
- **UI→Use Case→Repository**：Web `ProductDetailView:61-100/191-282`はstock0 SKUの選択・追加をdisabled、Native `NativeProductDetailScreen:586-739`と`native-variation-selection.ts:3-16`はstock0を選択できても追加disabled、複数SKUは初期未選択。`CartUseCases.addItem:118-149/240-268`は正整数とownerを検査。Dexie `cart-checkout-repositories.ts:111-205` / Native SQLite `native-customer-application-repositories.ts:1150-1284`はinactive SKU・公開/rank違反・stock0を拒否し、`cart.ts:3-26`は既存数量との合算をstock/purchaseLimit/99で判定する。Webは`cart-mutation` transaction、NativeはSQLite write transactionを使用。
- **Seed・Case**：P-0001（S20/M10/L0、上限5）、P-0005（単一SKU3）、P-0006（単一SKU0）、guestからP-0003 gold/P-0004 platinum・P-0007/8/9非公開を拒否対照に採用。既存Cart数量4→+1許可/+2拒否、stock3で1/3/4、拒否前後のCart数量/version不変を独立条件とする。`tests/contracts/shared-customer-repository-suite.ts:126-171`はWeb DexieとNative SQLiteの共通Repository契約でstock0・非公開の拒否後Cart DTO不変を検査し、現HEADの[Web CI 41264486838](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41264486838)ではVitest repository/contracts jobが成功。ただしこのRunは実Web/Android画面や実端末の証拠ではない。
- **未決・次の判定**：default SeedのSKUは全てactiveで、inactive SKU拒否の実負例、99境界、新規Cartで失敗した場合のDB不変、実Web/AndroidのCart version/視覚は未受入。RepositoryでCart行を作成してからSKUを検証するため、拒否時のロールバックはtransaction境界に依存する。共通契約は既存CartのDTO不変を検証するが、新規Cartのロールバックを直接証明しない。**製品不具合と断定せず**、当該親操作は`review_required`を維持。Q-21へ独立作業を移し、必要な学習用fixture/契約Caseを別途検討する。SUT・正式仕様・既存Seed・製品テストは無変更。

## 2026-11-01 Q-10：ログイン拒否理由のWeb/Native表示とSession非生成の静的監査（レビュー待ち）

- **対象と契約**：`SCREEN-AUTH-LOGIN-A02-01`、正式`docs/spec/features/authentication.md`のBR-AUTH-001/002、AC-AUTH-001/002、および「拒否理由は利用者向け文言、内部ハッシュ・アクターID等を露出しない」というUI契約。Roleはguest→customer/operator/admin、状態はactive/suspended/withdrawn、DataはUser・Session・guest Cartとsession pointer。A02-02のreturnToは別IDであり、ここへ合算しない。
- **Web経路**：`src/presentation/pages/auth-pages.tsx:19-30/61-88/101-174`のフォームは形式・必須・長さを検証し、`useAuthError`が`AUTHENTICATION_FAILED`、`ACCOUNT_SUSPENDED`、`ACCOUNT_WITHDRAWN`、`STORAGE_READ/WRITE_FAILED`、`LOGIN_TRANSACTION_FAILED`を日本語へ写像して`role="alert"`へ表示する。未知の例外は汎用文言。これは実ブラウザでの視認/フォーカス受入ではなくソース上の経路。
- **Native経路と確認済みの表示差**：`src/presentation/native/native-purchase-screens.tsx:156-193/215-222/1543-1545`は`services.auth.login`の例外を`asPurchaseError(caught).message`として`ErrorMessage`へ直接渡す。`src/application/errors.ts:3-17`の`ApplicationError`は`super(input.messageKey)`のため、停止・退会・資格不一致・pointer保存失敗のNative表示候補はそれぞれ`auth.account.suspended`、`auth.account.withdrawn`、`auth.credentials.invalid`、`auth.sessionPointer.failed`という**内部メッセージキーそのもの**。Webの日本語説明とは異なる。UI契約との不整合候補は静的に特定したが、実Android表示・アクセシビリティ・ユーザー影響の実再現は未確認。内部ハッシュやアクターIDの露出を確認したわけではない。
- **Use Case→Repository・Session境界**：`AuthUseCases.login:52-110`は正規化メール/パスワード検証後、suspended/withdrawnを`assertLoginAllowed`で拒否。transaction前とtransaction内でUser状態を再確認し、customerだけguest Cartをmergeし、成功時のみ`sessions.create`する。Webは`DexieApplicationTransactionRunner`と`DexieSessionRepository`、Nativeは`NativeCustomerTransactionRunner`と`NativeSessionRepository`（`native-customer-application-repositories.ts:204-215/562-580`）に接続。Session pointer保存失敗はtransaction開始前に`STORAGE_WRITE_FAILED`。transaction失敗時はpointer clearを試みる。既存のsessionが存在する状態やclear失敗、別端末同時ログインまでの非生成/不変性は未実証。
- **固定Seed・既存検証**：`src/seeds/default-dataset.ts:753-775`は`suspended@example.com`・`withdrawn@example.com`とactive customer/operator/admin、`sessions: []`を持つ。Web `tests/integration/auth-account.test.ts:99-146`はactive roleのSession作成、停止/退会・入力上限拒否のSession非生成を確認するテスト定義、同`:181-220`はtransaction失敗時のCart保持とpointer保存失敗時のSession非生成を確認するテスト定義。Web component `tests/component/auth-account-pages.test.tsx:138-158`は入力エラーを、Native component `tests/component/native/native-purchase-screens.test.tsx:167-219`は成功・checkout読取障害・管理Roleをmock検証するが、**Nativeの拒否理由4種の日本語表示と失敗後Session非生成を直接検証していない**。旧HEAD `b92ebf4c23d6`の[Web CI 41263201757](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41263201757)はsuccess。ただし上記未検証CaseのPASSではない。
- **Risk/TR・Condition/Case採否**：R-AUTH-MSG（Medium候補：Native内部キー表示による原因不明/誤案内）とR-AUTH-SESSION（High候補：拒否後のSession残存・認可越境、**発生未確認**）を分離。採用Case：C1未知メール/誤パスワード→汎用日本語・Sessionなし、C2停止→停止理由・Sessionなし、C3退会→退会理由・Sessionなし、C4 pointer保存失敗→復旧案内・DB/Session/Cart不変、C5 transaction失敗→pointer clear・DB/Cart rollback、C6認証後の状態変更競合→再確認拒否、C7 Web/Native同条件の表示差。Web入力形式エラーはUse Case認証拒否と別Caseにする。既存default Seedと失敗注入可能な学習用fixtureで確認し、製品Seed/テストは変更しない。
- **判定と再開条件**：静的UI差は確認済み、製品適合の最終判定・実Web/Android・NativeのSession/Cart不変性・既存Issue重複は未確認。正式UI期待値を確認し、学習用テスト/実端末で各拒否条件の日本語表示と非生成を証明するまで`review_required`維持。分析済み数は**79/188、状態18/20**のまま。製品SUT・正式仕様・既存Seed/Reset・既存製品テストは変更しない。次の独立作業はQ-11。

## サインアップ成功後のWeb/Native内部遷移を分離した静的基本分析

- **対象・契約**：`SCREEN-AUTH-SIGNUP-A02-03`。正式`authentication.md:5-16/49-67`の`BR-AUTH-001/002`・`AC-AUTH-001/002`は、登録したactive customerのセッションと安全な購入導線を要求する。登録成功時のWeb/Native同一URLまでは要求していない。
- **画面→Use Case→Repository**：Web `SignupPage:220-278`は`auth.register`成功後`refreshIdentity()`を待ち`router.replace("/")`。Native `NativeSignupScreen:240-261`は同じ`auth.register`成功後に`router.replace("/account/profile")`し、`app/account/profile.native.tsx`の顧客プロフィールへ進む。共通`AuthUseCases.register:116-181`は未登録メールを再検証し、active customer/regular、本人Session、guest Cart mergeをtransactionで生成する。外部URLや管理画面を遷移先に使用しない。
- **Role/State/Data・Case採否**：`default` Seedは初期guest sessionなし。未登録メールの正常登録、既存メール重複、入力上限/必須違反、session pointer失敗、guest Cartあり/なしを区別。既存`tests/integration/auth-account.test.ts:222-246`は正規化customer登録を検証し、Web componentは入力検証を確認。Native Signupの実成功遷移を直接検証するcomponent/Android実Runは未確認。失敗時のDB/Session不変と実画面遷移も別受入。
- **Platform差・製品適合**：Webには確認パスワードと学習環境注意事項の明示同意があり、Nativeの現行Signupには両UIがない。正式仕様が両Platformに同一入力を要求するかは未決。製品改善候補として記録し、修正は行わない。
- **判定**：BR/AC、Role/State/Data、Web/Native→共通Use Case→Repository、固定Seed、期待結果/Risk/TR/Condition/Case採否の静的根拠が揃ったため`A02-03`を`analyzed`へ変更。**79/188操作（42.02%、残109）、非default状態18/20（残2）**。実Web/Android・視覚・Session/Cart E2E、製品仕様適合PASSとは区別する。

## 最終管理者保護の静的境界と負例証拠不足（未受入）

- **対象と正式契約**：`SCREEN-ADMIN-USER-DETAIL-A02-03`。正式`admin-users.md:7-15/49-51/78-84`の`BR-ADMINUSER-001/AC-ADMINUSER-001`は最後の管理者の降格・停止を拒否し、UI上でも変更可能と誤認させないことを要求する。ユーザー管理はactive adminのみ（`roles-and-permissions.md:5-23`）。
- **Web→Use Case→Repository**：`AdminUserDetailForm:618-830`は本人の役割/状態変更をdisabledにし、`LAST_ADMIN_PROTECTED`を具体的な日本語理由で表示する。`AdminUserUseCases.changeRole:567-597`はadmin→operator、`changeSuspension:600-635`はadmin→suspendedで`countActiveAdmins() <= 1`をtransaction内で判定。`DexieUserRepository.countActiveAdmins:108-112`はactive adminのみを数える。拒否時には更新/セッション削除の前で例外となる設計。
- **固定SeedとCase採否・到達可能性**：defaultは`user-admin`が唯一のactive admin、`user-operator`がactive operator、sessionsは空。本人の降格/停止は`SELF_CHANGE_FORBIDDEN`が先行する。actorとtargetが別のactive adminであり、同じ整合した状態を読む通常ケースではactive adminは最低2名なので、非selfの`LAST_ADMIN_PROTECTED`分岐は成立しない。2管理者→1管理者への許可変更と、認可直後・transaction直前にactorのadmin権限が失われる制御interleavingを別Caseに分ける。後者は学習用fixtureで到達性を検査するもので、実並行リクエストの再現とは区別する。version競合、withdrawn、UI文言とtarget DB/session不変を独立Caseとする。
- **既存テスト・新規学習用検証と不足**：`tests/integration/review-user-use-cases.test.ts:322-360`のlast-admin名のCaseは本人降格・customer role・withdrawn拒否のみで、非selfの`LAST_ADMIN_PROTECTED`を実行しない。componentはmock文言確認のみ。`tests/contracts/ai-assisted-qa-admin-last-admin-interleaving.test.mjs`を追加し、認可後にactorのroleが変わる制御interleaving下で非selfの降格/停止を拒否し、targetのuser/version/sessionを保持する2 Caseを定義した。**直前HEADの[Web CI 41255533754](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41255533754)で学習用contract 2 Caseを含むVitest contracts実job成功**。ただし実並行・画面・実セッションの受入は未達。
- **判定**：最後の管理者喪失・認可時点差リスクはHigh候補（不具合未確定）。`requireAdmin()`がtransaction外で評価されるため、権限剥奪との競合で再認可されるかは別の安全性検証が必要。`SCREEN-ADMIN-USER-DETAIL-A02-03`は`review_required`を維持。**基本分析78/188・状態18/20**（暫定分母）は変更しない。制御contractのPASSと実並行/実画面の製品適合・実Run PASSを混同しない。製品コード/正式仕様/既存Seed/既存製品テストは変更しない。

## ログイン拒否理由（A02-01）と安全な内部returnTo（A02-02）の分離監査

- **対象IDの厳密な区別**：正式`authentication.md:9-28/116-126`のBR-AUTH-001/002・AC-AUTH-001/002の1文から、`SCREEN-AUTH-LOGIN-A02-01`（ログイン拒否理由の表示）と`SCREEN-AUTH-LOGIN-A02-02`（安全な内部リダイレクト）の2操作が台帳に分割登録されている。拒否文言とredirectをA02-01だけにまとめて分析済みへ計上しない。
- **A02-02のWeb/Native共通経路**：Web `auth-pages.tsx:53-58/101-177`は`URLSearchParams.getAll("returnTo")`の多重値を配列にし、`AuthUseCases.login:52-110`で認証したRoleによりcustomerは`resolveCustomerLoginDestination`、operator/adminは`/admin`。Native `native-purchase-screens.tsx:156-193`も同じ共通関数を使用し、管理Roleは`/`へ戻す。共通`return-to.ts:3-64`は`/cart`、`/checkout/address`、`/checkout/payment`、`/checkout/confirm`の4件を完全一致で許可し、外部URL・管理ルート・親参照・query/hash・backslash・不正encoding・多重値を拒否する。payment/confirmは本人の`CheckoutOrderUseCases.getActive`で有効Stepを確認し、未完・期限切れ・Cart version変化なら`/checkout/address`へ戻す。予期しないStorage読取障害は例外を握り潰さず遷移しない。
- **Seed・既存テスト・Case採否**：defaultのactive customer/staffと`suspended-user`/`withdrawn-user`、既存Checkoutの段階状態を利用し、新Seed不要。既存unit `tests/unit/ui-ux-flow-contracts.test.ts:21-36`は許可/拒否・invalid encoding・配列・address fallback、Web component `auth-account-pages.test.tsx:182-238`はCheckout状態3種とStorage障害、Native component `native-purchase-screens.test.tsx:167-219`は認証呼出し・Storage障害・staff Roleを確認。未実行の外部URL/二重encode/各Checkout Stepの実Web/Android、実Session非生成はこれらのテストのPASSへ算入しない。open redirect/Role越境High、Checkout誤復帰Mediumとして独立Caseを採用。
- **A02-01の別管理**：Web `useAuthError`は`AUTHENTICATION_FAILED`、`ACCOUNT_SUSPENDED/WITHDRAWN`、`STORAGE_READ/WRITE_FAILED`等を利用者向け日本語へ変換するが、Native `asPurchaseError`経由の停止/退会文言、Web/Nativeの全拒否条件とSession非生成の実証は不足。A02-01は`review_required`を維持し、製品の認証不具合を断定しない。
- **判定**：A02-02は正式BR/AC、Role/State/Data、Web/Native→Use Case/共通parser→Checkout→画面、固定Seed、Risk/TR/Condition/Case採否の静的根拠が揃ったため`analyzed`へ変更。**基本分析78/188（41.49%、残110）、非default状態18/20（残2）**。製品適合・実Web/Android E2E・Mobile CI・実セッション受入のPASSではない。SUT/正式仕様/既存Seed/既存製品テスト/workflowは変更しない。

## 認証資格・Role/Statusの静的基本分析（SUT変更なし）

- **対象・経路**：`SCREEN-AUTH-LOGIN-A01-01/A01-02`を正式`authentication.md:9-28/116-126`のBR-AUTH-001/002・AC-AUTH-001/002と`roles-and-permissions.md:5-23`に照合。Web `LoginPage:101-174` / Native `NativeLoginScreen:156-237`→`AuthUseCases.login:52-110`（パスワード照合・事前/transaction内の状態再確認）→Web Dexie/Native SQLiteのUser/Session Repository、既存session保護は`SessionIdentityResolver:28-73`とRole権限ポリシーへ追跡。
- **固定Seed・Case**：default guestのsessions=[]、active regular/gold/platinum customer、active operator/admin、`suspended@example.com`・`withdrawn@example.com`を利用。正しい`testpass1`の成功・停止/退会拒否、未知メール/誤パスワード/入力上限、session生成と失敗時の非生成、customerのみguest Cart mergeを独立条件にする。Web staffは`/admin`、Native非customerは`/`へ分岐し、Native管理画面は対象外。既存Web integration `tests/integration/auth-account.test.ts:99-147`とNative component mock `tests/component/native/native-purchase-screens.test.tsx:168-218`を参照。新Seed・製品コード/テスト変更なし。
- **判定・未受入**：2操作を`analyzed`へ更新し、**77/188（40.96%、残111）、非default状態18/20（残2）**。これは静的基本分析であり、Native実端末・Web/Android E2E・視覚・ログイン中の状態競合・製品適合PASSを意味しない。拒否文言の`SCREEN-AUTH-LOGIN-A02-01`は`review_required`、安全なreturnToの`SCREEN-AUTH-LOGIN-A02-02`は静的基本分析済み（実Runは別受入）。

## 商品詳細の12/13 SKU境界・Web/Nativeバリエーション表示を静的基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-04`。正式`storefront.md:17-23/102-115`のBR-STOREFRONT-001/003・AC-001/003と`roles-and-permissions.md:5-16`を基準に、`CatalogUseCases.getProductDetail:109-120`→Dexie `getDetail:184-235/buildCandidates:249-283` / SQLite `getProductDetail:340-409`→Web `ProductDetailView:187-224` / Native `NativeProductDetailScreen:586-701`を照合。両Repositoryは閲覧者条件とactive SKUを適用して詳細DTOを返す。
- **固定Seedと期待**：default guestのP-0010（12色カラーポーチ、12 SKU）とP-0011（13サイズトレーニングウェア、13 SKU）を境界Caseに採用。P-0001（TシャツS20/M10/L0）、P-0006（単一SKU在庫0）を購入不可・選択可否の対照にする。P-0003/0004のrank制限、P-0007/0008/0009の公開状態除外も確認対象。default SeedのSKUは全てactiveであり、inactive SKU負例の実行は未受入。既存Seedは変更しない。
- **Platform差と未決**：Webは12件以下をbuttons、13件以上をselectとし、在庫0をdisabled表示する（既存component `catalog-pages.test.tsx:336-359`）。Nativeは13件でもchipsを並べ、`native-variation-selection.ts:3-16`では複数SKUの初期選択なし・在庫0の選択は可能・追加不可とする。正式UI契約の13件以上selectをNativeへ適用するかは製品適合判断として未確認。実Android画面・視覚正本の比較が必要であり、基本分析と製品PASSを混同しない。
- **判定**：当該操作1件を証拠付き`analyzed`に変更。**基本操作75/188（39.89%、残113）、非default状態18/20（残2）**、分母188は暫定。学習用契約テストを更新。実Web/Android・視覚正本・inactive SKUの負例は未実施であり、製品本体・正式仕様・Seed/Reset・既存製品テスト/workflowは変更しない。

## 検索サジェストの可視候補・2文字/8件境界を静的基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-SEARCH-A01-02`。正式`storefront.md:9-23/141-155`（BR-STOREFRONT-001/002、AC-001/002、2文字以上/最大8件）とRole規約を基準に、Web `StorefrontShell:41-79`→`SearchCombobox:53-88/103-153`、Native `NativeSearchWithInitial:369-385/460-499`→`CatalogUseCases.suggest:95-106`→Dexie `suggest:130-181/buildCandidates:249-283` / SQLite `suggest:275-332/buildCandidates:605-631`を照合。両Repositoryは閲覧者に可視な商品から商品候補と、可視商品を持つactiveカテゴリー/ブランド候補を構成し、最大8件を返す。
- **Seed・Case**：default guestの`P-0001`（ベーシックTシャツ/商品コード）を商品名・コードの独立正例とし、gold限定`P-0003`、platinum限定`P-0004`、unpublished`P-0007`、draft`P-0008`、discontinued`P-0009`をguest候補から除外。gold/platinumでrank差、empty-catalogで0件を確認する条件を定義。1文字/2文字、8件上限、product/category/brand選択先、連続入力での旧応答排除を実行Caseに残す。新Seed不要。
- **判定**：当該操作1件のRole/State/Data・Risk/TR・Condition/Case採否を証拠化して`analyzed`へ更新。**基本分析74/188（39.36%、残114）、非default状態18/20（残2）**。分母は暫定。これは静的基本分析であり製品適合、Web/Android実Run、視覚正本のPASSではない。製品本体・正式仕様・既存Seed/製品テストは変更しない。

## Home主要カテゴリー導線と閲覧者別件数の静的基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-HOME-A01-02`。正式`storefront.md:9-18/23-39/206-216`（BR-STOREFRONT-001/002、AC-001/002）と`roles-and-permissions.md:5-16`を基準に、Web `HomePage:21-45/100-143`・Native `NativeHomeScreen:31-115`→`CatalogUseCases.getHome:80-84`→Dexie `getHome/listNavigationCategories:393-431` / SQLite `getHome:214-258`→`/categories/{categoryId}`→`CatalogUseCases.search:86-93`を照合。両RepositoryはactiveカテゴリーをsortOrder/id順に返し、可視件数は公開/rank/active SKU候補から計算する。
- **Seed実値・Case**：default guestのファッション1（P-0001）、ホーム・キッチン2（P-0002/P-0005）、スポーツ2（P-0006/P-0011）、バッグ・小物1（P-0010）を名称・ID・件数・リンクで照合。P-0007 unpublished、P-0008 draft、P-0009 discontinued、guestに対するgold P-0003/platinum P-0004は除外。goldでスポーツ3、platinumでバッグ2。empty-catalogは商品を0件にするがactiveカテゴリーを保持するため、**activeカテゴリーの商品0件**の静的Caseになる（実画面未確認）。既存Seed変更なし。
- **Platform差・未決**：Webは`visibleProductCount>0`で先頭最大6カテゴリーだけを表示し、商品総数0ではempty panel。Nativeはactiveカテゴリーを件数0でもLink表示する。現defaultの4カテゴリーは全て可視件数1以上のため差を実再現できない。「主要カテゴリー」の正式0件/最大件数契約は未決であり、製品適合をPASS/FAILに固定しない。実Web/Android・視覚正本・リンク遷移の実Runは別受入。
- **判定**：この動作1件のBR/AC・Role/State/Data・Risk/TR・Condition/Case採否を証拠化し`analyzed`へ更新。**基本分析73/188（38.83%、残115）、非default状態18/20（残2）**。これは静的基本分析のみで製品適合・実Run成功ではない。0件activeカテゴリーの検証は正式期待値確定後に必要性を判断し、学習専用fixture以外のSUT変更を行わない。

## カテゴリー内の閲覧権限除外を静的基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-CATEGORY-A02-01`。正式`storefront.md:9-18/175-216`（BR-STOREFRONT-001/002、AC-001/002）と`roles-and-permissions.md:5-16`、`permissions.ts:15-32`を照合。Web/Androidのカテゴリーroute→`CatalogListPage`/`NativeCatalogScreen`→`CatalogUseCases.search`→Dexie/SQLiteの公開・会員rank・active SKU候補→categoryId一致の検索結果を追跡した。両Repositoryは閲覧不可商品を候補構築段階で除外し、カテゴリー絞込と20件/pageを適用する。Nativeの固定カテゴリー見出しは既存の別の製品適合候補として維持。
- **既存Seed実値とCase**：default guestでファッションP-0001のみ（unpublished P-0007除外）、ホーム・キッチンP-0002/P-0005（draft P-0008除外）、スポーツP-0006/P-0011（gold限定P-0003除外）、バッグ・小物P-0010（platinum限定P-0004、discontinued P-0009除外）。gold-memberでP-0003、platinum-memberでP-0004の追加を検証条件化。在庫0のP-0006は公開閲覧可、Cart追加拒否は別Case。empty-catalogはカテゴリーを保持して商品を削除するため、既存カテゴリー内0件の静的条件として使用可能（実行未確認）。追加Seedは不要。
- **判定**：当該操作のみ`analyzed`へ更新。**基本分析72/188（38.30%、残り116）、非default状態18/20（残り2）**。188は分母最終監査前の暫定値。学習用契約テストの集計と証拠チェックを同期。静的分析は製品適合・実Web/Android/視覚/権限負例のRun PASSではない。製品本体・正式仕様・既存Seed/Reset・製品テスト/workflowは変更しない。

## 製品改善候補の管理先と判定の区別（現行方針）

本レポートは全サポート動作の分析経路・実装/仕様/Seedの証拠を残す。PR #199の分析中に発見した製品不具合・仕様不整合・UX/性能/保守性/セキュリティ等の**現在の候補一覧・適合判定・対応方針**は[製品改善レポート](./pr199-product-improvements.md)で管理し、同じ問題を実行ごとに重複登録しない。本ファイルの日時付き記録は当時の証拠であり、書式修正を含めた現行の変更権限は[全体Planの「変更対象と製品改善管理」](../plans/2026-10-16_qa-curriculum-ai-agent-redesign.md)に従う。

`analysis_status=analyzed`は基本分析の成立であり製品の仕様適合PASSではない。製品不適合が確認されても、必要な分析・根拠を揃えれば基本分析は成立し得る。期待仕様や証拠が未確定の項目を分析済みにせず、製品適合の不適合・未確認は改善候補側に分離して記録する。

## 2026-10-31 カテゴリー一覧の公開/rank境界とNative見出し差を静的基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-CATEGORY-A01-01`。正式`storefront.md:9-18/175-216`（BR-STOREFRONT-001/002、AC-001/002）と`roles-and-permissions.md:5-16`を基準に、Web/Nativeの`/categories/[categoryId]`→`CatalogListPage`/`NativeCatalogScreen`→`CatalogUseCases.search`→Dexie/SQLiteの`categoryIds`フィルター・閲覧者別候補・20件/pageを照合。Webは`getCategoryName`で実名を見出し表示、不明IDはnot-found。Nativeは商品検索/絞込は行うがheadingが固定「カテゴリの商品」で、正式default状態のカテゴリー名表示との差を確認。
- **既存Seedの実値**：default guestではファッション=`P-0001`のみ（unpublished `P-0007`除外）、ホーム・キッチン=`P-0002/P-0005`（draft `P-0008`除外）、スポーツ=`P-0006/P-0011`（gold `P-0003`除外）、バッグ・小物=`P-0010`（platinum `P-0004`/discontinued `P-0009`除外）。gold/platinum既存SeedでP-0003/P-0004の閲覧境界を比較。在庫0のP-0006は閲覧可。empty-catalogはカテゴリーを保持して商品だけを空にするため、既存カテゴリーの0商品Caseを静的に構成できる（実行未確認）。新Seed不要。
- **判定**：操作1件を`analyzed`とし**基本分析71/188（37.77%、残り117）**、状態条件**18/20（残り2）**。これは静的基本分析のみ。Nativeのカテゴリー名差は製品適合未確認の改善候補として別レポートへ記録し、実Android・Web視覚正本/不明IDのRunは未実施。正式仕様・製品コード・Seed・既存製品テストは変更しない。

## 2026-10-31 カート明細削除の所有者・version・空状態を静的基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-CART-A02-03`。正式`cart.md:7-44/75-93`（BR-CART-001/003、AC-CART-001/003）と`roles-and-permissions.md:5-16`を基準に、`CartUseCases.removeItem:195-217`→Dexie `deleteItemAndTouchCart:255-277` / Native SQLite `deleteItemAndTouchCart:1345-1378`→Web `CartContent:180-218` / Native `NativeCartScreen:790-899`を照合。両UIはcart/item versionを送信し、所有者・item所属・versionを検証して削除、更新後DTOから残明細と合計を表示する。Webの数量0経由削除とは別の明示ボタン操作。
- **SeedとCase**：defaultの`regular@example.com`は`cart-regular-active`に`cart-item-regular-shirt`1件（TシャツM×1、version=1）を保持。削除後は0件・Cart version+1・空案内と商品探索導線を検証。Guestは初期Cartが空なので商品追加後に削除。既存`cart-with-invalid-items`は初期guestだが不正4明細はregular本人所有のためログイン後に非価格問題3件を削除し、価格変更が残る間はCheckout遮断を確認。他人itemId/存在しないitemId/古いcart・item versionでは状態不変を負例にする。既存Seedで足りるため追加なし。
- **判定**：本操作1件を`analyzed`に更新し、**基本分析70/188（37.23%、残り118）**、非default状態**18/20（残り2）**。188は分母監査前の暫定値。学習用契約テストを新集計と具体的監査根拠へ同期。実Web/Android実行・視覚正本・負例の実Runは未検証であり、製品適合PASSとは扱わない。製品コード/正式仕様/既存Seed/製品テスト/workflowは変更しない。

## 2026-10-31 商品名・商品コード検索の基本分析（SUT変更なし）

- **対象と根拠**：`SCREEN-STOREFRONT-SEARCH-A01-01`を正式`storefront.md:9-18/141-155/206-217`（BR-STOREFRONT-001/002、AC-001/002）、`roles-and-permissions.md:5-16`、Web `CatalogListPage:111-159/286-312`、Android `NativeCatalogScreen:140-207`、`CatalogUseCases.search:86-93`、Dexie `matchesSearch:56-96/search:101-127/buildCandidates:249-283`、SQLite `matchesSearch:144-179/search:259-272/buildCandidates:605-631`と静的照合。Webは`/search?q=...`、Nativeは検索入力/ボタンから同Use Caseを呼ぶ。双方のRepositoryは閲覧者別公開候補を先に限定してから正規化キーワードを部分一致判定する。
- **既存Seed実値とCase**：default guestでは`P-0001`（ベーシックTシャツ）の名称/商品コードを独立正例とし、`P-0003` gold限定・`P-0004` platinum限定・`P-0007` unpublished・`P-0008` draft・`P-0009` discontinuedを検索結果から除外。gold/platinum、empty-catalog、many-productsの既存シナリオで会員境界・0件・20件/pageを検証条件化。新Seed不要。**実装はカテゴリー名/ブランド名/SKUでも一致する**ため、正式な検索対象範囲は仕様解釈未決（現時点で不具合断定・修正しない）。
- **判定と制約**：対象1件だけを静的`analyzed`へ変更。基本操作**69/188（36.70%、残り119）**、非default状態**18/20（残り2）**、188は暫定分母。契約テストにWeb/Android/両Repository/Seed参照を追加。実ブラウザ・Android・視覚正本のPASSは未主張。製品本体・正式仕様・既存Seed/Reset・既存製品テスト/workflowは未変更。
- **現HEAD直前のCI原因切り分け**：[Web CI 41191741974](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41191741974)（`1484dbb62543`）はVitest contracts/Training runtime/Code Quality/Format/主要E2E成功、Style Qualityの**正式仕様`docs/spec/features/checkout-and-payment.md:279-280`のMD032/MD022のみ失敗**、verify/validateは連動失敗。[Mobile CI 41191741980](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41191741980)は確認時Android Runtime/MaestroとiOSが実行中。新commitのCIは別途検証し、旧HEADのPASSを流用しない。

## 2026-10-31 学習用契約の負例退行とPrettier差分の修復（SUT変更なし）

- **原因**：[Web CI 41188808294](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41188808294)の契約失敗1件は、既に`analyzed`になった`behaviors[0]`を再度`analyzed`にする無効なmutationであり、validatorの退行ではない。対象は`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`の「required fields nonempty」負例。意味的な未検証を表す非空の汎用`case_selection_reason="正式仕様による"`へ変更し、検証関数が`analysis lacks verified evidence`を返すことを確認した。
- **CI証拠**：修正・一時診断HEAD `d6b1b932`の[Web CI 41191253053](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41191253053)でVitest contractsは**57ファイル・906テスト成功/15 skipped**。同HEADのFormat checkはHome公開商品の監査テストに残った`data.behaviors.find`の改行のみ不一致。CI上のPrettier正規差分を採取した。
- **対応と境界**：commit `bce91c30`で正規書式に修正し、一時診断テストと一時ファイル処理を撤去。製品実装・正式仕様・既存Seed/Reset・製品用テスト/workflowは変更しない。最終HEADのFormat/契約の再PASSは新しいCIで別途確認する。正式仕様Markdown MD032/MD022の承認待ちは別P0として維持する。分析台帳は変更せず、**基本操作68/188（残り120）、状態条件18/20（残り2）**、分母暫定を保持。

## 2026-10-31 Home公開商品の閲覧集合監査（SUT変更なし）

- **対象・根拠**：`SCREEN-STOREFRONT-HOME-A01-01`。正式`storefront.md:9-39/190-205`のBR-STOREFRONT-001/AC-001、`roles-and-permissions.md:5-16`、`CatalogUseCases.getHome:80-84`、`canViewerSeeProduct:15-32`、Web Dexie `storefront-repositories.ts:249-283/393-415`、Native SQLite `native-customer-repositories.ts:605-631/779-792/214-258`、Web Home `home-page.tsx:21-162`、Native Home `native-screens.tsx:31-115`を読み取り照合。両Repositoryは公開状態・会員ランク・active SKUで候補を限定し、Homeの新着/セールDTOへ反映する。
- **Seed実値と採否**：default guestの公開・ランク制限なし・active SKUありはP-0001/0002/0005/0006/0010/0011。gold以上のP-0003、platinum以上のP-0004、unpublished/draft/discontinuedのP-0007/0008/0009はguestから除外。既存`default-dataset.ts:67-245`と`storefront-catalog.test.ts:64-103`でplatinum8商品とguest除外を対照。**P-0006は在庫0でも公開閲覧可**であり、Cart追加拒否は別操作として評価する。gold/platinum、empty-catalog、expired-saleを境界Caseとし、新Seedは不要。
- **判定**：A01-01のみ`analyzed`へ変更し、基本操作**68/188（36.17%、残り120）**、状態条件**18/20（残り2）**。分母188は暫定、ID重複/漏れの最終監査未完。Homeカテゴリー0件表示差、会員特典Native表示差、商品一覧empty CTA、管理在庫stock-boundariesは未決のまま。静的基本分析は実ブラウザ/Android/視覚正本のPASSではない。製品本体・正式仕様・既存Seed/Reset・製品用テスト/workflowは変更していない。
- **CI切り分け**：直前HEAD `499b4d33cb9e`の[Web CI 41187424065](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41187424065)ではVitest contracts、Training runtime、Code Quality、主要E2EとPrettierは成功。Style Qualityは**正式製品仕様`checkout-and-payment.md:279-280`のMD032/MD022のみ失敗**、verify/validateは連動失敗。[Mobile CI 41187424030](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41187424030)は確認時Android Runtime/Maestro・iOS実行中。新HEADのCIは別途検証する。正式仕様の書式修正は明示承認待ち。

## 2026-10-31 最新Web CIのMarkdown lint失敗切り分け（製品仕様変更なし）

- HEAD `64674dda816735e7d694ab52924877985f0bc78a`の[Web CI 41174095705](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41174095705)を実ログで確認。Style QualityはPrettierを通過し、Markdown lintで14件（PlanのMD012×7、分析レポートのMD012×4/MD034×1、正式製品仕様`checkout-and-payment.md:279-280`のMD032/MD022×2）を検出。契約・Training runtime・unit/integration/repository/component・主要Chromium E2Eは成功。`verify`/`validate`はStyle失敗に連動しFAIL。Mobile CI 41174095704は確認時pending。
- 学習用Plan/分析レポートの余剰空行とメール表記だけを修正し、**正式仕様の2件は変更禁止SUTとしてBLOCKED**に分離。正式仕様の書式のみの変更もユーザー明示承認が必要。今回の修正commit以降のCI結果は別途確認し、旧HEADの成功を流用しない。

## 2026-10-31 商品詳細の在庫切れを既存単一SKU商品で基本分析（SUT変更なし）

- `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock`：正式`storefront.md:100-115`のguest/customer・Web desktop在庫切れ表示と購入不可の状態を、既存`out-of-stock` Seedの実値から監査。SeedはTシャツMだけ10→0へ変更するが、**default datasetにもpublished・単一active SKU在庫0の`product-out-of-stock`（スポーツボトル/P-0006）が元から存在**する（`default-dataset.ts:149-164/275-326`）。既存商品を直接`/products/product-out-of-stock`で開けば、TシャツS=20の自動選択を回避して状態Caseを構成できる。学習用fixtureや既存Seedの追加・変更は不要。
- `CatalogUseCases.getProductDetail`→Dexie `getDetail/buildCandidates`はpublished/active SKUを条件とし、stock0だけでは商品を除外しない（`catalog-use-cases.ts:100-118`、`storefront-repositories.ts:184-225/248-326`）。Web `ProductDetailView`は単一SKU0で「在庫切れ」、数量selectとカート追加buttonのdisabled、送料無料・購入上限案内の非表示を構成（`product-detail-page.tsx:66-100/191-265`）。TシャツはS20を初期選択し、M0/L0は「（在庫切れ）」・disabledの対照Case。既存component `catalog-pages.test.tsx:350-359`は全SKU0のmockであり、固定Seed実ブラウザのPASSではない。
- **状態条件の証拠付き基本分析を`analyzed`へ変更**。基本操作は54/188件（残り134）、状態条件は**18/20件（残り2）**。親`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`はCart Use Caseの拒否・状態不変と実ブラウザ受入が未検証のため`review_required`維持。Web desktop視覚正本と実カート不変のRunは未実施でPASS扱いしない。既存製品実装・正式仕様・Seed/Reset・製品用テストは変更していない。
- [Web CI 41161207133](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41161207133)の最新HEADのjobsを確認。Vitest contracts・integration・component・主要Chromium E2E等は成功したが、Style Qualityは`src/presentation/native/native-purchase-screens.tsx`のみPrettier違反で失敗。学習用contract書式は通過。製品側の書式修正は承認待ちで行わない。Mobile CI 41161207028は確認時にiOS buildとAndroid Maestroが進行中。新しいcommitのCIは別途確認する。

## 2026-10-31 販売終了の確認ダイアログ状態を監査（SUT変更なし）

- `SCREEN-ADMIN-PRODUCT-DETAIL-S-discontinue-confirm`は正式`admin-catalog.md:124-149`でoperator/admin・Web desktopの確認状態。既存`product-aggregate-edit`は`scenarios.ts:122-123`でdefault datasetを保持し、`metadata.ts:350-359`ではadmin Sessionを初期設定。公開済み`product-basic-shirt`と非公開`product-unpublished`を正例、`product-draft`・`product-discontinued`をトリガー非表示の負例とする。
- `admin-product-pages.tsx:415-510`のstaff guard/getEdit→`ConfirmDialog`（`confirm-dialog.tsx:23-83`、`role=alertdialog`、不可逆警告・閉じる・確定時のみonConfirm）→`AdminProductUseCases.changeStatus:216-220`（staff認可・transaction・expectedVersion）を追跡。dirty時は販売終了ボタン無効。**確認表示の基本分析だけを`analyzed`**にし、親`SCREEN-ADMIN-PRODUCT-DETAIL-A02-03`の販売終了実行・version競合・失敗UXは`review_required`を維持。
- 既存`tests/component/admin-product-pages.test.tsx:43-47`はConfirmDialogをmockしており、実ダイアログの実行PASS証拠にはならない。実ブラウザ・視覚正本・Repositoryの状態不変・エラー表示は未実施。製品の改修なし。
- **別件・未解決候補（Medium）**：`out-of-stock` Seedは`variant-basic-shirt-02`（M）だけ10→0とし、S=20/L=0を維持（`scenarios.ts:41-43`、`default-dataset.ts:296-301`）。Web `ProductDetailView`は在庫あり先頭のSを自動選択し、在庫0のM/Lボタンをdisabledにする（`product-detail-page.tsx:66-100/191-265`）。そのため指定Seedで商品詳細を開くだけでは「在庫切れ」の選択中表示や数量/CTA無効の視覚状態を再現できない可能性。既存componentは全SKU0のDTO mockであり固定Seed実行ではない。正式`storefront.md:108-115`の視覚要件との再現手順差として記録し、`SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock`は未分析維持。学習用代替fixtureの必要性は実ブラウザで確認後に判断する。
- [Web CI 41155913403](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41155913403)の実ログはVitest contractsの状態未レビュー期待値5/実値4の不一致と、Style Qualityの学習用contract・変更禁止Native製品画面の2ファイルを示す。学習用contract期待値は今回の状態監査後の3へ更新。製品Nativeは未修正。今回HEADのCI結果は後続確認とし、PASSを先取りしない。

## 2026-10-31 管理商品1000件の状態分析と契約CI修正（SUT変更なし）

- `SCREEN-ADMIN-PRODUCTS-S-many-products`：正式`admin-catalog.md:59-73`、`many-products` Seedの1000 published商品・各3 active SKU（計3000）・初期guest、staffログイン、`AdminProductUseCases.search`→Dexie`DexieAdminProductQueryRepository.search`→Webの20件/ページ・50ページとFilterBarを照合。状態別の**基本分析**を完了。実ブラウザ/視覚正本のPASSではない。
- **不整合候補（Medium、SUT変更なし）**：`AdminProductsContent`はkeyword変更のみ`setPage(1)`を実行し、公開状態/ランク/在庫/価格/並び順の変更時は現在ページを維持する。50ページ目から少数に絞ると空ページに見える可能性がある。再現条件：many-products Reset→staffログイン→50ページ→公開状態や在庫条件を変更。対象は`src/presentation/pages/admin-product-pages.tsx:56-172`。影響：絞り込み結果の誤認。教材では仕様・実装差のリスク分析題材に使えるが、学習成立に製品修正は必須でない。実ブラウザでの再現・仕様側の意図確認は未完、親`SCREEN-ADMIN-PRODUCTS-A01-02`は`review_required`維持。Issue/別PR化は承認待ち。
- **前HEAD CIの実原因**：[Web CI 41152309756](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41152309756)は契約テスト`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs:341`が`SCREEN-ORDERS-LIST-A02-01`を古い`review_required`と期待したが、最新台帳は根拠付き`analyzed`のため失敗。古いAssertionを削除し、既存の3状態個別監査Assertionを正本とする。Style Qualityは学習用contractと変更禁止の製品Native画面の2件のPrettier違反。学習用の整形はCI再確認、製品Nativeは修正しない。
- **最新台帳の再集計**：基本分析54/188（残り134）、状態別条件16/20（残り4）。188は暫定分母。全11モジュール、実Template→Private 2-core Codespaces→OpenCode実モデル校正、全マージ前受入は未達。

## 2026-10-31 注文一覧の空・処理中・失敗の3動作（SUT変更なし）

- `SCREEN-ORDERS-LIST-A02-01`/`A02-02`/`A02-03`を`orders.md`の注文一覧の状態契約、`CheckoutOrderUseCases.listMyOrders`、Dexie/SQLiteの本人注文抽出、Web/Native画面、`orders-empty`/`payment-processing`/`payment-declined` Seedとdefaultを照合。個々の入力・期待値・リスク・Case選定根拠を分析台帳へ追加した。
- **空**：`orders-empty`は初期Sessionがregular本人で、注文・決済・配送・注文履歴を0件にする。Webは「注文履歴はありません」とホームへの復帰リンク、Nativeは「注文はありません」と説明文を表示する。default初期guestでは本人ログインが必要で、本人の注文5件を比較に使う。空状態の正式視覚正本はWeb desktopのみ。
- **処理中**：`payment-processing`はorder-payment-failedの保存状態を`pending_payment/processing`へ変更する（初期guestのためregularへログインが必要）。Web一覧は`pending_payment`を「支払い待ち」、Nativeは`pending_payment`をそのまま表示する。paidとの区別を確認条件とする。
- **失敗**：`payment-declined`はdefaultの`payment_failed/failed/DECLINED`注文を使う（初期guest）。Web一覧は「支払い失敗」、Nativeは`payment_failed`と表示し、paid注文を成功側の対照とする。
- **製品不整合候補（未修正）**：Native注文一覧は`order.status`の内部文字列をそのまま表示し、Webの「支払い待ち」「支払い失敗」と異なる。状態としては区別されているが、Nativeで利用者向けラベルとして妥当か未確認。加えて`SCREEN-ORDERS-LIST-A01-02`は正式仕様が一覧内の支払い・配送・タイムラインを要求する一方、現行一覧はorderStatus中心のため引き続き`review_required`。明示承認なくSUTを修正しない。
- **基本分析54/188件（28.72%）、未分析134件、状態別条件15/20件分析済み（残り5件）**。188は暫定分母。ソース分析・既存Seedの静的確認を実ブラウザ/Android実機・正本比較のPASSと混同しない。既存の製品実装・正式仕様・Seed/Reset・製品用テストは変更していない。

## 2026-10-31 注文詳細の本人境界・Snapshot・レビュー状態（製品変更なし）

- `SCREEN-ORDERS-DETAIL-A01-03`/`A02-01`/`A02-02`を、`orders.md`のBR-ORDER-001/AC-ORDER-001、`CheckoutOrderUseCases.getMyOrder/getMyCustomerOrder/beginOrder`、Dexie/SQLite、Web/Android、`default`/`reviewable-orders` Seedおよび既存テストと照合した。基本分析**51/188件（27.13%）、未分析137件**。先行の同時作業で状態別条件は**15/20件分析済み（残り5件）**。188件は暫定分母。
- レビュー投稿可否：`reviewable-orders`は既存Reviewを先頭6件へ減らし、配達済み注文の未投稿明細7〜9に`NOT_POSTED`と投稿導線を与える。WebのPUBLISHED/HIDDENには編集リンクがあるが、Nativeは非NOT_POSTEDを状態テキストとして表示する。Web同等の編集導線がNative必須かは未決。
- 他人注文：`getMyCustomerOrder`は`getMyOrder`の本人所有権検査を必ず経由し、他人や存在しない注文IDでは詳細DTOを返さない。Webはnot-found境界、Nativeは注文内容を出さず読み込み状態とエラー文を表示する。Nativeの失敗時の明瞭な復旧は実機受入待ち。
- 過去注文：`beginOrder`は商品名/SKU/価格/画像path、配送先、ランクを保存し、Dexie/SQLite`getDetail`は保存値から表示DTOを組み立てる。購入後の商品マスタ変更を注入して不変性を確かめる実行テストは未確認であり、テスト条件に明記した。
- **未解決の製品差（修正なし）**：`SCREEN-ORDERS-DETAIL-A01-01`のWeb表示は配送先の建物名/電話・会員ランクの明示表示がなく、Nativeにはある。`A01-02`ではWebは支払履歴・配送状況・タイムラインを表示するが、Nativeはタイムラインを表示しない。正式な表示範囲が未決なので両操作を`review_required`として保持する。新たなSUT変更/Issue作成はしない。
- 今回の結果は読み取り監査であり、実ブラウザ/Android・視覚正本のPASS、実Template/Private 2-core Codespaces/OpenCode校正は未達。

## 2026-10-31 Cart invalid-items分析と管理在庫ステータス不整合候補（SUT変更なし）

- **分析済み**：`SCREEN-STOREFRONT-CART-S-invalid-items`。正式`BR-CART-003/AC-CART-003`、`cart-with-invalid-items` Seedの4明細（価格変更・非公開・在庫0・inactive SKU）、`CartUseCases.getCart/removeItem/acceptPriceChanges`、Dexie `getCartDto`、Web `CartContent`と既存E2Eセットアップを照合。初期guestでは不正明細は見えず、**`regular@example.com`でログイン後に/cartへ遷移**する必要がある。非価格問題の削除→価格同意→Checkout解放の順序をCase化。既存テストのソース確認は実行PASS/視覚正本一致を意味しない。
- **未決・Medium候補（製品変更なし）**：`SCREEN-ADMIN-INVENTORIES-S-stock-boundaries`の`BR-ADMININV-001/AC-ADMININV-001`はSKU 0→out_of_stock、1〜5→low_stock、6以上→availableの表示・件数を要求。一方`DexieInventoryRepository.search`（`src/infrastructure/database/dexie/product-repositories.ts:601-647`）のフィルターは`out=0`、`low=1..5`、`available>=1`でlowとavailableが重複。`AdminInventoriesContent`（`src/presentation/pages/admin-operations-pages.tsx:78-185`）の「状態」列は`ActiveBadge(item.isActive)`で有効/無効を表示し、在庫分類を表示しない。再現候補：operator/adminでdefault/low-stock Reset→/admin/inventories、在庫0/1/5/6を準備し分類・件数・「在庫あり」/「低在庫」フィルターを比較。既存Seedで4境界が全て揃うか・実ブラウザでの再現は未確認。影響は在庫判断と教材の境界値オラクル。仕様/実装差分レビュー演習には利用可能だが、教材の基本分析のための製品修正は必須でない。視覚受入の期待値確定には判断が必要。状態は`review_required`維持。Issue化・別PR化は承認待ち。
- **進捗**：基本分析48/188（残り140）、状態条件15/20（残り5）。188は暫定分母。今回変更は学習用台帳・契約テスト・レポート・Planのみ。

## 2026-10-31 決済再開・本人注文一覧の分析とWeb CI失敗の切り分け（SUT変更なし）

- `SCREEN-CHECKOUT-PROCESSING-A01-02`（再読み込み・再開）と`SCREEN-ORDERS-LIST-A01-01`（本人注文一覧）をBR/AC・Use Case・Dexie/SQLite・Web/Android・固定Seedの実値と照合。本人Order IDを用いる`resumePayment`と、本人IDで絞る`listMyOrders`の経路を、台帳に具体的な入力・期待結果・リスク・Case採否根拠とともに記録した。
- `payment-processing` Seedは初期guestでありregular会員ログインが必要。`default`も初期guestなので本人注文一覧を直接検証できない。既存テストのソース確認は実ブラウザ/実機のPASSを意味しない。
- `SCREEN-CHECKOUT-PROCESSING-A02-02`は処理中の再試行禁止と`retryPayment`の既存試行返却の関係、`A02-03`はキャンセルUI不存在だけで負例受入まで断定できない点を未決事項として維持。`SCREEN-ORDERS-LIST-A01-02`は正式仕様が一覧内に支払い/配送/タイムラインを要求する一方、Web/Native一覧では注文status・金額のみを表示しており、詳細画面への移譲が正しいか未決。
- Web CI [41144863754](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41144863754) の実ログで、学習用`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`の状態集計期待値8に対して実値6、Style Qualityの`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`と製品Native画面のPrettier違反を確認。学習用契約テストの件数を6に修正するが、書式・最新CIのPASSは未確認。製品Native画面は変更しない。Mobile App CI [41144863940](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41144863940) は成功。
- **基本分析48/188件（25.53%）、未分析140件、状態別条件14/20件分析済み（未分析6件）。** 188件は暫定分母。PR内に以前から混在するSUT差分は保持し、製品修正・正式Seed/仕様・製品テストの変更は今回実施しない。

## 2026-10-31 既存PR混在SUT差分の一次仕分け（変更・revertなし）

- GitHub PR #199のbase `main`（`05943b5a37ff`）とHEAD `f9fede3e220a`のAPI差分290ファイルから、**製品実装9ファイル、正式製品仕様1ファイル、既存製品テスト9ファイル、製品workflow差分0ファイル**を抽出した。これはPR全履歴の混在差分であり、今回の作業で新規変更したファイルではない。機能別の必要性・個別コミット由来・移設方針は未確定。
- 製品実装9件：`src/application/use-cases/account-use-cases.ts`、`src/application/use-cases/checkout-order-use-cases.ts`、`src/infrastructure/database/dexie/basic-repositories.ts`、`src/infrastructure/database/dexie/cart-checkout-repositories.ts`、`src/infrastructure/database/sqlite/native-customer-application-repositories.ts`、`src/presentation/native/native-purchase-screens.tsx`、`src/presentation/native/native-screens.tsx`、`src/presentation/pages/checkout-order-pages.tsx`、`src/presentation/pages/product-detail-page.tsx`。
- 正式仕様1件：`docs/spec/features/checkout-and-payment.md`。
- 既存製品テスト9件：`tests/component/auth-account-pages.test.tsx`、`tests/component/catalog-pages.test.tsx`、`tests/component/checkout-order-pages.test.tsx`、`tests/component/native/native-purchase-screens.test.tsx`、`tests/integration/admin-master-use-cases.test.ts`、`tests/integration/auth-account.test.ts`、`tests/integration/cart-use-cases.test.ts`、`tests/integration/checkout-order-use-cases.test.ts`、`tests/repository-contract/native-customer-shared.test.ts`。
- この仕分けはファイルパスによる一次分類であり、各差分の意味・必要性・セキュリティ評価を確定するものではない。ユーザーの承認なしに製品側の追加修正、revert、Issue/別PR作成はしない。後続ではコミット別の由来と学習目的との関係を精査し、分離が必要な場合のみ提案する。

## 2026-10-31 Signup入力検証・公開済みレビュー編集状態の証拠監査（SUT変更なし）

- **基本分析46/188（残り142）、状態条件14/20（残り6）。** 188動作は暫定分母。状態2件のみを分析し、親操作は未分析のまま維持する。今回の読み取り監査をブラウザ/Nativeの実行PASSや視覚正本一致とは扱わない。
- `SCREEN-AUTH-SIGNUP-S-validation-error`：正式authentication BR/AC、default Seed初期guest、SignupPageのZod/RHF・FormErrorSummary、AuthUseCases.registerのDB/Session境界、既存componentの未同意/表示名上限拒否を照合。空/形式不正/パスワード下限/確認不一致/注意事項未同意を独立Case化。正式表のnot-applicableは視覚リファレンス省略であり機能非対応ではない。Webのpre-UseCase拒否を分析し、Android専用視覚受入や親登録成功/重複は未完了。
- `SCREEN-REVIEWS-EDITOR-S-published`：reviews BR/AC、CustomerReviewUseCases.getEligibility/update→DexieReviewRepository→Web CustomerReviewContent、reviewable-orders Seed（初期guest・regular本人ログイン後、既存published 6件/未投稿3件）を照合。既存レビューの値・PUBLISHED表示・更新/削除・expectedVersion、未投稿/deletedとの対照を定義。既存component/integrationソースは監査したが実画面・正本比較は未実施。
- [Web CI 41138483817](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41138483817) は前HEADでcompleted/failure。Style Quality実ログは製品Native画面と学習用contractのPrettier違反。その他のCode Quality/contract/integration/component/required E2Eは成功。製品Nativeは変更禁止につき未修正。学習用contractのformatterは新HEAD CIで再検証する。[Mobile CI 41138483798](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41138483798) はsuccess。
- 過去のPR内製品変更は保持。公開Template/Private 2-core Codespaces/OpenCode実モデル校正、全機能の漏れ・重複の最終確定、全マージ前受入条件は未完了。

## 2026-10-31 大量商品ページング・管理画面モバイル警告の状態監査（SUT変更なし）

- **基本分析46/188件（24.47%）、残り142件、状態条件9/20件レビュー済み・残り11件。** 188件は引き続き暫定分母。状態2件のみを追加分析し、親操作の基本分析へは二重計上しない。
- `SCREEN-STOREFRONT-PRODUCT-LIST-S-many-products`：正式`BR-STOREFRONT-002/AC-STOREFRONT-002`、`CatalogUseCases.search`、Dexie検索/ページ抽出、Web `CatalogListContent`と`Pagination`、既存`many-products` Seedを照合。Seedは公開1000商品・各3有効SKU、初期guest。無フィルターでは20件/ページ・計50ページとなる。1→2→50ページとdefault比較、フィルター後のpage reset、51ページ入力の境界Caseを定義した。**実ブラウザのページングPASS/視覚正本一致は未確認**。
- `SCREEN-ADMIN-DASHBOARD-S-admin-mobile-warning`：正式管理ダッシュボードのresponsive条件、`AppFrame`→`AdminShell`、`admin.css`の1023px以下表示切替、`RouteGuard staff`、`AdminMasterUseCases.getOverview`、default Seedのactive operator/adminと既存componentを照合。1023pxでは警告・ストア戻り・ログアウト、1024pxでは通常管理UIの境界を定義。初期guestのままでは管理画面を検証できず、staffログインが必要。**CSSブラウザ/モバイル正本比較は未確認**。
- 前HEAD `b23b2f9`の[Web CI 41117026769](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41117026769)はStyle QualityでFAIL（学習用contractのimportと既存製品Native画面のPrettier違反）。学習用contractのimportをPrettier標準の単一行に戻し、状態集計と専用contractを同期。**Native製品画面は変更禁止につき未修正**。同HEADの[Mobile CI 41117026808](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41117026808)はsuccess（Android/Maestroを含む）。最新HEADのCIはpush後に別途確認する。
- 既存PRの製品変更は保持し、今回の変更は学習用台帳・契約テスト・調査レポート・Planに限定。実Template/非公開2コアCodespaces/OpenCode実モデル校正と全機能分析100%は未達。

## 2026-10-31 注文の空状態・レビュー投稿可能状態の監査（SUT変更なし）

- **基本分析46/188件（24.47%）、残り142件、状態条件7/20件レビュー済み・残り13件。** 分母188件は暫定。状態条件2件を追加で証拠付き分析したが、親操作の分析済み件数には加算しない。
- `SCREEN-ORDERS-LIST-S-empty`：`orders.md:20-35`、`CheckoutOrderUseCases.listMyOrders:385-395`、`DexieOrderRepository.listByUser:117-143`、`OrdersContent:672-699`、`StatePanel:29-65`、`orders-empty` Seed（orders/orderItems/payments/shipments等を0件、regular本人Session）を照合。Webは「注文履歴はありません」と既定のホーム(/)導線を表示する。defaultの本人注文ありと対比較する。Native空表示は存在するが専用視覚必須はWeb desktopのみ。
- `SCREEN-ORDERS-DETAIL-S-reviewable`：`orders.md:52-69`、`getMyCustomerOrder:406-416`、`deriveCustomerReviewState`、Webの`OrderDetailContent`、`reviewable-orders` Seedの`reviews.slice(0,6)`を照合。配達済み`order-delivered`の7〜9番目の明細は未投稿となり「レビューを投稿」へ、先頭6件は編集へ分岐。初期Sessionはguestなのでregular本人でログインする。未配達/削除済み/他人の注文は別の拒否・境界Case。
- **追加の未決事項（修正なし）**：`out-of-stock` Seedは`variant-basic-shirt-02`を0件にするが、Webの商品詳細は在庫ありvariantを初期選択し、0件variantの選択ボタンをdisabledにする。該当variantだけを選んで空在庫表示を検証するCaseはそのままでは成立しない可能性がある。既存の`product-out-of-stock`はdefaultから0件なので、比較対象とシナリオの対象SKUを明示してから状態を判定する。現時点で`SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock`は`review_required`を維持し、製品・Seedは変更しない。
- [前HEAD Web CI 41107879887](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41107879887)はfailure。Style Qualityの実ログで学習用`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`と変更禁止の製品`src/presentation/native/native-purchase-screens.tsx`のPrettier違反を確認。学習用contractのimport/テスト名を整えたが、このHEADでPrettier PASSは未証明。E2Eの複数失敗はPlaywright開始前の`actions/download-artifact`が5回リトライ後失敗した外部Artifact取得障害。製品テストのAssertion失敗とは判定しない。前HEAD Mobile CIはsuccess。
- 新HEADのformatter/contract/CIと実ブラウザ・Android正本、実Template→Private 2-core Codespaces→OpenCode校正は別途確認する。過去にPRへ含まれた製品修正は保持し、変更境界外の修正は実施しない。

## 2026-10-31 Web empty状態2件の証拠付き監査（SUT変更なし）

- **基本分析 46/188件（24.47%）、残り142件。状態別条件 5/20件レビュー済み、残り15件。** 188件は暫定分母であり、重複・漏れの最終確定は未了。
- `SCREEN-STOREFRONT-HOME-S-empty-catalog`：正式`storefront.md:25-39`、`CatalogUseCases.getHome`、Dexie公開候補/カテゴリー件数、`HomeContent`の単一empty表示、`empty-catalog`の全商品消去、既存componentテストを照合。Guest/CustomerのWeb desktopのみを必須視覚条件とし、defaultとの0/1件対比較をテスト条件に記録。既存componentの存在は実行PASSではない。
- `SCREEN-STOREFRONT-CART-S-empty`：正式`cart.md:21-39`、`CartUseCases.getCart`のGuest空Cart生成、Dexie所有者、Web/Native、default Datasetのregular customerに明細1件がある実値、既存componentを照合。Guest初期0件とCustomer最後の明細削除後0件を分けた。Nativeの空案内は確認したが正式視覚必須はWeb desktop。
- **製品不整合候補（重大度Medium、再現実行未確認）**：`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`の正式仕様`storefront.md:73`は『元の画面に戻る導線』を要求するが、Web `catalog-list-page.tsx:502-525`は無条件の0件状態で`action={null}`。既存`catalog-pages.test.tsx:305-313`もCTAなしを期待。学習上は仕様/実装/既存テストの相違を発見するレビュー題材として使用可能。ただし正しい期待結果を未決のまま固定しない。修正は教材の必須条件ではなく、学習専用の比較Caseで代替可能。製品コード/正式仕様/既存製品テストは変更せず、Issue化・別PRはユーザー承認待ち。
- [Web CI 41102991995](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41102991995) は前HEADでcompleted/failure。Style Qualityの実ログは`src/presentation/native/native-purchase-screens.tsx`（製品SUT・変更禁止）と`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`（学習用）のPrettier違反を指す。Code Quality、contract、integration、component、required E2Eは同Runでsuccessだが、全体CIはFAIL。今回は学習用契約の期待件数と状態回帰を更新したもののPrettier実行環境がないため整形PASSは未証明。製品ファイルの整形は明示承認まで実施しない。Mobile CI 41102992168 は確認時点でiOS Automation Buildがin_progress（他のAndroid/Native Static/Maestroはsuccess）。新HEADのCIは別途確認する。
- SUT実行・実ブラウザ/Android画面正本・実公開Template→非公開2コアCodespaces・OpenCode実モデル校正は未完了。次は残る状態条件と親操作の照合を進め、製品差異を修正と混同しない。

## 判定

以前の「270/270で分類・基本分析100%」は撤回する。BR/AC・状態遷移・横断規則を画面操作と別々の機能として合算しており、実装側の一部操作が漏れていた。また、汎用文言を記載した行まで`analyzed`と見なしていたため、受入基準に適合していなかった。

今回、機能動作と根拠規則を分け、公開Use Caseを調査した。**正規化した188件の動作候補の分類追跡は実施したが、54件は仕様・実装・Seedの照合済み、134件は追加レビューが残る。PRの「全サポート機能の分類・基本分析100%」は未達である。**

## 今回確認した母集団

`training/ai-assisted-qa-course/coverage/supported-behaviors.json`をschema version 2へ移行した。

| 内容 | 件数 | 集計方針 |
| --- | ---: | --- |
| 38画面に含まれる73の機能記述を操作へ分解 | 172 | 動作として暫定分母へ |
| 通常時と異なるUI状態 | 20 | 既存操作の条件として追跡（分母には加算しない） |
| 画面記述だけでは追跡できなかったUse Case固有動作 | 16 | 実装との照合候補として暫定分母へ |
| **動作候補計** | **188** | 分析状況を別途判定 |
| BR/AC | 46 | 動作の受入根拠。分母へ二重加算しない |
| 認可/遷移/UX/スコープ等の横断契約 | 33 | 横断根拠。分母へ二重加算しない |
| 公開Use Caseメソッド | 76 | 動作候補へ参照付けし、仕様からの見落としを検出 |

UI状態20件は既存操作の状態別条件として追跡し、二重に加算しない。状態の検証は維持する。

商品公開状態とレビュー公開状態の**一括変更**は、以前の表示結果の項目と分離して独立の検証責務とした。

追加で確認した操作には、プロフィール更新、配送先削除・候補提示、商品複製・下書き削除、レビュー削除、ログアウト、カート価格承認、カテゴリー並び替え、カテゴリー/ブランドの状態変更、商品レビュー一覧などを含む。

**188という値は最終的な全製品の分母ではなく、対象仕様と公開Use Caseの照合に基づく現在の候補数。** 画面内に実装されている操作、内部の条件分岐、Native固有契約、実際のSeedで成立する状態を再確認した後で確定する。画面単位の動作の粒度とUse Case固有動作の粒度も、同じ操作を二重計上していないか最終点検する。

## 完了率の扱い

`node scripts/training/validate-supported-behaviors.mjs`は構造の不一致をエラーにし、分類済み・基本分析済み・未レビュー・BLOCKEDを別々に報告する。基本分析は`analysis_status=analyzed`に加え、Role/Platform/State/Data、期待結果、Risk、TR、Condition、Case選定・除外理由、関連BR/AC、仕様・実装・Seedレビューの証拠が必要となる。

**188件中、46件が`analyzed`（24.47%）、142件が`review_required`。状態別条件は15/20件が未レビューとして残る。** 旧台帳の共通文言、同一文章の期待結果、機能単位のリスク、未解決のRole/Platform組合せだけでは分析済みにしない。仕様上の分析が成立しない項目はBLOCKEDを残し、勝手に分母から取り除かない。

完了判定は`node scripts/training/validate-supported-behaviors.mjs --require-complete`で行う。CIの通常検証は構造の整合性を確認するが、**CIの成功を「内容のレビュー完了」と読み替えない**。

## 継続する独立確認

- 正式仕様、画面コンポーネント、全公開Use Case、Seed/シナリオを照合し、動作IDとRole/State/Platformごとの対象を確定する。
- 各動作のBR/AC対応、操作前提、具体的なData、期待結果、主要リスク、検証責務(TR)、Condition、Case採否理由、未決/対象外/残リスクをレビューする。
- 代表的な同義記載の二重計上と、Role/State分岐を統合すべき箇所を確認する。
- AndroidランタイムとiOSビルド限定を分離し、Web/Nativeの対象条件を誤って全プラットフォームへ適用しない。
- 型・行数・IDの形式検査だけでは内容の真偽を保証できないため、仕様と実装を根拠に人間が確認する。

既存の新機能/評価資料の配布禁止、固定SHA、非破壊同期などの安全境界は変更しない。

## Platform・Roleの確認結果

`SCREEN-AUTH-SIGNUP`の`validation-error`行にある`必須プラットフォーム: -`は**視覚リファレンスを別画面のエラー表示で代表する**という意味であり、サインアップのバリデーション機能そのものが非対応という意味ではない。従来台帳の`platform: -`は修正する。

`PLATFORM-NATIVE`の保証範囲はAndroidランタイムとiOSビルド限定を区別する。ストアフロントの閲覧はWebでは管理者・オペレーターもゲスト相当で行えるが、Androidでは管理画面と管理者の購入導線を対象にしない。誤ってWebのRole一覧をNativeへ一律適用しない。

以上は分類の修正であり、すべてのRole/State組合せを実機やSeedで確認し終えたという意味ではない。

## 追加のUse Case監査

`AdminProductUseCases.duplicate`は商品コード/SKUをクリアし初期在庫0の新規フォーム用DTOを返し、複製操作ではDBへ保存しない。`bulkChangeStatus`は0件/51件/重複IDを入力段階で拒否し、最大50件を1件ずつ変更する部分成功契約。`AdminReviewUseCases.getDetail`はStaff権限を検査してレビューと変更履歴を返し、`bulkChangeVisibility`は件別の成功・失敗と公開レビュー集計を分けて処理する。該当4件を仕様・Use Case・Seedと照合して`analyzed`へ変更した。

別の確認事項として、`AccountUseCases.suggestAddress`はUse Case内部に`requireCustomer`を持たず、画面の顧客限定とUse Caseのアクセス可能範囲を混同できない。また`CatalogUseCases.listReviews`は`customerGateway`経由で空の一覧を返すため、Web/Nativeの期待結果を一律に定義できない。これらは分析未完了のまま、台帳に論点を記録した。

## 追加監査：配送先一覧・配送先削除、価格承諾とカテゴリー並び替え

- `SCREEN-CHECKOUT-ADDRESSES-A01-01`：配送先一覧の仕様、Web/Native呼出し、`AccountUseCases.listAddresses`の顧客認可、Dexie/SQLiteの`listByUser(userId)`を照合。両者とも本人の`userId`で抽出し、`createdAt`と`id`で順序を確定する。初期`default`/`regular-member`には住所がないため、本人・別顧客住所を作成して確認する条件へ変更。注文・決済の責務を混同しない。
- `UC-ACCOUNT-DELETE-ADDRESS`：Use Caseの`requireCustomer`、Dexie/SQLiteの所有者検査・`expectedVersion`・既定住所再割当を照合。非既定/既定/最終住所と別顧客・旧versionの具体的な条件を定義し、分析済みに変更。既存のWeb統合テストに既定住所の再割当例があるが、すべてのCaseを新規実行したという意味ではない。
- **追加分析済み2件。基本分析済み14/188（7.45%）、確認待ち174件**。状態別条件20件は依然として未レビューであり、暫定分母188件は変更しない。
- `UC-CART-ACCEPT-PRICES`：Web/Nativeの実際の`CartUseCases`構築経路はRepository-backedであり、NativeをGateway専用とみなす推測は誤り。価格承諾では各明細のversion、公開状態、在庫0等を確認するが、数量が残在庫・購入上限を超える際の価格承諾自体の拒否条件は別途照合が必要。未分析のまま。
- `UC-ADMIN-REORDER-CATEGORIES`：`reorder`は全カテゴリーIDを要求し、取得側`listAllForReorder`は`pageSize:50`である。Seedは4カテゴリー。51件以上を作成可能な場合の操作成立性と正式仕様が未確認のため、分析済みにしない。

全機能の実ブラウザ・Native実行や全境界Caseの合格を主張する更新ではない。構造Validatorの成功も意味レビューの代替にしない。

## カテゴリー並び替え・カート価格承諾の実装境界（追加監査）

- **カテゴリー並び替え**：正式カテゴリ管理画面の並べ替え入力は全IDと各versionを送る。Dexieの更新処理も全カテゴリーIDを要求する一方、従来の一覧取得は先頭50件のみだった。取得処理を50件ずつ全ページ取得する形に修正し、Seedの既存4件へ47件追加した51件の回帰テストを追加。重複・欠落・旧versionの拒否契約は維持した。
- **価格承諾**：Web/Native双方のCart Repositoryは現行商品の可否を判定していたが、在庫が正の数で、明細数量が現在の在庫・購入上限を超える場合でも価格を更新できた。既存の`maximumCartQuantity`を使って明細数量を検査し、拒否時は`QUANTITY_LIMIT_EXCEEDED`でCart・明細version・価格を変更しない。Native UIでも非価格ブロックが残る場合は承諾ボタンを無効にした。Dexie/SQLite双方に回帰テストを追加。
- この2動作について仕様、Use Case、UI、Repository、Seedの条件分岐を確認し、**基本分析16/188（8.51%）、確認待ち172件、状態別条件20件未レビュー**とした。修正後の実行結果はCIで別途判定する。

実公開Template・Codespaces/OpenCode受入と機能分母の最終確定は依然として未達である。

## 郵便番号候補の顧客認可

`UC-ACCOUNT-SUGGEST-ADDRESS`はWebの顧客用配送先画面から呼び出されるが、Use Case内部に顧客認可がなかった。正式仕様のUse Case層での認可要件と整合させるため、`AccountUseCases.suggestAddress`へ`requireCustomer()`を追加し、guest/operatorの拒否とcustomerの候補取得・辞書未登録時のnullを統合テストへ追加した。固定辞書は外部通信せず、住所の保存処理とは独立。Nativeはサービス経路を提供するが、補完UIを提供しているとは扱わない。

**基本分析17/188（9.04%）、要レビュー171件**。状態別条件20件は未レビュー。動作分母188件は暫定のままである。

## 配送先登録・編集・空状態の追加監査（2026-10-31）

`SCREEN-CHECKOUT-ADDRESSES-A01-02`（追加）、`A01-03`（編集）、`A02-01`（住所未登録案内）と、その状態別条件`SCREEN-CHECKOUT-ADDRESSES-S-empty`を正式仕様、Web/Nativeの画面とUse Case、Dexie/SQLite Repository、初期Seedで照合した。

- **追加**：初期住所0件、1件目の既定住所付与、2～5件目の追加と既定切替、6件目の拒否、郵便番号・電話番号の正規化、不正入力・顧客以外の拒否。住所保存は注文・決済確定とは独立している。
- **編集**：本人所有者ID、expectedVersion、既定住所の保持と別住所の既定昇格、他人住所・旧version・未登録ID・不正入力を区別する。WebとNativeとも対応Use Caseを共有する。
- **未登録状態**：`default`/ `regular-member`の`userAddresses=[]`を実際の成立条件として確認。Webでは空メッセージと同画面の新規登録フォーム、Nativeでは未登録メッセージと新規住所フォームを表示。Webの0件表示と入力フォームが共存することをcomponentテストへ追加した。視覚状態`empty`の必須リファレンスはWebデスクトップで、Nativeの空表示は機能上の動作として追跡する。

### 画面契約の要確認事項

`SCREEN-CHECKOUT-ADDRESSES-A01-04`（「配送先を選択」）の台帳は`/account/addresses`を操作対象としている。しかし、この画面で確認した操作は住所の表示・追加・編集・削除・既定切替であり、注文に使う住所のラジオ選択と「この配送先を使用」は`/checkout/address`（`SCREEN-CHECKOUT-ADDRESS`、`src/presentation/pages/checkout-order-pages.tsx`）で提供される。正式仕様には`SCREEN-CHECKOUT-ADDRESSES`の機能説明に「選択へと進める」とある。画面をまたぐ導線か、別画面の機能の重複計上かを整理するまで、当該操作は`review_required`を維持する。暫定分母188件も、この点を含む全機能調査の完了までは確定しない。

上記の監査を反映し、**基本分析20/188（10.64%）、確認待ち168件、非default状態別条件19/20件未レビュー**。分類済みであっても全件テスト成功とは扱わない。

## 住所管理画面の「選択」機能分類を修正（2026-10-31）

`SCREEN-CHECKOUT-ADDRESSES-A01-04`について、正式画面カタログの`/account/addresses`、Web `addresses-page.tsx`、Native `NativeAddressesScreen`、別画面`/checkout/address`のWeb/Native実装を照合した。

- 住所管理画面の操作は「既定にする」であり、`AccountUseCases.updateAddress({addressId, expectedVersion, makeDefault:true, ...})`へ到達する。旧既定の`isDefault`を解除し、選択先を既定に設定する。DexieとSQLiteは所有者・version検査とトランザクションを持つ。
- 注文時の住所選択は別画面`SCREEN-CHECKOUT-ADDRESS`の操作である。Webは保存済み住所から選び`checkout.setAddress`へ住所スナップショットを渡す。Nativeは保存済み住所から入力欄へ反映した後に住所を確定でき、自由入力も可能。WebとNativeの条件差は別の分析対象とする。
- 画面仕様`checkout-and-payment.md`の住所管理機能説明を「一覧表示・追加・編集・既定の配送先設定」に改め、台帳`A01-04`の動作と紐づくUse Case・期待結果・テスト条件を修正した。既存の操作を単に削るのではなく、注文時の選択と独立した既定住所の設定動作として数えるため、**暫定188件を維持**する。
- Webの統合テストへ、非既定住所を既定へ昇格し、旧既定のversion更新と古いversionでの再更新拒否を確認するCaseを追加した。CI成功・Native実機受入は別途判定する。

以上により基本分析**21/188（11.17%）**、残り167件、非default状態別条件19件未レビュー。機能母集団の最終確定・全対象受入は引き続き未達。

## アカウントプロフィールの4操作を追加分析（2026-10-31）

`SCREEN-AUTH-ACCOUNT-PROFILE`の本人プロフィール、会員ランク、アカウント状態、管理者機能・内部IDの非表示を、`authentication.md`、`roles-and-permissions.md`、`AccountUseCases.getProfile`、Web/Native UI、Seedの3種類の会員シナリオで照合した。

- **本人情報**：`SessionIdentityResolver.requireCurrentEntity`と`AccountUseCases.requireCustomer`で本人・active顧客に限定し、Web/Androidともメール・表示名・電話番号を本人のDTOから表示する。guest、operator/admin、suspended/withdrawnは認証・権限で拒否される。
- **ランクと特典**：Webが表示する一般/ゴールド/プラチナ、割引率0/5/10%、送料閾値5,000円・プラチナ無条件無料の表示が、以前のNativeにはなかった。Native画面に共通`labels.rank`、`membershipDiscountRate`、`FREE_SHIPPING_THRESHOLD`を用いた表示を追加した。
- **アカウント状態**：Webでは`active`を「利用中」と表示していたが、Nativeでは項目自体が欠落していた。Nativeに`labels.account`による「アカウント状態：利用中」を追加した。停止/退会済みの状態はプロフィールを見せず、Use Caseが拒否する契約を維持した。
- **情報の非表示**：両UIとも内部`user.id`やRole変更・管理用操作を表示しない。DTO内部にIDが存在することとユーザー向け表示を分け、Web/NativeのcomponentテストでID非表示と各ランク表示を確認するCaseを追加した。

これら4件の仕様・Use Case・Seedの分岐が照合できたため、台帳上の基本分析を`analyzed`にした。**基本分析25/188（13.30%）、要レビュー163件、非default状態19件未レビュー**。Native実機・最新CIの成功は別途確認し、分析記録だけで受入完了としない。

## Checkout再開通知のWeb限定状態を個別監査（2026-10-31）

`SCREEN-CHECKOUT-ADDRESS-S-resume-notice`は`SCREEN-CHECKOUT-ADDRESS-A02-01`の非default状態条件であり、独立動作として二重計上しない。正式仕様では`web-desktop`のみ必須。Roleはactive Customerで、guest/operator/adminおよび停止・退会済み顧客は購入不可。

`checkout-resume` Seedは`regular@example.com`、Cart version=1と同versionのactive `checkout-active`セッション（unlockedStep=address、version=1）を生成。固定時計2026-07-01T03:00:00Zから24時間有効。Webの`CheckoutOrderUseCases.start`→`CheckoutAddressContent`→`claimCheckoutNotice`を追跡し、初回の再開通知、同Session reloadでの非表示、Seed Reset後の再表示、Cart版変更による置換通知の区別を確認した。`e2e/web/ui-ux-improvements.spec.ts` Flow C（141-155行）にも同条件の期待結果がある。**既存E2Eの存在を最新HEADのPASSとは扱わない。**

この状態条件1件を`analyzed`へ変更。**基本操作25/188（13.30%）、残163件、状態別条件18/20件未レビュー**。親のWeb/Native再開操作は入力復元やプラットフォーム差の精査が残るため`review_required`のまま。分母188件は暫定、Template/Codespaces/OpenCode受入も未完了。

## Checkout配送先入力と決済ステップ遷移の追加監査（2026-10-31）

`SCREEN-CHECKOUT-ADDRESS-A01-02`を仕様、Web・Native UI、`CheckoutOrderUseCases.setAddress`、Dexie・SQLite Repository、`regular-member` Seedで照合した。Webは本人が登録した配送先を選択して保存し、Nativeは保存済み住所の反映または直接入力した住所Snapshotを保存する。両経路とも正常な保存後だけ`/checkout/payment`へ遷移し、Sessionの`version`を1増加して`unlockedStep=payment`にする。保存が失敗した場合はエラーを表示して前画面を維持し、注文・決済は作らない。

確認過程で、`CheckoutOrderUseCases`の住所検証が文字数上限だけを確認し、必須項目の空欄、郵便番号の桁数、電話番号の桁数を拒否しない不備を発見した。Nativeの直接入力から不正な住所SnapshotがSessionへ保存され得たため、顧客の`AccountUseCases`と同様に入力値の正規化（前後空白、郵便・電話の数字化）と必須/形式/長さ検証を追加した。異常値が保存されずSessionのversion/stepが変わらないこと、有効なハイフン付き郵便・電話を正規化保存できることを統合テストへ追加。Web/Nativeの画面に保存失敗時の非遷移テストも加えた。

`SCREEN-CHECKOUT-ADDRESS-A01-01`の操作自体は**引き続き`review_required`**とした。Webは登録済み住所がなければ選択できないが、Nativeは保存済み住所が0件でもフォームに固定の初期住所が入り、直接入力のまま進める。正式な画面仕様には「配送先を選択」とあるものの、登録済み住所を必須とするか、Nativeの自由入力を許可するかまでは書かれていない。今回の形式検証修正で不正な値は拒否するが、登録済み必須という仕様判断までは代行しない。Web・Nativeの受入期待を確定してから分析を完了させる。

分析集計は**26/188件（13.83%）**、残り162件、非default状態別条件18/20件未レビュー。CI成功・Android実機・画面リファレンス受入と、実Template/Codespaces/OpenCode受入は別に確認する。

## チェックアウト再開とセッション置換の追加分析（2026-10-31）

`SCREEN-CHECKOUT-ADDRESS-A02-01`（セッション再開通知）と`SCREEN-CHECKOUT-ADDRESS-A02-03`（置換通知）を仕様、Web/Native、Use Case、Dexie/SQLite、固定Seedで照合した。状態別条件の`SCREEN-CHECKOUT-ADDRESS-S-resume-notice`は別の操作として二重加算しない。

- 同じ顧客・Cart/versionで期限内のCheckout Sessionは`resumed`として同じセッションを返す。Webの通知は`sessionStorage`で同一Session/通知種別につき初回のみ。Nativeは`getActive`を使い既存の配送先入力を復元する。
- Webの再開画面は以前の`addressSnapshot`を参照せず、常に既定住所を選択していた。非既定住所で進行して戻ると意図しない配送先変更になり得るため、Snapshotに一致する登録住所を復元し、一致する住所がない場合は既定住所へ無断で変更せず再選択を要求するよう修正した。Web componentテストで非既定住所の復元と、変更・削除された住所を検出するCaseを追加した。
- `checkout-replaced` Seedは旧Sessionの`cartVersion=1`、現Cart`version=2`を生成する。Use Caseの`start`とDexie/SQLiteの`startOrResume`は旧Sessionを`abandoned`にし、新Sessionを住所・支払方法なしで作成する。Webは置換通知を表示するが、Nativeでは以前`replaced`を`started`へ潰して「Checkoutを開始しました」と表示していた。Nativeで置換を独立の結果として保持し、通知とcomponentテストを追加した。
- `SCREEN-CHECKOUT-ADDRESS-A01-01`のWeb「保存済み住所の選択」/Native「自由入力」の仕様差と、旧Session全般の案内操作`A02-02`は未分析として残す。今回の修正はその仕様判断を代行しない。

以上で**基本分析28/188（14.89%）、確認待ち160件、状態別条件18/20件未レビュー**。新しい回帰テストと画面改修はCI・実機の最終PASSを別途確認する。

## チェックアウト決済方法の選択と確認遷移の監査（2026-10-31）

`SCREEN-CHECKOUT-PAYMENT-A01-01`（決済方法を選択）と`A01-02`（確認画面へ遷移）について、正式BR/AC、Web/Native Payment UI、`CheckoutOrderUseCases.getActive/setPayment`、Dexie/SQLite、`regular-member`/`checkout-resume` Seedと関連テストを照合した。

- `PAYMENT_METHODS`は`TEST-SUCCESS`、`TEST-DECLINED`、`TEST-INSUFFICIENT`、`TEST-AUTH-FAILED`の4種類。UIのTypeScript型だけでは実行時の不正コードを拒否できないため、Application境界に許可リスト検証を追加。未許可コードは`VALIDATION`で拒否し、Sessionの決済方法・version・ステップを不変に保つ統合テストを追加した。
- Webの決済方法保存は以前`try/finally`のみで、保存失敗時にエラー表示がなく未処理Promiseが発生し得た。Nativeと同じく失敗時に画面へエラーを表示し、`/checkout/confirm`へ進まず、再試行可能にする修正とcomponentテストを追加した。
- 配送先の再選択が必要な場合、共通サマリーボタンが`disabled`だけで「処理中…」と表示していた。送信中`busy`と操作不能`disabled`を分離し、住所未選択時は操作名を保持するよう修正した。
- NativeのCheckout復帰処理が、保存領域の読み取り失敗など予期しない`getActive`エラーまで新Session開始に変換していた。復帰対象を`CHECKOUT_STEP_INCOMPLETE`/`CART_VERSION_CHANGED`/`CHECKOUT_EXPIRED`に限定し、`STORAGE_READ_FAILED`時はCart取得・Session新規作成をせずエラーを表示するcomponentテストを追加した。
- CI `41088684235`の実ログを調査。契約テストの失敗は37件の実装行参照の古さと、既に分析済みの再開操作を未分析と期待するテストが原因。実装行37件、Use Case証拠7件、公開メソッド7件の参照を実ソース署名に合わせて更新し、契約テストを修正した。componentテストの失敗は無選択時のボタン表示名の誤り。Style QualityはNative/Web/契約テストのPrettier形式違反が原因で、対象を修正した。これらの最新CI成功は未確認であり、古いCIのPASSに読み替えない。

**現時点：基本分析30/188件（15.96%）、確認待ち158件、非default状態条件18/20件未レビュー。** 188件は暫定分母。Android実機・正本画面リファレンス・実Template/非公開2コアCodespaces/OpenCode実モデル校正の必須受入は未完了。

## 支払方法の再選択と未完了・古いセッションの扱い（2026-10-31）

Webの`CheckoutPaymentContent`とNativeの`NativeCheckoutPaymentScreen`では、確認画面から支払方法選択へ戻ると常に`TEST-SUCCESS`が初期選択になっていた。保存済みSessionに`TEST-DECLINED`等が指定されていても成功決済で上書きできるため、両UIで`paymentMethodCode`を初期選択として復元し、利用者が変更した場合のみUI選択を優先するよう修正した。Web/Nativeのcomponentテストに`TEST-DECLINED`から戻った場合の保存値維持を追加した。

`SCREEN-CHECKOUT-PAYMENT-A02-01`（住所未保存のセッション拒否）と`A02-02`（Cart version不一致の拒否）は、`checkout-and-payment.md`、`CheckoutOrderUseCases.getActive('payment')`・`setPayment`、Web/Nativeのエラー画面、`regular-member`・`cart-version-invalidates-checkout` Seedで照合した。住所未設定なら`CHECKOUT_STEP_INCOMPLETE`、Cart version不一致なら`CART_VERSION_CHANGED`を返し、Sessionの`paymentMethodCode`・`version`・`unlockedStep`を更新しない。統合テストに保存状態不変を追加し、Web/Nativeでも支払確認への非遷移を検証するCaseを追加した。

この2件を`analyzed`に更新し、**基本分析32/188件（17.02%）、要レビュー156件、非default状態18/20件未レビュー**。自動テストの結果・Android実機・正式な画面リファレンスと、実Template/非公開Codespaces/OpenCode実モデル校正の受入は別管理とする。今回の修正時点でCIの最終PASSは確認していない。

## 注文確認の配送先と決済方法表示（2026-10-31）

`SCREEN-CHECKOUT-CONFIRM-A01-02`（配送先表示）と`A01-04`（選択済み決済方法表示）を、BR-CHECKOUT-002/AC-CHECKOUT-002、`CheckoutOrderUseCases.getConfirmation`、Dexie/SQLite、Web/Native UI、regular-member Seed、既存テストと照合した。

- Webの確認画面は配送先の`addressLine2`（建物名/部屋番号）を表示しておらず、Nativeは宛名・郵便番号・建物名/部屋番号に加えて支払方法も表示していなかった。両画面の注文確定前表示を補強した。
- Nativeの確認データ取得は確認Stepの検証より先に動作し得た。また取得に失敗すると`confirmation=null`のまま読み込み表示から抜けず、画面下のエラーに到達しなかった。確認Stepの有効性を確認してから取得し、失敗時はエラーと配送先へ戻る操作を表示するよう修正した。
- Webの建物名表示、Nativeの`TEST-DECLINED`/住所Snapshot表示・取得失敗・Step未完了をcomponentテストへ追加。これはテストコードの追加と仕様監査の記録であり、実行PASSやAndroid実機受入の証明ではない。
- `SCREEN-CHECKOUT-ADDRESS-A01-01`の「登録済み住所必須か、Native直接入力を許すか」は未決のまま維持。確認画面で保存済みSnapshotを正しく表示することとは分けて扱う。

**基本分析34/188件（18.09%）、要レビュー154件、状態別条件18/20件未レビュー**。188件は暫定分母であり、完了判定ではない。

## 決済処理中・完了・失敗の基本分析（2026-10-31、製品変更なし）

今回は`SCREEN-CHECKOUT-PROCESSING-A01-01`/`A02-01`、`SCREEN-CHECKOUT-COMPLETE-A01-01`、`SCREEN-CHECKOUT-FAILED-A02-01`/`A02-02`の5動作を監査し、`analyzed`へ変更した。根拠は`checkout-and-payment.md`の`BR-CHECKOUT-003`/`AC-CHECKOUT-003`、`CheckoutOrderUseCases.beginOrder`/`resumePayment`/`getMyOrder`と`resolveCheckoutResultKind`、Web/Native結果画面、`default`/`payment-processing` Seed、既存component/integrationテストである。

- `payment-processing` Seedは`order-payment-failed`を`pending_payment`、`payment.status=processing`に変更する。初期ログインはguestなので、画面確認には`regular@example.com`でのログインが別途必要。決済開始ではpending_paymentの注文とprocessingの支払試行を作り、処理画面から同じorderIdで`resumePayment`する。
- 決済完了画面はURL名ではなく`getMyOrder`で読み込んだ本人注文の状態と最新決済試行を`resolveCheckoutResultKind`で判定する。Web/Nativeの既存componentテストには、成功URLで失敗注文を開いた場合とその逆の反例がある。
- 重複`beginOrder`は既存Checkout SessionのorderIdに集約される。既存統合テストでは順次実行した2回の注文開始で同一結果となり、成功確定後の再`resumePayment`で在庫やGateway実行が重複しないことを検証する。**同時並列のGateway実行や実端末での重複タップまでは実証していない**。
- 拒否決済（DECLINED/INSUFFICIENT/AUTH_FAILED）は`finalizeFailure`、支払い直前の在庫不足は`OUT_OF_STOCK`分岐へ進み、注文は`payment_failed`になる。既存統合テストの在庫不変・Shipment未作成・在庫不足時の履歴なしの検査を確認した。

### 未解決の製品仕様・実装差異（このPRでは修正しない）

- `SCREEN-CHECKOUT-FAILED-A01-01`：画面仕様の`payment-declined`状態は「失敗理由と再試行アクション」を要求する。しかしWebは「支払いを完了できませんでした」、Nativeは「支払いに失敗しました」と汎用表示で、最新`paymentAttempts.errorDisplayKey`等に応じた拒否理由の表示を確認できない。失敗理由表示の検証は保留する。
- `SCREEN-CHECKOUT-FAILED-A01-02`：Webは4種類のテスト決済方法を選んで再試行できるが、Nativeは`TEST-SUCCESS`での再試行を固定する。プラットフォームで異なる選択契約が仕様上意図されたものか未決なので、分析済みとしない。
- `SCREEN-CHECKOUT-FAILED-A01-03`：仕様では「カート画面や注文内容確認への導線」が必要だが、Webの失敗画面は「注文詳細」「買い物を続ける」、Nativeの失敗画面は成功テストによる再試行のみで、カートまたは確認へ直接戻るアクションを確認できない。
- Webの`OrderResultContent.retry()`は`try/finally`のみで、`retryPayment`がrejectすると画面に失敗理由を表示する`catch`がない。決済再試行失敗時の操作可能性とエラーハンドリングを追加調査対象とする。

上記は読み取り監査による問題候補であり、実ブラウザ/Android実機での再現、CI結果、影響範囲の最終判定は未完了。製品の修正はせず、必要なら別Issue/別PRへ切り出す判断を求める。

**基本分析46/188件（24.47%）、未分析142件、非default状態条件17/20件未レビュー。** 残り全件の分析と、学習用Template→2コアCodespaces→OpenCode校正等の受入は継続する。

## 注文確認の明細・金額・Cart競合・修正導線の監査（2026-10-31）

`SCREEN-CHECKOUT-CONFIRM-A01-01`（商品/数量）、`A01-03`（価格内訳）、`A02-01`（古いCart）、`A02-02`（価格変更）、`A02-03`（修正導線）と状態別条件`SCREEN-CHECKOUT-CONFIRM-S-stale-cart`を正本仕様、Use Case、Dexie/SQLite、Pricing、Web/Native、Seedと照合した。

- Webは商品名・SKU選択肢・数量・明細額、小計・割引・送料・合計を表示する。Nativeは商品名・数量・明細額・合計のみだったため、SKU選択肢、商品小計、会員割引、送料を確認画面へ追加した。確認DTOに税の独立項目はないため、台帳の「税」を現行仕様として断定しない。
- `getConfirmation`と`beginOrder`はCart版の不一致を`CART_VERSION_CHANGED`、商品現在価格とCart追加時の単価差を`PRICE_CHANGED`として拒否する。2種類の競合を確認画面アクセス前/確認後に発生させ、Checkout Session・注文・決済・在庫を変更しない統合テストを追加した。
- Webの確認データ取得失敗時は以前`/checkout/payment`への固定戻り先で、古いCart状態から復旧できなかった。Cart版/価格変更などの既知エラー時はカートへ戻し、確認画面を表示済みで確定失敗した場合もカート確認リンクを表示する。Nativeも確認画面の読み込み失敗・確定失敗時にカートへ戻る操作を用意した。
- `cart-version-invalidates-checkout` Seedは旧Sessionが住所Stepで止まるため、これだけで確認画面のstale-cart表示を実証したことにはならない。新Sessionを確認可能な状態に進めた後にCart版を変更する条件を回帰テストへ追加した。視覚リファレンスの実ブラウザ比較は未実施。
- Web/Native表示・失敗導線、Use Caseの拒否・注文/決済/在庫不変の回帰テストコードを追加した。ただし現行HEADの実行PASS、Android実機や正本スクリーンショットとの一致、実Template/Codespaces/OpenCode技術受入は未確認。

**基本分析39/188件（20.74%）、未分析149件、状態別条件17/20件未レビュー**。188件は最終分母ではない。配送先入力のWeb/Native差`SCREEN-CHECKOUT-ADDRESS-A01-01`も未決。

## 注文完了画面の注文番号と履歴導線の個別監査（2026-10-31）

`SCREEN-CHECKOUT-COMPLETE-A01-02`と`A01-03`を、BR-CHECKOUT-003/AC-CHECKOUT-003、`CheckoutOrderUseCases.getMyOrder`の本人所有権、`resolveCheckoutResultKind`の最新決済試行、Web/Native結果画面、`default` Seedの注文実値と照合した。`default-dataset.ts`には本人`user-customer-regular`の`paid`注文`order-paid`（業務注文番号`ORD-20260701-0002`）があり、`payment_failed`/`payment-processing`は成功扱いしない反例となる。Seedの初期ログインはguestなので、本人でのログインが必要。

- Webは`orderNumber`を表示し、本人の注文詳細`/orders/{orderId}`へ遷移する。Nativeは以前、業務注文番号ではなく内部`orderId`を「注文ID」として表示していた。Nativeの成功画面を`orderNumber`表示へ修正し、既存Maestroの`native-complete-order-id`テストIDは互換性のため維持した。
- Web/Nativeのcomponentテストに、業務注文番号の表示、内部IDの非表示、Web注文詳細リンク、Native注文一覧への遷移を追加した。欠落/他人の注文IDを拒否する既存テストと併せて検証対象を定義した。
- 2操作を`analyzed`へ更新。**基本分析41/188件（21.81%）、要レビュー147件、非default状態条件17/20件未レビュー**。188件は暫定分母。コード・テストはCI/Android実機・正本画面比較のPASSを未実証。別途確認する。

CI調査では、HEAD `d22e366` のAndroid production-validation jobでNDK 27.1.12297006のインストールが`Error on ZipFile unknown archive`となりGradle構成に失敗した。これはアプリコードのコンパイルエラーではなくSDKアーカイブ取得・展開の失敗であり、CI再実行/再現状況で原因を切り分ける。再実行成功を確認するまではAndroid CIをPASSにしない。

### 前HEADのWeb CI失敗の根拠と修正（2026-10-31）

Web CI [41099183628](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41099183628)の実ログでは、TypeScript `TS2375`（`CheckoutLoadError`へ`body: undefined`を明示的に渡した）、Componentの住所表示テスト（`<address>`の複数テキストノードを単独の完全一致で探していた）、Required E2E 06（古いCartを検出した際の案内文を更新前の文言で期待）が失敗していた。任意`body`の省略、`<address>`要素のテキスト検証、Cart再確認メッセージと`/cart`リンクを確認するE2Eへ修正した。Style QualityではNative画面・Web component・台帳contractの3ファイルにPrettier違反があり、**この時点で完全解消の確認は未了**。最新CIで再判定する。構造contractの分析件数期待値も41/188へ同期した。

## 低在庫と検索ゼロ件の状態別基本分析（2026-10-31、SUT変更なし）

- `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-low-stock`：`low-stock`は`variant-basic-shirt-02`（ベーシックTシャツM）の在庫だけ10→3へ変換する。S=20、L=0、購入上限5は不変。Webの初期選択は在庫あり先頭のSなので、Mを**明示選択**して初めて「残り3点」、上限5点、数量選択1〜3を検証できる。正式`BR-STOREFRONT-003`/`AC-STOREFRONT-003`、`CatalogUseCases.getProductDetail`→Dexie `getDetail`→`ProductDetailView`、既存Seedとcomponentテストを読み取り監査。既存componentテストはDTOモックであり、実Seed/ブラウザ実行PASSではない。
- `SCREEN-STOREFRONT-SEARCH-S-no-results`：`many-products` Seedの公開1000件に対し、`/search?q=ZZZ-NO-MATCH-2026`を入力すると検索対象の固定文字列に一致せず、`CatalogUseCases.search`→Dexie `matchesSearch`→`pageItems`でtotal=0/items=[]、Webの`filter-empty`と「条件をすべて解除」へ進む。解除後`/search`へ戻る。正式`BR-STOREFRONT-002`/`AC-STOREFRONT-002`、既存componentテストを照合。guest/customerと一致検索語の対照をCaseに採用。
- **未解決の仕様・Seed対応差異**：正式`storefront.md`のno-results行は条件を`search-empty`とするが、`src/seeds/metadata.ts`/`scenarios.ts`に同名固定シナリオは存在しない。重大度Low〜Medium（再現手順・画面正本技術受入への影響）。既存`many-products`と検索語の入力で基本分析は成立するが、`search-empty`固定Seedの存在や視覚/E2E受入をPASSとはしない。教材では「入力で再現する代替条件」として明示できる。正式シナリオの整合修正は製品/仕様/Seed変更禁止のため提案に留める。新たなSeedが本当に必要かは視覚受入手順を確認してから判断する。
- **基本分析46/188件（残り142）、状態条件11/20レビュー済み（残り9）**。188件は暫定。状態条件2件は親操作の基本分析に加算せず、親`SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-05`/`SCREEN-STOREFRONT-SEARCH-A02-01`は未分析を維持。実ブラウザ・Native・視覚正本受入は未実施。
- 直前HEAD `620d15e2`の[Web CI 41124666661](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41124666661)はStyle Quality失敗。実ログでは`src/presentation/native/native-purchase-screens.tsx`（SUT変更禁止）と`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`（学習用）のPrettier違反。後者は本更新後のCIで再確認し、残れば学習用範囲内で修正する。その他Web unit/integration/component/contracts、E2E各jobは成功。前HEAD Mobile CI 41124666760は成功。新HEADでの成功は別途確認。
- PR既存差分には製品Use Case/Repository/UI、正式`docs/spec/features/checkout-and-payment.md`、既存component/integrationテストが含まれる。**これらは過去差分として保持・仕分け対象とし、本更新では一切変更していない**。製品不整合をIssue化/別PR化する場合は事前承認を待つ。

## 2026-10-31 ログイン入力検証状態の読み取り監査（SUT変更なし）

- `SCREEN-AUTH-LOGIN-S-validation-error`を`authentication.md:9-35`のBR/ACとWeb必須状態、`auth-pages.tsx:21-35/101-181`のRHF/Zod、`form-error-summary.tsx:15-47`、`AuthUseCases.login:52-62`、既存componentテスト`auth-account-pages.test.tsx:138-181`、default Seedのguest初期状態と照合した。空2項目、invalid-email＋有効password、同一エラー再submit、入力修正の境界を分離。無効送信はUse Case/Repositoryへ到達しない。**状態条件12/20レビュー済み（残り8）、基本操作46/188（残り142）**。親ログイン操作は未分析。
- 前HEAD [Web CI 41132431772](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41132431772)はStyle QualityでFAIL（学習用contractと既存製品Native画面の2ファイル）、他のWeb契約/単体/統合/コンポーネント/主要E2Eは成功。Mobile CI 41132432188はsuccess。学習用contractの長いoptional-chain式を整形し、今回のCIで再検証する。製品Native画面は変更禁止のため未修正。
- 188操作は暫定分母。今回の判定はソースと既存テストの証拠付き基本分析であり、実ブラウザ・画面正本の受入PASSではない。既存PRの製品差分は保持。公開Template/Private 2-core Codespaces/OpenCode実モデル校正は未完了。

## 2026-10-31 管理在庫stock-boundariesの仕様差とCI実ログ再監査（SUT変更なし）

- **正式契約**：`docs/spec/features/admin-inventory.md:9-11,25-35,59-63`はSKU在庫0=`out_of_stock`、1〜5=`low_stock`、6以上=`available`の**相互排他的な3状態**、0/1/5/6の境界、SKU一覧と商品概要の表示・件数一致を要求する（BR-ADMININV-001、AC-ADMININV-001）。
- **UI/Use Case**：`src/presentation/pages/admin-operations-pages.tsx:75-220`の在庫フィルターは「在庫あり/低在庫/在庫切れ」で、表の「状態」列は`ActiveBadge(item.isActive)`（SKU有効/無効）であり、在庫状態3区分のラベルではない。`AdminOperationsUseCases.searchInventory:57-71`はstaffを認可し、`stockState`をRepositoryへ転送する。
- **Repository**：`src/infrastructure/database/dexie/product-repositories.ts:549-659`の`DexieInventoryRepository.search`は`out`=0、`low`=1〜5、`available`=**1以上**で絞り込む。よって在庫1〜5が「低在庫」と「在庫あり」の両方に含まれ、正式契約の「6以上=available」と不一致。SKU状態（active/inactive）フィルターと在庫状態は別軸であり混同しない。これは既存製品実装の不整合候補（重大度Medium、件数/表示の誤判定・教材の誤学習リスク）として扱う。
- **既存Seedと境界Case**：`src/seeds/default-dataset.ts:67-244,294-328`に在庫0（スポーツボトル）、2（プレミアムバッグ）、3（コンパクトタオル）、5（ランニングシューズ等）、10/20/50（Tシャツ等）があり、0/5/6以上の代表は新Seedなしで用意できる。1は既存SKU在庫2をstaffの通常在庫調整で1にしてから検証する（`adjustInventory`はVersion/履歴を確認）。`low-stock` SeedはTシャツMを3へ変更するが、defaultにも0/低/通常の区分がある。全Caseでstaff権限・フィルター結果件数・同一SKUの表示を対比する。
- **既存テスト/不足**：`tests/component/admin-operations-pages.test.tsx:160-181`は在庫調整・履歴を確認するが、3状態ラベル/フィルター0/1/5/6の境界を網羅しない。実ブラウザ/視覚正本比較は未実施。学習用のCase設計には仕様値をオラクルとし、現行製品の表示を正しい期待として固定しない。
- **判定**：`SCREEN-ADMIN-INVENTORIES-S-stock-boundaries`と親`SCREEN-ADMIN-INVENTORIES-A02-01`は**review_requiredのまま**。仕様/実装の不一致と1境界の実操作・画面証拠が残るため、分析済みへ偽装しない。製品本体・正式仕様・既存Seed・既存テストは変更しない。Issue化/製品修正は承認待ち。基本操作54/188、状態18/20を維持する。
- **最新CI実ログ（HEAD `265dd8a4bebe`）**：[Web CI 41164447696](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41164447696)はfailure。Vitest contracts/Training runtime contracts/主要E2Eはsuccess、Style QualityのFormat checkで`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`と変更禁止の`src/presentation/native/native-purchase-screens.tsx`の2ファイルがPrettier違反。verify/validateはStyle Qualityに連動してfailure。[Mobile CI 41164447687](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41164447687)はsuccess（Android Runtime/Maestro・iOS verify含む）。学習用contractの重複した`out-of-stock`監査Assertionを整理し、次HEADで書式を再検証する。Native製品ファイルは触らない。

## 2026-10-31 公開一覧ページングと検索0件の親操作監査（SUT変更なし）

- `SCREEN-STOREFRONT-PRODUCT-LIST-A01-02`：正式`storefront.md:63-74/212-216`、`CatalogUseCases.search:86-93`、`DexieProductQueryRepository.search:101-127/buildCandidates:249-314`、`pageItems:10-25`、Web `CatalogListContent:133-160/534-539`、Native `NativeCatalogScreen:119-176/NativeCatalogResultSummary:1143-1177`、既存`many-products` Seed `scenarios.ts:424-450`を照合。公開1000商品、各active SKU3件、20件/ページ・50ページ、Webの`?page=2`、Nativeの`page` state、先頭/最終ページの前後ボタン無効化を個別Caseに分離。guest/customer・default対照・page=51・フィルター後page=1も採用。実ブラウザ/Android実行と視覚正本一致は未確認であり、静的基本分析のみ`analyzed`。
- `SCREEN-STOREFRONT-SEARCH-A02-01`：正式`storefront.md:141-155`、`CatalogUseCases.search:86-93`、Dexie `matchesSearch:56-95/search:101-127`、Web `CatalogListContent:502-525`、Native `NativeSearchWithInitial:295-350/566-581`、既存`many-products` Seedと既存Web component `catalog-pages.test.tsx:315-324`を照合。未一致語`ZZZ-NO-MATCH-2026`で`total=0/items=[]`を導出し、Webの`filter-empty`文言と解除CTA、Nativeの「該当する商品がありません」を区別。通信失敗・未検索・非0件を反例とし、条件解除操作`A02-02`の成否は別判定。正式仕様に記載された`search-empty`専用Seedが未登録という差は未決のまま保持。
- **判定**：親操作2件を`analyzed`へ更新し、**基本操作56/188件・残り132件、非default状態18/20件・残り2件**。188は暫定分母。両操作はBR/AC、Role、Data、State、Use Case→Repository→Web/Native、Seedの読み取り根拠を台帳に保持。製品実装・正式仕様・既存Seed/Reset・既存製品テスト/workflowは変更していない。
- **CI**：HEAD `5ac4fb10505d` の[Web CI 41166820603](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41166820603)ではVitest contracts/Training runtime contracts/主要E2Eが成功、Style Qualityのみ`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`と製品`src/presentation/native/native-purchase-screens.tsx`のPrettier違反。製品ファイルは変更禁止。学習用契約テストは診断commit `d4e5ddaf`の[Web CI 41169187496](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41169187496)で正規整形差分を採取し、一時診断を撤去して修正する。新件数の契約期待値同期と新HEADのPASSは未完了。
- **学習用契約CIの追跡結果**：[診断Web CI 41169187496](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41169187496)のVitest contractsログでPrettier 3.8.1の差分を取得。学習用contractの`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`の長い`find(...)? .analysis_status`（空白なしのoptional chain）の折返し1箇所が実際の差分。commit `587c92b`で正規整形へ変更し、CI診断用テストを撤去、基本操作56/188・残り132・29.79%とページング/検索0件の親操作Assertionを同期した。新HEADでのStyle Quality/Vitest contractsは検証待ち。製品Nativeの既知Prettier違反は変更禁止範囲として保持。

## 2026-10-31 商品カードから詳細へのID一致を基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-PRODUCT-LIST-A02-01`。正式`storefront.md:63-74/208-216`のカード→詳細導線、`CatalogUseCases.search:86-93/getProductDetail:108-126`、Dexie `storefront-repositories.ts:101-127/249-334`の`canViewerSeeProduct`/active SKU/返却`productId`、`permissions.ts:11-31`を照合。
- **Web/Nativeの同一ID経路**：Web `CatalogListContent:525-532`→`ProductCard:11-37`で画像と商品名が同じ`/products/{product.productId}`を指す。Native `NativeCatalogScreen:278-289`→`NativeProductCard:1023-1054`はカード全体の`Link`に同じIDを渡す。`NativeProductDetailScreen:586-608`は動的`productId`を`getProductDetail`へ渡す。Webの実ルート・実クリック、Nativeの実遷移、視覚正本一致は別受入であり未PASS。
- **既存Seedと採用Case**：`default-dataset.ts:67-208`で公開`product-basic-shirt`/`product-mug`を正例、guestではgold必須`product-running-shoes`を非表示、`product-unpublished`/`product-draft`/`product-discontinued`を除外反例とする。公開かつ在庫0の`product-out-of-stock`はカードから詳細へ進める対照（購入可否は別操作）。guest/regular/gold、Web画像/商品名、Nativeカード、many-products 2ページ目のID、empty-catalogカード0を代表Caseに採用。既存`metadata.ts:75-106`と`scenarios.ts:20-45`のResetを再利用し製品Seedは追加しない。
- **判定・リスク**：静的なUse Case→Repository→UI/Seed証拠により親操作を`analyzed`へ更新。ID取り違え、閲覧制限漏れ、在庫0と非公開の混同を別々に検証する。**基本操作57/188（30.32%、残り131）、非default状態18/20（残り2）**。188は暫定分母。Web/Android実行・視覚正本・直接URL拒否・購入実行は未受入。製品コード/正式仕様/既存Seed/製品テストは変更していない。

## 2026-10-31 Home新着・セール導線の静的基本分析（SUT変更なし）

- **対象と正式契約**：`SCREEN-STOREFRONT-HOME-A01-03`（新着）と`A01-04`（セール）。`docs/spec/features/storefront.md:9-39`のBR-STOREFRONT-001〜003/AC-STOREFRONT-001、閲覧者条件・時刻・主要導線を根拠とした。既存default Seedの公開日/会員制限/セール価格と`BASE_CLOCK=2026-07-01T03:00:00Z`、`expired-sale`の`2026-07-02T03:00:00Z`を照合した。
- **Use Case→Repository**：`CatalogUseCases.getHome:80-84`がviewer/clockを注入。Dexie `storefront-repositories.ts:249-315/393-415`は公開・ランク・active SKU候補から公開日降順＋productCode同順位の最大8件を`newProducts`に、`hasActiveSale`の最大8件を`saleProducts`に返す。Native SQLite `native-customer-repositories.ts:214-258`も同じ候補・ソート・上限を持つ。`pricing.ts:18-38`の有効期間は開始を含み終了を含まない。
- **UI/Case**：Web `home-page.tsx:143-162`とNative `native-screens.tsx:108-115`は先頭4件をおすすめ、残りを新着として表示し、セール対象のみカードに出す。Webのセール一覧リンクは`/products?onSale=true`、Nativeカードは`/products/{productId}`へ進む。default guest/gold、empty-catalog、expired-sale、0/4/8件、同時刻の順序、終了直前/終了ちょうど、ランク非公開を代表Caseに採用。既存Repository contract `storefront-catalog.test.ts:64-101`の固定8件・閲覧差を確認した。**実Webクリック/Android/視覚正本のPASSではない**。
- **新規の未決候補**：ホームのカテゴリー案内`SCREEN-STOREFRONT-HOME-A01-02`は、Webが`visibleProductCount>0`のみ最大6件（`home-page.tsx:125-140`）、Nativeは全activeカテゴリーを件数0でも表示（`native-screens.tsx:100-111`）。Repositoryもactiveカテゴリーの0件を返す（`storefront-repositories.ts:415-434`、Native SQLite `214-249`）。`docs/04_data/repository_interfaces.md`の0件除外契約との整合は未決。重大度Low〜Medium候補（空カテゴリーへの誤誘導/教材の期待差）。まずdefault/empty-catalogで実画面・正式仕様の解釈を確認し、必要なら承認のうえIssue化。**製品コードは変更せず、A01-02はreview_requiredを維持**。
- **判定**：基本操作**59/188（31.38%、残り129）**、状態条件**18/20（残り2）**、暫定分母。台帳と学習用契約テスト・Planのみ変更。実Template/2-core Codespaces/OpenCodeモデル校正・視覚/回帰の全受入は未完了。

## 2026-10-31 商品一覧公開条件と商品詳細画像の個別静的監査（SUT変更なし）

- **商品一覧 `SCREEN-STOREFRONT-PRODUCT-LIST-A01-01`**：正式`storefront.md:9-17/63-74`（BR-STOREFRONT-001/AC-STOREFRONT-002）、`CatalogUseCases.search:86-93`のviewer/clock、`permissions.ts:11-31`のpublished/rank、Web Dexie `storefront-repositories.ts:101-127/249-334`とNative SQLite `native-customer-repositories.ts:184-210/260-290`のactive SKU候補/合計/20件ページ、Web `catalog-list-page.tsx:111-160/430-539`・Native `native-screens.tsx:119-289`を照合。default SeedのP-0001/Tシャツ、P-0002/マグ、P-0006/公開在庫0をguestの正例、P-0003/gold・P-0004/platinum・P-0007/非公開・P-0008/draft・P-0009/discontinuedを除外反例に設定。guest/regular/gold/platinum、empty-catalog、many-products（1000件/50ページ）を代表Caseにした。**一覧0件の戻るCTA欠落は別状態`S-empty`の仕様差として未解決**であり、当該画面の完全受入PASSではない。
- **商品画像 `SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-01`**：`CatalogUseCases.getProductDetail:108-126`→Dexie `getDetail:185-246`（productId別画像・sortOrder・altText）/Native SQLite `getProductDetail:337-405`（閲覧条件・画像/assetSnapshot）→Web `ProductDetailView:62-143`（primary/先頭・サムネイル・拡大Dialog）/Native `NativeProductDetailScreen:586-650`（primaryImageのみ）を照合。`default-dataset.ts:335-357`のP-0001主画像`asset-shirt-front`と背面`asset-shirt-back`、P-0002の単一画像、公開在庫0のP-0006、rank制限と非公開商品を正例/反例に設定。NativeにWebギャラリー操作を要求せず、画像IDの一致・altText・未知ID・asset欠損fallbackを区別する。**画像切替の実クリック、Android実機、視覚正本一致は未検証**。
- **判定**：2親操作を`analyzed`へ変更。基本操作**61/188（32.45%、残り127）**、非default状態**18/20（残り2）**。188件は暫定分母で最終監査未完了。学習用contractに証拠と未決2状態のAssertionを追加。製品UI/Use Case/Repository、正式仕様、既存Seed/Reset、製品テスト/workflowは一切変更していない。
- **CI根拠**：変更前HEAD `16914aeb`の[Web CI 41174803292](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41174803292)はStyle QualityのMarkdown lintで失敗（`docs/spec/features/checkout-and-payment.md:279` MD032、280 MD022）。学習用Format check、Vitest contracts、Training runtime、主要Chromium E2Eは成功。正式仕様は変更禁止につき書式のみでも無断修正しない。[Mobile CI 41174803346](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41174803346)は確認時Android Runtime/Maestro実行中。新HEADのCI成功は未確認。

## 2026-10-31 商品一覧ファセット・ソートのWeb/Native静的監査（SUT変更なし）

- **ファセット `SCREEN-STOREFRONT-PRODUCT-LIST-A01-03`**：正式`storefront.md:9-22/63-74`のBR-STOREFRONT-001/002、`CatalogUseCases.search:86-93`、Dexie `matchesSearch:56-95/createFacets:330-380`、Native SQLite `matchesSearch:144-182/createFacets:723-779`、Web `CatalogListContent:122-235/330-485`、Native `NativeCatalogScreen:119-289/NativeCatalogFilterControls:1056+`を照合。同一categoryIds/brandIdsは各OR、異なる群と価格・在庫・sale・評価はAND。各facet件数は自群条件のみ除外して他条件を維持。既存default SeedのP-0001(apparel/basics)、P-0002(home/basics)、P-0005(home/life)、P-0006(sports/active、在庫0)、P-0011(sports/active、active SKU価格3500〜4700)を組合せ、gold P-0003追加とP-0007/8/9非公開除外を対照。既存`storefront-catalog.test.ts:64-156`の自群除外・価格範囲テストを根拠に採用。0件の戻るCTAは別状態`S-empty`の未決として切り離す。
- **ソート `SCREEN-STOREFRONT-PRODUCT-LIST-A01-04`**：Dexie `search:101-127`とNative `sortCandidates:184-210/search:259-276`を比較。newestはpublishedAt降順、price_asc/descはactive SKUの最低viewer価格、rating_descは平均評価→published件数の降順、同順位はproductCode昇順（Nativeのみ追加ID tie-break）。Webの`sort` selectとNativeの`native-sort-*` chipはいずれもpage1へ戻す。既存default Seedで新着P-0011→P-0010、価格900のP-0005/1200のP-0006/1500のP-0002とP-0010を対照し、many-productsの20件×50ページとgold-memberのrank/価格差を代表Caseに設定。公開集合とtotalをソートで変えない。Web/Native実操作・視覚正本のPASSは未主張。
- **結果**：2親操作を`analyzed`へ更新し、基本分析**63/188（33.51%、残り125）**、非default状態**18/20（残り2）**。分母188は暫定。学習用contractに個別根拠Assertionを追加し、製品UI/Use Case/Repository、正式仕様、既存Seed/Reset、既存製品テスト/workflowは変更しない。
- **直前HEADのCI**：`5081fb1e`の[Web CI 41176978894](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41176978894)はStyle Qualityの正式仕様`docs/spec/features/checkout-and-payment.md:279-280`のMD032/MD022のみで失敗。Vitest contracts、Training runtime、Format、主要E2Eは成功。[Mobile CI 41176979128](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41176979128)はNative Static/Android Runtime/Maestro/iOS CIを含め成功。新HEADの契約/CIは未確認、正式仕様の書式変更は明示承認待ち。

## 2026-10-31 商品詳細の価格・レビューサマリーを静的基本分析（SUT変更なし）

- **対象**：`SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-02`（価格/セール）と`A01-03`（レビューサマリー）。正式`storefront.md:9-22/100-116/218-222`（BR-STOREFRONT-001/003、AC-STOREFRONT-001/003）、`CatalogUseCases.getProductDetail:108-126`からWeb Dexie `storefront-repositories.ts:185-246`・Native SQLite `native-customer-repositories.ts:340-414`へのviewer/clock注入、Web `product-detail-page.tsx:101-105/163-184/327-348`とNative `native-screens.tsx:586-668`の表示責務を照合した。
- **価格の具体的オラクル**：`pricing.ts:6-49`はsale開始時刻を含み終了時刻を含まない。既存`default-dataset.ts:67-125/294-326`のP-0003はgold以上のみ閲覧可能、通常8000円・セール6400円（2026-06-30T03:00Z〜2026-07-02T03:00Z）。BASE_CLOCK=2026-07-01T03:00Zでgoldは5%引き**6080円**、platinumは10%引き**5760円**。既存`expired-sale`は終了ちょうどに時計を進め、goldなら通常8000円から**7600円**でsale表示なし。guestのP-0003は拒否、P-0001通常2000円を非セール対照。Webは通常/Sale/会員価格、Nativeは通常/Sale/販売価格の表示を区別。SKU選択後の価格追随と実ブラウザ/Android/視覚/購入確定は未検証。
- **レビューの具体的オラクル**：`default-dataset.ts:354-380/505-535/629-660`のP-0001はpublished2件・合計9・平均4.5（4★1/5★1）、P-0002はpublished3件・合計11・平均11/3（UIは3.7、2★1/4★1/5★1）。P-0002のhidden1件・deleted1件は公開件数と平均から除外。0件は平均0・全分布0。Webは5段階分布と割合、Nativeは平均と件数のみを表示し、Webの分布UIをNative必須とはしない。`reviews.ts:1-45`のpublished差分と集計整合性も参照。公開レビューの変更/非公開化の実操作は別Use Caseであり本2操作の静的分析完了と混同しない。
- **判定**：両操作の期待結果/リスク/採用Case/証拠を台帳に保存し`analyzed`へ変更。**基本操作65/188（34.57%、残り123）、状態18/20（残り2）**。分母は暫定。実ブラウザ/Android/視覚・Template/Codespaces/OpenCodeのマージ前受入PASSではない。既存製品実装・正式仕様・Seed/Reset・製品テスト/workflowは一切変更していない。
- **CI**：HEAD `571276f5`の[Web CI 41179294703](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41179294703)はfailure。Style Qualityの正式仕様`docs/spec/features/checkout-and-payment.md:279-280` MD032/MD022のみ失敗、Vitest contracts/Training runtime/Code Quality/Chromium E2Eは成功。変更禁止の正式仕様は修正しない。新HEADのCIは別途確認する。Mobile CI 41179294693は確認時進行中。

## 2026-10-31 商品詳細の在庫・購入上限を静的監査（製品変更なし）

- **対象**：`SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-05`。正式`storefront.md:9-25/100-115`（BR-STOREFRONT-003/AC-STOREFRONT-003）と`CatalogUseCases.getProductDetail:108-126`、Web Dexie `getDetail:185-233`、Native SQLite `getProductDetail:340-405`、Web `ProductDetailView:66-100/191-265`、Native `native-screens.tsx:590-744`を読み取り照合。
- **Seedの実値と期待**：default P-0001 TシャツのS/M/Lは20/10/0点、全SKU購入上限5。low-stockはMだけ3、out-of-stockはMだけ0（初期Web選択Sは20のまま）。P-0005は単一SKU3、P-0006は単一SKU0。Webは0で在庫切れ・数量/追加disabled、1〜5で「残りN点」、6以上で「在庫 N点」、数量選択1〜min(stock,purchaseLimit)。Nativeは複数SKU初期未選択、単一SKUのみ初期選択、選択後は在庫と最大購入数を表示するがカート追加は1点/回。Nativeでは在庫0 SKUを選択できても追加はdisabledであり、Webの選択不可と区別する。
- **未決の製品UI差（新規候補）**：正式`storefront.md:23`の「12件以下はボタン、13件以上はセレクトボックス」に対し、Web `product-detail-page.tsx:191-235`は12/13で分岐、Native `native-screens.tsx:656-697`は全SKUをchip表示する。P-0010（12件）とP-0011（13件）の既存Seedで実画面・仕様適用範囲を確認するまで、`A01-04`（バリエーション表示）と`A02-01`（選択）は`review_required`のまま。重大度Low〜Medium候補、13 SKU時の操作性/教材のWeb・Native期待差に影響。製品修正は教材必須と未立証、Issue化・製品改修は承認待ち。
- **判定とCI**：A01-05のみ`analyzed`、**基本分析66/188（35.11%、残り122）、状態18/20（残り2）**。188は暫定分母。実ブラウザ/Android/視覚/カート不変性の受入PASSは未実施。HEAD `d2e4550778ab`の[Web CI 41182598143](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41182598143)はVitest contracts/Training runtime/主要E2E成功、正式仕様`checkout-and-payment.md:279-280`のMD032/MD022のみでStyle Quality失敗。[Mobile CI 41182598158](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41182598158)はAndroid Runtime/MaestroとiOS含め成功。新HEADのCIは別検証。製品SUT・正式仕様・Seed/Reset・製品用テスト/workflowは一切変更していない。

## 2026-10-31 商品一覧の購入導線を詳細遷移と区別して静的基本分析（SUT変更なし）

- **対象と仕様**：`SCREEN-STOREFRONT-PRODUCT-LIST-A02-02`。正式`storefront.md:9-32/59-74`のBR-STOREFRONT-001/003・AC-STOREFRONT-001/003と「商品カードから詳細や購入への導線」を確認。商品一覧から直接Cartへ追加する操作を仕様上の既成事実とせず、現行UIで実際に存在する詳細遷移を購入の入口として分析した。
- **実装の経路**：`CatalogUseCases.search:86-93`→Web Dexie `storefront-repositories.ts:101-127/249-314` またはNative SQLite `native-customer-repositories.ts:259-273/784-795`→Web `catalog-list-page.tsx:527-532`の`ProductCard:10-40`画像/商品名Link、Native `native-screens.tsx:278-290/1023-1053`のカード全体Link。いずれも`/products/{productId}`へ進み、詳細側`CatalogUseCases.getProductDetail:108-126`で閲覧条件を再判定する。Webの「詳細を見る」は`aria-hidden`装飾で直接購入ボタンではない。NativeカードもCart操作を実行しない。
- **Seedと反例**：既存default `default-dataset.ts:67-244`のP-0001（公開・在庫20/10/0）、P-0006（公開・在庫0）では詳細遷移を許可し、在庫0の購入可否は詳細画面の別Caseで検証する。guestに対するgold限定P-0003、platinum限定P-0004、非公開P-0007、draft P-0008、販売終了P-0009は一覧カードを出さない。既存`gold-member`/`platinum-member`でrank差、`empty-catalog`でカード0、`many-products`でページ1/2のID遷移を対照。新Seed不要。既存`storefront-catalog.test.ts:64-103`の閲覧集合を静的根拠に使用。
- **判定と残る検証**：A02-02を`analyzed`へ変更し、基本分析**67/188（35.64%、残り121）**、非default状態**18/20（残り2）**。188は暫定分母。A02-01の詳細遷移と実行証拠を共有しても分母を二重追加せず、SKU選択・Cart追加・在庫0拒否は別操作。実Web/Android/視覚/Cart不変性の受入は未実施。製品実装・正式仕様・Seed/Reset・既存製品テスト/workflowを変更していない。
- **現HEAD直前のCI**：`9c99ebafd9f3`の[Web CI 41185258860](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41185258860)は正式製品仕様`checkout-and-payment.md:279-280`のMarkdown MD032/MD022のみでStyle Quality失敗、Vitest contracts/Training runtime/Code Quality/主要E2Eは成功。[Mobile CI 41185258865](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41185258865)はAndroid Runtime/Maestro/iOSを含め成功。新HEADのCIは別途確認する。正式仕様書式修正は承認待ち。

## 2026-10-31 Home会員ランク案内のWeb/Native差（未決・製品変更なし）

- **対象/根拠**：`SCREEN-STOREFRONT-HOME-A01-05`。正式`docs/spec/features/storefront.md:23-32`はホームで会員ランク案内を表示し、`default`のWeb/Android画面を必須としている。Web `src/presentation/pages/home-page.tsx:165-183`には一般/ゴールド/プラチナの特典パネルがあり、割引率は`membershipDiscountRate`、送料無料閾値は`FREE_SHIPPING_THRESHOLD`を参照。一方、確認したNative `src/presentation/native/native-screens.tsx:31-115`のホーム描画には会員特典パネルやランク別案内が見当たらず、商品検索/カテゴリー/新着/セールのみ表示する。Nativeの別画面・ナビゲーションから案内可能か、正式契約がNative Homeに同一表示を要求するかは未検証。
- **再現/影響/重大度**：既存`default` guestと`gold-member`/ `platinum-member`でWeb/Android Homeの案内を対照し、表示の有無と商品価格のランク適用を別々に確認する。重大度Low〜Medium候補（案内不足・教材のプラットフォーム別期待結果に影響、価格計算自体の不具合は未立証）。会員特典表示の差は教材の不整合発見演習に利用可能だが、製品修正が教材受入に必須とは未立証。
- **判定**：実Android表示・視覚正本・仕様適用範囲の判断が残るため`A01-05`は`review_required`を維持。既存SUTを修正せず、製品Issue化/別PRは明示承認待ち。基本分析の分子/分母は変更しない。

## 2026-11-01 Q-30：処理中の再試行禁止の静的監査（製品変更なし）

- **対象と正本**：`SCREEN-CHECKOUT-PROCESSING-A02-02`、`BR-CHECKOUT-003`、`AC-CHECKOUT-003`。正式仕様`docs/spec/features/checkout-and-payment.md:17-23,154-167,250-254`は、処理中の再試行・二重確定・キャンセルを禁止し、注文・決済・在庫・履歴の一回性を要求する。台帳は`review_required`を維持し、静的分析を実行PASSとみなさない。
- **Web UI**：`src/presentation/pages/checkout-order-pages.tsx:531-567`の処理中画面は`resumePayment(orderId)`を呼び、失敗時の「再開する」は同じ読み込みを再実行する。処理中画面には`retryPayment`やキャンセル・二重確定の操作はない。失敗画面の再試行は別経路（同ファイル`:603-615,633-655`）であり、処理中の再試行と混同しない。
- **Native UI**：`src/presentation/native/native-purchase-screens.tsx:1061-1099`は処理中の「再開する」を`resumePayment`へ接続し、`busy`中はボタンを無効化する。失敗画面の`retryPayment`は`:1162-1188`で別に呼ぶ。Webの再開エラー導線とNativeの手動再開・busy制御は同じUI動作ではない。
- **Use Case/所有権**：`src/application/use-cases/checkout-order-use-cases.ts:319-338`はCustomer本人の注文だけ`resumePayment`を許し、最新Paymentが`processing`なら既存`gatewayIdempotencyKey`で`charge`する。`:340-383`の`retryPayment`は、最新Paymentが`processing`の場合、`orderActionVersion`検査より先に既存`OrderProcessingDto`を返す。**新しいPayment/Orderを作らないが、明示的な拒否エラーも返さない**。これは「禁止」を拒否応答と解釈すべきか、冪等な既存試行返却でよいかという仕様判断を要する。失敗状態からの新規試行は`payment_failed`とOrder version一致を要求し、`attemptNumber`を増やす。Checkout Session versionは`beginOrder`時に検証される（`:193-217`）が、処理中再開の入力ではない。
- **重複の境界**：`finalizePayment`/`finalizeFailure`はトランザクション内でPaymentが既に`processing`以外なら結果を返す（同ファイル`:418-433,514-546`）。`MockPaymentGateway`は同じキーの**完了済み結果**をMapで返すが、処理中のPromiseを共有する仕組みは見当たらない（`src/infrastructure/payment/mock-payment-gateway.ts:4-39`）。したがって並列`resumePayment`がGatewayを1回しか呼ばないことは静的には立証できない。一方、これだけで二重決済や在庫二重減算が再現したとは断定できない。モック決済は外部通信を行わない。
- **Seed/既存テスト**：`payment-processing`は既存失敗注文を`pending_payment`、最新Paymentを`processing`に変える（`src/seeds/scenarios.ts:286-302`）。`src/seeds/metadata.ts:229-238`では初期Sessionはguestで、`regular@example.com`のログインが必要。`tests/integration/checkout-order-use-cases.test.ts:339-360,411-424,426-464`は順次の再開、二重beginOrder、失敗後の新試行を確認するが、処理中の直接`retryPayment`、並列`resumePayment`、実Web/Android二重操作のPASSは確認できない。
- **Condition/Case採否**：C1=Web/Native処理中に新規決済・キャンセル操作がないこと（UI静的証拠あり、実Run未了）。C2=処理中に直接`retryPayment`した場合の既存試行返却・DB/在庫/履歴不変（実装静的証拠あり、期待応答の正式解釈と負例テスト未決）。C3=同一orderIdへ並列`resumePayment`してGateway呼出し、Payment/Order/在庫/履歴を計測（未実行、必須の負例候補）。C4=他人注文・無効Sessionでの再開拒否（本人照合は静的確認、実行証拠未了）。C5=失敗後の許可された新試行と古いOrder version拒否（Q-31に引継ぎ）。決済一回性の高リスクのためC2/C3を省略しない。
- **判定・引継ぎ**：仕様上の「再試行禁止」がエラー拒否か同一試行への冪等収束かを明確化し、制御された並列テストとWeb/Native実Runを別々に記録するまで`review_required`。製品SUT・正式仕様・既存Seed/Reset・既存製品テストは変更しない。次の独立作業は**Q-31**（失敗後の許可再試行・stale Cart/Session・未確定結果）。本節はコード読取りの証拠であり、CIの一般成功をQ-30個別のPASSへ転用しない。

## 2026-11-01 Q-11：既存メールでの登録拒否と非破壊性の静的監査（製品変更なし）

- **対象・正式根拠**：`SCREEN-AUTH-SIGNUP-A02-02`（`review_required`）。正式`docs/spec/features/authentication.md:45-52`はSignupで重複状況を明示することを要求し、同仕様の`BR-AUTH-001/AC-AUTH-001`は主にログイン時のSession生成・拒否を定義する。Signup失敗時のDB/Session/guest Cart不変は、実装・リスク・テスト条件と分けて確認する。登録済みメールの拒否を「登録成功後の遷移」（A02-03）と混同しない。
- **Role/State/Data・固定Seed**：対象は未ログインguest、既存active customerの`regular@example.com`、同様にoperator/admin・suspended/withdrawnの既存メール。default Seedはusersを持つが初期sessionsは空（`src/seeds/default-dataset.ts:729-776`）。defaultにはguestのactive Cartがないため、guest Cart非破壊の検証には既存`guest-cart-merge-overflow`または学習専用fixtureを用いる。既存アカウントのrole/statusや所有Cartは拒否で変更されないことが期待結果であり、実DB snapshotは未取得。
- **正規化・Use Case**：`src/domain/services/normalization.ts:9-11`はメールをtrim→NFKC→小文字化する。`src/application/use-cases/auth-use-cases.ts:116-181`の`register`は入力検証後、正規化メールの`users.findByEmail`で既存を検出すると`EMAIL_ALREADY_EXISTS`/`auth.email.exists`を返す。**この事前拒否はpassword hash、guest ID取得、Session pointer設定、transactionより前**。transaction内でも同じメールを再検査してからuser作成→guest Cart merge→Session作成を行う。したがって通常の事前拒否経路には新規DB/Session/Cart書込みがないが、並行登録・既存Sessionがある場合までの完全な不変性は未実証。
- **Repository・トランザクション**：Dexieの`src/infrastructure/database/dexie/basic-repositories.ts:48-54`はemail完全一致検索、`database.ts:60-63`のusers emailにunique index、`transaction-runner.ts:135-139`は`rw` transaction。Native SQLiteは`native-customer-application-repositories.ts:459-484`の`COLLATE NOCASE`検索と`schema.ts:18-29`のemail UNIQUE、`database.ts:43-55`のexclusive transaction。共通Use Caseで正規化してから保存する設計。unique衝突時の実エラー変換とrollback、2登録同時実行の順序は実Runで確認する。
- **UI差**：Web `src/presentation/pages/auth-pages.tsx:80-94,258-270`は`EMAIL_ALREADY_EXISTS`を「このメールアドレスはすでに登録されています。」に変換してフォームに残る。Native `src/presentation/native/native-purchase-screens.tsx:241-293,1543-1545`は`asPurchaseError(caught).message`を表示し、`src/application/errors.ts:3-17`は`Error.message=messageKey`としているため、重複時`auth.email.exists`が画面に出る静的経路を確認した。実Androidでの表示確認・正式な文言適合判定は未実施。Q-10で記録したNative内部キー表示の共通原因候補と統合して扱い、製品修正は行わない。
- **既存テストの到達範囲**：`tests/integration/auth-account.test.ts:223-249`は新規メールの正規化登録成功を検証するが、既存メールの拒否・正規化重複・拒否後Cart/Session不変を直接検証していない。`tests/component/auth-account-pages.test.tsx:241-317`はSignupの同意・入力制限をmockで検証するが、重複エラー表示の専用Caseではない。Native Signupの重複エラー実画面・SQLite並行登録の個別PASSは未確認。現HEADの一般CI成功をこの操作の実証に転用しない。
- **Condition/Case採否**：C1=default既存メールを完全一致・大文字/空白/NFKC等の正規化同値で登録→`EMAIL_ALREADY_EXISTS`、users/sessions/CartとSession pointer不変（必須）。C2=既存customer/operator/admin/suspended/withdrawnのメール→新規作成なし（必須）。C3=guest Cartありで既存メールを登録→Cart items/status/version、guest identity、Session pointer不変（必須）。C4=Webの日本語拒否とNativeの利用者向け文言・遷移なしを同条件で実画面確認（必須）。C5=2登録の事前照会とtransaction内照会が競合したときのunique/rollback、Session pointer・Cart不変、利用者向け拒否理由（高リスク負例、制御fixtureと実並行を分離）。C6=新規メールでpointer保存/Session作成失敗時のrollbackを別Caseとして検査し、通常の重複事前拒否と混同しない。実行時は初期snapshotと試行後snapshotの双方を保存する。
- **重要な未確定点**：事前検査を通過した後に他の登録が先行すると、transaction内の重複拒否ではSession pointerを設定後にclearする。DB unique衝突の非ApplicationErrorは`LOGIN_TRANSACTION_FAILED`へ変換され得る。既存の認証済みSessionを持つ呼出し元ではpointer不変とは限らず、競合が実際に発生したかは未確認。これらを製品不具合確定とせず、リスク候補として証拠付きで再検証する。
- **判定・引継ぎ**：通常の事前重複拒否とWeb/Native表示差の静的経路は確認。独立した重複拒否の統合テスト、guest Cart/Session/DB snapshot、並行競合、実Web/Androidの証拠不足により`review_required`維持。基本分析の分子/分母は変更しない。再開条件は学習専用fixtureでC1〜C6の証拠が取得できること、実Androidと正式UI期待値が確認できること。次の独立作業は**Q-12**（Signup入力の必須・形式・長さ・同意のWeb/Native差）。製品SUT・正式仕様・既存Seed/Reset・既存製品テストは変更しない。

## 2026-11-01 Q-31：決済失敗後の再試行・古い状態・結果未確定の静的監査（製品変更なし）

- **対象・正式要求**：`SCREEN-CHECKOUT-FAILED-A01-02`（`review_required`）。`docs/spec/features/checkout-and-payment.md`の`BR-CHECKOUT-003`/`AC-CHECKOUT-003`は明確な拒否後の在庫非変更、処理中の再試行・キャンセル禁止、成功/拒否/処理中/在庫不足時の一回性を要求する。失敗画面の機能には「再試行、カート画面や注文内容確認への導線」と記載される。WebとNativeで選択可能な再試行方法の差を正式に許容するかは未決。
- **UI→Use Case**：Web `src/presentation/pages/checkout-order-pages.tsx:590-665`は本人注文を`getMyOrder`で取得し、`resolveCheckoutResultKind`で失敗を判定、4種の`PAYMENT_METHODS`から選んだ方法と表示中の`orderActionVersion`を`retryPayment`へ渡す。Webの`retry()`は`try/finally`のみでreject時に画面上のエラーを提示する`catch`がない。Native `src/presentation/native/native-purchase-screens.tsx:1125-1189`は失敗後に`TEST-SUCCESS`固定で再試行し、`busy`中はボタンを無効化、失敗時には`retryMessage`を表示する。WebとNativeの差は静的に確認したが、実端末での操作可否・表示妥当性は未実証。
- **再試行の状態境界**：`src/application/use-cases/checkout-order-use-cases.ts:340-383`は本人`order.userId`を確認し、最新Paymentが`processing`なら**Order version照合より先に**既存`processingDto`を返す。そうでなければ`order.status=payment_failed`かつ`order.version=request.orderActionVersion`を要求し、不一致を`conflictError`で拒否する。成立時は同一Orderを`pending_payment`へ戻し、attempt番号を増やした新Paymentと`PAYMENT_RETRY_STARTED`履歴をtransaction内で作成する。失敗後の再試行ではCart version/Checkout Sessionを再検証しない。これは既存Orderに対する再決済経路であり、古いCart/Sessionを使った新規`beginOrder`と区別する。Cart/Session変更時の再試行許容範囲が正式要求に合うかは別途判断が必要。
- **決済一回性・不確定結果**：`resumePayment:319-338`は本人注文・最新Paymentを確認し、処理中なら`gatewayIdempotencyKey`でGatewayを呼び出す。`MockPaymentGateway.charge`は完了結果をMapへ保存するが、遅延を待った**後**にキャッシュするため、同一キーの並行呼出しを一つの進行中Promiseへ束ねる保証はコード上確認できない。`finalizePayment:418-546`はtransactionとPayment status/versionを利用し、成功時は在庫減算・Order/Payment/履歴・Shipment、拒否時はOrder/Payment/履歴を更新する。並行Gateway呼出し・transaction競合・結果取得後の保存失敗・再起動時の一回性は未実行であり、二重決済や二重在庫減算が実際に起きたとは断定しない。
- **Repository・Seed・既存テスト**：Dexieの`order-review-repositories.ts:43-48,256-270`はOrder/Paymentの期待versionを確認して更新し、Paymentはattempt番号順に最新を選ぶ。固定`payment-declined`は既存失敗注文を持ち、`src/seeds/scenarios.ts:286-303`の`payment-processing`は失敗注文をprocessingに変更する。どちらも初期guestのため、本人注文のUI検証にはregular顧客ログインが必要。`tests/integration/checkout-order-use-cases.test.ts:363-389,426-464`は3種の明確な拒否で在庫不変・Shipment未作成、失敗後の新attemptと`failed→succeeded`を順次検証する。`maestro/native-payment-retry.yaml`はNativeの拒否→成功再試行シナリオを定義するが、今回の実Android実行結果ではない。stale Order version・他人注文・同時再試行・未確定結果・Cart/Session変化後の再試行を直接立証するCaseは確認できない。
- **Condition/Case採否**：C1=失敗注文/本人で4種のWeb選択とNative固定成功の仕様差を比較（静的証拠あり、実Run/正式判断未了）。C2=拒否後の正しいversionで新attemptを1件作成し、旧失敗履歴と在庫を保持（既存順次integration一部証拠）。C3=古いOrder version・他人注文・無効Sessionの拒否とOrder/Payment/履歴不変（負例追加検証）。C4=Cart version/Checkout Session変更後の既存Order再試行と新規注文を区別し、仕様上の許容境界を決定（未決）。C5=処理中に古いversionで再試行要求したとき既存attempt返却となることを確認し、拒否期待と冪等返却期待を区別（静的経路のみ）。C6=同一Orderの並列retry/resume、Gateway呼出し数・Payment/Order/在庫/Shipment/履歴の一回性（制御実行未了）。C7=Gateway応答後のtransaction失敗・リロード/再起動からの再開、Web/Nativeのエラー表示・操作回復（未実証）。金額・本人認可・二重確定リスクのためC3/C6/C7は省略しない。
- **判定・引継ぎ**：静的処理経路の監査は実施したが、正式なWeb/Native差の判断、実Web/Android操作、stale/並列/未確定結果の負例と不変性が揃わないため`review_required`を維持する。再開条件は仕様判断、制御された実行環境・証拠、または関連実装/契約の変更。製品SUT・正式仕様・既存Seed/Reset・製品テストは変更しない。次の独立作業は**Q-32**（Cart再検証と旧version拒否）。一般CIの成功を本Caseの実Run PASSに転用しない。

## 2026-11-01 Q-12：サインアップ入力境界とWeb/Native差の静的監査（製品変更なし）

- **対象・契約**：`SCREEN-AUTH-SIGNUP-A02-01`（`review_required`）。正式`docs/spec/features/authentication.md`のSignup機能は表示名・メール・パスワードの入力、入力検証結果と修正方法の表示を要求する。主要UI状態`validation-error`は視覚要件`not-applicable`で、Webのログイン検証表示を代表としている。正式`BR-AUTH-001/AC-AUTH-001`は主にログイン/Sessionの条件であり、Signupの確認パスワードや注意事項同意を全Platformで必須と明文化した根拠にはならない。ここを実装差と仕様不適合確定で混同しない。
- **Role/State/Data・固定条件**：guestによる新規customer作成を対象とする。対象データは正規化email、displayName、password入力、User/Session/guest Cartとsession pointer。default Seedは既存userを含むがsessionsは空であり、新規登録の正常/異常境界は衝突しない新規メールと既存メールを分ける。重複メール拒否はQ-11、成功後遷移はA02-03の既存分析を再利用する。
- **Web入力経路**：`src/presentation/pages/auth-pages.tsx`の`signupSchema`はZod `email()`、email最大254、password最小8/最大72、displayNameのtrim後必須/最大100、password確認一致、`noticeAccepted=true`を要求する。`react-hook-form`と`FormErrorSummary`でエラー箇所へのリンク/フォーカスを提示し、バリデーション失敗時は`auth.register`を呼ばない。各inputに`maxLength`を設定し、`noValidate`でブラウザ標準の検証ではなくフォームschemaを使用。登録コマンドへはemail/password/displayNameのみ渡し、確認・同意はUI側のgateでありUse Caseの入力契約には含まれない。
- **Native入力経路**：`src/presentation/native/native-purchase-screens.tsx`の`NativeSignupScreen`はemail/password/displayNameの3項目のみで、password初期値は既知の`testpass1`。各欄は共通上限の`maxLength`を持つが、確認欄・注意事項同意・明示的なクライアント側形式検証は存在しない。submitは`services.auth.register({email,password,displayName})`へ直行し、例外は`asPurchaseError(caught).message`で表示する。Q-10/11と同じ内部messageKey露出経路のため、利用者向け修正方法の実Android表示は未実証。初期passwordが製品の正式要件に適合するかも未判定。
- **共通Use Case・Repository到達条件**：`src/application/use-cases/auth-use-cases.ts`の`register`は`normalizeEmail`（trim→NFKC→小文字化）後、`validateRegistration`でemail最大254/簡易`^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$`、password 8〜72、trim後displayName 1〜100を検証し、`VALIDATION`とfieldErrorsを返す。検証は重複照会・password hash・guest identity・Session pointer設定・transactionより前にあるため、この直接拒否経路ではUser/Session/Cart作成に進まない。WebのZod `email()`とUse Caseの簡易regexは同一の受理集合と未実証であり、空白/NFKC/境界形式の差をCase化する。実DB snapshot/Android実行による非書込みは未取得。
- **既存テストの範囲**：`tests/component/auth-account-pages.test.tsx`はWebの注意事項未同意時に`auth.register`を呼ばないこと、displayName上限超過時のエラー、各`maxLength`を確認する。これらはmock付きWeb componentの結果であり、Nativeの入力/エラー表示、全境界、DB/Session/Cart不変、実Web/AndroidのPASSではない。
- **Risk/Condition/Case採否**：C1=Web必須空欄、email形式不正、displayName空白のみ→項目別修正案内とregister未呼出し（必須）。C2=password 7/8/72/73、displayName 0/1/100/101、email 254/255と正規化後長さをWeb/Native/Use Caseで照合（必須）。C3=確認パスワード不一致・注意事項未同意→Webは送信阻止、Nativeに同等UIがない事実と正式期待値を分離（必須・仕様判断待ち）。C4=trim/NFKC/大文字/境界メール形式でWeb ZodとUse Caseの受理差を比較（高リスク・実行待ち）。C5=Native空欄・不正メール・短いpassword・空白displayNameのエラー表示とUser/Session/Cart不変（必須・実Android待ち）。C6=Native初期passwordの挙動と利用者への説明・意図しない既知password登録防止の正式期待値（要仕様判断）。C7=正常な新規登録後のSession/guest Cart処理は既存A02-03を参照し、入力拒否と混同しない。
- **判定・再開条件**：静的に確認できるのはWeb/Nativeの入力差と共通Use Caseの検証境界まで。正式なPlatform別確認/同意・初期password方針、C1〜C6の独立した実行証拠、Native利用者向け修正表示、失敗時のDB/Session/Cart snapshotが不足するため`review_required`維持。基本分析の79/188操作・非default状態18/20は変更しない。製品SUT・正式仕様・既存Seed/Reset・製品テストは無変更。再開条件が変わるまではQ-12を再調査せず、次の独立作業は**Q-13**（M00〜M04教材/Skill/Phase 1評価）。
