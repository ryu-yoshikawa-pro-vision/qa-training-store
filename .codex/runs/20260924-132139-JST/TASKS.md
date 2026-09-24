# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PR #179 / Issue #177 / latest main / specified filesをrebaselineし、差分overlapなしを確認する。
- [x] 2. repair-loop iteration 1、許可範囲、最小修復をPLANへ記録する。
- [x] 3. stage 0 CRLF / worktree LFのbehavior regression testを追加し、旧checkerで失敗することを確認する。
- [x] 4. staged Prettierの`endOfLine: "auto"` overrideだけを除去する。
- [x] 5. focused testを実行し、新旧EOL matrixを確認する。
- [x] 6. `format:check`、`format:check:strict`、`test:contracts`、`verify`、`git diff --check`を実行する。
- [x] 7. diff scopeを確認してRun Artifactをsanitizer検証し、commit前状態にする。
- [ ] 8. branch safety確認後commit / 通常pushし、local・remote・PR headを照合する。
- [ ] 9. 最新head Web CI / Mobile App CIを確認し、古くなった場合だけPR本文を更新する。
- [ ] 10. 未達件数を確定し最終報告する。

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
