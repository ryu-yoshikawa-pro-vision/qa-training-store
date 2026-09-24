# Tasks（タスク）

## Now（現在）

- [x] 1. PR #168 / branch / origin/main / behind / worktree / 9ea92af以降のdiffとcanonical Planを確認し、Evaluator SHAを固定する。
- [x] 2. Repository標準経路で今回専用Run Artifactを作成する。
- [x] 3. pinned tracked Git objectからsanitized sibling Targetを生成し、inventory / exclusions / canonical Skillsを確認する。
- [x] 4. Targetをfresh repository化し、stage・root commit・detach以外のpreflightを確認する。
- [x] 5. adb devices -lで利用可能なphysical Android deviceをread-only確認し、serialをredactして保持する。
- [x] 6. ユーザーdetach後、TargetとEvaluatorの全preflightをread-only再確認する。
- [x] 7. canonical live Workflow E2Eを1回だけ実行し、result / provenance / Case A-E / Semantic出力をPlanに照合する。
- [x] 8. Run Artifactを最終sanitizationし、Evaluator source差分0・artifact-only差分を確認する。

## 完了処理の参照先

- 基本Progress: docs/reference/run-artifacts.md
- commit / push / PR / CI lifecycle: docs/reference/codex-implementation-harness.md
- branch safety: docs/reference/git-branch-safety.md

## Discovered（発見事項）

- common smokeが実Runtime capabilityを実証できず、fixed case実行前にrun_status=blockedで停止した。

## Blocked（ブロック中）

- canonical Workflow E2E評価はcommon smoke blockerにより未完了。Run Artifactの保存とPR / CI lifecycleは続行する。