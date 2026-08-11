# quality_gate_runner timeout契約の600秒化

## 確認日

2026-08-11 JST

## 判断

- ユーザー承認済みの既存25ファイルを機械的にPrettier整形した。
- `pnpm run verify`はformat／lint／spec validation／typecheck／security／全Test／Web build／Spec buildをexit 0で完了した。
- 実測full verify所要時間は約303秒だったため、quality runnerのper-command timeout指示を600秒以上へ拡張する。
- Required Validation Setのコマンド文字列・順序・回数は変更せず、外側timeout wrapperも追加しない。

## Evidence

- `.artifacts/luna-orchestration/wave11-format-baseline-1706/pnpm-run-verify-stream.log`
- `.artifacts/luna-orchestration/wave11-format-baseline-1706/approved-files.txt`
- `.codex/agents/quality_gate_runner.toml`
