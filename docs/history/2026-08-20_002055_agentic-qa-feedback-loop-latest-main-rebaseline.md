# Agentic QA Feedback Loop Latest-main Rebaseline 履歴

## Background

PR #32のCurrent Stateが2026-08-19時点のPrevious Rebaseline `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`を指していたため、現在のmain `f21155f2bdc95e0d5f58ed846665f1a0051dcac6`との差分を再確認した。Original Historical Baseline `fc9e497817e6c3cff8d89ebd7b37244e759e9484`とPrevious Rebaselineは履歴として保持し、Current Latest-main Rebaselineだけを追加した。

## Rebaseline Evidence

- Original Historical Baseline: `fc9e497817e6c3cff8d89ebd7b37244e759e9484`
- Previous Rebaseline: `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`
- Current Latest-main Rebaseline: `f21155f2bdc95e0d5f58ed846665f1a0051dcac6`
- `git log --oneline d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a..f21155f2bdc95e0d5f58ed846665f1a0051dcac6`でPR #34 `fix: Playwright CIのChromiumインストールを安定化する (#34)`を確認した。
- `git diff --name-status d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a..f21155f2bdc95e0d5f58ed846665f1a0051dcac6`で、Chromium install workflow、CI contract、PR #34のRun／Plan、font fallback補正とfocused E2E assertionのdeltaを確認した。

## 3領域の結論

- Test Target: `unchanged`。PR #34のUI font fallback補正とE2E assertionはbrowser-only installの表示安定性を補うもので、Application behaviorの受け入れ対象、Product Specification、Formal Regression target、Training targetを変更しない。
- Curriculum: `unchanged`。`docs/curriculum/**`、`training/**`、Curriculum contractに意味的なdeltaはない。
- QA System: `updated`。Chromium系GitHub Actions jobからruntime apt／Ubuntu mirror dependencyを除去し、Chromium binary installは維持した。`extended-e2e`ではChromiumだけbrowser-only、Firefox／WebKitは既存`--with-deps`を維持し、install条件をcontract testで固定した。PR #34の実CI、同一commit rerun、workflow_dispatchによるmobile-chromium検証をevidenceとして扱う。

## Feedback Loop判断

- GAP-02: `decision unchanged`
- Experiment Readiness: `decision unchanged`
- Formal Experiment: `NOT EXECUTED`
- Formal Experiment Target Revision: 今回は設定しない
- Knowledge: `none`
- Promotion: `none`
- Official Scored GAP-01: `BLOCKED / NOT EXECUTED`

## Validation

- Current main SHAの一致確認、`d297497..f21155f`のlog／name-status／関連diff確認を完了した。
- この履歴はCurrent State更新のdurable evidenceとして追加し、過去のRebaseline Historyと完了済みRunは変更していない。
