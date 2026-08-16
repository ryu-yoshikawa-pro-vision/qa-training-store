import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { compareCodeUnits } from "./contracts";

type CanonicalJsonPrimitive = string | number | boolean | null;
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function assertFiniteNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) throw new Error(`Canonical JSON number is not finite at ${path}`);
}

function canonicalize(value: unknown, path = "$", seen = new Set<object>()): CanonicalJsonValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    assertFiniteNumber(value, path);
    return value;
  }
  if (typeof value !== "object") throw new Error(`Unsupported Canonical JSON value at ${path}`);
  if (seen.has(value)) throw new Error(`Cyclic Canonical JSON value at ${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value))
      return value.map((item, index) => canonicalize(item, `${path}[${index}]`, seen));

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      throw new Error(`Canonical JSON requires a plain object at ${path}`);

    const record = value as Record<string, unknown>;
    const result: Record<string, CanonicalJsonValue> = {};
    for (const key of Object.keys(record).sort(compareCodeUnits)) {
      const item = record[key];
      if (item === undefined) throw new Error(`Undefined Canonical JSON value at ${path}.${key}`);
      result[key] = canonicalize(item, `${path}.${key}`, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

/**
 * Repository-wide Canonical JSON serializer for identity-bearing artifacts.
 * Object keys are recursively code-unit sorted; arrays retain contract order.
 */
export function canonicalJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value), null, 2);
  if (serialized === undefined) throw new Error("Canonical JSON serialization produced no value");
  return `${serialized}\n`;
}

export function sha256Bytes(value: string | Buffer): `sha256:${string}` {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

export function sha256Canonical(value: unknown): `sha256:${string}` {
  return sha256Bytes(canonicalJson(value));
}

export function sha256File(filePath: string): `sha256:${string}` {
  return sha256Bytes(fs.readFileSync(filePath));
}

export function readCanonicalJsonFile<T = unknown>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  assertNoDuplicateJsonKeys(raw);
  const parsed = JSON.parse(raw) as T;
  if (canonicalJson(parsed) !== raw)
    throw new Error(`JSON is not in repository canonical form: ${filePath}`);
  return parsed;
}

class JsonKeyScanner {
  private index = 0;

  public constructor(private readonly source: string) {}

  public scan(): void {
    this.skipWhitespace();
    this.value();
    this.skipWhitespace();
    if (this.index !== this.source.length) throw new Error("JSON contains trailing data");
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.index] ?? "")) this.index += 1;
  }

  private value(): void {
    this.skipWhitespace();
    const current = this.source[this.index];
    if (current === "{") return this.object();
    if (current === "[") return this.array();
    if (current === '"') {
      this.string();
      return;
    }
    if (this.source.startsWith("true", this.index)) {
      this.index += 4;
      return;
    }
    if (this.source.startsWith("false", this.index)) {
      this.index += 5;
      return;
    }
    if (this.source.startsWith("null", this.index)) {
      this.index += 4;
      return;
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      this.source.slice(this.index),
    )?.[0];
    if (number === undefined) throw new Error(`Invalid JSON value at offset ${this.index}`);
    this.index += number.length;
  }

  private string(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const current = this.source[this.index];
      if (current === "\\") {
        this.index += 2;
        continue;
      }
      this.index += 1;
      if (current === '"') {
        const parsed = JSON.parse(this.source.slice(start, this.index)) as unknown;
        if (typeof parsed !== "string") throw new Error(`Invalid JSON string at offset ${start}`);
        return parsed;
      }
    }
    throw new Error(`Unterminated JSON string at offset ${start}`);
  }

  private object(): void {
    this.index += 1;
    const keys = new Set<string>();
    this.skipWhitespace();
    if (this.source[this.index] === "}") {
      this.index += 1;
      return;
    }
    while (true) {
      this.skipWhitespace();
      if (this.source[this.index] !== '"')
        throw new Error(`JSON object key expected at offset ${this.index}`);
      const key = this.string();
      if (keys.has(key)) throw new Error(`Duplicate JSON object key: ${key}`);
      keys.add(key);
      this.skipWhitespace();
      if (this.source[this.index] !== ":")
        throw new Error(`JSON colon expected at offset ${this.index}`);
      this.index += 1;
      this.value();
      this.skipWhitespace();
      const delimiter = this.source[this.index];
      if (delimiter === "}") {
        this.index += 1;
        return;
      }
      if (delimiter !== ",")
        throw new Error(`JSON object delimiter expected at offset ${this.index}`);
      this.index += 1;
    }
  }

  private array(): void {
    this.index += 1;
    this.skipWhitespace();
    if (this.source[this.index] === "]") {
      this.index += 1;
      return;
    }
    while (true) {
      this.value();
      this.skipWhitespace();
      const delimiter = this.source[this.index];
      if (delimiter === "]") {
        this.index += 1;
        return;
      }
      if (delimiter !== ",")
        throw new Error(`JSON array delimiter expected at offset ${this.index}`);
      this.index += 1;
    }
  }
}

export function assertNoDuplicateJsonKeys(raw: string): void {
  new JsonKeyScanner(raw).scan();
}

export function writeCanonicalJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, canonicalJson(value), "utf8");
}

export function sortCodeUnitStrings(values: readonly string[]): string[] {
  return [...values].sort(compareCodeUnits);
}
