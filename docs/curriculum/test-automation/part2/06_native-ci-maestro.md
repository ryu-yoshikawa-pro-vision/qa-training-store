# Part 2-6: Native CIとMaestro

## 学習目標

- MaestroをCIで実行するために必要なNative実行環境を説明できる。
- Android BuildとAndroid Emulator実行を分ける理由を理解できる。
- APK ArtifactをBuild JobからRuntime Jobへ受け渡す構成を説明できる。
- iOS Simulator上でBuild・Install・Launch・Maestroを実行する流れを理解できる。
- Native変更がない場合に高コストJobをSkipする設計を理解できる。
- JUnit、Screenshot、logcat、Simulator診断などNative Failure Evidenceを扱える。
- Web CIとNative CIで異なるCost・Flakiness・実行時間を考慮できる。

## 教材

**このモジュールでは、このリポジトリのNativeアプリ、Maestro Flow、Android / iOS GitHub Actions Workflowを使用します。**

主な参照先:

- `maestro/`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `scripts/native/windows/android-local.ps1`
- `package.json`
- Native Test Control / Contract Harness

## Lesson 1: Native CIがWeb CIより重い理由

PlaywrightのBrowser実行と比べ、Native CIでは追加で次が必要になります。

### Android

- JDK
- Android SDK
- Native Project生成
- Gradle Build
- APK
- Emulator
- APK Install
- App Launch
- Maestro

### iOS

- macOS Runner
- Xcode
- CocoaPods
- Simulator Build
- Simulator
- App Install
- App Launch
- Maestro

そのため、Native CIでは実行時間とRunner Costを特に意識します。

## Lesson 2: Android BuildとRuntime

単純な構成では1Jobで次をすべて実行できます。

```text
Build
↓
Emulator
↓
Install
↓
Maestro
```

しかしMaestroだけ失敗した場合でもBuildからやり直す可能性があります。

Scenario Shopの現在のNative CIでは、責務を次のように分けています。

```text
Android Build
↓
APK Artifact
↓
Android Runtime / Maestro
```

## Lesson 3: APK Artifact

Build Jobで生成したAPKをGitHub Actions Artifactへ保存し、Runtime JobでDownloadします。

これにより次が可能になります。

- BuildとRuntimeの責務分離
- Runtime Failure時の原因特定
- Build済みArtifactの再利用
- EvidenceとしてのAPK Metadata確認

ただしArtifact Upload / Downloadにも時間がかかるため、分割の価値がある境界を考えます。

## Lesson 4: Emulator

Android Runtime Jobでは、APKをInstallするためにEmulatorを起動します。

確認観点:

- API Level
- Architecture
- Boot完了
- adb接続
- APK Install
- App Process

Maestro Failureに見えても、実際にはEmulator起動やInstallが失敗している場合があります。

## Lesson 5: Native Test Control

CIでは毎回同じ初期状態へ戻す必要があります。

Scenario ShopではDeep Link Test Controlを使い、MaestroからScenario Resetできます。

WebのFixtureと目的は似ていますが、仕組みはPlatformに合わせて異なります。

## Lesson 6: Flow単位の実行結果

Maestro Flowを全部1Commandへまとめると、どのFlowで失敗したか分かりにくくなる場合があります。

Scenario ShopのAndroid CIでは、同一Emulator Jobの中でFlowをStep単位に分けています。

重要なのは、FlowごとにEmulator Jobを分けすぎて起動Costを増やさないことです。

## Lesson 7: JUnitとEvidence

Maestroの実行結果はJUnit形式で保存できます。

Native Failure時には次も有効です。

- Maestro Screenshot / Artifact
- JUnit
- logcat
- Emulator情報
- APK Metadata
- Gradle Log

Failureの工程によって必要なEvidenceが異なります。

## Lesson 8: Native変更判定

Nativeと無関係な文書変更でも、毎回Android Build + Emulatorを実行するとCostが大きくなります。

Scenario Shopでは変更Pathを判定し、Native変更がない場合は高コストJobをSkipします。

ただし変更判定が狭すぎると、本来Nativeへ影響する変更を見逃します。

最適化とFail-safeのBalanceを考えます。

## Lesson 9: iOS Simulator CI

`native-ios-ci.yml` を読み、次の流れを確認します。

```text
macOS Runner
↓
Xcode選択
↓
pnpm install
↓
expo prebuild
↓
pod install
↓
xcodebuild
↓
Simulator boot
↓
App install / launch
↓
Maestro
↓
Evidence
```

iOSではmacOS Runnerが必要で、AndroidとはCost特性が異なります。

## Lesson 10: Android / iOSを独立して考える

片方のPlatformが失敗したとき、依存しない他Platformまで止める必要があるかを考えます。

Scenario ShopのPhase 2方針では、Android / iOSを独立実行し、進められる検証を継続する考え方を採用しています。

一方、最終Quality Gateでは必要なPlatform結果を揃える必要があります。

## ハンズオン1: Native CI構成を図にする

現在のAndroid Native CIを、Job依存関係として図示します。

最低限次を含めます。

- Detect
- Native Static
- Production Bundle Guard
- Android Build
- APK Artifact
- Android Runtime / Maestro
- Verify

## ハンズオン2: Failure Pointを分類する

次のFailureを分類します。

- Gradle Build Failure
- APK Install Failure
- Emulator Boot Failure
- Maestro Assertion Failure
- App Crash

各Failureで最初に見るEvidenceを決めます。

## ハンズオン3: iOS構成比較

AndroidとiOSで共通する工程と異なる工程を表へ整理します。

## ハンズオン4: 実行頻度を考える

Part 1で作ったMaestro Flowについて、次の候補から実行タイミングを考えます。

- PR
- main
- Nightly
- Manual

Runner Costと重要度を理由として記録します。

## 確認問題

1. Android BuildとRuntimeを分けるメリットは何か。
2. FlowごとにEmulator Jobを分けすぎない方がよい理由は何か。
3. Native変更判定を最適化しすぎるRiskは何か。
4. Maestro FailureとEmulator Failureをどう区別するか。
5. iOS CIでmacOS Runnerが必要なことはCI設計へどんな影響を与えるか。

## 完了条件

- Android Native CIのJob構成を説明できる。
- Build Artifact再利用の目的を説明できる。
- Native Failureを工程別に分類できる。
- iOS Simulator CIのBuild → Install → Launch → Maestroの流れを説明できる。
- Native Testの実行頻度案をCostとRiskから説明できる。
