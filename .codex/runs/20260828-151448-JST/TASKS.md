# Tasks

## Now

- [x] 1. 現行Codex CLIで5eventのinput / stdout / exit semantics、Tool coverage、`SubagentStop` / `Stop`の`stop_hook_active`を実機確認する。
- [x] 2. repo-wide searchでlegacy stack内部とlegacy stack外の独立dependencyを切り分ける。
- [x] 3. `.codex/hooks/log_event.mjs`をcanonical Node Hook loggerとして実装する。
- [x] 4. `.codex/config.toml`へ5eventをrepo-root基準で接続し、timeoutを5秒にする。
- [x] 5. `.codex/logs/*.jsonl`のGit非管理を確認し、専用tracking例外を追加しない。
- [x] 6. `AGENTS.md` / `.codex/templates/REPORT.md`をcheckpoint責務へ変更する。
- [x] 7. Subagent利用時のDelegation / Result / Parent decision checkpoint契約を反映する。
- [x] 8. `.codex/templates/subagent-run.schema.json`を削除する。
- [x] 9. `collect_subagents()`とRun-local Subagent JSONのvalidation / aggregationを削除する。
- [x] 10. 旧Subagent専用manifest field / tests / docsを新規Run構成から削除し、`agents_used`をv2から削除する。
- [x] 11. 旧Hook observation scripts、環境変数、collector引数、schema、manifest field、関連docs / testsを削除する。
- [x] 12. cleanupの旧observation専用branchだけを削除し、`.codex/logs/*.jsonl` generic cleanupを維持する。
- [x] 13. observer由来safety fieldをproducer / consumer単位で整理し、独立scope／networkだけを維持する。
- [x] 14. template、collector、codex-task.ps1/shの全manifest writerをschema v2へ揃える。
- [x] 15. collector／wrapper mergeでv2へ廃止v1 fieldを再注入せず、既存v1のlegacy valueだけを保持する。
- [x] 16. `changed_files` / `safety.scope_violation` / validation / evaluationへの副作用を確認する。
- [x] 17. `tests/contracts/codex-hook-contract.test.ts`をHook／logger／test隔離契約まで更新する。
- [x] 18. `docs/reference/codex-implementation-harness.md`等のactive docsを新責務へ更新する。
- [x] 19. 最終config／logger確定後にproject-local Hook trust状態を確認する。
- [x] 20. targeted tests、Windows full Hook smoke、Unix代表Hook smoke、verifyを実施する。

## Discovered

- [x] 21. レビュー指摘として、対象Runのv1→v2変化を履歴・初期化・writer実行記録から調査し、証跡を壊さず原因と判断を記録する。
- [x] 22. collectorのmixed-version mergeでexisting manifestのversionを正本にし、v2 downgrade防止とv1 legacy value preservationのcontract testを追加する。
- [x] 23. `last_assistant_message: null`を省略保存へ修正し、`Stop` / `SubagentStop`のnull contract testを追加する。

## Blocked

- なし。Task 1のnative `SubagentStart` / `SubagentStop`ライブ発生確認を完了した。
