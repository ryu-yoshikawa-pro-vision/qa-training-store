# GitHub Actions参照運用方針の変更

- 記録日: 2026-11-18
- 変更前の運用契約: `docs/PROJECT_CONTEXT.md`では、すべてのremote Action参照をfull-length commit SHAで固定していた。
- 変更理由: SHAを`uses:`へ直接記述する方式ではDependabotがActionsのsecurity-only更新を作成・同期できないため、workflowで使うrelease versionと実行commitのpinを分離する。
- 新しい運用契約: `.github/workflows/`のActionは検証済みの完全なrelease tagを参照し、公式`gh actions-lock`生成の`.github/workflows/actions.lock`にcommitとrepository identityを記録する。CIで`gh actions-lock --verify`を実行する。移行時にAction versionは上げない。`training/github-actions/`のTraining Copyテンプレートは別契約としてfull commit SHA pinを維持する。
- 例外と未検証事項: 同一repository内のjob-level reusable workflow呼出し3件はそのまま維持し、呼出先workflow内のActionをlockする。GitHub Actions lockfile機能の対象環境（GitHub Enterprise Cloud）か、Require lockfile policyによる全workflowのcoverage強制、およびDependabot security update PRでのlockfile自動同期は、この変更では確認していない。
- 方針変更の計画: [GitHub Actions Lockfileとsecurity-only更新への切替](../plans/2026-11-17_224644_github-actions-lock-security-only.md)を参照する。以前の計画とRun記録は履歴として保持する。
