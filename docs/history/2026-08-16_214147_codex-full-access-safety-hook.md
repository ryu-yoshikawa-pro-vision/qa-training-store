# Codex Full Access Safety Hookの正本化

## 変更

- Windows native Codex `0.147.0`の実行契約に合わせ、`features.hooks`、`PreToolUse`／`Bash`、`command_windows`を採用した。
- Full Access common policyをNode Hook一つへ統一し、schema-invalid inputはfail-close、denyはstructured output、safeは無出力とした。
- 旧PowerShell／Python policy Hookをruntime参照から外し、Rules、wrapper、verify、運用文書を同期した。
- project-local profileがinstalled runtimeでunsupportedだったため、wrapperがsandbox／approvalを明示し、auto-netのnetwork accessだけ`-c`で注入する構成へ整理した。

## 根拠

- `codex --version`は`codex-cli 0.147.0`、`codex features list`は`hooks stable true`だった。
- Windows launcherのroot／nested cwd、safe／deny、LF／CRLF入力でtransport結果を実測した。
- `codex execpolicy check`ではcommon Rulesが通常の`git add`、`python -c`、`terraform apply`、`kubectl apply`をblanket forbiddenにしないことを確認した。auto-net固有Rulesは従来の非対話禁止を維持する。
