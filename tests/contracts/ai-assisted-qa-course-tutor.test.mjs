import { describe, expect, it } from "vitest";
import {
  buildTutorConfig,
  buildTutorInitialPrompt,
  parseTutorArgs,
  REQUIRED_OPEN_CODE_VERSION,
} from "../../scripts/training/ai-assisted-qa-course-tutor-core.mjs";

describe("AI-assisted QA course tutor contract", () => {
  it("requires exactly one module and an explicit model", () => {
    expect(parseTutorArgs(["M06", "--model", "opencode/free-model"])).toEqual({
      moduleId: "M06",
      modelId: "opencode/free-model",
    });
    expect(() => parseTutorArgs(["M11", "--model", "opencode/free-model"])).toThrow(/M00/);
    expect(() => parseTutorArgs(["M06", "--model", "auto"])).toThrow(/explicit/);
    expect(() => parseTutorArgs(["M06", "--model", "opencode/free-model", "--extra"])).toThrow(
      /exactly one/,
    );
  });

  it("starts the pinned read-only tutor only for one module without assessment access", () => {
    const config = buildTutorConfig({ moduleId: "M06", modelId: "opencode/free-model" });
    const agent = config.agents["qa-course-tutor"];
    expect(REQUIRED_OPEN_CODE_VERSION).toBe("2.0.22");
    expect(config.default_agent).toBe("qa-course-tutor");
    expect(config.model).toBe("opencode/free-model");
    expect(config.share).toBe("disabled");
    expect(agent.mode).toBe("primary");
    expect(agent.permissions[0]).toEqual({ action: "*", resource: "*", effect: "deny" });
    expect(agent.permissions).toContainEqual({
      action: "read",
      resource: "workspace/M06/*",
      effect: "allow",
    });
    expect(agent.permissions).not.toContainEqual(
      expect.objectContaining({ action: "edit", effect: "allow" }),
    );
    expect(agent.permissions.some((rule) => rule.resource.includes("course-assessments"))).toBe(
      false,
    );
    expect(agent.system).toContain("正式評価");
    expect(agent.system).toContain("読み取り専用");
    expect(buildTutorInitialPrompt("M06")).toContain("M06");
  });
});
