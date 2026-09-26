# TASKS

## Now

- [x] mainのproject config、AGENTS.md、compact Hook、rules、wrapper、verify、Run Artifact契約を確認する。
- [x] OpenAI現行Codex config / requirements / execpolicy仕様を確認する。
- [x] 再レビュー結果を反映し、GitHub CLI safety、codex-project metadata、recovery経路、external direct E2E evidenceの責務を確定する。
- [x] L3変更としてユーザーの明示承認を確認し、latest main / branch / PR #182 / Codex version / baseline / requirements・metadata・safety.network consumerを記録する。safety.network consumerはdocs、Bash / PowerShell両codex-task、collectorを確認する。
- [x] 同じRun IDを既存machine-managed writerでstrictへ補完し、run.json / evaluation template / explicit scopeを作る。
- [x] .codex/config.tomlを workspace-write / approval never / network trueへ変更する。
- [x] codex-project.tomlのnetwork / apply_patch metadataを新契約へ同期し、standard run_manifest=recommendedは維持する。
- [x] codex-safe / codex-taskでsafeのnetwork false、auto-netのnetwork trueを明示して既存semanticsを維持する。
- [x] .codex/rules/20-risky-prompt.rulesでgit switchだけをbroad Git promptから外す。
- [x] git branch -d / --deleteをpromptへ追加し、複合short option / option順序違いも検証する。git branch -D / -fとremote branch deleteの既存denyを維持する。
- [x] generic gh apiと高影響GitHub CLI operationをpromptへ追加し、通常PR workflowをblanket blockしない。これをGitHub writeのhard boundaryとは扱わない。
- [x] auto-net専用rulesへlocal branch deleteとgeneric gh api / 高影響GitHub CLI operationのforbiddenをpreflight mirrorとして同期し、read-only branch inspectionのallowを維持する。actual runtime enforcementとは扱わない。
- [x] merge / rebase recoveryはdirect neverで迂回せず、local例外操作として必要時にcodex-safe safeのon-request経路を使う契約へ同期する。
- [x] parent / subagentの実効configを確認し、明示的なrole contractがない限りworkspace-write roleへnetwork falseを追加しない。
- [x] docs/reference/run-artifacts.mdを通常direct + manifestなし / strict machine-managed契約へ更新し、safety.networkとexternal validationの責務を分ける。
- [x] implementation / safety reference、.codex/rules/README.md、quickstart、MIGRATIONを新契約へ同期する。
- [x] PROJECT_CONTEXT更新前snapshotをdocs/historyへ保存し、PROJECT_CONTEXTを同期する。
- [x] actual consumerが確認できた場合だけ.codex/requirements.tomlを同期する。consumerが確認できなかったためファイルとassertionは変更しない。
- [x] scripts/verify / scripts/verify.ps1と必要な既存contract testを更新する。
- [x] focused contract test / Hook test / execpolicy / Bash・PowerShell verify / Repository標準verifyを実行する。
- [x] auto-netのpreflight overlayとactual runtime rulesetの差を副作用のないrepresentative commandで確認し、既存差分を別課題候補として記録する。preset-specific runtime loaderは追加しない。
- [x] strict evaluation / run manifestを最終化し、Run Artifactをfinal commit前状態へ更新する。現writerは成功したが、履歴を集約するmanifestのvalidationはblockedとして記録した。
- [x] Task 9 runtime follow-up: fresh interactive `codex-safe safe`でsafe local on-request approvalを確認し、direct networkの最新結果とsafe network exception blockerをRun Artifactへ反映する。
- [x] Task 9 direct public-network validation: fresh direct Codex Python HTTPS probe succeeds with the configured project defaults.
- [x] Task 9 safe network-exception validation was performed; approval did not establish network sandbox elevation or successful communication, so record the Plan-defined blocker for this exception path.
- [ ] commit / normal push / PR作成または更新を行う。
- [ ] 最新PR headの必須CIを確認し、failure時は既存repair contractに従う。

## Discovered

追加のin-scope作業は確認していない。auto-netのpreflight/runtime差は別課題候補としてREPORT.mdに記録する。

## Blocked

- Task 9 runtime matrix (2026-09-26 final): direct workspace write=PASS (existing evidence); direct never rejection=PASS (existing evidence); normal `git switch`=PASS (fresh direct Codex, independent normal clone); safe local on-request approval=PASS (fresh interactive `codex-safe safe`, one-time user approval for `git tag --list`, then command ran with no repository mutation); direct public network=PASS (fresh direct Codex CLI 0.156.0 Python HTTPS returned 200); safe network exception approval + sandbox elevation + communication=BLOCKED (runtime validation was performed, but elevation and successful communication in the elevated sandbox were not established); auto-net preflight/runtime difference=confirmed and deferred as `HIC-20260926-01`.
- Fresh direct Codex CLI 0.156.0 was launched from the trusted project root without a wrapper or sandbox/approval/network CLI override. The project config reports `workspace-write` / `never` / `network_access=true`. The exact Python `urllib` HTTPS probe exited 0 and printed `200`, confirming direct public HTTPS. The earlier direct `git ls-remote https://github.com/git/git.git HEAD` result remains a Git / Schannel `SEC_E_NO_CREDENTIALS (0x8009030E)` transport-specific runtime failure; it is recorded separately and does not negate the successful Python HTTPS probe. No credential, network, or user configuration was changed.
- `codex-safe safe -NoLog -PrintCommand` confirms `workspace-write` / `on-request` / `network=false`. `git tag --list` and `gh api --hostname api.github.com /meta` both resolve to execpolicy `prompt`. A later fresh interactive Windows Terminal / PowerShell session displayed the approval UI for `git tag --list`; the user approved it once and the read-only command ran without a repository change or network elevation request. `curl` first resolved to the PowerShell `Invoke-WebRequest` alias and failed; `curl.exe` displayed execpolicy approval and, after approval, failed with Schannel `SEC_E_NO_CREDENTIALS (0x8009030e)`. In the same session, Python `urllib.request` reached `https://example.com` and returned HTTP 200 without an additional network approval. `whoami` reported `pc-k16-0126\codexsandboxoffline`. The local approval path is PASS. The differing network results do not establish network sandbox elevation or a PR #184 source defect; safe network approval + elevation remains BLOCKED. No further network investigation or configuration/source change was performed.
- Safe network result remains separate from the new direct result: the effective `codex-safe safe` config was `workspace-write` / `on-request` / `network=false`, and `whoami` reported `pc-k16-0126\codexsandboxoffline`. Local `git tag --list` approval is PASS. `curl.exe` received execpolicy approval but returned Schannel `SEC_E_NO_CREDENTIALS`; Python HTTPS returned 200 without an additional network approval. No evidence demonstrates sandbox elevation. Do not treat `network=false` as a complete Windows isolation boundary based on this run, and do not attribute the observed behavior to a specific Windows, TLS, or Codex cause.
- The safe network exception validation task is complete as a validation task: the observed result is recorded as the Plan-defined blocker for network exceptions only. Local on-request approval remains PASS and is not blocked by the network result.
- strict manifestはlatest writer成功後も過去のevaluation parse failure、scope check blocked、mojibake evidenceを保持する。既存writerはvalidation command/warningを追加し、collectorは過去blockedを優先して集約、`scope_violation`を保持するため、現contractに履歴clear経路はない。actual `run.json`を直接編集せず、`validation.status=blocked` / `safety.scope_violation=true`を履歴aggregateとして記録する。

Progress: 93% (25/27)

Next: 文書・Run Artifactの差分と検証結果を確認し、final commit前のstrict artifactを確定した後にcommit、normal push、PR #184本文更新、最新head必須CI確認へ進む。safe network exception capabilityはBLOCKEDだが、その検証自体は完了しており、Plan failure branchに従いnetwork例外経路だけのblockerとして扱う。
