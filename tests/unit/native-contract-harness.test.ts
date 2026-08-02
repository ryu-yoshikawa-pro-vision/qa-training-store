import {
  createNativeContractHarnessScope,
  withNativeContractHarness,
} from "@/test-controls/native-contract-harness.native";

vi.mock("expo-crypto", () => ({ randomUUID: () => "runtime-generated" }));

describe("Native contract harness isolation", () => {
  it("uses a runtime UUID for the DB and KV namespace", () => {
    const scope = createNativeContractHarnessScope("runtime-123");
    expect(scope.databaseName).toBe("scenario-shop-contract-runtime-123.db");
    expect(scope.kvPrefix).toBe("scenario-shop.contract.runtime-123");
    expect(Object.values(scope.keys).every((key) => key.startsWith(scope.kvPrefix))).toBe(true);
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
        },
        async (scope) => {
          calls.push(scope.databaseName);
          return "passed";
        },
        "runtime-456",
      ),
    ).resolves.toBe("passed");
    expect(calls[0]).toBe("scenario-shop-contract-runtime-456.db");
    expect(calls.slice(1, 3)).toEqual(["close", "delete"]);
    expect(calls).toHaveLength(7);
  });

  it("treats cleanup failure as a harness failure", async () => {
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
  });
});
