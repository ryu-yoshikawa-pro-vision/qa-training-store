# Codex Stop / PostToolUse Hook failure調査報告

## 症状

修正前のWindows環境で、Codex CLIが`UserPromptSubmit`、`PostToolUse`、`Stop`のlogging Hookを`Failed`として表示し、`PreToolUse`だけが`Completed`だった。UIの表示だけではHook commandの起動、loggerの失敗、Codex側の判定を区別できなかったため、同じpayloadを使うdirect実行、Windows runner相当実行、実Codex CLI実行を分離して調査した。

## Environment

- OS: Windows 10.0.19045、x64
- Shell: PowerShell 7.6.5 (`pwsh`)
- Node.js: v24.12.0
- Git: 2.44.0.windows.1
- Codex CLI: `codex-cli 0.152.1`
- project-scoped config: `<REPO_ROOT>/.codex/config.toml`
- repository root / current working directory: `<REPO_ROOT>`
- project config: `features.hooks = true`、logging 5 events、timeout 5秒

Run Artifactとこの報告には、ローカル絶対Pathを保存していない。

## Reproduction

1. 修正前の`codex-task`経由のCodex実行で、`UserPromptSubmit` / `PostToolUse` / `Stop`が`Failed`、`PreToolUse`が`Completed`になることを再現した。対象sessionのrepository Hook JSONLは生成されず、Codex保存履歴にもHook execution errorの本文、stderr、exit code、timeout有無は保存されていなかった。
2. 公式payloadを`log_event.mjs`へ直接渡した場合、`PostToolUse`はstdout空・stderr空・exit 0、`Stop`はstdout `{}`・stderr空・exit 0でJSONLへ追記された。payload schema、session ID sanitization、bounded/redacted fields、同期append、12並行appendは正常だった。
3. 公式runner相当のWindows経路として、`cmd.exe /C "<command_windows>"`をnested cwdから実行した。修正前のPowerShell `-Command "..."` commandはlogger記録を作らず、実CodexのHook failureと一致した。
4. quote-free launcherへ変更した後、Codex sandbox内でloggerを起動すると`.codex/logs` appendが`EPERM`になった。sandboxのrestricted permission contextではproject `.codex`がread-only carveoutだった。`.codex/logs`だけを追加writable rootへ指定するCLI上書きは通常tool起動を`UnsupportedOperation`で拒否したため、permission policy変更は採用しなかった。

## Root Cause

### Primary Cause: A / C — Windows command parsingと現行Codex runnerの差異

Windows runnerは`command_windows`を`cmd.exe /C`の外側引用符で起動する。従来commandはその内側にPowerShell `-Command "..."`を持っていたため、外側と内側のquote境界が衝突し、logger commandが期待どおり起動しなかった。Codex公式runner sourceのWindows `/C`実装と、同じnested quote問題を扱うOpenAI issueの報告、修正前の実Codex `Failed`、JSONL未生成が一致する。

### Secondary Cause: D / B — logger起動後のsandbox file I/O拒否

quoteを除去してloggerを起動できる状態にすると、現行Windows elevated sandboxが`.codex`をread-onlyとして扱うため、`log_event.mjs`の`.codex/logs`への`appendFileSync`が`EPERM`になった。これはpayload mismatchやloggerのJSONL実装不良ではなく、実行環境の書込み境界である。Git `safe.directory`の変更、PreToolUse security policyの変更、sandbox writable rootの追加は安全境界または通常tool実行を壊すため行わない。

### Validation limitation: C — `codex exec`のlifecycle JSONL観測

修正後の直接`codex exec`は`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Stop`をすべて`Completed`として表示し、toolも成功した。しかし同sessionのrepository Hook JSONLは生成されなかった。現行CLIの`codex exec`経路ではHook statusとproject Hook JSONLの永続化を同時に観測できない既知の制限があるため、CLI statusとlauncher/file I/Oを別evidenceとして扱う。対話TUIは組み込み`codex_apps`起動またはmodel request待ちでtool実行に到達しなかった。

## Evidence

- Codex Hook公式contract: command Hookはstdin JSONを受け、`command_windows`を使用でき、Stop系の正常stdoutは`{}`とする。
- Codex公式runner source: Windows default shellは`COMSPEC` / `cmd.exe`で`/C`を使い、stdin/stdout/stderrをpipeしてexit / timeoutを取得する。
- 修正前実行: logging 3 eventが`Failed`、PreToolUseが`Completed`、対象session JSONLなし。
- logger direct: PostToolUse / Stopとも正常なstdout、stderr、exit、JSONL追記。
- 修正後Codex CLI: session `01a062d7-1835-7921-b341-a434bda8257b`で全Hook status `Completed`、`node --version`は`v24.12.0`。
- 実sandbox launcher: PostToolUseは`launcher_exit=0`、stderr空、`.artifacts/codex-hooks`へPostToolUse recordを1行追記。Stopはstdout `{}`、`launcher_exit=0`、stderr空、同fallbackへStop recordを1行追記。
- session別JSONLはpayloadのbounded fieldsだけを保持し、diagnostic payloadにsecret / credentialは含めていない。

## Fix

- `.codex/config.toml`: 5つのWindows logging commandをquote-free PowerShell commandへ変更した。current cwdから親方向にloggerを探索し、Node / logger存在確認、Stop系`{}` fallback、最終`exit 0`を維持した。Unix command、PreToolUse policy、Windows PreToolUse transportは変更していない。
- `.codex/hooks/log_event.mjs`: `.codex/logs`をcanonical pathとして先にappendし、`EACCES`、`EPERM`、`EROFS`、`EEXIST`、`ENOTDIR`に限って`.artifacts/codex-hooks`へ同じbounded/redacted recordをfallbackする。無条件のstderr破棄、Hook無効化、security policy緩和は行っていない。
- `tests/contracts/codex-hook-contract.test.ts`: 実runnerに合わせた`cmd.exe /C`検証、embedded quote禁止、nested cwd、Stop stdout、fallback JSONLを回帰テストへ追加した。
- `scripts/verify.ps1`: Windows launcherの静的検査を、旧Git root commandではなく現行のcwd親探索（`Get-Location` / `Join-Path $current.FullName`）へ同期した。Unix側の`git rev-parse`検査は維持した。
- `docs/PROJECT_CONTEXT.md`、`docs/reference/run-artifacts.md`、`docs/reference/repair-loop.md`、`docs/adr/0020-codex-windows-logging-hook-launcher.md`、`docs/history/2026-09-03_010500_codex-hook-sandbox-fallback.md`: canonical/fallback logging境界とsecurity非変更の判断を記録した。

## Validation

実行結果はRun Artifactにも要約して保存した。

- `pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1`: PASS、1 file / 127 tests。
- `node --check .codex/hooks/log_event.mjs`: PASS。
- logger direct PostToolUse / Stop: PASS、stdout / stderr / exit / JSONLを確認済み。
- configured Windows launcher（nested cwd、5 events）: PASS、stdout / stderr / exit / JSONLを確認済み。
- 実Codex CLI tool実行: `node --version`成功、4 Hook status `Completed`。直接CLIのrepository JSONL永続化は未観測。
- 実Codex sandbox内のPostToolUse / Stop launcher: PASS、fallback JSONLとStop `{}`を確認済み。
- `pnpm exec eslint tests/contracts/codex-hook-contract.test.ts`: exit 0。既存の`Array<T>`警告1件のみ。
- `pnpm run lint:markdown`: PASS、354 files / 0 issues。
- `pnpm run format:check`: PASS。
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`: PASS、template contract / execpolicy / PowerShell wrapper preflight。
- `bash scripts/verify`: PASS、template contract / PowerShell wrapper preflight（execpolicy / Bash wrapperはこのWindows環境ではSKIP）。
- `pnpm run verify`: PASS。spec / curriculum、lint（0 errors / 65 warnings）、typecheck、security check、unit 66、integration 111、repository 38、component 150、contract 486 passed / 3 skipped、web build、docs build、spec buildを完了した。
- `git diff --check`: PASS。
- `scripts/sanitize-codex-artifacts.ps1 -Write` と`-Check`: PASS。
- 修正後の回帰テスト初回は、旧failure-safe assertionがfallbackを失敗扱いして1件失敗した。Repair Loopでassertionを「canonical logs unavailable時のfallback JSONL」へ更新し、同じcontract suiteを再実行して`127/127 PASS`とした。

## Remaining risks

- `codex exec`がHook statusを表示してもrepository Hook JSONLを保存しない実行経路差は、repo側だけでは解消できない。対話TUIでのfull lifecycle（tool 1回、PostToolUse、Stop、同一session JSONL）をこの環境では完走できなかったため、PRではこの制約を明記する。
- 現行sandboxではfallback logが`.artifacts/codex-hooks`へ保存される。`.artifacts/`は既存のGit管理外raw evidence運用に従い、Run manifestへ自動集約しない。
- `codex-task.ps1`の終了時`System.Object[]`から`System.Int32`への変換エラーは、Hook commandの失敗とは別のwrapper後処理問題として残る。
