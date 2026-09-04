# Codex update後Hook regression 調査・修正計画

## Goal

Codex CLI 0.153.0への更新後に見えるHook障害を、script単体、`.codex/config.toml` launcher、実Codex runtimeの境界で切り分ける。Repository原因だけを必要最小限で修正し、回帰テスト、検証、commit、push、PRまで行う。Upstream原因だけならworkaroundを追加しない。

## Current understanding

- 2026-09-03 JSTの初期状態はworking tree clean、branchは `fix/codex-hooks-update-regression`、HEADは現 `main` と同じ `4487cc6`。
- OSはWindows 10.0.19045 x64、PowerShell 7.6.5、Node.js v24.12.0、Git 2.44.0.windows.1。
- installed Codexは `codex-cli 0.153.0`。`codex doctor` はnpm install、hooks feature、config／auth／sandbox／state DBが利用可能と報告した。Desktop appはインストール済みだが停止中。
- 現行configは `[features] hooks = true`、`PreToolUse`の`matcher = "^Bash$"`、5つのmatcher-free logging event、Windows `command_windows`を持つ。PR #100のquote-free logger launcherとsandbox fallbackは現HEADに含まれている。
- OpenAI公式Hooks docsはinline `config.toml`、`command_windows`、project trust、canonical tool name `Bash`、`exec_command`を`Bash`として扱うmatcher、PostToolUseの非ゼロ終了後発火、Stop／SubagentStopのJSON stdoutを現行仕様として記載している。

## Assumptions

- Windows installed CLIをprimary reproduction surfaceとする。Desktop／IDEは実行状態と結果を別に記録する。
- `0.152.1`はPR #100時点の既知良好候補だが、今回の原因を過去報告から推定しない。
- payload本文やcredential、生ログ全文、ローカル絶対Pathはdurable artifactへ保存せず、redacted要約と`.artifacts/`相対参照だけを残す。

## Non-goals

- Hook無効化、対象Hook削除、`try/catch`／`|| true`による失敗隠蔽の追加。
- PreToolUse security policyの弱体化、sandbox緩和、Hook infrastructure全体の再構築。
- Product codeの変更、PR #100と同じquote／EPERM workaroundの無目的な再適用。

## Impacted areas

- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `tests/contracts/codex-hook-contract.test.ts`
- `scripts/verify`、`scripts/verify.ps1`
- Hook関連ADR／docs、過去Run Artifact、Codex CLI実行結果

## Files to inspect

- `.codex/config.toml`
- `.codex/hooks/*.mjs`、`.codex/hooks/*.ps1`
- `tests/contracts/codex-hook-contract.test.ts`
- `scripts/verify`、`scripts/verify.ps1`
- `docs/adr/0016-codex-pretooluse-node-policy.md`
- `docs/adr/0020-codex-windows-logging-hook-launcher.md`
- PR #100、#81、#76と関連Run／report

## Change strategy

1. 現行CLI、features、trust/config loading、実行surface、repo baselineを固定する。
2. 公式Docs、version changelog、upstream runner source／issuesを実測の補助根拠として確認する。
3. bounded CharterとBEFORE snapshot後、A→B→Cの順で、全config event（PreToolUse、UserPromptSubmit、PostToolUse、SubagentStart、SubagentStop、Stop）をprobeする。
4. 最初の異常をspawn／transport／payload／script／I/O／runtime routing／wrapper／upstreamへ分類する。
5. Repository原因のときだけ最小差分とbehavior回帰testを実装する。PreToolUseのdeny／allow semanticsとWindows／Unix契約を維持する。
6. focused test、syntax／launcher、verify、必要full gate、実Codex再実行を行い、sanitizer後にGit／PR操作へ進む。

## Validation plan

- `pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1`
- modified `.mjs` の `node --check`
- PowerShell parse／configured launcherのroot・nested cwd・stdin・stdout／stderr・exit・timeout probe
- `git diff --check`
- 必要に応じ `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`、`bash scripts/verify`、最後に `pnpm run verify`
- 現行Codex CLIの最小実runtimeでHook status、tool result、spawn／side effectを再確認
- `scripts/sanitize-codex-artifacts.ps1 -Write`／`-Check`

## Risks

- `codex exec`がHook statusを表示してもrepository JSONLを保存しない実行経路差があり得る。statusとI/Oを別Evidenceにする。
- project trust未確認のまま実行すると「未発火」と「trust skip」を誤認する。trust状態を先に確認し、bypassは別probeとして扱う。
- Windows `cmd.exe /C`のexact spawn formがCLI versionで変わる可能性があるため、現行source／actual behaviorを優先する。

## Open questions

- 0.153.0で全eventがspawnされるか、特定event／tool pathだけが変化したか。
- 0.153.0の更新でHook runner、trust、Code Mode、wrapper後処理のどれに差分があるか。
- Repository側の安全な最小修正が存在するか。

## Follow-up notes

- 修正不要の場合も、affected version、last known good候補、minimal reproduction、actual／expected、stdout／stderr／exit、関連upstream issue、repo側で回避しない理由をdurable reportへ残す。
