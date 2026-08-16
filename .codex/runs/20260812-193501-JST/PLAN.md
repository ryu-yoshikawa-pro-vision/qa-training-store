# Plan

## 目的

Planning PR #18 の `docs/plans/2026-08-10_141200_test-automation-curriculum-remediation.md` を実装正本として、Scenario Shop の Test Automation Curriculum / Training Environment を Wave 0〜10 まで current repository に再baselineする。

## Scope

- In: Implementation Start Gate、22文書、C01〜C12 / Level 0〜3、Workbook、Training Playwright / Maestro、Training TypeScript、Curriculum Validator、Training Copy準備・検証、least-privilege Workflow Template、Phase 1 / Native Required CI接続、Fresh Learner Validation、Final Delivery Readiness のローカル実行可能範囲。
- Out: Product Business Logic、既存Formal Regressionの期待値変更、iOS Runtime復活、Git add/commit/push/merge/rebase、他worktree・元main worktreeの変更、remoteへの公開操作。

## Current understanding

- Expected Product Behavior のOracleは `docs/spec/` のNormative Specificationであり、既存UI・教材・実装から新しい期待仕様を推測しない。
- AndroidのCurrent Formal GuaranteeはBuild + Runtime E2E、iOSはADR-0011に基づくBuild-only。
- Formal Webは `playwright.config.ts` / `e2e/web/`、Formal Nativeは `maestro/`。Learner資産は専用Pathへ分離する。
- Current worktreeは実装Branchでclean。既存Runは完了履歴として保持し、新Runへ記録する。

## Assumptions

- ユーザー指定のPlanは合意済みであり、新しい設計判断を追加せず、Planの固定決定とCurrent Contractへ従う。
- Androidは `$env:QA_STORE_COORD_DIR\visual-android-released.json` が存在するまで実行しない。marker取得後に必要なTraining Maestro / Native CI確認をまとめて行う。
- GitHub remote Run、PR HEAD確定、Training Copy remoteの3 Delivery Runは、権限・push禁止のためローカルで証明できる範囲と分離して記録する。
- 既存のPackage / CI / Validator conventionに従える局所的な命名・サンプル内容は安全側で決定する。

## Blocking questions

- なし。PlanにRequired Path、Project、Workflow allowlist、保証範囲、DoD、Validation順序が固定されている。

## 仮説

- H1: Current Spec / BR / ACを直接参照するCurriculum Validatorと22文書のtraceabilityで、教材とNormative Oracleのdriftを機械検出できる。
- H2: Training Web / MaestroをFormal資産・CIから分離し、baselineだけを既存Required CIへ接続すれば、Learner演習とFormal Gateを混在させずに継続検証できる。
- H3: Full SHA + Workflow allowlist + read-only Trust BoundaryをScript検証すれば、Training CopyをProduction CIから分離したまま再現可能に準備できる。

## Research plan

1. Start Gate: Spec入口、Normative files、BR/AC、validators、Web E2E、Maestro、Native CI、ADR、current Curriculum、branch / diff / envを確認する。
2. Repo mapping: Package scripts、tsconfig、Playwright / Maestro topology、CI jobs、contracts、safe change surfaceを確定する。
3. Wave 1〜5: Curriculum contract、Workbook、Training runtime assets、copy scripts、workflow templatesを先に実装する。
4. Wave 6〜9: 全教材を実Pathへ再baselineし、validator・typecheck・Formal CI接続・contract testsで閉じる。
5. Wave 10: Fresh Learner、expected-failure、Android marker解放後のTraining Maestro、local delivery readinessを実行し、remote未実行はfail-closeで記録する。

## Approach

- 先にRun artifactへStart Gate結果とWave taskを固定する。
- 既存Spec / CI / Testを読み、実在するPath・Command・保証範囲だけを教材へ参照する。
- 変更はCurriculum / Training専用面と、Required CIへ接続する最小のWorkflow Contractへ限定する。
- 各Wave完了時にTASKSを更新し、JST時刻・Progress・EvidenceをREPORTへappendする。
- formatter / markdown lint / spec / curriculum / lint / typecheck / contract / Web / mobile / expected-failure / Native（marker取得後）/ verifyを上流から順に実行する。

## Definition of Done

- Planの22文書、Training assets、Workbook、Validator、CI接続、Fresh Learner検証が実装され、Formal / Training境界とAndroid / iOS保証境界が維持される。
- `pnpm run validate:curriculum`、`pnpm run typecheck:training`、`pnpm run verify`、Required CI contract、Training Web baseline、mobile、expected-failureのローカル検証が記録される。
- Android marker取得後にTraining Maestro baselineとNative CI接続を確認する。marker未取得のままPASS扱いしない。
- Remote GitHub Training Copy 3 RunとPR HEAD exact-SHA equalityは、実行不能なら未完了Required blockerとして明記する。
- Run artifactのSanitizer Write / Checkが0 residualで完了する。

## Risks / Unknowns

- Android Runtime marker待ち: 非Android作業を先行し、Androidだけが残った場合にmarkerを監視する。
- Current CIの既存契約・line ending・環境差: baselineと変更差分を比較し、因果がある場合のみ最小修正する。
- Remote Delivery Readiness: remote操作・pushを行わず、local componentを完了して未実行のremote gateを明確に分離する。
- Planとcurrent Spec/ADRの不一致: Spec/ADR/Workflowを優先し、推測でExpected Behaviorを追加しない。

## Thinking Log

- 2026-08-12 19:35 JST: Runをstrict implementationとして初期化。既存Planを実装正本とし、Android marker未取得のため非Androidを先行する。
- 2026-08-12 19:35 JST: worktreeは `feat/implement-test-automation-curriculum-remediation`、git status clean。既存Runは履歴として保持する。
- 2026-08-12 21:32 JST: Planning PR #18はclosed / mergedであり、今回のImplementation branchのDelivery SourceやRequired CI Runとは分離されることを確認した。
- 2026-08-12 21:32 JST: code-review後にrepair-loopを1 iteration実行。固定UI copy依存、Windows wrapper、JSON boundary、Android serial/tool preflightを修正し、関連検証を再実行した。
- 2026-08-12 21:34 JST: Android release marker未成立のため、Android Runtimeを開始しない。未完了Required項目を残したままFinal PASSとは扱わず、local PASSとremote / Android blockerを分離する。
- 2026-08-12 22:21 JST: Training Android workflow / helperをFormal Nativeのpackage-service lifecycleと照合した。fresh emulatorでのapp package待機を`service check package`へ修正し、API / ABI / target serial / finite timeoutを明示した。Android marker成立までは実Runtimeを開始しない。
- 2026-08-13 06:45 JST: `visual-android-released.json`の`status=passed` / `android_runtime_released=true` / `next_agent_can_use_android=true`を確認し、Android Slotを取得した。別worktreeの標準aliasは使わず、Curriculum専用aliasでこのworktreeだけを検証した。
- 2026-08-13 07:38 JST: Windows pnpm virtual storeを`<PNPM_VIRTUAL_STORE>` + `virtual-store-dir-max-length=20`へ再構成してCMake path上限を解消し、arm64-v8a Release APK Build／Install／Smoke／Training Maestro baseline／EvidenceをPASSした。Formal Native Flowは実行せず、iOS Runtime保証も追加していない。
- 2026-08-13 08:37 JST: ユーザー承認を受け、既存386-file Prettier baselineをrepo-wideで整形した。`pnpm run format:check`と`pnpm run verify`がPASSし、Native content diffは発生していない。Final exact-SHA / remote Delivery Readinessは引き続き未実行。
