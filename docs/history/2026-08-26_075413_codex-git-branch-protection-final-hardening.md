# Issue #60 最終hardening（2026-08-26）

PR #65の継続修正として、PreToolUse Git safety policyの実行contextとmutation targetの安全境界を補強した。

- shell command前半のbranch／cwd／persistent environment transition後にcontext-sensitive Git mutationが続く場合をfail-closeした。
- `update-ref -m`、fetch／pullの`--refmap`／`--stdin`、state-changing `git config`、protected branchのdelete／renameをtoken単位で検査するregressionを追加した。
- Bash line continuationと限定的なunquoted option escapeを正規化し、quoted argumentと既存Git invocation単位評価を維持した。
- 完全なshell／Git parser、alias expansion、wrapper、特殊Git plumbing網羅、`.git`直接書換え、branch／worktree manager、PR expected branch state managerは対象外とした。
