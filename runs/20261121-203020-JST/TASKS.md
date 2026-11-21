# Tasks（タスク）

## Now（現在）

- [x] 1. 進行中のGitマージ状態を確認する（HEAD / MERGE_HEAD / 競合ファイル / upstream）。
- [x] 2. GitHub上のPR #227 headとローカルHEADが一致することを確認する。
- [x] 3. 競合ファイル（AGENTS.md）の3-way入力を取得し、双方の変更目的を調査する。
- [x] 4. main側の新規Run Artifact規約とdelegation規約を確認する。
- [x] 5. 競合を解消する（main側の新規契約 + PR側のOpenCode V2安全性文を統合）。
- [x] 6. 競合していないmain側変更がPR側の安全性機能を破壊していないことを確認する。
- [x] 7. 品質ゲートを実行する。
- [x] 8. 変更範囲を確認しcommit対象を確定する。
- [x] 9. マージコミットを作成する。
- [x] 10. PR #227ブランチへpushし、GitHub上の状態を確認する。
- [x] 11. Run Artifactをfinal commit前状態まで更新・検証する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 競合は`AGENTS.md`の冒頭1箇所のみ。main側のRule変更（Run Artifact root移行、delegation規約、wrapper retirement）はGitが自動マージ済みで、PR側のOpenCode V2 safety文のみが競合した。
- 検証環境の`node_modules`は元々シンボリックリンクで`.gitignore`の`node_modules/`パターンに一致せず、`git status`に未追跡として表示された。実ディレクトリ＋各依存へのシンボリックリンクへ置き換えることで無視され、テストの`EISDIR`を回避した。
- `spec-agentic-qa.test.ts`の2件は全contractsスイート内では失敗したが、単独実行では2件とも成功した（テスト順序／環境干渉によるもので、マージ解消の回帰ではない）。

## Blocked（ブロック中）

- なし
