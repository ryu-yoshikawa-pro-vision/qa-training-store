import { randomUUID } from "expo-crypto";
import {
  emitNativeTestSignal,
  NATIVE_CONTRACT_FAILED,
  NATIVE_CONTRACT_PASSED,
  NATIVE_CONTRACT_RUNNING,
} from "./native-signals";

export const NATIVE_CONTRACT_HARNESS_MARKER = "__SCENARIO_SHOP_NATIVE_CONTRACT_HARNESS__";

export interface NativeContractHarnessScope {
  runtimeId: string;
  databaseName: string;
  kvPrefix: string;
  keys: {
    sessionId: string;
    guestId: string;
    testClock: string;
    paymentDelay: string;
  };
}

export interface NativeContractHarnessResources {
  closeDatabase(): Promise<void> | void;
  deleteDatabase(): Promise<void> | void;
  removeKvKey(key: string): Promise<void>;
  verifyApplicationDatabase?(): Promise<void>;
}

export interface NativeContractHarnessApplicationState {
  databaseName: string;
  nativeSchemaVersion: string | null;
  seedVersion: string | null;
  knownProduct: { id: string; name: string; status: string } | null;
  guestId: string | null;
  sessionId: string | null;
}

export interface NativeContractHarnessResult {
  runtimeId: string;
  databaseName: string;
  checks: {
    catalog: boolean;
    cartMutation: boolean;
    foreignKeyEnforcement: boolean;
    applicationDatabaseUnchanged: boolean;
  };
}

export function createNativeContractHarnessScope(
  runtimeId = randomUUID(),
): NativeContractHarnessScope {
  const kvPrefix = `scenario-shop.contract.${runtimeId}`;
  return {
    runtimeId,
    databaseName: `scenario-shop-contract-${runtimeId}.db`,
    kvPrefix,
    keys: {
      sessionId: `${kvPrefix}.session-id`,
      guestId: `${kvPrefix}.guest-id`,
      testClock: `${kvPrefix}.test-clock`,
      paymentDelay: `${kvPrefix}.payment-delay`,
    },
  };
}

export async function withNativeContractHarness<T>(
  resources: NativeContractHarnessResources,
  work: (scope: NativeContractHarnessScope) => Promise<T>,
  runtimeId?: string,
): Promise<T> {
  const scope = createNativeContractHarnessScope(runtimeId);
  emitNativeTestSignal(NATIVE_CONTRACT_RUNNING, {
    runtimeId: scope.runtimeId,
    databaseName: scope.databaseName,
  });
  let workError: unknown = null;
  let result!: T;
  let workCompleted = false;
  try {
    result = await work(scope);
    workCompleted = true;
  } catch (caught: unknown) {
    workError = caught;
  } finally {
    const cleanupErrors: unknown[] = [];
    try {
      await resources.closeDatabase();
    } catch (caught: unknown) {
      cleanupErrors.push(caught);
    }
    try {
      await resources.deleteDatabase();
    } catch (caught: unknown) {
      cleanupErrors.push(caught);
    }
    for (const key of Object.values(scope.keys)) {
      try {
        await resources.removeKvKey(key);
      } catch (caught: unknown) {
        cleanupErrors.push(caught);
      }
    }
    try {
      await resources.verifyApplicationDatabase?.();
    } catch (caught: unknown) {
      cleanupErrors.push(caught);
    }
    if (cleanupErrors.length > 0 && workError === null) {
      const firstCleanupError = cleanupErrors[0];
      const detail = firstCleanupError instanceof Error ? `: ${firstCleanupError.message}` : "";
      const cleanupError = new Error(
        `Native contract cleanup failed or application invariant failed (${cleanupErrors.length} errors)${detail}`,
      );
      emitNativeTestSignal(NATIVE_CONTRACT_FAILED, {
        runtimeId: scope.runtimeId,
        message: cleanupError.message,
      });
      throw cleanupError;
    }
    if (cleanupErrors.length > 0) {
      // Preserve the original contract failure as the thrown error. Cleanup
      // failure is still observable through the failed signal and its count.
      emitNativeTestSignal(NATIVE_CONTRACT_FAILED, {
        runtimeId: scope.runtimeId,
        message: workError instanceof Error ? workError.message : "Native contract failed",
        cleanupErrorCount: cleanupErrors.length,
      });
      throw workError;
    }
  }
  if (workError !== null || !workCompleted) {
    emitNativeTestSignal(NATIVE_CONTRACT_FAILED, {
      runtimeId: scope.runtimeId,
      message: workError instanceof Error ? workError.message : "Native contract failed",
    });
    throw workError ?? new Error("Native contract did not complete");
  }
  emitNativeTestSignal(NATIVE_CONTRACT_PASSED, { runtimeId: scope.runtimeId });
  return result;
}

export function assertNativeContractHarnessApplicationStateUnchanged(
  before: NativeContractHarnessApplicationState,
  after: NativeContractHarnessApplicationState,
): void {
  const fields: Array<keyof NativeContractHarnessApplicationState> = [
    "databaseName",
    "nativeSchemaVersion",
    "seedVersion",
    "knownProduct",
    "guestId",
    "sessionId",
  ];
  const changed = fields.filter(
    (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  );
  if (changed.length > 0) {
    throw new Error(`Native application state changed: ${changed.join(", ")}`);
  }
}
