# Codex Hook sandbox対応の履歴

## 2026-09-03

- Windows logging commandのnested PowerShell quote衝突を、`cmd.exe /C` runner相当の実行で再現した。logger単体の公式payload処理、Stopの`{}` stdout、stderr、exit statusは正常だった。
- quote-free launcherへ変更した後、Codex sandboxの実行ユーザーでは`.codex`がread-only carveoutとなり、loggerの`.codex/logs` appendが`EPERM`になった。`.codex/logs`への追加writable rootは通常tool起動自体を拒否するため採用しなかった。
- `.codex/logs`を優先し、permission/path failure時だけ`.artifacts/codex-hooks`へ同じsanitized JSONLをfallbackする実装とcontract testを追加した。PreToolUse security policy、Unix command、既存logging payload schemaは変更していない。
