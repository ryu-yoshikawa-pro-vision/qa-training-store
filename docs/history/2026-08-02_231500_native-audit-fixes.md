# Native Foundation監査修正履歴（2026-08-02）

## 背景

添付Goalの要件を実装済みコードへ再突合し、実Android／iOS環境がなくても検出・修正できる不足を追加監査した。

## 修正内容

- Native Guest Identityの初回seed ID設定を、毎回の起動で上書きしないようにした。
- Native Guest Cartの初回作成を`withExclusiveTransactionAsync`へ統一した。
- Native Catalogへ在庫／Sale／Rating filterを追加した。
- Native Product DetailへSale価格、在庫、購入上限、Review Summary、在庫切れVariation表示、二重追加防止を追加した。
- 未知の画像Assetはplaceholderへfallbackするようにした。
- Native Test ControlのbuildKindは解決済みExpo Configを優先し、環境値欠落時にproductionを誤ってlocal扱いしないようにした。
- WindowsのStatic Web Dist Contract cleanupへ限定的な削除retryを追加した。
- Node.js 24組み込みSQLiteによるNative Customer Adapterの実SQL Shared ContractとFK違反検証を追加した。

## 検証

- `pnpm run test`: Unit 54、Integration 91、Repository 21、Web Component 76、Native Jest 4、Contract 63が成功。
- `pnpm run typecheck`: app／Native testsとも成功。
- `pnpm run build:web`: 成功。
- Playwright Chromium 27、Accessibility 4、Mobile boundary 4、Mobile 14が成功。
- Android／iOS JS exportは成功。APK／Simulator Build、Install、起動、実Native SQLiteは未確認。

## 未完了

Android SDK／adb／Emulator、iOS Xcode／Simulatorが現環境にないため、Gate E／Fの実環境項目は未完了のまま保持する。EASは使用しない。
