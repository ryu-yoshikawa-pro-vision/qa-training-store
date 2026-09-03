# Issue #91 長い表示文字列のレイアウト崩れ対応計画

## 0. 依頼概要

- 依頼内容: Issue #91 の長い表示文字列による欠け、横方向のはみ出し、隣接UIとの重なりを修正し、実装・回帰テスト・検証・PR作成まで完了する。
- 背景: 学習Guide、Search結果、配送先Address Card、配送先削除Confirm Dialogで、仕様上許容される長さの文字列が既存のFlex/Gridの最小幅を押し広げている。
- 期待成果: 360px相当と既存Desktop幅の双方で、対象コンテンツが折り返され、Pageの不要なhorizontal overflowやActionとの重なりが発生しない。

## 1. ゴール / 完了条件

- ゴール:
  - 学習Guideの固定アカウント情報・説明・シナリオ詳細を欠けなく表示する。
  - Search Keyword 100文字付近でも検索結果見出し、件数、Sort UIを同時に読める状態にする。
  - 住所Fieldの最大長付近でもAddress Card内に内容を収める。
  - 長い配送先情報を含む削除Confirm Dialogで、タイトル・説明・Actionを操作可能なまま表示する。
- 完了条件（DoD）:
  - compact 360px相当とDesktop 1440px相当で対象4箇所を検証する。
  - `INPUT_LIMITS.searchKeyword`、住所Fieldの既存上限、Interaction仕様を変更しない。
  - 長文を隠す `overflow: hidden`、ellipsis、固定height増加を解決策として使用しない。
  - Issue #91の再現条件を直接保護する回帰テストを追加または更新する。
  - 必須Validation、最終diffレビュー、commit、push、OPEN PR作成を完了する。

## 2. 現状理解と前提

- Current understanding:
  - Guideは `src/presentation/pages/guide-page.tsx` の `.home-page` 配下に、hero内の固定アカウント `membership-panel`、注意書き `home-learning-panel`、シナリオ一覧の `form-stack` / `admin-detail-card` / `definition-grid` を描画する。
  - Guideの現在のCSSは `global.css` の `.home-hero` に `overflow: hidden` を持ち、hero内の固定アカウントPanelは `minmax(250px, ...)` を含む。360pxではシナリオカードがGrid itemの最小内容幅で親を押し広げ、929px付近では固定アカウントPanelのGrid列が `250px 16px` まで縮み、内容のscrollWidthが表示幅を超えることを確認した。
  - Searchは `src/presentation/pages/catalog-list-page.tsx` の `.catalog-page__header` に検索文字列をそのまま見出しへ表示する。100文字のASCII Keywordで、360px時はDocumentのscrollWidthが1724px、見出しのscrollWidthが1708pxとなり、929px時も見出しが1708px幅へ広がる。パンくずも長い末尾項目のためscrollWidthが792pxとなる。
  - Address Cardは `src/presentation/pages/addresses-page.tsx` の `.address-layout` → `.address-list` → `.address-card` で構成される。住所各Fieldを既存上限（label 50、宛名 100、都道府県 20、市区町村 100、番地 200、建物名 100）まで入力すると、現在はCardのGrid trackが4716pxまで拡大し、1280pxのPageが横にはみ出す。
  - Confirm Dialogは `src/presentation/components/confirm-dialog.tsx` の `.dialog-overlay` → `.dialog-modal` → `.dialog` で構成される。現在はモーダルの `min-width:auto` がGridの最小trackを決めるため、360pxでもモーダルが520px幅、viewport外へ配置され、タイトルのscrollWidthも679pxとなる。既存の600px未満向けAction縦積みはあるが、モーダル自体の縮小制約が不足している。
  - 4箇所は同一の長文Componentを共有していない。共有されるのは `global.css` のPresentation StyleとConfirmDialog本体であり、広範囲へ影響する汎用long-text utilityの新設は不要である。
  - `INPUT_LIMITS.searchKeyword` は100、住所の既存上限も `src/application/contracts/common.ts` に定義され、画面・Use Case・既存テストから参照されている。今回の原因はValidation上限ではない。
  - 既存E2Eは `e2e/web/ui-ux-improvements.spec.ts` がGuide、Account、Search周辺の実Runtime確認を担い、`e2e/web/fixtures.ts` の `scenario` / `login` が決定的なScenario初期化を提供する。既存のcomponent testにもSearch Keyword上限と住所Field上限の契約テストがある。
- Assumptions:
  - 既存のDesktop基準として1440x1000、compact基準として360x844をE2Eで明示する。
  - Searchの長い見出しとパンくずはSearchページだけへ適用する識別Classを追加し、他のCatalog／商品名表示へ影響を広げない。
  - Guideは既存HomePageの装飾用heroを変更せず、Guide固有の識別Classでheroの内容を隠さないようにする。
  - ConfirmDialogのbodyにPresentation用Classを追加することは、同じDialogの既存Interactionを変更しない直接共有Componentの局所修正である。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文、Repository規約、既存の画面構造とViewport基準で実装方針を決定できる。
- 仮定してよい細部:
  - 文字列の折返しは通常の日本語レイアウトを維持しつつ、連続ASCII文字列にも `overflow-wrap:anywhere` を適用する。
  - Flex/Grid itemの `min-width:0` と、必要な親の `min-width:0` を対象範囲内へ局所適用する。
  - 長文回帰のLayout判定は、表示要素の可視性、element内scrollWidth、viewport内Rect、Document横幅をPlaywrightで確認する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - 学習Guide: 固定アカウントPanel、Guide内の注意説明、シナリオ詳細Card。
  - Search: Search専用ページのパンくず、見出し、検索Form、結果Toolbar。
  - 配送先: Address CardのGrid item、Card見出し・住所本文・Action。
  - 配送先削除: ConfirmDialogのモーダル幅、bodyの折返し、Action領域。
- Files to inspect:
  - `src/presentation/pages/guide-page.tsx`
  - `src/presentation/pages/catalog-list-page.tsx`
  - `src/presentation/pages/addresses-page.tsx`
  - `src/presentation/components/confirm-dialog.tsx`
  - `src/presentation/styles/global.css`
  - `src/application/contracts/common.ts`
  - `tests/component/catalog-pages.test.tsx`
  - `tests/component/auth-account-pages.test.tsx`
  - `e2e/web/fixtures.ts`
  - `e2e/web/ui-ux-improvements.spec.ts`
  - `playwright.config.ts`

## 5. 変更方針

- Change strategy:
  - GuideのRootへGuide専用Classを追加し、heroの `overflow:hidden` をGuideに限って解除する。hero内のPanel、シナリオ `form-stack`、Card、Definition Gridのitemへ `min-width:0` を設定し、固定アカウントPanelの列を0起点で縮小できるようにする。長い表示値には `overflow-wrap:anywhere` を適用する。固定アカウントのメール値は明示的なspanで囲み、折返し対象を明確にする。
  - SearchのRootへSearch専用Classを追加し、見出しを含むFlex itemとパンくず末尾を縮小可能にする。見出し・パンくずへ `overflow-wrap:anywhere`、Form／Toolbarへ縮小と折返しを設定し、件数・Sort UIの隣接関係を維持する。
  - Address Cardとその直接のGrid子へ `min-width:0` を設定し、見出し・宛名・住所本文を `overflow-wrap:anywhere` でCard内へ収める。Cardの高さを固定せず、Actionは既存のwrap挙動を利用する。
  - ConfirmDialogのモーダルへ `min-width:0` / `max-width:100%` を設定し、Dialog bodyを明示的にwrap可能にする。既存のcompact Action縦積みを維持し、情報を隠すOverflow指定は追加しない。
  - 変更は既存Classの局所拡張と最小限のPresentation用Class追加に留め、新しい汎用utility／CSS framework／Interaction変更は行わない。
- 実行タスク:
  - [x] 1. Repository規約、Issue、現状コード、既存テスト、360px／Desktop付近の再現を確認する。
  - [x] 2. 本Planを `docs/plans/2026-09-03_091659_issue_91_long_text_layout.md` へ保存する。
  - [x] 3. Guide／Search／Address／Confirm Dialogの最小Presentation修正を実装する。
  - [x] 4. Issue #91の長文Layout E2E回帰テストを追加する。
  - [x] 5. Focused test、正式Validation、Viewport確認を実行し、失敗があれば原因を切り分けて安全な最小修正を行う。
  - [x] 6. 最終diffをReviewし、Run Artifactを更新・Sanitizeしてcommit、push、OPEN PR作成まで行う。

## 6. 検証方法

- Validation plan:
  - 変更後にFocused component test（既存のcatalog／auth-account）を実行する。
  - `e2e/web/ui-ux-improvements.spec.ts` のIssue #91専用テストをChromiumで実行し、360x844と1440x1000の双方でGuide／Search／Address Card／Delete Dialogの可視性、折返し、Rect、Document横幅を確認する。
  - `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、関連E2E、`git diff --check` を実行する。
  - 実行可能なら最後に `pnpm run verify` を実行し、最初の異常と派生エラーを分離して記録する。
  - 変更したSearch／住所上限が不変であることを既存契約テストとdiffで確認する。
- 成功判定:
  - 360px／1440pxの対象画面で `document.documentElement.scrollWidth <= window.innerWidth`、長文表示要素の内部scrollWidth超過なし、見出し／件数／Sort／ActionのRectがviewport内であること。
  - 長いCard／Dialogの全主要TextとActionがVisibleで、固定heightや情報隠蔽に依存しないこと。
  - 必須ValidationがPASSし、Scope外の変更がないこと。

## 7. リスクと未解決論点

- Risks:
  - `global.css` は複数のCascade層とResponsive Overrideを持つため、対象Classの追加位置と360px／Desktop双方の最終Computed Styleを確認する。
  - GuideのheroはHomePageとStyleを共有するため、Guide専用Classなしに共通ルールを変更すると装飾画像へ副作用が出る。Guide専用Selectorで限定する。
  - 住所最大長のE2E作成はデータをRuntimeへ保存するため、テスト内でScenarioを初期化して後続テストへの状態漏れを防ぐ。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `src/presentation/pages/guide-page.tsx`
  - `src/presentation/pages/catalog-list-page.tsx`
  - `src/presentation/components/confirm-dialog.tsx`
  - `src/presentation/styles/global.css`
  - `e2e/web/ui-ux-improvements.spec.ts`
- 付随ドキュメント:
  - 本Plan
  - `.codex/runs/20260903-083646-JST/` のTASKS／REPORT

## 9. 備考

- Issue #91のScope外である全画面long-text audit、Breadcrumb等の別Issue、Validation上限変更、デザイン刷新、無関係なSpacing整理は実施しない。
- 現時点で分割が必要な独立Issueは発見していない。4箇所は局所的なPresentation修正と共有ConfirmDialogの直接修正で対応可能と判断する。
