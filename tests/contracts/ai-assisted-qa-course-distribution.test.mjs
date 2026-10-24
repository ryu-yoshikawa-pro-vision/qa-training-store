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
  syncCourse,
  validateCourseManifest,
  verifySyncedCourseDistribution,
} from "../../scripts/training/ai-assisted-qa-course-core.mjs";

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
          revision: "ai-assisted-qa-course-v2",
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
          revision: "ai-assisted-qa-course-v2",
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
          checks: [{ id: `${moduleId}-END`, mode: "read-only", condition: "check submission" }],
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
  const manifest = {
    schema_version: 1,
    source_sha: "${SOURCE_SHA}",
    state_contract_revision: "ai-assisted-qa-course-v2",
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

afterAll(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

describe("AI-assisted QA distribution contract", () => {
  it("keeps the Plan-pinned external Skill allowlist complete and excludes evals", () => {
    const manifest = loadCourseManifest(repositoryRoot);
    const result = validateCourseManifest(manifest);
    expect(result).toMatchObject({ modules: 11, externalSkillFiles: 104 });
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
  });

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
    expect(workflow).toContain("path: output/training/ai-assisted-qa/");
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
      state_contract_revision: "ai-assisted-qa-course-v2",
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
    fs.symlinkSync(
      path.join(repositoryRoot, "node_modules"),
      path.join(fixture.target, "node_modules"),
      "junction",
    );
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

    const manifestPath = path.join(fixture.target, ".course/distribution-manifest.json");
    const originalManifest = fs.readFileSync(manifestPath, "utf8");
    const wrongSource = JSON.parse(originalManifest);
    wrongSource.source_sha = "c".repeat(40);
    fs.writeFileSync(manifestPath, JSON.stringify(wrongSource));
    expect(() => verifySyncedCourseDistribution({ root: fixture.target })).toThrow(
      /state SHA or revision does not match/,
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
      assessment: "構造照合のみです。Level 2は人が別途評価します",
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
      loadModule({
        root: fixture.target,
        moduleId,
        now: new Date(`2026-10-22T05:0${moduleId.slice(2)}:00.000Z`),
      });
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
