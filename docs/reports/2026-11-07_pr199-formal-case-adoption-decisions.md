# PR #199：現行基本分析からの正式Case採否（2026-11-07）

## 判定結果

現行基本分析の採用方針を変更せず、旧追跡差分の12動作、明示の23動作、採用範囲とC1〜C7の条件定義が揃う109動作、元の分析が代表条件を直接定義する56動作と番号付き8動作に正式Case IDを付与した。**基本分析の再実施ではない。**

- 決定した動作：**208/208**。分析台帳にある全動作について、採用するCaseまたは引継ぎ先の方針を決定した。
- 対象の条件：**965行**。うち**959条件を採用**して正式Case IDを付与。残り**6条件を別動作に引継ぎ**、この動作での重複Caseを作成しない。
- 対象の基本分析：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`（Blob `7f53586e720838544abcf24ac553dece51c13449`）。対象208動作はいずれも `analysis_status=analyzed` であり、既存の `case_policy/test_condition` に採否の根拠がある。
- 正本：[採否CSV](./2026-11-07_pr199-formal-case-adoption-decisions.csv)。`behavior_id + condition_ref`で一意に識別し、`PR199-CASE-<behavior_id>-<condition_ref>`を正式Case IDとする。採用条件ごとの要件参照、Platform、元の分析欄、採否を記録した。
- 旧`docs/reports/2026-11-04_pr219-case-traceability.csv`（953行）と旧`docs/reports/2026-11-04_pr219-behavior-case-acceptance-status.csv`（208行）は当時の履歴として保持する。旧追跡67行との差分があっても、過去の期待結果・Run欄を上書きしない。

## 重複Caseを設けない条件

| 動作 | 条件 | 判定 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | C5 | Nativeのempty表示・遷移は親操作の動的受入で確認。Web desktop本状態の独立Caseにはしない |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | C6 | 価格・Rank変更の金額不一致は別操作A02-02と共通BRで確認。本状態の独立Caseにはしない |
| `SCREEN-ORDERS-LIST-S-empty` | C6 | Native空表示は補助条件。Web desktop本状態の独立Caseにはしない |
| `SCREEN-SUPPORTING-GUIDE-A02-02` | C5 | Test ControlのReset検証に引継ぎ、Guideの重複Caseにはしない |
| `SCREEN-ORDERS-LIST-A02-02` | C5 | Checkout処理・再試行の独立Caseへ引継ぎ。注文一覧に重複Caseを作らない |
| `SCREEN-ORDERS-LIST-A02-03` | C5 | 再試行・失敗理由・詳細遷移は別操作へ引継ぎ、本一覧には重複Caseを作らない |

引継ぎ先の具体的Case IDは以下の対応で特定した。引継ぎは同一条件の重複採用を避けるためのものであり、対象Caseの実行受入・独立レビューは別途必要。

## 既存テストと動的受入の境界

既存テスト候補は[12動作のCase追跡と既存Assertion](./2026-11-07_pr199-case-trace-reconciliation.md)、[29横断要件の確認結果](./2026-11-07_pr199-crosscutting-requirement-readiness.md)、以前の成功HEADの[Web CI #42376633442](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42376633442)を参照。個々の条件への**既存テスト再利用は採否決定だけで自動確定しない**。同一Case IDの仕様・実Assertion・Role/Seed/Platform・DB前後と実Runを突合して、再利用、必要な追加実行、製品FAIL、環境BLOCKEDを別々に判定する。

現時点では動作Caseの959件と横断Caseの51件すべて `execution_acceptance=未受入`、`independent_review=未実施`。特に商品管理の選択残留・ページ非リセット、stale Cartの誤復帰、停止operatorのForbidden循環、actor権限失効競合を**製品PASSにしない**。製品SUT・正式仕様・Seed/Resetと独立PR #210を変更せず、#210未マージの修正を#199へ採用済みと記録しない。

## 残る正式受入

動作208/208と横断要件29/29のCase採否・IDを記録した。番号のない代表条件56動作は、その`test_condition`に記されたRole・Seed・境界の複数組合せを**省略せず**、同じCase IDの実行パラメータで追跡する。既存テスト再利用の条件別突合、Web/Android/SQLite・rollback、視覚/a11y、独立レビューと実Runは未受入。既存44受入条件の「正式採用Caseの対応・最終判定」は**未完了**。

## 条件番号の抽出に関する訂正

`SCREEN-SUPPORTING-PRIVACY-A02-01`の`C4往復`と`SCREEN-SUPPORTING-COMMERCE-A02-01`の`C4状態`は、実際には定義済み。以前の機械抽出で空白を必須としたため見落としたが、現行の`test_condition`に根拠がある。両動作はC1〜C4をそのまま採用した。仕様・分析台帳を変更していない。

## 横断29要件のCase採否

[横断要件の正式採否CSV](./2026-11-07_pr199-cross-cutting-case-adoption-decisions.csv)に、**29/29要件、計51条件**の採用・正式Case IDを記録した。既存の[横断要件引継ぎCSV](./2026-11-04_pr219-cross-cutting-requirement-case-handoff.csv)にある`source_case_policy/source_test_condition`に依拠するもので、基本分析は再実施していない。

- Native/Roleの11要件は既存の「C1〜C3採用」に従い各3条件、残り18要件は既存の代表条件を各1件とする。代表条件内のRole/Seed/Platform/Stateは省略しない。
- 既存テストは**再利用候補**であり、単なるファイルの存在やWeb暫定キー一致を当該要件の直接Assertion・製品PASSに変換しない。
- 横断51条件は動作959条件と別の要求追跡を目的とする。同一SUT動作やRunを重複実行・二重集計することを要求しない。
- 全51条件の実行受入・独立レビューは未完了。Web/Android/SQLite、視覚/a11y、既知製品FAIL、実モデル受入の各既存ゲートを維持する。

## 2026-11-08 別動作に引き継ぐ6条件の正式Case対応

旧「引継ぎ先未確定」を、同じ[正式Case採否CSV](./2026-11-07_pr199-formal-case-adoption-decisions.csv)に**既に採用済みのCase ID**で確定した。未登録Caseを増やさず、既存台帳の判定を変更していない。次のCaseはすべて`execution_acceptance=未受入`、`independent_review=未実施`。

| 引継ぎ元 | 採用済みの引継ぎ先Case ID | 対応する検証 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` / C5 | `PR199-CASE-SCREEN-STOREFRONT-PRODUCT-LIST-A01-01` | 親操作でNativeのempty-catalog商品0件・遷移を確認 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` / C6 | `PR199-CASE-SCREEN-CHECKOUT-CONFIRM-A02-02-C4` | 価格・Sale期限・Rank更新時の金額差分 |
| `SCREEN-ORDERS-LIST-S-empty` / C6 | `PR199-CASE-SCREEN-ORDERS-LIST-A02-01-C2` | Nativeの0件表示を本人の空注文一覧操作で確認 |
| `SCREEN-SUPPORTING-GUIDE-A02-02` / C5 | `PR199-CASE-SCREEN-TEST-CONTROL-A01-04-C1`、`PR199-CASE-SCREEN-TEST-CONTROL-A01-04-C2` | Reset後のDB・Session・Clockと安全な復帰先 |
| `SCREEN-ORDERS-LIST-A02-02` / C5 | `PR199-CASE-SCREEN-CHECKOUT-FAILED-A01-01-C2`、`PR199-CASE-SCREEN-CHECKOUT-FAILED-A01-02-C1`、`PR199-CASE-SCREEN-CHECKOUT-FAILED-A01-02-C2`、`PR199-CASE-SCREEN-CHECKOUT-PROCESSING-A02-01-C4` | 処理失敗・再試行・成功、Gateway回数と同時実行の一回性 |
| `SCREEN-ORDERS-LIST-A02-03` / C5 | `PR199-CASE-SCREEN-CHECKOUT-FAILED-A01-01-C3`、`PR199-CASE-SCREEN-CHECKOUT-FAILED-A01-02-C1`、`PR199-CASE-SCREEN-ORDERS-DETAIL-A01-01-C1` | 失敗理由・再試行と本人注文詳細への導線 |

**責務の境界**：親画面でのNative表示、価格変動の確認、Reset/Session、決済の再試行・失敗理由は、表に記載したCaseが実際にそのAssertionとPlatformを検証した場合に限り引継ぎ元の条件を充足する。形式的なCase IDの関連付けだけで未実行条件をPASSとしない。引継ぎ元6行の`formal_case_id`は空のまま維持する。

## 2026-11-08 実Web証拠を採用Caseへ対応付け

- 既存[Web CI #42376633442](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42376633442)は全体success。`Chromium E2E (cross-role)` [job #128415678640](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42376633442/job/128415678640)のログは**33 tests passed**。既知製品不具合のexpected failure・再現確認も含むため、33件の製品PASSではない。
- 同Runの[IndexedDBダイジェストArtifact #13576455207](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42376633442/artifacts/13576455207)（5,855 bytes）に、4テストのbefore/after比較ファイルを保存。DBの生レコードやSession IDは保存していない。RunはPR merge refをcheckoutしており、ログの`buildSha=94be4825a19cdbcf5c458bfe967e0f8a3058086e`はPR branch HEADとは異なる。

| 採用済みCase ID | 当該Web実ログ・既存Assertion | このRunで証明しないこと |
| --- | --- | --- |
| `PR199-CASE-SCREEN-AUTH-LOGIN-A02-01-C2` | 停止・退会の実ログインフォームから拒否、各`testStatus=passed/expectedStatus=passed/retry=0`、23 IndexedDB表のbefore/after不変、Local Session Pointer未生成。ログ`login-rejected-without-session`2件 | Native表示、全Role・状態遷移、実ユーザー認証、正式Caseの独立レビュー |
| `PR199-CASE-SCREEN-CHECKOUT-CONFIRM-S-stale-cart-C1`（部分） | `rejected-confirm-no-db-mutation`は確認画面への遷移における古いCartの拒否と23表不変を直接確認 | Confirm到達後の全タイミング、`beginOrder`拒否・C2、全エラー導線・Native/SQLite・同時実行 |
| `PR199-CASE-SCREEN-BOUNDARY-FORBIDDEN-A01-01-C3` | `suspended-operator-surviving-session`で拒否画面から`/admin`への循環を再現。23表不変、ログは`productAcceptance=FAIL` | **製品適合PASSではない**。#210の修正確認、Native/全Role・Visual/a11y |

この3つは**実行証拠の対応付けのみ**。最終SUT/テストHEAD、Role/Seedの追加組合せ、正式期待・観測、独立レビューの判定が揃うまで、個別Caseの`execution_acceptance`も統合44条件も完了扱いにしない。

## 2026-11-08 HEAD `ea02e42b` の実Web Case・DB Artifact照合

対象はPR #199 head `ea02e42bcb203c0971ed1053e017371b16dec83f`。同HEADの[Web CI #42451813033](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42451813033)はattempt 1で全体SUCCESS。実行された[Chromium E2E (cross-role) job #128642596000](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42451813033/job/128642596000)は33テストがPlaywright上でpassed。ただし既知不具合を`test.fail`で期待失敗にしている2件も含むため、33件を正式製品CaseのPASSとはしない。

- 実ログの`PR219_CASE_RUN`は`retry=0`、`project=cross-role-chromium`で、`buildSha=634d98eddc15a1555092bb39102c16f75e7cc55d`を記録。これはPRのmerge-checkoutビルドSHAであり、branch HEADとは別。複数の`PR219_RUNTIME_METADATA`でアプリ`0.1.0`、schema`1`、seed`11`、Reset Clock`2026-07-01T03:00:00.000Z`を観測。既存テスト`e2e/web/pr219-cross-role-lifecycle.spec.ts`のGit blobは`9b398822c36e940f7065e4e2846a11c3dd4e25e5`。
- 同Runの[DB Artifact #13606091765](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42451813033/artifacts/13606091765)の実ZIPを取得・展開。ZIP SHA-256は`8ff0658f3b5f62651661ee48fe62dad5ba0a0a9ecaca5627cb31ca3a40bed415`でGitHub Artifact digestと一致。4 JSONとも`before`と`after`に同じ23テーブルが存在し、値はすべて64桁の小文字16進SHA-256。各JSONで全23ハッシュが前後一致、4 JSON間のテーブル名集合も一致。生の個人情報、Session値、DB行はArtifactに含めない。
- 照合したJSONは`pr219-suspended-login-denial-db-digests.json`、`pr219-withdrawn-login-denial-db-digests.json`、`pr219-stale-confirm-rejected-db-digests.json`、`pr219-forbidden-indexeddb-digests.json`。これは各操作のDB不変性の証拠であり、全Role/Platformの適合や画面上の不具合修正を示さない。

| 正式Case ID | 直接確認できたAssertion・Role/状態 | この時点の判定と不足 |
| --- | --- | --- |
| `PR199-CASE-SCREEN-AUTH-LOGIN-A02-01-C2` | `default` Seedで`suspended`・`withdrawn`のWebログインフォームを操作し、各拒否alert、`/login`残留、Local Session Pointer未設定、23テーブル不変。実ログは双方`testStatus=passed`、`expectedStatus=passed`、`retry=0` | **Web部分証拠あり・正式Case未受入**。C2のAndroid上の利用者向け文言・Session/SQLite、必要な状態比較と独立判定が不足 |
| `PR199-CASE-SCREEN-CHECKOUT-CONFIRM-S-stale-cart-C1` | `regular-member`で確認画面を一度表示してからCart数量を変え、再表示時に購入確認を拒否、支払うボタン非表示、23テーブル不変。固定Seedの初期Step不一致を成功根拠にしていない | **Web部分証拠あり・未受入**。`getConfirmation`の`CART_VERSION_CHANGED`直検査、C2の`beginOrder`拒否・決済/在庫/History・競合時点の網羅は別。実ログだけで両Use CaseをPASSにしない |
| `PR199-CASE-SCREEN-CHECKOUT-CONFIRM-S-stale-cart-C2` | 同HEADの`Vitest (contracts)`でconfirm-ready後のCart版変更時に、表示済み`checkoutActionVersion`を渡した`beginOrder`が`CART_VERSION_CHANGED`で拒否され、11テーブル相当の`checkoutSafetySnapshot`が前後不変であることを直接検証 | **Use Case契約の部分証拠あり・正式Case未受入**。画面上のsubmit操作、同時実行/二重送信、最終独立レビューは別判定 |
| `PR199-CASE-SCREEN-CHECKOUT-CONFIRM-S-stale-cart-C3` | 既知不具合再現テストで復帰Linkのhrefが`/checkout/payment`。7画面幅・一部axe・キーボード遷移の別テストはpassedだが、遷移先の正式適合は判定していない | **復帰先の既知差分を再観測・未受入**。Cart/該当Stepという正式要件の適合判定と修正先はPR #210。テストの緑を復帰UXの製品PASSにしない |
| `PR199-CASE-SCREEN-BOUNDARY-FORBIDDEN-A01-01-C3` | 停止operatorの生存SessionでForbidden表示後、`管理画面へ`リンクが`/admin`を指し、Enter後も`/forbidden`へ戻る循環を再現。23テーブル不変。実ログ`PR219_CASE_EVIDENCE.productAcceptance=FAIL` | **製品FAILを確認**。DB不変と既知循環不具合は両立する。PR #210による製品側修正と再実行、Android等のCase条件・独立レビューは未受入 |
| `PR199-CASE-SCREEN-ADMIN-PRODUCTS-A01-02-C3` | `many-products`の2/50ページから最低価格を変更するテストで、1ページに絞られた結果へ戻らない既知不具合を再現。`test.fail`のため実ログは`testStatus=failed/expectedStatus=failed` | **製品不具合の部分再現・未受入**。他の非keyword条件の網羅、正しい再実行・製品修正はPR #210側の判断を要する |
| `PR199-CASE-SCREEN-ADMIN-PRODUCTS-A01-02-C4` | `default`で商品1件選択後、該当商品が見えない条件へ絞っても選択が残る。`test.fail`で期待失敗を確認 | **製品不具合の部分再現・未受入**。実`bulkChangeStatus`空`targetIds`・UI例外/DB不変まではこのテストで直接検証していない |

同HEADの[Vitest (contracts) job #128642447954](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42451813033/job/128642447954)では`tests/contracts/ai-assisted-qa-checkout-confirmation.test.mjs`（Git blob `049ef7dcc4058a9b93ce82cd798fc640ffc4f562`）の16テストがPASS。268〜285行のC1向け契約は`getConfirmation()`／`getConfirmation(session.id)`と`beginOrder`の`CART_VERSION_CHANGED`拒否を検査。288〜303行のC2向け契約は表示後のCart版変化による`beginOrder`拒否と`getConfirmation`拒否を検査する。各テストはCart・Cart items・Checkout・Order・Payment・Session・Order items・Order status histories・Daily sequences・Product variants・Inventory historiesの11テーブルを前後比較する。これは製品Use Caseの実テスト根拠であって、Web画面や全Role/Platformの受入の代替ではない。

**判断境界**：この7正式Caseへの追加証拠を確認したが、採用台帳の`execution_acceptance=未受入`、`independent_review=未実施`を変更しない。33件のTest結果から959採用条件＋横断51条件の一括PASSを生成しない。製品SUT・正式仕様・既存製品テスト・Seed/Resetは変更しない。製品不具合は[独立PR #210](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/210)で扱い、修正が#199へ未統合の間は製品FAIL/未受入を維持する。次の照合はこの6件で残るRole/Android/Use Case実Assertionと、まだ直接証拠のない採用Caseを優先する。
