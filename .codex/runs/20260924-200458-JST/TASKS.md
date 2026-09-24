# Tasks（タスク）

## Now（現在）

- [x] 1. RepositoryのCI lifecycle正本とroot導線を確認する。
- [x] 2. Bash / PowerShell verifyのsemantic contractを確認する。
- [x] 3. GitHub CLIのwatch / fail-fast / check 0件時の挙動を確認する。
- [x] 4. OpenAI Codexのlong-running command / live session経路を調査する。
- [x] 5. 初版Planのruntime前提、workflow登録条件、fail-fast対象の問題をレビューする。
- [x] 6. 同じPRで実装する前提へ保存PlanとRun PLANを修正する。
- [ ] 7. Task 0のruntime gateを実行し、判定A / B / Cを確定する。
- [ ] 8. A/Bの場合、exact HEADの必須CI waiterを最小実装する。
- [ ] 9. 必要な自動テストと採用runtime経路への接続を実装する。
- [ ] 10. implementation harnessとBash / PowerShell verifyを同期する。
- [ ] 11. focused testとRepository標準verifyを実行する。
- [ ] 12. Run Artifactをfinal commit前状態へ更新し、commit / push / PR本文を同期する。
- [ ] 13. PR #182 latest headで新しいmodel-free CI待機経路を実地検証する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskのcommit / push / PR / CI lifecycle: `docs/reference/codex-implementation-harness.md`
- failure時の原因分類・repair: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git branch / refspec / recovery: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- `scripts/verify` と `scripts/verify.ps1` が現在のpolling禁止文言をliteralで固定している。
- `gh pr checks --watch` はcheck 0件では待機せず終了する。
- `--fail-fast` はPR上の任意check failureへ反応し、Repository正本の `Web CI` / `Mobile App CI` だけの終了条件とは一致しない。
- OpenAI Codexの通常 `exec_command` はlong-running commandをlive session化し得るため、CLI側でwatchしてもAgentの `write_stdin` pollingが残る可能性がある。
- upstreamにone-shot相当の実装があっても、installed version / 実際のtool surfaceで使えるかは別途確認が必要。

## Blocked（ブロック中）

- なし。次はruntime gate。
