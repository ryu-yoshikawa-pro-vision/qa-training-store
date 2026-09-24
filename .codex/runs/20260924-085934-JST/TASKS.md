# Tasks（タスク）

## Now（現在）

- [x] 1. PR head、origin/main、worktree、最新CI、前回canonical result、Plan、対象runner/testを確認する。
- [x] 2. 今回のscope、停止条件、validation planをRun-local PLANへ記録する。canonical Planは変更しない。
- [x] 3. Common smoke writeをfile editing toolへ、command_executionを`git status --short`へ分離し、両predicateを独立して判定する。
- [x] 4. Prompt、command helper、predicate独立性、diagnosticsをWorkflow contract testで固定する。
- [x] 5. Focused test、Repository test、markdown/text quality、verify、diff checkを実行する。
- [ ] 6. Self-review、sanitization、scope確認後にimplementation commit / pushし、最新Evaluator head CIを確認する。
- [ ] 7. 新Evaluator SHAのtracked objectからfresh sanitized Targetを作り、detached以外のpreflightを完了する。
- [ ] 8. User manual detach後にTarget/Evaluator/Android final preflightをread-onlyで行う。
- [ ] 9. Canonical runnerを1回だけ実行し、resultをsanitizationする。Host refusalならcommand fallbackせず停止する。
- [ ] 10. Run Artifact-only commit / push、PR本文更新、最新head CIを確認する。

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
