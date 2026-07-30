import type { PasswordHasher } from "@/application/ports";

export const PBKDF2_ITERATIONS = 210_000;
export const PBKDF2_SALT_BYTES = 16;
export const PBKDF2_HASH_BYTES = 32;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

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

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
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
    return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const [algorithm, iterations, encodedSalt, encodedExpected, extra] = encodedHash.split("$");
    if (
      algorithm !== "pbkdf2-sha256" ||
      iterations !== String(PBKDF2_ITERATIONS) ||
      encodedSalt === undefined ||
      encodedExpected === undefined ||
      extra !== undefined
    ) {
      return false;
    }
    try {
      const salt = base64ToBytes(encodedSalt);
      const expected = base64ToBytes(encodedExpected);
      if (salt.length !== PBKDF2_SALT_BYTES || expected.length !== PBKDF2_HASH_BYTES) {
        return false;
      }
      const actual = await derive(password, salt);
      return constantTimeEqual(actual, expected);
    } catch {
      return false;
    }
  }
}
