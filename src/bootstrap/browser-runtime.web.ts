import { CryptoIdGenerator } from "@/infrastructure/id-generator/crypto-id-generator";
import {
  BrowserCurrentSessionStore,
  BrowserGuestIdentityStore,
} from "@/infrastructure/session/browser-stores";
import { isPhaseOneScenario, type PhaseOneScenario } from "@/seeds/metadata";
import { installTestApi } from "@/test-controls/test-api.web";
import { TestControlService } from "@/test-controls/test-control-service";
import { createApplicationServices } from "@/application/create-application-services";
import { RuntimeClock } from "@/infrastructure/clock/clocks";
import { MockPaymentGateway } from "@/infrastructure/payment/mock-payment-gateway";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { DexieCheckoutSessionRepository } from "@/infrastructure/database/dexie/cart-checkout-repositories";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { DefaultEmailNormalizer } from "@/infrastructure/normalization/normalizers";
import { WebPbkdf2PasswordHasher } from "@/infrastructure/security/password-hasher.web";
import { BundledStaticAddressLookup } from "@/infrastructure/address-lookup/static-address-lookup";

const sessionStore = new BrowserCurrentSessionStore();
const idGenerator = new CryptoIdGenerator();
const guestIdentityStore = new BrowserGuestIdentityStore(idGenerator);
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

const database = testControlService.getDatabase();
const repositories = createDexieApplicationRepositories(database);
const transactionRunner = new DexieApplicationTransactionRunner(database);

export const applicationServices = createApplicationServices({
  repositories,
  ports: {
    clock: runtimeClock,
    idGenerator,
    currentSessionStore: sessionStore,
    guestIdentityStore,
    emailNormalizer: new DefaultEmailNormalizer(),
    passwordHasher: new WebPbkdf2PasswordHasher(),
    addressLookup: new BundledStaticAddressLookup(),
    paymentGateway,
    transactionRunner,
  },
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
