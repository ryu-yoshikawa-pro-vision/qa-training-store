import { useState, type ReactNode } from "react";
import { Link } from "expo-router";
import type { AdminOrderDetailDto, InventoryItem } from "@/application/contracts";
import type { OrderStatus, ShipmentStatus } from "@/domain/contracts";
import { ProductImage } from "@/presentation/components/product-image";
import { StatePanel } from "@/presentation/components/states";
import { StatusBadge, statusTone } from "@/presentation/components/status-badge";
import { labels, shipmentDisplayLabel } from "@/presentation/content/dictionary";
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

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <StatusBadge tone={statusTone(active ? "active" : "inactive")}>
      {active ? "有効" : "無効"}
    </StatusBadge>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge tone={statusTone(status)}>{labels.order(status)}</StatusBadge>;
}

function PaymentStatusBadge({ status }: { status: "processing" | "succeeded" | "failed" }) {
  return <StatusBadge tone={statusTone(status)}>{labels.payment(status)}</StatusBadge>;
}

function ShipmentStatusBadge({
  orderStatus,
  status,
}: {
  orderStatus: OrderStatus;
  status: ShipmentStatus | null;
}) {
  return (
    <StatusBadge tone={statusTone(status ?? "pending")}>
      {shipmentDisplayLabel(orderStatus, status)}
    </StatusBadge>
  );
}

function inventoryReasonLabel(reasonCode: string) {
  switch (reasonCode) {
    case "MANUAL_INCREASE":
      return "手動増加";
    case "MANUAL_DECREASE":
      return "手動減少";
    case "CORRECTION":
      return "訂正";
    default:
      return "その他";
  }
}

export function AdminInventoriesPage() {
  return (
    <StaffPage>
      <AdminInventoriesContent />
    </StaffPage>
  );
}

function AdminInventoriesContent() {
  const { adminOperations } = useApplicationServices();
  const [keyword, setKeyword] = useState("");
  const [stock, setStock] = useState<"all" | "low" | "out" | "available">("all");
  const [active, setActive] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<
    "updated_desc" | "stock_asc" | "stock_desc" | "product_code_asc"
  >("updated_desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [changeQuantity, setChangeQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState<
    "MANUAL_INCREASE" | "MANUAL_DECREASE" | "CORRECTION"
  >("MANUAL_INCREASE");
  const [reasonText, setReasonText] = useState("");
  const [mutation, setMutation] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const state = useAsyncValue(
    () =>
      adminOperations.searchInventory({
        keyword: keyword || null,
        stockState: stock,
        activeState: active,
        sort,
        page,
      }),
    [adminOperations, keyword, stock, active, sort, page, mutation],
  );
  const detail = useAsyncValue(
    async () => (selected ? adminOperations.getInventoryDetail(selected.variantId) : null),
    [adminOperations, selected, mutation],
  );
  const adjust = async () => {
    if (!selected) return;
    try {
      const signed = reasonCode === "MANUAL_DECREASE" ? -Math.abs(changeQuantity) : changeQuantity;
      await adminOperations.adjustInventory({
        variantId: selected.variantId,
        changeQuantity: signed,
        reasonCode,
        reasonText,
        expectedVersion: selected.version,
      });
      setMessage("在庫と履歴を同時に更新しました。");
      setSelected(null);
      setMutation((value) => value + 1);
    } catch {
      setMessage("在庫を更新できませんでした。数量、理由、最新バージョンを確認してください。");
    }
  };
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "在庫管理" }]} />
      <PageHeader
        title="在庫管理"
        description="商品編集とは分離し、SKU単位で数量と履歴を管理します。"
      />
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      <FilterBar>
        <label>
          検索
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <label>
          在庫
          <select value={stock} onChange={(event) => setStock(event.target.value as typeof stock)}>
            <option value="all">すべて</option>
            <option value="available">在庫あり</option>
            <option value="low">低在庫</option>
            <option value="out">在庫切れ</option>
          </select>
        </label>
        <label>
          SKU状態
          <select
            value={active}
            onChange={(event) => setActive(event.target.value as typeof active)}
          >
            <option value="all">すべて</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </select>
        </label>
        <label>
          並び順
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="updated_desc">更新日</option>
            <option value="stock_asc">在庫昇順</option>
            <option value="stock_desc">在庫降順</option>
            <option value="product_code_asc">商品コード</option>
          </select>
        </label>
      </FilterBar>
      {!state.loaded ? (
        <StatePanel kind="loading" />
      ) : state.error || !state.value ? (
        <StatePanel kind="error" />
      ) : (
        <>
          <ResourceTable
            caption="SKU在庫一覧"
            columns={[
              { label: "SKU", align: "start" },
              { label: "商品", align: "start" },
              { label: "選択肢", align: "start" },
              { label: "状態", align: "center" },
              { label: "在庫", align: "end" },
              { label: "バージョン", align: "end" },
              { label: "操作", align: "end" },
            ]}
            rows={state.value.items.map((item) => ({
              id: item.variantId,
              cells: [
                item.sku,
                `${item.productCode} — ${item.productName}`,
                item.optionValue ?? "—",
                <ActiveBadge key="status" active={item.isActive} />,
                item.stockQuantity,
                item.version,
                <button
                  key="adjust"
                  className="button button--secondary"
                  onClick={() => setSelected(item)}
                >
                  調整・履歴
                </button>,
              ],
            }))}
          />
          <Pagination
            page={state.value.page}
            totalPages={Math.ceil(state.value.total / state.value.pageSize)}
            onChange={setPage}
          />
        </>
      )}
      {selected && (
        <section className="admin-action-panel" aria-label={`${selected.sku}の在庫調整`}>
          <h2>{selected.sku}を調整</h2>
          <div className="form-grid">
            <label>
              理由
              <select
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value as typeof reasonCode)}
              >
                <option value="MANUAL_INCREASE">手動増加</option>
                <option value="MANUAL_DECREASE">手動減少</option>
                <option value="CORRECTION">訂正</option>
              </select>
            </label>
            <label>
              増減数量
              <input
                type="number"
                min="1"
                value={changeQuantity}
                onChange={(event) => setChangeQuantity(Number(event.target.value))}
              />
            </label>
            <label className="form-grid__wide">
              理由詳細
              <input
                value={reasonText}
                maxLength={200}
                onChange={(event) => setReasonText(event.target.value)}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="button button--primary" onClick={() => void adjust()}>
              バージョン {selected.version}で更新
            </button>
            <button className="button button--tertiary" onClick={() => setSelected(null)}>
              閉じる
            </button>
          </div>
          {detail.value && (
            <ResourceTable
              caption={`${selected.sku}の在庫履歴`}
              columns={[
                { label: "日時", align: "start" },
                { label: "理由", align: "start" },
                { label: "増減", align: "end" },
                { label: "変更前", align: "end" },
                { label: "変更後", align: "end" },
                { label: "詳細", align: "start" },
              ]}
              rows={detail.value.histories.map((history) => ({
                id: history.id,
                cells: [
                  new Date(history.createdAt).toLocaleString("ja-JP"),
                  inventoryReasonLabel(history.reasonCode),
                  history.changeQuantity,
                  history.beforeQuantity,
                  history.afterQuantity,
                  history.reasonText,
                ],
              }))}
            />
          )}
        </section>
      )}
    </div>
  );
}

export function AdminOrdersPage() {
  return (
    <StaffPage>
      <AdminOrdersContent />
    </StaffPage>
  );
}

function AdminOrdersContent() {
  const { adminOperations } = useApplicationServices();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [minimumTotal, setMinimumTotal] = useState("");
  const [maximumTotal, setMaximumTotal] = useState("");
  const [sort, setSort] = useState<"created_desc" | "created_asc" | "total_asc" | "total_desc">(
    "created_desc",
  );
  const [page, setPage] = useState(1);
  const orderStatuses: OrderStatus[] = [
    "pending_payment",
    "payment_failed",
    "paid",
    "preparing",
    "shipped",
    "delivered",
  ];
  const state = useAsyncValue(
    () =>
      adminOperations.searchOrders({
        keyword: keyword || null,
        statuses: status === "all" ? [] : [status],
        createdFrom: createdFrom ? `${createdFrom}T00:00:00.000Z` : null,
        createdTo: createdTo ? `${createdTo}T23:59:59.999Z` : null,
        minimumTotal: minimumTotal ? Number(minimumTotal) : null,
        maximumTotal: maximumTotal ? Number(maximumTotal) : null,
        sort,
        page,
      }),
    [
      adminOperations,
      keyword,
      status,
      createdFrom,
      createdTo,
      minimumTotal,
      maximumTotal,
      sort,
      page,
    ],
  );
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "注文管理" }]} />
      <PageHeader title="注文管理" description="注文時点の情報と配送進捗を検索します。" />
      <FilterBar>
        <label>
          注文番号・顧客
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <label>
          状態
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="all">すべて</option>
            {orderStatuses.map((item) => (
              <option key={item} value={item}>
                {labels.order(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          開始日
          <input
            type="date"
            value={createdFrom}
            onChange={(event) => setCreatedFrom(event.target.value)}
          />
        </label>
        <label>
          終了日
          <input
            type="date"
            value={createdTo}
            onChange={(event) => setCreatedTo(event.target.value)}
          />
        </label>
        <label>
          最低合計
          <input
            type="number"
            min="0"
            value={minimumTotal}
            onChange={(event) => setMinimumTotal(event.target.value)}
          />
        </label>
        <label>
          最高合計
          <input
            type="number"
            min="0"
            value={maximumTotal}
            onChange={(event) => setMaximumTotal(event.target.value)}
          />
        </label>
        <label>
          並び順
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="created_desc">新しい順</option>
            <option value="created_asc">古い順</option>
            <option value="total_asc">合計昇順</option>
            <option value="total_desc">合計降順</option>
          </select>
        </label>
      </FilterBar>
      {!state.loaded ? (
        <StatePanel kind="loading" />
      ) : state.error || !state.value ? (
        <StatePanel kind="error" />
      ) : (
        <>
          <ResourceTable
            caption="管理用注文一覧"
            columns={[
              { label: "注文番号", align: "start" },
              { label: "顧客", align: "start" },
              { label: "状態", align: "center" },
              { label: "商品数", align: "end" },
              { label: "合計", align: "end" },
              { label: "作成日時", align: "start" },
            ]}
            rows={state.value.items.map((order) => ({
              id: order.orderId,
              cells: [
                <Link key="order" href={`/admin/orders/${order.orderId}`}>
                  {order.orderNumber}
                </Link>,
                order.userEmail,
                <OrderStatusBadge key="status" status={order.status} />,
                order.itemCount,
                formatYen(order.totalAmount),
                new Date(order.createdAt).toLocaleString("ja-JP"),
              ],
            }))}
          />
          <Pagination
            page={state.value.page}
            totalPages={Math.ceil(state.value.total / state.value.pageSize)}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export function AdminOrderDetailPage({ orderId }: { orderId: string }) {
  return (
    <StaffPage>
      <AdminOrderDetailContent orderId={orderId} />
    </StaffPage>
  );
}

function AdminOrderDetailContent({ orderId }: { orderId: string }) {
  const { adminOperations } = useApplicationServices();
  const [mutation, setMutation] = useState(0);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const state = useAsyncValue(
    () => adminOperations.getOrder(orderId),
    [adminOperations, orderId, mutation],
  );
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error || !state.value) return <StatePanel kind="not-found" />;
  const order = state.value;
  const mutate = async (work: () => Promise<AdminOrderDetailDto>) => {
    try {
      const updated = await work();
      setMessage(`更新しました。新しい操作バージョン: ${updated.orderActionVersion}`);
      setMutation((value) => value + 1);
    } catch {
      setMessage("更新できませんでした。状態または操作バージョンを確認してください。");
    }
  };
  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[{ label: "注文管理", href: "/admin/orders" }, { label: order.orderNumber }]}
      />
      <PageHeader
        title={order.orderNumber}
        description={`${labels.order(order.orderStatus)}・操作バージョン ${order.orderActionVersion}`}
      />
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      <div className="admin-detail-grid">
        <section className="summary-card">
          <h2>顧客概要</h2>
          <p>
            <strong>{order.customer.displayName}</strong>
          </p>
          <p>{order.customer.email}</p>
          <p>ユーザーID: {order.customer.userId}</p>
        </section>
        <section className="summary-card">
          <h2>注文時の配送先</h2>
          <address>
            〒{order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.prefecture}
            {order.shippingAddress.city}
            {order.shippingAddress.addressLine1}
            <br />
            {order.shippingAddress.recipientName} 様
          </address>
        </section>
        <section className="summary-card admin-detail-grid__wide">
          <h2>注文時の商品</h2>
          {order.items.map((item) => (
            <article className="confirmation-line" key={item.orderItemId}>
              <ProductImage src={item.image.path} alt={item.image.altText} />
              <div>
                <strong>
                  {item.productCode} — {item.productName}
                </strong>
                <p>
                  {item.sku}・数量 {item.quantity}
                </p>
              </div>
              <strong>{formatYen(item.lineTotalAmount)}</strong>
            </article>
          ))}
          <p>
            <strong>合計 {formatYen(order.totalAmount)}</strong>（注文時の会員ランク:{" "}
            {labels.rank(order.membershipRankSnapshot)}）
          </p>
        </section>
        <section className="summary-card">
          <h2>支払い・配送</h2>
          <p>支払い履歴: {order.paymentAttempts.length}件</p>
          <ol>
            {order.paymentAttempts.map((attempt) => (
              <li key={attempt.attemptNumber}>
                #{attempt.attemptNumber} <PaymentStatusBadge status={attempt.status} />
              </li>
            ))}
          </ol>
          <p>
            配送:{" "}
            <ShipmentStatusBadge
              orderStatus={order.orderStatus}
              status={order.shipment?.status ?? null}
            />
          </p>
          {order.shipment?.carrierName && (
            <p>
              {order.shipment.carrierName} / {order.shipment.trackingNumber}
            </p>
          )}
        </section>
        <section className="summary-card">
          <h2>配送操作</h2>
          {order.orderStatus === "paid" && (
            <button
              className="button button--primary"
              onClick={() =>
                void mutate(() =>
                  adminOperations.startPreparation({
                    orderId,
                    orderActionVersion: order.orderActionVersion,
                  }),
                )
              }
            >
              発送準備を開始
            </button>
          )}
          {order.orderStatus === "preparing" && (
            <div className="form-stack">
              <label>
                配送会社
                <input value={carrier} onChange={(event) => setCarrier(event.target.value)} />
              </label>
              <label>
                追跡番号
                <input value={tracking} onChange={(event) => setTracking(event.target.value)} />
              </label>
              <button
                className="button button--primary"
                onClick={() =>
                  void mutate(() =>
                    adminOperations.ship({
                      orderId,
                      orderActionVersion: order.orderActionVersion,
                      carrierName: carrier,
                      trackingNumber: tracking,
                    }),
                  )
                }
              >
                発送済みにする
              </button>
            </div>
          )}
          {order.orderStatus === "shipped" && (
            <button
              className="button button--primary"
              onClick={() =>
                void mutate(() =>
                  adminOperations.completeDelivery({
                    orderId,
                    orderActionVersion: order.orderActionVersion,
                  }),
                )
              }
            >
              配達完了にする
            </button>
          )}
          {["pending_payment", "payment_failed", "delivered"].includes(order.orderStatus) && (
            <p>現在の状態で利用できる配送操作はありません。</p>
          )}
        </section>
      </div>
    </div>
  );
}
