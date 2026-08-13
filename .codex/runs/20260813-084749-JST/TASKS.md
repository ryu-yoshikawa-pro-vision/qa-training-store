# Tasks

## Now

- [x] 1. PLANを確定し、repair scopeと非目標を固定する
- [x] 2. Current validator / registry / Android workflow / testsを調査し、review evidenceを確定する
- [x] 3. Structural ValidationとFinal Visual Gateを実装し、契約テストを追加する
- [x] 4. Android observed profile、case selection、describe/promote CLIを実装する
- [x] 5. Materializer冪等性とVisual Validator不足契約を実装する
- [x] 6. Documentation / ADR / Run Artifactを更新する
- [x] 7. 全Validation、self-review、scope audit、sanitizerを完了し、Final DoDを判定する
- [x] 8. Review repair再調査結果をRun Artifactへ記録し、現在のRequired CI／Native起動経路をrebaselineする
- [x] 9. Checkout Processing Web Captureのready matcherをProcessing heading exactへfail-closeし、strict UI Reviewを再実行する
- [x] 10. Android Capture Caseへ機械実行可能なrole/setup/ready contractを接続し、Maestro capture driverで実画面をassertする
- [x] 11. Final Visual GateをPhase 1 CIのRequired pathへ接続し、workflow contract testで迂回不能を保証する
- [x] 12. Android startup race対策をclear-stateとlaunchの共通Android helperへ分離し、Maestro static contractを更新する
- [x] 13. Static validation、Web regression、Native syntax／doctorを実行し、実行不能なAPI34 captureはBLOCKED記録を維持する
- [x] 14. Self-review、scope audit、Run Artifact sanitizer、Final DoD判定を更新する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. API34 emulatorのresolution/density実測値の取得可否を既存CI evidenceとworkflow構成から確認する
- D2. 既存validatorのparsed modelを再利用し、必要なら最小限の内部fixture helperを追加する
- D3. Native workflowがCheckout Processing／全Android targetのrole/setup/readyを実際に使っているかを検証する
- D4. Phase 1 CIのverify aggregateがFinal Visual Gate失敗を必ず受け取ることを検証する

## Blocked

- B2. API34 canonical Android capture未実行: local環境にcanonical emulatorがないためcapture/promotionを行わない

## Resolved

- R1. Checkout Processing Web Targetはfresh UI Review capture、canonical WebP promotion、Markdown reference materializationまで完了した

Progress: 100% (14/14)
