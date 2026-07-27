import Dexie from "dexie";
import { DexieCartRepository } from "@/infrastructure/database/dexie/cart-checkout-repositories";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";
import { BASE_CLOCK, DEFAULT_GUEST_ID } from "@/seeds/metadata";

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
});
