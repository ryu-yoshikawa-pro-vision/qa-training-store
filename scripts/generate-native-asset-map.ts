import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface ManifestAsset {
  assetId: string;
  path: string;
}

interface ProductImageAssetManifest {
  assets: ManifestAsset[];
}

async function main(): Promise<void> {
  const root = process.cwd();
  const manifest = JSON.parse(
    await readFile(path.join(root, "public/images/product-image-manifest.json"), "utf8"),
  ) as ProductImageAssetManifest;
  const entries = manifest.assets.map((asset) => {
    if (!asset.path.startsWith("/images/products/")) {
      throw new Error(`Native asset must be a product image: ${asset.assetId}`);
    }
    const relativePath = `../../public${asset.path}`;
    return `  ${JSON.stringify(asset.assetId)}: require(${JSON.stringify(relativePath)}),`;
  });
  const source = [
    'import type { ImageSourcePropType } from "react-native";',
    "",
    "export const nativeAssetMap: Record<string, ImageSourcePropType> = {",
    ...entries,
    "};",
    "",
    "export const nativeAssetIds = Object.keys(nativeAssetMap);",
    "",
  ].join("\n");
  await writeFile(path.join(root, "src/generated/native-product-assets.ts"), source, "utf8");
  console.log(`Generated Native Asset Map (${manifest.assets.length} assets).`);
}

void main();
