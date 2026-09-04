# Plan

## Objective

- Issue #92の商品一覧・検索結果Loading中にResults Gridを維持し、Footerが大きく上へ移動するレイアウトシフトを抑える。

## Scope

- In:
  - `CatalogListContent`のLoading分岐と直近検索結果の表示用保持。
  - 既存`.product-grid`へ組み込むProduct SkeletonとLoading accessibility。
  - Catalog component regression test、局所CSS、Run Artifact、commit／push／OPEN PR。
- Out:
  - 共通`useAsyncValue`、API／Repository、Cache、Filter／Sort／Pagination状態管理、Footer全体、他画面のLoading UI。

## Assumptions

- 初回Skeleton件数はProductSearchRequestの`pageSize`、再Loading時は直近成功結果の件数を使う。
- `useAsyncValue`の既存契約は保ち、Catalogページだけで直近結果とLoading状態を扱う。
- 既存`.product-grid`のResponsive CSSをそのままSkeletonにも適用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Skeletonは静的Placeholderとし、`aria-busy`と`role="status"`でLoadingを通知する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `value === null`時にCatalog全体が`StatePanel`へ置き換わることがFooter跳ね上がりの直接原因である。
- H2: 既存Product Grid内へ直近件数相当のSkeletonを表示すれば、Loading中もResults領域の構造と高さを維持できる。

## Research Plan

- Round 1 Query: Issue #92、Catalog page、async hook、ProductCard／CSS、Footer、Catalog component／E2E、package scriptsを確認する。
- Round 2 Query: 実装後のFocused Component test、lint、typecheck、build、Chromium E2E、diff／Sanitizerで仮説とDoDを検証する。
- Exit Criteria:
  - H1をCatalog pageのLoading分岐とFooter構造で支持する根拠がある。
  - H2をLoading DOMとLoaded／Empty回帰test、関連Validationで確認できる。
  - 失敗したValidationがあれば最初の異常と原因分類、次アクションがREPORTに残る。

## Approach

- Issue／規約確認 → repo mapping → 本Plan保存 → Catalog pageだけへLoading構造を追加 → CSS／Component test → Focused／正式Validation → diff／Sanitizer → commit／push → OPEN PR確認。
- Loading中はErrorを優先し、初回はGrid Skeleton、再Loadingは直近結果の件数を使ったGrid Skeleton、Loaded後は既存分岐を使う。

## Definition of Done

- Loading中に`.product-grid`、Skeleton、Loading status、`aria-busy`が表示され、Empty Stateが表示されない。
- Loaded／Empty／Error／Filter／Sort／Paginationの既存挙動を維持する。
- 固定大高さやViewport依存のレイアウト補正を使わない。
- package.jsonで定義された関連検証、最終差分確認、Sanitizer、指定commit、指定branch push、OPEN PR作成が完了する。PRはmergeしない。

## Risks / Unknowns

- 直近結果を表示用に保持する間、件数／Facetは新検索完了まで前回値になる。GridはSkeletonのため、Loaded完了後に新結果へ更新される。
- 初回はFacet未取得のためFilterを描画できないが、ResultsのGrid／Toolbar構造を先に表示してFooterの急上昇を防ぐ。
- `global.css`のCascade／Responsive順序をFocused testとE2Eで確認する。

## Thinking Log

- 2026-09-04 09:51 JST: `CatalogListContent`の`value === null`分岐でCatalog画面全体が消えることを確認。共通Hook変更は他画面への影響が広いため避け、Catalog page内で直近Resultを保持する方針を採用した。
- 2026-09-04 09:51 JST: Product専用Skeletonは存在しないため、ProductCard相当のPlaceholderを同じ`.product-grid`へ描画する。Skeleton件数は初回`pageSize`、再Loadingは直近Item数とし、CSS固定heightは追加しない。
- 2026-09-04 16:51 JST: 実ブラウザで、クエリ変更時にExpo RouterがCatalog pageを再マウントするため、`useAsyncValue`がクリアした値をpage-localな`previousResult`が引き継げず、20件SkeletonとFilter UI消失が発生することを確認した。Desktop FilterではFooter document Yが`1540.86 → 3079.25 → 1118.92`、Searchでも`1679.23 → 3079.25 → 1230.11`となり、Issue #92の実害と判断した。
- 2026-09-04 16:51 JST: fresh direct accessのアプリ準備中は`RouteGuard`の汎用`StatePanel`だけが描画され、Headerは出現しても`.catalog-results`／`.product-grid`が存在しないことを確認した。初回LoadingでもCatalogの結果構造を表示するため、Catalog専用のloading fallbackを渡す最小修正を検討する。
- 2026-09-04 16:51 JST: 修正案は`useAsyncValue`、Repository、API、Filter／Sort／Pagination stateを変更せず、Catalog page内でmode／categoryとrequest keyに紐づく直近Resultをpage remount間で一度だけ引き継ぎ、`RouteGuard`には既定挙動を保つ任意のloading fallbackを追加する。既存の`.product-grid`とSkeletonを再利用し、route-remount回帰testを追加する。
- 2026-09-04 17:35 JST: 修正後の実ブラウザで、Desktop／compactの初回LoadingにGrid／Skeleton／`aria-busy`／statusが存在し、Filter／SearchのLoadingでは前回件数のSkeletonとFacet／Filter UIが残ることを確認した。Searchの0件はLoading後のみ既存Filter Emptyへ遷移し、many-productsのSort／PaginationもURLと結果を維持した。
- 2026-09-04 17:35 JST: default seedでBrand A→Loading中にBrand Bを追加する操作を実行し、最終URLが両ブランドを含み、結果4件・checked 2件へ収束した。古いrequestの後出し表示は観測されず、Errorは既存コードの`error`先行分岐によりpreviousResultより優先されるためfault injectionは行わなかった。
