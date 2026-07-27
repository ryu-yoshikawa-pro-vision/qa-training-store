import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const routerReplace = vi.fn();
const routerPush = vi.fn();
const adminProducts = {
  search: vi.fn(),
  bulkChangeStatus: vi.fn(),
  searchImageAssets: vi.fn(),
  create: vi.fn(),
  preview: vi.fn(),
  getEdit: vi.fn(),
  update: vi.fn(),
  changeStatus: vi.fn(),
  duplicate: vi.fn(),
  deleteDraft: vi.fn(),
};
const adminMaster = {
  searchCategories: vi.fn(),
  searchBrands: vi.fn(),
};
const services = { adminProducts, adminMaster };

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
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
  AdminProductEditPage,
  AdminProductNewPage,
  AdminProductsPage,
} from "@/presentation/pages/admin-product-pages";

const edit = {
  product: {
    id: "product-draft",
    productCode: "P-0008",
    name: "下書き商品",
    shortDescription: "短い説明",
    description: "説明",
    categoryId: "category-home",
    brandId: "brand-life",
    status: "draft",
    requiredRank: null,
    variationName: null,
    publishedAt: null,
    createdAt: "2026-07-01T03:00:00.000Z",
    updatedAt: "2026-07-01T03:00:00.000Z",
    version: 1,
  },
  variants: [
    {
      id: "variant-draft",
      productId: "product-draft",
      sku: "P-0008-ONE",
      optionValue: null,
      optionValueNormalized: null,
      regularPrice: 4000,
      salePrice: null,
      saleStartAt: null,
      saleEndAt: null,
      stockQuantity: 10,
      purchaseLimit: 5,
      isActive: true,
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    },
  ],
  images: [],
  categoryOptions: [{ id: "category-home", name: "ホーム" }],
  brandOptions: [{ id: "brand-life", name: "Scenario Life" }],
  selectedImages: [],
};

describe("admin product pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    adminProducts.search.mockResolvedValue({
      items: [
        {
          productId: "product-draft",
          productCode: "P-0008",
          name: "下書き商品",
          status: "draft",
          categoryName: "ホーム",
          brandName: "Scenario Life",
          activeSkuCount: 1,
          minimumCurrentEffectivePrice: 4000,
          maximumCurrentEffectivePrice: 4000,
          activeTotalStock: 10,
          updatedAt: "2026-07-01T03:00:00.000Z",
          version: 1,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    adminProducts.bulkChangeStatus.mockResolvedValue({
      succeededIds: [],
      failures: [{ productId: "product-draft", reason: "products.publishability.invalid" }],
    });
    adminMaster.searchCategories.mockResolvedValue({
      items: [{ categoryId: "category-home", name: "ホーム" }],
      page: 1,
      pageSize: 50,
      total: 1,
    });
    adminMaster.searchBrands.mockResolvedValue({
      items: [{ brandId: "brand-life", name: "Scenario Life" }],
      page: 1,
      pageSize: 50,
      total: 1,
    });
    adminProducts.searchImageAssets.mockResolvedValue({
      items: [
        {
          assetId: "asset-mug",
          path: "/images/products/mug.11aa22.webp",
          defaultAltText: "白いマグ",
          tags: ["ホーム"],
          isActive: true,
          mimeType: "image/webp",
          width: 720,
          height: 720,
          bytes: 100,
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    });
    adminProducts.create.mockResolvedValue(edit);
    adminProducts.preview.mockResolvedValue({
      productCode: "P-NEW",
      name: "新商品",
      minimumViewerUnitPrice: 1200,
      maximumViewerUnitPrice: 1200,
    });
    adminProducts.getEdit.mockResolvedValue(edit);
    adminProducts.duplicate.mockResolvedValue({
      sourceProductId: "product-draft",
      product: { ...edit.product, productCode: "" },
      variants: [
        {
          sourceVariantId: "variant-draft",
          sku: "",
          optionValue: null,
          regularPrice: 4000,
          salePrice: null,
          saleStartAt: null,
          saleEndAt: null,
          purchaseLimit: 5,
          initialStockQuantity: 0,
        },
      ],
      images: [],
    });
  });

  it("exposes all filters and reports Bulk partial success by reason", async () => {
    render(<AdminProductsPage />);
    expect(await screen.findByRole("heading", { name: "商品管理" })).toBeVisible();
    expect(screen.getByLabelText("最低価格")).toBeVisible();
    expect(screen.getByLabelText("最高価格")).toBeVisible();
    expect(screen.getByLabelText("Rank")).toBeVisible();
    fireEvent.click(screen.getByLabelText("下書き商品を選択"));
    fireEvent.click(screen.getByRole("button", { name: "選択を公開" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "成功 0件／失敗 1件（product-draft: products.publishability.invalid）",
    );
  });

  it("previews an unsaved aggregate and creates it as a draft", async () => {
    render(<AdminProductNewPage />);
    expect(await screen.findByRole("heading", { name: "商品登録" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("商品Code"), { target: { value: "P-NEW" } });
    fireEvent.change(screen.getByLabelText("商品名"), { target: { value: "新商品" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "P-NEW-ONE" } });
    fireEvent.change(screen.getByLabelText("通常価格"), { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("button", { name: "未保存内容をPreview" }));
    expect(await screen.findByRole("region", { name: "商品Preview" })).toHaveTextContent(
      "DBには保存されていません。",
    );
    fireEvent.click(screen.getByRole("button", { name: "draftを保存" }));
    await waitFor(() => expect(adminProducts.create).toHaveBeenCalled());
    expect(routerReplace).toHaveBeenCalledWith("/admin/products/product-draft");
  });

  it("keeps existing stock read-only and duplicates into the new-product form", async () => {
    render(<AdminProductEditPage productId="product-draft" />);
    expect(await screen.findByRole("heading", { name: "下書き商品" })).toBeVisible();
    expect(screen.getByLabelText("現在庫（変更不可）")).toBeDisabled();
    expect(screen.getByLabelText("現在庫（変更不可）")).toHaveValue(10);
    fireEvent.click(screen.getByRole("button", { name: "複製して新規登録" }));
    await waitFor(() => expect(adminProducts.duplicate).toHaveBeenCalledWith("product-draft"));
    expect(JSON.parse(sessionStorage.getItem("product-duplicate-draft")!)).toMatchObject({
      product: { productCode: "" },
      variants: [{ sku: "", initialStockQuantity: 0 }],
    });
    expect(routerPush).toHaveBeenCalledWith("/admin/products/new?duplicate=1");
  });
});
