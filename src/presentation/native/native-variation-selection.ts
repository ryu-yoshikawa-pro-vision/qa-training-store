import type { ProductDetail } from "@/application/contracts";

export function resolveInitialNativeVariantId(variants: ProductDetail["variants"]): string | null {
  return variants.length === 1 ? (variants[0]?.variantId ?? null) : null;
}

export function isNativeVariantSelectable(
  variant: ProductDetail["variants"][number] | undefined,
): boolean {
  return variant !== undefined;
}

export function isNativeVariantAddable(
  variant: ProductDetail["variants"][number] | undefined,
): boolean {
  return variant !== undefined && variant.stockQuantity > 0;
}
