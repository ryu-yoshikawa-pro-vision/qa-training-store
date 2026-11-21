import { ApplicationError } from "@/application/errors";
import type { CurrentUserDto, ProductViewer } from "@/application/contracts";
import type { CurrentActorResolver, CurrentSessionStore } from "@/application/ports";
import type { User } from "@/domain/contracts";
import type { SessionRepository, UserRepository } from "@/application/repositories";

export function toCurrentUserDto(user: User): CurrentUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    role: user.role,
    membershipRank: user.membershipRank,
    accountStatus: user.accountStatus,
    actionVersion: user.version,
  };
}

/** Recheck an actor's current access in the same transaction as a privileged write. */
export async function assertActorStillAuthorized(
  actor: User,
  sessionId: string | null,
  requiredRole: "admin" | "staff",
  users: UserRepository,
  sessions: SessionRepository,
): Promise<void> {
  const session = sessionId === null ? null : await sessions.get(sessionId);
  if (session?.userId !== actor.id) {
    throw new ApplicationError({
      code: "AUTHENTICATION_REQUIRED",
      messageKey: "auth.required",
      retryable: false,
    });
  }
  const current = await users.getById(actor.id);
  if (current === null) {
    throw new ApplicationError({
      code: "AUTHENTICATION_REQUIRED",
      messageKey: "auth.required",
      retryable: false,
    });
  }
  if (current.accountStatus !== "active") {
    const suspended = current.accountStatus === "suspended";
    throw new ApplicationError({
      code: suspended ? "ACCOUNT_SUSPENDED" : "ACCOUNT_WITHDRAWN",
      messageKey: suspended ? "auth.account.suspended" : "auth.account.withdrawn",
      retryable: false,
    });
  }
  const permitted =
    requiredRole === "admin"
      ? current.role === "admin"
      : current.role === "admin" || current.role === "operator";
  if (!permitted) {
    throw new ApplicationError({
      code: "PERMISSION_DENIED",
      messageKey: requiredRole === "admin" ? "admin.adminOnly" : "admin.staffOnly",
      retryable: false,
    });
  }
}

export class SessionIdentityResolver implements CurrentActorResolver {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly sessionStore: CurrentSessionStore,
  ) {}

  async getCurrentEntity(): Promise<User | null> {
    const sessionId = await this.sessionStore.getSessionId();
    if (sessionId === null) {
      return null;
    }
    const session = await this.sessions.get(sessionId);
    const user = session === null ? null : await this.users.getById(session.userId);
    if (session === null || user === null) {
      await this.sessionStore.clear();
      return null;
    }
    return user;
  }

  async requireCurrentEntity(): Promise<User> {
    const user = await this.getCurrentEntity();
    if (user === null) {
      throw new ApplicationError({
        code: "AUTHENTICATION_REQUIRED",
        messageKey: "auth.required",
        retryable: false,
      });
    }
    if (user.accountStatus !== "active") {
      throw new ApplicationError({
        code: user.accountStatus === "suspended" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_WITHDRAWN",
        messageKey:
          user.accountStatus === "suspended" ? "auth.account.suspended" : "auth.account.withdrawn",
        retryable: false,
      });
    }
    return user;
  }

  async requireCurrentUser(): Promise<CurrentUserDto> {
    return toCurrentUserDto(await this.requireCurrentEntity());
  }

  async getViewer(): Promise<ProductViewer> {
    const user = await this.getCurrentEntity();
    if (
      user?.role === "customer" &&
      user.accountStatus === "active" &&
      user.membershipRank !== null
    ) {
      return {
        kind: "customer",
        userId: user.id,
        membershipRank: user.membershipRank,
      };
    }
    return { kind: "guest" };
  }
}
