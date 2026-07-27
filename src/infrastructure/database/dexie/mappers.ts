import type {
  Brand,
  BrandRecord,
  Category,
  CategoryRecord,
  ProductVariant,
  ProductVariantRecord,
  UserAddress,
  UserAddressRecord,
} from "@/domain/contracts";
import { projectOptionScopeKey } from "@/domain/services/normalization";

export function toAddressRecord(address: UserAddress): UserAddressRecord {
  return {
    ...address,
    isDefaultKey: address.isDefault ? 1 : 0,
  };
}

export function fromAddressRecord(record: UserAddressRecord): UserAddress {
  const { isDefaultKey: _projection, ...address } = record;
  return address;
}

export function toCategoryRecord(category: Category): CategoryRecord {
  return {
    ...category,
    isActiveKey: category.isActive ? 1 : 0,
  };
}

export function fromCategoryRecord(record: CategoryRecord): Category {
  const { isActiveKey: _projection, ...category } = record;
  return category;
}

export function toBrandRecord(brand: Brand): BrandRecord {
  return {
    ...brand,
    isActiveKey: brand.isActive ? 1 : 0,
  };
}

export function fromBrandRecord(record: BrandRecord): Brand {
  const { isActiveKey: _projection, ...brand } = record;
  return brand;
}

export function toVariantRecord(variant: ProductVariant): ProductVariantRecord {
  return {
    ...variant,
    isActiveKey: variant.isActive ? 1 : 0,
    optionScopeKey: projectOptionScopeKey(variant),
  };
}

export function fromVariantRecord(record: ProductVariantRecord): ProductVariant {
  const { isActiveKey: _activeProjection, optionScopeKey: _scopeProjection, ...variant } = record;
  return variant;
}

export function projectionsAreConsistent(input: {
  addresses: UserAddressRecord[];
  categories: CategoryRecord[];
  brands: BrandRecord[];
  variants: ProductVariantRecord[];
}): boolean {
  return (
    input.addresses.every((record) => record.isDefaultKey === (record.isDefault ? 1 : 0)) &&
    input.categories.every((record) => record.isActiveKey === (record.isActive ? 1 : 0)) &&
    input.brands.every((record) => record.isActiveKey === (record.isActive ? 1 : 0)) &&
    input.variants.every(
      (record) =>
        record.isActiveKey === (record.isActive ? 1 : 0) &&
        record.optionScopeKey === projectOptionScopeKey(record),
    )
  );
}
