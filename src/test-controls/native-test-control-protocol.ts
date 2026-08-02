import { ApplicationError, validationError } from "@/application/errors";
import { BASE_CLOCK, DEFAULT_PAYMENT_DELAY_MS, isPhaseOneScenario } from "@/seeds/metadata";

export const NATIVE_TEST_CONTROL_PROTOCOL_VERSION = 1;

export function isNativeTestControlBuild(
  buildKind = process.env.EXPO_PUBLIC_BUILD_KIND ?? "local",
): boolean {
  return buildKind === "local" || buildKind === "automation";
}

export interface NativeTestControlResetRequest {
  version: number;
  scenario: string;
  clock: string | null;
  paymentDelayMs: number;
}

export function validateNativeTestControlRequest(input: NativeTestControlResetRequest): void {
  if (input.version !== NATIVE_TEST_CONTROL_PROTOCOL_VERSION) {
    throw validationError("testControl.version.invalid");
  }
  if (!isPhaseOneScenario(input.scenario)) {
    throw validationError("testControl.scenario.invalid", {
      scenario: "testControl.scenario.invalid",
    });
  }
  if (
    input.clock !== null &&
    (Number.isNaN(Date.parse(input.clock)) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input.clock))
  ) {
    throw validationError("testControl.clock.invalid", {
      clock: "testControl.clock.invalid",
    });
  }
  if (
    !Number.isInteger(input.paymentDelayMs) ||
    input.paymentDelayMs < 0 ||
    input.paymentDelayMs > 30_000
  ) {
    throw validationError("testControl.paymentDelay.invalid", {
      paymentDelay: "testControl.paymentDelay.invalid",
    });
  }
}

export function defaultNativeTestControlRequest(
  query: Readonly<Record<string, string | null>>,
): NativeTestControlResetRequest {
  return {
    version: Number(query.version ?? ""),
    scenario: query.scenario ?? "",
    clock: query.clock ?? null,
    paymentDelayMs: Number(query.paymentDelayMs ?? String(DEFAULT_PAYMENT_DELAY_MS)),
  };
}

export function nativeResetDefaultClock(clock: string | null): string {
  return clock ?? BASE_CLOCK;
}

export function isNativeTestControlConflict(error: unknown): boolean {
  return error instanceof ApplicationError && error.code === "CONFLICT";
}
