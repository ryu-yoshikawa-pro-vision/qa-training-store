# Codex更新後Hook regression調査報告

## Summary

インストール済みCodex CLIは`0.153.0`。Primary CauseはCodexのHook schema／matcher回帰ではなく、現行CLIがWindows Hook commandを`pwsh.exe -NoProfile -Command`へ渡す際に、既存の`command_windows`がshell境界と互換でなかったことだった。

- `log_event.mjs`と`pre_tool_use_policy.mjs`の単体実行（A）は正常。
- 設定launcher（B）は、変更前にPreToolUseの`cmd.exe /C`起動失敗と、loggingのPowerShell変数展開によるexit 0／stderr parse error／JSONLなしを再現。
- 修正後は6 event、root／`docs`、current `pwsh`／`cmd.exe` wrapperでstdout／stderr／exit／side effectが契約どおりになった。
- 実Codex（C）は`0.153.0`でUserPromptSubmit／PreToolUse／PostToolUse／StopがCompleted、tool成功、JSONL生成を確認。PreToolUse denyもCodex routerでblockされた。

## Environment

- OS: Windows 10.0.19045 x64
- PowerShell: 7.6.5 (`pwsh.exe`); Windows PowerShell 5.1もインストール済み
- Node.js: v24.12.0
- Git: 2.44.0.windows.1
- Codex CLI: `codex-cli 0.153.0`
- Codex features: `hooks stable true`、`unified_exec stable true`、`code_mode_host stable true`、`code_mode under development false`
- 実行surface: `pwsh.exe -File %APPDATA%\\npm\\codex.ps1`からのCodex CLI。Desktopはインストール済みだが停止中、IDE経路は未実行。
- project-scoped `.codex/config.toml`: `features.hooks = true`、project trustはuser config上`trusted`。config parse/loadは`codex doctor`で確認。
- 初期状態: 指定branch `fix/codex-hooks-update-regression`、HEAD `4487cc6`、working tree clean。

## Reproduction

### A: Hook script単体

公式payload相当をstdinへ直接渡した。6 event（PreToolUse、UserPromptSubmit、PostToolUse、SubagentStart、SubagentStop、Stop）を対象とし、PreToolUseはallow／deny／malformedも実行した。

- logging: exit 0、stderr空、Stop／SubagentStop stdout `{}`、JSONL append。
- PreToolUse: allow exit 0、deny JSON、malformed exit 2。
- 結論: script単体はfailure boundaryではない。

Evidence: `.artifacts/codex-hooks/a-20260903-2020/result.json`

### B: configured launcher

変更前に現行configの文字列をCodex Windows runner相当の`cmd.exe /C "<command>"`とcurrent `pwsh.exe -NoProfile -Command`で、root／`docs` cwdから実行した。

- 変更前PreToolUse: `cmd.exe /C`のroot／nested 2件がexit `0xFFFD0000`。PowerShellがliteral `$(git rev-parse --show-toplevel)...` pathを見つけられず起動失敗。
- 変更前logging: current `pwsh.exe` 10件すべてexit 0だがstderrにPowerShell parse error、JSONL side effectなし。外側shellが内側`-Command $current = ...`の`$current`を先に展開したため。
- 修正後current `pwsh.exe`: 6 event × root／nested = 12件、全件exit 0、stdout／stderr空（Stop系stdout `{}`）、logging 10件がJSONL append。
- 修正後`cmd.exe /C`: 同じ12件が全件exit 0、PreToolUse allowとlogging side effectを確認。
- `sh`はこのWindows環境に無く、Unix shell wrapperは実行不可だった。

Evidence: `.artifacts/codex-hooks/b-20260903-2030/result.json`、`result-pwsh.json`、`result-pwsh-final.json`、`result-after.json`

### C: 実Codex runtime

`codex --ask-for-approval never exec --color never --dangerously-bypass-hook-trust -C <repo> --sandbox workspace-write`で、prompt本文は保存せず、read-onlyの`node --version`だけを実行させた。

- 修正前: UIはloggingをCompletedと表示したが、logger JSONLは生成されなかった。
- 修正後: `codex-cli 0.153.0`、UserPromptSubmit／PreToolUse／PostToolUse／StopがCompleted、tool結果`v24.12.0`、最終結果成功。同一runtime sessionの`.codex/logs/hooks-*.jsonl`は3 records（UserPromptSubmit、PostToolUse、Stop）。
- PreToolUse deny probe: Codex routerが`Command blocked by PreToolUse hook`を返し、対象ファイルは生成されなかった。既存security policyは維持された。
- 通常trust（bypassなし）では、config変更後のpersisted per-hook trusted hashが古いためlifecycle hook statusが出ず、tool自体は成功した。user configやtrustは変更していない。これはconfig変更後の再review／再承認が必要になる運用上の二次要因である。
- この最小promptではSubagentStart／SubagentStopとCode Modeを実runtimeから発火させていない。両event自体はA／Bでstdin、stdout、exit、JSONLを確認した。

Evidence: `.artifacts/codex-hooks/c-20260903-2240-plain/result.json`、`stderr.log`、`stdout.log`、`.artifacts/codex-hooks/c-20260903-2345-after-fix-no-bypass/result.json`

## Root Cause

Primary Causeは`Repository config incompatibility`（原因分類2）である。Secondary Causeは、config変更後のpersisted per-hook trusted hashが旧値のままになる`Trust／configuration loading`（原因分類8）である。分類3（Codex CLI regression）、4（Desktop／IDE regression）、5（sandbox／permission change）、6（payload／contract change）、7（matcher／routing change）、9（performance regression）は今回のPrimary Causeではない。

1. PR #100でlogging launcherはquote-free PowerShell形式になったが、現行Codexの実shellは`pwsh.exe -NoProfile -Command`である。その外側PowerShellがlauncher中の`$current`を展開するため、loggerはparse errorをstderrへ出す一方、`log_event.mjs`のfail-soft設計でexit 0を返した。結果は「Completedだがside effectなし」になった。
2. 旧PreToolUse `powershell.exe ... -File "$(git rev-parse --show-toplevel)..."`は、Codex runner相当の外側`cmd.exe /C`ではPowerShell subexpressionとして解釈されずliteral pathになった。これはPR #100のlogging／EPERM修正とは別の未カバーlauncher境界だった。

Payload schema、event名、`matcher = "^Bash$"`、PreToolUse policy本体、sandbox permissionは原因ではない。Codex 0.153.0固有のschema／matcher regressionとは認定しない。

## Evidence

- Version／runtime／trust: `codex --version`、`codex doctor`、`codex features list`、C probe stderr。
- Official contract: [OpenAI Hooks documentation](https://developers.openai.com/codex/hooks)。
- Current source cross-check: [`command_runner.rs` (`rust-v0.153.0`)](https://raw.githubusercontent.com/openai/codex/rust-v0.153.0/codex-rs/hooks/src/engine/command_runner.rs)、[`discovery.rs`](https://raw.githubusercontent.com/openai/codex/rust-v0.153.0/codex-rs/hooks/src/engine/discovery.rs)、[`shell.rs`](https://raw.githubusercontent.com/openai/codex/rust-v0.153.0/codex-rs/core/src/shell.rs)で`command_windows` selection／Windows `/C` runner／shell selectionを確認した。
- Upstream version history: [Codex changelog](https://developers.openai.com/codex/changelog)。0.153.0のrelease notesに今回のHook schema変更は記載されていない。
- Repository history: [PR #100](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/100)、[PR #81](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/81)、[PR #76](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/76)。
- 全probeのredacted要約と生ログはGit管理外の`.artifacts/codex-hooks/`に保存した。prompt本文、credential、tokenはRun Artifactへ保存していない。

## Changes

- `.codex/config.toml`: Windows 6 launcherを`cmd.exe /D /Q /S /C`の`for /f` root resolverへ変更。PreToolUseは既存のPowerShell policy transportへ渡し、loggingはlogger missing時の挙動とStop系`{}` fallbackを維持。
- `tests/contracts/codex-hook-contract.test.ts`: 現行PowerShell shellと`cmd.exe /C`、root／nested cwd、6 event、logging side effect、PreToolUse allow／denyを実プロセスで固定。
- `scripts/verify.ps1`: 新launcherのstatic contractへ同期。
- `docs/adr/0021-codex-current-shell-hook-launcher-compatibility.md`、`docs/history/2026-09-03_214500_codex-hooks-update-regression.md`、`docs/PROJECT_CONTEXT.md`: 根本原因、PR #100との差分、trust consequenceを記録。
- Product code、Hook script本体、matcher、security policy、sandbox設定は変更していない。

## Validation

- `pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1`: `129 passed`。
- `node --check .codex/hooks/log_event.mjs`: PASS。
- `node --check .codex/hooks/pre_tool_use_policy.mjs`: PASS。
- configured launcher B probe: current `pwsh`／`cmd`、6 event、root／nested、stdin／stdout／stderr／exit／JSONLを確認済み。
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`: PASS `3/3`。
- `bash scripts/verify`: PASS `2/2`、SKIP `2`（Windows環境でcodex executable／bash wrapper unavailable）。
- `git diff --check`: PASS。
- `pnpm run verify`: FAILは今回差分外の既存 `src/presentation/components/search-combobox.tsx:99` のTS7006（`open` implicit any）。今回の変更でこのファイルは変更していない。ユーザー指定のProduct code変更禁止により修正せず、上流typecheck失敗後のtest／buildは実行していない。
- 実Codex C after-fix: bypass診断で4 lifecycle status Completed、tool成功、logging JSONL side effect。通常trustの差分も記録済み。
- Run Artifactは`20260903-201350-JST`へ蓄積し、完了前にSanitizer Write／Checkを実行する。

## Remaining Risks

- config変更によりCodexのpersisted per-hook trusted hashが古くなるため、通常運用でproject configの再review／再承認が必要になる可能性がある。user configは変更していない。
- Desktop／IDE surfaceはDesktop停止中のため未検証。今回の根本原因はCLIの実shellとconfigured launcherの実測に基づく。
- Windows PowerShell 5.1を外側shellに強制した経路は現行Codexの実経路ではない。current `pwsh.exe`と`cmd.exe` wrapperを検証対象とした。
- Product codeの既存typecheck failureが残っているため、repository全体の`pnpm run verify`は現時点でgreenではない。

## Upstream Codex Relation

公式docs／0.153.0 sourceではHook event、`command_windows`、`Bash` matcherの現行契約を確認でき、今回の実測はそのrunner shell経路と一致した。参考にしたupstream [issue #38168](https://github.com/openai/codex/issues/38168)はWindowsのnested quoteでcommandが実行されない同系統の報告だが、今回のprimary causeをissue番号だけから認定したものではない。PR #100で解消済みの問題を再実装せず、今回の未互換launcherだけを修正した。

## Git / PR

validation後に指定branchで今回の変更だけをcommitし、`origin HEAD:fix/codex-hooks-update-regression`へpushしてmain向けOPEN PRを作成する。

## Follow-up: logging Hook timeout headroom

### 背景と判断

前回のWindows configured launcher probeで、`Stop`の実行時間が`5395ms`に到達した。Hook本体の正常処理が5秒を要したのではなく、current shell、`cmd.exe`、`git rev-parse`、Node起動、filesystem appendなどの起動・スケジューリング遅延を含む測定値であり、5秒timeoutでは高負荷時の揺らぎを吸収できない。

この実測に対するbounded adjustmentとして、logging 5 Hook（`UserPromptSubmit`、`PostToolUse`、`SubagentStart`、`SubagentStop`、`Stop`）のtimeoutだけを`5`から`10`へ変更した。10秒は5秒の2倍のheadroomで、無制限または30秒級の待機を導入せず、異常Hookの検知遅延を限定する。`PreToolUse`のtimeout `30`は変更していない。

`async = true`は採用していない。今回の直接原因はtimeout閾値であり、async化はStop／SubagentStopのlifecycle終了raceやsession shutdown時のlogging欠損という別のexecution semanticsを持ち込むためである。

### 変更と検証方針

- `.codex/config.toml`、既存contract test、`scripts/verify.ps1`だけでtimeout契約を`10`へ同期する。
- Windows launcher command、root resolver、`.codex/logs`／`.artifacts/codex-hooks` fallback、payload／redaction、Stop系`{}` contract、Unix command、Hook script、matcher、security policy、sandboxは変更しない。
- PostToolUse／Stopを含むconfigured launcherをroot／nested cwdで複数回測定し、exit 0、stderr空、stdout契約、JSONL side effect、durationを記録する。10秒付近へ継続的に到達する場合はtimeoutを追加延長せず、process startup、shell／Git root resolution、Node startup、filesystem I/Oを追加調査する。
