# Tasks（タスク）

## Now（現在）

- [x] 1. PR #199、base/branch/head、指定Run、最新CI、Task Plan・Targetを再確認する。
- [x] 2. CIログ・Trace・Screenshot・error contextから失敗時の画面とブラウザー経路を確認する。
- [x] 3. Reset/Seed、正式BR/AC、screen→Use Case→Repositoryを照合しCheckout失敗を分類する。
- [x] 4. 最新CIの12対象を現行HEADから再確認し、内容不変の書式修正を行う。
- [x] 5. 直接テスト、`format:check:strict`、関連validatorを実行し、値と差分を検証する。
- [x] 6. 製品側の必要事項があればPR #210の既存管理資料へ記録する。PR #199の境界外ファイルは編集しない。
- [ ] 7. branch/current headの変化を確認し、通常push後に修正headの必須CIを確認する。
- [x] 8. Run Artifactをfinal commit前状態へ更新し、ファイル・検証・CI・未解決事項を報告する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。

## Blocked（ブロック中）

- ブロック時のみ記載する。
