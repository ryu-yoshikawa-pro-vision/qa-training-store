import { CryptoIdGenerator } from "@/infrastructure/id-generator/crypto-id-generator";
import {
  BrowserCurrentSessionStore,
  BrowserGuestIdentityStore,
} from "@/infrastructure/session/browser-stores";
import { isPhaseOneScenario, type PhaseOneScenario } from "@/seeds/metadata";
import { installTestApi } from "@/test-controls/test-api.web";
import { TestControlService } from "@/test-controls/test-control-service";
import { DexieCheckoutSessionRepository } from "@/infrastructure/database/dexie/cart-checkout-repositories";
import { createApplicationServices } from "@/application/create-application-services";
import { RuntimeClock } from "@/infrastructure/clock/clocks";
import { MockPaymentGateway } from "@/infrastructure/payment/mock-payment-gateway";

const sessionStore = new BrowserCurrentSessionStore();
const guestIdentityStore = new BrowserGuestIdentityStore(new CryptoIdGenerator());
const runtimeClock = new RuntimeClock();

export const testControlService = new TestControlService({
  currentSessionStore: sessionStore,
  guestIdentityStore,
  clock: runtimeClock,
  buildSha: process.env.EXPO_PUBLIC_BUILD_SHA ?? "local",
});

const paymentGateway = new MockPaymentGateway(
  async () => (await testControlService.getMetadata()).paymentDelayMs,
);

export const applicationServices = createApplicationServices(testControlService.getDatabase(), {
  clock: runtimeClock,
  paymentGateway,
});

let initialization: Promise<void> | null = null;

function configuredScenario(): PhaseOneScenario {
  const value = process.env.EXPO_PUBLIC_DEFAULT_SEED ?? "default";
  return isPhaseOneScenario(value) ? value : "default";
}

export function initializeBrowserRuntime(): Promise<void> {
  initialization ??= (async () => {
    await testControlService.initialize(configuredScenario());
    const now = runtimeClock.now();
    await new DexieCheckoutSessionRepository(testControlService.getDatabase()).expireBefore(now);
    installTestApi(testControlService);
  })();
  return initialization;
}
