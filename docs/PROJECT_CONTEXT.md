# Project Context

## 目的

- このリポジトリで Codex を使うときの運用前提、重要な制約、主要ディレクトリを共有する。

## 運用の要点

- `AGENTS.md` の読込順と run 運用を必ず守る。
- 計画依頼では `docs/plans/TEMPLATE.md` をベースに計画書を作る。
- `docs/reports/` は durable な調査・監査・検証結果だけに使う。review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録では作らない。
- run の進捗と実行ログは `.codex/runs/<run_id>/REPORT.md` と `.codex/runs/<run_id>/logs/` に残す。
- プロジェクト配下の読み書きは通常承認なしでよいが、shell / PowerShell / git command によるファイル削除は禁止する。意図した差分としての `apply_patch` は許可する。
- read-only 調査 subagent は調査結果だけを返し、編集・作成・削除を行わない。
- `implementation_worker` は親 agent が承認した小さく限定された実装だけを担当し、対象ファイル以外の編集、削除、rename、git mutation を行わない。
- 重要な意思決定は `docs/adr/` に記録する。
- `docs/PROJECT_CONTEXT.md` 自体は living document として更新し、履歴は `docs/history/` に残す。

## ディレクトリ構成

- `.codex/templates/`: PLAN / TASKS / REPORT の run テンプレート
- `.codex/agents/`: project-scoped custom agents
- `.codex/rules/`: execpolicy ルール
- `.agents/skills/`: repo-local の planning / review workflow と references
- `docs/plans/`: ユーザー向け計画書
- `docs/reports/`: durable な調査・監査・検証レポート
- `docs/reference/`: operator / maintainer 向け補助資料
- `scripts/`: `codex-safe` / `codex-task` / `codex-sandbox` と verify
- `codex-project.toml`: template 適用後の project metadata

## UI デザイン基準

- Storefront と customer 画面は、白／暖色系 Off White、Dark Navy `#111827`、限定的な Gold `#C6A15B` を基調とし、商品画像と情報階層を主役にする。
- 本文色は `#111827`、補足色は原則 `#475569`、Border は `#E2E8F0` とし、Gold の文字色は WCAG AA を満たす `#7A5B22` を使う。
- 最大 Content Width は 1,280px、Spacing は 8px Grid、Button／Touch Target は原則44px以上、CardはBorder中心でShadowを限定する。
- Responsive境界は Mobile 767px以下、Tablet 768〜1023px、Desktop 1024px以上を基本とする。管理操作は既存契約どおり1024px以上に限定し、小画面では専用Warningを表示する。
- Visual Reviewの標準ViewportはDesktop 1440×1000、Tablet 1024×900、Mobile 390×844とし、Storefront／customerの主要FlowはSmall Mobile 320×700でも横overflow、44px touch target、Page End到達性を検証する。
- 共通の視覚実装は `src/presentation/design/tokens.ts`、`src/presentation/styles/global.css`、Storefront／Admin shell、共有Componentへ集約し、Domain、Use Case、Seed、Route、権限制御から分離する。
- 同一条件のVisual Reviewは `e2e/web/ui-review.spec.ts` と `ui-review-*` Playwright projectで取得し、`output/ui-review/<stage>/<viewport>/` に保存する。

## UI/UX改善実装後の状態（2026-08-01）

- WebのOne-time Noticeは `src/presentation/shells/app-frame.tsx` が単一のStateと消費Pathを所有し、Storefront/Admin Shellは表示だけを担当する。Cart統合、Checkout再開・置換、Scenario ResetのNoticeは `sessionStorage` の検証済みUnionを介して伝播し、Reloadでは再表示しない。
- Loginの内部Return先は `src/presentation/browser/return-to.web.ts` のCustomer向けAllowlistに限定する。Checkoutの各実ContentとPayment Processing/Complete/Failedは `use-route-heading-focus` で `h1` にFocusする。
- Scenarioの正本は `src/seeds/metadata.ts` の `SCENARIO_METADATA` / `PHASE_ONE_SCENARIOS` であり、Seedの初期Session、安全な戻り先、Guide表示、E2E収集可否を同じ定義から導出する。Test Control UIのResetだけがNotice保存と安全Pathへの遷移を行い、Test API ResetはDB/Session/ClockのResetとMetadata返却に限定する。
- Customer注文画面のReview表示はAdmin向けOrder Item DTOから分離したCustomer DTOを使い、購入時Snapshotに基づく `未投稿`、`公開中`、`非公開`、`削除済み（再投稿不可）` を表示する。Admin User Detailは自分自身のRole/状態変更と退会済みUserのMutationをUI上でも説明付きで拒否する。
- Admin Product Previewは保存前のForm値と既存DBの現在庫を分けて表示し、新規SKUだけ初期在庫を表示する。Product EditorはDirty状態をBreadcrumb/Sidebar/同一Origin遷移で共通確認し、PreviewはDBへ書き込まない。Shipment mutation後は最新Order/Shipmentを再取得して同時更新を表示する。
- `/guide` は固定Account、Role、Rank Benefit、Scenario Metadata、注意事項の学習入口であり、HomeはSession Role別CTAと公開商品0件の単一Empty Stateを持つ。Customer Account Navigationは390px/320pxで3列Gridを維持し、管理操作は従来どおり1024px以上の境界を維持する。
- UI/UXの回帰入口は `e2e/web/ui-ux-improvements.spec.ts` のFlow A〜J（Chromium 10 tests）で、Phase 1と合わせて `test:e2e:chromium` に収集する。Cross-role、Accessibility、Mobile boundary、4 viewport UI Reviewも既存CIスクリプトへ接続している。

## PR #4レビュー修正後の状態（2026-08-02）

- Scenario ResetはDatabase Resetの成否とNotice保存を分離する。Reset成功後のNotice保存失敗はReset失敗として表示せず、必ずMetadataのsafeResetPathへハード遷移する。ConfirmDialogは非同期Confirm中の再実行を防止する。
- Product Previewは削除予定を除いたeffective VariantをForm値から組み立て、有効SKU・必須入力・Main Imageを公開可否判定へ含める。Previewは永続化せず、既存SKUのDB現在庫と未保存Form状態を別表示する。
- Shipmentの表示ラベルはOrder StatusとShipment Statusの組合せをPresentationの共通mappingで変換し、Admin／Customerで同じ文言を使う。Login後Checkout fallbackは想定された3つの状態Errorだけを対象とし、Storage／予期しないErrorは握り潰さない。
- Cart統合の`adjustedItemCount`は部分調整だけを数え、完全除外は`fullyExcludedItemCount`だけで数える。Guideは利用者向け分類とラベルを表示し、内部Property名やDB用語を露出させない。

## PR #4追加修正後の状態（2026-08-02）

- Test Control UIのResetだけがNotice保存とsafeResetPathへの画面遷移を所有し、Test API ResetはUI Notice／UI遷移を行わず、DB・Session・ClockのResetとMetadata返却だけを行う。
- GuideとReset NoticeのRoute表示は`src/presentation/routing/guide-routes.ts`のlinkable-route allowlistを共有する。`/orders`と`/admin/reviews`などの静的Routeはリンク化し、動的な`/reviews`、決済結果Route、外部／Protocol-relative／親相対Pathは文字列表示に留める。
- Customer Review状態の5値（`NOT_ELIGIBLE`、`NOT_POSTED`、`PUBLISHED`、`HIDDEN`、`DELETED`）は`deriveCustomerReviewState`で導出する。未配達のReview Eligibilityは商品・Variation・Option・注文番号・注文日時のSnapshotを保持し、Read処理でDBを変更しない。
- Admin Product Previewの`reviewSummary`は既存商品のDB集計を全項目DTOへ明示変換し、新規Previewは全項目0とする。Customer注文詳細は`getMyCustomerOrder`を直接利用し、送料表示は`FREE_SHIPPING_THRESHOLD`を正本とする。
- CIのCross-role lifecycleはPRでも専用Playwright projectのまま実行する。Scenario DatasetのGuest／非Guest Session整合と、非同期ConfirmDialogのPromise返却をUnit／Component／Contractで検証する。
- Dirty NavigationはReact AriaのModal／DialogとExpo Routerの`usePreventRemove`を組み合わせ、戻る操作の履歴状態を復元してから確認する。破棄後は保存中の遷移ガードを解除して元の遷移Actionを遅延Dispatchし、保存中は確認を出さない。

## CI/CD構成（2026-08-02）

- Quality、Vitest、Build、Playwright 検証は独立 Job／Matrix として実行し、独立した検証を可能な範囲で並列化する。上流検証を集約する内部 Job ID は `verify` とし、既存 Required Check 互換性のため最終 Job ID `validate` を維持する。
- Automation／Production の `dist/` はそれぞれ一度だけ Build し、`web-dist-automation`／`web-dist-production` Artifact として後続の E2E、Smoke、デプロイ Job へ共有する。
- Playwright は `PLAYWRIGHT_USE_PREBUILT_DIST=true` のとき Download 済みの `dist/` を静的サーバーで配信し、Job 内の `build:web` 再実行を抑止する。環境変数が未指定の場合はローカルの従来どおり Build 後に配信する。
- PR は `verify`、Automation Artifact による Preview デプロイ、固有 Preview URL の Smoke Test を順に通過した後、最終 `validate` を成功させる。`deploy-preview` は Job-level `always()` と `verify`／`build-automation` の成功条件を併用するため、PRで `extended-e2e` が意図的に Skip されても条件評価され、上流失敗時は実行しない。Preview デプロイまたは Smoke が失敗・Skip した場合、`validate` は `always()` の結果判定で失敗する。main Push では `deploy-preview` を Skip として扱い、Preview Skip が伝播しない `deploy-production` の Job-level `always()`＋`validate`／`build-production` 成功条件により、最終 `validate` 成功後に Production デプロイと公開 URL Smoke Test を行う。
- Production デプロイは `cloudflare-production` の Job concurrency により同時実行しない。Cloudflare Secret 不足はデプロイ対象 Job 内の認証確認 Stepで明示的に失敗させ、認証情報はその確認 StepとWrangler Action Inputに限定する。全 Checkout は `persist-credentials: false` とする。UI Review Artifact は `UI_REVIEW_STAGE` をUpload pathへ再利用し、Preview branch名は許可文字を検証する。
- forkリポジトリからのPull Requestは、Cloudflare Preview用Secretを利用できず、必須のPreviewデプロイおよび公開URL Smokeを実行できないため、現在のCI/CD運用ではサポート対象外とする。同一リポジトリ内の通常PRでSecretが不足する場合は明示的に失敗し、fork PRを通すためにPreview必須条件を弱めたり `pull_request_target` を追加したりしない。

## Phase 2前半 Native Foundation（2026-08-02）

- WebとNativeのRoot／Route／Shellを分離した。Webは既存のApp FrameとDexie Runtimeを継続し、Nativeは`NativeAppRuntimeProvider`、Native Shell、Native Customer SQLiteを使う。全Routeの分類は[`docs/plans/2026-08-02_215142_route-inventory.md`](./plans/2026-08-02_215142_route-inventory.md)に記録する。
- Native前半の実装範囲はGuest Home、Catalog、Search、Category、Product、Variation、Cart、Guide／Legalである。Login、Account、Checkout、Payment、Order、Review、AdminはNative placeholderとし、後半へ引き継ぐ。
- Native DBは`expo-sqlite`のCustomer-only schema、FK enforcement、WAL、exclusive transaction、seed versionを使用する。Native KVは`expo-sqlite/kv-store`、Password HashはPBKDF2-SHA256 adapter、Assetは静的生成Mapを使用する。
- Test Controlは`scenario-shop://test-control/reset`のVersion 1 Deep Link、Scenario／Clock／Delay validation、Reset mutex、Ready／Error signalを持つ。local／automation buildだけ有効で、production buildでは無効である。Native contract harnessは専用DB／KV namespaceとfinally cleanupを持つ。
- Application層はInfrastructure／Dexieをimportせず、Web Dexie Composition RootとNative Customer Composition Rootがportへadapterを注入する。`pnpm run check:native-route-dependencies`、`typecheck:native-tests`、Native Jestを検証入口とする。
- Native BuildはローカルWindows／macOSを正式な主経路とする。Androidは`expo prebuild`→Android Studio／Gradle Release／署名済みAPK→Emulator／端末Install、iOSは`expo prebuild`→Xcode／`expo run:ios` Release Simulator Build→Simulator Installを行う。個人iPhoneはDevelopment Signingの任意確認に限定し、Distribution IPA／Store提出は行わない。生成された`android/`／`ios/`、APK／App、署名鍵／CredentialはRepository成果物にしない。
- Native UIはWeb DOM／CSS／React Ariaを再利用せず、`src/presentation/design/tokens.ts`の色、8px Grid、Radius、Typography、Touch Target、商品画像比率をNative primitivesへ接続する。Home／Catalog／Product／Cartの情報順と画像比率をWebと揃え、390×844、追加で320×700のWeb／Native比較を行う。Android／iOS差分はPlatform Header／Navigation等の必要差に限定する。
- `eas.json`と`.eas/workflows/phase2-native-foundation.yml`はProfile／Environment mappingと将来の手動Workflowを静的に保持する。`pnpm run validate:eas:config`をローカル静的検証入口とし、EAS Cloud Build／Workflow／Maestro／Submitは通常経路として実行しない。
- 2026-08-02時点の実行環境にはAndroid SDK／`adb`／EmulatorとiOS `xcrun`／Simulatorがないため、実Native Build／Install／起動／操作／実SQLite Smokeは未確認である。Node／Web検証と実Native検証を混同しない。
- Node.js 24の組み込み`node:sqlite`でNative Customer SQLite Adapterの実SQL／FK／Seed／Catalog／Cart Shared Contractを検証するSuiteを追加した。これはAndroid／iOSの`expo-sqlite`実行検証とは分離して扱う。
- Native Guest Identityは初回だけseed既定値を設定し、以後はNative KVの保存値を再起動後も保持する。Guest Cartの初回作成も`withExclusiveTransactionAsync`内で行う。
- Native前半UIはCatalogの在庫／Sale／Rating filter、商品詳細のSale価格・在庫・購入上限・Review Summary・在庫切れVariation、二重追加防止を備える。ProductionのTest Control buildKindは解決済みExpo Configを優先する。

## PR #8レビュー修正後の状態（2026-08-03）

- Native Test Controlの正式URLは`scenario-shop://test-control/reset`であり、Pure Functionが`scheme`／`hostname=test-control`／`path=reset`を検証する。Native前半Scenarioは`src/seeds/metadata.ts`の`NATIVE_FOUNDATION_SCENARIOS`（8件）だけを受理する。
- Native Runtimeは既存の`CatalogUseCases`／`CartUseCases`へCustomer Catalog／Cart Gateway、Guest Actor、Native SQLite／Clock／KV Adapterを注入する。Native専用Use Caseの業務Validationを正本にしない。
- Native SQLite Resetは削除、Seed、Schema Metadata、Native Schema Version、`foreign_key_check`を一つのExclusive Transactionで実行し、失敗時に旧状態を残す。前半はCustomer-only Schemaに限定し、後半のTable追加時に`NATIVE_DATABASE_SCHEMA_VERSION`を更新する。Store公開前のDB再作成を許容し、Migration Recoveryは前半対象外とする。
- Contract Harnessは`scenario-shop-contract-<uuid>.db`と専用KV Prefixを使い、固定Customer Contract、FK違反、Cart add／update／remove、Application DBの必要最小限の不変確認を実行する。全Cleanupと不変確認が成功した後だけ`Native contract passed`を通知する。画面へ任意Exception／SQLは表示しない。
- ProductionではMetroの限定ResolverがAutomation／ProductionのNative Automation BridgeとHarness Screenを分離する。生成Android Hermes Bundle（`.hbc`）でAutomation Markerあり、Production Marker／`NativeTestControlService`なしを検査する。
- `.github/workflows/native-ci.yml`はPR／手動起動、Native変更時にUbuntu `ubuntu-24.04`／Android API 34 Emulator／compile SDK 36でDeep Link、Harness、Maestro Storefront／Cartを実行し、`native-ci / verify`へ集約する。`.github/workflows/native-ios-ci.yml`は`macos-26`／Xcode 26.4.1以上の手動Workflowで、初期段階ではRequired Checkへ含めない。
- 2026-08-03時点で、上記CIは定義済みだがGitHub Actions Runは未実施である。Windows上のAndroid SDK／`adb`／EmulatorおよびiOS Xcode／Simulatorも未提供のため、実Native Build／Install／操作／実`expo-sqlite` Smoke／Native screenshotは未確認である。Node／Web／生成Bundleの成功と実Native成功を混同しない。

## PR #8再レビュー修正（2026-08-03）

- GitHub Actions Native CI run `30775548618`の実態は、Detect／Native Static／Production Bundle Guardが成功、Android Jobが既存Workflowの`sdkmanager: command not found`で失敗、`native-ci / verify`も失敗である。これは修正後Workflowの成功実績ではない。
- Android Workflowは`ANDROID_SDK_ROOT`→`ANDROID_HOME`→`/usr/local/lib/android/sdk`の順でSDK Rootを解決し、`cmdline-tools`からsdkmanager絶対Pathを取得して、`ANDROID_HOME`／`ANDROID_SDK_ROOT`／PATHを後続Stepへ渡す。BuildはDebugではなくAutomation Release APKを使用し、OS boot完了とpackage service準備をTimeout付きで待つ。
- Native変更検知は共有Application／Domain／Seed／Config／Design Token／Generated／Manifest／Asset生成／Production Guardを含み、最終VerifyはDetect JobのResult、Native変更Output、Static／Production／AndroidのResultをFail-safeに確認する。
- Native RuntimeのPresentation公開型は前半対応MethodだけのFacade（Catalog: Home／Search／Detail／Category、Cart: Get／Add／Update／Remove）とし、`suggest`、`listReviews`、`acceptPriceChanges`を公開しない。Native SQLiteのGuest閲覧制限商品は`PERMISSION_DENIED`、不存在は`null`とする。
- Test Control ResetはSQLite Seed commit後にNative Control KV削除、Seed Identity復元、Clock、Payment Delayを更新する。Seed失敗時にKV／Identity／Clock／Delayを変更せず、Error Signalだけを通知する。
- Native Cartはload／mutation開始時にErrorをクリアし、Mutation中はCart全明細の数量変更／削除Buttonを無効にする。Component Testで再試行復旧と全Button無効化を固定する。
- MaestroはRestart Persistence、Dirty State Reset、Out-of-stock、Low-stock、Purchase Limitを独立Flowとして追加し、Screenshotは専用`--test-output-dir`へ収集する。iOS Workflowはmanual-onlyのRelease Simulator Buildへ揃える。
- 上記修正後WorkflowのGitHub Actions再実行、Windows Android Emulator、macOS iOS Simulator、実`expo-sqlite`証跡は、Commit／Push禁止またはToolchain不在のため未実施である。

## PR #8 Native CI再失敗修正（2026-08-03）

- 最新確認Runは`30780990538`。SDK解決／Installは成功したが、`Verify Android toolchain`で`emulator -version`が`libpulse.so.0`不足となり、Evidenceの旧`adb logcat -d`が接続待ちのままRunner shutdownまで停止した。
- `.github/workflows/native-ci.yml`は`libpulse0`を導入し、`ADB`／`EMULATOR`／`AVDMANAGER`／`APK_PATH`をSDK Rootから絶対Pathで解決して`GITHUB_ENV`へ保存する。SDK Path／adb／avdmanager／emulator診断を分割し、後続のAVD／Emulator／ADB／APK操作も絶対Pathへ統一する。
- Release APKは`APK_PATH`に集約し、Gradle出力を`gradle-assemble-release.log`へ保存する。EvidenceはADB Device確認、`logcat`のTimeout、Emulator／APK／JUnit／Maestro専用Artifactの存在分岐と3分Step Timeoutを持つ。Job Timeoutは50分とする。
- Native Product Detailは未選択時に`Variationを選択すると在庫を確認できます。`を表示し、在庫0／在庫ありを選択後だけ表示する。Out-of-stock Variationは選択できるがAddはdisabledとし、CartのLow-stock／Purchase-limit上限は同じdisabled／案内契約を使う。
- Native Runtimeは初期化Reject時に保持Promiseを解除し、Providerは同時初期化を防ぎながら再試行できる。実GitHub Actions再実行、Windows Android Emulator、macOS iOS Simulator、実`expo-sqlite`は未確認である。

## PR #8 Native CI処理順序・Runtime Cleanup修正（2026-08-03）

- 最新確認Runは`30785304641`（Commit `be27f8ff5b9ec5395cb9ce4e6a1f56a61cc2f8e3`）。Detect／Native Static／Production Bundle Guard／Android runtime dependencies／Expo Prebuild／Evidenceは成功したが、`Resolve Android SDK and sdkmanager`でSDK Component導入前の`ADB`／`EMULATOR`／`AVDMANAGER`存在確認が終了コード1となり、Install以降は未実施だった。
- Android ResolveはSDK Root、cmdline-tools、sdkmanagerの確認とPath生成／`GITHUB_ENV`／`GITHUB_PATH`保存だけを担当し、`ADB`／`EMULATOR`／`AVDMANAGER`の実在確認は`Install Android SDK components`後の`Verify Android SDK paths`へ限定する。Contract TestでResolve→Install→Verify paths→Verify adb→Verify avdmanager→Inspect emulator→Buildの順序と、Resolve内にTool検証がないことを固定する。
- Native RuntimeはDatabaseを開いた後の初期化処理を専用private helperで囲み、途中失敗時だけ`database.closeAsync()`を1回試行する。Cleanup失敗は握り潰して元の初期化Errorを再送出し、正常に返すRuntimeのDatabaseは閉じない。Jestで失敗／成功／Cleanup失敗の3契約を検証する。
- ローカルのformat／lint／typecheck／全Test／Native Contract／Repository／Asset／Security／Route／EAS static／Production Bundle／Web Build／Chromium／A11y／Mobile boundary／Expo Doctorは成功した。EAS Cloud、Commit／Push、修正後GitHub Actions、Windows Android実Native、macOS iOS実Native、実`expo-sqlite`は未実施のまま分離して扱う。

## PR #8 AVD永続化・PBKDF2契約修正（2026-08-03）

- 最新確認Headは`50411a63e643000a024d929b8869b240936ef56e`、Native CI Runは`30787501472`。SDK導入、APK生成、Bundle確認までは成功したが、Android Emulator Stepで`avdmanager create avd`がCustom hardware profile入力待ちになり、終了コード124で停止した。APK／SDK破損ではない。
- Android Workflowは`ANDROID_AVD_HOME=$RUNNER_TEMP/android-avd`を明示して作成・exportし、`avdmanager -p "$ANDROID_AVD_HOME/native-api34.avd"`、API 34／`google_apis;x86_64`、固定device profileを使う。作成後のAVDファイル列挙と`emulator -list-avds`の`native-api34`完全一致を起動前に要求する。
- EmulatorはPIDを保存し、ADB待機、`sys.boot_completed=1`、SDK／ABI確認、package service待機を分離し、各待機中にプロセス早期終了を検出する。失敗時もAVD home、AVD list、AVD files、emulator.log、ADB／boot／dumpsys／logcat／APK／Maestro／Signal証跡を回収する。
- Native Contract Harnessは専用DBのseed userから`password_hash`を取得し、`NativePbkdf2PasswordHasher`で`testpass1`の正誤、Unicode passwordの正誤を検証する。Application DB不変確認→PBKDF2→DB／KV cleanupの完了後にのみ`Native contract passed`を通知し、結果へ`checks.passwordHashing`を含める。password／hash値はログへ出さない。
- 今回のローカル検証ではUnit 13/66、Integration 9/91、Repository 5/28、Web Component 11/76、Native Jest 7/15、Contract 17/84、Chromium 27、A11y 4、Mobile boundary 4、Expo Doctor 17/17、静的Guard／Web Buildが成功した。Lintは0 errors／64 warnings。
- 修正後のGitHub Actions Run、Android SDK／adb／Emulator／Maestroによる実操作、iOS Simulator、実`expo-sqlite`は未実施である。EAS Cloud、Commit、Push、PR更新、`android/`／`ios/`のRepository追加は行わない。

## PR #8 CI復旧・Android CI高速化（2026-08-03）

- 最新確認Runは`30795820475`（Head `17d9d538a27058dcf81893d4d6f118cf36d52abf`）。Native Static／Production Bundle Guard／APK生成／Emulator起動／Evidence uploadは成功し、Android Jobは旧Workflowの`Install and launch APK`で`pidof`待機がexit 124となった。`native-ci / verify`はAndroid結果を受けて失敗し、Maestroは未実行である。Artifact `native-android-evidence-30795820475`（ID `8849743993`）のlogcatで、`NativeAutomationBridge`→`NativeTestControlRuntimeBridge`→`NativeAppRuntimeProvider`中の`RangeError: Maximum call stack size exceeded`を確認した。
- 原因はMetroのAndroid platform resolutionで`src/test-controls/native-signals.native.ts`から`./native-signals`を読み込む自己参照である。`native-signal-names.ts`へ定数／型を分離し、native／web双方がそこだけを参照する構造へ修正した。Native Jestの直接signal emission回帰Testと、native moduleが自己参照しないContract Testを追加した。
- Android Workflowは`android.needs: [detect]`としてNative Staticと並列化し、Production Bundle Guardは`[detect, static]`、最終Verifyは`[detect, static, production-bundle-guard, android]`を維持する。Gradle cache、条件付き`libpulse0`／SDK component導入、`prebuild --no-install`、x86_64専用Release APK、APK／ABI検査、Maestro cache、2つの責務別JUnit実行、成功時軽量／失敗時詳細Evidenceを定義した。AVD snapshot cacheは実測がないため採用せず、`-no-snapshot`を維持する。
- ローカルのformat／型チェック／Lint／Native Jest 8 suites・16 tests／今回のWorkflow・signal Contract 11 testsは成功した。VitestでNative Jest対象を直接起動する方法はReact Native Flow構文を扱えないため使用せず、`jest.config.cjs`を正式入口とする。既存Lint warningとReact `act` warningは残存するがerrorはない。
- 修正後WorkflowのGitHub Actions Run、Android Emulator／Maestro／Harness実証、WindowsローカルAndroid toolchain、macOS iOS toolchain、実`expo-sqlite`は未確認である。Commit／Push／PR更新／EAS Cloud実行は行わない。

## PR #8 Maestro CLI／Application Launch／Signal修正（2026-08-03）

- 最新確認Runは`30811624722`（HEAD `5fc9c14c7dc2975b6516e6fd2331cd1c7e0cc5b5`）。Native Static、Production Bundle Guard、Gradle Release APK、Emulator、APK Install、Application Launch、Evidence uploadはsuccessだったが、Cache Miss後の`Install pinned Maestro CLI`が旧`MAESTRO_VERSION=1.39.15`のURL HTTP 404／curl exit 22で失敗し、Maestro 2 Groupはskip、`native-ci / verify`はfail-closeした。
- GitHub公式Release APIと実Assetで、採用する固定Releaseを`cli-2.8.0`／`maestro.zip`、URLを`https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.8.0/maestro.zip`、HTTP 200と確認した。zipの実展開構造は`maestro/bin/maestro`のため、WorkflowのCache Hit検証、`--version`、PATHをその構造へ合わせた。Version／URL／Cache SchemaはWorkflow envへ集約し、Cache keyはOS／Version／Schema単位で分離する。
- Application Launchは`PACKAGE_ID`を共通化し、PID出現を最大60秒待ち、出現後6回・2秒間隔で10秒以上の継続稼働を確認する。Logcatは`Process: <package>`または`ReactNativeJS`に絞り、Fatal Exception、JavaScript Exception、Stack Overflow、Metro接続／Scriptロード失敗を検知する。
- Evidenceの正式Signal regexは`test-runtime-(ready|error)|native-contract-(running|passed|failed)`である。旧`native-test-runtime-ready`前提はContract Testで拒否する。
- ローカルのFormat／Lint（0 errors／64 warnings）／Typecheck／Native Component 8 suites・16 tests／Repository 5 files・28 tests／Contract 18 files・86 tests／Route 38／Production Bundle Guard／Workflow Bash構文は成功した。WindowsのJava／Android SDK／adb／Emulator不在により、ローカルMaestro`--version`、実APK操作、Maestro 10 Flowは未確認である。
- 修正後Remote Cache Miss／Hit、Maestro全Flow、Harness Signal、Evidence、`native-ci / verify`、Native CI全体時間は未確認である。Commit／Push／PR本文更新／EAS Cloud実行は行わない。

## PR #8 Native Test Control起動競合・受入テスト修正（2026-08-04）

- Native Runtimeの画面状態は`src/presentation/native/native-test-runtime-status.ts`の`NativeTestRuntimeStatus`と`RUNTIME_STATUS_LABELS`を正本とし、`booting`／`listening`／`resetting`／`ready`／`error`の固定文字列を使う。既存のService Signal（ready／error／contract）は診断・Contract互換性のため維持する。
- `NativeTestControlBridge`は`Linking.addEventListener("url", ...)`登録後に直接Callbackで`listening`を通知し、その後`Linking.getInitialURL()`を確認する。valid URLだけを処理中Setで排他し、Reset成功後に`router.replace()`、`ready`通知、失敗時`error`通知を行う。Unmount後はStatus／Navigationを更新しない。同一URLは処理完了後に再実行可能である。
- `NativeAutomationBridge`はDeviceEventEmitterのlistener登録順に依存せず、Bridge Callbackを直接画面へ接続する。Production disabled entryは従来どおりTest Control／Harnessをimportしない。
- Native Maestro 10 FlowはCold Start後に`launchApp`、`Scenario Shop`、`Native test runtime listening`待機、Reset `openLink`、`Native test runtime ready`待機の順序を持つ。固定Sleepや単純なtimeout延長は追加しない。`native-reset-dirty-state`の2回目Resetは既存listenerを使い、ready待機を維持する。
- iOS Manual WorkflowはFlow実行前の`xcrun simctl openurl`を削除し、Reset責務をMaestroへ統一した。Maestro CLIは確認済みのcli-2.8.0／`maestro.zip`／nested `maestro/bin/maestro`へ固定する。
- Bridge Component Testは9 tests、Maestro／iOS／Production境界Contractを追加した。実Nativeで古い画面Stateが観測されていないため、`dataRevision`／`resetGeneration`は未追加である。
- 2026-08-04のローカル検証はformat／lint（0 errors・64 warnings）／typecheck、Unit 66、Integration 91、Repository 28、Web Component 76、Native Jest 25、Contract 100、Route 38、Image／EAS static／Production Bundle、`test`、`build:web`、`verify`、Android `expo prebuild --no-install`が成功した。Java／Android SDK／adb／Emulator／Maestro／Xcode／Simulatorは未導入のため、実Android／iOS操作とRemote CIは未確認である。

## メモ

- この文書はプロジェクト固有の実態に合わせて上書きしてよい。
- 標準経路は host 上の `codex-safe` / `codex-task --run-id <run_id>`。Docker sandbox は experimental かつ opt-in。
