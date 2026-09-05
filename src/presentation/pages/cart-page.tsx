import { useCallback, useEffect, useState } from "react";
import { Link } from "expo-router";
import type { CartDto, CartLineIssueCode } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import { ProductImage } from "@/presentation/components/product-image";
import { formatYen } from "@/presentation/components/product-card";
import { StatePanel } from "@/presentation/components/states";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { content } from "@/presentation/content/dictionary";
import { Breadcrumbs } from "@/presentation/patterns/admin-patterns";

const issueLabels: Record<CartLineIssueCode, string> = {
  UNPUBLISHED: "商品が非公開になりました。カートから削除してください。",
  RANK_REQUIRED: "現在の会員ランクでは購入できません。",
  INACTIVE: "選択したSKUは利用できません。カートから削除してください。",
  OUT_OF_STOCK: "在庫切れです。カートから削除してください。",
  INSUFFICIENT_STOCK: "在庫が不足しています。数量を減らしてください。",
  PRICE_CHANGED: "カート追加後に価格が変更されました。",
};

export function CartPage() {
  return (
    <RouteGuard access="guest-or-customer">
      <CartContent />
    </RouteGuard>
  );
}

function CartContent() {
  const { cart: cartUseCases } = useApplicationServices();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const load = useCallback(async () => {
    setCart(await cartUseCases.getCart());
  }, [cartUseCases]);
  useEffect(() => {
    void load().catch(() => setError("カートを読み込めませんでした。"));
  }, [load]);
  const mutate = async (itemId: string, work: () => Promise<CartDto>): Promise<void> => {
    setError(null);
    setProcessingItem(itemId);
    try {
      setCart(await work());
    } catch (caught) {
      setError(
        caught instanceof ApplicationError && caught.code === "QUANTITY_LIMIT_EXCEEDED"
          ? "在庫または購入上限を超える数量には変更できません。"
          : caught instanceof ApplicationError &&
              (caught.code === "CONFLICT" || caught.code === "CART_VERSION_CHANGED")
            ? "ほかの操作でカートが更新されました。最新情報を読み込んでください。"
            : "カートを更新できませんでした。",
      );
    } finally {
      setProcessingItem(null);
    }
  };
  if (error !== null && cart === null) {
    return (
      <StatePanel
        kind="error"
        body={error}
        action={
          <button className="button button--primary" onClick={() => void load()}>
            再試行
          </button>
        }
      />
    );
  }
  if (cart === null) {
    return <StatePanel kind="loading" />;
  }
  if (cart.items.length === 0) {
    return (
      <div className="cart-page">
        <h1>カート</h1>
        <div className="training-notice" role="note">
          {content.notice.training}
        </div>
        <StatePanel
          kind="empty"
          title="カートは空です"
          body="商品を選んでカートへ追加してください。"
          action={
            <Link href="/products" className="button button--primary">
              商品を見る
            </Link>
          }
        />
      </div>
    );
  }
  const priceChangedItems = cart.items.filter((item) => item.issues.includes("PRICE_CHANGED"));
  const nonPriceBlockingIssues = cart.blockingIssues.filter((issue) => issue !== "PRICE_CHANGED");
  return (
    <div className="cart-page">
      <Breadcrumbs items={[{ label: "ホーム", href: "/" }, { label: "カート" }]} />
      <header className="cart-page__header">
        <div>
          <p className="eyebrow">Shopping cart</p>
          <h1>カート</h1>
        </div>
        <p>{cart.items.length}件の商品</p>
      </header>
      <div className="training-notice" role="note">
        <strong>{content.notice.training}</strong>
        <p>{content.notice.personalData}</p>
      </div>
      {error !== null && (
        <p className="operation-error" role="alert">
          {error}
        </p>
      )}
      {priceChangedItems.length > 0 && (
        <section className="price-change-panel">
          <h2>価格が変更されています</h2>
          <p>現在価格を確認し、同意してから購入手続きへ進んでください。</p>
          {nonPriceBlockingIssues.length > 0 && (
            <p role="alert">
              購入できない商品を先に修正または削除してください。その後、現在価格へ同意できます。
            </p>
          )}
          <button
            type="button"
            className="button button--primary"
            disabled={nonPriceBlockingIssues.length > 0 || processingItem === "price-change"}
            onClick={() =>
              void mutate("price-change", () =>
                cartUseCases.acceptPriceChanges({
                  cartExpectedVersion: cart.cartVersion,
                  itemExpectedVersions: Object.fromEntries(
                    cart.items.map((item) => [item.itemId, item.itemVersion]),
                  ),
                }),
              )
            }
          >
            現在価格を確認して同意する
          </button>
        </section>
      )}
      <div className="cart-layout">
        <section className="cart-items" aria-label="カートの商品">
          {cart.items.map((item) => (
            <article className="cart-item" key={item.itemId}>
              <Link href={`/products/${item.productId}`}>
                <ProductImage src={item.image.path} alt={item.image.altText} />
              </Link>
              <div className="cart-item__body">
                <h2>
                  <Link href={`/products/${item.productId}`}>{item.productName}</Link>
                </h2>
                <p>
                  {item.optionValue ?? "単一SKU"}・{item.sku}
                </p>
                <dl className="cart-item__prices">
                  <div>
                    <dt>追加時価格</dt>
                    <dd>{formatYen(item.unitEffectivePriceAtAdd)}</dd>
                  </div>
                  <div>
                    <dt>現在価格</dt>
                    <dd>{formatYen(item.currentUnitEffectivePrice)}</dd>
                  </div>
                  <div>
                    <dt>会員適用価格</dt>
                    <dd>{formatYen(item.currentViewerUnitPrice)}</dd>
                  </div>
                </dl>
                {item.issues.length > 0 && (
                  <ul className="cart-item__issues">
                    {item.issues.map((issue) => (
                      <li key={issue}>{issueLabels[issue]}</li>
                    ))}
                  </ul>
                )}
                <div className="cart-item__actions">
                  <label>
                    数量
                    <select
                      value={item.quantity}
                      disabled={processingItem === item.itemId || item.maximumQuantity === 0}
                      onChange={(event) =>
                        void mutate(item.itemId, () =>
                          cartUseCases.updateQuantity({
                            itemId: item.itemId,
                            quantity: Number(event.target.value),
                            cartExpectedVersion: cart.cartVersion,
                            itemExpectedVersion: item.itemVersion,
                          }),
                        )
                      }
                    >
                      {Array.from(
                        { length: Math.max(1, item.maximumQuantity) },
                        (_, index) => index + 1,
                      ).map((quantity) => (
                        <option value={quantity} key={quantity}>
                          {quantity}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button button--tertiary"
                    disabled={processingItem === item.itemId}
                    onClick={() =>
                      void mutate(item.itemId, () =>
                        cartUseCases.removeItem({
                          itemId: item.itemId,
                          cartExpectedVersion: cart.cartVersion,
                          itemExpectedVersion: item.itemVersion,
                        }),
                      )
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
              <p className="cart-item__total">
                小計 <strong>{formatYen(item.lineTotalAmount)}</strong>
              </p>
            </article>
          ))}
        </section>
        <aside className="order-summary">
          <h2>注文内容</h2>
          <dl>
            <div>
              <dt>商品小計</dt>
              <dd>{formatYen(cart.subtotalAmount)}</dd>
            </div>
            <div>
              <dt>会員割引</dt>
              <dd>-{formatYen(cart.discountAmount)}</dd>
            </div>
            <div>
              <dt>送料</dt>
              <dd>{formatYen(cart.shippingAmount)}</dd>
            </div>
            <div className="order-summary__total">
              <dt>合計</dt>
              <dd>{formatYen(cart.totalAmount)}</dd>
            </div>
          </dl>
          {cart.freeShippingRemainingAmount > 0 ? (
            <p>あと{formatYen(cart.freeShippingRemainingAmount)}で送料無料</p>
          ) : (
            <p>送料無料</p>
          )}
          {cart.blockingIssues.length > 0 ? (
            <button
              type="button"
              className="button button--primary is-disabled"
              aria-disabled="true"
              onClick={() =>
                document.querySelector(".cart-item__issues")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
            >
              購入手続きへ
            </button>
          ) : (
            <Link href="/checkout/address" className="button button--primary">
              購入手続きへ
            </Link>
          )}
          {cart.blockingIssues.length > 0 && (
            <p className="order-summary__blocking">
              購入できない商品を修正または削除してください。
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
