# Codex `/goal` 実装指示：Scenario Shop Phase 1 完全実装

以下の目標を、計画作成だけで終わらせず、コード・設定・テスト・静的Assetを実際に実装し、すべての検証を通過するところまで完了してください。

## 1. 最終目標

設計正本 `ECテスト自動化学習アプリ v15` に従い、Expo Router・TypeScript・IndexedDB/Dexie・Playwrightを使用した模擬ECアプリ「Scenario Shop」のPhase 1を完成させる。

完成状態では、次をすべて満たすこと。

- Storefront、認証、Cart、Checkout、Payment、注文、Review、管理画面、Test Controlの全37画面が動作する。
- `02_architecture/use_case_catalog.md` に記載されたPhase 1 Use Caseをすべて実装する。
- Domain、Application、Infrastructure、Presentationの依存方向を守る。
- Seed、Reset、Test Clock、Payment Delay、固定Read-only Inspectionが決定的に動作する。
- Unit、Application Integration、Dexie Repository Contract、Component、Playwright E2Eが成功する。
- `pnpm run build:web`が成功し、Cloudflare Pagesへ配置可能な`dist`を生成する。
- CriticalまたはHigh相当の既知不具合、未実装、TODO、仮実装を残さない。

## 2. 入力と参照先

### 2.1 設計正本

設計ドキュメントのRootを`<SPEC_ROOT>`とする。実際の配置場所が異なる場合は、先頭に次が記載された`README.md`を検索してRootを特定する。

```text
Document Version: v15
Storefront表示名: Scenario Shop
Repository: ec-automation-training-app
```

設計ドキュメントは参照専用とし、今回の作業では編集しない。

### 2.2 仕様の優先順位

競合がある場合は、次の順で判断する。

1. この実装指示に明示した確定事項
2. `<SPEC_ROOT>/13_decisions/decision_log.md`
3. `<SPEC_ROOT>/00_overview/project_scope.md`
4. `<SPEC_ROOT>/00_overview/implementation_phases.md`
5. `<SPEC_ROOT>/01_requirements/*`
6. `<SPEC_ROOT>/03_domain/*`
7. `<SPEC_ROOT>/04_data/*`
8. `<SPEC_ROOT>/05_ui/*`、`<SPEC_ROOT>/06_flows/*`
9. `<SPEC_ROOT>/07_testability/*`、`<SPEC_ROOT>/08_testing/*`
10. Deployment、Operations、Quality文書

実装者独自の仕様を追加しない。競合を推測で拡張せず、上位正本と受入基準から最小の実装を選ぶ。

### 2.3 この指示で確定する補正

v15内にはSeed Versionの表記差があるため、実装では次を正とする。

```text
App Version: 0.1.0
Schema Version: 1
Seed Version: 10
Image Manifest Version: 1
```

`<SPEC_ROOT>/07_testability/seed_catalog.md`冒頭に残るSeed Version `9`は旧表記として扱い、コード・Build Metadata・Test期待値では`10`を使用する。設計文書自体は変更しない。

## 3. 絶対条件

### 3.1 Git禁止

次を含む、すべてのGitコマンドを実行しない。

```text
git status
git diff
git add
git commit
git push
git pull
git fetch
git checkout
git switch
git branch
git merge
git rebase
git reset
git clean
gh
```

Git状態の確認、Branch作成、Commit、Push、PR作成は利用者が行う。

### 3.2 実装対象

作成・変更してよいものは、アプリの実装に必要な次の成果物だけとする。

- TypeScript／TSX／CSS Module
- Expo・TypeScript・Lint・Format・Test・Playwright設定
- package.json、lockfile
- Unit／Integration／Repository Contract／Component／E2E Test
- Seed Data、Test Fixture、静的住所辞書
- 商品画像Fixture、画像Manifest設定、生成・検証Script
- Cloudflare Pages向け静的設定
- 必要最小限のCI Workflow

実装計画書、作業報告書、レビュー記録、独自仕様書をRepository内に新規作成しない。最終回答で実装概要と検証結果だけを報告する。

### 3.3 禁止事項

- Phase 2・Phase 3の先行実装
- Native Build、SQLite Adapter、Maestro
- Guest Checkout
- Cancel、Return、Refund
- Payment timeout、unknown、Reconciliation、Gateway Ledger
- Import、Export、Migration Recovery
- Wishlist、Recommendation、Coupon、Point、売上Chart
- Server、Workers、Pages Functions、外部Backend
- 実決済、外部住所API、外部画像API、GitHub API書込み
- FrontendへのGitHub Tokenまたは秘密情報の埋込み
- PresentationからDexieを直接呼ぶ実装
- Domain／Applicationでの`Date.now()`直接使用
- E2Eでの固定sleep
- Testの`.skip`、`.only`、失敗Testの削除、Assertionの弱体化
- `any`による契約回避、無意味な型Assertion、Error握り潰し
- TODO、FIXME、空Handler、常に成功するStub
- 仕様外の汎用Frameworkや過剰な抽象化

Local Mock Payment、Static Address Lookup、Test APIは設計済みのため実装してよい。

## 4. 実行方法

1. 既存コードを最初に確認し、利用可能な実装は保持する。
2. 以下のTaskを番号順に実装する。
3. 各Waveの検証Gateがすべて成功するまで、次のWaveへ進まない。
4. 失敗したTestやBuildは、原因を修正して再実行する。回避や無効化をしない。
5. 途中で未実装を残して最終回答へ進まない。
6. 実装中に契約型をコードへ移した後は、コードを型の正本として一貫して使用する。
7. 最後に全検証を最初から通し、全37 Routeと必須E2E 12本を確認する。

## 5. 共通技術方針

- Package Manager：`pnpm`
- Frontend：Expo、Expo Router、TypeScript strict
- Web DB：Dexie／IndexedDB
- Form：React Hook Form
- Validation：Zod
- Web複雑Widget：React Aria Components
- Shared UI：React Native `StyleSheet`
- Web専用Admin／Table／Layout：`.web.tsx`＋CSS Modules
- Unit／Integration／Contract：Vitest
- Component：Testing Library
- Web E2E：Playwright
- Accessibility：semantic HTML、Role/Name、Keyboard、axe
- 金額：整数の日本円。浮動小数金額を使用しない。
- 業務時刻：Clock Portから取得する。
- ID：IdGenerator Portから取得する。
- Application入口で整数、Version、Page、数量、在庫を検証する。

既存RepositoryにPackage Versionがある場合は、理由なく更新しない。新規構築の場合は、選択したExpo環境と互換性のある依存関係で統一する。

## 6. 必須package scripts

既存Script名を壊さず、次と同等の実行経路を用意する。既存名が異なる場合はAliasを追加する。

```json
{
  "scripts": {
    "format": "...",
    "format:check": "...",
    "lint": "...",
    "typecheck": "tsc --noEmit",
    "test:unit": "...",
    "test:integration": "...",
    "test:repository": "...",
    "test:component": "...",
    "test:contracts": "...",
    "test:e2e:chromium": "...",
    "test:e2e:mobile": "...",
    "test:smoke": "...",
    "generate:image-manifest": "tsx scripts/generate-image-manifest.ts",
    "validate:image-manifest": "tsx scripts/validate-image-manifest.ts",
    "build:web": "pnpm run generate:image-manifest && pnpm run validate:image-manifest && expo export --platform web",
    "verify": "pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run test:integration && pnpm run test:repository && pnpm run test:component && pnpm run test:contracts && pnpm run build:web"
  }
}
```

## 7. Task List

---

# Wave 0：現状確認と実装基盤

## T00-01 既存実装の棚卸し

### 実施内容

- 現在のDirectory、package.json、Expo Router、TypeScript、Test設定を確認する。
- 設計の推奨構成と現在構成を比較し、必要な差分だけ実装する。
- 既存の正常なコードを無意味に書き換えない。
- Gitコマンドを使わず、Filesystemと通常Commandだけで確認する。

### 参照

- `README.md`
- `00_overview/project_scope.md`
- `02_architecture/repository_structure.md`
- `13_decisions/decision_log.md`

## T00-02 ToolchainとDirectory基盤

### 実施内容

- Expo RouterのRoute Groupを準備する。
- `src/domain`、`src/application`、`src/infrastructure`、`src/presentation`、`src/seeds`、`src/test-controls`を設計どおり分離する。
- TypeScript strict、Path Alias、ESLint、Formatter、Vitest、Testing Library、Playwrightを構成する。
- `app.config.ts`へautomation/local Build Metadataを組み込む。
- `EXPO_PUBLIC_APP_ENV`、`EXPO_PUBLIC_BUILD_KIND`、`EXPO_PUBLIC_TEST_MODE`、`EXPO_PUBLIC_DEFAULT_SEED`を扱う。

### Wave 0 Gate

```bash
pnpm install
pnpm run format:check
pnpm run lint
pnpm run typecheck
```

この時点で最低限のExpo Web起動と空のRoute解決が成功すること。

---

# Wave 1：Domain・契約・共通Port

## T01-01 Domain型とApplication契約

### 実施内容

- `domain_types.md`のEntity、Enum、Valueを`src/domain/contracts/`へ実装する。
- `application_contracts.md`のRequest、Command、DTO、Result、Error Code、`INPUT_LIMITS`を`src/application/contracts/`へ実装する。
- `ApplicationError`とfield error、message key、retryableを`src/application/errors.ts`へ実装する。
- Presentation RequestにCurrent User、Role、Rank、Actor、Guest ID、Clock、生成ID、Manifest解決値を含めない。
- Order画面DTOにGateway Key、Repository Version、内部Actor IDを含めない。

### 参照

- `04_data/domain_types.md`
- `04_data/application_contracts.md`
- `04_data/repository_interfaces.md`
- `12_quality/acceptance_criteria.md`「実装境界Gate」

## T01-02 Domain Service・Policy

### 実施内容

以下を純粋関数またはDomain Serviceとして実装する。

- Viewer／Catalog可視性
- Role／Rank／Account Status／Ownership判定
- 商品、Order、Payment、Shipment、Review状態遷移
- SKU価格、Sale価格、Rank別単価
- SKU単価ごとの会員割引floor
- 明細割引合計、送料、送料無料不足額、注文合計
- Cart数量上限、Cart統合
- Review Summary delta、未丸め平均、表示時1桁丸め
- Category／Brand／Code／SKU／Email正規化
- Search Query正規化、Facet間AND・同一Facet内OR
- active SKU合計在庫による管理商品在庫状態

## T01-03 共通Port

### 実施内容

- Clock
- IdGenerator
- CurrentSessionStore
- GuestIdentityStore
- EmailNormalizer
- PasswordHasher
- PaymentGateway
- StaticAddressLookup
- ProductImageManifestRepository

PBKDF2は次へ固定する。

```text
PBKDF2-SHA-256
210,000回
16byte Salt
32byte Hash
pbkdf2-sha256$210000$saltBase64$hashBase64
```

### Wave 1 Gate

- DomainのUnit Testを作成する。
- 価格期待値、999円×2のgold端数、送料、Review平均、状態遷移、権限、正規化を検証する。

```bash
pnpm run typecheck
pnpm run test:unit
```

---

# Wave 2：Dexie・Repository・Transaction

## T02-01 Dexie Schema

### 実施内容

- `indexeddb_schema.md`記載のPhase 1 Storeだけを実装する。
- Refund、Gateway Ledger、Import、Recovery、Migration専用Storeを追加しない。
- boolean／nullをIndex Keyに使用しない。
- `isDefaultKey`、`isActiveKey`、`optionScopeKey`などPersistence Projectionを実装する。
- Typed Objectとして住所Snapshotを保存する。
- Domain EntityとDexie RecordのMapperを分離する。

## T02-02 Repository実装

### 実施内容

- `repository_interfaces.md`のPhase 1 Interfaceを実装する。
- Search、Filter、Sort、Pagination、FacetをRepository側で実行する。
- Sortの最終Tie-breakを契約どおり固定する。
- versionによる楽観Lockを実装する。
- active Cart、active Checkout、Default Address等の一意性をApplication／Repositoryで保証する。
- UIへDexie Recordを返さない。

## T02-03 ApplicationTransactionRunner

### 実施内容

- Scopeごとに必要Storeだけを1つのDexie Transactionで開く。
- Transaction-bound Repositoryがtop-level Transactionを開始しないようにする。
- Gateway呼出し中にDB Transactionを保持しない。
- Rollback、Conflict、再読込を契約どおり実装する。

### 参照

- `04_data/indexeddb_schema.md`
- `04_data/repository_interfaces.md`
- `02_architecture/system_architecture.md`
- `06_flows/sequence_flows.md`

### Wave 2 Gate

Repository Contract Testで次を最低限検証する。

- CRUD、Unique、Index、Projection
- version conflict
- Sort／Page／Facet
- Transaction rollback
- Product Aggregate原子性
- Cart明細と親Cart version同時更新
- Order／Payment／Shipment整合
- Review Summary整合
- User Access変更とSession／Checkout整合

```bash
pnpm run typecheck
pnpm run test:repository
pnpm run test:contracts
```

---

# Wave 3：Seed・画像Asset・Test Control

## T03-01 Seed基盤

### 実施内容

- Seed Version `10`としてBuild Metadataを生成する。
- 基準時刻、固定Account、Category、Brand、商品、SKU、Order、Payment、Shipment、Review、Summaryを実装する。
- Password平文をSeed DBへ保存しない。
- defaultとPhase 1 Scenarioを差分Patchではなく、参照整合した完全Datasetとして生成する。
- `many-products`は1,000商品・3,000 SKUを固定規則で生成する。
- Seed投入完了時に外部Key、集計、Snapshotの整合を検証する。

### 必須Scenario

`seed_catalog.md`第11章の全Scenarioを実装する。特に以下を省略しない。

- empty-catalog
- cart-with-invalid-items
- payment-processing
- guest-cart-merge-overflow
- checkout-resume／checkout-replaced／cart-version-invalidates-checkout
- inactive-image-existing-link
- product-aggregate-edit
- cross-role-product-lifecycle
- product-delete-blocked
- admin-bulk-partial-failure

## T03-02 商品画像Asset Catalog

### 実施内容

- `config/product-image-assets.json`を作成する。
- Seedが参照するWebP画像を`public/images/products/`へ配置する。
- 外部画像を実行時取得しない。画像が存在しない場合は、Repository内で使用できる決定的なオリジナルFixtureを生成する。
- `generate-image-manifest.ts`でMIME、寸法、容量、SHA-256を取得する。
- `src/generated/product-image-manifest.ts`と診断用JSONを生成する。
- File不存在、Hash不一致、500KB超過、重複、Seed参照切れをBuild Errorにする。
- Runtimeでは生成済みTypeScript Moduleだけを使用する。
- 個別画像読込失敗時はPlaceholderを表示する。

## T03-03 Test Control

### 実施内容

- Automation/local Buildだけで`window.__TEST_API__`を公開する。
- 書込みはReset、Scenario Seed、Clock、Payment Delayだけに限定する。
- 読取りはMetadata、Order、Variant、Review Summaryの固定Inspection DTOだけに限定する。
- 任意Table、任意Query、任意条件、任意書換え、Script実行、外部Fetchを提供しない。
- Resetは1 Browser Context・1 Pageだけを対応条件とする。
- ResetでDexie Connectionを閉じ、DB、Current Session、Guest Identityを消去し、Seed投入後にSeed Guest IDを再設定する。
- DB delete blockedは`RESET_BLOCKED_BY_OPEN_PAGE`として失敗させる。

### 参照

- `07_testability/seed_catalog.md`
- `07_testability/testability_design.md`
- `04_data/image_asset_catalog.md`
- `04_data/storage_and_migrations.md`

### Wave 3 Gate

```bash
pnpm run generate:image-manifest
pnpm run validate:image-manifest
pnpm run test:contracts
pnpm run test:integration
```

Default Seedと全Scenarioについて、投入後の参照整合性Testを成功させる。

---

# Wave 4：Presentation基盤・Shell・共通Pattern

## T04-01 Design SystemとContent Dictionary

### 実施内容

- Design Token、Typography、Spacing、Focus、Status表示を実装する。
- UI文言をContent Dictionaryに集約し、内部Enum値を直接表示しない。
- Loading、Empty、Filter Empty、Error、Conflict、Not Foundを共通化する。
- Error SummaryとField Link、Dialog Focus管理を実装する。

## T04-02 Storefront Shell

### 実施内容

- Desktop Header、Mobile Bottom Navigationを実装する。
- Search Comboboxを組み込む。
- guest／customer／operator／adminごとのNavigationを切り替える。
- 360pxで商品2列Gridと主要CTAを操作可能にする。

## T04-03 Admin Shell

### 実施内容

- 1024px以上のWeb専用Shellを実装する。
- Side Navigation、Breadcrumb、Page Headerを統一する。
- Resource Index、Resource Detail、Filter Bar、Applied Filter、Pagination、Contextual Save Barを共通Patternとして実装する。
- Tableはsemantic HTMLを使用する。

## T04-04 Route Guardと共通Route

### 実施内容

- 公開、customer、operator/admin、admin-only、Automation adminのGuardを実装する。
- Not FoundとForbiddenを分ける。
- 法的表示3画面を実装する。

### 対象画面

- CM-08 権限不足
- CM-09 Not Found
- CM-10 利用規約
- CM-11 プライバシーポリシー
- CM-12 模擬取引表示

### 参照

- `05_ui/design_system.md`
- `05_ui/page_patterns.md`
- `05_ui/ui_content_dictionary.md`
- `05_ui/screen_list.md`
- `05_ui/ui_specifications.md`
- `05_ui/wireframes.md`

### Wave 4 Gate

```bash
pnpm run typecheck
pnpm run test:component
pnpm run build:web
```

KeyboardでShell、Navigation、Dialog、Comboboxの基本操作ができること。

---

# Wave 5：認証・Account・配送先

## T05-01 Register／Login／Logout／Current User

### 実施内容

- Register、Login、Logout、Current UserをUse Case経由で実装する。
- active customer/operator/adminはLogin可能とする。
- customerだけGuest Cartを同一Transactionで統合する。
- operator/adminはSessionだけを作成する。
- suspended/withdrawnは拒否する。
- CurrentSessionStore設定失敗時にDB変更を開始しない。
- Transaction失敗時はPointerをclearし、Guest Cartを保持する。

## T05-02 Profileと配送先

### 実施内容

- Profileの取得・更新とactionVersionを実装する。
- 配送先最大5件、最初の住所自動Default、Default変更・削除後の決定的再割当を実装する。
- Static Address Lookupを実装する。

### 対象画面

- CM-06 Login
- CM-07 新規登録
- SH-10 Profile
- SH-11 配送先管理

### 参照

- `03_domain/roles_and_permissions.md`
- `04_data/application_contracts.md`「認証契約」
- `06_flows/sequence_flows.md` Login／Register
- `05_ui/validation_and_messages.md`

### Wave 5 Gate

- Auth Application Integration Test
- PBKDF2 Contract Test
- Login Role分岐Test
- Guest Cart統合Rollback Test
- Address Default一意性Test
- 対象画面Component Test

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:component
```

---

# Wave 6：Storefront Catalog

## T06-01 Home・Navigation

### 実施内容

- Home Category／Brand、Viewer条件付き新着最大8件、Sale最大8件を実装する。
- 在庫切れ公開商品も表示し、購入不可を示す。
- Test ClockをCatalog Queryへ渡す。

## T06-02 商品検索

### 実施内容

- 全商品、検索結果、Category別一覧を実装する。
- Keyword、Category、Brand、価格、在庫、Sale、Rating、Sort、PageをURLへ保持する。
- 同一Facet内OR、Facet間ANDを実装する。
- Facet件数は対象Facet自身の選択だけを除いて計算する。
- Applied Filter個別解除・全解除、Mobileまとめ適用、0件復旧導線を実装する。
- 戻る時にQuery、Page、Scroll位置を復元する。

## T06-03 Search Suggestion

### 実施内容

- 最大8件、Keyboard、Escape、Enterを実装する。
- 古い非同期結果が新しい入力を上書きしないようにする。
- 遷移先を次へ固定する。
  - product → `/products/[productId]`
  - category → `/categories/[categoryId]`
  - brand → `/search?brand=[brandId]`
  - 候補外Enter → `/search?q=...`

## T06-04 商品詳細

### 実施内容

- Gallery、Primary画像、Placeholder、価格階層、SKU選択、在庫、送料条件、Review平均・分布、Review一覧を実装する。
- Variation 12件はButton、13件はSelect境界とする。
- Rank制限、非公開、販売終了、存在しない商品を正しく処理する。

### 対象画面

- CM-01 Home
- CM-02 全商品一覧
- CM-03 検索結果
- CM-04 Category別商品一覧
- CM-05 商品詳細

### 参照

- `03_domain/business_rules.md`
- `04_data/application_contracts.md`「Storefront Query・DTO」
- `07_testability/seed_catalog.md` Home／Search／価格期待値
- `05_ui/ui_specifications.md`
- `06_flows/user_flows.md`

### Wave 6 Gate

- Home新着8件とSale期待値
- Viewer条件
- Facet件数
- Sort tie-break
- active SKU価格幅
- active SKU合計在庫Filter
- Search Suggestion遷移
- Review平均未丸めSort／Filter

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
```

---

# Wave 7：Cart

## T07-01 Cart Use Case

### 実施内容

- Get、Add、Quantity Update、Remove、Price Change Accept、Guest Mergeを実装する。
- 初回AddではPresentationからCart Versionを要求しない。
- owner解決、active Cart取得または作成、明細加算、親Version更新を同一Transactionで行う。
- 数量変更・削除はCart／Item versionを使用する。
- 価格、在庫、公開、権限、上限を再検証する。
- Cart DTOだけで画面表示に必要な情報を返す。

## T07-02 Cart画面

### 実施内容

- 追加時価格、現在価格、会員価格、数量、最大数量、問題Code、送料、合計、送料無料不足額を表示する。
- Guestとcustomerだけ利用可能とする。
- operator/adminはForbiddenとする。
- 無効明細の理由と復旧Actionを表示する。

### 対象画面

- CM-13 Cart

### Wave 7 Gate

- 初回Cart作成
- 親Cart version増加回数
- 数量0削除
- 上限拒否
- 価格変更承認
- Guest Cart統合と超過結果
- 無効明細4種

```bash
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
```

---

# Wave 8：Checkout・Payment・customer Order

## T08-01 Checkout Session

### 実施内容

- Start、Resume、Replace、Expireを実装する。
- Userごとのactive Session最大1件を保証する。
- Cart変更時はSessionを即時更新しない。
- Guard、確認、注文確定でCart Version不一致を検出してCartへ戻す。
- 次回Start時に旧Sessionをabandonedへ変更する。
- 24時間期限切れをApp起動、Guard、Start時に判定する。

## T08-02 配送先・支払方法・注文確認

### 実施内容

- 配送先Snapshot、Test Payment Method、Confirmation DTOを実装する。
- Address→Payment→Confirmの直接URL制御を実装する。
- 合計入りCTA、Desktop Sticky Summary、Mobile折りたたみSummaryを実装する。

## T08-03 Order作成とPayment

### 実施内容

- 注文作成Transaction内で価格、在庫、Cart／Checkout Versionを再検証する。
- 価格差異時はOrder／Paymentを作らない。
- Order Itemへ商品、SKU、画像Path、Alt Text、価格、割引、会員ランク、配送先をSnapshotする。
- Payment Gateway呼出しはTransaction外で行う。
- Gateway結果受領後にClockを1回読み、Payment／Historyへ同じ時刻を保存する。
- success、declined、insufficient、auth-failedを決定的に処理する。
- 成功時だけ在庫を1回減算する。
- processing再読込は同じAttemptを再開し、完了済みは既存結果を返す。
- failed OrderのRetryは新Attemptを作成する。

## T08-04 注文画面

### 対象画面

- SH-01 配送先
- SH-02 支払方法
- SH-03 注文確認
- SH-04 支払い処理中
- SH-05 注文完了
- SH-06 支払い失敗
- SH-07 注文一覧
- SH-08 注文詳細・再支払い

### 参照

- `03_domain/state_transitions.md`
- `04_data/application_contracts.md`「Cart・Checkout」「Order・Payment」
- `06_flows/sequence_flows.md`
- `07_testability/seed_catalog.md`価格期待値

### Wave 8 Gate

- TEST-SUCCESS
- 明確失敗4種
- Retry
- processing再読込
- 二重Submit防止
- 価格変更／在庫変更／Rank変更再確認
- Payment成功時だけ1回在庫減算
- Order／Payment／Shipment／History Snapshot整合

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
```

---

# Wave 9：Admin Shell・Overview・Master

## T09-01 Overview

### 実施内容

- 発送準備待ち、低在庫SKU、非公開Review、最近のOrder、Quick Actionを実装する。
- 低在庫はactive SKU在庫1～5、在庫0は除外する。

## T09-02 Category管理

### 実施内容

- Search、Create、名称Update、Active State変更、Reorderを実装する。
- 新規は末尾へ10刻みで追加する。
- Reorderは全ID必須、10刻み再採番、Keyboard代替を提供する。
- 公開商品参照中の無効化を拒否する。

## T09-03 Brand管理

### 実施内容

- Search、Create、名称Update、Active State変更を実装する。
- 表示順は名称順固定とし、Reorderを作らない。
- 公開商品参照中の無効化を拒否する。

### 対象画面

- AD-01 Overview
- AD-05 Category管理
- AD-06 Brand管理

### Wave 9 Gate

```bash
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
```

---

# Wave 10：Admin商品Aggregate・画像関連

## T10-01 商品一覧

### 実施内容

- Search、Status、Rank、Category、Brand、価格、在庫、Sort、Pageを実装する。
- 在庫Filterはactive SKU合計在庫を使用する。
- Bulkは現在Pageの最大50件、公開／非公開だけに限定する。
- 部分成功を成功件数・失敗件数・対象理由として表示する。

## T10-02 商品登録

### 実施内容

- 商品本体、SKU、初期在庫、Category、Brand、画像関連を1つのFormで扱う。
- 作成は必ずdraft、publishedAt未設定とする。
- active SKUを最低1件作成する。
- 画像0件のdraft保存を許可する。
- Product、SKU、画像、INITIAL_STOCK、0件Review Summaryを同一Transaction・同一Clock時刻で作成する。

## T10-03 商品編集

### 実施内容

- 商品項目、SKU追加・価格変更・無効化・条件付き削除、画像追加・解除・Primary・順序・Alt Textを実装する。
- 既存在庫を商品編集から変更しない。
- Updateでstatus、publishedAt、Review Summaryを変更しない。
- 状態変更は専用Use Caseだけを使用する。
- discontinuedを終端とする。
- draft削除は参照がない場合だけ、Aggregateと0件Summaryを削除する。
- Asset Binaryを削除しない。

## T10-04 Preview・Duplicate

### 実施内容

- Previewは未保存Form DTOから生成し、DBへ保存しない。
- 最小Validation不合格時はPreviewを拒否する。
- Duplicateは新規登録Formへ転記するだけでDBを変更しない。
- Code／SKUは空、在庫0とする。

### 対象画面

- AD-02 商品一覧
- AD-03 商品登録
- AD-04 商品詳細・編集

### 参照

- `04_data/application_contracts.md`「Product Aggregate契約」
- `04_data/image_asset_catalog.md`
- `03_domain/business_rules.md`
- `05_ui/page_patterns.md`

### Wave 10 Gate

- Aggregate全体Rollback
- draft作成
- 公開条件
- SKU 1件以上
- Variationなし／あり境界
- 画像Primary一意
- inactive Asset既存維持／再関連拒否
- INITIAL_STOCK履歴
- draft削除制約
- Bulk部分成功

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
```

---

# Wave 11：在庫・Admin注文・配送

## T11-01 在庫一覧・調整

### 実施内容

- SKU単位でSearch、Filter、Sort、Pageを実装する。
- 在庫変更理由、増減、Version、履歴を実装する。
- 商品編集とは責務を分離する。

## T11-02 Admin注文一覧・詳細

### 実施内容

- 注文番号、顧客、状態、期間、合計、Sort、Pageを実装する。
- 顧客概要と注文Snapshotを表示する。
- `orderActionVersion`で操作Requestを構築する。

## T11-03 配送状態変更

### 実施内容

- paid→preparing
- preparing→shipped
- shipped→delivered
- Shipment pending作成、配送会社、追跡番号を実装する。
- OrderとShipmentを同一Transactionで更新する。
- 更新後の新しいAction Versionを返す。

### 対象画面

- AD-07 在庫一覧・調整
- AD-08 注文一覧
- AD-09 注文詳細・配送操作

### Wave 11 Gate

```bash
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
```

---

# Wave 12：Review・User管理・Test Control UI

## T12-01 customer Review

### 実施内容

- deliveredかつ本人Order Itemだけ投稿可能とする。
- Order Item 1件につき生涯1件とし、論理削除後も再投稿を拒否する。
- 既存Reviewの評価、Title、本文、Status、Versionを取得して編集できるようにする。
- 星評価をKeyboard操作可能にする。
- Create／Update／DeleteでSummaryと分布を同時更新する。

## T12-02 Admin Review

### 実施内容

- Search、Status、Rating、Sort、Pageを実装する。
- published／hidden切替、History、Summary更新を同一Transactionで行う。
- Bulkは現在Page最大50件、非公開／再公開だけとする。

## T12-03 User管理

### 実施内容

- User一覧・詳細をadminだけに提供する。
- Rank変更はcustomer内だけとし、active CheckoutをabandonedにしてCartを保持する。
- Role変更はoperator/admin間だけとし、最後のadmin、自己変更を保護する。
- Status変更はactive/suspended間だけとし、最後のadmin、自己停止を保護する。
- Role／Status変更で全Sessionを無効化する。
- customer停止時はactive Checkoutもabandonedにする。
- withdrawnとcustomer Roleは読取専用とする。

## T12-04 Test Control画面

### 実施内容

- Automation adminだけに表示する。
- Scenario Reset、Clock、Payment Delay、App／Schema／Seed／Build Versionを操作・表示する。
- Test APIの制約をUIから迂回できないようにする。

### 対象画面

- SH-09 Review投稿・編集
- AD-10 Review管理
- AD-11 User一覧
- AD-12 User詳細
- AD-13 Test Control

### Wave 12 Gate

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
```

---

# Wave 13：全画面状態・Accessibility・Responsive

## T13-01 全37 Route確認

次の画面がすべて実装済みであることを確認する。

### Storefront・公開 13画面

- CM-01～CM-13

### customer 11画面

- SH-01～SH-11

### Admin 13画面

- AD-01～AD-13

## T13-02 状態表示

全画面で必要に応じて次を実装する。

- Initial Loading
- Reload Loading
- Data Empty
- Filter Empty
- Validation Error
- Application Error
- Conflict
- Not Found
- Forbidden
- Disabled／Unavailable
- Success Feedback

## T13-03 Accessibility

- Web主要購入FlowをKeyboardだけで完了できるようにする。
- Search Combobox、Rating Radio Group、Error Summary、Dialog、Filter SheetをScreen Reader操作可能にする。
- Errorを色だけで表現しない。
- Focus Ringを消さない。
- 重大なaxe違反を解消する。

## T13-04 Responsive

- Storefrontは360pxで主要操作を完了できるようにする。
- Adminは1024px以上を対象とし、それ未満ではサポート条件を明示する。
- StorefrontとAdminの情報密度・Shellを混在させない。

### Wave 13 Gate

```bash
pnpm run test:component
pnpm run typecheck
pnpm run build:web
```

主要画面を実ブラウザで確認し、Layout崩れ、操作不能、Console Errorがないこと。

---

# Wave 14：Playwright E2E

## T14-01 Test Fixture

### 実施内容

- TestごとにScenarioを明示してResetする。
- Reset前に同一Contextの余分なPageを閉じる。
- Reset後にReloadし、MetadataとSession／Guest Identity整合を確認する。
- 固定sleepを使用せず、URL、Accessible状態、Loading消失、Order状態を待つ。
- LocatorはRole、Name、Labelを優先する。
- `testID`はRole／Nameだけで一意化できない業務要素に限定する。

## T14-02 必須E2E 12本

次をすべて実装する。

1. Guestの商品検索・Filter・商品詳細・Cart追加
2. Guest Cartの数量変更・削除・上限拒否
3. LoginとGuest Cart統合結果
4. customerのCheckout・TEST-SUCCESS購入
5. 明確なPayment失敗・Order詳細から再試行
6. 価格変更・在庫変更・会員ランク変更によるCheckout再確認
7. Order一覧・詳細・処理中Route再読込
8. delivered商品のReview投稿・編集
9. 管理者の商品Aggregate登録・Preview・公開
10. 管理者の商品編集・SKU／画像関連変更・非公開・draft削除制約
11. 在庫調整・Order準備開始・発送・配送完了
12. User停止・Login拒否・最後のadmin保護

## T14-03 Cross-role Lifecycle

PR必須12本とは分け、main／週次相当のSuiteとして次を実装する。

```text
admin商品登録・公開
→ customer検索・購入
→ admin発送・配送完了
→ customer Review投稿
```

## T14-04 E2E Artifact

失敗時に次を保存する。

- Trace
- Screenshot
- 必要なVideo
- Console
- Scenario
- Clock
- Payment Delay
- App／Schema／Seed／Build Version

### Wave 14 Gate

```bash
pnpm exec playwright install chromium
pnpm run test:e2e:chromium
pnpm run test:e2e:mobile
```

Firefox／WebKitは可能な範囲でSmokeを実行し、環境依存で実行不能な場合もSuiteと設定は完成させる。

---

# Wave 15：Build・Cloudflare・CI・最終検証

## T15-01 Web Build

### 実施内容

- `pnpm run build:web`だけを正式Build経路とする。
- Manifest生成・検証を迂回する別Buildを作らない。
- Outputを`dist`とする。
- Expo Web `output: single`を設定する。
- `_headers`を設計どおり配置する。
- 独自静的404を置かず、Expo Routerの`+not-found`を使用する。

## T15-02 Security Static Check

次を自動検査する。

- GitHub Token、秘密情報、固定Credentialの混入なし
- Test Password平文がRuntime Seed DBへ入っていない
- Runtimeの外部Fetchなし
- FrontendからGitHub書込みなし
- Runtime Manifest Fetchなし
- Test APIがautomation/local Build以外へ公開されない

## T15-03 CI Workflow

コードとして次の順序を実行できるWorkflowを実装する。

1. format／lint／typecheck
2. Image Manifest検証
3. Credential非混入Check
4. Unit／Application Integration
5. Dexie Repository Contract
6. `pnpm run build:web`
7. Chromium必須E2E 12本
8. Cloudflare Preview／ProductionはCredentialがある環境だけで実行
9. Deploy後Smokeは`DEPLOYED_BASE_URL`がある場合に実行

GitまたはGitHub CLIコマンドは実行しない。Workflow Fileの実装だけを行う。

## T15-04 最終全件検証

次を順番に実行し、すべて成功させる。

```bash
pnpm install
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
pnpm run test:contracts
pnpm run build:web
pnpm run test:e2e:chromium
pnpm run test:e2e:mobile
```

`DEPLOYED_BASE_URL`が設定されている場合だけ次も実行する。

```bash
pnpm run test:smoke
```

## 8. 最終静的検査

最終回答前に、通常の検索Commandで次を確認し、該当があれば解消する。

- `TODO`
- `FIXME`
- `.skip(`
- `.only(`
- `Date.now(`がClock Adapter外に存在しないか
- PresentationからDexie importがないか
- `Math.random(`が業務ロジックにないか
- GitHub Token名や秘密情報がないか
- Phase 2／3の未使用ModuleやTableがないか
- Runtime Manifest Fetchがないか
- E2Eの固定sleepがないか
- Console Errorを握り潰していないか

## 9. 完了条件

以下をすべて満たした場合だけ完了とする。

- 全37画面がRouteから表示・操作できる。
- Phase 1 Use Caseがすべて実装されている。
- `12_quality/acceptance_criteria.md`のPhase 1受入基準を満たす。
- Chromium必須E2E 12本が成功する。
- Unit、Integration、Repository Contract、Component、Buildが成功する。
- Seed Version 10、Schema Version 1がMetadataへ表示される。
- defaultおよびScenario Seedが決定的である。
- UIからDexieを直接呼んでいない。
- Phase 2／3機能を実装していない。
- TODO、仮実装、Test無効化がない。
- Gitコマンドを一度も実行していない。

## 10. 最終回答形式

作業完了後は、Repository内に報告書を作らず、回答本文で次だけを簡潔に報告する。

1. 実装したWave／主要機能
2. 主要な追加・変更File群
3. 実行した検証Commandと結果
4. 実行できなかった検証がある場合、その理由
5. 残課題。なければ「残課題なし」

設計を再説明したり、Git操作を案内したりしない。
