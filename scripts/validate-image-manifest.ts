import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  mimeType: string;
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
  const manifest = JSON.parse(
    await readFile(path.join(root, "public/images/product-image-manifest.json"), "utf8"),
  ) as ProductImageAssetManifest;
  if (manifest.version !== config.version || manifest.generatedAt !== config.generatedAt) {
    throw new Error("Image manifest metadata does not match config");
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  const hashes = new Set<string>();
  for (const asset of manifest.assets) {
    if (ids.has(asset.assetId) || paths.has(asset.path) || hashes.has(asset.sha256)) {
      throw new Error(`Duplicate image asset: ${asset.assetId}`);
    }
    ids.add(asset.assetId);
    paths.add(asset.path);
    hashes.add(asset.sha256);
    const filePath = path.join(root, "public", asset.path.replace(/^\//, ""));
    const file = await readFile(filePath);
    const metadata = await sharp(filePath).metadata();
    const sha256 = createHash("sha256").update(file).digest("hex");
    if (
      asset.mimeType !== "image/webp" ||
      metadata.format !== "webp" ||
      metadata.width !== asset.width ||
      metadata.height !== asset.height ||
      file.byteLength !== asset.bytes ||
      sha256 !== asset.sha256
    ) {
      throw new Error(`Image metadata or hash mismatch: ${asset.assetId}`);
    }
    if (asset.bytes > 500 * 1024) {
      throw new Error(`Image exceeds 500KB: ${asset.assetId}`);
    }
  }
  for (const assetId of config.seedReferences) {
    if (!ids.has(assetId)) {
      throw new Error(`Seed references a missing image asset: ${assetId}`);
    }
  }
  if (
    config.assets.length !== manifest.assets.length ||
    config.assets.some(
      (configured) =>
        !manifest.assets.some(
          (asset) =>
            asset.assetId === configured.assetId &&
            asset.path === configured.path &&
            asset.isActive === configured.isActive,
        ),
    )
  ) {
    throw new Error("Image manifest entries do not match config");
  }
}

void main();
