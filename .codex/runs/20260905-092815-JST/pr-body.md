## 概要

Issue #96の目的どおり、既存BreadcrumbのPresentationを共通化したPRです。最新`origin/main`を取り込んだ後も、Breadcrumb共通化とCatalog／商品詳細のmain側変更を維持しています。

## 変更内容

- Catalog一覧、商品詳細、Cart、注文詳細で既存の共通`Breadcrumbs` componentを利用するPresentationを維持しました。
- Typography（14px／400／22px）、spacing、separator、link／current表示、focus-visible、accessible semanticsを共通Presentation／CSSで維持しました。
- 最新main側のCatalog loading、previous result、search、filter、pagination、category fallback、および商品詳細側の変更を維持しました。
- `tests/contracts/codex-hook-contract.test.ts`、Hook implementation、Breadcrumbのnavigation情報は変更していません。

## Scope

以下は変更していません。

- Breadcrumb階層、item数、item順、label、href、current page
- Breadcrumb表示有無
- Route情報設計、Route生成ロジック
- Category階層追加
- Breadcrumb新設
- Navigation Architecture

## Validation

- `pnpm run format:check` — PASS
- `pnpm run lint` — PASS（0 errors／既存warning 65件）
- `pnpm run typecheck` — PASS（app／native-tests／training）
- `pnpm run test:component:web` — PASS（11 files／102 tests）
- `pnpm run test:a11y` — fresh serverでPASS（5/5）。既存サーバー実行のstale CSS結果は再実行で解消しました。
- `pnpm run test:e2e:chromium` — fresh server／prebuilt distでPASS（34/34）。
- `pnpm run test:contracts` — FAIL。`executes every common-policy representative from the Hook matrix`が既定の15秒timeoutで失敗（34 files、492 passed、3 skipped、308.56s）。Issue #96差分との因果はなく、timeout再延長やHook変更は行っていません。
- `pnpm run verify` — FAIL。品質検証、lint、typecheck、unit／integration／repository／componentは通過しましたが、`serve-web-dist.test.ts`のWindows Temp directory cleanupで`EPERM: Permission denied`（line 280）が発生しました。Issue #96差分との因果はなく、コード変更は行っていません。
- `git diff --check`／`git diff --cached --check` — PASS

## Accessibility / Responsive

- `aria-label="パンくず"`、`nav > ol > li`、link item、`aria-current="page"`を維持しました。
- 既存global `:focus-visible`によるKeyboard Focusを維持しました。
- desktopとcompact幅でBreadcrumbのlabel、link、current、Typography、spacing、focusを確認しました。
- 既存Breadcrumb linkの遷移先を維持しました。

## Issue

Closes #96
