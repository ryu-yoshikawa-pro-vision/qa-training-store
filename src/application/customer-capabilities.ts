import type {
  AddCartItemRequest,
  CartDto,
  CartMutationOwner,
  HomeCatalogDto,
  ProductDetail,
  ProductSearchRequest,
  ProductSearchResult,
  ProductViewer,
  RemoveCartItemRequest,
  UpdateCartItemQuantityRequest,
} from "@/application/contracts";

/** Platform adapters for the shared customer-facing CatalogUseCases. */
export interface CustomerCatalogGateway {
  getHome(input: { viewer: ProductViewer; now: string }): Promise<HomeCatalogDto>;
  search(
    input: ProductSearchRequest & { viewer: ProductViewer; now: string },
  ): Promise<ProductSearchResult>;
  getProductDetail(input: {
    productId: string;
    viewer: ProductViewer;
    now: string;
  }): Promise<ProductDetail | null>;
  getCategoryName(categoryId: string): Promise<string | null>;
}

/** Platform adapters for the shared customer-facing CartUseCases. */
export interface CustomerCartGateway {
  getCart(input: {
    owner: CartMutationOwner;
    viewer: ProductViewer;
    now: string;
  }): Promise<CartDto>;
  addItem(input: {
    owner: CartMutationOwner;
    viewer: ProductViewer;
    request: AddCartItemRequest;
    cartId: string;
    itemId: string;
    now: string;
  }): Promise<CartDto>;
  updateQuantity(input: {
    owner: CartMutationOwner;
    viewer: ProductViewer;
    request: UpdateCartItemQuantityRequest;
    now: string;
  }): Promise<CartDto>;
  removeItem(input: {
    owner: CartMutationOwner;
    viewer: ProductViewer;
    request: RemoveCartItemRequest;
    now: string;
  }): Promise<CartDto>;
}
