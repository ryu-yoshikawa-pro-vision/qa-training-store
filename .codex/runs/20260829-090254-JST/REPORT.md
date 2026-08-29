# Report (append-only)

- TASK完了、blocker、重要判断、計画変更、Run完了のcheckpointだけ追記する。
- 過去checkpointは削除・置換・並べ替えず、Summary / Progressも新checkpointとして追記する。
- Hook JSONLやrunnerが取得するmachine factをREPORTへ逐次転記しない。
- REPORTにはAIが残す意味情報だけを記録する。

## 2026-08-29 09:02 (JST)

- Summary: 調査Runを初期化し、Hook設定・実装・ログ・runtimeを確認する計画を確定した。
- Changes: 調査用Run Artifactのみ作成・更新した。製品コード、Hook設定、manifestは変更していない。
- Decision / Rationale: 過去の表示原因を推測で修正せず、まず保存済み証跡と現行失敗経路を切り分ける。
- Validation: 調査継続中。
- Blocker / Remaining: 原因特定には保存済みHookログの有無確認が必要。
- Subagents:
  - Delegation:
  - Result:
  - Parent decision:
- Progress: 20% (1/5)

## 2026-08-29 09:18 (JST)

- Summary: 現行実装・保存済みHook JSONL・Codex内部SQLiteログ・過去セッション履歴・実行環境を突き合わせた。
- Changes: 製品コード、Hook設定、manifest、過去Run Artifactは変更していない。調査Run Artifactのみ更新した。
- Decision / Rationale: `.codex/logs`のJSONLは失敗理由を記録しないため、Codex内部ログと過去セッションのcommandExecution結果を根拠にする。過去の実事例として、別worktreeでroot解決後の`log_event.mjs`不存在による`MODULE_NOT_FOUND`／exit 1、および修正途中のTOML parse errorを確認した。
- Validation: 現行branchのLogging Hook設定は有効で、TOMLも正常に解釈される。現行Windows sessionではLogging Hookの記録は正常で、malformed recordは確認されなかった。Bash/WSL側ではNode runtimeが利用できず、Unix launcher経路ではHook起動失敗の可能性がある。
- Blocker / Remaining: 現行Windows commandのcontract testを追加で実行し、過去事例と現行状態を分けて確定する。
- Progress: 60% (3/5)

## 2026-08-29 09:21 (JST)

- Summary: `PostToolUse hook (failed)` の過去事例について、主因をworktree／project rootの不一致によるHook実体不在と特定した。現行branchでの再発は確認されなかった。
- Evidence: 保存済みcommandExecutionでは、別worktreeでproject root配下の`log_event.mjs`が存在せず、Hook実行時に`MODULE_NOT_FOUND`となった事例を確認した。これはlogger本体のpayload処理ではなく、Hook起動先の実体不在である。
- Secondary findings: Windows command修正途中に一時的なTOML parse errorが発生したが、現在のconfigには残っていない。Unix/WSL側ではNode runtime不足により、Unix launcher経路でHook起動失敗が起こり得る。
- Current state: `.codex/config.toml`の`PostToolUse`設定とtimeoutは有効で、TOML parseはPASS。Windows nested-cwd contract testは利用可能な経路でPASSし、利用不能な経路はSKIPされた。repo rootは`<REPO_ROOT>`で、branchは`fix/run-json-machine-managed-contract`。
- Scope decision: 調査のみで完了。Hook、schema、manifest、product code、過去Run Artifact、global configは変更していない。新しいshim、PATH改変、runtime abstractionも追加していない。
- Validation: `pnpm run lint:markdown`、`git diff --check`、Run Artifact Sanitizer Write/CheckはいずれもPASS。
- Blocker / Remaining: 過去表示そのもののUIイベントには失敗理由の永続ログがなく、発生時刻を指定しない限り全履歴から単一イベントを断定することはできない。ただし保存済みの最も具体的な実事例は上記root mismatchで説明できる。再発時は、発生時刻・Codex起動shell・作業cwd・`git rev-parse --show-toplevel`・Hook stderrを同時に採取する。
- Progress: 100% (5/5)

## Deletion candidates

- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |
