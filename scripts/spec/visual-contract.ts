import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { isNormativeSpecPath, listSpecMarkdown } from "./build-spec";
import { parseMarkdownFile, type ParsedMarkdown } from "./markdown";
import {
  VISUAL_CAPTURE_CASES,
  validateVisualCaptureRegistry,
  visualAssetPath,
  type CaptureCase,
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

export type VisualContractValidationOptions = {
  /** Final completion validation is intentionally stricter than structural validation. */
  requireComplete?: boolean;
  /** Test and tooling fixtures may supply a registry without changing the production SSOT. */
  captureCases?: readonly CaptureCase[];
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
const PLATFORMS: readonly VisualPlatform[] = [
  "web-desktop",
  "web-tablet",
  "web-mobile",
  "web-small-mobile",
  "android",
];
const PLATFORM_SET = new Set<string>(PLATFORMS);
const AUDIENCE_ORDER = ["guest", "customer", "operator", "admin", "all"] as const;
const AUDIENCE_SET = new Set<string>(AUDIENCE_ORDER);
const TARGET_STATUSES = new Set(["pending", "captured", "blocked"]);
const MAX_TOTAL_ASSET_BYTES = 100 * 1024 * 1024;
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

function validateOrderedUniqueList(
  values: string[],
  allowlist: readonly string[],
  label: string,
  file: string,
  line: number,
  issues: VisualContractIssue[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) addIssue(issues, file, `${label} contains a duplicate: ${value}`, line);
    seen.add(value);
  }
  const indexes = values.map((value) => allowlist.indexOf(value));
  if (indexes.some((index) => index < 0)) return;
  if (indexes.some((index, position) => position > 0 && index < indexes[position - 1]!))
    addIssue(issues, file, `${label} must follow the fixed allowlist order`, line);
}

function audienceAllowsRole(audience: string[], role: CaptureCase["role"]): boolean {
  return audience.includes("all") || audience.includes(role);
}

type ScreenSection = {
  heading: number;
  end: number;
};

function screenSectionBounds(parsed: ParsedMarkdown, headingLine: number): ScreenSection {
  const end = parsed.lines.findIndex(
    (line, index) => index > headingLine - 1 && (/^### SCREEN-/.test(line) || /^##\s+/.test(line)),
  );
  return { heading: headingLine, end: end === -1 ? parsed.lines.length : end };
}

function validateScreenContractGrammar(
  parsed: ParsedMarkdown,
  screenId: string,
  section: ScreenSection,
  issues: VisualContractIssue[],
): void {
  const expected = ["Functions", "Important UI States", "Visual References"];
  const inner = parsed.headings
    .filter(
      (heading) =>
        heading.level === 4 && heading.line > section.heading && heading.line <= section.end,
    )
    .map((heading) => heading.text);
  for (const heading of expected) {
    const count = inner.filter((candidate) => candidate === heading).length;
    if (count !== 1)
      addIssue(
        issues,
        parsed.relativePath,
        `${screenId} must contain exactly one #### ${heading}`,
        section.heading,
      );
  }
  if (
    inner.length !== expected.length ||
    inner.some((heading, index) => heading !== expected[index])
  )
    addIssue(
      issues,
      parsed.relativePath,
      `${screenId} Screen Contract headings must be exactly Functions, Important UI States, Visual References in that order`,
      section.heading,
    );
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
    const section = screenSectionBounds(parsed, heading.line);
    const sectionEnd = section.end;
    validateScreenContractGrammar(parsed, screenId, section, issues);
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
      const audienceRoles = parseAudience(audience);
      if (!STATE_SLUG.test(slug))
        addIssue(issues, parsed.relativePath, `invalid state slug: ${slug}`, row.number);
      if (!STATE_TYPES.has(type))
        addIssue(issues, parsed.relativePath, `invalid state type: ${type}`, row.number);
      if (audienceRoles.length === 0 || audienceRoles.some((role) => !AUDIENCE_SET.has(role)))
        addIssue(issues, parsed.relativePath, `invalid audience / role: ${audience}`, row.number);
      else {
        validateOrderedUniqueList(
          audienceRoles,
          AUDIENCE_ORDER,
          "Audience / Role",
          parsed.relativePath,
          row.number,
          issues,
        );
        if (audienceRoles.length > 1 && audienceRoles.join(", ") !== audience)
          addIssue(
            issues,
            parsed.relativePath,
            "Audience / Role must use comma-space separators",
            row.number,
          );
      }
      if (platforms === null)
        addIssue(
          issues,
          parsed.relativePath,
          `invalid required platforms: ${values[6] ?? ""}`,
          row.number,
        );
      else if (platforms[0] !== "-") {
        validateOrderedUniqueList(
          platforms,
          PLATFORMS,
          "Required platforms",
          parsed.relativePath,
          row.number,
          issues,
        );
        if (platforms.length > 1 && platforms.join(", ") !== stripCode(values[6] ?? ""))
          addIssue(
            issues,
            parsed.relativePath,
            "Required platforms must use comma-space separators",
            row.number,
          );
      }
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
    const screenSections = parsedFile.headings
      .filter((candidate) => candidate.level === 3 && candidate.text.startsWith("SCREEN-"))
      .map((candidate) => screenSectionBounds(parsedFile, candidate.line));
    for (const heading of parsedFile.headings.filter(
      (candidate) =>
        candidate.level === 4 &&
        ["Functions", "Important UI States", "Visual References"].includes(candidate.text),
    )) {
      if (
        !screenSections.some(
          (section) => heading.line > section.heading && heading.line <= section.end,
        )
      )
        addIssue(
          issues,
          parsedFile.relativePath,
          `Screen Contract heading is outside a Screen section: #### ${heading.text}`,
          heading.line,
        );
    }
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

type VisualReference = {
  source: string;
  href: string;
  alt: string;
  line: number;
};

function visualReferencesForState(parsed: ParsedMarkdown, state: VisualState): VisualReference[] {
  const heading = parsed.headings.find(
    (candidate) => candidate.level === 3 && candidate.text.startsWith(`${state.screenId} — `),
  );
  if (heading === undefined) return [];
  const sectionEnd = screenSectionBounds(parsed, heading.line).end;
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
  const refs: VisualReference[] = [];
  for (let index = stateHeading + 1; index < endIndex; index += 1) {
    const line = parsed.lines[index] ?? "";
    const pattern =
      /\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    for (const match of line.matchAll(pattern)) {
      const source = match[2] ?? match[5] ?? "";
      const href = match[3] ?? source;
      refs.push({
        source: resolveSpecPath(parsed.relativePath, normalizeReferenceTarget(source)),
        href: resolveSpecPath(parsed.relativePath, normalizeReferenceTarget(href)),
        alt: match[1] ?? match[4] ?? "",
        line: index + 1,
      });
    }
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
  if (!fs.existsSync(appRoot)) return result;
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
    const size = fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
    addIssue(
      issues,
      relativePath,
      `canonical asset cannot be decoded: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (size <= 0 || size > 1024 * 1024)
      addIssue(issues, relativePath, `canonical asset size must be 1..1048576 bytes, got ${size}`);
    return size;
  }
}

type OracleIndex = {
  businessRules: Set<string>;
  acceptanceCriteria: Set<string>;
};

function collectOracleIndex(parsedFiles: Iterable<ParsedMarkdown>): OracleIndex {
  const businessRules = new Set<string>();
  const acceptanceCriteria = new Set<string>();
  for (const parsed of parsedFiles) {
    if (!isNormativeSpecPath(parsed.relativePath)) continue;
    for (const line of parsed.lines) {
      const br = /^### (BR-[A-Z0-9]+-[0-9]{3}) — /.exec(line)?.[1];
      const ac = /^#### (AC-[A-Z0-9]+-[0-9]{3}) — /.exec(line)?.[1];
      if (br !== undefined) businessRules.add(br);
      if (ac !== undefined) acceptanceCriteria.add(ac);
    }
  }
  return { businessRules, acceptanceCriteria };
}

function validateRelatedOracle(
  rootDir: string,
  state: VisualState,
  parsedFiles: Map<string, ParsedMarkdown>,
  oracleIndex: OracleIndex,
  issues: VisualContractIssue[],
): void {
  const raw = state.oracle.trim();
  if (raw === "") {
    addIssue(issues, state.file, "Related Oracle must not be empty", state.line);
    return;
  }
  const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let linkCount = 0;
  const remaining = raw.replace(linkPattern, (_all, _label: string, target: string) => {
    linkCount += 1;
    const [fileTarget = "", anchor] = target.split("#", 2);
    const resolved = resolveSpecPath(state.file, target);
    if (/^(?:https?:|mailto:|tel:|\/\/)/i.test(target)) {
      addIssue(issues, state.file, `Related Oracle link must be local: ${target}`, state.line);
      return "";
    }
    if (!isNormativeSpecPath(resolved))
      addIssue(
        issues,
        state.file,
        `Related Oracle link must target a local Normative Spec: ${target}`,
        state.line,
      );
    if (anchor === undefined || anchor.trim() === "")
      addIssue(
        issues,
        state.file,
        `Related Oracle link must include an anchor: ${target}`,
        state.line,
      );
    const absolute = path.join(rootDir, resolved);
    if (!fs.existsSync(absolute)) {
      addIssue(
        issues,
        state.file,
        `Related Oracle link target does not exist: ${target}`,
        state.line,
      );
      return "";
    }
    if (anchor !== undefined && anchor.trim() !== "") {
      const targetParsed = parsedFiles.get(resolved) ?? parseMarkdownFile(absolute, resolved);
      if (!targetParsed.headings.some((heading) => heading.anchor === anchor))
        addIssue(issues, state.file, `Related Oracle anchor does not exist: ${target}`, state.line);
    }
    void fileTarget;
    return "";
  });
  for (const fragment of remaining.split(",")) {
    const token = fragment.replaceAll("`", "").trim();
    if (token === "") continue;
    if (token.startsWith("BR-")) {
      if (!oracleIndex.businessRules.has(token))
        addIssue(issues, state.file, `Related Oracle references unknown BR: ${token}`, state.line);
    } else if (token.startsWith("AC-")) {
      if (!oracleIndex.acceptanceCriteria.has(token))
        addIssue(issues, state.file, `Related Oracle references unknown AC: ${token}`, state.line);
    } else {
      addIssue(
        issues,
        state.file,
        `Related Oracle must be a BR-/AC- ID or local Normative Spec link: ${token}`,
        state.line,
      );
    }
  }
  if (linkCount === 0 && remaining.trim() === "")
    addIssue(issues, state.file, "Related Oracle must contain a supported oracle", state.line);
}

type SharedReference = {
  platform: VisualPlatform;
  target: string;
};

function parseSharedReferences(detail: string): SharedReference[] | null {
  const parts = detail.split(";").map((part) => part.trim());
  if (parts.length === 0 || parts.some((part) => part === "")) return null;
  const platformPattern = PLATFORMS.join("|");
  const stateSlugPattern = STATE_SLUG.source.slice(1, -1);
  const references: SharedReference[] = [];
  for (const part of parts) {
    const match = new RegExp(
      `^(${platformPattern})=ref: (SCREEN-[A-Z0-9]+(?:-[A-Z0-9]+)+)/(${stateSlugPattern})/(${platformPattern})$`,
    ).exec(part);
    if (match === null) return null;
    references.push({
      platform: match[1] as VisualPlatform,
      target: `${match[2]}/${match[3]}`,
    });
    if (match[1] !== match[4]) return null;
  }
  return references;
}

function addIssueForVisualReferenceAlt(
  references: VisualReference[],
  state: VisualState,
  issues: VisualContractIssue[],
): void {
  for (const reference of references) {
    if (reference.alt.trim() === "")
      addIssue(
        issues,
        state.file,
        "canonical visual reference alt must be non-empty",
        reference.line,
      );
  }
}

function referenceTargetsAsset(reference: VisualReference, asset: string): boolean {
  return reference.source === asset && reference.href === asset;
}

export async function validateVisualContract(
  rootDir = process.cwd(),
  options: VisualContractValidationOptions = {},
): Promise<{ issues: VisualContractIssue[]; summary: VisualContractSummary }> {
  const issues: VisualContractIssue[] = [];
  const catalog = parseScreenCatalog(rootDir);
  if (catalog.length === 0)
    addIssue(issues, "docs/spec/screen-catalog.md", "Screen Catalog is missing or has no rows");
  const states = collectVisualStates(rootDir, catalog, issues);
  const captureCases = options.captureCases ?? VISUAL_CAPTURE_CASES;
  const captureCasesByKey = new Map(
    captureCases.map((captureCase) => [captureCase.captureCaseKey, captureCase]),
  );
  for (const issue of validateVisualCaptureRegistry(captureCases))
    addIssue(issues, "scripts/spec/visual-registry.ts", issue);
  validateRoutes(rootDir, catalog, issues);
  const stateByKey = new Map(states.map((state) => [`${state.screenId}/${state.slug}`, state]));
  const parsedFiles = new Map(
    listSpecMarkdown(rootDir).map((relativePath) => [
      relativePath,
      parseMarkdownFile(path.join(rootDir, relativePath), relativePath),
    ]),
  );
  const oracleIndex = collectOracleIndex(parsedFiles.values());
  const referencedAssets = new Set<string>();
  let captureTargetCount = 0;
  let capturedTargetCount = 0;
  let pendingTargetCount = 0;
  let blockedTargetCount = 0;
  let sharedVisualStateCount = 0;
  let notApplicableVisualStateCount = 0;
  const requiredTargetKeys = new Set<string>();
  const sharedReferencesByState = new Map<string, SharedReference[]>();

  for (const state of states) {
    const parsed = parsedFiles.get(state.file);
    if (parsed === undefined) {
      addIssue(
        issues,
        state.file,
        `state owner file does not exist: ${state.screenId}`,
        state.line,
      );
      continue;
    }
    const references = visualReferencesForState(parsed, state);
    addIssueForVisualReferenceAlt(references, state, issues);
    validateRelatedOracle(rootDir, state, parsedFiles, oracleIndex, issues);

    if (state.requirement === "not-applicable") {
      notApplicableVisualStateCount += 1;
      if (references.length > 0)
        addIssue(
          issues,
          state.file,
          `not-applicable state must not have a visual reference: ${state.screenId}/${state.slug}`,
          state.line,
        );
      continue;
    }
    if (state.requirement === "shared") {
      sharedVisualStateCount += 1;
      const sharedReferences = parseSharedReferences(state.detail);
      if (sharedReferences === null) {
        addIssue(
          issues,
          state.file,
          `shared state Visual detail has invalid grammar: ${state.screenId}/${state.slug}`,
          state.line,
        );
      } else {
        sharedReferencesByState.set(`${state.screenId}/${state.slug}`, sharedReferences);
      }
      continue;
    }

    const platforms = state.platforms as VisualPlatform[];
    for (const platform of platforms) {
      captureTargetCount += 1;
      const key = `${state.screenId}/${state.slug}/${platform}`;
      requiredTargetKeys.add(key);
      const captureCase = captureCasesByKey.get(key);
      if (captureCase === undefined) {
        addIssue(issues, state.file, `required state has no Capture Case: ${key}`, state.line);
        continue;
      }
      if (!audienceAllowsRole(parseAudience(state.audience), captureCase.role))
        addIssue(
          issues,
          "scripts/spec/visual-registry.ts",
          `Capture Case role is outside State Audience / Role: ${key} (${captureCase.role})`,
          state.line,
        );
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
      const asset = visualAssetPath(captureCase);
      const canonicalReferences = references.filter((reference) =>
        referenceTargetsAsset(reference, asset),
      );
      const anyAssetReference = references.some(
        (reference) => reference.source === asset || reference.href === asset,
      );
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
        if (canonicalReferences.length !== 1)
          addIssue(
            issues,
            state.file,
            `captured Target requires exactly one Markdown image reference to ${asset}`,
            state.line,
          );
        if (canonicalReferences.some((reference) => reference.alt.trim() === ""))
          addIssue(
            issues,
            state.file,
            `canonical image alt must be non-empty: ${asset}`,
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
        if (anyAssetReference)
          addIssue(
            issues,
            state.file,
            `blocked Target must not reference canonical asset: ${asset}`,
            state.line,
          );
      } else {
        pendingTargetCount += 1;
        if (anyAssetReference)
          addIssue(
            issues,
            state.file,
            `pending Target must not reference canonical asset: ${asset}`,
            state.line,
          );
      }
    }
  }

  for (const [stateKey, references] of sharedReferencesByState) {
    const state = stateByKey.get(stateKey);
    if (state === undefined) continue;
    const platforms = state.platforms as VisualPlatform[];
    const parsed = parsedFiles.get(state.file);
    const visualReferences = parsed === undefined ? [] : visualReferencesForState(parsed, state);
    const expectedSharedAssets = new Set<string>();
    const expectedDetail = platforms
      .map((platform) => {
        const reference = references.find((candidate) => candidate.platform === platform);
        return `${platform}=ref: ${reference?.target ?? "<missing>"}/${platform}`;
      })
      .join("; ");
    if (state.detail !== expectedDetail)
      addIssue(
        issues,
        state.file,
        `shared state references must follow Required platform order: ${stateKey}`,
        state.line,
      );
    const referencePlatforms = new Set<string>();
    for (const reference of references) {
      if (referencePlatforms.has(reference.platform))
        addIssue(
          issues,
          state.file,
          `shared state has duplicate platform reference: ${reference.platform}`,
          state.line,
        );
      referencePlatforms.add(reference.platform);
      if (!platforms.includes(reference.platform))
        addIssue(
          issues,
          state.file,
          `shared state has extra platform reference: ${reference.platform}`,
          state.line,
        );
      const targetState = stateByKey.get(reference.target);
      if (targetState === undefined) {
        addIssue(
          issues,
          state.file,
          `shared state target State does not exist: ${reference.target}`,
          state.line,
        );
        continue;
      }
      if (targetState.requirement !== "required")
        addIssue(
          issues,
          state.file,
          `shared state must reference required state: ${reference.target}`,
          state.line,
        );
      if (targetState.screenId === state.screenId && targetState.slug === state.slug)
        addIssue(
          issues,
          state.file,
          `shared state cannot self-reference: ${reference.target}`,
          state.line,
        );
      const targetPlatforms = targetState.platforms as VisualPlatform[];
      if (!targetPlatforms.includes(reference.platform))
        addIssue(
          issues,
          state.file,
          `shared state target does not require platform ${reference.platform}: ${reference.target}`,
          state.line,
        );
      const targetKey = `${reference.target}/${reference.platform}`;
      const targetCase = captureCasesByKey.get(targetKey);
      if (targetCase === undefined) {
        addIssue(
          issues,
          state.file,
          `shared state target has no Capture Case: ${targetKey}`,
          state.line,
        );
        continue;
      }
      const targetAsset = visualAssetPath(targetCase);
      if (targetCase.status !== "captured")
        addIssue(
          issues,
          state.file,
          `shared state target must be captured: ${targetKey}`,
          state.line,
        );
      if (!fs.existsSync(path.join(rootDir, targetAsset)))
        addIssue(
          issues,
          targetAsset,
          `shared state target canonical asset is missing: ${targetKey}`,
        );
      const stateReferences = references.filter(
        (candidate) => candidate.platform === reference.platform,
      );
      expectedSharedAssets.add(targetAsset);
      const assetReferences = visualReferences.filter((candidate) =>
        referenceTargetsAsset(candidate, targetAsset),
      );
      if (stateReferences.length !== 1 || assetReferences.length !== 1)
        addIssue(
          issues,
          state.file,
          `shared state requires exactly one Markdown reference to ${targetAsset}`,
          state.line,
        );
    }
    for (const visualReference of visualReferences) {
      const canonicalTarget = visualReference.source.startsWith("docs/spec/assets/screens/")
        ? visualReference.source
        : visualReference.href.startsWith("docs/spec/assets/screens/")
          ? visualReference.href
          : null;
      if (canonicalTarget !== null && !expectedSharedAssets.has(canonicalTarget))
        addIssue(
          issues,
          state.file,
          `shared state contains an extra canonical visual reference: ${canonicalTarget}`,
          visualReference.line,
        );
    }
    for (const platform of platforms) {
      if (!referencePlatforms.has(platform))
        addIssue(
          issues,
          state.file,
          `shared state is missing platform reference: ${platform}`,
          state.line,
        );
    }
  }

  const sharedGraph = new Map<string, string[]>();
  for (const [stateKey, references] of sharedReferencesByState)
    sharedGraph.set(
      stateKey,
      references
        .map((reference) => reference.target)
        .filter((target) => sharedReferencesByState.has(target)),
    );
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visitShared = (stateKey: string): void => {
    if (visiting.has(stateKey)) {
      addIssue(issues, "docs/spec", `shared State reference cycle detected at ${stateKey}`);
      return;
    }
    if (visited.has(stateKey)) return;
    visiting.add(stateKey);
    for (const target of sharedGraph.get(stateKey) ?? []) visitShared(target);
    visiting.delete(stateKey);
    visited.add(stateKey);
  };
  for (const stateKey of sharedGraph.keys()) visitShared(stateKey);

  for (const captureCase of captureCases) {
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
  if (canonicalAssetTotalBytes > MAX_TOTAL_ASSET_BYTES)
    addIssue(
      issues,
      "docs/spec/assets/screens",
      `canonical asset total must be <= ${MAX_TOTAL_ASSET_BYTES} bytes, got ${canonicalAssetTotalBytes}`,
    );
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
  if (options.requireComplete) {
    if (summary.pendingTargetCount > 0)
      addIssue(
        issues,
        "scripts/spec/visual-registry.ts",
        `Final Visual Gate requires pendingTargetCount === 0, got ${summary.pendingTargetCount}`,
      );
    if (summary.blockedTargetCount > 0)
      addIssue(
        issues,
        "scripts/spec/visual-registry.ts",
        `Final Visual Gate requires blockedTargetCount === 0, got ${summary.blockedTargetCount}`,
      );
    if (summary.capturedTargetCount !== summary.captureTargetCount)
      addIssue(
        issues,
        "scripts/spec/visual-registry.ts",
        `Final Visual Gate requires capturedTargetCount === captureTargetCount (${summary.capturedTargetCount} !== ${summary.captureTargetCount})`,
      );
  }
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
  options: VisualContractValidationOptions = {},
): Promise<VisualContractSummary> {
  const result = await validateVisualContract(rootDir, options);
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

export async function assertFinalVisualContract(
  rootDir = process.cwd(),
): Promise<VisualContractSummary> {
  return assertValidVisualContract(rootDir, { requireComplete: true });
}
