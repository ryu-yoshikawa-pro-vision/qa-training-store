import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { INPUT_LIMITS } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import type { UserAddress } from "@/domain/contracts";

const routerReplace = vi.fn();
const refreshIdentity = vi.fn(async () => {});
const auth = {
  login: vi.fn(async () => ({
    sessionId: "session",
    user: {},
    cartMerge: null,
  })),
  register: vi.fn(async () => ({
    sessionId: "session",
    user: {},
    cartMerge: null,
  })),
  logout: vi.fn(async () => {}),
};
const checkout = {
  getActive: vi.fn(async () => ({ unlockedStep: "payment" })),
};
const account = {
  getProfile: vi.fn(async () => ({
    id: "user",
    email: "regular@example.com",
    displayName: "一般テスト会員",
    phone: "09000000000",
    role: "customer",
    membershipRank: "regular",
    accountStatus: "active",
    actionVersion: 7,
  })),
  updateProfile: vi.fn(async (request: { displayName: string; phone: string | null }) => ({
    id: "user",
    email: "regular@example.com",
    displayName: request.displayName,
    phone: request.phone,
    role: "customer",
    membershipRank: "regular",
    accountStatus: "active",
    actionVersion: 8,
  })),
  listAddresses: vi.fn(async (): Promise<UserAddress[]> => []),
  createAddress: vi.fn(async () => ({})),
  updateAddress: vi.fn(async () => ({})),
  deleteAddress: vi.fn(async () => ({})),
  suggestAddress: vi.fn(async () => ({
    postalCode: "1000001",
    prefecture: "東京都",
    city: "千代田区千代田",
    addressLine1: "",
  })),
};

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: routerReplace }),
}));

vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ auth, account, checkout }),
}));

vi.mock("@/presentation/providers/app-runtime-provider", () => ({
  useAppRuntime: () => ({ refreshIdentity }),
}));

vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));

import { LoginPage, SignupPage } from "@/presentation/pages/auth-pages";
import { ProfilePage } from "@/presentation/pages/profile-page";
import { AddressesPage } from "@/presentation/pages/addresses-page";

describe("auth and account pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
    account.listAddresses.mockResolvedValue([]);
    checkout.getActive.mockResolvedValue({ unlockedStep: "payment" });
  });

  it("submits Login and links fixed fixture account guidance to Guide", async () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeVisible();
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.email),
    );
    expect(screen.getByLabelText("パスワード")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.passwordMax),
    );
    expect(screen.getByRole("link", { name: "学習Guide" })).toHaveAttribute("href", "/guide");
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "regular@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "testpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({
        email: "regular@example.com",
        password: "testpass1",
      }),
    );
    expect(refreshIdentity).toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith("/");
  });

  it("focuses Login errors again on the same single-error invalid submit", async () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("メールアドレス");
    const password = screen.getByLabelText("パスワード");
    fireEvent.change(email, { target: { value: "invalid-email" } });
    fireEvent.change(password, { target: { value: "testpass1" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    const summary = await screen.findByRole("alert");
    await waitFor(() => expect(summary).toHaveFocus());
    expect(within(summary).getAllByRole("link")).toHaveLength(1);
    expect(email).toHaveValue("invalid-email");

    email.focus();
    expect(email).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(summary).toHaveFocus());
    expect(email).toHaveValue("invalid-email");
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("does not hide a checkout storage error as an address fallback", async () => {
    window.history.replaceState({}, "", "/login?returnTo=%2Fcheckout%2Fpayment");
    auth.login.mockResolvedValueOnce({
      sessionId: "session",
      user: { role: "customer" },
      cartMerge: null,
    });
    checkout.getActive.mockRejectedValueOnce(
      new ApplicationError({
        code: "STORAGE_READ_FAILED",
        messageKey: "storage.read.failed",
        retryable: true,
      }),
    );
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "regular@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "testpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(
      await screen.findByText(
        "ブラウザからログイン状態を読み込めませんでした。設定を確認してください。",
      ),
    ).toBeVisible();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it.each(["CHECKOUT_STEP_INCOMPLETE", "CHECKOUT_EXPIRED", "CART_VERSION_CHANGED"] as const)(
    "falls back to the address step for the expected checkout state error: %s",
    async (code) => {
      window.history.replaceState({}, "", "/login?returnTo=%2Fcheckout%2Fpayment");
      auth.login.mockResolvedValueOnce({
        sessionId: "session",
        user: { role: "customer" },
        cartMerge: null,
      });
      checkout.getActive.mockRejectedValueOnce(
        new ApplicationError({
          code,
          messageKey: `checkout.${code.toLowerCase()}`,
          retryable: false,
        }),
      );
      render(<LoginPage />);
      fireEvent.change(screen.getByLabelText("メールアドレス"), {
        target: { value: "regular@example.com" },
      });
      fireEvent.change(screen.getByLabelText("パスワード"), {
        target: { value: "testpass1" },
      });
      fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

      await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/checkout/address"));
    },
  );

  it("keeps Signup submission blocked until the notice is accepted", async () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("表示名")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("パスワード（確認）")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("表示名"), {
      target: { value: "新規会員" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "testpass1" },
    });
    fireEvent.change(screen.getByLabelText("パスワード（確認）"), {
      target: { value: "testpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登録する" }));
    expect(
      await screen.findByRole("link", {
        name: "学習用環境の注意事項を確認してください",
      }),
    ).toHaveAttribute("href", "#noticeAccepted");
    expect(screen.getByLabelText("学習用環境の注意事項を確認しました")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("new@example.com");
    expect(screen.getByLabelText("表示名")).toHaveValue("新規会員");
    expect(screen.getByLabelText("パスワード")).toHaveValue("testpass1");
    expect(screen.getByLabelText("パスワード（確認）")).toHaveValue("testpass1");
    expect(auth.register).not.toHaveBeenCalled();
  });

  it("uses shared Signup limits for controls and rejects an over-limit display name", async () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.email),
    );
    expect(screen.getByLabelText("表示名")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.displayName),
    );
    expect(screen.getByLabelText("パスワード")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.passwordMax),
    );
    expect(screen.getByLabelText("パスワード（確認）")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.passwordMax),
    );
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "limits@example.com" },
    });
    fireEvent.change(screen.getByLabelText("表示名"), {
      target: { value: "x".repeat(INPUT_LIMITS.displayName + 1) },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "secure-pass" },
    });
    fireEvent.change(screen.getByLabelText("パスワード（確認）"), {
      target: { value: "secure-pass" },
    });
    fireEvent.click(screen.getByLabelText("学習用環境の注意事項を確認しました"));
    fireEvent.click(screen.getByRole("button", { name: "登録する" }));
    expect(
      await screen.findByRole("link", {
        name: `表示名は${INPUT_LIMITS.displayName}文字以下で入力してください`,
      }),
    ).toHaveAttribute("href", "#displayName");
    expect(auth.register).not.toHaveBeenCalled();
  });

  it("updates Profile with the hidden actionVersion", async () => {
    render(<ProfilePage />);
    expect(await screen.findByDisplayValue("一般テスト会員")).toBeVisible();
    fireEvent.change(screen.getByLabelText("表示名"), {
      target: { value: "更新後会員" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() =>
      expect(account.updateProfile).toHaveBeenCalledWith({
        displayName: "更新後会員",
        phone: "09000000000",
        actionVersion: 7,
      }),
    );
    expect(await screen.findByText("プロフィールを更新しました。")).toBeVisible();
  });

  it("shows address count, create form, and deterministic default action", async () => {
    account.listAddresses.mockResolvedValue([
      {
        id: "address-home",
        userId: "user",
        label: "自宅",
        recipientName: "一般テスト会員",
        postalCode: "1000001",
        prefecture: "東京都",
        city: "千代田区千代田",
        addressLine1: "1-1",
        addressLine2: null,
        phone: "09000000000",
        isDefault: false,
        createdAt: "2026-07-01T03:00:00.000Z",
        updatedAt: "2026-07-01T03:00:00.000Z",
        version: 3,
      },
    ]);
    render(<AddressesPage />);
    expect(await screen.findByRole("heading", { name: "登録済み配送先（1/5）" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "配送先を追加" })).toBeVisible();
    expect(screen.getByLabelText("ラベル")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.addressLabel),
    );
    expect(screen.getByLabelText("宛名")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.recipientName),
    );
    expect(screen.getByLabelText("都道府県")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.prefecture),
    );
    expect(screen.getByLabelText("市区町村")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.city),
    );
    expect(screen.getByLabelText("番地")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.addressLine1),
    );
    expect(screen.getByLabelText("建物名・部屋番号（任意）")).toHaveAttribute(
      "maxlength",
      String(INPUT_LIMITS.addressLine2),
    );
    fireEvent.click(screen.getByRole("button", { name: "既定にする" }));
    await waitFor(() =>
      expect(account.updateAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          addressId: "address-home",
          expectedVersion: 3,
          makeDefault: true,
        }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("既定の配送先を変更しました。");
  });
});
