import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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
import { SearchCombobox } from "@/presentation/components/search-combobox";
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

  it("uses an accessible combobox and keyboard selection", async () => {
    render(
      <SearchCombobox
        suggestions={[
          {
            id: "product:shirt",
            label: "ベーシックTシャツ",
            description: "商品",
            href: "/products/product-basic-shirt",
          },
          {
            id: "category:apparel",
            label: "ファッション",
            description: "カテゴリ",
            href: "/categories/category-apparel",
          },
        ]}
      />,
    );
    const input = screen.getByRole("combobox", { name: "商品を検索" });
    fireEvent.change(input, { target: { value: "ベー" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await screen.findByRole("option", { name: /ベーシックTシャツ/ });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/products/product-basic-shirt"));
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
