# Tasks

## Now

- [x] 1. 正本Plan全文、AGENTS、既存Run/ADR、branch/PR/current diffを確認する
- [x] 2. Current runner / workflow / validator / contract / curriculumのrepo mappingを完了する
- [x] 3. Task 1: Web desktop exercise command、validator mapping、指定Web教材を実装する
- [x] 4. Task 2: Native bounded shared runner、baseline薄型化、exercise entry、P1-7同期を実装する
- [x] 5. Task 3A: checked expected-failure workflowとallowlistを同期する
- [x] 6. Task 3B: Native Training workflow exact path opt-in、baseline→exercise、Artifact分離、READMEを実装する
- [x] 7. Task 4: P2-6指定8箇所とTask 4対象のlearner-facing同期を完了する
- [x] 8. Task 5: validator / workflow contract / contract testを責務境界どおり同期する
- [x] 9. Required validation: typecheckとWeb 4 commandを実行・確認する
- [x] 10. Required validation: curriculum validator、contract test、format、markdown lint、diff checkを実行・確認する
- [x] 11. Workflow static / Training Copy validationとmanual learner criteriaを確認する
- [x] 12. Native runtime preflightを行い、条件を満たせばruntime validation、不可ならEnvironment blockを記録する
- [x] 13. Final diff / DoD 1〜45 / scope / dependency / no-change assetを確認する
- [x] 14. Run ArtifactをSanitizeし、commit前branch safetyを確認する
- [x] 15. PR5実装をcommitし、対象branchへnon-force pushする
- [x] 16. push後head、PR #124本文、CI / checksを確認してRunを完了する

## Discovered

- Mobile App CIのNative Staticは、PR5差分に含まれないExpo SDK依存同期のbase driftで失敗した。`native-ci / verify`はその派生FAILであり、Planの依存変更禁止に従い別Follow-upへ分離した。

## Blocked

- なし
