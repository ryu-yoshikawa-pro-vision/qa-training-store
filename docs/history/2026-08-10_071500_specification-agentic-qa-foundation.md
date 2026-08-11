# Specification / Agentic QA基盤の追加

2026-08-10 JST、`docs/plans/2026-08-09_110500_specification-agentic-qa-foundation.md`に基づき、Normative Specification、BR/AC grammar、静的HTML生成、JSON + ZodのAgentic QA Contract、Learner-safe Challenge、Benchmark Revision、Runner/Evaluator分離を追加した。

- Normativeの正本は`docs/spec/`、Supporting資料は自動Bundleへ追加しない。
- Normal／Gray-boxのReadonly BoundaryとBlack-boxのisolated rootを分離した。
- Basic／Intermediate／AdvancedのChallengeとInstructor-only Answer Key／Unified Diffを固定し、Patchはdisposable copyでだけ検証する。
- `pnpm run validate:spec`と`pnpm run build:spec`を既存CI／verifyへ接続した。
- 現在のローカルRunでWeb Normal Charterと、Basic Challengeの契約E2E（Preparation、Forbidden Probe、Frozen Findings、Separate Evaluation）を保存した。Local deterministic fixtureはモデル比較の実績ではない。
