# Tasks（タスク）

## Now（現在）

- [x] 1. PR #168 remote head、origin/main、behind、worktree、source diff、4 Planを再確認しEvaluator SHAを固定する。
- [x] 2. `scripts/new-run.ps1`標準経路で今回Run Artifactを作成し、目的と計画を記録する。
- [x] 3. pinned tracked Git objectからfresh sibling sanitized Targetをexportし、required / forbidden pathを検証する。
- [ ] 4. Targetで通常Git commandによりsingle parentless root commit、detached / clean / no-remote / no-alternatesを作り、routing SHAを記録する。
- [ ] 5. Case E用の利用可能なdevice serialを準備し、canonical Evaluator preflightを確定する。
- [ ] 6. 前提を全て満たす場合に限りcanonical runnerを1回実行し、result / CLI / case / Semantic結果を確認する。
- [x] 7. Run Artifactをsanitize・検証し、source差分がRun Artifactのみであることを確認する。
- [ ] 8. 実行状態をRun Artifactへ記録し、必要な場合はRun Artifactだけcommit / push、PR本文更新、最新head CI確認を行う。

## 完了処理の参照先

- Progress: `docs/reference/run-artifacts.md`
- Commit / push / PR / CI: `docs/reference/codex-implementation-harness.md`
- Git safety: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- sanitized Target exportではWindows `tar.exe`が日本語pathnameを展開できず、部分生成Targetが2つ生じた。どちらも再利用していない。
- Target commit後の`git switch --detach HEAD`はapproval policyにより実行前拒否。G10 classification stringは返されていない。

## Blocked（ブロック中）

- Target detached HEADを作れずTarget preflight未完了。canonical runnerは未起動。
- Case E serialは未準備・未検証。未実施のpreflightを追加せず停止中。