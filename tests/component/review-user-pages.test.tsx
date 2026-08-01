import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CurrentUserDto } from "@/application/contracts";
import { StorefrontShell } from "@/presentation/shells/storefront-shell";

const reviews = {
  getEligibility: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const catalog = {
  suggest: vi.fn(async () => []),
};
const adminReviews = {
  search: vi.fn(),
  getDetail: vi.fn(),
  changeVisibility: vi.fn(),
  bulkChangeVisibility: vi.fn(),
};
const adminUsers = {
  search: vi.fn(),
  getDetail: vi.fn(),
  changeMembershipRank: vi.fn(),
  changeRole: vi.fn(),
  changeSuspension: vi.fn(),
};
const testControlService = vi.hoisted(() => ({
  getMetadata: vi.fn(),
  reset: vi.fn(),
  setClock: vi.fn(),
  setPaymentDelay: vi.fn(),
}));
const reloadBrowserPage = vi.hoisted(() => vi.fn());

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/reviews/item-1",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ reviews, adminReviews, adminUsers, catalog }),
}));
vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/presentation/providers/app-runtime-provider", () => ({
  useAppRuntime: () => ({ currentUser: { id: "user-admin" } }),
}));
vi.mock("@/bootstrap/browser-runtime.web", () => ({ testControlService }));
vi.mock("@/presentation/browser/reload-page.web", () => ({ reloadBrowserPage }));

import {
  AdminReviewsPage,
  AdminTestControlPage,
  AdminUserDetailPage,
  AdminUsersPage,
  CustomerReviewPage,
} from "@/presentation/pages/review-user-pages";

const publishedReview = {
  reviewId: "review-1",
  orderItemId: "item-1",
  productId: "product-1",
  rating: 5,
  title: "よい商品",
  body: "毎日使っています。",
  status: "published",
  createdAt: "2026-07-01T03:00:00.000Z",
  updatedAt: "2026-07-01T03:00:00.000Z",
  version: 1,
};

describe("review, user, and test-control pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviews.getEligibility.mockResolvedValue({
      orderItemId: "item-1",
      eligible: true,
      reason: null,
      existingReview: null,
    });
    reviews.create.mockResolvedValue(publishedReview);
    adminReviews.search.mockResolvedValue({
      items: [
        {
          ...publishedReview,
          productName: "ベーシックTシャツ",
          userId: "customer",
          userEmail: "regular@example.com",
          displayName: "一般テスト会員",
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    });
    adminReviews.getDetail.mockResolvedValue({
      ...publishedReview,
      productName: "ベーシックTシャツ",
      userId: "customer",
      userEmail: "regular@example.com",
      displayName: "一般テスト会員",
      histories: [
        {
          id: "history",
          reviewId: "review-1",
          fromStatus: null,
          toStatus: "published",
          actorUserId: "customer",
          reasonText: null,
          createdAt: "2026-07-01T03:00:00.000Z",
        },
      ],
    });
    adminReviews.changeVisibility.mockResolvedValue({ ...publishedReview, status: "hidden" });
    adminReviews.bulkChangeVisibility.mockResolvedValue({
      succeededCount: 1,
      failedCount: 0,
      results: [],
    });
    adminUsers.search.mockResolvedValue({
      items: [
        {
          userId: "user-customer-regular",
          email: "regular@example.com",
          displayName: "一般テスト会員",
          role: "customer",
          membershipRank: "regular",
          accountStatus: "active",
          createdAt: "2026-07-01T03:00:00.000Z",
          updatedAt: "2026-07-01T03:00:00.000Z",
          version: 1,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    adminUsers.getDetail.mockResolvedValue({
      userId: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      role: "customer",
      membershipRank: "regular",
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });
    adminUsers.changeMembershipRank.mockResolvedValue({
      userId: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      role: "customer",
      version: 2,
      membershipRank: "gold",
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
    });
    adminUsers.changeSuspension.mockResolvedValue({
      userId: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      role: "customer",
      version: 2,
      membershipRank: "regular",
      accountStatus: "suspended",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
    });
    testControlService.getMetadata.mockResolvedValue({
      appVersion: "0.1.0",
      schemaVersion: 1,
      seedVersion: 11,
      buildSha: "local",
      scenario: "default",
      clock: "2026-07-01T03:00:00.000Z",
      paymentDelayMs: 500,
    });
    testControlService.setPaymentDelay.mockResolvedValue({});
    testControlService.reset.mockResolvedValue({});
  });

  it("offers a keyboard-native rating radio group and creates a review", async () => {
    render(<CustomerReviewPage orderItemId="item-1" />);
    expect(await screen.findByRole("heading", { name: "レビューを投稿" })).toBeVisible();
    expect(screen.getByRole("radiogroup", { name: "星評価" })).toBeVisible();
    fireEvent.click(screen.getByLabelText("3つ星"));
    fireEvent.change(screen.getByLabelText("本文"), { target: { value: "配送後の感想です。" } });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    await waitFor(() =>
      expect(reviews.create).toHaveBeenCalledWith({
        orderItemId: "item-1",
        rating: 3,
        title: null,
        body: "配送後の感想です。",
      }),
    );
  });

  it("keeps a single main landmark when Customer Review is rendered in StorefrontShell", async () => {
    const customer = {
      id: "user-customer",
      role: "customer",
    } as CurrentUserDto;
    const { container } = render(
      <StorefrontShell currentUser={customer}>
        <CustomerReviewPage orderItemId="item-1" />
      </StorefrontShell>,
    );

    expect(await screen.findByRole("heading", { name: "レビューを投稿" })).toBeVisible();
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelectorAll('a[href="/orders"][aria-current="page"]')).toHaveLength(2);
  });

  it("requires confirmation before deleting an existing customer review", async () => {
    reviews.getEligibility.mockResolvedValue({
      orderItemId: "item-1",
      eligible: true,
      reason: null,
      existingReview: publishedReview,
    });
    reviews.delete.mockResolvedValue(undefined);

    render(<CustomerReviewPage orderItemId="item-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "レビューを削除" }));
    expect(screen.getByRole("alertdialog", { name: "レビューを削除しますか" })).toBeVisible();
    expect(reviews.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() =>
      expect(reviews.delete).toHaveBeenCalledWith({
        reviewId: "review-1",
        expectedVersion: 1,
      }),
    );
  });

  it("filters and hides an admin review, and exposes its history", async () => {
    render(<AdminReviewsPage />);
    expect(await screen.findByText("regular@example.com")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "非公開" }));
    await waitFor(() =>
      expect(adminReviews.changeVisibility).toHaveBeenCalledWith({
        reviewId: "review-1",
        targetStatus: "hidden",
        expectedVersion: 1,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "履歴" }));
    expect(await screen.findByText(/新規 → 公開中/)).toBeVisible();
  });

  it("links the user list to detail and changes a customer rank with Version", async () => {
    const { unmount } = render(<AdminUsersPage />);
    expect(await screen.findByRole("link", { name: /一般テスト会員/ })).toHaveAttribute(
      "href",
      "/admin/users/user-customer-regular",
    );
    unmount();
    render(<AdminUserDetailPage userId="user-customer-regular" />);
    expect(await screen.findByRole("heading", { name: "一般テスト会員" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("ランク"), { target: { value: "gold" } });
    fireEvent.click(screen.getByRole("button", { name: "ランクを変更" }));
    await waitFor(() =>
      expect(adminUsers.changeMembershipRank).toHaveBeenCalledWith({
        userId: "user-customer-regular",
        rank: "gold",
        expectedVersion: 1,
      }),
    );
  });

  it("confirms a user suspension before invalidating sessions", async () => {
    render(<AdminUserDetailPage userId="user-customer-regular" />);
    fireEvent.click(await screen.findByRole("button", { name: "利用停止" }));
    expect(
      screen.getByRole("alertdialog", { name: "このユーザーを利用停止にしますか" }),
    ).toBeVisible();
    expect(adminUsers.changeSuspension).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "利用停止にする" }));
    await waitFor(() =>
      expect(adminUsers.changeSuspension).toHaveBeenCalledWith({
        userId: "user-customer-regular",
        accountStatus: "suspended",
        expectedVersion: 1,
      }),
    );
  });

  it("shows build metadata and applies the Test API payment-delay constraint", async () => {
    render(<AdminTestControlPage />);
    expect(await screen.findByText("0.1.0")).toBeVisible();
    expect(screen.getByText("スキーマバージョン")).toBeVisible();
    fireEvent.change(screen.getByLabelText("遅延（0〜30000ms）"), { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("button", { name: "遅延を設定" }));
    await waitFor(() => expect(testControlService.setPaymentDelay).toHaveBeenCalledWith(1200));
  });

  it("reloads the web page after a successful test-control reset", async () => {
    render(<AdminTestControlPage />);
    await screen.findByText("0.1.0");

    fireEvent.click(screen.getByRole("button", { name: "シナリオを初期化" }));
    fireEvent.click(await screen.findByRole("button", { name: "初期化して移動" }));

    await waitFor(() =>
      expect(testControlService.reset).toHaveBeenCalledWith({ scenario: "default" }),
    );
    expect(reloadBrowserPage).toHaveBeenCalledOnce();
  });
});
