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
