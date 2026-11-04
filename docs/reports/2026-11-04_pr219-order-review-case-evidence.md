# PR #219 Order・Shipment・Review受入証拠

## 固定実行条件と実行結果

- **Web CI #41806506482**、対象テスト/SUT HEAD `8e7eddd8c9b415d6baa7407f2641b90aec7a0503`、[Vitest Integration job 126495217187](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41806506482/job/126495217187)はsuccess：全149件成功。`tests/integration/pr219-order-review-boundaries.test.ts` 3件、`tests/integration/admin-operations-use-cases.test.ts` 6件、`tests/integration/review-user-use-cases.test.ts` 9件、`tests/integration/checkout-order-use-cases.test.ts` 10件成功。
- **Web CI #41802885428**、HEAD `e5fc6a5abdd792eb3b51a6b5b9c1c1afd646811e`、[Chromium E2E (cross-role) job 126483819945](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41802885428/job/126483819945)はsuccess：既存`cross-role-lifecycle.spec.ts`の在庫変更・Review非公開・発送準備の代表Web操作が成功。
- これらのRunは**Workflow全体の成功を示さない**。後続pushのため全体がcancelledであっても、各job内の固定HEADと実行結果を分けて保存する。

## 受入Caseと観測

| 操作・条件 | 実行テスト | 観測したassertion・状態 |
| --- | --- | --- |
| Order `paid→preparing→shipped→delivered` | `admin-operations-use-cases.test.ts`、PR専用`pr219-order-review-boundaries.test.ts` | Order/Shipmentの状態・version CAS更新と履歴順序、shipped時に古いversionを`CONFLICT`拒否し不変 |
| OrderItem/住所/Rank/価格・決済Snapshot | PR専用`preserves OrderItem, Address, Rank and Payment snapshots across shipment transitions` | 配送完了後に顧客Rankをplatinum、元商品価格を9999へ変更しても、Order/OrderItem/Address/Rank/合計/Paymentの保存スナップショットが不変 |
| Review本人作成、別ユーザー拒否、stale CAS | PR専用`rejects another customer and stale version Review updates without changing DB` | 他人の`NOT_OWNER`と投稿`NOT_ELIGIBLE`、古いReview versionの`CONFLICT`、Reviews/History/Summary全表不変 |
| Reviewの障害注入rollback | PR専用`rolls back Review, history and summary when the summary update fails` | `product_review_summaries`書込みHook失敗時、Review本体・History・Summaryの全表を元に戻す |
| 注文と在庫のSnapshot・Payment再試行 | 既存`checkout-order-use-cases.test.ts` | 同じOrderで重複決済が発生せず、成功後に在庫1回減、失敗→再試行のPayment/OrderHistory整合、Price/Rankの記録整合 |
| Shipment履歴書込みの障害注入rollback | 新規`rolls back Shipment and Order when history persistence fails` | `order_status_histories`作成時に例外を発生させ、Shipment・Order・Historyの操作前後全表不変を要求。**追加HEADでのCI実行結果は未確認** |
| Webの他人Order非露出 | `e2e/web/pr219-cross-role-lifecycle.spec.ts`、Run #41802885428 | 自分以外の注文直URLを開いても、他人の注文情報が表示されないことを確認 |
| Android SQLite/成功時Trace/画面正本 | Native/視覚受入 | **未実行・未受入**。必要環境と再開条件は`2026-11-04_pr219-risk-evidence-and-blockers.md`へ記録 |

## タスクリストとの関係

- 12番はOrder/Shipment/Reviewの状態、version、Snapshot、本人/別ユーザー、Review rollbackを固定Runで確認済み。今回追加の**Shipment履歴障害時rollback**のCIが実行されるまでチェックしない。
- 採用CaseごとのWeb画面/DB Snapshot保存ファイル・成功時Trace・Android/SQLiteは2番・13番・14番・15番・20番の範囲として残す。製品SUT・既存製品テスト・Seed/Resetは変更しない。
