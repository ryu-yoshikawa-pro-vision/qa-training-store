import { randomUUID } from "expo-crypto";
import {
  emitNativeTestSignal,
  NATIVE_CONTRACT_FAILED,
  NATIVE_CONTRACT_PASSED,
  NATIVE_CONTRACT_RUNNING,
} from "./native-signals";

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
  try {
    const result = await work(scope);
    emitNativeTestSignal(NATIVE_CONTRACT_PASSED, { runtimeId: scope.runtimeId });
    return result;
  } catch (caught: unknown) {
    workError = caught;
    emitNativeTestSignal(NATIVE_CONTRACT_FAILED, {
      runtimeId: scope.runtimeId,
      message: caught instanceof Error ? caught.message : "Native contract failed",
    });
    throw caught;
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
    if (cleanupErrors.length > 0 && workError === null) {
      throw new Error(`Native contract cleanup failed (${cleanupErrors.length} errors)`);
    }
    if (cleanupErrors.length > 0) {
      throw new Error("Native contract work and cleanup both failed");
    }
  }
}
