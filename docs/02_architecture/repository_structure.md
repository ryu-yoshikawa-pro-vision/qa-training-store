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
│   ├── application/{contracts,repositories,auth,catalog,cart,checkout,payments,orders,reviews,administration,testing,transactions}/
│   ├── domain/{contracts,entities,value-objects,services,policies,errors,states}/
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

キャンセル・返品・返金モジュール（Cancel/Return/Refund Module）もPhase 2の開始時系列で追加します。

## 3. Phase 3で追加を検討するもの

- 独立したモックゲートウェイ台帳アダプター（Mock Gateway Adapter）
- マイグレーション／インポート／エクスポート／リカバリーモジュール（Migration/Import/Export/Recovery Module）
- パブリックビルド（Public Build）向けの条件分岐

## 4. 境界

- Domain層は、他のレイヤーに依存しない。
- Application層は、Domain層およびPortのみに依存する。
- Infrastructure層は、Portを実装する。
- Presentation層は、ユースケース（Use Case）のみを呼び出す。
- Storefront用シェルとAdmin用シェルを混在させない。
- UIの表示文言はコンテンツディクショナリ（Content Dictionary）を参照し、ドメインの内部値を直接画面に表示しない。
- 決済ゲートウェイ（Payment Gateway）は、データベースのトランザクションコンテキスト（DB Transaction Context）を受け取らない。
- 複数のストアを更新するPhase 1の書き込み処理は`ApplicationTransactionRunner`を経由するものとし、処理に関与する各リポジトリが個別にトップレベルのDexieトランザクションを開始してはならない。ただし、単一ストアで完結するAddressやCartの取得・作成といったアトミックなコマンドについては、リポジトリメソッド（Repository Method）内での単一トランザクションの実行を許可する。
- `/checkout/processing?orderId=...`、`/checkout/complete?orderId=...`、`/checkout/failed?orderId=...`の各画面では、クエリパラメータとして`orderId`を必須とし、チェックアウトセッション（Checkout Session）からではなく、注文（Order）の所有権と最新の決済状態（Payment State）に基づいて状態を復元する。
- 実装開始前は、Phase 1におけるDTO、Request、Command、Result、Errorの定義について、`04_data/application_contracts.md`を正本として準拠する。最初の実装PRで同契約を`src/domain/contracts/`、`src/application/contracts/`、`src/application/errors.ts`へ移行し、以後はコードを型の正本、Markdownを仕様の意味・制約・設計理由の正本とする。
- Phase 1で使用しない将来向けのインターフェース（Interface）は定義しない。
- 商品画像のバイナリファイルは`public/images/products/`へコミットし、Application層はマニフェスト（Manifest）経由のアセットID（Asset ID）のみを取り扱う。
- GitHubへの書き込み権限を持つ認証情報（Credential）をフロントエンドに配置しない。

## 5. 命名

EntityはPascalCase、Use Caseは`<Verb><Target>UseCase`、ErrorはSCREAMING_SNAKE、DBはsnake_caseの複数形、Test IDはkebab-caseとします。