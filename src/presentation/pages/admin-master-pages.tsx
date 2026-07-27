import { useState, type ReactNode } from "react";
import { Link, type Href } from "expo-router";
import type { BrandAdminListItem, CategoryAdminListItem } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import { ConfirmDialog } from "@/presentation/components/confirm-dialog";
import { StatePanel } from "@/presentation/components/states";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAsyncValue } from "@/presentation/hooks/use-async-value";
import {
  Breadcrumbs,
  FilterBar,
  PageHeader,
  Pagination,
  ResourceTable,
} from "@/presentation/patterns/admin-patterns";
import { formatYen } from "@/presentation/components/product-card";

function StaffPage({ children }: { children: ReactNode }) {
  return <RouteGuard access="staff">{children}</RouteGuard>;
}

export function AdminOverviewPage() {
  return (
    <StaffPage>
      <AdminOverviewContent />
    </StaffPage>
  );
}

function AdminOverviewContent() {
  const { adminMaster } = useApplicationServices();
  const state = useAsyncValue(() => adminMaster.getOverview(), [adminMaster]);
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) return <StatePanel kind="error" />;
  const overview = state.value;
  return (
    <div className="admin-page">
      <PageHeader title="管理概要" description="本日の優先作業とストア全体の状態を確認できます。" />
      <section className="admin-metrics" aria-label="主要指標">
        <MetricCard
          label="発送準備待ち"
          value={overview.ordersAwaitingPreparationCount}
          href="/admin/orders?status=paid"
        />
        <MetricCard
          label="低在庫SKU（1〜5）"
          value={overview.lowStockSkuCount}
          href="/admin/inventories?stock=low"
        />
        <MetricCard
          label="非公開Review"
          value={overview.hiddenReviewCount}
          href="/admin/reviews?status=hidden"
        />
      </section>
      <section className="admin-quick-actions">
        <h2>Quick Actions</h2>
        <div className="inline-actions">
          <Link href="/admin/products/new" className="button button--primary">
            商品を登録
          </Link>
          <Link href="/admin/inventories" className="button button--secondary">
            在庫を調整
          </Link>
          <Link href="/admin/categories" className="button button--secondary">
            Categoryを管理
          </Link>
        </div>
      </section>
      <section>
        <h2>最近の注文</h2>
        <ResourceTable
          caption="最近の注文5件"
          columns={["注文番号", "顧客", "状態", "合計", "作成日時"]}
          rows={overview.recentOrders.map((order) => ({
            id: order.orderId,
            cells: [
              <Link href={`/admin/orders/${order.orderId}`} key="order">
                {order.orderNumber}
              </Link>,
              order.userEmail,
              order.status,
              formatYen(order.totalAmount),
              new Date(order.createdAt).toLocaleString("ja-JP"),
            ],
          }))}
        />
      </section>
    </div>
  );
}

function MetricCard({ label, value, href }: { label: string; value: number; href: Href }) {
  return (
    <Link href={href} className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <span>確認する →</span>
    </Link>
  );
}

export function AdminCategoriesPage() {
  return (
    <StaffPage>
      <AdminCategoriesContent />
    </StaffPage>
  );
}

function AdminCategoriesContent() {
  const { adminMaster } = useApplicationServices();
  const [keyword, setKeyword] = useState("");
  const [active, setActive] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [mutation, setMutation] = useState(0);
  const state = useAsyncValue(
    () =>
      adminMaster.searchCategories({
        keyword: keyword || null,
        active: active === "all" ? null : active === "active",
        page,
      }),
    [adminMaster, keyword, active, page, mutation],
  );
  const reorder = useAsyncValue(
    () => adminMaster.listAllCategoriesForReorder(),
    [adminMaster, mutation],
  );
  const mutate = async (work: () => Promise<unknown>, success: string) => {
    setMessage(null);
    try {
      await work();
      setMessage(success);
      setMutation((value) => value + 1);
    } catch (caught) {
      setMessage(
        caught instanceof ApplicationError && caught.code === "INVALID_STATE"
          ? "公開中の商品が参照しているため無効化できません。"
          : "変更を保存できませんでした。名称重複または競合を確認してください。",
      );
    }
  };
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "Category管理" }]} />
      <PageHeader title="Category管理" description="表示順とStorefrontでの利用可否を管理します。" />
      {message && (
        <p className="operation-message" role="status">
          {message}
        </p>
      )}
      <form
        className="admin-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          void mutate(
            () => adminMaster.createCategory({ name: newName }),
            "Categoryを追加しました。",
          );
          setNewName("");
        }}
      >
        <label>
          新しいCategory名
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
            maxLength={80}
          />
        </label>
        <button className="button button--primary">末尾に追加</button>
      </form>
      <FilterBar>
        <label>
          検索
          <input
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          状態
          <select
            value={active}
            onChange={(event) => {
              setActive(event.target.value as typeof active);
              setPage(1);
            }}
          >
            <option value="all">すべて</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </select>
        </label>
      </FilterBar>
      {!state.loaded ? (
        <StatePanel kind="loading" />
      ) : state.error || !state.value ? (
        <StatePanel kind="error" />
      ) : (
        <>
          <CategoryTable
            items={state.value.items}
            onSave={(item, name) =>
              mutate(
                () =>
                  adminMaster.updateCategory({
                    categoryId: item.categoryId,
                    name,
                    expectedVersion: item.version,
                  }),
                "名称を更新しました。",
              )
            }
            onToggle={(item) =>
              mutate(
                () =>
                  adminMaster.changeCategoryActiveState({
                    categoryId: item.categoryId,
                    targetIsActive: !item.isActive,
                    expectedVersion: item.version,
                  }),
                "状態を更新しました。",
              )
            }
          />
          <Pagination
            page={state.value.page}
            totalPages={Math.ceil(state.value.total / state.value.pageSize)}
            onChange={setPage}
          />
        </>
      )}
      <section className="reorder-panel">
        <h2>表示順を編集</h2>
        <p>上へ・下へボタンはDrag操作のKeyboard代替です。保存時に全IDを10刻みで再採番します。</p>
        {reorder.value && (
          <CategoryReorderList
            key={mutation}
            initialItems={reorder.value}
            onSave={(items) =>
              mutate(
                () =>
                  adminMaster.reorderCategories({
                    orderedIds: items.map((item) => item.categoryId),
                    expectedVersions: Object.fromEntries(
                      items.map((item) => [item.categoryId, item.version]),
                    ),
                  }),
                "表示順を保存しました。",
              )
            }
          />
        )}
      </section>
    </div>
  );
}

function CategoryTable({
  items,
  onSave,
  onToggle,
}: {
  items: CategoryAdminListItem[];
  onSave: (item: CategoryAdminListItem, name: string) => void;
  onToggle: (item: CategoryAdminListItem) => void;
}) {
  return (
    <ResourceTable
      caption="Category一覧"
      columns={["Category", "順序", "公開商品", "状態", "操作"]}
      rows={items.map((item) => ({
        id: item.categoryId,
        cells: [
          <InlineNameEditor key="name" value={item.name} onSave={(name) => onSave(item, name)} />,
          item.sortOrder,
          item.publishedProductCount,
          item.isActive ? "有効" : "無効",
          <ConfirmDialog
            key="toggle"
            triggerLabel={item.isActive ? "無効化" : "有効化"}
            title={`${item.name}を${item.isActive ? "無効化" : "有効化"}しますか`}
            confirmLabel="状態を変更"
            danger={item.isActive}
            onConfirm={() => onToggle(item)}
          >
            {item.isActive && item.publishedProductCount > 0
              ? "公開中の商品がある場合は変更が拒否されます。"
              : "Storefrontでの利用可否が変わります。"}
          </ConfirmDialog>,
        ],
      }))}
    />
  );
}

function InlineNameEditor({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(value);
  return (
    <div className="inline-name-editor">
      <input
        aria-label={`${value}の名称`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
      />
      <button
        type="button"
        className="button button--tertiary"
        disabled={name.trim() === value || name.trim() === ""}
        onClick={() => onSave(name)}
      >
        名称保存
      </button>
    </div>
  );
}

function CategoryReorderList({
  initialItems,
  onSave,
}: {
  initialItems: CategoryAdminListItem[];
  onSave: (items: CategoryAdminListItem[]) => void;
}) {
  const [items, setItems] = useState(initialItems);
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setItems(next);
  };
  return (
    <>
      <ol className="reorder-list">
        {items.map((item, index) => (
          <li key={item.categoryId}>
            <span>{item.name}</span>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={`${item.name}を上へ`}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`${item.name}を下へ`}
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="button button--primary" onClick={() => onSave(items)}>
        表示順を保存
      </button>
    </>
  );
}

export function AdminBrandsPage() {
  return (
    <StaffPage>
      <AdminBrandsContent />
    </StaffPage>
  );
}

function AdminBrandsContent() {
  const { adminMaster } = useApplicationServices();
  const [keyword, setKeyword] = useState("");
  const [newName, setNewName] = useState("");
  const [mutation, setMutation] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const state = useAsyncValue(
    () => adminMaster.searchBrands({ keyword: keyword || null, sort: "name_asc" }),
    [adminMaster, keyword, mutation],
  );
  const mutate = async (work: () => Promise<unknown>, success: string) => {
    try {
      await work();
      setMessage(success);
      setMutation((value) => value + 1);
    } catch (caught) {
      setMessage(
        caught instanceof ApplicationError && caught.code === "INVALID_STATE"
          ? "公開中の商品が参照しているため無効化できません。"
          : "変更を保存できませんでした。",
      );
    }
  };
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "Brand管理" }]} />
      <PageHeader title="Brand管理" description="Brandは名称順で固定表示されます。" />
      {message && (
        <p className="operation-message" role="status">
          {message}
        </p>
      )}
      <form
        className="admin-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          void mutate(() => adminMaster.createBrand({ name: newName }), "Brandを追加しました。");
          setNewName("");
        }}
      >
        <label>
          新しいBrand名
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
            maxLength={80}
          />
        </label>
        <button className="button button--primary">追加</button>
      </form>
      <FilterBar>
        <label>
          検索
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
      </FilterBar>
      {!state.loaded ? (
        <StatePanel kind="loading" />
      ) : state.error || !state.value ? (
        <StatePanel kind="error" />
      ) : (
        <ResourceTable
          caption="Brand一覧（名称順）"
          columns={["Brand", "公開商品", "状態", "操作"]}
          rows={state.value.items.map((item: BrandAdminListItem) => ({
            id: item.brandId,
            cells: [
              <InlineNameEditor
                key="name"
                value={item.name}
                onSave={(name) =>
                  void mutate(
                    () =>
                      adminMaster.updateBrand({
                        brandId: item.brandId,
                        name,
                        expectedVersion: item.version,
                      }),
                    "名称を更新しました。",
                  )
                }
              />,
              item.publishedProductCount,
              item.isActive ? "有効" : "無効",
              <ConfirmDialog
                key="toggle"
                triggerLabel={item.isActive ? "無効化" : "有効化"}
                title={`${item.name}の状態変更`}
                confirmLabel="状態を変更"
                danger={item.isActive}
                onConfirm={() =>
                  void mutate(
                    () =>
                      adminMaster.changeBrandActiveState({
                        brandId: item.brandId,
                        targetIsActive: !item.isActive,
                        expectedVersion: item.version,
                      }),
                    "状態を更新しました。",
                  )
                }
              >
                公開中の商品がある場合、無効化は拒否されます。
              </ConfirmDialog>,
            ],
          }))}
        />
      )}
    </div>
  );
}
