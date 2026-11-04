# PR #219 管理商品一覧の仕様・Web・Repository比較

## 対象と判定境界

- 行動ID：`SCREEN-ADMIN-PRODUCTS-A01-02`、要件`BR-ADMINCAT-001/002`・`AC-ADMINCAT-001/002`。正式画面仕様：`docs/spec/features/admin-catalog.md:59-85`（`default`と`many-products`でdesktop/tabletの視覚比較要求）。補助UI仕様：`docs/05_ui/ui_specifications.md:174-186`。
- 実装：`src/presentation/pages/admin-product-pages.tsx:56-270`、`src/application/use-cases/admin-product-use-cases.ts:80-101,223-250`、`src/infrastructure/database/dexie/product-repositories.ts:417-508`。
- **実Web**：[CI #41802885428 cross-role job 126483819945](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41802885428/job/126483819945)、固定HEAD `e5fc6a5abdd792eb3b51a6b5b9c1c1afd646811e`、`e2e/web/pr219-cross-role-lifecycle.spec.ts`の2ケース。商品コード`P-0006`＋stock0＋公開状態のAND検索はPASS。表示外選択は`test.fail`で実際に失敗する事実を確認（製品FAIL、テスト実行成功と区別）。
- **Repository専用**：`tests/integration/pr219-admin-product-query.test.ts`の4ケース。実CIが確定するまでは**未確認**。代表値として`default` Seed、operator、固定Clock `2026-07-15T03:00:00Z`、隔離Dexie DBのみを使用する。

## 仕様と観測の差

| 条件 | 仕様・期待 | Web/Repositoryで確認した実装・証拠 | 判定 |
| --- | --- | --- | --- |
| 商品名/商品コード検索、公開Status、Rank、Stock、価格、Sort | 補助UI仕様・Web UIの複合絞込み、最低/最高価格の一致 | Webはkeyword/status/rank/stock/min/max/sortを`adminProducts.search`へ渡す。実WebのP-0006＋stock0＋StatusのANDはPASS。Repository専用で価格1200境界等を検証するCaseを追加 | 代表条件はWeb PASS。全組合せ未受入 |
| SKU検索 | 商品名・商品コードに加えSKUも検索対象 | `DexieAdminProductQueryRepository.search`のkeywordは`item.name`と`productCode`だけ（SKUなし）。新規Integrationは`P-0001-01`で結果0件になる現象を再現する設計 | **仕様との不整合**、Integration実行待ち |
| カテゴリー/ブランドの複数選択（同一ファセットOR） | 補助UI仕様：フィルター提供、同一軸内OR | Repositoryは`categoryIds`、`brandIds`を受け取って判定するが、Web`AdminProductsContent`には対応する入力が存在せず、検索呼出しにも渡していない | **Web提供不足の可能性**（補助仕様と正式仕様の優先順位・採否は#213で確定） |
| 多数商品ページングと絞込み | `many-products`でページをまたいで検索条件と一致 | Webはkeyword変更時だけ`setPage(1)`、Status/Rank/Stock/価格/Sort変更時にはページを維持。末尾ページから絞込後に空ページとなり得る静的経路 | 静的問題候補。many-productsの実E2E/視覚は未実行 |
| 表示外選択と一括更新 | 表示ページ内最大50件、対象外IDが混じらず、成功/失敗件数を画面へ表示 | Webは`selected:Set`を絞込み変更でも保持。現在表示`items`と選択Setの共通部分からtargetIdsを作り、0件ならUse Caseが`VALIDATION`拒否。Web bulkは例外をcatchしていない。実Webの「選択後0件絞込」専用テストは**期待失敗が発生** | **製品FAIL**。テストgreenを合格へ換算しない |
| 部分成功・失敗 | 独立transaction、各対象の成功/失敗件数と理由 | 既存`tests/integration/admin-product-use-cases.test.ts`の「deletes only unreferenced drafts and reports partial Bulk success」が[CI #41802885428](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41802885428)のIntegration jobで実行成功。空target拒否の追加CaseはCI未確認 | Use Case部分成功はPASS。Webの空target時のcatch・表示は製品FAIL候補 |
| 有効SKU 0件と価格 | 適切な価格表示、対象外や不正値を検索結果へ混入させない | Repositoryは`Math.min(...prices)`/`Math.max(...prices)`を使い、pricesが空なら`Infinity/-Infinity`。`formatYen()`の非有限値表示や価格filter境界に影響し得る。専用Integrationでinactive SKU 0件を再現するCaseを追加 | 静的に確認。直接Integration実行待ち |
| Role・画面幅・画像 | operator/admin許可、guest/customer/停止staff拒否。desktop/tabletと画面リファレンス | Web Role代表条件は`pr219-cross-role-lifecycle.spec.ts`で実行済み。Web UI Reviewの一般Runはあるが、本動作の`many-products`画像比較・操作後DBスナップショットは未実施 | 一部PASS・一部未受入 |

## 再開と引継ぎ

- Case別証拠は`docs/reports/2026-11-04_pr219-web-case-run-evidence.csv`にも記録。テスト／SUT HEAD、Platform、Role、Seed/Clock、Web個別結果・job全体判定を混同しない。
- SKU0/価格・空bulk拒否のIntegrationは`pr219-admin-product-query.test.ts`を含む**同一固定HEADのVitest Integration成功**を確認してから報告を更新する。現時点では新規4件のPASSを主張しない。
- 製品の改善は#210へ、仕様・採用条件の確定は#213へ委譲。このPRでは製品UI、Repository、Seed、正式仕様、既存製品テストを変更しない。
- タスクリスト8番は**比較作業の検証が残っているため未チェック**。特にRepositoryの実行証拠、`many-products`のページ/選択状況、非有限価格の実UI結果を確認する。
