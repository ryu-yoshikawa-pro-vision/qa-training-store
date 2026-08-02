import { ApplicationError } from "@/application/errors";
import type { CurrentUserDto, ProductViewer } from "@/application/contracts";
import type { CurrentActorResolver, CurrentSessionStore } from "@/application/ports";
import type { User } from "@/domain/contracts";
import type { SessionRepository, UserRepository } from "@/domain/repositories";

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
