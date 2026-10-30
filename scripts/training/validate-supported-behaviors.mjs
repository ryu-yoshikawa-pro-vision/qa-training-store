#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COVERAGE_PATH = "training/ai-assisted-qa-course/coverage/supported-behaviors.json";

const EXPECTED_ACTION_COUNTS = {
  "SCREEN-STOREFRONT-HOME": [5, 2],
  "SCREEN-STOREFRONT-PRODUCT-LIST": [4, 2],
  "SCREEN-STOREFRONT-PRODUCT-DETAIL": [5, 3],
  "SCREEN-STOREFRONT-SEARCH": [3, 2],
  "SCREEN-STOREFRONT-CATEGORY": [1, 1],
  "SCREEN-AUTH-LOGIN": [2, 2],
  "SCREEN-AUTH-SIGNUP": [1, 3],
  "SCREEN-AUTH-ACCOUNT-PROFILE": [3, 1],
  "SCREEN-STOREFRONT-CART": [3, 3],
  "SCREEN-CHECKOUT-ADDRESSES": [4, 1],
  "SCREEN-CHECKOUT-ADDRESS": [2, 3],
  "SCREEN-CHECKOUT-PAYMENT": [2, 2],
  "SCREEN-CHECKOUT-CONFIRM": [4, 3],
  "SCREEN-CHECKOUT-PROCESSING": [2, 3],
  "SCREEN-CHECKOUT-COMPLETE": [3],
  "SCREEN-CHECKOUT-FAILED": [3, 2],
  "SCREEN-ORDERS-LIST": [2, 3],
  "SCREEN-ORDERS-DETAIL": [3, 2],
  "SCREEN-REVIEWS-EDITOR": [2, 2],
  "SCREEN-ADMIN-REVIEWS": [2, 3],
  "SCREEN-ADMIN-DASHBOARD": [2, 1],
  "SCREEN-ADMIN-PRODUCTS": [3, 2],
  "SCREEN-ADMIN-PRODUCT-NEW": [3, 1],
  "SCREEN-ADMIN-PRODUCT-DETAIL": [5, 4],
  "SCREEN-ADMIN-CATEGORIES": [4],
  "SCREEN-ADMIN-BRANDS": [4],
  "SCREEN-ADMIN-INVENTORIES": [4, 2],
  "SCREEN-ADMIN-ORDERS": [2, 1],
  "SCREEN-ADMIN-ORDER-DETAIL": [2, 1],
  "SCREEN-ADMIN-USERS": [2, 3],
  "SCREEN-ADMIN-USER-DETAIL": [4, 3],
  "SCREEN-SUPPORTING-GUIDE": [2, 2],
  "SCREEN-SUPPORTING-TERMS": [1, 1],
  "SCREEN-SUPPORTING-PRIVACY": [1, 1],
  "SCREEN-SUPPORTING-COMMERCE": [1, 1],
  "SCREEN-BOUNDARY-FORBIDDEN": [1, 1],
  "SCREEN-TEST-CONTROL": [4, 1],
  "SCREEN-BOUNDARY-NOT-FOUND": [2, 1],
};

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCES = [
  "docs/spec/features/storefront.md",
  "docs/spec/features/authentication.md",
  "docs/spec/features/cart.md",
  "docs/spec/features/checkout-and-payment.md",
  "docs/spec/features/orders.md",
  "docs/spec/features/reviews.md",
  "docs/spec/features/admin-catalog.md",
  "docs/spec/features/admin-inventory.md",
  "docs/spec/features/admin-orders.md",
  "docs/spec/features/admin-users.md",
  "docs/spec/features/native-customer.md",
  "docs/spec/product-scope.md",
  "docs/spec/roles-and-permissions.md",
  "docs/spec/state-and-scenarios.md",
  "docs/spec/ui-ux-contract.md",
  "docs/spec/screen-catalog.md",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function setDifference(left, right) {
  return [...left].filter((key) => !right.has(key)).sort();
}

function sourceKey(file, line) {
  return `${file}:${line}`;
}

function readSources(root) {
  const sources = new Map();
  for (const file of SOURCES) {
    const absolute = path.join(root, file);
    assert(fs.existsSync(absolute), `source missing: ${file}`);
    sources.set(file, fs.readFileSync(absolute, "utf8").split(/\r?\n/));
  }
  return sources;
}

function sourceContract(root) {
  const sources = readSources(root);
  const expected = { action: new Set(), state: new Set(), rule: new Set() };
  const actionSourcesByScreen = new Map();
  const screenIds = new Set();
  for (const [file, lines] of sources) {
    if (file.endsWith("screen-catalog.md")) {
      for (const line of lines) {
        const match = line.match(/^\| `(SCREEN-[A-Z0-9-]+)`/);
        if (match) screenIds.add(match[1]);
      }
      continue;
    }

    let screen = null;
    let subsection = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const heading = line.match(/^(#{2,6})\s+(.+)$/);
      if (heading) {
        if (heading[1].length === 3) {
          screen = heading[2].match(/^(SCREEN-[A-Z0-9-]+)/)?.[1] ?? null;
          subsection = null;
          if (/^(BR|AC)-[A-Z0-9-]+\s+—\s+/.test(heading[2])) {
            expected.rule.add(sourceKey(file, i + 1));
          }
        } else if (heading[1].length === 4) {
          subsection = heading[2];
          if (/^(BR|AC)-[A-Z0-9-]+\s+—\s+/.test(heading[2])) {
            expected.rule.add(sourceKey(file, i + 1));
          }
        } else if (heading[1].length === 2) {
          screen = null;
          subsection = null;
        }
      }
      if (!screen) continue;
      if (/^(機能|機能一覧)$/.test(subsection ?? "") && /^[-*]\s+/.test(line)) {
        const key = sourceKey(file, i + 1);
        expected.action.add(key);
        if (!actionSourcesByScreen.has(screen)) actionSourcesByScreen.set(screen, []);
        actionSourcesByScreen.get(screen).push(key);
      }
      if (
        /^(主要なUI状態|重要なUI状態)$/.test(subsection ?? "") &&
        /^\| `[^\x60]+` \|/.test(line)
      ) {
        const state = line.split("|")[1]?.trim().replaceAll("`", "");
        if (state !== "default") expected.state.add(sourceKey(file, i + 1));
      }
    }
  }
  return { sources, expected, screenIds, actionSourcesByScreen };
}

function validateEntries(data, root) {
  const { sources, expected, screenIds, actionSourcesByScreen } = sourceContract(root);
  assert(data?.schema_version === 1, "invalid coverage schema");
  assert(Array.isArray(data.entries), "coverage entries are missing");
  assert(/^[0-9a-f]{40}$/.test(data.source_commit), "source_commit must be the full pinned commit");
  assert(
    Array.isArray(data.source_paths) &&
      data.source_paths.length === SOURCES.length &&
      SOURCES.every((source) => data.source_paths.includes(source)),
    "coverage source list is incomplete",
  );

  const ids = new Set();
  const actual = { action: new Set(), state: new Set(), rule: new Set() };
  const coveredScreens = new Set();
  const actionCounts = new Map();
  const counts = {};
  for (const entry of data.entries) {
    assert(typeof entry.id === "string" && entry.id.length > 0, "missing behavior ID");
    assert(!ids.has(entry.id), `duplicate behavior ID: ${entry.id}`);
    ids.add(entry.id);
    const lines = sources.get(entry.source_path);
    assert(lines, `unsupported evidence source: ${entry.id}`);
    assert(
      Number.isInteger(entry.source_line) && entry.source_line > 0,
      `invalid line: ${entry.id}`,
    );
    const source = lines[entry.source_line - 1]?.trim();
    assert(source, `source line missing: ${entry.id}`);
    if (entry.kind === "action") {
      assert(entry.screen && screenIds.has(entry.screen), `invalid screen: ${entry.id}`);
      coveredScreens.add(entry.screen);
      assert(
        source.replace(/^[-*]\s+/, "") === entry.source_text,
        `action source drift: ${entry.id}`,
      );
      const key = sourceKey(entry.source_path, entry.source_line);
      actual.action.add(key);
      actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1);
    } else if (entry.kind === "state") {
      assert(entry.screen && screenIds.has(entry.screen), `invalid state screen: ${entry.id}`);
      coveredScreens.add(entry.screen);
      assert(source.includes(`| ${entry.source_text} |`), `state source drift: ${entry.id}`);
      assert(entry.scenario !== "default", `duplicate default state: ${entry.id}`);
      actual.state.add(sourceKey(entry.source_path, entry.source_line));
    } else if (entry.kind === "rule") {
      assert(source === entry.source_text, `rule source drift: ${entry.id}`);
      assert(entry.rule_refs?.includes(entry.id), `rule ID missing: ${entry.id}`);
      actual.rule.add(sourceKey(entry.source_path, entry.source_line));
    } else {
      assert(source === entry.source_text, `cross-cutting source drift: ${entry.id}`);
    }

    for (const field of [
      "platform",
      "role",
      "scenario",
      "data",
      "action",
      "expected",
      "risk",
      "test_condition",
      "test_responsibility",
      "case_policy",
      "case_selection_reason",
    ]) {
      assert(
        typeof entry[field] === "string" && entry[field].trim().length > 0,
        `missing analysis ${field}: ${entry.id}`,
      );
    }
    assert(entry.analysis_status === "analyzed", `analysis not complete: ${entry.id}`);
    counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }

  for (const kind of Object.keys(expected)) {
    const missing = setDifference(expected[kind], actual[kind]);
    const extra = setDifference(actual[kind], expected[kind]);
    assert(missing.length === 0, `unclassified ${kind}: ${missing.join(", ")}`);
    assert(extra.length === 0, `invalid ${kind} sources: ${extra.join(", ")}`);
  }
  for (const [screen, sources] of actionSourcesByScreen) {
    const expectedCounts = EXPECTED_ACTION_COUNTS[screen];
    assert(expectedCounts?.length === sources.length, `unclassified action groups: ${screen}`);
    sources.forEach((key, index) => {
      assert(
        actionCounts.get(key) === expectedCounts[index],
        `unclassified action subcases: ${screen}, ${key}`,
      );
    });
  }
  const missingScreens = setDifference(screenIds, coveredScreens);
  assert(missingScreens.length === 0, `unclassified screens: ${missingScreens.join(", ")}`);
  assert(screenIds.size === 38, `screen catalog changed: ${screenIds.size}`);
  assert(
    Object.keys(counts).length === Object.keys(data.counts ?? {}).length &&
      Object.entries(counts).every(([kind, number]) => data.counts[kind] === number),
    "coverage counts differ from entries",
  );

  for (const id of [
    "ROLE-01",
    "ROLE-02",
    "ROLE-03",
    "ROLE-04",
    "ROLE-05",
    "ROLE-RANK",
    "ROLE-ACCESS",
    "ROLE-STATUS",
    "TRANSITION-PRODUCT",
    "TRANSITION-ACCOUNT",
    "TRANSITION-CHECKOUT",
    "TRANSITION-ORDER",
    "TRANSITION-SHIPMENT",
    "TRANSITION-REVIEW",
    "TRANSITION-CART",
    "STATE-TERMINAL",
    "STATE-SEEDS",
    "STATE-RESET",
    "STATE-BOUNDARY",
    "STATE-NATIVE",
    "UI-BREAKPOINT",
    "UI-DESIGN",
    "UI-A11Y",
    "UI-ERROR",
    "PLATFORM-WEB",
    "PLATFORM-NATIVE",
    "SCOPE-EXCLUDED",
    ...Array.from({ length: 6 }, (_, index) => `SCOPE-SUPPORTED-${index + 1}`),
  ]) {
    assert(ids.has(id), `cross-cutting requirement not classified: ${id}`);
  }
  const supported = data.entries.filter((entry) => entry.id !== "SCOPE-EXCLUDED");
  return {
    status: "analyzed",
    source_commit: data.source_commit,
    screens: screenIds.size,
    total: data.entries.length,
    supported_total: supported.length,
    classified_supported: supported.length,
    basically_analyzed_supported: supported.length,
    by_kind: counts,
    classified: data.entries.length,
    basically_analyzed: data.entries.filter((x) => x.analysis_status === "analyzed").length,
    unclassified: 0,
  };
}

export function validateCoverage({ root = BASE, data } = {}) {
  const content = data ?? JSON.parse(fs.readFileSync(path.join(root, COVERAGE_PATH), "utf8"));
  return validateEntries(content, root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(validateCoverage(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
