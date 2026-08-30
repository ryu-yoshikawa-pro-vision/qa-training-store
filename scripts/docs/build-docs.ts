import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildSpecSite } from "../spec/build-spec";
import {
  MARKDOWN_CSS,
  escapeHtml,
  isExternalLink,
  parseMarkdownFile,
  renderMarkdown,
  type ParsedMarkdown,
} from "../spec/markdown";

const CURRICULUM_ROOT = "docs/curriculum/test-automation";
const CURRICULUM_ASSET_ROOT = `${CURRICULUM_ROOT}/assets`;
const SPEC_ROOT = "docs/spec";
const GITHUB_SOURCE_ROOT =
  "https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/main";

function listCurriculumMarkdown(rootDir: string): string[] {
  const curriculumRoot = path.join(rootDir, ...CURRICULUM_ROOT.split("/"));
  if (!fs.existsSync(curriculumRoot)) return [];
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
  visit(curriculumRoot);
  return result.sort((a, b) => a.localeCompare(b));
}

function outputPathFor(relativePath: string): string {
  if (relativePath === `${CURRICULUM_ROOT}/README.md`) return "index.html";
  return relativePath.replace(`${CURRICULUM_ROOT}/`, "").replace(/\.md$/i, ".html");
}

function relativeOutputPath(fromOutput: string, toOutput: string): string {
  const relative = path.posix.relative(path.posix.dirname(fromOutput), toOutput);
  return relative === "" ? path.posix.basename(toOutput) : relative;
}

function resolveRepositoryPath(rootDir: string, fromRelativePath: string, target: string): string {
  const repositoryRoot = path.resolve(rootDir);
  const absoluteTarget = path.resolve(repositoryRoot, path.dirname(fromRelativePath), target);
  const relativeTarget = path.relative(repositoryRoot, absoluteTarget);
  if (
    relativeTarget === ".." ||
    relativeTarget.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeTarget)
  ) {
    throw new Error(`Curriculum link escaped repository root: ${target}`);
  }
  const normalizedTarget = relativeTarget.split(path.sep).join("/");
  if (!fs.existsSync(absoluteTarget)) {
    throw new Error(`Curriculum link target does not exist: ${target}`);
  }
  return normalizedTarget;
}

function addFragment(target: string, hash: string | undefined): string {
  return hash === undefined ? target : `${target}#${hash}`;
}

function resolveCurriculumLink(rootDir: string, fromRelativePath: string, target: string): string {
  if (isExternalLink(target)) return target;
  const [withoutHash = "", hash] = target.split("#", 2);
  if (withoutHash === "") return hash === undefined ? "" : `#${hash}`;

  const resolved = resolveRepositoryPath(rootDir, fromRelativePath, withoutHash);
  let output: string;
  if (resolved === `${CURRICULUM_ROOT}/README.md`) {
    output = "/docs/curriculum/";
  } else if (resolved.startsWith(`${CURRICULUM_ROOT}/`) && resolved.endsWith(".md")) {
    output = `/docs/curriculum/${outputPathFor(resolved)}`;
  } else if (resolved === `${SPEC_ROOT}/README.md`) {
    output = "/docs/spec/";
  } else if (resolved.startsWith(`${SPEC_ROOT}/`) && resolved.endsWith(".md")) {
    output = `/docs/spec/${resolved.replace(`${SPEC_ROOT}/`, "").replace(/\.md$/i, ".html")}`;
  } else {
    output = `${GITHUB_SOURCE_ROOT}/${resolved}`;
  }
  return addFragment(output, hash);
}

function isExternalImageTarget(target: string): boolean {
  return /^(?:https?:|\/\/)/i.test(target);
}

function resolveCurriculumImage(rootDir: string, fromRelativePath: string, target: string): string {
  if (isExternalImageTarget(target)) {
    throw new Error(`Curriculum image must be local: ${target}`);
  }
  const [withoutHash = ""] = target.split("#", 1);
  const resolved = resolveRepositoryPath(rootDir, fromRelativePath, withoutHash);
  const assetPrefix = `${CURRICULUM_ASSET_ROOT}/`;
  if (!resolved.startsWith(assetPrefix)) {
    throw new Error(`Curriculum image is outside ${CURRICULUM_ASSET_ROOT}: ${target}`);
  }
  const absolute = path.join(rootDir, ...resolved.split("/"));
  if (!fs.statSync(absolute).isFile()) {
    throw new Error(`Curriculum image is not a file: ${target}`);
  }
  const output = `assets/${resolved.slice(assetPrefix.length)}`;
  return relativeOutputPath(outputPathFor(fromRelativePath), output);
}

function copyCurriculumAssets(rootDir: string, outputDir: string): void {
  const source = path.join(rootDir, ...CURRICULUM_ASSET_ROOT.split("/"));
  if (!fs.existsSync(source)) return;
  const destination = path.join(outputDir, "assets");
  const copy = (sourceDirectory: string, destinationDirectory: string): void => {
    fs.mkdirSync(destinationDirectory, { recursive: true });
    for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
      const sourceEntry = path.join(sourceDirectory, entry.name);
      const destinationEntry = path.join(destinationDirectory, entry.name);
      if (entry.isDirectory()) copy(sourceEntry, destinationEntry);
      else if (entry.isFile()) fs.copyFileSync(sourceEntry, destinationEntry);
    }
  };
  copy(source, destination);
}

function pageHtml(rootDir: string, parsed: ParsedMarkdown): string {
  const title = parsed.headings.find((heading) => heading.level === 1)?.text;
  if (title === undefined) {
    throw new Error(`Curriculum Markdown must contain an H1: ${parsed.relativePath}`);
  }
  const linkTarget = (target: string): string =>
    resolveCurriculumLink(rootDir, parsed.relativePath, target);
  const imageTarget = (target: string): string =>
    resolveCurriculumImage(rootDir, parsed.relativePath, target);
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — Scenario Shop Test Automation Curriculum</title><style>${MARKDOWN_CSS}</style></head><body><header><div class="brand"><a href="/docs/curriculum/">Scenario Shop Test Automation Curriculum</a></div></header><main><article>${renderMarkdown(parsed, linkTarget, imageTarget)}</article></main></body></html>\n`;
}

export type BuildDocsResult = {
  specificationPages: number;
  curriculumPages: number;
};

export function buildDocs(rootDir = process.cwd()): BuildDocsResult {
  const docsOutput = path.join(rootDir, "dist", "docs");
  fs.rmSync(docsOutput, { recursive: true, force: true });

  const specificationPages = buildSpecSite({
    rootDir,
    outputDir: path.join(docsOutput, "spec"),
  }).length;

  const curriculumPaths = listCurriculumMarkdown(rootDir);
  if (curriculumPaths.length === 0) {
    throw new Error("No Markdown curriculum files found under docs/curriculum/test-automation");
  }
  for (const relativePath of curriculumPaths) {
    const parsed = parseMarkdownFile(path.join(rootDir, ...relativePath.split("/")), relativePath);
    const outputAbsolute = path.join(docsOutput, "curriculum", outputPathFor(relativePath));
    fs.mkdirSync(path.dirname(outputAbsolute), { recursive: true });
    fs.writeFileSync(outputAbsolute, pageHtml(rootDir, parsed), "utf8");
  }
  copyCurriculumAssets(rootDir, path.join(docsOutput, "curriculum"));
  return { specificationPages, curriculumPages: curriculumPaths.length };
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const result = buildDocs();
  console.log(
    `Built ${result.specificationPages} specification page(s) and ${result.curriculumPages} curriculum page(s) in dist/docs`,
  );
}
