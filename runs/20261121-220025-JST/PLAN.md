# Plan（計画）

## Objective（目的）

- Windows側の既存worktreeを維持したまま、Windows/WSL2の双方でGit管理情報を正常に扱える状態であることを確認し、必要な場合に限って修正する。
- `prunable`の根本原因と旧Gitの使用有無を特定し、現状と一致するドキュメントおよびRun Artifactを残す。

## Scope（対象範囲）

- In:
  - ローカルGitのworktree管理情報（`.git` / `gitdir` ポインタ、`.git/config` の関連設定）
  - Windows / WSL2 のGit実行環境とバージョン確認
  - `docs/reference/opencode-v2-safety.md`、PR本文、新規Run Artifact
  - 共有`evaluateCommand()`による許可／拒否の確認
- Out:
  - Gitの再インストール・更新、worktreeの移動・再作成
  - `.codex/hooks/pre_tool_use_policy.mjs`、`.codex/config.toml`、`.opencode/plugins/git-safety/index.js`、`opencode.jsonc`
  - 製品コード、依存関係、CI workflow、`.codex/runs/**` の過去履歴
  - 実際の`git worktree prune`、破壊的Git操作、PRのmerge／Draft解除、Native iOS CI / Expo Doctor

## Assumptions（仮定）

- エージェントのGitは`<USER_HOME>/.local/share/git-current/bin/git`（2.56.1）、Windowsは`git.exe` 2.56.0.windows.4、GitHub Desktop同梱Gitも2.56.xである（作業開始時に確認済み）。
- 共有Hookは状態変更を伴う`git config`をG10で拒否する（コード確認済み）。設定変更が必要ならユーザー明示操作とする。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし（ユーザー提示の確定事項に従う）。
- 仮定してよい細部: 一時環境での再現は`<TEMP_ROOT>`配下に限定し、実リポジトリへ適用しない。
- 未回答の重要質問: なし。公式拡張の有効化はHookに拒否されたため、ユーザー判断に委ねる。

## Hypotheses（仮説）

- H1: `prunable`は旧Git（2.43.0）が相対`gitdir`をCWD基準で解釈することによるもので、現行Git（2.56.x）では解消している。
- H2: 相対ポインタと`.git/config`の参照は整合しており、管理情報の破損はない。
- H3: `extensions.relativeWorktrees`は`repair --relative-paths`の公式動作で設定されるが、旧Git対応のため手動でunsetされた暫定状態である。

## Research Plan（調査計画）

- Round 1 Query: 両OSのGitバージョン、PATH、worktree一覧、関連設定、ポインタ内容。
- Round 2 Query: 一時Gitリポジトリで`repair --relative-paths`と拡張の有無を再現し、旧Gitの挙動を比較。
- Exit Criteria:
  - 主要仮説ごとに支持／反証の根拠がある
  - 未解決論点に次アクションがある

## Approach（進め方）

- 現状確認 → 根本原因の切り分け → 一時環境での再現検証 → バックアップ → 公式コマンドの試行 → 拒否時は停止して報告 → ドキュメント／Run Artifact更新 → 品質ゲート → commit／push → 最新headのCI確認。

## Definition of Done（完了条件）

- Windows側の既存worktreeを維持している。
- 両OSで`status` / `rev-parse` / `branch` / `worktree list`が正常で、`prunable`が出ない。
- ポインタと参照先が整合し、未コミット変更を失っていない。
- 共有Hookの許可／拒否が維持されている。
- ドキュメントが現状と一致し、変更した追跡ファイルのゲートが成功している。
- PR #227はDraftのまま、headが更新後のcommitと一致している。

## Risks / Unknowns（リスク・未知点）

- 旧Git（2.43.0）を明示的に使うツールがあると`prunable`または「unknown repository extension」で失敗する。対策: PATHと実使用クライアントを確認し、残る制約として記録する。
- 公式拡張の有効化は共有Hookが拒否する。対策: 回避せず、ユーザー明示操作として報告する。

## Thinking Log（判断記録）

- 2026-11-21: 現行Gitでは`prunable`が出ず、ポインタも整合していたため、worktreeリンク自体の修正は不要と判断した。
- 2026-11-21: 一時環境で`repair --relative-paths`が公式に拡張を設定すること、および旧Gitが拡張の有無で異なる失敗をすることを確認した。
- 2026-11-21: 公式拡張の有効化を試行したが共有HookにG10で拒否されたため、停止してユーザー明示操作に委ねる。ドキュメントは現状（拡張未設定）を正しく記録する方針。
