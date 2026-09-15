# Harness改善の例

この例はevaluationのFindingからHarness改善候補へ変換する方法を示す。

- Product実装とHarness改善を分離する。
- strict workflowが必要なtargetを分けて扱う。
- rejected / deferred candidateもEvidenceとowner decisionを残す。

## 含まれる例

- docs / skill improvement: `strictness = normal`
- validator / schema improvement: `strictness = strict`
- unsafe or policy-bypass candidate: `strictness = blocked`

## ファイル一覧

- `harness-improvement-candidates.json`
- `harness-improvement-review.md`
