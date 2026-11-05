import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import {
  assertAvailableModelListing,
  assertFreeModelCatalogEntry,
  verifyCurrentFreeModelPrice,
} from "../../scripts/training/ai-assisted-qa-assessment.mjs";

const URL = "https://models.dev/api.json";
const CATALOG = {
  opencode: {
    models: {
      "sample-free": {
        cost: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
      },
      "paid-model": { cost: { input: 0.01, output: 0.04 } },
      "unknown-price": { cost: { input: 0 } },
      "deprecated-free": {
        status: "deprecated",
        cost: { input: 0, output: 0 },
      },
    },
  },
};

function response(catalog = CATALOG, overrides = {}) {
  const body = Buffer.from(JSON.stringify(catalog));
  return {
    status: 200,
    redirected: false,
    url: URL,
    headers: {
      get: (name) => {
        if (name === "content-type") return "application/json";
        if (name === "content-length") return String(body.length);
        return null;
      },
    },
    arrayBuffer: async () => body,
    ...overrides,
  };
}

describe("formal evaluator pricing preflight", () => {
  it("allows only a published zero-cost OpenCode model", async () => {
    const catalog = assertFreeModelCatalogEntry("opencode/sample-free", CATALOG);
    expect(catalog).toMatchObject({
      model_id: "opencode/sample-free",
      catalog_url: URL,
      cost_per_million: { input: 0, output: 0 },
    });
    const fetchImpl = vi.fn(async () => response());
    expect(
      await verifyCurrentFreeModelPrice("opencode/sample-free", { fetchImpl }),
    ).toMatchObject(catalog);
    expect(fetchImpl).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({ method: "GET", redirect: "manual" }),
    );
  });

  it("blocks paid, unknown, missing, deprecated and unrelated provider models", async () => {
    for (const modelId of [
      "opencode/paid-model",
      "opencode/unknown-price",
      "opencode/deprecated-free",
      "opencode/missing",
      "openai/gpt-free",
      "provider/unknown-free",
    ]) {
      expect(() => assertFreeModelCatalogEntry(modelId, CATALOG)).toThrow(/BLOCKED/);
    }
    for (const cost of [
      { input: 0, output: null },
      { input: 0, output: -1 },
      { input: 0, output: 0, cache_read: "unknown" },
      { input: 0, output: 0, cache_write: 0.01 },
    ]) {
      const catalog = {
        opencode: { models: { "sample-free": { cost } } },
      };
      expect(() => assertFreeModelCatalogEntry("opencode/sample-free", catalog)).toThrow(
        /BLOCKED/,
      );
    }
  });

  it("rejects unsafe pricing catalog responses", async () => {
    const failureResponses = [
      response(CATALOG, { status: 429 }),
      response(CATALOG, { status: 401 }),
      response(CATALOG, { redirected: true }),
      response(CATALOG, { url: "https://example.org/price.json" }),
      response(CATALOG, { headers: { get: () => "text/html" } }),
      response(CATALOG, {
        headers: {
          get: (name) => (name === "content-length" ? "40000000" : "application/json"),
        },
      }),
      response(CATALOG, { arrayBuffer: async () => Buffer.from("<html>bad</html>") }),
    ];
    for (const reply of failureResponses) {
      await expect(
        verifyCurrentFreeModelPrice("opencode/sample-free", {
          fetchImpl: async () => reply,
        }),
      ).rejects.toThrow(/BLOCKED/);
    }
    await expect(
      verifyCurrentFreeModelPrice("opencode/sample-free", {
        fetchImpl: async () => {
          throw Error("network unavailable");
        },
      }),
    ).rejects.toThrow(/BLOCKED/);
  });

  it("requires the exact selected model to appear in the available model listing", () => {
    expect(
      assertAvailableModelListing(
        "opencode/sample-free",
        "opencode/other-free\nopencode/sample-free\n",
      ),
    ).toBe("opencode/sample-free");
    for (const output of [
      "opencode/other-free\n",
      "opencode/sample-free-extra\n",
      "opencode/sample-free#paid\n",
      "",
    ]) {
      expect(() => assertAvailableModelListing("opencode/sample-free", output)).toThrow(
        /BLOCKED/,
      );
    }
  });

  it("never fetches a price for unsupported providers", async () => {
    const fetchImpl = vi.fn(async () => response());
    await expect(
      verifyCurrentFreeModelPrice("anthropic/paid", { fetchImpl }),
    ).rejects.toThrow(/BLOCKED/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
