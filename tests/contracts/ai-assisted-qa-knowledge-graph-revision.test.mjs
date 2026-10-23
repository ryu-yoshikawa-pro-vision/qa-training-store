import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { markdownCell, validate } from "../../scripts/training/knowledge-graph.mjs";

const graphPath = path.join(process.cwd(), "docs/curriculum/ai-assisted-qa/knowledge-graph.json");

describe("AI-assisted QA module-state revisions", () => {
  it("escapes Markdown table delimiters after preserving literal backslashes", () => {
    expect(markdownCell(String.raw`C:\repo\file|name`)).toBe(String.raw`C:\\repo\\file\|name`);
    expect(markdownCell("first\r\nsecond")).toBe("first<br>second");
  });

  it("matches every graph state revision to its JSON contract and course manifest", () => {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    expect(validate(graph)).toMatchObject({ moduleStates: 22 });
  });

  it("rejects a state revision that differs from its graph node", () => {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    const state = graph.nodes.find((node) => node.type === "module_state");
    expect(state).toBeDefined();
    state.revision = "ai-assisted-qa-course-v1";
    expect(() => validate(graph)).toThrow(/State revision differs from graph or course manifest/);
  });

  it("requires every module end-state output to map to a produced graph artifact", () => {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    expect(validate(graph)).toMatchObject({ moduleStates: 22 });
    expect(validate(graph).artifacts).toBeGreaterThan(22);

    const handoff = graph.nodes.find((node) => node.id === "ART-M07-04");
    expect(handoff).toBeDefined();
    handoff.destination = "workspace/M07/unmapped-handoff.md";
    expect(() => validate(graph)).toThrow(
      /State output has no unique graph artifact contract: M07 workspace\/M07\/phase2-handoff\.md/,
    );
  });

  it("links the M09 public history/PR fallback to its start-state contract", () => {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    expect(validate(graph).moduleStates).toBe(22);
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "ART-M09-03",
        path: "training/ai-assisted-qa-course/inputs/M09/public-sample-handoff.md",
        destination: "workspace/M09/public-sample/handoff.md",
        public: true,
        private: false,
      }),
    );
    expect(graph.edges).toContainEqual({
      from: "STATE-M09-START",
      relation: "requires",
      to: "ART-M09-03",
    });
  });

  it("links the M04 public review-case fallback to its start-state contract", () => {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    expect(validate(graph).moduleStates).toBe(22);
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "ART-M04-03",
        path: "training/ai-assisted-qa-course/inputs/M04/public-review-cases.md",
        destination: "workspace/M04/public-sample/review-cases.md",
        public: true,
        private: false,
      }),
    );
    expect(graph.edges).toContainEqual({
      from: "STATE-M04-START",
      relation: "requires",
      to: "ART-M04-03",
    });
  });

  it("links every public start fallback and rejects a missing input edge", () => {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    expect(validate(graph).moduleStates).toBe(22);

    const startStates = graph.nodes.filter(
      (node) => node.type === "module_state" && node.state === "start",
    );
    expect(startStates).toHaveLength(11);
    for (const stateNode of startStates) {
      const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), stateNode.path), "utf8"));
      const fallback = state.public_fallback;
      const sourcePath = `training/ai-assisted-qa-course/${fallback.path}`;
      const artifacts = graph.nodes.filter(
        (node) =>
          node.type === "artifact" && node.module === stateNode.module && node.path === sourcePath,
      );
      expect(artifacts).toHaveLength(1);
      expect(graph.edges).toContainEqual({
        from: stateNode.id,
        relation: "requires",
        to: artifacts[0].id,
      });
    }

    const missingInput = JSON.parse(JSON.stringify(graph));
    missingInput.edges = missingInput.edges.filter(
      (edge) =>
        edge.from !== "STATE-M08-START" || edge.to !== "ART-M08-INPUT-PUBLIC-SAMPLE-HANDOFF",
    );
    expect(() => validate(missingInput)).toThrow(
      /Start state is not linked to its public input artifact/,
    );
  });
});
