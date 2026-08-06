import type { Clock } from "@/application/ports";
import { RuntimeClock } from "./clocks";
import { NATIVE_TEST_CLOCK_KEY, NativeKeyValueStore } from "@/infrastructure/session/native-stores";

export class NativePersistedClock implements Clock {
  private readonly runtime = new RuntimeClock();
  private initialized = false;

  constructor(private readonly storage = new NativeKeyValueStore()) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const value = await this.storage.get(NATIVE_TEST_CLOCK_KEY);
    this.runtime.setFixedTime(value);
    this.initialized = true;
  }

  now(): string {
    return this.runtime.now();
  }

  async setFixedTime(value: string | null): Promise<void> {
    this.runtime.setFixedTime(value);
    if (value === null) {
      await this.storage.remove(NATIVE_TEST_CLOCK_KEY);
    } else {
      await this.storage.set(NATIVE_TEST_CLOCK_KEY, value);
    }
  }

  getFixedTime(): string | null {
    return this.runtime.getFixedTime();
  }
}
