import { ApplicationError } from "@/application/errors";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { DEFAULT_GUEST_ID, SCENARIO_METADATA, type PhaseOneScenario } from "@/seeds/metadata";
import { createScenarioDataset } from "@/seeds/scenarios";
import { clearNativeCustomerData, seedNativeDataset } from "@/infrastructure/database/sqlite/seed";
import {
  clearNativeControlKeys,
  NATIVE_PAYMENT_DELAY_KEY,
} from "@/infrastructure/session/native-stores";
import {
  emitNativeTestSignal,
  NATIVE_TEST_RUNTIME_ERROR,
  NATIVE_TEST_RUNTIME_READY,
} from "./native-signals";
import {
  nativeResetDefaultClock,
  NATIVE_TEST_CONTROL_PROTOCOL_VERSION,
  type NativeTestControlResetRequest,
  validateNativeTestControlRequest,
} from "./native-test-control-protocol";

export interface NativeTestControlResetResult {
  version: 1;
  scenario: PhaseOneScenario;
  clock: string;
  paymentDelayMs: number;
  defaultRoute: "/" | "/admin";
}

export class NativeTestControlService {
  private resetInProgress = false;

  constructor(private readonly runtime: NativeApplicationServices) {}

  async reset(input: NativeTestControlResetRequest): Promise<NativeTestControlResetResult> {
    if (this.resetInProgress) {
      throw new ApplicationError({
        code: "CONFLICT",
        messageKey: "testControl.reset.inProgress",
        retryable: true,
      });
    }
    validateNativeTestControlRequest(input);
    this.resetInProgress = true;
    try {
      const scenario = input.scenario as PhaseOneScenario;
      const clock = nativeResetDefaultClock(input.clock);
      await clearNativeControlKeys(this.runtime.storage);
      await clearNativeCustomerData(this.runtime.database);
      await seedNativeDataset(this.runtime.database, createScenarioDataset(scenario));
      await this.restoreSeedIdentity();
      await this.runtime.clock.setFixedTime(clock);
      await this.runtime.storage.set(NATIVE_PAYMENT_DELAY_KEY, String(input.paymentDelayMs));
      const result: NativeTestControlResetResult = {
        version: NATIVE_TEST_CONTROL_PROTOCOL_VERSION,
        scenario,
        clock,
        paymentDelayMs: input.paymentDelayMs,
        defaultRoute: SCENARIO_METADATA[scenario].safeResetPath,
      };
      emitNativeTestSignal(NATIVE_TEST_RUNTIME_READY, result);
      return result;
    } catch (caught: unknown) {
      const error = caught instanceof Error ? caught : new Error("Native test reset failed");
      emitNativeTestSignal(NATIVE_TEST_RUNTIME_ERROR, { message: error.message });
      throw error;
    } finally {
      this.resetInProgress = false;
    }
  }

  private async restoreSeedIdentity(): Promise<void> {
    const session = await this.runtime.database.getFirstAsync<{ id: string }>(
      "SELECT id FROM sessions ORDER BY created_at ASC, id ASC LIMIT 1",
    );
    if (session === null) {
      await this.runtime.currentSessionStore.clear();
    } else {
      await this.runtime.currentSessionStore.setSessionId(session.id);
    }
    await this.runtime.guestIdentityStore.setGuestId(DEFAULT_GUEST_ID);
  }
}
