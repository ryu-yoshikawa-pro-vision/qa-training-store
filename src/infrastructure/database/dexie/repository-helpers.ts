import { ApplicationError, conflictError } from "@/application/errors";
import type { Page, PageNumber, PageSize } from "@/application/contracts";

export function assertExpectedVersion(actual: number, expected: number): void {
  if (!Number.isInteger(expected) || actual !== expected) {
    throw conflictError();
  }
}

export function pageItems<T>(items: T[], page: PageNumber, pageSize: PageSize): Page<T> {
  if (!Number.isInteger(page) || page < 1) {
    throw new ApplicationError({
      code: "VALIDATION",
      messageKey: "errors.page.invalid",
      fieldErrors: { page: "validation.page" },
      retryable: false,
    });
  }
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}

export function requireEntity<T>(entity: T | undefined | null, messageKey: string): T {
  if (entity === undefined || entity === null) {
    throw new ApplicationError({
      code: "NOT_FOUND",
      messageKey,
      retryable: false,
    });
  }
  return entity;
}
