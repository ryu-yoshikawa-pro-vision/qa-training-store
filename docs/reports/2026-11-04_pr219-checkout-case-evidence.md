# PR #219 Checkout受入のCase別証拠・不足条件

## 実行対象と固定HEAD

- 分析元：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`（Blob `3143b229afd6dddad52ef7c09a9e91c5995af07f`）。`SCREEN-CHECKOUT-ADDRESS-S-resume-notice`、`SCREEN-CHECKOUT-CONFIRM-S-stale-cart`と関連するBR-CHECKOUT-001/002/003、AC-CHECKOUT-001/002/003を照合対象にする。
- 実行確認①：[Web CI #41802885428](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41802885428)、SUT/Test HEAD `e5fc6a5abdd792eb3b51a6b5b9c1c1afd646811e`、Vitest Integration job `126483407429`：**139件成功**。対象`tests/integration/pr219-checkout-boundaries.test.ts`の**5件成功**、既存`tests/integration/checkout-order-use-cases.test.ts`の**10件成功**。同RunのStyle Quality、Code Qualityも成功。全Workflowの判定は別。
- 実行確認②：[Web CI #41792378802](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41792378802)、SUT/Test HEAD `5e91b912e72cd6c0bb9b683a1ae7470fb56cf833`、required Chromium job `126449277022`：Web E2E `ui-ux-improvements.spec.ts`の「Flow C: Checkout再開・置換Noticeの一度限り表示」を含め、**64件成功**。同RunのWorkflowはStyle失敗でfailure。今回の#219最新HEADにおけるWeb再実行と混同しない。
- 共通：既存Seed/Reset、製品SUT、`docs/spec/**`、既存製品用E2EやCI workflowは変更しない。新規テストは隔離したDexie DBと固定Clockでのみ実行。

## Caseと期待・観測の対応

| 条件・Screen | 既存/新規テスト、Role/Seed・Clock | 期待・観測・操作前後 | 判定 |
| --- | --- | --- | --- |
| Checkout住所再開通知（初回、同Session Reload） | `e2e/web/ui-ux-improvements.spec.ts:141`、`checkout-resume`、regular顧客、CI 41792378802 | 初回「以前の購入手続きを再開しました。」が表示され、同タブReload後には再表示されない | 当該Web条件PASS（古い固定HEAD） |
| Reset後の再通知・旧Cartとの置換 | 同Spec `checkout-resume` Reset→`checkout-replaced` | Reset後の再通知、version不一致時の置換文言の表示 | 当該Web条件PASS（古い固定HEAD） |
| 同一ユーザーの異なる認証Sessionから再開 | 新規`pr219-checkout-boundaries.test.ts`、`default`、regular顧客Session A→B、`2026-07-01T04:00:00Z` | `startOrResume`が同じCheckout ID/versionを返し、Address Snapshot・Checkout表が不変 | Integration PASS（Run 41802885428） |
| 別ユーザーによるCheckout ID参照 | 新規同Spec、regular作成→gold Sessionで確認 | `NOT_FOUND`・Checkout表の前後不変 | Integration PASS（同Run） |
| Checkout versionの古い更新 | 新規同Spec、start→setAddress→旧versionでsetPayment | `CONFLICT`・Checkout/Order/Payment表の前後不変 | Integration PASS（同Run） |
| 24時間の有効・期限境界 | 新規同Spec、`2026-07-01T04:00:00Z`開始→`2026-07-02T03:59:59Z`有効→`2026-07-02T04:00:00Z`失効 | 期限直前の`getActive(confirm)`許可、期限到達後`CHECKOUT_EXPIRED`・active→expired。Order/Payment/Variant/Inventory Historyは不変 | Integration PASS（同Run） |
| confirm-ready後の古いCart | 新規同Spec、`default` regular、start→setAddress→setPayment→Cart version+1 | `getConfirmation`と`beginOrder`双方`CART_VERSION_CHANGED`。Cart/Checkout/Order/Payment/Variant/Inventory Historyは拒否後不変 | Integration PASS（同Run）。**確認画面のWeb戻りリンク未受入** |
| 4種のモック決済 | 既存`checkout-order-use-cases.test.ts`：`TEST-SUCCESS`、`TEST-DECLINED`、`TEST-INSUFFICIENT`、`TEST-AUTH-FAILED` | successでpaid・在庫1回減・Snapshot保持。失敗3種でコード整合・在庫不減・Shipmentなし | Integration PASS（同Run） |
| 再試行と二重確定 | 同既存Spec `prevents duplicate submit`、`creates a fresh attempt on retry` | 重複注文/決済作成なし、失敗後の再試行で別Payment Attempt・履歴日時一致 | Integration PASS（同Run） |
| 在庫競合と価格/Rank差 | 同既存Spec `turns a post-submit stock change`、`does not create an order when price or rank revalidation fails` | 在庫変更後決済失敗・在庫履歴なし、価格不一致なら注文なし、Rank変更後Snapshot反映 | Integration PASS（同Run） |
| Web実画面でのconfirm-ready stale Cart | `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` C3/C4 | Cart確認/再手続きリンクの表示、ループせず復帰、押下後の画面・注文状態 | **未受入**。現`CheckoutLoadError`の戻り先`/checkout/payment`と正式Cart復帰要件の差を#213/#210へ引継ぎ |
| AndroidのCheckout/SQLite | Native/実機の固定Seed、Role/Session、DB | APK/端末/Run/SQLite前後/動画/画像・戻る操作 | **BLOCKED**。実機・SDK・Maestroまたは手動workflow dispatchが必要 |

## 検証結果の限界と次の受入

- **タスクリスト11番の最新判定は末尾の追加Web確認に従う。** 従来未実施だった別認証SessionのWeb通知とconfirm-ready後の戻り導線は、CI #41811366480で検証し、戻り導線の製品不具合を再現した。
- 成功テストはassertionでDB前後の一致やSnapshotを確認しているが、別ファイルとしてDB全表を永続保存してはいない。各Caseの成功時Trace/画像/Networkも未取得。`docs/reports/2026-11-04_pr219-risk-evidence-and-blockers.md`の再開条件に従う。
- 既存Caseの成功結果を最新HEADのWeb成功と呼ばない。上記2つのRunはそれぞれ記載した**実際のテストと対象固定HEADにのみ**適用する。実ブラウザを再実行するとき、Checkout UIのRole/Session/Seed/ClockとRunごとの証拠を同じ形式で追記する。

## Checkoutの追加Web確認と11番の検証完了（CI #41811366480）

- **検証した固定HEAD**：`83fb0325d6efc7d2a517561e52f32bfe793f5986`、[Web CI #41811366480](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)全体success。[cross-role Chromium job 126512596197](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/job/126512596197)で`SCREEN-CHECKOUT-ADDRESS-S-resume-notice: new login retains the one-time notice boundary`が**個別PASS**。このRunでは専用の2件の製品期待失敗もあり、それらのテスト成功をSUTの適合PASSと数えない。
- Webで`checkout-resume`固定Seed→既存Sessionで初回住所再開通知1回→Reloadで再表示なし→Logout→同じregular会員として再Login（Session IDが実際に変更されたことをassert）→住所画面へ戻り、通知の重複・置換通知なしと画面復帰を確認。表示文言と画面・Role/Sessionを個別のE2E assertで検証。DB全表のWeb実行前後dumpは未取得。
- 同Runの[Integration job 126512202112](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/job/126512202112)はsuccess：`pr219-checkout-boundaries.test.ts`5件、既存`checkout-order-use-cases.test.ts`10件を含む。別Sessionで同一Checkout ID/version復帰と住所Snapshot不変、24時間期限、旧Checkout versionとconfirm-ready後の旧Cart、4種決済/再試行/二重注文防止/在庫競合のassertionを確認。関連Webの同一Session Reload/Reset・置換通知は既存`ui-ux-improvements.spec.ts`の[先行Run #41792378802](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41792378802)で成功。
- **製品FAIL**：同じ[Web CI #41811366480](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)の`KNOWN DEFECT REPRO: confirmed Checkout returns to payment instead of Cart`で、confirm-ready後にCart数量を変更すると確認画面は拒否されるが、`戻って確認する`のリンク先が`/checkout/payment`となる現象を再現。正式な復帰導線の要件と照合して#210/#213へ引き継ぐ。これをCheckout UIの合格とは判定しない。
- **11番を検証と結果分類の完了としてチェック**：列挙された住所再開・Session・期限・Cart競合・決済/再試行・二重確定・在庫を実行し、正常PASSと既知の製品FAILを区別した。製品不具合の修正と#210新HEADでの再受入、Android/SQLite、成功時Traceと保存済みDB全表は別タスク（14、15、20等）として残す。cross-roleで撮影したPNGは当該成功jobのHTML Reportへの添付であり、[Run #41811366480のArtifact一覧](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)にはcross-role Report自体が見当たらないため、画像が永続公開されているとは主張しない。

## stale Cart拒否時のDB10表不変Case（実行待ち）

- #219専用`e2e/web/pr219-cross-role-lifecycle.spec.ts`へ、confirm-ready CheckoutをCart数量変更でstaleにした後、`/checkout/confirm`へ再遷移した時点で注文・決済・配送を作成せず、Cart/Checkout/在庫履歴の既存状態を変更しないことを検証する**独立したWeb E2E**を追加した。
- 対象表は`carts`、`cart_items`、`checkout_sessions`、`orders`、`order_items`、`daily_sequences`、`payments`、`shipments`、`order_status_histories`、`inventory_histories`の10表。読み取り専用IndexedDB transactionから表別SHA-256を計算し、拒否画面表示の前後で一致をassertする。支払ボタンが表示されないことも確認する。
- 認証情報・個人情報・レコード実値はCIログへ出さない。TestInfoへの添付はdigestのみ、jobログへは条件・表数・一致判定のみを出力する。既存Forbidden Caseでも同じdigestヘルパーを再利用し、テスト内の重複実装を削減した。
- テスト追加コミット`b9a032b6d690eaea5dbb7e02276cf3d2971cba47`、ログ補完`c0821559ea3cc776f945893e7e45cad3cc54c807`。**新E2EはCI未確認であり、DB10表不変はまだ実証済みではない。** 既存Web E2Eの製品不具合（stale Cartの戻り先が`/checkout/payment`）は別判定。Android SQLite/実機や他のCaseのDB前後・取引rollbackまでは検証しない。

## 固定CI #41824802868：DB10表不変Caseの実証（2026-11-04）

- 実行時のPR #219 HEAD：`681e55c7105e436b045c59a65d5fdd64d5b27723`。製品SUT：#199 base `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。Linux Chromium、`pnpm exec playwright test --project=cross-role-chromium`。Run [#41824802868](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41824802868)、cross-role job [#126557496126](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41824802868/job/126557496126)は**success**。
- 新規Case `SCREEN-CHECKOUT-CONFIRM-S-stale-cart: rejected confirmation preserves DB transaction tables`（当該HEADの`e2e/web/pr219-cross-role-lifecycle.spec.ts:362`）が**1回目PASS**。ログの`PR219_CASE_EVIDENCE`に`condition=rejected-confirm-no-db-mutation`、`tableCount=10`、`allTablesUnchanged=true`。拒否画面の見出しと確認見出し/支払ボタン非表示もassert済み。10表のbefore/afterハッシュ一致の実証であり、Native SQLite、DB外通信、他経路の失敗注入・rollbackを実証したわけではない。
- 同ジョブでは7幅/axe/KeyboardのCheckout競合表示もPASSしたが、実際の戻り先は依然`/checkout/payment`（既知の製品不具合）。Forbidden停止staff循環は全23表ハッシュ不変を再確認したが、誘導ループ自体は製品不具合のまま。
- 当該Runは**workflow全体failure**。Style Quality job `126556819280`が専用E2EのPrettier違反でfailure、既存cross-role E2Eに2件の初回失敗→retry成功がある。Prettier整形修正コミット `6455a4df31190e00cfff0d2f3cce795170d579a0`の別Run #41826050155ではStyle Quality job `126560935572`が**success**。後続RunをDB Caseの再実行実績と混同しない。
- 今回の証拠キーは`PR219-WEB-025`。Web証拠表は42履歴行、208動作一覧の`SCREEN-CHECKOUT-CONFIRM-S-stale-cart`へ連携。キーは正式採用Case IDではなく、#213側のBR/AC/Condition/Case判断待ち。成功時TestInfo添付のハッシュ本体・Trace・動画はCI Artifactに公開されておらず、ジョブログには結果真偽のみを残している。

## 全CI成功の再実行 #41826786410（2026-11-04）

- #199 SUT `46cd014e`、PR #219テストHEAD `c1ff77fbfaaf56bb2292da53ab1b8f2cb3748c5e`。workflow [#41826786410](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41826786410)は**success**。cross-role job `126564385617`の`e2e/web/pr219-cross-role-lifecycle.spec.ts:365`でstale Checkout拒否によるDB10表不変が個別PASS。ジョブログの`PR219_CASE_EVIDENCE`は`tableCount=10`、`allTablesUnchanged=true`。
- 同HEADの`413`行では幅7条件・axe2幅・キーボードによる復帰のassertが個別PASS。ただし`/checkout/payment`に戻る製品不具合を再現している。全CI成功をその製品不具合の解消と誤解しない。
- 上記2条件は従来の`PR219-WEB-023/025`の**Run履歴追加**であり、正式なCase IDの採用ではない。実行前後digest本体、画像、Trace/動画は成功時Artifactに保存されず、実測ClockはTestInfo添付を取得できていない。正式要件の全Case受入、Android SQLite、失敗注入やrollback全条件は未完。
