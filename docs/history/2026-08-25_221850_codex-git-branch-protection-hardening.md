# Codex Git branch protection追加修正（2026-08-25）

PR #65／Issue #60の追加修正で、既存PreToolUse Git safety policyの評価境界を拡張した。

- `git`と`git.exe`を同一Git invocationとして検出し、subcommand後のquote-aware argument tokenでG1〜G10を評価する。
- pushはexplicit safe destinationだけをALLOW候補とし、implicit／bulk／matching／wildcard／複数refspec／URL・path remoteだけのpushをfail-closeする。
- `-c`／`--config`／`--config-env`、inline `GIT_DIR`／`GIT_WORK_TREE`／`GIT_CONFIG_*`をmutation semanticsの変更として検出し、context-sensitive mutationをfail-closeする。
- fetch refspec、`update-ref`、`worktree add -B`によるprotected local branch変更をDENYする。
- 完全なshell／Git parser、wrapper、alias expansion、`.git`直接書換え、expected PR branch state managerは今回の対象外とする。

危険Git commandは実行せず、Hook判定のcontract testだけで検証する。Windows launcherはtransportのまま維持する。
