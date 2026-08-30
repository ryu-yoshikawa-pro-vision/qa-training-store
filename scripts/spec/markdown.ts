import fs from "node:fs";
import { slugHeading } from "./slug-heading";

export type MarkdownHeading = {
  level: number;
  text: string;
  anchor: string;
  line: number;
  raw: string;
};

export type MarkdownLink = {
  label: string;
  target: string;
  line: number;
  image: boolean;
};

export type ParsedMarkdown = {
  relativePath: string;
  absolutePath: string;
  lines: string[];
  headings: MarkdownHeading[];
  links: MarkdownLink[];
};

export type NavigationItem = {
  label: string;
  target: string;
};

function stripHeadingMarkup(value: string): string {
  return value
    .replace(/\s+#+\s*$/, "")
    .replace(/[`*_~]/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .trim();
}

export function parseMarkdownFile(absolutePath: string, relativePath: string): ParsedMarkdown {
  const source = fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "");
  const lines = source.split(/\r?\n/);
  const headings: MarkdownHeading[] = [];
  const links: MarkdownLink[] = [];
  const usedAnchors = new Map<string, number>();
  let fenced = false;

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;

    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (headingMatch !== null) {
      const level = headingMatch[1]?.length ?? 0;
      const text = stripHeadingMarkup(headingMatch[2] ?? "");
      const baseAnchor = slugHeading(text) || `heading-${index + 1}`;
      const seen = usedAnchors.get(baseAnchor) ?? 0;
      usedAnchors.set(baseAnchor, seen + 1);
      headings.push({
        level,
        text,
        anchor: seen === 0 ? baseAnchor : `${baseAnchor}-${seen + 1}`,
        line: index + 1,
        raw: line,
      });
    }

    const linkPattern = /(!?)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    for (const match of line.matchAll(linkPattern)) {
      const target = match[3];
      if (target === undefined) continue;
      links.push({
        label: match[2] ?? "",
        target,
        line: index + 1,
        image: match[1] === "!",
      });
    }
  });

  return { relativePath, absolutePath, lines, headings, links };
}

export function extractNavigation(parsed: ParsedMarkdown): NavigationItem[] {
  const headingIndex = parsed.lines.findIndex((line) => line.trim() === "## Navigation");
  if (headingIndex < 0) return [];

  const items: NavigationItem[] = [];
  for (let index = headingIndex + 1; index < parsed.lines.length; index += 1) {
    const line = parsed.lines[index];
    if (line !== undefined && /^##\s+/.test(line)) break;
    const match = /^-\s+\[([^\]]+)\]\(([^)]+)\)\s*$/.exec(line ?? "");
    if (match !== null && match[1] !== undefined && match[2] !== undefined) {
      items.push({ label: match[1], target: match[2] });
    }
  }
  return items;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderInline(
  value: string,
  linkTarget: (target: string) => string = (target) => target,
  imageTarget: (target: string) => string = linkTarget,
): string {
  const tokens: string[] = [];
  const addToken = (rendered: string): string => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(rendered);
    return token;
  };
  const renderImage = (label: string, source: string, href: string): string =>
    `<a class="canonical-image-link" href="${escapeHtml(imageTarget(href))}"><img src="${escapeHtml(imageTarget(source))}" alt="${escapeHtml(label)}" loading="lazy" /></a>`;
  const tokenized = value
    .replace(
      /\[!\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      (_all, label: string, source: string, href: string) =>
        addToken(renderImage(label, source, href)),
    )
    .replace(
      /(!?)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      (_all, image: string, label: string, target: string) => {
        const rendered =
          image === "!"
            ? renderImage(label, target, target)
            : `<a href="${escapeHtml(linkTarget(target))}">${renderInline(label, linkTarget, imageTarget)}</a>`;
        return addToken(rendered);
      },
    );
  let rendered = escapeHtml(tokenized)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
  tokens.forEach((token, index) => {
    rendered = rendered.replace(`\u0000${index}\u0000`, token);
  });
  return rendered;
}

export function isExternalLink(target: string): boolean {
  return /^(?:https?:|mailto:|tel:|\/\/)/i.test(target);
}

function renderHeading(heading: MarkdownHeading): string {
  return `<h${heading.level} id="${escapeHtml(heading.anchor)}">${escapeHtml(heading.text)}</h${heading.level}>`;
}

function renderTable(
  lines: string[],
  linkTarget: (target: string) => string,
  imageTarget: (target: string) => string,
): string {
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
  return `<table><thead><tr>${header.map((cell) => `<th>${renderInline(cell, linkTarget, imageTarget)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${header.map((_cell, index) => `<td>${renderInline(row[index] ?? "", linkTarget, imageTarget)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderToc(headings: MarkdownHeading[]): string {
  const entries = headings.filter((heading) => heading.level === 2 || heading.level === 3);
  if (entries.length === 0) return "";
  return `<aside class="toc" aria-label="Table of contents"><strong>Contents</strong><ul>${entries.map((heading) => `<li class="toc-level-${heading.level}"><a href="#${escapeHtml(heading.anchor)}">${escapeHtml(heading.text)}</a></li>`).join("")}</ul></aside>`;
}

export function renderMarkdown(
  parsed: ParsedMarkdown,
  linkTarget: (target: string) => string = (target) => target,
  imageTarget: (target: string) => string = linkTarget,
): string {
  const output: string[] = [];
  const lines = parsed.lines;
  let index = 0;
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      output.push(`<p>${renderInline(paragraph.join(" "), linkTarget, imageTarget)}</p>`);
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
      output.push(renderTable(tableLines, linkTarget, imageTarget));
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? "")) {
        items.push(
          `<li>${renderInline((lines[index] ?? "").replace(/^\s*[-*+]\s+/, ""), linkTarget, imageTarget)}</li>`,
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
          `<li>${renderInline((lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""), linkTarget, imageTarget)}</li>`,
        );
        index += 1;
      }
      output.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      output.push(
        `<blockquote>${renderInline(line.replace(/^\s*>\s?/, ""), linkTarget, imageTarget)}</blockquote>`,
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

export const MARKDOWN_CSS = `
:root {
  color-scheme: light;
  --navy: #111827;
  --muted: #475569;
  --border: #e2e8f0;
  --gold: #7a5b22;
  --surface: #fffdf8;
  --code: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--surface);
  color: var(--navy);
  font: 16px/1.7 system-ui, -apple-system, "Segoe UI", sans-serif;
}

a {
  color: #1d4ed8;
}

header {
  border-bottom: 1px solid var(--border);
  background: #fff;
  padding: 1rem clamp(1rem, 4vw, 3rem);
  position: sticky;
  top: 0;
  z-index: 2;
}

header .brand {
  font-weight: 700;
  font-size: 1.1rem;
}

header .brand a[aria-current="page"] {
  color: var(--gold);
  font-weight: 700;
  text-decoration-thickness: 0.15em;
  text-underline-offset: 0.15em;
}

header .label {
  margin-left: 0.75rem;
  color: var(--gold);
  font-size: 0.8rem;
  border: 1px solid var(--gold);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

main {
  display: grid;
  grid-template-columns: minmax(13rem, 16rem) minmax(0, 1fr);
  gap: clamp(1.5rem, 3vw, 3rem);
  max-width: 1440px;
  min-width: 0;
  margin: 0 auto;
  padding: 2rem clamp(1rem, 4vw, 3rem);
  align-items: start;
}

.primary-navigation {
  align-self: start;
  min-width: 0;
  position: sticky;
  top: 6rem;
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: #fff;
}

.primary-navigation ul,
.mobile-primary-navigation ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.primary-navigation .primary-navigation-group + .primary-navigation-group {
  margin-top: 1rem;
}

.primary-navigation .primary-navigation-group > strong,
.mobile-primary-navigation .primary-navigation-group > strong {
  display: block;
  margin: 0 0 0.3rem;
  color: var(--muted);
  font-size: 0.85rem;
  letter-spacing: 0.02em;
}

.primary-navigation .primary-navigation-group > ul,
.mobile-primary-navigation .primary-navigation-group > ul {
  margin-top: 0.25rem;
}

.primary-navigation li + li,
.mobile-primary-navigation li + li {
  margin-top: 0.25rem;
}

.primary-navigation a,
.mobile-primary-navigation a {
  display: block;
  border-radius: 0.35rem;
  padding: 0.35rem 0.6rem;
  text-decoration: none;
}

.primary-navigation a[aria-current="page"],
.mobile-primary-navigation a[aria-current="page"] {
  border-left: 3px solid var(--gold);
  background: #fef3c7;
  color: var(--navy);
  font-weight: 700;
  padding-left: calc(0.6rem - 3px);
}

.mobile-primary-navigation {
  display: none;
}

article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 18rem);
  gap: 2rem;
  min-width: 0;
  align-items: start;
}

.document-body {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  line-height: 1.25;
  scroll-margin-top: 6rem;
}

h1 {
  font-size: clamp(1.8rem, 4vw, 2.7rem);
}

h2 {
  margin-top: 2.25rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.35rem;
}

table {
  border-collapse: collapse;
  width: 100%;
  max-width: 100%;
  display: block;
  overflow-x: auto;
  margin: 1rem 0;
}

th,
td {
  border: 1px solid var(--border);
  padding: 0.55rem 0.7rem;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
}

pre {
  max-width: 100%;
  overflow-x: auto;
  background: var(--code);
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 0.5rem;
}

code {
  background: #f1f5f9;
  border-radius: 0.25rem;
  padding: 0.1rem 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

pre code {
  background: none;
  padding: 0;
}

.toc {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fff;
  position: sticky;
  top: 6rem;
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
}

.document-body:only-child {
  grid-column: 1 / -1;
}

.toc ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.toc-level-3 {
  padding-left: 1rem;
}

.canonical-image-link {
  display: inline-block;
  max-width: 100%;
  border: 1px solid var(--border);
  padding: 0.25rem;
  background: #fff;
}

.canonical-image-link img {
  display: block;
  max-width: 100%;
  height: auto;
}

blockquote {
  border-left: 4px solid var(--gold);
  margin: 1rem 0;
  padding: 0.25rem 1rem;
  color: var(--muted);
}

@media (max-width: 1023px) {
  header {
    position: static;
  }

  main {
    display: block;
    max-width: none;
    padding: 1.25rem 1rem;
  }

  .primary-navigation {
    display: none;
  }

  .mobile-primary-navigation {
    display: block;
    margin-bottom: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    background: #fff;
  }

  .mobile-primary-navigation summary {
    cursor: pointer;
    font-weight: 700;
  }

  .mobile-primary-navigation nav {
    margin-top: 0.75rem;
  }

  article {
    display: block;
  }

  .toc {
    position: static;
    max-height: none;
    overflow: visible;
    margin-bottom: 1.25rem;
  }
}
`;
