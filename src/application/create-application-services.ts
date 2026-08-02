import type {
  ProductImageManifestRepository,
  Clock,
  CurrentSessionStore,
  GuestIdentityStore,
  IdGenerator,
  PaymentGateway,
  EmailNormalizer,
  PasswordHasher,
  StaticAddressLookup,
} from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import type {
  AddressRepository,
  AdminOverviewQueryRepository,
  AdminProductQueryRepository,
  BrandRepository,
  CartRepository,
  CategoryRepository,
  CheckoutSessionRepository,
  InventoryRepository,
  OrderRepository,
  PaymentRepository,
  ProductQueryRepository,
  ProductRepository,
  ReviewRepository,
  ReviewSummaryRepository,
  SessionRepository,
  StorefrontCatalogQueryRepository,
  UserRepository,
} from "@/domain/repositories";
import { AccountUseCases } from "./use-cases/account-use-cases";
import { AdminMasterUseCases } from "./use-cases/admin-master-use-cases";
import { AdminOperationsUseCases } from "./use-cases/admin-operations-use-cases";
import { AdminProductUseCases } from "./use-cases/admin-product-use-cases";
import {
  AdminReviewUseCases,
  AdminUserUseCases,
  CustomerReviewUseCases,
} from "./use-cases/review-user-use-cases";
import { AuthUseCases } from "./use-cases/auth-use-cases";
import { CartUseCases } from "./use-cases/cart-use-cases";
import { CatalogUseCases } from "./use-cases/catalog-use-cases";
import { CheckoutOrderUseCases } from "./use-cases/checkout-order-use-cases";

export interface ApplicationRepositoryCapabilities {
  users: UserRepository;
  sessions: SessionRepository;
  addresses: AddressRepository;
  catalog: StorefrontCatalogQueryRepository;
  products: ProductQueryRepository;
  productRecords: ProductRepository;
  query: AdminProductQueryRepository;
  categories: CategoryRepository;
  brands: BrandRepository;
  assets: ProductImageManifestRepository;
  reviews: ReviewRepository;
  reviewSummaries: ReviewSummaryRepository;
  carts: CartRepository;
  checkouts: CheckoutSessionRepository;
  orders: OrderRepository;
  payments: PaymentRepository;
  inventory: InventoryRepository;
  overview: AdminOverviewQueryRepository;
}

export interface ApplicationPlatformPorts {
  clock: Clock;
  idGenerator: IdGenerator;
  currentSessionStore: CurrentSessionStore;
  guestIdentityStore: GuestIdentityStore;
  emailNormalizer: EmailNormalizer;
  passwordHasher: PasswordHasher;
  addressLookup: StaticAddressLookup;
  paymentGateway: PaymentGateway;
  transactionRunner: ApplicationTransactionRunner;
}

export interface CreateApplicationServicesInput {
  repositories: ApplicationRepositoryCapabilities;
  ports: ApplicationPlatformPorts;
}

export function createApplicationServices({ repositories, ports }: CreateApplicationServicesInput) {
  return {
    auth: new AuthUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      guestIdentityStore: ports.guestIdentityStore,
      emailNormalizer: ports.emailNormalizer,
      passwordHasher: ports.passwordHasher,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    account: new AccountUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      addresses: repositories.addresses,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
      addressLookup: ports.addressLookup,
    }),
    catalog: new CatalogUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      catalog: repositories.catalog,
      products: repositories.products,
      productRecords: repositories.productRecords,
      categories: repositories.categories,
      reviews: repositories.reviews,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
    }),
    cart: new CartUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      carts: repositories.carts,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      guestIdentityStore: ports.guestIdentityStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    checkout: new CheckoutOrderUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      carts: repositories.carts,
      checkouts: repositories.checkouts,
      orders: repositories.orders,
      payments: repositories.payments,
      reviews: repositories.reviews,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      paymentGateway: ports.paymentGateway,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    adminMaster: new AdminMasterUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      categories: repositories.categories,
      brands: repositories.brands,
      overview: repositories.overview,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    adminProducts: new AdminProductUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      products: repositories.productRecords,
      query: repositories.query,
      assets: repositories.assets,
      brands: repositories.brands,
      categories: repositories.categories,
      reviewSummaries: repositories.reviewSummaries,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    adminOperations: new AdminOperationsUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      inventory: repositories.inventory,
      orders: repositories.orders,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    reviews: new CustomerReviewUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      reviews: repositories.reviews,
      orders: repositories.orders,
      productRecords: repositories.productRecords,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    adminReviews: new AdminReviewUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      reviews: repositories.reviews,
      orders: repositories.orders,
      productRecords: repositories.productRecords,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
    adminUsers: new AdminUserUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      reviews: repositories.reviews,
      orders: repositories.orders,
      productRecords: repositories.productRecords,
      transactionRunner: ports.transactionRunner,
      currentSessionStore: ports.currentSessionStore,
      clock: ports.clock,
      idGenerator: ports.idGenerator,
    }),
  };
}

export type ApplicationServices = ReturnType<typeof createApplicationServices>;
