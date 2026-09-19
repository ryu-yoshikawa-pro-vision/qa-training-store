# Part 2-6: Native CIとMaestro

> **モバイルアプリ自動化の選択課程:** このLessonはPart 2の共通課程における必須Lessonではありません。開始前の共通課程の必須前提はP2-5までです。P1の選択課程で得るMaestro実行能力をNative内部の前提とし、P1の選択課程を未修了のままP2 Nativeを選ぶ場合は先にその能力を満たします。選択しない受講者はP2-6を飛ばしてP2-7へ進み、完了後はP2-7へ合流します。

## 学習目標

- MaestroをCIで実行するために必要なNative実行環境を説明できる。
- Androidの最小Training WorkflowでBuild、Emulator、Install、Maestro実行までを体験できる。
- Android BuildとAndroid Emulator実行を分ける理由を理解できる。
- APK ArtifactをBuild JobからRuntime Jobへ受け渡す構成を説明できる。
- iOSのBuild-only CIで、Build-time metadata／Production guard／Artifactを検証する流れを理解できる。
- Native変更がない場合に高コストJobをSkipする設計を理解できる。
- JUnit、Screenshot、logcat、Simulator診断などNative Failureの記録を扱える。
- Web CIとNative CIで異なるCost・Flakiness・実行時間を考慮できる。

## 教材

**このモジュールでは、このリポジトリのNativeアプリ、Maestro Flow、Android / iOS GitHub Actions Workflowを使用します。**

主な参照先:

- `maestro/`
- `training/maestro/`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/run-maestro-exercise.ts`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `scripts/native/windows/android-local.ps1`
- `package.json`
- Native Test Control / Contract Harness

## 現在のリポジトリにおけるAndroid / iOS CIの位置づけ（参考・現在の構成）

2026年8月時点のRepositoryでは、AndroidとiOSで実行Triggerが異なります。

### Android

`.github/workflows/native-ci.yml` は `pull_request` と `workflow_dispatch` で起動します。

Native変更判定、Static Check、Production Bundle Guard、Android Build、Android Runtime / Maestro、最終Verifyまでを含む、PR連動のNative CIです。

### iOS

`.github/workflows/native-ios-ci.yml` はstandaloneでは `workflow_dispatch` で起動できるBuild-only入口です。Native変更時は`.github/workflows/native-ci.yml`が`native_changed=true`を検出するとこのreusable workflowを呼び出します。

standalone実行では、iOS Automation / Productionのunsigned Release `iphonesimulator` BuildとArtifactを確認する**手動実行のBuild-only baseline**です。Native変更時はtop-level `native-ci`のPR連動経路でiOS Buildが実行され、`native-ci / verify`がiOS成功を必須とします。Simulator Install／Launch／Maestroは現行正式Gateの保証対象外です。

この現在の境界を前提に、後続演習では「iOSをPR / main / Nightly / Manualのどこへ配置するか」をRiskとCostから考えます。

## Training Native Workflowの前提

受講者が最初から現在の `native-ci.yml` を複製することは前提にしません。Source Repositoryの `training/github-actions/*.yml` はリポジトリ管理のtemplate・参考資料、Training Copyの `.github/workflows/*.yml` は実行するactive workflowです。モバイルアプリ自動化の選択課程の開始時点では、active workflowは準備済みです。

- Production Deployや本番Secretへ依存しない。
- Androidを標準実行Platformとする。
- Part 1で作成したMaestro Flowを1本以上CIで実行できる。
- Build / Emulator / Install / Maestro / 実行記録の関係を確認できる。
- 現在の高度なFormal Native CIは、最小構成を動かした後に比較する。

Training Native Workflowは `permissions: contents: read`、Secret / OIDC / Environment / Deployなしで、対象path変更またはmanual dispatch時にGitHub-hosted Ubuntu runner上のBuild → API 34 Emulator → Install → `training:native:baseline` → `training:native:exercise` → 実行記録の取得を実行します。baselineとexerciseのJUnit / Artifactを分け、Failure時に保存されるdiagnostic Artifactとは区別します。ここでのEmulatorはGitHub Native CIの正規経路であり、Windows Localの初学者向けPhysical Device経路とは別責務です。Formal Native CIの必須Gateを置き換えず、共通課程だけの変更ではこのTraining Native Workflowを起動しません。

Training baselineは、環境と実行経路を確認するための開始点です。P2-6の選択課程の修了条件には、baselineの再実行ではなく、受講者が作成したNative exercise diff、Training Native CIで取得したMaestro exerciseの成功Artifact、Trigger / Failure stage / Artifact / CostのCI設計判断を使います。Failure時のArtifactはdiagnosis用であり、exercise stepのfailureやexercise JUnitを欠くArtifactだけでは成功実行の記録にはなりません。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P2-5までの共通課程、必要ならP1-7のNative Flow、P2-5のCI設計、準備済みTraining Copy、Android／Emulator／Maestro実行環境。P2-6を選択しない受講者はこのInputを準備せずP2-7へ進む |
| Activity | Build、Emulator、Install、Maestro exercise、JUnit／Screenshot／logcat／Artifactの順を確認し、Web CIとのCost・Flakiness・Failure stageを比較する |
| Observation | BuildとRuntimeの境界、baselineと受講者exercise、Trigger、Artifact受け渡し、iOS Build-only、同一attemptの成果、失敗時の診断記録 |
| Output | Native exercise diff、Run／Job／Artifact参照、Trigger／Failure stage／Costの判断、P2-7へ渡すNative選択課程の記録。編集場所は自由で、self-checkは`handoff-root/self-check/P2-06.md`へ残す |
| Self-check | WebとNativeのCI要件、Build／Runtime、成功Artifactとdiagnostic Artifact、Android EmulatorとWindows Physical Device、iOS Build-onlyの違いを説明する |
| Completion | 選択課程として受講者Native exerciseと同一attemptの成功Artifactを確認できる。baseline／stock PASSだけでは完了としない。P2-6を選択しないCommonはこの成果物なしで進める |
| Recovery | Toolchain／Emulator／ADB／Maestro／権限問題は環境として分ける。FlowやCI設計の理解不足はP1-7／P2-5へ戻り、iOS Runtimeを成功条件へ追加しない |
| Handoff | P2-7へNativeを選択した場合だけ、Flow diff、Run／Job／Artifact、Failure stage、Cost判断を渡す。CommonではP2-5のWeb CI証跡を受け取る |

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
- APK Metadataを使った実行記録の確認

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

## Lesson 8: JUnitと実行記録

Maestroの実行結果はJUnit形式で保存できます。

Native Failure時には次も有効です。

- Maestro Screenshot / Artifact
- JUnit
- logcat
- Emulator情報
- APK Metadata
- Gradle Log

Failureの工程によって必要な記録が異なります。

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

standaloneでは `workflow_dispatch` の手動Build baselineであり、Native変更時はtop-level `native-ci`から呼び出される必須のBuild-only経路です。「Build Artifactが生成・検証される」ことと「Simulator Runtime / Maestroが動く」ことを区別します。

## Lesson 11: Android / iOSを独立して考える

片方のPlatformが失敗したとき、依存しない他Platformまで止める必要があるかを考えます。

Scenario ShopのPhase 2方針では、Android / iOSを独立実行し、進められる検証を継続する考え方を採用しています。

一方、将来の最終Quality Gateで両Platformを必須にするかは、品質要求、Runner Cost、実行時間、信頼性から別途判断する必要があります。

## ハンズオン1: Android MaestroをTraining CIで実行する

準備済みのTraining Copyのactive workflowを、選択課程に関係するpathの変更またはmanual dispatchで実行します。Workflow YAMLを自分で作成・変更することは必須にしません。起動時は `pnpm run training:native:baseline` の後に `pnpm run training:native:exercise` を実行します。

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

prepared Training Native Workflowの1Job構成と比較し、なぜ現在のRepositoryでは責務を分けているか説明します。

## ハンズオン4: Build / Runtime分離を設計する

Training Workflowの実行結果をもとに、次を考えます。

- Buildに何分かかったか。
- Maestroだけ再実行したい場合に何を再利用できるか。
- APKをArtifact化する価値があるか。
- Jobを分けることで増えるCostは何か。

実際に高度な分割Workflowへ作り直すことは必須にしません。設計判断を説明できることを重視します。

## ハンズオン5: iOS構成比較

現在の `native-ios-ci.yml` を読み、AndroidとiOSで共通する工程と異なる工程を表へ整理します。

さらに、現在iOSにstandaloneのManual入口があり、Native変更時には必須のBuild-only経路へ含まれることを踏まえ、次から自分ならどこへ配置するか選びます。

- PRで必須
- PRでは任意
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
6. iOS CIが現在 `workflow_dispatch` であることと、PRで必須のGateであることはどう違うか。
7. iOS CIでmacOS Runnerが必要なことはCI設計へどんな影響を与えるか。

## 自己確認

次を受講者が作成したexercise Diff、Training Native CIのRun、またはArtifactを指しながら確認できれば、選択課程の到達度を自己判定できます。

- baselineと自分が作成したNative exercise diffを区別し、`training:native:exercise` step successと同じRunのexercise JUnit Artifactを確認できる。
- 選択課程に関係するpathのTrigger、Failure stage、Artifact、Costの判断を説明できる。共通課程だけの変更ではNative Training Workflowが起動しないことも確認できる。
- AndroidのBuild、Emulator Boot、APK Install、App Launch、Maestro AssertionのFailure stageと最初に見る記録を対応付けられる。
- APK Artifactを再利用する価値と、FlowごとにJobを分けすぎない理由をCostとActionabilityから説明できる。
- Native変更判定をskipする場合のRiskと、Fail-safeな再確認方法を説明できる。
- iOSのBuild-time metadata / guard / Artifactと、Simulator Runtime / Maestro非保証を区別できる。現在の構成の詳細は参考比較として扱う。

### Recovery

Native CIが失敗した場合は、Workflow起動、SDK / Dependency Setup、Gradle Build、Emulator Boot、APK Install、App Launch、Maestro Assertionの順に確認し、該当Artifactを残します。RunnerやSDK、端末相当の問題は環境上の問題として分離し、CI設計の未理解と決めつけません。baselineしかない場合、exercise stepが失敗した場合、またはexercise JUnitを欠く場合はdiagnosis用Artifactとして扱い、修了に必要なexercise成功の記録とはしません。Workflow YAMLのDiffを修了条件へ戻すのではなく、exercise DiffとTrigger / Failure stage / Artifact / Cost判断を確認します。

## 完了条件

この完了条件はモバイルアプリ自動化の選択課程を選んだ受講者に適用します。Part 2の共通課程ではP2-6を要求せず、P2-5からP2-7へ進みます。

- 受講者が作成したNative exercise diffと、Training Native CIで取得したMaestro exerciseの成功Artifactを対応付けている。
- 準備済みのTraining Native Workflowを選択課程に関係するpathの変更またはmanual dispatchで実行し、API 34 Emulator上のbaseline → exerciseとArtifactの分離を確認している。
- Native Failureを工程別に分類し、Failure stageに対応する記録を確認している。
- Trigger、Failure stage、Artifact、CostのCI設計判断を、Cost、Risk、再実行範囲の理由付きで説明できる。Training workflow YAMLの編集自体は必須にしない。
- iOS CIのBuild-only境界は参考比較として扱い、Native RuntimeやBaselineを修了の代替にしていない。

## 次の行動

選択課程を続ける場合は、P2-7の共通課程のQuality Gateへ戻り、Native成果物を選択課題として接続します。P2-6を選択しない場合は、そのまま [P2-7: Quality GateとCI/CD](07_ci-cd-quality-gates.md)へ進みます。
