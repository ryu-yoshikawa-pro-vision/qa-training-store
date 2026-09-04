# Issue #94: Admin Side Navigationの正式名称overflow解消計画

## 0. 依頼概要

- 依頼内容: Admin Side Navigation内の`Scenario Shop Admin`が欠けず、はみ出さず、他要素と重ならないようにする。
- 背景: Issue #94で1024px以上の管理画面における正式Admin Labelのoverflowが報告されている。
- 期待成果: 既存のNavigation幅とAdmin Shellの構造を維持したまま、Label側の折り返し・縮小制約を解消する。

## 1. ゴール / 完了条件

- ゴール: `Scenario Shop Admin`の表示文字列を変更せず、既存の248px幅契約を変更せず、Label側の最小限のCSS調整で収まりを確保する。
- 完了条件（DoD）:
  - 1024pxと1280px以上の管理画面で正式名称全体が表示される。
  - Labelの描画領域がSide Navigation外へはみ出さず、意図しないclipやellipsisがない。
  - 他のNavigation項目、IconとLabelの配置、Admin ShellのMain領域、既存操作に回帰がない。
  - 対象コンポーネントの自然なComponent testまたは既存のUI testを最小限更新する。
  - Format、Lint、Typecheck、関連Test、Build、必要なBrowser確認が成功する。
  - self-review後にcommit、指定branchへのpush、Issue #94を閉じるOPEN PRの作成とURL確認まで完了する。

## 2. 現状理解と前提

- Current understanding:
  - `src/presentation/shells/admin-shell.tsx`の`.admin-wordmark`が`content.brand.adminName`を表示している。
  - 正式名称の正本は`src/presentation/content/dictionary.ts`の`content.brand.adminName`で、値は`Scenario Shop Admin`である。
  - `src/presentation/styles/global.css`の共通`.wordmark, .admin-wordmark`に`white-space: nowrap`がある。
  - 後段の`.admin-wordmark > span:last-child`は`display: grid`と`line-height`だけを定義し、`min-width`と折り返し指定がない。
  - CSSには初期定義の`248px`に加えて、後段のデザイン定義で`256px`、1024〜1100pxのmedia queryで`232px`を指定する既存宣言がある。本Runでは幅の宣言を変更しない。
  - 既存のAdminShell配置テストは`tests/component/logout-button.test.tsx`にあり、既存のUI回帰・画面overflow検証はPlaywrightへ集約されている。
- Assumptions:
  - 問題の直接原因はwordmark内Label wrapperが親のflex領域を縮められず、nowrapの継承で折り返せないこととする。実装前後のBrowser計測で検証する。
  - `overflow-wrap: anywhere`、`white-space: normal`、`min-width: 0`のうち、実測に必要な最小セットだけを対象Labelへ適用する。
  - CSS 1箇所の局所修正のため、新規テスト基盤は導入しない。
- Non-goals:
  - 表示名称の変更・略称化・ellipsis・文字列切り捨て。
  - Side Navigation幅Token、Admin Shell grid、Main Content領域の変更。
  - Navigation構造、共通デザインシステム全体、無関係なCSSの整理。
  - IssueにないResponsive設計や1024px未満の管理操作対応。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文、ユーザー指示、既存コードで目的・制約・完了条件が定義されている。
- 仮定してよい細部: 対象Label wrapperの既存セレクタへ局所CSSを追加し、既存コンポーネント構造を維持する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Admin ShellのWordmark/Label表示CSS。
  - Admin Shellの既存Component testまたは既存Playwright specのLabel回帰assertion。
  - 変更前後の1024px/1280px Browser visual/layout確認。
- Files to inspect:
  - `src/presentation/shells/admin-shell.tsx`
  - `src/presentation/content/dictionary.ts`
  - `src/presentation/styles/global.css`
  - `tests/component/logout-button.test.tsx`
  - `e2e/web/phase1-required.spec.ts`
  - `e2e/web/ui-review.spec.ts`
  - `playwright.config.ts`
  - `package.json`

## 5. 変更方針

- Change strategy:
  1. 変更前のBrowserで1024px/1280pxのLabel・sidebar・document幅とcomputed styleを採取し、原因を確定する。
  2. `.admin-wordmark > span:last-child`の対象Labelだけに、親flex内で縮小でき、正式名称を自然に折り返せる最小CSSを追加する。幅定義や文字列は変更しない。
  3. 既存Component testで正式名称とNavigation項目が維持されることを確認し、必要な場合だけ既存Playwright specへ1024px/1280pxのgeometry assertionを追加する。
  4. targeted test、format/lint/typecheck/build、関連Playwrightを順に実行する。失敗時は最初の異常を分類し、原因に対する最小修正後に関連ゲートを再実行する。
  5. Issue本文を再読してself-reviewし、diff/statusを確認してcommit・push・PR作成まで完了する。
- 実行タスク:
  - [ ] 1. Repo mappingと変更前Browser再現を完了し、原因を確定する。
  - [ ] 2. 計画を保存し、Label側の最小修正を実装する。
  - [ ] 3. 必要最小限のComponent/UI回帰テストを追加または更新する。
  - [ ] 4. targeted test、静的検証、Build、Browser確認を実行する。
  - [ ] 5. Issue再読・self-review・diff確認を行う。
  - [ ] 6. commit、push、OPEN PR作成とURL確認を行う。

## 6. 検証方法

- Validation plan:
  - `pnpm exec vitest run tests/component/logout-button.test.tsx`（既存AdminShell Component test）。
  - `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`。
  - `pnpm run build:web`。
  - `pnpm exec playwright test e2e/web/phase1-required.spec.ts --project=chromium`（変更影響を含む既存E2E）。
  - 必要に応じて`UI_REVIEW_STAGE=<unique-stage> UI_REVIEW_ROUTES=admin`で既存UI ReviewのAdmin代表画面を実行し、スクリーンショットを目視確認する。
  - `git diff --check`、`git diff`、`git status --short`。
- 成功判定:
  - 1024px/1280pxで`.admin-wordmark`内のLabel textが完全一致し、Labelのrightがsidebar right以下、LabelのscrollWidthがclientWidthを超えず、documentのhorizontal overflowがない。
  - Shellのgrid幅宣言を変更していない。
  - 既存Nav linkの件数・名称・44px以上の操作領域が維持され、Admin MainとNav操作が正常である。

## 7. リスクと未解決論点

- Risks:
  - `white-space`を対象Labelへ上書きしない場合、`overflow-wrap`だけではnowrapが優先される可能性がある。computed styleと実測で確認する。
  - `min-width: 0`をwordmark全体へ広げるとStorefront wordmarkへ影響する可能性があるため、Adminの内側Label wrapperへ限定する。
  - 既存CSSの幅上書き（256px/232px）は本Issueのスコープ外であり、差分へ混ぜない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: 原因確定後、Admin Label CSSと必要最小限の既存testのみ。
- 付随ドキュメント: 本計画書、`.codex/runs/20260904-095150-JST/`のRun Artifact。

## 9. 備考

- Issue: [Issue #94](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/94)
- 作業branch: `fix/issue-94-admin-sidebar-label-overflow`（branchの作成・切り替えは行わない）。
