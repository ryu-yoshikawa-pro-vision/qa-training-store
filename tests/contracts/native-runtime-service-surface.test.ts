import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Native application service surface", () => {
  it("exposes the Native Customer purchase surface without Admin services", () => {
    const source = readFileSync(resolve(process.cwd(), "src/bootstrap/native-runtime.ts"), "utf8");

    expect(source).toContain("catalog: NativeCatalogService;");
    expect(source).toContain("auth:");
    expect(source).toContain("account:");
    expect(source).toContain("checkout: CheckoutOrderUseCases;");
    expect(source).toContain("reviews: CustomerReviewUseCases;");
    expect(source).toContain('getProductDetail: CatalogUseCases["getProductDetail"];');
    expect(source).toContain('removeItem: CartUseCases["removeItem"];');
    expect(source).not.toContain("catalog: CatalogUseCases;");
    expect(source).not.toContain("cart: CartUseCases;");
    expect(source).not.toMatch(/catalog:\s*CatalogUseCases/);
    expect(source).not.toMatch(/cart:\s*CartUseCases/);
    expect(source).toContain("acceptPriceChanges");
    expect(source).not.toContain("listReviews");
    expect(source).not.toContain("catalog.suggest");
    expect(
      readFileSync(
        resolve(process.cwd(), "src/presentation/native/native-purchase-screens.tsx"),
        "utf8",
      ),
    ).toContain("resolveCustomerLoginDestination");
    expect(
      readFileSync(
        resolve(process.cwd(), "src/presentation/native/native-purchase-screens.tsx"),
        "utf8",
      ),
    ).not.toContain('router.replace((params.returnTo ?? "/")');
    expect(source).toContain("createNativeRuntime().catch");
    expect(source).toContain("initialization = null");
  });

  it("keeps non-customer roles outside the Native Customer shell", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/presentation/native/native-shell.tsx"),
      "utf8",
    );

    expect(source).toContain('currentUser.role !== "customer"');
    expect(source).toContain("currentUserLoaded");
    expect(source).toContain('title="Sessionを確認中…"');
    expect(source).toContain("native-role-logout");
    expect(source).toContain("Native Customerの対象外です");
    expect(source).toContain("currentUserLoaded && !unsupportedRole");
    expect(source).toContain('AppState.addEventListener("change"');
    expect(source).toContain('if (state === "active") refreshCurrentUser();');
    expect(source).toContain("return () => subscription.remove();");
  });
});
