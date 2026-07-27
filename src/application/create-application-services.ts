import type { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { CryptoIdGenerator } from "@/infrastructure/id-generator/crypto-id-generator";
import {
  BrowserCurrentSessionStore,
  BrowserGuestIdentityStore,
} from "@/infrastructure/session/browser-stores";
import { DefaultEmailNormalizer } from "@/infrastructure/normalization/normalizers";
import { WebPbkdf2PasswordHasher } from "@/infrastructure/security/password-hasher.web";
import { BundledStaticAddressLookup } from "@/infrastructure/address-lookup/static-address-lookup";
import { AuthUseCases } from "./use-cases/auth-use-cases";
import { AccountUseCases } from "./use-cases/account-use-cases";
import { CatalogUseCases } from "./use-cases/catalog-use-cases";
import { CartUseCases } from "./use-cases/cart-use-cases";
import { CheckoutOrderUseCases } from "./use-cases/checkout-order-use-cases";
import { AdminMasterUseCases } from "./use-cases/admin-master-use-cases";
import { AdminProductUseCases } from "./use-cases/admin-product-use-cases";
import { AdminOperationsUseCases } from "./use-cases/admin-operations-use-cases";
import {
  AdminReviewUseCases,
  AdminUserUseCases,
  CustomerReviewUseCases,
} from "./use-cases/review-user-use-cases";
import type { Clock, PaymentGateway } from "@/application/ports";

interface ApplicationServiceOptions {
  clock: Clock;
  paymentGateway: PaymentGateway;
}

export function createApplicationServices(
  database: ScenarioShopDatabase,
  { clock, paymentGateway }: ApplicationServiceOptions,
) {
  const idGenerator = new CryptoIdGenerator();
  const currentSessionStore = new BrowserCurrentSessionStore();
  const guestIdentityStore = new BrowserGuestIdentityStore(idGenerator);
  const transactionRunner = new DexieApplicationTransactionRunner(database);
  return {
    auth: new AuthUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      guestIdentityStore,
      emailNormalizer: new DefaultEmailNormalizer(),
      passwordHasher: new WebPbkdf2PasswordHasher(),
      clock,
      idGenerator,
    }),
    account: new AccountUseCases({
      database,
      currentSessionStore,
      clock,
      idGenerator,
      addressLookup: new BundledStaticAddressLookup(),
    }),
    catalog: new CatalogUseCases({
      database,
      currentSessionStore,
      clock,
    }),
    cart: new CartUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      guestIdentityStore,
      clock,
      idGenerator,
    }),
    checkout: new CheckoutOrderUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      paymentGateway,
      clock,
      idGenerator,
    }),
    adminMaster: new AdminMasterUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      clock,
      idGenerator,
    }),
    adminProducts: new AdminProductUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      clock,
      idGenerator,
    }),
    adminOperations: new AdminOperationsUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      clock,
      idGenerator,
    }),
    reviews: new CustomerReviewUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      clock,
      idGenerator,
    }),
    adminReviews: new AdminReviewUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      clock,
      idGenerator,
    }),
    adminUsers: new AdminUserUseCases({
      database,
      transactionRunner,
      currentSessionStore,
      clock,
      idGenerator,
    }),
  };
}

export type ApplicationServices = ReturnType<typeof createApplicationServices>;
