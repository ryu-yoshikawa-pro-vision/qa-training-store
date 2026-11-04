# PR #219 境界テスト・Web視覚・Android実行準備と#199引継ぎ

## 対象・判定基準

対象はPR #219の専用テスト・証拠とPR #199の旧SUT `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。本書は**AIエージェントが実施できる事前確認**の記録であり、最終製品実受入ではない。#210の修正は未統合の別HEADとして扱う。既存の正式仕様、Seed/Reset、製品テスト、`.github/workflows/**`、製品実装は本PRで変更しない。

参照正本：[Case/要件の静的照合](./2026-11-05_pr219-static-case-assertion-handoff.md)、[Web履歴Run/Artifact監査](./2026-11-05_pr219-web-evidence-run-audit.md)、[画面比較の詳細](./2026-11-04_pr219-web-responsive-visual-a11y.md)、[Risk別未受入](./2026-11-04_pr219-risk-evidence-and-blockers.md)、[Androidローカル検証手順](../native/README.md)、[Windows Android Runbook](../native/windows-android-local-validation.md)。

## 1. 拒否・失効・stale・競合・rollbackの専用テスト再点検

既存テストをコードで確認。下記の行は`it`/`test`の開始位置で、現HEADでの全条件PASSを主張しない。既存の直接assertionと重複するだけの新規テストは追加しない。

| リスク | #219の既存テスト・確認できたケース | 区別する結果・#199に残す条件 |
| --- | --- | --- |
| actorの認可後失効 | `pr219-actor-revocation.test.ts:97,123` | 降格/停止されたactorが他者を更新できる**既知製品FAIL再現**。対象状態のassertion成功は適合PASSではない。#210修正HEADの再実行・全DB不変は#199 |
| 管理者変更・競合 | `pr219-admin-user-acceptance.test.ts:67,105,138,186,235,254,280` | 2→1/自己拒否/同時停止/stale Role・Rank・StatusとSession/Checkout非変更をassert。高リスクの失効actorは上段と別判定 |
| 失敗注入・rollback | `pr219-isolated-fixtures.test.ts:115,152,184` | Checkout保存失敗、Rank保存失敗、対象Session削除失敗時のUser/Session/Checkout/Cart rollback。SUT外の隔離DBで観測した結果 |
| Cart上限・version | `pr219-cart-boundaries.test.ts:85,128,166,193,224,238,272` | stock0/1/5/6、上限縮小・拒否時Cart/Checkout非変更、stale version、Guest Rank・Sale価格 |
| Checkout状態 | `pr219-checkout-boundaries.test.ts:97,124,141,169,217` | 同一顧客の別Session、別顧客拒否、stale Checkout/Cart、24h期限、Order/Payment/Inventoryの非変更 |
| Order/Shipment/Review | `pr219-order-review-boundaries.test.ts:69,130,164,219` | OrderItem/Address/Rank/Payment Snapshot、配送History失敗時rollback、他人/旧version拒否、Review Summary失敗時rollback |
| 管理商品 | `pr219-admin-product-query.test.ts:64,90,99,119` | 検索・0在庫・0 SKU・空bulkの検証。SKU検索漏れ・Infinity価格は**製品FAIL再現** |
| Forbidden Web/Native | `pr219-forbidden-route.test.tsx:41,47,54`、`pr219-forbidden-native.test.tsx:16`、`pr219-cross-role-lifecycle.spec.ts:922` | Web停止staff戻りリンク循環・Native拒否文言差は**既知不具合再現**。Native ComponentはAndroid端末PASSではない |
| Empty/Error/Loading | `pr219-storefront-states.test.tsx:52`、`pr219-cross-role-lifecycle.spec.ts:605,702,795,848` | 注入後Retry・7幅・DB23表digest不変の該当assertionを確認。実画像/Traceの保存と正本比較は未受入 |
| Checkout競合Web | `pr219-cross-role-lifecycle.spec.ts:433,442,480` | 競合の見出し/操作/7幅/axe/DB23表不変と、戻り先`/checkout/payment`の**製品FAIL再現**を区別 |

**CI根拠**：旧固定HEAD `748b48c` の[Web CI #41851834802](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41851834802)ではCode Quality、Unit/Component/Integration/Repository、Vitest contracts（1099 passed）、required/accessibility Chromiumおよびcross-role Chromium jobが個別成功。cross-roleは29 passed＋既存2 flaky（`getByRole("status")`二重一致による初回失敗→retry成功）。Style QualityのMD012と派生verify/validateによりworkflow全体はfailure。この後の#219専用文書修正HEADについてCI全体成功は**未確認**。共有テストのflakyは#199へ既に引継ぎ済み。

**判断**：この準備対象の拒否・失効・stale・競合・rollbackについて、追加すべき明確なassertion重複を見つけなかったため、新規テストの水増しはしない。正式Case全件の確定、製品修正後の再実行、Android/SQLite・成功時保存Artifactに依存する不足条件は#199の最終実受入で確認する。新しい要件採否が確定して不足が判明した場合は#213の条件を根拠に専用テストを追加する。

## 2. Web視覚・a11yの事前照合

| 画面状態 | Web/Componentで確認済みの条件 | 保存画像/正式正本の状態・未受入 |
| --- | --- | --- |
| Empty/FilterEmpty | Run [41811366480](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)で320/390/767/768/1023/1024/1440px、戻り/解除、横はみ出しなし。320/1024pxのaxe重大違反なし。Run 41841987928で320/390pxのページ末尾非遮蔽 | UI Reviewの4幅（320/390/1024/1440）画像は保存あり。1440px正式Empty正本との差は**高さ29pxと最低評価Select配置**。正式適合は未判定 |
| Loading | [Run 41848289866](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41848289866)で7幅のLoading/aria-busy、320/1024px axe、解除後EmptyとIndexedDB23表不変のassertion成功 | 成功時の**Loading画面PNG/Trace/axe JSONはcross-role Artifactに未保存**。正式Loading正本との比較未実施 |
| Error→Retry | [Run 41841987928](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841987928)で7幅、内部例外非露出、Focus→Enter、Retry→Empty、320/1024px axe、IndexedDB23表不変のassertion成功 | 成功時の**Error PNG/Trace/動画は未保存**。UI ReviewにあるEmpty画像で代用しない |
| Checkout Conflict | [Run 41821726873](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41821726873)で7幅の見出し/戻り、横はみ出しなし、320/1024px axe、Keyboardを確認 | 成功時の**Conflict PNG/Traceは未保存**。戻り先の`/checkout/payment`は製品FAIL再現であり適合PASSではない |

保存を確認した画像の例：Run 41841987928 Small Mobile `13329861639` の`products-empty-page-end.png`、Desktop `13329807665` の`products-empty.png`。これらは同Runの**別UI Review job**の画像であり、cross-role成功Caseの添付ではない。現在の`playwright.config.ts`は`trace: retain-on-failure`、`screenshot: only-on-failure`、`video: retain-on-failure`である。成功時Caseの画像/Traceを保存する共有workflowとArtifact取得は#199の担当。

#199の最終比較では**正式正本の存在するPlatform/状態だけ**を照合し、存在しないTablet正本を創作しない。Focus順・スクリーンリーダー・画像差分は採用CaseのRole/幅/状態で独立判定する。

## 3. Android・SQLite最終実行の準備

**Android端末Runは本作業では未実施**。PR #219のNative Component/SQLite契約の成功は実機/エミュレータの証拠ではない。次の2経路を用意し、実行権限と機材のある#199最終担当が選択する。

### GitHub ActionsのAndroidエミュレータ

- `.github/workflows/native-ci.yml`の`pull_request`自動起動は#199で一時停止中。現行は`workflow_dispatch`のみ。入力`capture_spec_visuals`（既定`false`）と`capture_case_key`（既定`SCREEN-STOREFRONT-HOME/default/android`）を持つ。**共有workflowを#219では変更しない**。
- 手動dispatchを行う権限のある実行者が、#199の最終統合HEADと対象branch/inputsを明示して実行。API 34 x86_64エミュレータ上でNative Static、Automation/Production Build、Runtime/Boundary/購入/Review、Production Bundle Guard、iOS所定buildと`native-ci / verify`を確認。実施前にworkflowのconcurrency（同refの後続Runで先行Runをキャンセル）を考慮する。
- Android実行証拠は`native-android-runtime-evidence-<run_id>` Artifact（`Collect Android evidence` →`scripts/native/android-ci-runtime-evidence.sh`、7日保持）と各Maestro JUnit/画像・Hierarchy/Logcatを照合する。Runがqueued、cancelled、skippedならPASSではない。
- 本接続から端末/エミュレータを直接操作したり、権限付きworkflow_dispatchを確実に起動したりはできない。**#199の最終工程で要実行**として残す。

### Windows USB実機（Runbook正本）

既存の`docs/native/windows-android-local-validation.md`を使う。固定契約はNode.js 24 / pnpm 10.34.5 / Java 17 / Maestro 2.8.0、`C:\Android\Sdk`（Android 36、Build Tools 36.0.0）、物理端末をADBで`device`と確認。リポジトリ短縮エイリアス`C:\q`とVirtual Store`C:\v\qts`は別の作業物を上書きしない。Windows Runbookは**USB実機用**であり、Androidエミュレータは上記Actions経路と区別する。

実行入口`scripts/native/windows/android-local.ps1`の`-Action`は`Doctor`→`Prepare`→`Build`→`Install`→`Smoke`→`Test`→`RuntimeSuite`→`BoundarySuite`。物理端末は`-RequirePhysicalDevice -DeviceSerial <実機serial>`を指定。途中で失敗した場合は上流原因を確認するまで次のSuiteへ進まない。Testは既定`maestro/native-test-control.yaml`を使用。Runtime/Boundaryの`native-restart-persistence.yaml`、`native-reset-dirty-state.yaml`、`native-out-of-stock.yaml`、`native-low-stock.yaml`、`native-purchase-limit.yaml`、購入/Review/決済リトライ/Session再開等を採用Caseに応じて実行する。

結果はローカル機械証拠`.artifacts/native-local/<RunId>/`と共有用画像`output/mobile-native/`へ保存する。APK、SDK、キーストア、認証情報、DB実値をGitへ追加しない。AndroidのSession/SQLite前後・Navigation・停止/再開・Forbidden/戻るは正式Case IDと実装/端末SHAを付けて観測し、単なるNode SQLite contract成功と区別する。機材・SDK/ADB/Maestro・workflow実行権限が整わない場合は理由と再開条件を**BLOCKED**として#199へ渡す。

## 4. #199最終工程への引継ぎとレビュー前提

1. [29横断要件静的照合](./2026-11-05_pr219-static-case-assertion-handoff.md)から#213の正式Case採否とRisk/TR/Condition/Case IDを受ける。188操作＋20状態を一律新規E2Eへ変換しない。
2. [50履歴/8 Runの監査](./2026-11-05_pr219-web-evidence-run-audit.md)を旧固定SUTの部分証拠として残す。#199最終HEAD・#210未統合/統合修正・各Run/attempt、Role/Session、Seed/Clock、DB前後、成功時Artifactの実在を再確認する。
3. Web Conflict/Forbidden/管理商品選択/SKU検索/actor失効の**製品FAIL再現**、既存E2Eの`role=status` strict locator **TEST ERROR/flaky**、Android・SQLite **未実行/BLOCKED**、正式画像差分**未判定**を独立して追跡する。
4. #199の最後に実Web・Android/SQLite、画面・a11y・成功時Trace/動画/画像を固定最終HEADで実行して製品適合を判定。#219のCI jobの緑色だけで最終受入項目をチェックしない。
5. 独立レビューは未依頼・未実施なら完了にしない。#219自身の差分は専有テスト・レポートに限定し、他PRの共通修正や#210製品修正を混入させない。#199へマージする際は明示承認を要する。

本書は準備の引継ぎ資料であり、最終受入の合否判定や第三者レビュー記録の代替ではない。
