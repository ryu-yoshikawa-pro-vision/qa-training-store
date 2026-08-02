# Phase 2 前半計画: Native基盤・SQLite・Guest購入前Flow

## 0. この計画の位置づけ

本書はPhase 2前半を一つの`/goal`で最後まで実施するための詳細な実装契約です。

実行時は次を必ず参照します。

1. `AGENTS.md`
2. `PLANS.md`
3. `docs/PROJECT_CONTEXT.md`
4. `docs/adr/`
5. `docs/plans/phase2-native-goal/00_master-roadmap.md`
6. 本書
7. `docs/future/phase2/`は参考資料としてのみ使用

Run開始時にタイムスタンプ付きRun Planと`.codex/runs/<run_id>/`を作成し、本書のGateとDoDをRun Taskへ展開します。矛盾時はMaster Planを優先します。

## 1. ゴール

最新Web実装のDomain、Application Use Case、業務ルール、DTO、Validation、Seedの意味を再利用し、次を完成させます。

- Web/Nativeで分離されたRoute、Root Layout、Shell、Composition Root
- Customer/Adminを分離したRepository CapabilityとTransaction Scope
- Application層からInfrastructure具象型への直接依存除去
- Native用`expo-sqlite` Customer Adapter
- Foreign KeyがConnection単位で有効なSQLite初期化
- 通常アプリDBから隔離されたNative Contract Harness
- Web互換PBKDF2 Password Hasher
- `expo-sqlite/kv-store`を使うNative Session/Guest/Clock/Delay Storage
- Seed、Reset、Test Clock、Deep Link Test Control Protocol Version 1
- Native商品Asset Map
- JestベースのNative Component Test基盤
- Android/iOS向けHome、商品一覧、検索、Category、商品詳細、Cart
- Android Preview APKとiOS Simulator Build
- `.eas/workflows/phase2-native-foundation.yml`

前半完了時には、Android/iOSでGuestが固定Seedの商品を探索し、商品詳細を確認し、Cartへ追加・変更・削除できる状態にします。

## 2. 開始条件

次を満たさない場合、この`/goal`を開始しません。

- Phase 1のWeb CIとCloudflare Deployが安定している。
- Android packageが正式決定している。
- iOS bundleIdentifierが正式決定している。
- Expo AccountとEAS Projectの利用方針が決まっている。
- `scenario-shop` Schemeを維持することが確認されている。
- Android Development/Preview Buildを実行できる。
- iOS Simulator Buildを生成、インストール、起動する方法が決まっている。
- SecretとCredentialをRepositoryへ保存しない運用が決まっている。
- `expo-dev-client`とNative Crypto Moduleの導入を許容している。
- Jest、`@react-native/jest-preset`、`@testing-library/react-native`の導入を許容している。
- EAS Workflowsを利用できるか、利用不能時のAndroid/iOS実行環境が決まっている。
- Native Buildの費用上限と実行頻度が決まっている。

開始時にExpo SDK 57、Expo Router、`expo-sqlite`、EAS Workflows、Native Component Test、`react-native-quick-crypto`の一次資料を確認します。既定方針を変更する必要がある場合は、コード変更前にADRへ記録します。

## 3. 完了条件（DoD）

### 3.1 Route / Presentation

- Native標準Root Layoutとして`app/_layout.tsx`が存在する。
- Web専用Root Layoutとして`app/_layout.web.tsx`が存在する。
- `app/_layout.native.tsx`を必須構成としていない。
- 全`app/` RouteがRoute Inventoryへ分類されている。
- Route Fileは薄いWrapperで、Platform別Screen Moduleを呼び出す。
- Native Route ModuleがWeb専用Screen ModuleをImportしていない。
- Native BundleがCSS、DOM、React Aria、Dexie、Browser Storage、Browser Test API、`*.web.ts(x)`へ依存していない。
- Nativeで`/admin/*`へ遷移してもWeb ModuleをLoadしない。
- Webの既存URL契約が維持されている。
- Native後半対象Routeは安全な準備中/対象外画面を返し、Web ModuleをImportしない。

### 3.2 Dependency Direction

- `src/application/**`から`src/infrastructure/**`への直接Importが除去されている。
- `src/domain/**`からApplication/Infrastructureへの逆依存がない。
- Use Case Constructorが具象Databaseを受け取らない。
- `SessionIdentityResolver`を含むIdentity解決がRepository Capabilityへ依存する。
- Architecture TestまたはStatic Checkが依存違反を検出する。

### 3.3 Repository Capability

- Customer/Adminが混在するRepository Interfaceが必要なCapabilityへ分離されている。
- Customer Use CaseはCustomer Capabilityだけへ依存する。
- Native SQLite AdapterがAdmin Methodをダミー実装していない。
- Web Dexie Adapterは既存Customer/Admin機能を維持している。
- Interface分離によってDomainルール、Application Error、DTOの意味が変わっていない。

最低限、次が分離されていること。

- Customer User/AuthとAdmin User Search/Management
- Customer Product ReadとAdmin Product Mutation
- Customer Inventory Read/Order MutationとAdmin Inventory Management
- Customer ReviewとAdmin Review Moderation

### 3.4 Transaction Scope / Runner

- `CustomerTransactionScopeMap`と`AdminTransactionScopeMap`、または同等の型境界がある。
- Native Composition RootはCustomer Transaction Runnerだけを生成する。
- Native側にAdmin Transaction Scopeのダミー実装がない。
- Customer Use CaseがAdmin Scopeを参照しない。
- Web側はCustomer/Admin双方の既存操作を維持する。
- Architecture/Type TestがScope境界を検証する。
- SQLite書込みは`withExclusiveTransactionAsync()`を使用する。
- Transaction内のQueryはTransaction Objectだけで実行される。
- Callback結果はCommit成功後だけApplicationへ返る。
- Commit失敗時にCallback結果を返さない。
- 正当な`undefined`と未完了を区別する。
- Transaction RepositoryをCallback外へ持ち出さない。
- Mutation QueueとLock待機に上限がある。
- 非冪等Mutationを自動Retryしない。
- `database is locked`を無限Retryしない。

### 3.5 SQLite / Foreign Key

- `expo-sqlite`を利用している。
- `android/`と`ios/`がRepositoryへCommitされていない。
- Native購入者版の最終Flowに必要なTable、Index、Constraintが前半で作成されている。
- Customer Repository CapabilityがSQLite Adapterで実装されている。
- Admin専用QueryとAdmin Use CaseをNative Composition Rootへ組み込んでいない。
- 全Application/Harness Connectionで`PRAGMA foreign_keys = ON`が実行される。
- Connection初期化時に`PRAGMA foreign_keys`の戻り値`1`を確認する。
- Seed後とContract Suiteで`PRAGMA foreign_key_check`が成功する。
- Foreign Key違反が実際に失敗するContract Testがある。
- FK ActionがTableごとにSchema文書へ記録されている。
- Commit/Rollback、Unique、Foreign Key、Version Conflict、Sort、Page、Facet、Snapshotが検証されている。
- WebとNativeのSchema Versionが分離されている。
- 後半でSchemaとCustomer Capabilityを原則変更せず利用できる。

### 3.6 Repository Contract Test / Harness隔離

- Adapter Factoryを受け取るCustomer Repository共通Contract Suiteがある。
- DexieとSQLiteで同じFixture、Seed、期待値を利用する。
- Dexie SuiteはVitestで成功する。
- SQLiteのSchema/Mapper/SQL TestはNode/PRで成功する。
- 実SQLite Contract SuiteはAndroid Build上で成功する。
- iOS Simulatorでも実SQLiteの主要Contract Smokeが成功する。
- MockやNode代替結果を実SQLite成功として記録していない。
- Platform差がある場合は除外表と根拠がある。
- Harnessは通常アプリDBと異なる`scenario-shop-contract-<run-id>.db`を使用する。
- Harness DB名はFilename-safeに正規化される。
- Harness開始前に同名Test DBを削除する。
- HarnessはApplication RuntimeのRepository/Connectionを再利用しない。
- 成功/失敗を問わずConnectionを閉じ、Test DBを削除する。
- Cleanup失敗をHarness失敗として扱う。
- Harness前後でApplication DBのSchema/Seed Versionと主要Table Fingerprintが変化していない。
- Harnessは通常アプリKV Namespaceを変更しない。

### 3.7 Password Hash / Crypto隔離

- `password-hasher.web.ts`が既存Web Crypto APIを維持している。
- `password-hasher.native.ts`がNative CryptoのPBKDF2 APIだけを直接利用している。
- Encoded Format ParserとTest VectorがPlatform非依存Moduleに分離されている。
- `react-native-quick-crypto`が共有Entry PointへImportされていない。
- Global `install()`とMetro全体の`crypto` Aliasを原則使用していない。
- Config Plugin、Autolinking、Native Dependencyが正しく設定されている。
- `expo-doctor`が成功する。
- Web BundleへNative Cryptoが混入していない。
- 次の既存形式を維持している。
  - `pbkdf2-sha256`
  - 210,000 iterations
  - 16-byte salt
  - 32-byte hash
  - 既存Base64形式
- Web/Android/iOSの固定Test Vectorが成功する。
- 既存Seed HashをAndroid/iOSでVerifyできる。
- Android/iOSで生成したHashをWebでVerifyできる。
- Hash/Verify性能が操作不能な水準ではない。

### 3.8 Native KV Storage

- Native Session、Guest ID、Test Clock、Payment Delayが`expo-sqlite/kv-store`で永続化される。
- Globalな`localStorage` Polyfillを導入していない。
- 固定Keyが使用される。

```text
scenario-shop.native.session-id.v1
scenario-shop.native.guest-id.v1
scenario-shop.native.test-clock.v1
scenario-shop.native.payment-delay.v1
```

- Application/PresentationがKV Storeを直接Importしない。
- Resetで対象Keyを削除し、Scenario値を再設定できる。
- App再起動後にSession/Guest IDを復元できる。
- 不正Sessionは削除され、Guestへ安全に戻る。
- Storage Errorを握り潰さない。
- Contract Harnessは別Namespaceを使用し、通常Keyを変更しない。

### 3.9 Testability / Test Control

- 既存Scenarioの意味を維持してNative SQLiteへSeedできる。
- Reset時にDatabase、Session、Guest Identity、Clock、Payment Delayが決定的に初期化される。
- Test Control Protocol Version 1が実装されている。
- Scenario Allowlist、ISO Clock、Payment Delay上限がValidationされる。
- Reset処理がMutexで直列化される。
- 二重Requestが明示的に拒否される。
- Reset完了後にScenario既定Routeへ移動する。
- `test-runtime-ready`と`test-runtime-error`のStable Test IDがある。
- Arbitrary SQL、任意Entity更新、任意Status変更が追加されていない。
- Production-validationでTest Control Deep Link、Service、UI、Handlerを利用できない。

### 3.10 Native Contract Harness

- Development/Preview専用のHarness画面またはRouteがある。
- Harnessは状態変更APIではなく、定義済みContract Suiteの実行入口である。
- MaestroからUI操作で実行できる。
- Arbitrary SQLや任意Test選択を許可しない。
- `native-contract-running`、`native-contract-passed`、`native-contract-failed`がある。
- Failure時にSuite名と非機密Error Codeを表示する。
- 専用Test DBと専用KV Namespaceだけを使用する。
- Production-validationではHarnessを利用できない。

### 3.11 Native Component Test

- Jest、`@react-native/jest-preset`、`@testing-library/react-native`を使用する。
- 導入時に必要な場合、Reactと完全一致する`react-test-renderer`を使用する。
- Native TestでDOM/jsdomを使わない。
- Web Component TestはVitestを継続する。
- Native Module Mockは必要最小限である。
- SQLite/PBKDF2の実Native検証をComponent Testで代替していない。
- `test:component:web`、`test:component:native`、統合`test:component`が定義される。

### 3.12 Guest購入前Flow

Android/iOSで次が動作する。

- Home
- 商品一覧
- キーワード検索
- Category一覧/導線
- Nativeで成立するFilter/Sort
- 商品詳細
- 商品画像とPlaceholder
- 通常価格、Sale、在庫、Review Summary
- Variation選択
- Cart追加
- 数量変更
- 明細削除
- Empty Cartから商品探索へ戻る
- 在庫不足
- 購入上限
- Not Found
- App再起動後のGuest IdentityとCart復元

主要状態をSeedで決定的に再現できます。

### 3.13 Asset

- Native Asset MapがBuild Scriptで生成される。
- Asset Mapは静的`require`または静的Importを含む。
- Runtime文字列を`require`していない。
- Web ManifestとNative Asset MapのAsset ID集合が一致する。
- PlaceholderがNative Bundleへ同梱されている。
- Product/Order Snapshot PathとNative Image Sourceが分離されている。

### 3.14 Build / EAS / CI

- `expo-dev-client`が導入されている。
- Development/Previewは次のenvを使用する。

```text
EXPO_PUBLIC_APP_ENV=automation
EXPO_PUBLIC_BUILD_KIND=automation
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_DEFAULT_SEED=default
```

- Production-validationは次のenvを使用する。

```text
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_BUILD_KIND=production
EXPO_PUBLIC_TEST_MODE=false
EXPO_PUBLIC_DEFAULT_SEED=default
```

- Production-validation Metadataが`production / production / false`である。
- `.eas/workflows/phase2-native-foundation.yml`がある。
- Android Preview APKを生成、インストール、起動できる。
- AndroidでHomeからCartまで操作できる。
- iOS Simulator Buildを生成、インストール、起動できる。
- iOS SimulatorでHomeからCart追加まで操作できる。
- EAS Workflowsまたは明示した代替実行環境で実SQLite Harnessを実行できる。
- Native Component Testが成功する。
- Web Format、Lint、Typecheck、Unit、Integration、Repository、Component、Contract、Build、Playwright主要Flowが成功する。
- Critical/Highの既知不具合が残っていない。

## 4. 対象

- Route InventoryとPlatform Route分離
- `app/_layout.tsx`と`app/_layout.web.tsx`
- Platform別Shell/Screen Module
- Application/Infrastructure依存方向修正
- Repository Capability分離
- Customer/Admin Transaction Scope分離
- Web/Native Composition Root
- Native Session、Guest Identity、Password Hash、ID、Clock、Notice、Reload相当
- `expo-sqlite` AdapterとConnection Initializer
- Customer Repository一式
- Shared Contract Suite
- 専用DBを使うNative SQLite Test Harness
- Seed、Reset、Test Clock、Deep Link Test Control
- Native商品Asset Map
- Home、商品一覧、検索、Category、商品詳細、Cart
- Native対象外Role画面
- JestベースNative Component Test
- EAS Development/Preview/Production-validation初期設定
- `.eas/workflows/phase2-native-foundation.yml`
- Android Preview APK
- iOS Simulator Build
- ADR、PROJECT_CONTEXT、Native設計・検証文書

## 5. 対象外

- Login UIの完成
- Account、Profile、配送先UI
- Checkout、Payment、Order、Review UI
- 業務FlowのMaestro本格実装
- Store公開、EAS Submit
- Native Admin
- Password変更、退会、Guest Checkout
- Cancel、Return、Refund
- Migration Recovery、Crash Point、Phase 3機能
- `android/`/`ios/`のCommit

## 6. 実装方針

### 6.1 Route InventoryとRoute Wrapper

最初に`app/`配下を全件列挙し、次の表をRun Planまたは補足文書へ作成します。

| Route | Web | Native前半 | Native後半 | Native対象外 | Wrapper方式 | 備考 |
|---|---:|---:|---:|---:|---|---|

規則:

- `app/_layout.tsx`をNative標準Root Layoutとする。
- `app/_layout.web.tsx`をWeb専用Root Layoutとする。
- Route Fileへ業務ロジックを置かない。
- Web専用RouteはWeb Screen Moduleだけを参照する。
- Native RouteはNative Screen Moduleだけを参照する。
- Native後半対象Routeは安全な準備中/対象外画面を返す。
- Admin RouteはNative対象外画面かRedirectとする。
- Not FoundとDeep Link失敗時の復帰先を定義する。

### 6.2 Dependency / Capability / Transaction Scope

次を禁止します。

```text
src/application/** -> src/infrastructure/**
src/domain/** -> src/application/**
src/domain/** -> src/infrastructure/**
Native Screen -> *.web.ts(x)
Native Screen -> Dexie/Browser API
```

Application Constructorへ具象Databaseを渡さず、必要なCapabilityとPortを渡します。Customer/Admin CapabilityとScopeを分離し、NativeへCustomer側だけを注入します。

### 6.3 SQLite Connection / Schema / Transaction

Connection初期化順:

1. Database Open
2. `PRAGMA foreign_keys = ON`
3. `PRAGMA foreign_keys`が`1`であることを確認
4. Schema Version確認/初期作成
5. Repository生成

SchemaではForeign Key Action、Unique、Index、Sort tie-breakを明示します。TransactionはExclusive Transaction Objectだけを使い、Callback結果をCommit後に返します。

### 6.4 Shared Contract Suite / Harness

```ts
createCustomerRepositoryContractSuite({
  createAdapter,
  reset,
  close,
});
```

Harnessは専用DBと専用KV Namespaceを生成し、Application Runtimeから完全に隔離します。開始前削除、終了後Cleanup、Application DB不変確認までをSuite実行の一部とします。

### 6.5 PBKDF2 / Storage

PBKDF2はPlatform別Moduleへ隔離し、Native Storageは`expo-sqlite/kv-store`へ固定します。Global Polyfillを導入せず、ResetとApp再起動の契約をAdapter Testと実Native Smokeで確認します。

### 6.6 Native Component Test

VitestとJestの責務を分離します。

```text
Vitest: Domain/Application/Dexie/SQLite Node/Web Component
Jest: Native Component/Hook/Presentation
```

Native Test Config、Module Mock方針、Scriptを文書化します。

### 6.7 Test Control Protocol

```text
scenario-shop://test-control/reset?version=1&scenario=<id>&clock=<iso>&paymentDelayMs=<ms>
```

前半でReset、Scenario、Clockを完成させます。`paymentDelayMs`のParser/Storage契約は前半で実装し、購入Flowでの利用完成は後半です。

Reset処理順:

1. Request Validation
2. Mutex取得
3. RuntimeをReset中状態へ変更
4. Active DB処理終了待ち
5. DB Close
6. DB再作成
7. Seed投入と`foreign_key_check`
8. Session/Guest/Clock/Delay設定
9. Application Service再生成
10. Scenario既定Routeへ遷移
11. Ready Signal表示
12. Mutex解放

### 6.8 EAS Profile / Workflow

`eas.json`の各ProfileにMaster Planの`EXPO_PUBLIC_*` envを明示します。Test Control ON/OFFの正本はenvと`app.config.ts`の解決結果です。

前半で次を作成します。

```text
.eas/workflows/phase2-native-foundation.yml
```

Workflow責務:

- Android Preview Build
- iOS Simulator Build
- AndroidでNative Contract Harness実行
- iOSで主要Contract Smoke実行
- Android/iOSのStorefront/Cart Smoke
- Production-validation MetadataとTest Control/Harness無効確認

## 7. Test方針

### PR / GitHub Actions

- Format/Lint/Typecheck
- Domain/Application Test
- Architecture Dependency Test
- Repository Capability/Transaction Scope Type Test
- Dexie Shared Contract Suite
- SQLite Schema/Mapper/SQL/Foreign Key Test
- Seed Dataset Test
- PBKDF2 Parser/Test VectorのPlatform非依存部
- Asset Map Contract
- Web Component Test
- Native Component Test
- Production Test Control Static Check
- Web既存Test/Build/Playwright

### Android Build Runtime

- Native Bundle
- PBKDF2 Compatibility
- 実SQLite Contract Suite
- Harness DB/KV隔離
- Foreign Key Enforcement
- Seed/Reset
- Deep Link
- Home〜Cart Vertical Slice
- App再起動後保持

### iOS Simulator Runtime

- Native Bundle
- PBKDF2 Compatibility
- 実SQLite Contract Smoke
- Harness DB/KV隔離
- Foreign Key Enforcement
- Seed/Reset
- Home〜Cart追加Vertical Slice
- App再起動後保持

## 8. 内部品質ゲート

### Gate A: Route / Native Bundle

- Route Inventory完成
- `app/_layout.tsx` / `app/_layout.web.tsx`完成
- Native最小ScreenがAndroid/iOS向けにBundle可能
- Native Route Dependency Check成功
- `/admin/*`がWeb ModuleをLoadしない

### Gate B: Dependency / Capability / Transaction / PBKDF2 / Storage

- Application→Infrastructure直接依存除去
- Customer/Admin Capability分離
- Customer/Admin Transaction Scope分離
- Web Composition Root回帰成功
- Native Composition Root生成可能
- KV Storage Adapter Test成功
- Native CryptoのWeb隔離確認
- PBKDF2 Test VectorがAndroid/iOSで成功
- Native Component Jest基盤が成功

### Gate C: SQLite / Contract

- Schema/Mapper/Connection Initializer/Transaction Runner完成
- Foreign Key Enforcementと`foreign_key_check`成功
- Transaction戻り値契約Test成功
- Dexie Shared Contract成功
- Android実SQLite Contract Suite成功
- iOS実SQLite主要Contract Smoke成功
- Harness専用DB/KV隔離とCleanup成功
- Application DB不変確認成功
- Seed/Reset成功
- Schema Version分離確認

### Gate D: Asset / Test Control / Harness / Production-validation

- Native Asset Map生成/Contract成功
- Deep Link Reset Protocol成功
- Mutex/二重Request拒否成功
- Ready/Error Signal成功
- Contract Harness成功
- Production-validation Metadataが`production / production / false`
- Production-validationでTest Control/Harness無効

### Gate E: Android Vertical Slice

- Preview APK生成/起動
- Home、検索/一覧、商品詳細、Cart追加/変更/削除
- Empty/Not Found/在庫不足/上限
- Resetと再起動保持

### Gate F: iOS Vertical Slice

- Simulator Build生成/起動
- Home、検索/一覧、商品詳細、Cart追加
- Resetと再起動保持
- 実SQLite/PBKDF2/Storage Smoke成功

### Gate G: 総合回帰

- 全Native Test成功
- Web全Test/Build/Playwright成功
- 前半EAS Workflowまたは代替経路の結果記録
- CNG方針確認
- `android/`/`ios/`未Commit
- Critical/High解消

各Gate終了時にRun Artifactへ、実施内容、成功した検証、失敗と修正、Android/iOS差分、未確認事項、次Gateへ進める根拠を記録します。

## 9. 実施順序

1. 最新コード、Docs、一次資料の調査
2. 外部開始条件の確認
3. Run初期化とTask展開
4. Route Inventoryと依存関係調査
5. ADRと詳細実装方針確定
6. Gate A
7. Gate B
8. Gate C
9. Gate D
10. Native Home、商品一覧、検索、Category、商品詳細
11. Native Cart
12. Native Component Test拡充
13. 前半EAS Workflow/代替実行経路整備
14. Gate E
15. Gate F
16. Gate G
17. 自己レビュー
18. Critical/High修正と再検証
19. Docs、ADR、PROJECT_CONTEXT、History、Run Artifact更新
20. 後半開始条件と確定契約一覧作成
21. 停止してユーザーへ報告

## 10. 後半へ引き渡す確定契約

- Route InventoryとPlatform Route方式
- `app/_layout.tsx` / `app/_layout.web.tsx`
- Platform別Shell
- Application依存方向
- Customer/Admin Repository Capability
- Customer/Admin Transaction Scope
- Native Composition Root注入契約
- SQLite Schema VersionとFK Action
- Connection初期化/Foreign Key契約
- Transaction Runner契約と戻り値契約
- Shared Contract Suite/Harness専用DB/KV形式
- Session/Guest/Clock/Delay Storage Keyと形式
- PBKDF2 Library、隔離方式、Format、Test Vector
- Native Component Jest設定
- Deep Link Protocol Version 1
- Native Asset Map形式
- Stable Test ID規約
- CNG方針
- EAS Profile env
- `.eas/workflows/phase2-native-foundation.yml`
- 後半で原則変更してはいけない契約
- 未確認事項と残課題

## 11. 成果物

- Platform/Route/Composition Root ADR
- SQLite/Transaction/Test Strategy ADR
- `app/_layout.tsx` / `app/_layout.web.tsx`
- Platform別Shell/Screen Module
- Application依存方向修正
- Customer/Admin Repository Capability
- Customer/Admin Transaction Scope
- Web/Native Composition Root
- SQLite Customer AdapterとConnection Initializer
- Shared Customer Contract Suite
- 専用DB/KVを使うNative SQLite Test Harness
- Native Session/Guest/Clock/Delay Storage Adapter
- Native PBKDF2 Adapter
- Seed/Reset/Clock/Deep Link Test Control
- Native Asset Map生成処理
- Native Storefront/Product/Cart
- Native Component Jest設定とTest
- EAS Profileと`expo-dev-client`
- `.eas/workflows/phase2-native-foundation.yml`
- Android Preview APK
- iOS Simulator Build
- 更新済みREADME/PROJECT_CONTEXT/Native手順
- HistoryとRun Artifact
- 後半開始条件と確定契約一覧

## 12. 停止条件

前半DoDとGate A〜Gを満たしても、Login UI、Account、Checkout、Order、Review、業務Flow Maestro、後半Workflowへ進みません。

最終報告で次を区別して記録し、停止します。

- Android Build/起動/操作結果
- iOS Build/起動/操作結果
- 実SQLite Contract結果
- Harness DB/KV隔離とCleanup結果
- Foreign Key Enforcement結果
- Dexie Shared Contract結果
- PBKDF2互換/隔離結果
- Native KV Storage結果
- Native Component Test結果
- Deep Link/Test Control/Harness結果
- EAS Profile env/Metadata結果
- 前半EAS Workflowまたは代替経路結果
- Web回帰結果
- 未確認事項
- 後半を開始できるか
- 後半で変更してはいけない確定契約
