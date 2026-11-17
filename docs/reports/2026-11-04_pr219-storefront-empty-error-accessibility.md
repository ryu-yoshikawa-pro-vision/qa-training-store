# PR #219 商品一覧0件・取得失敗・Web画面幅・a11yの受入証拠

## 要件と受入境界

- 対象：`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`、`BR-STOREFRONT-001/002/003`、`AC-STOREFRONT-001/002/003`の該当条件。
- 正本：`docs/spec/features/storefront.md:59-95`。空状態のWeb desktop画像`docs/spec/assets/screens/SCREEN-STOREFRONT-PRODUCT-LIST/empty/web-desktop.webp`。`empty-catalog`は公開商品0件、`default`の価格絞り込みで結果0件、errorは`catalog.search`が例外を返す状態として区別する。
- 検証対象はPR #199の製品実装・固定Seed。新テストは#219専用`e2e/web/pr219-cross-role-lifecycle.spec.ts`および`tests/component/pr219-storefront-states.test.tsx`のみ。既存SUT、Seed/Reset、正式仕様、CI/workflowは変更しない。

## 検証した条件・不足

| 状態 | Role/Seed/操作 | 期待/実証の根拠 | 現判定 |
| --- | --- | --- | --- |
| 無条件0件 | Guest、`empty-catalog`でReset→素の`/products` | 「現在、表示できる商品はありません」、パネル内CTAなし。画面上部のBreadcrumbs「ホーム」が`/`へ戻り、Focus→Enterで操作できる | [CI #41808161478](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41808161478)のcross-role jobで該当Web Case個別PASS |
| 絞り込み0件 | Guest、`default`→`/products?minPrice=999999` | 無条件0件とは別の`state-panel--filter-empty`、解除CTAから`/products`へ戻り商品一覧を表示 | 同Runの該当Web Case個別PASS |
| 取得失敗・復旧 | Guest、`catalog.search`初回Promiseを失敗させ、再試行時は空結果 | 読み込み中`role=status`、エラーを表示し内部例外本文は表示しない、「再試行」を押して無条件0件へ復帰。個別の専用Component Caseを追加 | **最新CI未確認**。SUT側の通信障害の実ブラウザ再現ではなくComponent境界の失敗注入 |
| レスポンシブ空状態 | Guest、`empty-catalog`と絞込0件、320/390/767/768/1023/1024/1440px | 各幅で見出し・操作・横はみ出しなし、撮影したPNGをPlaywright TestInfoへ添付。無条件0件の320/1024pxでaxe-coreのcritical/seriousを検査してJSON添付 | **最新CI未確認**。画像取得成功と**正式正本との比較合格は別** |
| Android・全画面正本の独立レビュー | Android既存正本、Web desktop正本との目視差分・Focus順・StatePanel表示を調査 | APK/端末/SQLite/動画、Web正本との視覚一致を実証 | **未受入・BLOCKED/レビュー待ち**。理由と再開条件はリスク別報告を参照 |

## 固定HEAD・Run

- 実行済み：PR #219 Web受入ケースを含むHEAD `4f5c93877bac76190c10adbc300d1cb977bb352b`、[Web CI #41808161478](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41808161478)。Chromium E2E cross-role job `126501615404`は既存`e2e/web/cross-role-lifecycle.spec.ts`の`getByRole("status")` strict違反で**job failure**。空状態2Caseの個別PASSとjob全体失敗は分ける。
- 新規Componentエラー復旧とWeb画面幅/a11yの固定Runは下記に追記した。撮影した全ての幅別画像の永続保存は未達。
- 成功時Trace/動画/画像は従来のPlaywright標準設定では保持されない。新規Web受入CaseのPNGとaxe JSONは`testInfo.attach`により当該実RunのPlaywright HTML Reportへ保存する設計。Artifact名とRun/jobが判明してからリンクを追記する。
- タスクリスト9番は、下記のRunと正本画像の差分確認を根拠に**検証済み**。視覚差分の適合判定、Android/全Case受入は未完了。

## 実Runと正式画像の照合（タスク9の検証結果）

- **SUT/テスト固定HEAD：** `83fb0325d6efc7d2a517561e52f32bfe793f5986`、[Web CI #41811366480](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)は**workflow全体success**。[cross-role Chromium job 126512596197](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/job/126512596197)で、無条件0件と価格フィルター0件の既存2Caseに加え、各々7画面幅（320/390/767/768/1023/1024/1440px）の追加2Caseが**個別成功**。BreadcrumbsのHome Link→Enter、フィルター解除CTA→Enter、横はみ出しなし、空状態の320/1024pxでaxe-coreのcritical/serious違反なしをassert。意図した別製品不具合のexpected failureと全体成功を混同しない。
- **ErrorとRetry：** [Component job 126512202338](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/job/126512202338)成功。`tests/component/pr219-storefront-states.test.tsx`1件：検索Promiseを初回で拒否し、loading status→エラーパネル（内部例外文字列は非露出）→「再試行」→無条件0件に復帰。既存Componentは無条件0件と絞り込み0件を分けた表示を検証。実ブラウザでのDB障害再現とは区別。
- **正式Web画像の確認：** [正式画像 `SCREEN-STOREFRONT-PRODUCT-LIST/empty/web-desktop.webp`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/docs/spec/assets/screens/SCREEN-STOREFRONT-PRODUCT-LIST/empty/web-desktop.webp)（Git Blob `0eb913fbc0ac9bcd673b329c24df8b38617e2fb8`、**1440×1465px**）と、[同RunのUI Review Desktop artifact `13311589417`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480/artifacts/13311589417)内`products-empty.png`（**1440×1436px**）を画像として直接確認。空パネルの見出し・説明、左側の絞り込み、Breadcrumbs・並び順、0件数・Footerの主要構成は共通。ただし**全体高さ29pxの差**と、最低評価のラベル/Selectの配置に差がある。**ピクセル一致や正式視覚正本への完全適合は未判定**。本差分は#213による仕様・視覚受入判断が必要。
- **証拠の限界：** cross-role新規TestInfoへの幅別PNG/axe JSON添付は、CIログ上のCase成功で生成を確認した。ただし[同RunのArtifact一覧](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41811366480)にcross-role Reportがアップロードされていないため、幅別画像の永続保存・独立目視の完了とは扱わない。固定HEADのUI-review Desktop `products-empty.png`のみ取得済み。フィルター0件の正本画像との直接比較、Android、全採用Caseの保存済みTrace/DBはタスク13〜15、20で継続。
- **タスク9の判定：** 無条件0件・絞込0件・取得失敗を独立実行し、Breadcrumbs/CTAの戻りと7画面幅・axeと正式Web画像の差を確認したため「**検証と差分の分類完了**」としてチェック。これは視覚差分の解消や全Platformの合格ではない。
