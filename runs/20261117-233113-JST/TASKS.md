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
- [x] 8. Linux 専用 PATH で全契約 suite、正式な security:check、lint、typecheck、format、Markdown lint、Bash verify、Web ビルド、Native Static を完了した。初回の失敗と最終結果は REPORT.md に記録した。
- [x] 9. Parentが旧Run tree、sanitizer、最終diffとRun Artifactを検査する。
- [x] 10. 通常の Git 操作に向けて PR の HEAD、ブランチ、追跡先、変更範囲、通常の hook を確認した。push 後の必須 CI は PR 本文に記録する。
- [x] 11. 指定HEAD・PR状態・作業ツリーと既存CIを再確認し、Linux運用記述との整合性をread-only Roleへ委任して確認した。
- [x] 12. READMEとimplementation harnessの必要最小限の文書差分を実装し、他の指定文書に実際の矛盾がないことをParentがレビューした。
- [x] 13. 文書差分を自己レビューし、コード・設定・CI・テスト・依存関係に変更がないことを確認した。
- [x] 14. 指定されたLinux文書品質ゲート、差分、Run Artifactサニタイズを実行し、結果をREPORTへ記録する。
- [x] 15. 最終文書差分とRun Artifactをstageし、staged品質、staged sanitizer、差分検査を実行する。
- [x] 16. Codex runtime write root移行の修正前失敗を同一Linux sandboxで再現し、差分なしを確認する。
- [x] 17. wrapper、Hook、cleanup、sanitizer/security、関連テストと文書をread-only Roleに委任して調査する。
- [x] 18. 追加taskの計画を新規docs planと本Runへ記録し、変更範囲を確定する。
- [x] 19. codex-safe/taskの既定保存先を移し、Run ID・明示パス契約とexecpolicy fail-closed動作を維持する。
- [x] 20. Hook、cleanup、root logs ignore、staged sanitizer/credential scanを新しい保存先へ揃える。
- [x] 21. 関連contract tests・Windows CIのfocused test選択と現行運用文書を更新し、既存`.codex/`履歴とfallbackの保持を確認する。
- [x] 22. 指定のLinux再現・品質ゲートと関連契約テストを実行する。実行制限による失敗は原因を分類してREPORTへ記録した。
- [x] 23. Run Artifactをsanitizeし、stage後のquality/sanitizerと最終差分を確認する。
- [x] 24. コミット前にPRのHEAD／open状態、branch/upstream、staged差分と対象範囲を照合し、通常commit/pushとPR本文更新の前提を確認する。
- [x] 25. Windows CIのsanitizer path casing期待値とテスト選択を修復し、対象契約とformatを再確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- [x] WSL2 の独立 checkout、Linux ツールと依存、Windows 側の状態を確認する。
- [x] Web の Git porcelain パス契約を修正し、対象回帰テストを実行する。
- [x] Expo SDK 57 の互換性の差分を確認し、Mobile のバージョン検査を修復する。
- [x] Dependency Review の minimatch 指摘を修復し、依存先の互換性を確認した。
- [x] Android Runtime の証拠と成功 run を比較し、SQLite のソースビルド設定を追加した。APK と対象フローの確認は push 後の CI で行う。
- [x] Bash verify の可用性確認と JSON 解析を修正し、execpolicy と Bash wrapper の成功を確認した。
- [x] 最終差分の Linux ゲートと変更範囲を確認した。最終ステージの検査を通して通常の Git 操作へ進む。

- 調査中のsecurity dependency validator契約失敗は、同一sandboxでの直接診断がNode子プロセス起動`EPERM`を返すことを確認した。該当validator/testは未変更で、未検証のPASSへ置き換えていない。
- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- legacy `.codex/runs` のRun ID collisionは、既存ディレクトリだけでなくdangling symlinkも含めて拒否する。
- `scripts/cleanup-runs.*` にcleanup regression testがなく、隔離fixture追加が必要。
- CI/verifyの一部はchild template source repoを参照する設定で、このcheckoutに期待ファイルが無い可能性を確認する。
- `scripts/new-run.sh` の旧root書込み失敗はOS sandbox拒否だったが、従来メッセージが「すでに存在」と誤分類していた。
- wrapperのRun-local `logs/`、`artifacts/`、`reports/` symlink/reparse先を、書き込み前に検査しない経路が見つかった。Parentが外部書き込みを実行せず、pre-write rejectionとfixtureをworkerへ追加委任した。
- `tests/contracts/codex-task-native-command.test.ts` のPowerShell skip条件に未定義識別子があり、typecheckで検出。workerが同ファイルの既存変数名へ置換し、隔離checkoutで再実行したtypecheckはPASS。Git indexには未反映。
- Linux隔離checkoutでVitest 2セッションが長時間無出力のまま終了結果未取得。`test:contracts`全体にtimeoutはなく、migration contractにtimeoutなしの同期shell呼び出しがある。ソース調査で停止原因は特定できず、セッションは中断しない。

## Deferred outside DoD（完了条件外）

- Windows PowerShellのローカル実行は本タスクの完了条件外。未検証のWindowsローカル動作はPR本文に未検証と明記する。GitHub ActionsのWindows CIは通常の必須確認に含める。

## Resolved blockers（解消済み）

- 修正前の`.codex/logs/` read-only失敗はroot `logs/`への移行後に解消し、`codex-safe --preflight-only`とBash `scripts/verify`が同一sandboxで成功した。
- 全contract suiteなどに残る`spawnSync git EPERM`、localhost `listen EPERM`、MCP接続終了はsandbox実行制限として記録した。未変更の`security-dependency-fix-validator`で空stderrとなるケースは同じsandboxの直接診断で`spawnSync .../node EPERM`を再現し、validator/testの実装不具合とは扱っていない。

## Progress

Progress: 100% (32/32)

## Post-commit lifecycle

- 通常commit／push後のPR本文更新と最新HEADのWeb／Mobile CI確認は、implementation harnessのpost-commit lifecycleで行う。結果はPR本文と最終報告へ記録する。
