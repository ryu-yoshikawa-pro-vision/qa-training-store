# PR #199 非干渉調査：検索と認証6操作、残作業一覧

## 実施範囲と保護対象

- 調査基点 PR #199 HEAD: `b671561a834998a58ef59c3047b7d47e76569c9c`（作業開始時に実際のHEADを取得）。
- 更新先: `work/pr199-parallel-supporting-analysis-20261103`（PR #199本体・定期実行の共通Plan・専有テスト・製品SUT/正式仕様・#210・#211は変更しない）。
- 台帳: `training/ai-assisted-qa-course/coverage/supported-behaviors.json` の対象6 IDのみ編集し、既存の他の分析済み/未分析IDは不変。
- 処理: 既存仕様、UI、Use Case、Repository/Transaction、default Seed、既存テストを照合し、RiskとC1以降のテスト条件・Case採否を個別記載。**基本静的分析の完了だけを `analyzed` とした。** 実Web/Android、画面・DB不変、製品仕様適合、CI、教材の最終受入は別判定。

## 今回の6操作

| ID | 基本分析 | 確認事項 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-SEARCH-A01-03` | `analyzed` | Category/Brand同種OR・異種AND、価格SKU同時範囲・Viewer/Time・Facet自身除外・Web URL/Native StateとPage Reset、Dexie/SQLite・Seedと既存repository-contractを照合 |
| `SCREEN-STOREFRONT-SEARCH-A02-02` | `analyzed` | Web検索0件は一括解除→/search、Nativeは0件表示+入力/Facet再操作のみ。同名`search-empty`の登録済みScenarioは未確認（metadataにない） |
| `SCREEN-AUTH-LOGIN-A02-01` | `analyzed` | active/停止/退会/誤パスワード・Session前拒否、Transaction rollback、Web日本語文言とNative messageKey表示候補 |
| `SCREEN-AUTH-SIGNUP-A01-01` | `analyzed` | 登録のemail正規化/Password hash、active/regular User、Guest Cart mergeとSession作成のTransaction、Web/Native遷移差 |
| `SCREEN-AUTH-SIGNUP-A02-01` | `analyzed` | Web Zod/confirmation/注意checkbox、Nativeは直接UseCase側のVALIDATION。Native表示の生キー候補 |
| `SCREEN-AUTH-SIGNUP-A02-02` | `analyzed` | 事前+Transaction内のメール重複確認、existing Role/状態、正規化、同時登録時の一意性・rollback条件 |

### 実際に確認した経路

- 検索: `docs/spec/features/storefront.md:9-23,141-155` → Web `src/presentation/pages/catalog-list-page.tsx:111-162,323-525` / Native `src/presentation/native/native-screens.tsx:300-583,1054-1139` → `CatalogUseCases.search:86-93` → Web Dexie `storefront-repositories.ts:56-127,249-382` / Native SQLite `native-customer-repositories.ts:144-205,259-273,723-781` → `src/seeds/default-dataset.ts`。既存 `tests/repository-contract/storefront-catalog.test.ts:106-153` は価格・Facets・Ratingの一部を静的照合。実行済みとは主張しない。
- ログイン: `docs/spec/features/authentication.md:9-35,116-126` → Web `auth-pages.tsx:21-32,74-180` / Native `native-purchase-screens.tsx:150-232` → `AuthUseCases.login:52-119` / `assertLoginAllowed:208-223` → User/Session/Cart Transaction。既存 `tests/integration/auth-account.test.ts:100-147,178-220` は拒否・取引失敗Case。
- 登録: 同正式仕様 → Web `auth-pages.tsx:34-63,220-333` / Native `native-purchase-screens.tsx:235-287` → `AuthUseCases.register:121-193` / `validateRegistration:225-248` → User/Session/Cart Transaction。既存integration `auth-account.test.ts:223-297` は正常登録と入力境界を検査。

## 製品側の未確定候補（#210担当・製品コードは未変更）

1. Nativeログイン/登録の拒否時に `asPurchaseError(caught).message` を表示するが、`ApplicationError` は `super(messageKey)` で `Error.message` に内部キーを入れる。例: `auth.account.suspended`、`auth.email.exists`、`validation.form`。正式認証仕様の「分かりやすい利用者向け文言、内部情報非露出」と整合するか要実画面確認。Webは日本語へ変換する。
2. Native検索結果0件は「該当する商品がありません」の表示のみ。キーワード欄・Facetの再操作はできるが、Webの「条件をすべて解除」に相当する専用Actionはない。正式な条件見直し導線の受入を確認する。
3. Web登録は確認Passwordと学習注意checkboxを持ち、Nativeは3入力のみ。共通UseCaseはemail/password/displayNameを検証するが、画面の説明/確認条件は異なる。正式仕様の要求範囲・教材の手順との差を評価。
4. 正式`storefront.md`の検索0件状態は`search-empty`と記述される一方、登録済み`SCENARIO_METADATA`に同名Scenarioは見つからない。既存defaultから不一致キーワードを投入して再現する場合の受入条件を統一する（Seedの新設権限は今回なし）。

いずれも静的調査の候補で、実画面における症状の再現/製品不具合確定や#210の変更権限を意味しない。

## 分析数と取り込み

| 正本 | 操作 analyzed/188 | 操作未分析 | 非default状態 analyzed/20 | 状態未分析 |
| --- | ---: | ---: | ---: | ---: |
| 独立ブランチ（今回の結果） | **144** | **44** | **17** | **3** |
| PR #199本体（作業開始時） | **121** | **67** | **17** | **3** |

独立ブランチで完了と記載した23操作はPR #199本体へ未取り込み（ただし本体の最新HEAD更新時には再集計）。最新HEADのIDごとの差分を見て重複は取り込まない。**定期実行の分析台帳全体を置き換えない。**

### 残44操作：画面単位

| 画面・Use Case | 残件 | 対象操作 |
| --- | ---: | --- |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL` | 3 | `A02-01` 有効なバリエーションを選択、`A02-02` カートに追加、`A02-03` 選択不能・在庫切れの追加を拒否 |
| `SCREEN-STOREFRONT-CART` | 4 | `A01-01` ゲスト・顧客のカート明細、`A01-02` 数量と合計金額、`A01-03` 現在価格・問題の理由、`A02-01` 商品状態を再検証 |
| `SCREEN-CHECKOUT-ADDRESSES` | 1 | `A01-04` 既定の配送先に設定する |
| `SCREEN-CHECKOUT-ADDRESS` | 5 | `A01-01` 注文配送先を選択、`A01-02` 次の決済ステップに遷移、`A02-01` セッション再開を通知、`A02-02` 古いセッションを通知、`A02-03` セッション置換を通知 |
| `SCREEN-CHECKOUT-PAYMENT` | 4 | `A01-01` 決済方法を選択、`A01-02` 確認画面へ遷移、`A02-01` 不完全セッションを拒否、`A02-02` 古いカートバージョンを拒否 |
| `SCREEN-CHECKOUT-CONFIRM` | 7 | `A01-01` 最終注文内容を確認、`A01-02` 配送先を確認、`A01-03` 価格を確認、`A01-04` 決済方法を確認、`A02-01` 古いカートを拒否、`A02-02` 価格不一致を拒否、`A02-03` 修正導線を表示 |
| `SCREEN-CHECKOUT-COMPLETE` | 3 | `A01-01` 決済完了を表示、`A01-02` 注文番号を表示、`A01-03` 注文履歴へ遷移 |
| `SCREEN-ADMIN-PRODUCTS` | 2 | `A01-01` 商品一覧・公開状態、`A01-02` フィルター |
| `SCREEN-ADMIN-INVENTORIES` | 1 | `A02-02` 競合更新を拒否 |
| `SCREEN-ADMIN-USERS` | 1 | `A01-02` ユーザーの絞り込み |
| `SCREEN-ADMIN-USER-DETAIL` | 6 | `A01-02` ロール変更、`A01-03` 会員ランク変更、`A01-04` 状態変更、`A02-01` 自己権限破壊を拒否、`A02-02` 退会済の変更を拒否、`A02-03` 最終管理者の変更を拒否 |
| `SCREEN-BOUNDARY-FORBIDDEN` | 1 | `A01-01` アクセス権限不足を示す |
| `SCREEN-TEST-CONTROL` | 5 | `A01-01` シナリオ選択、`A01-02` クロック操作、`A01-03` 決済遅延設定、`A01-04` シードリセット、`A02-01` テスト専用で本番対象外とする |
| `UC-CATALOG-LIST` | 1 | `REVIEWS` 商品の公開レビューを一覧表示する |

### 残44操作：IDごとの不足状態（台帳の記載を要約）

| No | ID | 操作 | 現時点で不足する条件 |
| ---: | --- | --- | --- |
| 1 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01` | 有効なバリエーションを選択 | 仕様・実装/Seedの個別照合が未完 |
| 2 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-02` | カートに追加 | 仕様・実装/Seedの個別照合が未完 |
| 3 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03` | 選択不能・在庫切れの追加を拒否 | 仕様・実装/Seedの個別照合が未完 |
| 4 | `SCREEN-STOREFRONT-CART-A01-01` | ゲスト・顧客のカート明細 | 仕様・実装/Seedの個別照合が未完 |
| 5 | `SCREEN-STOREFRONT-CART-A01-02` | 数量と合計金額 | 仕様・実装/Seedの個別照合が未完 |
| 6 | `SCREEN-STOREFRONT-CART-A01-03` | 現在価格・問題の理由 | 仕様・実装/Seedの個別照合が未完 |
| 7 | `SCREEN-STOREFRONT-CART-A02-01` | 商品状態を再検証 | 仕様・実装/Seedの個別照合が未完 |
| 8 | `SCREEN-CHECKOUT-ADDRESSES-A01-04` | 既定の配送先に設定する | checkout-and-payment.md:25-39のSCREEN-CHECKOUT-ADDRESSESとSCREEN-CHECKOUT-ADDRESSを区別。Web addresses-page.tsx:135-165は「既定にする」からaccount.updateAddressを呼び、Native native-purchase |
| 9 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:60-74を照合。仕様の『配送先を選択』には登録済み必須・任意 |
| 10 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、CheckoutOrderUseCases.start:10 |
| 11 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens.tsx:684-791と住所欄反映、Dexie start |
| 12 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | 仕様・実装/Seedの個別照合が未完 |
| 13 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.startOrResume:630-669、SQLite Nativ |
| 14 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Payment UI、regular-member/checkout |
| 15 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member/checkout-resume Seedを照合。Webの保 |
| 16 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735/878-939、CheckoutOrderUseCases |
| 17 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite checkoutSessionRepository、cart-ver |
| 18 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 19 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getCo |
| 20 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 21 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getCo |
| 22 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 23 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 24 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 25 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-processing/payment-declined See |
| 26 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.g |
| 27 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.g |
| 28 | `SCREEN-ADMIN-PRODUCTS-A01-01` | 商品一覧・公開状態 | 仕様・実装/Seedの個別照合が未完 |
| 29 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkeyword変更時のみpage=1へ戻し、status/rank |
| 30 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | 仕様・実装/Seedの個別照合が未完 |
| 31 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一覧にはRankとsort選択UIがない。Use Case/R |
| 32 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator/admin間のみ・自己/last-admin/withdr |
| 33 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | 仕様・実装/Seedの個別照合が未完 |
| 34 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | 仕様・実装/Seedの個別照合が未完 |
| 35 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | 仕様・実装/Seedの個別照合が未完 |
| 36 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | 仕様・実装/Seedの個別照合が未完 |
| 37 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review-user-pages.tsx:618-830、default |
| 38 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefault guest Seedを静的照合。主要RiskとC1〜C |
| 39 | `SCREEN-TEST-CONTROL-A01-01` | シナリオ選択 | 仕様・実装/Seedの個別照合が未完 |
| 40 | `SCREEN-TEST-CONTROL-A01-02` | クロック操作 | 仕様・実装/Seedの個別照合が未完 |
| 41 | `SCREEN-TEST-CONTROL-A01-03` | 決済遅延設定 | 仕様・実装/Seedの個別照合が未完 |
| 42 | `SCREEN-TEST-CONTROL-A01-04` | シードリセット | 仕様・実装/Seedの個別照合が未完 |
| 43 | `SCREEN-TEST-CONTROL-A02-01` | テスト専用で本番対象外とする | 仕様・実装/Seedの個別照合が未完 |
| 44 | `UC-CATALOG-LIST-REVIEWS` | 商品の公開レビューを一覧表示する | CatalogUseCases.listReviewsはレビュー問い合わせのpage>=1/pageSize=20を要求するが、customerGateway経路では空配列・total 0を返す。Web経路ではlistPublishedを利用。Nativeでレビュー一覧を表示する仕様かを明確化し、Platformと期待結果を経路別に分割す |

### 残る非default状態3件

| 状態ID | 対象 | 未解決条件 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | empty状態を表示・処理 | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし。catalog-pages.test.tsx:305-31 |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | resume-notice状態を表示・処理 | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:153-160、metadata.ts:306-316とBAS |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | stale-cart状態を表示・処理 | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repository・WebのCheckoutLoadError、関 |

## 残る横断タスク（44+3件には算入しない）

- 188操作・20状態の分母監査：画面カタログ/BR・AC/独立Use Caseメソッド/例外Stateの欠落・重複の精査（分母は最終受入前の暫定）。
- 分析済みIDすべての証拠品質再監査：正本行・UI→Use Case→Repository/Seed実値・Risk/TR/Condition/Case採否。validatorの文字列チェックだけで内容の正しさは判定できない。
- 実Web Playwright/Android Native/SQLiteのRole・Data・正常/拒否/エラー/境界・視覚・アクセシビリティ・DB/Session前後の実Run。環境権限が不足するものは未受入とする。
- #210製品側：Android検索0件・ログイン/登録の生messageKey・Web/Native登録差、先行のGuide/Legal/Home/NotFound/ForbiddenのUI仕様差、Checkout/Cart等の認可・価格・在庫・version課題を証拠で判定。今回製品コード変更なし。
- #211の別担当：学習用契約テスト、教材・実技・AI評価・配布の独立実行と最終HEADでの受入。専有ブランチは今回触らない。
- M00〜M10の11モジュール51目標：教材文面/演習/採点・Skillと製品動作の一致、課題・失敗/再提出/途中終了、M02→M03固定Skill runtime、M04/M07/M10のAI評価実モデル校正。
- M05〜M07実Playwright Run/Trace、M08本人Git操作、M09/M10 Private repo/実CI Run/Check/Artifact/SHA独立照合と本人判断。
- 配布元`course:sync`生成・全hash・再同期/中断復旧・全22状態・M00〜M10実ロード・本人ファイル保護、生成JS/CSS/Secret/個人情報・外部第三者ライセンス/NOTICE監査。
- 最終同一HEADのWeb/Mobile required CI、独立レビュー、他の未解決差分の整合。MobileのPR trigger復元はマージ準備時、本人Public Template公開/B3 Private 2core Codespacesは合意どおりマージ後。merge/公開/課金/新Issueは本人の明示指示まで実施しない。

## 直接検証・競合制御

- 作業開始時に本体`b671561a834998a58ef59c3047b7d47e76569c9c`と独立ブランチHEAD/対象台帳SHAを取得。
- 6 IDだけ旧`review_required`を確認して更新。 `completeAnalysis`の必須欄、requirement_refs、3種類の`reviewed_against`を満たした。更新対象外IDはJSON比較で変更なし。
- 他の共通Plan・契約テスト・CI・製品実装・正式仕様・Seed/Reset・定期実行・#210/#211は更新せず。
- `node scripts/training/validate-supported-behaviors.mjs`、Vitest、Playwright、Android実機、CIは今回未実行。静的条件の一致は各実行PASSの代替ではない。
- 独立ブランチ更新はexpected HEADを指定した通常fast-forwardのみ。PR #199に取り込むときはその時点の最新Blob/HEADとID単位の内容を三者比較し、コンフリクトを推測採用しない。
