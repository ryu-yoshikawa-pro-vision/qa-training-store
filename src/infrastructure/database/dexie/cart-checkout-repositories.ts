import type {
  AcceptPriceChangesCommand,
  AddCartItemCommand,
  CartDto,
  CartMergeItemResult,
  CartMergeResult,
  CheckoutConfirmationDto,
  CheckoutStartResult,
  MergeGuestCartCommand,
  RemoveCartItemCommand,
  SetCheckoutAddressCommand,
  SetCheckoutPaymentCommand,
  StartOrResumeCheckoutCommand,
  UpdateCartItemQuantityCommand,
} from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import type { CartRepository, CheckoutSessionRepository } from "@/domain/repositories";
import type { Cart, CartItem, CheckoutSession, ProductVariant } from "@/domain/contracts";
import { addCartQuantity, maximumCartQuantity, mergeCartQuantity } from "@/domain/services/cart";
import { calculateOrderTotals, effectiveUnitPrice } from "@/domain/services/pricing";
import { canViewerSeeProduct, rankSatisfies } from "@/domain/policies/permissions";
import type { ScenarioShopDatabase } from "./database";
import { fromVariantRecord } from "./mappers";
import { assertExpectedVersion, requireEntity } from "./repository-helpers";
import { productImageManifest } from "@/generated/product-image-manifest";

export class DexieCartRepository implements CartRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Cart | null> {
    return (await this.db.carts.get(id)) ?? null;
  }

  async update(entity: Cart, expectedVersion: number): Promise<Cart> {
    const current = requireEntity(await this.db.carts.get(entity.id), "errors.cart.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.carts.put(updated);
    return updated;
  }

  async getActiveByUser(userId: string): Promise<Cart | null> {
    return (
      (await this.db.carts.where("[userId+status]").equals([userId, "active"]).first()) ?? null
    );
  }

  async getActiveByGuest(guestId: string): Promise<Cart | null> {
    return (
      (await this.db.carts.where("[guestId+status]").equals([guestId, "active"]).first()) ?? null
    );
  }

  async getOrCreateActiveByUser(input: { userId: string; now: string }): Promise<Cart> {
    return this.db.transaction("rw", this.db.carts, async () => {
      const existing = await this.getActiveByUser(input.userId);
      if (existing !== null) {
        return existing;
      }
      const cart: Cart = {
        id: `cart-user-${input.userId}`,
        ownerType: "user",
        guestId: null,
        userId: input.userId,
        status: "active",
        createdAt: input.now,
        updatedAt: input.now,
        version: 1,
      };
      await this.db.carts.add(cart);
      return cart;
    });
  }

  async getOrCreateActiveByGuest(input: { guestId: string; now: string }): Promise<Cart> {
    return this.db.transaction("rw", this.db.carts, async () => {
      const existing = await this.getActiveByGuest(input.guestId);
      if (existing !== null) {
        return existing;
      }
      const cart: Cart = {
        id: `cart-guest-${input.guestId}`,
        ownerType: "guest",
        guestId: input.guestId,
        userId: null,
        status: "active",
        createdAt: input.now,
        updatedAt: input.now,
        version: 1,
      };
      await this.db.carts.add(cart);
      return cart;
    });
  }

  async listItems(cartId: string): Promise<CartItem[]> {
    return (await this.db.cart_items.where("cartId").equals(cartId).toArray()).sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );
  }

  async addQuantityToActiveCart(
    input: AddCartItemCommand,
  ): Promise<{ cart: Cart; item: CartItem }> {
    const cart =
      input.owner.ownerType === "user"
        ? ((await this.getActiveByUser(input.owner.userId)) ?? {
            id: input.newCartId,
            ownerType: "user" as const,
            userId: input.owner.userId,
            guestId: null,
            status: "active" as const,
            createdAt: input.now,
            updatedAt: input.now,
            version: 1,
          })
        : ((await this.getActiveByGuest(input.owner.guestId)) ?? {
            id: input.newCartId,
            ownerType: "guest" as const,
            userId: null,
            guestId: input.owner.guestId,
            status: "active" as const,
            createdAt: input.now,
            updatedAt: input.now,
            version: 1,
          });
    if ((await this.db.carts.get(cart.id)) === undefined) {
      await this.db.carts.add(cart);
    }
    const variantRecord = requireEntity(
      await this.db.product_variants.get(input.variantId),
      "errors.variant.notFound",
    );
    const variant = fromVariantRecord(variantRecord);
    const product = requireEntity(
      await this.db.products.get(variant.productId),
      "errors.product.notFound",
    );
    const viewer =
      input.owner.ownerType === "guest"
        ? ({ kind: "guest" } as const)
        : await this.viewerForUser(input.owner.userId);
    if (
      !variant.isActive ||
      !canViewerSeeProduct({
        viewer,
        status: product.status,
        requiredRank: product.requiredRank,
      }) ||
      variant.stockQuantity === 0
    ) {
      throw new ApplicationError({
        code:
          variant.stockQuantity === 0 || !variant.isActive ? "OUT_OF_STOCK" : "PERMISSION_DENIED",
        messageKey: "cart.unavailable",
        retryable: false,
      });
    }
    const existing = await this.db.cart_items
      .where("[cartId+variantId]")
      .equals([cart.id, input.variantId])
      .first();
    const quantity = addCartQuantity({
      currentQuantity: existing?.quantity ?? 0,
      addQuantity: input.addQuantity,
      stockQuantity: variant.stockQuantity,
      purchaseLimit: variant.purchaseLimit,
    });
    const item: CartItem =
      existing === undefined
        ? {
            id: input.newItemId,
            cartId: cart.id,
            variantId: variant.id,
            quantity,
            unitEffectivePriceAtAdd: effectiveUnitPrice(variant, input.now),
            createdAt: input.now,
            updatedAt: input.now,
            version: 1,
          }
        : {
            ...existing,
            quantity,
            updatedAt: input.now,
            version: existing.version + 1,
          };
    await this.db.cart_items.put(item);
    const touched = {
      ...cart,
      updatedAt: input.now,
      version: cart.version + 1,
    };
    await this.db.carts.put(touched);
    return { cart: touched, item };
  }

  async setQuantityAndTouchCart(
    input: UpdateCartItemQuantityCommand,
  ): Promise<{ cart: Cart; item: CartItem }> {
    if (input.quantity === 0) {
      throw new ApplicationError({
        code: "VALIDATION",
        messageKey: "cart.zeroDelegatesToRemove",
        retryable: false,
      });
    }
    const [cart, item] = await Promise.all([
      this.db.carts.get(input.cartId),
      this.db.cart_items.get(input.itemId),
    ]);
    const currentCart = requireEntity(cart, "errors.cart.notFound");
    const currentItem = requireEntity(item, "errors.cartItem.notFound");
    assertExpectedVersion(currentCart.version, input.cartExpectedVersion);
    assertExpectedVersion(currentItem.version, input.itemExpectedVersion);
    const variantRecord = requireEntity(
      await this.db.product_variants.get(currentItem.variantId),
      "errors.variant.notFound",
    );
    const variant = fromVariantRecord(variantRecord);
    await this.assertPurchasableForCart(currentCart, variant);
    const maximum = maximumCartQuantity(variant);
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > maximum) {
      throw new ApplicationError({
        code: "QUANTITY_LIMIT_EXCEEDED",
        messageKey: "cart.quantity.limit",
        retryable: false,
      });
    }
    const updatedItem = {
      ...currentItem,
      quantity: input.quantity,
      updatedAt: input.now,
      version: currentItem.version + 1,
    };
    const updatedCart = {
      ...currentCart,
      updatedAt: input.now,
      version: currentCart.version + 1,
    };
    await Promise.all([this.db.cart_items.put(updatedItem), this.db.carts.put(updatedCart)]);
    return { cart: updatedCart, item: updatedItem };
  }

  async deleteItemAndTouchCart(
    input: RemoveCartItemCommand,
  ): Promise<{ cart: Cart; deletedItemId: string }> {
    const [cart, item] = await Promise.all([
      this.db.carts.get(input.cartId),
      this.db.cart_items.get(input.itemId),
    ]);
    const currentCart = requireEntity(cart, "errors.cart.notFound");
    const currentItem = requireEntity(item, "errors.cartItem.notFound");
    assertExpectedVersion(currentCart.version, input.cartExpectedVersion);
    assertExpectedVersion(currentItem.version, input.itemExpectedVersion);
    await this.db.cart_items.delete(currentItem.id);
    const updatedCart = {
      ...currentCart,
      updatedAt: input.now,
      version: currentCart.version + 1,
    };
    await this.db.carts.put(updatedCart);
    return { cart: updatedCart, deletedItemId: currentItem.id };
  }

  async acceptPriceChangesAndTouchCart(
    input: AcceptPriceChangesCommand,
  ): Promise<{ cart: Cart; items: CartItem[] }> {
    const cart = requireEntity(await this.db.carts.get(input.cartId), "errors.cart.notFound");
    assertExpectedVersion(cart.version, input.cartExpectedVersion);
    const items = await this.listItems(cart.id);
    const updatedItems: CartItem[] = [];
    for (const item of items) {
      assertExpectedVersion(item.version, input.itemExpectedVersions[item.id] ?? -1);
      const variantRecord = requireEntity(
        await this.db.product_variants.get(item.variantId),
        "errors.variant.notFound",
      );
      const variant = fromVariantRecord(variantRecord);
      await this.assertPurchasableForCart(cart, variant);
      updatedItems.push({
        ...item,
        unitEffectivePriceAtAdd: effectiveUnitPrice(variant, input.now),
        updatedAt: input.now,
        version: item.version + 1,
      });
    }
    await this.db.cart_items.bulkPut(updatedItems);
    const updatedCart = {
      ...cart,
      updatedAt: input.now,
      version: cart.version + 1,
    };
    await this.db.carts.put(updatedCart);
    return { cart: updatedCart, items: updatedItems };
  }

  async mergeGuestIntoUser(command: MergeGuestCartCommand): Promise<CartMergeResult> {
    const user = requireEntity(await this.db.users.get(command.userId), "errors.user.notFound");
    const userCart = await this.getOrCreateActiveByUser({
      userId: command.userId,
      now: command.now,
    });
    const guestCart = await this.getActiveByGuest(command.guestId);
    if (guestCart === null) {
      return {
        userCartId: userCart.id,
        items: [],
        addedItemCount: 0,
        adjustedItemCount: 0,
        fullyExcludedItemCount: 0,
        addedQuantity: 0,
        overflowQuantity: 0,
        excludedItemCount: 0,
      };
    }
    const [userItems, guestItems] = await Promise.all([
      this.listItems(userCart.id),
      this.listItems(guestCart.id),
    ]);
    const userByVariant = new Map(userItems.map((item) => [item.variantId, item]));
    const results: CartMergeItemResult[] = [];
    for (const guestItem of guestItems) {
      const variantRecord = await this.db.product_variants.get(guestItem.variantId);
      const product =
        variantRecord === undefined
          ? undefined
          : await this.db.products.get(variantRecord.productId);
      const existing = userByVariant.get(guestItem.variantId);
      const previousUserQuantity = existing?.quantity ?? 0;
      let excludedReason: CartMergeItemResult["excludedReason"] = null;
      if (variantRecord === undefined || product === undefined) {
        excludedReason = "NOT_FOUND";
      } else if (product.status !== "published") {
        excludedReason = "UNPUBLISHED";
      } else if (
        product.requiredRank !== null &&
        (user.membershipRank === null || !rankSatisfies(user.membershipRank, product.requiredRank))
      ) {
        excludedReason = "RANK_REQUIRED";
      } else if (!variantRecord.isActive) {
        excludedReason = "INACTIVE";
      } else if (variantRecord.stockQuantity === 0) {
        excludedReason = "OUT_OF_STOCK";
      }
      if (excludedReason !== null) {
        results.push({
          variantId: guestItem.variantId,
          productName: product?.name ?? null,
          optionValue: variantRecord?.optionValue ?? null,
          guestQuantity: guestItem.quantity,
          previousUserQuantity,
          addedQuantity: 0,
          overflowQuantity: guestItem.quantity,
          finalQuantity: previousUserQuantity,
          excludedReason,
        });
        continue;
      }
      const variant = fromVariantRecord(requireEntity(variantRecord, "errors.variant.notFound"));
      const merge = mergeCartQuantity({
        userQuantity: existing?.quantity ?? 0,
        guestQuantity: guestItem.quantity,
        stockQuantity: variant.stockQuantity,
        purchaseLimit: variant.purchaseLimit,
      });
      const item: CartItem =
        existing === undefined
          ? {
              ...guestItem,
              id: `merged-${guestItem.id}`,
              cartId: userCart.id,
              quantity: merge.mergedQuantity,
              updatedAt: command.now,
              version: 1,
            }
          : {
              ...existing,
              quantity: merge.mergedQuantity,
              updatedAt: command.now,
              version: existing.version + 1,
            };
      await this.db.cart_items.put(item);
      results.push({
        variantId: guestItem.variantId,
        productName: product?.name ?? null,
        optionValue: variant.optionValue,
        guestQuantity: guestItem.quantity,
        previousUserQuantity,
        addedQuantity: merge.addedQuantity,
        overflowQuantity: merge.overflowQuantity,
        finalQuantity: merge.mergedQuantity,
        excludedReason: null,
      });
    }
    await this.db.carts.put({
      ...guestCart,
      status: "abandoned",
      updatedAt: command.now,
      version: guestCart.version + 1,
    });
    await this.db.carts.put({
      ...userCart,
      updatedAt: command.now,
      version: userCart.version + 1,
    });
    return {
      userCartId: userCart.id,
      items: results,
      addedItemCount: results.filter((item) => item.addedQuantity > 0).length,
      adjustedItemCount: results.filter(
        (item) => item.overflowQuantity > 0 || item.excludedReason !== null,
      ).length,
      fullyExcludedItemCount: results.filter(
        (item) => item.addedQuantity === 0 && item.excludedReason !== null,
      ).length,
      addedQuantity: results.reduce((total, item) => total + item.addedQuantity, 0),
      overflowQuantity: results.reduce((total, item) => total + item.overflowQuantity, 0),
      excludedItemCount: results.filter(
        (item) => item.excludedReason !== null || item.overflowQuantity > 0,
      ).length,
    };
  }

  async getCartDto(input: {
    cartId: string;
    viewer: import("@/application/contracts").ProductViewer;
    now: string;
  }): Promise<CartDto> {
    const cart = requireEntity(await this.db.carts.get(input.cartId), "errors.cart.notFound");
    const items = await this.listItems(cart.id);
    const membershipRank = input.viewer.kind === "customer" ? input.viewer.membershipRank : null;
    const lines: CartDto["items"] = [];
    for (const item of items) {
      const variantRecord = requireEntity(
        await this.db.product_variants.get(item.variantId),
        "errors.variant.notFound",
      );
      const variant = fromVariantRecord(variantRecord);
      const product = requireEntity(
        await this.db.products.get(variant.productId),
        "errors.product.notFound",
      );
      const image = await this.db.product_images
        .where("productId")
        .equals(product.id)
        .filter((candidate) => candidate.isPrimary)
        .first();
      const imageAsset = productImageManifest.assets.find(
        (asset) => asset.assetId === image?.assetId,
      );
      const currentPrice = effectiveUnitPrice(variant, input.now);
      const totals = calculateOrderTotals(
        [{ unitEffectivePrice: currentPrice, quantity: item.quantity }],
        membershipRank,
      );
      const issues: CartDto["blockingIssues"] = [];
      if (product.status !== "published") issues.push("UNPUBLISHED");
      if (
        product.status === "published" &&
        product.requiredRank !== null &&
        !canViewerSeeProduct({
          viewer: input.viewer,
          status: product.status,
          requiredRank: product.requiredRank,
        })
      ) {
        issues.push("RANK_REQUIRED");
      }
      if (!variant.isActive) issues.push("INACTIVE");
      if (variant.stockQuantity === 0) issues.push("OUT_OF_STOCK");
      else if (item.quantity > variant.stockQuantity) issues.push("INSUFFICIENT_STOCK");
      if (item.unitEffectivePriceAtAdd !== currentPrice) issues.push("PRICE_CHANGED");
      lines.push({
        itemId: item.id,
        itemVersion: item.version,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        sku: variant.sku,
        optionValue: variant.optionValue,
        image: {
          assetId: image?.assetId ?? "placeholder",
          path: imageAsset?.path ?? "/images/placeholder.svg",
          altText: image?.altText ?? `${product.name}の画像`,
        },
        quantity: item.quantity,
        maximumQuantity: maximumCartQuantity(variant),
        unitEffectivePriceAtAdd: item.unitEffectivePriceAtAdd,
        currentUnitEffectivePrice: currentPrice,
        currentViewerUnitPrice: totals.lines[0]?.viewerUnitPrice ?? currentPrice,
        lineSubtotalAmount: totals.subtotalAmount,
        lineDiscountAmount: totals.discountAmount,
        lineTotalAmount: totals.totalAmount - totals.shippingAmount,
        issues,
      });
    }
    const totals = calculateOrderTotals(
      lines.map((line) => ({
        unitEffectivePrice: line.currentUnitEffectivePrice,
        quantity: line.quantity,
      })),
      membershipRank,
    );
    return {
      cartId: cart.id,
      cartVersion: cart.version,
      membershipRank,
      items: lines,
      subtotalAmount: totals.subtotalAmount,
      discountAmount: totals.discountAmount,
      shippingAmount: totals.shippingAmount,
      totalAmount: totals.totalAmount,
      freeShippingRemainingAmount: totals.freeShippingRemainingAmount,
      blockingIssues: [...new Set(lines.flatMap((line) => line.issues))],
    };
  }

  private async viewerForUser(
    userId: string,
  ): Promise<import("@/application/contracts").ProductViewer> {
    const user = requireEntity(await this.db.users.get(userId), "errors.user.notFound");
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
      kind: "customer",
      userId,
      membershipRank: user.membershipRank,
    };
  }

  private async assertPurchasableForCart(cart: Cart, variant: ProductVariant): Promise<void> {
    const product = requireEntity(
      await this.db.products.get(variant.productId),
      "errors.product.notFound",
    );
    const viewer =
      cart.ownerType === "guest"
        ? ({ kind: "guest" } as const)
        : await this.viewerForUser(requireEntity(cart.userId, "errors.cart.ownerMissing"));
    if (
      !variant.isActive ||
      variant.stockQuantity === 0 ||
      !canViewerSeeProduct({
        viewer,
        status: product.status,
        requiredRank: product.requiredRank,
      })
    ) {
      throw new ApplicationError({
        code:
          !variant.isActive || variant.stockQuantity === 0 ? "OUT_OF_STOCK" : "PERMISSION_DENIED",
        messageKey: "cart.unavailable",
        retryable: false,
      });
    }
  }
}

export class DexieCheckoutSessionRepository implements CheckoutSessionRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<CheckoutSession | null> {
    return (await this.db.checkout_sessions.get(id)) ?? null;
  }

  async update(entity: CheckoutSession, expectedVersion: number): Promise<CheckoutSession> {
    const current = requireEntity(
      await this.db.checkout_sessions.get(entity.id),
      "errors.checkout.notFound",
    );
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.checkout_sessions.put(updated);
    return updated;
  }

  async getActiveByUser(userId: string): Promise<CheckoutSession | null> {
    return (
      (await this.db.checkout_sessions
        .where("[userId+status]")
        .equals([userId, "active"])
        .first()) ?? null
    );
  }

  async startOrResume(command: StartOrResumeCheckoutCommand): Promise<CheckoutStartResult> {
    const active = await this.getActiveByUser(command.userId);
    if (
      active !== null &&
      active.cartId === command.cartId &&
      active.cartVersion === command.cartVersion &&
      active.expiresAt > command.now
    ) {
      return { session: active, result: "resumed" };
    }
    let result: CheckoutStartResult["result"] = "created";
    if (active !== null) {
      await this.db.checkout_sessions.put({
        ...active,
        status: active.expiresAt <= command.now ? "expired" : "abandoned",
        updatedAt: command.now,
        version: active.version + 1,
      });
      result = "replaced";
    }
    const expires = new Date(command.now);
    expires.setUTCDate(expires.getUTCDate() + 1);
    const session: CheckoutSession = {
      id: command.checkoutSessionId,
      userId: command.userId,
      cartId: command.cartId,
      cartVersion: command.cartVersion,
      addressSnapshot: null,
      paymentMethodCode: null,
      unlockedStep: "address",
      status: "active",
      expiresAt: expires.toISOString(),
      orderId: null,
      createdAt: command.now,
      updatedAt: command.now,
      version: 1,
    };
    await this.db.checkout_sessions.add(session);
    return { session, result };
  }

  async setAddress(command: SetCheckoutAddressCommand): Promise<CheckoutSession> {
    const current = requireEntity(
      await this.db.checkout_sessions.get(command.checkoutSessionId),
      "errors.checkout.notFound",
    );
    if (current.userId !== command.userId || current.status !== "active") {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "errors.forbidden",
        retryable: false,
      });
    }
    assertExpectedVersion(current.version, command.checkoutExpectedVersion);
    const updated = {
      ...current,
      addressSnapshot: command.address,
      unlockedStep: "payment" as const,
      updatedAt: command.now,
      version: current.version + 1,
    };
    await this.db.checkout_sessions.put(updated);
    return updated;
  }

  async setPayment(command: SetCheckoutPaymentCommand): Promise<CheckoutSession> {
    const current = requireEntity(
      await this.db.checkout_sessions.get(command.checkoutSessionId),
      "errors.checkout.notFound",
    );
    if (
      current.userId !== command.userId ||
      current.status !== "active" ||
      current.addressSnapshot === null
    ) {
      throw new ApplicationError({
        code: "CHECKOUT_STEP_INCOMPLETE",
        messageKey: "checkout.address.required",
        retryable: false,
      });
    }
    assertExpectedVersion(current.version, command.checkoutExpectedVersion);
    const updated = {
      ...current,
      paymentMethodCode: command.paymentMethodCode,
      unlockedStep: "confirm" as const,
      updatedAt: command.now,
      version: current.version + 1,
    };
    await this.db.checkout_sessions.put(updated);
    return updated;
  }

  async getConfirmation(
    checkoutSessionId: string,
    userId: string,
    now: string,
  ): Promise<CheckoutConfirmationDto> {
    const session = requireEntity(
      await this.db.checkout_sessions.get(checkoutSessionId),
      "errors.checkout.notFound",
    );
    if (session.expiresAt <= now && session.status === "active") {
      await this.db.checkout_sessions.put({
        ...session,
        status: "expired",
        updatedAt: now,
        version: session.version + 1,
      });
      throw new ApplicationError({
        code: "CHECKOUT_EXPIRED",
        messageKey: "checkout.expired",
        retryable: false,
      });
    }
    if (
      session.userId !== userId ||
      session.status !== "active" ||
      session.addressSnapshot === null ||
      session.paymentMethodCode === null
    ) {
      throw new ApplicationError({
        code: "CHECKOUT_STEP_INCOMPLETE",
        messageKey: "checkout.incomplete",
        retryable: false,
      });
    }
    const cart = requireEntity(await this.db.carts.get(session.cartId), "errors.cart.notFound");
    if (cart.version !== session.cartVersion) {
      throw new ApplicationError({
        code: "CART_VERSION_CHANGED",
        messageKey: "checkout.cart.changed",
        retryable: false,
      });
    }
    const user = requireEntity(await this.db.users.get(userId), "errors.user.notFound");
    const rank = user.membershipRank ?? "regular";
    const cartDto = await new DexieCartRepository(this.db).getCartDto({
      cartId: cart.id,
      viewer: { kind: "customer", userId, membershipRank: rank },
      now,
    });
    if (cartDto.blockingIssues.length > 0) {
      throw new ApplicationError({
        code: cartDto.blockingIssues.includes("PRICE_CHANGED")
          ? "PRICE_CHANGED"
          : cartDto.blockingIssues.includes("INSUFFICIENT_STOCK")
            ? "INSUFFICIENT_STOCK"
            : "INVALID_STATE",
        messageKey: "checkout.cart.invalid",
        retryable: false,
      });
    }
    return {
      checkoutSessionId: session.id,
      checkoutActionVersion: session.version,
      cartVersion: cart.version,
      items: cartDto.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        optionValue: item.optionValue,
        quantity: item.quantity,
        unitEffectivePrice: item.currentUnitEffectivePrice,
        unitDiscountAmount: item.currentUnitEffectivePrice - item.currentViewerUnitPrice,
        viewerUnitPrice: item.currentViewerUnitPrice,
        lineSubtotalAmount: item.lineSubtotalAmount,
        lineDiscountAmount: item.lineDiscountAmount,
        lineTotalAmount: item.lineTotalAmount,
        image: item.image,
      })),
      address: session.addressSnapshot,
      paymentMethodCode: session.paymentMethodCode,
      subtotalAmount: cartDto.subtotalAmount,
      discountAmount: cartDto.discountAmount,
      shippingAmount: cartDto.shippingAmount,
      totalAmount: cartDto.totalAmount,
      membershipRank: rank,
    };
  }

  async abandon(id: string, expectedVersion: number): Promise<CheckoutSession> {
    const current = requireEntity(
      await this.db.checkout_sessions.get(id),
      "errors.checkout.notFound",
    );
    assertExpectedVersion(current.version, expectedVersion);
    const updated = {
      ...current,
      status: "abandoned" as const,
      version: current.version + 1,
    };
    await this.db.checkout_sessions.put(updated);
    return updated;
  }

  async abandonActiveByUser(userId: string): Promise<number> {
    const active = await this.db.checkout_sessions
      .where("[userId+status]")
      .equals([userId, "active"])
      .toArray();
    await this.db.checkout_sessions.bulkPut(
      active.map((session) => ({
        ...session,
        status: "abandoned" as const,
        version: session.version + 1,
      })),
    );
    return active.length;
  }

  async expireBefore(now: string): Promise<number> {
    const expired = await this.db.checkout_sessions
      .filter((session) => session.status === "active" && session.expiresAt <= now)
      .toArray();
    await this.db.checkout_sessions.bulkPut(
      expired.map((session) => ({
        ...session,
        status: "expired" as const,
        updatedAt: now,
        version: session.version + 1,
      })),
    );
    return expired.length;
  }
}
