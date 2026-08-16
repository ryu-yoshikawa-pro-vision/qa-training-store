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
            : `<a href="${escapeHtml(linkTarget(target))}">${renderInline(label, linkTarget)}</a>`;
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
