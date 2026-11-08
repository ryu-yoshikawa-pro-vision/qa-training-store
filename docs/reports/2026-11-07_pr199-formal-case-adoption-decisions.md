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

## 2026-11-08 正式Caseの条件別実行観点（既存採用IDを維持）

### C1〜C3一括記述の11横断要件

横断要件の[引継ぎ原文](./2026-11-04_pr219-cross-cutting-requirement-case-handoff.csv)では、下表の11要件はすべて「C1〜C3採用」と**一括**記載されている。[横断正式Case CSV](./2026-11-07_pr199-cross-cutting-case-adoption-decisions.csv)は各要件についてC1・C2・C3の3 Caseを採用済みである。以下は正式仕様と引継ぎ原文から**実行時に個別照合する観点**を分けたもので、原文に存在しない個別C番号が確定済みだったと主張しない。検証者は対象Caseに対しRole/Seed/Version・実Assertion・Web/Android・Run/Artifact・DB前後を記録し、不足があれば未受入とする。

| 要件 | C1で照合する観点 | C2で照合する観点 | C3で照合する観点 |
| --- | --- | --- | --- |
| `BR-NATIVE-001` | 同SeedのWeb/NativeでLogin・Accountの共有DTO/Role/エラーを照合 | Cart→Checkout→Payment→Orderの状態・金額・エラー/Versionの契約を照合 | Reviewの状態・所有者/エラーとNative管理機能非提供を照合 |
| `BR-NATIVE-002` | automation/local環境だけがTest Control/Harness/bridgeを提供することを検証 | Production bundleの対象モジュール・画面・サービス・markerが除外されることを検証 | Native SQLite排他transaction・外部キー制約・失敗時rollbackを検証 |
| `AC-NATIVE-001` | Web/NativeのCart→Checkout→Paymentの購入経路と拒否を照合 | Orderの本人所有・状態・金額・エラーを照合 | Reviewの本人操作と管理権限非混入を照合 |
| `AC-NATIVE-002` | Automation buildで許可されたHarness/Test Controlへ到達できるか検証 | Production bundleのTest Control/marker/サービス混入なしを検証 | Android実RunとiOS buildのみの保証境界を区別する |
| `ROLE-01` | guestの公開閲覧とGuest Cart許可を確認 | guestのCheckoutと顧客個人データをRoute・Use Caseで拒否 | guestのStore/User管理を拒否し、拒否前後のSession/DB不変性を確認 |
| `ROLE-02` | active customerのCart/Checkout・本人データ操作を確認 | 別customerの住所・Order・個人データをRoute・Use Caseで拒否 | active customerの管理Route・Use Caseを拒否しSession/DBを照合 |
| `ROLE-03` | suspended customerのログイン拒否・新Sessionなしを確認 | withdrawn customerのログイン拒否・新Sessionなしを確認 | 旧Session失効とCheckout拒否、必要なDB不変性をWeb/Nativeで確認 |
| `ROLE-04` | active operatorのStore管理許可を確認 | operatorのUser管理をRouteとUse Case双方で拒否 | operatorのCheckoutを拒否し、Guest閲覧だけが許可される境界を確認 |
| `ROLE-05` | active adminのStore管理許可を確認 | adminのUser管理許可を確認 | adminのCheckout拒否と顧客業務への権限混入なしを確認 |
| `ROLE-RANK` | regular会員の閲覧・表示価格・送料を確認 | gold/platinumのランク制限・割引・送料を境界値で比較 | Rank変更後の旧Checkout失効・再計算を照合 |
| `ROLE-STATUS` | active↔suspendedの許可された遷移と拒否を確認 | withdrawn終端・変更禁止を確認 | 状態変更時の既存Session失効・再開後の再ログイン・Checkout/DB不変性を確認 |

上表は既存原文からの**検証項目の整理**であり、正式仕様で保証されないNative管理機能や外部決済接続を付け足さない。3件ずつを同一の既存テスト名で一括PASSにしない。BR/ACの根拠は[ネイティブ顧客機能](../../docs/spec/features/native-customer.md)、権限・状態の根拠は[ロールと権限](../../docs/spec/roles-and-permissions.md)。共通Caseの既存テスト候補は元CSVの`existing_test_candidate`を参照する。**原文のC1〜C3を変更・再番号付けしていない**ため、動的実行の正式判定と独立レビューでは、個別期待の採用可否も確認者が記録する必要がある。

### `SCREEN-ORDERS-LIST-A02-03`の条件記述の相違

この動作の正式CSVはC1〜C6の6件を採用するが、分析`test_condition`にはC3〜C6だけが明示され、C1/C2は冒頭にまとめて記されている。一方、同動作の`case_policy`は **C1＝payment_failed/DECLINEDとpaid/succeededの比較、C2＝Webの表示文言・tone、C3＝Nativeの状態文字列** と区分する。この対応を元の分析記録に遡って確認した。引継ぎ元ではないC1/C2の新規判定・新しい期待結果を捏造せず、正式Case IDに対するRole/Seedと実Assertionを個別に確認する。

### 4.5の5引継ぎの静的照合

同じPR HEAD `8c2960863abba41ef58c8a9805a188869588f127` で、M02→M03（1入力）、M04→M05（2入力）、M05→M06（1入力）、M07→M08（4入力）、M09→M10（2入力）のState JSONを直接確認し、採用された入力計10件すべてで`artifact_id`・`path`・`revision`・`contract_id`が出力と一致。M05からの出力2件のうちM06が受け取るのは`M05-result-01`だけで、**出力の一部を次章の任意入力にしない契約**として記録した。これだけで本人提出物の内容・source SHA・実Run・P04/P05本人判断を完了扱いしない。未確認の4.5、6.3、独立レビューは未受入のまま。

## 2026-11-08 固定HEAD `8c296086` のWeb実証拠と横断Caseの部分照合

対象：PR #199 HEAD `8c2960863abba41ef58c8a9805a188869588f127` の[Web CI #42468179971](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42468179971)（`completed/success`）、[Chromium E2E cross-role job #128692770347](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42468179971/job/128692770347)と同版の`e2e/web/pr219-cross-role-lifecycle.spec.ts`（Git Blob `49f02c9de10fde0e2f9fad160982e9a44a61f2c9`）。CI実行記録のcheckoutはPR merge SHA `fb0bd83eac9d011c991dbb96fb4cb6fef3f8ee2a`であり、branch HEADと同一SHAではない。実際の`PR219_CASE_RUN`に対象testの`testStatus=passed`・`expectedStatus=passed`・`retry=0`があることを確認した。

同Runの[DB digest Artifact #13611754078](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42468179971/artifacts/13611754078)をダウンロードして検査。ZIP SHA-256 `8205eb64946fe4c0cf4cd2d88627eb1b05c09151485d41b690766113918e314b`がGitHub digestと一致し、CRC破損0。**4つのJSON（stale Checkout、suspended login、withdrawn login、停止operatorのForbidden）ごとに23テーブルのbefore/after digestが一致**。JSONはhash値のみで業務row・認証情報を出力しない。この不変性は各拒否処理に限定し、全CaseのtransactionやNative SQLiteの保証ではない。

| 採用済み横断Case | 対応する実Web操作とAssertion（上記cross-role job） | 残る条件 |
| --- | --- | --- |
| `PR199-CASE-REQ-ROLE-01-C2` | guestで`/checkout/address`へ直接アクセスすると`/login`に遷移し、配送先見出しが表示されない（test 167–179行） | Use Case直呼び、Android、Session/DB全表比較 |
| `PR199-CASE-REQ-ROLE-01-C3` | guestで`/admin/users`へ直接アクセスすると`/login`へ遷移し、管理見出しが表示されない（同test） | Store/管理の全Route、Use Case直呼び、DB不変性 |
| `PR199-CASE-REQ-ROLE-02-C2` | gold customerが他者の注文詳細を開くとNot Found画面となり、本人以外の注文番号を表示しない（284–292行） | 他人の住所・Cart/Order全操作、Android・DB |
| `PR199-CASE-REQ-ROLE-02-C3` | active customerの管理画面直URLが`/forbidden`となり、ユーザー管理見出しが存在しない（181–195行） | 管理Use Case直呼び・全Route・Android/DB |
| `PR199-CASE-REQ-ROLE-03-C1` | suspended顧客のWebログインを拒否、`/login`残留、Session pointerなし、23表のdigest不変（241–282行） | 実Use Caseの全状態、Android SQLite、他Session |
| `PR199-CASE-REQ-ROLE-03-C2` | withdrawn顧客に対し同じ拒否・Session pointerなし・23表不変を独立Runで確認（241–282行） | 退会後の既存Session、Android SQLite、全Role |
| `PR199-CASE-REQ-ROLE-03-C3` | suspended/withdrawn Seedで`/checkout/address`直アクセスを拒否し、配送先見出しなし（229–239行） | 既存Session失効の動的検査、Checkout Use Case、Android・全表不変 |
| `PR199-CASE-REQ-ROLE-04-C1` | active operatorが`/admin/inventories`を開き「在庫管理」を表示（197–213行） | Store管理全機能の許可・更新・履歴 |
| `PR199-CASE-REQ-ROLE-04-C2` | 同operatorで`/admin/users`は`/forbidden`となり管理見出しは表示されない（同test） | User管理Use Caseの直拒否・DB不変 |
| `PR199-CASE-REQ-ROLE-04-C3` | operatorの`/checkout/address`は`/forbidden`（同test） | Checkout Use Case直拒否・Native/DB |
| `PR199-CASE-REQ-ROLE-05-C2` | active adminが`/admin/users`を開き「ユーザー管理」を表示（215–227行） | User管理の全操作・自己/最後admin禁止条件 |
| `PR199-CASE-REQ-ROLE-05-C3` | adminが`/checkout/address`へ進むと`/forbidden`、配送先見出しなし（同test） | Checkout Use Case直拒否とDB/Session不変 |
| `PR199-CASE-REQ-ROLE-STATUS-C1` | 管理UIからactive customerをsuspendedへ変更し、再ログイン拒否のalertを検証（388–408行） | suspended→active復帰、version競合、全Sessionとrollback |
| `PR199-CASE-REQ-ROLE-STATUS-C2` | withdrawn顧客の管理画面にランク/変更/再開操作がない（372–386行） | Use Caseでの終端変更拒否・DB不変 |
| `PR199-CASE-REQ-ROLE-STATUS-C3` | operator→adminへの役割変更後、古いLocal Session pointerを復元して管理画面へ進むと`/login`（295–322行） | **状態変更による**全旧Session失効、再開後の新認証、Android/SQLite |

上記15 Caseは**Run根拠を照合した部分証拠**であり、既存の条件を狭めたり正式仕様の全期待値を満たしたと判断したりしない。横断CSVの`execution_acceptance=未受入`・`independent_review=未実施`は維持する。サポートされたログイン・認可経路の確認と、停止operatorの[既知Forbidden循環FAIL](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/210)は両立する。cross-role jobの`test.fail`期待失敗2件と既知不具合再現の緑色も、製品PASSとはみなさない。

## 2026-11-08 Android実機相当Runtimeの横断Native Case部分照合

対象：固定HEAD `a367f5e7019e8705bca1f49a4d8418b199c61040` の[Mobile CI #42456368784](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42456368784)（全体SUCCESS）と[Native Runtime Artifact #13608233136](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42456368784/artifacts/13608233136)。実ZIPのSHA-256 `c2e4227f839763e209c45aef85d6cb803e26a7c93b9a5b632892ae0be6f983a2`はGitHubと一致、CRC破損0。Android API 34のエミュレータ上でMaestro JUnit 17 Suite全件成功、失敗0を確認済み。以下の対象flow YAMLは現PR HEADでもGit Blobが同一であることを照合した。これは**最新PR HEADのMobile CI成功**を意味しない。

| 採用済み横断Case | 実行が示したNative側の部分証拠 | 未確認の範囲 |
| --- | --- | --- |
| `PR199-CASE-REQ-BR-NATIVE-001-C1` | `native-purchase`がデフォルトSeedからログインして顧客Cart操作へ進む | 同SeedのWeb/NativeのAccount DTO・Role・Error完全一致 |
| `PR199-CASE-REQ-BR-NATIVE-001-C2` | `native-purchase`がCart数量・Address・Payment・Confirmation・注文完了・Order一覧への遷移を確認 | Webとの同一DTO・金額/Version/DB状態の比較 |
| `PR199-CASE-REQ-BR-NATIVE-001-C3` | `native-review`が対象注文からReviewを入力して「レビューを保存しました」を確認 | ReviewのWeb/Native同等性・全所有者/エラー・権限の網羅 |
| `PR199-CASE-REQ-BR-NATIVE-002-C1` | `native-test-control`と`native-contract-harness`がAutomationでTest runtime readyとHarness表示を確認 | 開発版の全入出力とProductionとの差分監査 |
| `PR199-CASE-REQ-BR-NATIVE-002-C2` | `native-production-validation`が本番画面でHarness不可・Automation marker非表示を確認 | Production bundleの全モジュール・import・文字列の静的除外検証 |
| `PR199-CASE-REQ-BR-NATIVE-002-C3` | `native-contract-harness`がAndroid UI上の「Native contract passed」を確認 | 業務SQLite全テーブル・全失敗注入点のrollback、外部キー違反全境界 |
| `PR199-CASE-REQ-AC-NATIVE-001-C1` | 購入flowでCart→Checkout→Paymentへ進み、注文完了を表示 | Webとの一致・失敗条件・全Role/State |
| `PR199-CASE-REQ-AC-NATIVE-001-C2` | 購入後の注文一覧が表示された | Orderの本人限定・金額・Payment/Shipment/History整合とWeb同等性 |
| `PR199-CASE-REQ-AC-NATIVE-001-C3` | Review入力と保存通知を確認 | 権限のない操作、他者レビュー、Native Admin非混入全境界 |
| `PR199-CASE-REQ-AC-NATIVE-002-C1` | AutomationのTest Control/Harnessへ実端末環境で到達 | 自動化API全経路とproduction拒否を同一条件で網羅 |
| `PR199-CASE-REQ-AC-NATIVE-002-C2` | Production validationで専用Harness・実行ボタン・結果を非表示と確認 | binary/bundle内部のMarker/Service/Moduleを全件検索する検証 |
| `PR199-CASE-REQ-AC-NATIVE-002-C3` | Android 17 Suite成功、同固定HEADではiOSは独立ビルド検証のみ | 最新HEADのMobile CI、iOS実機・Simulator実Runの保証外範囲 |

上記12 Caseは**既存成功Runの補助証拠**であって新たな12件の受入完了ではない。上のWeb部分証拠15件と合わせて横断Case **27/51件に少なくとも一部の実Run根拠**を紐付けたが、51件の`execution_acceptance`と`independent_review`は変更していない。実Web/Androidの同Seed・同DTO比較、セキュリティ/rollback、現HEADのMobile外部HTTP 504と独立レビューは未受入である。

## 2026-11-08 横断Caseの既存Use Case・Policy実Run照合（追加10件）

対象：固定PR HEAD `7cc5ef3cdb5647ac359f1ad8d2a516f56cf3841a` の[Web CI #42471513178](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42471513178)（全体SUCCESS）。[Vitest (unit) job #128703136379](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42471513178/job/128703136379)は66テストPASS、[Vitest (integration) job #128703136446](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42471513178/job/128703136446)は150テストPASS。ジョブログで以下の6テストファイルの成功行を直接確認した。CIはPR merge-checkoutの実行であり、branch HEADの文字列一致を根拠にせず、記載したテストのBlob/Assertionを固定HEADで確認した。既存製品テストを変更・再実装していない。

下表は採用済み横断Caseの**新たな10件に、実行されたPolicy/Use Caseの部分証拠**を対応付けたもの。テストの合格はCase全条件の動的受入や独立レビューの合格ではない。

| 採用済み横断Case | 直接実行されたAssertionと根拠ファイル（行） | 未確認の条件 |
| --- | --- | --- |
| `PR199-CASE-REQ-ROLE-RANK-C1` | `tests/unit/policies.test.ts:19–55`はregularでgold制限商品を拒否。`tests/unit/pricing.test.ts:38–58`はregularの割引0・送料判定を検証 | 画面上の価格/閲覧、Role・Seed別のAndroid実操作 |
| `PR199-CASE-REQ-ROLE-RANK-C2` | 同Policyでplatinum/gold制限の可否、同Pricingでgold 5%・platinum 10%と送料計算を検証（`pricing.test.ts:22–58`） | 制限商品全種類、境界値・端末表示と実DB計算 |
| `PR199-CASE-REQ-ROLE-RANK-C3` | `tests/integration/review-user-use-cases.test.ts:276–295`でrank変更→旧Checkout abandoned・Cart保持。`checkout-order-use-cases.test.ts:332–355`で新rankを注文snapshotへ反映 | 旧Checkout全API拒否、再確認の画面・金額・Session・競合と全23表 |
| `PR199-CASE-REQ-TRANSITION-ACCOUNT` | `review-user-use-cases.test.ts:297–350`で役割変更後Session全失効・停止/withdrawn拒否を検査。`tests/unit/policies.test.ts:68–80`で許可/拒否の遷移を検査 | 同時Version競合、全拒否経路のDB/Session・Web/Android。PR追加の全23表契約は後続HEADで別途検証 |
| `PR199-CASE-REQ-TRANSITION-CHECKOUT` | `checkout-order-use-cases.test.ts:116–135`でactive Sessionの作成/再開/Cart版不一致拒否・旧Session abandonedを実検証 | 24時間期限/expired/converted終端、競合・全DB rollbackとWeb/Android |
| `PR199-CASE-REQ-TRANSITION-ORDER` | `checkout-order-use-cases.test.ts:277–330`で決済失敗→再試行→paidと履歴・決済試行の整合、`admin-operations-use-cases.test.ts:179–230`でpaid→preparing→shipped→deliveredと旧Version拒否 | 逆遷移・全失敗条件・各段階のDB全表・別Role/Platform |
| `PR199-CASE-REQ-TRANSITION-SHIPMENT` | `admin-operations-use-cases.test.ts:179–230`でpending→shipped→delivered、追跡番号、配送時刻と注文Version・Historyを比較 | 失敗時のShipment/Order原子rollback、逆転/重複、全表不変 |
| `PR199-CASE-REQ-TRANSITION-REVIEW` | `review-user-use-cases.test.ts:66–124`で本人レビューの作成/更新/削除と公開集計、`242–260`でpublished→hidden・History/集計、`157–201`で投稿拒否を検証 | hidden→published/削除終端の全組合せ、他者・競合・DB全表 |
| `PR199-CASE-REQ-TRANSITION-CART` | `cart-use-cases.test.ts:103–143`でabandoned済みCart再利用を拒否して新Cart生成。`checkout-order-use-cases.test.ts:155–227`で注文・Payment・Inventory更新の一回性を検証 | Guest Cart統合時のabandoned、購入後consumedの直接状態比較、全競合・rollback |
| `PR199-CASE-REQ-STATE-TERMINAL` | `tests/unit/policies.test.ts:68–80`でdiscontinued→published、deleted→published、expired→activeを拒否。`review-user-use-cases.test.ts:157–201`で削除済みReview再投稿拒否 | delivered/converted/abandonedを含む全終端のUse Case直呼び、VersionとDB/Session不変 |

**進捗の境界**：従来のWeb 15件＋Native 12件に、上記の異なる10 Caseを加え、横断51条件のうち **37/51件には少なくとも一部の実行証拠が紐付く**。これは**37件PASS**や、残る14件にテストが存在しないという意味ではない。複数のCaseで同じ実Runを再利用しているが、テスト件数をCase件数へ換算していない。実装された画面・Use Case・Role/Seed/State/Platform/DBの全期待結果、既知製品FAIL、本人環境、独立レビューを満たすまでは全51件の`execution_acceptance=未受入`・`independent_review=未実施`を保持する。作業6.3と上位8作業は未完了、個別検証20/39を変更しない。

**次の照合対象**：まだ部分証拠を直接結び付けていない横断14件（`STATE-BOUNDARY`、`STATE-NATIVE`、`UI-BREAKPOINT`、`UI-DESIGN`、`SCOPE-SUPPORTED-1/2/3/4/6`、`PLATFORM-NATIVE`、および他の残件）について、実CI/ArtifactとCaseの個別期待を突合する。画面幅やa11y、Nativeの主張は、Policy/Use Caseの緑だけで代用しない。
