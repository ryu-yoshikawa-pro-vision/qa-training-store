# Repository Interface設計

本書はリポジトリの責務とトランザクション境界に関する正本仕様です。ドメインエンティティの定義は`domain_types.md`、DTO・Input・Resultの具体型は`application_contracts.md`を参照してください。

リポジトリポート（Repository Port）の正式な所有権（canonical owner）はADR-0027に従い、各ポートの責務と利用側（consumer）の関係に基づいて決定します。現在のソースコードでは、使用中のリポジトリポート規約（contract）の所有権をApplication層に置き、`src/application/repositories/**`へ配置しています。ドメインの振る舞いに関する規約として残す明確な理由があるポートのみ、Domain層の所有権を維持します。Domain層からApplication層への依存は禁止されており、型のみのインポート（type-only import）であっても例外とはしません。現在のシグネチャやコード上の定義位置は所有権の根拠にはならず、本書に記載するリポジトリメソッド規約も、その依存方向を許可するアーキテクチャ上の判断根拠ではありません。

## 1. 共通

```typescript
interface VersionedRepository<T> {
  getById(id: string): Promise<T | null>;
  update(entity: T, expectedVersion: number): Promise<T>;
}
```

リポジトリはドメインエンティティまたは明示した参照用DTO（Read DTO）を返し、DexieオブジェクトをUI層へ露出しません。トランザクションに束縛されたリポジトリ（Transaction-bound Repository）は、新たなトップレベルトランザクションを開始しません。クロック、ID、セッション、ゲスト識別子（Guest Identity）、メールアドレス正規化、アプリケーションエラーについては、`application_contracts.md`に定める共通契約を使用します。

## 2. Application Transaction Runner

```typescript
type TransactionScopeMap = {
  "register-and-merge-cart": {
    users: UserRepository;
    sessions: SessionRepository;
    carts: CartRepository;
    products: ProductRepository;
    inventory: InventoryRepository;
  };
  "login-and-merge-cart": {
    users: UserRepository;
    sessions: SessionRepository;
    carts: CartRepository;
    products: ProductRepository;
    inventory: InventoryRepository;
  };
  "cart-mutation": {
    users: UserRepository;
    carts: CartRepository;
    products: ProductRepository;
    inventory: InventoryRepository;
  };
  "merge-guest-cart": {
    users: UserRepository;
    carts: CartRepository;
    products: ProductRepository;
    inventory: InventoryRepository;
  };
  "start-checkout": {
    users: UserRepository;
    checkouts: CheckoutSessionRepository;
    carts: CartRepository;
    products: ProductRepository;
    inventory: InventoryRepository;
  };
  "create-product-aggregate": {
    products: ProductRepository;
    inventory: InventoryRepository;
    categories: CategoryRepository;
    brands: BrandRepository;
    reviewSummaries: ReviewSummaryRepository;
  };
  "update-product-aggregate": {
    products: ProductRepository;
    inventory: InventoryRepository;
    categories: CategoryRepository;
    brands: BrandRepository;
  };
  "change-product-status": {
    products: ProductRepository;
    inventory: InventoryRepository;
    categories: CategoryRepository;
    brands: BrandRepository;
  };
  "change-category-active-state": {
    categories: CategoryRepository;
    products: ProductRepository;
  };
  "change-brand-active-state": {
    brands: BrandRepository;
    products: ProductRepository;
  };
  "delete-draft-product": {
    products: ProductRepository;
    inventory: InventoryRepository;
    reviewSummaries: ReviewSummaryRepository;
  };
  "adjust-inventory": { inventory: InventoryRepository };
  "change-user-access": {
    users: UserRepository;
    sessions: SessionRepository;
    checkouts: CheckoutSessionRepository;
  };
  "create-order": {
    users: UserRepository;
    carts: CartRepository;
    checkouts: CheckoutSessionRepository;
    products: ProductRepository;
    inventory: InventoryRepository;
    orders: OrderRepository;
    payments: PaymentRepository;
    sequences: SequenceRepository;
  };
  "finalize-payment-success": {
    orders: OrderRepository;
    payments: PaymentRepository;
    inventory: InventoryRepository;
  };
  "finalize-payment-failure": {
    orders: OrderRepository;
    payments: PaymentRepository;
  };
  "retry-payment": {
    orders: OrderRepository;
    payments: PaymentRepository;
  };
  "start-order-preparation": {
    orders: OrderRepository;
    shipments: ShipmentRepository;
  };
  "ship-order": {
    orders: OrderRepository;
    shipments: ShipmentRepository;
  };
  "complete-delivery": {
    orders: OrderRepository;
    shipments: ShipmentRepository;
  };
  "review-change": {
    reviews: ReviewRepository;
    reviewSummaries: ReviewSummaryRepository;
  };
};

interface ApplicationTransactionRunner {
  run<S extends keyof TransactionScopeMap, T>(
    scope: S,
    work: (repositories: TransactionScopeMap[S]) => Promise<T>,
  ): Promise<T>;
}
```

### Runner規約

- スコープに必要なストアのみを対象として、単一のDexieトランザクションを開く。
- `work`関数へは、同一トランザクションに束縛されたリポジトリのみを渡す。
- スコープ外のリポジトリ呼び出しは、TypeScriptの型チェックとランタイムガードの双方で遮断する。
- 決済ゲートウェイ（Payment Gateway）、住所検索（Address Lookup）、タイマーなどの外部非同期処理をトランザクション内でawaitしない。画像パスはビルド時に生成されたモジュールからトランザクション開始前に解決しておく。
- ネストされたトランザクション（nested transaction）が開くストアの範囲は、親スコープのストア集合を超えてはならない。
- トランザクションのコールバック内では、ネイティブPromise、Web Crypto、Dexie互換Promise以外の非同期処理を待機（await）しない。
- 認証時のパスワード照合や、ビルド生成画像カタログからのアセット存在・有効状態の確認は、必ずトランザクション開始前に完了させておく。

## 3. User・Session・Address

```typescript
interface UserRepository extends VersionedRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  search(query: UserSearchQuery): Promise<Page<UserAdminListItem>>;
  countActiveAdmins(): Promise<number>;
}

interface SessionRepository {
  create(session: Session): Promise<void>;
  get(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

interface AddressRepository extends VersionedRepository<UserAddress> {
  listByUser(userId: string): Promise<UserAddress[]>;
  createAndReassignDefault(input: CreateAddressCommand): Promise<UserAddress>;
  updateAndReassignDefault(input: UpdateAddressCommand): Promise<UserAddress>;
  deleteOwnedAndReassignDefault(input: DeleteAddressCommand): Promise<{
    deletedId: string;
    newDefaultAddressId: string | null;
  }>;
}

interface AddressLookupService {
  suggest(postalCode: string): Promise<AddressSuggestion | null>;
}
```

住所の保存および削除は、`user_addresses`単一ストアに対するアトミックなリポジトリメソッド内で実行し、旧デフォルト住所の解除または後継デフォルト住所の再選定までを完了させます。

## 4. Catalog

```typescript
interface StorefrontCatalogQueryRepository {
  getHome(query: StorefrontCatalogQuery): Promise<HomeCatalogDto>;
  listNavigationCategories(query: StorefrontCatalogQuery): Promise<StorefrontCategoryDto[]>;
  listNavigationBrands(query: StorefrontCatalogQuery): Promise<StorefrontBrandDto[]>;
}

interface ProductQueryRepository {
  search(query: ProductSearchQuery): Promise<ProductSearchResult>;
  suggest(query: SearchSuggestionQuery): Promise<SearchSuggestion[]>;
  getDetail(query: ProductDetailQuery): Promise<ProductDetail | null>;
}

interface AdminProductQueryRepository {
  search(query: AdminProductSearchQuery): Promise<Page<AdminProductListItem>>;
  getEditDto(query: AdminProductDetailQuery): Promise<ProductEditDto | null>;
}

interface ProductRepository {
  getById(id: string): Promise<Product | null>;
  getPrimaryImage(productId: string): Promise<ProductImage | null>;
  getAggregateForAdmin(id: string): Promise<ProductAggregate | null>;
  createAggregate(input: ProductAggregateCreateCommand): Promise<ProductAggregate>;
  updateAggregate(input: ProductAggregateUpdateCommand): Promise<ProductAggregate>;
  changeStatus(input: ChangeProductStatusCommand): Promise<Product>;
  deleteDraftAggregate(productId: string, expectedVersion: number): Promise<void>;
  hasBlockingReference(productId: string): Promise<boolean>;
  getVariantDeletionBlockers(variantId: string): Promise<VariantDeletionBlockers>;
  countPublishedByCategoryIds(categoryIds: string[]): Promise<number>;
  countPublishedByBrandId(brandId: string): Promise<number>;
}

interface CategoryRepository {
  getById(id: string): Promise<Category | null>;
  searchForAdmin(query: CategoryAdminSearchQuery): Promise<Page<CategoryAdminListItem>>;
  createAtEnd(command: CreateCategoryCommand): Promise<Category>;
  updateDetails(command: UpdateCategoryCommand): Promise<Category>;
  changeActiveState(command: ChangeCategoryActiveStateCommand): Promise<Category>;
  reorder(command: ReorderCategoriesCommand): Promise<Category[]>;
  listAllForReorder(): Promise<CategoryAdminListItem[]>;
}

interface BrandRepository {
  getById(id: string): Promise<Brand | null>;
  searchForAdmin(query: BrandAdminSearchQuery): Promise<Page<BrandAdminListItem>>;
  create(command: CreateBrandCommand): Promise<Brand>;
  updateDetails(command: UpdateBrandCommand): Promise<Brand>;
  changeActiveState(command: ChangeBrandActiveStateCommand): Promise<Brand>;
}

interface ReviewSummaryRepository extends VersionedRepository<ProductReviewSummary> {
  create(summary: ProductReviewSummary): Promise<ProductReviewSummary>;
  delete(productId: string, expectedVersion: number): Promise<void>;
}
```

### Catalog契約

- ストアフロント検索は、閲覧者フィルター（Viewer Filter）および全フィルターを適用した上で、ページ情報およびファセット（Facet）を返す。
- ストアフロントのナビゲーションは、閲覧者条件適用後の`visibleProductCount`が1件以上存在するアクティブなカテゴリおよびブランドのみを返す。並び順は、カテゴリは`sortOrder`、`nameNormalized`の順、ブランドは`nameNormalized`、`id`の順で表示する。
- 管理者向け商品検索は、下書き（draft）、非公開（unpublished）、販売終了（discontinued）、商品名、商品コード（`productCode`）、SKUを検索対象とする。在庫状態（`stockState`）はアクティブなSKUの在庫合計に基づき商品単位で判定し、0件を`out_of_stock`、1～5件を`low_stock`、1件以上を`in_stock`とする。
- カテゴリおよびブランドの一覧取得においても、リポジトリ側で検索、絞り込み、並べ替え、ページ分割（Search/Filter/Sort/Page）を行う。
- `deleteDraftAggregate()`は、トランザクション内でカート、注文、レビュー、在庫からの参照を再確認し、条件を満たさない場合はトランザクション全体をアボート（ロールバック）する。`hasBlockingReference()`はUI上での事前案内のみに使用する。
- 集約（Aggregate）保存トランザクション内では、カテゴリ、ブランド、SKU、画像（Image）の整合性条件およびバリアント（Variant）削除条件を再確認する。
- 商品の公開・非公開の変更は、`change-product-status`スコープ内でカテゴリ、ブランド、アクティブなSKU、メイン画像（Primary画像）の存在と有効性を再確認する。
- カテゴリ状態変更ユースケースでは、同一トランザクション内で`ProductRepository`を用いて公開商品からの参照を再確認し、参照が存在する場合は無効化を拒否する。
- カテゴリ作成時は`createAtEnd`を用い、既存が0件なら`sortOrder = 10`、既存データがある場合は同一のカテゴリ・ストア・トランザクション内で`max(sortOrder) + 10`を算出して決定し、保存する。
- ブランド状態変更ユースケースでは、同一トランザクション内で`ProductRepository`を用いて対象ブランドの公開商品参照を再確認する。
- ストアフロントのカテゴリ条件は、指定された第1階層のカテゴリIDをそのまま商品検索およびファセット件数の集計に適用する。
- 一括処理ユースケース（Bulk Use Case）は、対象ごとに通常の単体ユースケースおよびトランザクションを呼び出し、処理結果の成功・失敗を`BulkActionResult`に集約する。全対象を単一のトランザクションにまとめてはならない。
- レビュー集計（Review Summary）の更新では、`publishedCount = 0`の場合は`ratingAverage = 0`とし、それ以外は`ratingTotal / publishedCount`の計算結果を丸めずに保存する。リポジトリ側で表示用の端数処理（丸め）を行ってはならない。

## 5. Inventory・Cart・Checkout

```typescript
interface InventoryRepository {
  getVariant(id: string): Promise<ProductVariant | null>;
  updateQuantity(input: InventoryAdjustmentCommand): Promise<ProductVariant>;
  appendHistory(history: InventoryHistory): Promise<void>;
  search(query: InventorySearchQuery): Promise<Page<InventoryItem>>;
  countLowStock(threshold: number): Promise<number>;
}

interface CartRepository extends VersionedRepository<Cart> {
  getActiveByUser(userId: string): Promise<Cart | null>;
  getCartDto(input: { cartId: string; viewer: ProductViewer; now: IsoDateTime }): Promise<CartDto>;
  getActiveByGuest(guestId: string): Promise<Cart | null>;
  getOrCreateActiveByUser(input: { userId: string; now: IsoDateTime }): Promise<Cart>;
  getOrCreateActiveByGuest(input: { guestId: string; now: IsoDateTime }): Promise<Cart>;
  listItems(cartId: string): Promise<CartItem[]>;
  addQuantityToActiveCart(input: AddCartItemCommand): Promise<{ cart: Cart; item: CartItem }>;
  setQuantityAndTouchCart(input: UpdateCartItemQuantityCommand): Promise<{ cart: Cart; item: CartItem }>;
  deleteItemAndTouchCart(input: RemoveCartItemCommand): Promise<{ cart: Cart; deletedItemId: string }>;
  acceptPriceChangesAndTouchCart(input: AcceptPriceChangesCommand): Promise<{ cart: Cart; items: CartItem[] }>;
  mergeGuestIntoUser(command: MergeGuestCartCommand): Promise<CartMergeResult>;
}

interface CheckoutSessionRepository extends VersionedRepository<CheckoutSession> {
  getActiveByUser(userId: string): Promise<CheckoutSession | null>;
  startOrResume(command: StartOrResumeCheckoutCommand): Promise<CheckoutStartResult>;
  setAddress(command: SetCheckoutAddressCommand): Promise<CheckoutSession>;
  setPayment(command: SetCheckoutPaymentCommand): Promise<CheckoutSession>;
  getConfirmation(checkoutSessionId: string, userId: string, now: IsoDateTime): Promise<CheckoutConfirmationDto>;
  abandon(id: string, expectedVersion: number): Promise<CheckoutSession>;
  abandonActiveByUser(userId: string): Promise<number>;
  expireBefore(now: string): Promise<number>;
}
```

### 原子契約

- アクティブなカート（active Cart）の取得および作成は、単一ストアに対するアトミックなリポジトリメソッド内で再取得と作成を行い、一意性制約の競合（Unique競合）が発生した場合は既存カートを再取得する。
- アイテムの追加は`addQuantityToActiveCart`を用い、所有者のアクティブなカートを取得するか、存在しなければ`newCartId`で新規作成する。既存SKUであれば数量を加算し、新規SKUであれば`newItemId`で明細を作成する。カートの取得・作成、数量検証、明細更新、および親カートの`updatedAt`と`version`の更新は、すべて`cart-mutation`スコープの同一トランザクション内で実行する。初回のアイテム追加時はカートのバージョン（Version）検証を要求しない。数量更新時は`setQuantityAndTouchCart`により絶対数量への置き換えを行う。
- 数量更新の入力値（Input）が0の場合、ユースケース側で`deleteItemAndTouchCart`へ処理を委譲し、リポジトリに数量0のカート明細（Cart Item）を保存させない。
- ログインおよび会員登録（Login/Register）の際は、トランザクション内で対象ユーザーがアクティブ（active）であることを再確認する。一般顧客（customer）の場合は、セッション作成とゲストカートの統合を同一スコープ内で実行し、失敗時はセッションおよびカートの変更をすべてロールバックしてゲストカートの状態を保持する。運用者・管理者（operator/admin）の場合はセッション作成のみを行い、ゲストカートの取得や変更は行わない。
- 在庫調整は、`adjust-inventory`スコープ内で数量更新と履歴追加を一括して行う。どちらか一方のみをコミットしてはならない。
- チェックアウトの開始時は、`start-checkout`スコープ内でユーザーがアクティブかつ一般顧客であること、およびカート、カート明細、商品、バリアント（Cart/Item/Product/Variant）の有効性を再検証した上で、セッションの作成または再開を行う。
- チェックアウトセッションの期限切れ判定は、アプリ起動時、チェックアウトルートのガード（Route Guard）通過時、および`StartCheckout`の実行時に行い、定期的なタイマー処理には依存しない。

## 6. Order・Payment・Shipment

```typescript
interface OrderRepository extends VersionedRepository<Order> {
  create(order: Order, items: OrderItem[]): Promise<Order>;
  getDetail(orderId: string): Promise<OrderDetailDto | null>;
  listByUser(userId: string, query: MyOrderSearchQuery): Promise<Page<OrderListItem>>;
  search(query: OrderSearchQuery): Promise<Page<AdminOrderListItem>>;
  countByStatus(status: OrderStatus): Promise<number>;
  listItems(orderId: string): Promise<OrderItem[]>;
  appendStatusHistory(history: OrderStatusHistory): Promise<void>;
}

interface SequenceRepository {
  next(sequenceType: string, localDate: string): Promise<number>;
}

interface PaymentRepository extends VersionedRepository<Payment> {
  create(payment: Payment): Promise<Payment>;
  listByOrder(orderId: string): Promise<Payment[]>;
  getLatestByOrder(orderId: string): Promise<Payment | null>;
  findByGatewayKey(key: string): Promise<Payment | null>;
}

interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

interface ShipmentRepository extends VersionedRepository<Shipment> {
  getByOrder(orderId: string): Promise<Shipment | null>;
  create(shipment: Shipment): Promise<Shipment>;
}
```

決済ゲートウェイ（Payment Gateway）は、アプリケーションDBのトランザクション外で呼び出します。注文作成に必要な画像パスは、ビルド時に生成されたマニフェストモジュールからトランザクション開始前に解決し、`CreateOrderForPaymentCommand.assetPathByAssetId`として渡します。代替テキスト（Alt Text）は、トランザクション内で最新の`ProductImage`関連から取得します。

## 7. Review・Overview

```typescript
interface ReviewRepository extends VersionedRepository<Review> {
  findByOrderItem(orderItemId: string): Promise<Review | null>;
  create(review: Review): Promise<Review>;
  listPublished(productId: string, query: ReviewListQuery): Promise<Page<ReviewListItem>>;
  searchForAdmin(query: ReviewSearchQuery): Promise<Page<AdminReviewListItem>>;
  countByStatus(status: ReviewStatus): Promise<number>;
  appendStatusHistory(history: ReviewStatusHistory): Promise<void>;
}

interface AdminOverviewQueryRepository {
  getOverview(input: { lowStockThreshold: number; recentOrderLimit: number }): Promise<AdminOverview>;
}
```

レビューの初回作成時における`ReviewStatusHistory.fromStatus`は`null`とし、それ以降の状態変更時には直前のステータス（Status）を設定します。

## 8. 共通Error

リポジトリやアダプター固有の例外（Exception）は、ユースケース境界で`ApplicationError`へ変換します。プレゼンテーション層に対して、Dexie名、ストア名、スタックトレース、内部クラス名などを露出させてはなりません。エラーコード（Error Code）、`messageKey`、`fieldErrors`、`retryable`の正本仕様は`application_contracts.md`です。なお、フェーズ1（Phase 1）では、照合（Reconciliation）、返金（Refund）、インポート（Import）、移行リカバリ（Migration Recovery）固有のエラーは定義しません。
