import { pbkdf2Sync as mockPbkdf2Sync, randomBytes as mockRandomBytes } from "node:crypto";
import { SEED_PASSWORD_HASHES } from "@/seeds/password-hashes";

jest.mock("react-native-quick-crypto", () => ({
  pbkdf2Sync: (
    password: string,
    salt: Uint8Array,
    iterations: number,
    keyLength: number,
    digest: string,
  ) => new Uint8Array(mockPbkdf2Sync(password, Buffer.from(salt), iterations, keyLength, digest)),
  pbkdf2: (
    password: string,
    salt: Uint8Array,
    iterations: number,
    keyLength: number,
    digest: string,
    callback: (error: Error | null, derived?: Uint8Array) => void,
  ) =>
    callback(
      null,
      new Uint8Array(mockPbkdf2Sync(password, Buffer.from(salt), iterations, keyLength, digest)),
    ),
}));

jest.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) => new Uint8Array(mockRandomBytes(length)),
}));

import { NativePbkdf2PasswordHasher } from "@/infrastructure/security/password-hasher.native";

describe("Native PBKDF2 adapter", () => {
  it("verifies the existing seed hash and preserves Unicode compatibility", async () => {
    const hasher = new NativePbkdf2PasswordHasher();
    expect(await hasher.verify("testpass1", SEED_PASSWORD_HASHES["user-customer-regular"]!)).toBe(
      true,
    );

    const salt = Uint8Array.from({ length: 16 }, (_, index) => index);
    const encoded = await hasher.hashWithSalt("日本語🔒パスワード", salt);
    expect(await hasher.verify("日本語🔒パスワード", encoded)).toBe(true);
    expect(await hasher.verify("別のパスワード", encoded)).toBe(false);
  });
});
