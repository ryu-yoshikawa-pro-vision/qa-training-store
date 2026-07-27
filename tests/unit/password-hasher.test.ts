import {
  PBKDF2_HASH_BYTES,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_BYTES,
  WebPbkdf2PasswordHasher,
} from "@/infrastructure/security/password-hasher.web";
import { SEED_PASSWORD_HASHES } from "@/seeds/password-hashes";

describe("PBKDF2 password hasher contract", () => {
  it("uses the fixed algorithm, iteration, salt, and key sizes", async () => {
    const hasher = new WebPbkdf2PasswordHasher();
    const salt = new Uint8Array(PBKDF2_SALT_BYTES).map((_, index) => index);
    const encoded = await hasher.hashWithSalt("testpass1", salt);
    const [algorithm, iterations, encodedSalt, encodedHash] = encoded.split("$");
    expect(algorithm).toBe("pbkdf2-sha256");
    expect(iterations).toBe(String(PBKDF2_ITERATIONS));
    expect(Uint8Array.from(atob(encodedSalt!), (value) => value.charCodeAt(0))).toHaveLength(
      PBKDF2_SALT_BYTES,
    );
    expect(Uint8Array.from(atob(encodedHash!), (value) => value.charCodeAt(0))).toHaveLength(
      PBKDF2_HASH_BYTES,
    );
    expect(await hasher.verify("testpass1", encoded)).toBe(true);
    expect(await hasher.verify("wrongpass", encoded)).toBe(false);
  });

  it("verifies deterministic seed hashes and rejects malformed encodings", async () => {
    const hasher = new WebPbkdf2PasswordHasher();
    expect(await hasher.verify("testpass1", SEED_PASSWORD_HASHES["user-customer-regular"]!)).toBe(
      true,
    );
    expect(await hasher.verify("testpass1", "pbkdf2-sha256$1$bad$bad")).toBe(false);
  });
});
