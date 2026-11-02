import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { RuntimeClock } from "../../src/infrastructure/clock/clocks";
import { DEFAULT_GUEST_ID, BASE_CLOCK } from "../../src/seeds/metadata";
import { TestControlService } from "../../src/test-controls/test-control-service";

function createHarness(deleteDatabase) {
  const databaseName = `training-reset-${crypto.randomUUID()}`;
  const session = {
    value: null,
    async getSessionId() {
      return this.value;
    },
    async setSessionId(value) {
      this.value = value;
    },
    async clear() {
      this.value = null;
    },
  };
  const guest = {
    value: null,
    async getGuestId() {
      return this.value;
    },
    async setGuestId(value) {
      this.value = value;
    },
    async clear() {
      this.value = null;
    },
  };
  const clock = new RuntimeClock();
  const service = new TestControlService({
    databaseName,
    currentSessionStore: session,
    guestIdentityStore: guest,
    clock,
    ...(deleteDatabase ? { deleteDatabase } : {}),
  });
  return { databaseName, service, session, guest, clock };
}

async function snapshotTables(service) {
  const database = service.getDatabase();
  return Object.fromEntries(
    await Promise.all(database.tables.map(async (table) => [table.name, await table.toArray()])),
  );
}

async function dispose({ databaseName, service }) {
  service.getDatabase().close();
  await Dexie.delete(databaseName);
}

describe("AI-assisted QA: Test Control scenario reset safety", () => {
  it("rejects invalid scenarios and blocked deletion without modifying data or identities", async () => {
    let deleteAttempts = 0;
    const harness = createHarness(async () => {
      deleteAttempts += 1;
      throw new Error("another page has the database open");
    });
    const { service, session, guest, clock } = harness;
    try {
      await service.initialize("default");
      await service.setPaymentDelay(1200);
      await service.setClock("2026-07-02T03:00:00.000Z");
      await session.setSessionId("manual-session");
      await guest.setGuestId("manual-guest");
      const before = await snapshotTables(service);
      const metadata = await service.getMetadata();
      const fixedTime = clock.getFixedTime();

      await expect(service.reset({ scenario: "unsupported" })).rejects.toMatchObject({
        code: "VALIDATION",
      });
      expect(deleteAttempts).toBe(0);
      expect(await snapshotTables(service)).toEqual(before);

      await expect(service.reset({ scenario: "gold-member" })).rejects.toMatchObject({
        code: "RESET_BLOCKED_BY_OPEN_PAGE",
        retryable: true,
      });
      expect(deleteAttempts).toBe(1);
      expect(await snapshotTables(service)).toEqual(before);
      expect(await service.getMetadata()).toEqual(metadata);
      expect(session.value).toBe("manual-session");
      expect(guest.value).toBe("manual-guest");
      expect(clock.getFixedTime()).toBe(fixedTime);
    } finally {
      await dispose(harness);
    }
  });

  it("restores the selected scenario's seed, clock, delay and identities after a successful reset", async () => {
    const harness = createHarness();
    const { service, session, guest, clock } = harness;
    try {
      await service.initialize("default");
      await service.setPaymentDelay(1200);
      await service.setClock("2026-07-02T03:00:00.000Z");
      await session.setSessionId("manual-session");
      await guest.setGuestId("manual-guest");

      const metadata = await service.reset({ scenario: "gold-member" });
      expect(metadata).toMatchObject({
        scenario: "gold-member",
        paymentDelayMs: 500,
        clock: BASE_CLOCK,
      });
      expect(await service.getMetadata()).toEqual(metadata);
      expect(session.value).toBe("session-user-customer-gold");
      expect(guest.value).toBe(DEFAULT_GUEST_ID);
      expect(clock.getFixedTime()).toBe(BASE_CLOCK);
      expect(await service.getDatabase().products.count()).toBe(11);
    } finally {
      await dispose(harness);
    }
  });
});
