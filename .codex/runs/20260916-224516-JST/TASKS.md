# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PLANを確定する。
- [x] 2. 修正前focused/file単体とWindows環境情報を記録する。
- [x] 3. logging/Stop launcher invocationとfixture/cleanupを計測する。
- [x] 4. 原因判定と必要最小限の実装・回帰testを完了する。
- [x] 5. temporary計測を除去し、ローカル品質ゲートを完走する。
- [x] 6. 変更範囲と関連contract維持を確認する。
- [x] 7. Run Artifactをfinal commit前状態まで更新・sanitizer検証する。
- [x] 8. commit/push対象を確定する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- [x] Issue作成後に`origin/main`が3コミット進んでいたため、固有commitのない指定branch refを`origin/main`へ安全にfast-forward同期した。
- [x] 修正前のcombined focused・logging単体・Stop単体はいずれもこのWindows環境でPASSした。Issue当時のtimeoutは現時点で再現していない。
- [ ] GitHub Actionsの最新head CI結果を確認する。

## Blocked（ブロック中）

- ブロック時のみ記載する。
