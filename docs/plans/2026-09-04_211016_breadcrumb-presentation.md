# 計画書: Breadcrumb表示スタイル共通化

## 0. 依頼概要

- 依頼内容: Issue #96「Breadcrumbの表示スタイルを共通化する」を `fix/breadcrumb-presentation` へ実装する。
- 背景: Current `main` では、管理・レビュー系画面が既存の `Breadcrumbs` componentを使う一方、Catalog、商品詳細、Cart、注文詳細は手書きの `nav` markupを持つ。さらに `global.css` に `.breadcrumbs ol` の重複上書きがある。
- 期待成果: 既存BreadcrumbのPresentationを共通Componentと共通Styleへ集約し、Typography、spacing、link/current state、accessible label、keyboard focusを一貫させる。

## 1. ゴール / 完了条件

- ゴール: Current `main` でBreadcrumbを表示している全画面が、同じ `Breadcrumbs` Presentationと同じCSS契約を利用する。
- 完了条件（DoD）:
  - 手書き4画面を既存 `Breadcrumbs` componentへ置き換える。
  - Item数、表示順、表示内容、href、current page、表示画面を変更しない。
  - `nav[aria-label="パンくず"]`、link、`aria-current="page"`、focus-visibleを維持する。
  - BreadcrumbのTypography、spacing、separator、link/current表示を共通Styleだけで管理する。
  - Component、accessibility、responsiveの既存テストで契約を確認する。
  - 指定quality gate、`git diff --check`、自己レビュー、commit、push、OPEN/non-Draft PR作成を完了する。

## 2. 現状理解と前提

- Current understanding:
  - 共通 `Breadcrumbs` は `src/presentation/patterns/admin-patterns.tsx` にあり、AdminおよびCustomer Review画面で利用されている。
  - 手書き実装は `catalog-list-page.tsx`、`product-detail-page.tsx`、`cart-page.tsx`、`checkout-order-pages.tsx` の4箇所にある。
  - 手書き実装は概ね同じ `nav > ol > li` 構造だが、注文詳細だけcurrent itemへ `li[aria-current]` を付け、他は `span[aria-current]` を使っている。
  - `global.css` には `.breadcrumbs ol` の基礎定義に加え、別箇所のmargin上書きが2つと、後段のlink色上書きが1つあり、CSSの記述位置にPresentationが依存している。
  - `:focus-visible` はglobal CSSで共通定義されており、Breadcrumb linkにも適用される。
  - 既存component testにはBreadcrumb専用のsemantic contract testはなく、E2EにはSearch画面のcompact／desktop layout確認とAccessibility smokeがある。
- Assumptions:
  - 既存 `Breadcrumbs` のprops（`label` と任意の `href`）で4画面の現在のNavigation情報をそのまま表現できる。
  - `.breadcrumbs` の基準値は既存の最終表示に合わせ、14px typography、8px grid spacing、muted link/current色、8px bottom spacingとする。
  - 共有Componentの配置変更は行わず、既存の共通Componentを再利用することで不要な抽象化を避ける。
- Non-goals:
  - Breadcrumb階層、表示有無、item内容、Route情報、Route生成、Category階層を変更しない。
  - Breadcrumbが存在しないGuide等への新設、長文表示全般のoverflow改善、Header/FooterやNavigation Architectureの再設計を行わない。
  - Design System全体や無関係なstyleを整理しない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文、既存Component、既存CSS、branch条件、validation条件が明確。
- 仮定してよい細部: 既存の `Breadcrumbs` を共通Presentationの正本とし、必要な変更をconsumerのmarkup置換とCSS整理に限定する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - `src/presentation/pages/` の既存Breadcrumb consumer 4画面。
  - `src/presentation/patterns/admin-patterns.tsx` の既存共通Breadcrumb Presentation（consumer契約は維持）。
  - `src/presentation/styles/global.css` のBreadcrumb共通Style。
  - Web component／Accessibility／Chromium responsive validation。
- Files to inspect:
  - `src/presentation/patterns/admin-patterns.tsx`
  - `src/presentation/pages/catalog-list-page.tsx`
  - `src/presentation/pages/product-detail-page.tsx`
  - `src/presentation/pages/cart-page.tsx`
  - `src/presentation/pages/checkout-order-pages.tsx`
  - `src/presentation/styles/global.css`
  - `tests/component/presentation-foundation.test.tsx` および関連page tests
  - `e2e/web/accessibility.spec.ts`
  - `e2e/web/ui-ux-improvements.spec.ts`

## 5. 変更方針

- Change strategy:
  1. 各手書きBreadcrumbのitem配列を読み取り、現在のhref・順序・current表示を保ったまま既存 `Breadcrumbs` へ置換する。
  2. `.breadcrumbs` のTypography、spacing、separator、link表示を1つの共通CSS定義に集約し、後段の重複margin／link色上書きを削除する。global `:focus-visible` は維持する。
  3. shared component testでaccessible label、link、current itemをsemantic assertionし、既存responsive／a11y testでcompact・desktopとfocusを確認する。
  4. focused validation、標準quality gate、`verify`、diff／scope reviewを順に実行する。
- 実行タスク:
  - [ ] 1. 既存Breadcrumb consumerを共通Componentへ置換する。
  - [ ] 2. 重複Breadcrumb CSSを共通定義へ整理する。
  - [ ] 3. semantic／navigation／focusの回帰テストを追加・更新する。
  - [ ] 4. focusedおよび標準validationを実行し、失敗時は原因を切り分けて修正する。
  - [ ] 5. scope review、artifact sanitize、commit、push、PR作成後確認を行う。

## 6. 検証方法

- Validation plan:
  - 先行: `pnpm run test:component:web`
  - Accessibility／responsive: `pnpm run test:a11y`、`pnpm run test:e2e:chromium`
  - 標準: `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run test:component:web`、`git diff --check`
  - 統合: `pnpm run verify`
  - 各実行前後にbranch、working tree、変更差分を確認し、E2Eでは既存のdesktop／compact viewport契約を利用する。
- 成功判定: 上記実行可能なvalidationがPASSし、失敗がある場合は今回の差分・baseline・環境要因を分類したうえで、今回の差分が原因なら修正後に関連gateを再実行する。

## 7. リスクと未解決論点

- Risks:
  - `Breadcrumbs` 置換時にhrefやcurrent itemを取り違えるとNavigation契約を壊すため、各既存markupを1対1で配列化し、page test／E2Eで確認する。
  - CSS重複を削除する際に意図せず別コンポーネントへ影響しないよう、`.breadcrumbs` selectorだけを変更対象にする。
  - Existing E2Eは認証・開発server状態に依存するため、失敗時は最初の異常と環境制約を分離して記録する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: 上記Breadcrumb consumer、共通Style、必要最小限のcomponent／E2E test、Run Artifact。
- 付随ドキュメント: 本計画書、`.codex/runs/20260904-211016-JST/` のPLAN／TASKS／REPORT／machine-managed manifest。

## 9. 備考

- Issue source: `gh issue view 96 --repo ryu-yoshikawa-pro-vision/qa-training-store --json number,title,body,state,url,comments` でIssue #96がOPENであることと本文を確認した。
- Current `main` と `fix/breadcrumb-presentation` のHEADは `cf5b7b07bbfebb93ed3bf82539fa2eed331c51c6` で、開始時点の差分はない。
