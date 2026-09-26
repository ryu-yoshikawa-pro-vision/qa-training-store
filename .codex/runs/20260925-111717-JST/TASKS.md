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

- [ ] fresh interactive codex-safe safeでlocal例外操作のon-request承認を確認する。PTY起動が実行環境に拒否され、非interactive `codex exec`はapproval=neverを強制するため、承認経路を検証できていない。
- [ ] fresh interactive codex-safe safeでread-only network例外のapproval + network sandbox昇格を確認する。PTYが使えず、direct public GETもTLS切断となったためruntime検証未完了。
- [ ] fresh direct runtimeの全要件を完了する。workspace writeとnever拒否は確認したが、git switchはshared `.git`のindex.lock権限、networkは環境のcredential/TLS制約で失敗した。
- [ ] final strict writerは成功したが、既存collectorが先行writerの評価parse failure、誤ったscope指定によるblocked記録、PowerShell ANSI decodeによるmojibake evidenceを保持し、run.json.validation.status=blocked / safety.scope_violation=trueとなった。actual manifestの直接編集で履歴を消さず、REPORT.mdへ根拠を記録した。

Progress: 92% (22/24)

Next: commit / normal push / PR #184更新 / 最新head必須CI確認を行う。Blockedのruntime検証はinteractive terminalとread-only networkが利用可能な環境で再確認し、manifest履歴も既存contractで解消できる方法が必要。
