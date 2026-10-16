# Windows Android 実機検証 Runbook

## 1. 目的

Windows 上で Scenario Shop の Automation Release APK をビルドし、USB 接続した Android 実機へインストールして、CI と同様の Maestro フローを実行する。

対象範囲は以下のとおり。

- Windows ツールチェーンの検証
- Windows のパス長制限対策
- ネイティブアセットの生成
- Expo Prebuild
- arm64 等の実機 ABI 向け Release APK ビルド
- 実機へのインストールおよび起動確認
- Maestro 単体テストフロー
- Runtime／Boundary テストスイート
- 失敗時の証跡収集

なお、ストア公開、本番用キーストア（Production keystore）、AAB 形式、EAS Cloud、Android エミュレータは対象外とする。

## 2. 固定契約

| 項目 | 値 |
|---|---|
| Node.js | 24 |
| pnpm | 10.34.5 |
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

各ツールのバージョンを無断で更新（最新化）してはならない。CI 環境とローカル環境の差分を増やさないことを最優先とする。

## 3. 一度だけ行うセットアップ

### 3.1 JDK 17

Temurin 等の JDK 17 をインストールし、環境変数 `JAVA_HOME` および `Path` を設定する。

```powershell
java -version
javac -version
```

双方がバージョン 17 であることを確認する。

### 3.2 Android Command-line Tools

正しい配置先は以下のとおりである。

```text
C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat
```

必要なコンポーネントを確認する。

```powershell
& "C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" `
  "--sdk_root=C:\Android\Sdk" `
  --list_installed
```

最低限必要なもの:

- `platform-tools`
- `platforms;android-36`
- `build-tools;36.0.0`
- NDK および CMake は Gradle が要求するバージョンを使用する

`cmdline-tools\latest-2` の警告が表示される場合は、`latest` と `latest-2` のバージョンを確認したうえで重複分のみを整理する。ビルド失敗の直接の原因でない場合は、先にビルドを通すことを優先する。

### 3.3 ADB と実機

Android 端末側で「開発者向けオプション」と「USB デバッグ」を有効化し、データ通信に対応した USB ケーブルで接続する。

```powershell
adb kill-server
adb start-server
adb devices -l
```

接続状態が `device` と認識されている必要がある。

- `unauthorized`: 実機の画面ロックを解除し、PC からの RSA キー接続を許可する
- `offline`: ケーブルの再接続、USB 接続モードの設定、ADB サーバーの再起動を確認する
- 端末が表示されない場合: Windows のデバイス マネージャーおよび端末の USB ドライバーを確認する

### 3.4 Maestro 2.8.0

Java 17 以上が有効な状態で Maestro 2.8.0 をインストールし、`bin` ディレクトリを環境変数 `Path` へ追加する。

```powershell
maestro --version
```

CI 環境と同一のバージョン `2.8.0` を使用する。

## 4. Windows パス長対策

### 4.1 物理移動はしない

リポジトリの実体を移動せず、NTFS ジャンクション（Junction）を短いアクセス経路として利用する。

```text
実体: C:\Users\<user>\Documents\qa-training-store
入口: C:\q
```

スクリプトの `Prepare` アクションがジャンクションを作成し、以後の pnpm、Expo、Gradle、Maestro の各コマンドは `C:\q` から実行する。

既存の `C:\q` が別のリポジトリを指している場合、ヘルパースクリプトは安全確保のため `Prepare` を fail-close（安全側に倒して処理を中断）する。既存のエントリを上書きせず、現在のワークツリーのみを指す検証済みの別エイリアスを用意したうえで、すべてのアクションに対して同一の `-RepositoryAlias` を明示的に指定する。

`subst` コマンドは使用しない。React Native Autolinking の内部で実行される `cmd` が仮想ドライブ上で失敗した実績があるためである。

### 4.2 pnpm Virtual Store

CMake および Ninja のソースパス長を短縮するため、Virtual Store を `C:\v\qts` に配置する。

この設定は PowerShell プロセスの環境変数として渡す。個人 PC 固有の絶対パスをリポジトリの `.npmrc` にコミットしてはならない。

```text
npm_config_virtual_store_dir=C:/v/qts
npm_config_virtual_store_dir_max_length=20
```

Expo SDK 57 の `experiments.autolinkingModuleResolution` を有効化し、外部 Virtual Store を使用している場合でも、Metro がプロジェクト側の React およびネイティブモジュールと整合するように設定する。

### 4.3 Virtual Store 切替後の古い Native 生成状態

`C:\v\qts` へ切り替えた直後であっても、`node_modules/.modules.yaml`、パッケージのジャンクション、`android/build/generated/autolinking/autolinking.json`、ネイティブモジュールの `.cxx` ファイルなどに、前回使用した `.pnpm-local` のパス参照が残存することがある。この状態で `gradlew clean` や `-CleanNative` を実行しても、古いパスを参照するクリーン処理自体が失敗する場合があるため、以下の確認と復旧手順を厳守する。

まず `Prepare` 実行後の状態を確認する。

```powershell
Get-Content node_modules\.modules.yaml |
  Select-String -Pattern 'virtualStoreDir|virtualStoreDirMaxLength'
Get-Item node_modules\react-native-nitro-modules -Force |
  Select-Object FullName,LinkType,Target
if (Test-Path android\build\generated\autolinking\autolinking.json) {
  rg -n -m 5 'pnpm-local' android\build\generated\autolinking\autolinking.json
}
```

期待される状態は、Virtual Store が `C:/v/qts`（または同一の短い標準パス）に設定され、生成された Autolinking ファイル内に `.pnpm-local` の参照が残っていないことである。`rg` コマンドで一致する文字列がなく終了（出力なし）すれば正常である。

古い参照が残っている場合にのみ、リポジトリエイリアス `C:\q` から以下を実行する。

```powershell
$env:CI = 'true'
$env:npm_config_virtual_store_dir = 'C:/v/qts'
$env:npm_config_virtual_store_dir_max_length = '20'
pnpm install --frozen-lockfile --virtual-store-dir=C:/v/qts
pnpm exec expo prebuild --clean --platform android --no-install
```

`pnpm-lock.yaml`、生成された `autolinking.json`、および CMake キャッシュを手動で直接編集してはならない。`--virtual-store-dir` を明示して依存関係を再リンクしたうえで、`expo prebuild --clean` により Android プロジェクトおよび Autolinking 設定を再生成する。再確認で古い参照が完全に解消されたことを確認してから、5.3 節のビルドを実行する。なお、`-CleanNative` が必要な場合であっても、必ずこの再生成処理の完了後にのみ使用する。

## 5. 標準コマンド

リポジトリのルートディレクトリで実行する。

### 5.1 Toolchain 検査

```powershell
pnpm run native:android:doctor
```

確認対象:

- Node 24
- pnpm 10.34.5
- Java／javac 17
- Android SDK コンポーネント
- ADB
- USB 接続された実機端末
- Maestro 2.8.0

Windows ローカル環境の標準的な検証手順（Canonical route）では、上記の汎用パッケージスクリプトを使用せず、各工程に同一のシリアル番号と `-RequirePhysicalDevice` を明示して実行する。`-RequirePhysicalDevice` は、エミュレータ、未認証／オフライン、API レベル不足、パッケージサービス未起動、スリープ中、または画面ロック中の端末を検知した場合に、安全側に倒して処理を中断（fail-close）する。

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

# 初回、またはネイティブプロジェクトの再生成が必要な場合にのみ実行する。
powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Prepare @common

# 現在利用可能な Release APK がない場合、または現在の変更を含まない場合にのみ実行する。
powershell -NoProfile -ExecutionPolicy Bypass -File $helper -Action Build -Architecture Auto @common

# 最新の有効な Release APK を再利用できる場合は、上記の Prepare／Build を省略して APK の検査へ進む。
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

`$runId` は、ローカル検証の開始時に一度だけ定義する。Doctor や Prepare を含むネイティブ用ヘルパースクリプトの全アクション、Training Maestro 用のシリアル環境変数、Training Maestro の出力ディレクトリ、および Evidence の収集先をすべて同一の `$runId` に統一する。これにより、ヘルパースクリプトが出力する `.artifacts/native-local/<run-id>/` と、Training baseline の JUnit レポートおよびデバッグ出力を、同一の実行記録（Run）として正確に追跡できる。

対象端末の API レベルは、`app.config.ts` の `minSdkVersion` 以上である必要がある。過去に接続実績のある特定端末の API 30 などを、教材やヘルパースクリプトの最低動作要件として固定（ハードコード）してはならない。ABI は `-Architecture Auto` を指定し、端末の `ro.product.cpu.abilist` から自動判別させる。

### 5.1.1 実行前の失敗履歴と preflight

ビルド、インストール、テスト、および Maestro の実行を開始する前に、現在のコンテキスト、直近の実行記録 `REPORT.md`、関連する過去の Run、`.artifacts/native-local/<attempt>/`、ならびに `git diff` や `git status` を確認する。前回の実行コマンド、作業ディレクトリ、シェル種別、各ツールのバージョン、環境変数、APK の状態、終了コード、最初に発生したエラー、派生したエラー、変更後の前提条件、および成功判定基準を Run Artifact へ要約して整理する。

Android のビルドを実行する場合は、同一シェルの同一リポジトリルート上で以下を実行して確認する。ただし、`gradlew.bat` の確認のみ `android` ディレクトリに移動して行う。

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

併せて、実際の環境値が第2節の固定契約（Java 17、compile API 36、Build Tools 36.0.0、実機の ABI、アプリケーション ID `com.ryuyoshikawa.scenarioshop`、対象のビルドプロファイル）と合致しているか、以下の項目を確認する。

- Java と Gradle の互換性
- Android SDK Root、プラットフォーム、Build Tools、NDK／CMake の導入状況
- `adb devices` で対象端末が `device` として認識されており、`unauthorized` や `offline` になっていないこと
- ホスト PC および実機端末の空きディスク容量
- 端末内にインストール済みの APK や既存パッケージとの署名・アプリケーション ID（appId）の競合有無
- 使用する APK の出力先、生成日時、および直近の変更内容が反映されているか
- CI 環境（API 34 x86_64 エミュレータ）とローカル環境（USB 接続実機）との間におけるバージョン、ABI、および IME の差異

事前検証（preflight）で未確認の項目、契約との不一致、あるいは上流工程の失敗がある場合は、ビルドや後続フローを開始してはならない。また、APK の正常な生成および存在が確認できていない段階で、インストールや Maestro テストへ進んではならない。

#### 再実行・失敗・停止の共通契約

リトライ、失敗の分類、証跡の記録、実行の中断、および完了判定に関する一般的なルールは、パッケージローカルの [`windows-android-workflow.md`](../../.agents/skills/android-native-local-validation/references/windows-android-workflow.md) を正本とする。以下の節では、当リポジトリ固有のツールチェーン、パス、コマンド、接続端末、テストフロー、および成果物マッピングのみを規定する。

### 5.2 依存関係・Prebuild

初回セットアップ時、またはネイティブプロジェクトの再生成が必要な場合にのみ `Prepare` を実行する。すでに有効な準備済みプロジェクトが存在し再利用できる場合は、本工程をスキップする。

```powershell
pnpm run native:android:prepare
```

実施内容:

- `C:\q` ジャンクションの作成および検証
- `C:\v\qts` の作成
- `pnpm install --frozen-lockfile` の実行
- ネイティブアセットの生成および検証
- ネイティブルーティングの依存関係検証
- `expo prebuild --clean --platform android --no-install` の実行
- `android/local.properties` の生成

`android/` ディレクトリは Expo Prebuild（CNG: Continuous Native Generation）による自動生成物のため、Git リポジトリへコミットしてはならない。`--clean` オプションは、過去に生成された絶対パス形式の CMake 設定がキャッシュとして残るのを防ぎ、再利用させないために使用する。

`Prepare` が正常終了した場合でも、4.3 節の確認手順で `.pnpm-local` のパス参照が残存している場合はビルドに進まず、4.3 節に記載したリカバリー手順を実行する。

### 5.2.1 Build 前のディスク容量

Release APK のビルド時には、Virtual Store、Gradle キャッシュ、CMake および Ninja の中間生成物、生成された APK ファイルが同時にストレージを消費する。ビルド開始前に必ずシステムドライブの空き容量を確認し、10GB 未満の場合はビルドを開始してはならない。

```powershell
Get-PSDrive -Name C | Select-Object Name, Used, Free
```

`MergeNativeLibsTask` や `copyReleaseJniLibsProjectOnly` がネイティブの `.so` ファイルのコピー中に失敗し、Windows の例外メッセージが文字化けしている場合であっても、まずは空き容量を確認する。ホスト PC のディスク容量不足に起因する失敗は `ENVIRONMENT_FAILURE`（過去の実行記録における細分類: `SETUP_FAILURE`）として分類し、空き容量を十分に確保したうえで実行条件を記録し、ビルドの再実行は 1 回のみに限定する。なお、キャッシュや Virtual Store の削除・移動といったクリーンアップ操作を AI エージェントが自律的に実行してはならない。必ずユーザー自身が削除対象と再生成の可否を確認したうえで実施する。

### 5.3 Release APK Build

現在利用可能な Release APK が存在しない場合、あるいは現在の変更内容が反映されていない場合に、実機端末を接続した状態で実行する。有効な最新の Release APK を再利用できる場合はビルドを省略し、APK の検証へ進む。

```powershell
pnpm run native:android:build:local
```

ヘルパースクリプトは端末の `ro.product.cpu.abilist` から適切な ABI を判定し、メモリ 8GB の実行環境を考慮して以下の設定でビルドを行う。

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

- APK ファイルが存在し、ファイルサイズが 0 でないこと
- JavaScript Bundle または Hermes Bytecode が含まれていること
- 実機端末の ABI に対応する `.so` ファイルが含まれていること
- SHA-256 ハッシュ値およびファイルサイズが `.artifacts` 配下に保存されていること

ネイティブキャッシュを明示的にクリアしてビルドしたい場合:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action Build `
  -CleanNative
```

Virtual Store の切り替えに伴う古い Autolinking や CMake の参照不整合を解消する目的で、最初から `-CleanNative` だけを実行してはならない。古い参照が残っていると、`gradlew clean` 自体が同一の CMake／Ninja エラーで失敗することがあるためである。必ず 4.3 節の依存関係の再リンクと `expo prebuild --clean` を先に完了させること。

また、毎回のビルドを無条件でクリーンビルドにしてはならない。AI エージェントが修正確認を反復する場合は、ビルドキャッシュを再利用する。

### 5.4 実機 Install と起動確認

```powershell
pnpm run native:android:install:local
pnpm run native:android:smoke:local
```

`Install` タスクでは `adb install -r` による上書きインストールおよびパッケージパスの検証を行う。`Smoke` タスクではランチャーからの起動、プロセス ID（PID）の生存維持、および logcat 上の致命的なエラー（クラッシュ）の有無を確認する。

`INSTALL_FAILED_UPDATE_INCOMPATIBLE` エラーが発生した場合は、実機上の既存アプリと署名が異なっていることを意味する。アプリ内データが消失することを理解したうえで、手動でアンインストールしてから再度インストールを実行する。

```powershell
adb uninstall com.ryuyoshikawa.scenarioshop
pnpm run native:android:install:local
```

スクリプト側でデータ消失を伴うアンインストールを自動実行することはない。

## 6. Maestro Gate

### Gate 1: 単体 Flow

```powershell
pnpm run native:android:test:control
```

対象:

```text
maestro/native-test-control.yaml
```

単体テストフローが失敗した場合は、後続の他のフローを実行してはならない。失敗時は自動的に障害証跡が収集される。

Gate 1 の確認内容:

1. `clearState: true`（アプリ状態の初期化）による起動
2. `Scenario Shop` の表示確認
3. `Native test runtime listening` の表示確認
4. リセット用ディープリンクの発火
5. `Native test runtime ready` の表示確認
6. スクリーンショットの取得

画面上に肉眼でテキストが見えていたとしても、Maestro のアクセシビリティ階層（Accessibility Hierarchy）上で `visible` と判定されていなければ失敗とみなす。

ScrollView の下端に表示される完了メッセージや操作結果を検証する際は、画面外の文字列に対して直接 `extendedWaitUntil` を実行してはならない。検証対象の要素に一意かつ安定した（stable な）`testID` を付与し、`scrollUntilVisible` を用いて可視領域へスクロール移動させてから ID のアサーションを行うこと。また、次の操作対象が画面上方にスクロールアウトした場合は、該当の ID 要素を `direction: UP` で画面内に再表示させてからタップ操作を行う。文字列アサーションの削除や、固定秒数の Sleep 挿入、あるいはフロー自体のスキップによって問題を隠蔽してはならない。

### Gate 2: Runtime／Smoke 5 Flow

```powershell
pnpm run native:android:test:runtime
```

- `native-test-control.yaml`
- `native-contract-harness.yaml`
- `native-not-found.yaml`
- `native-storefront.yaml`
- `native-cart.yaml`

主要ランタイムの Storefront および Cart テストでは、既知商品の Product Deep Link から商品詳細画面へ直接遷移する。これにより、検索フォームの入力状態に依存しない安定した検証を担保する。

### Gate 2.5: Search Input 1 Flow（独立実行）

検索入力機能自体のテストカバレッジは、主要ランタイムやバウンダリのテストスイートには混入させず、以下のフローとして独立して検証する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action Test `
  -Flow maestro/native-search.yaml `
  -RunId yyyyMMdd-HHmmss
```

`native-search.yaml` は、検索欄に `P-0001` を入力して該当商品カードを特定し、カードをタップして商品詳細画面への遷移を確認する。そのため、物理端末の標準日本語 IME の変換状態によって ASCII 入力が保持されないような環境では、その端末条件下での結果を PASS として扱ってはならない。必要な場合は、あらかじめ元の IME 設定および有効化されている IME の一覧を記録したうえで、LatinIME 等を一時的に有効化・選択してフローを実行し、テスト終了後に必ず元の設定へと復元すること。なお、IME の切り替えはあくまで本検索専用フローを実行するための前提条件であり、主要ランタイムやバウンダリのテストフローに検索フォーム経由の画面遷移を逆戻りさせる理由にしてはならない。

### Gate 3: Persistence／Boundary 5 Flow

```powershell
pnpm run native:android:test:boundary
```

CI 環境ではこれら 5 つのフローを個別のステップとして実行している。ローカル検証で不具合の原因をフロー単位で切り分ける場合も、以下のように同一の `Test` エントリーに対して 1 フローずつ渡して実行する。`Test` アクションはフローファイル名を Maestro の出力ファイル名に採用するため、JUnit レポート、スクリーンショット、アクセシビリティ階層（Hierarchy）、および Maestro の標準出力ログが互いに上書きされることはない。

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

再起動を伴うフローでは、初回の `launchApp clearState: true` でのみアプリ状態を初期化し、その後の `stopApp` を経た再度の `launchApp` ではストレージ（Storage）領域を消去してはならない。カート画面の検証では、状態復元（hydration）完了を示す ID、バッジカウント（badge count）、商品およびバリアント情報に紐づくカートアイテム ID と数量指定用 ID、ならびに実際の数量値を確認する。失敗が発生した場合は、直前に成功したチェックポイント（checkpoint）のスクリーンショットに加え、CI の `if: always()` 相当の処理で収集した Maestro 出力ログ、Hierarchy ツリー、JUnit レポート、および logcat を原因分析に使用する。アサーションの削除や、固定秒数の Sleep 追加、あるいはフロースキップによって PASS 扱いに偽装してはならない。

- `native-restart-persistence.yaml`
- `native-reset-dirty-state.yaml`
- `native-out-of-stock.yaml`
- `native-low-stock.yaml`
- `native-purchase-limit.yaml`

### Gate 4: Customer Purchase／Review 2 Flow

Phase 2 後半で追加された一般会員向け購入導線は、単体フローを分割して実行する。各フローは実行冒頭で自身に必要なシードシナリオ（Seed Scenario）を初期化（Reset）するため、先行するフローの終了時状態を前提条件（成功条件）として依存させてはならない。

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

`native-purchase.yaml` では、一般会員（regular customer）のログイン、カート内容の確認、配送先住所および決済情報の入力、注文完了、ならびに注文履歴一覧画面への反映を確認する。一方、`native-review.yaml` では `reviewable-orders` シナリオを用いて、配達完了済み注文商品（delivered Order Item）に対するレビュー投稿処理を確認する。購入フローが失敗した場合はレビューフローへ進まず、最初に発生した失敗の証跡調査に注力すること。

Node 環境上の `node:sqlite` を用いたリポジトリ層・アプリケーション層の契約テスト（Contract Test）が PASS しているからといって、Android 実機上の `expo-sqlite` の挙動、実機へのインストール、および Maestro による画面操作まで PASS したとみなしてはならない。また、iOS 環境は本 Windows 用ランブックのスコープ外であるため、macOS 用再利用可能ワークフロー（Reusable Workflow）におけるビルドおよびランタイム検証結果を別途記録すること。

### Setup から Gate 1 まで一括

```powershell
pnpm run native:android:all
```

`All` タスクは Gate 1 の完了時点で意図的に停止する。Gate 1 の成功を確認した後に、RuntimeSuite と BoundarySuite を個別に実行すること。

## 7. 証跡と共有用成果物

### 7.1 実行証跡

標準的な実行証跡の出力先:

```text
.artifacts/native-local/<timestamp>/
├─ environment/
├─ build/
├─ install/
├─ maestro/
└─ evidence/
```

記録対象:

- 各種ツールの名称とバージョン
- Gradle ビルドログ
- 生成 APK のパス／ファイルサイズ／SHA-256 ハッシュ値／対象 ABI
- ADB によるインストールおよび起動ログ
- Maestro の実行ログ／JUnit レポート／テスト出力
- 端末のスクリーンショット
- UIAutomator XML ダンプ
- Maestro アクセシビリティ階層（Hierarchy）
- logcat ログ
- `dumpsys activity` および `dumpsys package` の出力結果

`.artifacts/` ディレクトリはリポジトリの Git 管理下に含めない。共有する際は、機密情報、端末シリアル番号、個人環境固有の絶対パスが含まれていないか事前に確認すること。

手動取得:

```powershell
pnpm run native:android:evidence
```

### 7.2 モバイルネイティブの共有用テスト成果物

人間が目視で確認・共有するためのスクリーンショット、比較画像、および選定した主要画面の証跡は、必ず以下のディレクトリに保存する。

```text
output/mobile-native/
```

例:

```text
output/mobile-native/native-storefront-cart-added.png
```

リポジトリ直下に `native-*.png` などの画像ファイルを直接配置してはならない。同一のテストシナリオを複数回検証する場合は、シナリオ名、検証フェーズ、Run ID、または日本標準時（JST）のタイムスタンプをファイル名やサブディレクトリ名に含め、既存の成果物を上書きしないよう配慮する。

`.artifacts/native-local/<timestamp>/` は、Maestro、ADB、Gradle の各種ログ、JUnit レポート、Hierarchy ツリー、APK メタデータなど、各実行における機械的な検証ログ・証跡の保存に限定する。一方で、`output/mobile-native/` はチーム内での共有・確認用、`.artifacts/` は実行証跡として使い分ける。なお、`output/` ディレクトリはすでに全体として Git の追跡対象外となっているため、個別の除外指定追加や `.gitkeep` ファイルの配置は不要である。

## 8. AI エージェント実行判断の参照

一般的なリトライ、失敗の分類、証跡収集、処理の停止、および完了判定に関する判断基準は、パッケージローカルの [`windows-android-workflow.md`](../../.agents/skills/android-native-local-validation/references/windows-android-workflow.md) の規定に従う。本ランブックは、Gate 1〜4、検索入力専用フロー、各 5 フローで構成されるスイートの具体的な実行順序、Windows 環境固有のツールチェーン、実機端末の制約、ならびに成果物パスを、当リポジトリ固有の入力情報として定義するものである。

一括実行用の `All` スクリプトは Gate 1 終了時点で停止するため、Gate 1 の成功を確認した後にのみ RuntimeSuite、BoundarySuite、および必要に応じた Purchase／Review フローへと進めること。未実行の工程を PASS とみなしてはならず、また、Git 操作はユーザーからの明示的な指示がない限り AI エージェントが自律的に行ってはならない。

## 9. 完了条件

- Doctor PASS
- Prepare PASS（初回または再生成が必要な場合）
- 最新の有効な Release APK の確立・APK Bundle／ABI 検査 PASS
- 実機へのインストール PASS
- 起動安定性 PASS
- `native-test-control.yaml` PASS
- Runtime 5 Flow PASS
- Boundary 5 Flow PASS
- 証跡の保存

ビルドの成功のみをもって、ネイティブ実機検証が完了したと判断してはならない。

### 9.1 2026-08-08 現行ソースの完了例

現行のソースコードを用いて本番環境向け（Production）構成の検証を行う際は、自動テスト用の Automation APK と本番用の Production APK を取り違えてはならない。Production 環境向けの設定で `:app:createBundleReleaseJsAndAssets --rerun-tasks` のみを明示実行した後、通常の `:app:assembleRelease --build-cache --parallel` を実行し、生成された APK 内に正規の JS バンドルおよび対象 ABI のバイナリが含まれ、Automation 用・Harness 用・Test Control 用のマーカー要素が存在しないことを確認する。続いて Production APK を実機へインストールし、スモークテストおよび `maestro/native-production-validation.yaml` を実行する。

今回の検証証跡の保存先は `.artifacts/native-local/20260808-221600-android-current-production-targeted/` であり、Install、Smoke、Maestro の各工程はそれぞれ `20260808-222000` 〜 `20260808-222300` に記録されている。なお、iOS Simulator やリモート CI 上での実行結果は、本 Windows 用ランブックの PASS 判定には含めない。