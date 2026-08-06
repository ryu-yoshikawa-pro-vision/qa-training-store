import { ensureNativeSeed, resolveNativeScenario } from "@/infrastructure/database/sqlite/seed";
import { openNativeCustomerDatabase } from "@/infrastructure/database/sqlite/database";
import {
  initializeNativeRuntime,
  resetNativeRuntimeInitialization,
} from "@/bootstrap/native-runtime";

const mockOpenNativeCustomerDatabase = jest.mocked(openNativeCustomerDatabase);
const mockEnsureNativeSeed = jest.mocked(ensureNativeSeed);

jest.mock("@/infrastructure/database/sqlite/database", () => ({
  openNativeCustomerDatabase: jest.fn(),
}));

jest.mock("@/infrastructure/database/sqlite/seed", () => ({
  ensureNativeSeed: jest.fn(),
  resolveNativeScenario: jest.fn(() => "default"),
}));

jest.mock("@/infrastructure/session/native-stores", () => ({
  NativeKeyValueStore: class {
    async get(): Promise<string | null> {
      return null;
    }

    async set(): Promise<void> {}

    async remove(): Promise<void> {}
  },
  NativeCurrentSessionStore: class {
    async getSessionId(): Promise<string | null> {
      return null;
    }

    async setSessionId(): Promise<void> {}

    async clear(): Promise<void> {}
  },
  NativeGuestIdentityStore: class {
    async getOrCreateGuestId(): Promise<string> {
      return "guest-test";
    }

    async setGuestId(): Promise<void> {}

    async clear(): Promise<void> {}
  },
}));

describe("Native runtime database cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNativeRuntimeInitialization();
    mockEnsureNativeSeed.mockResolvedValue(undefined);
    jest.mocked(resolveNativeScenario).mockReturnValue("default");
  });

  it("closes the database and preserves the initialization error", async () => {
    const initializationError = new Error("native seed failed");
    const closeAsync = jest.fn().mockResolvedValue(undefined);
    const database = {
      closeAsync,
      getFirstAsync: jest.fn().mockResolvedValue(null),
    };
    mockOpenNativeCustomerDatabase.mockResolvedValue(database as never);
    mockEnsureNativeSeed.mockRejectedValueOnce(initializationError);

    await expect(initializeNativeRuntime()).rejects.toBe(initializationError);
    expect(closeAsync).toHaveBeenCalledTimes(1);
  });

  it("does not close a database returned by a successful runtime", async () => {
    const closeAsync = jest.fn().mockResolvedValue(undefined);
    const database = {
      closeAsync,
      getFirstAsync: jest.fn().mockResolvedValue(null),
    };
    mockOpenNativeCustomerDatabase.mockResolvedValue(database as never);

    await expect(initializeNativeRuntime()).resolves.toMatchObject({ database });
    expect(closeAsync).not.toHaveBeenCalled();
  });

  it("preserves the initialization error when database cleanup fails", async () => {
    const initializationError = new Error("native seed failed");
    const cleanupError = new Error("database close failed");
    const closeAsync = jest.fn().mockRejectedValue(cleanupError);
    const database = {
      closeAsync,
      getFirstAsync: jest.fn().mockResolvedValue(null),
    };
    mockOpenNativeCustomerDatabase.mockResolvedValue(database as never);
    mockEnsureNativeSeed.mockRejectedValueOnce(initializationError);

    await expect(initializeNativeRuntime()).rejects.toBe(initializationError);
    expect(closeAsync).toHaveBeenCalledTimes(1);
  });
});
