import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  checkState,
  loadCourseManifest,
  loadModule,
  syncCourse,
  validateCourseManifest,
} from "../../scripts/training/ai-assisted-qa-course-core.mjs";

const repositoryRoot = process.cwd();
const fixtureRoot = fs.mkdtempSync(path.join(tmpdir(), "ai-qa-course-contract-"));

function writeFixtureFile(root, relativePath, content) {
  const destination = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  return destination;
}

function blobSha(bytes) {
  return createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
    .digest("hex");
}

function courseFixture() {
  const fixtureDirectory = fs.mkdtempSync(path.join(fixtureRoot, "case-"));
  const source = path.join(fixtureDirectory, "source");
  const target = path.join(fixtureDirectory, "learner");
  fs.mkdirSync(source, { recursive: true });
  fs.mkdirSync(target, { recursive: true });
  writeFixtureFile(source, "dist/index.html", "<!doctype html><title>fixture</title>");
  const localFiles = [];
  const loadFiles = [];
  const distributionBytes = new Map();
  for (let index = 0; index <= 10; index += 1) {
    const moduleId = `M${String(index).padStart(2, "0")}`;
    const moduleReadmePath = `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`;
    const quizPath = `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`;
    const inputSource = `training/ai-assisted-qa-course/inputs/${moduleId}/start.md`;
    const exerciseSource = `training/ai-assisted-qa-course/exercises/${moduleId}/exercise.md`;
    const templateSource = `training/ai-assisted-qa-course/exercises/${moduleId}/submission-template.md`;
    const startSource = `training/ai-assisted-qa-course/states/${moduleId}/start.json`;
    const endSource = `training/ai-assisted-qa-course/states/${moduleId}/end.json`;
    const rows = [
      [moduleReadmePath, `course/modules/${moduleId}/README.md`, `# ${moduleId}\n`],
      [
        quizPath,
        `course/quizzes/${moduleId}.json`,
        JSON.stringify({ schema_version: 1, module_id: moduleId, questions: [] }),
      ],
      [inputSource, `course/inputs/${moduleId}/start.md`, `${moduleId} public input\n`],
      [exerciseSource, `course/exercises/${moduleId}/exercise.md`, `${moduleId} exercise\n`],
      [
        templateSource,
        `course/exercises/${moduleId}/submission-template.md`,
        `${moduleId} submission template\n`,
      ],
      [
        startSource,
        `course/states/${moduleId}/start.json`,
        JSON.stringify({
          schema_version: 1,
          module_id: moduleId,
          state: "start",
          revision: "ai-assisted-qa-course-v1",
          source_sha: null,
          public_contract: true,
          read_only: true,
          inputs: [
            {
              artifact_id: `${moduleId}-fallback`,
              from_module: index ? `M${String(index - 1).padStart(2, "0")}` : null,
              optional: index > 0,
              public_fallback: `inputs/${moduleId}/start.md`,
            },
          ],
          expected: { required_paths: [`inputs/${moduleId}/start.md`] },
          checks: [{ id: `${moduleId}-START`, mode: "read-only", condition: "check inputs" }],
          references: [
            `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`,
            `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`,
          ],
          confidentiality: {
            public: true,
            contains_model_answers: false,
            contains_private_assessment_tests: false,
          },
        }),
      ],
      [
        endSource,
        `course/states/${moduleId}/end.json`,
        JSON.stringify({
          schema_version: 1,
          module_id: moduleId,
          state: "end",
          revision: "ai-assisted-qa-course-v1",
          source_sha: null,
          public_contract: true,
          read_only: true,
          inputs: [
            { artifact_id: `${moduleId}-submission`, path: `workspace/${moduleId}/submission.md` },
          ],
          expected: { required_paths: [`workspace/${moduleId}/submission.md`] },
          checks: [{ id: `${moduleId}-END`, mode: "read-only", condition: "check submission" }],
          references: [
            `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`,
            `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`,
          ],
          confidentiality: {
            public: true,
            contains_model_answers: false,
            contains_private_assessment_tests: false,
          },
        }),
      ],
    ];
    if (moduleId === "M05") {
      rows.push([
        "workspace/M05/product-link.spec.ts",
        "course/exercises/M05/product-link.spec.ts",
        "// M05 public exercise code\n",
      ]);
    }
    for (const [sourcePath, targetPath, content] of rows) {
      writeFixtureFile(source, sourcePath, content);
      localFiles.push({
        source_path: sourcePath,
        target_path: targetPath,
        module_id: moduleId,
        role: "fixture",
      });
      distributionBytes.set(targetPath, Buffer.from(content));
    }
    for (const targetPath of [
      `course/modules/${moduleId}/README.md`,
      `course/quizzes/${moduleId}.json`,
      `course/inputs/${moduleId}/start.md`,
      `course/exercises/${moduleId}/exercise.md`,
      `course/states/${moduleId}/start.json`,
      `course/states/${moduleId}/end.json`,
    ])
      loadFiles.push({
        module_id: moduleId,
        source_path: targetPath,
        target_path: targetPath,
        kind: "course-material",
      });
    loadFiles.push({
      module_id: moduleId,
      source_path: `course/exercises/${moduleId}/submission-template.md`,
      target_path: `workspace/${moduleId}/submission.md`,
      kind: "submission-template",
    });
    if (moduleId === "M05") {
      loadFiles.push({
        module_id: moduleId,
        source_path: "course/exercises/M05/product-link.spec.ts",
        target_path: "workspace/M05/product-link.spec.ts",
        kind: "exercise-code",
      });
    }
  }
  const skillNames = [
    "qa-workflow",
    "spec-analysis",
    "test-analysis",
    "test-condition-design",
    "test-case-design",
    "adversarial-review",
    "e2e-test-implementation",
    "e2e-test-execution",
    "e2e-test-inspection",
    "e2e-test-result-analysis",
    "e2e-test-reporting",
  ];
  const externalSkillFiles = skillNames.map((skill, index) => {
    const sourcePath = `skills/${skill}/SKILL.md`;
    const bytes = Buffer.from(`fixture skill ${skill}\n`);
    return {
      source_path: sourcePath,
      target_path: `.agents/skills/${skill}/SKILL.md`,
      blob_sha: blobSha(bytes),
      size: bytes.length,
      skill,
      module_ids: [`M${String(index).padStart(2, "0")}`],
    };
  });
  const manifest = {
    schema_version: 1,
    source_sha: "${SOURCE_SHA}",
    state_contract_revision: "ai-assisted-qa-course-v1",
    external_skill_source: {
      repository: "ryu-yoshikawa-pro-vision/qa-workflow-skills",
      commit: "7cc6cba7772de549841a39d71694cbafbc783324",
      excluded: ["**/evals/**"],
    },
    local_files: localFiles,
    external_skill_files: externalSkillFiles,
    load_files: loadFiles,
    generated: {
      shop_build: {
        command: "fixture",
        source: "dist/**",
        target: "course/shop/**",
        required: true,
      },
    },
    forbidden_paths: [
      ".git/**",
      ".codex/**",
      "output/**",
      "node_modules/**",
      "**/evals/**",
      "**/.env*",
      "**/*secret*",
      "**/*answer-key*",
      "**/*model-answer*",
      ".github/workflows/**",
    ],
  };
  writeFixtureFile(source, "training/course-sync/manifest.json", JSON.stringify(manifest));
  const skillsByUrl = new Map(
    externalSkillFiles.map((entry) => [
      `https://raw.githubusercontent.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/7cc6cba7772de549841a39d71694cbafbc783324/${entry.source_path}`,
      Buffer.from(`fixture skill ${entry.skill}\n`),
    ]),
  );
  const fetchImpl = async (url) => {
    const bytes = skillsByUrl.get(url);
    return { ok: Boolean(bytes), status: bytes ? 200 : 404, arrayBuffer: async () => bytes };
  };
  return { source, target, manifest, fetchImpl, distributionBytes };
}

afterAll(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

describe("AI-assisted QA distribution contract", () => {
  it("keeps the Plan-pinned external Skill allowlist complete and excludes evals", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const result = validateCourseManifest(manifest);
    expect(result).toMatchObject({ modules: 11, externalSkillFiles: 94 });
    expect(manifest.local_files.some((entry) => entry.target_path.startsWith("workspace/"))).toBe(
      false,
    );
    expect(
      manifest.external_skill_files.every((entry) => !entry.source_path.includes("/evals/")),
    ).toBe(true);
    expect(() =>
      validateCourseManifest({
        ...manifest,
        local_files: [
          ...manifest.local_files,
          { source_path: "evals/private.json", target_path: "course/evals.json", module_id: null },
        ],
      }),
    ).toThrow(/prohibited/);
  });

  it("distributes the M05 reading exercise and incomplete Phase 2 specs without publishing answers", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const m05Path = "workspace/M05/product-link.spec.ts";
    const m06Path = "workspace/M06/cart-cases.spec.ts";
    const m07BeforePath = "workspace/M07/failure-assertion.spec.ts";
    const m07AfterPath = "workspace/M07/repaired-assertion.spec.ts";
    const m05 = fs.readFileSync(path.join(repositoryRoot, m05Path), "utf8");
    const m06 = fs.readFileSync(path.join(repositoryRoot, m06Path), "utf8");
    const m07Before = fs.readFileSync(path.join(repositoryRoot, m07BeforePath), "utf8");
    const m07After = fs.readFileSync(path.join(repositoryRoot, m07AfterPath), "utf8");
    const m05Start = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/states/M05/start.json"),
        "utf8",
      ),
    );
    const m05End = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/states/M05/end.json"),
        "utf8",
      ),
    );

    expect(manifest.local_files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_path: m05Path,
          module_id: "M05",
          role: "incomplete-spec",
        }),
        expect.objectContaining({
          source_path: m06Path,
          module_id: "M06",
          role: "incomplete-spec",
        }),
        expect.objectContaining({
          source_path: m07AfterPath,
          module_id: "M07",
          role: "incomplete-spec",
        }),
      ]),
    );
    expect(manifest.load_files).toContainEqual({
      module_id: "M05",
      source_path: "course/exercises/M05/product-link.spec.ts",
      target_path: m05Path,
      kind: "exercise-code",
    });
    expect(m05).toContain('name: "セラミックマク", exact: true');
    expect(m05).toContain('await expect(mugLink).toHaveAttribute("href", "/products/product-mug")');
    expect(m05Start.expected.required_paths).toContain(m05Path);
    expect(m05End.expected.required_paths).toContain(m05Path);
    expect(m06.match(/throw new Error\("TODO:/g)).toHaveLength(3);
    expect(m06).not.toMatch(/toHaveValue\(|toBeVisible\(/);
    expect(m07Before).toContain("M07_INTENTIONAL_ASSERTION_FAILURE");
    expect(m07After).toContain('throw new Error("TODO:');
    expect(m07After).not.toContain("セラミックマグ");
  });

  it("keeps Phase 3 disabled and records the exact PR-head SHA with its artifacts", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const workflowSource =
      "training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled";
    const workflow = fs.readFileSync(path.join(repositoryRoot, workflowSource), "utf8");
    const entry = manifest.local_files.find((item) => item.source_path === workflowSource);

    expect(entry).toMatchObject({
      target_path: "course/templates/phase3/course-e2e.workflow.yml.disabled",
      module_id: "M09",
      role: "disabled-workflow",
    });
    expect(manifest.forbidden_paths).toContain(".github/workflows/**");
    expect(
      manifest.local_files.some(
        (item) =>
          item.source_path.startsWith(".github/workflows/") ||
          item.target_path.startsWith(".github/workflows/"),
      ),
    ).toBe(false);
    expect(
      fs
        .readdirSync(path.dirname(path.join(repositoryRoot, workflowSource)))
        .filter((name) => /\.ya?ml$/i.test(name)),
    ).toEqual([]);
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"');
    expect(workflow).toContain("EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}");
    const browserInstallIndex = workflow.indexOf(
      "pnpm exec playwright install --with-deps chromium",
    );
    expect(browserInstallIndex).toBeGreaterThan(workflow.indexOf("pnpm install --frozen-lockfile"));
    expect(browserInstallIndex).toBeLessThan(
      workflow.indexOf("pnpm run training:ai-assisted-qa:test"),
    );
    expect(workflow).toContain(
      "git rev-parse HEAD > output/training/ai-assisted-qa/target-sha.txt",
    );
    expect(workflow).toContain("pnpm run training:ai-assisted-qa:test");
    expect(workflow).toContain("uses: actions/upload-artifact@v4");
    expect(workflow).toContain("path: output/training/ai-assisted-qa/");
    expect(workflow).toContain("if: always()");
    expect(workflow).not.toMatch(/contents:\s+write|secrets\.|deploy:/i);
  });

  it("binds the fixed SHA, loads one module, preserves learner edits, and checks states read-only", async () => {
    const fixture = courseFixture();
    const sourceSha = "a".repeat(40);
    const firstSync = await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const repeatedSync = await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    expect(firstSync.copied.length).toBeGreaterThan(0);
    expect(repeatedSync.copied).toEqual([]);
    expect(repeatedSync.unchanged).toBe(repeatedSync.fileCount);

    const start = checkState({ root: fixture.target, moduleId: "M00", stateName: "start" });
    expect(start).toMatchObject({
      status: "ready",
      sourceSha,
      input: { source: "module-public-sample" },
    });
    const firstLoad = loadModule({
      root: fixture.target,
      moduleId: "M00",
      now: new Date("2026-10-22T01:00:00.000Z"),
    });
    expect(firstLoad.moduleId).toBe("M00");
    expect(fs.existsSync(path.join(fixture.target, "workspace/M01/submission.md"))).toBe(false);
    expect(checkState({ root: fixture.target, moduleId: "M00", stateName: "end" }).status).toBe(
      "insufficient",
    );

    const submission = path.join(fixture.target, "workspace/M00/submission.md");
    fs.appendFileSync(submission, "Learner evidence\n");
    expect(checkState({ root: fixture.target, moduleId: "M00", stateName: "end" })).toMatchObject({
      status: "ready",
      assessment: "構造照合のみ。Level 2は人が別途評価します",
    });
    expect(() =>
      loadModule({
        root: fixture.target,
        moduleId: "M00",
        now: new Date("2026-10-22T01:01:00.000Z"),
      }),
    ).toThrow(/existing learner files differ/);
    expect(fs.readFileSync(submission, "utf8")).toContain("Learner evidence");

    const secondLoad = loadModule({
      root: fixture.target,
      moduleId: "M01",
      now: new Date("2026-10-22T01:02:00.000Z"),
    });
    expect(secondLoad.moduleId).toBe("M01");
    expect(fs.existsSync(path.join(fixture.target, "workspace/M02/submission.md"))).toBe(false);

    const m05Load = loadModule({
      root: fixture.target,
      moduleId: "M05",
      now: new Date("2026-10-22T01:03:00.000Z"),
    });
    const m05Spec = path.join(fixture.target, "workspace/M05/product-link.spec.ts");
    expect(m05Load.moduleId).toBe("M05");
    expect(fs.readFileSync(m05Spec, "utf8")).toContain("M05 public exercise code");
    fs.appendFileSync(m05Spec, "Learner edit\n");
    expect(() =>
      loadModule({
        root: fixture.target,
        moduleId: "M05",
        now: new Date("2026-10-22T01:04:00.000Z"),
      }),
    ).toThrow(/existing learner files differ/);
    expect(fs.readFileSync(m05Spec, "utf8")).toContain("Learner edit");
    expect(fs.existsSync(path.join(fixture.target, "workspace/M06/submission.md"))).toBe(false);
  });

  it("checks all 22 module states without modifying state or learner files", async () => {
    const fixture = courseFixture();
    const sourceSha = "f".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const stateSnapshots = [];

    for (let index = 0; index <= 10; index += 1) {
      const moduleId = `M${String(index).padStart(2, "0")}`;
      for (const stateName of ["start", "end"]) {
        const statePath = path.join(fixture.target, `course/states/${moduleId}/${stateName}.json`);
        const before = fs.readFileSync(statePath);
        const result = checkState({ root: fixture.target, moduleId, stateName });
        const after = fs.readFileSync(statePath);
        stateSnapshots.push({ statePath, before, after });

        expect(result.moduleId).toBe(moduleId);
        if (stateName === "start") expect(result).toMatchObject({ status: "ready", sourceSha });
        else expect(result).toMatchObject({ status: "insufficient", sourceSha });
      }
    }

    expect(stateSnapshots).toHaveLength(22);
    expect(stateSnapshots.every(({ before, after }) => before.equals(after))).toBe(true);
    expect(fs.existsSync(path.join(fixture.target, "workspace/M00/submission.md"))).toBe(false);
  });

  it("resumes a partial sync idempotently after a new-file write failure", async () => {
    const fixture = courseFixture();
    const sourceSha = "1".repeat(40);
    const failingDestination = path.join(fixture.target, "course/modules/M01/README.md");
    const originalCopy = fs.copyFileSync.bind(fs);
    let injected = false;
    const copySpy = vi
      .spyOn(fs, "copyFileSync")
      .mockImplementation((source, destination, ...args) => {
        if (!injected && destination === failingDestination) {
          injected = true;
          throw new Error("simulated write failure");
        }
        return originalCopy(source, destination, ...args);
      });

    try {
      await expect(
        syncCourse({
          root: fixture.source,
          target: fixture.target,
          sourceSha,
          fetchImpl: fixture.fetchImpl,
          buildShop: false,
          shopBuildRoot: fixture.source,
          allowUncommittedFixture: true,
        }),
      ).rejects.toThrow(/sync stopped after .*cause=simulated write failure/);
    } finally {
      copySpy.mockRestore();
    }

    expect(fs.existsSync(path.join(fixture.target, "course/modules/M00/README.md"))).toBe(true);
    expect(fs.existsSync(failingDestination)).toBe(false);
    const retry = await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    expect(retry.copied).toContain("course/modules/M01/README.md");
    expect(retry.unchanged).toBeGreaterThan(0);
    expect(fs.readFileSync(failingDestination, "utf8")).toContain("# M01");
  });

  it("rejects missing inputs, revision drift, and bad references without changing learner files", async () => {
    const missingInput = courseFixture();
    await syncCourse({
      root: missingInput.source,
      target: missingInput.target,
      sourceSha: "b".repeat(40),
      fetchImpl: missingInput.fetchImpl,
      buildShop: false,
      shopBuildRoot: missingInput.source,
      allowUncommittedFixture: true,
    });
    fs.rmSync(path.join(missingInput.target, "course/inputs/M00/start.md"));
    expect(
      checkState({ root: missingInput.target, moduleId: "M00", stateName: "start" }).status,
    ).toBe("insufficient");

    const oldRevision = courseFixture();
    const revisionPath = path.join(
      oldRevision.source,
      "training/ai-assisted-qa-course/states/M00/start.json",
    );
    const oldState = JSON.parse(fs.readFileSync(revisionPath, "utf8"));
    oldState.revision = "ai-assisted-qa-course-v0";
    writeFixtureFile(
      oldRevision.source,
      "training/ai-assisted-qa-course/states/M00/start.json",
      JSON.stringify(oldState),
    );
    await syncCourse({
      root: oldRevision.source,
      target: oldRevision.target,
      sourceSha: "c".repeat(40),
      fetchImpl: oldRevision.fetchImpl,
      buildShop: false,
      shopBuildRoot: oldRevision.source,
      allowUncommittedFixture: true,
    });
    expect(
      checkState({ root: oldRevision.target, moduleId: "M00", stateName: "start" }),
    ).toMatchObject({
      status: "mismatch",
      reasons: [expect.stringContaining("revision")],
    });

    const badReference = courseFixture();
    const referencePath = path.join(
      badReference.source,
      "training/ai-assisted-qa-course/states/M00/start.json",
    );
    const referenceState = JSON.parse(fs.readFileSync(referencePath, "utf8"));
    referenceState.references.push("../../outside.md");
    writeFixtureFile(
      badReference.source,
      "training/ai-assisted-qa-course/states/M00/start.json",
      JSON.stringify(referenceState),
    );
    await syncCourse({
      root: badReference.source,
      target: badReference.target,
      sourceSha: "d".repeat(40),
      fetchImpl: badReference.fetchImpl,
      buildShop: false,
      shopBuildRoot: badReference.source,
      allowUncommittedFixture: true,
    });
    expect(
      checkState({ root: badReference.target, moduleId: "M00", stateName: "start" }),
    ).toMatchObject({
      status: "mismatch",
      reasons: [expect.stringContaining("参照先がありません")],
    });
  });

  it("uses the module's public start sample when a predecessor artifact is absent", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "e".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    expect(checkState({ root: fixture.target, moduleId: "M01", stateName: "start" })).toMatchObject(
      {
        status: "ready",
        input: { source: "module-public-sample", path: "course/inputs/M01/start.md" },
      },
    );
  });
});
