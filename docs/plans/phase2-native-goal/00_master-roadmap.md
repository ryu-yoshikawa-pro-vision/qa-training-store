# Phase 2 Native購入者版 `/goal` 二分割ロードマップ

## 0. この文書の位置づけ

本ディレクトリの3文書は、Phase 2を`/goal`で実装するときに参照する長期利用の実装契約です。

- 本書: Phase 2全体の目的、固定アーキテクチャ、共通禁止事項、前半と後半の境界
- `01_phase2-first-half-native-foundation.md`: Phase 2前半の詳細実装契約
- `02_phase2-second-half-purchase-automation.md`: Phase 2後半の詳細実装契約

各`/goal`開始時は、`AGENTS.md`と`PLANS.md`に従い、タイムスタンプ付きRun Planと`.codex/runs/<run_id>/`を新規作成し、本ディレクトリを参照元として明記します。本書をRun Logとして上書きしません。

### 文書の優先順位

記述が矛盾する場合は次の順に優先します。

1. 本書
2. 対象フェーズの詳細計画
3. Phase 2実装中に作成・承認された最新ADR
4. 対象RunのPlan
5. `docs/future/phase2/`

下位文書の都合のよい記述を選択して上位契約を回避してはいけません。上位契約を変更する必要がある場合は、コード変更前に理由、代替案、影響、検証方法をADRとRun Artifactへ記録します。

## 1. Phase 2全体の目的

Web版で確立したDomain、Application Use Case、業務ルール、Validation、DTO、Seed Scenarioの意味を再利用し、Android/iOSの購入者向け主要FlowをSQLite上で決定的に動作させます。

最終的に次を成立させます。

- Android/iOSで商品探索、Cart、Login、Account、Checkout、Order、Reviewを操作できる。
- WebとNativeで同じ業務ルールとApplication結果を検証できる。
- Nativeの状態をSeed、Reset、Test Clock、Payment Delayで決定的に再現できる。
- AndroidでMaestroの必須Flowが安定して成功する。
- iOS SimulatorでBuild、起動、主要購入Flowの実操作確認が完了する。
- EAS BuildでDevelopment/Preview用の内部検証Buildを生成できる。
- Production-validation BuildではTest ControlとContract Harnessを実行できない。
- Web版、Cloudflare Deploy、Playwrightの既存契約を壊さない。

Native化や画面数の増加そのものを目的にしません。WebとNativeで同じ業務契約を、決定的な状態と自動テストで学習できるSUTにすることを最優先とします。

## 2. 二分割方針

Phase 2は次の二つだけに分割します。それ以上のフェーズ・PR分割を標準にはしません。

| 順序 | 計画 | 主目的 | 完了時に成立する状態 |
|---:|---|---|---|
| 1 | Phase 2 前半 | Native基盤・SQLite・Guest購入前Flow | Android/iOSで起動し、商品探索からCartまで操作できる |
| 2 | Phase 2 後半 | 会員購入Flow・Maestro・EAS/CI仕上げ | Loginから購入、注文、Reviewまで動作し、自動検証と内部Buildが成立する |

前半を基盤実装だけで終わらせず、商品閲覧とCartまで含めます。SQLite、Navigation、Asset、Presentation、Platform Adapterの統合問題を後半へ持ち越さないためです。

後半は、前半で確定したPlatform境界、Customer向けRepository Capability、Customer Transaction Scope、SQLite Schema、Session、Password Hash、Test Control、Native Asset Mapを土台として、会員購入Flowと自動化・配布を完成させます。

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
- ApplicationからInfrastructureへの直接依存除去
- Customer/Admin Repository CapabilityとTransaction Scopeの分離
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
- GitHub ActionsとEAS Workflowsの責務分離
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
- iOS Simulator Buildを生成、インストール、起動する方法
- CredentialをAI Agentへ直接渡さずにBuildする運用
- SecretをRepository、Bundle、Artifact、Logへ保存しない方針
- `expo-dev-client`とNative Crypto Moduleの導入許可
- Jest系Native Component Test依存の導入許可
- EAS Workflowsを利用できるか、利用不能時の代替Native実行環境
- Native Buildの費用上限と実行頻度

### 固定するScheme

既存設定を維持し、Phase 2では次を正とします。

```text
Expo scheme: scenario-shop
Deep Link prefix: scenario-shop://
```

### 後半開始前に必要

- 前半PRが`main`へマージ済み
- 前半のAndroid Preview Build成功
- 前半のiOS Simulator Build、インストール、起動成功
- Android/iOSでGuestの商品探索からCartまで操作可能
- Android実`expo-sqlite` Customer Contract Suite成功
- iOS実SQLite主要Contract Smoke成功
- Web/Android/iOSのPBKDF2互換Test成功
- Native Component Test成功
- Maestroを実行できるAndroid環境
- iOS主要Flowを確認できるSimulator環境
- EAS Workflowsの利用可否、費用上限、実行頻度の決定

条件を満たさない場合、該当Goalを開始せず、未確定事項を報告して停止します。

## 5. 固定Toolchain

Phase 2開始時に最新公式資料とRepositoryのLockfileを確認し、次を基準とします。

- Expo SDK: Repositoryの57系を維持
- React Native: Expo SDK 57対応版
- Node.js: Repositoryの24系
- Android minimum: Android 7以上
- Android compileSdkVersion: 36
- Android targetSdkVersion: 36
- iOS deployment target: 16.4以上
- Xcode/EAS Image: Expo SDK 57互換の明示Imageまたは検証済みAlias

無条件に`latest`へ追従しません。Toolchain更新はPhase 2実装と分離し、必要な場合はADRへ記録します。

## 6. 固定アーキテクチャ

技術的に成立しない根拠がない限り、以下を既定方針として実装します。

### 6.1 RouteとPresentation

#### Root Layout

Expo Routerの標準Root LayoutはNative向けの`app/_layout.tsx`とします。Webだけを`app/_layout.web.tsx`で上書きします。

```text
app/_layout.tsx      # Android/iOSの標準Root Layout
app/_layout.web.tsx  # Web専用Root Layout
```

Android/iOSを個別に分ける明確な必要がある場合だけ、現在のExpo Router仕様を確認して`_layout.android.tsx`、`_layout.ios.tsx`を利用します。`app/_layout.native.tsx`を必須構成にはしません。

通常のScreen ModuleではMetroのPlatform解決を利用して構いません。

```text
src/presentation/routes/product-detail.web.tsx
src/presentation/routes/product-detail.native.tsx
```

#### Route Wrapper

- `app/`配下のRoute Fileは薄いWrapperにする。
- Route FileからPlatform別Screen ModuleをImportする。
- Web専用Screen ModuleをNative Route ModuleからImportしない。
- 既存Web URL契約を維持する。
- 一つのRouteでWrapper方式とPlatform別Route File方式を混在させない。

前半Gate Aまでに全Routeを次へ分類します。

- Web/Native共通URLかつ前半実装
- Web/Native共通URLかつ後半実装
- Web専用Admin
- Native対象外
- Legal/Guideなど簡易Native表示対象
- Test Control
- Native Contract Harness
- Not Found/Redirect

#### Native Admin

- Native Adminは作らない。
- Nativeで`operator`または`admin`がLogin状態になった場合は、対象外画面を表示しLogoutだけを提供する。
- Nativeで`/admin/*`へDeep LinkされてもWeb ModuleをLoadしない。

#### 依存排除

Native Root Layout、Route、Screenの依存グラフから次を排除します。

- CSS Import
- DOM Element
- React Aria
- Dexie
- Browser Storage
- Browser Test API
- `*.web.ts` / `*.web.tsx`

共有対象はDomain、Application、DTO、Validation、表示文言、Platform非依存View Modelに限定します。

### 6.2 Application依存方向

- `src/application/**`から`src/infrastructure/**`への直接Importを除去する。
- Use CaseはRepository Capability、Transaction Runner、Platform Portだけへ依存する。
- Database具象型をUse Case Constructorへ渡さない。
- `SessionIdentityResolver`もRepository Capabilityへ依存させる。
- Architecture TestまたはStatic CheckでApplicationからInfrastructureへの直接Importを禁止する。

### 6.3 Repository Capability

CustomerとAdminが混在するRepository Interfaceを必要なCapabilityへ分離します。

最低限の分離対象:

```text
CustomerUserRepository / AdminUserRepository
CustomerProductRepository / AdminProductRepository
CustomerInventoryRepository / AdminInventoryRepository
CustomerReviewRepository / AdminReviewRepository
```

命名は現行コードへ合わせて調整できますが、次を満たします。

- Customer Use CaseがAdmin専用Methodへ依存しない。
- Native SQLite AdapterがAdmin専用Methodをダミー実装しない。
- Web Dexie AdapterはCustomer/Admin双方のCapabilityを実装する。
- Interface分割のためにDomainルールやDTOの意味を変更しない。

### 6.4 Transaction Scope

Repository CapabilityだけでなくTransaction ScopeもCustomerとAdminへ分離します。

```text
CustomerTransactionScopeMap
  register-and-merge-cart
  login-and-merge-cart
  cart-mutation
  merge-guest-cart
  start-checkout
  create-order
  finalize-payment-success
  finalize-payment-failure
  retry-payment
  review-change

AdminTransactionScopeMap
  create-product-aggregate
  update-product-aggregate
  change-product-status
  category/brand mutation
  adjust-inventory
  change-user-access
  shipment operation
```

共通Runnerを使う場合もScope Mapを型Parameterとして受け取ります。

- Native Composition RootはCustomer Transaction Runnerだけを生成する。
- Native側でAdmin Scopeのダミー実装を作らない。
- Web側はCustomer/Admin双方を維持する。
- Customer Use CaseがAdmin Transaction Scopeを参照しない。
- Architecture TestでScope境界を検証する。

### 6.5 Transaction Runnerの戻り値

`withExclusiveTransactionAsync()`の戻り値に依存せず、Application Callbackの結果をRunnerが保持します。

- Callback結果はTransaction Commit成功後だけ返す。
- Callback成功後にCommitが失敗した場合は結果を返さない。
- `undefined`が正当な戻り値の場合と未完了を区別する。
- Transaction RepositoryをCallback外へ持ち出さない。
- Transaction終了後のRepository利用を禁止する。
- Queue待機とLock待機に上限を設ける。
- 非冪等Mutationを自動Retryしない。

### 6.6 Composition Root

- Web用Composition RootはDexieとBrowser Adapterを利用し、既存動作を維持する。
- Native用Composition RootはSQLiteとNative Adapterを利用する。
- Native用Composition Rootは購入者機能だけを構築する。
- Repository Capability、Customer Transaction Runner、Session、Guest Identity、Password Hasher、Clock、ID、Payment Gateway、Address Lookup、Asset Resolverを外部注入可能にする。

### 6.7 SQLite

#### 採用技術

- Native永続化は`expo-sqlite`を採用する。
- CNGを維持し、`android/`と`ios/`はCommitしない。
- Native設定は`app.config.ts`とConfig Pluginへ記述する。
- Prebuild生成物は一時検証物として扱う。

#### Schema範囲

前半でNative購入者版の最終Flowに必要なSchemaを作成します。

- User、Session、Address
- Category、Brand、Product、Variant、Image、Review Summary
- Inventory、Inventory History
- Cart、Cart Item
- Checkout Session
- Order、Order Item、Order Status History
- Payment、Shipment
- Review、Review Status History
- Sequence、Settings、Schema Metadata、Test Metadata/Inspection

#### Connection初期化とForeign Key

すべてのApplication DB ConnectionとContract Harness DB Connectionで、Repositoryを生成する前に次を実行します。

```sql
PRAGMA foreign_keys = ON;
PRAGMA foreign_keys;
```

`PRAGMA foreign_keys`の戻り値が`1`でない場合はDatabase初期化失敗とします。

- PRAGMAはTransaction開始前に実行する。
- Connectionを開くたびに実行する。
- Harness専用Connectionにも適用する。
- Seed投入後とContract Suite内で`PRAGMA foreign_key_check`を実行する。
- Foreign Key違反が実際に失敗するContract Testを用意する。
- `CASCADE`、`RESTRICT`、`SET NULL`等のActionをTableごとにSchema文書へ記録する。
- Actionは既存Domain契約を変更するために選ばず、削除・履歴保持の意味に合わせる。

#### Transaction

- 書込みTransactionは`withExclusiveTransactionAsync()`を使用する。
- Transaction内のQueryは渡されたTransaction Objectだけで実行する。
- Customer Mutationの同時実行を限定Queueで直列化する。
- `database is locked`を無限Retryしない。
- Commit/Rollback、在庫減算、Order/Payment、Review Summary更新を実Native Runtimeで検証する。

#### Schema Version

```text
WEB_DATABASE_SCHEMA_VERSION
NATIVE_DATABASE_SCHEMA_VERSION
SEED_VERSION
```

Phase 2ではNative Migration Recoveryを実装せず、Version 1の初期作成とVersion不一致の明示的失敗までを扱います。

### 6.8 Repository Contract TestとHarness DB隔離

Contract SuiteはAdapter Factoryを受け取る共通仕様にします。

```text
createCustomerRepositoryContractSuite(adapterFactory)
```

Node/PRではSchema、Mapper、SQL、Fixture、Dexie Contractを検証し、実Native Runtimeでは実`expo-sqlite`接続、DDL、Constraint、Transaction、Seed/Reset、Customer Contractを検証します。

Native Contract Harnessは通常アプリのDatabaseを絶対に使用しません。

```text
Application DB:
  scenario-shop-v1.db

Contract Harness DB:
  scenario-shop-contract-<sanitized-run-id>.db
```

必須契約:

- Adapter FactoryへDatabase名を注入する。
- Run IDはBuild/Workflow ID等から生成し、Filenameとして安全な文字だけへ正規化する。
- Harness開始前に同名Test DBを削除する。
- Harnessは専用Connectionと専用Test DBだけを使用する。
- App RuntimeのRepository InstanceとConnectionを再利用しない。
- 成功・失敗を問わずConnectionを閉じる。
- 終了後にTest DBを削除する。
- Cleanup失敗はHarness失敗として扱う。
- Harness前後でApplication DBのSchema Version、Seed Version、主要Table件数またはFingerprintが変化していないことを確認する。
- Android/iOSで同じ分離契約を使用する。
- MockやNode代替結果を実SQLite成功として記録しない。

### 6.9 Native Session、Guest Identity、Clock、Delay Storage

Nativeの小規模Key-Value状態は`expo-sqlite/kv-store`へ固定します。Globalな`localStorage` Polyfillは導入しません。

固定Key:

```text
scenario-shop.native.session-id.v1
scenario-shop.native.guest-id.v1
scenario-shop.native.test-clock.v1
scenario-shop.native.payment-delay.v1
```

必須契約:

- KV StoreはPlatform Port Adapter内部からだけ利用する。
- Application/Presentationから直接Importしない。
- Resetで上記Keyをすべて削除し、Scenario値を再設定する。
- App再起動後にSessionとGuest IDを復元できる。
- Storage Errorを握り潰さず、Application Errorまたは安全なGuest復帰へ変換する。
- 不正Sessionは削除してGuestへ安全に戻す。
- Contract Harnessは通常アプリと異なるKey Namespaceを使い、通常Keyを変更しない。

### 6.10 Password HashとNative Crypto隔離

Native Password Hasherは`react-native-quick-crypto`を既定候補として利用します。ただしWebへの影響を避けるため、Platform別実装を厳格に分離します。

```text
password-hasher.web.ts
  Web Crypto APIを継続

password-hasher.native.ts
  react-native-quick-cryptoのPBKDF2 APIを直接Import

password-hash-format.ts
  Encoded Format Parser、共通Validation、Test Vector
```

- `react-native-quick-crypto`を共有Entry PointからImportしない。
- Global `install()`やGlobal Crypto Polyfillは原則使用しない。
- Metro全体の`crypto` Aliasは原則追加しない。
- 必要なConfig PluginとNative Dependencyを`app.config.ts`/Lockfileへ反映する。
- Prebuild後のAutolinkingを確認する。
- `expo-doctor`でDependency整合を確認する。
- Web BundleへNative Cryptoが混入していないことをStatic Checkする。
- Web PBKDF2実装を置換しない。

既存形式を維持します。

```text
pbkdf2-sha256$210000$<salt-base64>$<hash-base64>
salt: 16 bytes
hash: 32 bytes
```

Web/Android/iOSの固定Test Vector、既存Seed Verify、Native生成HashのWeb Verify、Unicode、性能Smokeを必須とします。

### 6.11 Native Component Test Runner

Native Component TestはWebのVitest/jsdomへ混在させません。

```text
Vitest
  Domain/Application
  Dexie
  SQLite Node側
  Web Component
  Contract Fixture

Jest + @react-native/jest-preset
  Native Component
  Native Hook
  Native Presentation
```

必須依存と契約:

- `jest`
- `@react-native/jest-preset`
- `@testing-library/react-native`
- 導入時の互換表で必要な場合は`react-test-renderer`をReactと完全一致するVersionで追加する。
- Native TestでDOM/jsdomを使わない。
- Web TestからNative Moduleを読み込まない。
- Native Module Mockは必要最小限とし、SQLite/PBKDF2の実Native検証をComponent Testで代替しない。

Scriptは責務を分けます。

```text
test:component:web
test:component:native
test:component = web + native
```

### 6.12 商品画像

- `assetId`とMetadataはWeb/Nativeで共通利用する。
- Webは既存公開Pathを利用する。
- NativeはBuild時生成された静的Asset Mapを利用する。
- Runtime文字列を`require`しない。
- Web ManifestとNative Asset MapのAsset ID集合をContract Testで一致させる。
- Product/Order Snapshot PathとNative Image Sourceを分離する。

### 6.13 Test ControlとContract Harness

#### Test Control

業務データやClockを変更する外部Automation入口はDeep Linkだけとします。

```text
scenario-shop://test-control/reset
  ?version=1
  &scenario=<scenario-id>
  &clock=<ISO-8601>
  &paymentDelayMs=<0-30000>
```

- Scenario Allowlist
- ISO 8601 Clock
- Payment Delay上限
- Reset Mutex
- 二重Request拒否
- DB Close、再作成、Seed、Session/Guest/Clock/Delay Reset
- Scenario既定Routeへの遷移
- `test-runtime-ready` / `test-runtime-error`
- Arbitrary SQL、任意Entity/Status変更の禁止

#### Native Contract Harness

- Development/Preview専用の画面またはRoute
- MaestroからUI操作で実行
- 定義済みSuiteだけを実行
- 専用Test DBと専用KV Namespaceだけを使用
- `native-contract-running` / `passed` / `failed`
- Failure時はSuite名と非機密Error Codeだけを表示

#### Production-validation

- Test Control Deep Linkを受理しない。
- Test Control ServiceをComposition Rootへ登録しない。
- Test Control UIを表示しない。
- Reset Handlerへ到達できない。
- Contract Harnessを実行できない。
- 試行時は安全なNot FoundまたはDisabled結果になる。

### 6.14 CNGとEAS Profile

Phase 2ではCNGを維持します。

- `android/`と`ios/`をCommitしない。
- `app.config.ts`、Config Plugin、Dependencyを正本とする。
- 独自Native Codeが不可欠な場合だけADRで方針変更する。

`expo-dev-client`を導入します。

#### Development/Preview Profile共通env

```text
EXPO_PUBLIC_APP_ENV=automation
EXPO_PUBLIC_BUILD_KIND=automation
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_DEFAULT_SEED=default
```

#### Production-validation Profile共通env

```text
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_BUILD_KIND=production
EXPO_PUBLIC_TEST_MODE=false
EXPO_PUBLIC_DEFAULT_SEED=default
```

固定Profile:

```text
development-android
  developmentClient: true
  distribution: internal

development-ios-simulator
  developmentClient: true
  distribution: internal
  ios.simulator: true

preview-android
  distribution: internal
  android.buildType: apk

preview-ios-simulator
  ios.simulator: true

production-validation-android
  distribution: internal
  android.buildType: apk

production-validation-ios-simulator
  ios.simulator: true
```

Test ControlのON/OFFは説明用の独立設定ではなく、Profileの`env`を`app.config.ts`が解決した結果を正本とします。

Production-validation BuildではMetadataを検証します。

```text
extra.appEnvironment == production
extra.buildKind == production
extra.testMode == false
```

Store提出用Profileは作成・実行しません。

### 6.15 CI/CDの責務とWorkflow境界

#### GitHub Actions

WebとNodeで完結する検証を担当します。

- Format、Lint、Typecheck
- Unit/Application Test
- Architecture/Capability/Scope Test
- Dexie Contract
- SQLite Node側Schema/Mapper/SQL Test
- Web Component Test
- Native Component Test
- Native Route/Dependency Static Check
- Web既存CI
- Cloudflare Deploy

Cloudflare DeployはNative Buildへ依存させません。

#### Phase 2前半のEAS Workflows

`.eas/workflows/phase2-native-foundation.yml`を作成します。

- Android Preview Build
- iOS Simulator Build
- Android Native Contract Harness
- iOS Contract Smoke
- Storefront/Cart Vertical Slice Smoke
- Production-validationのTest Control/Harness無効確認の基礎

#### Phase 2後半のEAS Workflows

`.eas/workflows/phase2-native-purchase.yml`を作成します。

- Auth/Account/Checkout/Order/Review Maestro
- Payment Failure/Retry
- App再起動・復元
- 購入系Contract Harness
- Android/iOS最終Production-validation
- Phase 2全体のNative CI完成

Build Jobの成果物を後続Maestro Jobへ渡し、同じWorkflow内でBuildと実行を接続します。`.eas/workflows/`をNative CIの正本とします。

EAS WorkflowsのMaestro Jobが利用不能、費用上限超過の場合は、実装開始前に承認した代替環境で同等確認を行います。Build成功だけでNative Test成功と扱いません。

## 7. 共通実施原則

1. 各計画は一つの`/goal`として、計画、実装、検証、自己レビュー、文書更新まで完了する。
2. 前半と後半は別ブランチ・別PRにする。
3. 内部Gateを順番に通過し、未解決Critical/Highがある状態で次へ進まない。
4. 前半完了時に後半へ自動で進まない。
5. 後半開始時は最新`main`と前半成果を再調査する。
6. テスト失敗をskip、Assertion弱体化、Retry増加、`continue-on-error`で隠さない。
7. Android/iOSについてBuild、起動、操作、E2E、実SQLite Testを個別に記録する。
8. 実施していない検証をPASSと記録しない。
9. WebのDomain/Application契約をNative UI都合で変更しない。
10. Nativeのためだけに未使用の抽象化を増やさない。
11. ApplicationからInfrastructureへの直接依存を残さない。
12. NativeでAdmin Capability/Transaction Scopeのダミー実装を作らない。
13. Contract HarnessからApplication DBとApplication KV Namespaceを変更しない。
14. 各主要Flowは使用するSeed Scenarioを説明できる状態にする。
15. Maestro Flowは前回実行結果へ依存させない。
16. Test IDは画面位置や文言ではなく、安定した業務概念へ付与する。
17. Phase 3機能を先取りしない。

## 8. ブランチ・PR境界

### Phase 2 前半

- 推奨ブランチ: `feat/phase2-native-foundation-storefront`
- PR範囲: Route/依存方向、Repository/Transaction Scope、Composition Root、SQLite、Foreign Key初期化、専用Harness DB、KV Storage、Seed/Reset、PBKDF2、Native Component Test基盤、Asset、Storefront、商品、Cart、EAS Profile、`.eas/workflows/phase2-native-foundation.yml`

### Phase 2 後半

- 推奨ブランチ: `feat/phase2-native-purchase-automation`
- PR範囲: Auth、Account、Checkout、Order、Review、Payment Delay、購入系Maestro、購入系Harness、`.eas/workflows/phase2-native-purchase.yml`、最終Docs

一つのPRへ前半と後半を混在させません。内部GateはPR分割ではなく、同一Goal内の停止・検証点です。

各PRではGate単位で意図が追えるCommitを推奨します。ただしCommit数を増やすこと自体を目的にせず、切り戻しとレビュー可能性を基準にまとめます。

## 9. Phase 2全体の完了条件

- Android/iOSで購入者向け主要画面が起動する。
- SQLite AdapterがNative購入者版に必要なCustomer Capabilityを満たす。
- Customer Transaction ScopeがAdmin Scopeから分離されている。
- 全ConnectionでForeign Key Enforcementが有効である。
- Contract HarnessがApplication DB/KVを変更しない。
- Session、Guest Identity、Clock、Delayが固定KV契約で永続化される。
- Seed、Reset、Clock、Payment DelayがNativeで決定的に動作する。
- 商品探索、Cart、Login、Account、Checkout、Order、Reviewが成立する。
- Android Preview APKとiOS Simulator Buildを生成・起動できる。
- AndroidでMaestro必須Flowが成功する。
- iOSではMaestroまたは明示した代替経路で主要Flowを確認する。
- 実Native SQLite Contract Testが成功する。
- Native Component Testが専用Jest環境で成功する。
- Production-validation Metadataがproduction/production/falseである。
- Production-validationでTest Control/Harnessを実行できない。
- Native Adminが含まれていない。
- Web版の既存動作、Web CI、Cloudflare Deploy契約を壊していない。
- 実行できなかった検証がある場合、完全完了とせずコード完了と実環境検証未完了を分けて報告する。
- Phase 3へ送る課題が整理されている。

## 10. 計画書

- [Phase 2 前半: Native基盤・SQLite・Guest購入前Flow](./01_phase2-first-half-native-foundation.md)
- [Phase 2 後半: 会員購入Flow・Maestro・EAS/CI仕上げ](./02_phase2-second-half-purchase-automation.md)
