# PR #212 / PR #199 差分とCI契約の突合（2026-11-04）

## 対象と作業境界

- 独立PR [#212](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/212)：`work/pr199-parallel-supporting-analysis-20261103`、比較HEAD `715b422fbf9d4daf07548f1ca8301959dedcc157`。
- 親PR [#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)：`docs/plan-ai-agent-qa-curriculum-redesign`、比較HEAD `8734c53814a4092839d4a9dff605e43b4b4096e6`。
- 今回の成果は両HEADを固定した静的な台帳差分とGitHub Actionsの既存実行結果の調査。merge、base更新、製品コード・正式仕様・Seed/Reset・既存テストの編集は行わない。両HEADが変化した場合は必ず再計算する。
- `analysis_status=analyzed` は基本静的分析の状態であり、製品適合・実Run・Android実機・受入済みではない。既存契約テストの「製品未判断ならreview_required」と意味が異なるため、ステータスを無条件に変更しない。

## 2026-11-04 追加監査：管理ユーザー詳細4操作と最終HEAD CI

比較基準：PR #199 `8734c53814a4092839d4a9dff605e43b4b4096e6`、PR #212台帳 `d03c018ee5cf73abec5ec1833c90de32560bd6de`。旧比較時点の99件とは異なり、**差分103件**（分析ステータス差58件、説明・根拠差45件）になった。操作総数188/非default20、#212の`analyzed`は179/188・17/20で変わらない。4件の静的監査記述追加は実行合格を意味しない。

PR #212の分析台帳で次の4操作を、正式仕様・Web UI・Use Case・Dexie/transaction・default Seed・既存テストの行範囲まで追跡し、`risk`/`test_condition`/`test_responsibility`/`case_policy`/`case_selection_reason`/`basic_analysis_review`/`analysis_progress`/`reviewed_against`/`audit_branch_refs`を補完。A02-01/A02-02の`related_use_cases`も実際の3更新メソッドに対応させた。

| 操作ID | 確認できた静的経路 | 実行・受入で残ること |
| --- | --- | --- |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | 顧客Rankだけ変更、User.version CAS、旧Checkout abandon、Cart保持。既存integrationはregular→goldとCheckout破棄を部分検証 | 3Rank遷移、staff/withdrawn/旧Version、Checkout破棄rollback、価格・送料再計算、Web操作。#210でactorのtransaction内再認可が既に追加されているので重複実装しない |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | active↔suspended、Session全削除、customer停止時のみCheckout abandon、last-admin/自己停止保護 | 停止/再開のSessionとCheckout前後差、旧Session再利用拒否、複数admin、失敗注入rollback、Webダイアログと表示 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | 本人role変更・本人停止の`SELF_CHANGE_FORBIDDEN`、Web本人ボタンdisabled | 両Use Caseの直接拒否、User/version/Session不変、2名adminでも自己拒否、画面/キーボード/a11y。既存integrationは本人roleのみ |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | withdrawn時のWeb read-only、Rank/Roleは`INVALID_ROLE`、Statusは`INVALID_STATE` | customer/staffの3更新経路の直接拒否、User/Checkout/Session/履歴不変、Web表示。既存integrationはwithdrawn→activeだけ |

**PR #210との比較**：製品ブランチHEAD `03bd4c8abec15c8004d0fc8c8b09e36cc0f68f79` の`review-user-use-cases.ts`では`changeMembershipRank`、`changeRole`、`changeSuspension`のすべてが`assertActorStillAuthorized`をtransaction内で実行する。#199のmainベースへまだ取り込まれていないため、ベースの静的懸念と#210の実装修正・実行受入を分けて扱う。

### 新たに確認したGitHub Actionsの結論

- [PR #212 Web CI #41740409345](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41740409345)（commit `128d4f0be601b5cb777dab5873f18147d3949b0d`）は**completed/failure**。Vitest (contracts)は**13 failed / 1031 passed / 1 expected fail / 15 skipped**。このうち12件は`ai-assisted-qa-supported-behaviors.test.mjs`の固定`review_required`と台帳`analyzed`の衝突、残る1件は`ai-assisted-qa-assessment.test.mjs`のCalibration復旧エラー期待値の差。`Style Quality`は`tests/contracts/ai-assisted-qa-admin-users-list.test.mjs`と`tests/contracts/ai-assisted-qa-assessment.test.mjs`の2ファイルでPrettier不一致。verify/validateもfailure。
- [PR #199 Web CI #41699602011](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41699602011)（commit `8734c53814a4092839d4a9dff605e43b4b4096e6`）もcompleted/failure。Style QualityとVitest (contracts)が失敗。根本原因と固定IDごとの衝突は同一HEADではないため別途区別する。
- [PR #211 Web CI #41740613524](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41740613524)（commit `8c4f2219c711bb049f6b3cd4c4eaec7a26e69f15`）はcompleted/failureだが、**Vitest (contracts)成功**。`Style Quality`は`ai-assisted-qa-admin-users-list.test.mjs`のみ不一致。`ai-assisted-qa-assessment.test.mjs`の書式・評価契約は#211側の既存修正との取り込み優先度を確認する。
- 3PRともIntegration/Component/Unit/Repository、Code Quality、主要Chromium E2Eは成功。ただし上記CIは**今回の追記コミット後のPR #212最終HEADを検証したRunではない**。

契約テストが未解決の製品差分と基本静的分析完了を同じstatusで管理している点の調停は未了。CI成功目的で`analyzed`へ戻す/下げる、固定期待値を一括緩和することはしない。分析台帳の4件は`review_required`のまま、最終的な操作数・状態数の分母は不変。製品実装・正式仕様・Seed・既存テストを編集しない。

## 台帳差分と統合可能性（旧比較：#212 715b422f、#199 8734c538）

| 検査 | PR #212 | PR #199（最新比較） |
| --- | ---: | ---: |
| action / use_case総数 | 188 | 188 |
| 基本分析analyzed | 179 | 121 |
| 非default state analyzed | 17/20 | 17/20 |
| Behavior総数 | 208 | 208 |
| pinned source_commit | `383efc9107ef3d5f78c5659473277166c1bba2de` | `383efc9107ef3d5f78c5659473277166c1bba2de` |

- 両branchのBehavior ID集合は同一。内容が異なるのは**99件**。そのうち分析ステータスの差が**58件**、同一ステータスの説明・根拠等の差が**41件**。
- PR #212のみ`analyzed`は**58操作**。PR #199だけの`analyzed`は**0件**。Nondefault stateの`analyzed`差は0件。
- PR #199の基準`b671561a...`からの2コミットは`docs/plans/2026-11-01_pr199-execution-tasks.md`と`tests/contracts/ai-assisted-qa-admin-users-list.test.mjs`を変更。分析台帳の行を更新していない。ただし両branchは既に分岐し、Gitの取り込み時点で差分再検証が必要。
- GitHubで`mergeable=true`と表示されても、既存CIの不合格や未決の製品仕様まで解決されたわけではない。ユーザーのmerge許可もない。

### PR #212でのみ基本分析がanalyzedの58操作（画面別）

- **SCREEN-ADMIN-INVENTORIES（1件）**：`SCREEN-ADMIN-INVENTORIES-A02-02`
- **SCREEN-ADMIN-PRODUCTS（1件）**：`SCREEN-ADMIN-PRODUCTS-A01-01`
- **SCREEN-AUTH-LOGIN（1件）**：`SCREEN-AUTH-LOGIN-A02-01`
- **SCREEN-AUTH-SIGNUP（3件）**：`SCREEN-AUTH-SIGNUP-A01-01`、`SCREEN-AUTH-SIGNUP-A02-01`、`SCREEN-AUTH-SIGNUP-A02-02`
- **SCREEN-BOUNDARY-FORBIDDEN（1件）**：`SCREEN-BOUNDARY-FORBIDDEN-A02-01`
- **SCREEN-BOUNDARY-NOT-FOUND（3件）**：`SCREEN-BOUNDARY-NOT-FOUND-A01-01`、`SCREEN-BOUNDARY-NOT-FOUND-A01-02`、`SCREEN-BOUNDARY-NOT-FOUND-A02-01`
- **SCREEN-CHECKOUT-ADDRESS（5件）**：`SCREEN-CHECKOUT-ADDRESS-A01-01`、`SCREEN-CHECKOUT-ADDRESS-A01-02`、`SCREEN-CHECKOUT-ADDRESS-A02-01`、`SCREEN-CHECKOUT-ADDRESS-A02-02`、`SCREEN-CHECKOUT-ADDRESS-A02-03`
- **SCREEN-CHECKOUT-ADDRESSES（1件）**：`SCREEN-CHECKOUT-ADDRESSES-A01-04`
- **SCREEN-CHECKOUT-COMPLETE（3件）**：`SCREEN-CHECKOUT-COMPLETE-A01-01`、`SCREEN-CHECKOUT-COMPLETE-A01-02`、`SCREEN-CHECKOUT-COMPLETE-A01-03`
- **SCREEN-CHECKOUT-CONFIRM（7件）**：`SCREEN-CHECKOUT-CONFIRM-A01-01`、`SCREEN-CHECKOUT-CONFIRM-A01-02`、`SCREEN-CHECKOUT-CONFIRM-A01-03`、`SCREEN-CHECKOUT-CONFIRM-A01-04`、`SCREEN-CHECKOUT-CONFIRM-A02-01`、`SCREEN-CHECKOUT-CONFIRM-A02-02`、`SCREEN-CHECKOUT-CONFIRM-A02-03`
- **SCREEN-CHECKOUT-PAYMENT（4件）**：`SCREEN-CHECKOUT-PAYMENT-A01-01`、`SCREEN-CHECKOUT-PAYMENT-A01-02`、`SCREEN-CHECKOUT-PAYMENT-A02-01`、`SCREEN-CHECKOUT-PAYMENT-A02-02`
- **SCREEN-STOREFRONT-CART（4件）**：`SCREEN-STOREFRONT-CART-A01-01`、`SCREEN-STOREFRONT-CART-A01-02`、`SCREEN-STOREFRONT-CART-A01-03`、`SCREEN-STOREFRONT-CART-A02-01`
- **SCREEN-STOREFRONT-HOME（3件）**：`SCREEN-STOREFRONT-HOME-A01-05`、`SCREEN-STOREFRONT-HOME-A02-01`、`SCREEN-STOREFRONT-HOME-A02-02`
- **SCREEN-STOREFRONT-PRODUCT-DETAIL（3件）**：`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01`、`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-02`、`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`
- **SCREEN-STOREFRONT-SEARCH（2件）**：`SCREEN-STOREFRONT-SEARCH-A01-03`、`SCREEN-STOREFRONT-SEARCH-A02-02`
- **SCREEN-SUPPORTING-COMMERCE（2件）**：`SCREEN-SUPPORTING-COMMERCE-A01-01`、`SCREEN-SUPPORTING-COMMERCE-A02-01`
- **SCREEN-SUPPORTING-GUIDE（4件）**：`SCREEN-SUPPORTING-GUIDE-A01-01`、`SCREEN-SUPPORTING-GUIDE-A01-02`、`SCREEN-SUPPORTING-GUIDE-A02-01`、`SCREEN-SUPPORTING-GUIDE-A02-02`
- **SCREEN-SUPPORTING-PRIVACY（2件）**：`SCREEN-SUPPORTING-PRIVACY-A01-01`、`SCREEN-SUPPORTING-PRIVACY-A02-01`
- **SCREEN-SUPPORTING-TERMS（2件）**：`SCREEN-SUPPORTING-TERMS-A01-01`、`SCREEN-SUPPORTING-TERMS-A02-01`
- **SCREEN-TEST-CONTROL（5件）**：`SCREEN-TEST-CONTROL-A01-01`、`SCREEN-TEST-CONTROL-A01-02`、`SCREEN-TEST-CONTROL-A01-03`、`SCREEN-TEST-CONTROL-A01-04`、`SCREEN-TEST-CONTROL-A02-01`
- **Use Case（1件）**：`UC-CATALOG-LIST-REVIEWS`

### ステータスが同じだが説明・根拠が異なる41件

- `SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-04`：`use_case_evidence`
- `SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-05`：`use_case_evidence`
- `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-low-stock`：`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `SCREEN-AUTH-LOGIN-A01-02`：`use_case_evidence`
- `SCREEN-AUTH-ACCOUNT-PROFILE-A01-02`：`use_case_evidence`
- `SCREEN-AUTH-ACCOUNT-PROFILE-A01-03`：`use_case_evidence`
- `SCREEN-AUTH-ACCOUNT-PROFILE-A02-01`：`use_case_evidence`
- `SCREEN-STOREFRONT-CART-A02-02`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `SCREEN-CHECKOUT-CONFIRM-S-stale-cart`：`test_condition`、`audit_branch_refs`
- `SCREEN-CHECKOUT-PROCESSING-A01-02`：`audit_branch_refs`
- `SCREEN-CHECKOUT-PROCESSING-A02-03`：`use_case_evidence`
- `SCREEN-CHECKOUT-FAILED-A01-03`：`use_case_evidence`
- `SCREEN-ORDERS-LIST-A01-02`：`use_case_evidence`
- `SCREEN-ORDERS-LIST-A02-01`：`audit_branch_refs`
- `SCREEN-ORDERS-LIST-S-empty`：`audit_branch_refs`
- `SCREEN-ORDERS-DETAIL-A02-02`：`audit_branch_refs`
- `SCREEN-ORDERS-DETAIL-S-reviewable`：`audit_branch_refs`
- `SCREEN-ADMIN-DASHBOARD-A02-01`：`use_case_evidence`
- `SCREEN-ADMIN-PRODUCTS-A01-02`：`risk`、`test_condition`、`test_responsibility`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `SCREEN-ADMIN-CATEGORIES-A01-04`：`use_case_evidence`
- `SCREEN-ADMIN-BRANDS-A01-01`：`audit_branch_refs`
- `SCREEN-ADMIN-BRANDS-A01-02`：`audit_branch_refs`
- `SCREEN-ADMIN-BRANDS-A01-04`：`use_case_evidence`、`audit_branch_refs`
- `SCREEN-ADMIN-INVENTORIES-A01-04`：`audit_branch_refs`
- `SCREEN-ADMIN-INVENTORIES-S-stock-boundaries`：`use_case_evidence`
- `SCREEN-ADMIN-ORDERS-A02-01`：`audit_branch_refs`
- `SCREEN-ADMIN-USERS-A01-02`：`risk`、`test_condition`、`test_responsibility`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `SCREEN-ADMIN-USERS-A02-01`：`audit_branch_refs`
- `SCREEN-ADMIN-USERS-A02-02`：`audit_branch_refs`
- `SCREEN-ADMIN-USERS-A02-03`：`audit_branch_refs`
- `SCREEN-ADMIN-USER-DETAIL-A01-01`：`audit_branch_refs`
- `SCREEN-ADMIN-USER-DETAIL-A01-02`：`audit_branch_refs`
- `SCREEN-ADMIN-USER-DETAIL-A02-03`：`audit_branch_refs`
- `SCREEN-BOUNDARY-FORBIDDEN-A01-01`：`risk`、`test_condition`、`test_responsibility`、`case_policy`、`case_selection_reason`、`basic_analysis_review`、`analysis_progress`、`reviewed_against`、`audit_branch_refs`
- `UC-ACCOUNT-UPDATE-PROFILE`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `UC-ADMIN-CHANGE-CATEGORY-STATUS`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `UC-ADMIN-CHANGE-BRAND-STATUS`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `UC-ADMIN-DELETE-DRAFT`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `UC-AUTH-LOGOUT`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `UC-REVIEW-DELETE`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`
- `UC-CART-MERGE`：`test_condition`、`basic_analysis_review`、`analysis_progress`、`audit_branch_refs`

## 前回比較時点のWeb CI（コミットに固定）

- PR #212 HEAD `715b422fbf9d4daf07548f1ca8301959dedcc157` の [Web CI run 41662121176](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41662121176)：**completed/failure**。
- `Vitest (contracts)`：失敗。`Style Quality`：Format check失敗。`verify`/`validate`は必須ジョブ失敗を受けて失敗。`deploy-preview`/`deploy-production`はskipped。
- 成功確認済みジョブ：Dependency Review、Code Quality、build-production、build-automation、Training runtime contracts、Vitest integration/component/unit/repository、Production smoke、Chromium E2E required/cross-role/accessibility/mobile-boundary/training-web-baseline、UI Review desktop/tablet/mobile/small-mobile、Windows hook/成果物sanitize等。
- 親PR #199の比較基準 `b671561a...` の [Web CI run 41628332183](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41628332183)も失敗（Assessment Calibration復旧1件とPrettier 2ファイル）。これらをPR #212固有の新規回帰と誤認しない。
- Android実機/Maestroの成功証拠は今回確認していない。Web E2E成功は対象Caseの全操作・全Role実証を意味しない。

### 既存契約テストの固定status判定との衝突（6 ID、12箇所）

対象：`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`。既存テストは一部で明示的に`review_required`を期待し、#212台帳で`analyzed`となっている。次の列は**コード上の判定箇所**であり、CIログに表示された個別Assertion名の転記ではない。

| 操作ID | 固定判定の行 | 現台帳 |
| --- | --- | --- |
| `SCREEN-CHECKOUT-ADDRESS-A01-01` | 260、436、478、516、529（5箇所） | `analyzed` |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03` | 592（1箇所） | `analyzed` |
| `SCREEN-STOREFRONT-SEARCH-A02-02` | 732（1箇所） | `analyzed` |
| `SCREEN-AUTH-LOGIN-A02-01` | 754、761、791（3箇所） | `analyzed` |
| `SCREEN-AUTH-SIGNUP-A02-01` | 807（1箇所） | `analyzed` |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01` | 928（1箇所） | `analyzed` |

**判断が必要な契約**：公式バリデータ`completeAnalysis`はRole/Platform/入力・Case採否とspec/implementation/seedの照合完了を検査している。既存テストは「製品差分が未解決ならreview_required」を期待している。基本分析の完了と製品の未解決判断を同じ`analysis_status`で表すと衝突する。現在のデータモデルの契約を先に決めるべきであり、CIを緑にするだけの目的でテスト期待値や分析ステータスを一括変更しない。

**調停手順**： (1) 6 IDそれぞれの`basic_analysis_review`/`test_condition`と#210側の製品判断を比較、(2) `analyzed`の意味を#199のPlan/Validator/テストのどれで定義するか合意、(3) その契約に合わせた修正を権限ある担当PRで行う、(4) ベース由来のAssessment/Prettierと分けてVitestを再実行、(5) 合流最終HEADで一連の必須CIを確認。

## 残る基本分析9操作（現在の状態を維持）

| 操作ID | 次の個別受入条件 |
| --- | --- |
| `SCREEN-ADMIN-PRODUCTS-A01-02` | SKU検索、カテゴリー/ブランド/Rank/Status/在庫0/1/5/6/価格境界・sort、many-products 20/21ページング、選択残留→空bulkの例外、0 active SKU、Role/Version/部分失敗の実行証拠と#210判断 |
| `SCREEN-ADMIN-USERS-A01-02` | Role・Status・keywordのAND、Rank絞込と登録/更新日sortの現UI欠落、20/21件とページ残留、guest/operator/customer/停止/退会の拒否・データ非露出をWebとRepositoryで対比 |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | 他者Role昇格/降格、Version CAS、Session無効化、自己/最後のAdmin保護、ConfirmDialog、他表不変。#199側の契約更新2コミットとの重複を再確認 |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | 顧客regular/gold/platinum、staffのRank禁止、旧Version/他人/自己、Rank変更とCheckout/価格/Session影響・前後差 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | active↔suspended、停止/復帰、Session/Checkout/Cartへの副作用、withdrawn禁止、Version/部分失敗、DB原子性 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | admin本人の自己降格・停止拒否、Web disabled、直接UseCaseのSELF_CHANGE_FORBIDDEN、権限・Session不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | withdrawnのrole/rank/status変更全拒否、read-only/直接UseCase、Order/Review/History/Sessionの保護 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 非self最後のactive Adminの降格・停止LAST_ADMIN_PROTECTED、複数Admin正常系、同時更新/Count race、UIの具体的失敗理由 |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | guest/Customer/Operator/停止staffの拒否、staff statusを見ないWebの/admin戻りリンク循環、Androidの『Native対象外』文言、production Test Control、機密DOM/DB非露出・戻り操作 |

## 残る非default状態3件

- `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`：`empty-catalog`で素の`/products`に復帰CTAがない一方、正式仕様は戻り導線を要求。検索条件あり0件との対照、Web/Android・画面画像・a11y、#210の判断。
- `SCREEN-CHECKOUT-ADDRESS-S-resume-notice`：`checkout-resume`初回/同ID再表示抑止/Reset後クリア/別ID/期限切れ/Cart置換、Web sessionStorage、Androidとの表示分岐。
- `SCREEN-CHECKOUT-CONFIRM-S-stale-cart`：confirm-readyに進めた後にCart版を変更する。GetConfirmation/beginOrderで注文・決済・在庫・履歴が不変か、Web Cart復帰の正式要件と現Payment戻り先の不整合を検証。固定Seedはaddress Stepのため直接の再現証拠には使えない。

## 追加の監査・実行・統合タスク

1. `audit_branch_refs`なしのanalyzed **13件**を、UI-onlyや実装側根拠で代替可能か個別に確認（任意フィールドのため一律FAIL扱いしない）。対象：`SCREEN-AUTH-SIGNUP-A02-03`、`SCREEN-ORDERS-DETAIL-A01-01`、`SCREEN-ADMIN-PRODUCTS-A02-01`、`SCREEN-ADMIN-PRODUCTS-A02-02`、`SCREEN-ADMIN-PRODUCT-NEW-A01-01`、`SCREEN-ADMIN-PRODUCT-NEW-A01-02`、`SCREEN-ADMIN-PRODUCT-NEW-A01-03`、`SCREEN-ADMIN-PRODUCT-NEW-A02-01`、`SCREEN-ADMIN-PRODUCT-DETAIL-A01-05`、`SCREEN-ADMIN-PRODUCT-DETAIL-A02-01`、`SCREEN-ADMIN-PRODUCT-DETAIL-A02-02`、`SCREEN-ADMIN-PRODUCT-DETAIL-A02-03`、`SCREEN-ADMIN-INVENTORIES-A01-01`。
2. `related_use_cases`なしのanalyzed **24件**はGuide/Legal/Boundary等を含む。実際の呼出し経路を確認し、存在しないUse Caseを形式のため付与しない。
3. 188操作・20状態・79要件（うち46BR/AC）・76公開Use Caseの意味網羅をRole×Platform×状態×エラー・Version・データ前後の単位で最終監査。単なるID/行参照一致は受入十分条件ではない。
4. GitHub Actionsの契約/書式失敗を#199/#211の修正と照合。`ai-assisted-qa-assessment.test.mjs`のCalibration復旧、`ai-assisted-qa-admin-users-list.test.mjs`と`ai-assisted-qa-assessment.test.mjs`のPrettierを、最新比較HEADのファイル内容/format実行結果で確認。
5. PR #210に分離された製品の欠落・不具合候補（決済方法runtime validation、Web/Native注文確認、業務注文番号、Cart戻り、管理フィルター/権限）を再現証拠で判断。PR #212で製品コードや正式仕様を修正しない。
6. Web：validator、Vitest、Playwright、visual/a11y、IndexedDB/Session/Reset、Role/Cart/Checkout/決済4結果・Order/Inventory/Historyの前後差を固定HEADで実行。Android：Maestro/SQLite/端末再起動/画像/Sessionを別途受入。
7. 教材M00～M10、演習・評価・採点、Git/private CI/PR証拠、配布・ライセンス・秘匿情報・教材範囲の最終受入。#211と比較して対応済み作業を二重計上しない。
8. 現PR #212の比較差分58件を#199の最新更新とID＋フィールド単位で三者比較し、既存の管理ユーザー契約の追加を守る。merge/close/force push/branch削除は明示依頼なしに行わない。

## この監査で実行していないこと

- Node/Vitest/Prettier/Playwright/Androidのローカル実行や製品の変更はしていない。Web CIに関する成功・失敗はGitHub Actionsが公開している**固定SHAの既存ジョブ結果**を確認したもの。
- PR #199/#210/#211へcommitしていない。PR #212はDraftのまま保持し、動的受入と契約調停が終わったと主張しない。

## 2026-11-04 最終HEADのCI確定後の独立照合

### 同一HEADのWeb CI結果（前回queuedから確定）

- 対象はPR #212の**最終確認HEAD `128d4f0be601b5cb777dab5873f18147d3949b0d`**。Web CI [#41740409345](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41740409345)は`completed/failure`。この段落の結果を#199や#211のHEADへ流用しない。
- `Vitest (contracts)` は**74ファイル中72成功・2失敗、1,031 passed・13 failed・1 expected fail・15 skipped**。失敗の内訳は `ai-assisted-qa-supported-behaviors.test.mjs`の12件と、`ai-assisted-qa-assessment.test.mjs`の1件。前者は下記6操作IDへの固定ステータス期待値で、既報の12コード箇所と実ログが一致した。
- Assessmentの失敗は`tests/contracts/ai-assisted-qa-assessment.test.mjs:2343`。当時の`/lacks consistent verified mastery evidence/`期待に対し、実際は`saved model calibration cache metadata...`。**#212の台帳ステータス衝突とは独立**。#211 HEAD `8c4f2219c711bb049f6b3cd4c4eaec7a26e69f15`の同テストでは`2341-2342`の期待が`/saved model calibration cache metadata is invalid/`へ更新されている。ただし統合HEADの直接実行は未確認であり、修正済みPASSとは判定しない。
- `Style Quality` のPrettierチェックで`tests/contracts/ai-assisted-qa-admin-users-list.test.mjs`と`tests/contracts/ai-assisted-qa-assessment.test.mjs`の**2ファイル**に警告。#212の報告/台帳ファイル名はこのログの警告対象に含まれない。#211のAssessment修正と、#199のadmin-users-list最新変更それぞれの整形を、取り込み先で検査する。
- `Code Quality`、`Training runtime contracts`、`Vitest (integration/component/unit/repository)`、`Chromium E2E (required/cross-role/accessibility/mobile-boundary/training-web-baseline)`、`UI Review` 4画面幅は成功。`verify`/`validate`は上記失敗に連動して不成功。Android/Maestro実受入は未確認。

### 固定status契約の判断材料と修正先

- 現行validator `scripts/training/validate-supported-behaviors.mjs:202-237,325-327,366-389`は、`analyzed`に要求するRole/Platform/Scenario/Data/Action/Expected/Risk/Condition/Case採否と、仕様・実装・Seed照合の存在を検査する。**製品差異の解決済み・実端末受入・CI成功は完了条件に含まない**。
- `tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs:17-24`には、`analyzed`と`review_required`の両方を許容する既存`expectAuditedOrAwaitingReanalysis`ヘルパーがある。それにもかかわらず6操作IDの**12箇所**が`toBe("review_required")`で進行状況を固定している。
- 6操作の#212台帳には`basic_analysis_review`・`analysis_progress`・`test_condition`・`case_policy`があり、未実施の実Runや製品側の保留判断も明記している。**この証拠に基づく限り「静的基本分析の完了」と「製品受入の未完了」は両立する**。ただし本監査は各説明の製品適合性や実行結果を新規に証明したものではない。
- **推奨する調停箇所は#199側の学習用契約テスト**。12固定assertionをそのまま`analyzed`へ反転させるのではなく、既存`expectAuditedOrAwaitingReanalysis`を再利用し、6操作それぞれで未解決の実Run/製品差異が`basic_analysis_review`・`test_condition`等に保持されることを検証する。既存のUse Case、Seed、画面経路・期待結果の詳細assertionを削除しない。`review_required`が必要な動作を無条件で`analyzed`とする許容にも広げない。
- #212側で`analyzed→review_required`を機械的に戻すと、独立して成立させた静的基本分析58件の一部が失われる。現行の`analysis_status`だけで**製品差異の解決/未解決**も表現したいのであれば、#199の正本・validator・全契約テスト側で状態の意味を変更する判断が必要。今回#212では仕様・テストを変更しない。

### analyzedだがaudit_branch_refsがない13件の追加監査

- 現台帳208件を独立集計すると、`analysis_status=analyzed`で`audit_branch_refs`が未設定なのは**13件**。全13件に`implementation_evidence`、`seed_evidence`、1件以上の`use_case_evidence`、`related_use_cases`、`reviewed_against=[specification, implementation, seed]`を確認した。該当するのはSignup遷移1、注文詳細1、商品一覧→作成/編集導線2、商品新規4、商品詳細4、在庫一覧1。
- validatorは`audit_branch_refs`を必須の基本分析条件としていない。したがって**13件を参照未記入だけでFAIL/未分析へ戻さない**。一方、これらの追加証拠が現在の実装・Seedと意味まで一致するか、動的受入条件を満たすかは別監査。入力・出力に存在しないUse Caseを補完目的だけで追加しない。

### 統合に必要な次の検証（順序）

1. #199の現HEADに対し、6操作IDの新しい`analysis_status`契約を確定し、テストの12固定判定と静的根拠・未解決条件の検査を整合させる（#212で既存テストは編集しない）。
2. #211 Assessment側の期待エラー更新、#199 admin-users-listのPrettier、#211側Assessmentの書式を取り込み先HEADで個別に検証する。#211が未マージである間は修正の存在を親PRのPASSと数えない。
3. 59件の新規分析加算としないよう、#212だけで分析済みの**58操作**と説明・根拠のみ異なる**41件**を最新の#199 HEADへID・フィールド単位で再比較する。変更のない操作/状態は上書きしない。
4. 契約/Styleの個別修正後、**同一最終HEAD**のvalidator、Vitest、Prettier、Web必須CIを実行し、Android/Maestro・実Run・教材/配布の受入を別判定する。CI成功でも各操作の動的証拠を自動加算しない。

**今回実施したこと**：GitHub Actionsの最終ジョブログ、#212台帳208件、validator、既存契約テスト、#211のAssessment差分、#199のadmin-users-list追加契約を読み取り照合した。**実施していないこと**：ローカルNode/Vitest/Prettier/Playwright/Androidの実行、製品SUT/正式仕様/Seed/既存テストの変更、#199/#210/#211へのcommit、merge/force push。基本分析179/188・非default17/20は維持する。
