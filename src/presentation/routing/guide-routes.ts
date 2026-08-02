export const PRESENTATION_ROUTE_LINKS = [
  "/",
  "/products",
  "/search",
  "/cart",
  "/login",
  "/checkout/address",
  "/checkout/payment",
  "/checkout/confirm",
  "/orders",
  "/account/profile",
  "/account/addresses",
  "/admin",
  "/admin/products",
  "/admin/inventories",
  "/admin/orders",
  "/admin/reviews",
  "/admin/users",
  "/guide",
] as const;

const presentationRouteLinkSet = new Set<string>(PRESENTATION_ROUTE_LINKS);

export function isPresentationRouteLink(path: string): boolean {
  return presentationRouteLinkSet.has(path);
}
