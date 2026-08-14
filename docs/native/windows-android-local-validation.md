# Windows Android 実機検証 Runbook

## 1. 目的

Windows 上で Scenario Shop の Automation Release APK を生成し、USB 接続した Android 実機へインストールして、CI と同じ Maestro Flow を実行する。

対象範囲は次のとおり。

- Windows Toolchain の検査
- Windows のパス長対策
- Native Asset 生成
- Expo Prebuild
- arm64 等の実機 ABI 向け Release APK Build
- 実機 Install／起動確認
- Maestro 単体 Flow
- Runtime／Boundary Suite
- 失敗時証跡

Store 公開、Production keystore、AAB、EAS Cloud、Android Emulator は対象外とする。

## 2. 固定契約

| 項目 | 値 |
|---|---|
| Node.js | 24 |
| pnpm | 9.10.0 |
| Java | 17 |
| Android compile API | 36 |
| Android Build Tools | 36.0.0 |
| Maestro | 2.8.0 |
| Android package | `com.ryuyoshikawa.scenarioshop` |
| Deep Link scheme | `scenario-shop` |
| Windows Local Canonical route | USB-connected physical Android device with explicit serial |
| Android minimum API | `app.config.ts` の `minSdkVersion` |
| 標準 SDK Root | `C:\Android\Sdk` |
| 標準 Repository Alias | `C:\q` |
| 標準 pnpm Virtual Store | `C:\v\qts` |

Version を無断で最新化しない。CI とローカルの差分を増やさないことを優先する。

## 3. 一度だけ行うセットアップ

### 3.1 JDK 17

Temurin 等の JDK 17 をインストールし、`JAVA_HOME` と `Path` を設定する。

```powershell
java -version
javac -version
```

両方が 17 であることを確認する。

### 3.2 Android Command-line Tools

正しい配置は次のとおり。

```text
C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat
```

必要な Component を確認する。

```powershell
& "C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" `
  "--sdk_root=C:\Android\Sdk" `
  --list_installed
```

最低限必要なもの:

- `platform-tools`
- `platforms;android-36`
- `build-tools;36.0.0`
- NDK／CMake は Gradle が要求する Version を利用する

`cmdline-tools\latest-2` 警告が出る場合は、`latest` と `latest-2` の Version を確認した後、重複だけを整理する。Build の直接原因でない場合、先に Build を通す。

### 3.3 ADB と実機

Android 側で Developer options と USB debugging を有効にし、Data 通信可能な USB Cable で接続する。

```powershell
adb kill-server
adb start-server
adb devices -l
```

状態は `device` である必要がある。

- `unauthorized`: 実機を Unlock し、PC の RSA Key を許可する
- `offline`: Cable 再接続、USB Mode、ADB Server 再起動を確認する
- 表示なし: Windows Device Manager と端末 Driver を確認する

### 3.4 Maestro 2.8.0

Java 17 以上を有効にした状態で Maestro 2.8.0 をインストールし、`bin`を `Path` へ追加する。

```powershell
maestro --version
```

CI と同じ `2.8.0` を使用する。

## 4. Windows パス長対策

### 4.1 物理移動はしない

リポジトリの実体を移動せず、NTFS Junction を短い入口として使う。

```text
実体: C:\Users\<user>\Documents\qa-training-store
入口: C:\q
```

スクリプトの `Prepare` が Junction を作成し、以後の pnpm／Expo／Gradle／Maestro は `C:\q` から実行する。

既存の `C:\q` が別 Repository を指している場合、helper は安全のため `Prepare` を fail-close する。既存 Alias を上書きせず、現在 worktree だけを指す検証済みの別 Alias を用意し、全 Action へ同じ `-RepositoryAlias` を明示する。

`subst` は使用しない。React Native Autolinking 内部の `cmd` が仮想 Drive 上で失敗した実績がある。

### 4.2 pnpm Virtual Store

CMake／Ninja の Source Path を短縮するため、Virtual Store を `C:\v\qts` へ置く。

設定は PowerShell Process の環境変数として渡す。個人 PC 固有の絶対パスを `.npmrc` へコミットしない。

```text
npm_config_virtual_store_dir=C:/v/qts
npm_config_virtual_store_dir_max_length=20
```

Expo SDK 57 の `experiments.autolinkingModuleResolution` を有効にし、外部 Virtual Store でも Metro が Project の React／Native Module と一致するようにする。

### 4.3 Virtual Store 切替後の古い Native 生成状態

`C:\v\qts` へ切り替えた直後でも、`node_modules/.modules.yaml`、Package の Junction、`android/build/generated/autolinking/autolinking.json`、Native Module の `.cxx` が前回の `.pnpm-local` Path を保持することがある。`gradlew clean`／`-CleanNative`だけでは、古い Path を参照する Clean 処理自体が失敗する場合があるため、次の順序を固定する。

まず `Prepare` 後の状態を確認する。

```powershell
Get-Content node_modules\.modules.yaml |
  Select-String -Pattern 'virtualStoreDir|virtualStoreDirMaxLength'
Get-Item node_modules\react-native-nitro-modules -Force |
  Select-Object FullName,LinkType,Target
if (Test-Path android\build\generated\autolinking\autolinking.json) {
  rg -n -m 5 'pnpm-local' android\build\generated\autolinking\autolinking.json
}
```

期待値は Virtual Store が `C:/v/qts`（または同じ短い標準 Path）で、生成 Autolinking に `.pnpm-local` が残っていないことである。`rg` が一致なしで終了する場合は、出力がないことが正常である。

古い参照が残る場合だけ、Repository Alias `C:\q` から次を実行する。

```powershell
$env:CI = 'true'
$env:npm_config_virtual_store_dir = 'C:/v/qts'
$env:npm_config_virtual_store_dir_max_length = '20'
pnpm install --frozen-lockfile --virtual-store-dir=C:/v/qts
pnpm exec expo prebuild --clean --platform android --no-install
```

`pnpm-lock.yaml`、生成された `autolinking.json`、CMake Cache を手編集しない。明示的な `--virtual-store-dir` で依存関係を再リンクした後、`expo prebuild --clean`で Android と Autolinking を再生成する。再確認で古い参照が消えてから、5.3 の Build を実行する。必要な場合でも `-CleanNative` はこの再生成後にだけ使用する。

## 5. 標準コマンド

Repository Root で実行する。

### 5.1 Toolchain 検査

```powershell
pnpm run native:android:doctor
```

確認対象:

- Node 24
- pnpm 9.10.0
- Java／javac 17
- Android SDK Component
- ADB
- USB 接続実機
- Maestro 2.8.0

Windows LocalのCanonical routeでは、上記の汎用package scriptではなく、同じserialと`-RequirePhysicalDevice`を各工程へ明示する。`-RequirePhysicalDevice`はEmulator、未認証／offline、API不足、package service未ready、sleep中、lock中の端末をfail-closeする。

```powershell
$serial = "<physical-device-serial>"
$runId = "<run-id>"
adb devices -l

$helper = "scripts/native/windows/android-local.ps1"
$common = @(
  "-DeviceSerial", $serial,
  "-RequirePhysicalDevice",
  "-RunId", $runId
)

powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Doctor @common
powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Prepare @common
powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Build -Architecture Auto @common
powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Install @common
powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Smoke @common
powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Test `
  -Flow maestro/native-test-control.yaml @common

$env:QA_TRAINING_ANDROID_SERIAL = $serial
$env:TARGET_SERIAL = $serial
$env:ANDROID_SERIAL = $serial
$env:TRAINING_MAESTRO_OUTPUT_DIR = Join-Path (Get-Location) ".artifacts\native-local\$runId\maestro\training-baseline"
pnpm run training:native:baseline

powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Evidence @common
```

`$runId`はCanonical Local runの開始時に一度だけ定義する。Doctor / Prepareを含むNative helperの全Action、Training Maestroのserial環境変数、Training Maestro output directory、Evidenceは同じ`$runId`へ揃える。これにより、Native helperの`.artifacts/native-local/<run-id>/`とTraining baselineのJUnit / debug outputを同一Runとして追跡できる。

端末のAPIは`app.config.ts`の`minSdkVersion`以上である必要がある。接続可能だった端末のAPI 30を最低対応値として教材やhelperへ固定しない。ABIは`-Architecture Auto`で端末の`ro.product.cpu.abilist`から選択する。

### 5.1.1 実行前の失敗履歴と preflight

Build、Install、Test、Maestroを開始する前に、現在の会話、直近のRun `REPORT.md`、関連する過去Run、`.artifacts/native-local/<attempt>/`、`git diff`／`git status`を確認する。前回のコマンド、実行ディレクトリ、Shell、Version、環境変数、APK、終了コード、最初のエラー、派生エラー、変更後の条件、成功条件をRun Artifactへ要約する。

Android Buildを実行する場合は、同じShellの同じRepository Rootで次を実行する。`gradlew.bat`の確認だけは`android`ディレクトリで行う。

```powershell
node --version
pnpm --version
java -version
javac -version
adb version
adb devices
$env:JAVA_HOME
$env:ANDROID_HOME
$env:ANDROID_SDK_ROOT
Get-Command java
Get-Command adb
Get-Command sdkmanager -ErrorAction SilentlyContinue
Get-PSDrive -Name C | Select-Object Name, Used, Free
Push-Location android
.\gradlew.bat --version
Pop-Location
```

次も、実環境の値と固定契約（Java 17、compile API 36、Build Tools 36.0.0、実機ABI、appId `com.ryuyoshikawa.scenarioshop`、使用Build Profile）が一致するか確認する。

- Java／Gradleの互換性
- Android SDK Root、Platform、Build Tools、NDK／CMakeのインストール状態
- `adb devices` の対象端末が `device` であり、`unauthorized`／`offline` でないこと
- ホスト側と端末側の空き容量
- 既存APK／既存Packageの署名・appId競合
- 使用するAPKの出力先、生成時刻、変更を含むかどうか
- CI（API 34 x86_64 Emulator）とローカル（USB実機）のVersion／ABI／IME差

preflightで未確認・不一致・上流失敗があれば、Buildや後続Flowを開始しない。APKが生成・存在確認されていない状態でInstallやMaestroへ進まない。

#### 再実行の仮説

同一条件の再実行は、再現性確認、追加ログ取得、仮説検証、外部障害からの回復確認のいずれかを目的として、実行前に次の形式で記録する。一回の検証で変更する条件は原則一つに限定する。

```markdown
## 次の実行仮説

### 観測事実
-

### 原因仮説
1.
2.

### 最有力仮説
-

### 根拠
-

### 今回変更する条件
-

### 成功条件
-

### 失敗した場合に次に確認する情報
-
```

Cache削除、Gradle Daemon停止、`pnpm install`、`gradlew clean`、Timeout／Retry増加だけを根拠なく繰り返さない。完全ログは`.artifacts/native-local/<attempt-id>/`へ保存し、生ログを`.codex/runs/**`へ貼り付けない。`attempt-id`は実行ごとに一意にし、同じRunIdで失敗ログを上書きしない。

#### 失敗の分類と停止

失敗時は画面の最終行だけで判断せず、最初の異常を特定し、後続の`BUILD FAILED`、APK不存在、Install失敗、Maestro起動失敗を派生エラーとして分離する。次のユーザー分類を実行履歴へ付ける。

`ENVIRONMENT_FAILURE`（Java／SDK／PATH／容量／Shell）、`DEPENDENCY_FAILURE`（pnpm／Gradle／Expo／Maestro解決）、`CONFIGURATION_FAILURE`（appId／Profile／Workflow／wrapper）、`SOURCE_FAILURE`（TypeScript／Nativeコード）、`BUILD_CACHE_FAILURE`（古い生成物／Cache／Autolinking参照）、`DEVICE_FAILURE`（ADB／実機／IME／Install／端末容量）、`TEST_FAILURE`（起動後のAssertion／Flow）、`TRANSIENT_FAILURE`（外部障害を証拠で確認できた場合のみ）、`UNKNOWN`（証拠不足）。

同一エラーが2回連続、異なる対応後も最初のエラー不変、同じ工程で3回失敗、Cache処置後も変化なし、新しいログなし、環境未把握、APKなしの後続実行、説明可能な仮説なしのいずれかなら、再実行を止めて事実・仮説・不足情報・次の最小切り分け・変更変数・成功条件を更新する。上流工程が失敗した場合は後続工程を実行しない。

### 5.2 依存関係・Prebuild

```powershell
pnpm run native:android:prepare
```

実施内容:

- `C:\q` Junction 作成／検証
- `C:\v\qts` 作成
- `pnpm install --frozen-lockfile`
- Native Asset 生成・検証
- Native Route 依存検証
- `expo prebuild --clean --platform android --no-install`
- `android/local.properties` 生成

`android/` は CNG の生成物であり Repository へ追加しない。`--clean` は古い絶対 CMake Path を再利用しないために使用する。

`Prepare` が成功しても、4.3 の確認で `.pnpm-local` が残っていれば Build へ進まず、4.3 の復旧分岐を実行する。

### 5.2.1 Build 前のディスク容量

Release APK Buildは、Virtual Store、Gradle Cache、CMake／Ninja中間生成物、APKを同時に保持する。Build前にシステムドライブの空き容量を確認し、10GB未満の場合はBuildを開始しない。

```powershell
Get-PSDrive -Name C | Select-Object Name, Used, Free
```

`MergeNativeLibsTask` または `copyReleaseJniLibsProjectOnly` がNative `.so` のコピー中に失敗し、Windows例外が文字化けしている場合でも、まず空き容量を確認する。ホスト容量不足は`ENVIRONMENT_FAILURE`（既存Runの細分類: `SETUP_FAILURE`）と分類し、容量を確保して条件を記録した後のBuild再実行は1回に限定する。CacheやVirtual Storeの削除・移動はAIエージェントが自動実行せず、ユーザーが対象と再生成可否を確認してから行う。

### 5.3 Release APK Build

実機を接続した状態で実行する。

```powershell
pnpm run native:android:build:local
```

スクリプトは `ro.product.cpu.abilist` から ABI を判定し、8GB 環境を考慮して次の設定で Build する。

```text
:app:assembleRelease
-PreactNativeArchitectures=<device ABI>
--no-daemon
--max-workers=1
--build-cache
--stacktrace
```

出力:

```text
android\app\build\outputs\apk\release\app-release.apk
```

成功条件:

- APK が存在し、空でない
- JavaScript Bundle または Hermes Bytecode を含む
- 実機 ABI の `.so` を含む
- SHA-256 とサイズを `.artifacts` へ保存する

Native Cache を明示的に消したい場合:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action Build `
  -CleanNative
```

Virtual Store 切替後の古い Autolinking／CMake 参照を直す目的で、最初に `-CleanNative` だけを実行しない。古い参照が残っていると `gradlew clean` 自体が同じ CMake／Ninja エラーで失敗することがある。4.3 の依存再リンクと `expo prebuild --clean` を先に完了させる。

常時 Clean Build にしない。AI エージェントが修正確認を繰り返す場合は Build Cache を再利用する。

### 5.4 実機 Install と起動確認

```powershell
pnpm run native:android:install:local
pnpm run native:android:smoke:local
```

`Install` は `adb install -r`、Package Path 確認を行う。`Smoke` は Launcher 起動、PID 維持、logcat の致命的 Error を確認する。

`INSTALL_FAILED_UPDATE_INCOMPATIBLE` の場合、既存アプリと署名が異なる。データ消失を理解したうえで、手動で削除してから再 Install する。

```powershell
adb uninstall com.ryuyoshikawa.scenarioshop
pnpm run native:android:install:local
```

スクリプトはデータ消失を伴う Uninstall を自動実行しない。

## 6. Maestro Gate

### Gate 1: 単体 Flow

```powershell
pnpm run native:android:test:control
```

対象:

```text
maestro/native-test-control.yaml
```

単体 Flow が失敗した場合、他の Flow を実行しない。失敗時は自動で証跡を収集する。

Gate 1 の確認内容:

1. `clearState: true` で起動
2. `Scenario Shop` 表示
3. `Native test runtime listening` 表示
4. Reset Deep Link
5. `Native test runtime ready` 表示
6. Screenshot

画面上に Text が見えていても、Maestro Accessibility Hierarchy で `visible` でなければ失敗である。

ScrollViewの下端に表示される成功メッセージや操作結果を確認する場合は、画面外の文字列へ直接`extendedWaitUntil`を行わない。表示要素へstableな`testID`を付け、`scrollUntilVisible`で可視領域へ移動してからIDをassertする。次の操作対象が上側へ移動した場合は、対象IDを`direction: UP`で再表示してからtapする。文字列assertionの削除、固定Sleep、Flow skipでこの状態を隠さない。

### Gate 2: Runtime／Smoke 5 Flow

```powershell
pnpm run native:android:test:runtime
```

- `native-test-control.yaml`
- `native-contract-harness.yaml`
- `native-not-found.yaml`
- `native-storefront.yaml`
- `native-cart.yaml`

主要RuntimeのStorefront／Cartは、既知商品のProduct Deep Linkから商品詳細へ遷移する。検索欄の入力状態に依存しない。

### Gate 2.5: Search Input 1 Flow（独立実行）

検索入力自体のカバレッジは、主要Runtime／Boundaryの分母へ混ぜず、次のFlowで独立して確認する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action Test `
  -Flow maestro/native-search.yaml `
  -RunId yyyyMMdd-HHmmss
```

`native-search.yaml`は`P-0001`を入力して商品カードを検出し、カードをタップして商品詳細画面を確認するため、物理端末の標準日本語IMEがASCII入力を保持しない場合は、その端末条件でPASSと扱わない。必要時は元のIMEと有効IME一覧を先に記録し、LatinIME等を一時的に有効化・選択してFlowを実行し、終了後に必ず元へ復元する。IME切替は検索専用Flowの実行条件であり、主要Runtime／Boundary Flowへ検索入力を戻す理由にはしない。

### Gate 3: Persistence／Boundary 5 Flow

```powershell
pnpm run native:android:test:boundary
```

CIでは5 Flowを個別Stepとして実行する。ローカルで原因をFlow単位に切り分ける場合も、次のように同じ`Test`入口へ1 Flowずつ渡す。`Test`はFlowファイル名をMaestro出力名へ使うため、JUnit、Screenshot、Hierarchy、Maestro Outputを上書きしない。

```powershell
$runId = Get-Date -Format yyyyMMdd-HHmmss
foreach ($flow in @(
  'maestro/native-restart-persistence.yaml',
  'maestro/native-reset-dirty-state.yaml',
  'maestro/native-out-of-stock.yaml',
  'maestro/native-low-stock.yaml',
  'maestro/native-purchase-limit.yaml'
)) {
  powershell -NoProfile -ExecutionPolicy Bypass `
    -File scripts/native/windows/android-local.ps1 `
    -Action Test `
    -Flow $flow `
    -RunId $runId
  if ($LASTEXITCODE -ne 0) { break }
}
```

再起動Flowは初回の`launchApp clearState: true`だけで状態を初期化し、`stopApp`後の`launchApp`ではStorageを消去しない。Cart画面ではhydration完了ID、badge count、商品・variant由来のCart item IDとquantity ID、および数量値を確認する。失敗時は最後に成功したcheckpointのScreenshotと、`if: always()`相当で回収したMaestro Output／Hierarchy／JUnit／logcatを原因分類に使う。assertion削除、固定Sleep追加、Flow skipでPASS扱いにしない。

- `native-restart-persistence.yaml`
- `native-reset-dirty-state.yaml`
- `native-out-of-stock.yaml`
- `native-low-stock.yaml`
- `native-purchase-limit.yaml`

### Gate 4: Customer Purchase／Review 2 Flow

Phase 2後半の会員購入経路は、単体Flowを分けて実行する。各Flowは自分のSeed ScenarioをResetするため、前のFlowのアプリ状態を成功条件にしない。

```powershell
$runId = Get-Date -Format yyyyMMdd-HHmmss
foreach ($flow in @(
  'maestro/native-purchase.yaml',
  'maestro/native-review.yaml'
)) {
  powershell -NoProfile -ExecutionPolicy Bypass `
    -File scripts/native/windows/android-local.ps1 `
    -Action Test `
    -Flow $flow `
    -RunId $runId
  if ($LASTEXITCODE -ne 0) { break }
}
```

`native-purchase.yaml` は regular customer のLogin、Cart確認、Address／Payment、Order成功、Orders一覧を確認する。`native-review.yaml` は `reviewable-orders` Scenarioで delivered Order ItemのReview投稿を確認する。購入Flowが失敗した場合はReview Flowへ進まず、最初のFailure Evidenceを調査する。

Node `node:sqlite`のRepository／Application ContractがPASSしていても、Androidの実`expo-sqlite`、端末Install、Maestro操作をPASS扱いにしない。iOSはこのWindows Runbookの対象外であり、macOS Reusable WorkflowのBuild／Runtime結果を別に記録する。

### Setup から Gate 1 まで一括

```powershell
pnpm run native:android:all
```

`All` は Gate 1 で停止する。Gate 1 成功後に RuntimeSuite と BoundarySuite を別々に実行する。

## 7. 証跡と共有用成果物

### 7.1 実行証跡

標準実行証跡の出力先:

```text
.artifacts/native-local/<timestamp>/
├─ environment/
├─ build/
├─ install/
├─ maestro/
└─ evidence/
```

含めるもの:

- Tool と Version
- Gradle Build Log
- APK Path／Size／SHA-256／ABI
- ADB Install／起動 Log
- Maestro Log／JUnit／Test Output
- 端末 Screenshot
- UIAutomator XML
- Maestro Hierarchy
- logcat
- dumpsys activity／package

`.artifacts/` は Repository へ追加しない。共有するときは秘密情報、Device Serial、個人 Path を確認する。

手動取得:

```powershell
pnpm run native:android:evidence
```

### 7.2 モバイルネイティブの共有用テスト成果物

人が確認・共有するスクリーンショット、比較画像、選定した画面証跡は、必ず次へ保存する。

```text
output/mobile-native/
```

例:

```text
output/mobile-native/native-storefront-cart-added.png
```

リポジトリ直下へ `native-*.png` などを置かない。同一シナリオを繰り返す場合は、シナリオ名・検証段階・Run ID または JST timestamp をファイル名またはサブディレクトリへ含め、既存成果物を上書きしない。

`.artifacts/native-local/<timestamp>/` は Maestro／ADB／Gradle のログ、JUnit、Hierarchy、APK 情報など、実行ごとの機械証跡に限定する。`output/mobile-native/` は共有・確認用、`.artifacts/` は実行証跡として使い分ける。`output/` は既に Git 管理外なので、個別の ignore 追加や `.gitkeep` は不要である。

## 8. AI エージェントの停止条件

AI エージェントは次に従う。

- 最初に `Doctor`
- Build 済み APK が現在の変更を含む場合、不要な Build を繰り返さない
- Maestro は単体 Flow から開始する
- 最初の失敗で停止し、証跡を読む
- Screenshot と Hierarchy を比較する
- Timeout 延長、Assertion 削除、Flow Skip、CI Allow failure だけで成功扱いにしない
- App 修正後は同じ Flow を再実行する
- Buildが容量不足で失敗した場合は、空き容量を確保してから同じBuildを1回だけ再実行する。容量不足のまま無制限に再試行しない
- 新しいBuild／Install／Test／Maestroの前に、直近Run、失敗ログ、変更差分、成功条件を確認し、attempt-idと目的を記録する
- 同一条件の再実行は、再現性確認、追加ログ取得、仮説検証、外部障害からの回復確認のいずれかに限定する
- 失敗時は最初のエラー、派生エラー、分類、変更条件、成功条件を記録し、上流失敗後の後続工程を実行しない
- 同一エラー2回連続、同じ工程3回失敗、ログに新情報がない場合は停止して調査へ戻る
- 生ログは`.artifacts/native-local/<attempt-id>/`へ保存し、同じRunIdのログを上書きしない
- 単体成功後だけ 5 Flow＋5 Flow を実行する
- 検索入力の確認はGate 2.5の専用Flowとして、主要Suiteとは別のIME条件で実行する
- 未実行を PASS と書かない
- Git 操作はユーザーの明示依頼がない限り行わない

## 9. 完了条件

- Doctor PASS
- Prepare PASS
- Release APK Build PASS
- APK Bundle／ABI 検査 PASS
- 実機 Install PASS
- 起動安定性 PASS
- `native-test-control.yaml` PASS
- Runtime 5 Flow PASS
- Boundary 5 Flow PASS
- 証跡保存

Build 成功だけでは Native 実機検証完了ではない。

### 9.1 2026-08-08 現行ソースの完了例

現行ソースでProductionを検証する場合は、Automation APKとProduction APKを混同しない。Production envで`:app:createBundleReleaseJsAndAssets --rerun-tasks`だけを実行した後、通常の`:app:assembleRelease --build-cache --parallel`を実行し、APK内のJS bundle、ABI、Automation／Harness／Test Control marker不在を確認する。続いてProduction APKを実機へInstallし、Smokeと`maestro/native-production-validation.yaml`を実行する。

今回の証跡は`.artifacts/native-local/20260808-221600-android-current-production-targeted/`、Install／Smoke／Maestroはそれぞれ`20260808-222000`〜`20260808-222300`である。iOS Simulator／Remote CIの結果はこのWindows RunbookのPASSには含めない。
