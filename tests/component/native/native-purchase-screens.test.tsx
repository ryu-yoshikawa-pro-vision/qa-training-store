import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { ApplicationError } from "@/application/errors";
import type { CheckoutSession, ShippingAddressSnapshot } from "@/domain/contracts";
import { router, useLocalSearchParams } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import {
  NativeCheckoutAddressScreen,
  NativeCheckoutConfirmScreen,
  NativeCheckoutPaymentScreen,
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
