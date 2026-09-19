# Plan（計画）

## Objective（目的）

- Issue #163の保存Planへ最終レビュー指摘を反映し、実装時に追加判断が必要な箇所を解消する。
- 今回はPlanとRepository契約上必要なRun Artifactだけを変更し、workflow、設定、依存関係、外部Appは実装しない。

## Scope（対象範囲）

- In:
  - `docs/plans/2026-09-19_033900_issue-163-renovate-opencode-security-fallback.md`
  - `.codex/runs/20260919-051528-JST/PLAN.md`
  - `.codex/runs/20260919-051528-JST/TASKS.md`
  - `.codex/runs/20260919-051528-JST/REPORT.md`
- Out:
  - `renovate.json`
  - `.github/workflows/**`
  - `.github/opencode/**`
  - `package.json` / `pnpm-lock.yaml`
  - 外部App installation、GitHub Settings、Secret変更、PR作成

## Assumptions（仮定）

- 対象branchは`issue-163-renovate-opencode-security-fallback`で、修正開始時HEADは`f96c48b1e273305eb701a80510ec5746f495d01f`。
- Dependabot Alertsのopen件数は現在のGitHub connectorでは取得できない。Issue #163の契約上、Owner権限で件数を確認して`prConcurrentLimit`の具体値をPlanへ追記するまでRenovate設定実装を開始しない。
- pnpm `v9.10.0`ではpackage selectorなしの`pnpm list --json --depth Infinity`が10 end leavesのtruncate経路を通らないことを固定実装で確認済み。
- PR #58は複数parent-scoped overrideの実例だが、初期fallbackは入力された1 Alertを正本にし、同じAlert range内の複数pathだけをまとめて扱う。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。ユーザーから統合レビュー結果の必要修正をPlanへ反映するよう指示済み。
- 未回答の重要事項: 現在のopen Dependabot Alert件数と`prConcurrentLimit`具体値はOwner権限が必要な実装前blocker。外部Appの実権限、Production trust、Zen/OIDC疎通はactivation gateとして残す。

## Approach（進め方）

1. Issue #163、PR #58、固定pnpm/OpenCode実装、Renovate現行設定を再確認する。
2. range正規化、最小の許可version、1 Alert境界、lockfile構造差分、credential-free検証、固定concurrency、permission、activation手順をPlanへ固定する。
3. 今回taskのRun ArtifactをRepository契約に合わせて保存する。
4. branch差分がPlanと今回Run Artifactだけであることを確認し、1 commitで保存する。

## Definition of Done（完了条件）

- 最終レビューのmust_fix / should_fixがPlanのDoD、変更方針、実行タスク、検証、リスクへ一貫して反映される。
- `prConcurrentLimit`はOwner確認が必要なblockerとして明示し、それ以外のrepair methodやSecurity境界を実装者判断に残さない。
- 今回taskの変更はPlanとRun Artifact 3 filesだけで、実装ファイルへ進まない。
- branchへ通常のfast-forward commitとして保存する。

## Risks / Unknowns（リスク・未知点）

- Planだけを修正するtaskで実装ファイルへ範囲を広げない。
- Security境界を簡略化するために必要なfail-close検証を削らない。
- 外部サービスの実権限・疎通はRepository内Planだけでは確定できないため、activation gateとして明示的に残す。
