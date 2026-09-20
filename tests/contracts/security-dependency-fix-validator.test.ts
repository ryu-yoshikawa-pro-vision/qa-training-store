import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  collectInstalledGraph,
  createAuthorization,
  dependencyKey,
  isStableExactSemVer,
  normalizeVulnerableRange,
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

function expectNeedsHuman(action: () => unknown) {
  expect(action).toThrowError(
    /needs|authorized|authorization|resolution|specifier|strategy|validator|target|vulnerable|major|downgrade/i,
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
        baseline_instances: [{ name: "demo-parent", version: "1.0.0" }],
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
    const authorization = createAuthorization({
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
      installedGraph: [
        {
          name: "fixture-root",
          version: "0.1.0",
          dependencies: {
            "demo-parent": {
              version: "1.0.0",
              dependencies: { "demo-target": { version: "1.2.2" } },
            },
          },
        },
      ],
      overrideCandidates: [
        {
          selector: "demo-parent@1.0.0>demo-target",
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
          baseline_instances: [{ name: "demo-parent", version: "1.0.0" }],
          declaration_ranges: { dependencies: ">=1.0.0 <2.0.0" },
        },
      ],
    });
    expect(authorization).toMatchObject({ allowed_strategies: ["override"] });
  });

  it("generates a deterministic public branch key with an original-name digest", () => {
    expect(dependencyKey("@scope/pkg")).toMatch(/^scope-pkg-[0-9a-f]{8}$/);
    expect(dependencyKey("Demo.Pkg")).toMatch(/^demo.pkg-[0-9a-f]{8}$/);
  });
});
