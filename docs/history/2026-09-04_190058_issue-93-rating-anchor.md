# Issue #93 Product Detail Rating AnchorのContext更新履歴

## 変更前

- Product DetailのRatingは`href="#reviews"`を持つAnchorで、Review Sectionは非同期に描画される`id="reviews"` targetだった。
- 商品一覧からの商品詳細client navigation後の初回hash-only操作と、direct `#reviews`のrender後位置について、Project Contextに原因と検証入口の記録はなかった。

## 変更後

- Expo Router webのhash-only client navigationと非同期target生成が初回fragment navigationへ与える影響を記録した。
- Browser native Anchor semanticsを保持したmount後focusと、Sticky Headerを避ける`scroll-margin-top`の契約、Playwright Regression入口を記録した。

## 根拠

- Issue #93 Gray-box QA Run: `.codex/runs/20260904-180025-JST/qa-findings.json`
- Runtime raw evidence: `.artifacts/issue-93-baseline/`
