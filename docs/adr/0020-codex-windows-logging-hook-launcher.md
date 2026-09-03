# ADR-0020: Codex Windows Logging Hookのsandbox対応

- Status: Accepted
- Date: 2026-09-03

## Context

Codex CLI `0.152.1`のWindows Hook runnerは、`command_windows`を`cmd.exe /C`の外側引用符付きで起動する。従来のPowerShell `-Command "..."`はこの境界と衝突し、`UserPromptSubmit`、`PostToolUse`、`Stop`を含むlogging Hookが失敗した。

さらに、現行Windows elevated sandboxではproject `.codex`がread-only carveoutとして渡される場合がある。loggerの起動後に`.codex/logs`へ`appendFileSync`すると`EPERM`になり、quote修正だけではloggingを維持できない。`safe.directory`の変更やPreToolUse policyの緩和は安全境界を変えるため採用しない。

## Decision

1. Windows logging Hookの`command_windows`は埋め込み二重引用符を使わず、現在cwdから親方向へ`.codex/hooks/log_event.mjs`を探索するquote-free PowerShell commandとする。`Stop` / `SubagentStop`の`{}` fallbackと最終`exit 0`は維持する。
2. loggerは`.codex/logs`をcanonical pathとして先に試す。`EACCES`、`EPERM`、`EROFS`、`EEXIST`、`ENOTDIR`でcanonical pathが利用できない場合に限り、同じbounded／redacted JSONL recordをGit管理外の`.artifacts/codex-hooks`へappendする。
3. PreToolUseのGit root解決、Node policy、Windows transport、security rules、Unix logging commandは変更しない。sandboxのwritable root追加、Git `safe.directory`変更、Hook無効化は行わない。

## Consequences

- Windowsの`cmd.exe /C` quote boundaryと現行sandboxの`.codex` read-only境界の両方でloggingを継続できる。
- 通常のhost／書込み可能な実行では既存の`.codex/logs` pathとcleanup契約を維持する。sandboxでfallbackしたraw JSONLは`.artifacts/`のephemeral evidenceとなる。
- Codex CLIの`exec`経路がlifecycle statusを表示してもrepository Hook JSONLを保存しない場合があるため、CLI statusとlogger file I/Oは独立して検証する必要がある。
- fallback先のcleanupは`.artifacts/`の既存運用に委ねる。Run manifestへHook JSONLを自動集約しない方針は変えない。
