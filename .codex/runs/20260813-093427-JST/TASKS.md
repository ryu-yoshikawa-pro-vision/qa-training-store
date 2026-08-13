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
- [ ] 14. Final Delivery Readiness: exact-SHA Training Copy 3 runs、SHA equality、remote Delivery Readinessを実施する（50021adのPhase 1 / Native CI successは別途記録済み）
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

## Blocked

- Source repairはcommit / push済みで、修正Sourceに対するRequired Phase 1 / Native CIも成功済み。Source correctness gateは完了している。
- Fresh Learner full journeyは未完了。Fresh Learnerと最終Run Artifact状態が完了するまでFINAL_CANDIDATE_SHAは意図的にfreezeしない。その後にexact-SHA Training Copy 3 runs、SHA equality、remote Delivery Readinessを実施する。
