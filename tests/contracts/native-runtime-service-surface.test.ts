import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Native application service surface", () => {
  it("exposes only the Phase 2 first-half Catalog and Cart methods", () => {
    const source = readFileSync(resolve(process.cwd(), "src/bootstrap/native-runtime.ts"), "utf8");

    expect(source).toContain("catalog: NativeCatalogService;");
    expect(source).toContain("cart: NativeCartService;");
    expect(source).toContain('getProductDetail: CatalogUseCases["getProductDetail"];');
    expect(source).toContain('removeItem: CartUseCases["removeItem"];');
    expect(source).not.toContain("catalog: CatalogUseCases;");
    expect(source).not.toContain("cart: CartUseCases;");
    expect(source).not.toMatch(/catalog:\s*CatalogUseCases/);
    expect(source).not.toMatch(/cart:\s*CartUseCases/);
    expect(source).not.toContain("acceptPriceChanges");
    expect(source).not.toContain("listReviews");
    expect(source).not.toContain("suggest");
    expect(source).toContain("createNativeRuntime().catch");
    expect(source).toContain("initialization = null");
  });
});
