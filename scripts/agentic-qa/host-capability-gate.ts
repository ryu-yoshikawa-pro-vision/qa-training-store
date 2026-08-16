import fs from "node:fs";
import path from "node:path";

import {
  hostCapabilityReceiptSchema,
  parseJsonWithSchema,
  type HostCapabilityReceipt,
} from "./contracts";
import { readCanonicalJsonFile, writeCanonicalJsonFile } from "./canonical-json";
import { assertActualViewportMatchesVariant, getRuntimeVariant } from "./runtime-variant";

export type HostCapabilityGateResult = {
  status: "PASS" | "BLOCKED";
  receipt?: HostCapabilityReceipt;
  failures: string[];
};

export function validateHostCapabilityReceipt(value: unknown): HostCapabilityReceipt {
  const receipt = parseJsonWithSchema(
    value,
    hostCapabilityReceiptSchema,
    "host capability receipt",
  );
  assertActualViewportMatchesVariant(
    receipt.actual_browser_configuration,
    getRuntimeVariant(receipt.runtime_variant_id),
  );
  return receipt;
}

export function writeHostCapabilityReceipt(filePath: string, receipt: HostCapabilityReceipt): void {
  writeCanonicalJsonFile(filePath, validateHostCapabilityReceipt(receipt));
}

export function evaluateHostCapabilityGate(filePath: string): HostCapabilityGateResult {
  if (!fs.existsSync(filePath))
    return {
      status: "BLOCKED",
      failures: [
        `host capability receipt is missing: ${path.relative(process.cwd(), filePath).replace(/\\/g, "/")}`,
      ],
    };
  try {
    const receipt = validateHostCapabilityReceipt(readCanonicalJsonFile(filePath));
    return { status: "PASS", receipt, failures: [] };
  } catch (error) {
    return {
      status: "BLOCKED",
      failures: [error instanceof Error ? error.message : String(error)],
    };
  }
}
