import type { Clock } from "@/application/ports";
import type { IsoDateTime } from "@/domain/contracts";

function assertIsoDateTime(value: IsoDateTime | null): void {
  if (value !== null && Number.isNaN(new Date(value).valueOf())) {
    throw new TypeError("Invalid ISO date time");
  }
}

export interface ControllableClock extends Clock {
  setFixedTime(iso: IsoDateTime | null): void;
  getFixedTime(): IsoDateTime | null;
}

export class RuntimeClock implements ControllableClock {
  private fixedTime: IsoDateTime | null;

  constructor(initialTime: IsoDateTime | null = null) {
    assertIsoDateTime(initialTime);
    this.fixedTime = initialTime;
  }

  now(): IsoDateTime {
    return this.fixedTime ?? new Date().toISOString();
  }

  setFixedTime(iso: IsoDateTime | null): void {
    assertIsoDateTime(iso);
    this.fixedTime = iso;
  }

  getFixedTime(): IsoDateTime | null {
    return this.fixedTime;
  }
}

export class SystemClock implements Clock {
  now(): IsoDateTime {
    return new Date().toISOString();
  }
}

export class TestClock extends RuntimeClock {
  set(iso: IsoDateTime | null): void {
    this.setFixedTime(iso);
  }
}
