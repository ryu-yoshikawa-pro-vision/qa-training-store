# リポジトリ構成

```text
.
├─ AGENTS.md
├─ PLANS.md
├─ CODE_REVIEW.md
├─ .codex/
├─ .agents/
├─ docs/
└─ scripts/
```

## 補足

- `.codex/runs/` と `.codex/logs/` は、実行に伴って追加される。
- `.agents/skills/*/references/` は、タスク固有のワークフローの詳細手順。
- `docs/reference/` は、人間が参照するための補助文書。
- `docs/plans/` は、計画書の保存先。
- `docs/reports/` は、永続的に保持する調査・監査・検証レポートの保存先。レビューのみの作業や実行経過の記録では作成しない。
- `scripts/` には、`codex-safe`、`codex-task`、`codex-sandbox`、`verify` が含まれる。