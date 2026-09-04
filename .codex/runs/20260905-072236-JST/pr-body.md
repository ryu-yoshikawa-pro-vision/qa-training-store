## 概要

Issue #96のBreadcrumb Presentation共通化を維持したまま、最新`origin/main`を取り込み、Catalogの機能変更とBreadcrumb競合を統合しました。

## 変更内容

- Catalog一覧、商品詳細、Cart、注文詳細で既存の共通`Breadcrumbs` componentを利用する状態を維持しました。
- Typography（14px／400／22px）、spacing、separator、link／current表示、accessible semanticsを共通Presentation／CSSで維持しました。
- Catalogの最新main側loading、previous result、search、filter、pagination、category fallbackを維持しました。
- Windowsでのcontracts実行時間に合わせ、`tests/contracts/codex-hook-contract.test.ts`の既存timeoutを2箇所だけ調整しました。product code、hook implementation、Breadcrumbのnavigation情報は変更していません。

## Scope

以下は変更していません。

- Breadcrumb階層、item数、item順、label、href、current page
- Breadcrumb表示有無
- Route情報設計、Route生成ロジック
- Category階層追加
- Breadcrumb新設
- Navigation Architecture

## Validation

conflict解消後に以下を再実行しました。

- `pnpm run format:check` — PASS
- `pnpm run lint` — PASS（0 errors／65 warnings）
- `pnpm run typecheck` — PASS（app／native-tests／training）
- `pnpm run test:component:web` — PASS（11 files／102 tests）
- `pnpm run test:a11y`（fresh server、8082） — PASS（5/5）
- `pnpm run test:e2e:chromium`（fresh server／prebuilt dist、8082） — PASS（34/34）
- `pnpm run test:contracts` — PASS（34 files／493 passed／3 skipped）
- `pnpm run verify` — PASS（build:web／build:specを含む）
- `git diff --check`／`git diff --cached --check` — PASS

## Accessibility / Responsive

- `aria-label="パンくず"`、`nav > ol > li`、link item、`aria-current="page"`を維持しました。
- 既存global `:focus-visible`によるKeyboard Focusを維持しました。
- desktopとcompact幅でBreadcrumbのlabel、link、current、Typography、spacing、focusを確認しました。
- 既存Breadcrumb linkの遷移先を維持しました。

## Issue

Closes #96
