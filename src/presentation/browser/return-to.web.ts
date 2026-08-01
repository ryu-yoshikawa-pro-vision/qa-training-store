import type { UserRole } from "@/domain/contracts";

export const CUSTOMER_RETURN_PATHS = [
  "/cart",
  "/checkout/address",
  "/checkout/payment",
  "/checkout/confirm",
] as const;

export type CustomerReturnPath = (typeof CUSTOMER_RETURN_PATHS)[number];
export type LoginDestination = "/" | "/admin" | CustomerReturnPath;
export type CustomerLoginDestination = "/" | CustomerReturnPath;

const customerReturnPathSet = new Set<string>(CUSTOMER_RETURN_PATHS);

function decodeReturnPath(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseCustomerReturnPath(
  value: string | string[] | undefined,
): CustomerReturnPath | null {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) {
    return null;
  }
  const decoded = decodeReturnPath(value);
  if (
    decoded === null ||
    decoded.includes("\\") ||
    decoded.startsWith("//") ||
    !decoded.startsWith("/") ||
    decoded.includes("?") ||
    decoded.includes("#") ||
    !customerReturnPathSet.has(decoded)
  ) {
    return null;
  }
  return decoded as CustomerReturnPath;
}

export function buildLoginHref(pathname: string): string {
  const returnPath = parseCustomerReturnPath(pathname);
  return returnPath === null ? "/login" : "/login?returnTo=" + encodeURIComponent(returnPath);
}

export function defaultLoginDestination(role: UserRole): "/" | "/admin" {
  return role === "customer" ? "/" : "/admin";
}

export async function resolveCustomerLoginDestination(
  requested: string | string[] | undefined,
  canAccessCheckoutStep: (step: "payment" | "confirm") => Promise<boolean>,
): Promise<CustomerLoginDestination> {
  const path = parseCustomerReturnPath(requested);
  if (path === null || path === "/cart") return path ?? "/";
  if (path === "/checkout/address") return path;
  return (await canAccessCheckoutStep(path === "/checkout/payment" ? "payment" : "confirm"))
    ? path
    : "/checkout/address";
}
