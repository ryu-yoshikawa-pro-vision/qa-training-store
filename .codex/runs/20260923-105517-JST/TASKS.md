# Tasks（タスク）

## Now（現在）

- [x] 1. PR #168 head、branch、`origin/main`、worktree、4 Plan文書を確認し、Evaluator SHAを固定する。lockfile準拠依存を導入する。
- [x] 2. `new-run.ps1`で専用Runを作り、目的と開始条件を記録する。
- [x] 3. 指定Git objectだけからsanitized Target contentをexportし、除外一覧と兄弟配置を確認する。G10拒否地点も記録する。
- [x] 4. G10 blockerに従ってcanonical runを開始せず、runner / result JSON / case評価がない事実を記録する。
- [x] 5. 今回Run Artifactをsanitizer Write / Checkで検証する。
- [x] 6. source diff scope、branch、commit対象、sanitizerを最終確認する。

## 完了処理の参照先

- 基本Progress: `docs/reference/run-artifacts.md`
- commit / push / PR / CI: `docs/reference/codex-implementation-harness.md`
- branch安全: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- なし。

## Blocked（ブロック中）

- Targetのstage / synthetic root commit / detached HEAD確認。G10拒否後の再試行は禁止。
- physical device preflightとcanonical run、およびcase別評価。Target完成前のため未着手。
