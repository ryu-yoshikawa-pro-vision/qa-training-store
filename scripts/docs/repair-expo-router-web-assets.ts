import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Metro can embed pnpm's internal package location in Expo Router image URIs.
const ASSET_URI = /\/assets\/node_modules\/\.pnpm\/expo-router@[^/"'\s]+\/node_modules\/expo-router\/assets\/((?:[a-z0-9_-]+\/)*[a-z0-9_-]+)\.[a-f0-9]{32}\.png/g;
const PNG_HEADER = Buffer.from("89504e470d0a1a0a", "hex");
const EXPORTED_ROUTER_PNG = /^\.pnpm\/expo-router@[^/]+\/node_modules\/expo-router\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.[a-f0-9]{32}(?:@[0-9.]+x)?\.png$/;
const EXPO_ROUTER_VERSION = "57.0.31";
const THIRD_PARTY_NOTICE_MARKERS = {
  start: "<!-- BEGIN PUBLIC WEB THIRD-PARTY NOTICES -->",
  end: "<!-- END PUBLIC WEB THIRD-PARTY NOTICES -->",
};
const WEB_FONT_LICENSE = "SIL OPEN FONT LICENSE Version 1.1";
const NOTICE = [
  "Expo Router 57.0.31 source: https://github.com/expo/expo/tree/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/packages/expo-router",
  "React Navigation Elements 2.9.10 source: https://github.com/react-navigation/react-navigation/tree/69573410534dc9a467ace6e749e82d32058b3092/packages/elements",
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

function lstatIfPresent(filePath: string): fs.Stats | undefined {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function assertSafeDirectoryPath(baseDir: string, directory: string, label: string): boolean {
  const relative = path.relative(baseDir, directory);
  if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(".." + path.sep)) {
    throw new Error("Web " + label + " escapes the output directory");
  }
  let current = baseDir;
  for (const part of relative ? relative.split(path.sep) : []) {
    current = path.join(current, part);
    const metadata = lstatIfPresent(current);
    if (!metadata) return false;
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error("Invalid Web " + label + " directory");
    }
  }
  return true;
}

function writeGeneratedFile(destination: string, content: string, label: string): void {
  const metadata = lstatIfPresent(destination);
  if (metadata && (metadata.isSymbolicLink() || !metadata.isFile())) {
    throw new Error("Invalid Web " + label + " destination");
  }
  fs.writeFileSync(destination, content, "utf8");
}

function copyWebThirdPartyNotices(rootDir: string, distDir: string): void {
  const source = path.join(
    rootDir,
    "training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md",
  );
  const markdown = fs.readFileSync(source, "utf8");
  const startMatches = markdown.split(THIRD_PARTY_NOTICE_MARKERS.start).length - 1;
  const endMatches = markdown.split(THIRD_PARTY_NOTICE_MARKERS.end).length - 1;
  if (startMatches !== 1 || endMatches !== 1) {
    throw new Error("Web third-party notice must contain exactly one start and end marker");
  }
  const start = markdown.indexOf(THIRD_PARTY_NOTICE_MARKERS.start);
  const contentStart = start + THIRD_PARTY_NOTICE_MARKERS.start.length;
  const end = markdown.indexOf(THIRD_PARTY_NOTICE_MARKERS.end);
  if (end <= contentStart) throw new Error("Web third-party notice markers are out of order");
  const content = markdown.slice(contentStart, end).trim();
  if (!content) throw new Error("Web third-party notice section is empty");
  writeGeneratedFile(path.join(distDir, "THIRD_PARTY_NOTICES.md"), content + "\n", "notice");

  const fontLicenseSource = path.join(
    rootDir,
    "training/ai-assisted-qa-course/templates/learner-OFL-1.1.txt",
  );
  const fontLicense = fs.readFileSync(fontLicenseSource, "utf8");
  if (!fontLicense.startsWith(WEB_FONT_LICENSE)) {
    throw new Error("Web font OFL-1.1 license could not be verified");
  }
  writeGeneratedFile(path.join(distDir, "OFL-1.1.txt"), fontLicense, "font license");
}

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
  if (!assertSafeDirectoryPath(rootDir, distDir, "output")) return 0;
  const jsRoot = path.join(distDir, "_expo/static/js/web");
  if (!assertSafeDirectoryPath(distDir, jsRoot, "JavaScript output")) return 0; // build:docs may run without Expo export
  const scripts = bundledJavaScript(jsRoot);
  if (scripts.length === 0) return 0; // an empty directory is not a Web bundle
  copyWebThirdPartyNotices(rootDir, distDir);
  if (
    !scripts.some((script) => fs.readFileSync(script, "utf8").includes("/assets/node_modules/")) &&
    !fs.existsSync(path.join(distDir, "assets/node_modules"))
  )
    return 0;

  const packageRoot = fs.realpathSync(path.join(rootDir, "node_modules/expo-router"));
  const metadata = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
    name?: string;
    version?: string;
    license?: string;
  };
  if (
    metadata.name !== "expo-router" ||
    metadata.version !== EXPO_ROUTER_VERSION ||
    metadata.license !== "MIT"
  ) {
    throw new Error("Expo Router's pinned version and MIT license could not be verified");
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
