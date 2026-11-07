# PR #199 非干渉の基本分析：Cart 4操作と全残タスク

## 対象と結果

- PR #199作業開始時 HEAD: `b671561a834998a58ef59c3047b7d47e76569c9c`。今回の反映先は独立ブランチ `work/pr199-parallel-supporting-analysis-20261103` のみ。
- 作業開始時独立ブランチ操作 147/188・非default状態17/20、今回の静的分析完了 +4、作業後は **151/188操作・残37件、17/20状態・残3件**。
- 編集した台帳: `training/ai-assisted-qa-course/coverage/supported-behaviors.json` 内、Cartの4 IDだけ。製品SUT、正式仕様、Seed/Reset、既存製品テスト、共有Plan、#199本体、#210/#211、定期実行には書き込みなし。
- 完了判定は正式仕様、Web/Android画面、CartUseCases→Dexie/Native SQLite Repository、Checkout Start、固定Seedと既存テストを照合した**基本静的分析のみ**。実画面、データ前後、Visual/a11y、CI・教材受入・製品適合は未実施/未受入。

| ID | 基本分析 | 照合した動作 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-CART-A01-01` | `analyzed` | Guestと本人customerだけのCart/Empty、Default既存regular Cart、空Cartを初回getCartで作る副作用。invalid-cart SeedはGuest初期Sessionのためregularにログインする前提 |
| `SCREEN-STOREFRONT-CART-A01-02` | `analyzed` | 数量上限min(stock,purchaseLimit,99)、現在価格・rank割引floor/送料無料・Versionと合計DTO、Web/Nativeの数量変更/UI表示差 |
| `SCREEN-STOREFRONT-CART-A01-03` | `analyzed` | 6種Issue、追加時/現在/会員価格、Webの原因別表示とNativeの総称表示、価格承諾・複合問題/Checkout拒否 |
| `SCREEN-STOREFRONT-CART-A02-01` | `analyzed` | Cart GET→最新商品状態/価格Issue→数量/削除/価格同意→Checkout StartでCartVersion/BlockingIssues再検証すること |

### 主要な証拠

- `docs/spec/features/cart.md:7-23,25-86`、`docs/spec/features/checkout-and-payment.md:9-23`
- `src/presentation/pages/cart-page.tsx:13-278`、`src/presentation/native/native-screens.tsx:780-966`
- `src/application/use-cases/cart-use-cases.ts:82-238,240-268`、`src/application/use-cases/checkout-order-use-cases.ts:108-139`
- `src/infrastructure/database/dexie/cart-checkout-repositories.ts:277-307,437-529`、`src/infrastructure/database/sqlite/native-customer-application-repositories.ts:1287-1423,1566-1649`
- `src/domain/services/pricing.ts:3-16,41-103`、`src/domain/services/cart.ts:3-27`
- `src/seeds/default-dataset.ts:683-796`、`src/seeds/scenarios.ts:20-75,259-284`、`src/seeds/metadata.ts:75-128,207-217,295-305`
- `tests/integration/cart-use-cases.test.ts:146-248`、`tests/component/cart-page.test.tsx:69-116`、`tests/component/native/native-cart-screen.test.tsx:73-198`。テスト定義を静的参照しただけで実行PASSではない。

### 製品側に残す問題候補（#210で判断、今回は変更しない）

1. **Webの同一Cart多重更新抑止の欠落候補**：正式仕様cart.md:23は同一Cart更新の二重実行を禁止。CartPage:34,41-58で`processingItem`は単一item IDだが、CartPage:184/209のdisabledは同じ明細のみ。別明細Bは明細A処理中も操作でき、価格承諾ボタンも`processingItem==="price-change"`のときしかbusyを見ない。NativeCartScreen:850-902は`busy!==null`で全数量/削除をdisabled。Web側の二重実行・Version競合・state解除競合を実ブラウザで再現して必要な修正を#210へ。
2. **Nativeの問題原因表示不足**：NativeCartScreen:912-925はIssueが1個以上なら一律「購入前に確認が必要な商品です。」。正式Cart契約cart.md:23,31-32は問題の理由と修正/削除を要求。Web CartPage:13-20,172-177は6種類を日本語で説明。Nativeの個別理由表示と復旧ガイドを製品適合検証。
3. **Nativeの複合Issueと価格同意ボタン**：NativeCartScreen:938-957ではPRICE_CHANGEDだけで「最新価格を反映」を有効にする。PRICE_CHANGEDとUNPUBLISHED/INACTIVE等が併存してもUI操作可。Repository acceptPriceChangesAndTouchCart:1378-1423はassertPurchasableで拒否するため、操作はエラーになる見込み。Web CartPage:95-143は非価格Blocking Issueがあると同意disabled。NativeのUIガード/文言・Internal Error.message表示を検証。
4. **Cart invalid Seedのシナリオ初期Session**：metadata.ts:207-217では`cart-with-invalid-items`の`initialSession: guest`、scenarios.ts:259-284はactive regular user Cartへ問題明細4行を置く。Seed Reset直後のGuest /cartは当該4明細を直接見せない。integration cart-use-cases.test.ts:218-235でも明示的にregular customer Sessionを作ってから確認。教材/Visualを含むテスト前提をログイン付きで確定するか、#210で仕様適合判断を要する。
5. **Native表示価格の粒度**：Webは追加時価格/現在価格/会員価格・明細小計・総割引を表示。Nativeは現行会員単価と商品小計/送料/合計が中心。正式UIが要求する価格/問題理由の開示範囲とAndroid画面正本との一致を要判定。

これらは静的な不一致または問題候補。Web/Native実Run・不具合確定・製品コード変更は行っていない。

## 未分析37操作

| No. | ID | 操作 | 現在の不足条件（台帳要約） |
| ---: | --- | --- | --- |
| 1 | `SCREEN-CHECKOUT-ADDRESSES-A01-04` | 既定の配送先に設定する | checkout-and-payment.md:25-39のSCREEN-CHECKOUT-ADDRESSESとSCREEN-CHECKOUT-ADDRESSを区別。Web addresses-page.tsx:135-165は「既定にする」からaccount.updateAddressを呼び、Native native-purchase-screens.t |
| 2 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:60-74を照合。仕様の『配送先を選択』には登録済み必須・任意住所入力可否の明示が |
| 3 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、CheckoutOrderUseCases.start:108-139/setA |
| 4 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens.tsx:684-791と住所欄反映、Dexie startOrResume:6 |
| 5 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 6 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.startOrResume:630-669、SQLite NativeCheckoutR |
| 7 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Payment UI、regular-member/checkout-resume Se |
| 8 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member/checkout-resume Seedを照合。Webの保存失敗未処理を修正し |
| 9 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735/878-939、CheckoutOrderUseCases.getActive |
| 10 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite checkoutSessionRepository、cart-version-inval |
| 11 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite: |
| 12 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirmation |
| 13 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite: |
| 14 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite NativeCheckoutRepository.getConfirmation |
| 15 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite: |
| 16 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite: |
| 17 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexie getConfirmation:723-808、Native SQLite: |
| 18 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-processing/payment-declined Seed（guest初期状 |
| 19 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyOrder: |
| 20 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701-0002）、CheckoutOrderUseCases.getMyOrder: |
| 21 | `SCREEN-ADMIN-PRODUCTS-A01-01` | 商品一覧・公開状態 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 22 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkeyword変更時のみpage=1へ戻し、status/rank/stock/価格/ |
| 23 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 24 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一覧にはRankとsort選択UIがない。Use Case/Repositoryは |
| 25 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator/admin間のみ・自己/last-admin/withdrawn拒否を確認。A |
| 26 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 27 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 28 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 29 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 30 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review-user-pages.tsx:618-830、default-dataset.t |
| 31 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefault guest Seedを静的照合。主要RiskとC1〜C6は既存台帳にある。 |
| 32 | `SCREEN-TEST-CONTROL-A01-01` | シナリオ選択 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 33 | `SCREEN-TEST-CONTROL-A01-02` | クロック操作 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 34 | `SCREEN-TEST-CONTROL-A01-03` | 決済遅延設定 | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 35 | `SCREEN-TEST-CONTROL-A01-04` | シードリセット | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 36 | `SCREEN-TEST-CONTROL-A02-01` | テスト専用で本番対象外とする | 仕様/実装/Seed/Caseの個別根拠が不足 |
| 37 | `UC-CATALOG-LIST-REVIEWS` | 商品の公開レビューを一覧表示する | CatalogUseCases.listReviewsはレビュー問い合わせのpage>=1/pageSize=20を要求するが、customerGateway経路では空配列・total 0を返す。Web経路ではlistPublishedを利用。Nativeでレビュー一覧を表示する仕様かを明確化し、Platformと期待結果を経路別に分割する必要がある。 |

### 画面別に整理した残件

| 画面・Use Case | 残件 | 対象操作 |
| --- | ---: | --- |
| `SCREEN-CHECKOUT-ADDRESSES` | 1 | `SCREEN-CHECKOUT-ADDRESSES-A01-04` 既定の配送先に設定する |
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

| 状態ID | 操作 | 残る理由 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | empty状態を表示・処理 | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし。catalog-pages.test.tsx:305-313も無CTAを明示的に期待。仕様と現実の不一致候補のためre |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | resume-notice状態を表示・処理 | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:153-160、metadata.ts:306-316とBASE_CLOCK、scenarios.ts:107-111/3 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | stale-cart状態を表示・処理 | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repository・WebのCheckoutLoadError、関連回帰テストを照合。Seedの未完了Stepと確認画面上の版 |

## 基本分析と別に残る受入条件

- **分母と基本分析品質**：188操作/20状態の完全性、screen-catalog/BR/AC/公開Use Caseの欠落・重複、既存`analyzed`すべての証拠品質、Role/State/Data、UI→UseCase→RepositoryとSeedの実値、Case選定・未受入の監査。独立ブランチの操作151件をPR #199本体の進捗へ加算しない。
- **Web実動作**：PlaywrightでRole、Guest/Customer/Staff、空Cart/Cart更新/価格/送料/上限/Owner/競合、現在価格同意、Checkout拒否、戻り導線、DB・Session/Checkout前後、Trace/スクリーンショット/視覚/a11yの証拠。
- **Android実動作**：NativeとSQLiteのCart表示・Cart統合・数量/上限・Price/Blocking Issue・Checkout Step、再起動/永続化/ユーザー切替、Maestro/端末スクリーンショット、状態前後。
- **#210製品適合**：Cart Web同一Cart多重更新、Native個別Issue理由・複合価格同意ボタン、無効Cart Seed初期前提、Native価格表示、既存のNative Variation UI/Stock0/追加数量、Native Login/Signupの生MessageKey、Native検索0件、Home特典/Guide/Legal/NotFound/Forbidden、その他の製品側候補の実証・修正。#199でSUTを編集しない。
- **#211教材/実技**：学習用契約テスト、AI評価・Skill・実技・配布元の同一HEAD受入と別担当作業。今回別担当のPR/ブランチを操作しない。
- **教材M00〜M10・51目標**：各目標とScreen/BR/AC/Case・教材/演習/採点/正誤判定、Role別・異常/再提出/途中中断、M02→M03固定Skill runtime、M04/M07/M10実モデル校正/誤PASS拒否。
- **実技受入**：M05〜M07 Playwright Run/Trace、M08本人Git操作、M09/M10本人Private repo/CI Run/Check/Artifact/SHA独立照合。
- **配布/セキュリティ**：`course:sync`生成・全hash・全22状態・M00〜M10実ロード、同期/中断復旧・ファイル保護、実JS/CSS/Secret・個人情報・第三者ライセンス/NOTICEとライブラリ依存の審査。
- **最終PR受入**：最終同一HEADのWeb/Mobile required CI/成果物・独立レビュー・差分照合。Mobile PR trigger復元はマージ準備時。本人のPublic Template公開/Private 2core Codespacesの実受入は合意済みのマージ後。明示指示なしでmerge/公開/課金/新Issueは行わない。

## 検証と非干渉

- PR #199と独立ブランチのHEAD/台帳SHAを作業開始時取得。対象4件だけ旧`review_required`から新`analyzed`へ変更、非対象204 IDはJSON構造比較で不変。
- 変更した4件の必須文字列、requirement_refs、3種`reviewed_against`、分析件数151/188・17/20をJSで確認した。
- `node scripts/training/validate-supported-behaviors.mjs`・Vitest・Playwright・Android実機・CIは今回未実行。構造検査や参照テスト定義は同一HEADでの合否の根拠ではない。
- GitHub保存は独立ブランチのexpected HEADを指定した非force更新。PR #199、4本の定期実行、共通Plan、SUT、#210/#211へ書込なし。
- PR #199本体へ安全に取り込むには最新HEAD/BlobとID単位の三者比較が必要。JSON台帳全体の無条件上書きは禁止。
