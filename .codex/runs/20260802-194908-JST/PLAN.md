# Phase 2前半 Run Plan

## 1. Goal

Expo RouterのNative Root/Route、Customer向けSQLite/KV/PBKDF2、Guest Storefront/Cart、Test Control、Native TestをGate A〜Gで実装・検証する。Buildはローカル経路を使用し、EASは静的・将来用設定だけを保持する。

## 2. Current understanding

- Branch: `feature/01_phase2-first-half-native-foundation`
- HEAD: `ebc3671adb8dc9e287b3ac91cc43ba4183de4d81`
- 初期作業ツリー: clean
- 現行はWeb/Dexie/Vitest/jsdom/Playwright中心。Native Route、SQLite、KV、Native Test、EAS設定は未整備。
- 添付Goalで識別子、Scheme、Store非公開、CNG、対象外機能は確定済み。
- EAS Cloudはユーザー判断により主経路として使用しない。Profile／Environment／manual Workflowの静的契約は保持し、認証・Cloud実行・Submitは本Runの非目標とする。
- Android/iOSのローカル実行ツールは現環境に存在しないが、コード実装・静的検証は止めず、実Native操作は未確認として分離する。

## 3. Assumptions

- 固定済みの識別子とSchemeを変更しない。
- `docs/future/phase2`は非正本として参照する。
- 上位計画変更が必要な場合は、承認済みADRなしにコード変更しない。
- ローカルBuildを正規の実行経路とし、EASは静的設定・将来用Workflowの範囲だけに限定する。

## 4. Non-goals

- Phase 2後半のLogin/Account/Checkout/Payment/Order/Review/購入Maestro。
- Native Admin、Store公開、EAS Submit、Phase 3、Migration Recovery、Sentinel基盤、不要なMutation Queue。
- EAS Account/Project、EAS Cloud Build/Workflow実行、EAS Submit、Store公開設定。静的`eas.json`／Workflow検証は含める。

## 5. Impacted areas

- `app/**`、`src/presentation/**`、`src/application/**`、`src/domain/**`
- `src/infrastructure/database/{dexie,sqlite}/**`、session/security、seeds、test-controls、generated assets
- `package.json`、lockfile、`app.config.ts`、TypeScript/Jest/Vitest、CI、Docs/ADR/Run Artifact

## 6. Files to inspect

- Route/Screen/Shell/Provider、Use Case/Contract/Repository/Transaction、Dexie/Seed/Test Control
- `app.config.ts`、`package.json`、`pnpm-lock.yaml`、`tsconfig.json`、existing CI/Test
- `docs/plans/phase2-native-goal/00_master-roadmap.md`
- `docs/plans/phase2-native-goal/01_phase2-first-half-native-foundation.md`

## 7. Change strategy

1. ユーザー決定（ローカルBuild主経路・EAS静的のみ）をRunへ記録し、Gate Aの実装を開始する。
2. Gate A: Platform Root/Route/Screen/ShellとNative dependency check。
3. Gate B: Application依存方向、Capability/Scope、Native Composition Root、KV/PBKDF2、Native Jest境界。
4. Gate C: SQLite Schema/Mapper/Connection/FK/Transaction/Customer Adapter/Shared Contract/Harness。
5. Gate D: Asset Map、Deep Link Reset、Signal、Production Guard、EAS静的Profile／Workflow。
6. Gate E/F: 利用可能なローカルAndroid/iOS経路でBuild、Install、起動、Guest Flow、再起動、Reset、実Native Contract。環境不足は未確認として記録する。
7. Gate G: 全回帰、自己レビュー、Docs/ADR/History、後半引継ぎ。

## 8. Validation plan

- Local static/type/test/build/Web E2EをGateごとに実行する。
- AndroidはローカルBuild経路が存在する場合にBuild・Install・起動し、Home→商品探索→詳細→Variation→Cart→数量→削除→再起動→Resetを実操作する。
- iOSはローカルSimulator経路が存在する場合にBuild・Install・起動し、同FlowとSQLite/PBKDF2/KV/FKを実操作する。
- EAS Cloud Workflow、EAS Project、外部Buildは実行しない。Repository validatorで静的設定を検証する。
- 実行していない検証はPASSにしない。

## 9. Risks

- ローカルNative toolchainが不足すると実環境操作を完了できない。コード検証と実環境検証を分離する。
- WindowsにAndroid/iOS実行環境がないため、コード完了と実環境完了を分離する必要がある。
- ApplicationのDexie直接依存をNative対応で壊す可能性がある。
- Native CryptoのWeb Bundle混入、SQLite FK/Transaction不整合、Harness汚染を静的/実Native Testで防ぐ。

## 10. Open questions

1. Android adb/Emulator環境とiOS Simulator環境の提供経路（コード実装を止めないFollow-up）。
2. Phase 1 Web CI/Cloudflareの外部成功Run確認。

## 11. Follow-up notes

- ユーザー決定によりBlockedを解除した。コード、依存、Configの実装を開始する。EAS Buildは変更・実行しない。
- 同じRunを再利用し、ユーザー決定とローカル環境の検証結果をREPORTへ追記しながらGate Aから続行する。
- 後半開始可能判定は、前半PRがmainへマージされた後にのみ行う。

## 12. Gate A〜G実行順序と完了条件

- A: Route Inventory、Native/Web Root分離、Native dependency check、Web URL回帰、Critical/Highなし。
- B: Capability/Scope/Composition Root、PBKDF2/KV、Native Component Test、typecheck成功。
- C: SQLite/FK/Transaction/Shared Contract/実Native Contract/Harness Cleanup成功。
- D: Asset Map、Deep Link Reset、Signals、Production無効、EAS静的Profile／Workflow。
- E: ローカルAndroid経路がある場合にBuild・Install/起動し、Guest Storefront/Cart/再起動/Resetを確認する。環境不足は未確認。
- F: ローカルiOS経路がある場合にBuild・Install/起動し、Guest Storefront/Cart/SQLite/PBKDF2/KV/FKを確認する。環境不足は未確認。
- G: Static/Test/Web/Native回帰、Docs/ADR/History/引継ぎ、Critical/Highなし。

## 13. Android/iOS/Webの検証境界

- Web: Vitest、Dexie、Playwright、Web Build、Cloudflare契約。
- Android: ローカルBuild、adb/Emulatorが存在する場合のNative UI、実SQLite、Production-validation無効。
- iOS: ローカルSimulator Build/起動経路が存在する場合のNative UI、実SQLite/PBKDF2/KV/FK、Production設定。
- Browser emulationはNative成功の代替にしない。

## 14. ローカルBuild方針

- EAS Cloudは使用しない。`eas login`、Project作成・関連付け、EAS Build/Submitは実行しない。Profile／Workflowは静的ファイルとvalidatorだけを扱う。
- AndroidはローカルExpo/React Native toolchainが存在する場合のみBuild・Install・起動・操作・実SQLite Smokeを行う。
- iOSはmacOS/Xcode/Simulatorなどのローカル経路が存在する場合のみBuild・Install・起動・操作・実SQLite Smokeを行う。
- toolchainがない場合は未確認として記録し、コード実装・静的検証の完了判定とは分離する。

## 15. 外部条件の確認結果

- ユーザー決定: ローカルBuildを使用し、EAS Cloudは使わない。EAS静的設定は将来用として検証する。
- Android/iOS実行ツール不在: `adb/emulator/maestro/xcrun/simctl/xcodebuild/pod` unavailable（コード実装を止める条件ではない）。
- 現時点の開始判定: Gate A実装へ進む。実Native操作は環境提供後に検証する。

## 16. 後半へ引き渡す契約

Route Inventory、Root/Shell、依存方向、Capability/Scope、Native Composition Root、Schema/FK/Transaction、Shared Contract/Harness、KV/PBKDF2、Jest境界、Deep Link v1、Asset Map、Stable Test ID、CNG、ローカルBuild手順、未確認事項を最終REPORTへ整理する。

## 17. 調査agent

- `code_researcher`: Route/依存経路/既存契約。
- `implementation_researcher`: 変更箇所/実装順/検証コマンド。
- `test_investigator`: 既存Test/未整備のNative/SQLite/KV/FK観点。
- 全agentはread-onlyで、結果を親Agentが実コードと照合した。

## 18. 2026-08-02 23:35 JST 方針再開・追加契約

- ユーザー添付のBuild方針変更により、ローカルWindows／macOS Native Buildを正式な主経路とする。
- EASは完全除外ではなく、`eas.json`と`.eas/workflows/phase2-native-foundation.yml`の静的・将来用成果物だけを保持する。EAS Cloud Build／Workflow／Submitは実行しない。
- Native UIは`src/presentation/design/tokens.ts`を共有Visual Contractとし、Web DOM／CSS／React AriaをNativeへ再利用しない。Home／Catalog／Product／Cartの情報順と商品画像比率、44px以上Touch Targetを揃える。
- Androidは`expo prebuild`、Android Studio／Gradle Release、署名設定済みAPK、Emulator／device Installを確認する。iOSはmacOS／Xcode／Simulator Release Buildを確認し、個人iPhoneはDevelopment Signingの任意確認に限定する。
- 現WindowsでAndroid `expo prebuild --platform android --no-install`とConfig Plugin適用は成功した。Android SDK／`ANDROID_HOME`／`adb`がないためRelease APK、Install、操作は未確認。iOSはWindowsのため未実施。
- Webの390×844／320×700 UI ReviewはHome／Catalog／Product／Cartで取得・目視確認済み。Native screenshotは実環境提供後に取得する。

## 19. 2026-08-03 00:33 JST Visual Contract補正

- Web Homeの実画像で確認したDark Navy Hero、Gold CTA、明るい補助CTAをNative Homeへ反映する。
- Hero見出し・本文は既存の共有Typographyを維持し、色だけをDark背景向けに重ねる。Native screenshotが取得できる環境ではWeb 390×844／320×700と比較する。
- この補正はコード／静的検証の範囲であり、実Android／iOS Build・Install・操作の未確認条件は変わらない。

## 20. 2026-08-03 PR #8レビュー修正計画

- GitHub PR #8の実レビューthreadは0件で、CodeRabbitは対象ファイル数超過によりskipだったため、添付レビュー文書を入力として最新コードを再確認する。
- 正式Deep Link、Native前半Scenario Allowlist、Guest Mutation、shared Application Use Case、Customer-only Schema、Reset Exclusive Transaction、実行可能Harness、Production Module Resolution、Variation、Native Asset CI、Android/iOS CIを対象とする。
- Android/iOS実Native確認、GitHub Actions Run、EAS Cloud実行、GitHubへのCommit／Push／PR更新は本Runでは完了扱いにしない。
- 同一Runを再利用し、修正IterationはREPORTへ追記する。ユーザー確認が必要な外部環境項目はNextへ残す。

## 21. 2026-08-03 PR #8再レビュー修正計画

- 添付の再レビュー指示を入力として、GitHub Actions run `30775548618`の失敗ログ（`sdkmanager: command not found`）と最新コードを照合する。
- Android WorkflowをSDK Root優先解決、sdkmanager絶対Path、Release APK、OS boot／package service待機、専用Maestro Artifact、Detect／Verify fail-safeへ修正する。
- Native Service公開型、閲覧制限Error、Test Control Reset順序、Cart Error／busy状態を修正し、Unit／Component／Contract Testを追加する。
- Restart／Dirty Reset／在庫／購入上限のMaestro FlowとiOS Release manual Workflowを追加・補強する。
- 修正後のGitHub Actions再実行はCommit／Push禁止のため実施せず、静的検証結果と未実施境界を既存Runへ追記する。

## 22. 2026-08-03 PR #8再レビュー修正 最終判定

- コード、Workflow定義、Maestro定義、対象Test、README／PROJECT_CONTEXT／ADR／Phase 2計画／Historyの更新を完了した。
- Format、Lint、Typecheck、全Test、Asset／Security／Route／EAS static、Production Bundle Guard、Web Build、Chromium／A11y／Mobile E2E、Expo Doctorを実行し、すべて成功した。
- 修正後GitHub Actionsの再実行と、Windows上で未提供のAndroid／iOS実Native環境によるBuild・Install・操作・実SQLiteは完了条件から除外せず、未確認として残す。
- 次の実施条件は、Commit／Pushが許可された後のGitHub Actions再実行、またはAndroid SDK／adb／EmulatorとmacOS／Xcode／Simulatorの提供である。

## 23. 2026-08-03 PR #8 Native CI再失敗・残存指摘修正計画

- Run `30780990538`と現行HEAD `ebf7c452...`を照合し、`sdkmanager`ではなく`emulator -version`の`libpulse.so.0`不足、および旧Evidenceの`adb logcat`接続待ちを現在有効な失敗として分類した。
- Android Workflowを`libpulse0`、絶対Path、分割Verify、Release APK／Gradle Log、3分Evidence Timeoutへ修正した。
- Variation未選択／在庫0／在庫あり、Out-of-stock選択・追加不可、Low-stock／Purchase-limit境界、Runtime初期化再試行を実装し、対応TestとMaestro Flowを更新した。
- 実修正後のGitHub Actions、Android／iOS実環境、実SQLiteはCommit／Push禁止または環境不足のため未確認として残す。

## 24. 2026-08-03 PR #8 Native CI処理順序・Runtime Cleanup修正計画

- Run `30785304641`（Head `be27f8ff5b9ec5395cb9ce4e6a1f56a61cc2f8e3`）の失敗原因を、SDK Component導入前のADB／Emulator／AVD Manager確認として確定する。
- allowed filesは`.github/workflows/native-ci.yml`、`src/bootstrap/native-runtime.ts`、該当Contract／Native Jest Test、PROJECT_CONTEXT／History、既存Run Artifactに限定し、Native UI／Maestro／Evidence定義は変更しない。
- Resolveの責務をPath解決へ戻し、Install後のTool検証とStep順序をContractで固定する。RuntimeはDatabase Open後だけをtry/catch対象にし、成功Databaseを閉じない。
- ローカル検証は指示書のコマンドを実行し、Remote CI／実Native／EAS／Git操作は未実施として報告する。

## 25. 2026-08-03 PR #8 AVD永続化・PBKDF2契約修正計画

### 仮説

- 最新Native CI Run `30787501472`のAndroid失敗はAPK生成やSDK導入ではなく、AVDの保存先とEmulatorの探索先が暗黙値のまま、`avdmanager create avd`がCustom hardware profile入力待ちで終了したことが主因である。
- HarnessがApplication DB不変確認だけでなく、実DBのseed `password_hash`を使ったNative PBKDF2正誤・Unicode検証をCleanup前に完了し、Cleanup完了後だけ成功Signalを出す必要がある。

### 実施方針

- `ANDROID_AVD_HOME=$RUNNER_TEMP/android-avd`を作成・exportし、`avdmanager -p`、AVDファイル検査、`emulator -list-avds`完全一致をEmulator起動前に行う。KVMは必須とし、PID監視、ADB、`sys.boot_completed`、package serviceを段階的に待つ。
- Native Contract Harnessはseed userのhashをDBから取得し、`NativePbkdf2PasswordHasher`で固定password／wrong password／Unicodeの正誤を検証する。Application DB不変確認、PBKDF2、DB／KV cleanup、成功Signalの順序をTestで固定する。
- 変更はNative CI Workflow、Native Contract Harness／runner、対象Contract／Unit／Native Jest Test、Run／PROJECT_CONTEXT／Historyへ限定する。EAS、Commit、Push、PR更新、`android/`／`ios/`のRepository追加は行わない。

### 判定境界

- ローカルのNode／Web／静的検証とコード実装は完了扱いにできる。
- 修正後のGitHub Actions成功Run、Android Emulator／Maestro／実`expo-sqlite`、iOS Simulatorは未確認のまま残し、Acceptance完了とは分離する。
