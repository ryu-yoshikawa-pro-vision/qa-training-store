import type {
  Brand,
  Cart,
  CartItem,
  Category,
  CheckoutSession,
  DailySequence,
  InventoryHistory,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  Payment,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariant,
  Review,
  ReviewStatus,
  ReviewStatusHistory,
  Session,
  Shipment,
  User,
  UserAddress,
} from "@/domain/contracts";
import type {
  AcceptPriceChangesCommand,
  AddressSuggestion,
  AddCartItemCommand,
  AdminOrderListItem,
  AdminOverview,
  AdminProductDetailQuery,
  AdminProductListItem,
  AdminProductSearchQuery,
  AdminReviewListItem,
  BrandAdminListItem,
  BrandAdminSearchQuery,
  CartDto,
  CartMergeResult,
  CategoryAdminListItem,
  CategoryAdminSearchQuery,
  ChangeBrandActiveStateCommand,
  ChangeCategoryActiveStateCommand,
  ChangeProductStatusCommand,
  CheckoutConfirmationDto,
  CheckoutStartResult,
  CreateAddressCommand,
  CreateBrandCommand,
  CreateCategoryCommand,
  DeleteAddressCommand,
  ImageAssetListItem,
  ImageAssetSearchQuery,
  InventoryAdjustmentCommand,
  InventoryItem,
  InventorySearchQuery,
  MergeGuestCartCommand,
  MyOrderSearchQuery,
  OrderDetailDto,
  OrderInspection,
  OrderListItem,
  OrderSearchQuery,
  Page,
  ProductAggregate,
  ProductAggregateCreateCommand,
  ProductAggregateUpdateCommand,
  ProductDetail,
  ProductDetailQuery,
  ProductEditDto,
  ProductSearchQuery,
  ProductSearchResult,
  RemoveCartItemCommand,
  ReorderCategoriesCommand,
  ReviewListItem,
  ReviewListQuery,
  ReviewSearchQuery,
  ReviewSummaryInspection,
  SearchSuggestion,
  SearchSuggestionQuery,
  SetCheckoutAddressCommand,
  SetCheckoutPaymentCommand,
  StartOrResumeCheckoutCommand,
  StorefrontBrandDto,
  StorefrontCatalogQuery,
  StorefrontCategoryDto,
  TestMetadata,
  UpdateAddressCommand,
  UpdateBrandCommand,
  UpdateCartItemQuantityCommand,
  UpdateCategoryCommand,
  UserAdminListItem,
  UserSearchQuery,
  VariantDeletionBlockers,
  VariantInspection,
} from "@/application/contracts";

export interface VersionedRepository<T> {
  getById(id: string): Promise<T | null>;
  update(entity: T, expectedVersion: number): Promise<T>;
}

export interface UserRepository extends VersionedRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  search(query: UserSearchQuery): Promise<Page<UserAdminListItem>>;
  countActiveAdmins(): Promise<number>;
}

export interface SessionRepository {
  create(session: Session): Promise<void>;
  get(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export interface AddressRepository extends VersionedRepository<UserAddress> {
  listByUser(userId: string): Promise<UserAddress[]>;
  createAndReassignDefault(input: CreateAddressCommand): Promise<UserAddress>;
  updateAndReassignDefault(input: UpdateAddressCommand): Promise<UserAddress>;
  deleteOwnedAndReassignDefault(
    input: DeleteAddressCommand,
  ): Promise<{ deletedId: string; newDefaultAddressId: string | null }>;
}

export interface StorefrontCatalogQueryRepository {
  getHome(query: StorefrontCatalogQuery): Promise<import("@/application/contracts").HomeCatalogDto>;
  listNavigationCategories(query: StorefrontCatalogQuery): Promise<StorefrontCategoryDto[]>;
  listNavigationBrands(query: StorefrontCatalogQuery): Promise<StorefrontBrandDto[]>;
}

export interface ProductQueryRepository {
  search(query: ProductSearchQuery): Promise<ProductSearchResult>;
  suggest(query: SearchSuggestionQuery): Promise<SearchSuggestion[]>;
  getDetail(query: ProductDetailQuery): Promise<ProductDetail | null>;
}

export interface AdminProductQueryRepository {
  search(query: AdminProductSearchQuery): Promise<Page<AdminProductListItem>>;
  getEditDto(query: AdminProductDetailQuery): Promise<ProductEditDto | null>;
}

export interface ProductRepository {
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

export interface CategoryRepository {
  getById(id: string): Promise<Category | null>;
  searchForAdmin(query: CategoryAdminSearchQuery): Promise<Page<CategoryAdminListItem>>;
  createAtEnd(command: CreateCategoryCommand): Promise<Category>;
  updateDetails(command: UpdateCategoryCommand): Promise<Category>;
  changeActiveState(command: ChangeCategoryActiveStateCommand): Promise<Category>;
  reorder(command: ReorderCategoriesCommand): Promise<Category[]>;
  listAllForReorder(): Promise<CategoryAdminListItem[]>;
}

export interface BrandRepository {
  getById(id: string): Promise<Brand | null>;
  searchForAdmin(query: BrandAdminSearchQuery): Promise<Page<BrandAdminListItem>>;
  create(command: CreateBrandCommand): Promise<Brand>;
  updateDetails(command: UpdateBrandCommand): Promise<Brand>;
  changeActiveState(command: ChangeBrandActiveStateCommand): Promise<Brand>;
}

export interface ImageAssetCatalogRepository {
  searchActive(query: ImageAssetSearchQuery): Promise<Page<ImageAssetListItem>>;
  getById(assetId: string): Promise<import("@/domain/contracts").ImageAsset | null>;
  listByIds(assetIds: string[]): Promise<import("@/domain/contracts").ImageAsset[]>;
}

export interface ReviewSummaryRepository extends VersionedRepository<ProductReviewSummary> {
  create(summary: ProductReviewSummary): Promise<ProductReviewSummary>;
  delete(productId: string, expectedVersion: number): Promise<void>;
}

export interface InventoryRepository {
  getVariant(id: string): Promise<ProductVariant | null>;
  listHistory(variantId: string): Promise<InventoryHistory[]>;
  updateQuantity(input: InventoryAdjustmentCommand): Promise<ProductVariant>;
  appendHistory(history: InventoryHistory): Promise<void>;
  search(query: InventorySearchQuery): Promise<Page<InventoryItem>>;
  countLowStock(threshold: number): Promise<number>;
}

export interface CartRepository extends VersionedRepository<Cart> {
  getActiveByUser(userId: string): Promise<Cart | null>;
  getCartDto(input: {
    cartId: string;
    viewer: import("@/application/contracts").ProductViewer;
    now: string;
  }): Promise<CartDto>;
  getActiveByGuest(guestId: string): Promise<Cart | null>;
  getOrCreateActiveByUser(input: { userId: string; now: string }): Promise<Cart>;
  getOrCreateActiveByGuest(input: { guestId: string; now: string }): Promise<Cart>;
  listItems(cartId: string): Promise<CartItem[]>;
  addQuantityToActiveCart(input: AddCartItemCommand): Promise<{ cart: Cart; item: CartItem }>;
  setQuantityAndTouchCart(
    input: UpdateCartItemQuantityCommand,
  ): Promise<{ cart: Cart; item: CartItem }>;
  deleteItemAndTouchCart(
    input: RemoveCartItemCommand,
  ): Promise<{ cart: Cart; deletedItemId: string }>;
  acceptPriceChangesAndTouchCart(
    input: AcceptPriceChangesCommand,
  ): Promise<{ cart: Cart; items: CartItem[] }>;
  mergeGuestIntoUser(command: MergeGuestCartCommand): Promise<CartMergeResult>;
}

export interface CheckoutSessionRepository extends VersionedRepository<CheckoutSession> {
  getActiveByUser(userId: string): Promise<CheckoutSession | null>;
  startOrResume(command: StartOrResumeCheckoutCommand): Promise<CheckoutStartResult>;
  setAddress(command: SetCheckoutAddressCommand): Promise<CheckoutSession>;
  setPayment(command: SetCheckoutPaymentCommand): Promise<CheckoutSession>;
  getConfirmation(
    checkoutSessionId: string,
    userId: string,
    now: string,
  ): Promise<CheckoutConfirmationDto>;
  abandon(id: string, expectedVersion: number): Promise<CheckoutSession>;
  abandonActiveByUser(userId: string): Promise<number>;
  expireBefore(now: string): Promise<number>;
}

export interface OrderRepository extends VersionedRepository<Order> {
  create(order: Order, items: OrderItem[]): Promise<Order>;
  getItemById(orderItemId: string): Promise<OrderItem | null>;
  getDetail(orderId: string): Promise<OrderDetailDto | null>;
  listByUser(userId: string, query: MyOrderSearchQuery): Promise<Page<OrderListItem>>;
  search(query: OrderSearchQuery): Promise<Page<AdminOrderListItem>>;
  countByStatus(status: OrderStatus): Promise<number>;
  listItems(orderId: string): Promise<OrderItem[]>;
  appendStatusHistory(history: OrderStatusHistory): Promise<void>;
}

export interface SequenceRepository {
  next(sequenceType: string, localDate: string): Promise<number>;
}

export interface PaymentRepository extends VersionedRepository<Payment> {
  create(payment: Payment): Promise<Payment>;
  listByOrder(orderId: string): Promise<Payment[]>;
  getLatestByOrder(orderId: string): Promise<Payment | null>;
  findByGatewayKey(key: string): Promise<Payment | null>;
}

export interface ShipmentRepository extends VersionedRepository<Shipment> {
  getByOrder(orderId: string): Promise<Shipment | null>;
  create(shipment: Shipment): Promise<Shipment>;
}

export interface ReviewRepository extends VersionedRepository<Review> {
  findByOrderItem(orderItemId: string): Promise<Review | null>;
  create(review: Review): Promise<Review>;
  listPublished(productId: string, query: ReviewListQuery): Promise<Page<ReviewListItem>>;
  searchForAdmin(query: ReviewSearchQuery): Promise<Page<AdminReviewListItem>>;
  countByStatus(status: ReviewStatus): Promise<number>;
  appendStatusHistory(history: ReviewStatusHistory): Promise<void>;
  listStatusHistories(reviewId: string): Promise<ReviewStatusHistory[]>;
}

export interface AdminOverviewQueryRepository {
  getOverview(input: {
    lowStockThreshold: number;
    recentOrderLimit: number;
  }): Promise<AdminOverview>;
}

export interface SettingsRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export interface TestInspectionRepository {
  inspectOrder(orderId: string): Promise<OrderInspection>;
  inspectVariant(variantId: string): Promise<VariantInspection>;
  inspectReviewSummary(productId: string): Promise<ReviewSummaryInspection>;
}

export interface TestMetadataRepository {
  getMetadata(): Promise<TestMetadata>;
}

export type { DailySequence };
