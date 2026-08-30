# Specification / Curriculum Docs Navigation Redesign Plan

## 0. 依頼概要

- Production で公開している Specification と Test Automation Curriculum の閲覧体験を改善する。
- 対象 URL は既存どおり `/docs/spec/**` と `/docs/curriculum/**` とし、公開 path は変更しない。
- 現在の課題は、長い Docs で次を把握しづらいこと。
  - 現在どの文書を見ているか。
  - 他にどの文書があるか。
  - 現在ページ内にどの見出しがあるか。
- Playwright Documentation の外観をコピーするのではなく、次の情報設計だけを参考にする。
  - 左: document-wide Primary Navigation。
  - 中央: article body。
  - 右: current page の Contents。
- Narrow / Mobile では1カラムへ落とし、Primary Navigation は native `<details>` で初期折りたたみにする。
- 既存 Markdown renderer の出力契約は変更せず、CSS と Specification / Curriculum の page shell を中心に最小変更する。

## 1. ゴール / 完了条件

### ゴール

利用者が Specification / Curriculum の双方で次を判断しやすくする。

1. **Where am I?**: 現在閲覧している文書が分かる。
2. **What else exists?**: 主要な移動先と文書構造が分かる。
3. **What is on this page?**: 現在ページの見出し構成と目的の節への移動方法が分かる。

### 完了条件（DoD）

- `/docs/spec/**` と `/docs/curriculum/**` の既存 URL を変更しない。
- Desktop では見た目として次の3領域を持つ。
  - 左: document-wide Primary Navigation。
  - 中央: article body。
  - 右: current page の Contents。
- DOM 上で3要素を同一階層の sibling にすることは要件にしない。
- 既存 `article > .toc + .document-body` を維持する。
- Desktop の Primary Navigation と Contents は sticky とする。
- Desktop の sidebar が viewport より長い場合は sidebar 内部で scroll できるようにする。
- Narrow / Mobile の Primary Navigation / Contents は通常 document flow とし、sticky / sidebar用 `max-height` / 内部scrollを持たせない。
- `Contents` は既存どおり current page の H2 / H3 を使用し、H1 は重複表示しない。
- H2 / H3 がないページでは article body が空の右カラムを残さず article 全幅を使用する。
- Specification Primary Navigation は `docs/spec/README.md` の `## Navigation` を正本とする。
- Curriculum Primary Navigation は `docs/curriculum/test-automation/README.md` の `## 全体構成` を正本とする。
- Curriculum は `## 全体構成` 内の H3 を group label、その直下の番号付き Markdown link を Navigation item として扱う。
- Curriculum の現行 group 順序・表記は source README の記載順をそのまま使用する。
- filesystem の alphabetical order から Navigation を生成しない。
- Optional Reference / Legacy Alias 等、`## 全体構成` 外の項目は Primary Navigation に自動追加しない。
- Primary Navigation 非掲載ページに current 用の偽 item を追加しない。
- current state は次の3状態に固定する。
  - Specification / Curriculum root page: header home link のみに `aria-current="page"` を付け、visible Primary Navigation 内は0件。
  - Primary Navigation 掲載 page: header home linkには current を付けず、visible Primary Navigation 内で `aria-current="page"` を exactly 1件。
  - Primary Navigation 非掲載 page: header home linkにも Primary Navigationにも `aria-current="page"` を付けず、visible Primary Navigation 内は0件。
- `aria-current="page"` を semantic / visual current state の唯一の正本とする。
- current の視覚表示は `[aria-current="page"]` を直接 CSS selector として使う。
- `.active` 等の重複 state class は追加しない。
- Desktop / Mobile 用に同じ Navigation content を重複 markup することは許容する。
- Desktop / Mobile の Primary Navigation は同時表示しない。
  - Desktop: Desktop `<nav>` を表示し、Mobile `<details>` を `display:none`。
  - Narrow / Mobile: Desktop `<nav>` を `display:none`、Mobile `<details>` を表示。
- 非表示側の切替に `visibility:hidden`、opacity、画面外配置、JavaScript stateを使わない。
- current 判定は生成後の href ではなく canonical repository path と `parsed.relativePath` の比較で行う。
- Navigation target は Navigation source README を基準に解決する。
- Markdown本文内 link は従来どおり current page 基準で解決する。
- Narrow / Mobile は1カラムとする。
- Mobile Primary Navigation は native `<details>` / `<summary>` で初期closedとする。
- JavaScript drawer、overlay、state management は追加しない。
- Mobile Contents は既存 TOC を本文上部へ置くだけとし、新しいcollapse機能は追加しない。
- Narrow / Mobile で document 全体の横 overflow を発生させない。
- table / pre 自体の内部横 scroll は既存契約どおり許容する。
- 現行 `main max-width:1280px` と breakpoint `800px` は互換契約としない。
- 3領域で article body の可読幅を確保できるよう、main最大幅とbreakpointを必要最小限に調整する。
- responsive state は Desktop 3領域 / Narrow 1カラムの2状態だけとする。
- Tablet専用等の中間layoutを追加しない。
- Navigation / Contents に semantic markup と適切な `aria-label` を持たせる。
- keyboard focus indicator を消さない。
- `renderMarkdown()` の返却形式を変更しない。
- Markdown parser、heading id、本文 link / image resolver の契約を変更しない。
- Specification / Curriculum の画像、本文 link、Spec ↔ Curriculum link、GitHub source link を壊さない。
- Specification root の本文 `## Navigation` と Curriculum root の本文 `## 全体構成` は削除・非表示化しない。
- Primary Navigation との一部重複は許容する。
- `pnpm run build:spec` の `output/spec-site` と、`pnpm run build:docs` / `pnpm run build:web` の `dist/docs/**` 出力契約を維持する。
- Storefront / SPA route / Native build へ影響を与えない。
- 新しい Docs framework / Markdown parser / UI framework / runtime dependency を追加しない。
- 新規 contract test / visual regression 基盤 / Playwright project を追加しない。
- Docs smoke と最終 `pnpm run verify` が PASS する。

## 2. 現状理解と前提

### Current understanding

- 作業ブランチは `plan/docs-navigation-redesign`。
- Plan作成時のbaselineは `main` commit `78c55b25bd39c91423001a3607236a98eaf76264`。
- 2026-08-30 の最終Planレビュー時点で `main` は `3022a74ba7cde2d3cc81ce318c6320dbf78115c6` まで進んでいる。
- branch はこの時点で `main` から1 commit behindだが、最新main更新は今回の実装対象4ファイルを変更していない。
- 実装開始時に最新 `main` を取り込み、baselineを再確認する。
- Specification と Curriculum は静的 HTML として `dist/docs/spec/**` / `dist/docs/curriculum/**` へ生成される。
- `renderMarkdown()` は `<aside class="toc">...</aside><div class="document-body">...</div>` の順で返す。
- DOM順序は変更せず、DesktopではCSS Gridの明示配置で `.document-body` を中央、`.toc` を右へ置く。
- `MARKDOWN_CSS` には既に grid / sticky TOC / mobile breakpoint の基礎がある。
- 現在の汎用 `nav ul` は横並び指定を持つため、Primary Navigation導入時は用途を限定したselectorへ整理する。
- 現行CSSには `[aria-current="page"]` のcurrent視覚スタイルがない。
- `scripts/spec/build-spec.ts` は既に `docs/spec/README.md` の `## Navigation` を `extractNavigation()` で読み取っている。
- Specification Navigation target はREADME基準の相対pathなので、一度canonical repository pathへ解決する必要がある。
- Specification Navigation hrefはcurrent output pageごとに相対表現が変わる。
- 現在のSpecification `## Navigation`はMarkdown fileへの直接linkのみでfragment linkはない。
- Specification Navigation target存在確認は既存 `validate:spec` が担当する。
- `scripts/docs/build-docs.ts` には既存 `resolveRepositoryPath()` と `resolveCurriculumLink()` がある。
- Curriculum Navigationのcanonical path解決 / href生成にはこの2関数を再利用する。
- Curriculum READMEをsourceにした`resolveCurriculumLink()`の結果は `/docs/curriculum/**` のroot-relative URLになるため、hrefはpage非依存である。
- Curriculum `README.md` の `## 全体構成` はH3 group + 番号付きMarkdown linkで規則的に構成されている。
- Curriculum Navigationは20件を超えるため、Mobileで常時展開しない。
- `validate:curriculum` は必須教材fileと既存Markdown link先の存在を検証するが、`## 全体構成` からNavigation metadataを抽出できたかは検証しない。
- そのためCurriculum builderでは、`## 全体構成`が見つからない、またはNavigation itemが0件の場合だけfail-fastする。
- group数やitem数を固定値でvalidationしない。
- Curriculum README自体が既存page生成loopで再parseされることは許容する。
- parse回数削減だけを目的にcache / pre-parsed Mapを追加しない。
- `e2e/web/smoke.spec.ts` には既存published docs smokeがある。
- `pnpm run test:smoke` は `deployed-smoke` projectを使用する。
- Desktop代表ケースは `1440×1000` を明示する。
- Mobile代表ケースは `390×844` を明示する。
- local Playwright web serverは通常ローカル実行で既存serverを再利用し得る。
- `CI`をtruthyにするとretryも2へ変わるため、server再利用防止だけのために`CI`を使用しない。
- local smokeは未使用loopback portを`PLAYWRIGHT_BASE_URL`に指定して実行する。
- `pnpm run verify` はformat / Markdown lint / spec validation / curriculum validation / lint / typecheck / test / `build:web` / `build:spec` を包含する。

### Assumptions

- Desktopは3領域を同時表示できる十分な横幅を持つ環境とする。
- article bodyは読みやすい幅を維持する。
- sidebar幅、border、font-size、spacing、main最大幅、breakpointは既存toneを維持しつつ実装時に1回だけ調整する。
- currentの具体的な色・背景・font-weightは既存palette内で、通常linkとの差が視認できる最小スタイルとする。
- `Contents` labelは既存どおり `Contents` とする。
- Mobile Primary Navigationの`<summary>`は `Navigation` 等の簡潔な名称とする。
- Specification / Curriculum本文・用語・教材順は変更しない。

### Non-goals

- Markdown rendererの新API設計 / 返却型変更。
- Spec / Curriculum共通の新しいDocs page framework / shell abstraction。
- Docusaurus / VitePress / MkDocs / Nextra等のDocs framework導入。
- Expo Router `web.output`変更。
- Markdown / 画像正本の移動・複製。
- Docs専用SPA / React hydration / client-side router。
- Search / 全文検索index / command palette。
- Prev / Next navigation。
- breadcrumb。
- version switcher / theme switcher / dark mode。
- current section scroll spy。
- content本文の再執筆 / 教材順変更。
- Specification / Curriculum以外の`docs/**`公開範囲拡張。
- Docs専用CI workflow。
- Production domain / Cloudflare deploy architecture変更。
- Navigation metadata用cache / pre-parsed Markdown Map。
- Specification Primary Navigationの未使用fragment対応。
- Specification builder内のNavigation target専用validation。
- `.active`等`aria-current`と重複するstate。
- smokeのためだけのPlaywright project / config変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 未回答の重要質問: なし。
- 実装者が決めてよい細部はCSSの見た目に限定する。
  - sidebar幅。
  - border。
  - font-size。
  - spacing。
  - main最大幅。
  - breakpoint。
  - current視覚スタイルの具体的な色・背景・font-weight。
- 上記細部も既存toneを維持し、3領域の可読性を満たす最小調整とする。

## 4. 影響範囲

### 実装コード・テスト

次の4ファイルだけを変更する。

1. `scripts/spec/markdown.ts`
   - `renderMarkdown()`は変更しない。
   - shared CSSのみを整理・拡張する。
2. `scripts/spec/build-spec.ts`
   - Specification Primary Navigationをheaderから左側へ移す。
   - canonical path / page-specific href / current state / Mobile markupを追加する。
3. `scripts/docs/build-docs.ts`
   - Curriculum `## 全体構成` の最小抽出ロジックを追加する。
   - existing resolverを再利用する。
   - Primary Navigation / current state / Mobile markupを追加する。
4. `e2e/web/smoke.spec.ts`
   - 既存published docs smokeを拡張する。

### Branch上で維持するPlan

- `docs/plans/2026-08-30_135845_docs-navigation-redesign.md`
- 実装完了時の`main`との差分は、Plan 1ファイル + 実装4ファイルの計5ファイルを正常状態とする。

### 原則変更しない

- `scripts/spec/markdown.ts` の`renderMarkdown()` / parser / renderer logic。
- `docs/spec/README.md`。
- `docs/curriculum/test-automation/README.md`。
- `playwright.config.ts`。
- Markdown本文。
- 画像正本。
- 教材順。

### 新規ファイル

- 追加しない。

## 5. 変更方針 / 実行タスク

### Change strategy

- **既存DOMを使う。**
- **CSSとpage shellを中心に変更する。**
- **Navigation sourceは既存READMEを維持する。**
- **Navigation metadataとpage-specific markupを分ける。**
- **READMEのparse回数そのものは最適化しない。**
- **Desktop / Mobileで同じpage-specific Navigation contentを再利用する。**
- **Desktop / Mobile表示切替はCSSの`display:none`だけで行う。**
- **Desktopだけsticky / sidebar内部scrollを使用する。**
- **Narrow / Mobileは通常document flowへ戻す。**
- **current stateは`aria-current`だけで表現する。**
- **current判定とhref生成を分ける。**
- **Spec / Curriculum builderを無理に共通化しない。**
- **静的HTMLのまま実現する。**
- **Root本文のNavigation重複を許容する。**
- **README由来のNavigation文字列は既存`escapeHtml()`でescapeする。**

### Task 1. 最新mainを取り込む

- 実装開始時に最新`main`を取り込む。
- Planのbaselineと実装対象4ファイルを再確認する。
- latest main側で今回の機能が既に実装済みなら重複実装しない。
- Planファイルはbranch成果物として維持する。

### Task 2. `scripts/spec/markdown.ts` のCSSを最小変更する

- Desktopの`main`を `Primary Navigation | article` の2列にする。
- Desktopの`article`を2列にし、DOM順序を変えず次を明示配置する。
  - `.document-body`: column 1。
  - `.toc`: column 2。
- 必要に応じて`.document-body`と`.toc`を同じ`grid-row`へ置く。
- 画面上は `Primary Navigation | article body | Contents` の3領域とする。
- `.toc`がない場合は `.document-body:only-child` 等の単純なCSSでarticle全幅を使用する。
- page shell側に`hasToc`判定を追加しない。
- JavaScriptを追加しない。
- `.document-body` / `article`へ`min-width:0`を設定する。
- table / preでpage全体を押し広げない。
- Desktop Primary Navigation / Contentsは`align-self:start` + stickyとする。
- headerと重ならないoffsetを設定する。
- Desktop sidebarがviewportより長い場合だけ内部scrollを許可する。
- Narrow / Mobileではstickyを解除する。
- Narrow / Mobileではsidebar用`max-height` / 内部scrollも解除し、page全体の通常scrollを使う。
- 現行の汎用`nav ul`横並び指定へoverrideを積み重ねず、Primary Navigation用selectorへ用途を限定する。
- `[aria-current="page"]`を直接styleし、header home / Primary Navigationのcurrentを視覚的に区別する。
- current用追加classを作らない。
- DesktopではDesktop Primary Navigationを表示し、Mobile `<details>`を`display:none`にする。
- Narrow / MobileではDesktop Primary Navigationを`display:none`にし、Mobile `<details>`を表示する。
- `visibility:hidden` / opacity / off-screen positioningは使用しない。
- 現行`max-width:1280px` / `800px` breakpointを固定しない。
- responsive stateはDesktop / Narrowの2状態だけにする。
- Narrow / Mobileでは`.toc`を本文上部へ置く。
- `renderMarkdown()` / parser / heading / link resolver / image resolverは変更しない。

### Task 3. Specification page shellを最小変更する

- `docs/spec/README.md`の`## Navigation`をbuildごとに1回`extractNavigation()`で抽出する。
- 各item targetを`docs/spec/README.md`のdirectory基準で`path.posix.join()` / `path.posix.normalize()`し、canonical repository pathを確定する。
- Navigation専用の汎用resolverは作らない。
- fragment split / re-attach処理は追加しない。
- Navigation target存在確認は既存`validate:spec`へ任せる。
- builder内へNavigation target専用`fs.existsSync()` / validatorを追加しない。
- 各pageでcanonical pathと`parsed.relativePath`を比較してcurrent判定する。
- Primary Navigation hrefに`resolveOutputLink(parsed.relativePath, item.target)`を使わない。
- hrefは次の順で生成する。
  1. `outputPathFor(canonicalPath)`でtarget output pathを求める。
  2. `relativeOutputPath(outputPathFor(parsed.relativePath), targetOutputPath)`でcurrent pageからの相対hrefを求める。
- 本文linkは従来どおり`resolveOutputLink(parsed.relativePath, target)`を使う。
- page-specific current判定 / href生成 / Navigation content生成は各pageで1回だけ行う。
- Navigation item labelとhrefは既存`escapeHtml()`でescapeしてHTMLへ出力する。
- 生成済みNavigation contentをDesktop `<nav>`とMobile `<details>`内で再利用する。
- Desktop Primary Navigationを`main`左側へ置く。
- 現在のheader横並びNavigationは廃止する。
- root pageはheader home linkだけをcurrentにする。
- Primary Navigation掲載pageは該当itemだけをcurrentにする。
- Primary Navigation非掲載pageではcurrentを追加しない。
- current用の偽itemを追加しない。
- root本文の`## Navigation`を削除・非表示化しない。

### Task 4. Curriculum Primary Navigationを最小実装する

- `docs/curriculum/test-automation/README.md`の`## 全体構成`を読み取り、Navigation metadataをbuildごとに1回生成する。
- README自体がpage生成loopで再parseされることは許容する。
- cache / pre-parsed Mapを作らない。
- `## 全体構成`に到達した後、次のH2までをNavigation sectionとする。
- section内のH3見出し文字列をgroup labelとして扱う。
- H3名を`共通` / `Part 1` / `Part 2`等の固定値で分岐しない。
- source READMEのH3文字列と記載順をそのまま使用する。
- H3はsource解析上のgroup境界としてのみ使用し、sidebar HTMLではH3要素として再生成しない。
- sidebarのgroup labelは`<strong>`または`<span>`等の非heading要素で表現する。
- 各group直下の番号付きMarkdown linkを記載順でNavigation itemとする。
- 次のH2へ到達したら抽出を終了する。
- `## 全体構成`外のOptional / Legacyを自動追加しない。
- `## 全体構成`が見つからない場合はbuild errorにする。
- Navigation itemが0件の場合はbuild errorにする。
- group数やitem数を固定値でvalidationしない。
- canonical repository pathは既存`resolveRepositoryPath(rootDir, "docs/curriculum/test-automation/README.md", item.target)`でNavigation metadata生成時に確定する。
- hrefは既存`resolveCurriculumLink(rootDir, "docs/curriculum/test-automation/README.md", item.target)`でNavigation metadata生成時に1回確定する。
- 各pageでhrefを再生成しない。
- Navigation metadataは`group / label / canonicalPath / href`程度で十分とする。
- 新しい汎用Navigation modelを作らない。
- 新しいcanonical path helper / Navigation専用URL resolver / 共通Navigation resolverを作らない。
- 各pageではcanonical pathと`parsed.relativePath`を比較してcurrent lessonだけを判定する。
- group label / item label / hrefは既存`escapeHtml()`でescapeしてHTMLへ出力する。
- broken targetは既存`resolveRepositoryPath()` / `resolveCurriculumLink()`でbuild errorにする。
- filesystem walk順序からNavigationを生成しない。
- 汎用Markdown AST / 新parserは導入しない。

### Task 5. Curriculum page shellを最小変更する

- Desktop Primary Navigationを`main`左側へ表示する。
- root pageはheader home linkだけをcurrentにする。
- Primary Navigation掲載lessonは該当lessonだけをcurrentにする。
- Optional / Legacy等の非掲載pageにcurrent用の偽itemを追加しない。
- Mobile Primary Navigationはnative`<details>`で初期closedとする。
- Desktop / Mobileで同じpage-specific Navigation contentを使う。
- Navigation抽出 / path解決 / JavaScriptを二重実装しない。
- Spec ↔ Curriculum等の既存本文link resolverは変更しない。
- root本文の`## 全体構成`を削除・非表示化しない。

### Task 6. Semantic / accessibilityを維持する

- document-wide Primary Navigationは`<nav>`と適切な`aria-label`を持つ。
- Mobile `<details>`内にもNavigation roleが分かる構造を持たせる。
- Desktop / Mobile非表示側は`display:none`でaccessibility tree / tab順から外す。
- page-local Contentsは既存`<aside class="toc" aria-label="Table of contents">`を維持する。
- articleは`<article>`を維持する。
- current stateはDoDの3状態に従う。
- visual currentも同じ`aria-current="page"`だけを使用する。
- keyboard focus indicatorを消さない。
- source H3をsidebar H3へ複製せず、article heading outlineへ不要なheadingを追加しない。

### Task 7. `e2e/web/smoke.spec.ts`を最小拡張する

#### Desktop

- Desktop UI代表ケース冒頭で`page.setViewportSize({ width: 1440, height: 1000 })`を設定する。
- Specification representative nested pageでPrimary Navigation / article body / Contentsが表示されることを確認する。
- 3領域のX座標関係を1ケースだけ確認する。
  - Primary Navigation < article body < Contents。
- TOCなし既存pageを利用できる場合だけarticle bodyが不要に狭くならないことを確認する。
- そのためだけのfixtureは追加しない。
- Specification nested pageからPrimary Navigation linkが正しいURLへ遷移することを確認する。
- Contents linkでheading anchorへ遷移できることを確認する。
- Specification Primary Navigation掲載代表pageでvisible Primary Navigation内のcurrentが1件であることを確認する。
- root representative pageでheader homeのみcurrent、visible Primary Navigation current 0件を確認する。
- Desktop Curriculum root / representative nested lessonでgroup順序、lesson link、current stateを確認する。
- Supporting / Optional / Legacyのcurrent 0件は既存smokeで自然に利用できるpageがある場合だけ確認する。
- Desktop代表ケースでMobile `<details>`が非表示であることを確認する。

#### Mobile

- Mobile専用Playwright projectを追加しない。
- 既存`deployed-smoke` projectで`page.setViewportSize({ width: 390, height: 844 })`を使用する。
- Specification representative nested pageは次だけを確認する。
  - Desktop Primary Navigationが非表示。
  - Mobile `<details>`が表示。
  - 初期closed。
- Specification側でlink操作 / overflow確認を重複させない。
- 詳細なMobile確認はCurriculum representative nested lesson 1ケースで行う。
  - Desktop Primary Navigation非表示。
  - Mobile `<details>`表示。
  - 初期closed。
  - openできる。
  - Navigation linkを操作できる。
  - `document.documentElement.scrollWidth <= window.innerWidth`。
- 既存Specification画像、Curriculum lesson遷移、Curriculum → Spec smokeを維持する。

### Task 8. 最終diffを確認する

- 実装コード・テスト変更が4ファイルに収まっていることを確認する。
- Docs UX以外へscopeが広がっていないことを確認する。
- Planは削除しない。
- `main`との差分はPlan 1 + 実装4 = 計5ファイルを正常とする。

## 6. 検証方法

### 実装中

- `pnpm run build:docs`
- local smokeは次の条件で実行する。
  - `CI`を設定しない。
  - `DEPLOYED_BASE_URL`を設定しない。
  - `PLAYWRIGHT_USE_PREBUILT_DIST`を未設定または`false`にする。
  - `PLAYWRIGHT_BASE_URL`へ未使用の`127.0.0.1` loopback portを指定する。
  - そのportに既存processがないことを確認する。
- 特定port番号はPlanへ固定しない。
- `pnpm run test:smoke`を実行し、current branchの`build:web`とlocal static serverをPlaywrightに起動させる。
- 古いProduction / Preview / prebuilt `dist` / 別branch既存serverを見たPASSは採用しない。
- server再利用防止のためだけに`CI`をtruthyにしない。
- Desktop smokeは1440×1000。
- Mobile smokeは390×844。

### 最終

- `pnpm run verify`

### 成功判定

- local Docs smokeがPASSする。
- `pnpm run verify`がPASSする。
- Desktop 1440×1000でPrimary Navigation / article body / Contentsが3領域に配置される。
- article bodyの可読幅が確保される。
- Desktop Primary Navigation / Contentsはstickyとして利用できる。
- Narrow / Mobileは通常flowで、Primary Navigation / ContentsへDesktop用sticky / max-height / sidebar内部scrollが漏れない。
- Desktop / Mobile Primary Navigationは同時表示されない。
- 非表示側は`display:none`でtab順から外れる。
- current linkは視覚的に通常linkと区別できる。
- semantic / visual current stateを別classで二重管理していない。
- `renderMarkdown()`契約を変更していない。
- TOCなしpageでarticle bodyが空の右領域を残さない。
- Spec / Curriculum nested pageからPrimary Navigationが正しいURLへ遷移する。
- current stateがDoDの3状態に一致する。
- Curriculum Navigation抽出が空の場合は静かに空Navigationを生成せずbuild errorになる。
- Curriculum group labelをarticle headingとして増やしていない。
- Root本文の`## Navigation` / `## 全体構成`が残る。
- Mobile 390×844でSpec / Curriculum双方にMobile Primary Navigation markupが存在し、初期closedになる。
- Curriculum MobileでNavigation link操作ができる。
- Curriculum Mobileでpage全体の横overflowがない。
- Markdown content、画像、内部link、外部link、Spec ↔ Curriculum linkが既存どおり機能する。
- Production path / build pipeline / dependency setに変更がない。
- 実装コード・テストは4ファイルだけで、本Planを含む`main`との差分は計5ファイルである。

## 7. リスク / Stop Conditions

### Risks

- `.toc` → `.document-body` のDOM順のままGrid column指定をしないとDesktopで`Contents | 本文`になる。
- TOCなしpageでarticle 2列を固定すると空の右カラムが残る。
- Specification Navigation targetをcurrent page基準の`resolveOutputLink()`へ直接渡すとnested page hrefが壊れる。
- current判定をhref文字列で行うとnested pageごとに表現が変わる。
- root / Navigation掲載 / 非掲載のcurrent状態を区別しないと偽itemや不正currentが発生する。
- `aria-current`だけ付け視覚styleを付けないとWhere am Iを視覚的に満たせない。
- Specification builderでtarget validationを重複実装すると責務が増える。
- Curriculum `## 全体構成`構造が壊れたとき空Navigationを静かに生成すると障害診断が難しい。
- ただしgroup数 / item数まで固定するとREADMEを正本にする設計と矛盾するため、存在 + 非空だけをfail-fast条件にする。
- Navigation metadataを各pageで再抽出すると無駄になる。
- README parse回数削減のためにcache / Mapを作ると過剰になる。
- Curriculum hrefをpageごとに再計算すると不要な処理が増える。
- Desktop / Mobile markup重複をruntimeで解消しようとするとJavaScript stateが増える。
- Desktop用sticky / max-height / overflowがMobileへ漏れると、Mobile Navigationが二重scrollになり使いづらくなる。
- source H3をsidebarでもH3として出すとarticle heading outlineへ不要なheadingが増える。
- README由来label / hrefをescapeせずHTML化すると生成HTMLの安全性・正確性を損なう。
- 汎用`nav ul`へsidebar overrideを積むとselectorが複雑化する。
- 現行1280px / 800pxを固定すると3領域でarticle bodyが狭くなる可能性がある。
- responsive stateを増やすとCSSが複雑になる。
- Desktop sidebarに高さ制御がないと末尾へ到達できない。
- Mobile Curriculum Navigationを常時展開すると本文到達を阻害する。
- CurriculumだけMobile確認すると別builderのSpecification Mobile markup欠落を見逃し得る。
- Root本文Navigation重複を消そうとするとrenderer / Markdown特殊処理が増える。
- 現在存在しないSpecification Navigation fragment対応を先回りすると不要分岐が増える。
- local smokeで既存serverを再利用すると別branch / 古いdistで誤PASSする可能性がある。
- server再利用防止だけのために`CI`を設定するとretry条件まで変わる。
- 実装4ファイルという制約を`main`との差分4ファイルと誤解してPlanを削除しない。

### Stop conditions

- `renderMarkdown()`契約変更が必要に見えた場合は、CSS / page shellだけで本当に不可能か再確認する。
- Curriculum Navigation抽出に汎用Markdown parser全面置換 / 大規模ASTが必要になる場合は実装を止めて再設計する。
- README parse回数削減のためだけにcache / pre-parsed Map / builder全体再構成が必要になる案は採用しない。
- Spec / Curriculumを共通frameworkへ統合しないと実現できない案は採用しない。
- 小さい重複は許容する。
- Playwright Documentation外観再現のためにframework / runtime dependency / client-side application化が必要になる案は採用しない。
- Search / Prev Next / breadcrumb / versioning / scroll spyを本PRへ含めない。
- current視覚表示のために`.active`等の別stateを追加しない。
- smokeのために`playwright.config.ts` / 新規Playwright project / 専用test fileを追加しない。
- 新規source file / contract test / visual regression基盤を必要とする案は採用しない。
- Desktop / Mobile navigation状態同期のためのJavaScriptを追加しない。
- Curriculum group名 / item数を固定値へhard-codeするvalidationを追加しない。

## 8. 成果物

### 実装対象

- `scripts/spec/markdown.ts` — CSSのみ。
- `scripts/spec/build-spec.ts`。
- `scripts/docs/build-docs.ts`。
- `e2e/web/smoke.spec.ts`。

### Branch上で維持するPlan

- `docs/plans/2026-08-30_135845_docs-navigation-redesign.md`。

### 原則変更しない

- `scripts/spec/markdown.ts` の`renderMarkdown()` / parser / renderer logic。
- `docs/spec/README.md`。
- `docs/curriculum/test-automation/README.md`。
- `playwright.config.ts`。

### 新規ファイル

- 追加しない。

### 付随ドキュメント

- 本Plan以外の設計ドキュメントは追加しない。

## 9. 備考

- 本Planは`plan/docs-navigation-redesign`上で実装まで進める前提。
- Plan作成・レビュー段階では実装しない。
- 優先順位はPlaywright風の見栄えではなく、Docs利用時のNavigation costを下げること。
- 実DOMは変更せず次を利用する。

```text
main
├─ Primary Navigation
└─ article
   ├─ Contents (.toc)        ← DOMでは先
   └─ document-body          ← DOMでは後
```

- DesktopはCSS Gridで表示位置を明示する。

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Header / Brand                                                      │
├──────────────────┬────────────────────────────────┬─────────────────┤
│ Primary Nav      │ Article body                   │ Contents        │
│                  │                                │                 │
│ - group / page   │ # Page title                   │ - Section A     │
│ - current page   │                                │   - Subsection  │
│ - page           │ 本文                           │ - Section B     │
│                  │                                │                 │
│ sticky           │ readable width                 │ sticky          │
└──────────────────┴────────────────────────────────┴─────────────────┘
```

- Narrow / Mobileは通常document flowへ戻す。

```text
┌─────────────────────────────┐
│ Header / Brand              │
├─────────────────────────────┤
│ ▸ Navigation                │
├─────────────────────────────┤
│ Contents                    │
├─────────────────────────────┤
│ Article body                │
│ 本文                        │
└─────────────────────────────┘
```

- Mobileで折りたたむのはPrimary Navigationだけとする。
- Contentsのcollapseやclient-side interactionは追加しない。
