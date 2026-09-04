# Part 2-6: Native CIとMaestro

> **Native specialization:** このLessonはPart 2 Commonの必須Lessonではありません。開始前のCommon prerequisiteはP2-5までです。P1 Native specializationで得るMaestro実行能力をNative内部prerequisiteとし、P1 Native specialization未修了でP2 Nativeを選択する場合は先にその能力を満たします。選択しない受講者はP2-6をskipしてP2-7へ進み、完了後はP2-7へrejoinします。

## 学習目標

- MaestroをCIで実行するために必要なNative実行環境を説明できる。
- Androidの最小Training WorkflowでBuild、Emulator、Install、Maestro実行までを体験できる。
- BuildとRuntimeを分ける理由を理解できる。
- Build ArtifactをRuntimeへ受け渡す構成の目的を説明できる。
- Native Failureを工程別に切り分け、適切なEvidenceを確認できる。
- Native CIの実行頻度をRisk、Cost、Feedback速度から考えられる。
- Current RepositoryのAndroid / iOS Workflow詳細を、必須暗記ではなく比較用Referenceとして読める。

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

### Core / Reference boundary

- **Native specialization Core**: learner-authored Maestro Flowを安全なTraining CIで実行し、Build / Runtime / Testの工程、Failure Evidence、Artifact、実行Costを説明できること。
- **Reference**: API LevelやJob名、Current Android Job topology、Native変更判定、Action / metadata / guard、Current iOS Workflowの具体的なTrigger構造など、Repository固有の実装詳細。
- **Comparison practice**: Android / iOSの保証差やCurrent Workflowは、Core概念を理解した後に読む比較材料であり、特定の構成暗記をspecialization completionにしない。

## 現在のRepositoryにおけるAndroid / iOS CIの位置づけ（Reference）

2026年8月時点のRepositoryでは、AndroidとiOSで実行Triggerが異なります。

### Android

`.github/workflows/native-ci.yml` は `pull_request` と `workflow_dispatch` で起動します。

Native変更判定、Static Check、Production Bundle Guard、Android Build、Android Runtime / Maestro、最終Verifyまでを含む、PR連動のNative CIです。

### iOS

`.github/workflows/native-ios-ci.yml` はstandaloneでは `workflow_dispatch` で起動できるBuild-only入口です。Native変更時は`.github/workflows/native-ci.yml`が`native_changed=true`を検出するとこのreusable workflowを呼び出します。

standalone実行では、iOS Automation / Productionのunsigned Release `iphonesimulator` BuildとArtifactを確認する**手動実行のBuild-only baseline**です。Native変更時はtop-level `native-ci`のPR連動経路でiOS Buildが実行され、`native-ci / verify`がiOS成功をRequiredとします。Simulator Install／Launch／Maestroは現行正式Gateの保証対象外です。

このCurrent boundaryを、後続の設計判断で比較材料として使います。CurrentのJob名やTrigger構成そのものをcompletion条件にはしません。

## Training Native Workflowの前提

受講者が最初から現在の `native-ci.yml` を複製することは前提にしません。最小Training Workflow templateは実装済みです。

- Production Deployや本番Secretへ依存しない。
- Androidを標準実行Platformとする。
- Part 1で作成したMaestro Flowを1本以上CIで実行できる。
- Build / Emulator / Install / Maestro / Evidenceの関係を確認できる。
- 現在の高度なFormal Native CIは、最小構成を動かした後に比較する。

Training Native Workflowは `permissions: contents: read`、Secret / OIDC / Environment / Deployなしで、GitHub-hosted Ubuntu runner上のBuild → Android Emulator → Install → Maestro → Evidenceを構成します。具体的なAPI LevelやABIはCurrent Training assetを参照し、completion条件として暗記しません。ここでのEmulatorはGitHub Native CIの実行環境であり、Windows Local Fresh LearnerのCanonical Physical Device経路とは別責務です。Formal Native CIのRequired Gateを置き換えず、Training baselineは既存Formal Android Runtimeからも再利用できます。

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

このCurrent構成は、BuildとRuntimeを分ける設計判断の比較材料として読みます。

## Lesson 4: APK Artifact

Build Jobで生成したAPKをGitHub Actions Artifactへ保存し、Runtime JobでDownloadします。

これにより次が可能になります。

- BuildとRuntimeの責務分離
- Runtime Failure時の原因特定
- Build済みArtifactの再利用
- EvidenceとしてのAPK Metadata確認

ただしArtifact Upload / Downloadにも時間がかかるため、分割の価値がある境界を考えます。

## Lesson 5: CI Emulator

GitHub Native Android Runtime Jobでは、APKをInstallするためにEmulatorを起動します。CurrentのAPI Level / image / ABIはRepository assetを参照します。Windows LocalではこのLessonのEmulatorを起動せず、Part 1のPhysical Device runbookを使用します。

確認観点:

- API Level / image / ABIがTraining contractと一致する。
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

## Lesson 9: Native変更判定（Reference）

Nativeと無関係な文書変更でも、毎回Android Build + Emulatorを実行するとCostが大きくなります。

Scenario Shopでは変更Pathを判定し、Native変更がない場合は高コストJobをSkipします。

ただし変更判定が狭すぎると、本来Nativeへ影響する変更を見逃します。

Currentのallowlist / parser / path detailはRepository固有Referenceです。Coreでは「高コストGateのTrigger範囲を狭めるときはfalse negativeを避ける」という設計判断を理解します。

## Lesson 10: iOS Build-only CI（Reference）

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

standaloneでは `workflow_dispatch` の手動Build baselineであり、Native変更時はtop-level `native-ci`から呼び出されるRequired Build-only経路です。「Build Artifactが生成・検証される」ことと「Simulator Runtime / Maestroが動く」ことを区別します。Current Triggerやguard構成の暗記はcompletion条件にしません。

## Lesson 11: Android / iOSを独立して考える

片方のPlatformが失敗したとき、依存しない他Platformまで止める必要があるかを考えます。

Scenario ShopのPhase 2方針では、Android / iOSを独立実行し、進められる検証を継続する考え方を採用しています。

一方、将来の最終Quality Gateで両Platformを必須にするかは、品質要求、Runner Cost、実行時間、信頼性から別途判断する必要があります。

## ハンズオン1: Android MaestroをTraining CIで実行する

`training-native-ci.yml`を読み、Android用の最小Native JobでPart 1のlearner-authored Maestro Flowを1本実行します。Training baselineの通常入口は `pnpm run training:native:baseline` です。

最低限次の工程を確認します。

1. Repository Checkout
2. Dependency / SDK準備
3. Scenario Shop Android Build
4. Android Emulator起動
5. APK Install / App Launch
6. learner-authored Maestro Flow実行
7. JUnitまたはScreenshotなどのEvidence保存

目的は現在の `native-ci.yml` を完全再現することではありません。

**Localで動いていたlearner-authored Maestro Flowを、安全なTraining CI上でも自動実行でき、結果をEvidenceで確認できる**ところまでを体験します。

## ハンズオン2: Native Failureを1件分析する

Training Native Workflowで、意図的または実際のFailureを1件確認します。

次のどこで失敗したか分類します。

- Gradle Build
- Emulator Boot
- APK Install
- App Launch
- Maestro Assertion

Failure箇所に応じて、最初に見るLog / Artifactを記録します。

## ハンズオン3: Build / Runtime分離を設計する

Training Workflowの実行結果をもとに、次を考えます。

- Buildに時間がかかる場合、Runtime Failure時に何を再利用できるか。
- APKをArtifact化する価値があるか。
- Jobを分けることで増えるCostは何か。

実際に高度な分割Workflowへ作り直すことは必須にしません。設計判断を説明できることを重視します。

### Current Repository comparison（Reference / 任意）

以下はCore完了後の比較材料です。特定のJob名・API Level・Trigger・guardを暗記することはcompletionに含めません。

## ハンズオン4: 現在のAndroid Native CI構成を図にする

現在のAndroid Native CIをJob依存関係として図示し、自分の最小Training Workflowと比較します。

比較例:

- Detect
- Native Static
- Production Bundle Guard
- Android Build
- APK Artifact
- Android Runtime / Maestro
- Verify

## ハンズオン5: iOS構成比較

現在の `native-ios-ci.yml` を読み、AndroidとiOSで共通する工程と異なる工程を表へ整理します。

CurrentのTriggerやBuild-only保証を比較し、どこまでをRuntime guaranteeとして扱えるかを区別します。

## ハンズオン6: Native実行頻度を考える

Part 1で作ったMaestro Flowについて、次の候補から実行タイミングを考えます。

- PR
- main
- Nightly
- Manual

Runner Cost、Feedback速度、対象Riskを理由として記録します。Android / iOSを同じ頻度にする必要があるかも検討できますが、Currentの配置をそのまま正解として写しません。

## 確認問題

1. 最初のTraining Native CIを1Jobで動かす価値は何か。
2. BuildとRuntimeを分けるメリットは何か。
3. FlowごとにEmulator Jobを分けすぎない方がよい理由は何か。
4. Native変更判定を最適化しすぎるRiskは何か。
5. Maestro FailureとEmulator Failureをどう区別するか。
6. Build-onlyとRuntime guaranteeを区別する理由は何か。
7. Native CIの実行頻度をCostとRiskから決める必要があるのはなぜか。

## 自己確認とRecovery

Native specializationを選択した場合だけ、P2-5完了、P1 Native能力または同等のMaestro内部prerequisite、Training Native Workflow、Build / Emulator / Install / Maestro、Native Failure Evidenceの順に確認します。Training baselineやAPKの存在だけでC08を完了したことにはせず、learner-authored Flowの実行結果を分けます。

失敗時はGradle Build、Emulator Boot、APK Install、App Launch、Maestro Assertionの最初の異常を特定し、工程に応じたLog / Artifactへ戻ります。CurrentのAPI Level、Job名、Trigger、iOS guard構成が分からなくても、必要ならReferenceへ戻ればよく、それ自体をcompletion条件にはしません。Common routeではP2-6をskipしてP2-7へ進みます。

## 完了条件

この完了条件はNative specializationを選択した受講者に適用します。Part 2 CommonではP2-6を要求せず、P2-5からP2-7へ進みます。

- learner-authored Maestro Flowを安全なTraining Native CIで実行し、successful execution artifactまたは同等のEvidenceを確認できる。
- Native FailureをBuild / Emulator / Install / App Launch / Maestroなどの工程へ切り分け、最初に確認すべきEvidenceを説明できる。
- BuildとRuntimeを分ける目的と、Artifact再利用のTrade-offを説明できる。
- Build-only guaranteeとRuntime guaranteeを区別し、未実行のRuntimeをPASSへ昇格させない。
- Native CIの実行タイミングをRisk、Cost、Feedback速度から理由付きで説明できる。
- Current RepositoryのJob名、API Level、Trigger、metadata / guardなどの詳細を暗記しなくてもspecialization completionが成立する。
