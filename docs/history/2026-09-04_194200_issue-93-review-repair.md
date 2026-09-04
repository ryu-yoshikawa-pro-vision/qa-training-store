# Issue #93 PR #112レビュー修正のContext更新履歴

## 変更内容

- Review Sectionの`scroll-margin-top: 112px`はDesktop（900px以上）だけに適用し、900px未満の追加offsetを削除した。
- Regression E2EはURL fragment、target viewport、DesktopのSticky Header境界というユーザー観測可能な結果を確認し、focus stateと`tabIndex`数値の固定を行わない。
- Product Detailのhash-gated `focus()`、plain Anchor、`href="#reviews"`、`id="reviews"`、`tabIndex={-1}`は変更しない。

## 判断根拠

- Mobile向けの`176px`はIssue #93の中核修正に不要な表示余白であり、今回のレビュー対応で削除対象とした。
- `document.activeElement`とDOMの`tabIndex`値は、ユーザー操作の結果ではなく現在の実装表現であるため、E2E契約から外した。
