# Phase 2 Native購入者版 `/goal` 二分割ロードマップ

## 0. この文書の位置づけ

本ディレクトリの3文書は、Phase 2を`/goal`で実装するときに参照する**長期利用の実装契約**です。

- 本書: Phase 2全体の目的、固定アーキテクチャ、共通禁止事項、前半と後半の境界
- `01_phase2-first-half-native-foundation.md`: Phase 2前半の詳細実装契約
- `02_phase2-second-half-purchase-automation.md`: Phase 2後半の詳細実装契約

実際に各`/goal`を開始するときは、`AGENTS.md`と`PLANS.md`に従い、タイムスタンプ付きのRun Planと`.codex/runs/<run_id>/`を新規作成し、本ディレクトリの文書を参照元として明記してください。

この文書をそのままRun Logとして上書きしません。実装中に計画変更が必要になった場合は、理由、影響、代替案をRun ArtifactとADRへ記録し、必要に応じて本書を別PRで更新します。

## 1. Phase 2全体の目的

Web版で確立したDomain、Application Use Case、業務ルール、Validation、DTO、Seed Scenarioの意味を再利用し、Android/iOSの購入者向け主要FlowをSQLite上で決定的に動作させます。

最終的に次を成立させます。

- Android/iOSで商品探索、Cart、Login、Account、Checkout、Order、Reviewを操作できる。
- WebとNativeで同じ業務ルールとApplication結果を検証できる。
- Nativeの状態をSeed、Reset、Test Clock、Payment Delayで決定的に再現できる。
- AndroidでMaestroの必須Flowが安定して成功する。
- iOS SimulatorでBuild、起動、主要購入Flowの実操作確認が完了する。
- EAS BuildでDevelopment/Preview用の内部検証Buildを生成できる。
- Production相当BuildではTest Controlを利用できない。
- Web版、Cloudflare Deploy、Playwrightの既存契約を壊さない。

Native化や画面数の増加そのものを目的にしません。**WebとNativeで同じ業務契約を、決定的な状態と自動テストで学習できるSUTにすること**を最優先とします。

## 2. 二分割方針

Phase 2は次の二つだけに分割します。それ以上のフェーズ・PR分割を標準にはしません。

| 順序 | 計画 | 主目的 | 完了時に成立する状態 |
|---:|---|---|---|
| 1 | Phase 2 前半 | Native基盤・SQLite・Guest購入前Flow | Android/iOSで起動し、商品探索からCartまで操作できる |
| 2 | Phase 2 後半 | 会員購入Flow・Maestro・EAS/CI仕上げ | Loginから購入、注文、Reviewまで動作し、自動検証と内部Buildが成立する |

前半を基盤実装だけで終わらせず、商品閲覧とCartまで含めます。SQLite、Navigation、Asset、Presentation、Platform Adapterの統合問題を後半へ持ち越さないためです。

後半は、前半で確定したPlatform境界、Customer向けRepository Capability、SQLite Schema、Session、Password Hash、Test Control、Native Asset Mapを土台として、会員購入Flowと自動化・配布を完成させます。

```text
Phase 2 前半
Native基盤・SQLite・Guest購入前Flow
        ↓
前半PRをレビュー・マージ
        ↓
Phase 2 後半
会員購入Flow・Maestro・EAS/CI仕上げ
```

後半を前半Branchから直接開始しません。前半PRをマージした最新`main`から開始します。

## 3. Phase 2の正式対象

### 対象

- Native ScopeとPlatform境界の確定
- Platform別Root Layout、Route Wrapper、Shell、Composition Root
- Android/iOS向けNative Bootstrap
- Customer/Adminが混在しているRepository InterfaceとUse Case依存の整理
- SQLite Customer Adapterと実Native Repository Contract Test
- Native Session、Guest Identity、Password Hash、Navigation、Deep Link
- Seed、Reset、Test Clock、Payment Delay、Test Control
- Native商品Asset Map
- Storefront、商品検索、商品詳細、Cart
- Login、Account、配送先
- Checkout、Mock Payment、Order、Review
- Native Component Test
- Maestro主要Flow
- EAS Development/Preview/Production-validation Build
- Android Preview APK
- iOS Simulator Build
- Native向けCI、手動Build入口、運用手順

### 対象外

- Native Admin
- App Store/Google Play公開
- EAS Submit
- Store向けProduction AAB/IPAのRelease Gate
- Password変更、退会
- Guest Checkout
- Cancel、Return、Refund
- Audit Log
- Payment timeout/unknown、Reconciliation
- Migration Recovery、Crash Point、Integrity Check
- Public Demo分離
- Visual Regressionの本格導入
- Phase 3機能

## 4. 実装開始前に固定する外部条件

外部条件が未確定のまま`/goal`を開始しません。仮値を正式識別子として実装し、後から置換する運用は禁止します。

### 前半開始前に必要

- Android package
- iOS bundleIdentifier
- Expo AccountとEAS Projectの利用方針
- Android Development/Preview Buildを実行できる権限
- iOS Simulator Buildを生成・インストール・起動する方法
- CredentialをAI Agentへ直接渡さずにBuildする運用
- SecretをRepository、Bundle、Artifact、Logへ保存しない方針
- Native PBKDF2 Libraryを含むNative Module追加を許容すること

### 固定するScheme

既存設定を維持し、Phase 2では次を正とします。

```text
Expo scheme: scenario-shop
Deep Link prefix: scenario-shop://
```

変更する場合はPhase 2開始前に明示決定し、Web/Nativeの既存Link、EAS、Maestro、Docsへの影響を整理します。

### 後半開始前に必要

- 前半PRが`main`へマージ済み
- 前半のAndroid Preview Build成功
- 前半のiOS Simulator Build、インストール、起動成功
- Android/iOSでGuestの商品探索からCartまで操作可能
- 実`expo-sqlite` Native Contract Test成功
- Maestroを実行できるAndroid環境
- iOS主要Flowを確認できるSimulator環境
- EAS TokenをGitHub Actionsで使用するかの決定
- Native Buildの実行頻度と費用上限

条件を満たさない場合、該当Goalを開始せず、未確定事項を報告して停止します。

## 5. 固定アーキテクチャ

技術的に成立しない根拠がない限り、以下を既定方針として実装します。変更が必要な場合は、実装前に理由、代替案、影響、検証方法をADRへ記録します。

### 5.1 RouteとPresentation

#### Route方針

- `app/`配下のRoute Fileは薄いWrapperにします。
- Route Fileから、Platform別Screen ModuleをImportします。
- Web専用Screen ModuleをNative Route ModuleからImportしません。
- 既存Web URL契約は維持します。

推奨構造例:

```text
app/products/[id].tsx
  -> src/presentation/routes/product-detail

src/presentation/routes/product-detail.web.tsx
src/presentation/routes/product-detail.native.tsx
```

Route File自体をPlatform別にする方が明確な場合は、次も許可します。

```text
app/admin/index.web.tsx
app/admin/index.native.tsx
```

ただし、一つのRouteでWrapper方式とPlatform別Route方式を混在させません。開始時のRoute Inventoryで方式を決め、一覧へ記録します。

#### Route Inventory

前半のGate Aまでに、`app/`配下の全Routeを次へ分類します。

- Web/Native共通URLかつ前半実装
- Web/Native共通URLかつ後半実装
- Web専用Admin
- Native対象外
- Legal/Guideなど簡易Native表示対象
- Test Control
- Not Found/Redirect

#### Native Admin

- Native Adminは作りません。
- Nativeで`operator`または`admin`がLogin状態になった場合は、Native対象外を説明する専用画面を表示し、Logoutだけを提供します。
- Nativeで`/admin/*`へDeep LinkされてもWeb ModuleをLoadしません。
- Safeな対象外画面またはRedirectを返します。

#### Root LayoutとShell

- WebとNativeのRoot Layoutを分離します。
  - `app/_layout.web.tsx`
  - `app/_layout.native.tsx`
- Web ShellとNative Shellを分離します。
- Native Root LayoutとRoute Moduleの依存グラフから次を排除します。
  - CSS Import
  - DOM Element
  - React Aria
  - Dexie
  - Browser Storage
  - Browser Test API
  - `*.web.ts` / `*.web.tsx`
- Web画面を無理にReact Native Componentへ全面変換しません。
- 共有対象はDomain、Application、DTO、Validation、表示文言、Platform非依存View Modelに限定します。

### 5.2 ApplicationとRepository Capability

現行コードではApplication Use CaseがDexie具象型やDexie Repositoryを直接Importしているため、Composition Rootの差し替えだけではNative化できません。

Phase 2前半で次を実施します。

- `src/application/**`から`src/infrastructure/**`への直接Importを除去する。
- Use CaseはRepository Capability、Transaction Runner、Platform Portだけへ依存する。
- Database具象型をUse Case Constructorへ渡さない。
- `SessionIdentityResolver`を含むIdentity解決もRepository Capabilityへ依存させる。
- Architecture TestまたはStatic CheckでApplicationからInfrastructureへの直接Importを禁止する。

CustomerとAdminが混在するRepository Interfaceは、必要なCapability単位へ分離します。

最低限の分離対象:

```text
CustomerUserRepository
AdminUserRepository

CustomerProductRepository
AdminProductRepository

CustomerInventoryRepository
AdminInventoryRepository

CustomerReviewRepository
AdminReviewRepository
```

命名は現行コードに合わせて調整してよいですが、次を満たす必要があります。

- Customer Use CaseがAdmin専用Methodへ依存しない。
- Native SQLite AdapterがAdmin専用Methodをダミー実装しない。
- Web Dexie AdapterはCustomer/Admin両方のCapabilityを実装する。
- Native Composition RootはCustomer Capabilityだけを注入する。
- Interface分割のためだけにDomainルールやApplicationの戻り値を変更しない。

### 5.3 Composition Root

- Web用Composition RootはDexieとBrowser Adapterを利用し、既存動作を維持します。
- Native用Composition RootはSQLiteとNative Adapterを利用します。
- Native用Composition Rootは購入者機能だけを構築し、Admin Use Caseを組み込みません。
- 次を外部注入可能にします。
  - Repository Capability
  - Transaction Runner
  - CurrentSessionStore
  - GuestIdentityStore
  - PasswordHasher
  - Clock
  - IdGenerator
  - PaymentGateway
  - AddressLookup
  - Product Image Asset Resolver

### 5.4 SQLite

#### 採用技術

- Native永続化は`expo-sqlite`を採用します。
- CNGを維持し、`android/`と`ios/`はRepositoryへCommitしません。
- Native設定は`app.config.ts`と必要なConfig Pluginへ記述します。
- Prebuild生成物は一時検証物として扱います。
- 独自Native Codeが不可欠になった場合だけ、実装前にADRで方針変更します。

#### Schema範囲

前半でNative購入者版の最終Flowに必要なSchemaとRepositoryを実装します。

- User
- Session
- Address
- Category/Brand/Product/Product Variant/Product Image/Product Review Summary
- Inventory/Inventory History
- Cart/Cart Item
- Checkout Session
- Order/Order Item/Order Status History
- Payment
- Shipment
- Review/Review Status History
- Sequence
- Settings
- Test Metadata/Test Inspection
- Schema Metadata

Admin専用QueryやAdmin編集処理はNative Composition Rootへ組み込みません。ただし、Customer FlowのDomain整合性に必要なTable、Index、Historyは前半で作成します。

#### Transaction

- 書込みTransactionは`withExclusiveTransactionAsync()`を使用します。
- Transaction内のQueryは渡されたTransaction Objectだけで実行します。
- Transaction中にDatabase本体へ直接Queryしません。
- Customer Mutationの同時実行をApplication/Infrastructure境界で直列化します。
- `database is locked`を無限Retryしません。
- Retryする場合は対象、回数、待機を限定し、失敗を明示します。
- Commit/Rollback、在庫減算、Order/Payment、Review Summary更新を実Native Runtimeで検証します。

#### Schema Version

WebとNativeのSchema Versionを分離します。

```text
WEB_DATABASE_SCHEMA_VERSION
NATIVE_DATABASE_SCHEMA_VERSION
SEED_VERSION
```

Build MetadataとTest Metadataでは、どちらのSchema Versionかを明示します。Phase 2ではNative Migration Recoveryを実装せず、Version 1の初期作成とVersion不一致の明示的失敗までを扱います。

### 5.5 Repository Contract Test

Repository Contract Testを二層に分けます。

#### Node/PRで実行

- Domain/Application Test
- SQL Builder
- Schema定義
- Mapper
- Boolean/Date/JSON/Enum変換
- Seed Dataset
- Platform非依存Repository Logic
- Dexie Contract Suite
- Shared Fixtureと期待値

#### 実Native Runtimeで実行

- 実`expo-sqlite`接続
- DDL実行
- Foreign Key/Unique制約
- Commit/Rollback
- Version Conflict
- Search/Sort/Page/Facet
- 複数Repository Transaction
- Seed/Reset/Database再生成
- Customer Repository Contract Suite

Contract SuiteはAdapter Factoryを受け取る共通仕様として定義します。同じFixture、Seed、期待値をDexieとSQLiteへ適用します。

```text
createCustomerRepositoryContractSuite(adapterFactory)
```

- DexieはVitestから実行します。
- SQLiteはDevelopment/Preview Build内のNative Test Harnessから実行します。
- Native HarnessはDevelopment/Previewだけで有効にします。
- Native Harnessの成功/失敗を画面上の安定したSignalと構造化Resultで確認できるようにします。
- MockやNode代替実装の結果を「実SQLite Contract Test成功」と記録しません。
- Platform差が避けられない場合は、明示的な除外表と根拠を残します。

### 5.6 Password Hash

Native Password Hasherは`react-native-quick-crypto`を既定採用します。CNG/EAS BuildでNative Moduleを組み込みます。

既存形式を完全に維持します。

```text
algorithm: pbkdf2-sha256
iterations: 210000
salt: 16 bytes
hash: 32 bytes
encoded: pbkdf2-sha256$210000$<salt-base64>$<hash-base64>
```

必須条件:

- Web/Android/iOSで同じ固定Test Vectorを通す。
- 既存Seed HashをAndroid/iOSでVerifyできる。
- Android/iOSで生成したHashをWebでもVerifyできる。
- Base64、UTF-8、Salt、Iteration、Hash長を変えない。
- Constant-time比較相当を維持する。
- Hash/Verify時間をAndroid/iOSで計測し、操作不能にならないことを確認する。

`react-native-quick-crypto`が現在のExpo SDK/React Native/CNGでBuild不能、またはPBKDF2互換を満たさない場合、別形式へ変更しません。前半GoalをBlockし、技術的根拠と代替候補を報告して停止します。

### 5.7 商品画像

- `assetId`とMetadataはWeb/Nativeで共通利用します。
- Webは既存の公開Pathを利用します。
- NativeはBuild時生成された静的Asset Mapを利用します。
- Native Asset Mapは静的`require`または静的Importで画像をBundleへ含めます。
- Runtime文字列をそのまま`require`しません。
- Web ManifestとNative Asset MapのAsset ID集合をContract Testで一致させます。
- PlaceholderもNative Bundleへ静的同梱します。
- Product/Order Snapshotに保存するPathと、Native表示用Sourceを分離します。

### 5.8 Test Control Deep Link Protocol

Deep Linkを唯一の外部Automation入口とします。

固定Protocol:

```text
scenario-shop://test-control/reset
  ?version=1
  &scenario=<scenario-id>
  &clock=<ISO-8601>
  &paymentDelayMs=<0-30000>
```

`clock`と`paymentDelayMs`は省略可能です。省略時はScenario既定値を使います。

必須契約:

- `version`は`1`だけ許可する。
- `scenario`はScenario MetadataのAllowlistだけ許可する。
- `clock`はTimezoneを含むISO 8601だけ許可する。
- `paymentDelayMs`は整数かつ0〜30,000msだけ許可する。
- Reset処理はMutexで直列化する。
- 実行中の二重RequestはQueueせず、明示的に拒否する。
- Databaseを安全にCloseしてから再作成する。
- Database、Session、Guest Identity、Clock、Payment Delayを一つのReset操作として扱う。
- 完了後はScenarioの既定Routeへ遷移する。
- 完了時に`test-runtime-ready`のStable Test IDを表示する。
- 失敗時に`test-runtime-error`のStable Test IDと非機密Error Codeを表示する。
- Arbitrary SQL、任意Entity更新、任意Status変更を許可しない。
- Production-validationではRoute、Handler、UIをBundle/Runtimeから利用できない。

Review Flowはdelivered OrderとReview未投稿Order Itemを持つ専用Seed Scenarioから開始します。

### 5.9 Native Test

- Domain/Application/Platform非依存Repository: Vitest
- Dexie Contract: Vitest
- Native Component: React Native Testing Library
- 実SQLite Contract: Development/Preview Build内のNative Test Harness
- Navigation/主要業務Flow: Maestro
- Android/iOS Bundle/Build: Platform別に確認
- Web Component/Playwright: 既存構成を維持

### 5.10 CNGとEAS Profile

Phase 2ではContinuous Native Generationを維持します。

- `android/`と`ios/`をCommitしない。
- `expo prebuild`生成物を成果物として保存しない。
- `app.config.ts`、Config Plugin、Dependencyだけを正本にする。

`expo-dev-client`を導入し、Development Buildへ使用します。

固定Profile:

```text
development-android
  developmentClient: true
  distribution: internal
  Test Control: ON

development-ios-simulator
  developmentClient: true
  distribution: internal
  ios.simulator: true
  Test Control: ON

preview-android
  distribution: internal
  android.buildType: apk
  Test Control: ON

preview-ios-simulator
  ios.simulator: true
  Test Control: ON

production-validation-android
  distribution: internal
  android.buildType: apk
  BUILD_KIND: production
  Test Control: OFF

production-validation-ios-simulator
  ios.simulator: true
  BUILD_KIND: production
  Test Control: OFF
```

Store提出用ProfileはPhase 2で作成・実行しません。

### 5.11 CI

Pull Requestで実行:

- Format
- Lint
- Typecheck
- Unit/Application Test
- Dexie Repository Contract
- SQLiteのNode側Schema/Mapper/SQL Test
- Native Component Test
- Native Route/Dependency Static Check
- Native Bundle/Config Static Check
- Web既存CI

`workflow_dispatch`で実行:

- Android EAS Preview Build
- iOS EAS Simulator Build
- Production-validation Build
- 必要に応じたAndroid Maestro
- 実Native SQLite Contract Testの起動・結果確認手順

Web Cloudflare DeployはNative EAS Buildへ依存させません。

## 6. 共通実施原則

1. 各計画は一つの`/goal`として、計画、実装、検証、自己レビュー、文書更新まで完了する。
2. 前半と後半は別ブランチ・別PRにする。
3. 計画内の内部Gateを順番に通過し、未解決のCritical/Highがある状態で次のGateへ進まない。
4. 前半完了時に後半へ自動で進まず、結果を報告して停止する。
5. 後半開始時は最新`main`と前半PRの最終状態を再調査する。
6. テスト失敗をskip、Assertion弱体化、Retry増加、`continue-on-error`で隠さない。
7. AndroidとiOSについて、Build、起動、操作、E2E、実SQLite Testの結果を個別に記録する。
8. 実施していない検証をPASSと記録しない。
9. WebのDomain/Application契約をNative UI都合で変更しない。
10. Nativeのためだけに未使用の抽象化を増やさない。
11. ApplicationからInfrastructureへの直接依存を残さない。
12. 各主要Flowは使用するSeed Scenarioを説明できる状態にする。
13. Maestro Flowは前回実行結果へ依存させない。
14. Test IDは画面位置や表示文言ではなく、安定した業務概念へ付与する。
15. Phase 3の機能を先取りしない。
16. `android/`と`ios/`をCommitしない。
17. Secret、Credential、実在個人情報をRepository、Bundle、Artifact、Logへ含めない。

## 7. ブランチ・PR境界

### Phase 2 前半

- 推奨ブランチ: `feat/phase2-native-foundation-storefront`
- PR範囲: Platform/Route境界、Repository Capability分離、Composition Root、SQLite、実Native Contract Harness、PBKDF2、Seed/Reset、Native Asset、Storefront、商品、Cart、Android/iOS Build

### Phase 2 後半

- 推奨ブランチ: `feat/phase2-native-purchase-automation`
- PR範囲: Auth、Account、Checkout、Order、Review、Deep Link Test Control完成、Maestro、EAS、CI、最終Docs

一つのPRへ前半と後半を混在させません。内部GateはPR分割ではなく、同一Goal内の停止・検証点として扱います。

## 8. Phase 2全体の完了条件

- AndroidとiOSで購入者向け主要画面が起動する。
- Application Use CaseがInfrastructure具象型へ依存していない。
- Customer/Admin Repository Capabilityが適切に分離されている。
- SQLite AdapterがNative購入者版に必要なCustomer Contractを満たす。
- 実Android/iOS RuntimeでSQLite Contract Testが成功する。
- `withExclusiveTransactionAsync`による複数Repository Transactionが検証されている。
- Web/Android/iOSでPBKDF2互換Test Vectorと既存Seed Loginが成功する。
- Seed、Reset、Clock、Payment DelayがNativeで決定的に動作する。
- 商品探索、Cart、Login、Account、Checkout、Order、Reviewの主要Flowが成立する。
- Review Flowを専用Seed Scenarioから再現できる。
- Android Preview APKを生成し、起動・主要操作を確認できる。
- iOS Simulator Buildを生成し、起動・商品探索・Cart・Login・Checkout成功・Order詳細・Payment失敗/再試行を確認できる。
- AndroidでMaestro必須Flowが成功する。
- Production-validation BuildではTest Controlが無効である。
- Native Adminが含まれていない。
- `android/`と`ios/`がCommitされていない。
- Web版の既存動作、Web CI、Cloudflare Deploy契約を壊していない。
- 実行できなかった検証がある場合、Phase 2を完全完了とせず、コード完了と実環境検証未完了を分けて報告する。
- Phase 3へ送る課題が整理されている。

## 9. 計画書

- [Phase 2 前半: Native基盤・SQLite・Guest購入前Flow](./01_phase2-first-half-native-foundation.md)
- [Phase 2 後半: 会員購入Flow・Maestro・EAS/CI仕上げ](./02_phase2-second-half-purchase-automation.md)
