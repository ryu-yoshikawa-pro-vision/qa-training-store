# TASKS

## 完了

- [x] mainのproject config、AGENTS.md、compact Hook、rules、wrapper、verify、Run Artifact契約を確認する。
- [x] OpenAI現行Codex config仕様を確認し、approval never / granular / project configの意味を確認する。
- [x] Planレビューを反映し、auto-net維持、AGENTS再実装なし、wrapper互換維持、Run Artifact例外、subagent確認、PROJECT_CONTEXT historyを確定する。

## 実装

- [ ] L3変更としてユーザーの明示承認を確認し、parent / subagentを含むbaselineを記録する。
- [ ] .codex/config.tomlを workspace-write / approval never / network trueへ変更する。
- [ ] codex-safe / codex-taskでsafeのnetwork false、auto-netのnetwork trueを明示して既存semanticsを維持する。
- [ ] parent / subagentの実効configを再確認し、workspace-write roleのnetwork境界が広がる場合だけrole overrideを追加する。
- [ ] approval neverとexecpolicyの代表caseを検証し、通常workflowを阻害するruleだけ必要に応じて最小修正する。
- [ ] scripts/verify / scripts/verify.ps1と必要な既存contract testを新契約へ更新する。
- [ ] current docsを同期し、PROJECT_CONTEXT更新前snapshotをdocs/historyへ保存する。
- [ ] focused test / Hook test / execpolicy / Bash・PowerShell verify / Repository標準verifyを実行する。
- [ ] fresh direct codex sessionでworkspace write / network / no-approval behaviorを実runtime確認する。
- [ ] Run Artifactをfinal commit前状態へ更新し、commit / normal push / PR作成または更新を行う。
- [ ] 最新PR headの必須CIを確認し、failure時は既存repair contractに従う。

## Blocked

- L3実装は未開始。次のgateはユーザーの明示承認。

Progress: 21% (3/14)
