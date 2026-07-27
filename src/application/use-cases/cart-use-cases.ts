import type {
  AcceptPriceChangesRequest,
  AddCartItemRequest,
  CartDto,
  CartMutationOwner,
  ProductViewer,
  RemoveCartItemRequest,
  UpdateCartItemQuantityRequest,
} from "@/application/contracts";
import { ApplicationError, validationError } from "@/application/errors";
import { SessionIdentityResolver } from "@/application/identity/session-identity-resolver";
import type { CurrentSessionStore, GuestIdentityStore, IdGenerator } from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import { DexieCartRepository } from "@/infrastructure/database/dexie/cart-checkout-repositories";
import type { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";

interface CartUseCaseDependencies {
  database: ScenarioShopDatabase;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  guestIdentityStore: GuestIdentityStore;
  idGenerator: IdGenerator;
}

interface ResolvedOwner {
  owner: CartMutationOwner;
  viewer: ProductViewer;
}

export class CartUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly carts: DexieCartRepository;

  constructor(private readonly dependencies: CartUseCaseDependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.database,
      dependencies.currentSessionStore,
    );
    this.carts = new DexieCartRepository(dependencies.database);
  }

  async getCart(): Promise<CartDto> {
    const [resolved, now] = await Promise.all([this.resolveOwner(), this.now()]);
    const cart = await this.dependencies.transactionRunner.run(
      "cart-mutation",
      async ({ carts }) =>
        resolved.owner.ownerType === "user"
          ? carts.getOrCreateActiveByUser({
              userId: resolved.owner.userId,
              now,
            })
          : carts.getOrCreateActiveByGuest({
              guestId: resolved.owner.guestId,
              now,
            }),
    );
    return this.carts.getCartDto({
      cartId: cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  async addItem(request: AddCartItemRequest): Promise<CartDto> {
    if (!Number.isInteger(request.addQuantity) || request.addQuantity < 1) {
      throw validationError("cart.quantity.invalid");
    }
    const [resolved, now] = await Promise.all([this.resolveOwner(), this.now()]);
    const cartId = this.dependencies.idGenerator.generate();
    const itemId = this.dependencies.idGenerator.generate();
    const result = await this.dependencies.transactionRunner.run("cart-mutation", ({ carts }) =>
      carts.addQuantityToActiveCart({
        ...request,
        owner: resolved.owner,
        newCartId: cartId,
        newItemId: itemId,
        now,
      }),
    );
    return this.carts.getCartDto({
      cartId: result.cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  async updateQuantity(request: UpdateCartItemQuantityRequest): Promise<CartDto> {
    const [resolved, now, cart] = await Promise.all([
      this.resolveOwner(),
      this.now(),
      this.getOwnedActiveCart(),
    ]);
    if (request.quantity === 0) {
      return this.removeItem({
        itemId: request.itemId,
        cartExpectedVersion: request.cartExpectedVersion,
        itemExpectedVersion: request.itemExpectedVersion,
      });
    }
    if (!Number.isInteger(request.quantity) || request.quantity < 1) {
      throw validationError("cart.quantity.invalid");
    }
    const result = await this.dependencies.transactionRunner.run("cart-mutation", ({ carts }) =>
      carts.setQuantityAndTouchCart({
        ...request,
        cartId: cart.id,
        now,
      }),
    );
    return this.carts.getCartDto({
      cartId: result.cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  async removeItem(request: RemoveCartItemRequest): Promise<CartDto> {
    const [resolved, now, cart] = await Promise.all([
      this.resolveOwner(),
      this.now(),
      this.getOwnedActiveCart(),
    ]);
    const result = await this.dependencies.transactionRunner.run("cart-mutation", ({ carts }) =>
      carts.deleteItemAndTouchCart({
        ...request,
        cartId: cart.id,
        now,
      }),
    );
    return this.carts.getCartDto({
      cartId: result.cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  async acceptPriceChanges(request: AcceptPriceChangesRequest): Promise<CartDto> {
    const [resolved, now, cart] = await Promise.all([
      this.resolveOwner(),
      this.now(),
      this.getOwnedActiveCart(),
    ]);
    const result = await this.dependencies.transactionRunner.run("cart-mutation", ({ carts }) =>
      carts.acceptPriceChangesAndTouchCart({
        ...request,
        cartId: cart.id,
        now,
      }),
    );
    return this.carts.getCartDto({
      cartId: result.cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  private async resolveOwner(): Promise<ResolvedOwner> {
    const user = await this.identity.getCurrentEntity();
    if (user === null) {
      const guestId = await this.dependencies.guestIdentityStore.getOrCreateGuestId();
      return {
        owner: { ownerType: "guest", guestId },
        viewer: { kind: "guest" },
      };
    }
    if (
      user.role !== "customer" ||
      user.accountStatus !== "active" ||
      user.membershipRank === null
    ) {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "cart.customerOnly",
        retryable: false,
      });
    }
    return {
      owner: { ownerType: "user", userId: user.id },
      viewer: {
        kind: "customer",
        userId: user.id,
        membershipRank: user.membershipRank,
      },
    };
  }

  private async getOwnedActiveCart() {
    const resolved = await this.resolveOwner();
    const cart =
      resolved.owner.ownerType === "user"
        ? await this.carts.getActiveByUser(resolved.owner.userId)
        : await this.carts.getActiveByGuest(resolved.owner.guestId);
    if (cart === null) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        messageKey: "cart.notFound",
        retryable: false,
      });
    }
    return cart;
  }

  private async now(): Promise<string> {
    const setting = await this.dependencies.database.app_settings.get("test-control");
    if (setting !== undefined) {
      const value = JSON.parse(setting.valueJson) as { clock?: unknown };
      if (typeof value.clock === "string") {
        return value.clock;
      }
    }
    return new Date().toISOString();
  }
}
