# Tasks（タスク）

## Now（現在）

- [x] 1. PLANを確定する。
- [x] 2. 両OSのGitバージョン・PATH・worktree一覧・関連設定・ポインタを確認する。
- [x] 3. 根本原因を切り分け、一時Gitリポジトリで拡張の有無を再現検証する。
- [x] 4. 管理情報のバックアップを取得し、公式コマンドを試行して判定を記録する。
- [x] 5. 安全性ゲートの許可／拒否を既存契約テストで確認する。
- [x] 6. ドキュメントとRun Artifactを現状に合わせて更新する。
- [x] 7. ローカル検証（test:hooks / diagnose:hooks / format:check:strict / lint）を実行する。
- [x] 8. 変更範囲を確認し、Run Artifactをfinal commit前状態まで更新・検証する。
- [x] 9. commit対象を確定する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- [x] 10. GitHub Desktop同梱Gitが2.56.xであることを確認する。
- [x] 11. 他worktreeに既存のstaged変更があることを確認し、非対象として保護する。

## Blocked（ブロック中）

- 公式拡張`extensions.relativeWorktrees`の有効化は共有HookのG10で拒否された。Hookを回避せず、ユーザーによる明示的な実行が必要（Progress分母には含めない）。
