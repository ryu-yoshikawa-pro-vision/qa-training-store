# Phase 2 前半計画: Native基盤・SQLite・Guest購入前Flow

## 0. この計画の位置づけ

本書はPhase 2前半を一つの`/goal`で最後まで実施するための詳細実装契約です。

実行時は次を参照します。

1. `AGENTS.md`
2. `PLANS.md`
3. `docs/PROJECT_CONTEXT.md`
4. `docs/adr/`
5. `docs/plans/phase2-native-goal/00_master-roadmap.md`
6. 本書
7. `docs/future/phase2/`は参考資料としてのみ使用

Run開始時にRun Planと`.codex/runs/<run_id>/`を作成し、本書のGateとDoDをTaskへ展開します。矛盾時はMaster Planを優先します。

## 1. ゴール

最新Web実装のDomain、Application Use Case、業務ルール、DTO、Validation、Seedの意味を再利用し、次を完成させます。

- Web/Nativeで分離されたRoute、Root Layout、Shell、Composition Root
- Customer/Adminを分離したRepository CapabilityとTransaction Scope
- Application層からInfrastructure具象型への直接依存除去
- Native用`expo-sqlite` Customer Adapter
- Foreign Keyが有効なConnection初期化
- 通常アプリDBから隔離されたNative Contract Harness
- Web互換PBKDF2 Password Hasher
- `expo-sqlite/kv-store`を使うSession/Guest/Clock/Delay Storage
- Seed、Reset、Test Clock、Deep Link Test Control Version 1
- Native商品Asset Map
- `jest-expo`ベースのNative Component Test基盤
- Android/iOS向けHome、商品一覧、検索、Category、商品詳細、Cart
- Android Preview APKとiOS Preview Simulator Build
- `.eas/workflows/phase2-native-foundation.yml`

前半完了時には、Android/iOSでGuestが固定Seedの商品を探索し、商品詳細を確認し、Cartへ追加・変更・削除できる状態にします。

## 2. 開始条件

次を満たさない場合、この`/goal`を開始しません。

- Phase 1のWeb CIとCloudflare Deployが安定している。
- Android packageとiOS bundleIdentifierが正式決定している。
- Expo AccountとEAS Projectの利用方針が決まっている。
- `scenario-shop` Schemeを維持することが確認されている。
- Android Preview Buildを実行できる。
- iOS Simulator Buildを生成、インストール、起動する方法が決まっている。
- SecretとCredentialをRepositoryへ保存しない運用が決まっている。
- `expo-dev-client`とNative Crypto Moduleの導入を許容している。
- `jest`、`jest-expo`、`@testing-library/react-native`の導入を許容している。
- EAS Workflowsの利用可否と、利用不能時のAndroid/iOS代替実行環境が決まっている。
- Native Buildの費用上限と実行頻度が決まっている。

開始時にExpo SDK 57、Expo Router、`expo-sqlite`、EAS Workflows、`jest-expo`、`react-native-quick-crypto`の一次資料を再確認します。既定方針を変更する場合は、コード変更前にADRへ記録します。

## 3. 完了条件（DoD）

### 3.1 Route / Presentation

- `app/_layout.tsx`をNative標準Root、`app/_layout.web.tsx`をWeb専用Rootとしている。
- 全`app/` RouteがRoute Inventoryへ分類されている。
- Route Fileは薄いWrapperで、Platform別Screen Moduleを呼び出す。
- Native RouteがWeb専用ScreenをImportしていない。
- Native依存グラフにCSS、DOM、React Aria、Dexie、Browser Storage、Browser Test API、`*.web.ts(x)`がない。
- Nativeで`/admin/*`へ遷移してもWeb ModuleをLoadしない。
- Webの既存URL契約を維持している。
- 後半対象Routeは安全な準備中/対象外画面を返す。

### 3.2 Dependency / Capability / Transaction Scope

- `src/application/**`から`src/infrastructure/**`への直接Importを除去している。
- Use Case Constructorが具象Databaseを受け取らない。
- Customer/Adminが混在するRepository Interfaceを必要なCapabilityへ分離している。
- Customer Use CaseはCustomer Capabilityだけへ依存する。
- Native SQLite AdapterにAdmin Methodのダミー実装がない。
- Web Dexie Adapterは既存Customer/Admin機能を維持している。
- Customer/Admin Transaction Scopeが分離されている。
- Native Composition RootはCustomer Transaction Runnerだけを生成する。
- Architecture/Type Testが依存方向とScope境界を検証する。

### 3.3 Transaction Runner

- SQLite書込みは`withExclusiveTransactionAsync()`を使用する。
- Transaction内のQueryはTransaction Objectだけで実行する。
- Callback結果はCommit成功後だけ返す。
- Commit失敗時に結果を返さない。
- 正当な`undefined`と未完了を区別する。
- Transaction RepositoryをCallback外へ持ち出さない。
- Queue待機とLock待機に上限がある。
- 非冪等Mutationを自動Retryしない。
- `database is locked`を無限Retryしない。

### 3.4 SQLite / Foreign Key

- `expo-sqlite`を利用している。
- `android/`と`ios/`をCommitしていない。
- Native購入者版の最終Flowに必要なTable、Index、Constraintを前半で作成している。
- Customer Repository CapabilityをSQLite Adapterで実装している。
- Admin QueryとAdmin Use CaseをNative Composition Rootへ組み込んでいない。
- 全Application/Harness Connectionで`PRAGMA foreign_keys = ON`を実行する。
- `PRAGMA foreign_keys`の戻り値`1`を確認する。
- Seed後とContract Suiteで`PRAGMA foreign_key_check`が成功する。
- FK違反が実際に失敗するContract Testがある。
- FK ActionをTable単位でSchema文書へ記録している。
- WebとNativeのSchema Versionを分離している。
- 後半でSchemaとCustomer Capabilityを原則変更せず利用できる。

### 3.5 Repository Contract / Harness隔離

- Adapter Factoryを受け取るCustomer Repository共通Contract Suiteがある。
- DexieとSQLiteで同じFixture、Seed、期待値を利用する。
- Dexie SuiteはVitestで成功する。
- SQLiteのSchema/Mapper/SQL TestはNode/PRで成功する。
- Androidで実SQLite Customer Contract Suiteが成功する。
- iOS Simulatorで主要Contract Smokeが成功する。
- MockやNode代替結果を実SQLite成功として記録しない。
- Harnessは`scenario-shop-contract-<runtime-uuid>.db`を使用する。
- HarnessはApplication RuntimeのRepository/Connectionを再利用しない。
- 成功/失敗を問わずConnectionを閉じ、Test DBを削除する。
- Cleanup失敗をHarness失敗として扱う。
- Harness前後でApplication DBのDatabase名、Schema Version、Seed Version、固定Sentinel 1件が変化していない。
- 全Table Fingerprintや全件数比較を実装していない。
- Harnessは通常アプリKV Namespaceを変更しない。

### 3.6 Password Hash / Crypto隔離

- WebとNativeのPassword HasherをPlatform別Moduleへ分離している。
- Encoded Format ParserとTest VectorをPlatform非依存Moduleへ分離している。
- `react-native-quick-crypto`を共有Entry PointへImportしていない。
- Global Crypto PolyfillとMetro全体のAliasを原則使用していない。
- Config Plugin、Autolinking、`expo-doctor`が成功する。
- Web BundleへNative Cryptoが混入していない。
- 次の既存形式を維持している。

```text
pbkdf2-sha256$210000$<salt-base64>$<hash-base64>
salt: 16 bytes
hash: 32 bytes
```

- Web/Android/iOSの固定Test Vectorが成功する。
- 既存Seed HashをAndroid/iOSでVerifyできる。
- Native生成HashをWebでVerifyできる。
- Unicodeと性能Smokeが成功する。

### 3.7 Native KV Storage

次のKeyを`expo-sqlite/kv-store`で永続化する。

```text
scenario-shop.native.session-id.v1
scenario-shop.native.guest-id.v1
scenario-shop.native.test-clock.v1
scenario-shop.native.payment-delay.v1
```

- Globalな`localStorage` Polyfillを導入していない。
- Application/PresentationがKV Storeを直接Importしない。
- Resetで対象Keyを削除し、Scenario値を再設定できる。
- App再起動後にSession/Guest IDを復元できる。
- 不正Sessionを削除し、安全にGuestへ戻す。
- Storage Errorを握り潰さない。
- Harnessは別Namespaceを使う。

### 3.8 Native Component Test

- `jest`、`jest-expo`、`@testing-library/react-native`を使用する。
- `preset: "jest-expo"`を使用する。
- `react-test-renderer`を導入していない。
- Native TestでDOM/jsdomを使わない。
- Web Component TestはVitestを継続する。
- Expo Moduleの追加Mockは必要最小限である。
- SQLite/PBKDF2の実Native検証をComponent Testで代替していない。
- `test:component:web`、`test:component:native`、統合`test:component`が定義される。

### 3.9 Test Control / Harness

- Test Control Version 1を実装している。
- Scenario Allowlist、ISO Clock、Payment Delay上限をValidationする。
- Reset処理をMutexで直列化し、二重Requestを拒否する。
- Reset時にDatabase、Session、Guest、Clock、Delayを決定的に初期化する。
- Reset完了後にScenario既定Routeへ遷移する。
- `test-runtime-ready`と`test-runtime-error`がある。
- Arbitrary SQL、任意Entity/Status変更を追加していない。
- HarnessはDevelopment/Preview専用で、定義済みSuiteだけを実行する。
- `native-contract-running`、`native-contract-passed`、`native-contract-failed`がある。
- Production-validationでTest ControlとHarnessを利用できない。

### 3.10 Guest購入前Flow

Android/iOSで次が動作する。

- Home
- 商品一覧、キーワード検索、Category導線
- Nativeで成立するFilter/Sort
- 商品詳細、画像、Placeholder
- 通常価格、Sale、在庫、Review Summary
- Variation選択
- Cart追加、数量変更、明細削除
- Empty Cartから商品探索へ戻る
- 在庫不足、購入上限、Not Found
- App再起動後のGuest IdentityとCart復元

主要状態をSeedで決定的に再現できる。

### 3.11 Asset

- Native Asset MapをBuild Scriptで生成する。
- Asset Mapは静的`require`または静的Importを含む。
- Runtime文字列を`require`していない。
- Web ManifestとNative Asset MapのAsset ID集合が一致する。
- PlaceholderをNative Bundleへ同梱する。
- Snapshot PathとNative Image Sourceを分離する。

### 3.12 Build / EAS / CI

EAS ProfileはMaster PlanのProfile、`environment`、`EXPO_PUBLIC_*` envを使用する。

- `.eas/workflows/phase2-native-foundation.yml`がある。
- Preview Build/Maestro Jobは`environment: preview`を使う。
- Production-validation Jobは`environment: production`を使う。
- Android Preview APKを生成、インストール、起動できる。
- AndroidでHomeからCartまで操作できる。
- iOS Preview Simulator Buildを生成、インストール、起動できる。
- iOSでHomeからCart追加まで操作できる。
- Android Production-validation BuildでTest Control/Harness無効を確認する。
- iOS Production設定のBundle/Config静的検証が成功する。
- iOS Production-validation実BuildはPlatform固有差分がある場合だけ実施する。
- Production-validation Metadataが次と一致する。

```text
extra.appEnvironment === "production"
extra.buildKind === "production"
extra.testMode === "false"
```

- Native Component TestとWeb既存Test/Build/Playwrightが成功する。
- Critical/Highの既知不具合が残っていない。

## 4. 対象

- Route InventoryとPlatform Route分離
- `app/_layout.tsx`と`app/_layout.web.tsx`
- Platform別Shell/Screen Module
- Application依存方向修正
- Repository CapabilityとTransaction Scope分離
- Web/Native Composition Root
- SQLite Adapter、Connection Initializer、Customer Repository
- Shared Contract Suiteと専用Harness DB/KV
- Native Session/Guest/Clock/Delay Storage
- Native PBKDF2 Adapter
- Seed、Reset、Deep Link Test Control
- Native商品Asset Map
- Home、商品一覧、検索、Category、商品詳細、Cart
- Native対象外Role画面
- `jest-expo`ベースNative Component Test
- EAS Profileと前半Workflow
- Android Preview APK、iOS Preview Simulator Build
- ADR、PROJECT_CONTEXT、Native手順

## 5. 対象外

- Login UIの完成
- Account、Profile、配送先UI
- Checkout、Payment、Order、Review UI
- 業務FlowのMaestro本格実装
- Store公開、EAS Submit、Native Admin
- Password変更、退会、Guest Checkout
- Cancel、Return、Refund
- Migration Recovery、Crash Point、Phase 3機能
- `android/`/`ios/`のCommit
- 全DB Fingerprint基盤

## 6. 実装順序と内部品質ゲート

Gateは同一`/goal`内の実行制御です。別フェーズや別PRではありません。

### Gate A: Route / Native Bundle

実施:

- Route Inventory
- `app/_layout.tsx` / `app/_layout.web.tsx`
- Platform別Shell/Screen Module
- Native Route Dependency Check

完了条件:

- Android/iOS向けNative最小画面をBundleできる。
- `/admin/*`がWeb ModuleをLoadしない。
- Web URL回帰が成功する。

### Gate B: Dependency / Capability / Security / Storage / Test Runner

実施:

- Application依存方向修正
- Customer/Admin CapabilityとScope分離
- Web/Native Composition Root
- PBKDF2 Platform分離
- KV Storage Adapter
- `jest-expo`環境

完了条件:

- Architecture/Type Test成功
- Web Composition Root回帰成功
- Native Composition Root生成可能
- PBKDF2固定Test Vector成功
- KV Storage Adapter Test成功
- Native Component Test基盤成功

### Gate C: SQLite / Contract

実施:

- Schema、Mapper、Connection Initializer
- Transaction Runner
- Shared Contract Suite
- 専用Harness DB/KV

完了条件:

- Foreign Key Enforcementと`foreign_key_check`成功
- Transaction戻り値契約Test成功
- Dexie Shared Contract成功
- Android実SQLite Contract成功
- iOS主要Contract Smoke成功
- Harness CleanupとApplication DB Sentinel確認成功

### Gate D: Asset / Test Control / Production-validation基礎

実施:

- Native Asset Map
- Deep Link Reset
- Contract Harness画面
- EAS Profileと前半Workflow

完了条件:

- Asset Contract成功
- Reset、二重Request拒否、Ready/Error Signal成功
- Android Production-validationでTest Control/Harness無効
- iOS Production設定の静的検証成功

### Gate E: Android Vertical Slice

- Preview APKを生成、起動できる。
- Home、検索/一覧、商品詳細、Cart追加/変更/削除が動作する。
- Empty、Not Found、在庫不足、上限を確認できる。
- Resetと再起動保持が成立する。

### Gate F: iOS Vertical Slice

- Preview Simulator Buildを生成、起動できる。
- Home、検索/一覧、商品詳細、Cart追加が動作する。
- Resetと再起動保持が成立する。
- 実SQLite/PBKDF2/Storage Smokeが成功する。

### Gate G: 総合回帰

- 全Native Test成功
- Web全Test/Build/Playwright成功
- 前半EAS Workflowまたは代替経路の結果記録
- `android/`/`ios/`未Commit
- Critical/High解消

各Gate終了時に、実施内容、検証結果、失敗と修正、Android/iOS差分、未確認事項、次Gateへ進める根拠をRun Artifactへ記録します。

## 7. 後半へ引き渡す確定契約

- Route InventoryとPlatform Route方式
- Root LayoutとPlatform別Shell
- Application依存方向
- Customer/Admin Repository CapabilityとTransaction Scope
- Native Composition Root注入契約
- SQLite Schema Version、FK Action、Connection初期化
- Transaction Runner契約
- Shared Contract Suite、Harness DB/KV形式、Sentinel確認
- Session/Guest/Clock/Delay Keyと形式
- PBKDF2 Library、隔離方式、Format、Test Vector
- `jest-expo`設定
- Deep Link Protocol Version 1
- Native Asset Map形式
- Stable Test ID規約
- CNG方針
- EAS Profile、Environment、env
- `.eas/workflows/phase2-native-foundation.yml`
- 未確認事項と残課題

## 8. 成果物

- Platform/Route/Composition Root ADR
- SQLite/Transaction/Test Strategy ADR
- Platform別Root Layout、Shell、Screen Module
- Customer/Admin Repository CapabilityとTransaction Scope
- Web/Native Composition Root
- SQLite Customer AdapterとConnection Initializer
- Shared Contract Suiteと専用Harness
- Native KV StorageとPBKDF2 Adapter
- Seed/Reset/Deep Link Test Control
- Native Asset Map生成処理
- Native Storefront/Product/Cart
- Native Component Test設定とTest
- EAS Profile、`.eas/workflows/phase2-native-foundation.yml`
- Android Preview APK、iOS Preview Simulator Build
- 更新済みREADME/PROJECT_CONTEXT/Native手順
- History、Run Artifact、後半引継ぎ一覧

## 9. 停止条件

前半DoDとGate A〜Gを満たしても、Login UI、Account、Checkout、Order、Review、購入系Maestro、後半Workflowへ進みません。

最終報告で次を区別します。

- Android/iOS Build・起動・操作結果
- 実SQLite Contract結果
- Harness隔離・Cleanup・Sentinel結果
- Foreign Key Enforcement結果
- PBKDF2互換結果
- Native KV Storage結果
- Native Component Test結果
- Test Control/Harness結果
- EAS Profile/Environment/Metadata結果
- Web回帰結果
- 未確認事項
- 後半を開始できるか
