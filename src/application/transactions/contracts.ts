import type {
  BrandRepository,
  CartRepository,
  CategoryRepository,
  CheckoutSessionRepository,
  InventoryRepository,
  OrderRepository,
  PaymentRepository,
  ProductRepository,
  ReviewRepository,
  ReviewSummaryRepository,
  SequenceRepository,
  SessionRepository,
  ShipmentRepository,
  UserRepository,
} from "@/domain/repositories";

export interface TransactionScopeMap {
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
    shipments: ShipmentRepository;
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
}

export interface ApplicationTransactionRunner {
  run<S extends keyof TransactionScopeMap, T>(
    scope: S,
    work: (repositories: TransactionScopeMap[S]) => Promise<T>,
  ): Promise<T>;
}
