# Scenario Shop 全サポート動作の分類と基本分析（再調査）

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

- **分析済み**：`SCREEN-STOREFRONT-CART-S-invalid-items`。正式`BR-CART-003/AC-CART-003`、`cart-with-invalid-items` Seedの4明細（価格変更・非公開・在庫0・inactive SKU）、`CartUseCases.getCart/removeItem/acceptPriceChanges`、Dexie `getCartDto`、Web `CartContent`と既存E2Eセットアップを照合。初期guestでは不正明細は見えず、**regular@example.comでログイン後に/cartへ遷移**する必要がある。非価格問題の削除→価格同意→Checkout解放の順序をCase化。既存テストのソース確認は実行PASS/視覚正本一致を意味しない。
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
