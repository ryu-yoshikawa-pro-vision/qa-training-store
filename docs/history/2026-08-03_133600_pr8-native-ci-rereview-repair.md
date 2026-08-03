# PR #8 Native CI再失敗修正履歴

## 2026-08-03 13:36 JST

- GitHub Actions Run `30780990538`をread-only確認した。SDK解決とSDK component installは成功し、`Verify Android toolchain`で`adb`／`avdmanager`成功後の`emulator -version`が`libpulse.so.0`不足で終了コード127となっていた。
- `Collect Android evidence`は旧`adb logcat -d`を接続待ちのまま実行し、約39分後のRunner shutdownで終了していた。
- Android Workflowへ`libpulse0`、`ADB`／`EMULATOR`／`AVDMANAGER`／`APK_PATH`の絶対Path、分割Verify、Release APKの非空確認、Gradle `pipefail`＋`tee`、EvidenceのDevice確認・Timeout・状態Artifactを追加した。
- Native Product DetailはVariation未選択、選択済み在庫0、選択済み在庫ありを分離し、Out-of-stock Variationを選択可能・カート追加不可とした。Cart上限到達表示とdisabled境界を追加した。
- Native Runtimeの失敗Promiseを解除し、Providerのin-flight guard付き再試行とShellの再試行UIを追加した。
- 対象Native Component／Contract Test、Typecheck、Format、Lint、全Test、静的検証、Web Build／E2E／A11y／Mobile、Expo Doctorを実行した。実GitHub再実行・実Android／iOSは未実施である。
