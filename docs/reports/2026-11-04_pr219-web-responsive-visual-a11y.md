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
