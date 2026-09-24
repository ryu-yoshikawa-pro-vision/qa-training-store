# Issue #130 Native CI責務境界の整理

## Current Evidence

- Issue #130を実装するPlanはPR #176のhead `166f65c4ab6cecad2c059f3b72232905611ab44c`に保存されていた。
- 実装開始時の`main`は`01cd8ab15078d479e821d373445af1e16a469519`で、Plan作成時の基準と一致した。Plan対象のNative CI workflow、helper、validator、contract testに後続差分はなかった。
- ユーザー指示により、作業は現在の`plan/issue-130-native-ci-responsibility-boundary` branchで継続し、既存PR #176を更新する。merge、Issue close、force push、branch削除は行わない。

## 変更後の責務境界

- `.github/workflows/native-ci.yml`はtrigger、Native change detection、job ID / dependency、caller、Artifact download、Android Runtime step順、Maestro実行、Artifact upload、final gateを所有する。
- `.github/workflows/native-android-build.yml`はAndroid Automation / Production buildの共有実装を所有し、外部inputは`build_kind`だけとする。workflow-level `concurrency`は追加しない。
- `scripts/native/android-ci-production-bundle-guard.sh`はActual APK pathからbundle候補を展開し、既存validatorのCLIへ渡すI/O adapterを所有する。`scripts/validate-native-production-bundle.ts`のHermes decodeとmarker policyは変更しない。
- `scripts/native/android-ci-emulator-start.sh`はAVD / Emulator startとreadiness、`ANDROID_AVD_HOME` / `EMULATOR_PID`出力、既存diagnostic fileを所有する。
- `scripts/native/android-ci-visual-profile.sh`は現在のNormalize step本文を所有し、`ADB_ROOT_AVAILABLE`を受け取って`ANDROID_OBSERVED_PROFILE_JSON`を後続へ渡す。adb root capabilityの判定stepは親workflowに残す。
- `scripts/native/android-ci-visual-capture.sh`はmanual case選択、Capture Case metadata、Maestro env、screencap、per-case / batch manifest、partial failureを所有する。canonical assetへのpromotionはしない。
- `scripts/native/android-ci-runtime-evidence.sh`は成功時のbounded Evidenceとfailure時の詳細診断を所有する。失敗前に欠落し得るADB / APK等はoptionalで扱い、Artifact upload Actionは親workflowに残す。
- 通常PRのNative change detectionにはPlan指定の5 exact pathだけを追加し、visual-only helperは含めない。

## 維持したcontract

- `android-automation-build` / `android-production-build` job IDと`needs` / `if`、Production Bundle Guard dependency、Runtime partial execution condition、no-change skip、final fail-closed `native-ci / verify`を維持する。
- Automationはx86_64 allow/denyと既存のAPK verify / Save順序を維持する。ProductionはSave後のsaved APK verifyを維持する。Gradle logとEvidenceの差も統一しない。
- APK / Evidence Artifact名、固定filename、upload/download path、Action SHA、checkout credential、Gradle PR cache、runner、timeoutを維持する。
- adb root capability、profile step dependency、launcher stabilization、APK install / launch、Formal / Training / Production-validation Maestro step順をworkflowに残す。
- Product behavior、Formal / Trainingの保証境界は変更しない。Composite Action、独自CI framework、dependencyは追加しない。

## Local validation

- 新規shell helper 5本の`bash -n`とLF / shebang確認: PASS。
- Plan記載focused test: `output/**`を除外したroot source testは78/78 PASS。完全に同じpath指定では`output/**`配下の生成済みtraining-copy testもVitestが収集し、古いNative workflow assertion 18件がFAILした。Repository標準contract commandは`output/**`を除外する。
- `corepack pnpm run test:contracts`: 完了。2回目は43 files PASS、755 tests PASS、4 skipped。既存`codex-hook-contract.test.ts`のWindows launcher testがsuite負荷下で30.7秒timeoutとなった。単独再実行は27.5秒でPASSし、今回変更ファイルとは無関係。timeout変更は行わない。
- 既存Production Bundle Guard validator: Automation + Production bundle PASS、crossed inputは期待どおりFAIL、Production forbidden markerは期待どおりFAIL。validatorがWindows子processの`pnpm.cmd`を要求するため、検証processだけでCorepackへforwardする一時shimを使った。validator source / dependencyは変更していない。
- `corepack pnpm run verify`: FAIL。変更対象`native-ci-workflow.test.ts`をPrettier適用してから再実行し、未整形として残った78ファイルは今回変更していない`app/**`の既存fileだった。verifyは最初の`format:check`で停止し、それ以降のverify内commandは未実行。対象外78 fileの一括formatは行わない。
- `corepack pnpm run lint:markdown`（449 Markdown files）と`corepack pnpm run lint:text`（5 changed Markdown files）: PASS。
- `git diff --check`と今回のauthored workflow / test / documentation / Run markdownに対するPrettier check: PASS。
- Run Artifact sanitization: strict collector更新後にWrite / Checkを実行し、5 file scan、残存0でPASS。Remote CIとmanual visual 1 caseは未実行。

## 残りの確認

- ローカル標準verifyは実行済みだが、既存`app/**` 78 fileのformat failureで停止した。最終diff / scope確認とRun Artifact sanitizationはPASS。
- `.husky/pre-commit`も同じformat failureでcommitを拒否したため、commit / pushと以後のRemote CI / manual validationは未実行。hookを迂回せず、対象外の78 fileも変更していない。
- push後、最新PR headのWeb CIと`native_changed=true`のMobile App CIでjob結果、Artifact名、Training baseline、final gateを確認する。
- branch `workflow_dispatch`で`SCREEN-STOREFRONT-HOME/default/android`だけをcaptureし、manifest、PNG、Artifact upload、final gateを確認する。

## Pre-commit gate follow-up（2026-09-23）

- clean detached `origin/main`のSHAは`01cd8ab15078d479e821d373445af1e16a469519`、Git statusはclean。同じ`corepack pnpm run format:check`はPASSし、`app/**` warningは0件。
- 現在worktreeの同commandはFAILし、`app/**`の78 filesがwarningとなる。78 filesのGit content diffは0件、current worktreeのraw fileはCRLF、clean baselineはLFで、`.prettierrc.json`は`endOfLine: lf`。Issue #130変更fileのPrettier checkはPASS。
- したがって全体format結果はFAILのまま記録する。このworktreeの改行コード差が原因で、今回のIssue #130変更fileのformat違反ではない。対象78 files、formatter設定、hook設定は変更しない。
- `corepack pnpm run lint`は0 errors / 66 warningsでexit 0、`corepack pnpm run security:check`は233 runtime files / 373 credential-scan filesを確認してPASS。
- ユーザーはこの証拠、手動lint / securityのPASS、最終scope確認を条件に今回1 commitだけ`--no-verify`を許可した。format failureをPASSへ読み替えず、1回限りの明示許可に従う。
