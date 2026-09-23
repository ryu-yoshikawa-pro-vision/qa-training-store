# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PR #179最新head、Issue #177、保存Plan、適用指示、最新mainとの差分をrebaselineする。
- [x] 2. Phase 1のWindows current worktreeをread-only観測し、EOL / config / attributes / Prettier結果を記録する。
- [x] 3. Phase 2で同一Git metadataのlinked worktreeと独立fresh cloneを比較する。
- [x] 4. Phase 3で独立Repository上の操作を順に試し、CRLF発生条件を再現・特定する。
- [x] 5. EOL Case A/B/Cを選び、必要な場合だけPhase 5の安全条件でworktree修復する。
- [x] 6. Phase 6でHusky Case Dと`security:check`の責務をcommand単位で判断する。
- [x] 7. 採用したHusky境界を実装し、staged index / config mismatch / security契約の回帰testを整える。
- [x] 8. Phase 7でCodex Hook Case Eを選び、actual linked worktree回帰を実装する。
- [x] 9. Phase 8でdiagnostics Case Fを選び、dependency不足とexit code回帰を実装する。
- [x] 10. Phase 9で変更を統合し、focused test・actual linked worktree・実`git commit`受入を行う。
- [ ] 11. Windows / Git保存 / format matrix / `test:hooks` / `test:contracts` / `verify` / sanitizer / `git diff --check`を検証する。
- [x] 12. Plan「## 10. 完了条件」の各項目へEvidenceを対応づけ、Run Artifactをfinal commit前状態へ確定する。
- [ ] 13. branch safetyを再確認してcommit / pushし、最新PR headのWeb CI / Mobile App CIとPR本文の結果を確認する。
- [ ] 14. 未達項目の有無を確定して最終報告する。

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

- Task 11の`verify`: `lint:markdown`が保存済みPlan `docs/plans/2026-09-23_132000_issue-177-windows-crlf-prettier.md`に21件を報告。Planは既存の明示的な不編集指示に従って維持し、独立した後続gateは個別検証した。Plan書式変更の許可がないため未修正。
