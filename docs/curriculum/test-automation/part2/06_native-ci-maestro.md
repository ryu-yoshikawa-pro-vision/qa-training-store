# Part 2-6: Native CIとMaestro

> **Native specialization:** このLessonはPart 2 Commonの必須Lessonではありません。開始前のCommon prerequisiteはP2-5までです。P1 Native specializationで得るMaestro実行能力をNative内部prerequisiteとし、P1 Native specialization未修了でP2 Nativeを選択する場合は先にその能力を満たします。選択しない受講者はP2-6をskipしてP2-7へ進み、完了後はP2-7へrejoinします。

## 学習目標

- MaestroをCIで実行するために必要なNative実行環境を説明できる。
- Androidの最小Training WorkflowでBuild、Emulator、Install、Maestro実行までを体験できる。
- Android BuildとAndroid Emulator実行を分ける理由を理解できる。
- APK ArtifactをBuild JobからRuntime Jobへ受け渡す構成を説明できる。
- iOSのBuild-only CIで、Build-time metadata／Production guard／Artifactを検証する流れを理解できる。
- Native変更がない場合に高コストJobをSkipする設計を理解できる。
- JUnit、Screenshot、logcat、Simulator診断などNative Failure Evidenceを扱える。
- Web CIとNative CIで異なるCost・Flakiness・実行時間を考慮できる。

## 教材

**このモジュールでは、このリポジトリのNativeアプリ、Maestro Flow、Android / iOS GitHub Actions Workflowを使用します。**

主な参照先:

- `maestro/`
- `training/maestro/`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/run-maestro-baseline.ts`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `scripts/native/windows/android-local.ps1`
- `package.json`
- Native Test Control / Contract Harness

## 現在のRepositoryにおけるAndroid / iOS CIの位置づけ（Reference / Current topology）

2026年8月時点のRepositoryでは、AndroidとiOSで実行Triggerが異なります。

### Android

`.github/workflows/native-ci.yml` は `pull_request` と `workflow_dispatch` で起動します。

Native変更判定、Static Check、Production Bundle Guard、Android Build、Android Runtime / Maestro、最終Verifyまでを含む、PR連動のNative CIです。

### iOS

`.github/workflows/native-ios-ci.yml` はstandaloneでは `workflow_dispatch` で起動できるBuild-only入口です。Native変更時は`.github/workflows/native-ci.yml`が`native_changed=true`を検出するとこのreusable workflowを呼び出します。

standalone実行では、iOS Automation / Productionのunsigned Release `iphonesimulator` BuildとArtifactを確認する**手動実行のBuild-only baseline**です。Native変更時はtop-level `native-ci`のPR連動経路でiOS Buildが実行され、`native-ci / verify`がiOS成功をRequiredとします。Simulator Install／Launch／Maestroは現行正式Gateの保証対象外です。

このCurrent boundaryを前提に、後続演習では「iOSをPR / main / Nightly / Manualのどこへ配置するか」をRiskとCostから考えます。

## Training Native Workflowの前提

受講者が最初から現在の `native-ci.yml` を複製することは前提にしません。最小Training Workflow templateは実装済みです。

- Production Deployや本番Secretへ依存しない。
- Androidを標準実行Platformとする。
- Part 1で作成したMaestro Flowを1本以上CIで実行できる。
- Build / Emulator / Install / Maestro / Evidenceの関係を確認できる。
- 現在の高度なFormal Native CIは、最小構成を動かした後に比較する。

Training Native Workflowは `permissions: contents: read`、Secret / OIDC / Environment / Deployなしで、GitHub-hosted Ubuntu runner上のBuild → API 34 Emulator → Install → Maestro → Evidenceを構成します。ここでのEmulatorはGitHub Native CIのCanonicalであり、Windows Local Fresh LearnerのCanonical Physical Device経路とは別責務です。Formal Native CIのRequired Gateを置き換えず、Training baselineは既存Formal Android Runtimeからも再利用できます。

Training baselineは、環境と実行経路を確認するための開始点です。P2-6 Native specializationのcompletionには、baselineの再実行ではなく、受講者が作成したboundedなTraining Native CI変更、その実行結果、Failure / Artifact / Costの判断を使います。

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
- `iphonesimulator` Build
- Build-time metadata / Production guard
- `.app` Artifact保存

そのため、Native CIでは実行時間とRunner Costを特に意識します。

## Lesson 2: まず1Jobで全体を動かす

学習の最初からBuild / Runtime分離を採用しません。

Training Workflowでは、まず概念的に1Jobで次を動かします。

```text
Checkout
↓
Dependency / SDK Setup
↓
Android Build
↓
Emulator Boot
↓
APK Install
↓
App Launch
↓
Maestro 1 Flow
↓
JUnit / Screenshot
```

最初にEnd-to-Endで動くことで、Native CIに必要な要素とFailure Pointを理解します。

その後、実行時間や再実行Costという問題を見たうえで、現在のRepositoryがBuild / Runtimeを分けている理由へ進みます。

## Lesson 3: Android BuildとRuntime

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

## Lesson 4: APK Artifact

Build Jobで生成したAPKをGitHub Actions Artifactへ保存し、Runtime JobでDownloadします。

これにより次が可能になります。

- BuildとRuntimeの責務分離
- Runtime Failure時の原因特定
- Build済みArtifactの再利用
- EvidenceとしてのAPK Metadata確認

ただしArtifact Upload / Downloadにも時間がかかるため、分割の価値がある境界を考えます。

## Lesson 5: CI Emulator

GitHub Native Android Runtime Jobでは、APKをInstallするためにAPI 34 / `google_apis` / `x86_64` Emulatorを起動します。Windows LocalではこのLessonのEmulatorを起動せず、Part 1のPhysical Device runbookを使用します。

確認観点:

- API Level
- Architecture
- Boot完了
- adb接続
- APK Install
- App Process

Maestro Failureに見えても、実際にはEmulator起動やInstallが失敗している場合があります。

## Lesson 6: Native Test Control

CIでは毎回同じ初期状態へ戻す必要があります。

Scenario ShopではDeep Link Test Controlを使い、MaestroからSeed Scenario Resetできます。

WebのFixtureと目的は似ていますが、仕組みはPlatformに合わせて異なります。

## Lesson 7: Maestro Flow単位の実行結果

Maestro Flowを全部1Commandへまとめると、どのFlowで失敗したか分かりにくくなる場合があります。

Scenario ShopのAndroid CIでは、同一Emulator Jobの中でFlowをStep単位に分けています。

重要なのは、FlowごとにEmulator Jobを分けすぎて起動Costを増やさないことです。

## Lesson 8: JUnitとEvidence

Maestroの実行結果はJUnit形式で保存できます。

Native Failure時には次も有効です。

- Maestro Screenshot / Artifact
- JUnit
- logcat
- Emulator情報
- APK Metadata
- Gradle Log

Failureの工程によって必要なEvidenceが異なります。

## Lesson 9: Native変更判定

Nativeと無関係な文書変更でも、毎回Android Build + Emulatorを実行するとCostが大きくなります。

Scenario Shopでは変更Pathを判定し、Native変更がない場合は高コストJobをSkipします。

ただし変更判定が狭すぎると、本来Nativeへ影響する変更を見逃します。

最適化とFail-safeのBalanceを考えます。

## Lesson 10: iOS Build-only CI

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
Build-time metadata / Production guard
↓
`.app` Artifact upload
```

iOSではmacOS Runnerが必要で、AndroidとはCost特性が異なります。

standaloneでは `workflow_dispatch` の手動Build baselineであり、Native変更時はtop-level `native-ci`から呼び出されるRequired Build-only経路です。「Build Artifactが生成・検証される」ことと「Simulator Runtime / Maestroが動く」ことを区別します。

## Lesson 11: Android / iOSを独立して考える

片方のPlatformが失敗したとき、依存しない他Platformまで止める必要があるかを考えます。

Scenario ShopのPhase 2方針では、Android / iOSを独立実行し、進められる検証を継続する考え方を採用しています。

一方、将来の最終Quality Gateで両Platformを必須にするかは、品質要求、Runner Cost、実行時間、信頼性から別途判断する必要があります。

## ハンズオン1: Android MaestroをTraining CIで実行する

`training-native-ci.yml`を読み、Android用の最小Native JobでPart 1のMaestro Flowを1本実行します。Training baselineの通常入口は `pnpm run training:native:baseline` です。

最低限次の工程を含めます。

1. Repository Checkout
2. Node / Java / Android SDK準備
3. Dependency Install
4. Scenario Shop Android Build
5. Android Emulator起動
6. APK Install
7. App Launch
8. Maestro Flow実行
9. JUnitまたはScreenshotをArtifactとして保存

目的は現在の `native-ci.yml` を完全再現することではありません。

**Localで動いていたMaestro Flowを、GitHub ActionsのRunner上でも自動実行できる**ところまでを体験します。

## ハンズオン2: Native Failureを1件分析する

Training Native Workflowで、意図的または実際のFailureを1件確認します。

次のどこで失敗したか分類します。

- Gradle Build
- Emulator Boot
- APK Install
- App Launch
- Maestro Assertion

Failure箇所に応じて、最初に見るLog / Artifactを記録します。

## ハンズオン3: 現在のAndroid Native CI構成を図にする

Training Workflowを動かした後に、現在のAndroid Native CIをJob依存関係として図示します。

最低限次を含めます。

- Detect
- Native Static
- Production Bundle Guard
- Android Build
- APK Artifact
- Android Runtime / Maestro
- Verify

自分の1Job構成と比較し、なぜ現在のRepositoryでは責務を分けているか説明します。

## ハンズオン4: Build / Runtime分離を設計する

Training Workflowの実行結果をもとに、次を考えます。

- Buildに何分かかったか。
- Maestroだけ再実行したい場合に何を再利用できるか。
- APKをArtifact化する価値があるか。
- Jobを分けることで増えるCostは何か。

実際に高度な分割Workflowへ作り直すことは必須にしません。設計判断を説明できることを重視します。

## ハンズオン5: iOS構成比較

現在の `native-ios-ci.yml` を読み、AndroidとiOSで共通する工程と異なる工程を表へ整理します。

さらに、現在iOSにstandaloneのManual入口があり、Native変更時にはRequired Build-only経路へ含まれることを踏まえ、次から自分ならどこへ配置するか選びます。

- PR Required
- PR Optional
- main
- Nightly
- Manual

macOS Runner Cost、Feedback速度、対象Riskを理由として記録します。

## ハンズオン6: Native実行頻度を考える

Part 1で作ったMaestro Flowについて、次の候補から実行タイミングを考えます。

- PR
- main
- Nightly
- Manual

AndroidとiOSを同じ頻度にする必要があるかも含め、Runner Costと重要度を理由として記録します。

## 確認問題

1. 最初のTraining Native CIを1Jobで動かす価値は何か。
2. Android BuildとRuntimeを分けるメリットは何か。
3. FlowごとにEmulator Jobを分けすぎない方がよい理由は何か。
4. Native変更判定を最適化しすぎるRiskは何か。
5. Maestro FailureとEmulator Failureをどう区別するか。
6. iOS CIが現在 `workflow_dispatch` であることと、PR Required Gateであることはどう違うか。
7. iOS CIでmacOS Runnerが必要なことはCI設計へどんな影響を与えるか。

## 自己確認

次を自分のTraining Native CIのDiff、Run、またはArtifactを指しながら確認できれば、Native specializationの判断を自己判定できます。

- baselineと自分が作成したboundedなNative CI変更を区別できる。
- AndroidのBuild、Emulator Boot、APK Install、App Launch、Maestro AssertionのFailure stageと最初に見るEvidenceを対応付けられる。
- APK Artifactを再利用する価値と、FlowごとにJobを分けすぎない理由をCostとActionabilityから説明できる。
- Native変更判定をskipする場合のRiskと、Fail-safeな再確認方法を説明できる。
- iOSのBuild-time metadata / guard / Artifactと、Simulator Runtime / Maestro非保証を区別できる。Current topologyの詳細はReference comparisonとして扱う。

### Recovery

Native CIが失敗した場合は、Workflow起動、SDK / Dependency Setup、Gradle Build、Emulator Boot、APK Install、App Launch、Maestro Assertionの順に確認し、該当Artifactを残します。RunnerやSDK、端末相当の問題はEnvironment blockとして分離し、CI設計の未理解と決めつけません。baselineしかない場合は、boundedな自分の変更Diffへ戻り、再実行だけでcompletionとしないことを確認します。

## 完了条件

この完了条件はNative specializationを選択した受講者に適用します。Part 2 CommonではP2-6を要求せず、P2-5からP2-7へ進みます。

- boundedなTraining Native CI変更を自分で作成し、変更Diffと実行結果を対応付けている。
- 変更後のGitHub-hosted Android Training WorkflowでScenario ShopをBuildし、API 34 Emulator上でMaestro Flowを実行している。
- Native Failureを工程別に分類し、Failure stageに対応するEvidenceを確認している。
- Build Artifact再利用とNative実行頻度の判断を、Cost、Risk、再実行範囲の理由付きで説明できる。
- iOS CIのBuild-only境界はReference comparisonとして扱い、Native RuntimeやBaselineをcompletionの代替にしていない。

## 次の行動

Native specializationを続ける場合は、P2-7のCommon Quality Gateへ戻り、Native成果物を選択課題として接続します。P2-6を選択しない場合は、そのまま [P2-7: Quality GateとCI/CD](07_ci-cd-quality-gates.md)へ進みます。
