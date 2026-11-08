# PR #199 非干渉基本分析：公開レビュー一覧Use Case

## 結果

- 対象 `UC-CATALOG-LIST-REVIEWS` を静的基本分析`analyzed`へ変更。正式レビュー契約・Web ProductDetail→CatalogUseCases→Dexie ReviewRepositoryとNative customerGateway分岐、default/hidden-reviews Seedを照合。
- 基点PR #199 HEAD: `b671561a834998a58ef59c3047b7d47e76569c9c`、独立ブランチ: `work/pr199-parallel-supporting-analysis-20261103`。**独立台帳158/188操作 analyzed（残30）、非default状態17/20（残3）**。
- 画面・UseCase・Repository/Seedの追跡、Role・入力不正・ページ/Sort/Review状態、RiskとC1〜6/Case採否を更新。直接Web/Native実Runと製品適合・CIのPASSではない。

## Web/Nativeの実装差

- Web `src/presentation/pages/product-detail-page.tsx:72-89,309-365`：`listReviews({productId,query:{sort,page:1,pageSize:20}})` → Web `CatalogUseCases.listReviews:134-146` → Dexie `order-review-repositories.ts:330-350`。productId一致・status=`published`のみを抽出し、`newest`/`rating_desc`/`rating_asc`でsort、IDをtie-breakとしてPage DTO返却。
- Android `src/application/use-cases/catalog-use-cases.ts:142-144`：`customerGateway`ありで`items:[]/total:0`を常に返す。Native商品詳細 `native-screens.tsx:765-775`はreviewSummaryを表示するが公開レビューの個別一覧なし。
- 正式 `docs/spec/features/reviews.md:13-15,92-96`：公開レビューのみを表示/サマリー集計し、hidden/deletedは非表示。Native共通業務契約 `docs/spec/features/native-customer.md:9-29`は処理・意味をWeb版と共有する。Androidの公開Review本文一覧が必須かは仕様・画面/教材の受入条件として判断が必要。現行空結果をWeb/Android両方のPASSにしない。
- Seed: `default-dataset.ts:509-534,629-668`にはpublishedレビュー・hidden 1件・deleted 1件。 `scenarios.ts:33-38`の`hidden-reviews`はdefault Datasetをそのまま使用する。名称だけで独自の状態変換を行うと誤認しない。
- 入力境界：`page>=1`整数/必須`pageSize=20`はWeb・Native両方でVALIDATION、WebはPage2の空とtotal、NativeはPage1もゼロ。未公開商品IDの入力そのものと商品閲覧Roleは別境界で検証。

## 未分析30操作：ID別

| No | 操作ID | 操作 | 現在の不足・再開条件 |
| ---: | --- | --- | --- |
| 1 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:60-74を照合。仕様の『配送先を選択』には登録済み必須・任意住所入力可否の明示がなく、プラットフォーム間の振舞 |
| 2 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、CheckoutOrderUseCases.start:108-139/setAddress:163-168/ |
| 3 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens.tsx:684-791と住所欄反映、Dexie startOrResume:630-669・Native S |
| 4 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | 仕様・実装・Seed・境界Caseの具体照合が未完 |
| 5 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.startOrResume:630-669、SQLite NativeCheckoutRepository.start |
| 6 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Payment UI、regular-member/checkout-resume Seedを照合。実行時未許可コード |
| 7 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member/checkout-resume Seedを照合。Webの保存失敗未処理を修正しcomponent回帰テストを |
| 8 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735/878-939、CheckoutOrderUseCases.getActive:138-161とSessio |
| 9 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite checkoutSessionRepository、cart-version-invalidates-checkout |
| 10 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851-1948、Prici |
| 11 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirmation:1851以降、Web Che |
| 12 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851-1948、Prici |
| 13 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirmation:1851以降、Web Che |
| 14 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851-1948、Prici |
| 15 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851-1948、Prici |
| 16 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851-1948、Prici |
| 17 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-processing/payment-declined Seed（guest初期状態は要ログイン）を照合。既存c |
| 18 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyOrder:397-403の本人検証、re |
| 19 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyOrder:397-403の本人検証、re |
| 20 | `SCREEN-ADMIN-PRODUCTS-A01-01` | 商品一覧・公開状態 | 仕様・実装・Seed・境界Caseの具体照合が未完 |
| 21 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkeyword変更時のみpage=1へ戻し、status/rank/stock/価格/sort変更ではpageを維持 |
| 22 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | 仕様・実装・Seed・境界Caseの具体照合が未完 |
| 23 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一覧にはRankとsort選択UIがない。Use Case/RepositoryはmembershipRanks |
| 24 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator/admin間のみ・自己/last-admin/withdrawn拒否を確認。AdminUserDetailF |
| 25 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | 仕様・実装・Seed・境界Caseの具体照合が未完 |
| 26 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | 仕様・実装・Seed・境界Caseの具体照合が未完 |
| 27 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | 仕様・実装・Seed・境界Caseの具体照合が未完 |
| 28 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | 仕様・実装・Seed・境界Caseの具体照合が未完 |
| 29 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review-user-pages.tsx:618-830、default-dataset.ts:730-774、revie |
| 30 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefault guest Seedを静的照合。主要RiskとC1〜C6は既存台帳にある。Web非active staf |

### 画面別件数

| 画面 | 残 | ID |
| --- | ---: | --- |
| `SCREEN-CHECKOUT-ADDRESS` | 5 | `SCREEN-CHECKOUT-ADDRESS-A01-01` 注文配送先を選択、`SCREEN-CHECKOUT-ADDRESS-A01-02` 次の決済ステップに遷移、`SCREEN-CHECKOUT-ADDRESS-A02-01` セッション再開を通知、`SCREEN-CHECKOUT-ADDRESS-A02-02` 古いセッションを通知、`SCREEN-CHECKOUT-ADDRESS-A02-03` セッション置換を通知 |
| `SCREEN-CHECKOUT-PAYMENT` | 4 | `SCREEN-CHECKOUT-PAYMENT-A01-01` 決済方法を選択、`SCREEN-CHECKOUT-PAYMENT-A01-02` 確認画面へ遷移、`SCREEN-CHECKOUT-PAYMENT-A02-01` 不完全セッションを拒否、`SCREEN-CHECKOUT-PAYMENT-A02-02` 古いカートバージョンを拒否 |
| `SCREEN-CHECKOUT-CONFIRM` | 7 | `SCREEN-CHECKOUT-CONFIRM-A01-01` 最終注文内容を確認、`SCREEN-CHECKOUT-CONFIRM-A01-02` 配送先を確認、`SCREEN-CHECKOUT-CONFIRM-A01-03` 価格を確認、`SCREEN-CHECKOUT-CONFIRM-A01-04` 決済方法を確認、`SCREEN-CHECKOUT-CONFIRM-A02-01` 古いカートを拒否、`SCREEN-CHECKOUT-CONFIRM-A02-02` 価格不一致を拒否、`SCREEN-CHECKOUT-CONFIRM-A02-03` 修正導線を表示 |
| `SCREEN-CHECKOUT-COMPLETE` | 3 | `SCREEN-CHECKOUT-COMPLETE-A01-01` 決済完了を表示、`SCREEN-CHECKOUT-COMPLETE-A01-02` 注文番号を表示、`SCREEN-CHECKOUT-COMPLETE-A01-03` 注文履歴へ遷移 |
| `SCREEN-ADMIN-PRODUCTS` | 2 | `SCREEN-ADMIN-PRODUCTS-A01-01` 商品一覧・公開状態、`SCREEN-ADMIN-PRODUCTS-A01-02` フィルター |
| `SCREEN-ADMIN-INVENTORIES` | 1 | `SCREEN-ADMIN-INVENTORIES-A02-02` 競合更新を拒否 |
| `SCREEN-ADMIN-USERS` | 1 | `SCREEN-ADMIN-USERS-A01-02` ユーザーの絞り込み |
| `SCREEN-ADMIN-USER-DETAIL` | 6 | `SCREEN-ADMIN-USER-DETAIL-A01-02` ロール変更、`SCREEN-ADMIN-USER-DETAIL-A01-03` 会員ランク変更、`SCREEN-ADMIN-USER-DETAIL-A01-04` 状態変更、`SCREEN-ADMIN-USER-DETAIL-A02-01` 自己権限破壊を拒否、`SCREEN-ADMIN-USER-DETAIL-A02-02` 退会済の変更を拒否、`SCREEN-ADMIN-USER-DETAIL-A02-03` 最終管理者の変更を拒否 |
| `SCREEN-BOUNDARY-FORBIDDEN` | 1 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` アクセス権限不足を示す |

### 非default状態残3件

| 状態ID | 未受入 |
| --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし。catalog-pages.test.tsx:305-313も無CTAを明示的に期待。仕様と現実の不一致候補のためreview_requiredを維持。SUT |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:153-160、metadata.ts:306-316とBASE_CLOCK、scenarios.ts:107-111/367-395、ui-ux-improve |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repository・WebのCheckoutLoadError、関連回帰テストを照合。Seedの未完了Stepと確認画面上の版不一致再現条件を混同しない |

## 基本分析以外の残作業

1. 188操作・20非default状態の分母/網羅と分析済158操作の証拠品質（Role/State/Data・正本行・UI→UseCase→Repository、Seed実値・Condition/Case）を全件再監査する。
2. Playwright Web・Android SQLite/Maestroの実Runで、正常/異常/ページ境界/Role/DB前後・Visual/a11y、各画面の失敗時不変/権限を確認する。公開レビューはAndroidの必要性とWeb/NativeのReview DTO/画面差を#210へ判定依頼。
3. #210製品側：今回のWeb Test API Build未設定local fallback/Window API権限・Reset失敗、Android公開レビュー一覧差、前回のWeb Cart多重更新/Native Issue表示・複合価格同意、住所既定切替、Native Variation/Stock0/登録・検索・Home/Guide・Legal/NotFound/Forbidden等の仕様適合を判断。製品コード/正式仕様/既存製品テストは今回変更なし。
4. #211学習用契約・教材/演習/AI評価/Skill/配布の別担当作業との同一HEAD照合、M00〜M10/51目標の採点・再提出/異常Case、M02→M03固定Skill runtime、M04/M07/M10実モデル校正。
5. M05〜M07 Playwright実Run/Trace、M08本人Git実操作、M09/M10 Private repoのCI Run/Check/Artifact/SHA確認。配布元`course:sync`生成/全hash・22状態/M00〜M10実ロード/同期失敗復旧と本人ファイル保護・JS/CSS/Secret/個人情報/第三者ライセンス/NOTICE監査。
6. 最終HEAD Web/Mobile required CIと独立レビュー、PR #199本体へのID単位の重複排除・三者比較による統合。Mobile PR trigger復元はmerge準備時。本人Public Template公開/Private 2core Codespaces実受入はmerge後。明示のmerge/公開/課金/Issue作成なし。

## 検証・変更境界

- 旧`review_required`からの変更は`UC-CATALOG-LIST-REVIEWS`1件だけ、ほか207件のJSONオブジェクト不変。必須文字列/Requirement/3種`reviewed_against`、件数158/188・17/20をJSで静的検証。
- `node scripts/training/validate-supported-behaviors.mjs`、Vitest、Playwright、Android、CIはこの作業では未実行。GitHubへexpected HEAD付nonforceで保存する。
- 本体PR #199、共通Plan、定期実行4本、製品SUT/正式仕様/Seed/Reset、PR #210/#211への書き込みなし。取り込みは最新本体BlobとID単位で照合する。
