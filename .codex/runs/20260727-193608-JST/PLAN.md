# Plan

## Objective

- Expo Webでビューポートより縦長のページを、マウス・トラックパッド・キーボードで正常にスクロールできるようにする。

## Scope

- In:
  - Web全体に適用されるCSSの最小修正
  - スクロール回帰を検出するE2E
  - formatter / lint / typecheck / 対象E2Eによる検証
- Out:
  - ページ固有レイアウトの変更
  - Mobile/Adminの既存表示境界変更
  - Expo依存関係の更新

## Assumptions

- Expoの`body { overflow: hidden; }`をアプリ側CSSで上書きする。
- Homeは既定seedで十分に縦長であり、回帰テストの代表画面にできる。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 回帰テストの配置は既存Playwright構成に合わせる。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `body`のoverflowを`auto`へ戻せばdocument scrollingが復元する。
- H2: Playwrightで`scrollY`の増加を確認すればExpo resetの再発を検出できる。

## Approach

- repo mappingとread-only subagent調査でsafe change surfaceを確定する。
- 正式Planを`docs/plans/`へ保存してから実装する。
- CSSと専用E2Eを最小差分で変更し、対象検証後に全体への影響を確認する。

## Definition of Done

- Homeでスクロール入力後に`window.scrollY > 0`となる。
- Web CSSがExpo resetより後にbody scrollを有効化する。
- 追加E2E、format check、lint、typecheckがPASSする。

## Risks / Unknowns

- `overflow: auto`がdialog等の独立scroll領域へ影響しないことを既存E2Eとコードで確認する。

## Thinking Log

- 診断Run `20260727-192924-JST`で、`body.style.overflow = "auto"`適用時だけscrollYが0から1200へ増えることを実測済み。
- scroll復元後のAccessibility E2Eで、従来はbody lockにより画面外だったHome下部にcontrast違反2件が検出された。CIを維持するため、同じCSS file内で該当selectorだけの文字色を調整する。
