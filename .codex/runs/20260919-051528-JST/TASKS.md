# Tasks（タスク）

## Now（現在）

- [x] 1. これまでのレビュー結果をIssue #163、PR #167、現行Planへ再照合し、重複を統合する。
- [x] 2. OpenCode fallbackの責務を簡素化し、全candidate総当たりとlockfile全面deep comparisonを削除する。
- [x] 3. raw Alert、OIDC、dependency codeのSecurity境界を4 job構成へ分離する。
- [x] 4. parent update / overrideの安全条件、installed graphの限界、publish直前再確認、retry禁止をPlanへ固定する。
- [x] 5. Cloudflare Preview除外をIssue #163の対象へ限定し、Expo maintenanceの既存契約を維持する。
- [x] 6. Run Artifact例外と`SECURITY.md`の責務を整理する。
- [x] 7. Plan末尾のbare URLをMarkdown linkへ修正する。
- [x] 8. active Run Artifactを更新し、実装ファイルへ進んでいないことを確認する。

## Discovered（発見事項）

- `pnpm install --lockfile-only`だけではnode_modulesが更新されないため、その直後の通常`pnpm list`をcandidate検証に使う旧設計は成立しない。
- `env -i`は環境変数を除外するが、同じrunner filesystem上のraw Alertをdependency codeから隔離しない。
- OpenCodeの安全性は「Repository文書を読んだこと」ではなく、permission、structured input、semantic validator、job境界で保証する必要がある。
- `pnpm list --json --depth Infinity`は現在runnerへinstallされたgraphの確認に使い、lockfile内の全platform dependencyを含む完全graphとは扱わない。
- Issue #163のCloudflare Preview要件はRenovate / OpenCode Security PRであり、全Bot除外は不要なscope拡大になる。

## Blocked（ブロック中）

- Owner権限で現在のopen Dependabot Alert件数を確認し、`vulnerabilityAlerts.prConcurrentLimit`の具体値を決める必要がある。
- この未確定値がblockするのは`renovate.json`と`tests/contracts/renovate-config.test.ts`だけとする。
