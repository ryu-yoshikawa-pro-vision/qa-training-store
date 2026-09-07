import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validatePlanOutput } from "../../.agents/skills/feature-plan/scripts/validate-plan-output";
import { qaFindingsSchema, type Charter } from "../../scripts/agentic-qa/contracts";
import { assertCoverageIntegrity } from "../../scripts/agentic-qa/coverage";

const canonicalTemplate = fs.readFileSync(
  path.resolve(__dirname, "../../.agents/skills/feature-plan/assets/plan-template.md"),
  "utf8",
);

function firstRequiredHeading(template: string): { index: number; heading: string } {
  const lines = template.split(/\r?\n/);
  const index = lines.findIndex((line) => /^ {0,3}## /.test(line));
  if (index === -1) throw new Error("canonical template has no required heading for the test");

  const line = lines[index];
  if (line === undefined) throw new Error("canonical template heading line is unavailable");

  return {
    index,
    heading: line.replace(/^ {0,3}/, "").replace(/[ \t]+$/, ""),
  };
}

function createValidNormalInput() {
  return {
    schema_version: 1,
    run_id: "20260906-000001-JST",
    source_head_sha: null,
    mode: "normal",
    charter_id: "CHARTER-001",
    challenge_id: null,
    benchmark_revision: null,
    runtime_variant_id: null,
    runner_profile: null,
    working_tree_snapshot: {
      before: ".artifacts/agentic-qa/20260906-000001-JST/before.json",
      after: ".artifacts/agentic-qa/20260906-000001-JST/after.json",
      comparison: ".artifacts/agentic-qa/20260906-000001-JST/comparison.json",
    },
    coverage: {
      required_ids: ["COV-001"],
      items: [
        {
          coverage_id: "COV-001",
          status: "not_completed",
          mission_completed: false,
          evidence_refs: [],
          evidence_types: [],
          blocker_reason: null,
          notes: "",
        },
      ],
    },
    findings: [],
  };
}

describe("feature-plan deterministic output evaluation", () => {
  it("passes the canonical template and allowed heading whitespace", () => {
    expect(validatePlanOutput(canonicalTemplate, canonicalTemplate)).toEqual({
      valid: true,
      missingHeadings: [],
    });

    const target = firstRequiredHeading(canonicalTemplate);
    const outputLines = canonicalTemplate.split(/\r?\n/);
    outputLines[target.index] = `   ${target.heading}\t`;

    expect(validatePlanOutput(canonicalTemplate, outputLines.join("\n"))).toEqual({
      valid: true,
      missingHeadings: [],
    });
  });

  it("fails when a canonical required H2 is omitted", () => {
    const target = firstRequiredHeading(canonicalTemplate);
    const outputLines = canonicalTemplate
      .split(/\r?\n/)
      .filter((_, index) => index !== target.index);
    const result = validatePlanOutput(canonicalTemplate, outputLines.join("\n"));

    expect(result.valid).toBe(false);
    expect(result.missingHeadings).toEqual([target.heading]);
  });

  it.each([
    {
      name: "backtick",
      marker: "`",
      infoStringMarker: "~",
      openerLength: 4,
      lineSeparator: "\r\n",
    },
    {
      name: "tilde",
      marker: "~",
      infoStringMarker: "`",
      openerLength: 3,
      lineSeparator: "\n",
    },
  ] as const)(
    "does not count a fenced required H2 for the $name fence and recovers after a valid closer",
    ({ marker, infoStringMarker, openerLength, lineSeparator }) => {
      const target = firstRequiredHeading(canonicalTemplate);
      const outputLines = canonicalTemplate.split(/\r?\n/);
      const invalidCloserLines =
        marker === "`"
          ? [
              `   ${marker.repeat(openerLength)}${infoStringMarker}text`,
              `   ${marker.repeat(openerLength - 1)}`,
              `   ${marker.repeat(openerLength)}not-a-closing-fence`,
              target.heading,
              `   ${marker.repeat(openerLength)}  \t`,
            ]
          : [
              `   ${marker.repeat(openerLength)}${infoStringMarker}text`,
              target.heading,
              `   ${marker.repeat(openerLength)} \t`,
            ];

      outputLines.splice(target.index, 1, ...invalidCloserLines);
      const result = validatePlanOutput(canonicalTemplate, outputLines.join(lineSeparator));

      expect(result).toEqual({
        valid: false,
        missingHeadings: [target.heading],
      });
    },
  );

  it("throws when the canonical template has no required H2", () => {
    expect(() => validatePlanOutput("plain text only", canonicalTemplate)).toThrow(
      "canonical plan template has no required level-2 headings",
    );
  });
});

describe("exploratory-qa deterministic output evaluation", () => {
  it("accepts a valid Normal-mode schema and Coverage relation", () => {
    const input = createValidNormalInput();
    const parsed = qaFindingsSchema.safeParse(input);
    const expectedSource: Pick<Charter, "required_coverage"> = {
      required_coverage: [
        {
          coverage_id: "COV-001",
          mission: "representative mission",
          role: "customer",
          seed: "default",
          platform: "web",
          viewport_or_device: "desktop",
          required_evidence_types: ["screenshot"],
        },
      ],
    };

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw parsed.error;

    expect(() => assertCoverageIntegrity(expectedSource, parsed.data.coverage)).not.toThrow();
  });

  it("rejects a required run_id omission and reports its Zod issue path", () => {
    const withoutRunId = Object.fromEntries(
      Object.entries(createValidNormalInput()).filter(([key]) => key !== "run_id"),
    );
    const parsed = qaFindingsSchema.safeParse(withoutRunId);

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("run_id omission unexpectedly parsed successfully");
    expect(parsed.error.issues.some((issue) => issue.path.includes("run_id"))).toBe(true);
  });

  it("rejects a Coverage SSOT mismatch through the existing validator", () => {
    const input = createValidNormalInput();
    const parsed = qaFindingsSchema.safeParse(input);
    const expectedSource: Pick<Charter, "required_coverage"> = {
      required_coverage: [
        {
          coverage_id: "COV-001",
          mission: "representative mission",
          role: "customer",
          seed: "default",
          platform: "web",
          viewport_or_device: "desktop",
          required_evidence_types: ["screenshot"],
        },
      ],
    };

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw parsed.error;

    const actualCoverage = {
      ...parsed.data.coverage,
      items: parsed.data.coverage.items.map((item, index) =>
        index === 0 ? { ...item, coverage_id: "COV-999" } : item,
      ),
    };

    expect(() => assertCoverageIntegrity(expectedSource, actualCoverage)).toThrow(
      "coverage.items does not match the Coverage SSOT",
    );
  });
});
