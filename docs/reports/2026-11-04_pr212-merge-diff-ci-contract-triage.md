# PR #212 / PR #199 差分とCI契約の突合（2026-11-04）

## 2026-11-04 引継ぎ後の全参照監査・補正（台帳HEAD `5fc0c345306d33bd6f5fc0cd13136fd7532b6275`）

### 実施範囲・結果

- 台帳の**208 Behavior / 79 requirements / 76公開Use Case**を新たに独立集計。基本分析は**179/188操作**（`action` 163件・`use_case` 16件）、非defaultは**17/20状態**、未完は**9操作＋3状態**で不変。79要件の`analysis_status`は全件`needs_content_review`。**要件内容の受入は済んでいない**。
- `audit_branch_refs`の**2,515件**を154出典ファイルのGit blobへ突合。全ファイル存在・開始/終了行の数値は妥当だったが、**54件の末尾超過**（24ファイル、全て終了行が物理末尾+1）と、同一Behavior内の同一path・100〜110行の**重複1件**を発見。
- [コミット `5fc0c345`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/5fc0c345306d33bd6f5fc0cd13136fd7532b6275)で**54件の`end_line`を実末尾へ修正**。`SCREEN-CHECKOUT-ADDRESSES-A02-01`の`src/presentation/pages/addresses-page.tsx:100-110`にある冗長な短い参照1件を削り、登録フォームまで説明する参照を残した。更新後は**2,514件（208/208 Behavior）**、重複0。出典ファイル・範囲の静的整合のみで、根拠が実際の主張を証明するかまでは全件認定しない。
- 別系統のメソッド根拠として`use_case_evidence`**296/296**と公開メソッド一覧**76/76**を、現行9つのUse Caseソースの行番号・署名に照合（空白正規化あり）。加えて`implementation_evidence`**208/208**、`seed_evidence`**208/208**、`seed_evidence.transform`**208/208**を計25ソースの行番号・署名に照合。**合計996/996の単一行参照一致**。実Run・製品適合・DB状態・Seed意味の受入とは別。
- 208 Behavior ID、79要件ID、76公開Use Case IDには重複なし。`requirement_refs`・`related_use_cases`・`use_case_evidence.id`・Use CaseからBehaviorへの`behavior_id`は**未登録IDへの参照0件**。関連Use Caseと明示証拠の配列が一致しない操作・状態は6件（下記）だが、呼出し関係と補助・準備責務は区別して再判断する。

### 最終網羅監査で確認を要する点

- **要件79件のうち29件**は`behaviors[*].requirement_refs`から直接参照されていない（Native BR/AC 4件、Role/Rank/Status、各種状態遷移、UI、Scopeなどの横断要件）。直接紐付けのないことだけでは要件未対応と断定できない。Role×Platform×State×Error×Version×Dataの受入マトリクスに照らし、全体契約で検証するものとBehaviorに明示するものを区分する。
- 公開Use Case 76件中、`AuthUseCases.getCurrentUser`は`related_use_cases`から直接参照がない。呼出し元と認証状態表示の役割を確認し、独立Behaviorまたは既存操作の根拠に含めるか判定する。形式的な1対1対応のためには追加しない。
- `related_use_cases`中に直接`use_case_evidence`を持たないものがある6件：`SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock`、`SCREEN-ORDERS-DETAIL-A01-03`、`SCREEN-ORDERS-DETAIL-A02-02`、`SCREEN-ORDERS-DETAIL-S-reviewable`、`SCREEN-REVIEWS-EDITOR-A02-01`、`SCREEN-ADMIN-ORDERS-A02-01`。それぞれ「画面から直接呼ぶ」「別操作が呼ぶ」「fixture/前提操作でのみ必要」を、個別の直接実行・Caseと照合する。
- 台帳の`source_commit=383efc91...`と本監査HEADでは、出典154ファイルのうち**9ファイルのBlobが異なる**（component 1、UI 1、学習用contract 7）。現行HEADで参照整合を証明したが、9ファイルの参照を`source_commit`でも成立するとは主張しない。元commitに存在しない学習契約も含むため、固定SHAとブランチ増補証拠の役割を保持する。
- #199比較HEAD `493a403b...`とは引き続き**124 Behavior差**：基本分析ステータス差58、ステータス以外のみ66。#212単独の修正で#199のStatus契約12箇所は解消しない。

### Validator・CIへの引継ぎ

- #199 `scripts/training/validate-supported-behaviors.mjs`の`verifyAuditSource()`は実装・Seedの参照行を検査するが、`use_case_evidence`のメソッドID・path・行・署名の真正性は検証していない。上記296/296は**今回の独立監査結果**であり、継続的なCIによる回帰防止ではない。#199で公開メソッド一覧を正本としてID/path/line/signatureの整合と負例（誤ID・別メソッドへのすり替え・誤path・古い行・署名不一致）を追加し、担当ブランチのContracts jobへ組み込む。
- [Web CI #41759859801](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41759859801)（前HEAD `00b68816`）は**completed/failure**。29 jobs中22 success、4 failure（Style Quality / Vitest contracts / verify / validate）、3 skipped。`5fc0c345`の[Web CI #41761106845](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41761106845)は記録時点でin_progress。後続CIは完了してから固定HEADで受入する。
- この追加作業は台帳の参照補正1コミットと本報告書のみ。#199/#210/#211のコード、製品SUT・仕様・Seed/Reset・既存製品テストを変更していない。実行証拠がない12件は`review_required`のまま。merge/force pushなし。


## 2026-11-04 引継ぎ時HEADのWeb CI確定（`3b0da3ea9742dee0db26f776cde9fb8eaddebdf4`）

- [Web CI #41758911771](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41758911771)は **completed/failure**。この結果は上記固定HEADのもので、後続コミットのPASSを保証しない。
- `Vitest (contracts)` は **74ファイル中2 failed / 72 passed、テスト13 failed / 1,032 passed / 1 expected fail / 15 skipped**。失敗13件は、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`の固定`review_required`期待と台帳`analyzed`の衝突12判定（6操作ID）、および`tests/contracts/ai-assisted-qa-assessment.test.mjs:2343`のCalibration復旧エラーメッセージ期待差1件。前回報告の失敗分類と一致する。
- `Style Quality`は`tests/contracts/ai-assisted-qa-admin-users-list.test.mjs`、`tests/contracts/ai-assisted-qa-assessment.test.mjs`の**2ファイル**をPrettier違反として指摘した。
- `verify`は`style-quality result was failure`で失敗し、`validate`は`verify result was failure`で失敗。`deploy-preview`・`deploy-production`はskipped。集約ジョブの失敗を新たな独立不具合として二重計上しない。
- Code Quality、Training runtime contracts、build-production/automation、Integration/Unit/Component/Repository、Chromium E2E（required / training-web-baseline / cross-role / mobile-boundary / accessibility）、UI Review（desktop / tablet / mobile / small-mobile）は**同Runでsuccess**。Android実機・MaestroやMobile必須CIの成功を意味しない。
- 新規追加の`audit_branch_refs`に直接起因する失敗は、このRunの失敗ログからは確認されなかった。ただし参照の意味的妥当性、実Web/Androidでの動作、製品適合は未受入。
- 調停先は#199の固定ステータス契約・Validator、#211のAssessment期待差、担当ブランチのPrettier。#212では分析ステータスをCI通過目的で巻き戻さず、製品SUT・正式仕様・Seed/Reset・他PRのコードを変更しない。#199/#210/#211/#212を統合した同一HEADのWeb/Mobile必須CIは別途確認する。


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
3. 58件の新規分析加算としないよう、#212だけで分析済みの**58操作**と説明・根拠のみ異なる**41件**を最新の#199 HEADへID・フィールド単位で再比較する。変更のない操作/状態は上書きしない。
4. 契約/Styleの個別修正後、**同一最終HEAD**のvalidator、Vitest、Prettier、Web必須CIを実行し、Android/Maestro・実Run・教材/配布の受入を別判定する。CI成功でも各操作の動的証拠を自動加算しない。

**今回実施したこと**：GitHub Actionsの最終ジョブログ、#212台帳208件、validator、既存契約テスト、#211のAssessment差分、#199のadmin-users-list追加契約を読み取り照合した。**実施していないこと**：ローカルNode/Vitest/Prettier/Playwright/Androidの実行、製品SUT/正式仕様/Seed/既存テストの変更、#199/#210/#211へのcommit、merge/force push。基本分析179/188・非default17/20は維持する。

## 2026-11-04 Use Case根拠の独立再検証（固定HEAD `775cf53c2ae4104ebb9b483994e6575a578f6748`）

### 検証結果と修正

- 208件の分析台帳に含まれる `use_case_evidence` **283参照**を、親#199の現比較HEAD `493a403b6449ae908117a23b4d631132a7d6d098`と共通の製品実装ファイルの**実際の行・署名**へ照合。旧値で276/283件一致、**7件は行番号が不一致**。対象メソッドの署名が各ソースに一意に存在することを確認し、下表の行番号へ修正した。これはメソッドが正しく動作することや実Run PASSを証明しない。
- `SCREEN-CHECKOUT-ADDRESSES-A02-01`（配送先未登録案内）は、Web `src/presentation/pages/addresses-page.tsx:45-66,100-110` の `account.listAddresses()` の結果で空表示を決定する。対応する `AccountUseCases.listAddresses:83-86` の `requireCustomer()→addresses.listByUser(user.id)` を確認し、`related_use_cases`、`use_case_evidence`、`audit_branch_refs`を追加。住所登録 `createAddress` は同じ画面の別操作なので、空状態のUse Caseとして重複付与しない。
- 本変更は `use_case_evidence.line` 7件と上記1操作の読取経路だけ。**分析状態は変更せず**、操作179/188、非default状態17/20を維持。製品SUT・正式製品仕様・Seed/Reset・既存契約テストは変更しない。

| 操作ID | Use Case | 修正前→修正後の行 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock` | `CatalogUseCases.getProductDetail` | 100 → 108 |
| `SCREEN-AUTH-SIGNUP-A02-03` | `AuthUseCases.register` | 116 → 121 |
| `SCREEN-REVIEWS-EDITOR-A02-01` | `CustomerReviewUseCases.delete` | 194 → 193 |
| `SCREEN-ADMIN-REVIEWS-A02-03` | `AdminReviewUseCases.bulkChangeVisibility` | 442 → 441 |
| `SCREEN-ADMIN-PRODUCT-DETAIL-A01-04` | `AdminOperationsUseCases.searchInventory` | 53 → 57 |
| `SCREEN-ADMIN-PRODUCT-DETAIL-A01-04` | `AdminOperationsUseCases.getInventoryDetail` | 68 → 73 |
| `SCREEN-ADMIN-PRODUCT-DETAIL-A01-04` | `AdminOperationsUseCases.adjustInventory` | 85 → 91 |

### related_use_casesがない操作の判定

- 変更前の`analyzed`操作のうち `related_use_cases`未設定は**23操作**。上記配送先未登録案内1操作は直接呼出しを発見したため修正。残る**22操作は本調査で既存の公開Use Caseに対応付ける必要を確認できなかった**。実装上はナビゲーション、文章表示、境界ページ、別のTest Controlサービスが責務を持つ。形式的にUse Case名を作らない。

| 操作・画面 | 件数 | 検査した責務と今後の実受入 |
| --- | ---: | --- |
| `SCREEN-STOREFRONT-HOME-A02-01/A02-02` | 2 | guest/customer別のWeb/NativeリンクとRouteGuard。HomePageではcatalog.getHomeも使うが、ここでの動作はRole別導線。Role・リンク遷移と情報非露出は未実Run |
| `SCREEN-ADMIN-DASHBOARD-A01-02` | 1 | AdminShellの基本7リンク、admin限定リンク、Test APIビルド分岐。Use Case処理ではなくリンク表示と認可を検証 |
| `SCREEN-SUPPORTING-GUIDE-A01-01/A01-02/A02-01/A02-02` | 4 | GuidePageの固定説明・辞書・Role/Rank・Test Controlリンク。内容正確性、Native文言差、アクセス権限、外部Skill再配布は別受入 |
| `SCREEN-SUPPORTING-TERMS-A01-01/A02-01`、`SCREEN-SUPPORTING-PRIVACY-A01-01/A02-01`、`SCREEN-SUPPORTING-COMMERCE-A01-01/A02-01` | 6 | 法的説明画面のWeb/Native表示とShellの戻り導線。文章の正式受入・Android/画面画像・a11yは未受入 |
| `SCREEN-BOUNDARY-FORBIDDEN-A02-01` | 1 | StatePanel・Native画面からの戻り導線。A01-01の停止staffループ/拒否理由・機密情報非露出は未解決 |
| `SCREEN-TEST-CONTROL-A01-01/A01-02/A01-03/A01-04/A02-01` | 5 | 公開Use Caseではなく `TestControlService` がシナリオ/時刻/遅延/Resetを扱う。production拒否、リセット前後差、失敗復帰・実Runは未受入 |
| `SCREEN-BOUNDARY-NOT-FOUND-A01-01/A01-02/A02-01` | 3 | `+not-found`、StatePanel、NativeUnsupportedScreen。未知Path・Role別・Android実画面/戻り操作の検証が残る |
| **計** | **22** | 実行・視覚・Role/Sessionを検証する必要は残り、Use Case未設定のみでは基本分析不合格としない |

### バリデータの監査範囲と修正先

- 現行 `scripts/training/validate-supported-behaviors.mjs` は `implementation_evidence`、`seed_evidence`、`seed_evidence.transform` の署名照合を必須化する一方、`use_case_evidence`の署名と行位置を同水準で直接照合していない。このため上記7件の旧参照は、`analyzed`状態のまま残り得た。**#199側のvalidator/契約テストで任意の`use_case_evidence`が存在する場合、その公開Use Case名・path/行/署名を `use_case_methods` の正本と照合する検査を追加することを推奨**。#212の変更境界ではvalidatorと契約テストを編集しない。
- `audit_branch_refs`なしで`analyzed`の13件は、旧データで実装/Seed/公開Use Case参照を保持している。13件だけでも上記に含まれる `AuthUseCases.register` の1参照が古かったため、参照項目の**存在**と行の**有効性**を分けて判断する。これをもって全13件の画面・DB実受入とはしない。

### 最終管理者保護の受入条件再検討（製品コード変更なし）

- #199の `AdminUserUseCases.changeRole:567-598`、`changeSuspension:600-640` は、管理者actorの認可と自己変更拒否をtransaction前に行い、targetがadminかつ `countActiveAdmins()<=1`なら`LAST_ADMIN_PROTECTED`とする。
- **正常な一貫した状態では**、権限を持つactive admin actorと、本人以外のactive admin targetが存在する時点でactive admin数は少なくとも2。2人→1人への変更は許可され、残る1人が自分を降格/停止しようとすると先に`SELF_CHANGE_FORBIDDEN`になる。従来の「非selfの最後のactive admin」を単純な固定Seedで作るテスト条件は、**有効actorという前提と両立しない**。
- #199の旧版は認可後・transaction前にactorを失効させる時間差で `countActiveAdmins()<=1`に到達する余地がある。#210 HEAD `03bd4c8abec15c8004d0fc8c8b09e36cc0f68f79`の `assertActorStillAuthorized` は同じ`change-user-access` transaction内にactor Session/Role/Statusの再検証を入れており、失効actorを先に拒否する。#210は未マージのため#199へ受入済みとしない。
- A02-03の実行条件は、(1)自己降格/停止の`SELF_CHANGE_FORBIDDEN`、(2)2人→1人への許可変更とtarget Session無効化、(3)#199旧版の認可時点差と#210版の再認可・DB不変の対比、(4)別の管理者が残っていることの不変条件、(5)確認UI・最新Version・a11y/実Webを**別Case**として実証する。人工Repositoryで`LAST_ADMIN_PROTECTED`分岐を単体実行しても、現実の権限付き画面で再現した証拠として流用しない。
- `SCREEN-ADMIN-USER-DETAIL-A02-03`と関連A01-02/A01-04の`review_required`は保持し、既存製品コード・正式仕様・テストをこのPRで修正しない。

### CIと比較時点

- PR #212 HEAD `775cf53c2ae4104ebb9b483994e6575a578f6748` のWeb CI [#41743735380](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41743735380)は**completed/failure**。Vitest contractsは**1032 passed、13 failed（supported-behaviorsの固定status12、Assessment Calibration1）**、Style Qualityは `tests/contracts/ai-assisted-qa-admin-users-list.test.mjs`と`ai-assisted-qa-assessment.test.mjs`の2ファイルで不合格。今回の新HEADにこの古い実行のPASS/FAILを流用しない。
- 親#199比較HEAD `493a403b6449ae908117a23b4d631132a7d6d098`との旧比較結果はステータス差58件、説明・根拠のみ45件（合計103件）。今回の1件のUse Case関連付けと7参照の更新で**フィールド差の件数ではなく内容が増えた可能性**があるため、統合時にID・フィールド単位で再計算する。
- 今回の変更でデータ全体の分母・基本分析statusを変更していない。ローカルNode/Vitest/Prettier/Playwright/Androidは実行しておらず、**CIの新HEAD結果確認と実Run受入は残る**。

### 追加確認：同一最終HEADの参照整合と比較差分

- #212の修正HEAD `5b9d246e598758e5e731974ec71f0298908d863f`に対し、208 Behavior全件の`implementation_evidence`・`seed_evidence`・`seed_evidence.transform`を25ファイルから**624/624件**照合し、行番号/署名はすべて一致。
- 同一HEADの公開Use Case根拠は、上記修正7箇所と配送先読取1参照追加の後、**284/284件一致**。計**908/908参照の行・署名一致**を独立確認（メソッドの振る舞い、Role/DB/画面受入は別）。
- #199の比較HEAD `493a403b6449ae908117a23b4d631132a7d6d098`と修正HEAD `5b9d246e598758e5e731974ec71f0298908d863f`を実データで再比較し、ID集合は同一208件、基本分析status差**58操作**、status以外の差**51件**、計**109件**。従来の99/103件は前の比較時点の値として扱う。内訳は58操作が#212のみ`analyzed`（#199のみは0件）、非default状態のstatus差は0件。
- `SCREEN-ADMIN-USER-DETAIL-A02-03`に残っていた「正常な非self最後のadminへ変更要求する」固定fixtureは、validなactive admin actorとactive admin targetが別人ならadmin数が2名以上となるため成立しない。A01-02/A01-04/A02-03のCaseを、自己変更拒否、2→1許可、認可後にactorを失効させる競合に分割して台帳へ訂正。**3操作ともreview_requiredを維持**し、直接UseCase/DB/Playwright/Androidの実受入は未完了。
- #212を取り込む際は#210の認可修正が既に#199へ入っていると仮定しないこと。旧#199と#210は異なるHEADで、実行検証・製品側の仕様判断は権限あるブランチで行う。

### 追加監査：Use Case参照の補完と判断保留

- 台帳の`related_use_cases`と`use_case_evidence`を全208件で比較したところ、`related_use_cases`の登録自体と追加根拠のIDに差がある操作/状態は14件。**関連Use Case全件に必ず直接メソッド定義の証拠が必要という契約は現validatorにない**ため、機械的に不合格または全件追加としない。
- このうち `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` の `CheckoutOrderUseCases.getConfirmation:176` / `beginOrder:185`、`SCREEN-ADMIN-USER-DETAIL-A02-01` の `AdminUserUseCases.changeRole:567` / `changeSuspension:600`、`SCREEN-ADMIN-USER-DETAIL-A02-02` の `changeMembershipRank:542` / `changeRole:567` / `changeSuspension:600` は、各Caseが直接境界として検査対象とする公開メソッドなので**計7参照**を追加。これら3件は全て`review_required`のまま。
- 残る**11件**については参照の意味を再点検する。①表示に必要な読取/副作用メソッド: `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock`、`SCREEN-STOREFRONT-CART-A02-03`、`SCREEN-CHECKOUT-ADDRESS-A02-01`、`SCREEN-CHECKOUT-PAYMENT-A01-01`、`SCREEN-ADMIN-INVENTORIES-A01-03`、②主要UseCase以外の情報取得: `SCREEN-AUTH-ACCOUNT-PROFILE-A01-01`、③関連する別操作/実行用fixtureと直接画面呼出しの分離: `SCREEN-ORDERS-DETAIL-A01-03`、`SCREEN-ORDERS-DETAIL-A02-02`、`SCREEN-ORDERS-DETAIL-S-reviewable`、`SCREEN-REVIEWS-EDITOR-A02-01`、`SCREEN-ADMIN-ORDERS-A02-01`。一律に`related_use_cases`を削除したり、実行したと偽って`use_case_evidence`を追加したりしない。
- 追加した参照は台帳の**静的な情報源**。既存`audit_branch_refs`の意味一致、最終HEADのValidator/Tests、Use Caseの直接Run、DBの前後証拠は引き続き独立受入条件。

## 2026-11-04 継続監査：公開Use Case対応差の分類と直接証拠5件補完

対象：#212 commit `5d82e9b4c0287e5b488a3855c87994d76e33e46a`。製品本体・正式仕様・Seed/Reset・既存テスト、#199/#210/#211のファイルは変更していない。

### 台帳へ反映した直接呼出し5件

| 操作ID | 確認した画面経路 | `use_case_evidence` の追加定義 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-CART-A02-03` | `cart-page.tsx:35-38` 初期loadで `getCart`、削除後は `removeItem` の返却DTOをsetCart。削除のたびにgetCartを追加呼出しするわけではない | `CartUseCases.getCart` `cart-use-cases.ts:82` |
| `SCREEN-CHECKOUT-ADDRESS-A02-01` | `checkout-order-pages.tsx:115-147` のWeb `start` の `resumed` / `replaced` を通知。Native `useCheckoutSession` は `getActive` → 未開始時 `start` | `CheckoutOrderUseCases.start` `checkout-order-use-cases.ts:108` |
| `SCREEN-CHECKOUT-PAYMENT-A01-01` | `checkout-order-pages.tsx:247-273` `getActive("payment")` でSessionを取得し `setPayment` | `CheckoutOrderUseCases.getActive` `checkout-order-use-cases.ts:141` |
| `SCREEN-ADMIN-INVENTORIES-A01-03` | `admin-operations-pages.tsx:105-128` は選択SKUの `getInventoryDetail` と調整 `adjustInventory` を別に呼ぶ | `AdminOperationsUseCases.getInventoryDetail` `admin-operations-use-cases.ts:73` |
| `SCREEN-ADMIN-ORDERS-A02-01` | `admin-operations-pages.tsx:320-343,430-490` の一覧 `searchOrders` → orderId Link → 詳細 `getOrder` | `AdminOperationsUseCases.searchOrders` `admin-operations-use-cases.ts:115` |

追加5件とも台帳に既存の `related_use_cases` があり、公開メソッド定義の一意なpath・行・署名を現行ソースで確認した。以前からあった証拠は変更していない。特に削除後の再読取と削除Use Caseの戻りDTO、WebとNativeで異なるCheckout再開経路を混同しない。

### 残る対応差7操作の意味（自動的不合格ではない）

| ID | 差分と調停結果 | 後続の確認 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock` | `CartUseCases.addItem` は在庫0での拒否を検証する別操作側の責務。状態表示の直接呼出しは `CatalogUseCases.getProductDetail`。関連情報は維持 | 在庫0のWeb disabledとUse Case直接拒否・DB/Cart不変の実証 |
| `SCREEN-AUTH-ACCOUNT-PROFILE-A01-01` | 画面の直接データ取得は `AccountUseCases.getProfile`。`AuthUseCases.getCurrentUser` の追加証拠は認証状態の補助参照であり、プロフィール内容の直接取得とは区別 | RouteGuard / Runtimeの認証更新経路と本人データ非露出の実証 |
| `SCREEN-ORDERS-DETAIL-A01-03` | 詳細画面は `getMyCustomerOrder` の `reviewState` を表示。`getEligibility/create/update` はリンク先のレビュー操作/状態遷移であり、注文詳細の直接呼出しではない | 投稿後再表示、非公開/削除済みの画面実Run・本人権限 |
| `SCREEN-ORDERS-DETAIL-A02-02` | `AdminProductUseCases.update` と `AccountUseCases.updateAddress` は注文確定後に商品/住所を変える試験準備。履歴スナップショットの直接表示は `getMyCustomerOrder` | 購入後の変更前後、OrderItem/AddressSnapshotと実画面の不変性 |
| `SCREEN-ORDERS-DETAIL-S-reviewable` | `getEligibility/create` はリンク先と状態生成に関連するが、注文詳細の直接読取は `getMyCustomerOrder` | 投稿可能→投稿済みへの遷移、別ユーザー拒否 |
| `SCREEN-REVIEWS-EDITOR-A02-01` | `AdminReviewUseCases.changeVisibility` は管理者による状態変更であり顧客Editor画面の直接呼出しではない。顧客の状態読取/編集/削除とは分離 | published/hidden/deletedとHistory/Summaryの前後、Web/Native表示 |
| `SCREEN-ADMIN-ORDERS-A02-01` | `startPreparation/ship/completeDelivery` は詳細遷移後の状態別更新。遷移は `searchOrders/getOrder` で読取のみ。後続更新の関連付けは保持 | 詳細への遷移時DB不変と、Version付き更新のCAS/拒否を別Caseで実証 |

`related_use_cases` は直接呼出し専用フィールドではなく、別操作による状態生成や負例も関連として保持し得る。**そのため、7件をゼロにするためだけの一括削除・証拠捏造はしない**。直接呼出し不足5件についてのみ新たな根拠を記録した。7件の表の「後続確認」は実行・製品適合が未受入であることを意味する。

### 固定HEADでの再照合・親ブランチとの差分

- `implementation_evidence`・`seed_evidence`・`seed_evidence.transform` は25ソースファイルの**624/624件**で行番号・署名が一致。
- `use_case_evidence` は9 Use Caseソースファイルの**296/296件**で正本76公開メソッドのID、path、行、署名と一致。13件はメソッド署名先頭の空白文字が異なるため、空白を除いて比較。**合計920/920の静的参照一致**（実行結果ではない）。
- 親#199比較HEAD `493a403b6449ae908117a23b4d631132a7d6d098` と#212 `5d82e9b4` の同一208件をID・フィールド単位で比較。**相違111件＝分析ステータス差58件＋ステータス以外だけの差53件**。58件はステータス以外の項目も異なるため、各フィールドの差件数としては111件すべてにステータス以外の差がある。#199のみが `analyzed` の操作は0件。前HEADの差109件は最新比較値ではない。
- 基本分析**179/188操作**、非default**17/20状態**、79要件、76公開Use Case、`audit_branch_refs` 未設定の analyzed 13件、関連Use Case未設定22操作は維持。状態・分母・source_commitは変更していない。

### 前HEADのWeb CIを確定（新コミットのCIとは区別）

#212 `eaacfd5b2b1f527c67d69462b63bff2b1b651b89` の [Web CI #41748832195](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41748832195) は **completed/failure**。契約13失敗＝ `supported-behaviors` の固定 `review_required` 期待12件、Assessment Calibration 1件。Prettierは `ai-assisted-qa-admin-users-list.test.mjs` / `ai-assisted-qa-assessment.test.mjs` の2ファイル。verify/validateは失敗。一方、Integration/Repository/Component/Unit、Code Quality、build、required/cross-role/accessibility/mobile-boundary/training Chromium E2E、UI Review 4画面サイズ、Training runtime contractsは成功。

これらは全て**追加5参照のコミット前のCI**。新HEADに成功/失敗結果を流用しない。#212の変更境界に従い、#199側の固定status契約/Validator、#211 Assessment修正と各PR担当のPrettierはこのPRで編集しない。新HEADのCI、実Web/Android/DB/Session/Trace、製品適合、教材と配布の技術受入は引き続き別ゲート。

## 2026-11-04 継続：未設定audit_branch_refs 13操作＋未受入状態1件の補完

対象HEAD：`cd02b39f6a4c7ef5bff7799e671ce4797f551a33`。対象は分析台帳と本レポートのみ。製品SUT・正式仕様・Seed/Reset・既存テストと#199/#210/#211は変更していない。

### 実施内容

- [`47c868f9`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/47c868f9b2853c3ce97685dc7c2e6583dd1407cb)：`audit_branch_refs`未設定だった基本分析済み**13操作**に、正式仕様・画面/Native・Use Case・Repository・Seed・既存テストを追跡する**60参照**を追加。追加対象は登録成功遷移1、注文詳細スナップショット1、管理商品一覧→作成/編集遷移2、商品新規4、商品詳細4、管理在庫一覧1。既存`related_use_cases`や`use_case_evidence`、分析statusは変更しない。
- [`cd02b39f`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/cd02b39f6a4c7ef5bff7799e671ce4797f551a33)：未受入`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`に**7参照**を追加。正式仕様`storefront.md:68-74`、Seed `metadata.ts:86-94`・`scenarios.ts:39-40`、Web UI `catalog-list-page.tsx:282-290,501-525`、パンくず実装`admin-patterns.tsx:4-18`、既存component `catalog-pages.test.tsx:305-316`を確認。
- 追加**67/67参照**は、参照先18＋6（重複込み）のソース集合についてファイル存在・`start_line/end_line`整数・範囲・非空のソースを独立検査済み。60参照と7参照の検査は別々の固定HEADに対して実施。**参照行の静的存在確認であり、実画面・DB・Role・製品適合を証明しない**。
- 新台帳の`audit_branch_refs`は**208/208 Behavior**に設定され、総参照数**2,515**。`analyzed`で未設定は0。既存2,448参照の内容・実装意味を今回すべて再監査したわけではない。
- `analysis_status`は基本分析**179/188操作**、非default **17/20状態**のまま。`source_commit`、79要件、76公開Use Case、実装・Seed・変換元624参照、公開Use Case296参照は不変更。

### empty-catalogの不適合断定を訂正

従来の`basic_analysis_review`は「空状態に戻り導線なし」としていたが、Web `CatalogListContent`は`Breadcrumbs(items=[{label:"ホーム",href:"/"}, ...])`を常設しており、`Breadcrumbs`自身は`href`を持つ項目をExpo Routerの`<Link>`にする。一方`showUnfilteredEmptyState`の`StatePanel`は`action={null}`であり、componentテストもパネル内CTAなしを期待。フィルタで0件の場合は別途「条件をすべて解除」CTAがある。

確定しているのは**パネル内CTAがないこと**と**パンくずのホームリンクが存在すること**。正式仕様の「元の画面に戻る導線」にパンくずが含まれるか、正本画像・実Webでの見え方とkeyboard/a11yから判断する必要がある。「画面全体に戻り導線がない」と断定せず、`risk`/`test_condition`/`basic_analysis_review`/`analysis_progress`を修正。**`review_required`は維持**し、#210の製品UI/正式仕様は変更しない。

### 親PRとの比較、CIの扱い

- #199比較HEAD `493a403b6449ae908117a23b4d631132a7d6d098`との差分は、**124 Behavior ID**＝status差58件、status差を持たないその他の差66件。status差の58件も追加情報の差を含む。旧111件は追加67参照前の比較履歴に限定。
- #212前HEAD `68d49e61` の [Web CI #41756435741](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41756435741) は**completed/failure**。契約・Style Qualityが失敗、verify/validateもfailure。Integration/Repository/Component/Unit、Code Quality、Web required/cross-role/accessibility/mobile-boundary/training-web-baseline等は成功。これらは本変更後のHEADのCI結果ではない。
- 新コミット `47c868f9` の [Web CI #41758131249](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41758131249) は確認時点で進行中、`cd02b39f` の [Web CI #41758571989](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41758571989) はpending。最終HEADの合否は未確定として扱う。

### 残る受入作業

- **基本分析**：9操作（管理商品一覧1、管理ユーザー一覧1、管理ユーザー詳細6、禁止境界1）と3非default状態（商品一覧empty、住所resume通知、confirmのstale Cart）の実Web/DB/競合・仕様判断。
- **分析契約**：#199の6操作ID/12箇所固定`review_required`期待と基本分析statusの衝突、`validate-supported-behaviors.mjs`のUse Case path/行/署名検査追加。変更先は#199。
- **Assessment/Style**：#211のAssessment Calibration期待値調停、#199 admin-users-listと#211 assessmentのPrettier修正、統合最終HEADで契約とStyle再実行。
- **製品/実受入**：#210の認可/Version、決済runtime、Web/Native差、IndexedDB/SQLite全表前後、Maestro/Android、画像・keyboard/a11y。今回の参照補完で完了扱いしない。
- **教材/配布/統合**：M00〜M10実演習・採点・Private CI・`course:sync`・ライセンス・各PRの競合調整、同一最終HEADの必須Web/Mobile CIと独立レビュー。merge/force push等は未実施。


### 追加確認：60参照追加HEADのCI結論

[`47c868f9` Web CI #41758131249](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41758131249)は**completed/failure**。ジョブログを独立照合し、Vitest contracts は**1032 passed / 13 failed / 1 expected fail / 15 skipped**。失敗は従来どおり固定`review_required`期待12件＋Assessment復旧期待エラー1件。Style Qualityも既存`ai-assisted-qa-admin-users-list.test.mjs`、`ai-assisted-qa-assessment.test.mjs`の2ファイルのみ。コード品質、Integration、Repository、Component、Unit、Training runtime contracts、UI Review、主要Chromium E2E等は成功。今回追加した60件の`audit_branch_refs`自体に起因する新たな失敗はこのログでは検出されていない。ただし`cd02b39f`以降の最終HEAD成功とは別扱い。

