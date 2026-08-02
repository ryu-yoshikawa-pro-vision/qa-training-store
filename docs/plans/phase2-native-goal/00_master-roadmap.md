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
- Production-validation BuildではTest Controlを実行できない。
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
- EAS Workflowsを利用できるか、利用不能時の代替Native実行環境

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

推奨構造:

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

必須契約:

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

### 6.8 Repository Contract Test

二層へ分けます。

#### Node/PR

- Domain/Application Test
- SQL Builder、Schema、Mapper
- Boolean/Date/JSON/Enum変換
- Seed Dataset
- Dexie Contract Suite
- Shared Fixtureと期待値

#### 実Native Runtime

- 実`expo-sqlite`接続
- DDL、Foreign Key、Unique
- Commit/Rollback、Version Conflict
- Search/Sort/Page/Facet
- 複数Repository Transaction
- Seed/Reset/Database再生成
- Customer Repository Contract Suite

Contract SuiteはAdapter Factoryを受け取る共通仕様にします。

```text
createCustomerRepositoryContractSuite(adapterFactory)
```

MockやNode代替結果を実SQLite成功として記録しません。

### 6.9 Password HashとNative Crypto隔離

Native Password Hasherは`react-native-quick-crypto`を既定候補として利用します。ただしWebへの影響を避けるため、Platform別実装を厳格に分離します。

```text
password-hasher.web.ts
  Web Crypto APIを継続

password-hasher.native.ts
  react-native-quick-cryptoのPBKDF2 APIを直接Import

password-hash-format.ts
  Encoded Format Parser、共通Validation、Test Vector
```

必須条件:

- `react-native-quick-crypto`を共有Entry PointからImportしない。
- Global `install()`やGlobal Crypto Polyfillは原則使用しない。
- Metro全体の`crypto` Aliasは原則追加しない。
- Native PBKDF2 APIだけを直接利用する。
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

既定候補が現在のExpo SDK/CNGで成立しない場合、Hash形式を変更せずGoalをBlockし、代替候補を報告します。

### 6.10 商品画像

- `assetId`とMetadataはWeb/Nativeで共通利用する。
- Webは既存公開Pathを利用する。
- NativeはBuild時生成された静的Asset Mapを利用する。
- Runtime文字列を`require`しない。
- Web ManifestとNative Asset MapのAsset ID集合をContract Testで一致させる。
- Product/Order Snapshot PathとNative Image Sourceを分離する。

### 6.11 Test ControlとContract Harness

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

Contract Harnessは状態変更APIではなく、定義済みContract Suiteの実行入口として別扱いにします。

- Development/Preview専用の画面またはRoute
- MaestroからUI操作で実行
- Arbitrary TestやSQLを選択できない
- 定義済みSuiteだけを実行
- `native-contract-running` / `passed` / `failed`
- Failure時はSuite名と非機密Error Codeだけを表示

「Deep Linkだけが唯一の入口」という表現は、業務状態変更入口に限定します。

#### Production-validation

Production-validationでは次を必須とします。

- Test Control Deep Linkを受理しない。
- Test Control ServiceをComposition Rootへ登録しない。
- Test Control UIを表示しない。
- Reset Handlerへ到達できない。
- 実行を試みると安全なNot FoundまたはDisabled結果になる。

Tree ShakingでBundleから物理的に除外できることは望ましいですが、必須DoDにはしません。

### 6.12 CNGとEAS Profile

Phase 2ではCNGを維持します。

- `android/`と`ios/`をCommitしない。
- `app.config.ts`、Config Plugin、Dependencyを正本とする。
- 独自Native Codeが不可欠な場合だけADRで方針変更する。

`expo-dev-client`を導入します。

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

Store提出用Profileは作成・実行しません。

### 6.13 CI/CDの責務

#### GitHub Actions

WebとNodeで完結する検証を担当します。

- Format、Lint、Typecheck
- Unit/Application Test
- Architecture/Capability/Scope Test
- Dexie Contract
- SQLite Node側Schema/Mapper/SQL Test
- Native Component Test
- Native Route/Dependency Static Check
- Web既存CI
- Cloudflare Deploy

Cloudflare DeployはNative Buildへ依存させません。

#### EAS Workflows

Native BuildとEmulator/Simulator上の検証の第一経路とします。

- Android Build
- iOS Simulator Build
- Android Maestro
- iOS Maestro
- Native SQLite Contract Harness実行
- Production-validation Build

Build Jobの成果物を後続Maestro Jobへ渡し、同じWorkflow内でBuildと実行を接続します。`.eas/workflows/`をNative CIの正本とします。

手動実行入口は`eas workflow:run`を基本とし、結果URLをRun Artifactへ記録します。

EAS WorkflowsのMaestro JobがAlphaまたは利用不能、費用上限超過の場合は、実装開始前に次の代替を一つ明示します。

- AndroidローカルEmulator + Maestro
- macOS上のiOS Simulator + Maestro/手動Smoke
- EAS Build成果物を取得して管理された実行環境で検証

利用不能を理由にBuild成功だけでNative Test成功と扱ってはいけません。

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
13. 各主要Flowは使用するSeed Scenarioを説明できる状態にする。
14. Maestro Flowは前回実行結果へ依存させない。
15. Test IDは画面位置や文言ではなく、安定した業務概念へ付与する。
16. Phase 3機能を先取りしない。

## 8. ブランチ・PR境界

### Phase 2 前半

- 推奨ブランチ: `feat/phase2-native-foundation-storefront`
- PR範囲: Route/依存方向、Repository/Transaction Scope、Composition Root、SQLite、Seed/Reset、PBKDF2、Asset、Storefront、商品、Cart、Android/iOS Preview Build、Native Test基盤

### Phase 2 後半

- 推奨ブランチ: `feat/phase2-native-purchase-automation`
- PR範囲: Auth、Account、Checkout、Order、Review、Payment Delay、Maestro、EAS Workflows、最終Docs

一つのPRへ前半と後半を混在させません。内部GateはPR分割ではなく、同一Goal内の停止・検証点です。

## 9. Phase 2全体の完了条件

- Android/iOSで購入者向け主要画面が起動する。
- SQLite AdapterがNative購入者版に必要なCustomer Capabilityを満たす。
- Customer Transaction ScopeがAdmin Scopeから分離されている。
- Seed、Reset、Clock、Payment DelayがNativeで決定的に動作する。
- 商品探索、Cart、Login、Account、Checkout、Order、Reviewが成立する。
- Review Flowを専用Seed Scenarioから再現できる。
- Android Preview APKを生成し、起動・主要操作を確認できる。
- iOS Simulator Buildを生成し、起動・商品探索・Cart・Login・Checkout成功・Order詳細を確認できる。
- AndroidでMaestro必須Flowが成功する。
- iOSではMaestroまたは明示した代替経路で主要Flowを確認する。
- 実Native SQLite Contract Testが成功する。
- Production-validationでTest Controlを実行できない。
- Native Adminが含まれていない。
- Web版の既存動作、Web CI、Cloudflare Deploy契約を壊していない。
- 実行できなかった検証がある場合、完全完了とせずコード完了と実環境検証未完了を分けて報告する。
- Phase 3へ送る課題が整理されている。

## 10. 計画書

- [Phase 2 前半: Native基盤・SQLite・Guest購入前Flow](./01_phase2-first-half-native-foundation.md)
- [Phase 2 後半: 会員購入Flow・Maestro・EAS/CI仕上げ](./02_phase2-second-half-purchase-automation.md)
