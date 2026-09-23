import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const preCommit = readFileSync(path.join(root, ".husky", "pre-commit"), "utf8");

describe("Husky configuration contracts", () => {
  it("initializes Husky from the package prepare script", () => {
    expect(packageJson.scripts?.prepare).toBe("husky");
    expect(packageJson.devDependencies?.husky).toBe("9.1.7");
  });

  it("keeps pre-commit as the ordered lightweight quality gate", () => {
    expect(preCommit).toBe(["pnpm run quality:staged", "pnpm run security:check", ""].join("\n"));
    expect(preCommit).not.toContain("pnpm run verify");
    expect(preCommit).not.toContain("test");
    expect(preCommit).not.toContain("build");
    expect(preCommit).not.toContain("typecheck");
    expect(preCommit).not.toContain("lint-staged");
    expect(preCommit).not.toContain("\r");
  });

  it("does not add lint-staged configuration or dependency", () => {
    expect(packageJson.devDependencies?.["lint-staged"]).toBeUndefined();
  });

  it("keeps security:check as the repository-wide pre-commit gate", () => {
    expect(packageJson.scripts?.["security:check"]).toBe("tsx scripts/security-static-check.ts");
    expect(preCommit).toContain("pnpm run security:check");
    expect(packageJson.scripts?.verify).toContain("pnpm run security:check");
  });
});
