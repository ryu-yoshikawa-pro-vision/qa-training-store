# Tasks（タスク）

## Now（現在）

- [x] 1. PR head、origin/main、worktree、既存CI、前回result、対象helperとtestを確認する。
- [x] 2. repair Run Artifactを作成し、対象範囲と原因を記録する。
- [x] 3. sourceStatusOutsideRunArtifacts()だけでraw porcelainを取得し、固定幅status列を維持する。
- [x] 4. tracked unstaged / untracked Run Artifact、source-only、mixed変更の実Git回帰testを追加する。
- [x] 5. focused trigger / workflow testsを実行する。
- [x] 6. repository test、markdown lint、verify、TypeScript lint/typecheck、diff checkを実行する。
- [x] 7. self-reviewし、Run Artifactをsanitizationしてimplementation commit前の状態を確定する。
- [x] 8. implementationを通常commit / pushし、新Evaluator SHAと最新head CIを確認する。
- [x] 9. 新Evaluator SHAからfresh sanitized Targetを生成し、root commitとdetach以外のpreflightを完了する。
- [x] 10. ユーザーmanual detach後にTarget / Evaluator / Android preflightを確認する。
- [x] 11. canonical live Workflow E2Eを1回実行し、blocked resultと成功条件を検証する（成功条件未達）。
- [ ] 12. Run Artifactをsanitization後、Artifact-only commit / push、PR本文更新、最新head CI確認を行う。

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
