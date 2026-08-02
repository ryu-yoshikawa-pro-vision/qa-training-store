# Local Native Build主経路・共有Visual Contractの反映

## 変更

- Native BuildをローカルWindows／macOS経路の正式な主経路としてREADME、PROJECT_CONTEXT、Runへ反映した。
- AndroidのDev／Release／署名済みAPK／Install、iOSのSimulator／個人iPhone Development Signing、Production validation、Credential非保存の手順を文書化した。
- `eas.json`と手動Workflowを静的・将来用として追加し、Profile／Environment mapping、Maestro smoke、Production guard handoffを保持した。Cloud Build／Workflow／Submitは実行していない。
- Native Componentの色、Spacing、Radius、Typography、Touch Target、商品画像比率を共有`tokens.ts`へ接続し、Web CSSにも商品画像比率の契約変数を追加した。
- EAS静的validator、EAS／Visual ContractのContract Test、Native primitiveのTouch Target／画像比率テストを追加した。
- 生成される`android/`／`ios/`、APK／AAB／IPA、keystore等をGit対象外にした。

## 検証

- `pnpm run typecheck`: 成功。
- `pnpm run validate:eas:config`: 成功（profiles、Environment mapping、manual-only Workflow、Cloud未実行）。
- `pnpm exec expo config --json`: local／automation／productionのidentifier、scheme、testModeを確認。productionは`testMode=false`。
- `pnpm dlx expo-doctor@latest`: SDK互換依存を修正後、20/20 checks passed。`expo-system-ui`も追加してNative prebuild warningを解消した。
- `pnpm exec expo prebuild --platform android --no-install`: 成功。`android/`はignored local generated projectとして保持する。
- Web UI Review: `UI_REVIEW_STAGE=20260802-local-native-visual-contract`でHome／Catalog／Product／Cartを390×844／320×700で撮影し、実画像を確認した。
- `pnpm run test`、`pnpm run test:e2e:chromium`（27）、`pnpm run test:a11y`（4）、`pnpm run test:e2e:mobile-boundary`（4）、`pnpm run test:e2e:mobile`（14）は成功した。
- `pnpm dlx eas-cli@latest workflow:validate .eas/workflows/phase2-native-foundation.yml --non-interactive`: Expo認証がないため停止。設定エラーではなく、`An Expo user account is required`が先に発生した。
- Android SDK／adb／Emulator、Windows上のiOS Xcode／Simulatorは未導入のため、APK／Simulator Build、Install、起動、実SQLite Smokeは未確認。
- Native screenshotはNative実行環境提供後に取得する。Web側比較画像は`output/ui-review/20260802-local-native-visual-contract/{mobile,small-mobile}/`に保存済み。

## 未確認

- Local Native Build、signed APK、Android device／Emulator操作、iOS Simulator操作、Guest／Cart再起動復元、実Native SQLite／PBKDF2／KV／Harness、Production Native artifact。
- Android／iOS screenshotとWeb screenshotの実画面比較。Nativeが未起動のため、Native側の未検証画面をPASS扱いにしない。
- `pnpm run build:native:android:release`: Android SDK／`ANDROID_HOME`／`adb`がないため失敗。
- `pnpm run build:native:ios:release`: WindowsではiOS Build不可のため失敗。EAS代替は実行しない。
