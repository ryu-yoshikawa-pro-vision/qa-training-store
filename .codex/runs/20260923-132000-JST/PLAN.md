# Plan（計画）

## 目的

- Issue #177の実装前Planを、現在のRepository契約と過去のEOL対応履歴に基づいて作成する。
- 2026-08-17の既存LF契約を前提に、再発したWindows worktree CRLFの発生源を調査してから恒久対応を選ぶ構成にする。

## 今回行うこと

- Issue #177、ADR-0017、EOL関連設定、Prettier / Husky経路を確認する。
- 過去Run ArtifactからEOL failureの再発履歴を確認する。
- Git / Prettier公式仕様を確認する。
- main 01cd8ab15078d479e821d373445af1e16a469519からplan/issue-177-windows-crlf-prettierを作成する。
- docs/plans/2026-09-23_132000_issue-177-windows-crlf-prettier.mdを保存する。

## 対象外

- EOL設定の実装修正
- app/**のformat
- Husky / Prettier変更
- Product code変更
- PR作成
- merge
- Issue close
