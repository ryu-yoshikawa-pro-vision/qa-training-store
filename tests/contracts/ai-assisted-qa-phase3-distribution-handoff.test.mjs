import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const shopFile = "course/shop/index.html";
const manifestFile = ".course/distribution-manifest.json";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trimEnd();
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("M09-01 pinned learner distribution acquisition", () => {
  it("copies a committed distribution and its digest via a private-repo-style checkout", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "m09-distribution-checkout-"));
    const source = path.join(tmp, "private-learner");
    const clone = path.join(tmp, "ci-runner");
    const html = Buffer.from("<!doctype html><title>synthetic learner Shop</title>");
    const sourceSha = "a".repeat(40);
    const manifest = {
      schema_version: 1,
      source_sha: sourceSha,
      files: [{ target_path: shopFile, sha256: hash(html), bytes: html.length }],
    };

    try {
      fs.mkdirSync(path.join(source, "course/shop"), { recursive: true });
      fs.mkdirSync(path.join(source, ".course"), { recursive: true });
      fs.writeFileSync(path.join(source, shopFile), html);
      fs.writeFileSync(path.join(source, manifestFile), JSON.stringify(manifest));
      git(source, "init", "-q", "--initial-branch=main");
      git(source, "add", "--", shopFile, manifestFile);
      expect(git(source, "ls-files", "--", shopFile, manifestFile).split("\n")).toEqual([
        manifestFile,
        shopFile,
      ]);
      git(
        source,
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-qm",
        "record synthetic distribution",
      );
      const approvedBase = git(source, "rev-parse", "HEAD");
      git(tmp, "clone", "-q", source, clone);
      expect(git(clone, "rev-parse", "HEAD")).toBe(approvedBase);
      expect(git(clone, "ls-tree", "-r", "--name-only", "HEAD", "--", shopFile)).toBe(
        shopFile,
      );

      const copiedManifest = JSON.parse(fs.readFileSync(path.join(clone, manifestFile), "utf8"));
      const copiedHtml = fs.readFileSync(path.join(clone, shopFile));
      expect(copiedManifest.source_sha).toBe(sourceSha);
      expect(hash(copiedHtml)).toBe(copiedManifest.files[0].sha256);
      expect(git(clone, "diff", "--name-only", approvedBase, "HEAD", "--", shopFile)).toBe("");
      fs.writeFileSync(path.join(clone, shopFile), "<title>tampered</title>");
      expect(hash(fs.readFileSync(path.join(clone, shopFile)))).not.toBe(
        copiedManifest.files[0].sha256,
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("keeps build at template generation and fails closed in the disabled CI sample", () => {
    const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");
    const buildManifest = JSON.parse(read("training/course-sync/manifest.json"));
    expect(buildManifest.generated.shop_build).toMatchObject({
      command: "pnpm run build:web",
      target: "course/shop/**",
      required: true,
    });
    const prepare = read("scripts/training/prepare-learner-template.mjs");
    expect(prepare).toContain('"--source-sha"');
    const workflow = read(
      "training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled",
    );
    expect(workflow).toContain("actions/checkout@v4");
    expect(workflow).toContain("test -s course/shop/index.html");
    expect(workflow).toContain("test -s .course/distribution-manifest.json");
    expect(workflow).toContain("verify-distribution");
    expect(workflow).toContain('PLAYWRIGHT_USE_PREBUILT_DIST: "true"');
    expect(workflow).not.toContain("pnpm run build:web");
    const config = read("playwright.ai-assisted-qa.config.ts");
    expect(config).toContain("pnpm exec tsx scripts/serve-web-dist.ts");
    expect(config).toContain("process.env.PLAYWRIGHT_USE_PREBUILT_DIST");
  });
});
