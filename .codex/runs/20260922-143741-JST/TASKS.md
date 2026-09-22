# Tasks（タスク）

## Now（現在）

- [x] 1. Issue / PR、current branch、latest `main`、指定Plan / plan-only Run Artifactを確認する。
- [x] 2. material driftを確認し、不要なmerge/rebaseを行わない判断を記録する。
- [x] 3. 既存Eval / OTel / Agentic QA / Native / package / CI契約を再照合する。
- [x] 4. implementation Run Artifactを標準経路で作成し、Plan / TASKSを確定する。
- [ ] 5. installed Codex共通smoke probe、Case B capability、Case E preflightを実施する。
- [x] 6. fixed case定義、status分類、result型、pure evaluatorを実装する。
- [x] 7. runnerのtarget/case workspace、provenance、Git scope、handoff、Artifact reuseを実装する。
- [x] 8. Case A〜E、Semantic actual-output、既存helper再利用を実装する。
- [x] 9. package scriptとrepository contract testを実装する。
- [x] 10. targeted repository contractを実行し、必要なrepairを行う。
- [ ] 11. canonical live Workflow E2Eを1回実行し、result JSONを保存する。
- [ ] 12. repository-wide test、markdown lint、verify、diff checkを実行する。
- [ ] 13. Run Artifact sanitizationと最終scope / Plan照合を行う。
- [ ] 14. code-review Skillで実装変更とPR全体を自己レビューする。
- [ ] 15. commitし、通常pushする。
- [ ] 16. PR #168本文を実装内容・検証・canonical結果・残存制約へ更新する。
- [ ] 17. 最新headのWeb CI / Mobile App CIを確認し、Run Artifactへ記録する。
- [ ] 18. 最終報告を作成する（Issue close / merge / branch削除は行わない）。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。
- [x] D1. `origin/main`は`fcaf57f...`で、current HEADの祖先であることを確認した。
- [x] D2. Plan-only Runは完了済みで、implementation Runを新規作成した。

## Blocked（ブロック中）

- ブロック時のみ記載する。
