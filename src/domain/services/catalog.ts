import type { ProductVariant } from "@/domain/contracts";

export type AdminStockState = "in_stock" | "low_stock" | "out_of_stock";

export function activeTotalStock(
  variants: ReadonlyArray<Pick<ProductVariant, "isActive" | "stockQuantity">>,
): number {
  return variants.reduce(
    (total, variant) => total + (variant.isActive ? variant.stockQuantity : 0),
    0,
  );
}

export function adminProductStockState(totalStock: number): AdminStockState {
  if (!Number.isInteger(totalStock) || totalStock < 0) {
    throw new RangeError("Stock total must be a non-negative integer");
  }
  if (totalStock === 0) {
    return "out_of_stock";
  }
  return totalStock <= 5 ? "low_stock" : "in_stock";
}

export function matchesFacetGroups(input: {
  productCategoryId: string;
  productBrandId: string;
  selectedCategoryIds: string[];
  selectedBrandIds: string[];
}): boolean {
  const categoryMatches =
    input.selectedCategoryIds.length === 0 ||
    input.selectedCategoryIds.includes(input.productCategoryId);
  const brandMatches =
    input.selectedBrandIds.length === 0 || input.selectedBrandIds.includes(input.productBrandId);
  return categoryMatches && brandMatches;
}
