# Specification / Curriculum Docs Navigation Redesign Plan

## 0. 依頼概要

- 依頼内容:
  - Production で公開している Specification と Test Automation Curriculum の閲覧体験を再設計する。
  - 特に、現在本文中に表示されているページ内 `Contents` をサイドへ配置し、Playwright Documentation のように「文書全体の移動」「本文閲覧」「ページ内移動」を同時に把握できる構成へ改善する。
  - 対象 URL は既存どおり `/docs/spec/**` と `/docs/curriculum/**` とし、公開パスは変更しない。
- 背景:
  - 現状の Docs は Markdown を静的 HTML 化して公開できているが、長いページを閲覧すると現在地・他ページ・ページ内見出しを行き来しづらい。
  - `scripts/spec/markdown.ts` の共通 CSS には `main` の2カラムと `.toc` の sticky 指定が存在する一方、`renderMarkdown()` が TOC と本文を一体で返し、Specification / Curriculum の page shell がそれを `<article>` 内へ入れているため、TOC が独立したサイド領域として機能していない。
  - Specification は `docs/spec/README.md` の `## Navigation` を基にした文書全体 navigation を header に横並び表示しているため、項目数が多いと一覧性が低い。
  - Curriculum は `docs/curriculum/test-automation/README.md` に学習順の正本があるが、生成ページには文書全体を移動する navigation がなく、各ページから次にどこへ移動できるか把握しづらい。
  - Production で実際に `/docs/spec/screen-catalog` と `/docs/curriculum/` を閲覧した際の使いづらさを解消することが本タスクの目的であり、単なる色・余白変更ではなく navigation の役割を整理する必要がある。
- 期待成果:
  - Desktop では、左に文書全体 navigation、中央に本文、右にページ内 `Contents` を持つ3領域構成とする。
  - Narrow / Mobile では3カラムを維持せず、navigation と Contents を折りたたみ可能な静的 UI に変換し、本文幅と操作性を優先する。
  - Specification と Curriculum で共通する Docs shell の考え方を揃えつつ、既存 Markdown / navigation source の正本は維持する。

## 1. ゴール / 完了条件

- ゴール:
  - Specification と Curriculum の双方で、利用者が常に次の3点を判断しやすい Docs UI にする。
    1. **Where am I?**: 現在閲覧している文書が分かる。
    2. **What else exists?**: 同じ Docs 内に何があり、どこへ移動できるか分かる。
    3. **What is on this page?**: 現在ページの見出し構成と目的の節への移動方法が分かる。
  - Playwright Documentation を外観としてコピーするのではなく、上記の information architecture と navigation の役割分担を参考にする。
- 完了条件（DoD）:
  - `/docs/spec/**` と `/docs/curriculum/**` の既存 URL が変更されず、既存リンクから引き続きアクセスできる。
  - Desktop 幅では、Docs page が次の3領域を持つ。
    - 左: document-wide navigation。
    - 中央: article。
    - 右: current page の `Contents`。
  - 左 navigation は sticky とし、長い本文をスクロールしても文書全体の移動先を確認できる。
  - 右 `Contents` は H2 / H3 を基にした既存 heading 情報を利用して sticky 表示し、本文とは独立した領域になる。
  - 現在ページは左 navigation で視覚的に識別でき、該当 link に `aria-current="page"` を設定する。
  - Specification の document-wide navigation は `docs/spec/README.md` の `## Navigation` を引き続き正本とし、別 navigation config を作らない。
  - Curriculum の document-wide navigation は `docs/curriculum/test-automation/README.md` の `## 全体構成` に記載された学習順・階層を正本とし、filesystem の alphabetical order を学習順として使用しない。
  - Narrow / Mobile では3カラムを1カラムへ落とし、document-wide navigation と Contents は `<details>` / `<summary>` 等の native HTML を用いて必要時だけ展開できる。専用 client-side drawer runtime は導入しない。
  - Narrow / Mobile で横スクロールを要求せず、本文・code block・table の既存表示契約を壊さない。
  - navigation / Contents に `<nav>` / `<aside>` / `aria-label` 等の semantic markup を付与し、keyboard 操作で link を利用できる。
  - 既存 Markdown renderer の heading / table / list / code / blockquote / link / image の出力契約を維持する。
  - Specification の画像、Curriculum の画像、相互リンク、GitHub source link への既存 resolver を変更しない。
  - `pnpm run build:spec` の `output/spec-site` 出力契約を維持する。
  - `pnpm run build:docs` / `pnpm run build:web` で `dist/docs/spec/**` / `dist/docs/curriculum/**` が正常生成される。
  - 既存 Storefront / SPA route / Web build / Native build へ影響を与えない。
  - 新しい Docs framework / Markdown parser / UI framework / runtime dependency を追加しない。
  - 指定 validation がすべて PASS し、Production artifact 相当を local serve した Docs smoke が PASS する。

## 2. 現状理解と前提

- Current understanding:
  - 計画作成時点の baseline は `main` commit `78c55b25bd39c91423001a3607236a98eaf76264`。
  - 作業ブランチは `plan/docs-navigation-redesign`。
  - Specification と Curriculum は既に同一 `dist/` へ静的 HTML として生成され、Production では次の root から公開されている。
    - Specification: `/docs/spec/`
    - Curriculum: `/docs/curriculum/`
  - `scripts/spec/markdown.ts` は Markdown parsing、heading id、TOC、本文 HTML、共通 CSS を担当している。
  - 現在の `renderMarkdown()` は `.toc` と本文を一つの HTML string として返すため、page shell 側で TOC と article を別 grid column に配置できない。
  - `MARKDOWN_CSS` には sticky `.toc` と responsive rule が既にあるため、まず DOM responsibility を分離し、既存 CSS を必要最小限で組み直す方が新しい仕組みを追加するより単純である。
  - `scripts/spec/build-spec.ts` は `docs/spec/README.md` の Navigation を読み取り、Specification 固有 navigation / page shell / label を生成している。
  - `scripts/docs/build-docs.ts` は Curriculum Markdown をすべて生成するが、Curriculum 固有の document-wide navigation は現在生成していない。
  - `docs/curriculum/test-automation/README.md` の `## 全体構成` が Curriculum の入口・学習順の正本であり、その順序を別データへ複製しないことが既存契約である。
  - `e2e/web/smoke.spec.ts` には Specification / Curriculum の公開 Docs smoke が既に存在するため、別 E2E framework / 専用 workflow を増やさずここを拡張する。
- Assumptions:
  - Desktop の基準は十分な横幅がある環境とし、左 navigation / article / 右 Contents を同時表示する。
  - Desktop では記事本文を無制限に横へ広げず、読みやすい本文幅を維持し、余剰幅を navigation に割り当てる。
  - `Contents` は current page の H2 / H3 を表示対象とする。H1 は page title なので Contents へ重複表示しない。
  - H2 / H3 が存在しない、または Contents として有用な項目がないページでは、空の右 sidebar を無理に表示しない。
  - Specification と Curriculum の brand / label は現在の文脈を維持し、今回の範囲で文書本文や用語を大規模編集しない。
  - Playwright Documentation は情報設計の参考とし、CSS・branding・DOM を複製しない。
- Non-goals:
  - Docusaurus / VitePress / MkDocs / Nextra 等の Docs framework 導入。
  - Expo Router の `web.output` 変更。
  - Markdown / 画像正本の移動・複製。
  - Docs 専用 SPA / React hydration / client-side router の追加。
  - 検索機能、全文検索 index、command palette の追加。
  - Prev / Next navigation の追加。
  - breadcrumb の追加。
  - version switcher の追加。
  - theme switcher / dark mode の追加。
  - content 本文の再執筆・教材順の変更。
  - Specification / Curriculum 以外の `docs/**` の Web 公開範囲拡張。
  - Docs 専用 CI workflow の新設。
  - Production domain / Cloudflare deploy architecture の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - なし。今回の目的は「現在の使いづらい Docs を、Playwright Documentation のように side navigation / side Contents を持つ構造へ改善する」と十分に限定できる。
- 仮定してよい細部:
  - 左 / 右 sidebar の厳密な px 値、border、font-size、spacing、breakpoint は、既存 `MARKDOWN_CSS` と現在の Scenario Shop Docs tone を維持しながら、実装時に desktop / tablet / mobile の screenshot と実操作で最小調整する。
  - `Contents` の label は既存どおり `Contents` を維持する。
  - Narrow / Mobile での document navigation / Contents は JavaScript を使わず、native `<details>` を第一候補とする。
- 未回答の重要質問:
  - なし。実装途中で Curriculum `## 全体構成` の抽出に広範な Markdown parser 改修が必要と判明した場合のみ、Section 7 の Stop condition に従って再判断する。

## 4. 影響範囲

- Impacted areas:
  - Shared Markdown rendering / TOC rendering。
  - Shared Docs layout CSS。
  - Specification page shell / document-wide navigation。
  - Curriculum page shell / document-wide navigation extraction。
  - Docs smoke / generated HTML contract validation。
- Files to inspect:
  - `scripts/spec/markdown.ts`
    - Markdown body と TOC の責務分離。
    - shared Docs layout CSS。
  - `scripts/spec/build-spec.ts`
    - `docs/spec/README.md` Navigation の左 sidebar 化。
    - current page 判定 / `aria-current`。
    - page shell の3領域化。
  - `scripts/docs/build-docs.ts`
    - Curriculum `README.md` の `## 全体構成` から document navigation を生成する最小ロジック。
    - page shell の3領域化。
    - current page 判定 / `aria-current`。
  - `docs/spec/README.md`
    - Navigation SSOT の現行構造確認のみ。原則として内容変更しない。
  - `docs/curriculum/test-automation/README.md`
    - `## 全体構成` の現行構造を navigation source として利用できるか確認。原則として学習内容・順序を変更しない。
  - `e2e/web/smoke.spec.ts`
    - Desktop / narrow Docs navigation smoke の追加。
  - 既存 test suite の中で Markdown / docs build に最も近い test file。
    - 実装開始時に最新 `main` で配置を確認し、既存 test に自然に追加できる場合はそこへ追加する。
    - 適切な既存 test がない場合に限り、`tests/contracts/docs-navigation.test.ts` 等の単一 focused test file を追加する。

## 5. 変更方針

- Change strategy:
  - **先に HTML responsibility を正す。** CSS だけで現行 DOM を無理に sidebar 化しない。
  - **Navigation source は既存 README を維持する。** Specification / Curriculum のために別 JSON / TS 定数へ項目を複製しない。
  - **共有するのは shell に必要な最小概念だけ。** Specification と Curriculum の builder を大規模な共通 framework へ統合しない。
  - **静的 HTML のまま実現する。** Sidebar のために client-side state management や dependency を追加しない。
  - **Desktop と Mobile を別レイアウトとして設計する。** 3カラムを狭い画面へ縮める実装は行わない。
- 実行タスク:
  - [ ] 1. 実装開始時に最新 `main` を取り込み、`scripts/spec/markdown.ts`、`scripts/spec/build-spec.ts`、`scripts/docs/build-docs.ts`、対象 README、既存 smoke / contract test を再確認する。
  - [ ] 2. `renderMarkdown()` の現在の出力責務を分離し、少なくとも current page の **article body HTML** と **Contents HTML** を page shell 側から別領域へ配置できる API にする。
    - 第一候補は `renderMarkdownParts()` のような小さな返却型 `{ contentHtml, tocHtml }` とする。
    - 既存 parser / heading id / link resolver / image resolver は再実装しない。
    - 既存 `renderMarkdown()` を他用途が利用している場合は、必要最小限の backward-compatible wrapper を維持するか、全 call site を明示的に更新する。
  - [ ] 3. Shared CSS を3領域 Docs layout に整理する。
    - Desktop: `document navigation | article | Contents`。
    - article は `min-width: 0` を持ち、table / pre によって grid 全体が横へ押し出されないようにする。
    - 左 / 右 sidebar は viewport 内で sticky にする。ただし header と重ならない top offset を使用する。
    - sidebar 自体が viewport より長い場合は内部 scroll を許可し、page 本文を読めなくする固定 height は使用しない。
    - article の line length を読みやすい範囲へ抑え、wide monitor で本文だけが過度に横長にならないようにする。
  - [ ] 4. Specification page shell を再構成する。
    - `docs/spec/README.md` の既存 `## Navigation` を左 navigation として描画する。
    - 現在の横並び header navigation は廃止し、header は brand / page context を示す最小構成にする。
    - current Specification path と navigation target を比較し、現在ページ link に `aria-current="page"` と current-state class を付ける。
    - README root 自体も現在地を正しく表現できるようにする。
    - 右 Contents は current Markdown の H2 / H3 から生成した `tocHtml` を article の sibling `<aside>` として配置する。
  - [ ] 5. Curriculum document-wide navigation の source contract を固定する。
    - `docs/curriculum/test-automation/README.md` の `## 全体構成` セクションだけを対象に、現在記載されている学習順と階層を抽出する。
    - Required / Optional / Reference の区分と表示順を壊さない。
    - filesystem walk の順序から navigation を再構築しない。
    - README 内の通常 link resolver と同じ path resolution 契約を利用し、存在しない target は build error とする。
    - navigation 用の別手書き配列 / JSON / YAML は作成しない。
  - [ ] 6. Curriculum page shell を Specification と同じ役割分担へ再構成する。
    - 左: Curriculum 全体 navigation。
    - 中央: article。
    - 右: current page Contents。
    - current page link へ `aria-current="page"` を付ける。
    - Curriculum → Specification 等の既存本文 link resolver は変更しない。
  - [ ] 7. Semantic / accessibility contract を固定する。
    - document-wide navigation は `<nav aria-label="Specification navigation">` / `<nav aria-label="Curriculum navigation">` 等で識別できるようにする。
    - page-local Contents は `<aside aria-label="Contents">` 内に置くか、同等に役割を識別できる構造にする。
    - article は `<article>` として維持する。
    - active state を色だけに依存させず、`aria-current="page"` を source of truth にする。
    - keyboard focus indicator を消さない。
  - [ ] 8. Narrow / Mobile responsive behavior を実装する。
    - Desktop 3領域を1カラムへ切り替える。
    - document navigation と Contents を常時長大表示せず、native `<details>` で展開可能にする。
    - JavaScript toggle / drawer / overlay focus management は導入しない。
    - H1 / body / code / table / image が viewport 外へ layout overflow しないことを確認する。
  - [ ] 9. Focused contract test を追加または更新する。
    - Markdown body と TOC が独立して生成されること。
    - Spec navigation source が既存 Navigation を使用すること。
    - Curriculum navigation が `## 全体構成` の順序を維持すること。
    - current page に `aria-current="page"` が一意に付くこと。
    - broken curriculum navigation target が build failure になること。
    - root page / nested page の双方を対象にする。
  - [ ] 10. `e2e/web/smoke.spec.ts` の published docs smoke を拡張する。
    - Desktop Specification (`/docs/spec/screen-catalog` または `.html` 正規出力) で左 navigation / article / right Contents が確認できる。
    - Contents 内 link を押すと対象 heading anchor へ遷移できる。
    - current page が左 navigation で `aria-current="page"` になる。
    - Desktop Curriculum root と nested lesson で左 navigation が表示され、nested lesson の current state が切り替わる。
    - Narrow viewport で document navigation / Contents が折りたたみ UI になり、開いて link 操作できる。
    - 既存 Spec image / Curriculum link / Curriculum → Spec navigation smoke は維持する。
  - [ ] 11. Generated artifact を直接確認する。
    - `output/spec-site/**`。
    - `dist/docs/spec/**`。
    - `dist/docs/curriculum/**`。
    - static server 経由で directory index と `.html` route の双方を確認する。
  - [ ] 12. 最終 diff を確認し、Docs UX 以外へ scope が広がっていないことを確認する。

## 6. 検証方法

- Validation plan:
  1. Static / format:
     - `pnpm run format:check`
     - `pnpm run lint:markdown`
     - `pnpm run lint`
     - `pnpm run typecheck`
  2. Focused test:
     - Docs navigation / Markdown renderer に追加した focused test。
     - `pnpm run test:contracts`
  3. Build contract:
     - `pnpm run build:spec`
     - `pnpm run build:docs`
     - `pnpm run build:web`
  4. Existing validators:
     - `pnpm run validate:curriculum`
     - Specification validation が `package.json` に既存 command として存在する場合はその command も実行する。新しい重複 validator は追加しない。
  5. Browser smoke:
     - 既存 static server / Playwright config を使い `e2e/web/smoke.spec.ts` の published Docs smoke を実行する。
     - Desktop viewport で Specification / Curriculum を確認する。
     - Narrow / Mobile viewport で responsive navigation を確認する。
  6. Regression:
     - `pnpm run verify`
     - Docs 以外の Storefront smoke が引き続き PASS することを確認する。
- 成功判定:
  - すべての required validation が PASS する。
  - Desktop で左右 sidebar が article の sibling として実際に別 column に配置され、`Contents` が本文先頭へ埋め込まれない。
  - 長い Specification page をスクロールしても document navigation と Contents を利用できる。
  - Curriculum の nested lesson から全体構成を確認・移動できる。
  - active page が `aria-current="page"` で一意に識別できる。
  - Narrow / Mobile で sidebar が本文幅を圧迫せず、navigation を keyboard / touch で展開できる。
  - Markdown content、画像、内部 link、外部 link、Spec ↔ Curriculum link が既存どおり機能する。
  - Production path / build pipeline / dependency set に変更がない。

## 7. リスクと未解決論点

- Risks:
  - `renderMarkdown()` の責務分離時に、Specification と Curriculum の link / image resolver の受け渡しを漏らすと、見た目は改善しても既存文書 link / image が壊れる。
  - Specification Navigation と Curriculum 全体構成では source Markdown の形が異なるため、無理に同一 parser contract へ抽象化すると複雑化する。共有は最終 navigation model / rendering の必要最小限に留める。
  - Curriculum README の `## 全体構成` を一般 purpose Markdown AST へ作り替えると、本タスクに対して過剰設計になる。
  - 3カラムの列幅を固定しすぎると tablet 付近で本文が狭くなり、現在より使いづらくなる。
  - sticky sidebar に高さ制御がないと、navigation 項目が viewport より長い場合に末尾へ到達できない。
  - page-local Contents の current-section scroll spy まで導入すると client JavaScript が必要になり scope が広がるため、今回は current section highlight を要件にしない。
- Open questions:
  - 実装時に visual tuning は必要だが、情報構造の再判断を必要とする未解決事項は現時点でない。
- Stop conditions:
  - Curriculum `## 全体構成` を現在の source から安定して抽出するために、汎用 Markdown parser の全面置換・大規模 AST 実装が必要と判明した場合は実装を止める。その場合のみ「小さな navigation metadata を正本として明示する」案を再検討し、勝手に duplicate SSOT を追加しない。
  - shared Markdown renderer の変更により既存 Specification / Curriculum の link、image、heading id、table、code block の互換性が保てない場合は layout 実装を先へ進めず、既存 output contract の維持を優先する。
  - Playwright Documentation の外観再現のために新しい framework / runtime dependency / client-side application 化が必要になった場合は、その案を採用しない。
  - Search、Prev / Next、breadcrumb、versioning 等の追加要望が実装中に派生しても本PRへ含めず、必要なら別 Issue / Plan とする。

## 8. 成果物

- 変更ファイル:
  - 必須候補:
    - `scripts/spec/markdown.ts`
    - `scripts/spec/build-spec.ts`
    - `scripts/docs/build-docs.ts`
    - `e2e/web/smoke.spec.ts`
  - test は既存の最適な file を優先し、存在しない場合のみ focused file を1つ追加する。
  - `docs/spec/README.md` / `docs/curriculum/test-automation/README.md` は navigation SSOT として読み取ることを優先し、構造を機械可読にするためだけの不要な本文書き換えは行わない。
- 付随ドキュメント:
  - 本 Plan 以外の設計ドキュメントは原則追加しない。
  - 実装時の検証 evidence は既存 repository convention に従って記録する。

## 9. 備考

- 本 Plan は `plan/docs-navigation-redesign` 上で実装まで進めることを前提とするが、この Plan 作成タスクでは実装を行わない。
- 今回の優先順位は「見栄えをPlaywright風にすること」ではなく、Docs利用時の navigation cost を下げることである。
- Desktop の基本設計は次とする。

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Header / Brand                                                      │
├──────────────────┬────────────────────────────────┬─────────────────┤
│ Document nav     │ Article                        │ Contents        │
│                  │                                │                 │
│ - section        │ # Page title                   │ - Section A     │
│ - current page   │                                │   - Subsection  │
│ - section        │本文                            │ - Section B     │
│                  │                                │                 │
│ sticky           │ readable width                 │ sticky          │
└──────────────────┴────────────────────────────────┴─────────────────┘
```

- Narrow / Mobile の基本設計は次とする。

```text
┌─────────────────────────────┐
│ Header / Brand              │
├─────────────────────────────┤
│ ▸ Documentation navigation  │
│ ▸ Contents                  │
├─────────────────────────────┤
│ Article                     │
│                             │
│ 本文                        │
└─────────────────────────────┘
```

- active section の scroll spy、sidebar resize、drawer animation 等はなくても本タスクの目的を達成できるため実装しない。
