import {
  canCheckout,
  canManageStore,
  canManageUsers,
  canUseCart,
  canViewerSeeProduct,
  rankSatisfies,
} from "@/domain/policies/permissions";
import {
  canTransitionAccount,
  canTransitionCheckout,
  canTransitionOrder,
  canTransitionProduct,
  canTransitionReview,
  canTransitionShipment,
} from "@/domain/policies/state-transitions";

describe("permission policies", () => {
  it("enforces role, account status, and rank separately", () => {
    expect(rankSatisfies("platinum", "gold")).toBe(true);
    expect(rankSatisfies("regular", "gold")).toBe(false);
    expect(
      canViewerSeeProduct({
        viewer: { kind: "guest" },
        status: "published",
        requiredRank: "gold",
      }),
    ).toBe(false);
    expect(
      canViewerSeeProduct({
        viewer: {
          kind: "customer",
          userId: "gold",
          membershipRank: "gold",
        },
        status: "published",
        requiredRank: "gold",
      }),
    ).toBe(true);
    expect(canUseCart("guest")).toBe(true);
    expect(canUseCart("operator")).toBe(false);
    expect(canCheckout("customer", "active")).toBe(true);
    expect(canCheckout("customer", "suspended")).toBe(false);
    expect(canManageStore("operator")).toBe(true);
    expect(canManageUsers("operator")).toBe(false);
    expect(canManageUsers("admin")).toBe(true);
  });
});

describe("state transition policies", () => {
  it("accepts only the Phase 1 transition graph", () => {
    expect(canTransitionProduct("draft", "published")).toBe(true);
    expect(canTransitionProduct("discontinued", "published")).toBe(false);
    expect(canTransitionOrder("paid", "preparing")).toBe(true);
    expect(canTransitionOrder("paid", "shipped")).toBe(false);
    expect(canTransitionReview("hidden", "published")).toBe(true);
    expect(canTransitionReview("deleted", "published")).toBe(false);
    expect(canTransitionShipment("pending", "delivered")).toBe(false);
    expect(canTransitionCheckout("active", "expired")).toBe(true);
    expect(canTransitionCheckout("expired", "active")).toBe(false);
    expect(canTransitionAccount("active", "suspended")).toBe(true);
    expect(canTransitionAccount("withdrawn", "active")).toBe(false);
  });
});
