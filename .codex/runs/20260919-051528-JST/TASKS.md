# Tasks（タスク）

## Now（現在）

- [x] 1. 最新PR #167 / Issue #163 / Planを再確認する。
- [x] 2. これまでのレビュー結果を4つの残存根本問題へ統合する。
- [x] 3. 6 job構成を維持し、`validate-exec`が任意コード実行前に`prepared-security-fix`を確定する契約へ変更する。
- [x] 4. `finalize`がprepared package / lockfileを再生成せず再利用する契約へ変更する。
- [x] 5. authorizationへexpected exact resolved versionとparent-scoped overrideのbaseline全edgeを追加する。
- [x] 6. prepared lockfile全体のtarget package version scanを既存`yaml@2.9.0`で行う契約を追加する。
- [x] 7. 6 jobすべてへjob-level `github.run_attempt == 1`を要求する契約を追加する。
- [x] 8. `.github/workflows/**`全体の`id-token: write`制約とOpenCode App OIDC exchange契約を追加する。
- [x] 9. `OPENCODE_DISABLE_DEFAULT_PLUGINS=1`を追加する。
- [x] 10. validator / workflow contract / activation後検証 / リスクを新契約へ揃える。
- [x] 11. PR本文とactive Run Artifactを更新し、実装ファイルへ進んでいないことを確認する。

## Blocked（ブロック中）

- Owner権限で現在のopen Dependabot Alert件数を確認し、`vulnerabilityAlerts.prConcurrentLimit`の具体値を決める必要がある。
- この未確定値がblockするのは`renovate.json`と`tests/contracts/renovate-config.test.ts`だけとする。
- 外部App activation前に要求権限、Repository scope、Production trustとOpenCode AppのRepository単位OIDC trustをOwnerが確認する。
