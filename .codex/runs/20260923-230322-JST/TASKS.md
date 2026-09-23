# Tasks（タスク）

## Now（現在）

- [x] 1. 開始時PR head、CI、前回result、Plan、CLI 0.155.1 helpを確認し、今回の対象範囲をRun-local Planへ記録する。
- [x] 2. resume引数順、固定Node smoke command、command実行判定、bounded diagnosticsをrunnerへ実装する。
- [x] 3. resume順序、prompt、command判定、JSONL event収集、diagnostic redaction/bounds、12 predicate fail-closedのcontract testを追加する。
- [x] 4. focused Workflow contract test、Repository contract test、Markdown lintを実行する。
- [x] 5. `verify`、必要なlint/typecheck、diff check、self-reviewを完了しRun Artifactを更新・sanitizationする。
- [ ] 6. implementation commit / pushを行い、最新Evaluator headの必須CIを確認する。
- [ ] 7. 新Evaluator SHAのtracked objectからfresh sanitized Targetを生成し、detached以外のpreflightを完了する。
- [ ] 8. ユーザーdetach後にpreflight、Android確認、canonical runを1回だけ実施し、Artifact-only commit/push、PR更新、最新CI確認を完了する。

## 完了処理の参照先

- Run Artifact: `docs/reference/run-artifacts.md`
- file-changing taskのcommit / push / PR / CI: `docs/reference/codex-implementation-harness.md`
- 修復workflow: `docs/reference/repair-loop.md`、`.agents/skills/repair-loop/**`
- Git refspec / safety: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- [x] installed `codex-cli 0.155.1`の`exec resume --help`で`--sandbox`と`-C`がresume subcommand optionにない。resume CLI構成を固定optionより後ろへ置く不具合を修正対象とした。
- [x] common smoke promptがshell commandを明示せず、command_executionの観測がtool選択に依存していた。固定Node commandとspecific command / exit code判定で修正対象とした。

## Blocked（ブロック中）

- まだなし。Target manual detachとcanonical runは後続task。
