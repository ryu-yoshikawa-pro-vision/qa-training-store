# Plan（計画）

## 目的

- Issue #163のPlanへ、これまでのレビュー結果を重複なく統合して反映する。
- OpenCode fallbackの目的を維持しながら、成立しないcandidate検証、過剰なlockfile比較、同一job内のraw Alert / OIDC境界を修正する。
- 今回はPlanとactive Run Artifactだけを変更し、workflow、設定、依存関係、外部Appは実装しない。

## 対象範囲

- 対象:
  - `docs/plans/2026-09-19_033900_issue-163-renovate-opencode-security-fallback.md`
  - `.codex/runs/20260919-051528-JST/PLAN.md`
  - `.codex/runs/20260919-051528-JST/TASKS.md`
  - `.codex/runs/20260919-051528-JST/REPORT.md`
- 対象外:
  - `renovate.json`
  - `.github/workflows/**`
  - `.github/opencode/**`
  - `package.json` / `pnpm-lock.yaml`
  - GitHub Settings / Secret / App installation
  - PR merge / close

## 確認済み事項

- PR #167 headは修正開始時点で`c11e3fb8470ccf60edd3ad6f0992b856f79a4ce8`。
- Issue #163の目的はRenovate Security修正を第一経路、人間起動のOpenCodeを限定fallbackとすること。
- `pnpm install --lockfile-only`後の`pnpm list`だけではcandidate更新後のinstalled graphを検証できない。
- 現Planのraw Alertを同一jobの`RUNNER_TEMP`へ保持したままdependency codeを実行する構成はfilesystem隔離にならない。
- current Web CI failureはPlan参考リンクの`MD034/no-bare-urls`。
- open Dependabot Alert件数は現在のGitHub connectorでは取得できない。

## 変更方針

1. OpenCode前段の全version candidate総当たりを削除し、同一major・最大10件の候補提示 + OpenCode one-shot + validatorへ簡素化する。
2. `preflight` / `read-alert` / `repair-and-validate` / `publish`へjobを分割し、repair jobからraw AlertとOIDC permissionを除外する。
3. `pnpm list`をinstalled graphとして扱い、runnerで確認できないdependencyを`needs_human`へ止める。
4. lockfile全field deep comparisonを削り、semantic diff、pnpm再生成、installed graph、既存CIへ寄せる。
5. Cloudflare Preview除外をDependabot / `renovate/` Bot / `security/` Botへ限定し、Expo maintenanceの既存契約を維持する。
6. publish直前のAlert再確認、base SHA、duplicate PR、orphan branch確認を追加する。
7. `SECURITY.md`とRun Artifact契約の責務を整理する。
8. bare URLをMarkdown linkへ修正する。

## 完了条件

- これまでのレビュー指摘が重複なくPlanへ統合される。
- Issue #163の目的を広げず、必要なSecurity境界を削らない。
- Plan内部の旧方針が残らない。
- `prConcurrentLimit`未確定の影響範囲が`renovate.json`とそのcontract testへ限定される。
- Planの参考リンクがMarkdown Lintに適合する。
- 実装ファイル、外部App、Settingsへ進まない。
