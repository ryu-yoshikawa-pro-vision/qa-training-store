# Specification Change Process

## Normal Feature Change

```text
Change Request
  ↓
Normative Spec
  ↓
BR / AC
  ↓
Risk / Test Design
  ↓
Implementation
  ↓
Deterministic Automation
  ↓
Risk-based Agentic QA / Human QA
  ↓
Review / Merge
```

新規User-facing Feature、UI/UX/Responsive/Accessibility変更、Role/Permission変更、State/Transition変更、Error/Boundary変更、高Risk RegressionはAgentic QA候補です。低RiskのInternal-only変更や既存Regressionで十分な変更は、候補から省略できます。省略は実施済みの代替とは扱いません。

## Existing Spec Violation

実装が既存Normative Specに違反する場合、Specを実装へ合わせません。Defect修正、Regression更新、必要ならActive Known Deviationの削除を行い、Specの修正は誤記・説明補足に限ります。

## Specification Change

期待挙動を変更する場合は、Spec → BR/AC → Risk/Test → Implementationを同じ変更単位で同期します。緊急修正でもMerge前に同期します。

## Known Deviation and Unresolved

Known DeviationはActive-onlyです。実装修正とRegression追加後にEntryを削除します。UnresolvedはProduct Decisionが完了したらNormative Spec、BR/AC、Testへ移し、未確定中はFindingをDefect確定しません。

## Review and CI

BR/ACや直接参照Normative Fileが変わった場合、参照するChallengeのAffected Summaryを生成します。Generated HTMLはMarkdownから再生成し、HTMLを直接編集しません。AI Agentic QAは初期Required CI Gateにしません。

影響サマリーは次のCLIで生成し、CIでは既存のStyle Quality JobのReview Summaryへ出力します。

```text
pnpm run summarize:spec-impact
```
