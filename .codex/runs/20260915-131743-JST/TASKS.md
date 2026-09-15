# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PLANを確定する。
- [x] 2. 必要な調査を行い、証跡をrun-local REPORTへ残す。
- [x] 3. 実行タスクへ落とし込む。
- [x] 4. 実装・変更する。
- [x] 5. ローカル検証する。
- [x] 6. 変更範囲を確認する。
- [x] 7. Run Artifactをfinal commit前状態まで更新・検証する。
- [x] 8. commit対象を確定する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。

- [x] A1. 最新Skillの一般英語混在を、固定契約・正式名称・技術用語と分離して再監査する。
- [x] A2. 固定section名が実見出しに残っていることをvalidator / contract testで確認する。
- [x] A3. PR #146の状態が変わっていないことをpush前に再確認する。
- [x] A4. code-review referenceのレビュー結果保存方針表現を既存の日本語へ統一する。
- [x] A5. Androidローカル検証Skillの一般説明を必要最小限修正し、固定契約を維持する。

## Blocked（ブロック中）

- ブロック時のみ記載する。
