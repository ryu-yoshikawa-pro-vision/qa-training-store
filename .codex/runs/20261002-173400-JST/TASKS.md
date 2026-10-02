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
- [x] 9. candidate precondition、branch freeze、model能力条件、CI正本、postCreate実行契約をPlanへ反映する。
- [ ] 10. Phase A: latest main / branch / Repository契約 / current公式仕様を再確認する。
- [ ] 11. Personal `OPENCODE_API_KEY` Codespaces Secretを確認し、Personal dotfilesを無効化する。
- [ ] 12. dotfilesなしの新規plain Codespace baselineを作成しfrozen installを確認する。
- [ ] 13. OpenCode stable exact install、install provenance、Zen認証を検証する。
- [ ] 14. 必要な能力を持つユーザー選択modelでOpenCode read-only / development smokeとversion固定を確認する。
- [ ] 15. Codex stable exact installと代替認証環境変数監査を行う。
- [ ] 16. Codex device-code authentication / login statusを確認する。
- [ ] 17. Codex `test:hooks` / project trust / Hook trust / readonly preflight / `ci_wait` を検証する。
- [ ] 18. Codex read-only / development smokeとsame-session Hook runtime evidenceを確認する。
- [ ] 19. bounded read-only subagentを1回実行しSubagentStart / SubagentStopを確認する。
- [ ] 20. Phase B→C checkpointをcanonical Plan / active Runへ固定する。
- [ ] 21. workspace root・逐次・fail-fastの `.devcontainer/devcontainer.json` を実装する。
- [ ] 22. READMEを更新する。
- [ ] 23. candidate作成前に `pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 24. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録してbranchをfreezeする。
- [ ] 25. candidate SHA / clean worktree /対象Codespaceを確認し、`gh codespace rebuild --full -c <codespace-name>` で統合検証する。
- [ ] 26. remote branch head == candidate SHAを確認し、同じcandidate branchからdotfilesなしFresh Codespaceを作成してHEAD一致を確認する。
- [ ] 27. Web 8081 forwarded portをFull Rebuild / Fresh Createの両方で確認する。
- [ ] 28. Fresh Create後に環境影響差分が出た場合は新candidate SHAを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 29. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 30. final working treeで `pnpm run verify` / `git diff --check` を再実行する。
- [ ] 31. tracked Run Artifact / Planを最終状態へ更新して通常commit / pushする。
- [ ] 32. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。

## 正本

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`

## 必須CI

- checkboxには含めない。
- file-changing taskのProgressでは、上記checkbox総数にCI確認1件を加算する。
- final push後にexact HEADを指定して `wait_for_required_ci` を1回だけ呼ぶ。
- current contractでは `Web CI` / `Mobile App CI` の両方がsuccessし、PR本文更新まで完了した時点でCI確認1件を完了扱いにする。
- waiter利用不能時はblocker。Agent自身のpollingへfallbackしない。
- CI結果記録だけを理由にこのfileを再commitしない。

## Blocked（ブロック中）

- なし。

Progress: 27% (9/33、必須CI確認1件を含む)
