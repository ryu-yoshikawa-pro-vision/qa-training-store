import fs from "node:fs";
import path from "node:path";
import { listSpecMarkdown } from "./build-spec";
import {
  collectVisualStates,
  parseScreenCatalog,
  type VisualContractIssue,
} from "./visual-contract";
import { VISUAL_CAPTURE_CASES, visualAssetPath } from "./visual-registry";

const rootDir = process.cwd();

function relativeAssetPath(specFile: string, asset: string): string {
  return path.posix.relative(path.posix.dirname(specFile), asset);
}

function platformLabel(platform: string): string {
  return platform
    .replace("web-desktop", "Web Desktop")
    .replace("web-tablet", "Web Tablet")
    .replace("web-mobile", "Web Mobile")
    .replace("web-small-mobile", "Web Small Mobile")
    .replace("android", "Android");
}

function sectionBounds(lines: string[], screenId: string): { start: number; end: number } | null {
  const start = lines.findIndex((line) => line.startsWith(`### ${screenId} — `));
  if (start === -1) return null;
  const next = lines.findIndex(
    (line, index) => index > start && (/^### SCREEN-/.test(line) || /^##\s+/.test(line)),
  );
  return { start, end: next === -1 ? lines.length : next };
}

function stateHeadingIndex(
  lines: string[],
  bounds: { start: number; end: number },
  slug: string,
): number {
  return lines.findIndex(
    (line, index) =>
      index > bounds.start && index < bounds.end && line.trim() === `##### \`${slug}\``,
  );
}

function nextStateHeading(lines: string[], from: number, end: number): number {
  const next = lines.findIndex(
    (line, index) => index > from && index < end && /^#####\s+/.test(line),
  );
  return next === -1 ? end : next;
}

function hasAssetReference(lines: string[], start: number, end: number, asset: string): boolean {
  return lines.slice(start, end).some((line) => line.includes(asset));
}

async function main(): Promise<void> {
  const catalog = parseScreenCatalog(rootDir);
  const issues: VisualContractIssue[] = [];
  const states = collectVisualStates(rootDir, catalog, issues);
  if (issues.length > 0)
    throw new Error(issues.map((issue) => `${issue.file}: ${issue.message}`).join("\n"));
  const stateByKey = new Map(states.map((state) => [`${state.screenId}/${state.slug}`, state]));
  const files = new Map<string, string[]>();
  for (const specFile of listSpecMarkdown(rootDir))
    files.set(specFile, fs.readFileSync(path.join(rootDir, specFile), "utf8").split(/\r?\n/));

  let referencesAdded = 0;
  for (const captureCase of VISUAL_CAPTURE_CASES.filter((item) => item.status === "captured")) {
    const state = stateByKey.get(`${captureCase.screenId}/${captureCase.stateSlug}`);
    if (state === undefined) continue;
    const lines = files.get(state.file);
    if (lines === undefined) continue;
    const bounds = sectionBounds(lines, state.screenId);
    if (bounds === null) continue;
    const heading = stateHeadingIndex(lines, bounds, state.slug);
    if (heading === -1)
      throw new Error(`visual state heading is missing: ${state.screenId}/${state.slug}`);
    const end = nextStateHeading(lines, heading, bounds.end);
    const asset = visualAssetPath(captureCase);
    if (hasAssetReference(lines, heading, end, asset)) continue;
    const relative = relativeAssetPath(state.file, asset);
    const block = [
      `###### ${platformLabel(captureCase.platform)} — Canonical Visual Reference`,
      "",
      `[![${captureCase.screenId} ${captureCase.stateSlug} ${captureCase.platform}](${relative})](${relative})`,
    ];
    lines.splice(end, 0, ...block);
    referencesAdded += 1;
  }
  for (const [specFile, lines] of files)
    fs.writeFileSync(path.join(rootDir, specFile), lines.join("\n"));
  console.log(`Materialized Markdown visual references: ${referencesAdded}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
