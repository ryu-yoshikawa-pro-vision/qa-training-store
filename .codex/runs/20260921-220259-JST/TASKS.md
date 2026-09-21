# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. Plan全文とTask 0〜12の責務境界・成功判定を確認する。
- [x] 2. Task 0としてorigin/main、branch、PR、merge base、working tree、Hook、contract、CI、package、verify wrapperを再確認する。
- [x] 3. 実装用strict Runを標準経路で初期化し、Plan / TASKS / REPORTの入口を整える。
- [x] 4. Task 1〜4: Hook contract、shared state validator、baseline詳細code、safe causeを実装・回帰testする。
- [x] 5. Task 5〜6: `test:hooks`共通入口、wrapper統一、外部failure contractを実装・回帰testする。
- [x] 6. Task 7〜9: 読み取り専用doctorとtemp Git process contractを実装・回帰testする。
- [x] 7. Task 10〜12: offline切り分け、既存CI組み込み、運用文書を反映する。
- [x] 8. Planのfocused / wrapper / Repository標準 / 最終verifyを実行し、failureを原因確認・修正・再検証する。
- [x] 9. diff scope、Run Artifact sanitization / Check、commit対象とbranch safetyを最終確認する。
- [ ] 10. 通常commit・push、PR本文更新、最新headのUbuntu / Windows必須CIとaggregate verifyを確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 既存`node_modules`のtextlint関連junctionが`<PNPM_VIRTUAL_STORE>`を指し、現workspace外の依存を参照している。再インストールで環境要因を分離する。
- Bash wrapperはGit BashのPATHで`pnpm`からNodeが見えず、`node: not found`となった。PowerShell / Windows CI経路を主検証にし、Bash wrapperは環境復旧後に再実行する。

## Blocked（ブロック中）

- ブロック時のみ記載する。
