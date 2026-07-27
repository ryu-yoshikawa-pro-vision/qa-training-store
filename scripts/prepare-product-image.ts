import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const [sourcePath, outputPath] = process.argv.slice(2);

if (sourcePath === undefined || outputPath === undefined) {
  throw new Error("Usage: tsx scripts/prepare-product-image.ts <source> <output>");
}

const validatedSourcePath = sourcePath;
const resolvedOutput = path.resolve(outputPath);

async function main(): Promise<void> {
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await sharp(path.resolve(validatedSourcePath))
    .resize(720, 720, { fit: "cover" })
    .webp({ quality: 82, effort: 6 })
    .toFile(resolvedOutput);
}

void main();
