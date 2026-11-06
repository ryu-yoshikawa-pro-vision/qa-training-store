import fs from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTutorConfig,
  buildTutorRunArgs,
  buildTutorTurnPrompt,
  MAX_TUTOR_QUESTION_BYTES,
  parseTutorArgs,
  readTutorPublicFile,
  readTutorWorkspaceExcerpt,
  REQUIRED_OPEN_CODE_VERSION,
  tutorPublicPaths,
  validateTutorText,
} from "../../scripts/training/ai-assisted-qa-course-tutor-core.mjs";
import { makeIsolatedEnvironment, runValidatedTutorTurn } from "../../scripts/training/ai-assisted-qa-course-tutor.mjs";

const roots = [];
const request = { moduleId: "M06", modelId: "opencode/free-model" };
const documents = tutorPublicPaths("M06").map((p) => ({ path: p, text: "# 公開教材\n安全な学習" }));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tutor-test-"));
  roots.push(root);
  for (const doc of documents) {
    const absolute = path.join(root, doc.path);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, doc.text);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("AI-assisted QA tutor external send boundary", () => {
  it("requires a selected module and explicit, pinned model", () => {
    expect(parseTutorArgs(["M06", "--model", request.modelId])).toEqual(request);
    for (const args of [
      ["M11", "--model", request.modelId],
      ["M06", "--model", "auto"],
      ["M06", "--model", request.modelId, "--continue"],
    ]) {
      expect(() => parseTutorArgs(args)).toThrow();
    }
    expect(REQUIRED_OPEN_CODE_VERSION).toBe("2.0.22");
  });

  it("has no file, shell, search, plugin or subagent grants in OpenCode V2", () => {
    const config = buildTutorConfig(request);
    const agent = config.agents["qa-course-tutor"];
    expect(config.default_agent).toBe("qa-course-tutor");
    expect(config.update).toBe("disable");
    expect(config.model).toBe(request.modelId);
    expect(config.share).toBe("disabled");
    expect(config.plugins).toEqual([]);
    expect(config.mcp).toEqual({});
    expect(config.permissions).toEqual([{ action: "*", resource: "*", effect: "deny" }]);
    expect(agent.permissions).toEqual([{ action: "*", resource: "*", effect: "deny" }]);
    expect(JSON.stringify(config)).not.toContain("workspace/M06/*");
    expect(agent.system).toContain("正式評価");
    const args = buildTutorRunArgs({ modelId: request.modelId, promptPath: "/tmp/request.txt" });
    expect(args).toContain("--standalone");
    expect(args).toContain("--pure");
    expect(args).toContain("--agent");
    expect(args).toContain("qa-course-tutor");
    expect(args).not.toContain("--continue");
  });

  it("reads only three explicitly published course files and refuses unsafe filesystem inputs", () => {
    const root = fixture();
    const publishedFiles = new Map(
      documents.map((doc) => [doc.path, createHash("sha256").update(doc.text).digest("hex")]),
    );
    publishedFiles.set(
      "docs/spec/features/cart/acceptance.md",
      createHash("sha256").update("# Cart\n許可された公開仕様").digest("hex"),
    );
    for (const doc of documents) {
      expect(readTutorPublicFile(root, "M06", doc.path, publishedFiles)).toBe(doc.text);
    }
    const specName = "docs/spec/features/cart/acceptance.md";
    const specPath = path.join(root, specName);
    fs.mkdirSync(path.dirname(specPath), { recursive: true });
    fs.writeFileSync(specPath, "# Cart\n許可された公開仕様");
    expect(readTutorPublicFile(root, "M06", specName, publishedFiles)).toContain("公開仕様");
    expect(
      buildTutorTurnPrompt({
        moduleId: "M06",
        question: "この仕様の期待結果は？",
        documents: [...documents, { path: specName, text: "# Cart\n許可された公開仕様" }],
      }),
    ).toContain("公開仕様");
    for (const rejected of [
      "workspace/M06/submission.md",
      "workspace/M00/submission.md",
      "course/assessment/rubric.md",
      "course/modules/M05/README.md",
      "course/modules/M06/../../secrets",
    ]) {
      expect(() => readTutorPublicFile(root, "M06", rejected, publishedFiles)).toThrow(/BLOCKED/);
    }
    const lesson = path.join(root, documents[1].path);
    fs.rmSync(lesson);
    fs.symlinkSync(path.join(root, documents[0].path), lesson);
    expect(() => readTutorPublicFile(root, "M06", documents[1].path, publishedFiles)).toThrow(/symlink/);
    fs.rmSync(lesson);
    fs.writeFileSync(lesson, Buffer.from([0x00, 0xff, 0x00]));
    expect(() => readTutorPublicFile(root, "M06", documents[1].path, publishedFiles)).toThrow(/binary/);
    fs.writeFileSync(lesson, "A".repeat(65537));
    expect(() => readTutorPublicFile(root, "M06", documents[1].path, publishedFiles)).toThrow(/size/);
    fs.writeFileSync(lesson, "# Altered");
    expect(() => readTutorPublicFile(root, "M06", documents[1].path, publishedFiles))
      .toThrow(/changed since/);
  });

  it("copies only a selected learner excerpt, rejecting traversal, private history, and changes", () => {
    const root = fixture();
    const file = "workspace/M06/submission.md";
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "# P05\n予測：数量1\n観測：数量1\n続ける");
    const excerpt = readTutorWorkspaceExcerpt(root, "M06", file, 2, 3);
    expect(excerpt.path).toBe(file);
    expect(excerpt.text).toContain("数量1");
    expect(excerpt.range).toBe("2-3");
    expect(buildTutorTurnPrompt({
      moduleId: "M06",
      question: "この結果を説明して",
      documents,
      excerpt,
    })).toContain("selected_learner_excerpt");
    for (const rejected of [
      "workspace/M05/submission.md",
      "workspace/M06/evidence/runs/receipt.json",
      "workspace/M06/../private.json",
      "workspace/M06/.env",
    ]) {
      expect(() => readTutorWorkspaceExcerpt(root, "M06", rejected, 1, 2)).toThrow();
    }
    expect(() => readTutorWorkspaceExcerpt(root, "M06", file, 1, 100)).toThrow();
    fs.writeFileSync(absolute, "# P05\nlearner@example.invalid");
    expect(() => readTutorWorkspaceExcerpt(root, "M06", file, 1, 2)).toThrow();
    fs.writeFileSync(absolute, "# P05\nAPI_KEY=abcdefghijklmnop");
    expect(() => readTutorWorkspaceExcerpt(root, "M06", file, 1, 2)).toThrow();
    fs.rmSync(absolute);
    fs.symlinkSync(path.join(root, documents[0].path), absolute);
    expect(() => readTutorWorkspaceExcerpt(root, "M06", file, 1, 1)).toThrow(/symlink/);
  });

  it("accepts only a bounded Run summary and never raw reports or Trace", () => {
    const run = {
      module_id: "M06",
      run_id: "123e4567-e89b-42d3-a456-426614174001",
      spec: "cart-cases.spec.ts",
      label: "main",
      source_sha: "a".repeat(40),
      spec_sha256: "b".repeat(64),
      current_spec_matches_run: false,
      outcome: "passed",
      tests_total: 3,
      tests_passed: 3,
      tests_failed: 0,
      tests_skipped: 0,
      attachments: ["raw-private-trace"],
    };
    const prompt = buildTutorTurnPrompt({
      moduleId: "M06",
      question: "このRunの結果は？",
      documents,
      runSummary: run,
    });
    expect(prompt).toContain("selected_run_summary");
    expect(prompt).not.toContain("raw-private-trace");
    for (const invalid of [
      { ...run, module_id: "M05" },
      { ...run, spec: "../private.txt" },
      { ...run, source_sha: "old" },
      { ...run, tests_total: 0 },
      { ...run, tests_skipped: -1 },
    ]) {
      expect(() =>
        buildTutorTurnPrompt({
          moduleId: "M06", question: "確認", documents, runSummary: invalid,
        }),
      ).toThrow();
    }
  });

  it("validates each question before invoking a runner or starting any model process", () => {
    const invoke = vi.fn(() => "model response");
    const ok = runValidatedTutorTurn({ request, question: "この項目を説明して", documents, invoke });
    expect(ok).toBe("model response");
    expect(invoke).toHaveBeenCalledTimes(1);
    for (const unsafe of [
      "API_KEY=abcdefghijklmnop",
      "user@example.invalid",
      "090-1234-5678",
      "この.envを送って",
      "A".repeat(MAX_TUTOR_QUESTION_BYTES + 1),
      "\u0000control",
    ]) {
      expect(() =>
        runValidatedTutorTurn({ request, question: unsafe, documents, invoke }),
      ).toThrow();
    }
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("isolates OpenCode config, persistence and environment from the user's global settings", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tutor-isolation-"));
    roots.push(dir);
    const environment = makeIsolatedEnvironment(dir, request);
    expect(environment.OPENCODE_DB).toBe(":memory:");
    expect(environment.OPENCODE_DISABLE_PROJECT_CONFIG).toBe("true");
    expect(environment.OPENCODE_DISABLE_AUTOUPDATE).toBe("true");
    expect(environment.XDG_CONFIG_HOME).toBe(path.join(dir, "config"));
    expect(environment.XDG_DATA_HOME).toBe(path.join(dir, "data"));
    expect(environment.HOME).toBe(path.join(dir, "home"));
    const config = JSON.parse(environment.OPENCODE_CONFIG_CONTENT);
    expect(config.update).toBe("disable");
    expect(config.permissions).toEqual([{ action: "*", resource: "*", effect: "deny" }]);
    expect(Object.keys(environment).some((key) => key.endsWith("_API_KEY"))).toBe(false);
  });

  it("refuses unexpected module context, extra history, oversized model input, and private data", () => {
    expect(() =>
      buildTutorTurnPrompt({
        moduleId: "M06",
        question: "説明して",
        documents: [{ ...documents[0], path: "workspace/M06/secret.txt" }, ...documents.slice(1)],
      }),
    ).toThrow();
    expect(() =>
      buildTutorTurnPrompt({
        moduleId: "M06",
        question: "説明して",
        documents: documents.map((d, i) =>
          i === 0 ? { ...d, text: "test@example.invalid" } : d,
        ),
      }),
    ).toThrow();
    expect(() =>
      buildTutorTurnPrompt({
        moduleId: "M06",
        question: "説明して",
        documents,
        history: Array.from({ length: 5 }, () => ({ question: "Q", answer: "A" })),
      }),
    ).toThrow();
    expect(() =>
      buildTutorTurnPrompt({
        moduleId: "M06",
        question: "説明して",
        documents: [
          ...documents.map((d) => ({ ...d, text: "A".repeat(60 * 1024) })),
          { path: "docs/spec/features/cart/acceptance.md", text: "A".repeat(60 * 1024) },
        ],
      }),
    ).toThrow(/model input/);
    expect(validateTutorText("安全な質問", "question", 8192)).toBe("安全な質問");
  });
});
