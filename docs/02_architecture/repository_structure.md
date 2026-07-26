# リポジトリ・モジュール構成

## 1. Phase 1推奨構成

```text
ec-automation-training-app/
├── app/
│   ├── (storefront)/
│   │   ├── index.tsx
│   │   ├── products/index.tsx
│   │   ├── products/[productId].tsx
│   │   ├── search.tsx
│   │   ├── categories/[categoryId].tsx
│   │   ├── cart.tsx
│   │   └── legal/{terms,privacy,commerce}.tsx
│   ├── (auth)/{login,signup}.tsx
│   ├── (customer)/
│   │   ├── checkout/{address,payment,confirm,processing,complete,failed}.tsx
│   │   ├── orders/index.tsx
│   │   ├── orders/[orderId].tsx
│   │   ├── reviews/[orderItemId].tsx
│   │   └── account/{profile,addresses}.tsx
│   ├── admin/
│   │   ├── _layout.web.tsx
│   │   ├── index.web.tsx
│   │   ├── products/
│   │   ├── categories.web.tsx
│   │   ├── brands.web.tsx
│   │   ├── inventories.web.tsx
│   │   ├── orders/
│   │   ├── users/
│   │   ├── reviews.web.tsx
│   │   └── test-control.web.tsx
│   ├── forbidden.tsx
│   └── +not-found.tsx
├── src/
│   ├── generated/product-image-manifest.ts
│   ├── application/{contracts,auth,catalog,cart,checkout,payments,orders,reviews,administration,testing,transactions}/
│   ├── domain/{contracts,entities,value-objects,services,policies,repositories,errors,states}/
│   ├── infrastructure/
│   │   ├── database/{dexie,contracts}/
│   │   ├── payment/mock-payment-gateway.ts
│   │   ├── address-lookup/static-address-lookup.ts
│   │   ├── session/
│   │   ├── security/password-hasher.web.ts
│   │   ├── image-assets/{static-manifest-repository.ts,types.ts}
│   │   ├── clock/
│   │   └── id-generator/
│   ├── presentation/
│   │   ├── shells/{storefront-shell,admin-shell}/
│   │   ├── patterns/{resource-index,resource-details,filter-bar,save-bar}/
│   │   ├── components/
│   │   ├── forms/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── messages/
│   │   └── design-tokens/
│   ├── seeds/{scenarios,assets,metadata,address-lookup}/
│   └── test-controls/{test-api.web.ts,test-inspection.web.ts,test-panel.web.tsx}/
├── tests/{unit,integration,repository-contract,schema}/
├── e2e/web/
├── public/
│   ├── images/products/
│   ├── images/product-image-manifest.json  # 診断用
│   └── _headers
├── config/product-image-assets.json
├── scripts/generate-image-manifest.ts
├── docs/
├── app.config.ts
├── playwright.config.ts
├── vitest.config.ts
└── package.json
```

## 2. Phase 2で追加するもの

```text
src/infrastructure/database/sqlite/
e2e/native/
eas.json
app Native固有Navigation・Test Deep Link
```

Cancel/Return/Refund ModuleもPhase 2開始時に追加します。

## 3. Phase 3で追加を検討するもの

- 独立Mock Gateway台帳Adapter
- Migration/Import/Export/Recovery Module
- Public Build条件分岐

## 4. 境界

- Domainは他Layerへ依存しない。
- ApplicationはDomainとPortだけへ依存する。
- InfrastructureはPortを実装する。
- PresentationはUse Caseだけを呼ぶ。
- Storefront ShellとAdmin Shellを混在させない。
- UI文言はContent Dictionaryを参照し、Domain内部値を直接表示しない。
- Payment GatewayはDB Transaction Contextを受け取らない。
- 複数Storeを更新するPhase 1書込みは`ApplicationTransactionRunner`を経由し、参加Repositoryが個別top-level Dexie Transactionを開始しない。単一Storeで完結するAddress、Cart取得/作成、Settings等の原子的CommandはRepository Method内の1 Transactionを許可する。
- `/checkout/processing?orderId=...`、`/checkout/complete?orderId=...`、`/checkout/failed?orderId=...`は`orderId` Queryを必須とし、Checkout SessionではなくOrder所有権と最新Payment状態から復元する。
- 実装開始前はPhase 1のDTO/Request/Command/Result/Errorを`04_data/application_contracts.md`の正本に従う。最初の実装PRで同契約を`src/domain/contracts/`、`src/application/contracts/`、`src/application/errors.ts`へ移し、以後はコードを型の正本、Markdownを意味・制約・設計理由の正本とする。
- Phase 1で未使用の将来Interfaceを定義しない。
- 商品画像Binaryは`public/images/products/`へCommitし、ApplicationはManifest経由のAsset IDだけを扱う。
- GitHub書込みCredentialをFrontendへ置かない。

## 5. Naming

EntityはPascalCase、Use Caseは`<Verb><Target>UseCase`、ErrorはSCREAMING_SNAKE、DBはsnake_case plural、Test IDはkebab-caseとします。
