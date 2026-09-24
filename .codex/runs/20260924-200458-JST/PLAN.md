# Plan（計画）

## Objective（目的）

- CI待機中のAgent/LLMによる状態確認反復をなくす変更の実装PlanをRepositoryへ保存し、PR化する。
- 実装自体はこのRunでは行わない。

## Scope（対象範囲）

- In:
  - Repository現状とGitHub CLI仕様の確認
  - `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md` の作成
  - plan-only PR作成
- Out:
  - `docs/reference/codex-implementation-harness.md` の実装変更
  - `scripts/verify` / `scripts/verify.ps1` の実装変更
  - workflow / Hook / 新規script追加

## Assumptions（仮定）

- Planの正本は `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md` とする。
- plan-onlyのためfile-changing taskのpush後必須CI完了契約は適用しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Plan内に記載。
- 未回答の重要質問: なし。

## Research Plan（調査計画）

- Repository: `AGENTS.md`、implementation harness、Bash / PowerShell verify、Web CI / Mobile App CI。
- 外部仕様: GitHub CLI `gh pr checks` manualと0 checks時の実装。
- Exit Criteria:
  - 正本文書だけの変更で十分か判断できる。
  - registration raceを含む待機契約を実装可能な粒度へ落とせる。

## Approach（進め方）

- 既存契約と検証経路を確認する。
- 必要変更を最小範囲へ限定する。
- 保存Planを作成し、branchへcommitしてPRを作成する。

## Definition of Done（完了条件）

- 保存Planが実装対象、検証、停止条件、対象外を明示している。
- Plan PRが作成されている。

## Risks / Unknowns（リスク・未知点）

- `gh pr checks --watch` は0 checks時に待機しないため、registration waitをPlanへ含めないと目的を満たさない。

## Thinking Log（判断記録）

- `docs/reference/codex-implementation-harness.md` だけを変更すると `scripts/verify` と `scripts/verify.ps1` のliteral contractが失敗するため、1ファイル修正では不十分と判断した。
- `AGENTS.md` はimplementation harnessをCI lifecycleの正本として既に参照しているため変更対象外とした。
