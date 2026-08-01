import { Link, type Href } from "expo-router";
import type { CartMergeItemResult } from "@/application/contracts";
import type { OneTimeNotice as OneTimeNoticeValue } from "@/presentation/browser/one-time-notice.web";

function excludedReasonLabel(reason: NonNullable<CartMergeItemResult["excludedReason"]>) {
  const labels: Record<NonNullable<CartMergeItemResult["excludedReason"]>, string> = {
    NOT_FOUND: "商品が見つかりません",
    UNPUBLISHED: "非公開の商品です",
    RANK_REQUIRED: "会員ランクの対象外です",
    INACTIVE: "利用できないSKUです",
    OUT_OF_STOCK: "在庫切れです",
  };
  return labels[reason];
}

function isSafeInternalPath(path: string): boolean {
  if (path === "/") return true;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("://") || path.includes("..") || path.includes("\\") || /\s/.test(path)) {
    return false;
  }
  return /^[A-Za-z0-9/_-]+$/.test(path.slice(1));
}

function renderRoute(path: string) {
  return isSafeInternalPath(path) ? <Link href={path as Href}>{path}</Link> : <span>{path}</span>;
}

export function OneTimeNotice({
  notice,
  onClose,
}: {
  notice: OneTimeNoticeValue | null;
  onClose: () => void;
}) {
  if (notice === null) return null;
  if (notice.type === "scenario-reset") {
    const routes = notice.routes;
    return (
      <section className="one-time-notice one-time-notice--reset" role="status">
        <div className="one-time-notice__content">
          <strong>シナリオを初期化しました</strong>
          <dl className="definition-grid">
            <dt>シナリオ名</dt>
            <dd>{notice.scenarioName}</dd>
            <dt>初期セッション</dt>
            <dd>{notice.initialSessionLabel}</dd>
            <dt>推奨アカウント</dt>
            <dd>{notice.recommendedAccounts.join(" / ")}</dd>
            <dt>主要確認Route</dt>
            <dd>
              <ul>
                {routes.map((route, index) => (
                  <li key={`${route}-${index}`}>
                    {index === 0 ? "主要" : "確認"}: {renderRoute(route)}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        </div>
        <button type="button" className="button button--tertiary" onClick={onClose}>
          閉じる
        </button>
      </section>
    );
  }
  const adjusted = notice.presentation === "summary";
  return (
    <section
      className={"one-time-notice one-time-notice--" + notice.presentation}
      role={adjusted ? "alert" : "status"}
      aria-live={adjusted ? "assertive" : "polite"}
    >
      <div>
        <strong>{adjusted ? "カートを統合しました" : "カートを保存しました"}</strong>
        <p>
          {adjusted
            ? "ログイン前のカートを統合しました。数量を確認してください。"
            : "ログイン前のカートを購入手続きへ引き継ぎました。"}
        </p>
        {adjusted && (
          <p>
            集計: 追加 {notice.result.addedItemCount}件 / 調整あり {notice.result.adjustedItemCount}
            件（うち完全除外 {notice.result.fullyExcludedItemCount}件） / 追加数量{" "}
            {notice.result.addedQuantity}点 / 超過数量 {notice.result.overflowQuantity}点
          </p>
        )}
        {adjusted && (
          <ul>
            {notice.result.items.map((item) => (
              <li key={item.variantId}>
                <strong>{item.productName ?? "利用できない商品"}</strong>
                {item.optionValue !== null && <>（{item.optionValue}）</>}
                <span>
                  ：Guest {item.guestQuantity}点 / 既存 {item.previousUserQuantity}点 / 追加{" "}
                  {item.addedQuantity}点 / 超過 {item.overflowQuantity}点 / 最終{" "}
                  {item.finalQuantity}点
                </span>
                {item.excludedReason !== null && (
                  <span>（{excludedReasonLabel(item.excludedReason)}）</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="button button--tertiary" onClick={onClose}>
        閉じる
      </button>
    </section>
  );
}
