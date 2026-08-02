import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CurrentUserDto } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
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
import { ONE_TIME_NOTICE_STORAGE_KEY } from "@/presentation/browser/one-time-notice.web";

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
    sessionStorage.clear();
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

  it("shows order context on the undelivered Review URL", async () => {
    reviews.getEligibility.mockResolvedValue({
      orderItemId: "item-1",
      eligible: false,
      reason: "ORDER_NOT_DELIVERED",
      existingReview: null,
      productName: "ベーシックTシャツ",
      variationName: "サイズ",
      optionValue: "M",
      orderNumber: "ORD-20260701-0001",
      orderCreatedAt: "2026-07-01T03:00:00.000Z",
      reviewState: "NOT_ELIGIBLE",
    });

    render(<CustomerReviewPage orderItemId="item-1" />);

    expect(await screen.findByRole("heading", { name: "レビューを投稿できません" })).toBeVisible();
    expect(screen.getByText("ベーシックTシャツ")).toBeVisible();
    expect(screen.getByText("ORD-20260701-0001")).toBeVisible();
    expect(screen.getByText("2026/7/1 12:00:00")).toBeVisible();
    expect(screen.getByText("サイズ / M")).toBeVisible();
    expect(screen.getByText("配達完了後に投稿できます。")).toBeVisible();
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
    adminUsers.getDetail.mockResolvedValueOnce({
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
    adminUsers.getDetail.mockResolvedValueOnce({
      userId: "user-customer-regular",
      email: "regular@example.com",
      displayName: "一般テスト会員",
      role: "customer",
      membershipRank: "gold",
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 2,
    });
    const { unmount } = render(<AdminUsersPage />);
    expect(await screen.findByRole("link", { name: /一般テスト会員/ })).toHaveAttribute(
      "href",
      "/admin/users/user-customer-regular",
    );
    unmount();
    render(<AdminUserDetailPage userId="user-customer-regular" />);
    expect(await screen.findByRole("heading", { name: "一般テスト会員" })).toBeVisible();
    const rankSelect = screen.getByLabelText("ランク");
    await waitFor(() => expect(rankSelect).toHaveValue("regular"));
    expect(screen.getByRole("button", { name: "ランクを変更" })).toBeDisabled();
    fireEvent.change(rankSelect, { target: { value: "gold" } });
    await waitFor(() => expect(rankSelect).toHaveValue("gold"));
    fireEvent.click(screen.getByRole("button", { name: "ランクを変更" }));
    await waitFor(() =>
      expect(adminUsers.changeMembershipRank).toHaveBeenCalledWith({
        userId: "user-customer-regular",
        rank: "gold",
        expectedVersion: 1,
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("ランク")).toHaveValue("gold"));
    expect(screen.getByRole("button", { name: "ランクを変更" })).toBeDisabled();
  });

  it("initializes an admin role without enabling an unchanged mutation", async () => {
    adminUsers.getDetail.mockResolvedValueOnce({
      userId: "user-admin-secondary",
      email: "admin-secondary@example.com",
      displayName: "別の管理者",
      role: "admin",
      membershipRank: null,
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });
    adminUsers.getDetail.mockResolvedValueOnce({
      userId: "user-admin-secondary",
      email: "admin-secondary@example.com",
      displayName: "別の管理者",
      role: "operator",
      membershipRank: null,
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 2,
    });
    adminUsers.changeRole.mockResolvedValueOnce({
      userId: "user-admin-secondary",
      email: "admin-secondary@example.com",
      displayName: "別の管理者",
      role: "operator",
      membershipRank: null,
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 2,
    });

    render(<AdminUserDetailPage userId="user-admin-secondary" />);

    const roleSelect = await screen.findByLabelText("役割");
    expect(roleSelect).toHaveValue("admin");
    expect(screen.getByRole("button", { name: "役割を変更" })).toBeDisabled();
    expect(adminUsers.changeRole).not.toHaveBeenCalled();

    fireEvent.change(roleSelect, { target: { value: "operator" } });
    fireEvent.click(screen.getByRole("button", { name: "役割を変更" }));
    fireEvent.click(screen.getByRole("button", { name: "変更する" }));
    await waitFor(() =>
      expect(adminUsers.changeRole).toHaveBeenCalledWith({
        userId: "user-admin-secondary",
        role: "operator",
        expectedVersion: 1,
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("役割")).toHaveValue("operator"));
    expect(screen.getByRole("button", { name: "役割を変更" })).toBeDisabled();
  });

  it("initializes a gold customer rank without enabling an unchanged mutation", async () => {
    adminUsers.getDetail.mockResolvedValueOnce({
      userId: "user-customer-gold",
      email: "gold@example.com",
      displayName: "ゴールド会員",
      role: "customer",
      membershipRank: "gold",
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });

    render(<AdminUserDetailPage userId="user-customer-gold" />);

    const rankSelect = await screen.findByLabelText("ランク");
    expect(rankSelect).toHaveValue("gold");
    expect(screen.getByRole("button", { name: "ランクを変更" })).toBeDisabled();
    expect(adminUsers.changeMembershipRank).not.toHaveBeenCalled();
  });

  it("reinitializes the form when the viewed user changes", async () => {
    adminUsers.getDetail.mockResolvedValueOnce({
      userId: "user-admin-secondary",
      email: "admin-secondary@example.com",
      displayName: "別の管理者",
      role: "admin",
      membershipRank: null,
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });
    adminUsers.getDetail.mockResolvedValueOnce({
      userId: "user-customer-gold",
      email: "gold@example.com",
      displayName: "ゴールド会員",
      role: "customer",
      membershipRank: "gold",
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });
    const { rerender } = render(<AdminUserDetailPage userId="user-admin-secondary" />);
    expect(await screen.findByLabelText("役割")).toHaveValue("admin");

    rerender(<AdminUserDetailPage userId="user-customer-gold" />);

    const rankSelect = await screen.findByLabelText("ランク");
    expect(rankSelect).toHaveValue("gold");
    expect(screen.queryByLabelText("役割")).not.toBeInTheDocument();
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

  it("shows the specific Last Active Admin error without a generic-only message", async () => {
    adminUsers.getDetail.mockResolvedValueOnce({
      userId: "user-admin-secondary",
      email: "admin-secondary@example.com",
      displayName: "別の管理者",
      role: "admin",
      membershipRank: null,
      accountStatus: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });
    adminUsers.changeRole.mockRejectedValueOnce(
      new ApplicationError({
        code: "LAST_ADMIN_PROTECTED",
        messageKey: "users.lastAdmin",
        retryable: false,
      }),
    );
    render(<AdminUserDetailPage userId="user-admin-secondary" />);
    await screen.findByRole("heading", { name: "別の管理者" });
    fireEvent.change(screen.getByLabelText("役割"), { target: { value: "operator" } });
    fireEvent.click(screen.getByRole("button", { name: "役割を変更" }));
    fireEvent.click(screen.getByRole("button", { name: "変更する" }));
    expect(
      await screen.findByText("最後の管理者は変更できません。先に別の管理者を設定してください。"),
    ).toBeVisible();
    expect(
      screen.queryByText("変更できませんでした。自己変更、最後の管理者"),
    ).not.toBeInTheDocument();
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

  it("does not run Scenario Reset twice during a repeated Confirm operation", async () => {
    let resolveReset!: () => void;
    testControlService.reset.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveReset = resolve)),
    );
    render(<AdminTestControlPage />);
    await screen.findByText("0.1.0");
    fireEvent.click(screen.getByRole("button", { name: "シナリオを初期化" }));
    const confirm = await screen.findByRole("button", { name: "初期化して移動" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(testControlService.reset).toHaveBeenCalledTimes(1));
    resolveReset();
    await waitFor(() => expect(reloadBrowserPage).toHaveBeenCalledOnce());
  });

  it("stays on the page when Scenario Reset fails", async () => {
    testControlService.reset.mockRejectedValueOnce(new Error("reset failed"));
    render(<AdminTestControlPage />);
    await screen.findByText("0.1.0");
    fireEvent.click(screen.getByRole("button", { name: "シナリオを初期化" }));
    fireEvent.click(await screen.findByRole("button", { name: "初期化して移動" }));
    expect(
      await screen.findByText("シナリオを初期化できませんでした。画面遷移は行っていません。"),
    ).toBeVisible();
    expect(reloadBrowserPage).not.toHaveBeenCalled();
  });

  it("hard-navigates after a successful reset even if the notice cannot be saved", async () => {
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      if (key === ONE_TIME_NOTICE_STORAGE_KEY) throw new Error("notice storage failed");
      originalSetItem.call(sessionStorage, key, value);
    });
    render(<AdminTestControlPage />);
    await screen.findByText("0.1.0");
    fireEvent.click(screen.getByRole("button", { name: "シナリオを初期化" }));
    fireEvent.click(await screen.findByRole("button", { name: "初期化して移動" }));
    await waitFor(() => expect(reloadBrowserPage).toHaveBeenCalledOnce());
    expect(
      screen.queryByText("シナリオを初期化できませんでした。画面遷移は行っていません。"),
    ).not.toBeInTheDocument();
    setItem.mockRestore();
  });
});
