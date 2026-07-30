import Dexie from "dexie";
import {
  brand,
  category,
  customer,
  FIXED_NOW,
  loadMinimalCatalog,
  product,
  variant,
} from "../fixtures/repository";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import {
  fromCategoryRecord,
  projectionsAreConsistent,
  toAddressRecord,
  toBrandRecord,
  toCategoryRecord,
  toVariantRecord,
} from "@/infrastructure/database/dexie/mappers";
import {
  DexieAddressRepository,
  DexieCategoryRepository,
  DexieUserRepository,
} from "@/infrastructure/database/dexie/basic-repositories";
import {
  DexieAdminProductQueryRepository,
  DexieProductRepository,
} from "@/infrastructure/database/dexie/product-repositories";
import { DexieCartRepository } from "@/infrastructure/database/dexie/cart-checkout-repositories";

describe("Dexie repository contracts", () => {
  let db: ScenarioShopDatabase;

  beforeEach(() => {
    db = new ScenarioShopDatabase(`repository-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    db.close();
    await Dexie.delete(db.name);
  });

  it("enforces unique keys and persistence projection consistency", async () => {
    await db.categories.add(toCategoryRecord(category));
    await expect(
      db.categories.add(
        toCategoryRecord({
          ...category,
          id: "category-duplicate",
        }),
      ),
    ).rejects.toBeDefined();
    const address = {
      id: "address-1",
      userId: customer.id,
      label: "自宅",
      recipientName: "山田太郎",
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区千代田",
      addressLine1: "1-1",
      addressLine2: null,
      phone: "09000000000",
      isDefault: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      version: 1,
    };
    expect(
      projectionsAreConsistent({
        addresses: [toAddressRecord(address)],
        categories: [toCategoryRecord(category)],
        brands: [toBrandRecord(brand)],
        variants: [toVariantRecord(variant)],
      }),
    ).toBe(true);
    expect(fromCategoryRecord(await db.categories.get(category.id).then((item) => item!))).toEqual(
      category,
    );
  });

  it("rejects optimistic-lock conflicts without overwriting current data", async () => {
    await db.users.add(customer);
    const repository = new DexieUserRepository(db);
    await expect(
      repository.update(
        {
          ...customer,
          displayName: "変更後",
          updatedAt: "2026-07-01T04:00:00.000Z",
        },
        2,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repository.getById(customer.id))?.displayName).toBe(customer.displayName);
  });

  it("keeps a single default address and deterministically reassigns it", async () => {
    await db.users.add(customer);
    const repository = new DexieAddressRepository(db);
    const first = await repository.createAndReassignDefault({
      userId: customer.id,
      addressId: "address-1",
      label: "自宅",
      recipientName: "山田太郎",
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区千代田",
      addressLine1: "1-1",
      addressLine2: null,
      phone: "09000000000",
      makeDefault: false,
      now: FIXED_NOW,
    });
    expect(first.isDefault).toBe(true);
    const second = await repository.createAndReassignDefault({
      userId: customer.id,
      addressId: "address-2",
      label: "職場",
      recipientName: "山田太郎",
      postalCode: "1500001",
      prefecture: "東京都",
      city: "渋谷区神宮前",
      addressLine1: "2-2",
      addressLine2: null,
      phone: "09000000000",
      makeDefault: true,
      now: "2026-07-01T03:01:00.000Z",
    });
    expect(second.isDefault).toBe(true);
    expect(
      (await repository.listByUser(customer.id)).filter((item) => item.isDefault),
    ).toHaveLength(1);
    await repository.deleteOwnedAndReassignDefault({
      addressId: second.id,
      expectedVersion: second.version,
      userId: customer.id,
      now: "2026-07-01T03:02:00.000Z",
    });
    expect((await repository.listByUser(customer.id))[0]?.isDefault).toBe(true);
  });

  it("sorts, filters, and pages inside the repository with a stable tie-break", async () => {
    await loadMinimalCatalog(db);
    await db.products.add({
      ...product,
      id: "product-a",
      productCode: "P-0001",
      name: "A商品",
    });
    await db.product_variants.add(
      toVariantRecord({
        ...variant,
        id: "variant-a",
        productId: "product-a",
        sku: "P-0001-ONE",
        stockQuantity: 0,
      }),
    );
    const query = new DexieAdminProductQueryRepository(db);
    const result = await query.search({
      keyword: null,
      statuses: ["published"],
      categoryIds: [],
      brandIds: [],
      requiredRanks: [],
      stockState: "all",
      sort: "minimum_price_asc",
      page: 1,
      pageSize: 20,
      now: FIXED_NOW,
    });
    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.productCode)).toEqual(["P-0001", "P-0002"]);
    const out = await query.search({
      keyword: null,
      statuses: [],
      categoryIds: [],
      brandIds: [],
      requiredRanks: [],
      stockState: "out_of_stock",
      sort: "updated_desc",
      page: 1,
      pageSize: 20,
      now: FIXED_NOW,
    });
    expect(out.items.map((item) => item.productId)).toEqual(["product-a"]);
  });

  it("touches the parent cart exactly once for an item mutation", async () => {
    await loadMinimalCatalog(db);
    const repository = new DexieCartRepository(db);
    const added = await db.transaction(
      "rw",
      [db.carts, db.cart_items, db.products, db.product_variants, db.users],
      async () =>
        await repository.addQuantityToActiveCart({
          variantId: variant.id,
          addQuantity: 1,
          owner: { ownerType: "user", userId: customer.id },
          newCartId: "cart-1",
          newItemId: "cart-item-1",
          now: FIXED_NOW,
        }),
    );
    expect(added.cart.version).toBe(2);
    const updated = await db.transaction(
      "rw",
      [db.carts, db.cart_items, db.products, db.product_variants, db.users],
      async () =>
        await repository.setQuantityAndTouchCart({
          cartId: added.cart.id,
          itemId: added.item.id,
          quantity: 2,
          cartExpectedVersion: added.cart.version,
          itemExpectedVersion: added.item.version,
          now: "2026-07-01T03:01:00.000Z",
        }),
    );
    expect(updated.cart.version).toBe(3);
    expect(updated.item.quantity).toBe(2);
  });
});
