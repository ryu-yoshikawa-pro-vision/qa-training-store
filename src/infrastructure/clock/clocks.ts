import type { Clock } from "@/application/ports";
import type { IsoDateTime } from "@/domain/contracts";

export class SystemClock implements Clock {
  now(): IsoDateTime {
    return new Date().toISOString();
  }
}

export class TestClock implements Clock {
  private fixedTime: IsoDateTime | null;

  constructor(initialTime: IsoDateTime | null = null) {
    this.fixedTime = initialTime;
  }

  now(): IsoDateTime {
    return this.fixedTime ?? new Date().toISOString();
  }

  set(iso: IsoDateTime | null): void {
    if (iso !== null && Number.isNaN(new Date(iso).valueOf())) {
      throw new TypeError("Invalid ISO date time");
    }
    this.fixedTime = iso;
  }

  getFixedTime(): IsoDateTime | null {
    return this.fixedTime;
  }
}
