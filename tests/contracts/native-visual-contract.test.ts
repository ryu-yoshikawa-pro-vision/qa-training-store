import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nativeComponents = readFileSync(
  path.join(root, "src", "presentation", "native", "native-components.tsx"),
  "utf8",
);
const nativeScreens = readFileSync(
  path.join(root, "src", "presentation", "native", "native-screens.tsx"),
  "utf8",
);
const tokens = readFileSync(path.join(root, "src", "presentation", "design", "tokens.ts"), "utf8");
const globalCss = readFileSync(
  path.join(root, "src", "presentation", "styles", "global.css"),
  "utf8",
);

describe("Web/Native visual contract", () => {
  it("makes Native styles consume shared tokens instead of a second color system", () => {
    expect(nativeComponents).toContain('from "@/presentation/design/tokens"');
    expect(nativeComponents).not.toContain("#15233b");
    expect(nativeComponents).not.toContain("#0f5bd3");
    expect(nativeComponents).toContain("tokens.layout.minimumTouchTarget");
    expect(nativeComponents).toContain("tokens.layout.productCardImageAspectRatio");
    expect(nativeScreens).toContain('variant="detail"');
  });

  it("keeps the brand, spacing, ratio, and touch-target contract explicit", () => {
    expect(tokens).toContain('actionPrimary: "#111827"');
    expect(tokens).toContain('accent: "#c6a15b"');
    expect(tokens).toContain('accentOnDark: "#d8bd83"');
    expect(tokens).toContain("productCardImageAspectRatio: 4 / 5");
    expect(tokens).toContain("productDetailImageAspectRatio: 6 / 5");
    expect(globalCss).toContain("--product-card-image-ratio: 4 / 5");
    expect(globalCss).toContain("--product-detail-image-ratio-mobile: 6 / 5");
    expect(nativeComponents).toContain("buttonAccent");
    expect(nativeScreens).toContain('variant="accent"');
  });
});
