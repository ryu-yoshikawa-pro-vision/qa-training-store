"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createScenarioDataset } from "@/seeds/scenarios";
import { BASE_CLOCK, DEFAULT_PAYMENT_DELAY_MS, SCENARIO_METADATA, type PhaseOneScenario } from "@/seeds/metadata";
import type { SeedDataset } from "@/seeds/types";
import type { Order, OrderStatus, MembershipRank, UserRole } from "@/domain/contracts";
import { productImageManifest } from "@/generated/product-image-manifest";

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  role: UserRole | "guest";
  rank: MembershipRank | null;
  status: "active" | "suspended" | "withdrawn";
}

export interface CartItemDetail {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  optionValue: string | null;
  unitPrice: number;
  quantity: number;
  imagePath: string;
  stockQuantity: number;
  sku: string;
}

export interface ShippingAddressInput {
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  phone: string;
}

export interface ScenarioStoreState {
  scenario: PhaseOneScenario;
  clock: string;
  paymentDelayMs: number;
  paymentSimulationMode: "TEST-SUCCESS" | "TEST-DECLINED";
  currentUser: UserSession;
  dataset: SeedDataset;
  cart: CartItemDetail[];
  orderCounter: number;
}

const STORAGE_KEY = "scenario_shop_v1_state";

const GUEST_USER: UserSession = {
  id: "guest-default",
  email: "guest@example.com",
  displayName: "ゲスト様",
  role: "guest",
  rank: null,
  status: "active",
};

export const AVAILABLE_ACCOUNTS: UserSession[] = [
  GUEST_USER,
  {
    id: "user-customer-regular",
    email: "regular@example.com",
    displayName: "一般テスト会員",
    role: "customer",
    rank: "regular",
    status: "active",
  },
  {
    id: "user-customer-gold",
    email: "gold@example.com",
    displayName: "ゴールドテスト会員",
    role: "customer",
    rank: "gold",
    status: "active",
  },
  {
    id: "user-customer-platinum",
    email: "platinum@example.com",
    displayName: "プラチナテスト会員",
    role: "customer",
    rank: "platinum",
    status: "active",
  },
  {
    id: "user-customer-suspended",
    email: "suspended@example.com",
    displayName: "利用停止テスト会員",
    role: "customer",
    rank: "regular",
    status: "suspended",
  },
  {
    id: "user-operator",
    email: "operator@example.com",
    displayName: "運用オペレーター",
    role: "operator",
    rank: null,
    status: "active",
  },
  {
    id: "user-admin",
    email: "admin@example.com",
    displayName: "システム管理者",
    role: "admin",
    rank: null,
    status: "active",
  },
];

function getAssetPath(assetId: string): string {
  const match = productImageManifest.assets.find((a) => a.assetId === assetId);
  return match?.path ?? "/images/products/basic-shirt-front.a1b2c3.webp";
}

function initializeState(scenarioName: PhaseOneScenario = "default"): ScenarioStoreState {
  const dataset = createScenarioDataset(scenarioName);
  
  // Resolve initial session based on scenario
  const initialSessionMeta = SCENARIO_METADATA[scenarioName]?.initialSession;
  let user = GUEST_USER;
  if (initialSessionMeta?.kind === "customer") {
    user = AVAILABLE_ACCOUNTS.find((a) => a.email === initialSessionMeta.email) ?? AVAILABLE_ACCOUNTS[1]!;
  } else if (initialSessionMeta?.kind === "operator") {
    user = AVAILABLE_ACCOUNTS.find((a) => a.role === "operator") ?? GUEST_USER;
  } else if (initialSessionMeta?.kind === "admin") {
    user = AVAILABLE_ACCOUNTS.find((a) => a.role === "admin") ?? GUEST_USER;
  }

  // Create initial cart from seed
  const cartItems: CartItemDetail[] = [];
  const seedCartItems = dataset.cartItems.filter((item) => item.cartId === "cart-regular-active");
  for (const item of seedCartItems) {
    const variant = dataset.productVariants.find((v) => v.id === item.variantId);
    if (!variant) continue;
    const product = dataset.products.find((p) => p.id === variant.productId);
    if (!product) continue;
    const primaryImage = dataset.productImages.find((img) => img.productId === product.id && img.isPrimary);
    const assetId = primaryImage?.assetId ?? "asset-shirt-front";

    cartItems.push({
      id: item.id,
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      optionValue: variant.optionValue,
      unitPrice: variant.salePrice ?? variant.regularPrice,
      quantity: item.quantity,
      imagePath: getAssetPath(assetId),
      stockQuantity: variant.stockQuantity,
      sku: variant.sku,
    });
  }

  return {
    scenario: scenarioName,
    clock: BASE_CLOCK,
    paymentDelayMs: DEFAULT_PAYMENT_DELAY_MS,
    paymentSimulationMode: "TEST-SUCCESS",
    currentUser: user,
    dataset,
    cart: cartItems,
    orderCounter: 6,
  };
}

// In-memory singleton store with external subscribers
let memoryState: ScenarioStoreState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): ScenarioStoreState {
  if (!memoryState) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          memoryState = JSON.parse(stored);
        } catch {
          memoryState = initializeState("default");
        }
      } else {
        memoryState = initializeState("default");
      }
    } else {
      memoryState = initializeState("default");
    }
  }
  return memoryState!;
}

function notify() {
  if (typeof window !== "undefined" && memoryState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch {
      // ignore storage quota exceeded
    }
  }
  for (const listener of listeners) {
    listener();
  }
}

function updateState(updater: (prev: ScenarioStoreState) => ScenarioStoreState) {
  const current = getSnapshot();
  memoryState = updater(current);
  notify();
}

export function useScenarioStore() {
  const subscribe = useCallback((callback: () => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, []);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, () => initializeState("default"));

  const resetToScenario = useCallback((scenario: PhaseOneScenario = "default") => {
    updateState(() => initializeState(scenario));
  }, []);

  const switchUser = useCallback((emailOrRole: string) => {
    const match = AVAILABLE_ACCOUNTS.find(
      (a) => a.email === emailOrRole || a.role === emailOrRole || a.id === emailOrRole
    );
    if (match) {
      updateState((prev) => ({
        ...prev,
        currentUser: match,
      }));
    }
  }, []);

  const setPaymentSimulationMode = useCallback((mode: "TEST-SUCCESS" | "TEST-DECLINED") => {
    updateState((prev) => ({
      ...prev,
      paymentSimulationMode: mode,
    }));
  }, []);

  const setTestClock = useCallback((newClock: string) => {
    updateState((prev) => ({
      ...prev,
      clock: newClock,
    }));
  }, []);

  const addToCart = useCallback(
    (productId: string, variantId: string, quantity: number = 1): { success: boolean; message: string } => {
      const current = getSnapshot();
      const product = current.dataset.products.find((p) => p.id === productId);
      const variant = current.dataset.productVariants.find((v) => v.id === variantId);

      if (!product || !variant) {
        return { success: false, message: "商品またはバリエーションが見つかりません" };
      }

      // Check Rank requirements
      if (product.requiredRank === "gold" && current.currentUser.rank !== "gold" && current.currentUser.rank !== "platinum") {
        return { success: false, message: "この商品はゴールド会員以上限定です" };
      }
      if (product.requiredRank === "platinum" && current.currentUser.rank !== "platinum") {
        return { success: false, message: "この商品はプラチナ会員限定です" };
      }

      // Check stock
      if (variant.stockQuantity <= 0) {
        return { success: false, message: "申し訳ありません。この商品は在庫切れです" };
      }

      const existingIndex = current.cart.findIndex((item) => item.variantId === variantId);
      const currentQty = existingIndex >= 0 ? current.cart[existingIndex]!.quantity : 0;
      const targetQty = currentQty + quantity;

      if (targetQty > variant.purchaseLimit) {
        return { success: false, message: `購入制限（最大${variant.purchaseLimit}点）を超えています` };
      }
      if (targetQty > variant.stockQuantity) {
        return { success: false, message: `在庫数（残り${variant.stockQuantity}点）を超える数量は追加できません` };
      }

      const primaryImage = current.dataset.productImages.find((img) => img.productId === product.id && img.isPrimary);
      const assetId = primaryImage?.assetId ?? "asset-shirt-front";
      const unitPrice = variant.salePrice ?? variant.regularPrice;

      updateState((prev) => {
        const newCart = [...prev.cart];
        if (existingIndex >= 0) {
          const item = newCart[existingIndex]!;
          newCart[existingIndex] = {
            ...item,
            quantity: targetQty,
            unitPrice,
          };
        } else {
          newCart.push({
            id: `cart-item-${prev.orderCounter}-${Math.random().toString(36).slice(2, 6)}`,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            optionValue: variant.optionValue,
            unitPrice,
            quantity,
            imagePath: getAssetPath(assetId),
            stockQuantity: variant.stockQuantity,
            sku: variant.sku,
          });
        }
        return { ...prev, cart: newCart };
      });

      return { success: true, message: `「${product.name}${variant.optionValue ? ` (${variant.optionValue})` : ""}」をカートに追加しました` };
    },
    []
  );

  const updateCartQuantity = useCallback((cartItemId: string, newQuantity: number) => {
    updateState((prev) => {
      if (newQuantity <= 0) {
        return {
          ...prev,
          cart: prev.cart.filter((item) => item.id !== cartItemId),
        };
      }
      return {
        ...prev,
        cart: prev.cart.map((item) => {
          if (item.id === cartItemId) {
            const clamped = Math.min(newQuantity, item.stockQuantity, 5);
            return { ...item, quantity: clamped };
          }
          return item;
        }),
      };
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    updateState((prev) => ({
      ...prev,
      cart: prev.cart.filter((item) => item.id !== cartItemId),
    }));
  }, []);

  const clearCart = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      cart: [],
    }));
  }, []);

  const processOrder = useCallback(
    async (
      shippingAddress: ShippingAddressInput,
      paymentMethodCode: "TEST-SUCCESS" | "TEST-DECLINED"
    ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
      const current = getSnapshot();

      if (current.currentUser.status === "suspended") {
        return { success: false, error: "アカウントが利用停止中のため、注文できません" };
      }

      if (current.cart.length === 0) {
        return { success: false, error: "カートが空です" };
      }

      // Check stock availability
      for (const item of current.cart) {
        const variant = current.dataset.productVariants.find((v) => v.id === item.variantId);
        if (!variant || variant.stockQuantity < item.quantity) {
          return {
            success: false,
            error: `商品「${item.productName}」の在庫が不足しています（残り: ${variant?.stockQuantity ?? 0}点）`,
          };
        }
      }

      // Simulate payment delay
      await new Promise((resolve) => setTimeout(resolve, current.paymentDelayMs));

      if (paymentMethodCode === "TEST-DECLINED") {
        // Record failed order in dataset for QA inspection
        const orderNumber = `ORD-20260701-${String(current.orderCounter).padStart(4, "0")}`;
        const orderId = `order-failed-${current.orderCounter}`;
        
        const subtotal = current.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const shippingAmount = subtotal >= 5000 ? 0 : 500;
        const totalAmount = subtotal + shippingAmount;

        updateState((prev) => {
          const failedOrder: Order = {
            id: orderId,
            orderNumber,
            userId: prev.currentUser.id,
            checkoutSessionId: `checkout-${prev.orderCounter}`,
            status: "payment_failed" as OrderStatus,
            subtotalAmount: subtotal,
            discountAmount: 0,
            shippingAmount,
            totalAmount,
            membershipRankSnapshot: prev.currentUser.rank ?? "regular",
            shippingAddressSnapshot: {
              recipientName: shippingAddress.recipientName,
              postalCode: shippingAddress.postalCode,
              prefecture: shippingAddress.prefecture,
              city: shippingAddress.city,
              addressLine1: shippingAddress.addressLine1,
              addressLine2: shippingAddress.addressLine2 ?? null,
              phone: shippingAddress.phone,
            },
            createdAt: prev.clock,
            updatedAt: prev.clock,
            version: 1,
          };

          return {
            ...prev,
            orderCounter: prev.orderCounter + 1,
            dataset: {
              ...prev.dataset,
              orders: [failedOrder, ...prev.dataset.orders],
            },
          };
        });

        return { success: false, error: "決済処理が拒否されました (TEST-DECLINED: 模擬カード利用拒否)" };
      }

      // Successful order
      const orderNumber = `ORD-20260701-${String(current.orderCounter).padStart(4, "0")}`;
      const orderId = `order-success-${current.orderCounter}`;
      const subtotal = current.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const shippingAmount = subtotal >= 5000 ? 0 : 500;
      const totalAmount = subtotal + shippingAmount;

      updateState((prev) => {
        // Decrement variant stock
        const updatedVariants = prev.dataset.productVariants.map((v) => {
          const cartMatch = prev.cart.find((item) => item.variantId === v.id);
          if (cartMatch) {
            return {
              ...v,
              stockQuantity: Math.max(0, v.stockQuantity - cartMatch.quantity),
            };
          }
          return v;
        });

        const newOrder: Order = {
          id: orderId,
          orderNumber,
          userId: prev.currentUser.id,
          checkoutSessionId: `checkout-${prev.orderCounter}`,
          status: "paid" as OrderStatus,
          subtotalAmount: subtotal,
          discountAmount: 0,
          shippingAmount,
          totalAmount,
          membershipRankSnapshot: prev.currentUser.rank ?? "regular",
          shippingAddressSnapshot: {
            recipientName: shippingAddress.recipientName,
            postalCode: shippingAddress.postalCode,
            prefecture: shippingAddress.prefecture,
            city: shippingAddress.city,
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2 ?? null,
            phone: shippingAddress.phone,
          },
          createdAt: prev.clock,
          updatedAt: prev.clock,
          version: 1,
        };

        return {
          ...prev,
          orderCounter: prev.orderCounter + 1,
          cart: [], // clear cart
          dataset: {
            ...prev.dataset,
            productVariants: updatedVariants,
            orders: [newOrder, ...prev.dataset.orders],
          },
        };
      });

      return { success: true, orderId };
    },
    []
  );

  const updateOrderStatus = useCallback((orderId: string, nextStatus: OrderStatus) => {
    updateState((prev) => {
      const updatedOrders = prev.dataset.orders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: nextStatus,
            updatedAt: prev.clock,
          };
        }
        return o;
      });
      return {
        ...prev,
        dataset: {
          ...prev.dataset,
          orders: updatedOrders,
        },
      };
    });
  }, []);

  return {
    isClient,
    state,
    resetToScenario,
    switchUser,
    setPaymentSimulationMode,
    setTestClock,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    processOrder,
    updateOrderStatus,
    getAssetPath,
  };
}
