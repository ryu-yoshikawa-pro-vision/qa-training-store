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

// 基本静的分析の完了は、製品適合・Web/Native実Runの受入を意味しない。
// review_requiredのままの操作・状態と、分析済みだが実行未受入の操作を区別する。
const expectAuditedOrAwaitingReanalysis = (entry) => {
  expect(entry).toBeDefined();
  if (entry.analysis_status === "analyzed") return;
  expect(entry.analysis_status).toBe("review_required");
  expect(entry.analysis_progress).toContain("#210");
};

describe("サポート機能の仕様と実装の追跡", () => {
  it("keeps #212 basic static analysis separate from runtime acceptance", () => {
    for (const id of [
      "SCREEN-CHECKOUT-ADDRESS-A01-01",
      "SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03",
      "SCREEN-STOREFRONT-SEARCH-A02-02",
      "SCREEN-AUTH-LOGIN-A02-01",
      "SCREEN-AUTH-SIGNUP-A02-01",
      "SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.analysis_progress).toMatch(/未受入|別受入/);
    }
  });

  it("separates supported behaviors from BR/AC and cross-cutting requirements", () => {
    const operations = data.behaviors.filter((entry) => entry.kind !== "state");
    const states = data.behaviors.filter((entry) => entry.kind === "state");
    const analyzedCount = operations.filter((entry) => entry.analysis_status === "analyzed").length;
    const blockedCount = operations.filter((entry) => entry.analysis_status === "blocked").length;
    const statePendingCount = states.filter((entry) => entry.analysis_status !== "analyzed").length;
    const reviewCount = operations.length - analyzedCount - blockedCount;
    const analyzedRate = Math.round((analyzedCount / operations.length) * 10000) / 100;
    const result = validateCoverage({ root });
    expect(result).toMatchObject({
      screens: 38,
      screen_actions: 73,
      screen_action_segments: 172,
      non_default_states: 20,
      unreviewed_state_conditions: statePendingCount,
      br_ac: 46,
      use_case_methods: 76,
      supported_total: 188,
      classified: 188,
      basically_analyzed: analyzedCount,
      requires_review: reviewCount,
      classified_rate: 100,
      basic_analysis_rate: analyzedRate,
      unreviewed_requirements: data.requirements.filter(
        (entry) => entry.analysis_status !== "analyzed",
      ).length,
      complete:
        analyzedCount === operations.length &&
        blockedCount === 0 &&
        statePendingCount === 0 &&
        data.requirements.every((entry) => entry.analysis_status === "analyzed"),
    });
    expect(operations).toHaveLength(188);
    expect(states).toHaveLength(20);
    expect(result.supported_total).toBe(analyzedCount + blockedCount + reviewCount);
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

  it("requires reviewed source expectations and evidence for all 79 requirements", () => {
    const result = validateCoverage({ root });
    expect(result.unreviewed_requirements).toBe(0);
    expect(data.requirements).toHaveLength(79);
    const directlyLinked = new Set(
      data.behaviors.flatMap((item) => item.requirement_refs ?? []),
    );
    const crossCutting = data.requirements.filter((item) => !directlyLinked.has(item.id));
    expect(crossCutting).toHaveLength(29);
    for (const item of data.requirements) {
      expect(item.analysis_status).toBe("analyzed");
      expect(item.requirement_analysis.representative_behaviors.length).toBeGreaterThan(0);
      if (!directlyLinked.has(item.id)) {
        expect(item.requirement_analysis.assignment).toContain("直接参照なし");
        expect(item.requirement_analysis.cross_cutting_contract).toMatch(
          /^(tests|e2e)\//,
        );
      }
    }
  });

  it("rejects incorrect requirement expectations or fabricated traceability", () => {
    for (const edit of [
      (item) => {
        item.expected = "formal business rule";
      },
      (item) => {
        item.requirement_analysis.source.heading_line += 1;
      },
      (item) => {
        item.requirement_analysis.source.expectation_line += 1;
      },
      (item) => {
        item.requirement_analysis.representative_behaviors = ["NOT-AN-EXISTING-BEHAVIOR"];
      },
      (item) => {
        item.requirement_analysis.implementation_refs[0].line += 1;
      },
    ]) {
      const changed = mutated((next) => {
        edit(next.requirements.find((item) => item.id === "AC-STOREFRONT-001"));
      });
      expect(() => validateCoverage({ root, data: changed })).toThrow(
        /requirement analysis lacks verified evidence/,
      );
    }
    const crossCutting = mutated((next) => {
      next.requirements.find((item) => item.id === "ROLE-01")
        .requirement_analysis.cross_cutting_contract = "tests/contracts/not-found.ts";
    });
    expect(() => validateCoverage({ root, data: crossCutting })).toThrow(
      /requirement analysis lacks verified evidence/,
    );
  });

  it("tracks Signup Web/Native destinations without claiming runtime PASS", () => {
    const signup = data.behaviors.find((entry) => entry.id === "SCREEN-AUTH-SIGNUP-A02-03");
    expect(signup?.analysis_status).toBe("analyzed");
    expect(signup?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(signup?.related_use_cases).toContain("AuthUseCases.register");
    expect(signup?.expected).toContain("/account/profile");
    expect(signup?.expected).toContain("refreshIdentity");
    expect(signup?.test_condition).toContain("実Web/Android");
    expect(signup?.basic_analysis_review).toContain("未確認");
  });

  it("audits 12/13 variant presentation and stock-zero Web/Native differences without runtime PASS", () => {
    const item = data.behaviors.find(
      (entry) => entry.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A01-04",
    );
    expect(item?.analysis_status).toBe("analyzed");
    expect(item?.related_use_cases).toContain("CatalogUseCases.getProductDetail");
    expect(item?.test_condition).toContain("P-0010");
    expect(item?.test_condition).toContain("P-0011");
    expect(item?.test_condition).toContain("P-0006");
    expect(item?.expected).toContain("Native");
    expect(item?.basic_analysis_review).toContain("実Web/Android/視覚");
    expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(item?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/application/use-cases/catalog-use-cases.ts",
        "src/infrastructure/database/dexie/storefront-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-repositories.ts",
        "src/presentation/pages/product-detail-page.tsx",
        "src/presentation/native/native-screens.tsx",
        "src/presentation/native/native-variation-selection.ts",
        "src/seeds/default-dataset.ts",
      ]),
    );
  });

  it("audits Cart removal ownership, version checks, and empty-state transition on Web/Native", () => {
    const item = data.behaviors.find((entry) => entry.id === "SCREEN-STOREFRONT-CART-A02-03");
    expect(item?.analysis_status).toBe("analyzed");
    expect(item?.related_use_cases).toContain("CartUseCases.removeItem");
    expect(item?.test_condition).toContain("cart-item-regular-shirt");
    expect(item?.test_condition).toContain("cartVersion");
    expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(item?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/application/use-cases/cart-use-cases.ts",
        "src/infrastructure/database/dexie/cart-checkout-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-application-repositories.ts",
        "src/presentation/pages/cart-page.tsx",
        "src/presentation/native/native-screens.tsx",
        "src/seeds/default-dataset.ts",
      ]),
    );
  });

  it("audits category isolation and documents Native category-heading divergence", () => {
    const item = data.behaviors.find((entry) => entry.id === "SCREEN-STOREFRONT-CATEGORY-A01-01");
    expect(item?.analysis_status).toBe("analyzed");
    expect(item?.related_use_cases).toEqual(
      expect.arrayContaining(["CatalogUseCases.search", "CatalogUseCases.getCategoryName"]),
    );
    expect(item?.test_condition).toContain("P-0007");
    expect(item?.test_condition).toContain("P-0003");
    expect(item?.test_condition).toContain("P-0006");
    expect(item?.basic_analysis_review).toContain("カテゴリの商品");
    expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(item?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/presentation/pages/catalog-list-page.tsx",
        "src/presentation/native/native-screens.tsx",
        "src/infrastructure/database/dexie/storefront-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-repositories.ts",
        "src/seeds/default-dataset.ts",
      ]),
    );
  });

  it("audits category visibility exclusions across Web and Native without asserting runtime PASS", () => {
    const item = data.behaviors.find((entry) => entry.id === "SCREEN-STOREFRONT-CATEGORY-A02-01");
    expect(item?.analysis_status).toBe("analyzed");
    expect(item?.related_use_cases).toContain("CatalogUseCases.search");
    expect(item?.test_condition).toContain("P-0007");
    expect(item?.test_condition).toContain("P-0003");
    expect(item?.test_condition).toContain("P-0006");
    expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(item?.basic_analysis_review).toContain("実Web/Android/視覚");
    expect(item?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/domain/policies/permissions.ts",
        "src/presentation/pages/catalog-list-page.tsx",
        "src/presentation/native/native-screens.tsx",
        "src/infrastructure/database/dexie/storefront-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-repositories.ts",
        "src/seeds/default-dataset.ts",
      ]),
    );
  });

  it("audits viewer-scoped search suggestions on Web and Android without claiming runtime PASS", () => {
    const item = data.behaviors.find((entry) => entry.id === "SCREEN-STOREFRONT-SEARCH-A01-02");
    expect(item?.analysis_status).toBe("analyzed");
    expect(item?.related_use_cases).toContain("CatalogUseCases.suggest");
    expect(item?.test_condition).toContain("P-0007");
    expect(item?.test_condition).toContain("8件上限");
    expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(item?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/presentation/shells/storefront-shell.tsx",
        "src/presentation/components/search-combobox.tsx",
        "src/presentation/native/native-screens.tsx",
        "src/application/use-cases/catalog-use-cases.ts",
        "src/infrastructure/database/dexie/storefront-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-repositories.ts",
        "src/seeds/default-dataset.ts",
      ]),
    );
    expect(item?.basic_analysis_review).toContain("実Web/Android/視覚");
  });

  it("audits name/code search against viewer visibility on Web and Android", () => {
    const search = data.behaviors.find((entry) => entry.id === "SCREEN-STOREFRONT-SEARCH-A01-01");
    expect(search?.analysis_status).toBe("analyzed");
    expect(search?.related_use_cases).toContain("CatalogUseCases.search");
    expect(search?.test_condition).toContain("P-0001");
    expect(search?.audit_branch_refs?.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        "src/presentation/pages/catalog-list-page.tsx",
        "src/presentation/native/native-screens.tsx",
        "src/infrastructure/database/dexie/storefront-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-repositories.ts",
        "src/seeds/default-dataset.ts",
      ]),
    );
  });

  it("audits Home category links and viewer-specific counts without claiming 0-count parity", () => {
    const item = data.behaviors.find((entry) => entry.id === "SCREEN-STOREFRONT-HOME-A01-02");
    expect(item?.analysis_status).toBe("analyzed");
    expect(item?.related_use_cases).toEqual(
      expect.arrayContaining(["CatalogUseCases.getHome", "CatalogUseCases.search"]),
    );
    expect(item?.test_condition).toContain("ファッション1");
    expect(item?.test_condition).toContain("スポーツ3");
    expect(item?.test_condition).toContain("activeカテゴリー商品0件");
    expect(item?.expected).toContain("0件を含む");
    expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(item?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/infrastructure/database/dexie/storefront-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-repositories.ts",
        "src/presentation/pages/home-page.tsx",
        "src/presentation/native/native-screens.tsx",
        "src/seeds/default-dataset.ts",
      ]),
    );
  });

  it("audits Home product visibility without treating out-of-stock as hidden", () => {
    const home = data.behaviors.find((entry) => entry.id === "SCREEN-STOREFRONT-HOME-A01-01");
    expect(home?.analysis_status).toBe("analyzed");
    expect(home?.related_use_cases).toContain("CatalogUseCases.getHome");
    expect(home?.test_condition).toContain("P-0006");
    expect(home?.audit_branch_refs?.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        "src/infrastructure/database/dexie/storefront-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-repositories.ts",
        "src/seeds/default-dataset.ts",
      ]),
    );
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
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.getConfirmation");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    expect(
      data.behaviors.find((entry) => entry.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")
        ?.analysis_status,
    ).toBe("analyzed");
  });

  it("audits payment processing and persisted results without SUT changes", () => {
    for (const id of [
      "SCREEN-CHECKOUT-PROCESSING-A01-01",
      "SCREEN-CHECKOUT-PROCESSING-A02-01",
      "SCREEN-CHECKOUT-COMPLETE-A01-01",
      "SCREEN-CHECKOUT-FAILED-A02-01",
      "SCREEN-CHECKOUT-FAILED-A02-02",
      "SCREEN-CHECKOUT-FAILED-A01-01",
      "SCREEN-CHECKOUT-FAILED-A01-02",
      "SCREEN-CHECKOUT-FAILED-A01-03",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases?.length).toBeGreaterThan(0);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    const returnAction = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-FAILED-A01-03");
    expect(returnAction?.risk).toContain("High");
    expect(returnAction?.test_condition).toContain("C6=");
    expect(returnAction?.case_policy).toContain("実Run");
  });

  it("audits customer order list empty, processing, and failed states", () => {
    for (const id of [
      "SCREEN-ORDERS-LIST-A02-01",
      "SCREEN-ORDERS-LIST-A02-02",
      "SCREEN-ORDERS-LIST-A02-03",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.listMyOrders");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    const paymentShipment = data.behaviors.find((item) => item.id === "SCREEN-ORDERS-LIST-A01-02");
    expectAuditedOrAwaitingReanalysis(paymentShipment);
    expect(paymentShipment?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(paymentShipment?.related_use_cases).toContain("CheckoutOrderUseCases.listMyOrders");
    expect(paymentShipment?.test_condition).toContain("C6=");
    expect(paymentShipment?.risk).toContain("High");
    expect(paymentShipment?.basic_analysis_review).toContain("一覧");
    expect(paymentShipment?.analysis_progress).toMatch(/未受入|未実施|検証待ち|別管理|別判定/);
  });

  it("audits customer order detail ownership, snapshots, and review eligibility", () => {
    const reviewEligibility = data.behaviors.find(
      (item) => item.id === "SCREEN-ORDERS-DETAIL-A01-03",
    );
    expectAuditedOrAwaitingReanalysis(reviewEligibility);
    expect(reviewEligibility?.reviewed_against).toEqual([
      "specification",
      "implementation",
      "seed",
    ]);
    expect(reviewEligibility?.related_use_cases).toContain(
      "CheckoutOrderUseCases.getMyCustomerOrder",
    );
    expect(reviewEligibility?.related_use_cases).toContain("CustomerReviewUseCases.getEligibility");
    expect(reviewEligibility?.requirement_refs).toContain("AC-REVIEW-001");
    expect(reviewEligibility?.risk).toContain("High");
    expect(reviewEligibility?.test_condition).toContain("TR7/C7=");
    expect(reviewEligibility?.basic_analysis_review).toMatch(
      /未受入|未実施|検証待ち|別管理|別判定/,
    );
    expect(reviewEligibility?.audit_branch_refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "tests/component/checkout-order-pages.test.tsx",
          start_line: 330,
          end_line: 357,
        }),
      ]),
    );
    const ownership = data.behaviors.find((item) => item.id === "SCREEN-ORDERS-DETAIL-A02-01");
    expectAuditedOrAwaitingReanalysis(ownership);
    expect(ownership?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(ownership?.related_use_cases).toContain("CheckoutOrderUseCases.getMyOrder");
    expect(ownership?.risk).toContain("High");
    expect(ownership?.test_condition).toContain("TR7/C7=");
    expect(ownership?.basic_analysis_review).toMatch(/未受入|未実施|検証待ち|別管理|別判定/);
    expect(ownership?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/application/identity/session-identity-resolver.ts",
        "src/application/use-cases/checkout-order-use-cases.ts",
        "src/infrastructure/database/dexie/order-review-repositories.ts",
        "src/infrastructure/database/sqlite/native-customer-application-repositories.ts",
      ]),
    );
    const snapshotAfterChange = data.behaviors.find(
      (item) => item.id === "SCREEN-ORDERS-DETAIL-A02-02",
    );
    expectAuditedOrAwaitingReanalysis(snapshotAfterChange);
    expect(snapshotAfterChange?.reviewed_against).toEqual([
      "specification",
      "implementation",
      "seed",
    ]);
    expect(snapshotAfterChange?.risk).toContain("High");
    expect(snapshotAfterChange?.test_condition).toContain("TR7/C7=");
    expect(snapshotAfterChange?.basic_analysis_review).toMatch(
      /未受入|未実施|検証待ち|別管理|別判定/,
    );
    expect(snapshotAfterChange?.related_use_cases).toEqual(
      expect.arrayContaining([
        "CheckoutOrderUseCases.beginOrder",
        "CheckoutOrderUseCases.getMyCustomerOrder",
        "AdminProductUseCases.update",
        "AccountUseCases.updateAddress",
      ]),
    );
    expect(snapshotAfterChange?.audit_branch_refs?.length).toBeGreaterThan(0);
    for (const id of ["SCREEN-ORDERS-DETAIL-A01-01", "SCREEN-ORDERS-DETAIL-A01-02"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.getMyCustomerOrder");
      if (id === "SCREEN-ORDERS-DETAIL-A01-01") {
        // この操作の証拠は検証済みのimplementation/seed/Use Case参照と個別監査に記録される。
        expect(entry?.implementation_evidence?.path).toBe(
          "src/presentation/pages/checkout-order-pages.tsx",
        );
        expect(entry?.seed_evidence?.path).toBe("src/seeds/metadata.ts");
        expect(entry?.basic_analysis_review).toContain("orders.md");
      } else {
        expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
      }
    }
    const paymentShipment = data.behaviors.find(
      (item) => item.id === "SCREEN-ORDERS-DETAIL-A01-02",
    );
    expect(paymentShipment?.risk).toContain("High");
    expect(paymentShipment?.test_condition).toContain("TR6/C6=");
    expect(paymentShipment?.basic_analysis_review).toContain("timeline");
    expect(paymentShipment?.basic_analysis_review).toMatch(/未受入|未実施|検証待ち|別管理|別判定/);
  });

  it("audits payment resume and customer-owned order lists without SUT changes", () => {
    for (const [id, useCase] of [
      ["SCREEN-CHECKOUT-PROCESSING-A01-02", "CheckoutOrderUseCases.resumePayment"],
      ["SCREEN-ORDERS-LIST-A01-01", "CheckoutOrderUseCases.listMyOrders"],
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain(useCase);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    for (const id of ["SCREEN-CHECKOUT-PROCESSING-A02-02", "SCREEN-CHECKOUT-PROCESSING-A02-03"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.retryPayment");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
      expect(entry?.test_condition).toContain("C1");
      expect(entry?.analysis_progress).toMatch(/未受入|未実施|検証待ち|別管理|別判定/);
    }
    const orderListStatus = data.behaviors.find((item) => item.id === "SCREEN-ORDERS-LIST-A01-02");
    expectAuditedOrAwaitingReanalysis(orderListStatus);
    expect(orderListStatus?.expected).toContain("正式一覧仕様");
    expect(orderListStatus?.test_condition).toContain("同一BASE_CLOCK");
  });

  it("requires audited checkout confirmation and keeps address-input scope unresolved", () => {
    for (const id of ["SCREEN-CHECKOUT-CONFIRM-A01-02", "SCREEN-CHECKOUT-CONFIRM-A01-04"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("CheckoutOrderUseCases.getConfirmation");
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")?.analysis_status,
    ).toBe("analyzed");
  });

  it("preserves evidence-backed address analysis and unresolved boundaries", () => {
    for (const id of ["SCREEN-CHECKOUT-ADDRESSES-A01-01", "UC-ACCOUNT-DELETE-ADDRESS"]) {
      const item = data.behaviors.find((behavior) => behavior.id === id);
      expectAuditedOrAwaitingReanalysis(item);
      expect(item?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(item?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    for (const id of [
      "UC-CART-ACCEPT-PRICES",
      "UC-ADMIN-REORDER-CATEGORIES",
      "UC-ACCOUNT-SUGGEST-ADDRESS",
    ]) {
      const item = data.behaviors.find((behavior) => behavior.id === id);
      expectAuditedOrAwaitingReanalysis(item);
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
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    const setting = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESSES-A01-04");
    expectAuditedOrAwaitingReanalysis(setting);
    expect(setting?.action).toBe("既定の配送先に設定する");
    expect(setting?.related_use_cases).toContain("AccountUseCases.updateAddress");
    expect(setting?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(setting?.audit_branch_refs?.length).toBeGreaterThan(0);
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")?.analysis_status,
    ).toBe("analyzed");
  });

  it("separately audits the four profile behaviors and Native benefits", () => {
    for (const id of [
      "SCREEN-AUTH-ACCOUNT-PROFILE-A01-01",
      "SCREEN-AUTH-ACCOUNT-PROFILE-A01-02",
      "SCREEN-AUTH-ACCOUNT-PROFILE-A01-03",
      "SCREEN-AUTH-ACCOUNT-PROFILE-A02-01",
    ]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
      expect(entry?.related_use_cases).toContain("AccountUseCases.getProfile");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("audits the Web-only checkout resume state and its independently reviewed parent", () => {
    const state = data.behaviors.find(
      (item) => item.id === "SCREEN-CHECKOUT-ADDRESS-S-resume-notice",
    );
    expectAuditedOrAwaitingReanalysis(state);
    expect(state?.covered_by).toBe("SCREEN-CHECKOUT-ADDRESS-A02-01");
    expect(state?.platform).toBe("web-desktop");
    expect(state?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(state?.audit_branch_refs?.length).toBeGreaterThan(0);
    const parent = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A02-01");
    expectAuditedOrAwaitingReanalysis(parent);
  });

  it("audits payment-step navigation while retaining the platform selection question", () => {
    const next = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-02");
    expectAuditedOrAwaitingReanalysis(next);
    expect(next?.related_use_cases).toContain("CheckoutOrderUseCases.setAddress");
    expect(next?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(next?.audit_branch_refs?.length).toBeGreaterThan(0);
    const selection = data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01");
    expect(selection?.analysis_status).toBe("analyzed");
  });

  it("audits session resume and replacement without certifying address selection policy", () => {
    for (const id of ["SCREEN-CHECKOUT-ADDRESS-A02-01", "SCREEN-CHECKOUT-ADDRESS-A02-03"]) {
      const action = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(action);
      expect(action?.related_use_cases).toContain("CheckoutOrderUseCases.start");
      expect(action?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(action?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-CHECKOUT-ADDRESS-A01-01")?.analysis_status,
    ).toBe("analyzed");
  });

  it("audits payment selection and confirmation navigation", () => {
    for (const id of ["SCREEN-CHECKOUT-PAYMENT-A01-01", "SCREEN-CHECKOUT-PAYMENT-A01-02"]) {
      const action = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(action);
      expect(action?.related_use_cases).toContain("CheckoutOrderUseCases.setPayment");
      expect(action?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(action?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("audits incomplete and stale payment sessions on both platforms", () => {
    for (const id of ["SCREEN-CHECKOUT-PAYMENT-A02-01", "SCREEN-CHECKOUT-PAYMENT-A02-02"]) {
      const action = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(action);
      expect(action?.related_use_cases).toContain("CheckoutOrderUseCases.getActive");
      expect(action?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(action?.audit_branch_refs?.length).toBeGreaterThan(0);
    }
  });

  it("audits the completed-order number and history links against the owned order", () => {
    for (const id of ["SCREEN-CHECKOUT-COMPLETE-A01-02", "SCREEN-CHECKOUT-COMPLETE-A01-03"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expectAuditedOrAwaitingReanalysis(entry);
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
    expect(unresolved?.analysis_status).toBe("analyzed");
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
    ).toBe("analyzed");
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
    const inventoryBoundaryState = data.behaviors.find(
      (item) => item.id === "SCREEN-ADMIN-INVENTORIES-S-stock-boundaries",
    );
    expect(inventoryBoundaryState?.analysis_status).toBe("analyzed");
    expect(inventoryBoundaryState?.reviewed_against).toEqual([
      "specification",
      "implementation",
      "seed",
    ]);
    expect(inventoryBoundaryState?.related_use_cases).toContain(
      "AdminOperationsUseCases.searchInventory",
    );
    expect(inventoryBoundaryState?.audit_branch_refs?.length).toBeGreaterThan(8);
    expect(inventoryBoundaryState?.test_condition).toContain("0/1/5/6");
    expect(inventoryBoundaryState?.case_policy).toContain("C7");
    expect(inventoryBoundaryState?.basic_analysis_review).toContain("未受入");
  });

  it("audits empty orders and reviewable order states without SUT changes", () => {
    const empty = data.behaviors.find((item) => item.id === "SCREEN-ORDERS-LIST-S-empty");
    expect(empty?.analysis_status).toBe("analyzed");
    expect(empty?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(empty?.audit_branch_refs?.length).toBeGreaterThan(8);
    expect(empty?.related_use_cases).toContain("CheckoutOrderUseCases.listMyOrders");
    expect(empty?.test_condition).toContain("TR1/C1");
    expect(empty?.case_policy).toContain("C5採用");
    expect(empty?.basic_analysis_review).toContain("個別artifact");
    const reviewable = data.behaviors.find(
      (item) => item.id === "SCREEN-ORDERS-DETAIL-S-reviewable",
    );
    expect(reviewable?.analysis_status).toBe("analyzed");
    expect(reviewable?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(reviewable?.test_condition).toContain("NOT_POSTED5");
    expect(reviewable?.case_policy).toContain("C1〜C7採用");
    expect(reviewable?.basic_analysis_review).toContain("画像比較PASSではない");
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
    ).toBe("analyzed");
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
    ).toBe("analyzed");
    const warningAction = data.behaviors.find(
      (item) => item.id === "SCREEN-ADMIN-DASHBOARD-A02-01",
    );
    expect(warningAction?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(warningAction?.related_use_cases).toContain("AdminMasterUseCases.getOverview");
    expect(warningAction?.audit_branch_refs?.length).toBeGreaterThan(10);
    expect(warningAction?.test_condition).toContain("1023/1024px");
    expect(warningAction?.basic_analysis_review).toContain("未実施");
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
    ).toBe("analyzed");
  });

  it("audits credential and Role/Status login boundaries without Native runtime PASS", () => {
    for (const id of ["SCREEN-AUTH-LOGIN-A01-01", "SCREEN-AUTH-LOGIN-A01-02"]) {
      const entry = data.behaviors.find((item) => item.id === id);
      expect(entry?.analysis_status).toBe("analyzed");
      expect(entry?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
      expect(entry?.related_use_cases).toContain("AuthUseCases.login");
      expect(entry?.test_condition).toContain("suspended@example.com");
      expect(entry?.test_condition).toContain("withdrawn@example.com");
      expect(entry?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
        expect.arrayContaining([
          "src/application/use-cases/auth-use-cases.ts",
          "src/infrastructure/database/dexie/basic-repositories.ts",
          "src/infrastructure/database/sqlite/native-customer-application-repositories.ts",
          "src/seeds/default-dataset.ts",
        ]),
      );
    }
    expect(
      data.behaviors.find((item) => item.id === "SCREEN-AUTH-LOGIN-A02-01")?.analysis_status,
    ).toBe("analyzed");
  });

  it("keeps login refusal separate from the evidence-backed safe returnTo analysis", () => {
    const refusal = data.behaviors.find((item) => item.id === "SCREEN-AUTH-LOGIN-A02-01");
    const redirect = data.behaviors.find((item) => item.id === "SCREEN-AUTH-LOGIN-A02-02");
    expect(refusal?.action).toBe("ログイン拒否理由の表示");
    expect(refusal?.analysis_status).toBe("analyzed");
    expect(redirect?.action).toBe("安全な内部リダイレクト");
    expect(redirect?.analysis_status).toBe("analyzed");
    expect(redirect?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(redirect?.related_use_cases).toEqual(
      expect.arrayContaining(["AuthUseCases.login", "CheckoutOrderUseCases.getActive"]),
    );
    expect(redirect?.test_condition).toContain("STORAGE_READ_FAILED");
    expect(redirect?.test_condition).toContain("重複returnTo");
    expect(redirect?.basic_analysis_review).toContain("実Web/Android E2E");
    expect(redirect?.audit_branch_refs?.map((ref) => ref.path)).toEqual(
      expect.arrayContaining([
        "src/presentation/return-to.ts",
        "src/presentation/pages/auth-pages.tsx",
        "src/presentation/native/native-purchase-screens.tsx",
        "tests/unit/ui-ux-flow-contracts.test.ts",
      ]),
    );
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
    expect(parent?.analysis_status).toBe("analyzed");
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
    for (const id of ["SCREEN-AUTH-SIGNUP-A02-01"]) {
      expect(data.behaviors.find((item) => item.id === id)?.analysis_status).toBe("analyzed");
    }
    const reviewEdit = data.behaviors.find((item) => item.id === "SCREEN-REVIEWS-EDITOR-A01-02");
    expect(reviewEdit?.analysis_status).toBe("analyzed");
    expect(reviewEdit?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(reviewEdit?.related_use_cases).toContain("CustomerReviewUseCases.update");
    expect(reviewEdit?.risk).toContain("High");
    expect(reviewEdit?.test_condition).toContain("TR7/C7=");
    expect(reviewEdit?.basic_analysis_review).toContain("未受入");
    expect(reviewEdit?.audit_branch_refs?.length).toBeGreaterThan(12);
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
    expect(parent?.analysis_status).toBe("analyzed");
    expect(parent?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(parent?.related_use_cases).toContain("AdminProductUseCases.changeStatus");
    expect(parent?.test_condition).toContain("C1 ");
    expect(parent?.test_condition).toContain("C7 ");
    expect(parent?.basic_analysis_review).toContain("基本分析のみanalyzed");
    expect(parent?.basic_analysis_review).toContain("実Web/Role/Session/DB全表前後");
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
    expect(category?.analysis_status).toBe("analyzed");
    expect(category?.related_use_cases).toContain("CatalogUseCases.getHome");
    expect(category?.related_use_cases).toContain("CatalogUseCases.search");
    expect(category?.reviewed_against).toEqual(["specification", "implementation", "seed"]);
    expect(category?.audit_branch_refs?.length).toBeGreaterThan(10);
    expect(category?.case_selection_reason).toContain("未決");
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
    for (const id of ["SCREEN-STOREFRONT-PRODUCT-LIST-S-empty"]) {
      expect(data.behaviors.find((item) => item.id === id)?.analysis_status).toBe("analyzed");
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
      data.behaviors.find((item) => item.id === "SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01")
        ?.analysis_status,
    ).toBe("analyzed");
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
      // The first behavior is already analyzed; a nonempty generic reason must still be rejected.
      next.behaviors[0].case_selection_reason = "正式仕様による";
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
  it("checks each behavior's Use Case evidence against the current public method registry", () => {
    const method = data.use_case_methods.find((item) => item.id === "AdminUserUseCases.search");
    const behavior = data.behaviors.find((item) => item.id === "SCREEN-ADMIN-USERS-A01-02");
    expect(method).toBeDefined();
    expect(behavior?.use_case_evidence?.[0]).toMatchObject({
      id: method.id,
      path: method.source_path,
      line: method.source_line,
      signature: method.signature,
    });
    const wrongReference = (update) => {
      const changed = mutated((next) => {
        const entry = next.behaviors.find((item) => item.id === "SCREEN-ADMIN-USERS-A01-02");
        update(entry);
      });
      expect(() => validateCoverage({ root, data: changed })).toThrow(/Use Case evidence/);
    };
    wrongReference((entry) => {
      entry.use_case_evidence[0].id = "NotAUseCase.method";
    });
    wrongReference((entry) => {
      entry.use_case_evidence[0].id = "AdminUserUseCases.changeRole";
    });
    wrongReference((entry) => {
      entry.use_case_evidence[0].path = "src/application/use-cases/account-use-cases.ts";
    });
    wrongReference((entry) => {
      entry.use_case_evidence[0].line += 1;
    });
    wrongReference((entry) => {
      entry.use_case_evidence[0].signature = "async wrongMethod() {";
    });
    wrongReference((entry) => {
      entry.use_case_evidence.push(structuredClone(entry.use_case_evidence[0]));
    });
    wrongReference((entry) => {
      entry.related_use_cases = [];
    });
  });
  it("documents UI-only and test-control entries without inventing Use Case calls", () => {
    const targets = data.behaviors.filter(
      (entry) => entry.analysis_status === "analyzed" && !entry.related_use_cases?.length,
    );
    expect(targets).toHaveLength(25);
    for (const entry of targets) {
      expect(entry.use_case_relation_review?.length).toBeGreaterThanOrEqual(40);
      expect(entry.use_case_evidence ?? []).toHaveLength(0);
    }
    const changed = mutated((next) => {
      const entry = next.behaviors.find(
        (item) => item.id === "SCREEN-SUPPORTING-GUIDE-A02-01",
      );
      delete entry.use_case_relation_review;
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /missing Use Case relation review/,
    );
  });

  it("rejects generic risk and Case-selection placeholders after the 196-entry audit", () => {
    const audited = data.behaviors.filter((entry) => entry.analysis_status === "analyzed");
    for (const entry of audited) {
      expect(entry.risk).not.toBe("不正操作、競合、データの不整合または所有権逸脱");
      expect(entry.case_policy).not.toBe("許可条件と拒否・競合・状態境界の代表Caseを選定");
    }
    const changed = mutated((next) => {
      next.behaviors.find((entry) => entry.id === "UC-ACCOUNT-UPDATE-PROFILE").risk =
        "不正操作、競合、データの不整合または所有権逸脱";
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /analysis lacks verified evidence/,
    );
  });

});
