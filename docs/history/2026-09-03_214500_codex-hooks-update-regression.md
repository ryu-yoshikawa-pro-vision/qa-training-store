# Codex Hook update regression調査記録

## 結論

インストール済みCodexは `codex-cli 0.153.0`。今回の実測上のPrimary CauseはCodex CLIのHook schema／matcher変更ではなく、repositoryのWindows `command_windows`が現行shell境界と互換でなかったことだった。

- A（script単体）: 6 eventのlogging、PreToolUse safe／deny／malformedが期待されたexit／stdio／JSONLを返した。
- B（configured launcher）: 変更前は`cmd.exe /C`でPreToolUse 2件が起動失敗し、current `pwsh.exe -Command`でlogging 10件がstderr parse error／exit 0／side effectなし。変更後はcmd／pwsh、root／`docs`の6 event全件が契約どおり完了した。
- C（実Codex）: 変更前はloggingがCompleted表示でもJSONLなし。変更後は`0.153.0`でUserPromptSubmit／PreToolUse／PostToolUse／StopがCompleted、tool成功、`DONE`、logging 3件のJSONL生成を確認した。Subagent eventはこの最小promptでは未発火。

変更前のlogging launcherは、PowerShell 7が外側shellになると内側`-Command $current = ...`の`$current`を外側で展開した。loggerのfail-soft設計によりCodex UIはCompletedのまま、実行されない事実が隠れていた。変更前PreToolUseは`cmd.exe /C`の外側引用符境界で`$(git rev-parse ...)`を含む`-File` pathが解決されなかった。

## Trust／config

project-scoped configはCodex doctorでload／parseされ、user configのproject trustはtrustedだった。user configにはこのprojectのper-hook trusted stateも存在するが、repo configを変更した後の通常trust probeではHook statusが表示されず、diagnostic trust bypassで全Hookが実行された。これはuserのtrust stateを変更せず、通常運用では再review／再承認が必要になる可能性として残す。

## 対応

`.codex/config.toml`のWindows launcherだけを変更し、`tests/contracts/codex-hook-contract.test.ts`へconfigured launcherの回帰testを追加、`scripts/verify.ps1`のstatic contractを更新した。PreToolUse policy、matcher、sandbox、Product codeは変更していない。設計はADR-0021へ記録した。

## Evidence／validation

生ログとprobe結果はGit管理外の`.artifacts/codex-hooks/`に保存した。主な結果は `a-20260903-2020`、`b-20260903-2030`、`c-20260903-2345-after-fix`、`c-20260903-2345-after-fix-no-bypass` にある。focused contractは `129 passed`。残りのfull gate、sanitizer、Git／PR結果はRun `20260903-201350-JST`へ追記する。

PR #100はcmd／PowerShell nested quoteとsandbox EPERMのlogging修正であり、今回のcurrent PowerShell shell経路での内側変数展開と、PreToolUse configured launcherの未カバー境界は別問題である。
