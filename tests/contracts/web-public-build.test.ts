import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  isPublicLegacyCurriculumPage,
  withoutNonPublicLegacyLinks,
} from "../../scripts/docs/build-docs";
import { repairExpoRouterWebAssets } from "../../scripts/docs/repair-expo-router-web-assets";
import { parseMarkdownFile, renderMarkdown } from "../../scripts/spec/markdown";

const roots: string[] = [];
const png = Buffer.from("89504e470d0a1a0a0102030405", "hex");
const metroHash = "0123456789abcdef0123456789abcdef";
const expoAssets = [
  "react-navigation/elements/back-icon-mask",
  "react-navigation/elements/back-icon",
  "react-navigation/elements/clear-icon",
  "react-navigation/elements/close-icon",
  "react-navigation/elements/search-icon",
  "error",
  "file",
  "pkg",
  "forward",
  "sitemap",
  "arrow_down",
  "unmatched",
];

function fixture(): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "course-public-assets-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "node_modules/expo-router/assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "dist/_expo/static/js/web"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "node_modules/expo-router/package.json"),
    JSON.stringify({ name: "expo-router", license: "MIT" }),
  );
  return root;
}

function imageUri(name: string): string {
  return (
    "/assets/node_modules/.pnpm/expo-router@57.0.29_abcd/node_modules/expo-router/assets/" +
    name +
    "." +
    metroHash +
    ".png"
  );
}

function bundle(root: string, content: string): void {
  fs.writeFileSync(path.join(root, "dist/_expo/static/js/web/entry.js"), content);
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("public Web export dependencies", () => {
  it("rewrites all 12 known Expo Router image URIs and includes their MIT license", () => {
    const root = fixture();
    for (const image of expoAssets) {
      const source = path.join(root, "node_modules/expo-router/assets", image + ".png");
      fs.mkdirSync(path.dirname(source), { recursive: true });
      fs.writeFileSync(source, png);
    }
    bundle(root, expoAssets.map((name) => 'uri:"' + imageUri(name) + '"').join(";"));
    expect(repairExpoRouterWebAssets(root)).toBe(12);
    const hash = createHash("sha256").update(png).digest("hex").slice(0, 16);
    const rewritten = fs.readFileSync(
      path.join(root, "dist/_expo/static/js/web/entry.js"),
      "utf8",
    );
    for (const image of expoAssets) {
      const published = "assets/expo-router/" + image + "." + hash + ".png";
      expect(rewritten).toContain('uri:"/' + published + '"');
      expect(fs.readFileSync(path.join(root, "dist", published))).toEqual(png);
    }
    expect(rewritten).not.toContain("/assets/node_modules/");
    expect(
      fs.readFileSync(path.join(root, "dist/assets/expo-router/LICENSE"), "utf8"),
    ).toContain("React Navigation Contributors");
    expect(repairExpoRouterWebAssets(root)).toBe(0);
  });

  it("rejects missing, empty, unlicensed and unexpected internal images", () => {
    const root = fixture();
    bundle(root, 'uri:"' + imageUri("error") + '"');
    expect(() => repairExpoRouterWebAssets(root)).toThrow();
    fs.writeFileSync(path.join(root, "node_modules/expo-router/assets/error.png"), "");
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/Empty or invalid/);
    fs.writeFileSync(path.join(root, "node_modules/expo-router/assets/error.png"), png);
    fs.writeFileSync(
      path.join(root, "node_modules/expo-router/package.json"),
      JSON.stringify({ name: "expo-router", license: "unknown" }),
    );
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/license/);
    fs.writeFileSync(
      path.join(root, "node_modules/expo-router/package.json"),
      JSON.stringify({ name: "expo-router", license: "MIT" }),
    );
    bundle(root, 'uri:"/assets/node_modules/.pnpm/unknown@1.0/node_modules/unknown/file.png"');
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/Unresolved internal/);
  });

  it("keeps existing old lesson URLs while excluding five withdrawn reference pages", () => {
    for (const name of [
      "00_learning-design",
      "01_spreadsheet-test-design",
      "02_competency-rubric",
      "03_instructor-reference",
      "04_learning-effort-reference",
    ]) {
      expect(
        isPublicLegacyCurriculumPage("docs/curriculum/test-automation/" + name + ".md"),
      ).toBe(false);
    }
    expect(
      isPublicLegacyCurriculumPage("docs/curriculum/test-automation/README.md"),
    ).toBe(true);
    expect(
      isPublicLegacyCurriculumPage(
        "docs/curriculum/test-automation/part1/01_test-automation-foundations.md",
      ),
    ).toBe(true);

    const root = process.cwd();
    for (const relative of [
      "README.md",
      "part1/07_maestro-native-automation.md",
      "part1/09_part1-capstone.md",
      "part2/08_integration-design-capstone.md",
    ]) {
      const source = "docs/curriculum/test-automation/" + relative;
      const parsed = parseMarkdownFile(path.join(root, source), source);
      const published = withoutNonPublicLegacyLinks(root, parsed);
      const html = renderMarkdown(published);
      expect(html).not.toMatch(/<a[^>]+href="[^"]*(?:00_learning-design|01_spreadsheet-test-design|02_competency-rubric|03_instructor-reference|04_learning-effort-reference)/);
    }
  });

  it("does not rewrite example links inside fenced source code", () => {
    const root = fixture();
    const folder = path.join(root, "docs/curriculum/test-automation");
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "02_competency-rubric.md"), "# Rubric\n");
    const fence = String.fromCharCode(96).repeat(3);
    fs.writeFileSync(
      path.join(folder, "README.md"),
      "# Index\n[Rubric](./02_competency-rubric.md)\n" +
        fence +
        "md\n[Rubric](./02_competency-rubric.md)\n" +
        fence +
        "\n",
    );
    const parsed = parseMarkdownFile(
      path.join(folder, "README.md"),
      "docs/curriculum/test-automation/README.md",
    );
    const result = withoutNonPublicLegacyLinks(root, parsed);
    expect(result.lines[1]).toContain("公開対象外");
    expect(result.lines[1]).not.toContain("](");
    expect(result.lines[3]).toContain("](");
  });
});

/* FORMAT-DIAGNOSTIC-START */
describe("temporary formatter diagnostic", () => {
  it("reports Prettier formatted source to the contract runner", async () => {
    const source = fs.readFileSync(path.join(process.cwd(), "tests/contracts/web-public-build.test.ts"), "utf8");
    const stripped = source.slice(0, source.indexOf("/* FORMAT-DIAGNOSTIC-START */")).trimEnd() + "\n";
    const prettier = await import("prettier");
    const formatted = await prettier.format(stripped, { parser: "typescript" });
    console.log("FORMAT_SOURCE_BASE64=" + Buffer.from(formatted).toString("base64"));
  });
});
/* FORMAT-DIAGNOSTIC-END */
