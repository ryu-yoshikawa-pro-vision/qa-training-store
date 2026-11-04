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

- **タスクリスト11番はまだ未完了。** 同一ユーザーでの別認証Session再開はUse Case層で確認したが、認証Sessionを変更した際のWeb Notice初回/再通知は直接実ブラウザで試していない。confirm-readyでCart版を変えた**実Webのエラー画面・安全なCart復帰**も未実施。実行結果を得てからチェックする。
- 成功テストはassertionでDB前後の一致やSnapshotを確認しているが、別ファイルとしてDB全表を永続保存してはいない。各Caseの成功時Trace/画像/Networkも未取得。`docs/reports/2026-11-04_pr219-risk-evidence-and-blockers.md`の再開条件に従う。
- 既存Caseの成功結果を最新HEADのWeb成功と呼ばない。上記2つのRunはそれぞれ記載した**実際のテストと対象固定HEADにのみ**適用する。実ブラウザを再実行するとき、Checkout UIのRole/Session/Seed/ClockとRunごとの証拠を同じ形式で追記する。
