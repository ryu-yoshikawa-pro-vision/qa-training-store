# Training Workbook

このWorkbookは、Google SheetsへCSVをImportして使うCanonical Templateです。Google Sheetsの機能や書式は正本にせず、4つのCSVをRepository上の入力形式として扱います。

## Traceability

標準の流れは `spec_ref` → `br_ids` / `ac_ids` → `risk_id` → `test_case_id` → `implementation_path` → `evidence` です。BR / ACなど複数IDは`;`で区切り、区切り前後の空白と同一Field内の重複を禁止します。直接対応するIDがない場合だけ空Fieldを許可します。

## Progressive disclosure

最初から全列を埋めません。

1. `01_target-risk.csv` で対象、Spec、Riskを整理する。
2. `02_test-cases.csv` で条件、前提、期待結果、設計技法を整理する。
3. `03_automation-mapping.csv` で自動化する / しない / LaterとLayer・Toolを決める。
4. `04_execution-improvement.csv` でEvidence、原因、改善を記録する。

Sample rowは完成答案ではありません。Normative Specificationを読み、理由とEvidenceを自分で追加します。
