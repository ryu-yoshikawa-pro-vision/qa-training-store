import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  checkState,
  loadCourseManifest,
  loadModule,
  readVerifiedCourseSource,
  syncCourse,
  validateCourseManifest,
  verifySyncedCourseDistribution,
} from "../../scripts/training/ai-assisted-qa-course-core.mjs";
import { isPublicCourseAsset } from "../../scripts/docs/build-ai-assisted-qa.ts";
import { validateTemplateTarget } from "../../scripts/training/prepare-learner-template.mjs";

const repositoryRoot = process.cwd();
const fixtureRoot = fs.mkdtempSync(path.join(tmpdir(), "ai-qa-course-contract-"));

function writeFixtureFile(root, relativePath, content) {
  const destination = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  return destination;
}

function snapshotDirectory(root) {
  const snapshot = [];
  const visit = (directory, prefix = "") => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute, relative);
      else if (entry.isFile()) snapshot.push([relative, fs.readFileSync(absolute)]);
    }
  };
  visit(root);
  return snapshot;
}

function expectMarkdownLinksResolve(root, relativePath) {
  const markdownPath = path.join(root, ...relativePath.split("/"));
  const markdown = fs.readFileSync(markdownPath, "utf8");
  const links = [...markdown.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)].map(
    (match) => match[1],
  );
  for (const href of links) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) continue;
    const filePart = decodeURIComponent(href.split(/[?#]/, 1)[0]);
    if (!filePart) continue;
    const resolved = path.resolve(path.dirname(markdownPath), filePart);
    const fromRoot = path.relative(root, resolved);
    expect(
      fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`),
      `${relativePath} -> ${href} escapes distribution root`,
    ).toBe(false);
    expect(fs.existsSync(resolved), `${relativePath} -> ${href}`).toBe(true);
  }
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
  const workspaceIgnore = "M00/\nM01/\nM02/\nM03/\nM04/\nM05/\nM06/\nM07/\n";
  writeFixtureFile(
    source,
    "training/ai-assisted-qa-course/templates/workspace.gitignore",
    workspaceIgnore,
  );
  localFiles.push({
    source_path: "training/ai-assisted-qa-course/templates/workspace.gitignore",
    target_path: "workspace/.gitignore",
    module_id: null,
    role: "workspace-protection",
  });
  distributionBytes.set("workspace/.gitignore", Buffer.from(workspaceIgnore));
  for (let index = 0; index <= 10; index += 1) {
    const moduleId = `M${String(index).padStart(2, "0")}`;
    const moduleReadmePath = `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`;
    const quizPath = `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`;
    const inputSource = `training/ai-assisted-qa-course/inputs/${moduleId}/start.md`;
    const exerciseSource = `training/ai-assisted-qa-course/exercises/${moduleId}/exercise.md`;
    const templateSource = `training/ai-assisted-qa-course/exercises/${moduleId}/submission-template.md`;
    const startSource = `training/ai-assisted-qa-course/states/${moduleId}/start.json`;
    const endSource = `training/ai-assisted-qa-course/states/${moduleId}/end.json`;
    const readmeContent =
      index === 0
        ? `# ${moduleId}\n[Quiz](../../quizzes/${moduleId}.json)\n[Start](../../start-here.md)\n[Cart](../../../../spec/features/cart.md)\n`
        : `# ${moduleId}\n`;
    const rows = [
      [moduleReadmePath, `course/modules/${moduleId}/README.md`, readmeContent],
      [
        quizPath,
        `course/quizzes/${moduleId}.json`,
        JSON.stringify({ schema_version: 1, module_id: moduleId, questions: [] }),
      ],
      [inputSource, `course/modules/${moduleId}/inputs/start.md`, `${moduleId} public input\n`],
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
          revision: "ai-assisted-qa-course-v3",
          source_sha: null,
          public_contract: true,
          read_only: true,
          inputs: index
            ? [
                {
                  artifact_id: `M${String(index - 1).padStart(2, "0")}-submission`,
                  path: `workspace/M${String(index - 1).padStart(2, "0")}/submission.md`,
                  revision: `M${String(index - 1).padStart(2, "0")}-result-v1`,
                  contract_id: `M${String(index - 1).padStart(2, "0")}-to-${moduleId}-handoff-v1`,
                  from_module: `M${String(index - 1).padStart(2, "0")}`,
                  optional: true,
                  same_input_contract: true,
                },
              ]
            : [],
          public_fallback: {
            artifact_id: `${moduleId}-fallback`,
            revision: `${moduleId}-public-start-v1`,
            contract_id: index
              ? `M${String(index - 1).padStart(2, "0")}-to-${moduleId}-handoff-v1`
              : `${moduleId}-start-v1`,
            path: `inputs/${moduleId}/start.md`,
            public: true,
          },
          expected: {
            required_paths: [
              `inputs/${moduleId}/start.md`,
              ...(moduleId === "M03" ? ["inputs/M03/public-risk-input.csv"] : []),
            ],
          },
          checks: [{ id: `${moduleId}-START`, mode: "read-only", condition: "check inputs" }],
          references: [
            `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`,
            `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`,
            ...(moduleId === "M03"
              ? [
                  "training/ai-assisted-qa-course/inputs/M03/public-risk-input.csv",
                  "ryu-yoshikawa-pro-vision/qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324",
                ]
              : []),
          ],
          distribution: {
            public_source: true,
            includes_reference_solutions: false,
            includes_scoring_tests: false,
            includes_completed_states: false,
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
          revision: "ai-assisted-qa-course-v3",
          source_sha: null,
          public_contract: true,
          read_only: true,
          outputs: [
            {
              artifact_id: `${moduleId}-submission`,
              path: `workspace/${moduleId}/submission.md`,
              revision: `${moduleId}-result-v1`,
              contract_id:
                index < 10
                  ? `${moduleId}-to-M${String(index + 1).padStart(2, "0")}-handoff-v1`
                  : `${moduleId}-completion-v1`,
            },
          ],
          expected: { required_paths: [`workspace/${moduleId}/submission.md`] },
          checks: [
            {
              id: `${moduleId}-END`,
              mode:
                index === 4 || index === 7 || index === 10
                  ? "phase-assessment-reference"
                  : "read-only",
              condition: "check submission",
            },
          ],
          phase_assessment: {
            phase_id: index <= 4 ? "P1" : index <= 7 ? "P2" : "P3",
            terminal_module_id: index <= 4 ? "M04" : index <= 7 ? "M07" : "M10",
            required_at_terminal_module: index <= 4 ? "M04" : index <= 7 ? "M07" : "M10",
            assessment_is_terminal_only: true,
            mastery_status: "not_evaluated_by_course_check",
            entry_command: index === 4 || index === 7 || index === 10 ? "pnpm course:assess" : null,
          },
          references: [
            `docs/curriculum/ai-assisted-qa/modules/${moduleId}/README.md`,
            `docs/curriculum/ai-assisted-qa/quizzes/${moduleId}.json`,
            ...(moduleId === "M03"
              ? [
                  "ryu-yoshikawa-pro-vision/qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324",
                ]
              : []),
          ],
          distribution: {
            public_source: true,
            includes_reference_solutions: false,
            includes_scoring_tests: false,
            includes_completed_states: false,
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
        role:
          sourcePath === moduleReadmePath
            ? "lesson"
            : sourcePath === inputSource
              ? "input"
              : "fixture",
      });
      distributionBytes.set(targetPath, Buffer.from(content));
    }
    for (const targetPath of [
      `course/modules/${moduleId}/README.md`,
      `course/quizzes/${moduleId}.json`,
      `course/modules/${moduleId}/inputs/start.md`,
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
    if (moduleId === "M03") {
      const sourcePath = "training/ai-assisted-qa-course/inputs/M03/public-risk-input.csv";
      const targetPath = "course/modules/M03/inputs/public-risk-input.csv";
      const content = "risk_id,impact,likelihood\nRISK-CART-001,high,medium\n";
      writeFixtureFile(source, sourcePath, content);
      localFiles.push({
        source_path: sourcePath,
        target_path: targetPath,
        module_id: moduleId,
        role: "input",
      });
      distributionBytes.set(targetPath, Buffer.from(content));
      loadFiles.push({
        module_id: moduleId,
        source_path: targetPath,
        target_path: targetPath,
        kind: "course-material",
      });
    }
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
  const sharedMarkdown = [
    [
      "docs/curriculum/ai-assisted-qa/start-here.md",
      "course/start-here.md",
      "[M00](./modules/M00/README.md)\n[Cart](../../spec/features/cart.md)\n[Map](../../plans/learning-map.md)\n",
      "guide",
    ],
    [
      "docs/spec/features/cart.md",
      "docs/spec/features/cart.md",
      "# Cart specification\n",
      "reference",
    ],
    ["docs/plans/learning-map.md", "docs/plans/learning-map.md", "# Learning map\n", "reference"],
  ];
  for (const [sourcePath, targetPath, content, role] of sharedMarkdown) {
    writeFixtureFile(source, sourcePath, content);
    localFiles.push({ source_path: sourcePath, target_path: targetPath, module_id: null, role });
    distributionBytes.set(targetPath, Buffer.from(content));
  }
  const skillNames = [
    "qa-workflow",
    "spec-analysis",
    "test-analysis",
    "test-requirement-design",
    "test-condition-design",
    "test-case-design",
    "coverage-analysis",
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
      module_ids:
        skill === "test-requirement-design"
          ? ["M02", "M03"]
          : skill === "coverage-analysis"
            ? ["M03", "M04"]
            : index === 4
              ? ["M03", "M04"]
              : [`M${String(index).padStart(2, "0")}`],
    };
  });
  for (const sourcePath of [
    "scripts/training/ai-assisted-qa-course.mjs",
    "scripts/training/ai-assisted-qa-course-core.mjs",
    "scripts/training/ai-assisted-qa-assessment-core.mjs",
    "scripts/training/ai-assisted-qa-assessment.mjs",
    "scripts/training/ai-assisted-qa-run-evidence.mjs",
    "scripts/training/ai-assisted-qa-course-tutor-core.mjs",
    "scripts/training/ai-assisted-qa-course-tutor.mjs",
    "scripts/training/ai-assisted-qa-github-run-evidence.mjs",
  ]) {
    const content = fs.readFileSync(path.join(repositoryRoot, sourcePath));
    writeFixtureFile(source, sourcePath, content);
    localFiles.push({
      source_path: sourcePath,
      target_path: sourcePath,
      module_id: null,
      role: "runtime",
    });
    distributionBytes.set(sourcePath, content);
  }
  const assessmentAssetAllowlist = [
    ...Array.from({ length: 11 }, (_, index) => {
      const moduleId = `M${String(index).padStart(2, "0")}`;
      return {
        source_path: `training/ai-assisted-qa-course/assessment/scoring-tests/${moduleId}.json`,
        asset_type: "scoring",
        module_id: moduleId,
        phase_id: index <= 4 ? "P1" : index <= 7 ? "P2" : "P3",
      };
    }),
    ...[1, 2, 3].map((phase) => ({
      source_path: `training/ai-assisted-qa-course/assessment/phase-${phase}-rubric.md`,
      asset_type: "rubric",
      module_id: null,
      phase_id: `P${phase}`,
    })),
    {
      source_path: "docs/curriculum/ai-assisted-qa/knowledge-graph.json",
      asset_type: "formal_source",
      module_id: null,
      phase_ids: ["P1", "P2", "P3"],
    },
    {
      source_path: "docs/spec/README.md",
      asset_type: "formal_source",
      module_id: null,
      phase_ids: ["P1", "P2"],
    },
    {
      source_path: "training/workbook/01_target-risk.csv",
      asset_type: "formal_source",
      module_id: null,
      phase_ids: ["P1"],
    },
  ];
  for (const asset of assessmentAssetAllowlist) {
    const content =
      asset.asset_type === "scoring"
        ? JSON.stringify({
            schema_version: 1,
            module_id: asset.module_id,
            revision: "assessment-reference-v1",
          })
        : asset.asset_type === "rubric"
          ? `# ${asset.phase_id} rubric\n`
          : `pinned source: ${asset.source_path}\n`;
    writeFixtureFile(source, asset.source_path, content);
  }
  const manifest = {
    schema_version: 1,
    source_sha: "${SOURCE_SHA}",
    state_contract_revision: "ai-assisted-qa-course-v3",
    external_skill_source: {
      repository: "ryu-yoshikawa-pro-vision/qa-workflow-skills",
      commit: "7cc6cba7772de549841a39d71694cbafbc783324",
      excluded: ["**/evals/**"],
    },
    local_files: localFiles,
    external_skill_files: externalSkillFiles,
    load_files: loadFiles,
    assessment_asset_allowlist: assessmentAssetAllowlist,
    generated: {
      shop_build: {
        command: "pnpm run build:web",
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
      "training/ai-assisted-qa-course/assessment/reference-solutions/**",
      "training/ai-assisted-qa-course/assessment/scoring-tests/**",
      "training/ai-assisted-qa-course/assessment/completed-states/**",
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

afterAll(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }), 30_000);

describe("AI-assisted QA distribution contract", () => {
  it("rejects changed Shop build paths, commands, required flag, or source placeholders", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    for (const [field, value] of [
      ["command", "pnpm run build"],
      ["source", "dist/public/**"],
      ["target", "course/modules/**"],
      ["required", false],
    ]) {
      expect(() =>
        validateCourseManifest({
          ...manifest,
          generated: { shop_build: { ...manifest.generated.shop_build, [field]: value } },
        }),
      ).toThrow(/pin the required Shop build/);
    }
    for (const value of ["${SOURCE_SHA_FAKE}", "a".repeat(40)]) {
      expect(() => validateCourseManifest({ ...manifest, source_sha: value })).toThrow(
        /exact runtime-bound placeholder/,
      );
    }
  });

  it("rejects local files colliding with generated Shop outputs before any sync writes", async () => {
    const fixture = courseFixture();
    const modified = {
      ...fixture.manifest,
      local_files: [
        ...fixture.manifest.local_files,
        {
          source_path: "docs/spec/features/cart.md",
          target_path: "course/shop/index.html",
          module_id: null,
          role: "reference",
        },
      ],
    };
    writeFixtureFile(
      fixture.source,
      "training/course-sync/manifest.json",
      JSON.stringify(modified),
    );
    await expect(
      syncCourse({
        root: fixture.source,
        target: fixture.target,
        sourceSha: "a".repeat(40),
        fetchImpl: fixture.fetchImpl,
        buildShop: false,
        shopBuildRoot: fixture.source,
        allowUncommittedFixture: true,
      }),
    ).rejects.toThrow(/duplicate distribution target across local, Skill, and Shop files/);
    expect(snapshotDirectory(fixture.target)).toEqual([]);
  });

  it("keeps the Plan-pinned external Skill allowlist complete and excludes evals", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const result = validateCourseManifest(manifest);
    const learnerFiles = {
      "README.md": "training/ai-assisted-qa-course/templates/learner-repo-README.md",
      ".gitignore": "training/ai-assisted-qa-course/templates/learner-repo.gitignore",
      ".devcontainer/devcontainer.json":
        "training/ai-assisted-qa-course/templates/learner-devcontainer.json",
    };
    for (const [targetPath, sourcePath] of Object.entries(learnerFiles)) {
      expect(manifest.local_files).toContainEqual({
        source_path: sourcePath,
        target_path: targetPath,
        module_id: null,
        role:
          targetPath === "README.md"
            ? "learner-repository-guide"
            : targetPath === ".gitignore"
              ? "repository-protection"
              : "learner-runtime",
      });
      expect(fs.existsSync(path.join(repositoryRoot, sourcePath))).toBe(true);
    }
    const devcontainer = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, learnerFiles[".devcontainer/devcontainer.json"]),
        "utf8",
      ),
    );
    expect(devcontainer.containerEnv?.HUSKY).toBe("0");
    expect(devcontainer.forwardPorts).toContain(8082);
    expect(devcontainer.postCreateCommand).toContain("playwright install --with-deps chromium");
    expect(devcontainer.postCreateCommand).toContain("@opencode/cli@2.0.22");
    expect(devcontainer.postCreateCommand).not.toContain("@openai/codex");
    expect(
      manifest.local_files.some((entry) => entry.target_path.startsWith(".github/workflows/")),
    ).toBe(false);
    expect(result).toMatchObject({ modules: 11, externalSkillFiles: 105 });
    for (const skill of [
      "test-requirement-design",
      "test-condition-design",
      "test-case-design",
    ]) {
      const sourcePath = `skills/${skill}/scripts/runtime_v1_cutover.py`;
      const entry = manifest.external_skill_files.find((file) => file.source_path === sourcePath);
      expect(entry, `missing pinned cutover helper for ${skill}`).toMatchObject({
        skill,
        target_path: `.agents/${sourcePath}`,
        blob_sha: expect.stringMatching(/^[a-f0-9]{40}$/),
        size: expect.any(Number),
      });
    }
    expect(
      manifest.local_files
        .filter((entry) => entry.target_path.startsWith("workspace/"))
        .map((entry) => entry.target_path),
    ).toEqual(["workspace/.gitignore"]);
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

  it("keeps pinned external Skill sources and targets inside their matching packages", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const original = manifest.external_skill_files[0];
    for (const mutation of [
      { source_path: "docs/internal/runtime.py" },
      { target_path: "course/modules/M03/hidden-runtime.py" },
      { skill: "qa-workflow" },
      { source_path: "skills/adversarial-review/evals/answer-key.py" },
    ]) {
      expect(() =>
        validateCourseManifest({
          ...manifest,
          external_skill_files: [
            { ...original, ...mutation },
            ...manifest.external_skill_files.slice(1),
          ],
        }),
      ).toThrow(/(pinned package|prohibited)/);
    }
  });

  it("keeps nested generated Shop manifest paths in deterministic order", async () => {
    const fixture = courseFixture();
    for (const [name, content] of [
      ["z.js", "console.log(1);"],
      ["m/data.json", "{}"],
      ["a.css", "body {}"],
    ]) {
      writeFixtureFile(fixture.source, `dist/${name}`, content);
    }
    const options = {
      root: fixture.source,
      target: fixture.target,
      sourceSha: "c".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    };
    await syncCourse(options);
    const distribution = JSON.parse(
      fs.readFileSync(path.join(fixture.target, ".course/distribution-manifest.json"), "utf8"),
    );
    expect(
      distribution.files
        .filter((file) => file.origin === "generated-shop")
        .map((file) => file.target_path),
    ).toEqual([
      "course/shop/a.css",
      "course/shop/index.html",
      "course/shop/m/data.json",
      "course/shop/z.js",
    ]);
    const original = snapshotDirectory(fixture.target);
    const repeated = await syncCourse(options);
    expect(repeated.copied).toEqual([]);
    expect(snapshotDirectory(fixture.target)).toEqual(original);
  });

  it("re-syncs a pinned Git commit and rejects dirty or divergent sources", async () => {
    const fixture = courseFixture();
    const git = (...args) =>
      execFileSync("git", args, { cwd: fixture.source, encoding: "utf8" }).trim();
    git("init", "-b", "main");
    git("config", "user.name", "Course fixture");
    git("config", "user.email", "course-fixture@example.invalid");
    git("add", "-A");
    git("commit", "-m", "Pin learner distribution fixture");
    const sourceSha = git("rev-parse", "HEAD");
    const options = {
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
    };
    const first = await syncCourse(options);
    const verified = verifySyncedCourseDistribution({ root: fixture.target });
    expect(first.copied.length).toBeGreaterThan(0);
    expect(verified.source_sha).toBe(sourceSha);
    expect(verified.state_files_verified).toBe(22);
    const snapshot = snapshotDirectory(fixture.target);
    const repeated = await syncCourse(options);
    expect(repeated.copied).toEqual([]);
    expect(repeated.unchanged).toBe(repeated.fileCount);
    expect(snapshotDirectory(fixture.target)).toEqual(snapshot);

    writeFixtureFile(fixture.source, "uncommitted-source.txt", "uncommitted\\n");
    await expect(syncCourse(options)).rejects.toThrow(/clean source worktree/);
    expect(snapshotDirectory(fixture.target)).toEqual(snapshot);
    fs.rmSync(path.join(fixture.source, "uncommitted-source.txt"));

    git("checkout", "-b", "other-branch");
    writeFixtureFile(
      fixture.source,
      "docs/curriculum/ai-assisted-qa/modules/M00/README.md",
      "# Changed only on another branch\\n",
    );
    git("add", "-A");
    git("commit", "-m", "Diverge from pinned source");
    expect(git("rev-parse", "HEAD")).not.toBe(sourceSha);
    await expect(syncCourse(options)).rejects.toThrow(/source SHA does not equal checked-out HEAD/);
    expect(snapshotDirectory(fixture.target)).toEqual(snapshot);
  });

  it("keeps runtime and module-loaded relative imports inside the declared distribution", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const sourceByTarget = new Map(
      manifest.local_files.map((file) => [file.target_path, file.source_path]),
    );
    const available = new Set([
      ...manifest.local_files.map((file) => file.target_path),
      ...manifest.load_files.map((file) => file.target_path),
    ]);
    const isCode = /\.(?:mjs|cjs|js|ts|tsx)$/;
    const executableFiles = [
      ...manifest.local_files
        .filter(
          (file) => isCode.test(file.target_path) && !file.target_path.startsWith("course/"),
        )
        .map((file) => ({ sourcePath: file.source_path, targetPath: file.target_path })),
      ...manifest.load_files
        .filter((file) => isCode.test(file.target_path))
        .map((file) => ({
          sourcePath: sourceByTarget.get(file.source_path),
          targetPath: file.target_path,
        })),
    ];
    for (const { sourcePath, targetPath } of executableFiles) {
      expect(sourcePath, `missing import source for ${targetPath}`).toBeTruthy();
      const content = fs.readFileSync(path.join(repositoryRoot, sourcePath), "utf8");
      const importPattern = /\b(?:from\s*|import\s*\(|require\s*\()\s*["'`]([^"'`]+)["'`]/g;
      for (const match of content.matchAll(importPattern)) {
        const specifier = match[1];
        if (!specifier.startsWith(".")) continue;
        const resolved = path.posix.normalize(
          path.posix.join(path.posix.dirname(targetPath), specifier),
        );
        expect(
          [
            resolved,
            `${resolved}.ts`,
            `${resolved}.tsx`,
            `${resolved}.js`,
            `${resolved}.mjs`,
            `${resolved}.json`,
            `${resolved}/index.ts`,
          ].some((candidate) => available.has(candidate)),
          `${targetPath} imports missing packaged file ${specifier}`,
        ).toBe(true);
      }
    }
    expect(executableFiles.length).toBeGreaterThan(20);
  });

  it("rejects unsafe Template target ancestors without creating directories", () => {
    const root = fs.mkdtempSync(path.join(fixtureRoot, "template-target-"));
    const source = path.join(root, "source");
    fs.mkdirSync(source);
    const sibling = path.join(root, "learner");
    expect(validateTemplateTarget(sibling, source)).toBe(sibling);
    expect(fs.existsSync(sibling)).toBe(false);
    for (const target of [source, root, path.join(source, "nested")]) {
      expect(() => validateTemplateTarget(target, source)).toThrow(
        /outside the source checkout/,
      );
    }
    const linked = path.join(root, "linked");
    fs.symlinkSync(root, linked, "dir");
    expect(() => validateTemplateTarget(path.join(linked, "learner"), source)).toThrow(
      /symlink ancestors/,
    );
    expect(fs.existsSync(sibling)).toBe(false);
  });

  it("rejects unknown, multiple, and traversal module IDs in the public load CLI", () => {
    const root = fs.mkdtempSync(path.join(fixtureRoot, "load-cli-"));
    const cli = path.join(repositoryRoot, "scripts/training/ai-assisted-qa-course.mjs");
    for (const [args, errorPattern] of [
      [["load"], /one module only/],
      [["load", "M11"], /exactly one module ID/],
      [["load", "M00", "M01"], /one module only/],
      [["load", "../M00"], /exactly one module ID/],
      [["load", "M00/../M01"], /exactly one module ID/],
      [["load", "M00 M01"], /exactly one module ID/],
    ]) {
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd: root,
        encoding: "utf8",
      });
      expect(result.status, `load ${args.join(" ")} must fail`).not.toBe(0);
      expect(result.stderr).toMatch(errorPattern);
      expect(fs.readdirSync(root)).toEqual([]);
    }
  });

  it("requires M03 public Risk input and source-backed Authority and Scope instructions", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const riskPath = "course/modules/M03/inputs/public-risk-input.csv";
    expect(
      manifest.local_files.some(
        (file) =>
          file.module_id === "M03" && file.role === "input" && file.target_path === riskPath,
      ),
    ).toBe(true);
    expect(
      manifest.load_files.some(
        (file) =>
          file.module_id === "M03" &&
          file.source_path === riskPath &&
          file.target_path === "workspace/M03/public-sample/risk-input.csv",
      ),
    ).toBe(true);
    expect(() =>
      validateCourseManifest({
        ...manifest,
        local_files: manifest.local_files.filter((file) => file.target_path !== riskPath),
        load_files: manifest.load_files.filter((file) => file.source_path !== riskPath),
      }),
    ).toThrow(/M03 public Risk input/);
    const start = fs.readFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/inputs/M03/start.md"),
      "utf8",
    );
    expect(start).toContain("SCOPE-101");
    expect(start).toContain("Authority Entity");
    expect(start).toContain("RISK-CART-001");
    expect(start).toContain("BR-CART-001");
    expect(start).toContain("AC-CART-001");
  });

  it("rejects invalid module load bindings before writing files", async () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const m05 = manifest.load_files.find(
      (entry) =>
        entry.module_id === "M05" && entry.target_path === "workspace/M05/product-link.spec.ts",
    );
    const m05Submission = manifest.load_files.find(
      (entry) => entry.module_id === "M05" && entry.target_path === "workspace/M05/submission.md",
    );
    expect(m05).toBeDefined();
    expect(m05Submission).toBeDefined();
    const invalidBindings = [
      {
        entry: { ...m05, source_path: "course/exercises/M05/unmanifested.spec.ts" },
        reason: /load source_path is not included in the pinned distribution/,
      },
      {
        entry: { ...m05, source_path: "course/exercises/M06/exercise.md" },
        reason: /load source_path belongs to another module/,
      },
      {
        entry: { ...m05, source_path: "workspace/.gitignore" },
        reason: /load source_path must be a module-scoped course file/,
      },
      {
        entry: { ...m05, target_path: "workspace/M06/unexpected.spec.ts" },
        reason: /load target_path must stay within its module workspace/,
      },
      {
        entry: { ...m05, target_path: "course/modules/M09/README.md" },
        reason: /load target_path must stay within its module workspace/,
      },
      {
        entry: { ...m05, target_path: m05Submission.target_path },
        reason: /duplicate module load target/,
      },
    ];
    for (const { entry, reason } of invalidBindings) {
      expect(() =>
        validateCourseManifest({
          ...manifest,
          load_files: manifest.load_files.map((item) => (item === m05 ? entry : item)),
        }),
      ).toThrow(reason);
    }

    const fixture = courseFixture();
    const sourceSha = "a".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const distributionPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const distribution = JSON.parse(fs.readFileSync(distributionPath, "utf8"));
    const m00 = distribution.load_files.find((entry) => entry.module_id === "M00");
    expect(m00).toBeDefined();
    distribution.load_files = distribution.load_files.map((entry) =>
      entry === m00 ? { ...entry, target_path: "workspace/M01/unexpected.md" } : entry,
    );
    fs.writeFileSync(distributionPath, JSON.stringify(distribution));
    expect(() =>
      loadModule({
        root: fixture.target,
        moduleId: "M00",
        now: new Date("2026-10-22T01:05:00.000Z"),
      }),
    ).toThrow(/load target_path must stay within its module workspace/);
    expect(fs.existsSync(path.join(fixture.target, "workspace/M01/unexpected.md"))).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, "workspace/M00/submission.md"))).toBe(false);
  });

  it("rejects a forged cross-scope module load source before creating learner files", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "a".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const distribution = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const moduleEntry = distribution.load_files.find(
      (entry) => entry.module_id === "M00" && entry.target_path === "workspace/M00/submission.md",
    );
    expect(moduleEntry).toBeDefined();

    for (const sourcePath of ["workspace/.gitignore", "course/shop/index.html"]) {
      const forged = {
        ...distribution,
        load_files: distribution.load_files.map((entry) =>
          entry === moduleEntry ? { ...entry, source_path: sourcePath } : entry,
        ),
      };
      fs.writeFileSync(manifestPath, JSON.stringify(forged));

      expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(
        /load source_path must be a module-scoped course file/,
      );
      expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
        /load source_path must be a module-scoped course file/,
      );
      expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
      expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
    }
  });

  it("rejects a distribution with missing module loads or public start inputs", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "d".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const original = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const scenarios = [
      {
        loadFiles: original.load_files.filter((entry) => entry.module_id !== "M10"),
        expected: /Each of M00-M10 must have explicit load entries/,
      },
      {
        loadFiles: original.load_files.filter(
          (entry) => entry.source_path !== "course/modules/M00/inputs/start.md",
        ),
        expected: /M00 public start input must be allowlisted/,
      },
    ];
    for (const { loadFiles, expected } of scenarios) {
      fs.writeFileSync(manifestPath, JSON.stringify({ ...original, load_files: loadFiles }));
      expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(expected);
      expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(expected);
      expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
      expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
    }
  });

  it("rejects invalid Skill sizes and oversized downloads", async () => {
    const fixture = courseFixture();
    const first = fixture.manifest.external_skill_files[0];
    const invalidManifest = structuredClone(fixture.manifest);
    invalidManifest.external_skill_files[0].size = 1024 * 1024 + 1;
    expect(() => validateCourseManifest(invalidManifest)).toThrow(/invalid size/);

    let bodyRead = false;
    const fetchImpl = async (url) => {
      if (!url.endsWith(`/${first.source_path}`)) return fixture.fetchImpl(url);
      return {
        ok: true,
        status: 200,
        headers: { get: (name) => (name === "content-length" ? String(first.size + 1) : null) },
        arrayBuffer: async () => {
          bodyRead = true;
          throw new Error("oversized external Skill body should not be read");
        },
      };
    };
    await expect(
      syncCourse({
        root: fixture.source,
        target: fixture.target,
        sourceSha: "b".repeat(40),
        fetchImpl,
        buildShop: false,
        shopBuildRoot: fixture.source,
        allowUncommittedFixture: true,
      }),
    ).rejects.toThrow(/external Skill response exceeds the allowed size/);
    expect(bodyRead).toBe(false);
    expect(fs.readdirSync(fixture.target)).toEqual([]);
  });

  it("rejects redirected, mismatched-URL, and HTML Skill downloads before writing files", async () => {
    for (const scenario of ["redirect", "mismatched-url", "html"]) {
      const fixture = courseFixture();
      const first = fixture.manifest.external_skill_files[0];
      let requestOptions;
      const fetchImpl = async (url, options) => {
        if (!url.endsWith(`/${first.source_path}`)) return fixture.fetchImpl(url);
        requestOptions = options;
        const response = await fixture.fetchImpl(url);
        if (scenario === "redirect") return { ...response, ok: false, status: 302 };
        if (scenario === "mismatched-url")
          return { ...response, redirected: true, url: "https://example.org/skill" };
        return {
          ...response,
          headers: { get: (name) => (name === "content-type" ? "text/html" : null) },
        };
      };
      await expect(
        syncCourse({
          root: fixture.source,
          target: fixture.target,
          sourceSha: "b".repeat(40),
          fetchImpl,
          buildShop: false,
          shopBuildRoot: fixture.source,
          allowUncommittedFixture: true,
        }),
      ).rejects.toThrow(
        scenario === "html"
          ? /fixed-revision Skill download returned HTML/
          : /fixed-revision Skill download returned a redirect or non-200 response/,
      );
      expect(requestOptions).toEqual({ method: "GET", redirect: "manual" });
      expect(fs.readdirSync(fixture.target)).toEqual([]);
    }
  });

  it("includes learner MIT and third-party license notices in the distribution", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const expected = [
      {
        source_path: "training/ai-assisted-qa-course/templates/learner-LICENSE",
        target_path: "LICENSE",
        role: "license",
      },
      {
        source_path: "training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md",
        target_path: "THIRD_PARTY_NOTICES.md",
        role: "license-notice",
      },
      {
        source_path: "training/ai-assisted-qa-course/templates/learner-OFL-1.1.txt",
        target_path: "licenses/OFL-1.1.txt",
        role: "license",
      },
    ];
    for (const entry of expected) {
      expect(manifest.local_files).toContainEqual({
        ...entry,
        module_id: null,
      });
      const content = fs.readFileSync(path.join(repositoryRoot, entry.source_path), "utf8");
      expect(content.length).toBeGreaterThan(0);
    }
    const guide = fs.readFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/templates/learner-repo-README.md"),
      "utf8",
    );
    for (const entry of expected) expect(guide).toContain(`${entry.target_path}`);
    const notices = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/templates/learner-THIRD_PARTY_NOTICES.md",
      ),
      "utf8",
    );
    expect(notices).toContain("course/shop/_expo/static/js/web/entry-*.js");
    expect(notices).not.toMatch(/entry-[a-f0-9]{16,}\.js/);
    expect(guide).toContain("## 正式AI評価での外部送信");
    expect(guide).toContain("SEND provider/model-id");
  });

  it("keeps public assessment references out of learner sync and load allowlists", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const excluded = [
      "training/ai-assisted-qa-course/assessment/reference-solutions/**",
      "training/ai-assisted-qa-course/assessment/scoring-tests/**",
      "training/ai-assisted-qa-course/assessment/completed-states/**",
    ];
    expect(manifest.forbidden_paths).toEqual(expect.arrayContaining(excluded));
    const entries = [
      ...manifest.local_files,
      ...manifest.external_skill_files,
      ...manifest.load_files,
    ];
    for (const entry of entries) {
      for (const value of [entry.source_path, entry.target_path]) {
        expect(value).not.toMatch(
          /(?:^|\/)assessment\/(?:reference-solutions|scoring-tests|completed-states)(?:\/|$)/i,
        );
      }
    }
    for (const asset of manifest.assessment_asset_allowlist.filter(
      (item) => item.asset_type !== "rubric",
    )) {
      expect(entries.some((entry) => entry.source_path === asset.source_path)).toBe(false);
      expect(entries.some((entry) => entry.target_path === asset.source_path)).toBe(false);
    }
    expect(manifest.local_files.filter((entry) => entry.role === "assessment").length).toBe(3);
    for (const pathValue of [
      "training/ai-assisted-qa-course/assessment/reference-solutions/M00.md",
      "training/ai-assisted-qa-course/assessment/scoring-tests/M00.json",
      "training/ai-assisted-qa-course/assessment/completed-states/M00.json",
    ]) {
      expect(() =>
        validateCourseManifest({
          ...manifest,
          local_files: [
            ...manifest.local_files,
            { source_path: pathValue, target_path: pathValue, module_id: "M00" },
          ],
        }),
      ).toThrow(/prohibited/);
      expect(() =>
        validateCourseManifest({
          ...manifest,
          load_files: [
            ...manifest.load_files,
            { module_id: "M00", source_path: pathValue, target_path: pathValue },
          ],
        }),
      ).toThrow(/prohibited/);
    }
  });

  it("loads the M03 public risk row only with M03 and requires it for the independent fallback", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const state = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/states/M03/start.json"),
        "utf8",
      ),
    );
    const input = manifest.local_files.find(
      (entry) =>
        entry.source_path === "training/ai-assisted-qa-course/inputs/M03/public-risk-input.csv",
    );
    expect(state.expected.required_paths).toContain("inputs/M03/public-risk-input.csv");
    expect(input).toMatchObject({
      target_path: "course/modules/M03/inputs/public-risk-input.csv",
      module_id: "M03",
      role: "input",
    });
    expect(manifest.load_files).toContainEqual({
      module_id: "M03",
      source_path: "course/modules/M03/inputs/public-risk-input.csv",
      target_path: "workspace/M03/public-sample/risk-input.csv",
      kind: "exercise-file",
    });
    const csv = fs.readFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/inputs/M03/public-risk-input.csv"),
      "utf8",
    );
    const sourceRiskCsv = fs.readFileSync(
      path.join(repositoryRoot, "training/workbook/01_target-risk.csv"),
      "utf8",
    );
    const bundledLines = csv.trim().split(/\r?\n/);
    const sourceRiskLines = sourceRiskCsv
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.startsWith("TARGET-CART-001,"));
    expect(csv.trim().split(/\r?\n/)).toHaveLength(2);
    expect(sourceRiskLines).toHaveLength(1);
    expect(bundledLines).toEqual([sourceRiskCsv.trim().split(/\r?\n/)[0], sourceRiskLines[0]]);
    expect(csv).toContain(
      "TARGET-CART-001,docs/spec/features/cart.md,BR-CART-001,AC-CART-001,RISK-CART-001",
    );
  });

  it("loads a distinct M04 public review input without publishing a completed review", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const state = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/states/M04/start.json"),
        "utf8",
      ),
    );
    const sourcePath = "training/ai-assisted-qa-course/inputs/M04/public-review-cases.md";
    const input = manifest.local_files.find((entry) => entry.source_path === sourcePath);
    const cases = fs.readFileSync(path.join(repositoryRoot, sourcePath), "utf8");

    expect(state.expected.required_paths).toContain("inputs/M04/public-review-cases.md");
    expect(state.public_fallback).toEqual({
      artifact_id: "M04-public-review-cases-01",
      revision: "M04-public-review-cases-v1",
      contract_id: "M03-to-M04-handoff-v1",
      path: "inputs/M04/public-review-cases.md",
      public: true,
    });
    expect(input).toMatchObject({
      target_path: "course/modules/M04/inputs/public-review-cases.md",
      module_id: "M04",
      role: "input",
    });
    expect(manifest.load_files).toContainEqual({
      module_id: "M04",
      source_path: "course/modules/M04/inputs/public-review-cases.md",
      target_path: "workspace/M04/public-sample/review-cases.md",
      kind: "exercise-file",
    });
    expect(cases).toContain("CASE-CART-BASE-01");
    expect(cases).toContain("CASE-CART-CANDIDATE-01");
    expect(cases).toContain("CASE-CART-CANDIDATE-02A / CASE-CART-CANDIDATE-02B");
    expect(cases).toContain("CASE-CART-CANDIDATE-03");
    expect(cases).toContain("M04のレビュー回答、採点資料、完成したM04提出物ではありません");
    expect(cases).not.toMatch(/模範解答|採点基準の解説|正答一覧/);
  });

  it("keeps the M07 failure explanation aligned with the executable failing Locator", () => {
    const readme = fs.readFileSync(
      path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/modules/M07/README.md"),
      "utf8",
    );
    const spec = fs.readFileSync(
      path.join(repositoryRoot, "workspace/M07/failure-assertion.spec.ts"),
      "utf8",
    );

    expect(spec).toContain('name: "存在しない商品"');
    expect(spec).toContain("M07_INTENTIONAL_ASSERTION_FAILURE");
    expect(readme).toContain("存在しない見出し「存在しない商品」");
    expect(readme).toContain("LocatorとAssertionのどこで失敗したか");
    expect(readme).not.toContain("Locatorは合っているがAssertionが案内文だけを確認している");
  });

  it("keeps M07 diagnostic Assertion failure separate from the repair TODO and runs", () => {
    const exercise = fs.readFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/exercises/M07/exercise.md"),
      "utf8",
    );
    const lesson = fs.readFileSync(
      path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/modules/M07/README.md"),
      "utf8",
    );
    const diagnostic = fs.readFileSync(
      path.join(repositoryRoot, "workspace/M07/failure-assertion.spec.ts"),
      "utf8",
    );
    const repair = fs.readFileSync(
      path.join(repositoryRoot, "workspace/M07/repaired-assertion.spec.ts"),
      "utf8",
    );
    const scoring = JSON.parse(
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "training/ai-assisted-qa-course/assessment/scoring-tests/M07.json",
        ),
        "utf8",
      ),
    );
    expect(scoring.evaluation_policy.execution_evidence.required_runs).toContainEqual({
      spec: "failure-assertion.spec.ts",
      label: "main",
      minimum_tests: 1,
      expected_outcome: "failed",
      require_trace: true,
    });
    expect(diagnostic).toContain("M07_INTENTIONAL_ASSERTION_FAILURE");
    expect(repair).toContain('throw new Error("TODO:');
    expect(exercise).toContain("course:run M07 failure-assertion.spec.ts --label main");
    expect(exercise).toContain("course:run M07 repaired-assertion.spec.ts --label before");
    expect(exercise).toContain("course:run M07 repaired-assertion.spec.ts --label after");
    expect(lesson).toContain("診断素材AのAssertion失敗と同じエラーにはなりません");
  });

  it("ships complete M08 and M10 public handoff bundles within their single-module loads", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const m07End = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/states/M07/end.json"),
        "utf8",
      ),
    );
    const m08Start = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/states/M08/start.json"),
        "utf8",
      ),
    );
    expect(m07End.outputs).toContainEqual(
      expect.objectContaining({
        artifact_id: "M07-result-03",
        path: "workspace/M07/phase2-handoff.md",
        contract_id: "M07-to-M08-handoff-v1",
      }),
    );
    expect(m08Start.inputs.map((input) => input.artifact_id)).toContain("M07-result-03");

    for (const moduleId of ["M08", "M10"]) {
      const state = JSON.parse(
        fs.readFileSync(
          path.join(repositoryRoot, `training/ai-assisted-qa-course/states/${moduleId}/start.json`),
          "utf8",
        ),
      );
      if (moduleId === "M10") {
        expect(state.expected.required_paths).toContain("inputs/M10/public-sample-reset.md");
      }
      for (const requiredPath of state.expected.required_paths.filter((item) =>
        item.startsWith(`inputs/${moduleId}/`),
      )) {
        const targetPath = `course/modules/${moduleId}/inputs/${requiredPath.slice(`inputs/${moduleId}/`.length)}`;
        expect(
          manifest.local_files.some(
            (file) =>
              file.module_id === moduleId &&
              file.role === "input" &&
              file.target_path === targetPath,
          ),
          `${moduleId} fallback input ${targetPath} is allowlisted`,
        ).toBe(true);
        expect(
          manifest.load_files.some(
            (file) => file.module_id === moduleId && file.source_path === targetPath,
          ),
          `${moduleId} fallback input ${targetPath} is loaded`,
        ).toBe(true);
      }
      for (const file of manifest.load_files.filter(
        (entry) => entry.module_id === moduleId && entry.target_path.startsWith("workspace/"),
      )) {
        expect(file.target_path.startsWith(`workspace/${moduleId}/`), file.target_path).toBe(true);
      }

      const sampleSpec = manifest.load_files.find(
        (entry) =>
          entry.module_id === moduleId &&
          entry.target_path === `workspace/${moduleId}/public-sample/handoff-smoke.spec.ts`,
      );
      expect(sampleSpec?.source_path).toBe(
        `course/modules/${moduleId}/inputs/public-sample-spec.ts`,
      );
      const sampleConfig = fs.readFileSync(
        path.join(
          repositoryRoot,
          `training/ai-assisted-qa-course/inputs/${moduleId}/public-sample-config.md`,
        ),
        "utf8",
      );
      expect(sampleConfig).toContain(`workspace/${moduleId}/public-sample/`);
    }

    const m10Workflow = manifest.load_files.find(
      (entry) => entry.module_id === "M10" && entry.kind === "disabled-workflow-sample",
    );
    expect(m10Workflow?.target_path).toBe(
      "workspace/M10/public-sample/course-e2e.workflow.yml.disabled",
    );
    expect(m10Workflow?.target_path).not.toContain(".github/workflows/");
    const m10WorkflowSource = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
      "utf8",
    );
    expect(m10WorkflowSource).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample");

    const ignoreRoot = path.join(fixtureRoot, "m08-gitignore-contract");
    fs.mkdirSync(path.join(ignoreRoot, "workspace"), { recursive: true });
    fs.writeFileSync(
      path.join(ignoreRoot, "workspace/.gitignore"),
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/templates/workspace.gitignore"),
        "utf8",
      ),
    );
    execFileSync("git", ["init", "--quiet"], { cwd: ignoreRoot });
    const ignoredLog = spawnSync(
      "git",
      [
        "-C",
        ignoreRoot,
        "check-ignore",
        "--no-index",
        "--verbose",
        "workspace/M08/local-only-run.log",
      ],
      { encoding: "utf8" },
    );
    expect(ignoredLog.status).toBe(0);
    expect(ignoredLog.stdout).toContain("/M08/local-only-run.log");
    const unrelatedLog = spawnSync(
      "git",
      ["-C", ignoreRoot, "check-ignore", "--no-index", "workspace/M08/actual-run.log"],
      { encoding: "utf8" },
    );
    expect(unrelatedLog.status).toBe(1);
    for (const learnerPrivateFile of [
      "workspace/M10/ci-run-evidence.json",
      "workspace/M10/submission.md",
    ]) {
      const ignored = spawnSync(
        "git",
        ["-C", ignoreRoot, "check-ignore", "--no-index", learnerPrivateFile],
        { encoding: "utf8" },
      );
      expect(ignored.status, learnerPrivateFile).toBe(0);
    }
    expect(
      spawnSync(
        "git",
        [
          "-C",
          ignoreRoot,
          "check-ignore",
          "--no-index",
          "workspace/M10/public-sample/handoff-smoke.spec.ts",
        ],
        { encoding: "utf8" },
      ).status,
    ).toBe(1);
  });

  it("keeps M08 Git evidence out of the selected commit paths in a temporary repository", () => {
    const fixture = path.join(fixtureRoot, "m08-staged-diff-contract");
    const runGit = (args) => execFileSync("git", args, { cwd: fixture, encoding: "utf8" });
    const intendedPaths = ["workspace/M08/review-candidate.md", "workspace/M08/submission.md"];
    fs.mkdirSync(fixture, { recursive: true });
    fs.mkdirSync(path.join(fixture, "workspace"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture, "workspace/.gitignore"),
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/templates/workspace.gitignore"),
        "utf8",
      ),
    );
    runGit(["init", "--quiet"]);
    runGit(["config", "user.name", "Assessment Contract"]);
    runGit(["config", "user.email", "assessment-contract@example.invalid"]);
    writeFixtureFile(fixture, "README.md", "M08 temporary Git contract fixture\n");
    runGit(["add", "--", "README.md", "workspace/.gitignore"]);
    runGit(["commit", "--quiet", "-m", "temporary M08 baseline"]);

    writeFixtureFile(fixture, intendedPaths[0], "reviewed sample candidate\n");
    writeFixtureFile(fixture, intendedPaths[1], "reviewed submission\n");
    writeFixtureFile(fixture, "workspace/M08/local-only-run.log", "synthetic local run log\n");
    writeFixtureFile(fixture, "out-of-scope.txt", "not part of the submission\n");

    const initialStatus = runGit(["status", "--short", "--ignored", "--untracked-files=all"]);
    expect(initialStatus).toContain("?? workspace/M08/review-candidate.md");
    expect(initialStatus).toContain("?? workspace/M08/submission.md");
    expect(initialStatus).toContain("?? out-of-scope.txt");
    expect(initialStatus).toContain("!! workspace/M08/local-only-run.log");

    runGit(["add", "--", ...intendedPaths]);
    const selectedPaths = runGit(["diff", "--cached", "--name-only"]).trim().split(/\r?\n/).sort();
    expect(selectedPaths).toEqual([...intendedPaths].sort());
    expect(runGit(["diff", "--cached", "--check"])).toBe("");

    runGit(["add", "--", "out-of-scope.txt"]);
    const mixedPaths = runGit(["diff", "--cached", "--name-only"]).trim().split(/\r?\n/).sort();
    expect(mixedPaths).toContain("out-of-scope.txt");
    expect(mixedPaths).not.toEqual([...intendedPaths].sort());

    const handoffFixture = path.join(fixtureRoot, "m07-phase3-handoff-contract");
    const runHandoffGit = (args) =>
      execFileSync("git", args, { cwd: handoffFixture, encoding: "utf8" });
    const handoffSpec = "workspace/M07/repaired-assertion.spec.ts";
    fs.mkdirSync(path.join(handoffFixture, "workspace"), { recursive: true });
    fs.writeFileSync(
      path.join(handoffFixture, "workspace/.gitignore"),
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/templates/workspace.gitignore"),
        "utf8",
      ),
    );
    runHandoffGit(["init", "--quiet"]);
    writeFixtureFile(handoffFixture, "README.md", "M07 Phase 2 handoff contract fixture\n");
    runHandoffGit(["add", "--", "README.md", "workspace/.gitignore"]);
    runHandoffGit([
      "-c",
      "user.name=Assessment Contract",
      "-c",
      "user.email=assessment-contract@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "temporary handoff baseline",
    ]);
    const specSource = fs.readFileSync(path.join(repositoryRoot, handoffSpec), "utf8");
    writeFixtureFile(handoffFixture, handoffSpec, specSource);
    writeFixtureFile(handoffFixture, "workspace/M07/other.spec.ts", "not selected\n");
    writeFixtureFile(handoffFixture, "workspace/M07/run.log", "synthetic log\n");
    writeFixtureFile(handoffFixture, "workspace/M07/trace.zip", "synthetic trace\n");
    writeFixtureFile(handoffFixture, "workspace/M07/.env.local", "SYNTHETIC_SECRET=value\n");

    const ignoredSpec = spawnSync(
      "git",
      ["-C", handoffFixture, "check-ignore", "--no-index", "--verbose", handoffSpec],
      { encoding: "utf8" },
    );
    expect(ignoredSpec.status).toBe(0);
    expect(ignoredSpec.stdout).toContain("/M07/");
    runHandoffGit(["add", "--all"]);
    expect(runHandoffGit(["diff", "--cached", "--name-only"]).trim()).toBe("");

    runHandoffGit(["add", "-f", "--", handoffSpec]);
    expect(runHandoffGit(["diff", "--cached", "--name-only"]).trim()).toBe(handoffSpec);
    expect(runHandoffGit(["diff", "--cached", "--check"])).toBe("");
    const stagedSpec = runHandoffGit(["show", `:${handoffSpec}`]);
    expect(stagedSpec).toContain('from "../../training/playwright/support/reset-scenario"');
    for (const excluded of ["other.spec.ts", "run.log", "trace.zip", ".env.local"])
      expect(runHandoffGit(["diff", "--cached", "--name-only"])).not.toContain(excluded);

    const phase3Workflow = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled",
      ),
      "utf8",
    );
    const m09Starter = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/inputs/M09/workflow-starter.yml.disabled",
      ),
      "utf8",
    );
    const m10Fallback = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
      "utf8",
    );
    expect(phase3Workflow).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M07");
    expect(m09Starter).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M07");
    expect(m10Fallback).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample");
    const m07Lesson = fs.readFileSync(
      path.join(repositoryRoot, "docs/curriculum/ai-assisted-qa/modules/M07/README.md"),
      "utf8",
    );
    const m07Exercise = fs.readFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/exercises/M07/exercise.md"),
      "utf8",
    );
    expect(`${m07Lesson}\n${m07Exercise}`).not.toMatch(/git add|git commit|pull request/i);
  }, 120_000);

  it("maps every lesson and start-guide link to an allowlisted distribution file", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const targetBySource = new Map(
      manifest.local_files.map((entry) => [
        path.posix.normalize(entry.source_path),
        entry.target_path,
      ]),
    );
    for (const entry of manifest.local_files.filter(
      (file) => file.role === "lesson" || file.role === "guide",
    )) {
      const content = fs.readFileSync(path.join(repositoryRoot, entry.source_path), "utf8");
      for (const match of content.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
        const href = match[1];
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) continue;
        const [sourceHref = ""] = href.split(/[?#]/, 1);
        if (!sourceHref) continue;
        const sourceTarget = path.posix.normalize(
          path.posix.join(path.posix.dirname(entry.source_path), sourceHref),
        );
        if (isPublicCourseAsset(sourceTarget)) {
          expect(
            fs.existsSync(path.join(repositoryRoot, ...sourceTarget.split("/"))),
            `${entry.source_path} -> ${href} is an allowlisted course asset that must exist`,
          ).toBe(true);
          continue;
        }
        expect(targetBySource.has(sourceTarget), `${entry.source_path} -> ${href}`).toBe(true);
      }
    }
  });

  it("distributes the M05 reading exercise and incomplete Phase 2 specs without publishing answers", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const assessmentSpecPaths = [
      "training/ai-assisted-qa-course/assessment/playwright/M05/product-link.spec.ts",
      "training/ai-assisted-qa-course/assessment/playwright/M06/cart-cases.spec.ts",
      "training/ai-assisted-qa-course/assessment/playwright/M07/expected-failure/intentional-assertion.spec.ts",
      "training/ai-assisted-qa-course/assessment/playwright/M07/repaired/repaired-assertion.spec.ts",
    ];
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
    const m06Template = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/exercises/M06/submission-template.md",
      ),
      "utf8",
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
    for (const assessmentSpecPath of assessmentSpecPaths) {
      expect(fs.existsSync(path.join(repositoryRoot, assessmentSpecPath))).toBe(true);
      expect(manifest.local_files.some((item) => item.source_path === assessmentSpecPath)).toBe(
        false,
      );
      expect(manifest.load_files.some((item) => item.source_path === assessmentSpecPath)).toBe(
        false,
      );
    }
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
    for (const caseId of ["CASE-CART-001", "CASE-CART-002", "CASE-CART-003"]) {
      expect(m06).toContain(caseId);
      expect(m06Template).toContain(caseId);
    }
    expect(m06Template).not.toMatch(/CASE-CART-(NORMAL|REJECT-LIMIT|LOW-STOCK)/);
    expect(m06.match(/throw new Error\("TODO:/g)).toHaveLength(3);
    expect(m06).not.toMatch(/toHaveValue\(|toBeVisible\(/);
    expect(m07Before).toContain("M07_INTENTIONAL_ASSERTION_FAILURE");
    expect(m07After).toContain('throw new Error("TODO:');
    expect(m07After).not.toContain("セラミックマグ");
  });

  it("hands off the corrected M09 disabled workflow to M10 without activating it", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const readState = (moduleId, state) =>
      JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            "training/ai-assisted-qa-course/states",
            moduleId,
            `${state}.json`,
          ),
          "utf8",
        ),
      );
    const m09Start = readState("M09", "start");
    const m09End = readState("M09", "end");
    const m10Start = readState("M10", "start");
    const artifact = m09End.outputs.find((item) => item.artifact_id === "M09-result-02");
    const input = m10Start.inputs.find((item) => item.artifact_id === "M09-result-02");
    const starterPath = "training/ai-assisted-qa-course/inputs/M09/workflow-starter.yml.disabled";
    const handoffPath = "training/ai-assisted-qa-course/inputs/M09/public-sample-handoff.md";
    const starter = fs.readFileSync(path.join(repositoryRoot, starterPath), "utf8");
    const handoff = fs.readFileSync(path.join(repositoryRoot, handoffPath), "utf8");
    const starterEntry = manifest.local_files.find((item) => item.source_path === starterPath);
    const handoffEntry = manifest.local_files.find((item) => item.source_path === handoffPath);
    const workspaceEntry = manifest.load_files.find(
      (item) => item.module_id === "M09" && item.target_path === artifact?.path,
    );

    expect(starterEntry).toMatchObject({
      target_path: "course/modules/M09/inputs/workflow-starter.yml.disabled",
      module_id: "M09",
      role: "exercise-input",
    });
    expect(m09Start.expected.required_paths).toContain(starterEntry.target_path);
    expect(m09Start.expected.required_paths).toContain(handoffEntry.target_path);
    expect(m09Start.public_fallback).toMatchObject({
      artifact_id: "M09-public-handoff-01",
      revision: "M09-public-handoff-v1",
      contract_id: "M08-to-M09-handoff-v1",
      path: "inputs/M09/public-sample-handoff.md",
      public: true,
    });
    expect(m09Start.expected.required_paths).toContain(m09Start.public_fallback.path);
    expect(m09Start.checks[1].condition).toContain(
      "public-sample-handoff as the M08-like history/PR fallback",
    );
    expect(m09Start.checks[1].condition).toContain("start.md is guidance only");
    expect(m09Start.checks[1].condition).toContain("separately required module input");
    expect(
      fs.readFileSync(
        path.join(repositoryRoot, "training/ai-assisted-qa-course/inputs/M09/start.md"),
        "utf8",
      ),
    ).toContain("workflow-starter.yml.disabledは別の必須演習入力");
    expect(handoff).toContain("artifact ID: `M09-public-handoff-01`");
    expect(handoff).toContain("training PR ID: `TRAINING-PR-M08-01`");
    expect(handoff).toContain("実在のGit commit、GitHub PR、CI Run");
    expect(handoff).toContain("TRAINING-COMMIT-02");
    expect(starter).toContain("ref: ${{ github.sha }}");
    expect(starter).not.toContain("playwright install");
    expect(workspaceEntry).toMatchObject({
      source_path: starterEntry.target_path,
      target_path: "workspace/M09/course-e2e.workflow.yml.disabled",
    });
    expect(
      manifest.load_files.find(
        (item) => item.module_id === "M09" && item.source_path === handoffEntry.target_path,
      ),
    ).toMatchObject({
      target_path: "workspace/M09/public-sample/handoff.md",
      kind: "exercise-file",
    });
    expect(artifact).toMatchObject({
      path: workspaceEntry.target_path,
      revision: "M09-workflow-v1",
      contract_id: "M09-to-M10-handoff-v1",
    });
    expect(input).toMatchObject({
      path: artifact.path,
      revision: artifact.revision,
      contract_id: artifact.contract_id,
      from_module: "M09",
      optional: true,
      same_input_contract: true,
    });
    expect(artifact.path.endsWith(".disabled")).toBe(true);
    expect(manifest.forbidden_paths).toContain(".github/workflows/**");
    expect(
      manifest.local_files.some((item) => item.target_path.startsWith(".github/workflows/")),
    ).toBe(false);
  });

  it("rejects GitHub workflow source and target paths before distribution or module load", async () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const firstLocalFile = manifest.local_files[0];
    const firstLoadFile = manifest.load_files[0];

    expect(() =>
      validateCourseManifest({
        ...manifest,
        local_files: [
          ...manifest.local_files,
          { ...firstLocalFile, source_path: ".github/workflows/source.yml" },
        ],
      }),
    ).toThrow(/source_path is prohibited by the course distribution contract/);
    expect(() =>
      validateCourseManifest({
        ...manifest,
        local_files: [
          ...manifest.local_files,
          { ...firstLocalFile, target_path: ".github/workflows/activate.yml" },
        ],
      }),
    ).toThrow(/target_path is prohibited by the course distribution contract/);
    expect(() =>
      validateCourseManifest({
        ...manifest,
        load_files: [
          ...manifest.load_files,
          { ...firstLoadFile, target_path: ".github/workflows/activate.yml" },
        ],
      }),
    ).toThrow(/load target_path is prohibited by the course distribution contract/);

    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "9".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const distributionPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const baselineDistribution = JSON.parse(fs.readFileSync(distributionPath, "utf8"));
    const mutations = [
      {
        collection: "load_files",
        field: "source_path",
        value: ".github/workflows/source.yml",
        message: "load source_path is prohibited",
      },
      {
        collection: "load_files",
        field: "target_path",
        value: ".github/workflows/activate.yml",
        message: "load target_path is prohibited",
      },
      {
        collection: "files",
        field: "source_path",
        value: ".github/workflows/source.yml",
        message: "distribution source_path is prohibited",
      },
      {
        collection: "files",
        field: "target_path",
        value: ".github/workflows/distributed.yml",
        message: "distribution target_path is prohibited",
      },
    ];
    for (const mutation of mutations) {
      const distribution = structuredClone(baselineDistribution);
      distribution[mutation.collection][0][mutation.field] = mutation.value;
      fs.writeFileSync(distributionPath, JSON.stringify(distribution));
      expect(() =>
        loadModule({
          root: fixture.target,
          moduleId: "M00",
          now: new Date("2026-10-22T01:05:00.000Z"),
        }),
      ).toThrow(mutation.message);
      expect(fs.existsSync(path.join(fixture.target, ".github/workflows"))).toBe(false);
    }
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
    expect(workflow).not.toContain("pnpm run build:web");
    expect(workflow).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M07");
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
    const artifactPathBlock =
      /^          path: \|\r?\n((?:            .+\r?\n?)+)/m.exec(workflow)?.[1] ?? "";
    expect(
      artifactPathBlock
        .split(/\r?\n/)
        .filter(Boolean)
        .map((artifactPath) => artifactPath.trim()),
    ).toEqual([
      "output/training/ai-assisted-qa/playwright-result.json",
      "output/training/ai-assisted-qa/target-sha.txt",
    ]);
    expect(workflow).toContain("if: always()");
    expect(workflow).not.toMatch(/contents:\s+write|secrets\.|deploy:/i);

    const m09Starter = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/inputs/M09/workflow-starter.yml.disabled",
      ),
      "utf8",
    );
    expect(m09Starter).not.toContain("pnpm run build:web");
    expect(m09Starter).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M07");
    const m10Fallback = fs.readFileSync(
      path.join(
        repositoryRoot,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
      "utf8",
    );
    expect(m10Fallback).not.toContain("pnpm run build:web");
    expect(m10Fallback).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample");
  });

  it("verifies the complete pinned distribution before serving a prebuilt Shop", async () => {
    const fixture = courseFixture();
    const sourceSha = "b".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const verified = verifySyncedCourseDistribution({ root: fixture.target });
    expect(verified).toMatchObject({
      source_sha: sourceSha,
      state_contract_revision: "ai-assisted-qa-course-v3",
      shop_files_verified: 1,
      state_files_verified: 22,
    });
    const verifyCommand = path.join(repositoryRoot, "scripts/training/ai-assisted-qa-course.mjs");
    const cliVerification = execFileSync(process.execPath, [verifyCommand, "verify-distribution"], {
      cwd: fixture.target,
      encoding: "utf8",
    });
    expect(JSON.parse(cliVerification)).toMatchObject({
      source_sha: sourceSha,
      shop_files_verified: 1,
    });
    expect(fs.existsSync(path.join(fixture.target, "src"))).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, "app"))).toBe(false);

    writeFixtureFile(
      fixture.target,
      "workspace/M07/distribution-config.spec.ts",
      'import { test } from "@playwright/test";\ntest("synced config can enumerate a workspace spec", () => {});\n',
    );
    for (const relativePath of [
      "playwright.ai-assisted-qa.config.ts",
      "scripts/training/ai-assisted-qa-course.mjs",
      "scripts/training/ai-assisted-qa-course-core.mjs",
      "scripts/training/ai-assisted-qa-playwright-settings.ts",
    ]) {
      const destination = path.join(fixture.target, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(repositoryRoot, relativePath), destination);
    }
    const configEnumeration = spawnSync(
      process.execPath,
      [
        path.join(repositoryRoot, "node_modules/@playwright/test/cli.js"),
        "test",
        "--config=playwright.ai-assisted-qa.config.ts",
        "--project=ai-assisted-qa-chromium",
        "--list",
      ],
      {
        cwd: fixture.target,
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_PATH: path.join(repositoryRoot, "node_modules"),
          PLAYWRIGHT_BASE_URL: "http://127.0.0.1:8082",
          PLAYWRIGHT_TEST_ROOT: "workspace/M07",
        },
      },
    );
    expect(configEnumeration.status, configEnumeration.stderr || configEnumeration.stdout).toBe(0);
    expect(configEnumeration.stdout).toContain("distribution-config.spec.ts");
    expect(configEnumeration.stdout).toContain("学習用の固定配布物を検証しました");

    const shopIndex = path.join(fixture.target, "course/shop/index.html");
    const originalShop = fs.readFileSync(shopIndex);
    fs.appendFileSync(shopIndex, "modified after sync");
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /changed after sync: course\/shop\/index\.html/,
    );
    const tamperedCliVerification = spawnSync(
      process.execPath,
      [verifyCommand, "verify-distribution"],
      { cwd: fixture.target, encoding: "utf8" },
    );
    expect(tamperedCliVerification.status).not.toBe(0);
    expect(tamperedCliVerification.stderr).toContain("changed after sync: course/shop/index.html");
    fs.writeFileSync(shopIndex, originalShop);

    const unexpectedShopFile = path.join(fixture.target, "course/shop/unmanifested.txt");
    fs.writeFileSync(unexpectedShopFile, "outside the pinned build\n");
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /unmanifested file in the pinned Shop/,
    );
    fs.rmSync(unexpectedShopFile);

    const leakedReference = writeFixtureFile(
      fixture.target,
      "course/assessment/reference-solutions/M10.md",
      "reference-only scoring material must not enter a learner distribution\n",
    );
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /path is prohibited: course\/assessment\/reference-solutions/,
    );
    fs.rmSync(path.dirname(leakedReference), { recursive: true, force: true });

    const extraCourseFile = writeFixtureFile(
      fixture.target,
      "course/modules/M00/unmanifested.md",
      "unexpected course content\n",
    );
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /unmanifested file in the pinned course: course\/modules\/M00\/unmanifested\.md/,
    );
    fs.rmSync(extraCourseFile);

    const unmanifestedSkillFile = writeFixtureFile(
      fixture.target,
      ".agents/skills/qa-workflow/injected.md",
      "unapproved Skill runtime instructions\n",
    );
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /unmanifested file in the pinned Skill: \.agents\/skills\/qa-workflow\/injected\.md/,
    );
    fs.rmSync(unmanifestedSkillFile);

    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const originalManifest = fs.readFileSync(manifestPath, "utf8");
    const wrongSource = JSON.parse(originalManifest);
    wrongSource.source_sha = "c".repeat(40);
    fs.writeFileSync(manifestPath, JSON.stringify(wrongSource));
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /source SHA does not match the course pin/,
    );

    const invalidPath = JSON.parse(originalManifest);
    invalidPath.files.find((entry) => entry.target_path === "course/shop/index.html").target_path =
      "course/shop/../outside.html";
    fs.writeFileSync(manifestPath, JSON.stringify(invalidPath));
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /distribution target_path escapes its root/,
    );

    fs.writeFileSync(manifestPath, originalManifest);
    fs.rmSync(shopIndex);
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /distributed file is missing or not a regular file: course\/shop\/index\.html/,
    );
  });

  it("rejects Secret and personal email patterns before copying learner files", async () => {
    for (const [label, payload] of [
      ["GitHub token", `ghp_${"a".repeat(36)}`],
      ["personal email address", "learner-private@gmail.com"],
    ]) {
      const fixture = courseFixture();
      writeFixtureFile(
        fixture.source,
        "training/ai-assisted-qa-course/exercises/M00/exercise.md",
        `# M00\n${payload}\n`,
      );
      await expect(
        syncCourse({
          root: fixture.source,
          target: fixture.target,
          sourceSha: "a".repeat(40),
          fetchImpl: fixture.fetchImpl,
          buildShop: false,
          shopBuildRoot: fixture.source,
          allowUncommittedFixture: true,
        }),
      ).rejects.toThrow(new RegExp(`public course content contains a potential ${label}`));
      expect(fs.readdirSync(fixture.target)).toEqual([]);
    }
  });

  it("rejects credentials in generated Shop files even when they are build outputs", async () => {
    const fixture = courseFixture();
    writeFixtureFile(fixture.source, "dist/index.html", `<body>ghp_${"b".repeat(36)}</body>`);
    await expect(
      syncCourse({
        root: fixture.source,
        target: fixture.target,
        sourceSha: "b".repeat(40),
        fetchImpl: fixture.fetchImpl,
        buildShop: false,
        shopBuildRoot: fixture.source,
        allowUncommittedFixture: true,
      }),
    ).rejects.toThrow(
      "public course content contains a potential GitHub token: course/shop/index.html",
    );
    expect(fs.readdirSync(fixture.target)).toEqual([]);
  });

  it("scans Python and MJS files copied from generated Shop output", async () => {
    for (const filePath of ["dist/inspection.py", "dist/runtime.mjs"]) {
      const fixture = courseFixture();
      writeFixtureFile(fixture.source, filePath, `ghp_${"d".repeat(36)}`);
      await expect(
        syncCourse({
          root: fixture.source,
          target: fixture.target,
          sourceSha: "d".repeat(40),
          fetchImpl: fixture.fetchImpl,
          buildShop: false,
          shopBuildRoot: fixture.source,
          allowUncommittedFixture: true,
        }),
      ).rejects.toThrow(/public course content contains a potential GitHub token/);
      expect(fs.readdirSync(fixture.target)).toEqual([]);
    }
  });

  it("rejects a registered Secret even when its manifest hash is adjusted", async () => {
    const fixture = courseFixture();
    const sourceSha = "c".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const targetPath = "course/exercises/M00/exercise.md";
    const contents = Buffer.from(`ghp_${"c".repeat(36)}\n`);
    writeFixtureFile(fixture.target, targetPath, contents);
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const distribution = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const file = distribution.files.find((entry) => entry.target_path === targetPath);
    expect(file).toBeDefined();
    file.sha256 = createHash("sha256").update(contents).digest("hex");
    file.bytes = contents.length;
    fs.writeFileSync(manifestPath, JSON.stringify(distribution));
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      "public course content contains a potential GitHub token: course/exercises/M00/exercise.md",
    );
  });

  it("rejects tampered synced input before course:load writes a learner workspace", async () => {
    const fixture = courseFixture();
    const sourceSha = "e".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const targetPath = "course/exercises/M00/exercise.md";
    const altered = Buffer.from(`ghp_${"e".repeat(36)}\n`);
    writeFixtureFile(fixture.target, targetPath, altered);
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const record = manifest.files.find((file) => file.target_path === targetPath);
    record.sha256 = createHash("sha256").update(altered).digest("hex");
    record.bytes = altered.length;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(
      "public course content contains a potential GitHub token: course/exercises/M00/exercise.md",
    );
    expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
  });

  it("validates a pinned start state before copying any learner files", async () => {
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
    const targetPath = "course/states/M00/start.json";
    const altered = Buffer.from("{invalid JSON");
    writeFixtureFile(fixture.target, targetPath, altered);
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const record = manifest.files.find((file) => file.target_path === targetPath);
    record.sha256 = createHash("sha256").update(altered).digest("hex");
    record.bytes = altered.length;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(SyntaxError);
    expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
  });

  it("rejects a forged distribution revision before loading learner files", async () => {
    const fixture = courseFixture();
    const sourceSha = "5".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const statePath = "course/states/M00/start.json";
    const state = JSON.parse(fs.readFileSync(path.join(fixture.target, statePath), "utf8"));
    const forged = Buffer.from(JSON.stringify({ ...state, revision: "ai-assisted-qa-course-v2" }));
    writeFixtureFile(fixture.target, statePath, forged);
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.state_contract_revision = "ai-assisted-qa-course-v2";
    const entry = manifest.files.find((file) => file.target_path === statePath);
    entry.sha256 = createHash("sha256").update(forged).digest("hex");
    entry.bytes = forged.length;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(
      "course distribution manifest has an unsupported state contract revision",
    );
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      "course distribution manifest has an unsupported state contract revision",
    );
    expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
  });

  it("rejects a forged external Skill source before loading learner files", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "6".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const original = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const change of [
      { repository: "another-owner/another-skill-repository" },
      { commit: "f".repeat(40) },
    ]) {
      const forged = {
        ...original,
        external_skill_source: { ...original.external_skill_source, ...change },
      };
      fs.writeFileSync(manifestPath, JSON.stringify(forged));
      expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(
        "course distribution manifest has an unpinned external Skill source",
      );
      expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
        "course distribution manifest has an unpinned external Skill source",
      );
      expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
      expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
    }
  });

  it("rejects forged Skill contents even when distribution SHA-256 is updated", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "c".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const original = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const skill = original.files.find((file) => file.origin === "external-skill");
    const altered = Buffer.from("modified external Skill content\n");
    writeFixtureFile(fixture.target, skill.target_path, altered);

    const forged = structuredClone(original);
    const forgedSkill = forged.files.find((file) => file.target_path === skill.target_path);
    forgedSkill.sha256 = createHash("sha256").update(altered).digest("hex");
    forgedSkill.bytes = altered.length;
    fs.writeFileSync(manifestPath, JSON.stringify(forged));

    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /external Skill blob SHA mismatch/,
    );
    expect(() =>
      readVerifiedCourseSource({ root: fixture.target, sourcePath: skill.source_path }),
    ).toThrow(/external Skill blob SHA mismatch/);

    for (const invalid of ["missing-blob", "false-origin"]) {
      const modified = structuredClone(forged);
      const entry = modified.files.find((file) => file.target_path === skill.target_path);
      if (invalid === "missing-blob") delete entry.blob_sha;
      else entry.origin = "local";
      fs.writeFileSync(manifestPath, JSON.stringify(modified));
      expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
        /external Skill (source path or blob SHA is invalid|origin and target disagree)/,
      );
      expect(() =>
        readVerifiedCourseSource({ root: fixture.target, sourcePath: skill.source_path }),
      ).toThrow(/external Skill (source path or blob SHA is invalid|origin and target disagree)/);
    }
  });

  it("rejects a start state with mismatched module, revision, or source before copying", async () => {
    for (const change of [
      { module_id: "M01" },
      { revision: "outdated" },
      { source_sha: "a".repeat(40) },
      { state: "end" },
      { public_contract: false },
    ]) {
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
      const targetPath = "course/states/M00/start.json";
      const state = JSON.parse(fs.readFileSync(path.join(fixture.target, targetPath), "utf8"));
      const altered = Buffer.from(JSON.stringify({ ...state, ...change }));
      writeFixtureFile(fixture.target, targetPath, altered);
      const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const record = manifest.files.find((file) => file.target_path === targetPath);
      record.sha256 = createHash("sha256").update(altered).digest("hex");
      record.bytes = altered.length;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));

      expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(
        "pinned M00 start state does not match its distribution contract",
      );
      expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
      expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
    }
  });

  it("rejects sync targets inside or above the source checkout without modifying either tree", async () => {
    const fixture = courseFixture();
    const nestedTarget = path.join(fixture.source, "learner-inside-source");
    fs.mkdirSync(nestedTarget);
    const sourceSha = "9".repeat(40);
    const options = {
      root: fixture.source,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    };
    const sourceBefore = snapshotDirectory(fixture.source);
    await expect(syncCourse({ ...options, target: nestedTarget })).rejects.toThrow(
      /sync target must be outside the source checkout/,
    );
    expect(snapshotDirectory(fixture.source)).toEqual(sourceBefore);
    const parentTarget = path.dirname(fixture.source);
    const parentBefore = snapshotDirectory(parentTarget);
    await expect(syncCourse({ ...options, target: parentTarget })).rejects.toThrow(
      /sync target must be outside the source checkout/,
    );
    expect(snapshotDirectory(parentTarget)).toEqual(parentBefore);
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
    const generatedDistribution = JSON.parse(
      fs.readFileSync(path.join(fixture.target, ".course/distribution-manifest.json"), "utf8"),
    );
    expect(generatedDistribution.distribution).toEqual({
      public_source: true,
      includes_reference_solutions: false,
      includes_scoring_tests: false,
      includes_completed_states: false,
      includes_secrets: false,
    });
    expect(generatedDistribution.confidentiality).toBeUndefined();
    expect(
      [...generatedDistribution.files, ...generatedDistribution.load_files].some((entry) =>
        [entry.source_path, entry.target_path].some((value) =>
          /(?:^|\/)assessment\/(?:reference-solutions|scoring-tests|completed-states)(?:\/|$)/i.test(
            value,
          ),
        ),
      ),
    ).toBe(false);
    expectMarkdownLinksResolve(fixture.target, "course/modules/M00/README.md");
    expectMarkdownLinksResolve(fixture.target, "course/start-here.md");
    expect(
      fs.readFileSync(path.join(fixture.target, "course/modules/M00/README.md"), "utf8"),
    ).toContain("../../../docs/spec/features/cart.md");
    expect(fs.readFileSync(path.join(fixture.target, "workspace/.gitignore"), "utf8")).toContain(
      "M07/",
    );

    const firstLoad = loadModule({
      root: fixture.target,
      moduleId: "M00",
      now: new Date("2026-10-22T01:00:00.000Z"),
    });
    expect(firstLoad.moduleId).toBe("M00");
    expect(fs.existsSync(path.join(fixture.target, "workspace/M01/submission.md"))).toBe(false);
    const start = checkState({ root: fixture.target, moduleId: "M00", stateName: "start" });
    expect(start).toMatchObject({
      status: "ready",
      sourceSha,
      input: { source: "module-public-sample" },
      execution: {
        status: "unverified",
        required: [],
      },
    });
    const cliOutput = execFileSync(
      process.execPath,
      [
        path.join(repositoryRoot, "scripts/training/ai-assisted-qa-course.mjs"),
        "check",
        "M00",
        "--state",
        "start",
      ],
      { cwd: fixture.target, encoding: "utf8" },
    );
    expect(JSON.parse(cliOutput)).toMatchObject({
      status: "ready",
      status_label: "配布・構造一致（実行環境は未確認）",
      execution: { status: "unverified" },
    });
    expect(checkState({ root: fixture.target, moduleId: "M00", stateName: "end" }).status).toBe(
      "insufficient",
    );

    const submission = path.join(fixture.target, "workspace/M00/submission.md");
    fs.appendFileSync(submission, "Learner evidence\n");
    expect(checkState({ root: fixture.target, moduleId: "M00", stateName: "end" })).toMatchObject({
      status: "ready",
      assessment: "構造照合のみです。Phase末の正式AI評価は別にcourse:assessで起動します",
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

  it("resolves M03 source references through pinned distribution mappings", async () => {
    const fixture = courseFixture();
    const sourceSha = "c".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    loadModule({
      root: fixture.target,
      moduleId: "M03",
      now: new Date("2026-10-22T01:05:00.000Z"),
    });

    expect(checkState({ root: fixture.target, moduleId: "M03", stateName: "start" })).toMatchObject(
      {
        status: "ready",
        sourceSha,
        input: { source: "module-public-sample" },
      },
    );
    const end = checkState({ root: fixture.target, moduleId: "M03", stateName: "end" });
    expect(end.status).toBe("insufficient");
    expect(end.reasons.some((reason) => reason.includes("状態の参照先がありません"))).toBe(false);

    const skillPath = path.join(fixture.target, ".agents/skills/test-condition-design/SKILL.md");
    fs.appendFileSync(skillPath, "tampered\n");
    expect(checkState({ root: fixture.target, moduleId: "M03", stateName: "start" })).toMatchObject(
      {
        status: "mismatch",
        reasons: [expect.stringContaining("状態の参照先がありません")],
      },
    );
  });

  it("rejects an M03 reference to a different Skill revision", async () => {
    const fixture = courseFixture();
    const statePath = "training/ai-assisted-qa-course/states/M03/start.json";
    const state = JSON.parse(fs.readFileSync(path.join(fixture.source, statePath), "utf8"));
    state.references[state.references.length - 1] =
      "ryu-yoshikawa-pro-vision/qa-workflow-skills@8cc6cba7772de549841a39d71694cbafbc783324";
    writeFixtureFile(fixture.source, statePath, JSON.stringify(state));
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "d".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    loadModule({
      root: fixture.target,
      moduleId: "M03",
      now: new Date("2026-10-22T01:06:00.000Z"),
    });

    expect(checkState({ root: fixture.target, moduleId: "M03", stateName: "start" })).toMatchObject(
      {
        status: "mismatch",
        reasons: [
          expect.stringContaining("qa-workflow-skills@8cc6cba7772de549841a39d71694cbafbc783324"),
        ],
      },
    );
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
      loadModule({
        root: fixture.target,
        moduleId,
        now: new Date(`2026-10-22T02:${String(index).padStart(2, "0")}:00.000Z`),
      });
      for (const stateName of ["start", "end"]) {
        const statePath = path.join(fixture.target, `course/states/${moduleId}/${stateName}.json`);
        const before = fs.readFileSync(statePath);
        const learnerBefore = snapshotDirectory(path.join(fixture.target, "workspace"));
        const result = checkState({ root: fixture.target, moduleId, stateName });
        const after = fs.readFileSync(statePath);
        const learnerAfter = snapshotDirectory(path.join(fixture.target, "workspace"));
        stateSnapshots.push({ statePath, before, after });

        expect(result.moduleId).toBe(moduleId);
        expect(learnerAfter).toEqual(learnerBefore);
        if (stateName === "start") expect(result).toMatchObject({ status: "ready", sourceSha });
        else expect(result).toMatchObject({ status: "insufficient", sourceSha });
      }
    }

    expect(stateSnapshots).toHaveLength(22);
    expect(stateSnapshots.every(({ before, after }) => before.equals(after))).toBe(true);
    expect(fs.existsSync(path.join(fixture.target, "workspace/M00/submission.md"))).toBe(true);
  });

  it("rejects a forged cross-module state handoff during full distribution verification", async () => {
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
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const originalManifest = fs.readFileSync(manifestPath, "utf8");
    const scenarios = [
      { moduleId: "M01", stateName: "start", change: (state) => ({ ...state, inputs: [] }) },
      {
        moduleId: "M02",
        stateName: "start",
        change: (state) => ({
          ...state,
          inputs: [{ ...state.inputs[0], artifact_id: "wrong-artifact-id" }],
        }),
      },
      {
        moduleId: "M04",
        stateName: "start",
        change: (state) => ({
          ...state,
          public_fallback: { ...state.public_fallback, path: "inputs/M04/missing.md" },
        }),
      },
      { moduleId: "M06", stateName: "end", change: (state) => ({ ...state, outputs: [] }) },
      {
        moduleId: "M06",
        stateName: "end",
        change: (state) => ({
          ...state,
          outputs: [{ ...state.outputs[0], path: "workspace/M06/not-required.md" }],
        }),
      },
      {
        moduleId: "M10",
        stateName: "end",
        change: (state) => ({
          ...state,
          outputs: [...state.outputs, { ...state.outputs[0] }],
        }),
      },
      {
        moduleId: "M10",
        stateName: "end",
        change: (state) => ({
          ...state,
          outputs: [{ ...state.outputs[0], revision: "" }],
        }),
      },
    ];
    for (const { moduleId, stateName, change } of scenarios) {
      const statePath = `course/states/${moduleId}/${stateName}.json`;
      const originalState = fs.readFileSync(path.join(fixture.target, statePath));
      const altered = Buffer.from(
        JSON.stringify(change(JSON.parse(originalState.toString("utf8")))),
      );
      writeFixtureFile(fixture.target, statePath, altered);
      const manifest = JSON.parse(originalManifest);
      const entry = manifest.files.find((file) => file.target_path === statePath);
      entry.sha256 = createHash("sha256").update(altered).digest("hex");
      entry.bytes = altered.length;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));

      expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
        /pinned M(?:0[0-9]|10) (start input contract|public fallback contract|end state outputs|end state output contract)/,
      );
      writeFixtureFile(fixture.target, statePath, originalState);
    }
    fs.writeFileSync(manifestPath, originalManifest);
    expect(verifySyncedCourseDistribution({ root: fixture.target })).toMatchObject({
      state_files_verified: 22,
    });
  });

  it("rejects forged public, writable, or leaky states during full distribution verification", async () => {
    const fixture = courseFixture();
    const sourceSha = "2".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const originalManifest = fs.readFileSync(manifestPath);
    for (const stateName of ["start", "end"]) {
      const statePath = `course/states/M00/${stateName}.json`;
      const originalState = fs.readFileSync(path.join(fixture.target, statePath));
      const state = JSON.parse(originalState.toString("utf8"));
      const changes = [
        { public_contract: false },
        { read_only: false },
        { distribution: { ...state.distribution, public_source: false } },
        { distribution: { ...state.distribution, includes_reference_solutions: true } },
        { distribution: { ...state.distribution, includes_scoring_tests: true } },
        { distribution: { ...state.distribution, includes_completed_states: true } },
      ];
      for (const change of changes) {
        const altered = Buffer.from(JSON.stringify({ ...state, ...change }));
        writeFixtureFile(fixture.target, statePath, altered);
        const manifest = JSON.parse(originalManifest.toString("utf8"));
        const record = manifest.files.find((file) => file.target_path === statePath);
        record.sha256 = createHash("sha256").update(altered).digest("hex");
        record.bytes = altered.length;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest));

        expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
          `pinned module state lacks public read-only contract: ${statePath}`,
        );
      }
      writeFixtureFile(fixture.target, statePath, originalState);
    }
    fs.writeFileSync(manifestPath, originalManifest);
    expect(verifySyncedCourseDistribution({ root: fixture.target })).toMatchObject({
      state_files_verified: 22,
    });
  });

  it("rejects altered start distribution boundaries before writing learner files", async () => {
    const fixture = courseFixture();
    const sourceSha = "3".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const statePath = "course/states/M00/start.json";
    const state = JSON.parse(fs.readFileSync(path.join(fixture.target, statePath), "utf8"));
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const originalManifest = fs.readFileSync(manifestPath, "utf8");
    for (const [field, value] of [
      ["public_source", false],
      ["includes_reference_solutions", true],
      ["includes_scoring_tests", true],
      ["includes_completed_states", true],
    ]) {
      const alteredState = {
        ...state,
        distribution: { ...state.distribution, [field]: value },
      };
      const altered = Buffer.from(JSON.stringify(alteredState));
      writeFixtureFile(fixture.target, statePath, altered);
      const manifest = JSON.parse(originalManifest);
      const record = manifest.files.find((file) => file.target_path === statePath);
      record.sha256 = createHash("sha256").update(altered).digest("hex");
      record.bytes = altered.length;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));

      expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(
        "pinned M00 start state does not match its distribution contract",
      );
      const checked = checkState({ root: fixture.target, moduleId: "M00", stateName: "start" });
      expect(checked.status).toBe("mismatch");
      expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
      expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
    }
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

  it("resumes an interrupted module load without overwriting learner edits", async () => {
    const fixture = courseFixture();
    const sourceSha = "4".repeat(40);
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const submissionPath = path.join(fixture.target, "workspace/M05/submission.md");
    const testPath = path.join(fixture.target, "workspace/M05/product-link.spec.ts");
    const originalCopy = fs.copyFileSync.bind(fs);
    let interrupted = false;
    const copySpy = vi
      .spyOn(fs, "copyFileSync")
      .mockImplementation((source, destination, ...args) => {
        if (!interrupted && destination === testPath) {
          interrupted = true;
          throw new Error("simulated load interruption");
        }
        return originalCopy(source, destination, ...args);
      });
    try {
      expect(() => loadModule({ root: fixture.target, moduleId: "M05" })).toThrow(
        /module load stopped after 1 new file\(s\).*simulated load interruption/,
      );
    } finally {
      copySpy.mockRestore();
    }
    expect(interrupted).toBe(true);
    expect(fs.existsSync(submissionPath)).toBe(true);
    expect(fs.existsSync(testPath)).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);

    const starter = fs.readFileSync(submissionPath);
    fs.writeFileSync(submissionPath, "learner-edited submission\n");
    expect(() => loadModule({ root: fixture.target, moduleId: "M05" })).toThrow(
      /existing learner files differ; nothing was overwritten/,
    );
    expect(fs.readFileSync(submissionPath, "utf8")).toBe("learner-edited submission\n");
    expect(fs.existsSync(testPath)).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);

    fs.writeFileSync(submissionPath, starter);
    const retried = loadModule({ root: fixture.target, moduleId: "M05" });
    expect(retried.copied).toEqual(["workspace/M05/product-link.spec.ts"]);
    expect(retried.unchanged).toBeGreaterThan(0);
    expect(fs.readFileSync(submissionPath)).toEqual(starter);
    expect(fs.existsSync(testPath)).toBe(true);
    expect(fs.existsSync(path.join(fixture.target, retried.receipt))).toBe(true);
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
    loadModule({
      root: missingInput.target,
      moduleId: "M00",
      now: new Date("2026-10-22T03:00:00.000Z"),
    });
    fs.rmSync(path.join(missingInput.target, "course/modules/M00/inputs/start.md"));
    expect(
      checkState({ root: missingInput.target, moduleId: "M00", stateName: "start" }).status,
    ).toBe("mismatch");

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
    loadModule({
      root: badReference.target,
      moduleId: "M00",
      now: new Date("2026-10-22T03:02:00.000Z"),
    });
    expect(
      checkState({ root: badReference.target, moduleId: "M00", stateName: "start" }),
    ).toMatchObject({
      status: "mismatch",
      reasons: [expect.stringContaining("参照先がありません")],
    });
  }, 120_000);

  it("rejects forged fallback references before copying learner files", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "6".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const statePath = "course/states/M00/start.json";
    const state = JSON.parse(fs.readFileSync(path.join(fixture.target, statePath), "utf8"));
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const manifestText = fs.readFileSync(manifestPath, "utf8");
    for (const change of [{ public: false }, { path: "inputs/M01/start.md" }, { revision: "" }]) {
      const altered = Buffer.from(
        JSON.stringify({ ...state, public_fallback: { ...state.public_fallback, ...change } }),
      );
      writeFixtureFile(fixture.target, statePath, altered);
      const manifest = JSON.parse(manifestText);
      const record = manifest.files.find((file) => file.target_path === statePath);
      record.sha256 = createHash("sha256").update(altered).digest("hex");
      record.bytes = altered.length;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));

      expect(() => loadModule({ root: fixture.target, moduleId: "M00" })).toThrow(
        /invalid M00 start input: invalid-public-fallback/,
      );
      expect(fs.existsSync(path.join(fixture.target, "workspace/M00"))).toBe(false);
      expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
    }
  });

  it("rejects a forged predecessor end state before copying the next module", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "7".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const statePath = "course/states/M00/end.json";
    const state = JSON.parse(fs.readFileSync(path.join(fixture.target, statePath), "utf8"));
    const altered = Buffer.from(JSON.stringify({ ...state, read_only: false }));
    writeFixtureFile(fixture.target, statePath, altered);
    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const record = manifest.files.find((file) => file.target_path === statePath);
    record.sha256 = createHash("sha256").update(altered).digest("hex");
    record.bytes = altered.length;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(() => loadModule({ root: fixture.target, moduleId: "M01" })).toThrow(
      /invalid M01 start input: revision-mismatch/,
    );
    expect(fs.existsSync(path.join(fixture.target, "workspace/M01"))).toBe(false);
    expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
  });

  it("rejects an invalid predecessor load receipt without copying the next module", async () => {
    const fixture = courseFixture();
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "8".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    const loaded = loadModule({
      root: fixture.target,
      moduleId: "M00",
      now: new Date("2026-11-04T00:00:00.000Z"),
    });
    fs.writeFileSync(path.join(fixture.target, "workspace/M00/submission.md"), "learner answer");
    const receiptPath = path.join(fixture.target, loaded.receipt);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.source_sha = "a".repeat(40);
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));

    expect(() => loadModule({ root: fixture.target, moduleId: "M01" })).toThrow(
      /invalid M01 start input: revision-mismatch/,
    );
    expect(fs.existsSync(path.join(fixture.target, "workspace/M01"))).toBe(false);
    expect(fs.readFileSync(path.join(fixture.target, "workspace/M00/submission.md"), "utf8")).toBe(
      "learner answer",
    );
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
    loadModule({
      root: fixture.target,
      moduleId: "M01",
      now: new Date("2026-10-22T04:00:00.000Z"),
    });
    expect(checkState({ root: fixture.target, moduleId: "M01", stateName: "start" })).toMatchObject(
      {
        status: "ready",
        input: { source: "module-public-sample", path: "course/modules/M01/inputs/start.md" },
      },
    );
  });

  it("rejects missing or miswired predecessor input contracts before module load", async () => {
    const fixture = courseFixture();
    const cases = [
      { moduleId: "M00", change: (state) => (state.inputs = [{ from_module: "M01" }]) },
      { moduleId: "M01", change: (state) => (state.inputs = []) },
      { moduleId: "M02", change: (state) => (state.inputs[0].from_module = "M00") },
    ];
    for (const { moduleId, change } of cases) {
      const statePath = `training/ai-assisted-qa-course/states/${moduleId}/start.json`;
      const state = JSON.parse(fs.readFileSync(path.join(fixture.source, statePath), "utf8"));
      change(state);
      writeFixtureFile(fixture.source, statePath, JSON.stringify(state));
    }
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha: "b".repeat(40),
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    for (const { moduleId } of cases) {
      expect(() => loadModule({ root: fixture.target, moduleId })).toThrow(
        /predecessor inputs must reference the immediately previous module/,
      );
      expect(checkState({ root: fixture.target, moduleId, stateName: "start" })).toMatchObject({
        status: "mismatch",
        reasons: [expect.stringContaining("immediately previous module")],
      });
      expect(fs.existsSync(path.join(fixture.target, `workspace/${moduleId}`))).toBe(false);
    }
    expect(fs.existsSync(path.join(fixture.target, ".course-load"))).toBe(false);
  });

  it("rejects predecessor ID, path, revision, and stale load-receipt mismatches", async () => {
    const fixture = courseFixture();
    const sourceSha = "9".repeat(40);
    const predecessorCases = [
      {
        moduleId: "M01",
        field: "artifact_id",
        value: "M00-wrong-result",
        expectedReason: "artifact ID is absent",
      },
      {
        moduleId: "M02",
        field: "path",
        value: "workspace/M01/other.md",
        expectedReason: "artifact path does not match",
      },
      {
        moduleId: "M03",
        field: "revision",
        value: "M02-result-v0",
        expectedReason: "artifact revision or contract does not match",
      },
    ];
    for (const { moduleId, field, value } of predecessorCases) {
      const startPath = path.join(
        fixture.source,
        `training/ai-assisted-qa-course/states/${moduleId}/start.json`,
      );
      const state = JSON.parse(fs.readFileSync(startPath, "utf8"));
      state.inputs[0][field] = value;
      writeFixtureFile(
        fixture.source,
        `training/ai-assisted-qa-course/states/${moduleId}/start.json`,
        JSON.stringify(state),
      );
    }
    await syncCourse({
      root: fixture.source,
      target: fixture.target,
      sourceSha,
      fetchImpl: fixture.fetchImpl,
      buildShop: false,
      shopBuildRoot: fixture.source,
      allowUncommittedFixture: true,
    });
    for (const { moduleId, expectedReason } of predecessorCases) {
      expect(() =>
        loadModule({
          root: fixture.target,
          moduleId,
          now: new Date(`2026-10-22T05:0${moduleId.slice(2)}:00.000Z`),
        }),
      ).toThrow(new RegExp(`invalid ${moduleId} start input:.*${expectedReason}`));
      expect(fs.existsSync(path.join(fixture.target, `workspace/${moduleId}`))).toBe(false);
      expect(checkState({ root: fixture.target, moduleId, stateName: "start" })).toMatchObject({
        status: "mismatch",
        reasons: [expect.stringContaining(expectedReason)],
      });
    }

    const loaded = loadModule({
      root: fixture.target,
      moduleId: "M00",
      now: new Date("2026-10-22T06:00:00.000Z"),
    });
    const receiptPath = path.join(fixture.target, loaded.receipt);
    const originalReceipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    const staleReceipt = structuredClone(originalReceipt);
    staleReceipt.source_sha = "b".repeat(40);
    fs.writeFileSync(receiptPath, JSON.stringify(staleReceipt));
    expect(checkState({ root: fixture.target, moduleId: "M00", stateName: "start" })).toMatchObject(
      {
        status: "mismatch",
        reasons: [expect.stringContaining("pinned course source SHA")],
      },
    );

    const malformed = structuredClone(originalReceipt);
    malformed.files[0] = null;
    fs.writeFileSync(receiptPath, JSON.stringify(malformed));
    expect(checkState({ root: fixture.target, moduleId: "M00", stateName: "start" })).toMatchObject(
      {
        status: "mismatch",
        reasons: [expect.stringContaining("invalid file entry")],
      },
    );
  });
});
