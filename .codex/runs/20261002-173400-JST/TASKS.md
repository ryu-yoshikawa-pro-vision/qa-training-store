# Tasks（タスク）

## Now（現在）

- [x] 1. Repositoryのtoolchain、OpenCode既存設定、Codex harness、Native境界を確認する。
- [x] 2. Codespaces / Dev Containers / OpenCode / Codexの公式仕様を確認する。
- [x] 3. branchとcanonical Planを作成し、PR #188をDraftで作成する。
- [x] 4. public Repository / OpenCode学習利用前提をPlanへ反映する。
- [x] 5. Fresh Create、OpenCode auto update、Codex auth / harness等の初回レビューをPlanへ反映する。
- [x] 6. dotfiles、Zen認証、Codex device auth、`ci_wait`、install provenanceをPlanへ反映する。
- [x] 7. candidate SHA順序、Hook実Runtime / subagentをPlanへ反映する。
- [x] 8. OpenCodeのmodel選択をユーザー管理へ変更し、Free-only関連を削除する。
- [x] 9. candidate precondition、branch freeze、model能力条件、CI正本、postCreate実行契約をPlanへ反映する。
- [x] 10. plain/target provenance分離、Zen認証証明、dotfiles復元、Codespace cleanup、waitFor、target verify、ci_wait token契約等を最終反映する。
- [ ] 11. Phase A: baseline main / PR head、Repository契約、current公式仕様を再確認する。
- [ ] 12. OpenCode / Codexのlatest non-prerelease stableを公式source間で照合しexact versionを固定する。
- [ ] 13. Personal dotfilesの元状態 / repositoryを記録し、一時的に無効化する。
- [ ] 14. Personal `OPENCODE_API_KEY` Codespaces Secretを確認する。
- [ ] 15. baseline PR headからdotfilesなしplain Codespaceを作成し、HEAD / default config / frozen installを確認する。
- [ ] 16. OpenCode exact install、baseline provenance、Personal SecretのZen credential利用、Zen smokeを検証する。
- [ ] 17. Codex exact install、baseline provenance、device-code authenticationを検証する。
- [ ] 18. Codex `test:hooks` / trust / preflight / same-session Hook runtime / bounded subagentを検証する。
- [ ] 19. `GH_TOKEN`を除外し、`ci_wait` server startup / tool discovery / GitHub read-only connectivityを検証する。wait toolは呼ばない。
- [ ] 20. Phase B→C checkpointへexact version / install / auth / smoke / fallback config契約を固定する。
- [ ] 21. `waitFor: "postCreateCommand"`とworkspace root・逐次・fail-fastの`.devcontainer/devcontainer.json`を実装する。
- [ ] 22. READMEを更新する。
- [ ] 23. candidate作成前に`pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 24. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録してbranchをfreezeする。
- [ ] 25. candidate SHA / clean worktree /対象Codespaceを確認し、control shellからFull Rebuildする。
- [ ] 26. Full Rebuild内でtarget CLI contract、OpenCode / Codex integration、`pnpm run verify`、Web smokeを確認する。
- [ ] 27. remote head == candidate SHAを確認し、explicit devcontainer pathでdotfilesなしFresh Codespaceを作成する。
- [ ] 28. Fresh CreateでHEAD / devcontainerPath / dotfiles未適用 /認証zero-state / target contractを確認する。
- [ ] 29. Fresh CreateでOpenCode / Codex integration、`pnpm run verify`、Web smokeを確認する。
- [ ] 30. Fresh Create後に環境影響差分が出た場合は新candidate SHAを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 31. Personal dotfiles設定をPhase Aの元状態へ復元する。
- [ ] 32. validation-only Codespaceをstopし、継続利用候補 / delete候補をREPORTへ記録する。
- [ ] 33. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 34. final working treeで`pnpm run verify` / `git diff --check`を再実行する。
- [ ] 35. tracked Run Artifact / Planを最終状態へ更新して通常commit / pushする。
- [ ] 36. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。

## 正本

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`

## 必須CI

- checkboxには含めない。
- file-changing taskのProgressではcheckbox総数にCI確認1件を加算する。
- final push後、`GH_TOKEN`を除外したcanonical token条件でexact HEADを指定し`wait_for_required_ci`を1回だけ呼ぶ。
- `Web CI` / `Mobile App CI`の両方がsuccessし、PR本文更新まで完了した時点でCI確認1件を完了扱いにする。
- waiter利用不能時はblocker。Agent自身のpollingへfallbackしない。
- CI結果記録だけを理由にこのfileを再commitしない。

## Blocked（ブロック中）

- なし。

Progress: 27% (10/37、必須CI確認1件を含む)
