# Plan

## Objective

- `Stop` / `PostToolUse` Hook failureの実原因をCodex runner、launcher、logger、I/O、contractの境界ごとに特定する。
- 原因がEvidence付きで特定でき、安全な最小修正が可能な場合にのみ修正し、loggingとPreToolUse security policyを維持する。
- direct / configured / actual Codex validationを完了し、sanitized artifact、commit、push、PRへ引き渡す。

## Scope

- In: `.codex/config.toml`、`.codex/hooks/`、Hook contract tests、relevant scripts/docs/ADR、`.codex/logs/`、Codex実行環境、Run / durable report、必要な最小修正。
- Out: Hook無効化、failure隠蔽、security policy緩和、Hook infrastructure全体の再設計、無関係なproduct code。

## Assumptions / Questions

- 現行Windows Codex CLI 0.152.1と現行project configをprimary surfaceとする。
- 公式Hook contractと既存保存JSONLをpayloadの基準とする。
- 現行セッションの保存履歴にはHook failure本文がなく、過去UI警告を一意に対応付けられない可能性がある。
- 修正後のWindows launcherはloggerを起動できるが、現行のWindows elevated sandboxでは`.codex`がread-only carveoutとなり、`.codex/logs`へのappendが`EPERM`になる。`.codex/logs`だけを追加writable rootへ指定するCLI上書きは、同sandboxの通常tool起動を拒否するため安全な既定解とはしない。
- 未回答: Codex UIが表示した対象turnの正確なtimestamp、実runnerが報告した元のstderr / exit code / timeout。

## Hypotheses

- H1: Windows `command_windows`のPowerShell nested quoting、stdin、stdout、またはrunner parsingの差異。
- H2: loggerのpayload validation、stderr / exit、Stop stdout contract、または同期append。
- H3: repo-root、Node / PowerShell / PATH、worktree、権限、timeout。
- H4: 保存証跡不足による非再現・誤帰属。
- H5: Codex sandboxの`.codex` read-only boundaryが、quote修正後のlogger file I/Oを二次的に失敗させる。

## Research Plan

1. branch、environment、config、logger、関連Hook、scripts/docs、ADR、過去Runを固定する。
2. Codex側保存履歴とrepo JSONLをsession / 時刻単位で照合する。
3. 公式payloadを使いloggerとlauncherをdirect / runner相当経路で検証する。
4. Root Cause / Secondary Causeを分類し、必要な場合のみ修正と回帰テストを実施する。sandboxのpermission policy自体は変更せず、既存canonical logを優先し、既知のpermission/path failure時だけworkspace内のignored fallbackへ記録する案を検証する。
5. relevant gates、actual PostToolUse / Stop、JSONL、sanitizer、Git / PRを確認する。

## Definition of Done

- 原因または安全に特定できない根拠がEvidence付きで記録される。
- 修正時はlogging、Windows / Unix対応、security policyが維持され、回帰テストがある。
- direct / configured / actual Hook validationが完了し、durable reportとRun Artifactがsanitizedされる。
- 指定branchへ今回の変更だけをcommit / pushし、main向けOPEN PRを作成する。

## Thinking Log

- 2026-09-02: 保存済み履歴と内部SQLite検索では、UI文言そのもののHook execution errorはまだ確認できなかった。失敗なしとは判断せず、実行経路ごとの再現を優先する。
