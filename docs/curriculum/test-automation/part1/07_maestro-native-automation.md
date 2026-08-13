# Part 1-7: MaestroによるNative UI自動化

## 学習目標

- Web UI自動化とNative UI自動化の違いを説明できる。
- MaestroのFlow、Action、Assertionの基本を理解できる。
- Scenario Shop Nativeアプリを対象に最小のMaestro Flowを作成できる。
- Stable UI Test ID、Deep Link、Test Controlを利用して再現可能なNative Testを作れる。
- AndroidでRequired Flowを実装し、iOSはBuild-only保証とPlatform差分を説明できる。
- PlaywrightとMaestroを「どちらが優れているか」ではなく、対象Platformと目的から使い分けられる。

## 教材

**このモジュールでは、このリポジトリのScenario Shop Nativeアプリと `maestro/` 配下の既存Flowを使用します。**

主な参照先:

- `maestro/native-storefront.yaml`
- `maestro/native-cart.yaml`
- `maestro/native-search.yaml`
- `maestro/native-test-control.yaml`
- `maestro/native-restart-persistence.yaml`
- `src/presentation/native/`
- Native Stable UI Test ID
- `scenario-shop://` Deep Link

## Part 1での標準実行環境

Part 1のMaestroハンズオンは、全受講者が同じ手順を再現しやすいように**Android Emulatorを標準経路**とします。

Current Formal GuaranteeはAndroid = Build + Runtime E2E、iOS = Build-onlyです。iOS Simulator / Maestroを使える環境でも、それを正式Runtime保証やPart 1完了条件へ昇格させません。

理由は次です。

- iOS RuntimeにはmacOS / Xcode環境が必要だが、Current formal CIはBuild-onlyである。
- Part 1の目的はNative UI自動化の基本概念を理解することであり、OS環境構築差分を主目的にしない。
- Android / iOSの保証範囲、CI設計、Runner CostはPart 2で扱う。

Android Build / Install / Emulator / Maestroの開始確認は、`scripts/training/android-emulator.ps1`、Training Maestro baseline、Current Native CIの契約で固定します。Formal NativeのFlowや第二Emulator基盤は作りません。

### Android Start GateとRecovery

Windowsでは、既存のAndroid SDK / Emulator基盤をTrainingから再利用します。新しいFormal Native基盤や別のEmulatorを作りません。`ANDROID_SDK_ROOT`または`ANDROID_HOME`を設定した同じRepository Rootで、次の順に確認します。

```powershell
& .\scripts\training\android-emulator.ps1 -Action Doctor
& .\scripts\training\android-emulator.ps1 -Action Prepare
```

`Prepare`で`system-images;android-34;google_apis;x86_64`が不足している場合は、既存SDKの`sdkmanager.bat`で次を一度だけInstallしてから、`Prepare`を再実行します。SDK Rootの実Pathは各自の環境に合わせます。

```powershell
$sdkRoot = $env:ANDROID_SDK_ROOT
if (-not $sdkRoot) {
  $sdkRoot = $env:ANDROID_HOME
}
if (-not $sdkRoot) {
  throw "ANDROID_SDK_ROOT or ANDROID_HOME is required."
}
$sdkmanager = Join-Path $sdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"
& $sdkmanager "platform-tools" "emulator" "platforms;android-36" "build-tools;36.0.0" "system-images;android-34;google_apis;x86_64"
if ($LASTEXITCODE -ne 0) {
  throw "Android SDK package installation failed."
}
```

`Start`はADB ready、`sys.boot_completed=1`、Android package serviceを有限時間で確認し、`QA_TRAINING_ANDROID_SERIAL=<serial>`を出力します。次のブロックはそのserialを自動取得し、Native Release Build / Install後にTraining baselineを実行します。

```powershell
$env:EXPO_PUBLIC_APP_ENV = "automation"
$env:EXPO_PUBLIC_BUILD_KIND = "automation"
$env:EXPO_PUBLIC_TEST_MODE = "true"
$env:EXPO_PUBLIC_DEFAULT_SEED = "default"
$serial = $null
try {
  $startOutput = & .\scripts\training\android-emulator.ps1 -Action Start
  if ($LASTEXITCODE -ne 0) {
    throw "Android emulator start failed."
  }
  $serialLine = $startOutput | Where-Object { $_ -like "QA_TRAINING_ANDROID_SERIAL=*" } | Select-Object -First 1
  if (-not $serialLine) {
    throw "Android emulator did not return a Training serial."
  }
  $serial = ($serialLine.ToString() -split "=", 2)[1]
  if ([string]::IsNullOrWhiteSpace($serial)) {
    throw "Training emulator serial is empty."
  }
  $env:QA_TRAINING_ANDROID_SERIAL = $serial
  $env:ANDROID_SERIAL = $serial
  pnpm run build:native:android:release
  if ($LASTEXITCODE -ne 0) {
    throw "Android build failed."
  }
  pnpm run training:native:baseline
  if ($LASTEXITCODE -ne 0) {
    throw "Training Maestro baseline failed."
  }
} finally {
  if ([string]::IsNullOrWhiteSpace($serial)) {
    & .\scripts\training\android-emulator.ps1 -Action Stop
  } else {
    & .\scripts\training\android-emulator.ps1 -Action Stop -Serial $serial
  }
}
```

`Doctor`のTool不足はJDK 17、Android SDK、Platform Tools、MaestroのVersionとPathを確認します。`Prepare`のImage不足は上記`sdkmanager`を使い、boot timeoutは`Start`を停止して`adb devices`とEmulator logを確認してから再試行します。APK install前にMaestroを再試行せず、Build / Install / Test Control Readyを順に確認します。終了時は必ず`Stop`でTraining Emulatorを停止します。

## Lesson 1: Maestroとは

MaestroはMobile UIを操作するための自動化Toolです。

PlaywrightがBrowser PageとDOMを中心に扱うのに対し、MaestroではNativeアプリの画面とUI要素を操作します。

基本的なMaestro FlowはYAMLで記述します。

```yaml
appId: com.ryuyoshikawa.scenarioshop
---
- launchApp
- assertVisible: "Scenario Shop"
```

## Lesson 2: ActionとAssertion

代表的な操作:

- `launchApp`
- `tapOn`
- `inputText`
- `scrollUntilVisible`
- `openLink`

代表的な確認:

- `assertVisible`
- `assertNotVisible`

PlaywrightとSyntaxは異なりますが、前提状態 → 操作 → 期待結果というテスト構造は同じです。

## Lesson 3: Nativeの要素識別

NativeではDOM Locatorをそのまま使えません。

Scenario Shopではstable UI Test IDを利用します。

例:

```yaml
- tapOn:
    id: "native-nav-products"
```

UI Test IDは、自動化のためだけに無秩序に追加するのではなく、UIの意味と安定性を考えて設計します。

`CART-001` のようなTest Case IDとは役割が異なります。Test Case IDは「何をテストするか」を追跡し、UI Test IDは「どのUI要素を操作・確認するか」を特定します。

## Lesson 4: Deep Link

Nativeでは画面遷移やTest ControlにDeep Linkを利用できます。

例:

```text
scenario-shop://products/<product-id>
```

また、Test Control ResetにもDeep Linkを使用します。

Deep Linkにより、長い前段操作を毎回通らず、意図した状態や画面へ決定的に到達できます。

ただし、本来検証したいJourneyまでDeep Linkで飛ばしてしまわないようにします。

## Lesson 5: Test ControlとSeed Scenario Reset

既存Maestro Flowでは、Test Controlを使って初期状態をResetします。

例:

```text
scenario-shop://test-control/reset?version=1&scenario=default&clock=2026-07-01T03%3A00%3A00.000Z&paymentDelayMs=0
```

その後、Ready Signalを待ってから操作します。

Native Testでも、前回実行の状態へ依存しないことが重要です。

## Lesson 6: 最初のMaestro Flow

Android Emulator上で次を実装します。

1. Appを起動する。
2. Test Controlで`default` Seed ScenarioへResetする。
3. 商品一覧へ移動する。
4. 商品詳細を開く。
5. Variationを選ぶ。
6. Cartへ追加する。
7. 成功状態を確認する。

最初は既存 `native-storefront.yaml` をコピーせず、自分で最小Flowを作ります。

完成後に既存Flowと比較します。

## Lesson 7: ScrollとNative UI

Mobile UIではViewportが狭いため、対象要素が画面外にあることがあります。

`scrollUntilVisible`などを使い、「何回Swipeするか」ではなく「目的の要素が見えるまで」を基準に操作します。

これはPlaywrightで固定待機を避ける考え方と似ています。

## Lesson 8: Persistence

NativeアプリではApp Restart後の状態復元も重要です。

既存の `native-restart-persistence.yaml` を教材にし、次を考えます。

- Guest Identityは維持されるか。
- Cartは復元されるか。
- App再起動がTest Caseへ与える意味は何か。

## Lesson 9: Android / iOS

同じBusiness FlowをAndroid / iOSで確認する場合、可能なら同じMaestro Flowを利用します。

一方で、Platform固有のUIやIME、OS挙動がある場合は必要な差分だけ分けます。

「Android用とiOS用を最初から全件複製する」ことは避けます。

Part 1ではAndroidで実際に手を動かし、iOSは差分とBuild-only保証を理解するところまでを標準とします。Part 2ではGitHub Actions上のAndroid RuntimeとiOS Build-onlyを比較します。

## Lesson 10: Playwright vs Maestro

比較観点:

| 観点 | Playwright | Maestro |
| --- | --- | --- |
| 主対象 | Web Browser | Native Mobile |
| 記述 | TypeScript | YAML |
| 要素指定 | Role / Label / Locator / UI Test IDなど | Text / UI Test IDなど |
| 初期化 | Test API / Fixture / Seed Scenario | Deep Link / Test Control / Seed Scenario |
| Evidence | Trace / Screenshot / Video | Screenshot / JUnitなど |
| 実行環境 | Browser | Emulator / Simulator / Device |

どちらかへ統一することではなく、対象に適したToolを選びます。

## ハンズオン1: Native Cart Flow

Playwrightで作成したCart Test Caseのうち1件をAndroid上のMaestroへ実装します。

WebとNativeで、共通するテスト条件と異なる操作を記録します。

## ハンズオン2: Boundary Flow

在庫切れ、低在庫、購入上限のいずれかをNativeで確認します。

既存 `maestro/` のFlowと比較します。

## ハンズオン3: Restart

Cartへ商品を追加した後にAppを再起動し、状態復元を確認します。

## 発展リファレンス: iOS Build-only

`native-ios-ci.yml`を読み、Runtimeを実行したと誤認せず、Build-only Evidenceとして次を記録します。

- Flowを共用できた箇所
- Platform差が出た箇所
- iOS RuntimeをRequiredにしない理由と、iOS固有Build差分

## 確認問題

1. PlaywrightのLocatorをそのままNativeへ使えない理由は何か。
2. Stable UI Test IDのメリットと乱用Riskは何か。
3. Test Case IDとUI Test IDの違いは何か。
4. Deep Linkを使うとテストが速くなる一方、何を飛ばしすぎないよう注意すべきか。
5. Android / iOSでFlowを機械的に複製しない理由は何か。
6. PlaywrightとMaestroの共通概念を3つ挙げる。
7. Part 1でAndroidを標準経路にする理由は何か。

## 完了条件

- Android Emulator上で意味のあるMaestro Flow Evidenceを最低1本作成している。2本以上はPractice Volumeとして推奨する。
- UI Test IDを利用した操作を含む。
- Test ControlまたはDeep Linkを利用している。
- PlaywrightとMaestroで同じBusiness Flowを1件以上比較している。
- Native固有のテスト観点を1件以上説明できる。
- Test Case IDとUI Test IDを区別できる。
- Android RuntimeとiOS Build-onlyの保証差を、Current ADR / Workflowに沿って説明できる。
