# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. Plan、Issue #162、PR #164、branch、main差分、関連設定・workflow・contractを確認する。
- [x] 2. 候補3 scriptと連続実行を同一環境で3回ずつ実測し、Hook構成を決定する。
- [x] 3. Husky依存、`prepare`、`.husky/pre-commit`を実装する。
- [x] 4. 対象3 workflowへ `HUSKY: "0"` を追加する。
- [x] 5. Husky/workflow contract testを実装する。
- [x] 6. diff、改行、lockfile、EAS/対象外workflow境界を確認する。
- [x] 7. 一時cloneで通常install、Hook path、正常commit、異常commit停止を検証する。
- [x] 8. 関連contract、標準品質gate、`pnpm run verify`を検証する。
- [x] 9. Run Artifactをfinal commit前状態まで更新・検証する。
- [x] 10. branch safetyを再確認し、commit対象を確定してcommitする。
- [ ] 11. 明示refspecでpushし、最新PR CIとPR状態を確認する。

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

- ブロック時のみ記載する。
