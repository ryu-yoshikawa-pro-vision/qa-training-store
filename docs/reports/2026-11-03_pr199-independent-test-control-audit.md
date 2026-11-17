# PR #199 独立基本分析：Web Test Control 5操作

## 実施境界と結果

- 調査元 PR #199 HEAD `b671561a834998a58ef59c3047b7d47e76569c9c`、独立ブランチ `work/pr199-parallel-supporting-analysis-20261103`。今回の更新はTest Controlの5 IDに限定。
- **独立ブランチの操作157/188 analyzed（残31）、非default状態17/20 analyzed（残3）**。PR #199本体の121/188とは分ける。
- 正式仕様、Web UI、TestControlService、Web Test API、EAS/Expo環境変数、Seed・Clock/MockPaymentGateway、既存integration/component/contract/E2E Fixtureを静的照合し、各IDのRisk・Role/State/Data・C1〜Case採否と未受入を記録。
- 製品SUT/正式仕様/Seed/Reset/製品既存テスト、共通Plan、PR #199本体、#210/#211、定期実行4件には書き込まない。

## 今回の5 ID

| 操作ID | 結果 | 証拠・注意 |
| --- | --- | --- |
| `SCREEN-TEST-CONTROL-A01-01` シナリオ選択 | `analyzed` | UIのScenario選択は画面Stateだけ。確認Reset後にTestControlService.resetが30登録Scenarioを検査してDB/Session/Clock/Guest/Delayを置換。UIのみNotice/安全ルートhard reload |
| `SCREEN-TEST-CONTROL-A01-02` クロック操作 | `analyzed` | UI→setClock(iso/null)→appSettings→RuntimeClock。Date.parseが有効なら受理するため厳密ISO形式までは検証されない。Sale開始含む/終了含まない境界とReset復元をテスト条件化 |
| `SCREEN-TEST-CONTROL-A01-03` 決済遅延設定 | `analyzed` | 0〜30000ms整数→appSettings→MockPaymentGatewayが初回charge時Provider読取。Idempotency keyでキャッシュ済み試行は待機しない。500msのSeed初期設定 |
| `SCREEN-TEST-CONTROL-A01-04` シードリセット | `analyzed` | db.close→Dexie.delete→Session/Guest clear→Seed再構築→identity/Clock復旧。delete blocked時RESET_BLOCKED_BY_OPEN_PAGE。delete後Seed/Storage失敗のRollbackはコードから証明できない |
| `SCREEN-TEST-CONTROL-A02-01` テスト専用・本番対象外 | `analyzed` | active Admin+local/automationでUI可、明示production/public/previewではAPIなし。**BUILD_KIND未設定時はlocalへfallback**、Test API自体にはAdminの再認可がない。実公開成果物の検証が必要 |

## 製品の仕様・セキュリティ確認候補（#210で判断、変更しない）

1. **Build種別未設定時のlocal fallback**：`src/test-controls/test-api.web.ts:23-35`と`app.config.ts:10-20`は環境変数`EXPO_PUBLIC_BUILD_KIND`未指定を`local`にする。公開デプロイの設定漏れでWindow Test APIが許可され、IndexedDB/SessionのReset等を呼べるおそれがある。EAS `production-validation`は明示`production`であり、この設定を使った場合は制限される。現行ホストの実環境変数・Web成果物の実測は未確認。
2. **Test APIのUIとServiceの認可は別**：RouteGuardはactive Adminに限定するが、`window.__TEST_API__`自体の各APIは追加のRole検証をしない。既定のテスト用ビルドはブラウザ内のテストコードから呼ばれる前提。Buildをpublic/productionへ確実に限定できるかを最優先で実証する。
3. **Web Reset途中失敗**：`TestControlService.reset:73-98`はDexie.delete後にSeed/Identity/Clockを復元する。Delete成功後にSeed失敗/Storage失敗が起きても以前のデータへ原子的に戻す処理はない。実行時の復旧手順・失敗注入Caseの確認が必要（テストデータ専用環境で実施）。
4. **Clockの入力形式**：`new Date(iso)`でparseできれば受理する。厳密なISO UTC文字列を期待する教材/契約なら入力形式の要否を仕様判断。時刻境界はSale/Checkout/Orderに影響。
5. **Resetの状態初期値**：GUI Scenario selectはまだResetしない、Reset実行後にAdmin SessionがGuest/Customerへ切り替わる場合はログイン状態・安全ルートが変わる。E2Eでは1Context/1page、API Reset後にhard reloadが必要。
6. **テスト容易性文書の境界説明**：`docs/07_testability/testability_design.md:30`は「Automation Build限定」と表現するが、同文書:9-12と実装は`local`も許可する。実際の可否を合同で確認する。

## 残31操作のID別一覧

| No. | ID | 操作 | 次の確認 |
| ---: | --- | --- | --- |
| 1 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:60-74を照合。仕様の『配送先を選択』には登録済み必須・任意 |
| 2 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、CheckoutOrderUseCases.start:10 |
| 3 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens.tsx:684-791と住所欄反映、Dexie start |
| 4 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | 仕様/実装/Seed/Condition・Caseを個別照合する |
| 5 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.startOrResume:630-669、SQLite Nativ |
| 6 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Payment UI、regular-member/checkout |
| 7 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member/checkout-resume Seedを照合。Webの保 |
| 8 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735/878-939、CheckoutOrderUseCases |
| 9 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite checkoutSessionRepository、cart-ver |
| 10 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 11 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getCo |
| 12 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 13 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getCo |
| 14 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 15 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 16 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Nati |
| 17 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-processing/payment-declined See |
| 18 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.g |
| 19 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.g |
| 20 | `SCREEN-ADMIN-PRODUCTS-A01-01` | 商品一覧・公開状態 | 仕様/実装/Seed/Condition・Caseを個別照合する |
| 21 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkeyword変更時のみpage=1へ戻し、status/rank |
| 22 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | 仕様/実装/Seed/Condition・Caseを個別照合する |
| 23 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一覧にはRankとsort選択UIがない。Use Case/R |
| 24 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator/admin間のみ・自己/last-admin/withdr |
| 25 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | 仕様/実装/Seed/Condition・Caseを個別照合する |
| 26 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | 仕様/実装/Seed/Condition・Caseを個別照合する |
| 27 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | 仕様/実装/Seed/Condition・Caseを個別照合する |
| 28 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | 仕様/実装/Seed/Condition・Caseを個別照合する |
| 29 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review-user-pages.tsx:618-830、default |
| 30 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefault guest Seedを静的照合。主要RiskとC1〜C |
| 31 | `UC-CATALOG-LIST-REVIEWS` | 商品の公開レビューを一覧表示する | CatalogUseCases.listReviewsはレビュー問い合わせのpage>=1/pageSize=20を要求するが、customerGateway経路では空配列・total 0を返す。Web経路ではlistPublishedを利用。Nativeでレビュー一覧を表示する仕様かを明確化し、Platformと期待結果を経路別に分割す |

### 画面別残件

| 画面/Use Case | 件数 | 個別操作 |
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
| `UC-CATALOG-LIST` | 1 | `UC-CATALOG-LIST-REVIEWS` 商品の公開レビューを一覧表示する |

### 非default状態の残3件

| ID | 未受入 |
| --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし。catalog-pages.test.tsx:305-313も無CTAを明示的に期待。仕様と現実の不一致候補のためreview_requiredを維持。SUT修正・正式仕様変更・Issue作成は行わず、ユーザ |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:153-160、metadata.ts:306-316とBASE_CLOCK、scenarios.ts:107-111/367-395、ui-ux-improvements.spec.ts:141-155を照合。 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repository・WebのCheckoutLoadError、関連回帰テストを照合。Seedの未完了Stepと確認画面上の版不一致再現条件を混同しない |

## 操作・状態以外の横断タスク（31+3件に含めない）

- **分母/分析品質**：188操作・20非default状態の分母をscreen-catalog/BR/AC/公開UseCase・状態/Role/Platformから網羅監査。157操作の分析文面が正本行、UI→UseCase→Repository/Seed実値、Condition/Case採否に一致するか再監査。
- **Web/Android実Run**：Playwright/Web Role・DB/Session、Browser Context隔離、Test Control/Checkout/Cartのエラー・二重実行/Version、Native SQLite/契約/再起動/永続化/Visual/a11y/Trace・ログと前後snapshot。今回同一HEADの実Runはなし。
- **製品#210**：今回のBuild kind fallback/Window Test API・Reset途中失敗、既存のWeb Cart多重更新、Native Cart Issue表示/複合価格同意、配送先既定切替Web busy、Native Variation/Stock0/数量、Login/Signup raw messageKey、検索0件/Home特典/Guide/Legal/NotFound/Forbidden等の証拠と判断。PR #199の製品SUTは読み取り専用。
- **教材#211**：別担当の学習用契約/評価/実技/配布修正と同一HEAD最終受入。M00〜M10・51学習目標の演習・評価・Skill・ケース/採点、M02→M03 Skill runtime、M04/M07/M10 AI実モデル校正、M05〜M07 Playwright/Trace、M08本人Git操作、M09/M10 Private repoでRun/Check/Artifact/SHA照合。
- **配布と安全性**：`course:sync`の生成・全hash/22状態、M00〜M10実ロード、中断復旧・再同期/本人ファイル保護、JS/CSS・Secret/個人情報・第三者ライセンス/NOTICEの監査。
- **最終統合**：PR #199最新HEADへのID単位の三者比較、重複除外・分析結果の統合、最終HEAD Web/Mobile required CIとレビュー/証拠。Mobile PR trigger復元はmerge準備時、本人Public Template公開/Private 2core Codespacesは合意どおりmerge後。本人明示のmerge/公開/課金/Issue作成なし。

## 保存時の検証

- 対象5件の旧`review_required`、必須分析欄11件/Requirement/3種reviewed_against、他203件のオブジェクト不変、157/188操作/17/20状態を比較。
- 既存`tests/integration/seeds.test.ts:121-225`、`tests/component/review-user-pages.test.tsx:509-575`、`tests/contracts/test-api.test.ts:4-21`、`e2e/web/fixtures.ts:24-50`のテスト定義を参照。テストを実行したとは扱わない。
- `node scripts/training/validate-supported-behaviors.mjs`、Vitest、Playwright/Android、CI、公開Build成果物検証は今回未実行。GitHub上でcommit・SHA・行数を再確認する。
- 独立ブランチのexpected HEADを指定した非force更新のみ。PR #199本体・共通Plan・4本の定期実行・#210/#211に書込なし。取り込みは最新HEAD BlobでID単位三者比較、台帳JSON全上書きは禁止。
