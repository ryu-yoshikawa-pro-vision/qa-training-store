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

現在の実装はPhase 1としてWebを対象としています。

| 項目 | 内容 |
|---|---|
| Platform | Desktop / Mobile Web |
| Storefront | Home、商品一覧、検索、Category、商品詳細、Cart |
| Customer | Account、配送先、Checkout、注文履歴、Review |
| Admin | Overview、商品、Category、Brand、在庫、注文、Review、User管理 |
| Database | IndexedDB + Dexie |
| Payment | 決定的なLocal Mock |
| E2E | Playwright |
| Hosting | Cloudflare Pages |
| 管理画面 | 1024px以上のDesktop Web |
| 購入可能Role | activeなcustomer |

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
- Review投稿・編集

### Operator / Admin

- 管理Overview
- 商品、SKU、商品画像の登録・編集
- 商品公開・非公開と削除制約
- Category、Brand管理
- 在庫調整と在庫履歴
- 注文準備、発送、配達完了
- Review公開状態の管理
- User、Role、会員Rank、Account Statusの管理
- 最後のAdminを保護する制約
- Automation Build専用のTest Control

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

依存Packageの正確なVersionは[`package.json`](./package.json)を参照してください。

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

### Production Build

```bash
pnpm run build:web
```

Font Asset準備、商品画像Manifest生成・検証、Expo Web Exportを順に実行し、`dist/`へ出力します。

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
- `setClock(isoString)`
- `setPaymentDelay(milliseconds)`
- `getMetadata()`
- `inspectOrder(orderId)`
- `inspectVariant(variantId)`
- `inspectReviewSummary(productId)`

Production BuildにはTest APIを公開しません。

### Reset後のReload

Database ResetではIndexedDBを削除し、新しいDatabase Instanceを作成します。

Reset後は、Application Serviceが新しいDatabase Instanceを参照するようにページをReloadしてください。Playwrightの`scenario` FixtureはReset後のReloadまで自動で実行します。

```ts
await scenario("payment-declined");
```

E2EからTest APIを直接操作する場合も、`reset()`後にReloadが必要です。

## テストと検証

### Format・静的検証

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run validate:image-manifest
pnpm run security:check
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

初回はChromiumをInstallします。

```bash
pnpm exec playwright install chromium
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
- Web Build
- Chromium E2E
- Accessibility
- Mobile管理画面境界
- Desktop、Tablet、Mobile、Small MobileのUI Review Screenshot

mainへのPush、定期実行、手動実行では、Mobile Chromium、Role横断Flow、Firefox、WebKit、Production Buildも追加で検証します。

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
- Guest Checkout、Coupon、Point、Wishlist、返品、返金は対象外です
- 管理画面は1024px以上を対象とします

実サービスのSecurity、Backend、外部連携を含むテスト教材としては使用できません。主な対象は、Web UI、Client-side状態、業務Rule、Role別操作、Accessibilityの自動テストです。

## Native対応について

Android・iOSアプリは現在の対象外です。

Domain ModelとApplication Contractの再利用を想定していますが、Native対応ではPresentation、Storage、Session、E2E環境の再設計が必要です。現在のWeb UIがそのままAndroid・iOSで動作することは保証しません。
