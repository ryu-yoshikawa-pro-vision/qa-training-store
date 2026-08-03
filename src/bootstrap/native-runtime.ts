import type { SQLiteDatabase } from "expo-sqlite";
import { GuestActorResolver } from "@/application/identity/guest-actor-resolver";
import { CatalogUseCases } from "@/application/use-cases/catalog-use-cases";
import { CartUseCases } from "@/application/use-cases/cart-use-cases";
import {
  createNativeCustomerCatalogGateway,
  createNativeCustomerCartGateway,
} from "@/application/native/guest-storefront";
import { NativePersistedClock } from "@/infrastructure/clock/native-clock";
import { NativeIdGenerator } from "@/infrastructure/id-generator/native-id-generator";
import {
  NativeCurrentSessionStore,
  NativeGuestIdentityStore,
  NativeKeyValueStore,
} from "@/infrastructure/session/native-stores";
import { NativeCustomerSQLiteRepository } from "@/infrastructure/database/sqlite/native-customer-repositories";
import { openNativeCustomerDatabase } from "@/infrastructure/database/sqlite/database";
import { ensureNativeSeed, resolveNativeScenario } from "@/infrastructure/database/sqlite/seed";
import { DEFAULT_GUEST_ID } from "@/seeds/metadata";

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
  cart: NativeCartService;
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
  const storage = new NativeKeyValueStore();
  const clock = new NativePersistedClock(storage);
  await clock.initialize();
  await ensureNativeSeed(database, resolveNativeScenario(process.env.EXPO_PUBLIC_DEFAULT_SEED));
  const idGenerator = new NativeIdGenerator();
  const currentSessionStore = new NativeCurrentSessionStore(storage);
  const guestIdentityStore = new NativeGuestIdentityStore(idGenerator, storage, DEFAULT_GUEST_ID);
  const repository = new NativeCustomerSQLiteRepository(database);
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
    customerGateway: createNativeCustomerCatalogGateway(repository),
    clock,
  });
  const cartUseCases = new CartUseCases({
    identity: actor,
    customerGateway: createNativeCustomerCartGateway(repository),
    guestIdentityStore,
    idGenerator,
    clock,
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
    },
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
