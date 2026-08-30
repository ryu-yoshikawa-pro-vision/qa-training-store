import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  MARKDOWN_CSS,
  escapeHtml,
  extractNavigation,
  isExternalLink,
  parseMarkdownFile,
  renderMarkdown,
  type ParsedMarkdown,
} from "./markdown";

type SpecificationNavigationItem = {
  label: string;
  canonicalPath: string;
};

export const NORMATIVE_ROOT_FILES = [
  "docs/spec/product-scope.md",
  "docs/spec/roles-and-permissions.md",
  "docs/spec/state-and-scenarios.md",
  "docs/spec/ui-ux-contract.md",
] as const;

export function isNormativeSpecPath(relativePath: string): boolean {
  return (
    NORMATIVE_ROOT_FILES.includes(relativePath as (typeof NORMATIVE_ROOT_FILES)[number]) ||
    (relativePath.startsWith("docs/spec/features/") && relativePath.endsWith(".md"))
  );
}

export function listSpecMarkdown(rootDir: string): string[] {
  const specRoot = path.join(rootDir, "docs", "spec");
  if (!fs.existsSync(specRoot)) return [];
  const result: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        result.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
      }
    }
  };
  visit(specRoot);
  return result.sort((a, b) => a.localeCompare(b));
}

function outputPathFor(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  if (normalized === "docs/spec/README.md") return "index.html";
  return normalized.replace(/^docs\/spec\//, "").replace(/\.md$/i, ".html");
}

function resolveOutputLink(fromRelativePath: string, target: string): string {
  if (isExternalLink(target)) return target;
  const [withoutHash = "", hash] = target.split("#", 2);
  if (withoutHash === "") return hash === undefined ? "" : `#${hash}`;
  const sourceDirectory = path.posix.dirname(fromRelativePath);
  const resolved = path.posix.normalize(path.posix.join(sourceDirectory, withoutHash));
  const output = outputPathFor(resolved);
  return hash === undefined
    ? relativeOutputPath(outputPathFor(fromRelativePath), output)
    : `${relativeOutputPath(outputPathFor(fromRelativePath), output)}#${hash}`;
}

function resolveImageOutputLink(fromRelativePath: string, target: string): string {
  if (isExternalLink(target)) throw new Error(`Specification image must be local: ${target}`);
  const [withoutHash = ""] = target.split("#", 1);
  const sourceDirectory = path.posix.dirname(fromRelativePath);
  const resolved = path.posix.normalize(path.posix.join(sourceDirectory, withoutHash));
  if (!resolved.startsWith("docs/spec/assets/")) {
    throw new Error(`Specification image is outside docs/spec/assets: ${target}`);
  }
  return relativeOutputPath(outputPathFor(fromRelativePath), resolved.replace(/^docs\/spec\//, ""));
}

function relativeOutputPath(fromOutput: string, toOutput: string): string {
  const relative = path.posix.relative(path.posix.dirname(fromOutput), toOutput);
  return relative === "" ? path.posix.basename(toOutput) : relative;
}

function pageHtml(parsed: ParsedMarkdown, navigation: SpecificationNavigationItem[]): string {
  const title = parsed.headings.find((heading) => heading.level === 1)?.text ?? parsed.relativePath;
  const label = isNormativeSpecPath(parsed.relativePath)
    ? "Normative Product Behavior"
    : "Supporting / Operational";
  const homeLink = relativeOutputPath(outputPathFor(parsed.relativePath), "index.html");
  const navigationContent = `<ul>${navigation
    .map((item) => {
      const href = relativeOutputPath(
        outputPathFor(parsed.relativePath),
        outputPathFor(item.canonicalPath),
      );
      const current = item.canonicalPath === parsed.relativePath ? ' aria-current="page"' : "";
      return `<li><a href="${escapeHtml(href)}"${current}>${escapeHtml(item.label)}</a></li>`;
    })
    .join("")}</ul>`;
  const homeCurrent = parsed.relativePath === "docs/spec/README.md" ? ' aria-current="page"' : "";
  const mobileNavigation = `<details class="mobile-primary-navigation"><summary>Navigation</summary><nav aria-label="Specification navigation">${navigationContent}</nav></details>`;
  const linkTarget = (target: string): string => resolveOutputLink(parsed.relativePath, target);
  const imageTarget = (target: string): string =>
    resolveImageOutputLink(parsed.relativePath, target);
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — Scenario Shop Specification</title><style>${MARKDOWN_CSS}</style></head><body><header><div class="brand"><a href="${escapeHtml(homeLink)}"${homeCurrent}>Scenario Shop Specification</a><span class="label">${escapeHtml(label)}</span></div></header><main><nav class="primary-navigation" aria-label="Specification navigation">${navigationContent}</nav>${mobileNavigation}<article>${renderMarkdown(parsed, linkTarget, imageTarget)}</article></main></body></html>\n`;
}

export type BuildSpecOptions = {
  rootDir?: string;
  outputDir?: string;
};

export function buildSpecSite(options: BuildSpecOptions = {}): string[] {
  const rootDir = options.rootDir ?? process.cwd();
  const outputDir = options.outputDir ?? path.join(rootDir, "output", "spec-site");
  const relativePaths = listSpecMarkdown(rootDir);
  if (relativePaths.length === 0)
    throw new Error("No Markdown specification files found under docs/spec");
  fs.mkdirSync(outputDir, { recursive: true });
  const parsedFiles = new Map<string, ParsedMarkdown>();
  for (const relativePath of relativePaths) {
    const parsed = parseMarkdownFile(path.join(rootDir, relativePath), relativePath);
    parsedFiles.set(relativePath, parsed);
  }
  const readme = parsedFiles.get("docs/spec/README.md");
  const navigation: SpecificationNavigationItem[] =
    readme === undefined
      ? []
      : extractNavigation(readme).map((item) => ({
          label: item.label,
          canonicalPath: path.posix.normalize(
            path.posix.join(path.posix.dirname(readme.relativePath), item.target),
          ),
        }));
  if (navigation.length === 0)
    throw new Error("docs/spec/README.md must contain a direct-link Navigation list");
  for (const [relativePath, parsed] of parsedFiles) {
    const outputRelative = outputPathFor(relativePath);
    const outputAbsolute = path.join(outputDir, outputRelative);
    fs.mkdirSync(path.dirname(outputAbsolute), { recursive: true });
    fs.writeFileSync(outputAbsolute, pageHtml(parsed, navigation), "utf8");
  }
  const assetSource = path.join(rootDir, "docs", "spec", "assets");
  const assetDestination = path.join(outputDir, "assets");
  if (fs.existsSync(assetSource))
    copyDirectorySafely(assetSource, assetDestination, assetSource, assetDestination);
  return [...parsedFiles.keys()].sort((a, b) => a.localeCompare(b));
}

function copyDirectorySafely(
  source: string,
  destination: string,
  sourceRoot: string,
  destinationRoot: string,
): void {
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const resolvedDestinationRoot = path.resolve(destinationRoot);
  const resolvedSource = path.resolve(source);
  const resolvedDestination = path.resolve(destination);
  if (
    !resolvedSource.startsWith(`${resolvedSourceRoot}${path.sep}`) &&
    resolvedSource !== resolvedSourceRoot
  )
    throw new Error(`Asset source escaped root: ${source}`);
  if (
    !resolvedDestination.startsWith(`${resolvedDestinationRoot}${path.sep}`) &&
    resolvedDestination !== resolvedDestinationRoot
  )
    throw new Error(`Asset destination escaped root: ${destination}`);
  fs.mkdirSync(resolvedDestination, { recursive: true });
  for (const entry of fs.readdirSync(resolvedSource, { withFileTypes: true })) {
    const sourceEntry = path.join(resolvedSource, entry.name);
    const destinationEntry = path.join(resolvedDestination, entry.name);
    if (entry.isDirectory())
      copyDirectorySafely(sourceEntry, destinationEntry, sourceRoot, destinationRoot);
    else if (entry.isFile()) fs.copyFileSync(sourceEntry, destinationEntry);
  }
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const pages = buildSpecSite();
  console.log(`Built ${pages.length} specification page(s) in output/spec-site`);
}
