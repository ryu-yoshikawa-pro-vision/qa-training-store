# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PR/branch/worktreeと旧Run履歴を確認し、参照・テスト・CIをread-only Roleに委任して調査した。
- [x] 2. `docs/plans/2026-11-17_231158_run-artifact-root-migration.md` に変更範囲、DoD、検証、rollbackを保存した。
- [x] 3. Bash／PowerShellの初期化とRun作成を `runs/` へ移す変更をworkerから受領し、Parentが差分をレビューした。
- [x] 4. Parentが `scripts/new-run.sh` を通じて `runs/20261117-233113-JST/` を作成し、machine-managed `run.json` を確認した。
- [x] 5. wrapper、collector、manifest/evaluation、scope/changed_filesを新旧root契約へ揃え、Parentが差分を確認した。
- [x] 6. sanitizer、CI/Husky、cleanup、QA/eval、品質検査のroot参照を更新し、Parentが確認した。
- [x] 7. 現行文書、PROJECT_CONTEXT/history、移行契約テストを更新し、Parentが確認した。
- [ ] 8. quality_gate_runnerで全必須ゲートと契約suiteを完了し、結果を分類する。security:check、通常ビルド、sanitizerを含む移行関連9ファイルはPASS。Hook契約139件もPASS。全契約suiteは完走したがGit、MCP stdio、ローカル待ち受け等で失敗。
- [x] 9. Parentが旧Run tree、sanitizer、最終diffとRun Artifactを検査する。
- [ ] 10. 許可済みの通常Git lifecycle、PR本文、最新HEADのWeb/Mobile App CIを確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- legacy `.codex/runs` のRun ID collisionは、既存ディレクトリだけでなくdangling symlinkも含めて拒否する。
- `scripts/cleanup-runs.*` にcleanup regression testがなく、隔離fixture追加が必要。
- CI/verifyの一部はchild template source repoを参照する設定で、このcheckoutに期待ファイルが無い可能性を確認する。
- `scripts/new-run.sh` の旧root書込み失敗はOS sandbox拒否だったが、従来メッセージが「すでに存在」と誤分類していた。
- wrapperのRun-local `logs/`、`artifacts/`、`reports/` symlink/reparse先を、書き込み前に検査しない経路が見つかった。Parentが外部書き込みを実行せず、pre-write rejectionとfixtureをworkerへ追加委任した。
- `tests/contracts/codex-task-native-command.test.ts` のPowerShell skip条件に未定義識別子があり、typecheckで検出。workerが同ファイルの既存変数名へ置換し、隔離checkoutで再実行したtypecheckはPASS。Git indexには未反映。
- Linux隔離checkoutでVitest 2セッションが長時間無出力のまま終了結果未取得。`test:contracts`全体にtimeoutはなく、migration contractにtimeoutなしの同期shell呼び出しがある。ソース調査で停止原因は特定できず、セッションは中断しない。

## Blocked（ブロック中）

- `pnpm run test:contracts --reporter=verbose` は完走したがexit 1。Git起動、MCP stdio、ローカル待ち受けが正常に使えるLinux環境で再確認が必要。
- 全必須ローカルゲートの完了を条件に、通常のcommit、対象branchへのpush、PR本文更新、最新HEADの必須CI確認を再開する。
- PowerShellのローカル実行は依頼により最終確認に保留。PowerShellコードの静的確認は実施済み。
