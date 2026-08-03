# Scenario Shop

Playwrightを中心としたテスト自動化を学習・検証するための模擬EC Webアプリです。

商品検索、カート、購入、決済失敗、在庫競合、注文配送、レビュー、商品・在庫・ユーザー管理まで、ECサイトとSaaS型管理画面の主要な操作を再現しています。

テストを安定して繰り返せるように、固定Seed、Database Reset、Test Clock、決済遅延、内部状態Inspection APIを備えています。

> [!IMPORTANT]
> このアプリは学習・検証用です。実際の販売、決済、配送、外部API通信は行いません。

## このアプリで学べること

- PlaywrightによるStorefrontと管理画面のE2Eテスト
- Guest、customer、operator、adminの権限別テスト
- 商品検索、Filter、Cart、Checkout、注文配送の状態遷移
- 価格変更、在庫不足、Version競合などの境界値テスト
- 決済成功、利用拒否、再試行、処理再開のテスト
- Seed、Reset、Test Clockによる決定的なテスト
- UI表示とIndexedDB内部状態を組み合わせた検証
- Accessibility、Keyboard操作、Mobile境界の検証

## 対象範囲

現在の実装はWebのPhase 1と、NativeのPhase 2前半（Guest Storefront／Cart基盤）を対象としています。Nativeの後半機能は対象外画面として明示しています。

| 項目 | 内容 |
|---|---|
| Platform | Desktop / Mobile Web |
| Storefront | Home、商品一覧、検索、Category、商品詳細、Cart |
| Customer | Account、配送先、Checkout、注文履歴、Review |
| Admin console | Overview、商品、Category、Brand、在庫、注文、Review、User管理 |
| Database | IndexedDB + Dexie |
| Payment | 決定的なLocal Mock |
| E2E | Playwright |
| Hosting | Cloudflare Pages |
| 管理画面 | 1024px以上のDesktop Web |
| 購入可能Role | activeなcustomer |
| Native前半 | Guest Home、Catalog、Search、Category、Product、Variation、Cart |
| Native DB | SQLite Customer-only schema + Native KV |
| Native識別子 | Android `com.ryuyoshikawa.scenarioshop` / iOS `com.ryuyoshikawa.scenarioshop` |

## 主な機能

### Storefront

- Home
- 商品一覧、検索、検索候補
- Category、Brand、価格、評価、SaleによるFilter
- 商品詳細、画像Gallery、Variation選択
- Guest Cart
- Login、新規会員登録
- 利用規約、Privacy、特定商取引法表示

### Customer

- Profile編集
- 配送先の登録・編集・削除
- Checkoutの入力、確認、処理中、完了、失敗
- 決済成功、利用拒否、再試行
- Checkout再開とCart Version不一致の検出
- 注文一覧、注文詳細
- Review投稿・編集・削除

### Operator / Admin

- 管理Overview
- 商品、SKUの登録・編集
- 静的Image Assetの商品への関連付け・並べ替え
- 商品公開・非公開と削除制約
- Category、Brand管理
- 在庫調整と在庫履歴
- 注文準備、発送、配達完了
- Review公開状態の管理

### Admin

- User一覧・詳細
- customerの会員Rank変更
- operatorとadmin間のRole変更
- Userの利用停止・再開
- 最後のAdminを保護する制約
- Local / Automation BuildでのTest Control

## 技術スタック

- Expo / Expo Router
- React / React Native Web
- TypeScript
- IndexedDB / Dexie
- React Hook Form / Zod
- Vitest / Testing Library
- Playwright / axe-core
- Cloudflare Pages
- pnpm

依存PackageのVersion指定は[`package.json`](./package.json)、実際に解決されるVersionは[`pnpm-lock.yaml`](./pnpm-lock.yaml)を参照してください。

## セットアップ

### 前提環境

- Node.js 24
- pnpm 9.10.0

### Install

```bash
corepack enable
pnpm install --frozen-lockfile
```

## ローカル起動

```bash
pnpm run start:web
```

Expoが表示するURLをブラウザで開いてください。

### Web Build

現在のRuntime Environment設定でWeb Buildを生成します。

```bash
pnpm run build:web
```

Font Asset準備、商品画像Manifest生成・検証、Expo Web Exportを順に実行し、`dist/`へ出力します。

Production Buildは、CI/CDでProduction用の環境変数を設定して実行します。

### Native local Build

Native BuildはローカルWindows／macOS経路を正式な主経路とします。EAS Cloud Build／Workflowは日常のBuild・検証・Submitには使いません。`expo prebuild`で生成される`android/`と`ios/`、APK／Simulator App／署名鍵などの成果物・CredentialはRepositoryへ追加しません。

```bash
pnpm run generate:native-assets
pnpm run check:native-route-dependencies
pnpm exec expo prebuild
```

#### Windows／Android

Android Studio、JDK、Android SDK、Platform Tools、Emulatorまたは実機を用意し、`com.ryuyoshikawa.scenarioshop`を対象にDev／ReleaseをローカルBuildします。

```powershell
pnpm run build:native:android
pnpm run build:native:android:release
cd android
.\gradlew.bat assembleRelease
cd ..
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

Release APKは端末側で管理するGradle signing config／keystoreを使って署名します。Expoの生成テンプレートは未設定時にdebug keystoreを使うため、正式なRelease署名の確認ではAndroid Studio／Gradleへローカルkeystoreを設定してください。keystore、password、`*.jks`／`*.keystore`はRepositoryへ保存しません。`expo run:android --variant release`が生成するInstall用Artifactと、署名済み`assembleRelease` APKの確認結果は別々に記録します。

#### macOS／iOS

Xcode、Command Line Tools、CocoaPods、iOS Simulatorを用意し、`com.ryuyoshikawa.scenarioshop`を対象にDev／Release Simulator Buildをローカル実行します。

```bash
pnpm run build:native:ios
pnpm run build:native:ios:release
```

必要に応じてXcodeから個人所有iPhoneへRunします。個人端末検証はDevelopment Signingの範囲に限定し、Distribution IPA／Store提出は作成しません。

#### Native実環境の確認順

Android／iOSともに、Install・起動後に次を実操作します。

1. Home → 商品一覧／検索／Category → Product → Variation選択 → `カートに追加`
2. Cartで数量変更・削除・Empty Stateを確認
3. 再起動後にGuest IdentityとCartが復元されることを確認
4. local／automation BuildではTest Control Deep LinkとReady／Error Signalを確認
5. production validationではTest Control／Harnessが利用不能であることを確認

Web／Nativeの比較対象は標準`390×844`、追加で`320×700`です。Home／Catalog／Product／Cartの情報順、商品画像比率、色・Spacing・Radius・Typographyは共有Tokenを使い、Platform固有のHeader／Navigation／Native Component差だけを許容します。Native UIはWebのDOM／CSS／React Aria Componentを再利用しません。

`pnpm run test:repository`にはNode.js 24の組み込みSQLiteを使うNative Customer Adapterの実SQL／FK／Seed／Catalog／Cart Contractが含まれます。これはAndroid／iOSの`expo-sqlite`実行確認の代替ではありません。

Automation／Development Buildの`/admin/test-control`には、専用DB／KV Namespaceで定義済みCustomer Contract、FK違反、Cart add／update／remove、Application DB不変確認を実行するNative Contract Harnessがあります。`Native contract passed`はCleanupとApplication DB確認が成功した後だけ表示されます。Production BuildではTest Control／Harness画面と実装をModule Resolutionで除外します。

Test Controlはlocal／automation buildだけで利用できます。

```text
scenario-shop://test-control/reset?version=1&scenario=default&clock=2026-07-01T03:00:00.000Z&paymentDelayMs=0
```

Production buildではTest Controlを有効化しません。EAS Build、EAS Workflow、EAS Submit、Store公開はこのRepositoryのNative手順に含めません。

#### EASの位置づけ（静的／将来用）

`eas.json`と`.eas/workflows/phase2-native-foundation.yml`は、Profile／Environment mappingと将来の手動Workflow構成を静的に保持するためだけに置きます。Workflowは`workflow_dispatch`のみで、Cloud Build／Maestro／SubmitはこのRunでは実行しません。

```bash
pnpm run validate:eas:config
pnpm run validate:native-production-bundle
```

`validate:native-production-bundle`はAutomation／Productionの生成Android Bundle（Hermes `.hbc`を含む）を検査します。EAS CloudのWorkflow検証・実行はこの経路では行いません。

## テストアカウント

初期アカウントの共通パスワードは次の値です。

```text
testpass1
```

| 用途 | Email | Role | Rank / Status |
|---|---|---|---|
| 一般会員 | `regular@example.com` | customer | regular / active |
| ゴールド会員 | `gold@example.com` | customer | gold / active |
| プラチナ会員 | `platinum@example.com` | customer | platinum / active |
| 利用停止会員 | `suspended@example.com` | customer | regular / suspended |
| 退会済み会員 | `withdrawn@example.com` | customer | regular / withdrawn |
| 店舗担当者 | `operator@example.com` | operator | active |
| 管理者 | `admin@example.com` | admin | active |

`suspended`と`withdrawn`のcustomerは、Login拒否のテストに使用します。

## Seed Scenario

Test ControlまたはPlaywright Fixtureから、目的に応じた初期状態へDatabaseをResetできます。

代表的なScenarioは次のとおりです。

| Scenario | 主な用途 |
|---|---|
| `default` | 標準状態 |
| `empty-catalog` | 商品0件 |
| `many-products` | 大量商品とPagination |
| `out-of-stock` | 在庫切れ |
| `low-stock` | 低在庫 |
| `sale-active` | Sale期間中 |
| `expired-sale` | Sale期間終了 |
| `regular-member` | 一般会員Session |
| `gold-member` | ゴールド会員Session |
| `platinum-member` | プラチナ会員Session |
| `suspended-user` | 利用停止User |
| `cart-with-invalid-items` | 価格変更・在庫切れを含むCart |
| `payment-declined` | 決済利用拒否 |
| `payment-processing` | 決済処理中 |
| `checkout-resume` | Checkout再開 |
| `cart-version-invalidates-checkout` | Cart Version不一致 |
| `product-aggregate-edit` | 商品Aggregate編集 |
| `cross-role-product-lifecycle` | Admin作成から購入・ReviewまでのRole横断Flow |
| `product-delete-blocked` | 商品削除拒否 |
| `admin-bulk-partial-failure` | 一括操作の部分失敗 |
| `storage-write-failure` | Storage書込み失敗 |

完全なScenario一覧は[`src/seeds/metadata.ts`](./src/seeds/metadata.ts)を参照してください。

## Test API

LocalおよびAutomation Buildでは、`window.__TEST_API__`を利用できます。

主な操作は次のとおりです。

- `reset({ scenario })`
- `setClock(isoString | null)`  
  固定時刻を設定します。`null`で固定時刻を解除します。
- `setPaymentDelay(milliseconds)`  
  決済遅延を0〜30,000ミリ秒の整数で設定します。
- `getMetadata()`
- `inspectOrder(orderId)`
- `inspectVariant(variantId)`
- `inspectReviewSummary(productId)`

Production BuildにはTest APIを公開しません。

LocalまたはAutomation BuildでadminとしてLoginすると、`/admin/test-control`からScenario、基準時刻、決済遅延を変更できます。

### Reset時の注意

Database ResetではIndexedDBを削除し、新しいDatabase Instanceを作成します。

- 管理画面のTest Controlは、Reset後にページを自動でReloadします
- Playwrightの`scenario` Fixtureは、同じBrowser Contextの余分なPageを閉じ、Reset後のReloadまで自動で実行します
- `window.__TEST_API__.reset()`を直接呼び出す場合は、Reset後にページをReloadしてください
- Resetは1つのBrowser Contextで1つのPageを開いた状態を前提とします。Reset前に同じContextの別Tab・別Pageを閉じてください

```ts
await scenario("payment-declined");
```

## テストと検証

### Format・静的検証

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run validate:image-manifest
pnpm run security:check
pnpm run generate:native-assets
git diff --exit-code -- src/generated/native-product-assets.ts
pnpm run validate:native-production-bundle
```

### Vitest

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
pnpm run test:contracts
```

すべてのVitestを実行する場合は次を使用します。

```bash
pnpm run test
```

### Playwright

Chromiumのみを使用する場合は、ChromiumをInstallします。

```bash
pnpm exec playwright install chromium
```

Firefox・WebKitを含むすべてのPlaywright Testを実行する場合は、すべてのBrowserをInstallします。

```bash
pnpm exec playwright install chromium firefox webkit
```

主なTest Commandは次のとおりです。

```bash
pnpm run test:e2e
pnpm run test:a11y
pnpm run test:e2e:mobile
pnpm run test:e2e:mobile-boundary
pnpm run test:e2e:cross-role
pnpm run test:e2e:smoke:firefox
pnpm run test:e2e:smoke:webkit
```

### 一括検証

```bash
pnpm run verify
```

`verify`はFormat、Lint、Typecheck、画像Manifest、Security Check、Vitest、Web Buildを実行します。Playwright E2Eは含まれないため、目的に応じて別途実行してください。

### Native検証状態（PR #8対応時点）

#### 実施済み・成功

- Deep Link Pure Function、Native Scenario Allowlist、Guest Mutation拒否、Reset rollback、Harness signal順序、Variation未選択のUnit／Contract／Component Test
- Native Application Use Case共有配線、Production Module Resolution、生成BundleのProduction Bundle Guard
- Native Asset生成差分、Format、Lint、Typecheck、Node SQLite／Web回帰（個別の実行結果はRun Artifactを参照）
- Android／iOS CI Workflow定義の追加（GitHub Actionsの実行結果ではなく、Workflow／Job／Artifact契約の実装）

#### 実施済み・失敗

- このWindows環境でのローカルAndroid Release Buildは、Android SDK／`ANDROID_HOME`／`adb`不足により失敗。
- このWindows環境でのローカルiOS Buildは、Xcode／SimulatorがWindows上にないため実行不可。

#### 未実施

- GitHub ActionsのAndroid Emulator CI／iOS手動CIの実行、APK／Maestro／Harness Artifactの取得
- Android Emulator／実機、iOS Simulator上のDeep Link、Contract Harness、Storefront／Cart、再起動復元、実`expo-sqlite`確認
- EAS Cloud Build／Workflow／Submit、Store公開、PR本文更新

## アーキテクチャ

```text
app/
  Expo RouterのRoute

src/presentation/
  Page、Shell、Component、Route Guard

src/application/
  Use Case、DTO、Port、Application Transaction

src/domain/
  Entity、Policy、価格計算、状態遷移

src/infrastructure/
  Dexie、Session、Clock、Mock Payment、画像Asset

src/seeds/
  Default DatasetとScenario Dataset

src/test-controls/
  Reset、Clock、Delay、Inspection API
```

PresentationからIndexedDBを直接更新せず、Application Use Caseを経由します。複数Repositoryを更新する処理はApplication Transaction内で実行します。

## 主要ディレクトリ

| Path | 内容 |
|---|---|
| `app/` | Expo Router Route |
| `src/presentation/` | UI、Shell、Route Guard |
| `src/application/` | Use Case、DTO、Port |
| `src/domain/` | Domain Model、Policy、Service |
| `src/infrastructure/` | DexieなどのAdapter |
| `src/seeds/` | Seed DatasetとScenario |
| `src/test-controls/` | Test API |
| `tests/` | Vitest Test |
| `e2e/web/` | Playwright Test |
| `scripts/` | Build・Security・Asset検証Script |
| `public/` | 静的AssetとCloudflare Header設定 |
| `docs/` | Project運用、ADR、計画、Report |

AI Agentによる作業ルールは[`AGENTS.md`](./AGENTS.md)と[`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md)を参照してください。

## CI/CD

Pull Requestでは主に次を検証します。

- Format、Lint、TypeScript
- 商品画像Manifest
- CredentialとRuntime Securityの静的検証
- Unit、Integration、Repository Contract、Component、Contract Test
- Automation設定のWeb Build
- Production設定のWeb Build
- Chromium E2E
- Accessibility
- Mobile管理画面境界
- Desktop、Tablet、Mobile、Small MobileのUI Review Screenshot

mainへのPush、定期実行、手動実行では、Mobile Chromium、Role横断Flow、Firefox、WebKitの検証も追加します。

CloudflareのSecretが設定されている場合は、Pull Request PreviewとmainへのProduction Deployを実行します。

## 制約

このアプリはテスト自動化学習用です。

- 実際の販売、決済、配送は行いません
- Backend Serverはありません
- Database、Session、Guest Identityはブラウザ内に保存されます
- 認証と権限制御は実サービス相当のSecurityを提供しません
- 外部Payment、Email、配送APIは使用しません
- 複数端末・複数Browser間のData同期はありません
- Backend API、Network障害、Server-side認可の学習は対象外です
- 商品画像はリポジトリに同梱された静的Assetから選択します。管理画面からの画像Uploadには対応していません
- Guest Checkout、Coupon、Point、Wishlist、返品、返金は対象外です
- 管理画面は1024px以上を対象とします

実サービスのSecurity、Backend、外部連携を含むテスト教材としては使用できません。主な対象は、Web UI、Client-side状態、業務Rule、Role別操作、Accessibilityの自動テストです。

## Native対応について

NativeはPhase 2前半として、GuestのHome、Catalog、Search、Category、Product、Variation、Cart、Guide／Legalを実装しています。Login、Account、Checkout、Payment、Order、Review、Adminは後半対象のplaceholderです。

NativeはWebとは別のRoot／Route／Shell、Customer-only SQLite、Native KV、PBKDF2 adapterを使用します。色、8px Grid、Radius、Typography、Touch Target、商品画像比率は`src/presentation/design/tokens.ts`を共有契約とし、Nativeのstyle／primitiveへ接続しています。実Android／iOSのローカルBuild、Install、起動、操作、実SQLite Smokeは、Android SDK／adb／EmulatorおよびXcode／Simulatorが利用できる環境で確認します。EASは静的設定確認のみで、Cloud Build／Workflow／Submitは実行しません。
