import type {
  Brand,
  BrandRecord,
  Category,
  CategoryRecord,
  ProductVariant,
  ProductVariantRecord,
} from "@/domain/contracts";
import { projectOptionScopeKey } from "@/domain/services/normalization";

export function toCategoryRecord(category: Category): CategoryRecord {
  return { ...category, isActiveKey: category.isActive ? 1 : 0 };
}

export function toBrandRecord(brand: Brand): BrandRecord {
  return { ...brand, isActiveKey: brand.isActive ? 1 : 0 };
}

export function toVariantRecord(variant: ProductVariant): ProductVariantRecord {
  return {
    ...variant,
    isActiveKey: variant.isActive ? 1 : 0,
    optionScopeKey: projectOptionScopeKey(variant),
  };
}
