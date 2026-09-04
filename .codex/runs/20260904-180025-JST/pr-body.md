## 概要

Issue #93 に対応し、商品詳細のRating LinkからReview SectionへのAnchor Navigationを、初回Mouse／Keyboard操作とdirect `#reviews`で成立させます。

## 再現結果

- Browser: Playwright Chromium（Playwright `1.62.0`）
- Viewport: Desktop `1440x1000`、補助確認 Mobile `390x844`
- 起動条件: `pnpm run build:web`後、既存の`serve-web-dist.ts`で配信するproduction相当の静的Web
- Mouse: `/products`から商品詳細へclient navigationしたfresh pageで、Rating Linkの1回目はURLだけ`#reviews`へ変わり`scrollY=0`、Review Sectionはviewport外。記録後の2回目でReview Sectionへ移動
- Keyboard: Mouseとは独立したfresh pageでRating LinkへfocusしてEnterを1回だけ押した場合も同じ結果
- Direct `#reviews`: `/products/product-basic-shirt#reviews`ではfragmentは保持されるが、非同期render後もtargetがviewport外に残った
- URL fragment: いずれも`/products/product-basic-shirt#reviews`
- Sticky Header: 修正前はnative scroll後にReview headingがHeader下へ隠れた。修正後はheadingがHeader下に表示される
- 再現した現象: client navigation後の初回Mouse／Keyboard操作とdirect deep linkで、URL更新とReview Sectionへのviewport移動が分離していた

## Root Cause

商品詳細のProduct dataは`useAsyncValue`で非同期に読み込まれます。さらにExpo Router webのhash-only client navigationはpath（hashを除く）が既存navigation stateと一致するとroute stateをresetするため、初回操作時にProduct Detailと`#reviews` targetが一度unmountされます。その結果、browserがfragmentを解決する時点でtargetが存在せず、URLだけが更新されました。Runtime traceで、初回`popstate`／`hashchange`時にtargetが存在しない状態を確認し、2回目にmount済みtargetへ移動することを確認しました。

Direct deep linkでも、browserの初期fragment処理より後に非同期targetが生成されるため、render後の位置復元が必要でした。別の表示問題として、native scrollのtarget整列位置ではSticky HeaderがReview headingを覆っていました。

## 対応内容

- Product Detail mount後、現在のURLが`#reviews`の場合だけ既存`#reviews` targetへfocusし、target生成後のbrowser標準の到達を復元
- DesktopのReview SectionにSticky Headerとの重なりを避ける`scroll-margin-top: 112px`を設定。MobileではHeaderがstickyではないため追加offsetは設定しない
- Ratingのplain `<a href="#reviews">`、`id="reviews"`、`tabIndex={-1}`、URL fragment、Keyboard semanticsは維持
- `scrollIntoView()`、Rating専用click handler、`preventDefault()`、timeout、hash書換え、retry、polling、dependency変更は追加していません

## Regression Test

`e2e/web/phase1-required.spec.ts`へ次の観測型Playwright Chromium E2Eを追加しました。

- 商品一覧から商品詳細へ遷移後、初回Mouse clickでReviewへ移動すること
- 同じfresh条件で初回Keyboard EnterでReviewへ移動すること
- `/products/product-basic-shirt#reviews`のdirect navigationでReviewが初期表示されること

各テストでURL fragmentとtarget viewportを確認し、DesktopではReview headingがSticky Headerに隠れないことも確認します。修正前は3件ともtarget viewport判定で失敗し、修正後は3件とも成功しました。

## Validation

- `pnpm exec vitest run tests/component/catalog-pages.test.tsx` — PASS（11 tests）
- `pnpm run format:check` — PASS
- `pnpm run lint` — PASS（error 0、既存warning 65）
- `pnpm run typecheck` — PASS
- `pnpm run test:component:web` — PASS（95 tests）
- `pnpm run test:e2e:chromium` — PASS（33 tests）
- `pnpm run test:a11y` — PASS（4 tests）
- `pnpm run verify` — PASS
- `git diff --check` — PASS
- Gray-box QA contract／Snapshot comparison — PASS（additional Source diff 0）

## Scope / Non-goals

- Review機能本体、Rating表示形式、商品詳細全体のlayout redesignは変更していません
- Gallery、Variation、Cart、Router全体、共通scroll frameworkは変更していません
- dependency／lockfileは変更していません

## Issue

Closes #93
