# Tasks（タスク）

## Now（現在）

- [x] 1. 開始HEAD、branch、status、PR、開始HEAD CI、未解決CodeQL review threadsを確認する。
- [x] 2. Codexラッパー、cleanup、Run collector/new-run、CI/verify/test/docsの実行時呼び出しを3つのGPT-6-Luna read-only roleに委任して調べる。
- [x] 3. direct `codex`、project rules trust、Hook適用条件、CLIを確認し、runtime起動失敗を記録する。
- [x] 4. 調査結果と検証手順を計画へ固定する。
- [x] 5. wrapper/sandbox/cleanupと専用設定・test/CI/docsを整理する。14の廃止対象ファイルはすべてユーザーが削除済み。wrapper専用test、auto-net overlay、cleanupの現行参照を整理した。
- [x] 6. collector/new-run、Run manifest/evaluation、Hook/execpolicy/sanitizer/security/Git safety契約の残存を確認する。
- [x] 7. Linuxの要求品質ゲートを実行し、成功・sandbox制約・未実行をRunへ記録する。全指定コマンドを実行し、sandbox `EPERM`によるFAILをPASS扱いせず記録した。
- [x] 8. 最終差分をstageし、品質/サニタイザー/通常hookを通す。staged品質・security・sanitizerは個別実行済み。commitで通常hookも実行する。
- [ ] 9. 通常commit/push、PR本文更新、最新HEAD必須CIを確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- strict Runの`run.json`更新はwrapperがなくても既存collectorを実行時に明示呼び出しすれば機械管理できる。`scripts/new-run.*`はCodex CLIとCI template workflowの実callsiteがあるため維持する。
- ユーザーが6 wrapper、wrapper専用contract tests 2件、orphaned `.codex/rules-auto-net/**` 3件、runtime callerのないmanual cleanup scriptsとcontract 3件を削除した。現行scripts／verify／CI／package／docsの実行依存は残っていない。
- 既存の独立Run／Hook／sanitizer testsへ残すべき契約は、manifest、root migration、autonomous workspace、artifact sanitization、Hook contractへ維持した。
- CodeQL未解決review threadが2件、Hook契約テストの202行および213–216行にある。今回の作業対象とは別で、threadをresolveしない。
- direct Codex runtimeはuser-level Codex state SQLiteがsandbox readonlyで開けず、`/hooks`・Hook発火検証に到達しなかった。ユーザー方針に従いsandboxやCODEX_HOMEを変更せず、未検証のまま残す。

## 残件 / 未完了

- ローカルLinux sandboxでは`test:hooks`、`test:contracts`、`pnpm run verify`の一部が`spawnSync ... EPERM`またはlocalhost `listen EPERM`で失敗した。失敗をPASS扱いせず、GitHub Actionsの対象SHAでCIを確認する。
- 14の廃止対象ファイル削除は確認済み。追加削除待ちはない。
- stage品質、通常pre-commit、commit/push、PR本文、新HEAD CIは未実施。

## 未検証（ユーザー方針で保留）

- Codex CLI runtime trust、Hook配信・発火、危険Bash拒否、親子委任。Codex HOMEのSQLite writeがsandboxで拒否された。ユーザー指示により検証未完了のまま記録し、権限緩和や迂回を行わない。この項目は他作業を止めない。
