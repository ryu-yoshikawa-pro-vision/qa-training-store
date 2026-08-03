# PR #8 Native Test Control起動競合・受入テスト修正

- 実施日時: 2026-08-04 JST
- 対象Branch: `feature/01_phase2-first-half-native-foundation`
- Git操作: Commit／Push／Branch変更／PR更新なし
- EAS Cloud: 実行なし。静的config検証のみ

## 根本原因

`NativeTestControlBridge`が`Linking.getInitialURL()`を`Linking.addEventListener("url", ...)`より先に開始していたため、アプリ起動直後のReset Deep LinkがReact Nativeのlistener登録前に失われる可能性があった。また、親のRuntime表示がDeviceEventEmitterのready／error Signalに依存し、listener登録完了をMaestroから観測できる状態がなかった。

## 実装

- `NativeTestRuntimeStatus`を`booting`／`listening`／`resetting`／`ready`／`error`のUnionとして追加し、固定label mappingを一箇所へ集約。
- `NativeTestControlBridge`をlistener登録→`listening`通知→initial URL確認の順へ変更。
- valid Test Control URLの処理中Set、Reset中`resetting`、成功時`router.replace()`→`ready`、解析／Reset失敗時`error`を実装。
- active guardとsubscription cleanupを追加し、Unmount後のStatus更新・Navigationを抑止。
- 同一URLは処理中だけ重複排除し、完了後の意図した再実行は許可。
- Serviceの既存ready／error／contract SignalとService Mutexは変更せず維持。
- 10 Maestro Flowを`launchApp → Scenario Shop → listening待機 → reset openLink → ready待機`へ統一。
- iOS WorkflowからMaestro前の`xcrun simctl openurl`を削除し、ResetをFlow側へ統一。
- iOS Maestro CLIを確認済みcli-2.8.0／固定URL／`maestro/bin/maestro`へ合わせた。

## テスト

- Bridge Component: 9 tests（初期化前、listener順序、valid URL、対象外URL、parse失敗、Reset失敗、Unmount、initial URL、重複URL）。
- Maestro Contract: 10 Flowのコマンドindex順序、5 label、Bridgeのlistener／initial URL順、Production disabled entry、iOS重複Resetを検証。

## Local validation

- `pnpm run format:check`: PASS
- `pnpm run lint`: PASS（0 errors／64 warnings）
- `pnpm run typecheck`: PASS
- `pnpm run test:unit`: PASS（13 files／66 tests）
- `pnpm run test:integration`: PASS（9 files／91 tests）
- `pnpm run test:repository`: PASS（5 files／28 tests）
- `pnpm run test:component:native -- --runInBand`: PASS（9 suites／25 tests）
- `pnpm run test:contracts`: PASS（19 files／100 tests）
- `pnpm run check:native-route-dependencies`: PASS（38 routes）
- `pnpm run validate:image-manifest`: PASS
- `pnpm run validate:eas:config`: PASS（`cloudRun=not-run`）
- `pnpm run validate:native-production-bundle`: PASS
- `pnpm run test`: PASS
- `pnpm run build:web`: PASS
- `pnpm run verify`: PASS
- `pnpm exec expo prebuild --platform android --no-install`: PASS。`android/`はignoredで差分なし
- `git diff --check`: whitespace errorなし（Windows LF／CRLF warningのみ）

## Native／Remote validation

- Android APK Build／Install／Emulator／Maestro 10 Flow／実SQLite: NOT RUN。Java、Android SDK、adb、Emulator、Maestroが現Windowsにない。
- Android Reset後画面再読込／Scenario／Cart／Persistence: NOT RUN。古いStateが実測されていないため`dataRevision`は追加していない。
- iOS Simulator Build／Install／Maestro／実SQLite／Persistence: NOT RUN。Xcode、xcrun、Simulatorがない。
- 修正後Remote Cache Miss／Hit、全Flow、Evidence、`native-ci / verify`: NOT RUN。Commit／Push禁止。
- Production Test Control Guard: PASS（ローカル生成BundleでAutomation markerあり、Production markerなし）。

## 判定

コード・Workflow・Contract・ローカル検証は完了。実Android／実iOS／Remote CIの受入判定は未確認としてユーザーへ引き継ぐ。
