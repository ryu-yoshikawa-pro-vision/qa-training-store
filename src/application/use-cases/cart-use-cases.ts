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
import type { CustomerCartGateway } from "@/application/customer-capabilities";
import type {
  Clock,
  CurrentActorResolver,
  CurrentSessionStore,
  GuestIdentityStore,
  IdGenerator,
} from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import type { CartRepository, SessionRepository, UserRepository } from "@/domain/repositories";

interface CartRepositoryDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  carts: CartRepository;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  guestIdentityStore: GuestIdentityStore;
  clock: Clock;
  idGenerator: IdGenerator;
}

export type CartUseCaseDependencies =
  | (CartRepositoryDependencies & { identity?: never; customerGateway?: never })
  | {
      identity: Pick<CurrentActorResolver, "getCurrentEntity">;
      customerGateway: CustomerCartGateway;
      guestIdentityStore: GuestIdentityStore;
      clock: Clock;
      idGenerator: IdGenerator;
    };

interface ResolvedOwner {
  owner: CartMutationOwner;
  viewer: ProductViewer;
}

export class CartUseCases {
  private readonly identity: Pick<CurrentActorResolver, "getCurrentEntity">;
  private readonly customerGateway: CustomerCartGateway | null;
  private readonly carts: CartRepository | null;
  private readonly transactionRunner: ApplicationTransactionRunner | null;
  private readonly guestIdentityStore: GuestIdentityStore;
  private readonly idGenerator: IdGenerator;
  private readonly clock: Clock;

  constructor(private readonly dependencies: CartUseCaseDependencies) {
    if (dependencies.customerGateway !== undefined) {
      this.identity = dependencies.identity;
      this.customerGateway = dependencies.customerGateway;
      this.carts = null;
      this.transactionRunner = null;
      this.guestIdentityStore = dependencies.guestIdentityStore;
      this.idGenerator = dependencies.idGenerator;
      this.clock = dependencies.clock;
    } else {
      this.identity = new SessionIdentityResolver(
        dependencies.users,
        dependencies.sessions,
        dependencies.currentSessionStore,
      );
      this.customerGateway = null;
      this.carts = dependencies.carts;
      this.transactionRunner = dependencies.transactionRunner;
      this.guestIdentityStore = dependencies.guestIdentityStore;
      this.idGenerator = dependencies.idGenerator;
      this.clock = dependencies.clock;
    }
  }

  async getCart(): Promise<CartDto> {
    if (this.customerGateway !== null) {
      const [resolved, now] = await Promise.all([this.resolveOwner(), this.now()]);
      return this.customerGateway.getCart({
        owner: resolved.owner,
        viewer: resolved.viewer,
        now,
      });
    }
    const [resolved, now] = await Promise.all([this.resolveOwner(), this.now()]);
    const cart = await this.transactionRunner!.run("cart-mutation", async ({ carts }) => {
      const existing =
        resolved.owner.ownerType === "user"
          ? await carts.getActiveByUser(resolved.owner.userId)
          : await carts.getActiveByGuest(resolved.owner.guestId);
      if (existing !== null) return existing;
      const newCartId = this.idGenerator.generate();
      return resolved.owner.ownerType === "user"
        ? carts.getOrCreateActiveByUser({
            userId: resolved.owner.userId,
            newCartId,
            now,
          })
        : carts.getOrCreateActiveByGuest({
            guestId: resolved.owner.guestId,
            newCartId,
            now,
          });
    });
    return this.carts!.getCartDto({
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
    const cartId = this.idGenerator.generate();
    const itemId = this.idGenerator.generate();
    if (this.customerGateway !== null) {
      return this.customerGateway.addItem({
        owner: resolved.owner,
        viewer: resolved.viewer,
        request,
        cartId,
        itemId,
        now,
      });
    }
    const result = await this.transactionRunner!.run("cart-mutation", ({ carts }) =>
      carts.addQuantityToActiveCart({
        ...request,
        owner: resolved.owner,
        newCartId: cartId,
        newItemId: itemId,
        now,
      }),
    );
    return this.carts!.getCartDto({
      cartId: result.cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  async updateQuantity(request: UpdateCartItemQuantityRequest): Promise<CartDto> {
    const [resolved, now] = await Promise.all([this.resolveOwner(), this.now()]);
    if (request.quantity === 0) {
      const removeRequest = {
        itemId: request.itemId,
        cartExpectedVersion: request.cartExpectedVersion,
        itemExpectedVersion: request.itemExpectedVersion,
      };
      if (this.customerGateway !== null) {
        return this.customerGateway.removeItem({
          owner: resolved.owner,
          viewer: resolved.viewer,
          request: removeRequest,
          now,
        });
      }
      return this.removeItem(removeRequest);
    }
    if (!Number.isInteger(request.quantity) || request.quantity < 1) {
      throw validationError("cart.quantity.invalid");
    }
    if (this.customerGateway !== null) {
      return this.customerGateway.updateQuantity({
        owner: resolved.owner,
        viewer: resolved.viewer,
        request,
        now,
      });
    }
    const cart = await this.getOwnedActiveCart();
    const result = await this.transactionRunner!.run("cart-mutation", ({ carts }) =>
      carts.setQuantityAndTouchCart({
        ...request,
        cartId: cart.id,
        now,
      }),
    );
    return this.carts!.getCartDto({
      cartId: result.cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  async removeItem(request: RemoveCartItemRequest): Promise<CartDto> {
    const [resolved, now] = await Promise.all([this.resolveOwner(), this.now()]);
    if (this.customerGateway !== null) {
      return this.customerGateway.removeItem({
        owner: resolved.owner,
        viewer: resolved.viewer,
        request,
        now,
      });
    }
    const cart = await this.getOwnedActiveCart();
    const result = await this.transactionRunner!.run("cart-mutation", ({ carts }) =>
      carts.deleteItemAndTouchCart({
        ...request,
        cartId: cart.id,
        now,
      }),
    );
    return this.carts!.getCartDto({
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
    const result = await this.transactionRunner!.run("cart-mutation", ({ carts }) =>
      carts.acceptPriceChangesAndTouchCart({
        ...request,
        cartId: cart.id,
        now,
      }),
    );
    return this.carts!.getCartDto({
      cartId: result.cart.id,
      viewer: resolved.viewer,
      now,
    });
  }

  private async resolveOwner(): Promise<ResolvedOwner> {
    const user = await this.identity.getCurrentEntity();
    if (user === null) {
      const guestId = await this.guestIdentityStore.getOrCreateGuestId();
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
        ? await this.carts!.getActiveByUser(resolved.owner.userId)
        : await this.carts!.getActiveByGuest(resolved.owner.guestId);
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
    return this.clock.now();
  }
}
