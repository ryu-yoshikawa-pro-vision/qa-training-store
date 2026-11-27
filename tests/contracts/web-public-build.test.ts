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
  fs.mkdirSync(path.join(root, "training/ai-assisted-qa-course/templates"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md"),
    "Before\n<!-- BEGIN PUBLIC WEB THIRD-PARTY NOTICES -->\n# Web notices\nNotice text\n<!-- END PUBLIC WEB THIRD-PARTY NOTICES -->\nAfter\n",
  );
  fs.writeFileSync(
    path.join(root, "training/ai-assisted-qa-course/templates/learner-OFL-1.1.txt"),
    "SIL OPEN FONT LICENSE Version 1.1\nFull license text\n",
  );
  fs.writeFileSync(
    path.join(root, "node_modules/expo-router/package.json"),
    JSON.stringify({ name: "expo-router", version: "57.0.31", license: "MIT" }),
  );
  return root;
}

function imageUri(name: string): string {
  return (
    "/assets/node_modules/.pnpm/expo-router@57.0.31_abcd/node_modules/expo-router/assets/" +
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
  it("copies only the marked third-party notice section for every Web bundle", () => {
    const root = fixture();
    bundle(root, "const value = 1;");
    expect(repairExpoRouterWebAssets(root)).toBe(0);
    expect(fs.readFileSync(path.join(root, "dist/THIRD_PARTY_NOTICES.md"), "utf8")).toBe(
      "# Web notices\nNotice text\n",
    );
    expect(fs.readFileSync(path.join(root, "dist/OFL-1.1.txt"), "utf8")).toBe(
      "SIL OPEN FONT LICENSE Version 1.1\nFull license text\n",
    );
  });

  it("does not publish bundle notices when the Web JavaScript directory is empty", () => {
    const root = fixture();
    expect(repairExpoRouterWebAssets(root)).toBe(0);
    expect(fs.existsSync(path.join(root, "dist/THIRD_PARTY_NOTICES.md"))).toBe(false);
    expect(fs.existsSync(path.join(root, "dist/OFL-1.1.txt"))).toBe(false);
  });

  it("rejects a dangling notice symlink without writing through it", () => {
    const root = fixture();
    bundle(root, "const value = 1;");
    const destination = path.join(root, "dist/THIRD_PARTY_NOTICES.md");
    const outside = path.join(root, "outside-notices.md");
    fs.symlinkSync(outside, destination, "file");
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/Invalid Web notice destination/);
    expect(fs.existsSync(outside)).toBe(false);
    expect(fs.lstatSync(destination).isSymbolicLink()).toBe(true);
  });

  it("rejects a symlinked Web output directory before writing through it", () => {
    const root = fixture();
    const dist = path.join(root, "dist");
    const originalDist = path.join(root, "original-dist");
    const outsideDist = path.join(root, "outside-dist");
    fs.renameSync(dist, originalDist);
    fs.mkdirSync(path.join(outsideDist, "_expo/static/js/web"), { recursive: true });
    fs.symlinkSync(outsideDist, dist, process.platform === "win32" ? "junction" : "dir");
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/Invalid Web output directory/);
    expect(fs.existsSync(path.join(outsideDist, "THIRD_PARTY_NOTICES.md"))).toBe(false);
  });

  it("rejects ambiguous third-party notice markers", () => {
    const root = fixture();
    bundle(root, "const value = 1;");
    const source = path.join(
      root,
      "training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md",
    );
    fs.appendFileSync(source, "\n<!-- BEGIN PUBLIC WEB THIRD-PARTY NOTICES -->\n");
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/exactly one start and end marker/);
  });

  it("rewrites all 12 known Expo Router image URIs and includes their MIT license", () => {
    const root = fixture();
    for (const image of expoAssets) {
      const source = path.join(root, "node_modules/expo-router/assets", image + ".png");
      fs.mkdirSync(path.dirname(source), { recursive: true });
      fs.writeFileSync(source, png);
      const exported = path.join(root, "dist", imageUri(image).slice(1));
      fs.mkdirSync(path.dirname(exported), { recursive: true });
      fs.writeFileSync(exported, png);
    }
    const density = imageUri("react-navigation/elements/clear-icon").replace(".png", "@2x.png");
    fs.writeFileSync(path.join(root, "dist", density.slice(1)), png);
    bundle(root, expoAssets.map((name) => 'uri:"' + imageUri(name) + '"').join(";"));
    expect(repairExpoRouterWebAssets(root)).toBe(12);
    const hash = createHash("sha256").update(png).digest("hex").slice(0, 16);
    const rewritten = fs.readFileSync(path.join(root, "dist/_expo/static/js/web/entry.js"), "utf8");
    for (const image of expoAssets) {
      const published = "assets/expo-router/" + image + "." + hash + ".png";
      expect(rewritten).toContain('uri:"/' + published + '"');
      expect(fs.readFileSync(path.join(root, "dist", published))).toEqual(png);
    }
    expect(rewritten).not.toContain("/assets/node_modules/");
    expect(fs.existsSync(path.join(root, "dist/assets/node_modules"))).toBe(false);
    const notice = fs.readFileSync(path.join(root, "dist/assets/expo-router/LICENSE"), "utf8");
    expect(notice).toBe(
      [
        "Expo Router 57.0.31 source: https://github.com/expo/expo/tree/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/packages/expo-router",
        "React Navigation Elements 2.9.10 source: https://github.com/react-navigation/react-navigation/tree/69573410534dc9a467ace6e749e82d32058b3092/packages/elements",
        "MIT License",
        "",
        "Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)",
        "Copyright (c) 2017 React Navigation Contributors",
        "",
        "Permission is hereby granted, free of charge, to any person obtaining a copy",
        'of this software and associated documentation files (the "Software"), to deal',
        "in the Software without restriction, including without limitation the rights",
        "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
        "copies of the Software, and to permit persons to whom the Software is",
        "furnished to do so, subject to the following conditions:",
        "",
        "The above copyright notice and this permission notice shall be included in all",
        "copies or substantial portions of the Software.",
        "",
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
        "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
        "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
        "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
        "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
        "SOFTWARE.",
        "",
      ].join("\n"),
    );
    expect(repairExpoRouterWebAssets(root)).toBe(0);
  });

  it("refuses unrelated internal exports instead of deleting them", () => {
    const root = fixture();
    const source = path.join(root, "node_modules/expo-router/assets/error.png");
    fs.writeFileSync(source, png);
    const unexpected = path.join(
      root,
      "dist/assets/node_modules/.pnpm/unknown@1/node_modules/unknown/assets/other.png",
    );
    fs.mkdirSync(path.dirname(unexpected), { recursive: true });
    fs.writeFileSync(unexpected, png);
    bundle(root, 'uri:"' + imageUri("error") + '"');
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/Unexpected internal Web asset/);
    expect(fs.readFileSync(unexpected)).toEqual(png);
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
      JSON.stringify({ name: "expo-router", version: "57.0.31", license: "unknown" }),
    );
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/pinned version and MIT license/);
    fs.writeFileSync(
      path.join(root, "node_modules/expo-router/package.json"),
      JSON.stringify({ name: "expo-router", version: "57.0.30", license: "MIT" }),
    );
    expect(() => repairExpoRouterWebAssets(root)).toThrow(/pinned version/);
    fs.writeFileSync(
      path.join(root, "node_modules/expo-router/package.json"),
      JSON.stringify({ name: "expo-router", version: "57.0.31", license: "MIT" }),
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
      expect(isPublicLegacyCurriculumPage("docs/curriculum/test-automation/" + name + ".md")).toBe(
        false,
      );
    }
    expect(isPublicLegacyCurriculumPage("docs/curriculum/test-automation/README.md")).toBe(true);
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
      expect(html).not.toMatch(
        /<a[^>]+href="[^"]*(?:00_learning-design|01_spreadsheet-test-design|02_competency-rubric|03_instructor-reference|04_learning-effort-reference)/,
      );
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
