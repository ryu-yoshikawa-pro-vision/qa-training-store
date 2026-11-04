# PR #219 基本分析台帳IDと実Run Caseの引継ぎ

## 参照した正本・判定境界

- 対象SUT＝PR #199 base `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`（`docs/plan-ai-agent-qa-curriculum-redesign`）。検証テスト＝PR #219 `work/pr199-sut-acceptance`。検証した個別RunのHEADは下表で個別に指定する。
- 分析正本 `training/ai-assisted-qa-course/coverage/supported-behaviors.json`、blob `3143b229afd6dddad52ef7c09a9e91c5995af07f`（#219の参照版）。188操作＋20状態＝208動作、79要件。条件参照953行のCSV `docs/reports/2026-11-04_pr219-case-traceability.csv`は「採用Case件数・実Runの件数」を意味しない。
- 分析正本の編集は#213、製品修正は#210。#210 HEAD `03bd4c8abec15c8004d0fc8c8b09e36cc0f68f79`は未マージであり、#199の成功証拠として数えない。
- **Case単位の該当条件に限る**`PASS`、既知不具合の実証は`製品FAIL`、CIが部分キャンセルしたCaseは`未確認`、Androidは`BLOCKED`。テストの実行を示すjob successと全workflow successを区別する。

## Case ID・テスト・固定Runの対応

| 基本分析のBehavior ID／関連要件 | テスト内のCase／Seed・Role | 実Runの固定HEAD・job | 確認結果と不足根拠 |
| --- | --- | --- | --- |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` ／ `ROLE-ACCESS`、`UI-ERROR` | `pr219-cross-role-lifecycle.spec.ts` Guest（default）、Customer（regular-member）、Operator/Admin（default）直URL4件 | `5e91b912`、[Run 41792378802・cross-role job 126449277139](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41792378802/job/126449277139) | 各Roleの画面非露出・拒否/ログイン遷移の代表4件PASS。停止staffのWeb戻りとNative文言、DB全表は未受入 |
| 同上／`BR-AUTH-001` | 同Spec `suspended-user`、`withdrawn-user`のCheckout直URL2件 | 同上 | Checkout非露出2件PASS。停止したstaff本人のルート循環・Nativeは別条件 |
| 同上／`BR-AUTH-002` | 同Spec `default`、gold customerが他人のOrder `order-paid`を直URLで開く1件 | 同上 | 他人Orderのnot-foundと内容非露出PASS。全注文・Review履歴の非露出は未受入 |
| `SCREEN-ADMIN-USERS-A01-02`／`BR-ADMINUSER-001`・`AC-ADMINUSER-001` | 同Spec、admin・defaultでkeyword×Role×StatusのAND検索。別途`pr219-admin-user-acceptance.test.ts`でRank含むUse Case検索 | Web `5e91b912` Run 41792378802。Integration `9adff1e` [Run 41795950215・job 126460341746](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41795950215/job/126460341746) | 代表AND条件PASS。UIのRank検索/日付sortの仕様採否、20件超ページ、個人データログは未受入 |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | 同Spec、operator→admin／旧Session失効。Integrationで2→1 Role変更・stale version・target Session削除 | Web `5e91b912` Run 41792378802。Integration `9adff1e` Run 41795950215 | Webのrole変更と旧Session失効PASS、隔離DBでUser/version・stale拒否を確認。actor失効競合は別行 |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | 同Spec、adminが顧客Rank変更→再読込。IntegrationでRank/Checkoutのrollback・stale CAS | Web `5e91b912` Run 41792378802、Integration `9adff1e` Run 41795950215 | 該当操作のPASS。旧Checkout破棄後の新価格と全画面幅未実行 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | 同Spec、顧客停止確認→再ログイン拒否。IntegrationでSession失効・Checkout破棄/Cart不変/障害注入 | Web `5e91b912` Run 41792378802、Integration `9adff1e` Run 41795950215 | 該当条件PASS。再開後の旧Session不復活と他Role別全条件は未受入 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | Integration `pr219-admin-user-acceptance.test.ts`、自己role・status変更拒否。Web本人disabledテストは追加済み | Integration `9adff1e` Run 41795950215。Web新Caseは当該Run未収録 | 自己拒否/DB不変PASS。Web本人disabledの追加Caseは最新CIで確認後に確定 |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | Integrationでwithdrawn顧客のrank/status変更拒否。Web読取専用テストは追加済み | Integration `9adff1e` Run 41795950215。Web新Caseは当該Run未収録 | 退会済み更新の拒否・DB不変PASS。Web画面は新CI未確認、withdrawn staff fixture未実行 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 2→1 Role更新・自己拒否・stale CAS、actor失効競合2件 | Integration `9adff1e` Run 41795950215で2件expected fail。型安全に直した再現テスト `2cd64ea` [Run 41796764234・job 126462596786](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41796764234/job/126462596786)で2件実行 | 2→1正常系は部分PASS。**actor失効後でも別のUser更新が成功してしまう製品FAILを隔離DBで再現**。#210固定HEADでは未受入。2管理者同時停止の新Caseも新CI確認待ち |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` 停止staff | `pr219-forbidden-route.test.tsx`、suspended operatorの管理画面戻りリンク | `9adff1e` Run 41795950215の[Component job 126460341893](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41795950215/job/126460341893)、1件expected fail。修正テストは`2cd64ea`のComponent成功 | 停止staffでも管理リンクが出る既知問題を確認。**製品FAIL**であり、Web実画面・Nativeは未受入 |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | 同Spec、empty-catalog無条件0件とdefaultで絞込0件・解除のWeb2件 | `9adff1e` [Run 41795950215・cross-role job 126460743631](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41795950215/job/126460743631)の**個別2Case PASS**（同job全体はfailure） | パンくず・CTAの代表条件PASS。Error画面・視覚正本・DB Snapshot未受入 |
| `SCREEN-ADMIN-PRODUCTS-A01-02` | 同Specで商品コード×stock×statusおよび表示外選択（`default`） | `9adff1e` Run 41795950215では検索locatorがstrict modeでエラー、既知選択不具合Caseも完全な製品検証には未到達 | `TEST ERROR`。検索locator修正済み、新CI結果と多件/price/SKU0/bulk/DB照合待ち |
| Cart/Checkout/Order/Shipment/Reviewの各Behavior ID | 既存`phase1-required.spec.ts`とVitestの既存Case。PR #219固有の全採用条件の対応表は未完成 | `5e91b912` Run 41792378802 required Chromium/Integrationのjob成功 | 既存テスト成功をCase単位の全受入に換算しない。操作前後DB・4支払・各version/境界・Native不足 |
| Android/SQLite／全対象Behavior ID | `Mobile App CI`のMaestro/SQLite実行、実機/エミュレータ | **実Runなし**。Native CIはworkflow_dispatchのみ | `BLOCKED`：CI手動起動の権限・Android/ADB/Maestro実行環境と対応するAPK/SQLite証拠が必要 |

## 証拠の欠落・採用判断・再開

- 既存の`playwright.config.ts`は成功時にTrace/動画/画像を必ず保存しない。上のWeb成功Caseの証拠は**固定HEAD・jobログ・テスト内assertion**で、画像/Traceは未取得とする。失敗時のパスはそのRunにだけ紐付け、他Runへ流用しない。
- 直接的なDB前後状態は隔離Dexieテストのassertionで確認した範囲のみ。Session ID/個人情報をGitHubコメントや成果物へ生値で転記しない。
- 分析台帳の`test_condition`、`case_policy`、BR/AC採否の正本変更は#213で行う。上のテスト1件がひとつのBehaviorの全条件を代表するとは扱わない。未確定の953行は未受入のまま保持する。
- 製品修正候補（actor失効後の更新・停止staffの戻りリンク・管理商品選択残留）と分析仕様判断待ち（Rank UI等）、テストロケータ不備、Android環境BLOCKEDを分離し、製品#210へ根拠を引き継ぐ。
- Androidの機材・権限・具体的な再開方法、Web/a11y/DBの不足は`docs/reports/2026-11-04_pr219-risk-evidence-and-blockers.md`を参照する。

## Web実行履歴のCase識別と要件対応（2026-11-04）

- 対象：`docs/reports/2026-11-04_pr219-web-case-run-evidence.csv`。既存39実行行を変更せず、Webテスト名22種類を再実行間で追跡する`evidence_case_key`（`PR219-WEB-001`〜`PR219-WEB-022`）を追加。同じテスト名の再実行には同じキーを付け、Run/job/SHA・結果は元の行の値を維持した。
- `evidence_case_key`はこのPRの**証拠照合キー**であり、#213が採用・確定する正式Case IDではない。元の`case_id`列はテスト名のままで、テスト名22種類と実行履歴39行を混同しない。
- `formal_requirement_refs`は既存の208動作一覧の`behavior_id`と一致する行について、その一覧に記録済みの要件参照を転記した。6実行行は`behavior_id`欄に`BR-AUTH-001/002`という**要件ID**しかなく、対応Behaviorの確定根拠がないため、`case_mapping_status`を「要件IDのみ・Behavior ID未確定」とした。誤ったBehaviorを推定して補完していない。
- 正式Case採否、各`condition_ref`との対応、直接未参照29横断要件の必要条件、ケース間の重複・統合は未確定。#213から採用判断と正式Case IDを受け取った後、同キーを使い固定SUT/Test SHAとRun/job/exit、Platform/Role/Seed/Clock、期待・観測、DB前後、Trace/画像/Network（実在する証拠のみ）を結び直す。
- Web実行結果の最新の全体成功はテストSHA `83fb0325d6efc7d2a517561e52f32bfe793f5986`の[CI #41811366480](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)。この時点のPR #219 HEAD `77327824e12e2fff6cafa3ef80efcdd0b37199dd`のチェックはCodeRabbit skippedのみであり、最新HEADのWeb CI PASSとは主張しない。後続のdocs更新も別SHAとして扱う。
- これで**タスクリスト2番・19番・20番が完了したとは判定しない**。39行のWeb実行証拠にはDB前後実物・成功時Trace/画像/Networkが不足し、Android/SQLiteはBLOCKED、Case採否は#213判断待ち。既知製品不具合の再現成功も製品適合PASSと区別する。
