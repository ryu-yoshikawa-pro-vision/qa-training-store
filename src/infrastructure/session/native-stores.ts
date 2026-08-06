import AsyncStorage from "expo-sqlite/kv-store";
import type { CurrentSessionStore, GuestIdentityStore, IdGenerator } from "@/application/ports";

export const NATIVE_SESSION_ID_KEY = "scenario-shop.native.session-id.v1";
export const NATIVE_GUEST_ID_KEY = "scenario-shop.native.guest-id.v1";
export const NATIVE_TEST_CLOCK_KEY = "scenario-shop.native.test-clock.v1";
export const NATIVE_PAYMENT_DELAY_KEY = "scenario-shop.native.payment-delay.v1";

export class NativeKeyValueStore {
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

export class NativeCurrentSessionStore implements CurrentSessionStore {
  constructor(private readonly storage = new NativeKeyValueStore()) {}

  async getSessionId(): Promise<string | null> {
    return this.storage.get(NATIVE_SESSION_ID_KEY);
  }

  async setSessionId(id: string): Promise<void> {
    await this.storage.set(NATIVE_SESSION_ID_KEY, id);
  }

  async clear(): Promise<void> {
    await this.storage.remove(NATIVE_SESSION_ID_KEY);
  }
}

export class NativeGuestIdentityStore implements GuestIdentityStore {
  constructor(
    private readonly idGenerator: IdGenerator,
    private readonly storage = new NativeKeyValueStore(),
    private readonly initialGuestId?: string,
  ) {}

  async getOrCreateGuestId(): Promise<string> {
    const existing = await this.storage.get(NATIVE_GUEST_ID_KEY);
    if (existing !== null && existing.length > 0) {
      return existing;
    }
    const created = this.initialGuestId ?? this.idGenerator.generate();
    await this.storage.set(NATIVE_GUEST_ID_KEY, created);
    return created;
  }

  async setGuestId(id: string): Promise<void> {
    await this.storage.set(NATIVE_GUEST_ID_KEY, id);
  }

  async clear(): Promise<void> {
    await this.storage.remove(NATIVE_GUEST_ID_KEY);
  }
}

export async function clearNativeControlKeys(storage = new NativeKeyValueStore()): Promise<void> {
  await Promise.all([
    storage.remove(NATIVE_SESSION_ID_KEY),
    storage.remove(NATIVE_GUEST_ID_KEY),
    storage.remove(NATIVE_TEST_CLOCK_KEY),
    storage.remove(NATIVE_PAYMENT_DELAY_KEY),
  ]);
}
