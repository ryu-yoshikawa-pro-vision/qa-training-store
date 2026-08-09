import { readFileSync } from "node:fs";
import { join } from "node:path";

const productionSources = [
  "src/presentation/native/native-purchase-screens.tsx",
  "src/presentation/pages/admin-product-pages.tsx",
] as const;

describe("Expo Router public import contract", () => {
  it.each(productionSources)("does not use internal build imports in %s", (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");
    const internalBuildPath = ["expo-router", "build"].join("/") + "/";
    expect(source).not.toContain(internalBuildPath);
  });
});
