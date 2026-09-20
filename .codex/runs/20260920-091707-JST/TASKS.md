# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. Issue #163、PR #167 / #166、Plan、AGENTS、関連workflow、package / lockfile、Security script、既存contractを確認する。
- [x] 2. PR #167 branchが最新mainとPR #166 merge後の変更を含むことを確認し、実装開始条件を判定する。
- [x] 3. `pnpm@10.34.5`へactive package managerを揃え、lockfileを固定versionで生成する。
- [x] 4. package manager更新単体の標準検証を完了する。
- [x] 5. Plan順にCI分類、validator、OpenCode設定、6 job workflow、Security文書を実装する（未確定Renovate値を除く）。
- [x] 6. 関連contract / validator testとRepository標準検証を実行し、失敗を実装側で修正する。
- [x] 7. diff scope、security boundary、未実装のOwner判断事項を確認する。
- [x] 8. Run Artifactをsanitization / collector経由でfinal commit前状態へ更新・検証する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- `prConcurrentLimit`はPlanに具体値がなく、`renovate.json`と`tests/contracts/renovate-config.test.ts`だけを未実装で残す。
- Plan冒頭のPR #167未取り込み記述は現行履歴と不一致だが、branchは`552c75f`でmainを取り込み済みである。

## Blocked（ブロック中）

- `vulnerabilityAlerts.prConcurrentLimit`のOwner確定値がないため、Renovate設定と値依存contract testは保留。
- Owner承認を要するApp / Secret / Settings / activationと、merge後の実runtime疎通は今回の指示範囲外。
