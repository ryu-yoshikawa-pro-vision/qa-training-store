# Tasks（タスク）

## Now（現在）

- [x] 1. Repositoryのtoolchain、OpenCode既存設定、Codex harness、Native境界を確認する。
- [x] 2. Codespaces / Dev Containers / OpenCode / Codexの公式仕様を確認する。
- [x] 3. branchとcanonical Planを作成し、PR #188をDraftで作成する。
- [x] 4. public Repository / OpenCode学習利用前提をPlanへ反映する。
- [x] 5. Fresh Create、OpenCode auto update、Codex auth / harness等の初回レビューをPlanへ反映する。
- [x] 6. dotfiles、Zen認証、Codex device auth、`ci_wait`、install provenanceをPlanへ反映する。
- [x] 7. candidate SHA順序、Hook実Runtime / subagentをPlanへ反映する。
- [x] 8. OpenCodeのmodel選択をユーザー管理へ変更し、Free-only / pricing / negative control / usage監査を削除する。
- [ ] 9. Phase A: latest main / branch / Repository契約 / current公式仕様を再確認する。
- [ ] 10. Personal `OPENCODE_API_KEY` Codespaces Secretを確認し、Personal dotfilesを無効化する。
- [ ] 11. dotfilesなしの新規plain Codespace baselineを作成しfrozen installを確認する。
- [ ] 12. OpenCode stable exact install、install provenance、Zen認証を検証する。
- [ ] 13. ユーザーが選択した任意のOpenCode modelでread-only / development smokeとversion固定を確認する。
- [ ] 14. Codex stable exact installと代替認証環境変数監査を行う。
- [ ] 15. Codex device-code authentication / login statusを確認する。
- [ ] 16. Codex `test:hooks` / project trust / Hook trust / readonly preflight / `ci_wait` を検証する。
- [ ] 17. Codex read-only / development smokeとsame-session Hook runtime evidenceを確認する。
- [ ] 18. bounded read-only subagentを1回実行しSubagentStart / SubagentStopを確認する。
- [ ] 19. Phase B→C checkpointをcanonical Plan / active Runへ固定する。
- [ ] 20. `.devcontainer/devcontainer.json` を実装する。
- [ ] 21. READMEを更新する。
- [ ] 22. candidate作成前に `pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 23. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録する。
- [ ] 24. candidate SHAで `gh codespace rebuild --full` を実行し統合検証する。
- [ ] 25. 同じcandidate SHAからdotfilesなしFresh Codespaceを作成し統合検証する。
- [ ] 26. Web 8081 forwarded portをFull Rebuild / Fresh Createの両方で確認する。
- [ ] 27. Fresh Create後に環境影響差分が出た場合は新candidate SHAを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 28. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 29. final working treeで `pnpm run verify` / `git diff --check` を再実行する。
- [ ] 30. 最終記録を通常commit / pushする。
- [ ] 31. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。
- [ ] 32. latest head必須CIを確認する。

## 正本

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`

## Blocked（ブロック中）

- なし。

Progress: 25% (8/32)
