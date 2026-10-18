# 命名規約

- run ID: `YYYYMMDD-HHMMSS-JST`
- 計画書: `docs/plans/{yyyy-mm-dd}_{HHMMSS}_{plan_name}.md`
- レポート: `docs/reports/{yyyy-mm-dd}_{HHMMSS}_{report_name}.md`
- PROJECT_CONTEXT 履歴: `docs/history/YYYY-MM-DD_HHMMSS_<summary>.md`
- run artifact: `.codex/runs/<run_id>/artifacts/`
- run report JSON: `.codex/runs/<run_id>/reports/`
- run log: `.codex/runs/<run_id>/logs/`

すべて JST (`Asia/Tokyo`) を使用する。

`docs/reports/` は、永続的に保持すべき調査・監査・検証結果のみに使用する。レビューのみ、計画策定のみ、ステータス更新、軽微な確認、通常のエビデンスコマンドの実行結果、実行進捗の記録、チャットで完結する評価では、レポートファイルを作成しない。
