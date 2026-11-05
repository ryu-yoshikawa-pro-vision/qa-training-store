import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resetScenario } from "../../training/playwright/support/reset-scenario";

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), "utf8");
const references = [
  "training/ai-assisted-qa-course/assessment/playwright/M06/cart-cases.spec.ts",
  "training/ai-assisted-qa-course/assessment/playwright/M06/remove-item.spec.ts",
  "training/ai-assisted-qa-course/assessment/playwright/M06/quantity-update.spec.ts",
];
const runner = read("scripts/training/ai-assisted-qa-run-evidence.mjs");
const resetSource = read("training/playwright/support/reset-scenario.ts");

/** Reset処理の順序とmetadata不一致を確認する疑似Pageを作る。 */
function fakePage({ metadataOverride } = {}) {
  const events = [];
  const state = { scenario: "uninitialized" };
  const api = {
    async reset({ scenario }) {
      events.push(`reset:${scenario}`);
      state.scenario = scenario;
    },
    async getMetadata() {
      events.push("metadata");
      return { scenario: metadataOverride ?? state.scenario };
    },
  };

  /** ブラウザのtest APIを一時的に公開し、終了時に必ず復元する。 */
  async function inBrowser(callback) {
    const previous = globalThis.window;
    globalThis.window = { __TEST_API__: api };
    try {
      return await callback();
    } finally {
      if (previous === undefined) delete globalThis.window;
      else globalThis.window = previous;
    }
  }

  const page = {
    async goto(url, options) {
      expect(url).toBe("/");
      expect(options.waitUntil).toBe("domcontentloaded");
      events.push("goto");
    },
    async waitForFunction(callback) {
      const ready = await inBrowser(callback);
      expect(ready).toBe(true);
      events.push("ready");
    },
    async evaluate(callback, argument) {
      return inBrowser(() => callback(argument));
    },
    async reload(options) {
      expect(options.waitUntil).toBe("domcontentloaded");
      events.push("reload");
    },
  };
  return { page, state, events };
}

describe("M06-02：Resetとtest間独立性の技術契約", () => {
  it("既存のReset helperはシナリオを適用し、再読込後のmetadataを確認する", async () => {
    expect(resetSource).toContain("await testApi.reset({ scenario: scenarioName })");
    expect(resetSource).toContain("return testApi.getMetadata()");
    expect(resetSource).toContain("metadata.scenario !== scenario");

    const first = fakePage();
    const second = fakePage();
    await resetScenario(first.page, "default");
    await resetScenario(second.page, "low-stock");

    expect(first.state.scenario).toBe("default");
    expect(second.state.scenario).toBe("low-stock");
    for (const [fixture, expected] of [
      [first, "default"],
      [second, "low-stock"],
    ]) {
      expect(fixture.events).toEqual([
        "goto",
        "ready",
        `reset:${expected}`,
        "reload",
        "ready",
        "metadata",
      ]);
    }
    await resetScenario(first.page, "low-stock");
    expect(first.state.scenario).toBe("low-stock");
    expect(second.state.scenario).toBe("low-stock");
  });

  it("Resetのmetadataが指定Seedと異なれば成功扱いにしない", async () => {
    const fixture = fakePage({ metadataOverride: "default" });
    await expect(resetScenario(fixture.page, "low-stock")).rejects.toThrow(
      "Training Scenario reset mismatch: expected low-stock, received default",
    );
    expect(fixture.events).toContain("metadata");
  });

  it("参考5 Caseはそれぞれtest開始時にResetし、他testの状態を前提にしない", () => {
    const all = references.flatMap((file) => {
      const source = read(file);
      expect(source).not.toContain("test.describe.serial");
      expect(source).not.toContain("test.beforeAll");
      return source.split(/(?=^test\()/m).slice(1);
    });
    expect(all).toHaveLength(5);
    const seeds = all.map((testSource) => {
      const reset = testSource.match(/await resetScenario\(page, "(default|low-stock)"\)/);
      expect(reset).not.toBeNull();
      expect(testSource.indexOf(reset[0])).toBeLessThan(testSource.indexOf("await page.goto"));
      return reset[1];
    });
    expect(seeds).toEqual(["default", "default", "low-stock", "default", "default"]);
  });

  it("course:runは再試行で失敗を隠さず、別Runを作成する", () => {
    expect(runner).toContain('"--retries=0"');
    expect(runner).toContain("const runId = randomUUID()");
    expect(runner).toContain("label,");
    expect(runner).toContain("spec_unchanged_during_run:");
  });
});
