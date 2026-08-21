# Plan

## Objective

- PR #35の監査結果を基にしたRepository Audit Remediation Planを再レビュー指摘へ合わせて修正し、実装者が追加判断なしでRoot Cause単位の修正へ進める状態にする。

## Scope

- In:
  - `docs/plans/2026-08-21_002300_repository_audit_remediation.md` のPlanning Contract準拠化。
  - MNT-003のActual Production Hermes Artifact Evidence要件追加。
  - REP-002の不整合時UXをCurrent Boundary Contractへ委ねるよう修正。
  - REP-001 / REP-006、REP-008 / REP-010のPR Slice分離。
  - MCP Before/After、Gold/Platinum Runtime制約、Artifact保存契約の追加。
  - Oracle PriorityとTraining Action SHA pinning手順のRepository Policy整合。
- Out:
  - Product / Test / CI / Curriculum本体の実装修正。
  - Audit Report本文の修正。
  - Deferred Findingの実装。

## Assumptions

- Current `main`はPR #35マージ後の`314a8f958072f19e672e3bc37089558d74e42feb`。
- Cross Browser CI split実装branchはR13以外のSliceをBlockしない。
- Runtime検証のためだけにNative Test Control Scenarioを拡張しない。

## Questions / Ambiguity

- 必ず質問する不透明点:
  - 全体Planを止めるBlocking Questionはなし。
- 仮定してよい細部:
  - Current Repository conventionで決まるTest file配置、既存Boundary UXの再利用先。
- 未回答の重要質問:
  - REP-013、REP-017は各confirmation taskで確認する。
  - MNT-003の最小Hermes検証方式はR8実装調査で決定する。

## Hypotheses

- H1: Product/UI/Native FindingはBefore/After Runtime Evidenceを明示することで、Static-only false closureを防げる。
- H2: Root Cause単位へPR Sliceを分けることで、依存関係とレビュー境界を明確化できる。

## Research Plan

- Round 1 Query:
  - `PLANS.md`、`docs/plans/TEMPLATE.md`、feature-plan contract、AGENTS.mdを確認する。
- Round 2 Query:
  - Checkout Spec、Oracle Priority、Native scenario allowlist、Cross Browser CI split branchを確認する。
- Exit Criteria:
  - 前回レビュー7点がPlanへ明示的に反映されている。
  - 実装コードへ変更がない。
  - Planning Run Artifactが保存されている。

## Approach

1. Repository Planning / Review Contractを再確認する。
2. Current Planの不足をRoot Cause単位で修正する。
3. PlanをTemplate必須項目へ再整理する。
4. Planning Run Artifactへ判断・変更・残Riskを記録する。
5. Branch差分を確認し、Plan + Run Artifact以外の変更がないことを確認する。

## Definition of Done

- Main PlanにGoal/DoD、Current understanding、Assumptions、Non-goals、Impacted areas、Files to inspect、Change strategy、Validation、Risks、Open questions、Follow-up notesがある。
- MNT-003はActual Production Hermes Build Output由来Evidenceを必須にしている。
- REP-002はPlanだけで新しいerror/not-found UXを確定していない。
- R2a/R2b、R12a/R12bへRoot Cause単位で分離されている。
- MCP Before/After、Gold/Platinum制約、`.artifacts`保存契約がある。
- Oracle PriorityとAction SHA pinning確認がRepository Policyと整合する。

## Risks / Unknowns

- GitHub connector経由の編集ではRepositoryのsanitize scriptを直接実行できないため、Run Artifactにはローカル絶対Pathを記載しない。
- Cross Browser CI split branchはmain未反映のため、R13はdependency blockedのまま保持する。

## Thinking Log

- 2026-08-21 17:49 JST: 再レビュー結果を受け、Planを単純追記ではなくRepository Template構造へ再整理する方針を採用。
- 2026-08-21 17:49 JST: Runtime Evidenceを増やすためのTest Control scope拡張は過剰対応になるため禁止を明文化。
- 2026-08-21 17:49 JST: Production Hermes Guardはprojection-onlyで完了できないようActual Production Artifact由来EvidenceをDoDへ追加。
