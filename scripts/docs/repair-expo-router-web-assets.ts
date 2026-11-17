import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Metro can embed pnpm's internal package location in Expo Router image URIs.
const ASSET_URI = /\/assets\/node_modules\/\.pnpm\/expo-router@[^/"'\s]+\/node_modules\/expo-router\/assets\/((?:[a-z0-9_-]+\/)*[a-z0-9_-]+)\.[a-f0-9]{32}\.png/g;
const PNG_HEADER = Buffer.from("89504e470d0a1a0a", "hex");
const EXPORTED_ROUTER_PNG = /^\.pnpm\/expo-router@[^/]+\/node_modules\/expo-router\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.[a-f0-9]{32}(?:@[0-9.]+x)?\.png$/;
const NOTICE = [
  "Expo Router: https://github.com/expo/expo/tree/main/packages/expo-router",
  "React Navigation: https://github.com/react-navigation/react-navigation",
  "MIT License",
  "",
  "Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)",
  "Copyright (c) 2017 React Navigation Contributors",
  "",
  "Permission is hereby granted, free of charge, to any person obtaining a copy",
  "of this software and associated documentation files (the \"Software\"), to deal",
  "in the Software without restriction, including without limitation the rights",
  "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
  "copies of the Software, and to permit persons to whom the Software is",
  "furnished to do so, subject to the following conditions:",
  "",
  "The above copyright notice and this permission notice shall be included in all",
  "copies or substantial portions of the Software.",
  "",
  "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
  "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
  "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
  "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
  "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
  "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
  "SOFTWARE.",
  "",
].join("\n");

function bundledJavaScript(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Web export contains a symlink: " + file);
    if (entry.isDirectory()) files.push(...bundledJavaScript(file));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(file);
  }
  return files;
}

// Metro also writes the original pnpm paths into dist, even after its JS URIs are rewritten.
// Remove only verified Expo Router PNG exports; reject unrelated internal files.
function removeInternalExpoRouterImages(distDir: string): void {
  const internalRoot = path.join(distDir, "assets/node_modules");
  if (!fs.existsSync(internalRoot)) return;
  if (!fs.lstatSync(internalRoot).isDirectory() || fs.lstatSync(internalRoot).isSymbolicLink()) {
    throw new Error("Invalid internal Web asset directory");
  }
  const inspect = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Symlink in internal Web assets: " + file);
      if (entry.isDirectory()) {
        inspect(file);
        continue;
      }
      const relative = path.relative(internalRoot, file).split(path.sep).join("/");
      if (!entry.isFile() || !EXPORTED_ROUTER_PNG.test(relative)) {
        throw new Error("Unexpected internal Web asset: " + relative);
      }
      const bytes = fs.readFileSync(file);
      if (bytes.length <= 8 || !bytes.subarray(0, 8).equals(PNG_HEADER)) {
        throw new Error("Invalid internal Expo Router PNG: " + relative);
      }
    }
  };
  inspect(internalRoot);
  fs.rmSync(internalRoot, { recursive: true });
}

export function repairExpoRouterWebAssets(rootDir: string, distDir = path.join(rootDir, "dist")): number {
  const jsRoot = path.join(distDir, "_expo/static/js/web");
  if (!fs.existsSync(jsRoot)) return 0; // build:docs may run without Expo export
  const scripts = bundledJavaScript(jsRoot);
  if (
    !scripts.some((script) => fs.readFileSync(script, "utf8").includes("/assets/node_modules/")) &&
    !fs.existsSync(path.join(distDir, "assets/node_modules"))
  )
    return 0;

  const packageRoot = fs.realpathSync(path.join(rootDir, "node_modules/expo-router"));
  const metadata = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
    name?: string;
    license?: string;
  };
  if (metadata.name !== "expo-router" || metadata.license !== "MIT") {
    throw new Error("Expo Router's MIT license could not be verified");
  }
  const assetsRoot = fs.realpathSync(path.join(packageRoot, "assets"));
  const published = new Set<string>();

  for (const script of scripts) {
    const original = fs.readFileSync(script, "utf8");
    const rewritten = original.replace(ASSET_URI, (_match, assetName: string) => {
      const source = path.join(assetsRoot, ...assetName.split("/")) + ".png";
      const relative = path.relative(assetsRoot, source);
      if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.lstatSync(source).isFile()) {
        throw new Error("Non-regular Expo Router image: " + assetName);
      }
      const bytes = fs.readFileSync(source);
      if (bytes.length <= 8 || !bytes.subarray(0, 8).equals(PNG_HEADER)) {
        throw new Error("Empty or invalid Expo Router image: " + assetName);
      }
      const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
      const publicPath = "assets/expo-router/" + assetName + "." + hash + ".png";
      const target = path.join(distDir, ...publicPath.split("/"));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) {
        throw new Error("Conflicting exported image: " + publicPath);
      }
      fs.writeFileSync(target, bytes);
      published.add(publicPath);
      return "/" + publicPath;
    });
    if (rewritten.includes("/assets/node_modules/")) {
      throw new Error("Unresolved internal asset URI in " + path.relative(distDir, script));
    }
    if (rewritten !== original) fs.writeFileSync(script, rewritten, "utf8");
  }
  if (published.size) {
    fs.writeFileSync(path.join(distDir, "assets/expo-router/LICENSE"), NOTICE, "utf8");
  }
  removeInternalExpoRouterImages(distDir);
  return published.size;
}
