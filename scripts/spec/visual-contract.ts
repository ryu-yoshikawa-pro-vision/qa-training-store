import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { listSpecMarkdown } from "./build-spec";
import { parseMarkdownFile, type ParsedMarkdown } from "./markdown";
import {
  VISUAL_CAPTURE_CASE_BY_KEY,
  VISUAL_CAPTURE_CASES,
  validateVisualCaptureRegistry,
  visualAssetPath,
  type VisualPlatform,
} from "./visual-registry";

export type VisualContractIssue = {
  file: string;
  line?: number;
  message: string;
};

export type ScreenCatalogEntry = {
  screenId: string;
  title: string;
  screenClass: "Product" | "Supporting" | "Boundary" | "Test-only";
  route: string;
  web: string;
  android: string;
  audience: string;
  primarySpec: string;
};

export type VisualState = {
  screenId: string;
  slug: string;
  type: string;
  audience: string;
  condition: string;
  expectedUi: string;
  requirement: "required" | "shared" | "not-applicable";
  platforms: VisualPlatform[] | ["-"];
  detail: string;
  oracle: string;
  file: string;
  line: number;
};

export type VisualContractSummary = {
  screens: ScreenCatalogEntry[];
  states: VisualState[];
  requiredVisualStateCount: number;
  captureTargetCount: number;
  capturedTargetCount: number;
  pendingTargetCount: number;
  blockedTargetCount: number;
  sharedVisualStateCount: number;
  notApplicableVisualStateCount: number;
  canonicalAssetCount: number;
  canonicalAssetTotalBytes: number;
};

const SCREEN_ID = /^SCREEN-[A-Z0-9]+(?:-[A-Z0-9]+)+$/;
const STATE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATE_TYPES = new Set([
  "baseline",
  "domain",
  "empty",
  "loading",
  "error",
  "conflict",
  "permission",
  "responsive",
  "boundary",
  "transient",
]);
const ROLES = new Set(["guest", "customer", "operator", "admin", "all"]);
const PLATFORMS: readonly VisualPlatform[] = [
  "web-desktop",
  "web-tablet",
  "web-mobile",
  "web-small-mobile",
  "android",
];
const PLATFORM_SET = new Set<string>(PLATFORMS);
const TARGET_STATUSES = new Set(["pending", "captured", "blocked"]);
const STATE_COLUMNS = [
  "State slug",
  "Type",
  "Audience / Role",
  "Condition / Scenario",
  "Expected UI",
  "Visual requirement",
  "Required platforms",
  "Visual detail",
  "Related Oracle",
] as const;
const ROOT_OWNER_FILES = new Set([
  "docs/spec/product-scope.md",
  "docs/spec/roles-and-permissions.md",
  "docs/spec/state-and-scenarios.md",
  "docs/spec/ui-ux-contract.md",
]);

function addIssue(
  issues: VisualContractIssue[],
  file: string,
  message: string,
  line?: number,
): void {
  issues.push(line === undefined ? { file, message } : { file, line, message });
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function stripCode(value: string): string {
  return value.replace(/^`|`$/g, "").trim();
}

function parseLink(value: string): string | null {
  return /^\[[^\]]+\]\(([^)]+)\)$/.exec(value)?.[1] ?? null;
}

function resolveSpecPath(source: string, target: string): string {
  const [fileTarget = ""] = target.split("#", 1);
  return path.posix.normalize(path.posix.join(path.posix.dirname(source), fileTarget));
}

export function parseScreenCatalog(rootDir = process.cwd()): ScreenCatalogEntry[] {
  const relativePath = "docs/spec/screen-catalog.md";
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
  const entries: ScreenCatalogEntry[] = [];
  lines.forEach((line, index) => {
    if (!line.trim().startsWith("| `SCREEN-")) return;
    const row = cells(line);
    if (row.length !== 8) return;
    const screenId = stripCode(row[0] ?? "");
    const screenClass = stripCode(row[2] ?? "") as ScreenCatalogEntry["screenClass"];
    const primarySpec = parseLink(row[7] ?? "");
    if (primarySpec === null) return;
    entries.push({
      screenId,
      title: row[1] ?? "",
      screenClass,
      route: stripCode(row[3] ?? ""),
      web: row[4] ?? "",
      android: row[5] ?? "",
      audience: row[6] ?? "",
      primarySpec: resolveSpecPath(relativePath, primarySpec),
    });
    void index;
  });
  return entries;
}

function parsePlatformList(value: string): VisualPlatform[] | ["-"] | null {
  const normalized = stripCode(value);
  if (normalized === "-") return ["-"];
  if (normalized.length === 0) return null;
  const result = normalized.split(",").map((item) => item.trim()) as VisualPlatform[];
  if (result.some((item) => !PLATFORM_SET.has(item))) return null;
  return result;
}

function parseAudience(value: string): string[] {
  return stripCode(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findStateTables(
  parsed: ParsedMarkdown,
  screenId: string,
  issues: VisualContractIssue[],
): VisualState[] {
  const states: VisualState[] = [];
  const screenHeadings = parsed.headings.filter(
    (heading) => heading.level === 3 && heading.text.startsWith("SCREEN-"),
  );
  for (const heading of screenHeadings) {
    if (heading.text.split(" — ", 1)[0] !== screenId) continue;
    const end = parsed.lines.findIndex(
      (line, index) =>
        index > heading.line - 1 && (/^### SCREEN-/.test(line) || /^##\s+/.test(line)),
    );
    const sectionEnd = end === -1 ? parsed.lines.length : end;
    const start = parsed.lines.findIndex(
      (line, index) => index > heading.line - 1 && line.trim() === "#### Important UI States",
    );
    if (start === -1 || start >= sectionEnd) {
      addIssue(
        issues,
        parsed.relativePath,
        `${screenId} is missing #### Important UI States`,
        heading.line,
      );
      continue;
    }
    const table: { line: string; number: number }[] = [];
    for (let index = start + 1; index < sectionEnd; index += 1) {
      const line = parsed.lines[index] ?? "";
      if (line.trim().startsWith("|") || (table.length > 0 && line.trim() === "")) {
        if (line.trim().startsWith("|")) table.push({ line, number: index + 1 });
        else if (table.length > 0) break;
      } else if (table.length > 0 && /^#{1,6}\s+/.test(line)) break;
    }
    const header = cells(table[0]?.line ?? "");
    if (header.join("|") !== STATE_COLUMNS.join("|")) {
      addIssue(
        issues,
        parsed.relativePath,
        `${screenId} state table columns do not match fixed grammar`,
        table[0]?.number ?? heading.line,
      );
      continue;
    }
    for (const row of table.slice(2)) {
      const values = cells(row.line);
      if (values.length !== STATE_COLUMNS.length) {
        addIssue(
          issues,
          parsed.relativePath,
          `${screenId} state row must contain ${STATE_COLUMNS.length} columns`,
          row.number,
        );
        continue;
      }
      const slug = stripCode(values[0] ?? "");
      const type = stripCode(values[1] ?? "");
      const audience = stripCode(values[2] ?? "");
      const platforms = parsePlatformList(values[6] ?? "");
      const requirement = stripCode(values[5] ?? "") as VisualState["requirement"];
      if (!STATE_SLUG.test(slug))
        addIssue(issues, parsed.relativePath, `invalid state slug: ${slug}`, row.number);
      if (!STATE_TYPES.has(type))
        addIssue(issues, parsed.relativePath, `invalid state type: ${type}`, row.number);
      if (parseAudience(audience).some((role) => !ROLES.has(role)))
        addIssue(issues, parsed.relativePath, `invalid audience / role: ${audience}`, row.number);
      if (platforms === null)
        addIssue(
          issues,
          parsed.relativePath,
          `invalid required platforms: ${values[6] ?? ""}`,
          row.number,
        );
      if (!new Set(["required", "shared", "not-applicable"]).has(requirement))
        addIssue(
          issues,
          parsed.relativePath,
          `invalid visual requirement: ${requirement}`,
          row.number,
        );
      if (requirement === "not-applicable" && (platforms === null || platforms[0] !== "-"))
        addIssue(
          issues,
          parsed.relativePath,
          "not-applicable state must use required platforms '-'",
          row.number,
        );
      if (requirement !== "not-applicable" && (platforms === null || platforms[0] === "-"))
        addIssue(
          issues,
          parsed.relativePath,
          "required/shared state must list platforms",
          row.number,
        );
      if (requirement === "not-applicable" && !/^reason: .+/.test(stripCode(values[7] ?? "")))
        addIssue(
          issues,
          parsed.relativePath,
          "not-applicable state must contain a reason",
          row.number,
        );
      if (requirement === "required" && stripCode(values[7] ?? "") !== "-")
        addIssue(
          issues,
          parsed.relativePath,
          "required state Visual detail must be '-'",
          row.number,
        );
      states.push({
        screenId,
        slug,
        type,
        audience,
        condition: stripCode(values[3] ?? ""),
        expectedUi: stripCode(values[4] ?? ""),
        requirement,
        platforms: platforms ?? ["-"],
        detail: stripCode(values[7] ?? ""),
        oracle: stripCode(values[8] ?? ""),
        file: parsed.relativePath,
        line: row.number,
      });
    }
  }
  const slugs = new Set<string>();
  for (const state of states) {
    if (slugs.has(state.slug))
      addIssue(
        issues,
        state.file,
        `duplicate state slug: ${state.screenId}/${state.slug}`,
        state.line,
      );
    slugs.add(state.slug);
  }
  return states;
}

export function collectVisualStates(
  rootDir = process.cwd(),
  catalog = parseScreenCatalog(rootDir),
  issues: VisualContractIssue[] = [],
): VisualState[] {
  const parsed = new Map<string, ParsedMarkdown>();
  for (const relativePath of listSpecMarkdown(rootDir)) {
    parsed.set(relativePath, parseMarkdownFile(path.join(rootDir, relativePath), relativePath));
  }
  const states: VisualState[] = [];
  const owned = new Map<string, string>();
  for (const entry of catalog) {
    if (!SCREEN_ID.test(entry.screenId))
      addIssue(issues, "docs/spec/screen-catalog.md", `invalid Screen ID: ${entry.screenId}`);
    if (!new Set(["Product", "Supporting", "Boundary", "Test-only"]).has(entry.screenClass))
      addIssue(issues, "docs/spec/screen-catalog.md", `invalid Screen class: ${entry.screenClass}`);
    if (owned.has(entry.screenId))
      addIssue(issues, "docs/spec/screen-catalog.md", `duplicate Screen ID: ${entry.screenId}`);
    owned.set(entry.screenId, entry.primarySpec);
    const owner = parsed.get(entry.primarySpec);
    if (owner === undefined) {
      addIssue(
        issues,
        "docs/spec/screen-catalog.md",
        `Primary specification does not exist: ${entry.primarySpec}`,
      );
      continue;
    }
    const sections = owner.headings.filter(
      (heading) => heading.level === 3 && heading.text.startsWith(`${entry.screenId} — `),
    );
    if (sections.length !== 1)
      addIssue(
        issues,
        entry.primarySpec,
        `${entry.screenId} must have exactly one Screen Contract section`,
      );
    if (sections.length === 1) {
      const section = sections[0]!;
      const parent = [...owner.headings]
        .reverse()
        .find((heading) => heading.level === 2 && heading.line < section.line);
      const expectedParent = entry.primarySpec.startsWith("docs/spec/features/")
        ? "UI / Behavior Contract"
        : "Screen Contracts";
      if (parent?.text !== expectedParent)
        addIssue(
          issues,
          entry.primarySpec,
          `${entry.screenId} must be directly under ## ${expectedParent}`,
          section.line,
        );
      states.push(...findStateTables(owner, entry.screenId, issues));
    }
  }
  const ownedRootFiles = new Set(
    catalog
      .filter((entry) => ROOT_OWNER_FILES.has(entry.primarySpec))
      .map((entry) => entry.primarySpec),
  );
  for (const relativePath of ownedRootFiles) {
    const parsedSpec = parsed.get(relativePath);
    if (parsedSpec === undefined) continue;
    const contracts = parsedSpec.headings.filter(
      (heading) => heading.level === 2 && heading.text === "Screen Contracts",
    );
    if (contracts.length !== 1)
      addIssue(
        issues,
        relativePath,
        "Normative root owner with Screen Contracts must have exactly one ## Screen Contracts",
      );
  }
  for (const parsedFile of parsed.values()) {
    for (const heading of parsedFile.headings.filter(
      (candidate) => candidate.level === 3 && candidate.text.startsWith("SCREEN-"),
    )) {
      const screenId = heading.text.split(" — ", 1)[0] ?? heading.text;
      const owner = owned.get(screenId);
      if (owner !== parsedFile.relativePath)
        addIssue(
          issues,
          parsedFile.relativePath,
          `Screen Contract is not owned by Catalog Primary specification: ${screenId}`,
          heading.line,
        );
    }
  }
  for (const entry of catalog) {
    if (
      entry.screenClass === "Product" ||
      entry.screenClass === "Supporting" ||
      entry.screenClass === "Boundary"
    ) {
      if (!states.some((state) => state.screenId === entry.screenId && state.type === "baseline"))
        addIssue(issues, entry.primarySpec, `${entry.screenId} must have a baseline state`);
    }
  }
  return states;
}

function normalizeReferenceTarget(target: string): string {
  const [withoutHash = ""] = target.split("#", 1);
  return withoutHash.replaceAll("\\", "/");
}

function visualReferencesForState(parsed: ParsedMarkdown, state: VisualState): string[] {
  const heading = parsed.headings.find(
    (candidate) => candidate.level === 3 && candidate.text.startsWith(`${state.screenId} — `),
  );
  if (heading === undefined) return [];
  const end = parsed.lines.findIndex(
    (line, index) => index > heading.line - 1 && (/^### SCREEN-/.test(line) || /^##\s+/.test(line)),
  );
  const sectionEnd = end === -1 ? parsed.lines.length : end;
  const visualHeading = parsed.lines.findIndex(
    (line, index) =>
      index > heading.line - 1 && index < sectionEnd && line.trim() === "#### Visual References",
  );
  if (visualHeading === -1) return [];
  const stateHeading = parsed.lines.findIndex(
    (line, index) =>
      index > visualHeading && index < sectionEnd && line.trim() === `##### \`${state.slug}\``,
  );
  if (stateHeading === -1) return [];
  const nextHeading = parsed.lines.findIndex(
    (line, index) => index > stateHeading && index < sectionEnd && /^#####\s+/.test(line),
  );
  const endIndex = nextHeading === -1 ? sectionEnd : nextHeading;
  const refs: string[] = [];
  for (let index = stateHeading + 1; index < endIndex; index += 1) {
    const line = parsed.lines[index] ?? "";
    for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)/g))
      refs.push(resolveSpecPath(parsed.relativePath, normalizeReferenceTarget(match[1] ?? "")));
  }
  return refs;
}

function routeMatches(pattern: string, actual: string): boolean {
  if (pattern === actual) return true;
  const patternParts = pattern.split("/").filter(Boolean);
  const actualParts = actual.split("/").filter(Boolean);
  return (
    patternParts.length === actualParts.length &&
    patternParts.every((part, index) => /^\[[^\]]+\]$/.test(part) || part === actualParts[index])
  );
}

function appRouteEntries(rootDir: string): { route: string; file: string }[] {
  const appRoot = path.join(rootDir, "app");
  const result: { route: string; file: string }[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && /\.(?:native\.)?tsx$/.test(entry.name)) {
        const relative = path.relative(appRoot, absolute).split(path.sep).join("/");
        if (relative.startsWith("_") || relative.includes("/_")) continue;
        const routeFile = relative.replace(/\.native\.tsx$|\.tsx$/i, "");
        const route =
          routeFile === "index"
            ? "/"
            : routeFile.endsWith("/index")
              ? `/${routeFile.slice(0, -6)}`
              : `/${routeFile}`;
        result.push({ route: route || "/", file: `app/${relative}` });
      }
    }
  };
  visit(appRoot);
  return result;
}

function validateRoutes(
  rootDir: string,
  catalog: ScreenCatalogEntry[],
  issues: VisualContractIssue[],
): void {
  const routable = appRouteEntries(rootDir);
  for (const entry of routable) {
    if (!catalog.some((screen) => routeMatches(screen.route, entry.route)))
      addIssue(issues, entry.file, `route is not registered in Screen Catalog: ${entry.route}`);
  }
}

async function inspectAsset(
  rootDir: string,
  relativePath: string,
  issues: VisualContractIssue[],
): Promise<number> {
  const absolutePath = path.join(rootDir, relativePath);
  try {
    const metadata = await sharp(absolutePath).metadata();
    const size = fs.statSync(absolutePath).size;
    if (metadata.format !== "webp")
      addIssue(
        issues,
        relativePath,
        `canonical asset must be WebP, got ${metadata.format ?? "unknown"}`,
      );
    if (
      !Number.isInteger(metadata.width) ||
      !Number.isInteger(metadata.height) ||
      metadata.width <= 0 ||
      metadata.height <= 0
    )
      addIssue(issues, relativePath, "canonical asset must have positive dimensions");
    if (size <= 0 || size > 1024 * 1024)
      addIssue(issues, relativePath, `canonical asset size must be 1..1048576 bytes, got ${size}`);
    return size;
  } catch (error) {
    addIssue(
      issues,
      relativePath,
      `canonical asset cannot be decoded: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 0;
  }
}

export async function validateVisualContract(
  rootDir = process.cwd(),
): Promise<{ issues: VisualContractIssue[]; summary: VisualContractSummary }> {
  const issues: VisualContractIssue[] = [];
  const catalog = parseScreenCatalog(rootDir);
  if (catalog.length === 0)
    addIssue(issues, "docs/spec/screen-catalog.md", "Screen Catalog is missing or has no rows");
  const states = collectVisualStates(rootDir, catalog, issues);
  for (const issue of validateVisualCaptureRegistry())
    addIssue(issues, "scripts/spec/visual-registry.ts", issue);
  validateRoutes(rootDir, catalog, issues);
  const stateByKey = new Map(states.map((state) => [`${state.screenId}/${state.slug}`, state]));
  const parsedFiles = new Map(
    listSpecMarkdown(rootDir).map((relativePath) => [
      relativePath,
      parseMarkdownFile(path.join(rootDir, relativePath), relativePath),
    ]),
  );
  const referencedAssets = new Set<string>();
  let captureTargetCount = 0;
  let capturedTargetCount = 0;
  let pendingTargetCount = 0;
  let blockedTargetCount = 0;
  let sharedVisualStateCount = 0;
  let notApplicableVisualStateCount = 0;
  const requiredTargetKeys = new Set<string>();
  for (const state of states) {
    if (state.requirement === "not-applicable") {
      notApplicableVisualStateCount += 1;
      if (visualReferencesForState(parsedFiles.get(state.file)!, state).length > 0)
        addIssue(
          issues,
          state.file,
          `not-applicable state must not have a visual reference: ${state.screenId}/${state.slug}`,
          state.line,
        );
      continue;
    }
    if (state.requirement === "shared") sharedVisualStateCount += 1;
    const platforms = state.platforms as VisualPlatform[];
    for (const platform of platforms) {
      captureTargetCount += 1;
      const key = `${state.screenId}/${state.slug}/${platform}`;
      requiredTargetKeys.add(key);
      const captureCase = VISUAL_CAPTURE_CASE_BY_KEY.get(key);
      if (captureCase === undefined) {
        addIssue(issues, state.file, `required state has no Capture Case: ${key}`, state.line);
        continue;
      }
      if (!TARGET_STATUSES.has(captureCase.status))
        addIssue(
          issues,
          "scripts/spec/visual-registry.ts",
          `invalid Capture Target status: ${key}`,
        );
      if (
        captureCase.screenId !== state.screenId ||
        captureCase.stateSlug !== state.slug ||
        captureCase.platform !== platform
      )
        addIssue(
          issues,
          "scripts/spec/visual-registry.ts",
          `Capture Case metadata mismatch: ${key}`,
        );
      const refs = visualReferencesForState(parsedFiles.get(state.file)!, state);
      const asset = visualAssetPath(captureCase);
      if (captureCase.status === "captured") {
        capturedTargetCount += 1;
        if (captureCase.blockerReason !== null)
          addIssue(
            issues,
            "scripts/spec/visual-registry.ts",
            `captured Target cannot have blockerReason: ${key}`,
          );
        if (!fs.existsSync(path.join(rootDir, asset)))
          addIssue(issues, asset, `captured Target asset is missing: ${key}`);
        else {
          referencedAssets.add(asset);
          await inspectAsset(rootDir, asset, issues);
        }
        if (!refs.includes(asset))
          addIssue(
            issues,
            state.file,
            `captured Target requires Markdown image reference: ${asset}`,
            state.line,
          );
      } else if (captureCase.status === "blocked") {
        blockedTargetCount += 1;
        if (captureCase.blockerReason === null || captureCase.blockerReason.trim() === "")
          addIssue(
            issues,
            "scripts/spec/visual-registry.ts",
            `blocked Target requires blockerReason: ${key}`,
          );
        if (refs.includes(asset))
          addIssue(
            issues,
            state.file,
            `blocked Target must not reference canonical asset: ${asset}`,
            state.line,
          );
      } else {
        pendingTargetCount += 1;
        if (refs.includes(asset))
          addIssue(
            issues,
            state.file,
            `pending Target must not reference canonical asset: ${asset}`,
            state.line,
          );
      }
      if (state.requirement === "shared") {
        const refsInDetail =
          state.detail.match(/([a-z0-9-]+)=ref:\s+(SCREEN-[A-Z0-9-]+\/[a-z0-9-]+\/[a-z-]+)/g) ?? [];
        if (refsInDetail.length === 0)
          addIssue(
            issues,
            state.file,
            `shared state requires direct platform reference: ${key}`,
            state.line,
          );
        for (const ref of refsInDetail) {
          const target = ref.split("ref:", 2)[1]?.trim() ?? "";
          const targetState = stateByKey.get(target.split("/").slice(0, 2).join("/"));
          if (targetState?.requirement !== "required")
            addIssue(
              issues,
              state.file,
              `shared state must reference required state: ${target}`,
              state.line,
            );
        }
      }
    }
  }
  for (const captureCase of VISUAL_CAPTURE_CASES) {
    if (!requiredTargetKeys.has(captureCase.captureCaseKey))
      addIssue(
        issues,
        "scripts/spec/visual-registry.ts",
        `Capture Case is not connected to a required State: ${captureCase.captureCaseKey}`,
      );
  }
  const assetRoot = path.join(rootDir, "docs/spec/assets/screens");
  let canonicalAssetCount = 0;
  let canonicalAssetTotalBytes = 0;
  if (fs.existsSync(assetRoot)) {
    const visit = async (directory: string): Promise<void> => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) await visit(absolute);
        else if (entry.isFile()) {
          const relative = path.relative(rootDir, absolute).split(path.sep).join("/");
          canonicalAssetCount += 1;
          canonicalAssetTotalBytes += await inspectAsset(rootDir, relative, issues);
          if (!referencedAssets.has(relative))
            addIssue(
              issues,
              relative,
              "orphan canonical asset is not referenced by a captured Target",
            );
        }
      }
    };
    await visit(assetRoot);
  }
  const summary: VisualContractSummary = {
    screens: catalog,
    states,
    requiredVisualStateCount: states.filter((state) => state.requirement === "required").length,
    captureTargetCount,
    capturedTargetCount,
    pendingTargetCount,
    blockedTargetCount,
    sharedVisualStateCount,
    notApplicableVisualStateCount,
    canonicalAssetCount,
    canonicalAssetTotalBytes,
  };
  return { issues, summary };
}

export function formatVisualSummary(summary: VisualContractSummary): string {
  return [
    `Catalog Universe Count: ${summary.screens.length}`,
    `Product Screen Count: ${summary.screens.filter((screen) => screen.screenClass === "Product").length}`,
    `Supporting Screen Count: ${summary.screens.filter((screen) => screen.screenClass === "Supporting").length}`,
    `Boundary Screen Count: ${summary.screens.filter((screen) => screen.screenClass === "Boundary").length}`,
    `Test-only Screen Count: ${summary.screens.filter((screen) => screen.screenClass === "Test-only").length}`,
    `Important State Count: ${summary.states.length}`,
    `Required Visual State Count: ${summary.requiredVisualStateCount}`,
    `Capture Target Count: ${summary.captureTargetCount}`,
    `Captured Target Count: ${summary.capturedTargetCount}`,
    `Pending Target Count: ${summary.pendingTargetCount}`,
    `Blocked Target Count: ${summary.blockedTargetCount}`,
    `Shared Visual State Count: ${summary.sharedVisualStateCount}`,
    `Not-applicable Visual State Count: ${summary.notApplicableVisualStateCount}`,
    `Canonical Asset Count: ${summary.canonicalAssetCount}`,
    `Canonical Asset Total Bytes: ${summary.canonicalAssetTotalBytes}`,
  ].join("\n");
}

export async function assertValidVisualContract(
  rootDir = process.cwd(),
): Promise<VisualContractSummary> {
  const result = await validateVisualContract(rootDir);
  if (result.issues.length > 0) {
    throw new Error(
      result.issues
        .map(
          (item) =>
            `${item.file}${item.line === undefined ? "" : `:${item.line}`}: ${item.message}`,
        )
        .join("\n"),
    );
  }
  return result.summary;
}
