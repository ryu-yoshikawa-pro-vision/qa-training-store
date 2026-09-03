import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const routerPush = vi.fn();

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: routerPush }),
}));

import { ConfirmDialog } from "@/presentation/components/confirm-dialog";
import { FormErrorSummary } from "@/presentation/components/form-error-summary";
import { SearchCombobox, type SearchSuggestion } from "@/presentation/components/search-combobox";
import { StatePanel } from "@/presentation/components/states";
import { Pagination, ResourceTable } from "@/presentation/patterns/admin-patterns";

describe("presentation foundation", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  it("announces loading and distinguishes empty, conflict, and not found states", () => {
    const { rerender } = render(<StatePanel kind="loading" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "読み込んでいます" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "ホームへ戻る" })).not.toBeInTheDocument();
    rerender(<StatePanel kind="filter-empty" />);
    expect(screen.getByRole("heading", { name: "条件に一致するデータがありません" })).toBeVisible();
    rerender(<StatePanel kind="conflict" />);
    expect(
      screen.getByRole("heading", {
        name: "ほかの操作によって情報が更新されました",
      }),
    ).toBeVisible();
    rerender(<StatePanel kind="not-found" />);
    expect(screen.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  });

  it("allows callers to suppress the default state action explicitly", () => {
    render(<StatePanel kind="empty" action={null} />);
    expect(screen.queryByRole("link", { name: "ホームへ戻る" })).not.toBeInTheDocument();
  });

  it("focuses an error summary and links each message to its field", () => {
    render(
      <form>
        <FormErrorSummary
          errors={[{ fieldId: "email", message: "Emailを入力してください" }]}
          focusTrigger={0}
        />
        <input id="email" aria-label="Email" />
      </form>,
    );
    const summary = screen.getByRole("alert");
    expect(summary).toHaveFocus();
    expect(summary).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: "Emailを入力してください" })).toHaveAttribute(
      "href",
      "#email",
    );
  });

  it("refocuses an unchanged single-error summary on a new focus trigger", () => {
    const errors = [{ fieldId: "email", message: "Emailを入力してください" }];
    const { rerender } = render(
      <form>
        <FormErrorSummary errors={errors} focusTrigger={0} />
        <input id="email" aria-label="Email" />
      </form>,
    );
    const summary = screen.getByRole("alert");
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(summary).toHaveFocus();

    input.focus();
    expect(input).toHaveFocus();
    rerender(
      <form>
        <FormErrorSummary errors={errors} focusTrigger={1} />
        <input id="email" aria-label="Email" />
      </form>,
    );

    expect(summary).toHaveFocus();
  });

  it("waits for errors after a new focus trigger before focusing", () => {
    const { rerender } = render(
      <form>
        <FormErrorSummary errors={[]} focusTrigger={0} />
        <input id="email" aria-label="Email" />
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    input.focus();

    rerender(
      <form>
        <FormErrorSummary errors={[]} focusTrigger={1} />
        <input id="email" aria-label="Email" />
      </form>,
    );
    expect(input).toHaveFocus();

    rerender(
      <form>
        <FormErrorSummary
          errors={[{ fieldId: "email", message: "Emailを入力してください" }]}
          focusTrigger={1}
        />
        <input id="email" aria-label="Email" />
      </form>,
    );

    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("does not refocus when errors change without a new focus trigger", () => {
    const { rerender } = render(
      <form>
        <FormErrorSummary
          errors={[{ fieldId: "email", message: "Emailを入力してください" }]}
          focusTrigger={0}
        />
        <input id="email" aria-label="Email" />
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    input.focus();

    rerender(
      <form>
        <FormErrorSummary
          errors={[{ fieldId: "email", message: "Emailを入力してください" }]}
          focusTrigger={0}
        />
        <input id="email" aria-label="Email" />
      </form>,
    );
    expect(input).toHaveFocus();

    rerender(
      <form>
        <FormErrorSummary
          errors={[
            { fieldId: "email", message: "Emailを入力してください" },
            { fieldId: "password", message: "Passwordを入力してください" },
          ]}
          focusTrigger={0}
        />
        <input id="email" aria-label="Email" />
      </form>,
    );

    expect(input).toHaveFocus();
  });

  it("does not focus when focus is disabled, including on a new focus trigger", () => {
    const { rerender } = render(
      <form>
        <FormErrorSummary
          errors={[{ fieldId: "email", message: "Emailを入力してください" }]}
          focusOnMount={false}
          focusTrigger={0}
        />
        <input id="email" aria-label="Email" />
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    input.focus();

    rerender(
      <form>
        <FormErrorSummary
          errors={[{ fieldId: "email", message: "Emailを入力してください" }]}
          focusOnMount={false}
          focusTrigger={1}
        />
        <input id="email" aria-label="Email" />
      </form>,
    );

    expect(input).toHaveFocus();
  });

  it("opens async suggestions after normal typing and keeps keyboard selection", async () => {
    let resolveSuggestions: ((value: SearchSuggestion[]) => void) | undefined;
    const suggestions: SearchSuggestion[] = [
      {
        id: "product:shirt",
        label: "ベーシックTシャツ",
        description: "商品",
        href: "/products/product-basic-shirt" as const,
      },
      {
        id: "category:apparel",
        label: "ファッション",
        description: "カテゴリ",
        href: "/categories/category-apparel" as const,
      },
    ];
    const loadSuggestions = vi.fn(
      () =>
        new Promise<SearchSuggestion[]>((resolve) => {
          resolveSuggestions = resolve;
        }),
    );
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ベー" } });

    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("ベー"));
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    const loading = await screen.findByText("候補を検索しています");
    expect(loading).toBeVisible();
    expect(loading.closest(".search-combobox__popover")).not.toBeNull();

    await act(async () => resolveSuggestions?.(suggestions));
    expect(await screen.findByRole("option", { name: /ベーシックTシャツ/ })).toBeVisible();
    expect(screen.queryByText("候補を検索しています")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    await waitFor(() =>
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        expect.stringContaining("product:shirt"),
      ),
    );
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await waitFor(() =>
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        expect.stringContaining("category:apparel"),
      ),
    );
    fireEvent.keyDown(input, { key: "ArrowUp" });
    await waitFor(() =>
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        expect.stringContaining("product:shirt"),
      ),
    );
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/products/product-basic-shirt"));
  });

  it("keeps the suggestion popover open for an async no-result response", async () => {
    let resolveFirst: ((value: SearchSuggestion[]) => void) | undefined;
    let resolveSecond: ((value: SearchSuggestion[]) => void) | undefined;
    const first = {
      id: "product:first",
      label: "最初の候補",
      description: "商品",
      href: "/products/first" as const,
    };
    const loadSuggestions = vi.fn(
      (query: string) =>
        new Promise<SearchSuggestion[]>((resolve) => {
          if (query === "ab") resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ab" } });
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("ab"));
    await act(async () => resolveFirst?.([first]));
    expect(await screen.findByRole("option", { name: /最初の候補/ })).toBeVisible();
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.change(input, { target: { value: "abc" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("候補を検索しています")).toBeVisible();
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("abc"));
    await act(async () => resolveSecond?.([]));

    expect(await screen.findByText("候補がありません")).toBeVisible();
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("uses a 150ms debounce and does not request suggestions before two characters", () => {
    const loadSuggestions = vi.fn(async () => []);
    vi.useFakeTimers();
    try {
      render(<SearchCombobox loadSuggestions={loadSuggestions} />);
      const input = screen.getByRole("combobox", { name: "商品を検索" });
      fireEvent.change(input, { target: { value: "あ" } });
      act(() => vi.advanceTimersByTime(200));
      expect(loadSuggestions).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: "あい" } });
      act(() => vi.advanceTimersByTime(149));
      expect(loadSuggestions).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(loadSuggestions).toHaveBeenCalledWith("あい");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the suggestion popover open and shows loading when a new async request starts", async () => {
    let resolveFirst: ((value: SearchSuggestion[]) => void) | undefined;
    let resolveSecond: ((value: SearchSuggestion[]) => void) | undefined;
    const first = {
      id: "product:first",
      label: "最初の候補",
      description: "商品",
      href: "/products/first" as const,
    };
    const second = {
      id: "product:second",
      label: "新しい候補",
      description: "商品",
      href: "/products/second" as const,
    };
    const loadSuggestions = vi.fn(
      (query: string) =>
        new Promise<SearchSuggestion[]>((resolve) => {
          if (query === "ab") resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ab" } });
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("ab"));

    await act(async () => resolveFirst?.([first]));
    expect(await screen.findByRole("option", { name: /最初の候補/ })).toBeVisible();
    const popover = screen
      .getByRole("listbox", { name: /Suggestions/ })
      .closest(".search-combobox__popover");
    expect(popover).not.toBeNull();

    fireEvent.change(input, { target: { value: "abc" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    const loading = screen.getByText("候補を検索しています");
    expect(loading).toBeVisible();
    expect(loading.closest(".search-combobox__popover")).toBe(popover);
    expect(screen.queryByRole("option", { name: /最初の候補/ })).toBeNull();

    expect(input).toHaveValue("abc");

    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("abc"));
    await act(async () => resolveSecond?.([second]));
    expect(await screen.findByRole("option", { name: /新しい候補/ })).toBeVisible();
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("listbox", { name: /Suggestions/ }).closest(".search-combobox__popover"),
    ).toBe(popover);
  });

  it("searches directly on Enter when no suggestion is active", async () => {
    let resolveFirst: ((value: SearchSuggestion[]) => void) | undefined;
    let resolveSecond: ((value: SearchSuggestion[]) => void) | undefined;
    const first = {
      id: "product:first",
      label: "最初の候補",
      description: "商品",
      href: "/products/first" as const,
    };
    const loadSuggestions = vi.fn(
      (query: string) =>
        new Promise<SearchSuggestion[]>((resolve) => {
          if (query === "ab") resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ab" } });
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("ab"));
    await act(async () => resolveFirst?.([first]));
    expect(await screen.findByRole("option", { name: /最初の候補/ })).toBeVisible();

    fireEvent.change(input, { target: { value: "abc" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("候補を検索しています")).toBeVisible();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(routerPush).toHaveBeenCalledWith("/search?q=abc");
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("abc"));
    await act(async () => resolveSecond?.([]));
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
  });

  it("closes suggestions when the input becomes shorter than two characters", async () => {
    const suggestion = {
      id: "product:shirt",
      label: "ベーシックTシャツ",
      description: "商品",
      href: "/products/product-basic-shirt" as const,
    };
    const loadSuggestions = vi.fn(async () => [suggestion]);
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ab" } });
    expect(await screen.findByRole("option", { name: /ベーシックTシャツ/ })).toBeVisible();
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.change(input, { target: { value: "a" } });
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
    expect(screen.queryByRole("option", { name: /ベーシックTシャツ/ })).toBeNull();
  });

  it("does not reopen after Escape while the current request is pending", async () => {
    let resolveFirst: ((value: SearchSuggestion[]) => void) | undefined;
    let resolveSecond: ((value: SearchSuggestion[]) => void) | undefined;
    const first = {
      id: "product:first",
      label: "最初の候補",
      description: "商品",
      href: "/products/first" as const,
    };
    const second = {
      id: "product:second",
      label: "新しい候補",
      description: "商品",
      href: "/products/second" as const,
    };
    const loadSuggestions = vi.fn(
      (query: string) =>
        new Promise<SearchSuggestion[]>((resolve) => {
          if (query === "ab") resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ab" } });
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("ab"));
    await act(async () => resolveFirst?.([first]));
    expect(await screen.findByRole("option", { name: /最初の候補/ })).toBeVisible();

    fireEvent.change(input, { target: { value: "abc" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));

    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("abc"));
    await act(async () => resolveSecond?.([second]));
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
    expect(screen.queryByRole("option", { name: /新しい候補/ })).toBeNull();
  });

  it("keeps stale async results out of the open suggestion list", async () => {
    let resolveFirst: ((value: SearchSuggestion[]) => void) | undefined;
    let resolveSecond: ((value: SearchSuggestion[]) => void) | undefined;
    const first = {
      id: "product:first",
      label: "最初の候補",
      description: "商品",
      href: "/products/first" as const,
    };
    const second = {
      id: "product:second",
      label: "新しい候補",
      description: "商品",
      href: "/products/second" as const,
    };
    const loadSuggestions = vi.fn(
      (query: string) =>
        new Promise<SearchSuggestion[]>((resolve) => {
          if (query === "ab") resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ab" } });
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("ab"));
    fireEvent.change(input, { target: { value: "abc" } });
    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("abc"));

    await act(async () => resolveSecond?.([second]));
    expect(await screen.findByRole("option", { name: /新しい候補/ })).toBeVisible();
    await act(async () => resolveFirst?.([first]));
    await waitFor(() => expect(screen.queryByRole("option", { name: /最初の候補/ })).toBeNull());
  });

  it("traps dialog focus and restores it after closing", async () => {
    render(
      <ConfirmDialog
        triggerLabel="Resetを確認"
        title="本当にResetしますか"
        confirmLabel="Resetする"
        onConfirm={() => {}}
        danger
      >
        現在のデータは初期化されます。
      </ConfirmDialog>,
    );
    const trigger = screen.getByRole("button", { name: "Resetを確認" });
    expect(trigger).toHaveClass("button--danger");
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole("alertdialog", { name: "本当にResetしますか" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("renders an admin resource table with semantic headers and caption", () => {
    render(
      <ResourceTable
        caption="商品一覧"
        columns={["商品", "状態", "更新日"]}
        rows={[
          {
            id: "product-1",
            cells: ["ベーシックTシャツ", "公開中", "2026年7月1日"],
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("region", { name: "商品一覧。左右にスクロールできます" }),
    ).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("左右にスクロールして全列を確認できます。")).toBeVisible();
    expect(screen.getByRole("table", { name: "商品一覧" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "状態" })).toBeVisible();
    expect(screen.getByRole("rowheader", { name: "ベーシックTシャツ" })).toBeVisible();
  });

  it("supports an explicit row header column and shared column alignment", () => {
    render(
      <ResourceTable
        caption="商品一覧"
        rowHeaderColumnIndex={1}
        columns={[
          { label: "選択", align: "center" },
          { label: "商品", align: "start" },
          { label: "価格", align: "end" },
        ]}
        rows={[
          {
            id: "product-1",
            cells: [
              <input key="select" type="checkbox" aria-label="ベーシックTシャツを選択" />,
              "ベーシックTシャツ",
              "¥3,980",
            ],
          },
        ]}
      />,
    );

    expect(screen.getByRole("rowheader", { name: "ベーシックTシャツ" })).toBeVisible();
    expect(screen.getByRole("rowheader").querySelector("input")).toBeNull();
    const checkbox = screen.getByRole("checkbox", { name: "ベーシックTシャツを選択" });
    expect(checkbox).toBeVisible();
    expect(checkbox.closest("td")).toHaveClass("resource-table__cell--center");
    expect(screen.getByRole("columnheader", { name: "選択" })).toHaveClass(
      "resource-table__cell--center",
    );
    expect(screen.getByRole("columnheader", { name: "価格" })).toHaveClass(
      "resource-table__cell--end",
    );
    expect(screen.getByRole("rowheader")).toHaveClass("resource-table__cell--start");
    expect(screen.getByRole("cell", { name: "¥3,980" })).toHaveClass("resource-table__cell--end");
  });

  it("omits pagination when every result fits on one page", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Pagination page={1} totalPages={1} onChange={onChange} />);
    expect(screen.queryByRole("navigation", { name: "ページ送り" })).not.toBeInTheDocument();
    rerender(<Pagination page={1} totalPages={2} onChange={onChange} />);
    expect(screen.getByRole("navigation", { name: "ページ送り" })).toBeVisible();
  });
});
