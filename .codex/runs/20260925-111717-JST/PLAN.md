# Run Plan

- Run ID: 20260925-111717-JST
- Task type: harness-improvement
- Workflow level: strict
- Branch: plan/codex-autonomous-workspace
- Base: main@c42082ba62cbca87f675b336d06885719d21b50e

## 目的

このbranchでPlan作成だけで終了せず、direct codexのproject defaultを自律実行向けへ変更し、既存の安全境界とwrapper互換性を維持したうえで、検証、commit、push、PR、最新PR headのCI確認まで進める。

正本Plan:

- docs/plans/2026-09-25_111717_codex-autonomous-workspace.md

## 確定方針

- direct codex:
  - workspace-write
  - approval never
  - network true
- danger-full-accessへ変更しない。
- auto-net presetは削除しない。
- rm / git rm等の既存denyを変更しない。
- codex-safe / codex-taskのsafe / readonly / auto-net semanticsを維持する。
- Issue #135 / PR #147で整理済みのAGENTS.mdを再設計しない。
- compact時のAGENTS.md再注入Hookを変更しない。
- rulesは通常workflowを実際に阻害する場合だけ最小変更する。
- 実装はL3の明示承認後に開始する。
- mergeは明示指示があるまで行わない。
