import type {
  AdminReviewDetailDto,
  AdminReviewListItem,
  BulkActionResult,
  BulkChangeReviewVisibilityRequest,
  ChangeAccountSuspensionRequest,
  ChangeMembershipRankRequest,
  ChangeOperatorAdminRoleRequest,
  CreateReviewRequest,
  DeleteReviewRequest,
  Page,
  ReviewEligibilityDto,
  ReviewResultDto,
  ReviewSearchQuery,
  UpdateReviewRequest,
  UserAdminDto,
  UserAdminListItem,
  UserSearchQuery,
} from "@/application/contracts";
import { ApplicationError, conflictError, validationError } from "@/application/errors";
import { SessionIdentityResolver } from "@/application/identity/session-identity-resolver";
import type { Clock, CurrentSessionStore, IdGenerator } from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import { deriveCustomerReviewState } from "@/application/use-cases/customer-review-state";
import type { ProductReviewSummary, Review, User } from "@/domain/contracts";
import { canTransitionAccount, canTransitionReview } from "@/domain/policies/state-transitions";
import { applyPublishedReviewDelta } from "@/domain/services/reviews";
import type {
  OrderRepository,
  ProductRepository,
  ReviewRepository,
  SessionRepository,
  UserRepository,
} from "@/domain/repositories";

interface Dependencies {
  users: UserRepository;
  sessions: SessionRepository;
  reviews: ReviewRepository;
  orders: OrderRepository;
  productRecords: ProductRepository;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  clock: Clock;
  idGenerator: IdGenerator;
}

export class CustomerReviewUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly reviews: ReviewRepository;

  constructor(private readonly dependencies: Dependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.users,
      dependencies.sessions,
      dependencies.currentSessionStore,
    );
    this.reviews = dependencies.reviews;
  }

  async getEligibility(orderItemId: string): Promise<ReviewEligibilityDto> {
    const actor = await this.requireCustomer();
    const item = await this.dependencies.orders.getItemById(orderItemId);
    if (item === null) return this.ineligible(orderItemId, "NOT_OWNER");
    const order = await this.dependencies.orders.getById(item.orderId);
    if (order === null || order.userId !== actor.id) {
      return this.ineligible(orderItemId, "NOT_OWNER");
    }
    const context = {
      productName: item.productNameSnapshot,
      variationName: item.variationNameSnapshot,
      optionValue: item.optionValueSnapshot,
      orderNumber: order.orderNumber,
      orderCreatedAt: order.createdAt,
    };
    const existing = await this.reviews.findByOrderItem(orderItemId);
    const reviewState = deriveCustomerReviewState(existing, order.status);
    if (reviewState === "DELETED" && existing !== null) {
      return {
        orderItemId,
        eligible: false,
        reason: "REVIEW_DELETED",
        existingReview: this.toResult(existing),
        ...context,
        reviewState,
      };
    }
    if (reviewState === "NOT_ELIGIBLE") {
      return {
        ...this.ineligible(orderItemId, "ORDER_NOT_DELIVERED"),
        ...context,
        reviewState,
      };
    }
    return {
      orderItemId,
      eligible: true,
      reason: null,
      existingReview: existing === null ? null : this.toResult(existing),
      ...context,
      reviewState,
    };
  }

  async create(request: CreateReviewRequest): Promise<ReviewResultDto> {
    const actor = await this.requireCustomer();
    const eligibility = await this.getEligibility(request.orderItemId);
    if (!eligibility.eligible || eligibility.existingReview !== null) {
      throw new ApplicationError({
        code: "NOT_ELIGIBLE",
        messageKey: "reviews.notEligible",
        retryable: false,
      });
    }
    const item = await this.dependencies.orders.getItemById(request.orderItemId);
    if (item === null) throw this.notFound();
    const now = await this.now();
    const values = this.validate(request);
    const result = await this.dependencies.transactionRunner.run(
      "review-change",
      async ({ reviews, reviewSummaries }) => {
        if ((await reviews.findByOrderItem(request.orderItemId)) !== null) {
          throw conflictError("reviews.alreadyExists");
        }
        const review: Review = {
          id: this.dependencies.idGenerator.generate(),
          orderItemId: request.orderItemId,
          productId: item.productId,
          userId: actor.id,
          rating: values.rating,
          title: values.title,
          body: values.body,
          status: "published",
          createdAt: now,
          updatedAt: now,
          version: 1,
        };
        const summary = await this.requireSummary(
          item.productId,
          reviewSummaries.getById.bind(reviewSummaries),
        );
        await reviews.create(review);
        await reviews.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          reviewId: review.id,
          fromStatus: null,
          toStatus: "published",
          actorUserId: actor.id,
          reasonText: null,
          createdAt: now,
        });
        await reviewSummaries.update(
          applyPublishedReviewDelta(summary, null, review.rating, now),
          summary.version,
        );
        return review;
      },
    );
    return this.toResult(result);
  }

  async update(request: UpdateReviewRequest): Promise<ReviewResultDto> {
    const actor = await this.requireCustomer();
    const current = await this.requireOwned(request.reviewId, actor.id);
    if (current.status === "deleted") throw this.notEligible();
    if (current.version !== request.expectedVersion) throw conflictError();
    const values = this.validate(request);
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "review-change",
      async ({ reviews, reviewSummaries }) => {
        const summary = await this.requireSummary(
          current.productId,
          reviewSummaries.getById.bind(reviewSummaries),
        );
        const review = await reviews.update(
          { ...current, ...values, updatedAt: now },
          request.expectedVersion,
        );
        if (current.status === "published" && current.rating !== values.rating) {
          await reviewSummaries.update(
            applyPublishedReviewDelta(summary, current.rating, values.rating, now),
            summary.version,
          );
        }
        return review;
      },
    );
    return this.toResult(updated);
  }

  async delete(request: DeleteReviewRequest): Promise<ReviewResultDto> {
    const actor = await this.requireCustomer();
    const current = await this.requireOwned(request.reviewId, actor.id);
    if (current.status === "deleted" || !canTransitionReview(current.status, "deleted")) {
      throw this.notEligible();
    }
    if (current.version !== request.expectedVersion) throw conflictError();
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "review-change",
      async ({ reviews, reviewSummaries }) => {
        const summary = await this.requireSummary(
          current.productId,
          reviewSummaries.getById.bind(reviewSummaries),
        );
        const review = await reviews.update(
          { ...current, status: "deleted", updatedAt: now },
          request.expectedVersion,
        );
        await reviews.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          reviewId: current.id,
          fromStatus: current.status,
          toStatus: "deleted",
          actorUserId: actor.id,
          reasonText: null,
          createdAt: now,
        });
        if (current.status === "published") {
          await reviewSummaries.update(
            applyPublishedReviewDelta(summary, current.rating, null, now),
            summary.version,
          );
        }
        return review;
      },
    );
    return this.toResult(updated);
  }

  private validate(input: { rating: number; title: string | null; body: string }) {
    if (![1, 2, 3, 4, 5].includes(input.rating)) {
      throw validationError("reviews.rating.invalid", { rating: "reviews.rating.invalid" });
    }
    const title = input.title?.trim() || null;
    const body = input.body.trim();
    if (title !== null && title.length > 120) {
      throw validationError("reviews.title.invalid", { title: "reviews.title.invalid" });
    }
    if (body.length === 0 || body.length > 1000) {
      throw validationError("reviews.body.invalid", { body: "reviews.body.invalid" });
    }
    return { rating: input.rating as 1 | 2 | 3 | 4 | 5, title, body };
  }

  private async requireOwned(reviewId: string, userId: string): Promise<Review> {
    const review = await this.reviews.getById(reviewId);
    if (review === null) throw this.notFound();
    if (review.userId !== userId) {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "errors.forbidden",
        retryable: false,
      });
    }
    return review;
  }

  private async requireCustomer() {
    const user = await this.identity.requireCurrentEntity();
    if (user.role !== "customer") {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "reviews.customerOnly",
        retryable: false,
      });
    }
    return user;
  }

  private async requireSummary(
    productId: string,
    getById: (id: string) => Promise<ProductReviewSummary | null>,
  ): Promise<ProductReviewSummary> {
    const summary = await getById(productId);
    if (summary === null) throw this.notFound();
    return summary;
  }

  private ineligible(
    orderItemId: string,
    reason: Exclude<ReviewEligibilityDto["reason"], null | "ALREADY_REVIEWED">,
  ): ReviewEligibilityDto {
    return {
      orderItemId,
      eligible: false,
      reason,
      existingReview: null,
      productName: null,
      variationName: null,
      optionValue: null,
      orderNumber: null,
      orderCreatedAt: null,
      reviewState: "NOT_ELIGIBLE",
    };
  }

  private toResult(review: Review): ReviewResultDto {
    return {
      reviewId: review.id,
      orderItemId: review.orderItemId,
      productId: review.productId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      version: review.version,
    };
  }

  private async now(): Promise<string> {
    return this.dependencies.clock.now();
  }

  private notFound(): ApplicationError {
    return new ApplicationError({
      code: "NOT_FOUND",
      messageKey: "errors.review.notFound",
      retryable: false,
    });
  }

  private notEligible(): ApplicationError {
    return new ApplicationError({
      code: "NOT_ELIGIBLE",
      messageKey: "reviews.notEligible",
      retryable: false,
    });
  }
}

export class AdminReviewUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly reviews: ReviewRepository;

  constructor(private readonly dependencies: Dependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.users,
      dependencies.sessions,
      dependencies.currentSessionStore,
    );
    this.reviews = dependencies.reviews;
  }

  async search(query: Partial<ReviewSearchQuery> = {}): Promise<Page<AdminReviewListItem>> {
    await this.requireStaff();
    return this.reviews.searchForAdmin({
      keyword: query.keyword?.trim() || null,
      statuses: query.statuses ?? [],
      ratings: query.ratings ?? [],
      productId: query.productId ?? null,
      sort: query.sort ?? "created_desc",
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async getDetail(reviewId: string): Promise<AdminReviewDetailDto> {
    await this.requireStaff();
    const review = await this.reviews.getById(reviewId);
    if (review === null) throw this.notFound();
    const [user, product] = await Promise.all([
      this.dependencies.users.getById(review.userId),
      this.dependencies.productRecords.getById(review.productId),
    ]);
    return {
      reviewId: review.id,
      orderItemId: review.orderItemId,
      productId: review.productId,
      productName: product?.name ?? "",
      userId: review.userId,
      userEmail: user?.email ?? "",
      displayName: user?.displayName ?? "",
      rating: review.rating,
      title: review.title,
      body: review.body,
      status: review.status,
      createdAt: review.createdAt,
      version: review.version,
      histories: await this.reviews.listStatusHistories(reviewId),
    };
  }

  async changeVisibility(input: {
    reviewId: string;
    targetStatus: "published" | "hidden";
    expectedVersion: number;
  }): Promise<AdminReviewDetailDto> {
    const actor = await this.requireStaff();
    const current = await this.reviews.getById(input.reviewId);
    if (current === null) throw this.notFound();
    if (current.version !== input.expectedVersion) throw conflictError();
    if (!canTransitionReview(current.status, input.targetStatus)) {
      throw new ApplicationError({
        code: "INVALID_STATE",
        messageKey: "reviews.status.invalid",
        retryable: false,
      });
    }
    const now = await this.now();
    await this.dependencies.transactionRunner.run(
      "review-change",
      async ({ reviews, reviewSummaries }) => {
        const summary = await reviewSummaries.getById(current.productId);
        if (summary === null) throw this.notFound();
        await reviews.update(
          { ...current, status: input.targetStatus, updatedAt: now },
          input.expectedVersion,
        );
        await reviews.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          reviewId: current.id,
          fromStatus: current.status,
          toStatus: input.targetStatus,
          actorUserId: actor.id,
          reasonText: null,
          createdAt: now,
        });
        await reviewSummaries.update(
          applyPublishedReviewDelta(
            summary,
            current.status === "published" ? current.rating : null,
            input.targetStatus === "published" ? current.rating : null,
            now,
          ),
          summary.version,
        );
      },
    );
    return this.getDetail(input.reviewId);
  }

  async bulkChangeVisibility(input: BulkChangeReviewVisibilityRequest): Promise<BulkActionResult> {
    await this.requireStaff();
    if (input.targetIds.length === 0 || input.targetIds.length > 50) {
      throw validationError("reviews.bulk.invalid");
    }
    const results = [];
    for (const reviewId of input.targetIds) {
      try {
        await this.changeVisibility({
          reviewId,
          targetStatus: input.targetStatus,
          expectedVersion: input.expectedVersions[reviewId] ?? -1,
        });
        results.push({ targetId: reviewId, success: true as const });
      } catch (error) {
        const application =
          error instanceof ApplicationError
            ? error
            : new ApplicationError({
                code: "UNKNOWN_ERROR",
                messageKey: "errors.unknown",
                retryable: true,
              });
        results.push({
          targetId: reviewId,
          success: false as const,
          error: {
            code: application.code,
            messageKey: application.messageKey,
            retryable: application.retryable,
          },
        });
      }
    }
    return {
      succeededCount: results.filter((item) => item.success).length,
      failedCount: results.filter((item) => !item.success).length,
      results,
    };
  }

  private async requireStaff() {
    const user = await this.identity.requireCurrentEntity();
    if (user.role !== "operator" && user.role !== "admin") {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "admin.staffOnly",
        retryable: false,
      });
    }
    return user;
  }

  private async now(): Promise<string> {
    return this.dependencies.clock.now();
  }

  private notFound(): ApplicationError {
    return new ApplicationError({
      code: "NOT_FOUND",
      messageKey: "errors.review.notFound",
      retryable: false,
    });
  }
}

export class AdminUserUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly users: UserRepository;

  constructor(private readonly dependencies: Dependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.users,
      dependencies.sessions,
      dependencies.currentSessionStore,
    );
    this.users = dependencies.users;
  }

  async search(query: Partial<UserSearchQuery> = {}): Promise<Page<UserAdminListItem>> {
    await this.requireAdmin();
    return this.users.search({
      keyword: query.keyword?.trim() || null,
      roles: query.roles ?? [],
      membershipRanks: query.membershipRanks ?? [],
      accountStatuses: query.accountStatuses ?? [],
      sort: query.sort ?? "created_desc",
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async getDetail(userId: string): Promise<UserAdminDto> {
    await this.requireAdmin();
    return this.toDto(await this.requireUser(userId));
  }

  async changeMembershipRank(input: ChangeMembershipRankRequest): Promise<UserAdminDto> {
    await this.requireAdmin();
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "change-user-access",
      async ({ users, checkouts }) => {
        const current = await this.requireTarget(users.getById(input.userId));
        this.assertVersion(current, input.expectedVersion);
        if (
          current.role !== "customer" ||
          current.accountStatus === "withdrawn" ||
          current.membershipRank === null
        ) {
          throw this.invalidRole();
        }
        await checkouts.abandonActiveByUser(current.id);
        return users.update(
          { ...current, membershipRank: input.rank, updatedAt: now },
          input.expectedVersion,
        );
      },
    );
    return this.toDto(updated);
  }

  async changeRole(input: ChangeOperatorAdminRoleRequest): Promise<UserAdminDto> {
    const actor = await this.requireAdmin();
    if (actor.id === input.userId) throw this.selfChange();
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "change-user-access",
      async ({ users, sessions }) => {
        const current = await this.requireTarget(users.getById(input.userId));
        this.assertVersion(current, input.expectedVersion);
        if (
          (current.role !== "operator" && current.role !== "admin") ||
          current.accountStatus === "withdrawn"
        ) {
          throw this.invalidRole();
        }
        if (
          current.role === "admin" &&
          input.role === "operator" &&
          (await users.countActiveAdmins()) <= 1
        ) {
          throw this.lastAdmin();
        }
        const result = await users.update(
          { ...current, role: input.role, membershipRank: null, updatedAt: now },
          input.expectedVersion,
        );
        await sessions.deleteByUserId(current.id);
        return result;
      },
    );
    return this.toDto(updated);
  }

  async changeSuspension(input: ChangeAccountSuspensionRequest): Promise<UserAdminDto> {
    const actor = await this.requireAdmin();
    if (actor.id === input.userId && input.accountStatus === "suspended") {
      throw this.selfChange();
    }
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "change-user-access",
      async ({ users, sessions, checkouts }) => {
        const current = await this.requireTarget(users.getById(input.userId));
        this.assertVersion(current, input.expectedVersion);
        if (
          current.accountStatus === "withdrawn" ||
          !canTransitionAccount(current.accountStatus, input.accountStatus)
        ) {
          throw new ApplicationError({
            code: "INVALID_STATE",
            messageKey: "users.status.invalid",
            retryable: false,
          });
        }
        if (
          current.role === "admin" &&
          input.accountStatus === "suspended" &&
          (await users.countActiveAdmins()) <= 1
        ) {
          throw this.lastAdmin();
        }
        const result = await users.update(
          { ...current, accountStatus: input.accountStatus, updatedAt: now },
          input.expectedVersion,
        );
        await sessions.deleteByUserId(current.id);
        if (current.role === "customer" && input.accountStatus === "suspended") {
          await checkouts.abandonActiveByUser(current.id);
        }
        return result;
      },
    );
    return this.toDto(updated);
  }

  private async requireAdmin() {
    const user = await this.identity.requireCurrentEntity();
    if (user.role !== "admin") {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "admin.adminOnly",
        retryable: false,
      });
    }
    return user;
  }

  private async requireUser(userId: string): Promise<User> {
    return this.requireTarget(this.users.getById(userId));
  }

  private async requireTarget(value: Promise<User | null>): Promise<User> {
    const user = await value;
    if (user === null) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        messageKey: "errors.user.notFound",
        retryable: false,
      });
    }
    return user;
  }

  private assertVersion(user: User, expected: number) {
    if (user.version !== expected) throw conflictError();
  }

  private toDto(user: User): UserAdminDto {
    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      membershipRank: user.membershipRank,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      version: user.version,
    };
  }

  private async now(): Promise<string> {
    return this.dependencies.clock.now();
  }

  private invalidRole(): ApplicationError {
    return new ApplicationError({
      code: "INVALID_ROLE",
      messageKey: "users.role.invalid",
      retryable: false,
    });
  }

  private selfChange(): ApplicationError {
    return new ApplicationError({
      code: "SELF_CHANGE_FORBIDDEN",
      messageKey: "users.selfChange",
      retryable: false,
    });
  }

  private lastAdmin(): ApplicationError {
    return new ApplicationError({
      code: "LAST_ADMIN_PROTECTED",
      messageKey: "users.lastAdmin",
      retryable: false,
    });
  }
}
