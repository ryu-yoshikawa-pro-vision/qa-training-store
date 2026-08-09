import {
  mapNativeCartItem,
  mapNativeProduct,
  mapNativeUser,
} from "@/infrastructure/database/sqlite/mappers";

describe("Native SQLite mappers", () => {
  it("maps snake_case user and product rows to domain entities", () => {
    expect(
      mapNativeUser({
        id: "user-1",
        email: "guest@example.com",
        password_hash: "encoded",
        display_name: "Guest",
        phone: null,
        role: "customer",
        membership_rank: "regular",
        account_status: "active",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        version: 1,
      }),
    ).toMatchObject({ id: "user-1", membershipRank: "regular", accountStatus: "active" });
    expect(
      mapNativeProduct({
        id: "product-1",
        product_code: "P-1",
        name: "商品",
        short_description: "短い説明",
        description: "説明",
        category_id: "category-1",
        brand_id: "brand-1",
        status: "published",
        required_rank: null,
        variation_name: null,
        published_at: "2026-07-01T00:00:00.000Z",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        version: 1,
      }),
    ).toMatchObject({
      productCode: "P-1",
      categoryId: "category-1",
      publishedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("maps cart item versions and prices without changing values", () => {
    expect(
      mapNativeCartItem({
        id: "item-1",
        cart_id: "cart-1",
        variant_id: "variant-1",
        quantity: 2,
        unit_effective_price_at_add: 1500,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        version: 3,
      }),
    ).toEqual({
      id: "item-1",
      cartId: "cart-1",
      variantId: "variant-1",
      quantity: 2,
      unitEffectivePriceAtAdd: 1500,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      version: 3,
    });
  });

  it("rejects invalid SQLite enum and numeric values at the mapper boundary", () => {
    expect(() =>
      mapNativeUser({
        id: "user-1",
        email: "guest@example.com",
        password_hash: "encoded",
        display_name: "Guest",
        phone: null,
        role: "unknown",
        membership_rank: "regular",
        account_status: "active",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        version: 1,
      }),
    ).toThrow("Invalid Native SQLite users.role");

    expect(() =>
      mapNativeCartItem({
        id: "item-1",
        cart_id: "cart-1",
        variant_id: "variant-1",
        quantity: "2",
        unit_effective_price_at_add: 1500,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        version: 3,
      }),
    ).toThrow("Invalid Native SQLite cart_items.quantity");
  });

  it("rejects an unknown product status instead of coercing it", () => {
    expect(() =>
      mapNativeProduct({
        id: "product-1",
        product_code: "P-1",
        name: "商品",
        short_description: "短い説明",
        description: "説明",
        category_id: "category-1",
        brand_id: "brand-1",
        status: "unknown",
        required_rank: null,
        variation_name: null,
        published_at: null,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        version: 1,
      }),
    ).toThrow("Invalid Native SQLite products.status");
  });
});
