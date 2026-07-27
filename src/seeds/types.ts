import type {
  AppSetting,
  BrandRecord,
  Cart,
  CartItem,
  CategoryRecord,
  CheckoutSession,
  DailySequence,
  InventoryHistory,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariantRecord,
  Review,
  ReviewStatusHistory,
  SchemaMetadata,
  Session,
  Shipment,
  User,
  UserAddressRecord,
} from "@/domain/contracts";

export interface SeedDataset {
  users: User[];
  userAddresses: UserAddressRecord[];
  sessions: Session[];
  categories: CategoryRecord[];
  brands: BrandRecord[];
  products: Product[];
  productVariants: ProductVariantRecord[];
  productImages: ProductImage[];
  reviewSummaries: ProductReviewSummary[];
  inventoryHistories: InventoryHistory[];
  carts: Cart[];
  cartItems: CartItem[];
  checkoutSessions: CheckoutSession[];
  orders: Order[];
  orderItems: OrderItem[];
  sequences: DailySequence[];
  orderHistories: OrderStatusHistory[];
  payments: Payment[];
  shipments: Shipment[];
  reviews: Review[];
  reviewHistories: ReviewStatusHistory[];
  appSettings: AppSetting[];
  schemaMetadata: SchemaMetadata[];
}
