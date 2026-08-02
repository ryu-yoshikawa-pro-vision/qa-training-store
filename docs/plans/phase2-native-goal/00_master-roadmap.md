# Phase 2 Native購入者版 `/goal` 二分割ロードマップ

## 0. この文書の位置づけ

本ディレクトリの3文書は、Phase 2を`/goal`で実装するときの長期利用する実装契約です。

- 本書: Phase 2全体の目的、固定方針、前半と後半の境界
- `01_phase2-first-half-native-foundation.md`: 前半の詳細実装契約
- `02_phase2-second-half-purchase-automation.md`: 後半の詳細実装契約

各`/goal`開始時は、`AGENTS.md`と`PLANS.md`に従ってRun Planと`.codex/runs/<run_id>/`を新規作成し、本ディレクトリを参照元として明記します。本書をRun Logとして上書きしません。

### 文書の優先順位

記述が矛盾する場合は、次の順に優先します。

1. `AGENTS.md`、`PLANS.md`などRepository規約
2. 本書
3. 対象フェーズの詳細計画
4. 承認済みADR
5. 対象RunのPlan
6. `docs/future/phase2/`

ADRは、単に新しいという理由だけで上位計画を変更しません。ADRが次をすべて満たす場合だけ、`Supersedes`で明記した範囲について上位計画を置き換えます。

```text
Status: Accepted
Supersedes:
  - docs/plans/phase2-native-goal/00_master-roadmap.md#対象見出し
  - docs/plans/phase2-native-goal/01_phase2-first-half-native-foundation.md#対象見出し
Approved-by: user
```

- `Status`が`Accepted`である。
- 置換対象の文書と見出しを`Supersedes`へ明記している。
- ユーザー承認を記録している。
- 理由、代替案、影響、回帰方法を記録している。
- 明記していない範囲は置き換えない。

上位契約の変更が必要な場合は、コード変更前にADRとRun Artifactを更新します。条件を満たさないADRやRun Planで上位契約を回避してはいけません。

## 1. Phase 2全体の目的

Web版で確立したDomain、Application Use Case、業務ルール、Validation、DTO、Seed Scenarioの意味を再利用し、Android/iOSの購入者向け主要FlowをSQLite上で決定的に動作させます。

Phase 2完了時に、次を成立させます。

- Android/iOSで商品探索、Cart、Login、Account、Checkout、Order、Reviewを操作できる。
- WebとNativeで同じ業務ルールとApplication結果を検証できる。
- Seed、Reset、Test Clock、Payment Delayで状態を決定的に再現できる。
- AndroidでMaestroの必須Flowが安定して成功する。
- iOS SimulatorでBuild、起動、主要購入Flowを確認できる。
- Development/Preview用の内部検証Buildを生成できる。
- Production-validationではTest ControlとContract Harnessを実行できない。
- Web版、Cloudflare Deploy、Playwrightの既存契約を壊さない。

Native化や画面数の増加自体を目的にしません。テスト自動化教材として、同じ業務契約を決定的に検証できるSUTにすることを優先します。

## 2. 二分割方針

Phase 2は次の二つだけに分割します。

| 順序 | 計画 | 主目的 | 完了状態 |
|---:|---|---|---|
| 1 | Phase 2 前半 | Native基盤・SQLite・Guest購入前Flow | Android/iOSで商品探索からCartまで操作できる |
| 2 | Phase 2 後半 | 会員購入Flow・Maestro・EAS/CI仕上げ | Loginから購入、注文、Reviewまで動作し、自動検証が成立する |

前半を基盤だけで終わらせず、商品探索とCartまで含めます。SQLite、Navigation、Asset、Presentation、Platform Adapterの統合問題を後半へ持ち越さないためです。

後半は、前半PRをマージした最新`main`から開始します。前半Branchから直接開始しません。

## 3. 正式対象

### 対象

- Platform別Root Layout、Route、Shell、Composition Root
- ApplicationからInfrastructureへの直接依存除去
- Customer/Admin Repository CapabilityとTransaction Scopeの分離
- SQLite Customer Adapterと実Native Contract Test
- Native Session、Guest Identity、Password Hash、Navigation、Deep Link
- Seed、Reset、Test Clock、Payment Delay、Test Control
- Native商品Asset Map
- Storefront、商品検索、商品詳細、Cart
- Login、Account、配送先
- Checkout、Mock Payment、Order、Review
- Native Component Test
- Maestro主要Flow
- EAS Development/Preview/Production-validation Build
- Android Preview APK、iOS Simulator Build
- GitHub ActionsとEAS Workflowsの責務分離
- Native開発・Build・検証手順

### 対象外

- Native Admin
- App Store/Google Play公開、EAS Submit
- Password変更、退会、Guest Checkout
- Cancel、Return、Refund、Audit Log
- Payment timeout/unknown、Reconciliation
- Migration Recovery、Crash Point、Integrity Check
- Public Demo分離、Visual Regression本格導入
- Phase 3機能

## 4. 開始前に固定する外部条件

外部条件が未確定のまま`/goal`を開始しません。仮値を正式識別子として実装し、後から置換する運用は禁止します。

### 前半開始前

- Android package
- iOS bundleIdentifier
- Expo AccountとEAS Projectの利用方針
- Android Development/Preview Buildを実行できる権限
- iOS Simulator Buildを生成、インストール、起動する方法
- SecretとCredentialをRepository、Bundle、Artifact、Logへ保存しない運用
- `expo-dev-client`とNative Crypto Moduleの導入許可
- Jest系Native Component Test依存の導入許可
- EAS Workflowsの利用可否と、利用不能時の代替実行環境
- Native Buildの費用上限と実行頻度

### 後半開始前

- 前半PRが`main`へマージ済み
- Android/iOSでGuestの商品探索からCartまで操作可能
- Android実SQLite Customer Contract Suite成功
- iOS実SQLite主要Contract Smoke成功
- Web/Android/iOSのPBKDF2互換Test成功
- Native Component Test成功
- 前半EAS Workflowまたは承認済み代替経路の成功
- Maestroを実行できるAndroid環境
- iOS主要Flowを確認できるSimulator環境

条件を満たさない場合は該当Goalを開始せず、未確定事項を報告して停止します。

## 5. 固定Toolchain

Phase 2開始時に公式資料とLockfileを再確認し、次を基準とします。

- Expo SDK: Repositoryの57系
- React Native: Expo SDK 57対応版
- Node.js: Repositoryの24系
- Android minimum: Android 7以上
- Android compile/target SDK: 36
- iOS deployment target: 16.4以上
- Xcode/EAS Image: Expo SDK 57互換の検証済み値

無条件に`latest`へ追従しません。Toolchain更新はPhase 2実装と分離します。

## 6. 固定アーキテクチャ

### 6.1 RouteとPresentation

Native標準Root Layoutは`app/_layout.tsx`、Web専用Root Layoutは`app/_layout.web.tsx`とします。

```text
app/_layout.tsx      # Android/iOS
app/_layout.web.tsx  # Web
```

通常のScreen ModuleはPlatform別に分離できます。

```text
src/presentation/routes/product-detail.web.tsx
src/presentation/routes/product-detail.native.tsx
```

規則:

- `app/`配下は薄いRoute Wrapperにする。
- Web専用ScreenをNative RouteからImportしない。
- 既存Web URLを維持する。
- Native Adminは作らない。
- Nativeで`operator`または`admin`がLoginした場合は、対象外画面とLogoutだけを提供する。
- Native Root、Route、ScreenからCSS、DOM、React Aria、Dexie、Browser Storage、Browser Test API、`*.web.ts(x)`を排除する。
- 共有対象はDomain、Application、DTO、Validation、文言、Platform非依存View Modelに限定する。

### 6.2 Application、Repository、Transaction Scope

- `src/application/**`から`src/infrastructure/**`への直接Importを除去する。
- Use CaseはRepository Capability、Transaction Runner、Platform Portへ依存する。
- CustomerとAdminが混在するRepository Interfaceを必要なCapabilityへ分離する。
- Native SQLite AdapterにAdmin Methodのダミー実装を作らない。
- Web Dexie Adapterは既存Customer/Admin機能を維持する。
- Transaction ScopeもCustomerとAdminへ分離する。
- Native Composition RootはCustomer Transaction Runnerだけを生成する。
- Architecture/Type Testで依存方向とScope境界を検証する。

### 6.3 Transaction Runner

- SQLite書込みは`withExclusiveTransactionAsync()`を使う。
- Transaction内のQueryはTransaction Objectだけで実行する。
- Callback結果はCommit成功後だけ返す。
- Commit失敗時に結果を返さない。
- `undefined`と未完了を区別する。
- Transaction RepositoryをCallback外へ持ち出さない。
- UIで二重送信を防止する。
- Reset処理だけは専用Mutexで排他する。
- `database is locked`等のLock ErrorをApplication Errorへ変換する。
- 非冪等Mutationを自動Retryしない。
- 独自のGlobal Mutation Queueは標準実装にしない。
- 実Native Contract Testで同時Mutationによる再現可能な失敗が確認された場合だけ、原因と対象Scopeを限定して最小の直列化を追加する。

### 6.4 SQLiteとForeign Key

Native永続化は`expo-sqlite`を使用し、CNGを維持します。`android/`と`ios/`はCommitしません。

全Application/Harness ConnectionでRepository生成前に次を実行します。

```sql
PRAGMA foreign_keys = ON;
PRAGMA foreign_keys;
```

戻り値が`1`でなければDatabase初期化失敗とします。

- Connectionを開くたびに実行する。
- Seed後とContract Suiteで`PRAGMA foreign_key_check`を実行する。
- FK違反が実際に失敗するContract Testを用意する。
- `CASCADE`、`RESTRICT`、`SET NULL`等のActionをTable単位で記録する。

Schema Versionは分離します。

```text
WEB_DATABASE_SCHEMA_VERSION
NATIVE_DATABASE_SCHEMA_VERSION
SEED_VERSION
```

既存Web Metadataとの互換を維持します。

```ts
const WEB_DATABASE_SCHEMA_VERSION = 1;
const NATIVE_DATABASE_SCHEMA_VERSION = 1;

extra: {
  schemaVersion: WEB_DATABASE_SCHEMA_VERSION,
  webDatabaseSchemaVersion: WEB_DATABASE_SCHEMA_VERSION,
  nativeDatabaseSchemaVersion: NATIVE_DATABASE_SCHEMA_VERSION,
  seedVersion: SEED_VERSION,
}
```

- `extra.schemaVersion`はPhase 2で削除せず、既存どおりWeb Database Schema Versionを表す。
- Native Runtimeは`nativeDatabaseSchemaVersion`を参照する。
- 互換Fieldの廃止はPhase 3以降の別タスクとする。
- 独自のVersion管理基盤は追加しない。

Phase 2ではMigration Recoveryを実装せず、Version 1の初期作成とVersion不一致の明示的失敗までを扱います。

### 6.5 Shared Contract SuiteとHarness隔離

Repository ContractはAdapter Factoryを受け取る共通Suiteとして定義します。

```text
createCustomerRepositoryContractSuite(adapterFactory)
```

DexieとSQLiteで同じFixture、Seed、期待値を利用します。

Native Contract Harnessは通常アプリDBを使用しません。

```text
Application DB:
  scenario-shop-v1.db

Harness DB:
  scenario-shop-contract-<runtime-uuid>.db
```

必須契約:

- Harness開始時にRuntime UUIDを生成する。
- Adapter Factoryへ専用Database名を注入する。
- Application RuntimeのRepository/Connectionを再利用しない。
- 成功・失敗を問わずConnectionを閉じ、Test DBを削除する。
- Cleanup失敗はHarness失敗とする。
- Harness前後でApplication DBのDatabase名、Schema Version、Seed Version、既存Seedに必ず含まれる既知レコード1件が変化していないことを確認する。
- 確認用レコードのために専用Table、Domain Entity、Repository、Use Caseを追加しない。
- 全Table Fingerprintや全件数比較は実装しない。
- HarnessはApplication用KV Keyを使用しない。

Harness KVは物理Databaseを追加せず、Runtime UUIDを含む専用Prefixで分離します。

```text
scenario-shop.contract.<runtime-uuid>.session-id
scenario-shop.contract.<runtime-uuid>.guest-id
scenario-shop.contract.<runtime-uuid>.test-clock
scenario-shop.contract.<runtime-uuid>.payment-delay
```

- Harness開始前に対象Prefixの既知Keyが存在しないことを確認する。
- 成功・失敗を問わず`finally`でHarness用の既知Keyを削除する。
- KV Cleanup失敗はHarness失敗として記録する。
- Application用Keyへ触れない。
- Harness KV専用Databaseや追加Connection管理は実装しない。

### 6.6 Native KV Storage

Session、Guest Identity、Test Clock、Payment Delayは`expo-sqlite/kv-store`へ固定します。

```text
scenario-shop.native.session-id.v1
scenario-shop.native.guest-id.v1
scenario-shop.native.test-clock.v1
scenario-shop.native.payment-delay.v1
```

- Globalな`localStorage` Polyfillを導入しない。
- Port Adapter内部からだけ利用する。
- Resetで対象Keyを削除し、Scenario値を再設定する。
- 不正Sessionは削除し、安全にGuestへ戻す。
- Harnessは6.5の専用Prefixを使う。

### 6.7 Password HashとNative Crypto隔離

```text
password-hasher.web.ts
  Web Crypto API

password-hasher.native.ts
  react-native-quick-cryptoのPBKDF2 API

password-hash-format.ts
  Encoded Format Parserと共通Validation
```

- Native Cryptoを共有Entry PointからImportしない。
- Global Crypto PolyfillやMetro全体のAliasを原則追加しない。
- Config Plugin、Autolinking、`expo-doctor`を確認する。
- Web BundleへNative Cryptoが混入していないことを確認する。
- 既存形式を維持する。

```text
pbkdf2-sha256$210000$<salt-base64>$<hash-base64>
salt: 16 bytes
hash: 32 bytes
```

Web/Android/iOSの固定Test Vector、既存Seed Verify、Native生成HashのWeb Verify、Unicode、性能Smokeを必須とします。

### 6.8 Native Component TestとTypeScript型境界

WebとNativeのTest Runnerを分離します。

```text
Vitest
  Domain/Application
  Dexie
  SQLite Node側
  Web Component
  Contract Fixture

Jest + jest-expo
  Native Component
  Native Hook
  Native Presentation
```

必須依存:

- `jest`
- `jest-expo`
- `@types/jest`
- `@testing-library/react-native`

規則:

- `preset: "jest-expo"`を使用する。
- `react-test-renderer`は導入しない。
- Native TestでDOM/jsdomを使わない。
- Expo Moduleの追加Mockは`jest-expo`で不足するものだけにする。
- SQLite/PBKDF2の実Native検証をComponent Testで代替しない。
- `expo install`でSDK互換Versionを解決し、LockfileとPeer Dependencyを確認する。
- `--force`、Peer Dependency無視、恒久的Overrideを標準対応にしない。

Test配置とTypeScript型を分離します。

```text
tests/component/web/**
  Vitest

tests/component/native/**
  Jest + jest-expo
```

Root `tsconfig.json`ではVitest/Web/Appの型を維持し、`tests/component/native`を除外します。Native Test用設定は次を基準にします。

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "noEmit": true
  },
  "include": [
    "tests/component/native/**/*.ts",
    "tests/component/native/**/*.tsx"
  ],
  "exclude": ["node_modules", "dist"]
}
```

- 派生Configで`exclude`を明示し、Root ConfigのNative Test除外を上書きする。
- `src/**`全件を`include`せず、Native TestからImportされたSourceだけを推移的に検査する。
- VitestとJestのGlobal型を同じTypeScript Programへ混在させない。
- TypeScript Project Referencesや別Package化は追加しない。

Scriptは次を基準にします。

```json
{
  "typecheck:app": "tsc --noEmit -p tsconfig.json",
  "typecheck:native-tests": "tsc --noEmit -p tsconfig.native-tests.json",
  "typecheck": "pnpm run typecheck:app && pnpm run typecheck:native-tests"
}
```

```text
test:component:web
test:component:native
test:component = web + native
```

### 6.9 Test Control

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
- Reset Mutexと二重Request拒否
- Database、Session、Guest、Clock、Delayの一括Reset
- `test-runtime-ready` / `test-runtime-error`
- Arbitrary SQL、任意Entity/Status変更の禁止

Contract Harnessは定義済みSuiteの実行入口であり、Test Controlとは別責務です。

Production-validationではTest Control Deep Link、Service、UI、Handler、Contract Harnessを利用できない状態にします。

### 6.10 CNG、EAS Profile、Environment

`app.config.ts`、Config Plugin、Dependencyを正本とし、`expo-dev-client`を導入します。

#### ProfileとEAS Environment

```text
development-android
  environment: development
  developmentClient: true
  distribution: internal

development-ios-simulator
  environment: development
  developmentClient: true
  distribution: internal
  ios.simulator: true

preview-android
  environment: preview
  distribution: internal
  android.buildType: apk

preview-ios-simulator
  environment: preview
  ios.simulator: true

production-validation-android
  environment: production
  distribution: internal
  android.buildType: apk

production-validation-ios-simulator
  environment: production
  ios.simulator: true
```

Development/Preview Profileの`env`:

```text
EXPO_PUBLIC_APP_ENV=automation
EXPO_PUBLIC_BUILD_KIND=automation
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_DEFAULT_SEED=default
```

Production-validation Profileの`env`:

```text
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_BUILD_KIND=production
EXPO_PUBLIC_TEST_MODE=false
EXPO_PUBLIC_DEFAULT_SEED=default
```

Production-validation Metadataは、現行`app.config.ts`の型に合わせて次を確認します。

```text
extra.appEnvironment === "production"
extra.buildKind === "production"
extra.testMode === "false"
```

Store提出用Profileは作成しません。

### 6.11 CI/CDとWorkflow境界

#### GitHub Actions

Node/Webで完結する検証を担当します。

- Format、Lint、`typecheck:app`、`typecheck:native-tests`
- Unit/Application Test
- Architecture/Capability/Scope Test
- Dexie Contract
- SQLite Node側Test
- Web Component Test
- Native Component Test
- Native Route/Dependency Static Check
- Web既存CI、Cloudflare Deploy

Cloudflare DeployはNative Buildへ依存させません。

#### 前半EAS Workflow

`.eas/workflows/phase2-native-foundation.yml`

- Android Preview BuildとStorefront/Cart Smoke
- iOS Preview Simulator BuildとStorefront/Cart Smoke
- Android Native Contract Harness
- iOS Contract Smoke
- Android Production-validation BuildでTest Control/Harness無効確認
- iOS Production設定のBundle/Config静的検証
- iOS Production-validation実BuildはPlatform固有差分がある場合だけ実施

#### 後半EAS Workflow

`.eas/workflows/phase2-native-purchase.yml`

- Auth/Account/Checkout/Order/Review Maestro
- Payment Failure/Retry、再起動・復元
- 購入系Contract Harness
- Android/iOS最終Production-validation
- Phase 2全体のNative CI完成

Workflow JobにもBuildと対応するEnvironmentを明示します。

```text
Preview Build/Maestro Job:
  environment: preview

Production-validation Job:
  environment: production
```

Phase 2ではEAS Workflowを手動実行します。

- `push`、`pull_request`による自動Triggerは追加しない。
- 実行前に`eas workflow:validate <workflow-file>`を実行する。
- Git操作が禁止されているGoalでも、現在のローカル作業ツリーを手動Uploadして検証してよい。
- Run Artifactへ現在のHEAD SHA、未Commit差分の有無、Workflow Run ID/URL、Profile、Environment、Android/iOS Build IDを記録する。
- Push後の再現確認が必要な場合だけ、`--ref <pushed-commit-sha>`を指定する。
- Build成功だけでNative Test成功と扱わない。

```bash
eas workflow:validate .eas/workflows/phase2-native-foundation.yml

eas workflow:run \
  .eas/workflows/phase2-native-foundation.yml \
  --wait
```

Build成果物を後続Maestro Jobへ渡します。EAS Workflowsが利用不能または費用上限超過の場合は、開始前に承認した代替環境で同等確認を行います。

## 7. 共通実施原則

1. 各計画は一つの`/goal`として、実装、検証、自己レビュー、文書更新まで完了する。
2. 前半と後半は別ブランチ・別PRにする。
3. 内部Gateを順番に通過し、未解決Critical/Highがある状態で次へ進まない。
4. 前半完了時に後半へ自動で進まない。
5. 後半開始時は最新`main`と前半成果を再調査する。
6. テスト失敗をskip、Assertion弱体化、Retry増加、`continue-on-error`で隠さない。
7. Android/iOSのBuild、起動、操作、E2E、実SQLite Testを個別に記録する。
8. 実施していない検証をPASSと記録しない。
9. WebのDomain/Application契約をNative UI都合で変更しない。
10. 未使用の抽象化、独自Test Framework、全DB Fingerprint基盤、Sentinel専用基盤を追加しない。
11. 独自Mutation Queueは再現可能な失敗が確認されるまで追加しない。
12. NativeでAdmin Capability/Transaction Scopeのダミー実装を作らない。
13. Maestro Flowは前回実行結果へ依存させない。
14. Test IDは安定した業務概念へ付与する。
15. Phase 3機能を先取りしない。

## 8. ブランチ・PR境界

### Phase 2 前半

- 推奨ブランチ: `feat/phase2-native-foundation-storefront`
- PR範囲: Route、依存方向、Repository/Transaction Scope、SQLite、Foreign Key、Harness隔離、KV Storage、PBKDF2、Native Component Test基盤、TypeScript型境界、Asset、Storefront、Cart、EAS Profile、前半Workflow

### Phase 2 後半

- 推奨ブランチ: `feat/phase2-native-purchase-automation`
- PR範囲: Auth、Account、Checkout、Order、Review、Payment Delay、購入系Maestro/Harness、後半Workflow、最終Docs

一つのPRへ前半と後半を混在させません。Gate単位で意図が追えるCommitを推奨しますが、Commit数を増やすこと自体を目的にしません。

## 9. Phase 2全体の完了条件

- Android/iOSで購入者向け主要画面が起動する。
- SQLite AdapterがCustomer Capabilityを満たす。
- Customer Transaction ScopeがAdmin Scopeから分離されている。
- 全ConnectionでForeign Key Enforcementが有効である。
- Contract HarnessがApplication DB/KVを変更しない。
- Harness用KV Keyが成功・失敗を問わず削除される。
- Session、Guest、Clock、Delayが固定KV契約で永続化される。
- 商品探索、Cart、Login、Account、Checkout、Order、Reviewが成立する。
- Android Preview APKとiOS Simulator Buildを生成・起動できる。
- AndroidでMaestro必須Flowが成功する。
- iOSで主要Flowを確認する。
- 実Native SQLite Contract Testが成功する。
- Native Component Testが`jest-expo`環境で成功する。
- VitestとJestのTypeScript型境界が分離され、両Typecheckが成功する。
- `extra.schemaVersion`の既存Web互換を維持し、Native Schema Versionを別Fieldで公開している。
- Production-validation Metadataが`"production" / "production" / "false"`である。
- Production-validationでTest Control/Harnessを実行できない。
- Native Adminを含まない。
- Web版、Web CI、Cloudflare Deploy契約を壊していない。
- 実行できなかった検証は、コード完了と実環境検証未完了を分けて報告する。
- Phase 3へ送る課題が整理されている。

## 10. 計画書

- [Phase 2 前半: Native基盤・SQLite・Guest購入前Flow](./01_phase2-first-half-native-foundation.md)
- [Phase 2 後半: 会員購入Flow・Maestro・EAS/CI仕上げ](./02_phase2-second-half-purchase-automation.md)
