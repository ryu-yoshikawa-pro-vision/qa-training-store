# Issue #132 follow-up Domain / Application境界Refactor Plan

## 0. 依頼概要

- 起点Issue: #132 `investigate: Domain → Application type dependencyのarchitecture方針を確定する`
- Decision PR: #178
- Decision ADR: `docs/adr/0027-application-owned-repository-ports.md`
- 作業branch: `plan/issue-132-follow-up-domain-application-boundary`
- branch作成時の`main`: `9cef8501c2b19e1764892b0c17ee50318fa90b97`
- PR #178 merge後のWeb CI #1200 successを確認済み。
- Issue #132のdecision-only作業は完了している。本PlanはADR-0027で確定した方針をCurrent sourceへ反映するfollow-up実装だけを扱う。
- Plan作成時点ではPlan-onlyとして開始したが、実装境界を見直し、PR #180の同一branchで本Planの実装まで行う方針へ変更した。PR #180はPlanとsource / test実装を同一PRで扱う。
- PR #180のhead branch `plan/issue-132-follow-up-domain-application-boundary`をそのまま実装branchとして使用し、本PlanのTask 0以降を同PRで実行する。別branch / 別実装PRは作成しない。

## 1. 結論

follow-up実装は、Domain → Applicationの既知違反を解消し、同じ依存を再導入できないstatic contractを追加するために行う。

実装方針は次で固定する。

1. Current `src/domain/repositories/**`の24 Repository interfaceを再評価した結果、Domain sourceからのconsumerは存在しない。現在利用されているRepository PortはApplication / Infrastructure境界として使われているため、使用中の20 interfaceをApplication ownershipへ移す。
2. `ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`はinterfaceとして利用されていないため移動せず削除する。
3. `SettingsRepository`もApplication / transaction経路から利用されず、`DexieSettingsRepository`も生成されていないため、interfaceと実装classを削除する。ただし`app_settings` Store自体はSeed / Test Controlが直接使用しているため削除しない。
4. Repository contractの新しい配置は`src/application/repositories/{contracts.ts,index.ts}`とする。既存`src/application/ports.ts`へ20 interfaceを集約しない。
5. `ProductViewer`はApplication ownershipを維持し、`canViewerSeeProduct()`は`MembershipRank | null`だけをDomain-owned inputとして受け取る。
6. `tests/contracts/architecture.test.ts`へDomain → Application禁止のstatic contractとscanner self-testを追加する。
7. Product behavior、Repository method semantics、Database schema、transaction scope、Native / Web featureは変更しない。

Repository interfaceの機能的再設計やmethod分割は行わない。今回の目的はownershipとdependency directionの修正であり、既存のRepository APIを改善することではない。

## 2. Current状態

### 2.1 Architecture authority

ADR-0027で次が確定している。

- Domain → Application dependencyはruntime / type-onlyを問わず禁止する。
- Application DTO / query / commandと`ProductViewer`はApplication ownershipを維持する。
- Repository Portのownerは責務とconsumerで決める。
- Application / Infrastructureだけが利用し、Application contractを境界として使うPortはApplication ownershipを第一候補とする。
- Domain behavior contractとして残す具体的理由があるPortだけDomain ownershipを維持する。
- `NFR-MA-010`は維持する。
- §4.16は`refactor_now`。

既存authorityとして次も維持する。

- `NFR-MA-001`
- `docs/CODING_STANDARDS.md §7.1`
- `docs/02_architecture/repository_structure.md §4`
- D-026

### 2.2 Current Repository interface inventory

`src/domain/repositories/contracts.ts`には24 interfaceがある。

Application contract型をsignatureへ使用する17件:

1. `UserRepository`
2. `AddressRepository`
3. `StorefrontCatalogQueryRepository`
4. `ProductQueryRepository`
5. `AdminProductQueryRepository`
6. `ProductRepository`
7. `CategoryRepository`
8. `BrandRepository`
9. `ImageAssetCatalogRepository`
10. `InventoryRepository`
11. `CartRepository`
12. `CheckoutSessionRepository`
13. `OrderRepository`
14. `ReviewRepository`
15. `AdminOverviewQueryRepository`
16. `TestInspectionRepository`
17. `TestMetadataRepository`

Application contract型をsignatureへ使用しない7件:

1. `VersionedRepository`
2. `SessionRepository`
3. `ReviewSummaryRepository`
4. `SequenceRepository`
5. `PaymentRepository`
6. `ShipmentRepository`
7. `SettingsRepository`

`@/domain/repositories`の直接source consumerは18 fileで、Application / Infrastructureに存在する。Domain sourceからRepository interfaceを直接利用するCurrent consumerは確認されていない。

### 2.3 Current consumer

Application側の主なconsumer:

- `src/application/identity/session-identity-resolver.ts`
- `src/application/transactions/contracts.ts`
- `src/application/create-application-services.ts`
- `src/application/use-cases/account-use-cases.ts`
- `src/application/use-cases/catalog-use-cases.ts`
- `src/application/use-cases/auth-use-cases.ts`
- `src/application/use-cases/cart-use-cases.ts`
- `src/application/use-cases/admin-master-use-cases.ts`
- `src/application/use-cases/admin-operations-use-cases.ts`
- `src/application/use-cases/review-user-use-cases.ts`
- `src/application/use-cases/admin-product-use-cases.ts`
- `src/application/use-cases/checkout-order-use-cases.ts`

Infrastructure側の直接consumer:

- `src/infrastructure/database/dexie/basic-repositories.ts`
- `src/infrastructure/database/dexie/product-repositories.ts`
- `src/infrastructure/database/dexie/storefront-repositories.ts`
- `src/infrastructure/database/dexie/order-review-repositories.ts`
- `src/infrastructure/database/dexie/cart-checkout-repositories.ts`
- `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`

加えて`src/infrastructure/database/dexie/application-repositories.ts`と`transaction-runner.ts`はconcrete Repository classを組み立て、ApplicationのRepository capability / transaction scopeへ接続している。

このCurrent call pathから、Repository PortをDomainに残す具体的なconsumer要件は確認できない。

## 3. Repository Portの最終分類

### 3.0 24 interfaceの個別判断

ADR-0027の「24 Repository interfaceを一律に移動しない」という契約に従い、Current consumer、Application contract型利用、transactionでの役割、責務をinterfaceごとに確認した結果を次に固定する。

| interface | Application contract型 | Current consumer / 実装経路 | transactionでの役割 | 責務 | 判断 | 理由 |
|---|---|---|---|---|---|---|
| `VersionedRepository` | なし | 他Repository interfaceの継承元のみ | 直接なし。継承先がtransactionへ参加 | version付きEntityの共通get / update契約 | Applicationへ移動 | Domain consumerはなく、Application-owned Repository contractを構成する共通interfaceとしてだけ使う |
| `UserRepository` | あり | Identity Resolver、Auth / Account / Catalog / Cart / Admin / Review / Checkout Use Case、Dexie / SQLite | Register / Login / Cart / Checkout / User Access / Order等 | User永続化、検索、admin count | Applicationへ移動 | Application Use Caseとtransaction contractが利用し、Application query DTOも境界に含む |
| `SessionRepository` | なし | Identity Resolver、複数Use Case、Dexie / SQLite | Register / Login / User Access等 | Session永続化・削除 | Applicationへ移動 | Domain consumerはなく、Applicationの認証・session処理とtransaction境界で利用する |
| `AddressRepository` | あり | Account Use Case、Dexie / SQLite | `ApplicationTransactionRunner`外。Repository内の単一Store transaction | Address CRUDとdefault再割当 | Applicationへ移動 | Application commandを受け取り、Account Use Caseの永続化境界として利用する |
| `StorefrontCatalogQueryRepository` | あり | Catalog Use Case、Dexie storefront query adapter | なし。read query | Home / navigation catalog読取 | Applicationへ移動 | Application query / DTOを直接境界にするread port |
| `ProductQueryRepository` | あり | Catalog Use Case、Dexie storefront query adapter | なし。read query | Product検索・suggest・detail読取 | Applicationへ移動 | Application query / resultを直接境界にするread port |
| `AdminProductQueryRepository` | あり | Admin Product Use Case、Dexie product query adapter | なし。read query | Admin product検索・編集DTO読取 | Applicationへ移動 | Application admin query / DTOを直接境界にするread port |
| `ProductRepository` | あり | Catalog / Admin Product / Review Use Case、Dexie / SQLite、transaction runner | Cart / Checkout / Product Aggregate / Order等 | Product aggregate永続化・status変更・参照確認 | Applicationへ移動 | Application command / resultを含み、Application transaction contractで広く利用する |
| `CategoryRepository` | あり | Catalog / Admin Master / Admin Product Use Case、Dexie / SQLite、transaction runner | Product Aggregate / Category active state等 | Category CRUD・並べ替え | Applicationへ移動 | Application command / admin DTOを境界にし、Application transactionへ参加する |
| `BrandRepository` | あり | Admin Master / Admin Product Use Case、Dexie / SQLite、transaction runner | Product Aggregate / Brand active state等 | Brand CRUD・active state変更 | Applicationへ移動 | Application command / admin DTOを境界にし、Application transactionへ参加する |
| `ImageAssetCatalogRepository` | あり | なし。interface定義のみ | なし | Image asset catalog読取を想定した旧contract | 削除 | 実装・注入経路がなく、実経路は`ProductImageManifestRepository` / `StaticManifestRepository` |
| `ReviewSummaryRepository` | なし | Admin Product Use Case、Dexie / SQLite、transaction runner | Product Aggregate / Review change等 | Product review summary永続化 | Applicationへ移動 | Domain consumerはなく、Application transaction contractで更新対象として利用する |
| `InventoryRepository` | あり | Admin Operations Use Case、Dexie / SQLite、transaction runner | Cart / Checkout / Product Aggregate / Order等 | Inventory更新・履歴・検索 | Applicationへ移動 | Application command / query DTOを境界にし、Application transactionへ参加する |
| `CartRepository` | あり | Cart / Checkout Use Case、Dexie / SQLite、transaction runner | Register / Login / Cart mutation / Checkout / Order等 | Cart aggregate永続化・DTO構築 | Applicationへ移動 | Application command / DTO / `ProductViewer`を境界にし、Application transactionへ参加する |
| `CheckoutSessionRepository` | あり | Checkout Use Case、Dexie / SQLite、transaction runner | Start Checkout / User Access / Create Order等 | Checkout Session永続化・confirmation読取 | Applicationへ移動 | Application command / DTOを境界にし、Application transactionへ参加する |
| `OrderRepository` | あり | Admin Operations / Checkout / Review Use Case、Dexie / SQLite、transaction runner | Create Order / Payment / Shipment系 | Order永続化・検索・履歴 | Applicationへ移動 | Application query / DTOを含み、Application transaction contractで利用する |
| `SequenceRepository` | なし | transaction runner、Dexie / SQLite | Create Order | 日次sequence採番 | Applicationへ移動 | Domain consumerはなく、ApplicationのOrder transaction内だけで利用する |
| `PaymentRepository` | なし | Checkout Use Case、Dexie / SQLite、transaction runner | Create Order / Payment success・failure / Retry | Payment永続化・gateway key検索 | Applicationへ移動 | Domain consumerはなく、Application payment workflow / transactionで利用する |
| `ShipmentRepository` | なし | transaction runner、Dexie / SQLite | Payment success / Preparation / Ship / Delivery | Shipment永続化 | Applicationへ移動 | Domain consumerはなく、Application transaction scopeからのみ利用する |
| `ReviewRepository` | あり | Catalog / Checkout / Review Use Case、Dexie / SQLite、transaction runner | Review change | Review永続化・検索・status history | Applicationへ移動 | Application query / DTOを境界にし、Application transactionへ参加する |
| `AdminOverviewQueryRepository` | あり | Admin Master Use Case、Dexie overview adapter | なし。read query | Admin overview集約読取 | Applicationへ移動 | Application `AdminOverview`を返すApplication専用read port |
| `SettingsRepository` | なし | `DexieSettingsRepository`実装だけ。生成・注入なし | なし | generic settings get / set | 削除 | interface / classとも実行経路がなく、`app_settings`はSeed / Test Controlが直接利用する |
| `TestInspectionRepository` | あり | なし。interface定義のみ | なし | Automation inspectionを想定した旧contract | 削除 | 実装・注入経路がなく、Current ownerは`TestControlService` / `TestApi` |
| `TestMetadataRepository` | あり | なし。interface定義のみ | なし | Test metadata読取を想定した旧contract | 削除 | 実装・注入経路がなく、Current ownerは`TestControlService.getMetadata()` / `TestApi.getMetadata()` |

この表の判断はCurrent sourceの責務とconsumerに基づく。17 / 7は補助Evidenceであり、Application contract型の有無だけでownerを決めていない。実装開始時にmaterial driftがあったinterfaceだけ再評価する。

### 3.1 Application ownershipへ移す20 interface

次を`src/application/repositories/contracts.ts`へ移す。

- `VersionedRepository`
- `UserRepository`
- `SessionRepository`
- `AddressRepository`
- `StorefrontCatalogQueryRepository`
- `ProductQueryRepository`
- `AdminProductQueryRepository`
- `ProductRepository`
- `CategoryRepository`
- `BrandRepository`
- `ReviewSummaryRepository`
- `InventoryRepository`
- `CartRepository`
- `CheckoutSessionRepository`
- `OrderRepository`
- `SequenceRepository`
- `PaymentRepository`
- `ShipmentRepository`
- `ReviewRepository`
- `AdminOverviewQueryRepository`

理由:

- §3.0で各interfaceのCurrent consumer、transactionでの役割、責務を個別に確認した。
- Current Domain consumerがない。
- 使用中のinterfaceはApplication Use Case / transaction contract、またはApplication専用read queryから利用される。
- Infrastructure adapterがApplicationへ実装を提供する境界である。
- Application contract型を使うinterfaceはそのcontractをApplication ownershipのまま維持できる。
- Application contract型を使わないinterfaceも、Current consumerと責務からDomain-owned contractとして残す具体的理由がない。

`VersionedRepository`は複数Repository interfaceが継承する共通contractとしてそのまま移す。今回のために継承を展開しない。

### 3.2 削除する4 interface / implementation

#### `ImageAssetCatalogRepository`

削除する。

- Current sourceではinterface定義以外のconsumer / implementationがない。
- Activeな画像Manifest境界は既に`src/application/ports.ts`の`ProductImageManifestRepository`と`StaticManifestRepository`で実現されている。
- `ImageAssetCatalogRepository`を`ProductImageManifestRepository`へ統合するための追加変更は行わない。

#### `TestInspectionRepository`

削除する。

- interfaceを実装・注入する経路がない。
- Current automation inspectionは`TestControlService`と`TestApi`が直接所有している。
- `inspectOrder()`、`inspectVariant()`、`inspectReviewSummary()`のbehaviorは変更しない。
- replacement Repository interfaceは作らない。

#### `TestMetadataRepository`

削除する。

- interfaceを実装・注入する経路がない。
- `TestControlService.getMetadata()`と`TestApi.getMetadata()`がCurrent ownerである。
- replacement Repository interfaceは作らない。

#### `SettingsRepository` / `DexieSettingsRepository`

Repository abstractionとしては削除する。

Current確認:

- `SettingsRepository`のsource参照はinterface定義と`DexieSettingsRepository`実装だけ。
- `DexieSettingsRepository`は生成・注入されていない。
- `ApplicationRepositoryCapabilities`にも`TransactionScopeMap`にも含まれていない。

ただし次は削除しない。

- Dexie `app_settings` Store
- SQLite側の対応table / schema
- Seed処理
- Test Controlが利用する設定data

今回削除するのは未使用Repository interface / classだけであり、保存dataやTest Controlの設定機能は変更しない。

## 4. Repository contractの配置

新規:

```text
src/application/repositories/contracts.ts
src/application/repositories/index.ts
```

`contracts.ts`には§3.1の20 interfaceだけを置く。

`index.ts`:

```typescript
export * from "./contracts";
```

Repository Portは`src/application/ports.ts`へ統合しない。

理由:

- Current `create-application-services.ts`が`ApplicationRepositoryCapabilities`と`ApplicationPlatformPorts`を分けている。
- `ports.ts`はClock、Session Store、Hasher、Gateway等のplatform / external boundaryを既に所有している。
- 20 Repository interfaceを追加すると責務が混在する。
- Current `src/domain/repositories/{contracts.ts,index.ts}`と同じ2-file構成をApplicationへ移すだけで、新しいframeworkや階層は不要。

移行完了後:

```text
src/domain/repositories/contracts.ts
src/domain/repositories/index.ts
```

は削除する。

compatibility re-exportは追加しない。Current source consumerは同一PRで一括してimport pathを更新できるため、旧pathを残す理由がない。

## 5. import path移行

Currentのsource import:

```typescript
from "@/domain/repositories"
```

を、対象18 fileで次へ変更する。

```typescript
from "@/application/repositories"
```

移行後の完了条件:

- `src/**`に`@/domain/repositories`参照が0件。
- `src/**`に`src/domain/repositories`を前提とするimportが0件。
- `src/domain/repositories/**`を削除できる。
- Repository class名、method名、signature、transaction scopeはownership移動だけを理由に変更しない。

`src/application/transactions/contracts.ts`も新Application Repository Portを参照する。

`src/application/create-application-services.ts`の`ApplicationRepositoryCapabilities`構造は維持する。Repository interface移動を理由にcapability field名をrenameしない。

## 6. `ProductViewer`依存除去

### 6.1 Domain policy

Current:

```typescript
canViewerSeeProduct({
  viewer: ProductViewer,
  status,
  requiredRank,
})
```

を次へ変更する。

```typescript
canViewerSeeProduct({
  membershipRank: MembershipRank | null,
  status: ProductStatus,
  requiredRank: MembershipRank | null,
})
```

Domain側へ新しいviewer type / interface / hierarchyを追加しない。

behavior:

1. `status !== "published"`なら`false`
2. `requiredRank === null`なら`true`
3. `membershipRank === null`なら`false`
4. それ以外は`rankSatisfies(membershipRank, requiredRank)`

これによりDomain policyはApplication `ProductViewer`をimportしない。

### 6.2 Current caller

Current sourceで`canViewerSeeProduct()`を呼ぶInfrastructure fileは次の4件。

- `src/infrastructure/database/dexie/cart-checkout-repositories.ts`
- `src/infrastructure/database/dexie/storefront-repositories.ts`
- `src/infrastructure/database/sqlite/native-customer-repositories.ts`
- `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`

各callerでApplication `ProductViewer`から次を導出してDomainへ渡す。

```typescript
const membershipRank =
  viewer.kind === "customer" ? viewer.membershipRank : null;
```

既に同等の`membershipRank`を計算している経路ではその値を再利用する。

この変換だけの共通helperは追加しない。4 fileの現在の処理文脈で単純に導出できるため、新しいabstractionは不要。

`ProductViewer.userId`はDomainへ渡さない。

### 6.3 unit test

`tests/unit/policies.test.ts`を新signatureへ更新する。

最低限、現在のbehaviorに対応する次を確認する。

- `requiredRank=null`のpublished商品はguest相当の`membershipRank=null`でも閲覧可能。
- `requiredRank=gold`に`membershipRank=null`はfalse。
- `requiredRank=gold`に`membershipRank=gold`はtrue。
- `requiredRank=gold`に`membershipRank=regular`はfalse。
- unpublished商品はrankに関係なくfalse。

既存`rankSatisfies()` testと重複する組合せを過剰に増やさない。

## 7. Domain → Application static architecture contract

対象:

```text
tests/contracts/architecture.test.ts
```

既存のsource text scan方式を拡張する。AST parser、新規dependency、汎用module resolverは追加しない。

### 7.1 helper

同file内に次の責務を持つ小さいhelperを追加する。

```text
extractLiteralModuleSpecifiers(sourceText)
resolvesToApplication(sourcePath, specifier)
domainToApplicationDependencies(sourcePath, sourceText)
```

名称は上記で固定してよい。

#### `extractLiteralModuleSpecifiers()`

次のliteral module specifierを抽出する。

- `import ... from "..."`
- `import type ... from "..."`
- side-effect `import "..."`
- TypeScript `import("...").Type`
- runtime `import("...")`
- `export ... from "..."`
- `export type ... from "..."`
- `export type * from "..."`
- `export type * as <name> from "..."`
- `export * from "..."`
- literal `require("...")`

computed `require(variable)` / computed dynamic importは対象外。

#### `resolvesToApplication()`

次をApplication dependencyとして扱う。

- `@/application`
- `@/application/**`
- `src/application`
- `src/application/**`
- Domain source fileからrelative resolveしたpathが`src/application`またはその配下へ到達するspecifier

relative path判定はNode標準`path.resolve` / `path.dirname` / `path.relative` / `path.isAbsolute` / `path.sep`だけで行い、完全なTypeScript module resolutionは実装しない。

実装規則を次で固定する。

1. `applicationRoot = resolve(projectRoot, "src", "application")`を基準にする。
2. alias / baseUrl形式はspecifier文字列について、`@/application`または`@/application/` prefix、`src/application`または`src/application/` prefixだけを一致とする。`@/application-old`や`src/application-old`は一致させない。
3. relative specifierは`resolvedPath = resolve(dirname(sourcePath), specifier)`で解決する。
4. `relativePath = relative(applicationRoot, resolvedPath)`を求め、`relativePath === ""`、または`relativePath !== ".."`かつ`!relativePath.startsWith(".." + sep)`かつ`!isAbsolute(relativePath)`の場合だけApplication root配下と判定する。
5. module specifier自体は`/`区切り、filesystem path判定はNode `path` APIへ任せる。Windowsの`\\`とUbuntuの`/`を手書き置換して比較しない。

synthetic relative-path testでは`join(projectRoot, "src", "domain", "fixture.ts")`のようなabsolute source pathをhelperへ渡し、Windows / Ubuntuのどちらでも同じ判定規則を使う。

#### `domainToApplicationDependencies()`

`src/domain/**`のsource fileについて抽出specifierを検査し、Applicationへ到達するspecifierを返す。

production source scanでは、違反fileとspecifierを特定できる形式でfailureを出す。

### 7.2 scanner self-test

Current sourceが0 violationになったことだけをscannerの正しさの証拠にしない。

同じ`architecture.test.ts`でsynthetic sourceによるtable-driven testを追加する。

禁止構文のfixture文字列:

- static import
- `import type`
- side-effect import
- type query
- dynamic import
- named re-export
- `export type`
- `export type *`
- `export type * as`
- `export *`
- literal `require()`

禁止path family:

- `@/application/**`
- `src/application/**`
- Domain fileからApplicationへ到達するrelative path

許可例:

- Domain → Domain alias
- Domain内relative import
- Node builtin等Applicationへ到達しないspecifier
- computed `require(variable)`は今回のscanner対象外であること

fixture directoryや新しいtest frameworkは追加しない。

## 8. Documentation同期

### 8.1 `docs/04_data/repository_interfaces.md`

実装後のCurrent stateへ更新する。

- Repository Portのcanonical ownerを「follow-upで決める」表現から、Current sourceではApplication ownershipへ移行済みである説明へ更新する。
- `ImageAssetCatalogRepository` interface記載を削除する。
- §7見出しを`Review・Overview・Settings`から`Review・Overview`へ変更する。
- §7の`SettingsRepository` interface blockだけを削除し、`ReviewRepository`と`AdminOverviewQueryRepository`のcontractは維持する。
- §8の`TestInspectionRepository` interface blockとAutomation Inspectionの説明を削除する。Repository interfaceを再作成せず、必要なTest Control説明は`docs/07_testability/testability_design.md`の`TestApi` / `TestControlService`を参照させる。
- Current §8末尾の`ReviewStatusHistory.fromStatus`契約はTest Inspectionとは無関係なので削除しない。§7のReview説明へ移し、初回作成時は`null`、以後の状態変更では直前Statusを設定する意味を保持する。
- §8削除後はCurrent §9 `共通Error`を§8へ繰り上げる。後続見出しがあれば同様に連番だけを詰め、内容は変更しない。
- method semanticsの説明はownership移動や見出し整理だけを理由に変更しない。

### 8.2 `docs/04_data/application_contracts.md`

Currentの「follow-up RefactorではDomain policyへ渡さない」という未来形を実装後の状態へ同期する。

`ProductViewer`はApplication-owned contractであり、Domain policyへは渡さず、必要な`MembershipRank | null`だけへ変換することを現在形で説明する。

### 8.3 `docs/02_architecture/system_architecture.md`

主要Ports inventoryを実装に合わせる。

- Repository PortsがApplication ownershipであることをCurrent architectureとして読めるようにする。
- `ImageAssetCatalogRepository`を主要Portから削除する。
- 現在利用する画像境界は`ProductImageManifestRepository` / static manifest implementationに合わせる。
- `TestInspectionRepository`を主要Portから削除する。
- Test Controlのinspection機能自体は削除しない。

Mermaid全体の再設計はしない。

### 8.4 `docs/02_architecture/repository_structure.md`

§1の物理配置と§4のCurrent architecture説明を実装後の状態へ同期する。

§1のPhase 1推奨構成はRepository ownership移動だけを反映する。

Current:

```text
├── application/{contracts,auth,catalog,cart,checkout,payments,orders,reviews,administration,testing,transactions}/
├── domain/{contracts,entities,value-objects,services,policies,repositories,errors,states}/
```

を、Application側へ`repositories`を追加し、Domain側から`repositories`を削除した構成へ更新する。

```text
├── application/{contracts,repositories,auth,catalog,cart,checkout,payments,orders,reviews,administration,testing,transactions}/
├── domain/{contracts,entities,value-objects,services,policies,errors,states}/
```

この変更を理由に、§1の他directory名やPhase 1 / Phase 2構成を整理・renameしない。

§4ではCurrentの次の記載:

```text
単一Storeで完結するAddress、Cart取得/作成、Settings等の原子的CommandはRepository Method内の1 Transactionを許可する。
```

から、削除済みになる`SettingsRepository`を前提とする`Settings`の例を削除する。Address、Cart取得/作成等、現在もRepository Method内の単一Store transactionを許可する例だけを残す。

Repository ownership ruleやtransaction方針自体は変更しない。

### 8.5 履歴文書

次は履歴として書き換えない。

- `docs/reports/2026-09-06_193114_refactoring_necessity_review.md`の過去Evidence
- `docs/plans/2026-09-23_103200_issue-132-domain-application-type-dependency.md`
- PR #178のRun Artifact

ADR-0027もDecision自体は変更しない。実装完了を記録するためだけの新ADRは作らない。

## 9. 実装順

PR #180のcurrent head branch `plan/issue-132-follow-up-domain-application-boundary`で、Plan更新に続けてsource / test実装まで行う。PR #180をPlan-onlyで先にmergeせず、別branch / 別実装PRも作成しない。

実装はbuildを壊す時間を短くするため、次の順に行う。

実行時の操作方法はCurrent `AGENTS.md`、`docs/reference/codex-implementation-harness.md`、`docs/reference/codex-safety-harness.md`を正本とする。本PlanはSafety契約を緩和せず、禁止されたcommandや操作でTaskを達成しない。物理file削除は、Planへの記載や`apply_patch`の利用可否だけを承認根拠にせず、実行時に必要な明示承認が確認できる場合だけ行う。

### Task 0: PR #180 branchを確認してRun Artifactを初期化

1. PR #180がopenで、head branchが`plan/issue-132-follow-up-domain-application-boundary`であることを確認する。
2. current branchがPR #180のhead branchと一致し、開始前に意図しないworking tree変更がないことを確認する。
3. 実装task用の新しいRunをRepository標準契約で初期化する。

Current `scripts/new-run.ps1`はfailure cleanupに`Remove-Item -Recurse -Force`を含み、Current Safety契約はPowerShell commandによる削除を禁止している。この契約が変わっていない限り、Windowsでも`new-run.ps1`を実行しない。

`bash`を安全に利用できる場合は、削除commandを含まない既存の`new-run.sh`を優先する。

```bash
bash scripts/new-run.sh --task-type implementation --workflow-level standard
```

`bash`を利用できない場合は、新しい初期化scriptやwrapperを作らず、`.codex/templates/PLAN.md`、`TASKS.md`、`REPORT.md`から同一Run IDのAgent-managed Artifactだけを手動初期化する。`run.json`は作成・直接編集せず、Task 13のcollectorに生成・更新させる。

Run `PLAN.md`には本durable Planのpath、実装branch、対象範囲を記録する。同一task中に別Runを作らない。

### Task 1: PR #180 branchをlatest `main`へrebaselineして実行条件を確定

1. Run初期化後に`origin/main`を取得し、PR #180のcurrent headとlatest `origin/main`のahead / behindを確認する。
2. behindがある場合は、開始時のRun Artifactを今回taskの既知差分として保持したまま、公開済みbranchの履歴を書き換えない方法で`origin/main`をcurrent branchへ取り込み、force pushを必要としない状態にする。rebaseline完了後にworking treeとbranch状態を再確認する。
3. 本Plan作成時SHA `9cef8501c2b19e1764892b0c17ee50318fa90b97`から次へmaterial driftがないか確認する。

   - `src/domain/repositories/**`
   - `src/application/**`
   - `src/domain/policies/permissions.ts`
   - §6.2の4 caller file
   - `src/infrastructure/database/dexie/**`
   - `src/infrastructure/database/sqlite/**`
   - `src/test-controls/**`
   - `tests/unit/policies.test.ts`
   - `tests/contracts/architecture.test.ts`
   - `docs/02_architecture/**`
   - `docs/04_data/**`
   - ADR-0027
   - `AGENTS.md`
   - `docs/reference/codex-implementation-harness.md`
   - `docs/reference/codex-safety-harness.md`
   - `.codex/templates/**`

   material driftがある場合は影響箇所だけ再評価し、24 / 17 / 7やconsumer件数を固定値として盲目的に使わない。Run Artifactのtemplate / manifest / Safety契約にmaterial driftがあっても、新しいRunを作らず同じRunを継続し、Current契約に合わせて必要なAgent-managed Artifact更新とmachine-managed collectorを行う。

4. 物理削除対象の`src/domain/repositories/contracts.ts`と`src/domain/repositories/index.ts`について、Current `AGENTS.md`とSafety契約、および実行時のユーザー承認範囲を確認する。
5. Planに削除対象が書かれていること、または`apply_patch`が利用可能であることだけを削除承認として扱わない。今回の実装依頼で上記2 fileの物理削除まで明示的に承認されていることを確認できる場合だけ、parent agentがレビュー可能なfile-delete operationを行う。`implementation_worker`へfile deleteを委譲せず、`rm`、`del`、`Remove-Item`、`git rm`も使用しない。
6. 必要な削除承認を確認できない場合、またはCurrent Safety契約が削除を許可しない場合は、source変更へ進む前に同じRunの`REPORT.md`へ根拠と未完了事項を記録して停止する。Safety契約の変更、空file、stub、compatibility re-exportで回避しない。
7. rebaseline結果、material drift判断、削除承認 / Safety確認結果を同じRunの`PLAN.md` / `REPORT.md`へ記録してからTask 2へ進む。

### Task 2: focused regressionを先に確認

変更前baselineとして次を実行する。Windows / PowerShellではRepositoryの`packageManager`（`pnpm@10.34.5`）をCorepack経由で使用し、PATH上のglobal `pnpm`を前提にしない。

```bash
corepack pnpm exec vitest run tests/unit/policies.test.ts
corepack pnpm exec vitest run tests/contracts/architecture.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000
```

関連Repository contract testもCurrent test配置から対象を確認して実行する。

### Task 3: Application Repository contractを追加

- `src/application/repositories/contracts.ts`
- `src/application/repositories/index.ts`

を追加する。

§3.1の20 interfaceをCurrent signatureのまま移す。

この時点では旧Domain Repository contractを残し、consumer importを順に切り替えられる状態にする。ただし旧pathから新pathへのcompatibility re-exportは追加しない。

### Task 4: Application / Infrastructure consumerを新pathへ移行

§2.3の18 direct consumerを`@/application/repositories`へ変更する。

追加でcode searchし、実装開始時のCurrent sourceに旧path参照が増えていれば同じownership ruleで更新する。

Repository class名、constructor、method、transaction scope、Application capability fieldは変更しない。

### Task 5: unused Repository abstractionを削除

- `ImageAssetCatalogRepository`
- `TestInspectionRepository`
- `TestMetadataRepository`
- `SettingsRepository`
- `DexieSettingsRepository`

を削除する。

削除前にCurrent source searchを再実行し、Plan作成後に新consumerが追加されていないことを確認する。

`app_settings` Store、Seed、Test Controlは削除しない。

interface / class定義の除去は既存ファイルの内容編集として行い、`rm`、`del`、`Remove-Item`、`git rm`等のcommand-based deletionは使用しない。

### Task 6: Domain Repository moduleを削除

sourceの`@/domain/repositories`参照が0になったことを確認後、

- `src/domain/repositories/contracts.ts`
- `src/domain/repositories/index.ts`

を削除対象とする。

Task 1で削除に必要な明示承認とCurrent Safety契約を確認済みであることを再確認し、consumer migration完了と旧path参照0を確認した後、parent agentが承認済みのレビュー可能なfile-delete operationで削除する。`apply_patch`自体を承認根拠にせず、`implementation_worker`へfile deleteを委譲しない。`rm`、`del`、`Remove-Item`、`git rm`も使用せず、空file、stub、compatibility re-exportを残して物理削除を回避しない。

### Task 7: `ProductViewer` dependencyを除去

- `src/domain/policies/permissions.ts`
- §6.2の4 Infrastructure caller
- `tests/unit/policies.test.ts`

を変更する。

新しいDomain viewer abstractionは追加しない。

### Task 8: architecture contractを追加

`tests/contracts/architecture.test.ts`へ§7のhelper、production source scan、synthetic table-driven self-testを追加する。

Current source remediationが完了してからcontractを有効にし、意図的に赤いtestだけを途中commitへ残さない。

### Task 9: documentationを同期

§8のCurrent documentationだけを更新する。

過去Plan / report / Run Artifactは変更しない。

### Task 10: focused validation

```bash
corepack pnpm exec vitest run tests/unit/policies.test.ts
corepack pnpm exec vitest run tests/contracts/architecture.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000
corepack pnpm run test:repository
corepack pnpm run typecheck
git diff --check
```

Repository contract testが`corepack pnpm run test:repository`全体より狭く安全に実行できる場合は、変更対象Repositoryに対応するfocused testを先に実行してから全体を実行する。

### Task 11: Repository標準gate

focused validation成功後に次を実行する。

```bash
corepack pnpm run verify
git diff --check
```

同じ確認を理由なく重複実行しない。failure切り分けが必要な場合だけ個別commandを追加する。

### Task 12: final inventory

最終的に次を確認する。

- `src/**`の`@/domain/repositories` = 0
- Domain → Application scanner violation = 0
- `src/domain/repositories/**`が存在しない
- `ImageAssetCatalogRepository` source定義 = 0
- `TestInspectionRepository` source定義 = 0
- `TestMetadataRepository` source定義 = 0
- `SettingsRepository` / `DexieSettingsRepository` source定義 = 0
- `TestApi` / `TestControlService`のinspection / metadata APIは維持
- `ProductImageManifestRepository`は維持
- Product behavior / DB schema差分なし

### Task 13: Run Artifactをfinal commit前状態へ確定

1. `TASKS.md`を実際の完了状態へ更新する。
2. `REPORT.md`へ検証結果と最終inventoryをappend-onlyで記録する。
3. actual `run.json`は手編集しない。Task 0で`run.json`を作成していない場合も含め、RepositoryのcollectorにCurrent templateから生成・更新させ、Current working treeの変更fileを反映する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId <run_id> -RefreshGitChangedFiles -Strict
```

- collectorは`run.json.changed_files`をCurrent working treeからmachine-managedで更新し、既存report / evaluationがあれば同じ契約で再集約する。
- `changed_files`、validation結果、status等の観測事実をAgentが`run.json`へ手書きしない。
- `-Strict`がnonzeroになった場合は原因を解消し、成功するまでfinal commitへ進まない。

1. collector成功後にRun Artifact sanitizationを実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path '.codex/runs/<run_id>' -Write
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path '.codex/runs/<run_id>' -Check
```

final commit前の順序は`TASKS / REPORT確定 → collector → sanitizer Write → sanitizer Check → final commit`で固定する。

`Check`でresidual findingがある状態を完了扱いにしない。

### Task 14: commit / normal push / PR #180更新

1. `git diff --check`と変更scopeを再確認する。
2. Run Artifactを含むfinal commit前状態を確定した後にcommitする。
3. force pushを使わず`plan/issue-132-follow-up-domain-application-boundary`へ通常pushする。
4. local HEAD、remote head、PR #180 headの一致を確認する。
5. PR #180本文を実装後の内容へ更新する。変更scope、削除したunused abstraction、validation結果、Product behavior / DB schemaを変更していないことを記載する。

別の実装PRは作成しない。source / test commitはPR #180へ追加する。

### Task 15: 最新headのRemote CIを確認

PR #180の最新headで次を確認する。

- Web CI = `success`
- Mobile App CI = `success`
- CodeQL等、そのheadで実行された必須security workflowがある場合は結果を確認する

Web CI / Mobile App CIが`queued` / `in_progress` / failure / 未確認の状態を実装完了としない。必要なCI結果をPR #180本文へ記録する。

push後CI結果を記録するためだけに`TASKS.md`、`REPORT.md`、`PLAN.md`、`run.json`を再編集・再commit・再pushしない。push後CIの正本はGitHub ActionsとPR #180本文とする。

## 10. 変更対象の見込み

新規:

```text
src/application/repositories/contracts.ts
src/application/repositories/index.ts
```

削除:

```text
src/domain/repositories/contracts.ts
src/domain/repositories/index.ts
```

変更対象:

```text
src/application/identity/session-identity-resolver.ts
src/application/transactions/contracts.ts
src/application/create-application-services.ts
src/application/use-cases/account-use-cases.ts
src/application/use-cases/catalog-use-cases.ts
src/application/use-cases/auth-use-cases.ts
src/application/use-cases/cart-use-cases.ts
src/application/use-cases/admin-master-use-cases.ts
src/application/use-cases/admin-operations-use-cases.ts
src/application/use-cases/review-user-use-cases.ts
src/application/use-cases/admin-product-use-cases.ts
src/application/use-cases/checkout-order-use-cases.ts

src/domain/policies/permissions.ts

src/infrastructure/database/dexie/basic-repositories.ts
src/infrastructure/database/dexie/product-repositories.ts
src/infrastructure/database/dexie/storefront-repositories.ts
src/infrastructure/database/dexie/order-review-repositories.ts
src/infrastructure/database/dexie/cart-checkout-repositories.ts
src/infrastructure/database/sqlite/native-customer-application-repositories.ts
src/infrastructure/database/sqlite/native-customer-repositories.ts

tests/unit/policies.test.ts
tests/contracts/architecture.test.ts

docs/04_data/repository_interfaces.md
docs/04_data/application_contracts.md
docs/02_architecture/system_architecture.md
docs/02_architecture/repository_structure.md
```

`DexieSettingsRepository`削除は`src/infrastructure/database/dexie/order-review-repositories.ts`内で行う。

実装開始時のCurrent searchで追加consumerが見つかった場合だけ変更対象を追加する。

## 11. 変更しないもの

- Product behavior
- Repository method semantics
- Application DTO / query / commandのshape
- Database schema / migration
- `app_settings` Store
- Seed data contract
- Test API behavior
- Transaction scope / Store集合
- Application capability field名
- Native / Web feature
- `ProductImageManifestRepository`
- Payment Gateway等の既存platform port
- ADR-0027のDecision
- `NFR-MA-001` / `NFR-MA-010`
- package dependency
- generic dependency graph
- AST parser / framework
- compatibility re-export
- 新しいRepository framework
- 新しいDomain viewer type

## 12. リスクと対策

### Repository ownership移動で機能変更を混在させる

対策:

- interface signatureは原則そのまま移動する。
- method rename / split / mergeを行わない。
- concrete Repository behaviorを変更しない。
- import path変更とunused削除を中心にする。

### Application `ports.ts`が肥大化する

対策:

- Repository Portは`src/application/repositories/**`へ置く。
- platform / external portである`ports.ts`へ混在させない。

### unused判定後にconsumerが追加される

対策:

- 実装開始時と削除直前の2回code searchする。
- consumerが追加されていれば削除を止め、そのinterfaceだけADR-0027のownership ruleで再評価する。

### `SettingsRepository`削除で設定dataまで消す

対策:

- interface / unused Dexie classだけを削除する。
- `app_settings` schema、Seed、Test Controlのdirect accessは変更しない。
- schema migrationを作らない。

### Test Inspection interface削除でAutomation APIを壊す

対策:

- `TestApi`と`TestControlService`は変更対象にしない。
- `inspectOrder` / `inspectVariant` / `inspectReviewSummary` / `getMetadata`の既存integration / E2E contractを維持する。
- Repository interface削除をTest API削除へ広げない。

### architecture scannerのfalse green

対策:

- Current source scanだけでなくsynthetic table-driven self-testを追加する。
- syntax familyとpath familyを別々に固定する。

### architecture scannerの過剰実装

対策:

- Current repositoryで必要なliteral specifierだけを対象にする。
- computed import、完全なTypeScript resolver、AST dependencyを追加しない。

### `ProductViewer`から新しいDomain abstractionを作る

対策:

- Domain policyが現在必要とする`MembershipRank | null`を直接受け取る。
- `userId`やApplication identity semanticsをDomainへ移さない。

## 13. 完了条件

- latest `main`へrebaseline済み。
- 使用中のRepository Port 20件が`src/application/repositories/**` ownershipへ移動している。
- Current Domain consumerがないことを再確認している。
- `ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`が削除されている。
- `SettingsRepository` / `DexieSettingsRepository`が未使用であることを再確認して削除している。
- `app_settings` Store / Seed / Test Controlは維持している。
- `src/domain/repositories/**`が削除されている。
- `src/**`に`@/domain/repositories`参照がない。
- `canViewerSeeProduct()`がApplication `ProductViewer`へ依存していない。
- 4 Infrastructure callerが`MembershipRank | null`相当をDomain policyへ渡す。
- `tests/unit/policies.test.ts`が新signatureと既存behaviorを検証する。
- Domain → Application static contractがCurrent sourceを検査する。
- scanner synthetic self-testが禁止syntax / path familyと許可例を検証する。
- AST parser、新規dependency、generic scannerを追加していない。
- `repository_interfaces.md`、`application_contracts.md`、`system_architecture.md`、`repository_structure.md`が実装後のCurrent stateと一致する。
- `repository_interfaces.md`で`ReviewStatusHistory.fromStatus`契約が保持され、削除済みの`Settings` / Automation Inspection見出しだけが残っていない。
- `repository_structure.md` §1が`src/application/repositories/**`を示し、Domain構成に`repositories`を残していない。
- 過去Plan / report / Run ArtifactをCurrent都合で書き換えていない。
- Product behavior、Repository method semantics、DB schema、transaction scopeを変更していない。
- focused validation、`test:repository`、`typecheck`、`corepack pnpm run verify`、`git diff --check`がPASSする。
- 実装task用Run ArtifactがRepository契約どおり保存され、`collect-run-artifacts.ps1 -RefreshGitChangedFiles -Strict`がPASSし、`run.json.changed_files`がmachine-managedでCurrent変更を反映している。
- collector成功後にsanitizer `Write` / `Check`がPASSしている。
- Current `AGENTS.md` / implementation harness / Safety契約に違反するcommandや操作を使っていない。
- `src/domain/repositories/contracts.ts`と`src/domain/repositories/index.ts`は、実行時に必要な明示承認とCurrent Safety契約を確認したうえでparent agentが削除し、`apply_patch`自体を承認根拠にしておらず、`implementation_worker`やcommand-based deletionを使用していない。
- final commit後に通常pushし、local HEAD / remote head / PR #180 headが一致している。
- PR #180の最新headでWeb CI / Mobile App CIがともに`success`である。
- push後CI結果だけを理由にtracked Run Artifactを再commitしていない。
- PR #180の同一branchにPlanとsource / test実装が含まれ、別実装PRを作成していない。

## 14. ロールバック

Database migrationやexternal state変更はない。

問題が発生した場合はfollow-up実装commitをrevertし、Repository interfaceの旧配置とimport pathへ戻せる。

`app_settings` Storeやdataを削除しないため、Repository ownership変更のロールバックにdata migrationは不要。

## 15. 対象外

- Domain / Application全面再設計
- Repository method semanticsの変更
- Repository interfaceのmethod単位分割
- DTO / CommandのDomain移動
- Product behavior変更
- DB schema / migration
- Test Control redesign
- `ProductViewer` shape変更
- `ProductImageManifestRepository` redesign
- transaction runner redesign
- generic Repository framework
- dependency graph基盤
- AST parser導入
- 新規dependency
- compatibility layerの恒久化
- unrelated refactor

## 16. 未解決事項

設計・実装内容として実装開始を止める未解決事項はない。

物理file削除はPlan記載だけで実行可とは扱わない。Task 1で`src/domain/repositories/contracts.ts`と`src/domain/repositories/index.ts`の削除に必要な明示承認とCurrent Safety契約を確認し、確認できない場合は同じRunへ根拠を記録してsource変更前に停止する。`implementation_worker`やcommand-based deletionは使わない。

PR #180の同一branchで実装まで行うため、PR #180のmergeは実装開始条件ではない。Task 0でRunを初期化した後、Task 1でlatest `main`へのrebaselineと実行条件確認を行い、完了後にTask 2以降を同PR上で進める。

実装開始時にlatest `main`へmaterial driftがあった場合だけ、影響したinterface / consumer / documentationを再評価する。ADR-0027のDecision自体は再Decisionしない。
