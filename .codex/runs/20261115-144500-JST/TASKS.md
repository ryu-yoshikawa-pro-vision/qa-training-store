# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PLANを確定する。Repository planとRun PLANを作成。
- [x] 2. 必要な調査を行い、証跡をrun-local REPORTへ残す。
- [x] 3. 実行タスクへ落とし込む。Actions-only / PR limit 0に限定。
- [x] 4. 実装・変更する。Dependabot configをローカル作業branchに追加。
- [ ] 5. ローカル検証する。
- [x] 6. 変更範囲を確認する。5ファイルのstaged diffのみで関係ないworkflow/lockfile変更なし。
- [x] 7. Run Artifactをfinal commit前状態まで更新・検証する。sanitizer後に変更があれば再実行。
- [x] 8. commit対象を確定する。5ファイルを明示してstage済み。commitはverify blocker解決まで未実施。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- `bash scripts/verify`のtemplate contractに、5つのpolicy文書に対する古い完全一致assertionが55件あることを静的監査で確認。実行では最初の失敗で停止。AGENTS.md §8 L2のため、approval前にworkflow/harnessを変更しない。

## Blocked（ブロック中）

- ローカル必須verifyが既存の契約assertionでFAIL。55 assertion/5文書のharness修正は別L2変更として承認待ち。ローカルvalidationを完了扱いにしない。
- `wait_for_required_ci` MCP toolがこの実行環境で利用できない。PRを作成する場合、agentによるActions pollingへ代替しない。
