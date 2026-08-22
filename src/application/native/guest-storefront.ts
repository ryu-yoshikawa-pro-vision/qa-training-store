import type {
  CartDto,
  CartMutationOwner,
  ProductDetail,
  ProductSearchRequest,
  ProductSearchResult,
  ProductViewer,
  HomeCatalogDto,
  SearchSuggestion,
  UpdateCartItemQuantityRequest,
  RemoveCartItemRequest,
} from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import type {
  CustomerCatalogGateway,
  CustomerCartGateway,
} from "@/application/customer-capabilities";

export interface NativeCustomerCatalogRepository {
  getHome(input: { viewer: ProductViewer; now: string }): Promise<HomeCatalogDto>;
  search(
    input: ProductSearchRequest & { viewer: ProductViewer; now: string },
  ): Promise<ProductSearchResult>;
  suggest(input: {
    keyword: string;
    limit: 8;
    viewer: ProductViewer;
    now: string;
  }): Promise<SearchSuggestion[]>;
  getProductDetail(input: {
    productId: string;
    viewer: ProductViewer;
    now: string;
  }): Promise<ProductDetail | null>;
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

/**
 * Compatibility names for the shared repository contract. The Native
 * Foundation no longer owns a second Catalog/Cart use-case implementation;
 * bootstrap adapts these repository ports to the shared Application classes.
 */
export type { CustomerCatalogGateway, CustomerCartGateway };

export function createNativeCustomerCatalogGateway(
  repository: NativeCustomerCatalogRepository,
): CustomerCatalogGateway {
  return {
    getHome: ({ viewer, now }) => {
      assertSupportedViewer(viewer.kind);
      return repository.getHome({ viewer, now });
    },
    search: ({ viewer, now, ...request }) => {
      assertSupportedViewer(viewer.kind);
      return repository.search({ ...request, viewer, now });
    },
    suggest: ({ viewer, now, ...request }) => {
      assertSupportedViewer(viewer.kind);
      return repository.suggest({ ...request, viewer, now });
    },
    getProductDetail: ({ viewer, productId, now }) => {
      assertSupportedViewer(viewer.kind);
      return repository.getProductDetail({ productId, viewer, now });
    },
    getCategoryName: (categoryId) => repository.getCategoryName(categoryId),
  };
}

export function createNativeCustomerCartGateway(
  repository: NativeCustomerCartRepository,
): CustomerCartGateway {
  return {
    getCart: ({ owner, viewer, now }) => {
      assertGuestOwner(owner, viewer.kind);
      return repository.getCart({ guestId: owner.guestId, now });
    },
    addItem: ({ owner, viewer, request, cartId, itemId, now }) => {
      assertGuestOwner(owner, viewer.kind);
      return repository.addItem({
        guestId: owner.guestId,
        variantId: request.variantId,
        addQuantity: request.addQuantity,
        cartId,
        itemId,
        now,
      });
    },
    updateQuantity: ({ owner, viewer, request, now }) => {
      assertGuestOwner(owner, viewer.kind);
      return repository.updateQuantity({ guestId: owner.guestId, request, now });
    },
    removeItem: ({ owner, viewer, request, now }) => {
      assertGuestOwner(owner, viewer.kind);
      return repository.removeItem({ guestId: owner.guestId, request, now });
    },
  };
}

function assertSupportedViewer(kind: string): asserts kind is "guest" | "customer" {
  if (kind !== "guest" && kind !== "customer") {
    throw new ApplicationError({
      code: "PERMISSION_DENIED",
      messageKey: "cart.customerOnly",
      retryable: false,
    });
  }
}

function assertGuestOwner(
  owner: CartMutationOwner,
  viewerKind: string,
): asserts owner is Extract<CartMutationOwner, { ownerType: "guest" }> {
  if (owner.ownerType !== "guest" || viewerKind !== "guest") {
    throw new ApplicationError({
      code: "PERMISSION_DENIED",
      messageKey: "cart.customerOnly",
      retryable: false,
    });
  }
}
