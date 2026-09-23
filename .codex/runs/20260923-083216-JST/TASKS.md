# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PR #168 / latest `origin/main` / branch ancestry / current diff、指定Plan、前回canonical result、runner / contract testを確認し、Findingを分類する。
- [x] 2. 今回のbounded repair Runを作成し、2件の修正範囲とDoDを固定する。
- [x] 3. Git-visible file fingerprintを持つstage-start / stage-end snapshotと差分判定を実装する。
- [x] 4. Case B local Evidenceをcurrent runのofficial prefixとregular fileへ限定する。
- [x] 5. Temp Git repository / Evidence treeを使うbehavior regression testsを追加する。
- [x] 6. Workflow E2E targeted repository contractと今回の2つの回帰群を実行する。
- [x] 7. `corepack pnpm run test:repository`、`corepack pnpm run lint:markdown`、`corepack pnpm run verify`を実行する。
- [ ] 8. source-cleanなEvaluator commitでcanonical live runを1回実行し、結果を保存する。
- [ ] 9. Run Artifact sanitization、`corepack pnpm run diagnose:hooks`、差分・契約レビューを完了する。
- [ ] 10. commit / 通常push、PR本文更新、最新PR headのWeb CI / Mobile App CI確認を完了する。

Progress: 70% (7/10)

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
