# PR #199 独立分析：既定配送先切替と残タスク36操作

## 状況

- 調査基点PR #199 HEAD: `b671561a834998a58ef59c3047b7d47e76569c9c`。保存先は独立ブランチ `work/pr199-parallel-supporting-analysis-20261103` のみ。
- 基本分析: **152/188操作（残36件）、非default状態17/20（残3件）**。今回の対象 `SCREEN-CHECKOUT-ADDRESSES-A01-04` のみ新規`analyzed`とした。
- 本体PR #199の台帳は照合時に121/188・17/20。独立ブランチで追加の31件は未統合（時刻により本体HEAD再取得・ID単位重複照合必須）。
- 今回は製品本体、正式仕様、Seed/Reset、製品テスト・共通Plan、定期実行、PR #199本体、#210、#211に変更なし。

## 今回の確認

`SCREEN-CHECKOUT-ADDRESSES-A01-04`（`/account/addresses` の非既定住所から『既定にする』）を基本静的分析済みへ変更。

- 正式 `docs/spec/features/checkout-and-payment.md:25-39` は顧客自身の配送先一覧・管理アクション。注文中の配送先選択`SCREEN-CHECKOUT-ADDRESS`（同ファイル:59-73）とは区別。『既定にする』の文言・手順は正本で明記されず、Web/Native実装を用いたCaseとして整理。
- Web `src/presentation/pages/addresses-page.tsx:37-55,110-165` → `AccountUseCases.updateAddress:99-109` → Dexie `basic-repositories.ts:201-249`。Android `native-purchase-screens.tsx:494-557` → 同UseCase → SQLite `native-customer-application-repositories.ts:670-722`。
- `SessionIdentityResolver.requireCurrentEntity`はguestを拒否し、停止/退会ならCodeを返す。AccountUseCases.requireCustomerは非customerを拒否。RepositoryはuserIdの所有者・expectedVersionを確認しTransaction内で新既定true/version+1、旧既定false/version+1を更新する。
- 初期Seed `default-dataset.ts:729-779` は住所0件。 `regular-member`で本人の住所2件以上を準備する必要がある。既存統合テスト `tests/integration/auth-account.test.ts:299-336` は住所の作成・削除後の既定一意性を確認するが、`updateAddress(makeDefault=true)`の既定切替・旧Version/他者ID拒否を直接テストするものではない。前回台帳の『Web integrationで切替・旧Version拒否を追加』という表現は確認できず、今回明確化した。

### 製品/教材側の確認候補（#210/担当別）

- Web『既定にする』は明示的な処理中無効化がなく、同一住所の連続送信で旧Versionを使ったCONFLICTが起き得る。Nativeは`busy`で無効化。実Web再現・規定UI操作の適合判断が必要。
- Web/Nativeとも成功時の既定1件・旧既定のVersion増加、他者IDと古いVersion拒否、Cart/Checkout Session不変の実Run・DB検証が必要。
- 配送先管理`/account/addresses`での既定切替はCheckout Session内の`/checkout/address`住所Snapshot選択を変更しない。教材ケースを混同しない。

## 残る基本分析36操作

| No. | ID | 操作 | 現状の不足/再開条件 |
| ---: | --- | --- | --- |
| 1 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:60-74を照合。仕様の『配送先を選択』には登録済み必須・任意住所入力可 |
| 2 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、CheckoutOrderUseCases.start:108-139 |
| 3 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens.tsx:684-791と住所欄反映、Dexie startOrRes |
| 4 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 5 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.startOrResume:630-669、SQLite NativeChec |
| 6 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Payment UI、regular-member/checkout-resu |
| 7 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member/checkout-resume Seedを照合。Webの保存失敗未処 |
| 8 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735/878-939、CheckoutOrderUseCases.getA |
| 9 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite checkoutSessionRepository、cart-version- |
| 10 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 11 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirm |
| 12 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 13 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirm |
| 14 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 15 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 16 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQ |
| 17 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-processing/payment-declined Seed（gue |
| 18 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyO |
| 19 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyO |
| 20 | `SCREEN-ADMIN-PRODUCTS-A01-01` | 商品一覧・公開状態 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 21 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkeyword変更時のみpage=1へ戻し、status/rank/stoc |
| 22 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 23 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一覧にはRankとsort選択UIがない。Use Case/Reposi |
| 24 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator/admin間のみ・自己/last-admin/withdrawn拒否 |
| 25 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 26 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 27 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 28 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 29 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review-user-pages.tsx:618-830、default-data |
| 30 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefault guest Seedを静的照合。主要RiskとC1〜C6は既存台 |
| 31 | `SCREEN-TEST-CONTROL-A01-01` | シナリオ選択 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 32 | `SCREEN-TEST-CONTROL-A01-02` | クロック操作 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 33 | `SCREEN-TEST-CONTROL-A01-03` | 決済遅延設定 | 仕様/実装/Seed・Caseの具体照合が未完 |
| 34 | `SCREEN-TEST-CONTROL-A01-04` | シードリセット | 仕様/実装/Seed・Caseの具体照合が未完 |
| 35 | `SCREEN-TEST-CONTROL-A02-01` | テスト専用で本番対象外とする | 仕様/実装/Seed・Caseの具体照合が未完 |
| 36 | `UC-CATALOG-LIST-REVIEWS` | 商品の公開レビューを一覧表示する | CatalogUseCases.listReviewsはレビュー問い合わせのpage>=1/pageSize=20を要求するが、customerGateway経路では空配列・total 0を返す。Web経路ではlistPublishedを利用。Nativeでレビュー一覧を表示する仕様かを明確化し、Platformと期待結果を経路別に分割する必要があ |

### 残操作の画面別集計

| 画面・Use Case | 残件 | ID別作業 |
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
| `SCREEN-TEST-CONTROL` | 5 | `SCREEN-TEST-CONTROL-A01-01` シナリオ選択、`SCREEN-TEST-CONTROL-A01-02` クロック操作、`SCREEN-TEST-CONTROL-A01-03` 決済遅延設定、`SCREEN-TEST-CONTROL-A01-04` シードリセット、`SCREEN-TEST-CONTROL-A02-01` テスト専用で本番対象外とする |
| `UC-CATALOG-LIST` | 1 | `UC-CATALOG-LIST-REVIEWS` 商品の公開レビューを一覧表示する |

### 非default状態3件

| 状態ID | 状態 | 残る確認 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | empty状態を表示・処理 | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし。catalog-pages.test.tsx:305-313も無CTAを明示的に期待。仕様と現実の不一致候補のためreview_requiredを維持。SUT修正・正式仕様変更・Issue作成は行わ |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | resume-notice状態を表示・処理 | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:153-160、metadata.ts:306-316とBASE_CLOCK、scenarios.ts:107-111/367-395、ui-ux-improvements.spec.ts:141-15 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | stale-cart状態を表示・処理 | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repository・WebのCheckoutLoadError、関連回帰テストを照合。Seedの未完了Stepと確認画面上の版不一致再現条件を混同しない |

## 基本分析以外に残る横断作業

- 全188操作/20状態の画面・BR/AC・公開UseCase・Role/状態の網羅監査、分析済み152件の証拠行/構成・UI→UseCase→Repository/Seed実値/Caseの品質チェック。
- Web PlaywrightのGuest/Customer/Staff・Cart/価格/数量/Version・配送先管理/注文・Checkout、失敗時/他者所有者/Session/全DB不変、画面のVisual/Keyboard/Focus/a11y/Traceの実Run。
- Android Native/SQLite端末の同経路、Maestro/再起動・永続化・Role/Owner/Checkout、Visual/a11yの実Run。
- #210製品側の既存候補：Web Cart複数明細の多重更新、Native Cart問題理由総称・複合Issue価格同意、invalidCart Seed guest初期値、既定住所Web多重送信、Native Variation 13+ UI/stock0/1個追加、Login/Signup raw messageKey、検索0件/会員特典/Guide・Legal/NotFound/Forbiddenとその他の仕様差。SUTは本PRで変更しない。
- #211教材・契約：M00〜M10/51目標の仕様・教材/演習/採点・Skill/評価/配布・提出/誤PASS拒否の照合、M02→M03固定Skill runtime、M04/M07/M10実モデル校正、M05〜M07実Playwright Run/Trace、M08本人Git操作、M09/M10 Private repoでのCI/Run/Check/Artifact/SHA証拠。
- 配布元`course:sync`全hash・22状態・M00〜M10実ロード、同期中断復旧/本人ファイル保護、JS/CSS/Secret・個人情報・第三者ライセンス/NOTICE監査。
- 最終同一HEAD Web/Mobile required CI、独立レビューと全差分整合。Mobile PR trigger復元はマージ準備。本人のPublic Template公開とPrivate 2core Codespaces受入は既存決定のマージ後。merge/公開/課金/Issue作成は明示指示があるまで禁止。

## 競合・検証

- 更新対象1件だけ旧status `review_required`から `analyzed`へ変更。その他207件はJSONオブジェクト比較で不変。必須分析欄/Requirement/3種Reviewed、集計152/188・17/20を確認。
- 正式仕様・Web/Native・Application/Repo・Seed・既存テストの静的照合。実Web/Android/CI・`node scripts/training/validate-supported-behaviors.mjs`・Vitestは今回未実行。
- 独立ブランチへexpected HEAD付き非force fast-forward、PR #199共通Plan/4本の定期実行/#210/#211へ書き込みなし。#199の台帳全体を置換せず、取り込みは最新ID単位三者比較が必要。
