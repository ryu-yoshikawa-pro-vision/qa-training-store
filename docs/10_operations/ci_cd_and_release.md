# CI/CD・Release設計

## 1. Branch

- `main`: Release可能な正本
- `feat/*`, `fix/*`, `docs/*`, `chore/*`
- Direct pushを避け、PR CIを通す

## 2. PR CI

1. format/lint/typecheck
2. Image Manifest・File・Hash・容量・Release済みAsset append-only検証
3. GitHub Credential非混入Static Check
4. Unit・Application Integration（PBKDF2、ApplicationTransactionRunner Rollback、Cart親Versionを含む）
5. Dexie Repository / Admin Query / Image Asset Catalog Contract（Index Key投影を含む）
6. `pnpm run build:web`（画像Manifest生成・検証を含む）
7. Playwright Chromium必須E2E 12本
8. Markdown Link/Requirement ID検査
9. Cloudflare Preview Deploy

Native Build、Migration、Public Build不存在検査はPhase 1に含めません。

## 3. main CI

- PR CI全件
- Chromium Mobile
- Firefox/WebKit主要Smokeを可能な範囲で実行
- Cloudflare Production Deploy
- Deployed Smoke

## 4. 定期CI

| 頻度 | 内容 |
|---|---|
| 毎日 | Deployed Smoke |
| 週次 | Firefox/WebKit、Accessibility、many-products Benchmark |

Visual、Android/iOS、Migration/Importは将来Phaseです。

## 5. Artifact

E2E失敗時:

- Trace、Screenshot、必要なVideo
- Console
- App/Schema/Seed/Build Version
- Scenario、Clock、Payment Delay

DB ExportやGateway LedgerはPhase 1で生成しません。

## 6. Version

| 種別 | 例 |
|---|---|
| App | 0.1.0 |
| Schema | 1 |
| Seed | Build Metadataの`SEED_VERSION` |

Schema変更とSeed期待値変更をRelease Noteへ記載します。Seedの数値は本書へ重複記載せず、Seed Catalogから生成したBuild Metadataの`SEED_VERSION`をCI、Artifact、Deployed Smokeの正本として参照します。

## 7. Release Gate

- Auth/Role/Rank
- Home/Search/Filter/Product Detail
- Catalog/Cart/Checkout
- Payment success/failure/retry
- Order paid→preparing→shipped→delivered
- ReviewとSummary・評価分布
- Admin Shell/Overview/Resource Pattern/限定Bulk
- Product Aggregate、SKU CRUD、GitHub画像Asset関連・append-only
- Accessibility主要Pattern
- Seed/Reset/Clock/固定Read-only Inspection
- `08_testing/e2e_design.md`のChromium必須E2E 12本とDeployed Smoke

## 8. 障害対応

- 配信障害: 直前DeployへRollback。
- IndexedDB書込障害: 利用者向けErrorを表示し、Test環境ではReset案内。
- Schema変更障害: 開発段階ではReset。正式MigrationはPhase 3。

## 9. 依存更新

Expo、Dexie、Playwrightの更新は個別PRとし、主要Flowを確認します。自動更新BranchをCloudflare Preview対象から除外してもよいものとします。
