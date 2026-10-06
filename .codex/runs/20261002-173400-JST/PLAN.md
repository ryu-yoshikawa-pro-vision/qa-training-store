# Plan（計画）

## 目的

- PR #188 で GitHub Codespaces + OpenCode Zen + Codex CLI の開発環境を実装・検証する。
- Phase B plain Codespaceはbaselineとして保持し、candidate SHA → explicit devcontainer Fresh Create → target contract → 同じCodespaceのFull Rebuild → 後続validation → final exact-head CI → cleanupまで同じPRで完了する。

## 対象範囲

- In:
  - baseline main / PR head、control shell、canonical machineの固定。
  - OpenCode / Codexのlatest non-prerelease stable、target node install戦略、GitHub CLI Feature。
  - 本Runは公式catalogでFreeと確認できるOpenCode Zen modelだけを使う。Free modelのkeyless実行、root `AGENTS.md`自動適用、`.agents/skills/**` native discoveryを確認する。
  - Codex beta device auth、effective `CODEX_HOME`、Hook / subagent / `ci_wait`。
  - dotfilesを各create直前だけ一時OFFにし、作成後すぐ復元。
  - Phase B plain Codespaceをbaseline evidenceとして扱い、candidate validationの対象から除外する。
  - candidate SHAからexplicit devcontainer Fresh Createし、target contract確認後に同じCodespaceをFull Rebuildする。
  - Fresh Create / Full Rebuildのvalidation、`pnpm run verify`とtracked cleanを確認する。
  - Fresh CreateでGit identity / remote / push dry-run。
  - final exact HEADのwaiter、Codex logout、Codespace stop。
  - Repository-wide quality gate failureに対する既存repair-loop。
- Out:
  - Repository側のFree / paid model制御、model固定、pricing / usage監査。本Run内のsmokeはFree-onlyとする。
  - OpenCodeへCodex Safety Harness相当を追加すること。
  - process単位のSecret broker。
  - Native toolchainのCodespaces移行。
  - 新規MCP / CI workflow。
  - merge / Codespace自動delete。

## 確定前提

- OpenCode modelはユーザー管理。本Runではユーザー方針に従い、公式catalogでFreeと確認したZen modelだけを使用する。既存選択model `muse-spark-1.3-contributor-free` をsmokeに使用する。
- OpenCode smoke processから`OPENCODE_API_KEY`を除外する。Personal Secret acceptanceは検証対象にせず、Secret設定を変更しない。
- OpenCodeはupstream default permissionを利用する。
- root `AGENTS.md`のRepository-wide規約はOpenCodeにも適用し、Codex固有のHook / wrapper / native delegation / `ci_wait`はCodexだけに適用する。
- OpenCodeは`.agents/skills/feature-plan`をnative `skill` toolからloadできることを確認する。
- `OPENCODE_API_KEY`はCodespace-wide envであり他processから参照可能。値を出力・保存しないことを境界にする。
- target devcontainerはofficial GitHub CLI Featureを持ち、`ci_wait`が使うGitHub APIへCodespaces `GITHUB_TOKEN`で接続できることを確認する。
- Codex device-code authenticationはbetaだが今回のremote/headless正規経路とする。利用不能時は公式fallbackへ進まずBlocker。
- effective `CODEX_HOME`をlogin / trust / smoke / subagent / `ci_wait`で統一する。
- Full Rebuildでは`/workspaces`と`<TEMP_ROOT>`のpersistを考慮し、Rebuild自体をauth zero-stateの証明にしない。
- validation-only Codex credentialは最終利用後に`codex logout`で削除する。
- Repository-wide gate failureは`docs/reference/repair-loop.md`へ従う。
- 旧candidate Fresh Createではimage build / target start / `User: node`接続後の`postCreateCommand`が`corepack enable`のsystem-wide symlink EACCESで失敗し、recovery containerへfallbackした。`sudo`は`corepack enable`と2つのglobal npm installだけに付ける。old candidateを環境影響修正後のnew candidateへ置き換えて検証する。

## 進め方

- 詳細は `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md` を正本とする。
- control preflight → canonical machine → plain Codespace baseline → B→C checkpoint → devcontainer / AGENTS / README → safe minimal repair → verify / scope / sanitize → new candidate commit / normal push → candidate freeze → explicit devcontainer Fresh Create → target contract → 同じCodespaceをFull Rebuild → 後続validation → final記録 / push → Fresh Codespaceをfinal HEADへff-only同期 → waiter → cleanup。
- create前のdotfiles変更は短時間に限定し、`--status`と補助evidenceで未適用を確認後すぐ復元する。
- repairが環境影響ファイルへ及んだ場合はnew candidateでFull Rebuild / Fresh Createをやり直す。

## 完了条件

- canonical PlanのDoDを満たす。
- OpenCodeのRepository instructions / native Skill discoveryがPhase B / E-2 / E-3で成立する。
- target devcontainerの`gh`とrequired GitHub API connectivityが成立する。
- candidate-created CodespaceのFresh Create / 同Codespace Full Rebuildでtarget contractと`pnpm run verify` / tracked cleanが成立する。
- Fresh CreateでGit write credentialをdry-runで確認する。
- exact final HEADの`Web CI` / `Mobile App CI`がsuccessする。
- validation Codex credentialをlogoutしCodespaceをstopする。
- dotfiles設定が元状態である。
- merge / Codespace deleteは行わない。

## 判断記録

- `AGENTS.md`はOpenCode用に複製せず、Repository Agentへの適用境界だけ最小修正する。
- target GitHub CLIは`ghcr.io/devcontainers/features/github-cli:1`を使用する。
- canonical machineは利用可能な最小Linux machine。同じmachineをPhase B / Fresh Createで使用し、locationは契約外。
- OpenCode auth config sourceはFree-only keyless利用のため「なし」に固定する。root `opencode.json`は作成しない。
- READMEは通常利用者向け情報と正本リンクに絞り、validation内部契約を複製しない。
- Full Rebuild後の`pnpm install --frozen-lockfile`再実行は削除し、postCreate成功 + `pnpm run verify`で確認する。
- plain Phase B Codespaceからcandidate devcontainerへのmigrationはRequired DoDではない。
- ファイル分割は行わない。candidate → Fresh Create → 同Codespace Full Rebuild → final CI → cleanupを単一正本で追う。

## 2026-10-05 historical checkpoint

- Task 19–23 complete. Task 24 remains open because default parallel Vitest integration / repository-contract commands timed out on this Windows shell, while both suites passed using temporary `--no-file-parallelism --maxWorkers=1` flags. Individual test timeout values and test logic remain unchanged.
- Only remaining human decision before Task 24 can be completed: approve the L2 `package.json` workflow change to persist those flags in `test:integration` and `test:repository`. Approval is required by `AGENTS.md` §8. After approval, rerun the full `pnpm run verify`; then resume Task 25 if it passes.
- This checkpoint was superseded after Task 25 and records earlier state only.

## 2026-10-05 17:37 JST checkpoint

- Task 19–24 complete. User approved the L2 change limited to package.json scripts test:integration and test:repository, adding --no-file-parallelism --maxWorkers=1; test logic, assertions, skip conditions, and timeout values remain unchanged.
- Both changed scripts passed individually; pnpm run verify passed all configured gates. Task 24 is complete.
- Next: Task 25 candidate commit / normal push. Recheck latest PR head and branch before mutation; freeze the candidate after push. Phase B Codespace remains at baseline 0d554416d2e31eeda89f705dbe2a3db79492a3b6 until Task 26.
## 2026-10-05 17:49 JST checkpoint

- Task 25 complete. Candidate commit 48a92742dd1892835d6b5f5e3516cfce1d8adfc3 was pushed normally to plan/codespaces-opencode-devcontainer; local HEAD, remote branch, and PR #188 head match. PR remains OPEN against main.
- Candidate is frozen. Do not push another commit until E-2 Full Rebuild and E-3 Fresh Create evidence is complete. Phase B Codespace is still at the fixed baseline and Task 26 is next.
## 2026-10-05 17:59 JST checkpoint

- Task 26 complete. Phase B Codespace stunning-space-goggles-977gqrjrrwx6hxxp7 was clean at baseline 0d554416d2e31eeda89f705dbe2a3db79492a3b6, fetched origin, verified the expected branch and candidate, and fast-forwarded to 48a92742dd1892835d6b5f5e3516cfce1d8adfc3. Post-sync worktree is clean and .devcontainer/devcontainer.json matches the candidate blob.
- Task 27 is next. Before gh codespace rebuild --full, recheck the Codespace control-plane state, candidate HEAD, clean status, and no uncommitted environment-impact files. Candidate branch remains frozen.
## 2026-10-05 18:27 JST checkpoint — Task 27 blocked

- Full Rebuild completed at the control-plane level and the Phase B Codespace is Available on basicLinux32gb. However, gh codespace view reports devcontainerPath as empty instead of .devcontainer/devcontainer.json.
- Secret-safe runtime checks from the Codespace SSH shell confirmed the candidate branch/head and clean worktree, but the target markers were false: remote user node, <USER_HOME>, OPENCODE_DISABLE_AUTOUPDATE, Node 24, pnpm 10.34.5, OpenCode 2.0.22, Codex 0.160.0, and GitHub CLI. Task 27 is not PASS; Task 28 has not started.
- This checkpoint predates the user-approved 19:16 JST clarification. Its `devcontainerPath` failure gate and request for manual VS Code inspection are superseded; see the latest checkpoint below.
- CLI creation-log retrieval did not return within the bounded read-only attempt. No raw logs were stored or displayed; temporary diagnostic scripts were removed. Codespace remains Available and candidate 48a92742dd1892835d6b5f5e3516cfce1d8adfc3 remains frozen.

## 2026-10-05 19:16 JST checkpoint — Task 27 L2 clarification and resume gate

- User-approved L2 correction is reflected in the canonical Plan: Full Rebuild uses Creation Log + target Runtime; empty `devcontainerPath` alone is not FAIL. Fresh Create still requires exact `.devcontainer/devcontainer.json` because creation passes explicit `--devcontainer-path`.
- Fresh pre-edit check: local HEAD == remote PR branch == PR #188 head `48a92742dd1892835d6b5f5e3516cfce1d8adfc3`; PR OPEN/base `main`; latest `origin/main` `813699a57a8b8f114fb7419b74fddba49b5dd908`; index clean. Candidate remains frozen. Current changes are canonical Plan and Run records only.
- Control plane now reports the same Codespace `stunning-space-goggles-977gqrjrrwx6hxxp7` as `Shutdown`, machine `basicLinux32gb`, empty `devcontainerPath`.
- `gh codespace logs --codespace <target>` was run through an in-memory classifier. The bounded attempt timed out with 0 captured stdout lines / bytes and 0 stderr lines / bytes. Raw logs were never displayed or written; credential-like status is unknown for the unavailable log itself.
- Starting the same Codespace through the authenticated-user API was rejected by automatic approval review before execution; no request was sent. The returned reason stated approval was required while automatic approval was disabled. Task 27 remains incomplete, Task 28 has not started, and no Full Rebuild was repeated. Earlier SSH-shell markers are not target Runtime evidence.
- Resume after the same Codespace is `Available`: retrieve and safely classify the Creation Log, then verify the target Runtime and B→C checkpoint contract.
- Diagnostic rollback: the temporary in-memory classifier source was removed, and the SSH processes started by the bounded log attempts were terminated; no raw log file was created.

## 2026-10-05 19:41 JST follow-up — Creation Log CLI prerequisite

- The same Codespace now reports `Available` / `basicLinux32gb`; empty `devcontainerPath` remains informational for E-2.
- Retried `gh codespace logs --codespace <target>` while Available with the in-memory fail-closed classifier. It timed out after 120 seconds with 0 stdout / stderr lines and bytes. No raw log was obtained or saved; log content and credential-like status remain unknown.
- Official GitHub CLI documentation says the command may ask for the local SSH key passphrase. Correction at 19:50 JST: `ssh-add -l` exit 2 classified as `agent_unavailable=true`, `agent_empty=false`; the Windows `ssh-agent` service is present but `Stopped` / `Disabled`, so identity count is unknown. The standard Codespaces key file exists. A passphrase prompt is a plausible but unconfirmed cause of the bounded CLI timeout.
- Superseded human action withdrawn by the user's 2026-10-05 correction: do not start Windows `ssh-agent`, run `ssh-add`, or change SSH keys/config for Task 27. SSH is not a prerequisite or blocker; keep the earlier agent state as historical diagnosis only.
- No code/config changes, rebuild, candidate push, or Task 28 action. The temporary classifier was removed and no process from the latest diagnostic remains.

## 2026-10-05 22:33 JST — Task 27 transport correction and runtime handoff

- User clarification: SSH is not the purpose or a Plan completion condition. No SSH-agent startup, `ssh-add`, key generation/change, `.ssh/config` edit, SSH-specific repair, or new remote-access mechanism is required. Existing SSH diagnostics remain historical only.
- Candidate remains `48a92742dd1892835d6b5f5e3516cfce1d8adfc3`; local HEAD and PR #188 head match. The candidate contains `.devcontainer/devcontainer.json`. The prior `gh codespace rebuild --full` command exited 0 and returned the Codespace to `Available`; this is control-plane evidence only, not evidence that the target devcontainer or `postCreateCommand` succeeded.
- Current `gh codespace view` / `list` results: `stunning-space-goggles-977gqrjrrwx6hxxp7` is `Available` on `basicLinux32gb`, expected branch, tracked worktree clean and no unpushed changes. Empty `devcontainerPath` is not a Full Rebuild failure by itself.
- The user reports a recovery-mode-looking IDE. Existing control-plane metadata cannot separate a devcontainer build failure from IDE/runtime access state. Earlier SSH-shell checks are not target Runtime evidence. Prior bounded `gh codespace logs` attempts timed out without bytes; no log contents or build-failure stage are known. No further Full Rebuild was run.
- The read-only `gh api user/codespaces/<name>` attempt was rejected by automatic approval review before execution; no request was sent. No browser UI was used after the user requested none.
- The current shell exposes no target-runtime command path. To finish Task 27, request only the user-provided normal IDE checks: `whoami`, `node --version`, `pnpm --version`, `opencode --version`, `codex --version`, `gh --version`. Task 27 remains incomplete and Task 28 has not started.

## 2026-10-05 23:27 JST — Candidate Fresh Create validation sequence

- User-provided main Codespace startup success is baseline evidence only; it lowers the likelihood of a broad Codespaces / Repository / account / machine issue but does not prove the PR devcontainer works.
- The earlier PR Creation Log shows `.devcontainer/devcontainer.json` was loaded, then an existing plain container was reused and failed because it lacked the `node` user; recovery used `vscode`. Classify this as an existing-container reuse / migration failure, not a Fresh Create failure.
- Keep candidate image and `remoteUser: "node"` unchanged. Do not repair the existing Phase B recovery container or run another Full Rebuild on it.
- The canonical run order is: create one new candidate Codespace with `--devcontainer-path .devcontainer/devcontainer.json` → verify Fresh Create metadata and target contract → Full Rebuild that same Codespace once → verify post-Rebuild contract and continue remaining tasks.
- The old Phase B Codespace is baseline only and is to be stopped when no longer needed; no deletion. Candidate remains frozen at `48a92742dd1892835d6b5f5e3516cfce1d8adfc3`.
- Run `REPORT.md` now contains the user-provided evidence summary; Task 31 is complete. Task 27 Fresh Create is next, then Task 28 target contract. No new Codespace or Full Rebuild has yet run in this sequence.

## 2026-10-06 00:01 JST — Fresh Create target evidence checkpoint

- Created `probable-spoon-wrrq9pgppxvp36rq` once from candidate `48a92742dd1892835d6b5f5e3516cfce1d8adfc3` with the explicit `.devcontainer/devcontainer.json` path; metadata confirms repository, branch, machine, path, candidate HEAD, and Available state.
- The AI-visible Runtime returned `vscode` / uid `1000` with no Node, pnpm, OpenCode, Codex, or gh binary. This conflicts with the target contract, while the Creation Log and postCreate result are unavailable. Do not treat the command route alone as proof of the first failing stage, and do not change the image or `remoteUser`.
- Creation status and Creation Log CLI retrieval returned no usable output and were interrupted after bounded waits. Do not retry them or repeat Fresh Create. The new Codespace remains available for normal IDE confirmation.
- Old plain Phase B Codespace is now Shutdown and excluded from candidate validation. Task 32 complete; Tasks 27–28 remain open. Full Rebuild Tasks 29–30 must wait for Fresh Create target contract evidence.
- Request only the new Codespace's normal IDE Runtime values and a non-sensitive first-failure / postCreate summary from its Creation Log. Do not ask for raw logs or SSH configuration actions.

## 2026-10-06 08:26 JST — Repaired candidate freeze

- Old candidate `48a92742dd1892835d6b5f5e3516cfce1d8adfc3` is retained as failed evidence. New candidate `b05b4508ff8bd8eadf788dd7914ab85f6fa4cbd3` contains the bounded `.devcontainer/devcontainer.json` permission repair and the Plan / Run correction.
- The new candidate was committed and normally pushed; PR #188 head now matches it. Freeze this SHA until its replacement Fresh Create and same-Codespace Full Rebuild validation are complete.
- Task 33 is complete. Tasks 27–28 remain pending for the new SHA; Tasks 29–30 have not started. Do not reuse or repair `probable-spoon-wrrq9pgppxvp36rq`.
- Personal dotfiles remain confirmed OFF with no selected repository, unchanged from the earlier pre-create check. The next create uses the canonical explicit `.devcontainer/devcontainer.json` path and `basicLinux32gb`.
- Progress: 69% (29/42、必須CI確認1件を含む)

## 2026-10-06 08:40 JST — Fresh Create control-plane result

- New candidate Codespace `expert-chainsaw-r445rqpqqqqwh566v` was created once from `b05b4508ff8bd8eadf788dd7914ab85f6fa4cbd3`; control-plane metadata matches repository, branch, `basicLinux32gb`, and exact `.devcontainer/devcontainer.json`, with state `Available`.
- The `--status` command returned a startup wait timeout even though follow-up metadata is Available. Creation Log retrieval and target Runtime values are not available through the current control-shell routes. Do not treat either command failure as a devcontainer failure, and do not investigate or repair SSH.
- The human IDE check is now required for Task 27 / 28: verify target Runtime, workspace HEAD, clean status, and a safe stage summary from Creation Log. Until then do not Full Rebuild this Codespace.
- Candidate SHA remains frozen at `b05b4508ff8bd8eadf788dd7914ab85f6fa4cbd3`; Task 33 complete, Tasks 27–28 pending, Tasks 29–30 not started.

## Historical checkpoint — 2026-10-06 09:30 JST (Runtime provenance corrected at 12:15 JST)

- At this checkpoint, the user-provided normal IDE output was provisionally attributed to `expert-chainsaw-r445rqpqqqqwh566v`. The user later clarified that a new Codespace had been started; this Runtime must not be treated as evidence for `expert` (see the 12:15 JST correction below).
- Expected Codex at the last fail-fast postCreate step supports inference that preceding install steps completed. Label this as an inference; do not obtain a Creation Log for this successful Runtime.
- Task 27 was complete for the explicit-path Fresh Create. Broader Fresh Create checks remain open in Task 28.
- Pre-Rebuild candidate, clean worktree / index, no environment-affecting untracked files, canonical machine, and target devcontainer were confirmed. The one authorized `gh codespace rebuild --full -c expert-chainsaw-r445rqpqqqqwh566v` returned exit 0 / `is rebuilding`; control-plane state then advanced `Rebuilding` → `Available` on the same Codespace with matching metadata.
- Post-Rebuild target Runtime and remaining integration / Git / verify / Web checks were pending for `expert`; its current metadata is now 404. Do not repeat Full Rebuild on that missing Codespace.
- Progress: 71% (30/42、必須CI確認1件を含む)

## 2026-10-06 12:15 JST — Runtime provenance correction / retarget

- The user stated that the supplied Runtime commands were run after launching a new Codespace. Current Codespaces listing contains `turbo-umbrella-7vvjr6p66jvgcgg4` as the only available Codespace; it was created at 10:54 JST. Its repository, candidate branch, `basicLinux32gb`, explicit devcontainer path, and clean control-plane status match.
- The earlier Full Rebuild target `expert-chainsaw-r445rqpqqqqwh566v` now returns HTTP 404. Its Full Rebuild command / control-plane transition is historical evidence only; no target Runtime PASS is attributed to it.
- Attribute the supplied IDE Runtime values to `turbo-umbrella-7vvjr6p66jvgcgg4` based on the user's correction and current Codespaces listing. Its Fresh Create target contract is PASS; its HEAD is candidate and worktree was reported clean.
- Preflight passed for `turbo-umbrella-7vvjr6p66jvgcgg4`. `gh codespace rebuild --full -c turbo-umbrella-7vvjr6p66jvgcgg4` was issued once, exit 0 / `is rebuilding`; control-plane state is currently `Rebuilding`. Do not repeat it.
- Task 29 remains open until this Codespace is Available and its post-Rebuild target Runtime is checked. Progress remains 71% (30/42、必須CI確認1件を含む).

## 2026-10-06 12:25 JST — Full Rebuild control-plane completion checkpoint

- Fresh control-plane view reports `turbo-umbrella-7vvjr6p66jvgcgg4` as `Available`, with repository `ryu-yoshikawa-pro-vision/qa-training-store`, candidate branch, `basicLinux32gb`, exact `.devcontainer/devcontainer.json`, and clean / no-unpushed status. The prior `Rebuilding` status has completed.
- The Full Rebuild command was already issued once and exited 0. Do not repeat it. `Available` is control-plane evidence only; it does not prove post-Rebuild target Runtime.
- The user-confirmed IDE values are Fresh Create evidence. Await the same Codespace's post-Rebuild IDE Runtime values; no Creation Log or browser action is needed for this gate.
- Task 29 remains incomplete until the post-Rebuild target contract is confirmed. Task 30 remains open. Progress remains 71% (30/42、必須CI確認1件を含む).

## 2026-10-06 13:09 JST — Task 29 Full Rebuild target Runtime PASS

- The user confirmed the IDE Runtime output is from after Full Rebuild in the same candidate-created Codespace `turbo-umbrella-7vvjr6p66jvgcgg4`: candidate HEAD, clean status, `node` / UID 1000, Node `v24.21.0`, pnpm `10.34.5`, OpenCode `2.0.22`, Codex `0.160.0`, gh `2.102.0`, expected paths, and effective `CODEX_HOME=<USER_HOME>/.codex`.
- Latest control-plane metadata is `Available`, `basicLinux32gb`, exact `.devcontainer/devcontainer.json`, expected repository / branch, and clean / no-unpushed. The one Full Rebuild command is complete; no retry.
- Task 29 is complete. Task 28 Fresh Create broader checks and Task 30 post-Rebuild broader checks remain open. Progress: 74% (31/42、必須CI確認1件を含む).

## 2026-10-06 15:44 JST — Linux verify failure diagnosis and repair

- The user supplied the Codespaces/Linux `pnpm run verify` failure: only `returns a scalar exit code for the .sh verify path` and `returns a scalar exit code for the default executable verify path` failed, both with `spawnSync pwsh ENOENT`. ESLint's 65 warnings and React `act(...)` stderr were non-failures.
- Test inspection confirmed both fixtures could be marked available without checking the PowerShell driver used by `runVerifyProbe`: `.sh` checks for `bash`, while the default executable fixture is always available. The production/devcontainer contract does not require `pwsh`; do not add PowerShell to the image or alter other environment settings for this test-only issue.
- Repair-loop iteration 1 (`must_fix`): allowed file `tests/contracts/codex-task-native-command.test.ts`; change the fixture test gate to require both `powerShellAvailable` and `fixture.available`. No product, devcontainer, dependency, or lockfile file changed.
- Targeted Windows contract suite passed (11 passed, 1 skipped). Full local `pnpm run verify` exited 0: 48 contract files / 820 tests passed / 4 skipped; all earlier lint, validation, typecheck, security, unit, integration, repository, component, web build, and spec build steps passed. Existing lint / React warnings remain non-fatal.
- The actual Codespaces/Linux post-Rebuild verify must be rerun on the updated branch head to verify the no-`pwsh` skip path there. Task 28 and Task 30 remain open until their other canonical checks and that target verify are complete. Candidate environment SHA `b05b4508ff8bd8eadf788dd7914ab85f6fa4cbd3` remains the Fresh Create / Full Rebuild basis; this test-only change does not require another Create or Rebuild.

## 2026-10-06 15:47 JST — Local final verification checkpoint

- After the test repair, full local `pnpm run verify` exited 0 (48 contract files; 820 tests passed / 4 skipped; web and spec builds passed). Final `format:check`, Markdown lint, text lint, Run sanitizer, and `git diff --check` also passed.
- Task 35 is complete. Progress is 76% (32/42, including the pending required-CI item). Task 28 and Task 30 remain open for target Codespace authentication / integrations / Git / API / Web checks and Linux verify on the repaired branch head.
- Only the test harness changed outside the existing Plan / Run documentation; `.devcontainer/**`, package manifests / lockfiles, CLI versions, and install behavior are unchanged. Candidate environment SHA `b05b4508ff8bd8eadf788dd7914ab85f6fa4cbd3` remains valid for Fresh Create / Full Rebuild evidence.
