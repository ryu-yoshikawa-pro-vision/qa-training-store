# Run Plan

- Run ID: 20260925-111717-JST
- Task type: plan
- Workflow level: standard
- Branch: plan/codex-autonomous-workspace
- Base: main@c42082ba62cbca87f675b336d06885719d21b50e

## 目的

通常のinteractive Codexをworkspaceで codex だけで起動する実運用へRepository契約を合わせるPlanを作成する。

対象方針:

- sandbox_mode = "workspace-write"
- approval_policy = "never"
- sandbox_workspace_write.network_access = true
- auto-net preset整理
- AGENTS.md / Harness / rules / verifyの整合
- destructive safety boundaryは維持

## 対象範囲

今回実施するのは調査・Plan作成・branch保存まで。source実装は行わない。

正本Plan:

- docs/plans/2026-09-25_111717_codex-autonomous-workspace.md

## 判断

- 通常interactive入口は direct codex とする。
- auto-net はcurrent workflow callsiteがなく、通常project configでnetworkを有効化するなら専用presetとして重複するため削除候補とする。
- codex-safe 自体はRun manifest sync / preflight等の責務が残るため、今回の目的だけでは削除しない。
- approval_policy = "never" とbroad prompt rulesの整合が必要なため、config値だけの変更にはしない。
- 実装はL3変更になるため、別途明示承認を得てから開始する。
