import type { SQLiteDatabase } from "expo-sqlite";
import {
  NativeGuestCatalogUseCases as CatalogUseCases,
  NativeGuestCartUseCases as CartUseCases,
  type NativeGuestCatalogUseCases,
  type NativeGuestCartUseCases,
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

export interface NativeApplicationServices {
  catalog: NativeGuestCatalogUseCases;
  cart: NativeGuestCartUseCases;
  database: SQLiteDatabase;
  storage: NativeKeyValueStore;
  clock: NativePersistedClock;
  currentSessionStore: NativeCurrentSessionStore;
  guestIdentityStore: NativeGuestIdentityStore;
}

let initialization: Promise<NativeApplicationServices> | null = null;

export function initializeNativeRuntime(): Promise<NativeApplicationServices> {
  initialization ??= (async () => {
    const database = await openNativeCustomerDatabase();
    const storage = new NativeKeyValueStore();
    const clock = new NativePersistedClock(storage);
    await clock.initialize();
    await ensureNativeSeed(database, resolveNativeScenario(process.env.EXPO_PUBLIC_DEFAULT_SEED));
    const idGenerator = new NativeIdGenerator();
    const currentSessionStore = new NativeCurrentSessionStore(storage);
    const guestIdentityStore = new NativeGuestIdentityStore(idGenerator, storage, DEFAULT_GUEST_ID);
    const repository = new NativeCustomerSQLiteRepository(database);
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
    return {
      catalog: new CatalogUseCases(repository, clock),
      cart: new CartUseCases(repository, guestIdentityStore, idGenerator, clock),
      database,
      storage,
      clock,
      currentSessionStore,
      guestIdentityStore,
    };
  })();
  return initialization;
}

export function resetNativeRuntimeInitialization(): void {
  initialization = null;
}
