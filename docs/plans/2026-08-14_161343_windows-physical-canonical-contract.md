# Windows Local Physical Android Canonical Contract Plan

## 0. 依頼概要

- 依頼内容: PR #25のWindows Local Fresh Learner / Part 1 Native経路をUSB接続Android実機Canonicalへ変更し、GitHub Native CIのAPI 34 Emulator保証とiOS Build-only保証を維持する。
- 背景: Windows LocalのCanonical AVDでSystem UI ANRが発生したため、AVD安定化を受講者の完了条件から外し、実機経路へ責務分離する。
- 期待成果: 要件、教材、Windows helper、validator、contract test、Physical Fresh Learner実行、Active Run Artifactが同じ契約を参照する。

## 1. ゴール / 完了条件

- ゴール: Windows Local Fresh LearnerのCanonicalをPhysical Android Deviceへ変更し、CI Android Emulator / iOS Build-onlyの保証範囲を壊さない。
- 完了条件（DoD）:
  - Windows LocalのCanonical条件が、明示serial付き・`adb` status `device`・physical判定・起動／解除済み端末である。
  - Device ABIのAuto検出、APK Build / integrity / Install / Smoke / Test Control / Training Maestro / Evidenceがhelperから接続される。
  - `ro.kernel.qemu == 1`または明らかなEmulator serialを`-RequirePhysicalDevice`でfail-closeする。
  - RepositoryのAndroid最低対応APIをSource of Truthから読み取り、実機APIを勝手にAPI 30へ固定しない。
  - Part 1 Local教材にEmulator必須条件が残らず、USB debugging / authorization / awake / unlocked / Maestro操作可能性が説明される。
  - GitHub Native CIのAPI 34 / `google_apis` / `x86_64` / Emulator / Formal Maestro / Training baselineが維持される。
  - iOSのBuild-only保証を変更しない。
  - 新契約Source / docs / helper / testsでPhysical Deviceの一続きの実動作確認を行う。
  - Task 13は、dirty worktree検証のみならpendingとし、Task 14は未完了のままにする。

## 2. 現状理解と前提

- Current understanding:
  - PR #25はOpenで、既存branchからの差分をread-only確認済み。現在のPRにはTraining Android CIのAPI 34 Emulator契約が存在する。
  - `scripts/native/windows/android-local.ps1`は接続済みDeviceのDoctor / Build / Install / Smoke / Maestro / Evidenceを担うが、physical-only fail-close optionは未実装である。
  - `scripts/training/android-emulator.ps1`はWindows Local専用参照であり、CI Workflowからは参照されていない。
  - `app.config.ts`の`minSdkVersion: 24`がRepositoryのAndroid最低対応APIのSource of Truthである。
  - `training/github-actions/training-native-ci.yml`と`.github/workflows/native-ci.yml`はCI Emulator契約を保持している。
- Assumptions:
  - `-RequirePhysicalDevice`は既存helper利用者を壊さないopt-in switchとする。
  - Windows Local optional Emulator routeは、Local Fresh Learnerの契約・validator・教材から外す。未検証の専用PowerShell helperに依存する参照がないため、そのhelperは削除する。
  - CIのEmulator実装は今回変更しない。必要な変更は「CI-onlyである」説明とContract testの保護に限定する。
  - 現在接続可能な実機を契約変更後のRuntime検証に使うが、dirty worktreeなのでTask 13はcommit/push後のexact snapshot再実行までpendingとする。
- Non-goals:
  - Windows AVD / Hypervisor / GPU / SystemUI ANRの修復・追加調査。
  - Product Business Logic、Native Application Source、Formal Maestro Flowの広範囲修正。
  - Git commit / push / merge / rebase / branch操作、PR操作、Final Delivery、FINAL_CANDIDATE_SHA freeze。
  - GitHub Native CIのEmulator削除・弱体化、iOS Runtime保証の追加。
  - API 30を正式最低対応APIとして定義すること。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Local Canonical、CI Emulator、iOS Build-onlyの責務分離は依頼文で固定されている。
- 仮定してよい細部: 既存の`android-local.ps1`のArtifact layout、Maestro invocation、ABI候補、Run ID形式を維持する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Windows Android local helperのphysical device readiness / fail-close boundary。
  - Part 1 learner entrypoint、capstone、Native setup/runbook。
  - Curriculum validator / contract tests。
  - Plan / Active Run Artifact。
  - CI contract documentation and regression assertions only。
- Files to inspect:
  - `scripts/native/windows/android-local.ps1`
  - `scripts/training/android-emulator.ps1`
  - `scripts/validate-curriculum.ts`
  - `tests/contracts/training-curriculum.test.ts`
  - `training/github-actions/training-native-ci.yml`
  - `.github/workflows/native-ci.yml`
  - `docs/curriculum/test-automation/00_learning-design.md`
  - `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
  - `docs/curriculum/test-automation/part1/09_part1-capstone.md`
  - `docs/curriculum/test-automation/part1/10_part1-capstone.md`
  - `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
  - `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
  - `docs/native/windows-android-local-validation.md`
  - `docs/plans/2026-08-10_141200_test-automation-curriculum-remediation.md`

## 5. 変更方針

- Change strategy:
  1. Existing Local Emulator helperの参照をLocal canonical contractから除去し、CI WorkflowのEmulator参照は維持する。
  2. `android-local.ps1`へopt-in `-RequirePhysicalDevice`を追加する。明示serial、ADB `device`、qemu property、API、ABI、package service、awake / unlockedを有限・fail-fastに確認する。
  3. Curriculum / Native runbook / PlanをPhysical Canonical flowへ更新し、CI教材にはEmulatorがGitHub Native CI専用であることを明記する。
  4. Validator / contract testでLocal Physical routeとCI Emulator routeを別々に保護する。
  5. Source / static gateを実行する。
  6. 契約変更後のPhysical Device Fresh Learnerを、明示serial・`-RequirePhysicalDevice`でDoctor → Prepare → Build → Install → Smoke → Test Control → Training baseline → Evidenceまで一続きで実行する。
  7. REPORT append-only、TASKS、run.json、evaluation.jsonをcurrent stateへ同期する。dirty worktreeのためTask 13はpendingを維持する。

### 5.1 Local Evidence Identity

Canonical Local runでは`$runId`を一度だけ定義し、Doctor / Prepareを含むNative helperの全Actionへ同じ`-RunId $runId`を渡す。Build、Install、Smoke、Test、Evidenceだけでなく、準備段階の診断も同じRunへ記録する。

Training Maestro baselineの前に、`QA_TRAINING_ANDROID_SERIAL`、`TARGET_SERIAL`、`ANDROID_SERIAL`を同じPhysical Device serialへ設定し、`TRAINING_MAESTRO_OUTPUT_DIR`を`.artifacts/native-local/$runId/maestro/training-baseline/`へ設定する。これによりNative helperのEvidence、Training Maestro JUnit、Maestro debug outputが同じRun IDとserialで追跡できる。新しいRun ManifestやArtifact frameworkは追加しない。

- 実行タスク:
  - [ ] 1. Local / CI / iOS契約のrepo mappingと安全な変更範囲を確定する
  - [ ] 2. Windows helperへphysical-only opt-in readiness contractを追加する
  - [ ] 3. Local Emulator helperとLocal canonical参照を除去する
  - [ ] 4. Curriculum / Plan / Windows runbook / CI説明を責務分離へ更新する
  - [ ] 5. Curriculum validator / contract testsをbehavior contractへ更新する
  - [ ] 6. Static validationとself-reviewを実行する
  - [ ] 7. Physical Device Fresh Learner runtimeとEvidenceを実行する
  - [ ] 8. Active Run Artifactをappend-only / current-stateへ同期する

## 6. 検証方法

- Validation plan:
  - PowerShell parser check for `android-local.ps1`。
  - `pnpm run format:check`。
  - `pnpm run lint:markdown`。
  - `pnpm run validate:spec`。
  - `pnpm run validate:curriculum`。
  - `pnpm run lint`。
  - `pnpm run typecheck`。
  - focused `tests/contracts/training-curriculum.test.ts`。
  - `pnpm run test:contracts`。
  - `pnpm run verify`。
  - `git diff --check`、Run Artifact JSON parse、TASKS recount、Sanitizer Write / Check。
  - Physical runtime: `adb devices -l`、explicit serial、Doctor、Prepare、Build with Auto ABI、APK integrity、Install、Smoke、Test Control 1/1、Training Maestro 1/1、Evidence、cleanup。
  - CI regression: static contract test confirms API 34 / google_apis / x86_64 / Emulator / Formal + Training Maestro tokens remain in both Training and Native CI paths; no CI runtime is started locally.
- 成功判定:
  - Static gates all pass。
  - Physical helper rejects an emulator in a focused negative fixture or source contract and accepts the connected physical route at runtime。
  - Physical runtime has the same run ID and explicit serial across Native helper and Training Maestro evidence。
  - CI Emulator contract remains present and iOS workflow remains Build-only。
  - Task 13 is checked only after exact committed snapshot rerun; otherwise remains unchecked.

## 7. リスクと未解決論点

- Risks:
  - `ro.kernel.qemu` is absent on some real devices; classification must reject `1` and obvious emulator serials without assuming a physical device always returns `0`.
  - Awake / unlocked dumpsys fields vary by Android version; use small fail-fast checks and clear remediation, not a complex lock-state parser.
  - Deleting the unused Local AVD helper may expose stale external references; repo-wide non-history search must be clean before deletion.
  - Dirty worktree runtime cannot satisfy an exact committed Fresh Learner condition.
- Open questions:
  - None blocking. If current repository consumers outside this repo require the deleted helper, the deletion must be revisited before implementation; repo-local search currently finds no such consumer.

## 8. 成果物

- 変更ファイル: Physical helper, Local Curriculum / Plan / runbook, validator, contract test, Active Run Artifact。
- 付随ドキュメント: この計画書、`.artifacts/native-local/<attempt-id>/`のPhysical runtime evidence。

## 9. 備考

- `scripts/training/android-emulator.ps1`の削除は、Local canonical contractから未検証AVD helperを外すための限定変更であり、GitHub Actionsのshell Emulator実装は削除しない。
- Final Deliveryは別フェーズであり、今回開始しない。
