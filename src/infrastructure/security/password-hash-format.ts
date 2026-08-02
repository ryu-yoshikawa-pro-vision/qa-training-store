export const PBKDF2_ALGORITHM = "pbkdf2-sha256" as const;
export const PBKDF2_ITERATIONS = 210_000;
export const PBKDF2_SALT_BYTES = 16;
export const PBKDF2_HASH_BYTES = 32;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export interface ParsedPbkdf2Hash {
  salt: Uint8Array;
  expected: Uint8Array;
}

export function encodePbkdf2Hash(salt: Uint8Array, hash: Uint8Array): string {
  if (salt.length !== PBKDF2_SALT_BYTES || hash.length !== PBKDF2_HASH_BYTES) {
    throw new RangeError("Invalid PBKDF2 hash component length");
  }
  return `${PBKDF2_ALGORITHM}$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export function parsePbkdf2Hash(encodedHash: string): ParsedPbkdf2Hash | null {
  const [algorithm, iterations, encodedSalt, encodedExpected, extra] = encodedHash.split("$");
  if (
    algorithm !== PBKDF2_ALGORITHM ||
    iterations !== String(PBKDF2_ITERATIONS) ||
    encodedSalt === undefined ||
    encodedExpected === undefined ||
    extra !== undefined
  ) {
    return null;
  }
  try {
    const salt = base64ToBytes(encodedSalt);
    const expected = base64ToBytes(encodedExpected);
    if (salt.length !== PBKDF2_SALT_BYTES || expected.length !== PBKDF2_HASH_BYTES) return null;
    return { salt, expected };
  } catch {
    return null;
  }
}

export function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
