import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync("renovate.json", "utf8")) as {
  extends?: unknown;
  enabledManagers?: unknown;
  osvVulnerabilityAlerts?: unknown;
  dependencyDashboard?: unknown;
  automerge?: unknown;
  semanticCommits?: unknown;
  branchPrefix?: unknown;
  commitMessageAction?: unknown;
  commitMessageTopic?: unknown;
  prBodyTemplate?: unknown;
  prHeader?: unknown;
  prBodyColumns?: unknown;
  prBodyDefinitions?: Record<string, unknown>;
  packageRules?: Record<string, unknown>[];
  prConcurrentLimit?: unknown;
  vulnerabilityAlerts?: {
    enabled?: unknown;
    automerge?: unknown;
    vulnerabilityFixStrategy?: unknown;
    prConcurrentLimit?: unknown;
    branchTopic?: unknown;
    branchConcurrentLimit?: unknown;
  };
};

const forbiddenPublicMetadata = [
  "notes",
  "warnings",
  "changelogs",
  "configDescription",
  "controls",
  "footer",
];

describe("Renovate Security Update configuration", () => {
  it("enables only the explicitly bounded Security Update path", () => {
    expect(config.extends).toEqual(["security:only-security-updates"]);
    expect(config.enabledManagers).toEqual(["npm"]);
    expect(config.osvVulnerabilityAlerts).toBe(false);
    expect(config.dependencyDashboard).toBe(false);
    expect(config.automerge).toBe(false);
    expect(config.semanticCommits).toBe("disabled");
    expect(config.branchPrefix).toBe("renovate/");
    expect(config.vulnerabilityAlerts).toMatchObject({
      enabled: true,
      automerge: false,
      vulnerabilityFixStrategy: "lowest",
      prConcurrentLimit: 3,
      branchTopic: "{{{depNameSanitized}}}-security",
    });
    expect(config.vulnerabilityAlerts?.prConcurrentLimit).toBe(3);
    expect(config).not.toHaveProperty("prConcurrentLimit");
    expect(config.vulnerabilityAlerts).not.toHaveProperty("branchConcurrentLimit");
  });

  it("disables normal dependency updates without adding a global update budget", () => {
    const normalUpdateRule = config.packageRules?.find(
      (rule) =>
        Array.isArray(rule.matchPackageNames) &&
        rule.matchPackageNames.length === 1 &&
        rule.matchPackageNames[0] === "*",
    );

    expect(normalUpdateRule).toMatchObject({ enabled: false });
    expect(config).not.toHaveProperty("schedule");
    expect(config).not.toHaveProperty("branchConcurrentLimit");
  });

  it("keeps the public Security PR template to the approved minimum", () => {
    expect(config.commitMessageAction).toBe("Security Update");
    expect(config.commitMessageTopic).toBe("dependency {{depName}}");
    expect(config.prBodyTemplate).toBe("{{{header}}}{{{table}}}");
    expect(config.prHeader).toBe(
      "Security Update\n\nCI and human review are required before merge.\n\n",
    );
    expect(config.prBodyColumns).toEqual(["Package", "Change"]);
    expect(config.prBodyDefinitions?.Package).toBe("`{{{depName}}}`");

    const publicTemplate = JSON.stringify({
      prBodyTemplate: config.prBodyTemplate,
      prHeader: config.prHeader,
      prBodyColumns: config.prBodyColumns,
      prBodyDefinitions: config.prBodyDefinitions,
    }).toLowerCase();

    for (const forbidden of forbiddenPublicMetadata) {
      expect(publicTemplate).not.toContain(forbidden.toLowerCase());
    }
    expect(publicTemplate).not.toMatch(/alert|severity|advisory|ghsa|actual.?exposure|triage/);
  });
});
