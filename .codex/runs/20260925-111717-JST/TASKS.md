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
- [ ] commit / normal push / PR作成または更新を行う。
- [ ] 最新PR headの必須CIを確認し、failure時は既存repair contractに従う。

## Discovered

追加のin-scope作業は確認していない。auto-netのpreflight/runtime差は別課題候補としてREPORT.mdに記録する。

## Blocked

- Task 9 runtime matrix (2026-09-26): direct workspace write=PASS (existing evidence); direct never rejection=PASS (existing evidence); normal `git switch`=PASS (fresh direct Codex, independent normal clone); direct public network=BLOCKED (host success / direct Codex CLI 0.156.0 `SEC_E_NO_CREDENTIALS`); safe local on-request approval=BLOCKED (PTY creation denied); safe network approval + sandbox elevation=BLOCKED (PTY creation denied); auto-net preflight/runtime difference=confirmed and deferred as `HIC-20260926-01`.
- fresh direct Codex CLI 0.156.0 was launched from the trusted project root with no wrapper or sandbox/approval CLI override. `.codex/config.toml` specifies `workspace-write` / `never` / `network_access=true`. Host PowerShell succeeded on the public remote HEAD query; the same command inside direct Codex exited 1 with Windows Schannel `SEC_E_NO_CREDENTIALS (0x8009030E)`. This is a runtime / credential-context blocker; evidence does not establish a project source defect, and no credentials or configuration were changed.
- `codex-safe safe -NoLog -PrintCommand` confirms `workspace-write` / `on-request` / `network=false`. `git tag --list` and `gh api --hostname api.github.com /meta` both resolve to execpolicy `prompt`. A fresh interactive PTY was denied before process launch with `CreateProcessW` / `os error 5`, so local approval UI, network approval and sandbox elevation remain unverified. No non-interactive substitute or prompt-targeted operation was run.
- strict manifestはlatest writer成功後も過去のevaluation parse failure、scope check blocked、mojibake evidenceを保持する。既存writerはvalidation command/warningを追加し、collectorは過去blockedを優先して集約、`scope_violation`を保持するため、現contractに履歴clear経路はない。actual `run.json`を直接編集せず、`validation.status=blocked` / `safety.scope_violation=true`を履歴aggregateとして記録する。

Progress: 92% (22/24)

Next: strict Run Artifactの再集約とschema / sanitization確認は完了。最終diff / statusを確認し、Run Artifactだけをcommit、normal push、PR #184本文更新、最新head必須CI確認へ進む。Task 9はdirect network成功とinteractive safe approval / elevationが未確認のためpartialのままとする。
