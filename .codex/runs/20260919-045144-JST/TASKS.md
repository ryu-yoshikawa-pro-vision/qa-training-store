# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. branch、working tree、latest main取り込み、Issue、Planを確認する。
- [x] 2. 既存textlint / custom scanner / checker / contract / CI / verify / reference / ADRを現物確認する。
- [x] 3. 一時workspaceへ`textlint-rule-preset-japanese@10.0.4`を導入し、8候補を一時config + textlint APIで実測する。
- [x] 4. 一般日本語ruleの採否・設定値を固定し、dependency metadataとproduction version条件を確認する。
- [x] 5. 正式採用した個別packageをproductionへ追加し、presetを削除する。
- [x] 6. `.textlintrc.json`、既存scanner、contract fixtureを正式採用ruleへ対応する。
- [x] 7. Repository固有候補を全体検索・対象範囲集計・fixtureで評価し、安全なruleだけを設定する。
- [x] 8. 既存checkerへ`--all`を追加し、`package.json`、verify、Style Qualityへ接続する。
- [x] 9. 正式採用ruleの対象Markdown違反を意味保持でmigrationする（対象違反0件）。
- [x] 10. contract、reference、ADR-0026を実装状態へ最小更新する。
- [x] 11. focused / repository標準検証、Hook contract、full scan、verifyを実行する。
- [x] 12. diff、Run Artifact sanitization、変更範囲、commit対象を確定する。
- [ ] 13. 通常commit / pushし、PRがあれば最新headのCIとOPEN状態を確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 2026-09-19: ローカルbranchは作業開始時点でremote branchより3 commit遅れていたため、fast-forward同期を先に実施した。

## Blocked（ブロック中）

- ブロック時のみ記載する。
