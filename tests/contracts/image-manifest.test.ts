import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { productImageManifest } from "@/generated/product-image-manifest";
import { createDefaultDataset } from "@/seeds/default-dataset";

describe("generated image manifest contract", () => {
  it("contains every seed reference as a local WebP under the size limit", async () => {
    const manifestIds = new Set<string>();
    for (const asset of productImageManifest.assets) {
      expect(manifestIds.has(asset.assetId)).toBe(false);
      manifestIds.add(asset.assetId);
      expect(asset.mimeType).toBe("image/webp");
      expect(asset.bytes).toBeLessThanOrEqual(500 * 1024);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
      const filePath = path.join(process.cwd(), "public", asset.path.replace(/^\//, ""));
      expect((await stat(filePath)).size).toBe(asset.bytes);
      expect((await readFile(filePath)).subarray(0, 4).toString("hex")).toBe("52494646");
    }
    for (const image of createDefaultDataset().productImages) {
      expect(manifestIds.has(image.assetId)).toBe(true);
    }
  });
});
