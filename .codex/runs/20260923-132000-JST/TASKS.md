# Tasks（タスク）

## 完了

- [x] 1. Issue #177の初回目的、成功状態、対象外を確認する。
- [x] 2. 現在mainの.gitattributes、.editorconfig、.prettierrc.json、package.json、.husky/pre-commitを確認する。
- [x] 3. ADR-0017と2026-08-17のEOL Plan / Historyを確認する。
- [x] 4. 2026-09-06以降のRun Artifactから78 files failureの再発履歴を確認する。
- [x] 5. Git gitattributesとPrettier endOfLineの公式仕様を確認する。
- [x] 6. main 01cd8ab15078d479e821d373445af1e16a469519からplan/issue-177-windows-crlf-prettierを作成する。
- [x] 7. 初回の調査順序、原因別の変更方針、検証matrix、完了条件を保存Planへ確定する。
- [x] 8. 初回Plan-only Run Artifactを保存する。
- [x] 9. 2026-09-23更新後のIssue #177を再取得し、追加されたHook / worktree要件を確認する。
- [x] 10. scripts/security-static-check.tsのRepository-wide責務とfile引数非対応を確認する。
- [x] 11. Codex文章品質Hook -> lint-text-quality -> textlint、およびdiagnose:hooks -> smol-tomlのstatic import境界を確認する。
- [x] 12. tests/contracts/codex-text-quality.test.tsがgit init + dependency symlink fixtureで、actual linked worktreeを再現していないことを確認する。
- [x] 13. tests/contracts/husky-config.test.tsが現行Repository-wide 3 commandを固定していることを確認する。
- [x] 14. 保存Planの矛盾を解消し、Husky / Codex Hook / diagnostics / linked worktree検証を統合する。
- [x] 15. Plan-only Run Artifactを更新する。
- [x] 16. Plan全体をIssue #177、Husky、security check、Codex Hook、doctor、contract、CIと再照合する。
- [x] 17. Git index / stage 0、worktree config、git-path、Prettier API、ESLint Node APIの公式仕様を確認する。
- [x] 18. staged-only契約を「staged pathのworktree content」から「Git index stage 0 content」へ修正する。
- [x] 19. Case Cをpre-commit EOL緩和からlocal Repository-wide check / CI strict LF責務の比較へ修正する。
- [x] 20. current Repository metadataを共有するlinked worktreeをread-only probeへ限定する。
- [x] 21. no-dependency Hook / doctor testでlinked worktree自身のscript pathを実行する契約を追加する。
- [x] 22. 検証matrix、リスク、完了条件、実装タスクを上記契約へ同期する。
- [x] 23. Prettier staged checkへ`.prettierignore` / `.prettierrc.json` / `.editorconfig`を現在CLIと同じ意味で適用する契約を追加する。
- [x] 24. ESLint staged checkのwarning-only PASS / error FAIL / ignore PASSを既存`eslint .`契約として追加する。
- [x] 25. `diagnose:hooks`のdependency不足=ERROR / exit 1、repository context確立不能=exit 2、WARN-only=exit 0を固定する。
- [x] 26. current Repositoryを共有するlinked worktree probeを`git worktree add/remove`だけ許可する境界へ修正する。
- [x] 27. staged対象0件と`git commit --allow-empty`のHusky回帰契約を追加する。
- [x] 28. Safe change surface、検証、リスク、完了条件を再同期し、Plan分割不要を確認する。

## ブロック中

- なし。
