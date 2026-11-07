import { expect, test } from "vitest";
import { markdownCell } from "../../scripts/training/knowledge-graph.mjs";

test("knowledge graph Markdown cells escape backslashes, pipes, and line breaks", () => {
  const input = "left\\right|column\nnext";

  expect(markdownCell(input)).toBe("left\\\\right\\|column<br>next");
});
