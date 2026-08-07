---
name: android-native-local-validation
description: Use when setting up Windows Android tooling, building a local Release APK, installing it on a physical device, running Maestro flows, or investigating a Native physical-device failure.
---

1. `AGENTS.md`、`docs/native/README.md`、`docs/native/windows-android-local-validation.md` を読む。
2. Windows 固有の既知障害がある場合は `docs/native/windows-android-troubleshooting.md` を読む。
3. 手順を独自に再実装せず、`scripts/native/windows/android-local.ps1` を実行入口にする。
4. 最初に `-Action Doctor` を実行し、Node 24、pnpm 9.10.0、Java 17、Android SDK、ADB、実機、Maestro 2.8.0 を確認する。
5. 初回または Native Project 再生成が必要な場合だけ `-Action Prepare` を実行する。
6. Build、Install、Test、Maestroの前に、直近Runの`REPORT.md`、関連`.artifacts/native-local/<attempt>/`、`git diff`／`git status`、過去の失敗と成功条件を確認する。前回と同じコマンドを目的なく再実行しない。
7. Android Build前に同じShellで次を確認する: `node --version`、`pnpm --version`、`java -version`、`javac -version`、`adb version`、`adb devices`、`$env:JAVA_HOME`、`$env:ANDROID_HOME`、`$env:ANDROID_SDK_ROOT`、`Get-Command java`、`Get-Command adb`、`Get-Command sdkmanager -ErrorAction SilentlyContinue`、`Get-PSDrive -Name C`、`android\gradlew.bat --version`。
8. Java／Gradle、SDK／Build Tools／Platform、ADBの`device`状態、ホスト／端末容量、APK／appId／Build Profile、CIとの差異を確認し、不一致や上流失敗があればBuildや後続工程を開始しない。
9. APKが現在の変更を含まない場合だけ`-Action Build`を実行し、Build Cacheを優先する。実行ごとに一意のattempt-idを使い、完全ログを`.artifacts/native-local/<attempt-id>/`へ保存して同一RunIdで上書きしない。
10. Build／Install／Test／Maestroの再実行前に、観測事実、原因仮説、最有力仮説、根拠、今回変更する条件、成功条件、失敗時の次情報を記録する。一回の検証で変更する条件は原則一つに限定する。
11. `-Action Install`、`-Action Smoke` の順に実機起動を確認する。BuildやAPK存在確認が失敗した場合、Install以降を実行しない。
12. Maestroは`-Action Test`で`maestro/native-test-control.yaml`を1本だけ実行する。単体Flowが失敗したら後続Suiteを実行せず、Screenshot、Hierarchy、logcat、JUnit、Maestro Outputの最初の異常を確認する。
13. 失敗を`ENVIRONMENT_FAILURE`、`DEPENDENCY_FAILURE`、`CONFIGURATION_FAILURE`、`SOURCE_FAILURE`、`BUILD_CACHE_FAILURE`、`DEVICE_FAILURE`、`TEST_FAILURE`、`TRANSIENT_FAILURE`、`UNKNOWN`へ分類し、`BUILD FAILED`やAPK不存在などの派生エラーと分離する。
14. 同一エラー2回連続、同じ工程3回失敗、異なる対応後も最初のエラー不変、新しいログなし、仮説なしの場合は停止して調査へ戻る。Cache削除、Daemon停止、`pnpm install`、`gradlew clean`、Timeout延長、Assertion削除、Flow Skipだけの再試行は禁止する。
15. アプリまたはFlowを最小修正し、原因を検証するため同じ単体Flowを再実行する。単体成功後だけ`-Action RuntimeSuite`、続いて`-Action BoundarySuite`を実行する。
16. Build、Install、Smoke、単体Flow、各Suiteを分けて報告し、未実行をPASSと書かない。生ログを`.codex/runs/**`へ直接保存せず、Run Artifactには要約と相対参照だけを記録する。
17. `android/`、APK、`.artifacts/`、`local.properties`、個人Pathを含む`.npmrc`、Device固有情報をRepositoryへ追加しない。
18. Git操作はユーザーの明示依頼がない限り行わない。
