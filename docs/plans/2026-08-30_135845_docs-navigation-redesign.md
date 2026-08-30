# Specification / Curriculum Docs Navigation Redesign Plan

## 0. 依頼概要

- 依頼内容:
  - Production で公開している Specification と Test Automation Curriculum の閲覧体験を再設計する。
  - 現在本文中に表示されているページ内 `Contents` をサイドへ配置し、Playwright Documentation のように「文書全体の移動」「本文閲覧」「ページ内移動」を同時に把握できる構成へ改善する。
  - 対象 URL は既存どおり `/docs/spec/**` と `/docs/curriculum/**` とし、公開パスは変更しない。
- 背景:
  - 現状の Docs は Markdown を静的 HTML 化して公開できているが、長いページを閲覧すると現在地・他ページ・ページ内見出しを行き来しづらい。
  - `scripts/spec/markdown.ts` の `renderMarkdown()` は TOC と本文を一体で返しており、Specification / Curriculum の page shell がそれを `<article>` 内へ入れているため、TOC を独立したサイド領域として配置できない。
  - Specification は `docs/spec/README.md` の `## Navigation` を header に横並び表示しており、一覧性が低い。
  - Curriculum は `docs/curriculum/test-automation/README.md` に学習順の正本があるが、生成ページには文書全体を移動する navigation がない。
- 期待成果:
  - Desktop では、左に文書全体の Primary Navigation、中央に本文、右にページ内 `Contents` を持つ3領域構成とする。
  - Narrow / Mobile では1カラムへ落とし、Navigation / Contents が本文幅を圧迫せず、横スクロールを要求しない。
  - Specification と Curriculum で同じ役割分担を採用しつつ、既存 Markdown と navigation source の正本は維持する。

## 1. ゴール / 完了条件

- ゴール:
  - Specification と Curriculum の双方で、利用者が次の3点を判断しやすい Docs UI にする。
    1. **Where am I?**: 現在閲覧している文書が分かる。
    2. **What else exists?**: 主要な移動先と文書構造が分かる。
    3. **What is on this page?**: 現在ページの見出し構成と目的の節への移動方法が分かる。
  - Playwright Documentation の外観をコピーするのではなく、Navigation / Article / Contents の役割分担を参考にする。
- 完了条件（DoD）:
  - `/docs/spec/**` と `/docs/curriculum/**` の既存 URL が変更されず、既存リンクから引き続きアクセスできる。
  - Desktop では次の3領域を持つ。
    - 左: document-wide Primary Navigation。
    - 中央: article。
    - 右: current page の `Contents`。
  - 左 Navigation と右 `Contents` は本文と独立した sibling 領域として配置する。
  - 左 Navigation は sticky、右 `Contents` も項目がある場合は sticky とし、長い本文をスクロールしても利用できる。
  - `Contents` は current page の H2 / H3 を使用し、H1 は重複表示しない。
  - `Contents` 対象の H2 / H3 がない場合は空の右 sidebar を表示しない。
  - Specification の Primary Navigation は `docs/spec/README.md` の `## Navigation` を正本とし、別 config を作らない。
  - Curriculum の Primary Navigation は `docs/curriculum/test-automation/README.md` の `## 全体構成` 内にある H3 group と、その直下の番号付き Markdown link を正本とする。
  - Curriculum Navigation では `共通`、`Part 1`、`Part 2` の group と記載順を維持し、filesystem の alphabetical order は使用しない。
  - Primary Navigation に掲載されている current page には `aria-current="page"` を1件だけ付与する。
  - Primary Navigation に掲載されていない Supporting / Optional / Legacy ページに対し、無理に `aria-current` 用の項目を追加しない。
  - Specification root / Curriculum root は header の home link で現在地を表現できるようにする。Primary Navigationへ重複するOverview項目を追加する必要はない。
  - Navigation target は **Navigation source README を基準に canonical repository path へ解決した後**、各表示ページからの output href を生成する。現在の表示中ページを基準に `./...` を解決しない。
  - Narrow / Mobile では1カラム化し、Navigation / Contents が本文を圧迫しない。JavaScript drawer / client-side state management は追加しない。
  - Narrow / Mobile で native `<details>` を使う場合は、markup duplication や複雑な状態管理を増やさず実現できる場合に限る。`<details>` 自体は必須要件にしない。
  - navigation / Contents に semantic markup と適切な `aria-label` を付与し、keyboard で link を利用できる。
  - active state の正本は `aria-current="page"` とし、別の current-state class を状態管理用に追加しない。
  - 既存 Markdown renderer の heading / table / list / code / blockquote / link / image の出力契約を維持する。
  - Specification / Curriculum の画像、本文リンク、Spec ↔ Curriculum link、GitHub source link の既存 resolver を壊さない。
  - `pnpm run build:spec` の `output/spec-site`、`pnpm run build:docs` / `pnpm run build:web` の `dist/docs/**` 出力契約を維持する。
  - Storefront / SPA route / Native build へ影響を与えない。
  - 新しい Docs framework / Markdown parser / UI framework / runtime dependency を追加しない。
  - focused validation、Docs smoke、最終 `pnpm run verify` が PASS する。

## 2. 現状理解と前提

- Current understanding:
  - 計画作成時点の baseline は `main` commit `78c55b25bd39c91423001a3607236a98eaf76264`。
  - 作業ブランチは `plan/docs-navigation-redesign`。
  - Specification と Curriculum は静的 HTML として `dist/docs/spec/**` / `dist/docs/curriculum/**` へ生成される。
  - `scripts/spec/markdown.ts` は Markdown parsing、heading id、TOC、本文 HTML、共通 CSS を担当している。
  - 現在の `renderMarkdown()` は TOC と本文を1つの HTML string で返すため、page shell 側で sibling column に分けられない。
  - `scripts/spec/build-spec.ts` は `docs/spec/README.md` の `## Navigation` を読み取る既存 `extractNavigation()` を利用している。
  - Specification Navigation の link target は README に対する相対 path なので、navigation source の path を基準に解決する必要がある。
  - `scripts/docs/build-docs.ts` は Curriculum Markdown を生成するが、document-wide Navigation は生成していない。
  - `docs/curriculum/test-automation/README.md` の `## 全体構成` は H3 group (`共通` / `Part 1` / `Part 2`) と番号付き Markdown link で学習順を定義している。
  - Curriculum Navigation の link target も README に対する相対 path なので、各 nested lesson を基準に解決してはいけない。
  - `e2e/web/smoke.spec.ts` には既存 `published docs smoke` があり、ここを拡張できる。
  - `pnpm run verify` は format / Markdown lint / spec validation / curriculum validation / lint / typecheck / test / `build:web` / `build:spec` を既に包含している。
- Assumptions:
  - Desktop は左 Navigation / article / 右 Contents を同時表示できる十分な横幅を持つ環境とする。
  - article は読みやすい幅を維持し、wide monitor で本文だけが過度に横長にならないようにする。
  - sidebar の厳密な幅、spacing、breakpoint は既存 `MARKDOWN_CSS` を基準に最小調整する。
  - Specification / Curriculum の本文・用語・教材順は今回変更しない。
  - Playwright Documentation は information architecture の参考に留め、CSS・branding・DOM を複製しない。
- Non-goals:
  - Docusaurus / VitePress / MkDocs / Nextra 等の Docs framework 導入。
  - Expo Router の `web.output` 変更。
  - Markdown / 画像正本の移動・複製。
  - Docs 専用 SPA / React hydration / client-side router の追加。
  - 検索、全文検索 index、command palette。
  - Prev / Next navigation、breadcrumb、version switcher、theme switcher、dark mode。
  - current section の scroll spy。
  - content 本文の再執筆・教材順の変更。
  - Specification / Curriculum 以外の `docs/**` の公開範囲拡張。
  - Docs 専用 CI workflow の新設。
  - Production domain / Cloudflare deploy architecture の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - なし。今回の対象は既存静的 Docs の Navigation / Contents / layout 再構成に限定する。
- 仮定してよい細部:
  - sidebar の幅、border、font-size、spacing、breakpoint は既存 tone を維持して実装時に最小調整する。
  - `Contents` の label は既存どおり `Contents` とする。
  - Narrow / Mobile の折りたたみ UI は、native HTML だけで単純に実現できる場合に限り採用する。
- 未回答の重要質問:
  - なし。

## 4. 影響範囲

- 必須候補:
  - `scripts/spec/markdown.ts`
    - Markdown body と TOC を page shell から別配置可能にする。
    - shared Docs layout CSS を3領域対応へ整理する。
  - `scripts/spec/build-spec.ts`
    - Specification Primary Navigation の左 sidebar 化。
    - Navigation source README 基準の target 解決。
    - `aria-current="page"` と root current state。
  - `scripts/docs/build-docs.ts`
    - Curriculum `README.md` の `## 全体構成` から group / link を抽出する最小ロジック。
    - README 基準の target 解決。
    - Curriculum page shell / current state。
  - `e2e/web/smoke.spec.ts`
    - 既存 published docs smoke の拡張。
- Test:
  - Docs Navigation の生成契約に専用 contract test が必要な場合は `tests/contracts/docs-navigation.test.ts` を1ファイルだけ追加する。
  - 既存の `training-curriculum.test.ts` や `spec-agentic-qa.test.ts` へ無理に UX / generated HTML 契約を混在させない。
- 原則変更しない:
  - `docs/spec/README.md`
  - `docs/curriculum/test-automation/README.md`
  - Markdown本文、画像正本、教材順。

## 5. 変更方針 / 実行タスク

- Change strategy:
  - **HTML responsibility を先に正す。** CSSだけで現在の一体DOMを無理にsidebar化しない。
  - **Navigation source は既存 README を維持する。** 別 JSON / TS array / YAML へ項目を複製しない。
  - **Navigation link は source README 基準で解決する。** 表示中ページ基準で解決しない。
  - **共有するのは Markdown body / TOC / shared layout に必要な最小部分だけ。** Spec / Curriculum builder を大規模frameworkへ統合しない。
  - **静的 HTML のまま実現する。** client runtime / dependency を追加しない。
- 実行タスク:
  - [ ] 1. 実装開始時に最新 `main` を取り込み、本Planの baseline と対象ファイルを再確認する。
  - [ ] 2. `scripts/spec/markdown.ts` を最小変更し、current page の本文 HTML と TOC HTML を page shell から別々に配置できるようにする。
    - parser、heading id、link resolver、image resolver は再実装しない。
    - API名や wrapper は固定しない。現行 call site を確認し、不要な backward-compatible wrapper は残さない。
  - [ ] 3. shared CSS を Desktop 3領域 / Narrow 1カラムへ整理する。
    - Desktop: `Primary Navigation | article | Contents`。
    - article に `min-width: 0` を付け、table / pre で grid 全体を押し広げない。
    - sidebar は sticky とし、header と重ならない top offset を使用する。
    - sidebar が viewport より長い場合は内部 scroll を許可する。
    - Narrow / Mobile は1カラム化し、横overflowを起こさない。
    - `<details>` は必要なら使用できるが、単純なCSSだけで目的を達成できる場合は追加しない。
  - [ ] 4. Specification page shell を再構成する。
    - `docs/spec/README.md` の `## Navigation` を Primary Navigation として左へ表示する。
    - 現在の header 横並び Navigation は廃止する。
    - Navigation target は `docs/spec/README.md` を基準に repository path へ解決してから、current output page からの href を生成する。
    - Primary Navigation 内の current page にのみ `aria-current="page"` を付与する。
    - root page は header home link に `aria-current="page"` を付け、Primary Navigationへ重複項目を追加しない。
    - Supporting page がPrimary Navigationに存在しない場合はcurrent項目を捏造しない。
    - right `Contents` は article の sibling として配置する。
  - [ ] 5. Curriculum Primary Navigation を実装する。
    - `docs/curriculum/test-automation/README.md` の `## 全体構成` セクションだけを対象にする。
    - H3 `共通` / `Part 1` / `Part 2` を group label として扱う。
    - 各group直下の番号付き Markdown link を記載順のままNavigation itemとする。
    - Optional Reference / Legacy Alias 等、`## 全体構成` 外の記述をNavigationへ自動追加しない。
    - target は Curriculum README を基準に repository path へ解決した後、current output page 用hrefへ変換する。
    - filesystem walk の順序からNavigationを生成しない。
    - broken target は既存 link resolution と同様に build error とする。
  - [ ] 6. Curriculum page shell を同じ役割分担へ再構成する。
    - 左: Curriculum Primary Navigation。
    - 中央: article。
    - 右: current page Contents。
    - Primary Navigation内のcurrent lessonにのみ `aria-current="page"` を付与する。
    - root pageはheader home linkでcurrent stateを表現する。
    - Spec ↔ Curriculum 等の既存本文link resolverは変更しない。
  - [ ] 7. semantic / accessibility を実装へ組み込む。
    - document-wide Navigation は `<nav>` と適切な `aria-label` を持つ。
    - page-local Contents は `<aside>` 等で役割を識別できる。
    - article は `<article>` を維持する。
    - current state は `aria-current="page"` を正本とする。
    - keyboard focus indicator を消さない。
  - [ ] 8. focused contract test と既存 smoke を更新する。
    - Contract testでは最低限、本文 / TOC が別配置可能であること、Spec / Curriculum Navigation sourceの順序、source README基準のtarget解決、Primary Navigation内current pageの `aria-current` を確認する。
    - Curriculumのbroken Navigation targetがbuild errorになることを確認する。
    - `e2e/web/smoke.spec.ts` ではDesktopのSpec / Curriculumで左Navigation・本文・右Contents、Contents anchor遷移、current stateを確認する。
    - Narrow viewportでは1カラムで横overflowせず、Navigation / Contentsを利用できることを確認する。
    - 既存画像、Curriculum lesson遷移、Curriculum → Spec smokeは維持する。
  - [ ] 9. 最終差分を確認し、Docs UX以外へscopeが広がっていないことを確認する。

## 6. 検証方法

- 実装中の focused validation:
  - 追加または変更した Docs Navigation contract test。
  - `pnpm run build:docs`
  - `pnpm run test:smoke` または同等の既存 local published-docs smoke。
- 最終 validation:
  - `pnpm run verify`
- 成功判定:
  - focused validation と `pnpm run verify` が PASS する。
  - Desktop で左 Navigation / article / right Contents が sibling 領域として表示され、Contents が本文先頭へ埋め込まれない。
  - Spec / Curriculum の nested page からPrimary Navigationが正しいURLへ遷移する。
  - Primary Navigation内のcurrent pageだけが `aria-current="page"` で識別できる。
  - Specification / Curriculum rootはheader home linkでcurrent stateを表現する。
  - Narrow / Mobileで横overflowせず、Navigation / Contentsが本文幅を圧迫しない。
  - Markdown content、画像、内部link、外部link、Spec ↔ Curriculum linkが既存どおり機能する。
  - Production path / build pipeline / dependency setに変更がない。

## 7. リスク / Stop Conditions

- Risks:
  - Navigation linkを表示中page基準で解決するとnested pageから誤ったpathへ遷移する。必ずsource README基準でcanonical pathへ解決する。
  - Markdown rendererの責務分離でresolver受け渡しを漏らすと既存link / imageが壊れる。
  - Specification Navigation と Curriculum `## 全体構成` の構造差を無理に同一parserへ抽象化すると複雑化する。
  - 3カラム幅を固定しすぎるとtablet付近で本文が狭くなる。
  - sticky sidebarに高さ制御がないと、項目がviewportより長い場合に末尾へ到達できない。
- Stop conditions:
  - Curriculum `## 全体構成` のH3 group + numbered linksを抽出するだけでは実現できず、汎用Markdown parserの全面置換・大規模AST実装が必要になる場合は実装を止めて再設計する。
  - shared Markdown renderer変更で既存link、image、heading id、table、code block互換性を維持できない場合はlayout実装を先へ進めない。
  - Playwright Documentationの外観再現のためにframework / runtime dependency / client-side application化が必要になる案は採用しない。
  - Search、Prev / Next、breadcrumb、versioning、scroll spy等の追加要求は本PRへ含めない。

## 8. 成果物

- 実装候補:
  - `scripts/spec/markdown.ts`
  - `scripts/spec/build-spec.ts`
  - `scripts/docs/build-docs.ts`
  - `e2e/web/smoke.spec.ts`
  - 必要な場合のみ `tests/contracts/docs-navigation.test.ts`
- 原則変更しない:
  - `docs/spec/README.md`
  - `docs/curriculum/test-automation/README.md`
- 付随ドキュメント:
  - 本Plan以外の設計ドキュメントは追加しない。

## 9. 備考

- 本Planは `plan/docs-navigation-redesign` 上で実装まで進める前提だが、このPlan作成・レビュー段階では実装しない。
- 優先順位は「見栄えをPlaywright風にすること」ではなく、Docs利用時のNavigation costを下げること。
- Desktopの基本構成:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Header / Brand                                                      │
├──────────────────┬────────────────────────────────┬─────────────────┤
│ Primary Nav      │ Article                        │ Contents        │
│                  │                                │                 │
│ - group / page   │ # Page title                   │ - Section A     │
│ - current page   │                                │   - Subsection  │
│ - page           │ 本文                           │ - Section B     │
│                  │                                │                 │
│ sticky           │ readable width                 │ sticky          │
└──────────────────┴────────────────────────────────┴─────────────────┘
```

- Narrow / Mobileの基本構成:

```text
┌─────────────────────────────┐
│ Header / Brand              │
├─────────────────────────────┤
│ Primary Navigation          │
│ Contents                    │
├─────────────────────────────┤
│ Article                     │
│ 本文                        │
└─────────────────────────────┘
```

- MobileでNavigation / Contentsを折りたたむ場合はnative HTMLを優先するが、折りたたみ自体を目的化しない。
