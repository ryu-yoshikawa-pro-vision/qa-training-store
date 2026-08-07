# Application・DTO契約

本書はPhase 1のTypeScript実装契約の正本です。Entityの正本は`data_model.md`と`domain_types.md`、Repositoryの責務は`repository_interfaces.md`、業務Ruleは`business_rules.md`を参照します。

## 1. 共通型

`EntityId`、`IsoDateTime`、`Yen`は`domain_types.md`からimportします。

```typescript
type PageNumber = number; // 1以上
type PageSize = 20 | 50;

type Page<T> = {
  items: T[];
  page: PageNumber;
  pageSize: PageSize;
  total: number;
};

type VersionedInput = {
  expectedVersion: number;
};

type ApplicationErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "AUTHENTICATION_REQUIRED"
  | "AUTHENTICATION_FAILED"
  | "LOGIN_TRANSACTION_FAILED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_WITHDRAWN"
  | "PERMISSION_DENIED"
  | "EMAIL_ALREADY_EXISTS"
  | "CONFLICT"
  | "INVALID_STATE"
  | "INVALID_ROLE"
  | "NOT_ELIGIBLE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "QUANTITY_LIMIT_EXCEEDED"
  | "PRICE_CHANGED"
  | "CART_VERSION_CHANGED"
  | "CHECKOUT_EXPIRED"
  | "CHECKOUT_STEP_INCOMPLETE"
  | "PAYMENT_FAILED"
  | "IMAGE_ASSET_NOT_FOUND"
  | "IMAGE_ASSET_INACTIVE"
  | "PRODUCT_HAS_REFERENCE"
  | "VARIANT_HAS_REFERENCE"
  | "LAST_ADMIN_PROTECTED"
  | "SELF_CHANGE_FORBIDDEN"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "RESET_BLOCKED_BY_OPEN_PAGE"
  | "UNKNOWN_ERROR";

type ApplicationError = {
  code: ApplicationErrorCode;
  messageKey: string;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
};

interface Clock { now(): IsoDateTime; }
interface IdGenerator { generate(): EntityId; }
interface CurrentSessionStore {
  getSessionId(): Promise<string | null>;
  setSessionId(id: string): Promise<void>;
  clear(): Promise<void>;
}
interface GuestIdentityStore {
  getOrCreateGuestId(): Promise<string>;
  clear(): Promise<void>;
}
interface EmailNormalizer {
  normalize(email: string): string;
}
interface SearchTextNormalizer {
  normalize(value: string): string;
}
interface CurrentActorResolver {
  requireCurrentUser(): Promise<CurrentUserDto>;
  getViewer(): Promise<ProductViewer>;
}

const INPUT_LIMITS = {
  email: 254, passwordMin: 8, passwordMax: 72, displayName: 100,
  addressLabel: 50, recipientName: 100, prefecture: 20, city: 100,
  addressLine1: 200, addressLine2: 100, productName: 120, productCode: 50,
  shortDescription: 200, description: 5000, categoryName: 80, brandName: 80,
  variationName: 30, optionValue: 80, sku: 50, imageAltText: 120,
  reviewTitle: 120, reviewBody: 1000, inventoryReason: 200,
  carrierName: 100, trackingNumber: 100, searchKeyword: 100,
  postalCodeDigits: 7, phoneDigitsMin: 10, phoneDigitsMax: 11,
  maxAddressesPerUser: 5, maxProductImages: 3, maxCartQuantity: 99,
} as const;
```

金額、数量、在庫、Page、VersionはApplication入口で整数検証します。EmailはTrim、Unicode NFKC、Locale非依存小文字化の順で正規化し、保存・検索・一意判定に同じ値を使用します。productCode/SKUはTrim、NFKC、ASCII大文字化後に`[A-Z0-9_-]+`で検証し、正規化値をそのまま保存します。UI、Zod、Use Caseは`INPUT_LIMITS`を共用します。

Query共通規約: Pageは1始まり、空の配列Filterは「全件」、`null` Keywordは未指定、日時範囲は`from`を含み`to`を含まない、Sort同値時は各正本で定義した安定Keyを追加します。検索文字列はTrim、Unicode NFKC、Locale非依存小文字化、連続空白の1文字化を同じ`SearchTextNormalizer`で行い、空文字は`null`へ変換します。

## 2. 認証契約

```typescript
type LoginRequest = {
  email: string;
  password: string;
};

type LoginCommand = LoginRequest & {
  guestId: string | null;
  sessionId: string;
  now: IsoDateTime;
};

type LoginResult = {
  sessionId: string;
  user: CurrentUserDto;
  cartMerge: CartMergeResult | null;
};

type RegisterUserRequest = {
  email: string;
  password: string;
  displayName: string;
};

type RegisterUserCommand = RegisterUserRequest & {
  userId: string;
  sessionId: string;
  guestId: string | null;
  now: IsoDateTime;
};

type CurrentUserDto = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  membershipRank: MembershipRank | null;
  accountStatus: AccountStatus;
  actionVersion: number; // UI操作用。画面表示は不要
};

type UpdateProfileRequest = {
  displayName: string;
  phone: string | null;
  actionVersion: number;
};

type CreateAddressRequest = {
  label: string;
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string;
  makeDefault: boolean;
};

type CreateAddressCommand = CreateAddressRequest & {
  userId: string;
  addressId: string;
  now: IsoDateTime;
};

type UpdateAddressRequest = CreateAddressRequest & {
  addressId: string;
  expectedVersion: number;
};

type UpdateAddressCommand = UpdateAddressRequest & {
  userId: string;
  now: IsoDateTime;
};

type DeleteAddressRequest = {
  addressId: string;
  expectedVersion: number;
};

type DeleteAddressCommand = DeleteAddressRequest & {
  userId: string;
  now: IsoDateTime;
};

type AddressSuggestion = {
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
};
```

### LoginのRole分岐

- `active customer`はSession作成とGuest Cart統合を同一Transactionで実行する。
- `active operator/admin`はSessionだけを作成し、Guest Cartを参照・変更しない。`LoginResult.cartMerge`は`null`とする。
- `suspended/withdrawn`はSession作成前に拒否する。
- operator/adminが通常のStorefrontを閲覧する場合、`CurrentActorResolver.getViewer()`は`{ kind: "guest" }`を返す。管理Previewだけが管理権限で非公開商品を確認する。

### Inputの信頼境界

Presentationは`*Request`だけを生成します。Current User/Role/Rank、Actor User ID、Guest ID、Clock時刻、生成対象のEntity ID、画像Manifest解決値はUse Caseが依存Portから解決して`*Command`へ変換します。Routeの対象を示す既存Entity IDとPresentation DTOから得た`actionVersion`はRequestへ含めて構いませんが、Use Caseは所有権・権限を再検証し、Repository更新時のexpectedVersionへ変換します。

### PasswordHasher Port

```typescript
interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encodedHash: string): Promise<boolean>;
}
```

保存形式は次へ固定します。

```text
pbkdf2-sha256$210000$<saltBase64>$<hashBase64>
```

- Web Crypto APIのPBKDF2・SHA-256を使用する。
- SaltはUserごとに`crypto.getRandomValues()`で16byte生成する。
- 派生Keyは32byteとする。
- Saltと派生Keyの文字列表現はRFC 4648の標準Base64（paddingあり）を使用する。
- PasswordはUTF-8で処理する。
- 比較は全byteを確認する一定時間比較関数を使用する。
- Seed Userは`SHA-256("scenario-shop-seed:" + userId)`の先頭16byteをSaltとしてBuild時にHashを生成する。Runtimeで平文PasswordをDBへ保存しない。
- 本方式はLocal疑似認証の実装統一を目的とし、本物の認証境界とは扱わない。

## 3. Storefront Query・DTO

```typescript
type ProductViewer =
  | { kind: "guest" }
  | { kind: "customer"; userId: string; membershipRank: MembershipRank };

type ProductSort = "newest" | "price_asc" | "price_desc" | "rating_desc";

type ProductSearchRequest = {
  keyword: string | null;
  categoryIds: string[];
  brandIds: string[];
  minimumPrice: Yen | null;
  maximumPrice: Yen | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  minimumRating: 1 | 2 | 3 | 4 | 5 | null;
  sort: ProductSort;
  page: PageNumber;
  pageSize: 20;
};

type ProductSearchQuery = ProductSearchRequest & { viewer: ProductViewer; now: IsoDateTime };

type ProductListItem = {
  productId: string;
  productCode: string;
  name: string;
  brandName: string;
  primaryImage: ImageSnapshotDto;
  minimumViewerUnitPrice: Yen;
  maximumViewerUnitPrice: Yen;
  hasPurchasableStock: boolean;
  hasActiveSale: boolean;
  ratingAverage: number; // 未丸め。表示層だけ小数第1位へ丸める
  publishedReviewCount: number;
};

type ProductDetail = ProductListItem & {
  shortDescription: string;
  description: string;
  categoryBreadcrumb: Array<{ id: string; name: string }>;
  requiredRank: MembershipRank | null;
  variationName: string | null;
  variants: ProductVariantForViewer[];
  images: ProductImageDto[];
  reviewSummary: ProductReviewSummaryDto;
};

type ImageSnapshotDto = {
  assetId: string;
  path: string;
  altText: string;
};


type ProductVariantForViewer = {
  variantId: string;
  sku: string;
  optionValue: string | null;
  regularPrice: Yen;
  activeSalePrice: Yen | null; // 現在時刻に有効な場合だけ設定
  viewerUnitPrice: Yen;
  stockQuantity: number;
  purchaseLimit: number;
};

type ProductImageDto = ImageSnapshotDto & {
  sortOrder: number;
  isPrimary: boolean;
};

type ProductReviewSummaryDto = {
  publishedCount: number;
  ratingTotal: number;
  ratingAverage: number; // publishedCount=0は0、それ以外はratingTotal / publishedCountを未丸め保存
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
};

type CategoryFacetItem = {
  id: string;
  name: string;
  count: number;
};

type BrandFacetItem = { id: string; name: string; count: number };

type ProductFacets = {
  categories: CategoryFacetItem[];
  brands: BrandFacetItem[];
  ratings: Array<{ minimumRating: 1 | 2 | 3 | 4 | 5; count: number }>;
  inStockCount: number;
  onSaleCount: number;
};

type StorefrontCategoryDto = {
  categoryId: string;
  name: string;
  visibleProductCount: number;
};

type StorefrontBrandDto = {
  brandId: string;
  name: string;
  visibleProductCount: number;
};

type StorefrontCatalogQuery = {
  viewer: ProductViewer;
  now: IsoDateTime;
};

type ProductDetailQuery = StorefrontCatalogQuery & {
  productId: string;
};

type HomeCatalogDto = {
  categories: StorefrontCategoryDto[];
  brands: StorefrontBrandDto[];
  newProducts: ProductListItem[];
  saleProducts: ProductListItem[];
};

type ProductSearchResult = Page<ProductListItem> & { facets: ProductFacets };

// Catalog系Use CaseはClock.now()を1回取得し、全Catalog Queryへ同じnowを渡す。Repositoryは実時計を直接参照しない。

type SearchSuggestionRequest = {
  keyword: string;
  limit: 8;
};

type SearchSuggestionQuery = SearchSuggestionRequest & { viewer: ProductViewer; now: IsoDateTime };

type ProductReviewsQuery = {
  productId: string;
  query: ReviewListQuery;
};

type ImageAssetSearchRequest = {
  keyword: string | null;
  tags: string[];
  page: PageNumber;
  pageSize: 20 | 50;
};

type ImageAssetSearchQuery = ImageAssetSearchRequest;

type ImageAssetListItem = Pick<ImageAsset, "assetId" | "path" | "mimeType" | "width" | "height" | "bytes" | "tags" | "defaultAltText" | "isActive">;

type SearchSuggestion =
  | { type: "product"; id: string; label: string; supportingText?: string }
  | { type: "category"; id: string; label: string }
  | { type: "brand"; id: string; label: string };
```

## 4. Admin Query・DTO

```typescript
type AdminProductSort =
  | "updated_desc"
  | "name_asc"
  | "product_code_asc"
  | "status_asc"
  | "minimum_price_asc"
  | "minimum_price_desc";
type AdminProductSearchRequest = {
  keyword: string | null; // 商品名、productCode、SKU
  statuses: ProductStatus[];
  categoryIds: string[];
  brandIds: string[];
  requiredRanks: Array<MembershipRank | "none">;
  stockState: "all" | "in_stock" | "low_stock" | "out_of_stock";
  sort: AdminProductSort;
  page: PageNumber;
  pageSize: 20 | 50;
};

type AdminProductSearchQuery = AdminProductSearchRequest & {
  now: IsoDateTime;
};

// 管理商品一覧はactive SKUの在庫合計activeTotalStockで判定する。
// stockState境界: in_stock=1以上、low_stock=1～5、out_of_stock=0。
// low_stockとout_of_stockは重複させず、SKU単位判定は在庫一覧Queryで扱う。

type AdminProductDetailQuery = {
  productId: string;
  now: IsoDateTime;
};

type AdminProductListItem = {
  productId: string;
  productCode: string;
  name: string;
  status: ProductStatus;
  categoryName: string;
  brandName: string;
  activeSkuCount: number;
  minimumCurrentEffectivePrice: Yen; // Sale適用後・会員割引前
  maximumCurrentEffectivePrice: Yen;
  activeTotalStock: number; // active SKUの在庫合計。管理商品一覧Filterの判定値
  updatedAt: IsoDateTime;
  version: number;
};

type CategoryAdminSearchQuery = {
  keyword: string | null;
  active: boolean | null;
  sort: "sort_order" | "name_asc" | "updated_desc";
  page: PageNumber;
  pageSize: 20 | 50;
};

type BrandAdminSearchQuery = {
  keyword: string | null;
  active: boolean | null;
  sort: "name_asc" | "updated_desc";
  page: PageNumber;
  pageSize: 20 | 50;
};
```

```typescript
type UserSearchQuery = {
  keyword: string | null;
  roles: UserRole[];
  membershipRanks: MembershipRank[];
  accountStatuses: AccountStatus[];
  sort: "created_desc" | "email_asc" | "updated_desc";
  page: PageNumber;
  pageSize: 20 | 50;
};

type UserAdminListItem = {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  membershipRank: MembershipRank | null;
  accountStatus: AccountStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
};

type UserAdminDto = UserAdminListItem;

type ChangeMembershipRankRequest = {
  userId: string;
  rank: MembershipRank;
  expectedVersion: number;
};

type ChangeOperatorAdminRoleRequest = {
  userId: string;
  role: "operator" | "admin";
  expectedVersion: number;
};

type ChangeAccountSuspensionRequest = {
  userId: string;
  accountStatus: "active" | "suspended";
  expectedVersion: number;
};

type CategoryAdminListItem = {
  categoryId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  publishedProductCount: number;
  updatedAt: IsoDateTime;
  version: number;
};

type BrandAdminListItem = {
  brandId: string;
  name: string;
  isActive: boolean;
  publishedProductCount: number;
  updatedAt: IsoDateTime;
  version: number;
};
```

Category・BrandもRepositoryでFilter・Sort・Pageを行い、UIで全件取得後に独自Page処理しません。Categoryだけが手動表示順を持ち、Brandは`nameNormalized`昇順・id昇順で固定します。Admin一覧のFilter・Sortはこの章のQuery型だけを使用します。Admin商品の`minimum_price_*`は現在時刻のSaleを適用した会員割引前の最小単価を使います。

## 5. Product Aggregate契約

```typescript
type ProductAggregate = {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
};

type ProductVariantCreateCommand = {
  id: string;
  sku: string;
  optionValue: string | null;
  regularPrice: Yen;
  salePrice: Yen | null;
  saleStartAt: IsoDateTime | null;
  saleEndAt: IsoDateTime | null;
  purchaseLimit: number;
  initialStockQuantity: number;
};

type ProductVariantUpdateCommand = Omit<ProductVariantCreateCommand, "initialStockQuantity"> & {
  isActive: boolean;
  expectedVersion: number;
};

type ProductImageCommand = {
  id: string;
  assetId: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
};

type ProductEditableFields = Pick<
  Product,
  | "productCode"
  | "name"
  | "shortDescription"
  | "description"
  | "categoryId"
  | "brandId"
  | "requiredRank"
  | "variationName"
>;

type ProductAggregateCreateCommand = {
  productId: string;
  product: ProductEditableFields;
  variants: ProductVariantCreateCommand[];
  images: ProductImageCommand[];
  actorUserId: string;
  now: IsoDateTime;
};

type ProductAggregateUpdateCommand = {
  productId: string;
  productExpectedVersion: number;
  product: ProductEditableFields;
  createVariants: ProductVariantCreateCommand[];
  updateVariants: ProductVariantUpdateCommand[];
  removeVariantIds: string[];
  images: ProductImageCommand[];
  actorUserId: string;
  now: IsoDateTime;
};



type ProductVariantCreateRequest = Omit<ProductVariantCreateCommand, "id"> & { clientKey: string };
type ProductVariantUpdateRequest = Omit<ProductVariantUpdateCommand, "id"> & { variantId: string };
type ProductImageSelectionRequest = Omit<ProductImageCommand, "id"> & { relationshipId: string | null };

type CreateProductRequest = {
  product: ProductEditableFields;
  variants: ProductVariantCreateRequest[];
  images: ProductImageSelectionRequest[];
};

type UpdateProductRequest = {
  productId: string;
  productExpectedVersion: number;
  product: ProductEditableFields;
  createVariants: ProductVariantCreateRequest[];
  updateVariants: ProductVariantUpdateRequest[];
  removeVariantIds: string[];
  images: ProductImageSelectionRequest[];
};
type ProductDuplicateVariantDraft = Omit<
  ProductVariantCreateCommand,
  "id" | "sku" | "initialStockQuantity"
> & {
  sourceVariantId: string;
  sku: "";
  initialStockQuantity: 0;
};

type ProductDuplicateFormDto = {
  sourceProductId: string;
  product: Omit<ProductEditableFields, "productCode"> & { productCode: "" };
  variants: ProductDuplicateVariantDraft[]; // sourceのactive Variantだけ
  images: Array<Omit<ProductImageCommand, "id">>; // active Asset関連だけ
};


type VariantDeletionBlockers = {
  cartOrOrderOrReviewReference: boolean;
  nonInitialInventoryHistory: boolean;
};

```

- Image 0件はdraftだけ許可する。
- Image 1～3件の場合はPrimaryちょうど1件とする。
- 同一Productへ同じ`assetId`を複数関連付けない。
- active Variantの`optionScopeKey`はVariationなし`__SINGLE_ACTIVE__`または正規化済optionValue、inactive Variantは`__INACTIVE__:<variantId>`とし、旧SKUを無効化して同じ選択肢の新SKUを追加できるようにする。
- `deleteDraftAggregate()`は削除Transaction内で参照条件を再確認する。事前の`hasBlockingReference()`はUI案内専用である。
- PreviewはDBへ保存せず、未保存Aggregateと指定Rankから`ProductPreviewDto`を生成する。画像0件ではPlaceholderを表示するため`primaryImage`はnullを許可する。
- CreateはUse Caseが`productId`を生成し、`status=draft`、`publishedAt=null`で保存する。Create/Update Aggregateは`status`と`publishedAt`を受け取らず、公開状態の変更は`ChangeProductStatusUseCase`またはBulk版だけが行う。
- Updateは`productExpectedVersion`でProduct本体を楽観Lockし、SKU・画像関連と同一Transactionで更新する。
- Create/Update Use Caseは`Clock.now()`を1回だけ取得し、Commandの`now`をProduct、Variant、ProductImage、INITIAL_STOCK履歴の作成・更新時刻へ共通使用する。Create時は0件Review Summaryの作成にも同じ`now`を使用するが、Update時は既存Review Summaryを取得・更新しない。Repositoryは実時計を直接参照しない。

## 6. Inventory・Cart・Checkout契約

```typescript
type AdjustInventoryRequest = {
  variantId: string;
  changeQuantity: number;
  reasonCode: "MANUAL_INCREASE" | "MANUAL_DECREASE" | "CORRECTION";
  reasonText: string;
  expectedVersion: number;
};

type InventoryAdjustmentCommand = AdjustInventoryRequest & {
  historyId: string;
  actorUserId: string;
  now: IsoDateTime;
};

type InventorySort = "updated_desc" | "stock_asc" | "stock_desc" | "product_code_asc";
type InventorySearchQuery = {
  keyword: string | null;
  stockState: "all" | "low" | "out" | "available";
  activeState: "all" | "active" | "inactive";
  sort: InventorySort;
  page: PageNumber;
  pageSize: 20 | 50;
};

// stockState境界: low=1～5、out=0、available=1以上。
// availableはlowを含むがoutを含まない。

type InventoryItem = {
  variantId: string;
  productId: string;
  productCode: string;
  productName: string;
  sku: string;
  optionValue: string | null;
  stockQuantity: number;
  isActive: boolean;
  updatedAt: IsoDateTime;
  version: number;
};

type MergeGuestCartCommand = {
  guestId: string;
  userId: string;
  now: IsoDateTime;
};

type CartMergeItemResult = {
  variantId: string;
  addedQuantity: number;
  overflowQuantity: number;
  excludedReason: "NOT_FOUND" | "UNPUBLISHED" | "RANK_REQUIRED" | "INACTIVE" | "OUT_OF_STOCK" | null;
};

type CartMergeResult = {
  userCartId: string;
  items: CartMergeItemResult[];
  addedItemCount: number;
  excludedItemCount: number;
};

type StartOrResumeCheckoutCommand = {
  userId: string;
  cartId: string;
  cartVersion: number;
  now: IsoDateTime;
};


type CartMutationOwner =
  | { ownerType: "user"; userId: string }
  | { ownerType: "guest"; guestId: string };

type AddCartItemRequest = {
  variantId: string;
  addQuantity: number; // 既存明細があれば現在数量へ加算する
};

type AddCartItemCommand = AddCartItemRequest & {
  owner: CartMutationOwner; // Use CaseがSessionまたはGuestIdentityから解決する
  newCartId: string; // active Cartが存在しない場合だけ使用。Use Caseが生成する
  newItemId: string; // 新規明細の場合だけ使用。Use Caseが生成する
  now: IsoDateTime;
};

type UpdateCartItemQuantityRequest = {
  itemId: string;
  quantity: number; // 変更後の絶対数量。0はRemoveへ委譲する
  cartExpectedVersion: number;
  itemExpectedVersion: number;
};

type UpdateCartItemQuantityCommand = UpdateCartItemQuantityRequest & {
  cartId: string;
  now: IsoDateTime;
};

// Use CaseはSession/Guest Identityからownerを解決し、newCartId/newItemIdを生成する。
// AddはCart VersionをPresentationへ要求せず、Repositoryがactive Cartの取得または作成と既存明細の加算/新規作成を同一Txで行う。
// Presentationはowner、newCartId、newItemId、nowを指定しない。数量変更・削除は表示済みCartへの置換操作なので既存どおりVersionを要求する。
type RemoveCartItemRequest = {
  itemId: string;
  cartExpectedVersion: number;
  itemExpectedVersion: number;
};

type RemoveCartItemCommand = RemoveCartItemRequest & {
  cartId: string;
  now: IsoDateTime;
};

type AcceptPriceChangesRequest = {
  itemExpectedVersions: Record<string, number>;
  cartExpectedVersion: number;
};

type AcceptPriceChangesCommand = AcceptPriceChangesRequest & {
  cartId: string;
  now: IsoDateTime;
};

type CheckoutStartResult = {
  session: CheckoutSession;
  result: "created" | "resumed" | "replaced";
};

type StartCheckoutRequest = { cartVersion: number };

type SetCheckoutAddressRequest = {
  checkoutSessionId: string;
  checkoutExpectedVersion: number;
  address: ShippingAddressSnapshot;
};

type SetCheckoutAddressCommand = SetCheckoutAddressRequest & { userId: string; now: IsoDateTime };

type SetCheckoutPaymentRequest = {
  checkoutSessionId: string;
  checkoutExpectedVersion: number;
  paymentMethodCode: PaymentMethodCode;
};

type SetCheckoutPaymentCommand = SetCheckoutPaymentRequest & { userId: string; now: IsoDateTime };

type CheckoutConfirmationDto = {
  checkoutSessionId: string;
  checkoutActionVersion: number; // 注文確定操作用。画面表示は不要
  cartVersion: number;
  items: Array<{
    variantId: string;
    productName: string;
    sku: string;
    optionValue: string | null;
    quantity: number;
    unitEffectivePrice: Yen;
    unitDiscountAmount: Yen;
    viewerUnitPrice: Yen;
    lineSubtotalAmount: Yen;
    lineDiscountAmount: Yen;
    lineTotalAmount: Yen;
    image: ImageSnapshotDto;
  }>;
  address: ShippingAddressSnapshot;
  paymentMethodCode: PaymentMethodCode;
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  totalAmount: Yen;
  membershipRank: MembershipRank;
};

type CartLineIssueCode =
  | "UNPUBLISHED"
  | "RANK_REQUIRED"
  | "INACTIVE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "PRICE_CHANGED";

type CartLineDto = {
  itemId: string;
  itemVersion: number;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  optionValue: string | null;
  image: ImageSnapshotDto;
  quantity: number;
  maximumQuantity: number;
  unitEffectivePriceAtAdd: Yen;
  currentUnitEffectivePrice: Yen; // Sale適用後・会員割引前
  currentViewerUnitPrice: Yen; // 現在Rank適用後
  lineSubtotalAmount: Yen;
  lineDiscountAmount: Yen;
  lineTotalAmount: Yen;
  issues: CartLineIssueCode[];
};

type CartDto = {
  cartId: string;
  cartVersion: number;
  membershipRank: MembershipRank | null;
  items: CartLineDto[];
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  totalAmount: Yen;
  freeShippingRemainingAmount: Yen;
  blockingIssues: CartLineIssueCode[];
};
```

CartDtoはPresentation向けRead DTOであり、UIがCartItem、Product、Variant、Imageを個別取得して結合しません。`items`はCart ItemのcreatedAt昇順、同値itemId昇順で返し、CheckoutConfirmationDtoも同じ順序を使用します。

## 7. Order・Payment契約

```typescript
type OrderSort = "created_desc" | "created_asc" | "total_asc" | "total_desc";
type OrderSearchQuery = {
  keyword: string | null; // 注文番号、購入者Email、商品名
  statuses: OrderStatus[];
  createdFrom: IsoDateTime | null;
  createdTo: IsoDateTime | null;
  userId: string | null;
  sort: OrderSort;
  page: PageNumber;
  pageSize: 20 | 50;
};

type MyOrderSearchQuery = Omit<OrderSearchQuery, "keyword" | "userId" | "pageSize"> & {
  pageSize: 20;
};

type GetOrderDetailRequest = {
  orderId: string;
};

type ChargeInput = {
  orderId: string;
  amount: Yen;
  methodCode: "TEST-SUCCESS" | "TEST-DECLINED" | "TEST-INSUFFICIENT" | "TEST-AUTH-FAILED";
  gatewayIdempotencyKey: string;
};

type ChargeResult =
  | { status: "succeeded" }
  | { status: "failed"; errorCode: "DECLINED" | "INSUFFICIENT" | "AUTH_FAILED" };

type CreateOrderForPaymentRequest = {
  checkoutSessionId: string;
  checkoutActionVersion: number;
};

type CreateOrderForPaymentCommand = CreateOrderForPaymentRequest & {
  now: IsoDateTime;
  assetPathByAssetId: Record<string, string>;
};

type FinalizePaymentResultCommand = {
  orderId: string;
  paymentId: string;
  orderExpectedVersion: number;
  paymentExpectedVersion: number;
  result: ChargeResult;
  now: IsoDateTime; // Gateway結果受領後にApplication Clockから1回だけ取得する処理日時
};

type RetryPaymentRequest = {
  orderId: string;
  orderActionVersion: number;
  methodCode: PaymentMethodCode;
};

type RetryPaymentCommand = RetryPaymentRequest & { now: IsoDateTime };

type ResumeProcessingPaymentRequest = {
  orderId: string;
};

type ResumeProcessingPaymentCommand = ResumeProcessingPaymentRequest & { userId: string; now: IsoDateTime };

type ResumeProcessingPaymentResult = OrderResultDto;

type StartOrderPreparationRequest = {
  orderId: string;
  orderActionVersion: number;
};

type StartOrderPreparationCommand = StartOrderPreparationRequest & { actorUserId: string; now: IsoDateTime };

type ShipOrderRequest = StartOrderPreparationRequest & {
  carrierName: string;
  trackingNumber: string;
};

type ShipOrderCommand = ShipOrderRequest & { actorUserId: string; now: IsoDateTime };

type CompleteDeliveryRequest = StartOrderPreparationRequest;
type CompleteDeliveryCommand = CompleteDeliveryRequest & { actorUserId: string; now: IsoDateTime };

```

```typescript
type OrderListItem = {
  orderId: string;
  orderNumber: string;
  createdAt: IsoDateTime;
  totalAmount: Yen;
  status: OrderStatus;
  representativeImage: ImageSnapshotDto;
};

type AdminOrderListItem = OrderListItem & {
  userId: string;
  userEmail: string;
  itemCount: number;
};

type OrderProcessingDto = {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  paymentStatus: "processing";
};

type OrderResultDto = {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  totalAmount: Yen;
};

type OrderItemDto = {
  orderItemId: string;
  lineNumber: number;
  productId: string;
  variantId: string;
  productCode: string;
  productName: string;
  sku: string;
  variationName: string | null;
  optionValue: string | null;
  unitEffectivePrice: Yen;
  unitDiscountAmount: Yen;
  unitFinalPrice: Yen;
  quantity: number;
  lineSubtotalAmount: Yen;
  lineDiscountAmount: Yen;
  lineTotalAmount: Yen;
  image: ImageSnapshotDto;
};

type PaymentAttemptDto = {
  attemptNumber: number;
  methodCode: PaymentMethodCode;
  status: PaymentStatus;
  errorDisplayKey: string | null;
  createdAt: IsoDateTime;
  processedAt: IsoDateTime | null;
};

type ShipmentDto = {
  status: ShipmentStatus;
  carrierName: string | null;
  trackingNumber: string | null;
  shippedAt: IsoDateTime | null;
  deliveredAt: IsoDateTime | null;
};

type OrderTimelineItemDto = {
  status: OrderStatus;
  displayKey: string;
  createdAt: IsoDateTime;
};

type OrderDetailDto = OrderResultDto & {
  orderActionVersion: number; // 状態変更・再支払い操作用。画面表示は不要
  createdAt: IsoDateTime;
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  membershipRankSnapshot: MembershipRank;
  shippingAddress: ShippingAddressSnapshot;
  items: OrderItemDto[];
  paymentAttempts: PaymentAttemptDto[];
  shipment: ShipmentDto | null;
  timeline: OrderTimelineItemDto[];
};

type AdminOrderDetailDto = OrderDetailDto & {
  customer: {
    userId: string;
    email: string;
    displayName: string;
  };
};
```

送料はOrderの`shippingAmount`へ保存します。会員割引はSKU単価ごとに切り捨て、Order Itemへ`unitDiscountAmount`・`lineDiscountAmount`をSnapshot保存し、Orderの`discountAmount`は全Order Itemの`lineDiscountAmount`合計と一致させます。

`CreateOrderForPaymentUseCase`はOrder作成Transaction内で、Cart Itemの`unitEffectivePriceAtAdd`と現在時刻・現在の商品/SKUから再計算したSale適用後・会員割引前単価を比較します。1件でも異なる場合は`PRICE_CHANGED`を返し、Order/Paymentを作成せずCartをactiveのまま保持します。価格確定時はSKU単価ごとに割引額を切り捨て、明細割引合計をOrderの割引額とします。

`PaymentGateway.charge()`は成功・失敗だけを返します。Gateway結果受領後、Applicationが`Clock.now()`を1回取得して`FinalizePaymentResultCommand.now`へ設定し、その値をPaymentの`processedAt`、Order/Payment Historyの`createdAt`へ共通使用します。

注文作成前にApplicationはBuild生成Manifest Moduleから各Primary画像のPathだけを解決し、`assetPathByAssetId`として内部Commandへ設定します。`create-order` Transaction内では現在のProductImageの`assetId`とPath Mapを照合し、Alt TextはProductImage関係から取得してOrder ItemへSnapshotします。

## 8. Review・Test契約

```typescript
type ReviewListQuery = {
  sort: "newest" | "rating_desc" | "rating_asc";
  page: PageNumber;
  pageSize: 20;
};

type ReviewSearchQuery = {
  keyword: string | null;
  statuses: ReviewStatus[];
  ratings: Array<1 | 2 | 3 | 4 | 5>;
  productId: string | null;
  sort: "created_desc" | "rating_desc" | "rating_asc" | "status_asc";
  page: PageNumber;
  pageSize: 20 | 50;
};



type ReviewListItem = {
  reviewId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  displayName: string;
  createdAt: IsoDateTime;
};

type AdminReviewListItem = ReviewListItem & {
  productId: string;
  productName: string;
  userId: string;
  userEmail: string;
  status: ReviewStatus;
  version: number;
};

type AdminOverview = {
  ordersAwaitingPreparationCount: number;
  lowStockSkuCount: number; // active SKUのうち在庫1～5。0は含めない
  hiddenReviewCount: number;
  recentOrders: AdminOrderListItem[];
};

type ReviewEligibilityRequest = {
  orderItemId: string;
};

type ReviewEligibilityDto = {
  orderItemId: string;
  eligible: boolean;
  reason: "ORDER_NOT_DELIVERED" | "NOT_OWNER" | "ALREADY_REVIEWED" | "REVIEW_DELETED" | null;
  existingReview: ReviewResultDto | null;
};

type CreateReviewRequest = {
  orderItemId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
};

type UpdateReviewRequest = {
  reviewId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  expectedVersion: number;
};

type DeleteReviewRequest = {
  reviewId: string;
  expectedVersion: number;
};

type ChangeReviewVisibilityRequest = {
  reviewId: string;
  targetStatus: "published" | "hidden";
  expectedVersion: number;
};

type ChangeReviewVisibilityCommand = ChangeReviewVisibilityRequest & { actorUserId: string; now: IsoDateTime };

type ReviewResultDto = {
  reviewId: string;
  orderItemId: string;
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  status: ReviewStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
};

type AdminReviewDetailDto = AdminReviewListItem & {
  orderItemId: string;
  histories: ReviewStatusHistory[];
};

type BulkItemResult = {
  targetId: string;
  success: boolean;
  error?: ApplicationError;
};

type BulkActionResult = {
  succeededCount: number;
  failedCount: number;
  results: BulkItemResult[];
};

type ChangeProductStatusRequest = {
  productId: string;
  targetStatus: "published" | "unpublished" | "discontinued";
  expectedVersion: number;
};
type ChangeProductStatusCommand = ChangeProductStatusRequest & { actorUserId: string; now: IsoDateTime };

type BulkChangeProductStatusRequest = {
  targetIds: string[];
  expectedVersions: Record<string, number>;
  targetStatus: "published" | "unpublished";
};

type BulkChangeReviewVisibilityRequest = {
  targetIds: string[];
  expectedVersions: Record<string, number>;
  targetStatus: "published" | "hidden";
};

type ProductPreviewRequest = {
  aggregate: CreateProductRequest | UpdateProductRequest;
  previewMembershipRank: MembershipRank | null; // nullはGuest表示
};

type ProductPreviewDto = Omit<ProductDetail, "primaryImage"> & {
  primaryImage: ImageSnapshotDto | null;
  publishabilityIssues: ApplicationError[];
};

type ProductEditDto = ProductAggregate & {
  categoryOptions: Array<{ id: string; name: string }>;
  brandOptions: Array<{ id: string; name: string }>;
  selectedImages: Array<ProductImageDto & { assetActive: boolean; defaultAltText: string }>;
};

type CreateCategoryRequest = { name: string };
type CreateCategoryCommand = CreateCategoryRequest & { categoryId: string; actorUserId: string; now: IsoDateTime };
type UpdateCategoryRequest = { categoryId: string; name: string; expectedVersion: number };
type UpdateCategoryCommand = UpdateCategoryRequest & { actorUserId: string; now: IsoDateTime };
type ChangeCategoryActiveStateRequest = { categoryId: string; targetIsActive: boolean; expectedVersion: number };
type ChangeCategoryActiveStateCommand = ChangeCategoryActiveStateRequest & { actorUserId: string; now: IsoDateTime };

type CreateBrandRequest = { name: string };
type CreateBrandCommand = CreateBrandRequest & { brandId: string; actorUserId: string; now: IsoDateTime };
type UpdateBrandRequest = { brandId: string; name: string; expectedVersion: number };
type UpdateBrandCommand = UpdateBrandRequest & { actorUserId: string; now: IsoDateTime };
type ChangeBrandActiveStateRequest = { brandId: string; targetIsActive: boolean; expectedVersion: number };
type ChangeBrandActiveStateCommand = ChangeBrandActiveStateRequest & { actorUserId: string; now: IsoDateTime };

type ReorderCategoriesRequest = {
  orderedIds: string[];
  expectedVersions: Record<string, number>;
};

type ReorderCategoriesCommand = ReorderCategoriesRequest & { actorUserId: string; now: IsoDateTime };

// Category並べ替えは全Category IDと一致することを検証し、配列順に10、20、30…で再採番する。BrandはnameNormalized昇順固定で並べ替え機能を持たない。

// Category/BrandのCreateはisActive=trueで生成する。Category Createは0件ならsortOrder=10、既存があればmax(sortOrder)+10とし、最大値取得と作成をRepository内の同一Transactionで行う。
// Category名称・表示順、Brand名称の更新入力はisActiveを含まず、有効/無効は専用Use Caseだけが変更する。
// Category/Brand再有効化時は名称一意性を同一Transactionで再検証する。

type TestMetadata = {
  appVersion: string;
  schemaVersion: number;
  seedVersion: number;
  buildSha: string;
  scenario: string;
  clock: IsoDateTime | null;
  paymentDelayMs: number;
};

type OrderInspection = {
  orderId: string;
  orderStatus: OrderStatus;
  latestPaymentStatus: PaymentStatus;
  shipmentStatus: ShipmentStatus | null;
  cartStatus: CartStatus;
  checkoutStatus: CheckoutStatus;
};

type VariantInspection = { variantId: string; stockQuantity: number; historyCount: number };
type ReviewSummaryInspection = ProductReviewSummaryDto;
```

Automation BuildのInspection APIは上記固定DTOだけを返し、任意Table・任意Queryを提供しません。

### Queryの決定的Sort規則

| Query | 主Sort | 同値時の最終Key |
|---|---|---|
| Storefront商品 new | publishedAt desc | productCode asc |
| Storefront商品 price/rating | 選択した価格またはrating | productCode asc |
| Search Suggestion | product、category、brandのGroup順、labelNormalized asc | id asc |
| Admin商品 | 選択したField | productCode asc |
| Category / Brand | 選択したField | id asc |
| 在庫 | 選択したField | sku asc |
| 注文 | 選択したField | orderNumber asc |
| User | 選択したField | userId asc |
| Review | 選択したField | reviewId asc |

Homeは主要Category最大6件、新着最大8件、Sale最大8件を返します。Sale 0件では空配列を返し、UIがSectionを非表示にします。

## 9. Core Use Case契約

| Use Case | Input | Output | 主なError | 成功後 |
|---|---|---|---|---|
| RegisterUser | RegisterUserRequest | LoginResult | VALIDATION、EMAIL_ALREADY_EXISTS、STORAGE_WRITE_FAILED | HomeまたはLogin前遷移先 |
| Login | LoginRequest | LoginResult | AUTHENTICATION_FAILED、ACCOUNT_SUSPENDED、ACCOUNT_WITHDRAWN、STORAGE_WRITE_FAILED | Login前遷移先 |
| Logout | なし | void | STORAGE_WRITE_FAILED | Home |
| GetCurrentUser | なし | CurrentUserDto | AUTHENTICATION_REQUIRED、ACCOUNT_SUSPENDED | 現在画面 |
| UpdateProfile | UpdateProfileRequest | CurrentUserDto | VALIDATION、CONFLICT | Account。`actionVersion`を更新結果へ含める |
| ListAddresses | なし | UserAddress[] | AUTHENTICATION_REQUIRED、STORAGE_READ_FAILED | Address一覧表示 |
| Create/Update/DeleteAddress | CreateAddressRequest / UpdateAddressRequest / DeleteAddressRequest | UserAddress / void | VALIDATION、CONFLICT、NOT_FOUND | Address一覧 |
| SuggestAddressByPostalCode | `{ postalCode: string }` | AddressSuggestion / null | VALIDATION | 配送先Form候補 |
| GetHomeCatalog | なし | HomeCatalogDto | STORAGE_READ_FAILED | Home表示 |
| SearchProductSuggestions | SearchSuggestionRequest | SearchSuggestion[] | VALIDATION、STORAGE_READ_FAILED | Combobox候補表示 |
| SearchProducts | ProductSearchRequest | ProductSearchResult | VALIDATION、STORAGE_READ_FAILED | URL Queryを正規化して一覧表示 |
| GetProductDetail | `{ productId }` | ProductDetail | NOT_FOUND、PERMISSION_DENIED | 商品詳細表示 |
| ListProductReviews | ProductReviewsQuery | Page<ReviewListItem> | NOT_FOUND、STORAGE_READ_FAILED | 商品詳細Review一覧 |
| ListImageAssets | ImageAssetSearchRequest | Page<ImageAssetListItem> | PERMISSION_DENIED、IMAGE_ASSET_NOT_FOUND | 商品編集画像選択 |
| SearchAdminProducts/GetProductForAdmin | AdminProductSearchRequest / `{ productId }` | Page<AdminProductListItem> / ProductEditDto | PERMISSION_DENIED、NOT_FOUND | Use CaseがClock時刻を内部Queryへ補完して商品一覧または編集を表示 |
| PrepareProductDuplicate | `{ sourceProductId }` | ProductDuplicateFormDto | NOT_FOUND、IMAGE_ASSET_NOT_FOUND | 商品新規登録Form。DB更新なし |
| Create/UpdateProductAggregate | CreateProductRequest / UpdateProductRequest | ProductAggregate | VALIDATION、CONFLICT、IMAGE_ASSET_NOT_FOUND、IMAGE_ASSET_INACTIVE、VARIANT_HAS_REFERENCE | 保存済み商品編集 |
| PreviewProduct | ProductPreviewRequest | ProductPreviewDto | VALIDATION、IMAGE_ASSET_NOT_FOUND | 編集画面内Dialog |
| DeleteDraftProduct | `{ productId; expectedVersion }` | void | CONFLICT、PRODUCT_HAS_REFERENCE、INVALID_STATE | 商品一覧 |
| ChangeProductStatus | ChangeProductStatusRequest | Product | VALIDATION、CONFLICT、INVALID_STATE | 商品編集または一覧 |
| BulkChangeProductStatus | BulkChangeProductStatusRequest | BulkActionResult | PERMISSION_DENIED | 一覧に部分成功結果 |
| Create/Update/ReorderCategory | CreateCategoryRequest / UpdateCategoryRequest / ReorderCategoriesRequest | CategoryAdminListItem / CategoryAdminListItem[] | VALIDATION、CONFLICT、INVALID_STATE | Category一覧 |
| ChangeCategoryActiveState | ChangeCategoryActiveStateRequest | CategoryAdminListItem | CONFLICT、INVALID_STATE | Category一覧 |
| Create/UpdateBrand | CreateBrandRequest / UpdateBrandRequest | BrandAdminListItem | VALIDATION、CONFLICT、INVALID_STATE | Brand一覧 |
| ChangeBrandActiveState | ChangeBrandActiveStateRequest | BrandAdminListItem | CONFLICT、INVALID_STATE | Brand一覧 |
| SearchAdminCategories | CategoryAdminSearchQuery | Page<CategoryAdminListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | Category一覧 |
| SearchAdminBrands | BrandAdminSearchQuery | Page<BrandAdminListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | Brand一覧 |
| GetCart | なし | CartDto | PERMISSION_DENIED、STORAGE_READ_FAILED | Cart表示 |
| Add/Update/RemoveCartItem | AddCartItemRequest / UpdateCartItemQuantityRequest / RemoveCartItemRequest | CartDto | PERMISSION_DENIED、OUT_OF_STOCK、QUANTITY_LIMIT_EXCEEDED、CONFLICT | Cartまたは元画面 |
| AcceptCartPriceChanges | AcceptPriceChangesRequest | CartDto | PRICE_CHANGED、CONFLICT | Cart再計算 |
| MergeGuestCart | なし（Login/Register内部） | CartMergeResult | STORAGE_WRITE_FAILED | 統合結果表示 |
| StartCheckout | StartCheckoutRequest | CheckoutStartResult | PERMISSION_DENIED、CART_VERSION_CHANGED、PRICE_CHANGED、OUT_OF_STOCK | `/checkout/address`または保存済みStep |
| SetCheckoutAddress | SetCheckoutAddressRequest | CheckoutSession | VALIDATION、CONFLICT、CHECKOUT_EXPIRED | `/checkout/payment` |
| SetCheckoutPayment | SetCheckoutPaymentRequest | CheckoutSession | VALIDATION、CONFLICT、CHECKOUT_EXPIRED | `/checkout/confirm` |
| GetCheckoutConfirmation | `{ checkoutSessionId }` | CheckoutConfirmationDto | CART_VERSION_CHANGED、PRICE_CHANGED、OUT_OF_STOCK、CHECKOUT_EXPIRED | 確認画面表示 |
| CreateOrderForPayment | CreateOrderForPaymentRequest | OrderProcessingDto | CONFLICT、CART_VERSION_CHANGED、PRICE_CHANGED、OUT_OF_STOCK | `/checkout/processing?orderId=...` |
| FinalizePaymentResult | 内部Command | OrderResultDto | CONFLICT、OUT_OF_STOCK、STORAGE_WRITE_FAILED | completeまたはfailed |
| ResumeProcessingPayment | ResumeProcessingPaymentRequest | ResumeProcessingPaymentResult | NOT_FOUND、PERMISSION_DENIED、INVALID_STATE、STORAGE_WRITE_FAILED | completeまたはfailed |
| RetryPayment | RetryPaymentRequest | OrderProcessingDto | INVALID_STATE、CONFLICT | processing |
| ListMyOrders | MyOrderSearchQuery | Page<OrderListItem> | AUTHENTICATION_REQUIRED、STORAGE_READ_FAILED | 注文一覧 |
| GetOrderDetail | GetOrderDetailRequest | OrderDetailDto | NOT_FOUND、PERMISSION_DENIED | 顧客注文詳細 |
| GetAdminOrderDetail | GetOrderDetailRequest | AdminOrderDetailDto | NOT_FOUND、PERMISSION_DENIED | 管理注文詳細 |
| SearchAdminOrders | OrderSearchQuery | Page<AdminOrderListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | 管理注文一覧 |
| Start/Ship/CompleteOrder | StartOrderPreparationRequest / ShipOrderRequest / CompleteDeliveryRequest | AdminOrderDetailDto | INVALID_STATE、CONFLICT、VALIDATION | 管理Order詳細。更新後の`orderActionVersion`を返す |
| GetReviewEligibility | ReviewEligibilityRequest | ReviewEligibilityDto | NOT_FOUND、PERMISSION_DENIED | Review入力可否 |
| Create/Update/DeleteReview | CreateReviewRequest / UpdateReviewRequest / DeleteReviewRequest | ReviewResultDto | NOT_ELIGIBLE、CONFLICT、VALIDATION | Reviewまたは商品詳細 |
| SearchAdminReviews | ReviewSearchQuery | Page<AdminReviewListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | Review管理一覧 |
| ChangeReviewVisibility | ChangeReviewVisibilityRequest | AdminReviewDetailDto | PERMISSION_DENIED、CONFLICT、INVALID_STATE | Review管理詳細 |
| BulkChangeReviewVisibility | BulkChangeReviewVisibilityRequest | BulkActionResult | PERMISSION_DENIED | 一覧に部分成功結果 |
| GetAdminOverview | なし | AdminOverview | PERMISSION_DENIED、STORAGE_READ_FAILED | 管理Overview |
| SearchInventories | InventorySearchQuery | Page<InventoryItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | 在庫一覧 |
| AdjustInventory | AdjustInventoryRequest | InventoryItem | PERMISSION_DENIED、VALIDATION、CONFLICT、INSUFFICIENT_STOCK | 在庫一覧・履歴 |
| SearchAdminUsers/GetUserForAdmin | UserSearchQuery / `{ userId }` | Page<UserAdminListItem> / UserAdminDto | PERMISSION_DENIED、NOT_FOUND | User一覧または詳細 |
| ChangeMembershipRank | ChangeMembershipRankRequest | UserAdminDto | PERMISSION_DENIED、CONFLICT、INVALID_ROLE | User詳細。active Checkoutは破棄 |
| ChangeOperatorAdminRole | ChangeOperatorAdminRoleRequest | UserAdminDto | LAST_ADMIN_PROTECTED、SELF_CHANGE_FORBIDDEN、CONFLICT | User詳細。Session無効化 |
| ChangeAccountSuspension | ChangeAccountSuspensionRequest | UserAdminDto | LAST_ADMIN_PROTECTED、SELF_CHANGE_FORBIDDEN、CONFLICT | User詳細。Session無効化、customer停止時はCheckout破棄 |
| ResetDatabase | `{ scenario: string }` | TestMetadata | PERMISSION_DENIED、VALIDATION、RESET_BLOCKED_BY_OPEN_PAGE、STORAGE_WRITE_FAILED | Home。SessionとGuest IdentityをSeed状態へ再設定 |
| SetTestClock | `{ iso: IsoDateTime \| null }` | TestMetadata | PERMISSION_DENIED、VALIDATION | Test Control |
| SetPaymentDelay | `{ milliseconds: number }` | TestMetadata | PERMISSION_DENIED、VALIDATION | Test Control |
| GetTestMetadata | なし | TestMetadata | PERMISSION_DENIED | Test ControlまたはE2E |
| InspectOrder/Variant/ReviewSummary | 固定Entity ID | OrderInspection / VariantInspection / ReviewSummaryInspection | PERMISSION_DENIED、NOT_FOUND | E2EのRead-only確認 |

すべてのUse Caseは失敗時に`ApplicationError`へ変換し、内部ExceptionをPresentationへ渡しません。成功後のRouteは`screen_list.md`と`user_flows.md`を最終正本とします。
