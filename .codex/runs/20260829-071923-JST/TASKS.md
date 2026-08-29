# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. Plan-only gate、branch、`IMPLEMENTATION_BASE_SHA`、active implementation Runを確定する
- [x] 2. Current entrypointとsemantic contractをread-onlyで再確認する
- [x] 3. Requirement Group / WE-CORE / Current下位label / Risk mappingをpre-auditする
- [x] 4. `test_strategy.md`をchild Plan §5.1に従い最小修正する
- [x] 5. `requirements_traceability.md`をchild Plan §5.2に従い最小修正する
- [x] 6. PR 1 follow-upとmanual cross-checkを完了する
- [x] 7. Required validation（初回implementationではcontractsを環境依存timeout exceptionとして記録し、repair後に全Required validationを再確認）、scope check、Sanitizer Write / Checkを完了する
- [x] 8. Run Artifactを最新化し、DoDとStop conditionの完了判定を記録する
- [x] 9. implementation review Findingをmust_fixへ分類し、bounded repair scopeを確定する
- [x] 10. Risk 16行のRepresentative TechniqueをEvidenceベースで再監査・修正する
- [x] 11. 下位Traceability 22 labelのDispositionを単一file / exact-title契約で再監査・修正する
- [x] 12. NFR TraceabilityからCI / project / commandの重複を除去する
- [x] 13. REPORT / run.jsonをrepair中のCurrent stateへ同期し、Required validationを実施する
- [x] 14. scope、manual cross-check、Sanitizerを確認し、repair完了判定を記録する

## Discovered

- 作業中に発見したタスクはここに追記する。

## Blocked

- commit前のRequired `pnpm run test:contracts`で`tests/contracts/codex-hook-contract.test.ts`の既存Hook matrix testが15秒timeoutしたため、Required validationは`inconclusive`、Runは`blocked`として保持する。Assertion / Contract mismatchではない。Risk / Traceability / NFRのbounded repair自体は完了し、Progressは100% (14/14)を維持する。追加retryは行わず、現ユーザー指示に従いrepair済みHEADをPR-triggered CIへ送る。finalizationはPR CI / re-review待ちである。
