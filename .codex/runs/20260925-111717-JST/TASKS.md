# TASKS

## 完了

- [x] mainのproject config、AGENTS.md、compact Hook、rules、wrapper、verify、Run Artifact契約を確認する。
- [x] OpenAI現行Codex config / requirements / execpolicy仕様を確認する。
- [x] 再レビュー結果を反映し、GitHub CLI safety、codex-project metadata、recovery経路、external direct E2E evidenceの責務を確定する。

## 実装

- [ ] L3変更としてユーザーの明示承認を確認し、latest main / branch / PR #182 / Codex version / baseline / requirements・metadata・safety.network consumerを記録する。
- [ ] 同じRun IDを既存machine-managed writerでstrictへ補完し、run.json / evaluation template / explicit scopeを作る。
- [ ] .codex/config.tomlを workspace-write / approval never / network trueへ変更する。
- [ ] codex-project.tomlのnetwork / apply_patch / standard run_manifest metadataを新契約へ同期する。
- [ ] codex-safe / codex-taskでsafeのnetwork false、auto-netのnetwork trueを明示して既存semanticsを維持する。
- [ ] .codex/rules/20-risky-prompt.rulesでgit switchだけをbroad Git promptから外す。
- [ ] generic gh apiと高影響GitHub CLI operationをpromptへ追加し、通常PR workflowをblanket blockしない。
- [ ] merge / rebase recoveryはdirect neverで迂回せず、必要時だけcodex-safe safeのon-request経路を使う契約へ同期する。
- [ ] parent / subagentの実効configを確認し、明示的なrole contractがない限りworkspace-write roleへnetwork falseを追加しない。
- [ ] docs/reference/run-artifacts.mdを通常direct + manifestなし / strict machine-managed契約へ更新し、safety.networkとexternal validationの責務を分ける。
- [ ] implementation / safety reference、quickstart、MIGRATIONを新契約へ同期する。
- [ ] PROJECT_CONTEXT更新前snapshotをdocs/historyへ保存し、PROJECT_CONTEXTを同期する。
- [ ] actual consumerが確認できた場合だけ.codex/requirements.tomlを同期する。
- [ ] scripts/verify / scripts/verify.ps1と必要な既存contract testを更新する。
- [ ] focused test / Hook test / execpolicy / Bash・PowerShell verify / Repository標準verifyを実行する。
- [ ] fresh direct codex sessionでworkspace write / network / git switch / GitHub CLI guard / never behaviorを実runtime確認する。
- [ ] strict evaluation / run manifestを最終化し、Run Artifactをfinal commit前状態へ更新する。
- [ ] commit / normal push / PR作成または更新を行う。
- [ ] 最新PR headの必須CIを確認し、failure時は既存repair contractに従う。

## Blocked

- source実装は未開始。
- strict必須のrun.json / evaluation.jsonは未作成。
- 次のgateはL3実装承認。その直後にmachine-managed strict Artifact bootstrapを行う。

Progress: 14% (3/21)
