import type { SQLiteDatabase } from "expo-sqlite";
import { GuestActorResolver } from "@/application/identity/guest-actor-resolver";
import { CatalogUseCases } from "@/application/use-cases/catalog-use-cases";
import { CartUseCases } from "@/application/use-cases/cart-use-cases";
import { AuthUseCases } from "@/application/use-cases/auth-use-cases";
import { AccountUseCases } from "@/application/use-cases/account-use-cases";
import { CheckoutOrderUseCases } from "@/application/use-cases/checkout-order-use-cases";
import { CustomerReviewUseCases } from "@/application/use-cases/review-user-use-cases";
import { createNativeCustomerCatalogGateway } from "@/application/native/guest-storefront";
import { NativePersistedClock } from "@/infrastructure/clock/native-clock";
import { NativeIdGenerator } from "@/infrastructure/id-generator/native-id-generator";
import {
  NativeCurrentSessionStore,
  NativeGuestIdentityStore,
  NativeKeyValueStore,
  NATIVE_PAYMENT_DELAY_KEY,
} from "@/infrastructure/session/native-stores";
import { NativeCustomerSQLiteRepository } from "@/infrastructure/database/sqlite/native-customer-repositories";
import { createNativeCustomerApplicationRepositories } from "@/infrastructure/database/sqlite/native-customer-application-repositories";
import { openNativeCustomerDatabase } from "@/infrastructure/database/sqlite/database";
import { ensureNativeSeed, resolveNativeScenario } from "@/infrastructure/database/sqlite/seed";
import { DEFAULT_GUEST_ID, DEFAULT_PAYMENT_DELAY_MS } from "@/seeds/metadata";
import { DefaultEmailNormalizer } from "@/infrastructure/normalization/normalizers";
import { NativePbkdf2PasswordHasher } from "@/infrastructure/security/password-hasher.native";
import { BundledStaticAddressLookup } from "@/infrastructure/address-lookup/static-address-lookup";
import { MockPaymentGateway } from "@/infrastructure/payment/mock-payment-gateway";

export interface NativeCatalogService {
  getHome: CatalogUseCases["getHome"];
  search: CatalogUseCases["search"];
  getProductDetail: CatalogUseCases["getProductDetail"];
  getCategoryName: CatalogUseCases["getCategoryName"];
}

export interface NativeCartService {
  getCart: CartUseCases["getCart"];
  addItem: CartUseCases["addItem"];
  updateQuantity: CartUseCases["updateQuantity"];
  removeItem: CartUseCases["removeItem"];
}

export interface NativeApplicationServices {
  catalog: NativeCatalogService;
  auth: Pick<AuthUseCases, "login" | "register" | "logout" | "getCurrentUser">;
  account: Pick<
    AccountUseCases,
    | "getProfile"
    | "updateProfile"
    | "listAddresses"
    | "createAddress"
    | "updateAddress"
    | "deleteAddress"
    | "suggestAddress"
  >;
  cart: Pick<
    CartUseCases,
    "getCart" | "addItem" | "updateQuantity" | "removeItem" | "acceptPriceChanges"
  >;
  checkout: CheckoutOrderUseCases;
  reviews: CustomerReviewUseCases;
  database: SQLiteDatabase;
  storage: NativeKeyValueStore;
  clock: NativePersistedClock;
  currentSessionStore: NativeCurrentSessionStore;
  guestIdentityStore: NativeGuestIdentityStore;
}

let initialization: Promise<NativeApplicationServices> | null = null;

export function initializeNativeRuntime(): Promise<NativeApplicationServices> {
  initialization ??= createNativeRuntime().catch((caught: unknown) => {
    initialization = null;
    throw caught;
  });
  return initialization;
}

async function createNativeRuntime(): Promise<NativeApplicationServices> {
  const database = await openNativeCustomerDatabase();
  try {
    return await createNativeRuntimeServices(database);
  } catch (caught: unknown) {
    try {
      await database.closeAsync();
    } catch {
      // Preserve the initialization failure when cleanup also fails.
    }
    throw caught;
  }
}

async function createNativeRuntimeServices(
  database: SQLiteDatabase,
): Promise<NativeApplicationServices> {
  const storage = new NativeKeyValueStore();
  const clock = new NativePersistedClock(storage);
  await clock.initialize();
  await ensureNativeSeed(database, resolveNativeScenario(process.env.EXPO_PUBLIC_DEFAULT_SEED));
  const idGenerator = new NativeIdGenerator();
  const currentSessionStore = new NativeCurrentSessionStore(storage);
  const guestIdentityStore = new NativeGuestIdentityStore(idGenerator, storage, DEFAULT_GUEST_ID);
  const storefrontRepository = new NativeCustomerSQLiteRepository(database);
  const repositories = createNativeCustomerApplicationRepositories(database);
  const passwordHasher = new NativePbkdf2PasswordHasher();
  const emailNormalizer = new DefaultEmailNormalizer();
  const paymentGateway = new MockPaymentGateway(async () => {
    const raw = await storage.get(NATIVE_PAYMENT_DELAY_KEY);
    const parsed = Number(raw ?? DEFAULT_PAYMENT_DELAY_MS);
    return Number.isFinite(parsed) ? parsed : DEFAULT_PAYMENT_DELAY_MS;
  });
  const actor = new GuestActorResolver();
  const persistedSessionId = await currentSessionStore.getSessionId();
  if (persistedSessionId !== null) {
    const persistedSession = await database.getFirstAsync<{ id: string }>(
      "SELECT id FROM sessions WHERE id = ?",
      persistedSessionId,
    );
    if (persistedSession === null) await currentSessionStore.clear();
  } else {
    const initialSession = await database.getFirstAsync<{ id: string }>(
      "SELECT id FROM sessions ORDER BY created_at ASC, id ASC LIMIT 1",
    );
    if (initialSession === null) {
      await currentSessionStore.clear();
    } else {
      await currentSessionStore.setSessionId(initialSession.id);
    }
  }
  // Initialize the deterministic seed identity only on first launch. The
  // store must retain a user-created/persisted Guest ID across restarts.
  await guestIdentityStore.getOrCreateGuestId();
  const catalogUseCases = new CatalogUseCases({
    identity: actor,
    customerGateway: createNativeCustomerCatalogGateway(storefrontRepository),
    clock,
  });
  const authUseCases = new AuthUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    guestIdentityStore,
    emailNormalizer,
    passwordHasher,
    clock,
    idGenerator,
  });
  const accountUseCases = new AccountUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    addresses: repositories.addresses,
    currentSessionStore,
    clock,
    idGenerator,
    addressLookup: new BundledStaticAddressLookup(),
  });
  const cartUseCases = new CartUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    carts: repositories.carts,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    guestIdentityStore,
    idGenerator,
    clock,
  });
  const checkoutUseCases = new CheckoutOrderUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    carts: repositories.carts,
    checkouts: repositories.checkouts,
    orders: repositories.orders,
    payments: repositories.payments,
    reviews: repositories.reviews,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    paymentGateway,
    clock,
    idGenerator,
  });
  const reviewUseCases = new CustomerReviewUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    reviews: repositories.reviews,
    orders: repositories.orders,
    productRecords: repositories.products,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    clock,
    idGenerator,
  });
  return {
    catalog: {
      getHome: () => catalogUseCases.getHome(),
      search: (request) => catalogUseCases.search(request),
      getProductDetail: (productId) => catalogUseCases.getProductDetail(productId),
      getCategoryName: (categoryId) => catalogUseCases.getCategoryName(categoryId),
    },
    cart: {
      getCart: () => cartUseCases.getCart(),
      addItem: (request) => cartUseCases.addItem(request),
      updateQuantity: (request) => cartUseCases.updateQuantity(request),
      removeItem: (request) => cartUseCases.removeItem(request),
      acceptPriceChanges: (request) => cartUseCases.acceptPriceChanges(request),
    },
    auth: {
      login: (request) => authUseCases.login(request),
      register: (request) => authUseCases.register(request),
      logout: () => authUseCases.logout(),
      getCurrentUser: () => authUseCases.getCurrentUser(),
    },
    account: {
      getProfile: () => accountUseCases.getProfile(),
      updateProfile: (request) => accountUseCases.updateProfile(request),
      listAddresses: () => accountUseCases.listAddresses(),
      createAddress: (request) => accountUseCases.createAddress(request),
      updateAddress: (request) => accountUseCases.updateAddress(request),
      deleteAddress: (request) => accountUseCases.deleteAddress(request),
      suggestAddress: (postalCode) => accountUseCases.suggestAddress(postalCode),
    },
    checkout: checkoutUseCases,
    reviews: reviewUseCases,
    database,
    storage,
    clock,
    currentSessionStore,
    guestIdentityStore,
  };
}

export function resetNativeRuntimeInitialization(): void {
  initialization = null;
}
