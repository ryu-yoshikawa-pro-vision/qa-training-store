# 新規AI協働テスト自動化カリキュラム構築Plan

## 継続受入タスク台帳（2026-10-31確認、証拠を優先して更新）

| 優先 | 対象・具体作業 | 状態 | 完了条件・証拠/ブロッカー | 次の対応 |
| --- | --- | --- | --- | --- |
| P0 | 学習用契約CIの台帳同期・Prettier | **旧HEADの失敗原因修正済み／新HEAD検証待ち** | [Web CI 41162762603](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41162762603)で `out-of-stock` の旧 `review_required` Assertionと台帳の `analyzed` が衝突（34件中1件失敗）。[修正commit 78d98df](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/78d98df6e29e41711d6fa683740e40d45545debb)では状態の証拠と親操作の未分析を個別にAssert。Style Qualityは学習用contractと製品Nativeの2ファイルで失敗 | 新HEADでVitest・Prettierを実ログ検証し、学習用書式のみ再修正。製品Nativeは触らない |
| P0 | 製品Native書式によるWeb CI阻害 | BLOCKED（製品変更承認待ち） | [Web CI 41161207133](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41161207133)のStyle Qualityログで`src/presentation/native/native-purchase-screens.tsx`のみPrettier失敗。SUT変更禁止のため未修正 | 製品変更の承認がない限り編集せず、原因と影響を報告 |
| P1 | 非default状態の個別基本分析 | 進行中 | **18/20レビュー済み・残り2**。未確認は商品一覧empty、管理在庫stock-boundaries。商品詳細out-of-stockは既存単一SKU在庫0の商品で静的基本分析済み（実地受入は別）。状態別実ブラウザ/視覚受入は別条件 | 商品一覧emptyと管理在庫stock-boundariesの仕様差を整理し、商品詳細out-of-stockの実ブラウザ・視覚受入を別途実施 |
| P1 | 全サポート操作の漏れ・重複と基本分析 | 進行中 | **54/188操作分析済み・残り134**、188は暫定分母。正式BR/AC、Role/Platform/State、Use Case→Repository→UI、Seed実値、証拠の一致が必要 | 未分析操作をリスク順に個別監査、分母再検証 |
| P1 | 実Template→本人Private repo→2-core Codespaces | BLOCKED（作成先・公開範囲・支払主体の確認待ち） | 実Templateの公開、許可リスト・秘匿確認、本人所有のPrivate repo、2-coreでload/Serve/Reset/Playwright証拠が必要。fixtureの契約成功は代替不可 | 外部作成の明示承認まで公開・課金を伴う操作を行わない |
| P1 | OpenCode実モデル正式評価校正 | 検証待ち | 実モデルの正/誤/誤PASS拒否・証拠欠落・再評価、保存・モデルID・実Run証拠が必要 | 実接続と評価結果の保存/校正を検証。実行不可はBLOCKED記録 |
| P1 | M00〜M10教材・実践・正式評価・Skill連携 | 進行中・実地受入待ち | [評価Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)と[配布Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)の全マージ前条件。過去の自動/契約PASSを維持し、実地未実施を区別 | 51目標/11モジュールの証拠・演習/評価/配布・非回帰を精査 |
| P2 | 過去PR混在製品差分・製品不整合候補 | 進行中（修正は禁止） | [調査レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)の既存製品実装9/正式仕様1/製品テスト9パス一次仕分け、商品一覧empty/在庫分類/ページング/out-of-stock等の未決候補。承認なくrevert/Issue化しない | 再現条件・重大度・教材影響・修正要否を記録し判断を提案 |

**状態の意味**：分析済みは静的な証拠付き基本分析であり、実行E2E・Native・視覚・Template・正式AI評価のPASSを意味しない。CIの偶発障害、学習用修正可能項目、製品承認待ち、外部サービス受入は別に扱う。履歴はGit commitと本Planの既存節、個別証拠は[分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)に保持する。ユーザー承認のない製品改修・merge/force push/branch削除/Issue・PR close/release/tagは禁止。

## 2026-10-31 商品詳細out-of-stockの単一SKU固定Seed再利用（SUT変更なし）

- 既存`out-of-stock` SeedのTシャツMだけ0化する状態に加え、default datasetに`product-out-of-stock`（publishedスポーツボトル、単一SKU在庫0）があることを確認。`/products/product-out-of-stock`でWebの「在庫切れ」・数量/追加disabledを静的に照合し、TシャツS20/M0/L0の初期選択差を対照Caseにする。製品Seed/製品コードの追加・変更なし。
- `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock`を根拠付き`analyzed`に更新。**基本操作54/188（残り134）、状態条件18/20（残り2）**。親`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`はCart不変・拒否の実行受入が残るため未分析維持。実ブラウザ・Web desktop視覚正本・実カート不変性は未受入。
- Web CI 41161207133は学習用contracts PASS、Style Qualityは変更禁止のNative製品画面のみPrettier失敗。新HEADのCIは別途確認。詳細は[調査レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)。

## 2026-10-31 注文一覧の状態別3動作を基本分析（製品変更なし）

- `SCREEN-ORDERS-LIST-A02-01`、`A02-02`、`A02-03`を正式`orders.md`、本人認可、`listMyOrders`、Dexie/SQLite、Web/Native、`orders-empty`/`payment-processing`/`payment-declined` Seedとdefaultで証拠付き監査。分析台帳・専用契約テスト・レポートを更新。**基本分析54/188件（28.72%、未分析134件）、状態別条件15/20件（未分析5件）**。
- Web一覧は状態の日本語ラベル、Native一覧は内部状態値の直接表示。Nativeでの表現の妥当性は未決であり製品は修正しない。支払い/配送/タイムラインを一覧で示す契約（`SCREEN-ORDERS-LIST-A01-02`）も未分析を維持。
- 実ブラウザ・Native実機・正本画面比較、公開Template/Private 2-core Codespaces/OpenCode実モデル校正は未受入。過去のSUT混在差分は保持し、今後もPRの作業境界に従う。

## 2026-10-31 注文詳細の本人境界・Snapshot・レビュー可否（SUT変更なし）

- `SCREEN-ORDERS-DETAIL-A01-03`/`A02-01`/`A02-02`を仕様・Use Case→Dexie/SQLite→Web/Android・default/reviewable-orders Seedから照合して分析台帳/専用契約テスト/調査レポートに記録。**基本分析51/188（27.13%、残り137）、状態条件15/20（残り5）**。
- Web注文詳細の建物名/電話/会員ランク表示とNativeのタイムライン・編集導線の差は未決事項として記録。`SCREEN-ORDERS-DETAIL-A01-01`/`A01-02`は未分析を維持。商品マスタ後日変更によるSnapshot不変の実行受入も未確認。
- SUTコード・正式仕様・既存Seed/Reset・製品用テストには触れず、前HEADとの分析台帳の競合は新HEADへ統合した。実機・正本画像比較、公開Template/Private 2-core Codespaces/OpenCode校正の受入は継続。

## 2026-10-31 Cart invalid-items分析と管理在庫ステータス差分（SUT変更なし）

- `SCREEN-STOREFRONT-CART-S-invalid-items`を正式BR/AC、固定Seedのregular所有4明細、Use Case→Dexie→Web、既存E2Eのログイン前提から分析。初期guestでは空Cart。状態条件15/20（残り5）、基本分析48/188（残り140）。実ブラウザ/視覚正本は未受入。
- `SCREEN-ADMIN-INVENTORIES-S-stock-boundaries`はSKU状態の仕様分類とWeb有効/無効Badge、Repositoryのavailable>=1/low=1..5重複を不整合候補として記録し、未分析維持。製品変更/Issue化は承認待ち。詳細は[分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)。
- CIと公開Template→Private 2-core Codespaces/OpenCode実モデル校正は未受入。学習用台帳/契約/レポート/Plan以外を変更しない。


## 2026-10-31 決済再開と本人注文一覧・CIの確認（製品変更なし）

- `SCREEN-CHECKOUT-PROCESSING-A01-02`と`SCREEN-ORDERS-LIST-A01-01`の本人認証・Seedの初期guest・Use Case→Repository→Web/Android表示・同じorderIdの再開を監査して台帳/契約テスト/調査レポートを更新。製品コード・正式仕様・Seed・製品用テストは変更しない。
- 前HEAD Web CI 41144863754の契約テスト失敗は状態別未レビューの期待値8に対する実値6。学習用契約の期待値を更新。Style Qualityでは学習用契約と製品NativeにPrettier違反が残り、後者は修正禁止。両者とも最新HEADでのPASSは未確認。前HEAD Mobile CI 41144863940は成功。
- **基本分析48/188（25.53%、残り140）、状態別条件14/20（残り6）**。188件は暫定。Processing再試行/キャンセルと注文一覧の支払い・配送・タイムライン表示の未決差分、既存PRの製品差分仕分け、公開Template/Private 2-core Codespaces/OpenCode実モデル校正は継続対象。

## 2026-10-31 既存PRのSUT混在差分・一次分類

- base→HEADのPR変更290ファイル中、製品実装9・正式仕様1・既存製品テスト9・製品workflow 0をAPIの変更ファイル一覧から抽出。詳細な19パスは[全機能分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)に記録。既存混在差分は保持し、個別の必要性/履歴/分離可否を次回以降に監査。追加の製品変更、revert、別PRは承認まで実施しない。


## 2026-10-31 Signup検証・公開レビュー編集の状態監査（SUT変更なし）

- `SCREEN-AUTH-SIGNUP-S-validation-error`と`SCREEN-REVIEWS-EDITOR-S-published`を正式BR/AC→Web UI→Use Case→Dexie/Seed実値と既存テストで照合し、状態別条件のみ分析済みに変更。**基本分析46/188（残り142）、状態条件14/20（残り6）。** 親操作は未分析、188件は暫定分母。
- Signupの未入力/不正/未同意は登録Use Caseへ到達しない。レビューは本人配達済みの既存publishedと未投稿/削除を区別し、expectedVersionを確認。既存製品・正式仕様・Seed・製品テストは変更せず、実ブラウザ/Native正本は未受入。
- 前HEAD Web CI 41138483817はStyle Quality失敗（製品Native画面と学習用contractのPrettier）。製品Nativeは変更禁止。学習用contractの新HEAD検証は未了。Mobile CI 41138483798は成功。残り6状態条件・基本動作142件の証拠監査、PR混在製品差分仕分け、実Template/Private 2-core Codespaces/OpenCode校正を継続。


## 2026-10-31 大量商品と管理画面レスポンシブの状態監査（SUT変更なし）

- `SCREEN-STOREFRONT-PRODUCT-LIST-S-many-products`と`SCREEN-ADMIN-DASHBOARD-S-admin-mobile-warning`を正式BR/AC、Use Case→Repository→Web UI、既存Seed実値・Role/viewport境界で監査し、状態別条件を分析済みにした。**基本分析46/188（残り142）、状態条件9/20（残り11）**。親操作は未分析を維持し、分母188は暫定。
- many-productsは1000商品・20件/ページ・50ページ、1023px以下の管理画面は警告へ切り替わる。既存の学習用契約テストに2状態の証拠必須チェックを追加。既存製品コード・正式仕様・Seed・製品テストは変更しない。
- 前HEAD Web CI 41117026769はStyle Qualityの学習用contractと製品Native画面のPrettier違反でFAIL。学習用contractのimportを修正したが、製品Native画面は許可なく変更しない。前HEAD Mobile CI 41117026808はsuccess。最新HEADのCI/ブラウザ視覚受入は要確認。
- 次回はCI結果・学習用contractのformatを確認し、残る状態条件11件と基本操作142件を証拠監査。製品差分仕分けと実Template/Private 2-core Codespaces/OpenCode校正も未完了。

## 2026-10-31 注文状態2件の追加監査とCI原因分離（SUT変更なし）

- `SCREEN-ORDERS-LIST-S-empty`と`SCREEN-ORDERS-DETAIL-S-reviewable`を仕様・本人Role・Use Case→Dexie/Review Repository→Web/Native UI・既存Seed実値で読み取り監査し、状態別条件を分析済みにした。**基本分析46/188（残り142）、状態条件7/20（残り13）**。親操作は別途レビューし、188件の分母は未確定。
- `out-of-stock`のSKUとWebの初期選択・disabled分岐は比較Case成立性の再検証対象として未分析維持。製品コード・正式仕様・Seed・製品テストを変更しない。
- Web CI 41107879887はStyle Qualityで学習用contractと製品Native画面の書式違反。学習用contractの整形を調整し、製品Native画面は承認なしに触れない。複数のE2E失敗は`actions/download-artifact`の5回リトライ後失敗であり、テストAssertionの失敗ではない。Mobile CIはsuccess。新HEADのCI成功は未確認。
- 次回は新HEADの学習用formatter/contract結果を確認し、製品Nativeの書式違反は許可待ちとして記録。残る状態条件13件と基本操作142件の証拠監査、既存PRの製品差分仕分け、実Template/Private 2-core Codespaces/OpenCode校正を継続する。

## 2026-10-31 Web empty状態2件と製品不整合の分離（製品変更なし）

- `SCREEN-STOREFRONT-HOME-S-empty-catalog`と`SCREEN-STOREFRONT-CART-S-empty`を正式BR/AC・Use Case・Dexie・Web/Native・既存Seed実値・既存componentの読み取りで監査し、状態条件を分析済みにした。**基本分析46/188（24.47%）、未分析142、状態条件5/20レビュー済み・15件未レビュー**。188件は暫定。
- `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`は正式仕様の『戻る導線』とWeb無CTAの相違を検出。重大度Medium候補、教材では未解決の期待結果として扱い、製品・正式仕様・既存テストを変更しない。修正の必要性/Issue化はユーザー判断待ち。
- 前HEADのWeb CI 41102991995はStyle Qualityで学習用契約テストと製品Native画面のPrettier違反。後者は変更境界外のため勝手に整形しない。前HEADの他のcontract/component/integration/E2Eは成功だが全体FAIL。今回の契約変更と新HEADのformat/CI成功は未検証。
- 次は残る15状態条件と142動作の証拠監査、既存PR混在製品差分の仕分け、公開Template/Private 2-core Codespaces/OpenCode実モデル受入。全受入条件を満たすまで完了としない。


## 2026-10-31 決済処理・結果画面の分析（製品コード変更なし）

- `SCREEN-CHECKOUT-PROCESSING-A01-01`/`A02-01`、`SCREEN-CHECKOUT-COMPLETE-A01-01`、`SCREEN-CHECKOUT-FAILED-A02-01`/`A02-02`を仕様・Use Case・Web/Native・Seed・既存テストから監査し、具体的なRole/State/Data/期待結果/リスク/Case選定と実装参照を台帳に記録。今回は製品・正式仕様・既存Seed/テストを変更しない。
- 決済失敗画面の理由表示、Nativeの再試行方法固定、カート/確認への復旧導線、Web再試行失敗のcatch欠落を不整合候補として調査レポートに記載し、`SCREEN-CHECKOUT-FAILED-A01-01`/`A01-02`/`A01-03`を未分析に維持。実機・実ブラウザの再現と別対応の判断が必要。
- **基本分析46/188件（24.47%）、要レビュー142件、状態別条件17/20件未レビュー**。分析のソース確認と自動テストの実行成功、Android視覚正本/実公開Template・2コアCodespaces/OpenCode受入は別。後続タスクの製品変更禁止は先頭の作業境界に従う。

## PR #199の変更対象と製品不具合の扱い（2026-10-31確定）

**この節は今後の継続タスクにも適用する。** PR #199の目的は、AI協働QAカリキュラム（M00〜M10の教材・演習・評価・学習環境）と、Scenario Shop全サポート動作の証拠付き分析・教材としての技術的受入を完成させることである。全機能の分類・基本分析100%という既存目標は変更しない。

- **変更可能**：新課程の教材、クイズ、演習、評価、知識グラフ、分析台帳・調査レポート、配布・ロード・学習用Template、学習専用のfixture/Seed・Playwright/契約テスト、これらに必要な専用ツール/CI・Plan。既存の機能とSeedを先に再利用し、学習目標に対する不足を確認した範囲で学習用データを追加する。
- **原則読み取り専用**：Scenario Shopの製品実装（`src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`app/**`等）、正式製品仕様（`docs/spec/**`）、既存の正式Seed/Reset（`src/seeds/**`等）、製品用Component/Integration/E2E/Maestroテスト、正式製品用workflow。機能不具合を発見しても、PR #199でこれらを自動修正しない。名称・ディレクトリだけで判定せず、変更目的が製品動作か学習専用かも確認する。
- **不整合を発見した場合**：仕様BR/AC、再現条件、根拠となるコード・テスト、利用者への影響・リスク、教材や演習の成立への影響、代替手段を分析台帳・調査レポートに記録する。未確定仕様は未確定のまま扱う。製品修正が必要と判断しても、Issueや別PRへの切り出しを提案し、ユーザーの明示承認前に製品実装・正式仕様・既存製品テストを変更しない。セキュリティ上の問題は優先して報告する。
- **CI失敗時**：新課程・専用ツール・分析台帳・専用テストの失敗は本PRで修正する。製品本体や正式製品テストの修正が必要な場合は、失敗の原因と必要な対応を報告し、勝手に製品側を修正しない。未実行のテストはPASSにしない。
- **既存の混在差分**：2026-10-30〜31に本PRへ追加した製品側の修正は現状維持とし、必要性・影響を別途仕分ける。今の方針だけを根拠にrevert・移設・別PR作成は行わない。以降の履歴に製品修正の記載があっても、それを今後の同種修正の許可とは解釈しない。

上記の境界を越える必要が生じた場合は、学習上の必要性、既存機能/Seedでの代替、変更ファイル・回帰範囲を示し、明示的な承認を得てから実施する。

## 2026-10-31 前HEADのWeb CI失敗対応（継続作業）

- Web CI 41099183628の実ログでTS2375、配送先`<address>`の文字列検索、古いCart時のE2E期待文言の不一致を確認し、TypeScript/Component/Required E2Eを修正。分析契約の集計期待値も41/188へ同期した。
- Native画面・Web component・台帳契約のPrettier違反3ファイル、およびAndroid NDK取得/展開失敗は最新CIで再確認が必要。未実行をPASSにしない。

## 2026-10-31 注文完了の番号表示・履歴導線（継続作業）

- `SCREEN-CHECKOUT-COMPLETE-A01-02`/`A01-03`を正式BR/AC、Use Caseの本人所有権、Web/Native UI、`default` Seedの`order-paid`/`ORD-20260701-0002`と照合。Nativeの内部orderId表示を顧客向け注文番号に修正し、Web/Native componentテストと分析契約を追加した。
- **基本分析41/188件（21.81%）、未分析147件、状態別条件17/20件未レビュー**。188件は暫定。CI/実機・正本画面比較、配送先選択の仕様差、公開Template→非公開2コアCodespaces、OpenCode実モデル校正は未完了。
- HEAD `d22e366` のAndroid production-validation CIでNDK 27.1.12297006のZipアーカイブ不正を確認。SDKインストール起因であり、再実行成功は未確認。


## 2026-10-31 注文確認の価格・明細・Cart競合（継続作業）

- `SCREEN-CHECKOUT-CONFIRM-A01-01`/`A01-03`/`A02-01`/`A02-02`/`A02-03`と`S-stale-cart`を仕様・Pricing・Use Case・Dexie/SQLite・Web/Native・Seedで照合。NativeのSKU選択肢・商品小計・会員割引・送料の表示不足を補い、Web/Nativeに古いCart・価格変更時のカート確認導線を追加した。
- `getConfirmation`と`beginOrder`に対してCart版/商品価格変更を注入し、Session、注文、決済、在庫が不変であることを検査する統合テスト、およびWeb/Nativeの表示・非確定のcomponentテストを追加した。CI実行PASSとAndroid実機受入は別判定。
- **基本分析39/188件（20.74%）、要レビュー149件、状態別条件17/20件未レビュー**。固定Seedの`stale-cart`は住所Stepのため確認画面の実再現と区別。配送先直接入力のWeb/Native仕様差、全機能レビュー、Android画面リファレンス、実公開Template→非公開2コアCodespaces→OpenCode実モデル校正は未達。CI完了待ちは行わない。


## 2026-10-31 注文確認のNative表示とエラー導線（継続作業）

- `SCREEN-CHECKOUT-CONFIRM-A01-02`（配送先）と`A01-04`（決済方法）をWeb/Native・Use Case・Dexie/SQLite・Seedと照合。Webの建物名/部屋番号表示、Nativeの宛名・郵便番号・建物名・支払方法の表示漏れを補完した。
- Nativeの注文確認データは確認Step成立後に取得するよう統一し、取得失敗・未完了Stepを永続Loadingではなくエラーと配送先へ戻る導線で表示する。Web/Nativeの回帰テストを追加した。実行PASSは別判定とする。
- **基本分析34/188件（18.09%）、要レビュー154件、状態別条件18/20件未レビュー**。配送先入力のWeb/Native仕様差、注文確認の残り操作、Android実機・正本画面リファレンス、実公開Template→非公開2コアCodespaces→OpenCode実モデル校正と全機能分析100%は未完了。CIの完了待ちは行わない。


## 2026-10-31 決済画面の復元と前提ステップ検証

- `CheckoutPaymentContent`と`NativeCheckoutPaymentScreen`は以前に保存した`paymentMethodCode`を参照せず、再表示時に`TEST-SUCCESS`へ戻していた。両画面で保存済み値を初期選択に使用し、明示的な再選択があればUI操作を優先するよう修正。Web/Nativeの`TEST-DECLINED`再表示・保存テストを追加した。
- `SCREEN-CHECKOUT-PAYMENT-A02-01`（住所未設定セッション）と`A02-02`（Cart version不一致）をWeb/Native・Use Case・Seed・Repository・関連テストで監査した。未完了状態は`CHECKOUT_STEP_INCOMPLETE`、旧Cart状態は`CART_VERSION_CHANGED`で決済画面を拒否し、Sessionの決済方法・version・ステップを更新しない統合テストを追加した。
- **基本分析32/188件（17.02%）、未分析156件、非default状態条件18/20件未レビュー**。CI/実機/画面リファレンスは別途判定。実Template→非公開2コアCodespaces、OpenCode実モデル校正、全11モジュール・全機能の完了条件を維持する。

## 2026-10-31 決済方法選択・確認遷移とCI原因の修正

- `SCREEN-CHECKOUT-PAYMENT-A01-01`と`A01-02`を正式BR/AC・Web/Native・Use Case・Dexie/SQLite・Seed・回帰テストで照合。許可する4モック決済コード以外はApplication境界で拒否するよう修正し、未許可コードがSessionを変更しない統合テストを追加した。
- Webの`setPayment`失敗が未処理Promiseになり得る問題を修正し、エラーを表示して確認画面へ進まないcomponentテストを追加。配送先が再選択待ちで無効化されたボタンの表示名が「処理中…」になる問題も、送信中`busy`と`disabled`の分離で修正。
- NativeのCheckout復帰処理は予期しないストレージ読み取り失敗でも新Sessionを開始していたため、復帰可能な古い/未完了Sessionのエラーだけに限定し、予期しない失敗では新規作成せず画面エラーを出すcomponentテストを追加した。
- Web CI `41088684235`の失敗ログから、台帳の実装行参照37件、Use Case証拠7件、公開Use Caseメソッド7件の古い行番号を特定して署名一致位置へ再固定。既分析済みの再開操作を未分析と期待する契約テストも修正。Style Qualityの3ファイルとcomponentテストの失敗原因を修正したが、最新HEADのCI成功は未確認。
- **基本分析30/188件（15.96%）、残り158件、状態別条件18/20件未レビュー**。188件の分母最終確定、11モジュール・正式AI評価・実Template→非公開2コアCodespaces→OpenCode実モデル校正を含むマージ前受入は引き続き未完了。

## 2026-10-31 Checkout再開・置換と住所選択復元

- `SCREEN-CHECKOUT-ADDRESS-A02-01`（再開）と`A02-03`（置換）をWeb/Nativeの画面、Checkout Use Case、Dexie/SQLite、`checkout-resume`/`checkout-replaced` Seed、関連テストで照合した。状態別`resume-notice`は既存動作の検証条件のまま維持する。
- Webは再開時に保存済み住所のSnapshotを無視して既定住所を選んでいたため、非既定住所を復元し、元の住所が変更・削除されていた場合は明示的な再選択を要求するよう修正。Nativeでも既存Sessionの住所入力が復元されることをテストに追加した。
- Nativeで`replaced`が`started`として案内されていた問題を修正し、新規開始/置換の表示差をテストで確認した。旧SessionはRepositoryで放棄し、新Sessionは住所・支払方法なしで作成する。
- 基本分析は**28/188件（14.89%）、確認待ち160件、状態別条件18/20件未レビュー**。配送先選択のWeb/Native仕様差`A01-01`と旧セッション一般案内`A02-02`は保留し、全マージ前受入の必要条件は変更しない。

## 2026-10-31 Checkout住所入力の境界検証

- `SCREEN-CHECKOUT-ADDRESS-A01-02`について、Web/Nativeの配送先保存成功後だけ決済画面へ進み、Sessionの`version`と`unlockedStep`が変わることを仕様・両Repository・Seed・関連UIテストで照合した。
- `CheckoutOrderUseCases.setAddress`の住所入力に必須項目/郵便番号/電話番号の検証不足があり、Nativeの直接入力から不正な住所Snapshotを保存できたため、値の正規化と拒否条件を補強。無効値でのSession不変と有効なハイフン付き入力、Web/Native UIの保存エラー非遷移を回帰テストに追加した。
- `SCREEN-CHECKOUT-ADDRESS-A01-01`は登録済み住所必須のWebと直接入力可能なNativeの仕様差が未決のため`review_required`を維持。上記入力形式の不具合修正だけで仕様差まで解決したとは扱わない。
- **基本分析26/188件（13.83%）、未分析162件、非default状態条件18/20件未レビュー**。188件は暫定。CI/Android実機と実Template→Private repo→2コアCodespaces/OpenCodeのマージ前受入は別途必要。

## 2026-10-31 Checkout再開通知の状態別監査

- `SCREEN-CHECKOUT-ADDRESS-S-resume-notice`のWeb限定視覚条件を、正式仕様・Role・Use Case・sessionStorage通知・checkout-resume Seedの固定Clock/Cart version・既存E2Eで照合し分析済みに変更。
- **基本分析25/188（13.30%）、未分析163件、状態別条件18/20件未レビュー**。親`SCREEN-CHECKOUT-ADDRESS-A02-01`はWeb/Native入力復元などが未監査。
- 最新HEADのE2E/CI成功、暫定分母の確定、実Template/非公開2コアCodespaces/OpenCode実モデル校正は未完了。

## 2026-10-31 プロフィール表示のWeb・Native契約整合

- `SCREEN-AUTH-ACCOUNT-PROFILE`の本人情報、会員ランク、アカウント状態、顧客以外の操作・内部IDの非表示の4操作を正式仕様/Use Case/Seedで照合し、基本分析済みを25/188件（13.30%）、未分析163件へ更新。状態別条件19/20件は未レビュー。
- Nativeプロフィールは会員ランク・共通の割引率・送料特典・アカウント状態の表示が欠けていたため、Webと同じ辞書・価格計算で表示し、Web/Nativeの3ランク別componentテストを追加した。
- `active`顧客は「利用中」を表示するが、`suspended`/`withdrawn`は`SessionIdentityResolver`で拒否する。DTO内の`id`はUIへ表示しない。
- 現行HEADのCI成功およびAndroid実機・正本画面リファレンス受入は別途確認する。実Template/非公開Codespaces/OpenCode実モデル校正と全件分析の必須条件は維持する。

## 2026-10-31 既定住所設定と注文時住所選択の責務分離

- `SCREEN-CHECKOUT-ADDRESSES-A01-04`は`/account/addresses`での「既定にする」操作。画面仕様の文言を修正し、Web/Nativeとも`AccountUseCases.updateAddress`と既定住所再割当Repositoryを根拠として台帳・回帰テストを更新した。
- 注文時の住所選択は`SCREEN-CHECKOUT-ADDRESS`（`/checkout/address`）で扱う。Webは本人の登録済み住所をラジオ選択し、Nativeは保存済み住所の読み込みと入力欄での直接入力の両方を提供する。このプラットフォーム差の受入契約は別途精査する。
- 188件の暫定分母は重複の解消として縮小せず、21件を基本分析済み（11.17%）、167件を要レビューとする。非default状態別条件は19/20件が未レビュー。CI/実機の成功と基本分析の記録を混同しない。

## 2026-10-31 配送先操作と空状態の監査

- 台帳の基本分析は20/188件（10.64%）、要レビュー168件。非default状態別条件は1/20件を分析済み、19件未レビュー。188件の最終分母は未確定。
- 配送先追加・編集について、Use Caseの顧客認可と入力検証、Web/Dexie・Native/SQLiteの所有者、既定住所、version競合、5件上限、初期Seed住所0件を照合した。
- 配送先未登録案内とWebデスクトップのempty状態は初期Seedと画面表示を照合し、Webの空案内と同画面の追加フォームを確認するcomponentテストを追加した。
- `SCREEN-CHECKOUT-ADDRESSES-A01-04`は`/account/addresses`に選択操作がなく、`/checkout/address`に別画面の住所選択が存在する。画面契約の重複・誤分類の可能性を解決するまで`review_required`とする。
- Web CIの成功とMobile CIの状態は最新HEADごとに確認し、実公開Template/非公開Codespaces/OpenCodeモデル校正の全マージ前受入とは区別する。

## 2026-10-30 機能分析の追加監査（引き継ぎ後）

- [分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)とschema v2台帳で、画面操作172件＋独立Use Case操作16件＝暫定188件、状態別条件20件の分離を維持。
- 配送先一覧・配送先削除の仕様、Web/NativeのUse Case・Repository、Seed生成条件を追加照合し、基本分析17/188（9.04%）、確認待ち171件。状態別条件20件は未レビュー。全対象機能の分母確定と基本分析100%は引き続き未達。
- カテゴリー並び替えの全件更新／取得50件上限、価格承諾の数量上限を実装とテストで修正し、両動作と郵便番号候補の顧客認可に関する分析を追加。実行結果の最終確認と残る171件・状態別条件20件のレビューは継続する。
- 実公開Template、受講者の非公開2コアCodespace、OpenCode実モデル校正・通し受入は別の必須残件。Web/Mobile CI成功をこれらの完了とみなさない。

## 完全自己学習の教育設計と正式AI修了（2026-10-26）

全11モジュールは、情報を参照できるだけでなく**初学者が講師の説明・人の採点承認なしで学習→実践→復習→AIによる正式修了まで進める**ことを必須とする。コース全体にBackward Design/Constructive Alignment（到達能力→評価証拠→学習経験）、モジュールにはMerrillの実務課題中心設計、個別授業にはWorked Examples、熟達者の判断過程、Scaffolding/Fadingによる段階的練習を用いる。概念・操作・判断によって教材構造を変え、全授業の見出し数・演習回数を固定しない。実行前の状態、操作、観測できる成功/失敗、誤り別フィードバック、別条件の独立実践、復習・再評価までを示す。

M04/M07/M10のPhase終了時は**学習者本人が別セッションのOpenCode AI採点と決定論的な実行/参照検証を起動**する。既存の公開採点JSON・Phaseルーブリック・Codespaces内の個人workspaceを再利用し、目標ID別Level・根拠・使用版・モデル/校正と再評価を非公開保存する。正式な人間評価者の割当・対面の採点・提出先を要求しない。AIの誤PASS・校正未達・旧Run/版違い・AI接続不能は合格へ変更しない。モデル/無料枠の可用性は初回と導入時に確認し、有料へ自動切替しない。開発時の教材レビューと本人評価は別の責務。実受講者の学習効果試行はPR後でよいが、教材とAI評価の技術受入は今回PR必須とする。

## Planと教材実装の対応

M02/M04の初見仕様質問・引継ぎ、M06の別Case新規E2E、M07のPage Object/標準fixtureの保守実装と別Run、M10の現HEAD実CI・変更条件判断、全サポート機能の分析は必須。古い本文にある固定TODOのみ・POM採否の説明のみ・M09の無効workflowの実Run扱い・本人による製品フルBuildを完了条件にしない。後続の実装工程では、教材/演習、公開ルーブリック、`scoring-tests/Mxx.json`、`states/Mxx/end.json`、提出テンプレート、manifest、知識グラフ/Validatorと意味レビューを連動更新する。現在の旧教材との不一致を新Planの方針撤回と解釈しない。

## 追加の実装・評価契約（2026-10-26）

- Phase 1：M02/M04で未知仕様の重要な質問・未決の期待結果・影響を判断し、根拠と対応責任を引継ぎ資料へ残す。
- Phase 2：M06で既存3 CaseのTODO補完とは別に、未使用Caseから短いE2Eを本人がAIと構成・実行する。M07ではPage ObjectとPlaywright標準fixtureの適用判断・最小実装・変更前後の別Runを確認する。どのspecも一律にPOM化させない。
- 選択Phase 3：M09では専用workflowの`.disabled`を維持し、M10で本人が無料枠・権限・対象specを確認して手動で有効化、PR HEADの実Run/Artifactを照合する。trigger・権限・費用・失敗時対応を変更する設計判断も本人が行う。
- 全11モジュールの証拠は学習目標ID単位で対応付け、各Phase末のM04/M07/M10で評価者がまとめて正式判定する。総合演習を複数IDの根拠に共有してよいが、IDごとの観測・未確認・BLOCKEDを区別する。
- 製品の正式なWeb・管理・Native機能を棚卸しし、機能分類100%と全サポート機能についての仕様・主要リスク・検証責務の基本分析100%を確認し、Condition/Caseの詳細度と自動化範囲を優先度で決める。Native機能は分析対象に含めるが共通11モジュールのPlaywright実行対象はWebとする。

## 判定根拠と今回PRの受入（2026-10-26）

既存の`knowledge-graph.json`、公開の`assessment/scoring-tests/Mxx.json`、教材Markdown・正本仕様と固定Skillを再利用する。AIによる教材品質レビューでは出典、学習目標、具体例・練習・本人判断・評価の整合を校正例で確認し、fail/ungradableは根拠に従って修正・再検証する。**学習者の正式AI採点とは結果・セッションを分離**する。新しい成績DB/LMSの設置は既定とせず、受講者の非公開workspaceを利用する。

**今回PRの必須技術受入**は実公開Template→本人所有の非公開repo→新規2コアCodespace→固定SHA・配布許可リスト→単一モジュールload・非破壊性→配布済みShop Serve/Reset→Playwright実Run/証拠保全と、AIチューター/独立AI正式評価・校正・安全性・再評価の通し確認。未実施・失敗をPR完了としない。実受講者による習熟効果試行と個人ごとのモデル認証/費用確認は後続/受講初回とする。人間による正式採点を後続の必須工程に残さない。

## 2026-10-25確定の教育・実装方針

受講対象は**テスト実施またはテスト設計の経験者**。IT・テスト完全未経験者を対象にしない。PC基本操作は前提とするが、プログラミング、Git、Playwright、AIエージェントは未経験でよい。日本語の完全自習を基本とし、講師の口頭説明を前提にしない。

最終目標は担当機能の仕様理解・リスク分析・設計・自動化対象選定・Playwright実装・実行・失敗分析・改善をAIと協働して自走すること。**Phase 1**は未知仕様の質問整理・4技法・第三者への設計引継ぎ、**Phase 2**は短いE2Eの自力構成・Page Object/fixture等の保守設計、選択**Phase 3**は安全なGit/PRに加え業務CIの設計・権限管理・運用判断まで含む。QA成果物を扱う全工程で責務に応じた固定qa-workflow-skillsを使用する。環境・Git・CIだけの操作にSkillを無理に使わない。

全11モジュールで、各目標に実務問題・解説付き完成例・本人が判断する短い練習・別条件への独立実践・AI/決定論的な結果検証・復習先を対応させる。M04/M07/M10では本人が全必須IDのLevel 2を正式AI評価し、講師の承認待ちなく再評価できる。

公開Templateから本人の**非公開リポジトリ**を新規作成し、個人の無料枠の2コアCodespacesを使う。今回のPRで実TemplateとPlaywright技術受入まで実施する。受講者ごとのOpenCode認証・モデル依存動作は初回起動時に確認し、不成立はBLOCKEDとする。非公開Actionsの無料枠・課金防止と、Codespace停止はremoteへの保存ではない点を考慮する。実受講者の学習効果試行は今回のPRから除外し、後続の継続改善で実施する。

教材・演習・評価・Webの意味上の対応を、構造/契約検証と根拠付き内容レビューで確認する。教材品質AIレビューのPASSと本人の正式AI採点の達成を混同しない。誤PASSと判定不能は正式修了にしない。全サポート機能の基本分析100%は維持する。

具体的な実装・受入条件は[2026-10-25の改善Plan](./2026-10-25_202700_ai-assisted-qa-curriculum-learning-experience-rework.md)と各領域Planに定義する。

- **文書の入口**：[Planインデックス](./2026-10-16_qa-curriculum-ai-agent-redesign_index.md)
- **合意済み方針と残確認事項**：[決定事項・残確認事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)

## 目的と採用方針

**目的は、AIエージェントと協働してテスト自動化を構築・検証・改善できる人材を育成すること。** QA活動全体やGitHubの一般的な運用を網羅することではない。受講者はテスト実施または設計の経験者を想定し、AIエージェント・プログラミング・GitHubの未経験者も対象にする。

学習期間・業務環境に応じて次の**3フェーズで受講を終了できる**構成とする。各フェーズに独立した学習目標・確認クイズ・実技・修了判定を用意する。

| フェーズ | 対象モジュール | 目的 | 修了したらできること | 受講上の位置 |
| --- | --- | --- | --- | --- |
| **Phase 1：AIエージェントとテスト分析・設計** | M00〜M04 | AI初心者が安全な操作・Skill利用を覚え、自動化に必要な仕様分析・テスト設計を行う | AIと協働して、根拠を示せるテスト条件・ケース・自動化候補を設計し、生成結果をレビューできる | 単独受講・修了可能。Phase 2の前提 |
| **Phase 2：Playwright構築・実装・実行・改善** | M05〜M07 | Phase 1の成果物から、ローカルで実行できる自動テストを構築する | 環境設定、実装、Seed/Reset、実行、失敗分析、保守改善ができる | Phase 1修了後に受講。ここまででPlaywright自動化の修了 |
| **Phase 3：GitHub・CIによる継続実行** | M08〜M10 | Phase 2のテスト資産をGitHubで管理し、CIへ組み込む | PRレビュー、対象SHAのCI実行・Artifact・失敗対応と品質ゲートを扱える | **選択**。Phase 1・2の修了要件には含めない |

- **標準学習環境は受講者個人の学習用リポジトリを開くGitHub Codespaces**とする。教材・製品仕様の正本は引き続き公開の`qa-training-store`で管理し、学習用リポジトリへ配布可能な範囲だけを同期する。Codespace作成にはGitHubアカウントが必要だが、**Phase 1・2でGit/branch/commit/PR/GitHub Actions/CIの操作は学ばせず、修了条件にも含めない**。成果物はGitなしで保全できる。
- Phase 1の学習対象はテスト自動化に必要なテスト分析・設計に限る。広範なQA管理・全テスト技法の習熟を目的にしない。
- Phase 3ではPhase 2で作成したテストを再利用し、分析・実装のやり直しを必須にしない。
- **各フェーズの最後に独立した修了課題**を置く。Phase 1は設計、Phase 2はローカルE2E、Phase 3はGitHub・CI。従来のM10はPhase 3の総合演習として扱い、Phase 1・2の必修に含めない。
- **受講開始ガイド（モジュール数に含めない）**を設け、ターミナル未経験の受講者が最初のM00をロードできるようにする。M00はVS Code・AI基本操作、M05はNode.js→pnpm→TypeScript→Playwrightの順に教える。各項目のLevel 2判定は[詳細な学習順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)による。
- 完成対象は11モジュール／51学習項目とし、全項目の必要知識・説明・演習・評価条件を満たす。将来の改訂では目標と評価を根拠に追加・統合を行い、件数合わせで増やさない。

## 学習用リポジトリへの同期とモジュール単位のロード

- **管理者による同期**：`training/course-sync/manifest.json`を配布許可リストとして、確定commitから必要な教材・課題・実行環境だけを**別の公開学習用Templateリポジトリ**へ用意する。公開の模範解答・採点用テスト・完成状態データ・正式回帰spec・Secret・不要workflowを含めない。評価資料は`training/ai-assisted-qa-course/assessment/`配下の通常ファイルとしてこの公開リポジトリでレビューできる。スクリプトによる自動commit/pushは行わない。
- **学習者によるロード**：Codespacesで学習者本人が`pnpm course:load M03`等を実行し、**指定した1モジュールの課題だけ**を`workspace/M03/`へ準備する。先行モジュールの成果物を使い回し、再ロード時も編集済みファイルを消さない。他モジュールの自動ロード・課題の自動回答は行わない。
- `qa-training-store`はpublicであり、模範解答・採点用テスト・完成状態データは通常のMarkdown/JSON/TypeScript等で`training/ai-assisted-qa-course/assessment/`へ保存し、GitHub上の通常差分とPRレビューで確認できる。公開資料を見られることを前提に、学習用Template・同期/ロード・Web Build・公開Artifactには配布許可リストで含めない。この配布除外は秘密保持ではない。M04/M07/M10の基本的な評価課題・条件は公開してよい。正式評価では条件変更・追加質問で本人判断を確かめる。本人の判断と根拠を確認し、模範の暗記や秘匿性だけに依存しない。
- **管理者が固定SHAからScenario ShopをBuildして検証済み成果物を同期し、学習者リポジトリでは配布済み`course/shop/`をServe→Seed/Reset→Playwright実行できることが前提**。受講者側でフルBuildは行わない。必要な製品ランタイムは正本から生成・同期し、製品全体の別正本や旧Training Copyの無差別な複製を作らない。具体的な依存ファイルは実装時に確認する。

詳細は[教材同期・モジュール単位ロード設計](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)を参照する。

## 知識グラフを基準にした継続改訂

- [基準グラフ](../curriculum/ai-assisted-qa/knowledge-graph.json)に**3フェーズ・11モジュール・51学習項目・必要な理解事項**と、教材節・クイズ・実技・評価基準・製品仕様・利用Skillの関係を整備する。現在登録済みの58件の理解事項は、学習目標と教材・評価を照合して過不足を修正する。**最終的なノード・関係・評価網羅・改訂手順は[知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)に定義する。**
- Skillの正本は、**別リポジトリ`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`**とする。`qa-training-store/.agents/skills/`にある汎用Skillを今回のQAワークフローSkillと混同しない。基準版commit、各Skillの参照先、実際の動作検証の有無を区別する。
- Scenario Shopの製品仕様は`docs/spec/`、実装依存の低レベル値は仕様で指定された実行可能正本ソース、Skill本体は`qa-workflow-skills`がそれぞれ正本。**グラフはこれらを複製・書換えせず、学習上の前提・参照・変更影響を追う**。
- 教材・テスト対象・Skillが変わった場合は、まずグラフで影響候補を抽出し、現行仕様/Skillの差分、教材説明、確認クイズ、実技、Level 2の判定基準を照合する。**影響候補だけで自動更新・自動採点・自動同期しない**。
- **知識を分解した／教材がある／問題がある／問題・実技でその能力を評価できる／本人が習得した**を分けて管理する。学習項目や問題IDの形式的な対応だけで評価網羅を認定しない。公開の模範解答・採点資料はグラフ本文へ複製せず、必要な参照関係だけを記録する。受講者個人の証拠は公開グラフに保存しない。
- グラフは**JSONファイル＋Node.js標準機能の読取り専用検証・影響検索**で運用する。学習内容・教材・評価の全対応と変更影響の検出までを完成条件とし、グラフDB、Web管理画面、JSTQB問題バンクの複製は追加しない。運用は[運用手順](../curriculum/ai-assisted-qa/README.md)に従う。

## Web公開と受講者の学習体験

**新課程M00〜M10は、公開Webページから教材本文を閲覧できるようにする。** 各モジュールの確認クイズは**1問ずつ回答し、全問終了後に得点・正誤・全選択肢の解説・復習先を確認**できるようにする。Web閲覧・学習クイズはGitHubログイン不要とし、実技の開始時だけ個人学習用リポジトリとCodespacesへ案内する。旧課程のWebページは維持する。

**既存の静的ドキュメント生成処理だけを再利用**して新課程の独立URLを作る。**教材本文は新課程M00〜M10向けに新規制作するMarkdown、確認クイズ・正答・公開解説は新規制作するモジュール別JSONをそれぞれ内容の正本**とし、既存カリキュラムのMarkdownや問題をWeb化・移植したものとして扱わない。受講者の導線（フェーズ選択→モジュール→教材→クイズ→解説・復習→Codespaces実技→修了評価）、中断・再開、教材revision、アクセシビリティ、学習者配布範囲と受入検証は[Web閲覧・学習体験Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md)で定義する。Webのクイズ結果を正式な修了認定や学習用リポジトリの成果物へ自動反映しない。

## モジュール別の正しい開始・終了状態

[全11モジュールの開始・終了基準状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md)を、**説明だけでなく実際の基準データ・判定条件まで用意する**ことを完成条件とする。

- **学習開始時**：受講者の教材・前提成果物・Seed/設定が、当該モジュールを開始できる正しい状態か確認する。
- **学習終了時**：仕様上必要な成果物・期待動作・根拠・許容される別解を定義し、機械的な整合と本人の理解・判断を区別して評価する。
- **M04終了→M05開始、M07終了→M08開始**など、前後で必要な成果物は**同じ入力契約**で整合させる。本人成果物と後続モジュール同梱の公開サンプルは別ID・revisionで管理し、先行成果物が使えなくても後続モジュールを開始できる。
- **復旧コマンドや自動復元は作らない**。基準を使うことと、本人が前のモジュールを修了したことを混同しない。
- 模範解答・採点用テスト・完成状態データは公開Gitでレビューできる通常ファイルとして保管し、公開Templateには**そのモジュールの検証済み開始サンプル・未完成課題・公開可能な条件**を配布する。サンプルは先行修了課題と異なる条件を使用する。配布除外は秘密保持ではなく、M04/M07/M10の評価条件は公開でき、追加質問・変更条件で本人の判断を確認する。

## Codespacesと追加料金ゼロを目指す運用

- **受講者本人のGitHub個人アカウントで学習用リポジトリとCodespaceを所有**し、その無料枠を利用する方針とする。利用前にCodespaceの**所有者・支払主体**と残量を確認する。組織の公開`qa-training-store`に直接Codespaceを作成した場合と、個人所有リポジトリで作成した場合を混同しない。
- GitHub Free個人アカウントの目安は**120コア時間/月、15 GB-month/月**（2026-10-16時点）。**2コアなら計算上最大約60起動時間/月**だが、他Codespaceとの共用・保存容量・個人の設定・支払条件によって変わる。無料を保証する時間数ではない。
- **2コアを標準として作成時に選択・確認**する。現行`.devcontainer/devcontainer.json`に`hostRequirements`はなく、**2コアに明示固定されていない**。`hostRequirements.cpus: 2`は最小要件であり上限固定ではないので、費用対策だけを理由に追加しない。4コア以上への変更を標準手順に入れない。2コアCodespacesでの教材・外部Skill・Playwrightの通し実行は**未検証**。過去のOpenCode無料モデルの利用実績を現在の個人認証・接続の保証とはせず、受講者が初回起動で確認する。
- 作成前に利用者の**予算／利用上限・請求設定**を確認し、無料枠超過で課金が発生しない設定または運用を選ぶ。料金を発生させる必要がある場合は演習を停止し、無断で上位マシン・有料プラン・有料モデルへ移行しない。学習終了時はCodespaceを停止し、保存容量と不要環境の整理、成果物の持ち出し方法を案内する。
- **OpenCode CLIと無料モデルを標準利用する。モデル接続・個人認証は受講者の初回起動時に確認し、失敗時はBLOCKEDとする。開発側は未実施のモデル統合成功を保証しない。** Codespacesでは個人`OPENCODE_API_KEY`をSecret経由で扱い、APIキー・認証キャッシュを教材・ログ・GitHubへ保存しない。有料モデルや有料自動切替を学習経路に含めず、受講者の明示的な同意なしに課金経路へ変更しない。
- Phase 3では本人の**非公開リポジトリと標準GitHub-hosted runner**を使い、非公開Actionsの無料枠・Artifact容量・課金制御を利用前に確認する。有料Runnerへ無断変更しない。
- 各フェーズについて、受講者の実測**Codespace起動時間・ストレージ使用量・セットアップ成否**を記録し、無料枠内で成立するか判断する。現時点では学習時間・消費量・受講者全員の無料利用は**未確認**。無料条件が成立しない場合はBLOCKEDとして扱い、勝手な課金で解消しない。

参考：[GitHubのプラン別使用量](https://docs.github.com/ja/billing/reference/product-usage-included)、[Codespaces課金](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)、[Codespaces利用ガイド](../guides/codespaces.md)、[OpenCode Zen料金](https://opencode.ai/docs/zen/)、[GitHub Actionsの課金](https://docs.github.com/en/billing/concepts/product-billing/github-actions)。

## 既存カリキュラムとは独立して作る

- 旧教材：`docs/curriculum/test-automation/`の17レッスン、104問、C01〜C12、旧修了判定は**変更しない**。
- 新教材の**正本（今後新規制作）**：`docs/curriculum/ai-assisted-qa/`にM00〜M10の教材本文、確認クイズ・公開解説、実技・修了基準を新規作成する。**既存の`docs/curriculum/test-automation/`の教材本文・104問を新課程の内容として転用・一括変換しない。** 現存する`ai-assisted-qa/README.md`と`knowledge-graph.json`は知識グラフの管理用であり、完成教材ではない。**Webページと学習用Templateは同じ新課程Markdown教材とJSONクイズを使用し、配布用の教材は別リポジトリで生成**する。模範解答・採点用テスト・完成状態データは公開リポジトリ内の`training/ai-assisted-qa-course/assessment/`に通常ファイルとして保存し、学習者向け配布物へ含めない。
- 新実技の正本：必要な素材・未完成specを`training/ai-assisted-qa-course/`に配置し、同期許可リストで必要なものだけ配布する。既存`training/playwright/`、`training/agentic-qa/`、旧Training Copyの契約を壊さない。
- 仕様・テスト対象はScenario Shopの`docs/spec/`等を参照し、製品の正式な仕様・Seed・回帰テストを不用意に変更しない。
- **今回の更新はPlanの完成仕様の修正**に限定する。PR #199に既に追加されている知識グラフJSON・運用README・読取り専用CLIは保持し、完成仕様で未実装の契約は今後の実装対象に含める。新教材・同期/ロードスクリプト・テスト実技・製品コード・CIの実装へは進まず、PR #198も変更しない。

## 設計文書の入口

各詳細Planへのリンクと作業別の参照順は[Planインデックス](./2026-10-16_qa-curriculum-ai-agent-redesign_index.md)で管理する。合意済みの条件、Planで採用した設計、開発工程での実装・検証待ち、実装完了後の実地検証、運用上の指定待ちは[決定事項・残確認事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)を確認する。詳細な仕様と受入条件は各Planを正本とし、インデックスや一覧へ複製しない。

## 実装作業の順序

1. PR #199のHEADとPR #198、`.devcontainer/devcontainer.json`、`docs/guides/codespaces.md`、`docs/spec/`、既存教材・Training・validator・CIの状態を確認する。開発側の決定論的Skill検証と、受講者の個人認証・モデル確認を分離し、既存ソース・依存・自動/契約テストから開発時に確認できる経路を検証する。実Template・2コアCodespacesのPlaywright技術受入は今回PRで行い、個人の無料枠・学習効果試行は後続で確認する。
2. 公開の教材正本から学習用Templateへの**同期・ロード・起動経路の最小開発検証**を先に行う。許可リスト、確定SHA、完成解答の除外、1モジュール単位のロード、上書き防止、Scenario Shop起動を、fixture・契約テスト・ローカルビルド/自動実行で確認する。まずfixtureで契約検証し、今回のPRで実Template・新規2コアCodespacesのPlaywright技術受入も行う。教材の内容品質が未確認のまま全11モジュール分を完成扱いしない。**今回のPRでは公開Templateを作成して技術受入する**。
3. 新教材ディレクトリを作り、**受講者用の`start-here.md`とWeb公開ページ**で**Phase 1のみ／Phase 1〜2／全3フェーズ**の受講経路と修了の違いを示す（既存の`README.md`は知識グラフ運用用として保持する）。共通の開始手順は**学習用リポジトリ作成→本人の2コアCodespace作成・確認→CLI・AI認証・Skill確認→学習者がM00をロード**とする。Phase 1・2でGitコマンド・PR・CI操作を要求しない。
4. [教材の内容品質](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)、[学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[演習対象](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[模範と採点基準](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)を踏まえ、**M02→M03とM05→M06の連続工程**の代表教材Markdown・対応する**新課程クイズJSON（問題・正答・解説）**・独立演習・公開模範解答・採点基準を先に制作する。問題数・文章量を先に固定せず、必要な説明・確認・復習先を作る。
5. [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md)に沿って、**手順4で制作した代表教材とクイズJSON**の静的表示・一問ずつの回答・最終結果・復習・途中再開を、自動テストと開発時レビューで検証する。正式仕様・学習順序・期待結果・学習者向け配布範囲を照合し、仕様誤読、未学習の前提、模写だけで成立する課題、正しい別解を判定できない基準を修正する。代表教材の開発受入を通過したら全11モジュールへ展開する。実受講者による学習効果の試行は全実装後のPR外とし、展開開始条件にしない。一方、実公開Templateからの**新規2コアCodespacesでの技術受入と正式AI評価の校正・実行**は今回PRの完了前に実施する。手順2の最小技術検証には専用の仮データを使用してよいが、完成教材・習熟の証拠として扱わない。
6. Phase 1の**誘導付きのAI操作→自分で依頼→初見の仕様分析・設計**の流れを作る。実在するSkillの発見・使用条件・依存と、AIの誤った推論の見抜き方を教材にする。特にM02→M03では、**検証責務と機械入力を分け、条件設計の`direct`から技法runtime・CI生成の`artifact`・Case・最終証拠検証までの入力契約**を守る。仕様・上流参照が未確定の場合やSkillの`ready`だけでは完成とせず、BLOCKED・不整合と区別する。
7. Phase 1の成果物（仕様根拠・Risk/Condition/Case・採否理由）をCodespaceの作業フォルダに保存し、Gitを知らない受講者でもダウンロードして保全・引継ぎできる形式と手順を用意する。Phase 1修了時にPlaywrightやGit操作を要求しない。
8. Phase 2は**Codespacesに導入済みのNode.js/pnpm/Playwright/Chromium**を使い、設定・実行方法と最小構成の再現を教える。専用spec・結果パス・ポート境界を確認し、実装・Reset→実行→失敗分析・保守まで**CI不要で**成立する総合演習を作る。Devcontainer全体の再構築を修了要件にしない。
9. Phase 3では**Phase 1・2と同じ学習用リポジトリ**でGit/GitHub/PR、専用GitHub Actionsの構築・実行・Artifact、CI失敗時の切り分けを**選択課程**として実装する。既存の旧Training Copyは本件の配布に流用しない。Phase 1・2の合否には参照させない。
10. M00〜M10について、**正しい開始状態・終了状態の実ファイルと照合条件**を揃える。M04→M05とM07→M08の成果物引継ぎ、前成果物を失った場合に参照すべき基準入力、開始条件と本人の習熟判定の分離を検証する。完成状態資料は公開リポジトリに通常ファイルとして保存し、学習者向け配布物から除外する。
11. [知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)に従って、理解事項の粒度と前提、教材節・設問・実技・評価の全対応、製品仕様・**外部`qa-workflow-skills`**のrevisionと変更影響を構築・検証する。**未接続・不正な評価対応・改訂時の追跡漏れがあれば未完了**とし、ID整合性を問題の正しさや習熟と取り違えない。
12. フェーズ単位で学習項目↔教材↔クイズと正解解説↔実技↔修了条件を照合する。旧課程の検証を回帰として実行し、別フェーズの証拠・実績を流用しない。

## 代表教材の開発受入と全量展開

代表教材は、内容・実装の品質を開発中に確認してから全11モジュールへ展開する。**この展開条件は、正式仕様との照合、コード/教材レビュー、必要な自動・静的・契約検証であり、実受講者の学習効果試行ではない。**

全量展開の前に次を満たす。

1. M02→M03の代表教材が、正式仕様から検証責務・技法選択・条件・期待結果・Caseまでの導出を説明する。固定Skillの`direct`起点からcurrent evidenceまでの技術的な入出力・負例契約は、対象revisionを使った自動/契約テストと必要な統合検証で確認する。
2. M05→M06の代表教材が、プログラミング未経験者に必要なNode.js・TypeScript・Playwrightの前提を教え、Caseから意味のあるAssertionへ変換する。専用spec、Seed/Reset、独立実行、出力分離を開発用テストとCIで確認する。
3. 正式仕様・学習順序・期待結果・評価基準・公開正本/学習者向け配布境界との整合をレビューし、重大な仕様誤読、説明の飛躍、未学習の前提、模写だけで成立する課題、正しい別解を判定できない基準を修正する。形式的なID対応やテストPASSだけで内容の正しさを認定しない。
4. 代表教材のWeb・Quiz・状態/評価データが自動検証を通り、旧課程・製品・正式回帰との境界を守る。

上記の代表教材の開発受入が未達なら、影響する教材・機能の全量展開を止めて修正する。**実受講者による講師なしの学習効果試行**は、全11モジュールと関連機能の実装完了後のPR外で行い、代表教材から残りのモジュールへ進む条件にはしない。人間の正式採点・独立評価者の承認を修了条件にしない。今回PRの実公開Template・2コアCodespaces技術受入、OpenCode正式AI評価の実行・校正・再評価は省略しない。

## 実装完了・技術受入・運用開始・後続の実受講者試行

1. **今回PRの実装完了**：M00〜M10全11モジュールの教材・クイズ・演習・評価課題・模範と校正例、開始/終了22状態、学習目標・知識グラフ・Skill・Scenario Shop全対象機能の対応を整備する。公開Web、許可リストによる配布・ロード、実公開Templateを整備し、本人の非公開リポジトリの**新規2コアCodespace**で固定SHA・非破壊load・Shop Serve/Reset・Playwright実Runと証拠保全を技術受入する。さらに、OpenCode正式AI評価の独立セッション、モデル校正・安全性、Level集計・未達時の復習・再評価を技術受入する。教材の根拠付き内容レビュー、契約/静的/ビルド/CI・必要なE2Eと旧課程/製品の回帰を確認し、未実施または失敗した必須検証があればPRを完了としない。
2. **受講者個別の開始確認**：OpenCode CLIの個人認証・無料モデル、対象Skillのモデル依存実行、本人の無料枠・所有/支払主体を受講開始時に確認する。実行できない場合はBLOCKEDとして復旧後に再開し、有料へ無断変更しない。開発側の決定論的Skill/runtime成功をモデル統合の成功としない。
3. **講師なしの正式修了評価**：学習者がAI評価と実行証拠検査を自ら起動し、全必須IDがLevel 2以上なら修了、そうでなければ不足IDと復習先から再挑戦できることを確認する。モデル/基準revision・証拠/Run・判定理由を非公開保存し、人間の評価担当者・中央提出先の割当は不要。
4. **後続の実受講者試行**：対象のテスト経験者が、講師の口頭補足なしで教材・クイズ・実技・保存・復習・評価の導線を使えるか、後続の継続改善で実施する。重大な教材起因の停止、意味不明の説明、誤った仕様判断への誘導を記録して修正する。この実受講者試行は**今回PRの実装完了条件には含めない**。試行人数や全員完走を今回PRの合否条件にしない。

人間による教材・知識ノードの最終承認は開発時AIレビューと別の責務であり、未承認状態を合格済みとして扱わない。旧課程・製品・正式CIの非回帰を維持し、別SHAや未実行テストのPASSを現在HEADの合格根拠にしない。

## 安全・互換性の境界

| 対象 | 変更方針 |
| --- | --- |
| `docs/curriculum/test-automation/**` | 参照のみ。編集・移動・削除しない |
| 旧`scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts` | 旧課程の判定と出力の意味を維持。新課程と共用しない |
| `training/playwright/**`、`training/workbook/**` | 必要な読み取り・再利用は可。旧課程の提出物・実行入口は変更しない |
| `training/agentic-qa/**` | 別の探索QA Challenge。新カリキュラムに置換しない |
| 正式製品・仕様・Seed・`e2e/web/**` | テスト対象として使い、教材のために故意の不具合を入れない |
| 新課程の`docs/curriculum/ai-assisted-qa/**`・`training/ai-assisted-qa-course/**` | 学習目標・教材・演習・評価を独立して管理 |
| 共有`package.json`／workflow | 新課程の追加に必須なものだけ加え、既存コマンド・旧コピーの許可リストを壊さない |

## 完了の定義

**Planの完成**：**公開Webでの11モジュール閲覧と一問ずつのクイズ回答・最終結果・復習、受講者の開始から実技・修了までの導線**、**11モジュールの開始・終了基準状態と引継ぎ条件**、知識グラフの完成仕様（ノード・関係・評価網羅・改訂手順・受入試験）を含め、3フェーズの目的・教材・クイズ/解説・実技と修了判定、**受講開始からM10までの順序・51項目別の到達判定・前提関係**、Codespacesの無料条件に加え、**公開の教材正本→公開Templateへの許可リスト同期→学習者本人の非公開リポジトリへの配布→学習者によるモジュール単位ロード**と、公開の模範/採点資料を学習者向け配布物から除外する契約、上書き防止、Scenario Shopの実行方法を明文化する。

**実装完了**：全11モジュールの教材・クイズ/公開解説・実技・開始/終了基準データ・評価基準・模範解答・採点用テスト・完成状態データ、公開Web、許可リスト同期、1モジュール単位ロード、知識グラフ、必要な検証/CI機能を作成する。模範・採点・完成状態は公開Git上の通常ファイルとし、学習用Template/同期/ロード/Web Build/公開Artifactには含めない。これは配布境界であり秘密保持ではない。学習者個人の提出・評価記録と、評価時に初めて示す具体的条件は公開リポジトリへ保存しない。Web/データ/ロード/状態/評価の自動・契約テスト、静的検証、ビルド、CI、正式仕様との意味上の照合、旧課程/製品の非回帰検証を通過し、Phase 1・2ではGitHubログイン以外のGit/PR/CI操作を求めず、Phase 1にPlaywright、Phase 2にCIを修了条件として要求しない。M02→M03の固定Skill契約等の必須統合検証を省略しない。**PR #199の完了前に**実公開Template→本人の非公開リポジトリ→新規2コアCodespaceでload・Serve/Reset・Playwright実Run・証拠保全と、校正済みOpenCode正式AI評価・結果保存・再評価の通し技術受入を完了する。**実際の受講者による学習効果試行のみ**PR後の独立工程とし、人間の正式採点・承認は要求しない。

**PR #199の実装範囲**：本Planが定めるM00〜M10の教材・評価資料・状態データ・知識グラフ・Web/同期/ロード/CI機能と開発用検証を完成させる。外部学習用Templateの実体作成は作成先・管理権限の指定後に行う。merge、force push、branch削除、PR closeは行わない。

## 2026-10-31 低在庫・検索ゼロ件の状態別監査（SUT変更なし）

- `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-low-stock`と`SCREEN-STOREFRONT-SEARCH-S-no-results`を正式BR/AC、Web UI、Use Case、Dexie、既存Seedとcomponentテストで読み取り監査し、状態別基本分析を完了。**基本操作46/188（残り142）、状態条件11/20（残り9）**。分母188は暫定、実行E2E/視覚受入PASSではない。
- low-stockはTシャツMを明示選択（初期Sでは不可）、在庫3/購入上限5/数量候補1〜3を対照。no-resultsは既存many-productsと未一致検索語で再現する。正式仕様の`search-empty`という固定Seed名は現行Seed登録に存在しないため、再現条件差異を調査レポートへ記録。製品仕様/Seedは変更しない。
- 前HEAD Web CI 41124666661はStyle QualityのPrettier違反（学習用contract、変更禁止の製品Native画面）で失敗。学習用contractの整形のみ本PRで対応し、製品Native画面は未修正。最新HEADのCIを再確認する。既存PRの製品変更は保持し、承認なくrevert/別PR化しない。
- 実公開Template→Private 2-core Codespaces、OpenCode実モデル校正、全11モジュールと全操作のマージ前受入は引き続き未達。

## 2026-10-31 ログインvalidation-errorの教材受入分析

- `SCREEN-AUTH-LOGIN-S-validation-error`を`authentication.md:9-35`のBR/ACとWeb必須状態、`auth-pages.tsx:21-35/101-181`のRHF/Zod、`form-error-summary.tsx:15-47`、`AuthUseCases.login:52-62`、既存componentテスト`auth-account-pages.test.tsx:138-181`、default Seedのguest初期状態と照合した。空2項目、invalid-email＋有効password、同一エラー再submit、入力修正の境界を分離。無効送信はUse Case/Repositoryへ到達しない。**状態条件12/20レビュー済み（残り8）、基本操作46/188（残り142）**。親ログイン操作は未分析。
- 前HEAD [Web CI 41132431772](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41132431772)はStyle QualityでFAIL（学習用contractと既存製品Native画面の2ファイル）、他のWeb契約/単体/統合/コンポーネント/主要E2Eは成功。Mobile CI 41132432188はsuccess。学習用contractの長いoptional-chain式を整形し、今回のCIで再検証する。製品Native画面は変更禁止のため未修正。
- 188操作は暫定分母。今回の判定はソースと既存テストの証拠付き基本分析であり、実ブラウザ・画面正本の受入PASSではない。既存PRの製品差分は保持。公開Template/Private 2-core Codespaces/OpenCode実モデル校正は未完了。

## 2026-10-31 管理商品many-productsとCI契約追従（SUT変更なし）

- `SCREEN-ADMIN-PRODUCTS-S-many-products`の既存Seed 1000商品・3000SKU、staff専用Use Case、Dexieの20件/ページ、Webフィルターを照合。基本分析54/188（残り134）、状態別16/20（残り4）。188は暫定分母であり、実ブラウザ/視覚正本のPASSではない。
- page50での公開状態/ランク/在庫/価格/並び順変更は`setPage(1)`を呼ばないため、結果が空に見える不整合候補を調査レポートに記録。親フィルター操作は未分析のまま、製品は変更しない。
- 前HEAD Web CI 41152309756の契約失敗は注文空状態の古い`review_required`期待値が原因。学習用contractの重複した旧Assertionを削除し、3状態の新しい監査Assertionを保持。Style Qualityの学習用/製品Native違反は別管理し、後者は変更禁止範囲として保持。新HEADでのCI成功は別途実証する。
- 実Template、非公開2コアCodespaces、OpenCode実モデル校正、全操作100%とPlanのマージ前受入条件は未達。
