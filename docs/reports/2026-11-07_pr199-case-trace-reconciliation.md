# PR #199：#219のCase追跡CSVと最新基本分析の差分（2026-11-07）

## 対象と結果

PR #199の追跡用CSV `docs/reports/2026-11-04_pr219-case-traceability.csv`（Git Blob `7ece3d3ca7bbdce8a4c8de4431e0c0b057e146ea`、**953行**）と、分析正本 `training/ai-assisted-qa-course/coverage/supported-behaviors.json`（Git Blob `ef2f50fd65e481ca90dc64da6f88934511c9eebe`、**208動作・79要件**）を、全行の `behavior_id + condition_ref` で突合した。

- **一致**：動作ID208/208、Requirement参照、種別、Platform、79要件の追跡定義205組。重複した動作＋条件キーは0。
- **要再照合**：**12動作に対応する67行**で、旧CSVの`case_expected_from_behavior`、Role、Scenario、基本分析状態が現在の台帳と異なる。他の886行の同4項目は一致した。
- **動的受入**：旧CSVの953行すべて`未受入`。全行の`observed`、DB before/after、exit、CI Run、Trace/動画/画像/Console/Network/Report欄は空。**Case採用や実SUT PASSを証明しない**。
- 旧CSVの`sut_head_sha`は全行で`46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。分析正本の`source_commit`は`383efc9107ef3d5f78c5659473277166c1bba2de`。いずれも今回の#199最終HEADや未マージ#210の製品改修を証明しない。

## 要再照合の12動作（該当67行）

| 動作ID | CSV行数 | 期待結果を再確認すべき条件 |
| --- | ---: | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | 1 | empty-catalogと絞込0件を区別し、空パネル内CTAの有無ではなくホームへの復帰導線を判定 |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | 1 | 初回のみの再開通知、reload/同一Session、新Checkout/Reset、Native範囲を区別 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | 4 | Cart version不一致時の拒否理由、Order/Payment/在庫/履歴/Checkout/Session不変性 |
| `SCREEN-ADMIN-PRODUCTS-A01-02` | 7 | 管理商品一覧の検索・状態フィルター、many-products、Role境界、Web管理対応範囲 |
| `SCREEN-ADMIN-USERS-A01-02` | 7 | Role/Rank/Status検索と個人情報アクセス制限、Admin以外の拒否 |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | 7 | 他者Role変更、自己変更/最後のAdmin拒否、User versionとSession |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | 7 | 顧客Rank変更と非customer拒否、Checkout・Cartへの影響 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | 7 | active/suspendedの許可遷移、全Session失効、Checkout・Cart前後 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | 6 | 本人Adminの自己降格・停止をUI/Use Caseで拒否、全DB不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | 6 | withdrawn対象のRank/Role/Status変更の拒否とDB不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 7 | Admin 2人から1人への他者変更と唯一Admin本人の拒否、Version競合 |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | 7 | 停止staffの権限拒否、`/forbidden`→`/admin`循環防止、戻り導線と非露出 |
| **計** | **67** | |

## 採否・再開条件

1. 対象12動作の最新正式仕様、Role/Seed/Version条件と、現在の`expected`・`test_condition`を独立に確認する。旧CSVの期待結果を現在の台帳で機械的に置換しない。
2. **正式Case ID・採用/既存再利用/不要/保留**を208動作・79要件全体で決定し、既存Case/Assertionの該当対象とSUTの最終SHAを明示する。953行を953件の別Caseとして数えない。
3. 必要なRole/Session、Web/Android、DB before/after、実Run、Trace、画像、CI/attemptの**実在を確認した場合だけ**証拠欄を記録する。既知製品FAILは#210側の解消・未解消を分離する。
4. 対象CSVと分析台帳が意図せず乖離しないよう、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`で**953行、208動作、79要件参照、既知差分12動作/67行**を検査する。これは静的整合性のテストであり、正式Caseや製品の独立レビュー完了を意味しない。

**受入判定**：Case正式採否と実証拠は全件未受入。既存44完了条件のチェック状態は維持し、製品SUT・既存テスト・#210へ変更を加えない。

## 208動作の採否CSVとの整合（現行分析を履歴へ上書きしない）

- `docs/reports/2026-11-04_pr219-behavior-case-acceptance-status.csv`（Blob `8b0abce723acadc3259b73ad743a9aa11e4672d4`）の208行を現行分析台帳（Blob `7f53586e720838544abcf24ac553dece51c13449`）と再照合した。Behavior ID 208/208、kind 208/208、要件参照208/208は一致する。
- **分析状態のみ12動作で差分**：旧CSVは196行`analyzed`・12行`review_required`、現行台帳は208動作すべて`analyzed`。これは上記旧Case追跡CSV（953行）の差分12動作と同じ集合である。旧CSVの履歴は残し、静的基本分析の現在値を旧状態で置き換えない。
- **正式採否は208/208件未確定**：旧CSVの`adoption_decision`はすべて`#213によるCase採否決定未確認`。Web暫定キーが直接記録されているのは11動作、残り197動作の`web_executed_case_count`は0。ただし0は「他レベルのテストなし」でも「新規E2E必須」でもない。Integration/Component/Nativeの再利用候補は各Case条件ごとに別確認する。
- `tests/contracts/pr219-web-evidence-ledger.test.mjs`に、208 IDの集合一致、kind/要件参照の一致、履歴の12`review_required`と現行`analyzed`の区別、全件正式採否未確定を検証する契約を追加する。正式Caseと実Runが承認された際は、証拠に合わせて台帳と契約を更新する。今回の検証は製品のPASSを増やさない。

## 2026-11-07 最終HEADのWeb実Runを用いた追加照合

- 対象：PR #199のHEAD `8ba2fd4fab8ca4739cf82064230dd17cfc37b1d4`。 [Web CI #42365035206](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42365035206) は `completed/success`。確認対象は同Runの `Chromium E2E (cross-role)` job `128381486885` の**実ログ**であり、前回CSVの履歴Runを更新したものではない。
- 実行したcheckoutは `refs/remotes/pull/199/merge`、実SHA `48d0bf123804a8b5dd570718f04b7758b52856be`。ログに `Merge 8ba2fd4... into 2a8bcf57...` とあり、元のブランチHEADや `#210` の製品変更をそのまま実行したという意味ではない。各 `PR219_CASE_RUN` の `buildSha` もこのマージ参照SHAだった。
- Playwrightのジョブ集計は `30 passed`。ログ上の `PR219_CASE_RUN` は**27記録**で、うち**25件が `testStatus=passed/expectedStatus=passed`、2件が `testStatus=failed/expectedStatus=failed`**。後者は既知失敗を期待したテストの成功であり、製品PASSではない。全27件に `productAcceptance=not-evaluated-by-this-summary` がある。Playwright 30件とログ記録27件を同一のCase件数として扱わない。
- **差分12動作との実ログの対応**：`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` 6記録、`SCREEN-CHECKOUT-ADDRESS-S-resume-notice` 1、`SCREEN-CHECKOUT-CONFIRM-S-stale-cart` 2、`SCREEN-ADMIN-PRODUCTS-A01-02` 2、`SCREEN-ADMIN-USERS-A01-02` 1、`SCREEN-ADMIN-USER-DETAIL-A01-02/A01-03/A01-04/A02-01/A02-02` 各1、`SCREEN-BOUNDARY-FORBIDDEN-A01-01` 4。**12動作中11動作に合計21記録**があり、`SCREEN-ADMIN-USER-DETAIL-A02-03` の直接記録は0。残り6記録は要件IDによる認証/注文の3記録と既知不具合再現の3記録である。
- **既知の製品不適合**：商品管理の選択残留は `failed/failed`、many-productsページリセットも `failed/failed`。Checkout競合後にCartでなくPaymentへ戻る再現と停止operatorのForbidden循環再現はテスト自体が `passed/passed` でも「不適合を再現した」という成功である。いずれも正式仕様に対する製品PASSへ計上しない。#210の修正済み判定も行わない。

### 期待結果の仕様根拠と今後の判定

- 空商品一覧の戻り導線は `docs/spec/features/storefront.md:73`、再開通知の一度だけ表示は `docs/spec/features/checkout-and-payment.md:73`、stale Cartの安全な復帰は同 `:126-134` を正本として照合。既存のBreadcrumbsやPayment戻り先が十分かは静的存在だけでは判定せず、UI実物・表示と仕様解釈を独立に確認する。
- 管理商品一覧は `docs/spec/features/admin-catalog.md:59-73`、管理ユーザーは `docs/spec/features/admin-users.md:9-15,23,50-51,75-79`、Forbiddenは `docs/spec/roles-and-permissions.md:31-45` が直接根拠。商品検索・フィルター、ユーザーRank/Sortの詳細は `docs/05_ui/ui_specifications.md:169-170,174-186` も参照するが、正式仕様より詳細な補助記述の拘束力や現製品との差の採否は#210/仕様責任者の判定を要する。
- **未受入の維持**：旧追跡CSV全953行の `未受入` と208動作の正式Case採否未確定を維持する。各Caseの期待結果/Assertion、対象Role・Scenario、DB before/after・rollback、Android/Visual/a11y、Run/attempt/Traceを証拠付きで審査し、採用/既存再利用/不要/保留を独立に決定するまでは完了チェックを変更しない。実ログの再集計だけでは製品SUT、既存製品テスト、#210を変更しない。

## 差分12動作の既存Assertion・最新Web Runへの対応

以下は旧追跡CSVの67行に対する**既存Case再利用候補の調査結果**。記載する行番号はPR #199の対象テストソースにおけるテスト開始行である。Runは[Web CI #42365035206](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42365035206)の `Chromium E2E (cross-role)` job `128381486885`、実checkout `48d0bf123804a8b5dd570718f04b7758b52856be` を指す。Integrationの実行は同Runの `Vitest (integration)` job `128381294593` にて、`pr219-admin-user-acceptance.test.ts` 8件・`pr219-actor-revocation.test.ts` 2件を含む全150件が成功。ただしテスト成功と製品適合は分離する。

| Behavior ID | Webの直接ログ記録 | 検証可能な既存テストの入口 | 正式Case採否に不足する条件 |
| --- | ---: | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | 6 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:326,348,607,704,797,850`、`tests/component/pr219-storefront-states.test.tsx:52` | 無条件0件でBreadcrumbsだけが正式な戻り導線を満たすか、検索条件0件との差、Role/Session/DBと正式視覚正本の最終判定。Native empty視覚を本状態のWeb必須条件へ混入しない |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | 1 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:885`、`tests/integration/pr219-checkout-boundaries.test.ts:97` | 同一tab再入場・reload・Reset・新Checkout ID・別tab・24h期限の通知回数とSession/DB。新ログイン確認1件を全条件の証拠にしない |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | 2 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:442,480`、`tests/integration/pr219-checkout-boundaries.test.ts:169`、既知戻り先再現`e2e/web/pr219-cross-role-lifecycle.spec.ts:433` | 確認画面到達**後**のCart.version競合とbeginOrder拒否、Order/Payment/在庫/Session全不変、Cart/該当Stepへの安全な復帰。Paymentへの誤復帰は製品適合未解消 |
| `SCREEN-ADMIN-PRODUCTS-A01-02` | 2（うち1件expected fail） | `e2e/web/pr219-cross-role-lifecycle.spec.ts:368,383,544`、`tests/integration/pr219-admin-product-query.test.ts:64,90,99,119` | SKU検索、カテゴリー/ブランド、選択残留、ページ変更、一括対象0件、SKU0件価格。現行の選択残留とページ非リセットは製品FAILとして扱う |
| `SCREEN-ADMIN-USERS-A01-02` | 1 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:238`、`tests/integration/pr219-admin-user-acceptance.test.ts:219` | UIのRank/SortとRepository/Use Case一致、20件ページ境界、operator等による個人情報アクセス拒否。補助UI仕様の拘束力は製品側で判断 |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | 1 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:209`、`tests/integration/pr219-admin-user-acceptance.test.ts:67,186` | 他者Role更新の2→1正常系/自己拒否/Version競合、Session全失効、UI・DB前後。後述actor失効競合は別Case |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | 1 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:256`、`tests/integration/pr219-admin-user-acceptance.test.ts:280`、`tests/integration/pr219-isolated-fixtures.test.ts:152` | Rank変更後のCheckout放棄・再計算、非customer/withdrawn拒否、Version競合・rollback、DB全表・Web表示 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | 1 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:302`、`tests/integration/pr219-admin-user-acceptance.test.ts:105,138`、`tests/integration/pr219-isolated-fixtures.test.ts:82,115` | active↔suspended、全Session失効・再開後旧Session不復活、Checkout放棄・Cart保持、stale/障害注入・UI文言 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | 1 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:271`、`tests/integration/pr219-admin-user-acceptance.test.ts:67,235` | 自己Role変更と自己停止の両拒否、管理者2人でも自己拒否、全表不変・Web非操作化、focus/a11y |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | 1 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:286`、`tests/integration/pr219-admin-user-acceptance.test.ts:254` | withdrawnのRole/Rank/Status全拒否、Customer以外のfixture、stale/欠損Targetの優先判定、全表不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 0 | **Web直接ログなし**。`tests/integration/pr219-admin-user-acceptance.test.ts:67,105,138`、`tests/integration/pr219-actor-revocation.test.ts:97,123` | 2→1正常系・自己拒否/並行競合はIntegration候補が存在。ただしactor権限失効後に他Userを変更できる**製品不具合再現テスト**を含む。#210の修正HEAD/再実行と独立判断が必要 |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | 4 | `e2e/web/pr219-cross-role-lifecycle.spec.ts:124,138,154,172,924`、`tests/component/pr219-forbidden-route.test.tsx:41,47,54` | 停止operatorが`/forbidden`と`/admin`を循環する既知FAILの解消、Native拒否画面、Session/DB不変・表示非露出・戻り先 |

**数値上の注意**：12動作に直接結びつくWebログは11動作・**21記録**。ここに未記録のA02-03を「未テスト」と書くのは誤りで、既存Integration証拠を別に記録する。逆にE2E/Integrationのジョブ成功だけを、Role/Scenario/Platform/DB/Visualすべての製品適合証拠へ拡張するのも誤り。29横断要件の暫定キーとこの21記録は重複し得るため合算しない。

**次の判定作業**：各C1〜C7相当の期待結果を正式仕様（`docs/spec/**`）と実Assertionで照合し、正式Case ID・採用/既存再利用/不要/保留・Review担当を決定する。必要なCaseだけを同一製品SHA・テストSHA・Seed/Clock・Role/Session・Run/attempt・保存Artifact・匿名化DB before/afterで再実証する。#210未マージの変更結果、未実行Android/実機・視覚・権利判断を混ぜない。
