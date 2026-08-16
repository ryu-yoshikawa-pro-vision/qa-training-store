# Training Workbook

このWorkbookは、Google SheetsへCSVをImportして使うCanonical Templateです。Google Sheetsの機能や書式は正本にせず、4つのCSVをRepository上の入力形式として扱います。

## Traceability

標準の流れは `spec_ref` → `br_ids` / `ac_ids` → `risk_id` → `test_case_id` → `implementation_path` → `evidence` です。BR / ACなど複数IDは`;`で区切り、区切り前後の空白と同一Field内の重複を禁止します。`spec_ref`、`risk_id`、`test_case_id`などTraceをつなぐIDは、対応する対象がある行では必須です。BR / ACのように直接対応しないIDだけは空欄を許可します。

## Progressive disclosure

最初から全列を埋めません。

1. `01_target-risk.csv` で対象、Spec、Riskを整理する。
2. `02_test-cases.csv` で条件、前提、期待結果、設計技法を整理する。
3. `03_automation-mapping.csv` で自動化する / しない / LaterとLayer・Toolを決める。
4. `04_execution-improvement.csv` でEvidence、原因、改善を記録する。

## 空欄の条件

- ID列は、対応する対象IDがない場合だけ空欄にします。対象、Risk、Test Caseの主IDは空欄にしません。
- `implementation_path` は未実装、または `Do not automate` と判断して実装Pathが存在しない場合に空欄にします。入力するPathはRepository上に実在するものだけにします。
- `evidence` は未実行（`result=Not run`）の間は空欄にします。予定する出力先を実Evidenceとして記録しません。実行後は実在するEvidenceだけを記録します。
- `failure_category` は `Pass` / `Not run` では空欄にできます。Failureが発生した場合は、観測できたFailure分類を段階的に追加します。
- `cause`、`action`、`improvement` は、結果と調査の進捗に応じて後から追加します。空欄を埋めるための架空の原因、Action、改善、Path、Evidenceは作成しません。

Sample rowは完成答案ではありません。Normative Specificationを読み、理由とEvidenceを自分で追加します。
