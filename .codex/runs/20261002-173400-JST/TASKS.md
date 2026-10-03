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
- [x] 10. plain/target provenance分離、Zen認証証明、dotfiles復元、Codespace cleanup、waitFor、target verify、ci_wait token契約等を反映する。
- [x] 11. 異常終了cleanup、Phase B→candidate同期、B→C install戦略、CODEX_HOME、Full Rebuild zero-state、final CI順序、OpenCode permission境界等を最終反映する。
- [ ] 12. Phase A: baseline main / PR head、Repository契約、current公式仕様を再確認する。
- [ ] 13. OpenCode / Codexの正規distributionからlatest non-prerelease stableとexact install sourceを固定する。
- [ ] 14. Personal dotfilesの元状態 / repositoryを記録し、一時的に無効化する。
- [ ] 15. Personal `OPENCODE_API_KEY` Codespaces Secretを確認し、既存Repository accessを破壊せず`qa-training-store`を利用可能にする。
- [ ] 16. baseline PR headからdotfilesなしplain Codespaceを作成し、HEAD / default config / frozen installを確認する。
- [ ] 17. OpenCode exact install、baseline provenance、credential-specificなPersonal Secret利用、Zen smokeを検証する。
- [ ] 18. Codex exact install、baseline provenance、effective `CODEX_HOME`、device-code authenticationを検証する。
- [ ] 19. Codex `test:hooks` / trust / preflight / same-session Hook runtime / bounded subagentを同じ`CODEX_HOME`で検証する。
- [ ] 20. `GH_TOKEN`を除外し、`ci_wait` server startup / tool discovery / GitHub read-only connectivityを検証する。wait toolは呼ばない。
- [ ] 21. Phase B→C checkpointへexact version / auth / target node install戦略 / CODEX_HOME / postCreate / smoke契約を固定する。
- [ ] 22. `waitFor: "postCreateCommand"`とcheckpointどおりの逐次・fail-fastな`.devcontainer/devcontainer.json`を実装する。OpenCode permissionはupstream defaultのままとする。
- [ ] 23. READMEを更新する。
- [ ] 24. candidate作成前に`pnpm run verify` / `git diff --check` / scope確認を行う。
- [ ] 25. 環境影響変更をcandidate commitへ含めて通常pushし、candidate SHAを記録してbranchをfreezeする。
- [ ] 26. Phase B Codespaceをclean確認後に`fetch` + `merge --ff-only`でcandidate SHAへ同期する。
- [ ] 27. candidate SHA / clean worktreeを確認し、control shellからFull Rebuildする。Rebuild後の`devcontainerPath`を確認する。
- [ ] 28. Full Rebuild内で認証zero-state、target CLI contract / CODEX_HOME、OpenCode / Codex integration、`pnpm run verify`、Web smokeを確認する。
- [ ] 29. remote head == candidate SHAを確認し、explicit devcontainer pathでdotfilesなしFresh Codespaceを作成する。
- [ ] 30. Fresh CreateでHEAD / devcontainerPath / dotfiles未適用 / Codex login status zero-state / target contractを確認する。
- [ ] 31. Fresh CreateでOpenCode / Codex integration、`pnpm run verify`、Web smokeを確認する。
- [ ] 32. Fresh Create後に環境影響差分が出た場合は新candidate SHAを作り、Full Rebuild / Fresh Createを両方やり直す。
- [ ] 33. candidate SHAと実測結果をactive Run Artifact / canonical Plan / PR #188本文へ記録する。
- [ ] 34. final working treeで`pnpm run verify` / `git diff --check`を再実行する。
- [ ] 35. tracked Run Artifact / Planを最終状態へ更新して通常commit / pushする。
- [ ] 36. final headとcandidate SHAの差分に環境影響ファイルが0件であることを確認する。
- [ ] 37. canonical Fresh Codespaceを`merge --ff-only`でfinal HEADへ同期し、同じeffective `CODEX_HOME`とCodespaces`GITHUB_TOKEN`で`wait_for_required_ci`を1回実行する。
- [ ] 38. `Web CI` / `Mobile App CI` success後にPR本文を更新する。
- [ ] 39. Personal dotfiles設定を元状態へ復元し、validation-only / canonical Fresh Codespaceをstopする。delete候補をREPORTへ記録する。

## 正本

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`

## 終了時cleanup

- Personal dotfilesを変更した後はsuccess / failure / blocker / user stopを問わず元状態へ戻す。
- validation-only Codespaceを作成済みならRun終了前にstopする。
- final CI正常経路ではcanonical Fresh CodespaceをTask 38完了までstopしない。
- cleanup自体を実行できない場合は未復元 / 未停止状態をBlockerとしてREPORTとユーザー報告へ記録する。
- 不要Codespaceはdelete候補として記録するが自動deleteしない。

## 必須CI

- checkboxには含めない。
- file-changing taskのProgressではcheckbox総数にCI確認1件を加算する。
- Task 37でfinal exact HEADに対する`wait_for_required_ci`を1回だけ呼ぶ。Agent自身のpollingへfallbackしない。
- Task 38で`Web CI` / `Mobile App CI`のsuccessとPR本文更新まで完了した時点でCI確認1件を完了扱いにする。
- waiter利用不能時はBlockerとし、終了時cleanup契約を実行してから報告する。
- CI結果記録だけを理由にこのfileを再commitしない。

## Blocked（ブロック中）

- なし。

Progress: 28% (11/40、必須CI確認1件を含む)
