import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const harnessSource = readFileSync(
  resolve(process.cwd(), "src/test-controls/native-contract-harness.native.ts"),
  "utf8",
);
const runnerSource = readFileSync(
  resolve(process.cwd(), "src/test-controls/native-contract-harness-runner.native.ts"),
  "utf8",
);

describe("Native Contract Harness runtime contracts", () => {
  it("runs application invariants and PBKDF2 before cleanup and the success signal", () => {
    const applicationInvariantIndex = harnessSource.indexOf(
      "await resources.verifyApplicationDatabase?.();",
    );
    const passwordHashingIndex = harnessSource.indexOf(
      "await resources.verifyPasswordHashing?.();",
    );
    const finallyIndex = harnessSource.indexOf("} finally {");
    const passedSignalIndex = harnessSource.indexOf("emitNativeTestSignal(NATIVE_CONTRACT_PASSED");

    expect(applicationInvariantIndex).toBeGreaterThanOrEqual(0);
    expect(passwordHashingIndex).toBeGreaterThan(applicationInvariantIndex);
    expect(finallyIndex).toBeGreaterThan(passwordHashingIndex);
    expect(passedSignalIndex).toBeGreaterThan(finallyIndex);
    expect(harnessSource).toContain("passwordHashing: boolean;");
  });

  it("keeps the real Native PBKDF2 smoke inside the automation harness", () => {
    expect(runnerSource).toContain("NativePbkdf2PasswordHasher");
    expect(runnerSource).toContain("SELECT password_hash FROM users WHERE id = ?");
    expect(runnerSource).toContain('"user-customer-regular"');
    expect(runnerSource).toContain('const seedPassword = "testpass1";');
    expect(runnerSource).toContain('const unicodePassword = "日本語🔒パスワード";');
    expect(runnerSource).toContain('"wrongpass1"');
    expect(runnerSource).toContain('"日本語🔑パスワード"');
    expect(runnerSource).toContain("passwordHashing: true");
    expect(runnerSource).not.toContain("console.log(seededUser.password_hash)");
  });
});
