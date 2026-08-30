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

- [x] 15. 再レビューFindingを受け、元の意味を維持した下位Traceability 22件を再監査しDispositionを確定する。
- [x] 16. `run.json`をRepository正式enumとevaluation由来summaryの契約へ補正する。
- [x] 17. `WE-CORE-*`のMapping ID定義と表見出しを一致させる。
- [x] 18. Required validation（`pnpm run test:contracts`は今回1回のみ）とmanual cross-checkを実施する。
- [x] 19. `IMPLEMENTATION_BASE_SHA`からのimplementation deltaと今回repair scopeを確認する。
- [x] 20. Sanitizer Write / CheckとREPORT / TASKS / run.jsonのCurrent state同期を完了する。
- [x] 21. 残存stop 8件をRequirement / Current Formal evidenceベースでmodel-mismatchまたはcoverage-gapへ分類する。
- [x] 22. model-mismatchを表現するためChild Planのlower Traceability Disposition契約を最小replanする。
- [x] 23. 新契約に従い、model-mismatchはbounded-multi-ref、coverage-gapはstopとしてTraceabilityを再Dispositionする。
- [x] 24. 再分析結果とreplanをactive Run Artifactへ同期する。
- [x] 25. Required validation（`pnpm run test:contracts`は今回1回のみ）とmanual cross-checkを実施する。
- [x] 26. implementation deltaのscope確認とSanitizer Write / Checkを実施する。
- [x] 27. Stop condition、PR 2 DoD、Run stateを最終判定する。

- [x] 28. PR #87 merge後のCurrent main取り込みと4 labelのCurrent evidenceを再監査する。
- [x] 29. `CT-DB-KEY-001`、`CT-CATEGORY-002`、`CP-FORM-001`、`CT-BOUNDARY-001`のTraceability stopを解消する。
- [x] 30. `bounded-multi-ref`を含むDisposition定義をCurrent Traceabilityへ整合させる。
- [x] 31. Plan-only RunのTemplate必須section findingをCurrent fileへ同期する。
- [x] 32. Active RunのREPORT、TASKS、run.jsonをCurrent stateへ同期してfinalizeする。
- [x] 33. Required local validationを指定順で実行し、結果を確定する。
- [x] 34. final scope checkと両Run directoryのSanitizer Write / Checkを完了する。
- [ ] 35. finalization差分を1 commitへまとめ、対象branchへpushする。
- [ ] 36. PR #78本文と既存review threadをCurrent stateへ整理する。
- [ ] 37. 新しいPR head SHAのexact-head GitHub Actionsを確認する。
- [ ] 38. CI後のPR #78最終自己レビューを完了する。

## Blocked

- なし。PR #87 merge後のCurrent evidenceで4 labelを再監査し、Traceability最終化、Run同期、local validation、scope / Sanitizer、PR整理、exact-head CI、最終自己レビューを完了する。

Progress: 89% (34/38)
