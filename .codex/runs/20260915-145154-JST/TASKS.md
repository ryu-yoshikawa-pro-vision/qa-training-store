# Tasks

## Now

- 実行順に並べる（上から順に処理）。
- [x] 1. branch／PR／Issue／Plan／現行launcher／Hook本体／contract／依存状態を確認し、修正scopeを確定する。
- [x] 2. `must_fix`分類、bounded repair計画、allowed files、検証条件をRun PLANへ確定する。
- [x] 3. Stop／SessionStart configured launcherを最小修正する。
- [x] 4. Unix／Windows configured launcher contractとADR-0026を更新する。
- [x] 5. focused contract、Harness、標準関連検証、diff checkを実行する（launcher追加契約はPASS、既存Hook state cleanupのローカル環境依存FAILを記録）。
- [x] 6. 非対象差分、security出力、Run Artifactを確認・sanitizeする（非対象source差分なし、sanitize residual 0）。
- [ ] 7. branch安全確認後にcommit／pushし、local／remote／PR headを一致させる。
- [ ] 8. 最新PR headのrequired CIを確認し、PR本文を更新する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- [x] D1. `codex-cli 0.154.0`、Node 24.12.0、pnpm 9.10.0、lockfile／node_modulesの存在を確認した。
- [x] D2. PR #146とIssue #134はOPEN、local／remote／PR headは`1382f41d...`で一致し、作業treeは開始時cleanだった。

## Blocked

- ブロック時のみ記載する。
