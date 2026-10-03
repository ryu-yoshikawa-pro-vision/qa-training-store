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
- [x] 10. plain/target provenance分離、Zen認証証明、dotfiles cleanup、waitFor、target verify、ci_wait token契約等を反映する。
- [x] 11. Phase B→candidate同期、B→C install戦略、CODEX_HOME、Full Rebuild zero-state、final CI順序、OpenCode permission境界を反映する。
- [x] 12. OpenCode Repository integration、GitHub CLI / API、Git write、canonical machine、dotfiles短時間化、repair-loop、fallback、device auth beta、Web / tracked clean契約を反映する。
- [x] 13. Phase A: baseline main / PR head、Repository契約、current公式仕様を再確認する。
- [x] 14. control shellのGitHub CLI認証 / Codespaces accessをpreflightする。
- [x] 15. OpenCode / Codexの正規distributionからlatest non-prerelease stableを固定する。
- [x] 16. canonical validation machineを固定し、dotfiles元状態 / Secret accessを確認する。
- [ ] 17. dotfilesをcreate直前だけOFFにし、canonical machine + `--status`でplain Codespaceを作成して即時復元する。
- [ ] 18. OpenCode exact install、Zen credential、root AGENTS自動適用、native feature-plan Skill、development smokeを検証する。
- [ ] 19. Codex exact install、effective CODEX_HOME、beta device authを検証する。
- [ ] 20. Codex Hook / trust / subagent、ci_wait discovery、required GitHub API connectivityを検証する。
- [ ] 21. B→C checkpointへauth config source、target node install戦略、GitHub CLI Feature、CODEX_HOME、postCreateを固定する。
- [ ] 22. devcontainer、AGENTS最小修正、条件付きOpenCode auth configを実装する。
- [ ] 23. READMEを通常利用者向け情報と正本リンクに絞って更新する。
- [ ] 24. candidate前verify / diff / repair-loop確認を行う。
- [ ] 25. candidate commit / pushしSHAを固定してbranchをfreezeする。
- [ ] 26. Phase B Codespaceをclean確認後にff-onlyでcandidateへ同期する。
- [ ] 27. Full Rebuildしactive devcontainerPath / machineを確認する。
- [ ] 28. Full Rebuild内でauth zero-state、target CLI / gh / CODEX_HOME、OpenCode / Codex / API、verify、Web、tracked cleanを確認する。
- [ ] 29. Full Rebuild CodespaceをCodex logout後にstopする。
- [ ] 30. dotfiles一時OFF、canonical machine、explicit devcontainer、`--status`でFresh Codespaceを作成して即時復元する。
- [ ] 31. Fresh CreateのHEAD / machine / devcontainerPath / auth zero-state / target contractを確認する。
- [ ] 32. Fresh CreateでOpenCode / Codex / API、Git identity / push dry-run、verify、Web、tracked cleanを確認する。
- [ ] 33. 必要なrepair /環境変更が出た場合はnew candidateからFull Rebuild / Fresh Createをやり直す。
- [ ] 34. candidate evidenceをPlan / Run Artifact / PR本文へ反映する。
- [ ] 35. final verify / diffを実行し、failureはrepair-loopへ従う。
- [ ] 36. tracked Plan / Run Artifactを最終化して通常commit / pushする。
- [ ] 37. final headとcandidate SHAの差分に環境影響変更がないことを確認する。
- [ ] 38. canonical Fresh Codespaceをff-onlyでfinal HEADへ同期しwaiterを1回実行する。
- [ ] 39. Web CI / Mobile App CI success後にPR本文を更新する。
- [ ] 40. canonical Fresh CodespaceをCodex logout後にstopし、delete候補をREPORTへ記録する。
- [ ] 41. Personal dotfiles設定が元状態であることを最終確認する。

## 正本

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`
- `docs/reference/git-branch-safety.md`
- `docs/reference/repair-loop.md`

## 終了時cleanup

- dotfilesは各create直前だけ一時OFFにし、作成・未適用確認後すぐ元状態へ戻す。途中停止でも復元を優先する。
- validation-only Codex credentialは最終利用後に`codex logout`し、未認証を確認する。
- Phase B / Full Rebuild CodespaceはTask 28後のcleanupでstopする。
- canonical Fresh CodespaceはTask 39完了までstopしない。ユーザーが継続利用を明示しない限りTask 40でlogout / stopする。
- cleanup不能時は未復元 / 未logout / 未停止状態をBlockerとしてREPORTとユーザー報告へ記録する。
- Codespace deleteは行わない。

## 必須CI

- checkboxには含めない。
- file-changing taskのProgressではcheckbox総数にCI確認1件を加算する。
- Task 38でfinal exact HEADに対する`wait_for_required_ci`を1回だけ呼ぶ。Agent自身のpollingへfallbackしない。
- Task 39で`Web CI` / `Mobile App CI`のsuccessとPR本文更新まで完了した時点でCI確認1件を完了扱いにする。
- CI failureでsafe minimal repairを行いnew final HEADをpushした場合は、そのnew exact HEADだけを新しいCI確認対象とする。
- waiter利用不能時はBlocker。
- CI結果記録だけを理由にこのfileを再commitしない。

## Blocked（ブロック中）

- なし。

Progress: 38% (16/42、必須CI確認1件を含む)
