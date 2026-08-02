import type {
  NativeCustomerCartRepository,
  NativeCustomerCatalogRepository,
} from "@/application/native/guest-storefront";
import type { ProductSearchRequest } from "@/application/contracts";
import { BASE_CLOCK, DEFAULT_GUEST_ID } from "@/seeds/metadata";

export interface CustomerRepositoryContractAdapter {
  catalog: NativeCustomerCatalogRepository;
  cart: NativeCustomerCartRepository;
}

export interface CustomerRepositoryContractHandle {
  adapter: CustomerRepositoryContractAdapter;
  dispose(): Promise<void>;
}

function searchRequest(overrides: Partial<ProductSearchRequest> = {}): ProductSearchRequest {
  return {
    keyword: null,
    categoryIds: [],
    brandIds: [],
    minimumPrice: null,
    maximumPrice: null,
    inStockOnly: false,
    onSaleOnly: false,
    minimumRating: null,
    sort: "newest",
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

export function createCustomerRepositoryContractSuite(
  createHandle: () => Promise<CustomerRepositoryContractHandle>,
): void {
  describe("shared customer repository contract", () => {
    let handle: CustomerRepositoryContractHandle;

    beforeEach(async () => {
      handle = await createHandle();
    });

    afterEach(async () => {
      await handle.dispose();
    });

    it("returns the seeded Guest storefront and hides rank-restricted products", async () => {
      const home = await handle.adapter.catalog.getHome({ now: BASE_CLOCK });
      expect(home.categories.length).toBeGreaterThan(0);
      expect(home.newProducts.map((product) => product.productId)).toContain("product-basic-shirt");
    });

    it("supports deterministic keyword search and product detail", async () => {
      const result = await handle.adapter.catalog.search({
        ...searchRequest({ keyword: "Tシャツ" }),
        now: BASE_CLOCK,
      });
      expect(result.items.map((item) => item.productId)).toContain("product-basic-shirt");
      const detail = await handle.adapter.catalog.getProductDetail({
        productId: "product-basic-shirt",
        now: BASE_CLOCK,
      });
      expect(detail).toMatchObject({
        productId: "product-basic-shirt",
        brandName: expect.any(String),
      });
      expect(detail?.images.length).toBeGreaterThan(0);
    });

    it("persists a Guest cart mutation and returns an empty-safe DTO", async () => {
      const initial = await handle.adapter.cart.getCart({
        guestId: DEFAULT_GUEST_ID,
        now: BASE_CLOCK,
      });
      expect(initial.items).toBeInstanceOf(Array);
      const variantId = "variant-mug-one";
      const added = await handle.adapter.cart.addItem({
        guestId: DEFAULT_GUEST_ID,
        variantId,
        addQuantity: 1,
        cartId: "contract-cart",
        itemId: "contract-item",
        now: BASE_CLOCK,
      });
      const addedItem = added.items.find((item) => item.variantId === variantId);
      expect(addedItem?.quantity).toBeGreaterThan(0);
      expect(addedItem).toBeDefined();

      const updated = await handle.adapter.cart.updateQuantity({
        guestId: DEFAULT_GUEST_ID,
        request: {
          itemId: addedItem!.itemId,
          quantity: 2,
          cartExpectedVersion: added.cartVersion,
          itemExpectedVersion: addedItem!.itemVersion,
        },
        now: BASE_CLOCK,
      });
      expect(updated.items.find((item) => item.itemId === addedItem!.itemId)?.quantity).toBe(2);

      const updatedItem = updated.items.find((item) => item.itemId === addedItem!.itemId)!;
      const removed = await handle.adapter.cart.removeItem({
        guestId: DEFAULT_GUEST_ID,
        request: {
          itemId: updatedItem.itemId,
          cartExpectedVersion: updated.cartVersion,
          itemExpectedVersion: updatedItem.itemVersion,
        },
        now: BASE_CLOCK,
      });
      expect(removed.items.some((item) => item.itemId === updatedItem.itemId)).toBe(false);
    });
  });
}
