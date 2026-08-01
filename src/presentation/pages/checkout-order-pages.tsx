import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocalSearchParams, useRouter, type Href } from "expo-router";
import type {
  CheckoutConfirmationDto,
  CustomerOrderDetailDto,
  OrderDetailDto,
} from "@/application/contracts";
import { PAYMENT_METHODS } from "@/application/use-cases/checkout-order-use-cases";
import type { PaymentMethodCode, UserAddress } from "@/domain/contracts";
import { AccountNavigation } from "@/presentation/components/account-navigation";
import { formatYen } from "@/presentation/components/product-card";
import { ProductImage } from "@/presentation/components/product-image";
import { StatePanel } from "@/presentation/components/states";
import { StatusBadge, statusTone } from "@/presentation/components/status-badge";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAsyncValue } from "@/presentation/hooks/use-async-value";
import { content, labels } from "@/presentation/content/dictionary";
import { claimCheckoutNotice } from "@/presentation/browser/one-time-notice.web";
import { useRouteHeadingFocus } from "@/presentation/hooks/use-route-heading-focus";

const paymentLabels: Record<PaymentMethodCode, string> = {
  "TEST-SUCCESS": "テスト決済（成功）",
  "TEST-DECLINED": "テスト決済（利用拒否）",
  "TEST-INSUFFICIENT": "テスト決済（残高不足）",
  "TEST-AUTH-FAILED": "テスト決済（認証失敗）",
};

const paymentMethodDescriptions: Record<PaymentMethodCode, string> = {
  "TEST-SUCCESS": "支払い完了を再現します。",
  "TEST-DECLINED": "利用拒否による支払い失敗を再現します。",
  "TEST-INSUFFICIENT": "残高不足による支払い失敗を再現します。",
  "TEST-AUTH-FAILED": "認証失敗による支払い失敗を再現します。",
};

const orderStatusLabels: Record<OrderDetailDto["orderStatus"], string> = {
  pending_payment: "支払い処理中",
  payment_failed: "支払い失敗",
  paid: "発送準備待ち",
  preparing: "発送準備中",
  shipped: "発送済み",
  delivered: "配達完了",
};

const orderListStatusLabels: Record<OrderDetailDto["orderStatus"], string> = {
  ...orderStatusLabels,
  pending_payment: "支払い待ち",
};

function CustomerPage({ children }: { children: ReactNode }) {
  return <RouteGuard access="customer">{children}</RouteGuard>;
}

function CheckoutSteps({ current }: { current: "address" | "payment" | "confirm" }) {
  const steps = [
    ["address", "配送先"],
    ["payment", "支払方法"],
    ["confirm", "確認"],
  ] as const;
  return (
    <ol className="checkout-steps" aria-label="購入手続きの進捗">
      {steps.map(([id, label], index) => (
        <li aria-current={current === id ? "step" : undefined} key={id}>
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function TrainingNotice() {
  return (
    <div className="training-notice" role="note">
      <strong>{content.notice.training}</strong>
      <p>実在する住所・カード情報は入力しないでください。</p>
    </div>
  );
}

function CheckoutLoadError({ retry, href = "/cart" }: { retry?: () => void; href?: Href }) {
  return (
    <StatePanel
      kind="error"
      title="購入手続きを続けられません"
      body="カートまたは前のステップが更新されました。内容を確認してください。"
      action={
        <div className="inline-actions">
          {retry && (
            <button className="button button--secondary" onClick={retry}>
              再読み込み
            </button>
          )}
          <Link href={href} className="button button--primary">
            戻って確認する
          </Link>
        </div>
      }
    />
  );
}

export function CheckoutAddressPage() {
  return (
    <CustomerPage>
      <CheckoutAddressContent />
    </CustomerPage>
  );
}

function CheckoutAddressContent() {
  const services = useApplicationServices();
  const router = useRouter();
  const state = useAsyncValue(async () => {
    const cart = await services.cart.getCart();
    const [checkout, addresses] = await Promise.all([
      services.checkout.start({ cartVersion: cart.cartVersion }),
      services.account.listAddresses(),
    ]);
    return { checkout, addresses, total: cart.totalAmount };
  }, [services]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleNotice, setLifecycleNotice] = useState<string | null>(null);
  const headingRef = useRouteHeadingFocus(
    state.loaded && state.error === null && state.value !== null,
  );
  useEffect(() => {
    const checkout = state.value?.checkout;
    if (
      checkout === undefined ||
      (checkout.result !== "resumed" && checkout.result !== "replaced") ||
      !claimCheckoutNotice(checkout.session.id, checkout.result)
    ) {
      return;
    }
    setLifecycleNotice(
      checkout.result === "resumed"
        ? "以前の購入手続きを再開しました。"
        : "カートの更新により、購入手続きを最新の内容へ置き換えました。",
    );
  }, [state.value]);
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null)
    return <CheckoutLoadError retry={state.retry} />;
  const selected =
    state.value.addresses.find((item) => item.id === selectedId) ??
    state.value.addresses.find((item) => item.isDefault) ??
    state.value.addresses[0];
  const submit = async () => {
    if (selected === undefined) return;
    setSubmitting(true);
    setError(null);
    try {
      await services.checkout.setAddress({
        checkoutSessionId: state.value!.checkout.session.id,
        checkoutExpectedVersion: state.value!.checkout.session.version,
        address: snapshotAddress(selected),
      });
      router.push("/checkout/payment");
    } catch {
      setError("配送先を保存できませんでした。最新のカートを確認してください。");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="checkout-page">
      <CheckoutSteps current="address" />
      <h1 ref={headingRef} tabIndex={-1}>
        配送先を選択
      </h1>
      {lifecycleNotice !== null && (
        <p className="operation-message" role="status">
          {lifecycleNotice}
        </p>
      )}
      <TrainingNotice />
      {error && (
        <p role="alert" className="operation-error">
          {error}
        </p>
      )}
      {state.value.addresses.length === 0 ? (
        <StatePanel
          kind="empty"
          title="配送先がありません"
          body="アカウント画面で配送先を登録してから戻ってください。"
          action={
            <Link href="/account/addresses" className="button button--primary">
              配送先を登録
            </Link>
          }
        />
      ) : (
        <div className="checkout-layout">
          <section className="selection-list" aria-label="登録済み配送先">
            {state.value.addresses.map((item) => (
              <label className="selection-card" key={item.id}>
                <input
                  type="radio"
                  name="address"
                  checked={(selected?.id ?? null) === item.id}
                  onChange={() => setSelectedId(item.id)}
                />
                <span>
                  <strong>
                    {item.label}
                    {item.isDefault ? "（既定）" : ""}
                  </strong>
                  <span>
                    〒{item.postalCode} {item.prefecture}
                    {item.city}
                    {item.addressLine1}
                  </span>
                  <span>{item.recipientName} 様</span>
                </span>
              </label>
            ))}
          </section>
          <CheckoutActionSummary
            total={state.value.total}
            label="この配送先を使用"
            disabled={selected === undefined || submitting}
            onClick={() => void submit()}
          />
        </div>
      )}
    </div>
  );
}

export function CheckoutPaymentPage() {
  return (
    <CustomerPage>
      <CheckoutPaymentContent />
    </CustomerPage>
  );
}

function CheckoutPaymentContent() {
  const services = useApplicationServices();
  const router = useRouter();
  const state = useAsyncValue(async () => {
    const session = await services.checkout.getActive("payment");
    const cart = await services.cart.getCart();
    return { session, total: cart.totalAmount };
  }, [services]);
  const [method, setMethod] = useState<PaymentMethodCode>("TEST-SUCCESS");
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRouteHeadingFocus(
    state.loaded && state.error === null && state.value !== null,
  );
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) {
    return <CheckoutLoadError href="/checkout/address" />;
  }
  const submit = async () => {
    setSubmitting(true);
    try {
      await services.checkout.setPayment({
        checkoutSessionId: state.value!.session.id,
        checkoutExpectedVersion: state.value!.session.version,
        paymentMethodCode: method,
      });
      router.push("/checkout/confirm");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="checkout-page">
      <CheckoutSteps current="payment" />
      <h1 ref={headingRef} tabIndex={-1}>
        支払方法
      </h1>
      <TrainingNotice />
      <div className="checkout-layout">
        <section className="selection-list" aria-label="テスト支払方法">
          {PAYMENT_METHODS.map((code) => (
            <label className="selection-card" key={code}>
              <input
                type="radio"
                name="payment"
                checked={method === code}
                onChange={() => setMethod(code)}
              />
              <span>
                <strong>{paymentLabels[code]}</strong>
                <span>{paymentMethodDescriptions[code]}</span>
              </span>
            </label>
          ))}
        </section>
        <CheckoutActionSummary
          total={state.value.total}
          label={`${formatYen(state.value.total)}を確認する`}
          disabled={submitting}
          onClick={() => void submit()}
        />
      </div>
    </div>
  );
}

export function CheckoutConfirmPage() {
  return (
    <CustomerPage>
      <CheckoutConfirmContent />
    </CustomerPage>
  );
}

function CheckoutConfirmContent() {
  const services = useApplicationServices();
  const router = useRouter();
  const state = useAsyncValue(() => services.checkout.getConfirmation(), [services]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRouteHeadingFocus(
    state.loaded && state.error === null && state.value !== null,
  );
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) {
    return <CheckoutLoadError href="/checkout/payment" retry={state.retry} />;
  }
  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await services.checkout.beginOrder({
        checkoutSessionId: state.value!.checkoutSessionId,
        checkoutActionVersion: state.value!.checkoutActionVersion,
      });
      router.replace(`/checkout/processing?orderId=${encodeURIComponent(result.orderId)}`);
    } catch {
      setError("注文を確定できませんでした。カートの価格・在庫を確認してください。");
      setSubmitting(false);
    }
  };
  return (
    <div className="checkout-page">
      <CheckoutSteps current="confirm" />
      <h1 ref={headingRef} tabIndex={-1}>
        注文内容を確認
      </h1>
      <TrainingNotice />
      {error && (
        <p role="alert" className="operation-error">
          {error}
        </p>
      )}
      <div className="checkout-layout">
        <div className="checkout-confirmation">
          <ConfirmationItems confirmation={state.value} />
          <section className="summary-card">
            <h2>配送先</h2>
            <address>
              〒{state.value.address.postalCode}
              <br />
              {state.value.address.prefecture}
              {state.value.address.city}
              {state.value.address.addressLine1}
              <br />
              {state.value.address.recipientName} 様
            </address>
            <Link href="/checkout/address">変更する</Link>
          </section>
          <section className="summary-card">
            <h2>支払方法</h2>
            <p>{paymentLabels[state.value.paymentMethodCode]}</p>
            <Link href="/checkout/payment">変更する</Link>
          </section>
        </div>
        <CheckoutActionSummary
          confirmation={state.value}
          total={state.value.totalAmount}
          label={`${formatYen(state.value.totalAmount)}を支払う`}
          disabled={submitting}
          onClick={() => void submit()}
        />
      </div>
    </div>
  );
}

function ConfirmationItems({ confirmation }: { confirmation: CheckoutConfirmationDto }) {
  return (
    <section className="summary-card">
      <h2>商品</h2>
      {confirmation.items.map((item) => (
        <article className="confirmation-line" key={item.variantId}>
          <ProductImage src={item.image.path} alt={item.image.altText} />
          <div>
            <strong>{item.productName}</strong>
            <p>
              {item.optionValue ?? "単一SKU"}・数量 {item.quantity}
            </p>
          </div>
          <strong>{formatYen(item.lineTotalAmount)}</strong>
        </article>
      ))}
    </section>
  );
}

function CheckoutActionSummary({
  total,
  label,
  disabled,
  onClick,
  confirmation,
}: {
  total: number;
  label: string;
  disabled: boolean;
  onClick: () => void;
  confirmation?: CheckoutConfirmationDto;
}) {
  return (
    <aside className="order-summary checkout-summary">
      <details open>
        <summary>注文サマリー</summary>
        {confirmation && (
          <dl>
            <div>
              <dt>商品小計</dt>
              <dd>{formatYen(confirmation.subtotalAmount)}</dd>
            </div>
            <div>
              <dt>会員割引</dt>
              <dd>-{formatYen(confirmation.discountAmount)}</dd>
            </div>
            <div>
              <dt>送料</dt>
              <dd>{formatYen(confirmation.shippingAmount)}</dd>
            </div>
          </dl>
        )}
        <p className="order-summary__total">
          <strong>合計</strong>
          <strong>{formatYen(total)}</strong>
        </p>
      </details>
      <button className="button button--primary" disabled={disabled} onClick={onClick}>
        {disabled ? "処理中…" : label}
      </button>
    </aside>
  );
}

export function CheckoutProcessingPage() {
  return (
    <CustomerPage>
      <CheckoutProcessingContent />
    </CustomerPage>
  );
}

function CheckoutProcessingContent() {
  const services = useApplicationServices();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const state = useAsyncValue(async () => {
    if (typeof orderId !== "string") throw new Error("orderId required");
    const result = await services.checkout.resumePayment(orderId);
    router.replace(
      result.orderStatus === "payment_failed"
        ? `/checkout/failed?orderId=${encodeURIComponent(result.orderId)}`
        : `/checkout/complete?orderId=${encodeURIComponent(result.orderId)}`,
    );
    return result;
  }, [orderId, services, router]);
  const headingRef = useRouteHeadingFocus(state.error === null);
  if (state.error !== null) {
    return (
      <StatePanel
        kind="error"
        title="支払い結果を確認できません"
        action={
          <button className="button button--primary" onClick={state.retry}>
            再開する
          </button>
        }
      />
    );
  }
  return (
    <section className="payment-result-page" aria-live="polite">
      <div className="processing-spinner" aria-hidden="true" />
      <h1 ref={headingRef} tabIndex={-1}>
        支払いを処理しています
      </h1>
      <p>画面を閉じても、同じ支払い試行から安全に再開できます。</p>
    </section>
  );
}

export function CheckoutCompletePage() {
  return <OrderResultPage kind="complete" />;
}

export function CheckoutFailedPage() {
  return <OrderResultPage kind="failed" />;
}

function OrderResultPage({ kind }: { kind: "complete" | "failed" }) {
  return (
    <CustomerPage>
      <OrderResultContent kind={kind} />
    </CustomerPage>
  );
}

function OrderResultContent({ kind }: { kind: "complete" | "failed" }) {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const services = useApplicationServices();
  const router = useRouter();
  const state = useAsyncValue(async () => {
    if (typeof orderId !== "string") throw new Error("orderId required");
    return services.checkout.getMyOrder(orderId);
  }, [orderId, services]);
  const [method, setMethod] = useState<PaymentMethodCode>("TEST-SUCCESS");
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRouteHeadingFocus(
    state.loaded && state.error === null && state.value !== null,
  );
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) return <StatePanel kind="not-found" />;
  const retry = async () => {
    setSubmitting(true);
    try {
      const result = await services.checkout.retryPayment({
        orderId: state.value!.orderId,
        orderActionVersion: state.value!.orderActionVersion,
        methodCode: method,
      });
      router.replace(`/checkout/processing?orderId=${encodeURIComponent(result.orderId)}`);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className={`payment-result-page payment-result-page--${kind}`}>
      <p className="result-symbol" aria-hidden="true">
        {kind === "complete" ? "✓" : "!"}
      </p>
      <h1 ref={headingRef} tabIndex={-1}>
        {kind === "complete" ? "ご注文が完了しました" : "支払いを完了できませんでした"}
      </h1>
      <p>
        注文番号 <strong>{state.value.orderNumber}</strong>
      </p>
      <p>合計 {formatYen(state.value.totalAmount)}</p>
      <p>
        {kind === "complete"
          ? "注文詳細から配送状況を確認できます。"
          : "注文は作成されています。支払方法を選び直して再試行できます。"}
      </p>
      {kind === "failed" && (
        <div className="retry-payment">
          <label>
            再試行するテスト決済
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethodCode)}
            >
              {PAYMENT_METHODS.map((code) => (
                <option value={code} key={code}>
                  {paymentLabels[code]}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button button--primary"
            disabled={submitting}
            onClick={() => void retry()}
          >
            {submitting ? "準備中…" : "支払いを再試行"}
          </button>
        </div>
      )}
      <div className="inline-actions">
        <Link
          href={`/orders/${state.value.orderId}`}
          className={`button button--${kind === "complete" ? "primary" : "secondary"}`}
        >
          注文詳細
        </Link>
        <Link href="/products" className="button button--secondary">
          買い物を続ける
        </Link>
      </div>
    </section>
  );
}

export function OrdersPage() {
  return (
    <CustomerPage>
      <OrdersContent />
    </CustomerPage>
  );
}

function OrdersContent() {
  const services = useApplicationServices();
  const state = useAsyncValue(() => services.checkout.listMyOrders(), [services]);
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) return <StatePanel kind="error" />;
  return (
    <div className="orders-page">
      <AccountNavigation current="orders" />
      <h1>注文履歴</h1>
      {state.value.items.length === 0 ? (
        <StatePanel kind="empty" title="注文履歴はありません" />
      ) : (
        <div className="order-card-list">
          {state.value.items.map((order) => (
            <article className="order-card" key={order.orderId}>
              <ProductImage
                src={order.representativeImage.path}
                alt={order.representativeImage.altText}
              />
              <div>
                <p>{new Date(order.createdAt).toLocaleDateString("ja-JP")}</p>
                <h2>
                  <Link href={`/orders/${order.orderId}`}>{order.orderNumber}</Link>
                </h2>
                <p>
                  <StatusBadge tone={statusTone(order.status)}>
                    {orderListStatusLabels[order.status]}
                  </StatusBadge>
                  <strong>{formatYen(order.totalAmount)}</strong>
                </p>
              </div>
              <Link href={`/orders/${order.orderId}`} className="button button--secondary">
                詳細
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  return (
    <CustomerPage>
      <OrderDetailContent orderId={orderId} />
    </CustomerPage>
  );
}

function OrderDetailContent({ orderId }: { orderId: string }) {
  const services = useApplicationServices();
  const state = useAsyncValue<CustomerOrderDetailDto>(
    () =>
      services.checkout.getMyCustomerOrder !== undefined
        ? services.checkout.getMyCustomerOrder(orderId)
        : (services.checkout.getMyOrder(orderId) as Promise<CustomerOrderDetailDto>),
    [orderId, services],
  );
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error !== null || state.value === null) return <StatePanel kind="not-found" />;
  const order = state.value;
  return (
    <div className="order-detail-page">
      <AccountNavigation current="orders" />
      <nav className="breadcrumbs" aria-label="パンくず">
        <ol>
          <li>
            <Link href="/orders">注文履歴</Link>
          </li>
          <li aria-current="page">{order.orderNumber}</li>
        </ol>
      </nav>
      <header>
        <p className="eyebrow">注文詳細</p>
        <h1>{order.orderNumber}</h1>
        <p>
          <StatusBadge tone={statusTone(order.orderStatus)}>
            {orderStatusLabels[order.orderStatus]}
          </StatusBadge>
          <span>{new Date(order.createdAt).toLocaleString("ja-JP")}</span>
        </p>
      </header>
      <div className="order-detail-grid">
        <section className="summary-card">
          <h2>注文商品</h2>
          {order.items.map((item) => (
            <article className="confirmation-line" key={item.orderItemId}>
              <ProductImage src={item.image.path} alt={item.image.altText} />
              <div>
                <strong>{item.productName}</strong>
                <p>
                  {item.sku}・数量 {item.quantity}
                </p>
                {item.reviewState === "NOT_POSTED" && (
                  <Link href={`/reviews/${item.orderItemId}`} className="order-review-link">
                    レビューを投稿
                  </Link>
                )}
                {item.reviewState === "PUBLISHED" || item.reviewState === "HIDDEN" ? (
                  <Link href={`/reviews/${item.orderItemId}`} className="order-review-link">
                    レビューを編集（{item.reviewState === "HIDDEN" ? "非公開" : "公開中"}）
                  </Link>
                ) : null}
                {item.reviewState === "DELETED" && (
                  <span className="field-help">削除済み（再投稿不可）</span>
                )}
              </div>
              <strong>{formatYen(item.lineTotalAmount)}</strong>
            </article>
          ))}
        </section>
        <section className="summary-card">
          <h2>お支払い</h2>
          <dl>
            <div>
              <dt>商品小計</dt>
              <dd>{formatYen(order.subtotalAmount)}</dd>
            </div>
            <div>
              <dt>会員割引</dt>
              <dd>-{formatYen(order.discountAmount)}</dd>
            </div>
            <div>
              <dt>送料</dt>
              <dd>{formatYen(order.shippingAmount)}</dd>
            </div>
            <div>
              <dt>合計</dt>
              <dd>
                <strong>{formatYen(order.totalAmount)}</strong>
              </dd>
            </div>
          </dl>
          <h3>支払い履歴</h3>
          <ol>
            {order.paymentAttempts.map((attempt) => (
              <li key={attempt.attemptNumber}>
                #{attempt.attemptNumber} {paymentLabels[attempt.methodCode]}{" "}
                <StatusBadge tone={statusTone(attempt.status)}>
                  {labels.payment(attempt.status)}
                </StatusBadge>
              </li>
            ))}
          </ol>
        </section>
        <section className="summary-card">
          <h2>配送先</h2>
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
        <section className="summary-card">
          <h2>配送状況</h2>
          <p>
            <StatusBadge tone={statusTone(order.shipment?.status ?? "pending")}>
              {order.orderStatus === "preparing" && order.shipment?.status === "pending"
                ? "発送準備中"
                : order.shipment === null
                  ? "発送準備前"
                  : labels.shipment(order.shipment.status)}
            </StatusBadge>
          </p>
          {order.shipment?.carrierName && <p>配送会社：{order.shipment.carrierName}</p>}
          {order.shipment?.trackingNumber && (
            <p>お問い合わせ番号：{order.shipment.trackingNumber}</p>
          )}
        </section>
        <section className="summary-card">
          <h2>進捗</h2>
          <ol className="order-timeline">
            {order.timeline.map((item, index) => (
              <li key={`${item.createdAt}-${index}`}>
                <strong>{orderStatusLabels[item.status]}になりました</strong>
                <span>{new Date(item.createdAt).toLocaleString("ja-JP")}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {order.orderStatus === "payment_failed" && (
        <Link href={`/checkout/failed?orderId=${order.orderId}`} className="button button--primary">
          支払いを再試行
        </Link>
      )}
    </div>
  );
}

function snapshotAddress(address: UserAddress) {
  return {
    recipientName: address.recipientName,
    postalCode: address.postalCode,
    prefecture: address.prefecture,
    city: address.city,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    phone: address.phone,
  };
}
