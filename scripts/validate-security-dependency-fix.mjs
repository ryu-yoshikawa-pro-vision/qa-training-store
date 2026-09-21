import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import semver from "semver";
import { parse as parseYaml } from "yaml";

const MANIFEST_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i;
const MAX_CANDIDATES = 10;

export class NeedsHumanError extends Error {
  constructor(message) {
    super(message);
    this.name = "NeedsHumanError";
  }
}

function needsHuman(message) {
  throw new NeedsHumanError(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafePackageName(name) {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    name.length <= 214 &&
    PACKAGE_NAME_PATTERN.test(name)
  );
}

export function normalizeVulnerableRange(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    needsHuman("invalid vulnerable range");
  }
  return value.replaceAll(",", " ").replace(/\s+/g, " ").trim();
}

export function isStableExactSemVer(value) {
  if (typeof value !== "string" || semver.valid(value) !== value) {
    return false;
  }
  return semver.prerelease(value) === null && !value.includes("+");
}

function assertStableExact(value, label) {
  if (!isStableExactSemVer(value)) {
    needsHuman(`${label} must be a stable exact SemVer`);
  }
}

function assertAuthorization(authorization) {
  if (!isPlainObject(authorization) || authorization.schema_version !== 1) {
    needsHuman("invalid authorization schema");
  }
  if (!isSafePackageName(authorization.dependency) || authorization.ecosystem !== "npm") {
    needsHuman("unsupported dependency identity");
  }
  if (authorization.dependency === "semver" || authorization.dependency === "yaml") {
    needsHuman("validator trust dependency is not an automatic target");
  }
  const range = normalizeVulnerableRange(authorization.vulnerable_range);
  if (semver.validRange(range) === null) {
    needsHuman("vulnerable range is not interpretable");
  }
  if (
    authorization.first_patched_version !== null &&
    authorization.first_patched_version !== undefined
  ) {
    assertStableExact(authorization.first_patched_version, "first patched version");
  }
  if (
    !Array.isArray(authorization.allowed_strategies) ||
    authorization.allowed_strategies.length === 0 ||
    new Set(authorization.allowed_strategies).size !== authorization.allowed_strategies.length ||
    authorization.allowed_strategies.some(
      (strategy) => !["direct", "root_parent", "override"].includes(strategy),
    )
  ) {
    needsHuman("authorization has no allowed strategy");
  }
  return { ...authorization, normalized_range: range };
}

function diffValues(before, after, path = []) {
  if (Object.is(before, after)) {
    return [];
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    return [{ path, before, after }];
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((key) => diffValues(before[key], after[key], [...path, key]));
  }
  return [{ path, before, after }];
}

function exactSpecifier(value) {
  return isStableExactSemVer(value);
}

function pathMatches(path, expected) {
  return path.length === expected.length && path.every((value, index) => value === expected[index]);
}

function validateDirectMutation(diff, authorization) {
  if (!authorization.allowed_strategies.includes("direct")) {
    return null;
  }
  const allowed = authorization.direct;
  if (!isPlainObject(allowed) || !MANIFEST_FIELDS.includes(allowed.field)) {
    return null;
  }
  const expectedPath = [allowed.field, authorization.dependency];
  if (!pathMatches(diff.path, expectedPath)) {
    return null;
  }
  if (!exactSpecifier(diff.before) || !exactSpecifier(diff.after)) {
    needsHuman("direct dependency specifiers must be stable exact SemVer");
  }
  if (diff.before !== allowed.old_specifier || diff.after !== allowed.new_specifier) {
    return null;
  }
  assertStableExact(allowed.new_specifier, "direct dependency version");
  if (semver.major(allowed.new_specifier) !== semver.major(diff.before)) {
    needsHuman("direct dependency major update is not allowed");
  }
  if (!semver.gte(allowed.new_specifier, diff.before)) {
    needsHuman("direct dependency downgrade is not allowed");
  }
  if (allowed.expected_resolved_version !== allowed.new_specifier) {
    needsHuman("direct dependency expected resolution is inconsistent");
  }
  return { strategy: "direct", expectedResolvedVersion: allowed.expected_resolved_version };
}

function validateRootParentMutation(diff, authorization) {
  if (!authorization.allowed_strategies.includes("root_parent")) {
    return null;
  }
  const allowed = authorization.root_parent;
  if (!isPlainObject(allowed) || !MANIFEST_FIELDS.includes(allowed.field)) {
    return null;
  }
  const expectedPath = [allowed.field, allowed.root_dependency];
  if (!pathMatches(diff.path, expectedPath)) {
    return null;
  }
  if (!exactSpecifier(diff.before) || !exactSpecifier(diff.after)) {
    needsHuman("root parent specifiers must be stable exact SemVer");
  }
  if (diff.before !== allowed.old_specifier) {
    return null;
  }
  assertStableExact(diff.after, "root parent candidate");
  if (
    semver.major(diff.after) !== semver.major(diff.before) ||
    !semver.gt(diff.after, diff.before)
  ) {
    needsHuman("root parent major update or downgrade is not allowed");
  }
  if (
    !Array.isArray(allowed.candidates) ||
    allowed.candidates.length === 0 ||
    allowed.candidates.length > MAX_CANDIDATES
  ) {
    needsHuman("root parent candidates are invalid");
  }
  const candidate = allowed.candidates.find(
    (entry) => isPlainObject(entry) && entry.new_specifier === diff.after,
  );
  if (!candidate || candidate.expected_resolved_version !== diff.after) {
    needsHuman("root parent candidate is outside authorization");
  }
  return { strategy: "root_parent", expectedResolvedVersion: candidate.expected_resolved_version };
}

function validateOverrideMutation(diff, authorization) {
  if (!authorization.allowed_strategies.includes("override")) {
    return null;
  }
  const allowed = authorization.override;
  if (!isPlainObject(allowed) || typeof allowed.selector !== "string") {
    return null;
  }
  const expectedPath = ["pnpm", "overrides", allowed.selector];
  if (!pathMatches(diff.path, expectedPath)) {
    return null;
  }
  if (
    diff.before !== undefined ||
    diff.after !== allowed.value ||
    !isStableExactSemVer(diff.after)
  ) {
    needsHuman("override mutation is not an exact authorized value");
  }
  if (allowed.expected_resolved_version !== diff.after) {
    needsHuman("override expected resolution is inconsistent");
  }
  if (allowed.value !== authorization.first_patched_version) {
    needsHuman("override value is not the first patched version");
  }
  const selector = parseExactParentSelector(allowed.selector);
  if (!selector || selector.targetName !== authorization.dependency) {
    needsHuman("override selector must pin an exact parent version");
  }
  if (!Array.isArray(allowed.affected_edges) || allowed.affected_edges.length === 0) {
    needsHuman("override affected edges are not proven");
  }
  if (!Array.isArray(allowed.baseline_instances) || allowed.baseline_instances.length === 0) {
    needsHuman("override baseline instances are not fully enumerated");
  }
  if (
    allowed.baseline_instances.some(
      (instance) =>
        !isPlainObject(instance) ||
        instance.name !== selector.parentName ||
        instance.version !== selector.parentVersion ||
        !isStableExactSemVer(instance.version) ||
        typeof instance.section !== "string" ||
        typeof instance.key !== "string",
    )
  ) {
    needsHuman("override baseline instance is outside the exact selector");
  }
  if (!Array.isArray(authorization.affected_paths) || authorization.affected_paths.length === 0) {
    needsHuman("override affected paths are missing");
  }
  const expectedAffectedEdges = authorization.affected_paths.map((entry) =>
    affectedEdgeFromPath(entry, authorization.dependency),
  );
  if (
    !sameRecordSet(allowed.affected_edges, expectedAffectedEdges) ||
    allowed.affected_edges.some(
      (edge) =>
        !isPlainObject(edge) ||
        edge.parent !== selector.parentName ||
        edge.parent_version !== selector.parentVersion ||
        !isStableExactSemVer(edge.baseline_resolved_version) ||
        !semver.satisfies(edge.baseline_resolved_version, authorization.normalized_range),
    )
  ) {
    needsHuman("override affected edges are not fully proven");
  }
  if (
    !Array.isArray(allowed.baseline_selector_edges) ||
    allowed.baseline_selector_edges.length === 0
  ) {
    needsHuman("override baseline selector edges are not fully enumerated");
  }
  const baselineInstanceKeys = new Set(
    allowed.baseline_instances.map((instance) => recordKey([instance.section, instance.key])),
  );
  if (
    allowed.baseline_selector_edges.some(
      (edge) =>
        !isPlainObject(edge) ||
        edge.parent_name !== selector.parentName ||
        edge.parent_version !== selector.parentVersion ||
        typeof edge.parent_section !== "string" ||
        typeof edge.parent_key !== "string" ||
        !baselineInstanceKeys.has(recordKey([edge.parent_section, edge.parent_key])) ||
        edge.dependency !== authorization.dependency ||
        !isStableExactSemVer(edge.baseline_resolved_version) ||
        !semver.satisfies(edge.baseline_resolved_version, authorization.normalized_range) ||
        !semver.gte(diff.after, edge.baseline_resolved_version),
    )
  ) {
    needsHuman("override baseline selector edges are not vulnerable exact edges");
  }
  if (
    !isPlainObject(allowed.declaration_ranges) ||
    Object.values(allowed.declaration_ranges).some(
      (range) =>
        typeof range !== "string" ||
        semver.validRange(range) === null ||
        !semver.satisfies(diff.after, range),
    )
  ) {
    needsHuman("override value is outside a parent declaration range");
  }
  return { strategy: "override", expectedResolvedVersion: allowed.expected_resolved_version };
}

function manifestEntry(manifest, packageName) {
  for (const field of MANIFEST_FIELDS) {
    const value = manifest?.[field]?.[packageName];
    if (value !== undefined) {
      return { field, value };
    }
  }
  return null;
}

function affectedGraphPaths(graph, dependency, vulnerableRange) {
  const entries = collectInstalledGraph(graph);
  return entries
    .filter(
      (entry) => entry.name === dependency && semver.satisfies(entry.version, vulnerableRange),
    )
    .map((entry) => {
      const parentPath = entry.path.slice(0, -1);
      const parent = entries.find((candidate) => pathMatches(candidate.path, parentPath));
      return {
        path: entry.path,
        baseline_resolved_version: entry.version,
        root_dependency: entry.path.length > 1 ? entry.path[1] : null,
        immediate_parent: entry.path.length > 2 ? entry.path.at(-2) : null,
        parent_version: entry.path.length > 2 ? (parent?.version ?? null) : null,
      };
    });
}

function parseExactParentSelector(value) {
  if (
    typeof value !== "string" ||
    !/^@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?@[0-9]+\.[0-9]+\.[0-9]+>@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?$/i.test(
      value,
    )
  ) {
    return null;
  }
  const separator = value.indexOf(">");
  const parent = value.slice(0, separator);
  const versionAt = parent.lastIndexOf("@");
  return {
    parentName: parent.slice(0, versionAt),
    parentVersion: parent.slice(versionAt + 1),
    targetName: value.slice(separator + 1),
  };
}

const LOCKFILE_SECTIONS = ["packages", "snapshots"];
const LOCKFILE_DEPENDENCY_FIELDS = [
  "dependencies",
  "optionalDependencies",
  "devDependencies",
  "peerDependencies",
];

function parsePeerSuffixedSemVer(value) {
  if (typeof value !== "string") {
    return null;
  }
  const suffixStart = value.indexOf("(");
  const baseVersion = suffixStart === -1 ? value : value.slice(0, suffixStart);
  if (suffixStart !== -1) {
    let depth = 0;
    for (let index = suffixStart; index < value.length; index += 1) {
      const character = value[index];
      if (character === "(") {
        depth += 1;
      } else if (character === ")") {
        depth -= 1;
        if (depth < 0) {
          return null;
        }
      } else if (depth === 0) {
        return null;
      }
    }
    if (depth !== 0) {
      return null;
    }
  }
  return semver.valid(baseVersion) ?? null;
}

function parsePeerSuffixedVersion(value) {
  const parsed = parsePeerSuffixedSemVer(value);
  return parsed && isStableExactSemVer(parsed) ? parsed : null;
}

function normalizeLockfileDependencyVersion(value) {
  return parsePeerSuffixedVersion(value);
}

function recordKey(value) {
  return JSON.stringify(value);
}

function sameRecordSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return false;
  }
  const leftSet = new Set(left.map((value) => recordKey(value)));
  const rightSet = new Set(right.map((value) => recordKey(value)));
  return leftSet.size === rightSet.size && [...leftSet].every((value) => rightSet.has(value));
}

function affectedEdgeFromPath(entry, dependency) {
  return {
    path: entry.path,
    parent: entry.immediate_parent,
    parent_version: entry.parent_version,
    dependency,
    baseline_resolved_version: entry.baseline_resolved_version,
  };
}

/**
 * Reconstruct only the lockfile evidence needed for one exact parent-scoped selector.
 * This is intentionally not a general pnpm lockfile resolver.
 */
export function collectBaselineSelectorProof(lockfileText, selectorValue) {
  const selector = parseExactParentSelector(selectorValue);
  if (!selector) {
    needsHuman("override selector is not an exact parent selector");
  }
  assertStableExact(selector.parentVersion, "override parent version");
  if (!isSafePackageName(selector.targetName)) {
    needsHuman("override target dependency is invalid");
  }

  let lockfile;
  try {
    lockfile = parseYaml(lockfileText);
  } catch {
    needsHuman("baseline lockfile is not valid YAML");
  }
  if (!isPlainObject(lockfile)) {
    needsHuman("baseline lockfile has an invalid root");
  }

  const baselineInstances = [];
  const baselineSelectorEdges = [];
  for (const sectionName of LOCKFILE_SECTIONS) {
    const section = lockfile[sectionName];
    if (section === undefined) {
      continue;
    }
    if (!isPlainObject(section)) {
      needsHuman(`baseline lockfile ${sectionName} section is invalid`);
    }
    for (const [key, value] of Object.entries(section)) {
      const name = lockPackageName(key);
      const version = lockVersion(key);
      if (name === selector.parentName && !version) {
        needsHuman("baseline parent key has no stable exact version");
      }
      if (name !== selector.parentName || version !== selector.parentVersion) {
        continue;
      }
      assertStableExact(version, "baseline parent version");
      if (!isPlainObject(value)) {
        needsHuman("baseline parent instance is invalid");
      }
      baselineInstances.push({ section: sectionName, key, name, version });
      for (const field of LOCKFILE_DEPENDENCY_FIELDS) {
        if (value[field] === undefined) {
          continue;
        }
        if (!isPlainObject(value[field])) {
          needsHuman("baseline parent dependency section is invalid");
        }
        if (!Object.prototype.hasOwnProperty.call(value[field], selector.targetName)) {
          continue;
        }
        const resolvedVersion = normalizeLockfileDependencyVersion(
          value[field][selector.targetName],
        );
        if (!resolvedVersion) {
          needsHuman("baseline selector edge has no stable exact target version");
        }
        baselineSelectorEdges.push({
          parent_name: selector.parentName,
          parent_version: selector.parentVersion,
          parent_section: sectionName,
          parent_key: key,
          dependency: selector.targetName,
          baseline_resolved_version: resolvedVersion,
          declaration_field: field,
        });
      }
    }
  }

  if (baselineInstances.length === 0) {
    needsHuman("baseline selector parent instance is missing");
  }
  if (baselineSelectorEdges.length === 0) {
    needsHuman("baseline selector target edges are missing");
  }

  baselineInstances.sort((left, right) =>
    recordKey([left.section, left.key]).localeCompare(recordKey([right.section, right.key])),
  );
  baselineSelectorEdges.sort((left, right) =>
    recordKey([
      left.parent_section,
      left.parent_key,
      left.declaration_field,
      left.baseline_resolved_version,
    ]).localeCompare(
      recordKey([
        right.parent_section,
        right.parent_key,
        right.declaration_field,
        right.baseline_resolved_version,
      ]),
    ),
  );
  return {
    baseline_instances: baselineInstances,
    baseline_selector_edges: baselineSelectorEdges,
  };
}

/**
 * @param {{
 *   context: Record<string, unknown>,
 *   rootPackage: Record<string, unknown>,
 *   installedGraph: unknown,
 *   rootParentCandidates?: Array<Record<string, unknown>>,
 *   overrideCandidates?: Array<Record<string, unknown>>,
 *   baselineLockfile?: string,
 * }} input
 */
export function createAuthorization({
  context,
  rootPackage,
  installedGraph,
  rootParentCandidates = [],
  overrideCandidates = [],
  baselineLockfile,
}) {
  if (!isPlainObject(context)) {
    needsHuman("security context is invalid");
  }
  const normalizedContext = {
    schema_version: 1,
    dependency: context.dependency,
    ecosystem: context.ecosystem,
    ghsa_id: context.ghsa_id,
    vulnerable_range: normalizeVulnerableRange(context.vulnerable_range),
    first_patched_version: context.first_patched_version ?? null,
  };
  const baseAuthorization = assertAuthorization({
    schema_version: 1,
    dependency: normalizedContext.dependency,
    ecosystem: normalizedContext.ecosystem,
    ghsa_id: normalizedContext.ghsa_id,
    vulnerable_range: normalizedContext.vulnerable_range,
    first_patched_version: normalizedContext.first_patched_version,
    allowed_strategies: ["direct"],
  });
  if (!isPlainObject(rootPackage)) {
    needsHuman("root package manifest is invalid");
  }
  const affectedPaths = affectedGraphPaths(
    installedGraph,
    normalizedContext.dependency,
    baseAuthorization.normalized_range,
  );
  if (affectedPaths.length === 0) {
    needsHuman("installed graph has no vulnerable target path");
  }
  const firstPatched = normalizedContext.first_patched_version;
  if (!firstPatched) {
    needsHuman("first patched version is required for automatic fallback");
  }
  const result = {
    schema_version: 1,
    base_sha: context.base_sha,
    dependency: normalizedContext.dependency,
    ecosystem: normalizedContext.ecosystem,
    ghsa_id: normalizedContext.ghsa_id,
    vulnerable_range: normalizedContext.vulnerable_range,
    first_patched_version: firstPatched,
    affected_paths: affectedPaths,
    allowed_strategies: [],
  };
  const direct = manifestEntry(rootPackage, normalizedContext.dependency);
  const directPaths = affectedPaths.filter(
    (entry) => entry.path.length === 2 && entry.path[1] === normalizedContext.dependency,
  );
  if (direct && directPaths.length === affectedPaths.length && isStableExactSemVer(direct.value)) {
    const currentMajor = new Set(
      directPaths.map((entry) => semver.major(entry.baseline_resolved_version)),
    );
    if (
      currentMajor.size === 1 &&
      semver.major(firstPatched) === [...currentMajor][0] &&
      semver.gte(firstPatched, direct.value)
    ) {
      result.allowed_strategies.push("direct");
      result.direct = {
        field: direct.field,
        old_specifier: direct.value,
        new_specifier: firstPatched,
        expected_resolved_version: firstPatched,
      };
    }
  }
  if (result.allowed_strategies.length === 0) {
    const parentPaths = affectedPaths.filter((entry) => entry.path.length === 3);
    const rootDependency = parentPaths[0]?.root_dependency;
    const sameOneEdge =
      parentPaths.length === affectedPaths.length &&
      Boolean(rootDependency) &&
      parentPaths.every(
        (entry) =>
          entry.root_dependency === rootDependency && entry.immediate_parent === rootDependency,
      );
    const parentManifest = rootDependency ? manifestEntry(rootPackage, rootDependency) : null;
    const candidates = rootParentCandidates
      .filter(
        (candidate) =>
          isPlainObject(candidate) &&
          isStableExactSemVer(candidate.version) &&
          isPlainObject(candidate.dependencies) &&
          typeof candidate.dependencies[normalizedContext.dependency] === "string",
      )
      .filter(
        (candidate) =>
          semver.validRange(candidate.dependencies[normalizedContext.dependency]) !== null,
      )
      .filter((candidate) =>
        semver.satisfies(firstPatched, candidate.dependencies[normalizedContext.dependency]),
      )
      .filter((candidate) => parentManifest && isStableExactSemVer(parentManifest.value))
      .filter(
        (candidate) =>
          semver.major(candidate.version) === semver.major(parentManifest.value) &&
          semver.gt(candidate.version, parentManifest.value),
      )
      .sort((left, right) => semver.compare(left.version, right.version))
      .slice(0, MAX_CANDIDATES);
    if (sameOneEdge && parentManifest && candidates.length > 0) {
      result.allowed_strategies.push("root_parent");
      result.root_parent = {
        field: parentManifest.field,
        root_dependency: rootDependency,
        old_specifier: parentManifest.value,
        candidates: candidates.map((candidate) => ({
          new_specifier: candidate.version,
          expected_resolved_version: candidate.version,
        })),
      };
    }
  }
  if (result.allowed_strategies.length === 0 && Array.isArray(overrideCandidates)) {
    const safeOverrides = [];
    for (const candidate of overrideCandidates) {
      if (!isPlainObject(candidate)) {
        continue;
      }
      const selector = parseExactParentSelector(candidate.selector);
      if (!selector || selector.targetName !== normalizedContext.dependency) {
        continue;
      }
      if (!isStableExactSemVer(candidate.value) || candidate.value !== firstPatched) {
        continue;
      }
      if (!baselineLockfile) {
        needsHuman("override authorization requires the baseline lockfile");
      }
      const proof = collectBaselineSelectorProof(baselineLockfile, candidate.selector);
      if (
        !sameRecordSet(candidate.baseline_instances ?? [], proof.baseline_instances) ||
        !sameRecordSet(candidate.baseline_selector_edges ?? [], proof.baseline_selector_edges)
      ) {
        needsHuman("override baseline proof is not complete");
      }
      const expectedAffectedEdges = affectedPaths.map((entry) =>
        affectedEdgeFromPath(entry, normalizedContext.dependency),
      );
      if (!sameRecordSet(candidate.affected_edges ?? [], expectedAffectedEdges)) {
        needsHuman("override installed affected edges are inconsistent");
      }
      if (
        proof.baseline_selector_edges.some(
          (edge) =>
            !semver.satisfies(edge.baseline_resolved_version, baseAuthorization.normalized_range) ||
            !semver.gte(firstPatched, edge.baseline_resolved_version),
        )
      ) {
        needsHuman("override selector includes a safe or newer baseline edge");
      }
      const baselineEdgeCounts = new Map();
      for (const edge of proof.baseline_selector_edges) {
        const key = recordKey([
          edge.parent_name,
          edge.parent_version,
          edge.dependency,
          edge.baseline_resolved_version,
        ]);
        baselineEdgeCounts.set(key, (baselineEdgeCounts.get(key) ?? 0) + 1);
      }
      for (const entry of affectedPaths) {
        const key = recordKey([
          entry.immediate_parent,
          entry.parent_version,
          normalizedContext.dependency,
          entry.baseline_resolved_version,
        ]);
        const count = baselineEdgeCounts.get(key) ?? 0;
        if (count === 0) {
          needsHuman("installed graph contradicts the baseline selector edge");
        }
        baselineEdgeCounts.set(key, count - 1);
      }
      if (
        !isPlainObject(candidate.declaration_ranges) ||
        Object.keys(candidate.declaration_ranges).length === 0 ||
        !Object.values(candidate.declaration_ranges).every(
          (range) =>
            typeof range === "string" &&
            semver.validRange(range) !== null &&
            semver.satisfies(firstPatched, range),
        )
      ) {
        continue;
      }
      safeOverrides.push({ candidate, proof });
    }
    if (safeOverrides.length === 1) {
      result.allowed_strategies.push("override");
      const { candidate, proof } = safeOverrides[0];
      result.override = {
        selector: candidate.selector,
        value: candidate.value,
        expected_resolved_version: firstPatched,
        affected_edges: candidate.affected_edges,
        baseline_instances: proof.baseline_instances,
        baseline_selector_edges: proof.baseline_selector_edges,
        declaration_ranges: candidate.declaration_ranges,
      };
    }
  }
  if (result.allowed_strategies.length === 0) {
    needsHuman("no safe automatic strategy was authorized");
  }
  return result;
}

export function validatePackageChange(baselinePackage, candidatePackage, rawAuthorization) {
  const authorization = assertAuthorization(rawAuthorization);
  if (!isPlainObject(baselinePackage) || !isPlainObject(candidatePackage)) {
    needsHuman("package manifests must be JSON objects");
  }
  const diffs = diffValues(baselinePackage, candidatePackage);
  if (diffs.length !== 1) {
    needsHuman("candidate must contain exactly one authorized manifest mutation");
  }
  const [diff] = diffs;
  const mutation =
    validateDirectMutation(diff, authorization) ??
    validateRootParentMutation(diff, authorization) ??
    validateOverrideMutation(diff, authorization);
  if (!mutation) {
    needsHuman("candidate manifest mutation is outside authorization");
  }
  return { ...mutation, diffPath: diff.path, authorization };
}

function graphEntries(node, currentPath = [], entries = []) {
  if (!isPlainObject(node)) {
    return entries;
  }
  const name = typeof node.name === "string" ? node.name : currentPath.at(-1);
  const version = typeof node.version === "string" ? node.version : node.resolved;
  if (typeof name === "string" && typeof version === "string") {
    entries.push({ name, version, path: currentPath });
  }
  if (isPlainObject(node.dependencies)) {
    for (const [dependencyName, dependencyNode] of Object.entries(node.dependencies)) {
      graphEntries(
        isPlainObject(dependencyNode) ? { name: dependencyName, ...dependencyNode } : null,
        [...currentPath, dependencyName],
        entries,
      );
    }
  }
  return entries;
}

export function collectInstalledGraph(graph) {
  const roots = Array.isArray(graph) ? graph : [graph];
  return roots.flatMap((root) => graphEntries(root, root?.name ? [root.name] : []));
}

function validateAffectedPathResolutions(
  entries,
  authorization,
  expectedResolvedVersion,
  strategy,
) {
  if (!Array.isArray(authorization.affected_paths) || authorization.affected_paths.length === 0) {
    needsHuman("authorization has no affected paths");
  }
  for (const affected of authorization.affected_paths) {
    if (!isPlainObject(affected) || !Array.isArray(affected.path)) {
      needsHuman("authorization affected path is invalid");
    }
    if (
      affected.root_dependency !== (affected.path.length > 1 ? affected.path[1] : null) ||
      affected.immediate_parent !== (affected.path.length > 2 ? affected.path.at(-2) : null) ||
      typeof affected.baseline_resolved_version !== "string" ||
      !isStableExactSemVer(affected.baseline_resolved_version) ||
      !semver.satisfies(affected.baseline_resolved_version, authorization.normalized_range)
    ) {
      needsHuman("authorization affected path metadata is inconsistent");
    }
    const target = entries.find(
      (entry) => entry.name === authorization.dependency && pathMatches(entry.path, affected.path),
    );
    if (!target) {
      needsHuman("prepared graph is missing an authorized affected path");
    }
    if (semver.satisfies(target.version, authorization.normalized_range)) {
      needsHuman("authorized affected path remains vulnerable");
    }
    if (strategy === "root_parent") {
      if (affected.path.length !== 3) {
        needsHuman("root parent authorization contains a deep path");
      }
      const parentPath = affected.path.slice(0, -1);
      const parent = entries.find((entry) => pathMatches(entry.path, parentPath));
      if (
        !parent ||
        parent.name !== authorization.root_parent?.root_dependency ||
        parent.version !== expectedResolvedVersion
      ) {
        needsHuman("prepared graph changed an authorized root parent resolution");
      }
    } else if (target.version !== expectedResolvedVersion) {
      needsHuman("prepared graph changed an authorized target resolution");
    }
  }
}

export function validateInstalledGraph(
  graph,
  rawAuthorization,
  expectedResolvedVersion,
  strategy = "direct",
) {
  const authorization = assertAuthorization(rawAuthorization);
  if (!authorization.allowed_strategies.includes(strategy)) {
    needsHuman("installed graph strategy is not authorized");
  }
  assertStableExact(expectedResolvedVersion, "expected resolved version");
  const allEntries = collectInstalledGraph(graph);
  const entries = allEntries.filter((entry) => entry.name === authorization.dependency);
  if (entries.length === 0) {
    needsHuman("target dependency is absent from installed graph");
  }
  const vulnerable = entries.filter((entry) =>
    semver.satisfies(entry.version, authorization.normalized_range),
  );
  if (vulnerable.length > 0) {
    needsHuman("installed graph still contains a vulnerable target version");
  }
  validateAffectedPathResolutions(allEntries, authorization, expectedResolvedVersion, strategy);
  return entries;
}

export function parseLockPackageKey(key) {
  if (typeof key !== "string") {
    return null;
  }
  const normalized = key.replace(/^\/+/, "");
  const versionAt = normalized.startsWith("@")
    ? normalized.indexOf("@", normalized.indexOf("/") + 1)
    : normalized.indexOf("@");
  if (versionAt <= 0) {
    return null;
  }
  const name = normalized.slice(0, versionAt);
  return {
    name,
    version: parsePeerSuffixedSemVer(normalized.slice(versionAt + 1)),
  };
}

function lockPackageName(key) {
  return parseLockPackageKey(key)?.name ?? null;
}

function lockVersion(key) {
  return parseLockPackageKey(key)?.version ?? null;
}

export function scanPreparedLockfile(
  lockfileText,
  rawAuthorization,
  expectedResolvedVersion,
  strategy = "direct",
) {
  const authorization = assertAuthorization(rawAuthorization);
  if (!authorization.allowed_strategies.includes(strategy)) {
    needsHuman("prepared lockfile strategy is not authorized");
  }
  assertStableExact(expectedResolvedVersion, "expected resolved version");
  let lockfile;
  try {
    lockfile = parseYaml(lockfileText);
  } catch {
    needsHuman("prepared lockfile is not valid YAML");
  }
  if (!isPlainObject(lockfile)) {
    needsHuman("prepared lockfile has an invalid root");
  }
  const targetEntries = [];
  const allEntries = [];
  for (const sectionName of ["packages", "snapshots"]) {
    const section = lockfile[sectionName];
    if (!isPlainObject(section)) {
      continue;
    }
    for (const [key] of Object.entries(section)) {
      const name = lockPackageName(key);
      if (!name) {
        continue;
      }
      const version = lockVersion(key);
      if (!version) {
        const selectorParent =
          authorization.allowed_strategies.includes("override") &&
          typeof authorization.override?.selector === "string"
            ? parseExactParentSelector(authorization.override.selector)?.parentName
            : null;
        if (
          name === authorization.dependency ||
          name === authorization.root_parent?.root_dependency ||
          name === selectorParent
        ) {
          needsHuman("target lockfile entry has no exact version");
        }
        continue;
      }
      const entry = { section: sectionName, key, version, name };
      allEntries.push(entry);
      if (name === authorization.dependency && !isStableExactSemVer(version)) {
        needsHuman("target lockfile entry has no stable exact version");
      }
      if (entry.name === authorization.dependency) {
        targetEntries.push(entry);
      }
    }
  }
  if (targetEntries.length === 0) {
    needsHuman("target dependency is absent from prepared lockfile");
  }
  if (
    targetEntries.some((entry) => semver.satisfies(entry.version, authorization.normalized_range))
  ) {
    needsHuman("prepared lockfile still contains a vulnerable target version");
  }
  if (strategy === "root_parent") {
    const parentName = authorization.root_parent?.root_dependency;
    if (
      !parentName ||
      !allEntries.some(
        (entry) => entry.name === parentName && entry.version === expectedResolvedVersion,
      )
    ) {
      needsHuman("prepared root parent resolution does not match authorization");
    }
  } else if (!targetEntries.some((entry) => entry.version === expectedResolvedVersion)) {
    needsHuman("prepared target resolution does not match authorization");
  }
  return targetEntries;
}

function parseLockfileDocument(lockfileText, label) {
  let lockfile;
  try {
    lockfile = parseYaml(lockfileText);
  } catch {
    needsHuman(`${label} lockfile is not valid YAML`);
  }
  if (!isPlainObject(lockfile)) {
    needsHuman(`${label} lockfile has an invalid root`);
  }
  return lockfile;
}

function lockfileSection(lockfile, sectionName, label) {
  const section = lockfile[sectionName];
  if (section === undefined) {
    return {};
  }
  if (!isPlainObject(section)) {
    needsHuman(`${label} lockfile ${sectionName} section is invalid`);
  }
  return section;
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sortedKeys(value) {
  return Object.keys(value).sort();
}

function assertSameKeys(left, right, message) {
  if (!jsonEqual(sortedKeys(left), sortedKeys(right))) {
    needsHuman(message);
  }
}

function importerWithoutSelectedResolution(importer, field, dependency) {
  if (!isPlainObject(importer)) {
    needsHuman("root importer is invalid");
  }
  const copy = JSON.parse(JSON.stringify(importer));
  const fieldEntries = copy[field];
  if (!isPlainObject(fieldEntries) || !isPlainObject(fieldEntries[dependency])) {
    needsHuman("root parent importer entry is missing");
  }
  delete fieldEntries[dependency].specifier;
  delete fieldEntries[dependency].version;
  return copy;
}

function rootParentRecords(lockfile, rootDependency, versions, label) {
  const records = [];
  for (const sectionName of LOCKFILE_SECTIONS) {
    const section = lockfileSection(lockfile, sectionName, label);
    for (const [key, value] of Object.entries(section)) {
      const parsed = parseLockPackageKey(key);
      if (parsed?.name === rootDependency && !parsed.version) {
        needsHuman(`${label} root parent key has no stable exact version`);
      }
      if (!parsed || parsed.name !== rootDependency || !versions.has(parsed.version)) {
        continue;
      }
      if (!isPlainObject(value)) {
        needsHuman(`${label} root parent lockfile entry is invalid`);
      }
      records.push({ section: sectionName, key, value });
    }
  }
  if (records.length === 0 || !records.some((record) => record.section === "snapshots")) {
    needsHuman(`${label} root parent lockfile resolution is not proven`);
  }
  return records;
}

function resolvedChildIdentities(records) {
  const identities = new Set();
  for (const record of records.filter((entry) => entry.section === "snapshots")) {
    for (const field of LOCKFILE_DEPENDENCY_FIELDS) {
      if (record.value[field] === undefined) {
        continue;
      }
      if (!isPlainObject(record.value[field])) {
        needsHuman("root parent snapshot dependency section is invalid");
      }
      for (const [dependency, rawVersion] of Object.entries(record.value[field])) {
        const version = normalizeLockfileDependencyVersion(rawVersion);
        if (!version) {
          needsHuman("root parent snapshot dependency has no stable exact version");
        }
        identities.add(`${dependency}@${version}`);
      }
    }
  }
  return identities;
}

function recordsForIdentities(lockfile, identities, label) {
  const keys = new Set();
  for (const sectionName of LOCKFILE_SECTIONS) {
    const section = lockfileSection(lockfile, sectionName, label);
    for (const key of Object.keys(section)) {
      const parsed = parseLockPackageKey(key);
      if (parsed?.version && identities.has(`${parsed.name}@${parsed.version}`)) {
        keys.add(recordKey([sectionName, key]));
      }
    }
  }
  return keys;
}

function validateRootParentPreparedLockfile(
  baselineLockfileText,
  preparedLockfileText,
  authorization,
  expectedResolvedVersion,
) {
  const allowed = authorization.root_parent;
  if (!isPlainObject(allowed) || typeof baselineLockfileText !== "string") {
    needsHuman("root parent prepared validation requires the baseline lockfile");
  }
  const baseline = parseLockfileDocument(baselineLockfileText, "baseline");
  const prepared = parseLockfileDocument(preparedLockfileText, "prepared");
  const baselineImporters = lockfileSection(baseline, "importers", "baseline");
  const preparedImporters = lockfileSection(prepared, "importers", "prepared");
  assertSameKeys(
    baselineImporters,
    preparedImporters,
    "lockfile importer set changed unexpectedly",
  );
  const importerField = allowed.field;
  const dependency = allowed.root_dependency;
  const baselineImporter = baselineImporters["."];
  const preparedImporter = preparedImporters["."];
  const baselineEntry = baselineImporter?.[importerField]?.[dependency];
  const preparedEntry = preparedImporter?.[importerField]?.[dependency];
  if (!isPlainObject(baselineEntry) || !isPlainObject(preparedEntry)) {
    needsHuman("root parent importer entry is missing");
  }
  if (
    baselineEntry.specifier !== allowed.old_specifier ||
    normalizeLockfileDependencyVersion(baselineEntry.version) !== allowed.old_specifier ||
    preparedEntry.specifier !== expectedResolvedVersion ||
    normalizeLockfileDependencyVersion(preparedEntry.version) !== expectedResolvedVersion
  ) {
    needsHuman("prepared root parent importer resolution is outside authorization");
  }
  for (const importerName of Object.keys(baselineImporters)) {
    if (importerName !== ".") {
      if (!jsonEqual(baselineImporters[importerName], preparedImporters[importerName])) {
        needsHuman("unrelated lockfile importer changed");
      }
      continue;
    }
    if (
      !jsonEqual(
        importerWithoutSelectedResolution(baselineImporter, importerField, dependency),
        importerWithoutSelectedResolution(preparedImporter, importerField, dependency),
      )
    ) {
      needsHuman("unrelated root importer resolution changed");
    }
  }

  const unchangedTopLevel = new Set(["importers", "packages", "snapshots"]);
  const topLevelKeys = new Set([...Object.keys(baseline), ...Object.keys(prepared)]);
  for (const key of topLevelKeys) {
    if (unchangedTopLevel.has(key)) {
      continue;
    }
    if (!jsonEqual(baseline[key], prepared[key])) {
      needsHuman("unrelated lockfile top-level data changed");
    }
  }

  const rootVersions = new Set([allowed.old_specifier, expectedResolvedVersion]);
  const baselineRootRecords = rootParentRecords(baseline, dependency, rootVersions, "baseline");
  const preparedRootRecords = rootParentRecords(prepared, dependency, rootVersions, "prepared");
  const allowedIdentities = new Set([
    `${dependency}@${allowed.old_specifier}`,
    `${dependency}@${expectedResolvedVersion}`,
  ]);
  for (const identity of resolvedChildIdentities(baselineRootRecords)) {
    allowedIdentities.add(identity);
  }
  for (const identity of resolvedChildIdentities(preparedRootRecords)) {
    allowedIdentities.add(identity);
  }
  const allowedRecordKeys = new Set([
    ...recordsForIdentities(baseline, allowedIdentities, "baseline"),
    ...recordsForIdentities(prepared, allowedIdentities, "prepared"),
  ]);
  for (const sectionName of LOCKFILE_SECTIONS) {
    const baselineSection = lockfileSection(baseline, sectionName, "baseline");
    const preparedSection = lockfileSection(prepared, sectionName, "prepared");
    const keys = new Set([...Object.keys(baselineSection), ...Object.keys(preparedSection)]);
    for (const key of keys) {
      if (jsonEqual(baselineSection[key], preparedSection[key])) {
        continue;
      }
      if (!allowedRecordKeys.has(recordKey([sectionName, key]))) {
        needsHuman("root parent update changed an unauthorized lockfile resolution");
      }
    }
  }
}

function selectorEdgeIdentity(edge) {
  return recordKey([
    edge.parent_name,
    edge.parent_version,
    edge.parent_section,
    edge.parent_key,
    edge.dependency,
    edge.declaration_field,
  ]);
}

function validatePreparedOverrideLockfile(
  baselineLockfileText,
  preparedLockfileText,
  installedGraph,
  authorization,
  expectedResolvedVersion,
) {
  const allowed = authorization.override;
  if (!isPlainObject(allowed) || typeof baselineLockfileText !== "string") {
    needsHuman("override prepared validation requires the baseline lockfile");
  }
  const baselineProof = collectBaselineSelectorProof(baselineLockfileText, allowed.selector);
  if (
    !sameRecordSet(allowed.baseline_instances, baselineProof.baseline_instances) ||
    !sameRecordSet(allowed.baseline_selector_edges, baselineProof.baseline_selector_edges)
  ) {
    needsHuman("override authorization does not match the baseline lockfile");
  }
  const preparedProof = collectBaselineSelectorProof(preparedLockfileText, allowed.selector);
  if (!sameRecordSet(preparedProof.baseline_instances, allowed.baseline_instances)) {
    needsHuman("prepared override selector instances are outside authorization");
  }
  const expectedIdentities = new Set(
    allowed.baseline_selector_edges.map((edge) => selectorEdgeIdentity(edge)),
  );
  const preparedIdentities = new Set(
    preparedProof.baseline_selector_edges.map((edge) => selectorEdgeIdentity(edge)),
  );
  if (
    expectedIdentities.size !== preparedIdentities.size ||
    [...expectedIdentities].some((identity) => !preparedIdentities.has(identity))
  ) {
    needsHuman("prepared override selector edges are outside authorization");
  }
  if (
    preparedProof.baseline_selector_edges.some(
      (edge) => edge.baseline_resolved_version !== expectedResolvedVersion,
    )
  ) {
    needsHuman("prepared override selector edge is not the expected exact version");
  }
  const selector = parseExactParentSelector(allowed.selector);
  if (!selector) {
    needsHuman("override selector is not an exact parent selector");
  }
  const entries = collectInstalledGraph(installedGraph);
  for (const entry of entries) {
    if (entry.name !== selector.targetName || entry.path.length < 2) {
      continue;
    }
    const parentPath = entry.path.slice(0, -1);
    const parent = entries.find((candidate) => pathMatches(candidate.path, parentPath));
    if (
      parent?.name === selector.parentName &&
      parent.version === selector.parentVersion &&
      entry.version !== expectedResolvedVersion
    ) {
      needsHuman("prepared installed graph has an unexpected override target version");
    }
  }
}

/**
 * @param {{
 *   baselinePackage: any,
 *   candidatePackage: any,
 *   authorization: any,
 *   lockfileText: string,
 *   baselineLockfileText?: string,
 *   installedGraph?: unknown,
 * }} input
 */
export function validatePreparedFix({
  baselinePackage,
  candidatePackage,
  authorization,
  lockfileText,
  baselineLockfileText = undefined,
  installedGraph,
}) {
  const mutation = validatePackageChange(baselinePackage, candidatePackage, authorization);
  scanPreparedLockfile(
    lockfileText,
    mutation.authorization,
    mutation.expectedResolvedVersion,
    mutation.strategy,
  );
  if (mutation.strategy === "root_parent") {
    validateRootParentPreparedLockfile(
      baselineLockfileText,
      lockfileText,
      mutation.authorization,
      mutation.expectedResolvedVersion,
    );
  }
  if (mutation.strategy === "override") {
    validatePreparedOverrideLockfile(
      baselineLockfileText,
      lockfileText,
      installedGraph,
      mutation.authorization,
      mutation.expectedResolvedVersion,
    );
  }
  if (installedGraph === undefined) {
    needsHuman("prepared validation requires the installed graph");
  }
  validateInstalledGraph(
    installedGraph,
    mutation.authorization,
    mutation.expectedResolvedVersion,
    mutation.strategy,
  );
  return mutation;
}

export function dependencyKey(packageName) {
  if (!isSafePackageName(packageName)) {
    needsHuman("invalid package name for branch key");
  }
  const digest = createHash("sha256").update(packageName, "utf8").digest("hex").slice(0, 8);
  const readable = packageName
    .toLowerCase()
    .replace(/^@/, "")
    .replaceAll("/", "--")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${readable || "dependency"}-${digest}`;
}

export async function sha256File(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

function argumentMap(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    args.set(item, argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : true);
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function cli(argv) {
  const args = argumentMap(argv);
  if (args.has("--branch-key")) {
    console.log(dependencyKey(args.get("--branch-key")));
    return;
  }
  const baselinePath = args.get("--baseline-package");
  const candidatePath = args.get("--candidate-package");
  const authorizationPath = args.get("--authorization");
  if (args.has("--prepare-authorization")) {
    const contextPath = args.get("--context");
    const rootPackagePath = args.get("--root-package");
    const graphPath = args.get("--graph");
    const outputPath = args.get("--output");
    if (!contextPath || !rootPackagePath || !graphPath || !outputPath) {
      throw new Error(
        "authorization preparation requires context, root package, graph, and output paths",
      );
    }
    const authorization = createAuthorization({
      context: await readJson(contextPath),
      rootPackage: await readJson(rootPackagePath),
      installedGraph: await readJson(graphPath),
      rootParentCandidates: args.has("--root-parent-candidates")
        ? await readJson(args.get("--root-parent-candidates"))
        : [],
      overrideCandidates: args.has("--override-candidates")
        ? await readJson(args.get("--override-candidates"))
        : [],
      baselineLockfile: args.has("--lockfile")
        ? await readFile(args.get("--lockfile"), "utf8")
        : undefined,
    });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(outputPath, `${JSON.stringify(authorization, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ strategy_count: authorization.allowed_strategies.length }));
    return;
  }
  if (!baselinePath || !candidatePath || !authorizationPath) {
    throw new Error("baseline, candidate, and authorization paths are required");
  }
  const baselinePackage = await readJson(baselinePath);
  const candidatePackage = await readJson(candidatePath);
  const authorization = await readJson(authorizationPath);
  if (args.has("--validate-prepared")) {
    const lockfilePath = args.get("--lockfile");
    const graphPath = args.get("--graph");
    if (!lockfilePath) {
      throw new Error("prepared validation requires a lockfile");
    }
    const mutation = validatePreparedFix({
      baselinePackage,
      candidatePackage,
      authorization,
      lockfileText: await readFile(lockfilePath, "utf8"),
      baselineLockfileText: args.has("--baseline-lockfile")
        ? await readFile(args.get("--baseline-lockfile"), "utf8")
        : undefined,
      installedGraph: graphPath ? await readJson(graphPath) : undefined,
    });
    console.log(
      JSON.stringify({
        strategy: mutation.strategy,
        expected_resolved_version: mutation.expectedResolvedVersion,
      }),
    );
    return;
  }
  const mutation = validatePackageChange(baselinePackage, candidatePackage, authorization);
  console.log(
    JSON.stringify({
      strategy: mutation.strategy,
      expected_resolved_version: mutation.expectedResolvedVersion,
    }),
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cli(process.argv.slice(2)).catch((error) => {
    if (error instanceof NeedsHumanError) {
      console.error("needs_human");
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
  });
}
