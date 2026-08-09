import { ApplicationError } from "@/application/errors";
import {
  assertNativeAuthorizationRejections,
  assertNativeContractHarnessApplicationStateUnchanged,
  createNativeContractHarnessScope,
  withNativeContractHarness,
} from "@/test-controls/native-contract-harness.native";

vi.mock("expo-crypto", () => ({ randomUUID: () => "runtime-generated" }));
const signalMock = vi.hoisted(() => vi.fn());
vi.mock("@/test-controls/native-signals", () => ({
  NATIVE_CONTRACT_FAILED: "native-contract-failed",
  NATIVE_CONTRACT_PASSED: "native-contract-passed",
  NATIVE_CONTRACT_RUNNING: "native-contract-running",
  emitNativeTestSignal: signalMock,
}));

describe("Native contract harness isolation", () => {
  beforeEach(() => {
    signalMock.mockReset();
  });

  it("fails closed when one authorization rejection is replaced by a successful login", async () => {
    const login = vi
      .fn()
      .mockRejectedValueOnce(
        new ApplicationError({
          code: "ACCOUNT_SUSPENDED",
          messageKey: "auth.account.suspended",
          retryable: false,
        }),
      )
      .mockResolvedValueOnce({ user: { id: "withdrawn-user" } });
    const clearSession = vi.fn().mockResolvedValue(undefined);

    await expect(assertNativeAuthorizationRejections({ login, clearSession })).rejects.toThrow(
      "withdrawn@example.com",
    );
    expect(clearSession).toHaveBeenCalledTimes(2);
  });

  it("uses a runtime UUID for the DB and KV namespace", () => {
    const scope = createNativeContractHarnessScope("runtime-123");
    expect(scope.databaseName).toBe("scenario-shop-contract-runtime-123.db");
    expect(scope.kvPrefix).toBe("scenario-shop.contract.runtime-123");
    expect(Object.values(scope.keys).every((key) => key.startsWith(scope.kvPrefix))).toBe(true);
  });

  it("compares only the required application database invariants", () => {
    const state = {
      databaseName: "scenario-shop-native-v1.db",
      nativeSchemaVersion: "1",
      seedVersion: "1",
      knownProduct: { id: "product-basic-shirt", name: "Tシャツ", status: "published" },
      guestId: "guest-1",
      sessionId: null,
    };
    expect(() =>
      assertNativeContractHarnessApplicationStateUnchanged(state, structuredClone(state)),
    ).not.toThrow();
    expect(() =>
      assertNativeContractHarnessApplicationStateUnchanged(state, {
        ...state,
        guestId: "changed-by-harness",
      }),
    ).toThrow("guestId");
  });

  it("closes and cleans the harness in finally", async () => {
    const calls: string[] = [];
    await expect(
      withNativeContractHarness(
        {
          closeDatabase: () => {
            calls.push("close");
          },
          deleteDatabase: () => {
            calls.push("delete");
          },
          removeKvKey: async (key) => {
            calls.push(key);
          },
          verifyApplicationDatabase: async () => {
            calls.push("verify-application-db");
          },
          verifyPasswordHashing: async () => {
            calls.push("verify-password-hashing");
          },
        },
        async (scope) => {
          calls.push(scope.databaseName);
          return "passed";
        },
        "runtime-456",
      ),
    ).resolves.toBe("passed");
    expect(calls[0]).toBe("scenario-shop-contract-runtime-456.db");
    expect(calls.slice(1, 5)).toEqual([
      "verify-application-db",
      "verify-password-hashing",
      "close",
      "delete",
    ]);
    expect(calls).toHaveLength(9);
    expect(signalMock.mock.calls.map(([name]) => name)).toEqual([
      "native-contract-running",
      "native-contract-passed",
    ]);
  });

  it("emits the success signal only after checks and cleanup complete", async () => {
    const events: string[] = [];
    signalMock.mockImplementation((name: string) => events.push(name));

    await withNativeContractHarness(
      {
        closeDatabase: () => {
          events.push("close");
        },
        deleteDatabase: () => {
          events.push("delete");
        },
        removeKvKey: async () => {
          events.push("remove-kv");
        },
        verifyApplicationDatabase: async () => {
          events.push("verify-application-db");
        },
        verifyPasswordHashing: async () => {
          events.push("verify-password-hashing");
        },
      },
      async () => {
        events.push("contract-checks");
      },
      "runtime-signal-order",
    );

    expect(events).toEqual([
      "native-contract-running",
      "contract-checks",
      "verify-application-db",
      "verify-password-hashing",
      "close",
      "delete",
      "remove-kv",
      "remove-kv",
      "remove-kv",
      "remove-kv",
      "native-contract-passed",
    ]);
  });

  it("does not emit passed when the PBKDF2 check fails", async () => {
    await expect(
      withNativeContractHarness(
        {
          closeDatabase: () => undefined,
          deleteDatabase: () => undefined,
          removeKvKey: async () => undefined,
          verifyPasswordHashing: async () => {
            throw new Error("PBKDF2 check failed");
          },
        },
        async () => "checked",
        "runtime-pbkdf2-failed",
      ),
    ).rejects.toThrow("PBKDF2 check failed");
    expect(signalMock.mock.calls.map(([name]) => name)).toEqual([
      "native-contract-running",
      "native-contract-failed",
    ]);
  });

  it("emits failed after contract failure and never emits passed", async () => {
    const calls: string[] = [];
    await expect(
      withNativeContractHarness(
        {
          closeDatabase: () => undefined,
          deleteDatabase: () => undefined,
          removeKvKey: async () => undefined,
          verifyApplicationDatabase: async () => {
            calls.push("verify-application-db");
          },
          verifyPasswordHashing: async () => {
            calls.push("verify-password-hashing");
          },
        },
        async () => {
          calls.push("contract");
          throw new Error("contract failed");
        },
        "runtime-contract-failed",
      ),
    ).rejects.toThrow("contract failed");
    expect(calls).toEqual(["contract", "verify-application-db"]);
    expect(signalMock.mock.calls.map(([name]) => name)).toEqual([
      "native-contract-running",
      "native-contract-failed",
    ]);
  });

  it("treats cleanup failure as a harness failure without emitting passed", async () => {
    await expect(
      withNativeContractHarness(
        {
          closeDatabase: () => undefined,
          deleteDatabase: async () => {
            throw new Error("delete failed");
          },
          removeKvKey: async () => undefined,
        },
        async () => "passed",
        "runtime-789",
      ),
    ).rejects.toThrow("cleanup failed");
    expect(signalMock.mock.calls.map(([name]) => name)).toEqual([
      "native-contract-running",
      "native-contract-failed",
    ]);
  });

  it("preserves the original contract error when cleanup also fails", async () => {
    const cleanupKeys: string[] = [];
    await expect(
      withNativeContractHarness(
        {
          closeDatabase: () => {
            throw new Error("close failed");
          },
          deleteDatabase: () => {
            throw new Error("delete failed");
          },
          removeKvKey: async (key) => {
            cleanupKeys.push(key);
            throw new Error("kv failed");
          },
        },
        async () => {
          throw new Error("original contract error");
        },
        "runtime-both-failed",
      ),
    ).rejects.toThrow("original contract error");
    expect(signalMock.mock.calls.map(([name]) => name)).toEqual([
      "native-contract-running",
      "native-contract-failed",
    ]);
    expect(signalMock).toHaveBeenLastCalledWith(
      "native-contract-failed",
      expect.objectContaining({ cleanupErrorCount: 6 }),
    );
    expect(cleanupKeys).toHaveLength(4);
  });
});
