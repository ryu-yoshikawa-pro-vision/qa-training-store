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

export const MARKDOWN_CSS = `:root{color-scheme:light;--navy:#111827;--muted:#475569;--border:#e2e8f0;--gold:#7a5b22;--surface:#fffdf8;--code:#f8fafc}*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--navy);font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:#1d4ed8}header{border-bottom:1px solid var(--border);background:#fff;padding:1rem clamp(1rem,4vw,3rem);position:sticky;top:0;z-index:2}header .brand{font-weight:700;font-size:1.1rem}header .label{margin-left:.75rem;color:var(--gold);font-size:.8rem;border:1px solid var(--gold);border-radius:999px;padding:.15rem .55rem}nav ul{display:flex;flex-wrap:wrap;gap:.4rem 1rem;margin:.75rem 0 0;padding:0;list-style:none}main{display:grid;grid-template-columns:minmax(0,1fr) minmax(12rem,18rem);gap:2rem;max-width:1280px;margin:0 auto;padding:2rem clamp(1rem,4vw,3rem)}article{min-width:0}h1,h2,h3,h4,h5,h6{line-height:1.25;scroll-margin-top:6rem}h1{font-size:clamp(1.8rem,4vw,2.7rem)}h2{margin-top:2.25rem;border-bottom:1px solid var(--border);padding-bottom:.35rem}table{border-collapse:collapse;width:100%;display:block;overflow-x:auto;margin:1rem 0}th,td{border:1px solid var(--border);padding:.55rem .7rem;text-align:left;vertical-align:top}th{background:#f8fafc}pre{overflow-x:auto;background:var(--code);border:1px solid var(--border);padding:1rem;border-radius:.5rem}code{background:#f1f5f9;border-radius:.25rem;padding:.1rem .25rem;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}pre code{background:none;padding:0}.toc{border:1px solid var(--border);border-radius:.5rem;padding:.75rem 1rem;background:#fff;position:sticky;top:7rem;max-height:70vh;overflow:auto}.toc ul{list-style:none;padding:0;margin:.5rem 0}.toc-level-3{padding-left:1rem}.canonical-image-link{display:inline-block;max-width:100%;border:1px solid var(--border);padding:.25rem;background:#fff}.canonical-image-link img{display:block;max-width:100%;height:auto}blockquote{border-left:4px solid var(--gold);margin:1rem 0;padding:.25rem 1rem;color:var(--muted)}@media(max-width:800px){header{position:static}main{display:block;padding:1.25rem 1rem}.toc{position:static;max-height:none;margin-bottom:1.25rem}nav ul{display:block}nav li{margin:.25rem 0}}`;
