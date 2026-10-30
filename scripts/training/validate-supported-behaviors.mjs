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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REQUIRED_RULE_TYPES = new Set(["rule", "permission", "transition", "ui", "scope"]);
const REQUIRED_BEHAVIOR_TYPES = new Set(["action", "state", "use_case"]);

function assert(value, message) {
  if (!value) throw new Error(message);
}

function readLines(root, sourcePath) {
  const file = path.join(root, sourcePath);
  assert(fs.existsSync(file), `source missing: ${sourcePath}`);
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

function checkSource(entry, root, allowedPaths) {
  assert(allowedPaths.has(entry.source_path), `unlisted source: ${entry.id}`);
  const lines = readLines(root, entry.source_path);
  assert(
    Number.isInteger(entry.source_line) && entry.source_line >= 1,
    `invalid source line: ${entry.id}`,
  );
  const line = lines[entry.source_line - 1]?.trim();
  assert(line, `missing source: ${entry.id}`);
  const expected = entry.kind === "action" ? line.replace(/^[-*]\s+/, "") : line;
  if (entry.kind === "state") {
    assert(line.includes(`| ${entry.source_text} |`), `source changed: ${entry.id}`);
  } else {
    assert(entry.source_text === expected, `source changed: ${entry.id}`);
  }
}

function specSources(root) {
  const dir = path.join(root, "docs/spec/features");
  const featureFiles = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => `docs/spec/features/${name}`);
  return [
    ...featureFiles,
    "docs/spec/product-scope.md",
    "docs/spec/roles-and-permissions.md",
    "docs/spec/screen-catalog.md",
    "docs/spec/state-and-scenarios.md",
    "docs/spec/ui-ux-contract.md",
  ].sort();
}

function listUseCaseFiles(root) {
  const dir = path.join(root, "src/application/use-cases");
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith("-use-cases.ts"))
    .map((name) => `src/application/use-cases/${name}`)
    .sort();
}

function collectSpec(root, paths) {
  const actions = new Map();
  const states = new Map();
  const rules = new Map();
  const screens = new Set();
  for (const file of paths) {
    const lines = readLines(root, file);
    let screen = null;
    let subsection = null;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].trim();
      if (file === "docs/spec/screen-catalog.md") {
        const m = line.match(/^\| `(SCREEN-[A-Z0-9-]+)`/);
        if (m) screens.add(m[1]);
        continue;
      }
      const heading = line.match(/^(#{2,6})\s+(.+)$/);
      if (heading) {
        if (/^#{3,4}$/.test(heading[1])) {
          const rule = heading[2].match(/^((?:BR|AC)-[A-Z0-9-]+)\s+—/);
          if (rule) rules.set(rule[1], `${file}:${index + 1}`);
        }
        if (heading[1].length === 3) {
          screen = heading[2].match(/^(SCREEN-[A-Z0-9-]+)/)?.[1] ?? null;
          subsection = null;
        } else if (heading[1].length === 4) {
          subsection = heading[2];
        } else if (heading[1].length === 2) {
          screen = null;
          subsection = null;
        }
      }
      if (!screen) continue;
      const key = `${file}:${index + 1}`;
      if (/^(機能|機能一覧)$/.test(subsection ?? "") && /^[-*]\s+/.test(line)) {
        actions.set(key, screen);
      }
      if (/^(主要なUI状態|重要なUI状態)$/.test(subsection ?? "") && /^\| `[^`]+` \|/.test(line)) {
        const slug = line.split("|")[1]?.trim().replaceAll("`", "");
        if (slug !== "default") states.set(key, `${screen}:${slug}`);
      }
    }
  }
  return { actions, states, rules, screens };
}

function collectMethods(root, paths) {
  const methods = new Map();
  for (const file of paths) {
    const lines = readLines(root, file);
    let className = null;
    for (let index = 0; index < lines.length; index++) {
      const cls = lines[index].match(/^export class (\w+)/);
      if (cls) className = cls[1];
      const match = lines[index].match(/^  async (\w+)\(/);
      if (!match) continue;
      assert(className, `unclassified Use Case method: ${file}:${index + 1}`);
      const id = `${className}.${match[1]}`;
      assert(!methods.has(id), `duplicate public Use Case method: ${id}`);
      methods.set(id, {
        source_path: file,
        source_line: index + 1,
        signature: lines[index].trim(),
      });
    }
  }
  return methods;
}

function equalSets(actual, expected, reason) {
  const missing = [...expected].filter((value) => !actual.has(value));
  const extra = [...actual].filter((value) => !expected.has(value));
  assert(!missing.length, `${reason} missing: ${missing.join(", ")}`);
  assert(!extra.length, `${reason} unexpected: ${extra.join(", ")}`);
}

function completeAnalysis(behavior) {
  if (behavior.analysis_status !== "analyzed") return false;
  const required = [
    "role",
    "platform",
    "scenario",
    "data",
    "action",
    "expected",
    "risk",
    "test_condition",
    "test_responsibility",
    "case_policy",
    "case_selection_reason",
  ];
  return (
    required.every(
      (field) =>
        typeof behavior[field] === "string" &&
        behavior[field].trim() &&
        ![
          "-",
          "scopeによる",
          "正式仕様による",
          "基本seedと関連する商品・アカウント",
          "正式BR/ACの入力条件",
          "正式契約の対象データ・Role/State/Platform",
        ].includes(behavior[field]),
    ) &&
    Array.isArray(behavior.requirement_refs) &&
    behavior.requirement_refs.length > 0 &&
    behavior.reviewed_against?.includes("implementation") &&
    behavior.reviewed_against?.includes("specification") &&
    behavior.reviewed_against?.includes("seed")
  );
}

export function validateCoverage({ root = ROOT, data } = {}) {
  const document = data ?? JSON.parse(fs.readFileSync(path.join(root, COVERAGE_PATH), "utf8"));
  assert(document?.schema_version === 2, "unsupported coverage schema");
  assert(/^[0-9a-f]{40}$/.test(document.source_commit), "invalid pinned source SHA");

  const specs = specSources(root);
  const useCases = listUseCaseFiles(root);
  equalSets(new Set(document.source_paths), new Set(specs), "spec source inventory");
  equalSets(new Set(document.method_source_paths), new Set(useCases), "Use Case source inventory");

  const spec = collectSpec(root, specs);
  const methods = collectMethods(root, useCases);
  const behaviorIds = new Set();
  const requirementIds = new Set();
  const actionSources = new Set();
  const stateSources = new Set();
  const actionGroups = new Map();
  const semanticKeys = new Set();
  const allowedPaths = new Set([...specs, ...useCases]);

  assert(Array.isArray(document.behaviors), "behaviors missing");
  assert(Array.isArray(document.requirements), "requirements missing");
  assert(Array.isArray(document.use_case_methods), "Use Case methods missing");
  for (const item of document.requirements) {
    assert(REQUIRED_RULE_TYPES.has(item.kind), `invalid requirement kind: ${item.id}`);
    assert(!requirementIds.has(item.id), `duplicate requirement ID: ${item.id}`);
    requirementIds.add(item.id);
    checkSource(item, root, allowedPaths);
  }
  equalSets(
    new Set(document.requirements.filter((item) => item.kind === "rule").map((item) => item.id)),
    new Set(spec.rules.keys()),
    "BR/AC",
  );
  for (const item of document.behaviors) {
    assert(REQUIRED_BEHAVIOR_TYPES.has(item.kind), `invalid behavior kind: ${item.id}`);
    assert(!behaviorIds.has(item.id), `duplicate behavior ID: ${item.id}`);
    behaviorIds.add(item.id);
    checkSource(item, root, allowedPaths);
    assert(
      ["review_required", "analyzed", "blocked"].includes(item.analysis_status),
      `invalid analysis state: ${item.id}`,
    );
    for (const field of [
      "action",
      "expected",
      "role",
      "platform",
      "risk",
      "test_condition",
      "test_responsibility",
      "case_policy",
      "case_selection_reason",
    ]) {
      assert(typeof item[field] === "string" && item[field].trim(), `missing ${field}: ${item.id}`);
    }
    for (const ref of item.requirement_refs ?? []) {
      assert(requirementIds.has(ref), `unknown requirement reference: ${item.id} -> ${ref}`);
    }
    if (item.role === "platform_rolesを参照") {
      assert(
        item.platform_roles?.web && item.platform_roles?.android,
        `missing platform-specific role: ${item.id}`,
      );
    }
    if (item.kind === "action" || item.kind === "state") {
      assert(spec.screens.has(item.screen), `unknown screen: ${item.id}`);
    }
    if (item.kind === "action") {
      const key = `${item.source_path}:${item.source_line}`;
      actionSources.add(key);
      actionGroups.set(key, (actionGroups.get(key) ?? 0) + 1);
    }
    if (item.kind === "state") {
      stateSources.add(`${item.source_path}:${item.source_line}`);
    }
    const fingerprint = [
      item.screen ?? item.source_path,
      item.action,
      item.role,
      item.platform,
      item.scenario,
    ].join("|");
    assert(!semanticKeys.has(fingerprint), `duplicate equivalent behavior: ${item.id}`);
    semanticKeys.add(fingerprint);
    if (item.analysis_status === "analyzed") {
      assert(completeAnalysis(item), `analysis lacks verified evidence: ${item.id}`);
    }
  }
  equalSets(actionSources, new Set(spec.actions.keys()), "screen actions");
  for (const screen of spec.screens) {
    const sourceKeys = [...spec.actions.entries()]
      .filter(([, screenId]) => screenId === screen)
      .map(([sourceKey]) => sourceKey);
    const expected = EXPECTED_ACTION_COUNTS[screen];
    assert(expected?.length === sourceKeys.length, `unclassified action groups: ${screen}`);
    sourceKeys.forEach((key, index) => {
      assert(
        actionGroups.get(key) === expected[index],
        `unclassified action subcases: ${screen} ${key}`,
      );
    });
  }
  equalSets(stateSources, new Set(spec.states.keys()), "non-default UI states");
  equalSets(
    new Set(document.use_case_methods.map((item) => item.id)),
    new Set(methods.keys()),
    "public Use Case methods",
  );
  for (const item of document.use_case_methods) {
    const method = methods.get(item.id);
    assert(
      item.source_path === method?.source_path &&
        item.source_line === method?.source_line &&
        item.signature === method?.signature,
      `Use Case changed: ${item.id}`,
    );
    assert(behaviorIds.has(item.behavior_id), `Use Case has no behavior: ${item.id}`);
  }
  const analyzed = document.behaviors.filter(completeAnalysis).length;
  const blocked = document.behaviors.filter((item) => item.analysis_status === "blocked").length;
  return {
    screens: spec.screens.size,
    screen_actions: actionSources.size,
    screen_action_segments: [...actionGroups.values()].reduce((a, b) => a + b, 0),
    non_default_states: stateSources.size,
    br_ac: spec.rules.size,
    use_case_methods: methods.size,
    supported_total: document.behaviors.length,
    classified: document.behaviors.length,
    basically_analyzed: analyzed,
    requires_review: document.behaviors.length - analyzed - blocked,
    blocked,
    classified_rate: 100,
    basic_analysis_rate:
      document.behaviors.length === 0
        ? 0
        : Math.round((analyzed / document.behaviors.length) * 10000) / 100,
    complete: analyzed === document.behaviors.length && blocked === 0,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = validateCoverage();
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes("--require-complete") && !result.complete) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
