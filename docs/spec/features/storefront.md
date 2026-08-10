# Storefront

## Purpose / Scope

GuestとCustomerが公開商品を探索し、検索、Category/Brand、価格、Sale、在庫、評価、Variationを確認するWeb/Native Storefrontの共通挙動を定義します。Admin編集と購入確定は別Featureです。

## Business Rules

### BR-STOREFRONT-001 — Viewer条件を満たす公開商品だけを表示する

公開状態、Rank制限、Viewer種別を適用し、見えない商品を一覧、Home、詳細、Facetへ混ぜません。

### BR-STOREFRONT-002 — 検索とFacetは同じViewer条件で決定的に絞り込む

Keyword、Category、Brand、価格、在庫、Sale、最低評価を適用し、同一Facet内はOR、異なるFacet間はANDとしてtotal/pageを計算します。

### BR-STOREFRONT-003 — Variationと価格を現在時刻・Viewerに合わせて表示する

Sale期間、会員割引、在庫、購入上限を表示し、未選択または在庫切れVariationの追加操作を許可しません。

## UI / Behavior Contract

Homeは主要Category、新着、Sale、Rank案内を表示します。検索Suggestionは2文字以上で最大8件です。12件以下のVariationはButton群、13件以上はSelectとし、商品一覧の同順位はproductCodeで安定させます。

## Acceptance Criteria

### Criteria

#### AC-STOREFRONT-001 — 公開条件を満たさない商品を除外する

Related BR: `BR-STOREFRONT-001`

Guest、Customer、Rank制限の異なるViewerで、一覧・Home・詳細の表示結果がNormative条件と一致します。

#### AC-STOREFRONT-002 — FacetとPaginationが一貫する

Related BR: `BR-STOREFRONT-002`

Viewer条件と選択Filterを適用したtotal、page、Facet件数、安定Sortが一致します。

#### AC-STOREFRONT-003 — Variationと価格のBoundaryを表示する

Related BR: `BR-STOREFRONT-003`

Sale期間外、在庫0、未選択Variation、会員Rank別価格を、操作可能性と理由表示を含めて確認できます。

## Executable Canonical Sources

- `src/application/use-cases/catalog-use-cases.ts`
- `src/domain/policies/permissions.ts`
- `src/domain/services/pricing.ts`
- `src/seeds/metadata.ts`
- `app/products/`, `app/search.tsx`, `app/categories/`
