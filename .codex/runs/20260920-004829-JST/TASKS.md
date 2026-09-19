# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #117とPR1〜PR5の完了状態を確認する。
- [x] 2. 現行`main`のTrigger / Semantic / Deterministic Evalと対象Skill契約を確認する。
- [x] 3. PR6のstage方式、代表case、変更範囲、検証方法を確定する。
- [x] 4. `test/117-pr6-workflow-e2e-eval`を確認済み`main`から作成する。
- [x] 5. canonical Planとplan-only Run Artifactをbranchへ保存する。

## 完了処理の参照先

- 基本Progress: `docs/reference/run-artifacts.md`。
- Plan保存: `PLANS.md`。
- Git branch安全性: `docs/reference/git-branch-safety.md`。

## Discovered（発見事項）

- 現行OTel observerは同一観測内の複数canonical Skillを`multiple_skills`としてunobservableにするため、PR6はstage単位で観測する。
- PR5は`repair-loop`と`android-native-local-validation`のactual execution評価をPR6へ明示的に残している。

## Blocked（ブロック中）

- なし。
