<!-- STREAMING_CHUNK:Defining the boundary rules for consumer repositories... -->
# テンプレートの境界

このテンプレートは利用側リポジトリ（consumer repo）の土台です。以下のファイルやディレクトリは、リポジトリを利用する側で維持・管理してください。

- `docs/PROJECT_CONTEXT.md`: プロジェクト固有の現状
- `docs/adr/`: 重要な設計判断
- `docs/plans/`: 合意済み計画
- `docs/reports/`: 永続的な調査・監査・検証レポート。レビュー専用（review-only）の記録や実行進捗（run progress）の目的では作成しない。

このテンプレート自体の上流ソースリポジトリ（upstream source repo）における内部事情は持ち込まない前提です。