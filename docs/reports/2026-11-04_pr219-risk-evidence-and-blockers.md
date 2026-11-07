# PR #219 リスク別の実行証拠・未受入条件・再開手順

## 判定基準

- SUTの正本はPR #199：`46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`（`docs/plan-ai-agent-qa-curriculum-redesign`）。PR #210は未マージの製品修正用別HEAD。新規受入テスト・証拠のPRは`work/pr199-sut-acceptance`。
- この文書は**現在までに実行した条件と未受入条件の整理**。Case全件・製品全体の受入PASSではない。CI jobの成功とworkflow全体の成功を区別する。
- `PASS`は明記したCase/条件と固定HEAD・ジョブログで実際に成功した範囲に限る。`DEFECT`は仕様期待に反する現象、`未実行`は証拠未取得、`BLOCKED`は実行環境や権限が不足している条件。`it.fails`や欠陥再現用の通常`it`がgreenでも製品適合PASSではない。
- 主要Run（全体結果は別判定）：
  - [#41792378802](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41792378802)：SUT/Test `5e91b912e72cd6c0bb9b683a1ae7470fb56cf833`。cross-role Chromium 15/15、Integration、Repository、required Chromium、Accessibility、Mobile Boundary、UI Reviewの各job成功。Style Quality失敗につき**workflow全体はfailure**。
  - [#41795950215](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41795950215)：SUT/Test `9adff1e41687e14d20af8ebf9ba22bf588df0605`。Integration 123 PASS＋2 expected fail、Component 104 PASS＋1 expected fail、required Chromium成功。追加Storefront 2件はcross-roleログで成功したが、同jobは管理商品新テストのlocator不一致と既存`cross-role-lifecycle.spec.ts`のstatus locator不一致で失敗。Style/Code Qualityも失敗、**全体failure**。
  - [#41796764234](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41796764234)：SUT/Test `2cd64eaff7eb64fefa7d440905702cb69a3a803b`。Code Quality、Integration、Component job成功。後続pushでRunはcancelled、Style Quality失敗。これ以降のHEADへの全体合格流用は禁止。
- 今回の最新`cad7b2f`のCI結果は本書更新時点で未確定。最新HEADが変わるたびにRun/jobを再記録する。

## リスクと実際の受入証拠

| リスク・関連Case | 対象・実行条件 | 確認済み結果（固定SHA/Run） | 未受入・再開条件 |
| --- | --- | --- | --- |
| 認証/Role・直URL `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | Web Chromium、`default`/ `regular-member`、guest/customer/operator/admin・suspended/withdrawn | Run 41792378802の`e2e/web/pr219-cross-role-lifecycle.spec.ts`。guest redirect、Role別拒否、他人Order非露出、旧Session失効の代表8件PASS | 停止staffの戻りループ、Android拒否文言、画面外DB不変、ブラウザ前後操作の完全Traceは未受入 |
| 管理ユーザー検索 `SCREEN-ADMIN-USERS-A01-02` | Web active admin・`default`、keyword＋Role＋Status。Use CaseはRank含むAND条件 | Run 41792378802でWeb複合絞込みPASS。Run 41795950215で専用Integration検索Case成功 | 管理UIのRank絞込・作成/更新日sortの仕様採否、20件超ページ、実DB全表差分と個人情報ログ確認は未受入 |
| Role変更 `SCREEN-ADMIN-USER-DETAIL-A01-02/A02-01/A02-03` | Web operator→admin、隔離Dexieでadmin2→1、自己拒否、stale CAS | Run 41792378802でWeb Role変更と旧Session失効PASS。Run 41795950215で隔離DBのRole2→1・stale CAS・対象Session削除・自己拒否の該当assertion成功 | 並行actor失効は既知不具合（下記）、他表Snapshotと独立#210修正HEAD検証は未受入。新規本人disabled Webは新HEADで別途確認 |
| Rank/Status `SCREEN-ADMIN-USER-DETAIL-A01-03/A01-04/A02-02` | Web管理者・顧客、`checkout-resume`、退会Seed。隔離DBでUser/Session/Checkout | Run 41792378802でRank表示再読込・停止後ログイン拒否PASS。Run 41795950215でRank/Status stale、withdrawn拒否、Checkout rollback/Cart保持のassertion成功 | 停止→再開の全Role、Web Conflict理由・Android・新規退会済み読取専用UIの新HEAD結果は未受入 |
| 認可→transaction競合 `A02-03` | 隔離Dexieのactor Session/Roleを`requireAdmin`後・transaction直前に失効 | Run 41795950215の旧`it.fails` **2 expected failure**。#199では拒否せずtargetが更新される現象を示す（製品**FAIL**）。#210にはtransaction内`assertActorStillAuthorized`の静的差分あり | #210固定HEADで通常の拒否Caseとして実行し、全表不変・2管理者同時更新を確認。旧SUTのgreenは受入PASSでない |
| ForbiddenRoute停止staff `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | Web Component、非active operator | Run 41795950215の既知`it.fails` **1 expected failure**。`app/forbidden.tsx`のroleのみのリンク判定との整合。製品**FAIL**の再現 | 実Web停止staff＋戻りの循環・DB非変更・Android文言/導線は未受入 |
| 管理商品 `SCREEN-ADMIN-PRODUCTS-A01-02` | Web admin、`default` P-0006、stock0/状態、selected保持 | Run 41795950215で新規検索Caseは広すぎる`getByLabel("検索")`のためテストエラー。ロケータを限定修正済みで結果待ち | Repository検索のSKU/カテゴリ/ブランド/価格、many-productsの選択残留・bulk拒否・SKU0価格、DB前後・画面正本は未受入。製品不具合はまだ断定しない |
| 商品0件 `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | Web `empty-catalog`で無条件0件、`default`でminPrice過大の絞込0件 | Run 41795950215の追加2ケースは**それぞれPASS**。無条件0件のCTAなし＋Breadcrumbs Enter、フィルタ0件の解除後一覧復帰を確認 | 失敗画面、画像比較、keyboard全操作・a11y/全幅、リセット後のDB証拠は未受入 |
| Cart数量/価格・在庫境界 | Web/Integration/Repository、stock 0/1/5/6、Rank・Sale・上限縮小 | 既存Vitest Integration/Repositoryとrequired Chromiumのjob成功は確認。PR #219の専用採用Case別の全条件証拠は未作成 | 境界値ごとのCart/CheckoutのDB前後・version・拒否後不変を追加し、個別Case/Run/Traceを収集 |
| Checkout/Payment | Web/Native、同一/別Session、24h失効、4決済コード、二重確定/在庫競合 | 既存E2E/Integrationのjob成功のみ。全選定Caseの固定SHA・DB差分・4決済網羅は未証明 | 各成功/失敗/再試行のSession/Order/Payment/InventoryスナップショットとモックGateway、Traceが必要 |
| Order/Shipment/Review | Web/Native、状態・version CAS/rollback、各スナップショットと他人情報 | 既存required ChromiumとIntegration成功、他人Order非露出はWeb代表CaseでPASS。状態遷移全件は未受入 | 操作前後のOrder/Shipment/Review/History・価格/住所/Rank Snapshotと不変を直接取得。既存cross-roleで`getByRole("status")`のstrict違反あり |
| Web画面幅/a11y | Desktop/Mobile/Tablet 320/390/767/768/1023/1024、Focus/Empty/Loading/Error/Conflict | Run 41792378802でUI Review desktop/tablet/mobile/small-mobile、Accessibility・Mobile Boundary各job成功 | 個々の320/390/767/768/1023/1024境界と正本画像の差分・焦点順・ARIA/エラー画面全条件は未受入 |
| IndexedDB/Dexie | 隔離DB、固定Clock/Seed、User/Checkout/Cartなど | Run 41795950215で失敗注入時のUser/Session/Checkout/Cart不変をassertionで確認。Run 41796764234で関連Integration成功 | 全採用CaseのDB前後の保存ファイル、決済/履歴等の全表Snapshot、秘密情報の非露出は未受入 |
| Android/SQLite `SCREEN-BOUNDARY-FORBIDDEN-A01-01`等 | Android実機または妥当なエミュレータ、`Mobile App CI`、Maestro、SQLite | **実Run未取得。BLOCKED**。Native workflowは`workflow_dispatch`のみ（PR自動実行停止中）、GitHub接続からはworkflow dispatch/Android画面制御不可 | 下記の実行条件と証拠を満たして再開する |

## Android/SQLite実行の再開条件

- 対象：PR #219の正しい固定HEADのautomation APKと、対応する同一SUT HEADで作成されたNativeデータ。違う製品HEADのAPK/SQLiteを混同しない。
- 環境：GitHub Actionsの`Mobile App CI`を`workflow_dispatch`で明示実行する権限、またはAndroid SDK/ADBが動作する実機・エミュレータ、Java/Node/pnpm、Maestro v2.8.0とautomation APK。`.github/workflows/native-ci.yml`は現時点ではPR pushで自動起動しない。
- テスト：既存`scripts/native/android-maestro-run.sh --flow maestro/<対象Flow>.yaml --test-output-dir <成果物Dir> --junit-output <結果XML>`を使用。対応するFlowに必要な`--env KEY=VALUE`を付け、ADB接続と`pm clear`/force-stop後の固定Seed・Clock/Session/Roleを確認する。SQLite前後を取得する場合、テスト用アクセス可能なDBの閲覧方法・データ持出し範囲を事前に確認する。
- 保存：APK SHA、端末/エミュレータ情報、API level、build kind、Maestro version、各Flowの実行コマンド・終了コード、Junit・動画・画像、ログ、SQLite前後、権限拒否画面・戻り動線をRun単位で記録する。個人情報や秘密情報は転記しない。
- 実行不能理由：現在接続しているGitHub API操作では実機/ADBに接続できず、`workflow_dispatch`実行操作も使用できない。このためAndroidを**PASS/FAILではなくBLOCKED（未実行）**と記録する。再開担当は実行権限と機材を用意し、本レポートに固定Runと証拠を追記する。

## Web再実行と必要な追加証拠

- 自動CI：PR #219へpushすると`.github/workflows/ci.yml`のWeb CIが実行される。各jobの終了コード・テスト名を固定HEADで確認する。中途キャンセルやCI全体failureの理由も記録する。
- ブラウザ側の不足証拠：既存`playwright.config.ts`の`trace: "retain-on-failure"`、`screenshot: "only-on-failure"`、`video: "retain-on-failure"`は成功したCaseにTrace/画像/動画を必ず保存する設定ではない。成功Caseで必要ならローカルの別Runで`pnpm exec playwright test --project=cross-role-chromium --trace=on --screenshot=on --video=on`を使用し、別Run ID・対象HEAD・テスト名と結果を紐付ける。既存共有設定・workflowはこのPRで変更しない。
- 情報保護：Token、パスワード、Session ID、実データをレポートに直接転記せず、必要ならテスト用ダミー値を使う。
- 未完了の管理：`docs/reports/2026-11-04_pr219-case-traceability.csv`の未実行Caseは未受入のまま。#213が正式BR/ACと`test_condition`/`case_policy`からCase採否を確定し、#219が実Runと照合する。

## タスクリストとの対応

本レポートによって**タスクリスト18番の「リスク別の実行証拠と未受入・BLOCKED条件および再開環境を記録する」作業**を完了とする。Android実行や採用Caseの受入を済ませたという意味ではない。その他のタスク（CaseごとのRun資料、全Web/Android/DB受入、独立レビュー）は未チェックのまま。
