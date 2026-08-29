import {
  INPUT_LIMITS,
  type CurrentUserDto,
  type LoginRequest,
  type LoginResult,
  type RegisterUserRequest,
} from "@/application/contracts";
import { ApplicationError, validationError } from "@/application/errors";
import type {
  Clock,
  CurrentSessionStore,
  EmailNormalizer,
  GuestIdentityStore,
  IdGenerator,
  PasswordHasher,
} from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import {
  SessionIdentityResolver,
  toCurrentUserDto,
} from "@/application/identity/session-identity-resolver";
import type { User } from "@/domain/contracts";
import type { SessionRepository, UserRepository } from "@/domain/repositories";

interface AuthUseCaseDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  guestIdentityStore: GuestIdentityStore;
  emailNormalizer: EmailNormalizer;
  passwordHasher: PasswordHasher;
  clock: Clock;
  idGenerator: IdGenerator;
}

export class AuthUseCases {
  private readonly users: UserRepository;
  private readonly sessions: SessionRepository;
  private readonly identity: SessionIdentityResolver;

  constructor(private readonly dependencies: AuthUseCaseDependencies) {
    this.users = dependencies.users;
    this.sessions = dependencies.sessions;
    this.identity = new SessionIdentityResolver(
      dependencies.users,
      dependencies.sessions,
      dependencies.currentSessionStore,
    );
  }

  async login(request: LoginRequest): Promise<LoginResult> {
    const email = this.dependencies.emailNormalizer.normalize(request.email);
    const user = await this.users.findByEmail(email);
    if (
      user === null ||
      !(await this.dependencies.passwordHasher.verify(request.password, user.passwordHash))
    ) {
      throw new ApplicationError({
        code: "AUTHENTICATION_FAILED",
        messageKey: "auth.credentials.invalid",
        retryable: false,
      });
    }
    this.assertLoginAllowed(user);
    const now = this.dependencies.clock.now();
    const sessionId = this.dependencies.idGenerator.generate();
    const guestId =
      user.role === "customer"
        ? await this.dependencies.guestIdentityStore.getOrCreateGuestId()
        : null;
    await this.setSessionPointerBeforeTransaction(sessionId);
    try {
      const result = await this.dependencies.transactionRunner.run(
        "login-and-merge-cart",
        async ({ users, sessions, carts }) => {
          const current = await users.findByEmail(email);
          if (current === null || current.id !== user.id) {
            throw this.invalidCredentials();
          }
          this.assertLoginAllowed(current);
          let cartMerge = null;
          if (current.role === "customer" && guestId !== null) {
            const activeCart = await carts.getActiveByUser(current.id);
            cartMerge = await carts.mergeGuestIntoUser({
              guestId,
              userId: current.id,
              newCartId: activeCart?.id ?? this.dependencies.idGenerator.generate(),
              now,
            });
          }
          await sessions.create({
            id: sessionId,
            userId: current.id,
            createdAt: now,
          });
          return {
            sessionId,
            user: toCurrentUserDto(current),
            cartMerge,
          };
        },
      );
      return result;
    } catch (cause) {
      await this.dependencies.currentSessionStore.clear();
      if (cause instanceof ApplicationError) {
        throw cause;
      }
      throw new ApplicationError({
        code: "LOGIN_TRANSACTION_FAILED",
        messageKey: "auth.login.transactionFailed",
        retryable: true,
      });
    }
  }

  async register(request: RegisterUserRequest): Promise<LoginResult> {
    const email = this.dependencies.emailNormalizer.normalize(request.email);
    this.validateRegistration(request, email);
    if ((await this.users.findByEmail(email)) !== null) {
      throw new ApplicationError({
        code: "EMAIL_ALREADY_EXISTS",
        messageKey: "auth.email.exists",
        retryable: false,
      });
    }
    const [passwordHash, guestId] = await Promise.all([
      this.dependencies.passwordHasher.hash(request.password),
      this.dependencies.guestIdentityStore.getOrCreateGuestId(),
    ]);
    const now = this.dependencies.clock.now();
    const userId = this.dependencies.idGenerator.generate();
    const sessionId = this.dependencies.idGenerator.generate();
    await this.setSessionPointerBeforeTransaction(sessionId);
    try {
      return await this.dependencies.transactionRunner.run(
        "register-and-merge-cart",
        async ({ users, sessions, carts }) => {
          if ((await users.findByEmail(email)) !== null) {
            throw new ApplicationError({
              code: "EMAIL_ALREADY_EXISTS",
              messageKey: "auth.email.exists",
              retryable: false,
            });
          }
          const user: User = {
            id: userId,
            email,
            passwordHash,
            displayName: request.displayName.trim(),
            phone: null,
            role: "customer",
            membershipRank: "regular",
            accountStatus: "active",
            createdAt: now,
            updatedAt: now,
            version: 1,
          };
          await users.create(user);
          const cartMerge = await carts.mergeGuestIntoUser({
            guestId,
            userId,
            newCartId: this.dependencies.idGenerator.generate(),
            now,
          });
          await sessions.create({
            id: sessionId,
            userId,
            createdAt: now,
          });
          return {
            sessionId,
            user: toCurrentUserDto(user),
            cartMerge,
          };
        },
      );
    } catch (cause) {
      await this.dependencies.currentSessionStore.clear();
      if (cause instanceof ApplicationError) {
        throw cause;
      }
      throw new ApplicationError({
        code: "LOGIN_TRANSACTION_FAILED",
        messageKey: "auth.register.transactionFailed",
        retryable: true,
      });
    }
  }

  async logout(): Promise<void> {
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    if (sessionId !== null) {
      await this.sessions.delete(sessionId);
    }
    await this.dependencies.currentSessionStore.clear();
  }

  async getCurrentUser(): Promise<CurrentUserDto | null> {
    const user = await this.identity.getCurrentEntity();
    return user === null ? null : toCurrentUserDto(user);
  }

  private assertLoginAllowed(user: User): void {
    if (user.accountStatus === "suspended") {
      throw new ApplicationError({
        code: "ACCOUNT_SUSPENDED",
        messageKey: "auth.account.suspended",
        retryable: false,
      });
    }
    if (user.accountStatus === "withdrawn") {
      throw new ApplicationError({
        code: "ACCOUNT_WITHDRAWN",
        messageKey: "auth.account.withdrawn",
        retryable: false,
      });
    }
  }

  private validateRegistration(request: RegisterUserRequest, normalizedEmail: string): void {
    const fieldErrors: Record<string, string> = {};
    if (
      normalizedEmail.length > INPUT_LIMITS.email ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)
    ) {
      fieldErrors.email = "validation.email";
    }
    if (
      request.password.length < INPUT_LIMITS.passwordMin ||
      request.password.length > INPUT_LIMITS.passwordMax
    ) {
      fieldErrors.password = "validation.password.length";
    }
    if (
      request.displayName.trim().length === 0 ||
      request.displayName.trim().length > INPUT_LIMITS.displayName
    ) {
      fieldErrors.displayName = "validation.displayName";
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw validationError("validation.form", fieldErrors);
    }
  }

  private async setSessionPointerBeforeTransaction(sessionId: string): Promise<void> {
    try {
      await this.dependencies.currentSessionStore.setSessionId(sessionId);
    } catch {
      throw new ApplicationError({
        code: "STORAGE_WRITE_FAILED",
        messageKey: "auth.sessionPointer.failed",
        retryable: true,
      });
    }
  }

  private invalidCredentials(): ApplicationError {
    return new ApplicationError({
      code: "AUTHENTICATION_FAILED",
      messageKey: "auth.credentials.invalid",
      retryable: false,
    });
  }
}
