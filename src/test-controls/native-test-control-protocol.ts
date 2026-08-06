import { ApplicationError, validationError } from "@/application/errors";
import {
  BASE_CLOCK,
  DEFAULT_PAYMENT_DELAY_MS,
  isNativeFoundationScenario,
  type NativeFoundationScenario,
} from "@/seeds/metadata";

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

export interface NativeTestControlLinkParseResult {
  scheme?: string | null;
  hostname?: string | null;
  path?: string | null;
  queryParams?: Readonly<Record<string, string | string[] | null | undefined>> | null;
}

function firstQueryValue(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Pure validation of the Expo Linking.parse shape. The official contract is
 * scenario-shop://test-control/reset, therefore hostname is test-control and
 * path is reset (not test-control/reset).
 */
export function parseNativeTestControlLink(
  parsed: NativeTestControlLinkParseResult,
): NativeTestControlResetRequest | null {
  const path = parsed.path?.replace(/^\/+/, "") ?? "";
  if (parsed.scheme !== "scenario-shop" || parsed.hostname !== "test-control" || path !== "reset") {
    return null;
  }
  const query = parsed.queryParams ?? {};
  return defaultNativeTestControlRequest({
    version: firstQueryValue(query.version),
    scenario: firstQueryValue(query.scenario),
    clock: firstQueryValue(query.clock),
    paymentDelayMs: firstQueryValue(query.paymentDelayMs),
  });
}

/**
 * Platform-independent URL entry point used by unit tests. The React Native
 * bridge passes Linking.parse output to parseNativeTestControlLink; this
 * helper makes the same contract testable with the real URL string in Node.
 */
export function parseNativeTestControlUrl(url: string): NativeTestControlResetRequest | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const queryParams: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  return parseNativeTestControlLink({
    scheme: parsed.protocol.replace(/:$/, ""),
    hostname: parsed.hostname,
    path: parsed.pathname.replace(/^\/+/, ""),
    queryParams,
  });
}

export function validateNativeTestControlRequest(input: NativeTestControlResetRequest): void {
  if (input.version !== NATIVE_TEST_CONTROL_PROTOCOL_VERSION) {
    throw validationError("testControl.version.invalid");
  }
  if (!isNativeFoundationScenario(input.scenario)) {
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

export function isNativeFoundationScenarioValue(value: string): value is NativeFoundationScenario {
  return isNativeFoundationScenario(value);
}

export function isNativeTestControlConflict(error: unknown): boolean {
  return error instanceof ApplicationError && error.code === "CONFLICT";
}
