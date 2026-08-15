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
- [x] 13. Fresh checkout / Fresh Training Copyを使ったFresh Learner full journeyを実施する
- [x] 15. 追加repair: Training Workflowのruns-on / checkout persist-credentials / alternate package entrypoint / remote script pipeを構造検証し、negative contractを追加する
- [x] 16. 追加repair: Learner Exercise用Mobile entrypointを追加し、教材・Curriculum validator・contractへ接続する
- [x] 17. 追加repair: Maestro invocation helperを分離してrunnerのsilent-success経路を除去し、Windows quoting契約を維持する
- [x] 18. 追加repair: sdkmanager教材fallbackとCSV UTF-8 BOM許容を実装し、focused / full validationを再実行する
- [x] 19. 追加repair: Training Web Exercise / expected-failureとAndroid Training baselineを実行し、Android timeoutとcleanupを事実分離して記録する
- [x] 20. 追加repair: review triage、PR #25旧HEADのCI状態、subagent省略理由、scope判断、remaining blockerをRun Artifactへ追記しSanitizerを実行する
- [x] 21. 最終review repair: sdkmanager fallback選択規則、Curriculum validator非null assertion、current PR / CI状態のRun Artifact同期を修正・検証する
- [x] 22. 最終repair: Expo SDK 57 patch dependency alignmentとExpo Doctor 17/17を実施する
- [x] 23. 最終repair: 統合Planの旧Final Delivery Required契約をOptional / Future境界へ同期し、stale referenceを分類する
- [x] 24. 最終repair: 422d4のCI failure、post-repair validation、Run Artifactをcurrent stateへ同期する
- [x] 25. PR #24 / #25の競合5ファイルを意味的に統合し、両PRのGate / Training契約を保持する
- [x] 26. package.jsonを統合し、lockfileを再生成してExpo / yaml / Training scriptsを検証する
- [x] 27. Native CIとstandalone Training runnerを最新startup helperへrebaselineし、Training `clearState`依存を除去する
- [x] 28. ADR-0013重複をADR-0014へ移行し、Project Contextとcurrent referenceを整合させる
- [x] 29. Native CI / Training contractへ統合後のstartup・Gate・順序契約を追加する
- [ ] 30. 指定されたstatic / dependency / contract / full validationを実行する
- [x] 31. Active Runをappend-onlyで更新し、sanitizerとGit index残差を記録する

## Discovered

- D1. Windows Android Buildではcurrent repository実体PathがCMake object path上限を超えたため、current worktree専用短縮Junctionとshort virtual storeが必要だった。
- D2. Training helperの接続Emulator単数時にPowerShell scalarへ`.Count`を参照する不備があり、配列化して修正した。
- D3. SDKのcmdline-tools `latest` / `latest-2` inconsistency warningは残るが、Training AVD identity / API / ABI / baselineはPASSした。
- D4. Windows Local Fresh LearnerのCanonicalをPhysical Android Deviceへ分離し、GitHub Native CIのAPI 34 / `google_apis` / `x86_64` Emulator保証は維持する契約へ更新した。
- D5. Training Maestroの`QA_TRAINING_ANDROID_SERIAL` / `TARGET_SERIAL` / `ANDROID_SERIAL`は、非空値が異なる場合に暗黙選択せずfail-closeする必要がある。Run IDとserialをNative helper / Training Maestro Evidenceへ共通化した。

## Deferred

- Task 14: Deferred by Owner Decision / not required for PR #25。Instructor管理remote Training Copyへのpublish、remote Web / Android / expected-failureの3 runs、`FINAL_CANDIDATE_SHA` freeze、PR HEAD / Training Copy resolved SHA equality、Final Delivery Recordは、Future operational validation / optional instructor validationとする。既存のTraining Copy prepare / validate機能はRequired Assetとして維持する。

## Blocked

- R1. `pnpm dlx expo-doctor@1.17.6`はExpo API schema fetchのネットワークタイムアウトで17/17を完了できていない。コード不整合とは分離し、同一条件の無目的な再試行はしない。
- R2. Semantic repairを含むcurrent working treeのcommit / push後に、PR #25新HEADのPhase 1 CI / Native CIを確認する必要がある。

Progress: 96% (29/30)
