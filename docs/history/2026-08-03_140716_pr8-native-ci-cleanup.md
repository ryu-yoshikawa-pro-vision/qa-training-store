# PR #8 Native CI処理順序・Runtime Cleanup修正履歴

## 入力

- 対象Branch: `feature/01_phase2-first-half-native-foundation`
- 対象Head: `be27f8ff5b9ec5395cb9ce4e6a1f56a61cc2f8e3`
- Native CI Run: `30785304641`
- 対象指示: Android SDK Component導入前のTool検証順序修正、Runtime SQLite Cleanup、Contract Test追加

## Run 30785304641の事実

- Detect Native Changes: success
- Native Static: success
- Production Bundle Guard: success
- Install Android emulator runtime dependencies: success
- Expo Prebuild: success
- Resolve Android SDK and sdkmanager: failure
- 失敗原因: SDK Componentをインストールする前に`test -x "$ADB"`、`test -x "$EMULATOR"`、`test -x "$AVDMANAGER"`を実行して終了コード1となった。
- Install Android SDK components以降: skipped
- Automation Release APK／Android Emulator／APK Install・Launch／Test Control／Contract Harness／Maestro: 未実施
- Evidence: success、Artifact ID `8845071206`、状態ファイルのみ
- `native-ci / verify`: failure

## 修正

- Resolve StepからADB／Emulator／AVD Managerの実在確認を削除し、SDK Root／sdkmanagerの確認、Path生成、`GITHUB_ENV`／`GITHUB_PATH`保存へ責務を限定した。
- SDK Component Install後のVerify Stepで3 Toolの実在を確認し、Resolve→Install→Verify paths→Verify adb→Verify avdmanager→Inspect emulator→Buildの順序をContract Testで固定した。
- Database Open後のNative Runtime初期化をprivate helperへ分離し、途中失敗時の`closeAsync`、元Error保持、正常終了時の未Closeを実装した。
- Runtime Cleanup Jest Testを追加し、Initialization failure、successful runtime、cleanup failureの3ケースを検証した。

## ローカル検証

- `pnpm install --frozen-lockfile`: PASS
- `pnpm run format:check`: PASS
- `pnpm run lint`: PASS（0 errors／64 warnings）
- `pnpm run typecheck`: PASS
- `pnpm run test`: PASS（Unit 13／64、Integration 9／91、Repository 5／28、Web Component 11／76、Native Jest 7 suites／15、Contract 16／81）
- `pnpm run generate:native-assets`、生成差分、Image Manifest、Security、Native Route、EAS static、Production Bundle: PASS
- `pnpm run build:web`: PASS
- `pnpm run test:e2e:chromium`: PASS（27）
- `pnpm run test:a11y`: PASS（4）
- `pnpm run test:e2e:mobile-boundary`: PASS（4）
- `pnpm dlx expo-doctor@1.17.6`: PASS（17/17）
- `git diff --check`: PASS（WindowsのLF／CRLF warningのみ）
- `android/`／`ios/`の差分なし。EAS Cloud、Commit、Pushは未実施。

## 未確認

- 修正後GitHub ActionsのAndroid SDK Install／APK Build／Emulator／Maestro／`native-ci / verify`
- Windows Android Emulator／端末、macOS iOS Simulator、実`expo-sqlite` Smoke
