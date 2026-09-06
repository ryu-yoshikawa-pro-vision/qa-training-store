# Tasks

## Now

- [x] 1. 正本Plan、feature-plan手順、PROJECT_CONTEXT、直近ADR、branch/PR/main divergenceを確認する
- [x] 2. active Runをstrict workflowで初期化し、Run Plan/TASKSを確定する
- [x] 3. routing SSOTと変更禁止範囲を確認し、現在の6 Skill descriptionを記録する
- [x] 4. remote mainからEvaluator外の独立Routing Targetを作成し、trust/preflight前提を確認する
- [x] 5. runner実装前にpositive/negative manual Observation Probeを実行し、host-native evidenceを確認する
- [x] 6. Probe結果、tool/input shape、判断根拠、4 boundary SSOT照合をRun Artifactへ記録する
- [x] 7. 12 dataset YAML（初期24 case）を作成し、全caseをmanual reviewする
- [x] 8. deterministic eval logicを実装する
- [x] 9. side-effect runnerを実装する
- [x] 10. repository-contract testとpackage scriptsを実装する
- [x] 11. deterministic/repository validationを実行し、失敗を分類・修正して再検証する
- [x] 12. source scopeを確認し、active baseline Artifactを含めずsource implementationをcommitする
- [x] 13. `evaluator_git_sha`確定後、latest mainとrouting sourceをbaseline直前に再確認する
- [x] 14. 同じRouting Targetを確定SHAへcheckoutし、必要ならProbe/validationを再確認する
- [ ] 15. canonical `all`を1回実行し、validity/provenance/8-side observabilityを確認する
- [x] 16. Run Artifactをsanitizationし、final validation/scope diffを確認する
- [ ] 17. baseline/Run Artifactをsource commitと分離してcommitし、対象branchへpushする
- [x] 18. push後のPR #127、branch、head、scopeを確認してRunを完了する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- canonical `all`の8 boundary-sideが全件timeoutでobservable 0件となり、有効baseline条件を満たさない。Planの禁止事項によりcase retry・timeout緩和・dataset/description変更は行わない。Host実行時間を120秒以内に安定化した環境で、Target/trust/Probe/validation確認後にcanonical runを最初から再実行する。
