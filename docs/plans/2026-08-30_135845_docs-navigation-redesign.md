# Specification / Curriculum Docs Navigation Redesign Plan

## 0. 依頼概要

- 依頼内容:
  - Production で公開している Specification と Test Automation Curriculum の閲覧体験を再設計する。
  - 現在の使いづらさを解消するため、Playwright Documentation のように「文書全体の移動」「本文閲覧」「ページ内移動」を同時に把握できる構成へ改善する。
  - 対象 URL は既存どおり `/docs/spec/**` と `/docs/curriculum/**` とし、公開パスは変更しない。
- 背景:
  - 現在の Docs は Markdown を静的 HTML 化して公開できているが、長いページでは現在地・他ページ・ページ内見出しの把握と移動がしづらい。
  - `scripts/spec/markdown.ts` の `renderMarkdown()` はすでに `<aside class="toc">` と `<div class="document-body">` を別要素として生成しているが、現在の page shell / CSS では右側 Contents として十分に活用できていない。
  - Specification の文書全体 Navigation は header に横並びで表示されており、一覧性が低い。
  - Curriculum は `docs/curriculum/test-automation/README.md` に学習順の正本があるが、生成ページには文書全体を移動する Navigation がない。
- 期待成果:
  - Desktop では、見た目として左に Primary Navigation、中央に本文、右にページ内 `Contents` を持つ3領域構成とする。
  - Narrow / Mobile では1カラムへ落とし、Primary Navigation は native `<details>` で折りたたみ、本文へすぐ到達できるようにする。
  - 既存 Markdown renderer の出力契約は変更せず、CSS と Specification / Curriculum の page shell を中心に最小変更する。

## 1. ゴール / 完了条件

- ゴール:
  - Specification と Curriculum の双方で、利用者が次の3点を判断しやすい Docs UI にする。
    1. **Where am I?**: 現在閲覧している文書が分かる。
    2. **What else exists?**: 主要な移動先と文書構造が分かる。
    3. **What is on this page?**: 現在ページの見出し構成と目的の節への移動方法が分かる。
  - Playwright Documentation の外観をコピーするのではなく、Navigation / Article / Contents の役割分担を参考にする。
- 完了条件（DoD）:
  - `/docs/spec/**` と `/docs/curriculum/**` の既存 URL を変更しない。
  - Desktop では見た目として次の3領域を持つ。
    - 左: document-wide Primary Navigation。
    - 中央: article body。
    - 右: current page の `Contents`。
  - DOM 上で3要素を同一階層の sibling にすることは要件にしない。既存 `article > .toc + .document-body` を活用してよい。
  - 左 Primary Navigation と右 `Contents` は sticky とし、長い本文をスクロールしても利用できる。
  - `Contents` は既存どおり current page の H2 / H3 を使用し、H1 は重複表示しない。
  - `Contents` 対象の H2 / H3 がないページでは空の右領域を表示しない。
  - Specification の Primary Navigation は `docs/spec/README.md` の `## Navigation` を正本とし、別 config を作らない。
  - Curriculum の Primary Navigation は `docs/curriculum/test-automation/README.md` の `## 全体構成` 内にある H3 group と、その直下の番号付き Markdown link を正本とする。
  - Curriculum Navigation は `共通`、`Part 1`、`Part 2` の group と記載順を維持し、filesystem の alphabetical order を使用しない。
  - Primary Navigation に掲載されている current page だけに `aria-current="page"` を1件付与する。
  - Primary Navigation に掲載されていない Supporting / Optional / Legacy ページに current 用の項目を追加しない。
  - Specification root / Curriculum root は header の home link に `aria-current="page"` を付けて現在地を表現する。
  - Navigation target は Navigation source README を基準に canonical repository path へ解決してから、各表示ページ用の output href を生成する。表示中ページを基準に README 内の `./...` を解決しない。
  - Narrow / Mobile では1カラム化し、Primary Navigation は native `<details>` / `<summary>` で初期折りたたみとする。
  - Mobile の Primary Navigation のために JavaScript drawer、overlay、state management を追加しない。
  - Mobile の `Contents` は既存のTOCを本文上部へ落とす程度の単純なresponsive表示を基本とし、必要がなければ折りたたみ機能を追加しない。
  - Narrow / Mobile で document 全体の横 overflow を発生させない。table / pre 自体の内部横scrollは既存契約どおり許容する。
  - Navigation / Contents に semantic markup と適切な `aria-label` を付与し、keyboard でlinkを利用できる。
  - active state の正本は `aria-current="page"` とする。
  - `renderMarkdown()` の返却形式、Markdown parser、heading id、本文link / image resolver の契約を変更しない。
  - Specification / Curriculum の画像、本文リンク、Spec ↔ Curriculum link、GitHub source link を壊さない。
  - `pnpm run build:spec` の `output/spec-site`、`pnpm run build:docs` / `pnpm run build:web` の `dist/docs/**` 出力契約を維持する。
  - Storefront / SPA route / Native build へ影響を与えない。
  - 新しい Docs framework / Markdown parser / UI framework / runtime dependency を追加しない。
  - Docs smoke と最終 `pnpm run verify` が PASS する。

## 2. 現状理解と前提

- Current understanding:
  - 計画作成時点の baseline は `main` commit `78c55b25bd39c91423001a3607236a98eaf76264`。
  - 作業ブランチは `plan/docs-navigation-redesign`。
  - Specification と Curriculum は静的 HTML として `dist/docs/spec/**` / `dist/docs/curriculum/**` へ生成される。
  - `scripts/spec/markdown.ts` の `renderMarkdown()` は現在、`<aside class="toc">...</aside><div class="document-body">...</div>` を返す。
  - したがって TOC / body を新APIへ分離する必要はなく、`article` を grid 化すれば本文と Contents を横並びにできる。
  - `MARKDOWN_CSS` にはすでに grid、sticky TOC、mobile breakpoint の基礎があるため、既存CSSの整理・拡張を優先する。
  - `scripts/spec/build-spec.ts` は `docs/spec/README.md` の `## Navigation` を既存 `extractNavigation()` で読み取っている。
  - Specification Navigation の target は README に対する相対 path なので、Navigation source README を基準に解決する必要がある。
  - `scripts/docs/build-docs.ts` は Curriculum Markdown を生成するが、document-wide Navigation は生成していない。
  - Curriculum `README.md` の `## 全体構成` は H3 group (`共通` / `Part 1` / `Part 2`) と番号付き Markdown link で学習順を定義している。
  - Curriculum Navigation の target も README に対する相対 path なので、nested lesson の path を基準に解決してはいけない。
  - Curriculum のPrimary Navigationは20件を超えるため、Mobileで常時展開すると本文への到達を阻害する。
  - `e2e/web/smoke.spec.ts` には既存 `published docs smoke` があり、今回のUI契約はここを拡張して確認できる。
  - `pnpm run verify` は format / Markdown lint / spec validation / curriculum validation / lint / typecheck / test / `build:web` / `build:spec` を包含している。
- Assumptions:
  - Desktop は左 Navigation / article body / 右 Contents を同時表示できる十分な横幅を持つ環境とする。
  - article body は読みやすい幅を維持し、wide monitor で過度に横長にしない。
  - sidebar の厳密な幅、spacing、breakpoint は既存 `MARKDOWN_CSS` を基準に最小調整する。
  - Specification / Curriculum の本文・用語・教材順は変更しない。
  - Playwright Documentation は information architecture の参考に留め、CSS・branding・DOMを複製しない。
- Non-goals:
  - Markdown renderer の新API設計や返却型変更。
  - Spec / Curriculum 共通の新しい Docs page framework / shell abstraction。
  - Docusaurus / VitePress / MkDocs / Nextra 等のDocs framework導入。
  - Expo Router の `web.output` 変更。
  - Markdown / 画像正本の移動・複製。
  - Docs専用SPA / React hydration / client-side router。
  - 検索、全文検索index、command palette。
  - Prev / Next navigation、breadcrumb、version switcher、theme switcher、dark mode。
  - current section の scroll spy。
  - content本文の再執筆・教材順変更。
  - Specification / Curriculum 以外の `docs/**` 公開範囲拡張。
  - Docs専用CI workflow。
  - Production domain / Cloudflare deploy architecture の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - なし。今回の対象は既存静的Docsの Primary Navigation / Contents / layout 再構成に限定する。
- 仮定してよい細部:
  - sidebar幅、border、font-size、spacing、breakpoint は既存toneを維持して実装時に最小調整する。
  - `Contents` labelは既存どおり `Contents` とする。
  - Mobile Primary Navigation の `<summary>` labelは `Navigation` 等の簡潔な名称とする。
- 未回答の重要質問:
  - なし。

## 4. 影響範囲

- 必須候補:
  - `scripts/spec/markdown.ts`
    - `renderMarkdown()` は変更しない。
    - shared CSS を Desktop 3領域 / Narrow 1カラムへ整理する。
  - `scripts/spec/build-spec.ts`
    - Specification Primary Navigation を header から左側へ移す。
    - Navigation source README 基準の target 解決。
    - current state / Mobile Navigation markup。
  - `scripts/docs/build-docs.ts`
    - Curriculum `README.md` の `## 全体構成` から group / link を抽出する最小ロジック。
    - README基準のtarget解決。
    - Curriculum Primary Navigation / current state / Mobile Navigation markup。
  - `e2e/web/smoke.spec.ts`
    - 既存 published docs smoke の拡張。
- 必要な場合のみ:
  - `tests/contracts/docs-navigation.test.ts`
    - Navigation抽出・path解決を純粋関数として切り出し、E2Eだけでは原因特定が難しいほどロジックが増えた場合に限り追加する。
- 原則変更しない:
  - `renderMarkdown()` 実装。
  - `docs/spec/README.md`。
  - `docs/curriculum/test-automation/README.md`。
  - Markdown本文、画像正本、教材順。

## 5. 変更方針 / 実行タスク

- Change strategy:
  - **既存DOMを使う。** `renderMarkdown()` の `<aside class="toc"> + <div class="document-body">` を維持する。
  - **CSSとpage shellを中心に変更する。** UX改善のためにMarkdown rendererの契約へ変更範囲を広げない。
  - **Navigation sourceは既存READMEを維持する。** 別JSON / TS array / YAMLへ項目を複製しない。
  - **Navigation linkはsource README基準で解決する。** 本文linkのresolverは現在ページ基準のまま維持する。
  - **Spec / Curriculum builderを無理に共通化しない。** page shellが2箇所だけで、Navigation構造とURL契約が異なるため、それぞれ小さく実装する。
  - **静的HTMLのまま実現する。** Mobile折りたたみもnative HTMLだけで実現する。
- 実行タスク:
  - [ ] 1. 実装開始時に最新 `main` を取り込み、本Planのbaselineと対象ファイルを再確認する。
  - [ ] 2. `scripts/spec/markdown.ts` の `MARKDOWN_CSS` を最小変更する。
    - `main` は Desktop で `Primary Navigation | article` の2列とする。
    - `article` は Desktop で `.document-body | .toc` の2列とする。
    - 結果として画面上は `Primary Navigation | article body | Contents` の3領域になる。
    - `.document-body` / `article` に必要な `min-width: 0` を設定し、table / preで全体layoutを押し広げない。
    - Primary Navigation / `.toc` はstickyにし、headerと重ならないoffsetを使用する。
    - sidebarがviewportより長い場合は内部scroll可能にする。
    - H2 / H3がないページでは `.toc` 自体が生成されない既存挙動を利用し、article bodyが不要に狭くならないCSSにする。
    - Narrow / Mobile は1カラムへ切り替え、`.toc` は既存の本文上部表示を基本とする。
    - `renderMarkdown()`、parser、heading、link / image resolverは変更しない。
  - [ ] 3. Specification page shellを最小変更する。
    - `docs/spec/README.md` の既存 `## Navigation` をDesktop用Primary Navigationとして `main` 左側へ表示する。
    - 現在のheader横並びNavigationは廃止する。
    - Navigation targetは `docs/spec/README.md` を基準にcanonical repository pathへ解決してから、current output pageからのhrefを生成する。
    - Primary Navigation内のcurrent pageだけに `aria-current="page"` を付ける。
    - root pageではheader home linkに `aria-current="page"` を付ける。
    - Supporting pageがPrimary Navigationに存在しない場合はcurrent項目を追加しない。
    - Mobile用Primary Navigationは同じ `navHtml` を再利用してnative `<details>` 内へ表示してよい。Desktop / MobileでHTMLが少し重複しても、新しいstate共有ロジックは作らない。
  - [ ] 4. Curriculum Primary Navigationを最小実装する。
    - `docs/curriculum/test-automation/README.md` の `## 全体構成` セクションだけを対象にする。
    - H3 `共通` / `Part 1` / `Part 2` をgroup labelとして扱う。
    - 各group直下の番号付きMarkdown linkを記載順のままNavigation itemとする。
    - Optional Reference / Legacy Alias等、`## 全体構成` 外の項目を自動追加しない。
    - targetはCurriculum READMEを基準にcanonical repository pathへ解決してから、current output page用hrefへ変換する。
    - filesystem walk順序からNavigationを生成しない。
    - broken targetはbuild errorとする。
    - 汎用Markdown ASTや新parserは導入せず、現在のREADME構造だけを対象にした小さい抽出処理とする。
  - [ ] 5. Curriculum page shellを最小変更する。
    - DesktopではPrimary Navigationを `main` 左側へ表示する。
    - Primary Navigation内のcurrent lessonだけに `aria-current="page"` を付ける。
    - root pageではheader home linkに `aria-current="page"` を付ける。
    - Mobileでは20件超のNavigationを本文前に常時展開せず、native `<details>` で初期折りたたみにする。
    - Desktop / Mobileで同じ生成済みNavigation HTMLを使い回し、JavaScriptを追加しない。
    - Spec ↔ Curriculum等の既存本文link resolverは変更しない。
  - [ ] 6. semantic / accessibilityをpage shellへ組み込む。
    - document-wide Primary Navigationは `<nav>` と適切な `aria-label` を持つ。
    - Mobile `<details>` 内にも同じNavigation roleが分かる構造を持たせる。
    - page-local Contentsは既存 `<aside class="toc" aria-label="Table of contents">` を維持する。
    - articleは `<article>` を維持する。
    - current stateは `aria-current="page"` を正本とする。
    - keyboard focus indicatorを消さない。
  - [ ] 7. `e2e/web/smoke.spec.ts` の既存 published docs smokeを拡張する。
    - Desktop Specificationの代表nested pageでPrimary Navigation・article body・Contentsが表示される。
    - 3領域が単に存在するだけでなく、bounding box等で `Primary Navigation < article body < Contents` のX座標関係を1ケース確認する。
    - Specification nested pageからPrimary Navigation linkが正しいURLへ遷移する。
    - Contents linkで対象heading anchorへ遷移できる。
    - Primary Navigation内current pageに `aria-current="page"` が1件付く。
    - Curriculum root / representative nested lessonでPrimary Navigationとcurrent stateを確認する。
    - Mobile viewportではPrimary Navigation `<details>` が初期折りたたみで、開いてlink操作できる。
    - Mobileでは `document.documentElement.scrollWidth <= window.innerWidth` を確認し、page全体の横overflowがないことを確認する。
    - 既存のSpecification画像、Curriculum lesson遷移、Curriculum → Spec smokeは維持する。
  - [ ] 8. 新規contract testの要否を判断する。
    - Navigation抽出・path解決が小さいbuilder内処理で収まり、Docs smokeで十分に検証できるなら追加しない。
    - 純粋関数として切り出すほどロジックが増え、E2E失敗時の原因特定が難しくなる場合のみfocused contract testを1ファイル追加する。
  - [ ] 9. 最終diffを確認し、Docs UX以外へscopeが広がっていないことを確認する。

## 6. 検証方法

- 実装中:
  - `pnpm run build:docs`
  - `pnpm run test:smoke` または既存configを使った同等のlocal published-docs smoke。
  - contract testを追加した場合のみ、そのfocused test。
- 最終:
  - `pnpm run verify`
- 成功判定:
  - Docs smokeと`pnpm run verify`がPASSする。
  - DesktopでPrimary Navigation / article body / Contentsが見た目として3領域に配置される。
  - `renderMarkdown()` の返却契約を変更していない。
  - Spec / Curriculumのnested pageからPrimary Navigationが正しいURLへ遷移する。
  - Primary Navigation内のcurrent pageだけが`aria-current="page"`で識別できる。
  - Specification / Curriculum rootはheader home linkでcurrent stateを表現する。
  - MobileでPrimary Navigationが折りたたまれ、本文へすぐ到達できる。
  - Mobileでpage全体の横overflowが発生しない。
  - Markdown content、画像、内部link、外部link、Spec ↔ Curriculum linkが既存どおり機能する。
  - Production path / build pipeline / dependency setに変更がない。

## 7. リスク / Stop Conditions

- Risks:
  - Navigation linkを表示中page基準で解決するとnested pageから誤ったpathへ遷移する。必ずsource README基準でcanonical pathへ解決する。
  - `main` / `article` のgrid幅を固定しすぎるとtablet付近で本文が狭くなる。
  - sticky sidebarに高さ制御がないと、項目がviewportより長い場合に末尾へ到達できない。
  - Mobileで20件超のCurriculum Navigationを常時展開すると本文へ到達しづらくなるため、Primary Navigationは折りたたむ。
- Stop conditions:
  - `renderMarkdown()` の返却契約を変更しないと実現できないと判断した場合は、まずCSS / page shellだけで本当に不可能か再確認し、renderer変更を安易に進めない。
  - Curriculum `## 全体構成` のH3 group + numbered linksを抽出するだけでは実現できず、汎用Markdown parserの全面置換・大規模AST実装が必要になる場合は実装を止めて再設計する。
  - Spec / Curriculumを共通frameworkへ統合しないと実現できない案は採用しない。小さい重複を許容して各builderを保つ。
  - Playwright Documentationの外観再現のためにframework / runtime dependency / client-side application化が必要になる案は採用しない。
  - Search、Prev / Next、breadcrumb、versioning、scroll spy等の追加要求は本PRへ含めない。

## 8. 成果物

- 実装候補:
  - `scripts/spec/markdown.ts` — CSSのみ。
  - `scripts/spec/build-spec.ts`。
  - `scripts/docs/build-docs.ts`。
  - `e2e/web/smoke.spec.ts`。
  - 必要な場合のみ `tests/contracts/docs-navigation.test.ts`。
- 原則変更しない:
  - `scripts/spec/markdown.ts` の `renderMarkdown()` / parser / renderer logic。
  - `docs/spec/README.md`。
  - `docs/curriculum/test-automation/README.md`。
- 付随ドキュメント:
  - 本Plan以外の設計ドキュメントは追加しない。

## 9. 備考

- 本Planは `plan/docs-navigation-redesign` 上で実装まで進める前提だが、このPlan作成・レビュー段階では実装しない。
- 優先順位は「見栄えをPlaywright風にすること」ではなく、Docs利用時のNavigation costを下げること。
- 実装上は次の既存DOMを活かす。

```text
main
├─ Primary Navigation
└─ article
   ├─ document-body
   └─ Contents (.toc)
```

- Desktopの見た目:

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

- Narrow / Mobileの見た目:

```text
┌─────────────────────────────┐
│ Header / Brand              │
├─────────────────────────────┤
│ ▸ Navigation               │
├─────────────────────────────┤
│ Contents                    │
├─────────────────────────────┤
│ Article body                │
│ 本文                        │
└─────────────────────────────┘
```

- Mobileで折りたたむのはPrimary Navigationを必須とし、Contentsの折りたたみやclient-side interactionは今回追加しない。
