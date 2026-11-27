# PR #219 Web 画面幅・視覚・a11yの照合

## 実行証拠

- **製品SUT**：PR #199 base `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。**テスト実行HEAD**：`83fb0325d6efc7d2a517561e52f32bfe793f5986`。CI：[Web CI #41811366480](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)は全体success。別HEADの不具合修正は持ち込まない。
- [cross-role Chromium job 126512596197](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/job/126512596197)で`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`について320/390/767/768/1023/1024/1440pxの無条件0件・絞込0件の2CaseがそれぞれPASS。Home/解除CTAのキーボードEnter、横はみ出しのassert、320/1024pxのaxe critical/serious違反0を確認。幅ごとのScreenshot/axe JSONは`testInfo.attach`で生成したが、**cross-role ReportはArtifact一覧になく永続保存の根拠はない**。
- [Component job 126512202338](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/job/126512202338)で`pr219-storefront-states.test.tsx`のLoading→Error→Retry→無条件0件をassertして成功。実ブラウザのNetwork障害ではなく、Componentにおける依存サービスの拒否注入による検証。
- `e2e/web/ui-review.spec.ts`のUI Review各job successで全画面PNGを保持。以下は同じCI RunのZIPを取得して各`products-empty.png`を実際に開き、寸法と構成を照合した結果。

## 実画像の比較

| 画面幅 | 実画像（同Run） | 画像寸法 | 確認結果と不足 |
| --- | --- | --- | --- |
| Desktop 1440px | [Artifact #13311589417](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/artifacts/13311589417) `products-empty.png` | 1440×1436px | 見出し、左側の絞り込み、並び順、空パネル、Footerを確認。正式Web正本1440×1465との差は高さ29px、最低評価Select周辺の配置差を含む |
| Tablet 1024px | [Artifact #13312612768](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/artifacts/13312612768) `products-empty.png` | 1024×1564px | 左側フィルターと商品0件パネルが横並び、Footerを確認。正式`empty/web-tablet.webp`は存在せず比較先なし |
| Mobile 390px | [Artifact #13313385137](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/artifacts/13313385137) `products-empty.png` | 390×1841px | フィルター折りたたみ、0件パネル、下部ナビゲーション、Footerを確認。full-page撮影画像では固定ナビゲーションが空パネルの一部に重なって見える。実Viewportでの操作阻害は未検証 |
| Small Mobile 320px | [Artifact #13313011582](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/artifacts/13313011582) `products-empty.png` | 320×1899px | 折りたたみフィルター、0件パネルとFooterを確認。上と同様、固定ナビゲーションと空パネルの見かけ上の重なりを、実操作障害としてはまだ断定しない |

- 正式画像は`docs/spec/assets/screens/SCREEN-STOREFRONT-PRODUCT-LIST/empty/web-desktop.webp`（Git Blob `0eb913fbc0ac9bcd673b329c24df8b38617e2fb8`、1440×1465px）を直接確認。正式画面の構成と大きく矛盾しないものの、**ピクセル一致やデザイン承認を得たとは判定しない**。
- `SCREEN-BOUNDARY-FORBIDDEN/default/web-desktop.webp`など別画面状態の正式画像については、当該状態とCIのPNG/Platform/Roleを個別に照合する必要がある。Loading/Error/Conflictの画像・a11y・keyboard実行を、Emptyの成功で代用しない。

## 継続条件

- **タスクリスト13番は未チェック**。Empty以外のLoading/Error/Conflictを含む正式画像の比較、Mobileの重なりの実操作上の影響、全必要画面幅でのFocus順とaxe結果の収集が残る。
- Native/Androidの実行証拠はタスク14、IndexedDB/SQLiteの前後証拠は15、全採用Caseごとの記録は2・20で扱う。#219では製品コード・既存CI/workflow・正式仕様は変更しない。

## Checkout競合画面の7幅受入追加（CI未実行）

- 専用E2E `e2e/web/pr219-cross-role-lifecycle.spec.ts`で、`regular-member`のCheckoutがconfirm-readyとなった後、Cart数量を更新して`SCREEN-CHECKOUT-CONFIRM-S-stale-cart`の競合表示を作る。製品の既知不具合（戻り先が`/checkout/payment`）の再現Caseと、視覚/a11yのCaseは独立したテストに分けた。
- 追加の視覚Caseは320/390/767/768/1023/1024/1440pxで競合見出し・戻りリンクの表示、横スクロールなし、各幅のPNG添付を確認する。320/1024pxではaxe重大違反をassertし、Focus→Enterで戻る導線を確認する。
- 更新SHA `84d3a455acc831efb3b3d24c1a950a9734e8ec1e`。**当該HEADの実ブラウザCIは未確認でありPASSではない。** 成功時のTestInfo添付がCI Artifactに保持されない点は#199へ報告済み。正式競合画面の正本画像との比較、Loading/Error・他画面の視覚とa11y、Android、実Viewportの固定ナビ操作阻害は未受入で、タスクリスト13番は未チェック。

## 現行E2Eの復帰先確認と製品判定の分離（2026-11-05）

- 専用`e2e/web/pr219-cross-role-lifecycle.spec.ts`の`SCREEN-CHECKOUT-CONFIRM-S-stale-cart: conflict widths, axe and keyboard recovery`（暫定Web証拠キー`PR219-WEB-023`）では、7幅の表示・320/1024pxのaxe・KeyboardでEnter操作後、**確認画面`/checkout/confirm`から離れたこと**だけをassertする。製品修正により復帰先が変更されても視覚・a11y Caseが誤検知しないようにした。
- 遷移後の実際のpathnameは`observedRecoveryPath`へ記録し、当該ログの`productAcceptance`は`not-evaluated-by-this-case`とする。復帰先の正否判定は独立した`KNOWN DEFECT REPRO: confirmed Checkout returns to payment instead of Cart`に残す。
- 上記の旧Run #41821726873で実際に観測された`/checkout/payment`は**過去の旧SUT実行結果**として維持し、新しいテストで同じ復帰先が観測されたと主張しない。修正後HEADのWeb E2E結果、正式正本画像・成功時PNGの保存、#210統合後の製品適合は別途確認が必要。

## 固定Run #41821726873のCheckout競合UI結果（2026-11-04）

- テストHEAD `0599c516374710d4144c126a2c0c388e60c1c22c`、#199 SUT `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`、cross-role Chromium job `126547309356`。専用E2E `e2e/web/pr219-cross-role-lifecycle.spec.ts:321`が**1回目PASS**。320/390/767/768/1023/1024/1440pxでCheckout競合見出し・戻りリンク表示、横スクロールなし、320/1024pxのaxe serious/criticalなし、Focus→Enterの戻りをassertした。
- 戻り先は実際に`/checkout/payment`であり、確認ready→stale Cartから安全な復帰先を期待する製品契約とは別の**既知製品不具合**として扱う。前段の専用「KNOWN DEFECT REPRO」Caseも同一jobで成功した。合格したのは表示・操作の当該assertionだけ。
- `testInfo.attach`した7幅画像と2幅のaxe結果は、成功時にGitHub Actions Artifactへ保存されていない。**PNG本体と正式画像のピクセル比較は未実施**。今回のworkflow全体はNative component/typecheck失敗だが、上記cross-role jobはsuccess。Web全画面・Loading/Error/Conflict網羅、Android実機、実画像比較は残るため、タスク13は未チェック。
- Web実行証拠表に`PR219-WEB-023`を追加し、208動作一覧の`SCREEN-CHECKOUT-CONFIRM-S-stale-cart`に関連付けた。

## IndexedDB取得失敗のWeb実行証拠（2026-11-04）

- SUT：PR #199 base `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。テストHEAD：`290555e134cbf3c2d63114c8374f6756e880f311`。[CI #41841987928](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841987928)は**workflow全体success**、cross-role Chromium job [126617054710](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841987928/job/126617054710)は**success（29 passed、既存E2E 1 flaky）**。Style Quality/Code Quality/Vitest contractsも成功。
- 新規`PR219-WEB-026`の`e2e/web/pr219-cross-role-lifecycle.spec.ts:616`は、`empty-catalog`のguest browser内でIndexedDB `products`表の読取失敗だけを注入。320/390/767/768/1023/1024/1440pxすべてでError表示、内部例外文字列の非露出、Keyboard Focus→EnterによるRetry後のEmpty復旧、横スクロールなしを個別assert。320/1024pxではaxe serious/critical違反なし。**各7幅の正本画像との比較は未実施**。
- 同jobの`PR219_CASE_EVIDENCE`では7幅とも`recoveredTo=empty-catalog`/`errorMessageLeaked=false`、取得失敗・復旧前後のIndexedDB**23表すべての表別SHA-256 digest一致**（`tablesChecked=23,allTablesUnchanged=true`）を確認。digest/DB実レコード/Session IDはログ出力せず、成功時Artifact未保存。Case終了時Clock実測は`2026-07-01T03:00:00.000Z`、buildSha `07f1e515ed96d01fef12ad66375caa7136d971dd`、Console/PageError/requestfailed/HTTP 5xx各0。これはReset直後のClock実測とは区別する。
- Web証拠台帳は**48→49履歴行、暫定Caseキー25→26**。過去48行不変。208動作台帳は208行不変、`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`へ`PR219-WEB-026`の追跡キーだけを追加。正式Case採否は#213の判断待ち。成功時PNG/Trace/動画・Network全文のCI Artifact保存は#199担当。Android実機/SQLite、全Loading/Conflictの視覚比較、独立レビューも未完のため、**タスク13・15・19・20等のチェック14/21は維持**。

## #41841987928の保存済み実画像と正式Web正本の照合

- 固定テストHEAD `290555e134cbf3c2d63114c8374f6756e880f311`、SUT `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。[CI #41841987928](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841987928)はworkflow全体success。cross-role job `126617054710`は29件PASSと既存E2Eの1件flaky。商品の読み取り失敗を注入したWeb専用Case（`PR219-WEB-026`）は7画面幅のError表示・内部エラー非露出・Retry→Empty復帰・320/1024px axe重大違反なし・IndexedDB23表不変をジョブログで実証。
- **320pxの保存済み画像を直接確認**：[UI Review Small Mobile artifact #13329861639](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841987928/artifacts/13329861639)に`products-empty.png`（320×1899px）と`products-empty-page-end.png`（320×700px）。後者の実画像ではフッターの免責文・著作権表示が固定下部ナビゲーションの**上に全て表示**される。同じRunの専用E2EのEmpty/FilterEmpty各320/390px計4条件で`pageEndReachable=true`を確認した過去Runとも整合。これは320pxのページ末尾非遮蔽の確認であり、全画面幅の全操作受入ではない。
- **1440pxの保存済み画像を正式正本と比較**：[UI Review Desktop artifact #13329807665](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41841987928/artifacts/13329807665)の`products-empty.png`は1440×1436px。正式`docs/spec/assets/screens/SCREEN-STOREFRONT-PRODUCT-LIST/empty/web-desktop.webp`（Git Blob `0eb913fbc0ac9bcd673b329c24df8b38617e2fb8`、1440×1465px）を直接確認し、Breadcrumbs、空パネル文言とアイコン、カテゴリ/ブランドの絞り込み、0件数、フッターなど主要構成が一致することを目視した。一方、**画像高さ29px差**、最低評価ラベル・Selectの配置差があり、ピクセル一致および正式デザインへの完全適合は未判定。画像正本・UI reviewの対象Run/Platformは一致するが、デザイン承認はまだない。
- **保存範囲を区別**：上記PNGは**別のUI Review job**が保存したEmpty baseline画像。Web専用Error・Checkout Conflict Caseの`testInfo.attach`画像とTrace/動画はcross-role job成功時にArtifact保存されない。**Error状態の実画面画像の独立比較、Loadingの実ブラウザ視覚、他画面状態と正式画像の対照、Android端末、正式Case採否**は残る。したがってタスクリスト13番は**未チェック**。

## 固定CI #41848289866のLoading Case実証（2026-11-04）

- #219テストHEAD `8aa866b8c45d7831d57b15e4e554f72dac8fbe89`、#199 SUT `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。[CI #41848289866](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41848289866)は**workflow全体success**。cross-role Chromium job [#126638216102](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41848289866/job/126638216102)は30 passed＋共有既存E2Eの1 flaky。Style Quality/Code Quality/Vitest contracts、verify/validateはsuccess。
- 新規`PR219-WEB-027`：guestの`empty-catalog`をResetし、別タブで`products`表の無書込readwriteトランザクションを維持してCatalogのIndexedDB readを待機。**7幅（320/390/767/768/1023/1024/1440px）のLoading/status・aria-busy・横はみ出しなし、320/1024pxのaxe重大違反0、解除後Empty復旧、前後IndexedDB全23表SHA-256一致**を同一固定Runで検証。
- ログには`PR219_CASE_EVIDENCE`（各7幅`loadingVisible=true,ariaBusy=true`、解除後`tablesChecked=23,allTablesUnchanged=true,recoveredTo=empty-catalog`）と`PR219_CASE_RUN`（終了時Clock `2026-07-01T03:00:00.000Z`、buildSha `037c413283d43891d19462b6b0a5022949eeb938`、Console/PageError/requestfailed/HTTP 5xx=0）がある。終了時ClockはReset直後の実測値とは区別。
- Web履歴は**49→50行、暫定26→27キー**。旧49行を不変とし、208動作台帳の`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`に同キーを追記。**直接紐付く動作は11件のまま**。このLoading Caseの成功時PNG/axe/Trace/動画はcross-role jobのArtifactに**保存されていない**。正式Loading正本の視覚比較、他状態とAndroid/SQLite、全正式Case採否は残り、タスク13等は**未チェック**。
