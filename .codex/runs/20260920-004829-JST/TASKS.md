# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #117とPR1〜PR5の完了状態を確認する。
- [x] 2. 現行`main`のTrigger / Semantic / Deterministic Evalと対象Skill契約を確認する。
- [x] 3. PR6の初期stage方式、代表case、変更範囲、検証方法を確定する。
- [x] 4. `test/117-pr6-workflow-e2e-eval`を確認済み`main`から作成する。
- [x] 5. canonical Planとplan-only Run Artifactをbranchへ保存する。
- [x] 6. Planを全体レビューし、handoff、answer-key isolation、Artifact reuse、stop境界、PR5持ち越し責務の必要性を再検証する。
- [x] 7. 必要と判断した修正だけをcanonical Planとplan-only Run Artifactへ反映する。

## 完了処理の参照先

- 基本Progress: `docs/reference/run-artifacts.md`。
- Plan保存: `PLANS.md`。
- Git branch安全性: `docs/reference/git-branch-safety.md`。

## Discovered（発見事項）

- handoffはfresh `--ephemeral` sessionの列ではなく、Codex標準`exec resume <thread_id>`を使った同一threadの複数ユーザーターンとして評価する必要がある。
- Artifact reuseはsame-sessionの会話履歴から要求を取得できるため、fresh session / fresh workspaceで別checkにする必要がある。
- Targetから`.agents/skills/*/evals/**`、過去Run / Plan等のanswer keyを除外する必要がある。
- Issue #117が明示する`no-progress` / `unsafe` stopを`stop_needs_human`で代用しない。
- PR5は`repair-loop`のchanged files / validation / remaining delta / decisionと、Nativeのfirst anomaly / stage gate / retry / stop判断をPR6へ残している。

## Blocked（ブロック中）

- なし。installed Codexのresume + OTel成立可否は実装開始時のsmoke probeで確認する。
