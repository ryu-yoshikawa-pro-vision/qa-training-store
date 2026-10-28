# PR #199 カリキュラム再調査・実装

既存の docs/plans/2026-10-25_202700_ai-assisted-qa-curriculum-learning-experience-rework.md と関連Plan、およびユーザーの2026-10-27指示を実装の正本とする。追加の大規模Planは作らない。

目的はM00〜M10・51目標について講師不要の教材、段階的練習、本人による実技・評価を完成させること。Phase構成、Phase 1/2でGit・PR・CIを要求しないこと、配布・プライバシー境界を維持する。

順序は、実物と仕様の棚卸し・目標対応表、教材、演習と採点の整合、クイズと配布連携、決定論的検証、最後に実モデルと実Template/2コアCodespaceの受入。正しい別解を許容し、未実行とPASSを区別する。外部受入の所有先・費用は確認待ちであり、回答待ちの間は独立作業を進める。

検証は教材の実読、演習の実行、契約・回帰・Web・配布・CIを分ける。必須受入が未実施ならPRを完了としない。未追跡workspaceは保護し、merge・削除・force pushは行わない。

## 2026-10-28 再起動後の環境判定

- User config read-only check reports windows.sandbox = "elevated" and features.prefer_mxc = true. The effective Windows sandbox could not be established from this non-interactive session: Codex Doctor could not inspect Windows sandbox accounts; the explicit MXC probe exited 1 (native MXC is unavailable on this executor), and the configured sandbox probe exited 1 (orchestrator_helper_exit_nonzero). No security or sandbox settings were changed.
- Continue only after an interactive Codex session exposes /status and /debug-config, or another approved environment provides equivalent evidence for the selected sandbox, loaded project config, trust, Hook, and permission profile.
- The current managed workspace-write shell resolves the owned repository and local branch. PreToolUse ran. Node, PowerShell, and repository child-process probes passed. Remote ref access, Corepack's pnpm download, and Vitest temp rename/harness startup did not pass in this executor.
- Recovery sequence: establish a working approved Windows sandbox and writable/rename-capable temp path; make the pinned pnpm package available from an approved cache/network; then rerun the five affected contract suites individually, the full contract suite, and the required overall verification. Preserve the safety Hook and user workspace files. Resume Task 5/8 only after the verification environment is demonstrated.

## 2026-10-28 残検証の実行結果

- 上記の前回環境阻害のうち、pnpm利用と一時clone上の全体verify/buildは実行できる状態になった。effective Windows sandbox自体は未確定のままとする。
- ユーザー提供の通常Windows PowerShell `node --run test:contracts` は55 files / 855 PASS / 4 SKIP / 0 FAILとして受領し、自己実行のevidenceと混同しない。
- 一時cloneの `pnpm run verify` は前段のformat/lint/validators/typecheck/security/unit/integration/repository/component testsを通過したが、pnpm起動下のHook launcher 1件とclone originの異なるMCP waiter 3件でcontract chainがexit 1。正規GitHub originに直した後のMCP単独suiteはworker終了後にrunnerが応答せず中断した。これはaggregate verify PASSではない。
- `build:web` / `build:spec` は一時cloneで両方exit 0。保護workspace、package.json、pnpm-lock.yamlは変更しない。
- Task 5はユーザー提供のcontract結果と既存のE2E/assessment/目標監査、今回通過した独立gate/buildを根拠に決定論的範囲を完了する。Template/2-core Codespaceおよび実モデル受入は最後に行う。
- Task 8は追跡対象を5ファイルに限定してcommit・通常push・PR本文更新へ進め、新head CIの結果はPR本文で確認する。Run artifactはcommit前に固定する。
