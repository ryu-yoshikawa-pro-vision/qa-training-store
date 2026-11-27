# PR #199 非干渉の基本分析：商品詳細3操作

調査元: PR #199 `b671561a834998a58ef59c3047b7d47e76569c9c`、独立ブランチ `work/pr199-parallel-supporting-analysis-20261103`。  
台帳: `training/ai-assisted-qa-course/coverage/supported-behaviors.json`。作業前は操作144/188・非default状態17/20、更新後は操作**147/188（+3、残41）**・状態**17/20（残3）**。

## 今回の結果

| ID | 分析状態 | WebとAndroidの主な証拠・未受入 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01` 有効Variationの選択 | `analyzed` | P-0001 shirt stock20/10/0、P-0010 12色/P-0011 13サイズ。Webは12以下button/13以上selectでstock0をdisabled。Androidは全件chips、stock0選択可だが追加不可。Native複数Variantは初期未選択 |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-02` カート追加 | `analyzed` | Webは1〜min(stock,purchaseLimit)の数量を選択、Androidは1個ずつ。CartUseCases.addItem→Dexie/SQLiteでGuest/active customerのCart/Itemを更新し、既存SKUは合算・Version更新 |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03` 無効SKU/在庫0拒否 | `analyzed` | Web/Native UI側の在庫0制約＋CartRepositoryのactive/公開/rank/stock/購入数量再検証。失敗時Cart/Version/Session不変は実Run未確認 |

## 照合した仕様・実装・Seed

- 正本 `docs/spec/features/storefront.md:9-23,100-115`、`docs/spec/features/cart.md:9-23`、`docs/spec/roles-and-permissions.md:5-31`。
- Web `src/presentation/pages/product-detail-page.tsx:23-300` → `CatalogUseCases.getProductDetail`/ `CartUseCases.addItem`。
- Android `src/presentation/native/native-screens.tsx:586-758` と `native-variation-selection.ts:3-16` → 共通UseCase/Native SQLite。
- Dexie `src/infrastructure/database/dexie/cart-checkout-repositories.ts:111-205`、Native SQLite `src/infrastructure/database/sqlite/native-customer-application-repositories.ts:1157-1279`、数量計算 `src/domain/services/cart.ts:3-27`。
- default Seed `src/seeds/default-dataset.ts:67-245,269-329`：P-0001 shirtのS=20/M=10/L=0、P-0010の12色、P-0011の13サイズ、P-0006在庫0、P-0005在庫3。各Variant購入上限5、Cart全体の1SKU上限はmin(stock,purchaseLimit,99)。
- 既存 `tests/component/native/native-variation-selection.test.ts:21-34`、`tests/integration/cart-use-cases.test.ts:146-189`、`tests/repository-contract/cart-mutations.test.ts:25-42` は該当する部分のテスト定義を確認。**今回の実行結果ではない**。

## 仕様適合の確認候補（製品SUT修正ではない）

1. 12件以下はbutton・13件以上はselectとする正式共通UI仕様に対して、NativeはVariation数に関係なくchipsを表示。Android正式画面参照・対象範囲を確認する。
2. Webは在庫0のVariationを選択不可、Nativeは選択可能だがAdd不可。結果としてCart更新できない点は共通だが、仕様における「選択可能」の解釈と教材テストの期待結果に差がある。
3. Webは追加数量を選べるがNativeは常に1個。購入上限まで1個ずつ追加することは可能でも、同一操作条件/教材の数量テストの期待が同じではない。
4. Cart追加時の既存数量と上限を超える拒否、別Sessionからの在庫・公開状態変更、失敗時のCart/CartItem/Checkout/全DB不変、Nativeエラーメッセージの実表示を直接検証する。静的実装の存在だけでPASSとしない。

## 現在の進捗

| 対象 | analyzed | 残 |
| --- | ---: | ---: |
| 独立ブランチの操作 | **147/188** | **41件** |
| 独立ブランチの非default状態 | **17/20** | **3件** |
| PR #199本体（作業開始時） | **121/188** | **67件** |
| PR #199本体の非default状態（作業開始時） | **17/20** | **3件** |

独立ブランチで `analyzed` となった26操作はPR #199本体へ未取り込み（本体の最新状態が変わればID単位の重複除外が必要）。分母188/20は最終監査前の暫定値。

### 未分析の操作41件・ID単位

| No. | ID | 操作 | 主な不足/再開条件 |
| ---: | --- | --- | --- |
| 1 | `SCREEN-STOREFRONT-CART-A01-01` | ゲスト・顧客のカート明細 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 2 | `SCREEN-STOREFRONT-CART-A01-02` | 数量と合計金額 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 3 | `SCREEN-STOREFRONT-CART-A01-03` | 現在価格・問題の理由 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 4 | `SCREEN-STOREFRONT-CART-A02-01` | 商品状態を再検証 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 5 | `SCREEN-CHECKOUT-ADDRESSES-A01-04` | 既定の配送先に設定する | checkout-and-payment.md:25-39のSCREEN-CHECKOUT-ADDRESSESとSCREEN-CHECKOUT-ADDRESSを区別。Web addresses-page.tsx:135-165は「既定にする」からaccount.updateAddressを呼び、Native native-purchase-scre |
| 6 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:60-74を照合。仕様の『配送先を選択』には登録済み必須・任意住所入力可 |
| 7 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、CheckoutOrderUseCases.start:108-139 |
| 8 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens.tsx:684-791と住所欄反映、Dexie startOrRes |
| 9 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 10 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.startOrResume:630-669、SQLite NativeChec |
| 11 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Payment UI、regular-member/checkout-resu |
| 12 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member/checkout-resume Seedを照合。Webの保存失敗未処 |
| 13 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735/878-939、CheckoutOrderUseCases.getA |
| 14 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite checkoutSessionRepository、cart-version- |
| 15 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 16 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirm |
| 17 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 18 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirm |
| 19 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 20 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 21 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 22 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-processing/payment-declined Seed（gue |
| 23 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyO |
| 24 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyO |
| 25 | `SCREEN-ADMIN-PRODUCTS-A01-01` | 商品一覧・公開状態 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 26 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkeyword変更時のみpage=1へ戻し、status/rank/stoc |
| 27 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 28 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一覧にはRankとsort選択UIがない。Use Case/Reposi |
| 29 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator/admin間のみ・自己/last-admin/withdrawn拒否 |
| 30 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 31 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 32 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 33 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 34 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review-user-pages.tsx:618-830、default-data |
| 35 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefault guest Seedを静的照合。主要RiskとC1〜C6は既存台 |
| 36 | `SCREEN-TEST-CONTROL-A01-01` | シナリオ選択 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 37 | `SCREEN-TEST-CONTROL-A01-02` | クロック操作 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 38 | `SCREEN-TEST-CONTROL-A01-03` | 決済遅延設定 | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 39 | `SCREEN-TEST-CONTROL-A01-04` | シードリセット | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 40 | `SCREEN-TEST-CONTROL-A02-01` | テスト専用で本番対象外とする | 仕様/実装/Seed・Caseの個別根拠が不足 |
| 41 | `UC-CATALOG-LIST-REVIEWS` | 商品の公開レビューを一覧表示する | CatalogUseCases.listReviewsはレビュー問い合わせのpage>=1/pageSize=20を要求するが、customerGateway経路では空配列・total 0を返す。Web経路ではlistPublishedを利用。Nativeでレビュー一覧を表示する仕様かを明確化し、Platformと期待結果を経路別に分割する必要があ |

### 残る非default状態3件

| 状態ID | 状態 | 未解決条件（台帳要約） |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | empty状態を表示・処理 | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし。catalog-pages.test.tsx:305-313も無CTAを明示的に期待。仕様と現実の不一致候補のためreview_requiredを維持。SUT修正・正式仕様変更・Issue作成は行わず、ユーザー判断待ち |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | resume-notice状態を表示・処理 | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:153-160、metadata.ts:306-316とBASE_CLOCK、scenarios.ts:107-111/367-395、ui-ux-improvements.spec.ts:141-155を照合。Web限定状態の成立条件と反例を確認した。最新HEADのE2E実行成功とは区別 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | stale-cart状態を表示・処理 | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repository・WebのCheckoutLoadError、関連回帰テストを照合。Seedの未完了Stepと確認画面上の版不一致再現条件を混同しない |

### 機能別の残作業

| 画面・Use Case | 件数 | 個別操作 |
| --- | ---: | --- |
| `SCREEN-STOREFRONT-CART` | 4 | `SCREEN-STOREFRONT-CART-A01-01`：ゲスト・顧客のカート明細、`SCREEN-STOREFRONT-CART-A01-02`：数量と合計金額、`SCREEN-STOREFRONT-CART-A01-03`：現在価格・問題の理由、`SCREEN-STOREFRONT-CART-A02-01`：商品状態を再検証 |
| `SCREEN-CHECKOUT-ADDRESSES` | 1 | `SCREEN-CHECKOUT-ADDRESSES-A01-04`：既定の配送先に設定する |
| `SCREEN-CHECKOUT-ADDRESS` | 5 | `SCREEN-CHECKOUT-ADDRESS-A01-01`：注文配送先を選択、`SCREEN-CHECKOUT-ADDRESS-A01-02`：次の決済ステップに遷移、`SCREEN-CHECKOUT-ADDRESS-A02-01`：セッション再開を通知、`SCREEN-CHECKOUT-ADDRESS-A02-02`：古いセッションを通知、`SCREEN-CHECKOUT-ADDRESS-A02-03`：セッション置換を通知 |
| `SCREEN-CHECKOUT-PAYMENT` | 4 | `SCREEN-CHECKOUT-PAYMENT-A01-01`：決済方法を選択、`SCREEN-CHECKOUT-PAYMENT-A01-02`：確認画面へ遷移、`SCREEN-CHECKOUT-PAYMENT-A02-01`：不完全セッションを拒否、`SCREEN-CHECKOUT-PAYMENT-A02-02`：古いカートバージョンを拒否 |
| `SCREEN-CHECKOUT-CONFIRM` | 7 | `SCREEN-CHECKOUT-CONFIRM-A01-01`：最終注文内容を確認、`SCREEN-CHECKOUT-CONFIRM-A01-02`：配送先を確認、`SCREEN-CHECKOUT-CONFIRM-A01-03`：価格を確認、`SCREEN-CHECKOUT-CONFIRM-A01-04`：決済方法を確認、`SCREEN-CHECKOUT-CONFIRM-A02-01`：古いカートを拒否、`SCREEN-CHECKOUT-CONFIRM-A02-02`：価格不一致を拒否、`SCREEN-CHECKOUT-CONFIRM-A02-03`：修正導線を表示 |
| `SCREEN-CHECKOUT-COMPLETE` | 3 | `SCREEN-CHECKOUT-COMPLETE-A01-01`：決済完了を表示、`SCREEN-CHECKOUT-COMPLETE-A01-02`：注文番号を表示、`SCREEN-CHECKOUT-COMPLETE-A01-03`：注文履歴へ遷移 |
| `SCREEN-ADMIN-PRODUCTS` | 2 | `SCREEN-ADMIN-PRODUCTS-A01-01`：商品一覧・公開状態、`SCREEN-ADMIN-PRODUCTS-A01-02`：フィルター |
| `SCREEN-ADMIN-INVENTORIES` | 1 | `SCREEN-ADMIN-INVENTORIES-A02-02`：競合更新を拒否 |
| `SCREEN-ADMIN-USERS` | 1 | `SCREEN-ADMIN-USERS-A01-02`：ユーザーの絞り込み |
| `SCREEN-ADMIN-USER-DETAIL` | 6 | `SCREEN-ADMIN-USER-DETAIL-A01-02`：ロール変更、`SCREEN-ADMIN-USER-DETAIL-A01-03`：会員ランク変更、`SCREEN-ADMIN-USER-DETAIL-A01-04`：状態変更、`SCREEN-ADMIN-USER-DETAIL-A02-01`：自己権限破壊を拒否、`SCREEN-ADMIN-USER-DETAIL-A02-02`：退会済の変更を拒否、`SCREEN-ADMIN-USER-DETAIL-A02-03`：最終管理者の変更を拒否 |
| `SCREEN-BOUNDARY-FORBIDDEN` | 1 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01`：アクセス権限不足を示す |
| `SCREEN-TEST-CONTROL` | 5 | `SCREEN-TEST-CONTROL-A01-01`：シナリオ選択、`SCREEN-TEST-CONTROL-A01-02`：クロック操作、`SCREEN-TEST-CONTROL-A01-03`：決済遅延設定、`SCREEN-TEST-CONTROL-A01-04`：シードリセット、`SCREEN-TEST-CONTROL-A02-01`：テスト専用で本番対象外とする |
| `UC-CATALOG-LIST` | 1 | `UC-CATALOG-LIST-REVIEWS`：商品の公開レビューを一覧表示する |

## 分析とは別の残条件（未分析41+3に含まない）

- 188操作/20非default状態の分母をscreen-catalog・BR/AC・UseCase・公開状態で監査。分析済み根拠の行・Role/State/Data・UI→Use Case→Repository・固定Seed・Risk/Condition/Case採否の再チェック。
- Web Playwright/Android Native実RunでGuest/Customer/Staff/停止/退会、正常/拒否/数量/金額/時刻/Cart-Version/競合、表示・全DB不変、Visual/a11yを検証。未実施をPASSとしない。
- #210製品適合候補：Native 13+ Variation UI・在庫0選択差・1個追加、前回までのNative Login/Signup生messageKey・検索0件復帰・Home特典、Guide/Legal、NotFound/Forbidden、Checkout/Cart/管理機能の候補を実証・判断。製品コード/正式仕様/既存製品テストはこのブランチで変更しない。
- #211の別担当：実技/AI評価/Skill/学習用契約テスト・配布元監査、本人実Runの受入と最新HEAD CIの統合。
- M00〜M10/51目標教材・演習・Caseと製品仕様の整合、M02→M03固定Skill runtime、M04/M07/M10実モデル校正、再提出/異常終了/誤PASS拒否。
- M05〜M07 Playwright Run/Trace、M08本人Git操作、M09/M10 Private repoでCI/Run/Check/Artifact/SHA独立照合。配布元`course:sync`、全hash・中断復旧・再同期、22状態、ファイル保護・JS/CSS・Secret/個人情報・第三者NOTICE/ライセンス。
- 最終同一HEADのWeb/Mobile必須CI・独立レビューとマージ準備。公開Template本人作成・Private 2core Codespaces本人受入は既存方針どおりマージ後。無断merge/公開/課金/Issue作成をしない。

## 実施した検証・非干渉

- 追加3件の旧status、参照元の正本・Web/Native・UseCase/Repository・Seed・既存テスト定義を静的確認。更新対象3件だけ `analyzed` と `reviewed_against` を変更し、C1以降、Risk・Case採否・未受入条件を書き換えた。ほかのIDのオブジェクトは不変。
- 必須分析欄と3種`reviewed_against`、件数147/188・状態17/20をスクリプト相当の静的条件で確認。
- `node scripts/training/validate-supported-behaviors.mjs`、Vitest、Playwright、Android実機、CIは今回未実行。テスト定義を確認したことは当該HEADでの成功を意味しない。
- 定期実行4本/共通Plan/PR #199/#210/#211/製品SUT/正式仕様・Seed/Reset/既存製品テストを変更していない。保存は独立ブランチの期待HEADを指定したfast-forwardのみ。
- 本体へ取り込む際は最新HEADの台帳Blobを取得し、ID単位に両者の変更と重複を照合する。台帳JSON全体の上書きはしない。
