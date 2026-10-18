# アプリケーション・DTO契約

本書は、フェーズ1におけるアプリケーションおよびDTO（データ転送オブジェクト）契約の意味、責務、設計理由、利用方法を説明するドキュメントです。エンティティの説明は`data_model.md`および`domain_types.md`、リポジトリの責務は`repository_interfaces.md`、業務ルールは`business_rules.md`を参照してください。

## 正本・説明責務（D-026）

- 実装開始後におけるTypeScriptの`type`、`interface`、`union`、`enum`相当の型、およびDexieのスキーマ、バージョン、テーブル定義は、実装コードをSSOT（信頼できる唯一の情報源）とします。
- 本書は、各型の意味、責務、設計理由、利用上の契約を説明するためのドキュメントであり、コードと同一の型定義一覧を機械的に正本化するものではありません。

## 1. 共通型

`EntityId`、`IsoDateTime`、`Yen`は`domain_types.md`からインポートします。

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

金額、数量、在庫数、ページ番号、バージョン番号は、アプリケーションの入力境界で整数として検証します。メールアドレスはトリム、Unicode NFKC、ロケール非依存の小文字化の順で正規化し、保存、検索、一意性の判定に同一の値を使用します。productCodeおよびSKUは、トリム、NFKC、ASCII大文字化を行った上で`[A-Z0-9_-]+`による検証を実施し、正規化した値をそのまま保存します。UI、Zodスキーマ、ユースケースは`INPUT_LIMITS`を共通利用します。

クエリ共通規約：ページ番号は1から開始し、空の配列フィルターは「全件対象」、`null`のキーワードは「未指定」、日時範囲は`from`を含み（以上）`to`を含まない（未満）ものとします。ソート値が同一の場合は、各正本で定義した安定ソートキーを追加して順序を決定します。検索文字列は、トリム、Unicode NFKC、ロケール非依存の小文字化、連続する空白の1文字化を共通の`SearchTextNormalizer`で行い、空文字列は`null`へ変換します。

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

### ログイン時のロール分岐

- `active`な`customer`の場合：セッション作成とゲストカートの統合を同一トランザクション内で実行します。
- `active`な`operator`または`admin`の場合：セッションのみを作成し、ゲストカートの参照や変更は行いません。`LoginResult.cartMerge`は`null`とします。
- `suspended`または`withdrawn`の場合：セッション作成前に処理を拒否します。
- operatorやadminが通常のストアフロントを閲覧する場合、`CurrentActorResolver.getViewer()`は`{ kind: "guest" }`を返します。管理者プレビューでのみ、管理者権限によって非公開商品を確認できます。

### 入力の信頼境界

プレゼンテーション層は`*Request`のみを生成します。現在のユーザー、ロール、会員ランク、操作者ユーザーID、ゲストID、時計（Clock）から取得する現在時刻、新規生成対象のエンティティID、画像マニフェストの解決値などは、ユースケースが依存ポートから解決した上で`*Command`へと変換します。ルートの対象を示す既存のエンティティIDや、プレゼンテーションDTOから取得した`actionVersion`はリクエストに含めて構いませんが、ユースケース側で所有権や実行権限を再検証した上で、リポジトリ更新時の`expectedVersion`へ変換します。

### PasswordHasherポート

```typescript
interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encodedHash: string): Promise<boolean>;
}
```

保存形式は以下に固定します。

```text
pbkdf2-sha256$210000$<saltBase64>$<hashBase64>
```

- Web Crypto APIのPBKDF2（SHA-256）を使用します。
- ソルトはユーザーごとに`crypto.getRandomValues()`を用いて16バイト生成します。
- 派生キーの長さは32バイトとします。
- ソルトおよび派生キーの文字列表現には、RFC 4648準拠の標準Base64（パディングあり）を使用します。
- パスワードはUTF-8として処理します。
- ハッシュ値の照合には、全バイトを検証する一定時間比較（タイミング攻撃対策）関数を使用します。
- シードユーザーのハッシュ値は、ビルド時に`SHA-256("scenario-shop-seed:" + userId)`の先頭16バイトをソルトとして生成します。ランタイムにおいて平文パスワードをデータベースに保存することはありません。
- なお本方式は、ローカル環境における疑似認証の実装を統一することを目的としており、本番相当の堅牢な認証境界として扱うものではありません。

## 3. ストアフロント クエリ・DTO

`ProductViewer`は、ストアフロントのクエリおよびDTOで利用するアプリケーション層所有の契約（Application-owned contract）です。ドメインポリシーにこのアプリケーション型を直接渡すことはせず、インフラ層のリポジトリ呼び出し側が商品閲覧判定に必要な`MembershipRank | null`へと変換して渡します。ポートの所有権およびドメイン層の依存関係の詳細についてはADR-0027を参照してください。

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

// カタログ系のユースケースはClock.now()を1回取得し、すべてのカタログクエリに同一のnowを渡す。リポジトリは実時計を直接参照しない。

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

## 4. 管理者 クエリ・DTO

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

// 管理商品一覧はactiveなSKUの在庫合計activeTotalStockで判定する。
// stockStateの判定境界：in_stock=1以上、low_stock=1〜5、out_of_stock=0。
// low_stockとout_of_stockは重複させず、SKU単位の判定は在庫一覧クエリで扱う。

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

カテゴリーおよびブランドの絞り込み、ソート、ページネーションもリポジトリ側で実行し、UI側で全件取得した後に独自のページング処理を行うことはしません。カテゴリーのみが手動の表示順を持ち、ブランドは`nameNormalized`昇順およびid昇順で固定されます。管理画面一覧での絞り込みやソートには、本章で定義されたクエリ型のみを使用します。管理画面の商品一覧における`minimum_price_*`には、現在時刻のセール価格を適用した会員割引前の最小単価を使用します。

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

- 画像が0件の状態は、下書き（draft）状態の場合にのみ許可します。
- 画像が1〜3件の場合は、主画像（Primary）が必ず1件だけ存在するようにします。
- 同一商品に対して同一の`assetId`を重複して関連付けることはできません。
- activeなバリアントの`optionScopeKey`は、バリエーションなしの場合は`__SINGLE_ACTIVE__`、バリエーションありの場合は正規化済みの`optionValue`とします。inactiveなバリアントは`__INACTIVE__:<variantId>`とすることで、旧SKUを無効化しつつ同一の選択肢を持つ新SKUを追加できるようにします。
- `deleteDraftAggregate()`は、削除トランザクションの内部で参照整合性条件を再確認します。事前に呼び出す`hasBlockingReference()`はUIの案内表示専用です。
- プレビュー機能はデータベースへの保存を行わず、未保存のアグリゲートと指定された会員ランクから`ProductPreviewDto`を生成します。画像が0件の場合はプレースホルダーを表示するため、`primaryImage`には`null`を許可します。
- 新規作成時（Create）は、ユースケースが`productId`を採番し、`status=draft`、`publishedAt=null`として保存します。アグリゲートの作成・更新コマンドは`status`や`publishedAt`を受け取らず、公開状態の変更は`ChangeProductStatusUseCase`またはその一括処理（Bulk）版のみが行います。
- 更新時（Update）は、`productExpectedVersion`を用いて商品本体を楽観的ロックし、SKUや画像との関連付けと同一トランザクション内で更新します。
- 商品作成・更新のユースケースは`Clock.now()`を1回のみ取得し、コマンドに含まれる`now`の値を商品、バリアント、商品画像、および`INITIAL_STOCK`履歴の作成・更新日時として共通利用します。新規作成時は0件のレビューサマリー（Review Summary）作成にも同一の`now`を使用しますが、更新時には既存のレビューサマリーの取得や更新は行いません。リポジトリが実時計を直接参照することはありません。

## 6. 在庫・カート・チェックアウト契約

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

// stockStateの判定境界：low=1〜5、out=0、available=1以上。
// availableはlowを含みますがoutは含みません。

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

// ユースケースはセッションまたはゲスト識別子からownerを解決し、newCartIdおよびnewItemIdを生成します。
// カート追加操作ではプレゼンテーション層にカートバージョンを要求せず、リポジトリ側でアクティブなカートの取得または作成と、既存明細への加算または新規明細作成を同一トランザクション内で実行します。
// プレゼンテーション層はowner、newCartId、newItemId、nowを指定しません。一方、数量変更や削除は表示済みカートに対する差分・置換操作であるため、従来どおりバージョン番号を要求します。
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

`CartDto`はプレゼンテーション層向けの読み取り専用DTOであり、UI側がカート明細、商品、バリアント、画像を個別に取得して結合するような処理は行いません。`items`はカート明細の`createdAt`昇順、同一日時の場合は`itemId`昇順で返却され、`CheckoutConfirmationDto`においても同一の並び順が適用されます。

## 7. 注文・決済契約

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
  userId: string;
  orderId: string;
  paymentId: string;
  orderItemIds: string[];
  orderStatusHistoryId: string;
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

配送料は注文（Order）の`shippingAmount`に保存します。会員割引はSKUの単価ごとに端数を切り捨て、注文明細（Order Item）に`unitDiscountAmount`および`lineDiscountAmount`としてスナップショット保存します。注文全体の`discountAmount`は、全注文明細の`lineDiscountAmount`の合計値と一致させます。

`CreateOrderForPaymentUseCase`は、注文作成トランザクションの内部で、カート明細の追加時有効単価（`unitEffectivePriceAtAdd`）と、現在時刻および最新の商品・SKU情報から再計算したセール適用後・会員割引前の単価を比較します。1件でも価格の不一致がある場合は`PRICE_CHANGED`エラーを返却し、注文や支払いは作成せずにカートをアクティブな状態のまま保持します。価格が確定した際は、SKU単価ごとに割引額を切り捨て計算し、明細ごとの割引合計額を注文全体の割引額とします。

`PaymentGateway.charge()`は決済の成功または失敗のみを返却します。決済ゲートウェイからの結果受領後、アプリケーション側で`Clock.now()`を1回取得して`FinalizePaymentResultCommand.now`に設定し、その値を支払いの`processedAt`、ならびに注文履歴・支払い履歴の`createdAt`として共通利用します。

注文を作成する前に、アプリケーションはビルド時に生成されたマニフェストモジュールから各主画像のパスのみを解決し、`assetPathByAssetId`として内部コマンドに設定します。`create-order`トランザクション内では、現在の`ProductImage`の`assetId`とパスのマップを照合し、代替テキスト（Alt Text）は商品画像との関連付け情報から取得して注文明細へとスナップショット保存します。

## 8. レビュー・テスト契約

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

// カテゴリーの並べ替えでは、送信されたID一覧が既存の全カテゴリーIDと過不足なく一致することを検証し、配列の順序に従って10、20、30…と再採番します。ブランドは`nameNormalized`昇順で固定されており、並べ替え機能は提供しません。

// カテゴリーおよびブランドの新規作成時は、`isActive=true`として生成します。カテゴリー作成時、既存データが0件であれば`sortOrder=10`、既存データがある場合は`max(sortOrder) + 10`とし、最大値の取得と新規作成をリポジトリ内の同一トランザクションで実行します。
// カテゴリーの名称や表示順、ブランド名称の更新入力には`isActive`を含めず、有効・無効の切り替えは専用のユースケースのみが担当します。
// カテゴリーまたはブランドを再有効化する際は、同一トランザクション内で名称の一意性を再検証します。

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

自動テスト向けビルドの検査（Inspection）APIは、上記の固定DTOのみを返却し、任意のテーブル参照や自由なクエリ実行機能は提供しません。

### クエリの決定的ソート規則

| クエリ | 主ソート | 同値時の最終キー |
|---|---|---|
| Storefront商品 new | publishedAt desc | productCode asc |
| Storefront商品 price/rating | 選択した価格またはrating | productCode asc |
| Search Suggestion | product、category、brandのGroup順、labelNormalized asc | id asc |
| Admin商品 | 選択したフィールド | productCode asc |
| Category / Brand | 選択したフィールド | id asc |
| 在庫 | 選択したフィールド | sku asc |
| 注文 | 選択したフィールド | orderNumber asc |
| User | 選択したフィールド | userId asc |
| Review | 選択したフィールド | reviewId asc |

ホーム画面用カタログ取得では、主要カテゴリーを最大6件、新着商品を最大8件、セール商品を最大8件返却します。セール対象商品が0件の場合は空配列を返し、UI側で該当セクションを非表示にします。

## 9. コアユースケース契約

| ユースケース | 入力（Input） | 出力（Output） | 主なエラー（Error） | 成功後の遷移・反映 |
|---|---|---|---|---|
| RegisterUser | RegisterUserRequest | LoginResult | VALIDATION、EMAIL_ALREADY_EXISTS、STORAGE_WRITE_FAILED | ホームまたはログイン前の遷移先 |
| Login | LoginRequest | LoginResult | AUTHENTICATION_FAILED、ACCOUNT_SUSPENDED、ACCOUNT_WITHDRAWN、STORAGE_WRITE_FAILED | ログイン前の遷移先 |
| Logout | なし | void | STORAGE_WRITE_FAILED | ホーム |
| GetCurrentUser | なし | CurrentUserDto | AUTHENTICATION_REQUIRED、ACCOUNT_SUSPENDED | 現在の画面 |
| UpdateProfile | UpdateProfileRequest | CurrentUserDto | VALIDATION、CONFLICT | アカウント画面。更新結果に`actionVersion`を含める |
| ListAddresses | なし | UserAddress[] | AUTHENTICATION_REQUIRED、STORAGE_READ_FAILED | 配送先住所一覧 |
| Create/Update/DeleteAddress | CreateAddressRequest / UpdateAddressRequest / DeleteAddressRequest | UserAddress / void | VALIDATION、CONFLICT、NOT_FOUND | 配送先住所一覧 |
| SuggestAddressByPostalCode | `{ postalCode: string }` | AddressSuggestion / null | VALIDATION | 配送先フォームの入力候補 |
| GetHomeCatalog | なし | HomeCatalogDto | STORAGE_READ_FAILED | ホーム画面 |
| SearchProductSuggestions | SearchSuggestionRequest | SearchSuggestion[] | VALIDATION、STORAGE_READ_FAILED | コンボボックスのサジェスト表示 |
| SearchProducts | ProductSearchRequest | ProductSearchResult | VALIDATION、STORAGE_READ_FAILED | URLクエリを正規化して商品一覧を表示 |
| GetProductDetail | `{ productId }` | ProductDetail | NOT_FOUND、PERMISSION_DENIED | 商品詳細画面 |
| ListProductReviews | ProductReviewsQuery | Page<ReviewListItem> | NOT_FOUND、STORAGE_READ_FAILED | 商品詳細のレビュー一覧 |
| ListImageAssets | ImageAssetSearchRequest | Page<ImageAssetListItem> | PERMISSION_DENIED、IMAGE_ASSET_NOT_FOUND | 商品編集の画像選択ダイアログ |
| SearchAdminProducts/GetProductForAdmin | AdminProductSearchRequest / `{ productId }` | Page<AdminProductListItem> / ProductEditDto | PERMISSION_DENIED、NOT_FOUND | ユースケースがClock時刻を内部クエリへ補完して管理商品一覧または編集画面を表示 |
| PrepareProductDuplicate | `{ sourceProductId }` | ProductDuplicateFormDto | NOT_FOUND、IMAGE_ASSET_NOT_FOUND | 商品新規登録フォーム（DB更新なし） |
| Create/UpdateProductAggregate | CreateProductRequest / UpdateProductRequest | ProductAggregate | VALIDATION、CONFLICT、IMAGE_ASSET_NOT_FOUND、IMAGE_ASSET_INACTIVE、VARIANT_HAS_REFERENCE | 保存済み商品編集画面 |
| PreviewProduct | ProductPreviewRequest | ProductPreviewDto | VALIDATION、IMAGE_ASSET_NOT_FOUND | 編集画面内のプレビューダイアログ |
| DeleteDraftProduct | `{ productId; expectedVersion }` | void | CONFLICT、PRODUCT_HAS_REFERENCE、INVALID_STATE | 商品管理一覧 |
| ChangeProductStatus | ChangeProductStatusRequest | Product | VALIDATION、CONFLICT、INVALID_STATE | 商品編集画面または商品管理一覧 |
| BulkChangeProductStatus | BulkChangeProductStatusRequest | BulkActionResult | PERMISSION_DENIED | 商品管理一覧に部分成功結果を反映 |
| Create/Update/ReorderCategory | CreateCategoryRequest / UpdateCategoryRequest / ReorderCategoriesRequest | CategoryAdminListItem / CategoryAdminListItem[] | VALIDATION、CONFLICT、INVALID_STATE | カテゴリー管理一覧 |
| ChangeCategoryActiveState | ChangeCategoryActiveStateRequest | CategoryAdminListItem | CONFLICT、INVALID_STATE | カテゴリー管理一覧 |
| Create/UpdateBrand | CreateBrandRequest / UpdateBrandRequest | BrandAdminListItem | VALIDATION、CONFLICT、INVALID_STATE | ブランド管理一覧 |
| ChangeBrandActiveState | ChangeBrandActiveStateRequest | BrandAdminListItem | CONFLICT、INVALID_STATE | ブランド管理一覧 |
| SearchAdminCategories | CategoryAdminSearchQuery | Page<CategoryAdminListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | カテゴリー管理一覧 |
| SearchAdminBrands | BrandAdminSearchQuery | Page<BrandAdminListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | ブランド管理一覧 |
| GetCart | なし | CartDto | PERMISSION_DENIED、STORAGE_READ_FAILED | カート画面 |
| Add/Update/RemoveCartItem | AddCartItemRequest / UpdateCartItemQuantityRequest / RemoveCartItemRequest | CartDto | PERMISSION_DENIED、OUT_OF_STOCK、QUANTITY_LIMIT_EXCEEDED、CONFLICT | カート画面または元の画面 |
| AcceptCartPriceChanges | AcceptPriceChangesRequest | CartDto | PRICE_CHANGED、CONFLICT | カートの再計算結果を表示 |
| MergeGuestCart | なし（Login/Register内部で実行） | CartMergeResult | STORAGE_WRITE_FAILED | 統合結果の表示 |
| StartCheckout | StartCheckoutRequest | CheckoutStartResult | PERMISSION_DENIED、CART_VERSION_CHANGED、PRICE_CHANGED、OUT_OF_STOCK | `/checkout/address`または保存済みステップへ遷移 |
| SetCheckoutAddress | SetCheckoutAddressRequest | CheckoutSession | VALIDATION、CONFLICT、CHECKOUT_EXPIRED | `/checkout/payment`へ遷移 |
| SetCheckoutPayment | SetCheckoutPaymentRequest | CheckoutSession | VALIDATION、CONFLICT、CHECKOUT_EXPIRED | `/checkout/confirm`へ遷移 |
| GetCheckoutConfirmation | `{ checkoutSessionId }` | CheckoutConfirmationDto | CART_VERSION_CHANGED、PRICE_CHANGED、OUT_OF_STOCK、CHECKOUT_EXPIRED | 注文確認画面を表示 |
| CreateOrderForPayment | CreateOrderForPaymentRequest | OrderProcessingDto | CONFLICT、CART_VERSION_CHANGED、PRICE_CHANGED、OUT_OF_STOCK | `/checkout/processing?orderId=...`へ遷移 |
| FinalizePaymentResult | 内部Command | OrderResultDto | CONFLICT、OUT_OF_STOCK、STORAGE_WRITE_FAILED | 注文完了画面（complete）または失敗画面（failed） |
| ResumeProcessingPayment | ResumeProcessingPaymentRequest | ResumeProcessingPaymentResult | NOT_FOUND、PERMISSION_DENIED、INVALID_STATE、STORAGE_WRITE_FAILED | 注文完了画面（complete）または失敗画面（failed） |
| RetryPayment | RetryPaymentRequest | OrderProcessingDto | INVALID_STATE、CONFLICT | 決済処理中画面（processing） |
| ListMyOrders | MyOrderSearchQuery | Page<OrderListItem> | AUTHENTICATION_REQUIRED、STORAGE_READ_FAILED | 注文履歴一覧 |
| GetOrderDetail | GetOrderDetailRequest | OrderDetailDto | NOT_FOUND、PERMISSION_DENIED | 顧客向け注文詳細 |
| GetAdminOrderDetail | GetOrderDetailRequest | AdminOrderDetailDto | NOT_FOUND、PERMISSION_DENIED | 管理者向け注文詳細 |
| SearchAdminOrders | OrderSearchQuery | Page<AdminOrderListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | 管理者向け注文一覧 |
| Start/Ship/CompleteOrder | StartOrderPreparationRequest / ShipOrderRequest / CompleteDeliveryRequest | AdminOrderDetailDto | INVALID_STATE、CONFLICT、VALIDATION | 管理注文詳細画面（更新後の`orderActionVersion`を返却） |
| GetReviewEligibility | ReviewEligibilityRequest | ReviewEligibilityDto | NOT_FOUND、PERMISSION_DENIED | レビュー投稿可否の判定 |
| Create/Update/DeleteReview | CreateReviewRequest / UpdateReviewRequest / DeleteReviewRequest | ReviewResultDto | NOT_ELIGIBLE、CONFLICT、VALIDATION | レビュー投稿画面または商品詳細画面 |
| SearchAdminReviews | ReviewSearchQuery | Page<AdminReviewListItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | レビュー管理一覧 |
| ChangeReviewVisibility | ChangeReviewVisibilityRequest | AdminReviewDetailDto | PERMISSION_DENIED、CONFLICT、INVALID_STATE | レビュー管理詳細 |
| BulkChangeReviewVisibility | BulkChangeReviewVisibilityRequest | BulkActionResult | PERMISSION_DENIED | レビュー管理一覧に部分成功結果を反映 |
| GetAdminOverview | なし | AdminOverview | PERMISSION_DENIED、STORAGE_READ_FAILED | 管理ダッシュボード概要 |
| SearchInventories | InventorySearchQuery | Page<InventoryItem> | PERMISSION_DENIED、STORAGE_READ_FAILED | 在庫一覧 |
| AdjustInventory | AdjustInventoryRequest | InventoryItem | PERMISSION_DENIED、VALIDATION、CONFLICT、INSUFFICIENT_STOCK | 在庫一覧・在庫履歴 |
| SearchAdminUsers/GetUserForAdmin | UserSearchQuery / `{ userId }` | Page<UserAdminListItem> / UserAdminDto | PERMISSION_DENIED、NOT_FOUND | ユーザー一覧または詳細 |
| ChangeMembershipRank | ChangeMembershipRankRequest | UserAdminDto | PERMISSION_DENIED、CONFLICT、INVALID_ROLE | ユーザー詳細（アクティブなチェックアウトは破棄） |
| ChangeOperatorAdminRole | ChangeOperatorAdminRoleRequest | UserAdminDto | LAST_ADMIN_PROTECTED、SELF_CHANGE_FORBIDDEN、CONFLICT | ユーザー詳細（セッションを無効化） |
| ChangeAccountSuspension | ChangeAccountSuspensionRequest | UserAdminDto | LAST_ADMIN_PROTECTED、SELF_CHANGE_FORBIDDEN、CONFLICT | ユーザー詳細（セッション無効化、customerアカウント停止時はチェックアウト破棄） |
| ResetDatabase | `{ scenario: string }` | TestMetadata | PERMISSION_DENIED、VALIDATION、RESET_BLOCKED_BY_OPEN_PAGE、STORAGE_WRITE_FAILED | ホーム画面（セッションとゲスト識別子をシード状態へ再設定） |
| SetTestClock | `{ iso: IsoDateTime \| null }` | TestMetadata | PERMISSION_DENIED、VALIDATION | テスト制御画面（Test Control） |
| SetPaymentDelay | `{ milliseconds: number }` | TestMetadata | PERMISSION_DENIED、VALIDATION | テスト制御画面（Test Control） |
| GetTestMetadata | なし | TestMetadata | PERMISSION_DENIED | テスト制御画面またはE2Eテスト |
| InspectOrder/Variant/ReviewSummary | 固定Entity ID | OrderInspection / VariantInspection / ReviewSummaryInspection | PERMISSION_DENIED、NOT_FOUND | E2Eテストでの読み取り専用検証 |

すべてのユースケースは、処理の失敗時にエラーを`ApplicationError`へと変換し、内部の例外（Exception）をプレゼンテーション層へ直接渡すことはありません。処理成功後の遷移先ルートについては、`screen_list.md`および`user_flows.md`の記述を最終的な正本とします。
