# Admin Catalog

## Purpose / Scope

Operator/AdminがProduct Aggregate、Category、Brand、Image Asset、公開状態を管理する契約を定義します。

## Business Rules

### BR-ADMINCAT-001 — Productの公開可否と状態遷移を検証する

公開にはactive Category、active Brand、active SKU、Image、Primary Imageが必要です。Product Aggregate編集でStatusを変更せず、専用状態変更だけが遷移を行います。

### BR-ADMINCAT-002 — Product AggregateとAsset関連をTransactionで更新する

Product、Variant、Image関連、初期在庫履歴、Review Summaryを一貫して保存し、既存在庫とRelease済みAsset Binaryを商品編集で破壊しません。

## UI / Behavior Contract

Operator/Adminは未保存FormのPreviewを見られますが、PreviewはDBを書き込みません。Draftでのみ許可されるCode/SKU変更と、公開後の追加SKU/無効化の境界を説明します。

## Acceptance Criteria

### Criteria

#### AC-ADMINCAT-001 — 不完全なProductを公開しない

Related BR: `BR-ADMINCAT-001`

必要なCategory、Brand、SKU、Image、Primary Imageを満たさないProductが公開されず、許可された状態遷移だけが成功します。

#### AC-ADMINCAT-002 — Previewと保存の責務を分離する

Related BR: `BR-ADMINCAT-002`

Preview、保存、初期在庫、Review Summary、Asset関連が各Transaction契約を満たし、PreviewだけではDBが変化しません。

## Executable Canonical Sources

- `src/application/use-cases/admin-product-use-cases.ts`
- `src/application/use-cases/admin-master-use-cases.ts`
- `src/domain/policies/state-transitions.ts`
- `src/infrastructure/image-assets/`
- `app/admin/products/`, `app/admin/categories/`, `app/admin/brands.tsx`
