# TASKS

## 完了

- [x] mainの .codex/config.toml、AGENTS.md、compact SessionStart Hook、rules、wrapper、verifyを確認する。
- [x] OpenAI現行Codex config仕様とproject configの前提を確認する。
- [x] Planレビューを反映し、auto-net維持、AGENTS.md再実装なし、wrapper互換維持、rules最小変更へ範囲を確定する。

## 実装

- [ ] L3変更としてユーザーの明示承認を確認し、実装baselineを記録する。
- [ ] .codex/config.tomlを workspace-write / approval never / network trueへ変更する。
- [ ] codex-safe / codex-taskでsafeのnetwork false、auto-netのnetwork trueを明示して既存semanticsを維持する。
- [ ] scripts/verify / scripts/verify.ps1と必要な既存contract testを新契約へ更新する。
- [ ] current Codex関連文書をdirect codexの新しい通常入口へ同期する。
- [ ] focused test / Hook test / execpolicy / Bash・PowerShell verify / Repository標準verifyを実行する。
- [ ] fresh direct codex sessionでworkspace write / network / no-sandbox-approval behaviorを実runtime確認する。
- [ ] 通常workflowを阻害するprompt ruleが確認された場合だけ最小修正し、再検証する。
- [ ] Run Artifactを実装結果へ更新し、commit / normal push / PR作成または更新を行う。
- [ ] 最新PR headの必須CIを確認し、failure時は既存repair contractに従う。

## Blocked

- L3実装は未開始。次のgateはユーザーの明示承認。

Progress: 25% (3/12)
