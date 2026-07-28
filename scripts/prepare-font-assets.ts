import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(__dirname, "..");
const targetDirectory = path.join(repositoryRoot, "public", "_expo", "static", "css", "files");
const fontAssets = [
  "inter-latin-400-normal.woff",
  "inter-latin-400-normal.woff2",
  "inter-latin-600-normal.woff",
  "inter-latin-600-normal.woff2",
  "inter-latin-700-normal.woff",
  "inter-latin-700-normal.woff2",
  ...[400, 600, 700].flatMap((weight) => [
    `noto-sans-jp-japanese-${weight}-normal.woff`,
    `noto-sans-jp-japanese-${weight}-normal.woff2`,
  ]),
];

async function copyFontAssets() {
  await mkdir(targetDirectory, { recursive: true });

  for (const assetName of fontAssets) {
    const packageName = assetName.startsWith("inter-") ? "inter" : "noto-sans-jp";
    await copyFile(
      path.join(repositoryRoot, "node_modules", "@fontsource", packageName, "files", assetName),
      path.join(targetDirectory, assetName),
    );
  }
}

void copyFontAssets().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
