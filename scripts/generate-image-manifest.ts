import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

interface AssetConfig {
  assetId: string;
  path: string;
  defaultAltText: string;
  tags: string[];
  isActive: boolean;
}

interface ImageAssetConfig {
  version: number;
  generatedAt: string;
  seedReferences: string[];
  assets: AssetConfig[];
}

interface ManifestAsset extends AssetConfig {
  mimeType: "image/webp";
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

interface ProductImageAssetManifest {
  version: number;
  generatedAt: string;
  assets: ManifestAsset[];
}

async function main(): Promise<void> {
  const root = process.cwd();
  const config = JSON.parse(
    await readFile(path.join(root, "config/product-image-assets.json"), "utf8"),
  ) as ImageAssetConfig;
  const assets: ManifestAsset[] = [];
  for (const configured of config.assets) {
    if (!configured.path.startsWith("/images/products/") || !configured.path.endsWith(".webp")) {
      throw new Error(`Invalid product image path: ${configured.path}`);
    }
    const filePath = path.join(root, "public", configured.path.replace(/^\//, ""));
    const [file, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()]);
    if (
      metadata.format !== "webp" ||
      metadata.width === undefined ||
      metadata.height === undefined
    ) {
      throw new Error(`Unsupported or unreadable image: ${configured.path}`);
    }
    assets.push({
      ...configured,
      mimeType: "image/webp",
      width: metadata.width,
      height: metadata.height,
      bytes: file.byteLength,
      sha256: createHash("sha256").update(file).digest("hex"),
    });
  }
  const manifest: ProductImageAssetManifest = {
    version: config.version,
    generatedAt: config.generatedAt,
    assets,
  };
  await mkdir(path.join(root, "src/generated"), { recursive: true });
  await mkdir(path.join(root, "public/images"), { recursive: true });
  await writeFile(
    path.join(root, "src/generated/product-image-manifest.ts"),
    [
      'import type { ImageAsset } from "@/domain/contracts";',
      "",
      "export interface ProductImageAssetManifest {",
      "  version: number;",
      "  generatedAt: string;",
      "  assets: ImageAsset[];",
      "}",
      "",
      `export const productImageManifest = ${JSON.stringify(manifest, null, 2)} as const satisfies ProductImageAssetManifest;`,
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    path.join(root, "public/images/product-image-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

void main();
