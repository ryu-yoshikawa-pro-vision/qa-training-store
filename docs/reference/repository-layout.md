# リポジトリ構成

```text
.
├─ AGENTS.md
├─ PLANS.md
├─ CODE_REVIEW.md
├─ .codex/
├─ runs/
├─ logs/
├─ .artifacts/
├─ .agents/
├─ docs/
└─ scripts/
```

## 補足

- `runs/` は新規Run Artifactのcanonical rootであり、実行に伴って追加される。`.codex/runs/` はpreserved legacy/historyとして残し、移動・削除・書換えない。
- root `logs/` はHook等の実行で追加されるGit管理外のログ保存先。`.artifacts/`全体がGit管理外。
- `.codex/logs/`、`.codex/artifacts/`、`.codex/reports/` はpreserved legacyデータであり、新規出力先やcleanup対象にはしない。
- `.agents/skills/*/references/` は、タスク固有のワークフローの詳細手順。
- `docs/reference/` は、人間が参照するための補助文書。
- `docs/plans/` は、計画書の保存先。
- `docs/reports/` は、永続的に保持する調査・監査・検証レポートの保存先。レビューのみの作業や実行経過の記録では作成しない。
- `scripts/` には、Run初期化／collector、sanitizer、検証用スクリプトが含まれる。
