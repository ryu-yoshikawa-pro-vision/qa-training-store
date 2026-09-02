# Plan

## Goal

PR #78 の `CT-BOUNDARY-001` に残る7 Requirementについて、Current Requirement → Current production implementation → Current automated/Formal evidenceの順にread-only監査を行い、次のremediationに必要な最小変更範囲と、1つのremediation PRで完結できない場合の具体的理由を確定する。

## Current understanding

- PR #78 は `docs/formal-test-strategy-traceability` の `14c3b04e04e9b8c5397755d3f0c031e345c93465` がCurrent headで、OPENのまま保持する。
- `FR-AR-003` はPR #87でFormal coverage済みのため、今回の監査対象から除外する。
- 対象は `FR-AR-001`、`FR-AR-002`、`FR-AR-004`、`NFR-MA-020`、`NFR-MA-021`、`NFR-MA-022`、`NFR-MA-023` の7件だけとする。
- 今回はProduction/Test/Requirement/Traceability/PRを変更せず、Run Artifactの調査記録だけを許可された変更とする。

## Assumptions

- Current PR headのcheckout済みsourceとtracked docsを正本として扱う。
- Formal evidenceはrepositoryのTest StrategyとRun/Planで許容される、実際のassertionまたは明示的なvalidator/architecture/harness contractに限る。file名・suite名・source実装の存在だけではcoveredと判定しない。
- 過去Runは履歴としてread-onlyで参照し、既存checkpointを変更しない。

## Non-goals

- 7 Requirementの実装、Requirement本文の変更、Traceabilityの再分類、Testの追加・修正。
- PR分割の実行、remediation branch/PR作成、commit、push、merge、PR本文・review stateの更新。
- `FR-AR-003`、他のTraceability label、PR #87の再監査。
- 全Form移行、全CSS移行、新しいframework/abstraction/SSOTの設計。

## Impacted areas

- 調査対象: `src/application`、`src/domain`、`src/infrastructure`、`src/presentation`、`src/test-controls`、`e2e`、`tests`、`scripts`、関連docs/Run Artifact。
- 許可された変更: 新規の現Run `.codex/runs/20260831-083946-JST/` のPLAN/TASKS/REPORTと、規約上必要なmanifest同期のみ。
- 変更禁止: Product source、Test code、Requirement docs、Traceability、Test Strategy、workflow/config/dependency/schema、PR #78/#87。

## Files to inspect

- `AGENTS.md`、`PLANS.md`、`docs/PROJECT_CONTEXT.md`、最近の `docs/adr/`。
- `docs/01_requirements/functional_requirements.md`、`docs/01_requirements/non_functional_requirements.md`、`docs/08_testing/test_strategy.md`、`docs/12_quality/requirements_traceability.md`。
- PR #78 Child Plan、`.codex/runs/20260831-065443-JST/`、PR #87のPlan/Run REPORT。
- `src/**` の対象seam、`tests/contracts/**`、`tests/integration/**`、`tests/component/**`、`scripts/**`、`e2e/**`。

## Change strategy

- 先にrepository contractとRequirement本文を確認する。
- 各Requirementを必ず本文、production symbol/file、Formal assertion/validatorの順で照合する。
- NFR-MA-020はForm inventory、NFR-MA-021はstyling inventoryを機械的検索と実ファイル読解で作る。
- gapをimplementation gapとFormal gap、validator/governance/harness向きの保証へ分離する。
- remediation候補を責務・rollback・validation単位で比較し、1 PRに混在させる理由または分割が必要な理由を明示する。

## Validation

- 調査中はmutationを伴わないread-only検索・参照を実施する。
- Run Artifact記録後に `git diff --check` を実施する。
- Run Artifactについて `scripts/sanitize-codex-artifacts.ps1` のWrite/Checkを実施し、residual 0を確認する。
- Product/Test変更がないため、目的のない全test/buildは実行しない。実行しない理由をREPORTに記録する。

## Risks

- suite/file名から過大claimするリスク: assertion本文とproduction seamを直接読む。
- RequirementをCurrent codeに合わせて狭めるリスク: owner decisionが必要な論点として分離し、本文は変更しない。
- governance/non-guaranteeをbehavior testへ無理に落とすリスク: validator、architecture contract、Playwright harnessの適切な層を比較する。
- 大規模migrationを早期に決めるリスク: NFR-MA-020/021はinventoryと履歴・設計意図を先に確認する。

## Open questions

- NFR-MA-020/021の適用範囲と設計意図がCurrent architecture上も妥当か。
- FR-AR-004をPlaywright harness contractとして固定するか、documentation/governance contractとして扱うか。
- NFR-MA-023を既存validatorで拡張できるか、新しい狭いvalidator ruleが必要か。
- 7件を同一PRで閉じると責務・rollback・validationが混在するか。

## Follow-up

- 調査結果に基づくowner decisionとremediation単位を最終回答へ提示する。
- 実装が必要な場合は、今回変更せず、Requirement decision後に別Run/PRで最小seamから着手する。

## Thinking Log

- 2026-08-31 08:39 JST: PR #78のbranch/headとclean状態を確認。今回の調査は新規Runのみを変更する方針を確定。
- 2026-08-31 08:39 JST: `research` はnew-runのTaskType enum外だったため、repository contractに従い `investigation` Runとして初期化。
