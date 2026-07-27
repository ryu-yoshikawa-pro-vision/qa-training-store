import Dexie from "dexie";
import { ApplicationError, validationError } from "@/application/errors";
import type {
  OrderInspection,
  ReviewSummaryInspection,
  TestMetadata,
  VariantInspection,
} from "@/application/contracts";
import type { CurrentSessionStore, GuestIdentityStore } from "@/application/ports";
import { DATABASE_NAME, ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import type { ControllableClock } from "@/infrastructure/clock/clocks";
import { DEFAULT_GUEST_ID, isPhaseOneScenario, type PhaseOneScenario } from "@/seeds/metadata";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

interface TestControlSetting {
  scenario: PhaseOneScenario;
  clock: string | null;
  paymentDelayMs: number;
  [key: string]: unknown;
}

interface TestControlServiceOptions {
  databaseName?: string;
  currentSessionStore: CurrentSessionStore;
  guestIdentityStore: GuestIdentityStore;
  clock: ControllableClock;
  buildSha?: string;
  databaseFactory?: (name: string) => ScenarioShopDatabase;
  deleteDatabase?: (name: string) => Promise<void>;
}

export class TestControlService {
  private database: ScenarioShopDatabase;
  private readonly databaseName: string;
  private readonly currentSessionStore: CurrentSessionStore;
  private readonly guestIdentityStore: GuestIdentityStore;
  private readonly clock: ControllableClock;
  private readonly buildSha: string;
  private readonly databaseFactory: (name: string) => ScenarioShopDatabase;
  private readonly deleteDatabase: (name: string) => Promise<void>;

  constructor(options: TestControlServiceOptions) {
    this.databaseName = options.databaseName ?? DATABASE_NAME;
    this.currentSessionStore = options.currentSessionStore;
    this.guestIdentityStore = options.guestIdentityStore;
    this.clock = options.clock;
    this.buildSha = options.buildSha ?? "local";
    this.databaseFactory = options.databaseFactory ?? ((name) => new ScenarioShopDatabase(name));
    this.deleteDatabase = options.deleteDatabase ?? (async (name) => Dexie.delete(name));
    this.database = this.databaseFactory(this.databaseName);
  }

  getDatabase(): ScenarioShopDatabase {
    return this.database;
  }

  async initialize(scenario: PhaseOneScenario = "default"): Promise<TestMetadata> {
    if ((await this.database.schema_metadata.count()) === 0) {
      await loadSeedDataset(this.database, createScenarioDataset(scenario), scenario);
      await this.restoreSeedIdentity();
    }
    const metadata = await this.getMetadata();
    this.clock.setFixedTime(metadata.clock);
    return metadata;
  }

  async reset(input: { scenario: string }): Promise<TestMetadata> {
    if (!isPhaseOneScenario(input.scenario)) {
      throw validationError("testControl.scenario.invalid", {
        scenario: "testControl.scenario.invalid",
      });
    }
    this.database.close();
    try {
      await this.deleteDatabase(this.databaseName);
    } catch {
      this.database = this.databaseFactory(this.databaseName);
      throw new ApplicationError({
        code: "RESET_BLOCKED_BY_OPEN_PAGE",
        messageKey: "testControl.reset.blocked",
        retryable: true,
      });
    }
    await this.currentSessionStore.clear();
    await this.guestIdentityStore.clear();
    this.database = this.databaseFactory(this.databaseName);
    await loadSeedDataset(this.database, createScenarioDataset(input.scenario), input.scenario);
    await this.restoreSeedIdentity();
    const metadata = await this.getMetadata();
    this.clock.setFixedTime(metadata.clock);
    return metadata;
  }

  async setClock(iso: string | null): Promise<TestMetadata> {
    if (iso !== null && Number.isNaN(new Date(iso).valueOf())) {
      throw validationError("testControl.clock.invalid", {
        clock: "testControl.clock.invalid",
      });
    }
    const setting = await this.getControlSetting();
    await this.putControlSetting({ ...setting, clock: iso });
    this.clock.setFixedTime(iso);
    return this.getMetadata();
  }

  async setPaymentDelay(milliseconds: number): Promise<TestMetadata> {
    if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 30_000) {
      throw validationError("testControl.paymentDelay.invalid", {
        paymentDelay: "testControl.paymentDelay.invalid",
      });
    }
    const setting = await this.getControlSetting();
    await this.putControlSetting({ ...setting, paymentDelayMs: milliseconds });
    return this.getMetadata();
  }

  async getMetadata(): Promise<TestMetadata> {
    const setting = await this.getControlSetting();
    const entries = await this.database.schema_metadata.toArray();
    const metadata = new Map(entries.map((entry) => [entry.key, entry.value]));
    return {
      appVersion: metadata.get("appVersion") ?? "unknown",
      schemaVersion: Number(metadata.get("schemaVersion") ?? 0),
      seedVersion: Number(metadata.get("seedVersion") ?? 0),
      buildSha: this.buildSha,
      scenario: setting.scenario,
      clock: setting.clock,
      paymentDelayMs: setting.paymentDelayMs,
    };
  }

  async inspectOrder(orderId: string): Promise<OrderInspection> {
    const order = await this.database.orders.get(orderId);
    if (order === undefined) {
      throw this.notFound("order");
    }
    const checkout = await this.database.checkout_sessions.get(order.checkoutSessionId);
    const cart =
      checkout === undefined ? undefined : await this.database.carts.get(checkout.cartId);
    const payments = await this.database.payments
      .where("orderId")
      .equals(orderId)
      .sortBy("attemptNumber");
    const shipment = await this.database.shipments.where("orderId").equals(orderId).first();
    const latestPayment = payments.at(-1);
    if (checkout === undefined || cart === undefined || latestPayment === undefined) {
      throw new ApplicationError({
        code: "STORAGE_READ_FAILED",
        messageKey: "testControl.inspection.inconsistent",
        retryable: true,
      });
    }
    return {
      orderId,
      orderStatus: order.status,
      latestPaymentStatus: latestPayment.status,
      shipmentStatus: shipment?.status ?? null,
      cartStatus: cart.status,
      checkoutStatus: checkout.status,
    };
  }

  async inspectVariant(variantId: string): Promise<VariantInspection> {
    const variant = await this.database.product_variants.get(variantId);
    if (variant === undefined) {
      throw this.notFound("variant");
    }
    return {
      variantId,
      stockQuantity: variant.stockQuantity,
      historyCount: await this.database.inventory_histories
        .where("variantId")
        .equals(variantId)
        .count(),
    };
  }

  async inspectReviewSummary(productId: string): Promise<ReviewSummaryInspection> {
    const summary = await this.database.product_review_summaries.get(productId);
    if (summary === undefined) {
      throw this.notFound("reviewSummary");
    }
    return {
      publishedCount: summary.publishedCount,
      ratingTotal: summary.ratingTotal,
      ratingAverage: summary.ratingAverage,
      rating1Count: summary.rating1Count,
      rating2Count: summary.rating2Count,
      rating3Count: summary.rating3Count,
      rating4Count: summary.rating4Count,
      rating5Count: summary.rating5Count,
    };
  }

  private async getControlSetting(): Promise<TestControlSetting> {
    const setting = await this.database.app_settings.get("test-control");
    if (setting === undefined) {
      throw new ApplicationError({
        code: "STORAGE_READ_FAILED",
        messageKey: "testControl.metadata.missing",
        retryable: true,
      });
    }
    return JSON.parse(setting.valueJson) as TestControlSetting;
  }

  private async putControlSetting(value: TestControlSetting): Promise<void> {
    await this.database.app_settings.put({
      key: "test-control",
      valueJson: JSON.stringify(value),
      updatedAt: value.clock ?? new Date().toISOString(),
    });
  }

  private async restoreSeedIdentity(): Promise<void> {
    const session = await this.database.sessions.orderBy("createdAt").first();
    if (session === undefined) {
      await this.currentSessionStore.clear();
    } else {
      await this.currentSessionStore.setSessionId(session.id);
    }
    await this.guestIdentityStore.setGuestId(DEFAULT_GUEST_ID);
  }

  private notFound(entity: string): ApplicationError {
    return new ApplicationError({
      code: "NOT_FOUND",
      messageKey: `testControl.${entity}.notFound`,
      retryable: false,
    });
  }
}
