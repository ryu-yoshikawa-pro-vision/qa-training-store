# Web版スクロール不具合 修正計画

## 0. 依頼概要

- 依頼内容: Web版で縦長ページをスクロールできない不具合を修正する。
- 背景: 診断Run `20260727-192924-JST`で、Expoのreset CSSが`body { overflow: hidden; }`を挿入し、画面高720px・document高3,428pxのHomeでもホイール後の`window.scrollY`が0のままであることを確認した。
- 期待成果: Storefront/Adminのdocument scrollingを復元し、同じ回帰をE2Eで検出する。

## 1. ゴール / 完了条件

- ゴール: Web版のビューポートより縦長なページを、通常の入力で縦スクロールできるようにする。
- 完了条件（DoD）:
  - アプリ側CSSがExpo resetのbody scroll lockを縦方向だけ上書きする。
  - Homeでwheel入力後に`window.scrollY > 0`となる。
  - 既存14シナリオとMobile boundaryのtest scopeを変更しない。
  - format check、lint、typecheck、Accessibility E2E、Chromium E2EがPASSする。

## 2. 現状理解と前提

- Current understanding:
  - Entry points: `app/_layout.tsx`が`global.css`と`AppFrame`を読み、Storefront/Admin shellがdocument flowへpage contentを配置する。
  - Main flow: Expoが`#expo-reset`で`body { overflow: hidden; }`を挿入し、その後に読み込まれる`global.css`のbody ruleがoverflowを指定しないためscroll lockが残る。
  - Key abstractions: `StorefrontShell`、`AdminShell`、global stylesheet、Playwrightの`scenario` fixture。
  - Existing tests: `accessibility.spec.ts`が既定seedのHomeを含む代表画面をChromiumで開く。`phase1-required.spec.ts`はChromium/Mobileの14シナリオを担う。
  - Safe change surface: `global.css`の既存body ruleと、Homeを既に検証する`accessibility.spec.ts`。
  - Unknowns: なし。ブラウザ上で`body.style.overflow = "auto"`を適用すると同じwheel入力で`scrollY = 1200`へ変化することを実測済み。
- Assumptions:
  - 横方向のoverflowは変更せず、縦方向だけ`auto`へ戻す。
  - Homeは既定seedとDesktop Chrome viewportで常にビューポートより縦長になる。
- Non-goals:
  - 固定ナビゲーション、Adminの1,024px境界、dialogやtableなどの独立scroll領域の再設計。
  - ExpoやReact Native Webのversion更新。
  - E2E project、package script、CI stepの追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: scroll量の厳密値ではなく、wheel入力後に0より大きくなることを成功条件にする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Web document全体の縦scroll
  - Homeを使うAccessibility E2E
- Files to inspect:
  - `src/presentation/styles/global.css`
  - `e2e/web/accessibility.spec.ts`
  - `src/presentation/shells/storefront-shell.tsx`
  - `src/presentation/shells/admin-shell.tsx`
  - `playwright.config.ts`

## 5. 変更方針

- Change strategy:
  1. `global.css`の既存body ruleへ`overflow-y: auto`を追加し、Expo resetより後のcascadeで縦scrollを復元する。
  2. Accessibility E2EのPublic/Guest代表画面でHome表示後、documentが縦長であることとwheel入力後の`window.scrollY > 0`を確認する。
  3. 対象検証から始め、Static validationと既存Chromium E2Eへ広げる。
- 実行タスク:
  - [x] 1. bodyの縦scrollを復元する。
  - [x] 2. Homeのscroll回帰assertionを追加する。
  - [x] 3. 対象・回帰検証を実行する。

## 6. 検証方法

- Validation plan:
  - `corepack pnpm run format:check`
  - `corepack pnpm run lint`
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test:a11y`
  - `corepack pnpm run test:e2e:chromium`
- 成功判定:
  - 全commandがexit 0。
  - E2EはHomeの`scrollHeight > innerHeight`とwheel後`scrollY > 0`を確認する。

## 7. リスクと未解決論点

- Risks:
  - dialog open時のscroll lockはReact Ariaが個別管理するため、恒常的なbody CSSとの競合有無を既存E2Eで確認する。
  - 画像load前の高さ判定を避け、Home見出し表示後にdocument寸法を確認する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `src/presentation/styles/global.css`
  - `e2e/web/accessibility.spec.ts`
- 付随ドキュメント:
  - `.codex/runs/20260727-193608-JST/{PLAN.md,TASKS.md,REPORT.md}`
  - `docs/plans/2026-07-27_193608_web-scroll-repair.md`

## 9. 備考

- read-only subagent 2件の結論を採用した。CSSは縦方向だけを戻し、テストは既存Accessibility E2Eへ載せることで、full/mobile 14シナリオの件数を維持する。
