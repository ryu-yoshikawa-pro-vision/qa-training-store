import type {
  AddCartItemRequest,
  CartDto,
  ProductDetail,
  ProductSearchRequest,
  ProductSearchResult,
  HomeCatalogDto,
  UpdateCartItemQuantityRequest,
  RemoveCartItemRequest,
} from "@/application/contracts";
import type { Clock, GuestIdentityStore, IdGenerator } from "@/application/ports";

export interface NativeCustomerCatalogRepository {
  getHome(input: { now: string }): Promise<HomeCatalogDto>;
  search(input: ProductSearchRequest & { now: string }): Promise<ProductSearchResult>;
  getProductDetail(input: { productId: string; now: string }): Promise<ProductDetail | null>;
  getCategoryName(categoryId: string): Promise<string | null>;
}

export interface NativeCustomerCartRepository {
  getCart(input: { guestId: string; now: string }): Promise<CartDto>;
  addItem(input: {
    guestId: string;
    variantId: string;
    addQuantity: number;
    cartId: string;
    itemId: string;
    now: string;
  }): Promise<CartDto>;
  updateQuantity(input: {
    guestId: string;
    request: UpdateCartItemQuantityRequest;
    now: string;
  }): Promise<CartDto>;
  removeItem(input: {
    guestId: string;
    request: RemoveCartItemRequest;
    now: string;
  }): Promise<CartDto>;
}

export class NativeGuestCatalogUseCases {
  constructor(
    private readonly repository: NativeCustomerCatalogRepository,
    private readonly clock: Clock,
  ) {}

  getHome(): Promise<HomeCatalogDto> {
    return this.repository.getHome({ now: this.clock.now() });
  }

  search(request: ProductSearchRequest): Promise<ProductSearchResult> {
    return this.repository.search({ ...request, now: this.clock.now() });
  }

  getProductDetail(productId: string): Promise<ProductDetail | null> {
    return this.repository.getProductDetail({ productId, now: this.clock.now() });
  }

  getCategoryName(categoryId: string): Promise<string | null> {
    return this.repository.getCategoryName(categoryId);
  }
}

export class NativeGuestCartUseCases {
  constructor(
    private readonly repository: NativeCustomerCartRepository,
    private readonly guestIdentityStore: GuestIdentityStore,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async getCart(): Promise<CartDto> {
    return this.repository.getCart({
      guestId: await this.guestIdentityStore.getOrCreateGuestId(),
      now: this.clock.now(),
    });
  }

  async addItem(request: AddCartItemRequest): Promise<CartDto> {
    return this.repository.addItem({
      guestId: await this.guestIdentityStore.getOrCreateGuestId(),
      variantId: request.variantId,
      addQuantity: request.addQuantity,
      cartId: this.idGenerator.generate(),
      itemId: this.idGenerator.generate(),
      now: this.clock.now(),
    });
  }

  async updateQuantity(request: UpdateCartItemQuantityRequest): Promise<CartDto> {
    const guestId = await this.guestIdentityStore.getOrCreateGuestId();
    if (request.quantity === 0) {
      return this.removeItem({
        itemId: request.itemId,
        cartExpectedVersion: request.cartExpectedVersion,
        itemExpectedVersion: request.itemExpectedVersion,
      });
    }
    return this.repository.updateQuantity({ guestId, request, now: this.clock.now() });
  }

  async removeItem(request: RemoveCartItemRequest): Promise<CartDto> {
    return this.repository.removeItem({
      guestId: await this.guestIdentityStore.getOrCreateGuestId(),
      request,
      now: this.clock.now(),
    });
  }
}
