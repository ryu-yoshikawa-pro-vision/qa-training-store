# Specification / Curriculum Docs Navigation Redesign Plan

## 0. 依頼概要

- 依頼内容:
  - Production で公開している Specification と Test Automation Curriculum の閲覧体験を再設計する。
  - 現在の使いづらさを解消するため、Playwright Documentation のように「文書全体の移動」「本文閲覧」「ページ内移動」を同時に把握できる構成へ改善する。
  - 対象 URL は既存どおり `/docs/spec/**` と `/docs/curriculum/**` とし、公開パスは変更しない。
- 背景:
  - 現在の Docs は Markdown を静的 HTML 化して公開できているが、長いページでは現在地・他ページ・ページ内見出しを把握しづらい。
  - `scripts/spec/markdown.ts` の `renderMarkdown()` はすでに `<aside class="toc">` と `<div class="document-body">` を別要素として生成しているため、renderer の返却形式を変えずに CSS で本文と Contents を横並びにできる。
  - Specification の文書全体 Navigation は header に横並び表示されており一覧性が低い。
  - Curriculum は `docs/curriculum/test-automation/README.md` に学習順の正本があるが、生成ページには文書全体を移動する Navigation がない。
- 期待成果:
  - Desktop では、見た目として左に Primary Navigation、中央に本文、右にページ内 `Contents` を持つ3領域構成とする。
  - Narrow / Mobile では1カラムへ落とし、Primary Navigation は native `<details>` で初期折りたたみにして本文へすぐ到達できるようにする。
  - 既存 Markdown renderer の出力契約は変更せず、CSS と Specification / Curriculum の page shell を中心に最小変更する。

## 1. ゴール / 完了条件

- ゴール:
  - Specification と Curriculum の双方で、利用者が次の3点を判断しやすい Docs UI にする。
    1. **Where am I?**: 現在閲覧している文書が分かる。
    2. **What else exists?**: 主要な移動先と文書構造が分かる。
    3. **What is on this page?**: 現在ページの見出し構成と目的の節への移動方法が分かる。
  - Playwright Documentation の外観をコピーするのではなく、Navigation / Article / Contents の役割分担だけを参考にする。
- 完了条件（DoD）:
  - `/docs/spec/**` と `/docs/curriculum/**` の既存 URL を変更しない。
  - Desktop では見た目として次の3領域を持つ。
    - 左: document-wide Primary Navigation。
    - 中央: article body。
    - 右: current page の `Contents`。
  - DOM 上で3要素を同一階層の sibling にすることは要件にしない。既存 `article > .toc + .document-body` をそのまま利用する。
  - 左 Primary Navigation と右 `Contents` は sticky とし、長い本文をスクロールしても利用できる。
  - `Contents` は既存どおり current page の H2 / H3 を使用し、H1 は重複表示しない。
  - `Contents` 対象の H2 / H3 がないページでは article body が右側の空カラムを残さず article 全幅を使用する。
  - Specification の Primary Navigation は `docs/spec/README.md` の `## Navigation` を正本とし、別 config を作らない。
  - Curriculum の Primary Navigation は `docs/curriculum/test-automation/README.md` の `## 全体構成` 内の H3 group と、その直下の番号付き Markdown link を正本とする。
  - Curriculum Navigation は現行の3 group（`共通`、`Part 1: テスト自動化の基礎と実践`、`Part 2: 開発プロセスへの組み込みと実務導入`）の見出し文字列と記載順をそのまま維持し、filesystem の alphabetical order を使用しない。
  - Primary Navigation に掲載されていない Supporting / Optional / Legacy ページに current 用の項目を追加しない。
  - Specification root / Curriculum root は header の home link に `aria-current="page"` を付けて現在地を表現する。
  - Primary Navigation を Desktop / Mobile 用に重複生成する場合、表示中の Navigation 内では current page の `aria-current="page"` が1件になる。非表示側に同じ current link が存在することは許容する。
  - Desktop / Mobile の Primary Navigation は同時表示せず、Desktop では Mobile `<details>`、Narrow / Mobile では Desktop `<nav>` を `display:none` で非表示にする。`visibility:hidden`、opacity、画面外配置は使用しない。
  - current 判定は生成後の href 文字列ではなく、Navigation source README 基準で解決した canonical repository path と current page の `parsed.relativePath` を比較して行う。
  - Navigation target は Navigation source README を基準に解決し、本文 link は従来どおり current page 基準で解決する。
  - Narrow / Mobile では1カラム化し、Primary Navigation は native `<details>` / `<summary>` で初期折りたたみとする。
  - Mobile の Primary Navigation のために JavaScript drawer、overlay、state management を追加しない。
  - Mobile の `Contents` は既存 TOC を本文上部へ落とすだけとし、新たな折りたたみ機能を追加しない。
  - Narrow / Mobile で document 全体の横 overflow を発生させない。table / pre 自体の内部横 scroll は既存契約どおり許容する。
  - 現行 CSS の `main` 最大幅 `1280px` と breakpoint `800px` は互換契約として維持しない。本文の可読幅を確保できるよう必要最小限に調整する。
  - responsive layout は Desktop 3領域 / Narrow 1カラムの2状態だけとし、Tablet専用などの中間layoutを追加しない。
  - Navigation / Contents に semantic markup と適切な `aria-label` を付与し、keyboard で link を利用できる。
  - active state の正本は `aria-current="page"` とする。
  - `renderMarkdown()` の返却形式、Markdown parser、heading id、本文 link / image resolver の契約を変更しない。
  - Specification / Curriculum の画像、本文リンク、Spec ↔ Curriculum link、GitHub source link を壊さない。
  - Specification root の本文 `## Navigation` と Curriculum root の本文 `## 全体構成` は削除・非表示化しない。Primary Navigation との一部重複は許容する。
  - `pnpm run build:spec` の `output/spec-site`、`pnpm run build:docs` / `pnpm run build:web` の `dist/docs/**` 出力契約を維持する。
  - Storefront / SPA route / Native build へ影響を与えない。
  - 新しい Docs framework / Markdown parser / UI framework / runtime dependency を追加しない。
  - 新規 contract test は追加せず、既存 published docs smoke を拡張して検証する。
  - Docs smoke と最終 `pnpm run verify` が PASS する。

## 2. 現状理解と前提

- Current understanding:
  - 計画作成時点の baseline は `main` commit `78c55b25bd39c91423001a3607236a98eaf76264`。
  - 作業ブランチは `plan/docs-navigation-redesign`。
  - Specification と Curriculum は静的 HTML として `dist/docs/spec/**` / `dist/docs/curriculum/**` へ生成される。
  - `renderMarkdown()` は現在、`<aside class="toc">...</aside><div class="document-body">...</div>` の順で返す。
  - この DOM 順序は変更せず、Desktop では CSS Grid の明示配置で `.document-body` を中央、`.toc` を右へ置く。
  - TOC / body を新 API へ分離する必要はない。
  - `MARKDOWN_CSS` にはすでに grid、sticky TOC、mobile breakpoint の基礎があるため、既存 CSS の整理・拡張を優先する。
  - 現在の汎用 `nav ul` は横並び指定を持つため、Primary Navigation 導入時は用途を限定した selector へ整理し、sidebar と競合させない。
  - 現行 `main` の最大幅 `1280px` と breakpoint `800px` は現在の2カラム向けであり、3領域化後も固定する前提にはしない。
  - `scripts/spec/build-spec.ts` は `docs/spec/README.md` の `## Navigation` を既存 `extractNavigation()` で読み取っている。
  - Specification Navigation の target は README に対する相対 path なので、README を基準に canonical repository path へ一度解決する必要がある。
  - Specification の href は current output page ごとに相対表現が変わるため、canonical path の確定と page-specific href 生成を分ける。
  - 現在の Specification `## Navigation` は Markdown file への直接 link のみで、fragment link は含まれていないため、今回 fragment 対応を追加しない。
  - `scripts/docs/build-docs.ts` には既存 `resolveRepositoryPath()` と `resolveCurriculumLink()` があり、Curriculum Navigation の canonical path 解決と href 生成にそのまま再利用できる。
  - Curriculum `README.md` の `## 全体構成` は H3 group と番号付き Markdown link で規則的に学習順を定義しているため、汎用 Markdown AST は不要。
  - Curriculum の Primary Navigation は20件を超えるため、Mobileで常時展開すると本文への到達を阻害する。
  - Curriculum Navigation metadata の抽出・canonical path 確定は build ごとに1回で十分だが、既存 page 生成 loop が root README を再度 `parseMarkdownFile()` することは許容する。その回避だけを目的に cache / pre-parsed Map を追加しない。
  - Specification root の `## Navigation` と Curriculum root の `## 全体構成` は source Markdown として残し、Primary Navigationとの重複解消を目的に本文を加工しない。
  - `e2e/web/smoke.spec.ts` には既存 `published docs smoke` があり、今回の UI 契約はここを拡張して確認できる。
  - `pnpm run test:smoke` は既存 script として存在し、`deployed-smoke` project は Desktop Chrome を使用する。
  - Mobile responsive smoke は新しい Playwright project を作らず、既存 `deployed-smoke` 上で `page.setViewportSize()` を使って確認できる。
  - `pnpm run verify` は format / Markdown lint / spec validation / curriculum validation / lint / typecheck / test / `build:web` / `build:spec` を包含している。
- Assumptions:
  - Desktop は左 Navigation / article body / 右 Contents を同時表示できる十分な横幅を持つ環境とする。
  - article body は読みやすい幅を維持し、wide monitor で過度に横長にしない。
  - sidebar の厳密な幅、spacing、main 最大幅、breakpoint は既存 tone を維持しつつ、3領域で本文が狭くならない範囲へ実装時に1回だけ調整する。
  - Specification / Curriculum の本文・用語・教材順は変更しない。
  - Playwright Documentation は information architecture の参考に留め、CSS・branding・DOM を複製しない。
- Non-goals:
  - Markdown renderer の新 API 設計や返却型変更。
  - Spec / Curriculum 共通の新しい Docs page framework / shell abstraction。
  - Docusaurus / VitePress / MkDocs / Nextra 等の Docs framework 導入。
  - Expo Router の `web.output` 変更。
  - Markdown / 画像正本の移動・複製。
  - Docs 専用 SPA / React hydration / client-side router。
  - 検索、全文検索 index、command palette。
  - Prev / Next navigation、breadcrumb、version switcher、theme switcher、dark mode。
  - current section の scroll spy。
  - content 本文の再執筆・教材順変更。
  - Specification / Curriculum 以外の `docs/**` 公開範囲拡張。
  - Docs 専用 CI workflow。
  - Production domain / Cloudflare deploy architecture の変更。
  - 新規 contract test / visual regression 基盤の追加。
  - Navigation metadata のためだけの cache / pre-parsed Markdown Map。
  - Specification Primary Navigation の未使用 fragment 対応。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - なし。今回の対象は既存静的 Docs の Primary Navigation / Contents / layout 再構成に限定する。
- 仮定してよい細部:
  - sidebar 幅、border、font-size、spacing、main 最大幅、breakpoint は既存 tone を維持して実装時に最小調整する。
  - `Contents` label は既存どおり `Contents` とする。
  - Mobile Primary Navigation の `<summary>` label は `Navigation` 等の簡潔な名称とする。
- 未回答の重要質問:
  - なし。

## 4. 影響範囲

- 実装対象は次の4ファイルに限定する。
  - `scripts/spec/markdown.ts`
    - `renderMarkdown()` は変更しない。
    - shared CSS のみを Desktop 3領域 / Narrow 1カラムへ整理する。
  - `scripts/spec/build-spec.ts`
    - Specification Primary Navigation を header から左側へ移す。
    - README 基準の canonical path 解決、page-specific href 生成、current state、Mobile Navigation markup を実装する。
  - `scripts/docs/build-docs.ts`
    - Curriculum `README.md` の `## 全体構成` から group / link を抽出する最小ロジックを追加する。
    - 既存 `resolveRepositoryPath()` / `resolveCurriculumLink()` を再利用して current 判定と href を生成する。
    - Curriculum Primary Navigation / current state / Mobile Navigation markup を実装する。
  - `e2e/web/smoke.spec.ts`
    - 既存 published docs smoke を拡張する。
- 原則変更しない:
  - `scripts/spec/markdown.ts` の `renderMarkdown()` / parser / renderer logic。
  - `docs/spec/README.md`。
  - `docs/curriculum/test-automation/README.md`。
  - Markdown 本文、画像正本、教材順。
- 新しい source file / test file / config file は追加しない。

## 5. 変更方針 / 実行タスク

- Change strategy:
  - **既存 DOM を使う。** `renderMarkdown()` の `<aside class="toc"> + <div class="document-body">` を維持する。
  - **CSS と page shell を中心に変更する。** UX 改善のために Markdown renderer の契約へ変更範囲を広げない。
  - **Navigation source は既存 README を維持する。** 別 JSON / TS array / YAML へ項目を複製しない。
  - **Navigation metadata と page-specific markup を分ける。** Navigation items の抽出・canonical path 確定は build ごとに1回、current 判定・href生成・Navigation HTML生成は各 page で1回だけ行う。
  - **READMEのparse回数そのものは最適化対象にしない。** 既存 page 生成 loop の再parseを許容し、その回避のために cache / Map / build構造変更を追加しない。
  - **Desktop / Mobile では同じ page-specific Navigation content を再利用する。** markupだけを出し分け、抽出・path解決・current判定を二重実装しない。
  - **Desktop / Mobile の表示切替は CSS の `display:none` だけで行う。** runtime state や accessibility 用の追加制御を作らない。
  - **current 判定と href 生成を分ける。** current は canonical repository path で比較し、href は current output page に応じて生成する。
  - **Spec / Curriculum builder を無理に共通化しない。** Navigation構造とURL契約が異なるため、それぞれ小さく実装する。
  - **静的 HTML のまま実現する。** Mobile 折りたたみも native HTMLだけで実現する。
  - **Root本文のNavigation重複は許容する。** 重複解消のためにMarkdown本文やrendererへ特殊処理を追加しない。
- 実行タスク:
  - [ ] 1. 実装開始時に最新 `main` を取り込み、本 Plan の baseline と対象4ファイルを再確認する。
  - [ ] 2. `scripts/spec/markdown.ts` の `MARKDOWN_CSS` を最小変更する。
    - `main` は Desktop で `Primary Navigation | article` の2列とする。
    - `article` は Desktop で2列にし、DOM 順序を変えず `.document-body` を column 1、`.toc` を column 2 に明示配置する。
    - `.document-body` と `.toc` は必要に応じて `grid-row: 1` を共有し、画面上は `Primary Navigation | article body | Contents` の3領域とする。
    - `.toc` が存在しない場合は `.document-body:only-child` 等の単純な CSS で article 全幅を使用し、空の右カラムを残さない。page shell 側に `hasToc` 判定や JavaScript を追加しない。
    - `.document-body` / `article` に `min-width: 0` を設定し、table / pre で全体 layout を押し広げない。
    - Primary Navigation / `.toc` は `align-self: start` と sticky を使い、header と重ならない offset を設定する。
    - sidebar が viewport より長い場合は内部 scroll 可能にする。
    - 現在の汎用 `nav ul` の横並び指定を残して override を積み重ねず、Primary Navigation 用 selector へ用途を限定して整理する。
    - Desktop では Desktop Primary Navigation を表示し、Mobile `<details>` を `display:none` にする。
    - Narrow / Mobile では Desktop Primary Navigation を `display:none` にし、Mobile `<details>` を表示する。
    - 非表示切替に `visibility:hidden`、opacity、positionによる画面外配置は使用しない。
    - 現行 `max-width:1280px` と `800px` breakpoint は固定せず、3領域で本文の可読幅を確保できるよう main 最大幅と切替点を必要最小限に調整する。
    - responsive layout は Desktop 3領域 / Narrow 1カラムの2状態だけにする。
    - Narrow / Mobile は1カラムへ切り替え、`.toc` は既存の本文上部表示を維持する。
    - `renderMarkdown()`、parser、heading、link / image resolver は変更しない。
  - [ ] 3. Specification page shell を最小変更する。
    - `docs/spec/README.md` の既存 `## Navigation` を build ごとに1回 `extractNavigation()` で抽出する。
    - 各 item の target は `docs/spec/README.md` の directory を基準に `path.posix.join()` / `path.posix.normalize()` で canonical repository path へ変換し、build 全体で再利用できる Navigation metadata にする。
    - Navigation専用の汎用resolverは作らない。
    - 現在の `## Navigation` に fragment link は存在しないため、今回 Primary Navigation 用の fragment split / re-attach 処理は追加しない。
    - 各 page では canonical path と `parsed.relativePath` を比較して current を判定する。
    - Primary Navigation の href は `resolveOutputLink(parsed.relativePath, item.target)` を使わない。
    - Primary Navigation の href は `outputPathFor(canonicalPath)` で target output path を求め、`relativeOutputPath(outputPathFor(parsed.relativePath), targetOutputPath)` で current page からの相対 href を生成する。
    - 本文 link は従来どおり `resolveOutputLink(parsed.relativePath, target)` を使用する。
    - page-specificな current 判定・href生成・Navigation content生成は各 page で1回だけ行う。
    - 生成済み Navigation content を Desktop `<nav>` と Mobile `<details>` 内で再利用する。
    - Desktop では Primary Navigation を `main` 左側へ表示し、現在の header 横並び Navigation は廃止する。
    - Primary Navigation 内の current page に `aria-current="page"` を付ける。
    - root page では header home link に `aria-current="page"` を付ける。
    - Supporting page が Primary Navigation に存在しない場合は current 項目を追加しない。
    - Desktop / Mobile の両 markup に current link が生成される場合、E2E は visible Primary Navigation を対象に確認する。
    - root本文の `## Navigation` は削除・非表示化しない。
  - [ ] 4. Curriculum Primary Navigation を最小実装する。
    - build ごとに Curriculum Navigation metadata を1回生成するため、`docs/curriculum/test-automation/README.md` の `## 全体構成` を読み取り対象にする。
    - READMEのファイルparse自体が既存 page 生成 loop で再度発生することは許容し、その回避だけを目的に cache / pre-parsed Map を追加しない。
    - `## 全体構成` 内の H3 見出し文字列をそのまま group label として扱う。現行は `共通`、`Part 1: テスト自動化の基礎と実践`、`Part 2: 開発プロセスへの組み込みと実務導入` の3 group。
    - 各 group 直下の番号付き Markdown link を記載順のまま Navigation item とする。
    - 次の H2 に到達したら `## 全体構成` の抽出を終了する。
    - Optional Reference / Legacy Alias 等、`## 全体構成` 外の項目を自動追加しない。
    - canonical repository path は既存 `resolveRepositoryPath(rootDir, "docs/curriculum/test-automation/README.md", item.target)` を使って Navigation metadata 生成時に確定する。
    - 新しい canonical path helper / Navigation専用 URL resolver / 共通 Navigation resolver は作らない。
    - 各 page では canonical path と `parsed.relativePath` を比較して current lesson を判定する。
    - href は既存 `resolveCurriculumLink(rootDir, "docs/curriculum/test-automation/README.md", item.target)` を使って生成する。
    - page-specificな current判定と Navigation content生成は各 page で1回だけ行う。
    - broken target は既存 `resolveRepositoryPath()` / `resolveCurriculumLink()` の存在確認で build error とする。
    - filesystem walk 順序から Navigation を生成しない。
    - 汎用 Markdown AST や新 parser は導入しない。
  - [ ] 5. Curriculum page shell を最小変更する。
    - Desktop では Primary Navigation を `main` 左側へ表示する。
    - Primary Navigation 内の current lesson に `aria-current="page"` を付ける。
    - root page では header home link に `aria-current="page"` を付ける。
    - Mobile では20件超の Navigation を本文前に常時展開せず、native `<details>` で初期折りたたみにする。
    - Desktop / Mobile で同じ page-specific Navigation content を使い回し、Navigation抽出・path解決・JavaScriptを重複追加しない。
    - Desktop / Mobile の両 markup に current link が生成される場合、E2E は visible Primary Navigation を対象に確認する。
    - Spec ↔ Curriculum 等の既存本文 link resolver は変更しない。
    - root本文の `## 全体構成` は削除・非表示化しない。
  - [ ] 6. semantic / accessibility を page shell へ組み込む。
    - document-wide Primary Navigation は `<nav>` と適切な `aria-label` を持つ。
    - Mobile `<details>` 内にも Navigation role が分かる構造を持たせる。
    - Desktop / Mobile の非表示側は `display:none` で accessibility tree / tab順から外す。
    - page-local Contents は既存 `<aside class="toc" aria-label="Table of contents">` を維持する。
    - article は `<article>` を維持する。
    - current state は `aria-current="page"` を正本とする。
    - keyboard focus indicator を消さない。
  - [ ] 7. `e2e/web/smoke.spec.ts` の既存 published docs smoke を拡張する。
    - Desktop Specification の代表 nested page で Primary Navigation・article body・Contents が表示される。
    - 3領域が単に存在するだけでなく、bounding box 等で `Primary Navigation < article body < Contents` の X 座標関係を1ケース確認する。
    - TOC がない既存 page を利用できる場合は article body が不要に狭くならないことを確認する。適切な既存 page がなければ専用 fixture を追加しない。
    - Specification nested page から Primary Navigation link が正しい URL へ遷移する。
    - Contents link で対象 heading anchor へ遷移できる。
    - visible Primary Navigation 内の current page に `aria-current="page"` が1件付く。
    - Desktop Curriculum の root / representative nested lesson で group順序、lesson link、current stateを確認する。
    - Mobile UI確認は Navigation件数が多い Curriculum の representative nested lesson 1ケースに限定する。
    - Mobile専用の新しい Playwright projectは追加せず、既存 `deployed-smoke` project 上で Mobile test の冒頭に `page.setViewportSize({ width: 390, height: 844 })` を設定する。
    - Mobile viewport では Desktop Primary Navigation が非表示、Primary Navigation `<details>` が表示かつ初期折りたたみで、開いて link 操作できることを確認する。
    - Desktop代表ケースでは Mobile `<details>` が非表示であることを確認する。
    - Mobile では `document.documentElement.scrollWidth <= window.innerWidth` を確認し、page 全体の横 overflow がないことを確認する。
    - 既存の Specification 画像、Curriculum lesson 遷移、Curriculum → Spec smoke は維持する。
  - [ ] 8. 最終 diff を確認し、実装対象が上記4ファイルに収まり、Docs UX 以外へ scope が広がっていないことを確認する。

## 6. 検証方法

- 実装中:
  - `pnpm run build:docs`
  - `DEPLOYED_BASE_URL` を設定せず、`PLAYWRIGHT_USE_PREBUILT_DIST` も未設定または `false` とし、current branch から `build:web` された local `dist` を対象に `pnpm run test:smoke` を実行する。
  - 古い Production / Preview / prebuilt `dist` を参照した smoke PASS を今回の実装検証として扱わない。
  - Mobile responsive smoke は `playwright.config.ts` を変更せず、既存 `deployed-smoke` project 内で `page.setViewportSize()` により実施する。
- 最終:
  - `pnpm run verify`
- 成功判定:
  - local Docs smoke と `pnpm run verify` が PASS する。
  - Desktop で Primary Navigation / article body / Contents が見た目として3領域に配置される。
  - Desktop 3領域で article body の可読幅が確保され、現行 `1280px` / `800px` の数値維持を目的化していない。
  - Desktop / Mobile の Primary Navigation は同時表示されず、非表示側は `display:none` で tab順から外れる。
  - `renderMarkdown()` の返却契約を変更していない。
  - TOC がないページでは article body が右側の空領域を残さない。
  - Spec / Curriculum の nested page から Primary Navigation が正しい URL へ遷移する。
  - current 判定は canonical repository path に基づき、表示中の Primary Navigation 内で current page が `aria-current="page"` で一意に識別できる。
  - Specification / Curriculum root は header home link で current state を表現する。
  - Root本文の `## Navigation` / `## 全体構成` が既存どおり残る。
  - Mobile で Primary Navigation が折りたたまれ、本文へすぐ到達できる。
  - Mobile で page 全体の横 overflow が発生しない。
  - Markdown content、画像、内部 link、外部 link、Spec ↔ Curriculum link が既存どおり機能する。
  - Production path / build pipeline / dependency set に変更がない。

## 7. リスク / Stop Conditions

- Risks:
  - `renderMarkdown()` の DOM 順序は `.toc` → `.document-body` なので、Grid column を明示しないと Desktop で `Contents | 本文` の順になる。DOM を並べ替えず CSS で配置する。
  - TOC がないページで article の2列を固定すると空の右カラムが残る。`:only-child` 等の単純な CSS で本文を全幅化する。
  - Specification Navigation の README 相対 target を current page 基準の `resolveOutputLink(parsed.relativePath, item.target)` へ直接渡すと nested page の href が壊れる。Primary Navigationでは canonical path → output path → `relativeOutputPath()` の順で生成する。
  - current 判定を生成後の相対 href で比較すると nested page ごとに表現が変わるため、canonical repository path と `parsed.relativePath` で比較する。
  - Navigation metadata の抽出・canonical path 解決を各 page ごとに繰り返すと無駄なので build ごとに1回生成する。一方、READMEのファイルparse回数自体を1回へ抑えるための cache / Map は作らない。
  - Desktop / Mobile 用 Navigation はDOM上で重複するが、CSSの `display:none` で一方だけを表示し、非表示側をtab順・accessibility treeから外す。重複排除のruntimeは追加しない。
  - 現在の汎用 `nav ul` を残して sidebar 用 CSS を上書きすると selector が複雑化する。Primary Navigation 用 selector へ用途を限定して整理する。
  - 現行 `main max-width:1280px` / `800px` breakpoint を固定すると3領域で本文が狭くなる可能性がある。数値互換ではなく可読性を優先して1回だけ調整する。
  - responsive layout を細分化すると CSS が複雑化するため、Desktop / Narrow の2状態を超えない。
  - sticky sidebar に高さ制御がないと、項目が viewport より長い場合に末尾へ到達できない。
  - Mobile で20件超の Curriculum Navigation を常時展開すると本文へ到達しづらくなるため、Primary Navigation は折りたたむ。
  - Root本文のNavigation重複を消そうとするとMarkdown本文・rendererへ特殊処理が増えるため、重複は許容する。
  - 現在存在しない Specification Navigation fragment 対応を先回り実装すると不要な分岐が増えるため、今回追加しない。
- Stop conditions:
  - `renderMarkdown()` の返却契約を変更しないと実現できないと判断した場合は、まず CSS / page shell だけで本当に不可能か再確認し、renderer変更を安易に進めない。
  - Curriculum `## 全体構成` の H3 group + numbered links を抽出するだけでは実現できず、汎用 Markdown parser の全面置換・大規模 AST 実装が必要になる場合は実装を止めて再設計する。
  - READMEのparse回数を減らすためだけに cache / pre-parsed Map / builder全体の再構成が必要になる案は採用しない。
  - Spec / Curriculum を共通 framework へ統合しないと実現できない案は採用しない。小さい重複を許容して各 builder を保つ。
  - Playwright Documentation の外観再現のために framework / runtime dependency / client-side application 化が必要になる案は採用しない。
  - Search、Prev / Next、breadcrumb、versioning、scroll spy 等の追加要求は本 PR へ含めない。
  - 新規 source file / contract test / visual regression基盤 / Playwright project を必要とする案は、今回の最小実装方針から外れるため採用しない。

## 8. 成果物

- 実装対象:
  - `scripts/spec/markdown.ts` — CSS のみ。
  - `scripts/spec/build-spec.ts`。
  - `scripts/docs/build-docs.ts`。
  - `e2e/web/smoke.spec.ts`。
- 原則変更しない:
  - `scripts/spec/markdown.ts` の `renderMarkdown()` / parser / renderer logic。
  - `docs/spec/README.md`。
  - `docs/curriculum/test-automation/README.md`。
  - `playwright.config.ts`。
- 新規ファイル:
  - 追加しない。
- 付随ドキュメント:
  - 本 Plan 以外の設計ドキュメントは追加しない。

## 9. 備考

- 本 Plan は `plan/docs-navigation-redesign` 上で実装まで進める前提だが、この Plan 作成・レビュー段階では実装しない。
- 優先順位は「見栄えを Playwright 風にすること」ではなく、Docs 利用時の Navigation cost を下げること。
- 実 DOM は変更せず次を利用する。

```text
main
├─ Primary Navigation
└─ article
   ├─ Contents (.toc)        ← DOMでは先
   └─ document-body          ← DOMでは後
```

- Desktop では CSS Grid で表示位置を明示する。

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

- Narrow / Mobile の見た目:

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

- Mobile で折りたたむのは Primary Navigation のみとし、Contents の折りたたみや client-side interaction は追加しない。
