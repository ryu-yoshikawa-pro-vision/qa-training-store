# Tasks（タスク）

## Now（現在）

- [x] 1. PR / branch / main / worktree / CI / current Plan / 対象実装の開始状態を確認する。
- [x] 2. 今回の範囲、停止条件、検証計画をPlanへ記録する。
- [x] 3. Case B tracked diff検査をGit exit statusでfail-closeし、実Git回帰testを追加する。
- [x] 4. Workflow preflight isolation、output boundary、blocked provenanceを修正し実Git fixture testを追加する。
- [x] 5. Trigger source status rename検出と回帰testを追加する。
- [x] 6. Workflow final success gateをstage実体とstage ID順へ整合させる。
- [x] 7. canonical Plan commandへrouting source SHAを追加する。
- [x] 8. focused / repository / verify / diff / sanitizer / self-reviewを完了する。
- [ ] 9. source修正をcommit / pushし、最新head CIを確認する。
- [ ] 10. 新Evaluator SHA由来fresh Targetを生成し、必要なmanual detach / workspace root変更を依頼する。
- [ ] 11. detach後preflightとAndroid確認を行い、canonical runを1回実行する。
- [ ] 12. resultをsanitizationしartifact-only commit / push、PR本文更新、最新head CIを確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- `origin/main`はPR baseより1 commit先行しているが、追加分はIssue #132文書 / Run ArtifactでPRはmergeable。今回の対象差分はレビュー時点から変化なし。

## Blocked（ブロック中）

- canonical run準備でmanual Target detachまたはHost workspace root変更が必要になった場合、runner実行前に停止してユーザーへ依頼する。
