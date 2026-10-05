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
- [x] 17. dotfilesをcreate直前だけOFFにし、canonical machine + `--status`でplain Codespaceを作成して即時復元する（初回SSH失敗で`--status`のprimary出力は未取得。後続のcontrol plane / Codespace内確認で各条件を補完）。
- [x] 18. OpenCode exact install、Free Zen modelのkeyless実行、root AGENTS自動適用、native feature-plan Skill、development smokeを検証する（exact version `2.0.22`、公式Free catalog、keyless process境界、AGENTS / Skill smokeを確認。stream分離したattempt-5でread / write / shellとshell検証、期待artifactを確認。model変更なし）。
- [x] 19. Codex exact install、effective CODEX_HOME、beta device authを検証する（0.160.0、CODEX_HOME既定path、ChatGPT認証を確認し、/statusでsession / model / usage欄を確認）。
- [x] 20. Codex Hook / trust / subagent、ci_wait discovery、required GitHub API connectivityを検証する。
- [x] 21. B→C checkpointへauth config source、target node install戦略、GitHub CLI Feature、CODEX_HOME、postCreateを固定する。
- [x] 22. devcontainer、AGENTS最小修正、条件付きOpenCode auth configを実装する（Free-only keylessのためauth configは追加しない）。
- [x] 23. READMEを通常利用者向け情報と正本リンクに絞って更新する。
- [x] 24. candidate前verify / diff / repair-loop確認を行う。
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

- Task 17 evidence note (non-blocking): `gh codespace create --status`はCodespace作成後の初回SSHでexit 1となりprimary出力を保存できなかった。既存Codespace `stunning-space-goggles-977gqrjrrwx6hxxp7`のcontrol-plane情報とCodespace内HEAD / full worktreeは後続確認済み。Codespaceを重複作成しない。
- Task 18 security event: CodespaceへのPowerShell multiline command forwarding後にshell variable valuesを含む出力が返り、`OPENCODE_API_KEY`とCodespaces `GITHUB_TOKEN`が露出した。remote commandがbare `set`として解釈された可能性が高いが正確なargv解析は未確認。値は記録・再掲しない。control shellからstopを要求し、`Shutdown`を確認済み。ユーザーはZen key再発行を申告した（値・新Secretは確認していない）。本RunはFree-only / keylessなので、smoke processへkeyを渡さず、Personal Secretも変更しない。
- Token caveat: GitHub公式仕様はCodespace restartごとに新しい自動期限付き`GITHUB_TOKEN`が発行されることを示すが、旧tokenの即時失効までは確認できない。旧tokenは利用せず、漏えい値を再取得・記録しない。
- 再開gate: local / PR / Run状態とCodespace `Shutdown`を確認済み。review済みのcredential-free scriptをignored `.artifacts/codespaces-smoke/phase-b/`へ保存し、`Get-Content -Raw -LiteralPath $scriptPath | gh codespace ssh -c $codespaceName -- bash -s`でstdinへ渡して固定markerだけを出力させる。完全一致のPASS以外は安全な終了概要のみ記録して停止し、inline / `bash -lc`へfallbackしない。scriptではbare `set`、`env`、`printenv`、shell tracing、全environment / shell state dumpを禁止する。
- Task 18 Phase B stop checkpoint (2026-10-05 01:55 JST): Codespace `stunning-space-goggles-977gqrjrrwx6hxxp7` is `Available`, `basicLinux32gb`, empty `devcontainerPath`, HEAD `0d554416d2e31eeda89f705dbe2a3db79492a3b6`; branch / tracked / index clean. OpenCode `2.0.22` Free keyless AGENTS smoke (`attempt-1.txt`) and native `feature-plan` Skill smoke (`attempt-3.txt`) passed. The first Skill command used unsupported `opencode run --dir`; exact-version help confirmed no such flag and SSH's initial directory was outside the repository. The retry ran from the repository root. Development smoke (`attempt-4.txt`) did not pass: no `read`, `write`, or `bash` tool events, content did not match the required two lines, and its stream contained 3 valid JSON lines plus 3 malformed lines. No explicit authentication, network, quota, permission, CLI, or tool-capability error was found. Its OpenCode process used only the HOME/PATH/LANG/auto-update allowlist; no credential value was output. Stop Task 18 under the Phase B OpenCode smoke failure condition; do not start Task 19/20 until resolved.
- 2026-10-05 11:32 JST Task 19再開: ユーザーはCodex device-code認証完了を申告。branch / local / remote PR head `9fb97917d75c61e74249ea0d49d76841eb25474e`、latest `origin/main` `813699a57a8b8f114fb7419b74fddba49b5dd908`、index clean、既存4 tracked変更を確認。同じPhase B Codespaceは`Available` / `basicLinux32gb` / empty `devcontainerPath` / baseline HEAD `0d554416d2e31eeda89f705dbe2a3db79492a3b6`。read-only `codex login status`分類を含む固定形式scriptを1回送ったが、SSH exit 0 / stdout 1行 / stderr 0行で、その行は期待する固定markerに一致しなかった。rawは表示・保存・再分類していない。Task 19認証状態は未確定、Task 20未着手。別remote commandやtransportへfallbackせず、transport gateで停止。詳細はREPORT 2026-10-05 11:32 JST記録。
- 2026-10-05 02:11 JST follow-up: `git fetch origin` and `gh pr view 188` reconfirmed local / remote PR head `9fb97917d75c61e74249ea0d49d76841eb25474e`, latest `origin/main` `813699a57a8b8f114fb7419b74fddba49b5dd908`, PR OPEN. A read-only recheck of the existing Skill artifact via `control-command-attempt-25.sh` returned SSH exit 0 but 11 stdout lines where the strict allowlist expected 10; the output was not displayed or saved, so this recheck is inconclusive. No more Codespace commands were sent. No model was called and no credential value was displayed or recorded. Official Zen model metadata lists model IDs but no tool-capability field, so the development smoke failure cannot be reclassified as model capability failure. Keep Task 18 blocked under B-1 stop condition; no account setting change is required.
- 2026-10-05 02:33 JST follow-up: Local review of `control-command-attempt-21.sh` confirms the development smoke ran from the Repository root with `opencode run --format json --model opencode/muse-spark-1.3-contributor-free` and an `env -i` allowlist; it did not use the unsupported `--dir` flag or inherit credentials. OpenCode issue #49062 reports a similar no-tool-call symptom for the same alias on v1.18.31, but does not establish the cause on v2.0.22. `anomalyco/models.dev` marks the related non-free Contributor model `tool_call=true` for OpenRouter, not this exact Zen Free route. Neither is exact-route metadata showing unsupported tools, so Plan Section 6's model-capability reclassification gate is unmet. No more Codespace command or model call; Task 18 remains blocked under B-1 integration-failure stop condition.
- 2026-10-05 08:23 JST follow-up: The requested exact boolean classification of the three malformed lines and runtime config/session inspection is still pending. The Phase B Codespace is `Shutdown`, and local `.artifacts` contains the reviewed control scripts but not remote `attempt-4.txt`. A GitHub API start request was rejected by the execution approval policy before it ran; no remote command was sent. Earlier classifier `control-command-attempt-22.sh` did not match literal `permission requested` or `auto-rejecting`, so its generic permission-negative result is insufficient for this request. Do not call another model or change Plan conditions. Resume after the user starts the same Codespace and it is `Available`.
- 2026-10-05 08:46 JST follow-up: User started the same Codespace; control plane is `Available`. The required fixed `SAFE_TRANSPORT=PASS` marker was sent via stdin `bash -s`, but SSH exit 0 produced 2 captured lines instead of the single allowlisted line. Raw output was suppressed and not inspected or saved. Stop all further remote commands under the Plan's strict transport gate; do not run the attempt-4 classifier or try another transport until this gate is resolved.

2026-10-05 follow-up: expanded authorization permitted safe runtime diagnosis and continuation. Fresh `git fetch origin` reconfirmed local HEAD == remote PR branch == PR #188 head `9fb97917d75c61e74249ea0d49d76841eb25474e`; PR OPEN / base `main`; latest `origin/main` `813699a57a8b8f114fb7419b74fddba49b5dd908`. Existing four tracked Run / canonical Plan changes and clean index were preserved. Phase B Codespace is `Available`, `basicLinux32gb`, empty `devcontainerPath`, tracked clean, three commits behind current PR, at fixed Phase B baseline HEAD `0d554416d2e31eeda89f705dbe2a3db79492a3b6`.
- attempt-4 diagnosis: Three non-JSON lines are each permission requested=false, auto-rejecting=false, error=false, warning=false, ANSI/UI-only=false, credential-like=false, other=true. OpenCode DB session evidence shows 22 tool calls (`read=5`, `write=1`, `shell=13`, `glob=1`, `grep=2`), so the run was not text-only and model change / A-B comparison is not indicated. Local reviewed attempt-4 launcher redirected OpenCode JSON stdout/stderr to the same path assigned to the model artifact, which explains the artifact/stream collision. No raw text, tool argument, DB row, Secret, or credential value was emitted or recorded.
- Plan correction: exact v2.0.22 Runtime default DB path is `~/.local/share/opencode/opencode.db` (not the stale `opencode-next.db` path); safe DB counts were zero credential / account rows, `OPENCODE_DB` override unset, legacy auth file absent. Canonical Plan now records that exact-version observation and explicitly separates stdout / stderr from the model output artifact. Free-only model and retry conditions are unchanged.
- Historical stop entries above are superseded by the 2026-10-05 diagnosis and runtime evidence recorded in the latest REPORT section. Task 18 attempt-5 PASS、Task 19 authenticated status PASS、Task 20 Hook / same-session smoke / subagent / `ci_wait` / GitHub API PASS、Task 21 Phase B→C checkpoint recorded、Task 22/23 implementation PASS. Task 24 completed after user approval of the two-script L2 parallelism change; targeted suites and full pnpm run verify passed. See the 2026-10-05 17:37 JST REPORT section.

 Progress: 57% (24/42、必須CI確認1件を含む)
