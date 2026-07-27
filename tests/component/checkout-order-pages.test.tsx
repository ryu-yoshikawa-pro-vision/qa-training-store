import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CheckoutConfirmationDto, OrderDetailDto } from "@/application/contracts";

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
  CheckoutConfirmPage,
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
  paymentAttempts: [
    {
      attemptNumber: 1,
      methodCode: "TEST-SUCCESS",
      status: "succeeded",
      errorDisplayKey: null,
      createdAt: "2026-07-01T03:00:00.000Z",
      processedAt: "2026-07-01T03:00:01.000Z",
    },
  ],
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
    expect(screen.getByText(/#1 テスト決済（成功） — succeeded/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "配送先" }).parentElement).toHaveTextContent(
      "東京都千代田区1-1",
    );
    expect(screen.getByRole("heading", { name: "進捗" }).parentElement).toHaveTextContent(
      "発送準備待ち",
    );
  });
});
