import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { VISUAL_CAPTURE_CASES, visualAssetPath } from "./visual-registry";

const rootDir = process.cwd();
const rawRoot = path.resolve(rootDir, "output/spec-visuals/raw/web");

function rawPathForCase(captureCase: (typeof VISUAL_CAPTURE_CASES)[number]): string {
  return path.resolve(
    rootDir,
    visualAssetPath(captureCase)
      .replace("docs/spec/assets/screens/", "output/spec-visuals/raw/web/")
      .replace(/\.webp$/, ".png"),
  );
}

function assertWithinRoot(target: string, root: string): void {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`path escapes visual capture root: ${target}`);
}

async function main(): Promise<void> {
  const targets = VISUAL_CAPTURE_CASES.filter(
    (captureCase) => captureCase.platform.startsWith("web-") && captureCase.status === "pending",
  );
  if (targets.length === 0)
    throw new Error("No pending Web visual targets are available for promotion.");
  let totalBytes = 0;
  let largestBytes = 0;
  for (const captureCase of targets) {
    const rawPath = rawPathForCase(captureCase);
    assertWithinRoot(rawPath, rawRoot);
    if (!fs.existsSync(rawPath))
      throw new Error(`missing raw Web capture for ${captureCase.captureCaseKey}: ${rawPath}`);
    const outputPath = path.resolve(rootDir, visualAssetPath(captureCase));
    if (path.extname(outputPath).toLowerCase() !== ".webp")
      throw new Error(`canonical Web visual must be WebP: ${outputPath}`);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(rawPath).webp({ quality: 88 }).toFile(outputPath);
    const bytes = fs.statSync(outputPath).size;
    totalBytes += bytes;
    largestBytes = Math.max(largestBytes, bytes);
    if (bytes <= 0 || bytes > 1024 * 1024)
      throw new Error(`canonical Web visual exceeds 1 MiB budget: ${outputPath} (${bytes})`);
  }
  console.log(`Promoted Web canonical visuals: ${targets.length}`);
  console.log(`Largest asset bytes: ${largestBytes}`);
  console.log(`Total asset bytes: ${totalBytes}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
