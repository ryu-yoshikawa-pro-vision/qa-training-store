# Tasks

## Now

- 実行順に並べる（上から順に処理）。
- [x] 1. merge state、branch、PR #146/#147、Issue #135、Plan、stage 2/3、関連contractを確認し、修正範囲を確定する。
- [x] 2. bounded repairのPLAN、分類、許可範囲、検証方針を確定する。
- [x] 3. `docs/reference/codex-implementation-harness.md` の競合を両側の意図を保持して解消する。
- [x] 4. `scripts/verify` / `scripts/verify.ps1` と必要な関連ファイルで、PR #147契約とPR #146 Hook契約の共存を確認する。
- [x] 5. conflict marker、旧Hook config regex assertion、compact再注入、production rule、#135境界、変更scopeを確認する。
- [ ] 6. focused Hook contract、Bash / PowerShell Harness、format / lint / text / standard verify / diff checkを実行する。
- [x] 7. Run Artifactをappend-onlyで更新し、sanitizer Write / Check、merge結果、commit対象を検証する。
- [ ] 8. branch safetyを再確認し、通常のmerge commitを作成・pushしてlocal / remote / PR headを一致させる。
- [ ] 9. PR #146本文へmerge内容と検証結果を追記し、#134参照・OPEN状態を維持する。
- [ ] 10. 最新headのWeb CI、Mobile App CI、Windows Hook contractを確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- D1. push後に最新headの必須CI結果をPR本文へ反映する（checkboxには追加せず、完了条件のCI確認1件として扱う）。

## Blocked

- ブロック時のみ記載する。
