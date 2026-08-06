import type { PasswordHasher } from "@/application/ports";
import {
  constantTimeEqual,
  encodePbkdf2Hash,
  parsePbkdf2Hash,
  PBKDF2_HASH_BYTES,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_BYTES,
} from "./password-hash-format";

export { PBKDF2_HASH_BYTES, PBKDF2_ITERATIONS, PBKDF2_SALT_BYTES } from "./password-hash-format";

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const saltBuffer = Uint8Array.from(salt).buffer;
  const material = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    PBKDF2_HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export class WebPbkdf2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
    return this.hashWithSalt(password, salt);
  }

  async hashWithSalt(password: string, salt: Uint8Array): Promise<string> {
    if (salt.length !== PBKDF2_SALT_BYTES) {
      throw new RangeError(`PBKDF2 salt must be ${PBKDF2_SALT_BYTES} bytes`);
    }
    const hash = await derive(password, salt);
    return encodePbkdf2Hash(salt, hash);
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    try {
      const parsed = parsePbkdf2Hash(encodedHash);
      if (parsed === null) return false;
      const actual = await derive(password, parsed.salt);
      return constantTimeEqual(actual, parsed.expected);
    } catch {
      return false;
    }
  }
}
