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

- [x] D1. active violation + cleanup failureの単一JSON contractを追加する。
- [x] D2. 6 state failureのtable-driven process contractとsafe JSONL contractを追加する。
- [x] D3. inactive reason/launcher fallback/Plan/docs/PR本文を新契約へ同期する。

## Blocked（ブロック中）

- ブロック時のみ記載する。
