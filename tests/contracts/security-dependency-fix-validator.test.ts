import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  collectInstalledGraph,
  collectBaselineSelectorProof,
  createAuthorization,
  dependencyKey,
  isStableExactSemVer,
  normalizeVulnerableRange,
  parseLockPackageKey,
  scanPreparedLockfile,
  validateInstalledGraph,
  validatePackageChange,
  validatePreparedFix,
} from "../../scripts/validate-security-dependency-fix.mjs";

const validatorSource = readFileSync("scripts/validate-security-dependency-fix.mjs", "utf8");

const directAuthorization = {
  schema_version: 1,
  base_sha: "base-sha",
  dependency: "demo-target",
  ecosystem: "npm",
  ghsa_id: "GHSA-public-fixture",
  vulnerable_range: "<1.2.3",
  first_patched_version: "1.2.3",
  affected_paths: [
    {
      path: ["fixture-root", "demo-target"],
      baseline_resolved_version: "1.2.2",
      root_dependency: "demo-target",
      immediate_parent: null,
    },
  ],
  allowed_strategies: ["direct"],
  direct: {
    field: "dependencies",
    old_specifier: "1.2.2",
    new_specifier: "1.2.3",
    expected_resolved_version: "1.2.3",
  },
};

const baselinePackage = {
  name: "fixture-root",
  version: "0.1.0",
  dependencies: {
    "demo-target": "1.2.2",
  },
};

const candidatePackage = {
  ...baselinePackage,
  dependencies: {
    "demo-target": "1.2.3",
  },
};

const safeGraph = [
  {
    name: "fixture-root",
    version: "0.1.0",
    dependencies: {
      "demo-target": {
        version: "1.2.3",
      },
    },
  },
];

const safeLockfile = `lockfileVersion: '9.0'
packages:
  demo-target@1.2.3:
    resolution: {}
snapshots:
  demo-target@1.2.3: {}
`;

const parentScopedSelector = "demo-parent@1.0.0>demo-target";
const parentScopedLockfile = `lockfileVersion: '9.0'
packages:
  demo-parent@1.0.0:
    resolution: {}
  'demo-parent@1.0.0(foo@1.0.0)':
    resolution: {}
  demo-target@1.2.2:
    resolution: {}
snapshots:
  demo-parent@1.0.0:
    dependencies:
      demo-target: 1.2.2
  'demo-parent@1.0.0(foo@1.0.0)':
    dependencies:
      demo-target: 1.2.1
  demo-target@1.2.2: {}
`;

const parentScopedNestedLockfile = `lockfileVersion: '9.0'
packages:
  demo-parent@1.0.0:
    resolution: {}
  'demo-parent@1.0.0(foo@1.0.0)(bar@2.0.0)':
    resolution: {}
snapshots:
  demo-parent@1.0.0:
    dependencies:
      demo-target: 1.2.2
  'demo-parent@1.0.0(foo@1.0.0)(bar@2.0.0)':
    dependencies:
      demo-target: 1.2.1
`;

const rootParentBaselineLockfile = `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      demo-parent:
        specifier: 1.0.0
        version: 1.0.0
      unrelated:
        specifier: 2.0.0
        version: 2.0.0
packages:
  demo-parent@1.0.0:
    resolution: {}
  demo-target@1.2.2:
    resolution: {}
  unrelated@2.0.0:
    resolution: {}
snapshots:
  demo-parent@1.0.0:
    dependencies:
      demo-target: 1.2.2
  demo-target@1.2.2: {}
  unrelated@2.0.0: {}
`;

const rootParentPreparedLockfile = `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      demo-parent:
        specifier: 1.0.1
        version: 1.0.1
      unrelated:
        specifier: 2.0.0
        version: 2.0.0
packages:
  demo-parent@1.0.1:
    resolution: {}
  demo-target@1.2.3:
    resolution: {}
  unrelated@2.0.0:
    resolution: {}
snapshots:
  demo-parent@1.0.1:
    dependencies:
      demo-target: 1.2.3
  demo-target@1.2.3: {}
  unrelated@2.0.0: {}
`;

function parentScopedGraph(parentVersion = "1.0.0", targetVersion = "1.2.2") {
  return [
    {
      name: "fixture-root",
      version: "0.1.0",
      dependencies: {
        "demo-parent": {
          version: parentVersion,
          dependencies: { "demo-target": { version: targetVersion } },
        },
      },
    },
  ];
}

function parentScopedOverrideCandidate(lockfileText: string) {
  const proof = collectBaselineSelectorProof(lockfileText, parentScopedSelector);
  return {
    selector: parentScopedSelector,
    value: "1.2.3",
    affected_edges: [
      {
        path: ["fixture-root", "demo-parent", "demo-target"],
        parent: "demo-parent",
        parent_version: "1.0.0",
        dependency: "demo-target",
        baseline_resolved_version: "1.2.2",
      },
    ],
    ...proof,
    declaration_ranges: { dependencies: ">=1.0.0 <2.0.0" },
  };
}

function parentScopedAuthorizationInput(
  lockfileText = parentScopedLockfile,
  installedGraph = parentScopedGraph(),
) {
  return {
    context: {
      dependency: "demo-target",
      ecosystem: "npm",
      ghsa_id: "GHSA-public-fixture",
      vulnerable_range: "<1.2.3",
      first_patched_version: "1.2.3",
      base_sha: "base-sha",
    },
    rootPackage: {
      name: "fixture-root",
      dependencies: { "demo-parent": "1.0.0" },
    },
    installedGraph,
    baselineLockfile: lockfileText,
    overrideCandidates: [parentScopedOverrideCandidate(lockfileText)],
  };
}

const rootParentAuthorization = {
  ...directAuthorization,
  affected_paths: [
    {
      path: ["fixture-root", "demo-parent", "demo-target"],
      baseline_resolved_version: "1.2.2",
      root_dependency: "demo-parent",
      immediate_parent: "demo-parent",
      parent_version: "1.0.0",
    },
  ],
  allowed_strategies: ["root_parent"],
  root_parent: {
    field: "dependencies",
    root_dependency: "demo-parent",
    old_specifier: "1.0.0",
    candidates: [{ new_specifier: "1.0.1", expected_resolved_version: "1.0.1" }],
  },
};

const rootParentBaselinePackage = {
  name: "fixture-root",
  dependencies: {
    "demo-parent": "1.0.0",
  },
};

const rootParentCandidatePackage = {
  name: "fixture-root",
  dependencies: {
    "demo-parent": "1.0.1",
  },
};

const rootParentSafeGraph = parentScopedGraph("1.0.1", "1.2.3");

function expectNeedsHuman(action: () => unknown) {
  expect(action).toThrowError(
    /needs|authorized|authorization|resolution|specifier|strategy|validator|target|vulnerable|major|downgrade|selector|baseline|edge|installed|safe/i,
  );
}

describe("Security dependency fix validator", () => {
  it("keeps the validator trust dependencies fixed and exposes no network resolver", () => {
    expect(validatorSource).toContain('from "semver"');
    expect(validatorSource).toContain('from "yaml"');
    expect(validatorSource).not.toContain("npm install");
    expect(validatorSource).toContain('authorization.dependency === "semver"');
    expect(validatorSource).toContain('authorization.dependency === "yaml"');
  });

  it("normalizes only comma-separated GitHub ranges and recognizes stable exact versions", () => {
    expect(normalizeVulnerableRange(">=1.0.0,<2.0.0")).toBe(">=1.0.0 <2.0.0");
    expect(isStableExactSemVer("1.2.3")).toBe(true);
    expect(isStableExactSemVer("1.2.3-beta.1")).toBe(false);
    expect(isStableExactSemVer("^1.2.3")).toBe(false);
  });

  it("parses registry lockfile keys with one or more nested peer suffixes", () => {
    expect(parseLockPackageKey("foo@1.2.3")).toEqual({ name: "foo", version: "1.2.3" });
    expect(parseLockPackageKey("foo@1.2.3(peer@4.5.6)")).toEqual({
      name: "foo",
      version: "1.2.3",
    });
    expect(parseLockPackageKey("foo@1.2.3(peer@4.5.6)(bar@2.0.0)")).toEqual({
      name: "foo",
      version: "1.2.3",
    });
    expect(parseLockPackageKey("@scope/foo@1.2.3(peer@4.5.6)")).toEqual({
      name: "@scope/foo",
      version: "1.2.3",
    });
    expect(parseLockPackageKey("foo@not-a-version(peer@4.5.6)")).toEqual({
      name: "foo",
      version: null,
    });
  });

  it("accepts one direct same-major first-patched exact update", () => {
    expect(
      validatePackageChange(baselinePackage, candidatePackage, directAuthorization),
    ).toMatchObject({
      strategy: "direct",
      expectedResolvedVersion: "1.2.3",
    });
  });

  it("creates direct authorization only from a vulnerable installed path", () => {
    const authorization = createAuthorization({
      context: {
        dependency: "demo-target",
        ecosystem: "npm",
        ghsa_id: "GHSA-public-fixture",
        vulnerable_range: "<1.2.3",
        first_patched_version: "1.2.3",
        base_sha: "base-sha",
      },
      rootPackage: baselinePackage,
      installedGraph: [
        {
          name: "fixture-root",
          version: "0.1.0",
          dependencies: { "demo-target": { version: "1.2.2" } },
        },
      ],
    });
    expect(authorization).toMatchObject({
      allowed_strategies: ["direct"],
      direct: {
        field: "dependencies",
        expected_resolved_version: "1.2.3",
      },
    });
  });

  it("rejects major, downgrade, range, and unrelated manifest mutations", () => {
    const majorCandidate = {
      ...candidatePackage,
      dependencies: { "demo-target": "2.0.0" },
    };
    const downgradeCandidate = {
      ...candidatePackage,
      dependencies: { "demo-target": "1.1.9" },
    };
    const rangedBaseline = {
      ...baselinePackage,
      dependencies: { "demo-target": "^1.2.2" },
    };
    const unrelatedCandidate = {
      ...candidatePackage,
      scripts: { test: "unexpected" },
    };

    expectNeedsHuman(() =>
      validatePackageChange(baselinePackage, majorCandidate, directAuthorization),
    );
    expectNeedsHuman(() =>
      validatePackageChange(baselinePackage, downgradeCandidate, directAuthorization),
    );
    expectNeedsHuman(() =>
      validatePackageChange(rangedBaseline, candidatePackage, directAuthorization),
    );
    expectNeedsHuman(() =>
      validatePackageChange(baselinePackage, unrelatedCandidate, directAuthorization),
    );
  });

  it("rejects target dependencies that would replace the validator trust graph", () => {
    for (const dependency of ["semver", "yaml"]) {
      expectNeedsHuman(() =>
        validatePackageChange(
          { dependencies: { [dependency]: "1.2.2" } },
          { dependencies: { [dependency]: "1.2.3" } },
          { ...directAuthorization, dependency, direct: { ...directAuthorization.direct } },
        ),
      );
    }
  });

  it("requires installed target paths and rejects vulnerable resolved versions", () => {
    expect(collectInstalledGraph(safeGraph)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "demo-target", version: "1.2.3" })]),
    );
    expect(validateInstalledGraph(safeGraph, directAuthorization, "1.2.3")).toHaveLength(1);
    expectNeedsHuman(() => validateInstalledGraph([], directAuthorization, "1.2.3"));
    expectNeedsHuman(() =>
      validateInstalledGraph(
        [
          {
            name: "fixture-root",
            version: "0.1.0",
            dependencies: { "demo-target": { version: "1.2.2" } },
          },
        ],
        directAuthorization,
        "1.2.3",
      ),
    );
  });

  it("scans packages and snapshots for vulnerable target entries", () => {
    expect(scanPreparedLockfile(safeLockfile, directAuthorization, "1.2.3")).toHaveLength(2);
    const peerSuffixedTarget = safeLockfile.replaceAll(
      "demo-target@1.2.3",
      "'demo-target@1.2.3(peer@4.5.6)(bar@2.0.0)'",
    );
    expect(scanPreparedLockfile(peerSuffixedTarget, directAuthorization, "1.2.3")).toHaveLength(2);
    expectNeedsHuman(() =>
      scanPreparedLockfile(safeLockfile.replaceAll("1.2.3", "1.2.2"), directAuthorization, "1.2.3"),
    );
  });

  it("validates the prepared package, lockfile, and graph as one immutable candidate", () => {
    expect(
      validatePreparedFix({
        baselinePackage,
        candidatePackage,
        authorization: directAuthorization,
        lockfileText: safeLockfile,
        installedGraph: safeGraph,
      }),
    ).toMatchObject({ strategy: "direct", expectedResolvedVersion: "1.2.3" });
  });

  it("supports root-parent exact candidate authorization without allowing a major update", () => {
    const authorization = {
      ...directAuthorization,
      allowed_strategies: ["root_parent"],
      root_parent: {
        field: "dependencies",
        root_dependency: "demo-parent",
        old_specifier: "1.0.0",
        candidates: [{ new_specifier: "1.0.1", expected_resolved_version: "1.0.1" }],
      },
    };
    const before = { name: "fixture-root", dependencies: { "demo-parent": "1.0.0" } };
    const after = { name: "fixture-root", dependencies: { "demo-parent": "1.0.1" } };
    expect(validatePackageChange(before, after, authorization)).toMatchObject({
      strategy: "root_parent",
      expectedResolvedVersion: "1.0.1",
    });
    expectNeedsHuman(() =>
      validatePackageChange(
        before,
        { name: "fixture-root", dependencies: { "demo-parent": "2.0.0" } },
        authorization,
      ),
    );
  });

  it("accepts a root-parent prepared lockfile when only its allowed resolution changes", () => {
    expect(
      validatePreparedFix({
        baselinePackage: rootParentBaselinePackage,
        candidatePackage: rootParentCandidatePackage,
        authorization: rootParentAuthorization,
        baselineLockfileText: rootParentBaselineLockfile,
        lockfileText: rootParentPreparedLockfile,
        installedGraph: rootParentSafeGraph,
      }),
    ).toMatchObject({ strategy: "root_parent", expectedResolvedVersion: "1.0.1" });
  });

  it("rejects an unrelated top-level lockfile resolution during a root-parent update", () => {
    const unrelatedChange = rootParentPreparedLockfile
      .replace("version: 2.0.0", "version: 2.0.1")
      .replace("unrelated@2.0.0", "unrelated@2.0.1");
    expectNeedsHuman(() =>
      validatePreparedFix({
        baselinePackage: rootParentBaselinePackage,
        candidatePackage: rootParentCandidatePackage,
        authorization: rootParentAuthorization,
        baselineLockfileText: rootParentBaselineLockfile,
        lockfileText: unrelatedChange,
        installedGraph: rootParentSafeGraph,
      }),
    );
  });

  it("accepts only an exact parent-scoped override selector", () => {
    const authorization = {
      ...directAuthorization,
      allowed_strategies: ["override"],
      affected_paths: [
        {
          path: ["fixture-root", "demo-parent", "demo-target"],
          baseline_resolved_version: "1.2.2",
          root_dependency: "demo-parent",
          immediate_parent: "demo-parent",
          parent_version: "1.0.0",
        },
      ],
      override: {
        selector: "demo-parent@1.0.0>demo-target",
        value: "1.2.3",
        expected_resolved_version: "1.2.3",
        affected_edges: [
          {
            path: ["fixture-root", "demo-parent", "demo-target"],
            parent: "demo-parent",
            parent_version: "1.0.0",
            dependency: "demo-target",
            baseline_resolved_version: "1.2.2",
          },
        ],
        baseline_instances: [
          { section: "snapshots", key: "demo-parent@1.0.0", name: "demo-parent", version: "1.0.0" },
          {
            section: "snapshots",
            key: "demo-parent@1.0.0(foo@1.0.0)",
            name: "demo-parent",
            version: "1.0.0",
          },
        ],
        baseline_selector_edges: [
          {
            parent_name: "demo-parent",
            parent_version: "1.0.0",
            parent_section: "snapshots",
            parent_key: "demo-parent@1.0.0",
            dependency: "demo-target",
            baseline_resolved_version: "1.2.2",
            declaration_field: "dependencies",
          },
          {
            parent_name: "demo-parent",
            parent_version: "1.0.0",
            parent_section: "snapshots",
            parent_key: "demo-parent@1.0.0(foo@1.0.0)",
            dependency: "demo-target",
            baseline_resolved_version: "1.2.1",
            declaration_field: "dependencies",
          },
        ],
        declaration_ranges: { dependencies: ">=1.0.0 <2.0.0" },
      },
    };
    expect(
      validatePackageChange(
        { pnpm: { overrides: {} } },
        { pnpm: { overrides: { "demo-parent@1.0.0>demo-target": "1.2.3" } } },
        authorization,
      ),
    ).toMatchObject({ strategy: "override", expectedResolvedVersion: "1.2.3" });
    expectNeedsHuman(() =>
      validatePackageChange(
        { pnpm: { overrides: {} } },
        { pnpm: { overrides: { "demo-parent@* >demo-target": "1.2.3" } } },
        authorization,
      ),
    );
  });

  it("authorizes a parent-scoped override only when it covers every vulnerable edge", () => {
    const authorization = createAuthorization(parentScopedAuthorizationInput());
    expect(authorization).toMatchObject({
      allowed_strategies: ["override"],
      override: {
        baseline_instances: expect.arrayContaining([
          expect.objectContaining({ key: "demo-parent@1.0.0" }),
          expect.objectContaining({ key: "demo-parent@1.0.0(foo@1.0.0)" }),
        ]),
        baseline_selector_edges: expect.arrayContaining([
          expect.objectContaining({ baseline_resolved_version: "1.2.2" }),
          expect.objectContaining({ baseline_resolved_version: "1.2.1" }),
        ]),
      },
    });
  });

  it("requires every prepared parent-scoped edge to resolve to the authorized exact version", () => {
    const authorization = createAuthorization(parentScopedAuthorizationInput());
    const before = { pnpm: { overrides: {} } };
    const after = { pnpm: { overrides: { [parentScopedSelector]: "1.2.3" } } };
    const prepared = parentScopedLockfile
      .replaceAll("demo-target@1.2.2", "demo-target@1.2.3")
      .replaceAll("demo-target: 1.2.2", "demo-target: 1.2.3")
      .replaceAll("demo-target: 1.2.1", "demo-target: 1.2.3");
    const safeGraph = parentScopedGraph("1.0.0", "1.2.3");
    expect(
      validatePreparedFix({
        baselinePackage: before,
        candidatePackage: after,
        authorization,
        baselineLockfileText: parentScopedLockfile,
        lockfileText: prepared,
        installedGraph: safeGraph,
      }),
    ).toMatchObject({ strategy: "override", expectedResolvedVersion: "1.2.3" });

    expectNeedsHuman(() =>
      validatePreparedFix({
        baselinePackage: before,
        candidatePackage: after,
        authorization,
        baselineLockfileText: parentScopedLockfile,
        lockfileText: prepared.replace("demo-target: 1.2.3", "demo-target: 1.2.4"),
        installedGraph: safeGraph,
      }),
    );
  });

  it("rejects a newly added prepared selector instance", () => {
    const authorization = createAuthorization(parentScopedAuthorizationInput());
    const prepared = parentScopedLockfile
      .replaceAll("demo-target@1.2.2", "demo-target@1.2.3")
      .replaceAll("demo-target: 1.2.2", "demo-target: 1.2.3")
      .replaceAll("demo-target: 1.2.1", "demo-target: 1.2.3");
    const addedInstance = prepared.replace(
      "snapshots:\n  demo-parent@1.0.0:",
      "snapshots:\n  'demo-parent@1.0.0(extra@3.0.0)':\n    dependencies:\n      demo-target: 1.2.3\n  demo-parent@1.0.0:",
    );
    expectNeedsHuman(() =>
      validatePreparedFix({
        baselinePackage: { pnpm: { overrides: {} } },
        candidatePackage: { pnpm: { overrides: { [parentScopedSelector]: "1.2.3" } } },
        authorization,
        baselineLockfileText: parentScopedLockfile,
        lockfileText: addedInstance,
        installedGraph: parentScopedGraph("1.0.0", "1.2.3"),
      }),
    );
  });

  it("rejects a selector that would also update a safe baseline edge", () => {
    const safeBaseline = parentScopedLockfile.replace("demo-target: 1.2.1", "demo-target: 1.3.0");
    expectNeedsHuman(() => createAuthorization(parentScopedAuthorizationInput(safeBaseline)));
  });

  it("rejects a selector with an unparseable baseline target version", () => {
    const invalidBaseline = parentScopedLockfile.replace(
      "demo-target: 1.2.1",
      "demo-target: not-a-version",
    );
    expectNeedsHuman(() =>
      createAuthorization({
        ...parentScopedAuthorizationInput(),
        baselineLockfile: invalidBaseline,
        overrideCandidates: [
          {
            ...parentScopedOverrideCandidate(parentScopedLockfile),
            baseline_selector_edges: [],
          },
        ],
      }),
    );
  });

  it("includes multiple peer-suffix parent instances in baseline proof and fails closed for a safe hidden edge", () => {
    const authorization = createAuthorization(
      parentScopedAuthorizationInput(parentScopedNestedLockfile),
    );
    expect(authorization).toMatchObject({
      override: {
        baseline_instances: expect.arrayContaining([
          expect.objectContaining({ key: "demo-parent@1.0.0" }),
          expect.objectContaining({
            key: "demo-parent@1.0.0(foo@1.0.0)(bar@2.0.0)",
          }),
        ]),
        baseline_selector_edges: expect.arrayContaining([
          expect.objectContaining({ baseline_resolved_version: "1.2.1" }),
          expect.objectContaining({ baseline_resolved_version: "1.2.2" }),
        ]),
      },
    });

    const safeHiddenEdge = parentScopedNestedLockfile.replace(
      "demo-target: 1.2.1",
      "demo-target: 1.3.0",
    );
    expectNeedsHuman(() => createAuthorization(parentScopedAuthorizationInput(safeHiddenEdge)));
  });

  it("rejects a target parent key whose peer-suffixed version cannot be parsed", () => {
    const invalidParentKey = parentScopedLockfile.replace(
      "'demo-parent@1.0.0(foo@1.0.0)':",
      "'demo-parent@not-a-version(foo@1.0.0)':",
    );
    expectNeedsHuman(() => collectBaselineSelectorProof(invalidParentKey, parentScopedSelector));
  });

  it("rejects a baseline selector that contradicts the installed parent version", () => {
    expectNeedsHuman(() =>
      createAuthorization(
        parentScopedAuthorizationInput(parentScopedLockfile, parentScopedGraph("1.0.1")),
      ),
    );
  });

  it("generates a deterministic public branch key with an original-name digest", () => {
    expect(dependencyKey("@scope/pkg")).toMatch(/^scope-pkg-[0-9a-f]{8}$/);
    expect(dependencyKey("Demo.Pkg")).toMatch(/^demo.pkg-[0-9a-f]{8}$/);
  });
});
