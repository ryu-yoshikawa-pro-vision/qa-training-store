import type { ProductDetail } from "@/application/contracts";
import {
  isNativeVariantSelectable,
  resolveInitialNativeVariantId,
} from "@/presentation/native/native-variation-selection";

function variant(variantId: string, stockQuantity: number): ProductDetail["variants"][number] {
  return {
    variantId,
    sku: variantId,
    optionValue: variantId,
    regularPrice: 1000,
    activeSalePrice: null,
    viewerUnitPrice: 1000,
    stockQuantity,
    purchaseLimit: 2,
  };
}

describe("Native variation selection", () => {
  it("auto-selects only the single available variation", () => {
    expect(resolveInitialNativeVariantId([variant("one", 2)])).toBe("one");
    expect(resolveInitialNativeVariantId([variant("one", 2), variant("two", 2)])).toBeNull();
  });

  it("does not allow an out-of-stock variation to be selected or added", () => {
    expect(isNativeVariantSelectable(variant("out", 0))).toBe(false);
    expect(isNativeVariantSelectable(variant("in", 1))).toBe(true);
    expect(isNativeVariantSelectable(undefined)).toBe(false);
  });
});
