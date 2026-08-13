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
- [ ] 14. 修正後commit SHAによるfinal Source Required CI、exact-SHA Training Copy 3 runs、SHA equality、remote Delivery Readinessを実施する

## Discovered

- D1. Windows Android Buildではcurrent repository実体PathがCMake object path上限を超えたため、current worktree専用短縮Junctionとshort virtual storeが必要だった。
- D2. Training helperの接続Emulator単数時にPowerShell scalarへ`.Count`を参照する不備があり、配列化して修正した。
- D3. SDKのcmdline-tools `latest` / `latest-2` inconsistency warningは残るが、Training AVD identity / API / ABI / baselineはPASSした。

## Blocked

- Final committed PR HEADが存在しないため、exact-SHA / remote Delivery Readinessは実行しない。
- Fresh Learner full journeyはこのuncommitted worktreeからの個別再現と同一視しない。
