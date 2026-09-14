# Tasks

## Now

- 実行順に並べる（上から順に処理）。
- [ ] 1. PLANを確定する。
- [ ] 2. 必要な調査を行い、証跡をrun-local REPORTへ残す。
- [ ] 3. 実行タスクへ落とし込む。
- [ ] 4. 実装・変更する。
- [ ] 5. ローカル検証する。
- [ ] 6. 変更範囲を確認する。
- [ ] 7. Run Artifactをfinal commit前状態まで更新・検証する。
- [ ] 8. commit対象を確定する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。

## Blocked

- ブロック時のみ記載する。
