import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateSkills } from "../../scripts/validate-skills";

const temporaryRoots: string[] = [];

function createFixture(
  skillDefinitions: {
    directory: string;
    name?: string;
    description?: string;
    body?: string;
    includeSkillFile?: boolean;
  }[] = [{ directory: "alpha" }],
): string {
  const root = mkdtempSync(join(tmpdir(), "validate-skills-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, ".agents", "skills"), { recursive: true });
  writeFileSync(
    join(root, "AGENTS.md"),
    "# Repository\n\n[Alpha](.agents/skills/alpha/SKILL.md)\n",
    "utf8",
  );

  for (const definition of skillDefinitions) {
    const directory = join(root, ".agents", "skills", definition.directory);
    mkdirSync(join(directory, "references"), { recursive: true });
    if (definition.includeSkillFile !== false) {
      const name = definition.name ?? definition.directory;
      const description = definition.description ?? "A fixture Skill.";
      const body =
        definition.body ??
        "[Workflow](references/workflow.md#normal) [Data](references/data.json?raw=1)\n";
      writeFileSync(
        join(directory, "SKILL.md"),
        `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`,
        "utf8",
      );
    }
    writeFileSync(join(directory, "references", "workflow.md"), "# Workflow\n", "utf8");
    writeFileSync(join(directory, "references", "data.json"), "{}\n", "utf8");
  }
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Skill package validator", () => {
  it("passes a valid package and validates fragment/query file parts", () => {
    const root = createFixture();

    expect(validateSkills(root)).toMatchObject({ skillCount: 1, linkCount: 3 });
  });

  it("fails when SKILL.md is missing", () => {
    const root = createFixture([{ directory: "alpha", includeSkillFile: false }]);
    writeFileSync(join(root, "AGENTS.md"), "# Repository\n", "utf8");

    expect(() => validateSkills(root)).toThrow("SKILL.md is missing");
  });

  it("fails invalid and missing frontmatter", () => {
    const invalidRoot = createFixture([{ directory: "alpha", body: "No frontmatter\n" }]);
    writeFileSync(
      join(invalidRoot, ".agents", "skills", "alpha", "SKILL.md"),
      "---\nname: [invalid\n---\n",
      "utf8",
    );
    expect(() => validateSkills(invalidRoot)).toThrow("frontmatter");

    const missingRoot = createFixture([{ directory: "alpha", body: "No frontmatter\n" }]);
    writeFileSync(
      join(missingRoot, ".agents", "skills", "alpha", "SKILL.md"),
      "# Missing\n",
      "utf8",
    );
    expect(() => validateSkills(missingRoot)).toThrow("frontmatter");
  });

  it("fails duplicate names and directory/name mismatch", () => {
    const duplicateRoot = createFixture([
      { directory: "alpha" },
      { directory: "beta", name: "alpha" },
    ]);
    expect(() => validateSkills(duplicateRoot)).toThrow("duplicated");

    const mismatchRoot = createFixture([{ directory: "alpha", name: "beta" }]);
    expect(() => validateSkills(mismatchRoot)).toThrow("does not match");
  });

  it("fails missing targets with or without fragment/query", () => {
    const missingRoot = createFixture([
      {
        directory: "alpha",
        body: "[Missing](references/missing.md)\n",
      },
    ]);
    expect(() => validateSkills(missingRoot)).toThrow("target is missing");

    const missingWithSuffixRoot = createFixture([
      {
        directory: "alpha",
        body: "[Missing](references/missing.md#anchor?raw=1)\n",
      },
    ]);
    expect(() => validateSkills(missingWithSuffixRoot)).toThrow("target is missing");
  });

  it("fails package escapes with or without fragment/query", () => {
    const escapeRoot = createFixture([
      {
        directory: "alpha",
        body: "[Outside](../../outside.md)\n",
      },
    ]);
    expect(() => validateSkills(escapeRoot)).toThrow("escapes the Skill package");

    const escapeWithSuffixRoot = createFixture([
      {
        directory: "alpha",
        body: "[Outside](../../outside.md#anchor?raw=1)\n",
      },
    ]);
    expect(() => validateSkills(escapeWithSuffixRoot)).toThrow("escapes the Skill package");
  });

  it("ignores external, anchor-only, reference-style, and image syntax", () => {
    const root = createFixture([
      {
        directory: "alpha",
        body: [
          "[External](https://example.com/missing.md)",
          "[Anchor](#section)",
          "[Reference][workflow]",
          "![Image](references/missing.png)",
          "[Workflow](references/workflow.md)",
        ].join(" "),
      },
    ]);

    expect(() => validateSkills(root)).not.toThrow();
  });
});
