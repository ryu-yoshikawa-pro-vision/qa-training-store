import type { ChargeInput, ChargeResult } from "@/application/contracts";
import type { PaymentGateway } from "@/application/ports";

export class MockPaymentGateway implements PaymentGateway {
  private delayMilliseconds: number;
  private readonly completedAttempts = new Map<string, ChargeResult>();
  private readonly delayProvider: (() => Promise<number>) | null;

  constructor(delayMilliseconds: number | (() => Promise<number>) = 500) {
    this.delayMilliseconds = typeof delayMilliseconds === "number" ? delayMilliseconds : 0;
    this.delayProvider = typeof delayMilliseconds === "function" ? delayMilliseconds : null;
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const cached = this.completedAttempts.get(input.gatewayIdempotencyKey);
    if (cached !== undefined) {
      return cached;
    }
    const delayMilliseconds =
      this.delayProvider === null ? this.delayMilliseconds : await this.delayProvider();
    if (delayMilliseconds > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delayMilliseconds);
      });
    }
    const result: ChargeResult =
      input.methodCode === "TEST-SUCCESS"
        ? { status: "succeeded" }
        : {
            status: "failed",
            errorCode:
              input.methodCode === "TEST-DECLINED"
                ? "DECLINED"
                : input.methodCode === "TEST-INSUFFICIENT"
                  ? "INSUFFICIENT"
                  : "AUTH_FAILED",
          };
    this.completedAttempts.set(input.gatewayIdempotencyKey, result);
    return result;
  }

  setDelay(milliseconds: number): void {
    if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 10_000) {
      throw new RangeError("Payment delay must be an integer between 0 and 10000");
    }
    this.delayMilliseconds = milliseconds;
  }

  getDelay(): number {
    return this.delayMilliseconds;
  }
}
