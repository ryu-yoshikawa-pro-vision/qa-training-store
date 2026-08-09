import Dexie from "dexie";
import type { ProductSearchRequest } from "@/application/contracts";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieCartRepository } from "@/infrastructure/database/dexie/cart-checkout-repositories";
import {
  DexieProductQueryRepository,
  DexieStorefrontCatalogQueryRepository,
} from "@/infrastructure/database/dexie/storefront-repositories";
import { createCustomerRepositoryContractSuite } from "../contracts/shared-customer-repository-suite";

createCustomerRepositoryContractSuite(async () => {
  const database = new ScenarioShopDatabase(`customer-contract-${crypto.randomUUID()}`);
  await loadSeedDataset(database, createScenarioDataset("default"), "default");
  const catalog = new DexieStorefrontCatalogQueryRepository(database);
  const products = new DexieProductQueryRepository(database);
  const carts = new DexieCartRepository(database);
  const guest = { kind: "guest" } as const;
  const toCart = async (guestId: string, now: string) => {
    const cart =
      (await carts.getActiveByGuest(guestId)) ??
      (await carts.getOrCreateActiveByGuest({
        guestId,
        newCartId: `cart-${guestId}`,
        now,
      }));
    return carts.getCartDto({ cartId: cart.id, viewer: guest, now });
  };
  const adapter = {
    catalog: {
      getHome: ({ now }: { now: string }) => catalog.getHome({ viewer: guest, now }),
      search: (input: ProductSearchRequest & { now: string }) =>
        products.search({ ...input, viewer: guest }),
      getProductDetail: ({ productId, now }: { productId: string; now: string }) =>
        products.getDetail({ productId, viewer: guest, now }),
      getCategoryName: async (categoryId: string) =>
        (await database.categories.get(categoryId))?.name ?? null,
    },
    cart: {
      getCart: ({ guestId, now }: { guestId: string; now: string }) => toCart(guestId, now),
      addItem: async (input: {
        guestId: string;
        variantId: string;
        addQuantity: number;
        cartId: string;
        itemId: string;
        now: string;
      }) => {
        const result = await carts.addQuantityToActiveCart({
          owner: { ownerType: "guest", guestId: input.guestId },
          variantId: input.variantId,
          addQuantity: input.addQuantity,
          newCartId: input.cartId,
          newItemId: input.itemId,
          now: input.now,
        });
        return carts.getCartDto({ cartId: result.cart.id, viewer: guest, now: input.now });
      },
      updateQuantity: async (input: {
        guestId: string;
        request: {
          itemId: string;
          quantity: number;
          cartExpectedVersion: number;
          itemExpectedVersion: number;
        };
        now: string;
      }) => {
        const cart = await carts.getActiveByGuest(input.guestId);
        if (cart === null) throw new Error("contract cart not found");
        const result = await carts.setQuantityAndTouchCart({
          ...input.request,
          cartId: cart.id,
          now: input.now,
        });
        return carts.getCartDto({ cartId: result.cart.id, viewer: guest, now: input.now });
      },
      removeItem: async (input: {
        guestId: string;
        request: { itemId: string; cartExpectedVersion: number; itemExpectedVersion: number };
        now: string;
      }) => {
        const cart = await carts.getActiveByGuest(input.guestId);
        if (cart === null) throw new Error("contract cart not found");
        const result = await carts.deleteItemAndTouchCart({
          ...input.request,
          cartId: cart.id,
          now: input.now,
        });
        return carts.getCartDto({ cartId: result.cart.id, viewer: guest, now: input.now });
      },
    },
  };
  return {
    adapter,
    dispose: async () => {
      const name = database.name;
      database.close();
      await Dexie.delete(name);
    },
  };
});
