# Repository Interface設計

本書はRepository責務とTransaction境界の正本です。Domain Entityは`domain_types.md`、DTO・Input・Resultの具体型は`application_contracts.md`を参照します。

## 1. 共通

```typescript
interface VersionedRepository<T> {
  getById(id: string): Promise<T | null>;
  update(entity: T, expectedVersion: number): Promise<T>;
}
```

RepositoryはDomain Entityまたは明示したRead DTOを返し、Dexie ObjectをUIへ露出しません。Transaction-bound Repositoryは新しいtop-level Transactionを開始しません。Clock、ID、Session、Guest Identity、Email正規化、Application Errorは`application_contracts.md`の共通契約を使用します。

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

- Scopeに必要なStoreだけを1つのDexie Transactionとして開く。
- `work`へは同じTransactionへ束縛されたRepositoryだけを渡す。
- Scope外Repository呼出しはTypeScript型とRuntime Guardの両方で拒否する。
- Payment Gateway、Address Lookup、Timerなどの外部非同期処理をTransaction内でawaitしない。画像PathはBuild生成ModuleからTransaction開始前に解決する。
- nested Transactionは親ScopeのStore集合を超えない。
- Transaction CallbackではNative Promise/Web Crypto/Dexie互換Promise以外を待機しない。
- 認証のPassword照合と、Build生成画像CatalogからのAsset存在・有効状態確認はTransaction開始前に完了させる。

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

Addressの保存・削除は`user_addresses`単一Storeの原子的Repository Methodで、旧Default解除または後継Default選択まで完了します。

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

interface ImageAssetCatalogRepository {
  searchActive(query: ImageAssetSearchQuery): Promise<Page<ImageAssetListItem>>;
  getById(assetId: string): Promise<ImageAsset | null>;
  listByIds(assetIds: string[]): Promise<ImageAsset[]>;
}

interface ReviewSummaryRepository extends VersionedRepository<ProductReviewSummary> {
  create(summary: ProductReviewSummary): Promise<ProductReviewSummary>;
  delete(productId: string, expectedVersion: number): Promise<void>;
}
```

### Catalog契約

- Storefront SearchはViewer Filterと全Filterを適用した後にPage・Facetを返す。
- Storefront NavigationはViewer条件適用後のvisibleProductCountが1件以上のactive Category/Brandだけを返す。CategoryはsortOrder・nameNormalized、BrandはnameNormalized・idの順で表示する。
- Admin商品Searchはdraft/unpublished/discontinued、商品名、productCode、SKUを対象にする。`stockState`はactive SKUの在庫合計で商品単位に判定し、0を`out_of_stock`、1～5を`low_stock`、1以上を`in_stock`とする。
- Category・Brand一覧もRepositoryでSearch/Filter/Sort/Pageを行う。
- `deleteDraftAggregate()`はTransaction内でCart/Order/Review/Inventory参照を再確認し、条件不成立なら全体をAbortする。`hasBlockingReference()`はUI事前案内だけに使用する。
- Aggregate保存Transaction内でCategory/Brand/SKU/Image条件とVariant削除条件を再確認する。
- 商品公開・非公開は`change-product-status` Scope内でCategory/Brand/active SKU/Primary画像を再確認する。
- Category状態変更Use CaseはProductRepositoryで公開商品参照を同一Transaction内に再確認し、参照があれば無効化を拒否する。
- Category作成は`createAtEnd`で0件ならsortOrder=10、既存があればmax(sortOrder)+10を同一Category Store Transaction内で決定して保存する。
- Brand状態変更Use CaseはProductRepositoryで対象Brandの公開商品参照を同一Transaction内に再確認する。
- Storefront Category条件は指定した1階層Category IDをそのまま商品検索・Facet件数へ適用する。
- Bulk Use Caseは対象ごとに通常の単体Use Case/Transactionを呼び、`BulkActionResult`へ成功・失敗を集約する。全対象を1つのTransactionへまとめない。
- Review Summary更新では`publishedCount=0`なら`ratingAverage=0`、それ以外は`ratingTotal / publishedCount`を未丸めで保存し、Repositoryが表示用丸めを行わない。

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

- active Cart取得/作成は単一Storeの原子的Repository Methodで再取得と作成を行い、Unique競合時は既存Cartを再取得する。
- Item追加は`addQuantityToActiveCart`でownerのactive Cartを取得または`newCartId`で作成し、既存SKUなら加算、新規なら`newItemId`で作成する。Cart取得/作成、数量検証、明細更新、親Cartの`updatedAt/version`更新を`cart-mutation` Scopeの同一Transactionで行う。初回追加ではCart Versionを要求しない。数量更新は`setQuantityAndTouchCart`で絶対数量へ置換する。
- 数量更新Inputが0の場合、Use Caseは`deleteItemAndTouchCart`へ委譲し、Repositoryへ0数量のCart Itemを保存しない。
- Login/Register時、Transaction内でUserがactiveであることを再確認する。customerはSession作成とGuest Cart統合を同じScopeで実行し、失敗時はSession・CartをすべてRollbackしてGuest Cartを保持する。operator/adminはSessionだけを作成し、Guest Cartを取得・変更しない。
- 在庫調整は`adjust-inventory` Scopeで数量更新と履歴追加を行う。片方だけCommitしない。
- Checkout開始は`start-checkout` Scope内でUser active/customer、Cart/Item/Product/Variantを再検証してからSessionを作成・再開する。
- Checkout Session期限切れ判定はApp起動、Checkout Route Guard、StartCheckout実行時に行い、定期Timerへ依存しない。

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

Payment GatewayはApp DB Transaction外で呼びます。Order作成に必要な画像PathはBuild生成Manifest ModuleからTransaction前に解決し、`CreateOrderForPaymentCommand.assetPathByAssetId`として渡します。Alt TextはTransaction内で現在のProductImage関係から取得します。

## 7. Review・Overview・Settings

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

interface SettingsRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}
```

## 8. Automation Inspection

```typescript
interface TestInspectionRepository {
  inspectOrder(orderId: string): Promise<OrderInspection>;
  inspectVariant(variantId: string): Promise<VariantInspection>;
  inspectReviewSummary(productId: string): Promise<ReviewSummaryInspection>;
}
```

Automation Buildだけに固定DTOで公開します。任意Store名、任意条件、任意書換えは受け付けません。

Review初回作成時の`ReviewStatusHistory.fromStatus`は`null`、以後の状態変更では直前Statusを設定します。

## 9. 共通Error

Repository/Adapter固有ExceptionはUse Case境界で`ApplicationError`へ変換します。PresentationへDexie名、Store名、stack、内部Class名を露出しません。Error Code、messageKey、fieldErrors、retryableの正本は`application_contracts.md`です。Phase 1にReconciliation、Refund、Import、Migration Recovery固有Errorを定義しません。
