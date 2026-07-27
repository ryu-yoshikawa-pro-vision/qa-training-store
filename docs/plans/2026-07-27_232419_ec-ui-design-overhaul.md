# QA学習用ECアプリ UI・デザイン全面改善 計画

## 0. 依頼概要

- 依頼内容: `docs/plans/2026-07-27_2144/`の参考画像6枚から共通デザイン体系を抽出し、Storefront、customer向け画面、管理画面の全UIへ適用する。
- 背景: 現在の機能・Route・Seed・権限・業務ロジックを維持したまま、参考画像と同じ思想の上質で統一されたEC体験へ引き上げる必要がある。
- 期待成果: 共通Design System、全画面の情報設計・視覚階層・Responsive・Accessibility改善、改修前後Screenshot、最低3回のVisual Review、既存Regression Test完走。

## 1. ゴール / 完了条件

- ゴール: 暖色系の明るい面、Dark Navy、控えめなGold、広い余白、商品画像中心のStorefront、濃色Sidebarと高可読な管理Contentを、一貫したComponentとCSSで全Routeへ実装する。
- 完了条件（DoD）:
  - ユーザー指定のDesign System、Storefront、Admin、Responsive、Accessibility、Regression、Visual Reviewの全Checklistを満たす。
  - Desktop 1440×1000、Tablet 1024×900、Mobile 390×844の同一条件でBefore／Afterを保存する。
  - 初回実装、Visual Review後修正、最終Visual Review後仕上げの最低3反復をRun Reportへ具体的に記録する。
  - 重大な視覚差分と既存機能の欠落がなく、必須検証を実行結果どおりに報告する。

## 2. 現状理解と前提

- Current understanding:
  - `app/`はRoute wrapperで、実画面は`src/presentation/pages/`へ集約されている。
  - 全Routeは`AppFrame`から`StorefrontShell`または`AdminShell`へ分岐し、権限制御は`RouteGuard`が担う。
  - 共通部品として`Button`、`ProductCard`、`ProductImage`、`StatePanel`、`StatusBadge`、`SearchCombobox`、`ConfirmDialog`、`FormErrorSummary`、Admin pattern群が存在する。
  - 見た目の正本は主に`src/presentation/styles/global.css`で、意味tokenは`src/presentation/design/tokens.ts`にある。
  - Product imageはlocal assetと生成済みmanifestを使用し、外部Runtime画像は不要である。
  - Playwright fixtureはScenario reset、Login、配送先作成、Checkout完了、Admin mobile境界を再現できる。
  - 参考画像6枚は、配色にBlue／Goldの差はあるが、明るい余白、濃色の骨格、大きな商品画像、抑えた影、明瞭な階層、Desktop Admin sidebarという構造が共通する。
- Assumptions:
  - 画像間のBlue／Gold差は、Primary Dark `#0F172A`、Accent Gold `#C6A15B`、Soft Background `#F7F6F2`へ統合する。
  - 既存のadmin 1024px未満閲覧警告は権限・操作境界として維持し、見た目だけ改善する。
  - Noto Sans JP／Interは外部Runtime取得を避け、利用可能時に優先しOS fontへ安全にfallbackする。
  - 画面固有Hardcodeを増やさず、既存class、shell、primitive、admin patternの強化を優先する。
- Non-goals:
  - Domain/Application/Infrastructure、価格・Cart・Payment・Inventory・Order・Reviewの業務ロジック変更。
  - Route、Database、Seed、Test Clock、Test Control、権限境界、Phase 1機能の変更。
  - 新規UI Framework、大規模状態管理、外部Runtime image、Dark Mode、Native Phase 2、Cloudflare Deploy。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。目的、優先順位、対象画面、Viewport、禁止事項、検証、完了条件が明示されている。
- 仮定してよい細部: Component分割の粒度、参考画像間の細かな色差、Visual Reviewでの修正優先順位。
- 未回答の重要質問: なし。途中確認を求めず完了する指示に従い、安全側の局所判断をRunへ記録する。

## 4. 影響範囲

- Impacted areas:
  - Design token、global CSS、Storefront/Admin shell
  - 共通Button、Product Card/Image、State、Status、Search、Dialog、Form error、Admin pattern
  - Home、Catalog、Product detail、Cart
  - Checkout全状態、Auth、Profile、Address、Orders、Review、Legal／Forbidden／Not Found
  - Admin Overview、Products、Categories、Brands、Inventories、Orders、Reviews、Users、Test Control
  - Visual capture用Playwright test/configと必要なComponent/E2E assertion
- Files to inspect:
  - `src/presentation/design/tokens.ts`
  - `src/presentation/styles/global.css`
  - `src/presentation/shells/*.tsx`
  - `src/presentation/components/*.tsx`
  - `src/presentation/patterns/admin-patterns.tsx`
  - `src/presentation/pages/*.tsx`
  - `e2e/web/fixtures.ts`
  - `e2e/web/*.spec.ts`
  - `tests/component/*.test.tsx`
  - `playwright.config.ts`
  - `assets/`、`public/images/`、`src/generated/product-image-manifest.ts`

## 5. 変更方針

- Change strategy:
  1. 同一Scenario・Route・Viewportを再現するVisual capture基盤を用意し、改修前Screenshotを保存する。
  2. 色、Typography、Spacing、Radius、Shadow、Focus、control heightをtoken／global foundationで統一する。
  3. Storefront Header／Footer／Mobile navigationとAdmin sidebar／content shellを先に整え、全画面の外枠を固定する。
  4. 既存primitiveとpatternを強化し、Button、Form、Card、Status、State、Table、Page headerを横断統一する。
  5. StorefrontのHome、Catalog、Detail、Cartを商品画像と購入判断中心の構成へ整える。
  6. Checkout、Auth、Account、Orders、Review、状態画面をForm幅、Step、Summary、状態説明中心に整える。
  7. Admin全画面を共通Page header、Filter、Table、Status、Pagination、Empty／Loading／Error patternへ揃える。
  8. 初回After Screenshotを比較し、密度・余白・Typography・CTA・画像比率・Sidebarの重大差分を修正する。
  9. 2回目でDesktop／Tablet／Mobileの崩れと画面間不統一を修正する。
  10. 3回目でAlignment、Contrast、Footer、Focus、Touch target、残存Blue、Border／Shadowを仕上げる。重大差分があれば最大5反復まで続ける。
  11. Accessibility、Responsive、Component、E2E、Buildを実行し、失敗時はbounded repair loopで修正する。
- 実行タスク:
  - [ ] 改修前Screenshotを取得し、参考画像との差を記録する。
  - [ ] Token、global foundation、shell、共通Componentを実装する。
  - [ ] Storefront全画面を改善する。
  - [ ] customer flow全画面を改善する。
  - [ ] Admin全画面を改善する。
  - [ ] 最低3回のVisual Reviewと修正を行う。
  - [ ] Accessibility／Responsive／Regressionを完走する。
  - [ ] Run Artifactと最終報告を完成する。

## 6. 検証方法

- Validation plan:
  - 依存: `pnpm install --frozen-lockfile`
  - Format: `pnpm run format`、`pnpm run format:check`
  - Static: `pnpm run lint`、`pnpm run typecheck`
  - Test: `pnpm run test:unit`、`test:integration`、`test:repository`、`test:component`、`test:contracts`
  - Build: `pnpm run build:web`
  - Required E2E: `pnpm run test:e2e:chromium`、`test:a11y`、`test:e2e:mobile-boundary`
  - Additional E2E: `test:e2e:mobile`、`test:e2e:cross-role`、`test:e2e:smoke:firefox`、`test:e2e:smoke:webkit`
  - Visual: 同一capture testでBefore／After／IterationをDesktop・Tablet・Mobileへ保存し、代表Routeを画像として目視比較する。
- 成功判定:
  - 各コマンドが実際にPASSし、実行不能・既存警告・失敗は明記される。
  - Axeの重大／深刻違反がなく、Keyboard、Focus、Touch target、Landmark、Label、Status表現が維持される。
  - 指定Routeで意図しないHorizontal scroll、固定UI重なり、切れ、操作不能がない。
  - 参考画像と並べて、色、余白、Typography、商品画像、CTA、Navigation、Admin構造が同一思想と判断できる。

## 7. リスクと未解決論点

- Risks:
  - 2,000行超のglobal CSSは全Routeへ波及するため、foundation／Storefront／Admin／responsive単位で差分とScreenshotを確認する。
  - Auth／Cart／Checkout／Admin captureは状態依存のため、各Screenshot前にScenario resetして再現性を保つ。
  - Product assetの種類は限定されるため、参考画像のLifestyle写真を複製せず、既存画像の比率、background、crop、layoutで商品を主役にする。
  - Visual調整で既存Role/Label/test selectorを壊さないよう、Semantic HTMLと文言を維持する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - Presentationのtoken、CSS、shell、shared component、page modules
  - 必要なVisual capture／UI regression test
- 付随ドキュメント:
  - `.codex/runs/20260727-231718-JST/PLAN.md`
  - `.codex/runs/20260727-231718-JST/TASKS.md`
  - `.codex/runs/20260727-231718-JST/REPORT.md`
  - `.codex/runs/20260727-231718-JST/run.json`
  - `output/ui-review/before/`
  - `output/ui-review/after/`および反復別Screenshot

## 9. 備考

- 重要な永続的UI判断は、既存`docs/05_ui/design_system.md`と整合させる。業務・Architecture判断は変更しないため、新規ADRは現時点で不要とする。
