import type { CartMergeResult } from "@/application/contracts";
import { isPhaseOneScenario, type PhaseOneScenario } from "@/seeds/metadata";

export const ONE_TIME_NOTICE_STORAGE_KEY = "scenario-shop.one-time-notice";
export const CHECKOUT_NOTICE_STORAGE_PREFIX = "checkout:";

export type OneTimeNoticeTargetPath =
  | "/"
  | "/cart"
  | "/checkout/address"
  | "/checkout/payment"
  | "/checkout/confirm";

export interface CartMergeNotice {
  type: "cart-merge";
  presentation: "summary" | "success";
  targetPath: OneTimeNoticeTargetPath;
  result: CartMergeResult;
}

export interface ScenarioResetNotice {
  type: "scenario-reset";
  scenarioId: PhaseOneScenario;
  scenarioName: string;
  initialSessionLabel: string;
  recommendedAccounts: readonly string[];
  routes: readonly string[];
}

export type OneTimeNotice = CartMergeNotice | ScenarioResetNotice;
export type CheckoutNoticeKind = "resumed" | "replaced";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isCartMergeResult(value: unknown): value is CartMergeResult {
  if (value === null || typeof value !== "object") return false;
  const result = value as Partial<CartMergeResult>;
  if (!Array.isArray(result.items)) return false;
  const excludedReasons = [
    "NOT_FOUND",
    "UNPUBLISHED",
    "RANK_REQUIRED",
    "INACTIVE",
    "OUT_OF_STOCK",
  ] as const;
  return result.items.every((item) => {
    if (item === null || typeof item !== "object") return false;
    const candidate = item as Partial<CartMergeResult["items"][number]>;
    return (
      typeof candidate.variantId === "string" &&
      (typeof candidate.productName === "string" || candidate.productName === null) &&
      (typeof candidate.optionValue === "string" || candidate.optionValue === null) &&
      isNumber(candidate.guestQuantity) &&
      isNumber(candidate.previousUserQuantity) &&
      isNumber(candidate.addedQuantity) &&
      isNumber(candidate.overflowQuantity) &&
      isNumber(candidate.finalQuantity) &&
      (candidate.excludedReason === null ||
        (typeof candidate.excludedReason === "string" &&
          excludedReasons.includes(candidate.excludedReason as (typeof excludedReasons)[number])))
    );
  });
}

function isTargetPath(value: unknown): value is OneTimeNoticeTargetPath {
  return (
    value === "/" ||
    value === "/cart" ||
    value === "/checkout/address" ||
    value === "/checkout/payment" ||
    value === "/checkout/confirm"
  );
}

function isOneTimeNotice(value: unknown): value is OneTimeNotice {
  if (value === null || typeof value !== "object") return false;
  const notice = value as Partial<OneTimeNotice>;
  if (notice.type === "cart-merge") {
    return (
      (notice.presentation === "summary" || notice.presentation === "success") &&
      isTargetPath(notice.targetPath) &&
      isCartMergeResult(notice.result)
    );
  }
  if (notice.type === "scenario-reset") {
    return (
      typeof notice.scenarioId === "string" &&
      isPhaseOneScenario(notice.scenarioId) &&
      typeof notice.scenarioName === "string" &&
      typeof notice.initialSessionLabel === "string" &&
      Array.isArray(notice.recommendedAccounts) &&
      notice.recommendedAccounts.every((item) => typeof item === "string") &&
      Array.isArray(notice.routes) &&
      notice.routes.every((item) => typeof item === "string")
    );
  }
  return false;
}

export function readOneTimeNotice(): OneTimeNotice | null {
  const target = storage();
  if (target === null) return null;
  const raw = target.getItem(ONE_TIME_NOTICE_STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isOneTimeNotice(parsed)) {
      target.removeItem(ONE_TIME_NOTICE_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    target.removeItem(ONE_TIME_NOTICE_STORAGE_KEY);
    return null;
  }
}

export function writeOneTimeNotice(notice: OneTimeNotice): void {
  storage()?.setItem(ONE_TIME_NOTICE_STORAGE_KEY, JSON.stringify(notice));
}

export function consumeOneTimeNoticeForPath(pathname: string): OneTimeNotice | null {
  const notice = readOneTimeNotice();
  if (notice === null) return null;
  const canDisplay =
    notice.type === "cart-merge"
      ? notice.targetPath === pathname
      : pathname === "/" || pathname === "/admin";
  if (!canDisplay) return null;
  storage()?.removeItem(ONE_TIME_NOTICE_STORAGE_KEY);
  return notice;
}

export function clearOneTimeNoticeStorage(): void {
  storage()?.removeItem(ONE_TIME_NOTICE_STORAGE_KEY);
}

export function clearCheckoutNoticeHistory(): void {
  const target = storage();
  if (target === null) return;
  for (let index = target.length - 1; index >= 0; index -= 1) {
    const key = target.key(index);
    if (key?.startsWith(CHECKOUT_NOTICE_STORAGE_PREFIX)) target.removeItem(key);
  }
}

export function claimCheckoutNotice(sessionId: string, kind: CheckoutNoticeKind): boolean {
  const target = storage();
  if (target === null) return true;
  const key = CHECKOUT_NOTICE_STORAGE_PREFIX + sessionId + ":" + kind;
  if (target.getItem(key) !== null) return false;
  target.setItem(key, "1");
  return true;
}

export function cartMergeHasAdjustment(result: CartMergeResult): boolean {
  return result.items.some((item) => item.overflowQuantity > 0 || item.excludedReason !== null);
}

export function createCartMergeNotice(
  result: CartMergeResult | null,
  targetPath: OneTimeNoticeTargetPath,
): CartMergeNotice | null {
  if (result === null || result.items.length === 0) return null;
  const hasActivity = result.items.some(
    (item) => item.addedQuantity > 0 || item.overflowQuantity > 0 || item.excludedReason !== null,
  );
  if (!hasActivity) return null;
  const adjusted = cartMergeHasAdjustment(result);
  return {
    type: "cart-merge",
    presentation: adjusted ? "summary" : "success",
    targetPath: adjusted ? "/cart" : targetPath,
    result,
  };
}
