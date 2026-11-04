# PR #199 非干渉の基本分析：Home導線3操作と残タスク詳細

調査基点: PR #199 HEAD `b671561a834998a58ef59c3047b7d47e76569c9c`。今回の独立ブランチは `work/pr199-parallel-supporting-analysis-20261103`。  
台帳: `training/ai-assisted-qa-course/coverage/supported-behaviors.json`。製品SUT/正式仕様・#199本体・共通Plan・定期実行設定・#210/#211には変更を加えていない。

## 今回の調査対象と結果

| 対象ID | 旧状態→新状態 | 静的証拠・独立未受入 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-HOME-A01-05` 会員ランク特典を案内 | `review_required`→`analyzed` | Web Homeの一般5000円/gold5%/platinum10%とpricing.tsを照合。Android Homeに同案内がなく製品適合と実表示は未判定 |
| `SCREEN-STOREFRONT-HOME-A02-01` ゲスト用の導線を提供 | `review_required`→`analyzed` | Web Hero→Login→Signup、Web guestの会員向けリンクはcustomer guard、Android Shell→Login→SignupとCart/商品/検索 |
| `SCREEN-STOREFRONT-HOME-A02-02` 顧客用の導線を提供 | `review_required`→`analyzed` | Web Hero/ShellのProfile・Orders・CartとAndroid ShellのHeader/BottomNav。staff・停止/退会の権限境界は実Run未受入 |

今回の3件は正式`storefront.md:9-39`、`roles-and-permissions.md:5-31`、Web `home-page.tsx:13-189`・`storefront-shell.tsx:65-175`、Android `native-screens.tsx:31-115`・`native-shell.tsx:99-195`、`pricing.ts:3-16/41-102`、`RouteGuard`、Web/Native Login→Signup、`default-dataset.ts:730-775`、`metadata.ts`、`scenarios.ts`の対応箇所を静的に照合。Role/State/Data・Risk・C1以降のテスト条件/Case採否と未受入を台帳の各IDに記録。

**基本分析の完了のみ**。Web/Android実Run・実価格/注文合計・Session/DB不変・アクセス権限の実検証・視覚/a11y・教材受入・最終CIは確認していない。

### 製品側適合・教材影響の確認候補（#210に勝手に修正しない）

- Web Homeには特典の直接表示とGuideリンクがある一方、Android Homeには会員特典・Guideリンクがない。正式仕様はWeb/Native共通のHome会員案内を要求するが、Native UI上の正しい範囲・正本画像・教材手順との整合を確認する。
- Web guestは/orders・/account/profileへ誘導するNavリンクを表示するが、顧客専用RouteGuardにより実利用はLogin Redirectとなる。Guestの直接利用を示すものではない。AndroidはHeaderからLogin、Login内部でSignupを選択できる。
- Web停止staffでは、権限拒否画面の/admin復帰LinkとRouteGuard active要件が競合する可能性が残る。動的到達性を確認するまで不具合確定しない（前回のBoundary分析レポートを参照）。

## 分析件数と保留範囲

| 正本 | 分析済み操作 | 操作の残 | 分析済み非default状態 | 状態の残 |
| --- | ---: | ---: | ---: | ---: |
| 今回の独立ブランチ | **138/188** | **50** | **17/20** | **3** |
| PR #199本体（今回確認したHEAD） | **121/188** | **67** | **17/20** | **3** |

**PR #199本体には今回の3件を含む独立成果17件が未反映。** 件数を足して本体完了と誤認しない。取り込み前に本体の最新HEAD・対象ID・Blob SHA・必要Caseを再照合して変更単位を統合し、JSON全体の無条件置換を避ける。

## 未分析50操作（ID別）

| No. | ID | 操作 | 状態 | 現在の不足・再開条件（台帳要約） |
| ---: | --- | --- | --- | --- |
| 1 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01` | 有効なバリエーションを選択 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 2 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-02` | カートに追加 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 3 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03` | 選択不能・在庫切れの追加を拒否 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 4 | `SCREEN-STOREFRONT-SEARCH-A01-03` | 検索ファセット | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 5 | `SCREEN-STOREFRONT-SEARCH-A02-02` | 条件見直し導線 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 6 | `SCREEN-AUTH-LOGIN-A02-01` | ログイン拒否理由の表示 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 7 | `SCREEN-AUTH-SIGNUP-A01-01` | 新規顧客登録 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 8 | `SCREEN-AUTH-SIGNUP-A02-01` | 入力バリデーション | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 9 | `SCREEN-AUTH-SIGNUP-A02-02` | 重複アカウント拒否 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 10 | `SCREEN-STOREFRONT-CART-A01-01` | ゲスト・顧客のカート明細 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 11 | `SCREEN-STOREFRONT-CART-A01-02` | 数量と合計金額 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 12 | `SCREEN-STOREFRONT-CART-A01-03` | 現在価格・問題の理由 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 13 | `SCREEN-STOREFRONT-CART-A02-01` | 商品状態を再検証 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 14 | `SCREEN-CHECKOUT-ADDRESSES-A01-04` | 既定の配送先に設定する | `review_required` | checkout-and-payment.md:25-39のSCREEN-CHECKOUT-ADDRESSESとSCREEN-CHECKOUT-ADDRESSを区別。Web addresses-page.tsx:135-165は「既定にする」からaccount.updateAdd |
| 15 | `SCREEN-CHECKOUT-ADDRESS-A01-01` | 注文配送先を選択 | `review_required` | Web checkout-order-pages.tsx:114-230とNative native-purchase-screens.tsx:712-850、CheckoutOrderUseCases.setAddress、正本checkout-and-payment.md:6 |
| 16 | `SCREEN-CHECKOUT-ADDRESS-A01-02` | 次の決済ステップに遷移 | `review_required` | checkout-and-payment.md:60-74、roles-and-permissions.md:7-22、Web checkout-order-pages.tsx:114-230、Native native-purchase-screens.tsx:661-850、 |
| 17 | `SCREEN-CHECKOUT-ADDRESS-A02-01` | セッション再開を通知 | `review_required` | checkout-and-payment.md:9-12,60-79、Web checkout-order-pages.tsx:115-155と保存済みSnapshot復元、one-time-notice.web.ts、Native native-purchase-screens |
| 18 | `SCREEN-CHECKOUT-ADDRESS-A02-02` | 古いセッションを通知 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 19 | `SCREEN-CHECKOUT-ADDRESS-A02-03` | セッション置換を通知 | `review_required` | checkout-and-payment.md:9-18,60-74、checkout-replaced Seed scenarios.ts:367-395のCart version2/旧Session version1、Dexie CheckoutRepository.star |
| 20 | `SCREEN-CHECKOUT-PAYMENT-A01-01` | 決済方法を選択 | `review_required` | checkout-and-payment.md:17-23,93-106、PAYMENT_METHODS(4種類)とCheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/Native Paym |
| 21 | `SCREEN-CHECKOUT-PAYMENT-A01-02` | 確認画面へ遷移 | `review_required` | checkout-and-payment.md:13-23,93-106、CheckoutOrderUseCases.getActive/setPayment、Dexie/SQLite setPayment、Web/NativeのPayment UIとregular-member |
| 22 | `SCREEN-CHECKOUT-PAYMENT-A02-01` | 不完全セッションを拒否 | `review_required` | checkout-and-payment.md:93-117、roles-and-permissions.md:1-25、Web checkout-order-pages.tsx:244-325、Native native-purchase-screens.tsx:684-735 |
| 23 | `SCREEN-CHECKOUT-PAYMENT-A02-02` | 古いカートバージョンを拒否 | `review_required` | checkout-and-payment.md:13-18,93-117、CheckoutOrderUseCases.getActive:138-161/setPayment/ assertSessionForMutation:575-608, Dexie/SQLite chec |
| 24 | `SCREEN-CHECKOUT-CONFIRM-A01-01` | 最終注文内容を確認 | `review_required` | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexi |
| 25 | `SCREEN-CHECKOUT-CONFIRM-A01-02` | 配送先を確認 | `review_required` | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite  |
| 26 | `SCREEN-CHECKOUT-CONFIRM-A01-03` | 価格を確認 | `review_required` | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexi |
| 27 | `SCREEN-CHECKOUT-CONFIRM-A01-04` | 決済方法を確認 | `review_required` | checkout-and-payment.md:123-139・BR/AC、CheckoutOrderUseCases.getConfirmation:184-191、Dexie CheckoutRepository.getConfirmation:723-808、SQLite  |
| 28 | `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いカートを拒否 | `review_required` | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexi |
| 29 | `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格不一致を拒否 | `review_required` | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexi |
| 30 | `SCREEN-CHECKOUT-CONFIRM-A02-03` | 修正導線を表示 | `review_required` | 正本checkout-and-payment.md:9-22,120-153,BR-CHECKOUT-002/AC-CHECKOUT-002、CheckoutOrderUseCases.getConfirmation:184-191/beginOrder:193-316、Dexi |
| 31 | `SCREEN-CHECKOUT-COMPLETE-A01-01` | 決済完了を表示 | `review_required` | checkout-and-payment.md のBR-CHECKOUT-003、AC-CHECKOUT-003、決済処理中/完了/失敗の画面仕様とUse Case→決済Repository・Gateway・状態判定→Web/Native UI、default/payment-p |
| 32 | `SCREEN-CHECKOUT-COMPLETE-A01-02` | 注文番号を表示 | `review_required` | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701 |
| 33 | `SCREEN-CHECKOUT-COMPLETE-A01-03` | 注文履歴へ遷移 | `review_required` | checkout-and-payment.md BR-CHECKOUT-003/AC-CHECKOUT-003/SCREEN-CHECKOUT-COMPLETE、default-dataset.ts:401-475のpaid注文（order-paid / ORD-20260701 |
| 34 | `SCREEN-ADMIN-PRODUCTS-A01-01` | 商品一覧・公開状態 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 35 | `SCREEN-ADMIN-PRODUCTS-A01-02` | フィルター | `review_required` | 正式BR-ADMINCAT-001/002・AC-ADMINCAT-001/002、Web filter/selection→search/bulkChangeStatus→Dexie、default11商品/many-products1000件とRoleを静的照合。UIはkey |
| 36 | `SCREEN-ADMIN-INVENTORIES-A02-02` | 競合更新を拒否 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 37 | `SCREEN-ADMIN-USERS-A01-02` | ユーザーの絞り込み | `review_required` | review_required：主仕様admin-users.mdは絞り込み条件の内訳を固定しないが、補助UI仕様docs/05_ui/ui_specifications.md:169-170,174-183はRole/Rank/Statusと登録日/更新日ソートを要求。Web一 |
| 38 | `SCREEN-ADMIN-USER-DETAIL-A01-02` | ロール変更 | `review_required` | 基本分析継続（review_required）。正式BR-ADMINUSER-001/AC-ADMINUSER-001（admin-users.md:9-25,43-79）とroles-and-permissions.md:5-24のactive admin専用・operator |
| 39 | `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員ランク変更 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 40 | `SCREEN-ADMIN-USER-DETAIL-A01-04` | 状態変更 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 41 | `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自己権限破壊を拒否 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 42 | `SCREEN-ADMIN-USER-DETAIL-A02-02` | 退会済の変更を拒否 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 43 | `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最終管理者の変更を拒否 | `review_required` | admin-users.md:7-15/49-51/78-84、roles-and-permissions.md:5-23、review-user-use-cases.ts:567-635/708-715、basic-repositories.ts:108-112、review- |
| 44 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | アクセス権限不足を示す | `review_required` | 正式roles-and-permissions.md:35-57、screen-catalog.md、RouteGuard:16-55、Web StatePanel/forbidden route、NativeUnsupportedScreen/NativeShellとdefau |
| 45 | `SCREEN-TEST-CONTROL-A01-01` | シナリオ選択 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 46 | `SCREEN-TEST-CONTROL-A01-02` | クロック操作 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 47 | `SCREEN-TEST-CONTROL-A01-03` | 決済遅延設定 | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 48 | `SCREEN-TEST-CONTROL-A01-04` | シードリセット | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 49 | `SCREEN-TEST-CONTROL-A02-01` | テスト専用で本番対象外とする | `review_required` | 仕様・実装・Seed/Caseの具体照合が未記載 |
| 50 | `UC-CATALOG-LIST-REVIEWS` | 商品の公開レビューを一覧表示する | `review_required` | CatalogUseCases.listReviewsはレビュー問い合わせのpage>=1/pageSize=20を要求するが、customerGateway経路では空配列・total 0を返す。Web経路ではlistPublishedを利用。Nativeでレビュー一覧を表示する |

## 未分析非default状態3件

| ID | 状態 | 現在の不足・再開条件（台帳要約） |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | empty状態を表示・処理 | storefront.md:68-74では『表示可能な商品がない理由と元の画面に戻る導線』が必須。一方CatalogListContent:282-288/502-525ではunfiltered /productsの0件はStatePanel action=nullで戻り導線なし |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | resume-notice状態を表示・処理 | 正式画面checkout-and-payment.md:59-73、Role:5-23、CheckoutOrderUseCases.start:108-138、CheckoutAddressContent:118-146/178-182、claimCheckoutNotice:1 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | stale-cart状態を表示・処理 | checkout-and-payment.md:126-153のstale-cart画面契約、checkoutScenario(dataset,true):367-395の旧Cart/Session差、getConfirmation/UseCase・Web/Native Repo |

## 画面別の残操作と次の具体作業

| 画面/Use Case | 残件 | 次の対応 |
| --- | ---: | --- |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL` | 3 | 商品バリエーション選択・カート追加・在庫/無効SKU拒否。Web/Native表示からCartUseCase→Repositoryとstock/quantity/rankの境界を確認 |
| `SCREEN-STOREFRONT-SEARCH` | 2 | 検索ファセット/条件変更導線。検索UseCase、Web/Nativeパラメータ、同一/異なるファセットの論理を確認 |
| `SCREEN-AUTH-LOGIN` | 1 | ログイン拒否の表示・状態不変・Session/Cart副作用と認証エラー契約を確認 |
| `SCREEN-AUTH-SIGNUP` | 3 | 登録・入力検証・重複拒否を画面→AuthUseCase→Repository・Seedと照合 |
| `SCREEN-STOREFRONT-CART` | 4 | Cart明細/数量/価格/商品再検証。guest/user所有者・version・invalid itemとDexie/SQLiteを確認 |
| `SCREEN-CHECKOUT-ADDRESSES` | 1 | 既定住所の更新・所有者/排他/Session競合を確認 |
| `SCREEN-CHECKOUT-ADDRESS` | 5 | 配送先選択・Payment遷移と再開/stale/置換のCheckoutSession境界を確認 |
| `SCREEN-CHECKOUT-PAYMENT` | 4 | 決済方法・確認画面遷移、未完了/古いCart version拒否を確認 |
| `SCREEN-CHECKOUT-CONFIRM` | 7 | 注文内容・配送先・価格/割引/送料・決済表示と古いCart/差額拒否/修正導線を確認 |
| `SCREEN-CHECKOUT-COMPLETE` | 3 | 注文結果・注文番号・履歴導線と所有者/完了条件/注文データを確認 |
| `SCREEN-ADMIN-PRODUCTS` | 2 | 商品管理一覧・公開状態/フィルターとstaff権限、Repository条件を確認 |
| `SCREEN-ADMIN-INVENTORIES` | 1 | version CAS・在庫競合拒否と記録整合を確認 |
| `SCREEN-ADMIN-USERS` | 1 | 管理ユーザー検索/フィルターのRole/Rank/Status/並べ替え・ページ状態を確認 |
| `SCREEN-ADMIN-USER-DETAIL` | 6 | Role/Rank/Status変更と自己/最終admin/退会保護・Session失効・CASを確認（定期実行が現在対象、手を出さない） |
| `SCREEN-BOUNDARY-FORBIDDEN` | 1 | 権限拒否本文・staff停止Session循環とWeb/Native RouteGuard・DB不変の実検証が必要 |
| `SCREEN-TEST-CONTROL` | 5 | Automation WebだけでのScenario/Clock/Delay/Reset・本番拒否・Seed/Sessionデータ完全性を確認 |
| `UC-CATALOG-LIST` | 1 | 公開レビュー一覧のUse Case/Repository・viewer/削除/非公開/ページ境界を確認 |

## 基本分析とは別に残る横断受入

- 操作188件・非default状態20件について分母の全件監査（screen catalog/BR/AC/Use Case公開メソッド・UI状態の網羅、重複・欠落・独立条件）。**188/20は最終確定値ではない**。
- 各`analyzed` IDの証拠品質再監査（実参照行・Role/State/Data・UI→Use Case→Repository、Seed実値、C1以降と採否）。validatorの形式検査だけで内容まで証明した扱いにしない。
- 実Web PlaywrightとNative Androidの画面・Role・データ前後・視覚・アクセシビリティ実Run。実機・環境条件がない部分は未受入のまま記録。
- #210: 製品側の仕様適合候補（Home Native会員案内、Guide/Legal Native差、Not Found/Forbidden Native文言、Web停止staff復帰候補等）の証拠と判断。#199の製品本体・正式仕様を変更しない。
- #211: 学習用契約テスト・実技/評価/配布源の検証は独立担当。受入完了かはそのbranchの同一最終HEADで判定。#199のSUTと教材/AI評価を混同しない。
- 教材M00〜M10/51目標の内容・演習・採点・Skillの一致と実モデルの校正、自己判断/再提出/失敗・異常系の実経路。
- M05〜M07 Playwright実Run/Trace、M08本人Git実操作、M09/M10本人Private repoのCI/Run/Check/Artifact/SHA照合、M02→M03 Skill runtime固定、M04/M07/M10 AI評価実モデル校正。
- 配布元`course:sync`実生成・hash・中断復帰/再同期・全22状態・M00〜M10実ロード・本人ファイル保護・JS/CSS/Secret/個人情報・外部第三者ライセンス/NOTICEの監査。
- 最終HEADのWeb/Mobile required CI・レビュー・全受入。Mobile PRトリガー復元はマージ準備時の作業。Public Template本人公開/B3 Private2core Codespaces本人実受入はマージ後に分離済み。本人の明示指示なしにmerge/公開/課金/Issue追加をしない。

## 実施した検証と未実施検証

- 変更対象3 IDの旧status、正式仕様・各UI/共通Shell/価格定数/Seedを静的照合。
- 3 IDとも`completeAnalysis`の必須文字列/requirement_refs/3種`reviewed_against`を満たすこと、分析件数138/188・17/20、未分析50+3件、JSONの元書式維持を計算で確認。
- `node scripts/training/validate-supported-behaviors.mjs`、Vitest、Playwright、Android実機、CIは今回未実行。静的照合・件数算定は実テストの代替ではない。

## 非干渉・取り込みの注意

定期実行4本（毎時00/15/30/45分）はPR #199上で共通逐次作業を更新する。今回のBranchはPR #199のHEADとは別で、共通Plan・定期実行中のUser Detail・別担当契約テスト/製品SUTに触れていない。独立Branchの台帳は大容量1ファイルのため、**ブランチ分離だけでは後日の競合を消せない**。最新PR #199台帳とのID単位の三者比較を必須とし、差分が重なったら推測で採用しない。競合/同時更新時は対象ファイルの書込みを止める。

次回はこのレポートの未分析IDから定期実行の現在対象と重ならない1件を選び、上記の不足条件の証拠を確認して処理する。
