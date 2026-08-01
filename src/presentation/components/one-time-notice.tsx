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

export function OneTimeNotice({
  notice,
  onClose,
}: {
  notice: OneTimeNoticeValue | null;
  onClose: () => void;
}) {
  if (notice === null) return null;
  if (notice.type === "scenario-reset") {
    return (
      <section className="one-time-notice one-time-notice--reset" role="status">
        <div>
          <strong>シナリオを初期化しました</strong>
          <p>{notice.scenarioName}</p>
          <p>{notice.initialSessionLabel}</p>
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
