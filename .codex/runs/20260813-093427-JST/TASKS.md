# Tasks

## Now

- [x] 1. Review #25、Plan #18、Current Spec / BR / AC / validator / CI / ADR / Curriculumを照合する
- [x] 2. P0: Native CIのTraining Maestro baselineをProduction APK切替前へ移動し、順序Contractを追加する
- [x] 3. Training Workflowを構造parseし、approved `uses`、Repository-owned `run`、Secret / permission / runner / deploy境界をfail-closeする
- [x] 4. Training Native WorkflowへMaestro 2.8.0 SHA-256検証を追加する
- [x] 5. WorkbookをRFC 4180相当CSV、BR / AC存在、4 CSV cross-reference、blank rule validatorへ強化する
- [x] 6. Windows Android helper、Maestro path handling、Expected Failure stale Evidenceを修正する
- [x] 7. Rubric、Part 1教材、capstone、locator、canonical link、8 views説明をCurrent guaranteeへ整合させる
- [x] 8. Contract testをfixture / behavior中心へ整理し、focused / full contractを実行する
- [x] 9. formatting、markdown、spec、curriculum、lint、repository / Training typecheckを実行する
- [x] 10. Training Web desktop / mobile / expected-failureを専用runtimeで実行しEvidenceを確認する
- [x] 11. Android marker後にTraining Doctor / Prepare / Start、x86_64 Release Build、APK検査、Install、Smoke、Training Maestro、Evidence、cleanupを実行する
- [x] 12. full test、`pnpm run verify`、最終self-review、Run Artifact同期方針を確定する
- [ ] 13. Fresh checkout / Fresh Training Copyを使ったFresh Learner full journeyを実施する
- [ ] 14. Final Delivery Readiness: pre-freeze Run Artifact確定後にcommit / push、Source Required CI、FINAL_CANDIDATE_SHA freezeを行い、exact-SHA Training Copy 3 runs、SHA equality、remote Delivery Readinessを実施する。freeze後の完了判定はPR Final Delivery Recordをcanonical evidenceとし、このTask / Run Artifactは更新しない
- [x] 15. 追加repair: Training Workflowのruns-on / checkout persist-credentials / alternate package entrypoint / remote script pipeを構造検証し、negative contractを追加する
- [x] 16. 追加repair: Learner Exercise用Mobile entrypointを追加し、教材・Curriculum validator・contractへ接続する
- [x] 17. 追加repair: Maestro invocation helperを分離してrunnerのsilent-success経路を除去し、Windows quoting契約を維持する
- [x] 18. 追加repair: sdkmanager教材fallbackとCSV UTF-8 BOM許容を実装し、focused / full validationを再実行する
- [x] 19. 追加repair: Training Web Exercise / expected-failureとAndroid Training baselineを実行し、Android timeoutとcleanupを事実分離して記録する
- [x] 20. 追加repair: review triage、PR #25旧HEADのCI状態、subagent省略理由、scope判断、remaining blockerをRun Artifactへ追記しSanitizerを実行する
- [x] 21. 最終review repair: sdkmanager fallback選択規則、Curriculum validator非null assertion、current PR / CI状態のRun Artifact同期を修正・検証する

## Discovered

- D1. Windows Android Buildではcurrent repository実体PathがCMake object path上限を超えたため、current worktree専用短縮Junctionとshort virtual storeが必要だった。
- D2. Training helperの接続Emulator単数時にPowerShell scalarへ`.Count`を参照する不備があり、配列化して修正した。
- D3. SDKのcmdline-tools `latest` / `latest-2` inconsistency warningは残るが、Training AVD identity / API / ABI / baselineはPASSした。
- D4. Windows Local Fresh LearnerのCanonicalをPhysical Android Deviceへ分離し、GitHub Native CIのAPI 34 / `google_apis` / `x86_64` Emulator保証は維持する契約へ更新した。
- D5. Training Maestroの`QA_TRAINING_ANDROID_SERIAL` / `TARGET_SERIAL` / `ANDROID_SERIAL`は、非空値が異なる場合に暗黙選択せずfail-closeする必要がある。Run IDとserialをNative helper / Training Maestro Evidenceへ共通化した。

## Blocked

- Source / Curriculum / validator / contract変更を含むworktreeは未commitであり、post-change Required Phase 1 / Native CIは未実行。Current-treeのPhysical Canonical runtimeと全local validationはPASSしたが、exact committed snapshotのFresh Learnerは未確認とする。
- Fresh CopyのWeb desktop / mobile / learner exercise / expected-failure、Workbook / Spec / Part 1 / Part 2のlearner pathは既存Evidenceどおり確認済み。新契約でのPhysical AndroidはDoctor / Prepare / ABI Auto Build / APK integrity / Install / Smoke / Test Control 1/1 / Training Maestro baseline 1/1 / Evidence / cleanupまでPASSした。dirty worktreeのためTask 13は未完了のままとする。
- Phase Aのserial conflict fail-close、Local AVD旧契約の除去、CI Emulator契約の保持、Run ID / serial Evidence連携、minSdk Source of Truth整合、static validationは完了した。今回のworktreeはこのSource / Docs / Test repairでdirtyになったため、ユーザーのcommit / push後にexact committed snapshotをPhysical Deviceで再実行し、post-change Required CI成功後にFINAL_CANDIDATE_SHAをfreezeする。その後にexact-SHA Training Copy 3 runs、SHA equality、remote Delivery Readinessを実施する。Task 13 / Task 14は未完了のままとする。

Progress: 90% (19/21)
