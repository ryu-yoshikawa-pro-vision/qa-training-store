# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. 現行HEAD、PR、config、Hook本体、既存test、Planを確認し、今回のsafe change surfaceを確定する。
- [x] 2. `must_fix`分類、変更計画、allowed files、検証条件をRun PLANへ保存する。
- [x] 3. Unix／Windows configured Stop fallbackへcurrent session baseline cleanupを最小実装する。
- [x] 4. failure lifecycle、他session保持、cleanup後の再baseline、漏えい防止のcontract testを更新する。
- [x] 5. focused contract、Harness、標準verify、文章lint、diff checkを実行する。
- [x] 6. scope、非対象差分、Run Artifactのsanitizeを確認する。
- [ ] 7. Run Artifactをfinal commit前状態まで確定し、branch safety確認後にcommit／通常pushする。
- [ ] 8. 最新PR headのWeb／Mobile CI、PR本文、local／remote／PR head一致を確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- [x] D1. 現行HEADは指定値`6c9a38514bacbad020cb2a49671c22dbae3c1c43`で、branchは正しくworking treeはcleanだった。
- [x] D2. Stop launcher active=trueは固定structured diagnosticを返すが、launcher failure fallbackからstate cleanupを行っていない。
- [x] D3. Hook本体の`makeStatePath()`／`cleanupAllowedStop()`は既存のcurrent session cleanup契約を満たしており、今回変更対象外とした。

## Blocked（ブロック中）

- ブロック時のみ記載する。
