# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。現在進行中のmerge完了後に、mainとの差分再監査へ進む。
- [x] 1. 作業開始時のbranch、HEAD、remote、PR、conflict状態を確認する。
- [x] 2. ユーザーが開始した現在進行中のmain mergeの競合を文脈ごとに解消し、merge commitを完了する。
- [x] 3. merge commit後に最新`origin/main...HEAD`差分を再取得・分類し、PR #151の目的外差分を必要最小限で整理して文章規約・main側仕様・契約をレビューする。
- [x] 4. main取り込み後の正式なローカル検証と関連contract testを再実行する。
- [x] 5. Run Artifactをfinal commit前状態まで更新・検証し、Sanitizerを実行する。
- [ ] 6. branch safetyを確認してcommit・通常pushし、local / remote / PR headを一致させる。
- [ ] 7. 最新headのPR状態、`Web CI`、`Mobile App CI`を確認し、PR本文を最新状態へ更新する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。

## Blocked（ブロック中）

- なし。現在進行中のmergeは競合解消・stageまで完了しており、merge commit後に差分再監査へ進む。
