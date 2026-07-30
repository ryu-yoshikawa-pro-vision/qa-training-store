import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const adminMaster = {
  getOverview: vi.fn(),
  searchCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  changeCategoryActiveState: vi.fn(),
  reorderCategories: vi.fn(),
  listAllCategoriesForReorder: vi.fn(),
  searchBrands: vi.fn(),
  createBrand: vi.fn(),
  updateBrand: vi.fn(),
  changeBrandActiveState: vi.fn(),
};
const services = { adminMaster };

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
vi.mock("@/presentation/components/confirm-dialog", () => ({
  ConfirmDialog: ({ triggerLabel, onConfirm }: { triggerLabel: string; onConfirm: () => void }) => (
    <button onClick={onConfirm}>{triggerLabel}</button>
  ),
}));

import {
  AdminBrandsPage,
  AdminCategoriesPage,
  AdminOverviewPage,
} from "@/presentation/pages/admin-master-pages";

const categories = [
  {
    categoryId: "category-a",
    name: "ファッション",
    isActive: true,
    sortOrder: 10,
    publishedProductCount: 2,
    updatedAt: "2026-07-01T03:00:00.000Z",
    version: 1,
  },
  {
    categoryId: "category-b",
    name: "ホーム",
    isActive: true,
    sortOrder: 20,
    publishedProductCount: 0,
    updatedAt: "2026-07-01T03:00:00.000Z",
    version: 1,
  },
];

describe("admin overview and master pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMaster.getOverview.mockResolvedValue({
      ordersAwaitingPreparationCount: 2,
      lowStockSkuCount: 3,
      hiddenReviewCount: 1,
      recentOrders: [
        {
          orderId: "order",
          orderNumber: "ORD-20260701-0005",
          createdAt: "2026-07-01T03:00:00.000Z",
          totalAmount: 2000,
          status: "paid",
          representativeImage: { assetId: "asset", path: "/image.webp", altText: "商品" },
          userId: "user",
          userEmail: "regular@example.com",
          itemCount: 1,
        },
      ],
    });
    adminMaster.searchCategories.mockResolvedValue({
      items: categories,
      page: 1,
      pageSize: 20,
      total: 2,
    });
    adminMaster.listAllCategoriesForReorder.mockResolvedValue(categories);
    adminMaster.createCategory.mockResolvedValue({});
    adminMaster.reorderCategories.mockResolvedValue(categories);
    adminMaster.searchBrands.mockResolvedValue({
      items: [
        {
          brandId: "brand-a",
          name: "A Brand",
          isActive: true,
          publishedProductCount: 0,
          updatedAt: "2026-07-01T03:00:00.000Z",
          version: 1,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    adminMaster.createBrand.mockResolvedValue({});
  });

  it("shows the three operational metrics, quick actions, and recent orders", async () => {
    render(<AdminOverviewPage />);
    expect(await screen.findByRole("heading", { name: "管理概要" })).toBeVisible();
    expect(screen.getByText("発送準備待ち").parentElement).toHaveTextContent("2");
    expect(screen.getByText("低在庫SKU（1〜5）").parentElement).toHaveTextContent("3");
    expect(screen.getByText("非公開レビュー").parentElement).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: "商品を登録" })).toHaveAttribute(
      "href",
      "/admin/products/new",
    );
    expect(screen.getByText("ORD-20260701-0005")).toBeVisible();
  });

  it("creates at the end and saves a keyboard-reordered complete Category list", async () => {
    render(<AdminCategoriesPage />);
    expect(await screen.findByRole("heading", { name: "カテゴリ管理" })).toBeVisible();
    fireEvent.click(await screen.findByRole("button", { name: "ホームを上へ" }));
    fireEvent.click(screen.getByRole("button", { name: "表示順を保存" }));
    await waitFor(() =>
      expect(adminMaster.reorderCategories).toHaveBeenCalledWith({
        orderedIds: ["category-b", "category-a"],
        expectedVersions: { "category-a": 1, "category-b": 1 },
      }),
    );
    fireEvent.change(screen.getByLabelText("新しいカテゴリ名"), {
      target: { value: "新着" },
    });
    fireEvent.click(screen.getByRole("button", { name: "末尾に追加" }));
    await waitFor(() => expect(adminMaster.createCategory).toHaveBeenCalledWith({ name: "新着" }));
  });

  it("keeps Brand management name-sorted without a reorder control", async () => {
    render(<AdminBrandsPage />);
    expect(await screen.findByRole("heading", { name: "ブランド管理" })).toBeVisible();
    expect(screen.getByText("ブランド一覧（名称順）")).toBeVisible();
    expect(screen.queryByRole("button", { name: /上へ|下へ|表示順/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("新しいブランド名"), {
      target: { value: "B Brand" },
    });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    await waitFor(() => expect(adminMaster.createBrand).toHaveBeenCalledWith({ name: "B Brand" }));
  });
});
