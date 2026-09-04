# Issue #92 商品一覧Loading時のレイアウト安定化計画

## 0. 依頼概要

- 依頼内容: Issue #92 の商品一覧・検索結果Loading中にResults領域が縮み、Footerが上へ跳ねる問題を修正し、検証・commit・push・OPEN PR作成まで完了する。
- 背景: `CatalogListContent` は検索条件変更時に非同期検索結果が一時的に`null`となると、商品Gridを含むCatalog画面全体を`StatePanel`へ置き換える。結果として商品一覧の高さが失われ、Storefront Footerが大きく移動する。
- 期待成果: Loading中も既存のProduct Gridと同じレスポンシブ構造にSkeletonを表示し、Results領域の高さとLoading状態の認知を維持する。

## 1. ゴール / 完了条件

- ゴール:
  - 商品一覧、検索結果、カテゴリ結果のLoading中に、Results領域内でSkeletonを表示する。
  - Loading開始時に商品Gridが消えてFooterがResults直下へ跳ね上がる状態を解消する。
  - Loading完了後のProductCard、Filter、Sort、Pagination、Empty、Errorの挙動を維持する。
- 完了条件（DoD）:
  - 初回Loadingと検索条件変更後のLoadingで`.product-grid`とLoading statusがDOMに存在する。
  - Loading中に既存Empty Stateを表示しない。
  - Skeletonが既存`.product-grid`のResponsive定義を利用し、Results領域を固定`min-height`やViewport依存heightで補わない。
  - 既存Catalog component testにLoadingの直接回帰を追加し、Loaded／Emptyの既存テストを維持する。
  - package.jsonに定義された関連Validation、最終diff確認、Run Artifact Sanitizer、commit、push、OPEN PR作成を完了する。PRはmergeしない。

## 2. 現状理解と前提

- Current understanding:
  - Entry pointは`src/presentation/pages/catalog-list-page.tsx`の`CatalogListPage` → `CatalogListContent`で、URL queryから`ProductSearchRequest`を組み立て、`catalog.search(request)`を`useAsyncValue`で取得する。
  - 現在の`useAsyncValue`は依存値が変わると`value`を`null`、`loaded`を`false`へ戻す。Catalogは`value === null`で画面全体を`StatePanel kind="loading"`へ分岐するため、GridそのものがDOMから消える。
  - Loaded時の商品表示は`section.catalog-results`内の`.product-grid`と`ProductCard`、0件時は`StatePanel`、失敗時はError `StatePanel`、PaginationはLoaded結果の後に描画される。
  - `src/presentation/styles/global.css`の`.product-grid`はDesktop 4列、900px未満3列、767px以下2列の既存Responsive構造を持つ。ProductCardの画像比率と情報領域も同じCSSで定義されている。
  - Footerは`src/presentation/shells/storefront-shell.tsx`で`main`の後に描画され、`global.css`で上部marginを持つため、Catalog本体がStatePanelだけになるとFooterが上へ移動する。
  - 既存のProduct専用Skeletonはなく、共通`StatePanel`はLoadingのAccessible statusとして利用されている。
  - `tests/component/catalog-pages.test.tsx`にはLoaded商品表示、未絞り込みEmpty、Search／価格Filter Empty、Search入力上限のテストがある。Loading中のGrid保持テストはない。
  - `package.json`には`format:check`、`lint`、`typecheck`、`test:component:web`、`build:web`、`test:e2e:chromium`、`verify`等が定義されている。
- Assumptions:
  - 初回Loadingでは結果件数が未確定のため、検索Requestの`pageSize`（20）をSkeleton件数の基準にする。再Loadingでは直近成功結果の件数を使い、前回表示領域に近い高さを維持する。
  - Loading中は既存のFilter／Toolbar構造を直近成功結果で維持し、Grid内だけをSkeletonへ置き換える。Errorが返った場合は従来どおりError Stateを優先する。
  - Loading専用のCSSはProductCard相当の画像比率・情報行を表現するために局所追加し、共通Hookや取得ロジックは変更しない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文、既存コード、既存テスト、package scriptから安全な変更範囲とDoDを確定できる。
- 仮定してよい細部:
  - Skeletonの見た目は既存Design Tokenに合わせた静的Placeholderとし、新しいAnimationや依存関係は追加しない。
  - Screen reader向けにはResults sectionの`aria-busy`とGrid内の`role="status"`を使用する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Catalog LoadingのPresentation分岐とResults Grid。
  - Product GridのSkeleton表示CSS。
  - Catalog component regression test。
- Files to inspect:
  - `src/presentation/pages/catalog-list-page.tsx`
  - `src/presentation/hooks/use-async-value.ts`
  - `src/presentation/components/product-card.tsx`
  - `src/presentation/components/states.tsx`
  - `src/presentation/styles/global.css`
  - `src/presentation/shells/storefront-shell.tsx`
  - `tests/component/catalog-pages.test.tsx`
  - `e2e/web/phase1-required.spec.ts`
  - `e2e/web/ui-ux-improvements.spec.ts`
  - `playwright.config.ts`
  - `package.json`

## 5. 変更方針

- Change strategy:
  1. `CatalogListContent`だけで直近成功した`ProductSearchResult`を保持し、`useAsyncValue`の`loaded`と組み合わせてLoadingを判定する。共通Hookの契約、Filter／Sort／Paginationの状態管理、URL、APIは変更しない。
  2. 初回はCatalogのResults構造内に、再Loading時は既存Results section内に、`.product-grid`を維持した`ProductGridSkeleton`を描画する。Skeleton件数は初回`pageSize`、再Loading時は直近結果件数を基準にする。
  3. Loading中はEmpty判定とPaginationを実行せず、Results sectionへ`aria-busy`、Grid内へLoading statusを付与する。Loaded後は既存のEmpty／Filter Empty／ProductCard／Pagination分岐へ戻す。
  4. `global.css`へProductCardの画像・ブランド・タイトル・価格・Meta・Rating・Actionに対応するPlaceholderだけを追加し、既存`.product-grid`の列・gap・Responsive定義を再利用する。固定の大きな`min-height`、`height:70vh`、Viewport依存のFooter調整は行わない。
  5. Component testで初回Loading時のSkeleton／status／Empty非表示と、Loaded結果から別条件をLoadingした際のGrid保持／Empty非表示を確認する。既存Loaded／Emptyテストは変更せずに通す。
- 実行タスク:
  - [x] 1. 規約、Issue、現状コード、既存テスト、package script、E2E設定を確認する。
  - [x] 2. 本Planを`docs/plans/2026-09-04_095128_issue_92_product_list_loading_state.md`へ保存し、Run Artifactへ調査結果を記録する。
  - [ ] 3. Catalogページへ直近結果保持とProduct Grid Skeletonを実装する。
  - [ ] 4. Skeleton CSSとCatalog Loading回帰Component testを追加する。
  - [ ] 5. Focused test、lint、typecheck、build、E2E、必要な品質ゲートを実行する。
  - [ ] 6. 差分レビュー、Run Artifact Sanitizer、commit、push、OPEN PR作成と状態確認を行う。

## 6. 検証方法

- Validation plan:
  - `pnpm exec vitest run tests/component/catalog-pages.test.tsx --exclude tests/component/native`でLoading／Loaded／EmptyのFocused Component testを実行する。
  - `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`を実行する。
  - `pnpm run build:web`でWeb buildを実行する。
  - `pnpm run test:e2e:chromium`で既存Chromium E2E（Phase 1、UI/UX、Reset）を実行し、Product／Search／Responsive回帰を確認する。既存Playwright設定が必要なbuild／serverを起動する。
  - 変更後に`git diff --check`、`git diff`、`git status --short`を確認する。
  - Run Artifact保存前に`scripts/sanitize-codex-artifacts.ps1`のWrite／Checkを実行する。
  - 可能なら最終的に`pnpm run verify`を実行し、失敗時は最初の異常を特定して安全な最小修正後に関連ゲートを再実行する。
- 成功判定:
  - Loading中に`.product-grid`、Skeleton、`role="status"`、`aria-busy="true"`が存在し、Empty Stateが存在しない。
  - Loaded／Empty／Errorの責務が混ざらず、既存Catalog testと関連E2EがPASSする。
  - lint、typecheck、build、実行対象のE2EがPASSするか、環境上実行できない場合は理由を明記する。
  - `git diff --check`がPASSし、変更がIssue #92の対象とRun Artifactに限定される。

## 7. リスクと未解決論点

- Risks:
  - 直近結果を表示用に保持するため、Loading中の件数／Facetは一時的に前回結果を表示する。ただしGridはSkeletonへ置き換え、Loaded完了後に新結果へ更新する。
  - 初回LoadingはFacetが未取得のためFilter UIを表示できない。Results GridとToolbarの構造を先に表示し、初回検索完了後に従来のFilterを表示する。
  - `global.css`は複数のCascade層とResponsive Overrideを持つため、Skeletonが既存Product Gridの最終Computed layoutを利用していることをFocused testとE2Eで確認する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `src/presentation/pages/catalog-list-page.tsx`
  - `src/presentation/styles/global.css`
  - `tests/component/catalog-pages.test.tsx`
- 付随ドキュメント:
  - 本Plan
  - `.codex/runs/20260904-094303-JST/`のPLAN／TASKS／REPORT／run.json

## 9. 備考

- Issue #92のScope外である共通`useAsyncValue`の仕様変更、商品取得処理、Cache、Filter／Sort／Pagination状態管理、Footer全体のレイアウト変更、他画面のLoading UI変更は行わない。
- PRタイトル・本文はリポジトリ規約に従い日本語で作成する。ただしユーザー指定のcommit messageとPRタイトルが明示されているため、PR titleは指定値を優先し、本文は指定構成を日本語の実績内容へ反映する。
