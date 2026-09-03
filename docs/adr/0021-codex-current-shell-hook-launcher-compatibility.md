# ADR-0021: Codex current shell向けWindows Hook launcher互換性

- Status: Accepted
- Date: 2026-09-03
- Supersedes: ADR-0020のWindows logging `command_windows`実装方針

## Context

Codex CLI `0.153.0`の実行環境では、Hook commandがPowerShell 7 (`pwsh.exe -NoProfile -Command`)のshell境界へ渡る。ADR-0020で採用したquote-free PowerShell launcherは、`powershell.exe -Command $current = ...`の内側変数を外側PowerShellが先に展開するため、loggerがparse errorをstderrへ出しながらexit 0となり、JSONL side effectが発生しない。PreToolUseの旧`-File "$(git rev-parse ...)"`形式は、`cmd.exe /C` wrapperではsubexpressionがpathとして評価されず起動に失敗する。

script単体は成功しており、現行Codex sourceのWindows command selection／shell executionと、root／nested cwdのconfigured launcher probeがこの差分を再現した。実Codex CLIでも変更前はlogging HookがCompleted表示なのにJSONLがなく、PreToolUseだけは発火していた。

## Decision

1. Windowsの6つの`command_windows`は、`cmd.exe /D /Q /S /C`で`git rev-parse --show-toplevel`をrootとして解決し、loggerはNodeへ、PreToolUseは既存のPowerShell transport launcherへ直接渡す。`/Q`でcmd promptをHook stdoutへ漏らさない。
2. loggingはlogger pathの存在確認を先に行い、通常eventはlogger不在時にexit 0、`SubagentStop`／`Stop`はlogger不在または失敗時にstdout `{}`を返す。fallbackのencoded PowerShell commandはshellの追加解釈を受けない。
3. PreToolUseの`^Bash$` matcher、Node policy、deny／fail-close semantics、stdin／stdout／stderr transport、sandbox境界、Unix launcherは変更しない。Hookを無効化したり、security policyを弱めたりしない。
4. configured launcher contract testはroot／nested cwdと`cmd.exe /C`／current `pwsh.exe -Command`の両方を実行し、logging side effectとPreToolUse allow／denyを固定する。

## Consequences

- PR #100のsandbox fallbackとStop contractは維持し、今回の修正はrunner shell boundaryだけを対象にする。
- `.codex/config.toml`を変更するとCodexのpersisted per-hook trust stateと一致しなくなるため、通常trust実行では再review／再承認されるまでHookがadmitされない場合がある。診断でtrust bypassを使用しても、repositoryの運用設定へは反映しない。
- 現行CLIの実runtimeでCompleted、tool result、logger JSONLを分離して確認する。CLI statusだけをside effect成功の根拠にしない。

## Follow-up: logging Hook timeout headroom（2026-09-03）

- Windows configured launcherの既存probeで、通常処理が重くないlogging Hookでも`Stop`が5395msに到達し、5秒timeoutの閾値を超える実測が得られた。process startup、shell／Git起動、Node起動、filesystem I/O、scheduler／Defender遅延を含む実環境では、5秒は余裕が小さい。
- `UserPromptSubmit`、`PostToolUse`、`SubagentStart`、`SubagentStop`、`Stop`のtimeoutを5秒から10秒へ変更する。10秒は5秒の2倍のbounded headroomであり、正常処理を無制限に待たせず、30秒以上へ機械的に延長する根拠もない。
- `PreToolUse`のtimeout 30秒、`^Bash$` matcher、deny／fail-close security semantics、全launcher、Hook script、sandbox、Stop／SubagentStopのstdout `{}` contractは変更しない。`async = true`も採用しない。lifecycle終了とのraceやsession shutdown時のlogging欠損を避けるためである。
- 10秒付近へ継続的に到達する場合はtimeoutをさらに延長せず、process startup、shell／`git rev-parse`、Node startup、filesystem I/Oの律速箇所を調査する。
