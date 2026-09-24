# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 1. PR head、CI、直近blocked result、Plan、runner経路を確認する。
- [x] 2. Run Artifactを作成し、対象範囲と原因仮説を記録する。
- [x] 3. Target親配下のAgent workspace helperとcommon smoke predicate診断を実装する。
- [x] 4. workspace配置・diagnostic predicate・blocked resultのregression testを追加する。
- [x] 5. focused test、repository test、markdown lint、verify、diff checkを実行する。
- [x] 6. self-reviewし、source差分と変更範囲を確認する。
- [x] 7. Run Artifactをsanitizationし、implementation commitを作成・pushして最新head CIを確認する。
- [x] 8. fresh sanitized Targetを作成し、手動detach後preflightを通してcanonical runを一度実行する（run_status=blocked。source guard false positiveのためcommon smoke前に停止）。
- [ ] 9. canonical resultを検証・sanitizationし、Run Artifactをcommit/push、PR本文を更新する。
- [ ] 10. Artifact head CIと残存blockerを確認して完了判断する。

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
