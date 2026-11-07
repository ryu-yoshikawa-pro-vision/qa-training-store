# PR #199：29横断要件の既存テスト再利用候補と未確認条件（2026-11-07）

## 確認範囲と判定

固定分析台帳 `training/ai-assisted-qa-course/coverage/supported-behaviors.json`（Blob `ef2f50fd65e481ca90dc64da6f88934511c9eebe`）の要件79件から、208動作の`requirement_refs`に直接現れない**29横断要件**を抽出した。内訳はBR/AC 4、権限 7、状態遷移 10、UI 2、対象範囲 6件。

29件の`requirement_analysis.case_reuse_review`にある既存テスト参照を、PR #199 HEAD `104ead3ff2826316ff460f919a41c86e3f29ec55`の**16実ファイル**で直接照合した。記録されたテスト名29件の文字列は、各ファイル内ですべて存在する。**Web証拠キーの候補43参照（重複を除く19キー、10要件）**も台帳に記録されている。

これは既存テストの再利用**候補が存在することの静的確認**であり、各testが現在の実SUT/SeedでPASSしたことや、要件の期待結果・Platform/Role・DB前後/rollback・Visual/a11yを十分に評価していることは保証しない。各要件の`acceptance_status`は依然として**未受入**で、正式Case IDの採用・実Runは独立した最終受入へ残す。

## 29要件の再利用候補と残る条件

| 要件ID | 区分 | 既存テストの参照先 | Web証拠キー候補数 | 追加で必要な確認 |
| --- | --- | --- | ---: | --- |
| `BR-NATIVE-001` | BR/AC | `tests/contracts/native-runtime-service-surface.test.ts` | 0 | WebとAndroidのLogin〜ReviewのDTO・Error・State同等実Run。 |
| `BR-NATIVE-002` | BR/AC | `tests/contracts/native-sqlite-transactions.test.ts` | 0 | Production bundleへのTest Control混入、実端末SQLite制約。 |
| `AC-NATIVE-001` | BR/AC | `tests/contracts/native-runtime-service-surface.test.ts` | 0 | Cart→Checkout→Payment→Order→ReviewのWeb/Android実行同等性。 |
| `AC-NATIVE-002` | BR/AC | `tests/contracts/native-ci-workflow.test.ts` | 0 | 成果物の本番汚染検査・Android実行/iOS build証拠。 |
| `ROLE-01` | 権限 | `tests/component/route-guard.test.tsx` | 5 | Guest Cart許可、顧客/管理Use Case・Routeの拒否とDB不変。 |
| `ROLE-02` | 権限 | `tests/integration/auth-account.test.ts` | 5 | Checkout許可、他人Order/住所と管理Routeの拒否。 |
| `ROLE-03` | 権限 | `tests/integration/auth-account.test.ts` | 6 | 停止/退会の新旧Session・Checkout拒否をWeb/Androidで区別。 |
| `ROLE-04` | 権限 | `tests/contracts/ai-assisted-qa-admin-users-list.test.mjs` | 6 | Store管理許可、User管理/CheckoutのRouteとUse Case拒否。 |
| `ROLE-05` | 権限 | `tests/integration/review-user-use-cases.test.ts` | 1 | Store/User管理許可、Checkout拒否と競合・自己変更境界。 |
| `ROLE-RANK` | 権限 | `tests/integration/checkout-order-use-cases.test.ts` | 1 | regular/gold/platinum閲覧制限と送料・Discount、表示金額との一致。 |
| `ROLE-STATUS` | 権限 | `tests/integration/review-user-use-cases.test.ts` | 2 | active↔suspended/withdrawn、再開後旧Session不復活・DB不変。 |
| `TRANSITION-PRODUCT` | 状態遷移 | `tests/integration/admin-product-use-cases.test.ts` | 0 | draft/published/unpublished/discontinued全辺・拒否/終端とversion。 |
| `TRANSITION-ACCOUNT` | 状態遷移 | `tests/integration/review-user-use-cases.test.ts` | 2 | 双方向許可・同値/旧version/actor失効拒否、Session/DB不変。 |
| `TRANSITION-CHECKOUT` | 状態遷移 | `tests/integration/checkout-order-use-cases.test.ts` | 0 | active→converted/abandoned/expiredと24h期限/再利用禁止。 |
| `TRANSITION-ORDER` | 状態遷移 | `tests/integration/admin-operations-use-cases.test.ts` | 0 | pending_payment/payment_failed含む全辺・逆遷移拒否/History不変。 |
| `TRANSITION-SHIPMENT` | 状態遷移 | `tests/integration/admin-operations-use-cases.test.ts` | 0 | pending→shipped→delivered各辺・逆転/旧version/rollback。 |
| `TRANSITION-REVIEW` | 状態遷移 | `tests/integration/review-user-use-cases.test.ts` | 0 | published↔hidden→deletedの全許可/拒否と再投稿/rollback。 |
| `TRANSITION-CART` | 状態遷移 | `tests/integration/cart-use-cases.test.ts` | 0 | consumed/abandoned終端・Cart統合・旧Cart/重複購入の拒否。 |
| `STATE-TERMINAL` | 状態遷移 | `tests/integration/review-user-use-cases.test.ts` | 0 | Product/Order/Review/Checkout/Cartの6終端を個別に逆遷移拒否。 |
| `STATE-BOUNDARY` | 状態遷移 | `tests/contracts/ai-assisted-qa-checkout-confirmation.test.mjs` | 9 | Loading/Empty/Error/Conflict/NotFound・processing中取消/再試行。 |
| `STATE-NATIVE` | 状態遷移 | `tests/contracts/native-runtime-service-surface.test.ts` | 0 | NATIVE_CUSTOMER_SCENARIOSのAndroid/SQLite/Navigationの実Run。 |
| `UI-BREAKPOINT` | UI | `e2e/web/mobile-boundary.spec.ts` | 0 | 767/768/1023/1024px・390×844と320×700、焦点/管理操作禁止。 |
| `UI-DESIGN` | UI | `tests/contracts/native-visual-contract.test.ts` | 0 | Web/Android実画面・正本画像の配色/余白/タッチ寸法比較。 |
| `SCOPE-SUPPORTED-1` | 対象範囲 | `tests/integration/catalog-use-cases.test.ts` | 0 | Facet・Sale・在庫・Variation・Review要約をWeb/Androidで実行。 |
| `SCOPE-SUPPORTED-2` | 対象範囲 | `tests/integration/checkout-order-use-cases.test.ts` | 0 | Guest→Customer Cart統合からCustomer購入・決済、Guest Checkout拒否。 |
| `SCOPE-SUPPORTED-3` | 対象範囲 | `tests/integration/review-user-use-cases.test.ts` | 0 | Order/Address/Rank/価格Snapshotと決済・配送・本人Review接続。 |
| `SCOPE-SUPPORTED-4` | 対象範囲 | `tests/integration/admin-operations-use-cases.test.ts` | 0 | Category/Brand/Product/Review/Userをoperator/adminで権限別受入。 |
| `SCOPE-SUPPORTED-6` | 対象範囲 | `e2e/web/accessibility.spec.ts` | 6 | 全対象状態・幅別のKeyboard/ScreenReader/Empty/Loading/Conflict/NotFound。 |
| `PLATFORM-NATIVE` | 対象範囲 | `tests/contracts/native-ci-workflow.test.ts` | 0 | Native顧客機能Android実行、Native管理/Guest Checkout非提供確認、iOS Build-only。 |

## 次の対応

- **既存再利用の最終判断**：参照先テストのアサーションと正式BR/AC・Role/State/Dataを行ごとに突合し、対象SUT SHA・Test SHA・Run/attempt・失敗・skipを記録する。テスト名の存在だけで採用・PASSにしない。
- **実Web証拠の照合**：上記43候補キーについて、実在するPlaywrightの実行Artifactと対象Case・画面状態を個別対応させる。候補キーの記載だけで実行済みとしない。
- **Web/Android/DB/Visual**：Native、状態遷移、認可拒否、DB rollback、320/390/767/768/1023/1024/1440px、キーボード・画面読み上げを、必要な正式Caseごとに確認する。
- **独立レビューと権利**：採用/既存再利用/不要/保留の判定者・根拠を残し、#210に委ねた製品修正の未マージ分と本人Private環境・Skill再配布許諾を混同しない。

本書の29件は79要件の内数であり、208動作へ29件の新規E2Eを機械的に追加する指示ではない。既存44受入条件のチェック数は変更しない。

## #219実行証拠CSVとの突合

`docs/reports/2026-11-04_pr219-web-case-run-evidence.csv`（Blob `d36ce7b879fd31fa72182165efa5e6545fa8bc3c`）の**50履歴行・27種類の暫定キー**と照合した。元の横断要件CSV `docs/reports/2026-11-04_pr219-cross-cutting-requirement-case-handoff.csv`（Blob `da0d14b148e94034952ae13aa3968f6d0b0cd8b2`）も全29行の要件ID・既存テストパス・候補キー・Case条件・採用方針を分析正本と比較した結果、同5項目の不一致は0件。

- 10要件が参照する**延べ43件・固有19キー**は、実Web証拠CSVにすべて存在する。ただし暫定Web証拠キーは正式Case IDではなく、複数要件から同じキーを参照する。
- 43参照のうち**38参照**には、旧HEAD・旧Runに`case_result`が`PASS`で始まり、同時に`job_result`が`success`で始まる**履歴行が少なくとも1件**ある。**これは38件の正式CaseがPASSした意味ではない**。別Run・別SUTの扱いやworkflow全体の成否、カバレッジの妥当性は別に判定する。
- 残る**5参照**は既知の製品FAILを再現した暫定キーに対応する。`PR219-WEB-024`は`ROLE-01/02/03/04`の4参照で、停止operatorの旧Session→Forbidden循環を再現。`PR219-WEB-018`は`STATE-BOUNDARY`の1参照で、Checkout競合後の戻り先が想定と異なる事象を再現。**テストジョブ成功を製品のPASSへ読み替えない**。
- Web証拠CSVの**6履歴行（`PR219-WEB-005/006/007`それぞれ2実行）**は、`behavior_id`に`BR-AUTH-001/002`という要件IDを記載し、`case_mapping_status`が「要件IDのみ・Behavior ID未確定」。これを208動作の任意のBehavior IDへ推測で割り当てない。
- 実証拠の対象Runは旧SUT・旧Test SHAであり、#210未マージの不具合修正や現在の#199の最終SUT動作を証明しない。最新版のCase採否、Rule/Role/Seed/DB前後、実行結果と独立レビューで再判定する。

**判定**：既存テスト参照29/29、横断CSV29/29との静的整合、およびWeb暫定キー43参照の実在は確認完了。製品FAIL5参照・未確定Behavior6履歴行と未実行のAndroid/DB/Visual等があるため、正式Caseの採否・動的受入・独立レビューは未完了。

## 6履歴行の実アサーション確認（3暫定キー）

`e2e/web/pr219-cross-role-lifecycle.spec.ts`の固定実装（#199 HEAD `4fbe389e3ec78298fca81ef864f288a2a4d57aad`）を直接確認した。旧Web証拠CSVでは3キーに2件ずつRun履歴があり、`case_mapping_status`は「要件IDのみ・Behavior ID未確定」のままである。

| Web暫定キー | 対象要件 | 実際に検証するAssertion | 当該要件の完了に不足すること |
| --- | --- | --- | --- |
| `PR219-WEB-005` | `BR-AUTH-001` | `suspended-user`の`/checkout/address`直アクセスがLoginまたはForbiddenへ遷移し、配送先見出しを表示しない（spec 187行付近） | **ログイン処理を実行していない**。停止中ログイン拒否、Session未生成、全DB before/afterの要件はこのCaseだけでは判定不能 |
| `PR219-WEB-006` | `BR-AUTH-001` | `withdrawn-user`で上記と同じURL・見出しの拒否（同spec 187行付近） | **ログイン処理を実行していない**。退会済みの資格情報拒否・Session未生成・DB不変を別に確認する必要がある |
| `PR219-WEB-007` | `BR-AUTH-002` | `gold@example.com`で他人の`/orders/order-paid`を開き、NotFound見出しを表示し注文番号を表示しない（同spec 198行付近） | 他人の注文非表示の代表例だが、**customer/operator/adminのログイン先、Checkout/管理権限、DB不変**の全要求を網羅しない |

上記はテストソースに記述された直接Assertionのレビューであり、最終SUTの実行PASSや全Platformの適合を再判定したものではない。**3キーを特定のBehavior IDへ勝手に付け替えず、元のWeb証拠CSVも書き換えない**。正式Case採否時に、対象要件の追加Assertion・Run・DB前後・最終SUT SHAを確認し、要件ID・動作ID・Case IDの対応を承認する。
