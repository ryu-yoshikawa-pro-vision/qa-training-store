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
- 新規のComponentエラー復旧とWeb画面幅/a11y/画像添付は、専用テストを追加しただけで**固定Runが未取得**。最新HEADでStyle Quality、Component、cross-role Chromiumを確認してから結果を更新する。
- 成功時Trace/動画/画像は従来のPlaywright標準設定では保持されない。新規Web受入CaseのPNGとaxe JSONは`testInfo.attach`により当該実RunのPlaywright HTML Reportへ保存する設計。Artifact名とRun/jobが判明してからリンクを追記する。
- タスクリスト9番は、取得失敗・幅別の実Run・**正本画像との比較**の証拠がそろうまでチェックしない。その他の採用CaseやAndroid受入に結果を流用しない。
