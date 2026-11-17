# PR #219：29横断要件の既存Case照合と引継ぎ

## 確認範囲

PR #213の分析正本`supported-behaviors.json`（Blob `132301c4cfe0e9886e8176157c807b70713ced98`）に対応する[29横断要件CSV](./2026-11-04_pr219-cross-cutting-requirement-case-handoff.csv)、[208動作一覧](./2026-11-04_pr219-behavior-case-acceptance-status.csv)、[Web実行証拠](./2026-11-04_pr219-web-case-run-evidence.csv)、既存テスト16ファイルを静的照合した。以下の行は実コードで確認した`it`/`test`の開始行（冒頭260行以内）を示す。個々の要件全条件の合格や正式Case採用を示すものではない。

188操作＋20状態の208動作一覧は208行・18列。直接参照される要件ID50種類に対し、横断要件29件を別表で管理する。Web専用証拠は50実行履歴・27暫定キー、Behaviorへの直接対応は**11/208動作**（残197動作は未対応）。これは197動作が全く未テストであることも197件の新規E2Eが必要なことも意味しない。29横断要件では代表Behavior一致候補が10件、直接一致なしが19件。いずれも正式採用Case IDは未確定で、動的製品受入は未実施。

## 既存テストのassertion候補と不足条件

| 要件ID | 既存テスト・開始行 | 実コードで確認したCaseの一部 | 追加確認が必要な条件 |
| --- | --- | --- | --- |
| `BR-NATIVE-001` | `tests/contracts/native-runtime-service-surface.test.ts:5,38` | Customer公開サービスと管理機能除外 | Web/Android同SeedでのDTO・Error/Session比較 |
| `BR-NATIVE-002` | `tests/contracts/native-sqlite-transactions.test.ts:45,63,72,116` | SQLite transaction失敗・rollback・再読込 | Android本番bridgeと全表前後 |
| `AC-NATIVE-001` | `tests/contracts/native-runtime-service-surface.test.ts:5,38` | Native Customer境界 | Cart→Payment→Order→Reviewの端末操作 |
| `AC-NATIVE-002` | `tests/contracts/native-ci-workflow.test.ts:126,156,193` | Native CI/build区分 | Android runtime・iOS buildの最終Run |
| `ROLE-01` | `tests/component/route-guard.test.tsx:79` | 未認証保護RouteからLogin | Role/旧Session/Androidの全Route |
| `ROLE-02` | `tests/integration/auth-account.test.ts:100,119,223` | 認証の成功/拒否とLogout | Role全組合せ・実ブラウザSession |
| `ROLE-03` | `tests/integration/auth-account.test.ts:149,178,207` | Login Cart統合と失敗rollback | 停止/退会後の全拒否 |
| `ROLE-04` | `tests/contracts/ai-assisted-qa-admin-users-list.test.mjs:93,102,146,174,228` | 非admin拒否と管理者権限変更 | 全管理Route/Session競合 |
| `ROLE-05` | `tests/integration/review-user-use-cases.test.ts:242` | レビュー管理と履歴原子性 | 非owner・withdrawnなどの全条件 |
| `ROLE-RANK` | `tests/integration/checkout-order-use-cases.test.ts:155` | Order作成時のSnapshot | Rank/価格の全境界と変更後 |
| `ROLE-STATUS` | `tests/integration/review-user-use-cases.test.ts:157,242` | レビュー操作拒否・管理更新 | 停止後の全SessionとWeb/Native |
| `TRANSITION-PRODUCT` | `tests/integration/admin-product-use-cases.test.ts:90,116` | draft商品集約とSKU更新 | 公開/停止/削除とRollback |
| `TRANSITION-ACCOUNT` | `tests/integration/review-user-use-cases.test.ts:242` | レビュー管理更新（間接） | User Role/Rank/Status遷移の直接Case |
| `TRANSITION-CHECKOUT` | `tests/integration/checkout-order-use-cases.test.ts:116,155,258` | 開始/再開/stale/在庫競合 | 期限/Session/実画面の全遷移 |
| `TRANSITION-ORDER` | `tests/integration/admin-operations-use-cases.test.ts:160,179` | 検索・paid→delivered | 禁止/終端遷移の採否 |
| `TRANSITION-SHIPMENT` | `tests/integration/admin-operations-use-cases.test.ts:136,179` | 入力制限・Order/Shipment更新 | History/rollback/失敗注入 |
| `TRANSITION-REVIEW` | `tests/integration/review-user-use-cases.test.ts:66,157,242` | 作成/変更/削除・未配送拒否 | 終端・他人拒否・再投稿 |
| `TRANSITION-CART` | `tests/integration/cart-use-cases.test.ts:146,168,191,218` | 数量変更/上限/価格/recovery | Checkout保持中拒否/全DB不変 |
| `STATE-TERMINAL` | `tests/integration/review-user-use-cases.test.ts:157` | Review削除後再投稿拒否 | その他集約の終端状態 |
| `STATE-BOUNDARY` | `tests/contracts/ai-assisted-qa-checkout-confirmation.test.mjs:162,173,191,222,246` | stale Cart/価格変更の拒否 | 実画面/Focus/誤復帰/Native |
| `STATE-NATIVE` | `tests/contracts/native-runtime-service-surface.test.ts:5,38` | Native Customer公開境界 | Android Navigation/SQLite/Session |
| `UI-BREAKPOINT` | `e2e/web/mobile-boundary.spec.ts:58,89` | 900px/320pxの画面幅Case | その他幅・全状態・正式画像 |
| `UI-DESIGN` | `tests/contracts/native-visual-contract.test.ts:23,32,44,78,88` | 共通Token/撮影前提 | 正本画像・実端末での比較 |
| `SCOPE-SUPPORTED-1` | `tests/integration/catalog-use-cases.test.ts:47,55,60,68` | Catalog/販売期限/検索制限 | Role別Web/Android全範囲 |
| `SCOPE-SUPPORTED-2` | `tests/integration/checkout-order-use-cases.test.ts:116,155,258` | Checkout/Order/在庫競合 | 決済/配送の正式範囲 |
| `SCOPE-SUPPORTED-3` | `tests/integration/review-user-use-cases.test.ts:66,157,242` | Review/User管理の一部 | 全User管理・Session |
| `SCOPE-SUPPORTED-4` | `tests/integration/admin-operations-use-cases.test.ts:61,91,160,179` | Inventory/Order/Shipment | Product/Category/Brand/User/Review全範囲 |
| `SCOPE-SUPPORTED-6` | `e2e/web/accessibility.spec.ts:63,119,151,196,230` | 3Role代表画面/Keyboard | Error/Loading/Conflict全幅と画像 |
| `PLATFORM-NATIVE` | `tests/contracts/native-ci-workflow.test.ts:126,156,193` | Native CI構成 | Maestro/SQLite実Run |

## 判断と引継ぎ

- **既存Case再利用候補**：上表のテストは既存の`it`/`test`から観測可能な部分条件として候補に残す。実assertionを再確認してからRole/State/Platform/Seed/Versionを正式Caseへ結び直す。横断要件29件を全て新規E2Eに変換しない。
- **追加確認が必要**：上表右列の端末、実Session、全状態、画像、rollback等は既存ファイルへの参照だけでは証拠が不足。#219が実行可能な専用Web/Component/Integrationの負例と重複を先に照合し、最終HEADのWeb/Android/SQLite実行・保存Artifact・画像比較は#199の最後に移管する。
- **正式判断待ち**：#213が79要件のRisk/TR/Condition/Case採否・正式Case IDと不要候補の理由を確定する。上表の10件のWebキー候補も正式採用とは扱わない。#199は正式Case単位にSUT/Test SHA、Role/Platform、Seed/Clock、期待/観測、DB前後、Run/job/Artifactを最終照合する。
- **製品修正**：#210のactor失効競合、停止staff Forbidden循環、Checkout誤復帰、管理商品検索/選択の修正は未統合なら旧#199 SUTのPASSに流用しない。既知不具合再現テストの緑色は製品適合を示さない。

この表は静的コード調査であり、GitHub Actions実行結果・採用Caseの最終合否・Android端末実行を新たに主張しない。
