import Dexie from "dexie";
import { DexieCartRepository } from "@/infrastructure/database/dexie/cart-checkout-repositories";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";
import { BASE_CLOCK, DEFAULT_GUEST_ID } from "@/seeds/metadata";
import type { Cart } from "@/domain/contracts";

describe("cart mutation repository contract", () => {
  let database: ScenarioShopDatabase;
  let carts: DexieCartRepository;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`cart-repository-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    carts = new DexieCartRepository(database);
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it("atomically creates the first cart/item and increments the parent once", async () => {
    const result = await database.transaction(
      "rw",
      [database.carts, database.cart_items, database.products, database.product_variants],
      () =>
        carts.addQuantityToActiveCart({
          owner: { ownerType: "guest", guestId: DEFAULT_GUEST_ID },
          variantId: "variant-mug-one",
          addQuantity: 1,
          newCartId: "cart-created",
          newItemId: "item-created",
          now: BASE_CLOCK,
        }),
    );
    expect(result.cart.version).toBe(2);
    expect(result.item.version).toBe(1);
    expect(await database.cart_items.get("item-created")).toBeDefined();
  });

  it("keeps item and parent unchanged when optimistic versions conflict", async () => {
    const cart = await carts.getActiveByUser("user-customer-regular");
    const item = await database.cart_items.get("cart-item-regular-shirt");
    await expect(
      carts.setQuantityAndTouchCart({
        cartId: cart!.id,
        itemId: item!.id,
        quantity: 2,
        cartExpectedVersion: cart!.version + 1,
        itemExpectedVersion: item!.version,
        now: BASE_CLOCK,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await database.carts.get(cart!.id)).toMatchObject({
      version: cart!.version,
    });
    expect(await database.cart_items.get(item!.id)).toMatchObject({
      version: item!.version,
      quantity: item!.quantity,
    });
  });

  it("rejects quantity updates for an item owned by another cart", async () => {
    const cart = (await carts.getActiveByUser("user-customer-regular"))!;
    const item = (await database.cart_items.get("cart-item-regular-shirt"))!;
    const foreignCart: Cart = {
      ...cart,
      id: "cart-foreign",
      ownerType: "guest",
      userId: null,
      guestId: "guest-foreign",
    };
    await database.carts.add(foreignCart);
    await database.cart_items.update(item.id, { cartId: foreignCart.id });

    await expect(
      carts.setQuantityAndTouchCart({
        cartId: cart.id,
        itemId: item.id,
        quantity: 2,
        cartExpectedVersion: cart.version,
        itemExpectedVersion: item.version,
        now: BASE_CLOCK,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await database.cart_items.get(item.id)).toMatchObject({
      cartId: foreignCart.id,
      quantity: item.quantity,
    });
    expect(await database.carts.get(cart.id)).toMatchObject({ version: cart.version });
  });

  it("rejects deletion for an item owned by another cart", async () => {
    const cart = (await carts.getActiveByUser("user-customer-regular"))!;
    const item = (await database.cart_items.get("cart-item-regular-shirt"))!;
    const foreignCart: Cart = {
      ...cart,
      id: "cart-foreign",
      ownerType: "guest",
      userId: null,
      guestId: "guest-foreign",
    };
    await database.carts.add(foreignCart);
    await database.cart_items.update(item.id, { cartId: foreignCart.id });

    await expect(
      carts.deleteItemAndTouchCart({
        cartId: cart.id,
        itemId: item.id,
        cartExpectedVersion: cart.version,
        itemExpectedVersion: item.version,
        now: BASE_CLOCK,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await database.cart_items.get(item.id)).toMatchObject({
      cartId: foreignCart.id,
    });
    expect(await database.carts.get(cart.id)).toMatchObject({ version: cart.version });
  });

  it("counts adjusted and fully excluded merge items without overlap", async () => {
    await loadSeedDataset(
      database,
      createScenarioDataset("guest-cart-merge-overflow"),
      "guest-cart-merge-overflow",
    );
    const excludedVariant = await database.product_variants
      .where("productId")
      .equals("product-draft")
      .first();
    expect(excludedVariant).toBeDefined();
    await database.cart_items.add({
      id: "guest-fully-excluded",
      cartId: "cart-guest-overflow",
      variantId: excludedVariant!.id,
      quantity: 2,
      unitEffectivePriceAtAdd: 4000,
      createdAt: BASE_CLOCK,
      updatedAt: BASE_CLOCK,
      version: 1,
    });

    const result = await carts.mergeGuestIntoUser({
      guestId: DEFAULT_GUEST_ID,
      userId: "user-customer-regular",
      newCartId: "cart-merge-user",
      now: BASE_CLOCK,
    });

    expect(result.adjustedItemCount).toBe(1);
    expect(result.fullyExcludedItemCount).toBe(1);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ overflowQuantity: 2, excludedReason: null }),
        expect.objectContaining({
          addedQuantity: 0,
          overflowQuantity: 2,
          excludedReason: "UNPUBLISHED",
        }),
      ]),
    );
  });
});
