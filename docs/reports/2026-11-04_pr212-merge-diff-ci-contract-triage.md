# PR #212 / PR #199 差分とCI契約の突合（2026-11-04）

## 対象と作業境界

- 独立PR [#212](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/212)：`work/pr199-parallel-supporting-analysis-20261103`、比較HEAD `715b422fbf9d4daf07548f1ca8301959dedcc157`。
- 親PR [#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)：`docs/plan-ai-agent-qa-curriculum-redesign`、比較HEAD `8734c53814a4092839d4a9dff605e43b4b4096e6`。
- 今回の成果は両HEADを固定した静的な台帳差分とGitHub Actionsの既存実行結果の調査。merge、base更新、製品コード・正式仕様・Seed/Reset・既存テストの編集は行わない。両HEADが変化した場合は必ず再計算する。
- `analysis_status=analyzed` は基本静的分析の状態であり、製品適合・実Run・Android実機・受入済みではない。既存契約テストの「製品未判断ならreview_required」と意味が異なるため、ステータスを無条件に変更しない。

## 台帳差分と統合可能性

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

## 現時点のWeb CI（コミットに固定）

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
