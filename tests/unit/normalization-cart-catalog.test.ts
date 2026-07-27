import { addCartQuantity, maximumCartQuantity, mergeCartQuantity } from "@/domain/services/cart";
import {
  activeTotalStock,
  adminProductStockState,
  matchesFacetGroups,
} from "@/domain/services/catalog";
import {
  normalizeCode,
  normalizeComparisonText,
  normalizeEmail,
  normalizeSearchText,
  projectOptionScopeKey,
} from "@/domain/services/normalization";

describe("normalization", () => {
  it("uses the shared NFKC, case, and whitespace rules", () => {
    expect(normalizeComparisonText("  Ｓｃｅｎａｒｉｏ   SHOP  ")).toBe("scenario shop");
    expect(normalizeSearchText("  スポ   ボトル ")).toBe("スポ ボトル");
    expect(normalizeEmail("  GOLD＠EXAMPLE.COM ")).toBe("gold@example.com");
    expect(normalizeCode(" p-００１_abc ")).toBe("P-001_ABC");
    expect(() => normalizeCode("P 001")).toThrow(TypeError);
  });

  it("projects active and inactive option scope keys deterministically", () => {
    expect(
      projectOptionScopeKey({
        id: "variant-1",
        isActive: true,
        optionValue: null,
      }),
    ).toBe("__SINGLE_ACTIVE__");
    expect(
      projectOptionScopeKey({
        id: "variant-2",
        isActive: true,
        optionValue: "  ＲＥＤ ",
      }),
    ).toBe("red");
    expect(
      projectOptionScopeKey({
        id: "variant-2",
        isActive: false,
        optionValue: "RED",
      }),
    ).toBe("__INACTIVE__:variant-2");
  });
});

describe("cart and catalog policies", () => {
  it("rejects updates above the minimum of stock, purchase, and global limits", () => {
    expect(maximumCartQuantity({ stockQuantity: 100, purchaseLimit: 5 })).toBe(5);
    expect(
      addCartQuantity({
        currentQuantity: 3,
        addQuantity: 2,
        stockQuantity: 20,
        purchaseLimit: 5,
      }),
    ).toBe(5);
    expect(() =>
      addCartQuantity({
        currentQuantity: 3,
        addQuantity: 3,
        stockQuantity: 20,
        purchaseLimit: 5,
      }),
    ).toThrow(RangeError);
  });

  it("merges a guest cart up to the permitted maximum and reports overflow", () => {
    expect(
      mergeCartQuantity({
        userQuantity: 3,
        guestQuantity: 4,
        stockQuantity: 20,
        purchaseLimit: 5,
      }),
    ).toEqual({
      mergedQuantity: 5,
      addedQuantity: 2,
      overflowQuantity: 2,
    });
  });

  it("uses active SKU total stock and facet OR-within/AND-between semantics", () => {
    expect(
      activeTotalStock([
        { isActive: true, stockQuantity: 2 },
        { isActive: true, stockQuantity: 3 },
        { isActive: false, stockQuantity: 100 },
      ]),
    ).toBe(5);
    expect(adminProductStockState(0)).toBe("out_of_stock");
    expect(adminProductStockState(5)).toBe("low_stock");
    expect(adminProductStockState(6)).toBe("in_stock");
    expect(
      matchesFacetGroups({
        productCategoryId: "category-a",
        productBrandId: "brand-b",
        selectedCategoryIds: ["category-a", "category-b"],
        selectedBrandIds: ["brand-b"],
      }),
    ).toBe(true);
  });
});
