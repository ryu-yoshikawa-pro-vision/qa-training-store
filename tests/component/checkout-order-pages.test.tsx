import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CheckoutConfirmationDto, OrderDetailDto } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";

const routerPush = vi.fn();
const routerReplace = vi.fn();
let localParams: Record<string, string> = { orderId: "order-new" };

const checkout = {
  start: vi.fn(),
  getActive: vi.fn(),
  setAddress: vi.fn(),
  setPayment: vi.fn(),
  getConfirmation: vi.fn(),
  beginOrder: vi.fn(),
  resumePayment: vi.fn(),
  retryPayment: vi.fn(),
  listMyOrders: vi.fn(),
  getMyOrder: vi.fn(),
  getMyCustomerOrder: vi.fn(),
};
const cart = {
  getCart: vi.fn(),
};
const account = {
  listAddresses: vi.fn(),
};
const services = { checkout, cart, account };

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
  useLocalSearchParams: () => localParams,
}));

vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => services,
}));

vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));

import {
  CheckoutAddressPage,
  CheckoutCompletePage,
  CheckoutConfirmPage,
  CheckoutFailedPage,
  CheckoutPaymentPage,
  CheckoutProcessingPage,
  OrderDetailPage,
} from "@/presentation/pages/checkout-order-pages";

const session = {
  id: "checkout-new",
  userId: "user",
  cartId: "cart",
  cartVersion: 3,
  addressSnapshot: null,
  paymentMethodCode: null,
  unlockedStep: "address" as const,
  status: "active" as const,
  expiresAt: "2026-07-02T03:00:00.000Z",
  orderId: null,
  createdAt: "2026-07-01T03:00:00.000Z",
  updatedAt: "2026-07-01T03:00:00.000Z",
  version: 1,
};

const confirmation: CheckoutConfirmationDto = {
  checkoutSessionId: "checkout-new",
  checkoutActionVersion: 3,
  cartVersion: 3,
  items: [
    {
      variantId: "variant-shirt",
      productName: "ベーシックTシャツ",
      sku: "P-0001-02",
      optionValue: "M",
      quantity: 1,
      unitEffectivePrice: 2000,
      unitDiscountAmount: 0,
      viewerUnitPrice: 2000,
      lineSubtotalAmount: 2000,
      lineDiscountAmount: 0,
      lineTotalAmount: 2000,
      image: {
        assetId: "asset-shirt-front",
        path: "/images/products/basic-shirt-front.a1b2c3.webp",
        altText: "Tシャツ",
      },
    },
  ],
  address: {
    recipientName: "山田太郎",
    postalCode: "1000001",
    prefecture: "東京都",
    city: "千代田区",
    addressLine1: "1-1",
    addressLine2: null,
    phone: "09000000000",
  },
  paymentMethodCode: "TEST-SUCCESS",
  subtotalAmount: 2000,
  discountAmount: 0,
  shippingAmount: 500,
  totalAmount: 2500,
  membershipRank: "regular",
};

const succeededPaymentAttempt: OrderDetailDto["paymentAttempts"][number] = {
  attemptNumber: 1,
  methodCode: "TEST-SUCCESS",
  status: "succeeded",
  errorDisplayKey: null,
  createdAt: "2026-07-01T03:00:00.000Z",
  processedAt: "2026-07-01T03:00:01.000Z",
};

const detail: OrderDetailDto = {
  orderId: "order-new",
  orderNumber: "ORD-20260701-0006",
  orderStatus: "paid",
  totalAmount: 2500,
  orderActionVersion: 2,
  createdAt: "2026-07-01T03:00:00.000Z",
  subtotalAmount: 2000,
  discountAmount: 0,
  shippingAmount: 500,
  membershipRankSnapshot: "regular",
  shippingAddress: confirmation.address,
  items: [
    {
      orderItemId: "item",
      lineNumber: 1,
      productId: "product",
      variantId: "variant-shirt",
      productCode: "P-0001",
      productName: "ベーシックTシャツ",
      sku: "P-0001-02",
      variationName: "サイズ",
      optionValue: "M",
      unitEffectivePrice: 2000,
      unitDiscountAmount: 0,
      unitFinalPrice: 2000,
      quantity: 1,
      lineSubtotalAmount: 2000,
      lineDiscountAmount: 0,
      lineTotalAmount: 2000,
      image: confirmation.items[0]!.image,
    },
  ],
  paymentAttempts: [succeededPaymentAttempt],
  shipment: {
    status: "pending",
    carrierName: null,
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null,
  },
  timeline: [
    {
      status: "pending_payment",
      displayKey: "order.status.pending_payment",
      createdAt: "2026-07-01T03:00:00.000Z",
    },
    {
      status: "paid",
      displayKey: "order.status.paid",
      createdAt: "2026-07-01T03:00:01.000Z",
    },
  ],
};

const failedDetail: OrderDetailDto = {
  ...detail,
  orderStatus: "payment_failed",
  paymentAttempts: [
    {
      ...succeededPaymentAttempt,
      status: "failed",
      errorDisplayKey: "payment.errors.DECLINED",
    },
  ],
  shipment: null,
};

describe("checkout and order pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localParams = { orderId: "order-new" };
    cart.getCart.mockResolvedValue({
      cartId: "cart",
      cartVersion: 3,
      totalAmount: 2500,
      items: [{}],
      blockingIssues: [],
    });
    checkout.start.mockResolvedValue({ session, result: "created" });
    checkout.getActive.mockResolvedValue({ ...session, unlockedStep: "payment", version: 2 });
    account.listAddresses.mockResolvedValue([
      {
        id: "address",
        userId: "user",
        label: "自宅",
        recipientName: "山田太郎",
        postalCode: "1000001",
        prefecture: "東京都",
        city: "千代田区",
        addressLine1: "1-1",
        addressLine2: null,
        phone: "09000000000",
        isDefault: true,
        createdAt: "2026-07-01T03:00:00.000Z",
        updatedAt: "2026-07-01T03:00:00.000Z",
        version: 1,
      },
    ]);
    checkout.setAddress.mockResolvedValue({ ...session, unlockedStep: "payment", version: 2 });
    checkout.getConfirmation.mockResolvedValue(confirmation);
    checkout.beginOrder.mockResolvedValue({
      orderId: "order-new",
      orderNumber: "ORD-20260701-0006",
      paymentId: "payment",
      paymentStatus: "processing",
    });
    checkout.getMyOrder.mockResolvedValue(detail);
    checkout.getMyCustomerOrder.mockResolvedValue({
      ...detail,
      items: detail.items.map((item) => ({ ...item, reviewState: "NOT_POSTED" as const })),
    });
  });

  it("selects a registered address and advances with a snapshot", async () => {
    render(<CheckoutAddressPage />);
    expect(await screen.findByRole("heading", { name: "配送先を選択" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "この配送先を使用" }));
    await waitFor(() =>
      expect(checkout.setAddress).toHaveBeenCalledWith({
        checkoutSessionId: "checkout-new",
        checkoutExpectedVersion: 1,
        address: confirmation.address,
      }),
    );
    expect(routerPush).toHaveBeenCalledWith("/checkout/payment");
  });

  it("restores the previously selected non-default shipping address on resume", async () => {
    const savedAddress = {
      ...confirmation.address,
      id: "address-work",
      userId: "user",
      label: "勤務先",
      postalCode: "1500001",
      city: "渋谷区",
      isDefault: false,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      version: 1,
    };
    account.listAddresses.mockResolvedValueOnce([
      {
        ...savedAddress,
        id: "address-home",
        label: "自宅",
        postalCode: confirmation.address.postalCode,
        city: confirmation.address.city,
        isDefault: true,
      },
      savedAddress,
    ]);
    checkout.start.mockResolvedValueOnce({
      result: "resumed",
      session: {
        ...session,
        addressSnapshot: {
          ...confirmation.address,
          postalCode: savedAddress.postalCode,
          city: savedAddress.city,
        },
      },
    });

    render(<CheckoutAddressPage />);
    expect(await screen.findByRole("radio", { name: /勤務先/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /自宅/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "この配送先を使用" }));
    await waitFor(() =>
      expect(checkout.setAddress).toHaveBeenCalledWith({
        checkoutSessionId: session.id,
        checkoutExpectedVersion: session.version,
        address: {
          ...confirmation.address,
          postalCode: savedAddress.postalCode,
          city: savedAddress.city,
        },
      }),
    );
  });

  it("requires a new address selection if the saved snapshot no longer matches", async () => {
    checkout.start.mockResolvedValueOnce({
      result: "resumed",
      session: {
        ...session,
        addressSnapshot: { ...confirmation.address, city: "変更前の市区町村" },
      },
    });
    render(<CheckoutAddressPage />);
    const button = await screen.findByRole("button", { name: "この配送先を使用" });
    expect(button).toBeDisabled();
    expect(
      screen.getByText("以前の配送先が変更または削除されています。配送先を選び直してください。"),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: /自宅/ }));
    expect(button).toBeEnabled();
  });

  it("does not advance to payment when saving a delivery address fails", async () => {
    checkout.setAddress.mockRejectedValueOnce(new Error("failed to save address"));
    render(<CheckoutAddressPage />);
    expect(await screen.findByRole("heading", { name: "配送先を選択" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "この配送先を使用" }));
    expect(
      await screen.findByText("配送先を保存できませんでした。最新のカートを確認してください。"),
    ).toBeVisible();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("renders snapshot totals and prevents a second confirmation click", async () => {
    render(<CheckoutConfirmPage />);
    expect(await screen.findByRole("heading", { name: "注文内容を確認" })).toBeVisible();
    expect(screen.getByText("ベーシックTシャツ")).toBeVisible();
    expect(screen.getAllByText("¥2,500").length).toBeGreaterThan(0);
    const submit = screen.getByRole("button", { name: "¥2,500を支払う" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(checkout.beginOrder).toHaveBeenCalledTimes(1));
    expect(routerReplace).toHaveBeenCalledWith("/checkout/processing?orderId=order-new");
  });

  it("shows quantity, subtotal, discount, shipping and total from the confirmation DTO", async () => {
    checkout.getConfirmation.mockResolvedValueOnce({
      ...confirmation,
      items: [
        {
          ...confirmation.items[0]!,
          quantity: 2,
          lineSubtotalAmount: 4000,
          lineDiscountAmount: 200,
          lineTotalAmount: 3800,
        },
      ],
      subtotalAmount: 4000,
      discountAmount: 200,
      shippingAmount: 500,
      totalAmount: 4300,
    });
    render(<CheckoutConfirmPage />);
    expect(await screen.findByRole("heading", { name: "注文内容を確認" })).toBeVisible();
    expect(screen.getByText("M・数量 2")).toBeVisible();
    expect(screen.getByText("¥3,800")).toBeVisible();
    expect(screen.getByText("¥4,000")).toBeVisible();
    expect(screen.getByText("-¥200")).toBeVisible();
    expect(screen.getByText("¥500")).toBeVisible();
    expect(screen.getAllByText("¥4,300").length).toBeGreaterThan(0);
  });

  it.each(["CART_VERSION_CHANGED", "PRICE_CHANGED"] as const)(
    "routes a %s confirmation load failure to the cart",
    async (code) => {
      checkout.getConfirmation.mockRejectedValueOnce(
        new ApplicationError({
          code,
          messageKey: "checkout.cart.invalid",
          retryable: false,
        }),
      );
      render(<CheckoutConfirmPage />);
      expect(
        await screen.findByText(
          "カートの内容または価格が変更されています。カートを確認して購入手続きをやり直してください。",
        ),
      ).toBeVisible();
      expect(screen.getByRole("link", { name: "戻って確認する" })).toHaveAttribute("href", "/cart");
      expect(screen.queryByRole("button", { name: /を支払う/ })).not.toBeInTheDocument();
      expect(checkout.beginOrder).not.toHaveBeenCalled();
    },
  );

  it("keeps the confirmation page on a stale-price submit error and links to the cart", async () => {
    checkout.beginOrder.mockRejectedValueOnce(
      new ApplicationError({
        code: "PRICE_CHANGED",
        messageKey: "checkout.cart.invalid",
        retryable: false,
      }),
    );
    render(<CheckoutConfirmPage />);
    const submit = await screen.findByRole("button", { name: "¥2,500を支払う" });
    fireEvent.click(submit);
    expect(await screen.findByRole("link", { name: "カートを確認する" })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("button", { name: "¥2,500を支払う" })).toBeDisabled();
    expect(routerReplace).not.toHaveBeenCalled();
    expect(checkout.beginOrder).toHaveBeenCalledTimes(1);
  });

  it("shows the full saved shipping address on confirmation", async () => {
    checkout.getConfirmation.mockResolvedValueOnce({
      ...confirmation,
      address: { ...confirmation.address, addressLine2: "青山ビル101" },
      paymentMethodCode: "TEST-DECLINED",
    });
    render(<CheckoutConfirmPage />);
    expect(await screen.findByRole("heading", { name: "注文内容を確認" })).toBeVisible();
    expect(screen.getByText("青山ビル101")).toBeVisible();
    expect(screen.getByText("山田太郎 様")).toBeVisible();
    expect(screen.getByText("テスト決済（利用拒否）")).toBeVisible();
  });

  it("restores the previously saved payment method when returning from confirmation", async () => {
    checkout.getActive.mockResolvedValueOnce({
      ...session,
      paymentMethodCode: "TEST-DECLINED",
      unlockedStep: "confirm",
      version: 3,
    });
    render(<CheckoutPaymentPage />);
    expect(await screen.findByRole("radio", { name: /テスト決済（利用拒否）/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /テスト決済（成功）/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "¥2,500を確認する" }));
    await waitFor(() =>
      expect(checkout.setPayment).toHaveBeenCalledWith({
        checkoutSessionId: session.id,
        checkoutExpectedVersion: 3,
        paymentMethodCode: "TEST-DECLINED",
      }),
    );
  });

  it("does not offer payment confirmation for an incomplete checkout", async () => {
    checkout.getActive.mockRejectedValueOnce(new Error("checkout address missing"));
    render(<CheckoutPaymentPage />);
    expect(await screen.findByText("購入手続きを続けられません")).toBeVisible();
    expect(screen.getByRole("link", { name: "戻って確認する" })).toHaveAttribute(
      "href",
      "/checkout/address",
    );
    expect(screen.queryByRole("button", { name: "¥2,500を確認する" })).not.toBeInTheDocument();
    expect(checkout.setPayment).not.toHaveBeenCalled();
  });

  it("keeps payment open and displays an error when saving the method fails", async () => {
    checkout.setPayment.mockRejectedValueOnce(new Error("stale checkout version"));
    render(<CheckoutPaymentPage />);
    expect(await screen.findByRole("heading", { name: "支払方法" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "¥2,500を確認する" }));
    expect(
      await screen.findByText("支払方法を保存できませんでした。最新のカートを確認してください。"),
    ).toBeVisible();
    expect(routerPush).not.toHaveBeenCalledWith("/checkout/confirm");
    expect(screen.getByRole("button", { name: "¥2,500を確認する" })).toBeEnabled();
  });

  it("explains each deterministic payment outcome before selection", async () => {
    render(<CheckoutPaymentPage />);
    expect(await screen.findByRole("heading", { name: "支払方法" })).toBeVisible();
    expect(screen.getByText("支払い完了を再現します。")).toBeVisible();
    expect(screen.getByText("利用拒否による支払い失敗を再現します。")).toBeVisible();
    expect(screen.getByText("残高不足による支払い失敗を再現します。")).toBeVisible();
    expect(screen.getByText("認証失敗による支払い失敗を再現します。")).toBeVisible();
  });

  it("uses the persisted paid state even when the failed route is requested", async () => {
    render(<CheckoutFailedPage />);
    expect(await screen.findByRole("heading", { name: "ご注文が完了しました" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "支払いを再試行" })).not.toBeInTheDocument();
  });

  it("uses the persisted failed state even when the complete route is requested", async () => {
    checkout.getMyOrder.mockResolvedValue(failedDetail);
    render(<CheckoutCompletePage />);
    expect(
      await screen.findByRole("heading", { name: "支払いを完了できませんでした" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "支払いを再試行" })).toHaveClass("button--primary");
    expect(screen.getByRole("link", { name: "注文詳細" })).toHaveClass("button--secondary");
  });

  it("uses the existing not-found boundary when orderId is missing", async () => {
    localParams = {};
    render(<CheckoutCompletePage />);
    expect(await screen.findByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
    expect(checkout.getMyOrder).not.toHaveBeenCalled();
  });

  it("uses the existing not-found boundary for an unauthorized order", async () => {
    checkout.getMyOrder.mockRejectedValue(new Error("order is not owned by the customer"));
    render(<CheckoutCompletePage />);
    expect(await screen.findByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  });

  it("resumes processing and routes from the deterministic result", async () => {
    checkout.resumePayment.mockResolvedValue({
      orderId: "order-new",
      orderNumber: "ORD-20260701-0006",
      orderStatus: "paid",
      totalAmount: 2500,
    });
    render(<CheckoutProcessingPage />);
    expect(screen.getByRole("heading", { name: "支払いを処理しています" })).toBeVisible();
    await waitFor(() => expect(checkout.resumePayment).toHaveBeenCalledWith("order-new"));
    expect(routerReplace).toHaveBeenCalledWith("/checkout/complete?orderId=order-new");
  });

  it("shows immutable order, payment, shipment, and timeline snapshots", async () => {
    render(<OrderDetailPage orderId="order-new" />);
    expect(await screen.findByRole("heading", { name: "ORD-20260701-0006" })).toBeVisible();
    expect(screen.getByText("ベーシックTシャツ")).toBeVisible();
    expect(screen.getByText(/#1 テスト決済（成功）/)).toBeVisible();
    expect(screen.queryByText("succeeded")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "支払い履歴" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "配送先" }).parentElement).toHaveTextContent(
      "東京都千代田区1-1",
    );
    expect(screen.getByRole("heading", { name: "進捗" }).parentElement).toHaveTextContent(
      "発送準備待ち",
    );
  });

  it.each([
    ["NOT_POSTED", "レビューを投稿"],
    ["PUBLISHED", "レビューを編集（公開中）"],
    ["HIDDEN", "レビューを編集（非公開）"],
    ["DELETED", "削除済み（再投稿不可）"],
    ["NOT_ELIGIBLE", null],
  ] as const)(
    "renders the %s review state from the customer order service",
    async (state, label) => {
      checkout.getMyCustomerOrder.mockResolvedValue({
        ...detail,
        orderStatus: "delivered",
        items: detail.items.map((item) => ({ ...item, reviewState: state })),
      });
      const { unmount } = render(<OrderDetailPage orderId="order-new" />);
      expect(await screen.findByRole("heading", { name: "ORD-20260701-0006" })).toBeVisible();
      expect(checkout.getMyCustomerOrder).toHaveBeenCalledWith("order-new");
      expect(checkout.getMyOrder).not.toHaveBeenCalled();
      if (label === null) {
        expect(screen.queryByRole("link", { name: /レビュー/ })).not.toBeInTheDocument();
      } else if (state === "DELETED") {
        expect(screen.getByText(label)).toBeVisible();
      } else {
        expect(screen.getByRole("link", { name: label })).toBeVisible();
      }
      unmount();
    },
  );
});
