import {
  buildLoginHref,
  parseCustomerReturnPath,
  resolveCustomerLoginDestination,
} from "@/presentation/browser/return-to.web";
import {
  consumeOneTimeNoticeForPath,
  createCartMergeNotice,
  readOneTimeNotice,
  writeOneTimeNotice,
} from "@/presentation/browser/one-time-notice.web";
import { mergeAddressSuggestion } from "@/presentation/browser/address-suggestion";
import { shipmentDisplayLabel } from "@/presentation/content/dictionary";
import {
  isPresentationRouteLink,
  PRESENTATION_ROUTE_LINKS,
} from "@/presentation/routing/guide-routes";
import { PHASE_ONE_SCENARIOS, SCENARIO_METADATA } from "@/seeds/metadata";
import { createScenarioDataset } from "@/seeds/scenarios";

describe("UI/UX flow contracts", () => {
  it("accepts only the customer checkout return paths", async () => {
    expect(parseCustomerReturnPath("/cart")).toBe("/cart");
    expect(parseCustomerReturnPath("/checkout/confirm")).toBe("/checkout/confirm");
    expect(parseCustomerReturnPath("/admin")).toBeNull();
    expect(parseCustomerReturnPath("//evil.example")).toBeNull();
    expect(parseCustomerReturnPath("/cart?next=/admin")).toBeNull();
    expect(parseCustomerReturnPath("/cart#hash")).toBeNull();
    expect(parseCustomerReturnPath("/cart\\")).toBeNull();
    expect(parseCustomerReturnPath("%E0%A4%A")).toBeNull();
    expect(parseCustomerReturnPath(["/cart"])).toBeNull();
    expect(buildLoginHref("/checkout/address")).toBe("/login?returnTo=%2Fcheckout%2Faddress");
    await expect(
      resolveCustomerLoginDestination("/checkout/payment", async () => false),
    ).resolves.toBe("/checkout/address");
  });

  it("consumes a one-time cart notice only at its target path", () => {
    const result = {
      userCartId: "cart-user",
      items: [
        {
          variantId: "variant-1",
          productName: "商品",
          optionValue: "M",
          guestQuantity: 3,
          previousUserQuantity: 2,
          addedQuantity: 1,
          overflowQuantity: 2,
          finalQuantity: 5,
          excludedReason: null,
        },
      ],
      addedItemCount: 1,
      adjustedItemCount: 1,
      fullyExcludedItemCount: 0,
      addedQuantity: 1,
      overflowQuantity: 2,
      excludedItemCount: 1,
    };
    const notice = createCartMergeNotice(result, "/");
    expect(notice?.presentation).toBe("summary");
    expect(notice?.targetPath).toBe("/cart");
    writeOneTimeNotice(notice!);
    expect(consumeOneTimeNoticeForPath("/")).toBeNull();
    expect(readOneTimeNotice()).not.toBeNull();
    expect(consumeOneTimeNoticeForPath("/cart")?.type).toBe("cart-merge");
    expect(readOneTimeNotice()).toBeNull();
    expect(consumeOneTimeNoticeForPath("/cart")).toBeNull();
  });

  it("keeps entered addressLine1 while applying postal suggestions", () => {
    const suggestion = {
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "千代田1-1",
    };
    expect(
      mergeAddressSuggestion({ prefecture: "", city: "", addressLine1: "" }, suggestion),
    ).toEqual({
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "千代田1-1",
      addressLine1Retained: false,
    });
    expect(
      mergeAddressSuggestion(
        { prefecture: "大阪府", city: "大阪市", addressLine1: "入力済み1-2" },
        suggestion,
      ),
    ).toEqual({
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "入力済み1-2",
      addressLine1Retained: true,
    });
  });

  it("keeps scenario session metadata aligned with the initial session", () => {
    for (const scenario of PHASE_ONE_SCENARIOS) {
      const definition = SCENARIO_METADATA[scenario];
      expect(definition.e2eHasSession).toBe(definition.initialSession.kind !== "guest");
    }
  });

  it("keeps scenario datasets aligned with metadata sessions", () => {
    for (const scenario of PHASE_ONE_SCENARIOS) {
      const definition = SCENARIO_METADATA[scenario];
      const dataset = createScenarioDataset(scenario);
      const initialSession = definition.initialSession;

      if (!("email" in initialSession)) {
        expect(dataset.sessions).toHaveLength(0);
        continue;
      }

      const user = dataset.users.filter((candidate) => candidate.email === initialSession.email);
      expect(user).toHaveLength(1);
      expect(dataset.sessions).toHaveLength(1);
      expect(dataset.sessions[0]?.userId).toBe(user[0]?.id);
      expect(definition.e2eHasSession).toBe(true);
    }
  });

  it("links only the shared guide and notice route allowlist", () => {
    expect(PRESENTATION_ROUTE_LINKS).toEqual([
      "/",
      "/products",
      "/search",
      "/cart",
      "/login",
      "/checkout/address",
      "/checkout/payment",
      "/checkout/confirm",
      "/orders",
      "/account/profile",
      "/account/addresses",
      "/admin",
      "/admin/products",
      "/admin/inventories",
      "/admin/orders",
      "/admin/reviews",
      "/admin/users",
      "/guide",
    ]);
    for (const path of PRESENTATION_ROUTE_LINKS) {
      expect(isPresentationRouteLink(path)).toBe(true);
    }
    for (const path of [
      "/reviews",
      "/checkout/failed",
      "/checkout/processing",
      "/checkout/complete",
      "https://example.com",
      "//evil.example",
      "../admin",
    ]) {
      expect(isPresentationRouteLink(path)).toBe(false);
    }
  });

  it.each([
    ["paid", null, "発送準備待ち"],
    ["paid", "pending", "発送準備待ち"],
    ["preparing", "pending", "発送準備中"],
    ["shipped", "shipped", "発送済み"],
    ["delivered", "delivered", "配送完了"],
  ] as const)("maps shipment display for %s + %s", (orderStatus, shipmentStatus, expected) => {
    expect(shipmentDisplayLabel(orderStatus, shipmentStatus)).toBe(expected);
  });
});
