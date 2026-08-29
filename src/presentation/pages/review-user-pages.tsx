import { useEffect, useState, type ReactNode } from "react";
import { Link } from "expo-router";
import { INPUT_LIMITS } from "@/application/contracts";
import type { AdminReviewListItem, UserAdminDto } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import { ConfirmDialog } from "@/presentation/components/confirm-dialog";
import { StatePanel } from "@/presentation/components/states";
import { StatusBadge, statusTone } from "@/presentation/components/status-badge";
import { labels } from "@/presentation/content/dictionary";
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
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import { testControlService } from "@/bootstrap/browser-runtime.web";
import { reloadBrowserPage } from "@/presentation/browser/reload-page.web";
import { PHASE_ONE_SCENARIOS, SCENARIO_METADATA, type PhaseOneScenario } from "@/seeds/metadata";
import {
  clearCheckoutNoticeHistory,
  clearOneTimeNoticeStorage,
  writeOneTimeNotice,
} from "@/presentation/browser/one-time-notice.web";

function Guard({
  access,
  children,
}: {
  access: "customer" | "staff" | "admin" | "automation-admin";
  children: ReactNode;
}) {
  return <RouteGuard access={access}>{children}</RouteGuard>;
}

function ReviewStatusBadge({ status }: { status: "published" | "hidden" | "deleted" }) {
  return <StatusBadge tone={statusTone(status)}>{labels.review(status)}</StatusBadge>;
}

function UserRoleBadge({ role }: { role: "customer" | "operator" | "admin" }) {
  return <StatusBadge tone={statusTone(role)}>{labels.role(role)}</StatusBadge>;
}

function MembershipRankBadge({ rank }: { rank: "regular" | "gold" | "platinum" | null }) {
  if (rank === null) return <>—</>;
  return <StatusBadge tone={statusTone(rank)}>{labels.rank(rank)}</StatusBadge>;
}

function AccountStatusBadge({ status }: { status: "active" | "suspended" | "withdrawn" }) {
  return <StatusBadge tone={statusTone(status)}>{labels.account(status)}</StatusBadge>;
}

export function CustomerReviewPage({ orderItemId }: { orderItemId: string }) {
  return (
    <Guard access="customer">
      <CustomerReviewContent orderItemId={orderItemId} />
    </Guard>
  );
}

function CustomerReviewContent({ orderItemId }: { orderItemId: string }) {
  const { reviews } = useApplicationServices();
  const [mutation, setMutation] = useState(0);
  const state = useAsyncValue(
    () => reviews.getEligibility(orderItemId),
    [reviews, orderItemId, mutation],
  );
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const existing = state.value?.existingReview;
    if (existing !== null && existing !== undefined) {
      setRating(existing.rating);
      setTitle(existing.title ?? "");
      setBody(existing.body);
    }
  }, [state.value]);
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null)
    return (
      <StatePanel
        kind="error"
        action={
          <button className="button button--secondary" onClick={state.retry}>
            再読込
          </button>
        }
      />
    );
  if (state.value === null) return <StatePanel kind="not-found" />;
  const reviewStateLabels = {
    NOT_POSTED: "未投稿",
    PUBLISHED: "公開中",
    HIDDEN: "非公開",
    DELETED: "削除済み",
    NOT_ELIGIBLE: "投稿対象外",
  } as const;
  const context = (
    <section className="review-order-context" aria-label="購入時の商品情報">
      <h2>購入商品</h2>
      <dl className="definition-grid">
        <dt>注文番号</dt>
        <dd>{state.value.orderNumber ?? "—"}</dd>
        <dt>購入日時</dt>
        <dd>
          {state.value.orderCreatedAt === null
            ? "—"
            : new Date(state.value.orderCreatedAt).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
              })}
        </dd>
        <dt>商品名</dt>
        <dd>{state.value.productName ?? "—"}</dd>
        <dt>バリエーション</dt>
        <dd>
          {[state.value.variationName, state.value.optionValue].filter(Boolean).join(" / ") ||
            "単一SKU"}
        </dd>
        <dt>レビュー状態</dt>
        <dd>{reviewStateLabels[state.value.reviewState]}</dd>
      </dl>
    </section>
  );
  if (!state.value.eligible) {
    const reason = {
      ORDER_NOT_DELIVERED: "配達完了後に投稿できます。",
      NOT_OWNER: "この注文商品には投稿できません。",
      ALREADY_REVIEWED: "レビューは商品ごとに1件です。",
      REVIEW_DELETED: "削除済みレビューは再投稿できません。",
    }[state.value.reason ?? "NOT_OWNER"];
    return (
      <div className="storefront-main narrow-form">
        <Breadcrumbs items={[{ label: "注文履歴", href: "/orders" }, { label: "レビュー" }]} />
        {context}
        <StatePanel kind="forbidden" title="レビューを投稿できません" body={reason} />
      </div>
    );
  }
  const existing = state.value.existingReview;
  const save = async () => {
    setMessage(null);
    try {
      await (existing === null
        ? reviews.create({ orderItemId, rating, title: title || null, body })
        : reviews.update({
            reviewId: existing.reviewId,
            rating,
            title: title || null,
            body,
            expectedVersion: existing.version,
          }));
      setMessage(`レビューを${existing === null ? "投稿" : "更新"}しました。`);
      setMutation((value) => value + 1);
    } catch {
      setMessage("保存できませんでした。入力内容を確認してください。");
    }
  };
  return (
    <div className="storefront-main narrow-form">
      <Breadcrumbs items={[{ label: "注文履歴", href: "/orders" }, { label: "レビュー" }]} />
      <PageHeader
        title={existing === null ? "レビューを投稿" : "レビューを編集"}
        description="配達済みの購入商品について、1商品につき1件投稿できます。"
      />
      {context}
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="form-stack"
      >
        <fieldset className="rating-field">
          <legend>評価</legend>
          <div role="radiogroup" aria-label="星評価" className="rating-options">
            {([1, 2, 3, 4, 5] as const).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  aria-label={`${value}つ星`}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                />
                <span aria-hidden="true">{value}</span>
                <span aria-hidden="true">★</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          タイトル（任意）
          <input
            value={title}
            maxLength={INPUT_LIMITS.reviewTitle}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          本文
          <textarea
            value={body}
            required
            maxLength={INPUT_LIMITS.reviewBody}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button className="button button--primary" type="submit">
            {existing === null ? "投稿する" : "更新する"}
          </button>
          {existing !== null && (
            <ConfirmDialog
              triggerLabel="レビューを削除"
              title="レビューを削除しますか"
              confirmLabel="削除する"
              danger
              onConfirm={async () => {
                try {
                  await reviews.delete({
                    reviewId: existing.reviewId,
                    expectedVersion: existing.version,
                  });
                  setMessage("レビューを削除しました。再投稿はできません。");
                  setMutation((value) => value + 1);
                } catch {
                  setMessage("削除できませんでした。再読込してからもう一度お試しください。");
                }
              }}
            >
              この操作は元に戻せません。削除後は同じレビューを再投稿できません。
            </ConfirmDialog>
          )}
        </div>
      </form>
    </div>
  );
}

export function AdminReviewsPage() {
  return (
    <Guard access="staff">
      <AdminReviewsContent />
    </Guard>
  );
}

function AdminReviewsContent() {
  const { adminReviews } = useApplicationServices();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "hidden" | "deleted">("all");
  const [rating, setRating] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const [sort, setSort] = useState<"created_desc" | "rating_desc" | "rating_asc" | "status_asc">(
    "created_desc",
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [mutation, setMutation] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const state = useAsyncValue(
    () =>
      adminReviews.search({
        keyword: keyword || null,
        statuses: status === "all" ? [] : [status],
        ratings: rating === "all" ? [] : [Number(rating) as 1 | 2 | 3 | 4 | 5],
        sort,
        page,
        pageSize: 50,
      }),
    [adminReviews, keyword, status, rating, sort, page, mutation],
  );
  const detail = useAsyncValue(
    async () => (detailId === null ? null : adminReviews.getDetail(detailId)),
    [adminReviews, detailId, mutation],
  );
  const change = async (item: AdminReviewListItem, targetStatus: "published" | "hidden") => {
    try {
      await adminReviews.changeVisibility({
        reviewId: item.reviewId,
        targetStatus,
        expectedVersion: item.version,
      });
      setMessage(`レビューを${targetStatus === "hidden" ? "非公開" : "再公開"}にしました。`);
      setMutation((value) => value + 1);
    } catch {
      setMessage("状態を変更できませんでした。最新の更新番号を確認してください。");
    }
  };
  const bulk = async (targetStatus: "published" | "hidden") => {
    const targetIds = Object.keys(selected);
    if (targetIds.length === 0) return;
    const result = await adminReviews.bulkChangeVisibility({
      targetIds,
      expectedVersions: selected,
      targetStatus,
    });
    setMessage(`${result.succeededCount}件成功、${result.failedCount}件失敗しました。`);
    setSelected({});
    setMutation((value) => value + 1);
  };
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "レビュー管理" }]} />
      <PageHeader
        title="レビュー管理"
        description="公開状態、評価、履歴と集計を同時に管理します。"
      />
      <FilterBar>
        <label>
          本文・商品
          <input
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
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="all">すべて</option>
            <option value="published">{labels.review("published")}</option>
            <option value="hidden">{labels.review("hidden")}</option>
            <option value="deleted">{labels.review("deleted")}</option>
          </select>
        </label>
        <label>
          評価
          <select
            value={rating}
            onChange={(event) => {
              setRating(event.target.value as typeof rating);
              setPage(1);
            }}
          >
            <option value="all">すべて</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}つ星
              </option>
            ))}
          </select>
        </label>
        <label>
          並び順
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="created_desc">新しい順</option>
            <option value="rating_desc">評価の高い順</option>
            <option value="rating_asc">評価の低い順</option>
            <option value="status_asc">状態順</option>
          </select>
        </label>
      </FilterBar>
      <div className="button-row" aria-label="一括操作">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void bulk("hidden")}
        >
          選択を非公開
        </button>
        <button
          type="button"
          className="button button--tertiary"
          onClick={() => void bulk("published")}
        >
          選択を再公開
        </button>
      </div>
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      {!state.loaded ? (
        <StatePanel kind="loading" />
      ) : state.error !== null ? (
        <StatePanel kind="error" />
      ) : state.value?.items.length === 0 ? (
        <StatePanel kind="filter-empty" />
      ) : (
        state.value && (
          <>
            <ResourceTable
              caption="レビュー一覧"
              rowHeaderColumnIndex={1}
              columns={[
                { label: "選択", align: "center" },
                { label: "商品・投稿者", align: "start" },
                { label: "評価", align: "end" },
                { label: "内容", align: "start" },
                { label: "状態", align: "center" },
                { label: "操作", align: "end" },
              ]}
              rows={state.value.items.map((item) => ({
                id: item.reviewId,
                cells: [
                  <input
                    key="select"
                    type="checkbox"
                    aria-label={`${item.productName}を選択`}
                    checked={selected[item.reviewId] !== undefined}
                    onChange={(event) =>
                      setSelected((current) => {
                        const next = { ...current };
                        if (event.target.checked) next[item.reviewId] = item.version;
                        else delete next[item.reviewId];
                        return next;
                      })
                    }
                  />,
                  <span key="identity">
                    <strong>{item.productName}</strong>
                    <br />
                    {item.userEmail}
                  </span>,
                  `${item.rating} / 5`,
                  <span key="content">
                    <strong>{item.title ?? "無題"}</strong>
                    <br />
                    {item.body}
                  </span>,
                  <ReviewStatusBadge key="status" status={item.status} />,
                  <div key="actions" className="table-actions">
                    {item.status === "published" && (
                      <button
                        className="button button--tertiary"
                        onClick={() => void change(item, "hidden")}
                      >
                        非公開
                      </button>
                    )}
                    {item.status === "hidden" && (
                      <button
                        className="button button--tertiary"
                        onClick={() => void change(item, "published")}
                      >
                        再公開
                      </button>
                    )}
                    <button
                      className="button button--secondary"
                      onClick={() => setDetailId(item.reviewId)}
                    >
                      履歴
                    </button>
                  </div>,
                ],
              }))}
            />
            <Pagination
              page={state.value.page}
              totalPages={Math.ceil(state.value.total / state.value.pageSize)}
              onChange={setPage}
            />
          </>
        )
      )}
      {detailId !== null && (
        <section className="admin-detail-card" aria-label="レビュー履歴">
          <div className="split-heading">
            <h2>状態履歴</h2>
            <button className="button button--secondary" onClick={() => setDetailId(null)}>
              閉じる
            </button>
          </div>
          {!detail.loaded ? (
            <p>読み込み中...</p>
          ) : detail.value?.histories.length === 0 ? (
            <p>履歴はありません。</p>
          ) : (
            <ol>
              {detail.value?.histories.map((history) => (
                <li key={history.id}>
                  {history.fromStatus === null ? "新規" : labels.review(history.fromStatus)} →{" "}
                  {labels.review(history.toStatus)}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}

export function AdminUsersPage() {
  return (
    <Guard access="admin">
      <AdminUsersContent />
    </Guard>
  );
}

function AdminUsersContent() {
  const { adminUsers } = useApplicationServices();
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<"all" | "customer" | "operator" | "admin">("all");
  const [status, setStatus] = useState<"all" | "active" | "suspended" | "withdrawn">("all");
  const [page, setPage] = useState(1);
  const state = useAsyncValue(
    () =>
      adminUsers.search({
        keyword: keyword || null,
        roles: role === "all" ? [] : [role],
        accountStatuses: status === "all" ? [] : [status],
        page,
      }),
    [adminUsers, keyword, role, status, page],
  );
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "ユーザー管理" }]} />
      <PageHeader
        title="ユーザー管理"
        description="役割、会員ランク、利用状態を安全制約付きで管理します。"
      />
      <FilterBar>
        <label>
          メール・表示名
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          役割
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option value="all">すべて</option>
            <option value="customer">{labels.role("customer")}</option>
            <option value="operator">{labels.role("operator")}</option>
            <option value="admin">{labels.role("admin")}</option>
          </select>
        </label>
        <label>
          状態
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="all">すべて</option>
            <option value="active">{labels.account("active")}</option>
            <option value="suspended">{labels.account("suspended")}</option>
            <option value="withdrawn">{labels.account("withdrawn")}</option>
          </select>
        </label>
      </FilterBar>
      {!state.loaded ? (
        <StatePanel kind="loading" />
      ) : state.error !== null ? (
        <StatePanel kind="error" />
      ) : state.value?.items.length === 0 ? (
        <StatePanel kind="filter-empty" />
      ) : (
        state.value && (
          <>
            <ResourceTable
              caption="ユーザー一覧"
              columns={[
                { label: "ユーザー", align: "start" },
                { label: "役割", align: "center" },
                { label: "会員ランク", align: "center" },
                { label: "利用状態", align: "center" },
                { label: "更新番号", align: "end" },
              ]}
              rows={state.value.items.map((item) => ({
                id: item.userId,
                cells: [
                  <Link key="user" href={`/admin/users/${item.userId}`}>
                    {item.displayName}
                    <br />
                    {item.email}
                  </Link>,
                  <UserRoleBadge key="role" role={item.role} />,
                  <MembershipRankBadge key="rank" rank={item.membershipRank} />,
                  <AccountStatusBadge key="status" status={item.accountStatus} />,
                  item.version,
                ],
              }))}
            />
            <Pagination
              page={state.value.page}
              totalPages={Math.ceil(state.value.total / state.value.pageSize)}
              onChange={setPage}
            />
          </>
        )
      )}
    </div>
  );
}

export function AdminUserDetailPage({ userId }: { userId: string }) {
  return (
    <Guard access="admin">
      <AdminUserDetailContent userId={userId} />
    </Guard>
  );
}

function AdminUserDetailContent({ userId }: { userId: string }) {
  const { adminUsers } = useApplicationServices();
  const [mutation, setMutation] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const state = useAsyncValue(() => adminUsers.getDetail(userId), [adminUsers, userId, mutation]);
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) return <StatePanel kind="not-found" />;
  return (
    <AdminUserDetailForm
      key={`${state.value.userId}-${state.value.version}`}
      user={state.value}
      message={message}
      onMessage={setMessage}
      onMutation={() => setMutation((value) => value + 1)}
    />
  );
}

function AdminUserDetailForm({
  user,
  message,
  onMessage,
  onMutation,
}: {
  user: UserAdminDto;
  message: string | null;
  onMessage: (message: string | null) => void;
  onMutation: () => void;
}) {
  const { adminUsers } = useApplicationServices();
  const { currentUser } = useAppRuntime();
  const [rank, setRank] = useState<"regular" | "gold" | "platinum">(
    user.membershipRank ?? "regular",
  );
  const [role, setRole] = useState<"operator" | "admin">(
    user.role === "admin" ? "admin" : "operator",
  );
  const userId = user.userId;
  const isSelf = currentUser?.id === userId;
  const mutate = async (operation: () => Promise<UserAdminDto>, success: string) => {
    try {
      const updated = await operation();
      onMessage(`${success}（更新番号 ${updated.version}）。`);
      onMutation();
    } catch (caught) {
      if (caught instanceof ApplicationError) {
        const messages: Partial<Record<ApplicationError["code"], string>> = {
          LAST_ADMIN_PROTECTED: "最後の管理者は変更できません。先に別の管理者を設定してください。",
          SELF_CHANGE_FORBIDDEN: "自分自身の役割または利用状態は変更できません。",
          CONFLICT: "ほかの操作でユーザー情報が更新されました。最新情報を読み込んでください。",
        };
        onMessage(
          messages[caught.code] ??
            "変更できませんでした。役割、利用状態、更新番号を確認してください。",
        );
      } else {
        onMessage("変更できませんでした。役割、利用状態、更新番号を確認してください。");
      }
    }
  };
  const readOnly = user.accountStatus === "withdrawn";
  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[{ label: "ユーザー管理", href: "/admin/users" }, { label: user.displayName }]}
      />
      <PageHeader
        title={user.displayName}
        description={`${user.email}・更新番号 ${user.version}`}
      />
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      <dl className="definition-grid">
        <dt>役割</dt>
        <dd>
          <UserRoleBadge role={user.role} />
        </dd>
        <dt>会員ランク</dt>
        <dd>
          <MembershipRankBadge rank={user.membershipRank} />
        </dd>
        <dt>利用状態</dt>
        <dd>
          <AccountStatusBadge status={user.accountStatus} />
        </dd>
      </dl>
      {readOnly && <p className="notice">退会済みユーザーは読取専用です。</p>}
      {user.role === "customer" && !readOnly && (
        <section className="admin-detail-card">
          <h2>会員ランク</h2>
          <label>
            ランク
            <select
              value={rank}
              disabled={isSelf}
              aria-describedby={isSelf ? "user-edit-constraint" : undefined}
              onChange={(event) => setRank(event.target.value as typeof rank)}
            >
              <option value="regular">{labels.rank("regular")}</option>
              <option value="gold">{labels.rank("gold")}</option>
              <option value="platinum">{labels.rank("platinum")}</option>
            </select>
          </label>
          <button
            className="button button--primary"
            disabled={isSelf || rank === user.membershipRank}
            onClick={() =>
              void mutate(
                () =>
                  adminUsers.changeMembershipRank({ userId, rank, expectedVersion: user.version }),
                "ランクを変更しました",
              )
            }
          >
            ランクを変更
          </button>
          <p id={isSelf ? "user-edit-constraint" : undefined}>
            {isSelf
              ? "自分自身の設定は変更できません。"
              : "進行中の購入手続きは破棄されます。カートの内容は保持されます。"}
          </p>
        </section>
      )}
      {(user.role === "operator" || user.role === "admin") && !readOnly && (
        <section className="admin-detail-card">
          <h2>管理役割</h2>
          <label>
            役割
            <select
              value={role}
              disabled={isSelf}
              aria-describedby={isSelf ? "user-edit-constraint" : undefined}
              onChange={(event) => setRole(event.target.value as typeof role)}
            >
              <option value="operator">{labels.role("operator")}</option>
              <option value="admin">{labels.role("admin")}</option>
            </select>
          </label>
          {currentUser?.id === userId ? (
            <>
              <button
                className="button button--secondary"
                disabled
                aria-describedby="user-edit-constraint"
              >
                役割を変更
              </button>
              <p id="user-edit-constraint">自分自身の役割は変更できません。</p>
            </>
          ) : (
            <ConfirmDialog
              triggerLabel="役割を変更"
              title="管理役割を変更しますか"
              confirmLabel="変更する"
              disabled={role === user.role}
              onConfirm={() =>
                mutate(
                  () => adminUsers.changeRole({ userId, role, expectedVersion: user.version }),
                  "役割を変更しました",
                )
              }
            >
              {role === user.role
                ? "現在と同じ役割が選択されています。"
                : "役割を変更すると、対象ユーザーのすべてのセッションが無効になります。"}
            </ConfirmDialog>
          )}
        </section>
      )}
      {!readOnly && (
        <section className="admin-detail-card">
          <h2>利用状態</h2>
          {currentUser?.id === userId ? (
            <>
              <button
                className="button button--secondary"
                disabled
                aria-describedby="user-status-constraint"
              >
                {user.accountStatus === "active" ? "利用停止" : "利用再開"}
              </button>
              <p id="user-status-constraint">自分自身の利用状態は変更できません。</p>
            </>
          ) : (
            <ConfirmDialog
              triggerLabel={user.accountStatus === "active" ? "利用停止" : "利用再開"}
              title={
                user.accountStatus === "active"
                  ? "このユーザーを利用停止にしますか"
                  : "このユーザーの利用を再開しますか"
              }
              confirmLabel={user.accountStatus === "active" ? "利用停止にする" : "利用を再開する"}
              danger={user.accountStatus === "active"}
              onConfirm={() =>
                mutate(
                  () =>
                    adminUsers.changeSuspension({
                      userId,
                      accountStatus: user.accountStatus === "active" ? "suspended" : "active",
                      expectedVersion: user.version,
                    }),
                  user.accountStatus === "active" ? "利用停止にしました" : "利用を再開しました",
                )
              }
            >
              利用状態を変更すると、対象ユーザーのすべてのセッションが無効になります。
            </ConfirmDialog>
          )}
          <p>役割・利用状態の変更では対象ユーザーの全セッションを無効化します。</p>
        </section>
      )}
    </div>
  );
}

export function AdminTestControlPage() {
  return (
    <Guard access="automation-admin">
      <AdminTestControlContent />
    </Guard>
  );
}

function AdminTestControlContent() {
  const [mutation, setMutation] = useState(0);
  const metadata = useAsyncValue(() => testControlService.getMetadata(), [mutation]);
  const [scenario, setScenario] = useState<PhaseOneScenario>("default");
  const [clock, setClock] = useState("");
  const [delay, setDelay] = useState(500);
  const [message, setMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const apply = async (operation: () => Promise<unknown>, success: string) => {
    try {
      await operation();
      setMessage(success);
      setMutation((value) => value + 1);
    } catch {
      setMessage("操作できませんでした。値とテストAPIの制約を確認してください。");
    }
  };
  const resetScenario = async () => {
    if (resetting) return;
    setResetting(true);
    setMessage(null);
    let resetSucceeded = false;
    try {
      await testControlService.reset({ scenario });
      resetSucceeded = true;
    } catch {
      setMessage("シナリオを初期化できませんでした。画面遷移は行っていません。");
      return;
    } finally {
      if (!resetSucceeded) setResetting(false);
    }

    const definition = SCENARIO_METADATA[scenario];
    const session = definition.initialSession;
    const initialSessionLabel =
      session.kind === "guest"
        ? "Guest Session で開始します。"
        : "初期アカウント：" + session.email;
    try {
      clearOneTimeNoticeStorage();
      clearCheckoutNoticeHistory();
      writeOneTimeNotice({
        type: "scenario-reset",
        scenarioId: scenario,
        scenarioName: definition.displayName,
        initialSessionLabel,
        recommendedAccounts: definition.recommendedAccounts,
        routes: definition.routes,
      });
    } catch {
      // Reset済みのRuntimeを使い続けないため、Notice保存失敗でも必ず遷移する。
    } finally {
      reloadBrowserPage(definition.safeResetPath);
    }
  };
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "テスト制御" }]} />
      <PageHeader
        title="テスト制御"
        description="自動化ビルド専用。テストAPIと同じ制約でシナリオと基準時刻を制御します。"
        action={
          <Link href="/guide" className="button button--secondary">
            学習Guide
          </Link>
        }
      />
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      {!metadata.loaded ? (
        <StatePanel kind="loading" body="メタデータを読み込んでいます。" />
      ) : metadata.error !== null || metadata.value === null ? (
        <StatePanel kind="error" />
      ) : (
        <>
          <dl className="definition-grid">
            <dt>アプリバージョン</dt>
            <dd>{metadata.value.appVersion}</dd>
            <dt>スキーマバージョン</dt>
            <dd>{metadata.value.schemaVersion}</dd>
            <dt>シードバージョン</dt>
            <dd>{metadata.value.seedVersion}</dd>
            <dt>ビルドSHA</dt>
            <dd>{metadata.value.buildSha}</dd>
            <dt>シナリオ</dt>
            <dd>{metadata.value.scenario}</dd>
            <dt>基準時刻</dt>
            <dd>{metadata.value.clock ?? "システム時刻"}</dd>
            <dt>支払い遅延</dt>
            <dd>{metadata.value.paymentDelayMs}ms</dd>
          </dl>
          <section className="admin-detail-card form-stack">
            <h2>シナリオ初期化</h2>
            <label>
              シナリオ
              <select
                value={scenario}
                onChange={(event) => setScenario(event.target.value as PhaseOneScenario)}
              >
                {PHASE_ONE_SCENARIOS.map((item) => (
                  <option key={item} value={item}>
                    {SCENARIO_METADATA[item].displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className="scenario-summary" aria-live="polite">
              <h3>{SCENARIO_METADATA[scenario].displayName}</h3>
              <p>{SCENARIO_METADATA[scenario].purpose}</p>
              <p>{SCENARIO_METADATA[scenario].guide}</p>
              <dl className="definition-grid">
                <dt>初期Session</dt>
                <dd>
                  {SCENARIO_METADATA[scenario].initialSession.kind === "guest"
                    ? "Guest"
                    : SCENARIO_METADATA[scenario].initialSession.email}
                </dd>
                <dt>推奨アカウント</dt>
                <dd>{SCENARIO_METADATA[scenario].recommendedAccounts.join("、")}</dd>
                <dt>安全な移動先</dt>
                <dd>{SCENARIO_METADATA[scenario].safeResetPath}</dd>
                <dt>確認ルート</dt>
                <dd>{SCENARIO_METADATA[scenario].routes.join("、")}</dd>
              </dl>
            </div>
            <ConfirmDialog
              triggerLabel={resetting ? "初期化中…" : "シナリオを初期化"}
              title="シナリオを初期化しますか"
              confirmLabel="初期化して移動"
              danger
              disabled={resetting}
              onConfirm={resetScenario}
            >
              学習データ、Cart、Checkout、注文、商品、在庫、Review、入力途中の内容を初期状態へ戻します。
              Sessionも置き換わり、この操作は元に戻せません。
            </ConfirmDialog>
          </section>
          <section className="admin-detail-card form-stack">
            <h2>基準時刻</h2>
            <label>
              ISO日時
              <input
                value={clock}
                placeholder="2026-07-02T03:00:00.000Z"
                onChange={(event) => setClock(event.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                onClick={() =>
                  void apply(
                    () => testControlService.setClock(clock || null),
                    "基準時刻を更新しました。",
                  )
                }
                className="button button--primary"
              >
                基準時刻を設定
              </button>
              <button
                onClick={() =>
                  void apply(() => testControlService.setClock(null), "システム時刻へ戻しました。")
                }
                className="button button--secondary"
              >
                システム時刻へ戻す
              </button>
            </div>
          </section>
          <section className="admin-detail-card form-stack">
            <h2>支払い遅延</h2>
            <label>
              遅延（0〜30000ms）
              <input
                type="number"
                min={0}
                max={30000}
                value={delay}
                onChange={(event) => setDelay(Number(event.target.value))}
              />
            </label>
            <button
              onClick={() =>
                void apply(
                  () => testControlService.setPaymentDelay(delay),
                  "支払い遅延を更新しました。",
                )
              }
              className="button button--primary"
            >
              遅延を設定
            </button>
          </section>
        </>
      )}
    </div>
  );
}
