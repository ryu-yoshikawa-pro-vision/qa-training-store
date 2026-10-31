import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COVERAGE_PATH,
  validateCoverage,
} from "../../scripts/training/validate-supported-behaviors.mjs";

const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, COVERAGE_PATH), "utf8"));
const mutated = (edit) => {
  const next = structuredClone(data);
  edit(next);
  return next;
};

describe("サポート機能の仕様と実装の追跡", () => {
  it("separates supported behaviors from BR/AC and cross-cutting requirements", () => {
    const result = validateCoverage({ root });
    expect(result).toMatchObject({
      screens: 38,
      screen_actions: 73,
      screen_action_segments: 172,
      non_default_states: 20,
      unreviewed_state_conditions: 2,
      br_ac: 46,
      use_case_methods: 76,
      supported_total: 188,
      classified: 188,
      basically_analyzed: 67,
      requires_review: 121,
      classified_rate: 100,
      basic_analysis_rate: 35.64,
      complete: false,
    });
    expect(data.requirements).toHaveLength(79);
    for (const id of [
      "UC-AUTH-LOGOUT",
      "UC-ADMIN-DUPLICATE-PRODUCT",
      "UC-ADMIN-DELETE-DRAFT",
      "UC-REVIEW-DELETE",
      "UC-CART-ACCEPT-PRICES",
      "UC-ACCOUNT-DELETE-ADDRESS",
      "UC-ADMIN-REORDER-CATEGORIES",
      "UC-ADMIN-BULK-CHANGE-PRODUCT-STATUS",
      "UC-ADMIN-BULK-REVIEW-VISIBILITY",
    ]) {
      expect(data.behaviors.some((entry) => entry.id === id)).toBe(true);
    }
  });

  it("audits confirmation display, stale Cart, price change and correction routes", () => {
    for (const id of [
      "SCREEN-CHECKOUT-CONFIRM-A01-01",
      "SCREEN-CHECKOUT-CONFIRM-A01-03",
      "SCREEN-CHECKOUT-CONFIRM-A02-01",
      "SCREEN-CHECKOUT-CONFIRM-A02-02",
      "SCREEN-CHECKOUT-CONFIRM-A02-03",
      "SCREEN-CHECKOUT-CONFIRM-S-stale-cart",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.getConfirmation");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    expect(
      data.behaviors.find((entry) => entry.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")
        ?.analysis_status,
    ).toBe("review_required");
  });

  it("audits payment processing and persisted results without SUT changes", () => {
    for (const id of [
      "SCREEN-CHECKOUT-PROCESSING-A01-01",
      "SCREEN-CHECKOUT-PROCESSING-A02-01",
      "SCREEN-CHECKOUT-COMPLETE-A01-01",
      "SCREEN-CHECKOUT-FAILED-A02-01",
      "SCREEN-CHECKOUT-FAILED-A02-02",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases?.length).toBeGreaterThan(0);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    for (const id of [
      "SCREEN-CHECKOUT-FAILED-A01-01",
      "SCREEN-CHECKOUT-FAILED-A01-02",
      "SCREEN-CHECKOUT-FAILED-A01-03",
    ]) {
      expect(data.behaviors.find((item) => item.id === id)?.analysis_status).toBe(
        "review_required",
      );
    }
  });

  it("audits customer order list empty, processing, and failed states", () => {
    for (const id of [
      "SCREEN-ORDERS-LIST-A02-01",
      "SCREEN-ORDERS-LIST-A02-02",
      "SCREEN-ORDERS-LIST-A02-03",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.listMyOrders");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-ORDERS-LIST-A01-02")?.analysis_status,
    ).toBe("review_required");
  });

  it("audits customer order detail ownership, snapshots, and review eligibility", () => {
    for (const id of [
      "SCREEN-ORDERS-DETAIL-A01-03",
      "SCREEN-ORDERS-DETAIL-A02-01",
      "SCREEN-ORDERS-DETAIL-A02-02",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.getMyCustomerOrder");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    for (const id of [
      "SCREEN-ORDERS-DETAIL-A01-01",
      "SCREEN-ORDERS-DETAIL-A01-02",
      "SCREEN-ORDERS-LIST-A01-02",
    ]) {
      expect(data.behaviors.find((item) => item.id === id)?.analysis_status).toBe(
        "review_required",
      );
    }
  });

  it("audits payment resume and customer-owned order lists without SUT changes", () => {
    for (const [id, useCase] of [
      ["SCREEN-CHECKOUT-PROCESSING-A01-02", "CheckoutOrderUseCases.resumePayment"],
      ["SCREEN-ORDERS-LIST-A01-01", "CheckoutOrderUseCases.listMyOrders"],
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain(useCase);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    for (const id of [
      "SCREEN-CHECKOUT-PROCESSING-A02-02",
      "SCREEN-CHECKOUT-PROCESSING-A02-03",
      "SCREEN-ORDERS-LIST-A01-02",
    ]) {
      expect(data.behaviors.find((item) => item.id === id)?.analysis_status).toBe(
        "review_required",
      );
    }
  });

  it("requires audited checkout confirmation and keeps address-input scope unresolved", () => {
    for (const id of ["SCREEN-CHECKOUT-CONFIRM-A01-02", "SCREEN-CHECKOUT-CONFIRM-A01-04"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.getConfirmation");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")?.analysis_status,
    ).toBe("review_required");
  });

  it("preserves evidence-backed address analysis and unresolved boundaries", () => {
    for (const id of ["SCREEN-CHECKOUT-ADDRESSES-A01-01", "UC-ACCOUNT-DELETE-ADDRESS"]) {
      const item = data.behaviors.find((behavior) => behavior.id === id);
      expect(item?.analysis_status).toBe("analyzed");
      expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(item?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    for (const id of [
      "UC-CART-ACCEPT-PRICES",
      "UC-ADMIN-REORDER-CATEGORIES",
      "UC-ACCOUNT-SUGGEST-ADDRESS",
    ]) {
      const item = data.behaviors.find((behavior) => behavior.id === id);
      expect(item?.analysis_status).toBe("analyzed");
      expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(item?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("requires audited address creation, editing and empty-state evidence", () => {
    for (const id of [
      "SCREEN-CHECKOUT-ADDRESSES-A01-02",
      "SCREEN-CHECKOUT-ADDRESSES-A01-03",
      "SCREEN-CHECKOUT-ADDRESSES-A02-01",
      "SCREEN-CHECKOUT-ADDRESSES-S-empty",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    const setting = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESSES-A01-04");
    expect(setting?.analysis_status).toBe("analyzed");
    expect(setting?.action).toBe("既定の配送先に設定する");
    expect(setting?.related_use_cases).toContain("AccountUseCases.updateAddress");
    expect(setting?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(setting?.audit_branch_refs?.length).toBeGreaterThan(0);
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")?.analysis_status,
    ).toBe("review_required");
  });

  it("separately audits the four profile behaviors and Native benefits", () => {
    for (const id of [
      "SCREEN-AUTH-ACCOUNT-PROFILE-A01-01",
      "SCREEN-AUTH-ACCOUNT-PROFILE-A01-02",
      "SCREEN-AUTH-ACCOUNT-PROFILE-A01-03",
      "SCREEN-AUTH-ACCOUNT-PROFILE-A02-01",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.related_use_cases).toContain("AccountUseCases.getProfile");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("audits the Web-only checkout resume state and its independently reviewed parent", () => {
    const state = data.behaviors.find(
      (item) => item.id === "SCREEN-CHECKOUT-ADDRESS-S-resume-notice",
    );
    expect(state?.analysis_status).toBe("analyzed");
    expect(state?.covered_by).toBe("SCREEN-CHECKOUT-ADDRESS-A02-01");
    expect(state?.platform).toBe("web-desktop");
    expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(state?.audit_branch_refs?.length).toBeGreaterThan(0);
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A02-01")?.analysis_status,
    ).toBe("analyzed");
  });

  it("audits payment-step navigation while retaining the platform selection question", () => {
    const next = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-02");
    expect(next?.analysis_status).toBe("analyzed");
    expect(next?.related_use_cases).toContain("CheckoutOrderUseCases.setAddress");
    expect(next?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(next?.audit_branch_refs?.length).toBeGreaterThan(0);
    const selection = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01");
    expect(selection?.analysis_status).toBe("review_required");
  });

  it("audits session resume and replacement without certifying address selection policy", () => {
    for (const id of ["SCREEN-CHECKOUT-ADDRESS-A02-01", "SCREEN-CHECKOUT-ADDRESS-A02-03"]) {
      const action = data.behaviors.find((item) => item.id === id);
      expect(action?.analysis_status).toBe("analyzed");
      expect(action?.related_use_cases).toContain("CheckoutOrderUseCases.start");
      expect(action?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(action?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")?.analysis_status,
    ).toBe("review_required");
  });

  it("audits payment selection and confirmation navigation", () => {
    for (const id of ["SCREEN-CHECKOUT-PAYMENT-A01-01", "SCREEN-CHECKOUT-PAYMENT-A01-02"]) {
      const action = data.behaviors.find((item) => item.id === id);
      expect(action?.analysis_status).toBe("analyzed");
      expect(action?.related_use_cases).toContain("CheckoutOrderUseCases.setPayment");
      expect(action?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(action?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("audits incomplete and stale payment sessions on both platforms", () => {
    for (const id of ["SCREEN-CHECKOUT-PAYMENT-A02-01", "SCREEN-CHECKOUT-PAYMENT-A02-02"]) {
      const action = data.behaviors.find((item) => item.id === id);
      expect(action?.analysis_status).toBe("analyzed");
      expect(action?.related_use_cases).toContain("CheckoutOrderUseCases.getActive");
      expect(action?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(action?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("audits the completed-order number and history links against the owned order", () => {
    for (const id of ["SCREEN-CHECKOUT-COMPLETE-A01-02", "SCREEN-CHECKOUT-COMPLETE-A01-03"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.getMyOrder");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("audits home and Cart empty states, retaining catalog discrepancy", () => {
    for (const id of ["SCREEN-STOREFRONT-HOME-S-empty-catalog", "SCREEN-STOREFRONT-CART-S-empty"]) {
      const state = data.behaviors.find((item) => item.id === id);
      expect(state?.analysis_status).toBe("analyzed");
      expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(state?.audit_branch_refs?.length).toBeGreaterThan(0);
      expect(state?.related_use_cases?.length).toBeGreaterThan(0);
    }
    const unresolved = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty",
    );
    expect(unresolved?.analysis_status).toBe("review_required");
    expect(unresolved?.basic_analysis_review).toContain("action=null");
  });

  it("audits a zero-stock single-SKU product without changing the SUT", () => {
    const state = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-S-out-of-stock",
    );
    expect(state?.analysis_status).toBe("analyzed");
    expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(state?.related_use_cases).toContain("CatalogUseCases.getProductDetail");
    expect(state?.audit_branch_refs?.length).toBeGreaterThan(8);
    expect(state?.seed_evidence?.scenario).toBe("out-of-stock");
    expect(state?.test_condition).toContain("product-out-of-stock");
    expect(state?.test_condition).toContain("product-basic-shirt");
    expect(state?.test_condition).toContain("disabled");
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03")
        ?.analysis_status,
    ).toBe("review_required");
  });

  it("audits invalid Cart ownership and preserves unresolved inventory status", () => {
    const state = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-CART-S-invalid-items",
    );
    expect(state?.analysis_status).toBe("analyzed");
    expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(state?.related_use_cases).toContain("CartUseCases.getCart");
    expect(state?.related_use_cases).toContain("CartUseCases.acceptPriceChanges");
    expect(state?.audit_branch_refs?.length).toBeGreaterThan(8);
    expect(state?.test_condition).toContain("regular");
    expect(state?.test_condition).toContain("aria-disabled");
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-ADMIN-INVENTORIES-S-stock-boundaries")
        ?.analysis_status,
    ).toBe("review_required");
  });

  it("audits empty orders and reviewable order states without SUT changes", () => {
    for (const id of ["SCREEN-ORDERS-LIST-S-empty", "SCREEN-ORDERS-DETAIL-S-reviewable"]) {
      const state = data.behaviors.find((item) => item.id === id);
      expect(state?.analysis_status).toBe("analyzed");
      expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(state?.audit_branch_refs?.length).toBeGreaterThan(5);
      expect(state?.related_use_cases?.length).toBe(1);
    }
  });

  it("audits staff-only many-products while retaining unresolved filter behavior", () => {
    const state = data.behaviors.find(
      (item) => item.id === "SCREEN-ADMIN-PRODUCTS-S-many-products",
    );
    expect(state?.analysis_status).toBe("analyzed");
    expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(state?.related_use_cases).toContain("AdminProductUseCases.search");
    expect(state?.audit_branch_refs?.length).toBeGreaterThan(7);
    expect(state?.test_condition).toContain("1000");
    expect(state?.test_condition).toContain("50");
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-ADMIN-PRODUCTS-A01-02")?.analysis_status,
    ).toBe("review_required");
  });

  it("audits pagination and the staff-only mobile warning without SUT changes", () => {
    for (const id of [
      "SCREEN-STOREFRONT-PRODUCT-LIST-S-many-products",
      "SCREEN-ADMIN-DASHBOARD-S-admin-mobile-warning",
    ]) {
      const state = data.behaviors.find((item) => item.id === id);
      expect(state?.analysis_status).toBe("analyzed");
      expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(state?.audit_branch_refs?.length).toBeGreaterThan(5);
      expect(state?.related_use_cases?.length).toBe(1);
    }
    const pagination = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-LIST-A01-02",
    );
    expect(pagination?.analysis_status).toBe("analyzed");
    expect(pagination?.related_use_cases).toContain("CatalogUseCases.search");
    expect(pagination?.audit_branch_refs?.length).toBeGreaterThan(8);
    const detailNavigation = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-LIST-A02-01",
    );
    expect(detailNavigation?.analysis_status).toBe("analyzed");
    expect(detailNavigation?.related_use_cases).toContain("CatalogUseCases.search");
    expect(detailNavigation?.related_use_cases).toContain("CatalogUseCases.getProductDetail");
    expect(detailNavigation?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(detailNavigation?.audit_branch_refs?.length).toBeGreaterThan(8);
    const purchaseEntry = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-LIST-A02-02",
    );
    expect(purchaseEntry?.analysis_status).toBe("analyzed");
    expect(purchaseEntry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(purchaseEntry?.related_use_cases).toEqual([
      "CatalogUseCases.search",
      "CatalogUseCases.getProductDetail",
    ]);
    expect(purchaseEntry?.audit_branch_refs?.length).toBeGreaterThan(10);
    expect(purchaseEntry?.expected).toContain("直接購入ボタンではない");
    expect(purchaseEntry?.test_condition).toContain("Native");
    expect(purchaseEntry?.test_condition).toContain("P-0006");
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-ADMIN-DASHBOARD-A02-01")?.analysis_status,
    ).toBe("review_required");
  });

  it("audits low stock and search zero results without modifying the SUT", () => {
    for (const id of [
      "SCREEN-STOREFRONT-PRODUCT-DETAIL-S-low-stock",
      "SCREEN-STOREFRONT-SEARCH-S-no-results",
    ]) {
      const state = data.behaviors.find((item) => item.id === id);
      expect(state?.analysis_status).toBe("analyzed");
      expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(state?.audit_branch_refs?.length).toBeGreaterThan(5);
      expect(state?.related_use_cases?.length).toBe(1);
    }
    const pendingProductAction = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-05",
    );
    expect(pendingProductAction?.analysis_status).toBe("analyzed");
    const searchAction = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-SEARCH-A02-01",
    );
    expect(searchAction?.analysis_status).toBe("analyzed");
    expect(searchAction?.related_use_cases).toContain("CatalogUseCases.search");
    expect(searchAction?.audit_branch_refs?.length).toBeGreaterThan(8);
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-STOREFRONT-SEARCH-A02-02")?.analysis_status,
    ).toBe("review_required");
  });

  it("audits Web login validation without certifying the parent login action", () => {
    const state = data.behaviors.find((item) => item.id === "SCREEN-AUTH-LOGIN-S-validation-error");
    expect(state?.analysis_status).toBe("analyzed");
    expect(state?.platform).toBe(
      "web-desktop（Androidはdefault画面対象だがvalidation-error視覚正本の必須対象外）",
    );
    expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(state?.related_use_cases).toContain("AuthUseCases.login");
    expect(state?.audit_branch_refs?.length).toBeGreaterThan(5);
    const parent = data.behaviors.find((item) => item.id === "SCREEN-AUTH-LOGIN-A02-01");
    expect(parent?.analysis_status).toBe("review_required");
  });

  it("audits Signup validation and published review state", () => {
    for (const [id, useCase] of [
      ["SCREEN-AUTH-SIGNUP-S-validation-error", "AuthUseCases.register"],
      ["SCREEN-REVIEWS-EDITOR-S-published", "CustomerReviewUseCases.getEligibility"],
    ]) {
      const state = data.behaviors.find((item) => item.id === id);
      expect(state?.analysis_status).toBe("analyzed");
      expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(state?.related_use_cases).toContain(useCase);
      expect(state?.audit_branch_refs?.length).toBeGreaterThan(5);
    }
    for (const id of ["SCREEN-AUTH-SIGNUP-A02-01", "SCREEN-REVIEWS-EDITOR-A01-02"]) {
      expect(data.behaviors.find((item) => item.id === id)?.analysis_status).toBe(
        "review_required",
      );
    }
  });

  it("audits the staff discontinue confirmation without certifying the product mutation", () => {
    const state = data.behaviors.find(
      (item) => item.id === "SCREEN-ADMIN-PRODUCT-DETAIL-S-discontinue-confirm",
    );
    expect(state?.analysis_status).toBe("analyzed");
    expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(state?.related_use_cases).toContain("AdminProductUseCases.changeStatus");
    expect(state?.test_condition).toContain("changeStatus未呼出し");
    expect(state?.audit_branch_refs?.length).toBeGreaterThan(8);
    const parent = data.behaviors.find((item) => item.id === "SCREEN-ADMIN-PRODUCT-DETAIL-A02-03");
    expect(parent?.analysis_status).toBe("review_required");
  });

  it("audits Home newest and active Sale products across Web and Native", () => {
    for (const id of ["SCREEN-STOREFRONT-HOME-A01-03", "SCREEN-STOREFRONT-HOME-A01-04"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.related_use_cases).toContain("CatalogUseCases.getHome");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(8);
    }
    const category = data.behaviors.find((item) => item.id === "SCREEN-STOREFRONT-HOME-A01-02");
    expect(category?.analysis_status).toBe("review_required");
  });

  it("audits catalog visibility and product images across Web and Native", () => {
    for (const [id, useCase] of [
      ["SCREEN-STOREFRONT-PRODUCT-LIST-A01-01", "CatalogUseCases.search"],
      ["SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-01", "CatalogUseCases.getProductDetail"],
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain(useCase);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(8);
      expect(entry?.test_condition).toContain("Native");
    }
    for (const id of [
      "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty",
      "SCREEN-ADMIN-INVENTORIES-S-stock-boundaries",
    ]) {
      expect(data.behaviors.find((item) => item.id === id)?.analysis_status).toBe(
        "review_required",
      );
    }
  });

  it("audits storefront facet combinations and deterministic sorting", () => {
    for (const [id, expectedMarker] of [
      ["SCREEN-STOREFRONT-PRODUCT-LIST-A01-03", "同一ファセット内OR"],
      ["SCREEN-STOREFRONT-PRODUCT-LIST-A01-04", "productCode"],
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CatalogUseCases.search");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(8);
      expect(entry?.test_condition).toContain("Native");
      expect(entry?.expected).toContain(expectedMarker);
    }
  });

  it("audits product detail pricing and published review summaries", () => {
    for (const id of [
      "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-02",
      "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-03",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.related_use_cases).toContain("CatalogUseCases.getProductDetail");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(10);
      expect(entry?.test_condition).toContain("Native");
    }
    const price = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-02",
    );
    const review = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-03",
    );
    expect(price?.expected).toContain("6080");
    expect(price?.expected).toContain("7600");
    expect(review?.expected).toContain("hidden/deleted");
    expect(review?.expected).toContain("0除算");
  });

  it("audits stock and purchase-limit boundaries without conflating Web and Native", () => {
    const entry = data.behaviors.find(
      (item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-05",
    );
    expect(entry?.analysis_status).toBe("analyzed");
    expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(entry?.related_use_cases).toContain("CatalogUseCases.getProductDetail");
    expect(entry?.audit_branch_refs?.length).toBeGreaterThan(10);
    expect(entry?.test_condition).toContain("P-0006");
    expect(entry?.expected).toContain("min(stockQuantity,purchaseLimit)");
    expect(entry?.test_condition).toContain("Native");
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-04")
        ?.analysis_status,
    ).toBe("review_required");
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01")
        ?.analysis_status,
    ).toBe("review_required");
  });

  it("detects changed implementation and Seed evidence", () => {
    const badCode = mutated((next) => {
      next.behaviors[0].implementation_evidence.signature = "not the actual source line";
    });
    expect(() => validateCoverage({ root, data: badCode })).toThrow(/changed implementation/);

    const badSeed = mutated((next) => {
      next.behaviors[0].seed_evidence.transform.signature = "unknown transformation";
    });
    expect(() => validateCoverage({ root, data: badSeed })).toThrow(/changed seed transform/);
  });

  it("rejects a state condition linked to a different screen", () => {
    const changed = mutated((next) => {
      next.behaviors.find((item) => item.kind === "state").covered_by = "UC-AUTH-LOGOUT";
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(/unlinked state condition/);
  });
  it("does not certify semantic analysis merely because required fields are nonempty", () => {
    const changed = mutated((next) => {
      next.behaviors[0].analysis_status = "analyzed";
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /analysis lacks verified evidence/,
    );
  });

  it("rejects a missing split action even when its source line has remaining actions", () => {
    const changed = mutated((next) => {
      next.behaviors.splice(
        next.behaviors.findIndex((item) => item.kind === "action"),
        1,
      );
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(/unclassified action subcases/);
  });

  it("rejects missing business rules, non-default states and Use Case method mappings", () => {
    const rule = mutated((next) => {
      next.requirements = next.requirements.filter((item) => item.id !== "BR-CART-001");
    });
    expect(() => validateCoverage({ root, data: rule })).toThrow(/BR\/AC missing/);

    const state = mutated((next) => {
      next.behaviors = next.behaviors.filter((item) => item.kind !== "state");
    });
    expect(() => validateCoverage({ root, data: state })).toThrow(/non-default UI states missing/);

    const method = mutated((next) => {
      next.use_case_methods = next.use_case_methods.filter(
        (entry) => entry.id !== "CustomerReviewUseCases.delete",
      );
    });
    expect(() => validateCoverage({ root, data: method })).toThrow(
      /public Use Case methods missing/,
    );
  });

  it("rejects duplicate behavior semantics even if its identifier is different", () => {
    const changed = mutated((next) => {
      const clone = structuredClone(next.behaviors[0]);
      clone.id = "OTHER-ID";
      next.behaviors.push(clone);
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /duplicate equivalent behavior/,
    );
  });

  it("does not accept a missing review evidence for an analyzed record", () => {
    const changed = mutated((next) => {
      next.behaviors[0].analysis_status = "analyzed";
      next.behaviors[0].reviewed_against = ["specification"];
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /analysis lacks verified evidence/,
    );
  });

  it("rejects invalid requirement references and platform-role mappings", () => {
    const unknown = mutated((next) => {
      next.behaviors.find((item) => item.id === "UC-REVIEW-DELETE").requirement_refs = [
        "UNKNOWN-REQUIREMENT",
      ];
    });
    expect(() => validateCoverage({ root, data: unknown })).toThrow(
      /unknown requirement reference/,
    );
    const role = mutated((next) => {
      const item = next.behaviors.find(
        (behavior) => behavior.id === "SCREEN-STOREFRONT-HOME-A01-01",
      );
      item.platform_roles = null;
      item.role = "platform_rolesを参照";
    });
    expect(() => validateCoverage({ root, data: role })).toThrow(/missing platform-specific role/);
  });
});
