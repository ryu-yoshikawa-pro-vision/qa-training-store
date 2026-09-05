# Plan

## Objective

- `origin/main` のmergeで発生した競合を、最新mainの機能変更とIssue #96のBreadcrumb Presentation共通化を両立させた状態で解消する。
- merge commit、push、PR更新、full validationは今回の完了範囲に含めない。

## Scope

- In:
  - merge状態、ours（`fix/breadcrumb-presentation`）、theirs（`origin/main`）の比較。
  - 競合している `src/presentation/pages/catalog-list-page.tsx` の最小解消。
  - 最新main側のCatalog loading／検索／filter／pagination処理の維持。
  - 既存共通 `Breadcrumbs`、Breadcrumbのhref・label・順序・current表示の維持。
  - conflict marker、差分、`git diff --check`、statusの確認。
  - 解消済みファイルと必要なRun Artifactのstage。
- Out:
  - merge commit、push、PR更新／merge。
  - full validation、Breadcrumb API／Route／Navigation architectureの変更。
  - 競合していないmain側ファイルの再設計や無関係なcleanup。

## Assumptions

- 競合一覧に出るファイルだけを競合解消の対象とし、競合していないmain側のstage済み変更は変更しない。
- `categoryName.value` のカテゴリ表示は、main側の安全なfallback（`"商品一覧"`）を維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。競合箇所と採用方針は指定要件と比較結果で確定できる。
- 仮定してよい細部: Run Artifactのrun-local記録と、解消済みコードのstage方法。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 競合は `catalog-list-page.tsx` 内のカテゴリタイトル式とBreadcrumb markupの2箇所で、mainの処理変更とIssue #96のPresentation変更を局所統合できる。
- H2: main側の手書きBreadcrumbを共通 `Breadcrumbs` に置換すれば、Navigation情報を維持したままIssue #96の共通Presentationを再適用できる。

## Research Plan

- Round 1 Query: `git status`、unmerged path、stage `:2`／`:3`、conflict周辺を確認する。
- Round 2 Query: resolved diff、Breadcrumb usage、marker、`git diff --check`、statusを確認する。
- Exit Criteria:
  - 競合ファイルと各側の変更意図が特定されている。
  - 最新mainの機能変更とIssue #96のBreadcrumb共通化を同時に含む解消案になっている。
  - unmerged pathが0件、markerが0件、解消済みファイルがstage済みである。

## Approach

1. branchとmerge状態を確認し、競合ファイルを列挙する。
2. `git show :2:`／`:3:` と周辺差分でours／theirsを比較する。
3. Breadcrumb以外のmain側変更を保持し、競合箇所だけを共通 `Breadcrumbs` とmain側fallbackへ統合する。
4. 差分、marker、`git diff --check`、statusを確認する。
5. 内容確認後に解消済みファイルとRun Artifactをstageし、merge commit前で停止する。

## Definition of Done

- `fix/breadcrumb-presentation` 上でmerge中の競合がすべてresolvedとなる。
- Catalogのmain側loading／検索／filter／pagination処理が残る。
- Catalogが既存共通 `Breadcrumbs` を使い、href／label／順序／current／accessible semanticsを維持する。
- conflict markerがなく、`git diff --check`が成功する。
- resolved fileがstage済みで、commit／push／PR更新を行っていない。

## Risks / Unknowns

- main側とIssue #96側でCatalog全体の更新が重なっているため、片側の丸ごと採用はmain機能または共通Presentationを失うリスクがある。競合hunkごとに統合する。
- 競合解消時に手書きnavへ戻すとPresentationが不統一になるため、共通Componentの利用を解消結果として明示確認する。

## Thinking Log

- 2026-09-05 07:23 JST: 競合一覧は `src/presentation/pages/catalog-list-page.tsx` の1ファイル、2 hunkだった。
- 2026-09-05 07:23 JST: main側はCatalog loading／previous result／async表示状態とカテゴリ名fallbackを持ち、Issue #96側は共通 `Breadcrumbs` と固定Catalog wrapperを持つ。mainの機能処理とfallbackを採用し、Breadcrumbだけ共通Componentへ統合する方針を確定した。
