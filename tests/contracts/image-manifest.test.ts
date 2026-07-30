import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { productImageManifest } from "@/generated/product-image-manifest";
import { createDefaultDataset } from "@/seeds/default-dataset";

describe("generated image manifest contract", () => {
  it("contains every seed reference as a local WebP under the size limit", async () => {
    const manifestIds = new Set<string>();
    const manifestPaths = new Set<string>();
    const manifestHashes = new Set<string>();
    for (const asset of productImageManifest.assets) {
      expect(manifestIds.has(asset.assetId)).toBe(false);
      expect(manifestPaths.has(asset.path)).toBe(false);
      expect(manifestHashes.has(asset.sha256)).toBe(false);
      manifestIds.add(asset.assetId);
      manifestPaths.add(asset.path);
      manifestHashes.add(asset.sha256);
      expect(asset.mimeType).toBe("image/webp");
      expect(asset.bytes).toBeLessThanOrEqual(500 * 1024);
      expect(asset.width).toBe(720);
      expect(asset.height).toBe(720);
      expect(asset.defaultAltText.trim()).not.toBe("");
      const filePath = path.join(process.cwd(), "public", asset.path.replace(/^\//, ""));
      const file = await readFile(filePath);
      expect((await stat(filePath)).size).toBe(asset.bytes);
      expect(file.subarray(0, 4).toString("hex")).toBe("52494646");
      expect(createHash("sha256").update(file).digest("hex")).toBe(asset.sha256);
    }
    const dataset = createDefaultDataset();
    for (const image of dataset.productImages) {
      expect(manifestIds.has(image.assetId)).toBe(true);
    }
    expect(
      Object.fromEntries(
        dataset.productImages
          .filter((image) => image.isPrimary)
          .map((image) => [image.productId, image.assetId]),
      ),
    ).toMatchObject({
      "product-premium-bag": "asset-premium-bag",
      "product-low-stock": "asset-compact-towel",
      "product-variation-12": "asset-color-pouch",
      "product-variation-13": "asset-training-wear",
    });
  });
});
