# Tasks（タスク）

## Now（現在）

- [x] 1. 指定HEAD、既存契約、mainとの差分、複数subagentの調査結果を統合する。
- [x] 2. Runner、Completion、C10、Workbook、Diagnostic、Training Copy、CIを最小差分で修正する。
- [x] 3. P1/P2教材、GitHub Actions README、Training Workbook READMEを実装契約へ同期する。
- [x] 4. 必須回帰テスト、Runtime Contract、CI workflow contractを追加・修正する。
- [x] 5. 型検査、Lint、文書、Security、Curriculum、formatter、diff checkを実行する。
- [x] 6. Runtime専用scriptとTraining関連Contractを実行し、失敗と環境依存timeoutを分類する。
- [x] 7. 差分範囲を確認し、Run Artifactをfinal commit前状態へ更新・sanitizer・collector検証する。

## Out of scope（今回実施しない）

- PR更新、merge、PR close、force push。commit／pushは今回実施する。
- 実GitHub Training Copy環境の用意とPart 2 V1のPASS判定。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- [x] ローカル`output/**`の生成済みテストがVitest discoveryへ混入するため、Contract scriptsから除外する。
- [x] Windows上の通常Contract全体が6分超で完了しないことを確認し、個別必須Contractと単独workflow testの結果を分離記録する。

## Blocked（ブロック中）

- Part 2 V1: 学習者が書き込み可能なTraining Copy、branch / push / PR、GitHub Actions Run / Check / Artifactが未提供のためBLOCKED。架空のReceipt / Evidenceは作成しない。
