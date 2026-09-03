# Codex Stop / PostToolUse Hook failure 調査・修正計画

## Goal

`qa-training-store` の `Stop` / `PostToolUse` Hook failureについて、UI表示ではなく、Codex runner、Windows/Unix launcher、`log_event.mjs`、ファイルI/O、Hook contractのどこで失敗しているかを証跡付きで特定する。安全に修正できる場合は、既存のloggingとPreToolUse security policyを維持した最小修正、回帰テスト、実Hook実行確認、commit / push / PRまで完了する。

## Current understanding

- 作業開始時のtreeはcleanで、指定branchは最新`main`と同一HEADから作成済み。
- 現在のproject-scoped `.codex/config.toml`は5つのlogging eventを定義し、WindowsではPowerShell launcherを使用する。
- `log_event.mjs`はstdin JSONを検証してsession別JSONLへ同期appendし、`Stop` / `SubagentStop`では`{}`をstdoutへ返す。
- 現行Codex CLIは0.152.1。現行セッションの保存済み履歴にはHook failure本文がなく、現セッション用のrepository JSONLも観測時点では生成されていない。
- 過去Runには、別worktreeでのrepo-root不一致によるlogger不存在／`MODULE_NOT_FOUND`と、Windows/Unix launcherの修正履歴がある。今回の現象と同一原因とはまだ断定しない。

## Assumptions

- 現行Windowsセッションをprimary reproduction surfaceとする。
- 実payloadは公式Hook contractと既存保存JSONLを基準にし、想像したschemaだけでは判定しない。
- secret、credential、絶対ローカルPath、生ログ全文はRun Artifactやdurable reportへ保存しない。

## Non-goals

- `hooks = false`、Hook削除、logger無効化、無条件fail-soft化。
- PreToolUse security policy、Hook infrastructure全体、無関係なproduct codeの変更。
- 原因未特定のworkaround投入。

## Impacted areas / files to inspect

- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `tests/contracts/codex-hook-contract.test.ts`
- `scripts/verify*`、Codex safety/implementation docs、関連ADR / plans / runs
- `.codex/logs/`とCodex側の安全な要約ログ

## Hypotheses

- H1: Windows runnerが`command_windows`のPowerShell／nested quoting／stdinまたはstdoutを想定と異なる形で扱う。
- H2: `log_event.mjs`の現行payload validation、stderr、exit status、stdout contract、同期appendのいずれかがCodex判定と不一致である。
- H3: repo-root、Node / PowerShell / PATH、worktree、権限、timeoutなど実行環境がlauncherを失敗させる。
- H4: 現在保存されている証跡が不足しており、今回の過去UI警告を一意に特定できない。

## Change strategy

1. branch、environment、現行config、実装、関連履歴、Codex公式contractを固定する。
2. Codex側の保存情報とrepo JSONLを時刻・session単位で照合し、stdout / stderr / exit / timeout / parsing errorを取得できる範囲で確認する。
3. 公式payloadを使ってlogger直接実行と、現行Windows/Unix launcherを実runner相当の経路で実行し、正常系・不正系・必要なI/O境界を記録する。
4. Root CauseとSecondary Causeを分類し、証拠が十分な場合のみ対象ファイルを最小変更する。
5. contract regression test、direct validation、configured launcher、actual Codex PostToolUse / Stop、relevant repository validationを順に実行する。
6. sanitized Run Artifactと必要なdurable reportを確定し、branch safety check後に今回のファイルだけをcommit、push、main向け日本語PR作成する。

## Validation plan

- `tests/contracts/codex-hook-contract.test.ts`または該当test suite
- `log_event.mjs`のPostToolUse / Stop direct execution（stdout、stderr、exit、JSONL）
- configured Windows launcherおよびUnix launcherの実行契約
- formatter / lint / `scripts/verify`と変更に関連する必須ゲート
- 実Codexセッションでtool実行後のPostToolUse、session終了時のStop、JSONL記録
- Run Artifact sanitizerのWrite / Check、最後にgit diff / branch / PR状態確認

## Risks / Open questions

- 現行Codex UIの過去警告と保存履歴の対応が不明で、完全再現できない可能性がある。
- Windows shellの実呼び出し方法を推測で固定しないため、installed Codexの実行結果または現行runnerで観測できる証跡を優先する。
- Hookログはpayloadの一部を含むため、diagnostic outputは限定し、raw outputはGit管理外に置く。

## Definition of Done

- Primary / Secondary Causeまたは安全に特定できない理由をEvidence付きで分類できる。
- Root Causeを安全に直接修正し、logging・security policy・両platform対応を維持する。
- automated / direct / actual Hook validationの結果を記録する。
- durable report、sanitized Run Artifact、branch commit、push、OPEN PRが整合する。
