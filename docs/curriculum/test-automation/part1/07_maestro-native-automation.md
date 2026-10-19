# Part 1-7: MaestroによるNative UI自動化

> **モバイルアプリ自動化の選択課程:** 本レッスンはPart 1共通課程の必須レッスンではありません。共通課程の前提条件はP1-6までです。選択課程を受講する場合はP1-7から開始し、完了後にP1-8へ合流します。選択しない受講者はP1-7をスキップしてP1-8へ進んでください。

## 学習目標

- Web UI自動化とNative UI自動化の違いを説明できる。
- MaestroにおけるFlow、Action、Assertionの基本概念を理解できる。
- Scenario Shop Nativeアプリを対象とした最小構成のMaestro Flowを作成できる。
- 安定したUI Test ID（Stable UI Test ID）、Deep Link、Test Controlを活用し、再現性の高いNativeテストを作成できる。
- モバイルアプリ自動化の選択課程としてAndroidで必須のFlowを実装し、iOSについてはBuild-only保証とプラットフォーム差分を説明できる。
- PlaywrightとMaestroについて「どちらが優れているか」という二者択一ではなく、対象プラットフォームと目的に応じて適切に使い分けられる。

## 教材

**本モジュールでは、本リポジトリのScenario Shop Nativeアプリと `maestro/` 配下の既存Flowを使用します。**

主な参照先:

- `maestro/native-storefront.yaml`
- `maestro/native-cart.yaml`
- `maestro/native-search.yaml`
- `maestro/native-test-control.yaml`
- `maestro/native-restart-persistence.yaml`
- `training/maestro/exercises/native-training-exercise.yaml`
- `scripts/training/run-maestro-exercise.ts`
- `src/presentation/native/`
- Native Stable UI Test ID
- `scenario-shop://` Deep Link

## 本レッスンのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P1-6までの共通課程の完了、Webで整理したビジネス条件（Business Condition）とテストケース、Native開始条件、Android実機・JDK・SDK・ADB・Maestro。P1-7を選択しない受講者はこのInputを準備せずP1-8へ進む |
| Activity | Playwrightとの共通点・相違点を把握し、既存Flowを比較した上で、Stable UI Test ID・Deep Link・Test Control・Resetを活用してNative Flowを設計・実行する |
| Observation | Native UIの識別、端末の状態、同一のserial／runIdにおけるbaseline→exerciseの遷移、FlowのAction／Assertion、AndroidとiOSの保証範囲の差、JUnit／スクリーンショット／logcat等の成果物（Artifact） |
| Output | 受講者が作成したNative exerciseのdiff、Test Case IDとUI Test IDの対応メモ、成功したexerciseのArtifact、プラットフォーム差分の整理。編集場所は任意とし、選択課程のエビデンスは既存のNative実行記録の保存先へ格納する |
| Self-check | WebとNativeの対象境界、Test Case IDとUI Test IDの違い、Deep Link／Test Controlでスキップする操作範囲、Android実機とiOS Build-onlyの保証差を説明する |
| Completion | 選択課程として意味のあるNative Flowを作成し、同一試行（attempt）の成功exercise Artifactおよび実行条件を確認できる。baseline／stock PASSの再実行やiOS Build-onlyを代用としない。なお共通課程としては未選択のままでも修了とみなす |
| Recovery | 理解が不足している場合は既存FlowやP1-5／P1-6へ立ち返る。端末・ADB・Maestro・ビルド／インストールに起因する問題は環境要因として切り分け、Flowの成否判断と混同しない。GitHub CIやiOS Runtimeの実行は必須としない |
| Handoff | P1-8へ進む際、Nativeを選択した場合のみFlow diff、Test Case ID、UI Test ID、runId／serial、Artifact、プラットフォーム差分を引き継ぐ。共通課程ルートの場合はP1-6のWeb成果物をそのままP1-8へ引き継ぐ |

## 学習順序

本レッスンでは、概念理解とFlowの下書きを先行して進め、実機端末の準備が整ってから実行へ移ります。

1. Maestro、YAML、Flow、Action、Assertionの概念を理解する。
2. `launchApp`、`tapOn`、`inputText`、安定したUI Test ID、待機処理、スクロール、`runFlow`を読み解き、Flowを下書きする。
3. Deep Link、Test Control、Scenario Resetを用いてテストの初期状態を定義する。
4. Android実機、JDK、SDK、ADB、Maestroを準備し、基準となる動作確認（baseline）を実施する。
5. 作成したFlowを正式な演習エントリポイントから実行し、実行記録（Artifact）を確認する。

## Lesson 1: Maestroとは

Maestroは、モバイルUIを操作・検証するための自動化ツールです。

PlaywrightがブラウザのページやDOM構造を中心に扱うのに対し、Maestroではネイティブアプリの画面構造やUI要素を直接操作します。

基本的なMaestro FlowはYAML形式で記述します。

```yaml
appId: com.ryuyoshikawa.scenarioshop
---
- launchApp
- assertVisible: "Scenario Shop"
```

## Lesson 2: ActionとAssertion

代表的な操作（Action）:

- `launchApp`
- `tapOn`
- `inputText`
- `scrollUntilVisible`
- `openLink`

代表的な検証（Assertion）:

- `assertVisible`
- `assertNotVisible`

Playwrightと構文は異なりますが、「前提状態の整備 → 操作の実行 → 期待結果の検証」というテストの基本構造は共通しています。

## Lesson 3: Nativeの要素識別

ネイティブアプリでは、Webブラウザ向けのDOMロケーターをそのまま使用できません。

Scenario Shopでは、安定した要素識別のためにStable UI Test IDを活用します。

例:

```yaml
- tapOn:
    id: "native-nav-products"
```

UI Test IDは、テスト自動化のためだけに無秩序に追加するのではなく、UIの責務や意味、表示の安定性を考慮して設計することが重要です。

また、`TC-CART-001` のようなTest Case IDとは役割が異なります。Test Case IDは「何をテストするか（要求・観点）」を追跡するためのものであり、UI Test IDは「画面上のどの要素を操作・検証するか」を特定するための識別子です。

## Lesson 4: Deep Link

ネイティブアプリでは、画面遷移やテスト制御（Test Control）の手段としてDeep Linkを活用できます。

例:

```text
scenario-shop://products/<product-id>
```

また、Test Controlによる状態リセットにもDeep Linkを使用します。

Deep Linkを活用することで、前提となる長い画面遷移を毎回繰り返すことなく、目的の画面や状態へ決定論的に到達できます。

ただし、テスト対象そのものであるユーザージャーニーまでDeep Linkでスキップしてしまわないよう、検証範囲を意識して設計する必要があります。

## Lesson 5: Test ControlとSeed Scenario Reset

既存のMaestro Flowでは、Test Controlを用いて初期状態を決定論的にリセットします。

例:

```text
scenario-shop://test-control/reset?version=<protocol-version>&scenario=<seed-scenario>&clock=<fixed-clock>&paymentDelayMs=<delay>
```

リセットパラメータを指定してリクエストを送信した後、アプリ側が操作可能な状態になったことを示すReady Signalを待機してから後続の操作を実行します。

Nativeのテストにおいても、前回実行時のデータや状態が残留してテスト結果を不安定にさせないよう、実行ごとの独立性を担保することが極めて重要です。

なお、最新のProtocol Version、利用可能なScenario、固定Clock、遅延値の設定は教材テキスト内にハードコードせず、[`state-and-scenarios.md`](../../../spec/state-and-scenarios.md)、[`metadata.ts`](../../../../src/seeds/metadata.ts)、および `/guide` 画面のTest Control仕様を参照してください。本レッスンでは、プロトコルやプロダクト自体の挙動変更は行いません。

## Lesson 6: 最初のMaestro Flow

標準（Canonical）環境であるUSB接続されたAndroid実機端末上で、以下の一連のシナリオを実装します。

1. アプリを起動する。
2. Test Controlを用いて`default` Seed Scenarioへ状態をリセットする。
3. 商品一覧画面へ遷移する。
4. 対象商品の詳細画面を開く。
5. バリエーションを選択する。
6. カートへ商品を追加する。
7. カート追加の成功状態を検証する。

最初は既存の `native-storefront.yaml` をそのままコピーするのではなく、自分でゼロから最小限のFlowを組み立ててください。

自作Flowが完成した後に、既存のFlowと構造を比較・確認します。

### 選択課程の実行記録

選択課程の修了条件は、Baseline（既存の既成テスト）のPASSを単に再確認するだけでは満たされません。受講者自身の成果物として以下を揃える必要があります。

1. 正準ファイル `training/maestro/exercises/native-training-exercise.yaml` を直接編集するか、そこから`runFlow`等で到達可能な受講者作成のsubflowを追加した差分（Diff）
2. Stable UI Test ID、およびTest ControlまたはDeep Linkを利用してビジネス条件を検証した記録
3. 同一試行（attempt）内で `training:native:exercise` がexit code `0` で完了し、`training-native-exercise.xml` を含むAndroid実機端末での実行Artifact

Android実機端末での実行が困難な場合は、環境側の問題（端末状態、接続、権限、Ready Signalの待機状態など）としてその要因を記録してください。既存のBaselineが実行できたことのみをもって、選択課程の修了要件に代えることはできません。

## Lesson 7: ScrollとNative UI

モバイルアプリの画面（Viewport）は限られているため、操作・検証対象の要素が画面外（ファーストビュー外）に配置されているケースが頻繁に発生します。

その際、`scrollUntilVisible` などを活用し、「画面を何回スワイプするか」という固定的な回数指定ではなく、「対象の要素が画面上に表示されるまで」を終了条件として操作を記述します。

これは、Playwrightにおいて固定の待機時間を避け、要素の状態変化を待機するアプローチと本質的に共通する考え方です。

## Lesson 8: Persistence

ネイティブアプリでは、アプリ再起動（App Restart）を挟んだ後も必要なデータやセッション状態が正しく復元されるか（永続化）の確認が欠かせません。

既存の `native-restart-persistence.yaml` を教材として参照し、以下の観点を検討します。

- ゲスト識別子（Guest Identity）は再起動後も保持されるか。
- カートの中身は正しく復元されるか。
- アプリの再起動という操作が、テストケース全体の観点においてどのような意味を持つか。

## Lesson 9: Android / iOS

同一のビジネスフローをAndroidとiOSの両方で検証する場合、可能な限り共通のMaestro Flowを利用して保守性を高めます。

一方で、プラットフォーム固有のUI挙動、IME（キーボード入力）、OS固有ダイアログなどの差異が生じる箇所に限り、必要な差分のみを切り出します。

「最初からAndroid用とiOS用でテストファイルを全件複製する」運用は、メンテナンスコストを増大させるため避けるべきです。

Part 1ではAndroid実機上で実際に手を動かしてテストを実装し、iOSについてはプラットフォーム差分とBuild-only保証の構造を理解するところまでを標準の範囲とします。Part 2では、GitHub Actions上でのAndroid RuntimeテストとiOS Build-onlyテストの比較を扱います。

## Lesson 10: Playwright vs Maestro

ツールの比較観点は以下の通りです。

| 観点 | Playwright | Maestro |
| --- | --- | --- |
| 主な対象 | Webブラウザ | ネイティブモバイルアプリ |
| 記述言語 | TypeScript | YAML |
| 要素指定 | Role / Label / Locator / UI Test ID など | Text / UI Test ID など |
| 初期化手段 | Test API / Fixture / Seed Scenario | Deep Link / Test Control / Seed Scenario |
| 実行記録 | Trace / Screenshot / Video | Screenshot / JUnit など |
| 実行環境 | Webブラウザ | Android実機（Windowsローカル環境） / Emulator（GitHub Native CI） / Simulator（任意の比較用） |

どちらか一方のツールに無理に統一するのではなく、テスト対象の特性と目的に応じて最適なツールを選択します。

## 実機 / ツールチェーン準備（概念を学んだ後）

本セクションは、P1-6までの共通課程を完了し、モバイルアプリ自動化の選択課程を選択した受講者を対象としています。ここで解説するNative環境のセットアップは共通課程の修了条件ではなく、この選択課程を開始するための前提条件となります。

Windowsローカル環境におけるPart 1 Maestroハンズオンの標準（Canonical）経路は、USB接続された**Android実機端末（physical device）**です。Android Emulator（AVD）は任意の補助経路であり、初学者向けやPart 1の完了条件としては位置づけていません。

現行プロジェクトの正式なCI保証範囲は「Android = ビルド + E2Eランタイム実行（Build + Runtime E2E）」「iOS = ビルドのみ（Build-only）」です。受講者の手元でiOS SimulatorやMaestroが稼働する環境であっても、それを正式なRuntime保証やPart 1の完了条件へ置き換えることはしません。

その理由は以下の通りです。

- iOSのRuntime実行にはmacOSおよびXcode環境が必要となるが、公式CIにおける保証は現時点でBuild-onlyであるため。
- Windowsローカル環境では、受講者が手元のUSB接続実機を用いて確実にNative UI自動化を再現できる体験を最優先とするため。
- GitHub Native CIにおいては、Android API 34 / `google_apis` / `x86_64` EmulatorによるFormalテストおよびTraining Maestroの実行が引き続き保証されており、これはWindowsローカルの標準実機経路とは別の責務として分離されているため。
- Android／iOSの保証境界、CI設計、Runnerの運用コストの最適化については、Part 2で詳細に扱うため。

Androidのビルド、インストール、実機接続、Maestroの動作確認は、`scripts/native/windows/android-local.ps1`、Training Maestro baseline、および既存Native CIの契約仕様に沿って実施します。別途Formal Native Flowを改変したり、独自の第二Native基盤を構築したりする必要はありません。

### Android Physical Device Start Gate

Windows環境では、開発者向けオプション（Developer Options）、USBデバッグ（USB debugging）、ADB接続許可（ADB authorization）が完了したAndroid実機端末を使用します。端末を起動して画面を表示し、手動でロック画面を解除（unlock）した状態でテストを開始してください。PIN、パスワード、生体認証をテストスクリプトから自動解除する処理は含まれていません。

リポジトリがサポートするAndroidの最低APIレベルは、`app.config.ts` の `minSdkVersion` を唯一の正本（Source of Truth）とします。本検証環境の端末がAPI 30であったとしても、それをカリキュラム全体の最低対応APIとして固定して扱うことはしません。

複数の端末が接続されている場合に意図しない端末でスクリプトが動かないよう、自動選択に依存せず必ず端末のシリアル番号（serial）を明示してください。

```powershell
adb devices -l
$serial = "<physical-device-serial>"
$runId = "<run-id>"
```

出力結果を確認し、端末のステータスが `device` と表示されていることを確認します。

```text
<physical-device-serial>    device usb:... product:... model:...
```

ステータスが `unauthorized`、`offline`、または端末が表示されない場合は、端末のロックを解除してPCからのRSA鍵の認証を許可し、USBケーブルの接続を確認した上でコマンドを再実行してください。以降の全コマンドには、ADBが対象端末を取り違えないよう同一の `$serial` を渡します。

Android実機の標準フローでは、まずToolchain DoctorによりJDK、Android SDK、ADB、Maestroの導入状態を確認し、以下の順序で実行します。

```powershell
& .\scripts\native\windows\android-local.ps1 `
  -Action Doctor `
  -DeviceSerial $serial `
  -RequirePhysicalDevice `
  -RunId $runId

& .\scripts\native\windows\android-local.ps1 `
  -Action Prepare `
  -DeviceSerial $serial `
  -RequirePhysicalDevice `
  -RunId $runId

& .\scripts\native\windows\android-local.ps1 `
  -Action Build `
  -DeviceSerial $serial `
  -Architecture Auto `
  -RequirePhysicalDevice `
  -RunId $runId

& .\scripts\native\windows\android-local.ps1 `
  -Action Install `
  -DeviceSerial $serial `
  -RequirePhysicalDevice `
  -RunId $runId

& .\scripts\native\windows\android-local.ps1 `
  -Action Smoke `
  -DeviceSerial $serial `
  -RequirePhysicalDevice `
  -RunId $runId

& .\scripts\native\windows\android-local.ps1 `
  -Action Test `
  -DeviceSerial $serial `
  -RequirePhysicalDevice `
  -Flow "maestro/native-test-control.yaml" `
  -RunId $runId

$env:QA_TRAINING_ANDROID_SERIAL = $serial
$env:TARGET_SERIAL = $serial
$env:ANDROID_SERIAL = $serial
$env:TRAINING_MAESTRO_OUTPUT_DIR = Join-Path (Get-Location) ".artifacts\native-local\$runId\maestro\training-baseline"
pnpm run training:native:baseline

$env:TRAINING_MAESTRO_OUTPUT_DIR = Join-Path (Get-Location) ".artifacts\native-local\$runId\maestro\training-exercise"
pnpm run training:native:exercise

& .\scripts\native\windows\android-local.ps1 `
  -Action Evidence `
  -DeviceSerial $serial `
  -RequirePhysicalDevice `
  -RunId $runId
```

Native helperスクリプトの各Action、Training Maestro baseline、およびexerciseは、すべて共通の `$runId` と `$serial` を使用して紐付けます。BaselineのJUnitレポートおよびデバッグ出力は `.artifacts/native-local/$runId/maestro/training-baseline/` に、exerciseの成果物は `.artifacts/native-local/$runId/maestro/training-exercise/` に保存され、Native helperによる一連の実行記録と同じRun IDの配下に集約されます。

### 受講者演習の正規のエントリポイント

受講者演習の正式なエントリポイントは `training/maestro/exercises/native-training-exercise.yaml` です。`pnpm run training:native:exercise` コマンドはこのファイルを実行します。初期ファイルはbaselineへ正常に到達する構成となっており、受講者はここへ課題のテスト条件に対応するActionおよびAssertionを肉付けしていきます。

成果物を作成する際は、この正準エントリファイルを直接拡張するか、受講者が作成したsubflowを正準エントリから `runFlow` コマンド等で呼び出す構成にしてください。エントリから参照されていない孤立したYAMLファイルを作成しただけでは、課題（C08）の成功記録として認められません。

<!-- 機械契約: tests/contracts/training-curriculum.test.ts が参照する固定文字列は変更しない。
Native learner exerciseのcanonical entryは `training/maestro/exercises/native-training-exercise.yaml`
unreferenced sibling YAML
1 runId = 1 baseline → exercise → Evidence attempt
training-native-exercise.xml -->

この一連のテスト実行は、1つの `runId` に対して「baseline → exercise → 実行エビデンス（Evidence）」を1セットとして記録する単一の試行（attempt）として扱います。baseline、exercise、エビデンス収集の間で同一の `$serial` と `$runId` を使い続け、exerciseの直前に端末の再検索（device discovery）を行ってはいけません。再試行（retry）を行う場合は、新しい `$runId` を採番して初期状態から改めて一連のフローを揃えます。

ローカル環境でexerciseの成功を客観的に判定するには、同一の試行内で `pnpm run training:native:exercise` がexit code `0` で正常終了し、`.artifacts/native-local/$runId/maestro/training-exercise/training-native-exercise.xml` が生成されていることを確認します。失敗時に出力される断片的なログや診断用Artifactが存在するだけでは、完了のエビデンスにはなりません。

スクリプトの `-RequirePhysicalDevice` オプションは、シリアル番号、ADBステータス、エミュレーター特有のプロパティ、Android APIレベル、ABI、パッケージ管理サービス、端末のスリープ状態（awake）、画面ロック状態（unlocked）を厳密にチェックし、エミュレーターやロック状態の端末を検知した場合はフェイルクローズ（処理中断）します。チェックに失敗した際は「端末を起動し、画面ロックを解除してから再実行してください」という旨のメッセージを出力し、端末内の認証情報へ無理にアクセスすることはありません。

`Doctor` アクションでツールの不足が指摘された場合は、JDK 17、Android SDK、Platform Tools、Maestroのバージョンおよび環境変数パス（PATH）を確認してください。`Prepare` は依存パッケージとNative生成物を整備します。APKの整合性確認を完了した後にのみInstall、Smoke、Test Control、Training Maestro baseline、エビデンス収集へと進み、前段のステップが失敗した状態で後続ステップがPASS扱いになることはありません。

## ハンズオン1: Native Cart Flow

Playwrightで実装したカート機能のテストケースから1件を選び、Android実機上のMaestro Flowとして実装します。

WebとNativeの双方において、共通するテストの検証条件と、プラットフォーム固有で異なる操作手順を整理・記録してください。

## ハンズオン2: Boundary Flow

在庫切れ、低在庫、購入上限などの境界値条件のいずれかをNative環境で検証します。

実装後、既存の `maestro/` 配下のFlowと構成や検証粒度を比較してください。

## ハンズオン3: Restart

カートに商品を追加した後にアプリを再起動（Restart）させ、アプリ起動後に状態が正しく復元されていることを検証します。

## 発展参考資料: iOS Build-only

`.github/workflows/native-ios-ci.yml` ワークフローを読み解き、iOSに関して「Runtime E2Eテストを実行した」と誤認することのないよう、Build-only（ビルド検証のみ）の記録として以下を整理します。

- AndroidとFlowを共通化できた部分
- プラットフォーム差分として分岐が必要になった部分
- 現状の構成でiOSのRuntime実行を必須としない理由、およびiOS固有のビルド差分

## 確認問題

1. PlaywrightのDOMロケーターを、そのままNativeアプリのテストに流用できない理由は何か。
2. Stable UI Test IDを導入するメリットと、無秩序に追加・乱用した場合のリスクは何か。
3. Test Case IDとUI Test IDの役割の違いは何か。
4. Deep Linkを使用するとテストを高速化できる一方、テスト設計上どのような操作をスキップしすぎないよう注意すべきか。
5. Android用とiOS用でFlowファイルを機械的に全件複製すべきでない理由は何か。
6. PlaywrightとMaestroに共通するテスト自動化の基本概念を3点挙げよ。
7. Windowsローカル環境の標準経路を「Android実機端末」とし、GitHub Native CIの標準経路を「API 34 Emulator」と分けて設計している理由は何か。

## 自己確認

以下の項目について、自身の言葉または取得した実行エビデンスに基づいて他者に説明できるか確認してください。

- PlaywrightのロケーターとMaestroのNative UI操作の違いを説明できる。
- UI Test IDとTest Case IDを正しく区別し、Stable UI Test IDを採用する理由とその乱用リスクを説明できる。
- Deep LinkおよびTest Controlを初期状態のセットアップ補助として活用し、検証対象であるユーザージャーニー自体をスキップしていないことを説明できる。
- 自身が作成したFlowのDiff、使用したUI Test ID、Test ControlまたはDeep Link、ビジネス条件、生成された実行Artifactを相互に対応付けて説明できる。
- 正準エントリである `native-training-exercise.yaml` を直接編集するか、そこから呼び出されるsubflowを作成しており、参照されていない孤立したYAMLファイルを作成しただけではC08のエビデンスにならないことを理解している。
- 同一のserialおよび同一のrunId配下で「baseline → exercise → エビデンス収集」を実行しており、再試行時は「新しいrunIdの採番 = 新規試行」として整えている。
- 演習成功時のArtifactと失敗時の診断ログを明確に区別し、exit code `0` かつ同一試行のexercise用JUnitレポートを確認できている。
- Android実機のRuntime実行条件、GitHub CI上のEmulator実行条件、およびiOSのBuild-only保証の境界を混同せずに説明できる。
- 2本以上のFlow作成はスキルの定着度を高める目安であり、既存のBaselineや既成テストのPASSの再実行を自身の成果物（C08）として扱っていない。

### Recovery

Flowが正常に実行できない場合は、まず `Toolchain Doctor`（または `-Action Doctor`）、`adb devices -l` の出力、端末の `USB debugging` 設定、`-RequirePhysicalDevice` の制約、`-DeviceSerial` の指定、端末画面がロック解除（unlocked）されているか、Ready Signalの受信、ビルド・インストール状態を順次確認してください。環境起因の問題を解決しても解消しない場合は、失敗した条件・期待した挙動・取得できたログを記録に残した上で、Flowの設計・ロケーターの指定へと立ち戻って分析します。

## 完了条件

- C08の達成に最低限必要な成果物は、受講者自身が作成したNative exerciseのdiffと、Maestroによるテスト成功時の実行Artifactです。詳細は [習熟度評価基準](../02_competency-rubric.md) を参照してください。
- 既存のBaselineや既成テストのPASS結果をそのまま流用するだけでは、C08の要件を満たせません。
- Android実機端末上で、意味のある検証内容を持ったMaestro Flowの実行記録を最低1本作成していること（2本以上の作成は練習量の目安として推奨）。
- UI Test IDを用いた操作・検証が含まれていること。
- Test ControlまたはDeep Linkを利用した決定論的な状態初期化を行っていること。
- PlaywrightとMaestroの双方で同一のビジネスフローを最低1件比較・検証していること。
- Nativeアプリ固有のテスト観点を最低1件説明できること。
- Test Case IDとUI Test IDの違いを明確に区別して説明できること。
- Android RuntimeとiOS Build-onlyの保証範囲の差を、現行のADRやCIワークフローの仕様に沿って正確に説明できること（iOS Runtimeの実行を共通課程の必須範囲やC08の成果物の代替としないこと）。

## 次の行動

共通課程を進める場合は、[P1-8: テスト管理と保守性改善](08_test-management-and-maintainability.md) へ進んでください。モバイルアプリ自動化の選択課程を継続する場合も、共通課程のP1-8を完了させた後に、Native成果物の整理およびPart 2の選択課題へと進みます。
