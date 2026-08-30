import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { INPUT_LIMITS } from "@/application/contracts";

const adminOperations = {
  searchInventory: vi.fn(),
  getInventoryDetail: vi.fn(),
  adjustInventory: vi.fn(),
  searchOrders: vi.fn(),
  getOrder: vi.fn(),
  startPreparation: vi.fn(),
  ship: vi.fn(),
  completeDelivery: vi.fn(),
};
const services = { adminOperations };

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => services,
}));
vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));

import {
  AdminInventoriesPage,
  AdminOrderDetailPage,
  AdminOrdersPage,
} from "@/presentation/pages/admin-operations-pages";

const inventoryItem = {
  variantId: "variant",
  productId: "product",
  productCode: "P-0001",
  productName: "ベーシックTシャツ",
  sku: "P-0001-02",
  optionValue: "M",
  stockQuantity: 10,
  isActive: true,
  updatedAt: "2026-07-01T03:00:00.000Z",
  version: 1,
};

const order = {
  orderId: "order-paid",
  orderNumber: "ORD-20260701-0002",
  orderStatus: "paid",
  totalAmount: 2000,
  orderActionVersion: 1,
  createdAt: "2026-07-01T03:00:00.000Z",
  subtotalAmount: 1500,
  discountAmount: 0,
  shippingAmount: 500,
  membershipRankSnapshot: "regular",
  shippingAddress: {
    recipientName: "山田太郎",
    postalCode: "1000001",
    prefecture: "東京都",
    city: "千代田区",
    addressLine1: "1-1",
    addressLine2: null,
    phone: "09000000000",
  },
  items: [
    {
      orderItemId: "item",
      lineNumber: 1,
      productId: "product",
      variantId: "variant",
      productCode: "P-0002",
      productName: "セラミックマグ",
      sku: "P-0002-ONE",
      variationName: null,
      optionValue: null,
      unitEffectivePrice: 1500,
      unitDiscountAmount: 0,
      unitFinalPrice: 1500,
      quantity: 1,
      lineSubtotalAmount: 1500,
      lineDiscountAmount: 0,
      lineTotalAmount: 1500,
      image: { assetId: "asset-mug", path: "/images/products/mug.11aa22.webp", altText: "マグ" },
    },
  ],
  paymentAttempts: [],
  shipment: {
    status: "pending",
    carrierName: null,
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null,
  },
  timeline: [],
  customer: {
    userId: "user",
    email: "regular@example.com",
    displayName: "一般テスト会員",
  },
};

describe("admin inventory and order pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminOperations.searchInventory.mockResolvedValue({
      items: [inventoryItem],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    adminOperations.getInventoryDetail.mockResolvedValue({
      item: inventoryItem,
      histories: [
        {
          id: "history",
          variantId: "variant",
          changeQuantity: 10,
          beforeQuantity: 0,
          afterQuantity: 10,
          reasonCode: "INITIAL_STOCK",
          reasonText: "初期在庫",
          actorUserId: "admin",
          orderId: null,
          createdAt: "2026-07-01T03:00:00.000Z",
        },
      ],
    });
    adminOperations.adjustInventory.mockResolvedValue({});
    adminOperations.searchOrders.mockResolvedValue({
      items: [
        {
          orderId: "order-paid",
          orderNumber: "ORD-20260701-0002",
          createdAt: "2026-07-01T03:00:00.000Z",
          totalAmount: 2000,
          status: "paid",
          representativeImage: order.items[0]!.image,
          userId: "user",
          userEmail: "regular@example.com",
          itemCount: 1,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    adminOperations.getOrder.mockResolvedValue(order);
    adminOperations.startPreparation.mockResolvedValue({
      ...order,
      orderStatus: "preparing",
      orderActionVersion: 2,
    });
  });

  it("adjusts an SKU with reason, signed quantity, expected Version, and shows history", async () => {
    render(<AdminInventoriesPage />);
    expect(await screen.findByText("P-0001-02")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "調整・履歴" }));
    expect(await screen.findByText("初期在庫")).toBeVisible();
    expect(screen.getByLabelText("理由詳細")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.inventoryReason),
    );
    fireEvent.change(screen.getByLabelText("増減数量"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("理由詳細"), { target: { value: "棚卸し訂正" } });
    fireEvent.click(screen.getByRole("button", { name: "バージョン 1で更新" }));
    await waitFor(() =>
      expect(adminOperations.adjustInventory).toHaveBeenCalledWith({
        variantId: "variant",
        changeQuantity: 3,
        reasonCode: "MANUAL_INCREASE",
        reasonText: "棚卸し訂正",
        expectedVersion: 1,
      }),
    );
  });

  it("exposes order customer/status/period/total/sort filters and snapshot rows", async () => {
    render(<AdminOrdersPage />);
    expect(await screen.findByRole("heading", { name: "注文管理" })).toBeVisible();
    expect(screen.getByLabelText("注文番号・顧客")).toBeVisible();
    expect(screen.getByLabelText("開始日")).toBeVisible();
    expect(screen.getByLabelText("終了日")).toBeVisible();
    expect(screen.getByLabelText("最低合計")).toBeVisible();
    expect(screen.getByLabelText("最高合計")).toBeVisible();
    expect(screen.getByRole("link", { name: "ORD-20260701-0002" })).toHaveAttribute(
      "href",
      "/admin/orders/order-paid",
    );
    expect(screen.getByText("regular@example.com")).toBeVisible();
  });

  it("builds a shipment action from orderActionVersion and returns the new Version", async () => {
    render(<AdminOrderDetailPage orderId="order-paid" />);
    expect(await screen.findByRole("heading", { name: "ORD-20260701-0002" })).toBeVisible();
    expect(screen.getByText(/操作バージョン 1/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "注文時の配送先" }).parentElement).toHaveTextContent(
      "東京都千代田区1-1",
    );
    fireEvent.click(screen.getByRole("button", { name: "発送準備を開始" }));
    await waitFor(() =>
      expect(adminOperations.startPreparation).toHaveBeenCalledWith({
        orderId: "order-paid",
        orderActionVersion: 1,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("新しい操作バージョン: 2");
  });
});
