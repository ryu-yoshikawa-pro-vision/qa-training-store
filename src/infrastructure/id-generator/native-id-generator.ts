import { randomUUID } from "expo-crypto";
import type { IdGenerator } from "@/application/ports";

export class NativeIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
