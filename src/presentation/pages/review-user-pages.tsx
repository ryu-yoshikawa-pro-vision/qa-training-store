import { useEffect, useState, type ReactNode } from "react";
import { Link } from "expo-router";
import type { AdminReviewListItem, ReviewResultDto, UserAdminDto } from "@/application/contracts";
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
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import { testControlService } from "@/bootstrap/browser-runtime.web";
import { PHASE_ONE_SCENARIOS, type PhaseOneScenario } from "@/seeds/metadata";

function Guard({
  access,
  children,
}: {
  access: "customer" | "staff" | "admin" | "automation-admin";
  children: ReactNode;
}) {
  return <RouteGuard access={access}>{children}</RouteGuard>;
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
    return <StatePanel kind="error" action={<button onClick={state.retry}>再読込</button>} />;
  if (state.value === null) return <StatePanel kind="not-found" />;
  if (!state.value.eligible) {
    const reason = {
      ORDER_NOT_DELIVERED: "配達完了後に投稿できます。",
      NOT_OWNER: "この注文商品には投稿できません。",
      ALREADY_REVIEWED: "レビューは商品ごとに1件です。",
      REVIEW_DELETED: "削除済みレビューは再投稿できません。",
    }[state.value.reason ?? "NOT_OWNER"];
    return <StatePanel kind="forbidden" title="レビューを投稿できません" body={reason} />;
  }
  const existing = state.value.existingReview;
  const save = async () => {
    setMessage(null);
    try {
      const saved: ReviewResultDto =
        existing === null
          ? await reviews.create({ orderItemId, rating, title: title || null, body })
          : await reviews.update({
              reviewId: existing.reviewId,
              rating,
              title: title || null,
              body,
              expectedVersion: existing.version,
            });
      setMessage(
        `レビューを${existing === null ? "投稿" : "更新"}しました（Version ${saved.version}）。`,
      );
      setMutation((value) => value + 1);
    } catch {
      setMessage("保存できませんでした。入力内容または最新Versionを確認してください。");
    }
  };
  const remove = async () => {
    if (existing === null) return;
    try {
      await reviews.delete({ reviewId: existing.reviewId, expectedVersion: existing.version });
      setMessage("レビューを削除しました。再投稿はできません。");
      setMutation((value) => value + 1);
    } catch {
      setMessage("削除できませんでした。最新情報を読み込んでください。");
    }
  };
  return (
    <main className="storefront-main narrow-form">
      <Breadcrumbs items={[{ label: "注文履歴", href: "/orders" }, { label: "レビュー" }]} />
      <PageHeader
        title={existing === null ? "レビューを投稿" : "レビューを編集"}
        description="配達済みの購入商品について、1商品につき1件投稿できます。"
      />
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
                <span aria-hidden="true">★</span>
                <span className="sr-only">{value}つ星</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          タイトル（任意）
          <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          本文
          <textarea
            value={body}
            required
            maxLength={1000}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button className="button button--primary" type="submit">
            {existing === null ? "投稿する" : "更新する"}
          </button>
          {existing !== null && (
            <button className="button button--danger" type="button" onClick={() => void remove()}>
              削除する
            </button>
          )}
        </div>
      </form>
    </main>
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
      setMessage("状態を変更できませんでした。最新Versionを確認してください。");
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
            <option value="published">公開</option>
            <option value="hidden">非公開</option>
            <option value="deleted">削除済み</option>
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
        <button type="button" onClick={() => void bulk("hidden")}>
          選択を非公開
        </button>
        <button type="button" onClick={() => void bulk("published")}>
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
              columns={["選択", "商品・投稿者", "評価", "内容", "状態", "操作"]}
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
                  item.status,
                  <div key="actions" className="table-actions">
                    {item.status === "published" && (
                      <button onClick={() => void change(item, "hidden")}>非公開</button>
                    )}
                    {item.status === "hidden" && (
                      <button onClick={() => void change(item, "published")}>再公開</button>
                    )}
                    <button onClick={() => setDetailId(item.reviewId)}>履歴</button>
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
            <button onClick={() => setDetailId(null)}>閉じる</button>
          </div>
          {!detail.loaded ? (
            <p>読み込み中...</p>
          ) : detail.value?.histories.length === 0 ? (
            <p>履歴はありません。</p>
          ) : (
            <ol>
              {detail.value?.histories.map((history) => (
                <li key={history.id}>
                  {history.fromStatus ?? "新規"} → {history.toStatus}（{history.createdAt}）
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
        description="Role、会員ランク、利用状態を安全制約付きで管理します。"
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
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option value="all">すべて</option>
            <option value="customer">customer</option>
            <option value="operator">operator</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label>
          状態
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="all">すべて</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="withdrawn">withdrawn</option>
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
              columns={["ユーザー", "Role", "ランク", "状態", "Version"]}
              rows={state.value.items.map((item) => ({
                id: item.userId,
                cells: [
                  <Link key="user" href={`/admin/users/${item.userId}`}>
                    {item.displayName}
                    <br />
                    {item.email}
                  </Link>,
                  item.role,
                  item.membershipRank ?? "—",
                  item.accountStatus,
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
  const { currentUser } = useAppRuntime();
  const [mutation, setMutation] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const state = useAsyncValue(() => adminUsers.getDetail(userId), [adminUsers, userId, mutation]);
  const [rank, setRank] = useState<"regular" | "gold" | "platinum">("regular");
  const [role, setRole] = useState<"operator" | "admin">("operator");
  useEffect(() => {
    if (state.value?.membershipRank) setRank(state.value.membershipRank);
    if (state.value?.role === "operator" || state.value?.role === "admin")
      setRole(state.value.role);
  }, [state.value]);
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) return <StatePanel kind="not-found" />;
  const user: UserAdminDto = state.value;
  const mutate = async (operation: () => Promise<UserAdminDto>, success: string) => {
    try {
      const updated = await operation();
      setMessage(`${success}（Version ${updated.version}）。`);
      setMutation((value) => value + 1);
    } catch {
      setMessage(
        "変更できませんでした。自己変更、最後のadmin、Role、状態、Versionを確認してください。",
      );
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
        description={`${user.email} / Version ${user.version}`}
      />
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      <dl className="definition-grid">
        <dt>Role</dt>
        <dd>{user.role}</dd>
        <dt>会員ランク</dt>
        <dd>{user.membershipRank ?? "—"}</dd>
        <dt>状態</dt>
        <dd>{user.accountStatus}</dd>
      </dl>
      {readOnly && <p className="notice">withdrawnユーザーは読取専用です。</p>}
      {user.role === "customer" && !readOnly && (
        <section className="admin-detail-card">
          <h2>会員ランク</h2>
          <label>
            ランク
            <select value={rank} onChange={(event) => setRank(event.target.value as typeof rank)}>
              <option value="regular">regular</option>
              <option value="gold">gold</option>
              <option value="platinum">platinum</option>
            </select>
          </label>
          <button
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
          <p>Active Checkoutはabandonedになります。Cartは保持されます。</p>
        </section>
      )}
      {(user.role === "operator" || user.role === "admin") && !readOnly && (
        <section className="admin-detail-card">
          <h2>管理Role</h2>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="operator">operator</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button
            disabled={currentUser?.id === userId}
            onClick={() =>
              void mutate(
                () => adminUsers.changeRole({ userId, role, expectedVersion: user.version }),
                "Roleを変更しました",
              )
            }
          >
            Roleを変更
          </button>
        </section>
      )}
      {!readOnly && (
        <section className="admin-detail-card">
          <h2>利用状態</h2>
          <button
            disabled={currentUser?.id === userId}
            onClick={() =>
              void mutate(
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
            {user.accountStatus === "active" ? "利用停止" : "利用再開"}
          </button>
          <p>Role・Status変更では対象ユーザーの全Sessionを無効化します。</p>
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
  const apply = async (operation: () => Promise<unknown>, success: string) => {
    try {
      await operation();
      setMessage(success);
      setMutation((value) => value + 1);
    } catch {
      setMessage("操作できませんでした。値とTest API制約を確認してください。");
    }
  };
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "テスト制御" }]} />
      <PageHeader
        title="Test Control"
        description="Automation build専用。Test APIと同じ制約でScenarioと時計を制御します。"
      />
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      {!metadata.loaded ? (
        <StatePanel kind="loading" body="Metadataを読み込んでいます。" />
      ) : metadata.error !== null || metadata.value === null ? (
        <StatePanel kind="error" />
      ) : (
        <>
          <dl className="definition-grid">
            <dt>App Version</dt>
            <dd>{metadata.value.appVersion}</dd>
            <dt>Schema Version</dt>
            <dd>{metadata.value.schemaVersion}</dd>
            <dt>Seed Version</dt>
            <dd>{metadata.value.seedVersion}</dd>
            <dt>Build SHA</dt>
            <dd>{metadata.value.buildSha}</dd>
            <dt>Scenario</dt>
            <dd>{metadata.value.scenario}</dd>
            <dt>Clock</dt>
            <dd>{metadata.value.clock ?? "System Clock"}</dd>
            <dt>Payment Delay</dt>
            <dd>{metadata.value.paymentDelayMs}ms</dd>
          </dl>
          <section className="admin-detail-card form-stack">
            <h2>Scenario Reset</h2>
            <label>
              Scenario
              <select
                value={scenario}
                onChange={(event) => setScenario(event.target.value as PhaseOneScenario)}
              >
                {PHASE_ONE_SCENARIOS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() =>
                void apply(
                  () => testControlService.reset({ scenario }),
                  "ScenarioをResetしました。再読込してください。",
                )
              }
            >
              ScenarioをReset
            </button>
          </section>
          <section className="admin-detail-card form-stack">
            <h2>Clock</h2>
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
                    "Clockを更新しました。",
                  )
                }
              >
                Clockを設定
              </button>
              <button
                onClick={() =>
                  void apply(() => testControlService.setClock(null), "System Clockへ戻しました。")
                }
              >
                Clockを解除
              </button>
            </div>
          </section>
          <section className="admin-detail-card form-stack">
            <h2>Payment Delay</h2>
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
                  "Payment Delayを更新しました。",
                )
              }
            >
              遅延を設定
            </button>
          </section>
        </>
      )}
    </div>
  );
}
