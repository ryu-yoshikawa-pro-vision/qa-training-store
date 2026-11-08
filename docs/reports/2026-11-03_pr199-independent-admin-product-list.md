# PR #199 非干渉分析：管理商品一覧と残29操作

## 進捗

独立ブランチ `work/pr199-parallel-supporting-analysis-20261103`。本体 PR #199 作業時HEAD `b671561a834998a58ef59c3047b7d47e76569c9c`。  
**基本静的分析159/188操作（残29）、非default状態17/20（残3）。** 今回 `SCREEN-ADMIN-PRODUCTS-A01-01` のみ `review_required`→`analyzed`。

## 今回確認した経路

- 画面 `src/presentation/pages/admin-product-pages.tsx:48-85,200-269` はactive Staff専用のWeb `/admin/products`。保存済みProduct.status、Category/Brand、active SKU数/Total Stock、現在価格範囲、詳細Link、Pageを表示。
- `AdminProductUseCases.search:80-102` がactive Operator/Adminを認可し、`DexieAdminProductQueryRepository.search:417-508` で全Product→active SKUを結合しStatus/price/stockを計算、Sortと20件Pageを返す。
- 正式 `docs/spec/features/admin-catalog.md:9-19,59-91` の商品公開可否ルールと管理一覧表示の責務は異なる。画面が`published`を示すのは保存済みstatusで、今から公開できることの証明ではない。
- Seed `default-dataset.ts:67-245` は固定11商品・各公開状態/Rank、`scenarios.ts:425-470` はmany-products1000件。既存integration/Componentテストの定義は読んだが今回実行していない。
- Active SKUが0のProductでは現行Repositoryが`Math.min(...[])`/`Math.max(...[])`で`Infinity/-Infinity`を返す可能性がある。実画面の金額表示とDTO上の不変条件を#210の製品適合候補として確認。
- `SCREEN-ADMIN-PRODUCTS-A01-02` は以前の詳細調査でSelectedがページ/条件を跨いで残り、bulkの送信対象0件・未捕捉VALIDATIONになる経路が見つかっている。正式UI期待・直接実Run/DB不変が未受入のため**`review_required`を維持**。

## 未分析29操作（個別ID）

| No | ID | 操作 | 現在の不足 |
| ---: | --- | --- | --- |
| 1 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:60-74を照合。仕様の『配送先を選択』には登録済み必須・任意住所入力可否の明示がなく、プラ |
| 2 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、CheckoutOrderUseCases.start:108-139/setAddres |
| 3 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens.tsx:684-791と住所欄反映、Dexie startOrResume:630-66 |
| 4 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | 仕様/実装/Seedの個別照合が未完 |
| 5 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.startOrResume:630-669、SQLite NativeCheckoutReposi |
| 6 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Payment UI、regular-member/checkout-resume Seedを照合 |
| 7 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member/checkout-resume Seedを照合。Webの保存失敗未処理を修正しcompo |
| 8 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735/878-939、CheckoutOrderUseCases.getActive:138- |
| 9 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite checkoutSessionRepository、cart-version-invalidate |
| 10 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851- |
| 11 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirmation:1851 |
| 12 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851- |
| 13 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirmation:1851 |
| 14 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851- |
| 15 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851- |
| 16 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite:1851- |
| 17 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-processing/payment-declined Seed（guest初期状態は要ログ |
| 18 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyOrder:397-4 |
| 19 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyOrder:397-4 |
| 20 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkeyword変更時のみpage=1へ戻し、status/rank/stock/価格/sort変 |
| 21 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | 仕様/実装/Seedの個別照合が未完 |
| 22 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一覧にはRankとsort選択UIがない。Use Case/Repositoryはmembe |
| 23 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator/admin間のみ・自己/last-admin/withdrawn拒否を確認。AdminU |
| 24 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | 仕様/実装/Seedの個別照合が未完 |
| 25 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | 仕様/実装/Seedの個別照合が未完 |
| 26 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | 仕様/実装/Seedの個別照合が未完 |
| 27 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | 仕様/実装/Seedの個別照合が未完 |
| 28 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review-user-pages.tsx:618-830、default-dataset.ts:730 |
| 29 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefault guest Seedを静的照合。主要RiskとC1〜C6は既存台帳にある。Web非a |

### 画面別の残作業

| 対象画面 | 件数 | ID |
| --- | ---: | --- |
| `SCREEN-CHECKOUT-ADDRESS` | 5 | `SCREEN-CHECKOUT-ADDRESS-A01-01` 注文配送先を選択、`SCREEN-CHECKOUT-ADDRESS-A01-02` 次の決済ステップに遷移、`SCREEN-CHECKOUT-ADDRESS-A02-01` セッション再開を通知、`SCREEN-CHECKOUT-ADDRESS-A02-02` 古いセッションを通知、`SCREEN-CHECKOUT-ADDRESS-A02-03` セッション置換を通知 |
| `SCREEN-CHECKOUT-PAYMENT` | 4 | `SCREEN-CHECKOUT-PAYMENT-A01-01` 決済方法を選択、`SCREEN-CHECKOUT-PAYMENT-A01-02` 確認画面へ遷移、`SCREEN-CHECKOUT-PAYMENT-A02-01` 不完全セッションを拒否、`SCREEN-CHECKOUT-PAYMENT-A02-02` 古いカートバージョンを拒否 |
| `SCREEN-CHECKOUT-CONFIRM` | 7 | `SCREEN-CHECKOUT-CONFIRM-A01-01` 最終注文内容を確認、`SCREEN-CHECKOUT-CONFIRM-A01-02` 配送先を確認、`SCREEN-CHECKOUT-CONFIRM-A01-03` 価格を確認、`SCREEN-CHECKOUT-CONFIRM-A01-04` 決済方法を確認、`SCREEN-CHECKOUT-CONFIRM-A02-01` 古いカートを拒否、`SCREEN-CHECKOUT-CONFIRM-A02-02` 価格不一致を拒否、`SCREEN-CHECKOUT-CONFIRM-A02-03` 修正導線を表示 |
| `SCREEN-CHECKOUT-COMPLETE` | 3 | `SCREEN-CHECKOUT-COMPLETE-A01-01` 決済完了を表示、`SCREEN-CHECKOUT-COMPLETE-A01-02` 注文番号を表示、`SCREEN-CHECKOUT-COMPLETE-A01-03` 注文履歴へ遷移 |
| `SCREEN-ADMIN-PRODUCTS` | 1 | `SCREEN-ADMIN-PRODUCTS-A01-02` フィルター |
| `SCREEN-ADMIN-INVENTORIES` | 1 | `SCREEN-ADMIN-INVENTORIES-A02-02` 競合更新を拒否 |
| `SCREEN-ADMIN-USERS` | 1 | `SCREEN-ADMIN-USERS-A01-02` ユーザーの絞り込み |
| `SCREEN-ADMIN-USER-DETAIL` | 6 | `SCREEN-ADMIN-USER-DETAIL-A01-02` ロール変更、`SCREEN-ADMIN-USER-DETAIL-A01-03` 会員ランク変更、`SCREEN-ADMIN-USER-DETAIL-A01-04` 状態変更、`SCREEN-ADMIN-USER-DETAIL-A02-01` 自己権限破壊を拒否、`SCREEN-ADMIN-USER-DETAIL-A02-02` 退会済の変更を拒否、`SCREEN-ADMIN-USER-DETAIL-A02-03` 最終管理者の変更を拒否 |
| `SCREEN-BOUNDARY-FORBIDDEN` | 1 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` アクセス権限不足を示す |

### 非default状態3件

| ID | 残る根拠・検証 |
| --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし。catalog-pages.test.tsx:305-313も無CTAを明示的に期待。仕様と現実の不一致候補のためreview_requiredを維持。SUT修正・正式仕様変更・Issue作成は行わず、ユーザー判断待ち |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:153-160、metadata.ts:306-316とBASE_CLOCK、scenarios.ts:107-111/367-395、ui-ux-improvements.spec.ts:141-155を照合。Web限定 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repository・WebのCheckoutLoadError、関連回帰テストを照合。Seedの未完了Stepと確認画面上の版不一致再現条件を混同しない |

## 分析以外の残タスク

- 188操作/20状態の分母の完全性、159分析済みIDの正本/Role/State/Data・UI→UseCase→Repository/Seed/Case根拠を再監査。
- Web Playwright・Android SQLite/MaestroでRole/権限/価格・在庫・Version/Checkout・Screen/DB前後/Visual/a11yの実Run。管理商品0 SKU・フィルター選択残留などの異常系は優先実証。
- #210の製品適合判断：管理商品0 SKU値表示、Test API Build未設定local fallback、Window APIのRole/Reset途中失敗、Native公開レビュー一覧なし、Web Cart同時更新/Native Issue理由・価格同意、住所既定切替、Native検索・Home・Variation・Login文言など過去の候補。今回SUTは変更していない。
- #211教材・契約、M00〜M10/51目標の教材/演習/採点・Skill・再提出/誤PASS/異常終了、M02→M03 Skill Runtime、M04/M07/M10 AI実モデル校正、M05〜M07 Playwright実Run/Trace、M08本人Git、M09/M10 Private repo CI Run/Check/Artifact/SHAの実証。
- `course:sync`配布元・全hash/22状態・M00〜M10実ロード、再同期/中断復旧、本人ファイル、JS/CSS/Secret/個人情報、第三者License/NOTICE、最終同一HEADのWeb/Mobile required CIと独立レビュー。
- PR #199最新HEADと独立分析結果のID単位三者比較・重複除外後の取込。共通Plan/自動実行4本の変更なし。Mobile PR trigger復元はマージ準備、本人Public Template公開/Private 2core Codespaces実受入は合意どおりmerge後。明示指示なしでmerge/force-push/branch削除/公開・課金/新Issue作成なし。

## 検証と非干渉

- 今回は`SCREEN-ADMIN-PRODUCTS-A01-01`だけ分析status/根拠/Role・Seed/Caseを変更。他の207 IDは前の台帳とJS構造比較で不変。必須欄/Requirement/3種`reviewed_against`、件数159/188・17/20を算定。
- GitHub expected HEAD付・非forceの独立ブランチコミットのみ。PR #199、#210/#211、製品SUT/正式仕様/Seed/既存テスト・定期実行設定/共通Planに書込なし。
- `node scripts/training/validate-supported-behaviors.mjs`/Vitest/Playwright/Android/CIは今回未実行。静的完了を製品受入PASSとして扱わない。
