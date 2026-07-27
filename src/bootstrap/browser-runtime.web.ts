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

const sessionStore = new BrowserCurrentSessionStore();
const guestIdentityStore = new BrowserGuestIdentityStore(new CryptoIdGenerator());

export const testControlService = new TestControlService({
  currentSessionStore: sessionStore,
  guestIdentityStore,
  buildSha: process.env.EXPO_PUBLIC_BUILD_SHA ?? "local",
});

export const applicationServices = createApplicationServices(testControlService.getDatabase());

let initialization: Promise<void> | null = null;

function configuredScenario(): PhaseOneScenario {
  const value = process.env.EXPO_PUBLIC_DEFAULT_SEED ?? "default";
  return isPhaseOneScenario(value) ? value : "default";
}

export function initializeBrowserRuntime(): Promise<void> {
  initialization ??= (async () => {
    const metadata = await testControlService.initialize(configuredScenario());
    await new DexieCheckoutSessionRepository(testControlService.getDatabase()).expireBefore(
      metadata.clock ?? new Date().toISOString(),
    );
    installTestApi(testControlService);
  })();
  return initialization;
}
