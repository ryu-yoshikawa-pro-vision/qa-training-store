# PLAN

## 目的
- `.codex/agents/code_researcher.toml` から `model` / `model_reasoning_effort` を削除し、project default を継承させる。
- `developer_instructions` に追加の subagent 起動禁止を明記する。

## 方針
- 対象ファイルのみを最小差分で更新する。
- 既存の `name`、`description`、`sandbox_mode`、役割、出力契約は維持する。

