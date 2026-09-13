# Tasks

## Now

- [x] 1. 開始状態、PR実HEAD、branch、base、直近Run、対象コード、CLIを確認する
- [x] 2. Strict repair Runと計画を初期化し、bounded scopeを固定する
- [x] 3. 修正前b323e06の回避入力を実測し、結果を保存する
- [x] 4. contractへnegative／positive代表例を追加し、修正前failureを確認する
- [x] 5. `assertEvidenceReference()`を共通原因に対して局所修正する
- [x] 6. focused／標準検証とscope監査を完了する
- [x] 7. sourceを1 commitへまとめ、修正後SHAを固定する
- [x] 8. 修正後SHAのTraining Copy prepare／validateを完了する
- [x] 9. branch safetyを確認してnon-force pushする
- [x] 10. 新HEADのWeb／Mobile／CodeQL CIとrequired jobを確認する
- [x] 11. PR本文をcurrent状態へ同期し、再確認する
- [ ] 12. Run evaluation／sanitizer、clean worktree、mergeなしを確認する（evaluation／sanitizerは確認済みだが、Strict Run machine statusはfailed）

## Discovered

- [ ] 13. `codex-task.ps1`修正後に同一Strict Runのmachine-managed verifyを再評価し、`run.json` completed / validation passedを確認する（Blocked by #145）

## Blocked

- Issue #145（https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/145）の`codex-task.ps1`不具合により、Run-local reportがverify標準出力を`verify_exit_code`へ配列として取り込み、要求されたcompleted／passed条件を満たさない。PR #133では修正せず、repair-loopを`stop_no_progress`で停止する。

Progress: 85% (11/13)
