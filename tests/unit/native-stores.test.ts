import {
  NativeCurrentSessionStore,
  NativeGuestIdentityStore,
  NativeKeyValueStore,
  clearNativeControlKeys,
  NATIVE_GUEST_ID_KEY,
  NATIVE_PAYMENT_DELAY_KEY,
  NATIVE_SESSION_ID_KEY,
  NATIVE_TEST_CLOCK_KEY,
} from "@/infrastructure/session/native-stores";

const values = vi.hoisted(() => new Map<string, string>());

vi.mock("expo-sqlite/kv-store", () => ({
  default: {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  },
}));

describe("Native KV adapters", () => {
  beforeEach(() => values.clear());

  it("persists and clears the session and guest identity", async () => {
    const session = new NativeCurrentSessionStore();
    const guest = new NativeGuestIdentityStore({ generate: () => "generated-guest" });

    await session.setSessionId("session-1");
    expect(await session.getSessionId()).toBe("session-1");
    await session.clear();
    expect(await session.getSessionId()).toBeNull();

    expect(await guest.getOrCreateGuestId()).toBe("generated-guest");
    expect(await guest.getOrCreateGuestId()).toBe("generated-guest");
    await guest.clear();
    expect(await guest.getOrCreateGuestId()).toBe("generated-guest");
  });

  it("uses the initial seed Guest ID only when storage is empty", async () => {
    const guest = new NativeGuestIdentityStore(
      { generate: () => "generated-guest" },
      new NativeKeyValueStore(),
      "guest-default-001",
    );

    expect(await guest.getOrCreateGuestId()).toBe("guest-default-001");
    await guest.setGuestId("guest-persisted-002");
    expect(await guest.getOrCreateGuestId()).toBe("guest-persisted-002");
  });

  it("clears only the fixed application control keys", async () => {
    const storage = new NativeKeyValueStore();
    await storage.set(NATIVE_SESSION_ID_KEY, "session-1");
    await storage.set(NATIVE_GUEST_ID_KEY, "guest-1");
    await storage.set(NATIVE_TEST_CLOCK_KEY, "2026-07-01T03:00:00.000Z");
    await storage.set(NATIVE_PAYMENT_DELAY_KEY, "500");
    await storage.set("scenario-shop.other-key", "preserve");

    await clearNativeControlKeys(storage);

    expect(await storage.get(NATIVE_SESSION_ID_KEY)).toBeNull();
    expect(await storage.get(NATIVE_GUEST_ID_KEY)).toBeNull();
    expect(await storage.get(NATIVE_TEST_CLOCK_KEY)).toBeNull();
    expect(await storage.get(NATIVE_PAYMENT_DELAY_KEY)).toBeNull();
    expect(await storage.get("scenario-shop.other-key")).toBe("preserve");
  });
});
