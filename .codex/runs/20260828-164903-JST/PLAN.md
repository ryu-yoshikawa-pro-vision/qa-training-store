# Plan

## Objective

PR #75のchild Planを正本として、Current Documentation / SSOT Repair（RA-M1〜RA-M6、RA-M8）を実装し、検証・自己レビュー・commit・push・PR/Issue更新・CodeRabbit incremental review依頼まで完了する。

## SSOT / Scope

- 実装SSOT: `docs/plans/2026-08-28_080048_current_documentation_ssot_repair.md`
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- 実装対象: child Planの`6.1 実際の変更対象`に限定する。
- 追加成果物: このRunの`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`。
- 変更禁止: Product、workflow、validator、test、Workbook CSV、Master Plan、historical record、Legacy Alias、完了済みRun `20260828-074252-JST`。

## Validation source

- child Planの`8. Validation plan`。
- Current executable contract: `package.json`、`playwright.config.ts`、Web / Native workflow、Native ADR、Seed SSOT、validator、Workbook、contract test。
- Review / repair boundary: `CODE_REVIEW.md`、`docs/reference/repair-loop.md`、`.agents/skills/repair-loop/SKILL.md`。

## Stop condition

Current SSOTの変更、設計判断の発生、Product / CI / validator / Workbook / contract testの変更要求、scope外差分、historical / Legacy変更、bounded searchを越えるcleanup、または新しい未解決review findingが発生した場合は推測で進めず停止する。PRはmergeしない。

## Git / PR target

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Branch: `fix/current-documentation-ssot-repair`
- Base: `main`
- PR: #75
- Issue: #72
- Push: `git push origin HEAD:fix/current-documentation-ssot-repair`

## Assumptions

- preflightで確認したPR head `361f19a6903bdf5b9b5903f7ddc221928103d065`を開始時点のCurrent headとする。
- 既存4 review threadはresolvedであり、historicalな`CHANGES_REQUESTED`だけでは実装を止めない。
- Run ID `20260828-164903-JST`だけを今回のactive implementation Runとして扱う。

## Definition of Done

- child PlanのRA-M1〜RA-M6、RA-M8をfinding単位で実装し、RA-M7 / RA-L1を変更しない。
- child Plan記載のformat、markdown、spec、curriculum、contract、Current SSOT照合、bounded search、Sanitizerを実行し、未実施をPASSと記録しない。
- scope review、commit、明示refspec push、PR #75本文更新、Issue #72のimplementation review状態更新、`@coderabbitai review`依頼、最終PR/CI確認を完了する。
- PR #75はOPENのまま、merge / auto-merge / close / branch delete / force pushを行わない。

## Thinking Log

- 2026-08-28 16:49 JST: child PlanとRepository ruleを再読し、実装対象をchild Planの`6.1`とactive Run Artifactだけへ固定した。
- 2026-08-28 16:49 JST: Current branch、PR head、既存CodeRabbit thread、Web / Native / Seed / CurriculumのSSOTをread-onlyで再確認した。実装開始前のCurrent fact差分は確認されていない。
