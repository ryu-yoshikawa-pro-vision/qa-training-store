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
- [x] 15. canonical `all`を1回実行し、validity/provenance/8-side observabilityを確認する（fresh resultはinvalid）
- [x] 16. Run Artifactをsanitizationし、final validation/scope diffを確認する
- [x] 17. baseline/Run Artifactをsource commitと分離してcommitし、対象branchへpushする（invalid evidenceを保存）
- [x] 18. push後のPR #127、branch、head、scopeを確認してRunを完了する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] 19. PR #127のtimeout原因調査計画を保存し、既存runner/Probe/artifactの差分を整理する
- [x] 20. negative controlをmanual-style / runner-styleで時刻付きdiagnostic実行する
- [x] 21. 必要ならpositive controlをrunner-styleで1回だけdiagnostic実行する
- [x] 22. terminal/exit/close/timeout/process treeの証拠から原因を分類する
- [x] 23. evaluator defectの場合だけ最小修正と指定validationを実施する（今回の診断では該当なし、source変更なし）
- [x] 24. 調査結果をREPORTへappend-onlyで記録し、canonical再実行可否を確定する
- [x] 25. 未push調査記録を確認し、timeout再検証計画を保存する
- [x] 26. positive controlのterminal-duration measurementを外側safety limit付きで1回実施する
- [x] 27. measurementから120秒前提とselected timeout/marginを決定し、正本Plan/Runへ記録する
- [x] 28. 必要な場合だけ正本Planと`CASE_TIMEOUT_MS`を最小修正する
- [x] 29. 指定validationとmanual Observation Probeを実行する
- [x] 30. source implementation commitと新しい`evaluator_git_sha`を確定する
- [x] 31. canonical直前にlatest main/routing sourceを再確認する
- [x] 32. canonical `all`を最初から1回実行し、validity/8-side coverageを確認する（fresh resultはinvalid）
- [x] 33. baseline/Run Artifactをsanitization、commit、pushしPRを確認する（invalid evidenceを保存）
- [x] 34. 全case完了前に終了したcanonical sessionをinvalid runとして記録し、部分結果を採用しない
- [x] 35. canonical attempt4を全24 case完了まで実行し、invalidity/provenance/8-side coverage不足を記録する
- [x] 36. invalid canonical evidenceとRun Artifactをcommitし、対象branchへpushしてPR状態を確認する
- [x] 37. blocker remediationのfeature plan、allowed scope、canonical停止条件を保存する
- [x] 38. current Hostのselector shape、Codex version、旧invalid artifact provenanceを再確認する
- [x] 39. selector最小正規化とrepository-contract regression test 7種を実装する
- [x] 40. 24 queryをself-contained / execution-bounded / single-intent / natural観点で再manual reviewし、欠陥queryだけ修正する
- [x] 41. dataset fingerprintを更新し、4 validation・scope・sanitizationを完了する
- [x] 42. `codex-cli 0.153.4` 固定のmeasurement / positive-negative Observation Probeを完了する
- [x] 43. canonical直前条件を再確認し、fresh `all`を24 case sequential/retryなしで1回実行する
- [x] 44. canonical結果判定、Run Artifact、source/evaluator SHA、commit/push、PR本文を確定する（valid baselineは未達）

## Blocked

- canonical `all`の8 boundary-sideが全件timeoutでobservable 0件となり、有効baseline条件を満たさない。Planの禁止事項によりcase retry・timeout緩和・dataset/description変更は行わない。Host実行時間を120秒以内に安定化した環境で、Target/trust/Probe/validation確認後にcanonical runを最初から再実行する。
- timeout原因診断ではrunner相当positiveの120秒時点に`turn.completed`/`turn.failed`がなく、process treeに`codex.exe`が残存した。runner lifecycle defectではなくHost execution latency（Case B）と分類し、canonical `all`は再実行しない。
- timeout変更後のcanonical `all`はHook activityの途中で外部実行sessionが終了し、runner最終artifactが生成されなかったため、Plan §13.3に基づき全体を無効化した。次回は同じdataset/query/timeoutで最初から1回実行し、部分結果を混在させない。
- canonical attempt4は全24 caseを完了したが、Codex 0.153.4で22件が327秒timeout、8 side中6 side欠落となった。valid baselineは採用せず、Codex version固定とtimeout前提の再判断をblockerとする。
- fresh remediation runはCodex 0.153.4で24/24 caseを完了したが、20件timeout・observable 4/24・8 side中3 sideのためvalid baseline未達。低遅延環境での再実行は別途承認が必要である。
