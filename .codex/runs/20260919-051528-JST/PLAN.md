# Plan（計画）

## 目的

- Issue #163のPlanへ、これまでのレビュー結果を重複なく統合して反映する。
- OpenCode fallbackの目的を維持しながら、Zen credential、raw Alert、OIDC、publish差分のSecurity境界を成立させる。
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

- PR #167 headは修正開始時点で`0f47f5e05a55c7a18943fee4b6f3e7d21302061f`。
- Web CI / Mobile App CIは同headで成功済み。
- Issue #163の目的はRenovate Security修正を第一経路、人間起動のOpenCodeを限定fallbackとすること。
- `OPENCODE_API_KEY`を使うOpenCodeとRepository / dependency codeの検証を同一runnerへ置くとfilesystem境界が成立しない。
- `pnpm run verify`はbuild / generate処理を含むため、実行後にpublish対象差分を再検証する必要がある。
- Repositoryのtracked Run Artifact契約はSecurity fallbackにも適用され、Planだけで省略例外を追加できない。
- `pnpm list --json --depth Infinity`は現在runnerへinstallされたgraphの確認であり、lockfile内の全platform dependencyを表さない。
- open Dependabot Alert件数は現在のGitHub connectorでは取得できない。

## 変更方針

1. fallbackを`preflight / read-alert / opencode-edit / validate / publish`の5 jobへ分離する。
2. OpenCode runnerにはZen credentialだけを限定的に渡し、OpenCode終了後にRepository / dependency codeを実行しない。
3. `validate`は別runnerでsemantic diff、lockfile、installed graph、`pnpm run verify`、tracked Run Artifact、最終guardを実行する。
4. 最終guard通過後はRepository / dependency codeを実行せず、validated Artifactをそのままpublishへ渡す。
5. root parent updateを`root -> target`の1 edgeへ限定し、深いpathはoverride条件を満たさなければ`needs_human`へ止める。
6. OpenCodeのread / edit allowlist、parent-scoped override selector、Security branch命名を決定的に固定する。
7. job間ArtifactはID指定、1日保持、overwrite禁止、file SHA-256検証を必須にする。
8. RenovateのPR body / title / branch / commit messageの公開情報をconfigとcontract testで固定する。
9. tracked Run Artifactの例外を撤回し、sanitized Artifactを作れない場合はpublishしない。
10. 現行CI成功状態へPlanの現状記述を更新する。

## 完了条件

- これまでの致命的・必須指摘がPlanへ統合される。
- Issue #163の目的を広げず、必要なSecurity境界を削らない。
- OpenCodeとvalidationのcredential / filesystem境界がjob単位で成立する。
- publishされる内容が最終guard後に不変であることを機械検証できる。
- 実装者がroot parent対象範囲、read allowlist、Artifact handoff、Renovate metadata、branch / override形式を追加判断しなくてよい。
- Repositoryのtracked Run Artifact契約と矛盾しない。
- `prConcurrentLimit`未確定の影響範囲が`renovate.json`とそのcontract testへ限定される。
- 実装ファイル、外部App、Settingsへ進まない。
