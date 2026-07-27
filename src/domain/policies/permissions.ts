import type {
  AccountStatus,
  MembershipRank,
  ProductStatus,
  User,
  UserRole,
} from "@/domain/contracts";
import type { ProductViewer } from "@/application/contracts";

const RANK_LEVEL: Readonly<Record<MembershipRank, number>> = {
  regular: 0,
  gold: 1,
  platinum: 2,
};

export function rankSatisfies(actual: MembershipRank, required: MembershipRank | null): boolean {
  return required === null || RANK_LEVEL[actual] >= RANK_LEVEL[required];
}

export function canViewerSeeProduct(input: {
  viewer: ProductViewer;
  status: ProductStatus;
  requiredRank: MembershipRank | null;
}): boolean {
  if (input.status !== "published") {
    return false;
  }
  if (input.requiredRank === null) {
    return true;
  }
  return (
    input.viewer.kind === "customer" &&
    rankSatisfies(input.viewer.membershipRank, input.requiredRank)
  );
}

export function canUseCart(role: UserRole | "guest"): boolean {
  return role === "guest" || role === "customer";
}

export function canCheckout(role: UserRole, status: AccountStatus): boolean {
  return role === "customer" && status === "active";
}

export function canManageStore(role: UserRole): boolean {
  return role === "operator" || role === "admin";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

export function ownsResource(actorUserId: string, resourceUserId: string): boolean {
  return actorUserId === resourceUserId;
}

export function assertUserInvariant(user: Pick<User, "role" | "membershipRank">): void {
  if (user.role === "customer" && user.membershipRank === null) {
    throw new TypeError("Customer must have a membership rank");
  }
  if (user.role !== "customer" && user.membershipRank !== null) {
    throw new TypeError("Management roles must not have a membership rank");
  }
}
