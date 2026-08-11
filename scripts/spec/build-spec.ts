import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  escapeHtml,
  extractNavigation,
  isExternalLink,
  parseMarkdownFile,
  renderInline,
  type MarkdownHeading,
  type NavigationItem,
  type ParsedMarkdown,
} from "./markdown";

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

function relativeOutputPath(fromOutput: string, toOutput: string): string {
  const relative = path.posix.relative(path.posix.dirname(fromOutput), toOutput);
  return relative === "" ? path.posix.basename(toOutput) : relative;
}

function renderHeading(heading: MarkdownHeading): string {
  return `<h${heading.level} id="${escapeHtml(heading.anchor)}">${escapeHtml(heading.text)}</h${heading.level}>`;
}

function renderTable(lines: string[], linkTarget: (target: string) => string): string {
  const rows = lines
    .filter((line) => line.trim() !== "")
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
  const header = rows[0] ?? [];
  const body = rows.slice(2);
  return `<table><thead><tr>${header.map((cell) => `<th>${renderInline(cell, linkTarget)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${header.map((_cell, index) => `<td>${renderInline(row[index] ?? "", linkTarget)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderToc(headings: MarkdownHeading[]): string {
  const entries = headings.filter((heading) => heading.level === 2 || heading.level === 3);
  if (entries.length === 0) return "";
  return `<aside class="toc" aria-label="Table of contents"><strong>Contents</strong><ul>${entries.map((heading) => `<li class="toc-level-${heading.level}"><a href="#${escapeHtml(heading.anchor)}">${escapeHtml(heading.text)}</a></li>`).join("")}</ul></aside>`;
}

function renderBody(parsed: ParsedMarkdown): string {
  const output: string[] = [];
  const lines = parsed.lines;
  const linkTarget = (target: string): string => resolveOutputLink(parsed.relativePath, target);
  let index = 0;
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      output.push(`<p>${renderInline(paragraph.join(" "), linkTarget)}</p>`);
      paragraph = [];
    }
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (/^\s*```/.test(line)) {
      flushParagraph();
      const language = line.replace(/^\s*```/, "").trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index] ?? "")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      output.push(
        `<pre><code class="language-${escapeHtml(language || "text")}">${escapeHtml(code.join("\n"))}</code></pre>`,
      );
      index += 1;
      continue;
    }
    const heading = parsed.headings.find((candidate) => candidate.line === index + 1);
    if (heading !== undefined) {
      flushParagraph();
      output.push(renderHeading(heading));
      index += 1;
      continue;
    }
    if (/^\s*\|/.test(line) && lines[index + 1]?.includes("|") === true) {
      flushParagraph();
      const tableLines: string[] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index] ?? "")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }
      output.push(renderTable(tableLines, linkTarget));
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? "")) {
        items.push(
          `<li>${renderInline((lines[index] ?? "").replace(/^\s*[-*+]\s+/, ""), linkTarget)}</li>`,
        );
        index += 1;
      }
      output.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        items.push(
          `<li>${renderInline((lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""), linkTarget)}</li>`,
        );
        index += 1;
      }
      output.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      output.push(
        `<blockquote>${renderInline(line.replace(/^\s*>\s?/, ""), linkTarget)}</blockquote>`,
      );
      index += 1;
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      index += 1;
      continue;
    }
    paragraph.push(line.trim());
    index += 1;
  }
  flushParagraph();
  return `${renderToc(parsed.headings)}<div class="document-body">${output.join("\n")}</div>`;
}

const CSS = `:root{color-scheme:light;--navy:#111827;--muted:#475569;--border:#e2e8f0;--gold:#7a5b22;--surface:#fffdf8;--code:#f8fafc}*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--navy);font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:#1d4ed8}header{border-bottom:1px solid var(--border);background:#fff;padding:1rem clamp(1rem,4vw,3rem);position:sticky;top:0;z-index:2}header .brand{font-weight:700;font-size:1.1rem}header .label{margin-left:.75rem;color:var(--gold);font-size:.8rem;border:1px solid var(--gold);border-radius:999px;padding:.15rem .55rem}nav ul{display:flex;flex-wrap:wrap;gap:.4rem 1rem;margin:.75rem 0 0;padding:0;list-style:none}main{display:grid;grid-template-columns:minmax(0,1fr) minmax(12rem,18rem);gap:2rem;max-width:1280px;margin:0 auto;padding:2rem clamp(1rem,4vw,3rem)}article{min-width:0}h1,h2,h3,h4,h5,h6{line-height:1.25;scroll-margin-top:6rem}h1{font-size:clamp(1.8rem,4vw,2.7rem)}h2{margin-top:2.25rem;border-bottom:1px solid var(--border);padding-bottom:.35rem}table{border-collapse:collapse;width:100%;display:block;overflow-x:auto;margin:1rem 0}th,td{border:1px solid var(--border);padding:.55rem .7rem;text-align:left;vertical-align:top}th{background:#f8fafc}pre{overflow-x:auto;background:var(--code);border:1px solid var(--border);padding:1rem;border-radius:.5rem}code{background:#f1f5f9;border-radius:.25rem;padding:.1rem .25rem;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}pre code{background:none;padding:0}.toc{border:1px solid var(--border);border-radius:.5rem;padding:.75rem 1rem;background:#fff;position:sticky;top:7rem;max-height:70vh;overflow:auto}.toc ul{list-style:none;padding:0;margin:.5rem 0}.toc-level-3{padding-left:1rem}.image-placeholder{border:1px dashed var(--border);padding:.1rem .3rem;color:var(--muted)}blockquote{border-left:4px solid var(--gold);margin:1rem 0;padding:.25rem 1rem;color:var(--muted)}@media(max-width:800px){header{position:static}main{display:block;padding:1.25rem 1rem}.toc{position:static;max-height:none;margin-bottom:1.25rem}nav ul{display:block}nav li{margin:.25rem 0}}`;

function pageHtml(parsed: ParsedMarkdown, navigation: NavigationItem[]): string {
  const title = parsed.headings.find((heading) => heading.level === 1)?.text ?? parsed.relativePath;
  const label = isNormativeSpecPath(parsed.relativePath)
    ? "Normative Product Behavior"
    : "Supporting / Operational";
  const homeLink = relativeOutputPath(outputPathFor(parsed.relativePath), "index.html");
  const navHtml = navigation
    .map(
      (item) =>
        `<li><a href="${escapeHtml(resolveOutputLink(parsed.relativePath, item.target))}">${escapeHtml(item.label)}</a></li>`,
    )
    .join("");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — Scenario Shop Specification</title><style>${CSS}</style></head><body><header><div class="brand"><a href="${escapeHtml(homeLink)}">Scenario Shop Specification</a><span class="label">${escapeHtml(label)}</span></div><nav aria-label="Specification navigation"><ul>${navHtml}</ul></nav></header><main><article>${renderBody(parsed)}</article></main></body></html>\n`;
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
  const navigation = extractNavigation(
    parsedFiles.get("docs/spec/README.md") ?? {
      lines: [],
      headings: [],
      links: [],
      relativePath: "docs/spec/README.md",
      absolutePath: "",
    },
  );
  if (navigation.length === 0)
    throw new Error("docs/spec/README.md must contain a direct-link Navigation list");
  for (const [relativePath, parsed] of parsedFiles) {
    const outputRelative = outputPathFor(relativePath);
    const outputAbsolute = path.join(outputDir, outputRelative);
    fs.mkdirSync(path.dirname(outputAbsolute), { recursive: true });
    fs.writeFileSync(outputAbsolute, pageHtml(parsed, navigation), "utf8");
  }
  return [...parsedFiles.keys()].sort((a, b) => a.localeCompare(b));
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
