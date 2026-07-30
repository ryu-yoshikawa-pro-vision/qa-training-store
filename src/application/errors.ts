import type { ApplicationErrorCode, ApplicationErrorShape } from "./contracts";

export class ApplicationError extends Error implements ApplicationErrorShape {
  readonly code: ApplicationErrorCode;
  readonly messageKey: string;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;

  constructor(input: ApplicationErrorShape) {
    super(input.messageKey);
    this.name = "ApplicationError";
    this.code = input.code;
    this.messageKey = input.messageKey;
    this.retryable = input.retryable;
    if (input.fieldErrors !== undefined) {
      this.fieldErrors = input.fieldErrors;
    }
  }
}

export function validationError(
  messageKey: string,
  fieldErrors?: Record<string, string>,
): ApplicationError {
  return new ApplicationError({
    code: "VALIDATION",
    messageKey,
    retryable: false,
    ...(fieldErrors === undefined ? {} : { fieldErrors }),
  });
}

export function conflictError(messageKey = "errors.conflict"): ApplicationError {
  return new ApplicationError({
    code: "CONFLICT",
    messageKey,
    retryable: true,
  });
}

export function toApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }
  return new ApplicationError({
    code: "UNKNOWN_ERROR",
    messageKey: "errors.unknown",
    retryable: true,
  });
}
