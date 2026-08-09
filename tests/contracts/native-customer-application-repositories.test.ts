import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(
    process.cwd(),
    "src/infrastructure/database/sqlite/native-customer-application-repositories.ts",
  ),
  "utf8",
);

describe("Native Customer application repository contract", () => {
  it("uses real expo-sqlite connections and the exclusive transaction boundary", () => {
    expect(source).toContain('from "expo-sqlite"');
    expect(source).toContain("runNativeExclusiveTransaction");
    expect(source).not.toContain("dexie");
    expect(source).not.toContain("NativeAdmin");
    expect(source).not.toContain("AdminUseCases");
  });

  it.each([
    "NativeUserRepository",
    "NativeSessionRepository",
    "NativeAddressRepository",
    "NativeCartRepository",
    "NativeCheckoutSessionRepository",
    "NativeOrderRepository",
    "NativePaymentRepository",
    "NativeShipmentRepository",
    "NativeReviewRepository",
    "NativeCustomerTransactionRunner",
  ])("keeps %s in the Customer composition root", (repositoryName) => {
    expect(source).toContain(`class ${repositoryName}`);
  });

  it("does not expose a separate Native Admin repository set", () => {
    expect(source).toContain("createNativeCustomerApplicationRepositories");
    expect(source).toContain("Admin scopes are never");
    expect(source).not.toContain("Admin repository");
  });

  it("fails closed for unsupported transaction scopes without a type escape", () => {
    expect(source).toContain("isNativeCustomerTransactionScope");
    expect(source).toContain("nativeUnsupportedCategoryRepository");
    expect(source).toContain("nativeUnsupportedBrandRepository");
    expect(source).not.toContain("as unknown as");
  });

  it("re-reads expired checkout sessions inside a reentrant write with optimistic locking", () => {
    expect(source).toContain("const expiration = await this.context.write");
    expect(source).toContain("const latest = await repository.getById(checkoutSessionId)");
    expect(source).toContain("WHERE id = ? AND version = ?");
    expect(source).toContain("if (result.changes !== 1) throw conflictError();");
  });
});
