import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { INPUT_LIMITS } from "@/application/contracts";
import type { CheckoutConfirmationDto, OrderDetailDto } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import type { CheckoutSession, ShippingAddressSnapshot } from "@/domain/contracts";
import { router, useLocalSearchParams } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import {
  NativeCheckoutAddressScreen,
  NativeCheckoutCompleteScreen,
  NativeCheckoutConfirmScreen,
  NativeCheckoutFailedScreen,
  NativeCheckoutPaymentScreen,
  NativeAddressesScreen,
  NativeLoginScreen,
  NativeOrderDetailScreen,
  NativeProfileScreen,
  NativeReviewScreen,
} from "@/presentation/native/native-purchase-screens";
import { useNativeRuntime } from "@/presentation/native/native-runtime-provider";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
  useNavigation: () => ({ dispatch: jest.fn() }),
}));

jest.mock("expo-router/react-navigation", () => ({
  usePreventRemove: jest.fn(),
}));

jest.mock("@/presentation/native/native-runtime-provider", () => ({
  useNativeRuntime: jest.fn(),
}));

const useNativeRuntimeMock = jest.mocked(useNativeRuntime);
const mockRouterPush = jest.mocked(router.push);
const mockRouterReplace = jest.mocked(router.replace);
const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const mockUsePreventRemove = jest.mocked(usePreventRemove);

function runtime(services: Record<string, unknown>): void {
  useNativeRuntimeMock.mockReturnValue({
    ready: true,
    error: null,
    retry: jest.fn(),
    services: services as never,
  });
}

const address: ShippingAddressSnapshot = {
  recipientName: "Native Customer",
  postalCode: "1000001",
  prefecture: "東京都",
  city: "千代田区千代田",
  addressLine1: "1-1",
  addressLine2: null,
  phone: "09000000000",
};

const checkoutSession: CheckoutSession = {
  id: "checkout-native-test",
  userId: "user-customer-regular",
  cartId: "cart-native-test",
  cartVersion: 1,
  addressSnapshot: address,
  paymentMethodCode: null,
  unlockedStep: "payment",
  status: "active",
  expiresAt: "2026-07-02T03:00:00.000Z",
  orderId: null,
  createdAt: "2026-07-01T03:00:00.000Z",
  updatedAt: "2026-07-01T03:00:00.000Z",
  version: 2,
};

const nativeSucceededPaymentAttempt: OrderDetailDto["paymentAttempts"][number] = {
  attemptNumber: 1,
  methodCode: "TEST-SUCCESS",
  status: "succeeded",
  errorDisplayKey: null,
  createdAt: "2026-07-01T03:01:00.000Z",
  processedAt: "2026-07-01T03:01:01.000Z",
};

const nativePaidOrder: OrderDetailDto = {
  orderId: "order-native-result",
  orderNumber: "ORD-NATIVE-RESULT",
  orderStatus: "paid",
  totalAmount: 2500,
  orderActionVersion: 2,
  createdAt: "2026-07-01T03:00:00.000Z",
  subtotalAmount: 2000,
  discountAmount: 0,
  shippingAmount: 500,
  membershipRankSnapshot: "regular",
  shippingAddress: address,
  items: [],
  paymentAttempts: [nativeSucceededPaymentAttempt],
  shipment: {
    status: "pending",
    carrierName: null,
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null,
  },
  timeline: [],
};

const nativeFailedOrder: OrderDetailDto = {
  ...nativePaidOrder,
  orderStatus: "payment_failed",
  paymentAttempts: [
    {
      ...nativeSucceededPaymentAttempt,
      status: "failed",
      errorDisplayKey: "payment.errors.DECLINED",
      processedAt: "2026-07-01T03:01:01.000Z",
    },
  ],
  shipment: null,
};

function authenticationRequiredError(): ApplicationError {
  return new ApplicationError({
    code: "AUTHENTICATION_REQUIRED",
    messageKey: "auth.required",
    retryable: false,
  });
}

describe("Native customer purchase screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ orderItemId: "order-delivered-item-7" });
  });

  it("uses shared limits on Native account and address inputs", async () => {
    runtime({ auth: { login: jest.fn() } });
    const loginScreen = await render(<NativeLoginScreen />);
    expect(loginScreen.getByTestId("native-login-email").props.maxLength).toBe(INPUT_LIMITS.email);
    expect(loginScreen.getByTestId("native-login-password").props.maxLength).toBe(
      INPUT_LIMITS.passwordMax,
    );

    runtime({ account: { listAddresses: jest.fn().mockResolvedValue([]) } });
    const addressScreen = await render(<NativeAddressesScreen />);
    await waitFor(() => expect(addressScreen.getByTestId("native-addresses-screen")).toBeTruthy());
    expect(addressScreen.getByTestId("native-address-label").props.maxLength).toBe(
      INPUT_LIMITS.addressLabel,
    );
    expect(addressScreen.getByTestId("native-address-recipient").props.maxLength).toBe(
      INPUT_LIMITS.recipientName,
    );
    expect(addressScreen.getByTestId("native-address-prefecture").props.maxLength).toBe(
      INPUT_LIMITS.prefecture,
    );
    expect(addressScreen.getByTestId("native-address-city").props.maxLength).toBe(
      INPUT_LIMITS.city,
    );
    expect(addressScreen.getByTestId("native-address-line1").props.maxLength).toBe(
      INPUT_LIMITS.addressLine1,
    );
  }, 15_000);

  it("logs in through the Native Auth service and returns to the requested route", async () => {
    const login = jest.fn().mockResolvedValue({ user: { role: "customer" } });
    runtime({ auth: { login } });

    const screen = await render(<NativeLoginScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-login-submit"));
    });

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: "regular@example.com",
        password: "testpass1",
      }),
    );
    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith("/"));
  }, 15_000);

  it("surfaces an unexpected checkout lookup error after login", async () => {
    const login = jest.fn().mockResolvedValue({ user: { role: "customer" } });
    const getActive = jest.fn().mockRejectedValue(
      new ApplicationError({
        code: "STORAGE_READ_FAILED",
        messageKey: "storage.read.failed",
        retryable: true,
      }),
    );
    mockUseLocalSearchParams.mockReturnValue({ returnTo: "/checkout/payment" });
    runtime({ auth: { login }, checkout: { getActive } });

    const screen = await render(<NativeLoginScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-login-submit"));
    });

    await waitFor(() => expect(screen.getByTestId("native-purchase-error")).toBeTruthy());
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("sends a management role to the Native unsupported screen before checkout recovery", async () => {
    const login = jest.fn().mockResolvedValue({ user: { role: "admin" } });
    const getActive = jest.fn();
    mockUseLocalSearchParams.mockReturnValue({ returnTo: "/checkout/payment" });
    runtime({ auth: { login }, checkout: { getActive } });

    const screen = await render(<NativeLoginScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-login-submit"));
    });

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith("/"));
    expect(getActive).not.toHaveBeenCalled();
  });

  it.each([
    ["address", NativeCheckoutAddressScreen, "/checkout/address"],
    ["payment", NativeCheckoutPaymentScreen, "/checkout/payment"],
    ["confirm", NativeCheckoutConfirmScreen, "/checkout/confirm"],
  ] as const)(
    "returns to the %s checkout step when authentication expires",
    async (_step, Screen, returnTo) => {
      const getActive = jest.fn().mockRejectedValue(authenticationRequiredError());
      runtime({
        account: { listAddresses: jest.fn().mockResolvedValue([]) },
        checkout: { getActive, getConfirmation: jest.fn().mockResolvedValue(null) },
      });

      await render(<Screen />);

      await waitFor(() =>
        expect(mockRouterReplace).toHaveBeenCalledWith({
          pathname: "/login",
          params: { returnTo },
        }),
      );
    },
  );

  it.each([
    ["regular", "一般会員", "0%", "商品小計5,000円以上で送料無料"],
    ["gold", "ゴールド会員", "5%", "商品小計5,000円以上で送料無料"],
    ["platinum", "プラチナ会員", "10%", "いつでも送料無料"],
  ] as const)(
    "shows account status, %s membership benefits, and no internal account ID",
    async (membershipRank, rankLabel, discount, shippingBenefit) => {
      const getProfile = jest.fn().mockResolvedValue({
        id: "user-customer-regular",
        email: "regular@example.com",
        displayName: "一般テスト会員",
        phone: "09000000000",
        role: "customer",
        membershipRank,
        accountStatus: "active",
        actionVersion: 1,
      });
      runtime({ account: { getProfile } });

      const screen = await render(<NativeProfileScreen />);
      await waitFor(() => expect(screen.getByTestId("native-profile-benefits")).toBeTruthy());
      expect(screen.getByText("アカウント状態：利用中")).toBeTruthy();
      expect(screen.getByText(`会員ランク：${rankLabel}`)).toBeTruthy();
      expect(screen.getByText(`会員割引：${discount}`)).toBeTruthy();
      expect(screen.getByText(`送料特典：${shippingBenefit}`)).toBeTruthy();
      expect(screen.queryByText("user-customer-regular")).toBeNull();
      expect(screen.queryByText("管理者")).toBeNull();
    },
  );

  it("shows a retry state when profile loading fails", async () => {
    const getProfile = jest.fn().mockRejectedValue(new Error("profile unavailable"));
    runtime({ account: { getProfile } });

    const screen = await render(<NativeProfileScreen />);

    await waitFor(() => expect(screen.getByTestId("native-profile-retry")).toBeTruthy());
    expect(screen.getByText("profile unavailable")).toBeTruthy();
  });

  it("logs out from the profile and returns to the home route", async () => {
    const getProfile = jest.fn().mockResolvedValue({
      id: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      phone: "09000000000",
      role: "customer",
      membershipRank: "regular",
      accountStatus: "active",
      actionVersion: 1,
    });
    const logout = jest.fn().mockResolvedValue(undefined);
    runtime({ account: { getProfile }, auth: { logout } });

    const screen = await render(<NativeProfileScreen />);
    await waitFor(() => expect(screen.getByTestId("native-profile-screen")).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-profile-logout"));
    });

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(mockRouterReplace).toHaveBeenCalledWith("/");
  });

  it("surfaces a profile logout failure and releases the busy state", async () => {
    const getProfile = jest.fn().mockResolvedValue({
      id: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      phone: "09000000000",
      role: "customer",
      membershipRank: "regular",
      accountStatus: "active",
      actionVersion: 1,
    });
    const logout = jest.fn().mockRejectedValue(new Error("logout unavailable"));
    runtime({ account: { getProfile }, auth: { logout } });

    const screen = await render(<NativeProfileScreen />);
    await waitFor(() => expect(screen.getByTestId("native-profile-screen")).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-profile-logout"));
    });

    await waitFor(() => expect(screen.getByText("logout unavailable")).toBeTruthy());
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("native-profile-logout").props.accessibilityState).toEqual({
      disabled: false,
    });
  });

  it("uses a keyboard avoiding surface for the profile form", async () => {
    const getProfile = jest.fn().mockResolvedValue({
      id: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      phone: "09000000000",
      role: "customer",
      membershipRank: "regular",
      accountStatus: "active",
      actionVersion: 1,
    });
    runtime({ account: { getProfile } });

    const screen = await render(<NativeProfileScreen />);

    await waitFor(() => expect(screen.getByTestId("native-profile-screen")).toBeTruthy());
    expect(screen.getByTestId("native-profile-screen-keyboard")).toBeTruthy();
  });

  it("keeps the unsaved changes guard active for a dirty profile", async () => {
    const getProfile = jest.fn().mockResolvedValue({
      id: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      phone: "09000000000",
      role: "customer",
      membershipRank: "regular",
      accountStatus: "active",
      actionVersion: 1,
    });
    runtime({ account: { getProfile } });

    const screen = await render(<NativeProfileScreen />);
    await waitFor(() => expect(screen.getByTestId("native-profile-screen")).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("native-profile-display-name"), "変更後の表示名");
    });

    await waitFor(() =>
      expect(mockUsePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function)),
    );
  });

  it("restores the previously saved Native payment method on revisit", async () => {
    const setPayment = jest.fn().mockResolvedValue({
      ...checkoutSession,
      paymentMethodCode: "TEST-DECLINED",
      unlockedStep: "confirm",
      version: 4,
    });
    runtime({
      checkout: {
        getActive: jest.fn().mockResolvedValue({
          ...checkoutSession,
          paymentMethodCode: "TEST-DECLINED",
          unlockedStep: "confirm",
          version: 3,
        }),
        setPayment,
      },
    });
    const screen = await render(<NativeCheckoutPaymentScreen />);
    await waitFor(() =>
      expect(screen.getByTestId("native-checkout-payment-session-ready")).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-checkout-payment-next"));
    });
    await waitFor(() =>
      expect(setPayment).toHaveBeenCalledWith({
        checkoutSessionId: checkoutSession.id,
        checkoutExpectedVersion: 3,
        paymentMethodCode: "TEST-DECLINED",
      }),
    );
    expect(mockRouterPush).toHaveBeenCalledWith("/checkout/confirm");
  });

  it("selects a payment method and advances the checkout step", async () => {
    const setPayment = jest.fn().mockResolvedValue({
      ...checkoutSession,
      paymentMethodCode: "TEST-DECLINED",
      unlockedStep: "confirm",
      version: 3,
    });
    runtime({
      checkout: {
        getActive: jest.fn().mockResolvedValue(checkoutSession),
        setPayment,
      },
    });

    const screen = await render(<NativeCheckoutPaymentScreen />);
    await waitFor(() => expect(screen.getByTestId("native-checkout-payment-screen")).toBeTruthy());
    expect(screen.getByTestId("native-checkout-payment-session-ready")).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-payment-method-TEST-DECLINED"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-checkout-payment-next"));
    });

    await waitFor(() =>
      expect(setPayment).toHaveBeenCalledWith({
        checkoutSessionId: checkoutSession.id,
        checkoutExpectedVersion: checkoutSession.version,
        paymentMethodCode: "TEST-DECLINED",
      }),
    );
    expect(mockRouterPush).toHaveBeenCalledWith("/checkout/confirm");
  });

  it.each([
    [NativeCheckoutCompleteScreen, nativeFailedOrder, "native-checkout-failed-screen"],
    [NativeCheckoutFailedScreen, nativePaidOrder, "native-checkout-complete-screen"],
  ] as const)(
    "renders the persisted result state instead of the route presentation (%s)",
    async (Screen, order, expectedTestId) => {
      mockUseLocalSearchParams.mockReturnValue({ orderId: order.orderId });
      const getMyOrder = jest.fn().mockResolvedValue(order);
      runtime({ checkout: { getMyOrder } });

      const screen = await render(<Screen />);

      await waitFor(() => expect(getMyOrder).toHaveBeenCalledWith(order.orderId));
      expect(screen.getByTestId(expectedTestId)).toBeTruthy();
    },
  );

  it("uses the result boundary when orderId is missing without looking up an order", async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const getMyOrder = jest.fn();
    runtime({ checkout: { getMyOrder } });

    const screen = await render(<NativeCheckoutCompleteScreen />);

    await waitFor(() => expect(screen.getByTestId("native-checkout-result-boundary")).toBeTruthy());
    expect(getMyOrder).not.toHaveBeenCalled();
    expect(screen.queryByTestId("native-checkout-complete-screen")).toBeNull();
  });

  it("uses the result boundary for an unauthorized order", async () => {
    mockUseLocalSearchParams.mockReturnValue({ orderId: nativePaidOrder.orderId });
    const getMyOrder = jest.fn().mockRejectedValue(new Error("order is not owned by the customer"));
    runtime({ checkout: { getMyOrder } });

    const screen = await render(<NativeCheckoutCompleteScreen />);

    await waitFor(() => expect(screen.getByTestId("native-checkout-result-boundary")).toBeTruthy());
    expect(screen.queryByTestId("native-checkout-complete-screen")).toBeNull();
  });

  it("keeps the failed result and retry action after retryPayment fails", async () => {
    mockUseLocalSearchParams.mockReturnValue({ orderId: nativeFailedOrder.orderId });
    const getMyOrder = jest.fn().mockResolvedValue(nativeFailedOrder);
    const retryPayment = jest.fn().mockRejectedValue(new Error("再決済に失敗しました"));
    runtime({ checkout: { getMyOrder, retryPayment } });

    const screen = await render(<NativeCheckoutFailedScreen />);
    await waitFor(() => expect(screen.getByTestId("native-checkout-failed-screen")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("native-payment-retry"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("native-purchase-error")).toHaveTextContent("再決済に失敗しました"),
    );
    expect(screen.getByTestId("native-checkout-failed-screen")).toBeTruthy();
    expect(screen.queryByTestId("native-checkout-result-boundary")).toBeNull();
    expect(screen.getByTestId("native-payment-retry")).toBeTruthy();
    expect(screen.getByTestId("native-payment-retry").props.accessibilityState).toEqual({
      disabled: false,
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("native-payment-retry"));
    });
    expect(retryPayment).toHaveBeenCalledTimes(2);
  });

  it("keeps the Native payment step locked when the Cart version changed", async () => {
    const getActive = jest.fn().mockRejectedValue(
      new ApplicationError({
        code: "CART_VERSION_CHANGED",
        messageKey: "checkout.cart.changed",
        retryable: false,
      }),
    );
    const start = jest.fn();
    runtime({ checkout: { getActive, start } });
    const screen = await render(<NativeCheckoutPaymentScreen />);
    await waitFor(() => expect(screen.getByTestId("native-purchase-error")).toBeTruthy());
    expect(screen.queryByTestId("native-checkout-payment-session-ready")).toBeNull();
    expect(start).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalledWith("/checkout/confirm");
  });

  it("does not expose the Payment ready marker without a valid checkout session", async () => {
    runtime({
      checkout: {
        getActive: jest.fn().mockRejectedValue(
          new ApplicationError({
            code: "CHECKOUT_STEP_INCOMPLETE",
            messageKey: "checkout.payment.locked",
            retryable: false,
          }),
        ),
      },
    });

    const screen = await render(<NativeCheckoutPaymentScreen />);
    await waitFor(() => expect(screen.getByTestId("native-checkout-payment-screen")).toBeTruthy());
    expect(screen.queryByTestId("native-checkout-payment-session-ready")).toBeNull();
  });

  it("exposes the Confirm ready marker only after confirmation data is loaded", async () => {
    let resolveConfirmation: ((value: CheckoutConfirmationDto) => void) | undefined;
    const confirmationPromise = new Promise<CheckoutConfirmationDto>((resolve) => {
      resolveConfirmation = resolve;
    });
    const confirmation: CheckoutConfirmationDto = {
      checkoutSessionId: checkoutSession.id,
      checkoutActionVersion: checkoutSession.version,
      cartVersion: checkoutSession.cartVersion,
      items: [
        {
          variantId: "variant-basic-shirt-02",
          productName: "ベーシックTシャツ",
          sku: "BASIC-02",
          optionValue: "M",
          quantity: 2,
          unitEffectivePrice: 2000,
          unitDiscountAmount: 100,
          viewerUnitPrice: 1900,
          lineSubtotalAmount: 4000,
          lineDiscountAmount: 200,
          lineTotalAmount: 3800,
          image: { assetId: "asset-shirt-front", path: "/images/shirt.webp", altText: "Tシャツ" },
        },
      ],
      address: { ...address, addressLine2: "青山ビル101" },
      paymentMethodCode: "TEST-DECLINED",
      subtotalAmount: 4000,
      discountAmount: 200,
      shippingAmount: 500,
      totalAmount: 4300,
      membershipRank: "gold",
    };
    runtime({
      checkout: {
        getActive: jest.fn().mockResolvedValue({
          ...checkoutSession,
          paymentMethodCode: "TEST-DECLINED",
          unlockedStep: "confirm",
        }),
        getConfirmation: jest.fn().mockReturnValue(confirmationPromise),
      },
    });

    const screen = await render(<NativeCheckoutConfirmScreen />);
    await waitFor(() => expect(screen.queryByTestId("native-checkout-confirm-submit")).toBeNull());
    expect(screen.queryByTestId("native-checkout-confirm-screen")).toBeNull();
    expect(resolveConfirmation).toBeDefined();
    await act(async () => resolveConfirmation?.(confirmation));
    await waitFor(() => expect(screen.getByTestId("native-checkout-confirm-submit")).toBeTruthy());
    expect(screen.getByText("配送先：Native Customer 様")).toBeTruthy();
    expect(screen.getByText(/青山ビル101/)).toBeTruthy();
    expect(screen.getByText("支払方法：失敗：DECLINED")).toBeTruthy();
    expect(screen.getByText("ベーシックTシャツ")).toBeTruthy();
    expect(screen.getByText(/M・2点/)).toBeTruthy();
    expect(screen.getByText("商品小計：¥4,000")).toBeTruthy();
    expect(screen.getByText("会員割引：-¥200")).toBeTruthy();
    expect(screen.getByText("送料：¥500")).toBeTruthy();
    expect(screen.getByText("合計 ¥4,300")).toBeTruthy();
  });

  it("shows a recovery action instead of an endless loading state when confirmation fails", async () => {
    const getConfirmation = jest.fn().mockRejectedValue(
      new ApplicationError({
        code: "CART_VERSION_CHANGED",
        messageKey: "checkout.cart.changed",
        retryable: false,
      }),
    );
    runtime({
      checkout: {
        getActive: jest.fn().mockResolvedValue({
          ...checkoutSession,
          paymentMethodCode: "TEST-DECLINED",
          unlockedStep: "confirm",
        }),
        getConfirmation,
      },
    });

    const screen = await render(<NativeCheckoutConfirmScreen />);
    await waitFor(() => expect(screen.getByText("注文内容を確認できません")).toBeTruthy());
    expect(screen.queryByTestId("native-checkout-confirm-submit")).toBeNull();
    expect(screen.getByText("配送先からやり直す")).toBeTruthy();
    expect(screen.getByText("カートを確認する")).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByText("カートを確認する")));
    expect(mockRouterReplace).toHaveBeenCalledWith("/cart");
    await act(async () => fireEvent.press(screen.getByText("配送先からやり直す")));
    expect(mockRouterReplace).toHaveBeenCalledWith("/checkout/address");
    expect(getConfirmation).toHaveBeenCalledWith(checkoutSession.id);
  });

  it("keeps the order unconfirmed and offers the cart after a price change during submission", async () => {
    const confirmation: CheckoutConfirmationDto = {
      checkoutSessionId: checkoutSession.id,
      checkoutActionVersion: 3,
      cartVersion: checkoutSession.cartVersion,
      items: [],
      address,
      paymentMethodCode: "TEST-SUCCESS",
      subtotalAmount: 2000,
      discountAmount: 0,
      shippingAmount: 500,
      totalAmount: 2500,
      membershipRank: "regular",
    };
    const beginOrder = jest.fn().mockRejectedValue(
      new ApplicationError({
        code: "PRICE_CHANGED",
        messageKey: "checkout.cart.invalid",
        retryable: false,
      }),
    );
    runtime({
      checkout: {
        getActive: jest.fn().mockResolvedValue({
          ...checkoutSession,
          paymentMethodCode: "TEST-SUCCESS",
          unlockedStep: "confirm",
          version: 3,
        }),
        getConfirmation: jest.fn().mockResolvedValue(confirmation),
        beginOrder,
      },
    });

    const screen = await render(<NativeCheckoutConfirmScreen />);
    await waitFor(() => expect(screen.getByTestId("native-checkout-confirm-submit")).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId("native-checkout-confirm-submit")));
    await waitFor(() =>
      expect(screen.getByTestId("native-checkout-confirm-review-cart")).toBeTruthy(),
    );
    expect(beginOrder).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/checkout/processing" }),
    );
    await act(async () =>
      fireEvent.press(screen.getByTestId("native-checkout-confirm-review-cart")),
    );
    expect(mockRouterReplace).toHaveBeenCalledWith("/cart");
  });

  it("does not load confirmation when the required checkout step is locked", async () => {
    const getConfirmation = jest.fn();
    runtime({
      checkout: {
        getActive: jest.fn().mockRejectedValue(
          new ApplicationError({
            code: "CHECKOUT_STEP_INCOMPLETE",
            messageKey: "checkout.confirm.locked",
            retryable: false,
          }),
        ),
        getConfirmation,
      },
    });
    const screen = await render(<NativeCheckoutConfirmScreen />);
    await waitFor(() => expect(screen.getByText("注文内容を確認できません")).toBeTruthy());
    expect(getConfirmation).not.toHaveBeenCalled();
    expect(screen.queryByTestId("native-checkout-confirm-submit")).toBeNull();
  });

  it.each([
    ["created", "native-checkout-session-started", "native-checkout-session-replaced"],
    ["replaced", "native-checkout-session-replaced", "native-checkout-session-started"],
  ] as const)(
    "distinguishes %s checkout session recovery from the other notice",
    async (result, expectedNotice, absentNotice) => {
      const getActive = jest.fn().mockRejectedValue(
        new ApplicationError({
          code: "CHECKOUT_STEP_INCOMPLETE",
          messageKey: "checkout.start.required",
          retryable: false,
        }),
      );
      const start = jest.fn().mockResolvedValue({
        result,
        session: { ...checkoutSession, addressSnapshot: null, unlockedStep: "address" },
      });
      runtime({
        account: { listAddresses: jest.fn().mockResolvedValue([]) },
        cart: { getCart: jest.fn().mockResolvedValue({ cartVersion: 1 }) },
        checkout: { getActive, start },
      });

      const screen = await render(<NativeCheckoutAddressScreen />);
      await waitFor(() => expect(screen.getByTestId(expectedNotice)).toBeTruthy());
      expect(screen.queryByTestId(absentNotice)).toBeNull();
      expect(start).toHaveBeenCalledWith({ cartVersion: 1 });
      if (result === "replaced") {
        expect(
          screen.getByText("カートの更新により、購入手続きを最新の内容へ置き換えました。"),
        ).toBeTruthy();
      }
    },
  );

  it("does not start a replacement checkout after an unexpected Native storage read error", async () => {
    const getActive = jest.fn().mockRejectedValue(
      new ApplicationError({
        code: "STORAGE_READ_FAILED",
        messageKey: "storage.read.failed",
        retryable: true,
      }),
    );
    const start = jest.fn();
    const getCart = jest.fn();
    runtime({
      account: { listAddresses: jest.fn().mockResolvedValue([]) },
      cart: { getCart },
      checkout: { getActive, start },
    });

    const screen = await render(<NativeCheckoutAddressScreen />);
    await waitFor(() => expect(screen.getByTestId("native-purchase-error")).toBeTruthy());
    expect(start).not.toHaveBeenCalled();
    expect(getCart).not.toHaveBeenCalled();
    expect(screen.queryByTestId("native-checkout-address-session-ready")).toBeNull();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("restores the previously entered shipping snapshot on Native checkout resume", async () => {
    const resumedAddress = { ...address, postalCode: "1500001", city: "渋谷区" };
    runtime({
      account: { listAddresses: jest.fn().mockResolvedValue([]) },
      checkout: {
        getActive: jest.fn().mockResolvedValue({
          ...checkoutSession,
          addressSnapshot: resumedAddress,
          unlockedStep: "payment",
        }),
      },
    });

    const screen = await render(<NativeCheckoutAddressScreen />);
    await waitFor(() =>
      expect(screen.getByTestId("native-checkout-postal-code").props.value).toBe("1500001"),
    );
    expect(screen.getByTestId("native-checkout-city").props.value).toBe("渋谷区");
    expect(screen.getByTestId("native-checkout-session-resumed")).toBeTruthy();
  });

  it("selects a saved delivery address before advancing checkout", async () => {
    const setAddress = jest.fn().mockResolvedValue({
      ...checkoutSession,
      unlockedStep: "payment",
      version: 3,
    });
    const savedAddress = {
      id: "address-native-test",
      userId: checkoutSession.userId,
      label: "職場",
      recipientName: "Native Customer",
      postalCode: "1500001",
      prefecture: "東京都",
      city: "渋谷区神宮前",
      addressLine1: "2-2",
      addressLine2: null,
      phone: "09011112222",
      isDefault: false,
      version: 1,
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
    };
    runtime({
      account: { listAddresses: jest.fn().mockResolvedValue([savedAddress]) },
      checkout: {
        getActive: jest.fn().mockResolvedValue({
          ...checkoutSession,
          addressSnapshot: null,
          unlockedStep: "address",
        }),
        setAddress,
      },
    });

    const screen = await render(<NativeCheckoutAddressScreen />);
    await waitFor(() =>
      expect(screen.getByTestId("native-checkout-saved-address-address-native-test")).toBeTruthy(),
    );
    expect(screen.getByTestId("native-checkout-address-session-ready")).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-checkout-saved-address-address-native-test"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-checkout-address-next"));
    });

    await waitFor(() =>
      expect(setAddress).toHaveBeenCalledWith({
        checkoutSessionId: checkoutSession.id,
        checkoutExpectedVersion: checkoutSession.version,
        address: {
          recipientName: savedAddress.recipientName,
          postalCode: savedAddress.postalCode,
          prefecture: savedAddress.prefecture,
          city: savedAddress.city,
          addressLine1: savedAddress.addressLine1,
          addressLine2: savedAddress.addressLine2,
          phone: savedAddress.phone,
        },
      }),
    );
    expect(mockRouterPush).toHaveBeenCalledWith("/checkout/payment");
  });

  it("keeps Native checkout on the address step after invalid direct input", async () => {
    const setAddress = jest.fn().mockRejectedValue(new Error("invalid shipping address"));
    runtime({
      account: { listAddresses: jest.fn().mockResolvedValue([]) },
      checkout: {
        getActive: jest.fn().mockResolvedValue({
          ...checkoutSession,
          addressSnapshot: null,
          unlockedStep: "address",
        }),
        setAddress,
      },
    });

    const screen = await render(<NativeCheckoutAddressScreen />);
    await waitFor(() =>
      expect(screen.getByTestId("native-checkout-address-session-ready")).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("native-checkout-postal-code"), "123");
    });
    expect(screen.getByTestId("native-checkout-postal-code").props.value).toBe("123");
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-checkout-address-next"));
    });

    await waitFor(() =>
      expect(setAddress).toHaveBeenCalledWith(
        expect.objectContaining({ address: expect.objectContaining({ postalCode: "123" }) }),
      ),
    );
    expect(screen.getByTestId("native-purchase-error")).toHaveTextContent(
      "invalid shipping address",
    );
    expect(mockRouterPush).not.toHaveBeenCalledWith("/checkout/payment");
  });

  it("renders order payment, shipment, address, price, and item snapshots", async () => {
    mockUseLocalSearchParams.mockReturnValue({ orderId: "order-native-test" });
    const getMyCustomerOrder = jest.fn().mockResolvedValue({
      orderId: "order-native-test",
      orderNumber: "ORD-NATIVE-TEST",
      orderStatus: "shipped",
      totalAmount: 3300,
      orderActionVersion: 2,
      createdAt: "2026-07-01T03:00:00.000Z",
      subtotalAmount: 3500,
      discountAmount: 500,
      shippingAmount: 300,
      membershipRankSnapshot: "gold",
      shippingAddress: address,
      paymentAttempts: [
        {
          attemptNumber: 1,
          methodCode: "TEST-SUCCESS",
          status: "succeeded",
          errorDisplayKey: null,
          createdAt: "2026-07-01T03:01:00.000Z",
          processedAt: "2026-07-01T03:01:01.000Z",
        },
      ],
      shipment: {
        status: "shipped",
        carrierName: "Test Carrier",
        trackingNumber: "TRACK-001",
        shippedAt: "2026-07-02T03:00:00.000Z",
        deliveredAt: null,
      },
      timeline: [],
      items: [
        {
          orderItemId: "order-native-item-1",
          lineNumber: 1,
          productId: "product-basic-shirt",
          variantId: "variant-basic-shirt-02",
          productCode: "P-0001",
          productName: "ベーシックTシャツ",
          sku: "SKU-BASIC-02",
          variationName: "カラー",
          optionValue: "ネイビー",
          unitEffectivePrice: 1500,
          unitDiscountAmount: 200,
          unitFinalPrice: 1300,
          quantity: 2,
          lineSubtotalAmount: 3000,
          lineDiscountAmount: 400,
          lineTotalAmount: 2600,
          image: {
            assetId: "product-basic-shirt-main",
            path: "/images/products/basic-shirt.webp",
            altText: "ベーシックTシャツ",
          },
          reviewState: "NOT_POSTED",
        },
      ],
    });
    runtime({ checkout: { getMyCustomerOrder } });

    const screen = await render(<NativeOrderDetailScreen />);

    await waitFor(() => expect(getMyCustomerOrder).toHaveBeenCalledWith("order-native-test"));
    expect(screen.getByText("試行1：succeeded")).toBeTruthy();
    expect(screen.getByText("配送状態：shipped")).toBeTruthy();
    expect(screen.getByText("〒1000001")).toBeTruthy();
    expect(screen.getByText("商品小計：¥3,500")).toBeTruthy();
    expect(screen.getByText("商品コード：P-0001　SKU：SKU-BASIC-02")).toBeTruthy();
  });

  it("submits an eligible customer review through the Native service", async () => {
    const getEligibility = jest.fn().mockResolvedValue({
      orderItemId: "order-delivered-item-7",
      eligible: true,
      reason: null,
      existingReview: null,
      productName: "商品",
      variationName: null,
      optionValue: null,
      orderNumber: "ORD-TEST",
      orderCreatedAt: "2026-07-01T03:00:00.000Z",
      reviewState: "NOT_POSTED",
    });
    const create = jest.fn().mockResolvedValue({
      reviewId: "review-native-test",
      version: 1,
    });
    runtime({
      reviews: {
        getEligibility,
        create,
      },
    });

    const screen = await render(<NativeReviewScreen />);
    await waitFor(() => expect(getEligibility).toHaveBeenCalledWith("order-delivered-item-7"));
    await waitFor(() => expect(screen.getByTestId("native-review-save")).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("native-review-body"), "Native review body");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("native-review-save"));
    });

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        orderItemId: "order-delivered-item-7",
        rating: 5,
        title: null,
        body: "Native review body",
      }),
    );
  });
});
