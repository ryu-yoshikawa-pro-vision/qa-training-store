import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  createIsolatedAssessmentRuntime,
  runCaptured,
} from "../../scripts/training/ai-assisted-qa-assessment.mjs";
import {
  buildAssessmentAgentConfig,
  parseOpenCodeJsonEvents,
} from "../../scripts/training/ai-assisted-qa-assessment-core.mjs";

const directories = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

it("does not inherit tutor AGENTS, config, credentials, or project directory", async () => {
  const tutor = fs.mkdtempSync(path.join(os.tmpdir(), "qa-course-tutor-"));
  directories.push(tutor);
  const globalConfig = path.join(tutor, ".config", "opencode");
  fs.mkdirSync(globalConfig, { recursive: true });
  fs.writeFileSync(path.join(globalConfig, "AGENTS.md"), "UNTRUSTED TUTOR INSTRUCTION");
  fs.writeFileSync(path.join(globalConfig, "opencode.json"), '{"instructions":["AGENTS.md"]}');
  const runtime = createIsolatedAssessmentRuntime({
    source: {
      PATH: process.env.PATH,
      HOME: tutor,
      XDG_CONFIG_HOME: globalConfig,
      XDG_DATA_HOME: path.join(tutor, "data"),
      OPENCODE_API_KEY: "tutor-secret",
      GITHUB_TOKEN: "github-secret",
    },
    platform: process.platform,
  });
  try {
    expect(runtime.cwd).not.toBe(tutor);
    expect(runtime.env.HOME).toBe(runtime.cwd);
    expect(runtime.env.XDG_CONFIG_HOME).toBe(path.join(runtime.cwd, "config"));
    expect(runtime.env.XDG_DATA_HOME).toBe(path.join(runtime.cwd, "data"));
    expect(runtime.env.OPENCODE_CONFIG_DIR).toBe(runtime.env.XDG_CONFIG_HOME);
    expect(runtime.env.OPENCODE_DB).toBe(":memory:");
    expect(runtime.env.OPENCODE_DISABLE_PROJECT_CONFIG).toBe("true");
    expect(runtime.env.OPENCODE_DISABLE_EXTERNAL_SKILLS).toBe("true");
    expect(runtime.env.OPENCODE_PURE).toBe("true");
    expect(runtime.env.OPENCODE_API_KEY).toBeUndefined();
    expect(runtime.env.GITHUB_TOKEN).toBeUndefined();
    expect(fs.existsSync(path.join(runtime.cwd, "AGENTS.md"))).toBe(false);
    expect(fs.existsSync(path.join(runtime.env.XDG_CONFIG_HOME, "opencode"))).toBe(false);
    const source = [
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'console.log(JSON.stringify({',
      '  cwd: process.cwd(),',
      '  home: process.env.HOME,',
      '  tutorInstructions: fs.existsSync(path.join(process.env.HOME, ".config", "opencode", "AGENTS.md")),',
      '  hasKey: Boolean(process.env.OPENCODE_API_KEY),',
      '}));',
    ].join("\n");
    const result = await runCaptured(process.execPath, ["-e", source], {
      cwd: runtime.cwd,
      env: runtime.env,
      timeoutMs: 3_000,
      maxBytes: 2_048,
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      cwd: runtime.cwd,
      home: runtime.cwd,
      tutorInstructions: false,
      hasKey: false,
    });
  } finally {
    runtime.dispose();
  }
  expect(fs.existsSync(runtime.cwd)).toBe(false);
});

it("denies all tool categories and omits ambient instructions from assessor config", () => {
  const config = buildAssessmentAgentConfig({
    modelId: "opencode/free-model",
    agentId: "qa-course-assessment",
    systemPrompt: "Use only pinned evidence.",
  });
  expect(config.permissions).toEqual([{ action: "*", resource: "*", effect: "deny" }]);
  expect(config.agents["qa-course-assessment"].permissions).toEqual(config.permissions);
  expect(config.instructions).toEqual([]);
  expect(config.plugins).toEqual([]);
  expect(config.skills).toEqual([]);
  expect(config.mcp).toEqual({ servers: {} });
  for (const type of ["tool_use", "tool", "error"]) {
    expect(() => parseOpenCodeJsonEvents(JSON.stringify({ type }), 0)).toThrow();
  }
  for (const tool of ["shell", "edit", "webfetch", "mcp", "skill", "subagent"]) {
    const stream = [
      JSON.stringify({ type: "text", part: { type: "text", text: "{}" } }),
      JSON.stringify({ type: "tool_use", part: { type: "tool", tool } }),
      JSON.stringify({ type: "step_finish", reason: "stop" }),
    ].join("\n");
    expect(() => parseOpenCodeJsonEvents(stream, 0)).toThrow(/tool\/error event/);
  }
});
