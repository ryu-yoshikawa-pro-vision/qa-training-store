import { pbkdf2, pbkdf2Sync } from "react-native-quick-crypto";
import { getRandomBytes } from "expo-crypto";
import type { PasswordHasher } from "@/application/ports";
import {
  constantTimeEqual,
  encodePbkdf2Hash,
  parsePbkdf2Hash,
  PBKDF2_HASH_BYTES,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_BYTES,
} from "./password-hash-format";

export const NATIVE_PBKDF2_ITERATIONS = PBKDF2_ITERATIONS;
export const NATIVE_PBKDF2_SALT_BYTES = PBKDF2_SALT_BYTES;
export const NATIVE_PBKDF2_HASH_BYTES = PBKDF2_HASH_BYTES;

function deriveSync(password: string, salt: Uint8Array): Uint8Array {
  const result = pbkdf2Sync(
    password,
    salt,
    NATIVE_PBKDF2_ITERATIONS,
    NATIVE_PBKDF2_HASH_BYTES,
    "sha256",
  );
  return result instanceof Uint8Array ? result : new Uint8Array(result);
}

function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    pbkdf2(
      password,
      salt,
      NATIVE_PBKDF2_ITERATIONS,
      NATIVE_PBKDF2_HASH_BYTES,
      "sha256",
      (error, derived) => {
        if (error !== null) {
          reject(error);
          return;
        }
        if (derived === undefined) {
          reject(new Error("Native PBKDF2 returned no derived key"));
          return;
        }
        resolve(derived instanceof Uint8Array ? derived : new Uint8Array(derived));
      },
    );
  });
}

export function parseNativePbkdf2Hash(encodedHash: string): {
  salt: Uint8Array;
  expected: Uint8Array;
} | null {
  return parsePbkdf2Hash(encodedHash);
}

export class NativePbkdf2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = getRandomBytes(NATIVE_PBKDF2_SALT_BYTES);
    const hash = await derive(password, salt);
    return encodePbkdf2Hash(salt, hash);
  }

  async hashWithSalt(password: string, salt: Uint8Array): Promise<string> {
    if (salt.length !== NATIVE_PBKDF2_SALT_BYTES)
      throw new RangeError("Invalid PBKDF2 salt length");
    return encodePbkdf2Hash(salt, deriveSync(password, salt));
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const parsed = parseNativePbkdf2Hash(encodedHash);
    if (parsed === null) return false;
    const actual = await derive(password, parsed.salt);
    return constantTimeEqual(actual, parsed.expected);
  }
}
