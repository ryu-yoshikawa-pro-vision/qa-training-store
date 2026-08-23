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
        <FormErrorSummary errors={[{ fieldId: "email", message: "Emailを入力してください" }]} />
        <input id="email" aria-label="Email" />
      </form>,
    );
    const summary = screen.getByRole("alert");
    expect(summary).toHaveFocus();
    expect(screen.getByRole("link", { name: "Emailを入力してください" })).toHaveAttribute(
      "href",
      "#email",
    );
  });

  it("opens async suggestions after normal typing and keeps keyboard selection", async () => {
    const loadSuggestions = vi.fn(async () => [
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
    ]);
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "ベー" } });
    expect(await screen.findByRole("option", { name: /ベーシックTシャツ/ })).toBeVisible();
    expect(loadSuggestions).toHaveBeenCalledWith("ベー");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/products/product-basic-shirt"));
  });

  it("keeps the suggestion popover open for an async no-result response", async () => {
    const loadSuggestions = vi.fn(async () => []);
    render(<SearchCombobox loadSuggestions={loadSuggestions} />);
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "存在しない" } });

    expect(await screen.findByText("候補がありません")).toBeVisible();
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("does not request suggestions before two characters even after the debounce interval", () => {
    const loadSuggestions = vi.fn(async () => []);
    vi.useFakeTimers();
    try {
      render(<SearchCombobox loadSuggestions={loadSuggestions} />);
      fireEvent.change(screen.getByRole("combobox", { name: "商品を検索" }), {
        target: { value: "あ" },
      });
      act(() => vi.advanceTimersByTime(200));
      expect(loadSuggestions).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears displayed suggestions when a new async request starts", async () => {
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
    expect(screen.queryByRole("option", { name: /最初の候補/ })).toBeNull();

    act(() => {
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(routerPush).not.toHaveBeenCalledWith(first.href);
    expect(input).toHaveValue("abc");

    await waitFor(() => expect(loadSuggestions).toHaveBeenCalledWith("abc"));
    await act(async () => resolveSecond?.([second]));
    expect(await screen.findByRole("option", { name: /新しい候補/ })).toBeVisible();
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
